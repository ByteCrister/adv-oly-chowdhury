/**
 * User & Authentication Domain Constants
 */

export const USER_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADVOCATE: "ADVOCATE",
  ASSOCIATE: "ASSOCIATE",
  STAFF: "STAFF",
} as const;

export const USER_ROLE_LIST = Object.values(USER_ROLES);
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const USER_STATUS_LIST = Object.values(USER_STATUSES);
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];
