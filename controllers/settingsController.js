const { pool, sql } = require('../config/mssdb'); // Database pool connection
const multer = require('multer');
const path = require('path');

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this directory exists
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|svg|webp/; // Allowed file types
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Error: File type not supported!'), false);
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limit file size to 5MB
  },
  fileFilter: fileFilter
});

// Controller
const uploadOrUpdateImage = async (req, res) => {
  const { page_name, section_name } = req.body; // Extract form data
  const file = req.file; // Multer adds this to the request

  if (!page_name || !section_name || !file) {
      return res.status(400).json({ message: 'Page name, section name, and image file are required.' });
  }

  // Construct the image URL
  const image_url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  console.log(image_url);

  try {
      const conn = await pool;

      // Check if a record exists for the page_name and section_name
      const checkQuery = `
          SELECT * FROM settings 
          WHERE page_name = @PageName AND section_name = @SectionName;
      `;
      const checkResult = await conn.request()
          .input('PageName', sql.NVarChar, page_name)
          .input('SectionName', sql.NVarChar, section_name)
          .query(checkQuery);

      if (checkResult.recordset.length > 0) {
          // Record exists, update it
          const updateQuery = `
              UPDATE settings 
              SET image_url = @ImageUrl, updated_at = GETDATE() 
              WHERE page_name = @PageName AND section_name = @SectionName;
          `;
          await conn.request()
              .input('ImageUrl', sql.NVarChar, image_url)
              .input('PageName', sql.NVarChar, page_name)
              .input('SectionName', sql.NVarChar, section_name)
              .query(updateQuery);

          return res.status(200).json({ message: 'Image updated successfully.', image_url });
      } else {
          // No record exists, insert a new one
          const insertQuery = `
              INSERT INTO settings (page_name, section_name, image_url, created_at, updated_at) 
              VALUES (@PageName, @SectionName, @ImageUrl, GETDATE(), GETDATE());
          `;
          await conn.request()
              .input('PageName', sql.NVarChar, page_name)
              .input('SectionName', sql.NVarChar, section_name)
              .input('ImageUrl', sql.NVarChar, image_url)
              .query(insertQuery);

          return res.status(201).json({ message: 'Image uploaded successfully.', image_url });
      }
  } catch (err) {
      console.error('Error in uploadOrUpdateImage:', err);
      res.status(500).json({ message: 'An error occurred while processing the request.' });
  }
};


// Fetch all settings

const fetchSettings = async (req, res) => {
  const { page_name } = req.query; // Extract `page_name` from the request body
 
  try {
      // Get the database connection pool
      const conn = await pool;

      // Define the parameterized SQL query
      const query = `
          SELECT * FROM settings
          WHERE page_name = @PageName;
      `;

      // Execute the query
      const result = await conn.request()
          .input('PageName', sql.NVarChar, page_name)
          .query(query);

      // Return the fetched settings as JSON
      res.status(200).json(result.recordset);
  } catch (err) {
      console.error('Error in fetchSettings:', err);
      res.status(500).json({ message: 'An error occurred while fetching settings' });
  }
};



module.exports = {
  uploadOrUpdateImage,
  upload, // Export multer instance to use as middleware
  fetchSettings
};

