// backend/routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
// const authMiddleware = require('../middleware/authMiddleware');

// Protect all routes below with auth middleware
// router.use(authMiddleware);

// Get all Blogs
router.get('/', userController.getAllBlogs);

// Create a new user
// router.post('/', userController.createUser);

module.exports = router;
