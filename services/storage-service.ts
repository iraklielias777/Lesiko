
import { supabase } from '../lib/supabase';

export const StorageService = {
  uploadFile: async (file: File | Blob, folder: string = 'products'): Promise<string> => {
    if (!supabase) throw new Error('Supabase client not initialized');

    // Create a unique file name
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  /**
   * Fetches an image from an external URL and uploads it to Supabase Storage
   */
  uploadFromUrl: async (url: string, folder: string = 'products'): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch image from URL');
      
      const blob = await response.blob();
      // Ensure it's an image
      if (!blob.type.startsWith('image/')) throw new Error('URL is not a valid image');
      
      return await StorageService.uploadFile(blob, folder);
    } catch (error) {
      console.error('Error in uploadFromUrl:', error);
      throw error;
    }
  },

  deleteFile: async (url: string): Promise<void> => {
    if (!supabase || !url) return;
    
    try {
      // Extract path from URL
      // Expected format: .../storage/v1/object/public/media/products/filename.jpg
      const pathParts = url.split('/media/');
      if (pathParts.length < 2) return;
      
      const filePath = pathParts[1];
      await supabase.storage.from('media').remove([filePath]);
    } catch (e) {
      console.error('Failed to delete storage file:', e);
    }
  }
};
