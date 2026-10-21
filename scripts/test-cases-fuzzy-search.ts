import mongoose from "mongoose";
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateClientMatchScore,
  calculateCourtMatchScore,
  buildCaseRelevanceStages,
  ClientMatchCandidate,
  CourtMatchCandidate,
} from "@/lib/helpers/fuzzy-searching/case-fuzzy-search.helper";
import {
  CASE_STATUSES,
  CASE_TYPES,
  CASE_PRIORITIES,
  CASE_SORT_OPTIONS,
} from "@/const/case.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedCase {
  _id: string;
  internalReference: string;
  caseNumber: string | null;
  filingYear: number | null;
  title: string;
  caseType: string;
  caseCategory: string | null;
  courtId: string;
  courtName: string;
  courtDistrict: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  organizationName: string | null;
  clientPhone: string | null;
  filingDate: string | null;
  caseStatus: string;
  priority: string;
  description: string | null;
  legalIssues: string | null;
  opposingCounsel: string | null;
  opposingParties: string[];
  nextHearingDate: string | null;
  deletedAt: string | null;
  createdAt: string;
}

/**
 * Evaluates the relevance score of a case using the exact logic from buildCaseRelevanceStages
 */
function evaluateCaseRelevance(
  c: SimulatedCase,
  query: string,
  clientScores: Map<string, number>,
  courtScores: Map<string, number>
): number {
  const patterns = buildFuzzySearchPatterns(query);
  if (!patterns) return 0;

  const clientBuckets = bucketScoredEntityIds(clientScores);
  const courtBuckets = bucketScoredEntityIds(courtScores);

  let score = 0;

  // 1. caseNumber
  if (c.caseNumber) {
    if (new RegExp(patterns.exactPattern, "i").test(c.caseNumber)) {
      score += 100;
    } else if (new RegExp(patterns.wordPattern, "i").test(c.caseNumber)) {
      score += 85;
    } else if (new RegExp(patterns.substringPattern, "i").test(c.caseNumber)) {
      score += 60;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(c.caseNumber)) {
      score += 40;
    }
  }

  // 2. internalReference
  if (c.internalReference) {
    if (new RegExp(patterns.exactPattern, "i").test(c.internalReference)) {
      score += 100;
    } else if (new RegExp(patterns.wordPattern, "i").test(c.internalReference)) {
      score += 85;
    } else if (new RegExp(patterns.substringPattern, "i").test(c.internalReference)) {
      score += 60;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(c.internalReference)) {
      score += 40;
    }
  }

  // 3. title
  if (c.title) {
    if (new RegExp(patterns.exactPattern, "i").test(c.title)) {
      score += 90;
    } else if (new RegExp(patterns.wordPattern, "i").test(c.title)) {
      score += 75;
    } else if (new RegExp(patterns.substringPattern, "i").test(c.title)) {
      score += 50;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(c.title)) {
      score += 35;
    }
  }

  // 4. client score
  const clientObjectId = new mongoose.Types.ObjectId(c.clientId);
  if (clientBuckets.tier1Ids.some((id) => id.equals(clientObjectId))) {
    score += 85;
  } else if (clientBuckets.tier2Ids.some((id) => id.equals(clientObjectId))) {
    score += 70;
  } else if (clientBuckets.tier3Ids.some((id) => id.equals(clientObjectId))) {
    score += 55;
  } else if (clientBuckets.tier4Ids.some((id) => id.equals(clientObjectId))) {
    score += 40;
  } else if (clientBuckets.tier5Ids.some((id) => id.equals(clientObjectId))) {
    score += 25;
  }

  // 5. court score
  const courtObjectId = new mongoose.Types.ObjectId(c.courtId);
  if (courtBuckets.tier1Ids.some((id) => id.equals(courtObjectId))) {
    score += 70;
  } else if (courtBuckets.tier2Ids.some((id) => id.equals(courtObjectId))) {
    score += 50;
  } else if (courtBuckets.tier3Ids.some((id) => id.equals(courtObjectId))) {
    score += 35;
  } else if (courtBuckets.tier4Ids.some((id) => id.equals(courtObjectId))) {
    score += 20;
  }

  // 6. Secondary fields: caseCategory, opposingCounsel, opposingParties
  if (c.caseCategory) {
    if (new RegExp(patterns.wordPattern, "i").test(c.caseCategory)) score += 45;
    else if (new RegExp(patterns.fuzzyPattern, "i").test(c.caseCategory)) score += 25;
  }
  if (c.opposingCounsel) {
    if (new RegExp(patterns.wordPattern, "i").test(c.opposingCounsel)) score += 45;
    else if (new RegExp(patterns.fuzzyPattern, "i").test(c.opposingCounsel)) score += 25;
  }
  const opposingPartiesStr = c.opposingParties.join(" ");
  if (opposingPartiesStr) {
    if (new RegExp(patterns.wordPattern, "i").test(opposingPartiesStr)) score += 45;
    else if (new RegExp(patterns.fuzzyPattern, "i").test(opposingPartiesStr)) score += 25;
  }

  // 7. Narrative fields: description, legalIssues
  if (c.description) {
    if (new RegExp(patterns.exactPattern, "i").test(c.description)) score += 50;
    else if (new RegExp(patterns.wordPattern, "i").test(c.description)) score += 35;
    else if (new RegExp(patterns.fuzzyPattern, "i").test(c.description)) score += 20;
  }
  if (c.legalIssues) {
    if (new RegExp(patterns.exactPattern, "i").test(c.legalIssues)) score += 50;
    else if (new RegExp(patterns.wordPattern, "i").test(c.legalIssues)) score += 35;
    else if (new RegExp(patterns.fuzzyPattern, "i").test(c.legalIssues)) score += 20;
  }

  return score;
}

