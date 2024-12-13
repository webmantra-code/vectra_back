// backend/routes/users.js
const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// Get all Blogs
router.get('/', blogController.getAllBlogs);

// Route to get blog details by slug
router.get('/:slug', blogController.getBlogBySlug);

module.exports = router;
