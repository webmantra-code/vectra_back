const pool = require('../config/msdb'); // Adjust the path to your database connection file

// Get all testimonials filtered by language
exports.getAllTestimonials = async (req, res) => {
    const language = req.query.language || 'en'; // Default to English if no language is specified

    let conn;
    try {
        conn = await pool.getConnection();

        // Query to fetch all testimonials for the specified language
        const queryTestimonials = `
            SELECT * FROM testimonials
            WHERE language = ?
            ORDER BY created_at DESC;
        `;

        conn.query(queryTestimonials, [language], (err, testimonials) => {
            if (err) {
                console.error('Error fetching testimonials:', err);
                return res.status(500).json({ error: 'Failed to fetch testimonials' });
            }

            // Send the retrieved testimonials as the response
            res.status(200).json({
                success: true,
                testimonials,
            });
        });
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ error: 'Server error fetching testimonials' });
    } 
};
