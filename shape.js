/**
 * GREEBZ — signature form generator
 *
 * The brand's core graphic element is an asymmetric 4–6 sided polygon with
 * heavily rounded corners: the stylised mushroom cap (Brandbook p. 35–36).
 *
 * Two rules from p. 36 make it impossible to build with plain CSS:
 *
 *   1. Corners are ROUNDED and edges are ANGLED at once.
 *      `border-radius` gives no angled edges; `clip-path: polygon()` gives
 *      no rounded corners.
 *
 *   2. Radii are OPTICALLY COMPENSATED — sharp corners take a smaller radius
 *      than obtuse ones so that every corner reads equally round. A single
 *      radius value applied everywhere is explicitly called out as wrong.
 *
 * So the path is generated: absolute radius in px, per-corner compensation,
 * recomputed for the element's real width and height. The radius therefore
 * never distorts with aspect ratio.
 *
 * @example
 *   import { formPath, FORMS } from './shape.js';
 *   const d = formPath(FORMS.pentagon, 640, 420, 48);
 *   // -> <path d={d} /> inside <svg viewBox="0 0 640 420">
 *
 * @example  photo mask
 *   el.style.maskImage  = `url("${formDataUri(FORMS.cap, 400, 300, 40)}")`;
 *   el.style.maskSize   = '100% 100%';
 *
 * No dependencies. ESM; also fine as a plain <script type="module">.
 */

/**
 * Normalised vertex sets (0..1 in both axes, wound clockwise in screen
 * coordinates with y pointing down). Scaled to the element's real box at
 * generation time.
 *
 * `cap` and `pentagon` are the two canonical forms — reach for those first.
 */
export const FORMS = {
  /** The arch. Used for colour swatches and short text plaques. */
  cap: [[0.5, 0], [1, 1], [0, 1]],

  /** The canon: five sides, bevelled top. Photo masks, cards. */
  pentagon: [[0, 0.28], [0.62, 0], [1, 0.22], [1, 1], [0, 1]],

  /** Squat house — a calmer pentagon for wide blocks. */
  house: [[0, 0.24], [0.55, 0], [1, 0.3], [1, 1], [0, 1]],

  /** Quadrilateral with two drifting edges. Good for landscape photos. */
  wedge: [[0, 0], [1, 0.06], [0.86, 0.94], [0, 1]],

  /** Almost a rectangle, one cut corner. The quietest form — use for text. */
  card: [[0, 0], [1, 0], [1, 1], [0.18, 1], [0, 0.8]],

  /** Six sides, fully asymmetric. The most expressive of the set. */
  blob: [[0, 0.18], [0.55, 0], [1, 0.12], [0.94, 0.78], [0.5, 1], [0.06, 0.86]],

  /** Slanted quad leaning right. */
  lean: [[0, 0], [1, 0.1], [1, 1], [0.3, 0.86]],

  /** Symmetric hexagon — allowed explicitly on p. 36. */
  hex: [[0.5, 0], [1, 0.27], [1, 0.73], [0.5, 1], [0, 0.73], [0, 0.27]],

  /** Triangle — also allowed explicitly on p. 36. */
  triangle: [[0, 0], [1, 0], [0, 1]],
};

/** Recommended absolute corner radii, matching --gz-form-radius-* in tokens.css. */
export const FORM_RADIUS = { sm: 24, md: 40, lg: 64 };

const TAU = Math.PI * 2;

/**
 * Optical compensation curve.
 *
 * Normalised so a 90° corner receives exactly the requested radius; sharper
 * corners get less, obtuse corners more. This is what keeps every corner
 * reading equally round on an asymmetric polygon.
 *
 * @param {number} theta interior angle in radians
 * @returns {number} multiplier for the nominal radius
 */
function opticalFactor(theta) {
  return Math.sin(theta / 2) / Math.SQRT1_2;
}

/**
 * Build an SVG path for a rounded, optically compensated polygon.
 *
 * @param {Array<[number, number]>} points  Vertices. Values in 0..1 are read as
 *   normalised and scaled by width/height; anything larger is treated as px.
 * @param {number} width   Target width in px.
 * @param {number} height  Target height in px.
 * @param {number} [radius=40]  Nominal corner radius in px (absolute — this is
 *   the whole point; it does not scale with the box).
 * @returns {string} the `d` attribute
 */
