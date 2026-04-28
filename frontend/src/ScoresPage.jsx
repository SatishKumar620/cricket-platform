import { useState, useEffect } from "react";

const RAPID_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const HOST = "cricbuzz-cricket.p.rapidapi.com";

const fetchAPI = async (path) => {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { "x-rapidapi-key": RAPID_KEY, "x-rapidapi-host": HOST },
  });
  return res.json();
};

const TeamLogo = ({ imageId, name, size = 28 }) => (
  imageId ? (
    <img
      src={`https://${HOST}/img/v1/i1/c${imageId}/i.jpg`}
      style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid #e8d9c4", flexShrink: 0 }}
      onError={e => { e.target.style.display = "none"; }}
    />
  ) : (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#f0e8dc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>🏏</div>
  )
);

// ── MATCHES TAB ──────────────────────────────────────────────────────────────
function MatchCard({ match }) {
  const typeColor = { T20: "#c4956a", ODI: "#4a7c59", TEST: "#3a6fa8", T20I: "#c4956a" };
  const color = typeColor[(match.matchFormat || "T20").toUpperCase()] || "#8a8578";
  const s1 = match.score1;
  const s2 = match.score2;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", padding: "14px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color, background: `${color}18`, padding: "3px 8px", borderRadius: 6 }}>
          {match.matchFormat} • {match.matchDesc}
        </span>
        <span style={{ fontSize: 10, color: "#8a8578" }}>{match.seriesName?.slice(0, 20)}</span>
      </div>
      {[{ team: match.team1, score: s1 }, { team: match.team2, score: s2 }].map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 9, marginBottom: 5, background: i === 0 ? "#faf7f2" : "#f5f0e8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <TeamLogo imageId={item.team?.imageId} name={item.team?.teamName} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{item.team?.shortName || item.team?.teamName || "TBA"}</span>
          </div>
          {item.score ? (
            <span style={{ fontSize: 17, fontFamily: "monospace", fontWeight: 800, color: "#4a7c59" }}>
              {item.score.runs}/{item.score.wickets} <span style={{ fontSize: 11, color: "#8a8578", fontWeight: 400 }}>({item.score.overs})</span>
            </span>
          ) : <span style={{ fontSize: 12, color: "#8a8578" }}>Yet to bat</span>}
        </div>
      ))}
      <div style={{ fontSize: 12, color: "#3a3a36", fontWeight: 600, padding: "7px 10px", background: "#f5ede0", borderRadius: 7, borderLeft: `3px solid ${color}`, marginTop: 4 }}>
        {match.status}
      </div>
    </div>
  );
}

