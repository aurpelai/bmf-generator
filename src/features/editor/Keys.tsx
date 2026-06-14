import React from 'react';

import { Kbd } from './Kbd';

export const Keys = ({ keys }: { keys: string[] }): React.JSX.Element => {
  return (
    <div className="flex items-center gap-0.5">
      {keys.map((key, index) => (
        <span key={index} className="flex items-center gap-0.5">
          {index > 0 && <span className="text-muted-foreground text-[10px]">+</span>}
          <Kbd>{key}</Kbd>
        </span>
      ))}
    </div>
  );
};
