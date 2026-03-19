/**
 * Authentication Context Provider
 * Manages user authentication state across the application
 * Provides login, logout, and auth state to all components
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signIn, signUp, logout, getStoredToken, initializeAuth } from './api';
import type { UserSession, AuthCredentials } from './types';

/**
 * Authentication context type
 */
interface AuthContextType {
    // State
    user: UserSession | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    // Actions
    login: (credentials: AuthCredentials) => Promise<void>;
    register: (credentials: AuthCredentials) => Promise<void>;
    logoutUser: () => void;
    clearError: () => void;
}

/**
 * Create the auth context
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Auth Provider Component
 * Wraps the app to provide auth context to all children
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initialize auth state from localStorage on mount
     */
    useEffect(() => {
        initializeAuth();

        // Check for stored session
        const storedSession = localStorage.getItem('user_session');
        const token = getStoredToken();

        if (storedSession && token) {
            try {
                setUser(JSON.parse(storedSession));
            } catch (err) {
                console.error('Failed to parse stored session:', err);
                localStorage.removeItem('user_session');
            }
        }

        setIsLoading(false);
    }, []);

    /**
     * Login user with credentials
     */
    const login = useCallback(async (credentials: AuthCredentials) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await signIn(credentials);

            // Extract user data from JWT token
            const token = response.jsonToken;
            if (!token) {
                throw new Error('No token received');
            }

            // Decode JWT to get user info (simple decode, no verification needed here)
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userData: UserSession = {
                token,
                userId: payload.userId,
                email: payload.userEmail,
            };

            // Store user session
            setUser(userData);
            localStorage.setItem('user_session', JSON.stringify(userData));

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Register new user
     */
    const register = useCallback(async (credentials: AuthCredentials) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await signUp(credentials);

            // Extract user data
            const token = response.token || response.jsonToken;
            if (!token) {
                throw new Error('No token received');
            }

            // Decode JWT
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userData: UserSession = {
                token,
                userId: payload.userId,
                email: payload.userEmail,
            };

            // Store user session
            setUser(userData);
            localStorage.setItem('user_session', JSON.stringify(userData));

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Registration failed';
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Logout current user
     */
    const logoutUser = useCallback(() => {
        logout();
        setUser(null);
        localStorage.removeItem('user_session');
    }, []);

    /**
     * Clear error message
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value: AuthContextType = {
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logoutUser,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom hook to use auth context
 * Throws error if used outside AuthProvider
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
