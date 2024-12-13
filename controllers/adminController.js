// const pool = require('../config/msdb'); // Ensure you use the correct config file for MSSQL
const { pool, sql } = require('../config/mssdb');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { send } = require('process');


// Configure storage for multer
// Multer Configuration
// Define storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Set your upload directory
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Generate unique filename
    },
});

// File filter function
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|svg|webp|mp4|mov|avi|mkv/;
    const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/svg+xml',
        'image/webp',
        'video/mp4',
        'video/quicktime', // MOV
        'video/x-msvideo', // AVI
        'video/x-matroska', // MKV
    ];

    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMimeTypes.includes(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true); // Accept file
    }
    cb(new Error('Error: File type not supported!'), false); // Reject file
};

exports.upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: (req, file, cb) => {
            const isImage = file.mimetype.startsWith('image/');
            const maxSize = isImage ? 2 * 1024 * 1024 : 50 * 1024 * 1024; // 2 MB for images, 50 MB for videos

            if (file.size > maxSize) {
                return cb(
                    new Error(
                        `Error: File size exceeds the limit of ${isImage ? '2MB' : '50MB'
                        } for ${isImage ? 'images' : 'videos'}`
                    ),
                    false
                );
            }

            cb(null, true); // Accept file if size is within the limit
        },
    },
});


// Example: Get all users (admin functionality)
exports.getAllUsersAdmin = async (req, res) => {
    try {
        const conn = await pool.getConnection(); // Get MSSQL connection
        const query = 'SELECT id, username, email, is_admin, created_at FROM users';
        conn.query(query, (err, rows) => {
            if (err) {
                console.error('Error fetching users:', err);
                return res.status(500).json({ message: 'Server error fetching users' });
            }
            res.json(rows);
        });
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Server error fetching users' });
    }
};

// Example: Delete a user (admin functionality)
exports.deleteUser = async (req, res) => {
    const userId = req.params.id;

    try {
        const conn = await pool.getConnection(); // Get MSSQL connection
        const query = 'DELETE FROM users WHERE id = ?';
        conn.query(query, [userId], (err, result) => {
            if (err) {
                console.error('Error deleting user:', err);
                return res.status(500).json({ message: 'Server error deleting user' });
            }
            if (result.rowsAffected === 0) { // Adjusted for MSSQL
                return res.status(404).json({ message: 'User not found' });
            }
            res.json({ message: 'User deleted successfully' });
        });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error deleting user' });
    }
};

