export function getObjectUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/objects/')) {
    return url;
  }
  if (url.includes('storage.googleapis.com')) {
    const match = url.match(/\/(?:\.private\/)?(uploads\/[^?]+)/);
    if (match) {
      return `/objects/${match[1]}`;
    }
  }
  return url;
}
