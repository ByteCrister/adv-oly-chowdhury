import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
  FuzzySearchPatterns,
  ScoredEntityBuckets,
} from "./shared-fuzzy-search.helper";
import {
  CASE_DOCUMENT_TYPES,
  CASE_DOCUMENT_TYPE_LIST,
  CASE_DOCUMENT_TYPE_LABELS,
  CaseDocumentType,
} from "@/const/case-document.const";
import {
  CLIENT_DOCUMENT_TYPES,
  CLIENT_DOCUMENT_TYPE_LIST,
  CLIENT_DOCUMENT_TYPE_LABELS,
  ClientDocumentType,
} from "@/const/client-document.const";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";

// Re-export shared utilities for convenience
export {
  buildFuzzySearchPatterns,
  calculateStringSimilarity,
  bucketScoredEntityIds,
  type FuzzySearchPatterns,
  type ScoredEntityBuckets,
};

/**
 * Score constants for Documents relevance ranking across Case and Client documents.
 *
 * Calibrated according to the required hierarchy:
 * 1. Exact match on a document title or important identifying field. (120)
 * 2. Strong fuzzy/prefix match on a document title. (95 word, 70 substring, 45 fuzzy)
 * 3. Exact or strong match on related case number, internal reference, or client number. (100)
 * 4. Strong match on related case title, client name, or organization name. (85 exact, 70 word)
 * 5. Match on exhibit number, document type (value or label), description, or notes. (60-75)
 * 6. Weaker partial or fuzzy matches on secondary metadata. (20-45)
 *
 * Multi-field matches receive cumulative score boosts.
 */
export const DOCUMENT_SEARCH_RELEVANCE_SCORES = {
  // 1-2. Direct Document Title (The primary identity of the document)
  TITLE_EXACT: 120,
  TITLE_WORD: 95,
  TITLE_SUBSTRING: 70,
  TITLE_FUZZY: 45,

  // 3. Primary Unique Legal Identifiers (caseNumber, internalReference, clientNumber)
  IDENTIFIER_EXACT: 100,
  IDENTIFIER_WORD: 85,
  IDENTIFIER_SUBSTRING: 60,
  IDENTIFIER_FUZZY: 40,

  // 4. Primary Entity Titles & Names (caseTitle, clientName, organizationName)
  TITLE_NAME_EXACT: 85,
  TITLE_NAME_WORD: 70,
  TITLE_NAME_SUBSTRING: 50,
  TITLE_NAME_FUZZY: 35,

  // 5. Exhibit Number (Case documents)
  EXHIBIT_EXACT: 75,
  EXHIBIT_WORD: 60,
  EXHIBIT_SUBSTRING: 45,
  EXHIBIT_FUZZY: 30,

  // 5. Document Type (both Case & Client documents, matching enum or human label)
  DOCTYPE_EXACT: 70,
  DOCTYPE_WORD: 55,
  DOCTYPE_SUBSTRING: 40,
  DOCTYPE_FUZZY: 25,

  // 5. Direct Narrative Description (Case document description / Client document notes)
  DESCRIPTION_EXACT: 60,
  DESCRIPTION_WORD: 45,
  DESCRIPTION_SUBSTRING: 30,
  DESCRIPTION_FUZZY: 20,

  // 6. Client Contact Fields (phone, alternatePhone, email, nationalId)
  CONTACT_EXACT: 65,
  CONTACT_WORD: 50,
  CONTACT_SUBSTRING: 35,
  CONTACT_FUZZY: 20,

  // 6. Secondary Case Metadata (category, opposing counsel, opposing parties)
  CASE_SECONDARY_WORD: 45,
  CASE_SECONDARY_SUBSTRING: 30,
  CASE_SECONDARY_FUZZY: 20,

  // 6. Narrative Case Fields (case description, legal issues)
  CASE_NARRATIVE_EXACT: 45,
  CASE_NARRATIVE_WORD: 35,
  CASE_NARRATIVE_FUZZY: 20,

  // Associated Case match tiers (bucketed scores applied in aggregation pipeline)
  CASE_TIER_1: 85, // Exact case number / internal reference / client number / exact title
  CASE_TIER_2: 70, // Case title prefix / client name/org match
  CASE_TIER_3: 50, // Case substring / client contact
  CASE_TIER_4: 35, // Secondary case fields / fuzzy title
  CASE_TIER_5: 20, // Narrative case description / weak fuzzy

  // Associated Client match tiers (bucketed scores applied in aggregation pipeline)
  CLIENT_TIER_1: 85, // Exact client number / exact name / exact organization
  CLIENT_TIER_2: 70, // Name/org word prefix / exact phone/email/nid
  CLIENT_TIER_3: 50, // Substring on name / org / phone / email
  CLIENT_TIER_4: 35, // Secondary contact fields
  CLIENT_TIER_5: 20, // Fuzzy client match
} as const;

