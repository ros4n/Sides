// Authored photocopier-toner grain tiles (real raster, not feTurbulence).
// Output: public/textures/grain-light.png, grain-dark.png
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const OUT = "./public/textures";
mkdirSync(OUT, { recursive: true });
const SIZE = 320;

// A speckled alpha mask: gaussian noise, softened, contrast-pushed so it
// clumps into toner flecks rather than even TV static.
async function grainMask(sigma) {
  const noise = sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 1,
      noise: { type: "gaussian", mean: 128, sigma },
    },
  });
  return noise
    .blur(0.6)
    .linear(2.4, -180) // steepen: most of the field goes to 0, flecks survive
    .gamma(2.2)
    .png()
    .toBuffer();
}

async function build(name, ink, sigma, maxAlpha) {
  const mask = await grainMask(sigma);
  // Colourise: flat ink, alpha driven by the mask, capped low so it reads as
  // a print artefact and never fights body text.
  const { data, info } = await sharp(mask)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const v = data[i * info.channels]; // grey value == fleck strength
    out[i * 4 + 0] = ink[0];
    out[i * 4 + 1] = ink[1];
    out[i * 4 + 2] = ink[2];
    out[i * 4 + 3] = Math.round((v / 255) * maxAlpha);
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${name}.png`);
  console.log("wrote", name);
}

await build("grain-light", [26, 23, 20], 34, 46); // dark toner flecks on paper
await build("grain-dark", [239, 231, 214], 30, 30); // light flecks on night pulp
console.log("done");