export function formPath(points, width, height, radius = FORM_RADIUS.md) {
  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('formPath: need at least 3 points');
  }

  const normalised = points.every(([x, y]) => x <= 1 && y <= 1);
  const pts = points.map(([x, y]) =>
    normalised ? [x * width, y * height] : [x, y]
  );

  const n = pts.length;
  const corners = [];

  for (let i = 0; i < n; i++) {
    const curr = pts[i];
    const prev = pts[(i - 1 + n) % n];
    const next = pts[(i + 1) % n];

    const toPrev = unit(prev, curr);
    const toNext = unit(next, curr);

    // Interior angle at this vertex.
    let theta = Math.acos(clamp(dot(toPrev, toNext), -1, 1));
    if (!Number.isFinite(theta) || theta < 1e-4) theta = 1e-4;

    // Compensated radius, then clipped so neighbouring corners cannot overlap.
    let r = radius * opticalFactor(theta);
    let tangent = r / Math.tan(theta / 2);
    const limit = Math.min(dist(prev, curr), dist(next, curr)) / 2;

    if (tangent > limit) {
      tangent = limit;
      r = tangent * Math.tan(theta / 2);
    }

    const start = [curr[0] + toPrev[0] * tangent, curr[1] + toPrev[1] * tangent];
    const end = [curr[0] + toNext[0] * tangent, curr[1] + toNext[1] * tangent];

    // Screen coords have y down, so a negative cross product is a clockwise arc.
    const cross = toPrev[0] * toNext[1] - toPrev[1] * toNext[0];
    corners.push({ start, end, r, sweep: cross < 0 ? 1 : 0 });
  }

  let d = `M ${fmt(corners[0].start)}`;
  for (let i = 0; i < n; i++) {
    const c = corners[i];
    d += c.r > 0.01
      ? ` A ${round(c.r)} ${round(c.r)} 0 0 ${c.sweep} ${fmt(c.end)}`
      : ` L ${fmt(c.end)}`;
    d += ` L ${fmt(corners[(i + 1) % n].start)}`;
  }
  return `${d} Z`;
}

/**
 * A complete standalone `<svg>` string for the form.
 *
 * @param {Array<[number, number]>} points
 * @param {number} width
 * @param {number} height
 * @param {number} [radius]
 * @param {string} [fill='#E3C195']
 * @returns {string}
 */
export function formSvg(points, width, height, radius = FORM_RADIUS.md, fill = '#E3C195') {
  const d = formPath(points, width, height, radius);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><path d="${d}" fill="${fill}"/></svg>`;
}

/**
 * Data URI of the form, for `mask-image` / `background-image`.
 * Pair with `mask-size: 100% 100%`.
 *
 * @returns {string}
 */
export function formDataUri(points, width, height, radius = FORM_RADIUS.md, fill = '#000') {
  const svg = formSvg(points, width, height, radius, fill);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Apply a form to an element as a mask, re-generating on resize so the radius
 * stays absolute. Returns a teardown function.
 *
 * @param {HTMLElement} el
 * @param {Array<[number, number]>} [points]
 * @param {number} [radius]
 * @returns {() => void}
 */
export function maskElement(el, points = FORMS.pentagon, radius = FORM_RADIUS.md) {
  const paint = () => {
    const { width, height } = el.getBoundingClientRect();
    if (!width || !height) return;
    const uri = formDataUri(points, Math.round(width), Math.round(height), radius);
    el.style.maskImage = `url("${uri}")`;
    el.style.webkitMaskImage = `url("${uri}")`;
    el.style.maskSize = '100% 100%';
    el.style.webkitMaskSize = '100% 100%';
    el.style.maskRepeat = 'no-repeat';
    el.style.webkitMaskRepeat = 'no-repeat';
  };

  paint();
  const ro = new ResizeObserver(paint);
  ro.observe(el);
  return () => ro.disconnect();
}

/* -- geometry helpers ------------------------------------------------------ */

function unit(from, to) {
  const dx = from[0] - to[0];
  const dy = from[1] - to[1];
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v) => Math.round(v * 100) / 100;
const fmt = (p) => `${round(p[0])} ${round(p[1])}`;

export { TAU };
