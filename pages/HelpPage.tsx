
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mail, Phone, Clock, Send, Package, RefreshCw, User } from 'lucide-react';
import { SEO } from '../components/seo/SEO';
import { ContentService } from '../services/content-service';
import { useSettingsStore } from '../store/settings-store';
import { HelpContent } from '../types';
import { usePageSeo } from '../lib/use-seo';

export const HelpPage = () => {
  const { t, i18n } = useTranslation();
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [content, setContent] = useState<HelpContent | null>(null);
  const storeName = useSettingsStore(s => s.settings.storeName);
  const supportEmail = useSettingsStore(s => s.settings.supportEmail);
  const seo = usePageSeo('help', {
    title: t('help.title'),
    description: `Frequently asked questions and support for ${storeName}.`
  });

  useEffect(() => {
    ContentService.getHelpContent().then(setContent).catch(() => {});
  }, []);

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const isKa = i18n.language === 'ka';
  const pick = (en: string, ka?: string) => (isKa && ka ? ka : en);

  const faqs = (content?.faqs || []).map(f => ({
    question: pick(f.question, f.questionKa),
    answer: pick(f.answer, f.answerKa)
  }));

  // The store-wide support address wins over the one on the help block, so
  // changing it in Settings does not leave a stale address on this page.
  const email = supportEmail || content?.email || '';

  // The FAQ list is already CMS-managed; publishing it as structured data is
  // what makes the answers eligible to appear directly in search results.
  const faqSchema = faqs.length ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs
      .filter(faq => faq.question.trim() && faq.answer.trim())
      .map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        }
      }))
  } : undefined;

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        image={seo.image}
        canonicalPath="/help"
        noindex={seo.noindex}
        structuredData={faqSchema}
      />

      {/* Hero Section */}
      <div className="bg-[#FAFAF9] border-b border-gray-100 py-16 md:py-24">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 block">
             Support
          </span>
          <h1 className="font-heading text-4xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            {t('help.title')}
          </h1>
          <p className="text-lg text-gray-500 font-light">
            {t('help.subtitle')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          
          {/* FAQ Section */}
          <div className="animate-fade-in">
            <h2 className="font-heading text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
               {t('help.faqTitle')}
            </h2>
            
            <div className="space-y-4">
              {content === null && (
                <p className="text-gray-400">{t('common.loading')}</p>
              )}
              {content !== null && faqs.length === 0 && (
                <p className="text-gray-400 italic">{t('help.noFaqs')}</p>
              )}
              {faqs.map((faq, index) => {
                const isOpen = activeAccordion === index;
                return (
                  <div 
                    key={index} 
                    className={`border rounded-xl transition-all duration-300 ${isOpen ? 'border-brand-green bg-brand-green/5' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <button
                      onClick={() => toggleAccordion(index)}
                      className="w-full flex items-center justify-between p-5 text-left focus:outline-none"
                    >
                      <span className={`font-medium text-lg ${isOpen ? 'text-brand-dark' : 'text-gray-700'}`}>
                        {faq.question}
                      </span>
                      <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-green' : 'text-gray-400'}`} />
                    </button>
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-5 pt-0 text-gray-600 leading-relaxed border-t border-transparent">
                        {faq.answer}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contact Section */}
          <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
             <h2 className="font-heading text-3xl font-bold text-gray-900 mb-4">
               {t('help.contactTitle')}
             </h2>
             <p className="text-gray-500 mb-8">{t('help.contactDesc')}</p>

             <div className="bg-gray-50 rounded-2xl p-8 mb-8 border border-gray-100">
                <div className="space-y-6">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-green border border-gray-100 shadow-sm">
                         <Mail className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 mb-1">{t('help.emailUs')}</h4>
                         <a href={`mailto:${email}`} className="text-gray-600 hover:text-brand-green transition-colors">{email}</a>
                      </div>
                   </div>
                   
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-green border border-gray-100 shadow-sm">
                         <Phone className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 mb-1">{t('help.callUs')}</h4>
                         <a href={`tel:${(content?.phone || '').replace(/[^+\d]/g, '')}`} className="text-gray-600 hover:text-brand-green transition-colors">{content?.phone}</a>
                      </div>
                   </div>

                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-green border border-gray-100 shadow-sm">
                         <Clock className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 mb-1">{t('help.workingHours')}</h4>
                         <p className="text-gray-600">{pick(content?.hours || '', content?.hoursKa)}</p>
                      </div>
                   </div>
                </div>
             </div>

             {email ? (
               <a
                 href={`mailto:${email}?subject=${encodeURIComponent(`${storeName} support`)}`}
                 className="inline-flex w-full items-center justify-center gap-2 h-14 px-8 rounded-full bg-brand-green text-white font-medium text-base hover:bg-[#9BC12A] hover:shadow-lg hover:shadow-brand-green/20 transition-all"
               >
                 {t('help.send')}
                 <Send className="w-4 h-4" />
               </a>
             ) : null}
          </div>
        </div>
        
        {/* Quick Links Footer */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-gray-100">
            <div className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                    <Package className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{t('help.shipping')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('help.trackInfo')}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{t('help.returns')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('help.policyRequest')}</p>
                </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{t('help.account')}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t('help.manageProfile')}</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
