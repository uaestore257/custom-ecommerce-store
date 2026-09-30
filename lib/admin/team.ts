export type StoreTeamRole = "OWNER" | "MANAGER" | "STAFF";
export type ManagedStoreTeamRole = Exclude<StoreTeamRole, "OWNER">;

export interface StoreTeamMember {
  id: string;
  name: string;
  email: string;
  role: StoreTeamRole;
  disabled: boolean;
  isPlatformOwner: boolean;
  createdAt: string;
}

export function isManagedStoreTeamRole(value: unknown): value is ManagedStoreTeamRole {
  return value === "MANAGER" || value === "STAFF";
}
