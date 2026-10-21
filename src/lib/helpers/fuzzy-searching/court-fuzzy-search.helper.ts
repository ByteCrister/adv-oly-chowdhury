import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  buildFuzzySearchPatterns,
  FuzzySearchPatterns,
} from "./shared-fuzzy-search.helper";
import {
  COURT_TYPES,
  COURT_TYPE_LABELS,
  CourtType,
} from "@/const/court.const";

// Re-export shared utilities for convenience
export {
  buildFuzzySearchPatterns,
  calculateStringSimilarity,
  type FuzzySearchPatterns,
};

/**
 * Score constants for Courts relevance ranking.
 *
 * Calibrated according to the required hierarchy:
 * 1. Exact court-name match. (120)
 * 2. Court name beginning with or closely matching the query. (95-100 word, 70 substring)
 * 3. Strong fuzzy match against the court name. (45)
 * 4. Exact or strong match against district or division. (75-80 exact, 60-65 word)
 * 5. Strong match against court type or room/hall. (65-70 exact, 50-55 word)
 * 6. Strong match against address or presiding judge title. (55-60 exact, 40-45 word)
 * 7. Other relevant matches in additional supported fields (e.g. active status). (30)
 *
 * Multi-field matches receive cumulative score boosts.
 */
export const COURT_SEARCH_RELEVANCE_SCORES = {
  // 1-3. Court Name matches (Primary court identity - highest priority)
  NAME_EXACT: 120,
  NAME_WORD: 95,
  NAME_SUBSTRING: 70,
  NAME_FUZZY: 45,

  // 4. District & Division matches
  DISTRICT_EXACT: 80,
  DISTRICT_WORD: 65,
  DISTRICT_SUBSTRING: 45,
  DISTRICT_FUZZY: 30,

  DIVISION_EXACT: 75,
  DIVISION_WORD: 60,
  DIVISION_SUBSTRING: 40,
  DIVISION_FUZZY: 25,

  // 5. Court Type & Room/Hall matches
  COURT_TYPE_EXACT: 70,
  COURT_TYPE_WORD: 55,
  COURT_TYPE_SUBSTRING: 40,
  COURT_TYPE_FUZZY: 25,

  ROOM_EXACT: 65,
  ROOM_WORD: 50,
  ROOM_SUBSTRING: 35,
  ROOM_FUZZY: 20,

  // 6. Presiding Judge Title & Address matches
  JUDGE_EXACT: 60,
  JUDGE_WORD: 45,
  JUDGE_SUBSTRING: 30,
  JUDGE_FUZZY: 20,

  ADDRESS_EXACT: 55,
  ADDRESS_WORD: 40,
  ADDRESS_SUBSTRING: 25,
  ADDRESS_FUZZY: 15,

  // 7. Active Status match
  STATUS_MATCH: 30,
} as const;


/**
 * Data shape representing a minimal Court record for relevance scoring and simulated testing.
 */
export interface DirectCourtCandidate {
  _id?: mongoose.Types.ObjectId | string;
  name?: string | null;
  courtType?: string | null;
  district?: string | null;
  division?: string | null;
  roomOrHall?: string | null;
  address?: string | null;
  presidingJudgeTitle?: string | null;
  isActive?: boolean | null;
}

/**
 * Metadata definition mapping each CourtType enum to its display label, acronyms, and variants.
 */
export interface CourtTypeDefinition {
  value: CourtType;
  label: string;
  acronyms: string[];
  variants: string[];
}

