// src/components/common/ErrorBoundary.tsx
// Catches render errors anywhere below it so a single broken component shows a
// recoverable message instead of white-screening the whole app.
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled UI error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 text-center">
          <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              The page hit an unexpected error. Reloading usually fixes it.
            </p>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
