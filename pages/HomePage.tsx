
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, Sparkles, UserCheck, Instagram, ChevronRight, Star, ChevronDown, Droplets, Sun, Wind, Activity, Feather } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { ProductCard } from '../components/product/ProductCard';
import { ProductService } from '../services/product-service';
import { BrandService } from '../services/brand-service';
import { ContentService } from '../services/content-service';
import { FooterContent, Product, Brand, CategoryHierarchyItem, HeroContent, PromoContent, SkinTypeContent, SocialContent } from '../types';
import { RecentlyViewed } from '../components/product/RecentlyViewed';
import { SEO } from '../components/seo/SEO';
import { categoryLabel, subLabel } from '../lib/taxonomy';
import { loadCategories } from '../lib/use-categories';
import { imageSrcSet, imageUrl } from '../lib/image-url';
import { useSettingsStore } from '../store/settings-store';
import { usePageSeo, useSiteUrl } from '../lib/use-seo';
import { CARD_SIZES } from '../lib/product-image';

/**
 * The hero renders twice — a full-bleed backdrop on mobile, a right-hand panel
 * on desktop — because the two layouts are genuinely different. `display: none`
 * does not stop an image loading, so when the two elements asked for different
 * widths every visitor downloaded both. Identical src/srcSet/sizes makes the
 * browser resolve them to one resource and fetch it once; only the wrapper
 * differs. The hidden copy is aria-hidden so the alt text is not read twice.
 */
const HERO_WIDTHS = [600, 900, 1200, 1600];
const HERO_SIZES = '(min-width: 768px) 50vw, 100vw';

const SKIN_TYPE_ICONS: Record<string, any> = {
    normal: Activity,
    dry: Droplets,
    oily: Sun,
    combination: Wind,
    sensitive: Feather
};

