import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  FuzzySearchPatterns,
  ScoredEntityBuckets,
  bucketScoredEntityIds,
  buildFuzzySearchPatterns,
} from "./shared-fuzzy-search.helper";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskPriority,
  TaskStatus,
} from "@/const/task.const";

// Re-export shared utilities for convenience
export {
  bucketScoredEntityIds,
  buildFuzzySearchPatterns,
  calculateStringSimilarity,
  type FuzzySearchPatterns,
  type ScoredEntityBuckets,
};

/**
 * Score constants for Tasks relevance ranking.
 *
 * Calibrated according to the required hierarchy:
 * 1. Exact task-title match.
 * 2. Task title beginning with or closely matching the query.
 * 3. Strong fuzzy match against the task title.
 * 4. Exact or strong match against the task description.
 * 5. Strong match against related Case identifiers, title, or other descriptive fields.
 * 6. Strong match against related Client name, client number, organization, or contact fields.
 * 7. Weaker but still relevant fuzzy matches across supported fields.
 *
 * Multi-field matches receive cumulative score boosts.
 */
export const TASK_SEARCH_RELEVANCE_SCORES = {
  // Direct Task Title matches
  TITLE_EXACT: 120,
  TITLE_WORD: 95,
  TITLE_SUBSTRING: 70,
  TITLE_FUZZY: 45,

  // Direct Task Description matches
  DESCRIPTION_EXACT: 80,
  DESCRIPTION_WORD: 60,
  DESCRIPTION_SUBSTRING: 40,
  DESCRIPTION_FUZZY: 25,

  // Direct Task Priority & Status matches
  PRIORITY_EXACT: 60,
  PRIORITY_FUZZY: 35,
  STATUS_EXACT: 55,
  STATUS_FUZZY: 35,

  // Associated Case match tiers (bucketed scores applied in aggregation pipeline)
  CASE_TIER_1: 85, // Exact case number / internal reference / exact title
  CASE_TIER_2: 70, // Case prefix / word boundary match
  CASE_TIER_3: 50, // Case substring / category / counsel match
  CASE_TIER_4: 35, // Secondary case fields / fuzzy title or identifier
  CASE_TIER_5: 20, // Narrative case fields (description, legalIssues), weak fuzzy

  // Associated Client match tiers (bucketed scores applied in aggregation pipeline)
  CLIENT_TIER_1: 85, // Exact client number / exact name / exact organization
  CLIENT_TIER_2: 70, // Name/org word prefix / exact phone/email
  CLIENT_TIER_3: 50, // Substring on name / org / phone / email
  CLIENT_TIER_4: 35, // Secondary contact / alternatePhone
  CLIENT_TIER_5: 20, // Fuzzy client match

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

  // Client candidate evaluation weights (before bucketing into CLIENT_TIERs)
  CLIENT_IDENTIFIER_EXACT: 100,
  CLIENT_NAME_EXACT: 85,
  CLIENT_CONTACT_EXACT: 80,
  CLIENT_IDENTIFIER_WORD: 85,
  CLIENT_IDENTIFIER_SUBSTRING: 60,
  CLIENT_NAME_WORD: 70,
  CLIENT_CONTACT_WORD: 60,
  CLIENT_NAME_SUBSTRING: 50,
  CLIENT_CONTACT_SUBSTRING: 45,
  CLIENT_FUZZY: 35,
} as const;

/**
 * Data shape representing a minimal Case record for relevance scoring in Task search.
 */
export interface TaskCaseCandidate {
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
 * Data shape representing a minimal Client record for relevance scoring in Task search.
 */
export interface TaskClientCandidate {
  _id: mongoose.Types.ObjectId;
  name?: string | null;
  clientNumber?: string | null;
  organizationName?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
}

/**
 * Data shape representing a direct Task candidate for simulated scoring and verification.
 */
export interface DirectTaskCandidate {
  _id?: mongoose.Types.ObjectId | string;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
}

/**
 * Pre-computed matching status and priority enums with their respective match scores.
 */
export interface MatchedStatusPriority {
  matchedStatuses: Array<{ status: TaskStatus; score: number }>;
  matchedPriorities: Array<{ priority: TaskPriority; score: number }>;
}

const TASK_STATUS_DEFINITIONS: Array<{
  value: TaskStatus;
  label: string;
  variants: string[];
}> = [
  {
    value: TASK_STATUSES.TODO,
    label: "To Do",
    variants: ["todo", "to do", "to-do"],
  },
  {
    value: TASK_STATUSES.IN_PROGRESS,
    label: "In Progress",
    variants: ["in progress", "in-progress", "inprogress", "progress", "ongoing"],
  },
  {
    value: TASK_STATUSES.COMPLETED,
    label: "Completed",
    variants: ["completed", "complete", "done", "finished"],
  },
  {
    value: TASK_STATUSES.CANCELLED,
    label: "Cancelled",
    variants: ["cancelled", "canceled", "cancel", "dropped"],
  },
];

const TASK_PRIORITY_DEFINITIONS: Array<{
  value: TaskPriority;
  label: string;
  variants: string[];
}> = [
  {
    value: TASK_PRIORITIES.LOW,
    label: "Low",
    variants: ["low", "low priority"],
  },
  {
    value: TASK_PRIORITIES.NORMAL,
    label: "Normal",
    variants: ["normal", "medium", "standard"],
  },
  {
    value: TASK_PRIORITIES.HIGH,
    label: "High",
    variants: ["high", "high priority"],
  },
  {
    value: TASK_PRIORITIES.URGENT,
    label: "Urgent",
    variants: ["urgent", "urgnt", "urgency", "critical", "emergency", "immediate"],
  },
];

/**
 * Evaluates whether a search query matches any Task status or priority enum values or labels.
 * Only triggers on queries or tokens of at least 3 characters to prevent false positives.
 */
export function matchTaskStatusAndPriority(
  query: string
): MatchedStatusPriority {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) {
    return { matchedStatuses: [], matchedPriorities: [] };
  }

