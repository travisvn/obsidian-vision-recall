import { franc } from 'franc';

export function isValidLanguage(text: string): boolean {
  const detectedLanguage = franc(text); // Detect language
  return detectedLanguage !== 'und'; // 'und' means undefined
}

export function isMostlyValidCharacters(text: string): boolean {
  const validCharRegex = /^[\w\s.,!?'"-–—()]+$/u; // Adjust regex for more languages if needed
  const validChars = text.split('').filter(char => validCharRegex.test(char)).length;
  return validChars / text.length > 0.8; // At least 80% valid characters
}

export function isValidTextLength(text: string): boolean {
  return text.length > 5 && text.length < 5000; // Arbitrary thresholds
}

export async function checkOCRText(text: string): Promise<string | null> {

  // Combine validation checks
  if (!isValidTextLength(text)) {
    console.warn('Text length is invalid.');
    return null;
  }

  if (!isMostlyValidCharacters(text)) {
    console.warn('Text contains too many invalid characters.');
    return null;
  }

  if (!isValidLanguage(text)) {
    console.warn('Language detection failed.');
    return null;
  }

  return text; // Process further if valid
}
