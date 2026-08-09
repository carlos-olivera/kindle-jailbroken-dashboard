import path from 'node:path';
import process from 'node:process';
import { pino, type Logger } from 'pino';
import { loadConfig, type AppConfig } from './config.js';
import { buildSnapshot } from './domain/snapshot.js';
import { renderDashboardSvg } from './render/render-dashboard.js';
import { rasterizeDashboard } from './render/rasterize.js';
import { demoSnapshot, DEMO_NOW } from './render/demo-snapshot.js';
import { deployToKindle } from './kindle/deploy.js';
import { diagnoseKindle } from './kindle/diagnose.js';
import { Runner } from './scheduler/runner.js';
import type { Transport } from './kindle/ssh.js';

const HELP = `Panel financiero Bolivia → Kindle PW4

Uso: npm run <comando> | tsx src/cli.ts <comando> [--transport usb-recovery]

Comandos:
  fetch      Obtiene y valida datos; imprime el snapshot normalizado (JSON)
  render     Datos en vivo → artifacts/dashboard.{svg,png} (sin desplegar)
  demo       Fixtures sin red → artifacts/dashboard.{svg,png}
  diagnose   Verifica SSH, FBInk y capacidades remotas
  deploy     Despliega el PNG ya generado al Kindle
  once       fetch → render → deploy una vez
  watch      Ejecuta "once" ahora y luego cada REFRESH_INTERVAL_MINUTES
  help       Esta ayuda

Opciones:
  --transport usb-recovery   Usa la IP de recuperación USB (solo diagnóstico
                             o emergencia; nunca se elige sola)
  --no-flash                 En deploy manual: refresco parcial en vez de flash
`;

function parseTransport(args: string[]): Transport {
  const i = args.indexOf('--transport');
  if (i === -1) return 'wifi';
  const value = args[i + 1];
  if (value !== 'usb-recovery' && value !== 'wifi') {
    throw new Error(`--transport inválido: "${value ?? ''}" (use wifi | usb-recovery)`);
  }
  return value;
}

async function renderLive(config: AppConfig, logger: Logger): Promise<string> {
  const now = new Date();
  const snapshot = await buildSnapshot(config, logger, now);
  const svg = renderDashboardSvg(snapshot, now);
  const res = await rasterizeDashboard(svg, config.artifactsDir);
  logger.info({ png: res.pngPath, width: res.width, height: res.height }, 'render listo');
  return res.pngPath;
}

async function main(): Promise<void> {
  const [, , command = 'help', ...rest] = process.argv;
  const config = loadConfig();
  const logger = pino({ level: config.logLevel, base: null });
  const pngPath = path.join(config.artifactsDir, 'dashboard.png');

  switch (command) {
    case 'fetch': {
      const snapshot = await buildSnapshot(config, logger);
      console.log(JSON.stringify(snapshot, null, 2));
      break;
    }

    case 'render': {
      await renderLive(config, logger);
      break;
    }

    case 'demo': {
      const svg = renderDashboardSvg(demoSnapshot(), DEMO_NOW);
      const res = await rasterizeDashboard(svg, config.artifactsDir);
      logger.info({ svg: res.svgPath, png: res.pngPath }, 'demo listo (sin red)');
      console.log(`Abrir en la Mac:  open ${res.pngPath}`);
      break;
    }

    case 'diagnose': {
      const ok = await diagnoseKindle(config, logger, parseTransport(rest));
      process.exitCode = ok ? 0 : 1;
      break;
    }

    case 'deploy': {
      await deployToKindle(config, logger, pngPath, {
        transport: parseTransport(rest),
        flash: !rest.includes('--no-flash'),
      });
      break;
    }

    case 'once': {
      const png = await renderLive(config, logger);
      await deployToKindle(config, logger, png, { transport: parseTransport(rest), flash: true });
      break;
    }

    case 'watch': {
      const transport = parseTransport(rest);
      const runner = new Runner(
        async ({ count, flash }) => {
          logger.info({ ciclo: count + 1, flash }, 'iniciando ciclo');
          const png = await renderLive(config, logger);
          await deployToKindle(config, logger, png, { transport, flash });
        },
        {
          intervalMs: config.refreshIntervalMinutes * 60_000,
          fullRefreshEvery: config.fullRefreshEvery,
          logger,
        },
      );

      let shuttingDown = false;
      const shutdown = (signal: string): void => {
        if (shuttingDown) return;
        shuttingDown = true;
        logger.info(`${signal} recibido; terminando el ciclo activo y saliendo`);
        void runner.stop().then(() => process.exit(0));
      };
      process.on('SIGINT', () => shutdown('SIGINT'));
      process.on('SIGTERM', () => shutdown('SIGTERM'));

      logger.info(
        { intervaloMin: config.refreshIntervalMinutes, flashCada: config.fullRefreshEvery },
        'modo continuo iniciado (Ctrl+C para detener)',
      );
      await runner.start();
      // Keep the process alive; the runner owns the timers.
      await new Promise(() => undefined);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      break;

    default:
      console.error(`comando desconocido: "${command}"\n`);
      console.log(HELP);
      process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
