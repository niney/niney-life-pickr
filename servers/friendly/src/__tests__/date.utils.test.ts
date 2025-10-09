import { describe, it, expect } from 'vitest';
import { parseVisitDate, formatToNaverDate } from '../utils/date.utils';

describe('date.utils', () => {
  describe('parseVisitDate', () => {
    it('should parse date without year (current year)', () => {
      const currentYear = new Date().getFullYear();
      
      const result = parseVisitDate('8.16.토');
      expect(result).toBe(`${currentYear}-08-16`);
    });

    it('should parse date with 2-digit year', () => {
      const result = parseVisitDate('24.10.6.일');
      expect(result).toBe('2024-10-06');
    });

    it('should parse date with 2-digit year (23)', () => {
      const result = parseVisitDate('23.12.29.금');
      expect(result).toBe('2023-12-29');
    });

    it('should handle single digit month and day', () => {
      const result = parseVisitDate('24.1.5.월');
      expect(result).toBe('2024-01-05');
    });

    it('should handle double digit month and day', () => {
      const result = parseVisitDate('24.11.25.수');
      expect(result).toBe('2024-11-25');
    });

    it('should return null for null input', () => {
      const result = parseVisitDate(null);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseVisitDate('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = parseVisitDate('invalid date');
      expect(result).toBeNull();
    });

    it('should return null for invalid month', () => {
      const result = parseVisitDate('24.13.1.월');
      expect(result).toBeNull();
    });

    it('should return null for invalid day', () => {
      const result = parseVisitDate('24.12.32.화');
      expect(result).toBeNull();
    });

    it('should handle date without day-of-week suffix', () => {
      const result = parseVisitDate('24.10.6');
      expect(result).toBe('2024-10-06');
    });

    it('should handle all day-of-week suffixes', () => {
      const days = ['월', '화', '수', '목', '금', '토', '일'];
      
      days.forEach((day, index) => {
        const result = parseVisitDate(`24.10.${index + 1}.${day}`);
        expect(result).toBe(`2024-10-${String(index + 1).padStart(2, '0')}`);
      });
    });
  });

  describe('formatToNaverDate', () => {
    it('should format ISO date to Naver format', () => {
      const result = formatToNaverDate('2024-10-06');
      expect(result).toBe('24.10.6');
    });

    it('should format date with single digit month and day', () => {
      const result = formatToNaverDate('2024-01-05');
      expect(result).toBe('24.1.5');
    });

    it('should return null for null input', () => {
      const result = formatToNaverDate(null);
      expect(result).toBeNull();
    });

    it('should return null for invalid date', () => {
      const result = formatToNaverDate('invalid');
      expect(result).toBeNull();
    });

    it('should handle year 2023', () => {
      const result = formatToNaverDate('2023-12-29');
      expect(result).toBe('23.12.29');
    });
  });

  describe('roundtrip conversion', () => {
    it('should maintain date integrity through parsing and formatting', () => {
      const original = '24.10.6.일';
      const parsed = parseVisitDate(original);
      expect(parsed).toBe('2024-10-06');
      
      const formatted = formatToNaverDate(parsed!);
      expect(formatted).toBe('24.10.6');
    });
  });
});
