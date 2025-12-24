import { useState, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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

    // Reset filters when opening a new image
    useEffect(() => {
        if (isOpen) {
            setBrightness(100);
            setContrast(100);
            setGrayscale(0);
        }
    }, [isOpen, image]);

    const filterString = `brightness(${brightness}%) contrast(${contrast}%) grayscale(${grayscale}%)`;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl w-[90vw] h-[90vh] flex flex-col p-4 bg-card/95 backdrop-blur-xl border-border/50">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Image Editor</DialogTitle>
                </DialogHeader>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden mt-4">

                    {/* Image Preview */}
                    <div className="flex-1 flex items-center justify-center bg-black/50 rounded-xl border border-border/30 overflow-hidden relative group">
                        <img
                            src={image.url}
                            alt="Preview"
                            className="max-h-full max-w-full object-contain transition-all duration-200"
                            style={{ filter: filterString }}
                        />
                        <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-xl" />
                    </div>

                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 flex flex-col gap-6 p-4 rounded-xl bg-background/50 border border-border/50 overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="font-medium text-primary">Adjustments</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <label>Brightness</label>
                                    <span className="text-muted-foreground">{brightness}%</span>
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
                                <div className="flex justify-between text-sm">
                                    <label>Contrast</label>
                                    <span className="text-muted-foreground">{contrast}%</span>
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
                                <div className="flex justify-between text-sm">
                                    <label>Grayscale</label>
                                    <span className="text-muted-foreground">{grayscale}%</span>
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

                        <div className="flex-1" /> {/* Spacer */}

                        <DialogFooter className="flex-col gap-2 sm:justify-between">
                            <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
                            {/* <Button className="w-full" onClick={() => alert("Save function to be implemented with backend")}>Save Changes</Button> */}
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
