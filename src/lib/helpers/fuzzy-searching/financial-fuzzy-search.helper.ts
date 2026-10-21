import mongoose from "mongoose";
import { escapeRegex } from "@/lib/helpers/search.helper";
import {
  calculateStringSimilarity,
  buildFuzzySearchPatterns,
  FuzzySearchPatterns,
} from "./shared-fuzzy-search.helper";
import { FINANCIAL_RECORD_TYPES } from "@/const/financial.const";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LIST,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LIST,
  PAYMENT_TYPE_LABELS,
  PaymentMethod,
  PaymentType,
} from "@/const/client-payment.const";
import {
  CASE_EXPENSE_CATEGORIES,
  CASE_EXPENSE_CATEGORY_LIST,
  CASE_EXPENSE_CATEGORY_LABELS,
  CaseExpenseCategory,
} from "@/const/case-expense.const";

// Re-export shared utilities for convenience
export {
  buildFuzzySearchPatterns,
  calculateStringSimilarity,
  type FuzzySearchPatterns,
};

/**
 * Calibrated relevance score constants for the Unified Financial Ledger.
 *
 * Ranking priorities:
 * 1. Exact transaction reference number or money receipt number. (110)
 * 2. Exact Case number or Client number. (100)
 * 3. Exact or very strong Client name or Case title match. (85)
 * 4. Strong match against transaction description or expense description. (70)
 * 5. Strong matches against payment method, payment type, expense category, or contact fields. (60-65)
 * 6. Weaker but still relevant fuzzy matches across supported fields. (20-40)
 *
 * Multi-field matches receive cumulative score boosts.
 */
export const FINANCIAL_SEARCH_RELEVANCE_SCORES = {
  // 1. Transaction reference & receipt numbers (Direct payment identifiers)
  TRANSACTION_REF_EXACT: 110,
  TRANSACTION_REF_WORD: 85,
  TRANSACTION_REF_SUBSTRING: 60,
  TRANSACTION_REF_FUZZY: 40,

  // 2. Case & Client identifiers (caseNumber, internalReference, clientNumber)
  CASE_CLIENT_ID_EXACT: 100,
  CASE_CLIENT_ID_WORD: 85,
  CASE_CLIENT_ID_SUBSTRING: 60,
  CASE_CLIENT_ID_FUZZY: 40,

  // 3. Primary titles and names (caseTitle, clientName, organizationName)
  TITLE_NAME_EXACT: 85,
  TITLE_NAME_WORD: 70,
  TITLE_NAME_SUBSTRING: 50,
  TITLE_NAME_FUZZY: 35,

  // 4. Transaction narrative description (payment notes, expense description)
  DESCRIPTION_EXACT: 70,
  DESCRIPTION_WORD: 50,
  DESCRIPTION_SUBSTRING: 35,
  DESCRIPTION_FUZZY: 20,

  // 5. Client contact fields (phone, alternatePhone, email)
  CONTACT_EXACT: 65,
  CONTACT_WORD: 50,
  CONTACT_SUBSTRING: 35,
  CONTACT_FUZZY: 20,

  // 6. Payment method, payment type, expense category (metadata & labels)
  METADATA_EXACT: 60,
  METADATA_WORD: 45,
  METADATA_FUZZY: 25,

  // 7. Secondary Case fields (category, counsel, narrative)
  CASE_SECONDARY_WORD: 45,
  CASE_SECONDARY_SUBSTRING: 35,
  CASE_SECONDARY_FUZZY: 20,

  // 8. Record type match (payment vs expense keywords)
  RECORD_TYPE_MATCH: 40,
} as const;

/**
 * Matched metadata categories and scores resolved from the user's search query.
 */
export interface MatchedFinancialMetadata {
  matchedRecordTypes: {
    paymentScore: number;
    expenseScore: number;
  };
  matchedPaymentMethods: Array<{ method: PaymentMethod; score: number }>;
  matchedPaymentTypes: Array<{ type: PaymentType; score: number }>;
  matchedExpenseCategories: Array<{ category: CaseExpenseCategory; score: number }>;
}

/**
 * Evaluates whether a search query matches financial record types (payment / income vs expense / expenditure).
 */
