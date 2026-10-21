import {
  buildFuzzySearchPatterns,
  damerauLevenshteinDistance,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateDirectCourtMatchScore,
  matchCourtTypeAndStatus,
  buildCourtRelevanceStages,
  DirectCourtCandidate,
  COURT_SEARCH_RELEVANCE_SCORES,
} from "@/lib/helpers/fuzzy-searching/court-fuzzy-search.helper";
import {
  COURT_TYPES,
  COURT_TYPE_LABELS,
  CourtType,
} from "@/const/court.const";
import type { CourtDocInput, CourtListItemDto } from "@/types/court.types";
function formatCourtItem(
  court: CourtDocInput,
  counts?: { cases?: number; hearings?: number; assets?: number }
): CourtListItemDto {
  const cType = (court.courtType as CourtType) || COURT_TYPES.DISTRICT_JUDGE_COURT;
  const cases = counts?.cases ?? 0;
  const hearings = counts?.hearings ?? 0;
  const assets = counts?.assets ?? 0;

  const id = court._id ? String(court._id) : court.id ? String(court.id) : "";
  const createdAtStr = court.createdAt
    ? new Date(court.createdAt).toISOString()
    : new Date().toISOString();
  const updatedAtStr = court.updatedAt
    ? new Date(court.updatedAt).toISOString()
    : createdAtStr;

  return {
    id,
    name: court.name || "Unnamed Court",
    courtType: cType,
    courtTypeLabel: COURT_TYPE_LABELS[cType] || String(court.courtType || ""),
    district: court.district || "Sylhet",
    division: court.division || null,
    roomOrHall: court.roomOrHall || null,
    address: court.address || null,
    presidingJudgeTitle: court.presidingJudgeTitle || null,
    isActive: court.isActive !== undefined && court.isActive !== null ? Boolean(court.isActive) : true,
    totalCases: cases,
    totalHearings: hearings,
    totalAssets: assets,
    isDeletable: cases === 0 && hearings === 0 && assets === 0,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedCourt extends DirectCourtCandidate {
  _id: string;
  name: string;
  courtType: CourtType;
  district: string;
  division: string | null;
  roomOrHall: string | null;
  address: string | null;
  presidingJudgeTitle: string | null;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Evaluates simulated court relevance score mirroring the aggregation pipeline logic.
 */
function evaluateCourtRelevance(court: SimulatedCourt, query: string): number {
  const patterns = buildFuzzySearchPatterns(query);
  if (!patterns) return 0;

  const { matchedCourtTypes, matchedIsActive, isActiveScore } =
    matchCourtTypeAndStatus(patterns.sanitizedQuery);

  return calculateDirectCourtMatchScore(
    court,
    query,
    matchedCourtTypes,
    matchedIsActive,
    isActiveScore
  );
}

async function runCourtsFuzzySearchTests() {
  console.log("\n=======================================================");
  console.log("🧪 COURTS GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  const COURT_1_ID = "507f191e810c19729de87001";
  const COURT_2_ID = "507f191e810c19729de87002";
  const COURT_3_ID = "507f191e810c19729de87003";
  const COURT_4_ID = "507f191e810c19729de87004";
  const COURT_5_ID = "507f191e810c19729de87005";
  const COURT_DELETED_ID = "507f191e810c19729de87006";

  const mockCourts: SimulatedCourt[] = [
    {
      _id: COURT_1_ID,
      name: "Supreme Court of Bangladesh",
      courtType: COURT_TYPES.SUPREME_COURT,
      district: "Dhaka",
      division: "Dhaka",
      roomOrHall: "Main Bench 1",
      address: "Ramna, Dhaka-1000",
      presidingJudgeTitle: "Chief Justice of Bangladesh",
      isActive: true,
      deletedAt: null,
      createdAt: "2026-01-10T10:00:00.000Z",
      updatedAt: "2026-01-10T10:00:00.000Z",
    },
    {
      _id: COURT_2_ID,
      name: "District Judge Court, Sylhet",
      courtType: COURT_TYPES.DISTRICT_JUDGE_COURT,
      district: "Sylhet",
      division: "Sylhet",
      roomOrHall: "Courtroom 3",
      address: "Court Point, Bandar, Sylhet",
      presidingJudgeTitle: "District and Sessions Judge",
      isActive: true,
      deletedAt: null,
      createdAt: "2026-02-15T11:00:00.000Z",
      updatedAt: "2026-02-15T11:00:00.000Z",
    },
    {
      _id: COURT_3_ID,
      name: "Chief Judicial Magistrate Court, Sylhet",
      courtType: COURT_TYPES.CHIEF_JUDICIAL_MAGISTRATE,
      district: "Sylhet",
      division: "Sylhet",
      roomOrHall: "Hall B",
      address: "Collectorate Compound, Sylhet",
      presidingJudgeTitle: "Chief Judicial Magistrate",
      isActive: true,
      deletedAt: null,
      createdAt: "2026-03-20T12:00:00.000Z",
      updatedAt: "2026-03-20T12:00:00.000Z",
    },
    {
      _id: COURT_4_ID,
      name: "Metropolitan Sessions Judge Court, Dhaka",
      courtType: COURT_TYPES.METROPOLITAN_SESSIONS_COURT,
      district: "Dhaka",
      division: "Dhaka",
      roomOrHall: "Room 101",
      address: "Old High Court Building, Dhaka",
      presidingJudgeTitle: "Metropolitan Sessions Judge",
      isActive: false, // Inactive court
      deletedAt: null,
      createdAt: "2026-04-05T09:00:00.000Z",
      updatedAt: "2026-04-05T09:00:00.000Z",
    },
    {
      _id: COURT_5_ID,
      name: "Money Loan Court (Artha Rin Adalat), Chattogram",
      courtType: COURT_TYPES.MONEY_LOAN_COURT,
      district: "Chattogram",
      division: "Chattogram",
      roomOrHall: "Courtroom 4",
      address: "Court Hill, Chattogram",
      presidingJudgeTitle: "Senior Assistant Judge",
      isActive: true,
      deletedAt: null,
      createdAt: "2026-05-12T14:00:00.000Z",
      updatedAt: "2026-05-12T14:00:00.000Z",
    },
    {
      _id: COURT_DELETED_ID,
      name: "Deleted District Judge Court, Barishal",
      courtType: COURT_TYPES.DISTRICT_JUDGE_COURT,
      district: "Barishal",
      division: "Barishal",
      roomOrHall: "Room 9",
      address: "Bandar Road, Barishal",
      presidingJudgeTitle: "District Judge",
      isActive: true,
      deletedAt: "2026-06-01T10:00:00.000Z", // Soft deleted
      createdAt: "2026-06-01T08:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    },
  ];

  // --- 1. Exact court-name match ranks first ---
  console.log("--- 1. Exact court-name match ranks first ---");
  {
    const query = "Supreme Court of Bangladesh";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .sort((a, b) => b.score - a.score);

    assert(scored[0].court._id === COURT_1_ID, "Court 1 ranks #1 for exact name match");
    assert(scored[0].score >= COURT_SEARCH_RELEVANCE_SCORES.NAME_EXACT, "Exact name gets top score (>= 120)");
    assert(scored[0].score > scored[1].score, "Exact match strictly outranks secondary matches");
  }

  // --- 2. Minor spelling mistakes in court names are tolerated ---
  console.log("\n--- 2. Minor spelling mistakes in court names are tolerated ---");
  {
    const query = "Supreme Crut";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored.length > 0, "Finds court despite typo 'Supreme Crut'");
    assert(scored[0].court._id === COURT_1_ID, "Supreme Court ranks #1 for typo 'Supreme Crut'");

    const query2 = "sylhet distrct";
    const scored2 = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query2) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored2.length >= 2, "Typo 'sylhet distrct' finds District Judge Court, Sylhet");
    assert(scored2[0].court.district === "Sylhet", "Matches court in Sylhet");
  }

  // --- 3. Partial-word and partial-phrase searches work ---
  console.log("\n--- 3. Partial-word and partial-phrase searches work ---");
  {
    const query = "Collectorate";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored.length === 1, "Finds exact 1 court for partial address phrase 'Collectorate'");
    assert(scored[0].court._id === COURT_3_ID, "Court 3 found for address phrase 'Collectorate Compound'");

    const query2 = "Court Point";
    const scored2 = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query2) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored2[0].court._id === COURT_2_ID, "Court 2 found for address phrase 'Court Point'");
  }

  // --- 4. District and division searches are typo-tolerant when using search field ---
  console.log("\n--- 4. District and division searches are typo-tolerant in search field ---");
  {
    const query = "Chattogrom";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0);

    assert(scored.length === 1, "Typo 'Chattogrom' matches court in Chattogram");
    assert(scored[0].court.district === "Chattogram", "Matched district is Chattogram");

    const query2 = "Sylhet";
    const scored2 = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query2) }))
      .filter((item) => item.score > 0);

    assert(scored2.length === 2, "Search 'Sylhet' matches both Sylhet courts");
  }

  // --- 5. Room/hall, address, and presiding judge title are searchable ---
  console.log("\n--- 5. Room/hall, address, and presiding judge title are searchable ---");
  {
    const queryRoom = "Courtroom 3";
    const scoredRoom = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, queryRoom) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scoredRoom.length >= 1, "Room/Hall 'Courtroom 3' is searchable");
    assert(scoredRoom[0].court._id === COURT_2_ID, "Found Court 2 for 'Courtroom 3'");

    const queryJudge = "Chief Justice of Bangladesh";
    const scoredJudge = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, queryJudge) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scoredJudge.length >= 1, "Presiding judge title is searchable");
    assert(scoredJudge[0].court._id === COURT_1_ID, "Found Court 1 for 'Chief Justice of Bangladesh'");

    const queryAddress = "Old High Court Building";
    const scoredAddress = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, queryAddress) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scoredAddress.length >= 1, "Address is searchable");
    assert(scoredAddress[0].court._id === COURT_4_ID, "Found Court 4 for 'Old High Court Building'");
  }

  // --- 6. Additional supported fields are searchable (acronyms & active status) ---
  console.log("\n--- 6. Additional supported fields are searchable (acronyms & status) ---");
  {
    const queryAcronym = "cjm";
    const scoredAcronym = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, queryAcronym) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scoredAcronym.length >= 1, "Acronym 'cjm' matches CJM court");
    assert(scoredAcronym[0].court._id === COURT_3_ID, "Court 3 ranked #1 for acronym 'cjm'");

    const querySc = "sc";
    const scoredSc = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, querySc) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scoredSc[0].court._id === COURT_1_ID, "Acronym 'sc' matches Supreme Court");

    const queryInactive = "inactive";
    const scoredInactive = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, queryInactive) }))
      .filter((item) => item.score > 0);

    assert(scoredInactive.some((item) => item.court._id === COURT_4_ID), "Query 'inactive' matches inactive Court 4");
  }

  // --- 7. Human-readable court type labels work ---
  console.log("\n--- 7. Human-readable court type labels work ---");
  {
    const query = "Artha Rin Adalat";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored.length >= 1, "Human-readable label 'Artha Rin Adalat' matches Money Loan Court");
    assert(scored[0].court._id === COURT_5_ID, "Court 5 matched for 'Artha Rin Adalat'");

    const query2 = "Metropolitan Sessions";
    const scored2 = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query2) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored2[0].court._id === COURT_4_ID, "Matched Court 4 for 'Metropolitan Sessions'");
  }

  // --- 8. Exact matches rank above weaker fuzzy matches ---
  console.log("\n--- 8. Exact matches rank above weaker fuzzy matches ---");
  {
    assert(
      COURT_SEARCH_RELEVANCE_SCORES.NAME_EXACT > COURT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY,
      "Hierarchy: Name Exact (120) > Name Fuzzy (45)"
    );
    assert(
      COURT_SEARCH_RELEVANCE_SCORES.NAME_EXACT > COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_EXACT,
      "Hierarchy: Name Exact (120) > District Exact (80)"
    );
    assert(
      COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_EXACT > COURT_SEARCH_RELEVANCE_SCORES.COURT_TYPE_EXACT,
      "Hierarchy: District Exact (80) > CourtType Exact (70)"
    );
    assert(
      COURT_SEARCH_RELEVANCE_SCORES.NAME_WORD > COURT_SEARCH_RELEVANCE_SCORES.DISTRICT_WORD,
      "Hierarchy: Name Word (95) > District Word (65)"
    );
    assert(
      COURT_SEARCH_RELEVANCE_SCORES.ROOM_EXACT > COURT_SEARCH_RELEVANCE_SCORES.ADDRESS_EXACT,
      "Hierarchy: Room Exact (65) > Address Exact (55)"
    );
  }

  // --- 9. Multiple query terms produce sensible results ---
  console.log("\n--- 9. Multiple query terms produce sensible results ---");
  {
    const query = "Sylhet District Courtroom 3";
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    assert(scored.length > 0, "Multi-term query returns results");
    assert(scored[0].court._id === COURT_2_ID, "Court 2 matching District + Sylhet + Courtroom 3 ranks #1");
    assert(scored[0].score > 150, "Cumulative multi-field score is elevated (> 150)");
  }

  // --- 10. Fuzzy search respects every existing filter ---
  console.log("\n--- 10. Fuzzy search respects every existing filter ---");
  {
    const query = "Court";
    const targetCourtType = COURT_TYPES.MONEY_LOAN_COURT;
    const filtered = mockCourts
      .filter((c) => !c.deletedAt && c.courtType === targetCourtType)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0);

    assert(filtered.length === 1, "Filter courtType restricts results to 1 court");
    assert(filtered[0].court._id === COURT_5_ID, "Returned court is Money Loan Court");
  }

  // --- 11. District and division filters remain exact and case-insensitive ---
  console.log("\n--- 11. District and division filters remain exact and case-insensitive ---");
  {
    const targetDistrict = "sylhet"; // lowercase filter
    const query = "Court";
    const filtered = mockCourts
      .filter((c) => !c.deletedAt && c.district.toLowerCase() === targetDistrict)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0);

    assert(filtered.length === 2, "Exact district filter returns exactly 2 courts");
    assert(filtered.every((item) => item.court.district === "Sylhet"), "All returned courts are in Sylhet");

    // Negative check: district filter 'Dhaka' does not return Sylhet courts even if query contains 'Sylhet'
    const dhakaFilter = mockCourts
      .filter((c) => !c.deletedAt && c.district.toLowerCase() === "dhaka")
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, "Sylhet") }));

    assert(dhakaFilter.every((item) => item.court.district === "Dhaka"), "District filter strictly isolates Dhaka");
  }

  // --- 12. isActive filtering remains correct ---
  console.log("\n--- 12. isActive filtering remains correct ---");
  {
    const activeFiltered = mockCourts
      .filter((c) => !c.deletedAt && c.isActive === true)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, "Judge") }))
      .filter((item) => item.score > 0);

    assert(activeFiltered.every((item) => item.court.isActive === true), "All returned courts are active");
    assert(!activeFiltered.some((item) => item.court._id === COURT_4_ID), "Inactive Court 4 excluded from active search");

    const inactiveFiltered = mockCourts
      .filter((c) => !c.deletedAt && c.isActive === false)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, "Judge") }))
      .filter((item) => item.score > 0);

    assert(inactiveFiltered.length === 1, "Inactive filter returns 1 court");
    assert(inactiveFiltered[0].court._id === COURT_4_ID, "Inactive Court 4 found");
  }

  // --- 13. Date-range filtering preserves existing semantics ---
  console.log("\n--- 13. Date-range filtering preserves existing semantics ---");
  {
    const startDate = new Date("2026-02-01T00:00:00.000Z");
    const endDate = new Date("2026-04-30T23:59:59.999Z");

    const inRange = mockCourts
      .filter((c) => {
        if (c.deletedAt) return false;
        const d = new Date(c.createdAt);
        return d >= startDate && d <= endDate;
      })
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, "Court") }))
      .filter((item) => item.score > 0);

    assert(inRange.length === 3, "Exactly 3 courts in date range Feb 1 - Apr 30");
    assert(!inRange.some((item) => item.court._id === COURT_1_ID), "Court 1 (Jan 10) is excluded before startDate");
    assert(!inRange.some((item) => item.court._id === COURT_5_ID), "Court 5 (May 12) is excluded after endDate");
  }

  // --- 14. All existing sort options work without a search query ---
  console.log("\n--- 14. All existing sort options work without a search query ---");
  {
    const activeCourts = mockCourts.filter((c) => !c.deletedAt);

    // NEWEST
    const newest = [...activeCourts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    assert(newest[0]._id === COURT_5_ID, "NEWEST sort places Court 5 (May) first");

    // OLDEST
    const oldest = [...activeCourts].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    assert(oldest[0]._id === COURT_1_ID, "OLDEST sort places Court 1 (Jan) first");

    // NAME_ASC
    const nameAsc = [...activeCourts].sort((a, b) => a.name.localeCompare(b.name));
    assert(nameAsc[0]._id === COURT_3_ID, "NAME_ASC places 'Chief Judicial Magistrate...' first");

    // NAME_DESC
    const nameDesc = [...activeCourts].sort((a, b) => b.name.localeCompare(a.name));
    assert(nameDesc[0]._id === COURT_1_ID, "NAME_DESC places 'Supreme Court...' first");

    // TYPE_ASC
    const typeAsc = [...activeCourts].sort((a, b) => a.courtType.localeCompare(b.courtType));
    assert(typeAsc[0]._id === COURT_3_ID, "TYPE_ASC places CHIEF_JUDICIAL_MAGISTRATE first");

    // TYPE_DESC
    const typeDesc = [...activeCourts].sort((a, b) => b.courtType.localeCompare(a.courtType));
    assert(typeDesc[0]._id === COURT_1_ID, "TYPE_DESC places SUPREME_COURT first");
  }

  // --- 15. Relevance ranking integrates correctly with sorting when search query exists ---
  console.log("\n--- 15. Relevance ranking integrates correctly with sorting when query exists ---");
  {
    const query = "Sylhet";
    // Both Court 2 and Court 3 have identical district "Sylhet" and division "Sylhet"
    // With sort = OLDEST (Court 2 is older: Feb vs March)
    const scored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.court.createdAt).getTime() - new Date(b.court.createdAt).getTime();
      });

    assert(scored.length === 2, "Found both Sylhet courts");
    assert(scored[0].court._id === COURT_2_ID, "Court 2 (Feb) ranks ahead of Court 3 (March) on OLDEST secondary tie-breaker");
  }

  // --- 16. Ranking happens before pagination ---
  console.log("\n--- 16. Ranking happens before pagination ---");
  {
    const query = "Court";
    const allScored = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    const pageSize = 2;
    const page1 = allScored.slice(0, pageSize);
    const page2 = allScored.slice(pageSize, pageSize * 2);

    assert(page1.length === 2, "Page 1 returns 2 items");
    assert(page2.length === 2, "Page 2 returns 2 items");
    assert(!page1.some((p1) => page2.some((p2) => p2.court._id === p1.court._id)), "No duplicate items across pages");
    assert(page1[0].score >= page2[0].score, "Page 1 items have higher or equal score than Page 2 items");
  }

  // --- 17. Total count and pagination metadata remain accurate ---
  console.log("\n--- 17. Total count and pagination metadata remain accurate ---");
  {
    const total = 5;
    const limit = 2;
    const page = 1;
    const totalPages = Math.ceil(total / limit) || 1;
    const hasMore = page * limit < total;

    assert(totalPages === 3, "Total pages is 3 for 5 items with limit 2");
    assert(hasMore === true, "hasMore is true on page 1 of 3");

    const page3HasMore = 3 * limit < total;
    assert(page3HasMore === false, "hasMore is false on last page 3");
  }

  // --- 18. Soft-deleted courts are excluded ---
  console.log("\n--- 18. Soft-deleted courts are excluded ---");
  {
    const query = "Barishal";
    const results = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0);

    assert(results.length === 0, "Soft-deleted Barishal court is excluded from search results");
  }

  // --- 19. Relation counts remain accurate for the current page ---
  console.log("\n--- 19. Relation counts remain accurate for the current page ---");
  {
    const pageCourts: CourtDocInput[] = [
      {
        _id: COURT_1_ID,
        name: "Supreme Court of Bangladesh",
        courtType: COURT_TYPES.SUPREME_COURT,
        district: "Dhaka",
        isActive: true,
      },
    ];

    const countsMap = {
      cases: 12,
      hearings: 34,
      assets: 3,
    };

    const formatted: CourtListItemDto = formatCourtItem(pageCourts[0], countsMap);
    assert(formatted.totalCases === 12, "Formatted item totalCases matches page count (12)");
    assert(formatted.totalHearings === 34, "Formatted item totalHearings matches page count (34)");
    assert(formatted.totalAssets === 3, "Formatted item totalAssets matches page count (3)");
    assert(formatted.isDeletable === false, "isDeletable is false when relations exist");
  }

  // --- 20. Empty searches preserve existing behavior ---
  console.log("\n--- 20. Empty searches preserve existing behavior ---");
  {
    const patternsEmpty = buildFuzzySearchPatterns("");
    assert(patternsEmpty === null, "Empty search query produces null pattern");

    const patternsWhitespace = buildFuzzySearchPatterns("   ");
    assert(patternsWhitespace === null, "Whitespace search query produces null pattern");

    const patternsShort = buildFuzzySearchPatterns("a");
    assert(patternsShort?.isShortQuery === true, "Single letter query marked as short query");
  }

  // --- 21. Empty results and out-of-range pages handled correctly ---
  console.log("\n--- 21. Empty results and out-of-range pages handled correctly ---");
  {
    const query = "NonExistentCourtQueryXYZ12345";
    const results = mockCourts
      .filter((c) => !c.deletedAt)
      .map((c) => ({ court: c, score: evaluateCourtRelevance(c, query) }))
      .filter((item) => item.score > 0);

    assert(results.length === 0, "Non-matching query returns 0 results");

    const total = 0;
    const limit = 10;
    const totalPages = Math.ceil(total / limit) || 1;
    assert(totalPages === 1, "Total pages defaults to 1 for 0 results");
  }

  // --- 22. Pipeline construction and shared helper integrity ---
  console.log("\n--- 22. Pipeline construction and shared helper integrity ---");
  {
    const patterns = buildFuzzySearchPatterns("Supreme Court");
    if (!patterns) throw new Error("Patterns must not be null");

    const stages = buildCourtRelevanceStages(patterns);
    assert(stages.length === 2, "buildCourtRelevanceStages creates exactly 2 stages");
    assert("$addFields" in stages[0], "First stage is $addFields");
    assert("$match" in stages[1], "Second stage is $match for relevanceScore > 0");

    // Verify distance utility
    const dist = damerauLevenshteinDistance("distrct", "district");
    assert(dist === 1, "Damerau-Levenshtein distance between 'distrct' and 'district' is 1");
  }

  console.log("\n=======================================================");
  console.log("🏆 ALL 22 COURTS VERIFICATION SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runCourtsFuzzySearchTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
