/** Root + P0 shell route (01-spec §7 screens list starts with Login; journeys from P1). */
import { createRootRoute, createRoute, Outlet } from "@tanstack/react-router";
import { LoginScreen } from "../screens/login-screen";

function RootLayout() {
  return <Outlet />;
}

export const rootRoute = createRootRoute({ component: RootLayout });

export const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LoginScreen,
});

export const routeTree = rootRoute.addChildren([loginRoute]);
