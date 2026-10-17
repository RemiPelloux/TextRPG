/**
 * Hand-drawn vector scenes. Every picture in the game is built from these layers (sky, moon,
 * mountains, castle, forest, figures, fire), so it stays sharp at any size, weighs a few kB and
 * can be animated in CSS: drifting fog, flickering fire, rising embers, slow parallax.
 * Classes used for motion live in globals.css under "Scenes".
 */
import type { CSSProperties, ReactNode } from "react";

/** Deterministic pseudo-random numbers, so stars and embers never move between renders. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function Stars({ count, w, h, seed = 7 }: { count: number; w: number; h: number; seed?: number }) {
  const rnd = seeded(seed);
  return (
    <g className="stars">
      {Array.from({ length: count }, (_, i) => {
        const r = rnd() < 0.85 ? 0.5 + rnd() * 0.6 : 1.1 + rnd() * 0.7;
        return (
          <circle
            key={i}
            cx={rnd() * w}
            cy={rnd() * h}
            r={r}
            fill="#f6e7c1"
            opacity={0.35 + rnd() * 0.6}
            style={{ animationDelay: `${(rnd() * 6).toFixed(2)}s` }}
          />
        );
      })}
    </g>
  );
}

function Embers({
  count,
  x,
  y,
  spread,
  seed = 3,
}: {
  count: number;
  x: number;
  y: number;
  spread: number;
  seed?: number;
}) {
  const rnd = seeded(seed);
  return (
    <g className="embers">
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          cx={x + (rnd() - 0.5) * spread}
          cy={y}
          r={0.8 + rnd() * 1.4}
          fill="#ffb15a"
          style={
            {
              animationDelay: `${(rnd() * 5).toFixed(2)}s`,
              animationDuration: `${(3.5 + rnd() * 3).toFixed(2)}s`,
              "--drift": `${((rnd() - 0.5) * 40).toFixed(0)}px`,
            } as CSSProperties
          }
        />
      ))}
    </g>
  );
}

/** A castle on a hill: keep, towers with pointed roofs, lit windows. */
function Castle({
  x,
  y,
  s = 1,
  fill = "#0e1119",
  lit = "#f2c26b",
}: {
  x: number;
  y: number;
  s?: number;
  fill?: string;
  lit?: string;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <g fill={fill}>
        <path d="M-70 0 L-70 -40 L-62 -40 L-62 -46 L-56 -46 L-56 -40 L-48 -40 L-48 -46 L-42 -46 L-42 -40 L-34 -40 L-34 0 Z" />
        <rect x="-38" y="-78" width="22" height="78" />
        <path d="M-41 -78 L-27 -112 L-13 -78 Z" />
        <rect x="-16" y="-58" width="44" height="58" />
        <path d="M-16 -58 L-16 -64 L-10 -64 L-10 -58 L-2 -58 L-2 -64 L4 -64 L4 -58 L12 -58 L12 -64 L18 -64 L18 -58 L28 -58 Z" />
        <rect x="22" y="-100" width="18" height="100" />
        <path d="M19 -100 L31 -146 L43 -100 Z" />
        <rect x="40" y="-66" width="26" height="66" />
        <path d="M37 -66 L53 -94 L69 -66 Z" />
        <rect x="66" y="-36" width="34" height="36" />
        <path d="M66 -36 L66 -42 L72 -42 L72 -36 L80 -36 L80 -42 L86 -42 L86 -36 L94 -36 L94 -42 L100 -42 L100 -36 Z" />
        <path d="M-90 0 Q-40 -14 10 -6 Q70 2 130 0 L130 30 L-90 30 Z" />
      </g>
      <g fill={lit} className="windows">
        <rect x="-29" y="-66" width="3" height="6" />
        <rect x="29" y="-86" width="3" height="6" />
        <rect x="29" y="-60" width="3" height="5" />
        <rect x="50" y="-50" width="3" height="5" />
        <rect x="2" y="-40" width="3" height="5" />
        <rect x="80" y="-24" width="3" height="4" />
      </g>
    </g>
  );
}

