import { spawnSync } from 'node:child_process';
import { constants, copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const frontend = new URL('Frontend/', root);

function run(command, args, { cwd = root, input } = {}) {
  // Windows Corepack is a .cmd launcher. Its arguments below are fixed script commands.
  const windowsCorepack = process.platform === 'win32' && command === 'corepack';
  const result = spawnSync(
    windowsCorepack ? (process.env.ComSpec ?? 'cmd.exe') : command,
    windowsCorepack ? ['/d', '/s', '/c', 'corepack.cmd', ...args] : args,
    { cwd: fileURLToPath(cwd), input, stdio: [input === undefined ? 'inherit' : 'pipe', 'inherit', 'inherit'] },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const pnpm = (...args) => run('corepack', ['pnpm', ...args], { cwd: frontend });
const uv = (...args) => run('uv', ['--directory', 'Backend', ...args]);
const compose = (...args) => run('docker', ['compose', '--project-directory', 'Backend', ...args]);

function copyEnv(directory) {
  try {
    copyFileSync(new URL('.env.example', directory), new URL('.env', directory), constants.COPYFILE_EXCL);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
}

switch (process.argv[2]) {
  case 'setup':
    copyEnv(new URL('Backend/', root));
    copyEnv(frontend);
    pnpm('install', '--frozen-lockfile');
    uv('sync', '--locked');
    compose('up', '-d', '--wait');
    compose('exec', '-T', 'backend', 'alembic', 'upgrade', 'head');
    compose('exec', '-T', 'backend', 'python', '-m', 'scripts.seed_rbac');
    run('docker', [
      'compose', '--project-directory', 'Backend', 'exec', '-T', 'db',
      'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1',
    ], { input: readFileSync(new URL('Backend/scripts/seed_mock_scenarios.sql', root)) });
    break;
  case 'dev':
    compose('up', '-d');
    pnpm('run', 'dev');
    break;
  case 'test':
    pnpm('test');
    compose('up', '-d', '--wait', 'db', 'redis');
    uv('run', '--locked', 'pytest', '-n', '4');
    break;
  default:
    console.error('Usage: node scripts/local.mjs <setup|dev|test>');
    process.exitCode = 2;
}
