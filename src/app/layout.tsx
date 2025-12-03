import XIcon from "@/components/icons/x";
import Logo from "@/components/ui/logo";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import Link from "next/link";
import PlausibleProvider from "next-plausible";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: {
    default: "Saze AI - Free PDF Summarizer | Summarize Long PDFs in Seconds, No Sign-Up",
    template: "%s | Saze AI",
  },
  description:
        "Summarize PDFs in seconds with Saze AI. Upload a PDF to get a quick, clear, and shareable summary.",
  applicationName: "Saze AI PDF Summarizer",
  keywords: [
    "AI PDF summarizer",
    "PDF summary generator",
    "summarize PDF online",
    "free PDF summarizer",
    "research paper summarizer",
    "academic PDF summary",
    "legal PDF summarizer",
    "multilingual PDF summarizer",
    "Hindi PDF summarizer",
    "fast PDF summary",
    "no signup PDF summarizer",
    "Saze AI",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    url: "https://sazeai.com/",
    title: "Saze AI PDF Summarizer",
    description: "AI PDF summarizer that creates clear, shareable summaries in seconds.",
    images: "https://sazeai.com/og.jpg",
  },
  twitter: {
    card: "summary_large_image",
    site: "@AINotSoSmart",
    title: "Saze AI PDF Summarizer",
    description: "AI PDF summarizer that creates clear, shareable summaries in seconds.",
    images: ["https://sazeai.com/og.jpg"],
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <PlausibleProvider domain="sazeai.com" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7915372771416695"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": "https://sazeai.com/#website",
              url: "https://sazeai.com/",
              name: "Saze AI PDF Summarizer",
              description: "AI PDF summarizer that creates clear, shareable summaries in seconds.",
              inLanguage: "en",
              publisher: {
                "@type": "Organization",
                name: "Saze AI",
                url: "https://sazeai.com/",
              },
            }),
          }}
        />
      </head>
      <body
        className={`${font.variable} flex min-h-full flex-col bg-gray-100 font-[family-name:var(--font-plus-jakarta-sans)] text-gray-900 antialiased`}
      >
        <header className="py-6 text-center">
          <Link href="/" className="inline-flex justify-center">
            <Logo />
          </Link>
        </header>

        <main className="grow overflow-hidden">{children}</main>
        <Toaster />
        <footer className="mx-auto mt-14 flex w-full max-w-7xl items-center justify-between px-4 py-6 md:mt-0">
          <p className="text-xs text-gray-300 md:text-sm">
          
              @ 2025 Saze AI | All rights reserved.
         
          </p>

          <div className="flex items-center gap-2 md:gap-3">
            
            <a
              href="https://x.com/AINotSoSmart"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-gray-250 bg-white px-2 py-1.5 text-xs text-gray-300 shadow transition hover:bg-white/75 md:rounded-xl md:px-4 md:text-sm"
            >
              <XIcon className="size-3" />
              Twitter
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
