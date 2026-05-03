import React from 'react';

class ErrorBoundary extends React.Component<
  {children: React.ReactNode},
  {hasError: boolean; error: string}
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding:40,color:'red'}}>
          <h2>Something went wrong</h2>
          <pre>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
