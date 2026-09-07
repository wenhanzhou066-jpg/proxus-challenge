import { Console, Context, Data, Effect, Layer, Ref, Schema } from "effect";
import { GeminiModel } from "../../gemini.ts";
import { AgentSession } from "../../harness/index.ts";
import { type AgentMessage } from "../../harness/message.ts";
import { makeAcademicTutorHarness } from "../../academic-tutor.ts";
import {
  Artifact,
  ArtifactAttempt,
  ArtifactNotFound,
  ArtifactRepository,
  ArtifactTypeMismatch,
  AttemptNotFound,
  type ArtifactRepositoryError,
  type CreateArtifactInput,
  type ListArtifactsInput,
  type SubmitAttemptInput,
  gradeAttempt
} from "../../../artifacts/artifact.ts";
import {
  MaterialNotFound,
  MaterialRepository,
  type MaterialPageImages,
  type PdfMaterial
} from "../../../materials/material.ts";

const EvalId = Schema.String;
const EvalCaseId = Schema.String;

const ArtifactKind = Schema.Union([
  Schema.Literal("note"),
  Schema.Literal("quiz"),
  Schema.Literal("test"),
  Schema.Literal("diagram")
]);

const CriterionStatus = Schema.Union([
  Schema.Literal("passed"),
  Schema.Literal("failed")
]);

const ArtifactAuthoringExpected = Schema.Struct({
  artifactKind: ArtifactKind,
  questionCount: Schema.optional(Schema.Number),
  minNodes: Schema.optional(Schema.Number),
  maxNodes: Schema.optional(Schema.Number),
  layout: Schema.optional(Schema.Union([
    Schema.Literal("flowchart"),
    Schema.Literal("mindmap"),
    Schema.Literal("concept-map")
  ]))
});
type ArtifactAuthoringExpected = typeof ArtifactAuthoringExpected.Type;

const MaterialPageFixture = Schema.Struct({
  page: Schema.Number,
  text: Schema.String
});
type MaterialPageFixture = typeof MaterialPageFixture.Type;

const MaterialFixture = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  fileName: Schema.String,
  uploadedAt: Schema.String,
  pages: Schema.Array(MaterialPageFixture)
});
type MaterialFixture = typeof MaterialFixture.Type;

const ArtifactAuthoringEvalCase = Schema.Struct({
  id: EvalCaseId,
  input: Schema.String,
  expected: ArtifactAuthoringExpected,
  materials: Schema.optional(Schema.Array(MaterialFixture)),
  maxSteps: Schema.optional(Schema.Number)
});
type ArtifactAuthoringEvalCase = typeof ArtifactAuthoringEvalCase.Type;

const ArtifactAuthoringEvalDataset = Schema.Struct({
  id: EvalId,
  description: Schema.String,
  cases: Schema.Array(ArtifactAuthoringEvalCase)
});
type ArtifactAuthoringEvalDataset = typeof ArtifactAuthoringEvalDataset.Type;

const CriterionResult = Schema.Struct({
  id: Schema.String,
  status: CriterionStatus,
  message: Schema.String,
  details: Schema.optional(Schema.Unknown)
});
type CriterionResult = typeof CriterionResult.Type;

const EvalCaseReport = Schema.Struct({
  evalId: Schema.String,
  caseId: Schema.String,
  status: CriterionStatus,
  output: Schema.String,
  criteria: Schema.Array(CriterionResult)
});
type EvalCaseReport = typeof EvalCaseReport.Type;

type EvalCaseContext = {
  readonly dataset: ArtifactAuthoringEvalDataset;
  readonly case: ArtifactAuthoringEvalCase;
  readonly output: string;
  readonly messages: readonly AgentMessage[];
};

type AcceptanceCriterion = {
  readonly id: string;
  readonly evaluate: (context: EvalCaseContext) => Effect.Effect<CriterionResult, never, ArtifactRepositoryTestRef>;
};

interface ArtifactRepositoryState {
  readonly artifacts: readonly Artifact[];
  readonly attempts: readonly ArtifactAttempt[];
  readonly nextArtifactId: number;
  readonly nextAttemptId: number;
}

class ArtifactRepositoryTestRef extends Context.Service<ArtifactRepositoryTestRef, Ref.Ref<ArtifactRepositoryState>>()(
  "@proxus/server/evals/ArtifactRepositoryTestRef"
) {
  static readonly layer = Layer.effect(
    ArtifactRepositoryTestRef,
    Ref.make<ArtifactRepositoryState>({
      artifacts: [],
      attempts: [],
      nextArtifactId: 1,
      nextAttemptId: 1
    })
  );
}

