import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../lib/auth';

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <AuthProvider>
            <BrowserRouter>
                {children}
            </BrowserRouter>
        </AuthProvider>
    );
};

export const render = (ui: React.ReactElement, options = {}) =>
    rtlRender(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
