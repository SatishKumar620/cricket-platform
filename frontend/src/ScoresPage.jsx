import { useState, useEffect } from "react";

const RAPID_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

function MatchCard({ match }) {
  const typeColor = {
    T20: "#c4956a", ODI: "#4a7c59", TEST: "#3a6fa8",
    T20I: "#c4956a", "T20 INTL": "#c4956a",
  };
  const type = match.matchFormat || "T20";
  const color = typeColor[type.toUpperCase()] || "#8a8578";

  const t1 = match.team1 || {};
  const t2 = match.team2 || {};
  const s1 = match.score1;
  const s2 = match.score2;

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1.5px solid #f0e8dc",
      padding: "16px 18px", marginBottom: 12,
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 2,
          color, textTransform: "uppercase",
          background: `${color}18`, padding: "3px 8px", borderRadius: 6,
        }}>{type}</span>
        <span style={{ fontSize: 10, color: "#8a8578" }}>{match.seriesName?.slice(0, 30)}</span>
      </div>

      {/* Teams */}
      {[{ team: t1, score: s1 }, { team: t2, score: s2 }].map((item, i) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "10px 12px", borderRadius: 10, marginBottom: 6,
          background: i === 0 ? "#faf7f2" : "#f5f0e8",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {item.team.imageId ? (
              <img
                src={`https://cricbuzz-cricket.p.rapidapi.com/img/v1/i1/c${item.team.imageId}/i.jpg`}
                style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid #e8d9c4" }}
                onError={e => { e.target.style.display = "none"; }}
              />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: color + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🏏</div>
            )}
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a18" }}>
              {item.team.shortName || item.team.teamName || "TBA"}
            </span>
          </div>
          {item.score ? (
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 19, fontFamily: "monospace", fontWeight: 800, color: "#4a7c59" }}>
                {item.score.runs}/{item.score.wickets}
              </span>
              <span style={{ fontSize: 11, color: "#8a8578", marginLeft: 5 }}>
                ({item.score.overs} ov)
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 12, color: "#8a8578" }}>Yet to bat</span>
          )}
        </div>
      ))}

      {/* Status */}
      <div style={{
        fontSize: 12, color: "#3a3a36", fontWeight: 600,
        padding: "8px 12px", background: "#f5ede0",
        borderRadius: 8, borderLeft: `3px solid ${color}`,
        marginTop: 4,
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
          "x-rapidapi-host": "cricbuzz-cricket.p.rapidapi.com",
        },
      });
      const data = await res.json();
      const all = [];
      data.typeMatches?.forEach(typeMatch => {
        typeMatch.seriesMatches?.forEach(series => {
          const wrapper = series.seriesAdWrapper || series;
          wrapper.matches?.forEach(m => {
            const info = m.matchInfo;
            const score = m.matchScore;
            if (!info) return;
            all.push({
              id: info.matchId,
              seriesName: info.seriesName,
              matchFormat: info.matchFormat,
              status: info.status,
              team1: info.team1,
              team2: info.team2,
              venueInfo: info.venueInfo,
              score1: score?.team1Score?.inngs1 ? {
                runs: score.team1Score.inngs1.runs,
                wickets: score.team1Score.inngs1.wickets,
                overs: score.team1Score.inngs1.overs,
              } : null,
              score2: score?.team2Score?.inngs1 ? {
                runs: score.team2Score.inngs1.runs,
                wickets: score.team2Score.inngs1.wickets,
                overs: score.team2Score.inngs1.overs,
              } : null,
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
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#faf7f2", borderBottom: "1px solid #f0e8dc",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18" }}>
            Cric<span style={{ color: "#c4956a" }}>Stream</span>
          </div>
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
        <div style={{ fontSize: 12, color: "#8a8578" }}>All live cricket matches • Auto-refreshes every 60s</div>
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
        {matches.map((m, i) => <MatchCard key={m.id || i} match={m} />)}
      </div>
    </div>
  );
}
