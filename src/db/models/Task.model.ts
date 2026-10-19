import mongoose, { Schema, Model } from "mongoose";
import { COLLECTIONS, MODELS } from "@/const/collection.const";
import {
  TASK_PRIORITY_LIST,
  TASK_PRIORITIES,
  TASK_STATUS_LIST,
  TASK_STATUSES,
} from "@/const/task.const";
import { ITaskDocument } from "@/types/db/task.type";

const taskSchema = new Schema<ITaskDocument>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Task title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CASE,
      default: null,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: MODELS.CLIENT,
      default: null,
    },
    dueAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: {
        values: TASK_PRIORITY_LIST,
        message: "{VALUE} is not a valid task priority",
      },
      default: TASK_PRIORITIES.NORMAL,
    },
    status: {
      type: String,
      enum: {
        values: TASK_STATUS_LIST,
        message: "{VALUE} is not a valid task status",
      },
      default: TASK_STATUSES.TODO,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: COLLECTIONS.TASKS,
  }
);

// High-frequency query & soft-delete compound indexes
taskSchema.index({ deletedAt: 1, createdAt: -1 });
taskSchema.index({ deletedAt: 1, dueAt: 1, createdAt: -1 });
taskSchema.index({ deletedAt: 1, status: 1, dueAt: 1 });
taskSchema.index({ deletedAt: 1, caseId: 1, status: 1 });
taskSchema.index({ deletedAt: 1, clientId: 1, status: 1 });
taskSchema.index({ deletedAt: 1, priority: 1, createdAt: -1 });
taskSchema.index({ title: "text", description: "text" });

export const Task: Model<ITaskDocument> =
  (mongoose.models[MODELS.TASK] as Model<ITaskDocument>) ||
  mongoose.model<ITaskDocument>(MODELS.TASK, taskSchema, COLLECTIONS.TASKS);

export default Task;
