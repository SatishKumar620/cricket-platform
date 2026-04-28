import { useState, useEffect } from "react";

const RAPID_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const HOST = "cricbuzz-cricket.p.rapidapi.com";

const fetchAPI = async (path) => {
  try {
    if (!RAPID_KEY) throw new Error("No API key");
    const res = await fetch(`https://${HOST}${path}`, {
      headers: { "x-rapidapi-key": RAPID_KEY, "x-rapidapi-host": HOST },
    });
    return res.json();
  } catch (e) {
    console.warn("fetchAPI error:", e);
    return {};
  }
};

// RSS via allorigins proxy — no API key needed
const RSS_PROXY = "https://api.allorigins.win/get?url=";
const CRICKET_RSS = "https://feeds.bbci.co.uk/sport/cricket/rss.xml";

async function fetchCricketNews() {
  try {
    const res = await fetch(RSS_PROXY + encodeURIComponent(CRICKET_RSS));
    const data = await res.json();
    const parser = new DOMParser();
    const xml = parser.parseFromString(data.contents, "text/xml");
    const items = [...xml.querySelectorAll("item")].slice(0, 10);
    return items.map((item) => ({
      title: item.querySelector("title")?.textContent || "",
      desc: item.querySelector("description")?.textContent?.replace(/<[^>]+>/g, "") || "",
      link: item.querySelector("link")?.textContent || "#",
      date: item.querySelector("pubDate")?.textContent || "",
    }));
  } catch (e) {
    return [];
  }
}

// Unsplash cricket images — totally free, no key
const NEWS_IMAGES = [
  "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=600&q=80",
  "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80",
  "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=600&q=80",
  "https://images.unsplash.com/photo-1593766788306-28561086694e?w=600&q=80",
  "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=600&q=80",
  "https://images.unsplash.com/photo-1464983308776-3c7215084895?w=600&q=80",
];

function NewsImage({ index, style }) {
  const [src, setSrc] = useState(NEWS_IMAGES[index % NEWS_IMAGES.length]);
  return (
    <img src={src} alt="" style={style}
      onError={() => setSrc("https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=80")}
    />
  );
}

const HERO_IMG = "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?w=900&q=80";

// ── IPL team colors for badge rendering ──────────────────────────────────────
const TEAM_META = {
  "Punjab Kings":                { short: "PBKS", c1: "#D71920", c2: "#FFD700" },
  "Rajasthan Royals":            { short: "RR",   c1: "#2D4EA2", c2: "#FF69B4" },
  "Chennai Super Kings":         { short: "CSK",  c1: "#F7A721", c2: "#0A2D7A" },
  "Mumbai Indians":              { short: "MI",   c1: "#004BA0", c2: "#D1AB3E" },
  "Royal Challengers Bangalore": { short: "RCB",  c1: "#EC1C24", c2: "#1a1a1a" },
  "Kolkata Knight Riders":       { short: "KKR",  c1: "#3A225D", c2: "#F2B632" },
  "Delhi Capitals":              { short: "DC",   c1: "#0063A0", c2: "#EF1C25" },
  "Sunrisers Hyderabad":         { short: "SRH",  c1: "#F7681A", c2: "#1a1a1a" },
  "Gujarat Titans":              { short: "GT",   c1: "#1D2951", c2: "#C0A35B" },
  "Lucknow Super Giants":        { short: "LSG",  c1: "#A2EDFF", c2: "#1F2B3F" },
};

function teamMeta(name) {
  return TEAM_META[name] || { short: (name || "?").slice(0, 3).toUpperCase(), c1: "#444", c2: "#888" };
}

// ── Shared small components ───────────────────────────────────────────────────
const Loader = () => (
  <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>🏏</div>
    <div>Loading...</div>
  </div>
);

const ErrorMsg = ({ msg }) => (
  <div style={{ padding: 20, borderRadius: 12, background: "#fff0f0", border: "1px solid #ffcccc", color: "#cc0000", fontSize: 13 }}>
    Error: {msg}
  </div>
);

const Empty = ({ msg }) => (
  <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>😴</div>
    <div style={{ fontWeight: 600 }}>{msg}</div>
  </div>
);