// Get all blogs with pagination and search
exports.getBlogs = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const language = req.query.language || 'en';
    const post_type = req.query.post_type || '';
    const offset = (page - 1) * limit;

    try {
        // Get a connection from the pool
        const conn = await pool;

        // Build the query dynamically
        let queryBlogs = `
            SELECT * FROM blog_posts
            WHERE (title LIKE @Search OR content LIKE @Search) AND post_type = @PostType`;

        // Only add the language filter if it's not 'all'
        if (language !== 'all') {
            queryBlogs += ` AND language = @Language`;
        }

        queryBlogs += ` ORDER BY created_at DESC OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY`;

        const request = conn.request()
            .input('Search', sql.NVarChar, `%${search}%`)
            .input('PostType', sql.NVarChar, post_type)
            .input('Offset', sql.Int, offset)
            .input('Limit', sql.Int, limit);

        if (language !== 'all') {
            request.input('Language', sql.NVarChar, language);
        }

        // Execute the blogs query
        const blogsResult = await request.query(queryBlogs);
        const blogs = blogsResult.recordset;

        // Query for total count
        let queryTotal = `
            SELECT COUNT(*) AS totalCount FROM blog_posts
            WHERE (title LIKE @Search OR content LIKE @Search) AND post_type = @PostType`;

        if (language !== 'all') {
            queryTotal += ` AND language = @Language`;
        }

        const totalRequest = conn.request()
            .input('Search', sql.NVarChar, `%${search}%`)
            .input('PostType', sql.NVarChar, post_type);

        if (language !== 'all') {
            totalRequest.input('Language', sql.NVarChar, language);
        }

        const totalResult = await totalRequest.query(queryTotal);
        const totalCount = totalResult.recordset[0].totalCount;

        // Respond with blogs and pagination information
        res.status(200).json({
            blogs,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching blogs:', error);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
};

// Get single blog
exports.getBlogById = async (req, res) => {
    const blogId = req.params.id;

    try {
        // Get a connection from the pool
        const conn = await pool;

        // Query to fetch the blog by ID
        const query = 'SELECT * FROM blog_posts WHERE id = @BlogId';

        const result = await conn.request()
            .input('BlogId', sql.Int, blogId) // Bind the blogId as an integer parameter
            .query(query);

        // Check if the blog exists
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Return the blog
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching blog:', error);
        res.status(500).json({ error: 'Failed to fetch blog' });
    }
};

exports.addBlog = async (req, res) => {
    const { title, sub_title, content, author, post_type, languages, image } = req.body;

    // Validate required fields
    if (!title || !content || !author || !post_type || !languages) {
        return res.status(400).json({ error: 'All fields are required: title, content, author, post_type, languages' });
    }

    // Generate a unique slug from the title
    const baseSlug = title.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\w-]+/g, '');

    try {
        const conn = await pool;

        // Generate unique slug for the blog post
        const slug = await generateUniqueSlug(conn, baseSlug);

        // Insert the blog post into the database
        const query = `
            INSERT INTO blog_posts (title, sub_title, content, author, post_type, image, slug, language, created_at)
            OUTPUT inserted.*
            VALUES (@Title, @SubTitle, @Content, @Author, @PostType, @Image, @Slug, @Language, GETDATE())`;

        const result = await pool.request()
            .input('Title', sql.NVarChar, title)
            .input('SubTitle', sql.NVarChar, sub_title || null) // Optional field
            .input('Content', sql.NVarChar, content)
            .input('Author', sql.NVarChar, author)
            .input('PostType', sql.NVarChar, post_type)
            .input('Image', sql.NVarChar, image || null) // Optional field
            .input('Slug', sql.NVarChar, slug)
            .input('Language', sql.NVarChar, languages)
            .query(query);

        // Send success response with the inserted blog post's details
        res.status(201).json(result.recordset[0]);
    } catch (error) {
        console.error('Error adding blog:', error);
        res.status(500).json({ error: 'Failed to add blog' });
    }
};

// Function to translate content using a translation API
// const translateContent = async (text, targetLang) => {
//     return text;
//     try {
//         const response = await axios.post('https://api.example.com/translate', {
//             text,
//             target_lang: targetLang,
//         });
//         return response.data.translatedText; // Adjust based on your API response
//     } catch (error) {
//         console.error('Translation failed:', error);
//         throw new Error('Translation failed');
//     }
// };

// Function to generate a unique slug
const generateUniqueSlug = async (conn, baseSlug) => {
    let uniqueSlug = baseSlug;
    let isUnique = false;
    let suffix = 0;

    while (!isUnique) {
        const query = `SELECT COUNT(*) AS count FROM blog_posts WHERE slug = @Slug`;
        const result = await pool.request().input('Slug', sql.NVarChar, uniqueSlug).query(query);
        if (result.recordset[0].count === 0) {
            isUnique = true;
        } else {
            suffix += 1;
            uniqueSlug = `${baseSlug}-${suffix}`;
        }
    }

    return uniqueSlug;
};

// Function to insert a blog post into the database
// const insertBlogPost = (conn, blogPost) => {
//     const queryAdd = `
//         INSERT INTO blog_posts (title, sub_title, content, author, post_type, image, slug, language, created_at, updated_at)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())`;

//     return new Promise((resolve, reject) => {
//         console.log('Inserting blog post:', blogPost);
//         conn.query(queryAdd, [
//             blogPost.title,
//             blogPost.sub_title,
//             blogPost.content,
//             blogPost.author,
//             blogPost.post_type,
//             blogPost.image,
//             blogPost.slug,
//             blogPost.language
//         ], (err, result) => {
//             if (err) {
//                 console.error('Error adding blog:', err);
//                 return reject('Failed to add blog');
//             }
//             console.log('Blog added successfully:', result);
//             resolve({ id: result.insertId, ...blogPost });
//         });
//     });
// };





