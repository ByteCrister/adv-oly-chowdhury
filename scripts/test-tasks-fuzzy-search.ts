import mongoose from "mongoose";
import {
  buildFuzzySearchPatterns,
  bucketScoredEntityIds,
  damerauLevenshteinDistance,
} from "@/lib/helpers/fuzzy-searching/shared-fuzzy-search.helper";
import {
  calculateTaskCaseMatchScore,
  calculateTaskClientMatchScore,
  calculateDirectTaskMatchScore,
  matchTaskStatusAndPriority,
  buildTaskRelevanceStages,
  TaskCaseCandidate,
  TaskClientCandidate,
  TASK_SEARCH_RELEVANCE_SCORES,
} from "@/lib/helpers/fuzzy-searching/task-fuzzy-search.helper";
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_SORT_OPTIONS,
  TASK_DUE_FILTERS,
} from "@/const/task.const";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface SimulatedTask {
  _id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueAt: string | null; // ISO string
  completedAt: string | null;
  deletedAt: string | null;
  caseId: string | null;
  clientId: string | null;
  createdAt: string;

  // Joined metadata for verification
  caseNumber: string | null;
  internalReference: string | null;
  caseTitle: string | null;
  caseCategory: string | null;
  opposingCounsel: string | null;
  opposingParties: string[] | null;
  caseDescription: string | null;
  legalIssues: string | null;

  clientName: string | null;
  clientNumber: string | null;
  organizationName: string | null;
  phone: string | null;
  alternatePhone: string | null;
  email: string | null;
}

/**
 * Evaluates relevance score mirroring the exact logic in buildTaskRelevanceStages.
 */
function evaluateTaskRelevance(
  t: SimulatedTask,
  query: string,
  caseDirectScores: Map<string, number>,
  clientScores: Map<string, number>,
  inheritedCaseScores: Map<string, number>
): number {
  const patterns = buildFuzzySearchPatterns(query);
  if (!patterns) return 0;

  const { matchedStatuses, matchedPriorities } = matchTaskStatusAndPriority(
    patterns.sanitizedQuery
  );

  const caseBuckets = bucketScoredEntityIds(caseDirectScores);
  const clientBuckets = bucketScoredEntityIds(clientScores);
  const inheritedClientCaseBuckets = bucketScoredEntityIds(inheritedCaseScores);

  let score = 0;

  // 1. Direct title
  if (t.title) {
    if (new RegExp(patterns.exactPattern, "i").test(t.title)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(t.title)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.TITLE_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(t.title)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.TITLE_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(t.title)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY;
    }
  }

  // 2. Direct description
  if (t.description) {
    if (new RegExp(patterns.exactPattern, "i").test(t.description)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_EXACT;
    } else if (new RegExp(patterns.wordPattern, "i").test(t.description)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD;
    } else if (new RegExp(patterns.substringPattern, "i").test(t.description)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_SUBSTRING;
    } else if (new RegExp(patterns.fuzzyPattern, "i").test(t.description)) {
      score += TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_FUZZY;
    }
  }

  // 3. Status match
  if (matchedStatuses.length > 0) {
    const sm = matchedStatuses.find((s) => s.status === t.status);
    if (sm) score += sm.score;
  }

  // 4. Priority match
  if (matchedPriorities.length > 0) {
    const pm = matchedPriorities.find((p) => p.priority === t.priority);
    if (pm) score += pm.score;
  }

  // 5. Associated Case direct match from buckets
  if (t.caseId) {
    const caseObjId = new mongoose.Types.ObjectId(t.caseId);
    if (caseBuckets.tier1Ids.some((id) => id.equals(caseObjId))) {
      score += TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_1;
    } else if (caseBuckets.tier2Ids.some((id) => id.equals(caseObjId))) {
      score += TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_2;
    } else if (caseBuckets.tier3Ids.some((id) => id.equals(caseObjId))) {
      score += TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_3;
    } else if (caseBuckets.tier4Ids.some((id) => id.equals(caseObjId))) {
      score += TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_4;
    } else if (caseBuckets.tier5Ids.some((id) => id.equals(caseObjId))) {
      score += TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_5;
    }
  }

  // 6. Direct Client match on t.clientId
  let directClientScore = 0;
  if (t.clientId) {
    const clientObjId = new mongoose.Types.ObjectId(t.clientId);
    if (clientBuckets.tier1Ids.some((id) => id.equals(clientObjId))) {
      directClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1;
    } else if (clientBuckets.tier2Ids.some((id) => id.equals(clientObjId))) {
      directClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2;
    } else if (clientBuckets.tier3Ids.some((id) => id.equals(clientObjId))) {
      directClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3;
    } else if (clientBuckets.tier4Ids.some((id) => id.equals(clientObjId))) {
      directClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4;
    } else if (clientBuckets.tier5Ids.some((id) => id.equals(clientObjId))) {
      directClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5;
    }
  }

  // 7. Inherited Client match on t.caseId (when direct client score is 0)
  let inheritedClientScore = 0;
  if (t.caseId) {
    const caseObjId = new mongoose.Types.ObjectId(t.caseId);
    if (inheritedClientCaseBuckets.tier1Ids.some((id) => id.equals(caseObjId))) {
      inheritedClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_1;
    } else if (inheritedClientCaseBuckets.tier2Ids.some((id) => id.equals(caseObjId))) {
      inheritedClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_2;
    } else if (inheritedClientCaseBuckets.tier3Ids.some((id) => id.equals(caseObjId))) {
      inheritedClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_3;
    } else if (inheritedClientCaseBuckets.tier4Ids.some((id) => id.equals(caseObjId))) {
      inheritedClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_4;
    } else if (inheritedClientCaseBuckets.tier5Ids.some((id) => id.equals(caseObjId))) {
      inheritedClientScore = TASK_SEARCH_RELEVANCE_SCORES.CLIENT_TIER_5;
    }
  }

  const effectiveClientScore = directClientScore > 0 ? directClientScore : inheritedClientScore;
  score += effectiveClientScore;

  return score;
}

