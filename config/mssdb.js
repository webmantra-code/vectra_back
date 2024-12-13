const sql = require('mssql');

// Database configuration
const dbConfig = {
    user: 'mantra',
    password: 'Sq587T?vY!9426o1',
    server: 'vectra-react-srv.database.windows.net',
    database: 'vectra', // Replace with your database name
    options: {
        encrypt: true, // For Azure databases, encryption is required
        enableArithAbort: true
    }
};

// Create and export a connection pool
const pool = new sql.ConnectionPool(dbConfig);
// const poolConnect = pool.connect()
//     .then(() => {
//         console.log('Connected to the database successfully!');
//         return pool;
//     })
//     .catch(err => {
//         console.error('Database connection failed:', err.message);
//         process.exit(1); // Exit the process if connection fails
//     });

module.exports = { pool, sql };
