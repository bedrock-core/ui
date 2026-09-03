/** @jsxImportSource @bedrock-core/ui */
import { Card, Divider, Form } from '@bedrock-core/ore-styled';
import { List, Panel, Text, useExit, useState, type JSX } from '@bedrock-core/ui';
import type { SubmitEvent } from '@bedrock-core/ui';

/**
 * The shape of a generic config screen, as a probe: ONE compiled modal whose
 * rows are a `<List max>` of entries, each row holding every native field a
 * row may need — here a toggle and an input — with the field a row shows
 * decided per present by a carried visibility. The schema an addon publishes
 * at runtime fills this shape; nothing of it is baked.
 *
 * `kinds` is one string, a letter per row (`t` toggle, `i` input, anything
 * else no field): the build's liveness probe perturbs strings, which is how
 * every row's visibility is found to be carried rather than baked.
 */
const ROWS = 4;

/**
 * One box every field of a row shares: the fields sit over each other and
 * only one shows, so a row is as tall as its tallest field rather than as
 * tall as all of them — a hidden field keeps its frozen space otherwise.
 */
const FIELD_HEIGHT = 22;

const kindOf = (kinds: string, index: number): 't' | 'i' | undefined => {
  const letter = kinds[index];

  return letter === 't' || letter === 'i' ? letter : undefined;
};

export default function ConfigProbe(): JSX.Element {
  const [kinds] = useState('titi');
  const exit = useExit();

  function handleSubmit({ values }: SubmitEvent): void {
    console.info(`[ui] config probe submit ${JSON.stringify(values)}`);
    exit();
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0} paddingTop={1} paddingBottom={4}>
        <Text font={'minecraftTen'} scale={1.2} marginLeft={6} marginTop={4}>{'§0Config probe'}</Text>
        <Panel flexDirection={'column'} gap={4} padding={4}>
          <List
            max={ROWS}
            items={Array.from({ length: ROWS }, (_, index) => index)}
            row={(index: number | undefined): JSX.Element => {
              const at = index ?? 0;
              const kind = kindOf(kinds, at);

              return (
                <Panel flexDirection={'column'} gap={2}>
                  <Text maxLength={12}>{`§7entry ${String(at + 1)}`}</Text>
                  <Panel height={FIELD_HEIGHT}>
                    {kind === 't' && <Form.Toggle label={''} name={`f${String(at)}`} defaultValue={at % 2 === 0} position={'absolute'} left={0} top={0} />}
                    {kind === 'i' && <Form.Input label={''} name={`f${String(at)}`} defaultValue={`v${String(at)}`} position={'absolute'} left={0} right={0} top={0} height={FIELD_HEIGHT} />}
                  </Panel>
                  <Divider />
                </Panel>
              );
            }}
          />
          <Panel flexDirection={'row'} gap={4}>
            <Form.Button type={'submit'} label={'Save'} flex={2} />
            <Form.Button type={'exit'} label={'Close'} flex={1} />
          </Panel>
        </Panel>
      </Card>
    </Form>
  );
}
