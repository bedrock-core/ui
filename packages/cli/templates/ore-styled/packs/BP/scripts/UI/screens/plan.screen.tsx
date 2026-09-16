/** @jsxImportSource @bedrock-core/ui */
import { Button, Card, Divider, theme } from '@bedrock-core/ui/ore-styled';
import { type JSX, Panel, Screen, Text } from '@bedrock-core/ui';

const { fontColor, spacing } = theme.tokens;

export interface PlanProps {
  /** Carried across from Home's navigate() call — see `NavigateOptions.params`. */
  plan: string;
}

/** Compiled as `{{CREATOR_ID}}_{{PACK_ID}}:plan`. */
export default function Plan({ plan }: PlanProps): JSX.Element {
  return (
    <Screen>
      <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
        <Text>{'§lYour plan'}</Text>

        <Card>
          {/* `plan` differs by call, exactly like state does, so it also needs maxLength. */}
          <Text maxLength={40}>{`${fontColor.muted}Selected plan: ${fontColor.default}§l${plan}`}</Text>
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
