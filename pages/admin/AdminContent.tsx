import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToastStore } from '../../store/toast-store';
import { ContentService } from '../../services/content-service';
import { StorageService } from '../../services/storage-service';
import { FaqItem, FooterContent, HelpContent, HeroContent, SocialContent } from '../../types';

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
        <Section title="Footer" hint="About blurb, newsletter copy and the social links in the footer.">
          <div className="grid md:grid-cols-2 gap-6">
            <TextArea label="About (EN)" value={footer.about} onChange={v => setFooterField('about', v)} rows={4} />
            <TextArea label="About (KA)" value={footer.aboutKa || ''} onChange={v => setFooterField('aboutKa', v)} rows={4} accent />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Newsletter title (EN)" value={footer.newsletterTitle} onChange={e => setFooterField('newsletterTitle', e.target.value)} />
            <Input label="Newsletter title (KA)" value={footer.newsletterTitleKa || ''} onChange={e => setFooterField('newsletterTitleKa', e.target.value)} />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <TextArea label="Newsletter text (EN)" value={footer.newsletterText} onChange={v => setFooterField('newsletterText', v)} />
            <TextArea label="Newsletter text (KA)" value={footer.newsletterTextKa || ''} onChange={v => setFooterField('newsletterTextKa', v)} accent />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Input label="Instagram URL" value={footer.instagramUrl} onChange={e => setFooterField('instagramUrl', e.target.value)} />
            <Input label="Facebook URL" value={footer.facebookUrl} onChange={e => setFooterField('facebookUrl', e.target.value)} />
            <Input label="Twitter URL" value={footer.twitterUrl} onChange={e => setFooterField('twitterUrl', e.target.value)} />
          </div>
          <p className="text-xs text-gray-400">Leave a URL blank to hide that icon in the footer.</p>

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
