import { Request, Response, NextFunction } from "express";
import jwt from 'jsonwebtoken'

// Extend Express Request type to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: number;
        }
    }
}

// Middleware to verify JWT token and authenticate user
export const userMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Get authorization header
    const authHeader = req.headers["authorization"];

    // Check if authorization header exists
    if (!authHeader) {
        return res.status(401).json({
            message: "No authorization header provided"
        });
    }

    // Extract token from "Bearer <token>" format
    const token = authHeader.split(" ")[1];

    // Check if token exists after splitting
    if (!token) {
        return res.status(401).json({
            message: "No token provided"
        });
    }

    try {
        // Verify the JWT token
        const userDecoded = jwt.verify(token, "MY_SECRET_JWT_TOKEN") as { userId: number };

        // Attach userId to request object
        req.userId = userDecoded.userId;

        // Proceed to next middleware/route handler
        next();
    } catch (error) {
        // Handle invalid token errors
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}