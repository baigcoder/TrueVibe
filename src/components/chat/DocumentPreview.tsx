import { FileText, FileSpreadsheet, FileType, File, Download, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DocumentPreviewProps {
    url: string;
    name?: string;
    size?: number;
    className?: string;
}

/**
 * Get document type and icon based on file extension
 */
const getDocumentInfo = (filename: string) => {
    const ext = filename?.split('.').pop()?.toLowerCase() || '';

    switch (ext) {
        case 'pdf':
            return { icon: FileText, color: 'text-red-500 bg-red-500/10', label: 'PDF' };
        case 'doc':
        case 'docx':
            return { icon: FileType, color: 'text-blue-500 bg-blue-500/10', label: 'DOC' };
        case 'xls':
        case 'xlsx':
            return { icon: FileSpreadsheet, color: 'text-emerald-500 bg-emerald-500/10', label: 'XLS' };
        case 'ppt':
        case 'pptx':
            return { icon: FileText, color: 'text-orange-500 bg-orange-500/10', label: 'PPT' };
        case 'txt':
            return { icon: FileText, color: 'text-slate-400 bg-slate-500/10', label: 'TXT' };
        case 'zip':
        case 'rar':
            return { icon: File, color: 'text-purple-500 bg-purple-500/10', label: 'ZIP' };
        default:
            return { icon: File, color: 'text-slate-400 bg-slate-500/10', label: ext.toUpperCase() || 'FILE' };
    }
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function DocumentPreview({ url, name = 'Document', size, className }: DocumentPreviewProps) {
    const docInfo = getDocumentInfo(name);
    const Icon = docInfo.icon;

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
    };

    const handleOpen = () => {
        window.open(url, '_blank');
    };

    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 max-w-[280px]",
            className
        )}>
            {/* Document Icon */}
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                docInfo.color
            )}>
                <Icon className="w-6 h-6" />
            </div>

            {/* Document Info */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">{docInfo.label}</span>
                    {size && (
                        <>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500">{formatFileSize(size)}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 shrink-0">
                <button
                    onClick={handleOpen}
                    className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    title="Open in new tab"
                >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </button>
                <button
                    onClick={handleDownload}
                    className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                    title="Download"
                >
                    <Download className="w-3.5 h-3.5 text-primary" />
                </button>
            </div>
        </div>
    );
}

export default DocumentPreview;
