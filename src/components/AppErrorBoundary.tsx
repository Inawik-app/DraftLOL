"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { FailurePanel } from "@/components/FailurePanel";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <FailurePanel
          title="L'interface a planté"
          message="Une erreur inattendue s'est produite. Recharge la page pour repartir sur une base saine. Si le problème revient, ouvre un nouvel onglet ou vide le cache du navigateur."
          actions={[
            {
              label: "Recharger la page",
              onClick: () => window.location.reload(),
            },
          ]}
        />
      );
    }
    return this.props.children;
  }
}
