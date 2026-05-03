import { useState, useEffect, useRef, useCallback } from "react";
import HomePage from "./HomePage.jsx";
import ScoresPage from "./ScoresPage.jsx";
import VideoCommentaryPage from "./VideoCommentaryPage.jsx";
import CommentaryPanel from "./CommentaryPanel.jsx";

const WS_SCORES = import.meta.env.VITE_WS_SCORES || "ws://localhost:8000/ws/scores";
const WS_AUDIO  = import.meta.env.VITE_WS_AUDIO  || "ws://localhost:8000/tts/ws/audio";
const API_BASE  = import.meta.env.VITE_API_BASE   || "http://localhost:8000";

const MOCK_MATCHES = [
  {
    id: "a1b2", title: "IND vs AUS", subtitle: "2nd Test - Day 3 - MCG, Melbourne",
    team1: { name: "IND", flag: "🇮🇳", score: "342/6", overs: "87.4" },
    team2: { name: "AUS", flag: "🇦🇺", score: "289",   overs: "94.0" },
    status: "India need 47 runs - 3 wkts remaining",
    batter1: { name: "R. Jadeja", runs: 54, balls: 71, sr: 76.1, fours: 5, sixes: 1 },
    batter2: { name: "J. Bumrah", runs: 8,  balls: 14, sr: 57.1, fours: 1, sixes: 0 },
    bowler: { name: "J. Hazlewood", overs: "22.4", wkts: 3, runs: 67, econ: 2.94 },
    ballHistory: ["1","4","0","W","2","1","6","0","1","4"],
    crr: 3.93, rrr: 9.40, target: 389, partnership: { runs: 62, balls: 89 },
  },
  {
    id: "e5f6", title: "ENG vs SA", subtitle: "1st ODI - The Oval, London",
    team1: { name: "ENG", flag: "🏴", score: "187/3", overs: "32.0" },
    team2: { name: "SA",  flag: "🇿🇦", score: "-",   overs: "Yet to bat" },
    status: "England batting - 50-over match",
    batter1: { name: "J. Root",   runs: 78, balls: 91, sr: 85.7,  fours: 8, sixes: 1 },
    batter2: { name: "B. Stokes", runs: 22, balls: 19, sr: 115.8, fours: 3, sixes: 1 },
    bowler: { name: "K. Rabada", overs: "8.0", wkts: 2, runs: 41, econ: 5.13 },
    ballHistory: ["4","6","0","1","1","W","2","4","0","1"],
    crr: 5.84, rrr: null, target: null, partnership: { runs: 100, balls: 112 },
  },
  {
    id: "i9j0", title: "PAK vs NZ", subtitle: "T20I #3 - National Stadium, Karachi",
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
  "6": ["SIX! Kohli picks up the length early and launches it over long-on.",
        "MAXIMUM! Jadeja reads the googly perfectly and hits against the turn."],
  "4": ["FOUR! Beautifully timed through the covers.",
        "FOUR! Back-foot punch through point."],
  "W": ["WICKET! Cummins extracts vicious seam movement from a length.",
        "OUT! Plumb in front! Shaheen has reversed the angle sharply."],
  "0": ["Dot ball. Cummins lands it on the seam, holds its line outside off.",
        "Defended solidly back down the pitch."],
  "1": ["Worked away for a single.",
        "Nudged through square leg. Smart cricket."],
};

const BALL_STYLE = {
  "6":  { bg: "#0a2e18", border: "#00e676", color: "#00e676", label: "SIX"  },
  "4":  { bg: "#eef4f0", border: "#4a7c59", color: "#4a7c59", label: "FOUR" },
  "W":  { bg: "#2e0a0a", border: "#ff4d4f", color: "#ff4d4f", label: "OUT"  },
  "0":  { bg: "#f0e8dc", border: "#8a8578", color: "#aaa09a", label: "DOT"  },
  "Wd": { bg: "#2e2200", border: "#faad14", color: "#faad14", label: "WIDE" },
  "1":  { bg: "#f0e8dc", border: "#8a8578", color: "#6b6560", label: "1"    },
  "2":  { bg: "#f0e8dc", border: "#8a8578", color: "#6b6560", label: "2"    },
};

const LANGS = [
  { code: "en", label: "English" }, { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },   { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" }, { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" }, { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },    { code: "fr", label: "French" },
  { code: "es", label: "Spanish" }, { code: "de", label: "German" },
  { code: "ar", label: "Arabic" },  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" }, { code: "pt", label: "Portuguese" },
  { code: "ru", label: "Russian" }, { code: "sw", label: "Swahili" },
];

const VOICES = [
  { id: "af_heart",   label: "Heart (F)"   },
  { id: "af_bella",   label: "Bella (F)"   },
  { id: "am_adam",    label: "Adam (M)"    },
  { id: "am_michael", label: "Michael (M)" },
  { id: "bf_emma",    label: "Emma (F)"    },
  { id: "bm_george",  label: "George (M)"  },
];

function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function simulateBall(match) {
  const balls = ["0","1","1","1","2","4","4","6","W","Wd"];
  const ball = balls[Math.floor(Math.random() * balls.length)];
  return { ...match, lastBall: ball, ballHistory: [ball, ...match.ballHistory].slice(0, 10) };
}

function useAudioPlayer() {
  const audioCtxRef = useRef(null);
  const playAudio = useCallback(async (b64) => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) { console.warn("Audio error:", e); }
  }, []);
  return { playAudio };
}

