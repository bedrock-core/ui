/** @jsxImportSource @bedrock-core/ui */
import { Card, Form, theme } from '@bedrock-core/ore-styled';
import { Panel, Scroll, Text, type JSX, type SubmitEvent } from '@bedrock-core/ui';
import { i18n } from '../i18n';

/**
 * A modal with one field of every kind, on the theme's faces.
 *
 * The fields are the engine's — the edit box, the switches, the slider and
 * the choosers read and write the answer — and the compiled screen places
 * each one where the layout put it. More of them than the frame holds, so
 * they sit in a scroll; the heading and both buttons stay put and are the
 * pack's.
 */

const { spacing } = theme.tokens;
const { key, t } = i18n;

const FRAME = { width: 300, height: 200 } as const;
const BUTTON_WIDTH = 96;
const BUTTON_HEIGHT = 24;
const TITLE_HEIGHT = 10;
/** The scroll track the layout reserves beside the fields. */
const TRACK = 5;

export interface PreferencesProps {
  onSubmit?: (event: SubmitEvent) => void;
}

export default function Preferences({ onSubmit }: PreferencesProps): JSX.Element {
  const content = FRAME.width - 2 * spacing.md;
  const fieldsHeight = FRAME.height - 2 * spacing.md - TITLE_HEIGHT - BUTTON_HEIGHT - 2 * spacing.sm;

  return (
    <Form onSubmit={onSubmit}>
      <Card variant={'raised'} width={FRAME.width} height={FRAME.height} padding={spacing.md} gap={spacing.sm} flexDirection={'column'}>
        <Text width={content} height={TITLE_HEIGHT} textAlign={'center'} font={'minecraftTen'} shadow={true}>{key($ => $.ui.preferences.title)}</Text>
        <Scroll width={content} height={fieldsHeight}>
          <Panel flexDirection={'column'} gap={spacing.sm} width={content - TRACK}>
            <Form.Input name={'nickname'} label={t($ => $.ui.preferences.nickname)} placeholder={t($ => $.ui.preferences.nicknamePlaceholder)} />
            <Form.Toggle name={'coordinates'} label={t($ => $.ui.preferences.coordinates)} defaultValue={true} />
            <Form.Checkbox name={'tips'} label={t($ => $.ui.preferences.tips)} defaultValue={true} />
            <Form.Slider name={'volume'} label={t($ => $.ui.preferences.volume)} min={0} max={10} step={1} defaultValue={7} />
            <Form.Dropdown name={'team'} label={t($ => $.ui.preferences.team)} options={['Red', 'Blue', 'Green']} defaultValue={'Blue'} />
            <Form.Radio
              name={'view'}
              label={t($ => $.ui.preferences.view)}
              options={[
                { value: 'first', label: t($ => $.ui.preferences.viewFirst) },
                { value: 'third', label: t($ => $.ui.preferences.viewThird) },
              ]}
            />
            <Form.ToggleButton
              name={'difficulty'}
              label={t($ => $.ui.preferences.difficulty)}
              defaultValue={'normal'}
              options={[
                { value: 'easy', label: t($ => $.ui.preferences.difficultyEasy) },
                { value: 'normal', label: t($ => $.ui.preferences.difficultyNormal) },
                { value: 'hard', label: t($ => $.ui.preferences.difficultyHard) },
              ]}
            />
          </Panel>
        </Scroll>
        <Panel flexDirection={'row'} justifyContent={'flex-end'} gap={spacing.sm}>
          <Form.Button type={'exit'} variant={'secondary'} width={BUTTON_WIDTH} label={t($ => $.ui.preferences.cancel)} />
          <Form.Button type={'submit'} variant={'primary'} width={BUTTON_WIDTH} label={t($ => $.ui.preferences.save)} />
        </Panel>
      </Card>
    </Form>
  );
}

/** The screen with its submit handler, for `render()`. */
export const preferencesElement = (onSubmit: (event: SubmitEvent) => void): JSX.Element => <Preferences onSubmit={onSubmit} />;
