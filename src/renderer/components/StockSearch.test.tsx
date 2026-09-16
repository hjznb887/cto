import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import StockSearch from './StockSearch';
import { t } from '../i18n/messages';

/** 让搜索服务返回固定结果，避免真实网络。 */
vi.mock('../services/stockService', () => ({
  searchStocks: vi.fn(),
}));

import { searchStocks } from '../services/stockService';
const mockSearch = vi.mocked(searchStocks);

function typeInto(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('StockSearch', () => {
  it('渲染带中文占位符的输入框', () => {
    render(<StockSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText(t('search.placeholder'))).toBeInTheDocument();
  });

  it('输入单个字符就会触发搜索', async () => {
    mockSearch.mockResolvedValue([{ symbol: 'AAPL', name: '苹果', exchange: 'US' }]);
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), 'A');

    await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('A'), { timeout: 2000 });
  });

  it('空输入不触发搜索', async () => {
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), '   ');
    await new Promise((r) => setTimeout(r, 400));
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('有结果时展示下拉项', async () => {
    mockSearch.mockResolvedValue([
      { symbol: 'NVDA', name: '英伟达', exchange: 'US' },
      { symbol: 'AAPL', name: '苹果', exchange: 'US' },
    ]);
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), '英伟');

    await waitFor(() => expect(screen.getByText(/NVDA/)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
  });

  it('下拉可滚动且限高——结果多时底部项才够得着', async () => {
    mockSearch.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => ({ symbol: `S${i}`, name: `股票${i}`, exchange: 'US' })),
    );
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), '股票');

    await waitFor(() => expect(screen.getByText(/S0/)).toBeInTheDocument(), { timeout: 2000 });
    const list = screen.getByRole('list');
    expect(list.className).toContain('max-h-');
    expect(list.className).toContain('overflow-y-auto');
  });

  it('下拉带 z-50，避免被下方区块盖住', async () => {
    mockSearch.mockResolvedValue([{ symbol: 'NVDA', name: '英伟达', exchange: 'US' }]);
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), '英伟');

    await waitFor(() => expect(screen.getByText(/NVDA/)).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByRole('list').className).toContain('z-50');
  });

  it('无结果时给出明确提示，而不是静默', async () => {
    mockSearch.mockResolvedValue([]);
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), 'zzzz');

    await waitFor(() => expect(screen.getByText(t('search.empty'))).toBeInTheDocument(), { timeout: 2000 });
  });

  it('搜索异常时不会崩溃，按无结果处理', async () => {
    mockSearch.mockRejectedValue(new Error('boom'));
    render(<StockSearch onSelect={vi.fn()} />);
    typeInto(screen.getByPlaceholderText(t('search.placeholder')), 'xyz');

    await waitFor(() => expect(screen.getByText(t('search.empty'))).toBeInTheDocument(), { timeout: 2000 });
  });

  it('点击结果回调 symbol 并清空输入框', async () => {
    mockSearch.mockResolvedValue([{ symbol: 'NVDA', name: '英伟达', exchange: 'US' }]);
    const onSelect = vi.fn();
    render(<StockSearch onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(t('search.placeholder'));
    typeInto(input, '英伟');

    await waitFor(() => expect(screen.getByText(/NVDA/)).toBeInTheDocument(), { timeout: 2000 });
    fireEvent.click(screen.getByText(/NVDA/));

    expect(onSelect).toHaveBeenCalledWith('NVDA');
    expect((input as HTMLInputElement).value).toBe('');
  });
});
