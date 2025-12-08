const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export interface CompressResult {
  blob: Blob;
  wasCompressed: boolean;
  originalSize: number;
  compressedSize: number;
  exceedsLimit: boolean;
}

export async function compressImage(file: File): Promise<CompressResult> {
  const originalSize = file.size;
  
  if (!file.type.startsWith('image/')) {
    return {
      blob: file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
      exceedsLimit: originalSize > MAX_FILE_SIZE,
    };
  }

  if (file.size <= MAX_FILE_SIZE) {
    return {
      blob: file,
      wasCompressed: false,
      originalSize,
      compressedSize: originalSize,
      exceedsLimit: false,
    };
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    img.onload = async () => {
      let width = img.width;
      let height = img.height;
      
      const maxDimension = 3000;
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.9;
      let compressedBlob: Blob | null = null;
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      
      while (quality > 0.1) {
        compressedBlob = await new Promise<Blob | null>((res) => {
          canvas.toBlob(res, outputType, quality);
        });
        
        if (compressedBlob && compressedBlob.size <= MAX_FILE_SIZE) {
          break;
        }
        
        quality -= 0.1;
      }
      
      if (!compressedBlob) {
        resolve({
          blob: file,
          wasCompressed: false,
          originalSize,
          compressedSize: originalSize,
          exceedsLimit: true,
        });
        return;
      }
      
      if (compressedBlob.size > MAX_FILE_SIZE) {
        const ratio = Math.sqrt(MAX_FILE_SIZE / compressedBlob.size) * 0.9;
        const newWidth = Math.round(width * ratio);
        const newHeight = Math.round(height * ratio);
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        compressedBlob = await new Promise<Blob | null>((res) => {
          canvas.toBlob(res, outputType, 0.8);
        });
      }
      
      if (compressedBlob && compressedBlob.size <= MAX_FILE_SIZE) {
        resolve({
          blob: compressedBlob,
          wasCompressed: true,
          originalSize,
          compressedSize: compressedBlob.size,
          exceedsLimit: false,
        });
      } else {
        resolve({
          blob: compressedBlob || file,
          wasCompressed: !!compressedBlob,
          originalSize,
          compressedSize: compressedBlob ? compressedBlob.size : originalSize,
          exceedsLimit: true,
        });
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
