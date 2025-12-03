import { PDFDocumentProxy } from "pdfjs-dist";
import assert from "assert";

export type Chunk = {
  text: string;
  summary?: string;
  title?: string;
};

export async function getPdfText(pdf: PDFDocumentProxy) {
  const numPages = pdf.numPages;
  let fullText = "";

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    let lastY = null;
    let pageText = "";

    // Process each text item
    for (const item of textContent.items) {
      if ("str" in item) {
        // Check for new line based on Y position
        if (lastY !== null && lastY !== item.transform[5]) {
          pageText += "\n";

          // Add extra line break if there's significant vertical space
          if (lastY - item.transform[5] > 12) {
            // Adjust this threshold as needed
            pageText += "\n";
          }
        }

        pageText += item.str;
        lastY = item.transform[5];
      }
    }

    fullText += pageText + "\n\n"; // Add double newline between pages
  }

  return fullText;
}

export async function chunkPdf(pdf: PDFDocumentProxy) {
  // const chunkCharSize = 6000; // 100k
  // const chunkCharSize = 100_000;
  const maxChunkSize = 50_000;
  // ideally have at least 4 chunks
  // chunk size = total chars / 4 OR 100k, whichever is smaller

  const fullText = await getPdfText(pdf);

  const chunks: Chunk[] = [];
  const chunkCharSize = Math.min(maxChunkSize, Math.ceil(fullText.length / 4));

  for (let i = 0; i < fullText.length; i += chunkCharSize) {
    const text = fullText.slice(i, i + chunkCharSize);
    chunks.push({ text });
  }

  return chunks;
}

export async function summarizeStream(chunks: Chunk[], language: string) {
  let reading = true;
  const stream = new ReadableStream({
    async start(controller) {
      const humanToken = typeof window !== "undefined"
        ? localStorage.getItem("human_token") || ""
        : "";
      const promises = chunks.map(async (chunk) => {
        const text = chunk.text;
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(humanToken ? { "x-human-token": humanToken } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ text, language }),
        });
        let data;
        try {
          data = await response.json();
          if (reading) {
            controller.enqueue({
              ...chunk,
              summary: data.summary,
              title: data.title,
            });
          }
        } catch (e) {
          console.log(e);
        }
      });

      await Promise.all(promises);
      controller.close();
    },

    cancel() {
      console.log("read stream canceled");
      reading = false;
    },
  });

  return stream;
}

export async function generateQuickSummary(chunks: Chunk[], language: string) {
  const allSummaries = chunks
    .map((chunk) => chunk.summary)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join("\n\n");

  const humanToken = typeof window !== "undefined"
    ? localStorage.getItem("human_token") || ""
    : "";
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(humanToken ? { "x-human-token": humanToken } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ text: allSummaries, language }),
  });

  if (!response.ok) {
    return {
      title: "Error generating summary",
      summary: "<p>Request failed. Please complete bot check and try again.</p>",
    };
  }

  const { title, summary } = await response.json();

  // The server might return an error if rate limited or bot blocked
  if (!title || !summary) {
    console.error("Failed to generate summary:", title, summary);
    // Return a fallback to avoid crashing
    return {
      title: "Error generating summary",
      summary: "<p>Could not generate summary. Please try again.</p>",
    };
  }

  console.log("title", title);
  assert.ok(typeof title === "string");
  assert.ok(typeof summary === "string");

  return { title, summary };
}
