"use client";

import * as React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TruncatedCellProps {
  children: React.ReactNode;
}

export const TruncatedCell = ({ children }: TruncatedCellProps) => {
  const [isTruncated, setIsTruncated] = React.useState(false);
  const textRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [children]);

  const cellContent = (
    <div ref={textRef} className="truncate">
      {children}
    </div>
  );

  if (isTruncated) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
          <TooltipContent className="max-w-xs text-center">
            <p>{children}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return cellContent;
};
