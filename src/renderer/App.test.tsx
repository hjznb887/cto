import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import App from './App';
import React from 'react';

// Mock the service calls
vi.mock('./services/stockService', () => ({
  getWatchlistStocks: vi.fn(() => Promise.resolve([
    { ticker: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 1.20, changePercent: 0.69, exchange: 'NASDAQ' }
  ])),
  getStockDetails: vi.fn(),
  searchStocks: vi.fn(),
}));

test('renders StockAll title and initial watchlist', async () => {
  render(<App />);
  
  // Check title
  const titleElement = screen.getByText(/StockAll/i);
  expect(titleElement).toBeDefined();

  // Check if AAPL is rendered (wait for async loading)
  const stockElement = await screen.findByText(/AAPL/i);
  expect(stockElement).toBeDefined();
});