export function matchFinancialRecordTypes(query: string): {
  paymentScore: number;
  expenseScore: number;
} {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) {
    return { paymentScore: 0, expenseScore: 0 };
  }

  const paymentKeywords = [
    "payment",
    "payments",
    "income",
    "credit",
    "receipt",
    "receipts",
    "received",
    "collection",
  ];
  const expenseKeywords = [
    "expense",
    "expenses",
    "expenditure",
    "expenditures",
    "cost",
    "costs",
    "disbursement",
    "disbursements",
    "payout",
    "payouts",
  ];

  let paymentScore = 0;
  let expenseScore = 0;

  for (const kw of paymentKeywords) {
    if (kw === q || q.includes(kw)) {
      paymentScore = FINANCIAL_SEARCH_RELEVANCE_SCORES.RECORD_TYPE_MATCH;
      break;
    }
    const sim = calculateStringSimilarity(q, kw);
    if (sim >= 0.7) {
      paymentScore = Math.max(paymentScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.RECORD_TYPE_MATCH - 10);
    }
  }

  for (const kw of expenseKeywords) {
    if (kw === q || q.includes(kw)) {
      expenseScore = FINANCIAL_SEARCH_RELEVANCE_SCORES.RECORD_TYPE_MATCH;
      break;
    }
    const sim = calculateStringSimilarity(q, kw);
    if (sim >= 0.7) {
      expenseScore = Math.max(expenseScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.RECORD_TYPE_MATCH - 10);
    }
  }

  return { paymentScore, expenseScore };
}

/**
 * Evaluates whether a search query matches any payment method enum values or displayed labels.
 */
export function matchPaymentMethods(
  query: string
): Array<{ method: PaymentMethod; score: number }> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) {
    return [];
  }

  const results: Array<{ method: PaymentMethod; score: number }> = [];

  const methodKeywordMap: Record<PaymentMethod, string[]> = {
    [PAYMENT_METHODS.CASH]: ["cash"],
    [PAYMENT_METHODS.BANK_TRANSFER]: ["bank transfer", "bank", "transfer", "beftn", "rtgs"],
    [PAYMENT_METHODS.CHEQUE]: ["cheque", "check", "bank cheque"],
    [PAYMENT_METHODS.BKASH]: ["bkash", "b-kash"],
    [PAYMENT_METHODS.NAGAD]: ["nagad"],
    [PAYMENT_METHODS.ROCKET]: ["rocket"],
    [PAYMENT_METHODS.ONLINE_GATEWAY]: ["online gateway", "gateway", "online"],
    [PAYMENT_METHODS.OTHER]: ["other payment"],
  };

  for (const method of PAYMENT_METHOD_LIST) {
    const enumVal = method.toLowerCase();
    const label = (PAYMENT_METHOD_LABELS[method] || "").toLowerCase();
    const extraKeywords = methodKeywordMap[method] || [];
    const allVariants = [enumVal, label, ...extraKeywords];

    let bestScore = 0;
    for (const v of allVariants) {
      if (v === q) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT);
        break;
      }
      if (v.includes(q) || q.includes(v)) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD);
      } else {
        const sim = calculateStringSimilarity(q, v);
        if (sim >= 0.7) {
          bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_FUZZY);
        }
      }
    }

    if (bestScore > 0) {
      results.push({ method, score: bestScore });
    }
  }

  return results;
}

/**
 * Evaluates whether a search query matches any payment type enum values or displayed labels.
 */
export function matchPaymentTypes(
  query: string
): Array<{ type: PaymentType; score: number }> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) {
    return [];
  }

  const results: Array<{ type: PaymentType; score: number }> = [];

  const typeKeywordMap: Record<PaymentType, string[]> = {
    [PAYMENT_TYPES.RETAINER_FEE]: ["retainer fee", "retainer"],
    [PAYMENT_TYPES.CONSULTATION_FEE]: ["consultation fee", "consultation"],
    [PAYMENT_TYPES.CASE_PROFESSIONAL_FEE]: ["case professional fee", "professional fee", "professional"],
    [PAYMENT_TYPES.HEARING_APPEARANCE_FEE]: ["hearing appearance fee", "appearance fee", "appearance"],
    [PAYMENT_TYPES.EXPENSE_REIMBURSEMENT]: ["expense reimbursement", "reimbursement"],
    [PAYMENT_TYPES.FINAL_SETTLEMENT]: ["final settlement", "settlement"],
    [PAYMENT_TYPES.OTHER]: ["other fee"],
  };

  for (const pType of PAYMENT_TYPE_LIST) {
    const enumVal = pType.toLowerCase();
    const label = (PAYMENT_TYPE_LABELS[pType] || "").toLowerCase();
    const extraKeywords = typeKeywordMap[pType] || [];
    const allVariants = [enumVal, label, ...extraKeywords];

    let bestScore = 0;
    for (const v of allVariants) {
      if (v === q) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT);
        break;
      }
      if (v.includes(q) || q.includes(v)) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD);
      } else {
        const sim = calculateStringSimilarity(q, v);
        if (sim >= 0.7) {
          bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_FUZZY);
        }
      }
    }

    if (bestScore > 0) {
      results.push({ type: pType, score: bestScore });
    }
  }

  return results;
}