/**
 * Minimal data shape representing a candidate Case record for document search relevance.
 */
export interface DocumentCaseCandidate {
  _id: mongoose.Types.ObjectId;
  title?: string | null;
  caseNumber?: string | null;
  internalReference?: string | null;
  caseCategory?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[] | null;
  description?: string | null;
  legalIssues?: string | null;
  clientId?: mongoose.Types.ObjectId | null;
}

/**
 * Minimal data shape representing a candidate Client record for document search relevance.
 */
export interface DocumentClientCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  clientNumber?: string | null;
  organizationName?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  nationalId?: string | null;
}

/**
 * Minimal data shape representing a candidate document for simulated scoring and testing.
 */
export interface DirectDocumentCandidate {
  _id?: mongoose.Types.ObjectId | string;
  entityType?: typeof DOCUMENT_ENTITY_TYPES.CASE | typeof DOCUMENT_ENTITY_TYPES.CLIENT | string;
  title?: string | null;
  documentType?: string | null;
  description?: string | null;
  notes?: string | null;
  exhibitNumber?: string | null;
  caseId?: mongoose.Types.ObjectId | string | null;
  clientId?: mongoose.Types.ObjectId | string | null;
}

/**
 * Pre-computed matching case and client document types with their respective match scores.
 */
export interface MatchedDocumentTypes {
  matchedCaseDocTypes: Array<{ type: CaseDocumentType; score: number }>;
  matchedClientDocTypes: Array<{ type: ClientDocumentType; score: number }>;
}

/**
 * Dictionary of keyword aliases and vernacular terms for case document types.
 */
const CASE_DOCUMENT_TYPE_ALIASES: Record<CaseDocumentType, string[]> = {
  [CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION]: ["plaint", "petition", "arzi", "arzis", "plaint_or_petition"],
  [CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT]: ["written statement", "jabab", "jawab", "written_statement", "ws"],
  [CASE_DOCUMENT_TYPES.INJUNCTION_APPLICATION]: ["injunction application", "injunction", "stay order", "injunction_application"],
  [CASE_DOCUMENT_TYPES.BAIL_PETITION]: ["bail petition", "bail", "jamn", "bail_petition"],
  [CASE_DOCUMENT_TYPES.INTERLOCUTORY_ORDER]: ["interlocutory order", "interlocutory", "interlocutory_order"],
  [CASE_DOCUMENT_TYPES.FINAL_JUDGMENT]: ["final judgment", "judgment", "judgement", "ray", "final_judgment"],
  [CASE_DOCUMENT_TYPES.DECREE]: ["decree", "dikri"],
  [CASE_DOCUMENT_TYPES.DOCUMENTARY_EVIDENCE]: ["documentary evidence", "evidence", "prashangik dalil", "dalil", "documentary_evidence"],
  [CASE_DOCUMENT_TYPES.CERTIFIED_COPY]: ["certified copy", "nokol", "nakal", "certified_copy"],
  [CASE_DOCUMENT_TYPES.TITLE_DEED_DALIL]: ["title deed", "saf kabala", "saf-kabala", "heba dalil", "heba", "deed", "dalil", "title_deed_dalil"],
  [CASE_DOCUMENT_TYPES.KHATIAN_OR_MUTATION]: ["khatian", "mutation", "porcha", "parcha", "cs", "sa", "rs", "bs", "khatian_or_mutation"],
  [CASE_DOCUMENT_TYPES.VAKALATNAMA_POWER]: ["vakalatnama", "power of attorney", "am-moktarnama", "power", "vakalatnama_power"],
  [CASE_DOCUMENT_TYPES.POLICE_FIRST_INFORMATION_REPORT]: ["police fir", "fir", "first information report", "police_first_information_report"],
  [CASE_DOCUMENT_TYPES.CHARGE_SHEET]: ["police charge sheet", "charge sheet", "chargesheet", "charge_sheet"],
  [CASE_DOCUMENT_TYPES.TAX_ASSESSMENT_ORDER]: ["tax assessment order", "tax assessment", "assessment order", "tax_assessment_order"],
  [CASE_DOCUMENT_TYPES.TAX_DEMAND_NOTICE]: ["tax demand notice", "tax demand", "demand notice", "tax_demand_notice"],
  [CASE_DOCUMENT_TYPES.CORRESPONDENCE]: ["legal correspondence", "correspondence", "letter"],
  [CASE_DOCUMENT_TYPES.LEGAL_NOTICE]: ["legal notice", "notice", "demand notice", "legal_notice"],
  [CASE_DOCUMENT_TYPES.OTHER]: ["other legal document", "other"],
};

