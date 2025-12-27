import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Image } from '@/lib/api';

const PAGE_SIZE = 50;

export function useImages() {
    return useInfiniteQuery({
        queryKey: ['images'],
        queryFn: async ({ pageParam = 0 }) => {
            const images = await api.getImages(pageParam, PAGE_SIZE);
            return images;
        },
        getNextPageParam: (lastPage, allPages) => {
            // If we got less than PAGE_SIZE, there's no more data
            if (lastPage.length < PAGE_SIZE) return undefined;
            // Otherwise, return the offset for the next page
            return allPages.flat().length;
        },
        initialPageParam: 0,
    });
}

export function useDeleteImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.deleteImage(id),
        onSuccess: (_, deletedId) => {
            // Update cache to remove the deleted image
            queryClient.setQueryData(['images'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.filter(img => img.id !== deletedId)
                    ),
                };
            });
        },
    });
}

export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.toggleFavorite(id),
        onSuccess: (updatedImage) => {
            // Update the image in the cache
            queryClient.setQueryData(['images'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.map(img => img.id === updatedImage.id ? updatedImage : img)
                    ),
                };
            });
            // Also invalidate favorites since it might have changed
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });
}
