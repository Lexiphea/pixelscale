import { useEffect, useState } from 'react';
import { api, type Image } from '@/lib/api';
import { Card } from '@/components/ui/card';
import ImageEditor from '@/components/ImageEditor';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        } catch (err) {
            setError('Failed to load images. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
                <div className="text-sm text-muted-foreground">
                    {images.length} items
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {images.map((img) => (
                        <Card
                            key={img.id}
                            className={cn(
                                "group relative aspect-square overflow-hidden cursor-pointer border-0 bg-secondary/30",
                                "hover:ring-2 hover:ring-primary hover:ring-offset-2 hover:ring-offset-background transition-all duration-300"
                            )}
                            onClick={() => setSelectedImage(img)}
                        >
                            <img
                                src={img.url}
                                alt={`Image ${img.id}`}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <span className="text-white font-medium px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-sm border border-white/10">
                                    Edit
                                </span>
                            </div>
                        </Card>
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
