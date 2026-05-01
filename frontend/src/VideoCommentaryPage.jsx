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
  { id: "dashboard",   icon: "⊞", label: "Dashboard"       },
  { id: "upload",      icon: "↑", label: "Upload Video"     },
  { id: "commentary",  icon: "◎", label: "Live Commentary"  },
  { id: "insights",    icon: "▦", label: "Match Insights"   },
  { id: "highlights",  icon: "★", label: "Highlights"       },
  { id: "settings",    icon: "⚙", label: "Settings"         },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Audio Queue Hook ─────────────────────────────────────────────────────────
function useAudioQueue() {
  const ctxRef     = useRef(null);
  const queueRef   = useRef([]);
  const playingRef = useRef(false);

  const playNext = useCallback(async () => {
    if (playingRef.current || queueRef.current.length === 0) return;
    playingRef.current = true;
    const b64 = queueRef.current.shift();
    try {
      const ctx    = ctxRef.current || new AudioContext();
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

// ─── Commentary Bubble ────────────────────────────────────────────────────────
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

  const typeMap = {
    SIX:    { color: "#f97316", bg: "#f9731615" },
    FOUR:   { color: "#3b82f6", bg: "#3b82f615" },
    WICKET: { color: "#ef4444", bg: "#ef444415" },
    DOT:    { color: "#94a3b8", bg: "#94a3b815" },
    DEFAULT:{ color: "#22c55e", bg: "#22c55e15" },
  };
  const detected = item.text.match(/\b(SIX|FOUR|WICKET)\b/i);
  const typeKey  = detected ? detected[1].toUpperCase() : "DEFAULT";
  const style    = typeMap[typeKey] || typeMap.DEFAULT;

  return (
    <div style={{
      padding: "10px 12px", borderRadius: 8,
      background: isLatest ? "#0d1f35" : "#0a1628",
      border: `1px solid ${isLatest ? "#1e3a5f" : "#1e293b"}`,
      borderLeft: `3px solid ${isLatest ? style.color : "#1e293b"}`,
      animation: isLatest ? "bubbleIn 0.3s ease" : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLatest ? style.color : "#334155" }} />
        <span style={{ fontSize: 9, color: "#475569", letterSpacing: 0.5 }}>
          {item.timestamp} · {item.lang}
        </span>
        {detected && (
          <span style={{
            marginLeft: 4, fontSize: 9, fontWeight: 800,
            color: style.color, background: style.bg,
            padding: "1px 6px", borderRadius: 3,
          }}>{typeKey}</span>
        )}
        {item.tts && <span style={{ marginLeft: "auto", fontSize: 9, color: "#22c55e" }}>🔊</span>}
      </div>
      <p style={{
        fontSize: 12, lineHeight: 1.6, margin: 0,
        color: isLatest ? "#e2e8f0" : "#64748b",
        fontFamily: "'Noto Sans', 'DM Sans', sans-serif",
      }}>
        {displayed}
        {isLatest && displayed.length < item.text.length && (
          <span style={{ opacity: 0.4 }}>▍</span>
        )}
      </p>
    </div>
  );
}

// ─── Settings Modal ───────────────────────────────────────────────────────────
function SettingsModal({ geminiKey, setGeminiKey, sarvamKey, setSarvamKey, onClose }) {
  const [g, setG] = useState(geminiKey);
  const [s, setS] = useState(sarvamKey);

  const inputStyle = {
    width: "100%", background: "#060d1a", border: "1px solid #1e293b",
    borderRadius: 6, padding: "9px 12px", color: "#e2e8f0",
    fontSize: 12, fontFamily: "monospace", outline: "none",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: "#0a1628", borderRadius: 12,
        border: "1px solid #1e293b", padding: 24,
        width: "100%", maxWidth: 440,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#f97316", letterSpacing: 1 }}>API KEYS</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <label style={{ display: "block", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 1.5, marginBottom: 4 }}>GEMINI API KEY</div>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>
            Free → <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>aistudio.google.com</a>
          </div>
          <input type="password" value={g} onChange={e => setG(e.target.value)} placeholder="AIza..." style={inputStyle} />
        </label>

        <label style={{ display: "block", marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: "#f97316", letterSpacing: 1.5, marginBottom: 4 }}>SARVAM API KEY (TTS)</div>
          <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>
            Free credits → <a href="https://console.sarvam.ai" target="_blank" rel="noreferrer" style={{ color: "#3b82f6" }}>console.sarvam.ai</a>
          </div>
          <input type="password" value={s} onChange={e => setS(e.target.value)} placeholder="your-sarvam-key" style={inputStyle} />
        </label>

        <button onClick={() => {
          setGeminiKey(g); localStorage.setItem("vc_gemini_key", g);
          setSarvamKey(s); localStorage.setItem("vc_sarvam_key", s);
          onClose();
        }} style={{
          width: "100%", background: "linear-gradient(135deg, #f97316, #ea580c)",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "11px", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}>Save Keys</button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
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
  const [aiProgress,   setAiProgress]   = useState(0);
  const [videoName,    setVideoName]    = useState("");

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const timerRef  = useRef(null);
  const latestRef = useRef("");
  const { enqueue } = useAudioQueue();

  // Simulate AI processing progress when video is loaded
  useEffect(() => {
    if (!videoReady) return;
    setAiProgress(0);
    const iv = setInterval(() => {
      setAiProgress(p => {
        if (p >= 100) { clearInterval(iv); return 100; }
        return p + (isRunning ? 2 : 0.5);
      });
    }, 300);
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
    setAiProgress(0);
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

  const statusColor = { idle: "#22c55e", processing: "#f97316", error: "#ef4444" }[status];
  const statusText  = { idle: "Ready", processing: "Generating...", error: "Error" }[status];

  // ── Layout ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: "#060d1a", fontFamily: "'Rajdhani','Segoe UI',sans-serif", color: "#e2e8f0", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Noto+Sans:wght@400;600&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#0a1628} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:2px}
        @keyframes bubbleIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes liveDot{0%,100%{transform:scale(1)}50%{transform:scale(1.5)}}
        .nav-btn:hover{background:rgba(249,115,22,0.08)!important;color:#94a3b8!important}
        .lang-chip:hover{border-color:#f97316!important;color:#f97316!important}
        .upload-zone:hover{border-color:#f97316!important;background:rgba(249,115,22,0.04)!important}
      `}</style>

      <canvas ref={canvasRef} style={{ display: "none" }} />
      {showSettings && (
        <SettingsModal
          geminiKey={geminiKey} setGeminiKey={setGeminiKey}
          sarvamKey={sarvamKey} setSarvamKey={setSarvamKey}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <div style={{ width: 200, background: "#0a1628", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid #1e293b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", borderRadius: 5, padding: "3px 7px", fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>AI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#f97316", letterSpacing: 2 }}>CRICKET</div>
              <div style={{ fontSize: 8, color: "#475569", letterSpacing: 1 }}>COMMENTARY GENERATOR</div>
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
              width: "100%", padding: "8px 10px", borderRadius: 6, border: "none",
              background: activeNav === item.id ? "rgba(249,115,22,0.1)" : "transparent",
              color: activeNav === item.id ? "#f97316" : "#475569",
              borderLeft: activeNav === item.id ? "2px solid #f97316" : "2px solid transparent",
              cursor: "pointer", textAlign: "left", fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 8, marginBottom: 2, transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 13 }}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        {/* Upload box in sidebar */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid #1e293b" }}>
          <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>UPLOAD VIDEO</div>
          <label className="upload-zone" style={{
            display: "block", border: "1px dashed #1e293b", borderRadius: 8,
            padding: "10px 8px", textAlign: "center", cursor: "pointer",
            background: "#060d1a", transition: "all 0.2s", position: "relative",
          }}>
            <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
            <div style={{ fontSize: 16, marginBottom: 3 }}>☁</div>
            <div style={{ fontSize: 9, color: "#475569", marginBottom: 6 }}>
              {videoName ? videoName.slice(0, 18) + (videoName.length > 18 ? "…" : "") : "Drag & Drop Video Here"}
            </div>
            <div style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff", padding: "4px 8px", borderRadius: 4, fontSize: 9, fontWeight: 700, display: "inline-block" }}>
              Browse Files
            </div>
            <div style={{ fontSize: 7, color: "#334155", marginTop: 4 }}>MP4, MOV, AVI · Any size</div>
          </label>

          {/* AI Processing */}
          {videoReady && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>AI PROCESSING</div>
              <div style={{ fontSize: 9, color: "#64748b", marginBottom: 3 }}>
                {isRunning ? "Analyzing frames..." : "Video loaded"}
              </div>
              <div style={{ background: "#1e293b", borderRadius: 3, height: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${aiProgress}%`, background: "linear-gradient(90deg,#f97316,#fb923c)", borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
              <div style={{ fontSize: 8, color: "#f97316", textAlign: "right", marginTop: 2 }}>{aiProgress.toFixed(0)}%</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Top bar */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid #1e293b", background: "#0a1628", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontSize: 12 }}>← Back</button>
            )}
            <div style={{ fontSize: 12, color: "#64748b" }}>
              {videoName ? `AI Understanding: ${videoName.slice(0, 30)}` : "AI Commentary Dashboard"}
            </div>
            {videoReady && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#0d1f35", padding: "2px 8px", borderRadius: 20 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#f97316", animation: "pulse 1s infinite" }} />
                <div style={{ fontSize: 10, color: "#f97316", fontWeight: 700 }}>{aiProgress.toFixed(0)}%</div>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: statusColor }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, animation: status === "processing" ? "pulse 1s infinite" : "none" }} />
              {statusText}
            </div>
            <button onClick={() => setShowSettings(true)} style={{
              background: geminiKey ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.1)",
              border: `1px solid ${geminiKey ? "#166534" : "#7c2d12"}`,
              borderRadius: 6, padding: "5px 10px", cursor: "pointer",
              fontSize: 10, color: geminiKey ? "#22c55e" : "#f97316", fontWeight: 600,
            }}>
              {geminiKey ? "⚙ Keys Set" : "⚙ Add API Keys"}
            </button>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#f97316,#ea580c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>S</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* ── Center Column ── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, padding: 12, overflowY: "auto" }}>

            {/* Video Player */}
            <div style={{ background: "#000", borderRadius: 10, overflow: "hidden", border: "1px solid #1e293b", position: "relative", flexShrink: 0 }}>
              {!videoReady ? (
                <label className="upload-zone" style={{
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  minHeight: 220, cursor: "pointer", background: "#060d1a", position: "relative", transition: "all 0.2s",
                }}>
                  <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🎥</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#f97316", marginBottom: 6 }}>Upload Cricket Video</div>
                  <div style={{ fontSize: 11, color: "#334155", textAlign: "center", lineHeight: 1.6 }}>
                    MP4, MOV, WebM — any length<br />Frames sent to Gemini AI every {FRAME_INTERVAL_SEC}s
                  </div>
                </label>
              ) : (
                <>
                  {isRunning && (
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, background: "rgba(0,0,0,0.8)", borderRadius: 6, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "#f97316" }}>
                      <div style={{ width: 10, height: 10, border: "2px solid #f97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Generating...
                    </div>
                  )}
                  {isRunning && (
                    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, background: "#ef4444", padding: "2px 7px", borderRadius: 4, fontSize: 9, fontWeight: 800, letterSpacing: 1, display: "flex", alignItems: "center", gap: 3 }}>
                      <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", animation: "liveDot 1s infinite" }} /> LIVE
                    </div>
                  )}
                  <video ref={videoRef} style={{ width: "100%", maxHeight: 240, display: "block", objectFit: "contain" }} controls={!isRunning} playsInline />
                </>
              )}
            </div>

            {/* Language selector */}
            <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e293b", flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>COMMENTARY LANGUAGE</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {INDIAN_LANGUAGES.map(l => (
                  <div key={l.code} className="lang-chip" onClick={() => setLanguage(l.code)} style={{
                    padding: "4px 10px", borderRadius: 16,
                    border: `1px solid ${language === l.code ? "#f97316" : "#1e293b"}`,
                    background: language === l.code ? "rgba(249,115,22,0.15)" : "transparent",
                    color: language === l.code ? "#f97316" : "#475569",
                    fontSize: 12, fontWeight: language === l.code ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>{l.label}</div>
                ))}
              </div>
            </div>

            {/* Voice + TTS + Controls */}
            <div style={{ background: "#0a1628", borderRadius: 8, padding: "10px 12px", border: "1px solid #1e293b", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>VOICE</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {VOICE_OPTIONS.map(v => (
                      <button key={v.id} onClick={() => setVoiceGender(v.id)} style={{
                        padding: "5px 12px", borderRadius: 16, cursor: "pointer",
                        border: `1px solid ${voiceGender === v.id ? "#f97316" : "#1e293b"}`,
                        background: voiceGender === v.id ? "rgba(249,115,22,0.15)" : "transparent",
                        color: voiceGender === v.id ? "#f97316" : "#475569", fontSize: 12,
                      }}>{v.emoji} {v.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>TTS AUDIO</div>
                  <button onClick={() => setTtsEnabled(p => !p)} style={{
                    padding: "5px 14px", borderRadius: 16, cursor: "pointer",
                    border: `1px solid ${ttsEnabled ? "#f97316" : "#1e293b"}`,
                    background: ttsEnabled ? "rgba(249,115,22,0.15)" : "transparent",
                    color: ttsEnabled ? "#f97316" : "#475569", fontSize: 12,
                  }}>{ttsEnabled ? "🔊 On" : "🔇 Off"}</button>
                </div>

                {/* Main action button */}
                {videoReady && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    {!isRunning ? (
                      <button onClick={startCommentary} style={{
                        background: "linear-gradient(135deg,#f97316,#ea580c)", color: "#fff",
                        border: "none", borderRadius: 8, padding: "8px 18px",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}>▶ Start AI Commentary</button>
                    ) : (
                      <button onClick={stopCommentary} style={{
                        background: "rgba(239,68,68,0.1)", color: "#ef4444",
                        border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 18px",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}>⏹ Stop</button>
                    )}
                    <label style={{
                      background: "transparent", color: "#475569", border: "1px solid #1e293b",
                      borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ display: "none" }} />
                      🎥 Change
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Error */}
            {status === "error" && errorMsg && (
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid #7f1d1d", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#ef4444", flexShrink: 0 }}>
                ⚠ {errorMsg}
                <button onClick={() => setShowSettings(true)} style={{ marginLeft: 8, background: "none", border: "none", color: "#f97316", cursor: "pointer", fontSize: 11 }}>→ Fix Keys</button>
              </div>
            )}

            {/* Stats bar */}
            {commentary.length > 0 && (
              <div style={{ display: "flex", gap: 16, padding: "8px 14px", background: "#0a1628", borderRadius: 8, border: "1px solid #1e293b", flexWrap: "wrap", flexShrink: 0 }}>
                {[
                  { label: "FRAMES",     val: frameCount },
                  { label: "COMMENTARY", val: commentary.length },
                  { label: "LANGUAGE",   val: INDIAN_LANGUAGES.find(l => l.code === language)?.name },
                  { label: "TTS",        val: ttsEnabled && sarvamKey ? "Active" : "Off" },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 8, color: "#334155", letterSpacing: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 700, color: "#f97316" }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Right Panel: Live Commentary Feed ── */}
          <div style={{ width: 320, borderLeft: "1px solid #1e293b", background: "#0a1628", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Feed header with tabs */}
            <div style={{ borderBottom: "1px solid #1e293b" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "8px 12px 0" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: isRunning ? "#22c55e" : "#334155", animation: isRunning ? "liveDot 1.2s infinite" : "none", marginRight: 6 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#f97316", letterSpacing: 1.5 }}>LIVE COMMENTARY FEED</span>
                {commentary.length > 0 && (
                  <button onClick={() => setCommentary([])} style={{ marginLeft: "auto", background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 10 }}>Clear</button>
                )}
              </div>
              <div style={{ display: "flex", padding: "0 4px" }}>
                {[["commentary", "🎙 Commentary"], ["stats", "📊 Stats"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{
                    padding: "6px 10px", background: "none", border: "none",
                    borderBottom: activeTab === tab ? "2px solid #f97316" : "2px solid transparent",
                    color: activeTab === tab ? "#f97316" : "#475569",
                    cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Feed body */}
            {activeTab === "commentary" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {commentary.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "50px 16px", color: "#1e293b" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🏏</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
                      Upload a cricket video<br />and hit <strong style={{ color: "#f97316" }}>Start AI Commentary</strong><br />to see live feed here
                    </div>
                  </div>
                ) : (
                  commentary.map((item, i) => (
                    <CommentaryBubble key={item.id} item={item} isLatest={i === 0} />
                  ))
                )}
              </div>
            )}

            {activeTab === "stats" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  { label: "Total Frames Analyzed", val: frameCount, color: "#f97316" },
                  { label: "Commentary Generated",  val: commentary.length, color: "#3b82f6" },
                  { label: "TTS Clips Played",      val: commentary.filter(c => c.tts).length, color: "#22c55e" },
                  { label: "Current Language",      val: INDIAN_LANGUAGES.find(l => l.code === language)?.name, color: "#a855f7" },
                  { label: "Frame Interval",        val: `${FRAME_INTERVAL_SEC}s`, color: "#f97316" },
                  { label: "AI Model",              val: GEMINI_MODEL, color: "#64748b" },
                  { label: "TTS Status",            val: ttsEnabled && sarvamKey ? "Active" : "Off", color: ttsEnabled && sarvamKey ? "#22c55e" : "#ef4444" },
                ].map(s => (
                  <div key={s.label} style={{ background: "#060d1a", borderRadius: 6, padding: "8px 10px", border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#475569" }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: "monospace" }}>{s.val}</span>
                  </div>
                ))}

                {/* Sixes/Fours/Wickets detected from commentary text */}
                {commentary.length > 0 && (() => {
                  const sixes   = commentary.filter(c => /\bSIX\b/i.test(c.text)).length;
                  const fours   = commentary.filter(c => /\bFOUR\b/i.test(c.text)).length;
                  const wickets = commentary.filter(c => /\bWICKET\b/i.test(c.text)).length;
                  return (
                    <div style={{ background: "#060d1a", borderRadius: 6, padding: "10px", border: "1px solid #1e293b" }}>
                      <div style={{ fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>AI DETECTED EVENTS</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                        {[["6s", sixes, "#f97316"], ["4s", fours, "#3b82f6"], ["W", wickets, "#ef4444"]].map(([label, count, color]) => (
                          <div key={label} style={{ textAlign: "center", background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 6, padding: "6px" }}>
                            <div style={{ fontSize: 18, fontWeight: 800, color }}>{count}</div>
                            <div style={{ fontSize: 9, color: "#475569" }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Footer */}
            <div style={{ padding: "6px 12px", borderTop: "1px solid #1e293b", display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 8, color: "#1e293b" }}>Gemini 2.0 Flash · Sarvam Bulbul v2</div>
              <div style={{ fontSize: 8, color: "#1e293b" }}>Frame every {FRAME_INTERVAL_SEC}s</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
