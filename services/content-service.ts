
import { PromoContent } from '../types';
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
  }
};
