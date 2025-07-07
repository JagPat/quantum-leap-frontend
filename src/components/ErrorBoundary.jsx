import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <Card className="bg-red-900/20 border-red-500/30 text-white">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-300">
                    <AlertTriangle className="w-5 h-5" />
                    Something Went Wrong
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-red-200">A part of this page failed to load. Please try refreshing.</p>
                {this.props.showDetails && this.state.error && (
                    <details className="mt-4 text-xs text-red-300">
                        <summary>Error Details</summary>
                        <pre className="mt-2 p-2 bg-slate-800 rounded overflow-auto">
                            {this.state.error.toString()}
                        </pre>
                    </details>
                )}
                 <Button onClick={() => this.setState({ hasError: false, error: null })} variant="outline" className="mt-4">
                    Try again
                </Button>
            </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;