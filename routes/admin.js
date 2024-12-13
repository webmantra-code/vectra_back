// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// Protect all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);


// Token validation endpoint
router.post('/validate-token',  (req, res) => {
  const token = req.body.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true });
  } catch (err) {
    res.status(401).json({ message: 'invalid or expired token' });
  }
    // If we reach here, the token is valid
  // res.json({ isValid: true });
});

// Admin route to get all users
router.get('/users', adminController.getAllUsersAdmin);

// Admin route to delete a user
router.delete('/users/:id', adminController.deleteUser);

//  Admin route to get blogs
router.get('/blogs', adminController.getBlogs);
router.get('/blogs/:id', adminController.getBlogById);
router.post('/blogs', adminController.addBlog);
router.put('/blogs/:id', adminController.editBlog);
router.delete('/blogs/:id', adminController.deleteBlog);

// Admin route to get leadership
router.get('/leadership', adminController.getLeadership);
router.post('/leadership', adminController.addLeadership);
router.put('/leadership/:id', adminController.updateLeadership);
router.delete('/leadership/:id', adminController.deleteLeadership);

// CRUD Services
router.get('/services', adminController.getAllServices);
router.post('/services', adminController.addService );
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// CRUD Careers
router.get('/careers', adminController.getAllJobs);
router.post('/careers', adminController.addJob);
router.put('/careers/:id', adminController.updateJob);
router.delete('/careers/:id', adminController.deleteJob);

// CRUD Testimonials
router.get('/testimonials', adminController.getAllTestimonials);
router.post('/testimonials', adminController.addTestimonial);
router.put('/testimonials/:id', adminController.updateTestimonial);
router.delete('/testimonials/:id', adminController.deleteTestimonial);

// Route to setting page
router.get('/fetch-image', adminController.fetchSettings);
// router.post('/upload-image', adminController.uploadOrUpdateImage);
router.post(
  '/upload-image', 
  adminController.upload.single('file'), 
  adminController.uploadOrUpdateImage
);

// Route to update a translation file
router.get('/translations/:lang', adminController.getTranslations);
router.put('/translations/:lang', adminController.updateTranslations);

module.exports = router;
