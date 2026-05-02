import type { CreateAppInput, CreateSoftwareInput, EnvEntry } from "../shared/types.js";

const { contextBridge, ipcRenderer } = require("electron") as typeof import("electron");

contextBridge.exposeInMainWorld("oss", {
  state: () => ipcRenderer.invoke("state:get"),
  refreshOnboarding: () => ipcRenderer.invoke("onboarding:refresh"),
  setGitIdentity: (name: string, email: string) => ipcRenderer.invoke("onboarding:setGitIdentity", { name, email }),
  selectWorkspace: () => ipcRenderer.invoke("onboarding:selectWorkspace"),
  connectGitHub: (token: string, username: string) => ipcRenderer.invoke("github:connect", { token, username }),
  createSoftware: (input: CreateSoftwareInput) => ipcRenderer.invoke("software:create", input),
  cloneApp: (input: CreateAppInput) => ipcRenderer.invoke("app:clone", input),
  approve: (approvalId: string) => ipcRenderer.invoke("approval:approve", approvalId),
  reject: (approvalId: string) => ipcRenderer.invoke("approval:reject", approvalId),
  runCommand: (appId: string, commandId: string) => ipcRenderer.invoke("command:run", { appId, commandId }),
  updateEnv: (appId: string, entries: EnvEntry[]) => ipcRenderer.invoke("env:update", { appId, entries }),
  proposePersonalization: (appId: string, request: string) =>
    ipcRenderer.invoke("agent:proposal", { appId, request }),
  personalize: (appId: string, request: string) => ipcRenderer.invoke("agent:personalize", { appId, request }),
  openResearchBrowser: (input: { query?: string; url?: string }) => ipcRenderer.invoke("browser:research", input)
});
