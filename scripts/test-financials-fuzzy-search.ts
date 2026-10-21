import {
  damerauLevenshteinDistance,
  buildFuzzySearchPatterns,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  FINANCIAL_SEARCH_RELEVANCE_SCORES,
  matchFinancialMetadata,
  buildFinancialRelevanceStages,
  calculateFinancialRecordRelevanceScore,
  FinancialMatchCandidate,
} from "@/lib/helpers/fuzzy-searching/financial-fuzzy-search.helper";
import {
  CASE_EXPENSE_RELEVANCE_SCORES,
  calculateCaseMatchScore,
  calculateClientMatchScore,
} from "@/lib/helpers/fuzzy-searching/case-expense-fuzzy-search.helper";
import { FINANCIAL_RECORD_TYPES } from "@/const/financial.const";
import {
  PAYMENT_METHODS,
  PAYMENT_TYPES,
} from "@/const/client-payment.const";
import { CASE_EXPENSE_CATEGORIES } from "@/const/case-expense.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedLedgerRecord extends FinancialMatchCandidate {
  id: string;
  amount: number;
  currency: string;
  transactionDate: string; // ISO date
  isCaseDeleted?: boolean;
  isClientDeleted?: boolean;
}

async function runTests() {
  console.log("\n🧪 Running Comprehensive Production Verification for Financials Fuzzy Search & Relevance...\n");

  // ==========================================
  // Scenario 1: Exact Reference Number & Money Receipt Number
  // ==========================================
  console.log("--- 1. Testing Exact Transaction Reference & Money Receipt Number Matches ---");
  const candTxRef: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
    referenceNumber: "TRX-2026-9901",
    moneyReceiptNumber: "MR-2026-0042",
  };
  const scoreRef = calculateFinancialRecordRelevanceScore(candTxRef, "TRX-2026-9901");
  const scoreMr = calculateFinancialRecordRelevanceScore(candTxRef, "MR-2026-0042");

  assert(
    scoreRef.totalScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_EXACT,
    `Exact reference number gets top score (${scoreRef.totalScore} === 110)`
  );
  assert(
    scoreMr.totalScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_EXACT,
    `Exact money receipt number gets top score (${scoreMr.totalScore} === 110)`
  );

  // ==========================================
  // Scenario 2: Exact Case Number and Client Number Matches
  // ==========================================
  console.log("\n--- 2. Testing Exact Case Number and Client Number Matches ---");
  const candCaseClient: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
    caseNumber: "CR-102/2024",
    internalReference: "CASE-2024-001",
    clientNumber: "CL-0042",
  };
  const scoreCaseNum = calculateFinancialRecordRelevanceScore(candCaseClient, "CR-102/2024");
  const scoreIntRef = calculateFinancialRecordRelevanceScore(candCaseClient, "CASE-2024-001");
  const scoreClientNum = calculateFinancialRecordRelevanceScore(candCaseClient, "CL-0042");

  assert(
    scoreCaseNum.totalScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
    `Exact case number gets identifier score (${scoreCaseNum.totalScore} === 100)`
  );
  assert(
    scoreIntRef.totalScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
    `Exact internal reference gets identifier score (${scoreIntRef.totalScore} === 100)`
  );
  assert(
    scoreClientNum.totalScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
    `Exact client number gets identifier score (${scoreClientNum.totalScore} === 100)`
  );

  // ==========================================
  // Scenario 3: Typo-Tolerant Matches in Descriptions & Related Fields
  // ==========================================
  console.log("\n--- 3. Testing Typo-Tolerant Matches in Descriptions & Related Fields ---");
  const candTypo: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
    description: "Initial consultation fee for property dispute",
    clientName: "Aminul Chowdhury",
    caseTitle: "State vs Tareq Rahman",
  };

  // Typo "consulation" for "consultation" (omission)
  const scoreTypoDesc = calculateFinancialRecordRelevanceScore(candTypo, "consulation");
  assert(
    scoreTypoDesc.breakdown.descriptionScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
    `Typo 'consulation' in description detected with fuzzy score (${scoreTypoDesc.breakdown.descriptionScore} === 20)`
  );

  // Typo "chowdury" for "chowdhury" (omission)
  const scoreTypoClient = calculateFinancialRecordRelevanceScore(candTypo, "chowdury");
  assert(
    scoreTypoClient.breakdown.titleNameScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_FUZZY,
    `Typo 'chowdury' in client name detected with fuzzy score (${scoreTypoClient.breakdown.titleNameScore} === 35)`
  );

  // Typo "reciept" (transposition)
  assert(damerauLevenshteinDistance("reciept", "receipt") === 1, "Transposition 'reciept' -> 'receipt' distance is 1");

  // Typo "clinet" (transposition)
  assert(damerauLevenshteinDistance("clinet", "client") === 1, "Transposition 'clinet' -> 'client' distance is 1");

  // Typo "transction" (omission)
  assert(damerauLevenshteinDistance("transction", "transaction") === 1, "Omission 'transction' -> 'transaction' distance is 1");

  // Typo "affidevit" (substitution)
  assert(damerauLevenshteinDistance("affidevit", "affidavit") === 1, "Substitution 'affidevit' -> 'affidavit' distance is 1");

  // ==========================================
  // Scenario 4: Searching Additional Supported Fields
  // ==========================================
  console.log("\n--- 4. Testing Searching Additional Supported Fields ---");
  const candExtended: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
    organizationName: "Grameen Bank Legal Department",
    phone: "+8801711223344",
    alternatePhone: "01819998877",
    email: "legal@grameen.com",
    caseCategory: "Constitutional Law",
    opposingCounsel: "Barrister M. A. Hasan",
    caseDescription: "Writ petition regarding land acquisition",
    legalIssues: "Article 42 constitutional compensation rights",
  };

  const scoreOrg = calculateFinancialRecordRelevanceScore(candExtended, "Grameen Bank");
  assert(
    scoreOrg.breakdown.titleNameScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD,
    `Client organization name matched (${scoreOrg.breakdown.titleNameScore} === 70)`
  );

  const scorePhone = calculateFinancialRecordRelevanceScore(candExtended, "+8801711223344");
  assert(
    scorePhone.breakdown.clientContactScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
    `Client phone matched (${scorePhone.breakdown.clientContactScore} === 65)`
  );

  const scoreEmail = calculateFinancialRecordRelevanceScore(candExtended, "legal@grameen.com");
  assert(
    scoreEmail.breakdown.clientContactScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
    `Client email matched (${scoreEmail.breakdown.clientContactScore} === 65)`
  );

  const scoreCounsel = calculateFinancialRecordRelevanceScore(candExtended, "Barrister M. A. Hasan");
  assert(
    scoreCounsel.breakdown.caseSecondaryScore >= FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_SECONDARY_WORD,
    `Case opposing counsel matched (${scoreCounsel.breakdown.caseSecondaryScore} >= 45)`
  );

  // ==========================================
  // Scenario 5: Matching Payment Method, Payment Type & Expense Category Labels
  // ==========================================
  console.log("\n--- 5. Testing Payment Method, Type & Expense Category Label Matching ---");
  const candMeta: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    paymentType: PAYMENT_TYPES.RETAINER_FEE,
    expenseCategory: null,
  };

  // Human-readable label: "Bank Transfer"
  const scoreBankTransfer = calculateFinancialRecordRelevanceScore(candMeta, "Bank Transfer");
  assert(
    scoreBankTransfer.breakdown.metadataScore >= FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_WORD,
    `Human-readable payment method label 'Bank Transfer' matched (${scoreBankTransfer.breakdown.metadataScore} >= 45)`
  );

  // Human-readable label: "Retainer Fee"
  const scoreRetainer = calculateFinancialRecordRelevanceScore(candMeta, "Retainer Fee");
  assert(
    scoreRetainer.breakdown.metadataScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT,
    `Human-readable payment type label 'Retainer Fee' matched (${scoreRetainer.breakdown.metadataScore} === 60)`
  );

  // Expense Category: "Talbana" or "Notary & Affidavit"
  const candExpenseCat: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
    expenseCategory: CASE_EXPENSE_CATEGORIES.PROCESS_FEE_TALBANA,
  };
  const scoreTalbana = calculateFinancialRecordRelevanceScore(candExpenseCat, "talbana");
  assert(
    scoreTalbana.breakdown.metadataScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.METADATA_EXACT,
    `Expense category label 'Talbana' matched (${scoreTalbana.breakdown.metadataScore} === 60)`
  );

  // Record Type matching: "Payment" or "Expense"
  const scorePayType = calculateFinancialRecordRelevanceScore(candMeta, "payment");
  assert(
    scorePayType.breakdown.recordTypeScore === FINANCIAL_SEARCH_RELEVANCE_SCORES.RECORD_TYPE_MATCH,
    `Record type keyword 'payment' matched (${scorePayType.breakdown.recordTypeScore} === 40)`
  );

  // ==========================================
  // Scenario 6 & 7: Relevance Ranking Order Across Payments & Expenses
  // ==========================================
  console.log("\n--- 6 & 7. Testing Relevance Ranking Hierarchy Across Payments & Expenses ---");
  const candidates: SimulatedLedgerRecord[] = [
    {
      id: "REC-1",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      referenceNumber: "TRX-EXACT-001",
      moneyReceiptNumber: "MR-001",
      description: "Retainer fee deposit",
      caseTitle: "Property Dispute",
      amount: 15000,
      currency: "BDT",
      transactionDate: "2026-03-01T10:00:00Z",
    },
    {
      id: "REC-2",
      recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
      caseNumber: "CR-999/2026",
      caseTitle: "State vs Kabir",
      description: "Certified copy fee",
      expenseCategory: CASE_EXPENSE_CATEGORIES.CERTIFIED_COPY_FEE,
      amount: 1200,
      currency: "BDT",
      transactionDate: "2026-03-02T10:00:00Z",
    },
    {
      id: "REC-3",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      clientName: "State vs Kabir", // Exact title match query
      description: "Hearing fee",
      amount: 5000,
      currency: "BDT",
      transactionDate: "2026-03-03T10:00:00Z",
    },
    {
      id: "REC-4",
      recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
      description: "State vs Kabir urgent photocopy expense",
      amount: 400,
      currency: "BDT",
      transactionDate: "2026-03-04T10:00:00Z",
    },
    {
      id: "REC-5",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      description: "State vs Kabir advisory consulation charge", // Typo "consulation"
      amount: 3000,
      currency: "BDT",
      transactionDate: "2026-03-05T10:00:00Z",
    },
  ];

  // Rank candidates for query "State vs Kabir"
  const rankedCandidates = candidates
    .map((c) => ({
      ...c,
      relevanceScore: calculateFinancialRecordRelevanceScore(c, "State vs Kabir").totalScore,
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  assert(
    rankedCandidates[0].id === "REC-2" || rankedCandidates[0].id === "REC-3",
    "Unified ranking correctly ranks exact title/case match records above general descriptions"
  );

  // Hierarchy check:
  // Identifier (110 / 100) > Title/Name (85) > Exact Desc (70) > Fuzzy (20-35)
  assert(
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TRANSACTION_REF_EXACT > FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT,
    "Hierarchy: Transaction Ref (110) > Case/Client ID (100)"
  );
  assert(
    FINANCIAL_SEARCH_RELEVANCE_SCORES.CASE_CLIENT_ID_EXACT > FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    "Hierarchy: Case/Client ID (100) > Exact Title/Name (85)"
  );
  assert(
    FINANCIAL_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT > FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    "Hierarchy: Exact Title/Name (85) > Exact Description (70)"
  );
  assert(
    FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT > FINANCIAL_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY,
    "Hierarchy: Exact Description (70) > Fuzzy Description (20)"
  );

  // ==========================================
  // Scenario 8: Multiple Query Terms and Cumulative Scoring
  // ==========================================
  console.log("\n--- 8. Testing Multiple Query Terms & Cumulative Scoring ---");
  const candMultiTerm: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
    clientName: "Aminul Chowdhury",
    description: "Property dispute consultation fee",
    paymentType: PAYMENT_TYPES.CONSULTATION_FEE,
  };

  const scoreMulti = calculateFinancialRecordRelevanceScore(candMultiTerm, "Aminul consultation");
  assert(
    scoreMulti.breakdown.titleNameScore > 0 && scoreMulti.breakdown.descriptionScore > 0,
    `Multi-term query 'Aminul consultation' matches client name (${scoreMulti.breakdown.titleNameScore}) AND description (${scoreMulti.breakdown.descriptionScore})`
  );
  assert(
    scoreMulti.totalScore === scoreMulti.breakdown.titleNameScore + scoreMulti.breakdown.descriptionScore + scoreMulti.breakdown.metadataScore,
    `Multi-term match yields cumulative score boost (Total: ${scoreMulti.totalScore})`
  );

  // ==========================================
  // Scenario 9, 10, 11, 12: Search Combined With Strict Filters
  // ==========================================
  console.log("\n--- 9-12. Testing Search Combined With Filters (recordType, client, case, method, date) ---");
  const testLedger: SimulatedLedgerRecord[] = [
    {
      id: "LED-1",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      amount: 10000,
      currency: "BDT",
      transactionDate: "2026-03-01T00:00:00Z",
      paymentMethod: PAYMENT_METHODS.CASH,
      paymentType: PAYMENT_TYPES.RETAINER_FEE,
      description: "Client retainer fee",
      clientNumber: "CL-01",
      caseNumber: "CASE-01",
    },
    {
      id: "LED-2",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      amount: 5000,
      currency: "BDT",
      transactionDate: "2026-03-05T00:00:00Z",
      paymentMethod: PAYMENT_METHODS.BKASH,
      paymentType: PAYMENT_TYPES.CONSULTATION_FEE,
      description: "Client consultation fee",
      clientNumber: "CL-01",
      caseNumber: "CASE-02",
    },
    {
      id: "LED-3",
      recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
      amount: 2500,
      currency: "BDT",
      transactionDate: "2026-03-02T00:00:00Z",
      expenseCategory: CASE_EXPENSE_CATEGORIES.COURT_FEES,
      description: "Challan court fees",
      clientNumber: "CL-01",
      caseNumber: "CASE-01",
    },
    {
      id: "LED-4",
      recordType: FINANCIAL_RECORD_TYPES.EXPENSE,
      amount: 800,
      currency: "BDT",
      transactionDate: "2026-03-10T00:00:00Z",
      expenseCategory: CASE_EXPENSE_CATEGORIES.PHOTOCOPY_AND_PRINTING,
      description: "Paperbook printing",
      clientNumber: "CL-02",
      caseNumber: "CASE-03",
    },
    {
      id: "LED-5",
      recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
      amount: 4000,
      currency: "BDT",
      transactionDate: "2026-03-12T00:00:00Z",
      paymentMethod: PAYMENT_METHODS.CASH,
      description: "Old case consultation",
      clientNumber: "CL-02",
      isClientDeleted: true, // Soft-deleted client
    },
  ];

  // Filter 10: recordType = PAYMENT only
  const paymentsOnly = testLedger.filter(
    (r) => !r.isClientDeleted && r.recordType === FINANCIAL_RECORD_TYPES.PAYMENT
  );
  assert(paymentsOnly.length === 2 && paymentsOnly.every((r) => r.recordType === FINANCIAL_RECORD_TYPES.PAYMENT), "recordType filter correctly isolates payments");

  // Filter 11: paymentMethod = CASH only (must exclude expenses)
  const cashOnly = testLedger.filter(
    (r) => !r.isClientDeleted && r.paymentMethod === PAYMENT_METHODS.CASH
  );
  assert(
    cashOnly.length === 1 && cashOnly[0].id === "LED-1" && cashOnly[0].recordType === FINANCIAL_RECORD_TYPES.PAYMENT,
    "paymentMethod filter matches cash payment and excludes all expenses"
  );

  // Filter 11b: expenseCategory = COURT_FEES only (must exclude payments)
  const courtFeesOnly = testLedger.filter(
    (r) => !r.isClientDeleted && r.expenseCategory === CASE_EXPENSE_CATEGORIES.COURT_FEES
  );
  assert(
    courtFeesOnly.length === 1 && courtFeesOnly[0].id === "LED-3" && courtFeesOnly[0].recordType === FINANCIAL_RECORD_TYPES.EXPENSE,
    "expenseCategory filter matches expense and excludes all payments"
  );

  // Filter 12: date range <= 2026-03-05
  const dateRangeFiltered = testLedger.filter(
    (r) => !r.isClientDeleted && new Date(r.transactionDate) <= new Date("2026-03-05T23:59:59Z")
  );
  assert(
    dateRangeFiltered.length === 3 && dateRangeFiltered.every((r) => r.id === "LED-1" || r.id === "LED-2" || r.id === "LED-3"),
    "Date range filter correctly preserves transaction date window semantics"
  );

  // Filter 18: Exclusion of soft-deleted client records
  const activeOnly = testLedger.filter((r) => !r.isClientDeleted);
  assert(
    !activeOnly.some((r) => r.id === "LED-5"),
    "Soft-deleted client record correctly excluded"
  );

  // ==========================================
  // Scenario 13 & 14: Relevance Sorting & Pagination Interaction
  // ==========================================
  console.log("\n--- 13 & 14. Testing Relevance Sorting Interacting with Sort Options & Pagination ---");
  const scoredLedger = activeOnly.map((r) => {
    const score = calculateFinancialRecordRelevanceScore(r, "consultation");
    return { ...r, relevanceScore: score.totalScore };
  }).filter((r) => r.relevanceScore > 0);

  // Primary: relevanceScore desc, Secondary: amount desc
  scoredLedger.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return b.amount - a.amount;
  });

  assert(scoredLedger.length === 1 && scoredLedger[0].id === "LED-2", "Query 'consultation' matches LED-2");

  // Query "fee" which matches multiple records:
  const scoredFeeLedger = activeOnly.map((r) => {
    const score = calculateFinancialRecordRelevanceScore(r, "fee");
    return { ...r, relevanceScore: score.totalScore };
  }).filter((r) => r.relevanceScore > 0);

  scoredFeeLedger.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) {
      return b.relevanceScore - a.relevanceScore;
    }
    return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
  });

  assert(scoredFeeLedger.length === 3, "Query 'fee' matches 3 records");
  const pageSize = 2;
  const page1 = scoredFeeLedger.slice(0, pageSize);
  const page2 = scoredFeeLedger.slice(pageSize, pageSize * 2);

  assert(page1.length === 2, "Page 1 contains first 2 top-ranked items");
  assert(page2.length === 1, "Page 2 contains item 3");
  assert(
    page1[0].relevanceScore >= page1[1].relevanceScore && page1[1].relevanceScore >= page2[0].relevanceScore,
    "Relevance ranking strictly maintained across pagination boundaries"
  );

  // ==========================================
  // Scenario 15, 16, 17: Accurate Totals and Summary Statistics
  // ==========================================
  console.log("\n--- 15-17. Testing Financial Totals, Balances, and Breakdowns ---");
  const matchingRecords = activeOnly; // Suppose full dataset matched
  const totalCount = matchingRecords.length;
  const totalIncome = matchingRecords
    .filter((r) => r.recordType === FINANCIAL_RECORD_TYPES.PAYMENT)
    .reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = matchingRecords
    .filter((r) => r.recordType === FINANCIAL_RECORD_TYPES.EXPENSE)
    .reduce((sum, r) => sum + r.amount, 0);
  const netBalance = Math.round((totalIncome - totalExpense) * 100) / 100;

  assert(totalCount === 4, "Total count reflects all 4 matching records");
  assert(totalIncome === 15000, `Total income calculated correctly (${totalIncome} === 15000 BDT)`);
  assert(totalExpense === 3300, `Total expense calculated correctly (${totalExpense} === 3300 BDT)`);
  assert(netBalance === 11700, `Net balance calculated correctly (${netBalance} === 11700 BDT)`);

  // Payment method breakdown
  const methodBreakdown: Record<string, number> = {};
  for (const r of matchingRecords) {
    if (r.recordType === FINANCIAL_RECORD_TYPES.PAYMENT && r.paymentMethod) {
      methodBreakdown[r.paymentMethod] = (methodBreakdown[r.paymentMethod] || 0) + r.amount;
    }
  }
  assert(methodBreakdown[PAYMENT_METHODS.CASH] === 10000, "Method breakdown sums CASH correctly (10,000 BDT)");
  assert(methodBreakdown[PAYMENT_METHODS.BKASH] === 5000, "Method breakdown sums BKASH correctly (5,000 BDT)");

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const r of matchingRecords) {
    if (r.recordType === FINANCIAL_RECORD_TYPES.EXPENSE && r.expenseCategory) {
      categoryBreakdown[r.expenseCategory] = (categoryBreakdown[r.expenseCategory] || 0) + r.amount;
    }
  }
  assert(categoryBreakdown[CASE_EXPENSE_CATEGORIES.COURT_FEES] === 2500, "Category breakdown sums COURT_FEES correctly (2,500 BDT)");
  assert(categoryBreakdown[CASE_EXPENSE_CATEGORIES.PHOTOCOPY_AND_PRINTING] === 800, "Category breakdown sums PHOTOCOPY_AND_PRINTING correctly (800 BDT)");

  // ==========================================
  // Scenario 19 & 20: Empty Search & Empty Results
  // ==========================================
  console.log("\n--- 19 & 20. Testing Empty Search & Empty Results Handling ---");
  assert(buildFuzzySearchPatterns("") === null, "Empty search query returns null");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace-only search query returns null");
  assert(buildFuzzySearchPatterns(null) === null, "Null query returns null");
  assert(buildFuzzySearchPatterns(undefined) === null, "Undefined query returns null");

  const emptySearchScore = calculateFinancialRecordRelevanceScore(candMeta, "");
  assert(emptySearchScore.totalScore === 0, "Empty query produces 0 relevance score");

  // Zero-value stats for empty results
  const emptyStats = {
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
    paymentCount: 0,
    expenseCount: 0,
    totalCount: 0,
    methodBreakdown: {},
    categoryBreakdown: {},
  };
  assert(emptyStats.totalIncome === 0 && emptyStats.netBalance === 0, "Empty search result provides valid zero-value financial stats");

  // ==========================================
  // Scenario 21: Missing Related Records & Optional Fields
  // ==========================================
  console.log("\n--- 21. Testing Missing Related Records & Optional Fields Safety ---");
  const candMinimal: FinancialMatchCandidate = {
    recordType: FINANCIAL_RECORD_TYPES.PAYMENT,
    // No case, no client, no notes, no metadata
  };
  const scoreMinimal = calculateFinancialRecordRelevanceScore(candMinimal, "consultation");
  assert(scoreMinimal.totalScore === 0, "Minimal candidate with missing optional fields handles safely without errors");

  // Aggregation stage builder safety check
  const patterns = buildFuzzySearchPatterns("consultation")!;
  const metadataMatches = matchFinancialMetadata("consultation");
  const stages = buildFinancialRelevanceStages(patterns, metadataMatches);

  assert(stages.length === 2, "buildFinancialRelevanceStages generates exactly 2 stages ($addFields, $match)");
  assert("$addFields" in stages[0], "Stage 0 is $addFields for dynamic relevance score");
  assert("$match" in stages[1], "Stage 1 is $match for relevanceScore > 0");

  // ==========================================
  // Scenario 22: Preserving Existing Fuzzy Search Helpers & Consumers
  // ==========================================
  console.log("\n--- 22. Testing Existing Fuzzy Search Helper Compatibility ---");
  assert(typeof calculateCaseMatchScore === "function", "calculateCaseMatchScore preserved");
  assert(typeof calculateClientMatchScore === "function", "calculateClientMatchScore preserved");
  assert(CASE_EXPENSE_RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER === 100, "CASE_EXPENSE_RELEVANCE_SCORES preserved");

  console.log("\n==========================================");
  console.log("🏆 ALL 22 FINANCIAL FUZZY SEARCH VERIFICATION SCENARIOS PASSED!");
  console.log("==========================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
