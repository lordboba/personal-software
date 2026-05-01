import type { AgentProposal, ManagedApp } from "../../shared/types.js";

export function proposePersonalization(app: ManagedApp, request: string): AgentProposal {
  return {
    title: `Personalize ${app.title}`,
    summary:
      "The agent will inspect the current repo state, create a copy-on-write branch, apply scoped config/branding/feature edits, then ask before commit and push.",
    steps: [
      `Create a local branch from ${app.currentBranch || app.defaultBranch}.`,
      "Apply only the files needed for the requested change.",
      "Run the relevant setup/build/test command after approval.",
      "Ask before committing, creating a fork, and pushing the branch."
    ],
    approvalsNeeded: ["edit", "command", "commit", "fork", "push"]
  };
}
