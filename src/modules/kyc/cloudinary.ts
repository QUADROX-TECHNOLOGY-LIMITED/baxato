// src/modules/kyc/cloudinary.ts

import { v2 as cloudinary } from 'cloudinary';

// Configure the SDK globally
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadBase64ProfilePicture(base64String: string, userId: string): Promise<string> {
  console.log(`[CLOUDINARY] Uploading KYC avatar for user: ${userId}`);

  try {
    // Ensure the base64 string has the correct data URI prefix if Payvessel omits it
    const formattedData = base64String.startsWith('data:image') 
      ? base64String 
      : `data:image/jpeg;base64,${base64String}`;

    const uploadResult = await cloudinary.uploader.upload(formattedData, {
      folder: 'baxato_kyc_avatars',
      public_id: `user_${userId}_avatar`,
      overwrite: true,
      transformation: [
        // Automatically crop to a square face thumbnail to save bandwidth
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    console.log('[CLOUDINARY_SUCCESS] Avatar uploaded:', uploadResult.secure_url);
    return uploadResult.secure_url;

  } catch (error: any) {
    console.error('[CLOUDINARY_UPLOAD_ERROR]', error);
    throw new Error('Failed to process KYC image upload.');
  }
}
