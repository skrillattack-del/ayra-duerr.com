import React from 'react';

export interface DataPoint {
  label: string;
  value: number;
}

export interface BarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 600,
  height = 300,
  color = '#3b82f6',
  className = '',
}) => {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 flex items-center justify-center h-full w-full">No data available</div>;
  }

  const padding = { top: 40, right: 40, bottom: 40, left: 60 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 1); // ensure > 0
  
  const barWidth = Math.min((innerWidth / data.length) * 0.8, 60);
  const spacing = innerWidth / data.length;

  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: width }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + innerHeight * ratio;
          const val = maxVal - maxVal * ratio;
          return (
            <g key={ratio} className="text-gray-300">
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} fill="#9ca3af" fontSize="12" textAnchor="end">
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars and labels */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxVal) * innerHeight;
          const x = padding.left + i * spacing + (spacing - barWidth) / 2;
          const y = padding.top + innerHeight - barHeight;
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                rx="4"
                className="transition-all hover:opacity-80"
              />
              <text x={x + barWidth / 2} y={height - padding.bottom + 20} fill="#9ca3af" fontSize="12" textAnchor="middle">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