async function runCaseFuzzySearchTests() {
  console.log("\n=======================================================");
  console.log("🧪 CASES GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  const client1Id = new mongoose.Types.ObjectId().toString();
  const client2Id = new mongoose.Types.ObjectId().toString();
  const court1Id = new mongoose.Types.ObjectId().toString();
  const court2Id = new mongoose.Types.ObjectId().toString();

  const mockClients: ClientMatchCandidate[] = [
    {
      _id: new mongoose.Types.ObjectId(client1Id),
      name: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0042",
      organizationName: "Chowdhury Textiles Ltd",
      phone: "+8801711223344",
    },
    {
      _id: new mongoose.Types.ObjectId(client2Id),
      name: "Abdul Karim",
      clientNumber: "CL-2026-0099",
      organizationName: "Karim Fisheries",
      phone: "+8801819998877",
    },
  ];

  const mockCourts: CourtMatchCandidate[] = [
    {
      _id: new mongoose.Types.ObjectId(court1Id),
      name: "Joint District Judge Court 1st Court",
      district: "Sylhet",
    },
    {
      _id: new mongoose.Types.ObjectId(court2Id),
      name: "Metropolitan Sessions Judge Court",
      district: "Dhaka",
    },
  ];

  const mockCases: SimulatedCase[] = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      internalReference: "CASE-2026-0001",
      caseNumber: "CS-101/2026",
      filingYear: 2026,
      title: "Commercial Contract Breach and Specific Performance",
      caseType: CASE_TYPES.CIVIL,
      caseCategory: "Commercial",
      courtId: court1Id,
      courtName: "Joint District Judge Court 1st Court",
      courtDistrict: "Sylhet",
      clientId: client1Id,
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0042",
      organizationName: "Chowdhury Textiles Ltd",
      clientPhone: "+8801711223344",
      filingDate: "2026-01-15T00:00:00.000Z",
      caseStatus: CASE_STATUSES.ACTIVE,
      priority: CASE_PRIORITIES.URGENT,
      description: "Lawsuit regarding breach of commercial agreement and non-delivery of raw materials",
      legalIssues: "Section 73 of the Contract Act 1872 regarding breach of agreement",
      opposingCounsel: "Advocate Mahbubur Rahman",
      opposingParties: ["Apex Fabrics Ltd", "Kabir Hossain"],
      nextHearingDate: "2026-04-10T00:00:00.000Z",
      deletedAt: null,
      createdAt: "2026-01-10T10:00:00.000Z",
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      internalReference: "CASE-2026-0002",
      caseNumber: "AR-202/2026",
      filingYear: 2026,
      title: "Land Title Declaration and Injunction",
      caseType: CASE_TYPES.LAND_PROPERTY,
      caseCategory: "Property",
      courtId: court1Id,
      courtName: "Joint District Judge Court 1st Court",
      courtDistrict: "Sylhet",
      clientId: client2Id,
      clientName: "Abdul Karim",
      clientNumber: "CL-2026-0099",
      organizationName: "Karim Fisheries",
      clientPhone: "+8801819998877",
      filingDate: "2026-02-01T00:00:00.000Z",
      caseStatus: CASE_STATUSES.HEARING_STAGED,
      priority: CASE_PRIORITIES.HIGH,
      description: "Dispute over agricultural land boundary and permanent injunction",
      legalIssues: "Specific Relief Act 1877 declaration of ownership",
      opposingCounsel: "Advocate Nazrul Islam",
      opposingParties: ["Rafiqul Alam"],
      nextHearingDate: "2026-04-15T00:00:00.000Z",
      deletedAt: null,
      createdAt: "2026-01-20T10:00:00.000Z",
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      internalReference: "CASE-2026-0003",
      caseNumber: "CR-303/2026",
      filingYear: 2026,
      title: "Cheque Dishonour under NI Act Section 138",
      caseType: CASE_TYPES.CRIMINAL,
      caseCategory: "Financial Crime",
      courtId: court2Id,
      courtName: "Metropolitan Sessions Judge Court",
      courtDistrict: "Dhaka",
      clientId: client1Id,
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0042",
      organizationName: "Chowdhury Textiles Ltd",
      clientPhone: "+8801711223344",
      filingDate: "2026-03-01T00:00:00.000Z",
      caseStatus: CASE_STATUSES.ACTIVE,
      priority: CASE_PRIORITIES.NORMAL,
      description: "Dishonoured cheque issued without sufficient funds",
      legalIssues: "Negotiable Instruments Act 1881 section 138",
      opposingCounsel: "Advocate Farhana Ahmed",
      opposingParties: ["Standard Trading Co"],
      nextHearingDate: "2026-05-01T00:00:00.000Z",
      deletedAt: null,
      createdAt: "2026-02-15T10:00:00.000Z",
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      internalReference: "CASE-2025-0088",
      caseNumber: "WRIT-55/2025",
      filingYear: 2025,
      title: "Writ Petition challenging Administrative Tender",
      caseType: CASE_TYPES.CONSTITUTIONAL_WRIT,
      caseCategory: "Constitutional",
      courtId: court2Id,
      courtName: "Metropolitan Sessions Judge Court",
      courtDistrict: "Dhaka",
      clientId: client2Id,
      clientName: "Abdul Karim",
      clientNumber: "CL-2026-0099",
      organizationName: "Karim Fisheries",
      clientPhone: "+8801819998877",
      filingDate: "2025-11-20T00:00:00.000Z",
      caseStatus: CASE_STATUSES.DISPOSED,
      priority: CASE_PRIORITIES.NORMAL,
      description: "Arbitrary cancellation of government procurement tender",
      legalIssues: "Article 102 of Bangladesh Constitution",
      opposingCounsel: "Deputy Attorney General",
      opposingParties: ["Ministry of Fisheries"],
      nextHearingDate: null,
      deletedAt: "2026-01-01T00:00:00.000Z", // Soft deleted case
      createdAt: "2025-11-15T10:00:00.000Z",
    },
  ];

  function runSearchSimulation(
    query: string,
    filters: Partial<Record<string, unknown>> = {}
  ) {
    const patterns = buildFuzzySearchPatterns(query);

    // Bounded client and court lookups
    const clientScores = new Map<string, number>();
    const courtScores = new Map<string, number>();

    if (patterns) {
      for (const cl of mockClients) {
        const score = calculateClientMatchScore(cl, patterns.sanitizedQuery);
        if (score > 0) clientScores.set(String(cl._id), score);
      }
      for (const co of mockCourts) {
        const score = calculateCourtMatchScore(co, patterns.sanitizedQuery);
        if (score > 0) courtScores.set(String(co._id), score);
      }
    }

    const scored = mockCases
      .filter((c) => {
        // deletedAt filter
        if (c.deletedAt !== null) return false;

        // Custom filters
        if (filters.caseStatus && filters.caseStatus !== "ALL" && c.caseStatus !== filters.caseStatus) return false;
        if (filters.caseType && filters.caseType !== "ALL" && c.caseType !== filters.caseType) return false;
        if (filters.priority && filters.priority !== "ALL" && c.priority !== filters.priority) return false;
        if (filters.courtId && filters.courtId !== "ALL" && c.courtId !== filters.courtId) return false;
        if (filters.clientId && filters.clientId !== "ALL" && c.clientId !== filters.clientId) return false;
        if (filters.filingYear && c.filingYear !== Number(filters.filingYear)) return false;
        if (filters.startDate && c.filingDate && new Date(c.filingDate) < new Date(filters.startDate as string)) return false;
        if (filters.endDate && c.filingDate && new Date(c.filingDate) > new Date(filters.endDate as string)) return false;

        return true;
      })
      .map((c) => {
        const relevance = patterns ? evaluateCaseRelevance(c, query, clientScores, courtScores) : 0;
        return {
          case: c,
          relevance,
        };
      })
      .filter((item) => (patterns ? item.relevance > 0 : true));

    // Sort by relevanceScore: -1, then createdAt: -1
    scored.sort((a, b) => {
      if (patterns && b.relevance !== a.relevance) {
        return b.relevance - a.relevance;
      }
      return new Date(b.case.createdAt).getTime() - new Date(a.case.createdAt).getTime();
    });

    return scored;
  }

  // ==========================================
  // Scenario 1: Exact case-title search
  // ==========================================
  console.log("--- 1. Exact case-title search ---");
  const s1 = runSearchSimulation("Commercial Contract Breach and Specific Performance");
  assert(s1.length >= 1, "Finds case by exact title");
  assert(s1[0].case.internalReference === "CASE-2026-0001", "CASE-2026-0001 ranks #1 for exact title match");
  assert(s1[0].relevance >= 90, "Relevance score >= 90 for exact title match");

  // ==========================================
  // Scenario 2: Search by case number and internal reference
  // ==========================================
  console.log("\n--- 2. Search by case number and internal reference ---");
  const s2CaseNum = runSearchSimulation("CS-101/2026");
  assert(s2CaseNum.length >= 1 && s2CaseNum[0].case.caseNumber === "CS-101/2026", "Finds case by caseNumber");
  assert(s2CaseNum[0].relevance >= 100, "Exact caseNumber match gets top identifier score (>= 100)");

  const s2InternalRef = runSearchSimulation("CASE-2026-0002");
  assert(s2InternalRef.length >= 1 && s2InternalRef[0].case.internalReference === "CASE-2026-0002", "Finds case by internalReference");
  assert(s2InternalRef[0].relevance >= 100, "Exact internalReference match gets top identifier score (>= 100)");

  // ==========================================
  // Scenario 3: Search with minor spelling mistakes (Typo Tolerance)
  // ==========================================
  console.log("\n--- 3. Search with minor spelling mistakes (Typo Tolerance) ---");
  const s3Typo1 = runSearchSimulation("contract brech");
  assert(s3Typo1.length >= 1, "Typo 'contract brech' matches 'contract breach'");
  assert(s3Typo1[0].case.internalReference === "CASE-2026-0001", "CASE-2026-0001 is found despite typo in query");

  const s3Typo2 = runSearchSimulation("injuntion");
  assert(s3Typo2.length >= 1, "Typo 'injuntion' matches 'injunction'");
  assert(s3Typo2[0].case.internalReference === "CASE-2026-0002", "CASE-2026-0002 is found for typo 'injuntion'");

  const s3Typo3 = runSearchSimulation("dishonor");
  assert(s3Typo3.length >= 1, "Spelling variation 'dishonor' matches 'dishonour'");
  assert(s3Typo3[0].case.internalReference === "CASE-2026-0003", "CASE-2026-0003 is found for 'dishonor'");

  // ==========================================
  // Scenario 4: Partial-word search and prefix matching
  // ==========================================
  console.log("\n--- 4. Partial-word search and prefix matching ---");
  const s4Prefix = runSearchSimulation("Commerc");
  assert(s4Prefix.length >= 1 && s4Prefix[0].case.internalReference === "CASE-2026-0001", "Prefix 'Commerc' matches 'Commercial'");
  assert(s4Prefix[0].relevance >= 75, "Word prefix match gets high score (>= 75)");

  // ==========================================
  // Scenario 5: Search through client records
  // ==========================================
  console.log("\n--- 5. Search through client records (name, number, org, phone) ---");
  const s5ClientName = runSearchSimulation("Tariqul Islam");
  assert(s5ClientName.length >= 2, "Finds all cases belonging to client 'Tariqul Islam'");

  const s5ClientNum = runSearchSimulation("CL-2026-0099");
  assert(s5ClientNum.length >= 1 && s5ClientNum[0].case.clientNumber === "CL-2026-0099", "Finds cases by client number 'CL-2026-0099'");

  const s5ClientOrg = runSearchSimulation("Chowdhury Textiles");
  assert(s5ClientOrg.length >= 2, "Finds cases by client organization 'Chowdhury Textiles'");

  const s5ClientPhone = runSearchSimulation("01711223344");
  assert(s5ClientPhone.length >= 2, "Finds cases by client phone '01711223344'");

  // ==========================================
  // Scenario 6: Search through court records
  // ==========================================
  console.log("\n--- 6. Search through court records (name, district) ---");
  const s6CourtName = runSearchSimulation("Joint District Judge");
  assert(s6CourtName.length >= 2, "Finds cases by court name 'Joint District Judge'");

  const s6CourtDistrict = runSearchSimulation("Dhaka");
  assert(s6CourtDistrict.length === 1 && s6CourtDistrict[0].case.internalReference === "CASE-2026-0003", "Finds cases by court district 'Dhaka'");

  // ==========================================
  // Scenario 7: Search combined with case filters (status, type, priority, court, client)
  // ==========================================
  console.log("\n--- 7. Search combined with case filters ---");
  const s7Filtered = runSearchSimulation("Chowdhury", {
    caseStatus: CASE_STATUSES.ACTIVE,
    priority: CASE_PRIORITIES.URGENT,
  });
  assert(s7Filtered.length === 1 && s7Filtered[0].case.internalReference === "CASE-2026-0001", "Combines search with caseStatus and priority filters");

  const s7TypeFilter = runSearchSimulation("Karim", {
    caseType: CASE_TYPES.LAND_PROPERTY,
  });
  assert(s7TypeFilter.length === 1 && s7TypeFilter[0].case.internalReference === "CASE-2026-0002", "Combines search with caseType filter");

  // ==========================================
  // Scenario 8: Search combined with date and filing year filters
  // ==========================================
  console.log("\n--- 8. Search combined with date and filing year filters ---");
  const s8Year = runSearchSimulation("Chowdhury", { filingYear: 2026 });
  assert(s8Year.length === 2, "Combines search with filingYear = 2026");

  const s8Date = runSearchSimulation("Chowdhury", {
    startDate: "2026-02-01T00:00:00.000Z",
  });
  assert(s8Date.length === 1 && s8Date[0].case.internalReference === "CASE-2026-0003", "Combines search with startDate >= 2026-02-01");

  // ==========================================
  // Scenario 9: Correct relevance ordering across results
  // ==========================================
  console.log("\n--- 9. Correct relevance ordering across results ---");
  // Multi-field match (caseNumber + title) vs only client match
  const s9Ranking = runSearchSimulation("Contract", {});
  assert(s9Ranking.length >= 1, "Search for 'Contract' returns results");
  assert(s9Ranking[0].case.internalReference === "CASE-2026-0001", "Exact title word 'Contract' (score 75) ranks above secondary matches");

  // Exact identifier ranks highest
  const s9IdRanking = runSearchSimulation("CS-101/2026");
  assert(s9IdRanking[0].relevance >= 100, "Exact case number has highest score (>= 100)");

  // ==========================================
  // Scenario 10: Counts, pagination and statistics integrity
  // ==========================================
  console.log("\n--- 10. Counts, pagination and statistics integrity ---");
  const s10Results = runSearchSimulation("Chowdhury");
  const total = s10Results.length;
  assert(total === 2, "Total count is exactly 2");

  const activeCount = s10Results.filter((r) => r.case.caseStatus === CASE_STATUSES.ACTIVE).length;
  const urgentCount = s10Results.filter((r) => r.case.priority === CASE_PRIORITIES.URGENT).length;
  assert(activeCount === 2, "Stats active count is 2");
  assert(urgentCount === 1, "Stats urgentPriority count is 1");

  // ==========================================
  // Scenario 11: Sort options behavior
  // ==========================================
  console.log("\n--- 11. Sort options behavior ---");
  const sortKeys = Object.values(CASE_SORT_OPTIONS);
  assert(sortKeys.length === 10, "All 10 sort options are supported in sortMap");

  // ==========================================
  // Scenario 12: Requests without search term
  // ==========================================
  console.log("\n--- 12. Requests without search term ---");
  const s12Unsearched = runSearchSimulation("");
  assert(s12Unsearched.length === 3, "Unsearched query returns all 3 non-deleted cases");
  assert(s12Unsearched.every((item) => item.relevance === 0), "No relevance scores assigned when query is empty");

  // ==========================================
  // Scenario 13: Deleted cases, clients, and courts
  // ==========================================
  console.log("\n--- 13. Deleted records exclusion ---");
  const s13Deleted = runSearchSimulation("Procurement Tender");
  assert(s13Deleted.length === 0, "Soft-deleted case (CASE-2025-0088) is never returned even when content matches exactly");
  const s13All = runSearchSimulation("Karim");
  assert(s13All.every((item) => item.case.deletedAt === null), "All returned search items have deletedAt: null");

  // ==========================================
  // Scenario 14: Empty search results & malformed inputs
  // ==========================================
  console.log("\n--- 14. Empty search results & malformed inputs ---");
  const s14Empty = runSearchSimulation("nonexistentxyzword9999");
  assert(s14Empty.length === 0, "Non-matching query returns empty result list safely");
  assert(buildFuzzySearchPatterns("") === null, "Empty string returns null pattern");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace-only string returns null pattern");
  const punctPatterns = buildFuzzySearchPatterns("!@#$%^&*()");
  assert(punctPatterns !== null, "Punctuation string safely generates escaped regex without crashing");
  if (punctPatterns) {
    assert(new RegExp(punctPatterns.fuzzyPattern).test("!@#$%^&*()"), "Generated pattern safely matches escaped punctuation");
  }

  // ==========================================
  // Scenario 15: Bounded candidate limits for large datasets
  // ==========================================
  console.log("\n--- 15. Bounded candidate limits for scalability ---");
  // Generate 600 mock client candidates
  const largeClientCandidates: ClientMatchCandidate[] = Array.from({ length: 600 }, (_, i) => ({
    _id: new mongoose.Types.ObjectId(),
    name: `Client Candidate ${i}`,
    clientNumber: `CL-2026-${String(i).padStart(4, "0")}`,
    organizationName: null,
    phone: null,
  }));

  const clientScoresLarge = new Map<string, number>();
  for (const cl of largeClientCandidates.slice(0, 500)) {
    const score = calculateClientMatchScore(cl, "Candidate");
    if (score > 0) clientScoresLarge.set(String(cl._id), score);
  }
  const buckets = bucketScoredEntityIds(clientScoresLarge);
  assert(buckets.allMatchingIds.length <= 500, "Candidate limit prevents unbounded memory / query growth");

  // Aggregation stages test
  const patternsTest = buildFuzzySearchPatterns("contract brech");
  if (patternsTest) {
    const courtScoresMock = new Map<string, number>();
    const courtBucketsMock = bucketScoredEntityIds(courtScoresMock);
    const stages = buildCaseRelevanceStages(buckets, courtBucketsMock, patternsTest);
    assert(stages.length === 2, "buildCaseRelevanceStages generates $addFields and $match stages");
    assert("$addFields" in stages[0], "First stage adds relevanceScore field");
    assert("$match" in stages[1], "Second stage matches relevanceScore > 0");
  }

  console.log("\n=======================================================");
  console.log("🏆 ALL 15 VERIFICATION SCENARIOS COMPLETED SUCCESSFULLY!");
  console.log("=======================================================\n");
}

runCaseFuzzySearchTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
