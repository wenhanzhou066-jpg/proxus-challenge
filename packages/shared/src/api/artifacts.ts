import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";
import { Artifact, ArtifactAttempt, ArtifactListResponse, SubmitAttemptInput } from "../schemas/artifact.ts";

const ArtifactKindQuery = Schema.Struct({
  kind: Schema.optional(Schema.Union([
    Schema.Literal("note"),
    Schema.Literal("quiz"),
    Schema.Literal("test"),
    Schema.Literal("diagram")
  ]))
});

export const RenameArtifactInput = Schema.Struct({
  title: Schema.String
});
export type RenameArtifactInput = typeof RenameArtifactInput.Type;

export class ArtifactsApi extends HttpApiGroup.make("artifacts")
  .add(
    HttpApiEndpoint.get("list", "/", {
      query: ArtifactKindQuery,
      success: ArtifactListResponse
    }),
    HttpApiEndpoint.get("get", "/:id", {
      params: {
        id: Schema.String
      },
      success: Artifact
    }),
    HttpApiEndpoint.post("submit", "/:id/submit", {
      params: {
        id: Schema.String
      },
      payload: SubmitAttemptInput,
      success: ArtifactAttempt
    }),
    HttpApiEndpoint.patch("rename", "/:id", {
      params: {
        id: Schema.String
      },
      payload: RenameArtifactInput,
      success: Artifact
    }),
    HttpApiEndpoint.make("DELETE")("delete", "/:id", {
      params: {
        id: Schema.String
      },
      success: Schema.Struct({ id: Schema.String })
    })
  )
  .prefix("/artifacts")
{}
