import { getConfig, type AppConfig } from "@shared/config";

export interface TranslationProvider {
  translate(text: string, targetLang: string, sourceLang?: string): Promise<{ text: string; detectedSourceLang?: string }>;
  isAvailable(): boolean;
}

class DeepLProvider implements TranslationProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<{ text: string; detectedSourceLang?: string }> {
    const { Translator } = await import("deepl-node");
    const translator = new Translator(this.apiKey);
    
    const langMap: Record<string, string> = {
      "en": "EN-US",
      "ru": "RU",
      "zh": "ZH",
    };
    
    const target = langMap[targetLang.toLowerCase()] || targetLang.toUpperCase();
    const source = sourceLang ? (langMap[sourceLang.toLowerCase()] || sourceLang.toUpperCase()) : null;
    
    const result = await translator.translateText(
      text,
      source as any,
      target as any
    );
    
    return {
      text: result.text,
      detectedSourceLang: result.detectedSourceLang,
    };
  }
}

class NoOpTranslationProvider implements TranslationProvider {
  isAvailable(): boolean {
    return false;
  }

  async translate(text: string, targetLang: string, sourceLang?: string): Promise<{ text: string; detectedSourceLang?: string }> {
    console.log(`[Translation disabled] Would translate to ${targetLang}`);
    return { text };
  }
}

let translationProvider: TranslationProvider | null = null;

export function createTranslationProvider(config: AppConfig): TranslationProvider {
  if (config.translation.enabled && config.translation.deeplApiKey) {
    return new DeepLProvider(config.translation.deeplApiKey);
  }
  return new NoOpTranslationProvider();
}

export function getTranslationProvider(): TranslationProvider {
  if (!translationProvider) {
    const config = getConfig();
    translationProvider = createTranslationProvider(config);
  }
  return translationProvider;
}

export function resetTranslationProvider(): void {
  translationProvider = null;
}
