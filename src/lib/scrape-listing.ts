import * as cheerio from "cheerio";

const BLOCKED_HINTS = [
  "access denied",
  "cf-browser-verification",
  "please enable cookies",
  "robot or human",
  "unusual traffic",
  "verify you are human",
  "captcha-delivery",
  "not a robot",
  "javascript is disabled",
];

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Upgrade-Insecure-Requests": "1",
};

/** Booking blocks normal browser UA; social crawlers still get the hotel page. */
const BOOKING_HEADERS: Record<string, string> = {
  "User-Agent":
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
};

export type ScrapedListing = {
  url: string;
  title: string | null;
  text: string;
  imageUrls: string[];
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Ongeldige URL. Plak een volledige link (https://…).");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Alleen http(s)-links worden ondersteund.");
  }
  return parsed.toString();
}

function absolutize(base: string, href: string | undefined): string | null {
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/** Booking CDN needs signed query params; strip elsewhere. */
function keepImageUrl(url: string): string {
  if (/bstatic\.com/i.test(url)) return url;
  return url.split("?")[0]!;
}

function isAirbnbHost(hostname: string): boolean {
  return /(^|\.)airbnb\.[a-z.]+$/i.test(hostname);
}

function isBookingHost(hostname: string): boolean {
  return /(^|\.)booking\.com$/i.test(hostname);
}

/** Keep stay dates/guests, drop tracking noise from Booking share links. */
function canonicalizeBookingUrl(raw: string): string {
  const u = new URL(raw);
  const keep = new Set([
    "checkin",
    "checkout",
    "group_adults",
    "group_children",
    "no_rooms",
    "req_adults",
    "req_children",
    "selected_currency",
  ]);
  const next = new URL(u.origin + u.pathname);
  for (const key of keep) {
    const value = u.searchParams.get(key);
    if (value) next.searchParams.set(key, value);
  }
  if (!next.searchParams.has("selected_currency")) {
    next.searchParams.set("selected_currency", "EUR");
  }
  return next.toString();
}

function extractAirbnbListingId(url: string): string | null {
  const match = url.match(/\/rooms\/(\d+)/i);
  return match?.[1] ?? null;
}

function mergeCookies(existing: string, setCookie: string[]): string {
  const map = new Map<string, string>();
  for (const part of existing
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const i = part.indexOf("=");
    if (i > 0) map.set(part.slice(0, i), part.slice(i + 1));
  }
  for (const raw of setCookie) {
    const kv = raw.split(";")[0] ?? "";
    const i = kv.indexOf("=");
    if (i > 0) map.set(kv.slice(0, i), kv.slice(i + 1));
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function fetchHtml(
  url: string,
  options: {
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<{ html: string; finalUrl: string; cookie: string; status: number }> {
  const cookie = options.cookie ?? "";
  const headers = options.headers ?? BROWSER_HEADERS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: cookie ? { ...headers, Cookie: cookie } : headers,
    });
    const html = await res.text();
    const nextCookie = mergeCookies(
      cookie,
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : []
    );
    return {
      html,
      finalUrl: res.url || url,
      cookie: nextCookie,
      status: res.status,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "De website reageerde te traag. Probeer opnieuw of vul handmatig in."
      );
    }
    throw new Error(
      "Kon de pagina niet ophalen. Controleer de link of vul handmatig in."
    );
  } finally {
    clearTimeout(timeout);
  }
}

function isChallengePage(html: string, status: number): boolean {
  if (status === 202 || status === 403 || status === 429) return true;
  if (html.length < 8000) {
    const lower = html.toLowerCase();
    if (
      lower.includes("not a robot") ||
      lower.includes("javascript is disabled") ||
      lower.includes("captcha") ||
      lower.includes("cf-browser-verification")
    ) {
      return true;
    }
  }
  return false;
}

/** Airbnb geo-redirects via a tiny POST handoff page — follow it. */
async function followAirbnbDomainSwitch(
  html: string,
  fromUrl: string,
  cookie: string
): Promise<{ html: string; finalUrl: string; cookie: string } | null> {
  if (!html.includes("domain_switch/handoff")) return null;

  const action = html.match(/action="([^"]+)"/)?.[1];
  const payload = html.match(/name="payload"\s+value="([^"]+)"/)?.[1];
  if (!action || !payload) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const post = await fetch(action, {
      method: "POST",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        ...BROWSER_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: new URL(fromUrl).origin,
        Referer: fromUrl,
        Cookie: cookie,
      },
      body: `version=1&payload=${encodeURIComponent(payload)}`,
    });

    const nextCookie = mergeCookies(
      cookie,
      typeof post.headers.getSetCookie === "function"
        ? post.headers.getSetCookie()
        : []
    );

    const host = new URL(action).host;
    const listingId = extractAirbnbListingId(fromUrl);
    const location = post.headers.get("location");
    let nextUrl: string;
    if (location) {
      nextUrl = location.startsWith("http")
        ? location
        : new URL(location, `https://${host}`).toString();
    } else if (listingId) {
      nextUrl = `https://${host}/rooms/${listingId}`;
    } else {
      return null;
    }

    const page = await fetchHtml(nextUrl, { cookie: nextCookie });
    return {
      html: page.html,
      finalUrl: page.finalUrl,
      cookie: page.cookie,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function collectStrings(value: unknown, out: Set<string>, depth = 0) {
  if (depth > 14 || value == null) return;
  if (typeof value === "string") {
    const t = value.trim();
    if (
      t.length >= 12 &&
      t.length <= 4000 &&
      !/^https?:\/\//i.test(t) &&
      !/^[A-Z0-9_.:-]+$/.test(t) &&
      !t.includes("muscache.com") &&
      !/PresentationContainer|SectionContainer|LoggingEventData|__typename|UniversalLogging|ViewportPresentation|treatment_|experiment|ImageMetadata|StayPDP/i.test(
        t
      ) &&
      !/(Section|Container|Session)$/.test(t) &&
      !/^[A-Za-z0-9+/=]{40,}$/.test(t) &&
      !/\.[a-z_]+$/.test(t) &&
      !/^pdp\./i.test(t) &&
      !/^map_category/i.test(t)
    ) {
      out.add(t);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectStrings(item, out, depth + 1);
    }
  }
}

function collectMuscacheImages(value: unknown, out: Set<string>, depth = 0) {
  if (depth > 16 || value == null) return;
  if (typeof value === "string") {
    if (
      /muscache\.com\/im\//i.test(value) &&
      /\.(jpe?g|png|webp)/i.test(value)
    ) {
      out.add(value.split("?")[0]!);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectMuscacheImages(item, out, depth + 1);
    return;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.baseUrl === "string") {
      collectMuscacheImages(obj.baseUrl, out, depth + 1);
    }
    for (const item of Object.values(obj)) {
      collectMuscacheImages(item, out, depth + 1);
    }
  }
}

function extractAirbnbNiobe(html: string): {
  textParts: string[];
  imageUrls: string[];
} {
  const $ = cheerio.load(html);
  const textParts: string[] = [];
  const imageUrls = new Set<string>();

  $('script[type="application/json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw || !raw.includes("niobeClientData")) return;
    try {
      const data = JSON.parse(raw) as {
        niobeClientData?: unknown[];
      };
      const items = data.niobeClientData;
      if (!Array.isArray(items)) return;

      for (const item of items) {
        if (!Array.isArray(item) || item.length < 2) continue;
        const key = String(item[0] ?? "");
        if (!key.startsWith("StaysPdpSections")) continue;
        const payload = item[1];
        collectMuscacheImages(payload, imageUrls);
        const strings = new Set<string>();
        collectStrings(payload, strings);
        textParts.push(...strings);
      }
    } catch {
      // ignore malformed bootstrap JSON
    }
  });

  return {
    textParts: textParts.slice(0, 200),
    imageUrls: Array.from(imageUrls),
  };
}

