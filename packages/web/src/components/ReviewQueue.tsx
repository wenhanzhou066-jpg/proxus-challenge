import { useEffect, useState } from "react";
import type { Material } from "../domain/assignments/types.ts";
import { loadAnalysis } from "../domain/precompute/storage.ts";
import { dueCardIds, subscribe as subscribeSrs } from "../domain/precompute/srs.ts";

interface Props {
  readonly materials: ReadonlyArray<Material>;
  readonly onStartReview: (materialId: string, questionIds: ReadonlyArray<string>) => void;
}

interface Row {
  readonly material: Material;
  readonly dueIds: ReadonlyArray<string>;
}

export function ReviewQueue({ materials, onStartReview }: Props) {
  const [rows, setRows] = useState<ReadonlyArray<Row>>(() => computeRows(materials));

  useEffect(() => {
    setRows(computeRows(materials));
    return subscribeSrs(() => setRows(computeRows(materials)));
  }, [materials]);

  const withDue = rows.filter((r) => r.dueIds.length > 0);
  if (withDue.length === 0) return null;

  const totalDue = withDue.reduce((sum, r) => sum + r.dueIds.length, 0);

  return (
    <section className="grid gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-emerald-300 text-xs uppercase tracking-widest">
          Review due · {totalDue}
        </h3>
      </div>
      <ul className="grid gap-1.5">
        {withDue.map(({ material, dueIds }) => (
          <li key={material.id}>
            <button
              type="button"
              onClick={() => onStartReview(material.id, dueIds)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-emerald-400"
            >
              <span className="min-w-0 flex-1 truncate text-slate-100 text-sm">{material.name}</span>
              <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 font-semibold text-emerald-200 text-xs tabular-nums">
                {dueIds.length} due
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function computeRows(materials: ReadonlyArray<Material>): ReadonlyArray<Row> {
  return materials.map((material) => {
    const analysis = loadAnalysis(material.id);
    if (analysis === null) return { material, dueIds: [] };
    const ids = analysis.questions.map((q) => q.id);
    return { material, dueIds: dueCardIds(material.id, ids) };
  });
}
