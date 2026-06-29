import { Stock, StockSearchResult } from '../types/stock';

const MOCK_STOCKS: Stock[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 1.20, changePercent: 0.69, exchange: 'NASDAQ' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 140.20, change: -0.50, changePercent: -0.35, exchange: 'NASDAQ' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', price: 330.10, change: 2.10, changePercent: 0.64, exchange: 'NASDAQ' },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 130.45, change: 0.15, changePercent: 0.12, exchange: 'NASDAQ' },
  { ticker: 'TSLA', name: 'Tesla Inc.', price: 240.50, change: -3.20, changePercent: -1.31, exchange: 'NASDAQ' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', price: 450.20, change: 5.40, changePercent: 1.21, exchange: 'NASDAQ' },
  { ticker: 'META', name: 'Meta Platforms Inc.', price: 300.10, change: 1.10, changePercent: 0.37, exchange: 'NASDAQ' },
  { ticker: 'V', name: 'Visa Inc.', price: 245.30, change: 0.50, changePercent: 0.20, exchange: 'NYSE' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', price: 155.20, change: -0.20, changePercent: -0.13, exchange: 'NYSE' },
  { ticker: 'WMT', name: 'Walmart Inc.', price: 160.10, change: 0.30, changePercent: 0.19, exchange: 'NYSE' },
];

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  return MOCK_STOCKS
    .filter(s => s.ticker.toLowerCase().includes(lowerQuery) || s.name.toLowerCase().includes(lowerQuery))
    .map(({ ticker, name, exchange }) => ({ ticker, name, exchange }));
};

export const getStockDetails = async (ticker: string): Promise<Stock | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_STOCKS.find(s => s.ticker === ticker);
};

export const getWatchlistStocks = async (): Promise<Stock[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_STOCKS.slice(0, 5);
};
