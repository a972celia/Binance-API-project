import React, { useMemo } from 'react';
import { AnalysisStats, IntervalAnalysis, Direction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface DashboardProps {
  stats: AnalysisStats | null;
  loading: boolean;
}

const formatTime = (ts: number) => {
  const date = new Date(ts);
  // Format as DD HH:mm (UTC)
  const d = date.getUTCDate().toString().padStart(2, '0');
  const h = date.getUTCHours().toString().padStart(2, '0');
  const m = date.getUTCMinutes().toString().padStart(2, '0');
  return `${d}d ${h}:${m}`;
};

const Dashboard: React.FC<DashboardProps> = ({ stats, loading }) => {
  // 1. Hook: Calculate hourlyData (Always call hooks at top level)
  const hourlyData = useMemo(() => {
    if (!stats || stats.dataPoints.length === 0) return [];

    const map = new Map<string, { time: number, total: number, matches: number }>();
    
    // Use original order (oldest first) for chart
    const reversedPoints = [...stats.dataPoints].reverse();

    reversedPoints.forEach(p => {
      const hourKey = Math.floor(p.startTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
      if (!map.has(hourKey.toString())) {
        map.set(hourKey.toString(), { time: hourKey, total: 0, matches: 0 });
      }
      const entry = map.get(hourKey.toString())!;
      entry.total += 1;
      if (p.isMatch) entry.matches += 1;
    });

    return Array.from(map.values()).map(item => ({
      timeStr: formatTime(item.time),
      matchRate: (item.matches / item.total) * 100,
      total: item.total
    }));
  }, [stats]);

  // 2. Hook: Pie Data
  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
        { name: 'Consistent (Match)', value: stats.matchCount, color: '#10b981' }, 
        { name: 'Divergent (Mismatch)', value: stats.mismatchCount, color: '#f43f5e' }, 
    ];
  }, [stats]);

  // 3. Conditional Rendering (After hooks)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!stats || stats.dataPoints.length === 0) {
    return (
      <div className="text-center p-10 text-slate-400 border border-slate-800 rounded-lg bg-slate-900/50">
        No data available. Please select a coin and fetch data.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm uppercase font-bold tracking-wider">Analysis Range</h3>
          <p className="text-2xl font-bold text-white mt-2">{stats.dataPoints.length} Intervals</p>
          <p className="text-slate-500 text-sm mt-1">15-min blocks analyzed</p>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm uppercase font-bold tracking-wider">Consistency Rate</h3>
          <div className="flex items-baseline mt-2">
            <span className={`text-4xl font-bold ${stats.matchRate > 80 ? 'text-emerald-400' : stats.matchRate > 50 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {stats.matchRate.toFixed(2)}%
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">14m30s direction matches 15m end</p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg flex items-center justify-center relative">
             <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
             </ResponsiveContainer>
             <div className="absolute bottom-2 text-xs text-slate-400 flex gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Match</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Mismatch</span>
             </div>
        </div>
      </div>

      {/* Hourly Trend Chart */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-slate-200 font-bold mb-4">Consistency Rate Over Time (Hourly Avg)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={hourlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="timeStr" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                unit="%"
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                 cursor={{ fill: '#334155', opacity: 0.4 }}
              />
              <Bar dataKey="matchRate" radius={[4, 4, 0, 0]}>
                {hourlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.matchRate > 80 ? '#10b981' : entry.matchRate > 50 ? '#f59e0b' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-200">Detailed Interval Log</h3>
          <span className="text-xs text-slate-500">*14m30s price approximated using Minute 14 OHLC avg</span>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Time (UTC)</th>
                <th className="px-6 py-3">Start Price</th>
                <th className="px-6 py-3">
                    <div className="flex flex-col">
                        <span>14m 30s</span>
                        <span className="text-[10px] opacity-70">Diff %</span>
                    </div>
                </th>
                <th className="px-6 py-3">
                    <div className="flex flex-col">
                        <span>15m End</span>
                        <span className="text-[10px] opacity-70">Diff %</span>
                    </div>
                </th>
                <th className="px-6 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {stats.dataPoints.map((row, idx) => {
                const diff14 = ((row.priceAt14m30s - row.startPrice) / row.startPrice) * 100;
                const diff15 = ((row.priceAt15m - row.startPrice) / row.startPrice) * 100;
                
                return (
                  <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-3 font-mono text-slate-300">
                      {formatTime(row.startTime)}
                    </td>
                    <td className="px-6 py-3 font-mono">
                      {row.startPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{row.priceAt14m30s.toFixed(2)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${row.direction14m30s === Direction.UP ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {diff14 > 0 ? '+' : ''}{diff14.toFixed(3)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{row.priceAt15m.toFixed(2)}</span>
                         <span className={`text-xs px-1.5 py-0.5 rounded ${row.direction15m === Direction.UP ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {diff15 > 0 ? '+' : ''}{diff15.toFixed(3)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.isMatch ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Mismatch
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;