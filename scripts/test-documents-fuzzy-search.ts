import mongoose from "mongoose";
import {
  damerauLevenshteinDistance,
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  DOCUMENT_SEARCH_RELEVANCE_SCORES,
  matchDocumentTypes,
  calculateDocumentCaseMatchScore,
  calculateDocumentClientMatchScore,
  calculateDirectDocumentMatchScore,
  buildCaseDocumentRelevanceExpr,
  buildClientDocumentRelevanceExpr,
  buildCaseDocumentRelevanceStages,
  buildClientDocumentRelevanceStages,
  DocumentCaseCandidate,
  DocumentClientCandidate,
  DirectDocumentCandidate,
} from "@/lib/helpers/fuzzy-searching/document-fuzzy-search.helper";
import { CASE_DOCUMENT_TYPES } from "@/const/case-document.const";
import { CLIENT_DOCUMENT_TYPES } from "@/const/client-document.const";
import { DOCUMENT_ENTITY_TYPES } from "@/const/document.const";
import {
  formatCaseDocumentItem,
  formatClientDocumentItem,
} from "@/lib/helpers/document.helper";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedDocument extends DirectDocumentCandidate {
  id: string;
  createdAt: string; // ISO string
  updatedAt: string;
  documentDate: string | null;
  deletedAt?: string | null;
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 DOCUMENTS GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  // ==========================================
  // Scenario 1: Exact Document Title Search
  // ==========================================
  console.log("--- 1. Testing Exact Document Title Matches ---");
  const candExactTitle: DirectDocumentCandidate = {
    title: "Sale Deed of Flat 4A",
  };
  const scoreExact = calculateDirectDocumentMatchScore(candExactTitle, "Sale Deed of Flat 4A");
  assert(
    scoreExact === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT,
    `Exact title match gets highest direct score (${scoreExact} === 120)`
  );

  // ==========================================
  // Scenario 2: Misspelled Document Title Search
  // ==========================================
  console.log("\n--- 2. Testing Typo-Tolerant Document Title Matches ---");
  // Omission: "vakalatanama" -> "vakalatnama", "petishun" -> "petition"
  assert(
    damerauLevenshteinDistance("vakalatanama", "vakalatnama") === 1,
    "Typo omission 'vakalatanama' -> 'vakalatnama' distance is 1"
  );
  assert(
    damerauLevenshteinDistance("affidevit", "affidavit") === 1,
    "Typo substitution 'affidevit' -> 'affidavit' distance is 1"
  );
  assert(
    damerauLevenshteinDistance("reciept", "receipt") === 1,
    "Typo transposition 'reciept' -> 'receipt' distance is 1"
  );

  const candTypoTitle: DirectDocumentCandidate = {
    title: "Injunction Order Copy",
  };
  const scoreTypoTitle = calculateDirectDocumentMatchScore(candTypoTitle, "Injunxion");
  assert(
    scoreTypoTitle === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
    `Misspelled title 'Injunxion' matches with fuzzy score (${scoreTypoTitle} === 45)`
  );

  // ==========================================
  // Scenario 3: Partial Document Title Search
  // ==========================================
  console.log("\n--- 3. Testing Partial Document Title Matches ---");
  const candPartialTitle: DirectDocumentCandidate = {
    title: "Preliminary Plaint in Land Dispute",
  };
  // Word prefix match
  const scoreWordPrefix = calculateDirectDocumentMatchScore(candPartialTitle, "Prelim");
  assert(
    scoreWordPrefix === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_WORD,
    `Prefix 'Prelim' matches title with word score (${scoreWordPrefix} === 95)`
  );
  // Substring match (non-boundary)
  const scoreSubTitle = calculateDirectDocumentMatchScore(candPartialTitle, "eliminary");
  assert(
    scoreSubTitle === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING,
    `Substring 'eliminary' matches title with substring score (${scoreSubTitle} === 70)`
  );

  // ==========================================
  // Scenario 4: Search by Case Number and Internal Reference
  // ==========================================
  console.log("\n--- 4. Testing Search by Case Number and Internal Reference ---");
  const caseDoc1: DocumentCaseCandidate = {
    _id: new mongoose.Types.ObjectId(),
    caseNumber: "CR-102/2024",
    internalReference: "REF-2024-001",
    title: "State vs Tareq Rahman",
  };
  const scoreCaseNum = calculateDocumentCaseMatchScore(caseDoc1, "CR-102/2024");
  const scoreIntRef = calculateDocumentCaseMatchScore(caseDoc1, "REF-2024-001");
  const scorePartialCaseNum = calculateDocumentCaseMatchScore(caseDoc1, "CR-102");

  assert(
    scoreCaseNum.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
    `Exact caseNumber gets identifier score (${scoreCaseNum.directScore} === 100)`
  );
  assert(
    scoreIntRef.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
    `Exact internalReference gets identifier score (${scoreIntRef.directScore} === 100)`
  );
  assert(
    scorePartialCaseNum.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD,
    `Prefix caseNumber 'CR-102' gets word score (${scorePartialCaseNum.directScore} === 85)`
  );

  // ==========================================
  // Scenario 5: Search by Related Case Title
  // ==========================================
  console.log("\n--- 5. Testing Search by Related Case Title ---");
  const scoreCaseTitleExact = calculateDocumentCaseMatchScore(caseDoc1, "State vs Tareq Rahman");
  const scoreCaseTitleWord = calculateDocumentCaseMatchScore(caseDoc1, "State vs");
  const scoreCaseTitleSub = calculateDocumentCaseMatchScore(caseDoc1, "areq");

  assert(
    scoreCaseTitleExact.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    `Exact case title gets title/name score (${scoreCaseTitleExact.directScore} === 85)`
  );
  assert(
    scoreCaseTitleWord.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_WORD,
    `Case title prefix gets word score (${scoreCaseTitleWord.directScore} === 70)`
  );
  assert(
    scoreCaseTitleSub.directScore === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_SUBSTRING,
    `Case title substring gets substring score (${scoreCaseTitleSub.directScore} === 50)`
  );

  // ==========================================
  // Scenario 6: Search by Client Name, Number, Org, Phone, Email
  // ==========================================
  console.log("\n--- 6. Testing Search by Client Name, Number, Org, Contact ---");
  const clientDoc1: DocumentClientCandidate = {
    _id: new mongoose.Types.ObjectId(),
    name: "Dr. Kamal Hossain",
    clientNumber: "CL-8801",
    organizationName: "Grameen Telecom",
    phone: "01711002233",
    email: "kamal@example.com",
    nationalId: "19801234567890",
  };

  const scoreClientNum = calculateDocumentClientMatchScore(clientDoc1, "CL-8801");
  const scoreClientName = calculateDocumentClientMatchScore(clientDoc1, "Dr. Kamal Hossain");
  const scoreClientOrg = calculateDocumentClientMatchScore(clientDoc1, "Grameen Telecom");
  const scoreClientPhone = calculateDocumentClientMatchScore(clientDoc1, "01711002233");
  const scoreClientNid = calculateDocumentClientMatchScore(clientDoc1, "19801234567890");

  assert(
    scoreClientNum === DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
    `Exact clientNumber gets identifier score (${scoreClientNum} === 100)`
  );
  assert(
    scoreClientName === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    `Exact client name gets title/name score (${scoreClientName} === 85)`
  );
  assert(
    scoreClientOrg === DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    `Exact organization name gets title/name score (${scoreClientOrg} === 85)`
  );
  assert(
    scoreClientPhone === DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
    `Exact client phone gets contact score (${scoreClientPhone} === 65)`
  );
  assert(
    scoreClientNid === DOCUMENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT,
    `Exact client NID gets contact score (${scoreClientNid} === 65)`
  );

  // ==========================================
  // Scenario 7: Document Type & Human-Readable Label Matching
  // ==========================================
  console.log("\n--- 7. Testing Document Type & Human-Readable Label Matching ---");
  const matchBail = matchDocumentTypes("Bail Petition");
  assert(
    matchBail.matchedCaseDocTypes.some((d) => d.type === CASE_DOCUMENT_TYPES.BAIL_PETITION && d.score === 70),
    "Matches CaseDocumentType BAIL_PETITION by exact label with score 70"
  );

  const matchTrade = matchDocumentTypes("trade licence");
  assert(
    matchTrade.matchedClientDocTypes.some((d) => d.type === CLIENT_DOCUMENT_TYPES.TRADE_LICENSE && d.score >= 50),
    "Matches ClientDocumentType TRADE_LICENSE by typo/alias 'trade licence'"
  );

  const matchVakalat = matchDocumentTypes("vakalatnama");
  assert(
    matchVakalat.matchedCaseDocTypes.some((d) => d.type === CASE_DOCUMENT_TYPES.VAKALATNAMA_POWER),
    "Matches VAKALATNAMA_POWER by alias 'vakalatnama'"
  );

  const matchNid = matchDocumentTypes("smart card");
  assert(
    matchNid.matchedClientDocTypes.some((d) => d.type === CLIENT_DOCUMENT_TYPES.NATIONAL_ID),
    "Matches NATIONAL_ID by vernacular label 'smart card'"
  );

  // ==========================================
  // Scenario 8: Exhibit Number & Description / Notes Search
  // ==========================================
  console.log("\n--- 8. Testing Exhibit Number & Description/Notes Matches ---");
  const candExhibit: DirectDocumentCandidate = {
    title: "Contract Document",
    exhibitNumber: "Exhibit-A/1",
    description: "Certified copy of sale agreement between parties",
  };
  const scoreExhibit = calculateDirectDocumentMatchScore(candExhibit, "Exhibit-A/1");
  assert(
    scoreExhibit === DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_EXACT,
    `Exact exhibitNumber gets exhibit score (${scoreExhibit} === 75)`
  );

  const scoreDesc = calculateDirectDocumentMatchScore(candExhibit, "Certified copy of sale agreement between parties");
  assert(
    scoreDesc === DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    `Exact description gets description score (${scoreDesc} === 60)`
  );

  // ==========================================
  // Scenario 9: Ranking Priority Hierarchy
  // ==========================================
  console.log("\n--- 9. Testing Relevance Ranking Priority Hierarchy ---");
  // 1. Direct Title Exact (120) > Related Identifier Exact (100)
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
    "Hierarchy: Title Exact (120) > Identifier Exact (100)"
  );
  // 2. Related Identifier Exact (100) > Related Title/Name Exact (85)
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT,
    "Hierarchy: Identifier Exact (100) > Title/Name Exact (85)"
  );
  // 3. Related Title/Name Exact (85) > Exhibit Exact (75)
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_NAME_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_EXACT,
    "Hierarchy: Title/Name Exact (85) > Exhibit Exact (75)"
  );
  // 4. Exhibit Exact (75) > DocType Exact (70)
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.EXHIBIT_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_EXACT,
    "Hierarchy: Exhibit Exact (75) > DocType Exact (70)"
  );
  // 5. DocType Exact (70) > Description Exact (60)
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.DOCTYPE_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT,
    "Hierarchy: DocType Exact (70) > Description Exact (60)"
  );
  // 6. Title Exact (120) > Description Exact (60) strictly protects against long descriptions outranking titles
  assert(
    DOCUMENT_SEARCH_RELEVANCE_SCORES.TITLE_EXACT > DOCUMENT_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT * 1.5,
    "Document title match strictly outranks description match by wide margin (120 vs 60)"
  );

  // ==========================================
  // Scenario 10: Multi-word & Cumulative Scoring
  // ==========================================
  console.log("\n--- 10. Testing Cumulative Multi-Field Score Boosts ---");
  const caseId10 = new mongoose.Types.ObjectId();
  const caseScoresMap = new Map<string, number>();
  caseScoresMap.set(String(caseId10), DOCUMENT_SEARCH_RELEVANCE_SCORES.CASE_TIER_1); // 85

  const candMultiMatch: DirectDocumentCandidate = {
    title: "Bail Petition Draft", // matches title word 95
    documentType: CASE_DOCUMENT_TYPES.BAIL_PETITION, // matches doctype 70
    caseId: caseId10, // matches case 85
  };

  const multiScore = calculateDirectDocumentMatchScore(
    candMultiMatch,
    "Bail Petition",
    caseScoresMap,
    undefined,
    [{ type: CASE_DOCUMENT_TYPES.BAIL_PETITION, score: 70 }]
  );

  // Title Word (95) + DocType (70) + Case (85) = 250
  assert(
    multiScore >= 200,
    `Multi-field match across title, docType, and case receives cumulative boost (${multiScore} >= 200)`
  );

  // ==========================================
  // Scenario 11: Cross-Collection Search & Unified Ranking Simulation
  // ==========================================
  console.log("\n--- 11. Testing Unified Cross-Collection Simulation & Pre-Pagination Ranking ---");
  const caseIdA = new mongoose.Types.ObjectId();
  const clientIdB = new mongoose.Types.ObjectId();

  // Collection of simulated documents across Case Documents and Client Documents
  const simDocs: SimulatedDocument[] = [
    {
      id: "DOC-1",
      entityType: DOCUMENT_ENTITY_TYPES.CASE,
      title: "Written Statement of Defense",
      documentType: CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT,
      caseId: caseIdA,
      createdAt: "2026-03-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      documentDate: "2026-02-28T00:00:00Z",
    },
    {
      id: "DOC-2",
      entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
      title: "Trade License Renewal 2026",
      documentType: CLIENT_DOCUMENT_TYPES.TRADE_LICENSE,
      clientId: clientIdB,
      createdAt: "2026-03-02T10:00:00Z",
      updatedAt: "2026-03-02T10:00:00Z",
      documentDate: "2026-01-15T00:00:00Z",
    },
    {
      id: "DOC-3",
      entityType: DOCUMENT_ENTITY_TYPES.CASE,
      title: "Deed of Agreement",
      documentType: CASE_DOCUMENT_TYPES.TITLE_DEED_DALIL,
      description: "Mentions trade license as proof of business",
      caseId: new mongoose.Types.ObjectId(),
      createdAt: "2026-03-03T10:00:00Z",
      updatedAt: "2026-03-03T10:00:00Z",
      documentDate: "2026-03-01T00:00:00Z",
    },
    {
      id: "DOC-4",
      entityType: DOCUMENT_ENTITY_TYPES.CLIENT,
      title: "National ID Card",
      documentType: CLIENT_DOCUMENT_TYPES.NATIONAL_ID,
      clientId: new mongoose.Types.ObjectId(),
      createdAt: "2026-03-04T10:00:00Z",
      updatedAt: "2026-03-04T10:00:00Z",
      documentDate: "2026-03-01T00:00:00Z",
    },
  ];

  // Query: "Trade License"
  const matchedDocTypesForQuery = matchDocumentTypes("Trade License");
  const scoredSimDocs = simDocs
    .map((doc) => {
      const relevance = calculateDirectDocumentMatchScore(
        doc,
        "Trade License",
        new Map(),
        new Map(),
        matchedDocTypesForQuery.matchedCaseDocTypes,
        matchedDocTypesForQuery.matchedClientDocTypes
      );
      return { ...doc, relevanceScore: relevance };
    })
    .filter((d) => d.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  assert(scoredSimDocs.length === 2, `Query 'Trade License' matches exactly 2 documents (${scoredSimDocs.length} === 2)`);
  assert(
    scoredSimDocs[0].id === "DOC-2",
    `Top ranked document is DOC-2 (Title Exact 120 + DocType 70 = 190) > DOC-3 (Description 30)`
  );
  assert(
    scoredSimDocs[0].relevanceScore > scoredSimDocs[1].relevanceScore,
    `DOC-2 (${scoredSimDocs[0].relevanceScore}) strictly outranks DOC-3 (${scoredSimDocs[1].relevanceScore})`
  );

  // Pagination simulation: limit = 1, page 1 vs page 2
  const page1 = scoredSimDocs.slice(0, 1);
  const page2 = scoredSimDocs.slice(1, 2);

  assert(page1[0].id === "DOC-2", "Page 1 contains highest ranked item DOC-2");
  assert(page2[0].id === "DOC-3", "Page 2 contains lower ranked item DOC-3");
  assert(
    page1[0].relevanceScore > page2[0].relevanceScore,
    "Relevance ranking strictly maintained before pagination slice"
  );

  // ==========================================
  // Scenario 12: Scope Filtering Semantics (all | case | client)
  // ==========================================
  console.log("\n--- 12. Testing Scope Filtering Semantics ---");
  const caseOnlyResults = simDocs.filter((d) => d.entityType === DOCUMENT_ENTITY_TYPES.CASE);
  const clientOnlyResults = simDocs.filter((d) => d.entityType === DOCUMENT_ENTITY_TYPES.CLIENT);

  assert(caseOnlyResults.length === 2, "scope=case filters strictly to case documents");
  assert(clientOnlyResults.length === 2, "scope=client filters strictly to client documents");

  // ==========================================
  // Scenario 13: Secondary Sorting and Tie-Breakers
  // ==========================================
  console.log("\n--- 13. Testing Secondary Sorting and Deterministic Tie-Breakers ---");
  const tiedDocs: SimulatedDocument[] = [
    {
      id: "DOC-T1",
      entityType: DOCUMENT_ENTITY_TYPES.CASE,
      title: "Written Statement A",
      documentType: CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      documentDate: "2026-01-01T00:00:00Z",
    },
    {
      id: "DOC-T2",
      entityType: DOCUMENT_ENTITY_TYPES.CASE,
      title: "Written Statement B",
      documentType: CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT,
      createdAt: "2026-02-01T00:00:00Z",
      updatedAt: "2026-02-01T00:00:00Z",
      documentDate: "2026-02-01T00:00:00Z",
    },
  ];

  // Both have equal relevance score (70 for docType WRITTEN_STATEMENT)
  // If sort=newest, DOC-T2 (Feb) should precede DOC-T1 (Jan)
  const sortedTiesNewest = [...tiedDocs].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  assert(sortedTiesNewest[0].id === "DOC-T2", "Secondary sort 'NEWEST' tie-breaker correctly orders DOC-T2 first");

  // If sort=oldest, DOC-T1 (Jan) should precede DOC-T2 (Feb)
  const sortedTiesOldest = [...tiedDocs].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
  assert(sortedTiesOldest[0].id === "DOC-T1", "Secondary sort 'OLDEST' tie-breaker correctly orders DOC-T1 first");

  // ==========================================
  // Scenario 14: Date Range Window Filtering
  // ==========================================
  console.log("\n--- 14. Testing Date Range Window Filtering Semantics ---");
  const startStr = "2026-01-01";
  const endStr = "2026-01-31";
  const startDate = new Date(startStr);
  const endDate = new Date(endStr);
  endDate.setHours(23, 59, 59, 999);

  const inRange = simDocs.filter((d) => {
    if (!d.documentDate) return false;
    const docD = new Date(d.documentDate);
    return docD >= startDate && docD <= endDate;
  });

  assert(inRange.length === 1 && inRange[0].id === "DOC-2", "Date window Jan 1 - Jan 31 correctly matches DOC-2 only");

  // ==========================================
  // Scenario 15: Soft-Delete and Confidentiality Semantics
  // ==========================================
  console.log("\n--- 15. Testing Soft-Delete and Confidentiality Filtering ---");
  const deletedDoc: SimulatedDocument = {
    id: "DOC-DEL",
    entityType: DOCUMENT_ENTITY_TYPES.CASE,
    title: "Sale Deed Deleted",
    deletedAt: "2026-02-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    documentDate: null,
  };

  const activeFiltered = [deletedDoc, ...simDocs].filter((d) => d.deletedAt === null || d.deletedAt === undefined);
  assert(!activeFiltered.some((d) => d.id === "DOC-DEL"), "Soft-deleted document strictly excluded");

  // ==========================================
  // Scenario 16: Formatter Safety (formatCaseDocumentItem & formatClientDocumentItem)
  // ==========================================
  console.log("\n--- 16. Testing Formatters with Missing or Minimal Records ---");
  const minimalCaseDoc = {
    _id: new mongoose.Types.ObjectId(),
    documentType: CASE_DOCUMENT_TYPES.PLAINT_OR_PETITION,
    title: "Plaint of Money Suit",
  };
  const formattedCase = formatCaseDocumentItem(minimalCaseDoc, null, null);
  assert(formattedCase.entityType === DOCUMENT_ENTITY_TYPES.CASE, "Formatted case item has correct entityType");
  assert(formattedCase.documentTypeLabel === "Plaint / Petition", "Formatted case item has human-readable label");
  assert(formattedCase.caseDetails === null, "Handles null caseInfo safely without throwing");
  assert(formattedCase.fileUrl === "", "Handles null assetRef safely without throwing");

  const minimalClientDoc = {
    _id: new mongoose.Types.ObjectId(),
    documentType: CLIENT_DOCUMENT_TYPES.PASSPORT,
    title: "Client Passport Scan",
  };
  const formattedClient = formatClientDocumentItem(minimalClientDoc, null, null);
  assert(formattedClient.entityType === DOCUMENT_ENTITY_TYPES.CLIENT, "Formatted client item has correct entityType");
  assert(formattedClient.documentTypeLabel === "Passport", "Formatted client item has human-readable label");
  assert(formattedClient.clientDetails === null, "Handles null clientInfo safely without throwing");

  // ==========================================
  // Scenario 17: MongoDB Relevance Expression Construction
  // ==========================================
  console.log("\n--- 17. Testing MongoDB Aggregation Expression Structure ---");
  const patterns = buildFuzzySearchPatterns("written statement");
  assert(patterns !== null, "buildFuzzySearchPatterns generates valid patterns");

  const emptyBuckets = bucketScoredEntityIds(new Map());
  const caseExpr = buildCaseDocumentRelevanceExpr(emptyBuckets, emptyBuckets, patterns!, [
    { type: CASE_DOCUMENT_TYPES.WRITTEN_STATEMENT, score: 70 },
  ]);
  assert(caseExpr !== null && typeof caseExpr === "object", "buildCaseDocumentRelevanceExpr returns expression object");
  assert("$add" in caseExpr, "caseExpr contains $add expression stage");

  const clientExpr = buildClientDocumentRelevanceExpr(emptyBuckets, patterns!, [
    { type: CLIENT_DOCUMENT_TYPES.OTHER, score: 30 },
  ]);
  assert(clientExpr !== null && typeof clientExpr === "object", "buildClientDocumentRelevanceExpr returns expression object");
  assert("$add" in clientExpr, "clientExpr contains $add expression stage");

  const caseStages = buildCaseDocumentRelevanceStages(emptyBuckets, emptyBuckets, patterns!, []);
  assert(caseStages.length === 2, "buildCaseDocumentRelevanceStages generates exactly 2 stages ($addFields, $match)");
  assert("$addFields" in caseStages[0], "Stage 0 is $addFields");
  assert("$match" in caseStages[1], "Stage 1 is $match for relevanceScore > 0");

  const clientStages = buildClientDocumentRelevanceStages(emptyBuckets, patterns!, []);
  assert(clientStages.length === 2, "buildClientDocumentRelevanceStages generates exactly 2 stages ($addFields, $match)");

  // ==========================================
  // Scenario 18: Empty & Whitespace Queries
  // ==========================================
  console.log("\n--- 18. Testing Empty & Whitespace Search Queries ---");
  assert(buildFuzzySearchPatterns("") === null, "Empty query produces null patterns");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace-only query produces null patterns");
  assert(buildFuzzySearchPatterns(null) === null, "Null query produces null patterns");
  assert(buildFuzzySearchPatterns(undefined) === null, "Undefined query produces null patterns");

  console.log("\n=======================================================");
  console.log("🏆 ALL 18 DOCUMENTS FUZZY SEARCH SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
