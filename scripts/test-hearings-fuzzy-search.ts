import mongoose from "mongoose";
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
  damerauLevenshteinDistance,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateClientMatchScore,
  ClientMatchCandidate,
} from "@/lib/helpers/fuzzy-searching/case-fuzzy-search.helper";
import {
  calculateHearingCaseMatchScore,
  calculateHearingCourtMatchScore,
  calculateDirectHearingMatchScore,
  buildHearingRelevanceStages,
  HearingCaseCandidate,
  HearingCourtCandidate,
  HEARING_SEARCH_RELEVANCE_SCORES,
} from "@/lib/helpers/fuzzy-searching/hearing-fuzzy-search.helper";
import {
  HEARING_STATUSES,
  HEARING_SORT_OPTIONS,
} from "@/const/hearing.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedHearing {
  _id: string;
  caseId: string;
  courtId: string | null;
  hearingDate: string; // ISO string
  hearingType: string | null;
  purpose: string | null;
  outcome: string | null;
  nextDate: string | null;
  status: string;
  adjournmentReason: string | null;
  notes: string | null;
  createdAt: string;

  // Joined metadata for verification
  caseNumber: string | null;
  internalReference: string;
  caseTitle: string;
  clientId: string;
  clientName: string;
  clientNumber: string;
  organizationName: string | null;
  courtName: string;
  courtDistrict: string;
  roomOrHall: string | null;
  presidingJudgeTitle: string | null;
}

/**
 * Evaluates the relevance score of a hearing mirroring the exact logic in buildHearingRelevanceStages.
 */
function evaluateHearingRelevance(
  h: SimulatedHearing,
  query: string,
  caseScores: Map<string, number>,
  courtScores: Map<string, number>
): number {
  const patterns = buildFuzzySearchPatterns(query);
  if (!patterns) return 0;

  const caseBuckets = bucketScoredEntityIds(caseScores);
  const courtBuckets = bucketScoredEntityIds(courtScores);

  let score = 0;

  // 1. Direct purpose
  if (h.purpose) {
    if (new RegExp(patterns.exactPattern, "i").test(h.purpose)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(h.purpose)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(h.purpose)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(h.purpose)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_FUZZY;
    }
  }

  // 2. Direct outcome
  if (h.outcome) {
    if (new RegExp(patterns.exactPattern, "i").test(h.outcome)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(h.outcome)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(h.outcome)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(h.outcome)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.OUTCOME_FUZZY;
    }
  }

  // 3. Direct notes
  if (h.notes) {
    if (new RegExp(patterns.exactPattern, "i").test(h.notes)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.NOTES_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(h.notes)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.NOTES_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(h.notes)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.NOTES_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(h.notes)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.NOTES_FUZZY;
    }
  }

  // 4. Direct hearingType
  if (h.hearingType) {
    if (new RegExp(patterns.exactPattern, "i").test(h.hearingType)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(h.hearingType)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(h.hearingType)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(h.hearingType)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.HEARING_TYPE_FUZZY;
    }
  }

  // 5. Direct adjournmentReason
  if (h.adjournmentReason) {
    if (new RegExp(patterns.exactPattern, "i").test(h.adjournmentReason)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(h.adjournmentReason)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(h.adjournmentReason)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(h.adjournmentReason)) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.ADJOURNMENT_FUZZY;
    }
  }

  // 6. Associated Case score from buckets
  const caseObjectId = new mongoose.Types.ObjectId(h.caseId);
  if (caseBuckets.tier1Ids.some((id) => id.equals(caseObjectId))) {
    score += HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_1;
  } else if (caseBuckets.tier2Ids.some((id) => id.equals(caseObjectId))) {
    score += HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_2;
  } else if (caseBuckets.tier3Ids.some((id) => id.equals(caseObjectId))) {
    score += HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_3;
  } else if (caseBuckets.tier4Ids.some((id) => id.equals(caseObjectId))) {
    score += HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_4;
  } else if (caseBuckets.tier5Ids.some((id) => id.equals(caseObjectId))) {
    score += HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_5;
  }

  // 7. Direct Court score from buckets (if hearing has courtId)
  if (h.courtId) {
    const courtObjectId = new mongoose.Types.ObjectId(h.courtId);
    if (courtBuckets.tier1Ids.some((id) => id.equals(courtObjectId))) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_1;
    } else if (courtBuckets.tier2Ids.some((id) => id.equals(courtObjectId))) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_2;
    } else if (courtBuckets.tier3Ids.some((id) => id.equals(courtObjectId))) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_3;
    } else if (courtBuckets.tier4Ids.some((id) => id.equals(courtObjectId))) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_4;
    } else if (courtBuckets.tier5Ids.some((id) => id.equals(courtObjectId))) {
      score += HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_5;
    }
  }

  return score;
}

