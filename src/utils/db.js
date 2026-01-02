import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'api_calendar',
  user: process.env.DB_USER || 'api_calendar_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  query_timeout: 5000,
});

// Graceful shutdown
if (process.env.NODE_ENV !== 'test') {
    process.on('SIGTERM', async () => {
        await pool.end();
        console.log('✓ Database connection pool closed (SIGTERM)');
        process.exit(0);
    });

    process.on('SIGINT', async () => {
        await pool.end();
        console.log('✓ Database connection pool closed (SIGINT)');
        process.exit(0);
    });
}

export default pool;
