import type { Artifact } from "@proxus/shared";
import { useCallback, useMemo, useState } from "react";
import Dagre from "@dagrejs/dagre";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeMouseHandler
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Diagram = Extract<Artifact, { readonly kind: "diagram" }>;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 56;

function layoutHierarchical(
  nodes: Diagram["nodes"],
  edges: Diagram["edges"],
  direction: "TB" | "LR"
): { positions: Record<string, { x: number; y: number }>; ranks: Record<string, number> } {
  const g = new Dagre.graphlib.Graph({ compound: false }).setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    ranksep: 140,
    nodesep: 90,
    edgesep: 40,
    marginx: 24,
    marginy: 24
  });

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target)) {
      g.setEdge(e.source, e.target);
    }
  }

  Dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  const ranks: Record<string, number> = {};
  for (const n of nodes) {
    const node = g.node(n.id);
    if (node !== undefined) {
      positions[n.id] = { x: node.x - NODE_WIDTH / 2, y: node.y - NODE_HEIGHT / 2 };
      ranks[n.id] = (direction === "TB" ? node.y : node.x);
    }
  }
  return { positions, ranks };
}

function classifyNodes(nodes: Diagram["nodes"], edges: Diagram["edges"]) {
  const outDegree = new Map<string, number>();
  const inDegree = new Map<string, number>();
  for (const n of nodes) {
    outDegree.set(n.id, 0);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }
  return { outDegree, inDegree };
}

type Tier = "root" | "category" | "leaf";

function pickTier(id: string, inDegree: Map<string, number>, outDegree: Map<string, number>): Tier {
  if ((inDegree.get(id) ?? 0) === 0) return "root";
  if ((outDegree.get(id) ?? 0) === 0) return "leaf";
  return "category";
}

const TIER_STYLES: Record<Tier, {
  background: string;
  border: string;
  color: string;
  fontSize: number;
  fontWeight: number;
  padding: string;
  boxShadow: string;
  borderRadius: number;
}> = {
  root: {
    background: "linear-gradient(135deg, rgba(121,62,249,0.9), rgba(153,0,161,0.85))",
    border: "1px solid #9A66FF",
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: 700,
    padding: "12px 18px",
    boxShadow: "0 0 32px rgba(121,62,249,0.5)",
    borderRadius: 14
  },
  category: {
    background: "rgba(30,27,46,0.95)",
    border: "1.5px solid #6A2FE3",
    color: "#ECEBFF",
    fontSize: 13,
    fontWeight: 600,
    padding: "10px 14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
    borderRadius: 10
  },
  leaf: {
    background: "rgba(11,11,17,0.9)",
    border: "1px solid #2A2640",
    color: "#C7CBD6",
    fontSize: 12,
    fontWeight: 500,
    padding: "8px 12px",
    boxShadow: "none",
    borderRadius: 8
  }
};

function selectedStyle() {
  return {
    boxShadow: "0 0 0 2px #72DAF7, 0 0 24px rgba(114,218,247,0.5)"
  } as const;
}

export function DiagramViewer({ artifact }: { readonly artifact: Diagram }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const direction: "TB" | "LR" = artifact.layout === "mindmap" ? "LR" : "TB";

  const { positions } = useMemo(
    () => layoutHierarchical(artifact.nodes, artifact.edges, direction),
    [artifact.nodes, artifact.edges, direction]
  );

  const { inDegree, outDegree } = useMemo(
    () => classifyNodes(artifact.nodes, artifact.edges),
    [artifact.nodes, artifact.edges]
  );

  const nodes: Node[] = useMemo(
    () =>
      artifact.nodes.map((n) => {
        const tier = pickTier(n.id, inDegree, outDegree);
        const base = TIER_STYLES[tier];
        const isSelected = selectedNodeId === n.id;
        return {
          id: n.id,
          position: positions[n.id] ?? { x: 0, y: 0 },
          data: { label: n.label },
          sourcePosition: direction === "TB" ? Position.Bottom : Position.Right,
          targetPosition: direction === "TB" ? Position.Top : Position.Left,
          style: {
            ...base,
            width: NODE_WIDTH,
            textAlign: "center" as const,
            ...(isSelected ? selectedStyle() : {})
          }
        };
      }),
    [artifact.nodes, positions, direction, inDegree, outDegree, selectedNodeId]
  );

  const edges: Edge[] = useMemo(
    () =>
      artifact.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: "#9A66FF", width: 18, height: 18 },
        style: { stroke: "#6A2FE3", strokeWidth: 1.8 },
        labelStyle: { fill: "#ECEBFF", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "#14121F", fillOpacity: 1, stroke: "#2A2640", strokeWidth: 1 },
        labelBgPadding: [10, 6] as [number, number],
        labelBgBorderRadius: 6,
        labelShowBg: true
      })),
    [artifact.edges]
  );

  const onNodeClick = useCallback<NodeMouseHandler>((_, node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const selected = selectedNodeId !== null
    ? artifact.nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  return (
    <article className="mx-auto flex h-[calc(100vh-140px)] max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/30">
      <header className="border-slate-800 border-b p-6">
        <p className="mb-2 font-bold text-emerald-300 text-xs uppercase tracking-widest">
          Diagrama · {artifact.layout} · {direction === "TB" ? "vertical" : "horizontal"}
        </p>
        <h2 className="font-bold text-3xl text-slate-100">{artifact.title}</h2>
        <p className="mt-1 text-slate-400 text-sm">
          {artifact.nodes.length} conceptos · {artifact.edges.length} relaciones · haz clic en un nodo para ver detalle
        </p>
      </header>

      <div className="relative flex-1">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
            colorMode="dark"
            defaultEdgeOptions={{ type: "smoothstep" }}
            nodesDraggable
            nodesConnectable={false}
            elementsSelectable
          >
            <Background color="#2A2640" gap={28} />
            <Controls className="!bg-slate-900 !border-slate-700" showInteractive={false} />
            <MiniMap
              className="!bg-slate-900 !border-slate-700"
              nodeColor={(n) => (n.id === selectedNodeId ? "#72DAF7" : "#793EF9")}
              maskColor="rgba(4,2,18,0.7)"
              pannable
              zoomable
            />
          </ReactFlow>
        </ReactFlowProvider>

        {selected !== null && (
          <aside className="absolute top-4 right-4 z-10 w-72 rounded-2xl border border-slate-700 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold text-emerald-300 text-xs uppercase tracking-widest">Concepto</p>
              <button
                type="button"
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-500 text-xs hover:text-slate-300"
                aria-label="Cerrar"
              >
                Cerrar
              </button>
            </div>
            <h3 className="font-bold text-lg text-slate-100">{selected.label}</h3>
            <p className="mt-2 text-slate-300 text-sm leading-relaxed">
              {selected.concept !== undefined && selected.concept.length > 0
                ? selected.concept
                : "Sin descripción. Pídele al tutor que explique este nodo."}
            </p>
          </aside>
        )}
      </div>
    </article>
  );
}
