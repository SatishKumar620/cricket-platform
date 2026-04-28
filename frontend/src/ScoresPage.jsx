export default function ScoresPage({ onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#faf7f2", fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "#faf7f2", borderBottom: "1px solid #f0e8dc" }}>
        <div style={{ padding: "14px 24px", display: "flex", alignItems: "center" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#8a8578" }}>← Back</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: "#1a1a18", marginLeft: 14 }}>
            Cric<span style={{ color: "#c4956a" }}>Stream</span>
          </div>
        </div>
      </div>

      {/* Widget via iframe */}
      <div style={{ flex: 1, width: "100%" }}>
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background: #faf7f2; display: flex; justify-content: center; }
                #vmatchlist-widget { width: 100% !important; }
              </style>
            </head>
            <body>
              <div id="vmatchlist-widget"></div>
              <script src="https://cdorgapi.b-cdn.net/widgets/vmatchlist.js"></script>
            </body>
            </html>
          `}
          style={{ width: "100%", height: "100vh", border: "none" }}
          title="Cricket Matches"
        />
      </div>
    </div>
  );
}
