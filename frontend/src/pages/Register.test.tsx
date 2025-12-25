import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test/utils';
import Register from './Register';
import * as apiModule from '../lib/api';

vi.mock('../lib/api', async () => {
    const actual = await vi.importActual('../lib/api');
    return {
        ...actual,
        api: {
            register: vi.fn(),
            login: vi.fn(),
            getMe: vi.fn(),
        },
    };
});

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('renders register form correctly', () => {
        render(<Register />);
        expect(screen.getByText(/create account/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    it('handles successful registration', async () => {
        const mockUser = { id: 1, username: 'newuser', email: 'new@example.com' };
        const mockAuthResponse = { access_token: 'fake-token', token_type: 'bearer' };

        (apiModule.api.register as any).mockResolvedValue(mockUser);
        (apiModule.api.login as any).mockResolvedValue(mockAuthResponse);
        (apiModule.api.getMe as any).mockResolvedValue(mockUser);

        render(<Register />);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'newuser' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /register/i }));

        await waitFor(() => {
            expect(apiModule.api.register).toHaveBeenCalledWith({
                username: 'newuser',
                email: 'new@example.com',
                password: 'password123'
            });
            // Should auto-login
            expect(apiModule.api.login).toHaveBeenCalled();
        });
    });

    it('displays error on registration failure', async () => {
        (apiModule.api.register as any).mockRejectedValue(new Error('Username taken'));

        render(<Register />);

        fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'takenuser' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /register/i }));

        await waitFor(() => {
            expect(screen.getByText(/username taken/i)).toBeInTheDocument();
        });
    });
});
