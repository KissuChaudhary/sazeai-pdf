import { fal } from "@/lib/ai";
import { normalizeIp, verifyToken } from "@/lib/auth";
import { dailyRateLimiter, burstRateLimiter } from "@/lib/redis";
import dedent from "dedent";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(100000),
  language: z.string().min(1).max(50),
  human_token: z.string().optional(),
});

export async function POST(req: Request) {
  // Robust IP detection
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");

  // 1. Try x-forwarded-for (standard for proxies/load balancers)
  // It can be a comma-separated list: "client, proxy1, proxy2" -> take the first one
  let ip = cfIp?.trim() || forwardedFor?.split(",")[0]?.trim();

  // 2. Fallback to x-real-ip (sometimes used by Nginx/proxies)
  if (!ip && realIp) {
    ip = realIp.trim();
  }

  // 3. Final fallback to localhost
  if (!ip) {
    ip = "127.0.0.1";
  }

  ip = normalizeIp(ip);

  if (dailyRateLimiter || burstRateLimiter) {
    if (burstRateLimiter) {
      const b = await burstRateLimiter.limit(ip);
      if (!b.success) {
        return Response.json(
          { error: "Too many requests. Please slow down and try again." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit-PerMin": b.limit.toString(),
              "X-RateLimit-Remaining-PerMin": b.remaining.toString(),
              "X-RateLimit-Reset-PerMin": b.reset.toString(),
            },
          }
        );
      }
    }

    if (dailyRateLimiter) {
      const d = await dailyRateLimiter.limit(ip);
      if (!d.success) {
        return Response.json(
          { error: "Daily rate limit exceeded. Please try again tomorrow." },
          {
            status: 429,
            headers: {
              "X-RateLimit-Limit": d.limit.toString(),
              "X-RateLimit-Remaining": d.remaining.toString(),
              "X-RateLimit-Reset": d.reset.toString(),
            },
          }
        );
      }
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = InputSchema.safeParse(body);

  if (!parseResult.success) {
    return Response.json(
      { error: "Invalid input: " + parseResult.error.message },
      { status: 400 }
    );
  }

  const { text, language, human_token: bodyToken } = parseResult.data;

  const cookieHeader = req.headers.get("cookie") || "";
  const humanCookie = cookieHeader
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("human_token="));
  const humanToken = humanCookie?.split("=")[1];
  const headerToken = req.headers.get("x-human-token") || undefined;
  
  // Debug logging
  console.log("Token verification debug:", {
    hasCookieToken: !!humanToken,
    hasHeaderToken: !!headerToken,
    hasBodyToken: !!bodyToken,
    cookieTokenLength: humanToken?.length,
    headerTokenLength: headerToken?.length,
    bodyTokenLength: bodyToken?.length,
    cookieHeader: cookieHeader.substring(0, 100) + (cookieHeader.length > 100 ? "..." : ""),
  });
  
  const isHumanCookie = await verifyToken(humanToken);
  const isHumanHeader = await verifyToken(headerToken);
  const isHumanBody = await verifyToken(bodyToken);
  const isHuman = isHumanCookie || isHumanHeader || isHumanBody;
  if (!isHuman) {
    return Response.json(
      { error: "Bot check required. Please complete verification." },
      { status: 403 }
    );
  }

  const systemPrompt = dedent`
    You are an expert at summarizing text.

    Your task:
    1. Read the document excerpt I will provide
    2. Create a concise summary in ${language}
    3. Generate a short, descriptive title in ${language}

    Guidelines for the summary:
    - Format the summary in HTML
    - Use <p> tags for paragraphs (2-3 sentences each)
    - Use <ul> and <li> tags for bullet points
    - Use <h3> tags for subheadings when needed but don't repeat the initial title in the first paragraph
    - Ensure proper spacing with appropriate HTML tags

    The summary should be well-structured and easy to scan, while maintaining accuracy and completeness.
    Please analyze the text thoroughly before starting the summary.

    IMPORTANT: Output ONLY a valid JSON object with the following structure, and nothing else. Do not include markdown formatting like \`\`\`json.
    {
      "title": "The title of the summary",
      "summary": "The HTML content of the summary"
    }
  `;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await fal.subscribe("openrouter/router", {
      input: {
        prompt: text,
        model: "openai/gpt-oss-20b",
        system_prompt: systemPrompt,
        temperature: 1,
        reasoning: true,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log("Fal result:", result);

    let jsonString = "";
    const output = result.data;

    if (typeof output === "string") {
      jsonString = output;
    } else if (output && typeof output === "object") {
      // Try to find the text content in likely places
      if (output.completion) {
        jsonString = output.completion;
      } else if (output.output) {
        // Fal AI sometimes returns { output: "..." }
        jsonString = output.output;
      } else if (output.text) {
        jsonString = output.text;
      } else if (output.choices && output.choices[0]?.message?.content) {
        jsonString = output.choices[0].message.content;
      } else {
        // Fallback: assume the object itself might be the result (unlikely for this endpoint but possible)
        jsonString = JSON.stringify(output);
      }
    }

    // Clean up markdown code blocks if present
    jsonString = jsonString.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    // Remove any trailing newlines or whitespace
    jsonString = jsonString.trim();

    let content;
    try {
      content = JSON.parse(jsonString);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      console.log("Raw output:", jsonString);
      // Attempt to recover if it's just a string (maybe the model failed to JSONify)
      return Response.json(
        { error: "Failed to generate valid JSON summary" },
        { status: 500 }
      );
    }

    // Validate with Zod
    const summarySchema = z.object({
      title: z.string(),
      summary: z.string(),
    });

    const parsedContent = summarySchema.safeParse(content);

    if (!parsedContent.success) {
      console.error("Schema validation failed:", parsedContent.error);
      return Response.json(
        { error: "Generated content does not match schema" },
        { status: 500 }
      );
    }

    return Response.json(parsedContent.data);
  } catch (error) {
    console.error("Fal AI error:", error);
    return Response.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}

export const runtime = "edge";