/**
 * Dictionary of keyword aliases and vernacular terms for client document types.
 */
const CLIENT_DOCUMENT_TYPE_ALIASES: Record<ClientDocumentType, string[]> = {
  [CLIENT_DOCUMENT_TYPES.NATIONAL_ID]: ["national id", "nid", "smart card", "national_id"],
  [CLIENT_DOCUMENT_TYPES.PASSPORT]: ["passport"],
  [CLIENT_DOCUMENT_TYPES.BIRTH_CERTIFICATE]: ["birth certificate", "birth_certificate"],
  [CLIENT_DOCUMENT_TYPES.TRADE_LICENSE]: ["trade license", "trade licence", "trade_license", "license", "licence"],
  [CLIENT_DOCUMENT_TYPES.TIN_CERTIFICATE]: ["tin certificate", "tin", "tin_certificate"],
  [CLIENT_DOCUMENT_TYPES.BIN_VAT_CERTIFICATE]: ["bin vat certificate", "bin certificate", "vat certificate", "bin", "vat", "bin_vat_certificate"],
  [CLIENT_DOCUMENT_TYPES.CERTIFICATE_OF_INCORPORATION]: ["certificate of incorporation", "incorporation certificate", "incorporation", "certificate_of_incorporation"],
  [CLIENT_DOCUMENT_TYPES.MEMORANDUM_OF_ASSOCIATION]: ["memorandum of association", "memorandum", "articles of association", "moa", "aoa", "memorandum_of_association"],
  [CLIENT_DOCUMENT_TYPES.BOARD_RESOLUTION]: ["board resolution", "resolution", "board_resolution"],
  [CLIENT_DOCUMENT_TYPES.POWER_OF_ATTORNEY]: ["power of attorney", "am-moktarnama", "power", "power_of_attorney"],
  [CLIENT_DOCUMENT_TYPES.RETAINER_AGREEMENT]: ["legal retainer agreement", "retainer agreement", "retainer", "retainer_agreement"],
  [CLIENT_DOCUMENT_TYPES.CLIENT_PHOTOGRAPH]: ["client photograph", "photograph", "photo", "picture", "client_photograph"],
  [CLIENT_DOCUMENT_TYPES.TAX_RETURN_ACKNOWLEDGEMENT]: ["tax return acknowledgement", "tax return", "tax acknowledgement", "return receipt", "tax_return_acknowledgement"],
  [CLIENT_DOCUMENT_TYPES.OTHER]: ["other document", "other"],
};

/**
 * Evaluates whether a search query matches any Case or Client document type enums, display labels, or aliases.
 */
