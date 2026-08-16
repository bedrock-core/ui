/** @jsxImportSource @bedrock-core/ui-runtime */
import { Card, Divider, Button as OreButton } from '@bedrock-core/ore-styled';
import { Image, Panel, Text, type JSX } from '@bedrock-core/ui-runtime';
import { describe, expect, it } from 'vitest';
import type { GuideBlock } from '../../types';
import { GuideBlockList } from '../GuideBlockList';

// The JSX runtime is lazy — elements are plain `{ type, props }` records and
// function components are not invoked until render. That lets these tests
// assert the exact component mapping per IR block without a render session.

interface LazyElement {
  type: unknown;
  props: Record<string, unknown> & { children?: unknown };
}

function renderBlocks(blocks: GuideBlock[], extra?: Partial<Parameters<typeof GuideBlockList>[0]>): LazyElement[] {
  const root = GuideBlockList({ blocks, ns: 'demo', ...extra }) as unknown as LazyElement;

  expect(root.type).toBe(Panel);

  return root.props.children as LazyElement[];
}

/** Flatten possibly-nested lazy children into a list of elements. */
function childrenOf(element: LazyElement): LazyElement[] {
  const children = element.props.children;

  if (children === undefined || children === null) { return []; }

  return (Array.isArray(children) ? children : [children]).filter(Boolean) as LazyElement[];
}

describe('GuideBlockList block mapping', () => {
  it('renders h1 with minecraftTen and deeper headings with mojangles scales', () => {
    const [h1, h2, h3] = renderBlocks([
      { t: 'h', l: 1, k: 'k1' },
      { t: 'h', l: 2, k: 'k2' },
      { t: 'h', l: 3, k: 'k3' },
    ]);

    expect(h1.type).toBe(Text);
    expect(h1.props.font).toBe('minecraftTen');
    expect(h1.props.children).toBe('k1');
    expect(h2.props.font).toBe('mojangles');
    expect(h2.props.scale).toBe(1.5);
    expect(h3.props.scale).toBe(1.25);
  });

  it('renders a single-run paragraph as a wrapping row of one localized Text', () => {
    const [p] = renderBlocks([{ t: 'p', runs: [{ k: 'body' }] }]);

    expect(p.type).toBe(Panel);
    const [text] = childrenOf(p);

    expect(text.type).toBe(Text);
    expect(text.props.children).toBe('body');
    expect(text.props.wordBreak).toBe('break-word');
  });

  it('renders a link run as a transparent button positioned inline with the text', () => {
    const onNavigate = (): void => undefined;
    const [p] = renderBlocks(
      [{ t: 'p', runs: [{ k: 'lead' }, { k: 'label', to: 'other/page' }] }],
      { onNavigate },
    );
    const [lead, button] = childrenOf(p);

    expect(lead.type).toBe(Text);
    expect(lead.props.children).toBe('lead');
    expect(button.type).toBe(OreButton);
    expect(button.props.variant).toBe('transparent');
    expect(typeof button.props.onPress).toBe('function');
    const [label] = childrenOf(button);

    expect(label.type).toBe(Text);
    expect(label.props.children).toBe('label');
  });

  it('renders unordered and ordered lists with bullets and numbering', () => {
    const [ul, ol] = renderBlocks([
      { t: 'ul', items: [{ runs: [{ k: 'a' }] }, { runs: [{ k: 'b' }], items: [{ runs: [{ k: 'b1' }] }] }] },
      { t: 'ol', items: [{ runs: [{ k: 'c' }] }], start: 3 },
    ]);
    const ulRows = childrenOf(ul);
    const [bullet] = childrenOf(childrenOf(ulRows[0])[0]);

    expect((bullet.props as { children: string }).children).toBe('§7•');

    const olRows = childrenOf(ol);
    const [num] = childrenOf(childrenOf(olRows[0])[0]);

    expect((num.props as { children: string }).children).toBe('§73.');
  });

  it('renders images with aspect ratio when dimensions are known', () => {
    const [sized, unsized] = renderBlocks([
      { t: 'img', src: 'textures/ui/demo', w: 32, h: 16 },
      { t: 'img', src: 'textures/ui/other' },
    ]);

    expect(sized.type).toBe(Image);
    expect(sized.props.aspectRatio).toBe(2);
    expect(sized.props.height).toBe(16);
    expect(sized.props.alignSelf).toBe('center');
    expect(unsized.props.height).toBe(40);
  });

  it('caps a large/square image height instead of stretching it to fill the column', () => {
    const [square] = renderBlocks([{ t: 'img', src: 'textures/ui/pack_icon', w: 2048, h: 2048 }]);

    expect(square.props.aspectRatio).toBe(1);
    expect(square.props.height).toBe(120);
  });

  it('renders admonitions in a dark card with the default kind title key', () => {
    const [adm] = renderBlocks([{ t: 'adm', kind: 'tip', blocks: [{ t: 'p', runs: [{ k: 'inner' }] }] }]);

    expect(adm.type).toBe(Card);
    expect(adm.props.variant).toBe('dark');
    const [title, body] = childrenOf(adm);

    expect(title.props.children).toBe('core.guides.adm.tip');
    expect(body.type).toBe(GuideBlockList);
  });

  it('prefers a custom admonition title key', () => {
    const [adm] = renderBlocks([{ t: 'adm', kind: 'warning', titleK: 'custom', blocks: [] }]);
    const [title] = childrenOf(adm);

    expect(title.props.children).toBe('custom');
  });

  it('renders code blocks as raw §7 lines in a dark card', () => {
    const [code] = renderBlocks([{ t: 'code', lang: 'ts', lines: ['const a = 1;', ''] }]);

    expect(code.type).toBe(Card);
    const lines = childrenOf(code);

    expect((lines[0].props as { children: string }).children).toBe('§7const a = 1;');
    expect((lines[1].props as { children: string }).children).toBe('§7 ');
  });

  it('renders hr as a Divider', () => {
    const [hr] = renderBlocks([{ t: 'hr' }]);

    expect(hr.type).toBe(Divider);
  });

  it('renders registered cmp blocks with spread props', () => {
    const Custom = (props: { item: string }): JSX.Element => <Text>{props.item}</Text>;
    const [cmp] = renderBlocks(
      [{ t: 'cmp', name: 'Custom', props: { item: 'minecraft:diamond' } }],
      { components: { Custom } },
    );

    expect(cmp.type).toBe(Custom);
    expect(cmp.props.item).toBe('minecraft:diamond');
  });

  it('renders unregistered cmp blocks as a placeholder', () => {
    const [cmp] = renderBlocks([{ t: 'cmp', name: 'Mystery' }]);

    expect(cmp.type).toBe(Card);
    const [text] = childrenOf(cmp);

    expect((text.props as { children: string }).children).toBe('§8[unsupported content: Mystery]');
  });
});
