const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');

// Get all Blogs
router.get('/', serviceController.getAllServices);

// Route to get blog details by slug
router.get('/:slug', serviceController.getServiceBySlug);

module.exports = router;
