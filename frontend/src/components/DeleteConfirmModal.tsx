import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, isDeleting }: DeleteConfirmModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isDeleting && onClose()}>
            <DialogContent className="sm:max-w-[400px] bg-[#050505]/95 backdrop-blur-2xl border-white/5 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] p-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-transparent pointer-events-none" />

                <div className="p-8 space-y-6 relative z-10">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)] animate-pulse">
                            <Trash2 className="h-10 w-10 text-red-500" />
                        </div>
                    </div>

                    <div className="space-y-2 text-center">
                        <DialogTitle className="text-2xl font-bold font-['Space_Grotesk'] tracking-tight text-white">
                            Delete Asset?
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
                            Are you sure you want to permanently delete this asset? This action cannot be undone and will remove the file from your storage.
                        </DialogDescription>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            onClick={onConfirm}
                            disabled={isDeleting}
                            className="w-full h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white uppercase tracking-widest text-[10px] font-black transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Confirm Deletion"
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="w-full h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 uppercase tracking-widest text-[10px] font-black transition-colors"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>

                {/* Decorative bottom bar */}
                <div className="h-1 w-full bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            </DialogContent>
        </Dialog>
    );
}
