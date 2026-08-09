# Jailbreak y entorno de desarrollo en Kindle Paperwhite 4 desde macOS

<!-- markdownlint-disable MD013 -->

Guía reproducible para convertir un Kindle Paperwhite de 10.ª generación en una pantalla e-ink programable, con KUAL, MRPI, USBNetworkLite, SSH y FBInk.

> [!WARNING]
> El jailbreak puede anular la garantía, introducir riesgos de seguridad o dejar el dispositivo inutilizable. Continúa únicamente con un Kindle propio, acepta el riesgo y no uses paquetes destinados a otro modelo o firmware.

## Alcance validado

Esta guía documenta una instalación realizada correctamente con la siguiente combinación:

| Componente    | Valor validado                                |
| ------------- | --------------------------------------------- |
| Dispositivo   | Kindle Paperwhite 4, 10.ª generación, Wi-Fi   |
| Firmware      | `5.18.1.1.1`                                  |
| Arquitectura  | `armhf` / Kindle hard-float (`khf`)           |
| Computadora   | Mac con macOS y terminal `zsh`                |
| Jailbreak     | SpringBreak                                   |
| Lanzador      | KUAL mediante PEKI                            |
| Instalador    | MRPI moderno, variante KHF                    |
| Acceso remoto | USBNetworkLite + Dropbear + llave ED25519     |
| Pantalla      | FBInk en `/mnt/us/libkh/bin/fbink`            |
| Resolución    | `1072 × 1448` píxeles en orientación vertical |

No sigas estas instrucciones literalmente si cambia alguno de los siguientes datos:

- modelo o generación;
- versión exacta del firmware;
- arquitectura del dispositivo;
- método de jailbreak recomendado actualmente.

