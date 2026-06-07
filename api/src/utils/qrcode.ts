import QRCode from 'qrcode';

export const generateQRCodeDataURL = async (url: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(url);
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};
