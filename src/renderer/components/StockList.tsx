import React, { useState } from 'react';
import { Stock } from '../types/stock';
import { useI18n } from '../i18n/useI18n';

interface StockListProps {
  stocks: Stock[];
  onRemove?: (symbol: string) => void;
  onSelect?: (symbol: string) => void;
  title?: string;
}

type SortKey = 'symbol' | 'name' | 'price' | 'changePercent';

const StockList: React.FC<StockListProps> = ({ stocks, onRemove, onSelect, title }) => {
  const { t } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedStocks = [...stocks].sort((a, b) => {
    let valA = a[sortKey];
    let valB = b[sortKey];

    if (sortOrder === 'desc') {
      [valA, valB] = [valB, valA];
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return valA.localeCompare(valB);
    }
    return (valA as number) - (valB as number);
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="stock-list-container" style={{ marginTop: '20px' }}>
      {title && <h2 style={{ textAlign: 'left', fontSize: '1.2rem', marginBottom: '10px' }}>{title}</h2>}
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #555' }}>
            <th onClick={() => toggleSort('symbol')} style={{ cursor: 'pointer', padding: '10px' }}>{t('table.symbol')}</th>
            <th onClick={() => toggleSort('name')} style={{ cursor: 'pointer', padding: '10px' }}>{t('table.name')}</th>
            <th onClick={() => toggleSort('price')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>{t('table.price')}</th>
            <th onClick={() => toggleSort('changePercent')} style={{ cursor: 'pointer', padding: '10px', textAlign: 'right' }}>{t('table.changePercent')}</th>
            {onRemove && <th style={{ padding: '10px' }}>{t('table.action')}</th>}
          </tr>
        </thead>
        <tbody>
          {sortedStocks.map((stock) => (
            <tr 
              key={stock.symbol} 
              style={{ borderBottom: '1px solid #444', cursor: onSelect ? 'pointer' : 'default' }}
              onClick={() => onSelect?.(stock.symbol)}
              className="hover:bg-slate-800 transition-colors"
            >
              <td style={{ padding: '10px' }}><strong>{stock.symbol}</strong></td>
              <td style={{ padding: '10px' }}>{stock.name}</td>
              <td style={{ padding: '10px', textAlign: 'right' }}>${stock.price.toFixed(2)}</td>
              <td style={{ 
                padding: '10px', 
                textAlign: 'right', 
                color: stock.change >= 0 ? '#4caf50' : '#f44336' 
              }}>
                {stock.change >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
              </td>
              {onRemove && (
                <td style={{ padding: '10px' }}>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(stock.symbol);
                    }} 
                    style={{ background: 'none', border: 'none', color: '#ff5252', cursor: 'pointer' }}
                  >
                    {t('table.remove')}
                  </button>
                </td>
              )}
            </tr>
          ))}
          {stocks.length === 0 && (
            <tr>
              <td colSpan={onRemove ? 5 : 4} style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                {t('watchlist.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StockList;
