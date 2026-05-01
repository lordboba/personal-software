import { spawn } from "node:child_process";
import type { CommandLog } from "../../shared/types.js";
import { id, nowIso } from "../utils.js";
import type { Store } from "../store.js";

export class CommandRunner {
  private processes = new Map<string, ReturnType<typeof spawn>>();

  constructor(private store: Store) {}

  async run(appId: string | undefined, command: string, cwd: string) {
    const log: CommandLog = {
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

    const append = async (chunk: Buffer) => {
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

  async cancel(logId: string) {
    const child = this.processes.get(logId);
    if (!child) return;
    child.kill();
    this.processes.delete(logId);
    await this.store.updateLog(logId, { status: "cancelled", finishedAt: nowIso() });
  }
}
