/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Form, theme } from '@bedrock-core/ore-styled';
import { Panel, Text, type FunctionComponent, type JSX } from '@bedrock-core/ui-runtime';
import { i18n } from '../i18n';

/**
 * The step in front of a reset, as a compiled modal: the native modal's two
 * controls are its submit and its dismiss, which is exactly a confirm/cancel
 * pair. What the question names — the scope or the entity being reset — is
 * only known when it is asked, so the title and the question are live rows;
 * the warning and the buttons are baked. Both answers lead somewhere the
 * host decides: the screen that asked, or what follows the reset.
 */

const { spacing, fontColor } = theme.tokens;
const header = theme.components.header;

/** Characters the live title and question reserve. */
const TITLE_MAX = 48;
const QUESTION_MAX = 96;

// A modal button's label bakes as text: the package's default locale, as the editor's do.
const { key, t } = i18n;

export interface ConfirmModel {
  /** The trail the screen is titled with, resolved for the viewing player. */
  title: string;
  /** The question, with what it names filled in, in the viewing player's language. */
  question: string;
  onConfirm?: () => unknown;
  onCancel?: () => unknown;
}

export interface ConfirmResetProps {
  model?: ConfirmModel;
}

const EMPTY_MODEL: ConfirmModel = { title: '', question: '' };

export const ConfirmReset: FunctionComponent<ConfirmResetProps> = ({ model = EMPTY_MODEL }: ConfirmResetProps): JSX.Element => (
  <Form onSubmit={(): unknown => model.onConfirm?.()} onCancel={(): unknown => model.onCancel?.()}>
    <Card variant={'raised'} flexDirection={'column'} gap={0} padding={0}>
      <Panel flexDirection={'row'} alignItems={'center'} gap={header.gap} padding={header.padding} marginTop={1} marginLeft={1} marginRight={1} background={header.textures.background}>
        <Panel width={header.iconSize} height={header.iconSize} />
        <Panel flexGrow={1} flexShrink={1} justifyContent={'center'} alignItems={'center'}>
          <Text font={header.textStyle.font} scale={header.textStyle.scale} maxLines={1} maxLength={TITLE_MAX}>{`${header.textStyle.color}${model.title}`}</Text>
        </Panel>
        <Panel width={header.iconSize} height={header.iconSize} />
      </Panel>
      <Panel flexDirection={'column'} gap={spacing.md} padding={spacing.sm}>
        <Text wordBreak={'break-word'} maxLength={QUESTION_MAX}>{model.question}</Text>
        <Text wordBreak={'break-word'}>{`${fontColor.muted}${key($ => $.reset.warning)}`}</Text>
        <Panel flexDirection={'row'} gap={spacing.sm}>
          <Form.Button type={'submit'} label={t($ => $.action.reset)} variant={'danger'} flex={2} />
          <Form.Button type={'exit'} label={t($ => $.action.back)} variant={'contrast'} flex={1} />
        </Panel>
      </Panel>
    </Card>
  </Form>
);

/** The confirmation filled with one present's model, for `render()`. */
export const confirmResetElement = (model: ConfirmModel): JSX.Element => <ConfirmReset model={model} />;
