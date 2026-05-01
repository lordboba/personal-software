import fs from "node:fs/promises";
import path from "node:path";
import type { RepoInspection, RunCommand } from "../../shared/types.js";
import { id } from "../utils.js";

async function exists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function inspectRepo(localPath: string, defaultBranch: string): Promise<RepoInspection> {
  const packageJsonPath = path.join(localPath, "package.json");
  const hasPackage = await exists(packageJsonPath);
  const hasPnpm = await exists(path.join(localPath, "pnpm-lock.yaml"));
  const hasYarn = await exists(path.join(localPath, "yarn.lock"));
  const hasNpm = await exists(path.join(localPath, "package-lock.json"));
  const packageManager = hasPnpm ? "pnpm" : hasYarn ? "yarn" : hasPackage || hasNpm ? "npm" : undefined;
  const detectedStack: string[] = [];
  let devCommand: string | undefined;
  let buildCommand: string | undefined;

  if (hasPackage) {
    const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.next) detectedStack.push("Next.js");
    if (deps.vite || pkg.scripts?.dev?.includes("vite")) detectedStack.push("Vite");
    if (deps.electron) detectedStack.push("Electron");
    if (deps.react) detectedStack.push("React");
    if (pkg.scripts?.dev) devCommand = `${packageManager ?? "npm"} run dev`;
    if (pkg.scripts?.build) buildCommand = `${packageManager ?? "npm"} run build`;
  }

  const envTargets: Array<".env" | ".env.local"> = [];
  if (await exists(path.join(localPath, ".env.example"))) envTargets.push(".env");
  if (hasPackage) envTargets.push(".env.local");

  return {
    defaultBranch,
    packageManager,
    installCommand: packageManager ? `${packageManager} install` : undefined,
    devCommand,
    buildCommand,
    envTargets: envTargets.length ? [...new Set(envTargets)] : [".env.local"],
    detectedStack
  };
}

export function commandsFromInspection(localPath: string, inspection: RepoInspection): RunCommand[] {
  return [
    inspection.installCommand && {
      id: id("cmd"),
      label: "Install dependencies",
      command: inspection.installCommand,
      cwd: localPath,
      risk: "medium" as const,
      approved: false
    },
    inspection.buildCommand && {
      id: id("cmd"),
      label: "Build app",
      command: inspection.buildCommand,
      cwd: localPath,
      risk: "medium" as const,
      approved: false
    },
    inspection.devCommand && {
      id: id("cmd"),
      label: "Run dev server",
      command: inspection.devCommand,
      cwd: localPath,
      risk: "high" as const,
      approved: false
    }
  ].filter(Boolean) as RunCommand[];
}
