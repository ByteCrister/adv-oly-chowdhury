import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  FuzzySearchPatterns,
} from "./shared-fuzzy-search.helper";
import {
  calculateClientMatchScore,
  ClientMatchCandidate,
} from "./case-fuzzy-search.helper";

// Re-export client match functions and types for consumers that search case expenses via clients
export {
  calculateClientMatchScore,
  type ClientMatchCandidate,
};

/**
 * Score constants for Case Expense relevance ranking.
 *
 * Calibrated so that:
 * 1. Exact matches rank above fuzzy/typo matches.
 * 2. Strong legal identifiers (case numbers, client numbers, internal references) rank highest.
 * 3. Specific titles/names rank above general expense descriptions.
 * 4. Multi-field matches receive cumulative score boosts.
 */
export const CASE_EXPENSE_RELEVANCE_SCORES = {
  // Case & Client match tiers
  CASE_EXACT_IDENTIFIER: 100, // Exact caseNumber, internalReference, clientNumber
  CASE_EXACT_TITLE_NAME: 80,  // Exact title, client name, organizationName
  CASE_PREFIX_MATCH: 60,      // Word prefix match on case title or client name
  CASE_SUBSTRING_MATCH: 45,   // Substring match on case title or client name
  CASE_FUZZY_MATCH: 30,       // Typo / edit-distance match on case or client

  // CaseExpense description match tiers
  DESCRIPTION_EXACT: 70,      // Exact phrase match in expense description
  DESCRIPTION_WORD: 50,       // Word boundary / prefix match in expense description
  DESCRIPTION_SUBSTRING: 35,  // Substring match in expense description
  DESCRIPTION_FUZZY: 20,      // Typo / edit-distance match in expense description
} as const;

/**
 * Backwards-compatible export alias for tests and existing consumers.
 */
export const RELEVANCE_SCORES = CASE_EXPENSE_RELEVANCE_SCORES;

/**
 * Data shape representing a minimal Case record for relevance scoring in Case Expense search.
 */
export interface CaseMatchCandidate {
  _id: mongoose.Types.ObjectId;
  title?: string | null;
  caseNumber?: string | null;
  internalReference?: string | null;
  clientId?: mongoose.Types.ObjectId | null;
}

/**
 * Categorized case ID buckets grouped by match tier for Case Expense aggregation.
 */
export interface ScoredCaseBuckets {
  tier1Ids: mongoose.Types.ObjectId[]; // Exact Identifier (100)
  tier2Ids: mongoose.Types.ObjectId[]; // Exact Title/Name (80)
  tier3Ids: mongoose.Types.ObjectId[]; // Prefix / Word match (60)
  tier4Ids: mongoose.Types.ObjectId[]; // Substring match (45)
  tier5Ids: mongoose.Types.ObjectId[]; // Fuzzy / Typo match (30)
  allMatchingCaseIds: mongoose.Types.ObjectId[];
}

/**
 * Calculates a relevance score for a Case document against the user's search query.
 */
export function calculateCaseMatchScore(
  caseDoc: CaseMatchCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  const caseNum = (caseDoc.caseNumber || "").trim().toLowerCase();
  const internalRef = (caseDoc.internalReference || "").trim().toLowerCase();
  const title = (caseDoc.title || "").trim().toLowerCase();

  // 1. Strong identifier exact match
  if (caseNum === q || internalRef === q) {
    return CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER;
  }

  // 2. Title exact match
  if (title === q) {
    return CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME;
  }

  // 3. Identifier prefix or partial match
  if (caseNum && (caseNum.startsWith(q) || caseNum.includes(q))) {
    return caseNum.startsWith(q)
      ? CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER - 15
      : CASE_EXPENSE_RELEVANCE_SCORES.CASE_PREFIX_MATCH;
  }
  if (internalRef && (internalRef.startsWith(q) || internalRef.includes(q))) {
    return internalRef.startsWith(q)
      ? CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER - 15
      : CASE_EXPENSE_RELEVANCE_SCORES.CASE_PREFIX_MATCH;
  }

  // 4. Title phrase/prefix match
  if (title) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(title)) {
      return CASE_EXPENSE_RELEVANCE_SCORES.CASE_PREFIX_MATCH;
    }
    if (title.includes(q)) {
      return CASE_EXPENSE_RELEVANCE_SCORES.CASE_SUBSTRING_MATCH;
    }

    // Fuzzy check on title words
    const sim = calculateStringSimilarity(q, title);
    if (sim >= 0.5) {
      return CASE_EXPENSE_RELEVANCE_SCORES.CASE_FUZZY_MATCH;
    }
  }

  return 0;
}

