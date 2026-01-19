import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import ar from "../locales/ar.json";
import es from "../locales/es.json";
import ja from "../locales/ja.json";
import zh from "../locales/zh.json";
import tl from "../locales/tl.json";

export const supportedLanguages = ["en", "ar", "es", "ja", "zh", "tl"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const rtlLanguages: SupportedLanguage[] = ["ar"];

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  ar: "العربية",
  es: "Español",
  ja: "日本語",
  zh: "简体中文",
  tl: "Tagalog",
};

export function isRtlLanguage(lang: string): boolean {
  return rtlLanguages.includes(lang as SupportedLanguage);
}

export function getDocumentDirection(lang: string): "ltr" | "rtl" {
  return isRtlLanguage(lang) ? "rtl" : "ltr";
}

export function updateDocumentDirection(lang: string): void {
  if (typeof document === "undefined") return;
  const direction = getDocumentDirection(lang);
  document.documentElement.dir = direction;
  document.documentElement.lang = lang;
}

const resources = {
  en: { translation: en },
  ar: { translation: ar },
  es: { translation: es },
  ja: { translation: ja },
  zh: { translation: zh },
  tl: { translation: tl },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: supportedLanguages,

    interpolation: {
      escapeValue: false,
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    react: {
      useSuspense: false,
    },
  });

i18n.on("languageChanged", (lang) => {
  updateDocumentDirection(lang);
});

updateDocumentDirection(i18n.language);

export default i18n;
