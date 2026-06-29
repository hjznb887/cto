export interface Stock {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  exchange: string;
}

export interface StockSearchResult {
  ticker: string;
  name: string;
  exchange: string;
}
