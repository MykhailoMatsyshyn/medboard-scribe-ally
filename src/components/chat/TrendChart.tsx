import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { RagTrend } from '@/data/ragDemo';
import { cn } from '@/lib/utils';

interface Props {
  trend: RagTrend;
}

export const TrendChart: React.FC<Props> = ({ trend }) => {
  const TrendIcon =
    trend.trend === 'improving' ? TrendingDown : trend.trend === 'worsening' ? TrendingUp : Minus;
  const trendColor =
    trend.trend === 'improving'
      ? 'text-success'
      : trend.trend === 'worsening'
        ? 'text-destructive'
        : 'text-muted-foreground';

  const first = trend.data[0]?.value ?? 0;
  const last = trend.data[trend.data.length - 1]?.value ?? 0;
  const delta = last - first;
  const pct = first ? Math.round((delta / first) * 100) : 0;

  return (
    <div className="mt-4 p-4 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{trend.metric}</div>
          <div className="text-[11px] text-muted-foreground">
            Normal range: {trend.normalRange.min}–{trend.normalRange.max} {trend.unit}
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>
            {delta > 0 ? '+' : ''}
            {delta} {trend.unit} ({pct > 0 ? '+' : ''}
            {pct}%)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend.data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['dataMin - 20', 'dataMax + 20']}
              width={32}
            />
            {/* Normal range band */}
            <ReferenceArea
              y1={trend.normalRange.min}
              y2={trend.normalRange.max}
              fill="hsl(var(--success))"
              fillOpacity={0.08}
            />
            <ReferenceLine
              y={trend.normalRange.max}
              stroke="hsl(var(--success))"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{
                value: `Max ${trend.normalRange.max}`,
                fontSize: 9,
                fill: 'hsl(var(--muted-foreground))',
                position: 'insideTopRight',
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v} ${trend.unit}`, trend.metric]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4, fill: 'hsl(var(--primary))', stroke: 'hsl(var(--background))', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">
        Shaded band = healthy range. Hover any point for the exact value.
      </p>
    </div>
  );
};
