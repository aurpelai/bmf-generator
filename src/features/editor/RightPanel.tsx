import { ChevronRight } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';

import { AtlasTab } from './AtlasTab';
import { SettingsTab } from './SettingsTab';

type Tab = 'atlas' | 'settings';

export const RightPanel = ({
  onCollapse,
  width,
}: {
  onCollapse: () => void;
  width: number;
}): React.JSX.Element => {
  const [tab, setTab] = useState<Tab>('atlas');

  const tabClass = (targetTab: Tab): string =>
    `cursor-pointer self-stretch flex items-center px-3 text-xs font-medium transition-colors ${
      tab === targetTab
        ? 'text-foreground border-b-2 border-primary -mb-px'
        : 'text-muted-foreground hover:text-foreground'
    }`;

  return (
    <div className="border-border flex h-full shrink-0 flex-col border-l" style={{ width }}>
      <div className="border-border flex h-9 shrink-0 items-end border-b">
        <Button
          variant="ghost"
          size="icon"
          className="ml-2 h-6 w-6 self-center"
          title="Collapse panel"
          aria-label="Collapse panel"
          aria-expanded={true}
          onClick={onCollapse}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <div role="tablist" aria-label="Panel tabs" className="flex self-stretch">
          <button
            role="tab"
            aria-selected={tab === 'atlas'}
            aria-controls="rightpanel-atlas"
            id="tab-atlas"
            className={tabClass('atlas')}
            onClick={() => setTab('atlas')}
          >
            Atlas
          </button>
          <button
            role="tab"
            aria-selected={tab === 'settings'}
            aria-controls="rightpanel-settings"
            id="tab-settings"
            className={tabClass('settings')}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </div>
      </div>
      {tab === 'atlas' && <AtlasTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
};
