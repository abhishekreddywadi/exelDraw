/**
 * Home Page - Landing page with beautiful UI
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { MessageSquare, Sparkles, Zap, Shield, Users } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAuth();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/dashboard');
        }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:to-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-blue-300/30 to-cyan-300/30 rounded-full blur-3xl"></div>
            </div>

            {/* Navigation */}
            <nav className="relative z-10 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="gradient-bg p-2.5 rounded-xl shadow-lg">
                            <MessageSquare size={28} className="text-white" />
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            ChatDraw
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link
                            href="/signin"
                            className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/signup"
                            className="px-6 py-2.5 gradient-bg text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all btn-hover"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 px-6 pt-16 pb-24">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center animate-fade-in">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-full shadow-sm mb-8">
                            <Sparkles size={16} className="text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Real-time collaboration reimagined
                            </span>
                        </div>

                        {/* Main heading */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
                            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                Chat, Draw & Collaborate
                            </span>
                            <br />
                            <span className="text-gray-800 dark:text-white">
                                in Real-time
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-12">
                            Experience seamless communication with instant messaging,
                            real-time collaboration, and powerful drawing tools.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
                            <Link
                                href="/signup"
                                className="group px-8 py-4 gradient-bg text-white font-semibold rounded-2xl shadow-xl hover:shadow-2xl transition-all btn-hover flex items-center justify-center gap-3"
                            >
                                <span>Start Free Trial</span>
                                <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                            </Link>
                            <Link
                                href="/signin"
                                className="px-8 py-4 bg-white/70 dark:bg-white/10 backdrop-blur-sm hover:bg-white dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold rounded-2xl border-2 border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-2"
                            >
                                <span>Sign In</span>
                                <span>→</span>
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
                            <div>
                                <div className="text-3xl sm:text-4xl font-bold text-indigo-600 dark:text-indigo-400">∞</div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">Unlimited Rooms</div>
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-bold text-purple-600 dark:text-purple-400">&lt;100ms</div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">Message Latency</div>
                            </div>
                            <div>
                                <div className="text-3xl sm:text-4xl font-bold text-pink-600 dark:text-pink-400">99.9%</div>
                                <div className="text-gray-600 dark:text-gray-400 text-sm mt-1">Uptime</div>
                            </div>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Feature 1 */}
                        <div className="glass p-6 rounded-2xl hover:scale-105 transition-transform duration-300">
                            <div className="gradient-bg w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                <Zap size={28} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Real-time Chat
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Instant message delivery with WebSocket technology
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="glass p-6 rounded-2xl hover:scale-105 transition-transform duration-300">
                            <div className="gradient-bg-2 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                <Users size={28} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Team Rooms
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Create unlimited rooms for different teams and topics
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="glass p-6 rounded-2xl hover:scale-105 transition-transform duration-300">
                            <div className="gradient-bg-3 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                <Shield size={28} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Secure
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                JWT authentication keeps your conversations safe
                            </p>
                        </div>

                        {/* Feature 4 */}
                        <div className="glass p-6 rounded-2xl hover:scale-105 transition-transform duration-300">
                            <div className="bg-gradient-to-br from-emerald-400 to-cyan-500 w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-lg">
                                <Sparkles size={28} className="text-white" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Excel Draw
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                                Coming soon: Draw and collaborate on spreadsheets
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                    Built with{' '}
                    <span className="text-red-500">❤</span>{' '}
                    using Next.js, WebSocket, and Prisma
                </p>
            </footer>
        </div>
    );
}
