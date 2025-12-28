export interface Image {
    id: number;
    user_index: number;
    url: string;
    original_url?: string;
    edited_url?: string;
    options?: ImageProcessingOptions;
    filename?: string;
    uploaded_at?: string;
    is_favorite: boolean;
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

const BASE_URL = import.meta.env.VITE_API_URL;

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const handleResponse = async (res: Response) => {
    if (res.status === 401) {
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

const transformImageUrls = (img: Image): Image => ({
    ...img,
    url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
    original_url: img.original_url?.startsWith('/') ? `${BASE_URL}${img.original_url}` : img.original_url,
    edited_url: img.edited_url?.startsWith('/') ? `${BASE_URL}${img.edited_url}` : img.edited_url,
});

export const api = {
    // Auth Endpoints
    register: async (data: { username: string; password: string }): Promise<User> => {
        const res = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        return handleResponse(res);
    },

    login: async (data: { username: string; password: string }): Promise<AuthResponse> => {
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
    getImages: async (skip: number = 0, limit: number = 50): Promise<Image[]> => {
        const res = await fetch(`${BASE_URL}/api/images?skip=${skip}&limit=${limit}`, {
            headers: { ...getAuthHeaders() },
        });
        const images: Image[] = await handleResponse(res);
        return images.map(transformImageUrls);
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
        return transformImageUrls(img);
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
        return transformImageUrls(img);
    },

    getDownloadUrl: (id: number, version: 'original' | 'edited' = 'original'): string => {
        const token = localStorage.getItem('token');
        return `${BASE_URL}/api/images/${id}/download?token=${token}&version=${version}`;
    },

    toggleFavorite: async (id: number): Promise<Image> => {
        const res = await fetch(`${BASE_URL}/api/images/${id}/favorite`, {
            method: 'PATCH',
            headers: { ...getAuthHeaders() },
        });
        const img: Image = await handleResponse(res);
        return transformImageUrls(img);
    },

    getFavorites: async (skip: number = 0, limit: number = 50): Promise<Image[]> => {
        const res = await fetch(`${BASE_URL}/api/images/favorites?skip=${skip}&limit=${limit}`, {
            headers: { ...getAuthHeaders() },
        });
        const images: Image[] = await handleResponse(res);
        return images.map(transformImageUrls);
    },

    // Share Link Endpoints
    createShareLink: async (imageId: number, duration: ShareDuration, version: ShareVersion = 'edited'): Promise<ShareLinkResponse> => {
        const res = await fetch(`${BASE_URL}/api/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
            body: JSON.stringify({ image_id: imageId, duration, version }),
        });
        return handleResponse(res);
    },

    getSharedImage: async (shareId: string): Promise<SharedImageResponse> => {
        // Public endpoint - no auth required
        const res = await fetch(`${BASE_URL}/api/s/${shareId}`);
        if (res.status === 410) {
            throw new Error('This share link has expired');
        }
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Share link not found');
        }
        const data = await res.json();
        // Transform local URLs
        if (data.image_url?.startsWith('/')) {
            data.image_url = `${BASE_URL}${data.image_url}`;
        }
        return data;
    },

    deleteShareLink: async (shareId: string): Promise<void> => {
        const res = await fetch(`${BASE_URL}/api/share/${shareId}`, {
            method: 'DELETE',
            headers: { ...getAuthHeaders() },
        });
        await handleResponse(res);
    },

    getShareLinks: async (): Promise<ShareLinkListItem[]> => {
        const res = await fetch(`${BASE_URL}/api/share/list`, {
            headers: { ...getAuthHeaders() },
        });
        const links: ShareLinkListItem[] = await handleResponse(res);
        // Transform local URLs
        return links.map(link => ({
            ...link,
            image_url: link.image_url?.startsWith('/') ? `${BASE_URL}${link.image_url}` : link.image_url,
        }));
    },
};

// Share Link Types
export type ShareDuration = '1_day' | '1_week' | 'forever';
export type ShareVersion = 'edited' | 'original';

export interface ShareLinkResponse {
    share_id: string;
    share_url: string;
    expires_at: string | null;
}

export interface SharedImageResponse {
    image_url: string;
    filename: string;
    expires_at: string | null;
}

export interface ShareLinkListItem {
    share_id: string;
    image_id: number;
    image_filename: string;
    image_url: string | null;
    share_url: string;
    version: 'edited' | 'original';
    expires_at: string | null;
    created_at: string;
    is_expired: boolean;
}