export function matchDocumentTypes(query: string): MatchedDocumentTypes {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) {
    return { matchedCaseDocTypes: [], matchedClientDocTypes: [] };
  }

  const scoreTypeMatch = (
    enumVal: string,
    label: string,
    aliases: string[]
  ): number => {
    const rawVal = enumVal.toLowerCase();
    const lbl = label.toLowerCase();

    // 1. Exact match on raw enum or display label
    if (q === rawVal || q === lbl) {
      return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_EXACT;
    }

    // 2. Exact match on any alias/keyword
    for (const alias of aliases) {
      if (q === alias) {
        return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_EXACT;
      }
    }

    // 3. Word boundary or prefix match on label or aliases
    if (lbl.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(lbl)) {
      return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_WORD;
    }
    for (const alias of aliases) {
      if (alias.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(alias)) {
        return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_WORD;
      }
    }

    // 4. Substring match
    if (lbl.includes(q)) {
      return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_SUBSTRING;
    }
    for (const alias of aliases) {
      if (alias.includes(q)) {
        return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_SUBSTRING;
      }
    }

    // 5. Typo / similarity check for queries >= 3 chars
    if (q.length >= 3) {
      for (const alias of aliases) {
        if (alias.length >= 3) {
          const sim = calculateStringSimilarity(q, alias);
          if (sim >= 0.5) {
            return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_FUZZY;
          }
        }
      }
      const simLabel = calculateStringSimilarity(q, lbl);
      if (simLabel >= 0.5) {
        return DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_FUZZY;
      }
    }

    return 0;
  };

  const matchedCaseDocTypes: Array<{ type: CaseDocumentType; score: number }> = [];
  for (const cType of CASE_DOCUMENT_TYPE_LIST) {
    const score = scoreTypeMatch(
      cType,
      CASE_DOCUMENT_TYPE_LABELS[cType] || cType,
      CASE_DOCUMENT_TYPE_ALIASES[cType] || []
    );
    if (score > 0) {
      matchedCaseDocTypes.push({ type: cType, score });
    }
  }

  const matchedClientDocTypes: Array<{ type: ClientDocumentType; score: number }> = [];
  for (const clType of CLIENT_DOCUMENT_TYPE_LIST) {
    const score = scoreTypeMatch(
      clType,
      CLIENT_DOCUMENT_TYPE_LABELS[clType] || clType,
      CLIENT_DOCUMENT_TYPE_ALIASES[clType] || []
    );
    if (score > 0) {
      matchedClientDocTypes.push({ type: clType, score });
    }
  }

  return { matchedCaseDocTypes, matchedClientDocTypes };
}

/**
 * Calculates candidate relevance score for a Case document against the user's search query.
 */
export function calculateDocumentCaseMatchScore(
  caseDoc: DocumentCaseCandidate,
  query: string,
  clientScores?: Map<string, number>
): { directScore: number; clientScore: number } {
  const q = query.trim().toLowerCase();
  if (!q) return { directScore: 0, clientScore: 0 };

  const caseNum = (caseDoc.caseNumber || "").trim().toLowerCase();
  const internalRef = (caseDoc.internalReference || "").trim().toLowerCase();
  const title = (caseDoc.title || "").trim().toLowerCase();
  const category = (caseDoc.caseCategory || "").trim().toLowerCase();
  const counsel = (caseDoc.opposingCounsel || "").trim().toLowerCase();
  const description = (caseDoc.description || "").trim().toLowerCase();
  const legalIssues = (caseDoc.legalIssues || "").trim().toLowerCase();

  let directScore = 0;

  // 1. Case identifier match (caseNumber, internalReference)
  if (caseNum === q || internalRef === q) {
    directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT);
  } else if (
    (caseNum && (caseNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(caseNum))) ||
    (internalRef && (internalRef.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(internalRef)))
  ) {
    directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD);
  } else if ((caseNum && caseNum.includes(q)) || (internalRef && internalRef.includes(q))) {
    directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING);
  } else if (
    (caseNum && calculateStringSimilarity(q, caseNum) >= 0.5) ||
    (internalRef && calculateStringSimilarity(q, internalRef) >= 0.5)
  ) {
    directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY);
  }

  // 2. Case title match
  if (title) {
    if (title === q) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT);
    } else if (title.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(title)) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD);
    } else if (title.includes(q)) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_SUBSTRING);
    } else if (calculateStringSimilarity(q, title) >= 0.5) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_FUZZY);
    }
  }

  // 3. Secondary case metadata (category, counsel, parties)
  const secondaryFields = [category, counsel, ...(caseDoc.opposingParties || []).map((p) => p.toLowerCase())];
  for (const field of secondaryFields) {
    if (!field) continue;
    if (field === q || field.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(field)) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD);
      break;
    } else if (field.includes(q)) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_SUBSTRING);
    } else if (calculateStringSimilarity(q, field) >= 0.5) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
    }
  }

  // 4. Narrative fields (description, legalIssues)
  const narrativeFields = [description, legalIssues];
  for (const field of narrativeFields) {
    if (!field) continue;
    if (field === q) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_EXACT);
    } else if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(field)) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_WORD);
    } else if (calculateStringSimilarity(q, field) >= 0.5) {
      directScore = Math.max(directScore, DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_FUZZY);
    }
  }

  // 5. Inherited Client Score via Case's clientId
  let clientScore = 0;
  if (clientScores && caseDoc.clientId) {
    const matchedScore = clientScores.get(String(caseDoc.clientId));
    if (matchedScore && matchedScore > 0) {
      // Inherited client score applied with slight attenuation
      clientScore = Math.round(matchedScore * 0.85);
    }
  }

  return { directScore, clientScore };
}

