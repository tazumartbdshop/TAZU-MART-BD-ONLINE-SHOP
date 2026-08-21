import { getDb } from './db';

// Helper to convert Blob or File to Base64 safely
export const blobToBase64 = (blob: Blob | File): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          resolve('');
        }
      };
      reader.onerror = (err) => {
        console.warn("FileReader error during blobToBase64:", err);
        resolve('');
      };
    } catch (e) {
      console.warn("Exception during blobToBase64:", e);
      resolve('');
    }
  });
};

// Safe image resize with Canvas
export const resizeImage = async (file: Blob | File, maxWidth: number = 1200): Promise<Blob> => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let width = img.width || 800;
            let height = img.height || 600;

            if (width > maxWidth) {
              const scale = maxWidth / width;
              canvas.width = maxWidth;
              canvas.height = Math.round(height * scale);
            } else {
              canvas.width = width;
              canvas.height = height;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(file); // Fallback to raw file
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              if (blob) {
                resolve(blob);
              } else {
                resolve(file); // Fallback to raw file
              }
            }, 'image/webp', 0.85);
          } catch (canvasErr) {
            console.warn("Canvas draw/toBlob exception, using raw file:", canvasErr);
            resolve(file);
          }
        };
        img.onerror = () => {
          console.warn("Image load failed in resizeImage, using raw file");
          resolve(file);
        };
        img.src = event.target?.result as string;
      };
      reader.onerror = () => {
        console.warn("FileReader failed in resizeImage, using raw file");
        resolve(file);
      };
    } catch (e) {
      console.warn("resizeImage exception, using raw file:", e);
      resolve(file);
    }
  });
};

/**
 * Universal, ultra-resilient image uploader:
 * 1. Checks if string URL or existing path -> returns directly.
 * 2. If blob: URL -> fetches blob and uploads.
 * 3. Uploads to /api/upload (or Supabase Storage as fallback).
 * 4. Fallback to raw/compressed Base64.
 * 5. NEVER throws "Failed to process image".
 * 6. NEVER returns artificial or placeholder images.
 */
export const uploadImage = async (
  fileOrUrl: File | Blob | string, 
  folder: string = 'media', 
  originalName?: string,
  bucketName: string = 'categories'
): Promise<string> => {
  // 1. If it's already a non-blob URL or base64 string, return directly
  if (typeof fileOrUrl === 'string') {
    const trimmed = fileOrUrl.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('http://') || 
      trimmed.startsWith('https://') || 
      trimmed.startsWith('/uploads/') || 
      trimmed.startsWith('/assets/') ||
      trimmed.startsWith('data:image/')
    ) {
      return trimmed;
    }
    
    // If it's a blob: URL (from URL.createObjectURL), convert it to an actual Blob
    if (trimmed.startsWith('blob:')) {
      try {
        const response = await fetch(trimmed);
        if (response.ok) {
          const fetchedBlob = await response.blob();
          return await uploadImage(fetchedBlob, folder, originalName, bucketName);
        }
      } catch (blobFetchErr) {
        console.warn("Could not fetch blob URL into Blob:", blobFetchErr);
      }
    }
  }

  // 2. Resolve actual Blob / File object
  let blobToUpload: Blob | File;
  if (typeof fileOrUrl === 'string') {
    return fileOrUrl;
  } else {
    blobToUpload = fileOrUrl;
  }

  if (!blobToUpload || !(blobToUpload instanceof Blob)) {
    console.warn("uploadImage received invalid non-blob data:", fileOrUrl);
    return typeof fileOrUrl === 'string' ? fileOrUrl : '';
  }

  // Determine clean filename
  let filename = originalName || `img_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  if (!filename.includes('.')) {
    const mime = blobToUpload.type || '';
    if (mime.includes('png')) filename += '.png';
    else if (mime.includes('webp')) filename += '.webp';
    else if (mime.includes('gif')) filename += '.gif';
    else if (mime.includes('svg')) filename += '.svg';
    else filename += '.jpg';
  }

  // 3. Primary Path: Local backend /api/upload multipart
  try {
    const formData = new FormData();
    formData.append('file', blobToUpload, filename);

    // Add a controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.url) {
        console.log(`[Upload Success] URL: ${data.url}`);
        return data.url;
      }
    } else {
      console.warn(`[Upload API non-200] Status: ${response.status}`);
    }
  } catch (apiErr: any) {
    if (apiErr.name === 'AbortError') {
      console.warn("[Upload API] Upload timed out after 60s");
    } else {
      console.warn(`[Upload API network issue]:`, apiErr);
    }
  }

  // 4. Secondary Path: Convert to Base64 and send JSON to /api/upload or return Base64
  try {
    const b64 = await blobToBase64(blobToUpload);
    if (b64) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s for B64

        const jsonRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64: b64, filename }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (jsonRes.ok) {
          const jsonData = await jsonRes.json();
          if (jsonData && jsonData.url) {
            return jsonData.url;
          }
        }
      } catch (jsonErr: any) {
        console.warn("Base64 /api/upload notice:", jsonErr);
      }

      // If backend file save didn't complete, use user's exact Base64 string directly
      return b64;
    }
  } catch (b64Err) {
    console.warn(`[Base64 fallback note]:`, b64Err);
  }

  // Never return fake demo photos or Unsplash placeholders!
  return '';
};

export const deleteImage = async (url: string): Promise<void> => {
  if (!url) {
    return;
  }
  try {
    const db = getDb();
    if (!db) return;
    
    // Match any Supabase storage public URL structure automatically
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (match) {
       const bucketName = match[1];
       const path = match[2];
       await db.storage.from(bucketName).remove([path]);
       console.log(`Successfully deleted storage image from bucket '${bucketName}': ${path}`);
    }
  } catch (err) {
    console.warn(`Failed to delete image from storage (non-blocking):`, err);
  }
};

