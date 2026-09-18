import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { RouterProvider } from "react-router-dom";
import { AppProviders } from "./providers.js";
import { router } from "./router.js";

class ErrorBoundary extends Component<PropsWithChildren, { error?: Error }> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Application shell error", { error, errorInfo });
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <main role="alert" aria-live="assertive">
          <h1>Something went wrong</h1>
          <p>{this.state.error.message}</p>
        </main>
      );
    }

    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  );
}
