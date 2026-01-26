
import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  type?: 'website' | 'product' | 'article';
  structuredData?: object;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords = [], 
  image,
  type = 'website',
  structuredData,
  noindex = false
}) => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const isKa = i18n.language === 'ka';

  // Base Keywords
  const defaultKeywords = isKa 
    ? ['კოსმეტიკა', 'თავის მოვლა', 'მაკიაჟი', 'ონლაინ მაღაზია', 'სილამაზე', 'LesiKo']
    : ['cosmetics', 'skincare', 'makeup', 'beauty', 'online store', 'LesiKo'];

  const allKeywords = [...new Set([...defaultKeywords, ...keywords])].filter(Boolean).join(', ');
  
  // Defaults
  const siteName = 'LesiKo';
  const defaultTitle = isKa ? 'LesiKo | პრემიუმ კოსმეტიკა და თავის მოვლა' : 'LesiKo | Premium Cosmetics & Skincare';
  const defaultDesc = isKa 
    ? 'აღმოაჩინეთ საუკეთესო კოსმეტიკური საშუალებები LesiKo-ში. უფასო მიწოდება მთელ საქართველოში.'
    : 'Discover premium skincare and cosmetics at LesiKo. Science-backed beauty delivered to your door.';

  // Avoid double branding if title already contains site name or separator
  const finalTitle = title 
    ? (title.includes('| LesiKo') ? title : `${title} | ${siteName}`) 
    : defaultTitle;
    
  const finalDesc = description || defaultDesc;
  const currentUrl = window.location.href;

  useEffect(() => {
    // 1. Update Title
    document.title = finalTitle;
    
    // 2. Update Html Lang
    document.documentElement.lang = i18n.language;

    // Helper to update/create meta tags
    const updateMeta = (name: string, content: string, attribute = 'name') => {
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Standard Meta
    updateMeta('description', finalDesc);
    updateMeta('keywords', allKeywords);
    
    // Robots (Index/NoIndex)
    const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';
    updateMeta('robots', robotsContent);

    // 4. Open Graph / Facebook
    updateMeta('og:type', type, 'property');
    updateMeta('og:title', finalTitle, 'property');
    updateMeta('og:description', finalDesc, 'property');
    updateMeta('og:url', currentUrl, 'property');
    updateMeta('og:site_name', siteName, 'property');
    if (image) updateMeta('og:image', image, 'property');

    // 5. Twitter
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', finalTitle);
    updateMeta('twitter:description', finalDesc);
    if (image) updateMeta('twitter:image', image);

    // 6. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', currentUrl);

    // 7. JSON-LD Structured Data
    const scriptId = 'seo-structured-data';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    
    if (structuredData) {
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(structuredData);
    } else if (script) {
        script.remove();
    }

    return () => {
        // Cleanup if needed, though react re-renders handle updates
    };

  }, [finalTitle, finalDesc, allKeywords, image, type, currentUrl, siteName, structuredData, noindex, i18n.language]);

  return null;
};
