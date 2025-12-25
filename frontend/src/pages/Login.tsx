import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const { clientX, clientY } = e;
        setMousePosition({ x: clientX, y: clientY });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const { access_token } = await api.login(formData);
            localStorage.setItem('token', access_token);
            // Fetch user data immediately to populate context
            const user = await api.getMe();
            login(access_token, user);
            navigate('/');
        } catch (err: any) {
            const errorMessage = err.message || 'Login failed';
            setError(errorMessage);
            setFormData(prev => ({ ...prev, password: '' }));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            onMouseMove={handleMouseMove}
        >
            {/* Cursor spotlight */}
            <div
                className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
                style={{
                    backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)`,
                    backgroundSize: '24px 24px',
                    backgroundPosition: 'center',
                    maskImage: `radial-gradient(circle 250px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
                    WebkitMaskImage: `radial-gradient(circle 250px at ${mousePosition.x}px ${mousePosition.y}px, black, transparent)`,
                }}
            />

            <div className="w-full max-w-md bg-card border border-border p-8 rounded-xl shadow-sm relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                        PixelScale
                    </h1>
                    <p className="text-muted-foreground mt-2">Sign in to your account</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg mb-6 border border-destructive/20">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label htmlFor="username" className="text-sm font-medium text-muted-foreground">Username</label>
                        <input
                            id="username"
                            type="text"
                            required
                            className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                            placeholder="Enter your username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-muted-foreground">Password</label>
                        <input
                            id="password"
                            type="password"
                            required
                            className="w-full bg-background border border-input rounded-lg px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="text-center mt-6 text-muted-foreground text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}
