import { useEffect, useState } from 'react';
import { HeroContent } from '../types';
import { ContentService } from '../services/content-service';
import { imageSrcSet, imageUrl } from './image-url';
import { dismissSplash } from './splash';

/**
 * The homepage hero is the largest thing on the first screen and, measured
 * from Tbilisi, it used to be the last thing to start loading: its URL lives
 * in the CMS, so the image request could not begin until React had mounted,
 * fetched site content from Sydney (~0.7 s) and rendered the <img>. The copy
 * animated in around 1.9 s and the picture arrived around 2.8 s — a hero with
 * a white hole in it.
 *
 * Two changes close that gap. primeHomepage() runs before React mounts: it
 * starts the site-content fetch immediately and, the moment the hero URL is
 * known, adds a <link rel=preload> so the browser fetches the image before
 * the component exists — and on a repeat visit it preloads the last known
 * hero straight away from localStorage. useHeroReady() then holds the reveal
 * (and the boot splash) until that image has actually decoded, so the copy,
 * the buttons and the picture appear together.
 */
export const HERO_WIDTHS = [600, 900, 1200, 1600];
export const HERO_SIZES = '(min-width: 768px) 50vw, 100vw';
const HERO_HEIGHT = 1600;

/** Longest the reveal waits for the picture once the copy is known. */
export const HERO_IMAGE_WAIT_MS = 4000;

const CACHE_KEY = 'lesiko-hero';

export const heroSrc = (image: string) =>
  imageUrl(image, { width: HERO_WIDTHS[2], height: HERO_HEIGHT, resize: 'cover' });

export const heroSrcSet = (image: string) =>
  imageSrcSet(image, HERO_WIDTHS, { height: HERO_HEIGHT, resize: 'cover' });

const preloadHero = (image: string) => {
  if (!image || typeof document === 'undefined') return;
  const href = heroSrc(image);
  const existing = Array.from(document.head.querySelectorAll<HTMLLinkElement>('link[rel="preload"][as="image"]'));
  if (existing.some(link => link.href === href)) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = href;
  const set = heroSrcSet(image);
  if (set) {
    link.setAttribute('imagesrcset', set);
    link.setAttribute('imagesizes', HERO_SIZES);
  }
  link.setAttribute('fetchpriority', 'high');
  document.head.appendChild(link);
};

/** Call once, before React mounts. Only the homepage needs any of this. */
export const primeHomepage = () => {
  if (typeof window === 'undefined' || window.location.pathname !== '/') return;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) preloadHero(String(JSON.parse(cached).image || ''));
  } catch {
    /* no storage, no head start */
  }

  ContentService.getHeroContent()
    .then(hero => {
      preloadHero(hero.image);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ image: hero.image }));
      } catch {
        /* ignore */
      }
    })
    .catch(() => undefined);
};

/**
 * True once the hero image has decoded (or the wait has run out), at which
 * point the splash is lifted. A detached Image with the same src, srcset and
 * sizes resolves to the same candidate the rendered <img> uses, so decoding it
 * here means the visible one paints from cache the instant it is revealed.
 */
export const useHeroReady = (hero: HeroContent | null): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hero || ready) return;
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      setReady(true);
      dismissSplash();
    };

    if (!hero.image) {
      done();
      return;
    }

    const img = new Image();
    const set = heroSrcSet(hero.image);
    if (set) {
      img.sizes = HERO_SIZES;
      img.srcset = set;
    }
    // `load` is the signal; decode() is given a short head start so the first
    // paint is not a decode stall, but a browser that defers decoding for a
    // background tab must not hold the page hostage.
    const afterLoad = () => {
      const decoded = typeof img.decode === 'function' ? img.decode().catch(() => undefined) : Promise.resolve();
      const grace = new Promise<void>(resolve => window.setTimeout(resolve, 300));
      Promise.race([decoded, grace]).then(done, done);
    };
    img.onload = afterLoad;
    img.onerror = done;
    img.src = heroSrc(hero.image);
    if (img.complete && img.naturalWidth > 0) afterLoad();
    const cap = window.setTimeout(done, HERO_IMAGE_WAIT_MS);

    return () => {
      settled = true;
      window.clearTimeout(cap);
    };
  }, [hero, ready]);

  return ready;
};
