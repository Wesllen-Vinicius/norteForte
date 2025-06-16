import React from 'react';

export function CenteredLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center items-start py-8">
      <div className="w-full max-w-2xl px-4">
        {children}
      </div>
    </div>
  );
}
