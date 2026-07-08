import {ImageIcon, Upload} from 'lucide-react';
import {readFileAsDataUrl} from '@/lib/io';
import type {BlockViewProps} from './shared';

export function ImageBlock({block, editing, update}: BlockViewProps<'image'>) {
  const {content} = block;

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    update({src: dataUrl});
  };

  if (content.src) {
    return (
      <img
        src={content.src}
        alt={content.alt ?? ''}
        draggable={false}
        className="h-full w-full select-none rounded-md"
        style={{objectFit: content.fit}}
      />
    );
  }

  if (editing) {
    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-slate-500"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          value={content.src}
          onChange={(e) => update({src: e.target.value})}
          placeholder="Paste image URL…"
          className="field-input text-xs"
        />
        <label className="panel-btn cursor-pointer border border-slate-200 text-xs">
          <Upload size={14} /> Upload image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
        </label>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400">
      <ImageIcon size={28} />
      <span className="text-xs">Double-click to add image</span>
    </div>
  );
}
