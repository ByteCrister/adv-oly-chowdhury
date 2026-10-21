import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  FuzzySearchPatterns,
  ScoredEntityBuckets,
} from "./shared-fuzzy-search.helper";

/**
 * Score constants for Clients relevance ranking.
 *
 * Calibrated according to the required hierarchy:
 * 1. Primary client identifiers (clientNumber, nationalId) have highest priority.
 * 2. Direct contact information (phone, email) ranks directly below identifiers.
 * 3. Client name and organization name provide primary identity ranking.
 * 4. Close fuzzy matches in client fields provide typo-tolerant discovery.
 * 5. Strong matches in associated cases, courts, documents, and payments provide contextual boosts.
 * 6. Weaker matches in related records provide lower-tier discovery.
 */
export const CLIENT_SEARCH_RELEVANCE_SCORES = {
  // Primary client identifiers (clientNumber, nationalId)
  IDENTIFIER_EXACT: 120,
  IDENTIFIER_WORD: 100,
  IDENTIFIER_SUBSTRING: 70,
  IDENTIFIER_FUZZY: 40,

  // Direct contact information (phone, alternatePhone, email)
  CONTACT_EXACT: 110,
  CONTACT_WORD: 90,
  CONTACT_SUBSTRING: 70,
  CONTACT_FUZZY: 40,

  // Client personal name
  NAME_EXACT: 100,
  NAME_WORD: 85,
  NAME_SUBSTRING: 60,
  NAME_FUZZY: 40,

  // Client organization name
  ORG_EXACT: 95,
  ORG_WORD: 80,
  ORG_SUBSTRING: 55,
  ORG_FUZZY: 35,

  // Related entity boost tiers for client document scoring
  RELATED_TIER_1: 85, // Exact case identifier / exact case title
  RELATED_TIER_2: 70, // Case prefix / exact document title / exact payment receipt
  RELATED_TIER_3: 50, // Case substring / document prefix / court match
  RELATED_TIER_4: 35, // Fuzzy case / document substring / secondary case match
  RELATED_TIER_5: 20, // Narrative case match / fuzzy doc / fuzzy payment

  // Related candidate match scores (before bucketing into RELATED_TIERs)
  CASE_IDENTIFIER_EXACT: 100,
  CASE_IDENTIFIER_WORD: 85,
  CASE_IDENTIFIER_SUBSTRING: 60,
  CASE_IDENTIFIER_FUZZY: 40,

  CASE_TITLE_EXACT: 90,
  CASE_TITLE_WORD: 75,
  CASE_TITLE_SUBSTRING: 50,
  CASE_TITLE_FUZZY: 35,

  CASE_SECONDARY_WORD: 45,
  CASE_SECONDARY_FUZZY: 25,

  CASE_NARRATIVE_EXACT: 50,
  CASE_NARRATIVE_WORD: 35,
  CASE_NARRATIVE_FUZZY: 20,

  COURT_EXACT_NAME: 70,
  COURT_EXACT_DISTRICT: 60,
  COURT_WORD_NAME: 50,
  COURT_WORD_DISTRICT: 35,
  COURT_FUZZY: 25,

  DOC_TITLE_EXACT: 70,
  DOC_TITLE_WORD: 55,
  DOC_TITLE_SUBSTRING: 40,
  DOC_TITLE_FUZZY: 25,
  DOC_SECONDARY: 20,

  PAYMENT_IDENTIFIER_EXACT: 80,
  PAYMENT_IDENTIFIER_WORD: 60,
  PAYMENT_IDENTIFIER_SUBSTRING: 40,
  PAYMENT_IDENTIFIER_FUZZY: 25,
  PAYMENT_SECONDARY: 20,
} as const;

/**
 * Data shape representing a minimal Case candidate for client relevance scoring.
 */
export interface ClientRelatedCaseCandidate {
  _id: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  courtId?: mongoose.Types.ObjectId | null;
  title?: string | null;
  caseNumber?: string | null;
  internalReference?: string | null;
  caseCategory?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[] | null;
  description?: string | null;
  legalIssues?: string | null;
}

/**
 * Data shape representing a minimal Court candidate for court matching.
 */
export interface ClientRelatedCourtCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  district?: string | null;
}

/**
 * Data shape representing a minimal ClientDocument candidate for client relevance scoring.
 */
export interface ClientRelatedDocumentCandidate {
  _id: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  title?: string | null;
  documentType?: string | null;
  notes?: string | null;
}

/**
 * Data shape representing a minimal ClientPayment candidate for client relevance scoring.
 */
