import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("oss", {
    state: () => ipcRenderer.invoke("state:get"),
    connectGitHub: (token, username) => ipcRenderer.invoke("github:connect", { token, username }),
    cloneApp: (input) => ipcRenderer.invoke("app:clone", input),
    approve: (approvalId) => ipcRenderer.invoke("approval:approve", approvalId),
    reject: (approvalId) => ipcRenderer.invoke("approval:reject", approvalId),
    runCommand: (appId, commandId) => ipcRenderer.invoke("command:run", { appId, commandId }),
    updateEnv: (appId, entries) => ipcRenderer.invoke("env:update", { appId, entries }),
    proposePersonalization: (appId, request) => ipcRenderer.invoke("agent:proposal", { appId, request }),
    personalize: (appId, request) => ipcRenderer.invoke("agent:personalize", { appId, request })
});
