export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export interface StockDetail extends Stock {
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  sector: string;
  description: string;
}

export interface PricePoint {
  time: string;
  price: number;
}
