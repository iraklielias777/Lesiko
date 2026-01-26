
import { Brand } from '../types';

const STORAGE_KEY = 'lesiko_brands_v2';

const DEFAULT_BRANDS: Brand[] = [
  { 
    id: 'b1', 
    name: 'LesiKo Lab', 
    slug: 'lesiko-lab',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&q=80&w=800',
    description: 'Science-backed formulations for clinical results.'
  },
  { 
    id: 'b2', 
    name: 'ColorPop', 
    slug: 'colorpop',
    image: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&q=80&w=800',
    description: 'Vibrant pigments for bold expression.'
  },
  { 
    id: 'b3', 
    name: 'PureSkin', 
    slug: 'pureskin',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&q=80&w=800',
    description: '100% organic ingredients from nature.'
  },
  { 
    id: 'b4', 
    name: 'HairGlow', 
    slug: 'hairglow',
    image: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=800',
    description: 'Professional salon care at home.'
  },
  { 
    id: 'b5', 
    name: 'DermaTech', 
    slug: 'dermatech',
    image: 'https://images.unsplash.com/photo-1576426863848-c2185fc6e818?auto=format&fit=crop&q=80&w=800',
    description: 'Advanced dermatological solutions for sensitive skin.'
  },
  { 
    id: 'b6', 
    name: 'Naturals Co.', 
    slug: 'naturals-co',
    image: 'https://images.unsplash.com/photo-1518531933037-9a84725359fa?auto=format&fit=crop&q=80&w=800',
    description: 'Earth-friendly botanicals for a sustainable glow.'
  },
  { 
    id: 'b7', 
    name: 'Luxe Aura', 
    slug: 'luxe-aura',
    image: 'https://images.unsplash.com/photo-1571781565036-d3f75af02bde?auto=format&fit=crop&q=80&w=800',
    description: 'Opulent textures for the ultimate self-care ritual.'
  },
  { 
    id: 'b8', 
    name: 'Urban Men', 
    slug: 'urban-men',
    image: 'https://images.unsplash.com/photo-1621600411688-4be93cd68504?auto=format&fit=crop&q=80&w=800',
    description: 'Essential skincare engineered specifically for men.'
  }
];

export const BrandService = {
  getBrands: async (): Promise<Brand[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          resolve(JSON.parse(stored));
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRANDS));
          resolve(DEFAULT_BRANDS);
        }
      }, 200);
    });
  },

  addBrand: async (brand: Brand): Promise<void> => {
    const brands = await BrandService.getBrands();
    const updated = [...brands, brand];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  deleteBrand: async (id: string): Promise<void> => {
    const brands = await BrandService.getBrands();
    const updated = brands.filter(b => b.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
