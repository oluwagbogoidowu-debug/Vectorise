import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught runtime render error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#FAFAFA] dark:bg-[#121212] text-center">
          <div className="max-w-md w-full bg-white dark:bg-[#1c1c1e] p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-xl">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100 dark:border-rose-900/50">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2">Something went wrong</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              We encountered an issue loading this view. You can reload the page or return to the main dashboard.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3 px-4 bg-[#0E7850] hover:bg-[#0c6744] text-white text-xs font-black rounded-xl uppercase tracking-wider transition-colors shadow-md"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
                className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-black rounded-xl uppercase tracking-wider transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