export interface ClientRelatedPaymentCandidate {
  _id: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId | null;
  moneyReceiptNumber?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

/**
 * Data shape representing a Client candidate for direct relevance scoring.
 */
export interface DirectClientMatchCandidate {
  _id?: mongoose.Types.ObjectId | string;
  name?: string | null;
  clientNumber?: string | null;
  organizationName?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  nationalId?: string | null;
  email?: string | null;
}

/**
 * Calculates a match score for a Court candidate against the user query.
 */
export function calculateClientCourtMatchScore(
  courtDoc: ClientRelatedCourtCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  const name = (courtDoc.name || "").trim().toLowerCase();
  const district = (courtDoc.district || "").trim().toLowerCase();

  if (!q) return 0;

  if (name === q) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_EXACT_NAME;
  }
  if (district === q) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_EXACT_DISTRICT;
  }
  if (name && (name.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(name))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_WORD_NAME;
  }
  if (district && (district.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(district))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_WORD_DISTRICT;
  }
  if (name && name.includes(q)) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_WORD_DISTRICT;
  }
  if (district && district.includes(q)) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_WORD_DISTRICT;
  }
  if (name && calculateStringSimilarity(q, name) >= 0.5) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_FUZZY;
  }
  if (district && calculateStringSimilarity(q, district) >= 0.5) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.COURT_FUZZY;
  }

  return 0;
}

/**
 * Calculates a relevance score for an associated Case against the user query.
 * Combines case identifier, title, secondary, narrative, and court matches.
 */
export function calculateClientCaseMatchScore(
  caseDoc: ClientRelatedCaseCandidate,
  query: string,
  courtScores?: Map<string, number>
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const caseNum = (caseDoc.caseNumber || "").trim().toLowerCase();
  const internalRef = (caseDoc.internalReference || "").trim().toLowerCase();
  const title = (caseDoc.title || "").trim().toLowerCase();
  const category = (caseDoc.caseCategory || "").trim().toLowerCase();
  const counsel = (caseDoc.opposingCounsel || "").trim().toLowerCase();
  const desc = (caseDoc.description || "").trim().toLowerCase();
  const legal = (caseDoc.legalIssues || "").trim().toLowerCase();
  const parties = Array.isArray(caseDoc.opposingParties)
    ? caseDoc.opposingParties.map((p) => (p || "").trim().toLowerCase()).join(" ")
    : "";

  let score = 0;

  // 1. Identifiers (caseNumber, internalReference)
  if (caseNum === q || internalRef === q) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_EXACT);
  } else if (
    (caseNum && (caseNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(caseNum))) ||
    (internalRef && (internalRef.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(internalRef)))
  ) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_WORD);
  } else if (
    (caseNum && caseNum.includes(q)) ||
    (internalRef && internalRef.includes(q))
  ) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
  } else {
    const numSim = Math.max(
      caseNum ? calculateStringSimilarity(q, caseNum) : 0,
      internalRef ? calculateStringSimilarity(q, internalRef) : 0
    );
    if (numSim >= 0.5) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_FUZZY);
    }
  }

  // 2. Title
  if (title === q) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_TITLE_EXACT);
  } else if (title && (title.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(title))) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_TITLE_WORD);
  } else if (title && title.includes(q)) {
    score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_TITLE_SUBSTRING);
  } else if (title) {
    const titleSim = calculateStringSimilarity(q, title);
    if (titleSim >= 0.5) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_TITLE_FUZZY);
    }
  }

  // 3. Secondary fields (category, counsel, parties)
  const secondaryText = `${category} ${counsel} ${parties}`.trim();
  if (secondaryText) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(secondaryText)) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD);
    } else if (calculateStringSimilarity(q, secondaryText) >= 0.5) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
    }
  }

  // 4. Narrative fields (description, legalIssues)
  const narrativeText = `${desc} ${legal}`.trim();
  if (narrativeText) {
    if (narrativeText.includes(q)) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_EXACT);
    } else if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(narrativeText)) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_WORD);
    } else if (calculateStringSimilarity(q, narrativeText) >= 0.5) {
      score = Math.max(score, CLIENT_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_FUZZY);
    }
  }

  // 5. Associated Court match
  if (courtScores && caseDoc.courtId) {
    const courtScore = courtScores.get(String(caseDoc.courtId));
    if (courtScore && courtScore > 0) {
      score = Math.max(score, courtScore);
    }
  }

  return score;
}

/**
 * Calculates a match score for an associated ClientDocument against the user query.
 */
