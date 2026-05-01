import { useState, useRef, useCallback, useEffect } from "react";

const GEMINI_MODEL = "gemini-2.0-flash";
const FRAME_INTERVAL_SEC = 3;

const INDIAN_LANGUAGES = [
  { code: "hi", label: "हिंदी",    name: "Hindi"     },
  { code: "ta", label: "தமிழ்",   name: "Tamil"     },
  { code: "te", label: "తెలుగు",  name: "Telugu"    },
  { code: "bn", label: "বাংলা",   name: "Bengali"   },
  { code: "mr", label: "मराठी",   name: "Marathi"   },
  { code: "gu", label: "ગુજરાતી", name: "Gujarati"  },
  { code: "kn", label: "ಕನ್ನಡ",   name: "Kannada"   },
  { code: "pa", label: "ਪੰਜਾਬੀ",  name: "Punjabi"   },
  { code: "ml", label: "മലയാളം",  name: "Malayalam" },
  { code: "en", label: "English",  name: "English"   },
];

const VOICE_OPTIONS = [
  { id: "male",   label: "Male",   emoji: "🎙️" },
  { id: "female", label: "Female", emoji: "🎤" },
];

const SARVAM_LANG = {
  hi: "hi-IN", ta: "ta-IN", te: "te-IN", bn: "bn-IN",
  mr: "mr-IN", gu: "gu-IN", kn: "kn-IN", pa: "pa-IN",
  ml: "ml-IN", en: "en-IN",
};

const NAV_ITEMS = [
  { id: "dashboard",  icon: "⊞", label: "Dashboard"      },
  { id: "upload",     icon: "↑", label: "Upload Video"    },
  { id: "commentary", icon: "◎", label: "Live Commentary" },
  { id: "insights",   icon: "▦", label: "Match Insights"  },
  { id: "highlights", icon: "★", label: "Highlights"      },
  { id: "settings",   icon: "⚙", label: "Settings"        },
];

function extractFrame(video, canvas) {
  canvas.width  = video.videoWidth  || 640;
  canvas.height = video.videoHeight || 360;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
}

