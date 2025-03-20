import { VisionRecallPluginSettings } from '@/types/settings-types'

export type Language = {
  code: string
  name: string
  nativeName: string
}

export const languages: Record<string, Language> = {
  AFR: { code: 'afr', name: 'Afrikaans', nativeName: 'Afrikaans' },
  AMH: { code: 'amh', name: 'Amharic', nativeName: 'አማርኛ' },
  ARA: { code: 'ara', name: 'Arabic', nativeName: 'العربية' },
  ASM: { code: 'asm', name: 'Assamese', nativeName: 'অসমীয়া' },
  AZE: { code: 'aze', name: 'Azerbaijani', nativeName: 'Azərbaycanca' },
  AZE_CYRL: { code: 'aze_cyrl', name: 'Azerbaijani - Cyrillic', nativeName: 'Азәрбајҹан' },
  BEL: { code: 'bel', name: 'Belarusian', nativeName: 'Беларуская' },
  BEN: { code: 'ben', name: 'Bengali', nativeName: 'বাংলা' },
  BOD: { code: 'bod', name: 'Tibetan', nativeName: 'བོད་སྐད་' },
  BOS: { code: 'bos', name: 'Bosnian', nativeName: 'Bosanski' },
  BUL: { code: 'bul', name: 'Bulgarian', nativeName: 'Български' },
  CAT: { code: 'cat', name: 'Catalan', nativeName: 'Català' },
  CEB: { code: 'ceb', name: 'Cebuano', nativeName: 'Cebuano' },
  CES: { code: 'ces', name: 'Czech', nativeName: 'Čeština' },
  CHI_SIM: { code: 'chi_sim', name: 'Chinese - Simplified', nativeName: '简体中文' },
  CHI_TRA: { code: 'chi_tra', name: 'Chinese - Traditional', nativeName: '繁體中文' },
  CHR: { code: 'chr', name: 'Cherokee', nativeName: 'ᏣᎳᎩ' },
  CYM: { code: 'cym', name: 'Welsh', nativeName: 'Cymraeg' },
  DAN: { code: 'dan', name: 'Danish', nativeName: 'Dansk' },
  DEU: { code: 'deu', name: 'German', nativeName: 'Deutsch' },
  ELL: { code: 'ell', name: 'Greek', nativeName: 'Ελληνικά' },
  ENG: { code: 'eng', name: 'English', nativeName: 'English' },
  EPO: { code: 'epo', name: 'Esperanto', nativeName: 'Esperanto' },
  EST: { code: 'est', name: 'Estonian', nativeName: 'Eesti' },
  FAS: { code: 'fas', name: 'Persian', nativeName: 'فارسی' },
  FIN: { code: 'fin', name: 'Finnish', nativeName: 'Suomi' },
  FRA: { code: 'fra', name: 'French', nativeName: 'Français' },
  GLG: { code: 'glg', name: 'Galician', nativeName: 'Galego' },
  HEB: { code: 'heb', name: 'Hebrew', nativeName: 'עברית' },
  HIN: { code: 'hin', name: 'Hindi', nativeName: 'हिन्दी' },
  HRV: { code: 'hrv', name: 'Croatian', nativeName: 'Hrvatski' },
  HUN: { code: 'hun', name: 'Hungarian', nativeName: 'Magyar' },
  IND: { code: 'ind', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  ISL: { code: 'isl', name: 'Icelandic', nativeName: 'Íslenska' },
  ITA: { code: 'ita', name: 'Italian', nativeName: 'Italiano' },
  JPN: { code: 'jpn', name: 'Japanese', nativeName: '日本語' },
  KOR: { code: 'kor', name: 'Korean', nativeName: '한국어' },
  LAV: { code: 'lav', name: 'Latvian', nativeName: 'Latviešu' },
  LIT: { code: 'lit', name: 'Lithuanian', nativeName: 'Lietuvių' },
  MAL: { code: 'mal', name: 'Malayalam', nativeName: 'മലയാളം' },
  MAR: { code: 'mar', name: 'Marathi', nativeName: 'मराठी' },
  MKD: { code: 'mkd', name: 'Macedonian', nativeName: 'Македонски' },
  MSA: { code: 'msa', name: 'Malay', nativeName: 'Bahasa Melayu' },
  MYA: { code: 'mya', name: 'Burmese', nativeName: 'မြန်မာစာ' },
  NLD: { code: 'nld', name: 'Dutch', nativeName: 'Nederlands' },
  NOR: { code: 'nor', name: 'Norwegian', nativeName: 'Norsk' },
  POL: { code: 'pol', name: 'Polish', nativeName: 'Polski' },
  POR: { code: 'por', name: 'Portuguese', nativeName: 'Português' },
  RON: { code: 'ron', name: 'Romanian', nativeName: 'Română' },
  RUS: { code: 'rus', name: 'Russian', nativeName: 'Русский' },
  SLK: { code: 'slk', name: 'Slovak', nativeName: 'Slovenčina' },
  SLV: { code: 'slv', name: 'Slovenian', nativeName: 'Slovenščina' },
  SPA: { code: 'spa', name: 'Spanish', nativeName: 'Español' },
  SWE: { code: 'swe', name: 'Swedish', nativeName: 'Svenska' },
  TUR: { code: 'tur', name: 'Turkish', nativeName: 'Türkçe' },
  UKR: { code: 'ukr', name: 'Ukrainian', nativeName: 'Українська' },
  URD: { code: 'urd', name: 'Urdu', nativeName: 'اردو' },
  VIE: { code: 'vie', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  YID: { code: 'yid', name: 'Yiddish', nativeName: 'ייִדיש' }
}

export type SelectOption = {
  value: string
  label: string
}

/**
 * Transforms languages into a format suitable for a select component.
 * Format: { value: "eng", label: "English (English)" }
 */
export const getLanguagesForSelect = (): SelectOption[] => {
  return getLanguagesArray().map((lang: Language) => ({
    value: lang.code,
    label: `${lang.name} (${lang.nativeName})`,
  }))
}

export const getLanguagesForObsidianSettingsDropdown = (): Record<string, string> => {
  return getLanguagesArray().reduce((acc, lang) => {
    acc[lang.code] = `${lang.name} (${lang.nativeName})`;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Returns an array of languages for selection.
 */
export const getLanguagesArray = (): Language[] => {
  return Object.values(languages)
}

/**
 * Retrieves a language object by its Tesseract.js code.
 */
export const getLanguageByCode = (code: string): Language | undefined => {
  return Object.values(languages).find(lang => lang.code === code)
}


export const getLanguagePromptModifierIfIndicated = (config: VisionRecallPluginSettings, extended: boolean = false): string => {
  if (config.addLanguageConvertToPrompt && config.tesseractLanguage && config.tesseractLanguage !== 'eng') {
    const language = getLanguageByCode(config.tesseractLanguage as string)
    if (language) {
      let extendedModifier = '';
      if (extended) {
        extendedModifier = ` (${language.nativeName})`;
      }
      // Maybe "language.name (language.nativeName)"
      return `\n\nGenerate the response in the following language: ${language.name}${extendedModifier}\n\n`
    }
  }
  return ''
}

export const languageRegexMap_ScriptRegex: Record<string, RegExp> = {
  afr: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:; ]+$/,
  amh: /^[\p{Script=Ethiopic}0-9.,!?'"()\-:; ]+$/u,
  ara: /^[\p{Script=Arabic}0-9.,!?'"()\-:;،؛ ]+$/u,
  asm: /^[\p{Script=Bengali}0-9.,!?'"()\-:; ]+$/u,
  aze: /^[a-zA-ZƏəĞğİıÖöŞşÜüÇç0-9.,!?'"()\-:; ]+$/,
  aze_cyrl: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:; ]+$/u,
  bel: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:;«» ]+$/u,
  ben: /^[\p{Script=Bengali}0-9.,!?'"()\-:; ]+$/u,
  bod: /^[\p{Script=Tibetan}0-9.,!?'"()\-:; ]+$/u,
  bos: /^[a-zA-ZČčĆćĐđŠšŽž0-9.,!?'"()\-:; ]+$/,
  bul: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:;«» ]+$/u,
  cat: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/,
  ceb: /^[a-zA-ZÑñ0-9.,!?'"()\-:; ]+$/,
  ces: /^[a-zA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž0-9.,!?'"()\-:; ]+$/,
  chi_sim: /^[\p{Script=Han}0-9.,!?'"()\-:;、。《》]+$/u,
  chi_tra: /^[\p{Script=Han}0-9.,!?'"()\-:;、。《》]+$/u,
  chr: /^[\p{Script=Cherokee}0-9.,!?'"()\-:; ]+$/u,
  cym: /^[a-zA-Zŵŷáéíóúàèìòùâêîôû0-9.,!?'"()\-:; ]+$/,
  dan: /^[a-zA-ZÆØÅæøå0-9.,!?'"()\-:; ]+$/,
  deu: /^[a-zA-ZÄÖÜäöüß0-9.,!?'"()\-:;„“– ]+$/,
  ell: /^[\p{Script=Greek}0-9.,!?'"()\-:;«» ]+$/u,
  eng: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/,
  epo: /^[a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9.,!?'"()\-:; ]+$/,
  est: /^[a-zA-ZÄÖÜäöüÕõŠšŽž0-9.,!?'"()\-:; ]+$/,
  fas: /^[\p{Script=Arabic}0-9.,!?'"()\-:;،؛ ]+$/u,
  fin: /^[a-zA-ZÄÖäöÅå0-9.,!?'"()\-:; ]+$/,
  fra: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/,
  glg: /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ0-9.,!?'"()\-:; ]+$/,
  heb: /^[\p{Script=Hebrew}0-9.,!?'"()\-:;״ ]+$/u,
  hin: /^[\p{Script=Devanagari}0-9.,!?'"()\-:; ]+$/u,
  hrv: /^[a-zA-ZČčĆćĐđŠšŽž0-9.,!?'"()\-:; ]+$/,
  hun: /^[a-zA-ZÁÉÍÓÖŐÚÜŰáéíóöőúüű0-9.,!?'"()\-:; ]+$/,
  ind: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/,
  isl: /^[a-zA-ZÁÉÍÓÚÝÞÆÐÖáéíóúýþæðö0-9.,!?'"()\-:; ]+$/,
  ita: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/,
  jpn: /^[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}0-9.,!?'"()\-:;「」『』]+$/u,
  kor: /^[\p{Script=Hangul}0-9.,!?'"()\-:; ]+$/u,
  lav: /^[a-zA-ZĀČĒĢĪĶĻŅŌŖŠŪŽāčēģīķļņōŗšūž0-9.,!?'"()\-:; ]+$/,
  lit: /^[a-zA-ZĄČĘĖĮŠŲŪŽąčęėįšųūž0-9.,!?'"()\-:; ]+$/,
  mal: /^[\p{Script=Malayalam}0-9.,!?'"()\-:; ]+$/u,
  mar: /^[\p{Script=Devanagari}0-9.,!?'"()\-:; ]+$/u,
  mkd: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:;«» ]+$/u,
  msa: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/,
  mya: /^[\p{Script=Myanmar}0-9.,!?'"()\-:; ]+$/u,
  nld: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:; ]+$/,
  nor: /^[a-zA-ZÆØÅæøå0-9.,!?'"()\-:; ]+$/,
  pol: /^[a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9.,!?'"()\-:; ]+$/,
  por: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/,
  ron: /^[a-zA-ZĂÂÎȘȚăâîșț0-9.,!?'"()\-:; ]+$/,
  rus: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:;«» ]+$/u,
  slk: /^[a-zA-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž0-9.,!?'"()\-:; ]+$/,
  slv: /^[a-zA-ZČŠŽčšž0-9.,!?'"()\-:; ]+$/,
  spa: /^[a-zA-ZÁÉÍÓÚÑÜáéíóúñü0-9.,!?'"()\-:;«»¡¿ ]+$/,
  swe: /^[a-zA-ZÅÄÖåäö0-9.,!?'"()\-:; ]+$/,
  tur: /^[a-zA-ZÇĞİÖŞÜçğıöşü0-9.,!?'"()\-:; ]+$/,
  ukr: /^[\p{Script=Cyrillic}0-9.,!?'"()\-:;«» ]+$/u,
  urd: /^[\p{Script=Arabic}0-9.,!?'"()\-:;،؛ ]+$/u,
  vie: /^[a-zA-ZÀ-ỹ0-9.,!?'"()\-:; ]+$/,
  yid: /^[\p{Script=Hebrew}0-9.,!?'"()\-:;״ ]+$/u,
  all: /^[\p{L}\p{N}.,!?'"()\-:;«»„“‘’「」『』¡¿،؛《》 ]+$/u,
};

export const languageRegexMap: Record<string, RegExp> = {
  afr: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:; ]+$/, // Afrikaans
  amh: /^[\u1200-\u137F0-9.,!?'"()\-:; ]+$/, // Amharic (Ethiopic)
  ara: /^[\u0600-\u06FF0-9.,!?'"()\-:;،؛ ]+$/, // Arabic
  asm: /^[\u0980-\u09FF0-9.,!?'"()\-:; ]+$/, // Assamese (Bengali script)
  aze: /^[a-zA-ZƏəĞğİıÖöŞşÜüÇç0-9.,!?'"()\-:; ]+$/, // Azerbaijani (Latin)
  aze_cyrl: /^[\u0400-\u04FF0-9.,!?'"()\-:; ]+$/, // Azerbaijani (Cyrillic)
  bel: /^[\u0400-\u04FF0-9.,!?'"()\-:;«» ]+$/, // Belarusian (Cyrillic)
  ben: /^[\u0980-\u09FF0-9.,!?'"()\-:; ]+$/, // Bengali
  bod: /^[\u0F00-\u0FFF0-9.,!?'"()\-:; ]+$/, // Tibetan
  bos: /^[a-zA-ZČčĆćĐđŠšŽž0-9.,!?'"()\-:; ]+$/, // Bosnian
  bul: /^[\u0400-\u04FF0-9.,!?'"()\-:;«» ]+$/, // Bulgarian (Cyrillic)
  cat: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/, // Catalan
  ceb: /^[a-zA-ZÑñ0-9.,!?'"()\-:; ]+$/, // Cebuano
  ces: /^[a-zA-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽáčďéěíňóřšťúůýž0-9.,!?'"()\-:; ]+$/, // Czech
  chi_sim: /^[\u4E00-\u9FFF0-9.,!?'"()\-:;、。《》]+$/, // Chinese - Simplified
  chi_tra: /^[\u4E00-\u9FFF0-9.,!?'"()\-:;、。《》]+$/, // Chinese - Traditional
  chr: /^[\u13A0-\u13FF0-9.,!?'"()\-:; ]+$/, // Cherokee
  cym: /^[a-zA-Zŵŷáéíóúàèìòùâêîôû0-9.,!?'"()\-:; ]+$/, // Welsh
  dan: /^[a-zA-ZÆØÅæøå0-9.,!?'"()\-:; ]+$/, // Danish
  deu: /^[a-zA-ZÄÖÜäöüß0-9.,!?'"()\-:;„“– ]+$/, // German
  ell: /^[\u0370-\u03FF0-9.,!?'"()\-:;«» ]+$/, // Greek
  eng: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/, // English
  epo: /^[a-zA-ZĈĉĜĝĤĥĴĵŜŝŬŭ0-9.,!?'"()\-:; ]+$/, // Esperanto
  est: /^[a-zA-ZÄÖÜäöüÕõŠšŽž0-9.,!?'"()\-:; ]+$/, // Estonian
  fas: /^[\u0600-\u06FF0-9.,!?'"()\-:;،؛ ]+$/, // Persian (Arabic script)
  fin: /^[a-zA-ZÄÖäöÅå0-9.,!?'"()\-:; ]+$/, // Finnish
  fra: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/, // French
  glg: /^[a-zA-ZÁÉÍÓÚÜÑáéíóúüñ0-9.,!?'"()\-:; ]+$/, // Galician
  heb: /^[\u0590-\u05FF0-9.,!?'"()\-:;״ ]+$/, // Hebrew
  hin: /^[\u0900-\u097F0-9.,!?'"()\-:; ]+$/, // Hindi (Devanagari)
  hrv: /^[a-zA-ZČčĆćĐđŠšŽž0-9.,!?'"()\-:; ]+$/, // Croatian
  hun: /^[a-zA-ZÁÉÍÓÖŐÚÜŰáéíóöőúüű0-9.,!?'"()\-:; ]+$/, // Hungarian
  isl: /^[a-zA-ZÁÉÍÓÚÝÞÆÐÖáéíóúýþæðö0-9.,!?'"()\-:; ]+$/, // Icelandic
  ita: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/, // Italian
  jpn: /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF01-\uFF5E0-9.,!?'"()\-:;「」『』]+$/, // Japanese
  kor: /^[\uAC00-\uD7AF0-9.,!?'"()\-:; ]+$/, // Korean (Hangul)
  msa: /^[a-zA-Z0-9.,!?'"()\-:; ]+$/, // Malay
  mya: /^[\u1000-\u109F0-9.,!?'"()\-:; ]+$/, // Burmese (Myanmar script)
  pol: /^[a-zA-ZĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9.,!?'"()\-:; ]+$/, // Polish
  por: /^[a-zA-ZÀ-ÿ0-9.,!?'"()\-:;«» ]+$/, // Portuguese
  ron: /^[a-zA-ZĂÂÎȘȚăâîșț0-9.,!?'"()\-:; ]+$/, // Romanian
  rus: /^[\u0400-\u04FF0-9.,!?'"()\-:;«» ]+$/, // Russian
  slk: /^[a-zA-ZÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽáäčďéíĺľňóôŕšťúýž0-9.,!?'"()\-:; ]+$/, // Slovak
  slv: /^[a-zA-ZČŠŽčšž0-9.,!?'"()\-:; ]+$/, // Slovenian
  spa: /^[a-zA-ZÁÉÍÓÚÑÜáéíóúñü0-9.,!?'"()\-:;«»¡¿ ]+$/, // Spanish
  swe: /^[a-zA-ZÅÄÖåäö0-9.,!?'"()\-:; ]+$/, // Swedish
  tur: /^[a-zA-ZÇĞİÖŞÜçğıöşü0-9.,!?'"()\-:; ]+$/, // Turkish
  ukr: /^[\u0400-\u04FF0-9.,!?'"()\-:;«» ]+$/, // Ukrainian
  urd: /^[\u0600-\u06FF0-9.,!?'"()\-:;،؛ ]+$/, // Urdu
  vie: /^[a-zA-ZÀ-ỹ0-9.,!?'"()\-:; ]+$/, // Vietnamese
  yid: /^[\u0590-\u05FF0-9.,!?'"()\-:;״ ]+$/, // Yiddish (Hebrew script)
  all: /^[\p{L}\p{N}.,!?'"()\-:;«»„“‘’「」『』¡¿،؛《》 ]+$/u, // Default: all scripts
};

export function cleanOCRResultLanguageSpecificOld(ocrText: string, language: string = 'all'): string {
  const allowedRegex = languageRegexMap[language] || languageRegexMap['all'];
  return ocrText.split('\n').filter(line => !!line.trim() && allowedRegex.test(line.trim())).join('\n');
}

// Checks characters individually to see if they're within our RegEx for the language
export function cleanOCRResultLanguageSpecific(text: string, language: string = 'all'): string {
  // Get the regex for the specified language or use the default 'all' regex
  const allowedRegex = languageRegexMap_ScriptRegex[language] || languageRegexMap_ScriptRegex['all'];

  // Filter out characters that do not match the regex
  const filteredText = [...text].filter(char => char === '\n' || allowedRegex.test(char)).join('');

  return filteredText;
}

export function getLanguageSetting(settings: VisionRecallPluginSettings): string | null {
  if (settings.addLanguageConvertToPrompt && settings.tesseractLanguage) {
    return settings.tesseractLanguage;
  }
  return null;
}