exports.editBlog = async (req, res) => {
    const { id } = req.params;
    const { title, sub_title, content, author, post_type, languages, image } = req.body;

    if (!title || !content || !author || !post_type || !languages) {
        return res.status(400).json({ error: 'All fields are required: title, content, author, post_type, languages' });
    }

    // Generate a slug from the new title
    const newSlug = title.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\w-]+/g, '');

    try {
        const conn = await pool;

        const slug = await generateUniqueSlug(conn, newSlug);

        // Check if the slug already exists for a different blog post
        const queryCheckSlug = `
            SELECT id FROM blog_posts 
            WHERE slug = @Slug AND id != @Id`;
        const checkSlugResult = await conn.request()
            .input('Slug', sql.NVarChar, newSlug)
            .input('Id', sql.Int, id)
            .query(queryCheckSlug);

        let slugToUpdate = newSlug;

        // If slug exists, append a unique identifier
        if (checkSlugResult.recordset.length > 0) {
            const uniqueId = Date.now(); // Use timestamp as a unique identifier
            slugToUpdate += `-${uniqueId}`;
        }

        // Update blog post
        const queryEdit = `
            UPDATE blog_posts
            SET 
                title = @Title, 
                sub_title = @SubTitle, 
                content = @Content, 
                author = @Author, 
                post_type = @PostType, 
                language = @Language, 
                image = @Image, 
                slug = @Slug, 
                updated_at = GETDATE()
            WHERE id = @Id`;

        const result = await conn.request()
            .input('Title', sql.NVarChar, title)
            .input('SubTitle', sql.NVarChar, sub_title || null) // Optional field
            .input('Content', sql.NVarChar, content)
            .input('Author', sql.NVarChar, author)
            .input('PostType', sql.NVarChar, post_type)
            .input('Language', sql.NVarChar, languages)
            .input('Image', sql.NVarChar, image || null) // Optional field
            .input('Slug', sql.NVarChar, slugToUpdate)
            .input('Id', sql.Int, id)
            .query(queryEdit);

        // Check if any rows were updated
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Respond with the updated blog details
        res.status(200).json({
            id,
            title,
            sub_title,
            content,
            author,
            post_type,
            languages,
            image,
            slug: slugToUpdate,
        });
    } catch (error) {
        console.error('Error updating blog:', error);
        res.status(500).json({ error: 'Failed to update blog', details: error.message });
    }
};

