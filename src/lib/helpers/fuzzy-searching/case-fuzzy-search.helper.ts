import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  FuzzySearchPatterns,
  ScoredEntityBuckets,
} from "./shared-fuzzy-search.helper";

/**
 * Score constants for Cases relevance ranking.
 *
 * Calibrated so that:
 * 1. Primary identifiers (caseNumber, internalReference) have highest priority.
 * 2. Case title matches rank above secondary metadata.
 * 3. Client matches provide weighted boosts based on candidate quality.
 * 4. Court matches provide appropriate contextual boosts.
 * 5. Secondary categories, parties, counsels, and narrative descriptions add cumulative relevance.
 */
export const CASE_SEARCH_RELEVANCE_SCORES = {
  // Case number and internal reference
  IDENTIFIER_EXACT: 100,
  IDENTIFIER_WORD: 85,
  IDENTIFIER_SUBSTRING: 60,
  IDENTIFIER_FUZZY: 40,

  // Case title
  TITLE_EXACT: 90,
  TITLE_WORD: 75,
  TITLE_SUBSTRING: 50,
  TITLE_FUZZY: 35,

  // Client match tiers
  CLIENT_TIER_1: 85,
  CLIENT_TIER_2: 70,
  CLIENT_TIER_3: 55,
  CLIENT_TIER_4: 40,
  CLIENT_TIER_5: 25,

  // Court match tiers
  COURT_TIER_1: 70,
  COURT_TIER_2: 50,
  COURT_TIER_3: 35,
  COURT_TIER_4: 20,

  // Secondary fields (caseCategory, opposingCounsel, opposingParties)
  SECONDARY_WORD: 45,
  SECONDARY_FUZZY: 25,

  // Narrative fields (description, legalIssues)
  NARRATIVE_EXACT: 50,
  NARRATIVE_WORD: 35,
  NARRATIVE_FUZZY: 20,
} as const;

/**
 * Data shape representing a minimal Client record for relevance scoring.
 */
export interface ClientMatchCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  clientNumber?: string | null;
  organizationName?: string | null;
  phone?: string | null;
}

/**
 * Data shape representing a minimal Court record for relevance scoring.
 */
export interface CourtMatchCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  district?: string | null;
}

/**
 * Calculates a relevance score for a Client document against the user's search query.
 */
export function calculateClientMatchScore(
  clientDoc: ClientMatchCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  const clientNum = (clientDoc.clientNumber || "").trim().toLowerCase();
  const name = (clientDoc.name || "").trim().toLowerCase();
  const org = (clientDoc.organizationName || "").trim().toLowerCase();
  const phone = (clientDoc.phone || "").trim().toLowerCase();

  // 1. Client number exact match
  if (clientNum === q) {
    return 100;
  }

  // 2. Name or organization exact match
  if (name === q || org === q) {
    return 80;
  }

  // 3. Client number prefix or partial
  if (clientNum && (clientNum.startsWith(q) || clientNum.includes(q))) {
    return clientNum.startsWith(q) ? 85 : 60;
  }

  // 4. Name phrase/prefix match
  if (name) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(name)) {
      return 60;
    }
    if (name.includes(q)) {
      return 45;
    }
    const sim = calculateStringSimilarity(q, name);
    if (sim >= 0.5) {
      return 30;
    }
  }

  // 5. Organization name match
  if (org) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(org)) {
      return 60;
    }
    if (org.includes(q)) {
      return 45;
    }
    const sim = calculateStringSimilarity(q, org);
    if (sim >= 0.5) {
      return 30;
    }
  }

  // 6. Phone match
  if (phone) {
    if (phone === q || phone.includes(q)) {
      return 45;
    }
  }

  return 0;
}

/**
 * Calculates a relevance score for a Court document against the user's search query.
 */
export function calculateCourtMatchScore(
  courtDoc: CourtMatchCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  const name = (courtDoc.name || "").trim().toLowerCase();
  const district = (courtDoc.district || "").trim().toLowerCase();

  // 1. Exact court name match
  if (name === q) {
    return 70;
  }

  // 2. Exact district match
  if (district === q) {
    return 60;
  }

  // 3. Name word boundary / prefix
  if (name) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(name)) {
      return 50;
    }
    if (name.includes(q)) {
      return 35;
    }
    const sim = calculateStringSimilarity(q, name);
    if (sim >= 0.5) {
      return 25;
    }
  }

  // 4. District partial
  if (district && district.includes(q)) {
    return 30;
  }

  return 0;
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Cases collection.
 */
