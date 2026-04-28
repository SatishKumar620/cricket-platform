import { useState, useEffect, useRef, useCallback } from "react";
import HomePage from "./HomePage.jsx";

const WS_SCORES    = import.meta.env.VITE_WS_SCORES    || "ws://localhost:8000/ws/scores";
const WS_AUDIO     = import.meta.env.VITE_WS_AUDIO     || "ws://localhost:8000/tts/ws/audio";
const API_BASE     = import.meta.env.VITE_API_BASE      || "http://localhost:8000";

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

const BALL_STYLE = {
  "6":  { bg: "#0a2e18", border: "#00e676", color: "#00e676", label: "SIX"  },
  "4":  { bg: "#eef4f0", border: "#4a7c59", color: "#4a7c59", label: "FOUR" },
  "W":  { bg: "#2e0a0a", border: "#ff4d4f", color: "#ff4d4f", label: "OUT"  },
  "0":  { bg: "#f0e8dc", border: "#8a8578", color: "#aaa09a", label: "DOT"  },
  "Wd": { bg: "#2e2200", border: "#faad14", color: "#faad14", label: "WIDE" },
  "Nb": { bg: "#2e2200", border: "#faad14", color: "#faad14", label: "NB"   },
  "1":  { bg: "#f0e8dc", border: "#8a8578", color: "#6b6560", label: "1"    },
  "2":  { bg: "#f0e8dc", border: "#8a8578", color: "#6b6560", label: "2"    },
  "3":  { bg: "#f0e8dc", border: "#8a8578", color: "#6b6560", label: "3"    },
};

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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f0e8dc" }}>
      <span style={{ fontSize: 10, color: "#8a8578", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: accent || "#1a1a18", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{val}</span>
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
      background: isNew ? s.bg : "#f5f0e8",
      border: `1px solid ${isNew ? s.border : "#e8d9c4"}`,
      opacity: isNew ? 1 : 0.55,
      transition: "all 0.5s",
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 7 }}>
        <BallDot val={item.ball} fresh={false} />
        <div>
          <div style={{ fontSize: 9, color: s.color, fontWeight: 800, letterSpacing: 2 }}>{s.label}</div>
          <div style={{ fontSize: 9, color: "#8a8578", fontFamily: "'JetBrains Mono', monospace" }}>{item.match} · {item.ts}</div>
        </div>
        {item.lang && item.lang !== "en" && (
          <div style={{ marginLeft: "auto", fontSize: 9, color: "#8a8578", background: "#f0e8dc", padding: "2px 6px", borderRadius: 4 }}>
            {item.lang}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#3a3a36", lineHeight: 1.6 }}>
        {item.text.slice(0, chars)}
        {chars < item.text.length && <span style={{ opacity: 0.4 }}>|</span>}
      </div>
    </div>
  );
}

