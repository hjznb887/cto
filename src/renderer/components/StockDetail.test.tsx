import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StockDetail from './StockDetail';
import { t } from '../i18n/messages';

// Mock recharts primitives so the component can render in jsdom without layout
vi.mock('recharts', () => {
  const MockBox = ({ children, ...rest }: { children?: React.ReactNode } & Record<string, unknown>) =>
    React.createElement('div', { 'data-testid': 'chart', ...rest }, children);
  return {
    ResponsiveContainer: MockBox,
    LineChart: MockBox,
    Line: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
  };
});

const service = {
  getStockDetails: vi.fn().mockResolvedValue({
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 175.5,
    change: 1.2,
    changePercent: 0.69,
    exchange: 'NASDAQ',
    open: 174.0,
    close: 174.3,
    high: 176.5,
    low: 173.8,
    volume: 55000000,
    marketCap: 2800000000000,
    sector: 'Technology',
    description: 'Apple Inc. designs devices.',
  }),
  getHistoricalData: vi.fn().mockResolvedValue([
    { time: '2023-01-01', price: 170 },
    { time: '2023-01-02', price: 172 },
  ]),
};

vi.mock('../services/stockService', () => ({
  getStockDetails: (...args: unknown[]) => service.getStockDetails(...args),
  getHistoricalData: (...args: unknown[]) => service.getHistoricalData(...args),
}));

const baseProps = {
  symbol: 'AAPL',
  onBack: vi.fn(),
  onAddToWatchlist: vi.fn(),
  onRemoveFromWatchlist: vi.fn(),
  isInWatchlist: false,
  onCreateAlert: vi.fn(),
};

describe('StockDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state then renders company info and stats', async () => {
    render(<StockDetail {...baseProps} />);
    expect(screen.getByText(new RegExp(t('detail.loading'), 'i'))).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/NASDAQ/)).toBeInTheDocument();
    expect(screen.getByText(/Technology/)).toBeInTheDocument();
    // Key statistics
    expect(screen.getByText(t('detail.open'))).toBeInTheDocument();
    expect(screen.getByText(t('detail.close'))).toBeInTheDocument();
    expect(screen.getByText(t('detail.high'))).toBeInTheDocument();
    expect(screen.getByText(t('detail.low'))).toBeInTheDocument();
    expect(screen.getByText(t('detail.volume'))).toBeInTheDocument();
    expect(screen.getByText(t('detail.marketCap'))).toBeInTheDocument();
    expect(screen.getByText('Apple Inc. designs devices.')).toBeInTheDocument();
  });

  it('renders all six timeframe buttons', async () => {
    render(<StockDetail {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    for (const tf of ['1D', '1W', '1M', '3M', '1Y', '5Y']) {
      expect(screen.getByRole('button', { name: tf })).toBeInTheDocument();
    }
  });

  it('refetches history when a timeframe is selected', async () => {
    render(<StockDetail {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    expect(service.getHistoricalData).toHaveBeenCalledWith('AAPL', '1M');
    fireEvent.click(screen.getByRole('button', { name: '1Y' }));
    await waitFor(() => expect(service.getHistoricalData).toHaveBeenCalledWith('AAPL', '1Y'));
  });

  it('adds to watchlist when not in it', async () => {
    render(<StockDetail {...baseProps} isInWatchlist={false} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('detail.addToWatchlist'), 'i') }));
    expect(baseProps.onAddToWatchlist).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'AAPL' })
    );
  });

  it('removes from watchlist when in it', async () => {
    render(<StockDetail {...baseProps} isInWatchlist={true} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('detail.removeFromWatchlist'), 'i') }));
    expect(baseProps.onRemoveFromWatchlist).toHaveBeenCalledWith('AAPL');
  });

  it('opens alert creation with the symbol', async () => {
    render(<StockDetail {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('alerts.create'), 'i') }));
    expect(baseProps.onCreateAlert).toHaveBeenCalledWith('AAPL');
  });

  it('calls onBack from the back button', async () => {
    render(<StockDetail {...baseProps} />);
    await waitFor(() => expect(screen.getByRole('heading', { name: /Apple Inc. \(AAPL\)/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(t('watchlist.title'), 'i') }));
    expect(baseProps.onBack).toHaveBeenCalledTimes(1);
  });
});