"use client";

import { FailurePanel } from "@/components/FailurePanel";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="fr">
      <body className="flex min-h-full flex-col bg-ink text-txt antialiased">
        <FailurePanel
          title="L'application ne peut pas démarrer"
          message="Une erreur grave est survenue au chargement. Recharge la page ; si ça persiste, ouvre un nouvel onglet ou vide le cache du navigateur."
          actions={[
            {
              label: "Recharger la page",
              onClick: () => reset(),
            },
          ]}
        />
      </body>
    </html>
  );
}
