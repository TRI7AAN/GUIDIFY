import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-50 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-surface-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-surface-800/60 max-w-md mb-6">
            We hit an unexpected error. Your data is safe — try refreshing the page.
          </p>
          <button
            onClick={this.handleRetry}
            className="gradient-primary text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity focus-ring flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh Page
          </button>
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-8 w-full max-w-lg text-left bg-surface-900 rounded-xl p-4 overflow-auto">
              <code className="text-red-400 text-sm">{this.state.error.toString()}</code>
              <br />
              <code className="text-surface-800/50 text-xs">{this.state.errorInfo?.componentStack}</code>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
