import React, { useState, useEffect } from 'react';
import { searchStocks } from '../services/stockService';
import { StockSearchResult } from '../types/stock';
import { useI18n } from '../i18n/useI18n';

interface StockSearchProps {
  onSelect: (symbol: string) => void;
}

/** 少于此长度不触发搜索——但会在界面上明确告知用户。 */
const MIN_QUERY_LENGTH = 1;

const StockSearch: React.FC<StockSearchProps> = ({ onSelect }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowResults] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      const q = query.trim();

      if (q.length >= MIN_QUERY_LENGTH) {
        setLoading(true);
        try {
          const searchResults = await searchStocks(q);
          setResults(searchResults);
          setShowResults(true);
          setSearched(true);
        } catch (error) {
          console.error('Search error:', error);
          setResults([]);
          setShowResults(true);
          setSearched(true);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
        setSearched(false);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [query]);

  const handleSelect = (symbol: string) => {
    onSelect(symbol);
    setQuery('');
    setShowResults(false);
    setResults([]);
    setSearched(false);
  };

  const showEmptyState = showDropdown && searched && results.length === 0 && !loading;

  return (
    <div className="stock-search relative w-full">
      <input
        type="text"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label={t('search.placeholder')}
        autoComplete="off"
        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 focus:outline-none transition-colors"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          {t('search.loading')}
        </div>
      )}

      {/*
        max-h + overflow-y-auto 是必需的：结果多时下拉会超出窗口底部，
        加滚动条才能保证每一条都够得着。z-50 配合父区块的 z-30 才生效。
      */}
      {(showDropdown && results.length > 0) || showEmptyState ? (
        <ul className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl list-none p-0 m-0 z-50 max-h-[320px] overflow-y-auto">
          {results.map((result) => (
            <li key={result.symbol}>
              <button
                type="button"
                onClick={() => handleSelect(result.symbol)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-700 transition-colors border-b border-slate-700/60 last:border-b-0"
              >
                <span className="font-bold text-blue-400">{result.symbol}</span>
                <span className="text-slate-300"> · {result.name}</span>
                <span className="text-xs text-slate-500"> ({result.exchange})</span>
              </button>
            </li>
          ))}
          {showEmptyState && (
            <li className="px-4 py-3 text-sm text-slate-400 text-center">
              {t('search.empty')}
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
};

export default StockSearch;
