/**
 * EPIC-LOC-01: Minimal bilingual EN/FR i18n for the EHR application.
 * Server-side: pass locale from cookie/Accept-Language header.
 * Client-side: wrap components with useTranslations hook.
 */

export type Locale = "en" | "fr";
export const DEFAULT_LOCALE: Locale = "en";
export const SUPPORTED_LOCALES: Locale[] = ["en", "fr"];

type Messages = typeof import("./messages/en.json");

let enMessages: Messages;
let frMessages: Messages;

export async function getMessages(locale: Locale): Promise<Messages> {
  if (locale === "fr") {
    frMessages ??= (await import("./messages/fr.json")).default as unknown as Messages;
    return frMessages;
  }
  enMessages ??= (await import("./messages/en.json")).default as unknown as Messages;
  return enMessages;
}

/**
 * Resolve locale from Accept-Language header or cookie.
 * Falls back to DEFAULT_LOCALE.
 */
export function resolveLocale(acceptLanguage?: string | null, cookieLocale?: string | null): Locale {
  const candidate = cookieLocale ?? acceptLanguage?.split(",")[0]?.split("-")[0]?.trim();
  if (candidate === "fr") return "fr";
  return DEFAULT_LOCALE;
}

/** Simple synchronous translator using a loaded messages object. */
export function createT(messages: Messages) {
  return function t(key: string, params?: Record<string, string>): string {
    const parts = key.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let node: any = messages;
    for (const part of parts) {
      if (node == null) return key;
      node = node[part];
    }
    if (typeof node !== "string") return key;
    if (params) {
      return Object.entries(params).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, v),
        node
      );
    }
    return node;
  };
}