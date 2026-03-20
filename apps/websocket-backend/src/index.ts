
import "dotenv/config";
import { WebSocketServer } from "ws";
import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';

import { userManager } from './managers/UserManager';
import { roomManager } from './managers/RoomManager';
import { AuthenticatedWebSocket, WebSocketMessage } from './types/websocket.types';

import { prisma } from '@repo/db';

// Configuration
const WS_PORT = 8080;
const JWT_SECRET = "MY_SECRET_JWT_TOKEN";

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

console.log(`WebSocket server running on ws://localhost:${WS_PORT}`);


wss.on('connection', (ws: any, request: IncomingMessage) => {
  
    ws.on("error", console.error);

    // Get the request URL
    const url = request.url;

    if (!url) {
        console.log('Connection rejected: No URL provided');
        ws.close(1008, 'No URL provided');
        return;
    }

    try {
        // Extract and verify token from query params: ws://localhost:8080?token=XXX
        const queryParams = new URLSearchParams(url.split("?")[1]);
        const token = queryParams.get('token');

        if (!token) {
            console.log('❌ Connection rejected: No token provided');
            ws.close(1008, 'No token provided');
            return;
        }

        // Verify JWT token
        const userToken = jwt.verify(token, JWT_SECRET) as { userId: number; userEmail: string };

        if (!userToken?.userId) {
            console.log('❌ Connection rejected: Invalid token');
            ws.close(1008, 'Invalid token');
            return;
        }

        // Generate unique socket ID for this connection
        const socketId = uuidv4();

        // authenticated WebSocket with all required properties
        const authenticatedWs: AuthenticatedWebSocket = Object.assign(ws, {
            userId: userToken.userId,
            userEmail: userToken.userEmail,
            socketId,
            rooms: new Set<string>(),
            connectedAt: new Date(),
            lastActivity: new Date(),
        });

        // Register connection with UserManager
        userManager.addConnection(authenticatedWs);

        // Send welcome message to the client
        sendToSocket(authenticatedWs, {
            type: 'presence',
            data: {
                event: 'connected',
                socketId,
                userId: userToken.userId,
                message: 'Successfully connected to WebSocket server',
            },
            timestamp: Date.now(),
        });

        // ============================================================================
        // MESSAGE HANDLING
        // ============================================================================

        ws.on("message", async (data: Buffer) => {
            // Update activity timestamp
            authenticatedWs.lastActivity = new Date();
            userManager.updateActivity(authenticatedWs.userId);

            try {
                // Parse incoming message
                const message: WebSocketMessage = JSON.parse(data.toString());
                console.log(`📨 Received from user ${authenticatedWs.userId}:`, message.type);

                // Add sender info to message
                message.senderId = authenticatedWs.userId;

                // Route message based on type (async for database operations)
                await handleMessage(authenticatedWs, message);

            } catch (error) {
                console.error('❌ Error parsing message:', error);
                sendError(authenticatedWs, 'Invalid message format');
            }
        });

        // ============================================================================
        // DISCONNECTION HANDLING
        // ============================================================================

        ws.on("close", () => {
            console.log(`🔌 User disconnected: ${authenticatedWs.userEmail} (ID: ${authenticatedWs.userId}, Socket: ${socketId})`);

            // Remove user from all rooms
            roomManager.removeUserFromAllRooms(authenticatedWs.userId, socketId);

            // Remove connection from user manager
            const sessionEnded = userManager.removeConnection(socketId);

            if (sessionEnded) {
                console.log(`👋 User session ended: ${authenticatedWs.userEmail}`);
            }

            // Log current stats
            const stats = userManager.getStats();
            console.log(`📊 Stats - Users: ${stats.currentUsers}, Connections: ${stats.currentConnections}`);
        });

        // ============================================================================
        // PING/PONG FOR KEEP-ALIVE
        // ============================================================================

        ws.on("pong", () => {
            // Update activity when we receive a pong
            authenticatedWs.lastActivity = new Date();
        });

    } catch (error) {
        console.log('❌ Connection rejected: Token verification failed');
        console.error(error);
        ws.close(1008, 'Authentication failed');
        return;
    }
});

// ============================================================================
// MESSAGE ROUTER
// ============================================================================

/**
 * Route incoming messages based on type
 * @param ws - The authenticated WebSocket
 * @param message - The parsed message
 */
async function handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
        case 'join_room':
            handleJoinRoom(ws, message);
            break;

        case 'leave_room':
            handleLeaveRoom(ws, message);
            break;

        case 'chat':
            await handleChatMessage(ws, message);
            break;

        case 'typing':
            handleTypingIndicator(ws, message);
            break;

        case 'presence':
            handlePresence(ws, message);
            break;

        default:
            console.warn(`⚠️ Unknown message type: ${message.type}`);
            sendError(ws, `Unknown message type: ${message.type}`);
    }
}

