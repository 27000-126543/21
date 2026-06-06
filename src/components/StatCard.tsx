import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  description?: string;
}

const colorMap = {
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/30 text-blue-400',
  green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
  yellow: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  red: 'from-red-500/20 to-red-600/5 border-red-500/30 text-red-400',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
};

export default function StatCard({
  title,
  value,
  unit,
  change,
  icon,
  color = 'blue',
  description,
}: StatCardProps) {
  return (
    <div className={`stat-card bg-gradient-to-br ${colorMap[color]}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-slate-400 font-medium">{title}</span>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-white">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {(change !== undefined || description) && (
        <div className="mt-2 flex items-center gap-2">
          {change !== undefined && (
            <span
              className={`flex items-center gap-0.5 text-xs font-medium ${
                change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-slate-400'
              }`}
            >
              {change > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : change < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          {description && <span className="text-xs text-slate-500">{description}</span>}
        </div>
      )}
    </div>
  );
}
