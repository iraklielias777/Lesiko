import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Globe, Link as LinkIcon, Loader2, Save, UploadCloud } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SerpPreview, SeoField } from '../../components/admin/SeoFields';
import { useToastStore } from '../../store/toast-store';
import { useSettingsStore } from '../../store/settings-store';
import { ContentService, SEO_PAGE_KEYS } from '../../services/content-service';
import { StorageService } from '../../services/storage-service';
import { PageSeo, SeoPages } from '../../types';
import { SEO_LIMITS, absoluteUrl } from '../../lib/seo';

// Path each editable page lives at, used for the preview URL and to tell the
// operator which screen they are actually writing copy for.
const PAGE_META: Record<string, { label: string; path: string; hint: string }> = {
  home: { label: 'Homepage', path: '/', hint: 'Leave the title blank to use the site default on its own, with no page prefix.' },
  products: { label: 'Shop all', path: '/products', hint: 'Also the base for filtered views when a category has no copy of its own.' },
  sale: { label: 'Sale', path: '/sale', hint: 'Discounted products listing.' },
  brands: { label: 'Brands', path: '/brands', hint: 'Brand index and the fallback for a brand with no copy of its own.' },
  help: { label: 'Help centre', path: '/help', hint: 'Carries the FAQ rich result, so the description should read like an answer.' },
  wishlist: { label: 'Wishlist', path: '/wishlist', hint: 'Personal to each visitor; normally kept out of the index.' },
  login: { label: 'Sign in', path: '/login', hint: 'Normally kept out of the index.' },
  register: { label: 'Create account', path: '/register', hint: 'Normally kept out of the index.' },
  notFound: { label: 'Not found (404)', path: '/404', hint: 'Shown for any unknown URL. Always kept out of the index.' }
};

const emptyPage = (): PageSeo => ({
  title: '',
  titleKa: '',
  description: '',
  descriptionKa: '',
  keywords: '',
  keywordsKa: '',
  ogImage: '',
  noindex: false
});

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
    <div className="border-b border-gray-100 pb-2">
      <h3 className="font-heading font-bold text-lg">{title}</h3>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
    {children}
  </div>
);