/**
 * Calculates candidate relevance score for a Client record against the user's search query.
 */
export function calculateDocumentClientMatchScore(
  clientDoc: DocumentClientCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const clientNum = (clientDoc.clientNumber || "").trim().toLowerCase();
  const name = (clientDoc.name || "").trim().toLowerCase();
  const org = (clientDoc.organizationName || "").trim().toLowerCase();
  const phone = (clientDoc.phone || "").trim().toLowerCase();
  const altPhone = (clientDoc.alternatePhone || "").trim().toLowerCase();
  const email = (clientDoc.email || "").trim().toLowerCase();
  const nationalId = (clientDoc.nationalId || "").trim().toLowerCase();

  let score = 0;

  // 1. Client number exact/partial
  if (clientNum === q) {
    score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT);
  } else if (clientNum && (clientNum.startsWith(q) || clientNum.includes(q))) {
    score = Math.max(
      score,
      clientNum.startsWith(q)
        ? DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD
        : DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING
    );
  } else if (clientNum && calculateStringSimilarity(q, clientNum) >= 0.5) {
    score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY);
  }

  // 2. Name & Organization exact/partial/fuzzy
  const nameFields = [name, org];
  for (const field of nameFields) {
    if (!field) continue;
    if (field === q) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT);
    } else if (field.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(field)) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD);
    } else if (field.includes(q)) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_SUBSTRING);
    } else if (calculateStringSimilarity(q, field) >= 0.5) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_FUZZY);
    }
  }

  // 3. Contact fields (phone, alternatePhone, email, nationalId)
  const contactFields = [phone, altPhone, email, nationalId];
  for (const field of contactFields) {
    if (!field) continue;
    if (field === q) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT);
    } else if (field.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(field)) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD);
    } else if (field.includes(q)) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING);
    } else if (calculateStringSimilarity(q, field) >= 0.5) {
      score = Math.max(score, DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY);
    }
  }

  return score;
}

/**
 * Calculates direct document relevance score for simulation, verification, and automated tests.
 */
