import { languageRegexMap } from '@/lib/languages';
import { franc } from 'franc';

export function isValidLanguage(text: string, expectedLanguage?: string): boolean {
  const detectedLanguage = franc(text); // Detect language
  if (expectedLanguage) {
    return detectedLanguage === expectedLanguage; // Ensure it matches expected language
  }
  return detectedLanguage !== 'und'; // 'und' means undefined
}

export function isMostlyValidCharacters(text: string, language: string = 'all'): boolean {
  // Use the regex from `cleanOCRResult` based on the language
  // const languageRegexMap: Record<string, RegExp> = {
  //   en: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/,
  //   fra: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:; ]+$/,
  //   rus: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:; ]+$/u,
  //   jpn: /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}0-9.,!?'"()\-:; ]+$/u,
  //   all: /^[\p{L}\p{N}.,!?'"()\-:; ]+$/u, // Default: any Unicode letter or number
  // };

  const allowedRegex = languageRegexMap[language] || languageRegexMap['all'];

  const validChars = text.split('').filter(char => allowedRegex.test(char)).length;
  return validChars / text.length > 0.8; // At least 80% valid characters
}

export function isValidTextLength(text: string, minLength = 5, maxLength = 5000): boolean {
  return text.length >= minLength && text.length <= maxLength;
}

export async function checkOCRText(text: string, expectedLanguage?: string): Promise<string | null> {
  // Clean the text first
  // const cleanedText = cleanOCRResult(text, expectedLanguage || 'all');

  if (!isValidTextLength(text)) {
    console.warn('Text length is invalid.');
    return null;
  }

  if (!isMostlyValidCharacters(text, expectedLanguage || 'all')) {
    console.warn('Text contains too many invalid characters.');
    return null;
  }

  // maybe remove this
  if (!isValidLanguage(text, expectedLanguage)) {
    console.warn('Language detection failed.');
    return null;
  }

  return text; // Process further if valid
}