const InMemoryArtifactRepository = Layer.effect(
  ArtifactRepository,
  Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;

    const createArtifact = (input: CreateArtifactInput): Effect.Effect<Artifact, ArtifactRepositoryError> =>
      Ref.modify(ref, (state) => {
        const artifact = {
          ...input,
          id: `artifact-${state.nextArtifactId}`
        } as Artifact;

        return [
          artifact,
          {
            ...state,
            artifacts: [...state.artifacts, artifact],
            nextArtifactId: state.nextArtifactId + 1
          }
        ];
      });

    const saveArtifact = (artifact: Artifact): Effect.Effect<void, ArtifactRepositoryError> =>
      Ref.update(ref, (state) => ({
        ...state,
        artifacts: [...state.artifacts.filter((candidate) => candidate.id !== artifact.id), artifact]
      }));

    const getArtifact = (id: string): Effect.Effect<Artifact, ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.andThen((state) => {
          const artifact = state.artifacts.find((candidate) => candidate.id === id);
          return artifact === undefined
            ? Effect.fail(new ArtifactNotFound({ artifactId: id }))
            : Effect.succeed(artifact);
        })
      );

    const listArtifacts = (input?: ListArtifactsInput): Effect.Effect<readonly Artifact[], ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.map((state) => input?.kind === undefined
          ? state.artifacts
          : state.artifacts.filter((artifact) => artifact.kind === input.kind)
        )
      );

    const submitAttempt = (input: SubmitAttemptInput): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      getArtifact(input.artifactId).pipe(
        Effect.andThen((artifact) => {
          if (artifact.kind !== input.artifactKind) {
            return Effect.fail(new ArtifactTypeMismatch({
              artifactId: artifact.id,
              expected: input.artifactKind,
              actual: artifact.kind
            }));
          }

          return Ref.modify(ref, (state) => {
            const attempt = {
              ...input,
              id: `attempt-${state.nextAttemptId}`,
              status: "ungraded" as const
            } as ArtifactAttempt;

            return [
              attempt,
              {
                ...state,
                attempts: [...state.attempts, attempt],
                nextAttemptId: state.nextAttemptId + 1
              }
            ];
          });
        })
      );

    const saveAttempt = (attempt: ArtifactAttempt): Effect.Effect<void, ArtifactRepositoryError> =>
      Ref.update(ref, (state) => ({
        ...state,
        attempts: [...state.attempts.filter((candidate) => candidate.id !== attempt.id), attempt]
      }));

    const getAttempt = (id: string): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.andThen((state) => {
          const attempt = state.attempts.find((candidate) => candidate.id === id);
          return attempt === undefined
            ? Effect.fail(new AttemptNotFound({ attemptId: id }))
            : Effect.succeed(attempt);
        })
      );

    const listAttempts = (artifactId?: string): Effect.Effect<readonly ArtifactAttempt[], ArtifactRepositoryError> =>
      Ref.get(ref).pipe(
        Effect.map((state) => artifactId === undefined
          ? state.attempts
          : state.attempts.filter((attempt) => attempt.artifactId === artifactId)
        )
      );

    const gradeSavedAttempt = (attemptId: string): Effect.Effect<ArtifactAttempt, ArtifactRepositoryError> =>
      getAttempt(attemptId).pipe(
        Effect.andThen((attempt) => getArtifact(attempt.artifactId).pipe(
          Effect.andThen((artifact) => gradeAttempt(artifact, attempt)),
          Effect.andThen((gradedAttempt) => saveAttempt(gradedAttempt).pipe(Effect.as(gradedAttempt)))
        ))
      );

    return ArtifactRepository.of({
      createArtifact,
      saveArtifact,
      getArtifact,
      listArtifacts,
      submitAttempt,
      saveAttempt,
      getAttempt,
      listAttempts,
      gradeAttempt: gradeSavedAttempt,
      deleteArtifact: () => Effect.void
    });
  })
).pipe(Layer.provideMerge(ArtifactRepositoryTestRef.layer));