/**
 * Evaluates whether a search query matches any case expense category enum values or displayed labels.
 */
export function matchExpenseCategories(
  query: string
): Array<{ category: CaseExpenseCategory; score: number }> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 3) {
    return [];
  }

  const results: Array<{ category: CaseExpenseCategory; score: number }> = [];

  const categoryKeywordMap: Record<CaseExpenseCategory, string[]> = {
    [CASE_EXPENSE_CATEGORIES.COURT_FEES]: ["court fees", "court fee"],
    [CASE_EXPENSE_CATEGORIES.STAMP_DUTY]: ["stamp duty", "stamp"],
    [CASE_EXPENSE_CATEGORIES.PROCESS_FEE_TALBANA]: ["process fee", "talbana", "process fee (talbana)"],
    [CASE_EXPENSE_CATEGORIES.CERTIFIED_COPY_FEE]: ["certified copy fee", "certified copy"],
    [CASE_EXPENSE_CATEGORIES.ADVOCATE_CLERK_EXPENSE]: ["advocate clerk expense", "clerk expense", "clerk"],
    [CASE_EXPENSE_CATEGORIES.PHOTOCOPY_AND_PRINTING]: ["photocopy & printing", "photocopy", "printing", "photocopy and printing"],
    [CASE_EXPENSE_CATEGORIES.NOTARY_AFFIDAVIT]: ["notary & affidavit", "notary", "affidavit", "notary and affidavit"],
    [CASE_EXPENSE_CATEGORIES.LOCAL_CONVEYANCE_TRAVEL]: ["local conveyance & travel", "conveyance", "travel", "conveyance and travel"],
    [CASE_EXPENSE_CATEGORIES.EXPERT_WITNESS_FEE]: ["expert witness fee", "witness fee", "expert witness"],
    [CASE_EXPENSE_CATEGORIES.TAX_GOVT_CHALLAN]: ["tax / govt challan", "tax challan", "govt challan", "challan"],
    [CASE_EXPENSE_CATEGORIES.POSTAGE_COURIER]: ["postage & courier", "postage", "courier", "postage and courier"],
    [CASE_EXPENSE_CATEGORIES.OTHER]: ["other chamber expense", "chamber expense"],
  };

  for (const cat of CASE_EXPENSE_CATEGORY_LIST) {
    const enumVal = cat.toLowerCase();
    const label = (CASE_EXPENSE_CATEGORY_LABELS[cat] || "").toLowerCase();
    const extraKeywords = categoryKeywordMap[cat] || [];
    const allVariants = [enumVal, label, ...extraKeywords];

    let bestScore = 0;
    for (const v of allVariants) {
      if (v === q) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT);
        break;
      }
      if (v.includes(q) || q.includes(v)) {
        bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD);
      } else {
        const sim = calculateStringSimilarity(q, v);
        if (sim >= 0.7) {
          bestScore = Math.max(bestScore, FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_FUZZY);
        }
      }
    }

    if (bestScore > 0) {
      results.push({ category: cat, score: bestScore });
    }
  }

  return results;
}

/**
 * Combines query evaluation across financial record types, payment methods, payment types,
 * and expense categories into a unified metadata match object.
 */
export function matchFinancialMetadata(query: string): MatchedFinancialMetadata {
  return {
    matchedRecordTypes: matchFinancialRecordTypes(query),
    matchedPaymentMethods: matchPaymentMethods(query),
    matchedPaymentTypes: matchPaymentTypes(query),
    matchedExpenseCategories: matchExpenseCategories(query),
  };
}

/**
 * Builds the MongoDB aggregation pipeline stages to calculate dynamic relevance score
 * and filter records with positive relevance for the Unified Financial Ledger.
 *
 * Scored fields include:
 * - Transaction reference and money receipt numbers (Direct)
 * - Related Case numbers, internal references, titles, and narrative
 * - Related Client numbers, names, organization names, and contact fields
 * - Transaction description (payment notes / expense description)
 * - Stored and displayed payment methods, payment types, and expense categories
 * - Financial record type keywords (payment, income, expense, etc.)
 */
