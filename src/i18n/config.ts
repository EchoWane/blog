import type { I18nStrings } from "./types";
import FALocale from "./locales/fa";
import ENLocale from "./locales/en";
export type LocaleProfile = {
  name: string;
  messages: I18nStrings;
  langTag: string;
  direction: "rtl" | "ltr" | "auto";
  default?: boolean;
};
export type LocaleKey = keyof typeof localeToProfile;
export const localeToProfile = {
  // locale key must be in lowercase
  fa: {
    name: "فارسی", // Name presented in language picker
    messages: FALocale, // Locale translations
    langTag: "fa-IR", // Extremly important used in localizing dates, numbers and sitemap,  only English alphabet and hyphen allowed
    direction: "rtl", // UI layout direction
  },
  en: {
    name: "English",
    messages: ENLocale,
    langTag: "en-US",
    direction: "ltr",
    default: true,
  },
} satisfies Record<string, LocaleProfile>;
export const SUPPORTED_LOCALES = Object.keys(localeToProfile) as LocaleKey[];
export const DEFAULT_LOCALE =
  SUPPORTED_LOCALES.find(
    key => (localeToProfile[key] as LocaleProfile)?.default === true
  ) ?? SUPPORTED_LOCALES[0];
export const LOCALES_TO_LANG = Object.fromEntries(
  // For Sitemap
  Object.entries(localeToProfile).map(([locale, profile]) => [
    locale,
    profile.langTag,
  ])
) as Record<keyof typeof localeToProfile, string>;
