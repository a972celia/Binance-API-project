import { BinanceKline, IntervalAnalysis, Direction, AnalysisStats } from '../types';

export const analyzeData = (klines: BinanceKline[], symbol: string): AnalysisStats => {
  // Group by 15-minute windows based on Open Time
  const bucketMap = new Map<number, BinanceKline[]>();

  klines.forEach((k) => {
    // Round down to nearest 15 minutes
    // e.g., 10:14 -> 10:00 bucket
    const timestamp = k.openTime;
    const bucketStart = Math.floor(timestamp / (15 * 60 * 1000)) * (15 * 60 * 1000);
    
    if (!bucketMap.has(bucketStart)) {
      bucketMap.set(bucketStart, []);
    }
    bucketMap.get(bucketStart)?.push(k);
  });

  const results: IntervalAnalysis[] = [];

  // Sort buckets by time
  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => a - b);

  for (const startTime of sortedKeys) {
    const candles = bucketMap.get(startTime);

    // We strictly need candles covering minute 0 to minute 14 (15 candles total)
    // to have a complete 15m interval analysis.
    if (!candles || candles.length < 15) {
      continue;
    }

    // Sort candles by time just in case
    candles.sort((a, b) => a.openTime - b.openTime);

    // Candle 0: Minute 0 (Start of 15m block)
    const startCandle = candles[0]; 
    // Candle 14: Minute 14 (Last minute of the block)
    const endCandle = candles[14]; 

    const startPrice = parseFloat(startCandle.open);
    
    // --- Full 15m Calculation ---
    // The "end" of the 15m block is the CLOSE of the 14th minute candle.
    const priceAt15m = parseFloat(endCandle.close);
    
    // --- 14m 55s Calculation ---
    // Limitation: We don't have tick data.
    // Calculation: Linear interpolation of the 14th minute candle.
    // The candle represents 14:00 to 14:59.
    // We want 14:55, which is 55/60ths through the candle duration.
    
    const open14 = parseFloat(endCandle.open);
    const close14 = parseFloat(endCandle.close);
    
    // Interpolation formula: Price = Open + (Change * Fraction)
    const priceAt14m55s = open14 + (close14 - open14) * (55 / 60);

    // --- Directions ---
    const getDirection = (start: number, end: number): Direction => {
      if (end > start) return Direction.UP;
      if (end < start) return Direction.DOWN;
      return Direction.FLAT;
    };

    const direction15m = getDirection(startPrice, priceAt15m);
    const direction14m55s = getDirection(startPrice, priceAt14m55s);

    // --- Match Logic ---
    // If one is FLAT and the other is UP/DOWN, is it a match? Usually no.
    // Strict match: UP==UP or DOWN==DOWN.
    // If both are FLAT, it's a match.
    const isMatch = direction15m === direction14m55s;

    results.push({
      startTime,
      endTime: startTime + 15 * 60 * 1000,
      startPrice,
      priceAt14m55s,
      direction14m55s,
      priceAt15m,
      direction15m,
      isMatch
    });
  }

  // Calculate Aggregates
  const total = results.length;
  const matchCount = results.filter(r => r.isMatch).length;
  const mismatchCount = total - matchCount;
  const matchRate = total === 0 ? 0 : (matchCount / total) * 100;

  return {
    symbol,
    totalIntervals: total,
    matchCount,
    mismatchCount,
    matchRate,
    dataPoints: results.reverse() // Newest first for display
  };
};