/** A row of pines along a ridge. */
function Pines({
  x0,
  x1,
  base,
  h,
  fill,
  seed = 11,
}: {
  x0: number;
  x1: number;
  base: number;
  h: number;
  fill: string;
  seed?: number;
}) {
  const rnd = seeded(seed);
  const trees: ReactNode[] = [];
  for (let x = x0, i = 0; x < x1; i++) {
    const th = h * (0.6 + rnd() * 0.6);
    const tw = th * 0.42;
    trees.push(
      <path
        key={i}
        d={`M${x} ${base} L${x + tw / 2} ${base - th} L${x + tw} ${base} Z M${x + tw * 0.12} ${base - th * 0.35} L${x + tw / 2} ${base - th * 0.9} L${x + tw * 0.88} ${base - th * 0.35} Z`}
      />,
    );
    x += tw * (0.45 + rnd() * 0.4);
  }
  return <g fill={fill}>{trees}</g>;
}

function Moon({
  cx,
  cy,
  r,
  tone = "gold",
}: {
  cx: number;
  cy: number;
  r: number;
  tone?: "gold" | "blood" | "pale";
}) {
  const id = `moon-${tone}`;
  const stops = {
    gold: ["#fff3cf", "#f1cf86", "#c98e3f"],
    blood: ["#ffb39a", "#d2412f", "#6e1210"],
    pale: ["#f4f1e6", "#cfd4dc", "#8a93a3"],
  }[tone];
  const glow = { gold: "#f2c26b", blood: "#e0402e", pale: "#cbd5e6" }[tone];
  return (
    <g className="moon">
      <defs>
        <radialGradient id={id} cx="42%" cy="40%" r="60%">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="60%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </radialGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={glow} stopOpacity="0.55" />
          <stop offset="45%" stopColor={glow} stopOpacity="0.16" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle className="moon-glow" cx={cx} cy={cy} r={r * 2.6} fill={`url(#${id}-glow)`} />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
      <g fill="#000" opacity="0.09">
        <circle cx={cx - r * 0.3} cy={cy - r * 0.15} r={r * 0.22} />
        <circle cx={cx + r * 0.25} cy={cy + r * 0.3} r={r * 0.15} />
        <circle cx={cx + r * 0.35} cy={cy - r * 0.35} r={r * 0.1} />
        <circle cx={cx - r * 0.1} cy={cy + r * 0.45} r={r * 0.08} />
      </g>
    </g>
  );
}

function Fog({
  y,
  h,
  w,
  opacity = 0.35,
  color = "#9aa3b8",
  className = "fog",
}: {
  y: number;
  h: number;
  w: number;
  opacity?: number;
  color?: string;
  className?: string;
}) {
  return (
    <g className={className} opacity={opacity}>
      <ellipse cx={w * 0.25} cy={y} rx={w * 0.45} ry={h} fill={color} />
      <ellipse cx={w * 0.8} cy={y + h * 0.3} rx={w * 0.5} ry={h * 0.8} fill={color} />
      <ellipse cx={w * 1.35} cy={y - h * 0.2} rx={w * 0.4} ry={h} fill={color} />
    </g>
  );
}

/** The cloaked hero seen from behind, sword lowered, red cape in the wind. */
function Wanderer({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id="cape" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#a3241c" />
          <stop offset="100%" stopColor="#4a0c0a" />
        </linearGradient>
      </defs>
      <path
        className="cape"
        d="M-6 -62 C-20 -40 -34 -14 -48 6 L-30 2 L-38 14 L-14 6 L-6 10 L4 -2 Z"
        fill="url(#cape)"
      />
      <path
        d="M-9 -64 C-12 -40 -12 -18 -10 4 L-3 4 L-1 -20 L3 4 L10 4 C10 -18 8 -42 6 -64 Z"
        fill="#0b0d12"
      />
      <path d="M-11 -66 C-10 -80 8 -82 9 -66 C6 -60 -8 -60 -11 -66 Z" fill="#0b0d12" />
      <circle cx="-1" cy="-76" r="7" fill="#0b0d12" />
      <path d="M8 -46 L22 6" stroke="#c9ccd4" strokeWidth="1.6" />
      <path d="M5 -50 L12 -43" stroke="#d4a24c" strokeWidth="2" />
      <path
        d="M-6 -62 C-2 -66 4 -66 8 -62"
        stroke="#d4a24c"
        strokeWidth="0.8"
        fill="none"
        opacity="0.6"
      />
    </g>
  );
}

