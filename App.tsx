import React, { useState, useEffect } from 'react';
import { fetchHistoricalData } from './services/binanceService';
import { analyzeData } from './utils/analyzer';
import Dashboard from './components/Dashboard';
import { AnalysisStats, PAIRS, TimeRange } from './types';

function App() {
  const [selectedPair, setSelectedPair] = useState<string>(PAIRS[0].value);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    setStats(null);

    try {
      // Determine lookback in hours
      let hours = 24;
      if (timeRange === '3d') hours = 72;
      if (timeRange === '7d') hours = 168;

      const klines = await fetchHistoricalData(selectedPair, hours);
      const results = analyzeData(klines, selectedPair);
      setStats(results);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    handleFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPair, timeRange]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Binance Interval Analyzer
            </h1>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block">
            Comparing 0m-14m30s vs 0m-15m
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            {/* Symbol Select */}
            <div className="relative">
              <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">Asset</label>
              <select 
                value={selectedPair}
                onChange={(e) => setSelectedPair(e.target.value)}
                className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base bg-slate-900 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm rounded-lg text-white appearance-none"
              >
                {PAIRS.map(pair => (
                  <option key={pair.value} value={pair.value}>{pair.label}</option>
                ))}
              </select>
              <div className="absolute bottom-2.5 right-3 pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            {/* Time Range */}
            <div className="flex flex-col">
               <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">History Range</label>
               <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
                  {(['24h', '3d', '7d'] as TimeRange[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setTimeRange(r)}
                      className={`px-4 py-1.5 text-sm rounded-md transition-all ${
                        timeRange === r 
                        ? 'bg-emerald-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {r.toUpperCase()}
                    </button>
                  ))}
               </div>
            </div>
          </div>

          {/* Refresh Button */}
          <button 
            onClick={handleFetch}
            disabled={loading}
            className="w-full sm:w-auto mt-4 sm:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-rose-900/50 border border-rose-800 text-rose-200 rounded-lg flex items-center gap-3">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {error}
          </div>
        )}

        {/* Dashboard Content */}
        <Dashboard stats={stats} loading={loading} />

      </main>
    </div>
  );
}

export default App;