const makeMaterialRepository = (materials: readonly MaterialFixture[]) => MaterialRepository.of({
  list: () => Effect.succeed(materials.map(toPdfMaterial)),
  get: (id) => {
    const material = materials.find((candidate) => candidate.id === id);
    return material === undefined
      ? Effect.fail(new MaterialNotFound({ materialId: id }))
      : Effect.succeed(toPdfMaterial(material));
  },
  renderPages: (id, pages) => {
    const material = materials.find((candidate) => candidate.id === id);
    if (material === undefined) {
      return Effect.fail(new MaterialNotFound({ materialId: id }));
    }

    const renderedPages = pages.map((page) => {
      const fixturePage = material.pages.find((candidate) => candidate.page === page);
      return {
        page,
        mediaType: "image/png" as const,
        data: `data:image/png;base64,${btoa(fixturePage?.text ?? `Page ${page}`)}`
      };
    });

    return Effect.succeed<MaterialPageImages>({
      type: "material-page-images",
      material: toPdfMaterial(material),
      pages: renderedPages
    });
  }
});

const toPdfMaterial = (material: MaterialFixture): PdfMaterial => ({
  id: material.id,
  title: material.title,
  fileName: material.fileName,
  pageCount: material.pages.length,
  uploadedAt: material.uploadedAt
});

const makeEvalLayer = (testCase: ArtifactAuthoringEvalCase) => Layer.mergeAll(
  InMemoryArtifactRepository,
  Layer.succeed(MaterialRepository, makeMaterialRepository(testCase.materials ?? [])),
  GeminiModel
);

const shouldCreateExpectedArtifact = (): AcceptanceCriterion => ({
  id: "should-create-expected-artifact",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    const expected = context.case.expected;

    if (artifact === undefined) {
      return failed("should-create-expected-artifact", "Expected an artifact to be created.", { artifacts: state.artifacts });
    }

    if (artifact.kind !== expected.artifactKind) {
      return failed("should-create-expected-artifact", `Expected ${expected.artifactKind}, got ${artifact.kind}.`, artifact);
    }

    if (expected.questionCount !== undefined) {
      if (artifact.kind === "note" || artifact.kind === "diagram") {
        return failed("should-create-expected-artifact", `Expected questionCount but created a ${artifact.kind}.`, artifact);
      }

      if (artifact.questions.length !== expected.questionCount) {
        return failed(
          "should-create-expected-artifact",
          `Expected ${expected.questionCount} questions, got ${artifact.questions.length}.`,
          artifact
        );
      }
    }

    if (artifact.kind === "diagram") {
      if (expected.minNodes !== undefined && artifact.nodes.length < expected.minNodes) {
        return failed(
          "should-create-expected-artifact",
          `Expected at least ${expected.minNodes} nodes, got ${artifact.nodes.length}.`,
          artifact
        );
      }
      if (expected.maxNodes !== undefined && artifact.nodes.length > expected.maxNodes) {
        return failed(
          "should-create-expected-artifact",
          `Expected at most ${expected.maxNodes} nodes, got ${artifact.nodes.length}.`,
          artifact
        );
      }
      if (expected.layout !== undefined && artifact.layout !== expected.layout) {
        return failed(
          "should-create-expected-artifact",
          `Expected layout ${expected.layout}, got ${artifact.layout}.`,
          artifact
        );
      }
    }

    return passed("should-create-expected-artifact", `Created expected ${artifact.kind} artifact ${artifact.id}.`, artifact);
  })
});

const shouldHaveExactlyOneDiagramRoot = (): AcceptanceCriterion => ({
  id: "diagram-should-have-exactly-one-root",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    if (artifact === undefined || artifact.kind !== "diagram") {
      return passed("diagram-should-have-exactly-one-root", "Not a diagram — skipped.");
    }
    const inDegree = new Map<string, number>();
    for (const n of artifact.nodes) inDegree.set(n.id, 0);
    for (const e of artifact.edges) inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    const roots = artifact.nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
    return roots.length === 1
      ? passed("diagram-should-have-exactly-one-root", `1 root: ${roots[0]!.label}.`)
      : failed(
          "diagram-should-have-exactly-one-root",
          `Expected exactly 1 root node (no incoming edges), got ${roots.length}.`,
          { roots: roots.map((r) => r.label) }
        );
  })
});

const shouldHaveNoCycles = (): AcceptanceCriterion => ({
  id: "diagram-should-have-no-cycles",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    if (artifact === undefined || artifact.kind !== "diagram") {
      return passed("diagram-should-have-no-cycles", "Not a diagram — skipped.");
    }
    const adj = new Map<string, string[]>();
    for (const n of artifact.nodes) adj.set(n.id, []);
    for (const e of artifact.edges) adj.get(e.source)?.push(e.target);
    const WHITE = 0, GRAY = 1, BLACK = 2;
    const color = new Map<string, number>();
    for (const n of artifact.nodes) color.set(n.id, WHITE);
    const hasCycle = (node: string): boolean => {
      color.set(node, GRAY);
      for (const next of adj.get(node) ?? []) {
        const c = color.get(next);
        if (c === GRAY) return true;
        if (c === WHITE && hasCycle(next)) return true;
      }
      color.set(node, BLACK);
      return false;
    };
    for (const n of artifact.nodes) {
      if (color.get(n.id) === WHITE && hasCycle(n.id)) {
        return failed("diagram-should-have-no-cycles", "Cycle detected in diagram.", { edges: artifact.edges });
      }
    }
    return passed("diagram-should-have-no-cycles", "No cycles found.");
  })
});

