/**
 * Dashboard Page - Beautiful UI
 * Main page where users can create or join rooms
 */

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { createRoom } from '@/lib/api';
import { LogOut, Plus, Hash, Search, Sparkles, LogOut as LogoutIcon, ChevronRight } from 'lucide-react';

export default function DashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading, logoutUser } = useAuth();

    const [roomSlug, setRoomSlug] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');

    // Popular rooms for quick access
    const popularRooms = [
        { slug: 'general', name: 'General Chat', color: 'from-indigo-500 to-purple-500' },
        { slug: 'random', name: 'Random Talk', color: 'from-pink-500 to-rose-500' },
        { slug: 'tech', name: 'Technology', color: 'from-blue-500 to-cyan-500' },
        { slug: 'gaming', name: 'Gaming Zone', color: 'from-emerald-500 to-teal-500' },
        { slug: 'music', name: 'Music Lovers', color: 'from-violet-500 to-purple-500' },
        { slug: 'movies', name: 'Movie Buffs', color: 'from-orange-500 to-amber-500' },
    ];

    // Redirect to signin if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/signin');
        }
    }, [isAuthenticated, isLoading, router]);

    /**
     * Handle room creation
     */
    const handleCreateRoom = async (e: FormEvent) => {
        e.preventDefault();
        setError('');

        if (!roomSlug.trim()) {
            setError('Please enter a room name');
            return;
        }

        setIsCreating(true);

        try {
            await createRoom({
                slug: roomSlug.trim().toLowerCase().replace(/\s+/g, '-'),
                userId: user!.userId,
            });

            router.push(`/room/${roomSlug.trim().toLowerCase().replace(/\s+/g, '-')}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create room');
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * Navigate to existing room
     */
    const handleJoinRoom = () => {
        if (!roomSlug.trim()) {
            setError('Please enter a room name');
            return;
        }

        const slug = roomSlug.trim().toLowerCase().replace(/\s+/g, '-');
        router.push(`/room/${slug}`);
    };

    /**
     * Navigate to a specific room
     */
    const goToRoom = (slug: string) => {
        router.push(`/room/${slug}`);
    };

    /**
     * Handle logout
     */
    const handleLogout = () => {
        logoutUser();
        router.push('/signin');
    };

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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-300/20 to-cyan-300/20 rounded-full blur-3xl"></div>
            </div>

            {/* Header */}
            <header className="relative z-10 glass border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                            <div className="gradient-bg p-2.5 rounded-xl shadow-lg cursor-pointer" onClick={() => router.push('/')}>
                                <Hash size={24} className="text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    ChatDraw
                                </h1>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Real-time Collaboration</p>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:block text-right">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Online</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2.5 hover:bg-white/50 dark:hover:bg-white/10 rounded-xl transition-colors group"
                                title="Logout"
                            >
                                <LogoutIcon size={20} className="text-gray-600 dark:text-gray-400 group-hover:text-red-500 transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
                {/* Welcome Section */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-6">
                        <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
                        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                            Welcome back!
                        </span>
                    </div>
                    <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                        Start Conversing
                    </h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Create a new room or join an existing one to start chatting with your team
                    </p>
                </div>

                {/* Room Create/Join Card */}
                <div className="max-w-xl mx-auto mb-16 animate-fade-in">
                    <div className="glass rounded-3xl shadow-2xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="gradient-bg p-3 rounded-xl">
                                <Plus size={24} className="text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                    Create or Join a Room
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Enter a room name to get started
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm mb-6 flex items-center gap-2">
                                <span>⚠</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleCreateRoom} className="space-y-6">
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={roomSlug}
                                    onChange={(e) => setRoomSlug(e.target.value)}
                                    placeholder="Enter room name..."
                                    className="w-full pl-12 pr-4 py-4 bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:text-white transition input-focus text-lg"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={isCreating || !roomSlug.trim()}
                                    className="flex-1 gradient-bg text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all btn-hover disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isCreating ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={20} />
                                            Create Room
                                        </>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleJoinRoom}
                                    disabled={!roomSlug.trim()}
                                    className="px-6 py-4 bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-semibold rounded-xl border-2 border-gray-200 dark:border-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Join
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Popular Rooms */}
                <div className="animate-fade-in">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <Sparkles size={24} className="text-yellow-500" />
                        Popular Rooms
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {popularRooms.map((room) => (
                            <button
                                key={room.slug}
                                onClick={() => goToRoom(room.slug)}
                                className="group glass p-6 rounded-2xl text-left hover:scale-105 transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`p-3 bg-gradient-to-br ${room.color} rounded-xl shadow-lg`}>
                                        <Hash size={24} className="text-white" />
                                    </div>
                                    <ChevronRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                                    {room.slug}
                                </h4>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {room.name}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
