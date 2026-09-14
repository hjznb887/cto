import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import StockSearch from './components/StockSearch';
import StockList from './components/StockList';
import StockDetail from './components/StockDetail';
import AlertEditor from './components/AlertEditor';
import type { AlertRule } from './components/AlertEditor';
import { getWatchlistStocks } from './services/stockService';
import { loadWatchlist, saveWatchlist, loadAlerts, saveAlerts } from './services/persistence';
import { Stock } from './types/stock';
import './index.css';

// --- Dashboard Component ---
const Dashboard: React.FC<{
  watchlist: Stock[];
  onRemove: (symbol: string) => void;
  onAdd: (symbol: string) => void;
  loading: boolean;
  error: string | null;
  alerts: AlertRule[];
  onDeleteAlert: (id: string) => void;
  onToggleAlert: (id: string) => void;
}> = ({ watchlist, onRemove, onAdd, loading, error, alerts, onDeleteAlert, onToggleAlert }) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-10 text-center">
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-emerald-400 mb-2 tracking-tight">
          StockAll
        </h1>
        <p className="text-slate-400 text-lg font-medium">Your intelligent global market companion.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center">
              <span className="mr-2 text-2xl">🔍</span> Search Markets
            </h2>
            <StockSearch onSelect={onAdd} />
          </section>
          
          <section className="bg-slate-800/40 rounded-3xl border border-slate-700/50 overflow-hidden backdrop-blur-md shadow-xl">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-400 animate-pulse font-medium">Syncing your watchlist...</p>
              </div>
            ) : error ? (
              <div className="p-10 text-center">
                <div className="inline-block p-4 bg-red-500/10 rounded-full mb-4">
                  <span className="text-3xl">⚠️</span>
                </div>
                <p className="text-red-400 font-semibold">{error}</p>
              </div>
            ) : (
              <StockList 
                stocks={watchlist} 
                onRemove={onRemove} 
                onSelect={(symbol) => navigate(`/stock/${symbol}`)}
                title="My Watchlist" 
              />
            )}
          </section>
        </div>

        {/* Sidebar - Alerts */}
        <div className="space-y-8">
          <section className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center">
                <span className="mr-2 text-2xl">🔔</span> Active Alerts
              </h2>
              <button 
                onClick={() => navigate('/alerts/new')}
                className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-xl transition-all border border-blue-500/30"
                title="Create Alert"
              >
                <span className="text-xl">+</span>
              </button>
            </div>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed border-slate-700/50 rounded-2xl">
                  <p className="text-slate-500 text-sm italic">No alerts configured yet.</p>
                  <button 
                    onClick={() => navigate('/alerts/new')}
                    className="mt-4 text-xs font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest"
                  >
                    Set your first alert
                  </button>
                </div>
              ) : (
                alerts.map(alert => (
                  <div key={alert.id} className={`p-4 rounded-2xl border transition-all ${alert.active ? 'bg-slate-900/60 border-slate-700 shadow-lg' : 'bg-slate-950/20 border-slate-800/50 opacity-60'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-blue-400">{alert.symbol}</span>
                      <div className="flex gap-2">
                        <button onClick={() => navigate(`/alerts/edit/${alert.id}`)} className="text-xs hover:text-blue-400 text-slate-500">Edit</button>
                        <button onClick={() => onToggleAlert(alert.id)} className="text-xs hover:text-white text-slate-500">
                          {alert.active ? 'Pause' : 'Enable'}
                        </button>
                        <button onClick={() => onDeleteAlert(alert.id)} className="text-xs hover:text-red-400 text-slate-500">Delete</button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-300">
                      {alert.type === 'price_threshold' && `${(alert.params.direction ?? '').toUpperCase()} $${alert.params.threshold}`}
                      {alert.type === 'ma_crossover' && `MA ${alert.params.shortPeriod} cross ${alert.params.longPeriod}`}
                      {alert.type === 'rsi_level' && `RSI ${(alert.params.direction ?? '').toUpperCase()} ${alert.params.rsiLevel}`}
                      {alert.type === 'volume_spike' && `${alert.params.volumeMultiplier}x VOL SPIKE`}
                      {alert.type === 'price_change' && `${alert.params.percentChange}% in ${alert.params.minutes}m`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

// --- Stock Detail Page wrapper ---
const StockDetailWrapper: React.FC<{
  onAdd: (stock: Stock) => void;
  onRemove: (symbol: string) => void;
  watchlist: Stock[];
}> = ({ onAdd, onRemove, watchlist }) => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  
  if (!symbol) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <StockDetail 
        symbol={symbol}
        onBack={() => navigate('/')}
        onAddToWatchlist={onAdd}
        onRemoveFromWatchlist={onRemove}
        isInWatchlist={watchlist.some(s => s.symbol === symbol)}
        onCreateAlert={(s) => navigate(`/alerts/new?symbol=${s}`)}
      />
    </div>
  );
};

// --- Alert Editor wrapper (new alert) ---
const AlertCreatorWrapper: React.FC<{
  onSave: (rule: AlertRule) => void;
}> = ({ onSave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const initialSymbol = query.get('symbol') || '';

  return (
    <div className="py-10">
      <AlertEditor 
        initialSymbol={initialSymbol}
        onSave={(rule) => {
          onSave(rule);
          navigate('/');
        }}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

// --- Alert Editor wrapper (edit existing alert) ---
const AlertEditWrapper: React.FC<{
  alerts: AlertRule[];
  onSave: (rule: AlertRule) => void;
}> = ({ alerts, onSave }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const rule = alerts.find(a => a.id === id);

  if (!rule) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-400 mb-6">Alert not found. It may have been deleted.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="py-10">
      <AlertEditor 
        initialRule={rule}
        onSave={(updated) => {
          onSave(updated);
          navigate('/');
        }}
        onCancel={() => navigate('/')}
      />
    </div>
  );
};

function App() {
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const stocks = await getWatchlistStocks();
        // A saved watchlist wins over the demo defaults: once the user has
        // curated their list, reloading should not resurrect the seed data.
        const saved = loadWatchlist();
        setWatchlist(saved.length > 0 ? saved : stocks);
        setAlerts(loadAlerts<AlertRule>());
      } catch (err) {
        setError('Failed to fetch watchlist stocks.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const handleAddStock = (symbolOrStock: string | Stock) => {
    const symbol = typeof symbolOrStock === 'string' ? symbolOrStock : symbolOrStock.symbol;
    if (watchlist.some(s => s.symbol === symbol)) return;

    const next = typeof symbolOrStock === 'object'
      ? [...watchlist, symbolOrStock]
      : [...watchlist, {
          symbol, name: symbol, price: 0, change: 0, changePercent: 0, exchange: 'Unknown'
        }];
    setWatchlist(next);
    saveWatchlist(next);
  };

  const handleRemoveStock = (symbol: string) => {
    const next = watchlist.filter(s => s.symbol !== symbol);
    setWatchlist(next);
    saveWatchlist(next);
  };

  const handleSaveAlert = (rule: AlertRule) => {
    // Upsert: replace an existing alert with the same id, otherwise append
    const exists = alerts.some(a => a.id === rule.id);
    const newAlerts = exists
      ? alerts.map(a => a.id === rule.id ? rule : a)
      : [...alerts, rule];
    setAlerts(newAlerts);
    saveAlerts(newAlerts);
  };

  const handleDeleteAlert = (id: string) => {
    const newAlerts = alerts.filter(a => a.id !== id);
    setAlerts(newAlerts);
    saveAlerts(newAlerts);
  };

  const handleToggleAlert = (id: string) => {
    const newAlerts = alerts.map(a => a.id === id ? { ...a, active: !a.active } : a);
    setAlerts(newAlerts);
    saveAlerts(newAlerts);
  };

  return (
    <Router>
      <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans selection:bg-blue-500/30 selection:text-white">
        <div className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={
              <Dashboard 
                watchlist={watchlist} 
                onRemove={handleRemoveStock} 
                onAdd={handleAddStock}
                loading={loading}
                error={error}
                alerts={alerts}
                onDeleteAlert={handleDeleteAlert}
                onToggleAlert={handleToggleAlert}
              />
            } />
            <Route path="/stock/:symbol" element={
              <StockDetailWrapper 
                onAdd={handleAddStock} 
                onRemove={handleRemoveStock} 
                watchlist={watchlist} 
              />
            } />
            <Route path="/alerts/new" element={
              <AlertCreatorWrapper onSave={handleSaveAlert} />
            } />
            <Route path="/alerts/edit/:id" element={
              <AlertEditWrapper alerts={alerts} onSave={handleSaveAlert} />
            } />
          </Routes>
        </div>

        <footer className="mt-20 py-12 border-t border-slate-800/50 bg-slate-900/20 backdrop-blur-sm text-center">
          <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-500 uppercase tracking-[0.2em] font-bold mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-full border border-slate-700/30">
              <span className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
              Node <span id="node-version" className="text-slate-400"></span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-full border border-slate-700/30">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              Chrome <span id="chrome-version" className="text-slate-400"></span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-full border border-slate-700/30">
              <span className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
              Electron <span id="electron-version" className="text-slate-400"></span>
            </div>
          </div>
          <p className="text-slate-600 text-[10px] uppercase tracking-widest">
            Developed by Team Shipwright • StockAll Desktop Engine v1.0.0
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
