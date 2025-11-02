import { FunctionComponent, JSX, Panel, Text, usePlayer } from '@bedrock-core/ui';

export const InfoPanel: FunctionComponent = (): JSX.Element => {
  const player = usePlayer();

  const healthComp = player.getComponent('minecraft:health');
  const health: string = healthComp ? `${Math.floor(healthComp.currentValue)}/${healthComp.effectiveMax}` : '?';

  return (
    <Panel width={192} height={140} x={10} y={310}>
      <Text width={192} height={20} x={10} y={10} value={'§l§6Player Info'} />
      <Text width={192} height={15} x={10} y={35} value={`§eName: §f${player.name}`} />
      <Text width={192} height={15} x={10} y={52} value={`§cHealth: §f${health}`} />
      <Text width={192} height={15} x={10} y={69} value={`§bMode: §f${player.getGameMode()}`} />
      <Text width={192} height={15} x={10} y={86} value={`§dDim: §f${player.dimension.id}`} />
      <Text width={192} height={15} x={10} y={103} value={`§aLevel: §f${player.level}`} />
    </Panel>
  );
};

