import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        this.setState({ errorInfo });

        // Log error to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo);
        }

        // Call optional error handler
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    handleGoHome = (): void => {
        window.location.href = '/app/feed';
    };

    // Check if this is a chunk loading error (common after deployments)
    isChunkLoadError = (): boolean => {
        const error = this.state.error;
        if (!error) return false;

        const message = error.message?.toLowerCase() || '';
        const name = error.name?.toLowerCase() || '';

        return (
            message.includes('failed to fetch dynamically imported module') ||
            message.includes('loading chunk') ||
            message.includes('loading css chunk') ||
            message.includes('dynamically imported module') ||
            name.includes('chunkloaderror')
        );
    };

    handleReload = (): void => {
        // Clear any cached data and do a hard reload
        window.location.reload();
    };

    render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Special handling for chunk loading errors
            if (this.isChunkLoadError()) {
                return (
                    <div className="min-h-screen flex items-center justify-center p-8 bg-[#030712]">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <RefreshCw className="w-10 h-10 text-primary" />
                            </div>

                            <h2 className="text-2xl font-bold text-white mb-3">
                                App Updated
                            </h2>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                A new version of TrueVibe has been deployed. Please reload the page to get the latest updates.
                            </p>

                            <Button
                                onClick={this.handleReload}
                                size="lg"
                                className="h-12 px-8"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reload Page
                            </Button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="min-h-[300px] flex items-center justify-center p-8">
                    <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-rose-500" />
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-slate-400 text-sm mb-6">
                            This section encountered an error and couldn't load properly.
                        </p>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-slate-900/50 rounded-xl text-left overflow-auto max-h-32">
                                <p className="text-xs font-mono text-rose-400 break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-3">
                            <Button
                                onClick={this.handleRetry}
                                variant="outline"
                                className="h-10 border-white/10 text-white hover:bg-white/5"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button
                                onClick={this.handleGoHome}
                                className="h-10"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Go Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    fallback?: ReactNode
) {
    return function WithErrorBoundary(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        );
    };
}

export default ErrorBoundary;
