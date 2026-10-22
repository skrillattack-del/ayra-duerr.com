import React from 'react';

export interface DataPoint {
  label: string;
  value: number;
}

export interface LineChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
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
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const getX = (index: number) => padding.left + (index / (data.length - 1 || 1)) * innerWidth;
  const getY = (value: number) => padding.top + innerHeight - ((value - minVal) / range) * innerHeight;

  const pathData = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`)
    .join(' ');

  // SVG gradient id
  const gradientId = `chart-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`relative ${className}`} style={{ width: '100%', maxWidth: width }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + innerHeight * ratio;
          const val = maxVal - range * ratio;
          return (
            <g key={ratio} className="text-gray-300">
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="currentColor" strokeDasharray="4 4" />
              <text x={padding.left - 10} y={y + 4} fill="#9ca3af" fontSize="12" textAnchor="end">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* X axis labels (show up to 6 labels to avoid crowding) */}
        {data.map((d, i) => {
          if (data.length > 6 && i % Math.ceil(data.length / 5) !== 0 && i !== data.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={height - padding.bottom + 20} fill="#9ca3af" fontSize="12" textAnchor="middle">
              {d.label}
            </text>
          );
        })}

        {/* Area under the line */}
        <path
          d={`${pathData} L ${getX(data.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`}
          fill={`url(#${gradientId})`}
        />

        {/* The line */}
        <path d={pathData} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {data.map((d, i) => (
          <circle key={i} cx={getX(i)} cy={getY(d.value)} r="4" fill="white" stroke={color} strokeWidth="2" className="transition-all hover:r-6 cursor-pointer" />
        ))}
      </svg>
    </div>
  );
};
