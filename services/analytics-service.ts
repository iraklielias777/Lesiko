import { supabase } from '../lib/supabase';

export interface FunnelCounts {
  views: number;
  addToCart: number;
  checkout: number;
  purchases: number;
}

export interface AnalyticsProduct {
  id: string;
  name: string;
  slug: string;
  views: number;
  addToCart: number;
  units: number;
  revenue: number;
}

export interface AnalyticsCategory {
  slug: string;
  label: string;
  views: number;
  revenue: number;
}

export interface AnalyticsSearch {
  term: string;
  count: number;
}

export interface AnalyticsSummary {
  days: number;
  funnel: FunnelCounts;
  previous: FunnelCounts;
  products: AnalyticsProduct[];
  rarelyBought: AnalyticsProduct[];
  categories: AnalyticsCategory[];
  searches: AnalyticsSearch[];
}

const emptyFunnel = (): FunnelCounts => ({ views: 0, addToCart: 0, checkout: 0, purchases: 0 });

export const emptySummary = (days: number): AnalyticsSummary => ({
  days,
  funnel: emptyFunnel(),
  previous: emptyFunnel(),
  products: [],
  rarelyBought: [],
  categories: [],
  searches: [],
});

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const funnel = (raw: Record<string, unknown> | null | undefined): FunnelCounts => ({
  views: num(raw?.views),
  addToCart: num(raw?.addToCart),
  checkout: num(raw?.checkout),
  purchases: num(raw?.purchases),
});

export const AnalyticsService = {
  summary: async (days: number): Promise<AnalyticsSummary> => {
    if (!supabase) return emptySummary(days);
    const { data, error } = await supabase.rpc('analytics_summary', { p_days: days });
    if (error) throw new Error(error.message);
    const row = (data ?? {}) as Record<string, unknown>;
    const list = <T,>(value: unknown, map: (item: Record<string, unknown>) => T): T[] =>
      Array.isArray(value) ? value.map(item => map(item as Record<string, unknown>)) : [];
    return {
      days: num(row.days) || days,
      funnel: funnel(row.funnel as Record<string, unknown>),
      previous: funnel(row.previous as Record<string, unknown>),
      products: list(row.products, item => ({
        id: String(item.id),
        name: String(item.name || ''),
        slug: String(item.slug || ''),
        views: num(item.views),
        addToCart: num(item.addToCart),
        units: num(item.units),
        revenue: num(item.revenue),
      })),
      rarelyBought: list(row.rarelyBought, item => ({
        id: String(item.id),
        name: String(item.name || ''),
        slug: String(item.slug || ''),
        views: num(item.views),
        addToCart: num(item.addToCart),
        units: num(item.units),
        revenue: num(item.revenue),
      })),
      categories: list(row.categories, item => ({
        slug: String(item.slug || ''),
        label: String(item.label || item.slug || ''),
        views: num(item.views),
        revenue: num(item.revenue),
      })),
      searches: list(row.searches, item => ({
        term: String(item.term || ''),
        count: num(item.count),
      })),
    };
  },
};
