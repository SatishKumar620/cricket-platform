import { useEffect } from "react";

export default function ScoresPage({ onBack }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdorgapi.b-cdn.net/widgets/vmatchlist.js";
    script.async = true;
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#faf7f2", borderBottom: "1px solid #f0e8dc" }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18", marginLeft: 14 }}>
            Cric<span style={{ color: "#c4956a" }}>Stream</span>
          </div>
        </div>
      </div>

      {/* Widget */}
      <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
        <div id="vmatchlist-widget"></div>
      </div>
    </div>
  );
}
