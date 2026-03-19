/**
 * WebSocket Types and Interfaces
 *
 * This file defines all the types used in the WebSocket server.
 * Having types in a separate file makes the code more maintainable.
 */

import { WebSocket } from "ws";

/**
 * Extended WebSocket interface with user properties attached
 */
export interface AuthenticatedWebSocket extends WebSocket {
    /** Unique user ID from the database */
    userId: number;
    /** User's email address */
    userEmail: string;
    /** Unique socket ID for this connection (supports multiple connections per user) */
    socketId: string;
    /** Room IDs this user has joined */
    rooms: Set<string>;
    /** When this connection was established */
    connectedAt: Date;
    /** Last activity timestamp for heartbeat/timeout tracking */
    lastActivity: Date;
}

/**
 * User session data - tracks all connections for a single user
 * (A user can have multiple connections - e.g., browser + mobile app)
 */
export interface UserSession {
    /** The user's unique ID */
    userId: number;
    /** The user's email */
    email: string;
    /** All active socket connections for this user (keyed by socketId) */
    connections: Map<string, AuthenticatedWebSocket>;
    /** Rooms this user has joined across all connections */
    rooms: Set<string>;
    /** When the user first connected */
    firstConnectedAt: Date;
    /** Last activity across all connections */
    lastActivity: Date;
}

/**
 * Message format for WebSocket communications
 */
export interface WebSocketMessage {
    /** Message type - determines how the message is handled */
    type: 'chat' | 'join_room' | 'leave_room' | 'presence' | 'typing' | 'custom';
    /** The room this message is for (optional - for direct messages) */
    room?: string;
    /** The actual message payload */
    data: any;
    /** Timestamp when message was sent */
    timestamp: number;
    /** Sender's user ID (added by server) */
    senderId?: number;
}

/**
 * Room data structure
 */
export interface Room {
    /** Unique room identifier (slug) */
    roomId: string;
    /** User IDs currently in this room */
    members: Set<number>;
    /** Room metadata */
    metadata?: {
        name?: string;
        createdAt: Date;
        [key: string]: any;
    };
}
