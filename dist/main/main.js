import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Store } from "./store.js";
import { cloneApp, createPersonalizationBranch } from "./services/gitService.js";
import { CommandRunner } from "./services/commandRunner.js";
import { GitHubService } from "./services/githubService.js";
import { LocalFileEnvProvider } from "./services/envService.js";
import { proposePersonalization } from "./services/agentService.js";
import { writePatchArtifact } from "./services/patchArtifactService.js";
import { getOnboardingStateForWorkspace, setGitIdentity } from "./services/onboardingService.js";
import { createSoftwareProject } from "./services/softwareBuilderService.js";
import { id, nowIso } from "./utils.js";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const devServerUrl = process.env.APP_DEV_SERVER_URL ?? "http://127.0.0.1:5174";
const store = new Store();
const github = new GitHubService();
const envProvider = new LocalFileEnvProvider();
const runner = new CommandRunner(store);
async function refreshOnboarding() {
    const snapshot = store.snapshot();
    const workspaceRoot = snapshot.onboarding?.workspaceRoot;
    await store.setOnboarding(await getOnboardingStateForWorkspace(snapshot.account, workspaceRoot ?? path.join(app.getPath("home"), "Apps")));
    return store.snapshot();
}
async function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 820,
        minWidth: 980,
        minHeight: 680,
        title: "OSS App Personalizer",
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    if (isDev) {
        await win.loadURL(devServerUrl);
    }
    else {
        await win.loadFile(path.join(__dirname, "../renderer/index.html"));
    }
}
async function createResearchWindow(target) {
    const win = new BrowserWindow({
        width: 1180,
        height: 820,
        minWidth: 860,
        minHeight: 620,
        title: "Personal Software Research",
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    await win.loadURL(target);
}
function approval(input) {
    return {
        ...input,
        id: id("approval"),
        createdAt: nowIso(),
        status: "pending"
    };
}
app.whenReady().then(async () => {
    await store.load();
    await refreshOnboarding();
    await createWindow();
});
app.on("window-all-closed", () => {
    if (process.platform !== "darwin")
        app.quit();
});
ipcMain.handle("state:get", () => store.snapshot());
ipcMain.handle("onboarding:refresh", async () => {
    return refreshOnboarding();
});
ipcMain.handle("onboarding:setGitIdentity", async (_event, input) => {
    await setGitIdentity(input);
    return refreshOnboarding();
});
ipcMain.handle("onboarding:selectWorkspace", async () => {
    const current = store.snapshot().onboarding?.workspaceRoot ?? path.join(app.getPath("home"), "Apps");
    const result = await dialog.showOpenDialog({
        title: "Choose Personal Software Workspace",
        defaultPath: current,
        properties: ["openDirectory", "createDirectory"]
    });
    if (result.canceled || !result.filePaths[0])
        return store.snapshot();
    await store.setOnboarding(await getOnboardingStateForWorkspace(store.snapshot().account, result.filePaths[0]));
    return store.snapshot();
});
ipcMain.handle("github:connect", async (_event, input) => {
    await store.setAccount(await github.connect(input.token, input.username));
    return refreshOnboarding();
});
ipcMain.handle("software:create", async (_event, input) => {
    const appRecord = await createSoftwareProject(input, store.snapshot().onboarding?.workspaceRoot);
    await store.upsertApp(appRecord);
    await store.addApproval(approval({
        appId: appRecord.id,
        kind: input.repoUrl ? "clone" : "edit",
        title: `Created ${appRecord.title}`,
        detail: input.repoUrl
            ? `Seeded from ${input.repoUrl}, created .personal-software/PATCH.md, and prepared local build commands.`
            : `Created a new local software project at ${appRecord.localPath} with .personal-software/PATCH.md.`
    }));
    return store.snapshot();
});
ipcMain.handle("app:clone", async (_event, input) => {
    const appRecord = await cloneApp(input, store.snapshot().onboarding?.workspaceRoot);
    await store.upsertApp(appRecord);
    await store.addApproval(approval({
        appId: appRecord.id,
        kind: "clone",
        title: `Cloned ${appRecord.title}`,
        detail: `Repository cloned to ${appRecord.localPath} and inspected. No edits, forks, commits, or pushes were performed.`
    }));
    return store.snapshot();
});
ipcMain.handle("approval:approve", async (_event, approvalId) => {
    await store.updateApproval(approvalId, "approved");
    return store.snapshot();
});
ipcMain.handle("approval:reject", async (_event, approvalId) => {
    await store.updateApproval(approvalId, "rejected");
    return store.snapshot();
});
ipcMain.handle("command:run", async (_event, input) => {
    const appRecord = store.getApp(input.appId);
    const command = appRecord.runCommands.find((item) => item.id === input.commandId);
    if (!command)
        throw new Error(`Unknown command: ${input.commandId}`);
    await store.addApproval(approval({
        appId: appRecord.id,
        kind: "command",
        title: command.label,
        detail: `Approved command execution in ${command.cwd}.`,
        command: command.command,
        cwd: command.cwd
    }));
    await runner.run(appRecord.id, command.command, command.cwd);
    return store.snapshot();
});
ipcMain.handle("env:update", async (_event, input) => {
    const appRecord = store.getApp(input.appId);
    await store.addApproval(approval({
        appId: appRecord.id,
        kind: "env-write",
        title: "Write environment file",
        detail: `Writing ${input.entries.length} environment variable(s) to the managed app folder.`
    }));
    await envProvider.write(appRecord, input.entries);
    appRecord.env = input.entries;
    appRecord.setupStatus = "configured";
    appRecord.updatedAt = nowIso();
    await store.upsertApp(appRecord);
    return store.snapshot();
});
ipcMain.handle("agent:proposal", async (_event, input) => {
    return proposePersonalization(store.getApp(input.appId), input.request);
});
ipcMain.handle("agent:personalize", async (_event, input) => {
    const appRecord = store.getApp(input.appId);
    const branch = `personalize/${Date.now()}`;
    await store.addApproval(approval({
        appId: appRecord.id,
        kind: "edit",
        title: "Create personalization branch",
        detail: `Creating copy-on-write branch ${branch} for request: ${input.request}`
    }));
    await createPersonalizationBranch(appRecord, branch);
    const patchPath = await writePatchArtifact(appRecord, input.request, branch);
    appRecord.currentBranch = branch;
    appRecord.patchArtifactPath = patchPath;
    appRecord.updatedAt = nowIso();
    await store.upsertApp(appRecord);
    return store.snapshot();
});
ipcMain.handle("shell:openPath", (_event, target) => shell.openPath(target));
ipcMain.handle("browser:research", async (_event, input) => {
    const target = input.url ||
        `https://www.google.com/search?q=${encodeURIComponent(input.query || "software product research")}`;
    await createResearchWindow(target);
    return target;
});
