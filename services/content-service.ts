
import { PromoContent } from '../types';

const STORAGE_KEY = 'lesiko_promo_content_v2';

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
    return new Promise((resolve) => {
      setTimeout(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          resolve(JSON.parse(stored));
        } else {
          resolve(DEFAULT_PROMO);
        }
      }, 200);
    });
  },

  updatePromoContent: async (content: PromoContent): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
        resolve();
      }, 300);
    });
  }
};
