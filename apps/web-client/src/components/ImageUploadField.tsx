import { useRef, useState } from 'react';

interface ImageUploadFieldProps {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function ImageUploadField({ file, onChange }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (selected: File | null) => {
    onChange(selected);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-content mb-1.5">
        Preview Image
        <span className="text-mist font-normal ml-1">(auto watermarked via Flask processor)</span>
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        className="relative cursor-pointer rounded-xl border-2 border-dashed border-surface-border bg-surface-elevated/50 hover:border-brand-accent/40 transition-colors overflow-hidden"
      >
        {preview ? (
          <div className="relative h-48">
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-sm text-white font-medium">Click to change</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <span className="text-3xl mb-2">🖼️</span>
            <p className="text-sm text-content font-medium">Upload preview artwork</p>
            <p className="text-xs text-mist mt-1">PNG, JPG up to 20MB — VividCraft watermark applied automatically</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {file && (
        <button
          type="button"
          onClick={() => handleFile(null)}
          className="mt-2 text-xs text-red-400 hover:text-red-300"
        >
          Remove image
        </button>
      )}
    </div>
  );
}
