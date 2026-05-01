import { useState, useRef, useCallback, useEffect } from "react";

const GEMINI_MODEL = "gemini-2.5-flash";
const FRAME_INTERVAL_SEC = 10;

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

const SARVAM_LANG = {
  hi: "hi-IN", ta: "ta-IN", te: "te-IN", bn: "bn-IN",
  mr: "mr-IN", gu: "gu-IN", kn: "kn-IN", pa: "pa-IN",
  ml: "ml-IN", en: "en-IN",
};

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard"      },
  { id: "upload",     label: "Upload Video"    },
  { id: "commentary", label: "Live Commentary" },
  { id: "insights",   label: "Match Insights"  },
  { id: "highlights", label: "Highlights"      },
  { id: "settings",   label: "Settings"        },
];

function IcoDashboard({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
}
function IcoUpload({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}
function IcoMic({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
}
function IcoChart({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
function IcoStar({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IcoSettings({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
function IcoVolume({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
}
function IcoMute({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
}
function IcoPlay({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
function IcoStop({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
}
function IcoBack({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
}
function IcoClose({ s = 14, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function IcoKey({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
}
function IcoVideo({ s = 16, c = "currentColor" }) {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
}

const NAV_ICONS = {
  dashboard:  IcoDashboard,
  upload:     IcoUpload,
  commentary: IcoMic,
  insights:   IcoChart,
  highlights: IcoStar,
  settings:   IcoSettings,
};

function BallSVG({ size = 52, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={style}>
      <defs>
        <radialGradient id="bg1" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#E53E3E"/>
          <stop offset="55%" stopColor="#C53030"/>
          <stop offset="100%" stopColor="#63171B"/>
        </radialGradient>
        <radialGradient id="bs1" cx="28%" cy="22%" r="45%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#bg1)"/>
      <circle cx="50" cy="50" r="46" fill="url(#bs1)"/>
      <path d="M50 6 C37 24 37 76 50 94" stroke="white" strokeWidth="2" fill="none" opacity="0.5"/>
      <path d="M50 6 C63 24 63 76 50 94" stroke="white" strokeWidth="2" fill="none" opacity="0.5"/>
      <line x1="35" y1="20" x2="30" y2="23" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="20" x2="70" y2="23" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="35" y1="32" x2="30" y2="35" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="32" x2="70" y2="35" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="35" y1="44" x2="30" y2="47" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="44" x2="70" y2="47" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="35" y1="56" x2="30" y2="59" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="56" x2="70" y2="59" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="35" y1="68" x2="30" y2="71" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="68" x2="70" y2="71" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="35" y1="80" x2="30" y2="83" stroke="white" strokeWidth="1.4" opacity="0.38"/>
      <line x1="65" y1="80" x2="70" y2="83" stroke="white" strokeWidth="1.4" opacity="0.38"/>
    </svg>
  );
}

function BatSVG({ width = 44, height = 150, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 44 150" fill="none" style={style}>
      <defs>
        <linearGradient id="blade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#B8924A"/>
          <stop offset="40%" stopColor="#DDB96A"/>
          <stop offset="100%" stopColor="#9A7030"/>
        </linearGradient>
        <linearGradient id="handle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A2E10"/>
          <stop offset="50%" stopColor="#6B4418"/>
          <stop offset="100%" stopColor="#3A2008"/>
        </linearGradient>
      </defs>
      <rect x="6" y="0" width="32" height="102" rx="5" fill="url(#blade)"/>
      <line x1="12" y1="6" x2="12" y2="96" stroke="#A07838" strokeWidth="0.7" opacity="0.55"/>
      <line x1="18" y1="6" x2="18" y2="96" stroke="#C8A050" strokeWidth="0.5" opacity="0.4"/>
      <line x1="26" y1="6" x2="26" y2="96" stroke="#A07838" strokeWidth="0.7" opacity="0.55"/>
      <line x1="32" y1="6" x2="32" y2="96" stroke="#C8A050" strokeWidth="0.5" opacity="0.4"/>
      <rect x="8" y="99" width="28" height="8" rx="2" fill="#7A5228"/>
      <rect x="10" y="105" width="24" height="40" rx="3" fill="url(#handle)"/>
      <rect x="10" y="110" width="24" height="3" rx="1" fill="rgba(255,255,255,0.07)"/>
      <rect x="10" y="118" width="24" height="3" rx="1" fill="rgba(255,255,255,0.07)"/>
      <rect x="10" y="126" width="24" height="3" rx="1" fill="rgba(255,255,255,0.07)"/>
      <rect x="10" y="134" width="24" height="3" rx="1" fill="rgba(255,255,255,0.07)"/>
      <rect x="12" y="143" width="20" height="5" rx="2" fill="#2A1608"/>
    </svg>
  );
}

function WicketSVG({ width = 56, height = 90, style }) {
  return (
    <svg width={width} height={height} viewBox="0 0 56 90" fill="none" style={style}>
      <defs>
        <linearGradient id="stump" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#D4A843"/>
          <stop offset="100%" stopColor="#A07828"/>
        </linearGradient>
      </defs>
      <rect x="6"  y="14" width="8" height="72" rx="2" fill="url(#stump)"/>
      <rect x="24" y="14" width="8" height="72" rx="2" fill="url(#stump)"/>
      <rect x="42" y="14" width="8" height="72" rx="2" fill="url(#stump)"/>
      <rect x="4"  y="6" width="18" height="10" rx="4" fill="#B8860B"/>
      <rect x="5"  y="4" width="16" height="6"  rx="3" fill="#DAA520"/>
      <rect x="26" y="6" width="18" height="10" rx="4" fill="#B8860B"/>
      <rect x="27" y="4" width="16" height="6"  rx="3" fill="#DAA520"/>
    </svg>
  );
}

function PitchSVG({ style }) {
  return (
    <svg viewBox="0 0 520 90" fill="none" style={style} preserveAspectRatio="xMidYMid meet">
      <rect width="520" height="90" rx="8" fill="#2D6A1F"/>
      <rect x="40"  y="0" width="440" height="90" fill="#3A8228"/>
      <rect x="100" y="0" width="320" height="90" fill="#347524"/>
      <rect x="100" y="0" width="4"   height="90" fill="rgba(255,255,255,0.35)"/>
      <rect x="416" y="0" width="4"   height="90" fill="rgba(255,255,255,0.35)"/>
      <line x1="260" y1="0" x2="260" y2="90" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeDasharray="6 5"/>
      <rect x="40"  y="38" width="28" height="14" rx="2" fill="#C8962A" opacity="0.6"/>
      <rect x="452" y="38" width="28" height="14" rx="2" fill="#C8962A" opacity="0.6"/>
      <rect x="220" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
      <rect x="232" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
      <rect x="244" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
      <rect x="276" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
      <rect x="288" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
      <rect x="300" y="36" width="4" height="18" rx="1" fill="#8B6010" opacity="0.5"/>
    </svg>
  );
}

async function extractAudioChunk(videoEl, durationSec = 8) {
  return new Promise((resolve, reject) => {
    const stream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream();
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length) return reject(new Error("No audio track"));
    const audioStream = new MediaStream(audioTracks);
    const recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const ab = await blob.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(ab)));
      resolve(b64);
    };
    recorder.start();
    setTimeout(() => recorder.stop(), durationSec * 1000);
  });
}

async function getGeminiCommentary(base64Frame, language, geminiKey, previousText = "") {
  const langName = INDIAN_LANGUAGES.find(l => l.code === language)?.name || "Hindi";
  const prompt = `You are an electrifying cricket commentator.
Given a video frame from a cricket match, generate 2-3 sentences of exciting live commentary in ${langName}.
${language !== "en" ? `Write ONLY in ${langName} script. Use cricket-specific terminology naturally.` : ""}
Keep it energetic, dramatic and authentic like a real broadcast commentator.
Focus on: what the batsman is doing, field placement, bowler action, crowd reaction, or match situation visible.
Do NOT mention that you are analyzing a frame or image. Speak as if watching live. Never refuse or apologize. Always generate commentary regardless of image quality.
${previousText ? `Previous commentary: "${previousText.slice(-200)}" — continue naturally.` : ""}
Respond with ONLY the commentary text, nothing else.`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64Frame } }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 200 },
      }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Gemini error"); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function getSarvamAudio(text, language, voiceGender, sarvamKey) {
  const langCode = SARVAM_LANG[language] || "hi-IN";
  const speaker  = voiceGender === "female" ? "anushka" : "amol";
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": sarvamKey },
    body: JSON.stringify({ inputs: [text], target_language_code: langCode, speaker, pitch: 0, pace: 1.1, loudness: 1.5, speech_sample_rate: 22050, enable_preprocessing: true, model: "bulbul:v2" }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Sarvam error"); }
  const data = await res.json();
  return data.audios?.[0];
}

function useAudioQueue() {
  const ctxRef = useRef(null), qRef = useRef([]), playingRef = useRef(false);
  const playNext = useCallback(async () => {
    if (playingRef.current || !qRef.current.length) return;
    playingRef.current = true;
    const b64 = qRef.current.shift();
    try {
      const ctx = ctxRef.current || new AudioContext();
      ctxRef.current = ctx;
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const buf = await ctx.decodeAudioData(bytes.buffer);
      const src = ctx.createBufferSource();
      src.buffer = buf; src.connect(ctx.destination);
      src.onended = () => { playingRef.current = false; playNext(); };
      src.start(0);
    } catch { playingRef.current = false; playNext(); }
  }, []);
  const enqueue = useCallback(b64 => { qRef.current.push(b64); playNext(); }, [playNext]);
  return { enqueue };
}

function CommentaryBubble({ item, isLatest }) {
  const [shown, setShown] = useState(isLatest ? "" : item.text);
  useEffect(() => {
    if (!isLatest) return;
    let i = 0; setShown("");
    const t = setInterval(() => { i += 3; setShown(item.text.slice(0, i)); if (i >= item.text.length) clearInterval(t); }, 18);
    return () => clearInterval(t);
  }, [isLatest, item.text]);
  const match = item.text.match(/\b(SIX|FOUR|WICKET)\b/i);
  const key   = match ? match[1].toUpperCase() : null;
  const st = {
    SIX:    { accent: "#C05621", bg: "#1A110A", border: "#7B341E", badge: "#DD6B20" },
    FOUR:   { accent: "#2B6CB0", bg: "#0A0F1A", border: "#2C5282", badge: "#3182CE" },
    WICKET: { accent: "#C53030", bg: "#1A0A0A", border: "#9B2C2C", badge: "#E53E3E" },
  }[key] || { accent: "#276749", bg: "#0A1410", border: "#276749", badge: "#38A169" };
  return (
    <div style={{ padding: "12px 14px", borderRadius: 8, background: isLatest ? st.bg : "#0E1412", border: `1px solid ${isLatest ? st.border : "#1A2420"}`, borderLeft: `3px solid ${isLatest ? st.accent : "#1E2E28"}`, animation: isLatest ? "bubbleIn 0.3s ease" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isLatest ? st.accent : "#2D3D38", flexShrink: 0 }}/>
        <span style={{ fontSize: 10, color: "#4A6B60", letterSpacing: 0.6, fontWeight: 500 }}>{item.timestamp} · {item.lang}</span>
        {key && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 800, color: "#fff", background: st.badge, padding: "1px 7px", borderRadius: 4, letterSpacing: 0.8 }}>{key}</span>}
        {item.tts && <span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}><IcoVolume s={11} c="#276749"/></span>}
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.7, margin: 0, color: isLatest ? "#D4E8E0" : "#4A6B60", fontFamily: "'Noto Sans', sans-serif", fontWeight: isLatest ? 500 : 400 }}>
        {shown}{isLatest && shown.length < item.text.length && <span style={{ opacity: 0.3 }}>▍</span>}
      </p>
    </div>
  );
}

function SettingsModal({ geminiKey, setGeminiKey, sarvamKey, setSarvamKey, onClose }) {
  const [g, setG] = useState(geminiKey);
  const [s, setS] = useState(sarvamKey);
  const inp = { width: "100%", background: "#0C1410", border: "1px solid #1E3028", borderRadius: 6, padding: "10px 12px", color: "#D4E8E0", fontSize: 13, outline: "none", fontFamily: "monospace", letterSpacing: 0.3 };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0D1A14", borderRadius: 12, border: "1px solid #1E3028", padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1A2E24", border: "1px solid #2A4034", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <IcoKey s={15} c="#38A169"/>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#E8F5F0", letterSpacing: 0.3 }}>API Keys</span>
          </div>
          <button onClick={onClose} style={{ background: "#1A2420", border: "1px solid #2A3830", borderRadius: 6, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IcoClose s={13} c="#6B9080"/>
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: "#4CAF7D", fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>GEMINI API KEY</div>
          <div style={{ fontSize: 11, color: "#4A6B60", marginBottom: 8 }}>Free at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: "#38A169" }}>aistudio.google.com</a></div>
          <input type="password" value={g} onChange={e => setG(e.target.value)} placeholder="AIza..." style={inp}/>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "#4CAF7D", fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>SARVAM API KEY (TTS)</div>
          <div style={{ fontSize: 11, color: "#4A6B60", marginBottom: 8 }}>Free credits at <a href="https://console.sarvam.ai" target="_blank" rel="noreferrer" style={{ color: "#38A169" }}>console.sarvam.ai</a></div>
          <input type="password" value={s} onChange={e => setS(e.target.value)} placeholder="your-sarvam-key" style={inp}/>
        </div>
        <button onClick={() => { setGeminiKey(g); localStorage.setItem("vc_gemini_key", g); setSarvamKey(s); localStorage.setItem("vc_sarvam_key", s); onClose(); }} style={{ width: "100%", background: "linear-gradient(135deg, #276749, #38A169)", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", letterSpacing: 0.5 }}>
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
  const [showSix,      setShowSix]      = useState(false);
  const [progress,     setProgress]     = useState(0);

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const timerRef     = useRef(null);
  const latestRef    = useRef("");
  const isRunningRef = useRef(false);
  const { enqueue }  = useAudioQueue();

  // Progress driven by real video currentTime/duration
  useEffect(() => {
    if (!videoReady) return;
    const vid = videoRef.current;
    if (!vid) return;
    const onTimeUpdate = () => {
      if (vid.duration && vid.duration > 0)
        setProgress((vid.currentTime / vid.duration) * 100);
    };
    vid.addEventListener("timeupdate", onTimeUpdate);
    return () => vid.removeEventListener("timeupdate", onTimeUpdate);
  }, [videoReady]);

  const handleVideoLoad = e => {
    const file = e.target.files?.[0]; if (!file) return;
    setVideoName(file.name);
    const vid = videoRef.current;
    if (!vid) return;
    clearInterval(timerRef.current);
    isRunningRef.current = false;
    setIsRunning(false);
    vid.src = URL.createObjectURL(file);
    vid.load();
    vid.oncanplaythrough = () => { setVideoReady(true); setProgress(0); vid.play(); };
    setCommentary([]); setFrameCount(0);
    setStatus("idle"); setErrorMsg(""); latestRef.current = "";
  };

  const processFrame = useCallback(async () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.ended) {
      clearInterval(timerRef.current);
      isRunningRef.current = false;
      setIsRunning(false); setStatus("idle");
      return;
    }
    setStatus("processing");
    try {
      const audio = await extractAudioChunk(vid, FRAME_INTERVAL_SEC);
      setFrameCount(n => n + 1);
      const text = await getGeminiCommentary(audio, language, geminiKey, latestRef.current);
      if (!text) { setStatus("idle"); return; }
      latestRef.current = text;
      if (/\bSIX\b/i.test(text)) { setShowSix(true); setTimeout(() => setShowSix(false), 2800); }
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
        timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      }, ...prev].slice(0, 50));
      setStatus("idle");
    } catch (err) { setStatus("error"); setErrorMsg(err.message); }
  }, [geminiKey, sarvamKey, language, voiceGender, ttsEnabled, enqueue]);

  // FIX: await play() before first frame so vid.paused is never true on first call
  const startCommentary = useCallback(async () => {
    if (!geminiKey) { setShowSettings(true); return; }
    const vid = videoRef.current; if (!vid) return;
    setErrorMsg(""); setIsRunning(true); isRunningRef.current = true; setStatus("idle");
    try {
      await vid.play();
    } catch (err) {
      setErrorMsg("Playback failed: " + err.message);
      setIsRunning(false); isRunningRef.current = false; return;
    }
    processFrame();
    timerRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      processFrame();
    }, FRAME_INTERVAL_SEC * 1000);
  }, [geminiKey, processFrame]);

  const stopCommentary = useCallback(() => {
    clearInterval(timerRef.current);
    isRunningRef.current = false;
    videoRef.current?.pause();
    setIsRunning(false); setStatus("idle");
  }, []);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const statusDot = { idle: "#38A169", processing: "#D69E2E", error: "#E53E3E" }[status];
  const statusTxt = { idle: "Ready", processing: "Generating", error: "Error" }[status];
  const T = {
    bg: "#080F0C", sidebar: "#060D0A", panel: "#0A1410", card: "#0D1A14",
    border: "#152018", border2: "#1E2E28", accent: "#38A169", accentDim: "#276749",
    gold: "#D69E2E", text: "#C8E0D8", textMid: "#6B9080", textDim: "#3A5048", red: "#E53E3E",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, fontFamily: "'Inter','Segoe UI',sans-serif", color: T.text, overflow: "hidden", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E3028; border-radius: 4px; }
        @keyframes bubbleIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:0.35;} }
        @keyframes sixAnim  { 0%{opacity:0;transform:scale(0.4) rotate(-12deg);} 20%{opacity:1;transform:scale(1.12) rotate(4deg);} 75%{opacity:1;transform:scale(1.05) rotate(-2deg);} 100%{opacity:0;transform:scale(0.85);} }
        .nav-item:hover  { background: rgba(56,161,105,0.06) !important; color: #38A169 !important; }
        .lang-btn:hover  { border-color: #276749 !important; color: #68D391 !important; background: rgba(56,161,105,0.06) !important; }
        .upload-z:hover  { border-color: #276749 !important; background: rgba(56,161,105,0.04) !important; }
        .act-btn:hover   { filter: brightness(1.12); transform: translateY(-1px); }
        .stop-btn:hover  { background: rgba(229,62,62,0.12) !important; }
      `}</style>

      {/* Always-mounted hidden video — FIX for videoRef being null */}
      <canvas ref={canvasRef} style={{ display: "none" }}/>
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        onEnded={() => {
          clearInterval(timerRef.current);
          isRunningRef.current = false;
          setIsRunning(false); setStatus("idle");
        }}
      />

      {showSix && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ animation: "sixAnim 2.8s ease forwards", textAlign: "center" }}>
            <BallSVG size={64} style={{ margin: "0 auto 12px" }}/>
            <div style={{ fontSize: 72, fontWeight: 900, color: "#D69E2E", textShadow: "0 0 40px rgba(214,158,46,0.7)", letterSpacing: 6, lineHeight: 1 }}>SIX!</div>
            <div style={{ fontSize: 18, color: "#F6E05E", fontWeight: 600, marginTop: 8, letterSpacing: 2 }}>MAXIMUM</div>
          </div>
        </div>
      )}

      {showSettings && <SettingsModal geminiKey={geminiKey} setGeminiKey={setGeminiKey} sarvamKey={sarvamKey} setSarvamKey={setSarvamKey} onClose={() => setShowSettings(false)}/>}

      <aside style={{ width: 208, background: T.sidebar, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <BallSVG size={34}/>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 0.4, color: "#E8F5F0" }}>Cric<span style={{ color: T.gold }}>Cast</span></div>
              <div style={{ fontSize: 9, color: T.textDim, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 600 }}>AI Commentary</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "10px 8px" }}>
          {NAV_ITEMS.map(item => {
            const Icon = NAV_ICONS[item.id];
            const active = activeNav === item.id;
            return (
              <button key={item.id} className="nav-item" onClick={() => { setActiveNav(item.id); if (item.id === "settings") setShowSettings(true); }} style={{ width: "100%", padding: "9px 12px", borderRadius: 7, border: "none", background: active ? "rgba(56,161,105,0.1)" : "transparent", color: active ? T.accent : T.textMid, cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: active ? 600 : 500, display: "flex", alignItems: "center", gap: 10, marginBottom: 1, transition: "all 0.15s", borderLeft: `2px solid ${active ? T.accent : "transparent"}` }}>
                <Icon s={15} c={active ? T.accent : T.textMid}/>{item.label}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: "12px", borderTop: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8 }}>Quick Upload</div>
          <label className="upload-z" style={{ display: "block", border: `1px dashed ${T.border2}`, borderRadius: 8, padding: "14px 8px", textAlign: "center", cursor: "pointer", background: T.panel, transition: "all 0.2s", position: "relative" }}>
            <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}/>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}><IcoVideo s={22} c={T.textMid}/></div>
            <div style={{ fontSize: 10, color: T.textMid, lineHeight: 1.5, marginBottom: 10 }}>{videoName ? videoName.slice(0, 22) + (videoName.length > 22 ? "…" : "") : "Drag & drop video"}</div>
            <div style={{ background: T.accentDim, color: "#fff", padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, display: "inline-block" }}>Browse Files</div>
            <div style={{ fontSize: 8, color: T.textDim, marginTop: 6 }}>MP4 · MOV · WebM</div>
          </label>
          {videoReady && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: T.textMid }}>{isRunning ? "Analysing…" : "Loaded"}</span>
                <span style={{ fontSize: 9, color: T.gold, fontWeight: 700 }}>{progress.toFixed(0)}%</span>
              </div>
              <div style={{ background: T.border2, borderRadius: 3, height: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${progress}%`, background: `linear-gradient(90deg, ${T.accentDim}, ${T.accent})`, borderRadius: 3, transition: "width 0.4s ease" }}/>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ padding: "0 24px", height: 52, borderBottom: `1px solid ${T.border}`, background: T.sidebar, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {onBack && (
              <button onClick={onBack} style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: T.textMid, fontSize: 12, fontWeight: 500 }}>
                <IcoBack s={13} c={T.textMid}/> Back
              </button>
            )}
            <div style={{ fontSize: 12, color: T.textMid, display: "flex", alignItems: "center", gap: 8 }}>
              {videoName ? <><IcoVideo s={13} c={T.textMid}/> {videoName.slice(0, 40)}</> : "AI Commentary Dashboard"}
            </div>
            {isRunning && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(229,62,62,0.1)", border: "1px solid rgba(229,62,62,0.3)", padding: "3px 10px", borderRadius: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.red, animation: "blink 1s infinite" }}/>
                <span style={{ fontSize: 10, color: T.red, fontWeight: 700, letterSpacing: 1 }}>LIVE</span>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: statusDot, fontWeight: 600 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: statusDot, animation: status === "processing" ? "blink 0.8s infinite" : "none" }}/>
              {statusTxt}
            </div>
            <button onClick={() => setShowSettings(true)} style={{ background: geminiKey ? "rgba(56,161,105,0.08)" : "rgba(214,158,46,0.08)", border: `1px solid ${geminiKey ? T.accentDim : "#744210"}`, borderRadius: 6, padding: "5px 12px", cursor: "pointer", fontSize: 11, color: geminiKey ? T.accent : T.gold, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s" }}>
              <IcoKey s={12} c={geminiKey ? T.accent : T.gold}/>
              {geminiKey ? "Keys Set" : "Add API Keys"}
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${T.border}`, background: T.card, flexShrink: 0 }}>
              {!videoReady ? (
                <label className="upload-z" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220, cursor: "pointer", position: "relative", background: `linear-gradient(160deg, ${T.card} 0%, #0F1F18 100%)`, transition: "all 0.2s" }}>
                  <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}/>
                  <BatSVG width={36} height={120} style={{ position: "absolute", right: 60, bottom: 0, opacity: 0.12, transform: "rotate(12deg)" }}/>
                  <BatSVG width={30} height={100} style={{ position: "absolute", left: 60, bottom: 0, opacity: 0.1, transform: "rotate(-18deg) scaleX(-1)" }}/>
                  <WicketSVG width={48} height={78} style={{ position: "absolute", right: 20, bottom: 0, opacity: 0.1 }}/>
                  <WicketSVG width={40} height={65} style={{ position: "absolute", left: 20, bottom: 0, opacity: 0.08 }}/>
                  <div style={{ position: "absolute", bottom: -50, left: "50%", transform: "translateX(-50%)", width: 340, height: 120, borderRadius: "50%", border: "1px solid rgba(56,161,105,0.1)" }}/>
                  <div style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", width: 200, height: 80, borderRadius: "50%", border: "1px solid rgba(56,161,105,0.14)" }}/>
                  <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><BallSVG size={56}/></div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#E8F5F0", marginBottom: 6, letterSpacing: 0.3 }}>Upload Cricket Video</div>
                    <div style={{ fontSize: 12, color: T.textMid, marginBottom: 20, lineHeight: 1.7 }}>MP4, MOV, WebM — any length<br/>AI analyses frames every {FRAME_INTERVAL_SEC}s for live commentary</div>
                    <div style={{ background: T.accentDim, color: "#fff", padding: "10px 26px", borderRadius: 7, fontSize: 13, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, letterSpacing: 0.4, boxShadow: "0 4px 16px rgba(39,103,73,0.5)" }}>
                      <IcoUpload s={14} c="#fff"/> Choose Video File
                    </div>
                    <div style={{ marginTop: 10, fontSize: 10, color: T.textDim }}>or drag and drop here</div>
                  </div>
                </label>
              ) : (
                <div style={{ position: "relative" }}>
                  {isRunning && (
                    <div style={{ position: "absolute", top: 10, left: 10, zIndex: 10, background: T.red, padding: "3px 10px", borderRadius: 5, fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1.2, display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff", animation: "blink 1s infinite" }}/> LIVE
                    </div>
                  )}
                  {status === "processing" && (
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10, background: "rgba(13,26,20,0.9)", border: `1px solid ${T.border2}`, borderRadius: 6, padding: "5px 10px", display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: T.gold, fontWeight: 600 }}>
                      <div style={{ width: 12, height: 12, border: `2px solid ${T.gold}`, borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
                      Generating…
                    </div>
                  )}
                  {/* Visible preview mirrors the hidden videoRef src */}
                  <video
                    src={videoRef.current?.src}
                    style={{ width: "100%", maxHeight: 260, display: "block", objectFit: "contain", background: "#000" }}
                    controls={!isRunning}
                    playsInline
                    muted
                  />
                </div>
              )}
            </div>

            <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${T.border}`, flexShrink: 0, height: 72 }}>
              <PitchSVG style={{ width: "100%", height: "100%", display: "block" }}/>
            </div>

            <div style={{ background: T.card, borderRadius: 10, padding: "16px", border: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 }}>Commentary Language</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {INDIAN_LANGUAGES.map(l => (
                  <button key={l.code} className="lang-btn" onClick={() => setLanguage(l.code)} style={{ padding: "5px 13px", borderRadius: 5, border: `1px solid ${language === l.code ? T.accentDim : T.border2}`, background: language === l.code ? "rgba(56,161,105,0.1)" : T.panel, color: language === l.code ? T.accent : T.textMid, fontSize: 13, fontWeight: language === l.code ? 700 : 400, cursor: "pointer", transition: "all 0.15s" }}>{l.label}</button>
                ))}
              </div>
            </div>

            <div style={{ background: T.card, borderRadius: 10, padding: "16px", border: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8 }}>Voice</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["male", "female"].map(v => (
                      <button key={v} onClick={() => setVoiceGender(v)} style={{ padding: "6px 16px", borderRadius: 5, cursor: "pointer", border: `1px solid ${voiceGender === v ? T.accentDim : T.border2}`, background: voiceGender === v ? "rgba(56,161,105,0.1)" : T.panel, color: voiceGender === v ? T.accent : T.textMid, fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6, textTransform: "capitalize" }}>
                        <IcoMic s={12} c={voiceGender === v ? T.accent : T.textMid}/> {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: T.textDim, fontWeight: 700, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8 }}>TTS Audio</div>
                  <button onClick={() => setTtsEnabled(p => !p)} style={{ padding: "6px 16px", borderRadius: 5, cursor: "pointer", border: `1px solid ${ttsEnabled ? T.accentDim : T.border2}`, background: ttsEnabled ? "rgba(56,161,105,0.1)" : T.panel, color: ttsEnabled ? T.accent : T.textMid, fontSize: 12, fontWeight: 600, transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6 }}>
                    {ttsEnabled ? <IcoVolume s={12} c={T.accent}/> : <IcoMute s={12} c={T.textMid}/>}
                    {ttsEnabled ? "On" : "Off"}
                  </button>
                </div>
                {videoReady && (
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <label style={{ background: T.panel, color: T.textMid, border: `1px solid ${T.border2}`, borderRadius: 7, padding: "7px 14px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontWeight: 500 }}>
                      <input type="file" accept="video/*" onChange={handleVideoLoad} style={{ display: "none" }}/>
                      <IcoVideo s={13} c={T.textMid}/> Change
                    </label>
                    {!isRunning ? (
                      <button className="act-btn" onClick={startCommentary} style={{ background: "linear-gradient(135deg, #276749, #38A169)", color: "#fff", border: "none", borderRadius: 7, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(39,103,73,0.5)", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                        <IcoPlay s={13} c="#fff"/> Start AI Commentary
                      </button>
                    ) : (
                      <button className="stop-btn" onClick={stopCommentary} style={{ background: "rgba(229,62,62,0.08)", color: T.red, border: `1px solid rgba(229,62,62,0.3)`, borderRadius: 7, padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 8 }}>
                        <IcoStop s={13} c={T.red}/> Stop
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {status === "error" && errorMsg && (
              <div style={{ background: "rgba(229,62,62,0.08)", border: "1px solid rgba(229,62,62,0.25)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#FC8181", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <IcoKey s={14} c="#FC8181"/> {errorMsg}
                <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", color: T.gold, cursor: "pointer", fontSize: 12, fontWeight: 600, marginLeft: 4 }}>Fix Keys →</button>
              </div>
            )}

            {commentary.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexShrink: 0 }}>
                {[
                  { label: "Frames",     val: frameCount,                                             color: T.gold    },
                  { label: "Commentary", val: commentary.length,                                      color: T.accent  },
                  { label: "TTS Clips",  val: commentary.filter(c => c.tts).length,                  color: "#63B3ED" },
                  { label: "Language",   val: INDIAN_LANGUAGES.find(l => l.code === language)?.name, color: "#B794F4" },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, minWidth: 90, background: T.card, borderRadius: 8, padding: "12px", border: `1px solid ${T.border}`, textAlign: "center" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 9, color: T.textDim, fontWeight: 600, letterSpacing: 0.8, marginTop: 4, textTransform: "uppercase" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ width: 308, borderLeft: `1px solid ${T.border}`, background: T.panel, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", padding: "11px 14px 0" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: isRunning ? T.accent : T.textDim, animation: isRunning ? "blink 1.2s infinite" : "none", marginRight: 8, flexShrink: 0 }}/>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.textMid, letterSpacing: 1.4, textTransform: "uppercase" }}>Live Commentary Feed</span>
                {commentary.length > 0 && <button onClick={() => setCommentary([])} style={{ marginLeft: "auto", background: "none", border: "none", color: T.textDim, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>Clear</button>}
              </div>
              <div style={{ display: "flex", padding: "4px 8px 0" }}>
                {[["commentary", "Commentary"], ["stats", "Stats"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "7px 12px", background: "none", border: "none", borderBottom: `2px solid ${activeTab === tab ? T.accent : "transparent"}`, color: activeTab === tab ? T.accent : T.textDim, cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 0.6, transition: "all 0.15s", textTransform: "uppercase" }}>{label}</button>
                ))}
              </div>
            </div>

            {activeTab === "commentary" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {commentary.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}><WicketSVG width={52} height={84} style={{ opacity: 0.25 }}/></div>
                    <div style={{ fontSize: 13, color: T.textDim, lineHeight: 1.9 }}>Upload a cricket video<br/>and hit <strong style={{ color: T.accent, fontWeight: 700 }}>Start AI Commentary</strong><br/>to see the live feed here</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
                      <BallSVG size={18} style={{ opacity: 0.2 }}/>
                      <BatSVG width={12} height={40} style={{ opacity: 0.2 }}/>
                      <BallSVG size={14} style={{ opacity: 0.15 }}/>
                    </div>
                  </div>
                ) : (
                  commentary.map((item, i) => <CommentaryBubble key={item.id} item={item} isLatest={i === 0}/>)
                )}
              </div>
            )}

            {activeTab === "stats" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "Frames Analysed",  val: frameCount,                                             color: T.gold    },
                  { label: "Commentary Lines",  val: commentary.length,                                      color: T.accent  },
                  { label: "TTS Clips",         val: commentary.filter(c => c.tts).length,                  color: "#63B3ED" },
                  { label: "Language",          val: INDIAN_LANGUAGES.find(l => l.code === language)?.name, color: "#B794F4" },
                  { label: "Frame Interval",    val: `${FRAME_INTERVAL_SEC}s`,                               color: T.gold    },
                  { label: "AI Model",          val: "Gemini 2.0 Flash",                                     color: T.textMid },
                  { label: "TTS Engine",        val: "Sarvam Bulbul v2",                                     color: T.textMid },
                  { label: "TTS Status",        val: ttsEnabled && sarvamKey ? "Active" : "Off",             color: ttsEnabled && sarvamKey ? T.accent : T.red },
                ].map(s => (
                  <div key={s.label} style={{ background: T.card, borderRadius: 7, padding: "9px 12px", border: `1px solid ${T.border}`, display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.textMid, flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.val}</span>
                  </div>
                ))}
                {commentary.length > 0 && (() => {
                  const sixes   = commentary.filter(c => /\bSIX\b/i.test(c.text)).length;
                  const fours   = commentary.filter(c => /\bFOUR\b/i.test(c.text)).length;
                  const wickets = commentary.filter(c => /\bWICKET\b/i.test(c.text)).length;
                  return (
                    <div style={{ background: T.card, borderRadius: 8, padding: "12px", border: `1px solid ${T.border}`, marginTop: 4 }}>
                      <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>AI Detected Events</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                        {[
                          ["6s", sixes,   "#D69E2E", "rgba(214,158,46,0.1)",  "rgba(214,158,46,0.25)" ],
                          ["4s", fours,   "#63B3ED", "rgba(99,179,237,0.08)", "rgba(99,179,237,0.2)"  ],
                          ["W",  wickets, "#FC8181", "rgba(252,129,129,0.08)","rgba(252,129,129,0.2)" ],
                        ].map(([label, count, color, bg, border]) => (
                          <div key={label} style={{ textAlign: "center", background: bg, border: `1px solid ${border}`, borderRadius: 7, padding: "10px 4px" }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
                            <div style={{ fontSize: 9, color: T.textDim, fontWeight: 700, marginTop: 4, letterSpacing: 0.8 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ padding: "8px 14px", borderTop: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
              <span style={{ fontSize: 9, color: T.textDim }}>Gemini 2.0 Flash · Sarvam Bulbul v2</span>
              <span style={{ fontSize: 9, color: T.textDim }}>Every {FRAME_INTERVAL_SEC}s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

