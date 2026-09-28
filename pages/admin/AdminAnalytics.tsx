import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnalyticsService, AnalyticsSummary, emptySummary, FunnelCounts } from '../../services/analytics-service';
import { useFormatPrice } from '../../lib/format';

const RANGES = [7, 30, 90] as const;

const rate = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

const trend = (current: number, previous: number) => {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const isEmpty = (summary: AnalyticsSummary) => {
  const f = summary.funnel;
  return f.views + f.addToCart + f.checkout + f.purchases === 0
    && summary.products.length === 0
    && summary.categories.length === 0
    && summary.searches.length === 0;
};

export const AdminAnalytics = () => {
  const { t } = useTranslation();
  const fmt = useFormatPrice();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary(30));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    AnalyticsService.summary(days)
      .then(next => { if (!cancelled) setSummary(next); })
      .catch(err => { if (!cancelled) setError(err?.message || 'Could not load analytics'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const steps: { key: keyof FunnelCounts; label: string }[] = [
    { key: 'views', label: t('admin.analyticsViews') },
    { key: 'addToCart', label: t('admin.analyticsAddToCart') },
    { key: 'checkout', label: t('admin.analyticsCheckout') },
    { key: 'purchases', label: t('admin.analyticsPurchases') },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-gray-900">{t('admin.analytics')}</h1>
          <p className="text-gray-500">{t('admin.analyticsDesc')}</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(range => (
            <button
              key={range}
              type="button"
              onClick={() => setDays(range)}
              className={`px-3 py-1.5 text-sm font-bold rounded-full border ${
                days === range ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {t('admin.analyticsDays', { count: range })}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-400">{t('common.loading')}</p>}

      {!loading && isEmpty(summary) && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-gray-500">
          {t('admin.analyticsEmpty')}
        </div>
      )}

      {!loading && !isEmpty(summary) && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, index) => {
              const value = summary.funnel[step.key];
              const prior = summary.previous[step.key];
              const delta = trend(value, prior);
              const fromPrev = index > 0 ? rate(value, summary.funnel[steps[index - 1].key]) : null;
              return (
                <div key={step.key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{step.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {fromPrev != null ? t('admin.analyticsFromPrevious', { percent: fromPrev }) : t('admin.analyticsSessions')}
                    {delta != null ? ` · ${delta >= 0 ? '+' : ''}${delta}%` : ''}
                  </p>
                </div>
              );
            })}
          </div>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="font-heading font-bold text-lg px-6 py-4 border-b border-gray-100">{t('admin.analyticsTopProducts')}</h2>
            <ProductTable rows={summary.products} fmt={fmt} empty={t('admin.analyticsEmpty')} />
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="font-heading font-bold text-lg px-6 py-4 border-b border-gray-100">{t('admin.analyticsRarelyBought')}</h2>
            <p className="px-6 pt-3 text-xs text-gray-400">{t('admin.analyticsRarelyBoughtHint')}</p>
            <ProductTable rows={summary.rarelyBought} fmt={fmt} empty={t('admin.analyticsEmpty')} />
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="font-heading font-bold text-lg px-6 py-4 border-b border-gray-100">{t('admin.analyticsTopCategories')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
                  <tr>
                    <th className="px-6 py-3 font-bold">{t('admin.categories')}</th>
                    <th className="px-6 py-3 font-bold">{t('admin.analyticsViews')}</th>
                    <th className="px-6 py-3 font-bold">{t('admin.analyticsRevenue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.categories.length === 0 && (
                    <tr><td className="px-6 py-6 text-gray-400" colSpan={3}>{t('admin.analyticsEmpty')}</td></tr>
                  )}
                  {summary.categories.map(row => (
                    <tr key={row.slug} className="border-t border-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {row.slug === 'shop' ? t('common.shopAll') : row.label}
                      </td>
                      <td className="px-6 py-3">{row.views}</td>
                      <td className="px-6 py-3">{fmt(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="font-heading font-bold text-lg px-6 py-4 border-b border-gray-100">{t('admin.analyticsSearches')}</h2>
            <ul className="divide-y divide-gray-50">
              {summary.searches.length === 0 && <li className="px-6 py-6 text-sm text-gray-400">{t('admin.analyticsEmpty')}</li>}
              {summary.searches.map(row => (
                <li key={row.term} className="px-6 py-3 flex justify-between text-sm">
                  <span className="font-medium text-gray-900">{row.term}</span>
                  <span className="text-gray-500">{row.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};

const ProductTable = ({
  rows,
  fmt,
  empty,
}: {
  rows: AnalyticsSummary['products'];
  fmt: (amount: number) => string;
  empty: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-gray-400">
          <tr>
            <th className="px-6 py-3 font-bold">{t('admin.productName')}</th>
            <th className="px-6 py-3 font-bold">{t('admin.analyticsViews')}</th>
            <th className="px-6 py-3 font-bold">{t('admin.analyticsAddRate')}</th>
            <th className="px-6 py-3 font-bold">{t('admin.analyticsUnits')}</th>
            <th className="px-6 py-3 font-bold">{t('admin.analyticsRevenue')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td className="px-6 py-6 text-gray-400" colSpan={5}>{empty}</td></tr>
          )}
          {rows.map(row => (
            <tr key={row.id} className="border-t border-gray-50">
              <td className="px-6 py-3 font-medium text-gray-900">{row.name}</td>
              <td className="px-6 py-3">{row.views}</td>
              <td className="px-6 py-3">{rate(row.addToCart, row.views) ?? 0}%</td>
              <td className="px-6 py-3">{row.units}</td>
              <td className="px-6 py-3">{fmt(row.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