/** The title screen: a night over the realm, the hero facing the castle. */
export function TitleScene({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`scene-art ${className}`}
      viewBox="0 0 400 860"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="t-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#060810" />
          <stop offset="22%" stopColor="#121829" />
          <stop offset="38%" stopColor="#3b3426" />
          <stop offset="50%" stopColor="#141310" />
          <stop offset="100%" stopColor="#07080b" />
        </linearGradient>
        <linearGradient id="t-cliff" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#1c1813" />
          <stop offset="100%" stopColor="#07080b" />
        </linearGradient>
      </defs>
      <rect width="400" height="860" fill="url(#t-sky)" />
      <Stars count={110} w={400} h={300} />
      <g className="layer far">
        <Moon cx={232} cy={236} r={78} />
      </g>
      <g className="layer far">
        <path
          d="M0 335 L35 302 L70 322 L110 282 L150 325 L190 298 L238 332 L282 296 L332 328 L372 302 L400 322 L400 400 L0 400 Z"
          fill="#1d2130"
        />
      </g>
      <g className="layer mid">
        <Castle x={322} y={350} s={1.15} fill="#0f121b" />
        <g fill="#0f121b">
          <rect x="168" y="330" width="104" height="8" />
          {[176, 196, 216, 236, 256].map((x) => (
            <path key={x} d={`M${x - 8} 338 h16 v22 h-3 a5 5 0 0 0 -10 0 h-3 z`} />
          ))}
        </g>
      </g>
      <Fog y={362} h={20} w={400} opacity={0.2} />
      <g className="layer near">
        <Pines x0={-20} x1={120} base={378} h={120} fill="#0b0e14" seed={5} />
        <path d="M0 376 L120 370 L190 385 L400 380 L400 860 L0 860 Z" fill="#0b0d12" />
      </g>
      <g className="layer front">
        <path d="M30 860 L60 400 Q100 376 160 382 L215 400 L250 860 Z" fill="url(#t-cliff)" />
        <Wanderer x={128} y={390} s={1.05} />
      </g>
      <Fog y={450} h={30} w={400} opacity={0.22} className="fog slow" />
      <Embers count={16} x={200} y={600} spread={380} seed={9} />
    </svg>
  );
}

/** The camp at dusk: tents, a banner, the fire, the castle far away. */
export function CampScene({
  lit = true,
  bloodMoon = false,
}: {
  lit?: boolean;
  bloodMoon?: boolean;
}) {
  return (
    <svg
      className="scene-art"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="c-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0a0d18" />
          <stop offset="55%" stopColor={bloodMoon ? "#3a161a" : "#22283d"} />
          <stop offset="100%" stopColor="#5a3a22" />
        </linearGradient>
        <radialGradient id="c-glow" cx="50%" cy="80%" r="45%">
          <stop offset="0%" stopColor="#ff9a3c" stopOpacity={lit ? 0.85 : 0.12} />
          <stop offset="100%" stopColor="#ff9a3c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="c-tent" x1="0" x2="1">
          <stop offset="0%" stopColor="#6b4f37" />
          <stop offset="100%" stopColor="#2a1f16" />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill="url(#c-sky)" />
      <Stars count={40} w={400} h={110} seed={21} />
      <g className="layer far">
        <Moon cx={318} cy={50} r={22} tone={bloodMoon ? "blood" : "gold"} />
        <Castle x={330} y={150} s={0.55} fill="#151926" />
      </g>
      <g className="layer mid">
        <Pines x0={-10} x1={150} base={168} h={80} fill="#0f131c" seed={2} />
        <Pines x0={250} x1={420} base={172} h={70} fill="#0f131c" seed={4} />
      </g>
      <rect y="160" width="400" height="80" fill="#1e1610" />
      <rect y="120" width="400" height="120" fill="url(#c-glow)" />
      {/* Tents */}
      <g>
        <path d="M40 200 L95 120 L150 200 Z" fill="url(#c-tent)" />
        <path
          d="M95 120 L82 200 L108 200 Z"
          fill={lit ? "#ffb35c" : "#2a2018"}
          opacity={lit ? 0.5 : 1}
        />
        <path d="M95 120 L96 112" stroke="#6b5440" strokeWidth="2" />
        <path d="M250 205 L300 135 L350 205 Z" fill="url(#c-tent)" />
        <path
          d="M300 135 L290 205 L310 205 Z"
          fill={lit ? "#ffb35c" : "#2a2018"}
          opacity={lit ? 0.35 : 1}
        />
      </g>
      {/* Banner */}
      <g className="banner">
        <path d="M222 205 L222 92" stroke="#5a4634" strokeWidth="2.5" />
        <path d="M223 96 L250 98 L250 140 L237 132 L223 140 Z" fill="#8f1d1a" />
        <path d="M236 108 l4 6 l-4 6 l-4 -6 z" fill="#d4a24c" />
      </g>
      {/* Barrels and logs */}
      <g fill="#2a1f16">
        <rect x="160" y="190" width="14" height="18" rx="3" />
        <rect x="176" y="194" width="12" height="14" rx="3" />
        <rect x="150" y="214" width="34" height="7" rx="3" />
        <rect x="222" y="214" width="34" height="7" rx="3" />
      </g>
      <Fire x={203} y={216} s={1.5} lit={lit} />
      {lit && <Embers count={14} x={203} y={196} spread={26} seed={13} />}
    </svg>
  );
}

