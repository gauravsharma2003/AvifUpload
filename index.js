import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { postimg } from './utils/postimg.js';

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

//maybe not needed 
// const httpsAgent = new https.Agent({
//   rejectUnauthorized: false,
// });

app.use(cors());

app.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file was provided in the `image` field.' });
  }

  console.log(`Received file: ${req.file.originalname}, Size: ${Math.round(req.file.size / 1024)} KB`);

  try {
    console.log('Uploading image to postimages.org...');
    const postimgResult = await postimg(req.file.buffer, req.file.originalname);

    return res.status(200).json({
      success: true,
      originalSizeKB: Math.round(req.file.size / 1024),
      ...postimgResult
    });
  } catch (error) {
    console.error('An error occurred in the process:', error);
    return res.status(500).json({ success: false, error: 'Failed to process the image.', details: error.message });
  }
});

// module.exports = app;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});