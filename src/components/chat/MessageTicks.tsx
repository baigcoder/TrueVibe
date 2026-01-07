import { Check, CheckCheck, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageTicksProps {
    status: 'sending' | 'sent' | 'delivered' | 'read';
    className?: string;
}

/**
 * WhatsApp-style message status ticks:
 * - Clock icon: sending
 * - Single tick (gray): sent
 * - Double tick (gray): delivered
 * - Double tick (blue): read
 */
export function MessageTicks({ status, className }: MessageTicksProps) {
    const baseClass = cn('w-4 h-4 shrink-0', className);

    switch (status) {
        case 'sending':
            return <Clock className={cn(baseClass, 'text-slate-500 animate-pulse')} />;
        case 'sent':
            return <Check className={cn(baseClass, 'text-slate-400')} />;
        case 'delivered':
            return <CheckCheck className={cn(baseClass, 'text-slate-400')} />;
        case 'read':
            return <CheckCheck className={cn(baseClass, 'text-primary')} />;
        default:
            return null;
    }
}

export default MessageTicks;
