import fs from "node:fs/promises";
import path from "node:path";
export class LocalFileEnvProvider {
    async write(app, entries) {
        const groups = new Map();
        for (const entry of entries) {
            const fileName = entry.targetFile || ".env.local";
            groups.set(fileName, [...(groups.get(fileName) ?? []), entry]);
        }
        for (const [fileName, fileEntries] of groups) {
            const filePath = path.join(app.localPath, fileName);
            const content = fileEntries.map((entry) => `${entry.key}=${JSON.stringify(entry.value)}`).join("\n");
            await fs.writeFile(filePath, `${content}\n`, { mode: 0o600 });
        }
    }
}
