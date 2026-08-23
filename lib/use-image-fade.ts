import { useCallback, useState } from 'react';

/**
 * Fades an image in once it has decoded.
 *
 * Product cards lazy-load, so without this the grid fills in as a series of
 * hard pops while you scroll. A cached image would never fire `load` after
 * React attaches the handler, so the ref checks `complete` on mount and skips
 * the transition entirely — the fade is for images that actually arrive late,
 * not a delay imposed on ones that are already there.
 */
export const useImageFade = () => {
  const [loaded, setLoaded] = useState(false);

  const ref = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) setLoaded(true);
  }, []);

  return {
    ref,
    onLoad: () => setLoaded(true),
    /** Drop straight onto the <img>. */
    className: `transition-opacity duration-300 motion-reduce:transition-none ${loaded ? 'opacity-100' : 'opacity-0'}`,
  };
};
