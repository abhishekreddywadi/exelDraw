/**
 * Get Room Drawings Controller
 * Fetches all drawing data for a room by slug
 */

import { Request, Response } from 'express';
import { prisma } from '@repo/db';

/**
 * GET /rooms/:slug/drawings
 * Get all drawings for a room by slug
 * Requires authentication (userMiddleware)
 */
export const getRoomDrawings = async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;

        // Find the room by slug
        const room = await prisma.room.findUnique({
            where: { slug },
        });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Get all drawings for this room
        const drawings = await prisma.drawing.findMany({
            where: { RoomId: room.Id },
            orderBy: { Id: 'asc' },
        });

        return res.json(drawings);
    } catch (error) {
        console.error('Error fetching room drawings:', error);
        return res.status(500).json({ message: 'Failed to fetch drawings' });
    }
};
