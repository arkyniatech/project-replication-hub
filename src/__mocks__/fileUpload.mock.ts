export const mockUploadFile = vi.fn().mockResolvedValue({
  path: 'mocked-file.pdf',
  error: null
});

export const mockGeneratePDF = vi.fn().mockResolvedValue({
  pdfBlob: 'mocked-pdf-data',
  error: null
});

beforeEach(() => {
  vi.resetAllMocks();
});