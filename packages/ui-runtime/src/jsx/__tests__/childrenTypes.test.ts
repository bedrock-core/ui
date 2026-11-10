import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const consumer = fileURLToPath(new URL('../../../../../scripts/__jsx_children_consumer__.tsx', import.meta.url)).replaceAll('\\', '/');

describe('public JSX children types', () => {
  it.each([
    { source: '@bedrock-core/ui', jsx: ts.JsxEmit.ReactJSX },
    { source: '@bedrock-core/ui-runtime', jsx: ts.JsxEmit.ReactJSX },
    { source: '@bedrock-core/ui', jsx: ts.JsxEmit.ReactJSXDev },
  ])('resolves $source exports with JSX mode $jsx', ({ source, jsx }) => {
    const code = `
      import { Button, Panel, Text, type JSX } from '${source}';
      const labels = ['One', 'Two'];
      export const direct = <Panel>{labels.map(label => <Button key={label} />)}</Panel>;
      export const mixed = <Panel><Text>{'Before'}</Text>{labels.map(label => <Button key={label} />)}<Text>{'After'}</Text></Panel>;
      export const fragment = <Panel><>{labels.map(label => <Button key={label} />)}</></Panel>;
      export const nested = <Panel>{labels.map(label => [false, null, undefined, [<Button key={label} />]])}</Panel>;
      export const conditional = <Panel>{labels.map(label => label.length > 0 && <Button key={label} />)}</Panel>;
      const Wrapper = ({ children }: { children?: JSX.Node }): JSX.Element => <Panel>{children}</Panel>;
      export const component = <Wrapper><Text>{'Before'}</Text>{labels.map(label => <Button key={label} />)}</Wrapper>;
      // @ts-expect-error Numeric children are not JSX nodes.
      export const invalid = <Panel>{42}</Panel>;
      // @ts-expect-error Text accepts a single display value.
      export const invalidText = <Text>{labels.map(label => <Button key={label} />)}</Text>;
    `;
    const options: ts.CompilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx,
      jsxImportSource: source,
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      resolveJsonModule: true,
      esModuleInterop: true,
      types: [],
    };
    const host = ts.createCompilerHost(options);
    const getSourceFile = host.getSourceFile;

    host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => fileName === consumer
      ? ts.createSourceFile(fileName, code, languageVersion, true, ts.ScriptKind.TSX)
      : getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);

    const program = ts.createProgram([consumer], options, host);
    const diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => ({
      file: diagnostic.file?.fileName,
      message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    }));

    expect(diagnostics).toEqual([]);
  }, 30_000);
});
