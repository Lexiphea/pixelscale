import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Image as ImageType, api } from '@/lib/api';

interface ImageEditorProps {
    image: ImageType | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageEditor({ image, isOpen, onClose }: ImageEditorProps) {
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [grayscale, setGrayscale] = useState(0);
    const [lastValidImage, setLastValidImage] = useState<ImageType | null>(image);
    const [isSaving, setIsSaving] = useState(false);
    const [showOriginal, setShowOriginal] = useState(false);

    useEffect(() => {
        if (image) {
            setLastValidImage(image);

            // If image has saved options, load them and use original image as base
            if (image.options) {
                // Backend: 0 (default) -> Frontend: 100 (default)
                setBrightness((image.options.brightness || 0) + 100);
                setContrast((image.options.contrast || 0) + 100);
                // Backend: Saturation 0 to -100 -> Frontend: Grayscale 0 to 100
                setGrayscale(image.options.saturation ? -image.options.saturation : 0);
            } else {
                // Reset filters when a new image is opened without options
                setBrightness(100);
                setContrast(100);
                setGrayscale(0);
            }
        }
    }, [image]);

    // Use the current image if available, otherwise fallback to the last valid one (for closing animation)
    const displayImage = image || lastValidImage;

    // If we have no image at all, don't render content (shouldn't happen in normal flow)
    if (!displayImage) return null;

    // If image has options, we MUST use the original URL to apply CSS filters on top to avoid double-application
    // Otherwise use default logic
    const hasOptions = !!displayImage.options;

    // Logic:
    // 1. If showing original -> straight original_url
    // 2. If has saved options -> use original_url (base) + CSS filters
    // 3. If no options -> use processed url (which is just default) + CSS filters

    // To ensure consistency, if we are editing, it's safer to always base off ORIGINAL if available, 
    // but the requirement is to use processed if no edits.
    // Actually, "Process Image" backend updates the processed URL. 
    // If we load that processed URL AND apply CSS, it's double.
    // SO: If options exist, we must use original_url as the <img src> so CSS applies once.

    const effectiveImageSource = (showOriginal || hasOptions) && displayImage.original_url
        ? displayImage.original_url
        : displayImage.url;

    const filterString = showOriginal ? 'none' : `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="sm:max-w-4xl w-[95vw] h-[90vh] flex flex-col p-6 bg-[#050505]/95 backdrop-blur-2xl border-white/5 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                onCloseAutoFocus={(e) => {
                    e.preventDefault();
                    (document.activeElement as HTMLElement)?.blur();
                }}
            >
                <DialogHeader className="border-b border-white/5 pb-4">
                    <DialogTitle className="text-2xl font-bold font-['Space_Grotesk'] tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Visual Processor
                    </DialogTitle>
                </DialogHeader>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-8 min-h-0 mt-6 overflow-hidden">

                    {/* Image Preview Container */}
                    <div className="flex-[2] flex items-center justify-center bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden relative group shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                        <img
                            src={effectiveImageSource}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain transition-all duration-300"
                            style={{ filter: filterString }}
                        />
                        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-3xl" />
                    </div>

                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 flex flex-col gap-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 overflow-y-auto">
                        <div className="space-y-6">
                            <div className="flex items-center justify-between min-h-[32px]">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Parameters</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-50">Manual Override Enabled</p>
                                </div>
                                {displayImage.original_url && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-8 border border-white/10 px-3 text-[10px] font-bold uppercase tracking-wider ${showOriginal ? 'bg-primary/20 text-primary border-primary/30' : 'text-muted-foreground hover:text-white'}`}
                                        onMouseDown={() => setShowOriginal(true)}
                                        onMouseUp={() => setShowOriginal(false)}
                                        onMouseLeave={() => setShowOriginal(false)}
                                    >
                                        {showOriginal ? 'Viewing Original' : 'Hold to Compare'}
                                    </Button>
                                )}
                            </div>

                            <div className={`space-y-4 transition-opacity duration-200 ${showOriginal ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs uppercase tracking-tighter">
                                        <label className="font-bold text-white/70">Brightness</label>
                                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{brightness}%</span>
                                    </div>
                                    <Slider
                                        value={[brightness]}
                                        min={0}
                                        max={200}
                                        step={1}
                                        onValueChange={(v) => setBrightness(v[0])}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs uppercase tracking-tighter">
                                        <label className="font-bold text-white/70">Contrast</label>
                                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{contrast}%</span>
                                    </div>
                                    <Slider
                                        value={[contrast]}
                                        min={0}
                                        max={200}
                                        step={1}
                                        onValueChange={(v) => setContrast(v[0])}
                                        className="py-2"
                                    />
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-xs uppercase tracking-tighter">
                                        <label className="font-bold text-white/70">Grayscale</label>
                                        <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{grayscale}%</span>
                                    </div>
                                    <Slider
                                        value={[grayscale]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={(v) => setGrayscale(v[0])}
                                        className="py-2"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1" /> {/* Spacer */}

                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={async () => {
                                    if (!displayImage) return;
                                    try {
                                        setIsSaving(true);
                                        // Map frontend values to backend options
                                        // Brightness/Contrast: 0-200 -> -100 to 100
                                        // Grayscale: 0-100 -> Saturation 0 to -100
                                        await api.processImage(displayImage.id, {
                                            brightness: brightness - 100,
                                            contrast: contrast - 100,
                                            saturation: -grayscale,
                                        });
                                        // Reload page to see changes (for now, or parent could allow callback)
                                        window.location.reload();
                                    } catch (error) {
                                        console.error('Failed to save:', error);
                                        // Optional: Add toast error here
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }}
                                disabled={isSaving}
                                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-black uppercase tracking-widest text-[10px] font-black"
                            >
                                {isSaving ? 'Processing...' : 'Save Changes'}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={onClose}
                                className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 uppercase tracking-widest text-[10px] font-black"
                            >
                                Terminate Session
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
