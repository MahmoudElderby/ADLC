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
        <main role="alert" aria-live="assertive" className="flex min-h-screen flex-col items-center justify-center bg-[#0A0B0D] px-6 text-[#F1F5F9]">
          <h1 className="text-sm font-semibold">Something went wrong</h1>
          <p className="mt-2 font-mono text-[12px] text-[#8892A4]">{this.state.error.message}</p>
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
