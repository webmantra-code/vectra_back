// backend/controllers/userController.js
const pool = require('../config/mssdb'); 

// Get all users
exports.getAllBlogs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    try {
        const conn = await pool.getConnection();

        const queryBlogs = `
            SELECT * FROM blog_posts
            WHERE title LIKE ? OR content LIKE ?
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;

        conn.query(queryBlogs, [`%${search}%`, `%${search}%`, offset, limit], (err, blogs) => {
            if (err) {
                console.error('Error fetching blogs:', err);
                return res.status(500).json({ error: 'Failed to fetch blogs' });
            }

            const queryTotal = `
                SELECT COUNT(*) as totalCount FROM blog_posts
                WHERE title LIKE ? OR content LIKE ?`;
            conn.query(queryTotal, [`%${search}%`, `%${search}%`], (err, totalRows) => {
                if (err) {
                    console.error('Error fetching blog count:', err);
                    return res.status(500).json({ error: 'Failed to fetch blog count' });
                }

                const totalCount = totalRows[0].totalCount;
                res.status(200).json({
                    blogs,
                    pagination: {
                        total: totalCount,
                        page,
                        limit,
                        totalPages: Math.ceil(totalCount / limit),
                    },
                });
            });
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
};

// Create a new user (if not using authController's register)
exports.createUser = async (req, res) => {
    const { username, email } = req.body;

    if (!username || !email) {
        return res.status(400).json({ message: 'Username and email are required' });
    }

    try {
        await pool.execute('INSERT INTO users (username, email) VALUES (?, ?)', [username, email]);
        res.status(201).json({ message: 'User created successfully' });
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).json({ message: 'Server error creating user' });
    }
};
