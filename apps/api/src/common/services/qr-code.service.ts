import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  async generateQRCode(data: string, format: 'png' | 'svg' = 'png'): Promise<string> {
    try {
      if (format === 'svg') {
        return await QRCode.toString(data, { type: 'svg' });
      } else {
        return await QRCode.toDataURL(data, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
      }
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  generateVisitQRCode(visitId: string, orgSlug: string): string {
    // Generate QR code data for visit check-in
    const baseUrl = process.env.FRONTEND_URL || 'https://app.visitormate.com';
    return `${baseUrl}/${orgSlug}/visit/${visitId}`;
  }
}