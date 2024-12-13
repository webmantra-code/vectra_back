// backend/controllers/authController.js
// const pool = require('../config/msdb');
const { pool, sql } = require('../config/mssdb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Register a new user (optional)
exports.register = async (req, res) => {
    const { username, email, password, is_admin } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    try {
        // Get a connection from the pool
        const conn = await pool.getConnection();

        // Check if user already exists
        conn.query('SELECT * FROM users WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ error: 'Database query error' });
            }

            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'User already exists' });
            }

            // Hash the password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Insert the new user into the database
            conn.query(
                'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
                [username, email, hashedPassword, is_admin || false],
                (err, result) => {
                    if (err) {
                        console.error('Error inserting user:', err);
                        return res.status(500).json({ error: 'Failed to register user' });
                    }
                    res.status(201).json({ message: 'User registered successfully' });
                }
            );
        });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ message: 'Server error during registration' });
    }
};

// Login user
exports.login = async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        // Connect to the database
        const conn = await pool.connect();

        // Query to check if the user exists with parameter binding
        const query = 'SELECT * FROM users WHERE email = @Email';
        const result = await conn.request()
            .input('Email', sql.NVarChar, email) // Bind email as an NVarChar parameter
            .query(query);

        // If user does not exist
        if (result.recordset.length === 0) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const user = result.recordset[0];

        // Compare the provided password with the stored hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT payload
        const payload = {
            id: user.id,
            username: user.username,
            email: user.email,
            is_admin: user.is_admin // Include admin status
        };

        // Sign JWT token
        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });

        // Send the token and admin status back to the client
        res.json({ token, is_admin: user.is_admin });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Server error during login' });
    }
};


// Logout user (Optional - since JWT is stateless, logout can be handled on the client side by deleting the token)
const blacklist = new Set(); 
exports.logout = (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(400).json({ message: 'Token is required for logout' });
    }

    // Add token to the blacklist
    blacklist.add(token);

    res.json({ message: 'User logged out successfully' });
};
