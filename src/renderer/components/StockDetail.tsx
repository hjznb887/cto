import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StockDetail as IStockDetail, PricePoint, Stock } from '../types/stock';
import { getStockDetails, getHistoricalData, Timeframe } from '../services/stockService';
import { useI18n } from '../i18n/useI18n';

interface StockDetailProps {
  symbol: string;
  onBack: () => void;
  onAddToWatchlist: (stock: Stock) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  isInWatchlist: boolean;
  onCreateAlert: (symbol: string) => void;
}

const StockDetail: React.FC<StockDetailProps> = ({
  symbol,
  onBack,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  isInWatchlist,
  onCreateAlert
}) => {
  const { t } = useI18n();
  const [stock, setStock] = useState<IStockDetail | null>(null);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const detail = await getStockDetails(symbol);
      if (detail) {
        setStock(detail);
        const hist = await getHistoricalData(symbol, timeframe);
        setHistory(hist);
      }
      setLoading(false);
    };
    fetchData();
  }, [symbol, timeframe]);

  if (loading && !stock) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-400 animate-pulse">{t('detail.loading')}</div>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-4">
        <button onClick={onBack} className="mb-4 text-blue-400 hover:underline">{t('detail.back')}</button>
        <div className="text-red-400">{t('detail.notFound')}</div>
      </div>
    );
  }

  const isPositive = stock.change >= 0;

  return (
    <div className="p-6 bg-slate-900 text-white rounded-lg shadow-xl">
      <div className="flex justify-between items-start mb-6">
        <div>
          <button onClick={onBack} className="mb-2 text-blue-400 hover:text-blue-300 flex items-center transition-colors">
            <span className="mr-1">←</span> {t('watchlist.title')}
          </button>
          <h1 className="text-3xl font-bold">{stock.name} ({stock.symbol})</h1>
          <p className="text-gray-400">{stock.exchange} • {stock.sector}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onCreateAlert(stock.symbol)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded text-white font-medium transition-colors"
          >
            🔔 {t('alerts.create')}
          </button>
          <button
            onClick={() => isInWatchlist ? onRemoveFromWatchlist(stock.symbol) : onAddToWatchlist(stock)}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isInWatchlist 
                ? 'bg-red-900/50 text-red-200 hover:bg-red-800/50 border border-red-700' 
                : 'bg-green-600 hover:bg-green-500 text-white'
            }`}
          >
            {isInWatchlist ? t('detail.removeFromWatchlist') : '+ ' + t('detail.addToWatchlist')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-slate-800 p-4 rounded-xl border border-slate-700">
          <div className="flex justify-between items-end mb-4">
            <div>
              <span className="text-4xl font-bold">${stock.price.toFixed(2)}</span>
              <span className={`ml-3 text-lg font-semibold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
              {(['1D', '1W', '1M', '3M', '1Y', '5Y'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    timeframe === tf ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val.toFixed(0)}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke={isPositive ? '#4ade80' : '#f87171'} 
                  strokeWidth={2} 
                  dot={false}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">{t('detail.stats')}</h2>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.open')}</span>
              <span className="font-semibold">${stock.open.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.close')}</span>
              <span className="font-semibold">${stock.close.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.high')}</span>
              <span className="font-semibold">${stock.high.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.low')}</span>
              <span className="font-semibold">${stock.low.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.volume')}</span>
              <span className="font-semibold">{stock.volume.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('detail.marketCap')}</span>
              <span className="font-semibold">${(stock.marketCap / 1000000000).toFixed(2)}B</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
        <h2 className="text-xl font-bold mb-3">About {stock.name}</h2>
        <p className="text-gray-300 leading-relaxed leading-7">{stock.description}</p>
      </div>
    </div>
  );
};

export default StockDetail;
