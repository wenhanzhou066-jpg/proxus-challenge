import { Config, Context, Data, Effect, FileSystem, Layer, Path, Redacted, Schema } from "effect";
import type { MaterialAnalysis, MaterialAnalysisRequest, PageImage } from "@proxus/shared";
import { PdfService } from "../../materials/pdf-service.ts";

/* ────────────────────────────────────────────────────────────
 * PrecomputeService — one Gemini call → MaterialAnalysis
 * Bypasses the LanguageModel abstraction because we need
 * responseSchema (structured output) + vision input.
 * ──────────────────────────────────────────────────────────── */

export class PrecomputeError extends Data.TaggedError("PrecomputeError")<{
  readonly reason: string;
}> {}

export interface PrecomputeService {
  readonly analyze: (input: MaterialAnalysisRequest) => Effect.Effect<MaterialAnalysis, PrecomputeError>;
}

export const PrecomputeService = Context.Service<PrecomputeService>(
  "@proxus/server/PrecomputeService"
);

/* ── Config ── */

const defaultModel = "gemini-2.5-flash";
const MAX_PAGES = 8;
const PAGE_DPI = 110;

const PrecomputeConfig = Effect.gen(function* () {
  const apiKey = yield* Config.redacted("GOOGLE_GENERATIVE_AI_API_KEY");
  const model = yield* Config.string("GEMINI_MODEL").pipe(
    Config.orElse(() => Config.succeed(defaultModel))
  );
  const key = Redacted.value(apiKey).trim();
  if (key.length === 0) {
    return yield* new PrecomputeError({ reason: "Missing GOOGLE_GENERATIVE_AI_API_KEY" });
  }
  return { apiKey: key, model: model.trim() || defaultModel };
}).pipe(
  Effect.catchTag("ConfigError", (cause) => new PrecomputeError({ reason: `config: ${String(cause)}` }))
);

/* ── Gemini response schema (OpenAPI-style, per Gemini spec) ── */

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    outline: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          pageStart: { type: "integer" },
          pageEnd: { type: "integer" }
        },
        required: ["title", "pageStart", "pageEnd"]
      }
    },
    glossary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string" },
          definition: { type: "string" }
        },
        required: ["term", "definition"]
      }
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          prompt: { type: "string" },
          guidingHints: { type: "array", items: { type: "string" } },
          keyPoints: { type: "array", items: { type: "string" } }
        },
        required: ["id", "prompt", "guidingHints", "keyPoints"]
      }
    },
    misconceptions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          correction: { type: "string" }
        },
        required: ["claim", "correction"]
      }
    },
    selfExplainPrompts: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["outline", "glossary", "questions", "misconceptions", "selfExplainPrompts"]
} as const;

const SYSTEM_PROMPT = `You are a study coach analyzing a student's material to power an *offline* learning session.

You will be shown page images from a PDF. Produce a structured analysis that lets a student learn *how to think* about the material — not just memorize it.

Rules:
- outline: 3–8 sections with title + accurate page ranges (use the page numbers you see).
- glossary: 8–15 key terms with concise definitions in the student's likely first language (mirror the material's language).
- questions: exactly 8 conceptual questions. Each MUST include:
  * prompt: an open-ended question that requires reasoning (avoid "what is X"; prefer "why does X matter", "how would you apply X", "when does X fail")
  * guidingHints: 2–3 progressively more revealing hints (Socratic ladder)
  * keyPoints: 3–5 short phrases (2–5 words each) that a good answer must cover — used for offline keyword grading
- misconceptions: 3–5 common wrong beliefs students hold, each with a one-sentence correction.
- selfExplainPrompts: 3–5 Feynman-style prompts ("explain X to a 12-year-old").
- Use the material's language throughout.
- Question ids: kebab-case slugs derived from the prompt topic (e.g., "when-normalization-hurts").
- Respond with valid JSON matching the required schema. No prose, no code fences.`;

/* ── Helpers ── */

const stripDataUrl = (dataUrl: string): { mimeType: string; base64: string } | null => {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (match === null || match[1] === undefined || match[2] === undefined) return null;
  return { mimeType: match[1], base64: match[2] };
};

const inlineFromPageImage = (page: PageImage) => {
  const stripped = stripDataUrl(page.data);
  return stripped === null
    ? null
    : { inlineData: { mimeType: stripped.mimeType, data: stripped.base64 } };
};

/** Pick evenly-spaced page numbers, min 1, max MAX_PAGES */
const samplePages = (total: number): ReadonlyArray<number> => {
  if (total <= MAX_PAGES) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const step = (total - 1) / (MAX_PAGES - 1);
  return Array.from({ length: MAX_PAGES }, (_, i) => Math.round(1 + i * step));
};

