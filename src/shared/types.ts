export type ApprovalKind =
  | "clone"
  | "command"
  | "env-write"
  | "edit"
  | "commit"
  | "fork"
  | "push";

export type SetupStatus = "new" | "cloned" | "inspected" | "configured" | "running" | "error";

export interface GitHubAccount {
  username: string;
  tokenStored: boolean;
  connectedAt: string;
}

export interface EnvEntry {
  key: string;
  value: string;
  targetFile: ".env" | ".env.local";
  secret: boolean;
}

export interface RunCommand {
  id: string;
  label: string;
  command: string;
  cwd: string;
  risk: "low" | "medium" | "high";
  approved: boolean;
}

export interface ManagedApp {
  id: string;
  title: string;
  repoUrl: string;
  owner: string;
  repo: string;
  defaultBranch: string;
  localPath: string;
  currentBranch: string;
  forkUrl?: string;
  setupStatus: SetupStatus;
  env: EnvEntry[];
  runCommands: RunCommand[];
  createdAt: string;
  updatedAt: string;
  lastLocalUrl?: string;
}

export interface ApprovalRequest {
  id: string;
  appId?: string;
  kind: ApprovalKind;
  title: string;
  detail: string;
  command?: string;
  cwd?: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

export interface CommandLog {
  id: string;
  appId?: string;
  command: string;
  cwd: string;
  output: string;
  status: "running" | "success" | "failed" | "cancelled";
  startedAt: string;
  finishedAt?: string;
}

export interface RepoInspection {
  defaultBranch: string;
  packageManager?: "npm" | "pnpm" | "yarn";
  installCommand?: string;
  devCommand?: string;
  buildCommand?: string;
  envTargets: Array<".env" | ".env.local">;
  detectedStack: string[];
}

export interface AgentProposal {
  title: string;
  summary: string;
  steps: string[];
  approvalsNeeded: ApprovalKind[];
}

export interface AppState {
  account?: GitHubAccount;
  apps: ManagedApp[];
  approvals: ApprovalRequest[];
  logs: CommandLog[];
}

export interface CreateAppInput {
  repoUrl: string;
  title?: string;
}

export interface EnvUpdateInput {
  appId: string;
  entries: EnvEntry[];
}
