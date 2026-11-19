import { useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowLeft,
  CaretRight,
  ChatCircleDots,
  CheckCircle,
  ClockCounterClockwise,
  ClosedCaptioning,
  CornersOut,
  DotsThree,
  GitBranch,
  Lightbulb,
  Microphone,
  PaperPlaneRight,
  Pause,
  Play,
  Question,
  ShieldCheck,
  Sparkle,
  SpeakerHigh,
  X,
} from "@phosphor-icons/react";

const timelineItems = [
  {
    episode: "第 1 集 · 12:14",
    title: "旧案第一次被提及",
    body: "林夏在父亲的遗物中发现一张没有署名的码头合影。",
  },
  {
    episode: "第 2 集 · 31:08",
    title: "周峤协助检查证物",
    body: "他以法医顾问身份出现，提醒林夏不要公开照片背面的编号。",
  },
  {
    episode: "当前 · 第 3 集 18:42",
    title: "雨巷再次相遇",
    body: "周峤突然现身，阻止陌生人带走林夏。",
    current: true,
  },
];

const plotThreads = [
  { name: "码头旧案", status: "推进中", progress: 72, tone: "gold" },
  { name: "周峤的真实立场", status: "尚未揭晓", progress: 42, tone: "blue" },
  { name: "照片背后的编号", status: "线索不足", progress: 24, tone: "muted" },
];