const LANGS = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },   { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" }, { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },{ code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },    { code: "fr", label: "French" },
  { code: "es", label: "Spanish" }, { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },{ code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" }, { code: "sw", label: "Swahili" },
];

const VOICES = [
  { id: "af_heart",   label: "Heart (F)"    },
  { id: "af_bella",   label: "Bella (F)"    },
  { id: "am_adam",    label: "Adam (M)"     },
  { id: "am_michael", label: "Michael (M)"  },
  { id: "bf_emma",    label: "Emma (F)"     },
  { id: "bm_george",  label: "George (M)"   },
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [matches, setMatches] = useState(MOCK_MATCHES);
  const [activeId, setActiveId] = useState(MOCK_MATCHES[0].id);
  const [commentary, setCommentary] = useState([]);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [activeVoice, setActiveVoice] = useState("af_heart");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [connected, setConnected] = useState(false);
  const [mockMode, setMockMode] = useState(true);

  const wsScoreRef = useRef(null);
  const wsAudioRef = useRef(null);
  const mockTimerRef = useRef(null);
  const playAudio = useAudioPlayer();

  const activeMatch = matches.find(m => m.id === activeId) || matches[0];

  const addCommentary = useCallback((entry) => {
    setCommentary(prev => [entry, ...prev].slice(0, 30));
  }, []);

  const handleBallEvent = useCallback((ball, matchTitle) => {
    const pool = COMMENTARY_POOL[ball] || COMMENTARY_POOL["1"];
    const text = randomFrom(pool);
    addCommentary({
      id: Date.now(),
      ball,
      text,
      match: matchTitle,
      ts: new Date().toLocaleTimeString(),
      lang: activeLanguage,
    });
  }, [activeLanguage, addCommentary]);

  useEffect(() => {
    if (screen !== "dashboard") return;
    if (mockMode) {
      mockTimerRef.current = setInterval(() => {
        setMatches(prev => prev.map((m, i) => i === 0 ? simulateBall(m) : m));
        const m = matches[0];
        const balls = ["0","1","1","2","4","4","6","W","Wd"];
        const ball = balls[Math.floor(Math.random() * balls.length)];
        handleBallEvent(ball, m.title);
      }, 3000);
      return () => clearInterval(mockTimerRef.current);
    }
  }, [screen, mockMode, handleBallEvent]);

  useEffect(() => {
    if (screen !== "dashboard" || mockMode) return;
    const ws = new WebSocket(WS_SCORES);
    wsScoreRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.matches) setMatches(data.matches);
        if (data.ball_event) handleBallEvent(data.ball_event.ball, data.ball_event.match);
      } catch {}
    };
    return () => ws.close();
  }, [screen, mockMode, handleBallEvent]);

  useEffect(() => {
    if (!audioEnabled || screen !== "dashboard") return;
    const ws = new WebSocket(`${WS_AUDIO}?lang=${activeLanguage}&voice=${activeVoice}`);
    wsAudioRef.current = ws;
    ws.binaryType = "arraybuffer";
    ws.onmessage = async (e) => {
      if (typeof e.data === "string") {
        try {
          const d = JSON.parse(e.data);
          if (d.audio_b64) await playAudio(d.audio_b64);
        } catch {}
      }
    };
    return () => ws.close();
  }, [audioEnabled, activeLanguage, activeVoice, screen, playAudio]);

  if (screen === "home") {
    return <HomePage onEnter={() => setScreen("dashboard")} />;
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#faf7f2",
      fontFamily: "'DM Sans', sans-serif",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #e8d9c4; border-radius: 2px; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", background: "#faf7f2",
        borderBottom: "1px solid #f0e8dc", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setScreen("home")} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#8a8578", fontFamily: "'DM Sans', sans-serif",
          }}>← Back</button>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 900, color: "#1a1a18",
          }}>Cric<span style={{ color: "#c4956a" }}>Stream</span></div>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            background: connected ? "#0a2e18" : "#f0e8dc",
            border: `1px solid ${connected ? "#00e676" : "#e8d9c4"}`,
            padding: "4px 10px", borderRadius: 100,
            fontSize: 10, color: connected ? "#00e676" : "#8a8578",
            fontWeight: 600, letterSpacing: 1,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: connected ? "#00e676" : "#8a8578",
              animation: connected ? "livePulse 1s infinite" : "none",
            }} />
            {connected ? "LIVE" : "MOCK"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select value={activeLanguage} onChange={e => setActiveLanguage(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8d9c4", background: "#fff", color: "#1a1a18", fontFamily: "'DM Sans', sans-serif" }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <select value={activeVoice} onChange={e => setActiveVoice(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8d9c4", background: "#fff", color: "#1a1a18", fontFamily: "'DM Sans', sans-serif" }}>
            {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <button onClick={() => setAudioEnabled(p => !p)} style={{
            padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600,
            background: audioEnabled ? "#1a1a18" : "transparent",
            color: audioEnabled ? "#faf7f2" : "#8a8578",
            border: "1.5px solid #e8d9c4", cursor: "pointer",
          }}>
            {audioEnabled ? "🔊 On" : "🔇 Off"}
          </button>
        </div>
      </div>

      {/* Match tabs */}
      <div style={{
        display: "flex", gap: 0, padding: "0 24px",
        borderBottom: "1px solid #f0e8dc", background: "#faf7f2",
        overflowX: "auto",
      }}>
        {matches.map(m => (
          <button key={m.id} onClick={() => setActiveId(m.id)} style={{
            padding: "12px 20px", border: "none", background: "none",
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            color: activeId === m.id ? "#1a1a18" : "#8a8578",
            borderBottom: activeId === m.id ? "2px solid #c4956a" : "2px solid transparent",
            whiteSpace: "nowrap", transition: "all 0.2s",
            fontFamily: "'DM Sans', sans-serif",
          }}>{m.title}</button>
        ))}
      </div>

      {/* Match subtitle */}
      <div style={{
        padding: "10px 24px", background: "#f5ede0",
        fontSize: 11, color: "#8a8578", letterSpacing: 1,
        borderBottom: "1px solid #e8d9c4",
      }}>
        {activeMatch.subtitle}
      </div>

      {/* Main grid */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: "280px 260px 1fr",
        overflow: "hidden", minHeight: 0,
      }}>

        {/* Left: Live score */}
        <div style={{ padding: 20, overflowY: "auto", borderRight: "1px solid #f0e8dc" }}>
          <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, marginBottom: 16,
            textTransform: "uppercase" }}>Live Score</div>

          {/* Teams */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {[activeMatch.team1, activeMatch.team2].map((team, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 16px", borderRadius: 12,
                background: i === 0 ? "#fff" : "#f5f0e8",
                border: i === 0 ? "1.5px solid #e8d9c4" : "1px solid #f0e8dc",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{team.flag}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{team.name}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 800, color: i === 0 ? "#4a7c59" : "#6b6560", lineHeight: 1 }}>
                    {team.score}
                  </div>
                  <div style={{ fontSize: 11, color: "#8a8578", marginTop: 6 }}>
                    {typeof team.overs === "string" && team.overs.includes("bat") ? team.overs : `(${team.overs} overs)`}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Status bar */}
          <div style={{
            padding: "12px 16px", borderRadius: 10,
            background: "#f5f0e8", border: "1px solid #e8d9c4",
            fontSize: 12, color: "#3a3a36", fontWeight: 600, marginBottom: 20,
          }}>
            {activeMatch.status}
          </div>

          {/* Run rates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Current RR", val: activeMatch.crr?.toFixed(2), color: "#00e676" },
              { label: "Required RR", val: activeMatch.rrr ? activeMatch.rrr.toFixed(2) : "—",
                color: activeMatch.rrr > 10 ? "#ff4d4f" : activeMatch.rrr ? "#faad14" : "#aaa09a" },
            ].map(item => (
              <div key={item.label} style={{
                padding: "14px 16px", borderRadius: 10,
                background: "#fff", border: "1px solid #e8d9c4", textAlign: "center",
              }}>
                <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, marginBottom: 6,
                  textTransform: "uppercase" }}>{item.label}</div>
                <div style={{ fontSize: 28, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800, color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Ball history */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, marginBottom: 10,
              textTransform: "uppercase" }}>This Over</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {activeMatch.ballHistory.map((b, i) => (
                <BallDot key={i} val={b} fresh={i === 0} />
              ))}
            </div>
          </div>

          {/* Partnership */}
          <div style={{ padding: "12px 16px", borderRadius: 10, background: "#fff",
            border: "1px solid #e8d9c4" }}>
            <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, marginBottom: 6,
              textTransform: "uppercase" }}>Partnership</div>
            <span style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 800, color: "#1a1a18" }}>
              {activeMatch.partnership.runs}
            </span>
            <span style={{ fontSize: 11, color: "#8a8578", marginLeft: 8 }}>
              ({activeMatch.partnership.balls} balls)
            </span>
          </div>
        </div>

        {/* Right 1: Scorecard */}
        <div style={{ padding: 20, overflowY: "auto", borderRight: "1px solid #f0e8dc",
          background: "#faf7f2" }}>
          <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, marginBottom: 16,
            textTransform: "uppercase" }}>Scorecard</div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 1, marginBottom: 8,
              textTransform: "uppercase" }}>Batting</div>
            {[activeMatch.batter1, activeMatch.batter2].map((b, i) => (
              <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #f0e8dc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: i === 0 ? "#1a1a18" : "#6b6560", fontWeight: i === 0 ? 700 : 400 }}>
                    {i === 0 ? "⚡ " : ""}{b.name}
                  </span>
                  <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 900, color: i === 0 ? "#4a7c59" : "#8a8578" }}>{b.runs}</span>
                </div>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#8a8578" }}>
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

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 1, marginBottom: 8,
              textTransform: "uppercase" }}>Bowling</div>
            <div style={{ padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "#1a1a18", fontWeight: 700 }}>
                  {activeMatch.bowler.name}
                </span>
                <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 900, color: "#ff4d4f" }}>{activeMatch.bowler.wkts}/<span style={{color:"#6b6560"}}>{activeMatch.bowler.runs}</span></span>
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#8a8578" }}>
                <span>{activeMatch.bowler.overs} ov</span>
                <span>Econ {activeMatch.bowler.econ}</span>
              </div>
            </div>
          </div>

          <div style={{ padding: "12px", background: "#f5ede0", borderRadius: 10,
            border: "1px solid #f0e8dc", fontSize: 9, color: "#c4b8a8",
            fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.8 }}>
            <div style={{ color: "#4a7c5944", marginBottom: 4 }}>TECH STACK</div>
            FastAPI + Redis pub/sub<br />
            Kokoro-82M TTS (local)<br />
            Mistral / Groq LLM<br />
            React + Vite frontend<br />
            LibreTranslate (18 langs)<br />
            WebSocket streaming
          </div>
        </div>

        {/* Right 2: Commentary feed */}
        <div style={{ padding: 20, overflowY: "auto", background: "#f8f4ef" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "#8a8578", letterSpacing: 2, textTransform: "uppercase" }}>
              AI Commentary
            </div>
            <div style={{ fontSize: 9, color: "#8a8578", fontFamily: "'JetBrains Mono', monospace" }}>
              {LANGS.find(l => l.code === activeLanguage)?.label} · {VOICES.find(v => v.id === activeVoice)?.label}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {commentary.length === 0 && (
              <div style={{ fontSize: 12, color: "#c4b8a8", padding: "20px 0" }}>
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