export const COURT_TYPE_DEFINITIONS: CourtTypeDefinition[] = [
  {
    value: COURT_TYPES.SUPREME_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.SUPREME_COURT],
    acronyms: ["sc"],
    variants: [
      "supreme court",
      "supreme court of bangladesh",
      "bangladesh supreme court",
      "supreme crt",
      "supreme crut",
    ],
  },
  {
    value: COURT_TYPES.APPELLATE_DIVISION,
    label: COURT_TYPE_LABELS[COURT_TYPES.APPELLATE_DIVISION],
    acronyms: ["ad"],
    variants: [
      "appellate division",
      "appellate",
      "apelate division",
      "appellate div",
    ],
  },
  {
    value: COURT_TYPES.HIGH_COURT_DIVISION,
    label: COURT_TYPE_LABELS[COURT_TYPES.HIGH_COURT_DIVISION],
    acronyms: ["hcd", "hc"],
    variants: [
      "high court division",
      "high court",
      "high court div",
      "hight court",
    ],
  },
  {
    value: COURT_TYPES.DISTRICT_JUDGE_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.DISTRICT_JUDGE_COURT],
    acronyms: ["djc", "dj"],
    variants: [
      "district judge court",
      "district judge",
      "district court",
      "dist judge court",
      "dist judge",
    ],
  },
  {
    value: COURT_TYPES.ADDITIONAL_DISTRICT_JUDGE,
    label: COURT_TYPE_LABELS[COURT_TYPES.ADDITIONAL_DISTRICT_JUDGE],
    acronyms: ["adj"],
    variants: [
      "additional district judge court",
      "additional district judge",
      "addl district judge",
      "additional dist judge",
    ],
  },
  {
    value: COURT_TYPES.JOINT_DISTRICT_JUDGE,
    label: COURT_TYPE_LABELS[COURT_TYPES.JOINT_DISTRICT_JUDGE],
    acronyms: ["jdj"],
    variants: [
      "joint district judge court",
      "joint district judge",
      "joint dist judge",
    ],
  },
  {
    value: COURT_TYPES.SENIOR_ASSISTANT_JUDGE,
    label: COURT_TYPE_LABELS[COURT_TYPES.SENIOR_ASSISTANT_JUDGE],
    acronyms: ["saj"],
    variants: [
      "senior assistant judge court",
      "senior assistant judge",
      "sr assistant judge",
    ],
  },
  {
    value: COURT_TYPES.ASSISTANT_JUDGE,
    label: COURT_TYPE_LABELS[COURT_TYPES.ASSISTANT_JUDGE],
    acronyms: ["aj"],
    variants: [
      "assistant judge court",
      "assistant judge",
      "asst judge",
    ],
  },
  {
    value: COURT_TYPES.SESSIONS_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.SESSIONS_COURT],
    acronyms: ["sjc"],
    variants: [
      "sessions judge court",
      "sessions court",
      "session court",
      "session judge",
    ],
  },
  {
    value: COURT_TYPES.METROPOLITAN_SESSIONS_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.METROPOLITAN_SESSIONS_COURT],
    acronyms: ["msjc", "msc"],
    variants: [
      "metropolitan sessions judge court",
      "metropolitan sessions court",
      "metro sessions court",
      "metropolitan session",
    ],
  },
  {
    value: COURT_TYPES.CHIEF_JUDICIAL_MAGISTRATE,
    label: COURT_TYPE_LABELS[COURT_TYPES.CHIEF_JUDICIAL_MAGISTRATE],
    acronyms: ["cjm"],
    variants: [
      "chief judicial magistrate court",
      "chief judicial magistrate",
      "cjm court",
    ],
  },
  {
    value: COURT_TYPES.CHIEF_METROPOLITAN_MAGISTRATE,
    label: COURT_TYPE_LABELS[COURT_TYPES.CHIEF_METROPOLITAN_MAGISTRATE],
    acronyms: ["cmm"],
    variants: [
      "chief metropolitan magistrate court",
      "chief metropolitan magistrate",
      "cmm court",
    ],
  },
  {
    value: COURT_TYPES.MAGISTRATE_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.MAGISTRATE_COURT],
    acronyms: ["jmc", "jm"],
    variants: [
      "judicial magistrate court",
      "judicial magistrate",
      "magistrate court",
    ],
  },
  {
    value: COURT_TYPES.TAXES_BAR_TRIBUNAL,
    label: COURT_TYPE_LABELS[COURT_TYPES.TAXES_BAR_TRIBUNAL],
    acronyms: ["tat"],
    variants: [
      "taxes appellate tribunal",
      "taxes bar tribunal",
      "tax tribunal",
      "taxes tribunal",
    ],
  },
  {
    value: COURT_TYPES.CUSTOMS_EXCISE_VAT_TRIBUNAL,
    label: COURT_TYPE_LABELS[COURT_TYPES.CUSTOMS_EXCISE_VAT_TRIBUNAL],
    acronyms: ["cevat"],
    variants: [
      "customs excise vat appellate tribunal",
      "customs excise & vat appellate tribunal",
      "customs excise and vat tribunal",
      "vat tribunal",
      "customs tribunal",
    ],
  },
  {
    value: COURT_TYPES.LABOUR_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.LABOUR_COURT],
    acronyms: ["lc"],
    variants: [
      "labour court",
      "labor court",
    ],
  },
  {
    value: COURT_TYPES.FAMILY_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.FAMILY_COURT],
    acronyms: ["fc"],
    variants: [
      "family court",
    ],
  },
  {
    value: COURT_TYPES.MONEY_LOAN_COURT,
    label: COURT_TYPE_LABELS[COURT_TYPES.MONEY_LOAN_COURT],
    acronyms: ["mlc", "ara"],
    variants: [
      "money loan court",
      "artha rin adalat",
      "artharin adalat",
      "artha rin",
      "money loan",
    ],
  },
  {
    value: COURT_TYPES.ADMINISTRATIVE_TRIBUNAL,
    label: COURT_TYPE_LABELS[COURT_TYPES.ADMINISTRATIVE_TRIBUNAL],
    acronyms: ["at"],
    variants: [
      "administrative tribunal",
      "admin tribunal",
    ],
  },
  {
    value: COURT_TYPES.SPECIAL_TRIBUNAL,
    label: COURT_TYPE_LABELS[COURT_TYPES.SPECIAL_TRIBUNAL],
    acronyms: ["st"],
    variants: [
      "special tribunal",
    ],
  },
  {
    value: COURT_TYPES.OTHER,
    label: COURT_TYPE_LABELS[COURT_TYPES.OTHER],
    acronyms: [],
    variants: [
      "other court",
      "other tribunal",
    ],
  },
];

