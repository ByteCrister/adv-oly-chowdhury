import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/shared/toaster";
import { fontVariables } from "@/utils/fonts";

export const metadata: Metadata = {
  metadataBase: new URL("https://advocateaico.com"),
  title:
    "Advocate Aminul Islam Chowdhury Oly | Judge's Court, Sylhet",
  description:
    "Advocate Aminul Islam Chowdhury Oly (LL.M, LL.B, M.S.S, B.S.S). Enrolled Advocate at Judge's Court, Sylhet. Member of Sylhet District Bar Association, Sylhet District Taxes Bar Association, and International Bar Association.",
  keywords: [
    "Advocate Aminul Islam Chowdhury Oly",
    "Advocate Oly Chowdhury",
    "Lawyer Sylhet",
    "Advocate Judge's Court Sylhet",
    "Sylhet District Bar Association",
    "Sylhet Taxes Bar Association",
    "Taxation Lawyer Sylhet",
    "Civil Litigation Sylhet",
    "Criminal Lawyer Sylhet",
  ],
  authors: [{ name: "Advocate Aminul Islam Chowdhury Oly" }],
  openGraph: {
    title: "Advocate Aminul Islam Chowdhury Oly | Legal Counsel & Advocate",
    description:
      "Advocate (LL.M, LL.B, M.S.S, B.S.S) practicing at Judge's Court, Sylhet. Specialist in civil litigation, criminal defense, and taxation law.",
    images: [
      {
        url: "/images/profile/Polished Corporate Headshot.png",
        width: 800,
        height: 800,
        alt: "Advocate Aminul Islam Chowdhury Oly",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${fontVariables} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function updateTheme() {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                  updateTheme();
                  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateTheme);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
