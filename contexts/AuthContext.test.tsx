import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// Mock Supabase client
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();

vi.mock('../services/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: () => mockGetSession(),
            onAuthStateChange: () => mockOnAuthStateChange(),
            signOut: () => mockSignOut(),
        },
    },
}));

// Test component to consume context
const TestComponent = () => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return <div>{user ? `User: ${user.email}` : 'No User'}</div>;
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementations
        mockGetSession.mockResolvedValue({ data: { session: null } });
        mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    });

    it('renders loading state initially then children', async () => {
        render(
            <AuthProvider>
                <div>Test Child</div>
            </AuthProvider>
        );

        // Should eventually show children
        await waitFor(() => {
            expect(screen.getByText('Test Child')).toBeInTheDocument();
        });
    });

    it('provides user data when session exists', async () => {
        const mockUser = { id: '123', email: 'test@example.com' };
        const mockSession = { user: mockUser };

        mockGetSession.mockResolvedValue({ data: { session: mockSession } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('User: test@example.com')).toBeInTheDocument();
        });
    });

    it('handles null session (no user)', async () => {
        mockGetSession.mockResolvedValue({ data: { session: null } });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('No User')).toBeInTheDocument();
        });
    });
});
