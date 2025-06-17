"use client"

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Progress } from "@/components/ui/progress";

export function TopLoader() {
  const [progress, setProgress] = React.useState(0);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    setProgress(30);
    const timer = setTimeout(() => setProgress(75), 300);

    const fullProgressTimer = setTimeout(() => {
        setProgress(100);
    }, 500);

    return () => {
        clearTimeout(timer);
        clearTimeout(fullProgressTimer);
    }
  }, [pathname, searchParams]);

  if(progress === 0 || progress === 100) return null;

  return (
    <div className="fixed top-0 left-0 w-full z-[9999]">
      <Progress value={progress} className="h-0.5 rounded-none" />
    </div>
  );
}
