import fs from "node:fs/promises";
import path from "node:path";
import type { ManagedApp } from "../../shared/types.js";
import { nowIso } from "../utils.js";

const artifactDir = ".personal-software";
const patchFile = "PATCH.md";

function escapeMarkdown(input: string) {
  return input.trim().replace(/\r\n/g, "\n");
}

export function patchArtifactPath(app: ManagedApp) {
  return path.join(app.localPath, artifactDir, patchFile);
}

export async function writePatchArtifact(app: ManagedApp, request: string, branchName: string) {
  const dir = path.join(app.localPath, artifactDir);
  const target = path.join(dir, patchFile);
  const upstreamBranch = app.defaultBranch || "main";
  const upstreamRef = `origin/${upstreamBranch}`;
  const timestamp = nowIso();

  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(target);
    await fs.appendFile(
      target,
      `
## Additional Personalization - ${timestamp}

- Personal branch: ${branchName}
- Request: ${escapeMarkdown(request)}

### User-Facing Differences

- Pending implementation.

### Implementation Details

- Pending implementation.
`,
      "utf8"
    );
    return target;
  } catch {
    // Create the initial artifact below.
  }

  await fs.writeFile(
    target,
    `# Personal Software Patch

This file tracks how this app intentionally differs from the upstream repository. Keep it updated whenever the personalized software changes.

## Upstream Baseline

- Repository: ${app.repoUrl}
- Upstream branch: ${upstreamRef}
- Personal branch: ${branchName}
- Created: ${timestamp}

## Personalization Request

${escapeMarkdown(request)}

## User-Facing Differences

- Pending implementation. Replace this with the important product behavior, UI, workflow, and configuration differences from upstream.

## Implementation Details

- Pending implementation. Replace this with the files, architecture decisions, data flows, services, commands, and environment assumptions that make the personalized version different.

## Maintenance Notes

- Compare against \`${upstreamRef}\` when deciding whether a behavior belongs in this patch record.
- Update this file before committing or pushing personalized changes.
- Add new sections instead of deleting historical context when future personalization runs change the app.
`,
    "utf8"
  );

  return target;
}
