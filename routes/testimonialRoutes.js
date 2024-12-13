const express = require('express');
const { getAllTestimonials } = require('../controllers/testimonialController');

const router = express.Router();

// Route to get testimonials filtered by language
router.get('/', getAllTestimonials);

module.exports = router;
