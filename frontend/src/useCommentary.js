import { useState, useRef, useCallback, useEffect } from "react";

export const PERSONALITIES = [
  { id: "hype",    emoji: "🔥", name: "Ravi Hype",     gender: "male",   desc: "Loses his mind on every shot — BAAP RE BAAP!!", prompt: "You are Ravi, an absolutely unhinged hype commentator. SCREAM in caps for big shots. Use BAAP RE BAAP, YEH TOH KAMAAL, WHAT A SHOT WHAT A PLAYER. Energy always at 1000%." },
  { id: "uncle",   emoji: "😄", name: "Sharma Ji",      gender: "male",   desc: "Desi uncle who compares everything to his son",  prompt: "You are Sharma Ji, a desi uncle commentator. Constantly compare players to your son saying Mera beta toh yeh easily maarta. Give unsolicited life advice mid-commentary. Very funny and relatable." },
  { id: "savage",  emoji: "😈", name: "The Roaster",    gender: "male",   desc: "Brutal one-liners, roasts everyone on the field", prompt: "You are a savage roaster commentator. Roast the fielding team with brutal one-liners. Mock bad fielding. Example: That fielder moves like he had biryani for lunch and dinner and breakfast." },
  { id: "poet",    emoji: "🌹", name: "Shayar Sahab",   gender: "male",   desc: "Every shot is a ghazal — dramatic Urdu flair",   prompt: "You are a poetic Urdu shayar commentator. Every shot inspires a dramatic sher or shayari. A six is chandni raat mein akaash ko chhoo liya. A wicket is dil toot gaya jaise sheeshe ka armaan." },
  { id: "fangirl", emoji: "💅", name: "Super Stan",     gender: "female", desc: "Absolute fangirl of the batting team",            prompt: "You are an absolute fangirl stan commentator. Everything the batting team does is AMAZING. Use oh my god he is SO talented, I cannot breathe right now, he ate that UP bestie. Over the top unhinged love." },
  { id: "analyst", emoji: "🧠", name: "Data Nerd",      gender: "male",   desc: "Quotes completely made-up but very specific stats", prompt: "You are a data analyst who quotes completely made-up but very specific statistics mid-commentary. Example: According to my calculations this batsman hits 73.4% of short-pitched deliveries to fine leg on Tuesdays after rain. Very dry confident humor." },
  { id: "villain", emoji: "😤", name: "Opposition Fan", gender: "male",   desc: "Hates every boundary, celebrates every wicket",  prompt: "You are a bitter opposition fan. You HATE every boundary and celebrate every wicket excessively. Very dramatic and salty: Of COURSE he gets a boundary the pitch is clearly rigged." },
  { id: "classic", emoji: "🎩", name: "The Gentleman",  gender: "male",   desc: "Old school BBC Richie Benaud — calm and poetic",  prompt: "You are a classic BBC-style commentator like Richie Benaud. Calm, measured, poetic. Appreciate the finer points of cricket technique. Marvellous shot. Simply marvellous." },
];

export const COMMENTARY_LANGUAGES = [
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
  hi:"hi-IN", ta:"ta-IN", te:"te-IN", bn:"bn-IN",
  mr:"mr-IN", gu:"gu-IN", kn:"kn-IN", pa:"pa-IN",
  ml:"ml-IN", en:"en-IN",
};

const GEMINI_MODEL = "gemini-2.0-flash";
const CHUNK_SEC = 10;

async function extractAudioChunk(videoEl, durationSec) {
  return new Promise((resolve, reject) => {
    try {
      const stream = videoEl.captureStream?.() || videoEl.mozCaptureStream?.();
      if (!stream) return reject(new Error("captureStream not supported in this browser"));
      const tracks = stream.getAudioTracks();
      if (!tracks.length) return reject(new Error("No audio track found in this video"));
      const mimeType = ["audio/webm;codecs=opus","audio/webm","audio/ogg"].find(t => MediaRecorder.isTypeSupported(t)) || "";
      const recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : {});
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data); };
      recorder.onerror = e => reject(new Error("Recorder: " + e.error));
      recorder.onstop = async () => {
        if (!chunks.length) return reject(new Error("No audio data captured"));
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let b64 = "";
        for (let i = 0; i < bytes.length; i += 8192)
          b64 += btoa(String.fromCharCode(...bytes.subarray(i, i + 8192)));
        resolve(b64);
      };
      recorder.start(100);
      setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, durationSec * 1000);
    } catch(e) { reject(e); }
  });
}

