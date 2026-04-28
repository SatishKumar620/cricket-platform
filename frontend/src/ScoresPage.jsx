import { useState, useEffect } from "react";

const RAPID_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const HOST = "cricbuzz-cricket.p.rapidapi.com";

const fetchAPI = async (path) => {
  const res = await fetch(`https://${HOST}${path}`, {
    headers: { "x-rapidapi-key": RAPID_KEY, "x-rapidapi-host": HOST },
  });
  return res.json();
};

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

const TeamLogo = ({ imageId, size = 28 }) => (
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

const typeColor = { T20: "#c4956a", ODI: "#4a7c59", TEST: "#3a6fa8", T20I: "#c4956a", "TEST MATCH": "#3a6fa8" };
const getColor = (fmt) => typeColor[(fmt || "T20").toUpperCase()] || "#8a8578";

// ── SCORECARD PAGE ───────────────────────────────────────────────────────────
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
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0e8dc", display: "flex", alignItems: "center", gap: 14 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Scorecard</span>
      </div>
      <Loader />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif", padding: 24 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578", marginBottom: 16 }}>← Back</button>
      <ErrorMsg msg={error} />
    </div>
  );

  const innings = data?.scorecard || [];

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#faf7f2", borderBottom: "1px solid #f0e8dc" }}>
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#1a1a18" }}>{matchName}</div>
            <div style={{ fontSize: 10, color: "#8a8578" }}>{data?.matchHeader?.status}</div>
          </div>
        </div>
        {/* Innings tabs */}
        {innings.length > 1 && (
          <div style={{ display: "flex", padding: "0 20px", borderTop: "1px solid #f0e8dc" }}>
            {innings.map((inn, i) => (
              <button key={i} onClick={() => setActiveInnings(i)} style={{
                padding: "8px 14px", border: "none", background: "none", cursor: "pointer",
                fontSize: 11, fontWeight: 600,
                color: activeInnings === i ? "#1a1a18" : "#8a8578",
                borderBottom: activeInnings === i ? "2px solid #c4956a" : "2px solid transparent",
                whiteSpace: "nowrap",
              }}>{inn.batTeamDetails?.batTeamShortName || `Inn ${i+1}`}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "16px" }}>
        {innings[activeInnings] && (() => {
          const inn = innings[activeInnings];
          const batters = Object.values(inn.batTeamDetails?.batsmenData || {});
          const bowlers = Object.values(inn.bowlTeamDetails?.bowlersData || {});
          const fow = inn.wicketsData ? Object.values(inn.wicketsData) : [];
          const total = inn.scoreDetails;

          return (
            <>
              {/* Score summary */}
              <div style={{ background: "#1a1a18", borderRadius: 14, padding: "16px 20px", marginBottom: 14, color: "#fff" }}>
                <div style={{ fontSize: 13, color: "#c4956a", marginBottom: 4 }}>
                  {inn.batTeamDetails?.batTeamName}
                </div>
                <div style={{ fontSize: 32, fontFamily: "monospace", fontWeight: 800 }}>
                  {total?.runs}/{total?.wickets}
                  <span style={{ fontSize: 14, fontWeight: 400, color: "#aaa", marginLeft: 10 }}>({total?.overs} ov)</span>
                </div>
              </div>

              {/* Batting */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a18" }}>🏏 Batting</span>
                </div>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px 36px 36px 50px", gap: 4, padding: "8px 14px", borderBottom: "1px solid #f5f0e8" }}>
                  {["Batter", "R", "B", "4s", "6s", "SR"].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Batter" ? "left" : "center" }}>{h}</span>
                  ))}
                </div>
                {batters.filter(b => b.runs !== undefined).map((b, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px 36px 36px 50px", gap: 4, padding: "10px 14px", borderBottom: "1px solid #f5f0e8", alignItems: "start" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{b.batName}</div>
                      <div style={{ fontSize: 9, color: "#8a8578", marginTop: 2 }}>{b.outDesc || "batting"}</div>
                    </div>
                    {[b.runs, b.balls, b.fours, b.sixes].map((v, j) => (
                      <span key={j} style={{ fontSize: 13, fontFamily: "monospace", fontWeight: j === 0 ? 800 : 400, color: j === 0 ? "#1a1a18" : "#6b6560", textAlign: "center" }}>{v ?? "-"}</span>
                    ))}
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: parseFloat(b.strikeRate) > 150 ? "#c4956a" : "#6b6560", textAlign: "center" }}>{b.strikeRate ?? "-"}</span>
                  </div>
                ))}
                {/* Extras + Total */}
                <div style={{ padding: "8px 14px", borderTop: "1px solid #f0e8dc", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "#8a8578" }}>Extras: {inn.extrasData?.total ?? 0} (b {inn.extrasData?.byes ?? 0}, lb {inn.extrasData?.legByes ?? 0}, w {inn.extrasData?.wides ?? 0}, nb {inn.extrasData?.noBalls ?? 0})</span>
                </div>
              </div>

              {/* Bowling */}
              <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a18" }}>🎯 Bowling</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px 36px 36px 50px", gap: 4, padding: "8px 14px", borderBottom: "1px solid #f5f0e8" }}>
                  {["Bowler", "O", "M", "R", "W", "Econ"].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Bowler" ? "left" : "center" }}>{h}</span>
                  ))}
                </div>
                {bowlers.map((b, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px 36px 36px 36px 50px", gap: 4, padding: "10px 14px", borderBottom: "1px solid #f5f0e8", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{b.bowlName}</span>
                    {[b.overs, b.maidens, b.runs, b.wickets].map((v, j) => (
                      <span key={j} style={{ fontSize: 13, fontFamily: "monospace", fontWeight: j === 3 ? 800 : 400, color: j === 3 ? "#4a7c59" : "#6b6560", textAlign: "center" }}>{v ?? "-"}</span>
                    ))}
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: parseFloat(b.economy) > 10 ? "#ff4d4f" : "#6b6560", textAlign: "center" }}>{b.economy ?? "-"}</span>
                  </div>
                ))}
              </div>

              {/* Fall of Wickets */}
              {fow.length > 0 && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1a1a18" }}>📉 Fall of Wickets</span>
                  </div>
                  <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {fow.map((w, i) => (
                      <div key={i} style={{ background: "#f5f0e8", borderRadius: 8, padding: "5px 10px", fontSize: 11 }}>
                        <span style={{ fontWeight: 700, color: "#1a1a18" }}>{w.wktRuns}/{w.wktNbr}</span>
                        <span style={{ color: "#8a8578", marginLeft: 5 }}>({w.batName}, {w.wktOver} ov)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}

// ── MATCH CARD ───────────────────────────────────────────────────────────────
function MatchCard({ match, onClick, isLive }) {
  const color = getColor(match.matchFormat);
  const s1 = match.score1;
  const s2 = match.score2;

  return (
    <div onClick={onClick} style={{
      background: "#fff", borderRadius: 14,
      border: isLive ? `1.5px solid ${color}` : "1.5px solid #f0e8dc",
      padding: "14px 16px", marginBottom: 10,
      boxShadow: isLive ? `0 2px 12px ${color}22` : "0 2px 8px rgba(0,0,0,0.04)",
      cursor: "pointer", transition: "transform 0.15s",
    }}
    onTouchStart={e => e.currentTarget.style.transform = "scale(0.98)"}
    onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isLive && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4f", animation: "livePulse 1s infinite" }} />}
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color, background: `${color}18`, padding: "3px 8px", borderRadius: 6 }}>
            {match.matchFormat} {isLive ? "• LIVE" : ""}
          </span>
        </div>
        <span style={{ fontSize: 10, color: "#8a8578" }}>{match.seriesName?.slice(0, 22)}</span>
      </div>

      {[{ team: match.team1, score: s1 }, { team: match.team2, score: s2 }].map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", borderRadius: 9, marginBottom: 5, background: i === 0 ? "#faf7f2" : "#f5f0e8" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <TeamLogo imageId={item.team?.imageId} />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{item.team?.shortName || item.team?.teamName || "TBA"}</span>
          </div>
          {item.score ? (
            <span style={{ fontSize: 17, fontFamily: "monospace", fontWeight: 800, color: "#4a7c59" }}>
              {item.score.runs}/{item.score.wickets}
              <span style={{ fontSize: 11, color: "#8a8578", fontWeight: 400 }}> ({item.score.overs})</span>
            </span>
          ) : <span style={{ fontSize: 12, color: "#8a8578" }}>Yet to bat</span>}
        </div>
      ))}

      <div style={{ fontSize: 12, color: "#3a3a36", fontWeight: 600, padding: "7px 10px", background: "#f5ede0", borderRadius: 7, borderLeft: `3px solid ${color}`, marginTop: 4, display: "flex", justifyContent: "space-between" }}>
        <span>{match.status}</span>
        <span style={{ fontSize: 10, color: "#c4956a" }}>Tap for scorecard →</span>
      </div>
    </div>
  );
}

