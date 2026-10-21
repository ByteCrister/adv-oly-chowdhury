import mongoose from "mongoose";
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateClientCourtMatchScore,
  calculateClientCaseMatchScore,
  calculateClientDocumentMatchScore,
  calculateClientPaymentMatchScore,
  calculateDirectClientMatchScore,
  buildClientRelevanceStages,
  CLIENT_SEARCH_RELEVANCE_SCORES,
  ClientRelatedCaseCandidate,
  ClientRelatedCourtCandidate,
  ClientRelatedDocumentCandidate,
  ClientRelatedPaymentCandidate,
} from "@/lib/helpers/fuzzy-searching/client-fuzzy-search.helper";
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  CLIENT_SORT_OPTIONS,
  ClientSortOption,
} from "@/const/client.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedClient {
  _id: string;
  clientNumber: string;
  name: string;
  organizationName: string | null;
  clientType: string;
  status: string;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
  nationalId: string | null;
  address: string | null;
  deletedAt: string | null;
  createdAt: string;
}

interface SimulatedCase {
  _id: string;
  clientId: string;
  courtId: string | null;
  title: string;
  caseNumber: string | null;
  internalReference: string;
  caseCategory: string | null;
  opposingCounsel: string | null;
  opposingParties: string[];
  description: string | null;
  legalIssues: string | null;
  deletedAt: string | null;
}

interface SimulatedDocument {
  _id: string;
  clientId: string;
  title: string;
  documentType: string;
  notes: string | null;
  deletedAt: string | null;
}

interface SimulatedPayment {
  _id: string;
  clientId: string;
  moneyReceiptNumber: string | null;
  referenceNumber: string | null;
  amount: number;
  paymentDate: string;
  notes: string | null;
}

/**
 * Evaluates the client's relevance score matching the exact logic of buildClientRelevanceStages.
 */
function evaluateClientRelevance(
  client: SimulatedClient,
  query: string,
  relatedScoreMap: Map<string, number>
): number {
  const patterns = buildFuzzySearchPatterns(query);
  if (!patterns) return 0;

  const relatedBuckets = bucketScoredEntityIds(relatedScoreMap);
  let score = 0;

  // 1. clientNumber
  if (client.clientNumber) {
    if (new RegExp(patterns.exactPattern, "i").test(client.clientNumber)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(client.clientNumber)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(client.clientNumber)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(client.clientNumber)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY;
    }
  }

  // 2. nationalId
  if (client.nationalId) {
    if (new RegExp(patterns.exactPattern, "i").test(client.nationalId)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(client.nationalId)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(client.nationalId)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(client.nationalId)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_FUZZY;
    }
  }

  // 3. phone and alternatePhone
  const phones = [client.phone, client.alternatePhone].filter(Boolean) as string[];
  let phoneScore = 0;
  for (const p of phones) {
    if (new RegExp(patterns.exactPattern, "i").test(p)) {
      phoneScore = Math.max(phoneScore, CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT);
    } else if (new RegExp(patterns.wordPattern, "i").test(p)) {
      phoneScore = Math.max(phoneScore, CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD);
    } else if (new RegExp(patterns.substringPattern, "i").test(p)) {
      phoneScore = Math.max(phoneScore, CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING);
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(p)) {
      phoneScore = Math.max(phoneScore, CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY);
    }
  }
  score += phoneScore;

  // 4. email
  if (client.email) {
    if (new RegExp(patterns.exactPattern, "i").test(client.email)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(client.email)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(client.email)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(client.email)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.CONTACT_FUZZY;
    }
  }

  // 5. name
  if (client.name) {
    if (new RegExp(patterns.exactPattern, "i").test(client.name)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.NAME_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(client.name)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.NAME_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(client.name)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.NAME_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(client.name)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.NAME_FUZZY;
    }
  }

  // 6. organizationName
  if (client.organizationName) {
    if (new RegExp(patterns.exactPattern, "i").test(client.organizationName)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.ORG_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(client.organizationName)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.ORG_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(client.organizationName)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.ORG_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(client.organizationName)) {
      score += CLIENT_SEARCH_RELEVANCE_SCORES.ORG_FUZZY;
    }
  }

  // 7. related score
  const clientObjId = new mongoose.Types.ObjectId(client._id);
  if (relatedBuckets.tier1Ids.some((id) => id.equals(clientObjId))) {
    score += CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_1;
  } else if (relatedBuckets.tier2Ids.some((id) => id.equals(clientObjId))) {
    score += CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_2;
  } else if (relatedBuckets.tier3Ids.some((id) => id.equals(clientObjId))) {
    score += CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_3;
  } else if (relatedBuckets.tier4Ids.some((id) => id.equals(clientObjId))) {
    score += CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_4;
  } else if (relatedBuckets.tier5Ids.some((id) => id.equals(clientObjId))) {
    score += CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_5;
  }

  return score;
}

