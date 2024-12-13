// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
// const pool = require('./config/msdb');
const { pool, sql } = require('./config/mssdb');

// Load environment variables
dotenv.config();

// Import routes
const contactRoutes = require('./routes/contact');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const blogRoutes = require('./routes/blogs');
const serviceRoutes = require('./routes/services');
const adminRoutes = require('./routes/admin'); // Import admin routes
const uploadRoutes = require('./routes/upload'); 
const translationRoutes = require('./routes/translationRoutes');
const  testimonials  = require('./routes/testimonialRoutes');
const settingsRoutes = require('./routes/settings');


const app = express();
const port = process.env.PORT || 4000;

// Middleware
const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173', '*'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the API' });
});


app.get('/test-connection1', async (req, res) => {
    try {
        const conn = await pool.connect();
        const result = await conn.request().query('SELECT 1 AS Test');
        res.status(200).json({ message: 'Database connection successful!', result: result.recordset });
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// Test the database connection with an example query
app.get('/test-connection', async (req, res) => {
    try {
        const conn = await pool.getConnection();
        conn.query('SELECT 1 AS Test', (err, result) => {
            if (err) {
                res.status(500).json({ error: 'Error executing test query' });
            } else {
                res.status(200).json({ message: 'Database connection successful!', result });
            }
        });
    } catch (err) {
        console.error('Database connection failed:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});


// Routes
app.use('/api', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/testimonials', testimonials);
app.use('/api', uploadRoutes); // Register upload routes
app.use('/uploads', express.static('uploads'));
app.use('/api/admin', adminRoutes); // Use admin routes
app.use('/api/settings', settingsRoutes);
// Register translation routes
app.use('/translations', translationRoutes);

// Start server after DB connection
const startServer = async () => {
    try {
        await pool.connect();
        console.log('Database connected successfully!');
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to connect to the database:', err.message);
        process.exit(1);
    }
};

startServer();