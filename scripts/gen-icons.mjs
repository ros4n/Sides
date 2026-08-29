// PWA / favicon icons — "Team Sheet Zine" world: an inked rubber-stamp ball
// on photocopy paper, slightly off-register.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";

const outDir = "./public/icons";
mkdirSync(outDir, { recursive: true });

const PAPER = "#efe7d6";
const INK = "#1a1714";
const RISO = "#2f3ae0";

const stamp = (bg, pad = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${bg === "none" ? 0 : 40}" fill="${bg === "none" ? "#00000000" : PAPER}"/>
  <g transform="translate(256,256) rotate(-4)">
    <!-- off-register riso shadow -->
    <circle cx="7" cy="9" r="${168 - pad}" fill="${RISO}" opacity="0.9"/>
    <!-- ink stamp ring, deliberately broken -->
    <circle r="${168 - pad}" fill="none" stroke="${INK}" stroke-width="26"
            stroke-dasharray="300 26 180 20 260 24" stroke-linecap="round"/>
    <!-- panels, hand-inked -->
    <g fill="${INK}">
      <polygon points="0,-64 60,-20 37,52 -37,52 -60,-20"/>
      <path d="M0,-150 L48,-116 L30,-86 L0,-98 L-30,-86 L-48,-116 Z"/>
      <path d="M138,-36 L138,28 L104,40 L86,-6 L110,-48 Z"/>
      <path d="M-138,-36 L-110,-48 L-86,-6 L-104,40 L-138,28 Z"/>
      <path d="M-64,138 L-86,88 L-48,66 L-13,106 L-41,138 Z"/>
      <path d="M64,138 L41,138 L13,106 L48,66 L86,88 Z"/>
    </g>
  </g>
</svg>`;

const jobs = [
  { name: "icon-192.png", size: 192, svg: stamp("solid") },
  { name: "icon-512.png", size: 512, svg: stamp("solid") },
  { name: "icon-maskable-512.png", size: 512, svg: stamp("solid", 26) },
  { name: "apple-touch-icon.png", size: 180, svg: stamp("solid") },
];

for (const j of jobs) {
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(`${outDir}/${j.name}`);
  console.log("wrote", j.name);
}
writeFileSync(`${outDir}/icon.svg`, stamp("solid"));
console.log("wrote icon.svg");