async function callGemini(base64Audio, language, geminiKey, previousText, personalityId) {
  const langName    = COMMENTARY_LANGUAGES.find(l => l.code === language)?.name || "Hindi";
  const personality = PERSONALITIES.find(p => p.id === personalityId) || PERSONALITIES[0];
  const prompt = `${personality.prompt}

LANGUAGE RULE: Respond ONLY in ${langName}. ${language !== "en" ? "Write in " + langName + " script naturally." : "Use English."}
Generate 2-3 sentences of live cricket commentary based on what you hear in this audio.
Listen for: bat hitting ball, crowd reactions, ball hitting pitch, any commentary voices.
Speak as if you are live at the match. Never say you are analyzing audio.
Never refuse. Always generate commentary even if audio is unclear.
${previousText ? 'Previous: "' + previousText.slice(-150) + '" - continue naturally in same personality.' : ""}
Respond with ONLY the commentary text. No labels, no explanations.`;

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + geminiKey,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: "audio/webm", data: base64Audio } },
        ]}],
        generationConfig: { temperature: 1.0, maxOutputTokens: 250 },
      }),
    }
  );
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || "Gemini error"); }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function callSarvam(text, language, voiceGender, sarvamKey) {
  const speaker = voiceGender === "female" ? "anushka" : "amol";
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-subscription-key": sarvamKey },
    body: JSON.stringify({
      inputs: [text], target_language_code: SARVAM_LANG[language] || "hi-IN",
      speaker, pitch: 0, pace: 1.1, loudness: 1.5,
      speech_sample_rate: 22050, enable_preprocessing: true, model: "bulbul:v2",
    }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Sarvam error"); }
  const data = await res.json();
  return data.audios?.[0];
}

function useAudioQueue() {
  const ctxRef = useRef(null);
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const playNext = useCallback(async () => {
    if (playingRef.current || !queueRef.current.length) return;
    playingRef.current = true;
    const b64 = queueRef.current.shift();
    try {
      const ctx = ctxRef.current || new AudioContext();
      ctxRef.current = ctx;
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const buf = await ctx.decodeAudioData(bytes.buffer);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.onended = () => { playingRef.current = false; playNext(); };
      src.start(0);
    } catch { playingRef.current = false; playNext(); }
  }, []);
  const enqueue = useCallback((b64) => { queueRef.current.push(b64); playNext(); }, [playNext]);
  return { enqueue };
}

export function useCommentary() {
  const [geminiKey,   setGeminiKeyState] = useState(() => localStorage.getItem("vc_gemini_key") || "");
  const [sarvamKey,   setSarvamKeyState] = useState(() => localStorage.getItem("vc_sarvam_key") || "");
  const [language,    setLanguage]       = useState("hi");
  const [personality, setPersonality]    = useState("hype");
  const [voiceGender, setVoiceGender]    = useState("male");
  const [ttsEnabled,  setTtsEnabled]     = useState(true);
  const [isRunning,   setIsRunning]      = useState(false);
  const [status,      setStatus]         = useState("idle");
  const [errorMsg,    setErrorMsg]       = useState("");
  const [feed,        setFeed]           = useState([]);
  const [chunkCount,  setChunkCount]     = useState(0);

  const videoRef  = useRef(null);
  const timerRef  = useRef(null);
  const latestRef = useRef("");
  const isRunRef  = useRef(false);
  const { enqueue } = useAudioQueue();

  const setGeminiKey = (k) => { setGeminiKeyState(k); localStorage.setItem("vc_gemini_key", k); };
  const setSarvamKey = (k) => { setSarvamKeyState(k); localStorage.setItem("vc_sarvam_key", k); };

  const processChunk = useCallback(async () => {
    if (!isRunRef.current) return;
    const vid = videoRef.current;
    if (!vid || vid.paused || vid.ended) return;
    setStatus("processing");
    try {
      const audio = await extractAudioChunk(vid, CHUNK_SEC);
      setChunkCount(n => n + 1);
      const text = await callGemini(audio, language, geminiKey, latestRef.current, personality);
      if (!text) { setStatus("idle"); return; }
      latestRef.current = text;
      const langLabel = COMMENTARY_LANGUAGES.find(l => l.code === language)?.name || language;
      const persona   = PERSONALITIES.find(p => p.id === personality);
      let hasTts = false;
      if (ttsEnabled && sarvamKey) {
        try {
          const a = await callSarvam(text, language, voiceGender, sarvamKey);
          if (a) { enqueue(a); hasTts = true; }
        } catch(e) { console.warn("TTS:", e.message); }
      }
      setFeed(prev => [{
        id: Date.now(), text,
        lang: langLabel,
        persona: persona?.name,
        emoji: persona?.emoji,
        tts: hasTts,
        ts: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", second:"2-digit" }),
      }, ...prev].slice(0, 50));
      setStatus("idle");
    } catch(err) {
      setStatus("error");
      setErrorMsg(err.message);
    }
  }, [geminiKey, sarvamKey, language, personality, voiceGender, ttsEnabled, enqueue]);

  const start = useCallback((videoEl) => {
    if (!geminiKey) return false;
    videoRef.current = videoEl;
    videoEl.play().catch(() => {});
    isRunRef.current = true;
    setIsRunning(true);
    setStatus("idle");
    setErrorMsg("");
    processChunk();
    timerRef.current = setInterval(processChunk, CHUNK_SEC * 1000);
    return true;
  }, [geminiKey, processChunk]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
    isRunRef.current = false;
    setIsRunning(false);
    setStatus("idle");
  }, []);

  const clearFeed = () => {
    setFeed([]);
    setChunkCount(0);
    latestRef.current = "";
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  return {
    geminiKey, setGeminiKey,
    sarvamKey, setSarvamKey,
    language, setLanguage,
    personality, setPersonality,
    voiceGender, setVoiceGender,
    ttsEnabled, setTtsEnabled,
    isRunning, status, errorMsg,
    feed, chunkCount,
    start, stop, clearFeed,
  };
}
