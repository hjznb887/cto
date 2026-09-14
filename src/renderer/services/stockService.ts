import { Stock, StockSearchResult, StockDetail, PricePoint } from '../types/stock';

const MOCK_STOCKS: StockDetail[] = [
  { 
    symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 1.20, changePercent: 0.69, exchange: 'NASDAQ',
    open: 174.00, close: 174.30, high: 176.50, low: 173.80, volume: 55000000, marketCap: 2800000000000, sector: 'Technology',
    description: 'Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.'
  },
  { 
    symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.20, change: -0.50, changePercent: -0.35, exchange: 'NASDAQ',
    open: 141.50, close: 140.70, high: 142.00, low: 139.80, volume: 22000000, marketCap: 1750000000000, sector: 'Communication Services',
    description: 'Alphabet Inc. offers various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.'
  },
  { 
    symbol: 'MSFT', name: 'Microsoft Corporation', price: 330.10, change: 2.10, changePercent: 0.64, exchange: 'NASDAQ',
    open: 328.00, close: 328.00, high: 332.00, low: 327.50, volume: 25000000, marketCap: 2450000000000, sector: 'Technology',
    description: 'Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide.'
  },
  { 
    symbol: 'AMZN', name: 'Amazon.com Inc.', price: 130.45, change: 0.15, changePercent: 0.12, exchange: 'NASDAQ',
    open: 130.00, close: 130.30, high: 132.50, low: 129.50, volume: 45000000, marketCap: 1350000000000, sector: 'Consumer Cyclical',
    description: 'Amazon.com, Inc. engages in the retail sale of consumer products and subscriptions in North America and internationally.'
  },
  { 
    symbol: 'TSLA', name: 'Tesla Inc.', price: 240.50, change: -3.20, changePercent: -1.31, exchange: 'NASDAQ',
    open: 245.00, close: 243.70, high: 248.00, low: 238.50, volume: 110000000, marketCap: 760000000000, sector: 'Consumer Cyclical',
    description: 'Tesla, Inc. designs, develops, manufactures, leases, and sells electric vehicles, and energy generation and storage systems in the United States, China, and internationally.'
  },
];

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  if (!query) return [];
  
  const lowerQuery = query.toLowerCase();
  return MOCK_STOCKS
    .filter(s => s.symbol.toLowerCase().includes(lowerQuery) || s.name.toLowerCase().includes(lowerQuery))
    .map(({ symbol, name, exchange }) => ({ symbol, name, exchange }));
};

export const getStockDetails = async (symbol: string): Promise<StockDetail | undefined> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return MOCK_STOCKS.find(s => s.symbol === symbol);
};

export const getWatchlistStocks = async (): Promise<Stock[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return MOCK_STOCKS.slice(0, 3).map(({ symbol, name, price, change, changePercent, exchange }) => ({
    symbol, name, price, change, changePercent, exchange
  }));
};

export const getHistoricalData = async (symbol: string, timeframe: Timeframe): Promise<PricePoint[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const points = [];
  const now = new Date();
  let count = 20;
  let interval = 1; // days

  switch (timeframe) {
    case '1D': count = 24; interval = 1/24; break;
    case '1W': count = 7; interval = 1; break;
    case '1M': count = 30; interval = 1; break;
    case '3M': count = 90; interval = 1; break;
    case '1Y': count = 52; interval = 7; break;
    case '5Y': count = 60; interval = 30; break;
  }

  const basePrice = MOCK_STOCKS.find(s => s.symbol === symbol)?.price || 100;
  
  for (let i = count; i >= 0; i--) {
    const time = new Date(now.getTime() - i * interval * 24 * 60 * 60 * 1000);
    points.push({
      time: timeframe === '1D' ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : time.toLocaleDateString(),
      price: basePrice + (Math.random() - 0.5) * (basePrice * 0.1)
    });
  }
  
  return points;
};
