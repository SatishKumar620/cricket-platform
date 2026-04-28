import { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const WS_SCORES    = import.meta.env.VITE_WS_SCORES    || "ws://localhost:8000/ws/scores";
const WS_AUDIO     = import.meta.env.VITE_WS_AUDIO     || "ws://localhost:8000/tts/ws/audio";
const API_BASE     = import.meta.env.VITE_API_BASE      || "http://localhost:8000";

// ── Mock data (active when backend not connected) ─────────────────────────────
const MOCK_MATCHES = [
  {
    id: "a1b2", title: "IND vs AUS", subtitle: "2nd Test • Day 3 • MCG, Melbourne",
    team1: { name: "IND", flag: "🇮🇳", score: "342/6", overs: "87.4" },
    team2: { name: "AUS", flag: "🇦🇺", score: "289", overs: "94.0" },
    status: "India need 47 runs • 3 wkts remaining",
    batter1: { name: "R. Jadeja", runs: 54, balls: 71, sr: 76.1, fours: 5, sixes: 1 },
    batter2: { name: "J. Bumrah", runs: 8, balls: 14, sr: 57.1, fours: 1, sixes: 0 },
    bowler: { name: "J. Hazlewood", overs: "22.4", wkts: 3, runs: 67, econ: 2.94 },
    ballHistory: ["1","4","0","W","2","1","6","0","1","4"],
    crr: 3.93, rrr: 9.40, target: 389, partnership: { runs: 62, balls: 89 },
  },
  {
    id: "e5f6", title: "ENG vs SA", subtitle: "1st ODI • The Oval, London",
    team1: { name: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", score: "187/3", overs: "32.0" },
    team2: { name: "SA",  flag: "🇿🇦", score: "—",    overs: "Yet to bat" },
    status: "England batting • 50-over match",
    batter1: { name: "J. Root",   runs: 78, balls: 91, sr: 85.7, fours: 8, sixes: 1 },
    batter2: { name: "B. Stokes", runs: 22, balls: 19, sr: 115.8, fours: 3, sixes: 1 },
    bowler: { name: "K. Rabada", overs: "8.0", wkts: 2, runs: 41, econ: 5.13 },
    ballHistory: ["4","6","0","1","1","W","2","4","0","1"],
    crr: 5.84, rrr: null, target: null, partnership: { runs: 100, balls: 112 },
  },
  {
    id: "i9j0", title: "PAK vs NZ", subtitle: "T20I #3 • National Stadium, Karachi",
    team1: { name: "PAK", flag: "🇵🇰", score: "156/4", overs: "20.0" },
    team2: { name: "NZ",  flag: "🇳🇿", score: "112/7", overs: "17.3" },
    status: "NZ need 45 off 15 balls",
    batter1: { name: "T. Seifert",  runs: 31, balls: 18, sr: 172.2, fours: 2, sixes: 3 },
    batter2: { name: "T. Southee",  runs: 4,  balls: 5,  sr: 80.0,  fours: 0, sixes: 0 },
    bowler: { name: "Shaheen Afridi", overs: "3.3", wkts: 2, runs: 28, econ: 8.0 },
    ballHistory: ["6","W","4","6","1","W","0","6","W","4"],
    crr: 6.4, rrr: 18.0, target: 157, partnership: { runs: 35, balls: 23 },
  },
];

const COMMENTARY_POOL = {
  "6": ["SIX! Kohli picks up the length early and launches it over long-on — pure, unfiltered power. The required rate tumbles below eight for the first time today.",
        "MAXIMUM! Jadeja reads the googly perfectly and hits against the turn with brutal efficiency. This partnership is becoming the story of the match."],
  "4": ["FOUR! Beautifully timed through the covers — Root doesn't hit it hard, he just places it. The mid-off was ten yards too straight.",
        "FOUR! Back-foot punch through point — wrists working beautifully. Hazlewood will curse the extra bounce that put it in Jadeja's arc."],
  "W": ["WICKET! Cummins extracts vicious seam movement from a length — the outside edge is taken gleefully at second slip. Kohli goes for 78.",
        "OUT! Plumb in front! Shaheen has reversed the angle sharply. That's the breakthrough New Zealand desperately needed."],
  "0": ["Dot ball. Cummins lands it on the seam, holds its line outside off. Three dots in a row — the required rate creeps back above nine.",
        "Defended solidly back down the pitch. The pressure is building with every maiden."],
  "1": ["Worked away for a single. Kohli takes it to retain strike — he's batting on a different plane right now.",
        "Nudged through square leg. Smart cricket — not everything has to be a boundary."],
};

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function simulateBall(match) {
  const balls = ["0","1","1","1","2","4","4","6","W","Wd"];
  const ball = balls[Math.floor(Math.random() * balls.length)];
  return { ...match, lastBall: ball, ballHistory: [ball, ...match.ballHistory].slice(0, 10) };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const BALL_STYLE = {
  "6":  { bg: "#0a2e18", border: "#00e676", color: "#00e676", label: "SIX"  },
  "4":  { bg: "#0a1e35", border: "#40a9ff", color: "#40a9ff", label: "FOUR" },
  "W":  { bg: "#2e0a0a", border: "#ff4d4f", color: "#ff4d4f", label: "OUT"  },
  "0":  { bg: "#111",    border: "#333",    color: "#555",    label: "DOT"  },
  "Wd": { bg: "#2e2200", border: "#faad14", color: "#faad14", label: "WIDE" },
  "Nb": { bg: "#2e2200", border: "#faad14", color: "#faad14", label: "NB"   },
  "1":  { bg: "#111",    border: "#333",    color: "#888",    label: "1"    },
  "2":  { bg: "#111",    border: "#333",    color: "#888",    label: "2"    },
  "3":  { bg: "#111",    border: "#333",    color: "#888",    label: "3"    },
};

// ── Audio Player ──────────────────────────────────────────────────────────────
function useAudioPlayer() {
  const audioCtxRef = useRef(null);
  const playAudio = useCallback(async (b64) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") await ctx.resume();
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn("Audio playback error:", e);
    }
  }, []);
  return playAudio;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function BallDot({ val, fresh }) {
  const s = BALL_STYLE[val] || BALL_STYLE["1"];
  return (
    <div style={{
      width: 30, height: 30, borderRadius: "50%",
      background: s.bg, border: `1.5px solid ${s.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, fontWeight: 800, color: s.color,
      fontFamily: "'JetBrains Mono', monospace",
      transform: fresh ? "scale(1.35)" : "scale(1)",
      boxShadow: fresh ? `0 0 14px ${s.border}88` : "none",
      transition: "all 0.4s cubic-bezier(.34,1.56,.64,1)",
      flexShrink: 0,
    }}>{s.label.length <= 3 ? s.label : val}</div>
  );
}

function StatRow({ label, val, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #0f0f1a" }}>
      <span style={{ fontSize: 10, color: "#4a4a6a", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: accent || "#c8c8e8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{val}</span>
    </div>
  );
}

function CommentaryBubble({ item, isNew }) {
  const s = BALL_STYLE[item.ball] || BALL_STYLE["1"];
  const [chars, setChars] = useState(isNew ? 0 : item.text.length);
  useEffect(() => {
    if (!isNew) return;
    let i = 0;
    const t = setInterval(() => { i += 2; setChars(i); if (i >= item.text.length) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [item.text, isNew]);

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: isNew ? s.bg : "#09090f",
      border: `1px solid ${isNew ? s.border : "#1a1a2e"}`,
      opacity: isNew ? 1 : 0.55,
      transition: "all 0.5s",
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
        <BallDot val={item.ball} fresh={false} />
        <div>
          <div style={{ fontSize: 9, color: s.color, fontWeight: 800, letterSpacing: 2 }}>{s.label}</div>
          <div style={{ fontSize: 9, color: "#333", fontFamily: "'JetBrains Mono', monospace" }}>{item.match} · {item.ts}</div>
        </div>
        {item.lang && item.lang !== "en" && (
          <div style={{ marginLeft: "auto", fontSize: 9, color: "#4a4a6a", background: "#111", padding: "2px 6px", borderRadius: 4 }}>
            {item.lang.toUpperCase()}
          </div>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 12, color: isNew ? "#d8d8f0" : "#666", lineHeight: 1.6, fontStyle: "italic" }}>
        "{item.text.slice(0, chars)}{isNew && chars < item.text.length ? "▌" : ""}"
      </p>
    </div>
  );
}

function MatchTab({ match, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px", borderRadius: 10, cursor: "pointer",
      background: active ? "#0d1e35" : "transparent",
      border: `1px solid ${active ? "#40a9ff" : "#1a1a2e"}`,
      color: active ? "#40a9ff" : "#4a4a6a",
      fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
      transition: "all 0.2s",
    }}>
      {match.team1.flag} {match.team1.name} vs {match.team2.name} {match.team2.flag}
    </button>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [matches, setMatches] = useState(MOCK_MATCHES);
  const [activeId, setActiveId] = useState(MOCK_MATCHES[0].id);
  const [commentary, setCommentary] = useState([]);
  const [wsStatus, setWsStatus] = useState("demo");   // demo | connected | error
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [activeVoice, setActiveVoice] = useState("am_adam");
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const playAudio = useAudioPlayer();
  const tickRef = useRef(null);
  const ballIdxRef = useRef(0);

  const VOICES = [
    { id: "am_adam",    label: "Adam",    style: "Authoritative · Test Match" },
    { id: "am_michael", label: "Michael", style: "Energetic · T20 Style"      },
    { id: "bf_emma",    label: "Emma",    style: "Analytical · Stats Focus"   },
    { id: "af_sky",     label: "Sky",     style: "Friendly · Casual"          },
  ];

  const LANGS = [
    { code: "en", label: "EN" }, { code: "hi", label: "हि" },
    { code: "ta", label: "த"  }, { code: "te", label: "తె" },
    { code: "bn", label: "বা" },
  ];

  // Simulate live updates every 4s
  useEffect(() => {
    tickRef.current = setInterval(() => {
      const idx = ballIdxRef.current % matches.length;
      ballIdxRef.current++;
      setMatches(prev => {
        const updated = [...prev];
        const ball = ["0","1","1","2","4","4","6","W","Wd"][Math.floor(Math.random() * 9)];
        updated[idx] = { ...updated[idx], lastBall: ball, ballHistory: [ball, ...updated[idx].ballHistory].slice(0,10) };
        const pool = COMMENTARY_POOL[ball] || COMMENTARY_POOL["1"];
        const text = randomFrom(pool || ["Ball played."]);
        setCommentary(prev => [{
          id: Date.now(), ball, text,
          match: updated[idx].title,
          lang: activeLanguage,
          ts: new Date().toLocaleTimeString(),
        }, ...prev].slice(0, 20));
        return updated;
      });
    }, 4000);
    return () => clearInterval(tickRef.current);
  }, [activeLanguage]);

  // Try real WebSocket
  useEffect(() => {
    try {
      const ws = new WebSocket(WS_SCORES);
      ws.onopen = () => setWsStatus("connected");
      ws.onerror = () => setWsStatus("demo");
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "update") {
          setMatches(prev => prev.map(m => m.id === data.match.id ? { ...m, ...data.match } : m));
        }
      };
      return () => ws.close();
    } catch { setWsStatus("demo"); }
  }, []);

  // Audio WebSocket
  useEffect(() => {
    if (!audioEnabled) return;
    try {
      const ws = new WebSocket(WS_AUDIO);
      ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        if (data.type === "audio" && data.audio_b64) await playAudio(data.audio_b64);
      };
      return () => ws.close();
    } catch {}
  }, [audioEnabled, playAudio]);

  const activeMatch = matches.find(m => m.id === activeId) || matches[0];
  const activeCommentary = commentary.filter(c => c.match === activeMatch.title || commentary.length < 3);

  const statusColor = { demo: "#faad14", connected: "#00e676", error: "#ff4d4f" }[wsStatus];
  const statusLabel = { demo: "DEMO MODE", connected: "LIVE", error: "RECONNECTING" }[wsStatus];

  return (
    <div style={{ minHeight: "100vh", background: "#06060e", color: "#c8c8e8", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&family=Inter:wght@400;500;600;700;900&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-thumb { background: #1e1e3a; }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #40a9ff22} 50%{box-shadow:0 0 40px #40a9ff44} }
      `}</style>

      {/* ── Header ── */}
      <header style={{
        padding: "0 24px", height: 56,
        background: "#08080f",
        borderBottom: "1px solid #1a1a2e",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22, fontFamily: "'Bebas Neue', cursive", letterSpacing: 3, color: "#40a9ff" }}>
            CRICSTREAM
          </div>
          <div style={{ fontSize: 9, color: "#333", fontFamily: "'JetBrains Mono', monospace", paddingTop: 2 }}>
            REAL-TIME AI COMMENTARY
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Language picker */}
          <div style={{ display: "flex", gap: 4 }}>
            {LANGS.map(l => (
              <button key={l.code} onClick={() => setActiveLanguage(l.code)} style={{
                padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11,
                background: activeLanguage === l.code ? "#40a9ff22" : "transparent",
                border: `1px solid ${activeLanguage === l.code ? "#40a9ff" : "#1e1e3a"}`,
                color: activeLanguage === l.code ? "#40a9ff" : "#4a4a6a",
                fontWeight: 700, transition: "all 0.15s",
              }}>{l.label}</button>
            ))}
          </div>

          {/* Voice selector */}
          <button onClick={() => setShowVoicePanel(v => !v)} style={{
            padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: showVoicePanel ? "#40a9ff22" : "transparent",
            border: `1px solid ${showVoicePanel ? "#40a9ff" : "#1e1e3a"}`,
            color: showVoicePanel ? "#40a9ff" : "#4a4a6a", fontSize: 11, fontWeight: 700,
          }}>🎙 {VOICES.find(v => v.id === activeVoice)?.label}</button>

          {/* Audio toggle */}
          <button onClick={() => setAudioEnabled(a => !a)} style={{
            padding: "5px 12px", borderRadius: 8, cursor: "pointer",
            background: audioEnabled ? "#00e67622" : "transparent",
            border: `1px solid ${audioEnabled ? "#00e676" : "#1e1e3a"}`,
            color: audioEnabled ? "#00e676" : "#4a4a6a", fontSize: 11, fontWeight: 700,
          }}>{audioEnabled ? "🔊 AUDIO ON" : "🔇 AUDIO OFF"}</button>

          {/* WS Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor,
              animation: wsStatus === "connected" ? "livePulse 1.2s infinite" : "none" }} />
            <span style={{ fontSize: 9, color: statusColor, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
              {statusLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Voice panel dropdown */}
      {showVoicePanel && (
        <div style={{
          position: "absolute", top: 60, right: 24, zIndex: 100,
          background: "#0d0d1a", border: "1px solid #1e1e3a", borderRadius: 12,
          padding: 16, width: 260, animation: "slideIn 0.2s ease",
          boxShadow: "0 20px 60px #000",
        }}>
          <div style={{ fontSize: 10, color: "#4a4a6a", letterSpacing: 2, marginBottom: 10, textTransform: "uppercase" }}>
            Commentator Voice
          </div>
          {VOICES.map(v => (
            <button key={v.id} onClick={() => { setActiveVoice(v.id); setShowVoicePanel(false); }} style={{
              display: "block", width: "100%", padding: "10px 12px", cursor: "pointer",
              background: activeVoice === v.id ? "#40a9ff11" : "transparent",
              border: `1px solid ${activeVoice === v.id ? "#40a9ff44" : "transparent"}`,
              borderRadius: 8, textAlign: "left", marginBottom: 4,
              color: activeVoice === v.id ? "#40a9ff" : "#888",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{v.label}</div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{v.style}</div>
            </button>
          ))}
          <div style={{ marginTop: 10, padding: "8px 10px", background: "#060610", borderRadius: 8,
            fontSize: 9, color: "#333", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
            Powered by Kokoro-82M<br />
            Add ElevenLabs key for premium voices
          </div>
        </div>
      )}

      {/* ── Match tabs ── */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid #0f0f1a", display: "flex", gap: 8, overflowX: "auto" }}>
        {matches.map(m => <MatchTab key={m.id} match={m} active={m.id === activeId} onClick={() => setActiveId(m.id)} />)}
      </div>

      {/* ── Main layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px 300px", gap: 0, height: "calc(100vh - 110px)" }}>

        {/* ── Centre: Scoreboard ── */}
        <div style={{ padding: 24, overflowY: "auto", borderRight: "1px solid #0f0f1a" }}>
          {/* Match header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#ff4d4f",
                animation: "livePulse 1s infinite", boxShadow: "0 0 8px #ff4d4f" }} />
              <span style={{ fontSize: 9, color: "#ff4d4f", fontWeight: 800, letterSpacing: 3 }}>LIVE</span>
              <span style={{ fontSize: 10, color: "#333", marginLeft: 4 }}>{activeMatch.subtitle}</span>
            </div>
            <h1 style={{ fontSize: 32, fontFamily: "'Bebas Neue', cursive", letterSpacing: 4, color: "#e8e8ff",
              lineHeight: 1 }}>
              {activeMatch.team1.flag} {activeMatch.team1.name}
              <span style={{ color: "#333", margin: "0 16px", fontSize: 20 }}>VS</span>
              {activeMatch.team2.flag} {activeMatch.team2.name}
            </h1>
          </div>

          {/* Scores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[activeMatch.team1, activeMatch.team2].map((team, i) => (
              <div key={i} style={{
                padding: "20px 22px", borderRadius: 14,
                background: i === 0 ? "#0a1e35" : "#09090f",
                border: `1px solid ${i === 0 ? "#40a9ff33" : "#1a1a2e"}`,
                animation: i === 0 ? "glow 3s infinite" : "none",
              }}>
                <div style={{ fontSize: 11, color: "#4a4a6a", fontWeight: 700, marginBottom: 8,
                  letterSpacing: 2, textTransform: "uppercase" }}>
                  {team.flag} {team.name} {i === 0 ? "(Batting)" : ""}
                </div>
                <div style={{ fontSize: 38, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, color: i === 0 ? "#40a9ff" : "#888", lineHeight: 1 }}>
                  {team.score}
                </div>
                <div style={{ fontSize: 11, color: "#333", marginTop: 6 }}>
                  {typeof team.overs === "string" && team.overs.includes("bat") ? team.overs : `(${team.overs} overs)`}
                </div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div style={{
            padding: "12px 16px", borderRadius: 10,
            background: "#0a0a14", border: "1px solid #1a1a2e",
            fontSize: 12, color: "#a8a8c8", fontWeight: 600, marginBottom: 20,
          }}>
            {activeMatch.status}
          </div>

          {/* Run rates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Current RR", val: activeMatch.crr?.toFixed(2), color: "#00e676" },
              { label: "Required RR", val: activeMatch.rrr ? activeMatch.rrr.toFixed(2) : "—",
                color: activeMatch.rrr > 10 ? "#ff4d4f" : activeMatch.rrr ? "#faad14" : "#555" },
            ].map(item => (
              <div key={item.label} style={{
                padding: "14px 16px", borderRadius: 10,
                background: "#08080f", border: "1px solid #1a1a2e", textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 6,
                  textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Ball history */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 10,
              textTransform: "uppercase" }}>This Over</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {activeMatch.ballHistory.map((b, i) => (
                <BallDot key={i} val={b} fresh={i === 0} />
              ))}
            </div>
          </div>

          {/* Partnership */}
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "#08080f",
            border: "1px solid #1a1a2e" }}>
            <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 6,
              textTransform: "uppercase" }}>Partnership</div>
            <span style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800, color: "#c8c8e8" }}>
              {activeMatch.partnership.runs}
            </span>
            <span style={{ fontSize: 11, color: "#4a4a6a", marginLeft: 8 }}>
              ({activeMatch.partnership.balls} balls)
            </span>
          </div>
        </div>

        {/* ── Right 1: Scorecard ── */}
        <div style={{ padding: 20, overflowY: "auto", borderRight: "1px solid #0f0f1a",
          background: "#07070e" }}>
          <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, marginBottom: 16,
            textTransform: "uppercase" }}>Scorecard</div>

          {/* Batting */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 1, marginBottom: 8,
              textTransform: "uppercase" }}>Batting</div>
            {[activeMatch.batter1, activeMatch.batter2].map((b, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #0f0f1a" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: i === 0 ? "#e8e8ff" : "#888", fontWeight: i === 0 ? 700 : 400 }}>
                    {i === 0 ? "⚡ " : ""}{b.name}
                  </span>
                  <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 900, color: i === 0 ? "#40a9ff" : "#666" }}>{b.runs}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#4a4a6a" }}>
                  <span>{b.balls}b</span>
                  <span style={{ color: b.sr > 150 ? "#00e676" : b.sr > 80 ? "#faad14" : "#ff4d4f" }}>
                    SR {b.sr}
                  </span>
                  <span>{b.fours}×4</span>
                  <span>{b.sixes}×6</span>
                </div>
              </div>
            ))}
          </div>

          {/* Bowling */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#333", letterSpacing: 1, marginBottom: 8,
              textTransform: "uppercase" }}>Bowling</div>
            <div style={{ padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#e8e8ff", fontWeight: 700 }}>
                  {activeMatch.bowler.name}
                </span>
                <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 900, color: "#ff4d4f" }}>{activeMatch.bowler.wkts}/<span style={{color:"#888"}}>{activeMatch.bowler.runs}</span></span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#4a4a6a" }}>
                <span>{activeMatch.bowler.overs} ov</span>
                <span>Econ {activeMatch.bowler.econ}</span>
              </div>
            </div>
          </div>

          {/* Tech stack info */}
          <div style={{ padding: "12px", background: "#060610", borderRadius: 10,
            border: "1px solid #0f0f1a", fontSize: 9, color: "#2a2a4a",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
            <div style={{ color: "#40a9ff44", marginBottom: 4 }}>TECH STACK</div>
            FastAPI + Redis pub/sub<br />
            Kokoro-82M TTS (local)<br />
            Mistral / Groq LLM<br />
            React + Vite frontend<br />
            LibreTranslate (18 langs)<br />
            WebSocket streaming
          </div>
        </div>

        {/* ── Right 2: Commentary feed ── */}
        <div style={{ padding: 20, overflowY: "auto", background: "#06060c" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "#4a4a6a", letterSpacing: 2, textTransform: "uppercase" }}>
              AI Commentary
            </div>
            <div style={{ fontSize: 9, color: "#4a4a6a", fontFamily: "'JetBrains Mono', monospace" }}>
              {LANGS.find(l => l.code === activeLanguage)?.label} · {VOICES.find(v => v.id === activeVoice)?.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {commentary.length === 0 && (
              <div style={{ fontSize: 12, color: "#2a2a4a", padding: "20px 0" }}>
                Waiting for first ball event…
              </div>
            )}
            {commentary.map((c, i) => (
              <div key={c.id} style={{ animation: i === 0 ? "slideIn 0.3s ease" : "none" }}>
                <CommentaryBubble item={c} isNew={i === 0} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
