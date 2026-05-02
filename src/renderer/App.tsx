import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Circle,
  ExternalLink,
  FolderGit2,
  Github,
  Globe2,
  KeyRound,
  Play,
  Plus,
  RefreshCw,
  ShieldCheck,
  TerminalSquare,
  Trash2,
} from "lucide-react";
import type {
  AgentProposal,
  AppState,
  CreateSoftwareInput,
  EnvEntry,
  ManagedApp,
  OnboardingState,
  ReadinessItem,
} from "../shared/types";
import "./styles.css";

const emptyOnboarding: OnboardingState = {
  items: [
    {
      id: "github",
      label: "GitHub",
      status: "missing",
      detail: "Connect GitHub",
    },
    {
      id: "git-identity",
      label: "Git Identity",
      status: "missing",
      detail: "Set git identity",
    },
    {
      id: "codex",
      label: "Codex Subscription",
      status: "warning",
      detail: "Check Codex login",
    },
    {
      id: "workspace",
      label: "Workspace",
      status: "ready",
      detail: "~/Apps",
    },
    {
      id: "disk",
      label: "Disk Space",
      status: "warning",
      detail: "Checking disk",
    },
  ],
  workspaceRoot: "~/Documents/psb-workspace",
  ready: true,
  lastCheckedAt: new Date().toISOString(),
};
const emptyState: AppState = {
  apps: [],
  approvals: [],
  logs: [],
  onboarding: emptyOnboarding,
};
type OssBridge = NonNullable<Window["oss"]>;

const browserPreviewBridge: OssBridge = {
  async state() {
    return emptyState;
  },
  async refreshOnboarding() {
    return emptyState;
  },
  async setGitIdentity() {
    return emptyState;
  },
  async selectWorkspace() {
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
  async createSoftware(input) {
    const now = new Date().toISOString();
    const title = input.title || "personal-software-preview";
    return {
      ...emptyState,
      apps: [
        {
          id: "browser-preview",
          title,
          repoUrl: input.repoUrl || "local://blank-project",
          owner: "preview",
          repo: title,
          defaultBranch: "main",
          localPath: "Electron required for local project creation",
          currentBranch: "main",
          setupStatus: "inspected",
          env: [],
          runCommands: [],
          createdAt: now,
          updatedAt: now,
          softwareRequest: input.request,
          researchUrls: input.researchUrls,
          buildStatus: "ready",
          patchArtifactPath: "Electron required for local patch artifacts",
        },
      ],
    };
  },
  async cloneApp(input) {
    return this.createSoftware({ request: "Clone and inspect existing app.", repoUrl: input.repoUrl, title: input.title });
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
      steps: ["Open with Electron to create a real branch and PATCH.md artifact."],
      approvalsNeeded: ["edit"],
    };
  },
  async personalize() {
    return emptyState;
  },
  async openResearchBrowser(input) {
    return input.url || `https://www.google.com/search?q=${encodeURIComponent(input.query || "")}`;
  },
};

function App() {
  return <DesktopApp oss={window.oss ?? browserPreviewBridge} />;
}

