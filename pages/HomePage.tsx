
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Sparkles, UserCheck, Instagram, ChevronRight, Star, ChevronDown, Droplets, Sun, Wind, Activity, Feather } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { ProductService } from '../services/product-service';
import { BrandService } from '../services/brand-service';
import { CategoryService } from '../services/category-service';
import { ContentService } from '../services/content-service';
import { Product, Brand, CategoryHierarchyItem, PromoContent } from '../types';
import { RecentlyViewed } from '../components/product/RecentlyViewed';
import { SEO } from '../components/seo/SEO';

const INSTAGRAM_POSTS = [
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=400',
    'https://images.unsplash.com/photo-1596462502278-27bfdd403348?auto=format&fit=crop&q=80&w=400',
];

export const HomePage = () => {
  const { t, i18n } = useTranslation();
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<CategoryHierarchyItem[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [promoContent, setPromoContent] = useState<PromoContent | null>(null);

  useEffect(() => {
    ProductService.getAllProducts().then(products => {
        const trending = products.filter(p => p.isTrending);
        if (trending.length >= 8) {
            setTrendingProducts(trending.slice(0, 8));
        } else {
            const remaining = products.filter(p => !p.isTrending).slice(0, 8 - trending.length);
            setTrendingProducts([...trending, ...remaining]);
        }
    });

    BrandService.getBrands().then(fetchedBrands => {
        setBrands(fetchedBrands.slice(0, 8));
    });

    CategoryService.getCategories().then(fetchedCategories => {
        setCategories(fetchedCategories);
    });

    ContentService.getPromoContent().then(setPromoContent);
  }, []);

  const toggleCategory = (slug: string) => {
      setExpandedCategory(prev => prev === slug ? null : slug);
  };

  // Helper to select localized content
  const getLocalizedContent = () => {
      if (!promoContent) return { title: t('home.promoTitle'), desc: t('home.promoDesc'), btn: t('home.promoBtn') };
      
      const isKa = i18n.language === 'ka';
      return {
          title: isKa ? (promoContent.titleKa || promoContent.title) : promoContent.title,
          desc: isKa ? (promoContent.descriptionKa || promoContent.description) : promoContent.description,
          btn: isKa ? (promoContent.buttonTextKa || promoContent.buttonText) : promoContent.buttonText
      };
  };

  const promoText = getLocalizedContent();

  const SKIN_TYPES = [
    { 
        name: t('skinTypes.normal'), 
        key: 'Normal',
        link: '/products?skinType=Normal', 
        image: 'https://images.unsplash.com/photo-1551024601-562963341c54?auto=format&fit=crop&q=80&w=800', 
        desc: t('skinTypes.balanced'),
        icon: Activity
    },
    { 
        name: t('skinTypes.dry'), 
        key: 'Dry',
        link: '/products?skinType=Dry', 
        image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=800', 
        desc: t('skinTypes.nourishment'),
        icon: Droplets
    },
    { 
        name: t('skinTypes.oily'), 
        key: 'Oily',
        link: '/products?skinType=Oily', 
        image: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=800', 
        desc: t('skinTypes.shineControl'),
        icon: Sun
    },
    { 
        name: t('skinTypes.combination'), 
        key: 'Combination',
        link: '/products?skinType=Combination', 
        image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800', 
        desc: t('skinTypes.targeted'),
        icon: Wind
    },
    { 
        name: t('skinTypes.sensitive'), 
        key: 'Sensitive',
        link: '/products?skinType=Sensitive', 
        image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800', 
        desc: t('skinTypes.gentle'),
        icon: Feather
    },
  ];

  // Global SEO Schema
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "LesiKo Cosmetics",
        "url": window.location.origin,
        "logo": "https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=200",
        "contactPoint": {
          "@type": "ContactPoint",
          "telephone": "+995-555-555-555",
          "contactType": "Customer Service",
          "areaServed": "GE",
          "availableLanguage": ["en", "ka"]
        },
        "sameAs": [
          "https://instagram.com/lesiko_official",
          "https://facebook.com/lesiko"
        ]
      },
      {
        "@type": "WebSite",
        "name": "LesiKo",
        "url": window.location.origin,
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${window.location.origin}/#/products?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Omit title to use the default premium tagline defined in SEO.tsx */}
      <SEO 
        keywords={['serum', 'cream', 'lipstick', 'skincare georgia', 'cosmetics tbilisi', 'შრატი', 'კრემი', 'ტუჩსაცხი', 'ონლაინ მაღაზია']}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative h-[85vh] md:h-[90vh] min-h-[450px] md:min-h-[600px] flex flex-col md:flex-row overflow-hidden">
        
        {/* Mobile Background Image (Hidden on Desktop) */}
        <div className="absolute inset-0 md:hidden z-0">
            <img 
              src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=800"
              alt="Beauty Model" 
              className="w-full h-full object-cover"
            />
            {/* Improved Gradient Overlay for maximum text readability on mobile */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        </div>

        {/* Text Content */}
        <div className="w-full md:w-1/2 flex items-end md:items-center justify-center p-6 md:p-16 z-10 relative h-full">
          <div className="max-w-xl relative w-full mb-16 md:mb-0">
             
             {/* Decorative Element (Desktop) */}
             <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-green/10 rounded-full blur-3xl hidden md:block"></div>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 md:bg-white border border-white/20 md:border-gray-100 shadow-sm text-white md:text-brand-dark text-[11px] font-bold uppercase tracking-widest mb-6 md:mb-8 backdrop-blur-md md:backdrop-blur-none animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 text-brand-green fill-brand-green" /> {t('home.newCollection')}
            </div>
            
            <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl font-bold mb-4 md:mb-6 leading-[0.95] text-white md:text-brand-dark tracking-tighter drop-shadow-lg md:drop-shadow-none animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {t('home.heroTitle')}
            </h1>
            
            <p className="text-base sm:text-lg text-gray-200 md:text-gray-600 mb-8 md:mb-10 leading-relaxed max-w-md font-light tracking-wide drop-shadow-md md:drop-shadow-none animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              {t('home.heroSubtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Link to="/products" className="w-full sm:w-auto">
                <Button size="lg" className="w-full shadow-xl shadow-brand-green/20">
                  {t('home.shopCollection')}
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 md:bg-transparent border-white/40 md:border-gray-900 text-white md:text-gray-900 hover:bg-white hover:text-brand-dark backdrop-blur-sm md:backdrop-blur-none hover:border-transparent">
                {t('home.takeQuiz')}
              </Button>
            </div>
          </div>
        </div>

        {/* Desktop Image Section (Hidden on Mobile) */}
        <div className="hidden md:block w-1/2 h-full relative overflow-hidden group">
          <div className="absolute inset-0 bg-gray-100 animate-pulse"></div> 
          <img 
            src="https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=1200"
            alt="Beauty Model" 
            className="w-full h-full object-cover animate-float" 
            style={{ animationDuration: '8s' }}
          />
          {/* Subtle gradient to blend image with white background */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-transparent opacity-90"></div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-10 md:mb-16">
            <div>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 mb-2 tracking-tight">{t('home.shopByCategory')}</h2>
              <p className="text-gray-500 font-light text-lg hidden md:block">{t('home.categorySubtitle')}</p>
            </div>
            <Link to="/products" className="hidden md:flex items-center gap-2 text-sm font-bold text-brand-green hover:text-brand-dark transition-colors">
              {t('common.viewAll')} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-6 md:pb-0 md:mx-0 md:px-0 scrollbar-hide scroll-pl-4">
            {categories.slice(0, 6).map((cat, idx) => {
              const isExpanded = expandedCategory === cat.slug;
              return (
                <div 
                  key={cat.slug} 
                  className={`
                    snap-start shrink-0 w-[260px] md:w-auto flex flex-col
                    bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300
                    ${isExpanded ? 'ring-1 ring-brand-green' : ''}
                  `}
                >
                  {/* Image Area */}
                  <Link to={`/category/${cat.slug}`} className="relative aspect-[4/3] md:aspect-square overflow-hidden group block">
                    {cat.image ? (
                        <img 
                          src={cat.image} 
                          alt={cat.label} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}>
                            <span className="text-xs uppercase font-bold opacity-30 text-gray-500">{t(`categories.${cat.slug}`, cat.label)}</span>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-40 transition-opacity duration-300" />
                    <span className="absolute bottom-4 left-4 text-white font-bold text-lg md:hidden shadow-black drop-shadow-md">
                        {t(`categories.${cat.slug}`, cat.label)}
                    </span>
                  </Link>

                  {/* Content Area */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <Link to={`/category/${cat.slug}`} className="font-heading font-bold text-gray-900 hover:text-brand-green transition-colors text-sm md:text-base">
                        {t(`categories.${cat.slug}`, cat.label)}
                      </Link>
                      
                      {/* Mobile Accordion Toggle */}
                      <button 
                        onClick={() => toggleCategory(cat.slug)}
                        className="md:hidden p-1.5 rounded-full hover:bg-gray-100 text-gray-500 active:bg-gray-200 transition-colors"
                        aria-label="Toggle Subcategories"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Subcategories List */}
                    <div className={`
                      text-sm text-gray-500 overflow-hidden transition-all duration-300 ease-in-out
                      ${isExpanded ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100 md:mt-2'}
                    `}>
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 md:border-none md:pt-0">
                        {cat.subs.slice(0, 4).map(sub => (
                          <Link 
                            key={sub} 
                            to={`/category/${cat.slug}?subCategory=${encodeURIComponent(sub)}`}
                            className="flex items-center gap-2 hover:text-brand-green transition-colors py-0.5 group/sub"
                          >
                            <div className="w-1 h-1 rounded-full bg-gray-300 group-hover/sub:bg-brand-green transition-colors md:hidden"></div>
                            <span className="truncate">{t(`subCategories.${sub}`, sub)}</span>
                          </Link>
                        ))}
                        {cat.subs.length > 4 && (
                          <Link to={`/category/${cat.slug}`} className="text-xs font-bold text-brand-green uppercase tracking-wider mt-1 hover:underline">
                            {t('common.viewAll')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="min-w-[1px] md:hidden"></div>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 md:py-24 bg-[#F9F9F8] relative overflow-hidden">
        {/* Subtle decorative blob */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-white rounded-[100%] blur-3xl opacity-60 pointer-events-none"></div>
        
        <div className="container mx-auto relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 px-4">
            {[
              { icon: ShieldCheck, title: t('home.trust.cleanIngredients'), desc: t('home.trust.cleanDesc') },
              { icon: UserCheck, title: t('home.trust.dermatologist'), desc: t('home.trust.dermDesc') },
              { icon: Sparkles, title: t('home.trust.crueltyFree'), desc: t('home.trust.crueltyDesc') },
              { icon: Truck, title: t('home.trust.fastShipping'), desc: t('home.trust.shippingDesc') },
            ].map((item, idx) => (
              <div 
                key={idx} 
                className="group flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1"
              >
                <div className="mb-6 relative">
                   <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-brand-dark group-hover:text-brand-green group-hover:scale-110 transition-all duration-500 ease-premium relative z-10">
                      <item.icon className="w-7 h-7 stroke-[1.5px]" />
                   </div>
                   <div className="absolute inset-0 rounded-full border border-brand-green/30 scale-125 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500 delay-75"></div>
                </div>
                
                <h3 className="font-heading font-bold text-sm md:text-base uppercase tracking-wider text-gray-900 mb-2 group-hover:text-brand-green transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed max-w-[200px]">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trending Horizontal Scroll */}
      <section className="py-16 md:py-24 bg-white relative">
        <div className="container mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-8 md:mb-12 gap-4 border-b border-gray-100 pb-6 px-4">
            <div>
              <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 flex items-center gap-2">
                 {t('home.favorites')}
                 <ArrowRight className="w-3 h-3 md:hidden animate-bounce-x" />
              </span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{t('home.trending')}</h2>
            </div>
            <Link to="/products" className="hidden md:block">
              <Button variant="ghost" className="text-sm font-semibold hover:bg-gray-50" rightIcon={<ArrowRight className="w-4 h-4" />}>
                {t('common.viewAll')}
              </Button>
            </Link>
          </div>
          
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-6 pb-12 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-12 md:px-4 md:pb-0 scroll-pl-6 scrollbar-hide">
            {trendingProducts.length > 0 ? (
                trendingProducts.map((product, idx) => (
                    <div 
                      key={product.id} 
                      className="min-w-[260px] md:min-w-0 snap-start animate-fade-in-up" 
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <ProductCard product={product} />
                    </div>
                ))
            ) : (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="min-w-[260px] md:min-w-0 h-[400px] bg-gray-50 rounded-xl animate-pulse snap-start"></div>
                ))
            )}
            
            <div className="min-w-[150px] flex items-center justify-center md:hidden snap-start">
               <Link to="/products" className="flex flex-col items-center gap-2 text-brand-dark group">
                  <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-colors">
                     <ArrowRight className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wide">{t('common.viewAll')}</span>
               </Link>
            </div>
            <div className="min-w-[4px] md:hidden"></div>
          </div>
          
          <div className="mt-8 text-center md:hidden px-4">
             <Link to="/products" className="block">
                <Button size="lg" variant="outline" className="w-full border-gray-300">
                  {t('common.viewAll')}
                </Button>
             </Link>
          </div>
        </div>
      </section>

      {/* Shop by Skin Type - World Class Redesign */}
      <section className="py-24 bg-brand-dark text-white overflow-hidden relative">
        {/* Background elements */}
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-gray-900 to-transparent opacity-50"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-brand-green/10 rounded-full blur-[100px]"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
             <div className="max-w-2xl">
                <span className="text-brand-green font-bold tracking-[0.2em] uppercase text-xs mb-4 block animate-fade-in flex items-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    {t('home.personalized')}
                </span>
                <h2 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[0.95]">
                    {t('home.skinTypeTitle')}
                </h2>
                <p className="text-gray-400 text-lg font-light max-w-lg leading-relaxed">
                    {t('home.skinTypeDesc')}
                </p>
             </div>
             <Link to="/products">
                <Button variant="secondary" className="hidden md:flex bg-transparent border-white/20 text-white hover:bg-white hover:text-brand-dark transition-all">
                    {t('home.viewSkinTypes')}
                </Button>
             </Link>
          </div>

          {/* Skin Type Cards */}
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 md:grid md:grid-cols-5 md:gap-4 md:pb-0 md:mx-0 md:px-0 scrollbar-hide scroll-pl-4">
             {SKIN_TYPES.map((type, idx) => (
                 <Link 
                    key={idx} 
                    to={type.link} 
                    className="
                        group relative min-w-[260px] md:min-w-0 h-[400px] md:h-[450px] 
                        rounded-2xl overflow-hidden snap-start
                        transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] 
                        hover:shadow-2xl hover:shadow-brand-green/10
                    "
                 >
                    {/* Image with Ken Burns Effect */}
                    <div className="absolute inset-0 overflow-hidden">
                        <img 
                            src={type.image} 
                            alt={type.name} 
                            className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110 opacity-80"
                        />
                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                    </div>

                    {/* Content */}
                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                       {/* Icon */}
                       <div className="mb-auto transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                           <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                <type.icon className="w-5 h-5 text-white" />
                           </div>
                       </div>

                       <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                           <h3 className="font-heading font-bold text-2xl md:text-3xl text-white mb-2 tracking-tight">
                               {type.name}
                           </h3>
                           <div className="h-0.5 w-8 bg-brand-green mb-3 transition-all duration-500 group-hover:w-16"></div>
                           <p className="text-sm text-gray-300 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">
                               {type.desc}
                           </p>
                       </div>

                       {/* Hover Arrow */}
                       <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-100">
                          <div className="w-8 h-8 rounded-full bg-white text-brand-dark flex items-center justify-center">
                              <ArrowRight className="w-4 h-4" />
                          </div>
                       </div>
                    </div>
                 </Link>
             ))}
             <div className="min-w-[10px] md:hidden"></div>
          </div>
          
          <div className="mt-6 md:hidden text-center">
             <span className="text-xs text-gray-500 uppercase tracking-widest animate-pulse">{t('home.swipeToExplore')}</span>
          </div>
        </div>
      </section>

      {/* Shop by Brand Section - World Class Redesign */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
           <div className="text-center mb-16">
              <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 block">{t('home.brandsSubtitle')}</span>
              <h2 className="font-heading text-4xl font-bold text-gray-900 tracking-tight">{t('home.brandsTitle')}</h2>
              <p className="text-gray-500 mt-4 max-w-lg mx-auto font-light text-lg">
                  {t('home.brandsDesc')}
              </p>
           </div>

           <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:pb-0 md:mx-0 md:px-0 scrollbar-hide scroll-pl-4">
              {brands.length > 0 ? (
                  brands.map((brand, idx) => (
                      <Link 
                        key={brand.id}
                        to={`/products?brands=${brand.slug}`}
                        className="
                            group relative aspect-[4/5] md:aspect-square lg:aspect-[4/5] min-w-[260px] md:min-w-0
                            rounded-2xl overflow-hidden snap-start
                            transition-all duration-500 hover:shadow-xl hover:shadow-gray-200
                        "
                      >
                          {/* Background Image */}
                          <div className="absolute inset-0">
                              <img 
                                src={brand.image || 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?auto=format&fit=crop&q=80&w=800'} 
                                alt={brand.name} 
                                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                          </div>

                          {/* Content Overlay */}
                          <div className="absolute inset-0 p-8 flex flex-col justify-end">
                              <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                  <h3 className="font-heading font-bold text-3xl text-white mb-2 tracking-tight">
                                      {brand.name}
                                  </h3>
                                  <div className="w-12 h-0.5 bg-brand-green mb-3 transition-all duration-500 group-hover:w-full opacity-50 group-hover:opacity-100"></div>
                                  <p className="text-sm text-gray-200 font-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 line-clamp-2">
                                      {brand.description || t('home.discoverPremium')}
                                  </p>
                              </div>
                              
                              <div className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
                              </div>
                          </div>
                      </Link>
                  ))
              ) : (
                  [...Array(4)].map((_, i) => (
                      <div key={i} className="min-w-[260px] md:min-w-0 aspect-[4/5] bg-gray-50 rounded-2xl animate-pulse snap-start"></div>
                  ))
              )}
           </div>
        </div>
      </section>

      {/* Promo Section */}
      {promoContent && (
        <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-green/10 via-transparent to-transparent"></div>
            <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 relative h-[300px] md:h-[500px] w-full max-w-lg mx-auto md:order-2 group">
                <div className="absolute inset-0 bg-brand-green/20 rounded-3xl transform rotate-6 scale-95 blur-3xl opacity-50 transition-opacity group-hover:opacity-80"></div>
                <img 
                src={promoContent.image || 'https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=800'} 
                alt={promoText.title}
                className="absolute inset-0 w-full h-full object-cover rounded-md shadow-2xl transform transition-transform duration-1000 ease-out group-hover:scale-105"
                />
            </div>
            <div className="flex-1 text-center md:text-left md:order-1">
                <span className="inline-block py-1.5 px-4 border border-white/20 text-brand-green text-xs font-bold uppercase tracking-widest rounded-full mb-6 md:mb-8 backdrop-blur-sm">Limited Edition</span>
                <h2 className="font-heading text-4xl md:text-6xl font-bold mb-6 md:mb-8 leading-[1.1]">{promoText.title}</h2>
                <p className="text-gray-400 text-base md:text-lg mb-8 md:mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed font-light">
                {promoText.desc}
                </p>
                <Link to={promoContent.link || '/products'}>
                    <Button variant="primary" size="lg" className="w-full md:w-auto min-w-[200px] h-14 text-base shadow-xl shadow-brand-green/20">
                        {promoText.btn}
                    </Button>
                </Link>
            </div>
            </div>
        </section>
      )}
      
      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Instagram Shop */}
      <section className="py-20 bg-white">
         <div className="container mx-auto px-4 text-center mb-12">
            <div className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-gray-50 text-gray-900 border border-gray-100 shadow-sm">
                <Instagram className="w-4 h-4" />
                <span className="font-bold tracking-widest text-xs uppercase">@LESIKO_OFFICIAL</span>
            </div>
            <h2 className="font-heading text-4xl font-bold text-gray-900 tracking-tight mb-4">{t('home.asSeenOn')}</h2>
            <p className="text-gray-500 font-light text-lg max-w-lg mx-auto">{t('home.tagUs')}</p>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-4 px-2 md:px-8">
            {INSTAGRAM_POSTS.map((url, i) => (
                <div key={i} className="relative group overflow-hidden aspect-square cursor-pointer bg-gray-100 rounded-lg">
                    <img src={url} alt="Instagram Post" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                        <Instagram className="w-8 h-8 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100 drop-shadow-lg" />
                    </div>
                </div>
            ))}
         </div>
         <div className="text-center mt-12 px-4">
             <Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4"/>} className="w-full md:w-auto min-w-[200px] border-gray-300 hover:border-gray-900 hover:bg-gray-900 hover:text-white transition-all duration-300">
                {t('home.followUs')}
             </Button>
         </div>
      </section>
    </div>
  );
};
