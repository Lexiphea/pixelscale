import { useState, useRef, useEffect } from 'react';
import { type Image } from '@/lib/api';
import { downloadImage } from '@/lib/utils';
import { api } from '@/lib/api';
import ImageEditor from '@/components/ImageEditor';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Star, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import { useFavorites, useDeleteFavorite, useToggleFavoriteInFavorites } from '@/hooks/useFavorites';

export default function Favorites() {
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        error: queryError
    } = useFavorites();

    const deleteFavorite = useDeleteFavorite();
    const toggleFavorite = useToggleFavoriteInFavorites();

    // Flatten pages into single array
    const images = data?.pages.flat() ?? [];

    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Track images that were unfavorited during this session (greyed out)
    const [unfavoritedIds, setUnfavoritedIds] = useState<Set<number>>(new Set());

    const handleDelete = (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;

        try {
            await deleteFavorite.mutateAsync(deleteId);
            if (selectedImage?.id === deleteId) setSelectedImage(null);
            setDeleteId(null);
        } catch (error) {
            console.error("Failed to delete", error);
            setError("Failed to delete image");
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleToggleFavorite = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const updatedImage = await toggleFavorite.mutateAsync(id);

            if (updatedImage.is_favorite) {
                // Re-favorited: remove from unfavorited set
                setUnfavoritedIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(id);
                    return newSet;
                });
            } else {
                // Unfavorited: add to unfavorited set (grey out)
                setUnfavoritedIds(prev => new Set(prev).add(id));
            }
        } catch (error) {
            console.error("Failed to toggle favorite", error);
            setError("Failed to update favorite");
            setTimeout(() => setError(null), 3000);
        }
    };

    // Infinite scroll observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !isLoading && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [fetchNextPage, isLoading, hasNextPage, isFetchingNextPage]);

    // Display error from query if any
    const displayError = error || (queryError ? 'Failed to load favorites. Please check your connection and try again.' : null);

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
                        Favorites
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium tracking-wide">
                        Your starred visual assets
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 border border-white/5 backdrop-blur-sm">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">FAVORITES</p>
                            <p className="text-sm font-bold text-white">{images.filter(img => !unfavoritedIds.has(img.id)).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {displayError && (
                <div className="p-4 rounded-xl bg-destructive/5 text-destructive border border-destructive/10">
                    <p className="text-sm font-medium flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                        {displayError}
                    </p>
                </div>
            )}

            {isLoading ? (
                <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
                    </div>
                    <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/80 animate-pulse">
                        Loading Favorites...
                    </p>
                </div>
            ) : images.length > 0 ? (
                <>
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 pb-20">
                        {images.map((img, idx) => {
                            const isUnfavorited = unfavoritedIds.has(img.id);
                            return (
                                <div
                                    key={img.id}
                                    className={`group relative break-inside-avoid cursor-pointer transition-opacity duration-300 ${isUnfavorited ? 'opacity-40' : ''}`}
                                    onClick={() => setSelectedImage(img)}
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="relative overflow-hidden rounded-xl border border-white/5 bg-card transition-all duration-300 group-hover:border-primary/20 group-hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.1)] group-hover:-translate-y-1">
                                        <img
                                            src={img.url}
                                            alt={`Image ${img.id}`}
                                            className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                                        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-4 transition-transform duration-300 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[10px] uppercase tracking-wider font-bold text-primary/80 mb-0.5">Asset_ID</p>
                                                    <p className="text-xs font-medium text-white font-mono">#{img.user_index.toString().padStart(4, '0')}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-destructive hover:border-destructive hover:text-white transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDelete(img.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </div>
                                                    <div
                                                        className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-primary hover:border-primary hover:text-black transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            downloadImage(api.getDownloadUrl(img.id));
                                                        }}
                                                    >
                                                        <Download className="h-4 w-4" />
                                                    </div>
                                                    <div
                                                        className={`h-8 w-8 rounded-full backdrop-blur-md flex items-center justify-center border transition-colors ${img.is_favorite
                                                            ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30'
                                                            : 'bg-white/10 border-white/10 text-white hover:bg-primary hover:border-primary'
                                                            }`}
                                                        onClick={(e) => handleToggleFavorite(img.id, e)}
                                                    >
                                                        <Star className={`h-4 w-4 ${img.is_favorite ? 'fill-current' : ''}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {(isFetchingNextPage || hasNextPage) && (
                        <div ref={observerTarget} className="h-24 w-full flex items-center justify-center py-8">
                            {isFetchingNextPage && (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs uppercase tracking-widest text-primary/50 font-medium animate-pulse">
                                        Loading Favorites...
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {!hasNextPage && images.length > 0 && (
                        <div className="text-center py-12 pb-24">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">End of Favorites</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col h-[50vh] items-center justify-center text-center border mr-6 rounded-2xl border-dashed border-white/10 bg-white/5 mx-auto w-full">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-muted-foreground">
                        <Star className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-medium text-white">No favorites yet</h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                        Star images from your gallery to add them to your favorites collection.
                    </p>
                    <Link to="/" className="mt-8">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            Browse Gallery
                        </Button>
                    </Link>
                </div>
            )}

            <ImageEditor
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                onDelete={handleDelete}
                onSave={(updatedImage) => {
                    setSelectedImage(updatedImage);
                }}
            />

            <DeleteConfirmModal
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                isDeleting={deleteFavorite.isPending}
            />
        </div>
    );
}
