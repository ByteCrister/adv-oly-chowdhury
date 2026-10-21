import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  FuzzySearchPatterns,
  ScoredEntityBuckets,
} from "./shared-fuzzy-search.helper";
import {
  calculateClientMatchScore,
  ClientMatchCandidate,
} from "./case-fuzzy-search.helper";

// Re-export client match functions and types for consumers that search hearings via clients
export {
  calculateClientMatchScore,
  type ClientMatchCandidate,
};

/**
 * Score constants for Hearings relevance ranking.
 *
 * Calibrated according to the required hierarchy:
 * 1. Exact matches in important direct hearing fields (purpose, outcome).
 * 2. Exact phrase / word prefix matches in direct hearing fields.
 * 3. Strong partial or prefix matches in direct hearing fields.
 * 4. Close fuzzy matches in direct hearing fields.
 * 5. Strong matches in associated case identifiers and titles.
 * 6. Strong matches in associated client fields.
 * 7. Strong matches in associated court fields.
 * 8. Weaker fuzzy matches across related records.
 *
 * Multi-field matches receive cumulative score boosts.
 */
export const HEARING_SEARCH_RELEVANCE_SCORES = {
  // Direct Hearing fields (purpose, outcome, notes, hearingType, adjournmentReason)
  PURPOSE_EXACT: 110,
  PURPOSE_WORD: 85,
  PURPOSE_SUBSTRING: 60,
  PURPOSE_FUZZY: 40,

  OUTCOME_EXACT: 105,
  OUTCOME_WORD: 80,
  OUTCOME_SUBSTRING: 55,
  OUTCOME_FUZZY: 35,

  NOTES_EXACT: 90,
  NOTES_WORD: 70,
  NOTES_SUBSTRING: 45,
  NOTES_FUZZY: 25,

  HEARING_TYPE_EXACT: 80,
  HEARING_TYPE_WORD: 65,
  HEARING_TYPE_SUBSTRING: 40,
  HEARING_TYPE_FUZZY: 25,

  ADJOURNMENT_EXACT: 80,
  ADJOURNMENT_WORD: 60,
  ADJOURNMENT_SUBSTRING: 40,
  ADJOURNMENT_FUZZY: 25,

  // Associated Case match tiers (bucketed scores applied in hearing aggregation pipeline)
  CASE_TIER_1: 85, // Exact case identifier (caseNumber/internalRef), exact title, exact client number
  CASE_TIER_2: 70, // Case prefix, exact client name/org, court exact name
  CASE_TIER_3: 50, // Case substring, client prefix, court prefix
  CASE_TIER_4: 35, // Secondary case fields (category, counsel, parties), client substring
  CASE_TIER_5: 20, // Narrative case fields, fuzzy case/client/court match

  // Associated Court match tiers (bucketed scores applied for direct hearing.courtId)
  COURT_TIER_1: 70, // Exact court name
  COURT_TIER_2: 55, // Exact district, word prefix on court name
  COURT_TIER_3: 40, // Substring on name/district, judge title
  COURT_TIER_4: 25, // Room or hall, address match
  COURT_TIER_5: 15, // Fuzzy court match

  // Case candidate evaluation weights (before bucketing into CASE_TIERs)
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

  CASE_NARRATIVE_EXACT: 45,
  CASE_NARRATIVE_WORD: 35,
  CASE_NARRATIVE_FUZZY: 20,

  // Court candidate evaluation weights (before bucketing into COURT_TIERs)
  COURT_NAME_EXACT: 70,
  COURT_DISTRICT_EXACT: 60,
  COURT_NAME_WORD: 50,
  COURT_DISTRICT_WORD: 40,
  COURT_JUDGE_WORD: 45,
  COURT_ROOM_WORD: 35,
  COURT_NAME_SUBSTRING: 35,
  COURT_DISTRICT_SUBSTRING: 30,
  COURT_SECONDARY_SUBSTRING: 25,
  COURT_FUZZY: 20,
} as const;

/**
 * Data shape representing a minimal Court record for relevance scoring in Hearing search.
 */
export interface HearingCourtCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  courtType?: string | null;
  district?: string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
}

/**
 * Data shape representing a minimal Case record for relevance scoring in Hearing search.
 */
export interface HearingCaseCandidate {
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
  courtId?: mongoose.Types.ObjectId | null;
}

/**
 * Data shape representing a direct Hearing candidate for simulated scoring and verification.
 */
export interface DirectHearingCandidate {
  _id?: mongoose.Types.ObjectId | string;
  purpose?: string | null;
  outcome?: string | null;
  notes?: string | null;
  hearingType?: string | null;
  adjournmentReason?: string | null;
}

/**
 * Calculates a match score for an associated Court record against the user search query.
 */
