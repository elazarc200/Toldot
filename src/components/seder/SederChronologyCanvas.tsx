"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  SederHistoricalPlacementBandDto,
  SederHistoricalPlacementEdgeDto,
  SederHistoricalPlacementNodeDto,
  SederRenderLayoutDto,
} from "@/domain/visualization";
import {
  getSederVisualTokens,
  type SederVisualVariant,
} from "@/lib/seder-visual-tokens";

export type SederChronologyCanvasProps = {
  bands: SederHistoricalPlacementBandDto[];
  nodes: SederHistoricalPlacementNodeDto[];
  edges: SederHistoricalPlacementEdgeDto[];
  renderLayout: SederRenderLayoutDto[];
  selectedPersonId: string | null;
  focusPersonId?: string | null;
  visualVariant?: SederVisualVariant;
  /** Edge families currently visible. */
  visibleFamilies: Set<string>;
  showDisputed: boolean;
  showUncertain: boolean;
  onSelectPerson: (personId: string | null) => void;
  className?: string;
};

type Camera = { x: number; y: number; scale: number };

const LANE_W = 88;
const MARGIN_X = 120;
const MARGIN_Y = 40;
const WORLD_H = 2400;
const MIN_SCALE = 0.35;
const MAX_SCALE = 3.2;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function blockWidth(prominence: number): number {
  return 36 + Math.min(1, Math.max(0, prominence)) * 42;
}

function worldSize(maxLane: number) {
  return {
    w: MARGIN_X * 2 + Math.max(1, maxLane + 1) * LANE_W + 40,
    h: WORLD_H + MARGIN_Y * 2,
  };
}

