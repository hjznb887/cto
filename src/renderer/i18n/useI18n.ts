// ============================================================
// StockAll — i18n React 绑定
//
// 把 messages.ts 的语言状态接到 React 上：切换语言时订阅的
// 组件会重新渲染，取词条的写法和原来一样简单。
// ============================================================

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_LOCALE,
  getLocale,
  initLocale,
  setLocale,
  t as translate,
  type Locale,
  type MessageKey,
} from './messages';

// 首次导入时把已保存的语言读进来
initLocale();

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(): void {
  listeners.forEach((fn) => fn());
}

/** 切换语言；所有使用 useI18n 的组件会同步刷新。 */
export function changeLocale(locale: Locale): void {
  setLocale(locale);
  emit();
}

export interface I18n {
  locale: Locale;
  t: (key: MessageKey) => string;
  setLocale: (locale: Locale) => void;
}

/** 组件内使用。返回当前语言与取词函数。 */
export function useI18n(): I18n {
  const locale = useSyncExternalStore(subscribe, getLocale, () => DEFAULT_LOCALE);
  const t = useCallback((key: MessageKey) => translate(key), [locale]);
  return { locale, t, setLocale: changeLocale };
}

export type { Locale, MessageKey };
