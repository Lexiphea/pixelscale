import { useEffect, useState } from 'react';
import { api, type Image } from '@/lib/api';
import ImageEditor from '@/components/ImageEditor';
import { Loader2 } from 'lucide-react';

export default function Gallery() {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);

    useEffect(() => {
        fetchImages();
    }, []);

    const fetchImages = async () => {
        try {
            setLoading(true);
            const data = await api.getImages();
            setImages(data);
        } catch {
            setError('Upload failed. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-end justify-between border-b border-white/5 pb-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-bold tracking-tight font-['Space_Grotesk'] bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">
                        Neural Archive
                    </h1>
                    <p className="text-muted-foreground text-sm uppercase tracking-[0.3em] font-medium opacity-60">
                        Processed Visual Assets
                    </p>
                </div>
                <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/20 text-[10px] font-black uppercase tracking-widest text-primary shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    {images.length} Units Indexed
                </div>
            </div>

            {error && (
                <div className="p-5 rounded-2xl bg-destructive/5 text-destructive border border-destructive/20 animate-in slide-in-from-top-4 border-l-4">
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {loading ? (
                <div className="flex h-96 flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <Loader2 className="h-10 w-10 animate-spin text-primary relative" />
                    </div>
                    <p className="text-xs uppercase tracking-[0.4em] font-bold text-muted-foreground animate-pulse">Scanning Grid...</p>
                </div>
            ) : (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                    {images.map((img) => (
                        <div
                            key={img.id}
                            className="group relative break-inside-avoid cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-[#0a0a0a] transition-all duration-500 hover:border-primary/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1"
                            onClick={() => setSelectedImage(img)}
                        >
                            <img
                                src={img.url}
                                alt={`Image ${img.id}`}
                                className="w-full h-auto block transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
                                loading="lazy"
                            />

                            {/* Overlay Info */}
                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] text-primary font-black uppercase tracking-widest">Index: {img.id.toString().padStart(4, '0')}</p>
                                        <p className="text-[10px] text-white/60 font-medium uppercase">Format Optimized</p>
                                    </div>
                                    <div className="h-8 w-8 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30">
                                        <span className="text-primary text-[10px] font-bold">EDIT</span>
                                    </div>
                                </div>
                            </div>

                            {/* Corner Accents */}
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                <div className="h-2 w-2 border-t-2 border-r-2 border-primary/50" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedImage && (
                <ImageEditor
                    image={selectedImage}
                    isOpen={!!selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}
        </div>
    );
}
