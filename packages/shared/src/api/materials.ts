import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import {
  MaterialAnalysis,
  MaterialAnalysisRequest,
  MaterialListResponse,
  PdfMaterial
} from "../schemas/material.ts";

export class MaterialsApi extends HttpApiGroup.make("materials")
  .add(
    HttpApiEndpoint.get("list", "/", {
      success: MaterialListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: PdfMaterial
    }),
    HttpApiEndpoint.post("precompute", "/precompute", {
      payload: MaterialAnalysisRequest,
      success: MaterialAnalysis
    })
  )
  .prefix("/materials")
{}
