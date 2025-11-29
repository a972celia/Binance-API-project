import { BinanceKline } from '../types';

const BASE_URL = 'https://api.binance.com/api/v3';

// Binance limits: 1000 candles per call.
// 1 day of 1m candles = 60 * 24 = 1440 candles.
// 1 year = 365 * 1440 = 525,600 candles.
// We need to handle pagination/multiple requests for longer periods.

export const fetchHistoricalData = async (
  symbol: string,
  hoursLookback: number,
  onProgress?: (percent: number) => void
): Promise<BinanceKline[]> => {
  const allKlines: BinanceKline[] = [];
  const now = Date.now();
  const startTime = now - hoursLookback * 60 * 60 * 1000;
  const totalDuration = now - startTime;
  
  // We fetch in chunks of 1000 minutes (approx 16 hours)
  let currentStartTime = startTime;
  
  // Safety break to prevent infinite loops
  // 1 year (525600 mins) / 1000 limit = ~526 calls. 
  // Set max loops to 600 to be safe.
  let safetyCounter = 0;
  const MAX_LOOPS = 600; 

  while (currentStartTime < now && safetyCounter < MAX_LOOPS) {
    safetyCounter++;
    
    // API endpoint
    const url = `${BASE_URL}/klines?symbol=${symbol}&interval=1m&startTime=${currentStartTime}&limit=1000`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status} ${response.statusText}`);
      }
      
      const data: any = await response.json();
      
      // Binance returns an array on success, but an object on application-level error
      if (!Array.isArray(data)) {
        throw new Error(`Binance API Error: ${JSON.stringify(data)}`);
      }
      
      if (data.length === 0) break;

      const parsedKlines: BinanceKline[] = data.map((d: any) => ({
        openTime: d[0],
        open: d[1],
        high: d[2],
        low: d[3],
        close: d[4],
        volume: d[5],
        closeTime: d[6],
      }));

      allKlines.push(...parsedKlines);

      // Prepare for next chunk.
      // The next start time is the close time of the last candle + 1ms
      const lastKline = parsedKlines[parsedKlines.length - 1];
      currentStartTime = lastKline.closeTime + 1;

      // Update progress
      if (onProgress) {
        const progress = Math.min(100, Math.round(((currentStartTime - startTime) / totalDuration) * 100));
        onProgress(progress);
      }

      // Rate limit niceness (optional but good practice)
      // For 1 year, we have 500 requests. 100ms delay adds 50 seconds.
      // We can reduce delay slightly to 50ms to speed up 1y fetch.
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error) {
      console.error("Error fetching binance data:", error);
      throw error;
    }
  }

  if (onProgress) onProgress(100);
  return allKlines;
};