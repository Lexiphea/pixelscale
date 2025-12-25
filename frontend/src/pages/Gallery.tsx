import { useEffect, useState, useRef, useCallback } from 'react';
import { api, type Image } from '@/lib/api';
import { downloadImage, cn } from '@/lib/utils';
import ImageEditor from '@/components/ImageEditor';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, Star, LayoutGrid, Image as ImageIcon, Download, Trash2, Upload as UploadIcon } from 'lucide-react';

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

    const handleToggleFavorite = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const updatedImage = await api.toggleFavorite(id);
            setImages(prev => prev.map(img => img.id === id ? updatedImage : img));
        } catch (error) {
            console.error("Failed to toggle favorite", error);
            setError("Failed to update favorite");
            setTimeout(() => setError(null), 3000);
        }
    };

    const loadMore = useCallback(async () => {
        if (isLoadingMore.current || !hasMore) return;

        try {
            isLoadingMore.current = true;
            setIsFetchingMore(true);

            // Get current length via functional update to avoid stale closure
            let currentLength = 0;
            setImages(prev => {
                currentLength = prev.length;
                return prev;
            });

            const newImages = await api.getImages(currentLength, 50);

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
    }, [hasMore]);

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
            {/* Dashboard Hero Section */}
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                <div className="col-span-2 space-y-2">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-['Space_Grotesk']">
                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent neon-text">
                            Dashboard
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Welcome to your own <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent font-semibold animate-gradient bg-[length:200%_auto]">MindSpace</span>.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between group hover:border-primary/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ImageIcon className="w-12 h-12 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Assets</p>
                        <h3 className="text-3xl font-bold mt-2 text-white group-hover:text-primary transition-colors font-mono">
                            {images.length}
                        </h3>
                    </div>
                    <div className="w-full bg-white/5 h-1 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-primary/50 w-3/4" />
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl flex flex-col justify-between group hover:border-yellow-500/30 transition-colors relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Star className="w-12 h-12 text-yellow-500" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Favorites</p>
                        <h3 className="text-3xl font-bold mt-2 text-white group-hover:text-yellow-400 transition-colors font-mono">
                            {images.filter(i => i.is_favorite).length}
                        </h3>
                    </div>
                    <div className="w-full bg-white/5 h-1 mt-4 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500/50 w-1/2" />
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-8 pb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <LayoutGrid className="w-5 h-5 text-primary" />
                    Recent Uploads
                </h2>
                <Link to="/upload">
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300">
                        <UploadIcon className="w-4 h-4 mr-2" />
                        Upload New
                    </Button>
                </Link>
            </div>

            {error && (
                <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 backdrop-blur-md">
                    <p className="text-sm font-medium flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                        {error}
                    </p>
                </div>
            )}

            {loading ? (
                <div className="flex h-[40vh] flex-col items-center justify-center gap-6">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
                    </div>
                    <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary/80 animate-pulse">
                        Synchronizing Neural Network...
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
                                <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A] transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.2)] group-hover:-translate-y-2">
                                    <img
                                        src={img.url}
                                        alt={`Image ${img.id}`}
                                        className="w-full h-auto block transition-transform duration-500 group-hover:scale-110"
                                        loading="lazy"
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

                                    {/* Content on Hover */}
                                    <div className="absolute inset-x-0 bottom-0 p-5 translate-y-4 transition-transform duration-200 group-hover:translate-y-0 opacity-0 group-hover:opacity-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">Asset ID</p>
                                                <p className="text-lg font-bold text-white font-mono tracking-tight">#{img.user_index.toString().padStart(4, '0')}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-9 w-9 bg-white/10 hover:bg-primary hover:text-black border-0 backdrop-blur-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    downloadImage(api.getDownloadUrl(img.id));
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className={cn("h-9 w-9 bg-white/10 border-0 backdrop-blur-md hover:bg-yellow-500 hover:text-black", img.is_favorite && "text-yellow-400 bg-yellow-500/20")}
                                                onClick={(e) => handleToggleFavorite(img.id, e)}
                                            >
                                                <Star className={cn("h-4 w-4", img.is_favorite && "fill-current")} />
                                            </Button>
                                            <div className="flex-1" />
                                            <Button size="icon" variant="destructive" className="h-9 w-9 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border-0 backdrop-blur-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(img.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Corner Accents */}
                                    <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-primary/0 group-hover:border-primary/50 transition-all duration-300 rounded-tl-lg" />
                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-primary/0 group-hover:border-primary/50 transition-all duration-300 rounded-br-lg" />
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
                            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/5 backdrop-blur-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-pulse" />
                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">End of Archive</p>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="glass-panel border-dashed border-white/10 rounded-3xl p-16 text-center max-w-2xl mx-auto mt-12 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10">
                        <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-8 mx-auto group-hover:scale-110 transition-transform duration-500 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                            <UploadIcon className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-3">No Assets Found</h3>
                        <p className="text-muted-foreground max-w-md mx-auto mb-10">
                            Your digital vault is empty. Upload your first visual asset to initialize the neural processing pipeline.
                        </p>
                        <Link to="/upload">
                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] transition-all duration-300 h-12 px-8 text-base">
                                <UploadIcon className="w-5 h-5 mr-2" />
                                Initialize Upload
                            </Button>
                        </Link>
                    </div>
                </div>
            )}

            <ImageEditor
                image={selectedImage}
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                onDelete={handleDelete}
                onSave={(updatedImage) => {
                    setImages(prev => prev.map(img =>
                        img.id === updatedImage.id ? updatedImage : img
                    ));
                    setSelectedImage(updatedImage);
                }}
            />
        </div>
    );
}
