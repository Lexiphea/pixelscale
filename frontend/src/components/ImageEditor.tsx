import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type Image as ImageType } from '@/lib/api';

interface ImageEditorProps {
    image: ImageType;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageEditor({ image, isOpen, onClose }: ImageEditorProps) {
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [grayscale, setGrayscale] = useState(0);

    // State is now reset via 'key' prop in parent
    const filterString = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;

    return (
        <div className="max-w-4xl mx-auto space-y-10 mt-6 pb-12">
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] flex flex-col p-6 bg-[#050505]/95 backdrop-blur-2xl border-white/5 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)]">
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
                                src={image.url}
                                alt="Preview"
                                className="max-h-full max-w-full object-contain transition-all duration-300"
                                style={{ filter: filterString }}
                            />
                            <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-3xl" />
                        </div>

                        {/* Controls Sidebar */}
                        <div className="w-full md:w-80 flex flex-col gap-8 p-6 rounded-3xl bg-white/[0.02] border border-white/5 overflow-y-auto">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Parameters</h3>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium opacity-50">Manual Override Enabled</p>
                                </div>

                                <div className="space-y-4">
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
        </div>
    );
}
