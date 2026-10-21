import mongoose from "mongoose";
import { escapeRegex, sanitizeSearchParam } from "@/lib/helpers/search.helper";

/**
 * Score threshold constants for generic entity bucketing.
 */
export const GENERIC_ENTITY_SCORE_TIERS = {
  TIER_1: 85,
  TIER_2: 70,
  TIER_3: 50,
  TIER_4: 35,
} as const;

/**
 * Parsed regex patterns for typo-tolerant fuzzy searching and scoring.
 */
export interface FuzzySearchPatterns {
  sanitizedQuery: string;
  exactPattern: string;
  wordPattern: string;
  substringPattern: string;
  fuzzyPattern: string;
  isShortQuery: boolean;
  tokens: string[];
}

/**
 * Generic entity ID buckets grouped by match tier.
 */
export interface ScoredEntityBuckets {
  tier1Ids: mongoose.Types.ObjectId[];
  tier2Ids: mongoose.Types.ObjectId[];
  tier3Ids: mongoose.Types.ObjectId[];
  tier4Ids: mongoose.Types.ObjectId[];
  tier5Ids: mongoose.Types.ObjectId[];
  allMatchingIds: mongoose.Types.ObjectId[];
}

/**
 * Computes the Damerau-Levenshtein distance between two strings,
 * accounting for insertions, deletions, substitutions, and transpositions.
 */
export function damerauLevenshteinDistance(source: string, target: string): number {
  const s = source.toLowerCase();
  const t = target.toLowerCase();
  const n = s.length;
  const m = t.length;

  if (n === 0) return m;
  if (m === 0) return n;

  const d: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[n][m];
}

/**
 * Calculates a normalized similarity score (0.0 to 1.0) between query and target.
 */
export function calculateStringSimilarity(query: string, target: string | null | undefined): number {
  if (!target || !query) return 0;

  const q = query.trim().toLowerCase();
  const t = target.trim().toLowerCase();
  if (!q || !t) return 0;

  // Exact match
  if (q === t) return 1.0;

  // Exact phrase match within target
  if (t.includes(q)) {
    // Prefix of target or word boundary
    const isPrefix = t.startsWith(q) || new RegExp(`\\b${escapeRegex(q)}`, "i").test(t);
    return isPrefix ? 0.85 : 0.65;
  }

  // Token-level check
  const targetWords = t.split(/[\s,./\-_]+/);
  let bestWordScore = 0;

  for (const word of targetWords) {
    if (!word) continue;
    if (word === q) return 0.9;
    if (word.startsWith(q)) {
      bestWordScore = Math.max(bestWordScore, 0.75);
    }

    // Typo tolerance: only for words >= 3 chars
    if (q.length >= 3 && word.length >= 3) {
      const dist = damerauLevenshteinDistance(q, word);
      const maxLen = Math.max(q.length, word.length);
      if (dist === 1) {
        bestWordScore = Math.max(bestWordScore, 0.55);
      } else if (dist === 2 && maxLen >= 6) {
        bestWordScore = Math.max(bestWordScore, 0.4);
      }
    }
  }

  return bestWordScore;
}

/**
 * Generates an edit-distance-1 regex alternation pattern for a single word.
 * Generates deletion, insertion, substitution, and transposition variants.
 */
export function generateSingleWordFuzzyPattern(word: string): string {
  const w = word.trim();
  if (w.length < 3) {
    return escapeRegex(w);
  }

  const variations = new Set<string>();
  const n = w.length;

  // 1. Insertion in target (user omitted a character, e.g. "consulation" -> "consultation")
  for (let i = 0; i <= n; i++) {
    const before = escapeRegex(w.slice(0, i));
    const after = escapeRegex(w.slice(i));
    variations.add(`${before}[^\\s]${after}`);
  }

  // 2. Deletion in target (user added an extra character, e.g. "consulttation" -> "consultation")
  for (let i = 0; i < n; i++) {
    const dropped = escapeRegex(w.slice(0, i) + w.slice(i + 1));
    if (dropped.length >= 2) {
      variations.add(dropped);
    }
  }

  // 3. Substitution (user typed a wrong character, e.g. "consiltation" -> "consultation")
  for (let i = 0; i < n; i++) {
    const before = escapeRegex(w.slice(0, i));
    const after = escapeRegex(w.slice(i + 1));
    variations.add(`${before}[^\\s]${after}`);
  }

  // 4. Transposition (adjacent characters swapped, e.g. "cosnultation" -> "consultation")
  for (let i = 0; i < n - 1; i++) {
    const swapped = escapeRegex(
      w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)
    );
    variations.add(swapped);
  }

  // Always include exact word
  variations.add(escapeRegex(w));

  const sorted = Array.from(variations).sort((a, b) => b.length - a.length);
  return `(?:${sorted.join("|")})`;
}