/**
 * Matched courtType enum and its associated relevance score.
 */
export interface MatchedCourtType {
  courtType: CourtType;
  score: number;
}

/**
 * Matched metadata categories and active status resolved from the user search query.
 */
export interface MatchedCourtMetadata {
  matchedCourtTypes: MatchedCourtType[];
  matchedIsActive: boolean | null;
  isActiveScore: number;
}

/**
 * Evaluates whether a search query matches any Court type enum values, labels, acronyms,
 * or active status keywords.
 */
export function matchCourtTypeAndStatus(query: string): MatchedCourtMetadata {
  const q = query.trim().toLowerCase();
  if (!q) {
    return {
      matchedCourtTypes: [],
      matchedIsActive: null,
      isActiveScore: 0,
    };
  }

  const matchedCourtTypes: MatchedCourtType[] = [];
  const seenTypes = new Set<CourtType>();

  for (const def of COURT_TYPE_DEFINITIONS) {
    const valLower = def.value.toLowerCase();
    const labelLower = def.label.toLowerCase();
    let bestScore = 0;

    // 1. Exact match against enum value, human-readable label, acronym, or variant
    if (
      q === valLower ||
      q === labelLower ||
      def.acronyms.some((ac) => ac === q) ||
      def.variants.some((v) => v === q)
    ) {
      bestScore = COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_EXACT;
    }
    // 2. Word boundary / prefix match
    else if (
      labelLower.startsWith(q) ||
      new RegExp(`\\b${escapeRegex(q)}`, "i").test(labelLower) ||
      def.variants.some(
        (v) => v.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(v)
      )
    ) {
      bestScore = COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_WORD;
    }
    // 3. Substring match
    else if (
      labelLower.includes(q) ||
      def.variants.some((v) => v.includes(q))
    ) {
      bestScore = COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_SUBSTRING;
    }
    // 4. Fuzzy match (only if query length >= 3)
    else if (q.length >= 3) {
      const sim = calculateStringSimilarity(q, labelLower);
      if (sim >= 0.5) {
        bestScore = COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_FUZZY;
      } else {
        for (const v of def.variants) {
          if (calculateStringSimilarity(q, v) >= 0.5) {
            bestScore = COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_FUZZY;
            break;
          }
        }
      }
    }

    if (bestScore > 0 && !seenTypes.has(def.value)) {
      seenTypes.add(def.value);
      matchedCourtTypes.push({ courtType: def.value, score: bestScore });
    }
  }

  // Active status check: detect "active" or "inactive" keywords
  let matchedIsActive: boolean | null = null;
  let isActiveScore = 0;

  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.includes("inactive")) {
    matchedIsActive = false;
    isActiveScore = COURT_SEARCH_RELEVANCE_SCORES.STATUS_MATCH;
  } else if (tokens.includes("active")) {
    matchedIsActive = true;
    isActiveScore = COURT_SEARCH_RELEVANCE_SCORES.STATUS_MATCH;
  }

  return {
    matchedCourtTypes,
    matchedIsActive,
    isActiveScore,
  };
}

