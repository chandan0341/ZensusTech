import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { createRootRoute, HeadContent, Outlet, redirect } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import ErrorComponent from "@/components/Common/ErrorComponent"
import NotFound from "@/components/Common/NotFound"

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Check if this navigation came from the connection page via query param
    const searchParams = new URLSearchParams(location.search);
    const fromConnection = searchParams.get('from') === 'connection';

    if (fromConnection) {
      return; // Allow access to dashboard
    }

    // Only redirect for root path (/) to login for fresh sessions
    if (location.pathname === '/') {
      throw redirect({
        to: "/login",
      });
    }
  },
  component: () => (
    <>
      <HeadContent />
      <Outlet />
      <TanStackRouterDevtools position="bottom-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  ),
  notFoundComponent: () => <NotFound />,
  errorComponent: () => <ErrorComponent />,
})
