import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { t } from './i18n/messages';

// Mock the service
vi.mock('./services/stockService', () => ({
  getWatchlistStocks: vi.fn().mockResolvedValue([
    { symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 1.20, changePercent: 0.69, exchange: 'NASDAQ' }
  ]),
  getStockDetails: vi.fn().mockResolvedValue({
    symbol: 'AAPL', name: 'Apple Inc.', price: 175.50, change: 1.20, changePercent: 0.69, exchange: 'NASDAQ',
    open: 174.00, high: 176.50, low: 173.80, volume: 55000000, marketCap: 2800000000000, sector: 'Technology',
    description: 'Apple Inc. designs...'
  }),
  getHistoricalData: vi.fn().mockResolvedValue([{ time: '2023-01-01', price: 170 }]),
  searchStocks: vi.fn().mockResolvedValue([])
}));

const alertFixture = {
  id: 'rule-1',
  symbol: 'TSLA',
  type: 'price_threshold',
  params: { direction: 'above', threshold: 250 },
  notifications: { sound: true, toast: true, email: false },
  active: true,
};

afterEach(() => {
  localStorage.clear();
});

beforeEach(() => {
  // HashRouter reads window.location.hash, which persists across tests
  window.location.hash = '#/';
});

describe('App', () => {
  it('renders StockAll title', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /StockAll/i })).toBeInTheDocument();
    // Wait for the initial data fetch so its state update lands inside this test
    await waitFor(() => {
      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
    });
  });

  it('renders watchlist after loading', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/AAPL/)).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });
  });

  it('lists saved alerts with edit and delete controls', async () => {
    localStorage.setItem('stockall_alerts', JSON.stringify([alertFixture]));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText('TSLA')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: t('alerts.edit') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('alerts.delete') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('alerts.pause') })).toBeInTheDocument();
  });

  it('opens the alert editor prefilled when editing an alert', async () => {
    localStorage.setItem('stockall_alerts', JSON.stringify([alertFixture]));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('alerts.edit') })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: t('alerts.edit') }));
    expect(await screen.findByRole('heading', { name: t('editor.editTitle') })).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('navigates to the create-alert form from an empty dashboard', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(t('alerts.createFirst'), 'i') })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('alerts.createFirst'), 'i') }));
    expect(await screen.findByRole('heading', { name: t('editor.createTitle') })).toBeInTheDocument();
  });
});