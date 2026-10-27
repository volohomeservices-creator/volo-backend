/**
 * Formats strings into professional Title Case:
 * - First letter of each word capitalized, following letters lowercase.
 * - Disallows ALL-CAPS (e.g. "KITCHEN CLEANING" -> "Kitchen Cleaning")
 * - Disallows all-lowercase (e.g. "house cleaning" -> "House Cleaning")
 * - Preserves standard industry acronyms (e.g. "AC", "TV", "RO", "UV", "LED", "LCD", "BHK", "KYC", etc.)
 * - Handles hyphens and slashes (e.g. "Semi-Automatic", "Repair/Replacement")
 */

const ACRONYMS = new Set([
  'AC',
  'TV',
  'RO',
  'UV',
  'LED',
  'LCD',
  'BHK',
  'CCTV',
  'PVC',
  'MCB',
  'KYC',
  'SFT',
  'ID',
  'VIP',
  'SOS',
  'GPS',
  'FAQ'
]);

function formatSingleWord(word: string): string {
  if (!word) return '';
  const upper = word.toUpperCase();
  if (ACRONYMS.has(upper)) {
    return upper;
  }
  // Check if starts with a letter
  if (!/^[a-zA-Z]/.test(word)) {
    return word;
  }
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function toTitleCase(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => {
      if (!word) return '';
      if (word.includes('-')) {
        return word
          .split('-')
          .map(formatSingleWord)
          .join('-');
      }
      if (word.includes('/')) {
        return word
          .split('/')
          .map(formatSingleWord)
          .join('/');
      }
      return formatSingleWord(word);
    })
    .join(' ');
}
