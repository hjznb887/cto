import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AlertEditor from './AlertEditor';

// Mock StockSearch so the editor can be tested in isolation
vi.mock('./StockSearch', () => ({
  default: () => <div data-testid="stock-search-mock" />,
}));

const makeRule = (overrides: Record<string, unknown> = {}) => ({
  id: 'rule-1',
  symbol: 'AAPL',
  type: 'price_threshold',
  params: { threshold: 200, direction: 'above' },
  notifications: { sound: true, toast: false, email: false },
  active: true,
  ...overrides,
});

describe('AlertEditor', () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders the create form with default alert type', () => {
    render(<AlertEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Create New Alert Rule' })).toBeInTheDocument();
    expect(screen.getByLabelText('Alert Type')).toHaveValue('price_threshold');
  });

  it('shows price threshold parameters by default', () => {
    render(<AlertEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Price ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Direction')).toBeInTheDocument();
  });

  it('switches parameters when a different alert type is selected', () => {
    render(<AlertEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Alert Type'), { target: { value: 'ma_crossover' } });
    expect(screen.getByLabelText('Short Period')).toBeInTheDocument();
    expect(screen.getByLabelText('Long Period')).toBeInTheDocument();
    expect(screen.queryByLabelText('Price ($)')).not.toBeInTheDocument();
  });

  it('shows RSI params for the RSI alert type', () => {
    render(<AlertEditor onSave={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Alert Type'), { target: { value: 'rsi_level' } });
    expect(screen.getByLabelText('RSI Level')).toBeInTheDocument();
  });

  it('warns and does not save when no stock is selected', () => {
    const onSave = vi.fn();
    render(<AlertEditor onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Save Rule/i }));
    expect(alertSpy).toHaveBeenCalledWith('Please select a stock.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('saves a new rule with generated id', () => {
    const onSave = vi.fn();
    render(<AlertEditor onSave={onSave} onCancel={vi.fn()} initialSymbol="MSFT" />);
    fireEvent.click(screen.getByRole('button', { name: /Save Rule/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    expect(saved.symbol).toBe('MSFT');
    expect(saved.type).toBe('price_threshold');
    expect(saved.id).toBeTruthy();
    expect(saved.active).toBe(true);
  });

  it('prefills fields when editing an existing rule', () => {
    const rule = makeRule({
      id: 'rule-42',
      symbol: 'TSLA',
      type: 'ma_crossover',
      params: { shortPeriod: 10, longPeriod: 30 },
      notifications: { sound: false, toast: true, email: false },
      active: false,
    });
    render(<AlertEditor initialRule={rule} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Edit Alert Rule' })).toBeInTheDocument();
    expect(screen.getByText('TSLA')).toBeInTheDocument();
    expect(screen.getByLabelText('Alert Type')).toHaveValue('ma_crossover');
    expect(screen.getByLabelText('Short Period')).toHaveValue(10);
    expect(screen.getByLabelText('Long Period')).toHaveValue(30);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Sound notification')).not.toBeChecked();
    expect(screen.getByLabelText('Toast notification')).toBeChecked();
  });

  it('saves an edit without changing the rule id', () => {
    const rule = makeRule({ id: 'rule-99' });
    const onSave = vi.fn();
    render(<AlertEditor initialRule={rule} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Save Rule/i }));
    const saved = onSave.mock.calls[0][0];
    expect(saved.id).toBe('rule-99');
    expect(saved.symbol).toBe('AAPL');
  });

  it('calls onCancel when cancel is pressed', () => {
    const onCancel = vi.fn();
    render(<AlertEditor onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});