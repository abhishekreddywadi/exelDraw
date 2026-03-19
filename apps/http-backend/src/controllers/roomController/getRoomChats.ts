/**
 * Get Room Chats Controller
 * Fetches all chat messages for a specific room
 */

import { Request, Response } from 'express';
import { prisma } from '@repo/db';

/**
 * Get all chat messages for a room by slug
 * @param req - Express request with room slug in params
 * @param res - Express response
 */
export const getRoomChats = async (req: Request, res: Response) => {
    const { slug } = req.params;

    try {
        console.log(`📨 Fetching chats for room: ${slug}`);

        // Find the room by slug
        const room = await prisma.room.findUnique({
            where: { slug },
        });

        if (!room) {
            console.log(`❌ Room not found: ${slug}`);
            return res.status(404).json({
                message: 'Room not found'
            });
        }

        console.log(`✅ Found room: ${room.Id} (${room.slug})`);

        // Get all chats for this room with user info
        const chats = await prisma.chat.findMany({
            where: {
                RoomId: room.Id,
            },
            include: {
                User: {
                    select: {
                        email: true,
                    },
                },
            },
            orderBy: {
                Id: 'asc', // Order by ID to get chronological order
            },
        });

        console.log(`📝 Found ${chats.length} chats for room ${slug}`);
        if (chats.length > 0) {
            console.log('First chat:', chats[0]);
        }

        return res.json(chats);

    } catch (error) {
        console.error('❌ Error fetching room chats:', error);
        return res.status(500).json({
            message: 'Failed to fetch chats'
        });
    }
};
