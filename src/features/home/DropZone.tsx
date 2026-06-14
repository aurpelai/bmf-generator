import { Upload } from 'lucide-react';
import React, { useRef, useState } from 'react';

export const DropZone = ({
  label,
  accept,
  file,
  onFile,
  hint,
}: {
  label: string;
  accept: string;
  file: File | null;
  onFile: (f: File) => void;
  hint?: string;
}): React.JSX.Element => {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className={`flex h-full cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed px-4 py-5 text-sm transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const droppedFile = event.dataTransfer.files[0];

        if (droppedFile) {
          onFile(droppedFile);
        }
      }}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="text-muted-foreground h-4 w-4" />
      {file ? (
        <span className="text-foreground max-w-full truncate px-2 font-medium">{file.name}</span>
      ) : (
        <>
          <span className="text-muted-foreground">{label}</span>
          {hint && <span className="text-muted-foreground mt-1 text-xs">{hint}</span>}
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];

          if (selectedFile) {
            onFile(selectedFile);
          }
        }}
      />
    </div>
  );
};
