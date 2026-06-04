import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface MiniChartProps {
  title: string;
  trend?: 'up' | 'down' | 'stable';
  data?: number[];
}

export const MiniChart: React.FC<MiniChartProps> = ({ 
  title, 
  trend = 'down',
  data = [180, 195, 210, 185, 170, 165, 158]
}) => {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'down' ? 'text-success' : trend === 'up' ? 'text-warning' : 'text-muted-foreground';
  
  // Normalize data for SVG path
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const height = 40;
  const width = 160;
  const padding = 4;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const pathD = `M ${points.split(' ').join(' L ')}`;
  
  // Create area path
  const areaPoints = [
    `${padding},${height - padding}`,
    ...data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }),
    `${width - padding},${height - padding}`
  ].join(' ');
  
  return (
    <div className="mt-4 p-4 rounded-xl bg-accent/50 border border-border">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trend === 'down' ? 'Improving' : trend === 'up' ? 'Increasing' : 'Stable'}</span>
        </div>
      </div>
      
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-10"
        preserveAspectRatio="none"
      >
        {/* Gradient fill */}
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Area fill */}
        <polygon 
          points={areaPoints}
          fill="url(#chartGradient)"
        />
        
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {data.map((value, index) => {
          const x = padding + (index / (data.length - 1)) * (width - padding * 2);
          const y = padding + (1 - (value - min) / range) * (height - padding * 2);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill="hsl(var(--background))"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
            />
          );
        })}
      </svg>
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>2022</span>
        <span>2023</span>
        <span>2024</span>
      </div>
    </div>
  );
};
