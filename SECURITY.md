# Política de seguridad

## Modelo de amenaza

Este proyecto ejecuta comandos como **root en un Kindle con jailbreak** a
través de SSH en una LAN doméstica. Supuestos:

- La red Wi-Fi es de confianza (WPA2/WPA3, sin clientes hostiles).
- La autenticación es solo por clave pública (`ALLOW_PASSWORD_LOGIN="false"`
  en USBNetworkLite). Nunca publiques el puerto 22 del Kindle a internet.
- Las claves de host se fijan en `.data/known_hosts` (accept-new: primera
  conexión registra, siguientes exigen la misma clave).
- Los comandos remotos se construyen con arrays de argumentos y valores
  validados (sin interpolación en shell). Los strings remotos se escapan
  antes de entrar al SVG.

## Qué NO hace el proyecto

- No usa claves de API ni credenciales de servicios (todas las fuentes de
  datos son endpoints públicos de solo lectura).
- No opera con fondos: no hay trading, órdenes ni acciones autenticadas en
  Binance. Solo lee cotizaciones públicas.
- No modifica el sistema raíz del Kindle ni sus servicios; los scripts
  Start/Stop son reversibles y tocan una única propiedad (screensaver).

## Reportar una vulnerabilidad

Abre un issue de GitHub marcado como `security`, o si el detalle es sensible,
usa el reporte privado de vulnerabilidades de GitHub ("Report a
vulnerability" en la pestaña Security del repositorio). Se agradecen reportes
sobre: inyección de comandos vía configuración, escape SVG insuficiente, o
manejo inseguro de claves/huellas SSH.
