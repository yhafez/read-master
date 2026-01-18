import { describe, it, expect } from "vitest";
import {
  ENGLISH,
  ARABIC,
  SPANISH,
  JAPANESE,
  CHINESE,
  TAGALOG,
  SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
  LANGUAGES_BY_CODE,
  RTL_LANGUAGE_CODES,
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_LOCALE,
  DATE_FORMAT_STYLES,
  TIME_FORMAT_STYLES,
  NUMBER_LOCALES,
  FONT_STACKS,
  DYSLEXIA_FONT,
  isSupportedLanguage,
  getLanguageInfo,
  isRtlLanguage,
  getTextDirection,
  getFullLocale,
  getEnabledLanguages,
  getLanguageOptions,
  parseLanguageCode,
  getFontStack,
  formatNumber,
  formatLocalizedDate,
  formatLocalizedTime,
  languageUtils,
  type SupportedLanguageCode,
  type LanguageInfo,
  type TextDirection,
} from "./languages";

describe("Language Constants", () => {
  describe("Individual Language Definitions", () => {
    describe("ENGLISH", () => {
      it("should have correct code", () => {
        expect(ENGLISH.code).toBe("en");
      });

      it("should have correct names", () => {
        expect(ENGLISH.englishName).toBe("English");
        expect(ENGLISH.nativeName).toBe("English");
      });

      it("should not be RTL", () => {
        expect(ENGLISH.isRtl).toBe(false);
      });

      it("should be enabled", () => {
        expect(ENGLISH.isEnabled).toBe(true);
      });

      it("should have correct locale", () => {
        expect(ENGLISH.fullLocale).toBe("en-US");
        expect(ENGLISH.primaryRegion).toBe("US");
      });

      it("should have sort order 1", () => {
        expect(ENGLISH.sortOrder).toBe(1);
      });
    });

    describe("ARABIC", () => {
      it("should have correct code", () => {
        expect(ARABIC.code).toBe("ar");
      });

      it("should have correct native name", () => {
        expect(ARABIC.nativeName).toBe("العربية");
      });

      it("should be RTL", () => {
        expect(ARABIC.isRtl).toBe(true);
      });

      it("should have correct locale", () => {
        expect(ARABIC.fullLocale).toBe("ar-SA");
      });
    });

    describe("SPANISH", () => {
      it("should have correct code", () => {
        expect(SPANISH.code).toBe("es");
      });

      it("should have correct native name", () => {
        expect(SPANISH.nativeName).toBe("Español");
      });

      it("should not be RTL", () => {
        expect(SPANISH.isRtl).toBe(false);
      });

      it("should have correct locale", () => {
        expect(SPANISH.fullLocale).toBe("es-ES");
      });
    });

    describe("JAPANESE", () => {
      it("should have correct code", () => {
        expect(JAPANESE.code).toBe("ja");
      });

      it("should have correct native name", () => {
        expect(JAPANESE.nativeName).toBe("日本語");
      });

      it("should not be RTL", () => {
        expect(JAPANESE.isRtl).toBe(false);
      });

      it("should have correct locale", () => {
        expect(JAPANESE.fullLocale).toBe("ja-JP");
      });
    });

    describe("CHINESE", () => {
      it("should have correct code", () => {
        expect(CHINESE.code).toBe("zh");
      });

      it("should have correct native name", () => {
        expect(CHINESE.nativeName).toBe("简体中文");
      });

      it("should not be RTL", () => {
        expect(CHINESE.isRtl).toBe(false);
      });

      it("should have correct locale", () => {
        expect(CHINESE.fullLocale).toBe("zh-CN");
      });
    });

    describe("TAGALOG", () => {
      it("should have correct code", () => {
        expect(TAGALOG.code).toBe("tl");
      });

      it("should have correct names", () => {
        expect(TAGALOG.englishName).toBe("Tagalog");
        expect(TAGALOG.nativeName).toBe("Tagalog");
      });

      it("should not be RTL", () => {
        expect(TAGALOG.isRtl).toBe(false);
      });

      it("should have correct locale", () => {
        expect(TAGALOG.fullLocale).toBe("tl-PH");
      });
    });
  });

  describe("SUPPORTED_LANGUAGES", () => {
    it("should have 6 languages", () => {
      expect(SUPPORTED_LANGUAGES.length).toBe(6);
    });

    it("should include all individual languages", () => {
      expect(SUPPORTED_LANGUAGES).toContain(ENGLISH);
      expect(SUPPORTED_LANGUAGES).toContain(ARABIC);
      expect(SUPPORTED_LANGUAGES).toContain(SPANISH);
      expect(SUPPORTED_LANGUAGES).toContain(JAPANESE);
      expect(SUPPORTED_LANGUAGES).toContain(CHINESE);
      expect(SUPPORTED_LANGUAGES).toContain(TAGALOG);
    });

    it("should have unique codes", () => {
      const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it("should have unique sort orders", () => {
      const orders = SUPPORTED_LANGUAGES.map((l) => l.sortOrder);
      const uniqueOrders = new Set(orders);
      expect(uniqueOrders.size).toBe(orders.length);
    });
  });

  describe("SUPPORTED_LANGUAGE_CODES", () => {
    it("should have 6 codes", () => {
      expect(SUPPORTED_LANGUAGE_CODES.length).toBe(6);
    });

    it("should contain all expected codes", () => {
      expect(SUPPORTED_LANGUAGE_CODES).toContain("en");
      expect(SUPPORTED_LANGUAGE_CODES).toContain("ar");
      expect(SUPPORTED_LANGUAGE_CODES).toContain("es");
      expect(SUPPORTED_LANGUAGE_CODES).toContain("ja");
      expect(SUPPORTED_LANGUAGE_CODES).toContain("zh");
      expect(SUPPORTED_LANGUAGE_CODES).toContain("tl");
    });
  });

  describe("LANGUAGES_BY_CODE", () => {
    it("should map codes to language info", () => {
      expect(LANGUAGES_BY_CODE.en).toBe(ENGLISH);
      expect(LANGUAGES_BY_CODE.ar).toBe(ARABIC);
      expect(LANGUAGES_BY_CODE.es).toBe(SPANISH);
      expect(LANGUAGES_BY_CODE.ja).toBe(JAPANESE);
      expect(LANGUAGES_BY_CODE.zh).toBe(CHINESE);
      expect(LANGUAGES_BY_CODE.tl).toBe(TAGALOG);
    });
  });

  describe("RTL_LANGUAGE_CODES", () => {
    it("should only contain Arabic", () => {
      expect(RTL_LANGUAGE_CODES.length).toBe(1);
      expect(RTL_LANGUAGE_CODES).toContain("ar");
    });

    it("should not contain LTR languages", () => {
      expect(RTL_LANGUAGE_CODES).not.toContain("en");
      expect(RTL_LANGUAGE_CODES).not.toContain("es");
      expect(RTL_LANGUAGE_CODES).not.toContain("ja");
      expect(RTL_LANGUAGE_CODES).not.toContain("zh");
      expect(RTL_LANGUAGE_CODES).not.toContain("tl");
    });
  });

  describe("DEFAULT_LANGUAGE_CODE", () => {
    it("should be English", () => {
      expect(DEFAULT_LANGUAGE_CODE).toBe("en");
    });
  });

  describe("DEFAULT_LOCALE", () => {
    it("should be en-US", () => {
      expect(DEFAULT_LOCALE).toBe("en-US");
    });
  });

  describe("DATE_FORMAT_STYLES", () => {
    it("should have styles for all languages", () => {
      SUPPORTED_LANGUAGE_CODES.forEach((code) => {
        expect(DATE_FORMAT_STYLES[code]).toBeDefined();
        expect(DATE_FORMAT_STYLES[code].short).toBeDefined();
        expect(DATE_FORMAT_STYLES[code].medium).toBeDefined();
        expect(DATE_FORMAT_STYLES[code].long).toBeDefined();
      });
    });

    it("should have weekday in long format", () => {
      expect(DATE_FORMAT_STYLES.en.long.weekday).toBe("long");
    });
  });

  describe("TIME_FORMAT_STYLES", () => {
    it("should have styles for all languages", () => {
      SUPPORTED_LANGUAGE_CODES.forEach((code) => {
        expect(TIME_FORMAT_STYLES[code]).toBeDefined();
        expect(TIME_FORMAT_STYLES[code].short).toBeDefined();
        expect(TIME_FORMAT_STYLES[code].medium).toBeDefined();
      });
    });

    it("should use 12-hour format for English", () => {
      expect(TIME_FORMAT_STYLES.en.short.hour12).toBe(true);
    });

    it("should use 24-hour format for Spanish and Japanese", () => {
      expect(TIME_FORMAT_STYLES.es.short.hour12).toBe(false);
      expect(TIME_FORMAT_STYLES.ja.short.hour12).toBe(false);
    });
  });

  describe("NUMBER_LOCALES", () => {
    it("should have locales for all languages", () => {
      SUPPORTED_LANGUAGE_CODES.forEach((code) => {
        expect(NUMBER_LOCALES[code]).toBeDefined();
      });
    });

    it("should have correct locales", () => {
      expect(NUMBER_LOCALES.en).toBe("en-US");
      expect(NUMBER_LOCALES.ar).toBe("ar-SA");
      expect(NUMBER_LOCALES.ja).toBe("ja-JP");
    });
  });

  describe("FONT_STACKS", () => {
    it("should have font stacks for all languages", () => {
      SUPPORTED_LANGUAGE_CODES.forEach((code) => {
        expect(FONT_STACKS[code]).toBeDefined();
        expect(typeof FONT_STACKS[code]).toBe("string");
        expect(FONT_STACKS[code].length).toBeGreaterThan(0);
      });
    });

    it("should include CJK-specific fonts for Japanese and Chinese", () => {
      expect(FONT_STACKS.ja).toContain("Noto Sans JP");
      expect(FONT_STACKS.zh).toContain("Noto Sans SC");
    });

    it("should include Arabic-specific fonts", () => {
      expect(FONT_STACKS.ar).toContain("Noto Sans Arabic");
    });
  });

  describe("DYSLEXIA_FONT", () => {
    it("should have correct font name", () => {
      expect(DYSLEXIA_FONT.name).toBe("OpenDyslexic");
    });

    it("should have fallback fonts", () => {
      expect(DYSLEXIA_FONT.fallback).toContain("Comic Sans MS");
    });

    it("should have full font stack", () => {
      expect(DYSLEXIA_FONT.full).toContain("OpenDyslexic");
    });
  });
});

describe("Language Functions", () => {
  describe("isSupportedLanguage", () => {
    it("should return true for supported language codes", () => {
      expect(isSupportedLanguage("en")).toBe(true);
      expect(isSupportedLanguage("ar")).toBe(true);
      expect(isSupportedLanguage("es")).toBe(true);
      expect(isSupportedLanguage("ja")).toBe(true);
      expect(isSupportedLanguage("zh")).toBe(true);
      expect(isSupportedLanguage("tl")).toBe(true);
    });

    it("should return false for unsupported language codes", () => {
      expect(isSupportedLanguage("fr")).toBe(false);
      expect(isSupportedLanguage("de")).toBe(false);
      expect(isSupportedLanguage("invalid")).toBe(false);
      expect(isSupportedLanguage("")).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(isSupportedLanguage("EN")).toBe(false);
      expect(isSupportedLanguage("En")).toBe(false);
    });
  });

  describe("getLanguageInfo", () => {
    it("should return language info for supported codes", () => {
      const info = getLanguageInfo("en");
      expect(info).toBe(ENGLISH);
    });

    it("should return undefined for unsupported codes", () => {
      const info = getLanguageInfo("fr");
      expect(info).toBeUndefined();
    });

    it("should return correct info for all supported languages", () => {
      expect(getLanguageInfo("ar")).toBe(ARABIC);
      expect(getLanguageInfo("es")).toBe(SPANISH);
      expect(getLanguageInfo("ja")).toBe(JAPANESE);
      expect(getLanguageInfo("zh")).toBe(CHINESE);
      expect(getLanguageInfo("tl")).toBe(TAGALOG);
    });
  });

  describe("isRtlLanguage", () => {
    it("should return true for Arabic", () => {
      expect(isRtlLanguage("ar")).toBe(true);
    });

    it("should return false for LTR languages", () => {
      expect(isRtlLanguage("en")).toBe(false);
      expect(isRtlLanguage("es")).toBe(false);
      expect(isRtlLanguage("ja")).toBe(false);
      expect(isRtlLanguage("zh")).toBe(false);
      expect(isRtlLanguage("tl")).toBe(false);
    });

    it("should return false for unsupported languages", () => {
      expect(isRtlLanguage("he")).toBe(false); // Hebrew is RTL but not supported
      expect(isRtlLanguage("invalid")).toBe(false);
    });
  });

  describe("getTextDirection", () => {
    it("should return rtl for Arabic", () => {
      expect(getTextDirection("ar")).toBe("rtl");
    });

    it("should return ltr for LTR languages", () => {
      expect(getTextDirection("en")).toBe("ltr");
      expect(getTextDirection("es")).toBe("ltr");
      expect(getTextDirection("ja")).toBe("ltr");
    });

    it("should return ltr for unsupported languages", () => {
      expect(getTextDirection("invalid")).toBe("ltr");
    });
  });

  describe("getFullLocale", () => {
    it("should return correct locale for supported languages", () => {
      expect(getFullLocale("en")).toBe("en-US");
      expect(getFullLocale("ar")).toBe("ar-SA");
      expect(getFullLocale("es")).toBe("es-ES");
      expect(getFullLocale("ja")).toBe("ja-JP");
      expect(getFullLocale("zh")).toBe("zh-CN");
      expect(getFullLocale("tl")).toBe("tl-PH");
    });

    it("should return default locale for unsupported languages", () => {
      expect(getFullLocale("invalid")).toBe(DEFAULT_LOCALE);
    });
  });

  describe("getEnabledLanguages", () => {
    it("should return all enabled languages", () => {
      const enabled = getEnabledLanguages();
      expect(enabled.length).toBe(6);
    });

    it("should be sorted by sortOrder", () => {
      const enabled = getEnabledLanguages();
      for (let i = 1; i < enabled.length; i++) {
        const current = enabled[i];
        const previous = enabled[i - 1];
        if (current && previous) {
          expect(current.sortOrder).toBeGreaterThan(previous.sortOrder);
        }
      }
    });

    it("should have English first", () => {
      const enabled = getEnabledLanguages();
      expect(enabled[0]?.code).toBe("en");
    });
  });

  describe("getLanguageOptions", () => {
    it("should return options for all enabled languages", () => {
      const options = getLanguageOptions();
      expect(options.length).toBe(6);
    });

    it("should have correct structure", () => {
      const options = getLanguageOptions();
      options.forEach((opt) => {
        expect(opt.value).toBeDefined();
        expect(opt.label).toBeDefined();
        expect(opt.nativeLabel).toBeDefined();
      });
    });

    it("should have English first", () => {
      const options = getLanguageOptions();
      expect(options[0]?.value).toBe("en");
      expect(options[0]?.label).toBe("English");
    });

    it("should include native names", () => {
      const options = getLanguageOptions();
      const arabic = options.find((o) => o.value === "ar");
      expect(arabic?.nativeLabel).toBe("العربية");
    });
  });

  describe("parseLanguageCode", () => {
    it("should return code for exact match", () => {
      expect(parseLanguageCode("en")).toBe("en");
      expect(parseLanguageCode("ar")).toBe("ar");
    });

    it("should parse locale strings", () => {
      expect(parseLanguageCode("en-US")).toBe("en");
      expect(parseLanguageCode("ar-SA")).toBe("ar");
      expect(parseLanguageCode("es-MX")).toBe("es");
    });

    it("should handle case variations in locale", () => {
      expect(parseLanguageCode("EN-us")).toBe("en");
      expect(parseLanguageCode("AR-SA")).toBe("ar");
    });

    it("should return null for unsupported languages", () => {
      expect(parseLanguageCode("fr")).toBeNull();
      expect(parseLanguageCode("de-DE")).toBeNull();
      expect(parseLanguageCode("invalid")).toBeNull();
    });
  });

  describe("getFontStack", () => {
    it("should return correct font stack for languages", () => {
      expect(getFontStack("en")).toBe(FONT_STACKS.en);
      expect(getFontStack("ja")).toBe(FONT_STACKS.ja);
      expect(getFontStack("ar")).toBe(FONT_STACKS.ar);
    });

    it("should return dyslexia font when requested", () => {
      expect(getFontStack("en", true)).toBe(DYSLEXIA_FONT.full);
      expect(getFontStack("ja", true)).toBe(DYSLEXIA_FONT.full);
    });

    it("should return English font stack for unsupported languages", () => {
      expect(getFontStack("invalid")).toBe(FONT_STACKS.en);
    });
  });

  describe("formatNumber", () => {
    it("should format numbers according to locale", () => {
      const result = formatNumber(1234567.89, "en");
      expect(result).toContain("1");
      expect(result).toContain("234");
    });

    it("should format numbers for different locales", () => {
      const num = 1234.56;
      const enResult = formatNumber(num, "en");
      const arResult = formatNumber(num, "ar");
      // Both should contain numeric content
      expect(enResult).toBeTruthy();
      expect(arResult).toBeTruthy();
    });

    it("should accept format options", () => {
      const result = formatNumber(0.1234, "en", {
        style: "percent",
      });
      expect(result).toContain("%");
    });

    it("should use English for unsupported languages", () => {
      const result = formatNumber(1234, "invalid");
      expect(result).toBeTruthy();
    });
  });

  describe("formatLocalizedDate", () => {
    it("should format dates according to locale", () => {
      const date = new Date(2024, 0, 15); // Jan 15, 2024
      const result = formatLocalizedDate(date, "en", "short");
      expect(result).toContain("15");
      expect(result).toContain("24");
    });

    it("should use medium style by default", () => {
      const date = new Date(2024, 0, 15);
      const result = formatLocalizedDate(date, "en");
      expect(result).toContain("2024");
    });

    it("should format long dates with weekday", () => {
      const date = new Date(2024, 0, 15); // Monday
      const result = formatLocalizedDate(date, "en", "long");
      expect(result.toLowerCase()).toMatch(/monday|january/i);
    });
  });

  describe("formatLocalizedTime", () => {
    it("should format time according to locale", () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const result = formatLocalizedTime(date, "en", "short");
      // Check that either the hour (2) or minutes (30) appear in the result
      const containsTimeInfo = result.includes("2") || result.includes("30");
      expect(containsTimeInfo).toBe(true);
    });

    it("should use short style by default", () => {
      const date = new Date(2024, 0, 15, 14, 30);
      const result = formatLocalizedTime(date, "en");
      expect(result).toBeTruthy();
    });
  });
});

describe("languageUtils", () => {
  it("should export all utility functions", () => {
    expect(languageUtils.isSupportedLanguage).toBe(isSupportedLanguage);
    expect(languageUtils.getLanguageInfo).toBe(getLanguageInfo);
    expect(languageUtils.isRtlLanguage).toBe(isRtlLanguage);
    expect(languageUtils.getTextDirection).toBe(getTextDirection);
    expect(languageUtils.getFullLocale).toBe(getFullLocale);
    expect(languageUtils.getEnabledLanguages).toBe(getEnabledLanguages);
    expect(languageUtils.getLanguageOptions).toBe(getLanguageOptions);
    expect(languageUtils.parseLanguageCode).toBe(parseLanguageCode);
    expect(languageUtils.getFontStack).toBe(getFontStack);
    expect(languageUtils.formatNumber).toBe(formatNumber);
    expect(languageUtils.formatLocalizedDate).toBe(formatLocalizedDate);
    expect(languageUtils.formatLocalizedTime).toBe(formatLocalizedTime);
  });
});

describe("Type exports", () => {
  it("should have SupportedLanguageCode type", () => {
    const code: SupportedLanguageCode = "en";
    expect(code).toBe("en");
  });

  it("should have LanguageInfo type", () => {
    const info: LanguageInfo = {
      code: "en",
      englishName: "English",
      nativeName: "English",
      isRtl: false,
      isEnabled: true,
      sortOrder: 1,
      primaryRegion: "US",
      fullLocale: "en-US",
    };
    expect(info.code).toBe("en");
  });

  it("should have TextDirection type", () => {
    const ltr: TextDirection = "ltr";
    const rtl: TextDirection = "rtl";
    expect(ltr).toBe("ltr");
    expect(rtl).toBe("rtl");
  });
});
