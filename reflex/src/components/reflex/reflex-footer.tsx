export function ReflexFooter() {
  return (
    <footer className="pointer-events-none shrink-0 px-4 pb-3 lg:px-6">
      <div className="glass-soft pointer-events-auto mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full px-4 py-2 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">Reflex</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="hidden sm:inline">local-first email triage</span>
          <span className="hidden text-muted-foreground/40 md:inline">·</span>
          <span className="hidden md:inline">decide-first, generate rarely</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono">$0 forever</span>
          <span className="text-muted-foreground/40">·</span>
          <span className="hidden sm:inline font-mono">33ms</span>
          <span className="hidden text-muted-foreground/40 sm:inline">·</span>
          <span className="hidden sm:inline">calibrated</span>
        </div>
      </div>
    </footer>
  );
}
