import { useEffect, useState } from 'react';
import { api, type ShareLinkListItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, Share2, Copy, Check, Trash2, Clock, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import RevokeConfirmModal from '@/components/RevokeConfirmModal';

export default function Shared() {
    const [links, setLinks] = useState<ShareLinkListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [linkToRevoke, setLinkToRevoke] = useState<ShareLinkListItem | null>(null);

    useEffect(() => {
        loadLinks();
    }, []);

    const loadLinks = async () => {
        try {
            setLoading(true);
            const data = await api.getShareLinks();
            setLinks(data);
        } catch {
            setError('Failed to load share links');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (shareId: string) => {
        try {
            // Convert backend URL to frontend URL
            const frontendUrl = `${window.location.origin}/s/${shareId}`;
            await navigator.clipboard.writeText(frontendUrl);
            setCopiedId(shareId);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = `${window.location.origin}/s/${shareId}`;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedId(shareId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    const handleDeleteClick = (link: ShareLinkListItem) => {
        setLinkToRevoke(link);
        setIsModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!linkToRevoke) return;

        try {
            setDeletingId(linkToRevoke.share_id);
            await api.deleteShareLink(linkToRevoke.share_id);
            setLinks(prev => prev.filter(link => link.share_id !== linkToRevoke.share_id));
            setIsModalOpen(false);
        } catch {
            setError('Failed to delete share link');
            setTimeout(() => setError(null), 3000);
        } finally {
            setDeletingId(null);
            setLinkToRevoke(null);
        }
    };

    const formatDate = (isoDate: string) => {
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatExpiration = (expiresAt: string | null, isExpired: boolean) => {
        if (!expiresAt) return 'Never expires';
        if (isExpired) return 'Expired';
        return `Expires ${formatDate(expiresAt)}`;
    };

    return (
        <div className="space-y-8 max-w-[1200px] mx-auto">
            {/* Header */}
            <div className="space-y-2 animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-['Space_Grotesk']">
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        Shared Links
                    </span>
                </h1>
                <p className="text-muted-foreground text-lg">
                    Manage your publicly shared images
                </p>
            </div>

            {/* Stats Card */}
            <div className="glass-panel p-6 rounded-2xl flex items-center justify-between group hover:border-cyan-500/30 transition-colors">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <Share2 className="h-6 w-6 text-cyan-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Links</p>
                        <h3 className="text-2xl font-bold text-white font-mono">
                            {links.filter(l => !l.is_expired).length}
                        </h3>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total: {links.length}</p>
                    <p className="text-xs text-yellow-500">{links.filter(l => l.is_expired).length} expired</p>
                </div>
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
                        <div className="absolute inset-0 bg-cyan-500/20 blur-2xl rounded-full scale-150 animate-pulse" />
                        <Loader2 className="h-12 w-12 animate-spin text-cyan-400 relative" />
                    </div>
                    <p className="text-sm uppercase tracking-[0.2em] font-bold text-cyan-400/80 animate-pulse">
                        Loading shared links...
                    </p>
                </div>
            ) : links.length > 0 ? (
                <div className="space-y-4">
                    {links.map((link) => (
                        <div
                            key={link.share_id}
                            className={cn(
                                "glass-panel p-4 rounded-2xl flex items-center gap-4 transition-all duration-300",
                                link.is_expired
                                    ? "opacity-60 border-yellow-500/20"
                                    : "hover:border-cyan-500/30"
                            )}
                        >
                            {/* Thumbnail */}
                            <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                                {link.image_url ? (
                                    <img
                                        src={link.image_url}
                                        alt={link.image_filename}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center">
                                        <Share2 className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-medium text-white truncate">{link.image_filename}</p>
                                    {link.is_expired && (
                                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-[10px] font-bold uppercase">
                                            Expired
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatExpiration(link.expires_at, link.is_expired)}
                                    </span>
                                    <span>Created {formatDate(link.created_at)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                {!link.is_expired && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCopy(link.share_id)}
                                            className="h-9 px-3 border-white/10 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-400"
                                        >
                                            {copiedId === link.share_id ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1.5" />
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4 mr-1.5" />
                                                    Copy
                                                </>
                                            )}
                                        </Button>
                                        <a
                                            href={`/s/${link.share_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 border-white/10 hover:bg-white/5"
                                                title="Open link"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </Button>
                                        </a>
                                    </>
                                )}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteClick(link)}
                                    disabled={deletingId === link.share_id}
                                    className="h-9 w-9 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 text-red-500"
                                    title="Revoke link"
                                >
                                    {deletingId === link.share_id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-panel border-dashed border-white/10 rounded-3xl p-16 text-center max-w-2xl mx-auto">
                    <div className="h-24 w-24 rounded-full bg-cyan-500/10 flex items-center justify-center mb-8 mx-auto">
                        <Share2 className="h-10 w-10 text-cyan-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">No Shared Links</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        You haven't shared any images yet. Go to the Gallery and click the share button on any image to create a public link.
                    </p>
                </div>
            )}

            <RevokeConfirmModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={confirmDelete}
                isRevoking={deletingId !== null}
                filename={linkToRevoke?.image_filename}
            />
        </div>
    );
}
