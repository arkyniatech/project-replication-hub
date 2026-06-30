import { describe, it, expect } from 'vitest';
import { formatDateBR, parseDateLocal, toISODateLocal } from '../date-utils';

describe('date-utils', () => {
  describe('formatDateBR', () => {
    it('formats YYYY-MM-DD without timezone shift', () => {
      // The classic bug: '2026-07-06' rendered as 05/07/2026 in UTC-3.
      expect(formatDateBR('2026-07-06')).toBe('06/07/2026');
    });

    it('formats ISO datetime keeping the original calendar day', () => {
      expect(formatDateBR('2026-07-06T00:00:00Z')).toBe('06/07/2026');
      expect(formatDateBR('2026-07-06T03:00:00.000Z')).toBe('06/07/2026');
    });

    it('formats DD/MM/YYYY input idempotently', () => {
      expect(formatDateBR('06/07/2026')).toBe('06/07/2026');
    });

    it('formats a Date instance using its local components', () => {
      expect(formatDateBR(new Date(2026, 6, 6))).toBe('06/07/2026');
    });

    it('returns fallback for invalid input', () => {
      expect(formatDateBR('', 'N/D')).toBe('N/D');
      expect(formatDateBR(null, '-')).toBe('-');
      expect(formatDateBR('not-a-date', '-')).toBe('-');
    });

    it('handles all 12 month boundaries without rollback', () => {
      for (let m = 1; m <= 12; m++) {
        const mm = String(m).padStart(2, '0');
        expect(formatDateBR(`2026-${mm}-01`)).toBe(`01/${mm}/2026`);
      }
    });

    it('handles end-of-month/year correctly', () => {
      expect(formatDateBR('2026-12-31')).toBe('31/12/2026');
      expect(formatDateBR('2026-01-01')).toBe('01/01/2026');
    });
  });

  describe('parseDateLocal', () => {
    it('parses YYYY-MM-DD as local midnight (not UTC)', () => {
      const d = parseDateLocal('2026-07-06')!;
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(6);
      expect(d.getDate()).toBe(6);
    });

    it('returns null for invalid input', () => {
      expect(parseDateLocal('')).toBeNull();
      expect(parseDateLocal('garbage')).toBeNull();
    });
  });

  describe('toISODateLocal', () => {
    it('round-trips YYYY-MM-DD', () => {
      expect(toISODateLocal('2026-07-06')).toBe('2026-07-06');
    });

    it('keeps the local calendar day for a Date', () => {
      expect(toISODateLocal(new Date(2026, 6, 6))).toBe('2026-07-06');
    });
  });
});