/** Flames over crossed logs. Flames flicker in CSS. */
export function Fire({
  x,
  y,
  s = 1,
  lit = true,
}: {
  x: number;
  y: number;
  s?: number;
  lit?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id="flame-out" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor="#ff6a1a" />
          <stop offset="60%" stopColor="#ffb02e" />
          <stop offset="100%" stopColor="#ffe28a" />
        </linearGradient>
        <linearGradient id="flame-in" x1="0" x2="0" y1="1" y2="0">
          <stop offset="0%" stopColor="#fff2c2" />
          <stop offset="100%" stopColor="#ffd36b" />
        </linearGradient>
      </defs>
      <path d="M-22 4 L20 -6 L22 0 L-20 10 Z" fill="#3b2a1c" />
      <path d="M-20 -6 L22 4 L20 10 L-22 0 Z" fill="#2d2015" />
      {lit ? (
        <g className="flames">
          <path
            className="flame f1"
            d="M0 -2 C-16 -10 -12 -28 -4 -38 C-6 -26 2 -24 2 -34 C10 -24 16 -16 10 -4 C8 0 4 0 0 -2 Z"
            fill="url(#flame-out)"
          />
          <path
            className="flame f2"
            d="M-2 -2 C-10 -8 -8 -20 -2 -26 C-2 -18 4 -18 4 -24 C9 -16 8 -8 4 -3 Z"
            fill="url(#flame-in)"
          />
          <path
            className="flame f3"
            d="M-10 -2 C-16 -6 -15 -14 -12 -18 C-10 -12 -8 -12 -7 -14 C-5 -9 -6 -4 -10 -2 Z"
            fill="#ff8a2a"
          />
        </g>
      ) : (
        <g fill="#5a4a3e" opacity="0.6">
          <circle cx="-4" cy="-4" r="2" />
          <circle cx="4" cy="-3" r="1.5" />
        </g>
      )}
    </g>
  );
}

/** A close-up of the campfire for the rest card. */
export function FireArt({ lit = true }: { lit?: boolean }) {
  return (
    <svg
      className="scene-art"
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <radialGradient id="fa-bg" cx="50%" cy="75%" r="70%">
          <stop offset="0%" stopColor={lit ? "#6b3313" : "#2a2420"} />
          <stop offset="100%" stopColor="#0c0b0a" />
        </radialGradient>
      </defs>
      <rect width="120" height="120" fill="url(#fa-bg)" />
      <g fill="#1d1712">
        <ellipse cx="22" cy="104" rx="14" ry="6" />
        <ellipse cx="98" cy="106" rx="16" ry="6" />
        <circle cx="30" cy="96" r="6" />
        <circle cx="90" cy="98" r="5" />
      </g>
      <Fire x={60} y={98} s={1.9} lit={lit} />
      {lit && <Embers count={8} x={60} y={70} spread={30} seed={17} />}
    </svg>
  );
}

