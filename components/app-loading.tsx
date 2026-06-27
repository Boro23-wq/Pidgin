export default function AppLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "hsl(240 10% 3.9%)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/pidgin-main.png"
        alt="Pidgin"
        className="w-7 h-7"
        style={{ animation: "pidgin-breathe 1.8s ease-in-out infinite" }}
      />
    </div>
  );
}
