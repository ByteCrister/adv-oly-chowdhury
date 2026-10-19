import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  formatChamberTask,
  type LeanTaskRecord,
} from "@/lib/helpers/dashboard.helper";
import Task from "@/db/models/Task.model";
import "@/db/models/Case.model";
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/const/task.const";
import {
  taskIdParamSchema,
  updateTaskStatusSchema,
} from "@/utils/zod/task.validation";
import type { TaskUpdateApiResponse } from "@/types/dashboard.ui.type";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/dashboard/tasks/[id]
 *
 * Lightweight quick-toggle endpoint for chamber tasks from the dashboard view.
 * Enforces ObjectId format validation, checks soft-delete status, automatically
 * maintains completedAt timestamps, records compliance audit logs, and serializes
 * a strongly typed ChamberTaskDto matching the client contract.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    // 1. Validate route parameter
    const resolvedParams = await params;
    const parsedParams = taskIdParamSchema.safeParse(resolvedParams);
    if (!parsedParams.success) {
      throw ApiError.badRequest("Invalid task ID format");
    }
    const taskId = parsedParams.data.id;

    // 2. Validate request body with Zod
    const body = await req.json().catch(() => null);
    const parsedBody = updateTaskStatusSchema.safeParse(body);
    if (!parsedBody.success) {
      throw ApiError.badRequest(
        "Invalid task status payload",
        parsedBody.error.flatten().fieldErrors
      );
    }
    const { status: targetStatus } = parsedBody.data;

    // 3. Find existing non-deleted task
    const existingTask = await Task.findOne({
      _id: taskId,
      deletedAt: null,
    });

    if (!existingTask) {
      throw ApiError.notFound("Task not found or has already been deleted");
    }

    const beforeState = existingTask.toObject();

    // 4. Update status and handle completedAt timestamp
    existingTask.status = targetStatus;
    if (targetStatus === TASK_STATUSES.COMPLETED) {
      if (!existingTask.completedAt) {
        existingTask.completedAt = new Date();
      }
    } else {
      existingTask.completedAt = null;
    }

    await existingTask.save();

    // 5. Populate case relationship for DTO serialization
    await existingTask.populate(
      "caseId",
      "internalReference caseNumber title deletedAt"
    );

    const afterState = existingTask.toObject();

    // 6. Record compliance audit log if fields changed
    const diff = calculateAuditDiff(beforeState, afterState);
    if (diff.oldValues || diff.newValues) {
      await recordAuditLog({
        req,
        userId,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: AUDIT_ENTITY_TYPES.TASK,
        entityId: existingTask._id,
        oldValues: diff.oldValues,
        newValues: diff.newValues,
        description: `Changed task status from "${beforeState.status}" to "${targetStatus}"`,
      });
    }

    // 7. Format type-safe ChamberTaskDto matching TaskUpdateApiResponse contract
    const dto = formatChamberTask(afterState as unknown as LeanTaskRecord);

    const response: TaskUpdateApiResponse = {
      success: true,
      data: dto,
      message: `Task status updated to ${TASK_STATUS_LABELS[targetStatus] || targetStatus}`,
    };

    return NextResponse.json(response, { status: 200 });
  }
);