  const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
  const matchedStatuses: Array<{ status: TaskStatus; score: number }> = [];
  const matchedPriorities: Array<{ priority: TaskPriority; score: number }> = [];

  // 1. Evaluate Task Statuses
  for (const item of TASK_STATUS_DEFINITIONS) {
    let bestScore = 0;
    const variants = [item.value.toLowerCase(), item.label.toLowerCase(), ...item.variants];

    for (const v of variants) {
      if (v === q) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.STATUS_EXACT);
        break;
      }
      if (tokens.some((tok) => tok === v || v.startsWith(tok))) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.STATUS_EXACT);
        break;
      }
      if (v.startsWith(q) || q.startsWith(v)) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.STATUS_FUZZY);
      } else {
        const sim = calculateStringSimilarity(q, v);
        if (sim >= 0.7) {
          bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.STATUS_FUZZY);
        }
      }
    }

    if (bestScore > 0) {
      matchedStatuses.push({ status: item.value, score: bestScore });
    }
  }

  // 2. Evaluate Task Priorities
  for (const item of TASK_PRIORITY_DEFINITIONS) {
    let bestScore = 0;
    const variants = [item.value.toLowerCase(), item.label.toLowerCase(), ...item.variants];

    for (const v of variants) {
      if (v === q) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.PRIORITY_EXACT);
        break;
      }
      if (tokens.some((tok) => tok === v || v.startsWith(tok))) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.PRIORITY_EXACT);
        break;
      }
      if (v.startsWith(q) || q.startsWith(v)) {
        bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.PRIORITY_FUZZY);
      } else {
        const sim = calculateStringSimilarity(q, v);
        if (sim >= 0.7) {
          bestScore = Math.max(bestScore, TASK_SEARCH_RELEVANCE_SCORES.PRIORITY_FUZZY);
        }
      }
    }

    if (bestScore > 0) {
      matchedPriorities.push({ priority: item.value, score: bestScore });
    }
  }

  return { matchedStatuses, matchedPriorities };
}

/**
 * Calculates a match score for an associated Client record against the user search query.
 */
export function calculateTaskClientMatchScore(
  clientDoc: TaskClientCandidate,
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

  let score = 0;

  // 1. Exact matches
  if (clientNum === q) {
    return TASK_SEARCH_RELEVANCE_SCORES.CLIENT_IDENTIFIER_EXACT;
  }
  if (name === q) {
    return TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_EXACT;
  }
  if (org === q) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_EXACT);
  }
  if (phone === q || altPhone === q || email === q) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_CONTACT_EXACT);
  }

  // 2. Word boundary / prefix matches
  if (clientNum && (clientNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(clientNum))) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_IDENTIFIER_WORD);
  }
  if (name && (name.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(name))) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_WORD);
  }
  if (org && (org.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(org))) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_WORD);
  }
  if (
    (phone && phone.startsWith(q)) ||
    (altPhone && altPhone.startsWith(q)) ||
    (email && (email.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(email)))
  ) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_CONTACT_WORD);
  }

  // 3. Substring matches
  if (clientNum && clientNum.includes(q)) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_IDENTIFIER_SUBSTRING);
  }
  if (name && name.includes(q)) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_SUBSTRING);
  }
  if (org && org.includes(q)) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_SUBSTRING);
  }
  if ((phone && phone.includes(q)) || (altPhone && altPhone.includes(q)) || (email && email.includes(q))) {
    score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_CONTACT_SUBSTRING);
  }

  // 4. Typo tolerance & Token check for multi-word queries
  if (score === 0) {
    const simName = name ? calculateStringSimilarity(q, name) : 0;
    const simOrg = org ? calculateStringSimilarity(q, org) : 0;
    const simNum = clientNum ? calculateStringSimilarity(q, clientNum) : 0;

    if (Math.max(simName, simOrg, simNum) >= 0.5) {
      score = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_FUZZY;
    } else {
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length > 1) {
        for (const token of tokens) {
          if (token.length < 3) continue;
          if (name && (name.includes(token) || calculateStringSimilarity(token, name) >= 0.5)) {
            score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_SUBSTRING);
          }
          if (org && (org.includes(token) || calculateStringSimilarity(token, org) >= 0.5)) {
            score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_NAME_SUBSTRING);
          }
          if (clientNum && (clientNum.includes(token) || calculateStringSimilarity(token, clientNum) >= 0.5)) {
            score = Math.max(score, TASK_SEARCH_RELEVANCE_SCORES.CLIENT_IDENTIFIER_SUBSTRING);
          }
        }
      }
    }
  }

  return score;
}

