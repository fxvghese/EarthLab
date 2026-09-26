import { motion } from "framer-motion";
import { Leaf, Droplets, Wind, Sparkles } from "lucide-react";
import { CursorCard, CursorCardSpot, CursorCardBorder } from "@/components/ui/cursor-card";

export default function Home({ onPlay }: { onPlay: () => void }) {
  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4 }}
      className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-ink px-6 py-16"
    >
      {/* ambient glows */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full bg-leaf/10 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-sun/10 blur-[140px]" />

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="relative z-10 flex max-w-2xl flex-col items-center text-center"
      >
        <span className="mb-5 flex items-center gap-2 rounded-full border border-leaf/25 bg-leaf/10 px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-leaf-soft">
          <Sparkles className="h-3.5 w-3.5" />
          Interactive demo
        </span>
        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight text-mist md:text-6xl">
          Land <span className="text-leaf text-glow-leaf">&amp;</span> Life
        </h1>
        <p className="mt-5 max-w-lg text-balance text-base leading-relaxed text-mist/70">
          A living forest structure &amp; carbon simulator. Plant trees, balance water and watch atmospheric carbon fall as your ecosystem grows.
        </p>

        <CursorCard
          onClick={onPlay}
          glowColor="52, 211, 153"
          className="group mt-10 w-full max-w-md cursor-pointer p-6 text-left"
          role="button"
          aria-label="Enter the Land and Life simulator"
        >
          <CursorCardSpot />
          <CursorCardBorder />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-mist">
                <Leaf className="h-4 w-4 text-leaf" />
                Forest structure &amp; carbon simulator
              </div>
              <p className="mt-2 text-xs leading-relaxed text-mist/60">
                Plant trees · balance water · grow biomass · cut atmospheric carbon
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-mist/45">
                <span className="flex items-center gap-1"><Leaf className="h-3 w-3 text-leaf" />5 species</span>
                <span className="flex items-center gap-1"><Droplets className="h-3 w-3 text-water" />water cycle</span>
                <span className="flex items-center gap-1"><Wind className="h-3 w-3 text-sun" />carbon budget</span>
              </div>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-leaf/30 bg-leaf/10 text-leaf transition-transform duration-300 group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </CursorCard>

        <p className="mt-6 text-[10px] uppercase tracking-[0.25em] text-mist/35">Built for the sustainability hackathon</p>
      </motion.div>
    </motion.main>
  );
}
