import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(packageRoot, '..', '..');
const DEFAULT_FONT_LIST = path.resolve(workspaceRoot, 'assets', 'fonts.md');

const DEFAULT_OUTPUT = path.resolve(packageRoot, 'src', 'util', 'font-metrics.generated.json');

const DEFAULT_CONFIG = {
  mojangles: {
    lineHeight: 10,
    fallbackWidth: 6,
  },
  // MinecraftTen renders at the same em size as mojangles (advances anchored at
  // pxPerEm 10), but its glyphs are TALLER: hhea ascender-descender is 1.24em,
  // so a line occupies ~12.4px where mojangles occupies 10. Underestimating this
  // clipped the bottom of wrap_box'd headings (the box height IS the measured
  // height and clips_children).
  minecraftTen: {
    lineHeight: 12.4,
    fallbackWidth: 6,
    pxPerEm: 10,
  },
  // Fonts that share glyph metrics with another profile (no separate .ttf needed).
  // key = font name used in TextFont, value = profile name whose metrics to reuse.
  aliases: {},
};

function parseArgs(argv) {
  const args = {};

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const value = argv[i + 1];

    if (!value || value.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = value;
    i++;
  }

  return args;
}

function buildCodepointList() {
  const set = new Set();

  for (let cp = 32; cp <= 255; cp++) {
    set.add(cp);
  }

  // Add symbols frequently used in Bedrock UI strings.
  for (const cp of [0x20ac, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193]) {
    set.add(cp);
  }

  return Array.from(set.values());
}

async function readFontList(fontListPath) {
  const content = await fs.readFile(fontListPath, 'utf8');
  const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean);

  if (lines.length < 2) {
    throw new Error(`Expected two font paths (mojangles, minecraftTen) in ${fontListPath}`);
  }

  return {
    mojangles: lines[0],
    minecraftTen: lines[1],
  };
}

function resolveAdvance(font, cp, pxPerEm, fallbackWidth) {
  const glyph = font.charToGlyph(String.fromCodePoint(cp));

  if (!glyph || glyph.unicode === undefined) {
    return fallbackWidth;
  }

  const advanceUnits = glyph.advanceWidth ?? font.unitsPerEm;
  const advance = (advanceUnits / font.unitsPerEm) * pxPerEm;

  return Math.max(1, Math.round(advance));
}

function extractProfile(font, lineHeight, fallbackWidth, pxPerEm = lineHeight) {
  const codepoints = buildCodepointList();
  const glyphWidths = {};

  // The advance anchor (px per em) and the line height are separate: Bedrock
  // renders every font at the same em size (10px at scale 1), but a font's
  // glyphs may occupy more vertical space than that em (MinecraftTen: 1.24em).

  for (const cp of codepoints) {
    glyphWidths[String(cp)] = resolveAdvance(font, cp, pxPerEm, fallbackWidth);
  }

  return {
    lineHeight,
    fallbackWidth,
    // Bold draws each glyph twice shifted 1px right (shadow), extending the
    // advance by 1px beyond the normal glyph + spacing.
    boldOffset: 1,
    glyphWidths,
  };
}

async function loadFont(fontPath) {
  return new Promise((resolve, reject) => {
    opentype.load(fontPath, (err, font) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(font);
    });
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const outputPath = path.resolve(args.output ?? DEFAULT_OUTPUT);
  const fontListPath = path.resolve(args.fonts ?? DEFAULT_FONT_LIST);

  const defaultPaths = await readFontList(fontListPath);

  const config = {
    mojangles: {
      path: path.resolve(args.mojangles ?? defaultPaths.mojangles),
      lineHeight: Number(args.mojanglesLineHeight ?? DEFAULT_CONFIG.mojangles.lineHeight),
      fallbackWidth: Number(args.mojanglesFallbackWidth ?? DEFAULT_CONFIG.mojangles.fallbackWidth),
    },
    minecraftTen: {
      path: path.resolve(args.minecraftTen ?? defaultPaths.minecraftTen),
      lineHeight: Number(args.minecraftTenLineHeight ?? DEFAULT_CONFIG.minecraftTen.lineHeight),
      fallbackWidth: Number(args.minecraftTenFallbackWidth ?? DEFAULT_CONFIG.minecraftTen.fallbackWidth),
      pxPerEm: DEFAULT_CONFIG.minecraftTen.pxPerEm,
    },
  };

  const mojanglesFont = await loadFont(config.mojangles.path);
  const minecraftTenFont = await loadFont(config.minecraftTen.path);

  const output = {
    generatedAt: new Date().toISOString(),
    aliases: DEFAULT_CONFIG.aliases,
    profiles: {
      mojangles: extractProfile(
        mojanglesFont,
        config.mojangles.lineHeight,
        config.mojangles.fallbackWidth,
      ),
      minecraftTen: extractProfile(
        minecraftTenFont,
        config.minecraftTen.lineHeight,
        config.minecraftTen.fallbackWidth,
        config.minecraftTen.pxPerEm,
      ),
    },
  };

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  process.stdout.write(`Font metrics written to ${outputPath}\n`);
}

main().catch(error => {
  process.stderr.write(`Failed to generate font metrics: ${String(error)}\n`);
  process.exit(1);
});
