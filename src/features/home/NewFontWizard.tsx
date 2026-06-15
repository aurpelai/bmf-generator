import React, { useState } from 'react';
import { useNavigate } from 'react-router';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BASE_RATIO,
  CAP_HEIGHT_RATIO,
  DEFAULT_FONT_SIZE,
  LINE_HEIGHT_RATIO,
} from '@/config';
import { createProject, initializeGlyphs } from '@/core/project';
import { GLYPH_SETS } from '@/core/project/glyphSets';
import { saveGlyphs, saveProject } from '@/db';
import { useStore } from '@/store';

import { FontMetricsFields } from './FontMetricsFields';
import { GlyphSetSelect } from './GlyphSetSelect';
import { PaddingFields } from './PaddingFields';
import { SpacingFields } from './SpacingFields';
import { WizardFooter } from './WizardFooter';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2;

export const NewFontWizard = ({ open, onOpenChange }: Props): React.JSX.Element => {
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState('');
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id);

  // Step 2
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState(Math.round(DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO));
  const [base, setBase] = useState(Math.round(DEFAULT_FONT_SIZE * BASE_RATIO));
  const [capHeight, setCapHeight] = useState(Math.round(DEFAULT_FONT_SIZE * CAP_HEIGHT_RATIO));
  const [paddingTop, setPaddingTop] = useState(1);
  const [paddingRight, setPaddingRight] = useState(1);
  const [paddingBottom, setPaddingBottom] = useState(1);
  const [paddingLeft, setPaddingLeft] = useState(1);
  const [spacingX, setSpacingX] = useState(1);
  const [spacingY, setSpacingY] = useState(1);
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState('');

  const navigate = useNavigate();
  const setCurrentProject = useStore((state) => state.setCurrentProject);
  const setGlyphs = useStore((state) => state.setGlyphs);

  async function handleCreate(): Promise<void> {
    setCreating(true);

    try {
      const glyphSet =
        GLYPH_SETS.find((glyphSetItem) => glyphSetItem.id === glyphSetId) ?? GLYPH_SETS[0];
      const project = createProject(name || 'Untitled', {
        fontSize,
        padding: { top: paddingTop, right: paddingRight, bottom: paddingBottom, left: paddingLeft },
        spacing: { x: spacingX, y: spacingY },
        lineHeight,
        base,
        capHeight,
      });

      project.glyphs = glyphSet.codePoints;
      const glyphs = initializeGlyphs(
        project.id,
        glyphSet.codePoints,
        fontSize,
        Math.round(fontSize * LINE_HEIGHT_RATIO),
      );

      await saveProject(project);
      await saveGlyphs(glyphs);
      setCurrentProject(project);
      setGlyphs(glyphs);
      void navigate('/editor');
      onOpenChange(false);
    } finally {
      setCreating(false);
    }
  }

  function handleNext(): void {
    if (!name.trim()) {
      setNameError('Font name is required');

      return;
    }

    setStep(2);
  }

  function handleClose(): void {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setName('');
      setNameError('');
      setGlyphSetId(GLYPH_SETS[0].id);
      setFontSize(DEFAULT_FONT_SIZE);
      setLineHeight(Math.round(DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO));
      setBase(Math.round(DEFAULT_FONT_SIZE * BASE_RATIO));
      setCapHeight(Math.round(DEFAULT_FONT_SIZE * CAP_HEIGHT_RATIO));
      setPaddingTop(1);
      setPaddingRight(1);
      setPaddingBottom(1);
      setPaddingLeft(1);
      setSpacingX(1);
      setSpacingY(1);
    }, 200);
  }

  const stepTitles: Record<Step, string> = {
    1: 'New Font — Name & Glyphs',
    2: 'New Font — Settings',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader className="bg-popover z-10 -mx-4 -mt-4 px-4 pt-4 pb-4">
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 2</p>
        </DialogHeader>

        {step === 1 && (
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-2 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nf-name">Font name</Label>
              <Input
                id="nf-name"
                placeholder="Untitled"
                value={name}
                className={nameError ? 'border-destructive' : ''}
                onChange={(event) => {
                  setName(event.target.value);

                  if (event.target.value.trim()) {
                    setNameError('');
                  }
                }}
                onKeyDown={(event) => event.key === 'Enter' && handleNext()}
              />
              {nameError && <p className="text-destructive text-xs">{nameError}</p>}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nf-glyphset">Glyph set</Label>
              <GlyphSetSelect id="nf-glyphset" value={glyphSetId} onChange={setGlyphSetId} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-2 pb-4">
            <FontMetricsFields
              fontSize={fontSize}
              lineHeight={lineHeight}
              base={base}
              capHeight={capHeight}
              onFontSizeChange={(value) => {
                setFontSize(value);
                setLineHeight(Math.round(value * 1.2));
                setBase(Math.round(value * 0.8));
                setCapHeight(Math.round(value * 0.7));
              }}
              onLineHeightChange={setLineHeight}
              onBaseChange={setBase}
              onCapHeightChange={setCapHeight}
            />
            <PaddingFields
              top={paddingTop}
              right={paddingRight}
              bottom={paddingBottom}
              left={paddingLeft}
              onTopChange={setPaddingTop}
              onRightChange={setPaddingRight}
              onBottomChange={setPaddingBottom}
              onLeftChange={setPaddingLeft}
            />
            <SpacingFields
              x={spacingX}
              y={spacingY}
              onXChange={setSpacingX}
              onYChange={setSpacingY}
            />
          </div>
        )}

        <WizardFooter
          step={step}
          totalSteps={2}
          onClose={handleClose}
          onBack={() => setStep(1)}
          onNext={handleNext}
          onConfirm={() => {
            void handleCreate();
          }}
          backDisabled={creating}
          confirmDisabled={creating}
          confirming={creating}
          confirmLabel="Create font"
          confirmingLabel="Creating…"
        />
      </DialogContent>
    </Dialog>
  );
};
