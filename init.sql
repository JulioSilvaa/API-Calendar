-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_tokens table with encrypted fields
CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    access_token BYTEA NOT NULL,
    refresh_token BYTEA NOT NULL,
    scope TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tokens_email ON user_tokens(email);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on users email
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_tokens_updated_at 
    BEFORE UPDATE ON user_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically update users updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (optional, adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE user_tokens TO api_calendar_user;
-- GRANT USAGE, SELECT ON SEQUENCE user_tokens_id_seq TO api_calendar_user;
