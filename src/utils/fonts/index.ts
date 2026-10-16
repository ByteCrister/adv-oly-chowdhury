import {
  Plus_Jakarta_Sans,
  Cormorant_Garamond,
  Cinzel,
  JetBrains_Mono,
} from "next/font/google";

/**
 * Modern, prestigious Google Fonts configuration for Advocate Portfolio.
 * 
 * - plusJakartaSans: Modern, clean, geometric body font with supreme legibility
 * - cormorantGaramond: Elegant, authoritative editorial serif for prestigious legal headlines
 * - cinzel: Classical Roman-inspired inscription serif for crests, badges, and regal legal typography
 * - jetbrainsMono: Precise monospace for credential tags, degree codes, and chamber coordinates
 */

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

/**
 * Combined font variable classes for <html> tag
 */
export const fontVariables = `${plusJakartaSans.variable} ${cormorantGaramond.variable} ${cinzel.variable} ${jetbrainsMono.variable}`;
