import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload as UploadIcon, FileImage, AlertCircle, Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Upload() {
    const [isDragging, setIsDragging] = useState(false);
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            validateAndAddFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndAddFiles(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    const validateAndAddFiles = (newFiles: File[]) => {
        const validFiles: File[] = [];
        const invalidFiles: string[] = [];

        for (const file of newFiles) {
            if (!file.type.startsWith('image/')) {
                invalidFiles.push(file.name);
            } else {
                validFiles.push(file);
            }
        }

        if (invalidFiles.length > 0) {
            setError(`Invalid file type(s): ${invalidFiles.join(', ')}. Please upload image files only.`);
        } else {
            setError(null);
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleUpload = async () => {
        if (files.length === 0) return;

        try {
            setUploading(true);
            setError(null);
            for (const file of files) {
                await api.uploadImage(file);
            }
            navigate('/');
        } catch {
            setError('Upload failed. Please check your connection and try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 mt-6 pb-12">
            <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold tracking-tight font-['Space_Grotesk'] bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Upload Nexus
                </h1>
                <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    Deploy your visual assets to our high-performance processing engine.
                </p>
            </div>

            <Card
                className={cn(
                    "relative group border-0 rounded-[2rem] p-1 transition-all duration-500 overflow-hidden",
                    isDragging ? "shadow-[0_0_40px_rgba(16,185,129,0.15)] scale-[1.01]" : "hover:shadow-[0_0_30px_rgba(255,255,255,0.02)]"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className={cn(
                    "absolute inset-0 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0",
                    isDragging && "opacity-100"
                )} />

                <div
                    className={cn(
                        "relative bg-[#080808] border-2 border-dashed rounded-[1.9rem] min-h-[400px] flex flex-col items-center justify-center gap-6 transition-all duration-500 cursor-pointer overflow-hidden",
                        isDragging ? "border-primary/50 bg-[#080808]/40" : "border-white/5 hover:border-white/10"
                    )}
                    onClick={() => document.getElementById('file-upload')?.click()}
                >
                    <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {files.length > 0 ? (
                        <div className="w-full h-full p-8 space-y-6 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between w-full max-w-2xl px-2">
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium text-foreground">Manifest</p>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                        {files.length} Unit{files.length !== 1 ? 's' : ''} Ready for uplink
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs uppercase tracking-tighter hover:text-destructive hover:bg-destructive/10 transition-colors"
                                    onClick={() => setFiles([])}
                                >
                                    Eject All
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-2 overflow-y-auto max-h-[300px] scrollbar-hide py-1">
                                {files.map((file, index) => (
                                    <div key={index} className="group/item flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="h-12 w-12 rounded-lg bg-[#0a0a0a] border border-white/5 flex items-center justify-center text-primary shrink-0 group-hover/item:scale-105 transition-transform duration-300">
                                            <FileImage className="h-6 w-6" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate text-white/90">{file.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-muted-foreground opacity-50 hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                                            onClick={() => removeFile(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <p className="text-center text-xs text-muted-foreground uppercase tracking-widest pt-2 font-medium opacity-50">
                                Drag or click to append more units
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-6 py-12">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full scale-150 animate-pulse" />
                                <div className="relative h-24 w-24 rounded-3xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center mb-2 shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <UploadIcon className="h-10 w-10 text-primary" />
                                </div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-2xl font-bold font-['Space_Grotesk'] tracking-tight">Initiate Data Stream</p>
                                <p className="text-sm text-muted-foreground uppercase tracking-[0.2em] font-medium opacity-70">
                                    Drop images here or click to browse
                                </p>
                            </div>
                            <div className="flex gap-4 mt-2">
                                {['JPG', 'PNG', 'WEBP'].map(ext => (
                                    <span key={ext} className="px-3 py-1 rounded-full border border-white/5 bg-white/[0.02] text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
                                        {ext}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {error && (
                <div className="flex items-center gap-3 p-5 rounded-2xl bg-destructive/5 text-destructive border border-destructive/20 animate-in slide-in-from-top-4 border-l-4">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            <div className="flex justify-center pt-4">
                <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || uploading}
                    size="lg"
                    className="group relative min-w-[240px] h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-lg overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:shadow-none"
                >
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative flex items-center justify-center gap-2">
                        {uploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span className="uppercase tracking-widest text-sm font-black">Syncing...</span>
                            </>
                        ) : (
                            <>
                                <span className="uppercase tracking-widest text-sm font-black">
                                    Uplink {files.length > 0 ? `${files.length} Item${files.length !== 1 ? 's' : ''}` : 'Data'}
                                </span>
                            </>
                        )}
                    </div>
                </Button>
            </div>
        </div>
    );
}
