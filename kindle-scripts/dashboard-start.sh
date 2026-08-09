#!/bin/sh
# Dashboard Start — se copia a /mnt/us/financial-dashboard/ en el Kindle y se
# invoca desde KUAL. Reversible: solo toca preventScreenSaver y deja un
# marcador para que Stop restaure el estado exacto.
#
# ADVERTENCIA: mantener Wi-Fi + SSH despiertos aumenta el consumo de batería.
# Para uso continuo se recomienda un cargador de pared (no un cable de datos
# conectado a la Mac).

DIR=/mnt/us/financial-dashboard
STATE="$DIR/.powerstate"

mkdir -p "$DIR"

if command -v lipc-get-prop >/dev/null 2>&1; then
  # Solo si la propiedad existe: guardar valor previo y activar.
  PREV=$(lipc-get-prop com.lab126.powerd preventScreenSaver 2>/dev/null)
  if [ -n "$PREV" ]; then
    echo "$PREV" > "$STATE"
    lipc-set-prop com.lab126.powerd preventScreenSaver 1
    echo "Dashboard Start: preventScreenSaver=1 (previo: $PREV)"
  else
    echo "Dashboard Start: propiedad preventScreenSaver no disponible; sin cambios"
  fi
else
  echo "Dashboard Start: lipc no disponible; sin cambios"
fi

echo "started" > "$DIR/.dashboard-running"
echo "Dashboard Start: listo. La Mac puede empezar a enviar imágenes."
