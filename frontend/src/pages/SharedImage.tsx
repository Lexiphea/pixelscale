import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type SharedImageResponse } from '@/lib/api';
import { Loader2, Clock, ImageOff, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadImage } from '@/lib/utils';

export default function SharedImage() {
    const { shareId } = useParams<{ shareId: string }>();
    const [data, setData] = useState<SharedImageResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shareId) {
            setError('Invalid share link');
            setLoading(false);
            return;
        }

        const fetchImage = async () => {
            try {
                const result = await api.getSharedImage(shareId);
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load shared image');
            } finally {
                setLoading(false);
            }
        };

        fetchImage();
    }, [shareId]);

    const formatExpiration = (isoDate: string | null) => {
        if (!isoDate) return 'Never expires';
        const date = new Date(isoDate);
        return `Expires ${date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center gap-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
                </div>
                <p className="text-sm uppercase tracking-[0.2em] font-bold text-primary/80 animate-pulse">
                    Loading shared image...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center p-8">
                <div className="max-w-md text-center space-y-6">
                    <div className="h-24 w-24 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
                        <ImageOff className="h-10 w-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        {error.includes('expired') ? 'Link Expired' : 'Image Not Found'}
                    </h1>
                    <p className="text-muted-foreground">
                        {error.includes('expired')
                            ? 'This share link has expired and is no longer accessible.'
                            : 'The shared image could not be found. It may have been deleted or the link is invalid.'}
                    </p>
                    <Link to="/login">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Go to PixelScale
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-[#030303] flex flex-col">
            {/* Header */}
            <header className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-2xl font-bold tracking-tight font-['Space_Grotesk']">
                            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                                PixelScale
                            </span>
                        </Link>
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium uppercase tracking-wider">
                            Shared
                        </span>
                    </div>
                    <Button
                        onClick={() => downloadImage(data.image_url)}
                        className="bg-primary hover:bg-primary/90 text-black"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-8">
                <div className="max-w-5xl w-full space-y-6">
                    {/* Image Container */}
                    <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A] shadow-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                        <img
                            src={data.image_url}
                            alt={data.filename}
                            className="w-full h-auto max-h-[70vh] object-contain"
                        />
                    </div>

                    {/* Info Bar */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <div className="space-y-1">
                            <p className="text-white font-medium">{data.filename}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>{formatExpiration(data.expires_at)}</span>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => downloadImage(data.image_url)}
                            className="border-white/10 hover:bg-white/5"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/5 py-6 text-center">
                <p className="text-xs text-muted-foreground">
                    Shared via <Link to="/login" className="text-primary hover:underline">PixelScale</Link>
                </p>
            </footer>
        </div>
    );
}
