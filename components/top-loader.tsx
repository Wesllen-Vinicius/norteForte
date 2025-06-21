"use client"

import { Progress } from "@/components/ui/progress";
import { useNavigationStore } from "@/store/navigation.store";

export function TopLoader() {
  const { isNavigating } = useNavigationStore();

  if (!isNavigating) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 w-full z-[9999]">
      <Progress value={100} className="h-1 animate-pulse rounded-none duration-1000" />
    </div>
  );
}