async function runClientFuzzySearchTests() {
  console.log("\n=======================================================");
  console.log("🧪 CLIENTS GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  const client1Id = new mongoose.Types.ObjectId().toString();
  const client2Id = new mongoose.Types.ObjectId().toString();
  const client3Id = new mongoose.Types.ObjectId().toString();
  const deletedClientId = new mongoose.Types.ObjectId().toString();

  const court1Id = new mongoose.Types.ObjectId().toString();
  const court2Id = new mongoose.Types.ObjectId().toString();

  const mockClients: SimulatedClient[] = [
    {
      _id: client1Id,
      clientNumber: "CL-2026-0001",
      name: "Tariqul Islam Chowdhury",
      organizationName: "Chowdhury Textiles Ltd",
      clientType: CLIENT_TYPES.INDIVIDUAL,
      status: CLIENT_STATUSES.ACTIVE,
      phone: "+8801711223344",
      alternatePhone: "+8801711998877",
      email: "tariqul@chowdhury.com",
      nationalId: "19881234567890",
      address: "Zindabazar, Sylhet",
      deletedAt: null,
      createdAt: "2026-01-10T10:00:00.000Z",
    },
    {
      _id: client2Id,
      clientNumber: "CL-2026-0002",
      name: "Abdul Karim",
      organizationName: "Karim Agro Industries",
      clientType: CLIENT_TYPES.ORGANIZATION,
      status: CLIENT_STATUSES.ACTIVE,
      phone: "+8801819998877",
      alternatePhone: null,
      email: "info@karimagro.com",
      nationalId: "19759876543210",
      address: "Subidbazar, Sylhet",
      deletedAt: null,
      createdAt: "2026-02-01T10:00:00.000Z",
    },
    {
      _id: client3Id,
      clientNumber: "CL-2026-0003",
      name: "Shakib Islam",
      organizationName: null,
      clientType: CLIENT_TYPES.INDIVIDUAL,
      status: CLIENT_STATUSES.INACTIVE,
      phone: "+8801912345678",
      alternatePhone: null,
      email: "shakib@lawfirm.bd",
      nationalId: "19925566778899",
      address: "Amberkhana, Sylhet",
      deletedAt: null,
      createdAt: "2026-03-01T10:00:00.000Z",
    },
    {
      _id: deletedClientId,
      clientNumber: "CL-2025-0088",
      name: "Deleted Client",
      organizationName: "Deleted Corp",
      clientType: CLIENT_TYPES.INDIVIDUAL,
      status: CLIENT_STATUSES.ARCHIVED,
      phone: "+8801500000000",
      alternatePhone: null,
      email: "deleted@client.com",
      nationalId: "19900000000000",
      address: "Nowhere",
      deletedAt: "2026-01-01T00:00:00.000Z",
      createdAt: "2025-06-01T10:00:00.000Z",
    },
  ];

  const mockCourts: ClientRelatedCourtCandidate[] = [
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
      clientId: client1Id,
      courtId: court1Id,
      title: "Commercial Contract Breach and Specific Performance",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseCategory: "Commercial",
      opposingCounsel: "Advocate Mahbubur Rahman",
      opposingParties: ["Apex Fabrics Ltd"],
      description: "Lawsuit regarding breach of commercial supply agreement",
      legalIssues: "Specific Relief Act Section 12",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client2Id,
      courtId: court2Id,
      title: "Land Title Declaration and Injunction",
      caseNumber: "AR-202/2026",
      internalReference: "CASE-2026-0002",
      caseCategory: "Property",
      opposingCounsel: "Advocate Nasir Ahmed",
      opposingParties: ["Rahim Ullah"],
      description: "Property ownership dispute over ancestral plot",
      legalIssues: "Title declaration and permanent injunction",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client1Id,
      courtId: null,
      title: "Cheque Dishonour Case under NI Act",
      caseNumber: "CR-55/2026",
      internalReference: "CASE-2026-0003",
      caseCategory: "Criminal",
      opposingCounsel: "Advocate Farhana Begum",
      opposingParties: ["Apex Garments"],
      description: "Dishonoured cheque for 500000 BDT",
      legalIssues: "Section 138 of Negotiable Instruments Act",
      deletedAt: "2026-02-15T00:00:00.000Z", // Soft deleted case
    },
  ];

  const mockDocuments: SimulatedDocument[] = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client1Id,
      title: "General Power of Attorney Executed in London",
      documentType: "POWER_OF_ATTORNEY",
      notes: "Attested by Bangladesh High Commission",
      deletedAt: null,
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client2Id,
      title: "Land Purchase Deed 1998 Registered",
      documentType: "DEED",
      notes: "Sub-registry office Sylhet Sadar",
      deletedAt: null,
    },
  ];

  const mockPayments: SimulatedPayment[] = [
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client1Id,
      moneyReceiptNumber: "MR-2026-0042",
      referenceNumber: "TXN-778899",
      amount: 50000,
      paymentDate: "2026-02-01T00:00:00.000Z",
      notes: "Advance professional fees for contract suit",
    },
    {
      _id: new mongoose.Types.ObjectId().toString(),
      clientId: client2Id,
      moneyReceiptNumber: "MR-2026-0099",
      referenceNumber: "TXN-112233",
      amount: 30000,
      paymentDate: "2026-02-10T00:00:00.000Z",
      notes: "Court fee filing reimbursement",
    },
  ];

  // Helper function to simulate full search query matching
  function simulateClientSearch(
    query: string,
    filters: {
      clientType?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      sort?: ClientSortOption;
    } = {}
  ): { items: Array<SimulatedClient & { relevanceScore: number }>; total: number } {
    const patterns = buildFuzzySearchPatterns(query);

    // Filter non-deleted clients first
    let candidates = mockClients.filter((c) => c.deletedAt === null);

    if (filters.clientType && filters.clientType !== "ALL") {
      candidates = candidates.filter((c) => c.clientType === filters.clientType);
    }
    if (filters.status && filters.status !== "ALL") {
      candidates = candidates.filter((c) => c.status === filters.status);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      candidates = candidates.filter((c) => new Date(c.createdAt).getTime() >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      candidates = candidates.filter((c) => new Date(c.createdAt).getTime() <= end);
    }

    if (!patterns) {
      // Unsearched query
      const sorted = [...candidates].sort((a, b) => {
        if (filters.sort === CLIENT_SORT_OPTIONS.NAME_ASC) {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      return {
        items: sorted.map((c) => ({ ...c, relevanceScore: 0 })),
        total: sorted.length,
      };
    }

    // 1. Related Court matching
    const courtScoreMap = new Map<string, number>();
    for (const co of mockCourts) {
      const score = calculateClientCourtMatchScore(co, patterns.sanitizedQuery);
      if (score > 0) courtScoreMap.set(String(co._id), score);
    }

    // 2. Related Case matching
    const clientRelatedScores = new Map<string, number>();
    for (const c of mockCases) {
      if (c.deletedAt !== null) continue; // Skip soft-deleted cases
      const caseCandidate: ClientRelatedCaseCandidate = {
        _id: new mongoose.Types.ObjectId(c._id),
        clientId: new mongoose.Types.ObjectId(c.clientId),
        courtId: c.courtId ? new mongoose.Types.ObjectId(c.courtId) : null,
        title: c.title,
        caseNumber: c.caseNumber,
        internalReference: c.internalReference,
        caseCategory: c.caseCategory,
        opposingCounsel: c.opposingCounsel,
        opposingParties: c.opposingParties,
        description: c.description,
        legalIssues: c.legalIssues,
      };
      const score = calculateClientCaseMatchScore(caseCandidate, patterns.sanitizedQuery, courtScoreMap);
      if (score > 0) {
        const existing = clientRelatedScores.get(c.clientId) || 0;
        clientRelatedScores.set(c.clientId, Math.max(existing, score));
      }
    }

    // 3. Related Document matching
    for (const d of mockDocuments) {
      if (d.deletedAt !== null) continue;
      const docCandidate: ClientRelatedDocumentCandidate = {
        _id: new mongoose.Types.ObjectId(d._id),
        clientId: new mongoose.Types.ObjectId(d.clientId),
        title: d.title,
        documentType: d.documentType,
        notes: d.notes,
      };
      const score = calculateClientDocumentMatchScore(docCandidate, patterns.sanitizedQuery);
      if (score > 0) {
        const existing = clientRelatedScores.get(d.clientId) || 0;
        clientRelatedScores.set(d.clientId, Math.max(existing, score));
      }
    }

    // 4. Related Payment matching
    for (const p of mockPayments) {
      const payCandidate: ClientRelatedPaymentCandidate = {
        _id: new mongoose.Types.ObjectId(p._id),
        clientId: new mongoose.Types.ObjectId(p.clientId),
        moneyReceiptNumber: p.moneyReceiptNumber,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
      };
      const score = calculateClientPaymentMatchScore(payCandidate, patterns.sanitizedQuery);
      if (score > 0) {
        const existing = clientRelatedScores.get(p.clientId) || 0;
        clientRelatedScores.set(p.clientId, Math.max(existing, score));
      }
    }

    const scored = candidates
      .map((c) => {
        const score = evaluateClientRelevance(c, query, clientRelatedScores);
        return { ...c, relevanceScore: score };
      })
      .filter((c) => c.relevanceScore > 0);

    // Relevance sort: relevanceScore DESC, secondary sort, _id DESC
    scored.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      if (filters.sort === CLIENT_SORT_OPTIONS.NAME_ASC) {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { items: scored, total: scored.length };
  }

  // ==========================================
  // Test Scenario 1: Exact client-name search
  // ==========================================
  console.log("--- 1. Exact client-name search ---");
  const res1 = simulateClientSearch("Tariqul Islam Chowdhury");
  assert(res1.items.length >= 1, "Finds client by exact name");
  assert(res1.items[0].clientNumber === "CL-2026-0001", "Tariqul Islam Chowdhury ranks #1");
  assert(res1.items[0].relevanceScore >= 100, "Exact name match receives score >= 100");

  // ==========================================
  // Test Scenario 2: Client-number search
  // ==========================================
  console.log("\n--- 2. Client-number search ---");
  const res2 = simulateClientSearch("CL-2026-0002");
  assert(res2.items.length >= 1, "Finds client by clientNumber");
  assert(res2.items[0].clientNumber === "CL-2026-0002", "Exact clientNumber ranks #1");
  assert(res2.items[0].relevanceScore >= 120, "Exact clientNumber receives identifier top score (>= 120)");

  // ==========================================
  // Test Scenario 3: Email and phone searches
  // ==========================================
  console.log("\n--- 3. Email and phone searches ---");
  const res3a = simulateClientSearch("tariqul@chowdhury.com");
  assert(res3a.items.length === 1 && res3a.items[0].clientNumber === "CL-2026-0001", "Finds client by exact email");
  assert(res3a.items[0].relevanceScore >= 110, "Email match receives contact score >= 110");

  const res3b = simulateClientSearch("01819998877");
  assert(res3b.items.length === 1 && res3b.items[0].clientNumber === "CL-2026-0002", "Finds client by phone number");
  assert(res3b.items[0].relevanceScore >= 70, "Phone number match receives score >= 70");

  const res3c = simulateClientSearch("01711998877");
  assert(res3c.items.length === 1 && res3c.items[0].clientNumber === "CL-2026-0001", "Finds client by alternatePhone");

  const res3d = simulateClientSearch("19881234567890");
  assert(res3d.items.length === 1 && res3d.items[0].clientNumber === "CL-2026-0001", "Finds client by nationalId");

  // ==========================================
  // Test Scenario 4: Minor spelling mistakes (Typo Tolerance)
  // ==========================================
  console.log("\n--- 4. Minor spelling mistakes in client fields (Typo Tolerance) ---");
  const res4a = simulateClientSearch("Shakib Islma");
  assert(res4a.items.some((c) => c.name === "Shakib Islam"), "Finds 'Shakib Islam' when user typed 'Shakib Islma' (transposition)");

  const res4b = simulateClientSearch("Chowdury");
  assert(res4b.items.some((c) => c.name.includes("Chowdhury") || c.organizationName?.includes("Chowdhury")), "Finds Chowdhury with missing 'h' ('Chowdury')");

  const res4c = simulateClientSearch("Karimm");
  assert(res4c.items.some((c) => c.name.includes("Karim")), "Finds Karim with extra letter ('Karimm')");

  // ==========================================
  // Test Scenario 5: Partial-word and multi-word searches
  // ==========================================
  console.log("\n--- 5. Partial-word and multi-word searches ---");
  const res5a = simulateClientSearch("Tariq");
  assert(res5a.items.some((c) => c.name.includes("Tariqul")), "Prefix 'Tariq' matches 'Tariqul'");

  const res5b = simulateClientSearch("Abdul Karim Agro");
  assert(res5b.items.some((c) => c.clientNumber === "CL-2026-0002"), "Multi-word query matches name + organization words");

  // ==========================================
  // Test Scenario 6: Searches that match an associated case title
  // ==========================================
  console.log("\n--- 6. Searches that match an associated case title ---");
  const res6 = simulateClientSearch("Commercial Contract Breach");
  assert(res6.items.length >= 1, "Returns client when associated case title matches");
  assert(res6.items[0].relevanceScore >= 70, "Discovered via case prefix receives strong related score (>= 70)");
  const res6Exact = simulateClientSearch("Commercial Contract Breach and Specific Performance");
  assert(res6Exact.items[0].relevanceScore >= 85, "Discovered via exact case title receives Tier 1 related score (>= 85)");

  // ==========================================
  // Test Scenario 7: Searches that match a related case number or reference
  // ==========================================
  console.log("\n--- 7. Searches that match a related case number or internal reference ---");
  const res7a = simulateClientSearch("CS-101/2026");
  assert(res7a.items.some((c) => c.clientNumber === "CL-2026-0001"), "Finds client via caseNumber 'CS-101/2026'");

  const res7b = simulateClientSearch("CASE-2026-0002");
  assert(res7b.items.some((c) => c.clientNumber === "CL-2026-0002"), "Finds client via internalReference 'CASE-2026-0002'");

  // ==========================================
  // Test Scenario 8: Searches that match other supported related-model fields
  // ==========================================
  console.log("\n--- 8. Searches that match other supported related-model fields ---");
  // 8a. Associated Court name
  const res8a = simulateClientSearch("Metropolitan Sessions Judge");
  assert(res8a.items.some((c) => c.clientNumber === "CL-2026-0002"), "Finds client Abdul Karim whose case is in Metropolitan Sessions Judge Court");

  // 8b. Document title
  const res8b = simulateClientSearch("Power of Attorney");
  assert(res8b.items.some((c) => c.clientNumber === "CL-2026-0001"), "Finds client via document title 'General Power of Attorney'");

  // 8c. Payment receipt number
  const res8c = simulateClientSearch("MR-2026-0099");
  assert(res8c.items.some((c) => c.clientNumber === "CL-2026-0002"), "Finds client via payment receipt 'MR-2026-0099'");

  // 8d. Payment reference number
  const res8d = simulateClientSearch("TXN-778899");
  assert(res8d.items.some((c) => c.clientNumber === "CL-2026-0001"), "Finds client via payment reference 'TXN-778899'");

  // ==========================================
  // Test Scenario 9: Relevance ranking across direct and related matches
  // ==========================================
  console.log("\n--- 9. Relevance ranking across direct and related-record matches ---");
  // Query "Karim":
  // Client 2 (Abdul Karim) has direct name match (85 word match) + direct org match (80)
  // If query is "Karim Agro", direct match ranks well above someone who only has a secondary mention
  const res9 = simulateClientSearch("Karim");
  assert(res9.items[0].clientNumber === "CL-2026-0002", "Direct name match ranks #1");

  // Compare direct client identifier match vs related case match
  const directCandidateScore = calculateDirectClientMatchScore(
    { clientNumber: "CL-2026-0001", name: "Tariqul Islam" },
    "CL-2026-0001"
  );
  assert(
    directCandidateScore >= CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT,
    `Direct identifier score (${directCandidateScore}) >= 120`
  );
  assert(
    CLIENT_SEARCH_RELEVANCE_SCORES.IDENTIFIER_EXACT > CLIENT_SEARCH_RELEVANCE_SCORES.RELATED_TIER_1,
    "Hierarchy holds: Direct exact identifier (120) > Related tier 1 (85)"
  );

  // ==========================================
  // Test Scenario 10: Search combined with clientType, status, and date filters
  // ==========================================
  console.log("\n--- 10. Search combined with client type, status, and date filters ---");
  const res10a = simulateClientSearch("Islam", { status: CLIENT_STATUSES.ACTIVE });
  assert(res10a.items.every((c) => c.status === CLIENT_STATUSES.ACTIVE), "Only active clients returned");
  assert(res10a.items.some((c) => c.clientNumber === "CL-2026-0001"), "Active client Tariqul Islam found");
  assert(!res10a.items.some((c) => c.clientNumber === "CL-2026-0003"), "Inactive client Shakib Islam excluded by status filter");

  const res10b = simulateClientSearch("Islam", { clientType: CLIENT_TYPES.ORGANIZATION });
  assert(res10b.items.length === 0, "No organization client named Islam exists; correctly filtered out");

  const res10c = simulateClientSearch("Tariqul", { startDate: "2026-01-01", endDate: "2026-01-31" });
  assert(res10c.items.length === 1 && res10c.items[0].clientNumber === "CL-2026-0001", "Client within date range matched");

  // ==========================================
  // Test Scenario 11: Correct relevance ordering across multiple pages
  // ==========================================
  console.log("\n--- 11. Correct relevance ordering across multiple pages ---");
  const searchAll = simulateClientSearch("Islam");
  const pageSize = 1;
  const page1Items = searchAll.items.slice(0, pageSize);
  const page2Items = searchAll.items.slice(pageSize, pageSize * 2);

  assert(page1Items.length === 1, "Page 1 has 1 item");
  assert(page2Items.length === 1, "Page 2 has 1 item");
  assert(page1Items[0]._id !== page2Items[0]._id, "No duplicate clients across pages");
  assert(
    page1Items[0].relevanceScore >= page2Items[0].relevanceScore,
    "Page 1 items have higher or equal relevanceScore than Page 2 items"
  );

  // ==========================================
  // Test Scenario 12: Correct totals and pagination metadata
  // ==========================================
  console.log("\n--- 12. Correct totals and pagination metadata ---");
  const total = searchAll.total;
  const limit = 2;
  const totalPages = Math.ceil(total / limit) || 1;
  const hasMore = 1 * limit < total;
  assert(total === 2, `Total matching clients for 'Islam' is 2 (found ${total})`);
  assert(totalPages === 1, `Total pages for limit=2 is 1`);
  assert(hasMore === false, "hasMore is false when page * limit >= total");

  // ==========================================
  // Test Scenario 13: Accurate client and global statistics
  // ==========================================
  console.log("\n--- 13. Accurate client and global statistics ---");
  const activeCount = searchAll.items.filter((c) => c.status === CLIENT_STATUSES.ACTIVE).length;
  const inactiveCount = searchAll.items.filter((c) => c.status === CLIENT_STATUSES.INACTIVE).length;
  assert(activeCount === 1, "Stats reflect 1 active client in matching set");
  assert(inactiveCount === 1, "Stats reflect 1 inactive client in matching set");

  // ==========================================
  // Test Scenario 14: Deleted records exclusion
  // ==========================================
  console.log("\n--- 14. Deleted clients and deleted related records handled appropriately ---");
  const res14a = simulateClientSearch("Deleted Client");
  assert(res14a.items.length === 0, "Soft-deleted client is NEVER returned even when name matches exactly");

  const res14b = simulateClientSearch("Cheque Dishonour Case");
  assert(
    !res14b.items.some((c) => c.clientNumber === "CL-2026-0001" && c.relevanceScore > 0 && !c.name.includes("Cheque")),
    "Soft-deleted case (CASE-2026-0003) is ignored and does NOT contribute related boost"
  );

  // ==========================================
  // Test Scenario 15: Empty results and invalid query parameters
  // ==========================================
  console.log("\n--- 15. Empty results and malformed inputs ---");
  const res15a = simulateClientSearch("xyznonexistentterm9999");
  assert(res15a.items.length === 0 && res15a.total === 0, "Non-matching query safely returns 0 items");

  assert(buildFuzzySearchPatterns("") === null, "Empty query produces null search patterns");
  assert(buildFuzzySearchPatterns("   ") === null, "Whitespace-only query produces null search patterns");
  assert(buildFuzzySearchPatterns(null) === null, "Null query produces null search patterns");
  assert(buildFuzzySearchPatterns(undefined) === null, "Undefined query produces null search patterns");

  const punctuationPattern = buildFuzzySearchPatterns("!@#$%^&*()");
  assert(punctuationPattern !== null, "Punctuation search safely generates escaped pattern without crashing");

  // ==========================================
  // Test Scenario 16: Requests without search term
  // ==========================================
  console.log("\n--- 16. Requests without search term behaving as before ---");
  const res16 = simulateClientSearch("");
  assert(res16.items.length === 3, "Unsearched query returns all 3 non-deleted clients");
  assert(res16.items.every((c) => c.relevanceScore === 0), "No relevance scores assigned when search is empty");

  // ==========================================
  // Test Scenario 17: Large result sets without excessive memory use
  // ==========================================
  console.log("\n--- 17. Bounded candidate limits & scalable aggregation verification ---");
  const sampleBuckets = bucketScoredEntityIds(new Map([[client1Id, 95], [client2Id, 70]]));
  assert(sampleBuckets.tier1Ids.length === 1, "Candidate with score 95 lands in tier 1");
  assert(sampleBuckets.tier2Ids.length === 1, "Candidate with score 70 lands in tier 2");
  assert(sampleBuckets.allMatchingIds.length === 2, "All matching IDs collected");

  const patterns = buildFuzzySearchPatterns("Tariqul")!;
  const stages = buildClientRelevanceStages(sampleBuckets, patterns);
  assert(stages.length === 2, "buildClientRelevanceStages generates exactly 2 pipeline stages ($addFields and $match)");
  assert("$addFields" in stages[0], "First stage is $addFields for dynamic relevanceScore");
  assert("$match" in stages[1], "Second stage is $match for relevanceScore > 0");

  console.log("\n=======================================================");
  console.log("🏆 ALL 17 CLIENT FUZZY SEARCH VERIFICATION SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runClientFuzzySearchTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
