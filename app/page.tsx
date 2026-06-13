import { DashboardShell } from "@/components/dashboard-shell";
import { parseSearchParamsToStoreState } from "@/lib/store";

/**
 * Home — Server Component.
 *
 * Reads the route's searchParams synchronously (server-side, no JS cost)
 * and passes a typed `initialState` into the Client `<DashboardShell>`.
 * The dashboard hydrates its Zustand store from this prop BEFORE the
 * URL-sync hook (`useSyncedStore`) starts watching for client-side
 * navigations — so the first-paint HTML for a shareable link like
 * `/?y=2023&e=Électricité&d=59` already reflects those values, instead
 * of flashing the defaults.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const initialState = parseSearchParamsToStoreState(sp);
  return <DashboardShell initialState={initialState} />;
}
