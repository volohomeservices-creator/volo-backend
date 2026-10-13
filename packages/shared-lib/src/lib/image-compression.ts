import imageCompression from 'browser-image-compression';

export async function compressKycImage(file: File, documentType: string): Promise<File> {
  const isDocument = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN_CARD'].includes(documentType);
  
  const options = {
    maxSizeMB: isDocument ? 0.3 : 0.25, // 300KB for docs, 250KB for photos
    maxWidthOrHeight: isDocument ? 1200 : 800, // 1200px width for docs, 800px for photos
    useWebWorker: true,
    fileType: 'image/webp'
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    
    // Create new WebP File object from the compressed blob
    const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const webpFile = new File(
      [compressedBlob], 
      `${fileName}.webp`, 
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );
    
    console.log(`[Compression] Original: ${(file.size / 1024).toFixed(1)}KB, Compressed: ${(webpFile.size / 1024).toFixed(1)}KB`);
    return webpFile;
  } catch (err) {
    console.error('Image compression failed:', err);
    throw err;
  }
}

export async function compressCategoryImage(file: File): Promise<File> {
  // If the file is already under 50KB, return it directly to avoid any quality loss
  if (file.size <= 49 * 1024) {
    console.log(`[Category Compression] File is already under 50KB (${(file.size / 1024).toFixed(1)}KB). Skipping compression.`);
    return file;
  }

  const options = {
    maxSizeMB: 0.048, // Target strictly under 50KB (48KB limit)
    maxWidthOrHeight: 1000, // High-res width/height for premium crispness (Urban Company standard)
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.90 // Start with high quality factor
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const webpFile = new File(
      [compressedBlob],
      `${fileName}.webp`,
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );
    console.log(`[Category Compression] Original: ${(file.size / 1024).toFixed(1)}KB, Compressed: ${(webpFile.size / 1024).toFixed(1)}KB`);
    return webpFile;
  } catch (err) {
    console.error('Category image compression failed:', err);
    throw err;
  }
}

/**
 * Universal WebP image converter.
 * Converts any image format (PNG, JPG, JPEG, GIF, BMP, SVG, AVIF, etc.) to a high-quality WebP file.
 * Preserves transparency and aspect ratio with max dimension bounds.
 */
export async function convertToWebP(
  file: File,
  quality = 0.90,
  maxWidthOrHeight = 1920
): Promise<File> {
  const baseName = (file.name.substring(0, file.name.lastIndexOf('.')) || file.name)
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  // Attempt Canvas conversion in browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      const converted = await new Promise<File>((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);

        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (width > maxWidthOrHeight || height > maxWidthOrHeight) {
              if (width > height) {
                height = Math.round((height * maxWidthOrHeight) / width);
                width = maxWidthOrHeight;
              } else {
                width = Math.round((width * maxWidthOrHeight) / height);
                height = maxWidthOrHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Canvas 2D context not available');
            }

            // Draw image on canvas (handles transparency gracefully)
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Canvas toBlob failed to produce a WebP blob'));
                  return;
                }
                const webpFile = new File([blob], `${baseName}.webp`, {
                  type: 'image/webp',
                  lastModified: Date.now()
                });
                console.log(
                  `[WebP Conversion] Converted "${file.name}" (${(file.size / 1024).toFixed(1)} KB) -> "${webpFile.name}" (${(webpFile.size / 1024).toFixed(1)} KB)`
                );
                resolve(webpFile);
              },
              'image/webp',
              quality
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = (e) => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Failed to render source image in browser: ' + String(e)));
        };

        img.src = objectUrl;
      });

      return converted;
    } catch (canvasErr) {
      console.warn('[WebP Conversion] Canvas method failed, falling back to browser-image-compression:', canvasErr);
    }
  }

  // Fallback to browser-image-compression
  const options = {
    maxSizeMB: 2,
    maxWidthOrHeight,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: quality
  };

  const compressedBlob = await imageCompression(file, options);
  return new File([compressedBlob], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: Date.now()
  });
}
