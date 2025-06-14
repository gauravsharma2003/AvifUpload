const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const cheerio = require('cheerio');


const app = express();
const PORT = process.env.PORT || 3000;


const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

//maybe not needed 
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

app.post('/upload', upload.single('image'), async (req, res) => {
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
    console.log('Uploading optimized image to postimages.org...');
    
    const uploadForm = new FormData();
    const sessionId = `${new Date().getTime()}.${Math.random()}`;
    uploadForm.append('optsize', '0');
    uploadForm.append('expire', '0');
    uploadForm.append('numfiles', '1');
    uploadForm.append('upload_session', sessionId);
    uploadForm.append('file', avifBuffer, {
      filename: 'optimized.avif',
      contentType: 'image/avif',
    });

    const uploadResponse = await axios.post('https://postimages.org/json/rr', uploadForm, {
      headers: {
        ...uploadForm.getHeaders(),
        'Accept': 'application/json',
        'User-Agent': 'Node.js-Image-Optimizer/1.0',
      },
      httpsAgent: httpsAgent, 
    });

    if (!uploadResponse.data || uploadResponse.data.status !== 'OK') {
      console.error('Postimages upload failed:', uploadResponse.data);
      throw new Error('The external image hosting service failed to process the file.');
    }
    
    const pageUrl = uploadResponse.data.url;
    console.log(`Upload successful. Now scraping page for direct link: ${pageUrl}`);

    const pageHtmlResponse = await axios.get(pageUrl, { httpsAgent: httpsAgent });
    const $ = cheerio.load(pageHtmlResponse.data);
    const directImageUrl = $('meta[property="og:image"]').attr('content');

    if (!directImageUrl) {
      console.warn('Could not scrape the direct image link (og:image).');
      return res.status(200).json({
        success: true,
        warning: 'Could not find the direct image link, returning page URL instead.',
        pageUrl: pageUrl,
      });
    }
    
    console.log(`Successfully extracted direct link: ${directImageUrl}`);

    return res.status(200).json({
      success: true,
      originalSizeKB: Math.round(req.file.size / 1024),
      optimizedSizeKB: Math.round(avifBuffer.length / 1024),
      directLink: directImageUrl,
      pageUrl: pageUrl, //not needed but why not
    });

  } catch (error) {
    console.error('An error occurred in the process:', error);
    return res.status(500).json({ success: false, error: 'Failed to process the image.', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});