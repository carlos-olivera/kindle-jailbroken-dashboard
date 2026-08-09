#!/bin/sh
# Dashboard Stop — restaura el comportamiento normal del Kindle. Solo revierte
# lo que Dashboard Start cambió; no toca procesos ni archivos ajenos.

DIR=/mnt/us/financial-dashboard
STATE="$DIR/.powerstate"

if command -v lipc-set-prop >/dev/null 2>&1; then
  PREV=0
  [ -f "$STATE" ] && PREV=$(cat "$STATE" 2>/dev/null || echo 0)
  case "$PREV" in ''|*[!0-9]*) PREV=0 ;; esac
  lipc-set-prop com.lab126.powerd preventScreenSaver "$PREV"
  echo "Dashboard Stop: preventScreenSaver restaurado a $PREV"
fi

rm -f "$STATE" "$DIR/.dashboard-running"
echo "Dashboard Stop: comportamiento normal restaurado."
