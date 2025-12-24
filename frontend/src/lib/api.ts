export interface Image {
    id: number;
    url: string;
    filename?: string;
    uploaded_at?: string;
}

const BASE_URL = 'http://localhost:8000'; // TODO: Make configurable via env

export const api = {
    getImages: async (): Promise<Image[]> => {
        const res = await fetch(`${BASE_URL}/api/images`);
        if (!res.ok) throw new Error('Failed to fetch images');
        const images: Image[] = await res.json();
        // Prepend BASE_URL to relative URLs from the backend
        return images.map(img => ({
            ...img,
            url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
        }));
    },

    uploadImage: async (file: File): Promise<Image> => {
        const formData = new FormData();
        formData.append('file', file);

        // Default to medium preset for now
        const res = await fetch(`${BASE_URL}/api/upload?preset=medium`, {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
        const img: Image = await res.json();
        return {
            ...img,
            url: img.url?.startsWith('/') ? `${BASE_URL}${img.url}` : img.url,
        };
    },

    deleteImage: async (id: number): Promise<void> => {
        const res = await fetch(`${BASE_URL}/api/images/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) throw new Error('Delete failed');
    }
};
