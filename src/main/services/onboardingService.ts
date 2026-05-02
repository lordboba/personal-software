import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitHubAccount, OnboardingState, ReadinessItem } from "../../shared/types.js";
import { appsRoot, nowIso } from "../utils.js";

const exec = promisify(execFile);

async function readCommand(command: string, args: string[]) {
  try {
    const result = await exec(command, args);
    const output = result.stdout.trim() || result.stderr.trim();
    return output
      .split("\n")
      .filter((line) => !line.startsWith("WARNING: proceeding"))
      .join("\n")
      .trim();
  } catch {
    return undefined;
  }
}

export async function getOnboardingState(account?: GitHubAccount): Promise<OnboardingState> {
  return getOnboardingStateForWorkspace(account, appsRoot());
}

export async function getOnboardingStateForWorkspace(
  account: GitHubAccount | undefined,
  workspaceRoot: string
): Promise<OnboardingState> {
  const gitName = await readCommand("git", ["config", "--global", "user.name"]);
  const gitEmail = await readCommand("git", ["config", "--global", "user.email"]);
  const codexVersion = await readCommand("codex", ["--version"]);
  const codexLogin = codexVersion ? await readCommand("codex", ["login", "status"]) : undefined;
  let workspaceStatus: ReadinessItem["status"] = "ready";
  let workspaceDetail = workspaceRoot;
  let freeGb = Math.max(0, Math.round(os.freemem() / 1024 / 1024 / 1024));

  try {
    await fs.mkdir(workspaceRoot, { recursive: true });
    await fs.access(workspaceRoot);
    const stat = await fs.statfs(workspaceRoot);
    freeGb = Math.max(0, Math.round((stat.bavail * stat.bsize) / 1024 / 1024 / 1024));
  } catch (error) {
    workspaceStatus = "missing";
    workspaceDetail = error instanceof Error ? error.message : "Workspace is not writable.";
  }

  const items: ReadinessItem[] = [
    {
      id: "github",
      label: "GitHub Authentication",
      status: account?.tokenStored ? "ready" : "missing",
      detail: account?.tokenStored ? `Connected as @${account.username}` : "Connect a GitHub token to create repos, forks, and pushes."
    },
    {
      id: "git-identity",
      label: "Git Identity",
      status: gitName && gitEmail ? "ready" : "missing",
      detail: gitName && gitEmail ? `${gitName} <${gitEmail}>` : "Set git user.name and user.email before committing."
    },
    {
      id: "codex",
      label: "Codex Subscription",
      status: codexVersion && codexLogin ? "ready" : codexVersion ? "warning" : "missing",
      detail: codexLogin || codexVersion || "Codex CLI was not found on PATH."
    },
    {
      id: "workspace",
      label: "Workspace",
      status: workspaceStatus,
      detail: workspaceDetail
    },
    {
      id: "disk",
      label: "Disk Space",
      status: freeGb >= 2 ? "ready" : "warning",
      detail: `${freeGb} GB free`
    }
  ];

  return {
    items,
    workspaceRoot,
    ready: items.every((item) => item.status !== "missing"),
    lastCheckedAt: nowIso()
  };
}

export async function setGitIdentity(input: { name: string; email: string }) {
  await exec("git", ["config", "--global", "user.name", input.name]);
  await exec("git", ["config", "--global", "user.email", input.email]);
}