/**
 * Organizes scored case matches into discrete priority buckets.
 */
export function bucketScoredCaseIds(
  caseScoreMap: Map<string, number>
): ScoredCaseBuckets {
  const tier1Ids: mongoose.Types.ObjectId[] = [];
  const tier2Ids: mongoose.Types.ObjectId[] = [];
  const tier3Ids: mongoose.Types.ObjectId[] = [];
  const tier4Ids: mongoose.Types.ObjectId[] = [];
  const tier5Ids: mongoose.Types.ObjectId[] = [];
  const allIds: mongoose.Types.ObjectId[] = [];

  for (const [idStr, score] of caseScoreMap.entries()) {
    const objectId = new mongoose.Types.ObjectId(idStr);
    allIds.push(objectId);

    if (score >= CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER - 10) {
      tier1Ids.push(objectId);
    } else if (score >= CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME) {
      tier2Ids.push(objectId);
    } else if (score >= CASE_EXPENSE_RELEVANCE_SCORES.CASE_PREFIX_MATCH) {
      tier3Ids.push(objectId);
    } else if (score >= CASE_EXPENSE_RELEVANCE_SCORES.CASE_SUBSTRING_MATCH) {
      tier4Ids.push(objectId);
    } else {
      tier5Ids.push(objectId);
    }
  }

  return {
    tier1Ids,
    tier2Ids,
    tier3Ids,
    tier4Ids,
    tier5Ids,
    allMatchingCaseIds: allIds,
  };
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the CaseExpense collection.
 */
export function buildCaseExpenseRelevanceStages(
  buckets: ScoredCaseBuckets,
  patterns: FuzzySearchPatterns
): mongoose.PipelineStage[] {
  const caseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];

  if (buckets.tier1Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", buckets.tier1Ids] },
      then: CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER,
    });
  }
  if (buckets.tier2Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", buckets.tier2Ids] },
      then: CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME,
    });
  }
  if (buckets.tier3Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", buckets.tier3Ids] },
      then: CASE_EXPENSE_RELEVANCE_SCORES.CASE_PREFIX_MATCH,
    });
  }
  if (buckets.tier4Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", buckets.tier4Ids] },
      then: CASE_EXPENSE_RELEVANCE_SCORES.CASE_SUBSTRING_MATCH,
    });
  }
  if (buckets.tier5Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", buckets.tier5Ids] },
      then: CASE_EXPENSE_RELEVANCE_SCORES.CASE_FUZZY_MATCH,
    });
  }

  const caseScoreExpr =
    caseBranches.length > 0
      ? { $switch: { branches: caseBranches, default: 0 } }
      : 0;

  const descriptionScoreBranches = [
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$description", ""] },
          regex: patterns.exactPattern,
          options: "i",
        },
      },
      then: CASE_EXPENSE_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$description", ""] },
          regex: patterns.wordPattern,
          options: "i",
        },
      },
      then: CASE_EXPENSE_RELEVANCE_SCORES.DESCRIPTION_WORD,
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$description", ""] },
          regex: patterns.substringPattern,
          options: "i",
        },
      },
      then: CASE_EXPENSE_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$description", ""] },
          regex: patterns.fuzzyPattern,
          options: "i",
        },
      },
      then: CASE_EXPENSE_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
    },
  ];

  const descriptionScoreExpr = {
    $switch: {
      branches: descriptionScoreBranches,
      default: 0,
    },
  };

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [caseScoreExpr, descriptionScoreExpr],
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
