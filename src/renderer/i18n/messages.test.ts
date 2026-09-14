import { describe, it, expect, beforeEach, vi } from 'vitest';
import { messages, translateIn, t, DEFAULT_LOCALE, initLocale, setLocale } from './messages';

describe('消息表完整性', () => {
  it('默认语言是中文', () => {
    expect(DEFAULT_LOCALE).toBe('zh-CN');
  });

  it('每种语言与基准语言的键完全一致', () => {
    const baseKeys = Object.keys(messages['zh-CN']).sort();
    for (const locale of Object.keys(messages) as Array<keyof typeof messages>) {
      expect(Object.keys(messages[locale]).sort()).toEqual(baseKeys);
    }
  });

  it('没有空词条', () => {
    for (const locale of Object.keys(messages) as Array<keyof typeof messages>) {
      for (const [key, value] of Object.entries(messages[locale])) {
        expect(value.trim(), `${locale} 的 ${key} 是空的`).not.toBe('');
      }
    }
  });

  it('中文词条确实含中文（防止漏翻）', () => {
    // 这些键本身是英文品牌名或纯数字标签，豁免
    const exempt = new Set(['app.name']);
    const missing: string[] = [];
    for (const [key, value] of Object.entries(messages['zh-CN'])) {
      if (exempt.has(key)) continue;
      if (!/[\u4e00-\u9fff]/.test(value)) missing.push(key);
    }
    expect(missing, `以下词条未翻译成中文: ${missing.join(', ')}`).toEqual([]);
  });
});

describe('translateIn', () => {
  it('按语言返回对应文案', () => {
    expect(translateIn('zh-CN', 'table.symbol')).toBe('代码');
    expect(translateIn('en', 'table.symbol')).toBe('Symbol');
  });

  it('未知键回退为键名本身', () => {
    expect(translateIn('zh-CN', 'no.such.key' as never)).toBe('no.such.key');
  });
});

describe('全局语言状态', () => {
  beforeEach(() => {
    localStorage.clear();
    setLocale(DEFAULT_LOCALE);
  });

  it('默认返回中文词条', () => {
    expect(t('detail.open')).toBe('开盘');
  });

  it('切换语言后 t() 返回英文', () => {
    setLocale('en');
    expect(t('detail.open')).toBe('Open');
  });

  it('语言写入 localStorage', () => {
    setLocale('en');
    expect(localStorage.getItem('stockall_locale')).toBe('en');
  });

  it('initLocale 能恢复已保存的语言', () => {
    localStorage.setItem('stockall_locale', 'en');
    expect(initLocale()).toBe('en');
  });

  it('存储里的非法值会被忽略', () => {
    localStorage.setItem('stockall_locale', 'klingon');
    expect(initLocale()).toBe(DEFAULT_LOCALE);
  });

  it('存储损坏时不抛异常', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => initLocale()).not.toThrow();
    spy.mockRestore();
  });
});
