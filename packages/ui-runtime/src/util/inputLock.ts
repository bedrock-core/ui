import { InputPermissionCategory, Player } from '@minecraft/server';

/**
 * Input lock system - tracks which players have locked input and their previous permissions
 * Key: player name, Value: { camera: previous camera permission, movement: previous movement permission }
 */
const inputLocks = new Map<string, { camera: boolean; movement: boolean }>();

/**
 * Start locking camera and movement input for a player
 */
export function startInputLock(player: Player): void {
  // Already locked, don't create duplicate
  if (inputLocks.has(player.id)) {
    return;
  }

  // Store current permissions before disabling
  const previousCameraPermission = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Camera);
  const previousMovementPermission = player.inputPermissions.isPermissionCategoryEnabled(InputPermissionCategory.Movement);

  inputLocks.set(player.id, {
    camera: previousCameraPermission,
    movement: previousMovementPermission,
  });

  // Disable camera and movement using official API
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, false);
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, false);
}

/**
 * Stop locking camera and movement input for a player, restoring previous permissions
 */
export function stopInputLock(player: Player): void {
  const previousPermissions = inputLocks.get(player.id);

  if (!previousPermissions) {
    return;
  }

  // Restore previous permissions
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Camera, previousPermissions.camera);
  player.inputPermissions.setPermissionCategory(InputPermissionCategory.Movement, previousPermissions.movement);

  inputLocks.delete(player.id);
}
