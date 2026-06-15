import React, { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BASE_RATIO,
  CAP_HEIGHT_RATIO,
  DEFAULT_FONT_SIZE,
  DIALOG_RESET_DELAY_MS,
  LINE_HEIGHT_RATIO,
} from '@/config';
import type { BmfParseResult } from '@/core/bmf/parse';
import { parseBmfText } from '@/core/bmf/parse';
import type { RasterizedGlyph } from '@/core/font/rasterize';
import { createProject, makeBlankGlyph } from '@/core/project';
import { GLYPH_SETS } from '@/core/project/glyphSets';
import type { Glyph } from '@/core/project/types';
import { saveFontFile, saveGlyphs } from '@/db/glyphs';
import { saveProject } from '@/db/projects';
import { useRasterize } from '@/hooks/useRasterize';
import { useStore } from '@/store';
import type { ImportPreset } from '@/store/exportSlice';
import { filterCodePointsByPreset, IMPORT_PRESETS } from '@/store/exportSlice';

import { DropZone } from './DropZone';
import { FontMetricsFields } from './FontMetricsFields';
import { GlyphPreviewStep } from './GlyphPreviewStep';
import { GlyphSetSelect } from './GlyphSetSelect';
import { PaddingFields } from './PaddingFields';
import { SpacingFields } from './SpacingFields';
import { WizardFooter } from './WizardFooter';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3;
type FontFormat = 'ttf' | 'bmf';

// --- BMF atlas slicing helpers ---

type AtlasMode = 'alpha' | 'rgb-white-on-black' | 'rgb-black-on-white';

function detectAtlasMode(data: Uint8ClampedArray, width: number, height: number): AtlasMode {
  for (let index = 3; index < data.length; index += 4) {
    const alpha = data[index];

    if (alpha !== 0 && alpha !== 255) {
      return 'alpha';
    }
  }

  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ];
  const avgCornerRed = corners.reduce((sum, index) => sum + data[index], 0) / corners.length;

  return avgCornerRed >= 128 ? 'rgb-black-on-white' : 'rgb-white-on-black';
}

function sliceGlyphsFromAtlas(
  imageData: ImageData,
  chars: BmfParseResult['chars'],
  projectId: string,
): Glyph[] {
  const { data, width: atlasW, height: atlasH } = imageData;
  const mode = detectAtlasMode(data, atlasW, atlasH);

  return chars.map((char) => {
    if (char.width === 0 || char.height === 0) {
      return {
        codePoint: char.id,
        projectId,
        pixels: new Uint8Array(0),
        width: 0,
        height: 0,
        xoffset: char.xoffset,
        yoffset: char.yoffset,
        xadvance: char.xadvance,
        isDirty: false,
      };
    }

    const pixels = new Uint8Array(char.width * char.height);

    for (let row = 0; row < char.height; row++) {
      for (let col = 0; col < char.width; col++) {
        const atlasIdx = ((char.y + row) * atlasW + (char.x + col)) * 4;
        const value =
          mode === 'alpha'
            ? data[atlasIdx + 3]
            : mode === 'rgb-black-on-white'
              ? 255 - data[atlasIdx]
              : data[atlasIdx];

        pixels[row * char.width + col] = value;
      }
    }

    return {
      codePoint: char.id,
      projectId,
      pixels,
      width: char.width,
      height: char.height,
      xoffset: char.xoffset,
      yoffset: char.yoffset,
      xadvance: char.xadvance,
      isDirty: false,
    };
  });
}

// --- Wizard component ---

