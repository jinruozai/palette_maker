// @ts-ignore
import csvRaw from './locales.csv?raw';

export type Language = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko' | 'ru' | 'pt';

export const SUPPORTED_LANGUAGES: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
];

const parseCSV = (csv: string): Record<Language, Record<string, string>> => {
  const lines = csv.split(/\r?\n/);
  
  // Parse headers to find column indices
  const headerLine = lines[0].trim();
  const headers = headerLine.split(',').map(h => h.trim());
  
  const langIndices: Partial<Record<Language, number>> = {};
  SUPPORTED_LANGUAGES.forEach(lang => {
    const index = headers.indexOf(lang.code);
    if (index !== -1) {
      langIndices[lang.code] = index;
    }
  });

  // Initialize translations object
  const translations: Record<string, Record<string, string>> = {};
  SUPPORTED_LANGUAGES.forEach(lang => {
    translations[lang.code] = {};
  });

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted strings
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === ',' && !inQuote) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length < 2) continue; // At least key and one value

    const key = parts[0]?.replace(/^\uFEFF/, ''); // Remove BOM
    if (!key) continue;

    // Fill translations for each language
    SUPPORTED_LANGUAGES.forEach(lang => {
      const index = langIndices[lang.code];
      if (index !== undefined && index < parts.length) {
        const val = parts[index];
        // Fallback to English if empty, then to key
        translations[lang.code][key] = val || translations['en'][key] || key;
      }
    });
  }

  console.log('Parsed Translations Count:', Object.keys(translations.en).length);
  return translations as Record<Language, Record<string, string>>;
};

export const translations = parseCSV(csvRaw);