// Delete a blog post
exports.deleteBlog = async (req, res) => {
    const { id } = req.params;

    try {
        // Get a connection from the pool
        const conn = await pool;

        // Delete the blog post by ID
        const queryDelete = `
            DELETE FROM blog_posts 
            WHERE id = @Id`;

        const result = await conn.request()
            .input('Id', sql.Int, id) // Bind the blog ID as an integer parameter
            .query(queryDelete);

        // Check if any rows were affected
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Respond with 204 No Content for successful deletion
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting blog:', error);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
};


// Function to fetch the leadership team members
exports.getLeadership = async (req, res) => {
    try {
        // Get a connection from the pool
        const conn = await pool;

        // Define the SQL query
        const query = `
            SELECT 
                id, 
                name, 
                position, 
                description, 
                linkedin_url, 
                image_url 
            FROM leadership_team`;

        // Execute the query
        const result = await conn.request().query(query);

        // Return the leadership data
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching leadership:', err);
        res.status(500).json({ message: 'Server error fetching leadership', error: err.message });
    }
};


// Function to add a new leadership team member
exports.addLeadership = async (req, res) => {
    const { name, position, description, linkedin_url, image_url } = req.body;

    // Validate required fields
    if (!name || !position || !description) {
        return res.status(400).json({ message: 'Name, position, and description are required fields' });
    }

    try {
        // Get a connection from the pool
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            INSERT INTO leadership_team (name, position, description, linkedin_url, image_url) 
            VALUES (@Name, @Position, @Description, @LinkedInUrl, @ImageUrl)`;

        // Execute the query with bound parameters
        await conn.request()
            .input('Name', sql.NVarChar, name)
            .input('Position', sql.NVarChar, position)
            .input('Description', sql.NVarChar, description)
            .input('LinkedInUrl', sql.NVarChar, linkedin_url || null) // Optional field
            .input('ImageUrl', sql.NVarChar, image_url || null) // Optional field
            .query(query);

        // Send success response
        res.status(201).json({ message: 'Member added successfully' });
    } catch (err) {
        console.error('Error adding member:', err);
        res.status(500).json({ message: 'Server error adding member', error: err.message });
    }
};

// Function to update an existing leadership team member
exports.updateLeadership = async (req, res) => {
    const { id } = req.params;
    const { name, position, description, linkedin_url, image_url, language } = req.body;

    // Validate required fields
    if (!name || !position || !description || !language) {
        return res.status(400).json({ message: 'Name, position, description, and language are required fields' });
    }

    try {
        const conn = await pool;

        // Define the SQL query for the update
        const query = `
            UPDATE leadership_team
            SET 
                name = @Name, 
                position = @Position, 
                description = @Description, 
                linkedin_url = @LinkedInUrl, 
                image_url = @ImageUrl
                
               
            WHERE id = @Id
        `;
        // updated_at = GETDATE()
        // Execute the query with parameterized inputs
        const result = await conn.request()
            .input('Name', sql.NVarChar, name)
            .input('Position', sql.NVarChar, position)
            .input('Description', sql.NVarChar, description)
            .input('LinkedInUrl', sql.NVarChar, linkedin_url || null) // Optional field
            .input('ImageUrl', sql.NVarChar, image_url || null) // Optional field
            // .input('Language', sql.NVarChar, language)
            .input('Id', sql.Int, id)
            .query(query);

        // Check if any rows were updated
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Send success response
        res.status(200).json({ message: 'Member updated successfully' });
    } catch (err) {
        console.error('Error updating member:', err);
        res.status(500).json({ message: 'Server error updating member', error: err.message });
    }
};

// Function to delete a leadership team member
exports.deleteLeadership = async (req, res) => {
    const { id } = req.params;

    try {
        // Get a connection from the pool
        const conn = await pool;

        // Define the SQL query to delete a member
        const query = 'DELETE FROM leadership_team WHERE id = @Id';

        // Execute the query with the bound parameter
        const result = await conn.request()
            .input('Id', sql.Int, id) // Bind the id as an integer parameter
            .query(query);

        // Check if any rows were affected
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Member not found' });
        }

        // Send success response
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        console.error('Error deleting member:', err);
        res.status(500).json({ message: 'Server error deleting member', error: err.message });
    }
};


// Get All Services (with optional language filter)
exports.getAllServices = async (req, res) => {
    const { language } = req.query; // Optional language filter

    try {
        const conn = await pool;

        // Query to fetch services and their associated features
        const query = `
            SELECT 
                s.id AS service_id, 
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
            ${language ? 'WHERE s.language = @Language' : ''}
            ORDER BY s.id DESC, f.id DESC;
        `;

        // Create a request with bound parameters
        const request = conn.request();
        if (language) {
            request.input('Language', sql.NVarChar, language);
        }

        // Execute the query
        const result = await request.query(query);

        // Group features by service_id
        const services = result.recordset.reduce((acc, row) => {
            const serviceId = row.service_id;

            // Find existing service or create a new one
            let service = acc.find((s) => s.id === serviceId);
            if (!service) {
                service = {
                    id: serviceId,
                    language: row.language,
                    title: row.title,
                    subtitle: row.subtitle,
                    button_text: row.button_text,
                    button_link: row.button_link,
                    image: row.image,
                    created_at: row.service_created_at,
                    updated_at: row.service_updated_at,
                    features: [],
                };
                acc.push(service);
            }

            // Add feature to the service's features array if present
            if (row.feature_id) {
                service.features.push({
                    id: row.feature_id,
                    title: row.feature_title,
                    name: row.feature_name,
                    description: row.feature_description,
                    created_at: row.feature_created_at,
                    updated_at: row.feature_updated_at,
                });
            }

            return acc;
        }, []);

        // Send the grouped services with features as the response
        res.json(services);
    } catch (err) {
        console.error('Error fetching services:', err);
        res.status(500).json({ message: 'Server error fetching services', error: err.message });
    }
};


exports.addService = async (req, res) => {
    const { language, title, subtitle, button_text, button_link, image, features } = req.body;

    // Validate required fields
    if (!language || !title || !subtitle || !button_text || !image) {
        return res.status(400).json({ error: 'All fields are required: language, title, subtitle, button_text, and image' });
    }

    try {
        const conn = await pool;

        // Generate a unique slug from the title
        let baseSlug = title.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\w-]+/g, '');
        let slug = baseSlug;

        // Check for existing slugs and ensure uniqueness
        const slugQuery = `
            SELECT COUNT(*) AS count FROM services WHERE slug = @Slug;
        `;

        let count = 0;
        do {
            const slugResult = await conn.request()
                .input('Slug', sql.NVarChar, slug)
                .query(slugQuery);

            count = slugResult.recordset[0].count;

            if (count > 0) {
                slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`; // Add random suffix for uniqueness
            }
        } while (count > 0);

        // Insert the service into the database and get the inserted ID
        const serviceQuery = `
            INSERT INTO services (language, title, subtitle, button_text, button_link, image, slug, created_at, updated_at)
            OUTPUT inserted.id
            VALUES (@Language, @Title, @Subtitle, @ButtonText, @ButtonLink, @Image, @Slug, GETDATE(), GETDATE())`;

        const serviceResult = await conn.request()
            .input('Language', sql.NVarChar, language)
            .input('Title', sql.NVarChar, title)
            .input('Subtitle', sql.NVarChar, subtitle)
            .input('ButtonText', sql.NVarChar, button_text)
            .input('ButtonLink', sql.NVarChar, button_link || null) // Optional field
            .input('Image', sql.NVarChar, image)
            .input('Slug', sql.NVarChar, slug)
            .query(serviceQuery);

        const serviceId = serviceResult.recordset[0].id;

        // Insert features if provided
        if (features && features.length > 0) {
            const featureQuery = `
                INSERT INTO service_features (service_id, feature_title, feature_name, feature_description, created_at, updated_at)
                VALUES (@ServiceId, @FeatureTitle, @FeatureName, @FeatureDescription, GETDATE(), GETDATE())`;

            for (const feature of features) {
                await conn.request()
                    .input('ServiceId', sql.Int, serviceId)
                    .input('FeatureTitle', sql.NVarChar, feature.title || '')
                    .input('FeatureName', sql.NVarChar, feature.name || '')
                    .input('FeatureDescription', sql.NVarChar, feature.description || '')
                    .query(featureQuery);
            }
        }

        // Send success response
        res.status(201).json({ message: 'Service added successfully', serviceId, slug });
    } catch (error) {
        console.error('Error adding service:', error);
        res.status(500).json({ error: 'Failed to add service' });
    }
};