function MatchesTab() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAPI("/matches/v1/live").then(data => {
      const all = [];
      data.typeMatches?.forEach(t => {
        t.seriesMatches?.forEach(s => {
          const w = s.seriesAdWrapper || s;
          w.matches?.forEach(m => {
            if (!m.matchInfo) return;
            const sc = m.matchScore;
            all.push({
              ...m.matchInfo,
              score1: sc?.team1Score?.inngs1 ? { runs: sc.team1Score.inngs1.runs, wickets: sc.team1Score.inngs1.wickets, overs: sc.team1Score.inngs1.overs } : null,
              score2: sc?.team2Score?.inngs1 ? { runs: sc.team2Score.inngs1.runs, wickets: sc.team2Score.inngs1.wickets, overs: sc.team2Score.inngs1.overs } : null,
            });
          });
        });
      });
      setMatches(all);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;
  if (!matches.length) return <Empty msg="No live matches right now" />;
  return <>{matches.map((m, i) => <MatchCard key={m.matchId || i} match={m} />)}</>;
}

// ── TABLE TAB ────────────────────────────────────────────────────────────────
function TableTab() {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // IPL 2024 series ID = 7607
    fetchAPI("/series/v1/7607/points-table").then(data => {
      const rows = [];
      data.pointsTable?.[0]?.pointsTableInfo?.forEach(t => rows.push(t));
      setTable(rows);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;
  if (!table.length) return <Empty msg="Points table unavailable" />;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 36px 36px 36px 50px 50px", gap: 4, padding: "10px 14px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
        {["#", "Team", "M", "W", "L", "NRR", "Pts"].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Team" ? "left" : "center" }}>{h}</span>
        ))}
      </div>
      {table.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr 36px 36px 36px 50px 50px", gap: 4, padding: "10px 14px", borderBottom: "1px solid #f5f0e8", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#8a8578", textAlign: "center" }}>{i + 1}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TeamLogo imageId={row.teamId} size={22} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{row.teamSName || row.teamName}</span>
          </div>
          {[row.matchesPlayed, row.won, row.lost, row.nrr > 0 ? `+${row.nrr}` : row.nrr, row.points].map((v, j) => (
            <span key={j} style={{ fontSize: 12, fontFamily: "monospace", fontWeight: j === 4 ? 800 : 400, color: j === 4 ? "#4a7c59" : "#3a3a36", textAlign: "center" }}>{v}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── STATS TAB ────────────────────────────────────────────────────────────────
function StatsTab() {
  const [batters, setBatters] = useState([]);
  const [bowlers, setBowlers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAPI("/stats/v1/series/7607/most-runs"),
      fetchAPI("/stats/v1/series/7607/most-wickets"),
    ]).then(([r, w]) => {
      setBatters(r.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 5) || []);
      setBowlers(w.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 5) || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const StatTable = ({ title, rows, cols }) => (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a18" }}>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "30px 1fr " + cols.map(() => "50px").join(" "), gap: 4, padding: "8px 14px", borderBottom: "1px solid #f5f0e8" }}>
        {["#", "Player", ...cols].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Player" ? "left" : "center" }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "30px 1fr " + cols.map(() => "50px").join(" "), gap: 4, padding: "10px 14px", borderBottom: "1px solid #f5f0e8", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#8a8578", textAlign: "center" }}>{i + 1}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{r.name}</div>
            <div style={{ fontSize: 10, color: "#8a8578" }}>{r.teamName}</div>
          </div>
          {r.values?.slice(0, cols.length).map((v, j) => (
            <span key={j} style={{ fontSize: 13, fontFamily: "monospace", fontWeight: j === cols.length - 1 ? 800 : 400, color: j === cols.length - 1 ? "#4a7c59" : "#3a3a36", textAlign: "center" }}>{v.value}</span>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <StatTable title="🏏 Most Runs" rows={batters} cols={["M", "Avg", "Runs"]} />
      <StatTable title="🎯 Most Wickets" rows={bowlers} cols={["M", "Econ", "W"]} />
    </>
  );
}

// ── PLAYERS TAB ──────────────────────────────────────────────────────────────
function PlayersTab() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI("/series/v1/7607/squads").then(data => {
      const all = [];
      data.squads?.forEach(squad => {
        squad.players?.forEach(p => {
          if (all.length < 18) all.push({ ...p, teamName: squad.teamName });
        });
      });
      setPlayers(all);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (!players.length) return <Empty msg="Player data unavailable" />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      {players.map((p, i) => (
        <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid #f0e8dc", overflow: "hidden", textAlign: "center" }}>
          <img
            src={`https://${HOST}/img/v1/i1/c${p.id}/i.jpg`}
            style={{ width: "100%", height: 90, objectFit: "cover" }}
            onError={e => { e.target.src = ""; e.target.style.background = "#f5ede0"; e.target.style.height = "90px"; }}
          />
          <div style={{ padding: "8px 6px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a18" }}>{p.name}</div>
            <div style={{ fontSize: 9, color: "#8a8578", marginTop: 2 }}>{p.role}</div>
            <div style={{ fontSize: 9, color: "#c4956a", marginTop: 2 }}>{p.teamName}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
const Loader = () => (
  <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>🏏</div>
    <div>Loading...</div>
  </div>
);

const ErrorMsg = ({ msg }) => (
  <div style={{ padding: 20, borderRadius: 12, background: "#fff0f0", border: "1px solid #ffcccc", color: "#cc0000", fontSize: 13 }}>⚠️ {msg}</div>
);

const Empty = ({ msg }) => (
  <div style={{ textAlign: "center", padding: 60, color: "#8a8578" }}>
    <div style={{ fontSize: 32, marginBottom: 12 }}>😴</div>
    <div style={{ fontWeight: 600 }}>{msg}</div>
  </div>
);

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS = ["Matches", "Table", "Stats", "Players"];

export default function ScoresPage({ onBack }) {
  const [activeTab, setActiveTab] = useState("Matches");

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#faf7f2", borderBottom: "1px solid #f0e8dc" }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18" }}>
              Cric<span style={{ color: "#c4956a" }}>Stream</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "2px solid #f0e8dc", padding: "0 24px" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 18px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              color: activeTab === tab ? "#1a1a18" : "#8a8578",
              borderBottom: activeTab === tab ? "2px solid #c4956a" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 16px" }}>
        {activeTab === "Matches" && <MatchesTab />}
        {activeTab === "Table"   && <TableTab />}
        {activeTab === "Stats"   && <StatsTab />}
        {activeTab === "Players" && <PlayersTab />}
      </div>
    </div>
  );
}
