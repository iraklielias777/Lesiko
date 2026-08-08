
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '../../lib/use-categories';
import { categoryLabel } from '../../lib/taxonomy';
import { splitWordmark } from '../../lib/wordmark';
import { useSettingsStore } from '../../store/settings-store';
import { ContentService } from '../../services/content-service';
import { FooterContent } from '../../types';

export const Footer = () => {
  const { t, i18n } = useTranslation();
  const categories = useCategories();
  const storeName = useSettingsStore(s => s.settings.storeName);
  const supportEmail = useSettingsStore(s => s.settings.supportEmail);
  const [content, setContent] = useState<FooterContent | null>(null);

  useEffect(() => {
    ContentService.getFooterContent().then(setContent).catch(() => {});
  }, []);

  const isKa = i18n.language === 'ka';
  const pick = (en?: string, ka?: string) => (isKa && ka ? ka : en || '');
  const [head, tail] = splitWordmark(storeName);

  const socials = [
    { url: content?.instagramUrl, Icon: Instagram, label: 'Instagram' },
    { url: content?.facebookUrl, Icon: Facebook, label: 'Facebook' },
    { url: content?.twitterUrl, Icon: Twitter, label: 'Twitter' }
  ].filter(s => s.url);

  return (
    <footer className="bg-brand-dark text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white mb-6 block">
              {head}<span className="text-brand-green">{tail}</span>
            </span>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              {pick(content?.about, content?.aboutKa)}
            </p>
            <div className="flex gap-4">
              {socials.map(({ url, Icon, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-green transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">{t('common.shop')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/products" className="hover:text-brand-green transition-colors">{t('common.shopAll')}</Link></li>
              {categories.slice(0, 3).map(cat => (
                <li key={cat.slug}>
                  <Link to={`/category/${cat.slug}`} className="hover:text-brand-green transition-colors">
                    {categoryLabel(cat, i18n.language)}
                  </Link>
                </li>
              ))}
              <li><Link to="/sale" className="hover:text-brand-green transition-colors">{t('common.sale')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/help" className="hover:text-brand-green transition-colors">FAQs</Link></li>
              <li><Link to="/help" className="hover:text-brand-green transition-colors">{t('checkout.shipping')}</Link></li>
              <li><Link to="/help" className="hover:text-brand-green transition-colors">Contact Us</Link></li>
              <li><Link to="/track-order" className="hover:text-brand-green transition-colors">{t('product.trackPackage')}</Link></li>
              <li><Link to="/account" className="hover:text-brand-green transition-colors">{t('common.myAccount')}</Link></li>
            </ul>
          </div>

          {/* Stay in touch — real mailto only (no fake subscribe form). */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">
              {pick(content?.newsletterTitle, content?.newsletterTitleKa) || 'Stay in touch'}
            </h4>
            <p className="text-gray-400 text-sm mb-4">
              {pick(content?.newsletterText, content?.newsletterTextKa) ||
                'Questions about an order or the catalogue? Email support and we will help.'}
            </p>
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}?subject=${encodeURIComponent(`${storeName} enquiry`)}`}
                className="inline-block bg-brand-green text-white font-medium py-3 px-5 rounded hover:bg-[#9BC12A] transition-colors text-sm"
              >
                Email {supportEmail}
              </a>
            ) : (
              <Link
                to="/help"
                className="inline-block bg-brand-green text-white font-medium py-3 px-5 rounded hover:bg-[#9BC12A] transition-colors text-sm"
              >
                Contact support
              </Link>
            )}
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {storeName}. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/help" className="hover:text-white">Support</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