// Update Service
exports.updateService = async (req, res) => {
    const { id } = req.params;
    const { language, title, subtitle, button_text, button_link, image, features } = req.body;

    try {
        const conn = await pool;

        // Generate a unique slug from the title
        let baseSlug = title.toLowerCase().replace(/[\s]+/g, '-').replace(/[^\w-]+/g, '');
        let slug = baseSlug;

        // Check for existing slugs and ensure uniqueness
        const slugQuery = `
            SELECT COUNT(*) AS count FROM services WHERE slug = @Slug AND id != @Id;
        `;
        let count = 0;
        do {
            const slugResult = await conn.request()
                .input('Slug', sql.NVarChar, slug)
                .input('Id', sql.Int, id)
                .query(slugQuery);

            count = slugResult.recordset[0].count;

            if (count > 0) {
                slug = `${baseSlug}-${Math.floor(Math.random() * 1000)}`; // Add random suffix for uniqueness
            }
        } while (count > 0);

        // Update the service with the new slug
        const updateServiceQuery = `
            UPDATE services
            SET 
                language = @Language, 
                title = @Title, 
                subtitle = @Subtitle, 
                button_text = @ButtonText, 
                button_link = @ButtonLink, 
                image = @Image, 
                slug = @Slug,
                updated_at = GETDATE()
            WHERE id = @Id;
        `;

        await conn.request()
            .input('Language', sql.NVarChar, language)
            .input('Title', sql.NVarChar, title)
            .input('Subtitle', sql.NVarChar, subtitle)
            .input('ButtonText', sql.NVarChar, button_text)
            .input('ButtonLink', sql.NVarChar, button_link || null) // Optional field
            .input('Image', sql.NVarChar, image)
            .input('Slug', sql.NVarChar, slug)
            .input('Id', sql.Int, id)
            .query(updateServiceQuery);

        // Delete old features
        const deleteFeaturesQuery = `DELETE FROM service_features WHERE service_id = @ServiceId;`;
        await conn.request().input('ServiceId', sql.Int, id).query(deleteFeaturesQuery);

        // Insert updated features
        if (features && features.length > 0) {
            const insertFeatureQuery = `
                INSERT INTO service_features (service_id, feature_title, feature_name, feature_description, created_at, updated_at)
                VALUES (@ServiceId, @FeatureTitle, @FeatureName, @FeatureDescription, GETDATE(), GETDATE());
            `;

            for (const feature of features) {
                // Create a new request for each feature to avoid parameter conflicts
                await conn.request()
                    .input('ServiceId', sql.Int, id)
                    .input('FeatureTitle', sql.NVarChar, feature.title || '')
                    .input('FeatureName', sql.NVarChar, feature.name || '')
                    .input('FeatureDescription', sql.NVarChar, feature.description || '')
                    .query(insertFeatureQuery);
            }
        }

        res.status(200).json({ message: 'Service updated successfully', slug });
    } catch (err) {
        console.error('Error updating service:', err);
        res.status(500).json({ message: 'Error updating service' });
    }
};

