import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const StatCard = ({ title, value, icon: Icon, change, trend = 'up', color = 'blue', subtitle }) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600',
      border: 'border-blue-100',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600',
      border: 'border-amber-100',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600',
      border: 'border-emerald-100',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600',
      border: 'border-purple-100',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600',
      border: 'border-rose-100',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <div className="p-5 bg-white border border-slate-200/90 rounded-xl shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${scheme.bg} ${scheme.border} border`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || change) && (
        <div className="flex items-center mt-3 text-xs">
          {change && (
            <span
              className={`inline-flex items-center font-semibold mr-1.5 ${
                trend === 'up' ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {trend === 'up' ? (
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
              )}
              {change}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
