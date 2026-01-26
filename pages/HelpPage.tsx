
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Mail, Phone, Clock, Send, CheckCircle, Package, RefreshCw, ShoppingBag, User } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { SEO } from '../components/seo/SEO';

export const HelpPage = () => {
  const { t } = useTranslation();
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null);
  const [contactStatus, setContactStatus] = useState<'idle' | 'success'>('idle');

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? null : index);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submit
    setContactStatus('success');
    setTimeout(() => setContactStatus('idle'), 3000);
  };

  const faqs = [
    { question: t('help.q1'), answer: t('help.a1'), category: 'shipping' },
    { question: t('help.q2'), answer: t('help.a2'), category: 'shipping' },
    { question: t('help.q3'), answer: t('help.a3'), category: 'returns' },
    { question: t('help.q6'), answer: t('help.a6'), category: 'account' },
    { question: t('help.q4'), answer: t('help.a4'), category: 'products' },
    { question: t('help.q5'), answer: t('help.a5'), category: 'products' },
  ];

  return (
    <div className="bg-white min-h-screen">
      <SEO title={t('help.title')} description="Frequently Asked Questions and Support for LesiKo Cosmetics." />

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
                         <a href="mailto:support@lesiko.com" className="text-gray-600 hover:text-brand-green transition-colors">support@lesiko.com</a>
                      </div>
                   </div>
                   
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-green border border-gray-100 shadow-sm">
                         <Phone className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 mb-1">{t('help.callUs')}</h4>
                         <a href="tel:+995555123456" className="text-gray-600 hover:text-brand-green transition-colors">+995 555 123 456</a>
                      </div>
                   </div>

                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-brand-green border border-gray-100 shadow-sm">
                         <Clock className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 mb-1">{t('help.workingHours')}</h4>
                         <p className="text-gray-600">{t('help.monFri')}</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Contact Form */}
             <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactStatus === 'success' ? (
                    <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg flex items-center gap-3 animate-fade-in">
                        <CheckCircle className="w-5 h-5" />
                        {t('help.successMsg')}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label={t('help.name')} required />
                            <Input label={t('help.email')} type="email" required />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-900 uppercase tracking-wider mb-2">{t('help.message')}</label>
                            <textarea 
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-1 focus:ring-brand-green focus:border-brand-green outline-none min-h-[120px]"
                                required
                            ></textarea>
                        </div>
                        <Button type="submit" size="lg" className="w-full" rightIcon={<Send className="w-4 h-4"/>}>
                            {t('help.send')}
                        </Button>
                    </>
                )}
             </form>
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
                    <p className="text-sm text-gray-500 mt-1">Track & Info</p>
                </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center">
                    <RefreshCw className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{t('help.returns')}</h4>
                    <p className="text-sm text-gray-500 mt-1">Policy & Request</p>
                </div>
            </div>
            <div className="flex items-center gap-4 p-6 bg-white border border-gray-100 rounded-xl hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-bold text-gray-900">{t('help.account')}</h4>
                    <p className="text-sm text-gray-500 mt-1">Manage Profile</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
