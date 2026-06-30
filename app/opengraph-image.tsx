import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Pidgin — All the signal. None of the noise.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#0a0a0f",
          padding: "72px 80px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -160,
            right: -160,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(13,162,231,0.22) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        {/* Background glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: 100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #0da2e7 0%, #2563eb 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ color: "#fff", fontSize: 28, fontWeight: 800, display: "flex" }}>P</div>
          </div>
          <span
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-0.5px",
            }}
          >
            Pidgin
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 76, fontWeight: 800, color: "#ffffff", letterSpacing: "-2px", lineHeight: 1.05, display: "flex" }}>
            All the signal.
          </span>
          <span style={{ fontSize: 76, fontWeight: 800, color: "#0da2e7", letterSpacing: "-2px", lineHeight: 1.05, display: "flex" }}>
            None of the noise.
          </span>
          <span style={{ fontSize: 28, color: "rgba(255,255,255,0.4)", marginTop: 20, fontWeight: 400, display: "flex" }}>
            Your newsletters, summarized and delivered daily.
          </span>
        </div>

        {/* Bottom pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 22px",
            borderRadius: 100,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "flex" }} />
          <span style={{ fontSize: 17, color: "rgba(255,255,255,0.5)", fontWeight: 500, display: "flex" }}>
            Invite-only alpha · pidgin.site
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