export function calculateClientDocumentMatchScore(
  doc: ClientRelatedDocumentCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const title = (doc.title || "").trim().toLowerCase();
  const notes = (doc.notes || "").trim().toLowerCase();
  const docType = (doc.documentType || "").trim().toLowerCase();

  if (title === q) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.DOC_TITLE_EXACT;
  }
  if (title && (title.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(title))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.DOC_TITLE_WORD;
  }
  if (title && title.includes(q)) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.DOC_TITLE_SUBSTRING;
  }
  if (title && calculateStringSimilarity(q, title) >= 0.5) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.DOC_TITLE_FUZZY;
  }

  const secondary = `${notes} ${docType}`.trim();
  if (secondary && (secondary.includes(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(secondary))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.DOC_SECONDARY;
  }

  return 0;
}

/**
 * Calculates a match score for an associated ClientPayment against the user query.
 */
export function calculateClientPaymentMatchScore(
  payment: ClientRelatedPaymentCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const receipt = (payment.moneyReceiptNumber || "").trim().toLowerCase();
  const ref = (payment.referenceNumber || "").trim().toLowerCase();
  const notes = (payment.notes || "").trim().toLowerCase();

  if (receipt === q || ref === q) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.PAYMENT_IDENTIFIER_EXACT;
  }
  if (
    (receipt && (receipt.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(receipt))) ||
    (ref && (ref.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(ref)))
  ) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.PAYMENT_IDENTIFIER_WORD;
  }
  if ((receipt && receipt.includes(q)) || (ref && ref.includes(q))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.PAYMENT_IDENTIFIER_SUBSTRING;
  }
  const sim = Math.max(
    receipt ? calculateStringSimilarity(q, receipt) : 0,
    ref ? calculateStringSimilarity(q, ref) : 0
  );
  if (sim >= 0.5) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.PAYMENT_IDENTIFIER_FUZZY;
  }
  if (notes && (notes.includes(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(notes))) {
    return CLIENT_SEARCH_RELEVANCE_SCORES.PAYMENT_SECONDARY;
  }

  return 0;
}

/**
 * Calculates a simulated direct relevance score for a Client against the search query.
 * Mirrors the exact scoring expressions constructed in buildClientRelevanceStages.
 */
