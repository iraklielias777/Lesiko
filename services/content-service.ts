
import { PromoContent, SkinTypeContent } from '../types';
import { supabase } from '../lib/supabase';

const DEFAULT_PROMO: PromoContent = {
  title: "Summer Glow Essentials",
  titleKa: "ზაფხულის ნაკრები",
  description: "Get ready for the sun with our curated collection of SPF and hydration heroes.",
  descriptionKa: "მოემზადეთ მზისთვის ჩვენი რჩეული SPF და დამატენიანებელი საშუალებებით.",
  buttonText: "Shop the Collection",
  buttonTextKa: "ნაკრების ნახვა",
  image: "https://images.unsplash.com/photo-1618331835717-801e976710b2?auto=format&fit=crop&q=80&w=800",
  link: "/products"
};

const DEFAULT_SKIN_TYPES: SkinTypeContent = [
  { key: 'normal', name: 'Normal', nameKa: 'ნორმალური', description: 'Balanced hydration', descriptionKa: 'ბალანსირებული', image: 'https://images.unsplash.com/photo-1551024601-562963341c54?auto=format&fit=crop&q=80&w=800' },
  { key: 'dry', name: 'Dry', nameKa: 'მშრალი', description: 'Deep nourishment', descriptionKa: 'ღრმა კვება', image: 'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?auto=format&fit=crop&q=80&w=800' },
  { key: 'oily', name: 'Oily', nameKa: 'ცხიმიანი', description: 'Shine control', descriptionKa: 'ცხიმის კონტროლი', image: 'https://images.unsplash.com/photo-1505944270255-72b8c68c6a70?auto=format&fit=crop&q=80&w=800' },
  { key: 'combination', name: 'Combination', nameKa: 'კომბინირებული', description: 'Targeted care', descriptionKa: 'მიზნობრივი მოვლა', image: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?auto=format&fit=crop&q=80&w=800' },
  { key: 'sensitive', name: 'Sensitive', nameKa: 'მგრძნობიარე', description: 'Gentle formulas', descriptionKa: 'ნაზი ფორმულა', image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&q=80&w=800' },
];

export const ContentService = {
  getPromoContent: async (): Promise<PromoContent> => {
    if (!supabase) return DEFAULT_PROMO;
    
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'homepage_promo')
        .single();

    if (error || !data) return DEFAULT_PROMO;
    return data.content as PromoContent;
  },

  updatePromoContent: async (content: PromoContent): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'homepage_promo', content });
    
    if (error) throw error;
  },

  getSkinTypeContent: async (): Promise<SkinTypeContent> => {
    if (!supabase) return DEFAULT_SKIN_TYPES;
    
    const { data, error } = await supabase
        .from('site_content')
        .select('content')
        .eq('key', 'homepage_skin_types')
        .single();

    if (error || !data) return DEFAULT_SKIN_TYPES;
    return data.content as SkinTypeContent;
  },

  updateSkinTypeContent: async (content: SkinTypeContent): Promise<void> => {
    if (!supabase) return;
    const { error } = await supabase
        .from('site_content')
        .upsert({ key: 'homepage_skin_types', content });
    
    if (error) throw error;
  }
};
