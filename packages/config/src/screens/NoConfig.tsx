/** @jsxImportSource @bedrock-core/ui-runtime */
/**
 * What a config screen shows when the addon it was asked about has published no config schema.
 *
 * Reachable in normal use: the registry lists every addon, schemas replicate independently of
 * registration, and a peer that registered a moment ago may not have broadcast one yet.
 */
import { Card, theme } from '@bedrock-core/ore-styled';
import { Button, Text, type JSX } from '@bedrock-core/ui-runtime';

const { spacing } = theme.tokens;

export function NoConfig({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <Card flexDirection={'column'} padding={12} gap={spacing.sm}>
      <Text>{'No published config for this addon.'}</Text>
      <Button onPress={onBack}>{'Back'}</Button>
    </Card>
  );
}
