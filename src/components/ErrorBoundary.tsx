import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-rose-100 border border-rose-500/30 rounded-2xl m-6 flex flex-col gap-4 animate-fade-in max-w-[1280px] mx-auto w-full">
          <div className="flex items-center gap-2 text-rose-600">
            <span className="material-symbols-outlined text-2xl">error_med</span>
            <h2 className="text-lg font-bold font-display uppercase tracking-wider">
              Component Execution Crash
            </h2>
          </div>
          <p className="text-xs font-mono-code text-rose-500 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20 overflow-auto whitespace-pre-wrap max-w-full leading-normal shadow-inner">
            <strong>Error:</strong> {this.state.error?.toString()}
            {"\n\n"}
            <strong>Stack Trace:</strong>
            {this.state.errorInfo?.componentStack || "\n  No trace available."}
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold font-display transition-colors active:scale-95"
            >
              Try Re-rendering
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] text-slate-700 rounded-xl text-xs font-bold font-display transition-colors active:scale-95"
            >
              Force Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
