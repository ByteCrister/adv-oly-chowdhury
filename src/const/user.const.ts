/**
 * User & Authentication Domain Constants
 * 
 * Note: Single-user portfolio and dashboard architecture.
 * No user roles are used since the system is dedicated exclusively to the advocate.
 */

export const USER_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;

export const USER_STATUS_LIST = Object.values(USER_STATUSES);
export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];
