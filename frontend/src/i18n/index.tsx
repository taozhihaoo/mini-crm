import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { zh } from "./zh";

export type Lang = "en" | "zh";
type Vars = Record<string, string | number>;

const STORAGE_KEY = "cf_lang";

/** English is the source language: keys are the English UI strings themselves. */
function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? ""));
}

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "zh" || param === "en") return param;
  return window.localStorage.getItem(STORAGE_KEY) === "zh" ? "zh" : "en";
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Vars) => string;
}

// Components are also rendered in isolation by the unit tests (no provider),
// so a missing provider falls back to English instead of throwing.
const ENGLISH_FALLBACK: I18nValue = {
  lang: "en",
  setLang: () => undefined,
  t: (key, vars) => interpolate(key, vars),
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    if (next === "zh") url.searchParams.set("lang", "zh");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const t = useCallback(
    (key: string, vars?: Vars) => interpolate(lang === "zh" ? (zh[key] ?? key) : key, vars),
    [lang],
  );

  const value = useMemo<I18nValue>(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nValue {
  return useContext(I18nContext) ?? ENGLISH_FALLBACK;
}
