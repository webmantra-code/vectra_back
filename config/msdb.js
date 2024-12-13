const sql = require('msnodesqlv8');

// Define the connection string for your SQL Server instance
const connectionString = 'Driver={SQL Server};Server={DESKTOP-6QK4C55\\MSSQLSERVER01};Database={vectra_db};Trusted_Connection=Yes;Encrypt=no;TrustServerCertificate=no;';

// Create a function to open a connection
const pool = {
    getConnection: () => {
        return new Promise((resolve, reject) => {
            sql.open(connectionString, (err, conn) => {
                if (err) {
                    reject(err); // Handle error
                } else {
                    resolve(conn); // Successfully connected
                }
            });
        });
    }
};

module.exports = pool;