const shouldLabelAllDiagramEdges = (): AcceptanceCriterion => ({
  id: "diagram-should-label-all-edges",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    if (artifact === undefined || artifact.kind !== "diagram") {
      return passed("diagram-should-label-all-edges", "Not a diagram — skipped.");
    }
    const unlabeled = artifact.edges.filter((e) => e.label === undefined || e.label.trim().length === 0);
    return unlabeled.length === 0
      ? passed("diagram-should-label-all-edges", `All ${artifact.edges.length} edges labeled.`)
      : failed(
          "diagram-should-label-all-edges",
          `${unlabeled.length}/${artifact.edges.length} edges missing labels.`,
          { unlabeled }
        );
  })
});

const shouldReferenceExistingNodes = (): AcceptanceCriterion => ({
  id: "diagram-edges-reference-existing-nodes",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);
    if (artifact === undefined || artifact.kind !== "diagram") {
      return passed("diagram-edges-reference-existing-nodes", "Not a diagram — skipped.");
    }
    const ids = new Set(artifact.nodes.map((n) => n.id));
    const broken = artifact.edges.filter((e) => !ids.has(e.source) || !ids.has(e.target));
    return broken.length === 0
      ? passed("diagram-edges-reference-existing-nodes", "All edges reference existing nodes.")
      : failed(
          "diagram-edges-reference-existing-nodes",
          `${broken.length} edges reference missing nodes.`,
          { broken }
        );
  })
});

const shouldMentionCreatedArtifact = (): AcceptanceCriterion => ({
  id: "should-mention-created-artifact",
  evaluate: (context) => Effect.gen(function* () {
    const ref = yield* ArtifactRepositoryTestRef;
    const state = yield* Ref.get(ref);
    const artifact = state.artifacts.at(-1);

    if (artifact === undefined) {
      return failed("should-mention-created-artifact", "No artifact was created, so the final answer cannot mention it.");
    }

    const output = context.output.toLocaleLowerCase();
    const mentionsId = output.includes(artifact.id.toLocaleLowerCase());
    const mentionsCreation = /cread|created|he creado|i created|artifact|artefact/.test(output);

    return mentionsId || mentionsCreation
      ? passed("should-mention-created-artifact", "Final answer mentions the created artifact.")
      : failed("should-mention-created-artifact", "Final answer did not mention the created artifact.", { output: context.output, artifact });
  })
});

const shouldNotHaveToolFailures = (): AcceptanceCriterion => ({
  id: "should-not-have-tool-failures",
  evaluate: (context) => {
    const failures = context.messages.filter((message) => message.role === "tool-result" && message.isFailure);
    return Effect.succeed(failures.length === 0
      ? passed("should-not-have-tool-failures", "No tool failures were produced.")
      : failed("should-not-have-tool-failures", "Expected no tool failures.", failures)
    );
  }
});

const passed = (id: string, message: string, details?: unknown): CriterionResult =>
  CriterionResult.make({ id, status: "passed", message, details });

const failed = (id: string, message: string, details?: unknown): CriterionResult =>
  CriterionResult.make({ id, status: "failed", message, details });

