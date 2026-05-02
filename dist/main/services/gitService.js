import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appsRoot, id, nowIso, parseGitHubUrl, sanitizeTitle } from "../utils.js";
import { commandsFromInspection, inspectRepo } from "./repoInspector.js";
const exec = promisify(execFile);
async function git(args, cwd) {
    const result = await exec("git", args, { cwd });
    return result.stdout.trim();
}
export async function cloneApp(input, workspaceRoot = appsRoot()) {
    const parsed = parseGitHubUrl(input.repoUrl);
    const title = sanitizeTitle(input.title || parsed.repo);
    const localPath = path.join(workspaceRoot, title);
    await fs.mkdir(workspaceRoot, { recursive: true });
    try {
        await fs.access(localPath);
        throw new Error(`App folder already exists: ${localPath}`);
    }
    catch (error) {
        if (error instanceof Error && error.message.startsWith("App folder"))
            throw error;
    }
    await git(["clone", parsed.cloneUrl, localPath]);
    const defaultBranch = (await git(["symbolic-ref", "refs/remotes/origin/HEAD"], localPath)).replace("refs/remotes/origin/", "") ||
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
export async function createPersonalizationBranch(app, branchName) {
    await git(["checkout", "-b", branchName], app.localPath);
    return branchName;
}
export async function commitChanges(app, message) {
    await git(["add", "."], app.localPath);
    await git(["commit", "-m", message], app.localPath);
}
export async function addOrUpdateForkRemote(app, forkUrl) {
    const remotes = await git(["remote"], app.localPath);
    if (remotes.split("\n").includes("fork")) {
        await git(["remote", "set-url", "fork", forkUrl], app.localPath);
    }
    else {
        await git(["remote", "add", "fork", forkUrl], app.localPath);
    }
}
export async function pushBranch(app, branchName) {
    await git(["push", "-u", "fork", branchName], app.localPath);
}
