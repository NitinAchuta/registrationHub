import type { UserRole } from "./data"

export type Workspace = 
  | "registrations" 
  | "analytics" 
  | "finance" 
  | "hospitality" 
  | "operations"

export type WorkspaceConfig = {
  id: Workspace
  label: string
  description: string
}

export const workspaces: WorkspaceConfig[] = [
  { 
    id: "registrations", 
    label: "Registrations", 
    description: "Manage company registrations and contacts" 
  },
  { 
    id: "analytics", 
    label: "Analytics", 
    description: "Major distribution and recruitment analytics" 
  },
  { 
    id: "finance", 
    label: "Finance & Debt", 
    description: "Balance tracking and payment management" 
  },
  { 
    id: "hospitality", 
    label: "Hospitality", 
    description: "Events, meals, and SEC member coordination" 
  },
  { 
    id: "operations", 
    label: "Operations", 
    description: "Cancellations, scoring, and internal chat" 
  },
]

// Define which workspaces each role can access
export const rolePermissions: Record<UserRole, Workspace[]> = {
  Admin: ["registrations", "analytics", "finance", "hospitality", "operations"],
  Registration: ["registrations", "analytics"],
  Finance: ["registrations", "finance"],
  Hospitality: ["hospitality", "registrations"],
}

// Define which data each role can modify (vs. read-only)
export const roleWritePermissions: Record<UserRole, Workspace[]> = {
  Admin: ["registrations", "analytics", "finance", "hospitality", "operations"],
  Registration: ["registrations"],
  Finance: ["finance"],
  Hospitality: ["hospitality"],
}

export function canViewWorkspace(role: UserRole, workspace: Workspace): boolean {
  return rolePermissions[role].includes(workspace)
}

export function canEditWorkspace(role: UserRole, workspace: Workspace): boolean {
  return roleWritePermissions[role].includes(workspace)
}

export function getAccessibleWorkspaces(role: UserRole): WorkspaceConfig[] {
  return workspaces.filter(w => canViewWorkspace(role, w.id))
}

export function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "Admin":
      return "Administrator"
    case "Registration":
      return "Registration Team"
    case "Finance":
      return "Finance Team"
    case "Hospitality":
      return "Hospitality Team"
  }
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "Admin":
      return "Full access to all workspaces and data"
    case "Registration":
      return "Access to Registrations and Analytics"
    case "Finance":
      return "Access to Finance & Debt and Registration data"
    case "Hospitality":
      return "Access to Hospitality and Registration data"
  }
}

export const allRoles: UserRole[] = ["Admin", "Registration", "Finance", "Hospitality"]
