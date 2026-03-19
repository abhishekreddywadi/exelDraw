/**
 * UserManager - Scalable User Connection Management
 *
 * This class handles:
 * - Tracking all connected users with O(1) lookups
 * - Supporting multiple connections per user
 * - Efficient broadcasting to specific users
 * - Connection cleanup and state management
 *
 * SCALABILITY NOTES:
 * - Uses Map for O(1) average time complexity for lookups
 * - Supports multiple connections per user (browser + mobile)
 * - For horizontal scaling, integrate Redis for pub/sub
 */

import { AuthenticatedWebSocket, UserSession } from '../types/websocket.types';

export class UserManager {

    private users: Map<number, UserSession> = new Map();

    private socketToUser: Map<string, number> = new Map();

    private sockets: Map<string, AuthenticatedWebSocket> = new Map();

    private stats = {
        totalConnections: 0,
        totalUsers: 0,
        totalMessages: 0,
    };

    public addConnection(ws: AuthenticatedWebSocket): boolean {
        const { userId, userEmail, socketId } = ws;

        // Check if user already has an active session
        let session = this.users.get(userId);

        if (!session) {
            // Create new session for first-time connection
            session = {
                userId,
                email: userEmail,
                connections: new Map(),
                rooms: new Set(),
                firstConnectedAt: new Date(),
                lastActivity: new Date(),
            };
            this.users.set(userId, session);
            this.stats.totalUsers++;
            console.log(`✅ New user session created: ${userEmail} (ID: ${userId})`);
        } else {
            console.log(`🔄 User reconnected: ${userEmail} (ID: ${userId}, connections: ${session.connections.size + 1})`);
        }

        // Add this connection to the user's session
        session.connections.set(socketId, ws);
        session.lastActivity = new Date();

        // Update mapping tables
        this.socketToUser.set(socketId, userId);
        this.sockets.set(socketId, ws);

        this.stats.totalConnections++;

        // Log connection stats
        console.log(`Connection stats - Total users: ${this.stats.totalUsers}, Total connections: ${this.stats.totalConnections}`);

        return true;
    }

    /**
     * Remove a specific connection (disconnect one socket)
     * @param socketId - The unique socket ID to remove
     * @returns true if user session should be cleaned up (no more connections)
     */
    public removeConnection(socketId: string): boolean {
        const userId = this.socketToUser.get(socketId);

        if (!userId) {
            console.warn(`⚠️ Socket ${socketId} not found in tracking`);
            return false;
        }

        const session = this.users.get(userId);
        if (!session) {
            return false;
        }

        // Remove this specific connection
        session.connections.delete(socketId);
        this.socketToUser.delete(socketId);
        this.sockets.delete(socketId);
        this.stats.totalConnections--;

        console.log(` Connection removed: Socket ${socketId} (User: ${session.email}, remaining: ${session.connections.size})`);

        // Check if user has no more connections
        if (session.connections.size === 0) {
            // Clean up the entire user session
            this.users.delete(userId);
            this.stats.totalUsers--;
            console.log(`👋 User session ended: ${session.email} (ID: ${userId})`);
            return true; // Signal that user session is fully disconnected
        }

        return false;
    }


    public getUserSession(userId: number): UserSession | undefined {
        return this.users.get(userId);
    }


    public getSocket(socketId: string): AuthenticatedWebSocket | undefined {
        return this.sockets.get(socketId);
    }


    public getUserConnections(userId: number): AuthenticatedWebSocket[] {
        const session = this.users.get(userId);
        return session ? Array.from(session.connections.values()) : [];
    }

    /**
     * Send a message to all connections of a specific user
     * Useful for when user has multiple devices connected
     * @param userId - The user ID to send message to
     * @param message - The message to send (will be JSON stringified)
     */
    public sendToUser(userId: number, message: any): boolean {
        const connections = this.getUserConnections(userId);

        if (connections.length === 0) {
            return false;
        }

        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

        for (const ws of connections) {
            if (ws.readyState === ws.OPEN) {
                ws.send(messageStr);
            }
        }

        return true;
    }

    /**
     * Send a message to a specific socket
     * @param socketId - The socket ID to send to
     * @param message - The message to send
     */
    public sendToSocket(socketId: string, message: any): boolean {
        const ws = this.sockets.get(socketId);

        if (!ws || ws.readyState !== ws.OPEN) {
            return false;
        }

        ws.send(typeof message === 'string' ? message : JSON.stringify(message));
        return true;
    }

    /**
     * Get all currently connected user IDs
     * @returns Array of all user IDs with active connections
     */
    public getAllConnectedUserIds(): number[] {
        return Array.from(this.users.keys());
    }

    /**
     * Get total number of unique users
     */
    public getUserCount(): number {
        return this.users.size;
    }

    /**
     * Get total number of connections (including multiple per user)
     */
    public getConnectionCount(): number {
        return this.sockets.size;
    }

    /**
     * Update user's last activity timestamp
     * @param userId - The user ID
     */
    public updateActivity(userId: number): void {
        const session = this.users.get(userId);
        if (session) {
            session.lastActivity = new Date();
        }
    }

    /**
     * Get current statistics
     */
    public getStats() {
        return {
            ...this.stats,
            currentUsers: this.users.size,
            currentConnections: this.sockets.size,
        };
    }

    /**
     * Clean up stale connections (heartbeat check)
     * Call this periodically to remove dead connections
     * @param timeoutMs - Timeout in milliseconds (default: 5 minutes)
     */
    public cleanupStaleConnections(timeoutMs: number = 5 * 60 * 1000): void {
        const now = Date.now();
        const staleSockets: string[] = [];

        for (const [socketId, ws] of this.sockets) {
            // Check if connection is stale
            const lastActivity = ws.lastActivity.getTime();
            if (now - lastActivity > timeoutMs) {
                staleSockets.push(socketId);
            }
        }

        // Remove stale connections
        for (const socketId of staleSockets) {
            console.log(`Cleaning up stale connection: ${socketId}`);
            const ws = this.sockets.get(socketId);
            if (ws) {
                ws.terminate();
            }
            this.removeConnection(socketId);
        }

        if (staleSockets.length > 0) {
            console.log(`Cleaned up ${staleSockets.length} stale connections`);
        }
    }
}

// Export singleton instance
export const userManager = new UserManager();
