import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an assistive module exception:", error, errorInfo);
  }

  private handleCopyDiagnostics = async () => {
    try {
      const report = [
        `ECHOLYTIX ASSISTIVE SUBSYSTEM ERROR REPORT`,
        `Timestamp: ${new Date().toISOString()}`,
        `Error: ${this.state.error?.toString()}`,
        `Stack: ${this.state.error?.stack || 'N/A'}`,
        `Component Stack: ${this.state.errorInfo?.componentStack || 'N/A'}`,
        `User Agent: ${navigator.userAgent}`
      ].join('\n\n');

      await navigator.clipboard.writeText(report);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    } catch {
      // Fallback if clipboard API is restricted
    }
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-6 md:p-8 bg-[#FCFAF4] border border-amber-500/30 rounded-2xl m-4 md:m-8 flex flex-col gap-4 animate-fade-in max-w-3xl mx-auto w-full shadow-lg"
        >
          <div className="flex items-center gap-3 text-amber-700">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">healing</span>
            </div>
            <div>
              <h2 className="text-base md:text-lg font-bold font-display uppercase tracking-wider">
                {this.props.fallbackTitle || "Assistive Subsystem Encountered an Issue"}
              </h2>
              <p className="text-xs text-slate-600 font-body">
                Your authenticated session is preserved. The assistive model or audio engine can be safely restarted.
              </p>
            </div>
          </div>

          <details className="bg-[#EFE8D8] border border-[#E6DDC9] rounded-xl p-3.5 text-xs font-mono-code text-slate-700">
            <summary className="cursor-pointer font-bold select-none hover:text-indigo-600 transition-colors">
              Technical Diagnostic Details
            </summary>
            <div className="mt-3 pt-3 border-t border-[#E6DDC9] flex flex-col gap-2">
              <div className="text-rose-600 font-semibold break-words">
                {this.state.error?.toString()}
              </div>
              <pre className="text-[11px] overflow-x-auto p-2.5 bg-black/5 rounded-lg whitespace-pre-wrap leading-relaxed max-h-48">
                {this.state.errorInfo?.componentStack || this.state.error?.stack || "No additional stack trace captured."}
              </pre>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-display transition-all active:scale-95 shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Restart Subsystem
            </button>
            <button
              type="button"
              onClick={this.handleCopyDiagnostics}
              className="px-4 py-2 bg-[#EFE8D8] hover:bg-[#E6DDC9] border border-[#E6DDC9] text-slate-800 rounded-xl text-xs font-bold font-display transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">
                {this.state.copied ? 'done' : 'content_copy'}
              </span>
              {this.state.copied ? 'Report Copied!' : 'Copy Diagnostic Report'}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-transparent hover:bg-black/5 text-slate-600 rounded-xl text-xs font-mono-code transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
