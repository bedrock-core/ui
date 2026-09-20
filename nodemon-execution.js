import { spawn } from 'child_process';

let child;

function startResourcePack() {
  if (child) {
    console.log('🔁 Restarting resource-pack watch...');
    child.kill();
  }

  child = spawn('yarn', ['--cwd', 'packages/resource-pack', 'watch'], {
    stdio: 'inherit',
    shell: true,
  });
}

startResourcePack();

// graceful exit
process.on('SIGINT', () => {
  if (child) child.kill();
  process.exit();
});