export function calculateDirectClientMatchScore(
  clientDoc: DirectClientMatchCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const clientNum = (clientDoc.clientNumber || "").trim().toLowerCase();
  const nationalId = (clientDoc.nationalId || "").trim().toLowerCase();
  const name = (clientDoc.name || "").trim().toLowerCase();
  const org = (clientDoc.organizationName || "").trim().toLowerCase();
  const phone = (clientDoc.phone || "").trim().toLowerCase();
  const altPhone = (clientDoc.alternatePhone || "").trim().toLowerCase();
  const email = (clientDoc.email || "").trim().toLowerCase();

  let clientNumScore = 0;
  if (clientNum === q) {
    clientNumScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT;
  } else if (clientNum && (clientNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(clientNum))) {
    clientNumScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD;
  } else if (clientNum && clientNum.includes(q)) {
    clientNumScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING;
  } else if (clientNum && calculateStringSimilarity(q, clientNum) >= 0.5) {
    clientNumScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY;
  }

  let nationalIdScore = 0;
  if (nationalId === q) {
    nationalIdScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT;
  } else if (nationalId && (nationalId.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(nationalId))) {
    nationalIdScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD;
  } else if (nationalId && nationalId.includes(q)) {
    nationalIdScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING;
  } else if (nationalId && calculateStringSimilarity(q, nationalId) >= 0.5) {
    nationalIdScore = CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY;
  }

  const phoneMatch = (val: string) => {
    if (val === q) return CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT;
    if (val.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(val)) return CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD;
    if (val.includes(q)) return CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING;
    if (calculateStringSimilarity(q, val) >= 0.5) return CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY;
    return 0;
  };
  const phoneScore = Math.max(phoneMatch(phone), phoneMatch(altPhone));

  let emailScore = 0;
  if (email === q) {
    emailScore = CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT;
  } else if (email && (email.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(email))) {
    emailScore = CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD;
  } else if (email && email.includes(q)) {
    emailScore = CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING;
  } else if (email && calculateStringSimilarity(q, email) >= 0.5) {
    emailScore = CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY;
  }

  let nameScore = 0;
  if (name === q) {
    nameScore = CLIENT_SEARCH_RELEVANCE_SCORES.NAME_EXACT;
  } else if (name && (name.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(name))) {
    nameScore = CLIENT_SEARCH_RELEVANCE_SCORES.NAME_WORD;
  } else if (name && name.includes(q)) {
    nameScore = CLIENT_SEARCH_RELEVANCE_SCORES.NAME_SUBSTRING;
  } else if (name && calculateStringSimilarity(q, name) >= 0.5) {
    nameScore = CLIENT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY;
  }

  let orgScore = 0;
  if (org === q) {
    orgScore = CLIENT_SEARCH_RELEVANCE_SCORES.ORG_EXACT;
  } else if (org && (org.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(org))) {
    orgScore = CLIENT_SEARCH_RELEVANCE_SCORES.ORG_WORD;
  } else if (org && org.includes(q)) {
    orgScore = CLIENT_SEARCH_RELEVANCE_SCORES.ORG_SUBSTRING;
  } else if (org && calculateStringSimilarity(q, org) >= 0.5) {
    orgScore = CLIENT_SEARCH_RELEVANCE_SCORES.ORG_FUZZY;
  }

  return clientNumScore + nationalIdScore + phoneScore + emailScore + nameScore + orgScore;
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Clients collection.
 */
export function buildClientRelevanceStages(
  relatedBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns
): mongoose.PipelineStage[] {
  // 1. clientNumber scoring switch
  const clientNumberExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$clientNumber", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$clientNumber", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$clientNumber", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$clientNumber", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 2. nationalId scoring switch
  const nationalIdExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$nationalId", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$nationalId", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$nationalId", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$nationalId", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 3. Phone & AlternatePhone scoring switch
  const phoneExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$phone", ""] },
                  regex: patterns.exactPattern,
                  options: "i",
                },
              },
              {
                $regexMatch: {
                  input: { $ifNull: ["$alternatePhone", ""] },
                  regex: patterns.exactPattern,
                  options: "i",
                },
              },
            ],
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
        },
        {
          case: {
            $or: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$phone", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              {
                $regexMatch: {
                  input: { $ifNull: ["$alternatePhone", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
            ],
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD,
        },
        {
          case: {
            $or: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$phone", ""] },
                  regex: patterns.substringPattern,
                  options: "i",
                },
              },
              {
                $regexMatch: {
                  input: { $ifNull: ["$alternatePhone", ""] },
                  regex: patterns.substringPattern,
                  options: "i",
                },
              },
            ],
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING,
        },
        {
          case: {
            $or: [
              {
                $regexMatch: {
                  input: { $ifNull: ["$phone", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              {
                $regexMatch: {
                  input: { $ifNull: ["$alternatePhone", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
            ],
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. Email scoring switch
  const emailExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$email", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$email", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$email", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$email", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 5. Name scoring switch
  const nameExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.NAME_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.NAME_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.NAME_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 6. OrganizationName scoring switch
  const orgExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$organizationName", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.ORG_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$organizationName", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.ORG_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$organizationName", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.ORG_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$organizationName", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CLIENT_SEARCH_RELEVANCE_SCORES.ORG_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 7. Related entity scoring switch based on client document's own _id
  const relatedBranches: Array<{ case: Record<string, unknown>; then: number }> = [];

  if (relatedBuckets.tier1Ids.length > 0) {
    relatedBranches.push({
      case: { $in: ["$_id", relatedBuckets.tier1Ids] },
      then: CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_1,
    });
  }
  if (relatedBuckets.tier2Ids.length > 0) {
    relatedBranches.push({
      case: { $in: ["$_id", relatedBuckets.tier2Ids] },
      then: CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_2,
    });
  }
  if (relatedBuckets.tier3Ids.length > 0) {
    relatedBranches.push({
      case: { $in: ["$_id", relatedBuckets.tier3Ids] },
      then: CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_3,
    });
  }
  if (relatedBuckets.tier4Ids.length > 0) {
    relatedBranches.push({
      case: { $in: ["$_id", relatedBuckets.tier4Ids] },
      then: CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_4,
    });
  }
  if (relatedBuckets.tier5Ids.length > 0) {
    relatedBranches.push({
      case: { $in: ["$_id", relatedBuckets.tier5Ids] },
      then: CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_5,
    });
  }

  const relatedScoreExpr =
    relatedBranches.length > 0
      ? { $switch: { branches: relatedBranches, default: 0 } }
      : 0;

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            clientNumberExpr,
            nationalIdExpr,
            phoneExpr,
            emailExpr,
            nameExpr,
            orgExpr,
            relatedScoreExpr,
          ],
        },
      },
    },
    {
      $match: {
        relevanceScore: { $gt: 0 },
      },
    },
  ];
}
