import React, { useState, useEffect } from 'react';
import StockSearch from './components/StockSearch';
import StockList from './components/StockList';
import { getStockDetails, getWatchlistStocks } from './services/stockService';
import { Stock } from './types/stock';
import './index.css';

function App() {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const stocks = await getWatchlistStocks();
        setWatchlist(stocks);
      } catch (err) {
        setError('Failed to fetch watchlist stocks.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleAddStock = async (ticker: string) => {
    if (watchlist.some(s => s.ticker === ticker)) {
      alert('Stock already in watchlist!');
      return;
    }

    try {
      const stock = await getStockDetails(ticker);
      if (stock) {
        setWatchlist(prev => [...prev, stock]);
      }
    } catch (err) {
      alert('Failed to add stock.');
      console.error(err);
    }
  };

  const handleRemoveStock = (ticker: string) => {
    setWatchlist(prev => prev.filter(s => s.ticker !== ticker));
  };

  return (
    <div className="App" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header className="App-header">
        <h1 style={{ textAlign: 'center', color: '#61dafb' }}>StockAll</h1>
        <p style={{ textAlign: 'center', marginBottom: '30px' }}>Global market companion for tracking and alerts.</p>
        
        <StockSearch onSelect={handleAddStock} />
        
        {loading ? (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading watchlist...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#f44336' }}>{error}</div>
        ) : (
          <StockList 
            stocks={watchlist} 
            onRemove={handleRemoveStock} 
            title="My Watchlist" 
          />
        )}
      </header>

      <footer style={{ marginTop: '50px', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
        <div className="versions">
          Node: <span id="node-version"></span>,
          Chrome: <span id="chrome-version"></span>,
          Electron: <span id="electron-version"></span>
        </div>
      </footer>
    </div>
  );
}

export default App;