// ============================================================================
// MESSAGE HANDLERS
// ============================================================================

/**
 * Handle user joining a room
 * Expected format: { type: 'join_room', room: 'room-id' }
 */
function handleJoinRoom(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        sendError(ws, 'Room ID is required');
        return;
    }

    roomManager.addUserToRoom(ws.userId, roomId, ws.socketId);

    // Confirm to user they joined the room
    sendToSocket(ws, {
        type: 'presence',
        data: {
            event: 'joined_room',
            room: roomId,
        },
        timestamp: Date.now(),
    });
}

/**
 * Handle user leaving a room
 * Expected format: { type: 'leave_room', room: 'room-id' }
 */
function handleLeaveRoom(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        sendError(ws, 'Room ID is required');
        return;
    }

    roomManager.removeUserFromRoom(ws.userId, roomId, ws.socketId);

    // Confirm to user they left the room
    sendToSocket(ws, {
        type: 'presence',
        data: {
            event: 'left_room',
            room: roomId,
        },
        timestamp: Date.now(),
    });
}

/**
 * Handle chat messages
 * Expected format: { type: 'chat', room: 'room-id', data: { message: '...' } }
 *
 * This handler:
 * 1. Validates the room and user membership
 * 2. Saves the message to the database
 * 3. Broadcasts the message to all room members
 */
async function handleChatMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const roomId = message.room;
    const messageContent = message.data?.message;

    if (!roomId) {
        sendError(ws, 'Room ID is required for chat messages');
        return;
    }

    if (!messageContent) {
        sendError(ws, 'Message content is required');
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        sendError(ws, 'You are not in this room');
        return;
    }

    // Generate a temporary chat ID (will be replaced by DB ID)
    const tempChatId = Date.now();

    // Broadcast immediately to everyone in the room (instant feedback)
    const sentCount = roomManager.broadcastToRoom(roomId, {
        type: 'chat',
        room: roomId,
        data: {
            chatId: tempChatId,
            message: messageContent,
            senderId: ws.userId,
            senderEmail: ws.userEmail,
            timestamp: Date.now(),
        },
        timestamp: Date.now(),
    });

    console.log(`Chat message sent to ${sentCount} users in room ${roomId}`);

    // Save to database in background (non-blocking)
    prisma.room.findUnique({
        where: { slug: roomId },
    }).then(room => {
        if (room) {
            return prisma.chat.create({
                data: {
                    message: messageContent,
                    userId: ws.userId,
                    RoomId: room.Id,
                },
            });
        }
    }).then(savedChat => {
        console.log(`💾 Chat saved to database (ID: ${savedChat?.Id})`);
    }).catch(error => {
        console.error('❌ Error saving chat to database:', error);
    });
}

/**
 * Handle typing indicators
 * Expected format: { type: 'typing', room: 'room-id', data: { isTyping: true } }
 */
function handleTypingIndicator(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        return;
    }

    // Broadcast typing status to room (exclude sender)
    roomManager.broadcastToRoom(roomId, {
        type: 'typing',
        room: roomId,
        data: {
            userId: ws.userId,
            userEmail: ws.userEmail,
            ...message.data,
        },
        timestamp: message.timestamp,
    }, ws.userId); // Exclude sender
}

/**
 * Handle presence updates
 */
function handlePresence(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    // Handle custom presence events
    console.log(`👤 Presence update from user ${ws.userId}:`, message.data);
}

// ============================================================================
// EXCEL DRAW CANVAS MESSAGE HANDLERS
// ============================================================================

/**
 * Handle canvas cell updates
 * Expected format: { type: 'canvas_update', room: 'room-id', data: { cell: {...}, userId: number } }
 * Broadcasts cell updates to all users in the room
 */
function handleCanvasUpdate(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        sendError(ws, 'Room ID is required for canvas updates');
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        sendError(ws, 'You are not in this room');
        return;
    }

    // Broadcast canvas update to all room members (including sender for consistency)
    const sentCount = roomManager.broadcastToRoom(roomId, {
        type: 'canvas_update',
        room: roomId,
        data: message.data,
        timestamp: Date.now(),
    });

    console.log(`🎨 Canvas update sent to ${sentCount} users in room ${roomId}`);
}

/**
 * Handle cursor movement for real-time collaboration
 * Expected format: { type: 'cursor_move', room: 'room-id', data: { userId, userEmail, row, col } }
 * Broadcasts cursor position to all users in the room (except sender)
 */