function IconButton({ label, children, className = "", onClick, type = "button" }) {
  return (
    <button className={`icon-button ${className}`} aria-label={label} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

function LoadingPanel() {
  return (
    <div className="loading-panel" aria-live="polite" aria-label="正在理解当前剧情">
      <span className="loading-orb"><Sparkle weight="fill" /></span>
      <div>
        <strong>正在理解当前剧情</strong>
        <p>对齐人物、字幕与已观看时间线…</p>
      </div>
      <span className="loading-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  );
}

function ConversationPanel({ onRemember }) {
  const [question, setQuestion] = useState("");
  const [sentQuestion, setSentQuestion] = useState("");
  const [replying, setReplying] = useState(false);

  function submit(event) {
    event.preventDefault();
    const value = question.trim();
    if (!value) return;
    setSentQuestion(value);
    setQuestion("");
    setReplying(true);
    window.setTimeout(() => setReplying(false), 720);
  }

  return (
    <div className="conversation-panel">
      <div className="question-bubble">他为什么在帮林夏？</div>

      <section className="answer-stack" aria-label="剧情灵伴回答">
        <article className="evidence-card confirmed">
          <div className="evidence-heading"><CheckCircle weight="fill" /><strong>已确认</strong></div>
          <p>周峤曾协助林夏调查父亲留下的旧案，也提醒她保护关键证物。</p>
        </article>
        <article className="evidence-card inferred">
          <div className="evidence-heading"><Lightbulb weight="fill" /><strong>可以推测</strong></div>
          <p>他这次出手可能仍与保护证物有关，但是否完全站在林夏一边，还不能确定。</p>
        </article>
        <article className="evidence-card unknown">
          <div className="evidence-heading"><Question weight="fill" /><strong>尚未揭晓</strong></div>
          <p>周峤隐瞒了什么、为何熟悉码头旧案，当前剧情还没有给出答案。</p>
        </article>
      </section>

      {sentQuestion && (
        <div className="followup-exchange" aria-live="polite">
          <div className="question-bubble">{sentQuestion}</div>
          {replying ? (
            <div className="typing-line"><span /><span /><span /> 正在根据当前进度回答</div>
          ) : (
            <div className="compact-answer">
              截至当前进度，只能确认这条线索与码头旧案有关；更具体的关系尚未揭晓。
            </div>
          )}
        </div>
      )}

      <div className="suggested-questions" aria-label="建议追问">
        {["他和林夏父亲是什么关系？", "照片背面的编号出现过吗？"].map((item) => (
          <button key={item} type="button" onClick={() => setQuestion(item)}>{item}</button>
        ))}
      </div>

      <form className="composer" onSubmit={submit}>
        <IconButton label="语音提问" className="voice-button"><Microphone weight="fill" /></IconButton>
        <input
          aria-label="继续追问"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="继续问当前剧情…"
        />
        <IconButton label="发送问题" className="send-button" type="submit"><PaperPlaneRight weight="fill" /></IconButton>
      </form>

      <div className="conversation-actions">
        <button type="button" className="secondary-action" onClick={onRemember}>替我记着</button>
      </div>
    </div>
  );
}

function TimelinePanel({ onSeek }) {
  return (
    <div className="timeline-panel">
      <p className="panel-intro">只展示你已经看过、并且和当前人物有关的情节。</p>
      <ol className="timeline-list">
        {timelineItems.map((item) => (
          <li key={item.episode} className={item.current ? "is-current" : ""}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <span className="timeline-time">{item.episode}</span>
              <strong>{item.title}</strong>
              <p>{item.body}</p>
              {!item.current && <button type="button" onClick={() => onSeek(item.episode)}>回看片段 <CaretRight /></button>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PlotPanel() {
  return (
    <div className="plot-panel">
      <p className="panel-intro">以下剧情线按当前观看进度整理，未揭晓部分不会提前展开。</p>
      <div className="plot-threads">
        {plotThreads.map((thread) => (
          <article key={thread.name} className={`plot-card ${thread.tone}`}>
            <div className="plot-title"><GitBranch /><strong>{thread.name}</strong><span>{thread.status}</span></div>
            <div className="plot-progress" aria-label={`${thread.name}进度 ${thread.progress}%`}>
              <i style={{ width: `${thread.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
      <div className="spoiler-lock">
        <ShieldCheck weight="fill" />
        <div><strong>后续节点已隐藏</strong><p>播放进度推进后，剧情线会自动更新。</p></div>
      </div>
    </div>
  );
}

function FollowupDrawer({ open, status, tab, onTab, onClose, onRetry, onRemember, onSeek }) {
  return (
    <aside className={`followup-drawer ${open ? "is-open" : ""}`} aria-hidden={!open} aria-label="剧情深度面板">
      <div className="drawer-header">
        <div>
          <span className="drawer-kicker"><Sparkle weight="fill" /> 剧情灵伴</span>
          <strong>周峤 · 当前剧情上下文</strong>
        </div>
        <IconButton label="关闭侧边栏" onClick={onClose}><X /></IconButton>
      </div>
      <div className="trust-strip"><ShieldCheck weight="fill" /> 无剧透 · 截至第 3 集 18:42</div>
      <nav className="drawer-tabs" aria-label="剧情信息类型">
        {[
          ["conversation", "对话", ChatCircleDots],
          ["timeline", "时间线", ClockCounterClockwise],
          ["plot", "剧情线", GitBranch],
        ].map(([id, label, Icon]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => onTab(id)} type="button">
            <Icon weight={tab === id ? "fill" : "regular"} /> {label}
          </button>
        ))}
      </nav>
      <div className="drawer-body">
        {status === "loading" && <LoadingPanel />}
        {status === "error" && (
          <div className="error-panel">
            <ArrowClockwise />
            <strong>暂时没有连上剧情服务</strong>
            <p>不会影响视频播放，你可以稍后再试。</p>
            <button type="button" onClick={onRetry}>重新连接</button>
          </div>
        )}
        {status === "ready" && tab === "conversation" && <ConversationPanel onRemember={onRemember} />}
        {status === "ready" && tab === "timeline" && <TimelinePanel onSeek={onSeek} />}
        {status === "ready" && tab === "plot" && <PlotPanel />}
      </div>
    </aside>
  );
}

export function App() {
  const [paused, setPaused] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerStatus, setDrawerStatus] = useState("ready");
  const [tab, setTab] = useState("conversation");
  const [toast, setToast] = useState("");
  const loadingTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(loadingTimer.current), []);

  function showToast(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function openFollowup() {
    setPaused(true);
    setDrawerOpen(true);
    setDrawerStatus("loading");
    setTab("conversation");
    window.clearTimeout(loadingTimer.current);
    loadingTimer.current = window.setTimeout(() => setDrawerStatus("ready"), 700);
  }

  function retryDrawer() {
    setDrawerStatus("loading");
    window.clearTimeout(loadingTimer.current);
    loadingTimer.current = window.setTimeout(() => setDrawerStatus("ready"), 650);
  }

  function continuePlayback() {
    setDrawerOpen(false);
    setPaused(false);
    showToast("已从 18:42 继续播放");
  }

  return (
    <main className="prototype-stage">
      <section className={`player ${paused ? "is-paused" : "is-playing"} ${drawerOpen ? "drawer-open" : ""}`} aria-label="暗潮之下视频播放器">
        <img className="scene-image" src="/assets/rainy-alley-clean.png" alt="雨夜旧巷中，林夏、周峤与陌生人相遇" />
        <div className="cinema-grade" aria-hidden="true" />

        <header className="player-header">
          <div className="title-group">
            <IconButton label="返回"><ArrowLeft /></IconButton>
            <div><strong>暗潮之下</strong><span>第 3 集 · 迷雾的尽头</span></div>
          </div>
          <div className="top-actions">
            <button className="text-control" type="button">1080P</button>
            <IconButton label="字幕"><ClosedCaptioning /></IconButton>
            <IconButton label="更多"><DotsThree weight="bold" /></IconButton>
          </div>
        </header>

        <button className="video-hit-area" aria-label={paused ? "继续播放" : "暂停"} type="button" onClick={() => setPaused((value) => !value)} />

        {paused && !drawerOpen && (
          <>
            <button className="center-play" type="button" aria-label="继续播放" onClick={continuePlayback}><Play weight="fill" /></button>
            <div className="character-focus" aria-label="已识别人物：周峤"><span /></div>
            <article className="character-card">
              <div className="character-summary">
                <div className="character-avatar"><img src="/assets/rainy-alley-clean.png" alt="周峤人物头像" /></div>
                <div className="character-copy">
                  <strong>周峤 <span>· 法医顾问</span></strong>
                  <p>曾协助林夏调查父亲留下的旧案</p>
                  <button type="button" onClick={() => showToast("正在定位第 2 集 31:08")}>上次出现：第 2 集 31:08 <CaretRight /></button>
                </div>
              </div>
              <div className="card-trust"><ShieldCheck weight="fill" /> 无剧透 · 仅依据已观看内容</div>
              <div className="card-actions">
                <button className="secondary-action" type="button" onClick={openFollowup}><ChatCircleDots weight="fill" />继续追问</button>
                <button className="primary-action" type="button" onClick={continuePlayback}><Play weight="fill" />继续播放</button>
              </div>
            </article>
          </>
        )}

        <footer className="player-controls">
          <div className="progress-row">
            <span>18:42</span><div className="progress-track"><i /></div><span>45:20</span>
          </div>
          <div className="control-row">
            <div>
              <IconButton label={paused ? "播放" : "暂停"} onClick={() => setPaused((value) => !value)}>{paused ? <Play weight="fill" /> : <Pause weight="fill" />}</IconButton>
              <IconButton label="音量"><SpeakerHigh weight="fill" /></IconButton>
              <span className="subtitle">证据不会说谎，问题是它在哪里。</span>
            </div>
            <div>
              <span className="companion-chip"><Sparkle weight="fill" /> 剧情灵伴</span>
              <IconButton label="全屏"><CornersOut /></IconButton>
            </div>
          </div>
        </footer>

        <FollowupDrawer
          open={drawerOpen}
          status={drawerStatus}
          tab={tab}
          onTab={setTab}
          onClose={() => setDrawerOpen(false)}
          onRetry={retryDrawer}
          onRemember={() => showToast("已记住：周峤为什么帮助林夏？")}
          onSeek={(episode) => showToast(`正在定位 ${episode}`)}
        />

        {toast && <div className="toast" role="status">{toast}</div>}
      </section>
      <p className="stage-note">点击“继续追问”体验完整剧情侧边栏</p>
    </main>
  );
}
