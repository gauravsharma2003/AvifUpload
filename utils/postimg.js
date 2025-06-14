import axios from 'axios';
import FormData from 'form-data';
import * as cheerio from 'cheerio';


export const postimg = async (fileBuffer, filename) => {
  try {
    const formData = new FormData();
    const sessionId = `${Date.now()}.${Math.random()}`;
    
    formData.append('optsize', '0');
    formData.append('expire', '0');
    formData.append('numfiles', '1');
    formData.append('upload_session', sessionId);
    
    formData.append('file', fileBuffer, {
      filename: filename,
      contentType: 'image/avif'
    });

    const uploadResponse = await axios.post('https://postimages.org/json/rr', formData, {
      headers: {
        ...formData.getHeaders(),
        'Accept': 'application/json',
        'User-Agent': 'Node.js-Image-Optimizer/1.0'
      }
    });

    if (!uploadResponse.data || uploadResponse.data.status !== 'OK') {
      throw new Error('Postimages upload failed: ' + JSON.stringify(uploadResponse.data));
    }

    const pageUrl = uploadResponse.data.url;
    console.log(`Upload successful. Now scraping page for direct link: ${pageUrl}`);

    const pageHtmlResponse = await axios.get(pageUrl);
    const $ = cheerio.load(pageHtmlResponse.data);
    const directImageUrl = $('meta[property="og:image"]').attr('content');

    if (!directImageUrl) {
      console.warn('Could not scrape the direct image link (og:image).');
      return {
        success: true,
        warning: 'Could not find the direct image link, returning page URL instead.',
        pageUrl: pageUrl
      };
    }

    console.log(`Successfully extracted direct link: ${directImageUrl}`);

    return {
      success: true,
      directLink: directImageUrl,
      pageUrl: pageUrl
    };

  } catch (error) {
    console.error('Postimages upload error:', error);
    throw error;
  }
};