export function calculateDirectDocumentMatchScore(
  doc: DirectDocumentCandidate,
  query: string,
  caseScores?: Map<string, number>,
  clientScores?: Map<string, number>,
  matchedCaseDocTypes: Array<{ type: CaseDocumentType; score: number }> = [],
  matchedClientDocTypes: Array<{ type: ClientDocumentType; score: number }> = []
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const patterns = buildFuzzySearchPatterns(q);
  let totalScore = 0;

  const scoreTextField = (
    val: string | null | undefined,
    exactScore: number,
    wordScore: number,
    subScore: number,
    fuzzyScore: number
  ): number => {
    if (!val) return 0;
    const v = val.trim().toLowerCase();
    if (!v) return 0;

    // Full exact match
    if (v === q) return exactScore;

    // Word boundary or prefix match
    if (v.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(v)) {
      return wordScore;
    }

    // Substring match
    if (v.includes(q)) {
      return subScore;
    }

    // Fuzzy string similarity or pattern match
    if (
      (patterns && new RegExp(patterns.fuzzyPattern, "i").test(v)) ||
      calculateStringSimilarity(q, v) >= 0.4
    ) {
      return fuzzyScore;
    }

    return 0;
  };

  // 1. Direct title scoring
  totalScore += scoreTextField(
    doc.title,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY
  );

  // 2. Direct exhibit number (Case documents)
  totalScore += scoreTextField(
    doc.exhibitNumber,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_EXACT,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_WORD,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_SUBSTRING,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_FUZZY
  );

  // 3. Direct description / notes
  totalScore += scoreTextField(
    doc.description || doc.notes,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
    DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY
  );

  // 4. Document type
  if (doc.documentType) {
    const caseMatch = matchedCaseDocTypes.find((d) => d.type === doc.documentType);
    const clientMatch = matchedClientDocTypes.find((d) => d.type === doc.documentType);
    if (caseMatch) {
      totalScore += caseMatch.score;
    } else if (clientMatch) {
      totalScore += clientMatch.score;
    }
  }

  // 5. Related Case score
  if (doc.caseId && caseScores) {
    const cScore = caseScores.get(String(doc.caseId));
    if (cScore && cScore > 0) {
      totalScore += cScore;
    }
  }

  // 6. Related Client score
  if (doc.clientId && clientScores) {
    const clScore = clientScores.get(String(doc.clientId));
    if (clScore && clScore > 0) {
      totalScore += clScore;
    }
  }

  return totalScore;
}

/**
 * Builds the MongoDB aggregation expression to calculate dynamic relevance score for Case Documents.
 */
export function buildCaseDocumentRelevanceExpr(
  caseBuckets: ScoredEntityBuckets,
  inheritedClientCaseBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns,
  matchedDocTypes: Array<{ type: CaseDocumentType; score: number }>
): Record<string, unknown> {
  // 1. CaseId direct scoring switch
  const caseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (caseBuckets.tier1Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier1Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_1,
    });
  }
  if (caseBuckets.tier2Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier2Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_2,
    });
  }
  if (caseBuckets.tier3Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier3Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_3,
    });
  }
  if (caseBuckets.tier4Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier4Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_4,
    });
  }
  if (caseBuckets.tier5Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier5Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_5,
    });
  }

  const caseScoreExpr =
    caseBranches.length > 0
      ? { $switch: { branches: caseBranches, default: 0 } }
      : 0;

  // 2. Inherited Client score via caseId
  const inheritedCaseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (inheritedClientCaseBuckets.tier1Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier1Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_2,
    });
  }
  if (inheritedClientCaseBuckets.tier2Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier2Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_3,
    });
  }
  if (inheritedClientCaseBuckets.tier3Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier3Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_4,
    });
  }
  if (inheritedClientCaseBuckets.tier4Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier4Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_5,
    });
  }

  const inheritedClientCaseScoreExpr =
    inheritedCaseBranches.length > 0
      ? { $switch: { branches: inheritedCaseBranches, default: 0 } }
      : 0;

  // Direct caseId score takes precedence, falling back to inherited client score
  const effectiveCaseScoreExpr = {
    $cond: [
      { $gt: [caseScoreExpr, 0] },
      caseScoreExpr,
      inheritedClientCaseScoreExpr,
    ],
  };

  // 3. Direct document title scoring switch
  const titleExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: `^\\s*${patterns.substringPattern}\\s*$`,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. Exhibit number scoring switch
  const exhibitExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$exhibitNumber", ""] },
              regex: `^\\s*${patterns.substringPattern}\\s*$`,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$exhibitNumber", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$exhibitNumber", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$exhibitNumber", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 5. Direct description scoring switch
  const descriptionExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: `^\\s*${patterns.substringPattern}\\s*$`,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 6. Document type scoring switch
  const docTypeBranches: Array<{ case: Record<string, unknown>; then: number }> = matchedDocTypes.map(
    (d) => ({
      case: { $eq: ["$documentType", d.type] },
      then: d.score,
    })
  );

  // Fallback: direct pattern match on stored enum string
  docTypeBranches.push(
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$documentType", ""] },
          regex: patterns.wordPattern,
          options: "i",
        },
      },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_WORD,
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$documentType", ""] },
          regex: patterns.fuzzyPattern,
          options: "i",
        },
      },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_FUZZY,
    }
  );

  const docTypeExpr = {
    $switch: {
      branches: docTypeBranches,
      default: 0,
    },
  };

  return {
    $add: [
      titleExpr,
      exhibitExpr,
      descriptionExpr,
      docTypeExpr,
      effectiveCaseScoreExpr,
    ],
  };
}

