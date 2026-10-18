import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth/auth.helper";
import { withErrorHandler, ApiError } from "@/lib/helpers/withErrorHandler";
import Task from "@/db/models/Task.model";
import { TASK_STATUSES, TASK_STATUS_LIST } from "@/const/task.const";
import ConnectDB from "@/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const PATCH = withErrorHandler(
  async (req: NextRequest, { params }: RouteParams) => {
    await getUserId();

    const { id: taskId } = await params;
    if (!taskId) {
      throw ApiError.badRequest("Task ID is required");
    }

    const body = await req.json().catch(() => ({}));
    const rawStatus = String(body?.status || "").toUpperCase();

    if (!TASK_STATUS_LIST.includes(rawStatus as (typeof TASK_STATUS_LIST)[number])) {
      throw ApiError.badRequest(
        `Invalid task status. Allowed values: ${TASK_STATUS_LIST.join(", ")}`
      );
    }

    const targetStatus = rawStatus as (typeof TASK_STATUS_LIST)[number];

    const updateSet: Record<string, unknown> = { status: targetStatus };
    if (targetStatus === TASK_STATUSES.COMPLETED) {
      updateSet.completedAt = new Date();
    } else {
      updateSet.completedAt = null;
    }

    await ConnectDB();

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { $set: updateSet },
      { new: true }
    ).populate("caseId", "internalReference caseNumber title");

    if (!updatedTask) {
      throw ApiError.notFound("Task not found");
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedTask,
        message: "Task status updated successfully",
      },
      { status: 200 }
    );
  }
);