function extractBookingJsonLd(html: string): {
  textParts: string[];
  imageUrls: string[];
  name: string | null;
} {
  const $ = cheerio.load(html);
  const textParts: string[] = [];
  const imageUrls = new Set<string>();
  let name: string | null = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (typeof parsed.name === "string" && !name) name = parsed.name;
      if (typeof parsed.description === "string") {
        textParts.push(parsed.description);
      }
      const address = parsed.address;
      if (address && typeof address === "object") {
        const a = address as Record<string, unknown>;
        const bits = [
          a.streetAddress,
          a.addressLocality,
          a.addressRegion,
          a.addressCountry,
          a.postalCode,
        ]
          .filter((v) => typeof v === "string" && v.trim())
          .join(", ");
        if (bits) textParts.push(`Locatie: ${bits}`);
      }
      const strings = new Set<string>();
      collectStrings(parsed, strings);
      textParts.push(...strings);

      const images = parsed.image;
      if (typeof images === "string") imageUrls.add(keepImageUrl(images));
      if (Array.isArray(images)) {
        for (const img of images) {
          if (typeof img === "string") imageUrls.add(keepImageUrl(img));
        }
      }
    } catch {
      // ignore
    }
  });

  return { textParts, imageUrls: Array.from(imageUrls), name };
}