/**
 * Builds the MongoDB aggregation expression to calculate dynamic relevance score for Client Documents.
 */
export function buildClientDocumentRelevanceExpr(
  clientBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns,
  matchedDocTypes: Array<{ type: ClientDocumentType; score: number }>
): Record<string, unknown> {
  // 1. ClientId direct scoring switch
  const clientBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (clientBuckets.tier1Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier1Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1,
    });
  }
  if (clientBuckets.tier2Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier2Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2,
    });
  }
  if (clientBuckets.tier3Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier3Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3,
    });
  }
  if (clientBuckets.tier4Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier4Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4,
    });
  }
  if (clientBuckets.tier5Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier5Ids] },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5,
    });
  }

  const clientScoreExpr =
    clientBranches.length > 0
      ? { $switch: { branches: clientBranches, default: 0 } }
      : 0;

  // 2. Direct document title scoring switch
  const titleExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: `^\\s*${patterns.substringPattern}\\s*$`,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 3. Direct notes scoring switch
  const notesExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: `^\\s*${patterns.substringPattern}\\s*$`,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. Document type scoring switch
  const docTypeBranches: Array<{ case: Record<string, unknown>; then: number }> = matchedDocTypes.map(
    (d) => ({
      case: { $eq: ["$documentType", d.type] },
      then: d.score,
    })
  );

  // Fallback: direct pattern match on stored enum string
  docTypeBranches.push(
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$documentType", ""] },
          regex: patterns.wordPattern,
          options: "i",
        },
      },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_WORD,
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$documentType", ""] },
          regex: patterns.fuzzyPattern,
          options: "i",
        },
      },
      then: DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_FUZZY,
    }
  );

  const docTypeExpr = {
    $switch: {
      branches: docTypeBranches,
      default: 0,
    },
  };

  return {
    $add: [
      titleExpr,
      notesExpr,
      docTypeExpr,
      clientScoreExpr,
    ],
  };
}

/**
 * Builds standalone relevance stages for CaseDocument collection queries.
 */
export function buildCaseDocumentRelevanceStages(
  caseBuckets: ScoredEntityBuckets,
  inheritedClientCaseBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns,
  matchedDocTypes: Array<{ type: CaseDocumentType; score: number }>
): mongoose.PipelineStage[] {
  const relevanceExpr = buildCaseDocumentRelevanceExpr(
    caseBuckets,
    inheritedClientCaseBuckets,
    patterns,
    matchedDocTypes
  );

  return [
    {
      $addFields: {
        relevanceScore: relevanceExpr,
      },
    },
    {
      $match: {
        relevanceScore: { $gt: 0 },
      },
    },
  ];
}

/**
 * Builds standalone relevance stages for ClientDocument collection queries.
 */
export function buildClientDocumentRelevanceStages(
  clientBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns,
  matchedDocTypes: Array<{ type: ClientDocumentType; score: number }>
): mongoose.PipelineStage[] {
  const relevanceExpr = buildClientDocumentRelevanceExpr(
    clientBuckets,
    patterns,
    matchedDocTypes
  );

  return [
    {
      $addFields: {
        relevanceScore: relevanceExpr,
      },
    },
    {
      $match: {
        relevanceScore: { $gt: 0 },
      },
    },
  ];
}
