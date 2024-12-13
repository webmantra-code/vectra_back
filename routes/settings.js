const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

// Fetch all settings
router.get('/fetch', settingsController.fetchSettings);

// Use multer middleware for file upload
router.post(
    '/upload-image', 
    settingsController.upload.single('file'), 
    settingsController.uploadOrUpdateImage
  );

module.exports = router;