// Real logo from Cricbuzz CDN, falls back to colored initials badge
function TeamLogo({ imageId, name, size = 28 }) {
  const [failed, setFailed] = useState(false);
  const meta = teamMeta(name);

  if (imageId && !failed) {
    return (
      <img
        src={`https://${HOST}/img/v1/i1/c${imageId}/i.jpg`}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #f0e8dc", flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Colored initials badge fallback
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `linear-gradient(135deg, ${meta.c1}, ${meta.c2})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 900, color: "#fff",
      letterSpacing: 0.5, border: `2px solid ${meta.c1}44`,
    }}>
      {meta.short.slice(0, 2)}
    </div>
  );
}

// Player photo from Cricbuzz CDN, falls back to silhouette
function PlayerPhoto({ id, name, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  if (id && !failed) {
    return (
      <img
        src={`https://${HOST}/img/v1/i1/c${id}/i.jpg`}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid #f0e8dc", flexShrink: 0 }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg,#c4956a,#8a6040)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 800, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

const typeColor = { T20: "#c4956a", ODI: "#4a7c59", TEST: "#3a6fa8", T20I: "#c4956a", "TEST MATCH": "#3a6fa8" };
const getColor = (fmt) => typeColor[(fmt || "").toUpperCase()] || "#8a8578";

// ── SCORECARD PAGE ────────────────────────────────────────────────────────────
function ScorecardPage({ matchId, matchName, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeInnings, setActiveInnings] = useState(0);

  useEffect(() => {
    fetchAPI(`/mcenter/v1/${matchId}/hscard`)
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [matchId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", transition: "background .2s", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a9bb0" }}>← Back</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1a2433" }}>Scorecard</span>
      </div>
      <Loader />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", transition: "background .2s", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a9bb0", marginBottom: 16 }}>← Back</button>
      <ErrorMsg msg={error} />
    </div>
  );

  const innings = data?.scorecard || [];
  const header = data?.matchHeader || {};

  // Build team name→imageId map from scorecard
  const teamImgMap = {};
  innings.forEach(inn => {
    if (inn.batTeamDetails?.batTeamId && inn.batTeamDetails?.batTeamName) {
      teamImgMap[inn.batTeamDetails.batTeamName] = inn.batTeamDetails.batTeamId;
    }
  });

  const inn = innings[activeInnings];
  const batTeamName = inn?.batTeamDetails?.batTeamName || "";
  const bowlTeamName = inn?.bowlTeamDetails?.bowlTeamName || "";
  const batters = Object.values(inn?.batTeamDetails?.batsmenData || {});
  const bowlers = Object.values(inn?.bowlTeamDetails?.bowlersData || {});
  const fow = inn?.wicketsData ? Object.values(inn.wicketsData) : [];
  const total = inn?.scoreDetails;

  const batMeta = teamMeta(batTeamName);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", transition: "background .2s", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes fadeSlide { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes livePulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a9bb0" }}>← Back</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a2433" }}>{matchName}</div>
            <div style={{ fontSize: 10, color: "#8a9bb0" }}>{header.status}</div>
          </div>
        </div>
        {innings.length > 1 && (
          <div style={{ display: "flex", padding: "0 20px", gap: 4 }}>
            {innings.map((inn2, i) => {
              const name = inn2.batTeamDetails?.batTeamShortName || `Inn ${i + 1}`;
              const imgId = inn2.batTeamDetails?.batTeamId;
              const active = activeInnings === i;
              return (
                <button key={i} onClick={() => setActiveInnings(i)} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
                  borderBottom: active ? "2px solid #c4956a" : "2px solid transparent",
                  marginBottom: -1,
                }}>
                  <TeamLogo imageId={imgId} name={inn2.batTeamDetails?.batTeamName} size={20} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: active ? "#1a2433" : "#8a9bb0", whiteSpace: "nowrap" }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: 16, animation: "fadeSlide .3s ease" }}>
        {/* Hero score banner */}
        <div style={{
          borderRadius: 16, overflow: "hidden", marginBottom: 16, position: "relative",
          background: `linear-gradient(135deg, ${batMeta.c1}cc, ${batMeta.c2}88, #f4f7fb)`,
          border: `1px solid ${batMeta.c1}44`,
        }}>
          <img src={HERO_IMG} alt="" style={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", opacity: 0.08,
          }} />
          <div style={{ position: "relative", padding: "20px 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <TeamLogo imageId={teamImgMap[batTeamName]} name={batTeamName} size={44} />
              <div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 2 }}>{batTeamName}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: "#fff", fontFamily: "monospace", lineHeight: 1 }}>
                    {total?.runs}/{total?.wickets}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,.5)" }}>({total?.overs} ov)</span>
                </div>
              </div>
              {header.state === "In Progress" && (
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5,
                  background: "rgba(255,59,59,.15)", border: "1px solid #ff3b3b",
                  borderRadius: 20, padding: "3px 10px", fontSize: 10, fontWeight: 800,
                  color: "#ff6b6b", letterSpacing: 1 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff3b3b", animation: "livePulse 1.2s infinite" }} />
                  LIVE
                </div>
              )}
            </div>
            {header.status && (
              <div style={{ background: "rgba(0,0,0,.35)", borderRadius: 8, padding: "7px 12px",
                fontSize: 12, color: "rgba(255,255,255,.7)", borderLeft: `3px solid ${batMeta.c1}` }}>
                {header.status}
              </div>
            )}
          </div>
        </div>

        {/* Batting card */}
        {batters.filter(b => b.runs !== undefined).length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "12px 16px", background: "#f0f4f8", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <TeamLogo imageId={teamImgMap[batTeamName]} name={batTeamName} size={22} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#c4956a" }}>Batting</span>
            </div>
            {/* header row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 34px 34px 30px 30px 50px", padding: "7px 14px", borderBottom: "1px solid #1a2230" }}>
              {["Batter","R","B","4s","6s","SR"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6b7c8a", textAlign: h === "Batter" ? "left" : "center", textTransform: "uppercase", letterSpacing: .7 }}>{h}</span>
              ))}
            </div>
            {batters.filter(b => b.runs !== undefined).map((b, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 34px 34px 30px 30px 50px", padding: "10px 14px", borderBottom: "1px solid #131820", alignItems: "center",
                background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PlayerPhoto id={b.batId} name={b.batName} size={30} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2433" }}>{b.batName}</div>
                    <div style={{ fontSize: 9, color: "#6b7c8a", marginTop: 1 }}>{b.outDesc || "not out"}</div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 900, color: b.runs >= 50 ? "#f0c040" : "#1a2433", textAlign: "center" }}>{b.runs}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#8a9bb0", textAlign: "center" }}>{b.balls}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#4a7c59", textAlign: "center" }}>{b.fours}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#c4956a", textAlign: "center" }}>{b.sixes}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: parseFloat(b.strikeRate) > 150 ? "#f0c040" : "#8a9bb0", textAlign: "center" }}>{b.strikeRate}</span>
              </div>
            ))}
            <div style={{ padding: "8px 14px", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#6b7c8a" }}>
              Extras: {inn?.extrasData?.total ?? 0}
              {" "}(b {inn?.extrasData?.byes ?? 0}, lb {inn?.extrasData?.legByes ?? 0}, w {inn?.extrasData?.wides ?? 0}, nb {inn?.extrasData?.noBalls ?? 0})
            </div>
          </div>
        )}

        {/* Bowling card */}
        {bowlers.length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "12px 16px", background: "#f0f4f8", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 8 }}>
              <TeamLogo imageId={teamImgMap[bowlTeamName]} name={bowlTeamName} size={22} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#4a7c59" }}>Bowling</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 34px 28px 34px 34px 46px", padding: "7px 14px", borderBottom: "1px solid #1a2230" }}>
              {["Bowler","O","M","R","W","Econ"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6b7c8a", textAlign: h === "Bowler" ? "left" : "center", textTransform: "uppercase", letterSpacing: .7 }}>{h}</span>
              ))}
            </div>
            {bowlers.map((b, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 34px 28px 34px 34px 46px", padding: "10px 14px", borderBottom: "1px solid #131820", alignItems: "center",
                background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PlayerPhoto id={b.bowlId} name={b.bowlName} size={30} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2433" }}>{b.bowlName}</span>
                </div>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#8a9bb0", textAlign: "center" }}>{b.overs}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#8a9bb0", textAlign: "center" }}>{b.maidens}</span>
                <span style={{ fontSize: 12, fontFamily: "monospace", color: "#8a9bb0", textAlign: "center" }}>{b.runs}</span>
                <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 900, color: b.wickets >= 3 ? "#f0c040" : "#4a7c59", textAlign: "center" }}>{b.wickets}</span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: parseFloat(b.economy) > 10 ? "#ff6b6b" : "#8a9bb0", textAlign: "center" }}>{b.economy}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fall of Wickets */}
        {fow.length > 0 && (
          <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 12 }}>
            <div style={{ padding: "12px 16px", background: "#f0f4f8", borderBottom: "1px solid #e2e8f0" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#8a9bb0" }}>Fall of Wickets</span>
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {fow.map((w, i) => (
                <div key={i} style={{ background: "#f0f4f8", borderRadius: 8, padding: "5px 10px", fontSize: 11, border: "1px solid #e2e8f0" }}>
                  <span style={{ fontWeight: 800, color: "#1a2433" }}>{w.wktRuns}/{w.wktNbr}</span>
                  <span style={{ color: "#6b7c8a", marginLeft: 5 }}>({w.batName}, {w.wktOver} ov)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!inn && <Empty msg="Scorecard not yet available" />}
      </div>
    </div>
  );
}

// ── MATCH CARD ────────────────────────────────────────────────────────────────
function MatchCard({ match, onClick, isLive }) {
  const color = getColor(match.matchFormat);
  const s1 = match.score1;
  const s2 = match.score2;

  return (
    <div onClick={onClick} style={{
      background: "#ffffff",
      borderRadius: 14,
      border: isLive ? `1.5px solid ${color}55` : "1px solid #e2e8f0",
      padding: "14px 16px", marginBottom: 10,
      boxShadow: isLive ? `0 4px 20px ${color}22` : "none",
      cursor: "pointer", transition: "transform .15s, box-shadow .15s",
    }}
    onTouchStart={e => e.currentTarget.style.transform = "scale(0.98)"}
    onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isLive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4f", animation: "livePulse 1s infinite" }} />}
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color, background: `${color}18`, padding: "3px 8px", borderRadius: 6 }}>
            {match.matchFormat}{isLive ? " · LIVE" : ""}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#6b7c8a" }}>{match.seriesName?.slice(0, 24)}</span>
      </div>

      {[
        { team: match.team1, score: s1 },
        { team: match.team2, score: s2 },
      ].map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 12px", borderRadius: 10, marginBottom: 6,
          background: i === 0 ? "#f0f4f8" : "#f0f4f8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <TeamLogo imageId={item.team?.imageId} name={item.team?.teamName} size={32} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a2433" }}>
                {item.team?.shortName || item.team?.teamName || "TBA"}
              </div>
              <div style={{ fontSize: 9, color: "#6b7c8a" }}>{item.team?.teamName}</div>
            </div>
          </div>
          {item.score ? (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 900, color: "#4a7c59" }}>
                {item.score.runs}/{item.score.wickets}
              </div>
              <div style={{ fontSize: 10, color: "#6b7c8a" }}>{item.score.overs} ov</div>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "#6b7c8a" }}>Yet to bat</span>
          )}
        </div>
      ))}

      <div style={{ fontSize: 12, color: "#8a9bb0", fontWeight: 600, padding: "8px 10px",
        background: "#f0f4f8", borderRadius: 8, borderLeft: `3px solid ${color}`,
        marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{match.status}</span>
        <span style={{ fontSize: 10, color: "#6b7c8a" }}>Tap →</span>
      </div>
    </div>
  );
}

