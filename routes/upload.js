// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter to validate the file type
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/; // Allowed file types
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    }
    cb(new Error('Error: File type not supported!'), false);
};

// Initialize multer with configuration
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // Limit file size to 5MB
    },
    fileFilter: fileFilter
});

// Define the upload route for single file
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        // File uploaded successfully
        res.status(200).json({
            message: 'File uploaded successfully!',
            url: fileUrl // Include the file URL in the response
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Optionally, define a route for multiple files
router.post('/upload-multiple', upload.array('files', 5), (req, res) => {
    try {
        const fileUrls = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file.filename}`);
        // Files uploaded successfully
        res.status(200).json({
            message: 'Files uploaded successfully!',
            urls: fileUrls // Include the file URLs in the response
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
