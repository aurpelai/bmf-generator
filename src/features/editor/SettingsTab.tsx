import React, { useEffect, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveProject } from '@/db';
import { useStore } from '@/store';

import { GlyphSelection } from './GlyphSelection';

export const SettingsTab = (): React.JSX.Element | null => {
  const currentProject = useStore((state) => state.currentProject);
  const updateCurrentProject = useStore((state) => state.updateCurrentProject);

  const initialSettings = currentProject?.settings;
  const [name, setName] = useState(currentProject?.name ?? '');
  const [fontSize, setFontSize] = useState(initialSettings?.fontSize ?? 32);
  const [lineHeight, setLineHeight] = useState(initialSettings?.lineHeight ?? 36);
  const [base, setBase] = useState(initialSettings?.base ?? 28);
  const [capHeight, setCapHeight] = useState(initialSettings?.capHeight ?? 22);
  const [paddingTop, setPaddingTop] = useState(initialSettings?.padding.top ?? 1);
  const [paddingRight, setPaddingRight] = useState(initialSettings?.padding.right ?? 1);
  const [paddingBottom, setPaddingBottom] = useState(initialSettings?.padding.bottom ?? 1);
  const [paddingLeft, setPaddingLeft] = useState(initialSettings?.padding.left ?? 1);
  const [spacingX, setSpacingX] = useState(initialSettings?.spacing.x ?? 1);
  const [spacingY, setSpacingY] = useState(initialSettings?.spacing.y ?? 1);

  useEffect(() => {
    if (!currentProject) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(currentProject.name);
    const settings = currentProject.settings;

    setFontSize(settings.fontSize);
    setLineHeight(settings.lineHeight);
    setBase(settings.base);
    setCapHeight(settings.capHeight);
    setPaddingTop(settings.padding.top);
    setPaddingRight(settings.padding.right);
    setPaddingBottom(settings.padding.bottom);
    setPaddingLeft(settings.padding.left);
    setSpacingX(settings.spacing.x);
    setSpacingY(settings.spacing.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?.id]);

  if (!currentProject) {
    return null;
  }

  function commit(changes: Parameters<typeof updateCurrentProject>[0]): void {
    updateCurrentProject(changes);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    void saveProject({ ...currentProject!, ...changes, updatedAt: Date.now() }); // non-null: guarded above
  }

  function commitSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    commit({ settings: { ...currentProject!.settings, ...partial } }); // non-null: guarded above
  }

  function liveSettings(partial: Partial<NonNullable<typeof currentProject>['settings']>): void {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    updateCurrentProject({ settings: { ...currentProject!.settings, ...partial } }); // non-null: guarded above
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-auto p-3">
      <div className="grid gap-1">
        <Label htmlFor="rp-name" className="text-[10px]">
          Font name
        </Label>
        <Input
          id="rp-name"
          className="h-7 text-xs"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => commit({ name })}
          onKeyDown={(event) => event.key === 'Enter' && commit({ name })}
        />
      </div>

      {/* Font metrics */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Font metrics
        </span>
        <div className="grid gap-1">
          <Label htmlFor="rp-fontsize" className="text-[10px]">
            Font size
          </Label>
          <Input
            id="rp-fontsize"
            type="number"
            className="h-7 text-xs"
            value={fontSize}
            onChange={(event) => {
              setFontSize(Number(event.target.value));
              liveSettings({ fontSize: Number(event.target.value) });
            }}
            onBlur={() => commitSettings({ fontSize })}
            onKeyDown={(event) => event.key === 'Enter' && commitSettings({ fontSize })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-lineheight" className="text-[10px]">
            Line height
          </Label>
          <Input
            id="rp-lineheight"
            type="number"
            className="h-7 text-xs"
            value={lineHeight}
            onChange={(event) => {
              setLineHeight(Number(event.target.value));
              liveSettings({ lineHeight: Number(event.target.value) });
            }}
            onBlur={() => commitSettings({ lineHeight })}
            onKeyDown={(event) => event.key === 'Enter' && commitSettings({ lineHeight })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-base" className="text-[10px]">
            Baseline
          </Label>
          <Input
            id="rp-base"
            type="number"
            className="h-7 text-xs"
            value={base}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), lineHeight);

              setBase(value);
              liveSettings({ base: value });
            }}
            onBlur={() => commitSettings({ base: Math.min(base, lineHeight) })}
            onKeyDown={(event) =>
              event.key === 'Enter' && commitSettings({ base: Math.min(base, lineHeight) })
            }
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="rp-capheight" className="text-[10px]">
            Cap height
          </Label>
          <Input
            id="rp-capheight"
            type="number"
            className="h-7 text-xs"
            value={capHeight}
            onChange={(event) => {
              const value = Math.min(Number(event.target.value), lineHeight);

              setCapHeight(value);
              liveSettings({ capHeight: value });
            }}
            onBlur={() => commitSettings({ capHeight: Math.min(capHeight, lineHeight) })}
            onKeyDown={(event) =>
              event.key === 'Enter' &&
              commitSettings({ capHeight: Math.min(capHeight, lineHeight) })
            }
          />
        </div>
      </div>

      {/* Padding */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Padding
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-top" className="text-[10px]">
              Top
            </Label>
            <Input
              id="rp-pad-top"
              type="number"
              className="h-7 text-xs"
              value={paddingTop}
              onChange={(event) => setPaddingTop(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-right" className="text-[10px]">
              Right
            </Label>
            <Input
              id="rp-pad-right"
              type="number"
              className="h-7 text-xs"
              value={paddingRight}
              onChange={(event) => setPaddingRight(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-bottom" className="text-[10px]">
              Bottom
            </Label>
            <Input
              id="rp-pad-bottom"
              type="number"
              className="h-7 text-xs"
              value={paddingBottom}
              onChange={(event) => setPaddingBottom(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-pad-left" className="text-[10px]">
              Left
            </Label>
            <Input
              id="rp-pad-left"
              type="number"
              className="h-7 text-xs"
              value={paddingLeft}
              onChange={(event) => setPaddingLeft(Number(event.target.value))}
              onBlur={() =>
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
              onKeyDown={(event) =>
                event.key === 'Enter' &&
                commitSettings({
                  padding: {
                    top: paddingTop,
                    right: paddingRight,
                    bottom: paddingBottom,
                    left: paddingLeft,
                  },
                })
              }
            />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="grid gap-2">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Spacing
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingx" className="text-[10px]">
              X
            </Label>
            <Input
              id="rp-spacingx"
              type="number"
              className="h-7 text-xs"
              value={spacingX}
              onChange={(event) => setSpacingX(Number(event.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(event) =>
                event.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })
              }
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="rp-spacingy" className="text-[10px]">
              Y
            </Label>
            <Input
              id="rp-spacingy"
              type="number"
              className="h-7 text-xs"
              value={spacingY}
              onChange={(event) => setSpacingY(Number(event.target.value))}
              onBlur={() => commitSettings({ spacing: { x: spacingX, y: spacingY } })}
              onKeyDown={(event) =>
                event.key === 'Enter' && commitSettings({ spacing: { x: spacingX, y: spacingY } })
              }
            />
          </div>
        </div>
      </div>

      {/* Glyph selection */}
      <GlyphSelection />
    </div>
  );
};