const dataset = ArtifactAuthoringEvalDataset.make({
  id: "academic-tutor.artifact-authoring",
  description: "The tutor creates valid note, quiz, and test artifacts when the user asks for academic practice material.",
  cases: [
    {
      id: "creates-note",
      input: "Crea una nota breve sobre la regla de la potencia. Usa el comando artifacts create para persistirla. Mantén el markdown en una sola frase simple, sin fórmulas LaTeX, sin comillas y sin saltos de línea.",
      expected: { artifactKind: "note" },
      maxSteps: 8
    },
    {
      id: "creates-quiz",
      input: "Crea un quiz de 3 preguntas sobre derivadas. Usa preguntas true-false o multiple-choice y persiste el quiz con artifacts create.",
      expected: { artifactKind: "quiz", questionCount: 3 },
      maxSteps: 8
    },
    {
      id: "creates-test",
      input: "Crea un test de 2 preguntas sobre límites. Persiste el test con artifacts create.",
      expected: { artifactKind: "test", questionCount: 2 },
      maxSteps: 8
    },
    {
      id: "esquema-routes-to-diagram",
      input: "Hazme un esquema con los conceptos principales de la programación orientada a objetos: clase, objeto, herencia, encapsulación y polimorfismo. Persístelo con artifacts create.",
      expected: { artifactKind: "diagram", minNodes: 4, maxNodes: 12 },
      maxSteps: 8
    },
    {
      id: "mapa-mental-routes-to-mindmap",
      input: "Crea un mapa mental de las estructuras de datos básicas: arrays, listas, pilas, colas y árboles. Persístelo con artifacts create.",
      expected: { artifactKind: "diagram", minNodes: 4, maxNodes: 12, layout: "mindmap" },
      maxSteps: 8
    },
    {
      id: "diagrama-flujo-routes-to-flowchart",
      input: "Crea un diagrama de flujo del ciclo de vida de una petición HTTP: DNS, TCP, TLS, HTTP request, HTTP response. Persístelo con artifacts create y usa layout flowchart.",
      expected: { artifactKind: "diagram", minNodes: 4, maxNodes: 10, layout: "flowchart" },
      maxSteps: 8
    },
    {
      id: "resumen-does-not-route-to-diagram",
      input: "Hazme un resumen corto en markdown sobre la regla de la cadena en cálculo. Persístelo con artifacts create.",
      expected: { artifactKind: "note" },
      maxSteps: 8
    }
  ]
});

const criteria = [
  shouldCreateExpectedArtifact(),
  shouldMentionCreatedArtifact(),
  shouldNotHaveToolFailures(),
  shouldHaveExactlyOneDiagramRoot(),
  shouldHaveNoCycles(),
  shouldLabelAllDiagramEdges(),
  shouldReferenceExistingNodes()
] as const;

const runEvalCase = (
  evalDataset: ArtifactAuthoringEvalDataset,
  testCase: ArtifactAuthoringEvalCase
) => Effect.gen(function* () {
  const materialRepository = yield* MaterialRepository;
  const artifactRepository = yield* ArtifactRepository;
  const harness = makeAcademicTutorHarness(materialRepository, artifactRepository);
  const session = AgentSession.make(harness);
  const result = yield* session.run({
    input: testCase.input,
    maxSteps: testCase.maxSteps ?? 8
  }).pipe(Effect.provide(harness.layer));

  const context: EvalCaseContext = {
    dataset: evalDataset,
    case: testCase,
    output: result.output,
    messages: result.messages
  };

  const criterionResults = yield* Effect.all(
    criteria.map((criterion) => criterion.evaluate(context)),
    { concurrency: 1 }
  );
  const status = criterionResults.every((criterion) => criterion.status === "passed") ? "passed" : "failed";

  return EvalCaseReport.make({
    evalId: evalDataset.id,
    caseId: testCase.id,
    status,
    output: result.output,
    criteria: criterionResults
  });
});

const runDataset = (evalDataset: ArtifactAuthoringEvalDataset) => Effect.gen(function* () {
  const reports: EvalCaseReport[] = [];

  for (const testCase of evalDataset.cases) {
    const report = yield* runEvalCase(evalDataset, testCase).pipe(
      Effect.provide(makeEvalLayer(testCase))
    );
    reports.push(report);
  }

  return reports;
});

const formatReport = (reports: readonly EvalCaseReport[]) => {
  const lines: string[] = [dataset.id];

  for (const report of reports) {
    lines.push(`  ${report.status === "passed" ? "✓" : "✗"} ${report.caseId}`);
    for (const criterion of report.criteria) {
      lines.push(`    ${criterion.status === "passed" ? "✓" : "✗"} ${criterion.id}: ${criterion.message}`);
      if (criterion.status === "failed" && criterion.details !== undefined) {
        lines.push(`      ${JSON.stringify(criterion.details, null, 2).split("\n").join("\n      ")}`);
      }
    }
  }

  return lines.join("\n");
};

class ArtifactAuthoringEvalFailed extends Data.TaggedError("ArtifactAuthoringEvalFailed")<{}> {}

export const artifactAuthoringEval = runDataset(dataset).pipe(
  Effect.tap((reports) => Console.log(formatReport(reports))),
  Effect.andThen((reports) => reports.some((report) => report.status === "failed")
    ? Effect.fail(new ArtifactAuthoringEvalFailed())
    : Effect.succeed(reports)
  )
);

if (import.meta.main) {
  Effect.runPromise(artifactAuthoringEval);
}
