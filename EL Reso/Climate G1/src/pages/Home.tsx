import { CursorCard } from "@/components/ui/cursor-card";

/**
 * Minimal homepage — its only job is to hand off to the game page via a
 * plain window.location redirect (no router). Drop this card into any
 * existing site to link the game.
 */
export default function Home() {
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    window.location.href = "climate.html";
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070d] px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 20% 0%, rgba(251,146,60,0.10), transparent 60%), radial-gradient(800px 500px at 85% 100%, rgba(56,189,248,0.08), transparent 60%)",
        }}
      />
      <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center backdrop-blur-sm">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-3xl">
          🌡️
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50">
          Climate <span className="text-zinc-500">&amp;</span> Atmosphere
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">
          An interactive sustainability game. Raise the global temperature and watch sea level,
          heat, farmland and ecosystems respond in real time.
        </p>

        <div className="mt-7">
          <CursorCard
            href="climate.html"
            onClick={go}
            image="/climate-preview.svg"
            description="Open the climate simulator — one slider, one living world."
            className="!inline-flex !items-center !gap-2 !rounded-xl !bg-emerald-400 !px-6 !py-3 !text-sm !font-bold !text-emerald-950 !no-underline shadow-[0_8px_30px_rgba(52,211,153,0.25)] transition-all duration-200 hover:!bg-emerald-300 hover:shadow-[0_8px_40px_rgba(52,211,153,0.4)] active:scale-95"
          >
            Play the climate game →
          </CursorCard>
        </div>

        <p className="mt-6 text-[11px] text-zinc-600">
          Simplified educational simulation · hover the button for a preview
        </p>
      </div>
    </main>
  );
}
