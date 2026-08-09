# Informe de implementación

Fecha: 2026-08-08 · Actualizado 2026-08-09: **verificado en el Kindle físico** (PW4, FBInk 1.25.0, despliegue por USB y Wi-Fi).

## Decisiones principales

- **Sin `execa`.** El registro npm estaba bloqueado por la política de red del
  entorno y las dependencias transitivas de execa 9 no estaban en la caché
  local. Se implementó `src/kindle/exec.ts`: un runner mínimo sobre
  `child_process.spawn` con `shell: false` y arrays de argumentos, que
  conserva la misma propiedad de seguridad (cero interpolación en shell).
  Todas las versiones de `package.json` quedaron fijadas a versiones
  disponibles offline (`overrides` para `vite` y `thread-stream`).
- **Fuente Inter (OFL) embebida vía fontconfig,** no como data URI: librsvg
  (el rasterizador SVG de Sharp) no soporta `@font-face` con data URI, así que
  `src/render/fonts.ts` genera un `fonts.conf` propio apuntando a
  `assets/fonts/` y lo activa con `FONTCONFIG_FILE` antes del primer render.
  Funciona en una Mac limpia sin fuentes instaladas globalmente (verificado:
  Inter no está instalada en este sistema y el render la usa).
- **Reloj de 7 segmentos** como polígonos SVG puros (`segmented-digits.ts`),
  con segmentos apagados en gris muy claro para el look de instrumento.
- **PNG en escala de grises real**: canal único de 8 bits
  (`toColourspace('b-w')`), 1072 × 1448 exactos, contraste lineal suave que no
  destruye el antialiasing del texto.
- **Freshness del oficial**: `live` ≤ 24 h desde `actualizado`/`fecha`,
  `cached` hasta 72 h (cubre fines de semana), `stale` después, siempre
  mostrando el último valor con su fecha de vigencia.
- **Binance P2P** detrás de una interfaz `P2pProvider`: `quote-price`
  primario, `ad-list` de respaldo con mediana de hasta 5 avisos elegibles por
  monto, preferencia por comerciantes (≥3) y método degradado explícito
  (`ad-list unfiltered median`).

## Comandos ejecutados y resultados

| Comando                                    | Resultado                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm install` (offline, versiones fijadas) | OK, lockfile generado                                                                                                                                                                             |
| `npm run lint`                             | 0 errores                                                                                                                                                                                         |
| `npm run typecheck`                        | 0 errores (strict + exactOptionalPropertyTypes)                                                                                                                                                   |
| `npm test`                                 | **77/77 tests pasan** (10 archivos)                                                                                                                                                               |
| `npm run check`                            | OK                                                                                                                                                                                                |
| `npm run demo`                             | `artifacts/dashboard.{svg,png}` generados; PNG 1072×1448, 1 canal, 8 bits; inspeccionado visualmente (jerarquía, sin recortes)                                                                    |
| `npm run fetch`                            | Ejecutado con la red del sandbox bloqueada: degradó correctamente a `SIN DATOS` en las tres tarjetas sin fallar (valida la ruta degradada). Las APIs reales no eran accesibles desde este entorno |

## Verificación en el Kindle físico (2026-08-09)

Realizada en un PW4 real (Linux kindle 4.1.15-lab126, FBInk 1.25.0):

1. ✅ **`npm run diagnose`** conectó por SSH y confirmó FBInk 1.25.0 con
   `Image=Yes`; la sintaxis `-q -c -g file=<ruta>,x=0,y=0` (+`-f`) es válida.
2. ✅ **Despliegue real**: el panel demo se pintó en la pantalla del Kindle.
   Hallazgo: este Dropbear no incluye `scp` → se reemplazó la subida por
   streaming SSH (`cat > tmp`), manteniendo `mv` atómico (test actualizado,
   77 tests).
3. ✅ **SSH por Wi-Fi** funcionando tras diagnóstico dirigido; hallazgos
   documentados en el README §9: la interfaz RNDIS de macOS necesita IP
   manual con máscara /24; `USE_WIFI` controla el bind de Dropbear
   (`-l usb0` con false, todas las interfaces con true) y añade la regla
   iptables para wlan0 (la política INPUT del firmware es DROP).
4. ⏳ Pendiente de uso prolongado: scripts Dashboard Start/Stop en KUAL y
   ajuste de `FULL_REFRESH_EVERY` si aparece ghosting.

## Notas

- Ningún tipo de cambio está hardcodeado: los valores en
  `src/render/demo-snapshot.ts` solo alimentan el modo demo y los tests.