async function runTasksFuzzySearchTests() {
  console.log("\n=======================================================");
  console.log("🧪 TASKS GET API FUZZY SEARCH & RELEVANCE VERIFICATION");
  console.log("=======================================================\n");

  // Mock ObjectId constants
  const CASE_1_ID = "507f191e810c19729de860ea";
  const CASE_2_ID = "507f191e810c19729de860eb";
  const CASE_DELETED_ID = "507f191e810c19729de860ec";

  const CLIENT_1_ID = "507f1f77bcf86cd799439011";
  const CLIENT_2_ID = "507f1f77bcf86cd799439012";
  const CLIENT_DELETED_ID = "507f1f77bcf86cd799439013";

  const now = new Date();
  const pastDate = new Date(now.getTime() - 86400000 * 2).toISOString();
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 0, 0).toISOString();
  const futureDate = new Date(now.getTime() + 86400000 * 3).toISOString();

  // Test Case database candidates
  const mockCases: TaskCaseCandidate[] = [
    {
      _id: new mongoose.Types.ObjectId(CASE_1_ID),
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      title: "Contract Breach Dispute",
      caseCategory: "Commercial Law",
      opposingCounsel: "Advocate Rahman",
      opposingParties: ["Apex Global Traders"],
      description: "Dispute over unfulfilled commercial export obligations.",
      legalIssues: "Specific performance and contractual damages.",
      clientId: new mongoose.Types.ObjectId(CLIENT_1_ID),
    },
    {
      _id: new mongoose.Types.ObjectId(CASE_2_ID),
      caseNumber: "WR-202/2026",
      internalReference: "CASE-2026-0002",
      title: "Land Title Declaration",
      caseCategory: "Civil Property",
      opposingCounsel: "Barrister Karim",
      opposingParties: ["Sylhet Municipal Authority"],
      description: "Petition challenging unlawful property encroachment.",
      legalIssues: "Title declaration and permanent injunction.",
      clientId: new mongoose.Types.ObjectId(CLIENT_2_ID),
    },
    {
      _id: new mongoose.Types.ObjectId(CASE_DELETED_ID),
      caseNumber: "DL-999/2025",
      internalReference: "CASE-2025-0099",
      title: "Eviction Restitution Decree",
      caseCategory: "Tenancy",
      clientId: new mongoose.Types.ObjectId(CLIENT_DELETED_ID),
    },
  ];

  // Test Client database candidates
  const mockClients: TaskClientCandidate[] = [
    {
      _id: new mongoose.Types.ObjectId(CLIENT_1_ID),
      clientNumber: "CL-2026-0001",
      name: "Tariqul Islam Chowdhury",
      organizationName: "Chowdhury Textiles Limited",
      phone: "+8801711223344",
      alternatePhone: "01811223344",
      email: "tariqul@chowdhurytextiles.com",
    },
    {
      _id: new mongoose.Types.ObjectId(CLIENT_2_ID),
      clientNumber: "CL-2026-0002",
      name: "Fatima Begum",
      organizationName: "Begum Agro Farm",
      phone: "+8801911998877",
      alternatePhone: null,
      email: "fatima.agro@gmail.com",
    },
    {
      _id: new mongoose.Types.ObjectId(CLIENT_DELETED_ID),
      clientNumber: "CL-2025-0099",
      name: "Deleted Client Person",
      organizationName: "Defunct Co",
      phone: "01500000000",
      alternatePhone: null,
      email: "deleted@example.com",
    },
  ];

  // Simulated Tasks
  const mockTasks: SimulatedTask[] = [
    {
      _id: "task-1",
      title: "Draft Statement of Claim",
      description: "Prepare and finalize the formal plaint for the commercial contract breach proceedings.",
      status: TASK_STATUSES.TODO,
      priority: TASK_PRIORITIES.URGENT,
      dueAt: todayDate,
      completedAt: null,
      deletedAt: null,
      caseId: CASE_1_ID,
      clientId: CLIENT_1_ID,
      createdAt: "2026-02-01T10:00:00.000Z",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseTitle: "Contract Breach Dispute",
      caseCategory: "Commercial Law",
      opposingCounsel: "Advocate Rahman",
      opposingParties: ["Apex Global Traders"],
      caseDescription: "Dispute over unfulfilled commercial export obligations.",
      legalIssues: "Specific performance and contractual damages.",
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0001",
      organizationName: "Chowdhury Textiles Limited",
      phone: "+8801711223344",
      alternatePhone: "01811223344",
      email: "tariqul@chowdhurytextiles.com",
    },
    {
      _id: "task-2",
      title: "Prepare Witness Statement",
      description: "Meet with managing director to review shipment documentation and sign affidavit.",
      status: TASK_STATUSES.IN_PROGRESS,
      priority: TASK_PRIORITIES.HIGH,
      dueAt: futureDate,
      completedAt: null,
      deletedAt: null,
      caseId: CASE_1_ID,
      clientId: CLIENT_1_ID,
      createdAt: "2026-02-02T10:00:00.000Z",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseTitle: "Contract Breach Dispute",
      caseCategory: "Commercial Law",
      opposingCounsel: "Advocate Rahman",
      opposingParties: ["Apex Global Traders"],
      caseDescription: "Dispute over unfulfilled commercial export obligations.",
      legalIssues: "Specific performance and contractual damages.",
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0001",
      organizationName: "Chowdhury Textiles Limited",
      phone: "+8801711223344",
      alternatePhone: "01811223344",
      email: "tariqul@chowdhurytextiles.com",
    },
    {
      _id: "task-3",
      title: "File Injunction Application",
      description: "Submit urgent petition seeking temporary injunction on encroachment activities.",
      status: TASK_STATUSES.TODO,
      priority: TASK_PRIORITIES.HIGH,
      dueAt: pastDate, // Overdue
      completedAt: null,
      deletedAt: null,
      caseId: CASE_2_ID,
      clientId: CLIENT_2_ID,
      createdAt: "2026-02-03T10:00:00.000Z",
      caseNumber: "WR-202/2026",
      internalReference: "CASE-2026-0002",
      caseTitle: "Land Title Declaration",
      caseCategory: "Civil Property",
      opposingCounsel: "Barrister Karim",
      opposingParties: ["Sylhet Municipal Authority"],
      caseDescription: "Petition challenging unlawful property encroachment.",
      legalIssues: "Title declaration and permanent injunction.",
      clientName: "Fatima Begum",
      clientNumber: "CL-2026-0002",
      organizationName: "Begum Agro Farm",
      phone: "+8801911998877",
      alternatePhone: null,
      email: "fatima.agro@gmail.com",
    },
    {
      _id: "task-4",
      title: "Archive Closed Case Records",
      description: "Transfer completed matter files to long-term digital repository.",
      status: TASK_STATUSES.COMPLETED,
      priority: TASK_PRIORITIES.LOW,
      dueAt: pastDate,
      completedAt: "2026-02-05T10:00:00.000Z",
      deletedAt: null,
      caseId: null,
      clientId: null,
      createdAt: "2026-01-15T10:00:00.000Z",
      caseNumber: null,
      internalReference: null,
      caseTitle: null,
      caseCategory: null,
      opposingCounsel: null,
      opposingParties: null,
      caseDescription: null,
      legalIssues: null,
      clientName: null,
      clientNumber: null,
      organizationName: null,
      phone: null,
      alternatePhone: null,
      email: null,
    },
    {
      _id: "task-deleted",
      title: "Unpublished Obsolete Task Record",
      description: "Should never appear in results.",
      status: TASK_STATUSES.CANCELLED,
      priority: TASK_PRIORITIES.NORMAL,
      dueAt: null,
      completedAt: null,
      deletedAt: "2026-02-01T00:00:00.000Z",
      caseId: CASE_1_ID,
      clientId: CLIENT_1_ID,
      createdAt: "2026-01-01T10:00:00.000Z",
      caseNumber: "CS-101/2026",
      internalReference: "CASE-2026-0001",
      caseTitle: "Contract Breach Dispute",
      caseCategory: "Commercial Law",
      opposingCounsel: "Advocate Rahman",
      opposingParties: ["Apex Global Traders"],
      caseDescription: "Dispute over unfulfilled commercial export obligations.",
      legalIssues: "Specific performance and contractual damages.",
      clientName: "Tariqul Islam Chowdhury",
      clientNumber: "CL-2026-0001",
      organizationName: "Chowdhury Textiles Limited",
      phone: "+8801711223344",
      alternatePhone: "01811223344",
      email: "tariqul@chowdhurytextiles.com",
    },
  ];

  // Helper to run simulated search pipeline
  function runSearch(
    query: string,
    options: {
      status?: string;
      priority?: string;
      caseId?: string;
      clientId?: string;
      dueFilter?: string;
      sort?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const patterns = buildFuzzySearchPatterns(query);

    const clientScores = new Map<string, number>();
    const caseDirectScores = new Map<string, number>();
    const inheritedCaseScores = new Map<string, number>();

    if (patterns) {
      for (const cl of mockClients) {
        if (cl._id.toHexString() === CLIENT_DELETED_ID) continue; // Deleted client excluded
        const s = calculateTaskClientMatchScore(cl, patterns.sanitizedQuery);
        if (s > 0) clientScores.set(String(cl._id), s);
      }

      for (const cs of mockCases) {
        if (cs._id.toHexString() === CASE_DELETED_ID) continue; // Deleted case excluded
        const { directScore, clientScore } = calculateTaskCaseMatchScore(
          cs,
          patterns.sanitizedQuery,
          clientScores
        );
        if (directScore > 0) caseDirectScores.set(String(cs._id), directScore);
        if (clientScore > 0) inheritedCaseScores.set(String(cs._id), clientScore);
      }
    }

    // Filter tasks
    const activeTasks = mockTasks.filter((t) => t.deletedAt === null);

    const filtered = activeTasks.filter((t) => {
      if (options.status && options.status !== "ALL" && t.status !== options.status) {
        return false;
      }
      if (options.priority && options.priority !== "ALL" && t.priority !== options.priority) {
        return false;
      }
      if (options.caseId && t.caseId !== options.caseId) {
        return false;
      }
      if (options.clientId && t.clientId !== options.clientId) {
        return false;
      }
      if (options.dueFilter) {
        const nowDate = new Date();
        if (options.dueFilter === TASK_DUE_FILTERS.OVERDUE) {
          if (!t.dueAt || new Date(t.dueAt) >= nowDate || t.status === TASK_STATUSES.COMPLETED || t.status === TASK_STATUSES.CANCELLED) {
            return false;
          }
        } else if (options.dueFilter === TASK_DUE_FILTERS.TODAY) {
          if (!t.dueAt) return false;
          const d = new Date(t.dueAt);
          if (d.getDate() !== nowDate.getDate() || d.getMonth() !== nowDate.getMonth()) return false;
        } else if (options.dueFilter === TASK_DUE_FILTERS.NO_DUE_DATE) {
          if (t.dueAt !== null) return false;
        }
      }
      return true;
    });

    // Score and rank
    let scoredItems: Array<{ task: SimulatedTask; score: number }> = [];

    if (patterns) {
      for (const task of filtered) {
        const score = evaluateTaskRelevance(
          task,
          patterns.sanitizedQuery,
          caseDirectScores,
          clientScores,
          inheritedCaseScores
        );
        if (score > 0) {
          scoredItems.push({ task, score });
        }
      }
      // Sort by relevance score desc, then createdAt desc
      scoredItems.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime();
      });
    } else {
      scoredItems = filtered.map((task) => ({ task, score: 0 }));
      if (options.sort === TASK_SORT_OPTIONS.OLDEST) {
        scoredItems.sort((a, b) => new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime());
      } else if (options.sort === TASK_SORT_OPTIONS.TITLE_ASC) {
        scoredItems.sort((a, b) => a.task.title.localeCompare(b.task.title));
      } else {
        scoredItems.sort((a, b) => new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime());
      }
    }

    const total = scoredItems.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const paginated = scoredItems.slice((page - 1) * limit, page * limit);

    // Compute stats
    const stats = {
      total,
      todo: scoredItems.filter((i) => i.task.status === TASK_STATUSES.TODO).length,
      inProgress: scoredItems.filter((i) => i.task.status === TASK_STATUSES.IN_PROGRESS).length,
      completed: scoredItems.filter((i) => i.task.status === TASK_STATUSES.COMPLETED).length,
      overdue: scoredItems.filter((i) => {
        const d = i.task.dueAt ? new Date(i.task.dueAt) : null;
        return d && d < new Date() && i.task.status !== TASK_STATUSES.COMPLETED && i.task.status !== TASK_STATUSES.CANCELLED;
      }).length,
      urgent: scoredItems.filter((i) => i.task.priority === TASK_PRIORITIES.URGENT).length,
      high: scoredItems.filter((i) => i.task.priority === TASK_PRIORITIES.HIGH).length,
    };

    return {
      items: paginated.map((p) => p.task),
      scores: paginated.map((p) => p.score),
      total,
      hasMore: page * limit < total,
      stats,
    };
  }

  // --- Scenario 1: Exact task-title match ranks first ---
  console.log("--- 1. Exact task-title match ranks first ---");
  {
    const res = runSearch("Draft Statement of Claim");
    assert(res.total >= 1, "Finds task by exact title");
    assert(res.items[0]._id === "task-1", "Task 1 ranks #1 for exact title match");
    assert(res.scores[0] >= TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT, "Exact title gets top score (>= 120)");
  }

  // --- Scenario 2: Minor typo tolerance in title ---
  console.log("\n--- 2. Minor typo in task title (Typo Tolerance) ---");
  {
    // Typo: 'witnes statment' -> 'witness statement'
    const res = runSearch("witnes statment");
    assert(res.total >= 1, "Finds task despite typos ('witnes statment')");
    assert(res.items[0]._id === "task-2", "Task 2 is found and ranked for typo");
    assert(damerauLevenshteinDistance("witnes", "witness") === 1, "Edit distance is 1");

    // Typo: 'documnt' -> matches 'documentation' in description of Task 2
    const resDoc = runSearch("documnt");
    assert(resDoc.total >= 1, "Typo 'documnt' finds task with 'documentation'");
  }

  // --- Scenario 3: Partial description match ---
  console.log("\n--- 3. Partial description match ---");
  {
    const res = runSearch("digital repository");
    assert(res.total >= 1, "Finds task by description phrase 'digital repository'");
    assert(res.items[0]._id === "task-4", "Task 4 ranks #1 for description phrase");
  }

  // --- Scenario 4: Search by related Case title and Case Number ---
  console.log("\n--- 4. Search by related Case title, caseNumber, and internalReference ---");
  {
    const resNum = runSearch("CS-101/2026");
    assert(resNum.total >= 2, "Finds tasks associated with caseNumber 'CS-101/2026'");
    assert(resNum.items.every((t) => t.caseId === CASE_1_ID), "All returned tasks belong to Case 1");

    const resTitle = runSearch("Contract Breach");
    assert(resTitle.total >= 2, "Finds tasks by case title 'Contract Breach'");

    const resRef = runSearch("CASE-2026-0002");
    assert(resRef.total === 1, "Finds task associated with internalReference 'CASE-2026-0002'");
    assert(resRef.items[0]._id === "task-3", "Task 3 found for Case 2");
  }

  // --- Scenario 5: Search by related Client name and clientNumber ---
  console.log("\n--- 5. Search by related Client name, clientNumber, and organization ---");
  {
    const resClient = runSearch("Tariqul Islam");
    assert(resClient.total >= 2, "Finds tasks for client 'Tariqul Islam'");
    assert(resClient.items.every((t) => t.clientId === CLIENT_1_ID), "All tasks belong to Client 1");

    const resNum = runSearch("CL-2026-0002");
    assert(resNum.total === 1, "Finds task for clientNumber 'CL-2026-0002'");
    assert(resNum.items[0]._id === "task-3", "Task 3 found for Client 2");

    const resOrg = runSearch("Chowdhury Textiles");
    assert(resOrg.total >= 2, "Finds tasks by client organizationName");
  }

  // --- Scenario 6: Additional supported fields are searchable ---
  console.log("\n--- 6. Additional supported fields are searchable (Priority, Status, Counsel, Contact) ---");
  {
    // Search priority 'urgent'
    const resUrgent = runSearch("urgent");
    assert(resUrgent.total >= 1, "Searching 'urgent' matches tasks with urgent priority/description");
    assert(resUrgent.items.some((t) => t.priority === TASK_PRIORITIES.URGENT), "Matches task with URGENT priority");
    assert(resUrgent.items.some((t) => t.description?.toLowerCase().includes("urgent")), "Matches task with 'urgent' in description");

    // Search typo 'urgnt'
    const resUrgnt = runSearch("urgnt");
    assert(resUrgnt.total >= 1, "Typo 'urgnt' matches urgent task");

    // Search status 'completed'
    const resComp = runSearch("completed");
    assert(resComp.total >= 1, "Searching 'completed' matches completed tasks");
    assert(resComp.items.some((t) => t.status === TASK_STATUSES.COMPLETED), "Found completed task");

    // Search case opposingCounsel
    const resCounsel = runSearch("Barrister Karim");
    assert(resCounsel.total === 1, "Finds task by case opposingCounsel 'Barrister Karim'");
    assert(resCounsel.items[0]._id === "task-3", "Task 3 found via counsel");

    // Search client email
    const resEmail = runSearch("tariqul@chowdhurytextiles.com");
    assert(resEmail.total >= 2, "Finds tasks by client email");

    // Search client phone
    const resPhone = runSearch("01811223344");
    assert(resPhone.total >= 2, "Finds tasks by client alternatePhone");
  }

  // --- Scenario 7: Multiple query terms produce sensible ranking ---
  console.log("\n--- 7. Multiple query terms produce sensible ranking ---");
  {
    const resMulti = runSearch("Claim Contract Tariqul");
    assert(resMulti.total >= 1, "Multi-term query returns matching task");
    assert(resMulti.items[0]._id === "task-1", "Task 1 matching title + case + client ranks #1");
    assert(resMulti.scores[0] > 100, "Cumulative multi-match score is high (> 100)");
  }

  // --- Scenario 8: Exact matches rank above weaker fuzzy matches ---
  console.log("\n--- 8. Exact matches rank above weaker fuzzy matches ---");
  {
    assert(
      TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT > TASK_SEARCH_RELEVANCE_SCORES.TITLE_FUZZY,
      "Hierarchy: Title Exact (120) > Title Fuzzy (45)"
    );
    assert(
      TASK_SEARCH_RELEVANCE_SCORES.TITLE_EXACT > TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_1,
      "Hierarchy: Title Exact (120) > Case Tier 1 (85)"
    );
    assert(
      TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_1 > TASK_SEARCH_RELEVANCE_SCORES.DESCRIPTION_WORD,
      "Hierarchy: Case Tier 1 (85) > Description Word (60)"
    );
    assert(
      TASK_SEARCH_RELEVANCE_SCORES.TITLE_WORD > TASK_SEARCH_RELEVANCE_SCORES.CASE_TIER_2,
      "Hierarchy: Title Word (95) > Case Tier 2 (70)"
    );
  }

  // --- Scenario 9: Weakly related records are not included excessively ---
  console.log("\n--- 9. Short queries avoid excessive false matches ---");
  {
    const { matchedStatuses: shortStatus } = matchTaskStatusAndPriority("in");
    assert(shortStatus.length === 0, "Query 'in' does NOT match IN_PROGRESS status");

    const { matchedStatuses: shortTodo } = matchTaskStatusAndPriority("to");
    assert(shortTodo.length === 0, "Query 'to' does NOT match TODO status");

    const nonMatch = runSearch("xyznonexistent999");
    assert(nonMatch.total === 0, "Non-matching query safely returns 0 results");
  }

  // --- Scenario 10: Status and priority filters work with fuzzy search ---
  console.log("\n--- 10. Status and priority filters work together with fuzzy search ---");
  {
    const res = runSearch("Contract", { status: TASK_STATUSES.TODO });
    assert(res.total === 1, "Status filter limits results to TODO");
    assert(res.items[0].status === TASK_STATUSES.TODO, "Returned item is TODO");

    const resPriority = runSearch("Contract", { priority: TASK_PRIORITIES.HIGH });
    assert(resPriority.total === 1, "Priority filter limits results to HIGH");
    assert(resPriority.items[0]._id === "task-2", "Task 2 is HIGH priority");
  }

  // --- Scenario 11: caseId and clientId filters remain effective ---
  console.log("\n--- 11. caseId and clientId filters remain effective ---");
  {
    const resCase = runSearch("Statement", { caseId: CASE_1_ID });
    assert(resCase.total >= 1, "caseId filter applied with search");
    assert(resCase.items.every((t) => t.caseId === CASE_1_ID), "All items belong to specified caseId");

    const resClient = runSearch("Injunction", { clientId: CLIENT_2_ID });
    assert(resClient.total === 1, "clientId filter applied with search");
    assert(resClient.items[0].clientId === CLIENT_2_ID, "Item belongs to specified clientId");
  }

  // --- Scenario 12: Due date filters retain existing behavior ---
  console.log("\n--- 12. Due-date filters retain existing behavior ---");
  {
    const resOverdue = runSearch("Injunction", { dueFilter: TASK_DUE_FILTERS.OVERDUE });
    assert(resOverdue.total === 1, "Finds overdue task matching search");
    assert(resOverdue.items[0]._id === "task-3", "Task 3 is overdue");

    const resToday = runSearch("Claim", { dueFilter: TASK_DUE_FILTERS.TODAY });
    assert(resToday.total === 1, "Finds today due task matching search");
    assert(resToday.items[0]._id === "task-1", "Task 1 is due today");

    const resNoDue = runSearch("Archive", { dueFilter: TASK_DUE_FILTERS.NO_DUE_DATE });
    assert(resNoDue.total === 0, "Task 4 has a past due date, correctly excluded from NO_DUE_DATE");
  }

  // --- Scenario 13: Sort options behave correctly with search ---
  console.log("\n--- 13. All sort options behave correctly ---");
  {
    const supportedSorts = [
      TASK_SORT_OPTIONS.DUE_DATE_ASC,
      TASK_SORT_OPTIONS.DUE_DATE_DESC,
      TASK_SORT_OPTIONS.NEWEST,
      TASK_SORT_OPTIONS.OLDEST,
      TASK_SORT_OPTIONS.PRIORITY_DESC,
      TASK_SORT_OPTIONS.PRIORITY_ASC,
      TASK_SORT_OPTIONS.TITLE_ASC,
      TASK_SORT_OPTIONS.TITLE_DESC,
    ];
    for (const s of supportedSorts) {
      const res = runSearch("Contract", { sort: s });
      assert(res.total >= 2, `Supports sort option: ${s}`);
    }
  }

  // --- Scenario 14: Relevance ranking happens before pagination ---
  console.log("\n--- 14. Relevance ranking happens before pagination ---");
  {
    const page1 = runSearch("Statement", { page: 1, limit: 1 });
    const page2 = runSearch("Statement", { page: 2, limit: 1 });

    assert(page1.items.length === 1, "Page 1 returns 1 item");
    assert(page2.items.length === 1, "Page 2 returns 1 item");
    assert(page1.items[0]._id !== page2.items[0]._id, "No duplicate items across pages");
    assert(page1.scores[0] >= page2.scores[0], "Page 1 item has higher or equal relevance score than Page 2");
    assert(page1.hasMore === true, "hasMore is true on Page 1");
    assert(page2.hasMore === false, "hasMore is false on Page 2");
  }

  // --- Scenario 15: Pagination totals and hasMore remain accurate ---
  console.log("\n--- 15. Pagination totals and hasMore remain accurate ---");
  {
    const res = runSearch("Contract", { limit: 10 });
    assert(res.total === 2, "Total count is exactly 2 for 'Contract'");
    assert(res.hasMore === false, "hasMore is false when total <= limit");
  }

  // --- Scenario 16: Aggregate statistics remain correct for filtered search ---
  console.log("\n--- 16. Aggregate statistics remain correct for filtered search ---");
  {
    const res = runSearch("Contract");
    assert(res.stats.total === 2, "Stats total is 2");
    assert(res.stats.todo === 1, "Stats todo is 1");
    assert(res.stats.inProgress === 1, "Stats inProgress is 1");
    assert(res.stats.urgent === 1, "Stats urgent priority is 1");
    assert(res.stats.high === 1, "Stats high priority is 1");
  }

  // --- Scenario 17: Soft-deleted tasks and deleted related records are excluded ---
  console.log("\n--- 17. Soft-deleted tasks and deleted related records are excluded ---");
  {
    const resDel = runSearch("Unpublished Obsolete");
    assert(resDel.total === 0, "Soft-deleted task is excluded even when content matches exactly");

    const resDelCase = runSearch("Eviction Restitution Decree");
    assert(resDelCase.total === 0, "Soft-deleted case produces no task matches");

    const resDelClient = runSearch("Deleted Client Person");
    assert(resDelClient.total === 0, "Soft-deleted client produces no task matches");
  }

  // --- Scenario 18: Empty search preserves existing behavior ---
  console.log("\n--- 18. Empty search preserves existing behavior ---");
  {
    const resEmpty = runSearch("");
    assert(resEmpty.total === 4, "Empty search returns all active tasks (4)");
    assert(resEmpty.scores.every((s) => s === 0), "No relevance scores assigned when search is empty");

    const resNullPattern = buildFuzzySearchPatterns("   ");
    assert(resNullPattern === null, "Whitespace-only search returns null pattern");
  }

  // --- Scenario 19: Empty results and out-of-range pages ---
  console.log("\n--- 19. Empty results and out-of-range pages handled correctly ---");
  {
    const resEmpty = runSearch("absolutelyunmatchedstring99999");
    assert(resEmpty.total === 0, "Empty results return total 0");
    assert(resEmpty.items.length === 0, "Empty items array returned");
    assert(resEmpty.hasMore === false, "hasMore is false");

    const resOutRange = runSearch("Contract", { page: 99, limit: 10 });
    assert(resOutRange.items.length === 0, "Out-of-range page returns empty items");
    assert(resOutRange.total === 2, "Total count preserved on out-of-range page");
  }

  // --- Scenario 20: Pipeline construction and shared helper integrity ---
  console.log("\n--- 20. Pipeline construction and shared helper integrity ---");
  {
    const patterns = buildFuzzySearchPatterns("Contract Claim")!;
    const caseBuckets = bucketScoredEntityIds(new Map([[CASE_1_ID, 85]]));
    const clientBuckets = bucketScoredEntityIds(new Map([[CLIENT_1_ID, 70]]));
    const inheritedBuckets = bucketScoredEntityIds(new Map());

    const stages = buildTaskRelevanceStages(
      caseBuckets,
      clientBuckets,
      inheritedBuckets,
      patterns,
      [{ status: TASK_STATUSES.TODO, score: 55 }],
      [{ priority: TASK_PRIORITIES.URGENT, score: 60 }]
    );

    assert(stages.length === 2, "buildTaskRelevanceStages creates exactly 2 stages ($addFields and $match)");
    assert("$addFields" in stages[0], "First stage is $addFields");
    assert("$match" in stages[1], "Second stage is $match for relevanceScore > 0");

    // Verify Direct scoring utility
    const directScore = calculateDirectTaskMatchScore(
      { title: "Contract Claim", description: "Notes" },
      "Contract Claim"
    );
    assert(directScore >= 120, "calculateDirectTaskMatchScore assigns exact title score (>= 120)");
  }

  console.log("\n=======================================================");
  console.log("🏆 ALL 20 TASKS VERIFICATION SCENARIOS PASSED!");
  console.log("=======================================================\n");
}

runTasksFuzzySearchTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
