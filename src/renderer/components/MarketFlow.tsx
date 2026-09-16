import React, { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n';
import { pctColorClass as pctClass, formatPct as fmtPct, formatAmount as fmtAmount } from '../utils/format';
import {
  fetchSectorRanking,
  fetchMarketBreadth,
  fetchTopTurnover,
  BREADTH_SCOPE_NOTE,
  type SectorKind,
  type SectorRow,
  type MarketBreadth,
  type TurnoverRow,
} from '../services/marketFlow';

const MarketFlow: React.FC = () => {
  const { t } = useI18n();
  const [breadth, setBreadth] = useState<MarketBreadth | null>(null);
  const [sectors, setSectors] = useState<SectorRow[]>([]);
  const [turnover, setTurnover] = useState<TurnoverRow[]>([]);
  const [kind, setKind] = useState<SectorKind>('industry');
  const [loading, setLoading] = useState(true);
  const [sectorLoading, setSectorLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string>('');

  const loadBreadth = useCallback(async () => {
    try {
      const b = await fetchMarketBreadth();
      setBreadth(b);
      const top = await fetchTopTurnover(20);
      setTurnover(top);
    } catch {
      setError(t('flow.error'));
    }
  }, [t]);

  const loadSectors = useCallback(async (k: SectorKind) => {
    setSectorLoading(true);
    try {
      setSectors(await fetchSectorRanking(k, 20));
    } catch {
      setSectors([]);
    } finally {
      setSectorLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([loadBreadth(), loadSectors(kind)]);
    setUpdatedAt(new Date().toLocaleTimeString());
    setLoading(false);
  }, [loadBreadth, loadSectors, kind]);

  useEffect(() => {
    void refresh();
    // 只在挂载时拉一次：全量请求较慢，不做轮询
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadSectors(kind);
  }, [kind, loadSectors]);

  const upPct = breadth ? breadth.upRatio * 100 : 0;
  const downPct = breadth ? (breadth.down / breadth.total) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-indigo-400 to-emerald-400">
            {t('flow.title')}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{t('flow.subtitle')}</p>
        </div>
        <div className="text-right">
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="text-xs px-4 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 text-slate-300 disabled:opacity-50 transition-colors"
          >
            {loading ? t('flow.loading') : t('flow.refresh')}
          </button>
          {updatedAt && <div className="text-[11px] text-slate-500 mt-1">{t('flow.updatedAt')} {updatedAt}</div>}
        </div>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* ① 涨跌分布 */}
      <section className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-xl">
        <h2 className="text-lg font-bold text-white mb-1">{t('flow.breadth')}</h2>
        <p className="text-[11px] text-slate-500 mb-4">{BREADTH_SCOPE_NOTE}</p>

        {loading && !breadth ? (
          <div className="py-10 text-center text-slate-400">{t('flow.loading')}</div>
        ) : breadth ? (
          <>
            <div className="flex items-baseline gap-3 mb-3">
              <span className="text-4xl font-black text-red-400">{breadth.up}</span>
              <span className="text-slate-500 text-sm">{t('flow.upCount')}</span>
              <span className="text-slate-600 mx-2">/</span>
              <span className="text-4xl font-black text-emerald-400">{breadth.down}</span>
              <span className="text-slate-500 text-sm">{t('flow.downCount')}</span>
              {breadth.flat > 0 && (
                <>
                  <span className="text-slate-600 mx-2">/</span>
                  <span className="text-xl font-bold text-slate-400">{breadth.flat}</span>
                  <span className="text-slate-500 text-sm">{t('flow.flatCount')}</span>
                </>
              )}
            </div>

            {/* 涨跌比例条 */}
            <div className="h-4 rounded-full overflow-hidden bg-slate-900/60 flex">
              <div className="bg-gradient-to-r from-red-500 to-red-400" style={{ width: `${upPct}%` }} />
              <div className="bg-slate-600" style={{ width: `${Math.max(0, 100 - upPct - downPct)}%` }} />
              <div className="bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${downPct}%` }} />
            </div>

            <div className="mt-3 text-sm text-slate-400">
              {t('flow.upRatio')} <span className="text-red-400 font-bold">{upPct.toFixed(1)}%</span>
              <span className="text-slate-600 mx-2">·</span>
              {t('flow.sentiment')}{' '}
              <span className="text-white font-semibold">
                {upPct >= 70 ? t('flow.strong') : upPct >= 55 ? t('flow.mildUp') : upPct >= 45 ? t('flow.mixed') : upPct >= 30 ? t('flow.mildDown') : t('flow.weak')}
              </span>
            </div>
          </>
        ) : null}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ② 板块轮动 */}
        <section className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">{t('flow.sectors')}</h2>
            <div className="flex gap-1">
              {(['industry', 'concept', 'region'] as SectorKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    kind === k
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t(`flow.kind.${k}` as 'flow.kind.industry')}
                </button>
              ))}
            </div>
          </div>

          {sectorLoading ? (
            <div className="py-10 text-center text-slate-400 text-sm">{t('flow.loading')}</div>
          ) : sectors.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">{t('flow.noSector')}</div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {sectors.map((s, i) => (
                <div
                  key={s.code}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 transition-colors"
                >
                  <span className="text-xs text-slate-600 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{s.name}</div>
                    {s.leader && (
                      <div className="text-[11px] text-slate-500 truncate">
                        {t('flow.leader')} {s.leader.name}
                        <span className={`ml-1 ${pctClass(s.leader.changePercent)}`}>
                          {fmtPct(s.leader.changePercent)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${pctClass(s.changePercent)}`}>
                      {fmtPct(s.changePercent)}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      5日 <span className={pctClass(s.changePercent5)}>{fmtPct(s.changePercent5)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ③ 成交额排行 */}
        <section className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/50 backdrop-blur-md shadow-xl">
          <h2 className="text-lg font-bold text-white mb-1">{t('flow.turnover')}</h2>
          <p className="text-[11px] text-slate-500 mb-4">{t('flow.turnoverHint')}</p>

          {loading && turnover.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">{t('flow.loading')}</div>
          ) : (
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {turnover.map((row, i) => (
                <div
                  key={row.symbol + i}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/40 hover:bg-slate-900/70 transition-colors"
                >
                  <span className="text-xs text-slate-600 w-5 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">
                      {row.name} <span className="text-slate-500 text-xs">{row.symbol}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${pctClass(row.changePercent)}`}>
                      {fmtPct(row.changePercent)}
                    </div>
                    <div className="text-[11px] text-slate-500">{fmtAmount(row.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <p className="text-[11px] text-slate-600 text-center pb-4">{t('flow.disclaimer')}</p>
    </div>
  );
};

export default MarketFlow;
