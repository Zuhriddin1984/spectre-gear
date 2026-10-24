'use client';

// Phone photos are often 3–8 MB, above Vercel's 4.5 MB request limit, so the
// picture is shrunk in the browser (max 1600 px, JPEG) before the form is sent.
const MAX = 1600;

async function shrink(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, MAX / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}

export default function PhotoInput() {
  return (
    <input
      type="file"
      name="photo"
      accept="image/*"
      capture="environment"
      required
      onChange={async (e) => {
        const input = e.currentTarget;
        const file = input.files?.[0];
        if (!file || file.size < 700_000) return;
        try {
          const dt = new DataTransfer();
          dt.items.add(await shrink(file));
          input.files = dt.files;
        } catch {
          // keep the original file; small enough photos still go through
        }
      }}
    />
  );
}