function extractBookingImages(html: string): string[] {
  // Booking CDN returns 401 without the signed ?k= query params — keep them.
  type Candidate = { url: string; score: number };
  const byPath = new Map<string, Candidate>();

  const add = (raw: string, score: number) => {
    let parsed: URL;
    try {
      parsed = new URL(raw.replace(/&amp;/g, "&"));
    } catch {
      return;
    }
    if (!/bstatic\.com$/i.test(parsed.hostname)) return;
    if (!/\.(jpe?g|png|webp)$/i.test(parsed.pathname)) return;
    if (/design-assets|images-flags|logo|icon|sprite/i.test(parsed.pathname)) {
      return;
    }
    if (!/\/xdata\/images\/hotel\//i.test(parsed.pathname)) return;

    const hasSignature = parsed.searchParams.has("k");
    const finalScore = score + (hasSignature ? 10 : 0);
    const key = parsed.origin + parsed.pathname;
    const prev = byPath.get(key);
    if (!prev || finalScore > prev.score) {
      byPath.set(key, { url: parsed.toString(), score: finalScore });
    }
  };

  for (const match of html.matchAll(
    /https:\/\/[a-z0-9.-]+\.bstatic\.com\/[^"'\\\s>]+?\.(?:jpe?g|png|webp)(?:\?[^"'\\\s>]*)?/gi
  )) {
    const url = match[0];
    let score = 1;
    if (/max1024x768/i.test(url)) score = 5;
    else if (/max500/i.test(url)) score = 4;
    else if (/max300/i.test(url)) score = 2;
    else if (/608x352/i.test(url)) score = 3;
    add(url, score);
  }

  // Prefer signed URLs; unsigned ones often 401
  return [...byPath.values()]
    .filter((c) => {
      try {
        return new URL(c.url).searchParams.has("k");
      } catch {
        return false;
      }
    })
    .sort((a, b) => b.score - a.score)
    .map((c) => c.url);
}

function looksBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCKED_HINTS.some((hint) => lower.includes(hint));
}

function hasUsableListingContent(input: {
  title: string | null;
  description: string;
  bodyText: string;
  imageUrls: string[];
  extraText: string[];
}): boolean {
  if (input.title && input.description.length >= 8) return true;
  if (input.title && input.imageUrls.length >= 1) return true;
  if (input.extraText.join(" ").length >= 250) return true;
  if (
    (input.title?.length ?? 0) +
      input.description.length +
      input.bodyText.length >=
    280
  ) {
    return true;
  }
  return false;
}

async function fetchViaJina(url: string): Promise<ScrapedListing | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: {
        Accept: "text/plain",
        "X-No-Cache": "true",
        "X-Retain-Images": "all",
      },
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length < 400) return null;
    if (/not a robot|javascript is disabled/i.test(text)) return null;

    const title =
      text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ||
      text.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
      null;
    const images = [
      ...text.matchAll(
        /https:\/\/[a-z0-9.-]+\.bstatic\.com\/[^\s)]+\.(?:jpe?g|png|webp)/gi
      ),
    ].map((m) => m[0].split("?")[0]!);

    return {
      url,
      title,
      text: text.slice(0, 28000),
      imageUrls: [...new Set(images)].slice(0, 30),
    };
  } catch {
    return null;
  }
}

