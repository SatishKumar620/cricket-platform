import { useState, useEffect } from "react";

const RAPID_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPID_HOST = "cricbuzz-cricket.p.rapidapi.com";

function MatchCard({ match }) {
  const typeColor = {
    T20: "#c4956a", ODI: "#4a7c59", TEST: "#3a6fa8",
    T20I: "#c4956a", "T20 INTL": "#c4956a",
  };
  const type = match.matchFormat || match.matchType || "CRICKET";
  const color = typeColor[type.toUpperCase()] || "#8a8578";

  const t1 = match.teamInfo?.[0] || {};
  const t2 = match.teamInfo?.[1] || {};
  const score1 = match.score?.[0];
  const score2 = match.score?.[1];

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1.5px solid #f0e8dc",
      padding: "18px 20px", marginBottom: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 2,
          color: color, textTransform: "uppercase",
          background: `${color}18`, padding: "3px 8px", borderRadius: 6,
        }}>{type}</span>
        <span style={{ fontSize: 10, color: "#8a8578" }}>
          {match.venueInfo?.ground?.slice(0, 25) || ""}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {[{ team: t1, score: score1 }, { team: t2, score: score2 }].map((item, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 14px", borderRadius: 10,
            background: i === 0 ? "#faf7f2" : "#f5f0e8",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {item.team.imageId && (
                <img
                  src={`https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${item.team.imageId}/i.jpg`}
                  style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
                  onError={e => e.target.style.display = "none"}
                />
              )}
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>
                {item.team.shortName || item.team.name || "TBA"}
              </span>
            </div>
            {item.score ? (
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 18, fontFamily: "monospace", fontWeight: 800, color: "#4a7c59" }}>
                  {item.score.r}/{item.score.w}
                </span>
                <span style={{ fontSize: 10, color: "#8a8578", marginLeft: 6 }}>
                  ({item.score.o} ov)
                </span>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#8a8578" }}>Yet to bat</span>
            )}
          </div>
        ))}
      </div>

      <div style={{
        fontSize: 12, color: "#3a3a36", fontWeight: 600,
        padding: "8px 12px", background: "#f5ede0",
        borderRadius: 8, borderLeft: `3px solid ${color}`,
      }}>
        {match.status}
      </div>
    </div>
  );
}

export default function ScoresPage({ onBack }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadMatches = async () => {
    try {
      const res = await fetch("https://cricbuzz-cricket.p.rapidapi.com/matches/v1/live", {
        headers: {
          "x-rapidapi-key": RAPID_KEY,
          "x-rapidapi-host": RAPID_HOST,
        },
      });
      const data = await res.json();
      const all = [];
      data.typeMatches?.forEach(type => {
        type.seriesMatches?.forEach(series => {
          series.seriesAdWrapper?.matches?.forEach(m => {
            if (m.matchInfo) all.push({
              ...m.matchInfo,
              score: m.matchScore?.team1Score?.inngs1 ? [
                m.matchScore.team1Score.inngs1,
                m.matchScore.team2Score?.inngs1,
              ] : [],
              status: m.matchInfo.status,
            });
          });
        });
      });
      setMatches(all);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError("Failed to load: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    const interval = setInterval(loadMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#faf7f2", borderBottom: "1px solid #f0e8dc",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#8a8578",
          }}>← Back</button>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 900, color: "#1a1a18",
          }}>Cric<span style={{ color: "#c4956a" }}>Stream</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && <span style={{ fontSize: 10, color: "#8a8578" }}>Updated {lastUpdated}</span>}
          <button onClick={loadMatches} style={{
            padding: "6px 14px", borderRadius: 100,
            background: "#1a1a18", color: "#faf7f2",
            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>↻ Refresh</button>
        </div>
      </div>

      <div style={{ padding: "24px 24px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a18", marginBottom: 4 }}>Live Scores</div>
        <div style={{ fontSize: 12, color: "#8a8578" }}>All live cricket matches worldwide • Auto-refreshes every 60s</div>
      </div>

      <div style={{ padding: "16px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏏</div>
            <div>Loading live matches...</div>
          </div>
        )}
        {error && (
          <div style={{ padding: 20, borderRadius: 12, background: "#fff0f0", border: "1px solid #ffcccc", color: "#cc0000", fontSize: 13 }}>
            ⚠️ {error}
          </div>
        )}
        {!loading && !error && matches.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>😴</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>No live matches right now</div>
            <div style={{ fontSize: 12 }}>Check back later or refresh</div>
          </div>
        )}
        {matches.map((m, i) => <MatchCard key={i} match={m} />)}
      </div>
    </div>
  );
}