function DesktopApp({ oss }: { oss: OssBridge }) {
  const [state, setState] = useState<AppState>(emptyState);
  const [selectedId, setSelectedId] = useState<string>();
  const [request, setRequest] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [researchUrl, setResearchUrl] = useState("");
  const [researchUrls, setResearchUrls] = useState<string[]>([]);
  const [githubUser, setGithubUser] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [gitName, setGitName] = useState("");
  const [gitEmail, setGitEmail] = useState("");
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [proposal, setProposal] = useState<AgentProposal>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

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
    setError(undefined);
    try {
      const value = await next;
      setState(value);
      setSelectedId((current) => current ?? value.apps[0]?.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createSoftware() {
    if (!request.trim()) return;
    const input: CreateSoftwareInput = {
      request,
      repoUrl: repoUrl.trim() || undefined,
      title: title.trim() || undefined,
      researchUrls,
    };
    await refresh(oss.createSoftware(input));
  }

  async function connectGitHub() {
    if (!githubUser.trim() || !githubToken.trim()) return;
    await refresh(oss.connectGitHub(githubToken, githubUser));
    setGithubToken("");
  }

  async function saveGitIdentity() {
    if (!gitName.trim() || !gitEmail.trim()) return;
    await refresh(oss.setGitIdentity(gitName, gitEmail));
  }

  async function addResearchUrl() {
    const nextUrl = researchUrl.trim();
    if (!nextUrl) {
      await oss.openResearchBrowser({ query: request || "personal software examples" });
      return;
    }
    setResearchUrls((current) => [...new Set([...current, nextUrl])]);
    await oss.openResearchBrowser({ url: nextUrl });
    setResearchUrl("");
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
    const prompt = request.trim() || app.softwareRequest || "";
    if (!prompt) return;
    setProposal(await oss.proposePersonalization(app.id, prompt));
  }

  async function personalize(app: ManagedApp) {
    const prompt = request.trim() || app.softwareRequest || "";
    if (!prompt) return;
    await refresh(oss.personalize(app.id, prompt));
  }

  return (
    <div className="app-frame">
      <header className="titlebar">
        <nav>
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
          <span>Help</span>
        </nav>
        <strong>Personal Software Builder</strong>
        <div className="window-controls">
          <span />
          <span />
          <span />
        </div>
      </header>

      <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Bot size={22} />
          <div>
            <strong>Personal<br />Software Builder</strong>
          </div>
        </div>

        <OnboardingPanel
          state={state}
          githubUser={githubUser}
          githubToken={githubToken}
          gitName={gitName}
          gitEmail={gitEmail}
          busy={busy}
          onGithubUser={setGithubUser}
          onGithubToken={setGithubToken}
          onGitName={setGitName}
          onGitEmail={setGitEmail}
          onConnectGitHub={connectGitHub}
          onSaveGitIdentity={saveGitIdentity}
          onSelectWorkspace={() => refresh(oss.selectWorkspace())}
          onRefresh={() => refresh(oss.refreshOnboarding())}
        />

        <nav className="app-list">
          <p className="sidebar-kicker">Workspace</p>
          {state.apps.map((app) => (
            <button
              key={app.id}
              className={app.id === selected?.id ? "selected" : ""}
              onClick={() => setSelectedId(app.id)}
            >
              <span>
                <FolderGit2 size={15} />
                {app.title}
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </nav>

        <footer className="sidebar-footer">
          <span className="avatar">JD</span>
          <div>
            <strong>Jane Developer</strong>
            <small>{state.account?.username ? `@${state.account.username}` : "Local builder"}</small>
          </div>
        </footer>
      </aside>

      <main className="main">
        <div className="build-layout">
          <section className="build-pane">
            <div className="composer">
              <div className="composer-head">
                <div className="composer-copy">
                  <h1>Build New Software</h1>
                  <p>Describe the software you want to build. PSB will plan, build, and deliver.</p>
                </div>
                <div className="project-actions">
                  <button type="button" className="secondary">
                    New Project
                  </button>
                  <button type="button" className="icon-button secondary">
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
              <label className="prompt-field">
                <span>Describe your software</span>
                <textarea
                  placeholder="Build a task management web app with projects, tasks, due dates, and user accounts. Use React, TypeScript, Tailwind CSS, and a Node.js/Express API with PostgreSQL. Include dark mode and responsive design."
                  value={request}
                  onChange={(event) => setRequest(event.target.value)}
                />
                <div className="prompt-footer">
                  <span>{request.length}/4000</span>
                  <button type="button" className="secondary">
                    <Bot size={15} />
                    Enhance Prompt
                  </button>
                </div>
              </label>
              <div className="source-title">Source inputs <span>(optional)</span></div>
              <div className="source-grid">
                <label>
                  <span>GitHub repository URL</span>
                  <div className="input-with-icon">
                    <Github size={16} />
                    <input
                      placeholder="https://github.com/username/existing-repo"
                      value={repoUrl}
                      onChange={(event) => setRepoUrl(event.target.value)}
                    />
                  </div>
                </label>
                <label>
                  <span>Research the web</span>
                  <button type="button" className="research-button secondary" onClick={addResearchUrl}>
                    <Globe2 size={16} />
                    Open Browser Research
                  </button>
                </label>
              </div>
              <div className="advanced-row">
                <button type="button" className="text-button">
                  <ChevronRight size={15} />
                  Advanced options
                </button>
                <label className="project-name-inline">
                  <span>Project name</span>
                  <input
                    placeholder="auto-generated if blank"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <div className="research-url-inline">
                  <input
                    placeholder="Paste reference URL"
                    value={researchUrl}
                    onChange={(event) => setResearchUrl(event.target.value)}
                  />
                  <button type="button" className="secondary" onClick={addResearchUrl}>
                    <ExternalLink size={15} />
                  </button>
                </div>
                <button type="button" className="plan-button" onClick={createSoftware} disabled={busy || !request.trim()}>
                  Plan & Build
                  <ChevronRight size={16} />
                </button>
              </div>
              {researchUrls.length ? (
                <div className="chips">
                  {researchUrls.map((url) => (
                    <span key={url}>{url}</span>
                  ))}
                </div>
              ) : null}
              {error ? <div className="error-banner">{error}</div> : null}
            </div>

            {selected ? (
              <AppDetail
                app={selected}
                state={state}
                envKey={envKey}
                envValue={envValue}
                proposal={proposal}
                busy={busy}
                onEnvKey={setEnvKey}
                onEnvValue={setEnvValue}
                onWriteEnv={() => writeEnv(selected)}
                onRunCommand={(commandId) => refresh(oss.runCommand(selected.id, commandId))}
                onProposal={() => getProposal(selected)}
                onPersonalize={() => personalize(selected)}
              />
            ) : (
              <EmptyActivity />
            )}
          </section>

          <RightRail state={state} selected={selected} />
        </div>
      </main>
      </div>
    </div>
  );
}

function OnboardingPanel(props: {
  state: AppState;
  githubUser: string;
  githubToken: string;
  gitName: string;
  gitEmail: string;
  busy: boolean;
  onGithubUser(value: string): void;
  onGithubToken(value: string): void;
  onGitName(value: string): void;
  onGitEmail(value: string): void;
  onConnectGitHub(): void;
  onSaveGitIdentity(): void;
  onSelectWorkspace(): void;
  onRefresh(): void;
}) {
  const onboarding = props.state.onboarding ?? emptyOnboarding;

  return (
    <section className="onboarding-nav">
      <div className="sidebar-kicker split">
        <span>Onboarding & Setup</span>
        <button className="icon-button" onClick={props.onRefresh} disabled={props.busy}>
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="readiness-list">
        {onboarding.items.map((item) => (
          <ReadinessRow key={item.id} item={item} />
        ))}
        <div className={`ready-build-row ${onboarding.ready ? "ready" : "blocked"}`}>
          <span />
          <strong>{onboarding.ready ? "Ready to Build" : "Finish Setup"}</strong>
        </div>
      </div>

      <div className="onboarding-actions">
        <button className="secondary" onClick={props.onSelectWorkspace} disabled={props.busy}>
          <FolderGit2 size={15} />
          Choose Workspace
        </button>
        <span>Checked {new Date(onboarding.lastCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {!props.state.account ? (
        <div className="stack auth-block">
          <input
            placeholder="GitHub username"
            value={props.githubUser}
            onChange={(event) => props.onGithubUser(event.target.value)}
          />
          <input
            placeholder="Fine-grained token"
            type="password"
            value={props.githubToken}
            onChange={(event) => props.onGithubToken(event.target.value)}
          />
          <button onClick={props.onConnectGitHub} disabled={props.busy}>
            <Github size={16} />
            Connect GitHub
          </button>
        </div>
      ) : null}

      {onboarding.items.some((item) => item.id === "git-identity" && item.status === "missing") ? (
        <div className="stack auth-block">
          <input
            placeholder="Git name"
            value={props.gitName}
            onChange={(event) => props.onGitName(event.target.value)}
          />
          <input
            placeholder="Git email"
            value={props.gitEmail}
            onChange={(event) => props.onGitEmail(event.target.value)}
          />
          <button onClick={props.onSaveGitIdentity} disabled={props.busy}>
            <KeyRound size={16} />
            Save git identity
          </button>
        </div>
      ) : null}
    </section>
  );
}

function ReadinessRow({ item }: { item: ReadinessItem }) {
  const Icon = item.status === "ready" ? CheckCircle2 : item.status === "warning" ? AlertTriangle : Circle;
  return (
    <div className={`readiness ${item.status}`}>
      <Icon size={16} />
      <div>
        <strong>{item.label}</strong>
      </div>
    </div>
  );
}

function RightRail({ state, selected }: { state: AppState; selected?: ManagedApp }) {
  const onboarding = state.onboarding ?? emptyOnboarding;
  const patchGenerated = Boolean(selected?.patchArtifactPath);

  return (
    <aside className="right-rail">
      <section className="rail-section">
        <h2>Build Readiness</h2>
        <div className="rail-list">
          {onboarding.items.map((item) => (
            <div className="rail-row" key={item.id}>
              <span>{item.label}</span>
              <strong className={item.status}>{item.status === "ready" ? item.detail || "Ready" : item.status}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="rail-section">
        <h2>Current Build</h2>
        <div className="metric-row">
          <span>Status</span>
          <strong className="pill-status">{selected?.buildStatus ?? "Ready"}</strong>
        </div>
        <div className="metric-row">
          <span>Last run</span>
          <strong>-</strong>
        </div>
        <div className="metric-row">
          <span>Generated</span>
          <strong>{selected ? selected.title : "-"}</strong>
        </div>
        <button className="secondary full-width">View Build History</button>
      </section>

      <section className="rail-section">
        <h2>Artifacts</h2>
        <div className="artifact-row">
          <div>
            <strong>PATCH.md</strong>
            <p>A patch file will be generated after the plan is approved and changes are created.</p>
          </div>
          <span>{patchGenerated ? "Generated" : "Not generated"}</span>
        </div>
      </section>
    </aside>
  );
}

function EmptyActivity() {
  return (
    <section className="activity-shell">
      <div className="tabbar">
        <button className="active">Activity</button>
        <button>Approvals</button>
        <button>Logs</button>
        <button>Preview</button>
        <button>Artifacts</button>
      </div>
      <div className="empty">
        <FolderGit2 size={36} />
        <h2>No build started yet.</h2>
        <p>Describe a project above, add optional source inputs, then plan and build.</p>
      </div>
    </section>
  );
}

interface DetailProps {
  app: ManagedApp;
  state: AppState;
  envKey: string;
  envValue: string;
  proposal?: AgentProposal;
  busy: boolean;
  onEnvKey(value: string): void;
  onEnvValue(value: string): void;
  onWriteEnv(): void;
  onRunCommand(commandId: string): void;
  onProposal(): void;
  onPersonalize(): void;
}

function AppDetail(props: DetailProps) {
  const logs = props.state.logs.filter((log) => log.appId === props.app.id);
  const approvals = props.state.approvals.filter((approval) => approval.appId === props.app.id);

  return (
    <section className="activity-shell">
      <div className="tabbar">
        <button className="active">Activity</button>
        <button>Approvals <span>{approvals.length}</span></button>
        <button>Logs</button>
        <button>Preview</button>
        <button>Artifacts</button>
        <button className="clear-button"><Trash2 size={14} /> Clear</button>
      </div>

      <div className="activity-grid">
        <section className="timeline">
          <TimelineRow time="10:42:11" title="Workspace validated" detail={props.app.localPath} done />
          <TimelineRow time="10:42:09" title="Codex ready" detail="Subscription active" pending />
          <TimelineRow time="10:42:07" title="GitHub connected" detail={props.app.repoUrl} done />
          <TimelineRow time="10:42:05" title="Patch artifact tracked" detail={props.app.patchArtifactPath ?? "Waiting for PATCH.md"} done={Boolean(props.app.patchArtifactPath)} />
        </section>

        <section className="approval-queue">
          <div className="section-line">
            <strong>Approval Queue ({approvals.length || 2})</strong>
            <span>Review and approve items to continue.</span>
          </div>
          {approvals.length ? (
            approvals.slice(0, 3).map((approval) => (
              <div className="approval-card" key={approval.id}>
                <div>
                  <strong>{approval.title}</strong>
                  <p>{approval.detail}</p>
                </div>
                <button className="secondary">Review</button>
                <button>Approve</button>
              </div>
            ))
          ) : (
            <>
              <div className="approval-card">
                <div>
                  <strong>Execution Plan</strong>
                  <p>High-level plan with build steps</p>
                </div>
                <button className="secondary" onClick={props.onProposal}>Review</button>
                <button onClick={props.onPersonalize}>Approve</button>
              </div>
              <div className="approval-card">
                <div>
                  <strong>Create Project Structure</strong>
                  <p>Add initial folders and configuration files</p>
                </div>
                <button className="secondary">Review</button>
                <button>Approve</button>
              </div>
            </>
          )}
        </section>

        <section className="build-log">
          <div className="section-line">
            <strong>Build Log (latest)</strong>
            <span className="live-dot">Live</span>
          </div>
          {logs.length ? (
            logs.map((log) => (
              <pre className="log" key={log.id}>
                {log.command}
                {"\n"}
                {log.output}
              </pre>
            ))
          ) : (
            <pre className="log">[10:45:15] PSB v1.0.0{"\n"}[10:45:16] Plan generated successfully{"\n"}[10:45:20] Creating project structure...{"\n"}[10:45:33] Installing dependencies...{"\n"}[10:45:43] Preview available at http://localhost:5173</pre>
          )}
          <div className="preview-link">
            <span>Local Preview</span>
            <a>http://localhost:5173</a>
          </div>
        </section>
      </div>

      <div className="hidden-ops">
        <div className="env-form">
          <input placeholder="KEY" value={props.envKey} onChange={(event) => props.onEnvKey(event.target.value)} />
          <input placeholder="value" type="password" value={props.envValue} onChange={(event) => props.onEnvValue(event.target.value)} />
          <button onClick={props.onWriteEnv} disabled={props.busy || !props.envKey.trim()}>Write Env</button>
        </div>
        <div className="command-strip">
          {props.app.runCommands.map((command) => (
            <button className="secondary" key={command.id} onClick={() => props.onRunCommand(command.id)} disabled={props.busy}>
              <Play size={15} />
              {command.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineRow(props: { time: string; title: string; detail: string; done?: boolean; pending?: boolean }) {
  return (
    <div className={`timeline-row ${props.done ? "done" : ""} ${props.pending ? "pending" : ""}`}>
      <span className="timeline-dot">{props.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}</span>
      <span className="timeline-time">{props.time}</span>
      <div>
        <strong>{props.title}</strong>
        <p>{props.detail}</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
