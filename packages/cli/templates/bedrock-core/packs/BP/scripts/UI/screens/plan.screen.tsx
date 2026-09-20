/** @jsxImportSource @bedrock-core/ui */
import { Button, Card, Divider, theme } from '@bedrock-core/ui/ore-styled';
import { type JSX, Panel, Screen, Text } from '@bedrock-core/ui';

const { fontColor, spacing } = theme.tokens;

/** Compiled as `{{CREATOR_ID}}_{{PACK_ID}}:plan`. */
export default function Plan(): JSX.Element {
  return (
    <Screen>
      <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
        <Text>{'§lYour plan'}</Text>

        <Card>
          <Text>{`${fontColor.muted}Add the selected plan details here.`}</Text>
          <Divider />
          <Text>{`${fontColor.disabled}What the plan includes goes here.`}</Text>
        </Card>

        {/* `back` returns to whatever screen navigated here — no key to name. */}
        <Button variant={'secondary'} back>
          {`${fontColor.default}<- Go Back`}
        </Button>
      </Panel>
    </Screen>
  );
}
