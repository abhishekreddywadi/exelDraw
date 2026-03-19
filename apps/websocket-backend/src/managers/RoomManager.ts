
import { Room } from '../types/websocket.types';
import { userManager } from './UserManager';

export class RoomManager {
    
    private rooms: Map<string, Room> = new Map();

    /**
     * Create a new room
     * @param roomId - Unique room identifier (e.g., slug from database)
     * @param metadata - Optional room metadata
     * @returns The created room
     */
    public createRoom(roomId: string, metadata?: Partial<Room['metadata']>): Room {
        if (this.rooms.has(roomId)) {
            console.log(`Room already exists: ${roomId}`);
            return this.rooms.get(roomId)!;
        }

        const room: Room = {
            roomId,
            members: new Set(),
            metadata: {
                createdAt: new Date(),
                ...metadata,
            },
        };

        this.rooms.set(roomId, room);
        console.log(`Room created: ${roomId}`);
        return room;
    }

    /**
     * Add a user to a room
     * @param userId - The user ID to add
     * @param roomId - The room ID
     * @param socketId - The specific socket joining (for tracking)
     * @returns true if user was added successfully
     */
    public addUserToRoom(userId: number, roomId: string, socketId: string): boolean {
        // Get or create room
        let room = this.rooms.get(roomId);
        if (!room) {
            room = this.createRoom(roomId);
        }

        // Add user to room members
        room.members.add(userId);

        // Update user's room list in their session
        const session = userManager.getUserSession(userId);
        if (session) {
            session.rooms.add(roomId);

            // Also add to the specific socket's room list
            const ws = userManager.getSocket(socketId);
            if (ws) {
                ws.rooms.add(roomId);
            }
        }

        console.log(`User ${userId} joined room: ${roomId}`);
        console.log(` Room ${roomId} now has ${room.members.size} members`);

        // Notify others in the room that user joined
        this.broadcastToRoom(roomId, {
            type: 'presence',
            data: {
                event: 'user_joined',
                userId,
                userEmail: session?.email,
            },
            timestamp: Date.now(),
        }, userId); // Exclude the joining user from receiving their own join event

        return true;
    }

    /**
     * Remove a user from a room
     * @param userId - The user ID to remove
     * @param roomId - The room ID
     * @param socketId - The specific socket leaving
     * @returns true if user was removed, false if user wasn't in room
     */
    public removeUserFromRoom(userId: number, roomId: string, socketId: string): boolean {
        const room = this.rooms.get(roomId);

        if (!room || !room.members.has(userId)) {
            return false;
        }

        // Get the user's session to check if they have other connections in this room
        const session = userManager.getUserSession(userId);
        if (!session) {
            return false;
        }

        // Remove this socket from the room
        const ws = userManager.getSocket(socketId);
        if (ws) {
            ws.rooms.delete(roomId);
        }

        // Check if user has any other connections still in this room
        const hasOtherConnectionsInRoom = Array.from(session.connections.values())
            .some(conn => conn.socketId !== socketId && conn.rooms.has(roomId));

        // Only remove from room members if no connections remain in this room
        if (!hasOtherConnectionsInRoom) {
            room.members.delete(userId);
            session.rooms.delete(roomId);

            console.log(`➖ User ${userId} left room: ${roomId}`);
            console.log(`👥 Room ${roomId} now has ${room.members.size} members`);

            // Notify others in the room
            this.broadcastToRoom(roomId, {
                type: 'presence',
                data: {
                    event: 'user_left',
                    userId,
                },
                timestamp: Date.now(),
            }, userId);

            // Clean up empty rooms
            if (room.members.size === 0) {
                this.rooms.delete(roomId);
                console.log(`🗑️ Empty room deleted: ${roomId}`);
            }
        } else {
            console.log(`🔄 User ${userId} has other connections in room ${roomId}, keeping membership`);
        }

        return true;
    }

    /**
     * Remove a user from all rooms (when disconnecting)
     * @param userId - The user ID
     * @param socketId - The specific socket disconnecting
     */
    public removeUserFromAllRooms(userId: number, socketId: string): void {
        const session = userManager.getUserSession(userId);
        if (!session) {
            return;
        }

        // Get rooms this specific socket is in
        const ws = userManager.getSocket(socketId);
        if (!ws) {
            return;
        }

        // Remove from each room this socket was in
        const rooms = Array.from(ws.rooms);
        for (const roomId of rooms) {
            this.removeUserFromRoom(userId, roomId, socketId);
        }
    }

    /**
     * Broadcast a message to all members of a room
     * @param roomId - The room ID
     * @param message - The message to broadcast
     * @param excludeUserId - Optional: user ID to exclude from receiving the message
     * @returns Number of users the message was sent to
     */
    public broadcastToRoom(roomId: string, message: any, excludeUserId?: number): number {
        const room = this.rooms.get(roomId);

        if (!room || room.members.size === 0) {
            return 0;
        }

        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        let sentCount = 0;

        // Send to each member in the room
        for (const userId of room.members) {
            // Skip excluded user (usually the sender)
            if (excludeUserId !== undefined && userId === excludeUserId) {
                continue;
            }

            // Send to all of the user's connections
            if (userManager.sendToUser(userId, messageStr)) {
                sentCount++;
            }
        }

        return sentCount;
    }

    /**
     * Get all rooms a user is currently in
     * @param userId - The user ID
     * @returns Array of room IDs
     */
    public getUserRooms(userId: number): string[] {
        const session = userManager.getUserSession(userId);
        return session ? Array.from(session.rooms) : [];
    }

    /**
     * Get all members of a room
     * @param roomId - The room ID
     * @returns Array of user IDs in the room, or undefined if room doesn't exist
     */
    public getRoomMembers(roomId: string): number[] | undefined {
        const room = this.rooms.get(roomId);
        return room ? Array.from(room.members) : undefined;
    }

    /**
     * Get room information
     * @param roomId - The room ID
     * @returns The room object or undefined
     */
    public getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    /**
     * Check if a user is in a room
     * @param userId - The user ID
     * @param roomId - The room ID
     * @returns true if user is in the room
     */
    public isUserInRoom(userId: number, roomId: string): boolean {
        const room = this.rooms.get(roomId);
        return room ? room.members.has(userId) : false;
    }

    /**
     * Get all active rooms
     * @returns Array of room IDs
     */
    public getAllRooms(): string[] {
        return Array.from(this.rooms.keys());
    }

    /**
     * Get statistics about rooms
     */
    public getStats() {
        return {
            totalRooms: this.rooms.size,
            rooms: Array.from(this.rooms.entries()).map(([id, room]) => ({
                roomId: id,
                memberCount: room.members.size,
                members: Array.from(room.members),
            })),
        };
    }
}

// Export singleton instance
export const roomManager = new RoomManager();
