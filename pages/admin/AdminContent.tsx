import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Link as LinkIcon, Loader2, Plus, Save, Trash2, UploadCloud, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { ContentService } from '../../services/content-service';
import { StorageService } from '../../services/storage-service';
import { FaqItem, FooterContent, HelpContent, HeroContent, SocialContent } from '../../types';
import type { FooterColumn, FooterLink, FooterSocial, SocialPlatform } from '../../types';

type Tab = 'hero' | 'help' | 'footer' | 'social';

const TABS: { id: Tab; label: string }[] = [
  { id: 'hero', label: 'Hero' },
  { id: 'help', label: 'Help & FAQ' },
  { id: 'footer', label: 'Footer' },
  { id: 'social', label: 'Social grid' }
];

const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 space-y-6">
    <div className="border-b border-gray-100 pb-2">
      <h3 className="font-heading font-bold text-lg">{title}</h3>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
    {children}
  </div>
);

const TextArea = ({
  label,
  value,
  onChange,
  rows = 3,
  accent
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  accent?: boolean;
}) => (
  <div>
    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-2 ${accent ? 'text-brand-green' : 'text-gray-900'}`}>
      {label}
    </label>
    <textarea
      className="w-full border border-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-brand-green"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

export const AdminContent = () => {
  const addToast = useToastStore(s => s.addToast);

  const [tab, setTab] = useState<Tab>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hero, setHero] = useState<HeroContent | null>(null);
  const [help, setHelp] = useState<HelpContent | null>(null);
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const [social, setSocial] = useState<SocialContent | null>(null);
  const [dirty, setDirty] = useState<Record<Tab, boolean>>({ hero: false, help: false, footer: false, social: false });

  // Replaced images are only deleted once the block saves, so abandoning an
  // edit cannot remove an image the storefront is still rendering.
  const [replaced, setReplaced] = useState<string[]>([]);

  const heroFileRef = useRef<HTMLInputElement>(null);
  const socialFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      ContentService.getHeroContent(),
      ContentService.getHelpContent(),
      ContentService.getFooterContent(),
      ContentService.getSocialContent()
    ])
      .then(([h, hp, f, s]) => {
        setHero(h);
        setHelp(hp);
        setFooter(f);
        setSocial(s);
      })
      .catch(() => addToast('Failed to load site content', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const hasUnsaved = Object.values(dirty).some(Boolean);
  useEffect(() => {
    if (!hasUnsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsaved]);

  const markDirty = (t: Tab) => setDirty(prev => ({ ...prev, [t]: true }));

  const purgeReplaced = async () => {
    for (const url of replaced) {
      if (url.includes('supabase.co')) await StorageService.deleteFile(url);
    }
    setReplaced([]);
  };

  const trackReplacement = (previous?: string, next?: string) => {
    if (previous && previous !== next && previous.includes('supabase.co')) {
      setReplaced(prev => [...prev, previous]);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      return await StorageService.uploadFile(file, 'content');
    } catch {
      addToast('Upload failed', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const fetchImage = async (): Promise<string | null> => {
    const url = window.prompt('Enter image URL:');
    if (!url) return null;
    setUploading(true);
    try {
      return await StorageService.uploadFromUrl(url, 'content');
    } catch {
      addToast('Failed to fetch image', 'error');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const save = async (t: Tab) => {
    setSaving(true);
    try {
      if (t === 'hero' && hero) await ContentService.updateHeroContent(hero);
      if (t === 'help' && help) await ContentService.updateHelpContent(help);
      if (t === 'footer' && footer) await ContentService.updateFooterContent(footer);
      if (t === 'social' && social) await ContentService.updateSocialContent(social);
      await purgeReplaced();
      setDirty(prev => ({ ...prev, [t]: false }));
      addToast('Content saved');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to save content', 'error');
    } finally {
      setSaving(false);
    }
  };

  const setHeroField = (field: keyof HeroContent, value: string) => {
    setHero(prev => (prev ? { ...prev, [field]: value } : prev));
    markDirty('hero');
  };

  const setHelpField = (field: 'email' | 'phone' | 'hours' | 'hoursKa', value: string) => {
    setHelp(prev => (prev ? { ...prev, [field]: value } : prev));
    markDirty('help');
  };

  const setFaqField = (id: string, field: keyof FaqItem, value: string) => {
    setHelp(prev => (prev ? { ...prev, faqs: prev.faqs.map(f => (f.id === id ? { ...f, [field]: value } : f)) } : prev));
    markDirty('help');
  };

  const moveFaq = (index: number, delta: number) => {
    setHelp(prev => {
      if (!prev) return prev;
      const next = [...prev.faqs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, faqs: next };
    });
    markDirty('help');
  };

  const addFaq = () => {
    setHelp(prev =>
      prev
        ? {
            ...prev,
            faqs: [
              ...prev.faqs,
              { id: `faq-${Date.now()}`, question: '', questionKa: '', answer: '', answerKa: '' }
            ]
          }
        : prev
    );
    markDirty('help');
  };

  const removeFaq = (id: string) => {
    setHelp(prev => (prev ? { ...prev, faqs: prev.faqs.filter(f => f.id !== id) } : prev));
    markDirty('help');
  };

  const setFooterField = (field: keyof FooterContent, value: string) => {
    setFooter(prev => (prev ? { ...prev, [field]: value } : prev));
    markDirty('footer');
  };

  // ----- footer structure: columns, links, socials ---------------------------
  const patchFooter = (patch: Partial<FooterContent>) => {
    setFooter(prev => (prev ? { ...prev, ...patch } : prev));
    markDirty('footer');
  };

  const swap = <T,>(list: T[], index: number, delta: number): T[] => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  };

  const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  const patchColumn = (id: string, patch: Partial<FooterColumn>) =>
    patchFooter({ columns: (footer?.columns || []).map(c => (c.id === id ? { ...c, ...patch } : c)) });
  const addColumn = () =>
    patchFooter({ columns: [...(footer?.columns || []), { id: newId('col'), title: '', titleKa: '', links: [] }] });
  const removeColumn = (id: string) => patchFooter({ columns: (footer?.columns || []).filter(c => c.id !== id) });
  const moveColumn = (index: number, delta: number) => patchFooter({ columns: swap(footer?.columns || [], index, delta) });

  const patchLink = (columnId: string, linkId: string, patch: Partial<FooterLink>) =>
    patchColumn(columnId, {
      links: (footer?.columns.find(c => c.id === columnId)?.links || []).map(l => (l.id === linkId ? { ...l, ...patch } : l)),
    });
  const addLink = (columnId: string) =>
    patchColumn(columnId, {
      links: [...(footer?.columns.find(c => c.id === columnId)?.links || []), { id: newId('link'), label: '', labelKa: '', href: '/' }],
    });
  const removeLink = (columnId: string, linkId: string) =>
    patchColumn(columnId, { links: (footer?.columns.find(c => c.id === columnId)?.links || []).filter(l => l.id !== linkId) });
  const moveLink = (columnId: string, index: number, delta: number) =>
    patchColumn(columnId, { links: swap(footer?.columns.find(c => c.id === columnId)?.links || [], index, delta) });

  const patchBottomLink = (linkId: string, patch: Partial<FooterLink>) =>
    patchFooter({ bottomLinks: (footer?.bottomLinks || []).map(l => (l.id === linkId ? { ...l, ...patch } : l)) });
  const addBottomLink = () =>
    patchFooter({ bottomLinks: [...(footer?.bottomLinks || []), { id: newId('bottom'), label: '', labelKa: '', href: '/' }] });
  const removeBottomLink = (linkId: string) => patchFooter({ bottomLinks: (footer?.bottomLinks || []).filter(l => l.id !== linkId) });

  const patchSocial = (id: string, patch: Partial<FooterSocial>) =>
    patchFooter({ socials: (footer?.socials || []).map(s => (s.id === id ? { ...s, ...patch } : s)) });
  const addSocial = () =>
    patchFooter({ socials: [...(footer?.socials || []), { id: newId('social'), platform: 'instagram', url: '' }] });
  const removeSocial = (id: string) => patchFooter({ socials: (footer?.socials || []).filter(s => s.id !== id) });

  const SOCIAL_PLATFORMS: SocialPlatform[] = ['instagram', 'facebook', 'tiktok', 'youtube', 'telegram', 'whatsapp', 'twitter'];

  const setSocialField = (field: Exclude<keyof SocialContent, 'images'>, value: string) => {
    setSocial(prev => (prev ? { ...prev, [field]: value } : prev));
    markDirty('social');
  };

  const addSocialImage = (url: string) => {
    setSocial(prev => (prev ? { ...prev, images: [...prev.images, url] } : prev));
    markDirty('social');
  };

  const removeSocialImage = (index: number) => {
    setSocial(prev => {
      if (!prev) return prev;
      trackReplacement(prev.images[index], undefined);
      return { ...prev, images: prev.images.filter((_, i) => i !== index) };
    });
    markDirty('social');
  };

  if (loading || !hero || !help || !footer || !social) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
      </div>
    );
  }

  const saveBar = (t: Tab, label: string) => (
    <div className="pt-6 border-t border-gray-100 flex justify-end">
      <Button onClick={() => save(t)} disabled={!dirty[t] || saving || uploading} leftIcon={<Save className="w-4 h-4" />}>
        {label}
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900">Site Content</h1>
        <p className="text-gray-500">Marketing copy across the storefront. Georgian fields fall back to English when blank.</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === item.id
                ? 'border-brand-green text-brand-dark'
                : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {item.label}
            {dirty[item.id] && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-brand-green align-middle" />}
          </button>
        ))}
      </div>

      {tab === 'hero' && (
        <Section title="Homepage hero" hint="The full-width banner at the top of the homepage.">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Input label="Eyebrow (EN)" value={hero.eyebrow} onChange={e => setHeroField('eyebrow', e.target.value)} />
              <Input label="Title (EN)" value={hero.title} onChange={e => setHeroField('title', e.target.value)} />
              <TextArea label="Subtitle (EN)" value={hero.subtitle} onChange={v => setHeroField('subtitle', v)} />
            </div>
            <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <Input label="Eyebrow (KA)" value={hero.eyebrowKa || ''} onChange={e => setHeroField('eyebrowKa', e.target.value)} />
              <Input label="Title (KA)" value={hero.titleKa || ''} onChange={e => setHeroField('titleKa', e.target.value)} />
              <TextArea label="Subtitle (KA)" value={hero.subtitleKa || ''} onChange={v => setHeroField('subtitleKa', v)} accent />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Primary button (EN)" value={hero.primaryLabel} onChange={e => setHeroField('primaryLabel', e.target.value)} />
            <Input label="Primary button (KA)" value={hero.primaryLabelKa || ''} onChange={e => setHeroField('primaryLabelKa', e.target.value)} />
            <Input
              label="Primary link"
              value={hero.primaryLink}
              onChange={e => setHeroField('primaryLink', e.target.value)}
              leftIcon={<LinkIcon className="w-4 h-4 text-gray-400" />}
            />
            <div />
            <Input label="Secondary button (EN)" value={hero.secondaryLabel} onChange={e => setHeroField('secondaryLabel', e.target.value)} />
            <Input label="Secondary button (KA)" value={hero.secondaryLabelKa || ''} onChange={e => setHeroField('secondaryLabelKa', e.target.value)} />
            <Input
              label="Secondary link"
              value={hero.secondaryLink}
              onChange={e => setHeroField('secondaryLink', e.target.value)}
              leftIcon={<LinkIcon className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-900">Hero image</label>
            <div
              onClick={() => !uploading && heroFileRef.current?.click()}
              className="aspect-[16/7] rounded-lg bg-gray-50 overflow-hidden border-2 border-dashed border-gray-200 relative group cursor-pointer hover:border-brand-green transition-all"
            >
              {uploading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-green" />
                </div>
              ) : hero.image ? (
                <>
                  <img src={hero.image} alt="Hero preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                    Replace image
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <UploadCloud className="w-8 h-8 mb-2" />
                  <span className="text-[10px] font-bold uppercase">Upload hero</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={async () => {
                const url = await fetchImage();
                if (url) {
                  trackReplacement(hero.image, url);
                  setHeroField('image', url);
                }
              }}
              className="w-full mt-2 text-[10px] font-bold text-gray-400 hover:text-brand-green flex items-center justify-center gap-1"
            >
              <LinkIcon className="w-3 h-3" /> Fetch from URL
            </button>
            <input
              type="file"
              ref={heroFileRef}
              className="hidden"
              accept="image/*"
              onChange={async e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const url = await uploadImage(file);
                if (url) {
                  trackReplacement(hero.image, url);
                  setHeroField('image', url);
                }
              }}
            />
          </div>

          {saveBar('hero', 'Save hero')}
        </Section>
      )}

      {tab === 'help' && (
        <>
          <Section title="Contact details" hint="Shown on the Help page contact card.">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Support email" type="email" value={help.email} onChange={e => setHelpField('email', e.target.value)} />
              <Input label="Phone" value={help.phone} onChange={e => setHelpField('phone', e.target.value)} />
              <Input label="Hours (EN)" value={help.hours} onChange={e => setHelpField('hours', e.target.value)} />
              <Input label="Hours (KA)" value={help.hoursKa || ''} onChange={e => setHelpField('hoursKa', e.target.value)} />
            </div>
          </Section>

          <Section title="Frequently asked questions" hint="Order here is the order customers see.">
            <div className="space-y-4">
              {help.faqs.map((faq, index) => (
                <div key={faq.id} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Question {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveFaq(index, -1)}
                        disabled={index === 0}
                        className="p-1.5 text-gray-400 hover:text-brand-dark disabled:opacity-30"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFaq(index, 1)}
                        disabled={index === help.faqs.length - 1}
                        className="p-1.5 text-gray-400 hover:text-brand-dark disabled:opacity-30"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFaq(faq.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <Input label="Question (EN)" value={faq.question} onChange={e => setFaqField(faq.id, 'question', e.target.value)} />
                      <TextArea label="Answer (EN)" value={faq.answer} onChange={v => setFaqField(faq.id, 'answer', v)} />
                    </div>
                    <div className="space-y-4">
                      <Input label="Question (KA)" value={faq.questionKa || ''} onChange={e => setFaqField(faq.id, 'questionKa', e.target.value)} />
                      <TextArea label="Answer (KA)" value={faq.answerKa || ''} onChange={v => setFaqField(faq.id, 'answerKa', v)} accent />
                    </div>
                  </div>
                </div>
              ))}
              {help.faqs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">No questions yet.</p>
              )}
            </div>

            <button
              type="button"
              onClick={addFaq}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-brand-green hover:text-brand-green flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add question
            </button>

            {saveBar('help', 'Save help page')}
          </Section>
        </>
      )}

      {tab === 'footer' && (
        <Section title="Footer" hint="Everything in the footer is editable here: the blurb, every link column, the social icons, the contact block and the legal line.">
          <div className="grid md:grid-cols-2 gap-6">
            <TextArea label="About (EN)" value={footer.about} onChange={v => setFooterField('about', v)} rows={4} />
            <TextArea label="About (KA)" value={footer.aboutKa || ''} onChange={v => setFooterField('aboutKa', v)} rows={4} accent />
          </div>

          {/* ---------------------------------------------------- link columns */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Link columns</h4>
              <button type="button" onClick={addColumn} className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add column
              </button>
            </div>
            <p className="text-xs text-gray-400">Links are storefront paths such as <code>/help</code> or full URLs, which open in a new tab. "Auto categories" appends that many top categories to the column so it follows the catalogue.</p>

            {footer.columns.map((column, ci) => (
              <div key={column.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="grid md:grid-cols-3 gap-3 flex-1">
                    <Input label="Column title (EN)" value={column.title} onChange={e => patchColumn(column.id, { title: e.target.value })} />
                    <Input label="Column title (KA)" value={column.titleKa || ''} onChange={e => patchColumn(column.id, { titleKa: e.target.value })} />
                    <Input label="Auto categories" type="number" min="0" max="10" value={column.autoCategories ?? 0} onChange={e => patchColumn(column.id, { autoCategories: Math.max(0, Number(e.target.value) || 0) || undefined })} />
                  </div>
                  <div className="flex flex-col gap-1 pt-6">
                    <button type="button" onClick={() => moveColumn(ci, -1)} className="p-1.5 text-gray-400 hover:text-gray-900" title="Move up"><ArrowUp className="w-4 h-4" /></button>
                    <button type="button" onClick={() => moveColumn(ci, 1)} className="p-1.5 text-gray-400 hover:text-gray-900" title="Move down"><ArrowDown className="w-4 h-4" /></button>
                    <button type="button" onClick={() => removeColumn(column.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Remove column"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-2">
                  {column.links.map((link, li) => (
                    <div key={link.id} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4"><Input placeholder="Label (EN)" value={link.label} onChange={e => patchLink(column.id, link.id, { label: e.target.value })} /></div>
                      <div className="col-span-3"><Input placeholder="Label (KA)" value={link.labelKa || ''} onChange={e => patchLink(column.id, link.id, { labelKa: e.target.value })} /></div>
                      <div className="col-span-4"><Input placeholder="/help or https://…" value={link.href} onChange={e => patchLink(column.id, link.id, { href: e.target.value })} /></div>
                      <div className="col-span-1 flex justify-end gap-0.5">
                        <button type="button" onClick={() => moveLink(column.id, li, -1)} className="p-1 text-gray-300 hover:text-gray-900" title="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => moveLink(column.id, li, 1)} className="p-1 text-gray-300 hover:text-gray-900" title="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => removeLink(column.id, link.id)} className="p-1 text-gray-300 hover:text-red-500" title="Remove link"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addLink(column.id)} className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Add link
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ---------------------------------------------------- contact block */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Contact block</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Title (EN)" value={footer.newsletterTitle} onChange={e => setFooterField('newsletterTitle', e.target.value)} />
              <Input label="Title (KA)" value={footer.newsletterTitleKa || ''} onChange={e => setFooterField('newsletterTitleKa', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <TextArea label="Text (EN)" value={footer.newsletterText} onChange={v => setFooterField('newsletterText', v)} />
              <TextArea label="Text (KA)" value={footer.newsletterTextKa || ''} onChange={v => setFooterField('newsletterTextKa', v)} accent />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Button label (EN)" value={footer.contactLabel || ''} onChange={e => setFooterField('contactLabel', e.target.value)} placeholder="Email {email}" />
              <Input label="Button label (KA)" value={footer.contactLabelKa || ''} onChange={e => setFooterField('contactLabelKa', e.target.value)} placeholder="მოგვწერეთ: {email}" />
            </div>
            <p className="text-xs text-gray-400">The button emails the support address from Settings. <code>{'{email}'}</code> inserts that address into the label.</p>
          </div>

          {/* ---------------------------------------------------- socials */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Social links</h4>
              <button type="button" onClick={addSocial} className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add social
              </button>
            </div>
            {footer.socials.map(social => (
              <div key={social.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-3">
                  <select value={social.platform} onChange={e => patchSocial(social.id, { platform: e.target.value as SocialPlatform })} className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white capitalize">
                    {SOCIAL_PLATFORMS.map(pl => <option key={pl} value={pl}>{pl}</option>)}
                  </select>
                </div>
                <div className="col-span-8"><Input placeholder="https://…" value={social.url} onChange={e => patchSocial(social.id, { url: e.target.value })} /></div>
                <button type="button" onClick={() => removeSocial(social.id)} className="col-span-1 justify-self-end p-1.5 text-gray-300 hover:text-red-500" title="Remove"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <p className="text-xs text-gray-400">An icon only appears when its URL is filled in.</p>
          </div>

          {/* ---------------------------------------------------- legal line */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">Bottom bar</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Legal line (EN)" value={footer.legalLine || ''} onChange={e => setFooterField('legalLine', e.target.value)} placeholder="© {year} {store}. All rights reserved." />
              <Input label="Legal line (KA)" value={footer.legalLineKa || ''} onChange={e => setFooterField('legalLineKa', e.target.value)} />
            </div>
            <p className="text-xs text-gray-400"><code>{'{year}'}</code> and <code>{'{store}'}</code> are filled in automatically.</p>
            <div className="space-y-2">
              {footer.bottomLinks.map(link => (
                <div key={link.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4"><Input placeholder="Label (EN)" value={link.label} onChange={e => patchBottomLink(link.id, { label: e.target.value })} /></div>
                  <div className="col-span-3"><Input placeholder="Label (KA)" value={link.labelKa || ''} onChange={e => patchBottomLink(link.id, { labelKa: e.target.value })} /></div>
                  <div className="col-span-4"><Input placeholder="/help or https://…" value={link.href} onChange={e => patchBottomLink(link.id, { href: e.target.value })} /></div>
                  <button type="button" onClick={() => removeBottomLink(link.id)} className="col-span-1 justify-self-end p-1.5 text-gray-300 hover:text-red-500" title="Remove"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              <button type="button" onClick={addBottomLink} className="text-xs font-bold text-brand-green flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> Add bottom link
              </button>
            </div>
          </div>

          {saveBar('footer', 'Save footer')}
        </Section>
      )}

      {tab === 'social' && (
        <Section title="Social grid" hint="The image strip near the bottom of the homepage.">
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Handle" value={social.handle} onChange={e => setSocialField('handle', e.target.value)} />
            <Input
              label="Profile URL"
              value={social.profileUrl}
              onChange={e => setSocialField('profileUrl', e.target.value)}
              leftIcon={<LinkIcon className="w-4 h-4 text-gray-400" />}
            />
            <Input label="Heading (EN)" value={social.title} onChange={e => setSocialField('title', e.target.value)} />
            <Input label="Heading (KA)" value={social.titleKa || ''} onChange={e => setSocialField('titleKa', e.target.value)} />
            <Input label="Subtitle (EN)" value={social.subtitle} onChange={e => setSocialField('subtitle', e.target.value)} />
            <Input label="Subtitle (KA)" value={social.subtitleKa || ''} onChange={e => setSocialField('subtitleKa', e.target.value)} />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-2 text-gray-900">Images</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {social.images.map((url, index) => (
                <div key={`${url}-${index}`} className="aspect-square rounded-lg overflow-hidden relative group border border-gray-200">
                  <img src={url} alt={`Social ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeSocialImage(index)}
                    className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => !uploading && socialFileRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-brand-green hover:text-brand-green"
              >
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase mt-1">Add</span>
              </button>
            </div>
            <button
              type="button"
              onClick={async () => {
                const url = await fetchImage();
                if (url) addSocialImage(url);
              }}
              className="w-full mt-2 text-[10px] font-bold text-gray-400 hover:text-brand-green flex items-center justify-center gap-1"
            >
              <LinkIcon className="w-3 h-3" /> Fetch from URL
            </button>
            <input
              type="file"
              ref={socialFileRef}
              className="hidden"
              accept="image/*"
              onChange={async e => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                const url = await uploadImage(file);
                if (url) addSocialImage(url);
              }}
            />
          </div>

          {saveBar('social', 'Save social grid')}
        </Section>
      )}
    </div>
  );
};
