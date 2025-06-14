import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
import { uploadToCloudinary } from './utils/cloud.js';

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

app.use(cors());

app.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was provided in the `image` field.' });
  }

  console.log(`Received file: ${req.file.originalname}, Size: ${Math.round(req.file.size / 1024)} KB`);

  try {
    console.log('Converting to AVIF...');
    const avifBuffer = await sharp(req.file.buffer)
      .avif({ quality: 50, effort: 4 })
      .toBuffer();
    
    console.log(`Conversion successful. New AVIF size: ${Math.round(avifBuffer.length / 1024)} KB`);
    console.log('Uploading optimized image to Cloudinary...');
    
    const cloudinaryResponse = await uploadToCloudinary(avifBuffer, 'optimized.avif');
    
    console.log('Upload successful to Cloudinary');

    return res.status(200).json({
      success: true,
      originalSizeKB: Math.round(req.file.size / 1024),
      optimizedSizeKB: Math.round(avifBuffer.length / 1024),
      directLink: cloudinaryResponse.secure_url,
      pageUrl: cloudinaryResponse.url,
    });

  } catch (error) {
    console.error('An error occurred in the process:', error);
    return res.status(500).json({ success: false, error: 'Failed to process the image.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});