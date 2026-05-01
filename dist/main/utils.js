import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
export function nowIso() {
    return new Date().toISOString();
}
export function id(prefix) {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
}
export function appsRoot() {
    return path.join(os.homedir(), "Apps");
}
export function sanitizeTitle(input) {
    return input
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\.git$/, "")
        .split("/")
        .filter(Boolean)
        .slice(-1)[0]
        ?.replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || `app-${Date.now()}`;
}
export function parseGitHubUrl(repoUrl) {
    const https = repoUrl.match(/^https:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?(?:[/?#].*)?$/i);
    const ssh = repoUrl.match(/^git@github\.com:([^/\s]+)\/([^/\s#?]+?)(?:\.git)?$/i);
    const match = https ?? ssh;
    if (!match) {
        throw new Error("Only public GitHub repository URLs are supported in v1.");
    }
    return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
        cloneUrl: `https://github.com/${match[1]}/${match[2].replace(/\.git$/, "")}.git`
    };
}
