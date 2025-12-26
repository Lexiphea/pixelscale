import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { api, type ShareDuration, type Image as ImageType } from '@/lib/api';
import { Share2, Copy, Check, Link, Clock, Loader2 } from 'lucide-react';

interface ShareModalProps {
    image: ImageType | null;
    isOpen: boolean;
    onClose: () => void;
}

const DURATION_OPTIONS: { value: ShareDuration; label: string; description: string }[] = [
    { value: '1_day', label: '1 Day', description: 'Expires in 24 hours' },
    { value: '1_week', label: '1 Week', description: 'Expires in 7 days' },
    { value: 'forever', label: 'Forever', description: 'Never expires' },
];

export default function ShareModal({ image, isOpen, onClose }: ShareModalProps) {
    const [duration, setDuration] = useState<ShareDuration>('1_week');
    const [isGenerating, setIsGenerating] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!image) return;

        setIsGenerating(true);
        setError(null);

        try {
            const result = await api.createShareLink(image.id, duration);
            // Convert backend URL to frontend URL for sharing
            const frontendShareUrl = `${window.location.origin}/s/${result.share_id}`;
            setShareUrl(frontendShareUrl);
            setExpiresAt(result.expires_at);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create share link');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!shareUrl) return;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleClose = () => {
        setShareUrl(null);
        setExpiresAt(null);
        setCopied(false);
        setError(null);
        onClose();
    };

    const formatExpiration = (isoDate: string | null) => {
        if (!isoDate) return 'Never';
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!image) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md bg-[#050505]/95 backdrop-blur-2xl border-white/5 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <DialogHeader className="border-b border-white/5 pb-4">
                    <DialogTitle className="text-xl font-bold font-['Space_Grotesk'] tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent flex items-center gap-2">
                        <Share2 className="h-5 w-5 text-primary" />
                        Share Image
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!shareUrl ? (
                        <>
                            {/* Image Preview */}
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                <img
                                    src={image.url}
                                    alt={image.filename}
                                    className="w-16 h-16 object-cover rounded-lg"
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{image.filename}</p>
                                    <p className="text-xs text-muted-foreground">Select expiration below</p>
                                </div>
                            </div>

                            {/* Duration Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
                                    Link Expires In
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DURATION_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() => setDuration(option.value)}
                                            className={`p-3 rounded-xl border transition-all text-center ${duration === option.value
                                                    ? 'bg-primary/20 border-primary/50 text-primary'
                                                    : 'bg-white/[0.02] border-white/10 text-white/70 hover:bg-white/5 hover:border-white/20'
                                                }`}
                                        >
                                            <div className="text-sm font-bold">{option.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black uppercase tracking-widest text-[10px] font-black"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Link className="h-4 w-4 mr-2" />
                                        Generate Share Link
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Success State */}
                            <div className="text-center py-4">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center">
                                    <Check className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Link Created!</h3>
                                <p className="text-sm text-muted-foreground">
                                    Anyone with this link can view the image
                                </p>
                            </div>

                            {/* Share URL */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                                    <input
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="flex-1 bg-transparent text-sm text-white/80 outline-none truncate"
                                    />
                                    <Button
                                        onClick={handleCopy}
                                        variant="ghost"
                                        size="sm"
                                        className={`shrink-0 ${copied ? 'text-primary' : 'text-white/60 hover:text-white'}`}
                                    >
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>Expires: {formatExpiration(expiresAt)}</span>
                                </div>
                            </div>

                            {/* Copy Button */}
                            <Button
                                onClick={handleCopy}
                                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black uppercase tracking-widest text-[10px] font-black"
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Link
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
