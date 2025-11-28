export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  FLAT = 'FLAT',
}

export interface IntervalAnalysis {
  startTime: number; // e.g. 10:00
  endTime: number;   // e.g. 10:15
  startPrice: number; // Price at 0m 0s
  
  // 0m - 14m 30s
  priceAt14m30s: number; 
  direction14m30s: Direction;
  
  // 0m - 15m 0s
  priceAt15m: number;
  direction15m: Direction;

  isMatch: boolean; // True if both UP or both DOWN
}

export interface AnalysisStats {
  totalIntervals: number;
  matchCount: number;
  mismatchCount: number;
  matchRate: number; // Percentage
  symbol: string;
  dataPoints: IntervalAnalysis[];
}

export type TimeRange = '24h' | '3d' | '7d';

export const PAIRS = [
  { value: 'BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'BNBUSDT', label: 'BNB' },
  { value: 'SOLUSDT', label: 'Solana (SOL)' },
];