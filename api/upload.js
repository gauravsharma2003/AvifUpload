const multer = require('multer');
const sharp = require('sharp');
const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const cheerio = require('cheerio');


function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    await runMiddleware(req, res, upload.single('image'));

    if (!req.file) {
      return res.status(400).json({ error: 'No image file was provided in the `image` field.' });
    }

    const avifBuffer = await sharp(req.file.buffer).avif({ quality: 50 }).toBuffer();
    
    const uploadForm = new FormData();
    uploadForm.append('optsize', '0');
    uploadForm.append('expire', '0');
    uploadForm.append('numfiles', '1');
    uploadForm.append('upload_session', `${new Date().getTime()}.${Math.random()}`);
    uploadForm.append('file', avifBuffer, {
      filename: 'optimized.avif',
      contentType: 'image/avif',
    });

    const uploadResponse = await axios.post('https://postimages.org/json/rr', uploadForm, {
      headers: { ...uploadForm.getHeaders() },
      httpsAgent: httpsAgent,
    });
    
    if (!uploadResponse.data || uploadResponse.data.status !== 'OK') {
      throw new Error('External image hosting service failed to upload.');
    }

    const pageUrl = uploadResponse.data.url;
    const pageHtmlResponse = await axios.get(pageUrl, { httpsAgent });
    const $ = cheerio.load(pageHtmlResponse.data);
    const directImageUrl = $('meta[property="og:image"]').attr('content');

    if (!directImageUrl) {
      throw new Error('Could not scrape the direct image link from the returned page.');
    }
    
    return res.status(200).json({
      success: true,
      directLink: directImageUrl,
      pageUrl: pageUrl,
    });

  } catch (error) {
    console.error('An error occurred in the handler:', error); 
    return res.status(500).json({ success: false, error: 'Failed to process the image.', details: error.message });
  }
}