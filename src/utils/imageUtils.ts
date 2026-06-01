/**
 * Carga una imagen respetando la orientación EXIF y la redimensiona/comprime.
 * Usa createImageBitmap con imageOrientation 'from-image' para corregir fotos
 * tomadas con el teléfono girado (problema común que arruina la reconstrucción).
 */
export async function compressImageToDataUrl(
  file: File,
  maxSize = 2048,
  quality = 0.92,
): Promise<string> {
  const bitmap = await loadOrientedBitmap(file);

  let { width, height } = bitmap;
  if (width > maxSize || height > maxSize) {
    const ratio = Math.min(maxSize / width, maxSize / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // PNG conserva transparencia (importante tras quitar el fondo)
  const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mimeType, quality);
}

async function loadOrientedBitmap(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, {
      imageOrientation: 'from-image',
    } as ImageBitmapOptions);
  } catch {
    // Fallback para navegadores sin soporte de imageOrientation
    return await createImageBitmap(file);
  }
}

/**
 * Elimina el fondo de la imagen en el navegador (lazy import para no inflar el
 * bundle inicial). Devuelve un nuevo File PNG con transparencia. Si algo falla
 * (red, navegador), devuelve el archivo original para no romper el flujo.
 */
export async function removeImageBackground(file: File): Promise<File> {
  try {
    const { removeBackground } = await import('@imgly/background-removal');
    const blob = await removeBackground(file, { output: { format: 'image/png' } });
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '-nobg.png', {
      type: 'image/png',
    });
  } catch (err) {
    console.warn('Background removal failed, using original image:', err);
    return file;
  }
}

export function createObjectUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

export function validateImageFile(file: File): string | null {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return 'Solo se aceptan imágenes JPEG, PNG o WebP';
  }
  if (file.size > 25 * 1024 * 1024) {
    return 'La imagen no puede superar 25 MB';
  }
  return null;
}

export async function downloadFile(url: string, filename: string): Promise<void> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    triggerBlobDownload(blob, filename);
  } catch {
    window.open(url, '_blank');
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
