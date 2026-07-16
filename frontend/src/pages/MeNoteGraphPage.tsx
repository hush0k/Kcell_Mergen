import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from "react-force-graph-2d";
import { forceCollide } from "d3-force";
import { api } from "@/api/resources";
import { useNoteSelection } from "@/contexts/NoteSelectionContext";
import type { MeNoteGraphResponse } from "@/types/api";

interface GraphNode extends NodeObject {
    id: number;
    name: string;
    degree: number;
}

interface GraphLink {
    source: number;
    target: number;
}

const DEFAULT_LINK_DISTANCE = 160;
const MIN_LINK_DISTANCE = 60;

function nodeRadius(degree: number): number {
    return 6 + Math.sqrt(degree) * 3;
}

export function MeNoteGraphPage() {
    const { setSelectedFileId } = useNoteSelection();
    const navigate = useNavigate();
    const [graph, setGraph] = useState<MeNoteGraphResponse | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink> | undefined>(undefined);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [linkDistance, setLinkDistance] = useState(DEFAULT_LINK_DISTANCE);

    useEffect(() => {
        const controller = new AbortController();
        api.meNote.graph({ signal: controller.signal })
            .then(setGraph)
            .catch((err) => {
                if (err.name !== "AbortError") console.error(err);
            });
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const { width, height } = entry.contentRect;
            setDimensions({ width, height });
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const data = useMemo(() => {
        if (!graph) return { nodes: [], links: [] };
        const degreeById = new Map<number, number>();
        for (const e of graph.edges) {
            degreeById.set(e.source, (degreeById.get(e.source) ?? 0) + 1);
            degreeById.set(e.target, (degreeById.get(e.target) ?? 0) + 1);
        }
        return {
            nodes: graph.nodes.map((n) => ({
                id: n.id,
                name: n.name || "Без названия",
                degree: degreeById.get(n.id) ?? 0,
            })) as GraphNode[],
            links: graph.edges.map((e) => ({ source: e.source, target: e.target })) as GraphLink[],
        };
    }, [graph]);

    useEffect(() => {
        fgRef.current?.d3Force("link")?.distance(linkDistance);
        fgRef.current?.d3Force(
            "collide",
            forceCollide((node: GraphNode) => nodeRadius(node.degree ?? 0) * 2),
        );
        fgRef.current?.d3ReheatSimulation();
    }, [data, linkDistance]);

    return (
        <div ref={containerRef} className="w-full h-screen bg-nt-surface">
            <div className="px-6 py-4 flex items-center justify-between gap-6">
                <h1 className="text-2xl font-bold text-mg-text">Граф знаний</h1>
                <label className="flex items-center gap-3 text-sm text-mg-text-2">
                    <span>Длина связей</span>
                    <input
                        type="range"
                        min={MIN_LINK_DISTANCE}
                        max={DEFAULT_LINK_DISTANCE}
                        value={linkDistance}
                        onChange={(e) => setLinkDistance(Number(e.target.value))}
                        className="accent-mg-purple"
                    />
                </label>
            </div>
            {graph && (
                <ForceGraph2D
                    ref={fgRef}
                    graphData={data}
                    width={dimensions.width}
                    height={dimensions.height - 80}
                    nodeLabel="name"
                    nodeColor={() => "#8B5CF6"}
                    linkColor={() => "rgba(139, 92, 246, 0.4)"}
                    linkDirectionalArrowLength={4}
                    linkDirectionalArrowRelPos={1}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const rawLabel = node.name ?? "";
                        const label = rawLabel.length > 20 ? `${rawLabel.slice(0, 20)}...` : rawLabel;
                        const zoomOutFactor = Math.min(1, globalScale / 1.2);
                        const fontSize = Math.max(1, (12 / globalScale) * zoomOutFactor);
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const x = node.x ?? 0;
                        const y = node.y ?? 0;
                        const degree = node.degree ?? 0;
                        const radius = nodeRadius(degree);

                        ctx.beginPath();
                        ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
                        ctx.fillStyle = "#8B5CF6";
                        ctx.fill();

                        const labelOpacity = Math.max(0, Math.min(1, (globalScale - 0.6) / 0.35));

                        ctx.textAlign = "center";
                        ctx.textBaseline = "top";
                        ctx.fillStyle = `rgba(43, 36, 53, ${labelOpacity})`;
                        ctx.fillText(label, x, y + radius + 2);
                    }}
                    onNodeClick={(node) => {
                        setSelectedFileId(node.id as number);
                        navigate("/mergen-note");
                    }}
                />
            )}
        </div>
    );
}
