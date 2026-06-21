import { FileType, FolderOpen, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { Font } from '@/core/font';
import { importPortableFont } from '@/core/font';
import { deleteFont, getAllFonts, saveFont,saveGlyphs } from '@/db';
import { useStore } from '@/store';

import { DeleteFontDialog } from './DeleteFontDialog';
import { ImportWizard } from './ImportWizard';
import { NewFontWizard } from './NewFontWizard';

export const HomeScreen = (): React.JSX.Element => {
  const [fonts, setFonts] = useState<Font[]>([]);
  const [newFontOpen, setNewFontOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Font | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [jsonImportError, setJsonImportError] = useState<string | null>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const setCurrentFont = useStore((state) => state.setCurrentFont);
  const setGlyphs = useStore((state) => state.setGlyphs);

  async function loadFonts(): Promise<void> {
    setFonts(await getAllFonts());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadFonts();
  }, []);

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
    }
  }, [renamingId]);

  function openFont(font: Font): void {
    setCurrentFont(font);
    void navigate('/editor');
  }

  function startRename(font: Font): void {
    setRenamingId(font.id);
    setRenameValue(font.name);
  }

  async function commitRename(font: Font): Promise<void> {
    const name = renameValue.trim() || font.name;
    // eslint-disable-next-line react-hooks/purity
    const updated = { ...font, name, updatedAt: Date.now() }; // Date.now() is intentional for timestamp

    await saveFont(updated);
    setRenamingId(null);
    void loadFonts();
  }

  async function handleDelete(font: Font): Promise<void> {
    await deleteFont(font.id);
    setDeleteTarget(null);
    void loadFonts();
  }

  async function handleJsonImport(file: File): Promise<void> {
    setJsonImportError(null);

    try {
      const json = await file.text();
      const { font, glyphs } = importPortableFont(json);

      await saveFont(font);
      await saveGlyphs(glyphs);
      setCurrentFont(font);
      setGlyphs(glyphs);
      void navigate('/editor');
    } catch (err) {
      setJsonImportError(err instanceof Error ? err.message : 'Failed to import font');
    }
  }

  function formatDate(ts: number): string {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
      ts,
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="border-border flex h-12 items-center gap-3 border-b px-4">
        <FileType className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">BMF Font Editor</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* Actions */}
        <div className="mb-8 flex gap-3">
          <Button onClick={() => setNewFontOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New font
          </Button>
          <Button variant="outline" onClick={() => jsonInputRef.current?.click()}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Open font
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import font
          </Button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".bmffont.json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];

              if (file) {
                void handleJsonImport(file);
              }

              event.target.value = '';
            }}
          />
        </div>
        {jsonImportError && <p className="text-destructive -mt-4 text-xs">{jsonImportError}</p>}

        <Separator className="mb-6" />

        {/* Font list */}
        {fonts.length === 0 ? (
          <div className="text-muted-foreground py-16 text-center text-sm">
            <p>No fonts yet.</p>
            <p className="mt-1">
              Create a new font, open a saved font, or import an existing one to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-2">
            <h2 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
              Recent fonts
            </h2>
            {fonts.map((font) => (
              <div
                key={font.id}
                role="button"
                tabIndex={0}
                className="border-border bg-card group flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 transition-colors hover:bg-white/10"
                onClick={() => openFont(font)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openFont(font);
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  {renamingId === font.id ? (
                    <input
                      ref={renameInputRef}
                      className="bg-input text-foreground w-full rounded px-1 py-0.5 text-sm outline-none"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onBlur={() => {
                        void commitRename(font);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          void commitRename(font);
                        }

                        if (event.key === 'Escape') {
                          setRenamingId(null);
                        }

                        event.stopPropagation();
                      }}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <p className="truncate text-sm font-medium">{font.name}</p>
                  )}
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {font.settings.fontSize}px · {font.glyphs.length} glyphs ·{' '}
                    {formatDate(font.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-white/20"
                    onClick={(event) => {
                      event.stopPropagation();
                      startRename(font);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive h-7 w-7 hover:bg-white/20"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeleteTarget(font);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewFontWizard
        open={newFontOpen}
        onOpenChange={(open) => {
          setNewFontOpen(open);

          if (!open) {
            void loadFonts();
          }
        }}
      />
      <ImportWizard
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);

          if (!open) {
            void loadFonts();
          }
        }}
      />
      {deleteTarget && (
        <DeleteFontDialog
          fontName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onConfirm={() => {
            void handleDelete(deleteTarget);
          }}
        />
      )}
    </div>
  );
};