/**
 * Calculates a relevance score for a direct Court document against the user's search query.
 * Mirrors the exact scoring ladder used in the MongoDB aggregation pipeline.
 */
export function calculateDirectCourtMatchScore(
  courtDoc: DirectCourtCandidate,
  query: string,
  matchedCourtTypes?: MatchedCourtType[],
  matchedIsActive?: boolean | null,
  isActiveScore?: number
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

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

    // Exact word boundary match
    if (new RegExp(`\\b${escapeRegex(q)}\\b`, "i").test(v)) {
      return wordScore + (exactScore > wordScore ? 5 : 0);
    }

    // Word prefix match
    if (v.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(v)) {
      return wordScore;
    }

    // Substring match
    if (v.includes(q)) {
      return subScore;
    }

    // Fuzzy string similarity
    if (calculateStringSimilarity(q, v) >= 0.5) {
      return fuzzyScore;
    }

    // Multi-term token matching if query has multiple words
    const tokens = q.split(/\s+/).filter((t) => t.length >= 3);
    if (tokens.length > 1) {
      for (const t of tokens) {
        if (v.includes(t) || calculateStringSimilarity(t, v) >= 0.5) {
          return fuzzyScore;
        }
      }
    }

    return 0;
  };

  const nameScore = scoreTextField(
    courtDoc.name,
    COURT_SEARCH_RELEVANCE_SCORES.NAME_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.NAME_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.NAME_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY
  );

  const districtScore = scoreTextField(
    courtDoc.district,
    COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_FUZZY
  );

  const divisionScore = scoreTextField(
    courtDoc.division,
    COURT_SEARCH_RELEVANCE_SCORES.DIVISION_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.DIVISION_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.DIVISION_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.DIVISION_FUZZY
  );

  const roomScore = scoreTextField(
    courtDoc.roomOrHall,
    COURT_SEARCH_RELEVANCE_SCORES.ROOM_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.ROOM_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.ROOM_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.ROOM_FUZZY
  );

  const judgeScore = scoreTextField(
    courtDoc.presidingJudgeTitle,
    COURT_SEARCH_RELEVANCE_SCORES.JUDGE_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.JUDGE_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.JUDGE_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.JUDGE_FUZZY
  );

  const addressScore = scoreTextField(
    courtDoc.address,
    COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_EXACT,
    COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_WORD,
    COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_SUBSTRING,
    COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_FUZZY
  );

  // CourtType scoring
  let courtTypeScore = 0;
  if (matchedCourtTypes && courtDoc.courtType) {
    const match = matchedCourtTypes.find((m) => m.courtType === courtDoc.courtType);
    if (match) courtTypeScore = match.score;
  }
  if (courtTypeScore === 0 && courtDoc.courtType) {
    courtTypeScore = scoreTextField(
      courtDoc.courtType,
      COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_EXACT,
      COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_WORD,
      COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_SUBSTRING,
      COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_FUZZY
    );
  }

  // Active status scoring
  let statusScore = 0;
  if (matchedIsActive !== null && matchedIsActive !== undefined && courtDoc.isActive !== null && courtDoc.isActive !== undefined) {
    if (courtDoc.isActive === matchedIsActive) {
      statusScore = isActiveScore ?? COURT_SEARCH_RELEVANCE_SCORES.STATUS_MATCH;
    }
  }

  return (
    nameScore +
    districtScore +
    divisionScore +
    courtTypeScore +
    roomScore +
    judgeScore +
    addressScore +
    statusScore
  );
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Court collection.
 */