const GeminiEnvelope = Schema.Struct({
  candidates: Schema.optional(Schema.Array(Schema.Struct({
    content: Schema.optional(Schema.Struct({
      parts: Schema.optional(Schema.Array(Schema.Struct({
        text: Schema.optional(Schema.String)
      })))
    }))
  })))
});

/* ── Service impl ── */

const make: Effect.Effect<
  PrecomputeService,
  PrecomputeError,
  PdfService | FileSystem.FileSystem | Path.Path
> = Effect.gen(function* () {
  const config = yield* PrecomputeConfig;
  const pdf = yield* PdfService;
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;

  const analyze: PrecomputeService["analyze"] = (input) => Effect.gen(function* () {
    // 1. Decode data URL → temp file
    const stripped = stripDataUrl(input.dataUrl);
    if (stripped === null) {
      return yield* new PrecomputeError({ reason: "Invalid dataUrl (expected data:*/*;base64,...)" });
    }

    const tempDir = yield* fs.makeTempDirectory({ prefix: "proxus-precompute-" }).pipe(
      Effect.mapError((cause) => new PrecomputeError({ reason: `temp dir: ${String(cause)}` }))
    );
    const pdfPath = path.join(tempDir, input.fileName ?? "material.pdf");
    const cleanup = fs.remove(tempDir, { recursive: true, force: true }).pipe(Effect.catch(() => Effect.void));

    const work = Effect.gen(function* () {
      yield* fs.writeFile(pdfPath, base64ToBytes(stripped.base64)).pipe(
        Effect.mapError((cause) => new PrecomputeError({ reason: `write pdf: ${String(cause)}` }))
      );

      const total = yield* pdf.pageCount(pdfPath).pipe(
        Effect.mapError((cause) => new PrecomputeError({ reason: `pageCount: ${cause.reason}` }))
      );
      if (total <= 0) {
        return yield* new PrecomputeError({ reason: "PDF has no pages" });
      }

      const pageNums = samplePages(total);
      const pages = yield* Effect.all(
        pageNums.map((page) => pdf.renderPage({ path: pdfPath, page, dpi: PAGE_DPI }).pipe(
          Effect.mapError((cause) => new PrecomputeError({ reason: `renderPage ${page}: ${cause.reason}` }))
        )),
        { concurrency: 2 }
      );
      return { total, pageNums, pages };
    });

    const { total, pageNums, pages } = yield* work.pipe(Effect.ensuring(cleanup));

    // 3. Build Gemini request with inline images + responseSchema
    const imageParts = pages
      .map(inlineFromPageImage)
      .filter((part): part is NonNullable<typeof part> => part !== null);

    const body = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{
        role: "user",
        parts: [
          { text: `PDF has ${total} pages total. Below are ${pages.length} sampled pages (page numbers ${pageNums.join(", ")}). Analyze and return the JSON.` },
          ...imageParts
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.4
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    const rawJson = yield* Effect.tryPromise({
      try: async (signal) => {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Gemini ${res.status}: ${errText.slice(0, 400)}`);
        }
        return await res.json();
      },
      catch: (cause) => new PrecomputeError({ reason: cause instanceof Error ? cause.message : String(cause) })
    });

    // 4. Extract text payload → parse JSON → validate
    const envelope = yield* Effect.try({
      try: () => Schema.decodeUnknownSync(GeminiEnvelope)(rawJson),
      catch: (cause) => new PrecomputeError({ reason: `decode envelope: ${String(cause)}` })
    });

    const text = envelope.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";

    if (text.trim().length === 0) {
      return yield* new PrecomputeError({ reason: "Gemini returned no text (possibly blocked or quota exhausted)" });
    }

    const parsed = yield* Effect.try({
      try: () => JSON.parse(text) as Omit<MaterialAnalysis, "generatedAt" | "modelId">,
      catch: (cause) => new PrecomputeError({ reason: `JSON parse: ${String(cause)}` })
    });

    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
      modelId: config.model
    } satisfies MaterialAnalysis;
  });

  return { analyze };
});

export const PrecomputeServiceLive = Layer.effect(PrecomputeService)(make);

/* ── base64 helper (Node-safe) ── */
const base64ToBytes = (b64: string): Uint8Array => {
  const bin = typeof Buffer !== "undefined"
    ? Buffer.from(b64, "base64")
    : Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return bin instanceof Buffer ? new Uint8Array(bin) : bin;
};
