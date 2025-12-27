import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Image } from '@/lib/api';

const PAGE_SIZE = 50;

export function useFavorites() {
    const queryClient = useQueryClient();

    const query = useInfiniteQuery({
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

    // Prefetch next page when current data loads
    useEffect(() => {
        if (query.data && query.hasNextPage && !query.isFetching) {
            const nextOffset = query.data.pages.flat().length;
            queryClient.prefetchInfiniteQuery({
                queryKey: ['favorites'],
                queryFn: async ({ pageParam = 0 }) => api.getFavorites(pageParam, PAGE_SIZE),
                getNextPageParam: (lastPage: Image[]) => lastPage.length < PAGE_SIZE ? undefined : nextOffset + PAGE_SIZE,
                initialPageParam: nextOffset,
                pages: 1,
            });
        }
    }, [query.data, query.hasNextPage, query.isFetching, queryClient]);

    return query;
}

export function useToggleFavoriteInFavorites() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.toggleFavorite(id),
        // Optimistic update
        onMutate: async (toggledId) => {
            await queryClient.cancelQueries({ queryKey: ['favorites'] });

            const previousData = queryClient.getQueryData(['favorites']);

            // Optimistically toggle
            queryClient.setQueryData(['favorites'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.map(img =>
                            img.id === toggledId
                                ? { ...img, is_favorite: !img.is_favorite }
                                : img
                        )
                    ),
                };
            });

            return { previousData };
        },
        onError: (_err, _id, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['favorites'], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });
}

export function useDeleteFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.deleteImage(id),
        // Optimistic update
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({ queryKey: ['favorites'] });

            const previousData = queryClient.getQueryData(['favorites']);

            queryClient.setQueryData(['favorites'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.filter(img => img.id !== deletedId)
                    ),
                };
            });

            return { previousData };
        },
        onError: (_err, _id, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['favorites'], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });
}
