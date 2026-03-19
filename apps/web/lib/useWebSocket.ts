/**
 * WebSocket Hook for Real-time Chat and Canvas Collaboration
 * Manages WebSocket connection, messages, and room subscriptions
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
    WSMessage,
    WSChatMessage,
    WSPresenceMessage,
    WSTypingMessage,
    WSErrorMessage,
    WSCanvasUpdateMessage,
    WSCursorMoveMessage,
    WSDrawMessage,
    WSCellStyleUpdateMessage,
    WSCanvasClearMessage,
    Cell,
    Cursor,
} from './types';

// WebSocket server URL
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';

/**
 * WebSocket connection status
 */
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Drawing point for canvas drawing operations
 */
export interface DrawingPoint {
    x: number;
    y: number;
    color: string;
    size: number;
    userId: number;
}

/**
 * WebSocket hook return type
 */
interface UseWebSocketReturn {
    // Connection state
    status: ConnectionStatus;
    isConnected: boolean;
    hasJoinedRoom: boolean;

    // Messages
    messages: WSChatMessage[];
    presenceEvents: WSPresenceMessage[];
    typingUsers: Map<number, string>;
    error: string | null;

    // Canvas state
    canvasCells: Map<string, Cell>;
    remoteCursors: Cursor[];
    drawings: DrawingPoint[];

    // Actions
    connect: (token: string) => void;
    disconnect: () => void;
    joinRoom: (roomId: string) => void;
    leaveRoom: (roomId: string) => void;
    sendMessage: (roomId: string, message: string) => void;
    sendTyping: (roomId: string, isTyping: boolean) => void;
    clearMessages: () => void;

    // Canvas actions
    sendCanvasUpdate: (roomId: string, cell: Cell, userId: number) => void;
    sendCursorMove: (roomId: string, cursor: Omit<Cursor, 'color'>) => void;
    sendDraw: (roomId: string, point: Omit<DrawingPoint, 'userId'>, userId: number) => void;
    sendCellStyleUpdate: (roomId: string, cell: Cell, userId: number) => void;
    sendCanvasClear: (roomId: string, userId: number) => void;
    updateCanvasCell: (cell: Cell) => void;
    clearCanvasData: () => void;
}

/**
 * Custom hook for managing WebSocket connection
 * @returns WebSocket state and actions
 */