/**
 * Calculates a match score for an associated Case record against the user query,
 * breaking down direct case score and associated client score separately.
 */
export function calculateTaskCaseMatchScore(
  caseDoc: TaskCaseCandidate,
  query: string,
  clientScores?: Map<string, number>
): { directScore: number; clientScore: number; totalScore: number } {
  const q = query.trim().toLowerCase();
  if (!q) return { directScore: 0, clientScore: 0, totalScore: 0 };

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

  let directScore = 0;

  // 1. Identifiers (caseNumber, internalReference)
  if (caseNum === q || internalRef === q) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_EXACT);
  } else if (
    (caseNum && (caseNum.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(caseNum))) ||
    (internalRef && (internalRef.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(internalRef)))
  ) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_WORD);
  } else if (
    (caseNum && caseNum.includes(q)) ||
    (internalRef && internalRef.includes(q))
  ) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
  } else {
    const numSim = Math.max(
      caseNum ? calculateStringSimilarity(q, caseNum) : 0,
      internalRef ? calculateStringSimilarity(q, internalRef) : 0
    );
    if (numSim >= 0.5) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_FUZZY);
    }
  }

  // 2. Case Title
  if (title === q) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_TITLE_EXACT);
  } else if (title && (title.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(title))) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_TITLE_WORD);
  } else if (title && title.includes(q)) {
    directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_TITLE_SUBSTRING);
  } else if (title) {
    const titleSim = calculateStringSimilarity(q, title);
    if (titleSim >= 0.5) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_TITLE_FUZZY);
    }
  }

  // 3. Secondary fields (category, counsel, parties)
  const secondaryText = `${category} ${counsel} ${parties}`.trim();
  if (secondaryText) {
    if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(secondaryText)) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD);
    } else if (calculateStringSimilarity(q, secondaryText) >= 0.5) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
    }
  }

  // 4. Narrative fields (description, legalIssues)
  const narrativeText = `${desc} ${legal}`.trim();
  if (narrativeText) {
    if (narrativeText.includes(q)) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_EXACT);
    } else if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(narrativeText)) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_WORD);
    } else if (calculateStringSimilarity(q, narrativeText) >= 0.5) {
      directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_NARRATIVE_FUZZY);
    }
  }

  // 5. Token-level check for multi-word queries
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    for (const token of tokens) {
      if (token.length < 3) continue;
      if (title && (title.includes(token) || calculateStringSimilarity(token, title) >= 0.5)) {
        directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_TITLE_SUBSTRING);
      }
      if (caseNum && (caseNum.includes(token) || calculateStringSimilarity(token, caseNum) >= 0.5)) {
        directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
      }
      if (internalRef && (internalRef.includes(token) || calculateStringSimilarity(token, internalRef) >= 0.5)) {
        directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_IDENTIFIER_SUBSTRING);
      }
      if (secondaryText && (secondaryText.includes(token) || calculateStringSimilarity(token, secondaryText) >= 0.5)) {
        directScore = Math.max(directScore, TASK_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY);
      }
    }
  }

  // 6. Associated Client match boost (inherited via case's clientId)
  let clientScore = 0;
  if (clientScores && caseDoc.clientId) {
    const cScore = clientScores.get(String(caseDoc.clientId));
    if (cScore && cScore > 0) {
      clientScore = cScore;
    }
  }

  const totalScore = Math.max(directScore, clientScore);
  return { directScore, clientScore, totalScore };
}

/**
 * Calculates a simulated direct relevance score for a Task against the search query.
 * Mirrors the exact direct field scoring expressions in buildTaskRelevanceStages.
 */
