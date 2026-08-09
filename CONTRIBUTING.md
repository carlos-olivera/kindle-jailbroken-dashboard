# Contribuir

¡Gracias por tu interés! Este proyecto es pequeño y pragmático; las
contribuciones más valiosas son reportes de compatibilidad con otros modelos
de Kindle/builds de FBInk, correcciones de proveedores de datos y mejoras del
renderizado e-ink.

## Flujo

1. Abre un issue describiendo el problema o propuesta antes de un PR grande.
2. Fork + rama descriptiva (`fix/fbink-flags-pw3`, `feat/nueva-fuente-datos`).
3. Asegúrate de que pasa todo:

   ```bash
   npm run check   # lint + typecheck + tests
   npm run demo    # el render sin red debe seguir funcionando
   ```

4. PR con descripción de qué cambia y por qué. Si tocaste el render, adjunta
   el `artifacts/dashboard.png` resultante.

## Reglas del código

- TypeScript estricto, ESM, sin dependencias nuevas salvo justificación clara.
- Los comandos ssh/fbink se construyen **solo** con arrays de argumentos —
  nunca interpolando strings en un shell. Cualquier valor que viaje a un
  comando remoto debe pasar por las validaciones de `src/kindle/ssh.ts`.
- Todo string de origen remoto que llegue al SVG pasa por `escapeXml`.
- Datos ausentes se renderizan como `—`/`SIN DATOS`, nunca como `0,00`.
- La cotización de Binance P2P es `USDT/BOB · P2P` y no debe presentarse
  jamás como tipo de cambio oficial.
- Tests para lógica nueva (Vitest, fixtures JSON committeadas, sin red).

## Compatibilidad con otros Kindles

El código asume un PW4 (1072×1448) con USBNetworkLite + FBInk 1.25 en
`/mnt/us/libkh/bin/fbink`. Para otros modelos: las dimensiones viven en
`src/render/palette.ts` (`CANVAS`), la retícula en `src/render/layout.ts` y
los flags de FBInk en `src/kindle/fbink.ts`. `npm run diagnose` imprime el
`--help` del binario instalado — inclúyelo en cualquier issue de
compatibilidad.
