import { FunctionComponent, JSX, Panel, Text, usePlayer } from '@bedrock-core/ui';

export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();

  const healthComp = player.getComponent('minecraft:health');
  const health: string = healthComp ? `${Math.floor(healthComp.currentValue)}/${healthComp.effectiveMax}` : '?';

  return (
    <Panel width={24} height={31} x={1} y={67}>
      <Text width={100} height={14} x={5} y={7}>{'§l§6Player Info'}</Text>
      <Text width={100} height={11} x={5} y={25}>{`§eName: §f${player.name}`}</Text>
      <Text width={100} height={11} x={5} y={37}>{`§cHealth: §f${health}`}</Text>
      <Text width={100} height={11} x={5} y={49}>{`§bMode: §f${player.getGameMode()}`}</Text>
      <Text width={100} height={11} x={5} y={61}>{`§dDim: §f${player.dimension.id}`}</Text>
      <Text width={100} height={11} x={5} y={74}>{`§aLevel: §f${player.level}`}</Text>
    </Panel>
  );
};