export function buildFinancialRelevanceStages(
  patterns: FuzzySearchPatterns,
  metadataMatches: MatchedFinancialMetadata
): mongoose.PipelineStage[] {
  // Support multi-word token matching across individual fields
  const tokens = patterns.tokens || [patterns.sanitizedQuery];
  const tokenWordPattern =
    tokens.length > 1
      ? `(?:${tokens.map((t) => `\\b${escapeRegex(t)}`).join("|")})`
      : patterns.wordPattern;
  const tokenSubstringPattern =
    tokens.length > 1
      ? `(?:${tokens.map((t) => escapeRegex(t)).join("|")})`
      : patterns.substringPattern;

  // 1. Transaction reference & money receipt number score
  const txRefScoreExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$referenceNumber", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$moneyReceiptNumber", ""] }, regex: patterns.exactPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_EXACT,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$referenceNumber", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$moneyReceiptNumber", ""] }, regex: tokenWordPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_WORD,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$referenceNumber", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$moneyReceiptNumber", ""] }, regex: tokenSubstringPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_SUBSTRING,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$referenceNumber", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$moneyReceiptNumber", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 2. Case & Client identifier match (caseNumber, internalReference, clientNumber)
  const caseClientIdScoreExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseNumber", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.internalReference", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.clientNumber", ""] }, regex: patterns.exactPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseNumber", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.internalReference", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.clientNumber", ""] }, regex: tokenWordPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_WORD,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseNumber", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.internalReference", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.clientNumber", ""] }, regex: tokenSubstringPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_SUBSTRING,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseNumber", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.internalReference", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.clientNumber", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 3. Primary titles and names (caseTitle, clientName, organizationName)
  const titleNameScoreExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.title", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.name", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.organizationName", ""] }, regex: patterns.exactPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.title", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.name", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.organizationName", ""] }, regex: tokenWordPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.title", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.name", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.organizationName", ""] }, regex: tokenSubstringPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_SUBSTRING,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.title", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.name", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.organizationName", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 4. Narrative transaction description (payment notes / expense description)
  const descriptionScoreExpr = {
    $switch: {
      branches: [
        {
          case: { $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: patterns.exactPattern, options: "i" } },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
        },
        {
          case: { $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: tokenWordPattern, options: "i" } },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
        },
        {
          case: { $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: tokenSubstringPattern, options: "i" } },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
        },
        {
          case: { $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 5. Client contact fields (phone, alternatePhone, email)
  const clientContactScoreExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$clientDoc.phone", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.alternatePhone", ""] }, regex: patterns.exactPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.email", ""] }, regex: patterns.exactPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$clientDoc.phone", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.alternatePhone", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.email", ""] }, regex: tokenWordPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_WORD,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$clientDoc.phone", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.alternatePhone", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.email", ""] }, regex: tokenSubstringPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$clientDoc.phone", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.alternatePhone", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$clientDoc.email", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 6. Secondary Case fields (category, opposingCounsel, description, legalIssues)
  const caseSecondaryScoreExpr = {
    $switch: {
      branches: [
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseCategory", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.opposingCounsel", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.description", ""] }, regex: tokenWordPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.legalIssues", ""] }, regex: tokenWordPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseCategory", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.opposingCounsel", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.description", ""] }, regex: tokenSubstringPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.legalIssues", ""] }, regex: tokenSubstringPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_SUBSTRING,
        },
        {
          case: {
            $or: [
              { $regexMatch: { input: { $ifNull: ["$caseDoc.caseCategory", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.opposingCounsel", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.description", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
              { $regexMatch: { input: { $ifNull: ["$caseDoc.legalIssues", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
            ],
          },
          then: FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY,
        },
      ],
      default: 0,
    },
  };

  // 7. Metadata (paymentMethod, paymentType, expenseCategory)
  const metadataBranches: Array<{ case: Record<string, unknown>; then: number }> = [];

  for (const m of metadataMatches.matchedPaymentMethods) {
    metadataBranches.push({
      case: { $eq: ["$paymentMethod", m.method] },
      then: m.score,
    });
  }
  for (const pt of metadataMatches.matchedPaymentTypes) {
    metadataBranches.push({
      case: { $eq: ["$paymentType", pt.type] },
      then: pt.score,
    });
  }
  for (const ec of metadataMatches.matchedExpenseCategories) {
    metadataBranches.push({
      case: { $eq: ["$expenseCategory", ec.category] },
      then: ec.score,
    });
  }

  // Fallback: direct pattern match on stored enum strings
  metadataBranches.push(
    {
      case: {
        $or: [
          { $regexMatch: { input: { $ifNull: ["$paymentMethod", ""] }, regex: tokenWordPattern, options: "i" } },
          { $regexMatch: { input: { $ifNull: ["$paymentType", ""] }, regex: tokenWordPattern, options: "i" } },
          { $regexMatch: { input: { $ifNull: ["$expenseCategory", ""] }, regex: tokenWordPattern, options: "i" } },
        ],
      },
      then: FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD,
    },
    {
      case: {
        $or: [
          { $regexMatch: { input: { $ifNull: ["$paymentMethod", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
          { $regexMatch: { input: { $ifNull: ["$paymentType", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
          { $regexMatch: { input: { $ifNull: ["$expenseCategory", ""] }, regex: patterns.fuzzyPattern, options: "i" } },
        ],
      },
      then: FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_FUZZY,
    }
  );

  const metadataScoreExpr =
    metadataBranches.length > 0
      ? { $switch: { branches: metadataBranches, default: 0 } }
      : 0;

  // 8. Record type match
  const recordTypeBranches: Array<{ case: Record<string, unknown>; then: number }> = [];
  if (metadataMatches.matchedRecordTypes.paymentScore > 0) {
    recordTypeBranches.push({
      case: { $eq: ["$recordType", FINANCIAL_RECORD_TYPES.PAYMENT] },
      then: metadataMatches.matchedRecordTypes.paymentScore,
    });
  }
  if (metadataMatches.matchedRecordTypes.expenseScore > 0) {
    recordTypeBranches.push({
      case: { $eq: ["$recordType", FINANCIAL_RECORD_TYPES.EXPENSE] },
      then: metadataMatches.matchedRecordTypes.expenseScore,
    });
  }

  const recordTypeScoreExpr =
    recordTypeBranches.length > 0
      ? { $switch: { branches: recordTypeBranches, default: 0 } }
      : 0;

  return [
    {
      $addFields: {
        relevanceScore: {
          $add: [
            txRefScoreExpr,
            caseClientIdScoreExpr,
            titleNameScoreExpr,
            descriptionScoreExpr,
            clientContactScoreExpr,
            caseSecondaryScoreExpr,
            metadataScoreExpr,
            recordTypeScoreExpr,
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

/**
 * Data shape representing a candidate financial record for relevance scoring and test verification.
 */
export interface FinancialMatchCandidate {
  recordType?: typeof FINANCIAL_RECORD_TYPES.PAYMENT | typeof FINANCIAL_RECORD_TYPES.EXPENSE | string | null;
  referenceNumber?: string | null;
  moneyReceiptNumber?: string | null;
  description?: string | null;
  paymentMethod?: PaymentMethod | string | null;
  paymentType?: PaymentType | string | null;
  expenseCategory?: CaseExpenseCategory | string | null;

  // Case details
  caseNumber?: string | null;
  internalReference?: string | null;
  caseTitle?: string | null;
  caseCategory?: string | null;
  opposingCounsel?: string | null;
  opposingParties?: string[] | null;
  caseDescription?: string | null;
  legalIssues?: string | null;

  // Client details
  clientNumber?: string | null;
  clientName?: string | null;
  organizationName?: string | null;
  phone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
}

/**
 * Calculates a simulated relevance score for a Unified Financial Record against the user's search query.
 * Mirrors the exact scoring expressions used in buildFinancialRelevanceStages for testing and validation.
 */
export function calculateFinancialRecordRelevanceScore(
  candidate: FinancialMatchCandidate,
  query: string,
  precomputedMetadata?: MatchedFinancialMetadata
): { totalScore: number; breakdown: Record<string, number> } {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { totalScore: 0, breakdown: {} };
  }

  const patterns = buildFuzzySearchPatterns(q);
  if (!patterns) {
    return { totalScore: 0, breakdown: {} };
  }

  const metadata = precomputedMetadata || matchFinancialMetadata(q);
  const tokens = patterns.tokens || [patterns.sanitizedQuery];

  const scoreField = (
    values: Array<string | null | undefined>,
    exactScore: number,
    wordScore: number,
    subScore: number,
    fuzzyScore: number
  ): number => {
    let best = 0;
    for (const val of values) {
      if (!val) continue;
      const v = val.trim().toLowerCase();
      if (!v) continue;

      if (v === q) {
        return exactScore;
      }
      if (new RegExp(`\\b${escapeRegex(q)}`, "i").test(v) || v.startsWith(q)) {
        best = Math.max(best, wordScore);
        continue;
      }
      if (v.includes(q)) {
        best = Math.max(best, subScore);
        continue;
      }

      // Check tokens for multi-word queries
      if (tokens.length > 1) {
        for (const t of tokens) {
          if (t.length < 3) continue;
          if (new RegExp(`\\b${escapeRegex(t)}`, "i").test(v) || v.startsWith(t)) {
            best = Math.max(best, wordScore);
          } else if (v.includes(t)) {
            best = Math.max(best, subScore);
          }
        }
      }

      // Typo tolerance
      const sim = calculateStringSimilarity(q, v);
      if (sim >= 0.5) {
        best = Math.max(best, fuzzyScore);
      }
    }
    return best;
  };

  // 1. Transaction reference & receipt numbers
  const txRefScore = scoreField(
    [candidate.referenceNumber, candidate.moneyReceiptNumber],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_EXACT,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_FUZZY
  );

  // 2. Case & Client identifiers
  const caseClientIdScore = scoreField(
    [candidate.caseNumber, candidate.internalReference, candidate.clientNumber],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_FUZZY
  );

  // 3. Primary titles and names
  const titleNameScore = scoreField(
    [candidate.caseTitle, candidate.clientName, candidate.organizationName],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_FUZZY
  );

  // 4. Narrative description
  const descriptionScore = scoreField(
    [candidate.description],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY
  );

  // 5. Client contact fields
  const clientContactScore = scoreField(
    [candidate.phone, candidate.alternatePhone, candidate.email],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY
  );

  // 6. Secondary case fields
  const caseSecondaryScore = scoreField(
    [
      candidate.caseCategory,
      candidate.opposingCounsel,
      candidate.caseDescription,
      candidate.legalIssues,
      ...(candidate.opposingParties || []),
    ],
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_SUBSTRING,
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_FUZZY
  );

  // 7. Metadata (paymentMethod, paymentType, expenseCategory)
  let metadataScore = 0;
  if (candidate.paymentMethod) {
    const match = metadata.matchedPaymentMethods.find((m) => m.method === candidate.paymentMethod);
    if (match) metadataScore = Math.max(metadataScore, match.score);
  }
  if (candidate.paymentType) {
    const match = metadata.matchedPaymentTypes.find((pt) => pt.type === candidate.paymentType);
    if (match) metadataScore = Math.max(metadataScore, match.score);
  }
  if (candidate.expenseCategory) {
    const match = metadata.matchedExpenseCategories.find((c) => c.category === candidate.expenseCategory);
    if (match) metadataScore = Math.max(metadataScore, match.score);
  }
  // Check string match directly if not matched via precomputed labels
  if (metadataScore === 0) {
    metadataScore = scoreField(
      [candidate.paymentMethod, candidate.paymentType, candidate.expenseCategory],
      FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT,
      FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD,
      FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD,
      FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_FUZZY
    );
  }

  // 8. Record type match
  let recordTypeScore = 0;
  if (candidate.recordType === FINANCIAL_RECORD_TYPES.PAYMENT && metadata.matchedRecordTypes.paymentScore > 0) {
    recordTypeScore = metadata.matchedRecordTypes.paymentScore;
  } else if (candidate.recordType === FINANCIAL_RECORD_TYPES.EXPENSE && metadata.matchedRecordTypes.expenseScore > 0) {
    recordTypeScore = metadata.matchedRecordTypes.expenseScore;
  }

  const breakdown: Record<string, number> = {
    txRefScore,
    caseClientIdScore,
    titleNameScore,
    descriptionScore,
    clientContactScore,
    caseSecondaryScore,
    metadataScore,
    recordTypeScore,
  };

  const totalScore =
    txRefScore +
    caseClientIdScore +
    titleNameScore +
    descriptionScore +
    clientContactScore +
    caseSecondaryScore +
    metadataScore +
    recordTypeScore;

  return { totalScore, breakdown };
}
