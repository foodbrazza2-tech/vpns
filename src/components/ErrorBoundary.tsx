import React from 'react';
import { supabase } from '../services/authService';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const logError = async () => {
      try {
        await supabase.from('error_logs').insert({
          message: error.message,
          stack: error.stack || null,
          component_stack: info.componentStack || null,
          url: window.location.href,
          user_agent: navigator.userAgent,
        });
      } catch {
        // Best-effort logging only; never let this crash the error boundary itself.
      }
    };
    logError();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="loading-screen">
          <p style={{ fontSize: '2rem' }}>⚠️</p>
          <p>Une erreur inattendue est survenue.</p>
          <button type="button" className="primary-btn" onClick={() => window.location.reload()}>
            Recharger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
