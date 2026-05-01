import { contextBridge, ipcRenderer } from "electron";
import type { CreateAppInput, EnvEntry } from "../shared/types.js";

contextBridge.exposeInMainWorld("oss", {
  state: () => ipcRenderer.invoke("state:get"),
  connectGitHub: (token: string, username: string) => ipcRenderer.invoke("github:connect", { token, username }),
  cloneApp: (input: CreateAppInput) => ipcRenderer.invoke("app:clone", input),
  approve: (approvalId: string) => ipcRenderer.invoke("approval:approve", approvalId),
  reject: (approvalId: string) => ipcRenderer.invoke("approval:reject", approvalId),
  runCommand: (appId: string, commandId: string) => ipcRenderer.invoke("command:run", { appId, commandId }),
  updateEnv: (appId: string, entries: EnvEntry[]) => ipcRenderer.invoke("env:update", { appId, entries }),
  proposePersonalization: (appId: string, request: string) =>
    ipcRenderer.invoke("agent:proposal", { appId, request }),
  personalize: (appId: string, request: string) => ipcRenderer.invoke("agent:personalize", { appId, request })
});
