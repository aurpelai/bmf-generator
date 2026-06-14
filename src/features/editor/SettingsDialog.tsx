import React, { useEffect, useState } from 'react';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveProject } from '@/db';
import { FontMetricsFields } from '@/features/home/FontMetricsFields';
import { PaddingFields } from '@/features/home/PaddingFields';
import { SpacingFields } from '@/features/home/SpacingFields';
import { useStore } from '@/store';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsDialog = ({ open, onOpenChange }: Props): React.JSX.Element | null => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Font Settings</DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="sd-name">Font name</Label>
            <Input
              id="sd-name"
              className="h-8 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => commit({ name })}
              onKeyDown={(event) => event.key === 'Enter' && commit({ name })}
            />
          </div>

          <FontMetricsFields
            fontSize={fontSize}
            lineHeight={lineHeight}
            base={base}
            capHeight={capHeight}
            onFontSizeChange={(value) => setFontSize(value)}
            onLineHeightChange={(value) => {
              setLineHeight(value);
              commitSettings({ lineHeight: value });
            }}
            onBaseChange={(value) => {
              setBase(value);
              commitSettings({ base: value });
            }}
            onCapHeightChange={(value) => {
              setCapHeight(value);
              commitSettings({ capHeight: value });
            }}
          />

          <PaddingFields
            top={paddingTop}
            right={paddingRight}
            bottom={paddingBottom}
            left={paddingLeft}
            onTopChange={(value) => {
              setPaddingTop(value);
              commitSettings({
                padding: {
                  top: value,
                  right: paddingRight,
                  bottom: paddingBottom,
                  left: paddingLeft,
                },
              });
            }}
            onRightChange={(value) => {
              setPaddingRight(value);
              commitSettings({
                padding: {
                  top: paddingTop,
                  right: value,
                  bottom: paddingBottom,
                  left: paddingLeft,
                },
              });
            }}
            onBottomChange={(value) => {
              setPaddingBottom(value);
              commitSettings({
                padding: { top: paddingTop, right: paddingRight, bottom: value, left: paddingLeft },
              });
            }}
            onLeftChange={(value) => {
              setPaddingLeft(value);
              commitSettings({
                padding: {
                  top: paddingTop,
                  right: paddingRight,
                  bottom: paddingBottom,
                  left: value,
                },
              });
            }}
          />

          <SpacingFields
            x={spacingX}
            y={spacingY}
            onXChange={(value) => {
              setSpacingX(value);
              commitSettings({ spacing: { x: value, y: spacingY } });
            }}
            onYChange={(value) => {
              setSpacingY(value);
              commitSettings({ spacing: { x: spacingX, y: value } });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
