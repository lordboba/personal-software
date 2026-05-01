import type { AgentProposal, AppState, CreateAppInput, EnvEntry } from "../shared/types";

declare global {
  interface Window {
    oss?: {
      state(): Promise<AppState>;
      connectGitHub(token: string, username: string): Promise<AppState>;
      cloneApp(input: CreateAppInput): Promise<AppState>;
      approve(approvalId: string): Promise<AppState>;
      reject(approvalId: string): Promise<AppState>;
      runCommand(appId: string, commandId: string): Promise<AppState>;
      updateEnv(appId: string, entries: EnvEntry[]): Promise<AppState>;
      proposePersonalization(appId: string, request: string): Promise<AgentProposal>;
      personalize(appId: string, request: string): Promise<AppState>;
    };
  }
}
