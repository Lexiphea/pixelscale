import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload as UploadIcon, FileImage, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Upload() {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
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

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file (JPG, PNG, WEBP).');
            return;
        }
        setError(null);
        setFile(file);
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            setError(null);
            await api.uploadImage(file);
            // Wait a bit to show success state? Or just redirect.
            navigate('/');
        } catch (err) {
            setError('Upload failed. Please check your connection and try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8 mt-10">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Upload Image</h1>
                <p className="text-muted-foreground">
                    Upload your images to PixelScale for processing and hosting.
                </p>
            </div>

            <Card
                className={cn(
                    "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-4 transition-all duration-200",
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                    "h-64 cursor-pointer relative"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('file-upload')?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {file ? (
                    <div className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <FileImage className="h-8 w-8" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-lg">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                            Remove
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
                            <UploadIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-lg font-medium">Click or drag image to upload</p>
                            <p className="text-sm text-muted-foreground">
                                Supports JPG, PNG, WEBP up to 10MB
                            </p>
                        </div>
                    </>
                )}
            </Card>

            {error && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 animate-in slide-in-from-top-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>{error}</p>
                </div>
            )}

            <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={() => navigate('/')} disabled={uploading}>
                    Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || uploading} className="min-w-[120px]">
                    {uploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                        </>
                    ) : (
                        <>
                            Upload Image
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
