/**
 * Central Database Module for Advocate Case Management System
 * MongoDB + Mongoose Database Layer
 */

import ConnectDB from "@/config/db";

export { ConnectDB };
export default ConnectDB;

// Export all Models
export * from "./models";

// Export all TypeScript Types & Document Interfaces
export * from "../types/db";

// Re-export Collections and Models metadata
export { COLLECTIONS, MODELS } from "@/const/collection.const";
export type { CollectionName, ModelName } from "@/const/collection.const";
