import React, { useState } from 'react';
import StockSearch from './StockSearch';
import { useI18n } from '../i18n/useI18n';

/**
 * Parameter bag for alert rules.
 * All fields optional: only the params relevant to the selected rule type
 * are meaningful (e.g. `threshold` for price_threshold, `rsiLevel` for rsi_level).
 */
export interface AlertParams {
  threshold?: number;
  direction?: string;
  shortPeriod?: number;
  longPeriod?: number;
  rsiLevel?: number;
  volumeMultiplier?: number;
  percentChange?: number;
  minutes?: number;
}

export interface AlertRule {
  id: string;
  symbol: string;
  type: string;
  params: AlertParams;
  notifications: {
    sound: boolean;
    toast: boolean;
    email: boolean;
  };
  active: boolean;
}

interface AlertEditorProps {
  initialSymbol?: string;
  initialRule?: AlertRule;
  onSave: (rule: AlertRule) => void;
  onCancel: () => void;
}

/**
 * 预警类型。name / description 存的是词条 key，渲染时经 t() 取值，
 * 因此切换语言后这些文案会跟着变，无需重新构造数组。
 */
const ALERT_TYPES = [
  { id: 'price_threshold', nameKey: 'type.price_threshold', descKey: 'type.price_threshold.desc' },
  { id: 'ma_crossover', nameKey: 'type.ma_crossover', descKey: 'type.ma_crossover.desc' },
  { id: 'rsi_level', nameKey: 'type.rsi_level', descKey: 'type.rsi_level.desc' },
  { id: 'volume_spike', nameKey: 'type.volume_spike', descKey: 'type.volume_spike.desc' },
  { id: 'price_change', nameKey: 'type.price_change', descKey: 'type.price_change.desc' },
] as const;

const DEFAULT_PARAMS = {
  threshold: 0,
  direction: 'above',
  shortPeriod: 20,
  longPeriod: 50,
  rsiLevel: 70,
  volumeMultiplier: 2.0,
  percentChange: 5,
  minutes: 15
};