Antes de comenzar, consulta el [selector de modelos de KindleModding](https://kindlemodding.org/kindle-models.html) y la [documentación actual de SpringBreak](https://kindlemodding.org/jailbreaking/SpringBreak/).

## Resultado final

Al terminar podrás:

- ejecutar extensiones desde KUAL;
- instalar paquetes `.bin` mediante MRPI;
- entrar al Kindle como `root` por SSH;
- usar SSH por USB para configuración y recuperación;
- usar SSH por Wi-Fi durante la operación normal;
- copiar imágenes desde la Mac;
- mostrar texto e imágenes con FBInk;
- utilizar el Kindle sin cable de datos conectado a la Mac.

## Índice

1. [Riesgos y preparación](#1-riesgos-y-preparación)
2. [Confirmar modelo y firmware](#2-confirmar-modelo-y-firmware)
3. [Ejecutar SpringBreak](#3-ejecutar-springbreak)
4. [Finalizar y limpiar SpringBreak](#4-finalizar-y-limpiar-springbreak)
5. [Instalar KUAL y MRPI](#5-instalar-kual-y-mrpi)
6. [Resolver ](#6-resolver-mrpi-is-not-installed)`mrpi is not installed`
7. [Instalar USBNetworkLite para KHF](#7-instalar-usbnetworklite-para-khf)
8. [Configurar una llave SSH](#8-configurar-una-llave-ssh)
9. [Probar SSH por USB en macOS](#9-probar-ssh-por-usb-en-macos)
10. [Habilitar SSH por Wi-Fi](#10-habilitar-ssh-por-wi-fi)
11. [Verificar FBInk](#11-verificar-fbink)
12. [Desplegar la primera imagen](#12-desplegar-la-primera-imagen)
13. [Preparar el modo dashboard](#13-preparar-el-modo-dashboard)
14. [Operación y mantenimiento](#14-operación-y-mantenimiento)
15. [Solución de problemas](#15-solución-de-problemas)
16. [Fuentes](#16-fuentes)

## 1. Riesgos y preparación

### 1.1 Haz una copia de seguridad

Copia fuera del Kindle cualquier contenido que no puedas recuperar:

- libros cargados manualmente;
- documentos personales;
- notas y exportaciones;
- capturas de pantalla;
- archivos de proyectos anteriores.

El proceso no debería borrar el almacenamiento, pero un restablecimiento o una recuperación fallida sí puede hacerlo.

### 1.2 Protege tus datos privados

No publiques capturas que muestren:

- número de serie completo;
- dirección MAC;
- nombre personal del dispositivo;
- IP pública;
- contenido de una llave privada SSH.

La llave privada permanece siempre en la Mac. Al Kindle se copia únicamente el archivo terminado en `.pub`.

### 1.3 Requisitos

- Kindle registrado en una cuenta y compatible con SpringBreak.
- Firmware exacto `5.18.1.1.1` para este procedimiento PW4.
- Batería suficientemente cargada; se recomienda al menos 70 %.
- Cable USB de datos confiable.
- Red Wi-Fi conocida por el Kindle.
- Mac con acceso a Terminal.
- Al menos 220 MB libres después del jailbreak para KUAL y MRPI.
- Paciencia: SpringBreak crea miles de directorios temporales.

### 1.4 No actualices el firmware

No aceptes una actualización del sistema durante el proceso. SpringBreak requiere conectividad brevemente, por lo que el orden de los pasos importa.

SpringBreak instala el stack moderno `hdnext`, su mecanismo de persistencia y el bloqueo OTA. La guía oficial indica que no es necesario aplicar manualmente el antiguo procedimiento de bloqueo de actualizaciones después de SpringBreak. Aun así:

- comprueba que no haya archivos de actualización pendientes;
- evita actualizar manualmente;
- no hagas un restablecimiento de fábrica después del jailbreak;
- revisa la documentación actual antes de cambiar el firmware.

## 2. Confirmar modelo y firmware

En el Kindle abre:

```
Inicio → ⋮ → Configuración → Opciones del dispositivo → Información del dispositivo
```

Confirma:

```
Tipo de dispositivo: Kindle Paperwhite (10.ª generación)
Versión del firmware: Kindle 5.18.1.1.1
```

No copies el número de serie a incidencias públicas. Si necesitas identificar el modelo mediante el serial, utiliza localmente el [selector de KindleModding](https://kindlemodding.org/kindle-models.html).

## 3. Ejecutar SpringBreak

SpringBreak declara compatibilidad con PW4 en `5.18.1.1.1`. No sustituyas SpringBreak por WinterBreak: la documentación de WinterBreak indica que no funciona en firmware `5.18.1` o superior.

### 3.1 Activa modo avión

En el Kindle:

1. Activa **Modo avión**.
2. Reinicia el dispositivo.
3. Espera hasta volver completamente a la pantalla de inicio.

### 3.2 Conecta el Kindle a la Mac

Conecta el cable USB. Verifica que aparezca el volumen:

```
ls /Volumes
```

Debe aparecer algo similar a:

```
Kindle
Macintosh HD
```

Puedes definir una variable para los comandos posteriores:

```
KINDLE_VOLUME="/Volumes/Kindle"
```

Comprueba que existe:

```
test -d "$KINDLE_VOLUME" && echo "Kindle montado"
```

### 3.3 Descarga SpringBreak desde el proyecto oficial

Utiliza siempre la última publicación del repositorio oficial. No descargues copias reempaquetadas desde foros o servicios de archivos.

```
mkdir -p "$HOME/Downloads/kindle-springbreak"
cd "$HOME/Downloads/kindle-springbreak"

curl -fL \
  "https://github.com/KindleModding/SpringBreak/releases/latest/download/springbreak.zip" \
  -o springbreak.zip

unzip springbreak.zip
cd springbreak
chmod +x ./springbreak-darwin
```

Si macOS bloquea la aplicación, revisa **Configuración del Sistema → Privacidad y seguridad** y autoriza solamente el binario que acabas de descargar del repositorio oficial. No desactives Gatekeeper globalmente.

### 3.4 Ejecuta el instalador

Con el Kindle montado:

```
./springbreak-darwin
```

El instalador mostrará una lista de dispositivos. Selecciona el número correspondiente al volumen Kindle.

El programa creará miles de directorios y archivos temporales. No desconectes el cable, no cierres la terminal y no dejes que la Mac suspenda la sesión durante esta etapa.

> [!NOTE]
> En macOS conviene usar el binario de SpringBreak en lugar de copiar manualmente su árbol de directorios. Esto reduce problemas con archivos AppleDouble `._*` y atributos propios de Finder.

### 3.5 Abre Kindle Store

Cuando el instalador termine:

1. Expulsa correctamente el Kindle.
2. Desconecta el cable.
3. En la pantalla de inicio, abre el icono de Kindle Store.
4. Cuando se solicite conectividad, desactiva Modo avión.
5. Espera a que cargue SpringBreak.

Después de unos segundos debe aparecer texto indicando que el jailbreak fue exitoso. El sistema puede volver por sí mismo a la pantalla de inicio.

No navegues innecesariamente ni dejes el Kindle conectado a Internet más tiempo del necesario durante esta etapa.

## 4. Finalizar y limpiar SpringBreak

La limpieza es obligatoria. Si se dejan los miles de directorios temporales, un reinicio puede tardar más de 15 minutos.

Cuando el Kindle haya vuelto a Inicio:

1. Activa otra vez Modo avión.
2. Conecta el Kindle a la Mac.
3. Espera a que `/Volumes/Kindle` esté montado.
4. Vuelve a ejecutar el mismo binario:

```
cd "$HOME/Downloads/kindle-springbreak/springbreak"
./springbreak-darwin
```

Selecciona nuevamente el Kindle. El programa detectará la instalación previa y ejecutará la limpieza.

Después:

1. Revisa la raíz del Kindle.
2. Elimina únicamente archivos de actualización pendientes claramente identificados por la documentación oficial.
3. No borres manualmente directorios internos que no reconozcas.
4. Expulsa el Kindle.
5. Desconecta el cable.
6. Reinícialo.

SpringBreak incorpora el stack `hdnext`, KPM, persistencia y bloqueo de actualizaciones. No instales encima un hotfix antiguo siguiendo tutoriales de WinterBreak.

## 5. Instalar KUAL y MRPI

KUAL es el lanzador de aplicaciones. MRPI instala paquetes Kindle `.bin` colocados en `mrpackages`.

Para dispositivos K5 y posteriores, la documentación actual recomienda:

- [PEKI](https://github.com/KindleTweaks/PEKI/releases/latest/download/PEKI.zip) para KUAL;
- [MRPI moderno/KHF](https://kindlemodding.org/jailbreaking/post-jailbreak/installing-kual-mrpi/kual-mrinstaller-khf.zip).

### 5.1 Descarga y extrae los paquetes en la Mac

```
mkdir -p "$HOME/Downloads/kindle-post-jailbreak"
cd "$HOME/Downloads/kindle-post-jailbreak"

curl -fL \
  "https://github.com/KindleTweaks/PEKI/releases/latest/download/PEKI.zip" \
  -o PEKI.zip

curl -fL \
  "https://kindlemodding.org/jailbreaking/post-jailbreak/installing-kual-mrpi/kual-mrinstaller-khf.zip" \
  -o kual-mrinstaller-khf.zip

mkdir -p PEKI MRPI
unzip PEKI.zip -d PEKI
unzip kual-mrinstaller-khf.zip -d MRPI
```

Verifica la estructura antes de copiar:

```
find PEKI -maxdepth 2 -type f -print
find MRPI/extensions/MRInstaller -maxdepth 3 -type f -print
```

En PEKI deben existir:

```
KUAL.jar
KUAL.sh
```

En MRPI debe existir, como mínimo:

```
extensions/MRInstaller/bin/mrinstaller.sh
```

### 5.2 Copia KUAL

Conecta el Kindle y ejecuta:

```
KINDLE_VOLUME="/Volumes/Kindle"

cp \
  "$HOME/Downloads/kindle-post-jailbreak/PEKI/KUAL.jar" \
  "$KINDLE_VOLUME/documents/"

cp \
  "$HOME/Downloads/kindle-post-jailbreak/PEKI/KUAL.sh" \
  "$KINDLE_VOLUME/documents/"
```

### 5.3 Copia MRPI preservando la estructura

No copies solamente el contenido de `mrpackages`. Deben llegar al Kindle las carpetas `extensions` y `mrpackages` completas.

```
ditto \
  "$HOME/Downloads/kindle-post-jailbreak/MRPI/extensions" \
  "$KINDLE_VOLUME/extensions"

mkdir -p "$KINDLE_VOLUME/mrpackages"
```

Comprueba el archivo esencial:

```
test -f \
  "$KINDLE_VOLUME/extensions/MRInstaller/bin/mrinstaller.sh" \
  && echo "MRPI instalado correctamente"
```

También puedes comprobarlo con `find`, limitando la búsqueda a `extensions`:

```
find "$KINDLE_VOLUME/extensions" \
  -type f \
  -name "mrinstaller.sh" \
  -print
```

El resultado esperado es:

```
/Volumes/Kindle/extensions/MRInstaller/bin/mrinstaller.sh
```

Expulsa el Kindle y desconéctalo:

```
diskutil eject "$KINDLE_VOLUME"
```

KUAL debe aparecer como un elemento de la biblioteca. Si no aparece de inmediato, espera a que el Kindle indexe `documents` y reinicia una vez.

## 6. Resolver `mrpi is not installed`

El mensaje:

```
mrpi is not installed
```

normalmente significa que existe `mrpackages`, pero falta la extensión ejecutable de MRPI.

### Diagnóstico correcto en macOS

No busques desde toda la raíz del volumen porque macOS puede mostrar:

```
find: /Volumes/Kindle/.Spotlight-V100: Operation not permitted
```

Ese mensaje no diagnostica MRPI. Busca solamente dentro de `extensions`:

```
KINDLE_VOLUME="/Volumes/Kindle"

find "$KINDLE_VOLUME/extensions" \
  -type f \
  -name "mrinstaller.sh" \
  -print
```

Si no devuelve nada:

1. Vuelve a extraer `kual-mrinstaller-khf.zip` en la Mac.
2. Confirma que el ZIP contiene `extensions/MRInstaller/bin/mrinstaller.sh`.
3. Copia nuevamente la carpeta `extensions` completa.
4. No cambies los nombres de directorios.
5. Expulsa el Kindle.
6. Reinícialo.
7. Vuelve a ejecutar `;log mrpi` desde la búsqueda.

No intentes resolverlo creando un archivo vacío llamado `mrinstaller.sh`: MRPI contiene scripts, binarios y datos específicos para KHF.

## 7. Instalar USBNetworkLite para KHF

El PW4 con este firmware utiliza la variante Kindle hard-float. En la publicación `1.0.M` de USBNetworkLite, el archivo apropiado es:

```
Update_usbnetlite_1.0.M_install_khf.bin
```

No uses el paquete `khf_11thgenplus` en un PW4 de 10.ª generación.

Consulta siempre la [última publicación de USBNetworkLite](https://github.com/notmarek/kindle-usbnetlite/releases) por si cambian los nombres o requisitos.

### 7.1 Descarga el paquete oficial

Ejemplo para la versión validada:

```
cd "$HOME/Downloads/kindle-post-jailbreak"

curl -fL \
  "https://github.com/notmarek/kindle-usbnetlite/releases/download/1.0.M/Update_usbnetlite_1.0.M_install_khf.bin" \
  -o Update_usbnetlite_1.0.M_install_khf.bin
```

### 7.2 Copia el `.bin` sin extraerlo

```
KINDLE_VOLUME="/Volumes/Kindle"

cp \
  "$HOME/Downloads/kindle-post-jailbreak/Update_usbnetlite_1.0.M_install_khf.bin" \
  "$KINDLE_VOLUME/mrpackages/"

ls -lh "$KINDLE_VOLUME/mrpackages"
```

Expulsa y desconecta:

```
diskutil eject "$KINDLE_VOLUME"
```

### 7.3 Ejecuta MRPI

En la búsqueda del Kindle escribe:

```
;log mrpi
```

Alternativamente, si la versión de KUAL instalada expone la opción:

```
KUAL → Helper → Install MR Packages
```

Espera el mensaje de finalización. No reinicies ni desconectes alimentación mientras instala.

Después de la instalación, USBNetworkLite debe aparecer en KUAL. Al volver a montar el Kindle como almacenamiento, esta ruta debe existir:

```
ls "/Volumes/Kindle/usbnetlite/etc"
```

Resultado esperado:

```
VERSION
config
config.default
dropbear
```

## 8. Configurar una llave SSH

### 8.1 Crea una llave dedicada

No reutilices una llave de producción o una identidad personal importante.

```
mkdir -p "$HOME/.ssh"

ssh-keygen \
  -t ed25519 \
  -f "$HOME/.ssh/kindle_pw4_ed25519" \
  -C "kindle-pw4"
```

Puedes protegerla con passphrase. Para automatizaciones en macOS, carga la llave en el agente:

```
ssh-add --apple-use-keychain "$HOME/.ssh/kindle_pw4_ed25519"
```

Archivos creados:

```
~/.ssh/kindle_pw4_ed25519       # privada: nunca se copia ni publica
~/.ssh/kindle_pw4_ed25519.pub   # pública: se instala en el Kindle
```

### 8.2 Instala únicamente la llave pública

Con el Kindle montado como almacenamiento:

```
KINDLE_VOLUME="/Volumes/Kindle"

cat "$HOME/.ssh/kindle_pw4_ed25519.pub" \
  > "$KINDLE_VOLUME/usbnetlite/etc/dropbear/authorized_keys"
```

Verifica que haya exactamente una línea válida:

```
wc -l \
  "$KINDLE_VOLUME/usbnetlite/etc/dropbear/authorized_keys"

head -c 20 \
  "$KINDLE_VOLUME/usbnetlite/etc/dropbear/authorized_keys"

echo
```

El inicio debe parecerse a:

```
ssh-ed25519 AAAA...
```

No muestres la línea completa en capturas públicas.

### 8.3 Configura primero SSH por USB

Para la primera prueba utiliza USB y deshabilita contraseñas:

```
KINDLE_CONFIG="$KINDLE_VOLUME/usbnetlite/etc/config"

sed -i '' \
  's/^USE_WIFI=.*/USE_WIFI="false"/' \
  "$KINDLE_CONFIG"

sed -i '' \
  's/^ALLOW_PASSWORD_LOGIN=.*/ALLOW_PASSWORD_LOGIN="false"/' \
  "$KINDLE_CONFIG"

grep -E \
  '^(USE_WIFI|ALLOW_PASSWORD_LOGIN|KINDLE_IP|PORT)=' \
  "$KINDLE_CONFIG"
```

La configuración debe mostrar valores equivalentes a:

```
KINDLE_IP=192.168.15.244
ALLOW_PASSWORD_LOGIN="false"
PORT="22"
USE_WIFI="false"
```

Expulsa el almacenamiento, desconecta y vuelve a abrir USBNetworkLite desde KUAL.

## 9. Probar SSH por USB en macOS

### 9.1 Activa USBNetworkLite

En KUAL:

1. Abre USBNetworkLite.
2. Activa o alterna USB networking.
3. Revisa su estado.
4. Conecta el cable USB.

Cuando USB networking está activo, el Kindle deja de comportarse como almacenamiento y aparece como adaptador de red.

### 9.2 Identifica la interfaz correcta

```
networksetup -listallhardwareports
```

Busca exactamente este bloque:

```
Hardware Port: RNDIS/Ethernet Gadget
Device: enN
```

El nombre puede ser `en7`, `en9` u otro. No copies el identificador de otra Mac y no selecciones `USB 10/100/1000 LAN` ni un adaptador Ethernet distinto.

Define la interfaz encontrada:

```
KINDLE_INTERFACE="enN"
```

Sustituye `enN` por el valor real y configura la IP de la Mac:

```
sudo ifconfig "$KINDLE_INTERFACE" \
  inet 192.168.15.201 \
  netmask 255.255.255.0 \
  up
```

Comprueba:

```
ifconfig "$KINDLE_INTERFACE" | grep 'inet '
```

### 9.3 Prueba el puerto SSH

No dependas únicamente de `ping`; ICMP puede no responder aunque SSH funcione.

```
nc -G 3 -vz 192.168.15.244 22
```

Después conecta:

```
ssh \
  -i "$HOME/.ssh/kindle_pw4_ed25519" \
  -o IdentitiesOnly=yes \
  -o ConnectTimeout=5 \
  root@192.168.15.244
```

En la primera conexión, SSH pedirá confirmar la host key. Hazlo solamente si estás conectado directamente al Kindle por USB.

### 9.4 Verifica el dispositivo desde SSH

Dentro del Kindle:

```
uname -a
uname -m
id
pwd
```

Debes estar autenticado como `root`. Sal con:

```
exit
```

## 10. Habilitar SSH por Wi-Fi

La operación normal del dashboard no necesita cable de datos. El cable queda como vía de configuración y recuperación.

> [!IMPORTANT]
> Habilita SSH por Wi-Fi solamente después de instalar la llave pública y desactivar el login por contraseña. No abras ni redirijas el puerto 22 del router hacia Internet.

### 10.1 Cambia la configuración

Puedes hacerlo mientras el Kindle está montado:

```
KINDLE_VOLUME="/Volumes/Kindle"
KINDLE_CONFIG="$KINDLE_VOLUME/usbnetlite/etc/config"

cp "$KINDLE_CONFIG" "$KINDLE_CONFIG.backup"

sed -i '' \
  's/^USE_WIFI=.*/USE_WIFI="true"/' \
  "$KINDLE_CONFIG"

sed -i '' \
  's/^ALLOW_PASSWORD_LOGIN=.*/ALLOW_PASSWORD_LOGIN="false"/' \
  "$KINDLE_CONFIG"

grep -E \
  '^(USE_WIFI|ALLOW_PASSWORD_LOGIN|PORT)=' \
  "$KINDLE_CONFIG"
```

Resultado esperado:

```
USE_WIFI="true"
ALLOW_PASSWORD_LOGIN="false"
PORT="22"
```

Expulsa y reinicia/togglea USBNetworkLite desde KUAL. Si el menú instalado incluye opciones como **SSH over Wi-Fi** o **SSHD at boot**, actívalas siguiendo el estado mostrado por esa versión.

### 10.2 Obtén la IP inalámbrica

Conecta Kindle y Mac a la misma red Wi-Fi. En la búsqueda del Kindle escribe:

```
;711
```

Busca la dirección IPv4 de `wlan0`, por ejemplo:

```
192.168.1.50
```

La dirección `192.168.15.244` pertenece a USB y no sirve como dirección Wi-Fi.

Conviene crear una reserva DHCP en el router para que el Kindle conserve su IP. No publiques la dirección MAC utilizada para esa reserva.

### 10.3 Prueba SSH sin cable

Desconecta completamente el cable USB y ejecuta:

```
KINDLE_WIFI_IP="192.168.1.50"

nc -G 3 -vz "$KINDLE_WIFI_IP" 22

ssh \
  -i "$HOME/.ssh/kindle_pw4_ed25519" \
  -o IdentitiesOnly=yes \
  -o ConnectTimeout=5 \
  "root@$KINDLE_WIFI_IP"
```

Reemplaza el ejemplo por la IP real.

Si la red usa aislamiento de clientes, una red de invitados o VLAN separadas, la Mac no podrá llegar al Kindle aunque ambos tengan Internet.

### 10.4 Configuración SSH opcional en la Mac

Puedes añadir un alias a `~/.ssh/config`:

```
Host kindle-pw4-wifi
    HostName 192.168.1.50
    User root
    Port 22
    IdentityFile ~/.ssh/kindle_pw4_ed25519
    IdentitiesOnly yes
    ConnectTimeout 5

Host kindle-pw4-usb
    HostName 192.168.15.244
    User root
    Port 22
    IdentityFile ~/.ssh/kindle_pw4_ed25519
    IdentitiesOnly yes
    ConnectTimeout 5
```

Después podrás usar:

```
ssh kindle-pw4-wifi
```

No configures globalmente `StrictHostKeyChecking no`.

## 11. Verificar FBInk

SpringBreak/`hdnext` instala FBInk en `libkh`. No copies un binario aleatorio destinado a otro modelo.

Entra por SSH y comprueba:

```
ls -l /mnt/us/libkh/bin/fbink
test -x /mnt/us/libkh/bin/fbink && echo "FBInk ejecutable"
/mnt/us/libkh/bin/fbink -e
```

### 11.1 Mostrar texto de prueba

```
/mnt/us/libkh/bin/fbink \
  -V \
  -c \
  -f \
  -m \
  -M \
  "SSH + FBInk funcionando"
```

Significado práctico:

- `-V`: usa el viewport físico completo;
- `-c`: limpia el framebuffer;
- `-f`: solicita refresco completo con parpadeo;
- `-m`: centra horizontalmente;
- `-M`: centra verticalmente.

La pantalla debe parpadear y mostrar el mensaje.

## 12. Desplegar la primera imagen

### 12.1 Prepara una imagen exacta

El PNG debe medir:

```
1072 × 1448 píxeles
```

Verifica cualquier imagen en la Mac con:

```
sips -g pixelWidth -g pixelHeight dashboard.png
```

Resultado esperado:

```
pixelWidth: 1072
pixelHeight: 1448
```

Para e-ink se recomienda:

- fondo blanco;
- texto y líneas de alto contraste;
- escala de grises;
- evitar detalles demasiado finos;
- PNG de 8 bits o una paleta simple.

### 12.2 Copia el archivo de forma atómica

Usa `scp -O`, ya que Dropbear y versiones antiguas de SCP pueden no aceptar el protocolo SFTP moderno usado por defecto:

```
KINDLE_WIFI_IP="192.168.1.50"
SSH_KEY="$HOME/.ssh/kindle_pw4_ed25519"

scp -O \
  -i "$SSH_KEY" \
  dashboard.png \
  "root@$KINDLE_WIFI_IP:/mnt/us/dashboard.png.tmp"
```

Renombra y muestra la imagen:

```
ssh \
  -i "$SSH_KEY" \
  "root@$KINDLE_WIFI_IP" \
  'mv /mnt/us/dashboard.png.tmp /mnt/us/dashboard.png && /mnt/us/libkh/bin/fbink -V -c -f -g file=/mnt/us/dashboard.png'
```

FBInk documenta la sintaxis de imagen como:

```
-g file=PATH
```

Si tu build responde de otra manera, revisa primero:

```
ssh -i "$SSH_KEY" "root@$KINDLE_WIFI_IP" \
  '/mnt/us/libkh/bin/fbink --help'
```

No uses el FBInk reducido incluido en otra aplicación si informa que el soporte de imágenes está deshabilitado. Para este entorno, usa `/mnt/us/libkh/bin/fbink`.

## 13. Preparar el modo dashboard

Una pantalla e-ink conserva la última imagen sin energía, pero el Kindle suele suspender Wi-Fi. Si la Mac necesita enviar actualizaciones periódicas, el Kindle debe permanecer disponible.

### 13.1 Evitar temporalmente el screensaver

Al iniciar el dashboard:

```
ssh kindle-pw4-wifi \
  'lipc-set-prop com.lab126.powerd preventScreenSaver 1'
```

Al detenerlo, restaura siempre el comportamiento normal:

```
ssh kindle-pw4-wifi \
  'lipc-set-prop com.lab126.powerd preventScreenSaver 0'
```

No conviertas este cambio en una modificación permanente del sistema. Crea acciones reversibles **Dashboard Start** y **Dashboard Stop** desde KUAL.

### 13.2 Batería

El dispositivo puede funcionar sin ningún cable mientras tenga batería. Sin embargo:

- Wi-Fi permanente consume energía;
- impedir la suspensión consume energía;
- actualizar el reloj cada minuto consume más que hacerlo cada 5 o 15 minutos;
- un refresco completo frecuente produce parpadeo y mayor consumo.

Para uso permanente, usa un cargador de pared, no una conexión de datos a la Mac. Para máxima autonomía, considera una arquitectura donde el Kindle despierte periódicamente, descargue la imagen y vuelva a dormir.

## 14. Operación y mantenimiento

### Seguridad

- Mantén `ALLOW_PASSWORD_LOGIN="false"`.
- Usa una llave dedicada.
- No expongas SSH a Internet.
- No configures port forwarding para el puerto 22.
- Usa una red local confiable.
- Revoca la llave reemplazando `authorized_keys` si pierdes la Mac.
- No publiques configuraciones con datos personales.

### Actualizaciones

- No actualices el firmware sin confirmar compatibilidad y método de recuperación.
- No mezcles tutoriales de WinterBreak, AdBreak, Sanctuary y SpringBreak.
- No reinstales un hotfix legado sobre `hdnext` salvo instrucción expresa del proyecto.
- Revisa las notas de cada release antes de sustituir KUAL, MRPI o USBNetworkLite.
- Conserva una copia de `usbnetlite/etc/config` y de la llave pública autorizada.

### Recuperación por USB

Si SSH por Wi-Fi deja de funcionar:

1. Despierta el Kindle.
2. Abre KUAL → USBNetworkLite.
3. Activa USB networking.
4. Conecta el cable.
5. Identifica nuevamente `RNDIS/Ethernet Gadget`.
6. Configura la Mac como `192.168.15.201/24`.
7. Conecta a `root@192.168.15.244`.

No hagas un restablecimiento de fábrica como primer intento de recuperación.

## 15. Solución de problemas

### SpringBreak no encuentra el Kindle

Comprueba:

```
ls -ld /Volumes/Kindle
```

- Usa un cable de datos, no uno de carga.
- Monta el volumen antes de ejecutar el binario.
- Reinicia Kindle y Mac si el almacenamiento no aparece.
- Confirma que modelo y firmware están expresamente soportados.

### Kindle Store muestra `Application Error`

La documentación de SpringBreak recomienda reconectar el Kindle por USB una o varias veces y volver a intentar. Mantén el orden de Modo avión y conectividad indicado por la guía oficial.

### SpringBreak falla mientras llena el almacenamiento

- Deja más espacio libre.
- Vuelve a ejecutar el binario para limpiar rellenos parciales.
- No agregues manualmente archivos de relleno en macOS.
- Reintenta desde un estado limpio.

### El reinicio tarda más de 15 minutos

Probablemente faltó la limpieza final de SpringBreak. Si el dispositivo termina arrancando, monta el almacenamiento y vuelve a ejecutar el binario para limpiar.

### `mrpi is not installed`

Comprueba:

```
test -f \
  "/Volumes/Kindle/extensions/MRInstaller/bin/mrinstaller.sh" \
  && echo OK \
  || echo "MRPI incompleto"
```

Si falta, vuelve a copiar la carpeta `extensions` completa desde el ZIP KHF de MRPI.

### `find: .Spotlight-V100: Operation not permitted`

No es un error del Kindle ni de MRPI. Limita la búsqueda:

```
find "/Volumes/Kindle/extensions" \
  -type f \
  -name "mrinstaller.sh" \
  -print
```

### El `.bin` permanece en `mrpackages`

- Verifica que MRPI esté completo.
- Quita sufijos como `(1)` agregados por el navegador.
- No extraigas el `.bin`.
- Ejecuta `;log mrpi` y revisa el log.
- Confirma que usaste el paquete `khf`, no `11thgenplus`.

### `ping` no responde

No concluyas que SSH está caído. Prueba TCP:

```
nc -G 3 -vz 192.168.15.244 22
```

o para Wi-Fi:

```
nc -G 3 -vz "$KINDLE_WIFI_IP" 22
```

### SSH por USB hace timeout

- Comprueba que USBNetworkLite esté activo.
- Selecciona la interfaz del bloque `RNDIS/Ethernet Gadget`.
- No uses por error `USB 10/100/1000 LAN`.
- Confirma `192.168.15.201/24` en la interfaz de la Mac.
- Confirma `KINDLE_IP=192.168.15.244`.
- Prueba el puerto con `nc`.

### SSH muestra `Permission denied (publickey)`

Verifica:

```
wc -l \
  "/Volumes/Kindle/usbnetlite/etc/dropbear/authorized_keys"
```

- Debe contener la llave pública correcta en una sola línea.
- Usa `-i ~/.ssh/kindle_pw4_ed25519`.
- Si la llave tiene passphrase, cárgala con `ssh-add`.
- No copies el archivo privado al Kindle.

### SSH por Wi-Fi no conecta

- Comprueba `USE_WIFI="true"`.
- Reinicia/togglea USBNetworkLite después de editar el archivo.
- Despierta el Kindle.
- Confirma la IP actual con `;711`.
- Revisa si cambió el lease DHCP.
- Verifica que no sea una red de invitados con client isolation.
- No uses `192.168.15.244` como IP Wi-Fi.

### FBInk muestra texto pero no imágenes

Comprueba el binario utilizado:

```
/mnt/us/libkh/bin/fbink --help
```

Usa:

```
/mnt/us/libkh/bin/fbink \
  -V -c -f \
  -g file=/mnt/us/dashboard.png
```

Algunos binarios reducidos incluidos con otras aplicaciones se compilan sin soporte de imágenes.

### La interfaz original del Kindle sobrescribe el dashboard

- Activa temporalmente `preventScreenSaver` al iniciar el dashboard.
- Mantén el Kindle despierto.
- Crea acciones KUAL reversibles para iniciar y detener.
- Restaura siempre `preventScreenSaver 0` al terminar.

## 16. Fuentes

Fuentes principales consultadas y recomendadas para verificar cambios posteriores:

- [KindleModding — SpringBreak](https://kindlemodding.org/jailbreaking/SpringBreak/)
- [Repositorio oficial SpringBreak](https://github.com/KindleModding/SpringBreak)
- [KindleModding — instalación de KUAL y MRPI](https://kindlemodding.org/jailbreaking/post-jailbreak/installing-kual-mrpi/)
- [PEKI — paquete moderno de KUAL](https://github.com/KindleTweaks/PEKI)
- [USBNetworkLite](https://github.com/notmarek/kindle-usbnetlite)
- [KindleModding — bloqueo de actualizaciones OTA](https://kindlemodding.org/jailbreaking/post-jailbreak/disable-ota.html)
- [KindleModding — servicios LIPC](https://kindlemodding.org/kindle-apps-and-services/index.html)
- [NiLuJe/FBInk](https://github.com/NiLuJe/FBInk)
- [MobileRead Wiki — USBNetwork](https://wiki.mobileread.com/wiki/USBNetwork)

## Documentación relacionada

- [Prompt de implementación del dashboard financiero](../kindle-bolivia-financial-dashboard-codex-prompt.md)