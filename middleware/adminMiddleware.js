// backend/middleware/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.is_admin) {
        next();
    } else {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
};

module.exports = adminMiddleware;