// ── MATCHES TAB ───────────────────────────────────────────────────────────────
function MatchesTab({ onSelectMatch }) {
  const [liveMatches, setLiveMatches] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const parseMatches = (data) => {
    const all = [];
    data.typeMatches?.forEach(t => {
      t.seriesMatches?.forEach(s => {
        const w = s.seriesAdWrapper || s;
        w.matches?.forEach(m => {
          if (!m.matchInfo) return;
          const sc = m.matchScore;
          all.push({
            ...m.matchInfo,
            score1: sc?.team1Score?.inngs1
              ? { runs: sc.team1Score.inngs1.runs, wickets: sc.team1Score.inngs1.wickets, overs: sc.team1Score.inngs1.overs }
              : null,
            score2: sc?.team2Score?.inngs1
              ? { runs: sc.team2Score.inngs1.runs, wickets: sc.team2Score.inngs1.wickets, overs: sc.team2Score.inngs1.overs }
              : null,
          });
        });
      });
    });
    return all;
  };

  useEffect(() => {
    Promise.all([
      fetchAPI("/matches/v1/live"),
      fetchAPI("/matches/v1/recent"),
      fetchAPI("/matches/v1/upcoming"),
    ]).then(([live, recent, upcoming]) => {
      setLiveMatches(parseMatches(live));
      setRecentMatches(parseMatches(recent).slice(0, 5));
      setUpcomingMatches(parseMatches(upcoming).slice(0, 5));
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;

  const SectionLabel = ({ label, live }) => (
    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2,
      color: live ? "#ff6b6b" : "#6b7c8a",
      display: "flex", alignItems: "center", gap: 6, margin: "16px 0 10px" }}>
      {live && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4f", animation: "livePulse 1s infinite" }} />}
      {label}
    </div>
  );

  const [filter, setFilter] = useState("ALL");
  const FILTERS = ["ALL", "IPL", "ODI", "T20", "TEST", "T20I"];

  const applyFilter = (matches) => {
    if (filter === "ALL") return matches;
    if (filter === "IPL") return matches.filter(m => m.seriesName?.toLowerCase().includes("ipl") || m.seriesName?.toLowerCase().includes("indian premier"));
    return matches.filter(m => (m.matchFormat || "").toUpperCase() === filter);
  };

  const filteredLive = applyFilter(liveMatches);
  const filteredRecent = applyFilter(recentMatches);
  const filteredUpcoming = applyFilter(upcomingMatches);

  return (
    <>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, marginBottom: 4 }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap",
            background: filter === f ? "#c4956a" : "#f0f4f8",
            color: filter === f ? "#fff" : "#6b7c8a",
            transition: "all .2s",
            boxShadow: filter === f ? "0 2px 8px rgba(196,149,106,.35)" : "none",
          }}>{f}</button>
        ))}
      </div>

      {filteredLive.length > 0 && (
        <>
          <SectionLabel label="LIVE NOW" live />
          {filteredLive.map((m, i) => (
            <MatchCard key={m.matchId || i} match={m} isLive
              onClick={() => onSelectMatch(m.matchId, `${m.team1?.teamName} vs ${m.team2?.teamName}`)} />
          ))}
        </>
      )}
      {filteredRecent.length > 0 && (
        <>
          <SectionLabel label="RECENT" />
          {filteredRecent.map((m, i) => (
            <MatchCard key={m.matchId || i} match={m} isLive={false}
              onClick={() => onSelectMatch(m.matchId, `${m.team1?.teamName} vs ${m.team2?.teamName}`)} />
          ))}
        </>
      )}
      {filteredUpcoming.length > 0 && (
        <>
          <SectionLabel label="UPCOMING" />
          {filteredUpcoming.map((m, i) => (
            <div key={m.matchId || i} style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", padding: "14px 16px", marginBottom: 10, opacity: 0.75 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: getColor(m.matchFormat), background: `${getColor(m.matchFormat)}18`, padding: "3px 8px", borderRadius: 6 }}>{m.matchFormat}</span>
                <span style={{ fontSize: 10, color: "#6b7c8a" }}>{m.seriesName?.slice(0, 24)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f0f4f8", borderRadius: 10 }}>
                <TeamLogo imageId={m.team1?.imageId} name={m.team1?.teamName} size={30} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2433" }}>{m.team1?.shortName}</span>
                <span style={{ fontSize: 11, color: "#6b7c8a", margin: "0 8px" }}>vs</span>
                <TeamLogo imageId={m.team2?.imageId} name={m.team2?.teamName} size={30} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a2433" }}>{m.team2?.shortName}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6b7c8a", marginTop: 8 }}>
                {m.venueInfo?.ground} · {new Date(parseInt(m.startDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </>
      )}
      {!filteredLive.length && !filteredRecent.length && !filteredUpcoming.length && <Empty msg="No matches found" />}
    </>
  );
}

// ── TABLE TAB ─────────────────────────────────────────────────────────────────
function TableTab() {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAPI("/series/v1/9237/points-table")
      .then(data => setTable(data.pointsTable?.[0]?.pointsTableInfo || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;
  if (!table.length) return <Empty msg="Points table unavailable" />;

  return (
    <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", background: "#f0f4f8", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
        <img src={HERO_IMG} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", opacity: .7 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: "#c4956a" }}>IPL 2026 Standings</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px 52px 42px", padding: "8px 14px", borderBottom: "1px solid #1a2230" }}>
        {["#","Team","M","W","L","NRR","Pts"].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6b7c8a", textAlign: h === "Team" ? "left" : "center", textTransform: "uppercase", letterSpacing: .7 }}>{h}</span>
        ))}
      </div>
      {table.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px 52px 42px",
          padding: "11px 14px", borderBottom: "1px solid #131820",
          background: i < 4 ? "#162018" : i % 2 === 0 ? "#ffffff" : "#f8fafc",
          borderLeft: i < 4 ? "3px solid #4a7c59" : "3px solid transparent",
          alignItems: "center" }}>
          <span style={{ fontSize: 12, color: i < 4 ? "#4a7c59" : "#6b7c8a", fontWeight: 700, textAlign: "center" }}>{i + 1}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TeamLogo imageId={row.teamId} name={row.teamName} size={26} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2433" }}>{row.teamSName || row.teamName}</div>
              {i < 4 && <div style={{ fontSize: 9, color: "#4a7c59" }}>Playoffs</div>}
            </div>
          </div>
          {[row.matchesPlayed, row.won, row.lost].map((v, j) => (
            <span key={j} style={{ fontSize: 12, fontFamily: "monospace", color: "#8a9bb0", textAlign: "center" }}>{v}</span>
          ))}
          <span style={{ fontSize: 11, fontFamily: "monospace", textAlign: "center",
            color: parseFloat(row.nrr) > 0 ? "#4a7c59" : "#ff6b6b" }}>
            {parseFloat(row.nrr) > 0 ? `+${row.nrr}` : row.nrr}
          </span>
          <span style={{ fontSize: 15, fontFamily: "monospace", fontWeight: 900, color: "#c4956a", textAlign: "center" }}>{row.points}</span>
        </div>
      ))}
      <div style={{ padding: "8px 14px", fontSize: 10, color: "#6b7c8a" }}>Top 4 qualify for playoffs</div>
    </div>
  );
}