export function calculateHearingCourtMatchScore(
  courtDoc: HearingCourtCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const name = (courtDoc.name || "").trim().toLowerCase();
  const district = (courtDoc.district || "").trim().toLowerCase();
  const room = (courtDoc.roomOrHall || "").trim().toLowerCase();
  const judge = (courtDoc.presidingJudgeTitle || "").trim().toLowerCase();
  const addr = (courtDoc.address || "").trim().toLowerCase();

  let score = 0;

  // 1. Exact matches
  if (name === q) {
    return HEARING_SEARCH_RELEVANCE_SCORES.COURT_NAME_EXACT;
  }
  if (district === q) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_DISTRICT_EXACT);
  }

  // 2. Word boundary / prefix matches
  if (name && (name.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(name))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_NAME_WORD);
  }
  if (judge && (judge.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(judge))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_JUDGE_WORD);
  }
  if (district && (district.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(district))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_DISTRICT_WORD);
  }
  if (room && (room.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(room))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_ROOM_WORD);
  }

  // 3. Substring matches
  if (name && name.includes(q)) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_NAME_SUBSTRING);
  }
  if (district && district.includes(q)) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_DISTRICT_SUBSTRING);
  }
  if ((room && room.includes(q)) || (judge && judge.includes(q)) || (addr && addr.includes(q))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_SECONDARY_SUBSTRING);
  }

  // 4. Typo tolerance & Multi-word token check
  if (score === 0) {
    const simName = name ? calculateStringSimilarity(q, name) : 0;
    const simDistrict = district ? calculateStringSimilarity(q, district) : 0;
    const simJudge = judge ? calculateStringSimilarity(q, judge) : 0;
    if (Math.max(simName, simDistrict, simJudge) >= 0.5) {
      score = HEARING_SEARCH_RELEVANCE_SCORES.COURT_FUZZY;
    } else {
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length > 1) {
        for (const token of tokens) {
          if (token.length < 3) continue;
          if (name && (name.includes(token) || calculateStringSimilarity(token, name) >= 0.5)) {
            score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_NAME_SUBSTRING);
          }
          if (district && (district.includes(token) || calculateStringSimilarity(token, district) >= 0.5)) {
            score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.COURT_DISTRICT_SUBSTRING);
          }
        }
      }
    }
  }

  return score;
}

/**
 * Calculates a relevance score for an associated Case against the user query,
 * incorporating direct case match, associated client match, and associated court match.
 */
export function calculateHearingCaseMatchScore(
  caseDoc: HearingCaseCandidate,
  query: string,
  clientScores?: Map<string, number>,
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
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_EXACT);
  } else if (
    (caseNum && (caseNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(caseNum))) ||
    (internalRef && (internalRef.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(internalRef)))
  ) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_WORD);
  } else if (
    (caseNum && caseNum.includes(q)) ||
    (internalRef && internalRef.includes(q))
  ) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
  } else {
    const numSim = Math.max(
      caseNum ? calculateStringSimilarity(q, caseNum) : 0,
      internalRef ? calculateStringSimilarity(q, internalRef) : 0
    );
    if (numSim >= 0.5) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_FUZZY);
    }
  }

  // 2. Title
  if (title === q) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_TITLE_EXACT);
  } else if (title && (title.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(title))) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_TITLE_WORD);
  } else if (title && title.includes(q)) {
    score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_TITLE_SUBSTRING);
  } else if (title) {
    const titleSim = calculateStringSimilarity(q, title);
    if (titleSim >= 0.5) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_TITLE_FUZZY);
    }
  }

  // 3. Secondary fields (category, counsel, parties)
  const secondaryText = `${category} ${counsel} ${parties}`.trim();
  if (secondaryText) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(secondaryText)) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD);
    } else if (calculateStringSimilarity(q, secondaryText) >= 0.5) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
    }
  }

  // 4. Narrative fields (description, legalIssues)
  const narrativeText = `${desc} ${legal}`.trim();
  if (narrativeText) {
    if (narrativeText.includes(q)) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_EXACT);
    } else if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(narrativeText)) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_WORD);
    } else if (calculateStringSimilarity(q, narrativeText) >= 0.5) {
      score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_FUZZY);
    }
  }

  // 5. Token-level check for multi-word queries
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    for (const token of tokens) {
      if (token.length < 3) continue;
      if (title && (title.includes(token) || calculateStringSimilarity(token, title) >= 0.5)) {
        score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_TITLE_SUBSTRING);
      }
      if (caseNum && (caseNum.includes(token) || calculateStringSimilarity(token, caseNum) >= 0.5)) {
        score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
      }
      if (internalRef && (internalRef.includes(token) || calculateStringSimilarity(token, internalRef) >= 0.5)) {
        score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
      }
      if (secondaryText && (secondaryText.includes(token) || calculateStringSimilarity(token, secondaryText) >= 0.5)) {
        score = Math.max(score, HEARING_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
      }
    }
  }

  // 6. Associated Client match boost
  if (clientScores && caseDoc.clientId) {
    const clientScore = clientScores.get(String(caseDoc.clientId));
    if (clientScore && clientScore > 0) {
      score = Math.max(score, clientScore);
    }
  }

  // 6. Associated Court match boost
  if (courtScores && caseDoc.courtId) {
    const courtScore = courtScores.get(String(caseDoc.courtId));
    if (courtScore && courtScore > 0) {
      score = Math.max(score, courtScore);
    }
  }

  return score;
}

