/** @jsxImportSource @bedrock-core/ui */
import { Button, Card, Header, theme } from '@bedrock-core/ore-styled';
import { List, Panel, Scroll, Text, useExit, type JSX, type PressEvent } from '@bedrock-core/ui';
import { i18n } from '../i18n';

/**
 * The players online, one row each, on an action form.
 *
 * The rows are a `<List max>` inside a `<Scroll>`: the build compiles the
 * capacity, the count travels as one entry, and every row's name is live.
 * The screen takes its rows as a prop and renders empty without them, which
 * is how the build sees it.
 */

const { spacing } = theme.tokens;
const { key, t } = i18n;

const FRAME = { width: 300, height: 200 } as const;
/** The theme's header, plus the margin it keeps from the card's edge. */
const HEADER_HEIGHT = 24;
const ROWS_MAX = 12;
const ROW_HEIGHT = 22;
const NAME_MAX = 16;
const COUNT_MAX = 12;
/** One line of the default font. */
const COUNT_HEIGHT = 10;
/** The scroll track the layout reserves beside the rows. */
const TRACK = 5;

export interface PlayerRow {
  name: string;
  onVisit: (event: PressEvent) => unknown;
}

export interface PlayersProps {
  players?: readonly PlayerRow[];
}

export default function Players({ players = [] }: PlayersProps): JSX.Element {
  const exit = useExit();
  const content = FRAME.width - 2 * spacing.md;
  const rowWidth = content - TRACK;
  const listHeight = FRAME.height - HEADER_HEIGHT - 3 * spacing.md - COUNT_HEIGHT;

  return (
    <Card variant={'raised'} width={FRAME.width} height={FRAME.height} padding={0} gap={0}>
      <Header title={key($ => $.ui.players.title)} onClose={exit} />
      <Panel flexDirection={'column'} padding={spacing.md} gap={spacing.md}>
        <Scroll width={content} height={listHeight}>
          <List
            max={ROWS_MAX}
            items={players}
            gap={spacing.xs}
            row={(player: PlayerRow | undefined): JSX.Element => (
              <Panel flexDirection={'row'} alignItems={'center'} width={rowWidth} height={ROW_HEIGHT} gap={spacing.sm}>
                <Text flexGrow={1} flexShrink={1} maxLength={NAME_MAX}>{player?.name ?? ''}</Text>
                <Button variant={'secondary'} onPress={(event: PressEvent): unknown => player?.onVisit(event)}>
                  {t($ => $.ui.players.visit)}
                </Button>
              </Panel>
            )}
          />
        </Scroll>
        <Text width={content} textAlign={'right'} maxLength={COUNT_MAX} color={[0.7, 0.7, 0.7]}>
          {t($ => $.ui.players.count, { count: players.length })}
        </Text>
      </Panel>
    </Card>
  );
}

/** The screen filled with one viewer's rows, for `render()`. */
export const playersElement = (players: readonly PlayerRow[]): JSX.Element => <Players players={players} />;
