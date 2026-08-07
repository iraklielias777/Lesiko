import React from 'react';
import { Globe } from 'lucide-react';
import { EntitySeo } from '../../types';
import { SEO_LIMITS, applyTitleTemplate, truncate } from '../../lib/seo';

/**
 * The SEO inputs shared by the products, categories, sub-categories and brands
 * editors, plus the per-page editor. Keeping them in one component is what
 * makes "every landing page has the same fields" true rather than aspirational.
 */

const counterTone = (length: number, limit: number) => {
  if (length === 0) return 'text-gray-300';
  if (length > limit) return 'text-red-500';
  if (length > limit - 10) return 'text-amber-500';
  return 'text-gray-400';
};

export const CharCounter = ({ value, limit }: { value: string; limit: number }) => (
  <span className={`text-[10px] font-medium tabular-nums ${counterTone(value.length, limit)}`}>
    {value.length}/{limit}
  </span>
);

const Field = ({
  label,
  limit,
  value,
  onChange,
  placeholder,
  multiline,
  accent
}: {
  label: string;
  limit?: number;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  accent?: boolean;
}) => (
  <div>
    <div className="flex items-baseline justify-between mb-2">
      <label className={`block text-[10px] font-bold uppercase tracking-wider ${accent ? 'text-brand-green' : 'text-gray-900'}`}>
        {label}
      </label>
      {limit !== undefined && <CharCounter value={value} limit={limit} />}
    </div>
    {multiline ? (
      <textarea
        className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-brand-green"
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    ) : (
      <input
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-brand-green"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
    )}
  </div>
);

/**
 * Approximates the Google result so an operator can see the truncation happen
 * instead of learning about it from a rankings report three weeks later.
 */
export const SerpPreview = ({
  title,
  description,
  url,
  siteName,
  titleTemplate = '%s | %site%'
}: {
  title: string;
  description: string;
  url: string;
  siteName: string;
  titleTemplate?: string;
}) => {
  const rendered = applyTitleTemplate(titleTemplate, title.trim(), siteName);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3">Search preview</p>
      <p className="text-xs text-gray-600 truncate">{url}</p>
      <p className="text-[#1a0dab] text-lg leading-snug truncate">
        {truncate(rendered, SEO_LIMITS.title) || `${siteName}`}
      </p>
      <p className="text-sm text-gray-600 leading-snug mt-0.5">
        {truncate(description, SEO_LIMITS.description) || 'No description yet — search engines will invent one from the page.'}
      </p>
    </div>
  );
};

interface EntitySeoFieldsProps {
  value: EntitySeo;
  onChange: (patch: Partial<EntitySeo>) => void;
  /** What the storefront falls back to when these fields are blank. */
  generatedTitle?: string;
  generatedDescription?: string;
  previewUrl: string;
  siteName: string;
  titleTemplate?: string;
  compact?: boolean;
}

export const EntitySeoFields = ({
  value,
  onChange,
  generatedTitle = '',
  generatedDescription = '',
  previewUrl,
  siteName,
  titleTemplate,
  compact
}: EntitySeoFieldsProps) => (
  <div className="space-y-5">
    {!compact && (
      <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
        <Globe className="w-3.5 h-3.5" /> Search engine listing
      </h4>
    )}

    <div className="grid md:grid-cols-2 gap-4">
      <Field
        label="Meta title (EN)"
        limit={SEO_LIMITS.title}
        value={value.metaTitle || ''}
        placeholder={generatedTitle}
        onChange={v => onChange({ metaTitle: v })}
      />
      <Field
        label="Meta title (KA)"
        limit={SEO_LIMITS.title}
        value={value.metaTitleKa || ''}
        onChange={v => onChange({ metaTitleKa: v })}
        accent
      />
      <Field
        label="Meta description (EN)"
        limit={SEO_LIMITS.description}
        value={value.metaDescription || ''}
        placeholder={truncate(generatedDescription)}
        onChange={v => onChange({ metaDescription: v })}
        multiline
      />
      <Field
        label="Meta description (KA)"
        limit={SEO_LIMITS.description}
        value={value.metaDescriptionKa || ''}
        onChange={v => onChange({ metaDescriptionKa: v })}
        multiline
        accent
      />
    </div>

    <Field
      label="Meta keywords"
      value={value.metaKeywords || ''}
      placeholder="comma, separated, terms"
      onChange={v => onChange({ metaKeywords: v })}
    />

    <SerpPreview
      title={value.metaTitle || generatedTitle}
      description={value.metaDescription || generatedDescription}
      url={previewUrl}
      siteName={siteName}
      titleTemplate={titleTemplate}
    />

    <p className="text-[11px] text-gray-400">
      Leave a field blank and the storefront generates it from the content above. Georgian falls back to English.
    </p>
  </div>
);

export { Field as SeoField };
