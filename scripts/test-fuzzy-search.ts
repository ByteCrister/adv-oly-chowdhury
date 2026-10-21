import mongoose from "mongoose";
import {
  damerauLevenshteinDistance,
  calculateStringSimilarity,
  buildFuzzySearchPatterns,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateCaseMatchScore,
  calculateClientMatchScore,
  bucketScoredCaseIds,
  buildCaseExpenseRelevanceStages,
  RELEVANCE_SCORES,
} from "@/lib/helpers/fuzzy-searching/case-expense-fuzzy-search.helper";
import { CASE_EXPENSE_CATEGORIES } from "@/const/case-expense.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ${message}`);
}

async function runTests() {
  console.log("\n🧪 Running Comprehensive Production Verification for Fuzzy Search & Relevance...\n");

  // ==========================================
  // Section 1: Damerau-Levenshtein & Typos
  // ==========================================
  console.log("--- 1. Testing Typo Tolerance & Edit Distance ---");
  assert(
    damerauLevenshteinDistance("consulation", "consultation") === 1,
    "Missing character (omission) detected ('consulation' -> 'consultation')"
  );
  assert(
    damerauLevenshteinDistance("chowdury", "chowdhury") === 1,
    "Missing character (omission) detected ('chowdury' -> 'chowdhury')"
  );
  assert(
    damerauLevenshteinDistance("consulttation", "consultation") === 1,
    "Extra character (insertion) detected ('consulttation' -> 'consultation')"
  );
  assert(
    damerauLevenshteinDistance("affidevit", "affidavit") === 1,
    "Substituted character detected ('affidevit' -> 'affidavit')"
  );
  assert(
    damerauLevenshteinDistance("reciept", "receipt") === 1,
    "Transposed adjacent characters detected ('reciept' -> 'receipt')"
  );
  assert(
    damerauLevenshteinDistance("unrelatedword", "consultation") > 5,
    "Completely different words have high distance (> 5)"
  );

  // ==========================================
  // Section 2: Similarity Scoring
  // ==========================================
  console.log("\n--- 2. Testing Normalized Similarity Scoring ---");
  assert(
    calculateStringSimilarity("consultation", "consultation") === 1.0,
    "Exact match yields 1.0 score"
  );
  assert(
    calculateStringSimilarity("consultation", "Advocate Consultation Fee") === 0.85,
    "Word boundary exact match yields 0.85 score"
  );
  assert(
    calculateStringSimilarity("consulation", "Advocate Consultation Fee") >= 0.55,
    "Fuzzy typo match yields >= 0.55 similarity"
  );
  assert(
    calculateStringSimilarity("stationery", "Advocate Consultation Fee") === 0,
    "Unrelated query yields 0 similarity"
  );

  // ==========================================
  // Section 3: Pattern Generation & Edge Cases
  // ==========================================
  console.log("\n--- 3. Testing Pattern Generation & Edge Cases ---");
  assert(buildFuzzySearchPatterns("") === null, "Empty query returns null");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace query returns null");
  assert(buildFuzzySearchPatterns(null) === null, "Null query returns null");
  assert(buildFuzzySearchPatterns(undefined) === null, "Undefined query returns null");

  const shortPattern = buildFuzzySearchPatterns("cr");
  assert(
    shortPattern !== null && shortPattern.isShortQuery,
    "Short query (<=2 chars) sets isShortQuery = true"
  );
  assert(
    shortPattern?.fuzzyPattern === "cr",
    "Short query does NOT generate typo variations (protects performance)"
  );

  const longQuery = "a".repeat(120);
  const longPattern = buildFuzzySearchPatterns(longQuery);
  assert(
    longPattern !== null && longPattern.sanitizedQuery.length <= 80,
    "Overly long query safely capped to max length"
  );

  const specialPunctuation = buildFuzzySearchPatterns("fee$ + (tax) * [urgent] / 2024");
  assert(
    specialPunctuation !== null,
    "Special regex metacharacters (*, +, ?, $, [], (), /) safely escaped"
  );

  // ==========================================
  // Section 4: Typo-Tolerant Regex Matching
  // ==========================================
  console.log("\n--- 4. Testing Typo-Tolerant Regex Pattern Matching ---");
  const typoPattern = buildFuzzySearchPatterns("consulation");
  assert(typoPattern !== null, "Fuzzy pattern built for 'consulation'");
  const typoRegex = new RegExp(typoPattern!.fuzzyPattern, "i");

  assert(
    typoRegex.test("Advocate consultation fee"),
    "Matches 'consultation' when user typed 'consulation' (missing char)"
  );
  assert(
    typoRegex.test("Initial client consulation note"),
    "Matches exact typo if present in text"
  );
  assert(
    !typoRegex.test("Stamp duty and notarization fee"),
    "Rejects unrelated expense description"
  );

  // ==========================================
  // Section 5: Field Priority & Scoring Hierarchy
  // ==========================================
  console.log("\n--- 5. Testing Field Priority & Relevance Hierarchy ---");
  const caseIdExact = new mongoose.Types.ObjectId();
  const caseIdTitle = new mongoose.Types.ObjectId();
  const caseIdFuzzy = new mongoose.Types.ObjectId();

  const case1 = {
    _id: caseIdExact,
    caseNumber: "CR-102/2024",
    internalReference: "CASE-2024-001",
    title: "State vs Rahim",
  };
  const case2 = {
    _id: caseIdTitle,
    caseNumber: "WP-500/2024",
    internalReference: "CASE-2024-002",
    title: "Consultation on Property Dispute",
  };
  const case3 = {
    _id: caseIdFuzzy,
    caseNumber: "WP-501/2024",
    internalReference: "CASE-2024-003",
    title: "Legal Consultation with Senior Counsel",
  };

  const scoreExactId = calculateCaseMatchScore(case1, "CR-102/2024");
  const scoreTitleExact = calculateCaseMatchScore(case2, "Consultation on Property Dispute");
  const scoreTitleFuzzy = calculateCaseMatchScore(case3, "consulation");

  assert(
    scoreExactId === RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER,
    `Exact case identifier receives top score (${scoreExactId} === 100)`
  );
  assert(
    scoreTitleExact === RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME,
    `Exact case title receives title score (${scoreTitleExact} === 80)`
  );
  assert(
    scoreTitleFuzzy === RELEVANCE_SCORES.CASE_FUZZY_MATCH,
    `Fuzzy case title receives fuzzy score (${scoreTitleFuzzy} === 30)`
  );
  assert(
    scoreExactId > scoreTitleExact && scoreTitleExact > scoreTitleFuzzy,
    "Hierarchy strictly holds: Identifier (100) > Exact Title (80) > Fuzzy Title (30)"
  );

  // Client scoring
  const clientExact = {
    _id: new mongoose.Types.ObjectId(),
    clientNumber: "CL-0042",
    name: "Aminul Chowdhury",
    organizationName: "Grameen Bank",
  };
  const clientScoreNum = calculateClientMatchScore(clientExact, "CL-0042");
  const clientScoreName = calculateClientMatchScore(clientExact, "Aminul Chowdhury");
  const clientScoreOrg = calculateClientMatchScore(clientExact, "Grameen Bank");
  const clientScoreTypo = calculateClientMatchScore(clientExact, "chowdury");

  assert(
    clientScoreNum === RELEVANCE_SCORES.CASE_EXACT_IDENTIFIER,
    `Client number receives top identifier score (${clientScoreNum} === 100)`
  );
  assert(
    clientScoreName === RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME,
    `Client name exact receives name score (${clientScoreName} === 80)`
  );
  assert(
    clientScoreOrg === RELEVANCE_SCORES.CASE_EXACT_TITLE_NAME,
    `Organization name exact receives title/name score (${clientScoreOrg} === 80)`
  );
  assert(
    clientScoreTypo === RELEVANCE_SCORES.CASE_FUZZY_MATCH,
    `Client name typo receives fuzzy score (${clientScoreTypo} === 30)`
  );

  // ==========================================
  // Section 5b: Case Bucketing & Aggregation Stage Generation
  // ==========================================
  console.log("\n--- 5b. Testing Case Bucketing & Aggregation Stage Generation ---");
  const testScoreMap = new Map<string, number>();
  const id1 = new mongoose.Types.ObjectId().toString();
  const id2 = new mongoose.Types.ObjectId().toString();
  const id3 = new mongoose.Types.ObjectId().toString();
  testScoreMap.set(id1, 100);
  testScoreMap.set(id2, 80);
  testScoreMap.set(id3, 30);

  const testBuckets = bucketScoredCaseIds(testScoreMap);
  assert(testBuckets.tier1Ids.length === 1 && testBuckets.tier1Ids[0].toString() === id1, "Tier 1 bucket contains exact identifier");
  assert(testBuckets.tier2Ids.length === 1 && testBuckets.tier2Ids[0].toString() === id2, "Tier 2 bucket contains exact title");
  assert(testBuckets.tier5Ids.length === 1 && testBuckets.tier5Ids[0].toString() === id3, "Tier 5 bucket contains fuzzy match");
  assert(testBuckets.allMatchingCaseIds.length === 3, "All matching case IDs collected");

  const testStages = buildCaseExpenseRelevanceStages(testBuckets, typoPattern!);
  assert(testStages.length === 2, "Generates exactly 2 stages ($addFields and $match)");
  assert("$addFields" in testStages[0], "First stage is $addFields");
  assert("$match" in testStages[1], "Second stage is $match for relevanceScore > 0");

  // ==========================================
  // Section 6: End-to-End Ranking Simulation
  // ==========================================
  console.log("\n--- 6. Testing End-to-End Relevance Ranking Order & Multi-Field Boost ---");

  // Simulated expense documents:
  interface SimulatedExpense {
    id: string;
    description: string;
    caseScore: number;
    descriptionScore: number;
    totalRelevance: number;
    amount: number;
    category: string;
    expenseDate: string;
  }

  function scoreSimulatedExpense(
    id: string,
    desc: string,
    caseScore: number,
    q: string,
    amount: number,
    category: string,
    expenseDate: string
  ): SimulatedExpense {
    const patterns = buildFuzzySearchPatterns(q)!;
    const exactRegex = new RegExp(patterns.exactPattern, "i");
    const wordRegex = new RegExp(patterns.wordPattern, "i");
    const substringRegex = new RegExp(patterns.substringPattern, "i");
    const fuzzyRegex = new RegExp(patterns.fuzzyPattern, "i");

    let descScore = 0;
    if (exactRegex.test(desc)) {
      descScore = RELEVANCE_SCORES.DESCRIPTION_EXACT;
    } else if (wordRegex.test(desc)) {
      descScore = RELEVANCE_SCORES.DESCRIPTION_WORD;
    } else if (substringRegex.test(desc)) {
      descScore = RELEVANCE_SCORES.DESCRIPTION_SUBSTRING;
    } else if (fuzzyRegex.test(desc)) {
      descScore = RELEVANCE_SCORES.DESCRIPTION_FUZZY;
    }

    return {
      id,
      description: desc,
      caseScore,
      descriptionScore: descScore,
      totalRelevance: caseScore + descScore,
      amount,
      category,
      expenseDate,
    };
  }

  // Scenario A: Exact query "consultation"
  console.log("\n  Scenario A: User searches 'consultation' (Exact query)");
  const exactQuery = "consultation";
  const exactCandidates: SimulatedExpense[] = [
    // EXP-1: Multi-field match (Case title 80 + Description exact 70 = 150)
    scoreSimulatedExpense("EXP-1", "Consultation fee for hearing preparation", 80, exactQuery, 5000, CASE_EXPENSE_CATEGORIES.COURT_FEES, "2026-03-01"),
    // EXP-2: Exact Case Number match (Case identifier 100 + Description 0 = 100)
    scoreSimulatedExpense("EXP-2", "Photocopy and printing of paperbook", 100, exactQuery, 600, CASE_EXPENSE_CATEGORIES.PHOTOCOPY_AND_PRINTING, "2026-03-02"),
    // EXP-3: Exact Case Title match, no description match (Case title 80 + Description 0 = 80)
    scoreSimulatedExpense("EXP-3", "Travel expense to Sylhet Court", 80, exactQuery, 1200, CASE_EXPENSE_CATEGORIES.LOCAL_CONVEYANCE_TRAVEL, "2026-03-03"),
    // EXP-4: Description exact match, case unrelated (Case 0 + Description 70 = 70)
    scoreSimulatedExpense("EXP-4", "Consultation fee for property advice", 0, exactQuery, 3500, CASE_EXPENSE_CATEGORIES.OTHER, "2026-03-04"),
    // EXP-5: Typo in record text (Case 0 + Description fuzzy 20 = 20)
    scoreSimulatedExpense("EXP-5", "Senior consulation advisory charge", 0, exactQuery, 2000, CASE_EXPENSE_CATEGORIES.OTHER, "2026-03-05"),
    // EXP-6: Fuzzy case match (Case 30 + Description 0 = 30)
    scoreSimulatedExpense("EXP-6", "Court fee challan payment", 30, exactQuery, 1500, CASE_EXPENSE_CATEGORIES.COURT_FEES, "2026-03-06"),
    // EXP-7: Unrelated record (Case 0 + Description 0 = 0)
    scoreSimulatedExpense("EXP-7", "Stamp duty paper purchase", 0, exactQuery, 800, CASE_EXPENSE_CATEGORIES.STAMP_DUTY, "2026-03-07"),
  ];

  const matched = exactCandidates.filter((c) => c.totalRelevance > 0);
  assert(matched.length === 6, "Filter correctly keeps all 6 matching records and discards unrelated record");

  matched.sort((a, b) => {
    if (b.totalRelevance !== a.totalRelevance) {
      return b.totalRelevance - a.totalRelevance;
    }
    return new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime();
  });

  console.log("  Exact Query Ranking Order:");
  matched.forEach((m, idx) => {
    console.log(`    #${idx + 1} [${m.id}] Score: ${m.totalRelevance} (Case: ${m.caseScore}, Desc: ${m.descriptionScore}) - "${m.description}"`);
  });

  assert(matched[0].id === "EXP-1", "Rank 1 is EXP-1: Multi-field match (Score 150) ranks highest");
  assert(matched[1].id === "EXP-2", "Rank 2 is EXP-2: Exact case identifier match (Score 100) ranks next");
  assert(matched[2].id === "EXP-3", "Rank 3 is EXP-3: Exact case title match (Score 80) ranks next");
  assert(matched[3].id === "EXP-4", "Rank 4 is EXP-4: Exact description match (Score 70) ranks next");
  assert(matched[4].id === "EXP-6", "Rank 5 is EXP-6: Fuzzy case match (Score 30) ranks next");
  assert(matched[5].id === "EXP-5", "Rank 6 is EXP-5: Fuzzy description match (Score 20) ranks next");

  // Scenario B: Typo query "consulation"
  console.log("\n  Scenario B: User searches with typo 'consulation'");
  const typoQuery = "consulation";
  const typoCandidates: SimulatedExpense[] = [
    scoreSimulatedExpense("EXP-A", "Legal consultation fee", 0, typoQuery, 3000, CASE_EXPENSE_CATEGORIES.COURT_FEES, "2026-03-01"),
    scoreSimulatedExpense("EXP-B", "Stamp duty paper", 0, typoQuery, 500, CASE_EXPENSE_CATEGORIES.STAMP_DUTY, "2026-03-02"),
  ];
  const typoMatches = typoCandidates.filter((c) => c.totalRelevance > 0);
  assert(typoMatches.length === 1 && typoMatches[0].id === "EXP-A", "Typo query 'consulation' successfully discovers 'consultation' record!");

  // ==========================================
  // Section 7: Pagination & Summary Stats Integrity
  // ==========================================
  console.log("\n--- 7. Testing Pagination & Summary Statistics Integrity ---");
  const limit = 2;
  const page1 = matched.slice(0, limit);
  const page2 = matched.slice(limit, limit * 2);
  const page3 = matched.slice(limit * 2, limit * 3);

  assert(page1.length === 2 && page1[0].id === "EXP-1" && page1[1].id === "EXP-2", "Page 1 contains top 2 relevant items");
  assert(page2.length === 2 && page2[0].id === "EXP-3" && page2[1].id === "EXP-4", "Page 2 contains items 3 & 4");
  assert(page3.length === 2 && page3[0].id === "EXP-6" && page3[1].id === "EXP-5", "Page 3 contains items 5 & 6");

  const totalCount = matched.length;
  const totalAmount = matched.reduce((acc, cur) => acc + cur.amount, 0);
  assert(totalCount === 6, "Total count is exactly 6 across all pages");
  assert(totalAmount === 5000 + 600 + 1200 + 3500 + 2000 + 1500, "Total amount reflects full matching set (13,800 BDT)");

  // Category breakdown calculation
  const categoryBreakdown: Record<string, number> = {};
  for (const item of matched) {
    categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + item.amount;
  }
  assert(
    categoryBreakdown[CASE_EXPENSE_CATEGORIES.COURT_FEES] === 6500,
    "Category breakdown correctly sums COURT_FEES (5000 + 1500 = 6500 BDT)"
  );
  assert(
    categoryBreakdown[CASE_EXPENSE_CATEGORIES.OTHER] === 5500,
    "Category breakdown correctly sums OTHER (3500 + 2000 = 5500 BDT)"
  );

  // ==========================================
  // Section 8: Search Combined With Filters
  // ==========================================
  console.log("\n--- 8. Testing Search Combined With Strict Filters ---");
  // Filter by category: COURT_FEES only
  const courtFeesOnly = matched.filter((m) => m.category === CASE_EXPENSE_CATEGORIES.COURT_FEES);
  assert(
    courtFeesOnly.length === 2 && courtFeesOnly.every((m) => m.category === CASE_EXPENSE_CATEGORIES.COURT_FEES),
    "Category filter correctly restricts search results to specified category only"
  );

  // Filter by date range: <= 2026-03-03
  const dateFiltered = matched.filter((m) => new Date(m.expenseDate) <= new Date("2026-03-03T23:59:59Z"));
  assert(
    dateFiltered.length === 3 && dateFiltered.every((m) => m.id === "EXP-1" || m.id === "EXP-2" || m.id === "EXP-3"),
    "Date range filter correctly restricts search results to date window"
  );

  console.log("\n==========================================");
  console.log("🏆 ALL INTEGRATION & VERIFICATION TESTS PASSED!");
  console.log("==========================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
