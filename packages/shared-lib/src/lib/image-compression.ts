import imageCompression from 'browser-image-compression';

export async function compressKycImage(file: File, documentType: string): Promise<File> {
  const isAttachment = documentType === 'ATTACHMENT';
  const isDocument = ['AADHAAR_FRONT', 'AADHAAR_BACK', 'PAN_CARD'].includes(documentType);
  
  // Attachments strictly <= 50KB (0.048MB target)
  const maxSizeMB = isAttachment ? 0.048 : (isDocument ? 0.096 : 0.096);
  
  const options = {
    maxSizeMB,
    maxWidthOrHeight: isAttachment ? 900 : (isDocument ? 1200 : 800),
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.85
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    
    // Create new WebP File object from the compressed blob
    const fileName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const webpFile = new File(
      [compressedBlob], 
      `${cleanName}.webp`, 
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );
    
    console.log(`[Compression] ${documentType}: ${(file.size / 1024).toFixed(1)}KB -> ${(webpFile.size / 1024).toFixed(1)}KB WebP (Limit: ${isAttachment ? '50KB' : '100KB'})`);
    return webpFile;
  } catch (err) {
    console.error('Image compression failed:', err);
    throw err;
  }
}

export async function compressCategoryIcon(file: File): Promise<File> {
  return compressServiceImage(file, 45); // Under 45KB for thumbnails
}

export async function compressCategoryImage(file: File): Promise<File> {
  return compressBannerImage(file);
}

/**
 * High-definition banner compression for Hero Banners & Panoramic Strips.
 * Preserves pin-sharp typography, facial features, and gradient details across high-DPI / Retina displays.
 */
export async function compressBannerImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 0.6, // Up to 600KB for high-fidelity 2K graphics
    maxWidthOrHeight: 2560,
    useWebWorker: true,
    fileType: 'image/webp' as const,
    initialQuality: 0.94
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const webpFile = new File(
      [compressedBlob],
      `${cleanName}.webp`,
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );

    console.log(`[Banner Compression] ${file.name} (${(file.size / 1024).toFixed(1)}KB) -> ${webpFile.name} (${(webpFile.size / 1024).toFixed(1)}KB High-Res WebP)`);
    return webpFile;
  } catch (err) {
    console.error('Banner image compression failed:', err);
    return file;
  }
}

/**
 * Compresses any image (PNG, JPEG, etc.) into a crisp WebP format strictly under the specified KB limit (Default 50KB for booking attachments or specified maxKb).
 */
export async function compressServiceImage(file: File, maxKb: number = 50): Promise<File> {
  // If the file is already a WebP and under maxKb, return directly
  if (file.type === 'image/webp' && file.size <= maxKb * 1024) {
    console.log(`[Image Compression] WebP is already under ${maxKb}KB (${(file.size / 1024).toFixed(1)}KB).`);
    return file;
  }

  const targetMB = Math.max(0.02, (maxKb - 2) / 1024); // e.g. 48KB for 50KB limit

  const options = {
    maxSizeMB: targetMB,
    maxWidthOrHeight: 1000,
    useWebWorker: true,
    fileType: 'image/webp',
    initialQuality: 0.85
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const originalName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanName = originalName.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    const webpFile = new File(
      [compressedBlob],
      `${cleanName}.webp`,
      {
        type: 'image/webp',
        lastModified: Date.now()
      }
    );

    console.log(`[Image Compression] ${file.name} (${(file.size / 1024).toFixed(1)}KB) -> ${webpFile.name} (${(webpFile.size / 1024).toFixed(1)}KB WebP, Max: ${maxKb}KB)`);
    return webpFile;
  } catch (err) {
    console.error('Image compression to WebP failed:', err);
    throw err;
  }
}
