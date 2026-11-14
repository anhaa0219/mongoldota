/** Glass card with a small title, used by every Stats page panel. */
export function StatPanel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`glass-panel rounded-[1.6rem] p-[1.4rem] ${className}`}>
      <h2 className="font-display text-[1.4rem] uppercase tracking-[0.06em] text-white/70">{title}</h2>
      <div className="mt-[0.9rem]">{children}</div>
    </section>
  );
}
