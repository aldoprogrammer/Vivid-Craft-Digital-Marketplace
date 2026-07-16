interface BarChartItem {
  label: string;
  value: number;
  color: string;
}

interface BarChartProps {
  title: string;
  items: BarChartItem[];
  valuePrefix?: string;
}

export function BarChart({ title, items, valuePrefix = '' }: BarChartProps) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="glass-panel p-5 sm:p-6">
      <h3 className="text-sm font-semibold text-content mb-4">{title}</h3>
      {items.every((i) => i.value === 0) ? (
        <p className="text-sm text-mist py-6 text-center">No data yet</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-mist">{item.label}</span>
                <span className="text-content font-medium">
                  {valuePrefix}
                  {item.value}
                </span>
              </div>
              <div className="h-3 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(item.value / max) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
