import { Schema } from "effect";

export const PdfMaterial = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  fileName: Schema.String,
  pageCount: Schema.Number,
  uploadedAt: Schema.String
});
export type PdfMaterial = typeof PdfMaterial.Type;

export const PageImage = Schema.Struct({
  page: Schema.Number,
  mediaType: Schema.Literal("image/png"),
  data: Schema.String
});
export type PageImage = typeof PageImage.Type;

export const MaterialPageImages = Schema.Struct({
  type: Schema.Literal("material-page-images"),
  material: PdfMaterial,
  pages: Schema.Array(PageImage)
});
export type MaterialPageImages = typeof MaterialPageImages.Type;

export const MaterialListResponse = Schema.Struct({
  materials: Schema.Array(PdfMaterial)
});
export type MaterialListResponse = typeof MaterialListResponse.Type;

/* ── Material precompute (offline study scaffolding source) ── */

export const OutlineSection = Schema.Struct({
  title: Schema.String,
  pageStart: Schema.Number,
  pageEnd: Schema.Number
});
export type OutlineSection = typeof OutlineSection.Type;

export const GlossaryTerm = Schema.Struct({
  term: Schema.String,
  definition: Schema.String
});
export type GlossaryTerm = typeof GlossaryTerm.Type;

export const ConceptualQuestion = Schema.Struct({
  id: Schema.String,
  prompt: Schema.String,
  guidingHints: Schema.Array(Schema.String),
  keyPoints: Schema.Array(Schema.String)
});
export type ConceptualQuestion = typeof ConceptualQuestion.Type;

export const Misconception = Schema.Struct({
  claim: Schema.String,
  correction: Schema.String
});
export type Misconception = typeof Misconception.Type;

export const MaterialAnalysis = Schema.Struct({
  outline: Schema.Array(OutlineSection),
  glossary: Schema.Array(GlossaryTerm),
  questions: Schema.Array(ConceptualQuestion),
  misconceptions: Schema.Array(Misconception),
  selfExplainPrompts: Schema.Array(Schema.String),
  generatedAt: Schema.String,
  modelId: Schema.String
});
export type MaterialAnalysis = typeof MaterialAnalysis.Type;

export const MaterialAnalysisRequest = Schema.Struct({
  dataUrl: Schema.String,
  fileName: Schema.optional(Schema.String)
});
export type MaterialAnalysisRequest = typeof MaterialAnalysisRequest.Type;