export function buildCaseRelevanceStages(
  clientBuckets: ScoredEntityBuckets,
  courtBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns
): mongoose.PipelineStage[] {
  // 1. caseNumber scoring switch
  const caseNumberExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$caseNumber", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$caseNumber", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$caseNumber", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$caseNumber", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 2. internalReference scoring switch
  const internalRefExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$internalReference", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$internalReference", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$internalReference", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$internalReference", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 3. title scoring switch
  const titleExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: CASE_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. client match score switch
  const clientBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (clientBuckets.tier1Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier1Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1,
    });
  }
  if (clientBuckets.tier2Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier2Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2,
    });
  }
  if (clientBuckets.tier3Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier3Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3,
    });
  }
  if (clientBuckets.tier4Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier4Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4,
    });
  }
  if (clientBuckets.tier5Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier5Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5,
    });
  }
  const clientScoreExpr = clientBranches.length > 0 ? { $switch: { branches: clientBranches, default: 0 } } : 0;

  // 5. court match score switch
  const courtBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (courtBuckets.tier1Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier1Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.COURT_TIER_1,
    });
  }
  if (courtBuckets.tier2Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier2Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.COURT_TIER_2,
    });
  }
  if (courtBuckets.tier3Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier3Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.COURT_TIER_3,
    });
  }
  if (courtBuckets.tier4Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier4Ids] },
      then: CASE_SEARCH_RELEVANCE_SCORES.COURT_TIER_4,
    });
  }
  const courtScoreExpr = courtBranches.length > 0 ? { $switch: { branches: courtBranches, default: 0 } } : 0;

  // 6. Secondary fields: caseCategory, opposingCounsel, opposingParties
  const secondaryExpr = {
    $add: [
      {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$caseCategory", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_WORD,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$caseCategory", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_FUZZY,
            },
          ],
          default: 0,
        },
      },
      {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$opposingCounsel", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_WORD,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$opposingCounsel", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_FUZZY,
            },
          ],
          default: 0,
        },
      },
      {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: {
                  input: {
                    $ifNull: [
                      {
                        $reduce: {
                          input: { $ifNull: ["$opposingParties", []] },
                          initialValue: "",
                          in: { $concat: ["$$value", " ", { $ifNull: ["$$this", ""] }] },
                        },
                      },
                      "",
                    ],
                  },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_WORD,
            },
            {
              case: {
                $regexMatch: {
                  input: {
                    $ifNull: [
                      {
                        $reduce: {
                          input: { $ifNull: ["$opposingParties", []] },
                          initialValue: "",
                          in: { $concat: ["$$value", " ", { $ifNull: ["$$this", ""] }] },
                        },
                      },
                      "",
                    ],
                  },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.SECONDARY_FUZZY,
            },
          ],
          default: 0,
        },
      },
    ],
  };

  // 7. Narrative fields: description, legalIssues
  const narrativeExpr = {
    $add: [
      {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$description", ""] },
                  regex: patterns.exactPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_EXACT,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$description", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_WORD,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$description", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_FUZZY,
            },
          ],
          default: 0,
        },
      },
      {
        $switch: {
          branches: [
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$legalIssues", ""] },
                  regex: patterns.exactPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_EXACT,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$legalIssues", ""] },
                  regex: patterns.wordPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_WORD,
            },
            {
              case: {
                $regexMatch: {
                  input: { $ifNull: ["$legalIssues", ""] },
                  regex: patterns.fuzzyPattern,
                  options: "i",
                },
              },
              then: CASE_SEARCH_RELEVANCE_SCORES.NARRATIVE_FUZZY,
            },
          ],
          default: 0,
        },
      },
    ],
  };

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            caseNumberExpr,
            internalRefExpr,
            titleExpr,
            clientScoreExpr,
            courtScoreExpr,
            secondaryExpr,
            narrativeExpr,
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
