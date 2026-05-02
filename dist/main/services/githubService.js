import { nowIso } from "../utils.js";
export class GitHubService {
    token;
    async connect(token, username) {
        this.token = token;
        const response = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        if (!response.ok) {
            this.token = undefined;
            throw new Error(`GitHub authentication failed: ${response.status} ${await response.text()}`);
        }
        const body = (await response.json());
        return {
            username: body.login || username,
            tokenStored: Boolean(token),
            connectedAt: nowIso()
        };
    }
    async createFork(app) {
        if (!this.token) {
            throw new Error("Connect GitHub before creating forks.");
        }
        const response = await fetch(`https://api.github.com/repos/${app.owner}/${app.repo}/forks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28"
            }
        });
        if (!response.ok) {
            throw new Error(`GitHub fork failed: ${response.status} ${await response.text()}`);
        }
        const body = (await response.json());
        return {
            cloneUrl: body.clone_url,
            htmlUrl: body.html_url
        };
    }
}
