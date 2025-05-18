# Attendance System Backend

## Deployment Instructions for Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Use the following settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Node Version: 18 or higher

## Environment Variables

Make sure to set these environment variables in your Render dashboard:

- `MONGODB_URI`: Your MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `NODE_ENV`: Set to "production"
- `PORT`: Will be automatically set by Render

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

3. Run development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## API Endpoints

- `GET /`: Welcome message
- `GET /api/test`: API health check
- `/api/auth`: Authentication routes
- `/api/users`: User management
- `/api/classes`: Class management
- `/api/students`: Student management
- `/api/attendance`: Attendance management
- `/api/logs`: System logs
- `/api/reports`: Report generation

## Health Check

The API includes a health check endpoint at `/api/test` that returns the current status and available routes. 