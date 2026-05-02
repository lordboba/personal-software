import type { AgentProposal, ManagedApp } from "../../shared/types.js";

export function proposePersonalization(app: ManagedApp, request: string): AgentProposal {
  return {
    title: `Personalize ${app.title}`,
    summary:
      "The agent will inspect the current repo state, create a copy-on-write branch, record the personalization contract in .personal-software/PATCH.md, apply scoped config/branding/feature edits, then ask before commit and push.",
    steps: [
      `Create a local branch from ${app.currentBranch || app.defaultBranch}.`,
      "Create .personal-software/PATCH.md to summarize how the personalized app differs from upstream.",
      "Apply only the files needed for the requested change.",
      "Keep PATCH.md updated with user-facing differences and implementation details.",
      "Run the relevant setup/build/test command after approval.",
      "Ask before committing, creating a fork, and pushing the branch."
    ],
    approvalsNeeded: ["edit", "command", "commit", "fork", "push"]
  };
}
