import { Container, Graphics, Text } from "pixi.js";

// Centripetal Catmull-Rom (α=0.5): unlike the uniform variant it never overshoots
// or loops between waypoints, so the rendered curve stays inside the water-avoiding
// corridor the A* path defines (no bowing back across lakes).
function catmullRomDensify(
  pts: { x: number; y: number }[],
  segmentsPerSpan = 4
): { x: number; y: number }[] {
  if (pts.length < 2) return pts;
  const ext = [pts[0], ...pts, pts[pts.length - 1]];
  const out: { x: number; y: number }[] = [];
  const ALPHA = 0.5;
  const knot = (ti: number, a: { x: number; y: number }, b: { x: number; y: number }) =>
    ti + Math.pow(Math.hypot(b.x - a.x, b.y - a.y), ALPHA);

  for (let i = 1; i < ext.length - 2; i++) {
    const p0 = ext[i - 1], p1 = ext[i], p2 = ext[i + 1], p3 = ext[i + 2];
    const t0 = 0;
    const t1 = knot(t0, p0, p1);
    const t2 = knot(t1, p1, p2);
    const t3 = knot(t2, p2, p3);
    const L = (a: { x: number; y: number }, b: { x: number; y: number }, ta: number, tb: number, t: number) => {
      const f = tb === ta ? 0 : (t - ta) / (tb - ta);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
    };
    for (let s = 0; s < segmentsPerSpan; s++) {
      const t = t1 + (t2 - t1) * (s / segmentsPerSpan);
      const a1 = L(p0, p1, t0, t1, t);
      const a2 = L(p1, p2, t1, t2, t);
      const a3 = L(p2, p3, t2, t3, t);
      const b1 = L(a1, a2, t0, t2, t);
      const b2 = L(a2, a3, t1, t3, t);
      out.push(L(b1, b2, t1, t2, t));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
import type { Viewport } from "pixi-viewport";
import type { WorldMovement } from "@etheria/shared";

const RELATION_COLORS: Record<string, number> = {
  own: 0xe8c468, ally: 0x49f0c5, peace: 0x6fc8ff, hostile: 0xd75f43, neutral: 0xb9b3a4,
};

type MovementWithRelation = WorldMovement & { relation?: "ally" | "peace" | "hostile" | "neutral" | "own" };

export class MovementsLayer extends Container {
  private viewport: Viewport;
  private linesG = new Graphics();   // all route lines
  private iconsC = new Container();  // all moving icons
  private tooltipC = new Container(); // hover tooltip
  private iconMap = new Map<string, Container>();
  private hoveredId: string | null = null;
  private movements: MovementWithRelation[] = [];
  private t: (key: string) => string = (k) => k;

  constructor(viewport: Viewport, t: (key: string) => string) {
    super();
    this.viewport = viewport;
    this.t = t;
    this.addChild(this.linesG, this.iconsC, this.tooltipC);
    this.eventMode = "static";
  }

  setMovements(movements: MovementWithRelation[]) {
    this.movements = movements;
    this.rebuildIcons();
    this.redrawLines();
  }

  private colorFor(m: MovementWithRelation): number {
    if (m.type === "BARBARIAN_TRADE") return 0xa0e870;
    if (m.type === "BARBARIAN_MOVE") return 0xc8a060;
    if (m.type === "BARBARIAN_VS_BARBARIAN") return 0xe84040;
    return RELATION_COLORS[m.relation ?? "neutral"] ?? 0xb9b3a4;
  }

  private pathPoints(m: MovementWithRelation): { x: number; y: number }[] {
    const isReturning = m.status === "RETURNING" && !!m.returnsAt;
    const raw = m.path && m.path.length >= 2 ? m.path : [m.from, m.to];
    return isReturning ? [...raw].reverse() : raw;
  }

  /** Draw all route lines with halo pattern. Call when movements change or hover changes. */
  redrawLines() {
    const g = this.linesG;
    g.clear();
    const scale = this.viewport.scale.x;
    const baseW = 1.5 / scale;
    const haloW = 4 / scale;

    for (const m of this.movements) {
      const pts = catmullRomDensify(this.pathPoints(m));
      if (pts.length < 2) continue;
      const color = this.colorFor(m);
      const isHov = m.id === this.hoveredId;
      const lineW = isHov ? 2.5 / scale : baseW;
      const hW = isHov ? 6 / scale : haloW;
      const alpha = isHov ? 1 : 0.38;

      // Halo (dark)
      g.setStrokeStyle({ width: hW, color: 0x000000, alpha: alpha * 0.55 });
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.stroke();

      // Color line
      g.setStrokeStyle({ width: lineW, color, alpha });
      g.moveTo(pts[0].x, pts[0].y);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y);
      g.stroke();

      // Destination dot
      const dest = pts[pts.length - 1];
      g.circle(dest.x, dest.y, 4 / scale).fill({ color, alpha });
    }
  }

  private rebuildIcons() {
    const ids = new Set(this.movements.map(m => m.id));
    for (const [id, c] of this.iconMap) {
      if (!ids.has(id)) { c.destroy({ children: true }); this.iconMap.delete(id); }
    }
    for (const m of this.movements) {
      if (!this.iconMap.has(m.id)) {
        const icon = this.buildIcon(m);
        this.iconsC.addChild(icon);
        this.iconMap.set(m.id, icon);
      }
    }
  }

  private buildIcon(m: MovementWithRelation): Container {
    const c = new Container();
    c.x = m.from.x; c.y = m.from.y;
    c.eventMode = "static"; c.cursor = "pointer";

    const color = this.colorFor(m);
    const isTrade = m.type === "TRADE" || m.type === "BARBARIAN_TRADE";
    const isBarbMove = m.type === "BARBARIAN_MOVE";
    const isBarbDuel = m.type === "BARBARIAN_VS_BARBARIAN";

    const isReturning = m.status === "RETURNING";
    const dx = isReturning ? m.from.x - m.to.x : m.to.x - m.from.x;
    const dy = isReturning ? m.from.y - m.to.y : m.to.y - m.from.y;
    const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    const angleRad = angleDeg * (Math.PI / 180);

    const g = new Graphics();
    if (isBarbMove) {
      g.circle(0, 0, 9).fill({ color });
    } else if (isTrade) {
      // Rotated square = diamond
      g.rect(-8, -8, 16, 16).fill({ color });
      g.rotation = Math.PI / 4;
    } else if (isBarbDuel) {
      const r = angleRad;
      g.poly([
        Math.cos(r) * 0 - Math.sin(r) * -10, Math.sin(r) * 0 + Math.cos(r) * -10,
        Math.cos(r) * 8 - Math.sin(r) * 6, Math.sin(r) * 8 + Math.cos(r) * 6,
        Math.cos(r) * -8 - Math.sin(r) * 6, Math.sin(r) * -8 + Math.cos(r) * 6,
      ]).fill({ color });
      const g2 = new Graphics();
      g2.poly([
        Math.cos(r) * 0 - Math.sin(r) * 10, Math.sin(r) * 0 + Math.cos(r) * 10,
        Math.cos(r) * 8 - Math.sin(r) * -6, Math.sin(r) * 8 + Math.cos(r) * -6,
        Math.cos(r) * -8 - Math.sin(r) * -6, Math.sin(r) * -8 + Math.cos(r) * -6,
      ]).fill({ color, alpha: 0.55 });
      c.addChild(g2);
    } else {
      // Attack triangle — rotated toward destination
      const r = angleRad;
      g.poly([
        Math.cos(r) * 0 - Math.sin(r) * -10, Math.sin(r) * 0 + Math.cos(r) * -10,
        Math.cos(r) * 8 - Math.sin(r) * 6, Math.sin(r) * 8 + Math.cos(r) * 6,
        Math.cos(r) * -8 - Math.sin(r) * 6, Math.sin(r) * -8 + Math.cos(r) * 6,
      ]).fill({ color });
    }
    c.addChild(g);

    c.on("pointerenter", () => { this.hoveredId = m.id; this.redrawLines(); this.showTooltip(m, c); });
    c.on("pointerleave", () => {
      if (this.hoveredId === m.id) { this.hoveredId = null; this.redrawLines(); this.hideTooltip(); }
    });
    c.on("pointertap", (e: any) => { e.stopPropagation(); });
    return c;
  }

  private showTooltip(m: MovementWithRelation, iconC: Container) {
    this.tooltipC.removeChildren();
    const etaMs = new Date(m.status === "RETURNING" && m.returnsAt ? m.returnsAt : m.arrivesAt).getTime() - Date.now();
    const etaMin = Math.max(0, Math.floor(etaMs / 60000));
    const etaSec = Math.max(0, Math.floor((etaMs % 60000) / 1000));
    const isTrade = m.type === "TRADE" || m.type === "BARBARIAN_TRADE";
    const typeLabel = m.type === "BARBARIAN_MOVE" ? "Relocation"
      : m.type === "BARBARIAN_VS_BARBARIAN" ? "Clash"
      : m.type === "BARBARIAN_TRADE" ? "Barbarian trade"
      : isTrade ? this.t("play.map.march.trade") : this.t("play.map.march.attack");
    const text = `${m.playerName ?? m.from.name} → ${m.status === "RETURNING" ? m.from.name : m.to.name}\n${typeLabel} · ${etaMin}m ${etaSec}s`;
    const scale = 1 / this.viewport.scale.x;
    const pad = 8 * scale;
    const t = new Text({
      text,
      style: { fontSize: 13, fill: 0xe9e2cf, fontFamily: "sans-serif" }
    });
    t.scale.set(scale);
    const tw = t.width + pad * 2;
    const th = t.height + pad * 2;
    const bg = new Graphics();
    bg.rect(0, 0, tw, th).fill({ color: 0x0d1a1a, alpha: 0.93 });
    const tipC = new Container();
    tipC.addChild(bg, t);
    t.x = pad;
    t.y = pad;
    tipC.x = iconC.x + 14 * scale;
    tipC.y = iconC.y - 28 * scale;
    this.tooltipC.addChild(tipC);
  }

  private hideTooltip() {
    this.tooltipC.removeChildren();
  }

  /** Animate icon positions along path. Call from ticker at ~7fps. */
  update() {
    const now = Date.now();
    const scale = this.viewport.scale.x;
    const s = Math.max(0.5, Math.min(2.5, 1 / scale));

    for (const m of this.movements) {
      const c = this.iconMap.get(m.id);
      if (!c) continue;
      c.scale.set(s);

      const isReturning = m.status === "RETURNING" && !!m.returnsAt;
      const startT = isReturning
        ? new Date(m.resolvedAt ?? m.arrivesAt).getTime()
        : new Date(m.startedAt).getTime();
      const endT = isReturning
        ? new Date(m.returnsAt!).getTime()
        : new Date(m.arrivesAt).getTime();
      const duration = endT - startT;
      // Real time-based progress. On bad/missing timestamps, park the icon at its
      // destination instead of the old hash-cycle that made icons drift endlessly
      // back and forth with no relation to the actual ETA.
      const progress = duration > 0 ? Math.min(1, Math.max(0, (now - startT) / duration)) : 1;

      const pts = catmullRomDensify(this.pathPoints(m));
      const pos = this.pointAlongPath(pts, progress);
      c.x = pos.x;
      c.y = pos.y;
    }
  }

  private pointAlongPath(pts: { x: number; y: number }[], progress: number) {
    if (pts.length <= 1) return pts[0] ?? { x: 0, y: 0 };
    let total = 0;
    const lens: number[] = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(total);
    }
    const target = progress * total;
    let seg = pts.length - 2;
    for (let i = 0; i < pts.length - 1; i++) {
      if (lens[i + 1] >= target) { seg = i; break; }
    }
    const segLen = lens[seg + 1] - lens[seg];
    const t = segLen > 0 ? (target - lens[seg]) / segLen : 0;
    return {
      x: pts[seg].x + (pts[seg + 1].x - pts[seg].x) * t,
      y: pts[seg].y + (pts[seg + 1].y - pts[seg].y) * t,
    };
  }
}