// Delete Service
exports.deleteService = async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await pool;

        // Delete associated features
        const deleteFeaturesQuery = `DELETE FROM service_features WHERE service_id = @ServiceId;`;
        await conn.request()
            .input('ServiceId', sql.Int, id)
            .query(deleteFeaturesQuery);

        // Delete the service
        const deleteServiceQuery = `DELETE FROM services WHERE id = @ServiceId;`;
        await conn.request()
            .input('ServiceId', sql.Int, id)
            .query(deleteServiceQuery);

        // Send success response
        res.status(200).json({ message: 'Service deleted successfully' });
    } catch (err) {
        console.error('Error deleting service:', err);
        res.status(500).json({ message: 'Error deleting service' });
    }
};


// Fetch all jobs
exports.getAllJobs = async (req, res) => {
    const { language } = req.query; // Language filter (optional)

    try {
        const conn = await pool;

        // Build the SQL query dynamically based on the language filter
        const query = `
            SELECT * FROM jobs
            ${language ? 'WHERE language = @Language' : ''} 
            ORDER BY id DESC;
        `;

        const request = conn.request();
        if (language) {
            request.input('Language', sql.NVarChar, language);
        }

        // Execute the query
        const result = await request.query(query);

        // Send the jobs as a response
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Server error fetching jobs' });
    }
};

// Add a new job
exports.addJob = async (req, res) => {
    const { title, location, type, department, description, qualifications, language } = req.body;

    try {
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            INSERT INTO jobs (title, location, type, department, description, qualifications, language, created_at, updated_at)
            OUTPUT inserted.id
            VALUES (@Title, @Location, @Type, @Department, @Description, @Qualifications, @Language, GETDATE(), GETDATE());
        `;

        // Execute the query with bound parameters
        const result = await conn.request()
            .input('Title', sql.NVarChar, title)
            .input('Location', sql.NVarChar, location)
            .input('Type', sql.NVarChar, type)
            .input('Department', sql.NVarChar, department)
            .input('Description', sql.NVarChar, description)
            .input('Qualifications', sql.NVarChar, qualifications)
            .input('Language', sql.NVarChar, language)
            .query(query);

        // Return the ID of the newly inserted job
        res.status(201).json({ id: result.recordset[0].id, message: 'Job added successfully' });
    } catch (error) {
        console.error('Error adding job:', error);
        res.status(500).json({ message: 'Server error adding job' });
    }
};

// Update an existing job
exports.updateJob = async (req, res) => {
    const { id } = req.params;
    const { title, location, type, department, description, qualifications, language } = req.body;

    try {
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            UPDATE jobs
            SET 
                title = @Title, 
                location = @Location, 
                type = @Type, 
                department = @Department, 
                description = @Description, 
                qualifications = @Qualifications, 
                language = @Language, 
                updated_at = GETDATE()
            WHERE id = @Id;
        `;

        // Execute the query with bound parameters
        await conn.request()
            .input('Title', sql.NVarChar, title)
            .input('Location', sql.NVarChar, location)
            .input('Type', sql.NVarChar, type)
            .input('Department', sql.NVarChar, department)
            .input('Description', sql.NVarChar, description)
            .input('Qualifications', sql.NVarChar, qualifications)
            .input('Language', sql.NVarChar, language)
            .input('Id', sql.Int, id)
            .query(query);

        res.json({ message: 'Job updated successfully' });
    } catch (error) {
        console.error('Error updating job:', error);
        res.status(500).json({ message: 'Server error updating job' });
    }
};

