import { pnpm, run } from './process';

const command = process.argv[2];

function examplesInstall(): void {
  pnpm(['--dir', 'examples', 'install', '--frozen-lockfile']);
}

function examplesTypecheck(): void {
  examplesInstall();
  pnpm(['--dir', 'examples', 'typecheck']);
}

function examplesSmoke(): void {
  examplesInstall();
  pnpm(['--dir', 'examples', 'codegen']);
  pnpm(['--dir', 'examples', 'scaffold']);
}

function packageExports(): void {
  pnpm(['exec', 'publint']);
  pnpm(['exec', 'attw', '--pack', '.', '--no-emoji', '--ignore-rules', 'no-resolution']);
}

function packageCheck(): void {
  pnpm(['build']);
  packageExports();
  pnpm(['test:types']);
  pnpm(['package:smoke']);
}

function gate(): void {
  pnpm(['check']);
  pnpm(['typecheck']);
  pnpm(['build']);
  pnpm(['test']);
}

function modelsRefresh(): void {
  pnpm(['update:models', '--', '--write']);
  pnpm(['update:cloudflare-models', '--', '--write']);
  pnpm(['fix']);
}

function maintenanceGate(): void {
  gate();
  packageCheck();
  examplesTypecheck();
  examplesSmoke();
  pnpm(['test:e2e']);
}

switch (command) {
  case 'gate':
    gate();
    break;
  case 'maintenance:gate':
    maintenanceGate();
    break;
  case 'models:refresh':
    modelsRefresh();
    break;
  case 'examples:install':
    examplesInstall();
    break;
  case 'examples:typecheck':
    examplesTypecheck();
    break;
  case 'examples:smoke':
    examplesSmoke();
    break;
  case 'package:exports':
    packageExports();
    break;
  case 'package:check':
    packageCheck();
    break;
  case 'package:smoke':
    run('tsx', ['scripts/package-smoke.ts']);
    break;
  default:
    console.error(`Unknown script command: ${command ?? '(missing)'}`);
    process.exit(1);
}