const AlertEditor: React.FC<AlertEditorProps> = ({ initialSymbol = '', initialRule, onSave, onCancel }) => {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState(initialRule?.symbol ?? initialSymbol);
  const [type, setType] = useState(initialRule?.type ?? ALERT_TYPES[0].id);
  const [params, setParams] = useState<AlertParams>({ ...DEFAULT_PARAMS, ...(initialRule?.params ?? {}) });
  const [notifications, setNotifications] = useState(initialRule?.notifications ?? {
    sound: true,
    toast: true,
    email: false,
  });
  const [active, setActive] = useState(initialRule?.active ?? true);

  const handleSave = () => {
    if (!symbol) {
      alert(t('editor.selectStockFirst'));
      return;
    }
    onSave({
      id: initialRule?.id ?? Math.random().toString(36).substr(2, 9),
      symbol,
      type,
      params,
      notifications,
      active
    });
  };

  return (
    <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 max-w-2xl mx-auto shadow-2xl">
      <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-700 pb-4">
        {initialRule ? t('editor.editTitle') : t('editor.createTitle')}
      </h2>
      
      <div className="space-y-6">
        {/* Stock Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('editor.targetStock')}</label>
          {symbol ? (
            <div className="flex justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-700">
              <span className="text-xl font-bold text-blue-400">{symbol}</span>
              <button 
                onClick={() => setSymbol('')}
                className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg transition-colors"
              >
                {t('editor.change')}
              </button>
            </div>
          ) : (
            <StockSearch onSelect={setSymbol} />
          )}
        </div>

        {/* Algorithm Selector */}
        <div>
          <label htmlFor="alert-type" className="block text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">{t('editor.alertType')}</label>
          <select 
            id="alert-type"
            value={type} 
            onChange={(e) => setType(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
          >
            {ALERT_TYPES.map((def) => (
              <option key={def.id} value={def.id}>{t(def.nameKey)}</option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-500 italic">
            {(() => {
              const def = ALERT_TYPES.find((d) => d.id === type);
              return def ? t(def.descKey) : '';
            })()}
          </p>
        </div>

        {/* Parameters */}
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50">
          <label className="block text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">{t('editor.parameters')}</label>
          
          {type === 'price_threshold' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="param-direction" className="block text-xs text-gray-500 mb-1">{t('editor.direction')}</label>
                <select 
                  id="param-direction"
                  value={params.direction}
                  onChange={(e) => setParams({...params, direction: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="above">{t('editor.above')}</option>
                  <option value="below">{t('editor.below')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="param-threshold" className="block text-xs text-gray-500 mb-1">{t('editor.price')}</label>
                <input 
                  id="param-threshold"
                  type="number" 
                  value={params.threshold}
                  onChange={(e) => setParams({...params, threshold: parseFloat(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>
          )}

          {type === 'ma_crossover' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="param-short-period" className="block text-xs text-gray-500 mb-1">{t('editor.shortPeriod')}</label>
                <input 
                  id="param-short-period"
                  type="number" 
                  value={params.shortPeriod} 
                  onChange={(e) => setParams({...params, shortPeriod: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
                />
              </div>
              <div>
                <label htmlFor="param-long-period" className="block text-xs text-gray-500 mb-1">{t('editor.longPeriod')}</label>
                <input 
                  id="param-long-period"
                  type="number" 
                  value={params.longPeriod} 
                  onChange={(e) => setParams({...params, longPeriod: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
                />
              </div>
            </div>
          )}

          {type === 'rsi_level' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="param-direction" className="block text-xs text-gray-500 mb-1">Direction</label>
                <select 
                  id="param-direction"
                  value={params.direction}
                  onChange={(e) => setParams({...params, direction: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="above">{t('editor.aboveOverbought')}</option>
                  <option value="below">{t('editor.belowOversold')}</option>
                </select>
              </div>
              <div>
                <label htmlFor="param-rsi-level" className="block text-xs text-gray-500 mb-1">{t('editor.rsiLevel')}</label>
                <input 
                  id="param-rsi-level"
                  type="number" 
                  value={params.rsiLevel} 
                  onChange={(e) => setParams({...params, rsiLevel: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
                />
              </div>
            </div>
          )}

          {type === 'volume_spike' && (
            <div>
              <label htmlFor="param-volume-multiplier" className="block text-xs text-gray-500 mb-1">{t('editor.volumeMultiplier')}</label>
              <input 
                id="param-volume-multiplier"
                type="number" 
                step="0.1"
                value={params.volumeMultiplier} 
                onChange={(e) => setParams({...params, volumeMultiplier: parseFloat(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
              />
            </div>
          )}

          {type === 'price_change' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="param-percent-change" className="block text-xs text-gray-500 mb-1">{t('editor.percentChange')}</label>
                <input 
                  id="param-percent-change"
                  type="number" 
                  value={params.percentChange} 
                  onChange={(e) => setParams({...params, percentChange: parseFloat(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
                />
              </div>
              <div>
                <label htmlFor="param-minutes" className="block text-xs text-gray-500 mb-1">{t('editor.timeframeMin')}</label>
                <input 
                  id="param-minutes"
                  type="number" 
                  value={params.minutes} 
                  onChange={(e) => setParams({...params, minutes: parseInt(e.target.value)})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white" 
                />
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div>
          <label className="block text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{t('editor.notifications')}</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                aria-label="Sound notification"
                checked={notifications.sound} 
                onChange={(e) => setNotifications({...notifications, sound: e.target.checked})}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-gray-300 group-hover:text-white transition-colors">{t('editor.sound')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                aria-label="Toast notification"
                checked={notifications.toast} 
                onChange={(e) => setNotifications({...notifications, toast: e.target.checked})}
                className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-offset-slate-800"
              />
              <span className="text-gray-300 group-hover:text-white transition-colors">{t('editor.toast')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group opacity-50">
              <input type="checkbox" disabled aria-label="Email notification" className="w-5 h-5 rounded border-slate-700 bg-slate-900" />
              <span className="text-gray-300">{t('editor.email')}</span>
            </label>
          </div>
        </div>

        {/* Status Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
          <div>
            <span className="block font-bold text-white">{t('editor.ruleStatus')}</span>
            <span className="text-xs text-gray-500 uppercase tracking-tighter">{t('editor.ruleStatusHint')}</span>
          </div>
          <button 
            onClick={() => setActive(!active)}
            aria-label={t('editor.toggleAria')}
            role="switch"
            aria-checked={active}
            className={`w-14 h-8 rounded-full transition-all relative ${active ? 'bg-emerald-600' : 'bg-slate-700'}`}
          >
            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${active ? 'left-7' : 'left-1'}`}></div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4 pt-6 border-t border-slate-700">
          <button 
            onClick={handleSave}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            {t('editor.saveRule')}
          </button>
          <button 
            onClick={onCancel}
            className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all active:scale-95"
          >
            {t('editor.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertEditor;