export function SederChronologyCanvas({
  bands,
  nodes,
  edges,
  renderLayout,
  selectedPersonId,
  focusPersonId = null,
  visualVariant = 1,
  visibleFamilies,
  showDisputed,
  showUncertain,
  onSelectPerson,
  className,
}: SederChronologyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<Camera>({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    lastX: number;
    lastY: number;
  }>({ active: false, moved: false, lastX: 0, lastY: 0 });
  const animRef = useRef<number | null>(null);
  const layoutMap = useRef(new Map<string, SederRenderLayoutDto>());
  const nodeMap = useRef(new Map<string, SederHistoricalPlacementNodeDto>());

  useEffect(() => {
    layoutMap.current = new Map(renderLayout.map((l) => [l.person_id, l]));
    nodeMap.current = new Map(nodes.map((n) => [n.person_id, n]));
  }, [nodes, renderLayout]);

  const maxLane = renderLayout.reduce((m, l) => Math.max(m, l.x_lane), 0);

  const toScreen = useCallback((wx: number, wy: number) => {
    const c = cameraRef.current;
    return { x: wx * c.scale + c.x, y: wy * c.scale + c.y };
  }, []);

  const toWorld = useCallback((sx: number, sy: number) => {
    const c = cameraRef.current;
    return { x: (sx - c.x) / c.scale, y: (sy - c.y) / c.scale };
  }, []);

  const personRect = useCallback(
    (node: SederHistoricalPlacementNodeDto) => {
      const lane = layoutMap.current.get(node.person_id)?.x_lane ?? 0;
      const w = blockWidth(Number(node.prominence_score_effective));
      const x = MARGIN_X + lane * LANE_W + (LANE_W - w) / 2;
      const y0 = MARGIN_Y + Number(node.y_start_norm) * WORLD_H;
      const y1 = MARGIN_Y + Number(node.y_end_norm) * WORLD_H;
      return { x, y: y0, w, h: Math.max(10, y1 - y0) };
    },
    [],
  );

  const hopSet = useCallback(
    (centerId: string | null): Set<string> => {
      const set = new Set<string>();
      if (!centerId) return set;
      set.add(centerId);
      for (const e of edges) {
        if (e.person_a_id === centerId) set.add(e.person_b_id);
        if (e.person_b_id === centerId) set.add(e.person_a_id);
      }
      return set;
    },
    [edges],
  );

  const drawMarker = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    kind: string,
    color: string,
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    if (kind === "arrow") {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "circle") {
      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "bar") {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-5, -5);
      ctx.lineTo(-5, 5);
      ctx.stroke();
    }
    ctx.restore();
  };

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (canvas.width !== Math.floor(cssW * dpr) || canvas.height !== Math.floor(cssH * dpr)) {
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const tokens = getSederVisualTokens(visualVariant);
    const cam = cameraRef.current;
    const focusId = selectedPersonId ?? focusPersonId;
    const hops = hopSet(focusId);

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.scale, cam.scale);

    // Generation bands
    bands.forEach((band, i) => {
      const y0 = MARGIN_Y + Number(band.y_start_norm) * WORLD_H;
      const y1 = MARGIN_Y + Number(band.y_end_norm) * WORLD_H;
      const { w } = worldSize(maxLane);
      ctx.fillStyle = i % 2 === 0 ? tokens.band.fillEven : tokens.band.fillOdd;
      ctx.fillRect(0, y0, w, Math.max(1, y1 - y0));
      ctx.fillStyle = tokens.band.labelColor;
      ctx.font = "600 13px Segoe UI, Arial Hebrew, Tahoma, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(band.label_he, MARGIN_X - 12, y0 + 18);
    });

    const edgeVisible = (e: SederHistoricalPlacementEdgeDto) => {
      if (!visibleFamilies.has(e.family)) return false;
      const disputed =
        e.knowledge_state === "disputed" || Boolean(e.dispute_state);
      const uncertain =
        e.knowledge_state === "estimated" || e.knowledge_state === "unknown";
      if (disputed && !showDisputed) return false;
      if (uncertain && !disputed && !showUncertain) return false;
      return true;
    };

    // Edges
    for (const edge of edges) {
      if (!edgeVisible(edge)) continue;
      const a = nodeMap.current.get(edge.person_a_id);
      const b = nodeMap.current.get(edge.person_b_id);
      if (!a || !b) continue;
      const ra = personRect(a);
      const rb = personRect(b);
      const x1 = ra.x + ra.w / 2;
      const y1 = ra.y + ra.h / 2;
      const x2 = rb.x + rb.w / 2;
      const y2 = rb.y + rb.h / 2;

      const fam = tokens.families[edge.family];
      let dash = [...fam.dash];
      let opacity = fam.opacity;
      let lw = fam.lineWidth;
      const disputed =
        edge.knowledge_state === "disputed" || Boolean(edge.dispute_state);
      const uncertain =
        edge.knowledge_state === "estimated" ||
        edge.knowledge_state === "unknown";
      if (disputed) {
        dash = tokens.disputed.dash;
        opacity *= tokens.disputed.opacity;
        lw += tokens.disputed.lineWidthBoost;
      } else if (uncertain) {
        dash = tokens.uncertain.dash;
        opacity *= tokens.uncertain.opacity;
      }

      if (focusId && hops.size) {
        const onHop =
          hops.has(edge.person_a_id) && hops.has(edge.person_b_id);
        opacity *= onHop
          ? tokens.hopEmphasis.neighborOpacity
          : tokens.hopEmphasis.otherOpacity;
      }

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = fam.color;
      ctx.lineWidth = lw;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const midX = (x1 + x2) / 2 + (ra.x < rb.x ? 18 : -18);
      ctx.quadraticCurveTo(midX, (y1 + y2) / 2, x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (fam.marker !== "none") {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        drawMarker(ctx, x2, y2, angle, fam.marker, fam.color);
      }
      ctx.restore();
    }

    // Person blocks
    for (const node of nodes) {
      const r = personRect(node);
      const isSelected = node.person_id === focusId;
      const inHop = !focusId || hops.has(node.person_id);
      let fill = tokens.personBlock.fill;
      let stroke = tokens.personBlock.stroke;
      let label = tokens.personBlock.labelColor;
      let alpha = 1;
      if (isSelected) {
        fill = tokens.personBlock.fillSelected;
        stroke = tokens.personBlock.strokeSelected;
        label = "#fff";
      } else if (!inHop) {
        fill = tokens.personBlock.fillDimmed;
        label = tokens.personBlock.labelDimmed;
        alpha = tokens.hopEmphasis.otherOpacity;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = fill;
      ctx.strokeStyle = stroke;
      ctx.lineWidth = isSelected ? 2.5 : 1.25;
      const rr = 6;
      roundRect(ctx, r.x, r.y, r.w, r.h, rr);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = label;
      ctx.font = `${isSelected ? 600 : 500} 11px Segoe UI, Arial Hebrew, Tahoma, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const labelText = node.display_name.replace(/^רבי\s+|^רב\s+/, "");
      const clipped =
        labelText.length > 10 ? `${labelText.slice(0, 9)}…` : labelText;
      ctx.fillText(clipped, r.x + r.w / 2, r.y + Math.min(r.h / 2, 14));
      ctx.restore();
    }

    ctx.restore();
  }, [
    bands,
    edges,
    focusPersonId,
    hopSet,
    maxLane,
    nodes,
    personRect,
    selectedPersonId,
    showDisputed,
    showUncertain,
    visibleFamilies,
    visualVariant,
  ]);

  const animateCameraTo = useCallback(
    (target: Camera) => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const reduced = prefersReducedMotion();
      if (reduced) {
        cameraRef.current = target;
        paint();
        return;
      }
      const start = { ...cameraRef.current };
      const t0 = performance.now();
      const dur = 420;
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        cameraRef.current = {
          x: start.x + (target.x - start.x) * e,
          y: start.y + (target.y - start.y) * e,
          scale: start.scale + (target.scale - start.scale) * e,
        };
        paint();
        if (t < 1) animRef.current = requestAnimationFrame(step);
      };
      animRef.current = requestAnimationFrame(step);
    },
    [paint],
  );

  const focusOnPerson = useCallback(
    (personId: string) => {
      const node = nodeMap.current.get(personId);
      const canvas = canvasRef.current;
      if (!node || !canvas) return;
      const r = personRect(node);
      const scale = Math.min(MAX_SCALE, Math.max(0.85, cameraRef.current.scale));
      const cx = canvas.clientWidth / 2;
      const cy = canvas.clientHeight / 2;
      animateCameraTo({
        scale,
        x: cx - (r.x + r.w / 2) * scale,
        y: cy - (r.y + r.h / 2) * scale,
      });
    },
    [animateCameraTo, personRect],
  );

  useEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const id = focusPersonId ?? selectedPersonId;
    if (id) focusOnPerson(id);
    // only on external focus / first selection mount intent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPersonId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => paint());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = ev.clientX - rect.left;
      const sy = ev.clientY - rect.top;
      const before = toWorld(sx, sy);
      const factor = ev.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, cameraRef.current.scale * factor),
      );
      cameraRef.current.scale = next;
      const after = toScreen(before.x, before.y);
      cameraRef.current.x += sx - after.x;
      cameraRef.current.y += sy - after.y;
      paint();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [paint, toScreen, toWorld]);

  const hitTest = (sx: number, sy: number): string | null => {
    const w = toWorld(sx, sy);
    // reverse order — topmost last drawn
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]!;
      const r = personRect(node);
      if (w.x >= r.x && w.x <= r.x + r.w && w.y >= r.y && w.y <= r.y + r.h) {
        return node.person_id;
      }
    }
    return null;
  };

  const onPointerDown = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(ev.pointerId);
    dragRef.current = {
      active: true,
      moved: false,
      lastX: ev.clientX,
      lastY: ev.clientY,
    };
  };

  const onPointerMove = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = ev.clientX - dragRef.current.lastX;
    const dy = ev.clientY - dragRef.current.lastY;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
    dragRef.current.lastX = ev.clientX;
    dragRef.current.lastY = ev.clientY;
    cameraRef.current.x += dx;
    cameraRef.current.y += dy;
    paint();
  };

  const onPointerUp = (ev: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wasDrag = dragRef.current.moved;
    dragRef.current.active = false;
    if (wasDrag) return;
    const rect = canvas.getBoundingClientRect();
    const id = hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
    onSelectPerson(id);
    if (id) focusOnPerson(id);
  };

  return (
    <canvas
      ref={canvasRef}
      className={className ?? "seder-canvas"}
      role="img"
      aria-label="תצוגת כרונולוגיה של סדר הדורות. השתמשו ברשימת האנשים הסמנטית לניווט נגיש."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
    />
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