function BallDot({ val, fresh }) {
  const s = BALL_STYLE[val] || BALL_STYLE["1"];
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: s.bg, border: `1.5px solid ${s.border}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 10, fontWeight: 800, color: s.color,
      fontFamily: "'DM Mono', monospace",
      boxShadow: fresh ? `0 0 14px ${s.border}88` : "none",
      transition: "box-shadow 0.3s",
    }}>{val}</div>
  );
}

function StatRow({ label, val, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f0e8dc" }}>
      <span style={{ fontSize: 10, color: "#6a6a68", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
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
  }, [isNew, item.text.length]);
  return (
    <div style={{
      display: "flex", gap: 12, alignItems: "flex-start",
      padding: "12px 14px", borderRadius: 10,
      background: isNew ? "#1e2e22" : "#1a1a18",
      border: `1px solid ${isNew ? s.border : "#2a2a28"}`,
      transition: "background 0.5s",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: s.bg, border: `1.5px solid ${s.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: s.color,
        fontFamily: "'DM Mono', monospace",
      }}>{item.ball}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: s.color, letterSpacing: 1, marginBottom: 4 }}>{item.match} · {item.ts}</div>
        <div style={{ fontSize: 12, color: "#4a4a48", lineHeight: 1.6 }}>
          {item.text.slice(0, chars)}
          {chars < item.text.length && <span style={{ opacity: 0.4 }}>|</span>}
        </div>
      </div>
    </div>
  );
}