export function calculateDirectTaskMatchScore(
  taskDoc: DirectTaskCandidate,
  query: string,
  matchedStatuses?: Array<{ status: TaskStatus; score: number }>,
  matchedPriorities?: Array<{ priority: TaskPriority; score: number }>
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

  const titleScore = scoreField(
    taskDoc.title,
    TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
    TASK_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
    TASK_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
    TASK_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY
  );

  const descScore = scoreField(
    taskDoc.description,
    TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
    TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
    TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY
  );

  let statusScore = 0;
  if (matchedStatuses && taskDoc.status) {
    const match = matchedStatuses.find((s) => s.status === taskDoc.status);
    if (match) statusScore = match.score;
  }

  let priorityScore = 0;
  if (matchedPriorities && taskDoc.priority) {
    const match = matchedPriorities.find((p) => p.priority === taskDoc.priority);
    if (match) priorityScore = match.score;
  }

  return titleScore + descScore + statusScore + priorityScore;
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Task collection.
 */
export function buildTaskRelevanceStages(
  caseBuckets: ScoredEntityBuckets,
  clientBuckets: ScoredEntityBuckets,
  inheritedClientCaseBuckets: ScoredEntityBuckets,
  patterns: FuzzySearchPatterns,
  matchedStatuses: Array<{ status: TaskStatus; score: number }> = [],
  matchedPriorities: Array<{ priority: TaskPriority; score: number }> = []
): mongoose.PipelineStage[] {
  // 1. caseId direct scoring switch
  const caseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (caseBuckets.tier1Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier1Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_1,
    });
  }
  if (caseBuckets.tier2Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier2Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_2,
    });
  }
  if (caseBuckets.tier3Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier3Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_3,
    });
  }
  if (caseBuckets.tier4Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier4Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_4,
    });
  }
  if (caseBuckets.tier5Ids.length > 0) {
    caseBranches.push({
      case: { $in: ["$caseId", caseBuckets.tier5Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_5,
    });
  }

  const caseScoreExpr =
    caseBranches.length > 0
      ? { $switch: { branches: caseBranches, default: 0 } }
      : 0;

  // 2. clientId direct scoring switch
  const clientBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (clientBuckets.tier1Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier1Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1,
    });
  }
  if (clientBuckets.tier2Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier2Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2,
    });
  }
  if (clientBuckets.tier3Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier3Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3,
    });
  }
  if (clientBuckets.tier4Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier4Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4,
    });
  }
  if (clientBuckets.tier5Ids.length > 0) {
    clientBranches.push({
      case: { $in: ["$clientId", clientBuckets.tier5Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5,
    });
  }

  const clientScoreExpr =
    clientBranches.length > 0
      ? { $switch: { branches: clientBranches, default: 0 } }
      : 0;

  // 3. Inherited Client score via caseId (for tasks without direct clientId or when clientId is null)
  const inheritedCaseBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (inheritedClientCaseBuckets.tier1Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier1Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1,
    });
  }
  if (inheritedClientCaseBuckets.tier2Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier2Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2,
    });
  }
  if (inheritedClientCaseBuckets.tier3Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier3Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3,
    });
  }
  if (inheritedClientCaseBuckets.tier4Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier4Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4,
    });
  }
  if (inheritedClientCaseBuckets.tier5Ids.length > 0) {
    inheritedCaseBranches.push({
      case: { $in: ["$caseId", inheritedClientCaseBuckets.tier5Ids] },
      then: TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5,
    });
  }

  const inheritedClientCaseScoreExpr =
    inheritedCaseBranches.length > 0
      ? { $switch: { branches: inheritedCaseBranches, default: 0 } }
      : 0;

  // Use direct clientId score when available; fall back to inherited client score via caseId
  const effectiveClientScoreExpr = {
    $cond: [
      { $gt: [clientScoreExpr, 0] },
      clientScoreExpr,
      inheritedClientCaseScoreExpr,
    ],
  };

  // 4. Direct Task title scoring switch
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
          then: TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$title", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 5. Direct Task description scoring switch
  const descriptionExpr = {
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
          then: TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$description", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 6. Direct status scoring switch
  const statusBranches = matchedStatuses.map((s) => ({
    case: { $eq: ["$status", s.status] },
    then: s.score,
  }));
  const statusExpr =
    statusBranches.length > 0
      ? { $switch: { branches: statusBranches, default: 0 } }
      : 0;

  // 7. Direct priority scoring switch
  const priorityBranches = matchedPriorities.map((p) => ({
    case: { $eq: ["$priority", p.priority] },
    then: p.score,
  }));
  const priorityExpr =
    priorityBranches.length > 0
      ? { $switch: { branches: priorityBranches, default: 0 } }
      : 0;

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            titleExpr,
            descriptionExpr,
            statusExpr,
            priorityExpr,
            caseScoreExpr,
            effectiveClientScoreExpr,
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
