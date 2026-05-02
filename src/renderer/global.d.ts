import type { AgentProposal, AppState, CreateAppInput, CreateSoftwareInput, EnvEntry } from "../shared/types";

declare global {
  interface Window {
    oss?: {
      state(): Promise<AppState>;
      refreshOnboarding(): Promise<AppState>;
      setGitIdentity(name: string, email: string): Promise<AppState>;
      selectWorkspace(): Promise<AppState>;
      connectGitHub(token: string, username: string): Promise<AppState>;
      createSoftware(input: CreateSoftwareInput): Promise<AppState>;
      cloneApp(input: CreateAppInput): Promise<AppState>;
      approve(approvalId: string): Promise<AppState>;
      reject(approvalId: string): Promise<AppState>;
      runCommand(appId: string, commandId: string): Promise<AppState>;
      updateEnv(appId: string, entries: EnvEntry[]): Promise<AppState>;
      proposePersonalization(appId: string, request: string): Promise<AgentProposal>;
      personalize(appId: string, request: string): Promise<AppState>;
      openResearchBrowser(input: { query?: string; url?: string }): Promise<string>;
    };
  }
}
