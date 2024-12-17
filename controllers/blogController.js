// backend/controllers/userController.js
const pool = require('../config/mssdb'); 

// Get all users
exports.getAllBlogs = async (req, res) => {
    const language = req.query.language || 'en';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    try {
        const conn = await pool.getConnection();

        // Include language in the query
        const queryBlogs = `
            SELECT * FROM blog_posts
            WHERE (title LIKE ? OR content LIKE ?) AND language = ?
            ORDER BY created_at DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`;

        conn.query(queryBlogs, [`%${search}%`, `%${search}%`, language, offset, limit], (err, blogs) => {
            if (err) {
                console.error('Error fetching blogs:', err);
                return res.status(500).json({ error: 'Failed to fetch blogs' });
            }

            const queryTotal = `SELECT COUNT(*) as totalCount FROM blog_posts
                WHERE (title LIKE ? OR content LIKE ?) AND language = ?`;
                
            conn.query(queryTotal, [`%${search}%`, `%${search}%`, language], (err, totalRows) => {
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

// Get blog details by slug
exports.getBlogBySlug = async (req, res) => {
    const { slug } = req.params;
    try {
        const conn = await pool.getConnection();

        const queryBlog = `SELECT * FROM blog_posts WHERE slug = ?`;  // Added space before WHERE

        conn.query(queryBlog, [slug], (err, blog) => {
            if (err) {
                console.error('Error fetching blog by slug:', err);
                return res.status(500).json({ error: 'Failed to fetch blog details' });
            }

            if (blog.length === 0) {
                return res.status(404).json({ error: 'Blog not found' });
            }

            res.status(200).json(blog[0]);
        });
    } catch (error) {
        console.error('Error fetching blog by slug:', error);
        res.status(500).json({ error: 'Failed to fetch blog details' });
    }
};
