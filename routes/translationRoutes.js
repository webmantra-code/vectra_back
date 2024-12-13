const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');

// Route to get a translation file
router.get('/:lang', translationController.getTranslations);

// Route to update a translation file
router.put('/:lang', translationController.updateTranslations);

module.exports = router;
