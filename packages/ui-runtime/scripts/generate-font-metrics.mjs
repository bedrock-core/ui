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
  'minecraft-ten': {
    lineHeight: 9,
    fallbackWidth: 5,
  },
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
    throw new Error(`Expected at least two font paths in ${fontListPath}`);
  }

  return {
    mojangles: lines[0],
    'minecraft-ten': lines[1],
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

function extractProfile(font, lineHeight, fallbackWidth) {
  const codepoints = buildCodepointList();
  const glyphWidths = {};

  // In Bedrock UI our runtime line-height baseline is profile-specific.
  // Use it as the scale anchor so extracted advances are already in UI texels.
  const pxPerEm = lineHeight;

  for (const cp of codepoints) {
    glyphWidths[String(cp)] = resolveAdvance(font, cp, pxPerEm, fallbackWidth);
  }

  return {
    lineHeight,
    fallbackWidth,
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
    'minecraft-ten': {
      path: path.resolve(args.minecraftTen ?? defaultPaths['minecraft-ten']),
      lineHeight: Number(args.minecraftTenLineHeight ?? DEFAULT_CONFIG['minecraft-ten'].lineHeight),
      fallbackWidth: Number(args.minecraftTenFallbackWidth ?? DEFAULT_CONFIG['minecraft-ten'].fallbackWidth),
    },
  };

  const [mojanglesFont, tenFont] = await Promise.all([
    loadFont(config.mojangles.path),
    loadFont(config['minecraft-ten'].path),
  ]);

  const output = {
    generatedAt: new Date().toISOString(),
    profiles: {
      mojangles: extractProfile(
        mojanglesFont,
        config.mojangles.lineHeight,
        config.mojangles.fallbackWidth,
      ),
      'minecraft-ten': extractProfile(
        tenFont,
        config['minecraft-ten'].lineHeight,
        config['minecraft-ten'].fallbackWidth,
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
