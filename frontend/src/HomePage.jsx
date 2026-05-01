function IplScoreWidget() {
  return (
    <iframe
      src="/widget.html"
      style={{ width: "300px", height: "300px", border: "none", borderRadius: "12px", display: "block" }}
      title="Live Cricket Scores"
      scrolling="no"
    />
  );
}

export default function HomePage({ onEnter }) {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --cream:   #faf7f2;
          --warm:    #f5ede0;
          --sand:    #e8d9c4;
          --clay:    #c4956a;
          --pitch:   #4a7c59;
          --pitch2:  #2d5a3d;
          --red:     #c0392b;
          --ink:     #1a1a18;
          --ink2:    #3a3a36;
          --muted:   #8a8578;
        }

        .hp-root {
          min-height: 100vh;
          background: var(--cream);
          font-family: 'DM Sans', sans-serif;
          color: var(--ink);
          overflow-x: hidden;
        }

        .hp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(196,149,106,0.15);
          animation: fadeDown 0.7s ease both;
        }
        .hp-logo {
          font-family: 'Playfair Display', serif;
          font-size: 22px; font-weight: 900;
          letter-spacing: -0.5px; color: #fff;
        }
        .hp-logo span { color: var(--clay); }
        .hp-nav-links { display: flex; align-items: center; gap: 32px; }
        .hp-nav-link {
          font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.65);
          text-decoration: none; letter-spacing: 0.3px;
          transition: color 0.2s; background: none; border: none; cursor: pointer;
        }
        .hp-nav-link:hover { color: #fff; }
        .hp-nav-cta {
          background: var(--clay); color: #fff;
          padding: 10px 22px; border-radius: 100px;
          font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          transition: background 0.2s, transform 0.15s;
        }
        .hp-nav-cta:hover { background: var(--pitch2); transform: translateY(-1px); }

        .hp-hero {
          min-height: 100vh;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 120px 48px 80px;
          position: relative; overflow: hidden;
          background: #0a0a08;
        }
        .hp-hero-bg {
          pointer-events: none;
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1600&q=80');
          background-size: cover; background-position: center 30%;
          opacity: 0.38;
          filter: saturate(0.7);
        }
        .hp-hero-overlay {
          pointer-events: none;
          position: absolute; inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,10,8,0.55) 0%,
            rgba(10,10,8,0.2) 40%,
            rgba(10,10,8,0.75) 100%
          );
        }

        .hp-rings {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
        }
        .hp-ring {
          position: absolute; border-radius: 50%;
          border: 1px solid rgba(196,149,106,0.15);
          animation: expandRing 6s ease-out infinite;
        }
        .hp-ring:nth-child(1) { width: 300px; height: 300px; animation-delay: 0s; }
        .hp-ring:nth-child(2) { width: 500px; height: 500px; animation-delay: 1s; }
        .hp-ring:nth-child(3) { width: 720px; height: 720px; animation-delay: 2s; }
        .hp-ring:nth-child(4) { width: 960px; height: 960px; animation-delay: 3s; }
        .hp-ring:nth-child(5) { width: 1200px; height: 1200px; animation-delay: 4s; }

        .hp-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(196,149,106,0.15); border: 1px solid rgba(196,149,106,0.35);
          padding: 6px 16px; border-radius: 100px;
          font-size: 11px; font-weight: 600; color: var(--clay);
          letter-spacing: 2px; text-transform: uppercase;
          margin-bottom: 28px; position: relative;
          animation: fadeUp 0.6s 0.2s ease both; opacity: 0;
        }
        .hp-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--red); animation: livePulse 1.2s infinite;
        }

        .hp-headline {
          font-family: 'Playfair Display', serif;
          font-size: clamp(48px, 7vw, 96px);
          font-weight: 900; line-height: 1.02;
          letter-spacing: -2px; text-align: center;
          color: #fff; position: relative;
          animation: fadeUp 0.7s 0.35s ease both; opacity: 0;
          max-width: 900px;
          text-shadow: 0 4px 32px rgba(0,0,0,0.5);
        }
        .hp-headline em { font-style: italic; color: var(--clay); }
        .hp-headline .hp-hl-green { color: #6fcf8e; }

        .hp-sub {
          font-size: 17px; font-weight: 300; color: rgba(255,255,255,0.7);
          text-align: center; max-width: 520px;
          line-height: 1.7; margin-top: 24px; position: relative;
          animation: fadeUp 0.7s 0.5s ease both; opacity: 0;
        }

        .hp-hero-actions {
          display: flex; gap: 14px; margin-top: 44px; position: relative;
          animation: fadeUp 0.7s 0.65s ease both; opacity: 0;
        }
        .hp-btn-primary {
          background: var(--clay); color: #fff;
          padding: 16px 36px; border-radius: 100px;
          font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; display: flex; align-items: center; gap: 10px;
          transition: background 0.2s, transform 0.15s;
          box-shadow: 0 8px 32px rgba(196,149,106,0.4);
        }
        .hp-btn-primary:hover { background: var(--pitch2); transform: translateY(-2px); }
        .hp-btn-secondary {
          background: rgba(255,255,255,0.1); color: #fff;
          padding: 16px 36px; border-radius: 100px;
          font-size: 14px; font-weight: 500;
          border: 1.5px solid rgba(255,255,255,0.25); cursor: pointer;
          transition: border-color 0.2s, transform 0.15s, background 0.2s;
          backdrop-filter: blur(8px);
        }
        .hp-btn-secondary:hover { border-color: var(--clay); transform: translateY(-2px); background: rgba(255,255,255,0.15); }

        .hp-scroll-hint {
          position: absolute; bottom: 40px;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          animation: fadeUp 0.7s 1s ease both; opacity: 0;
        }
        .hp-scroll-line {
          width: 1px; height: 48px;
          background: linear-gradient(to bottom, transparent, var(--clay));
          animation: scrollPulse 2s ease-in-out infinite;
        }
        .hp-scroll-label {
          font-size: 9px; letter-spacing: 3px; color: rgba(255,255,255,0.4);
          text-transform: uppercase;
        }

        .hp-ticker {
          overflow: hidden; background: var(--ink);
          padding: 14px 0; border-top: 1px solid #2a2a28;
        }
        .hp-ticker-track {
          display: flex; gap: 48px;
          animation: ticker 30s linear infinite;
          white-space: nowrap;
        }
        .hp-ticker-item {
          display: inline-flex; align-items: center; gap: 10px;
          font-size: 12px; font-weight: 500; color: rgba(250,247,242,0.6);
          font-family: 'DM Mono', monospace;
        }
        .hp-ticker-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--red); animation: livePulse 1.2s infinite;
        }
        .hp-ticker-score { color: var(--clay); font-weight: 600; }

        .hp-features {
          padding: 100px 48px;
          max-width: 1200px; margin: 0 auto;
        }
        .hp-section-label {
          font-size: 11px; font-weight: 600; color: var(--clay);
          letter-spacing: 3px; text-transform: uppercase; margin-bottom: 16px;
        }
        .hp-section-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900; line-height: 1.1;
          letter-spacing: -1px; color: var(--ink);
          max-width: 600px; margin-bottom: 60px;
        }

        .hp-features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .hp-feature-card {
          background: var(--cream); border-radius: 20px;
          overflow: hidden; border: 1px solid var(--sand);
          transition: transform 0.25s, box-shadow 0.25s;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
        }
        .hp-feature-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.10);
        }
        .hp-feature-img {
          width: 100%; height: 160px;
          object-fit: cover; display: block;
          filter: saturate(0.85);
          transition: filter 0.3s;
        }
        .hp-feature-card:hover .hp-feature-img { filter: saturate(1.1); }
        .hp-feature-body { padding: 24px; }
        .hp-feature-icon { font-size: 24px; margin-bottom: 10px; }
        .hp-feature-name {
          font-size: 15px; font-weight: 700;
          color: var(--ink); margin-bottom: 8px;
        }
        .hp-feature-desc {
          font-size: 13px; color: var(--muted); line-height: 1.65;
        }

        .hp-stats {
          position: relative;
          display: grid; grid-template-columns: repeat(4, 1fr);
          padding: 80px 48px; overflow: hidden;
        }
        .hp-stats-bg {
          position: absolute; inset: 0;
          background-image: url('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1600&q=80');
          background-size: cover; background-position: center;
          filter: saturate(0.5) brightness(0.35);
        }
        .hp-stats-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(10,10,8,0.82) 0%, rgba(45,90,61,0.7) 100%);
        }
        .hp-stat {
          position: relative; text-align: center; padding: 20px;
          border-right: 1px solid rgba(255,255,255,0.08);
        }
        .hp-stat:last-child { border-right: none; }
        .hp-stat-num {
          font-family: 'Playfair Display', serif;
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 900; color: #fff; line-height: 1;
        }
        .hp-stat-num span { color: var(--clay); }
        .hp-stat-label {
          font-size: 11px; color: rgba(255,255,255,0.45);
          letter-spacing: 2px; text-transform: uppercase; margin-top: 8px;
        }

        .hp-preview {
          position: relative;
          padding: 100px 48px; overflow: hidden;
        }
        .hp-preview-bg {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #0f1f15 0%, #1a1a18 100%);
        }
        .hp-preview-label { margin-bottom: 16px; position: relative; }
        .hp-preview-title {
          font-family: 'Playfair Display', serif;
          font-size: clamp(32px, 4vw, 52px);
          font-weight: 900; line-height: 1.1;
          letter-spacing: -1px; color: var(--cream);
          margin-bottom: 48px; position: relative;
        }
        .hp-preview-title em { color: var(--clay); font-style: italic; }
        .hp-preview-layout {
          display: grid; grid-template-columns: 1fr 1.6fr;
          gap: 24px; position: relative;
        }

        .hp-match-card {
          padding: 16px 20px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer; transition: all 0.2s;
        }
        .hp-match-card:hover { background: rgba(255,255,255,0.07); }
        .hp-match-card-active {
          background: rgba(196,149,106,0.12) !important;
          border-color: rgba(196,149,106,0.3) !important;
        }
        .hp-match-format {
          font-size: 9px; color: var(--clay);
          letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px;
        }
        .hp-match-teams {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 700;
          color: var(--cream); margin-bottom: 4px;
        }
        .hp-match-score {
          font-family: 'DM Mono', monospace;
          font-size: 13px; color: rgba(250,247,242,0.7);
        }
        .hp-match-status { font-size: 11px; color: var(--clay); margin-top: 6px; }

        .hp-commentary-feed { display: flex; flex-direction: column; gap: 10px; }
        .hp-commentary-item {
          display: flex; gap: 14px; align-items: flex-start;
          padding: 14px 16px; border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          animation: fadeUp 0.4s ease both;
        }
        .hp-ball-chip {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 800; flex-shrink: 0;
          font-family: 'DM Mono', monospace;
        }
        .chip-6 { background: #0a2e18; color: #00e676; border: 1.5px solid #00e676; }
        .chip-W { background: #2e0a0a; color: #ff4d4f; border: 1.5px solid #ff4d4f; }
        .chip-4 { background: #eef4f0; color: #4a7c59; border: 1.5px solid #4a7c59; }
        .chip-0 { background: #2a2a28; color: #aaa09a; border: 1.5px solid #3a3a36; }
        .chip-1 { background: #2a2a28; color: #6b6560; border: 1.5px solid #3a3a36; }
        .hp-commentary-meta {
          font-size: 9px; color: var(--clay);
          letter-spacing: 1px; margin-bottom: 4px;
        }
        .hp-commentary-text { font-size: 12px; color: rgba(250,247,242,0.75); line-height: 1.6; }

        .hp-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 32px 48px; background: #0a0a08;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .hp-footer-logo {
          font-family: 'Playfair Display', serif;
          font-size: 18px; font-weight: 900; color: var(--cream);
        }
        .hp-footer-logo span { color: var(--clay); }
        .hp-footer-text { font-size: 12px; color: rgba(250,247,242,0.35); }
        .hp-footer-stack {
          font-size: 11px; color: rgba(250,247,242,0.25);
          font-family: 'DM Mono', monospace;
        }

        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes expandRing {
          0%   { opacity: 0.6; transform: scale(0.3); }
          100% { opacity: 0;   transform: scale(1); }
        }
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes scrollPulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 1; }
        }
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        @media (max-width: 768px) {
          .hp-nav { padding: 16px 20px; }
          .hp-nav-links { gap: 16px; }
          .hp-features-grid { grid-template-columns: 1fr; }
          .hp-stats { grid-template-columns: repeat(2, 1fr); }
          .hp-hero { padding: 100px 20px 60px; }
          .hp-features { padding: 60px 20px; }
          .hp-preview { padding: 60px 20px; }
          .hp-preview-layout { grid-template-columns: 1fr; }
          .hp-footer { flex-direction: column; gap: 16px; text-align: center; padding: 32px 20px; }
        }
      `}</style>

      <div className="hp-root">

        <nav className="hp-nav">
          <div className="hp-logo">Cric<span>Stream</span></div>
          <div className="hp-nav-links">
            <button className="hp-nav-link" onClick={() => onEnter("scores")}>Live Scores</button>
            <button className="hp-nav-link" onClick={() => onEnter("commentary")}>Commentary</button>
            <button className="hp-nav-link">Stats</button>
            <button className="hp-nav-cta" onClick={onEnter}>Watch Live →</button>
          </div>
        </nav>

        <section className="hp-hero">
          <div className="hp-hero-bg" />
          <div className="hp-hero-overlay" />
          <div className="hp-rings">
            {[1,2,3,4,5].map(i => <div key={i} className="hp-ring" />)}
          </div>

          <div className="hp-eyebrow">
            <div className="hp-eyebrow-dot" />
            Live · Ball by Ball · AI Commentary
          </div>

          <h1 className="hp-headline">
            Cricket like you've<br />
            never <em>heard</em> it <span className="hp-hl-green">before.</span>
          </h1>

          <p className="hp-sub">
            Real-time scores, AI-generated commentary, multilingual support —
            all streaming live, ball by ball.
          </p>

          <div className="hp-hero-actions">
            <button className="hp-btn-primary" onClick={onEnter}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4d4f", animation: "livePulse 1s infinite", display: "inline-block" }} />
              Watch Live Now
            </button>
            <button className="hp-btn-secondary">How it works</button>
          </div>

          <div className="hp-scroll-hint">
            <div className="hp-scroll-line" />
            <span className="hp-scroll-label">Scroll</span>
          </div>
        </section>

        <div className="hp-ticker">
          <div className="hp-ticker-track">
            {[
              { t: "IND vs AUS • 2nd Test", s: "342/6 (87.4)" },
              { t: "ENG vs SA • 1st ODI",   s: "187/3 (32.0)" },
              { t: "PAK vs NZ • T20I #3",   s: "156/4 (20.0)" },
              { t: "IND vs AUS • 2nd Test", s: "342/6 (87.4)" },
              { t: "ENG vs SA • 1st ODI",   s: "187/3 (32.0)" },
              { t: "PAK vs NZ • T20I #3",   s: "156/4 (20.0)" },
            ].map((item, i) => (
              <div key={i} className="hp-ticker-item">
                <div className="hp-ticker-dot" />
                {item.t}
                <span className="hp-ticker-score">{item.s}</span>
              </div>
            ))}
          </div>
        </div>

        
        {/* IPL Live Widget Banner */}
        <section className="hp-ipl-banner">
          <style>{`
            .hp-ipl-banner {
              background: var(--ink);
              padding: 0;
              display: flex;
              align-items: stretch;
              overflow: hidden;
              border-top: 1px solid rgba(255,255,255,0.06);
              border-bottom: 1px solid rgba(255,255,255,0.06);
            }
            .hp-ipl-img-wrap {
              flex: 1 1 0;
              min-width: 0;
              overflow: hidden;
              position: relative;
              max-height: 340px;
            }
            .hp-ipl-img-wrap img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              object-position: center top;
              display: block;
            }
            .hp-ipl-img-overlay {
              position: absolute; inset: 0;
              background: linear-gradient(to right, transparent 55%, var(--ink) 100%);
            }
            .hp-ipl-widget-wrap {
              flex: 0 0 340px;
              width: 340px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 24px 20px;
              gap: 10px;
              background: var(--ink);
            }
            .hp-ipl-widget-label {
              font-size: 9px;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: var(--clay);
              font-weight: 600;
              align-self: flex-start;
            }
            .hp-ipl-widget-box {
              width: 300px;
              height: 300px;
              overflow: hidden;
              border-radius: 12px;
              border: 1px solid rgba(196,149,106,0.2);
            }
            @media (max-width: 768px) {
              .hp-ipl-banner { flex-direction: column; }
              .hp-ipl-img-wrap { max-height: 200px; flex: none; }
              .hp-ipl-img-overlay {
                background: linear-gradient(to bottom, transparent 50%, var(--ink) 100%);
              }
              .hp-ipl-widget-wrap { flex: none; width: 100%; padding: 20px 16px; align-items: center; }
              .hp-ipl-widget-label { align-self: center; }
              .hp-ipl-widget-box { width: 300px; height: 300px; }
            }
          `}</style>

          <div className="hp-ipl-img-wrap">
            <img
              src="https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=900&q=80"
              alt="IPL Cricket"
            />
            <div className="hp-ipl-img-overlay" />
          </div>

          <div className="hp-ipl-widget-wrap">
            <span className="hp-ipl-widget-label">Live IPL Scores</span>
            <div className="hp-ipl-widget-box">
              <IplScoreWidget />
            </div>
          </div>
        </section>

<section className="hp-features">
          <div className="hp-section-label">Why CricStream</div>
          <h2 className="hp-section-title">Built for fans who refuse to miss a moment</h2>
          <div className="hp-features-grid">
            {[
              { icon: "⚡", name: "Ball-by-Ball Live", desc: "WebSocket-powered updates land in under 100ms. Every dot, every six, every wicket — in real time.", bg: "linear-gradient(135deg,#0a2e18,#1a4a2e)", emoji: "🏏" },
              { icon: "🎙️", name: "AI Commentary", desc: "LLM-generated broadcast commentary that reads the game like a 20-year veteran. Powered by Groq + Mistral.", bg: "linear-gradient(135deg,#1a1040,#2d1b69)", emoji: "🎙️" },
              { icon: "🌐", name: "18 Languages", desc: "Hindi, Tamil, Bengali, Telugu and 14 more. Commentary auto-translates with cricket terms preserved.", bg: "linear-gradient(135deg,#ff671f,#046a38)", emoji: "🇮🇳" },
              { icon: "🔊", name: "Voice Narration", desc: "Kokoro TTS reads the commentary aloud. Choose your commentator voice — from authoritative to energetic.", bg: "linear-gradient(135deg,#2e0a0a,#4a1010)", emoji: "📢" },
              { icon: "📊", name: "Deep Scorecard", desc: "Live batting/bowling stats, run rates, partnerships and ball history — all updating in real time.", bg: "linear-gradient(135deg,#0e1a2e,#1a2e4a)", emoji: "📈" },
              { icon: "🔄", name: "4-Source Fallback", desc: "CricketData → CricAPI → Cricbuzz scraper → Mock. Your stream never breaks, even at 3 AM.", bg: "linear-gradient(135deg,#1a2e1a,#2e4a2e)", emoji: "🛡️" },
            ].map(f => (
              <div key={f.name} className="hp-feature-card">
                <div style={{ height:160, background:f.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:64, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", inset:0, opacity:0.08, backgroundImage:"radial-gradient(circle, white 1px, transparent 1px)", backgroundSize:"20px 20px" }} />
                  {f.emoji}
                </div>
                <div className="hp-feature-body">
                  <div className="hp-feature-icon">{f.icon}</div>
                  <div className="hp-feature-name">{f.name}</div>
                  <div className="hp-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="hp-stats">
          <div className="hp-stats-bg" />
          <div className="hp-stats-overlay" />
          {[
            { num: "4",   suf: "×",  label: "Data Sources"  },
            { num: "18",  suf: "+",  label: "Languages"      },
            { num: "100", suf: "ms", label: "Update Latency" },
            { num: "24",  suf: "/7", label: "Always On"      },
          ].map(s => (
            <div key={s.label} className="hp-stat">
              <div className="hp-stat-num">{s.num}<span>{s.suf}</span></div>
              <div className="hp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        <section className="hp-preview">
          <div className="hp-preview-bg" />
          <div className="hp-section-label hp-preview-label">Live Preview</div>
          <h2 className="hp-preview-title">See the <em>commentary</em> in action</h2>
          <div className="hp-preview-layout">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { teams: "IND vs AUS", format: "2nd Test • Day 3", score: "342/6", overs: "87.4 ov", status: "India need 47 runs" },
                { teams: "ENG vs SA",  format: "1st ODI",          score: "187/3", overs: "32.0 ov", status: "England batting" },
                { teams: "PAK vs NZ",  format: "T20I #3",          score: "156/4", overs: "20.0 ov", status: "NZ need 45 off 15" },
              ].map((m, i) => (
                <div key={m.teams} className={`hp-match-card ${i === 0 ? "hp-match-card-active" : ""}`}>
                  <div className="hp-match-format">{m.format}</div>
                  <div className="hp-match-teams">{m.teams}</div>
                  <div className="hp-match-score"><strong>{m.score}</strong> ({m.overs})</div>
                  <div className="hp-match-status">{m.status}</div>
                </div>
              ))}
            </div>
            <div className="hp-commentary-feed">
              {[
                { ball: "6", text: "SIX! Jadeja reads the googly perfectly and launches it over long-on. This partnership is becoming the story of the match.", meta: "IND vs AUS · 87.4 ov" },
                { ball: "W", text: "WICKET! Hazlewood gets the outside edge and it flies to second slip. Kohli departs for 78. The crowd erupts at the MCG.", meta: "IND vs AUS · 86.2 ov" },
                { ball: "4", text: "FOUR! Back-foot punch through point — wrists working beautifully. Jadeja is batting on a different plane right now.", meta: "IND vs AUS · 85.5 ov" },
                { ball: "0", text: "Dot ball. Hazlewood lands it on the seam and it holds its line. The pressure is building with every maiden.", meta: "IND vs AUS · 85.4 ov" },
                { ball: "1", text: "Worked away for a single. Jadeja rotates strike — he's not taking risks with India needing only 47 more.", meta: "IND vs AUS · 85.3 ov" },
              ].map((c, i) => (
                <div key={i} className="hp-commentary-item" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className={`hp-ball-chip chip-${c.ball}`}>{c.ball}</div>
                  <div>
                    <div className="hp-commentary-meta">{c.meta}</div>
                    <div className="hp-commentary-text">"{c.text}"</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 48, display: "flex", justifyContent: "center", position: "relative" }}>
            <button className="hp-btn-primary" onClick={onEnter}>
              Open Live Dashboard →
            </button>
          </div>
        </section>

        <footer className="hp-footer">
          <div className="hp-footer-logo">Cric<span>Stream</span></div>
          <div className="hp-footer-text">Real-time AI cricket commentary platform</div>
          <div className="hp-footer-stack">FastAPI · Redis · Groq · React</div>
        </footer>

      </div>
    </>
  );
}