export async function scrapeListingPage(rawUrl: string): Promise<ScrapedListing> {
  let url = normalizeUrl(rawUrl);
  const host = new URL(url).hostname;
  const booking = isBookingHost(host);

  if (booking) {
    url = canonicalizeBookingUrl(url);
  }

  let html: string;
  let finalUrl = url;
  let cookie = "";
  let status = 0;

  const first = await fetchHtml(url, {
    headers: booking ? BOOKING_HEADERS : BROWSER_HEADERS,
  });
  html = first.html;
  finalUrl = first.finalUrl;
  cookie = first.cookie;
  status = first.status;

  // Booking sometimes still challenges; retry once with crawler UA if needed
  if (booking && isChallengePage(html, status)) {
    const retry = await fetchHtml(url, { headers: BOOKING_HEADERS });
    html = retry.html;
    finalUrl = retry.finalUrl;
    cookie = retry.cookie;
    status = retry.status;
  }

  // Non-booking challenge → try crawler UA as a generic fallback
  if (!booking && isChallengePage(html, status)) {
    const retry = await fetchHtml(url, { headers: BOOKING_HEADERS });
    if (!isChallengePage(retry.html, retry.status)) {
      html = retry.html;
      finalUrl = retry.finalUrl;
      cookie = retry.cookie;
      status = retry.status;
    }
  }

  if (status === 429) {
    throw new Error(
      "De site beperkt tijdelijk automatische toegang (rate limit). Probeer zo opnieuw of vul handmatig in."
    );
  }

  if (isAirbnbHost(host) || isAirbnbHost(new URL(finalUrl).hostname)) {
    const switched = await followAirbnbDomainSwitch(html, finalUrl, cookie);
    if (switched) {
      html = switched.html;
      finalUrl = switched.finalUrl;
      cookie = switched.cookie;
    }
  }

  // Last resort for Booking bot walls: Jina reader proxy
  if (booking && isChallengePage(html, status)) {
    const viaJina = await fetchViaJina(url);
    if (viaJina && viaJina.title) {
      return viaJina;
    }
    throw new Error(
      "Booking.com blokkeerde het ophalen van de pagina. Probeer opnieuw of vul handmatig in."
    );
  }

  if (!html || html.length < 200) {
    throw new Error(
      "Kon de pagina niet openen. De site blokkeert mogelijk automatische toegang."
    );
  }

  const $ = cheerio.load(html);

  let title =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").first().text().trim() ||
    null;

  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $('meta[name="description"]').attr("content")?.trim() ||
    "";

  const imageUrls = new Set<string>();
  const ogImage = absolutize(
    finalUrl,
    $('meta[property="og:image"]').attr("content")
  );
  if (ogImage) imageUrls.add(ogImage);

  let extras: string[] = [];

  if (isAirbnbHost(new URL(finalUrl).hostname) || isAirbnbHost(host)) {
    const niobe = extractAirbnbNiobe(html);
    extras = niobe.textParts;
    for (const img of niobe.imageUrls) imageUrls.add(img);
  }

  if (booking || isBookingHost(new URL(finalUrl).hostname)) {
    const ld = extractBookingJsonLd(html);
    if (ld.name && (!title || /bijgewerkte prijzen|updated prices/i.test(title))) {
      title = ld.name;
    }
    extras.push(...ld.textParts);
    // Only keep signed Booking CDN URLs — unsigned paths 401
    imageUrls.clear();
    if (ogImage && /[?&]k=/.test(ogImage)) imageUrls.add(ogImage);
    for (const img of extractBookingImages(html)) imageUrls.add(img);

    // Help the AI with stay dates from the URL if present
    try {
      const u = new URL(url);
      const checkin = u.searchParams.get("checkin");
      const checkout = u.searchParams.get("checkout");
      const adults = u.searchParams.get("group_adults") || u.searchParams.get("req_adults");
      if (checkin && checkout) {
        extras.unshift(`Verblijfperiode: ${checkin} tot ${checkout}`);
      }
      if (adults) extras.unshift(`Aantal volwassenen: ${adults}`);
    } catch {
      // ignore
    }
  }

  // Generic JSON-LD for other sites
  if (!booking) {
    $('script[type="application/ld+json"]').each((_, el) => {
      const raw = $(el).html();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as unknown;
        const strings = new Set<string>();
        collectStrings(parsed, strings);
        extras.push(...strings);
        const walkImages = (value: unknown) => {
          if (!value) return;
          if (typeof value === "string" && /^https?:\/\//i.test(value)) {
            if (/\.(jpe?g|png|webp)/i.test(value) || /\/im\//i.test(value)) {
              imageUrls.add(keepImageUrl(value));
            }
          } else if (Array.isArray(value)) value.forEach(walkImages);
          else if (typeof value === "object") {
            Object.values(value as Record<string, unknown>).forEach(walkImages);
          }
        };
        walkImages(parsed);
      } catch {
        // ignore
      }
    });
  }

  $("script, style, noscript, svg, iframe").remove();
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();

  $("img").each((_, el) => {
    if (booking) return; // Booking gallery already collected with signatures
    const src =
      $(el).attr("src") ||
      $(el).attr("data-src") ||
      $(el).attr("data-original") ||
      "";
    const abs = absolutize(finalUrl, src);
    if (!abs) return;
    if (!/^https?:\/\//i.test(abs)) return;
    if (abs.includes("data:")) return;
    if (/\.svg(\?|$)/i.test(abs)) return;
    if (/(logo|icon|sprite|pixel|tracking|avatar|flag)/i.test(abs)) return;
    imageUrls.add(keepImageUrl(abs));
  });

  const text = [title, description, ...extras.slice(0, 120), bodyText]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 28000);

  const usable = hasUsableListingContent({
    title,
    description,
    bodyText,
    imageUrls: Array.from(imageUrls),
    extraText: extras,
  });

  if ((looksBlocked(text) && !usable) || !usable) {
    if (booking) {
      const viaJina = await fetchViaJina(url);
      if (viaJina && viaJina.title) return viaJina;
    }
    throw new Error(
      "Geen bruikbare advertentiegegevens gevonden. Airbnb/Booking blokkeren vaak scrapers — vul handmatig in of probeer een andere link."
    );
  }

  // Prefer high-res Booking gallery photos first
  let orderedImages = Array.from(imageUrls);
  if (booking || isBookingHost(new URL(finalUrl).hostname)) {
    orderedImages = extractBookingImages(html);
    if (!orderedImages.length) {
      orderedImages = Array.from(imageUrls).filter((u) => /[?&]k=/.test(u));
    }
  }

  return {
    // Keep canonical Booking URL (with stay dates) even if the site redirects
    url: booking ? url : finalUrl,
    title,
    text,
    imageUrls: orderedImages.slice(0, 30),
  };
}
