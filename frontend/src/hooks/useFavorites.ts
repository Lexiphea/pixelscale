import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Image } from '@/lib/api';

const PAGE_SIZE = 50;

export function useFavorites() {
    return useInfiniteQuery({
        queryKey: ['favorites'],
        queryFn: async ({ pageParam = 0 }) => {
            const images = await api.getFavorites(pageParam, PAGE_SIZE);
            return images;
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < PAGE_SIZE) return undefined;
            return allPages.flat().length;
        },
        initialPageParam: 0,
    });
}

export function useToggleFavoriteInFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.toggleFavorite(id),
        onSuccess: (updatedImage) => {
            // Update favorites cache
            queryClient.setQueryData(['favorites'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.map(img => img.id === updatedImage.id ? updatedImage : img)
                    ),
                };
            });
            // Also invalidate images cache
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });
}

export function useDeleteFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.deleteImage(id),
        onSuccess: (_, deletedId) => {
            queryClient.setQueryData(['favorites'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.filter(img => img.id !== deletedId)
                    ),
                };
            });
            // Also invalidate images cache
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });
}
