import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CheckCircle2,
  GitBranch,
  Github,
  KeyRound,
  Play,
  Plus,
  Rocket,
  Settings2,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import type {
  AgentProposal,
  AppState,
  EnvEntry,
  ManagedApp,
} from "../shared/types";
import "./styles.css";

const emptyState: AppState = { apps: [], approvals: [], logs: [] };
type OssBridge = NonNullable<Window["oss"]>;

const browserPreviewBridge: OssBridge = {
  async state() {
    return emptyState;
  },
  async connectGitHub(_token, username) {
    return {
      ...emptyState,
      account: {
        username,
        tokenStored: true,
        connectedAt: new Date().toISOString(),
      },
    };
  },
  async cloneApp(input) {
    const now = new Date().toISOString();
    const repoName =
      input.title ||
      input.repoUrl
        .replace(/\/$/, "")
        .split("/")
        .pop()
        ?.replace(/\.git$/, "") ||
      "Preview App";

    return {
      ...emptyState,
      apps: [
        {
          id: "browser-preview",
          title: repoName,
          repoUrl: input.repoUrl,
          owner: "preview",
          repo: repoName,
          defaultBranch: "main",
          localPath: "Electron required for local clone",
          currentBranch: "main",
          setupStatus: "new",
          env: [],
          runCommands: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  },
  async approve() {
    return emptyState;
  },
  async reject() {
    return emptyState;
  },
  async runCommand() {
    return emptyState;
  },
  async updateEnv(appId, entries) {
    const now = new Date().toISOString();
    return {
      ...emptyState,
      apps: [
        {
          id: appId,
          title: "Preview App",
          repoUrl: "",
          owner: "preview",
          repo: "preview",
          defaultBranch: "main",
          localPath: "Electron required for local env writes",
          currentBranch: "main",
          setupStatus: "configured",
          env: entries,
          runCommands: [],
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  },
  async proposePersonalization(_appId, request) {
    return {
      title: "Preview proposal",
      summary: request,
      steps: ["Open with Electron to inspect files and create a real branch."],
      approvalsNeeded: ["edit"],
    };
  },
  async personalize() {
    return emptyState;
  },
};

function App() {
  const oss = window.oss ?? browserPreviewBridge;

  return <DesktopApp oss={oss} />;
}

function DesktopApp({ oss }: { oss: OssBridge }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [selectedId, setSelectedId] = useState<string>();
  const [githubUser, setGithubUser] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [request, setRequest] = useState("");
  const [proposal, setProposal] = useState<AgentProposal>();
  const [busy, setBusy] = useState(false);
  const selected = useMemo(
    () => state.apps.find((app) => app.id === selectedId) ?? state.apps[0],
    [state.apps, selectedId],
  );

  useEffect(() => {
    oss.state().then((next) => {
      setState(next);
      setSelectedId(next.apps[0]?.id);
    });
  }, [oss]);

  async function refresh(next: Promise<AppState>) {
    setBusy(true);
    try {
      const value = await next;
      setState(value);
      setSelectedId((current) => current ?? value.apps[0]?.id);
    } finally {
      setBusy(false);
    }
  }

  async function clone() {
    if (!repoUrl.trim()) return;
    await refresh(oss.cloneApp({ repoUrl, title: title || undefined }));
    setRepoUrl("");
    setTitle("");
  }

  async function connectGitHub() {
    if (!githubUser.trim() || !githubToken.trim()) return;
    await refresh(oss.connectGitHub(githubToken, githubUser));
    setGithubToken("");
  }

  async function writeEnv(app: ManagedApp) {
    if (!envKey.trim()) return;
    const next: EnvEntry[] = [
      ...app.env.filter((entry) => entry.key !== envKey),
      { key: envKey, value: envValue, targetFile: ".env.local", secret: true },
    ];
    await refresh(oss.updateEnv(app.id, next));
    setEnvKey("");
    setEnvValue("");
  }

  async function getProposal(app: ManagedApp) {
    if (!request.trim()) return;
    setProposal(await oss.proposePersonalization(app.id, request));
  }

  async function personalize(app: ManagedApp) {
    if (!request.trim()) return;
    await refresh(oss.personalize(app.id, request));
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Rocket size={22} />
          <div>
            <strong>OSS Personalizer</strong>
            <span>Local app ownership</span>
          </div>
        </div>

        <section className="panel compact">
          <div className="panel-title">
            <Github size={16} />
            GitHub
          </div>
          {state.account ? (
            <div className="account">
              <CheckCircle2 size={16} />@{state.account.username}
            </div>
          ) : (
            <div className="stack">
              <input
                placeholder="GitHub username"
                value={githubUser}
                onChange={(event) => setGithubUser(event.target.value)}
              />
              <input
                placeholder="Fine-grained token"
                type="password"
                value={githubToken}
                onChange={(event) => setGithubToken(event.target.value)}
              />
              <button onClick={connectGitHub} disabled={busy}>
                <ShieldCheck size={16} />
                Connect
              </button>
            </div>
          )}
        </section>

        <section className="panel compact">
          <div className="panel-title">
            <Plus size={16} />
            Add App
          </div>
          <div className="stack">
            <input
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
            />
            <input
              placeholder="Optional folder title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <button onClick={clone} disabled={busy || !repoUrl.trim()}>
              <GitBranch size={16} />
              Clone and inspect
            </button>
          </div>
        </section>

        <nav className="app-list">
          {state.apps.map((app) => (
            <button
              key={app.id}
              className={app.id === selected?.id ? "selected" : ""}
              onClick={() => setSelectedId(app.id)}
            >
              <span>{app.title}</span>
              <small>{app.setupStatus}</small>
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        {selected ? (
          <AppDetail
            app={selected}
            state={state}
            envKey={envKey}
            envValue={envValue}
            request={request}
            proposal={proposal}
            busy={busy}
            onEnvKey={setEnvKey}
            onEnvValue={setEnvValue}
            onRequest={setRequest}
            onWriteEnv={() => writeEnv(selected)}
            onRunCommand={(commandId) =>
              refresh(oss.runCommand(selected.id, commandId))
            }
            onProposal={() => getProposal(selected)}
            onPersonalize={() => personalize(selected)}
          />
        ) : (
          <div className="empty">
            <Github size={42} />
            <h1>Clone a public GitHub app to begin.</h1>
          </div>
        )}
      </main>
    </div>
  );
}

interface DetailProps {
  app: ManagedApp;
  state: AppState;
  envKey: string;
  envValue: string;
  request: string;
  proposal?: AgentProposal;
  busy: boolean;
  onEnvKey(value: string): void;
  onEnvValue(value: string): void;
  onRequest(value: string): void;
  onWriteEnv(): void;
  onRunCommand(commandId: string): void;
  onProposal(): void;
  onPersonalize(): void;
}

function AppDetail(props: DetailProps) {
  const logs = props.state.logs.filter((log) => log.appId === props.app.id);
  const approvals = props.state.approvals.filter(
    (approval) => approval.appId === props.app.id,
  );

  return (
    <div className="detail">
      <header className="hero">
        <div>
          <p>{props.app.repoUrl}</p>
          <h1>{props.app.title}</h1>
          <div className="meta">
            <span>{props.app.localPath}</span>
            <span>{props.app.currentBranch}</span>
            {props.app.forkUrl ? <span>{props.app.forkUrl}</span> : null}
          </div>
        </div>
        <div className="status">{props.app.setupStatus}</div>
      </header>

      <div className="grid">
        <section className="panel">
          <div className="panel-title">
            <TerminalSquare size={16} />
            Setup Commands
          </div>
          {props.app.runCommands.length ? (
            <div className="commands">
              {props.app.runCommands.map((command) => (
                <div className="row" key={command.id}>
                  <div>
                    <strong>{command.label}</strong>
                    <code>{command.command}</code>
                  </div>
                  <button
                    onClick={() => props.onRunCommand(command.id)}
                    disabled={props.busy}
                  >
                    <Play size={16} />
                    Run
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">
              No package-manager setup commands were detected yet.
            </p>
          )}
        </section>

        <section className="panel">
          <div className="panel-title">
            <KeyRound size={16} />
            Env Variables
          </div>
          <div className="env-form">
            <input
              placeholder="KEY"
              value={props.envKey}
              onChange={(event) => props.onEnvKey(event.target.value)}
            />
            <input
              placeholder="value"
              type="password"
              value={props.envValue}
              onChange={(event) => props.onEnvValue(event.target.value)}
            />
            <button
              onClick={props.onWriteEnv}
              disabled={props.busy || !props.envKey.trim()}
            >
              <Settings2 size={16} />
              Write
            </button>
          </div>
          <div className="chips">
            {props.app.env.map((entry) => (
              <span key={entry.key}>{entry.key}</span>
            ))}
          </div>
        </section>
      </div>

      <section className="panel agent">
        <div className="panel-title">
          <ShieldCheck size={16} />
          Approval-Gated Agent
        </div>
        <textarea
          placeholder="Describe the config, branding, env setup, or feature change you want."
          value={props.request}
          onChange={(event) => props.onRequest(event.target.value)}
        />
        <div className="actions">
          <button onClick={props.onProposal} disabled={!props.request.trim()}>
            Propose plan
          </button>
          <button
            onClick={props.onPersonalize}
            disabled={!props.request.trim()}
          >
            Create branch
          </button>
        </div>
        {props.proposal ? (
          <div className="proposal">
            <strong>{props.proposal.title}</strong>
            <p>{props.proposal.summary}</p>
            {props.proposal.steps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid bottom">
        <section className="panel">
          <div className="panel-title">Approvals</div>
          {approvals.map((approval) => (
            <div className="approval" key={approval.id}>
              <strong>{approval.title}</strong>
              <span>
                {approval.kind} · {approval.status}
              </span>
              <p>{approval.detail}</p>
            </div>
          ))}
        </section>
        <section className="panel">
          <div className="panel-title">Command Logs</div>
          {logs.map((log) => (
            <pre className="log" key={log.id}>
              {log.command}
              {log.output}
            </pre>
          ))}
        </section>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
