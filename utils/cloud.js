import axios from 'axios';
import FormData from 'form-data';

const CLOUDINARY_CLOUD_NAME = 'dtz0urit6';
const CLOUDINARY_API_KEY = '985946268373735';
const CLOUDINARY_UPLOAD_PRESET = 'cloudinary-tools';

async function getSignature() {
  try {
    const response = await axios.get('https://cloudinary-tools.netlify.app/.netlify/functions/sign-upload-params', {
      headers: {
        'Accept': '*/*',
        'Origin': 'https://cloudinary.com',
        'Referer': 'https://cloudinary.com/'
      }
    });
    return response.data.signature;
  } catch (error) {
    console.error('Error getting signature:', error);
    throw error;
  }
}

export async function uploadToCloudinary(fileBuffer, filename) {
  try {
    const signature = await getSignature(); //get signature first
    const timestamp = Math.floor(Date.now() / 1000);

    const extension = filename.split('.').pop().toLowerCase();
    const contentType = `image/${extension}`;

    const formData = new FormData();
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('source', 'ml');
    formData.append('api_key', CLOUDINARY_API_KEY);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: contentType
    });

    const response = await axios.post(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://upload-widget.cloudinary.com',
          'Referer': 'https://upload-widget.cloudinary.com/',
          'X-Unique-Upload-Id': `${Date.now()}.${Math.random().toString(36).substr(2, 5)}`
        }
      }
    );

    console.log('Cloudinary upload response:', response.data);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const avifUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_avif,q_auto/${response.data.public_id}.avif`;

    return {
      ...response.data,
      avif_url: avifUrl
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}