async function getGeminiCommentary(base64Frame, language, geminiKey, previousText = "") {
  const langName = INDIAN_LANGUAGES.find(l => l.code === language)?.name || "Hindi";
  const systemPrompt = `You are an electrifying cricket commentator.
Given a video frame from a cricket match, generate 2-3 sentences of exciting live commentary in ${langName}.
${language !== "en" ? `Write ONLY in ${langName} script. Use cricket-specific terminology naturally.` : ""}
Keep it energetic, dramatic and authentic like a real broadcast commentator.
Focus on: what the batsman is doing, field placement, bowler action, crowd reaction, or match situation visible.
Do NOT mention that you are analyzing a frame or image. Speak as if you are watching live.
${previousText ? `Previous commentary: "${previousText.slice(-200)}" — continue naturally.` : ""}
Respond with ONLY the commentary text, nothing else.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: systemPrompt },
          { inline_data: { mime_type: "image/jpeg", data: base64Frame } },
        ]}],
        generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "Gemini API error");
  }
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function getSarvamAudio(text, language, voiceGender, sarvamKey) {
  const langCode = SARVAM_LANG[language] || "hi-IN";
  const speaker  = voiceGender === "female" ? "anushka" : "amol";
  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": sarvamKey },
    body: JSON.stringify({
      inputs: [text], target_language_code: langCode, speaker,
      pitch: 0, pace: 1.1, loudness: 1.5, speech_sample_rate: 22050,
      enable_preprocessing: true, model: "bulbul:v2",
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Sarvam error");
  }
  const data = await response.json();
  return data.audios?.[0];
}

function useAudioQueue() {
  const ctxRef     = useRef(null);
  const queueRef   = useRef([]);
  const playingRef = useRef(false);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;
    const b64 = queueRef.current.shift();
    try {
      const ctx = ctxRef.current || new AudioContext();
      ctxRef.current = ctx;
      const binary = atob(b64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buffer = await ctx.decodeAudioData(bytes.buffer);
      const src    = ctx.createBufferSource();
      src.buffer   = buffer;
      src.connect(ctx.destination);
      src.onended  = () => { playingRef.current = false; playNext(); };
      src.start(0);
    } catch (e) { playingRef.current = false; playNext(); }
  }, []);

  const enqueue = useCallback((b64) => {
    queueRef.current.push(b64); playNext();
  }, [playNext]);

  return { enqueue };
}

function FloatingBalls() {
  const balls = [
    { left: "8%",  top: "18%", delay: "0s",    dur: "6s",  size: 22 },
    { left: "88%", top: "12%", delay: "1.5s",  dur: "8s",  size: 16 },
    { left: "75%", top: "65%", delay: "0.8s",  dur: "7s",  size: 20 },
    { left: "15%", top: "72%", delay: "2.2s",  dur: "9s",  size: 14 },
    { left: "50%", top: "8%",  delay: "3s",    dur: "6.5s",size: 18 },
    { left: "92%", top: "45%", delay: "1s",    dur: "10s", size: 12 },
  ];
  return (
    <>
      {balls.map((b, i) => (
        <div key={i} style={{
          position: "absolute", left: b.left, top: b.top,
          width: b.size, height: b.size, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, #ef4444, #991b1b)",
          boxShadow: "inset -2px -2px 4px rgba(0,0,0,0.3), 0 2px 8px rgba(239,68,68,0.3)",
          animation: `floatBall ${b.dur} ${b.delay} ease-in-out infinite`,
          opacity: 0.18,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", top: "20%", left: "15%",
            width: "70%", height: "2px",
            borderTop: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "50%",
          }} />
        </div>
      ))}
    </>
  );
}

function StadiumSVG() {
  return (
    <svg viewBox="0 0 900 160" style={{ position: "absolute", bottom: 0, left: 0, width: "100%", opacity: 0.06, pointerEvents: "none" }} preserveAspectRatio="none">
      <ellipse cx="450" cy="200" rx="420" ry="130" fill="#16a34a" />
      <ellipse cx="450" cy="200" rx="300" ry="90"  fill="#15803d" />
      <ellipse cx="450" cy="200" rx="180" ry="55"  fill="#166534" />
      <rect x="430" y="80" width="40" height="120" fill="#d4a574" opacity="0.5" />
      <rect x="438" y="70" width="8"  height="20"  fill="#8B4513" opacity="0.6" />
      <rect x="454" y="70" width="8"  height="20"  fill="#8B4513" opacity="0.6" />
      {[100,180,260,340,560,640,720,800].map((x,i) => (
        <g key={i}>
          <rect x={x} y="20" width="4" height="60" fill="#374151" opacity="0.4" />
          <rect x={x-8} y="15" width="20" height="8" fill="#f59e0b" opacity="0.5" />
        </g>
      ))}
      {Array.from({length: 40}).map((_,i) => (
        <rect key={i} x={20 + i*22} y={5 + Math.sin(i*0.7)*8} width="18" height="12" rx="2"
          fill={["#ef4444","#3b82f6","#f59e0b","#22c55e","#a855f7"][i%5]} opacity="0.3" />
      ))}
    </svg>
  );
}

function BatSVG({ style }) {
  return (
    <svg viewBox="0 0 60 200" style={style} fill="none">
      <rect x="22" y="0" width="16" height="120" rx="8" fill="#d4a574" />
      <rect x="20" y="100" width="20" height="80" rx="6" fill="#8B6914" />
      <rect x="23" y="105" width="4" height="70" rx="2" fill="#a07820" opacity="0.5" />
      <rect x="20" y="100" width="20" height="12" rx="3" fill="#654c0f" />
    </svg>
  );
}

function CommentaryBubble({ item, isLatest }) {
  const [displayed, setDisplayed] = useState(isLatest ? "" : item.text);

  useEffect(() => {
    if (!isLatest) return;
    let i = 0; setDisplayed("");
    const t = setInterval(() => {
      i += 3;
      setDisplayed(item.text.slice(0, i));
      if (i >= item.text.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [isLatest, item.text]);

  const detected = item.text.match(/\b(SIX|FOUR|WICKET)\b/i);
  const typeKey  = detected ? detected[1].toUpperCase() : null;
  const typeStyle = {
    SIX:    { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
    FOUR:   { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
    WICKET: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  }[typeKey] || { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" };

  return (
    <div style={{
      padding: "12px 14px", borderRadius: 12,
      background: isLatest ? typeStyle.bg : "#f8fafc",
      border: `1px solid ${isLatest ? typeStyle.border : "#e2e8f0"}`,
      borderLeft: `4px solid ${isLatest ? typeStyle.color : "#cbd5e1"}`,
      animation: isLatest ? "bubbleIn 0.35s ease" : "none",
      boxShadow: isLatest ? "0 2px 12px rgba(0,0,0,0.06)" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: isLatest ? typeStyle.color : "#cbd5e1" }} />
        <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: 0.5 }}>
          {item.timestamp} · {item.lang}
        </span>
        {typeKey && (
          <span style={{
            marginLeft: 4, fontSize: 9, fontWeight: 800,
            color: typeStyle.color, background: "#fff",
            border: `1px solid ${typeStyle.border}`,
            padding: "1px 7px", borderRadius: 10,
          }}>{typeKey}</span>
        )}
        {item.tts && <span style={{ marginLeft: "auto", fontSize: 10, color: "#16a34a" }}>🔊</span>}
      </div>
      <p style={{
        fontSize: 13, lineHeight: 1.65, margin: 0,
        color: isLatest ? "#1e293b" : "#64748b",
        fontFamily: "'Noto Sans', 'Inter', sans-serif",
        fontWeight: isLatest ? 500 : 400,
      }}>
        {displayed}
        {isLatest && displayed.length < item.text.length && (
          <span style={{ opacity: 0.35 }}>▍</span>
        )}
      </p>
    </div>
  );
}

function SettingsModal({ geminiKey, setGeminiKey, sarvamKey, setSarvamKey, onClose }) {
  const [g, setG] = useState(geminiKey);
  const [s, setS] = useState(sarvamKey);
  const inp = {
    width: "100%", background: "#f8fafc", border: "1px solid #e2e8f0",
    borderRadius: 8, padding: "10px 12px", color: "#1e293b",
    fontSize: 13, outline: "none", fontFamily: "monospace",
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 22 }}>🔑</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>API Keys</div>
          </div>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
        </div>
        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>GEMINI API KEY</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Free → <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>aistudio.google.com</a></div>
          <input type="password" value={g} onChange={e => setG(e.target.value)} placeholder="AIza..." style={inp} />
        </label>
        <label style={{ display: "block", marginBottom: 22 }}>
          <div style={{ fontSize: 11, color: "#f97316", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>SARVAM API KEY (TTS)</div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>Free credits → <a href="https://console.sarvam.ai" target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>console.sarvam.ai</a></div>
          <input type="password" value={s} onChange={e => setS(e.target.value)} placeholder="your-sarvam-key" style={inp} />
        </label>
        <button onClick={() => {
          setGeminiKey(g); localStorage.setItem("vc_gemini_key", g);
          setSarvamKey(s); localStorage.setItem("vc_sarvam_key", s);
          onClose();
        }} style={{ width: "100%", background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
          Save Keys
        </button>
      </div>
    </div>
  );
}

export default function VideoCommentaryPage({ onBack }) {
  const [geminiKey,    setGeminiKey]    = useState(() => localStorage.getItem("vc_gemini_key") || "");
  const [sarvamKey,    setSarvamKey]    = useState(() => localStorage.getItem("vc_sarvam_key") || "");
  const [language,     setLanguage]     = useState("hi");
  const [voiceGender,  setVoiceGender]  = useState("male");
  const [ttsEnabled,   setTtsEnabled]   = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [videoReady,   setVideoReady]   = useState(false);
  const [isRunning,    setIsRunning]    = useState(false);
  const [status,       setStatus]       = useState("idle");
  const [commentary,   setCommentary]   = useState([]);
  const [frameCount,   setFrameCount]   = useState(0);
  const [errorMsg,     setErrorMsg]     = useState("");
  const [activeNav,    setActiveNav]    = useState("dashboard");
  const [activeTab,    setActiveTab]    = useState("commentary");
  const [videoName,    setVideoName]    = useState("");
  const [aiProgress,   setAiProgress]   = useState(0);
  const [showSix,      setShowSix]      = useState(false);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const timerRef  = useRef(null);
  const latestRef = useRef("");
  const { enqueue } = useAudioQueue();

  useEffect(() => {
    if (!videoReady) return;
    setAiProgress(0);
    const iv = setInterval(() => {
      setAiProgress(p => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return p + (isRunning ? 2 : 0.4);
      });
    }, 200);
    return () => clearInterval(iv);
  }, [videoReady, isRunning]);

  const handleVideoLoad = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setVideoName(file.name);
    const vid = videoRef.current;
    vid.src = URL.createObjectURL(file); vid.load();
    vid.onloadedmetadata = () => setVideoReady(true);
    setCommentary([]); setFrameCount(0); setIsRunning(false);
    setStatus("idle"); setErrorMsg(""); latestRef.current = "";
  };

  const processFrame = useCallback(async () => {
    const vid = videoRef.current; const cnv = canvasRef.current;
    if (!vid || !cnv || vid.paused || vid.ended) return;
    setStatus("processing");
    try {
      const frame = extractFrame(vid, cnv); setFrameCount(n => n + 1);
      const text  = await getGeminiCommentary(frame, language, geminiKey, latestRef.current);
      if (!text) return;
      latestRef.current = text;
      if (/\bSIX\b/i.test(text)) { setShowSix(true); setTimeout(() => setShowSix(false), 2500); }
      const langLabel = INDIAN_LANGUAGES.find(l => l.code === language)?.name || language;
      let hasTts = false;
      if (ttsEnabled && sarvamKey) {
        try {
          const audio = await getSarvamAudio(text, language, voiceGender, sarvamKey);
          if (audio) { enqueue(audio); hasTts = true; }
        } catch (e) { console.warn("TTS:", e.message); }
      }
      setCommentary(prev => [{
        id: Date.now(), text, lang: langLabel, tts: hasTts,
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      }, ...prev].slice(0, 50));
      setStatus("idle");
    } catch (err) { setStatus("error"); setErrorMsg(err.message); }
  }, [geminiKey, sarvamKey, language, voiceGender, ttsEnabled, enqueue]);

  const startCommentary = useCallback(() => {
    if (!geminiKey) { setShowSettings(true); return; }
    videoRef.current?.play(); setIsRunning(true); setStatus("idle");
    processFrame();
    timerRef.current = setInterval(processFrame, FRAME_INTERVAL_SEC * 1000);
  }, [geminiKey, processFrame]);

  const stopCommentary = useCallback(() => {
    clearInterval(timerRef.current); videoRef.current?.pause();
    setIsRunning(false); setStatus("idle");
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const statusColor = { idle: "#16a34a", processing: "#f97316", error: "#dc2626" }[status];
  const statusText  = { idle: "Ready", processing: "Generating...", error: "Error" }[status];

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f0fdf4", fontFamily: "'Inter','Segoe UI',sans-serif", color: "#1e293b", overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        @keyframes floatBall {
          0%,100% { transform: translateY(0px) rotate(0deg); }
          33%      { transform: translateY(-18px) rotate(120deg); }
          66%      { transform: translateY(-8px) rotate(240deg); }
        }
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes sixBanner {
          0%   { opacity: 0; transform: scale(0.5) rotate(-8deg); }
          20%  { opacity: 1; transform: scale(1.15) rotate(3deg); }
          80%  { opacity: 1; transform: scale(1.05) rotate(-1deg); }
          100% { opacity: 0; transform: scale(0.9) rotate(0deg); }
        }
        @keyframes grassWave {
          0%,100% { transform: scaleY(1); }
          50%     { transform: scaleY(1.08); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .nav-btn:hover { background: #f0fdf4 !important; color: #16a34a !important; }
        .lang-chip:hover { border-color: #f97316 !important; color: #f97316 !important; background: #fff7ed !important; }
        .upload-zone:hover { border-color: #f97316 !important; background: #fff7ed !important; }
        .start-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(249,115,22,0.4) !important; }
        .stop-btn:hover  { transform: translateY(-1px); }
      `}</style>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* SIX! celebration overlay */}
      {showSix && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ animation: "sixBanner 2.5s ease forwards", textAlign: "center" }}>
            <div style={{ fontSize: 72, lineHeight: 1 }}>🏏</div>
            <div style={{ fontSize: 64, fontWeight: 900, color: "#f97316", textShadow: "0 4px 20px rgba(249,115,22,0.6)", letterSpacing: 4, fontFamily: "Inter" }}>SIX!</div>
            <div style={{ fontSize: 20, color: "#ea580c", fontWeight: 700 }}>What a shot! 🎉</div>
          </div>
        </div>
      )}

      {showSettings && (
        <SettingsModal geminiKey={geminiKey} setGeminiKey={setGeminiKey} sarvamKey={sarvamKey} setSarvamKey={setSarvamKey} onClose={() => setShowSettings(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <div style={{ width: 210, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", flexShrink: 0, boxShadow: "2px 0 12px rgba(0,0,0,0.04)", position: "relative", overflow: "hidden" }}>

        {/* Grass decoration at bottom of sidebar */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: "linear-gradient(180deg, transparent, #dcfce7)", pointerEvents: "none", animation: "grassWave 4s ease-in-out infinite" }} />

        {/* Logo */}
        <div style={{ padding: "16px 16px 14px", borderBottom: "1px solid #f1f5f9" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, boxShadow: "0 2px 8px rgba(249,115,22,0.3)" }}>
              🏏
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1e293b", letterSpacing: 0.5 }}>CricCast</div>
              <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1 }}>AI COMMENTARY</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_ITEMS.map(item => (
            <button key={item.id} className="nav-btn" onClick={() => {
              setActiveNav(item.id);
              if (item.id === "settings") setShowSettings(true);
            }} style={{
              width: "100%", padding: "9px 12px", borderRadius: 8, border: "none",
              background: activeNav === item.id ? "#f0fdf4" : "transparent",
              color: activeNav === item.id ? "#16a34a" : "#64748b",
              cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 9, marginBottom: 2,
              transition: "all 0.15s", borderLeft: activeNav === item.id ? "3px solid #16a34a" : "3px solid transparent",
              animation: "slideIn 0.3s ease",
            }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        {/* Upload box */}
        <div style={{ padding: "10px 12px 20px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>UPLOAD VIDEO</div>
          <label className="upload-zone" style={{
            display: "block", border: "1.5px dashed #d1fae5", borderRadius: 10,
            padding: "12px 8px", textAlign: "center", cursor: "pointer",
            background: "#f0fdf4", transition: "all 0.2s", position: "relative",
          }}>
            <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            <div style={{ fontSize: 22, marginBottom: 4 }}>📹</div>
            <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, lineHeight: 1.5 }}>
              {videoName ? videoName.slice(0, 20) + (videoName.length > 20 ? "…" : "") : "Drag & Drop\nVideo Here"}
            </div>
            <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "5px 10px", borderRadius: 6, fontSize: 10, fontWeight: 700, display: "inline-block", boxShadow: "0 2px 6px rgba(249,115,22,0.3)" }}>
              Browse Files
            </div>
            <div style={{ fontSize: 7.5, color: "#94a3b8", marginTop: 6 }}>MP4, MOV, AVI · Any size</div>
          </label>

          {videoReady && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: "#64748b" }}>{isRunning ? "Analyzing frames..." : "Video loaded ✓"}</span>
                <span style={{ fontSize: 9, color: "#f97316", fontWeight: 700 }}>{aiProgress.toFixed(0)}%</span>
              </div>
              <div style={{ background: "#e2e8f0", borderRadius: 4, height: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${aiProgress}%`, background: "linear-gradient(90deg,#16a34a,#22c55e)", borderRadius: 4, transition: "width 0.4s ease" }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#64748b", fontWeight: 600 }}>← Back</button>
            )}
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              {videoName ? `📹 ${videoName.slice(0, 35)}` : "AI Commentary Dashboard"}
            </div>
            {isRunning && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#fef2f2", border: "1px solid #fecaca", padding: "3px 10px", borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>LIVE</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: statusColor, fontWeight: 600 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor, animation: status === "processing" ? "pulse 0.8s infinite" : "none" }} />
              {statusText}
            </div>
            <button onClick={() => setShowSettings(true)} style={{
              background: geminiKey ? "#f0fdf4" : "#fff7ed",
              border: `1px solid ${geminiKey ? "#bbf7d0" : "#fed7aa"}`,
              borderRadius: 8, padding: "6px 12px", cursor: "pointer",
              fontSize: 11, color: geminiKey ? "#16a34a" : "#f97316", fontWeight: 700,
            }}>
              {geminiKey ? "✓ Keys Set" : "⚙ Add API Keys"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Center ── */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Hero upload / video card */}
            <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", position: "relative", flexShrink: 0 }}>
              {!videoReady ? (
                /* Upload hero with cricket atmosphere */
                <label className="upload-zone" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  minHeight: 240, cursor: "pointer", position: "relative", overflow: "hidden",
                  background: "linear-gradient(160deg, #f0fdf4 0%, #dcfce7 50%, #fef9c3 100%)",
                  transition: "all 0.2s",
                }}>
                  <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  <FloatingBalls />

                  {/* Stadium bg */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(180deg, transparent, #dcfce7)", pointerEvents: "none" }} />

                  {/* Bat decoration */}
                  <BatSVG style={{ position: "absolute", right: 40, bottom: 0, height: 130, opacity: 0.15, transform: "rotate(15deg)" }} />
                  <BatSVG style={{ position: "absolute", left: 40, bottom: 0, height: 110, opacity: 0.12, transform: "rotate(-20deg) scaleX(-1)" }} />

                  {/* Cricket field circle */}
                  <div style={{ position: "absolute", bottom: -60, left: "50%", transform: "translateX(-50%)", width: 280, height: 120, borderRadius: "50%", border: "2px solid rgba(22,163,74,0.15)", background: "rgba(22,163,74,0.04)" }} />
                  <div style={{ position: "absolute", bottom: -40, left: "50%", transform: "translateX(-50%)", width: 160, height: 80, borderRadius: "50%", border: "1.5px solid rgba(22,163,74,0.2)", background: "rgba(22,163,74,0.06)" }} />

                  <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                    <div style={{ fontSize: 52, marginBottom: 8, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.1))" }}>🏏</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Upload Cricket Video</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>
                      MP4, MOV, WebM — any length<br />
                      AI analyzes frames every {FRAME_INTERVAL_SEC}s and generates live commentary
                    </div>
                    <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}>
                      📁 Choose Video File
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: "#94a3b8" }}>or drag and drop anywhere</div>
                  </div>
                </label>
              ) : (
                <div style={{ position: "relative" }}>
                  {isRunning && (
                    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, background: "#ef4444", padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1, display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }} /> LIVE
                    </div>
                  )}
                  {status === "processing" && (
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, background: "rgba(255,255,255,0.95)", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#f97316", fontWeight: 600, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
                      <div style={{ width: 12, height: 12, border: "2px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Generating...
                    </div>
                  )}
                  <video ref={videoRef} style={{ width: "100%", maxHeight: 260, display: "block", objectFit: "contain", background: "#000" }} controls={!isRunning} playsInline />
                </div>
              )}
            </div>

            {/* Language */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>🌐</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: 1.5 }}>COMMENTARY LANGUAGE</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {INDIAN_LANGUAGES.map(l => (
                  <div key={l.code} className="lang-chip" onClick={() => setLanguage(l.code)} style={{
                    padding: "5px 12px", borderRadius: 20,
                    border: `1.5px solid ${language === l.code ? "#f97316" : "#e2e8f0"}`,
                    background: language === l.code ? "#fff7ed" : "#f8fafc",
                    color: language === l.code ? "#f97316" : "#475569",
                    fontSize: 13, fontWeight: language === l.code ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                    boxShadow: language === l.code ? "0 2px 6px rgba(249,115,22,0.2)" : "none",
                  }}>{l.label}</div>
                ))}
              </div>
            </div>

            {/* Voice + TTS + Action */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>VOICE</div>
                  <div style={{ display: "flex", gap: 7 }}>
                    {VOICE_OPTIONS.map(v => (
                      <button key={v.id} onClick={() => setVoiceGender(v.id)} style={{
                        padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                        border: `1.5px solid ${voiceGender === v.id ? "#f97316" : "#e2e8f0"}`,
                        background: voiceGender === v.id ? "#fff7ed" : "#f8fafc",
                        color: voiceGender === v.id ? "#f97316" : "#64748b",
                        fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                      }}>{v.emoji} {v.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>TTS AUDIO</div>
                  <button onClick={() => setTtsEnabled(p => !p)} style={{
                    padding: "6px 16px", borderRadius: 20, cursor: "pointer",
                    border: `1.5px solid ${ttsEnabled ? "#16a34a" : "#e2e8f0"}`,
                    background: ttsEnabled ? "#f0fdf4" : "#f8fafc",
                    color: ttsEnabled ? "#16a34a" : "#64748b",
                    fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                  }}>{ttsEnabled ? "🔊 On" : "🔇 Off"}</button>
                </div>

                {videoReady && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 10, padding: "8px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                      <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ display: "none" }} />
                      🎥 Change
                    </label>
                    {!isRunning ? (
                      <button className="start-btn" onClick={startCommentary} style={{
                        background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
                        border: "none", borderRadius: 10, padding: "9px 20px",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(249,115,22,0.35)", transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: 7,
                      }}>▶ Start AI Commentary</button>
                    ) : (
                      <button className="stop-btn" onClick={stopCommentary} style={{
                        background: "#fef2f2", color: "#dc2626",
                        border: "1.5px solid #fecaca", borderRadius: 10, padding: "9px 20px",
                        fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                      }}>⏹ Stop</button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {status === "error" && errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#dc2626", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                ⚠ {errorMsg}
                <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>→ Fix Keys</button>
              </div>
            )}

            {/* Stats */}
            {commentary.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
                {[
                  { icon: "🎞", label: "Frames", val: frameCount, color: "#f97316" },
                  { icon: "🎙", label: "Commentary", val: commentary.length, color: "#16a34a" },
                  { icon: "🔊", label: "TTS Clips", val: commentary.filter(c => c.tts).length, color: "#3b82f6" },
                  { icon: "🌐", label: "Language", val: INDIAN_LANGUAGES.find(l => l.code === language)?.name, color: "#a855f7" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 90, background: "#fff", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.5 }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom cricket pitch decoration */}
            <div style={{ flexShrink: 0, borderRadius: 12, overflow: "hidden", background: "linear-gradient(180deg,#16a34a,#15803d)", height: 60, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <StadiumSVG />
              <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", width: 80, height: 40, background: "#d4a574", borderRadius: 4, opacity: 0.7 }} />
              {[0,1].map(i => (
                <div key={i} style={{ position: "absolute", [i===0?"left":"right"]: "50%", marginLeft: i===0?-40:0, marginRight: i===1?-40:0, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 12 }}>
                  {[0,1].map(j => (
                    <div key={j} style={{ width: 4, height: 32, background: "#8B4513", borderRadius: 2 }} />
                  ))}
                </div>
              ))}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, fontWeight: 700, position: "relative", zIndex: 1 }}>🏏 CRICKET PITCH</div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div style={{ width: 310, borderLeft: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "-2px 0 8px rgba(0,0,0,0.03)" }}>

            {/* Header */}
            <div style={{ borderBottom: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 0" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isRunning ? "#16a34a" : "#cbd5e1", animation: isRunning ? "pulse 1.2s infinite" : "none", marginRight: 7 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", letterSpacing: 1.5 }}>LIVE COMMENTARY FEED</span>
                {commentary.length > 0 && (
                  <button onClick={() => setCommentary([])} style={{ marginLeft: "auto", background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Clear</button>
                )}
              </div>
              <div style={{ display: "flex", padding: "4px 8px 0" }}>
                {[["commentary", "🎙 Commentary"], ["stats", "📊 Stats"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "7px 10px", background: "none", border: "none",
                    borderBottom: activeTab === tab ? "2px solid #f97316" : "2px solid transparent",
                    color: activeTab === tab ? "#f97316" : "#94a3b8",
                    cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, transition: "all 0.15s",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Commentary tab */}
            {activeTab === "commentary" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {commentary.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    {/* Empty state cricket illustration */}
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🏏</div>
                    <div style={{ width: 80, height: 40, background: "linear-gradient(180deg,#16a34a,#15803d)", borderRadius: 40, margin: "0 auto 12px", position: "relative" }}>
                      <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: -8, width: 24, height: 20, background: "#d4a574", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.8 }}>
                      Upload a cricket video<br />and hit <strong style={{ color: "#f97316" }}>Start AI Commentary</strong><br />to see the live feed here
                    </div>
                    <div style={{ marginTop: 14, display: "flex", justifyContent: "center", gap: 6 }}>
                      {["🇮🇳","🏏","🎙","🔊"].map((e,i) => (
                        <div key={i} style={{ fontSize: 20, animation: `floatBall ${3+i}s ${i*0.5}s ease-in-out infinite`, opacity: 0.5 }}>{e}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  commentary.map((item, i) => (
                    <CommentaryBubble key={item.id} item={item} isLatest={i === 0} />
                  ))
                )}
              </div>
            )}

            {/* Stats tab */}
            {activeTab === "stats" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Frames Analyzed",    val: frameCount,                                          color: "#f97316", icon: "🎞" },
                  { label: "Commentary Lines",    val: commentary.length,                                   color: "#16a34a", icon: "🎙" },
                  { label: "TTS Clips",           val: commentary.filter(c => c.tts).length,               color: "#3b82f6", icon: "🔊" },
                  { label: "Language",            val: INDIAN_LANGUAGES.find(l => l.code === language)?.name, color: "#a855f7", icon: "🌐" },
                  { label: "Frame Interval",      val: `${FRAME_INTERVAL_SEC}s`,                            color: "#f97316", icon: "⏱" },
                  { label: "AI Model",            val: "Gemini 2.0 Flash",                                  color: "#64748b", icon: "🤖" },
                  { label: "TTS Engine",          val: "Sarvam Bulbul v2",                                  color: "#64748b", icon: "🔈" },
                  { label: "TTS Status",          val: ttsEnabled && sarvamKey ? "Active" : "Off",          color: ttsEnabled && sarvamKey ? "#16a34a" : "#ef4444", icon: "📡" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 12px", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{s.icon}</span>
                    <span style={{ fontSize: 11, color: "#64748b", flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                ))}

                {commentary.length > 0 && (() => {
                  const sixes   = commentary.filter(c => /\bSIX\b/i.test(c.text)).length;
                  const fours   = commentary.filter(c => /\bFOUR\b/i.test(c.text)).length;
                  const wickets = commentary.filter(c => /\bWICKET\b/i.test(c.text)).length;
                  return (
                    <div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px", border: "1px solid #f1f5f9", marginTop: 4 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>AI DETECTED EVENTS</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[["6s 🏏", sixes, "#f97316", "#fff7ed", "#fed7aa"], ["4s ⚡", fours, "#1d4ed8", "#eff6ff", "#bfdbfe"], ["W 🎯", wickets, "#dc2626", "#fef2f2", "#fecaca"]].map(([label, count, color, bg, border]) => (
                          <div key={label} style={{ textAlign: "center", background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "8px 4px" }}>
                            <div style={{ fontSize: 20, fontWeight: 800, color }}>{count}</div>
                            <div style={{ fontSize: 9, color: "#64748b", fontWeight: 600 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: "8px 14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", background: "#fafafa" }}>
              <span style={{ fontSize: 9, color: "#cbd5e1" }}>Gemini 2.0 Flash · Sarvam Bulbul v2</span>
              <span style={{ fontSize: 9, color: "#cbd5e1" }}>Frame every {FRAME_INTERVAL_SEC}s</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
