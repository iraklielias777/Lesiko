
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-brand-dark text-white pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Info */}
          <div>
            <span className="font-heading font-bold text-2xl tracking-tight text-white mb-6 block">
              Lesi<span className="text-brand-green">Ko</span>
            </span>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Empowering your beauty journey with premium, science-backed skincare and cosmetics. Discover your unique glow with LesiKo.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-green transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-green transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-brand-green transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">{t('common.shop')}</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/products" className="hover:text-brand-green transition-colors">{t('common.shopAll')}</Link></li>
              <li><Link to="/category/face-care" className="hover:text-brand-green transition-colors">{t('categories.faceCare')}</Link></li>
              <li><Link to="/category/decorative-cosmetics" className="hover:text-brand-green transition-colors">{t('categories.decorative')}</Link></li>
              <li><Link to="/category/brushes" className="hover:text-brand-green transition-colors">{t('categories.brushes')}</Link></li>
              <li><Link to="/sale" className="hover:text-brand-green transition-colors">{t('common.sale')}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Support</h4>
            <ul className="space-y-4 text-sm text-gray-400">
              <li><Link to="/faq" className="hover:text-brand-green transition-colors">FAQs</Link></li>
              <li><Link to="/shipping" className="hover:text-brand-green transition-colors">{t('checkout.shipping')}</Link></li>
              <li><Link to="/contact" className="hover:text-brand-green transition-colors">Contact Us</Link></li>
              <li><Link to="/account/orders" className="hover:text-brand-green transition-colors">{t('product.trackPackage')}</Link></li>
              <li><Link to="/account" className="hover:text-brand-green transition-colors">{t('common.myAccount')}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading font-semibold text-lg mb-6">Stay in the Know</h4>
            <p className="text-gray-400 text-sm mb-4">Subscribe to receive updates, access to exclusive deals, and more.</p>
            <form className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder={t('checkout.email')} 
                className="bg-gray-800 border-none text-white px-4 py-3 rounded focus:ring-2 focus:ring-brand-green outline-none"
              />
              <button className="bg-brand-green text-white font-medium py-3 rounded hover:bg-[#9BC12A] transition-colors">
                Subscribe
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} LesiKo Cosmetics. All rights reserved.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white">Terms of Service</Link>
            <Link to="/admin" className="hover:text-white">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
