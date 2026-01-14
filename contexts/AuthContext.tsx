'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

export interface AuthUser {
    id: string;
    email: string;
    full_name: string;
    role: 'admin' | 'employee';
    department?: string;
    shift?: string;
    phone?: string;
    position?: string;
    salary?: string;
    entry_time?: string;
    exit_time?: string;
    break_in?: string;
    break_off?: string;
}

interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
    signUp: (params: any) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const checkUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Check user error:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkUser();
    }, []);

    const refreshUser = async () => {
        await checkUser();
    };

    const signUp = async (params: any): Promise<{ error: any }> => {
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            const data = await res.json();
            if (res.ok) {
                // Return success but do not set user session
                // This forces manual login after signup
                return { error: null };
            }
            return { error: data.error || 'Signup failed' };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const signIn = async (email: string, password: string): Promise<{ error: any }> => {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok) {
                setUser(data.user);
                return { error: null };
            }
            return { error: data.error || 'Login failed' };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const signOut = async (): Promise<void> => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            setUser(null);
            toast.info('Session Terminated. Offline.');
            router.push('/');
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useSupabaseAuth = useAuth; // Maintain compatibility
