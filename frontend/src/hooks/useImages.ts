import { useEffect } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type Image, type ImageProcessingOptions } from '@/lib/api';

const PAGE_SIZE = 50;

export function useImages() {
    const queryClient = useQueryClient();

    const query = useInfiniteQuery({
        queryKey: ['images'],
        queryFn: async ({ pageParam = 0 }) => {
            const images = await api.getImages(pageParam, PAGE_SIZE);
            return images;
        },
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < PAGE_SIZE) return undefined;
            return allPages.flat().length;
        },
        initialPageParam: 0,
        staleTime: 5 * 60 * 1000,
    });

    // Prefetch next page when current data loads
    useEffect(() => {
        if (query.data && query.hasNextPage && !query.isFetching) {
            const nextOffset = query.data.pages.flat().length;
            queryClient.prefetchInfiniteQuery({
                queryKey: ['images'],
                queryFn: async ({ pageParam = 0 }) => api.getImages(pageParam, PAGE_SIZE),
                getNextPageParam: (lastPage: Image[]) => lastPage.length < PAGE_SIZE ? undefined : nextOffset + PAGE_SIZE,
                initialPageParam: nextOffset,
                pages: 1,
            });
        }
    }, [query.data, query.hasNextPage, query.isFetching, queryClient]);

    return query;
}

export function useDeleteImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.deleteImage(id),
        // Optimistic update - remove immediately before server responds
        onMutate: async (deletedId) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['images'] });

            // Snapshot previous value
            const previousData = queryClient.getQueryData(['images']);

            // Optimistically remove from cache
            queryClient.setQueryData(['images'], (oldData: any) => {
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
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(['images'], context.previousData);
            }
        },
        onSettled: () => {
            // Always refetch after error or success to ensure sync
            queryClient.invalidateQueries({ queryKey: ['images'] });
        },
    });
}

export function useToggleFavorite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => api.toggleFavorite(id),
        // Optimistic update - toggle immediately before server responds
        onMutate: async (toggledId) => {
            await queryClient.cancelQueries({ queryKey: ['images'] });

            const previousData = queryClient.getQueryData(['images']);

            // Optimistically toggle favorite
            queryClient.setQueryData(['images'], (oldData: any) => {
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
                queryClient.setQueryData(['images'], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['images'] });
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });
}

export function useProcessImage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, options }: { id: number; options: ImageProcessingOptions }) =>
            api.processImage(id, options),
        onSuccess: (updatedImage) => {
            // Update the image in the 'images' cache
            queryClient.setQueryData(['images'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.map(img =>
                            img.id === updatedImage.id ? updatedImage : img
                        )
                    ),
                };
            });

            // Update the image in the 'favorites' cache
            queryClient.setQueryData(['favorites'], (oldData: any) => {
                if (!oldData) return oldData;
                return {
                    ...oldData,
                    pages: oldData.pages.map((page: Image[]) =>
                        page.map(img =>
                            img.id === updatedImage.id ? updatedImage : img
                        )
                    ),
                };
            });
        },
    });
}
