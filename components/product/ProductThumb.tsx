import React, { ReactNode } from 'react';
import { ProductImage } from '../../types';
import { thumbSrc, thumbSrcSet } from '../../lib/image-url';
import { fitClass, frameColor, primaryImageOf } from '../../lib/product-image';
import { useImageFade } from '../../lib/use-image-fade';

/**
 * The small square product image used everywhere a product is listed rather
 * than merchandised: cart lines, the order summary, wishlist rows, search
 * results, account order history.
 *
 * These were all rendering the stored file at full size — a 1200px packshot
 * into a 64px box — against a hardcoded grey. Routing them through one
 * component means each of them gets the resized transform, the backdrop-matched
 * frame and the intrinsic dimensions without every call site remembering to.
 */

interface ProductThumbProps {
  /** The product, or a specific image when the caller has already picked one. */
  product?: { images?: ProductImage[] };
  image?: ProductImage;
  alt: string;
  /**
   * Rendered width in CSS pixels. Only used to pick the transform, so an
   * approximate value is fine — it snaps to a shared ladder either way.
   */
  size: number;
  /** Classes for the frame: dimensions, radius, border. */
  className?: string;
  /** Classes for the image itself, e.g. a hover scale. */
  imgClassName?: string;
  /** Badges, quantity pips, click overlays. */
  children?: ReactNode;
  /** The detail-page hero is above the fold; a cart line never is. */
  eager?: boolean;
}

export const ProductThumb: React.FC<ProductThumbProps> = ({
  product,
  image,
  alt,
  size,
  className = '',
  imgClassName = '',
  children,
  eager = false,
}) => {
  const picked = image || (product ? primaryImageOf(product as { images: ProductImage[] }) : undefined);
  const url = picked?.url;
  const fade = useImageFade();

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: frameColor(picked) }}
    >
      {url && (
        <img
          ref={fade.ref}
          onLoad={fade.onLoad}
          src={thumbSrc(url, size)}
          srcSet={thumbSrcSet(url, size)}
          alt={alt}
          width={1200}
          height={1200}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          // A normalised photo already carries its own margin; padding it again
          // only shrinks the product. Legacy uploads still want the breathing room.
          className={`w-full h-full ${fitClass(picked)} ${picked?.bgColor ? '' : 'p-0.5'} ${fade.className} ${imgClassName}`}
        />
      )}
      {children}
    </div>
  );
};