// ── STATS TAB ─────────────────────────────────────────────────────────────────
function StatsTab() {
  const [batters, setBatters] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAPI("/stats/v1/series/9237/most-runs"),
      fetchAPI("/stats/v1/series/9237/most-wickets"),
    ]).then(([r, w]) => {
      setBatters(r.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 8) || []);
      setBowlers(w.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 8) || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const StatTable = ({ title, rows, cols, accentIdx }) => (
    <div style={{ background: "#ffffff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "12px 16px", background: "#f0f4f8", borderBottom: "1px solid #e2e8f0" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#c4956a" }}>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `28px 1fr ${cols.map(() => "46px").join(" ")}`, padding: "7px 14px", borderBottom: "1px solid #1a2230" }}>
        {["#","Player",...cols].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#6b7c8a", textAlign: h === "Player" ? "left" : "center", textTransform: "uppercase", letterSpacing: .7 }}>{h}</span>
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: `28px 1fr ${cols.map(() => "46px").join(" ")}`, padding: "10px 14px", borderBottom: "1px solid #131820", alignItems: "center", background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
          <span style={{ fontSize: 11, color: "#6b7c8a", textAlign: "center" }}>{i + 1}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PlayerPhoto id={r.id} name={r.name} size={32} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2433" }}>{r.name}</div>
              <div style={{ fontSize: 9, color: "#6b7c8a" }}>{r.teamName}</div>
            </div>
          </div>
          {r.values?.slice(0, cols.length).map((v, j) => (
            <span key={j} style={{ fontSize: 13, fontFamily: "monospace", fontWeight: j === accentIdx ? 900 : 400,
              color: j === accentIdx ? "#c4956a" : "#8a9bb0", textAlign: "center" }}>{v.value}</span>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <StatTable title="Most Runs" rows={batters} cols={["M","Avg","Runs"]} accentIdx={2} />
      <StatTable title="Most Wickets" rows={bowlers} cols={["M","Econ","W"]} accentIdx={2} />
    </>
  );
}

// ── NEWS TAB ──────────────────────────────────────────────────────────────────
function NewsTab() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCricketNews().then(items => {
      setNews(items);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader />;
  if (!news.length) return <Empty msg="Could not load news" />;

  const [featured, ...rest] = news;

  return (
    <div>
      {/* Featured article */}
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, position: "relative", cursor: "pointer" }}
        onClick={() => window.open(featured.link, "_blank")}>
        <NewsImage index={0} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,15,25,.95) 40%, transparent)" }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 16px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: "#c4956a", marginBottom: 6 }}>BBC SPORT · FEATURED</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.35, marginBottom: 6 }}>{featured.title}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{new Date(featured.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        </div>
      </div>

      {/* Rest of articles */}
      {rest.map((item, i) => (
        <div key={i} onClick={() => window.open(item.link, "_blank")} style={{
          display: "flex", gap: 12, background: "#ffffff",
          borderRadius: 12, border: "1px solid #e2e8f0",
          padding: 12, marginBottom: 10, cursor: "pointer",
          transition: "background .15s",
        }}
        onTouchStart={e => e.currentTarget.style.background = "#f0f4f8"}
        onTouchEnd={e => e.currentTarget.style.background = "#ffffff"}
        >
          <img src={NEWS_IMAGES[(i + 1) % NEWS_IMAGES.length]} alt="" style={{
            width: 80, height: 70, borderRadius: 8, objectFit: "cover", flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a2433", lineHeight: 1.35, marginBottom: 5,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {item.title}
            </div>
            <div style={{ fontSize: 11, color: "#6b7c8a", display: "-webkit-box", WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
              {item.desc}
            </div>
            <div style={{ fontSize: 10, color: "#2a3a4a", marginTop: 5 }}>
              {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
const TABS = ["Matches", "Table", "Stats", "News"];

export default function ScoresPage({ onBack }) {
  const [activeTab, setActiveTab] = useState("Matches");
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (selectedMatch) {
    return (
      <ScorecardPage
        matchId={selectedMatch.id}
        matchName={selectedMatch.name}
        onBack={() => setSelectedMatch(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", transition: "background .2s", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: #1e2633; border-radius: 2px; }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(.8)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#6b7c8a" }}>← Back</button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src={HERO_IMG} style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", opacity: .8 }} />
            <span style={{ fontSize: 18, fontWeight: 900, color: "#1a2433", letterSpacing: -0.5 }}>
              Cric<span style={{ color: "#c4956a" }}>Stream</span>
            </span>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 16px", borderTop: "1px solid #e2e8f0", overflowX: "auto" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "11px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 700,
              color: activeTab === tab ? "#1a2433" : "#6b7c8a",
              borderBottom: activeTab === tab ? "2px solid #c4956a" : "2px solid transparent",
              marginBottom: -1, whiteSpace: "nowrap", transition: "color .2s",
              fontFamily: "'DM Sans', sans-serif",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16, animation: "fadeSlide .25s ease" }}>
        {activeTab === "Matches" && <MatchesTab onSelectMatch={(id, name) => setSelectedMatch({ id, name })} />}
        {activeTab === "Table"   && <TableTab />}
        {activeTab === "Stats"   && <StatsTab />}
        {activeTab === "News"    && <NewsTab />}
      </div>
    </div>
  );
}
