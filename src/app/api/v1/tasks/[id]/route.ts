import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import Task from "@/db/models/Task.model";
import Case from "@/db/models/Case.model";
import Client from "@/db/models/Client.model";
import { TASK_STATUSES } from "@/const/task.const";
import {
  recordAuditLog,
  calculateAuditDiff,
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "@/lib/helpers/audit.helper";
import {
  taskIdParamSchema,
  updateTaskSchema,
} from "@/utils/zod/task.validation";
import type {
  TaskActionResponse,
  TaskDeleteResponse,
  RawTaskCaseInput,
  RawTaskClientInput,
} from "@/types/task.types";
import { formatTaskItem } from "../route";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/v1/tasks/[id]
 *
 * Update permitted task fields, manage completion dates, enforce relationship integrity,
 * and track changes via compliance audit log with zero redundant queries.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    const parsedId = taskIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid task ID format");
    }

    const taskId = parsedId.data.id;

    const existingTask = await Task.findOne({
      _id: taskId,
      deletedAt: null,
    });

    if (!existingTask) {
      throw ApiError.notFound("Task not found or has already been deleted");
    }

    const beforeState = existingTask.toObject();

    const body = await req.json().catch(() => ({}));
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      throw ApiError.badRequest("Invalid update payload", parsed.error.flatten().fieldErrors);
    }

    const {
      title,
      description,
      status,
      priority,
      dueAt,
      caseId,
      clientId,
    } = parsed.data;

    let caseDoc: RawTaskCaseInput | null | undefined = undefined;
    let clientDoc: RawTaskClientInput | null | undefined = undefined;

    // Validate Case relationship if changing
    if (caseId !== undefined) {
      if (caseId) {
        const fetchedCase = await Case.findOne({
          _id: caseId,
          deletedAt: null,
        })
          .select("_id clientId title caseNumber internalReference caseStatus")
          .lean();

        if (!fetchedCase) {
          throw ApiError.badRequest("Selected case does not exist or has been deleted");
        }
        caseDoc = fetchedCase;
        existingTask.caseId = new mongoose.Types.ObjectId(caseId);

        // Auto-link client from case if clientId is not explicitly set in payload
        if (clientId === undefined && fetchedCase.clientId && !existingTask.clientId) {
          existingTask.clientId = fetchedCase.clientId as mongoose.Types.ObjectId;
        }
      } else {
        existingTask.caseId = null;
        caseDoc = null;
      }
    }

    // Validate Client relationship if changing
    if (clientId !== undefined) {
      if (clientId) {
        const fetchedClient = await Client.findOne({
          _id: clientId,
          deletedAt: null,
        })
          .select("_id name clientNumber organizationName phone")
          .lean();

        if (!fetchedClient) {
          throw ApiError.badRequest("Selected client does not exist or has been deleted");
        }
        clientDoc = fetchedClient;
        existingTask.clientId = new mongoose.Types.ObjectId(clientId);
      } else {
        existingTask.clientId = null;
        clientDoc = null;
      }
    }

    // Handle Title
    if (title !== undefined) {
      existingTask.title = title.trim();
    }

    // Handle Description
    if (description !== undefined) {
      existingTask.description = description?.trim() || null;
    }

    // Handle Priority
    if (priority !== undefined) {
      existingTask.priority = priority;
    }

    // Handle Due Date
    if (dueAt !== undefined) {
      existingTask.dueAt = dueAt ? new Date(dueAt) : null;
    }

    // Handle Status and completion date
    if (status !== undefined) {
      existingTask.status = status;
      if (status === TASK_STATUSES.COMPLETED) {
        if (!existingTask.completedAt) {
          existingTask.completedAt = new Date();
        }
      } else {
        existingTask.completedAt = null;
      }
    }

    await existingTask.save();

    // Record audit log for task update
    const diff = calculateAuditDiff(beforeState, existingTask.toObject());
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: AUDIT_ENTITY_TYPES.TASK,
      entityId: existingTask._id,
      oldValues: diff.oldValues,
      newValues: diff.newValues,
      description: `Updated task "${existingTask.title}"`,
    });

    // Resolve related case details if not already fetched during relationship update
    if (caseDoc === undefined) {
      caseDoc = existingTask.caseId
        ? await Case.findOne({
            _id: existingTask.caseId,
            deletedAt: null,
          })
            .select("_id title caseNumber internalReference caseStatus")
            .lean()
        : null;
    }

    // Resolve related client details if not already fetched during relationship update
    if (clientDoc === undefined) {
      clientDoc = existingTask.clientId
        ? await Client.findOne({
            _id: existingTask.clientId,
            deletedAt: null,
          })
            .select("_id name clientNumber organizationName phone")
            .lean()
        : null;
    }

    const taskDto = formatTaskItem({
      ...existingTask.toObject(),
      caseDetails: caseDoc,
      clientDetails: clientDoc,
    });

    const response: TaskActionResponse = {
      success: true,
      message: "Task updated successfully",
      data: taskDto,
    };

    return NextResponse.json(response, { status: 200 });
  }
);

/**
 * DELETE /api/v1/tasks/[id]
 *
 * Soft-delete a task by setting its deletedAt timestamp.
 * Soft-deleted tasks immediately disappear from active listings and statistics.
 */
export const DELETE = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const userId = await getUserId();

    const { id } = await params;
    const parsedId = taskIdParamSchema.safeParse({ id });
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid task ID format");
    }

    const taskId = parsedId.data.id;

    const task = await Task.findOne({
      _id: taskId,
      deletedAt: null,
    });

    if (!task) {
      throw ApiError.notFound("Task not found or already deleted");
    }

    task.deletedAt = new Date();
    await task.save();

    // Record audit log for task soft deletion
    await recordAuditLog({
      req,
      userId,
      action: AUDIT_ACTIONS.SOFT_DELETE,
      entityType: AUDIT_ENTITY_TYPES.TASK,
      entityId: task._id,
      oldValues: { deletedAt: null },
      newValues: { deletedAt: task.deletedAt },
      description: `Moved task "${task.title}" to trash`,
    });

    const response: TaskDeleteResponse = {
      success: true,
      message: "Task moved to trash successfully",
      id: taskId,
    };

    return NextResponse.json(response, { status: 200 });
  }
);