export const HomePage = () => {
  const { t, i18n } = useTranslation();
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<CategoryHierarchyItem[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [promoContent, setPromoContent] = useState<PromoContent | null>(null);
  const [skinTypeContent, setSkinTypeContent] = useState<SkinTypeContent>([]);
  const [hero, setHero] = useState<HeroContent | null>(null);
  const [social, setSocial] = useState<SocialContent | null>(null);
  const [footer, setFooter] = useState<FooterContent | null>(null);
  const settings = useSettingsStore(s => s.settings);
  const storeName = settings.storeName;
  const seo = usePageSeo('home');
  const url = useSiteUrl();

  // Confirms to search engines that these profiles are the same entity as the
  // store, which is how the brand panel in results gets populated.
  const socialLinks = [footer?.instagramUrl, footer?.facebookUrl, footer?.twitterUrl, social?.profileUrl]
    .map(link => (link || '').trim())
    .filter(Boolean);

  useEffect(() => {
    // Was: fetch all 240 products with every column and filter in the browser,
    // to render eight cards. The fallback to newest now lives in the query.
    ProductService.getTrending(8).then(setTrendingProducts);

    BrandService.getBrands().then(fetchedBrands => {
        setBrands(fetchedBrands.slice(0, 8));
    });

    // Via the shared cache, not CategoryService directly: the header, the
    // footer and the filter sidebar all want the same rows, and going straight
    // to the service made the homepage fetch them a second time.
    loadCategories().then(setCategories).catch(() => {});

    ContentService.getPromoContent().then(setPromoContent);
    ContentService.getSkinTypeContent().then(setSkinTypeContent);
    ContentService.getHeroContent().then(setHero);
    ContentService.getSocialContent().then(setSocial);
    ContentService.getFooterContent().then(setFooter);
  }, []);

  const toggleCategory = (slug: string) => {
      setExpandedCategory(prev => prev === slug ? null : slug);
  };

  const isKa = i18n.language === 'ka';

  const getLocalizedPromo = () => {
      if (!promoContent) return { title: t('home.promoTitle'), desc: t('home.promoDesc'), btn: t('home.promoBtn') };
      return {
          title: isKa ? (promoContent.titleKa || promoContent.title) : promoContent.title,
          desc: isKa ? (promoContent.descriptionKa || promoContent.description) : promoContent.description,
          btn: isKa ? (promoContent.buttonTextKa || promoContent.buttonText) : promoContent.buttonText
      };
  };

  const promoText = getLocalizedPromo();

  const pick = (en: string, ka?: string) => (isKa && ka ? ka : en);

  // Until the CMS row arrives the i18n strings stand in, so the hero never
  // renders as an empty block on a cold load.
  const heroText = {
    eyebrow: hero ? pick(hero.eyebrow, hero.eyebrowKa) : t('home.newCollection'),
    title: hero ? pick(hero.title, hero.titleKa) : t('home.heroTitle'),
    subtitle: hero ? pick(hero.subtitle, hero.subtitleKa) : t('home.heroSubtitle'),
    primaryLabel: hero ? pick(hero.primaryLabel, hero.primaryLabelKa) : t('home.shopCollection'),
    secondaryLabel: hero ? pick(hero.secondaryLabel, hero.secondaryLabelKa) : t('home.takeQuiz')
  };
  const heroImage = hero?.image || '';

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url('/')}#organization`,
        "name": storeName,
        "url": url('/'),
        // Was a stock photo of a random bottle. Google renders this next to the
        // brand name, so it has to be the store's own image.
        ...(settings.ogImage ? { "logo": settings.ogImage } : {}),
        ...(settings.supportEmail ? {
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer support",
            "email": settings.supportEmail
          }
        } : {}),
        ...(socialLinks.length ? { "sameAs": socialLinks } : {})
      },
      {
        "@type": "WebSite",
        "@id": `${url('/')}#website`,
        "name": storeName,
        "url": url('/'),
        "inLanguage": i18n.language === 'ka' ? 'ka-GE' : 'en-US',
        "publisher": { "@id": `${url('/')}#organization` },
        // Lets Google offer a search box for the site directly in results.
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": `${url('/products')}?q={search_term_string}`
          },
          "query-input": "required name=search_term_string"
        }
      }
    ]
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <SEO 
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        image={seo.image}
        canonicalPath="/"
        noindex={seo.noindex}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative h-[85vh] md:h-[90vh] min-h-[450px] md:min-h-[600px] flex flex-col md:flex-row overflow-hidden">
        <div className="absolute inset-0 md:hidden z-0">
            {heroImage && (
              <img
                src={imageUrl(heroImage, { width: HERO_WIDTHS[2], height: 1600, resize: 'cover' })}
                srcSet={imageSrcSet(heroImage, HERO_WIDTHS, { height: 1600, resize: 'cover' })}
                sizes={HERO_SIZES}
                alt={heroText.title}
                className="w-full h-full object-cover"
                fetchPriority="high"
                decoding="async"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
        </div>
        <div className="w-full md:w-1/2 flex items-end md:items-center justify-center p-6 md:p-16 z-10 relative h-full">
          <div className="max-w-xl relative w-full mb-16 md:mb-0">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 md:bg-white border border-white/20 md:border-gray-100 shadow-sm text-white md:text-brand-dark text-[11px] font-bold uppercase tracking-widest mb-6 md:mb-8 backdrop-blur-md md:backdrop-blur-none animate-fade-in-up">
              <Sparkles className="w-3.5 h-3.5 text-brand-green fill-brand-green" /> {heroText.eyebrow}
            </div>
            <h1 className="font-heading text-5xl sm:text-6xl md:text-8xl font-bold mb-4 md:mb-6 leading-[0.95] text-white md:text-brand-dark tracking-tighter animate-fade-in-up">
              {heroText.title}
            </h1>
            <p className="text-base sm:text-lg text-gray-200 md:text-gray-600 mb-8 md:mb-10 leading-relaxed max-w-md font-light tracking-wide animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {heroText.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <Link to={hero?.primaryLink || '/products'}><Button size="lg" className="w-full shadow-xl shadow-brand-green/20">{heroText.primaryLabel}</Button></Link>
              <Link to={hero?.secondaryLink || '/products'} className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full bg-white/10 md:bg-transparent border-white/40 md:border-gray-900 text-white md:text-gray-900 hover:bg-white hover:text-brand-dark backdrop-blur-sm md:backdrop-blur-none">
                  {heroText.secondaryLabel}
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="hidden md:block w-1/2 h-full relative overflow-hidden">
          {heroImage && (
            <img
              src={imageUrl(heroImage, { width: HERO_WIDTHS[2], height: 1600, resize: 'cover' })}
              srcSet={imageSrcSet(heroImage, HERO_WIDTHS, { height: 1600, resize: 'cover' })}
              sizes={HERO_SIZES}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover animate-float"
              style={{ animationDuration: '8s' }}
              fetchPriority="high"
              decoding="async"
            />
          )}
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
          {/* items-start: on mobile, an open accordion must not stretch sibling cards to the same height (empty white gap). */}
          <div className="flex items-start overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 md:grid md:grid-cols-3 lg:grid-cols-6 md:gap-6 md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
            {categories.slice(0, 6).map((cat) => {
              const isOpen = expandedCategory === cat.slug;
              return (
                <div key={cat.slug} className={`snap-start shrink-0 w-[260px] md:w-auto flex flex-col self-start bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isOpen ? 'ring-1 ring-brand-green' : ''}`}>
                  <Link to={`/category/${cat.slug}`} className="relative aspect-[4/3] md:aspect-square overflow-hidden group block">
                    {cat.image ? (
                      <img
                        src={imageUrl(cat.image, { width: 500, height: 500, resize: 'cover' })}
                        srcSet={imageSrcSet(cat.image, [300, 500, 800], { height: 800, resize: 'cover' })}
                        sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 260px"
                        alt={categoryLabel(cat, i18n.language)}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-100" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60 md:opacity-0 md:group-hover:opacity-40 transition-opacity" />
                    <span className="absolute bottom-4 left-4 text-white font-bold text-lg md:hidden drop-shadow-md">{categoryLabel(cat, i18n.language)}</span>
                  </Link>
                  <div className="p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <Link to={`/category/${cat.slug}`} className="font-heading font-bold text-gray-900 hover:text-brand-green transition-colors text-sm md:text-base">{categoryLabel(cat, i18n.language)}</Link>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggleCategory(cat.slug)}
                        className="md:hidden p-1.5 rounded-full hover:bg-gray-100"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <div className={`text-sm text-gray-500 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0 md:max-h-none md:opacity-100 md:mt-2'}`}>
                      <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 md:border-none md:pt-0">
                        {cat.subs.slice(0, 4).map(sub => (
                          <Link key={sub.slug} to={`/category/${cat.slug}?subCategory=${encodeURIComponent(sub.slug)}`} className="flex items-center gap-2 hover:text-brand-green transition-colors py-0.5 group/sub">
                            <div className="w-1 h-1 rounded-full bg-gray-300 group-hover/sub:bg-brand-green md:hidden"></div>
                            <span className="truncate">{subLabel(sub, i18n.language)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 md:py-24 bg-[#F9F9F8]">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 px-4">
            {[
              { icon: ShieldCheck, title: t('home.trust.cleanIngredients'), desc: t('home.trust.cleanDesc') },
              { icon: UserCheck, title: t('home.trust.dermatologist'), desc: t('home.trust.dermDesc') },
              { icon: Sparkles, title: t('home.trust.crueltyFree'), desc: t('home.trust.crueltyDesc') },
              { icon: Truck, title: t('home.trust.fastShipping'), desc: t('home.trust.shippingDesc') },
            ].map((item, idx) => (
              <div key={idx} className="group flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 hover:bg-white hover:shadow-xl hover:-translate-y-1">
                <div className="mb-6 relative"><div className="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-brand-dark group-hover:text-brand-green group-hover:scale-110 transition-all duration-500 relative z-10"><item.icon className="w-7 h-7 stroke-[1.5px]" /></div></div>
                <h3 className="font-heading font-bold text-sm md:text-base uppercase tracking-wider text-gray-900 mb-2 group-hover:text-brand-green">{item.title}</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed max-w-[200px]">{item.desc}</p>
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
              <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 flex items-center gap-2">{t('home.favorites')}</span>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">{t('home.trending')}</h2>
            </div>
            <Link to="/products" className="hidden md:block"><Button variant="ghost" className="text-sm font-semibold" rightIcon={<ArrowRight className="w-4 h-4" />}>{t('common.viewAll')}</Button></Link>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 px-6 pb-12 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-12 md:px-4 md:pb-0 scrollbar-hide">
            {trendingProducts.map((product, idx) => (
                <div key={product.id} className="min-w-[260px] md:min-w-0 snap-start animate-fade-in-up" style={{ animationDelay: `${idx * 100}ms` }}><ProductCard product={product} sizes={CARD_SIZES.rail4} /></div>
            ))}
          </div>
        </div>
      </section>

      {/* Shop by Skin Type - DYNAMIC */}
      <section className="py-24 bg-brand-dark text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[50%] h-full bg-gradient-to-l from-gray-900 to-transparent opacity-50"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
             <div className="max-w-2xl">
                <span className="text-brand-green font-bold tracking-[0.2em] uppercase text-xs mb-4 block flex items-center gap-2"><Sparkles className="w-3 h-3" />{t('home.personalized')}</span>
                <h2 className="font-heading text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 leading-[0.95]">{t('home.skinTypeTitle')}</h2>
                <p className="text-gray-400 text-lg font-light max-w-lg leading-relaxed">{t('home.skinTypeDesc')}</p>
             </div>
             <Link to="/products"><Button variant="secondary" className="hidden md:flex bg-transparent border-white/20 text-white hover:bg-white hover:text-brand-dark">{t('home.viewSkinTypes')}</Button></Link>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 -mx-4 px-4 md:grid md:grid-cols-5 md:gap-4 md:pb-0 md:mx-0 md:px-0 scrollbar-hide">
             {skinTypeContent.map((type, idx) => {
                 const Icon = SKIN_TYPE_ICONS[type.key.toLowerCase()] || Activity;
                 return (
                     <Link key={idx} to={`/products?skinType=${encodeURIComponent(type.key)}`} className="group relative min-w-[260px] md:min-w-0 h-[400px] md:h-[450px] rounded-2xl overflow-hidden snap-start transition-all duration-700 hover:shadow-2xl hover:shadow-brand-green/10">
                        <div className="absolute inset-0 overflow-hidden">
                            <img
                                src={imageUrl(type.image, { width: 700, height: 1050, resize: 'cover' })}
                                srcSet={imageSrcSet(type.image, [400, 700, 1000], { height: 1500, resize: 'cover' })}
                                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 45vw, 90vw"
                                alt={type.name}
                                className="w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110 opacity-80"
                                loading="lazy"
                                decoding="async"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                        </div>
                        <div className="absolute inset-0 p-6 flex flex-col justify-end">
                           <div className="mb-auto transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                               <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"><Icon className="w-5 h-5 text-white" /></div>
                           </div>
                           <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                               <h3 className="font-heading font-bold text-2xl md:text-3xl text-white mb-2 tracking-tight">{isKa ? (type.nameKa || type.name) : type.name}</h3>
                               <div className="h-0.5 w-8 bg-brand-green mb-3 transition-all duration-500 group-hover:w-16"></div>
                               <p className="text-sm text-gray-300 font-medium leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75">{isKa ? (type.descriptionKa || type.description) : type.description}</p>
                           </div>
                           <div className="absolute bottom-6 right-6 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 delay-100">
                              <div className="w-8 h-8 rounded-full bg-white text-brand-dark flex items-center justify-center"><ArrowRight className="w-4 h-4" /></div>
                           </div>
                        </div>
                     </Link>
                 );
             })}
          </div>
        </div>
      </section>

      {/* Brand Section */}
      <section className="py-20 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4 text-center mb-16">
          <span className="text-brand-green font-bold tracking-widest uppercase text-xs mb-3 block">{t('home.brandsSubtitle')}</span>
          <h2 className="font-heading text-4xl font-bold text-gray-900 tracking-tight">{t('home.brandsTitle')}</h2>
          <p className="text-gray-500 mt-4 max-w-lg mx-auto font-light text-lg">{t('home.brandsDesc')}</p>
        </div>
        <div className="container mx-auto px-4 flex overflow-x-auto snap-x snap-mandatory gap-4 pb-8 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-6 md:pb-0 scrollbar-hide">
          {brands.map((brand) => (
              <Link key={brand.id} to={`/brand/${brand.slug}`} className="group relative aspect-[4/5] min-w-[260px] md:min-w-0 rounded-2xl overflow-hidden snap-start transition-all duration-500 hover:shadow-xl hover:shadow-gray-200">
                  <div className="absolute inset-0">
                    {brand.image ? (
                      <img
                        src={imageUrl(brand.image, { width: 800, height: 1000, resize: 'cover' })}
                        srcSet={imageSrcSet(brand.image, [500, 800, 1200], { height: 1500, resize: 'cover' })}
                        sizes="(min-width: 768px) 45vw, 90vw"
                        alt={brand.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-800" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                  </div>
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                          <h3 className="font-heading font-bold text-3xl text-white mb-2 tracking-tight">{brand.name}</h3>
                          <div className="w-12 h-0.5 bg-brand-green mb-3 transition-all duration-500 group-hover:w-full opacity-50 group-hover:opacity-100"></div>
                          <p className="text-sm text-gray-200 font-light opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75 line-clamp-2">{brand.description || t('home.discoverPremium')}</p>
                      </div>
                  </div>
              </Link>
          ))}
        </div>
      </section>

      {/* Promo Section */}
      {promoContent && (
        <section className="py-16 md:py-24 bg-gray-900 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-brand-green/10 via-transparent to-transparent"></div>
            <div className="container mx-auto px-4 relative z-10 flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 relative h-[300px] md:h-[500px] w-full max-w-lg mx-auto md:order-2 group">
                <img
                    src={imageUrl(promoContent.image, { width: 900, height: 900, resize: 'cover' })}
                    srcSet={imageSrcSet(promoContent.image, [600, 900, 1300], { height: 1300, resize: 'cover' })}
                    sizes="(min-width: 768px) 45vw, 90vw"
                    alt={promoText.title}
                    className="absolute inset-0 w-full h-full object-cover rounded-md shadow-2xl transition-transform duration-1000 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                />
            </div>
            <div className="flex-1 text-center md:text-left md:order-1">
                <span className="inline-block py-1.5 px-4 border border-white/20 text-brand-green text-xs font-bold uppercase tracking-widest rounded-full mb-6 md:mb-8 backdrop-blur-sm">Limited Edition</span>
                <h2 className="font-heading text-4xl md:text-6xl font-bold mb-6 md:mb-8 leading-[1.1]">{promoText.title}</h2>
                <p className="text-gray-400 text-base md:text-lg mb-8 md:mb-10 max-w-lg mx-auto md:mx-0 leading-relaxed font-light">{promoText.desc}</p>
                <Link to={promoContent.link || '/products'}><Button variant="primary" size="lg" className="w-full md:w-auto min-w-[200px] h-14 text-base shadow-xl shadow-brand-green/20">{promoText.btn}</Button></Link>
            </div>
            </div>
        </section>
      )}
      
      <RecentlyViewed />
      {social && social.images.length > 0 && (
        <section className="py-20 bg-white">
           <div className="container mx-auto px-4 text-center mb-12">
              <a href={social.profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-gray-50 text-gray-900 border border-gray-100 shadow-sm hover:border-brand-green transition-colors"><Instagram className="w-4 h-4" /><span className="font-bold tracking-widest text-xs uppercase">{social.handle}</span></a>
              <h2 className="font-heading text-4xl font-bold text-gray-900 tracking-tight mb-4">{pick(social.title, social.titleKa)}</h2>
              <p className="text-gray-500 font-light text-lg max-w-lg mx-auto">{pick(social.subtitle, social.subtitleKa)}</p>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-5 gap-1 md:gap-4 px-2 md:px-8">
              {social.images.map((url, i) => (
                  <a
                    key={`${url}-${i}`}
                    href={social.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative group overflow-hidden aspect-square cursor-pointer bg-gray-100 rounded-lg block"
                  >
                      <img
                        src={imageUrl(url, { width: 400, resize: 'cover' })}
                        srcSet={imageSrcSet(url, [300, 400, 600], { resize: 'cover' })}
                        sizes="(min-width: 768px) 20vw, 50vw"
                        alt={`${social.handle} post ${i + 1}`}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"><Instagram className="w-8 h-8 text-white drop-shadow-lg" /></div>
                  </a>
              ))}
           </div>
        </section>
      )}
    </div>
  );
};
