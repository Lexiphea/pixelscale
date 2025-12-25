import { useEffect, useState, useRef, useCallback } from 'react';
import { api, type Image } from '@/lib/api';
import { downloadImage } from '@/lib/utils';
import ImageEditor from '@/components/ImageEditor';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, LayoutGrid, Image as ImageIcon, Download, Trash2 } from 'lucide-react';

export default function Gallery() {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const observerTarget = useRef<HTMLDivElement>(null);
    const isLoadingMore = useRef(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    useEffect(() => {
        loadInitial();
    }, []);

    const loadInitial = async () => {
        try {
            setLoading(true);
            const data = await api.getImages(0, 50);
            setImages(data);
            if (data.length < 50) setHasMore(false);
        } catch {
            setError('Failed to load images. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this asset? This action cannot be undone.")) return;

        try {
            await api.deleteImage(id);
            setImages(prev => prev.filter(img => img.id !== id));
            if (selectedImage?.id === id) setSelectedImage(null);
        } catch (error) {
            console.error("Failed to delete", error);
            setError("Failed to delete image");
            setTimeout(() => setError(null), 3000);
        }
    };

    const loadMore = useCallback(async () => {
        if (isLoadingMore.current || !hasMore) return;

        try {
            isLoadingMore.current = true;
            setIsFetchingMore(true);
            const skip = images.length;
            const newImages = await api.getImages(skip, 50);

            if (newImages.length < 50) {
                setHasMore(false);
            }

            if (newImages.length > 0) {
                setImages(prev => [...prev, ...newImages]);
            }
        } catch (error) {
            console.error('Failed to load more images:', error);
        } finally {
            isLoadingMore.current = false;
            setIsFetchingMore(false);
        }
    }, [images.length, hasMore]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && !loading && hasMore) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadMore, loading, hasMore]);

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="space-y-2">
                    <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
                        Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium tracking-wide">
                        Manage and process your visual assets
                    </p>
                </div>

                <div className="flex gap-4">
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 border border-white/5 backdrop-blur-sm">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">INDEXES</p>
                            <p className="text-sm font-bold text-white">{images.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/5 text-destructive border border-destructive/10">
                    <p className="text-sm font-medium flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                        {error}
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
                    </div>
                    <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground/80 animate-pulse">
                        Synchronizing...
                    </p>
                </div>
            ) : images.length > 0 ? (
                <>
                    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 pb-20">
                        {images.map((img, idx) => (
                            <div
                                key={img.id}
                                className="group relative break-inside-avoid cursor-pointer"
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
                                                <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-primary hover:border-primary transition-colors">
                                                    <Zap className="h-4 w-4 fill-current" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {(isFetchingMore || hasMore) && (
                        <div ref={observerTarget} className="h-24 w-full flex items-center justify-center py-8">
                            {isFetchingMore && (
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <span className="text-xs uppercase tracking-widest text-primary/50 font-medium animate-pulse">
                                        Loading Assets...
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {!hasMore && images.length > 0 && (
                        <div className="text-center py-12 pb-24">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">End of Archive</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="flex flex-col h-[50vh] items-center justify-center text-center border mr-6 rounded-2xl border-dashed border-white/10 bg-white/5 mx-auto w-full">
                    <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-muted-foreground">
                        <LayoutGrid className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-medium text-white">No images yet</h3>
                    <p className="text-muted-foreground text-sm mt-2 max-w-sm mx-auto">
                        Your gallery is empty. Upload your first visual asset to get started with the processing pipeline.
                    </p>
                    <Link to="/upload" className="mt-8">
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                            Upload Assets
                        </Button>
                    </Link>
                </div>
            )}

            <ImageEditor
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                onDelete={handleDelete}
            />
        </div>
    );
}
