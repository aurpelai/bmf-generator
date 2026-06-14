import React from 'react';

export const Kbd = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  return (
    <kbd className="bg-muted border-border inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none">
      {children}
    </kbd>
  );
};
