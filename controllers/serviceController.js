const { pool, sql } = require('../config/mssdb'); 

// Get All Services (with optional language filter)
exports.getAllServices = async (req, res) => {
    const language = req.query.language || 'en';

    try {
        const conn = await pool;

        // Query to fetch all services for the specified language
        const queryServices = `
            SELECT * FROM services
            WHERE language = @Language
            ORDER BY created_at DESC;
        `;

        // Execute the query
        const result = await conn.request()
            .input('Language', sql.NVarChar, language)
            .query(queryServices);

        // Send the retrieved services as the response
        res.status(200).json({
            services: result.recordset,
        });
    } catch (error) {
        console.error('Error fetching services:', error);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
};

// Get Service by Slug and Language
exports.getServiceBySlug = async (req, res) => {
    const { slug } = req.params; // Extract slug from the URL
    const { language } = req.query; // Extract language from the query string

    try {
        const conn = await pool;

        // Query to fetch the service and its associated features
        const query = `
        SELECT 
            s.id AS service_id, 
            s.slug,
            s.language, 
            s.title, 
            s.subtitle, 
            s.button_text, 
            s.button_link, 
            s.image, 
            s.created_at AS service_created_at, 
            s.updated_at AS service_updated_at,
            f.id AS feature_id, 
            f.feature_title, 
            f.feature_name, 
            f.feature_description, 
            f.created_at AS feature_created_at, 
            f.updated_at AS feature_updated_at
        FROM services s
        LEFT JOIN service_features f ON f.service_id = s.id
        WHERE s.slug = @Slug AND s.language = @Language
        ORDER BY f.id DESC;
        `;

        // Execute the query
        const result = await conn.request()
            .input('Slug', sql.NVarChar, slug)
            .input('Language', sql.NVarChar, language)
            .query(query);

        const rows = result.recordset;

        if (!rows.length) {
            return res.status(404).json({ message: 'Service not found' });
        }

        // Group features for the service
        const service = {
            id: rows[0].service_id,
            slug: rows[0].slug,
            language: rows[0].language,
            title: rows[0].title,
            subtitle: rows[0].subtitle,
            button_text: rows[0].button_text,
            button_link: rows[0].button_link,
            image: rows[0].image,
            created_at: rows[0].service_created_at,
            updated_at: rows[0].service_updated_at,
            features: rows
                .filter((row) => row.feature_id)
                .map((row) => ({
                    id: row.feature_id,
                    title: row.feature_title,
                    name: row.feature_name,
                    description: row.feature_description,
                    created_at: row.feature_created_at,
                    updated_at: row.feature_updated_at,
                })),
        };

        // Send the service with its features as the response
        res.json({ success: true, service });
    } catch (err) {
        console.error('Error fetching service:', err);
        res.status(500).json({ message: 'Server error fetching service' });
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
