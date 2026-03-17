'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatUSD } from '@/lib/utils';

interface PortfolioPosition {
  stockSymbol: string;
  currentValue: number;
}

interface PortfolioPieChartProps {
  positions: PortfolioPosition[];
  cashBalance: number;
}

const COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
  '#6366f1', // indigo
];

const CASH_COLOR = '#4b5563'; // gray-600

interface ChartEntry {
  name: string;
  value: number;
  color: string;
  percent: number;
}

export function PortfolioPieChart({ positions, cashBalance }: PortfolioPieChartProps) {
  const total = positions.reduce((sum, p) => sum + p.currentValue, 0) + cashBalance;

  if (total <= 0) return null;

  const data: ChartEntry[] = [
    ...positions.map((p, i) => ({
      name: p.stockSymbol,
      value: p.currentValue,
      color: COLORS[i % COLORS.length],
      percent: (p.currentValue / total) * 100,
    })),
    {
      name: 'Cash',
      value: cashBalance,
      color: CASH_COLOR,
      percent: (cashBalance / total) * 100,
    },
  ];

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Portfolio Allocation</h3>
      <div className="flex items-center gap-4">
        {/* Chart */}
        <div className="w-40 h-40 flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={65}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as ChartEntry;
                  return (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm">
                      <p className="font-medium">{d.name}</p>
                      <p className="text-gray-400">{formatUSD(d.value)} ({d.percent.toFixed(1)}%)</p>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2 text-sm">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-300 truncate flex-1">{entry.name}</span>
              <span className="text-gray-500 flex-shrink-0">{entry.percent.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
