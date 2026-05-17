import { createClient } from '@supabase/supabase-js';

// These should be in your .env file
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Uploads an image to Supabase Storage
 * @param uri Local file URI
 * @param bucket Storage bucket name
 * @returns Public URL of the uploaded image
 */
export const uploadImage = async (uri: string, bucket: string = 'Products'): Promise<string | null> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = `uploads/${fileName}`;

    let uploadResult = await supabase.storage
      .from(bucket)
      .upload(filePath, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    // Self-healing: if bucket not found, try to create it
    if (uploadResult.error && uploadResult.error.message.toLowerCase().includes('not found')) {
      console.log(`Storage bucket "${bucket}" not found. Attempting programmatic creation...`);
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true,
        fileSizeLimit: 5242880, // 5MB limit
        allowedMimeTypes: ['image/jpeg', 'image/png']
      });

      if (!createError) {
        console.log(`Successfully created public bucket "${bucket}". Retrying upload...`);
        uploadResult = await supabase.storage
          .from(bucket)
          .upload(filePath, arrayBuffer, {
            contentType: 'image/jpeg',
            upsert: true
          });
      } else {
        console.error('Failed to create bucket programmatically:', createError);
      }
    }

    if (uploadResult.error) throw uploadResult.error;

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};
