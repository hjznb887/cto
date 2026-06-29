import React, { useState, useEffect } from 'react';
import { searchStocks } from '../services/stockService';
import { StockSearchResult } from '../types/stock';

interface StockSearchProps {
  onSelect: (ticker: string) => void;
}

const StockSearch: React.FC<StockSearchProps> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowResults] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      if (query.length > 1) {
        setLoading(true);
        try {
          const searchResults = await searchStocks(query);
          setResults(searchResults);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return (
    <div className="stock-search" style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
      <input
        type="text"
        placeholder="Search stocks (e.g. AAPL, Apple)..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: '100%', padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc' }}
      />
      {loading && <div style={{ position: 'absolute', right: '10px', top: '8px' }}>Loading...</div>}
      {showDropdown && results.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '0 0 4px 4px',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          zIndex: 1000,
          color: 'black'
        }}>
          {results.map((result) => (
            <li
              key={result.ticker}
              onClick={() => {
                onSelect(result.ticker);
                setQuery('');
                setShowResults(false);
              }}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              <strong>{result.ticker}</strong> - {result.name} ({result.exchange})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StockSearch;
