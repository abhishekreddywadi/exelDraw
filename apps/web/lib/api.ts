/**
 * API utilities for making HTTP requests to the backend
 * Handles authentication, error handling, and response formatting
 */

import axios, { AxiosError } from 'axios';
import type { AuthCredentials, AuthResponse, CreateRoomData, CreateRoomResponse, ChatMessage, DrawingMessage } from './types';

// API base URL - change this if your backend runs on a different port
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

/**
 * Create an axios instance with default configuration
 */
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Add authentication token to requests
 * @param token - JWT token from signup/signin
 */
export function setAuthToken(token: string): void {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    // Also store in localStorage for persistence
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
}

/**
 * Remove authentication token (logout)
 */
export function clearAuthToken(): void {
    delete api.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_session');
    }
}

/**
 * Get stored token from localStorage
 */
export function getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

/**
 * Initialize auth state from localStorage
 * Call this on app startup to restore user session
 */
export function initializeAuth(): void {
    const token = getStoredToken();
    if (token) {
        setAuthToken(token);
    }
}

// ============================================
// AUTH API
// ============================================

/**
 * Sign up a new user
 * @param credentials - User credentials (userName, password)
 * @returns Promise with auth response containing token
 */
export async function signUp(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
        const response = await api.post<AuthResponse>('/users/signup', credentials);
        const token = response.data.token || response.data.jsonToken;

        if (token) {
            setAuthToken(token);
        }

        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Sign up failed');
    }
}

/**
 * Sign in an existing user
 * @param credentials - User credentials (userName, password)
 * @returns Promise with auth response containing token
 */
export async function signIn(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
        const response = await api.post<AuthResponse>('/users/signin', credentials);
        const token = response.data.jsonToken;
        const userId = response.data.userId;

        if (token) {
            setAuthToken(token);
        }

        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Sign in failed');
    }
}

/**
 * Logout the current user
 */
export function logout(): void {
    clearAuthToken();
}

// ============================================
// ROOM API
// ============================================

/**
 * Create a new chat room
 * @param roomData - Room data (slug, userId)
 * @returns Promise with created room info
 */
export async function createRoom(roomData: CreateRoomData): Promise<CreateRoomResponse> {
    try {
        const response = await api.post<CreateRoomResponse>('/rooms/create-room', roomData);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to create room');
    }
}

/**
 * Get room chats by room slug
 * @param slug - Room slug/identifier
 * @returns Promise with chat messages
 */
export async function getRoomChats(slug: string): Promise<ChatMessage[]> {
    try {
        const response = await api.get<ChatMessage[]>(`/rooms/${slug}/chats`);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to fetch chats');
    }
}

/**
 * Get room drawings by room slug
 * @param slug - Room slug/identifier
 * @returns Promise with drawing data
 */
export async function getRoomDrawings(slug: string): Promise<DrawingMessage[]> {
    try {
        const response = await api.get<DrawingMessage[]>(`/rooms/${slug}/drawings`);
        return response.data;
    } catch (error) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new Error(axiosError.response?.data?.message || 'Failed to fetch drawings');
    }
}

// Export the api instance for custom requests
export { api };