export const ImportWizard = ({ open, onOpenChange }: Props): React.JSX.Element => {
  const [step, setStep] = useState<Step>(1);
  const [format, setFormat] = useState<FontFormat | null>(null);

  // Step 1 — upload
  const [ttfFile, setTtfFile] = useState<File | null>(null);
  const [fntFile, setFntFile] = useState<File | null>(null);
  const [pngFile, setPngFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState('');
  const [importPreset, setImportPreset] = useState<ImportPreset>('all');
  const [nameError, setNameError] = useState('');

  // Step 2 — settings (shared, BMF pre-populates from parsed .fnt)
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [lineHeight, setLineHeight] = useState(Math.round(DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO));
  const [base, setBase] = useState(Math.round(DEFAULT_FONT_SIZE * BASE_RATIO));
  const [capHeight, setCapHeight] = useState(Math.round(DEFAULT_FONT_SIZE * CAP_HEIGHT_RATIO));
  const [glyphSetId, setGlyphSetId] = useState(GLYPH_SETS[0].id);
  const [paddingTop, setPaddingTop] = useState(1);
  const [paddingRight, setPaddingRight] = useState(1);
  const [paddingBottom, setPaddingBottom] = useState(1);
  const [paddingLeft, setPaddingLeft] = useState(1);
  const [spacingX, setSpacingX] = useState(1);
  const [spacingY, setSpacingY] = useState(1);

  // Expected atlas filename read from .fnt (for the PNG drop zone hint)
  const [expectedAtlasFilename, setExpectedAtlasFilename] = useState<string | null>(null);

  // Step 3 — preview / processing
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [previewGlyphs, setPreviewGlyphs] = useState<(Glyph | RasterizedGlyph)[]>([]);
  const [confirming, setConfirming] = useState(false);

  // Refs to carry data across steps without re-triggering effects
  const ttfBufferRef = useRef<ArrayBuffer | null>(null);
  const ttfMetricsRef = useRef({ lineHeight: 0, base: 0, capHeight: 0 });
  const bmfParsedRef = useRef<BmfParseResult | null>(null);
  const bmfImageDataRef = useRef<ImageData | null>(null);

  const { rasterize } = useRasterize();
  const navigate = useNavigate();
  const setCurrentProject = useStore((state) => state.setCurrentProject);
  const setStoreGlyphs = useStore((state) => state.setGlyphs);

  // --- Step 1 file handlers ---

  function handleFirstFile(file: File): void {
    if (/\.fnt$/i.test(file.name)) {
      handleFntFile(file);
    } else if (/\.(ttf|otf|woff2?)$/i.test(file.name)) {
      setTtfFile(file);
      setFormat('ttf');

      if (!projectName) {
        setProjectName(file.name.replace(/\.[^.]+$/, ''));
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        ttfBufferRef.current = event.target?.result as ArrayBuffer;
      };

      reader.readAsArrayBuffer(file);
    }
    // Silently ignore unrecognised files (e.g. accidentally dropping a .png)
  }

  function handleFntFile(file: File): void {
    setFntFile(file);
    setFormat('bmf');

    if (!projectName) {
      setProjectName(file.name.replace(/\.fnt$/i, ''));
    }

    // Read the atlas filename from the .fnt so we can hint it on the PNG drop zone
    void file.text().then((text) => {
      try {
        const parsed = parseBmfText(text);

        bmfParsedRef.current = parsed;
        setExpectedAtlasFilename(parsed.atlasFilename);
      } catch {
        // Ignore parse errors at this point; they'll surface at the preview step
      }
    });
  }

  // --- Step 1 → 2 transition: parse BMF early to pre-populate settings ---

  async function goToSettings(): Promise<void> {
    if (!projectName.trim()) {
      setNameError('Font name is required');

      return;
    }

    if (format === 'bmf' && fntFile) {
      try {
        // May already be parsed eagerly when the .fnt was dropped
        const parsed = bmfParsedRef.current ?? parseBmfText(await fntFile.text());

        bmfParsedRef.current = parsed;
        setFontSize(parsed.info.size);
        setLineHeight(parsed.common.lineHeight);
        setBase(parsed.common.base);
        setCapHeight(Math.round((parsed.common.base * CAP_HEIGHT_RATIO) / BASE_RATIO));
        setPaddingTop(parsed.info.padding.top);
        setPaddingRight(parsed.info.padding.right);
        setPaddingBottom(parsed.info.padding.bottom);
        setPaddingLeft(parsed.info.padding.left);
        setSpacingX(parsed.info.spacing.x);
        setSpacingY(parsed.info.spacing.y);
      } catch {
        // Non-fatal: leave defaults, error will surface at preview step
      }
    }

    setStep(2);
  }

  // --- Step 2 → 3 transition: rasterise or slice ---

  const runProcessing = useCallback(async () => {
    setProcessing(true);
    setProcessError(null);

    try {
      if (format === 'ttf') {
        if (!ttfBufferRef.current) {
          throw new Error('No font buffer');
        }

        const foundGlyphSet =
          GLYPH_SETS.find((glyphSet) => glyphSet.id === glyphSetId) ?? GLYPH_SETS[0];
        const codePoints = filterCodePointsByPreset(importPreset, foundGlyphSet.codePoints);
        const bufferCopy = ttfBufferRef.current.slice(0);
        const result = await rasterize(bufferCopy, codePoints, fontSize);

        setPreviewGlyphs(result.glyphs);
        ttfMetricsRef.current = {
          lineHeight: result.lineHeight,
          base: result.base,
          capHeight: result.capHeight,
        };
      } else {
        if (!fntFile || !pngFile) {
          throw new Error('Missing files');
        }

        // Re-use already-parsed .fnt if available, otherwise parse now
        const parsed = bmfParsedRef.current ?? parseBmfText(await fntFile.text());

        bmfParsedRef.current = parsed;

        const pngUrl = URL.createObjectURL(pngFile);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image();

          element.onload = () => resolve(element);
          element.onerror = () => reject(new Error('Failed to load atlas image'));
          element.src = pngUrl;
        });

        URL.revokeObjectURL(pngUrl);

        const canvas = document.createElement('canvas');

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const context = canvas.getContext('2d')!; // canvas is a real DOM element

        context.drawImage(img, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        bmfImageDataRef.current = imageData;

        const allCodePoints = parsed.chars.map((bmfChar) => bmfChar.id);
        const filteredCodePoints = filterCodePointsByPreset(importPreset, allCodePoints);
        const filteredSet = new Set(filteredCodePoints);
        const preview = sliceGlyphsFromAtlas(
          imageData,
          parsed.chars.filter((bmfChar) => filteredSet.has(bmfChar.id)),
          'preview',
        );

        setPreviewGlyphs(preview);
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Processing failed');
    } finally {
      setProcessing(false);
    }
  }, [format, glyphSetId, importPreset, fontSize, fntFile, pngFile, rasterize]);

  async function goToPreview(): Promise<void> {
    setStep(3);
    await runProcessing();
  }

  // --- Confirm ---

  async function handleConfirm(): Promise<void> {
    setConfirming(true);

    try {
      const foundGlyphSet =
        GLYPH_SETS.find((glyphSet) => glyphSet.id === glyphSetId) ?? GLYPH_SETS[0];
      const padding = {
        top: paddingTop,
        right: paddingRight,
        bottom: paddingBottom,
        left: paddingLeft,
      };
      const spacing = { x: spacingX, y: spacingY };

      if (format === 'ttf') {
        if (!ttfBufferRef.current || previewGlyphs.length === 0) {
          return;
        }

        const fontId = crypto.randomUUID();
        const filteredCodePoints = filterCodePointsByPreset(importPreset, foundGlyphSet.codePoints);
        const project = createProject(projectName || 'Untitled', {
          sourceFontId: fontId,
          fontSize,
          padding,
          spacing,
          lineHeight,
          base,
          capHeight,
        });

        project.glyphs = filteredCodePoints;
        const glyphs: Glyph[] = (previewGlyphs as RasterizedGlyph[]).map((rasterizedGlyph) => ({
          codePoint: rasterizedGlyph.codePoint,
          projectId: project.id,
          pixels: rasterizedGlyph.pixels,
          width: rasterizedGlyph.width,
          height: rasterizedGlyph.height,
          xoffset: rasterizedGlyph.xoffset,
          yoffset: rasterizedGlyph.yoffset,
          xadvance: rasterizedGlyph.xadvance,
          isDirty: false,
        }));

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        await saveFontFile(fontId, ttfBufferRef.current, ttfFile!.name); // ttfFile is set when format === 'ttf'
        await saveProject(project);
        await saveGlyphs(glyphs);
        setCurrentProject(project);
        setStoreGlyphs(glyphs);
      } else {
        if (!bmfParsedRef.current || !bmfImageDataRef.current) {
          return;
        }

        const parsed = bmfParsedRef.current;
        const imageData = bmfImageDataRef.current;
        const name = projectName.trim() || parsed.info.face || 'Imported Font';
        const project = createProject(name, {
          sourceFontId: null,
          fontSize,
          padding,
          spacing,
          lineHeight,
          base,
          capHeight,
        });

        project.glyphs = foundGlyphSet.codePoints;
        const allFntCodePoints = parsed.chars.map((bmfChar) => bmfChar.id);
        const filteredCodePoints = filterCodePointsByPreset(importPreset, allFntCodePoints);
        const filteredSet = new Set(filteredCodePoints);
        const importedGlyphs = sliceGlyphsFromAtlas(
          imageData,
          parsed.chars.filter((bmfChar) => filteredSet.has(bmfChar.id)),
          project.id,
        );
        const importedSet = new Set(importedGlyphs.map((glyph) => glyph.codePoint));
        const blankGlyphs = foundGlyphSet.codePoints
          .filter((codePoint) => !importedSet.has(codePoint))
          .map((codePoint) =>
            makeBlankGlyph(project.id, codePoint, fontSize, parsed.common.lineHeight),
          );
        const allGlyphs = [...importedGlyphs, ...blankGlyphs];

        await saveProject(project);
        await saveGlyphs(allGlyphs);
        setCurrentProject(project);
        setStoreGlyphs(allGlyphs);
      }

      void navigate('/editor');
      onOpenChange(false);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setConfirming(false);
    }
  }

  // --- Reset ---

  function handleClose(): void {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1);
      setFormat(null);
      setTtfFile(null);
      setFntFile(null);
      setPngFile(null);
      setProjectName('');
      setNameError('');
      setImportPreset('all');
      setFontSize(DEFAULT_FONT_SIZE);
      setLineHeight(Math.round(DEFAULT_FONT_SIZE * LINE_HEIGHT_RATIO));
      setBase(Math.round(DEFAULT_FONT_SIZE * BASE_RATIO));
      setCapHeight(Math.round(DEFAULT_FONT_SIZE * CAP_HEIGHT_RATIO));
      setGlyphSetId(GLYPH_SETS[0].id);
      setPaddingTop(1);
      setPaddingRight(1);
      setPaddingBottom(1);
      setPaddingLeft(1);
      setSpacingX(1);
      setSpacingY(1);
      setExpectedAtlasFilename(null);
      setPreviewGlyphs([]);
      setProcessError(null);
      ttfBufferRef.current = null;
      bmfParsedRef.current = null;
      bmfImageDataRef.current = null;
    }, DIALOG_RESET_DELAY_MS);
  }

  // --- Derived state ---

  const step1Valid = format === 'ttf' ? !!ttfFile : !!(fntFile && pngFile);

  const stepTitles: Record<Step, string> = {
    1: 'Import Font — Upload',
    2: 'Import Font — Settings',
    3: 'Import Font — Preview',
  };

  const primaryFileName = format === 'ttf' ? ttfFile?.name : fntFile?.name;
  const previewSummary = (
    <>
      <span className="text-foreground font-mono">{primaryFileName}</span>
      {' · '}
      {fontSize}px{' · '}
      {GLYPH_SETS.find((glyphSet) => glyphSet.id === glyphSetId)?.label}
      {importPreset !== 'all' && (
        <>
          {' · '}
          {IMPORT_PRESETS.find((preset) => preset.id === importPreset)?.label}
        </>
      )}
    </>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 sm:max-w-lg">
        <DialogHeader className="bg-popover z-10 -mx-4 -mt-4 px-4 pt-4 pb-4">
          <DialogTitle>{stepTitles[step]}</DialogTitle>
          <p className="text-muted-foreground text-xs">Step {step} of 3</p>
        </DialogHeader>

        {step === 1 && (
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-2 pb-4">
            {format === 'bmf' ? (
              <div className="flex items-stretch gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs">Font descriptor</Label>
                  <DropZone
                    label="Drop .fnt file"
                    accept=".fnt"
                    file={fntFile}
                    onFile={handleFntFile}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label className="text-xs">Atlas image</Label>
                  <DropZone
                    label="Drop .png file"
                    accept=".png,.jpg,.webp"
                    file={pngFile}
                    onFile={setPngFile}
                    hint={expectedAtlasFilename ?? undefined}
                  />
                </div>
              </div>
            ) : (
              <DropZone
                label="Drop a font file here"
                accept=".ttf,.otf,.woff,.woff2,.fnt"
                file={ttfFile}
                onFile={handleFirstFile}
                hint="TTF, OTF, WOFF, WOFF2 · or drop a .fnt for BMF import"
              />
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="imp-preset">Glyphs to import</Label>
              <select
                id="imp-preset"
                className="bg-input border-border text-foreground h-8 rounded-md border px-3 text-sm"
                value={importPreset}
                onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
                  setImportPreset(event.target.value as ImportPreset)
                }
              >
                {IMPORT_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="imp-name">Font name</Label>
              <Input
                id="imp-name"
                value={projectName}
                placeholder="Untitled"
                className={nameError ? 'border-destructive' : ''}
                onChange={(event) => {
                  setProjectName(event.target.value);

                  if (event.target.value.trim()) {
                    setNameError('');
                  }
                }}
              />
              {nameError && <p className="text-destructive text-xs">{nameError}</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1 pt-2 pb-4">
            <div className="grid gap-1.5">
              <Label htmlFor="imp-glyphset">Glyph set</Label>
              <GlyphSetSelect id="imp-glyphset" value={glyphSetId} onChange={setGlyphSetId} />
            </div>
            <FontMetricsFields
              fontSize={fontSize}
              lineHeight={lineHeight}
              base={base}
              capHeight={capHeight}
              onFontSizeChange={setFontSize}
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

        {step === 3 && (
          <GlyphPreviewStep
            loading={processing}
            loadingMessage={format === 'ttf' ? 'Rasterising glyphs…' : 'Loading glyphs…'}
            error={processError}
            glyphs={previewGlyphs}
            summary={previewSummary}
          />
        )}

        <WizardFooter
          step={step}
          totalSteps={3}
          onClose={handleClose}
          onBack={() => setStep((prevStep) => (prevStep - 1) as Step)}
          onNext={() => {
            void (step === 1 ? goToSettings() : goToPreview());
          }}
          onConfirm={() => {
            void handleConfirm();
          }}
          nextDisabled={step === 1 && !step1Valid}
          backDisabled={processing || confirming}
          confirmDisabled={processing || previewGlyphs.length === 0 || !!processError || confirming}
          confirming={confirming}
        />
      </DialogContent>
    </Dialog>
  );
};