/**
 * Builds safe, optimized fuzzy search patterns from a sanitized user query.
 *
 * Rules:
 * - Empty / whitespace-only inputs return null.
 * - Queries <= 2 characters only use exact substring/prefix matching (no fuzzy expansion).
 * - Queries >= 3 characters generate Damerau-Levenshtein typo-tolerant regexes.
 * - All regex metacharacters are escaped safely to prevent ReDoS.
 */
export function buildFuzzySearchPatterns(
  query: string | null | undefined
): FuzzySearchPatterns | null {
  const sanitized = sanitizeSearchParam(query, { maxLength: 80, collapseWhitespace: true });
  if (!sanitized) {
    return null;
  }

  const isShortQuery = sanitized.length <= 2;
  const escapedExact = escapeRegex(sanitized);

  const exactPattern = `\\b${escapedExact}\\b`;
  const wordPattern = `\\b${escapedExact}`;
  const substringPattern = escapedExact;

  if (isShortQuery) {
    return {
      sanitizedQuery: sanitized,
      exactPattern,
      wordPattern,
      substringPattern,
      fuzzyPattern: substringPattern,
      isShortQuery: true,
      tokens: [sanitized],
    };
  }

  // Split into whitespace-delimited tokens
  const rawTokens = sanitized.split(/\s+/).filter(Boolean);
  const tokens = rawTokens.length > 0 ? rawTokens : [sanitized];

  // Build fuzzy pattern for tokens
  let fuzzyPattern: string;
  if (tokens.length === 1) {
    fuzzyPattern = generateSingleWordFuzzyPattern(tokens[0]);
  } else {
    // Multi-word: match any of the fuzzy token variants
    const tokenPatterns = tokens.map(generateSingleWordFuzzyPattern);
    fuzzyPattern = `(?:${tokenPatterns.join("|")})`;
  }

  return {
    sanitizedQuery: sanitized,
    exactPattern,
    wordPattern,
    substringPattern,
    fuzzyPattern,
    isShortQuery: false,
    tokens,
  };
}

/**
 * Organizes scored client, court, or generic entity matches into discrete priority buckets.
 */
export function bucketScoredEntityIds(
  scoreMap: Map<string, number>
): ScoredEntityBuckets {
  const tier1Ids: mongoose.Types.ObjectId[] = [];
  const tier2Ids: mongoose.Types.ObjectId[] = [];
  const tier3Ids: mongoose.Types.ObjectId[] = [];
  const tier4Ids: mongoose.Types.ObjectId[] = [];
  const tier5Ids: mongoose.Types.ObjectId[] = [];
  const allMatchingIds: mongoose.Types.ObjectId[] = [];

  for (const [idStr, score] of scoreMap.entries()) {
    const objectId = new mongoose.Types.ObjectId(idStr);
    allMatchingIds.push(objectId);

    if (score >= GENERIC_ENTITY_SCORE_TIERS.TIER_1) {
      tier1Ids.push(objectId);
    } else if (score >= GENERIC_ENTITY_SCORE_TIERS.TIER_2) {
      tier2Ids.push(objectId);
    } else if (score >= GENERIC_ENTITY_SCORE_TIERS.TIER_3) {
      tier3Ids.push(objectId);
    } else if (score >= GENERIC_ENTITY_SCORE_TIERS.TIER_4) {
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
    allMatchingIds,
  };
}
