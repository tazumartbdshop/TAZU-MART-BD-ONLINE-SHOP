import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  jsonLd?: Record<string, any> | Array<Record<string, any>>;
  keywords?: string[];
  noindex?: boolean;
}

/**
 * Universal Dynamic SEO Hook for TAZU MART BD
 * Dynamically updates <title>, <meta description>, canonical link, OpenGraph,
 * Twitter Card, and JSON-LD Structured Data in the document <head>.
 */
export function useDynamicSEO({
  title,
  description,
  canonicalUrl,
  ogImage,
  ogType = 'website',
  jsonLd,
  keywords,
  noindex = false,
}: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    const baseSiteName = 'TAZU MART BD';
    const finalTitle = title 
      ? (title.includes(baseSiteName) ? title : `${title} | ${baseSiteName}`)
      : 'TAZU MART BD - Official Online Shopping in Bangladesh';
    document.title = finalTitle;

    // 2. Helper to set or create <meta>
    const setMetaTag = (attrName: string, attrValue: string, content: string | null) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`);
      if (!content) {
        if (element) element.remove();
        return;
      }
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Helper to set or create <link>
    const setLinkTag = (rel: string, href: string | null) => {
      let element = document.querySelector(`link[rel="${rel}"]`);
      if (!href) {
        if (element) element.remove();
        return;
      }
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    // 4. Meta Description & Keywords
    const defaultDesc = 'Shop genuine watches, leather accessories, and lifestyle essentials at best prices with fast nationwide delivery from TAZU MART BD.';
    const finalDesc = description || defaultDesc;
    setMetaTag('name', 'description', finalDesc);

    if (keywords && keywords.length > 0) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    }

    // 5. Robots index/noindex
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // 6. Canonical URL
    const siteBase = 'https://tazumartbd.com';
    const finalCanonical = canonicalUrl 
      ? (canonicalUrl.startsWith('http') ? canonicalUrl : `${siteBase}${canonicalUrl.startsWith('/') ? '' : '/'}${canonicalUrl}`)
      : window.location.href;
    setLinkTag('canonical', finalCanonical);

    // 7. Open Graph Tags
    setMetaTag('property', 'og:title', finalTitle);
    setMetaTag('property', 'og:description', finalDesc);
    setMetaTag('property', 'og:url', finalCanonical);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', baseSiteName);
    setMetaTag('property', 'og:locale', 'en_US');
    if (ogImage) {
      setMetaTag('property', 'og:image', ogImage);
      setMetaTag('property', 'og:image:alt', finalTitle);
    }

    // 8. Twitter Card Tags
    setMetaTag('name', 'twitter:card', ogImage ? 'summary_large_image' : 'summary');
    setMetaTag('name', 'twitter:title', finalTitle);
    setMetaTag('name', 'twitter:description', finalDesc);
    if (ogImage) {
      setMetaTag('name', 'twitter:image', ogImage);
    }

    // 9. Structured Data (JSON-LD)
    const scriptId = 'tazu-dynamic-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    if (jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement('script');
        scriptEl.id = scriptId;
        scriptEl.type = 'application/ld+json';
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(jsonLd);
    } else if (scriptEl) {
      scriptEl.remove();
    }

    return () => {
      // Cleanup dynamically injected schema on unmount
      const existingScript = document.getElementById(scriptId);
      if (existingScript) existingScript.remove();
    };
  }, [title, description, canonicalUrl, ogImage, ogType, JSON.stringify(jsonLd), JSON.stringify(keywords), noindex]);
}