export function useWebSocket(): UseWebSocketReturn {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Connection state
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [error, setError] = useState<string | null>(null);

    // Message storage
    const [messages, setMessages] = useState<WSChatMessage[]>([]);
    const [presenceEvents, setPresenceEvents] = useState<WSPresenceMessage[]>([]);
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

    // Canvas state for Excel Draw
    const [canvasCells, setCanvasCells] = useState<Map<string, Cell>>(new Map());
    const [remoteCursors, setRemoteCursors] = useState<Cursor[]>([]);
    const [drawings, setDrawings] = useState<DrawingPoint[]>([]);

    // Typing timeout for removing user from typing list
    const typingTimeoutRef = useRef<Map<number, NodeJS.Timeout>>(new Map());

    /**
     * Connect to WebSocket server with auth token
     */
    const connect = useCallback((token: string) => {
        // Prevent duplicate connections
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setStatus('connecting');
        setError(null);

        try {
            const ws = new WebSocket(`${WS_URL}?token=${token}`);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('WebSocket connected');
                setStatus('connected');
                setError(null);
            };

            ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                setStatus('disconnected');
                wsRef.current = null;
            };

            ws.onerror = (event) => {
                console.error('WebSocket error:', event);
                setStatus('error');
                setError('Connection error. Please try again.');
            };

            ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);
                    handleMessage(message);
                } catch (err) {
                    console.error('Failed to parse WebSocket message:', err);
                }
            };

        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            setStatus('error');
            setError('Failed to connect to chat server');
        }
    }, []);

    /**
     * Disconnect from WebSocket server
     */
    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setStatus('disconnected');
        setHasJoinedRoom(false); // Reset room join status
    }, []);

    /**
     * Join a chat room
     */
    const joinRoom = useCallback((roomId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'join_room',
                room: roomId,
            }));
        }
    }, []);

    /**
     * Leave a chat room
     */
    const leaveRoom = useCallback((roomId: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'leave_room',
                room: roomId,
            }));
        }
        // Reset join status since we're leaving the room
        setHasJoinedRoom(false);
    }, []);

    /**
     * Send a chat message to a room
     * Only sends if user has successfully joined the room
     */
    const sendMessage = useCallback((roomId: string, messageContent: string) => {
        // Prevent sending if user hasn't successfully joined the room yet
        // This fixes the "You are not in this room" error caused by race condition
        if (wsRef.current?.readyState === WebSocket.OPEN && hasJoinedRoom) {
            wsRef.current.send(JSON.stringify({
                type: 'chat',
                room: roomId,
                data: {
                    message: messageContent,
                },
            }));
        } else if (!hasJoinedRoom) {
            console.warn('Cannot send message: Not yet joined room. Waiting for join_room confirmation...');
        }
    }, [hasJoinedRoom]);

    /**
     * Send typing indicator
     */
    const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'typing',
                room: roomId,
                data: {
                    isTyping,
                },
            }));
        }
    }, []);

    /**
     * Clear all stored messages
     */
    const clearMessages = useCallback(() => {
        setMessages([]);
        setPresenceEvents([]);
        setTypingUsers(new Map());
    }, []);

    /**
     * Clear canvas data
     */
    const clearCanvasData = useCallback(() => {
        setCanvasCells(new Map());
        setRemoteCursors([]);
        setDrawings([]);
    }, []);

    /**
     * Update a canvas cell locally
     */
    const updateCanvasCell = useCallback((cell: Cell) => {
        setCanvasCells((prev) => {
            const newCells = new Map(prev);
            const key = `${cell.row},${cell.col}`;
            newCells.set(key, cell);
            return newCells;
        });
    }, []);

    /**
     * Send canvas cell update
     */
    const sendCanvasUpdate = useCallback((roomId: string, cell: Cell, userId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'canvas_update',
                room: roomId,
                data: {
                    cell,
                    userId,
                },
            }));
        }
    }, []);

    /**
     * Send cursor position for collaboration
     */
    const sendCursorMove = useCallback((roomId: string, cursor: Omit<Cursor, 'color'>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'cursor_move',
                room: roomId,
                data: cursor,
            }));
        }
    }, []);

    /**
     * Send drawing data
     */
    const sendDraw = useCallback((roomId: string, point: Omit<DrawingPoint, 'userId'>, userId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'draw',
                room: roomId,
                data: {
                    ...point,
                    userId,
                },
            }));
        }
    }, []);

    /**
     * Send cell style update
     */
    const sendCellStyleUpdate = useCallback((roomId: string, cell: Cell, userId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'cell_style_update',
                room: roomId,
                data: {
                    cell,
                    userId,
                },
            }));
        }
    }, []);

    /**
     * Send canvas clear command
     */
    const sendCanvasClear = useCallback((roomId: string, userId: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'canvas_clear',
                room: roomId,
                data: {
                    userId,
                },
            }));
        }
    }, []);

    /**
     * Handle incoming WebSocket messages
     */
    const handleMessage = useCallback((message: WSMessage) => {
        switch (message.type) {
            case 'chat':
                // Add chat message to list
                setMessages((prev) => [...prev, message as WSChatMessage]);
                break;

            case 'presence':
                const presenceMsg = message as WSPresenceMessage;

                // Add to presence events
                setPresenceEvents((prev) => [...prev.slice(-49), presenceMsg]);

                // Log connection/welcome messages
                if (presenceMsg.data.event === 'connected') {
                    console.log('Connected to WebSocket:', presenceMsg.data);
                } else if (presenceMsg.data.event === 'joined_room') {
                    console.log('Successfully joined room:', presenceMsg.data.room);
                    setHasJoinedRoom(true);
                }
                break;

            case 'typing':
                const typingMsg = message as WSTypingMessage;
                const { userId, userEmail, isTyping } = typingMsg.data;

                // Clear existing timeout for this user
                const existingTimeout = typingTimeoutRef.current.get(userId);
                if (existingTimeout) {
                    clearTimeout(existingTimeout);
                }

                if (isTyping) {
                    // Add user to typing list
                    setTypingUsers((prev) => new Map(prev).set(userId, userEmail));

                    // Remove after 3 seconds of no typing updates
                    const timeout = setTimeout(() => {
                        setTypingUsers((prev) => {
                            const newMap = new Map(prev);
                            newMap.delete(userId);
                            return newMap;
                        });
                    }, 3000);

                    typingTimeoutRef.current.set(userId, timeout);
                } else {
                    // Remove user from typing list
                    setTypingUsers((prev) => {
                        const newMap = new Map(prev);
                        newMap.delete(userId);
                        return newMap;
                    });
                }
                break;

            case 'error':
                const errorMsg = message as WSErrorMessage;
                console.error('WebSocket error:', errorMsg.data.message);
                setError(errorMsg.data.message);
                break;

            // Excel Draw Canvas message handlers
            case 'canvas_update':
                const canvasUpdateMsg = message as WSCanvasUpdateMessage;
                const updatedCell = canvasUpdateMsg.data.cell;
                updateCanvasCell(updatedCell);
                break;

            case 'cursor_move':
                const cursorMsg = message as WSCursorMoveMessage;
                setRemoteCursors((prev) => {
                    // Update or add cursor
                    const existing = prev.findIndex(c => c.userId === cursorMsg.data.userId);
                    const newCursor: Cursor = {
                        userId: cursorMsg.data.userId,
                        userEmail: cursorMsg.data.userEmail,
                        row: cursorMsg.data.row,
                        col: cursorMsg.data.col,
                        color: getUserColor(cursorMsg.data.userId),
                    };

                    if (existing >= 0) {
                        const updated = [...prev];
                        updated[existing] = newCursor;
                        return updated;
                    }
                    return [...prev, newCursor];
                });
                break;

            case 'draw':
                const drawMsg = message as WSDrawMessage;
                setDrawings((prev) => [...prev, {
                    x: drawMsg.data.x,
                    y: drawMsg.data.y,
                    color: drawMsg.data.color,
                    size: drawMsg.data.size,
                    userId: drawMsg.data.userId,
                }]);
                break;

            case 'cell_style_update':
                const styleUpdateMsg = message as WSCellStyleUpdateMessage;
                const styledCell = styleUpdateMsg.data.cell;
                updateCanvasCell(styledCell);
                break;

            case 'canvas_clear':
                const clearMsg = message as WSCanvasClearMessage;
                // Canvas clear received from another user - clear the local canvas
                // Note: The sender already cleared locally via clearCanvasData()
                setCanvasCells(new Map());
                setDrawings([]);
                break;

            default:
                console.log('Unknown message type:', message);
        }
    }, [updateCanvasCell]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            disconnect();
            // Clear all typing timeouts
            typingTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
        };
    }, [disconnect]);

    return {
        status,
        isConnected: status === 'connected',
        hasJoinedRoom, // Export room join status for components to check
        messages,
        presenceEvents,
        typingUsers,
        error,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendTyping,
        clearMessages,
        // Canvas actions
        canvasCells,
        remoteCursors,
        drawings,
        sendCanvasUpdate,
        sendCursorMove,
        sendDraw,
        sendCellStyleUpdate,
        sendCanvasClear,
        updateCanvasCell,
        clearCanvasData,
    };
}

/**
 * Generate a consistent color for a user based on their ID
 * This ensures each user has a unique color for their cursor
 */
function getUserColor(userId: number): string {
    // Predefined colors for collaborators
    const colors = [
        '#ef4444', // red
        '#f59e0b', // amber
        '#10b981', // emerald
        '#3b82f6', // blue (default for current user)
        '#8b5cf6', // violet
        '#ec4899', // pink
        '#06b6d4', // cyan
        '#f97316', // orange
    ];

    // Use modulo to get consistent color for each user
    return colors[userId % colors.length];
}
