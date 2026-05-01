import { spawn } from "node:child_process";
import { id, nowIso } from "../utils.js";
export class CommandRunner {
    store;
    processes = new Map();
    constructor(store) {
        this.store = store;
    }
    async run(appId, command, cwd) {
        const log = {
            id: id("log"),
            appId,
            command,
            cwd,
            output: "",
            status: "running",
            startedAt: nowIso()
        };
        await this.store.addLog(log);
        const child = spawn(command, {
            cwd,
            shell: true,
            env: process.env
        });
        this.processes.set(log.id, child);
        const append = async (chunk) => {
            log.output += chunk.toString();
            await this.store.updateLog(log.id, { output: log.output });
        };
        child.stdout.on("data", append);
        child.stderr.on("data", append);
        child.on("close", async (code) => {
            this.processes.delete(log.id);
            await this.store.updateLog(log.id, {
                status: code === 0 ? "success" : "failed",
                finishedAt: nowIso()
            });
        });
        return log;
    }
    async cancel(logId) {
        const child = this.processes.get(logId);
        if (!child)
            return;
        child.kill();
        this.processes.delete(logId);
        await this.store.updateLog(logId, { status: "cancelled", finishedAt: nowIso() });
    }
}
