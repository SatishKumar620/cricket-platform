import { useState, useRef, useEffect } from "react";
import { PERSONALITIES, COMMENTARY_LANGUAGES, useCommentary } from "./useCommentary.js";

const C = {
  cream:"#faf7f2", warm:"#f5ede0", sand:"#e8d9c4",
  clay:"#c4956a", pitch:"#4a7c59", pitch2:"#2d5a3d",
  ink:"#1a1a18", muted:"#8a8578", border:"#e8e8e8",
  bg:"#ffffff", panel:"#f9f9f9", red:"#c0392b",
};

function KeysModal({ geminiKey, setGeminiKey, sarvamKey, setSarvamKey, onClose }) {
  const [g, setG] = useState(geminiKey);
  const [s, setS] = useState(sarvamKey);
  const inp = { width:"100%", background:"#f5f5f5", border:"1px solid #e0e0e0", borderRadius:8, padding:"9px 12px", color:C.ink, fontSize:12, fontFamily:"monospace", outline:"none" };
  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:C.bg, borderRadius:16, border:"1px solid "+C.border, padding:28, width:"100%", maxWidth:440, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:900, color:C.ink }}>API Keys</div>
          <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:C.muted }}>✕</button>
        </div>
        <label style={{ display:"block", marginBottom:14 }}>
          <div style={{ fontSize:10, color:C.clay, letterSpacing:2, fontWeight:700, marginBottom:4 }}>GEMINI API KEY</div>
          <div style={{ fontSize:10, color:C.muted, marginBottom:6 }}>Free → <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color:C.pitch }}>aistudio.google.com</a></div>
          <input type="password" value={g} onChange={e => setG(e.target.value)} placeholder="AIza..." style={inp} />
        </label>
        <label style={{ display:"block", marginBottom:22 }}>
          <div style={{ fontSize:10, color:C.clay, letterSpacing:2, fontWeight:700, marginBottom:4 }}>SARVAM API KEY (TTS)</div>
          <div style={{ fontSize:10, color:C.muted, marginBottom:6 }}>Free ₹1000 credits → <a href="https://console.sarvam.ai" target="_blank" rel="noreferrer" style={{ color:C.pitch }}>console.sarvam.ai</a></div>
          <input type="password" value={s} onChange={e => setS(e.target.value)} placeholder="your-sarvam-key" style={inp} />
        </label>
        <button onClick={() => { setGeminiKey(g); setSarvamKey(s); onClose(); }}
          style={{ width:"100%", background:C.pitch2, color:"#fff", border:"none", borderRadius:8, padding:"11px", fontSize:13, fontWeight:700, cursor:"pointer" }}>
          Save Keys
        </button>
      </div>
    </div>
  );
}

