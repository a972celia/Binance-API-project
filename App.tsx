
import React, { useState, useEffect } from 'react';
import { fetchHistoricalData } from './services/binanceService';
import { analyzeData } from './utils/analyzer';
import { uploadFileToGitHub } from './services/githubService';
import Dashboard from './components/Dashboard';
import { AnalysisStats, PAIRS, TimeRange } from './types';

function App() {
  const [selectedPair, setSelectedPair] = useState<string>(PAIRS[0].value);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // GitHub Settings
  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [repoUrl, setRepoUrl] = useState(''); // New state for URL input
  const [autoUpload, setAutoUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showGhSettings, setShowGhSettings] = useState(false);

  // Load settings from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('gh_token');
    const savedOwner = localStorage.getItem('gh_owner');
    const savedRepo = localStorage.getItem('gh_repo');
    const savedAuto = localStorage.getItem('gh_auto_upload');
    
    if (savedToken) setGhToken(savedToken);
    if (savedOwner) setGhOwner(savedOwner);
    if (savedRepo) setGhRepo(savedRepo);
    if (savedAuto) setAutoUpload(savedAuto === 'true');
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('gh_token', ghToken);
    localStorage.setItem('gh_owner', ghOwner);
    localStorage.setItem('gh_repo', ghRepo);
    localStorage.setItem('gh_auto_upload', String(autoUpload));
  }, [ghToken, ghOwner, ghRepo, autoUpload]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setRepoUrl(url);
    
    // Regex to extract owner and repo from standard GitHub URLs
    // Supports: https://github.com/owner/repo or github.com/owner/repo
    const match = url.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git|\/|$)/);
    if (match) {
      setGhOwner(match[1]);
      setGhRepo(match[2]);
    }
  };

  const generateCSV = (data: AnalysisStats) => {
    const headers = [
      "StartTime_ISO",
      "EndTime_ISO",
      "StartPrice",
      "Price_14m55s",
      "Direction_14m55s",
      "Price_15m",
      "Direction_15m",
      "IsMatch"
    ];
    const rows = data.dataPoints.map(p => [
      new Date(p.startTime).toISOString(),
      new Date(p.endTime).toISOString(),
      p.startPrice,
      p.priceAt14m55s,
      p.direction14m55s,
      p.priceAt15m,
      p.direction15m,
      p.isMatch
    ]);
    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  };

  const handleGithubUpload = async (data: AnalysisStats) => {
    if (!ghToken || !ghOwner || !ghRepo) {
      setError("Please configure GitHub settings first.");
      return;
    }

    setIsUploading(true);
    setSuccessMsg(null);
    try {
      const csvContent = generateCSV(data);
      // Filename: BNBUSDT_24h_2023-10-27T10-00-00.csv
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${selectedPair}_${timeRange}_${timestamp}.csv`;
      
      await uploadFileToGitHub(csvContent, filename, {
        token: ghToken,
        owner: ghOwner,
        repo: ghRepo
      });
      
      setSuccessMsg(`Successfully uploaded ${filename} to GitHub!`);
    } catch (err: any) {
      console.error(err);
      setError(`GitHub Upload Failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetch = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);
    setStats(null);
    setSuccessMsg(null);

    try {
      // Determine lookback in hours
      let hours = 24;
      if (timeRange === '3d') hours = 72;
      if (timeRange === '7d') hours = 168;
      if (timeRange === '14d') hours = 336;
      if (timeRange === '30d') hours = 720;
      if (timeRange === '1y') hours = 8760; // 365 * 24

      const klines = await fetchHistoricalData(selectedPair, hours, (p) => setProgress(p));
      
      // Small delay to allow UI to render 100% before crunching numbers
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const results = analyzeData(klines, selectedPair);
      setStats(results);

      // Auto Upload Logic
      if (autoUpload && ghToken && ghOwner && ghRepo) {
        // Trigger upload without blocking the UI rendering of stats
        handleGithubUpload(results); 
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const generateJSON = () => {
    if (!stats) return '';
    return JSON.stringify(stats.dataPoints, null, 2);
  };

  const downloadJSON = () => {
    if (!stats) return;
    const jsonString = generateJSON();
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPair}_${timeRange}_analysis.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMsg("JSON file downloaded successfully.");
  };

  const downloadCSV = () => {
    if (!stats) return;
    const csvContent = generateCSV(stats);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPair}_${timeRange}_analysis.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSuccessMsg("CSV file downloaded successfully.");
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
            Comparing 0m-14m55s vs 0m-15m
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Controls */}
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg mb-8">
          <div className="flex flex-col xl:flex-row gap-6 items-start xl:items-center justify-between">
            
            {/* Left Group: Settings */}
            <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
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
              <div className="flex flex-col flex-1">
                 <label className="block text-xs font-medium text-slate-400 mb-1 ml-1">History Range</label>
                 <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 overflow-x-auto w-full sm:w-auto no-scrollbar">
                    {(['24h', '3d', '7d', '14d', '30d', '1y'] as TimeRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-3 sm:px-4 py-1.5 text-sm rounded-md transition-all whitespace-nowrap ${
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

            {/* Right Group: Actions */}
            <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3 pt-2 xl:pt-6">
              
              <button 
                onClick={handleFetch}
                disabled={loading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
              >
                {loading ? (
                  <div className="flex items-center w-full">
                     <div className="flex-1 h-2 bg-emerald-800 rounded-full overflow-hidden mr-2">
                        <div 
                          className="h-full bg-white transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                     </div>
                     <span className="text-xs w-8 text-right">{progress}%</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>
            </div>
          </div>

          {/* GitHub Integration Toggle */}
          <div className="mt-4 pt-4 border-t border-slate-700">
            <button 
              onClick={() => setShowGhSettings(!showGhSettings)}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors focus:outline-none"
            >
              <svg className={`w-4 h-4 transition-transform ${showGhSettings ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>GitHub Integration Settings</span>
            </button>
            
            {showGhSettings && (
              <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700 animate-fade-in">
                 
                 {/* URL Input */}
                 <div className="mb-4">
                    <label className="block text-xs text-slate-500 mb-1">Repository URL (Paste to auto-fill)</label>
                    <input 
                      type="text" 
                      value={repoUrl}
                      onChange={handleUrlChange}
                      placeholder="https://github.com/username/repo-name"
                      className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">GitHub Personal Access Token (Repo Scope)</label>
                        <input 
                          type="password" 
                          value={ghToken}
                          onChange={(e) => setGhToken(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxx"
                          className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Repo Owner</label>
                          <input 
                            type="text" 
                            value={ghOwner}
                            onChange={(e) => setGhOwner(e.target.value)}
                            placeholder="username"
                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Repo Name</label>
                          <input 
                            type="text" 
                            value={ghRepo}
                            onChange={(e) => setGhRepo(e.target.value)}
                            placeholder="my-repo"
                            className="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                    </div>
                 </div>

                 <div className="mt-4 md:col-span-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input 
                         type="checkbox" 
                         checked={autoUpload}
                         onChange={(e) => setAutoUpload(e.target.checked)}
                         className="w-4 h-4 text-emerald-500 rounded border-slate-600 bg-slate-800 focus:ring-emerald-500 focus:ring-offset-slate-900"
                       />
                       <span className="text-sm text-slate-300">Auto Upload to GitHub on Refresh</span>
                    </label>
                    {stats && !autoUpload && (
                       <button 
                         onClick={() => handleGithubUpload(stats)}
                         disabled={isUploading}
                         className="text-xs px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded border border-slate-600 transition-colors disabled:opacity-50"
                       >
                         {isUploading ? 'Uploading...' : 'Upload Now'}
                       </button>
                    )}
                 </div>
              </div>
            )}
          </div>

          {/* Export Section */}
          {stats && (
            <div className="mt-4 pt-4 border-t border-slate-700">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="font-semibold text-slate-300">Export Raw Data:</span>
                    <span className="text-xs">(Save to file)</span>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                     <button
                        onClick={downloadCSV}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg border border-slate-600 flex items-center gap-2 transition-colors"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       Download CSV
                     </button>
                     <button
                        onClick={downloadJSON}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg border border-slate-600 flex items-center gap-2 transition-colors"
                     >
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       Download JSON
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-6 p-4 bg-rose-900/50 border border-rose-800 text-rose-200 rounded-lg flex items-center gap-3">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {error}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-900/50 border border-emerald-800 text-emerald-200 rounded-lg flex items-center gap-3">
             <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
             </svg>
             {successMsg}
          </div>
        )}

        {/* Dashboard Content */}
        <Dashboard stats={stats} loading={loading} />

      </main>
    </div>
  );
}

export default App;
