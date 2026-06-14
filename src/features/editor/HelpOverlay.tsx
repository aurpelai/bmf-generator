import React from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Keys } from './Keys';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TOOLS = [
  { key: 'B', tool: 'Pencil', description: 'Draw pixels onto the glyph' },
  { key: 'E', tool: 'Eraser', description: 'Erase pixels from the glyph' },
  { key: 'M', tool: 'Move', description: 'Drag the glyph bitmap to reposition it' },
  { key: 'Z', tool: 'Zoom', description: 'Click to zoom in; Alt+click to zoom out' },
];

const MODIFIERS = [
  { keys: ['Alt'], description: 'Hold to invert the active tool (pencil↔eraser, zoom in↔out)' },
  { keys: ['Space'], description: 'Hold to temporarily activate the move tool' },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'Z'], description: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { keys: ['Ctrl', 'E'], description: 'Open export dialog' },
  { keys: ['Ctrl', "'"], description: 'Toggle glyph list, atlas and preview' },
  { keys: ['Ctrl', 'Shift', 'A'], description: 'Toggle atlas panel' },
  { keys: ['Ctrl', 'Shift', 'P'], description: 'Toggle preview panel' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Open settings' },
  { keys: ['Ctrl', 'S'], description: 'Save (auto-saved — suppresses browser dialog)' },
  { keys: ['G'], description: 'Toggle pixel grid' },
  { keys: ['Shift', 'Scroll'], description: 'Adjust brush size' },
  { keys: ['?'], description: 'Show this help overlay' },
];

export const HelpOverlay = ({ open, onOpenChange }: Props): React.JSX.Element => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-1">
          <section className="grid gap-1.5">
            <h3 className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Tools
            </h3>
            {TOOLS.map(({ key, tool, description }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium">{tool}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{description}</span>
                </div>
                <Keys keys={[key]} />
              </div>
            ))}
          </section>

          <section className="grid gap-1.5">
            <h3 className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Tool modifiers
            </h3>
            {MODIFIERS.map(({ keys, description }) => (
              <div key={keys.join('+')} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs">{description}</span>
                <Keys keys={keys} />
              </div>
            ))}
          </section>

          <section className="grid gap-1.5">
            <h3 className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              General
            </h3>
            {SHORTCUTS.map(({ keys, description }) => (
              <div key={keys.join('+')} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground text-xs">{description}</span>
                <Keys keys={keys} />
              </div>
            ))}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
