import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Palette,
  Plus,
  Trash2,
  Unlock,
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { MAX_LAYERS_PER_GLYPH } from '@/config';
import {
  addLayer,
  cloneLayers,
  layerColor,
  removeLayer,
  reorderLayers,
  updateLayer,
} from '@/core/project/layers';
import { saveGlyphs } from '@/db/glyphs';
import { cn } from '@/lib/utils';
import { useStore } from '@/store';

interface LayerPanelProps {
  collapsed: boolean;
  onCollapse: () => void;
}

export const LayerPanel = ({
  collapsed,
  onCollapse,
}: LayerPanelProps): React.JSX.Element | null => {
  const glyphs = useStore((state) => state.glyphs);
  const selectedCodePoint = useStore((state) => state.selectedCodePoint);
  const activeLayerId = useStore((state) => state.activeLayerId);
  const setActiveLayerId = useStore((state) => state.setActiveLayerId);
  const multiSelectLayerIds = useStore((state) => state.multiSelectLayerIds);
  const setMultiSelectLayerIds = useStore((state) => state.setMultiSelectLayerIds);
  const upsertGlyph = useStore((state) => state.upsertGlyph);
  const pushUndo = useStore((state) => state.pushUndo);

  const [dragSourceId, setDragSourceId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<
    { targetId: string; position: 'above' | 'below' } | null
  >(null);

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

  function handleDrop(targetId: string, position: 'above' | 'below'): void {
    if (!glyph || !dragSourceId || dragSourceId === targetId) {
      return;
    }

    const fromIndex = glyph.layers.findIndex((layer) => layer.id === dragSourceId);
    const targetIndex = glyph.layers.findIndex((layer) => layer.id === targetId);

    if (fromIndex === -1 || targetIndex === -1) {
      return;
    }

    // Panel is rendered top-to-bottom over the reversed layers array, so
    // "above the target row" means a higher array index, "below" means lower.
    let toIndex = position === 'above' ? targetIndex + 1 : targetIndex;

    if (fromIndex < toIndex) {
      // After splicing the source out, indices above it shift down by one.
      toIndex -= 1;
    }

    if (fromIndex === toIndex) {
      return;
    }

    const next = reorderLayers(glyph, fromIndex, toIndex);

    if (next === glyph) {
      return;
    }

    commit({ ...next, isDirty: true });
  }

  // Render top-to-bottom: visually the topmost layer (last in array) appears at the top of the panel.
  const renderedLayers = [...glyph.layers].reverse();
  const atCap = glyph.layers.length >= MAX_LAYERS_PER_GLYPH;

  return (
    <aside
      aria-label="Layer panel"
      className={cn(
        'border-border bg-card flex shrink-0 flex-col border-l',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <header
        className={cn(
          'border-border flex h-9 shrink-0 items-center border-b px-2',
          collapsed && 'justify-end',
        )}
      >
        {!collapsed && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              title={atCap ? `Max ${MAX_LAYERS_PER_GLYPH} layers` : 'Add layer'}
              aria-label="Add layer"
              disabled={atCap}
              onClick={handleAddLayer}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <span className="text-muted-foreground ml-2 flex-1 text-xs font-medium">
              Layers ({glyph.layers.length}/{MAX_LAYERS_PER_GLYPH})
            </span>
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          title={collapsed ? 'Expand layer panel' : 'Collapse layer panel'}
          aria-label={collapsed ? 'Expand layer panel' : 'Collapse layer panel'}
          onClick={onCollapse}
        >
          {collapsed ? (
            <ChevronLeft className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </Button>
      </header>
      <ul className="flex-1 overflow-y-auto" role="list">
        {renderedLayers.map((layer) => {
          const isSelected =
            layer.id === activeLayerId || multiSelectLayerIds.includes(layer.id);
          const isDragging = dragSourceId === layer.id;
          const isDropAbove =
            dropIndicator?.targetId === layer.id && dropIndicator.position === 'above';
          const isDropBelow =
            dropIndicator?.targetId === layer.id && dropIndicator.position === 'below';

          return (
            <li
              key={layer.id}
              draggable
              className={cn(
                'border-border/40 hover:bg-accent/40 flex cursor-pointer items-center border-b py-1.5 text-xs',
                collapsed ? 'justify-center gap-0.5 px-1' : 'gap-1.5 px-2',
                isSelected && 'bg-accent/60 hover:bg-accent/60',
                isDragging && 'opacity-50',
                isDropAbove && 'border-t-primary border-t-2',
                isDropBelow && 'border-b-primary border-b-2',
              )}
              onClick={(event) =>
                handleSelectLayer(layer.id, event.shiftKey || event.metaKey || event.ctrlKey)
              }
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                setDragSourceId(layer.id);
              }}
              onDragOver={(event) => {
                if (!dragSourceId || dragSourceId === layer.id) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';

                const rect = event.currentTarget.getBoundingClientRect();
                const position: 'above' | 'below' =
                  event.clientY < rect.top + rect.height / 2 ? 'above' : 'below';

                if (
                  dropIndicator?.targetId !== layer.id ||
                  dropIndicator.position !== position
                ) {
                  setDropIndicator({ targetId: layer.id, position });
                }
              }}
              onDragLeave={() => {
                if (dropIndicator?.targetId === layer.id) {
                  setDropIndicator(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();

                if (dropIndicator) {
                  handleDrop(dropIndicator.targetId, dropIndicator.position);
                }

                setDragSourceId(null);
                setDropIndicator(null);
              }}
              onDragEnd={() => {
                setDragSourceId(null);
                setDropIndicator(null);
              }}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggle(layer.id, 'visible');
                }}
              >
                {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                title={layer.preview ? 'Render as white (final look)' : 'Render in layer tint'}
                onClick={(event) => {
                  event.stopPropagation();
                  handleToggle(layer.id, 'preview');
                }}
              >
                <Palette
                  className="h-3.5 w-3.5"
                  style={{ color: layer.preview ? layerColor(layer) : 'currentColor' }}
                />
              </Button>
              {!collapsed && (
                <>
                  <span
                    className={cn(
                      'flex-1 truncate text-left',
                      !layer.visible && 'text-muted-foreground',
                    )}
                  >
                    {layer.name}
                  </span>
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleToggle(layer.id, 'locked');
                      }}
                    >
                      {layer.locked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <Unlock className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="shrink-0"
                      title="Delete layer"
                      disabled={glyph.layers.length <= 1}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveLayer(layer.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
};
