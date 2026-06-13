"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  parseSearchParams,
  stateToSearchParams,
  useDashboardStore,
} from "./store";

export function useSyncedStore() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const patch = parseSearchParams(new URLSearchParams(searchParams.toString()));
    if (Object.keys(patch).length > 0) {
      useDashboardStore.getState().hydrate(patch);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubscribe = useDashboardStore.subscribe((state) => {
      if (!hydrated.current) return;
      const next = stateToSearchParams(state).toString();
      const current = searchParams.toString();
      if (next === current) return;
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
    return unsubscribe;
  }, [router, pathname, searchParams]);
}
