
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook, Instagram, Twitter, Youtube, Send, MessageCircle, Music2, Globe, LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../lib/use-categories';
import { categoryLabel } from '../../lib/taxonomy';
import { splitWordmark } from '../../lib/wordmark';
import { useSettingsStore } from '../../store/settings-store';
import { ContentService, DEFAULT_FOOTER } from '../../services/content-service';
import { FooterContent, FooterLink, SocialPlatform } from '../../types';

/**
 * Every visible string here comes from the `footer_content` block, which the
 * admin edits under Content → Footer. Nothing is hardcoded except the
 * wordmark, which follows the store name. `{year}`, `{store}` and `{email}`
 * are filled in at render time so the legal line and the contact button never
 * go stale.
 */

const PLATFORM_ICON: Record<SocialPlatform, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  youtube: Youtube,
  telegram: Send,
  whatsapp: MessageCircle,
  tiktok: Music2,
};

const isExternal = (href: string) => /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('tel:');

/** Tailwind needs literal class names, so the column count maps to a fixed set. */
const GRID_FOR_COLUMNS: Record<number, string> = {
  0: 'lg:grid-cols-2',
  1: 'lg:grid-cols-3',
  2: 'lg:grid-cols-4',
  3: 'lg:grid-cols-5',
  4: 'lg:grid-cols-6',
};

export const Footer = () => {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const storeName = useSettingsStore(s => s.settings.storeName);
  const supportEmail = useSettingsStore(s => s.settings.supportEmail);
  const [content, setContent] = useState<FooterContent>(DEFAULT_FOOTER);

  useEffect(() => {
    ContentService.getFooterContent().then(setContent).catch(() => {});
  }, []);

  const isKa = i18n.language === 'ka';
  const pick = (en?: string, ka?: string) => (isKa && ka ? ka : en || '');
  const fill = (text: string) =>
    text
      .replace(/\{year\}/g, String(new Date().getFullYear()))
      .replace(/\{store\}/g, storeName)
      .replace(/\{email\}/g, supportEmail || '');
  const [head, tail] = splitWordmark(storeName);

  const renderLink = (link: FooterLink, className: string) => {
    const label = pick(link.label, link.labelKa);
    if (!label || !link.href) return null;
    return isExternal(link.href) ? (
      <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer" className={className}>{label}</a>
    ) : (
      <Link key={link.id} to={link.href} className={className}>{label}</Link>
    );
  };

  const columns = content.columns.filter(column => column.links.length || column.autoCategories);
  const socials = content.socials.filter(social => social.url?.trim());
  const contactLabel = fill(pick(content.contactLabel, content.contactLabelKa) || (supportEmail ? 'Email {email}' : ''));
  const legal = fill(pick(content.legalLine, content.legalLineKa) || DEFAULT_FOOTER.legalLine!);
  const linkClass = 'hover:text-brand-green transition-colors';

  return (
    <footer className="bg-brand-dark text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${GRID_FOR_COLUMNS[Math.min(columns.length, 4)]} gap-12 mb-12`}>
          {/* Brand */}
          <div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white mb-6 block">
              {head}<span className="text-brand-green">{tail}</span>
            </span>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {pick(content.about, content.aboutKa)}
            </p>
            {socials.length > 0 && (
              <div className="flex gap-4">
                {socials.map(social => {
                  const Icon = PLATFORM_ICON[social.platform] || Globe;
                  return (
                    <a
                      key={social.id}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.platform}
                      className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-green transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link columns — as many as the admin defines */}
          {columns.map(column => (
            <div key={column.id}>
              <h4 className="font-heading font-semibold text-lg mb-6">{pick(column.title, column.titleKa)}</h4>
              <ul className="space-y-4 text-sm text-gray-400">
                {column.links.map(link => {
                  const node = renderLink(link, linkClass);
                  return node ? <li key={link.id}>{node}</li> : null;
                })}
                {!!column.autoCategories && categories.slice(0, column.autoCategories).map(cat => (
                  <li key={cat.slug}>
                    <Link to={`/category/${cat.slug}`} className={linkClass}>
                      {categoryLabel(cat, i18n.language)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact — a real mailto, never a fake subscribe form. */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">
              {pick(content.newsletterTitle, content.newsletterTitleKa)}
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              {pick(content.newsletterText, content.newsletterTextKa)}
            </p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(`${storeName} enquiry`)}`}
                className="inline-block bg-brand-green text-white font-medium py-3 px-5 rounded hover:bg-[#9BC12A] transition-colors text-sm"
              >
                {contactLabel}
              </a>
            ) : (
              <Link
                to="/help"
                className="inline-block bg-brand-green text-white font-medium py-3 px-5 rounded hover:bg-[#9BC12A] transition-colors text-sm"
              >
                {contactLabel || t('account.helpFaqs')}
              </Link>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>{legal}</p>
          {content.bottomLinks.length > 0 && (
            <div className="flex gap-6 mt-4 md:mt-0">
              {content.bottomLinks.map(link => renderLink(link, 'hover:text-white'))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};