function handleCursorMove(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        return;
    }

    // Broadcast cursor position to room members (exclude sender)
    roomManager.broadcastToRoom(roomId, {
        type: 'cursor_move',
        room: roomId,
        data: message.data,
        timestamp: Date.now(),
    }, ws.userId); // Exclude sender
}

/**
 * Handle drawing operations
 * Expected format: { type: 'draw', room: 'room-id', data: { x, y, color, size, userId } }
 * Saves drawing to database and broadcasts to all users in the room (except sender)
 */
async function handleDraw(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    const roomId = message.room;
    const drawData = message.data;

    if (!roomId || !drawData) {
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        return;
    }

    try {
        // Get the room's database ID
        const room = await prisma.room.findUnique({
            where: { slug: roomId },
        });

        if (!room) {
            return;
        }

        // Save drawing to database
        const savedDrawing = await prisma.drawing.create({
            data: {
                x: drawData.x,
                y: drawData.y,
                color: drawData.color,
                size: drawData.size,
                userId: ws.userId,
                RoomId: room.Id,
            },
        });

        console.log(`🎨 Drawing saved to database (ID: ${savedDrawing.Id})`);

        // Broadcast drawing to room members (exclude sender - they already see it)
        const sentCount = roomManager.broadcastToRoom(roomId, {
            type: 'draw',
            room: roomId,
            data: {
                ...drawData,
                drawingId: savedDrawing.Id,
            },
            timestamp: Date.now(),
        }, ws.userId); // Exclude sender

        console.log(`Drawing sent to ${sentCount} users in room ${roomId}`);

    } catch (error) {
        console.error('❌ Error saving drawing to database:', error);
    }
}

/**
 * Handle cell style updates
 * Expected format: { type: 'cell_style_update', room: 'room-id', data: { cell: {...}, userId: number } }
 * Broadcasts style changes to all users in the room
 */
function handleCellStyleUpdate(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        sendError(ws, 'Room ID is required for style updates');
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        sendError(ws, 'You are not in this room');
        return;
    }

    // Broadcast style update to all room members
    const sentCount = roomManager.broadcastToRoom(roomId, {
        type: 'cell_style_update',
        room: roomId,
        data: message.data,
        timestamp: Date.now(),
    });

    console.log(`🎨 Style update sent to ${sentCount} users in room ${roomId}`);
}

/**
 * Handle canvas clear operation
 * Expected format: { type: 'canvas_clear', room: 'room-id', data: { userId: number } }
 * Broadcasts clear command to all users in the room
 */
function handleCanvasClear(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    const roomId = message.room;

    if (!roomId) {
        sendError(ws, 'Room ID is required for canvas clear');
        return;
    }

    // Check if user is in the room
    if (!roomManager.isUserInRoom(ws.userId, roomId)) {
        sendError(ws, 'You are not in this room');
        return;
    }

    // Broadcast clear command to all room members
    const sentCount = roomManager.broadcastToRoom(roomId, {
        type: 'canvas_clear',
        room: roomId,
        data: message.data,
        timestamp: Date.now(),
    });

    console.log(`🗑️ Canvas clear sent to ${sentCount} users in room ${roomId}`);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Send a message to a specific socket
 */
function sendToSocket(ws: AuthenticatedWebSocket, message: any): void {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

/**
 * Send an error message to a client
 */
function sendError(ws: AuthenticatedWebSocket, errorMessage: string): void {
    sendToSocket(ws, {
        type: 'error',
        data: {
            message: errorMessage,
        },
        timestamp: Date.now(),
    });
}

// ============================================================================
// PERIODIC CLEANUP TASK
// ============================================================================

/**
 * Run periodic cleanup of stale connections
 * Checks for connections inactive for more than 5 minutes
 */
setInterval(() => {
    userManager.cleanupStaleConnections(5 * 60 * 1000);
}, 60 * 1000); // Check every minute

// ============================================================================
// MONITORING ENDPOINT (optional - for health checks)
// ============================================================================

/**
 * Get server statistics
 * Call this to monitor server health
 */
export function getServerStats() {
    return {
        websocket: {
            port: WS_PORT,
            uptime: process.uptime(),
        },
        users: userManager.getStats(),
        rooms: roomManager.getStats(),
    };
}

// Log stats every 30 seconds for monitoring
setInterval(() => {
    const stats = getServerStats();
    console.log(`📊 Server Stats - Users: ${stats.users.currentUsers}, Connections: ${stats.users.currentConnections}, Rooms: ${stats.rooms.totalRooms}`);
}, 30000);
