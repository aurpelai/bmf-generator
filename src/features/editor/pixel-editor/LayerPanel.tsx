import { Eye, EyeOff, Lock, Palette, Plus, Trash2, Unlock } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { MAX_LAYERS_PER_GLYPH } from '@/config';
import {
  addLayer,
  cloneLayers,
  removeLayer,
  updateLayer,
} from '@/core/project/layers';
import { saveGlyphs } from '@/db/glyphs';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

export const LayerPanel = (): React.JSX.Element | null => {
  const glyphs = useStore((state) => state.glyphs);
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const activeLayerId = useStore((state) => state.activeLayerId);
  const setActiveLayerId = useStore((state) => state.setActiveLayerId);
  const multiSelectLayerIds = useStore((state) => state.multiSelectLayerIds);
  const setMultiSelectLayerIds = useStore((state) => state.setMultiSelectLayerIds);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const pushUndo = useStore((state) => state.pushUndo);

  const glyph = glyphs.find((glyphItem) => glyphItem.codePoint === selectedCodePoint);

  if (!glyph) {
    return null;
  }

  function commit(next: typeof glyph, snapshot = true): void {
    if (!glyph || !next) {
      return;
    }

    if (snapshot) {
      pushUndo(glyph.codePoint, { layers: cloneLayers(glyph.layers) });
    }

    upsertGlyph(next);
    void saveGlyphs([next]);
  }

  function handleAddLayer(): void {
    if (!glyph || glyph.layers.length >= MAX_LAYERS_PER_GLYPH) {
      return;
    }

    const next = addLayer(glyph);

    if (next === glyph) {
      return;
    }

    const added = next.layers[next.layers.length - 1];

    commit({ ...next, isDirty: true });
    setActiveLayerId(added.id);
  }

  function handleRemoveLayer(layerId: string): void {
    if (!glyph || glyph.layers.length <= 1) {
      return;
    }

    const next = removeLayer(glyph, layerId);

    if (next === glyph) {
      return;
    }

    commit({ ...next, isDirty: true });

    if (activeLayerId === layerId) {
      setActiveLayerId(next.layers[next.layers.length - 1].id);
    }

    if (multiSelectLayerIds.includes(layerId)) {
      setMultiSelectLayerIds(multiSelectLayerIds.filter((id) => id !== layerId));
    }
  }

  function handleToggle(layerId: string, key: 'visible' | 'preview' | 'locked'): void {
    if (!glyph) {
      return;
    }

    const target = glyph.layers.find((layer) => layer.id === layerId);

    if (!target) {
      return;
    }

    const next = updateLayer(glyph, layerId, { [key]: !target[key] });

    commit({ ...next, isDirty: true });
  }

  function handleSelectLayer(layerId: string, additive: boolean): void {
    if (additive) {
      const exists = multiSelectLayerIds.includes(layerId);
      const next = exists
        ? multiSelectLayerIds.filter((id) => id !== layerId)
        : [...multiSelectLayerIds, layerId];

      setMultiSelectLayerIds(next);

      return;
    }

    setActiveLayerId(layerId);

    if (multiSelectLayerIds.length > 0) {
      setMultiSelectLayerIds([]);
    }
  }

  // Render top-to-bottom: visually the topmost layer (last in array) appears at the top of the panel.
  const renderedLayers = [...glyph.layers].reverse();
  const atCap = glyph.layers.length >= MAX_LAYERS_PER_GLYPH;

  return (
    <aside
      aria-label="Layer panel"
      className="border-border bg-card flex w-56 shrink-0 flex-col border-l"
    >
      <header className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground text-xs font-medium">Layers</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          title={atCap ? `Max ${MAX_LAYERS_PER_GLYPH} layers` : 'Add layer'}
          disabled={atCap}
          onClick={handleAddLayer}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </header>
      <ul className="flex-1 overflow-y-auto" role="list">
        {renderedLayers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const isMultiSelected = multiSelectLayerIds.includes(layer.id);

          return (
            <li
              key={layer.id}
              className={cn(
                'border-border/40 flex items-center gap-1.5 border-b px-2 py-1.5 text-xs',
                isActive && 'bg-accent/40',
                isMultiSelected && 'bg-primary/20',
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => handleToggle(layer.id, 'visible')}
              >
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title={layer.preview ? 'Render as white (final look)' : 'Render in layer tint'}
                onClick={() => handleToggle(layer.id, 'preview')}
              >
                <Palette
                  className="h-3.5 w-3.5"
                  style={{ color: layer.preview ? layer.color : 'currentColor' }}
                />
              </Button>
              <button
                type="button"
                className={cn(
                  'flex-1 truncate text-left',
                  !layer.visible && 'text-muted-foreground',
                )}
                onClick={(event) =>
                  handleSelectLayer(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)
                }
              >
                {layer.name}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={() => handleToggle(layer.id, 'locked')}
              >
                {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title="Delete layer"
                disabled={glyph.layers.length <= 1}
                onClick={() => handleRemoveLayer(layer.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