function FeedBubble({ item, isLatest }) {
  const [shown, setShown] = useState(isLatest ? "" : item.text);
  useEffect(() => {
    if (!isLatest) return;
    let i = 0; setShown("");
    const t = setInterval(() => { i += 3; setShown(item.text.slice(0, i)); if (i >= item.text.length) clearInterval(t); }, 20);
    return () => clearInterval(t);
  }, [isLatest, item.text]);
  return (
    <div style={{ padding:"11px 13px", borderRadius:10, background:isLatest ? "#f0f7f2" : C.bg, border:"1px solid "+(isLatest ? C.pitch : C.border), animation:isLatest ? "fadeUp 0.3s ease" : "none" }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
        <span style={{ fontSize:13 }}>{item.emoji}</span>
        <span style={{ fontSize:10, color:C.clay, fontWeight:700 }}>{item.persona}</span>
        <span style={{ fontSize:9, color:C.muted, marginLeft:"auto" }}>{item.ts} · {item.lang}</span>
        {item.tts && <span style={{ fontSize:9, color:C.pitch }}>🔊</span>}
      </div>
      <div style={{ fontSize:12, color:"#3a3a36", lineHeight:1.7, fontFamily:"'Noto Sans','DM Sans',sans-serif" }}>
        {shown}{isLatest && shown.length < item.text.length && <span style={{ opacity:0.3 }}>▍</span>}
      </div>
    </div>
  );
}

export default function CommentaryPanel({ onVideoLoad, onYtUrl }) {
  const hook = useCommentary();
  const [showKeys,   setShowKeys]   = useState(false);
  const [activeTab,  setActiveTab]  = useState("commentary");
  const [ytUrl,      setYtUrl]      = useState("");
  const [ytVideoId,  setYtVideoId]  = useState("");
  const [chatMsgs,   setChatMsgs]   = useState([
    { id:1, user:"Rahul_11",  color:"#00e676", text:"What a delivery by Bumrah!" },
    { id:2, user:"CricFan99", color:"#c4956a", text:"Jadeja holding it together well" },
    { id:3, user:"MSD_era",   color:"#faad14", text:"India winning this for sure" },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [myColor] = useState(["#00e676","#c4956a","#faad14","#ff4d4f","#69b1ff"][Math.floor(Math.random()*5)]);
  const [myUser]  = useState("Fan" + Math.floor(Math.random()*9000+1000));

  const chatBottom = useRef(null);

  useEffect(() => { chatBottom.current?.scrollIntoView({ behavior:"smooth" }); }, [chatMsgs]);

  const handleFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    hook.stop(); hook.clearFeed();
    const url = URL.createObjectURL(file);
    if (onVideoLoad) onVideoLoad(url);
  };



  const extractYtId = (url) => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  const loadYtUrl = () => {
    const id = extractYtId(ytUrl);
    if (id) {
      setYtVideoId(id);
      hook.clearFeed();
      if (onYtUrl) onYtUrl(id);
    } else alert("Invalid YouTube URL — paste a full youtube.com/watch?v= link");
  };

  const handleStart = () => {
    if (!hook.geminiKey) { setShowKeys(true); return; }
    const mainPlayer = document.getElementById("main-video-player");
    if (mainPlayer && mainPlayer.src) {
      const ok = hook.start(mainPlayer);
      if (!ok) setShowKeys(true);
      return;
    }
    alert("Upload a video or select a YouTube video first — it will play in the main player.");
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMsgs(prev => [...prev, { id:Date.now(), user:myUser, color:myColor, text:chatInput.trim() }].slice(-15));
    setChatInput("");
  };

  const statusColor = { idle:"#8a8578", processing:"#c4956a", error:"#c0392b" }[hook.status];

  const tabBtn = (id, label) => (
    <button onClick={() => setActiveTab(id)} style={{ padding:"8px 16px", border:"none", background:"none", cursor:"pointer", fontSize:11, fontWeight:600, color:activeTab===id ? C.clay : C.muted, borderBottom:activeTab===id ? "2px solid "+C.clay : "2px solid transparent", letterSpacing:1, textTransform:"uppercase", transition:"all 0.15s" }}>
      {label}
    </button>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:C.bg, fontFamily:"'DM Sans',sans-serif", overflowY:"auto" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        .cp-lang:hover{border-color:${C.pitch}!important;color:${C.pitch}!important}
        .cp-persona:hover{border-color:${C.clay}!important}
      `}</style>

      {showKeys && <KeysModal geminiKey={hook.geminiKey} setGeminiKey={hook.setGeminiKey} sarvamKey={hook.sarvamKey} setSarvamKey={hook.setSarvamKey} onClose={() => setShowKeys(false)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderBottom:"1px solid "+C.border, flexShrink:0 }}>
        <div style={{ fontSize:11, color:C.clay, fontWeight:700, letterSpacing:2, textTransform:"uppercase" }}>🎙 AI Commentary</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:10, color:statusColor }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:statusColor, animation:hook.status==="processing"?"pulse 1s infinite":"none" }} />
            {hook.status==="processing" ? "Generating..." : hook.isRunning ? "Live" : "Ready"}
          </div>
          <button onClick={() => setShowKeys(true)} style={{ fontSize:10, padding:"4px 10px", borderRadius:6, border:"1px solid "+(hook.geminiKey ? C.pitch : C.clay), background:"transparent", color:hook.geminiKey ? C.pitch : C.clay, cursor:"pointer", fontWeight:600 }}>
            {hook.geminiKey ? "⚙ Keys" : "⚙ Add Keys"}
          </button>
        </div>
      </div>

      {/* Source controls */}
      <div style={{ display:"flex", gap:6, padding:"10px 14px 8px", flexShrink:0, flexWrap:"wrap" }}>
        <label style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 14px", borderRadius:6, border:"1px solid "+C.border, background:C.warm, cursor:"pointer", fontSize:11, fontWeight:600, color:C.ink }}>
          <input type="file" accept="video/*" onChange={handleFile} style={{ display:"none" }} />
          📁 Upload Video
        </label>
        <div style={{ display:"flex", gap:6, flex:1 }}>
          <input value={ytUrl} onChange={e => setYtUrl(e.target.value)} onKeyDown={e => e.key==="Enter" && loadYtUrl()} placeholder="Paste YouTube URL..." style={{ flex:1, background:"#f5f5f5", border:"1px solid "+C.border, borderRadius:6, padding:"5px 10px", fontSize:11, color:C.ink, outline:"none", minWidth:0 }} />
          <button onClick={loadYtUrl} style={{ background:"#ff0000", color:"#fff", border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer", flexShrink:0 }}>▶</button>
        </div>
      </div>

      {/* Active video status */}
      {ytVideoId && (
        <div style={{ margin:"0 14px 8px", padding:"6px 10px", background:"#f0fff4", borderRadius:8, border:"1px solid #c6f6d5", fontSize:11, color:"#276749", flexShrink:0 }}>
          ✅ YouTube video loaded in main player
        </div>
      )}

      {/* Personality */}
      <div style={{ padding:"0 14px 10px", flexShrink:0 }}>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:7, fontWeight:700 }}>Commentator Personality</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {PERSONALITIES.map(p => (
            <button key={p.id} className="cp-persona" onClick={() => hook.setPersonality(p.id)} style={{ padding:"4px 11px", borderRadius:20, border:"1px solid "+(hook.personality===p.id ? C.clay : C.border), background:hook.personality===p.id ? "#fef3e8" : "transparent", color:hook.personality===p.id ? C.clay : C.muted, fontSize:11, fontWeight:hook.personality===p.id ? 700 : 400, cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:4 }}>
              <span>{p.emoji}</span><span>{p.name}</span>
            </button>
          ))}
        </div>
        <div style={{ marginTop:5, fontSize:10, color:C.muted, fontStyle:"italic" }}>
          {PERSONALITIES.find(p => p.id === hook.personality)?.desc}
        </div>
      </div>

      {/* Language */}
      <div style={{ padding:"0 14px 10px", flexShrink:0 }}>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:2, textTransform:"uppercase", marginBottom:7, fontWeight:700 }}>Language</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
          {COMMENTARY_LANGUAGES.map(l => (
            <button key={l.code} className="cp-lang" onClick={() => hook.setLanguage(l.code)} style={{ padding:"4px 11px", borderRadius:20, border:"1px solid "+(hook.language===l.code ? C.pitch : C.border), background:hook.language===l.code ? "#f0f7f2" : "transparent", color:hook.language===l.code ? C.pitch : C.muted, fontSize:12, fontWeight:hook.language===l.code ? 700 : 400, cursor:"pointer", transition:"all 0.15s" }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Voice + TTS + Start/Stop */}
      <div style={{ padding:"0 14px 12px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", flexShrink:0 }}>
        <div style={{ fontSize:9, color:C.muted, letterSpacing:2, textTransform:"uppercase", fontWeight:700 }}>Voice:</div>
        {["male","female"].map(v => (
          <button key={v} onClick={() => hook.setVoiceGender(v)} style={{ padding:"4px 12px", borderRadius:20, border:"1px solid "+(hook.voiceGender===v ? C.pitch : C.border), background:hook.voiceGender===v ? "#f0f7f2" : "transparent", color:hook.voiceGender===v ? C.pitch : C.muted, fontSize:11, fontWeight:600, cursor:"pointer", textTransform:"capitalize", transition:"all 0.15s" }}>
            {v==="male" ? "🎙 Male" : "🎤 Female"}
          </button>
        ))}
        <button onClick={() => hook.setTtsEnabled(p => !p)} style={{ padding:"4px 12px", borderRadius:20, border:"1px solid "+(hook.ttsEnabled ? C.pitch : C.border), background:hook.ttsEnabled ? "#f0f7f2" : "transparent", color:hook.ttsEnabled ? C.pitch : C.muted, fontSize:11, fontWeight:600, cursor:"pointer", transition:"all 0.15s" }}>
          {hook.ttsEnabled ? "🔊 TTS On" : "🔇 TTS Off"}
        </button>
        <div style={{ marginLeft:"auto" }}>
          {!hook.isRunning ? (
            <button onClick={handleStart} disabled={sourceMode==="upload" && !videoReady} style={{ background: sourceMode==="upload" && !videoReady ? C.sand : "linear-gradient(135deg,"+C.pitch2+","+C.pitch+")", color:"#fff", border:"none", borderRadius:8, padding:"7px 18px", fontSize:12, fontWeight:700, cursor:sourceMode==="upload" && !videoReady ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:7, boxShadow:"0 4px 14px rgba(45,90,61,0.35)" }}>
              ▶ Start Commentary
            </button>
          ) : (
            <button onClick={hook.stop} style={{ background:"rgba(192,57,43,0.08)", color:C.red, border:"1px solid rgba(192,57,43,0.3)", borderRadius:8, padding:"7px 18px", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:7 }}>
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {hook.status==="error" && hook.errorMsg && (
        <div style={{ margin:"0 14px 10px", padding:"8px 12px", background:"rgba(192,57,43,0.06)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:8, fontSize:11, color:C.red, flexShrink:0 }}>
          ⚠ {hook.errorMsg}
          {hook.errorMsg.toLowerCase().includes("key") && <button onClick={() => setShowKeys(true)} style={{ marginLeft:8, background:"none", border:"none", color:C.clay, cursor:"pointer", fontSize:11 }}>→ Fix Keys</button>}
        </div>
      )}

      {/* Stats */}
      {(hook.feed.length > 0 || hook.chunkCount > 0) && (
        <div style={{ margin:"0 14px 10px", padding:"8px 12px", background:C.warm, borderRadius:8, border:"1px solid "+C.sand, display:"flex", gap:16, flexShrink:0, flexWrap:"wrap" }}>
          {[{l:"CHUNKS",v:hook.chunkCount},{l:"COMMENTARY",v:hook.feed.length},{l:"LANGUAGE",v:COMMENTARY_LANGUAGES.find(l=>l.code===hook.language)?.name},{l:"TTS",v:hook.ttsEnabled&&hook.sarvamKey?"On":"Off"}].map(s => (
            <div key={s.l}>
              <div style={{ fontSize:8, color:C.muted, letterSpacing:1, textTransform:"uppercase" }}>{s.l}</div>
              <div style={{ fontSize:13, fontFamily:"'DM Mono',monospace", fontWeight:700, color:C.clay }}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", borderBottom:"1px solid "+C.border, flexShrink:0, padding:"0 14px" }}>
        {tabBtn("commentary","Commentary")}
        {tabBtn("chat","Live Chat")}
      </div>

      {/* Feed area */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8, minHeight:200 }}>
        {activeTab === "commentary" && (
          hook.feed.length === 0 ? (
            <div style={{ textAlign:"center", padding:"30px 20px", color:C.muted }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🏏</div>
              <div style={{ fontSize:12, lineHeight:1.7 }}>Upload a video then hit<br/><strong style={{ color:C.pitch }}>Start Commentary</strong></div>
            </div>
          ) : (
            hook.feed.map((item,i) => <FeedBubble key={item.id} item={item} isLatest={i===0} />)
          )
        )}
        {activeTab === "chat" && (
          <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
            <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5 }}>
              {chatMsgs.map(m => (
                <div key={m.id} style={{ fontSize:12, lineHeight:1.5 }}>
                  <span style={{ color:m.color, fontWeight:700, fontSize:11 }}>{m.user} </span>
                  <span style={{ color:"#4a4a48" }}>{m.text}</span>
                </div>
              ))}
              <div ref={chatBottom} />
            </div>
            <div style={{ display:"flex", gap:8, paddingTop:8, borderTop:"1px solid "+C.border, marginTop:8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter" && sendChat()} placeholder="Say something..." style={{ flex:1, background:"#f5f5f5", border:"1px solid "+C.border, borderRadius:8, padding:"7px 12px", fontSize:12, color:C.ink, outline:"none" }} />
              <button onClick={sendChat} style={{ background:C.clay, color:"#fff", border:"none", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