export const AdminSEO = () => {
  const addToast = useToastStore(s => s.addToast);
  const settings = useSettingsStore(s => s.settings);

  const [seo, setSeo] = useState<SeoPages | null>(null);
  const [siteUrl, setSiteUrl] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [openPage, setOpenPage] = useState<string>('home');

  const ogFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([ContentService.getSeoPages(), ContentService.getStoreSettings()])
      .then(([pages, stored]) => {
        setSeo(pages);
        setSiteUrl(stored.siteUrl || '');
        setOgImage(stored.ogImage || '');
      })
      .catch(() => addToast('Failed to load SEO settings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Warn before a reload throws away unsaved copy. Route changes inside the SPA
  // are covered by the guard on the Save button being visibly enabled.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const patchPage = (key: string, patch: Partial<PageSeo>) => {
    setSeo(prev => {
      if (!prev) return prev;
      const current = prev.pages[key] || emptyPage();
      return { ...prev, pages: { ...prev.pages, [key]: { ...current, ...patch } } };
    });
    setDirty(true);
  };

  const patchDefaults = (patch: Partial<PageSeo>) => {
    setSeo(prev => (prev ? { ...prev, defaults: { ...prev.defaults, ...patch } } : prev));
    setDirty(true);
  };

  const patchRoot = (patch: Partial<SeoPages>) => {
    setSeo(prev => (prev ? { ...prev, ...patch } : prev));
    setDirty(true);
  };

  const uploadOgImage = async (file?: File, url?: string) => {
    setUploading(true);
    try {
      const next = file
        ? await StorageService.uploadFile(file, 'content')
        : await StorageService.uploadFromUrl(url!, 'content');
      // The old share image is only removed once the new one is committed.
      if (ogImage && ogImage.includes('supabase.co')) await StorageService.deleteFile(ogImage);
      setOgImage(next);
      setDirty(true);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!seo) return;
    const trimmedUrl = siteUrl.trim().replace(/\/+$/, '');
    // Sitemap and canonical tags cannot invent a production domain. Saving
    // without one used to publish supabase.co URLs to crawlers.
    if (!trimmedUrl) {
      addToast('Set the site address before saving. Sitemap and canonical tags need it.', 'error');
      return;
    }
    try {
      // Reject relative paths and bare hostnames without a scheme so the
      // sitemap never emits malformed <loc> values.
      const parsed = new URL(trimmedUrl);
      if (!/^https?:$/i.test(parsed.protocol)) {
        addToast('Site address must start with https://', 'error');
        return;
      }
    } catch {
      addToast('Site address must be a full URL, e.g. https://lesiko.ge', 'error');
      return;
    }

    setSaving(true);
    try {
      const canonical = trimmedUrl.replace(/^http:/i, 'https:');
      await ContentService.updateSeoPages(seo);
      await ContentService.updateStoreSettings({ ...settings, siteUrl: canonical, ogImage });
      setSiteUrl(canonical);
      // Keep the storefront in sync without a reload; SEO tags read from here.
      useSettingsStore.setState({
        settings: { ...settings, siteUrl: canonical, ogImage },
        seoPages: seo
      });
      setDirty(false);
      addToast('SEO settings saved');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save SEO settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const previewOrigin = useMemo(
    () => (siteUrl.trim() ? siteUrl.trim().replace(/\/+$/, '') : absoluteUrl('', '/')),
    [siteUrl]
  );

  if (loading || !seo) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl pb-24">
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">SEO</h1>
        <p className="text-gray-500">
          Titles and descriptions for every page that is not a product, category or brand. Those are edited on the item itself.
        </p>
      </div>

      {!siteUrl.trim() && (
        <div className="flex gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Set the site address before launch.</p>
            <p className="text-amber-800/80">
              The sitemap, canonical tags and social previews all need one absolute domain. Without it they fall back to
              whatever host the visitor happens to be on, which lets preview deployments compete with the real site in search.
            </p>
          </div>
        </div>
      )}

      <Section title="Site-wide" hint="Applies to every page unless overridden below.">
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Site address"
            value={siteUrl}
            placeholder="https://lesiko.ge"
            onChange={e => { setSiteUrl(e.target.value); setDirty(true); }}
            leftIcon={<Globe className="w-4 h-4 text-gray-400" />}
          />
          <Input
            label="Title template"
            value={seo.titleTemplate}
            placeholder="%s | %site%"
            onChange={e => patchRoot({ titleTemplate: e.target.value })}
          />
        </div>
        <p className="-mt-2 text-[11px] text-gray-400">
          <code>%s</code> is the page title, <code>%site%</code> is the store name ({settings.storeName}).
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <SeoField
            label="Default title (EN)"
            limit={SEO_LIMITS.title}
            value={seo.defaults.title}
            onChange={v => patchDefaults({ title: v })}
          />
          <SeoField
            label="Default title (KA)"
            limit={SEO_LIMITS.title}
            value={seo.defaults.titleKa || ''}
            onChange={v => patchDefaults({ titleKa: v })}
            accent
          />
          <SeoField
            label="Default description (EN)"
            limit={SEO_LIMITS.description}
            value={seo.defaults.description}
            onChange={v => patchDefaults({ description: v })}
            multiline
          />
          <SeoField
            label="Default description (KA)"
            limit={SEO_LIMITS.description}
            value={seo.defaults.descriptionKa || ''}
            onChange={v => patchDefaults({ descriptionKa: v })}
            multiline
            accent
          />
          <SeoField
            label="Default keywords (EN)"
            value={seo.defaults.keywords || ''}
            onChange={v => patchDefaults({ keywords: v })}
          />
          <SeoField
            label="Default keywords (KA)"
            value={seo.defaults.keywordsKa || ''}
            onChange={v => patchDefaults({ keywordsKa: v })}
            accent
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-900">
            Default share image
          </label>
          <div
            onClick={() => !uploading && ogFileRef.current?.click()}
            className="aspect-[1200/630] max-w-sm rounded-lg bg-gray-50 overflow-hidden border-2 border-dashed border-gray-200 relative group cursor-pointer hover:border-brand-green transition-all"
          >
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
              </div>
            ) : ogImage ? (
              <>
                <img src={ogImage} alt="Share preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                  Replace image
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <UploadCloud className="w-8 h-8 mb-2" />
                <span className="text-[10px] font-bold uppercase">Upload 1200 x 630</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) uploadOgImage(undefined, url);
            }}
            className="max-w-sm w-full mt-2 text-[10px] font-bold text-gray-400 hover:text-brand-green flex items-center justify-center gap-1"
          >
            <LinkIcon className="w-3 h-3" /> Fetch from URL
          </button>
          <input
            type="file"
            ref={ogFileRef}
            className="hidden"
            accept="image/*"
            onChange={e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) uploadOgImage(file);
            }}
          />
          <p className="mt-2 text-[11px] text-gray-400">
            Used whenever a page has no image of its own. This is what appears when someone shares a link on Facebook or WhatsApp.
          </p>
        </div>
      </Section>

      <Section title="Verification" hint="Pasted verbatim into the page head. Leave blank if unused.">
        <div className="grid md:grid-cols-3 gap-4">
          <Input
            label="Google Search Console"
            value={seo.verification.google || ''}
            placeholder="content value only"
            onChange={e => patchRoot({ verification: { ...seo.verification, google: e.target.value } })}
          />
          <Input
            label="Bing Webmaster"
            value={seo.verification.bing || ''}
            onChange={e => patchRoot({ verification: { ...seo.verification, bing: e.target.value } })}
          />
          <Input
            label="Facebook domain"
            value={seo.verification.facebookDomain || ''}
            onChange={e => patchRoot({ verification: { ...seo.verification, facebookDomain: e.target.value } })}
          />
        </div>
      </Section>

      <Section title="Pages" hint="One entry per route. Blank fields inherit the site-wide copy above.">
        <div className="space-y-3">
          {SEO_PAGE_KEYS.map(key => {
            const meta = PAGE_META[key];
            const page = seo.pages[key] || emptyPage();
            const isOpen = openPage === key;

            return (
              <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenPage(isOpen ? '' : key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div>
                    <p className="font-medium text-sm text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-400">{meta.path}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {page.noindex && (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                        No index
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{isOpen ? 'Close' : 'Edit'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 pt-2 space-y-5 border-t border-gray-100 bg-gray-50/40">
                    <p className="text-[11px] text-gray-400">{meta.hint}</p>

                    <div className="grid md:grid-cols-2 gap-4">
                      <SeoField
                        label="Title (EN)"
                        limit={SEO_LIMITS.title}
                        value={page.title}
                        onChange={v => patchPage(key, { title: v })}
                      />
                      <SeoField
                        label="Title (KA)"
                        limit={SEO_LIMITS.title}
                        value={page.titleKa || ''}
                        onChange={v => patchPage(key, { titleKa: v })}
                        accent
                      />
                      <SeoField
                        label="Description (EN)"
                        limit={SEO_LIMITS.description}
                        value={page.description}
                        onChange={v => patchPage(key, { description: v })}
                        multiline
                      />
                      <SeoField
                        label="Description (KA)"
                        limit={SEO_LIMITS.description}
                        value={page.descriptionKa || ''}
                        onChange={v => patchPage(key, { descriptionKa: v })}
                        multiline
                        accent
                      />
                      <SeoField
                        label="Keywords (EN)"
                        value={page.keywords || ''}
                        onChange={v => patchPage(key, { keywords: v })}
                      />
                      <SeoField
                        label="Keywords (KA)"
                        value={page.keywordsKa || ''}
                        onChange={v => patchPage(key, { keywordsKa: v })}
                        accent
                      />
                    </div>

                    <SeoField
                      label="Share image URL"
                      value={page.ogImage || ''}
                      placeholder="Falls back to the default share image"
                      onChange={v => patchPage(key, { ogImage: v })}
                    />

                    <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-brand-green"
                        checked={!!page.noindex}
                        onChange={e => patchPage(key, { noindex: e.target.checked })}
                      />
                      Hide this page from search engines
                    </label>

                    <SerpPreview
                      title={page.title || seo.defaults.title}
                      description={page.description || seo.defaults.description}
                      url={`${previewOrigin}${meta.path === '/' ? '' : meta.path}`}
                      siteName={settings.storeName}
                      titleTemplate={seo.titleTemplate}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="robots.txt" hint="Appended to the generated rules. One directive per line.">
        <textarea
          className="w-full border border-gray-200 rounded-lg p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand-green"
          rows={4}
          value={seo.robotsExtra}
          placeholder={'Disallow: /internal\nCrawl-delay: 5'}
          onChange={e => patchRoot({ robotsExtra: e.target.value })}
        />
        <p className="text-[11px] text-gray-400">
          The admin area, cart, checkout and account pages are already excluded, and the sitemap is already linked.
        </p>
      </Section>

      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-white/90 backdrop-blur border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {dirty ? 'Unsaved changes' : 'All changes saved'}
        </span>
        <Button onClick={save} disabled={!dirty || saving || uploading || !siteUrl.trim()} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
          Save SEO settings
        </Button>
      </div>
    </div>
  );
};
