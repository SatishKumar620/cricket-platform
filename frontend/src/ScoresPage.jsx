import { useEffect, useRef } from "react";

export default function ScoresPage({ onBack }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdorgapi.b-cdn.net/widgets/vmatchlist.js";
    script.async = true;
    document.body.appendChild(script);

    // Scale widget to fill container width
    const scaleWidget = () => {
      const widget = document.querySelector("#vmatchlist-widget iframe, #vmatchlist-widget > div");
      if (widget && containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const widgetWidth = widget.offsetWidth || 250;
        const scale = containerWidth / widgetWidth;
        widget.style.transform = `scale(${scale})`;
        widget.style.transformOrigin = "top left";
        containerRef.current.style.height = `${(widget.offsetHeight || 600) * scale}px`;
      }
    };

    // Try scaling after widget loads
    const timer = setInterval(scaleWidget, 500);
    setTimeout(() => clearInterval(timer), 10000);
    window.addEventListener("resize", scaleWidget);

    return () => {
      document.body.removeChild(script);
      clearInterval(timer);
      window.removeEventListener("resize", scaleWidget);
    };
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
      <div ref={containerRef} style={{ width: "100%", overflow: "hidden", padding: "0", marginTop: 0 }}>
        <div id="vmatchlist-widget" style={{ transformOrigin: "top left" }} />
      </div>
    </div>
  );
}
