"use client";

import { Button } from "@/components/ui/button";
import {
  Chunk,
  chunkPdf,
  generateQuickSummary,
  summarizeStream,
} from "@/lib/summarize";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { FormEvent, useState } from "react";
import "pdfjs-dist/legacy/build/pdf.worker.mjs";
import { MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HomeLandingDrop } from "@/components/HomeLandingDrop";
import SummaryContent from "@/components/ui/summary-content";
import TableOfContents from "@/components/ui/table-of-contents";
import { useEffect } from "react";

export type StatusApp = "idle" | "parsing" | "generating";

export default function Home() {
  const [status, setStatus] = useState<StatusApp>("idle");
  const [file, setFile] = useState<File>();
  const [chunks, setChunks] = useState<Chunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<
    number | "quick-summary" | null
  >(null);
  const [quickSummary, setQuickSummary] = useState<{
    title: string;
    summary: string;
  }>();
  const [showMobileContents, setShowMobileContents] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    try {
      const w = window as unknown as { adsbygoogle: unknown[] };
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch {}
  }, [status]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const language = formData.get("language");
    const token = formData.get("cf-turnstile-response");

    if (!token) {
      toast({
        variant: "destructive",
        title: "Bot check failed",
        description: "Please complete the captcha challenge.",
      });
      return;
    }

    // Verify bot token
    try {
      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!verifyRes.ok) {
        throw new Error("Verification failed");
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Bot check failed",
        description: "Please refresh and try again.",
      });
      return;
    }

    if (!file || typeof language !== "string") return;

    setStatus("parsing");

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    if (pdf.numPages > 10) {
      toast({
        variant: "destructive",
        title: "PDF too large (10 pages max)",
        description: "That PDF has too many pages. Please use a smaller PDF.",
      });
      setStatus("idle");
      return;
    }

    const localChunks = await chunkPdf(pdf);
    const totalText = localChunks.reduce(
      (acc, chunk) => acc + chunk.text.length,
      0,
    );

    if (totalText < 500) {
      toast({
        variant: "destructive",
        title: "Unable to process PDF",
        description:
          "The PDF appears to be a scanned document or contains too little text to process. Please ensure the PDF contains searchable text.",
      });
      setFile(undefined);
      setStatus("idle");
      return;
    }

    setChunks(localChunks);
    setStatus("generating");

    const summarizedChunks: Chunk[] = [];

    const writeStream = new WritableStream({
      write(chunk) {
        summarizedChunks.push(chunk);
        setChunks((chunks) => {
          return chunks.map((c) =>
            c.text === chunk.text ? { ...c, ...chunk } : c,
          );
        });
      },
    });

    const stream = await summarizeStream(localChunks, language);
    const controller = new AbortController();
    await stream.pipeTo(writeStream, { signal: controller.signal });

    const quickSummary = await generateQuickSummary(summarizedChunks, language);

    setQuickSummary(quickSummary);

    setActiveChunkIndex((activeChunkIndex) =>
      activeChunkIndex === null ? "quick-summary" : activeChunkIndex,
    );
  }

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": "https://sazeai.com/#webpage",
            url: "https://sazeai.com/",
            name: "Saze AI PDF Summarizer",
            isPartOf: { "@id": "https://sazeai.com/#website" },
            description:
              "AI PDF summarizer that creates clear, shareable summaries in seconds. Free, fast, multilingual.",
            inLanguage: "en",
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: "https://sazeai.com/og.jpg",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Saze AI PDF Summarizer",
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            url: "https://sazeai.com/",
            description:
              "AI-powered PDF summarizer supporting multiple languages and fast summaries.",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            sameAs: ["https://x.com/AINotSoSmart"],
          }),
        }}
      />
      {status === "idle" || status === "parsing" ? (
        <HomeLandingDrop
          status={status}
          file={file}
          setFile={(file) => file && setFile(file)}
          handleSubmit={handleSubmit}
        />
      ) : (
        <div className="mt-6 px-4 md:mt-10">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between rounded-lg border border-gray-250 px-4 py-2 md:px-6 md:py-3">
              <div className="inline-flex items-center gap-4">
                <p className="md:text-lg">{file?.name}</p>
              </div>
            </div>

            <div className="mt-8 rounded-lg bg-gray-200 px-4 py-2 shadow md:hidden">
              <Button
                onClick={() => setShowMobileContents(!showMobileContents)}
                className="w-full text-gray-500 hover:bg-transparent"
                variant="ghost"
              >
                <MenuIcon />
                {showMobileContents ? "Hide" : "Show"} contents
              </Button>

              {showMobileContents && (
                <div className="mt-4">
                  <TableOfContents
                    activeChunkIndex={activeChunkIndex}
                    setActiveChunkIndex={setActiveChunkIndex}
                    quickSummary={quickSummary}
                    chunks={chunks}
                  />
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-4">
              <div className="w-full grow rounded-lg bg-white p-5 text-gray-500 shadow">
                <div className="mb-4">
                  <ins
                    className="adsbygoogle"
                    style={{ display: "block" }}
                    data-ad-client="ca-pub-7915372771416695"
                    data-ad-slot="8441706260"
                    data-ad-format="auto"
                    data-full-width-responsive="true"
                  />
                </div>
                {activeChunkIndex === "quick-summary" ? (
                  <SummaryContent
                    title={quickSummary?.title}
                    summary={quickSummary?.summary}
                  />
                ) : activeChunkIndex !== null ? (
                  <SummaryContent
                    title={chunks[activeChunkIndex].title}
                    summary={chunks[activeChunkIndex].summary}
                  />
                ) : null}
              </div>

              <div className="hidden w-72 shrink-0 md:block">
                <TableOfContents
                  activeChunkIndex={activeChunkIndex}
                  setActiveChunkIndex={setActiveChunkIndex}
                  quickSummary={quickSummary}
                  chunks={chunks}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
