import { useId, useMemo, useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

interface ProgressChartProps {
  completedLessons: Set<string>;
  totalLessons: number;
}

function getProgressLog(): { date: string; count: number }[] {
  try {
    return JSON.parse(localStorage.getItem("course-progress-log") || "[]");
  } catch {
    return [];
  }
}

export function logProgress(count: number) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const log = getProgressLog();
    const existing = log.find(e => e.date === today);
    if (existing) {
      existing.count = count;
    } else {
      log.push({ date: today, count });
    }
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const filtered = log.filter(e => e.date >= cutoff.toISOString().slice(0, 10));
    localStorage.setItem("course-progress-log", JSON.stringify(filtered));
  } catch {}
}

/** Hook: measure a container's width via ResizeObserver */
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Initial measurement
    const rect = el.getBoundingClientRect();
    if (rect.width > 0) setWidth(Math.floor(rect.width));

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) setWidth(Math.floor(w));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

export function ProgressChart({ completedLessons, totalLessons }: ProgressChartProps) {
  const gradientId = `pg_${useId().replace(/:/g, '')}`;
  const { ref: containerRef, width: chartWidth } = useContainerWidth();
  const CHART_HEIGHT = 160;

  const chartData = useMemo(() => {
    const log = getProgressLog();
    if (log.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ idx: 0, date: today, count: completedLessons.size }];
    }

    // Deduplicate by date, keeping the latest count per date
    const dateMap = new Map<string, number>();
    for (const e of log) {
      if (e.date && typeof e.date === 'string') {
        dateMap.set(e.date, e.count ?? 0);
      }
    }
    
    if (dateMap.size === 0) {
      const today = new Date().toISOString().slice(0, 10);
      return [{ idx: 0, date: today, count: completedLessons.size }];
    }
    
    const sorted = [...dateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    if (sorted.length === 1) {
      return sorted.map((d, i) => ({ ...d, idx: i }));
    }

    // Fill gaps day by day using UTC to avoid timezone issues
    const filled: { date: string; count: number }[] = [];
    const startParts = sorted[0].date.split('-').map(Number);
    const endDate = sorted[sorted.length - 1].date;
    const cursor = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2]));
    let lastCount = 0;
    const seen = new Set<string>();

    while (filled.length < 365) {
      const dateStr = cursor.toISOString().slice(0, 10);
      if (seen.has(dateStr)) {
        // Safety: skip if already seen (shouldn't happen with UTC)
        cursor.setUTCDate(cursor.getUTCDate() + 1);
        continue;
      }
      seen.add(dateStr);
      const entry = dateMap.get(dateStr);
      if (entry !== undefined) lastCount = entry;
      filled.push({ date: dateStr, count: lastCount });
      if (dateStr >= endDate) break;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return filled.slice(-30).map((d, i) => ({ ...d, idx: i }));
  }, [completedLessons]);

  if (chartData.length < 2) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 shadow-sm shadow-black/[0.02]">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <span className="text-[0.875rem] font-semibold">Прогресс по дням</span>
        </div>
        <div className="text-center py-8">
          <Calendar className="w-7 h-7 text-muted-foreground/15 mx-auto mb-2" />
          <p className="text-[0.8125rem] text-muted-foreground/40">
            Данные появятся через пару дней
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-border/40 p-5 shadow-sm shadow-black/[0.02]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <span className="text-[0.875rem] font-semibold">Прогресс по дням</span>
        </div>
        <span className="text-[0.75rem] text-muted-foreground/40 tabular-nums">
          {completedLessons.size}/{totalLessons}
        </span>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: CHART_HEIGHT }}>
        {chartWidth > 0 && (
          <AreaChart
            width={chartWidth}
            height={CHART_HEIGHT}
            data={chartData}
            margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
          >
            <defs key="chart-defs">
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d9488" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#0d9488" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid key="chart-grid" strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              key="chart-xaxis"
              dataKey="idx"
              type="number"
              domain={[0, chartData.length - 1]}
              tickFormatter={(idx: number) => {
                const d = chartData[idx];
                return d ? formatDate(d.date) : "";
              }}
              ticks={chartData.length <= 7
                ? chartData.map(d => d.idx)
                : chartData.filter((_, i) => i % Math.ceil(chartData.length / 6) === 0 || i === chartData.length - 1).map(d => d.idx)
              }
              tick={{ fontSize: 10, fill: "#b0b0b0" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              key="chart-yaxis"
              type="number"
              tick={{ fontSize: 10, fill: "#b0b0b0" }}
              axisLine={false}
              tickLine={false}
              domain={[0, totalLessons]}
            />
            <Tooltip
              key="chart-tooltip"
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e4e4e7",
                fontSize: 12,
                padding: "8px 12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              formatter={(value: number) => [`${value} уроков`, "Пройдено"]}
              labelFormatter={(idx: number) => {
                const d = chartData[idx];
                return d ? formatDate(d.date) : "";
              }}
            />
            <Area
              key="chart-area"
              type="monotone"
              dataKey="count"
              stroke="#0d9488"
              strokeWidth={2}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}