// ── MATCHES TAB ──────────────────────────────────────────────────────────────
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
            score1: sc?.team1Score?.inngs1 ? { runs: sc.team1Score.inngs1.runs, wickets: sc.team1Score.inngs1.wickets, overs: sc.team1Score.inngs1.overs } : null,
            score2: sc?.team2Score?.inngs1 ? { runs: sc.team2Score.inngs1.runs, wickets: sc.team2Score.inngs1.wickets, overs: sc.team2Score.inngs1.overs } : null,
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

  return (
    <>
      {liveMatches.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#ff4d4f", letterSpacing: 2, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff4d4f" }} />
            LIVE NOW
          </div>
          {liveMatches.map((m, i) => <MatchCard key={m.matchId || i} match={m} isLive={true} onClick={() => onSelectMatch(m.matchId, `${m.team1?.teamName} vs ${m.team2?.teamName}`)} />)}
        </>
      )}

      {recentMatches.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#8a8578", letterSpacing: 2, margin: "16px 0 10px" }}>RECENT</div>
          {recentMatches.map((m, i) => <MatchCard key={m.matchId || i} match={m} isLive={false} onClick={() => onSelectMatch(m.matchId, `${m.team1?.teamName} vs ${m.team2?.teamName}`)} />)}
        </>
      )}

      {upcomingMatches.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 800, color: "#8a8578", letterSpacing: 2, margin: "16px 0 10px" }}>UPCOMING</div>
          {upcomingMatches.map((m, i) => (
            <div key={m.matchId || i} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", padding: "14px 16px", marginBottom: 10, opacity: 0.8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 2, color: getColor(m.matchFormat), background: `${getColor(m.matchFormat)}18`, padding: "3px 8px", borderRadius: 6 }}>{m.matchFormat}</span>
                <span style={{ fontSize: 10, color: "#8a8578" }}>{m.seriesName?.slice(0, 22)}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#faf7f2", borderRadius: 9 }}>
                <TeamLogo imageId={m.team1?.imageId} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{m.team1?.shortName}</span>
                <span style={{ fontSize: 11, color: "#8a8578", margin: "0 6px" }}>vs</span>
                <TeamLogo imageId={m.team2?.imageId} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a1a18" }}>{m.team2?.shortName}</span>
              </div>
              <div style={{ fontSize: 11, color: "#8a8578", marginTop: 8, padding: "0 4px" }}>
                {m.venueInfo?.ground} • {new Date(parseInt(m.startDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
        </>
      )}

      {!liveMatches.length && !recentMatches.length && !upcomingMatches.length && <Empty msg="No matches found" />}
    </>
  );
}

// ── TABLE TAB ────────────────────────────────────────────────────────────────
function TableTab() {
  const [table, setTable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAPI("/series/v1/9237/points-table")
      .then(data => {
        const rows = data.pointsTable?.[0]?.pointsTableInfo || [];
        setTable(rows);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorMsg msg={error} />;
  if (!table.length) return <Empty msg="Points table unavailable" />;

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a18" }}>🏆 IPL 2026 Standings</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px 55px 45px", gap: 4, padding: "8px 12px", borderBottom: "1px solid #f5f0e8" }}>
        {["#", "Team", "M", "W", "L", "NRR", "Pts"].map(h => (
          <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Team" ? "left" : "center" }}>{h}</span>
        ))}
      </div>
      {table.map((row, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr 32px 32px 32px 55px 45px", gap: 4, padding: "10px 12px", borderBottom: "1px solid #f5f0e8", alignItems: "center", background: i < 4 ? "#fafff8" : "#fff" }}>
          <span style={{ fontSize: 12, color: i < 4 ? "#4a7c59" : "#8a8578", fontWeight: i < 4 ? 700 : 400, textAlign: "center" }}>{i + 1}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <TeamLogo imageId={row.teamId} size={22} />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{row.teamSName || row.teamName}</span>
          </div>
          {[row.matchesPlayed, row.won, row.lost].map((v, j) => (
            <span key={j} style={{ fontSize: 12, fontFamily: "monospace", color: "#3a3a36", textAlign: "center" }}>{v}</span>
          ))}
          <span style={{ fontSize: 11, fontFamily: "monospace", color: parseFloat(row.nrr) > 0 ? "#4a7c59" : "#ff4d4f", textAlign: "center" }}>
            {parseFloat(row.nrr) > 0 ? `+${row.nrr}` : row.nrr}
          </span>
          <span style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 800, color: "#1a1a18", textAlign: "center" }}>{row.points}</span>
        </div>
      ))}
      <div style={{ padding: "8px 12px", fontSize: 10, color: "#8a8578" }}>Top 4 qualify for playoffs</div>
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
      fetchAPI("/stats/v1/series/9237/most-runs"),
      fetchAPI("/stats/v1/series/9237/most-wickets"),
    ]).then(([r, w]) => {
      setBatters(r.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 8) || []);
      setBowlers(w.appIndex?.sectionList?.[0]?.statsDetails?.slice(0, 8) || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  const StatTable = ({ title, rows, cols }) => (
    <div style={{ background: "#fff", borderRadius: 14, border: "1.5px solid #f0e8dc", overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "12px 16px", background: "#f5ede0", borderBottom: "1px solid #f0e8dc" }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#1a1a18" }}>{title}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "28px 1fr " + cols.map(() => "46px").join(" "), gap: 4, padding: "8px 14px", borderBottom: "1px solid #f5f0e8" }}>
        {["#", "Player", ...cols].map(h => <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#8a8578", textAlign: h === "Player" ? "left" : "center" }}>{h}</span>)}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr " + cols.map(() => "46px").join(" "), gap: 4, padding: "10px 14px", borderBottom: "1px solid #f5f0e8", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#8a8578", textAlign: "center" }}>{i + 1}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a18" }}>{r.name}</div>
            <div style={{ fontSize: 10, color: "#8a8578" }}>{r.teamName}</div>
          </div>
          {r.values?.slice(0, cols.length).map((v, j) => (
            <span key={j} style={{ fontSize: 13, fontFamily: "monospace", fontWeight: j === cols.length - 1 ? 800 : 400, color: j === cols.length - 1 ? "#4a7c59" : "#6b6560", textAlign: "center" }}>{v.value}</span>
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
    fetchAPI("/series/v1/9237/squads").then(data => {
      const all = [];
      data.squads?.forEach(squad => {
        squad.players?.slice(0, 3).forEach(p => {
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
            style={{ width: "100%", height: 90, objectFit: "cover", background: "#f5ede0" }}
            onError={e => { e.target.style.background = "#f5ede0"; e.target.src = ""; }}
          />
          <div style={{ padding: "8px 6px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1a18" }}>{p.name}</div>
            <div style={{ fontSize: 9, color: "#8a8578", marginTop: 2 }}>{p.role}</div>
            <div style={{ fontSize: 9, color: "#c4956a", marginTop: 2 }}>{p.teamName?.slice(0, 12)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const TABS = ["Matches", "Table", "Stats", "Players"];

export default function ScoresPage({ onBack }) {
  const [activeTab, setActiveTab] = useState("Matches");
  const [selectedMatch, setSelectedMatch] = useState(null);

  if (selectedMatch) {
    return <ScorecardPage matchId={selectedMatch.id} matchName={selectedMatch.name} onBack={() => setSelectedMatch(null)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }`}</style>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#faf7f2", borderBottom: "1px solid #f0e8dc" }}>
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18" }}>
            Cric<span style={{ color: "#c4956a" }}>Stream</span>
          </div>
        </div>
        <div style={{ display: "flex", borderBottom: "2px solid #f0e8dc", padding: "0 20px" }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "10px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              color: activeTab === tab ? "#1a1a18" : "#8a8578",
              borderBottom: activeTab === tab ? "2px solid #c4956a" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.2s",
              fontFamily: "'DM Sans', sans-serif",
            }}>{tab}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        {activeTab === "Matches" && <MatchesTab onSelectMatch={(id, name) => setSelectedMatch({ id, name })} />}
        {activeTab === "Table"   && <TableTab />}
        {activeTab === "Stats"   && <StatsTab />}
        {activeTab === "Players" && <PlayersTab />}
      </div>
    </div>
  );
}
