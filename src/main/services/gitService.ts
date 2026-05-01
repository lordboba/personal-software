import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appsRoot, id, nowIso, parseGitHubUrl, sanitizeTitle } from "../utils.js";
import type { CreateAppInput, ManagedApp } from "../../shared/types.js";
import { commandsFromInspection, inspectRepo } from "./repoInspector.js";

const exec = promisify(execFile);

async function git(args: string[], cwd?: string) {
  const result = await exec("git", args, { cwd });
  return result.stdout.trim();
}

export async function cloneApp(input: CreateAppInput): Promise<ManagedApp> {
  const parsed = parseGitHubUrl(input.repoUrl);
  const title = sanitizeTitle(input.title || parsed.repo);
  const localPath = path.join(appsRoot(), title);
  await fs.mkdir(appsRoot(), { recursive: true });

  try {
    await fs.access(localPath);
    throw new Error(`App folder already exists: ${localPath}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("App folder")) throw error;
  }

  await git(["clone", parsed.cloneUrl, localPath]);
  const defaultBranch =
    (await git(["symbolic-ref", "refs/remotes/origin/HEAD"], localPath)).replace("refs/remotes/origin/", "") ||
    "main";
  const currentBranch = await git(["branch", "--show-current"], localPath);
  const inspection = await inspectRepo(localPath, defaultBranch);
  const timestamp = nowIso();

  return {
    id: id("app"),
    title,
    repoUrl: parsed.cloneUrl,
    owner: parsed.owner,
    repo: parsed.repo,
    defaultBranch,
    localPath,
    currentBranch: currentBranch || defaultBranch,
    setupStatus: "inspected",
    env: [],
    runCommands: commandsFromInspection(localPath, inspection),
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export async function createPersonalizationBranch(app: ManagedApp, branchName: string) {
  await git(["checkout", "-b", branchName], app.localPath);
  return branchName;
}

export async function commitChanges(app: ManagedApp, message: string) {
  await git(["add", "."], app.localPath);
  await git(["commit", "-m", message], app.localPath);
}

export async function addOrUpdateForkRemote(app: ManagedApp, forkUrl: string) {
  const remotes = await git(["remote"], app.localPath);
  if (remotes.split("\n").includes("fork")) {
    await git(["remote", "set-url", "fork", forkUrl], app.localPath);
  } else {
    await git(["remote", "add", "fork", forkUrl], app.localPath);
  }
}

export async function pushBranch(app: ManagedApp, branchName: string) {
  await git(["push", "-u", "fork", branchName], app.localPath);
}
