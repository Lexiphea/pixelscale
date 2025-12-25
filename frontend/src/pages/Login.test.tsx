import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import Login from './Login';
import * as apiModule from '../lib/api';

// Mock the API module
vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        api: {
            login: vi.fn(),
            getMe: vi.fn(),
        },
    };
});

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear tokens
        localStorage.clear();
    });

    it('renders login form correctly', () => {
        render(<Login />);
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('handles successful login', async () => {
        const mockUser = { id: 1, username: 'testuser', email: 'test@example.com' };
        const mockAuthResponse = { access_token: 'fake-token', token_type: 'bearer' };

        (apiModule.api.login as any).mockResolvedValue(mockAuthResponse);
        (apiModule.api.getMe as any).mockResolvedValue(mockUser);

        render(<Login />);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(apiModule.api.login).toHaveBeenCalledWith({ username: 'testuser', password: 'password123' });
            expect(localStorage.getItem('token')).toBe('fake-token');
        });
    });

    it('displays error message on failed login', async () => {
        (apiModule.api.login as any).mockRejectedValue(new Error('Invalid credentials'));

        render(<Login />);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrongpass' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
