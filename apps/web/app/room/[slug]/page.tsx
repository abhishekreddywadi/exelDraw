/**
 * Chat Room Page - Beautiful UI with Chat History
 * Real-time chat interface with WebSocket connection
 */

'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useWebSocket } from '@/lib/useWebSocket';
import { api } from '@/lib/api';
import type { ChatMessage } from '@/lib/types';
import { ArrowLeft, Send, Users, MoreVertical, Hash, Smile, Paperclip, RefreshCw } from 'lucide-react';

export default function RoomPage() {
    const router = useRouter();
    const params = useParams();
    const { user, isAuthenticated, isLoading } = useAuth();

    const slug = params.slug as string;
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        isConnected,
        hasJoinedRoom,
        messages,
        typingUsers,
        connect,
        disconnect,
        joinRoom,
        leaveRoom,
        sendMessage,
        sendTyping,
        clearMessages,
    } = useWebSocket();

    const [messageInput, setMessageInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [error, setError] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [historyMessages, setHistoryMessages] = useState<ChatMessage[]>([]);

    // Redirect to signin if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(`/signin?redirect=/room/${slug}`);
        }
    }, [isAuthenticated, isLoading, router, slug]);

    /**
     * Load chat history from database
     */
    const loadChatHistory = async () => {
        setIsLoadingHistory(true);
        try {
            console.log('Loading chat history for room:', slug);
            console.log('User token exists:', !!user?.token);

            const response = await api.get(`/rooms/${slug}/chats`, {
                headers: {
                    Authorization: `Bearer ${user?.token}`,
                },
            });

            console.log('Chat history response:', response.data);
            console.log('Number of messages:', (response.data as ChatMessage[]).length);

            // Set history messages (API returns them in chronological order)
            setHistoryMessages(response.data as ChatMessage[]);
        } catch (err) {
            console.error('Failed to load chat history:', err);
            // Don't show error for empty rooms - just show empty state
            setHistoryMessages([]);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // Initialize WebSocket connection and load history
    useEffect(() => {
        if (isAuthenticated && user?.token) {
            // Load chat history first
            loadChatHistory();

            // Connect to WebSocket (joinRoom will be called in a separate effect)
            connect(user.token);
        }

        return () => {
            leaveRoom(slug);
            disconnect();
            setHistoryMessages([]);
            clearMessages();
        };
    }, [isAuthenticated, user, slug]);

    // Join room only after WebSocket is connected
    // This fixes the race condition where joinRoom was called before connection was ready
    useEffect(() => {
        if (isConnected && slug && !hasJoinedRoom) {
            console.log('WebSocket connected, joining room:', slug);
            joinRoom(slug);
        }
    }, [isConnected, slug, hasJoinedRoom]);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    /**
     * Handle typing indicator with debounce
     */
    useEffect(() => {
        if (isTyping) {
            const timeout = setTimeout(() => {
                setIsTyping(false);
                sendTyping(slug, false);
            }, 1000);

            sendTyping(slug, true);

            return () => {
                clearTimeout(timeout);
                sendTyping(slug, false);
            };
        }
    }, [isTyping, messageInput, slug]);

    /**
     * Handle sending a message
     * Only sends if user has successfully joined the room
     */
    const handleSendMessage = (e: FormEvent) => {
        e.preventDefault();

        if (!messageInput.trim() || !hasJoinedRoom) {
            console.log('Cannot send yet - hasJoinedRoom:', hasJoinedRoom);
            return;
        }

        sendMessage(slug, messageInput.trim());
        setMessageInput('');
        setIsTyping(false);
    };

    /**
     * Go back to dashboard
     */
    const handleGoBack = () => {
        router.push('/dashboard');
    };

    /**
     * Refresh chat history
     */
    const handleRefresh = () => {
        loadChatHistory();
    };

    // Combine history and real-time messages
    const allMessages = [
        ...historyMessages.map((msg) => ({
            type: 'chat' as const,
            room: slug,
            data: {
                chatId: msg.Id,
                message: msg.message,
                senderId: msg.userId,
                senderEmail: msg.User?.email || 'Unknown',
                timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
            },
            timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
        })),
        ...messages,
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:to-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 dark:bg-slate-900">
            {/* Header */}
            <header className="glass border-b border-white/10 px-4 py-3">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    {/* Back button & Room info */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleGoBack}
                            className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <div className="flex items-center gap-3 px-3 py-1.5 bg-white/50 dark:bg-white/5 rounded-xl">
                            <div className="gradient-bg p-2 rounded-lg">
                                <Hash size={18} className="text-white" />
                            </div>
                            <div>
                                <h1 className="font-bold text-gray-900 dark:text-white">
                                    #{slug}
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${hasJoinedRoom ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                    {hasJoinedRoom ? 'Joined' : 'Connecting...'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Room actions */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isLoadingHistory}
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={isLoadingHistory ? 'animate-spin' : ''} />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Refresh
                            </span>
                        </button>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-white/5 rounded-xl">
                            <Users size={16} className="text-gray-500 dark:text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Online
                            </span>
                        </div>
                        <button className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors">
                            <MoreVertical size={18} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2">
                    <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-4xl mx-auto space-y-4">
                    {isLoadingHistory ? (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-gray-500 dark:text-gray-400">Loading messages...</p>
                        </div>
                    ) : allMessages.length === 0 ? (
                        <div className="text-center py-16 animate-fade-in">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full mb-4">
                                <Hash size={32} className="text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <p className="text-gray-500 dark:text-gray-400 mb-2">
                                Welcome to #{slug}
                            </p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                                Be the first to send a message!
                            </p>
                        </div>
                    ) : (
                        allMessages.map((msg, index) => {
                            const isOwnMessage = msg.data.senderId === user?.userId;
                            return (
                                <div
                                    key={`${msg.data.chatId || `history-${index}`}-${index}`}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-xs sm:max-w-md ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                                        {!isOwnMessage && (
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-500 mb-1 ml-2">
                                                {msg.data.senderEmail}
                                            </p>
                                        )}
                                        <div
                                            className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                                                isOwnMessage
                                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-md'
                                                    : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-bl-md'
                                            }`}
                                        >
                                            <p className="break-words">{msg.data.message}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 px-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Typing Indicator */}
            {typingUsers.size > 0 && (
                <div className="px-4 py-2 bg-white/50 dark:bg-white/5 border-t border-white/10">
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </span>
                        <span>
                            {Array.from(typingUsers.values()).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
                        </span>
                    </p>
                </div>
            )}

            {/* Message Input */}
            <div className="glass border-t border-white/10 px-4 py-4">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3">
                        {/* Attachment button */}
                        <button
                            type="button"
                            className="p-3 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 dark:text-gray-400"
                        >
                            <Paperclip size={20} />
                        </button>

                        {/* Input field */}
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => {
                                    setMessageInput(e.target.value);
                                    if (e.target.value.length > 0) {
                                        setIsTyping(true);
                                    }
                                }}
                                placeholder={hasJoinedRoom ? 'Type a message...' : 'Joining room...'}
                                disabled={!hasJoinedRoom}
                                className="w-full px-5 py-3.5 bg-white dark:bg-slate-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:text-white disabled:opacity-50 transition input-focus"
                            />
                        </div>

                        {/* Emoji button */}
                        <button
                            type="button"
                            className="p-3 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors text-gray-500 dark:text-gray-400 disabled:opacity-50"
                            disabled={!hasJoinedRoom}
                        >
                            <Smile size={20} />
                        </button>

                        {/* Send button */}
                        <button
                            type="submit"
                            disabled={!messageInput.trim() || !hasJoinedRoom}
                            className="p-3.5 gradient-bg text-white rounded-xl shadow-lg hover:shadow-xl transition-all btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={20} />
                        </button>
                    </div>

                    {/* Helper text */}
                    <p className="text-xs text-gray-500 dark:text-gray-500 text-center mt-2">
                        Press Enter to send • Messages are saved to the room
                    </p>
                </form>
            </div>
        </div>
    );
}
