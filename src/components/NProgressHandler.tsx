"use client";
import { usePathname, useSearchParams } from "next/navigation";
import NProgress from "nprogress";
import { useEffect, useRef } from "react";
import "nprogress/nprogress.css";

NProgress.configure({ showSpinner: false });

export function NProgressHandler() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    // Only trigger on actual navigation
    if (
      previousPath.current !== null &&
      previousPath.current !== pathname + searchParams.toString()
    ) {
      NProgress.start();
      // Simulate a short delay for demo; in real apps, you may want to tie this to data fetching
      setTimeout(() => {
        NProgress.done();
      }, 400);
    }
    previousPath.current = pathname + searchParams.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
