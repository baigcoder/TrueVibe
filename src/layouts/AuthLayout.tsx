import { Outlet } from '@tanstack/react-router';

export default function AuthLayout() {
    return (
        <div className="min-h-screen bg-background relative overflow-x-hidden mesh-bg noise-bg">
            {/* Industrial Background Atmosphere */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 industrial-grid opacity-20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl aspect-square bg-primary/20 blur-[180px] rounded-full opacity-50" />
            </div>

            <div className="relative z-10 min-h-screen overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
}