function YTSearch({ onSelectVideo }) {
  const [query, setQuery] = useState("IPL cricket live");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const doSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search?q=" + encodeURIComponent(query));
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      if ((data.results || []).length === 0) setError("No live streams found");
    } catch(e) {
      setError("Search failed: " + e.message);
      setResults([]);
    }
    setLoading(false);
  };

  useEffect(() => { doSearch(); }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"#fff" }}>
      <div style={{ display:"flex", gap:8, padding:"10px 12px", borderBottom:"1px solid #e8e8e8", background:"#fafafa" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doSearch()}
          placeholder="Search live cricket on YouTube..."
          style={{ flex:1, background:"#f0f0f0", border:"1px solid #e0e0e0", borderRadius:8, padding:"7px 12px", color:"#1a1a18", fontSize:12, fontFamily:"DM Sans,sans-serif", outline:"none" }}
        />
        <button onClick={doSearch} style={{ background:"#ff0000", color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          {loading ? "..." : "Search"}
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto" }}>
          {error && <div style={{ padding:16, fontSize:12, color:"#cc0000", textAlign:"center" }}>⚠️ {error}</div>}
          {loading && <div style={{ padding:30, fontSize:12, color:"#aaa", textAlign:"center" }}>🔴 Finding live streams...</div>}
          {results.map(v => (
            <div key={v.videoId} onClick={() => { if (onSelectVideo) onSelectVideo(v.videoId); }}
              style={{ display:"flex", gap:10, padding:"10px 12px", borderBottom:"1px solid #f0f0f0", cursor:"pointer", alignItems:"center" }}>
              <img src={v.thumbnail} style={{ width:80, height:45, borderRadius:6, objectFit:"cover", flexShrink:0 }} alt="" />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#1a1a18", lineHeight:1.4 }}>{v.title}</div>
                <div style={{ fontSize:10, color:"#c4956a", marginTop:3 }}>{v.channel}</div>
              </div>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#ff4d4f", flexShrink:0 }} />
            </div>
          ))}
        </div>
    </div>
  );
}


function LiveChat() {
  const [messages, setMessages] = useState([
    { id: 1, user: "Rahul_11",  text: "What a delivery by Bumrah!", color: "#00e676" },
    { id: 2, user: "CricFan99", text: "Jadeja holding it together well", color: "#c4956a" },
    { id: 3, user: "MSD_era",   text: "India winning this for sure", color: "#faad14" },
  ]);
  const [input, setInput] = useState("");
  const [username] = useState("Guest" + Math.floor(Math.random() * 9000 + 1000));
  const bottomRef = useRef(null);
  const colors = ["#00e676","#c4956a","#faad14","#ff4d4f","#69b1ff","#b37feb"];
  const myColor = colors[Math.floor(Math.random() * colors.length)];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const newMsg = { id: Date.now(), user: username, text: input.trim(), color: myColor };
    setMessages(prev => [...prev, newMsg].slice(-15));
    setInput("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: "1px solid #e8e8e8" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #e8e8e8", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4f" }} />
        <span style={{ fontSize: 9, color: "#c4956a", letterSpacing: 2, textTransform: "uppercase" }}>Live Chat</span>
        <span style={{ fontSize: 9, color: "#5a5a58", marginLeft: "auto" }}>last 15 only</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.map(m => (
          <div key={m.id} style={{ fontSize: 12, lineHeight: 1.5 }}>
            <span style={{ color: m.color, fontWeight: 700, fontSize: 11 }}>{m.user} </span>
            <span style={{ color: "#4a4a48" }}>{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: "10px 12px", borderTop: "1px solid #e8e8e8", display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Say something..."
          style={{
            flex: 1, background: "#f0f0f0", border: "1px solid #e0e0e0",
            borderRadius: 8, padding: "7px 12px", color: "#1a1a18",
            fontSize: 12, fontFamily: "'DM Sans', sans-serif", outline: "none",
          }}
        />
        <button
          onClick={send}
          style={{
            background: "#c4956a", color: "#fff", border: "none",
            borderRadius: 8, padding: "7px 14px", fontSize: 12,
            fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}
        >Send</button>
      </div>
    </div>
  );
}

async function fetchLiveMatches(apiKey) {
  try {
    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=" + apiKey + "&offset=0");
    const data = await res.json();
    if (data.status !== "success") return null;
    return data.data
      .filter(m => m.matchStarted && !m.matchEnded)
      .map(m => ({
        id: m.id,
        title: m.teams?.join(" vs ") || m.name,
        subtitle: (m.matchType || "").toUpperCase() + " " + (m.venue || ""),
        team1: { name: m.teams?.[0] || "TBA", flag: "🏏", score: m.score?.[0] ? m.score[0].r + "/" + m.score[0].w : "Yet to bat", overs: m.score?.[0]?.o || "0" },
        team2: { name: m.teams?.[1] || "TBA", flag: "🏏", score: m.score?.[1] ? m.score[1].r + "/" + m.score[1].w : "Yet to bat", overs: m.score?.[1]?.o || "0" },
        status: m.status || "Live",
        ballHistory: [], crr: 0, rrr: null, target: null,
        batter1: { name: "-", runs: 0, balls: 0, sr: 0, fours: 0, sixes: 0 },
        batter2: { name: "-", runs: 0, balls: 0, sr: 0, fours: 0, sixes: 0 },
        bowler:  { name: "-", overs: "0", wkts: 0, runs: 0, econ: 0 },
        partnership: { runs: 0, balls: 0 },
      }));
  } catch (e) {
    console.warn("CricAPI fetch failed:", e);
    return null;
  }
}

export default function App() {
  const [screen, setScreen]               = useState("home");
  const [matches, setMatches]             = useState(MOCK_MATCHES);
  const [sharedVideoSrc, setSharedVideoSrc] = useState("");
  const [activeVideoId, setActiveVideoId] = useState("");
  const [activeId, setActiveId]           = useState(MOCK_MATCHES[0].id);
  const [commentary, setCommentary]       = useState([]);
  const [activeLanguage, setActiveLanguage] = useState("en");
  const [activeVoice, setActiveVoice]     = useState("af_heart");
  const [audioEnabled, setAudioEnabled]   = useState(false);
  const [connected, setConnected]         = useState(false);
  const [mockMode, setMockMode]           = useState(true);
  const wsScoreRef  = useRef(null);
  const wsAudioRef  = useRef(null);
  const { playAudio } = useAudioPlayer();

  const activeMatch = matches.find(m => m.id === activeId) || matches[0];

  const handleBallEvent = useCallback(async (ball, matchId) => {
    setMatches(prev => prev.map(m => m.id === matchId ? simulateBall(m) : m));
    const id = Date.now();
    const placeholder = { id, ball, text: "Generating commentary...", match: matchId, ts: new Date().toLocaleTimeString() };
    setCommentary(prev => [placeholder, ...prev].slice(0, 30));
    try {
      const res = await fetch(
        `/api/commentary?ball=${encodeURIComponent(ball)}&match=${encodeURIComponent(matchId)}&language=${encodeURIComponent(activeLanguage)}`
      );
      const data = await res.json();
      const text = data.commentary || randomFrom(COMMENTARY_POOL[ball] || COMMENTARY_POOL["1"]);
      setCommentary(prev => prev.map(c => c.id === id ? { ...c, text } : c));
      if (audioEnabled) {
        fetch(API_BASE + "/commentary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: activeLanguage, voice: activeVoice }),
        })
          .then(r => r.json())
          .then(d => { if (d.audio_b64) playAudio(d.audio_b64); })
          .catch(() => {});
      }
    } catch(e) {
      const text = randomFrom(COMMENTARY_POOL[ball] || COMMENTARY_POOL["1"]);
      setCommentary(prev => prev.map(c => c.id === id ? { ...c, text } : c));
    }
  }, [audioEnabled, activeLanguage, activeVoice, playAudio]);

  useEffect(() => {
    if (screen !== "dashboard" || !mockMode) return;
    const interval = setInterval(() => {
      setMatches(prev => prev.map(m => {
        const updated = simulateBall(m);
        if (m.id === activeId) handleBallEvent(updated.lastBall, m.id);
        return updated;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, [screen, mockMode, activeId, handleBallEvent]);

  useEffect(() => {
    if (screen !== "dashboard" || mockMode) return;
    const ws = new WebSocket(WS_SCORES);
    wsScoreRef.current = ws;
    ws.onopen  = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.matches)    setMatches(data.matches);
        if (data.ball_event) handleBallEvent(data.ball_event.ball, data.ball_event.match);
      } catch {}
    };
    return () => ws.close();
  }, [screen, mockMode, handleBallEvent]);

  useEffect(() => {
    if (!audioEnabled || screen !== "dashboard") return;
    const ws = new WebSocket(WS_AUDIO + "?lang=" + activeLanguage + "&voice=" + activeVoice);
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

  if (screen === "scores")     return <ScoresPage onBack={() => setScreen("home")} />;
  if (screen === "commentary") return <VideoCommentaryPage onBack={() => setScreen("home")} />;
  if (screen === "home")   return <HomePage onEnter={(s) => setScreen(s || "dashboard")} />;

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a28; border-radius: 2px; }
        @keyframes slideIn  { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp   { from { opacity:0; transform:translateY(6px);  } to { opacity:1; transform:translateY(0); } }
        @keyframes livePulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(0.8); } }
        @keyframes chatIn   { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 24px", background: "#ffffff", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => setScreen("home")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6a6a68", fontFamily: "'DM Sans', sans-serif" }}>
            Back
          </button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18" }}>
            Cric<span style={{ color: "#c4956a" }}>Stream</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: connected ? "#0a2e18" : "#1a1a18", border: "1px solid " + (connected ? "#00e676" : "#2a2a28"), padding: "4px 10px", borderRadius: 100, fontSize: 10, color: connected ? "#00e676" : "#8a8578", fontWeight: 600, letterSpacing: 1 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "#00e676" : "#8a8578", animation: connected ? "livePulse 1s infinite" : "none" }} />
            {connected ? "LIVE" : "MOCK"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select value={activeLanguage} onChange={e => setActiveLanguage(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f0f0f0", color: "#1a1a18", fontFamily: "'DM Sans', sans-serif" }}>
            {LANGS.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
          <select value={activeVoice} onChange={e => setActiveVoice(e.target.value)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#f0f0f0", color: "#1a1a18", fontFamily: "'DM Sans', sans-serif" }}>
            {VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
          <button onClick={() => setAudioEnabled(p => !p)} style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: audioEnabled ? "#c4956a" : "transparent", color: audioEnabled ? "#fff" : "#8a8578", border: "1.5px solid #2a2a28", cursor: "pointer" }}>
            {audioEnabled ? "On" : "Off"}
          </button>
        </div>
      </div>

      {/* Match tabs */}
      <div style={{ display: "flex", padding: "0 24px", borderBottom: "1px solid #e8e8e8", background: "#ffffff", overflowX: "auto" }}>
        {matches.map(m => (
          <button key={m.id} onClick={() => setActiveId(m.id)} style={{ padding: "12px 20px", border: "none", background: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: activeId === m.id ? "#faf7f2" : "#8a8578", borderBottom: activeId === m.id ? "2px solid #c4956a" : "2px solid transparent", whiteSpace: "nowrap", transition: "all 0.2s", fontFamily: "'DM Sans', sans-serif" }}>
            {m.title}
          </button>
        ))}
      </div>

      {/* Subtitle */}
      <div style={{ padding: "8px 24px", background: "#f5f5f5", fontSize: 11, color: "#6a6a68", letterSpacing: 1, borderBottom: "1px solid #e8e8e8" }}>
        {activeMatch.subtitle}
      </div>

      {/* Main grid */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 300px", gridTemplateRows: "auto auto 1fr", overflow: "hidden", minHeight: 0 }}>

        {/* Single unified player */}
        <div style={{ gridColumn: "1", gridRow: "1", background: "#000", borderBottom: "1px solid #e8e8e8", height: 270, position: "relative" }}>
          {activeVideoId ? (
            <iframe
              src={"https://www.youtube.com/embed/" + activeVideoId + "?autoplay=1"}
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : sharedVideoSrc ? (
            <video
              id="main-video-player"
              src={sharedVideoSrc}
              style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
              controls
              playsInline
            />
          ) : (
            <YTSearch onSelectVideo={setActiveVideoId} />
          )}
          {(activeVideoId || sharedVideoSrc) && (
            <button
              onClick={() => { setActiveVideoId(""); setSharedVideoSrc(""); }}
              style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.7)", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", zIndex: 10 }}
            >
              ← Search
            </button>
          )}
        </div>

        {/* Ball by Ball */}
        <div style={{ gridColumn: "1", gridRow: "2", padding: "12px 20px", background: "#f0f0f0", borderBottom: "1px solid #e8e8e8" }}>
          <div style={{ fontSize: 9, color: "#c4956a", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Ball by Ball</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {activeMatch.ballHistory.map((b, i) => (
              <BallDot key={i} val={b} fresh={i === 0} />
            ))}
            <div style={{ marginLeft: 12, display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#6a6a68", letterSpacing: 1, textTransform: "uppercase" }}>CRR</div>
                <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: "#00e676" }}>{activeMatch.crr?.toFixed(2)}</div>
              </div>
              {activeMatch.rrr && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, color: "#6a6a68", letterSpacing: 1, textTransform: "uppercase" }}>RRR</div>
                  <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: activeMatch.rrr > 10 ? "#ff4d4f" : "#faad14" }}>{activeMatch.rrr?.toFixed(2)}</div>
                </div>
              )}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9, color: "#6a6a68", letterSpacing: 1, textTransform: "uppercase" }}>Partnership</div>
                <div style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, color: "#c4956a" }}>
                  {activeMatch.partnership.runs}
                  <span style={{ fontSize: 11, color: "#6a6a68" }}> ({activeMatch.partnership.balls}b)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Commentary */}
        <div style={{ gridColumn: "1", gridRow: "3", padding: "20px", overflowY: "auto", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 9, color: "#c4956a", letterSpacing: 2, textTransform: "uppercase" }}>AI Commentary</div>
            <div style={{ fontSize: 9, color: "#6a6a68", fontFamily: "'JetBrains Mono', monospace" }}>
              {LANGS.find(l => l.code === activeLanguage)?.label} - {VOICES.find(v => v.id === activeVoice)?.label}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {commentary.length === 0 && (
              <div style={{ fontSize: 12, color: "#5a5a58", padding: "20px 0", fontStyle: "italic" }}>Waiting for first ball event...</div>
            )}
            {commentary.map((c, i) => (
              <div key={c.id} style={{ animation: i === 0 ? "fadeUp 0.4s ease" : "none" }}>
                <CommentaryBubble item={c} isNew={i === 0} />
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar — AI Commentary Panel */}
        <div style={{ gridColumn: "2", gridRow: "1 / 4", display: "flex", flexDirection: "column", borderLeft: "1px solid #e8e8e8", overflow: "hidden" }}>
          <CommentaryPanel onVideoLoad={setSharedVideoSrc} onYtUrl={setActiveVideoId} activeVideoId={activeVideoId} hasUploadedVideo={!!sharedVideoSrc} />
        </div>

      </div>
    </div>
  );
}
