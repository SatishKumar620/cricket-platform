import { useState, useEffect } from "react";

const API_KEY = import.meta.env.VITE_CRICAPI_KEY;

function MatchCard({ match }) {
  const scores = match.score || [];
  const t1 = scores[0];
  const t2 = scores[1];

  const matchTypeColor = {
    t20: "#c4956a", odi: "#4a7c59", test: "#3a6fa8", t20i: "#c4956a", odii: "#4a7c59",
  };
  const typeColor = matchTypeColor[match.matchType?.toLowerCase()] || "#8a8578";

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1.5px solid #f0e8dc",
      padding: "18px 20px", marginBottom: 14,
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      {/* Match type + name */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 2,
          color: typeColor, textTransform: "uppercase",
          background: `${typeColor}18`, padding: "3px 8px", borderRadius: 6,
        }}>{match.matchType?.toUpperCase() || "CRICKET"}</span>
        <span style={{ fontSize: 10, color: "#8a8578" }}>{match.venue?.slice(0, 30) || ""}</span>
      </div>

      {/* Teams + scores */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {match.teams?.map((team, i) => {
          const s = i === 0 ? t1 : t2;
          const isInning2 = s?.inning?.includes("2");
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: 10,
              background: i === 0 ? "#faf7f2" : "#f5f0e8",
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>
                {team}
                {isInning2 && <span style={{ fontSize: 9, color: "#8a8578", marginLeft: 6 }}>2nd</span>}
              </span>
              {s ? (
                <div style={{ textAlign: "right" }}>
                  <span style={{
                    fontSize: 18, fontFamily: "monospace",
                    fontWeight: 800, color: "#4a7c59",
                  }}>{s.r}/{s.w}</span>
                  <span style={{ fontSize: 10, color: "#8a8578", marginLeft: 6 }}>({s.o} ov)</span>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "#8a8578" }}>Yet to bat</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Status */}
      <div style={{
        fontSize: 12, color: "#3a3a36", fontWeight: 600,
        padding: "8px 12px", background: "#f5ede0",
        borderRadius: 8, borderLeft: `3px solid ${typeColor}`,
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
    if (!API_KEY || API_KEY === "your_key_here") {
      setError("CricAPI key not configured");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}&offset=0`
      );
      const data = await res.json();
      if (data.status !== "success") throw new Error(data.reason || "API error");
      const live = data.data.filter(m => m.matchStarted && !m.matchEnded);
      setMatches(live);
      setLastUpdated(new Date().toLocaleTimeString());
      setError(null);
    } catch (e) {
      setError("Failed to fetch scores: " + e.message);
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
    <div style={{
      minHeight: "100vh", background: "#faf7f2",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "#faf7f2", borderBottom: "1px solid #f0e8dc",
        padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 13, color: "#8a8578", fontFamily: "'DM Sans', sans-serif",
          }}>← Back</button>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 20, fontWeight: 900, color: "#1a1a18",
          }}>Cric<span style={{ color: "#c4956a" }}>Stream</span></div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {lastUpdated && (
            <span style={{ fontSize: 10, color: "#8a8578" }}>Updated {lastUpdated}</span>
          )}
          <button onClick={loadMatches} style={{
            padding: "6px 14px", borderRadius: 100,
            background: "#1a1a18", color: "#faf7f2",
            border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
          }}>↻ Refresh</button>
        </div>
      </div>

      {/* Title */}
      <div style={{ padding: "24px 24px 8px" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#1a1a18", marginBottom: 4 }}>
          Live Scores
        </div>
        <div style={{ fontSize: 12, color: "#8a8578" }}>
          All live cricket matches worldwide • Auto-refreshes every 60s
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 24px" }}>
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🏏</div>
            <div>Loading live matches...</div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 20, borderRadius: 12,
            background: "#fff0f0", border: "1px solid #ffcccc",
            color: "#cc0000", fontSize: 13,
          }}>
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

        {matches.map(m => <MatchCard key={m.id} match={m} />)}
      </div>
    </div>
  );
}
