/**
 * TypeScript types for the frontend application
 * Defines all the data structures used throughout the app
 */

// ============================================
// AUTH TYPES
// ============================================

/**
 * User credentials for sign in / sign up
 */
export interface AuthCredentials {
    userName: string;
    password: string;
}

/**
 * Response from signup/signin API
 */
export interface AuthResponse {
    token?: string;
    jsonToken?: string;
    userId?: number;
    message?: string;
}

/**
 * User session data stored in localStorage
 */
export interface UserSession {
    token: string;
    userId: number;
    email: string;
}

// ============================================
// ROOM TYPES
// ============================================

/**
 * Data to create a new room
 */
export interface CreateRoomData {
    slug: string;
    userId: number;
}

/**
 * Response when a room is created
 */
export interface CreateRoomResponse {
    roomId: number;
    message?: string;
}

/**
 * Room information
 */
export interface Room {
    Id: number;
    slug: string;
    authorId: number;
}

// ============================================
// CHAT TYPES
// ============================================

/**
 * Chat message from database
 */
export interface ChatMessage {
    Id: number;
    message: string;
    userId: number;
    RoomId: number;
    createdAt?: string;
    User?: {
        email: string;
    };
}

/**
 * Drawing from database
 */
export interface DrawingMessage {
    Id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    userId: number;
    RoomId: number;
    createdAt?: string;
}

/**
 * WebSocket message types
 */
export type WSMessageType = 'chat' | 'join_room' | 'leave_room' | 'presence' | 'typing' | 'error' | 'canvas_update' | 'cursor_move' | 'draw' | 'cell_style_update' | 'canvas_clear';

/**
 * Base WebSocket message structure
 */
export interface WSMessage {
    type: WSMessageType;
    room?: string;
    data: any;
    timestamp: number;
    senderId?: number;
    senderEmail?: string;
}

/**
 * Chat message received via WebSocket
 */
export interface WSChatMessage extends WSMessage {
    type: 'chat';
    data: {
        chatId: number;
        message: string;
        senderId: number;
        senderEmail: string;
        timestamp: number;
    };
}

/**
 * Presence message (user joined/left)
 */
export interface WSPresenceMessage extends WSMessage {
    type: 'presence';
    data: {
        event: 'user_joined' | 'user_left' | 'connected' | 'joined_room' | 'left_room';
        userId?: number;
        userEmail?: string;
        room?: string;
        message?: string;
        socketId?: string;
    };
}

/**
 * Typing indicator message
 */
export interface WSTypingMessage extends WSMessage {
    type: 'typing';
    data: {
        userId: number;
        userEmail: string;
        isTyping: boolean;
    };
}

/**
 * Error message from WebSocket
 */
export interface WSErrorMessage extends WSMessage {
    type: 'error';
    data: {
        message: string;
    };
}

// ============================================
// EXCEL DRAW CANVAS TYPES
// ============================================

/**
 * Cell data structure for a single cell
 */
export interface Cell {
    row: number;
    col: number;
    value: string | number;
    formula?: string;
    style?: CellStyle;
}

/**
 * Styling options for cells
 */
export interface CellStyle {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
}

/**
 * Cursor position for real-time collaboration
 */
export interface Cursor {
    userId: number;
    userEmail: string;
    row: number;
    col: number;
    color: string;
}

/**
 * Canvas cell update message
 */
export interface WSCanvasUpdateMessage extends WSMessage {
    type: 'canvas_update';
    data: {
        cell: Cell;
        userId: number;
    };
}

/**
 * Cursor move message
 */
export interface WSCursorMoveMessage extends WSMessage {
    type: 'cursor_move';
    data: {
        userId: number;
        userEmail: string;
        row: number;
        col: number;
    };
}

/**
 * Drawing message
 */
export interface WSDrawMessage extends WSMessage {
    type: 'draw';
    data: {
        drawingId?: number;
        x: number;
        y: number;
        color: string;
        size: number;
        userId: number;
    };
}

/**
 * Cell style update message
 */
export interface WSCellStyleUpdateMessage extends WSMessage {
    type: 'cell_style_update';
    data: {
        cell: Cell;
        userId: number;
    };
}

/**
 * Canvas clear message
 */
export interface WSCanvasClearMessage extends WSMessage {
    type: 'canvas_clear';
    data: {
        userId: number;
    };
}
