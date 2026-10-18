import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getAuthSession } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import Task from "@/db/models/Task.model";
import Case from "@/db/models/Case.model";
import Client from "@/db/models/Client.model";
import { TASK_STATUSES, TASK_PRIORITIES } from "@/const/task.const";
import {
  objectIdValidator,
  updateTaskSchema,
} from "@/utils/zod/task.validation";
import type {
  TaskItemDto,
  TaskActionResponse,
  TaskDeleteResponse,
} from "@/types/task.types";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function formatTaskItem(doc: Record<string, unknown>): TaskItemDto {
  const now = new Date();
  const dueAtDate = doc.dueAt ? new Date(doc.dueAt as Date) : null;
  const isCompleted = doc.status === TASK_STATUSES.COMPLETED;
  const isCancelled = doc.status === TASK_STATUSES.CANCELLED;
  const isOverdue = Boolean(dueAtDate && dueAtDate < now && !isCompleted && !isCancelled);

  const rawCase = doc.caseDetails as Record<string, unknown> | null | undefined;
  const rawClient = doc.clientDetails as Record<string, unknown> | null | undefined;

  return {
    id: (doc._id as mongoose.Types.ObjectId).toString(),
    title: (doc.title as string) || "Untitled Task",
    description: (doc.description as string) || null,
    status: (doc.status as TaskItemDto["status"]) || TASK_STATUSES.TODO,
    priority: (doc.priority as TaskItemDto["priority"]) || TASK_PRIORITIES.NORMAL,
    dueAt: dueAtDate ? dueAtDate.toISOString() : null,
    completedAt: doc.completedAt ? new Date(doc.completedAt as Date).toISOString() : null,
    isOverdue,
    caseId: doc.caseId ? (doc.caseId as mongoose.Types.ObjectId).toString() : null,
    caseDetails: rawCase?._id
      ? {
          id: (rawCase._id as mongoose.Types.ObjectId).toString(),
          title: (rawCase.title as string) || "Untitled Case",
          caseNumber: (rawCase.caseNumber as string) || null,
          internalReference: (rawCase.internalReference as string) || "",
          caseStatus: (rawCase.caseStatus as string) || undefined,
        }
      : null,
    clientId: doc.clientId ? (doc.clientId as mongoose.Types.ObjectId).toString() : null,
    clientDetails: rawClient?._id
      ? {
          id: (rawClient._id as mongoose.Types.ObjectId).toString(),
          name: (rawClient.name as string) || "Unknown Client",
          clientNumber: (rawClient.clientNumber as string) || "",
          organizationName: (rawClient.organizationName as string) || null,
          phone: (rawClient.phone as string) || null,
        }
      : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as Date).toISOString() : "",
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as Date).toISOString() : "",
  };
}

/**
 * PATCH /api/v1/tasks/[id]
 *
 * Update permitted task fields, manage completion dates, and enforce relationship integrity.
 */
export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    const parsedId = objectIdValidator.safeParse(id);
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid task ID format");
    }

    await ConnectDB();

    const existingTask = await Task.findOne({
      _id: parsedId.data,
      deletedAt: null,
    });

    if (!existingTask) {
      throw ApiError.notFound("Task not found or has already been deleted");
    }

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

    // Validate Case relationship if changing
    if (caseId !== undefined) {
      if (caseId) {
        const caseDoc = await Case.findOne({
          _id: caseId,
          deletedAt: null,
        }).select("_id clientId");

        if (!caseDoc) {
          throw ApiError.badRequest("Selected case does not exist or has been deleted");
        }
        existingTask.caseId = new mongoose.Types.ObjectId(caseId);

        // Auto-link client from case if clientId is not explicitly set in payload
        if (clientId === undefined && caseDoc.clientId && !existingTask.clientId) {
          existingTask.clientId = caseDoc.clientId as mongoose.Types.ObjectId;
        }
      } else {
        existingTask.caseId = null;
      }
    }

    // Validate Client relationship if changing
    if (clientId !== undefined) {
      if (clientId) {
        const clientDoc = await Client.findOne({
          _id: clientId,
          deletedAt: null,
        }).select("_id");

        if (!clientDoc) {
          throw ApiError.badRequest("Selected client does not exist or has been deleted");
        }
        existingTask.clientId = new mongoose.Types.ObjectId(clientId);
      } else {
        existingTask.clientId = null;
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

    // Re-populate updated document
    const updatedDoc = await Task.findById(existingTask._id)
      .populate("caseId", "title caseNumber internalReference caseStatus")
      .populate("clientId", "name clientNumber organizationName phone")
      .lean();

    if (!updatedDoc) {
      throw ApiError.internal("Failed to retrieve updated task");
    }

    const formattedDoc = {
      ...updatedDoc,
      caseDetails: updatedDoc.caseId,
      clientDetails: updatedDoc.clientId,
      caseId: updatedDoc.caseId
        ? ((updatedDoc.caseId as unknown as Record<string, unknown>)._id as mongoose.Types.ObjectId)
        : null,
      clientId: updatedDoc.clientId
        ? ((updatedDoc.clientId as unknown as Record<string, unknown>)._id as mongoose.Types.ObjectId)
        : null,
    };

    const response: TaskActionResponse = {
      success: true,
      message: "Task updated successfully",
      data: formatTaskItem(formattedDoc as unknown as Record<string, unknown>),
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
    const session = await getAuthSession();
    if (!session?.user?.id) {
      throw ApiError.unauthorized("Authentication required");
    }

    const { id } = await params;
    const parsedId = objectIdValidator.safeParse(id);
    if (!parsedId.success) {
      throw ApiError.badRequest("Invalid task ID format");
    }

    await ConnectDB();

    const task = await Task.findOne({
      _id: parsedId.data,
      deletedAt: null,
    });

    if (!task) {
      throw ApiError.notFound("Task not found or already deleted");
    }

    task.deletedAt = new Date();
    await task.save();

    const response: TaskDeleteResponse = {
      success: true,
      message: "Task moved to trash successfully",
      id: parsedId.data,
    };

    return NextResponse.json(response, { status: 200 });
  }
);
