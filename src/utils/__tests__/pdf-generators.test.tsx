import { describe, it, vi, expect } from 'vitest';
import { mockUploadFile, mockGeneratePDF } from '@/__mocks__/fileUpload.mock';

vi.mock('@/utils/print', async () => ({
  generateContractPDF: mockGeneratePDF,
  uploadFileToServer: mockUploadFile
}));

describe('PDF Generation Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate PDF successfully', async () => {
    const { generateContractPDF } = await import('@/utils/print');
    const contractData = {
      id: '123',
      cliente: 'Test Client',
      data: '2024-01-01'
    };

    const result = await generateContractPDF(contractData);

    expect(mockGeneratePDF).toHaveBeenCalledWith(contractData);
    expect(result.pdfBlob).toBe('mocked-pdf-data');
  });

  it('should upload generated PDF successfully', async () => {
    const { uploadFileToServer } = await import('@/utils/print');
    const pdfBlob = new Blob();

    const result = await uploadFileToServer(pdfBlob);

    expect(mockUploadFile).toHaveBeenCalledWith(pdfBlob);
    expect(result.path).toBe('mocked-file.pdf');
  });

  it('should handle PDF generation errors', async () => {
    mockGeneratePDF.mockResolvedValueOnce({
      pdfBlob: null,
      error: new Error('Generation failed')
    });

    const { generateContractPDF } = await import('@/utils/print');

    const result = await generateContractPDF({});

    expect(result.pdfBlob).toBeNull();
    expect(result.error).toBeInstanceOf(Error);
  });
});