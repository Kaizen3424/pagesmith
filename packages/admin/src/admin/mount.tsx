/**
 * Admin composition root — ADR-0001 canon: ONE mount call,
 * `mountAdmin(el, {config, support:{name}})`. Screens render tokens only in P0.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routes";
import type { AdminConfigPlaceholder } from "./types";

const QUERY_CLIENT = new QueryClient();

interface MountOptions {
  readonly config: AdminConfigPlaceholder;
  readonly support: { readonly name: string };
}

export function mountAdmin(el: HTMLElement, options: MountOptions): void {
  const router = createRouter({ routeTree });
  createRoot(el).render(rootTree(<RouterProvider router={router} />));
}

/** Providers wrap the router; the query client is the ONLY UI cache (master-plan §4.3). */
function rootTree(children: ReactNode): ReactNode {
  return (
    <StrictMode>
      <QueryClientProvider client={QUERY_CLIENT}>{children}</QueryClientProvider>
    </StrictMode>
  );
}