// Delete a job
exports.deleteJob = async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await pool;

        // Define the SQL query with a parameter placeholder
        const query = `DELETE FROM jobs WHERE id = @Id;`;

        // Execute the query with bound parameters
        await conn.request()
            .input('Id', sql.Int, id)
            .query(query);

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Server error deleting job' });
    }
};


// Controller to upload or update image
exports.uploadOrUpdateImage = async (req, res) => {
    const { page_name, section_name } = req.body; // Extract form data
    const file = req.file; // Multer adds this to the request

    // Validate inputs
    if (!page_name || !section_name) {
        return res.status(400).json({ message: 'Page name and section name are required.' });
    }
    if (!file) {
        return res.status(400).json({ message: 'Image file is required.' });
    }

    // Construct the image URL
    const image_url = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;


    try {

        const conn = await pool;

        // Check if a record exists for the given page_name and section_name
        const checkQuery = `
            SELECT * FROM settings 
            WHERE page_name = @PageName AND section_name = @SectionName;
        `;
        const checkResult = await conn.request()
            .input('PageName', sql.NVarChar, page_name)
            .input('SectionName', sql.NVarChar, section_name)
            .query(checkQuery);


        if (checkResult.recordset.length > 0) {
            // Record exists, update it
            const updateQuery = `
                UPDATE settings 
                SET image_url = @ImageUrl, updated_at = GETDATE() 
                WHERE page_name = @PageName AND section_name = @SectionName;
            `;
            await conn.request()
                .input('ImageUrl', sql.NVarChar, image_url)
                .input('PageName', sql.NVarChar, page_name)
                .input('SectionName', sql.NVarChar, section_name)
                .query(updateQuery);

            return res.status(200).json({ message: 'Image updated successfully.', image_url });
        } else {
            // No record exists, insert a new one
            const insertQuery = `
                INSERT INTO settings (page_name, section_name, image_url, updated_at) 
                VALUES (@PageName, @SectionName, @ImageUrl, GETDATE());
            `;
            await conn.request()
                .input('PageName', sql.NVarChar, page_name)
                .input('SectionName', sql.NVarChar, section_name)
                .input('ImageUrl', sql.NVarChar, image_url)
                .query(insertQuery);

            return res.status(201).json({ message: 'Image uploaded successfully.', image_url });
        }
    } catch (err) {
        console.error('Error in uploadOrUpdateImage:', err);
        res.status(500).json({ message: 'An error occurred while processing the request.', error: err.message });
    }
};





// Fetch all testimonials
exports.getAllTestimonials = async (req, res) => {
    const { language } = req.query; // Optional language filter

    try {
        const conn = await pool;

        // Build the SQL query dynamically based on the language filter
        const query = `
            SELECT * FROM testimonials
            ${language ? 'WHERE language = @Language' : ''} 
            ORDER BY id DESC;
        `;

        const request = conn.request();
        if (language) {
            request.input('Language', sql.NVarChar, language);
        }

        // Execute the query
        const result = await request.query(query);

        // Return the testimonials as the response
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching testimonials:', error);
        res.status(500).json({ message: 'Server error fetching testimonials' });
    }
};

