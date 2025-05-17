// Default JWT secret for development (change in production)
const DEFAULT_JWT_SECRET = 'your_secure_jwt_secret_key_here';

export const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

export const PORT = process.env.PORT || 5000;
export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_db'; 