import electron from "electron";
const { contextBridge, ipcRenderer } = electron;
contextBridge.exposeInMainWorld("oss", {
    state: () => ipcRenderer.invoke("state:get"),
    refreshOnboarding: () => ipcRenderer.invoke("onboarding:refresh"),
    setGitIdentity: (name, email) => ipcRenderer.invoke("onboarding:setGitIdentity", { name, email }),
    selectWorkspace: () => ipcRenderer.invoke("onboarding:selectWorkspace"),
    connectGitHub: (token, username) => ipcRenderer.invoke("github:connect", { token, username }),
    createSoftware: (input) => ipcRenderer.invoke("software:create", input),
    cloneApp: (input) => ipcRenderer.invoke("app:clone", input),
    approve: (approvalId) => ipcRenderer.invoke("approval:approve", approvalId),
    reject: (approvalId) => ipcRenderer.invoke("approval:reject", approvalId),
    runCommand: (appId, commandId) => ipcRenderer.invoke("command:run", { appId, commandId }),
    updateEnv: (appId, entries) => ipcRenderer.invoke("env:update", { appId, entries }),
    proposePersonalization: (appId, request) => ipcRenderer.invoke("agent:proposal", { appId, request }),
    personalize: (appId, request) => ipcRenderer.invoke("agent:personalize", { appId, request }),
    openResearchBrowser: (input) => ipcRenderer.invoke("browser:research", input)
});