/**
 * Calculates a simulated direct relevance score for a Hearing against the search query.
 * Mirrors the exact direct field scoring expressions in buildHearingRelevanceStages.
 */
export function calculateDirectHearingMatchScore(
  hearingDoc: DirectHearingCandidate,
  query: string
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const scoreField = (
    val: string | null | undefined,
    exact: number,
    word: number,
    sub: number,
    fuzzy: number
  ): number => {
    if (!val) return 0;
    const v = val.trim().toLowerCase();
    if (!v) return 0;
    if (v === q) return exact;
    if (v.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(v)) return word;
    if (v.includes(q)) return sub;
    if (calculateStringSimilarity(q, v) >= 0.5) return fuzzy;
    return 0;
  };

  const purposeScore = scoreField(
    hearingDoc.purpose,
    HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_EXACT,
    HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_WORD,
    HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_SUBSTRING,
    HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_FUZZY
  );

  const outcomeScore = scoreField(
    hearingDoc.outcome,
    HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_EXACT,
    HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_WORD,
    HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_SUBSTRING,
    HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_FUZZY
  );

  const notesScore = scoreField(
    hearingDoc.notes,
    HEARING_SEARCH_RELEVANCE_SCORES.NOTES_EXACT,
    HEARING_SEARCH_RELEVANCE_SCORES.NOTES_WORD,
    HEARING_SEARCH_RELEVANCE_SCORES.NOTES_SUBSTRING,
    HEARING_SEARCH_RELEVANCE_SCORES.NOTES_FUZZY
  );

  const typeScore = scoreField(
    hearingDoc.hearingType,
    HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_EXACT,
    HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_WORD,
    HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_SUBSTRING,
    HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_FUZZY
  );

  const adjournmentScore = scoreField(
    hearingDoc.adjournmentReason,
    HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_EXACT,
    HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_WORD,
    HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_SUBSTRING,
    HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_FUZZY
  );

  return purposeScore + outcomeScore + notesScore + typeScore + adjournmentScore;
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Hearing collection.
 */
export function buildHearingRelevanceStages(
  caseBuckets: ScoredEntityBuckets,
  courtBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns
): mongoose.PipelineStage[] {
  // 1. caseId scoring switch
  const caseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];

  if (caseBuckets.tier1Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier1Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_1,
    });
  }
  if (caseBuckets.tier2Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier2Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_2,
    });
  }
  if (caseBuckets.tier3Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier3Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_3,
    });
  }
  if (caseBuckets.tier4Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier4Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_4,
    });
  }
  if (caseBuckets.tier5Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier5Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_5,
    });
  }

  const caseScoreExpr =
    caseBranches.length > 0
      ? { $switch: { branches: caseBranches, default: 0 } }
      : 0;

  // 2. direct courtId scoring switch (if hearing has explicit courtId)
  const courtBranches: Array<{ case: Record<string, unknown>; then: number }> = [];

  if (courtBuckets.tier1Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier1Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_1,
    });
  }
  if (courtBuckets.tier2Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier2Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_2,
    });
  }
  if (courtBuckets.tier3Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier3Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_3,
    });
  }
  if (courtBuckets.tier4Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier4Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_4,
    });
  }
  if (courtBuckets.tier5Ids.length > 0) {
    courtBranches.push({
      case: { $in: ["$courtId", courtBuckets.tier5Ids] },
      then: HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_5,
    });
  }

  const courtScoreExpr =
    courtBranches.length > 0
      ? { $switch: { branches: courtBranches, default: 0 } }
      : 0;

  // 3. Direct purpose scoring switch
  const purposeExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$purpose", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$purpose", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$purpose", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$purpose", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. Direct outcome scoring switch
  const outcomeExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$outcome", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$outcome", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$outcome", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$outcome", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 5. Direct notes scoring switch
  const notesExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.NOTES_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.NOTES_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.NOTES_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$notes", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.NOTES_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 6. Direct hearingType scoring switch
  const hearingTypeExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$hearingType", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$hearingType", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$hearingType", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$hearingType", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 7. Direct adjournmentReason scoring switch
  const adjournmentExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$adjournmentReason", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$adjournmentReason", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$adjournmentReason", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$adjournmentReason", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_FUZZY,
        },
      ],
      default: 0,
    },
  };

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            purposeExpr,
            outcomeExpr,
            notesExpr,
            hearingTypeExpr,
            adjournmentExpr,
            caseScoreExpr,
            courtScoreExpr,
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
