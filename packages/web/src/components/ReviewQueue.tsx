import { useEffect, useState } from "react";
import type { Material } from "../domain/assignments/types.ts";
import { loadAnalysis } from "../domain/precompute/storage.ts";
import { dueCardIds, subscribe as subscribeSrs } from "../domain/precompute/srs.ts";
import { useSettings } from "../domain/settings/hooks.ts";
import { getFeedbackPalette } from "../domain/settings/feedback.ts";

interface Props {
  readonly materials: ReadonlyArray<Material>;
  readonly onStartReview: (materialId: string, questionIds: ReadonlyArray<string>) => void;
}

interface Row {
  readonly material: Material;
  readonly dueIds: ReadonlyArray<string>;
}

export function ReviewQueue({ materials, onStartReview }: Props) {
  const [{ cvd }] = useSettings();
  const palette = getFeedbackPalette("pass", cvd);
  const [rows, setRows] = useState<ReadonlyArray<Row>>(() => computeRows(materials));

  useEffect(() => {
    setRows(computeRows(materials));
    return subscribeSrs(() => setRows(computeRows(materials)));
  }, [materials]);

  const withDue = rows.filter((r) => r.dueIds.length > 0);
  if (withDue.length === 0) return null;

  const totalDue = withDue.reduce((sum, r) => sum + r.dueIds.length, 0);

  return (
    <section className={`grid gap-2 rounded-2xl border p-4 ${palette.border} ${palette.softBg}`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-bold text-xs uppercase tracking-widest ${palette.text}`}>
          {palette.icon} Review due · {totalDue}
        </h3>
      </div>
      <ul className="grid gap-1.5">
        {withDue.map(({ material, dueIds }) => (
          <li key={material.id}>
            <button
              type="button"
              onClick={() => onStartReview(material.id, dueIds)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-left transition hover:border-slate-500"
            >
              <span className="min-w-0 flex-1 truncate text-slate-100 text-sm">{material.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold text-xs tabular-nums ${palette.softBg} ${palette.text}`}>
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