/** The blood moon rising over the castle. */
export function BloodMoonArt() {
  return (
    <svg
      className="scene-art"
      viewBox="0 0 120 120"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="bm-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#12070a" />
          <stop offset="100%" stopColor="#3a0f10" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#bm-sky)" />
      <Stars count={14} w={120} h={60} seed={31} />
      <Moon cx={58} cy={48} r={26} tone="blood" />
      <Castle x={70} y={112} s={0.42} fill="#0d0608" lit="#ff7b5c" />
      <Pines x0={-6} x1={40} base={118} h={30} fill="#0a0406" seed={33} />
    </svg>
  );
}

/** Behind every fight: a sky, a moon, ruins, fog. Bosses and the blood moon turn it red. */
export function CombatBackdrop({ tone = "pale" }: { tone?: "pale" | "blood" | "gold" }) {
  const sky =
    tone === "blood" ? ["#0d0507", "#3b0d0e", "#140708"] : ["#06080e", "#1b2131", "#0b0c11"];
  return (
    <svg
      className="scene-art"
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={`cb-sky-${tone}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="65%" stopColor={sky[1]} />
          <stop offset="100%" stopColor={sky[2]} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#cb-sky-${tone})`} />
      <Stars count={50} w={400} h={170} seed={41} />
      <g className="layer far">
        <Moon cx={290} cy={120} r={62} tone={tone} />
      </g>
      <g className="layer mid" fill="#0c0e15">
        <path d="M0 300 L0 150 L14 150 L14 120 L26 120 L26 150 L40 150 L40 210 L70 210 L70 180 L80 170 L90 180 L90 230 L120 240 L120 300 Z" />
        <path d="M400 300 L400 170 L388 170 L388 140 L376 140 L376 170 L360 170 L356 210 L330 214 L330 196 L318 186 L306 196 L304 240 L280 250 L280 300 Z" />
      </g>
      <Fog y={250} h={30} w={400} opacity={0.25} color="#8a93a8" />
      <rect y="250" width="400" height="50" fill="#07080b" opacity="0.7" />
    </svg>
  );
}

/** A hero portrait for the medallions: a bust lit from the side, tinted by class. */
export function Portrait({ classId }: { classId?: string | null }) {
  const tone =
    { warrior: "#8f2a1e", ranger: "#2f5a35", occultist: "#4b2a63" }[classId ?? ""] ?? "#6b4a1e";
  const id = `pt-${classId ?? "none"}`;
  return (
    <svg className="portrait-art" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id={`${id}-bg`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={tone} />
          <stop offset="100%" stopColor="#0a0b10" />
        </radialGradient>
        <linearGradient id={`${id}-skin`} x1="0" x2="1">
          <stop offset="0%" stopColor="#e9c49a" />
          <stop offset="100%" stopColor="#7a5236" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${id}-bg)`} />
      <path d="M14 100 C16 78 30 70 50 68 C70 70 84 78 86 100 Z" fill="#15161c" />
      <path d="M30 100 C34 84 42 78 50 78 C58 78 66 84 70 100 Z" fill={tone} opacity="0.55" />
      <path d="M40 66 L40 74 C44 78 56 78 60 74 L60 66 Z" fill="#8a5d3d" />
      <ellipse cx="50" cy="46" rx="16" ry="20" fill={`url(#${id}-skin)`} />
      <path
        d="M33 44 C30 20 48 14 58 18 C70 22 72 36 67 48 C66 38 62 30 54 30 C46 32 40 34 36 50 Z"
        fill="#1a120d"
      />
      <path d="M33 44 C32 58 36 70 42 76 L40 58 Z" fill="#1a120d" />
      <path d="M43 46 h5 M53 46 h5" stroke="#2a1a12" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M46 58 q4 2 8 0"
        stroke="#5a3424"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M66 34 C70 44 68 58 62 66"
        stroke="#f2c26b"
        strokeWidth="0.8"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}
