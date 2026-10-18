import type { Metadata, Viewport } from "next";

/**
 * Authoritative favicon and icon metadata configuration.
 * Maps all favicon and mobile touch assets located under /public.
 */
export const CHAMBER_FAVICONS_METADATA: NonNullable<Metadata["icons"]> = {
  icon: [
    { url: "/favicon.ico", sizes: "any" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    { url: "/favicon-64x64.png", sizes: "64x64", type: "image/png" },
    { url: "/favicon-128x128.png", sizes: "128x128", type: "image/png" },
    { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
  ],
  shortcut: ["/favicon.ico"],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
  other: [
    {
      rel: "apple-touch-icon-precomposed",
      url: "/apple-touch-icon.png",
    },
  ],
};

/**
 * Web Application Manifest link.
 */
export const CHAMBER_MANIFEST_METADATA = "/site.webmanifest";

/**
 * iOS Safari Web App configuration.
 */
export const CHAMBER_APPLE_WEB_APP_METADATA: Metadata["appleWebApp"] = {
  capable: true,
  title: "Adv. Oly Chowdhury",
  statusBarStyle: "default",
};

/**
 * Microsoft Windows Tile & browserconfig metadata.
 */
export const CHAMBER_OTHER_METADATA: Metadata["other"] = {
  "msapplication-TileColor": "#060B16",
  "msapplication-TileImage": "/mstile-150x150.png",
  "msapplication-config": "/browserconfig.xml",
};

/**
 * Viewport configuration including dynamic dark/light theme color.
 */
export const CHAMBER_VIEWPORT_METADATA: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#060B16" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
};
