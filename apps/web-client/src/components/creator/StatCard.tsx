interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  accent?: 'teal' | 'violet' | 'amber' | 'slate';
}

const ACCENT_BAR: Record<NonNullable<StatCardProps['accent']>, string> = {
  teal: 'bg-brand-accent',
  violet: 'bg-brand-primary',
  amber: 'bg-amber-500',
  slate: 'bg-brand-secondary',
};

export function StatCard({ label, value, hint, accent = 'teal' }: StatCardProps) {
  return (
    <div className="glass-panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-mist mb-2">{label}</p>
      <p className="text-3xl font-display font-bold text-content">{value}</p>
      {hint && <p className="text-xs text-mist mt-2">{hint}</p>}
      <span className={`inline-block mt-3 h-1 w-10 rounded-full ${ACCENT_BAR[accent]}`} />
    </div>
  );
}
