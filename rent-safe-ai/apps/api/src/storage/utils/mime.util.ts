export class MimeUtil {
  static readonly ALLOWED_DOCUMENT_MIMES = ['application/pdf'];
  static readonly ALLOWED_MEDIA_MIMES = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  static readonly MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5MB
  static readonly MAX_MEDIA_SIZE = 10 * 1024 * 1024; // 10MB

  static validateDocument(mimeType: string, extension: string, size: number) {
    if (!this.ALLOWED_DOCUMENT_MIMES.includes(mimeType)) {
      return false;
    }
    if (extension !== 'pdf') {
      return false;
    }
    if (size > this.MAX_DOCUMENT_SIZE) {
      return false;
    }
    return true;
  }

  static validateMedia(mimeType: string, extension: string, size: number) {
    if (!this.ALLOWED_MEDIA_MIMES.includes(mimeType)) {
      return false;
    }
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension)) {
      return false;
    }
    if (size > this.MAX_MEDIA_SIZE) {
      return false;
    }
    return true;
  }
}
