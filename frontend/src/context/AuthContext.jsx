import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import API_BASE from '../config/api';

const API = `${API_BASE}/api/auth`;
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Restore session from localStorage on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try { setUser(JSON.parse(savedUser)); } catch { localStorage.clear(); }
        }
        setLoading(false);
    }, []);

    const signIn = useCallback(async (email, password) => {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) return { error: { message: data.error || 'Login failed' } };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { error: null };
    }, []);

    const signUp = useCallback(async (email, password, options) => {
        const name = options?.data?.full_name || '';
        const res = await fetch(`${API}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();
        if (!res.ok) return { error: { message: data.error || 'Signup failed' } };
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        return { error: null };
    }, []);

    const signOut = useCallback(async () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, signIn, signOut, signUp, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
