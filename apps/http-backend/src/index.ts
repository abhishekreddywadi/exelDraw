// Load environment variables from .env file
import "dotenv/config";
import express from "express";
import userRoutes from './routes/userRoutes/userRoutes';
import roomRoutes from './routes/roomRoutes/roomRoutes';
import { userMiddleware } from "./middleware/userMiddleware";
import cors from 'cors';

const app = express();

// Enable CORS for all routes (configure for production later)
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
}));

// Parse JSON request bodies
app.use(express.json());

// Mount the user routes (no auth required for signin/signup)
app.use('/users', userRoutes);

// Mount the room routes (authentication required)
app.use('/rooms', userMiddleware, roomRoutes);

// Start the HTTP server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`HTTP server running on http://localhost:${PORT}`);
});
