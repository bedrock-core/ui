import { JSX, Panel, Text, Fragment } from '@bedrock-core/ui';
import { Button, Card } from '@bedrock-core/ore-styled';

function SectionTitle({ children }: { children: string }): JSX.Element {
  return <Text>{`§e§l${children}`}</Text>;
}

function Section({ title, children }: { title: string; children: JSX.Element | JSX.Element[] }): JSX.Element {
  return (
    <Card flexDirection={'column'} gap={2} padding={4}>
      <SectionTitle>{title}</SectionTitle>
      <Fragment>{children}</Fragment>
    </Card>
  );
}

function Box({ label, width, height, flexGrow, flexShrink }: {
  label: string; width?: number; height?: number; flexGrow?: number; flexShrink?: number;
}): JSX.Element {
  return (
    <Panel width={width} height={height} flexGrow={flexGrow} flexShrink={flexShrink} background={'textures/ui/recipe_book_group_expanded'}>
      <Text>{label}</Text>
    </Panel>
  );
}

export function FlexLayout(): JSX.Element {
  return (
    <Panel flexDirection={'column'} padding={6} gap={6}>
      <Text>{'§b§l@bedrock-core/ui — flex layout'}</Text>

      <Section title={'1. row, 3 fixed boxes, no gap'}>
        <Panel flexDirection={'row'} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a60'} width={60} height={12} />
          <Box label={'§a80'} width={80} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, x=40, x=100'}</Text>
      </Section>

      <Section title={'2. row, gap=10'}>
        <Panel flexDirection={'row'} gap={10} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, 50, 100'}</Text>
      </Section>

      <Section title={'3. row, gap=10% of parent'}>
        <Panel flexDirection={'row'} gap={'10%'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: gap=20px, x=0, 60, 120'}</Text>
      </Section>

      <Section title={'4a. justifyContent=center'}>
        <Panel flexDirection={'row'} justifyContent={'center'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: 40px left margin'}</Text>
      </Section>

      <Section title={'4b. justifyContent=space-between'}>
        <Panel flexDirection={'row'} justifyContent={'space-between'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: x=0, 80, 160'}</Text>
      </Section>

      <Section title={'4c. justifyContent=space-evenly'}>
        <Panel flexDirection={'row'} justifyContent={'space-evenly'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a40'} width={40} height={12} />
          <Box label={'§a40'} width={40} height={12} />
        </Panel>
        <Text>{'§7expect: gaps 40/40/40'}</Text>
      </Section>

      <Section title={'5. alignItems=center (row, h=40)'}>
        <Panel flexDirection={'row'} alignItems={'center'} width={200} height={40} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a10'} width={40} height={10} />
          <Box label={'§a20'} width={40} height={20} />
          <Box label={'§a30'} width={40} height={30} />
        </Panel>
        <Text>{'§7expect: each box centered vertically'}</Text>
      </Section>

      <Section title={'6a. flex:1/1/1 equal share'}>
        <Panel flexDirection={'row'} width={300} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§af'} flexGrow={1} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: each ~96 wide'}</Text>
      </Section>

      <Section title={'6b. flex:1/2/1 (CSS auto basis)'}>
        <Panel flexDirection={'row'} width={300} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§af1'} flexGrow={1} height={12} />
          <Box label={'§af2'} flexGrow={2} height={12} />
          <Box label={'§af1'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: ~75/138/75'}</Text>
      </Section>

      <Section title={'6c. fixed + flex:1 (fill remaining)'}>
        <Panel flexDirection={'row'} width={300} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a100'} width={100} height={12} />
          <Box label={'§af'} flexGrow={1} height={12} />
        </Panel>
        <Text>{'§7expect: 100, then 194'}</Text>
      </Section>

      <Section title={'7a. shrink: 3x100 in 200 (shrink:1)'}>
        <Panel flexDirection={'row'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§c100'} width={100} height={12} />
          <Box label={'§c100'} width={100} height={12} />
          <Box label={'§c100'} width={100} height={12} />
        </Panel>
        <Text>{'§7expect: ~67 each'}</Text>
      </Section>

      <Section title={'7b. shrink:0 (overflow visible)'}>
        <Panel flexDirection={'row'} width={200} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
          <Box label={'§c100'} width={100} height={12} flexShrink={0} />
        </Panel>
        <Text>{'§7expect: stay 100 each, overflow'}</Text>
      </Section>

      <Section title={'7c. weighted shrink (1 vs 3)'}>
        <Panel flexDirection={'row'} width={100} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§cs1'} width={100} height={12} flexShrink={1} />
          <Box label={'§cs3'} width={100} height={12} flexShrink={3} />
        </Panel>
        <Text>{'§7expect: 75/25'}</Text>
      </Section>

      <Section title={'8a. padding=8'}>
        <Panel padding={8} width={200} height={30} flexDirection={'row'} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a inner'} width={50} height={14} />
        </Panel>
        <Text>{'§7expect: child at x=8, y=8'}</Text>
      </Section>

      <Section title={'8b. padding=10%'}>
        <Panel padding={'10%'} flexDirection={'row'} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§a inner'} width={50} height={14} />
        </Panel>
        <Text>{'§7expect: 10% of parent width as padding'}</Text>
      </Section>

      <Section title={'9. nested: row → column'}>
        <Panel flexDirection={'row'} width={300} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Panel flexDirection={'column'} flexGrow={1} gap={2}>
            <Box label={'§aL1'} height={12} />
            <Box label={'§aL2'} height={12} />
            <Box label={'§aL3'} height={12} />
          </Panel>
          <Panel flexDirection={'column'} flexGrow={1} gap={2}>
            <Box label={'§aR1'} height={12} />
            <Box label={'§aR2'} height={12} />
          </Panel>
        </Panel>
        <Text>{'§7expect: 2 equal columns'}</Text>
      </Section>

      <Section title={'10. column derived height'}>
        <Panel flexDirection={'column'} gap={3} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Text>{'§aLine A'}</Text>
          <Text>{'§aLine B'}</Text>
          <Text>{'§aLine C'}</Text>
        </Panel>
        <Text>{'§7expect: grows to fit content'}</Text>
      </Section>

      <Section title={'11. button intrinsic + padding'}>
        <Panel flexDirection={'row'} gap={6} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Button>{'§aShort'}</Button>
          <Button>{'§aMuch longer label'}</Button>
        </Panel>
        <Text>{'§7expect: button bigger than text, text inset'}</Text>
      </Section>

      <Section title={'12. position=absolute (overlay)'}>
        <Panel width={200} height={40} background={'textures/ui/recipe_book_button_borderless_lightpressednohover'}>
          <Box label={'§abg'} width={200} height={40} />
          <Panel position={'absolute'} top={5} left={5} width={30} height={20} background={'textures/ui/recipe_book_group_expanded'}>
            <Text>{'§ctop-left'}</Text>
          </Panel>
          <Panel position={'absolute'} bottom={5} right={5} width={30} height={20} background={'textures/ui/recipe_book_group_expanded'}>
            <Text>{'§cbot-right'}</Text>
          </Panel>
        </Panel>
        <Text>{'§7expect: 2 panels overlaid on bg'}</Text>
      </Section>
    </Panel>
  );
}
