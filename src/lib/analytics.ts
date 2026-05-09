"use client";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventParams = Record<string, string | number | boolean | undefined>;

// ─── Core trackEvent ──────────────────────────────────────────────────────────

export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === "undefined") return;
  const w = window as Window & { dataLayer?: object[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event: eventName, ...params });
}

// ─── UTM + ref attribution ────────────────────────────────────────────────────

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
const STORAGE_KEY_FIRST = "mf_utm_first";
const STORAGE_KEY_LAST = "mf_utm_last";
const STORAGE_KEY_REF = "mf_ref";

export function captureAttribution() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  const utms: Record<string, string> = {};
  UTM_PARAMS.forEach((k) => {
    const v = params.get(k);
    if (v) utms[k] = v;
  });

  if (Object.keys(utms).length > 0) {
    // Always overwrite last-touch
    localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(utms));
    // Only write first-touch once
    if (!localStorage.getItem(STORAGE_KEY_FIRST)) {
      localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(utms));
    }
  }

  const ref = params.get("ref");
  if (ref) localStorage.setItem(STORAGE_KEY_REF, ref);
}

export function getAttribution(): {
  firstTouch: Record<string, string> | null;
  lastTouch: Record<string, string> | null;
  ref: string | null;
} {
  if (typeof window === "undefined") return { firstTouch: null, lastTouch: null, ref: null };
  try {
    return {
      firstTouch: JSON.parse(localStorage.getItem(STORAGE_KEY_FIRST) ?? "null"),
      lastTouch: JSON.parse(localStorage.getItem(STORAGE_KEY_LAST) ?? "null"),
      ref: localStorage.getItem(STORAGE_KEY_REF),
    };
  } catch {
    return { firstTouch: null, lastTouch: null, ref: null };
  }
}

// ─── Typed event helpers ──────────────────────────────────────────────────────

export const track = {
  ctaClick: (ctaId: string, page: string, position: string) =>
    trackEvent("cta_click", { cta_id: ctaId, page, position }),

  whatsappClick: (page: string) =>
    trackEvent("whatsapp_click", { page }),

  videoPlay: (videoId: string, title?: string) =>
    trackEvent("video_play", { video_id: videoId, video_title: title }),

  outboundLink: (destination: string) =>
    trackEvent("outbound_link", { destination }),

  sponsorLogoClick: (tier: number, name: string) =>
    trackEvent("sponsor_logo_click", { tier, name }),

  rockstarView: (name: string, tipo: string) =>
    trackEvent("rockstar_view", { rockstar_name: name, rockstar_tipo: tipo }),

  formStepStart: (step: number) =>
    trackEvent("form_step_start", { step_n: step }),

  formStepComplete: (step: number, durationSec: number) =>
    trackEvent("form_step_complete", { step_n: step, duration_s: durationSec }),

  formSubmitSuccess: () =>
    trackEvent("form_submit_success"),

  formSubmitError: (reason: string) =>
    trackEvent("form_submit_error", { reason }),
};
