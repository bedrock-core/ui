import { FunctionComponent, JSX, Panel, Text, usePlayer } from '@bedrock-core/ui';

export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();

  const healthComp = player.getComponent('minecraft:health');
  const health: string = healthComp ? `${Math.floor(healthComp.currentValue)}/${healthComp.effectiveMax}` : '?';

  return (
    <Panel width={192} height={140} x={10} y={310}>
      <Text width={192} height={20} x={10} y={10}>§l§6Player Info</Text>
      <Text width={192} height={15} x={10} y={35}>{`§eName: §f${player.name}`}</Text>
      <Text width={192} height={15} x={10} y={52}>{`§cHealth: §f${health}`}</Text>
      <Text width={192} height={15} x={10} y={69}>{`§bMode: §f${player.getGameMode()}`}</Text>
      <Text width={192} height={15} x={10} y={86}>{`§dDim: §f${player.dimension.id}`}</Text>
      <Text width={192} height={15} x={10} y={103}>{`§aLevel: §f${player.level}`}</Text>
    </Panel>
  );
};

