import { Panel, Text, type JSX } from '@bedrock-core/ui';
import { Button } from '@bedrock-core/ore-styled';
import { useNavigation } from '@bedrock-core/navigation';

interface BackBarProps {
  title: string;
}

/**
 * Top bar with a back button and a title.
 * Reads navigation from context via useNavigation — no prop drilling needed.
 * Works inside any screen rendered by a stack navigator.
 */
export function BackBar({ title }: BackBarProps): JSX.Element {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic navigation; only uses goBack/canGoBack which need no type param
  const navigation = useNavigation<Record<string, any>>();

  return (
    <Panel flexDirection={'row'} alignItems={'center'} gap={8} padding={6}>
      <Button
        variant={'secondary'}
        onPress={(): void => navigation.goBack()}
        enabled={navigation.canGoBack()}
      >
        {'<- Back'}
      </Button>
      <Text>{`§f§l${title}`}</Text>
    </Panel>
  );
}