export function buildCourtRelevanceStages(
  patterns: FuzzySearchPatterns,
  matchedCourtTypes: MatchedCourtType[] = [],
  matchedIsActive: boolean | null = null,
  isActiveScore: number = 0
): mongoose.PipelineStage[] {
  const exactFullRegex = `^\\s*${escapeRegex(patterns.sanitizedQuery)}\\s*$`;

  // 1. Court Name scoring switch
  const nameExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.NAME_EXACT, // 120
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.NAME_WORD + 5, // 100
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.NAME_WORD, // 95
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.NAME_SUBSTRING, // 70
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$name", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY, // 45
        },
      ],
      default: 0,
    },
  };

  // 2. District scoring switch
  const districtExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$district", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_EXACT, // 80
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$district", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_WORD + 5, // 70
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$district", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_WORD, // 65
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$district", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_SUBSTRING, // 45
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$district", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_FUZZY, // 30
        },
      ],
      default: 0,
    },
  };

  // 3. Division scoring switch
  const divisionExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$division", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DIVISION_EXACT, // 75
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$division", ""] },
              regex: patterns.exactPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DIVISION_WORD + 5, // 65
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$division", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DIVISION_WORD, // 60
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$division", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DIVISION_SUBSTRING, // 40
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$division", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.DIVISION_FUZZY, // 25
        },
      ],
      default: 0,
    },
  };

  // 4. Court Type scoring switch
  const courtTypeBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  for (const m of matchedCourtTypes) {
    courtTypeBranches.push({
      case: { $eq: ["$courtType", m.courtType] },
      then: m.score,
    });
  }
  courtTypeBranches.push(
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$courtType", ""] },
          regex: exactFullRegex,
          options: "i",
        },
      },
      then: COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_EXACT, // 70
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$courtType", ""] },
          regex: patterns.exactPattern,
          options: "i",
        },
      },
      then: COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_WORD, // 55
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$courtType", ""] },
          regex: patterns.wordPattern,
          options: "i",
        },
      },
      then: COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_WORD, // 55
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$courtType", ""] },
          regex: patterns.substringPattern,
          options: "i",
        },
      },
      then: COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_SUBSTRING, // 40
    },
    {
      case: {
        $regexMatch: {
          input: { $ifNull: ["$courtType", ""] },
          regex: patterns.fuzzyPattern,
          options: "i",
        },
      },
      then: COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_FUZZY, // 25
    }
  );

  const courtTypeExpr = {
    $switch: {
      branches: courtTypeBranches,
      default: 0,
    },
  };

  // 5. Room or Hall scoring switch
  const roomExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$roomOrHall", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ROOM_EXACT, // 65
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$roomOrHall", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ROOM_WORD, // 50
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$roomOrHall", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ROOM_SUBSTRING, // 35
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$roomOrHall", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ROOM_FUZZY, // 20
        },
      ],
      default: 0,
    },
  };

  // 6. Presiding Judge Title scoring switch
  const judgeExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$presidingJudgeTitle", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.JUDGE_EXACT, // 60
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$presidingJudgeTitle", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.JUDGE_WORD, // 45
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$presidingJudgeTitle", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.JUDGE_SUBSTRING, // 30
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$presidingJudgeTitle", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.JUDGE_FUZZY, // 20
        },
      ],
      default: 0,
    },
  };

  // 7. Address scoring switch
  const addressExpr = {
    $switch: {
      branches: [
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$address", ""] },
              regex: exactFullRegex,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_EXACT, // 55
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$address", ""] },
              regex: patterns.wordPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_WORD, // 40
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$address", ""] },
              regex: patterns.substringPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_SUBSTRING, // 25
        },
        {
          case: {
            $regexMatch: {
              input: { $ifNull: ["$address", ""] },
              regex: patterns.fuzzyPattern,
              options: "i",
            },
          },
          then: COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_FUZZY, // 15
        },
      ],
      default: 0,
    },
  };

  // 8. Active status score
  const statusExpr =
    matchedIsActive !== null
      ? { $cond: [{ $eq: ["$isActive", matchedIsActive] }, isActiveScore, 0] }
      : 0;

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            nameExpr,
            districtExpr,
            divisionExpr,
            courtTypeExpr,
            roomExpr,
            judgeExpr,
            addressExpr,
            statusExpr,
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
