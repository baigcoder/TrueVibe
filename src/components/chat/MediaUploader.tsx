import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, FileText, Mic, X, Camera, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaUploaderProps {
    isOpen: boolean;
    onClose: () => void;
    onFilesSelected: (files: File[], type: 'image' | 'video' | 'file') => void;
    onVoiceRecord: () => void;
    onCreateVoiceRoom?: () => void;
}

const menuItems = [
    {
        id: 'image',
        label: 'Photo',
        Icon: Image,
        accept: 'image/*',
        color: 'from-emerald-500 to-teal-500',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/20',
    },
    {
        id: 'video',
        label: 'Video',
        Icon: Video,
        accept: 'video/*',
        color: 'from-violet-500 to-purple-500',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/20',
    },
    {
        id: 'file',
        label: 'Document',
        Icon: FileText,
        accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip',
        color: 'from-amber-500 to-orange-500',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/20',
    },
    {
        id: 'voice',
        label: 'Voice',
        Icon: Mic,
        accept: '',
        color: 'from-rose-500 to-pink-500',
        bgColor: 'bg-rose-500/10',
        borderColor: 'border-rose-500/20',
    },
    {
        id: 'voiceroom',
        label: 'Voice Room',
        Icon: Users,
        accept: '',
        color: 'from-indigo-500 to-purple-600',
        bgColor: 'bg-indigo-500/10',
        borderColor: 'border-indigo-500/20',
    },
];

export function MediaUploader({
    isOpen,
    onClose,
    onFilesSelected,
    onVoiceRecord,
    onCreateVoiceRoom,
}: MediaUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const currentTypeRef = useRef<'image' | 'video' | 'file'>('image');

    const handleItemClick = (item: typeof menuItems[0]) => {
        if (item.id === 'voice') {
            onVoiceRecord();
            onClose();
            return;
        }

        if (item.id === 'voiceroom') {
            onCreateVoiceRoom?.();
            onClose();
            return;
        }

        currentTypeRef.current = item.id as 'image' | 'video' | 'file';
        if (fileInputRef.current) {
            fileInputRef.current.accept = item.accept;
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onFilesSelected(files, currentTypeRef.current);
            onClose();
        }
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40"
                    />

                    {/* Menu */}
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute bottom-full left-0 mb-6 z-50 min-w-[320px]"
                    >
                        <div className="glass-luxe rounded-[2rem] border border-primary/20 p-4 shadow-[0_20px_80px_rgba(0,0,0,0.9)] relative overflow-hidden">
                            {/* Background Accents */}
                            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

                            <div className="flex items-center gap-3 px-4 pb-4 mb-4 border-b border-white/5 relative z-10">
                                <div className="w-8 h-8 rounded-lg glass-luxe-light flex items-center justify-center border border-primary/30">
                                    <Camera className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-[10px] font-black text-white italic uppercase tracking-[0.2em] tech-font">
                                    ATTACH_PROTOCOL_V4
                                </span>
                                <button
                                    onClick={onClose}
                                    className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-rose-500 hover:bg-white/5 transition-all"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 relative z-10">
                                {menuItems.map((item, index) => (
                                    <motion.button
                                        key={item.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02, y: -2 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => handleItemClick(item)}
                                        className={cn(
                                            "flex flex-col items-center gap-3 p-5 rounded-3xl border transition-all group relative overflow-hidden shadow-lg",
                                            item.bgColor,
                                            item.borderColor,
                                            "hover:border-white/20 active:border-primary/40"
                                        )}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br relative z-10 shadow-inner",
                                            item.color
                                        )}>
                                            <item.Icon className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors tech-font">
                                            {item.label}
                                        </span>
                                    </motion.button>
                                ))}
                            </div>

                            <div className="mt-4 px-4 py-3 bg-[#060a16]/60 rounded-2xl border border-white/5 relative z-10">
                                <div className="flex items-center gap-2 mb-1.5 opacity-40">
                                    <Shield className="w-3 h-3 text-primary" />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Security Parameters</span>
                                </div>
                                <p className="text-[9px] text-slate-600 font-bold tracking-tight uppercase">
                                    NODE_LIMIT: 10MB IMG • 50MB VID (60S MAX)
                                </p>
                            </div>
                        </div>
                    </motion.div>

                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </>
            )}
        </AnimatePresence>
    );
}

export default MediaUploader;
