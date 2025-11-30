import React, { useMemo } from 'react';
import { AnalysisStats, IntervalAnalysis, Direction } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';

interface DashboardProps {
  stats: AnalysisStats | null;
  loading: boolean;
}

const formatTime = (ts: number, short = false) => {
  const date = new Date(ts);
  // Format as DD HH:mm (UTC)
  const d = date.getUTCDate().toString().padStart(2, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const h = date.getUTCHours().toString().padStart(2, '0');
  const min = date.getUTCMinutes().toString().padStart(2, '0');
  
  if (short) return `${m}/${d}`;
  return `${m}/${d} ${h}:${min}`;
};

const Dashboard: React.FC<DashboardProps> = ({ stats, loading }) => {
  // 1. Hook: Calculate Chart Data
  const chartData = useMemo(() => {
    if (!stats || stats.dataPoints.length === 0) return { data: [], isLongRange: false };

    // If data covers more than 31 days, aggregate by DAY instead of HOUR to prevent chart overload
    // 30 days * 24 * 4 (15m intervals) = 2880 intervals roughly.
    const isLongRange = stats.totalIntervals > 3500;
    
    const map = new Map<string, { time: number, total: number, matches: number }>();
    
    // Use original order (oldest first) for chart
    const reversedPoints = [...stats.dataPoints].reverse();

    reversedPoints.forEach(p => {
      let timeKey: number;
      
      if (isLongRange) {
        // Daily binning
        timeKey = Math.floor(p.startTime / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
      } else {
        // Hourly binning
        timeKey = Math.floor(p.startTime / (60 * 60 * 1000)) * (60 * 60 * 1000);
      }
      
      if (!map.has(timeKey.toString())) {
        map.set(timeKey.toString(), { time: timeKey, total: 0, matches: 0 });
      }
      const entry = map.get(timeKey.toString())!;
      entry.total += 1;
      if (p.isMatch) entry.matches += 1;
    });

    const data = Array.from(map.values()).map(item => ({
      timeStr: formatTime(item.time, isLongRange),
      matchRate: (item.matches / item.total) * 100,
      total: item.total
    }));
    
    return { data, isLongRange };
  }, [stats]);

  // 2. Hook: Pie Data
  const pieData = useMemo(() => {
    if (!stats) return [];
    return [
        { name: 'Consistent (Match)', value: stats.matchCount, color: '#10b981' }, 
        { name: 'Divergent (Mismatch)', value: stats.mismatchCount, color: '#f43f5e' }, 
    ];
  }, [stats]);

  // 3. Hook: Limited Table Data (prevent DOM explosion)
  const tableData = useMemo(() => {
    if (!stats) return [];
    // Show only the last 500 records to keep the DOM light
    return stats.dataPoints.slice(0, 500);
  }, [stats]);

  // 4. Conditional Rendering (After hooks)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
        <p className="text-slate-400 animate-pulse">Fetching & Analyzing Data...</p>
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
          <p className="text-2xl font-bold text-white mt-2">{stats.totalIntervals.toLocaleString()} Intervals</p>
          <p className="text-slate-500 text-sm mt-1">15-min blocks analyzed</p>
        </div>
        
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-slate-400 text-sm uppercase font-bold tracking-wider">Consistency Rate</h3>
          <div className="flex items-baseline mt-2">
            <span className={`text-4xl font-bold ${stats.matchRate > 80 ? 'text-emerald-400' : stats.matchRate > 50 ? 'text-yellow-400' : 'text-rose-400'}`}>
              {stats.matchRate.toFixed(2)}%
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">14m55s direction matches 15m end</p>
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

      {/* Hourly/Daily Trend Chart */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-slate-200 font-bold mb-4">
            Consistency Rate Over Time 
            <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-700 px-2 py-1 rounded">
                {chartData.isLongRange ? 'Daily Avg' : 'Hourly Avg'}
            </span>
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <XAxis 
                dataKey="timeStr" 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                minTickGap={30}
              />
              <YAxis 
                tick={{ fill: '#94a3b8', fontSize: 12 }} 
                tickLine={false}
                axisLine={{ stroke: '#475569' }}
                unit="%"
                domain={[0, 100]}
              />
              <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                 cursor={{ fill: '#334155', opacity: 0.4 }}
              />
              <Bar dataKey="matchRate" radius={[4, 4, 0, 0]}>
                {chartData.data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.matchRate > 80 ? '#10b981' : entry.matchRate > 50 ? '#f59e0b' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="font-bold text-slate-200">Detailed Interval Log</h3>
          <div className="text-xs text-slate-500 flex flex-col items-end">
            <span>*Showing last {tableData.length} of {stats.totalIntervals.toLocaleString()} intervals</span>
            <span>*14m55s price approx using Minute 14 OHLC interp</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Time (UTC)</th>
                <th className="px-6 py-3">Start Price</th>
                <th className="px-6 py-3">
                    <div className="flex flex-col">
                        <span>14m 55s</span>
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
              {tableData.map((row, idx) => {
                const diff14 = ((row.priceAt14m55s - row.startPrice) / row.startPrice) * 100;
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
                        <span className="font-mono">{row.priceAt14m55s.toFixed(2)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${row.direction14m55s === Direction.UP ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
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