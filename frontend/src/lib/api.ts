export interface Image {
    id: number;
    url: string;
    original_url?: string;
    options?: ImageProcessingOptions;
    filename?: string;
    uploaded_at?: string;
}

export interface ImageProcessingOptions {
    width?: number;
    height?: number;
    preset?: string;
    maintain_aspect?: boolean;
    crop_x?: number;
    crop_y?: number;
    crop_width?: number;
    crop_height?: number;
    rotate?: number;
    flip_horizontal?: boolean;
    flip_vertical?: boolean;
    filter?: 'none' | 'grayscale' | 'sepia' | 'blur' | 'sharpen' | 'contour' | 'emboss';
    brightness?: number;
    contrast?: number;
    saturation?: number;
    format?: 'jpeg' | 'png' | 'webp';
    quality?: number;
}

export interface User {
    id: number;
    username: string;
    is_active: boolean;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
    if (res.status === 401) {
        // Only clear token and redirect if user was previously authenticated
        const existingToken = localStorage.getItem('token');
        if (existingToken) {
            localStorage.removeItem('token');
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        throw new Error('Incorrect username or password');
    }
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Request failed');
    }
    return res.json();
};

export const api = {
    // Auth Endpoints
    register: async (data: any): Promise<User> => {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    login: async (data: any): Promise<AuthResponse> => {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    getMe: async (): Promise<User> => {
        const res = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: { ...getAuthHeaders() },
        });
        return handleResponse(res);
    },

    // Image Endpoints
    getImages: async (): Promise<Image[]> => {
        const res = await fetch(`${BASE_URL}/api/images`, {
            headers: { ...getAuthHeaders() },
        });
        const images: Image[] = await handleResponse(res);
        return images.map(img => ({
            ...img,
            url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
            original_url: img.original_url?.startsWith('/') ? `${BASE_URL}${img.original_url}` : img.original_url,
        }));
    },

    uploadImage: async (file: File): Promise<Image> => {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${BASE_URL}/api/upload?preset=medium`, {
            method: 'POST',
            headers: { ...getAuthHeaders() },
            body: formData,
        });

        const img: Image = await handleResponse(res);
        return {
            ...img,
            url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
            original_url: img.original_url?.startsWith('/') ? `${BASE_URL}${img.original_url}` : img.original_url,
        };
    },

    deleteImage: async (id: number): Promise<void> => {
        const res = await fetch(`${BASE_URL}/api/images/${id}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() },
        });
        await handleResponse(res);
    },

    processImage: async (id: number, options: ImageProcessingOptions): Promise<Image> => {
        const res = await fetch(`${BASE_URL}/api/process/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify(options),
        });

        const img: Image = await handleResponse(res);
        return {
            ...img,
            url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
            original_url: img.original_url?.startsWith('/') ? `${BASE_URL}${img.original_url}` : img.original_url,
        };
    }
};
