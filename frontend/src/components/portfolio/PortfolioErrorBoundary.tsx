import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { PortfolioError } from '../../types/portfolio';

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

export class PortfolioErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error('Portfolio Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center space-x-2">
              <span>⚠️</span>
              <span>Portfolio Loading Error</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-red-700">
                We're having trouble loading your portfolio data. This might be a temporary issue.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-600 font-medium">
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded border text-red-800 font-mono text-xs overflow-auto">
                    <div className="font-bold">Error:</div>
                    <div className="mb-2">{this.state.error.message}</div>
                    <div className="font-bold">Stack Trace:</div>
                    <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                    {this.state.errorInfo && (
                      <>
                        <div className="font-bold mt-2">Component Stack:</div>
                        <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                      </>
                    )}
                  </div>
                </details>
              )}
              
              <div className="flex space-x-3">
                <Button onClick={this.handleRetry} variant="primary" size="sm">
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="secondary" size="sm">
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
interface ErrorFallbackProps {
  error: PortfolioError;
  resetError: () => void;
  title?: string;
  description?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Something went wrong',
  description,
}) => {
  const getErrorMessage = () => {
    if (error.code === 'NETWORK_ERROR') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.code === 'UNAUTHORIZED') {
      return 'Your session has expired. Please log in again.';
    }
    if (error.code === 'SERVICE_UNAVAILABLE') {
      return 'The service is temporarily unavailable. Please try again later.';
    }
    return description || error.message || 'An unexpected error occurred.';
  };

  const getActionButtons = () => {
    const buttons = [
      <Button key="retry" onClick={resetError} variant="primary" size="sm">
        Try Again
      </Button>
    ];

    if (error.code === 'UNAUTHORIZED') {
      buttons.push(
        <Button
          key="login"
          onClick={() => window.location.href = '/login'}
          variant="secondary"
          size="sm"
        >
          Go to Login
        </Button>
      );
    }

    if (error.retryable) {
      buttons.push(
        <Button
          key="refresh"
          onClick={() => window.location.reload()}
          variant="secondary"
          size="sm"
        >
          Refresh Page
        </Button>
      );
    }

    return buttons;
  };

  return (
    <Card className="border-red-200 bg-red-50">
      <CardHeader>
        <CardTitle className="text-red-800 flex items-center space-x-2">
          <span>⚠️</span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-red-700">{getErrorMessage()}</p>
          
          {error.code && (
            <div className="text-sm text-red-600">
              Error Code: {error.code}
            </div>
          )}
          
          <div className="flex space-x-3">{getActionButtons()}</div>
        </div>
      </CardContent>
    </Card>
  );
};

// Wrapper component for easier usage
interface PortfolioErrorWrapperProps {
  children: ReactNode;
  error?: PortfolioError | null;
  loading?: boolean;
  onRetry?: () => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export const PortfolioErrorWrapper: React.FC<PortfolioErrorWrapperProps> = ({
  children,
  error,
  loading,
  onRetry,
  fallbackTitle,
  fallbackDescription,
}) => {
  if (error && !loading) {
    return (
      <ErrorFallback
        error={error}
        resetError={onRetry || (() => window.location.reload())}
        title={fallbackTitle}
        description={fallbackDescription}
      />
    );
  }

  return (
    <PortfolioErrorBoundary>
      {children}
    </PortfolioErrorBoundary>
  );
};