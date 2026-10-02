import React, { useEffect, useId, useRef, useState } from "react";
import "./photos.css";

export type Photo = {
  position: number;
  url: string;
  url400: string;
  width: number | null;
  height: number | null;
  alt: string;
};

type PhotoManagerProps = {
  photos: Photo[];
  disabled: boolean;
  canUpload: boolean;
  uploadProgress: string;
  onUpload: (files: File[]) => void;
  onRemove: (position: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
};

function Icon({ name }: { name: "left" | "right" | "upload" | "trash" }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {name === "left" && <><path d="m12 5-7 7 7 7" /><path d="M5 12h14" /></>}
    {name === "right" && <><path d="m12 5 7 7-7 7" /><path d="M5 12h14" /></>}
    {name === "upload" && <><path d="M12 16V3m-5 5 5-5 5 5" /><path d="M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>}
    {name === "trash" && <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></>}
  </svg>;
}

export default function PhotoManager({ photos, disabled, canUpload, uploadProgress, onUpload, onRemove, onMove }: PhotoManagerProps) {
  const picker = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const cards = useRef(new Map<string, HTMLLIElement>());
  const pendingMove = useRef<{ url: string; fromIndex: number; direction: -1 | 1 } | null>(null);
  const [dragging, setDragging] = useState(false);
  const helpId = useId();
  const unavailable = disabled || !canUpload;

  useEffect(() => {
    if (unavailable) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }, [unavailable]);

  useEffect(() => {
    if (disabled || !pendingMove.current) return;
    const move = pendingMove.current;
    pendingMove.current = null;
    const index = photos.findIndex((photo) => photo.url === move.url);
    if (index === -1 || index === move.fromIndex) return;
    const card = cards.current.get(move.url);
    const arrow = card?.querySelector<HTMLButtonElement>(`[data-move-direction="${move.direction}"]`);
    (arrow ?? card)?.focus();
  }, [photos, disabled]);

  const hasFiles = (event: React.DragEvent) => Array.from(event.dataTransfer.types).includes("Files");

  return <fieldset className="admin-photos form-section">
    <legend className="admin-photos__legend">Photos <span>{photos.length}</span></legend>
    <p className="admin-photos__intro">The first photo appears in vehicle listings. Use the arrows to change the order. Photo changes save immediately.</p>

    {photos.length > 0 && <ol className="admin-photos__grid" aria-label="Vehicle photos in display order">
      {photos.map((photo, index) => <li className="admin-photos__card" key={photo.url} tabIndex={-1}
        aria-label={`Photo ${index + 1} of ${photos.length}${index === 0 ? ", cover photo" : ""}`}
        ref={(element) => { if (element) cards.current.set(photo.url, element); else cards.current.delete(photo.url); }}>
        <div className="admin-photos__card-heading">
          <span className="admin-photos__position">{index + 1} of {photos.length}</span>
          {index === 0 && <span className="admin-photos__cover">Cover photo</span>}
        </div>
        <div className="admin-photos__image">
          <img src={photo.url400 || photo.url} alt={photo.alt || `Vehicle photo ${index + 1}`}
            width={photo.width ?? undefined} height={photo.height ?? undefined} loading="lazy" />
        </div>
        <div className="admin-photos__actions">
          <div className="admin-photos__arrows">
            {index > 0 && <button type="button" className="admin-photos__move" disabled={disabled}
              data-move-direction={-1}
              aria-label={`Move photo ${index + 1} before photo ${index}`} title="Move left"
              onClick={() => {
                pendingMove.current = { url: photo.url, fromIndex: index, direction: -1 };
                onMove(index, -1);
              }}><Icon name="left" /></button>}
            {index < photos.length - 1 && <button type="button" className="admin-photos__move" disabled={disabled}
              data-move-direction={1}
              aria-label={`Move photo ${index + 1} after photo ${index + 2}`} title="Move right"
              onClick={() => {
                pendingMove.current = { url: photo.url, fromIndex: index, direction: 1 };
                onMove(index, 1);
              }}><Icon name="right" /></button>}
          </div>
          <button type="button" className="admin-photos__remove" disabled={disabled}
            aria-label={`Remove photo ${index + 1}`} title={`Remove photo ${index + 1}`}
            onClick={() => onRemove(photo.position)}><Icon name="trash" /><span>Remove</span></button>
        </div>
      </li>)}
    </ol>}

    <div className={`admin-photos__dropzone${dragging ? " is-dragging" : ""}${unavailable ? " is-unavailable" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        if (!hasFiles(event) || unavailable) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = unavailable ? "none" : "copy";
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (!unavailable && event.dataTransfer.files.length) onUpload(Array.from(event.dataTransfer.files));
      }}>
      <div className="admin-photos__upload-icon"><Icon name="upload" /></div>
      <div className="admin-photos__drop-copy">
        <h3>{!canUpload ? "Add photos after saving" : dragging ? "Drop photos to upload" : "Add vehicle photos"}</h3>
        <p id={helpId}>{!canUpload ? "Save the vehicle first, then choose or drop your photos here."
          : disabled ? "Please wait while your changes are saved."
            : "Drag and drop photos here, or choose files from your device."}</p>
        <span className="admin-photos__formats">JPEG, PNG or WebP · Select multiple photos at once</span>
      </div>
      <button type="button" className="admin-photos__choose" disabled={unavailable}
        aria-describedby={helpId} onClick={() => picker.current?.click()}>Choose photos</button>
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden
        aria-label="Choose vehicle photos" disabled={unavailable} onChange={(event) => {
          const files = Array.from<File>(event.target.files ?? []);
          event.target.value = "";
          if (!unavailable && files.length) onUpload(files);
        }} />
    </div>
    <div className="admin-photos__progress" role="status" aria-live="polite" aria-atomic="true">
      {uploadProgress && <p><span className="admin-photos__spinner" aria-hidden="true" />{uploadProgress}</p>}
    </div>
  </fieldset>;
}
