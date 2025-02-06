export function base64EncodeImage(imageBuffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(imageBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const base64ToExtension = (base64: string): string | null => {
  // Match the MIME type from the base64 string
  const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
  if (match) {
    return match[1]; // Return the file extension (e.g., png, jpeg, webp)
  }

  // Fallback: Infer from content-based detection
  const signatureToExtension: { [key: string]: string } = {
    '/9j/': 'jpg', // JPEG
    'iVBORw0KGgo': 'png', // PNG
    'R0lGOD': 'gif', // GIF
    'UklGR': 'webp', // WebP
    'AAABAAE': 'ico', // ICO
    'JVBER': 'pdf', // PDF (if applicable)
  };

  // Extract the first few characters of the base64 content
  const signature = base64.substring(0, 10);
  for (const [sig, ext] of Object.entries(signatureToExtension)) {
    if (signature.startsWith(sig)) {
      return ext;
    }
  }

  return null; // Unknown format
}