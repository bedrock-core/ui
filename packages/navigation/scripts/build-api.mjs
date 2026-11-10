import { emitApiLibrary } from '@bedrock-core/builder-bundler';
import { fileURLToPath } from 'node:url';

await emitApiLibrary({
  root: fileURLToPath(new URL('../', import.meta.url)),
  entry: 'src/core/api.ts',
  output: 'dist/core/api.ts',
});