// Add a new testimonial
exports.addTestimonial = async (req, res) => {
    const { name, position, message, logoUrl, language } = req.body;

    // Validate input
    if (!name || !position || !message || !logoUrl || !language) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            INSERT INTO testimonials (name, position, message, logoUrl, language, created_at, updated_at)
            OUTPUT inserted.id
            VALUES (@Name, @Position, @Message, @LogoUrl, @Language, GETDATE(), GETDATE());
        `;

        // Execute the query with bound parameters
        const result = await conn.request()
            .input('Name', sql.NVarChar, name)
            .input('Position', sql.NVarChar, position)
            .input('Message', sql.NVarChar, message)
            .input('LogoUrl', sql.NVarChar, logoUrl)
            .input('Language', sql.NVarChar, language)
            .query(query);

        // Return success response with the new record's ID
        res.status(201).json({ message: 'Testimonial added successfully', id: result.recordset[0].id });
    } catch (error) {
        console.error('Error adding testimonial:', error);
        res.status(500).json({ message: 'Server error adding testimonial' });
    }
};

// Update an existing testimonial
exports.updateTestimonial = async (req, res) => {
    const { id } = req.params;
    const { name, position, message, logoUrl, language } = req.body;

    // Validate input
    if (!name || !position || !message || !logoUrl || !language) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            UPDATE testimonials
            SET 
                name = @Name, 
                position = @Position, 
                message = @Message, 
                logoUrl = @LogoUrl, 
                language = @Language, 
                updated_at = GETDATE()
            WHERE id = @Id;
        `;

        // Execute the query with bound parameters
        const result = await conn.request()
            .input('Name', sql.NVarChar, name)
            .input('Position', sql.NVarChar, position)
            .input('Message', sql.NVarChar, message)
            .input('LogoUrl', sql.NVarChar, logoUrl)
            .input('Language', sql.NVarChar, language)
            .input('Id', sql.Int, id)
            .query(query);

        // Check if any rows were affected (testimonial exists)
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Testimonial not found' });
        }

        res.json({ message: 'Testimonial updated successfully' });
    } catch (error) {
        console.error('Error updating testimonial:', error);
        res.status(500).json({ message: 'Server error updating testimonial' });
    }
};

// Delete a testimonial
exports.deleteTestimonial = async (req, res) => {
    const { id } = req.params;

    try {
        const conn = await pool;

        // Define the SQL query with parameter placeholders
        const query = `
            DELETE FROM testimonials
            WHERE id = @Id;
        `;

        // Execute the query with bound parameters
        const result = await conn.request()
            .input('Id', sql.Int, id)
            .query(query);

        // Check if any rows were affected (testimonial exists)
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: 'Testimonial not found' });
        }

        res.json({ message: 'Testimonial deleted successfully' });
    } catch (error) {
        console.error('Error deleting testimonial:', error);
        res.status(500).json({ message: 'Server error deleting testimonial' });
    }
};



// Absolute path to translations directory
const translationsDir = path.join(__dirname, '../locales');


// Function to get translation file
exports.getTranslations = (req, res) => {
    const lang = req.params.lang;
    // console.log(translationsDir);

    const filePath = path.join(translationsDir, lang, 'translation.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Translation file not found' });
        }
        res.json(JSON.parse(data));
    });
};


// Function to update translation file
exports.updateTranslations = (req, res) => {
    const lang = req.params.lang;
    const filePath = path.join(translationsDir, lang, 'translation.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).json({ error: 'Translation file not found' });
        }

        // Parse existing translations and merge with updates
        const translations = JSON.parse(data);
        const updates = req.body;
        const updatedTranslations = { ...translations, ...updates };

        // Write updated translations back to file
        fs.writeFile(filePath, JSON.stringify(updatedTranslations, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update translation file' });
            }
            res.json({ message: 'Translation file updated successfully' });
        });
    });
};


exports.fetchSettings = async (req, res) => {

    try {
        // Get the database connection pool
        const conn = await pool;

        // Define and execute the SQL query
        const query = 'SELECT * FROM settings';

        const result = await conn.request().query(query);

        // Return the fetched settings as JSON
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error in fetchSettings:', err);
        res.status(500).json({ message: 'An error occurred while fetching settings' });
    }
};