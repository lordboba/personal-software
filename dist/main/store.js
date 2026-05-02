import fs from "node:fs/promises";
import path from "node:path";
import { app } from "electron";
const initialState = {
    apps: [],
    approvals: [],
    logs: []
};
export class Store {
    filePath;
    state = initialState;
    constructor() {
        this.filePath = path.join(app.getPath("userData"), "state.json");
    }
    async load() {
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        try {
            const raw = await fs.readFile(this.filePath, "utf8");
            this.state = { ...initialState, ...JSON.parse(raw) };
        }
        catch {
            this.state = initialState;
            await this.save();
        }
        return this.snapshot();
    }
    snapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
    async save() {
        await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2));
    }
    async setAccount(account) {
        this.state.account = account;
        await this.save();
        return this.snapshot();
    }
    async setOnboarding(onboarding) {
        this.state.onboarding = onboarding;
        await this.save();
        return this.snapshot();
    }
    async upsertApp(appRecord) {
        const index = this.state.apps.findIndex((item) => item.id === appRecord.id);
        if (index >= 0)
            this.state.apps[index] = appRecord;
        else
            this.state.apps.unshift(appRecord);
        await this.save();
        return appRecord;
    }
    getApp(appId) {
        const appRecord = this.state.apps.find((item) => item.id === appId);
        if (!appRecord)
            throw new Error(`Unknown app: ${appId}`);
        return appRecord;
    }
    async addApproval(approval) {
        this.state.approvals.unshift(approval);
        await this.save();
        return approval;
    }
    async updateApproval(id, status) {
        const approval = this.state.approvals.find((item) => item.id === id);
        if (!approval)
            throw new Error(`Unknown approval: ${id}`);
        approval.status = status;
        await this.save();
        return approval;
    }
    async addLog(log) {
        this.state.logs.unshift(log);
        await this.save();
        return log;
    }
    async updateLog(id, patch) {
        const log = this.state.logs.find((item) => item.id === id);
        if (!log)
            throw new Error(`Unknown log: ${id}`);
        Object.assign(log, patch);
        await this.save();
        return log;
    }
}