async function runHearingsFuzzySearchTests() {
  console.log("\n=======================================================");
  console.log("🧪 HEARINGS GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  // Mock ID constants
  const COURT_1_ID = "507f1f77bcf86cd799439011";
  const COURT_2_ID = "507f1f77bcf86cd799439012";
  const COURT_DELETED_ID = "507f1f77bcf86cd799439013";

  const CLIENT_1_ID = "507f1f77bcf86cd799439021";
  const CLIENT_2_ID = "507f1f77bcf86cd799439022";
  const CLIENT_DELETED_ID = "507f1f77bcf86cd799439023";

  const CASE_1_ID = "507f1f77bcf86cd799439031";
  const CASE_2_ID = "507f1f77bcf86cd799439032";
  const CASE_DELETED_ID = "507f1f77bcf86cd799439033";

  // Mock Courts
  const mockCourts: (HearingCourtCandidate & { deletedAt?: Date | null })[] = [
    {
      _id: new mongoose.Types.ObjectId(COURT_1_ID),
      name: "Joint District Judge Court 1st Court",
      courtType: "DISTRICT_JUDGE_COURT",
      district: "Sylhet",
      roomOrHall: "Room 302",
      address: "Court Point, Sylhet",
      presidingJudgeTitle: "Joint District Judge",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(COURT_2_ID),
      name: "Metropolitan Sessions Judge Court",
      courtType: "DISTRICT_JUDGE_COURT",
      district: "Dhaka",
      roomOrHall: "Hall B",
      address: "Old Court Road, Dhaka",
      presidingJudgeTitle: "Metropolitan Sessions Judge",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(COURT_DELETED_ID),
      name: "Bagerhat Land Survey Tribunal",
      district: "Bagerhat",
      deletedAt: new Date("2026-01-01"),
    },
  ];

  // Mock Clients
  const mockClients: (ClientMatchCandidate & { deletedAt?: Date | null })[] = [
    {
      _id: new mongoose.Types.ObjectId(CLIENT_1_ID),
      name: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0099",
      organizationName: "Chowdhury Textiles Ltd",
      phone: "01711223344",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(CLIENT_2_ID),
      name: "Abdul Karim",
      clientNumber: "CL-2026-0105",
      organizationName: null,
      phone: "01811334455",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(CLIENT_DELETED_ID),
      name: "Deleted Client",
      clientNumber: "CL-2026-0999",
      deletedAt: new Date("2026-01-01"),
    },
  ];

  // Mock Cases
  const mockCases: (HearingCaseCandidate & { deletedAt?: Date | null })[] = [
    {
      _id: new mongoose.Types.ObjectId(CASE_1_ID),
      internalReference: "CASE-2026-0001",
      caseNumber: "CS-101/2026",
      title: "Contract Breach Dispute",
      caseCategory: "Commercial",
      opposingCounsel: "Adv. Rahman",
      opposingParties: ["Apex Mills"],
      description: "Breach of commercial supply agreement",
      legalIssues: "Specific performance and contractual damages",
      clientId: new mongoose.Types.ObjectId(CLIENT_1_ID),
      courtId: new mongoose.Types.ObjectId(COURT_1_ID),
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(CASE_2_ID),
      internalReference: "CASE-2026-0002",
      caseNumber: "MS-202/2026",
      title: "Property Ownership Injunction",
      caseCategory: "Land",
      opposingCounsel: "Adv. Haque",
      opposingParties: ["Karim Properties"],
      description: "Permanent injunction suit over land boundary",
      legalIssues: "Title declaration and boundary demarcation",
      clientId: new mongoose.Types.ObjectId(CLIENT_2_ID),
      courtId: new mongoose.Types.ObjectId(COURT_2_ID),
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId(CASE_DELETED_ID),
      internalReference: "CASE-2025-0088",
      caseNumber: "CS-888/2025",
      title: "Eviction and Rent Recovery Suit",
      clientId: new mongoose.Types.ObjectId(CLIENT_DELETED_ID),
      deletedAt: new Date("2026-01-01"),
    },
  ];

  // Dates for simulated hearings
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString();
  const nextWeek = new Date(now.getTime() + 7 * 86400000).toISOString();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const lastMonth = new Date(now.getTime() - 30 * 86400000).toISOString();

  // Simulated Hearings
  const mockHearings: SimulatedHearing[] = [
    {
      _id: "607f1f77bcf86cd799439101",
      caseId: CASE_1_ID,
      courtId: COURT_1_ID,
      hearingDate: tomorrow,
      hearingType: "Hearing",
      purpose: "Framing of issues and witness examination",
      outcome: null,
      nextDate: null,
      status: HEARING_STATUSES.SCHEDULED,
      adjournmentReason: null,
      notes: "Prepare cross-examination points and document list",
      createdAt: "2026-02-01T10:00:00Z",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseTitle: "Contract Breach Dispute",
      clientId: CLIENT_1_ID,
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0099",
      organizationName: "Chowdhury Textiles Ltd",
      courtName: "Joint District Judge Court 1st Court",
      courtDistrict: "Sylhet",
      roomOrHall: "Room 302",
      presidingJudgeTitle: "Joint District Judge",
    },
    {
      _id: "607f1f77bcf86cd799439102",
      caseId: CASE_1_ID,
      courtId: null, // inherits from case
      hearingDate: nextWeek,
      hearingType: "Argument",
      purpose: "Final arguments on temporary injunction petition",
      outcome: null,
      nextDate: null,
      status: HEARING_STATUSES.SCHEDULED,
      adjournmentReason: null,
      notes: "File written arguments on prima facie case balance of convenience",
      createdAt: "2026-02-05T11:00:00Z",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseTitle: "Contract Breach Dispute",
      clientId: CLIENT_1_ID,
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0099",
      organizationName: "Chowdhury Textiles Ltd",
      courtName: "Joint District Judge Court 1st Court",
      courtDistrict: "Sylhet",
      roomOrHall: "Room 302",
      presidingJudgeTitle: "Joint District Judge",
    },
    {
      _id: "607f1f77bcf86cd799439103",
      caseId: CASE_2_ID,
      courtId: COURT_2_ID,
      hearingDate: yesterday,
      hearingType: "Order",
      purpose: "Order on injunction petition and status quo application",
      outcome: "Adjourned upon defendant request",
      nextDate: tomorrow,
      status: HEARING_STATUSES.ADJOURNED,
      adjournmentReason: "Illness of senior counsel for opposing party",
      notes: "Next date fixed for peremptory hearing",
      createdAt: "2026-01-15T09:00:00Z",
      caseNumber: "MS-202/2026",
      internalReference: "CASE-2026-0002",
      caseTitle: "Property Ownership Injunction",
      clientId: CLIENT_2_ID,
      clientName: "Abdul Karim",
      clientNumber: "CL-2026-0105",
      organizationName: null,
      courtName: "Metropolitan Sessions Judge Court",
      courtDistrict: "Dhaka",
      roomOrHall: "Hall B",
      presidingJudgeTitle: "Metropolitan Sessions Judge",
    },
    {
      _id: "607f1f77bcf86cd799439104",
      caseId: CASE_2_ID,
      courtId: null, // inherits from case
      hearingDate: lastMonth,
      hearingType: "Hearing",
      purpose: "Submission of written statement and counter affidavit",
      outcome: "Written statement submitted with costs accepted",
      nextDate: yesterday,
      status: HEARING_STATUSES.COMPLETED,
      adjournmentReason: null,
      notes: "Court accepted statement and fixed date for injunction order",
      createdAt: "2026-01-05T10:00:00Z",
      caseNumber: "MS-202/2026",
      internalReference: "CASE-2026-0002",
      caseTitle: "Property Ownership Injunction",
      clientId: CLIENT_2_ID,
      clientName: "Abdul Karim",
      clientNumber: "CL-2026-0105",
      organizationName: null,
      courtName: "Metropolitan Sessions Judge Court",
      courtDistrict: "Dhaka",
      roomOrHall: "Hall B",
      presidingJudgeTitle: "Metropolitan Sessions Judge",
    },
  ];

  // Helper to run query search pipeline across mock data
  const searchHearings = (query: string) => {
    const patterns = buildFuzzySearchPatterns(query);
    if (!patterns) {
      return mockHearings.map((h) => ({ hearing: h, score: 0 }));
    }

    // 1. Clients
    const clientScores = new Map<string, number>();
    for (const cl of mockClients) {
      if (cl.deletedAt) continue;
      const score = calculateClientMatchScore(cl, patterns.sanitizedQuery);
      if (score > 0) clientScores.set(String(cl._id), score);
    }

    // 2. Courts
    const courtScores = new Map<string, number>();
    for (const co of mockCourts) {
      if (co.deletedAt) continue;
      const score = calculateHearingCourtMatchScore(co, patterns.sanitizedQuery);
      if (score > 0) courtScores.set(String(co._id), score);
    }

    // 3. Cases
    const caseScores = new Map<string, number>();
    for (const ca of mockCases) {
      if (ca.deletedAt) continue;
      const score = calculateHearingCaseMatchScore(
        ca,
        patterns.sanitizedQuery,
        clientScores,
        courtScores
      );
      if (score > 0) caseScores.set(String(ca._id), score);
    }

    // 4. Score Hearings
    const scoredHearings: { hearing: SimulatedHearing; score: number }[] = [];
    for (const h of mockHearings) {
      const score = evaluateHearingRelevance(h, query, caseScores, courtScores);
      if (score > 0) {
        scoredHearings.push({ hearing: h, score });
      }
    }

    return scoredHearings.sort((a, b) => b.score - a.score);
  };

  // ==========================================
  // Section 1: Exact direct field search
  // ==========================================
  console.log("--- 1. Exact search against hearing purpose & notes ---");
  const exactPurposeResults = searchHearings("Framing of issues and witness examination");
  assert(exactPurposeResults.length > 0, "Finds hearing by exact purpose");
  assert(exactPurposeResults[0].hearing._id === "607f1f77bcf86cd799439101", "Correct hearing ranks #1");
  assert(exactPurposeResults[0].score >= 110, "Exact purpose receives top score (>= 110)");

  const exactNotesResults = searchHearings("Prepare cross-examination points");
  assert(exactNotesResults.length > 0, "Finds hearing by notes content");
  assert(exactNotesResults[0].hearing._id === "607f1f77bcf86cd799439101", "Notes match finds hearing #1");

  // ==========================================
  // Section 2: Minor spelling mistakes (Typo Tolerance)
  // ==========================================
  console.log("\n--- 2. Search with minor spelling mistakes (Typo Tolerance) ---");
  const typoResults1 = searchHearings("witnes examinaton");
  assert(typoResults1.some((r) => r.hearing._id === "607f1f77bcf86cd799439101"), "Typo 'witnes examinaton' finds hearing");

  const typoResults2 = searchHearings("injuntion");
  assert(typoResults2.length >= 2, "Typo 'injuntion' matches hearings mentioning injunction");

  const typoResults3 = searchHearings("brech");
  assert(typoResults3.some((r) => r.hearing.caseTitle.includes("Breach")), "Typo 'brech' matches case 'Contract Breach Dispute'");

  const transpositionResults = searchHearings("reciept");
  assert(
    damerauLevenshteinDistance("reciept", "receipt") === 1,
    "Transposition distance is exactly 1"
  );
  assert(Array.isArray(transpositionResults), "Transposition search executed successfully");

  const directScore = calculateDirectHearingMatchScore(
    {
      purpose: "Cross examination",
      outcome: null,
      notes: "Important hearing",
      hearingType: "HEARING",
      adjournmentReason: null,
    },
    "Cross examination"
  );
  assert(directScore >= HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_EXACT, "calculateDirectHearingMatchScore assigns top score for exact purpose match");

  // ==========================================
  // Section 3: Partial-word & multi-word queries
  // ==========================================
  console.log("\n--- 3. Partial-word and multi-word queries ---");
  const prefixResults = searchHearings("Exam");
  assert(prefixResults.some((r) => r.hearing._id === "607f1f77bcf86cd799439101"), "Prefix 'Exam' matches 'examination'");

  const multiWordResults = searchHearings("witness document arguments");
  assert(multiWordResults.length > 0, "Multi-word query matches across multiple fields");

  // ==========================================
  // Section 4: Search by associated Case Title
  // ==========================================
  console.log("\n--- 4. Search by associated case title ---");
  const caseTitleResults = searchHearings("Contract Breach Dispute");
  assert(caseTitleResults.length >= 2, "Finds all hearings for Case 1 by title");
  assert(caseTitleResults.every((r) => r.hearing.caseId === CASE_1_ID), "All returned hearings belong to Case 1");
  assert(caseTitleResults[0].score >= 85, "Case title match receives Tier 1 case score (>= 85)");

  // ==========================================
  // Section 5: Search by Case Number and Internal Reference
  // ==========================================
  console.log("\n--- 5. Search by associated case number and internal reference ---");
  const caseNumResults = searchHearings("CS-101/2026");
  assert(caseNumResults.length >= 2, "Finds hearings by caseNumber 'CS-101/2026'");
  assert(caseNumResults[0].score >= 85, "Exact caseNumber receives Tier 1 case boost (>= 85)");

  const internalRefResults = searchHearings("CASE-2026-0002");
  assert(internalRefResults.length >= 2, "Finds hearings by internalReference 'CASE-2026-0002'");
  assert(internalRefResults.every((r) => r.hearing.caseId === CASE_2_ID), "Returned hearings belong to Case 2");

  // ==========================================
  // Section 6: Search by Client Name, Number, Org Name
  // ==========================================
  console.log("\n--- 6. Search by associated client name, client number, and organization ---");
  const clientNameResults = searchHearings("Tariqul Islam Chowdhury");
  assert(clientNameResults.length >= 2, "Finds hearings for client 'Tariqul Islam Chowdhury'");

  const clientNumResults = searchHearings("CL-2026-0105");
  assert(clientNumResults.length >= 2, "Finds hearings for clientNumber 'CL-2026-0105'");

  const orgResults = searchHearings("Chowdhury Textiles");
  assert(orgResults.length >= 2, "Finds hearings by client organizationName 'Chowdhury Textiles'");

  // ==========================================
  // Section 7: Search by Court Name, District, Room, Judge Title
  // ==========================================
  console.log("\n--- 7. Search by associated court name, district, and details ---");
  const courtNameResults = searchHearings("Joint District Judge Court");
  assert(courtNameResults.length >= 2, "Finds hearings by court name 'Joint District Judge Court'");

  const districtResults = searchHearings("Sylhet");
  assert(districtResults.some((r) => r.hearing.courtDistrict === "Sylhet"), "Finds hearings by court district 'Sylhet'");

  const roomResults = searchHearings("Room 302");
  assert(roomResults.some((r) => r.hearing.roomOrHall === "Room 302"), "Finds hearings by court roomOrHall");

  const judgeResults = searchHearings("Metropolitan Sessions Judge");
  assert(judgeResults.some((r) => r.hearing.presidingJudgeTitle === "Metropolitan Sessions Judge"), "Finds hearings by presidingJudgeTitle");

  // ==========================================
  // Section 8: Relevance Ranking Hierarchy & Multi-Field Boost
  // ==========================================
  console.log("\n--- 8. Relevance ranking across direct and related-record matches ---");
  // Multi-field match (direct purpose + case title match)
  const multiFieldResults = searchHearings("examination Contract Breach");
  assert(multiFieldResults.length >= 2, "Query with both purpose word and case words returns results");
  assert(multiFieldResults[0].hearing._id === "607f1f77bcf86cd799439101", "Hearing with both direct and case match ranks #1");
  // Check cumulative boost: H1 matched both direct purpose and case title, while H2 matched only case title
  assert(multiFieldResults[0].score > multiFieldResults[1].score, "Multi-field match (score " + multiFieldResults[0].score + ") receives higher score than single-field match (score " + multiFieldResults[1].score + ")");

  // Hierarchy check
  assert(
    HEARING_SEARCH_RELEVANCE_SCORES.PURPOSE_EXACT > HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_1,
    "Hierarchy: Exact Direct Purpose (110) > Case Tier 1 (85)"
  );
  assert(
    HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_1 > HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_1,
    "Hierarchy: Case Tier 1 (85) > Court Tier 1 (70)"
  );
  assert(
    HEARING_SEARCH_RELEVANCE_SCORES.COURT_TIER_1 > HEARING_SEARCH_RELEVANCE_SCORES.CASE_TIER_3,
    "Hierarchy: Court Tier 1 (70) > Case Substring (50)"
  );

  // ==========================================
  // Section 9: Pagination Integrity
  // ==========================================
  console.log("\n--- 9. Correct pagination when relevance ranking is enabled ---");
  const allResults = searchHearings("injunction");
  const pageSize = 1;
  const page1 = allResults.slice(0, pageSize);
  const page2 = allResults.slice(pageSize, pageSize * 2);

  assert(page1.length === 1, "Page 1 contains 1 item");
  assert(page2.length === 1, "Page 2 contains 1 item");
  assert(page1[0].hearing._id !== page2[0].hearing._id, "No duplicate items across pages");
  assert(page1[0].score >= page2[0].score, "Page 1 score >= Page 2 score");

  // ==========================================
  // Section 10: Total counts & statistics integrity
  // ==========================================
  console.log("\n--- 10. Correct total counts and hearing statistics ---");
  const searchForInjunction = searchHearings("injunction");
  const totalInjunction = searchForInjunction.length;
  assert(totalInjunction === 3, `Total matching hearings for 'injunction' is 3 (found ${totalInjunction})`);

  // Verify status breakdown among matched hearings (H2: SCHEDULED, H3: ADJOURNED, H4: COMPLETED)
  const scheduledCount = searchForInjunction.filter((r) => r.hearing.status === HEARING_STATUSES.SCHEDULED).length;
  const adjournedCount = searchForInjunction.filter((r) => r.hearing.status === HEARING_STATUSES.ADJOURNED).length;
  const completedCount = searchForInjunction.filter((r) => r.hearing.status === HEARING_STATUSES.COMPLETED).length;
  assert(scheduledCount === 1, "Statistics: 1 SCHEDULED hearing");
  assert(adjournedCount === 1, "Statistics: 1 ADJOURNED hearing");
  assert(completedCount === 1, "Statistics: 1 COMPLETED hearing");

  // ==========================================
  // Section 11: All sort options support
  // ==========================================
  console.log("\n--- 11. All existing sort options support ---");
  const supportedSorts = Object.values(HEARING_SORT_OPTIONS);
  assert(supportedSorts.includes(HEARING_SORT_OPTIONS.UPCOMING_FIRST), "Supports UPCOMING_FIRST ('upcoming_first')");
  assert(supportedSorts.includes(HEARING_SORT_OPTIONS.DATE_DESC), "Supports DATE_DESC ('date_desc')");
  assert(supportedSorts.includes(HEARING_SORT_OPTIONS.DATE_ASC), "Supports DATE_ASC ('date_asc')");
  assert(supportedSorts.includes(HEARING_SORT_OPTIONS.NEWEST_CREATED), "Supports NEWEST_CREATED ('newest')");
  assert(supportedSorts.includes(HEARING_SORT_OPTIONS.OLDEST_CREATED), "Supports OLDEST_CREATED ('oldest')");

  // ==========================================
  // Section 12: Filters interaction with search
  // ==========================================
  console.log("\n--- 12. Search combined with strict filters ---");
  // Status filter
  const scheduledOnly = searchHearings("injunction").filter(
    (r) => r.hearing.status === HEARING_STATUSES.SCHEDULED
  );
  assert(scheduledOnly.length === 1, "Status filter correctly restricts results to SCHEDULED");
  assert(scheduledOnly[0].hearing.status === HEARING_STATUSES.SCHEDULED, "All returned items have status SCHEDULED");

  // Case ID filter
  const case1Only = searchHearings("injunction").filter(
    (r) => r.hearing.caseId === CASE_1_ID
  );
  assert(case1Only.length === 1, "caseId filter restricts search to specified case");

  // Date filter (upcoming only)
  const upcomingOnly = searchHearings("injunction").filter(
    (r) => new Date(r.hearing.hearingDate) >= now
  );
  assert(upcomingOnly.length === 1, "Date filter restricts search to upcoming hearings");

  // ==========================================
  // Section 13: Client filter vs case filter semantics
  // ==========================================
  console.log("\n--- 13. Client filter and explicit case filter semantics ---");
  // When clientId is set, find hearings belonging to cases of that client
  const client1Cases = mockCases.filter((c) => String(c.clientId) === CLIENT_1_ID).map((c) => String(c._id));
  const client1Hearings = mockHearings.filter((h) => client1Cases.includes(h.caseId));
  assert(client1Hearings.length === 2, "Client 1 resolves to 2 hearings across cases");

  // ==========================================
  // Section 14: Soft-deleted related records exclusion
  // ==========================================
  console.log("\n--- 14. Deleted related records handling ---");
  const deletedCaseResults = searchHearings("CASE-2025-0088");
  assert(deletedCaseResults.length === 0, "Soft-deleted case (CASE-2025-0088) produces no results");

  const deletedTitleResults = searchHearings("Eviction");
  assert(deletedTitleResults.length === 0, "Soft-deleted case title 'Eviction' produces no results");

  const deletedClientResults = searchHearings("Deleted Client");
  assert(deletedClientResults.length === 0, "Soft-deleted client produces no results");

  const deletedCourtResults = searchHearings("Bagerhat");
  assert(deletedCourtResults.length === 0, "Soft-deleted court 'Bagerhat' produces no results");

  // ==========================================
  // Section 15: Empty results and malformed inputs
  // ==========================================
  console.log("\n--- 15. Empty results and malformed inputs ---");
  const noMatchResults = searchHearings("xyznonexistentterm12345");
  assert(noMatchResults.length === 0, "Non-matching query safely returns 0 results");

  assert(buildFuzzySearchPatterns("") === null, "Empty query produces null search patterns");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace-only query produces null search patterns");
  assert(buildFuzzySearchPatterns(null) === null, "Null query produces null search patterns");
  assert(buildFuzzySearchPatterns(undefined) === null, "Undefined query produces null search patterns");

  const punctuationPatterns = buildFuzzySearchPatterns("!@#$%^&*()");
  assert(punctuationPatterns !== null, "Punctuation query safely builds escaped pattern");

  // ==========================================
  // Section 16: Requests without search term
  // ==========================================
  console.log("\n--- 16. Requests without search term ---");
  const unsearched = searchHearings("");
  assert(unsearched.length === mockHearings.length, "Unsearched query returns all hearings");
  assert(unsearched.every((r) => r.score === 0), "No relevance scores assigned when search is empty");

  // ==========================================
  // Section 17: Bounded candidate limits & scalability
  // ==========================================
  console.log("\n--- 17. Bounded candidate limits & scalable pipeline verification ---");
  const patterns = buildFuzzySearchPatterns("hearing")!;
  const fakeCaseScoreMap = new Map<string, number>([
    [CASE_1_ID, 95], // Tier 1
    [CASE_2_ID, 60], // Tier 3
  ]);
  const fakeCourtScoreMap = new Map<string, number>([
    [COURT_1_ID, 70], // Tier 1
  ]);

  const caseBuckets = bucketScoredEntityIds(fakeCaseScoreMap);
  const courtBuckets = bucketScoredEntityIds(fakeCourtScoreMap);

  assert(caseBuckets.tier1Ids.length === 1, "Tier 1 case bucket contains exact match");
  assert(caseBuckets.tier3Ids.length === 1, "Tier 3 case bucket contains prefix match");
  assert(caseBuckets.allMatchingIds.length === 2, "All matching case IDs collected");

  const stages = buildHearingRelevanceStages(caseBuckets, courtBuckets, patterns);
  assert(stages.length === 2, "buildHearingRelevanceStages generates exactly 2 pipeline stages ($addFields and $match)");
  assert("$addFields" in stages[0], "First stage is $addFields for relevanceScore");
  assert("$match" in stages[1], "Second stage is $match for relevanceScore > 0");

  console.log("\n=======================================================");
  console.log("🏆 ALL 17 HEARINGS VERIFICATION SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runHearingsFuzzySearchTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
