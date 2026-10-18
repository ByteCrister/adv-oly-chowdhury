import { Document, Types } from "mongoose";
import { TaskPriority, TaskStatus } from "@/const/task.const";

export interface ITask {
  title: string;
  description?: string | null;
  caseId?: Types.ObjectId | null;
  clientId?: Types.ObjectId | null;
  dueAt?: Date | null;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITaskDocument extends ITask, Document<Types.ObjectId> {}
