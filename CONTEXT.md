# Etheria — Contexto de Sesión

## Proyecto

**Etheria** — juego web de estrategia medieval asincrónico. Monorepo Turborepo + pnpm.

| Capa | Stack |
|------|-------|
| API | Hono + TS + Zod + MatecitoDB/PostgreSQL |
| Web | Next.js 15 + React 19 + Tailwind v4 |
| DB | PostgreSQL 17 local en VPS |
| Estado | Zustand + TanStack Query |

## VPS (producción)

```
IP: 192.99.54.33
User: ubuntu
```

### Comandos

```bash
# Ejecutar en el VPS
bash /home/sexs/programacion/avps/vps.sh exec "<comando>"

# Subir archivo
bash /home/sexs/programacion/avps/vps.sh upload <local> <remoto>

# Ver logs
bash /home/sexs/programacion/avps/vps.sh exec "journalctl -u etheria-api -n 50 --no-pager"
bash /home/sexs/programacion/avps/vps.sh exec "journalctl -u etheria-web -n 50 --no-pager"

# Estado servicios
bash /home/sexs/programacion/avps/vps.sh exec "systemctl status etheria-api etheria-web --no-pager"

# PostgreSQL
bash /home/sexs/programacion/avps/vps.sh exec "sudo -u postgres psql -d etheria"
```

### Deploy a producción

```bash
# 1. Fix ownership
bash /home/sexs/programacion/avps/vps.sh exec "sudo chown -R ubuntu:ubuntu /opt/etheria/app"

# 2. Rsync (sin node_modules, .next, dist, .git)
rsync -az --no-perms --no-owner --exclude={node_modules,.next,.git,dist,.turbo,.env,.env.local,.claude} \
  /home/sexs/programacion/etheria/ ubuntu@192.99.54.33:/opt/etheria/app/

# 3. Build + restart
bash /home/sexs/programacion/avps/vps.sh exec "cd /opt/etheria/app && sudo chown -R etheria:etheria . && sudo -u etheria pnpm build && sudo systemctl restart etheria-web"

# 4. Verificar
bash /home/sexs/programacion/avps/vps.sh exec "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 && echo ' web' && curl -s -o /dev/null -w '%{http_code}' http://localhost:4000/health && echo ' api'"
```

### Servicios y puertos

```
etheria-web.service  → :3000  → conquestofetheria.com (Caddy)
etheria-api.service  → :4000  → api.conquestofetheria.com (Caddy)
```

### DB

```
PostgreSQL 17 local en VPS
DB: etheria
User: etheria (etheria_local_2026)
Env: /opt/etheria/api.env → DATABASE_URL
```

### Comandos útiles en VPS

```bash
# Ejecutar en el VPS (vps.sh exec)
cd /opt/etheria/app

# Typecheck
sudo -u etheria pnpm --filter @etheria/api exec tsc --noEmit
sudo -u etheria pnpm --filter @etheria/web exec tsc --noEmit

# Tests
sudo -u etheria pnpm --filter @etheria/api test:run

# Build solo web (más rápido si solo cambiaste frontend)
sudo -u etheria pnpm --filter @etheria/web build

# Build completo
sudo -u etheria pnpm build

# Restart servicios
sudo systemctl restart etheria-web
sudo systemctl restart etheria-api

# Ver DB
sudo -u postgres psql -d etheria -c "SELECT id, name, race FROM cities;"
```

---

## Cambios realizados en esta sesión

### 1. Footer "Powered by matecito.dev"
- `apps/web/src/components/landing/LandingFooter.tsx:28`
- `apps/web/src/config/landingContent.ts:119`
- `apps/web/src/i18n/es.json:172` y `en.json:172`

### 2. Selección de raza (Humano, Elfo, Orco, Enano)

**Nuevos archivos:**
- `apps/api/src/domain/raceConfigData.ts` — config de 4 razas con bonuses
- `apps/web/src/config/raceConfig.ts` — datos de UI (iconos, colores, i18n keys)
- `apps/web/app/play/select-race/page.tsx` — página de selección

**Modificados:**
- `apps/api/src/domain/authService.ts` — `registerUser` ya NO crea ciudad (solo cuenta)
- `apps/api/src/domain/cityCreation.ts` — `createStarterCityForUser` acepta `race`, aplica bonuses
- `apps/api/src/routes/city.ts` — bootstrap acepta `race` en body
- `apps/api/src/routes/auth.ts` — try-catch + HTTP codes correctos (409 duplicado)
- `apps/web/src/components/game/GameInitializer.tsx` — si no hay ciudad ni pending_race → redirect a select-race. Guest flow espera `auth.ready`.
- `apps/web/src/i18n/es.json` + `en.json` — +20 keys de raza

**Flujo:** Registro → Login → `/play` → GameInitializer detecta sin ciudad y sin raza → redirect `/play/select-race` → elige raza → bootstrap con race → ciudad creada con bonuses.

### 3. Mobile optimization
- `VillageView.tsx` — modales con `max-sm:max-w-[calc(100vw-24px)]`, topbar compacta oculta SeasonHUD/ActiveBuffs en mobile
- `VillageCanvas.tsx` (Phaser, dead code) + `WorldMapCanvas.tsx` (Phaser) + `WorldMapHTMLCanvas.tsx` — `touchAction: "none"`
- `globals.css` — media queries mobile para modales, topbar, dock
- `VillageHTMLCanvas.tsx:248` — `setPointerCapture` solo en editor mode (fix click en edificios en mobile)

### 4. Migración del mapa mundial de Phaser a HTML/CSS

**Creado:**
- `apps/web/src/components/worldmap/WorldMapHTMLCanvas.tsx` — mapa completo en HTML/CSS puro

**Eliminado del juego (vivo solo en /editor):**
- Phaser ya NO se usa en aldea ni mapa. Solo queda para el editor de terrain painting.
- `VillageCanvas.tsx` (Phaser), `VillageScene.ts` — eliminados
- `play/page.tsx` — sin `import("phaser")`

**Features del mapa HTML:**
- Cámara con `transform: translate() scale()`, pan, pinch-zoom, wheel-zoom
- Fog of War con `<canvas>` y `destination-out`
- Weather overlay estacional
- City markers con tint de relación (ally/peace/hostile)
- Barbarian camp markers con colores por archetype
- Movement animations (ejércitos/caravanas) con rAF
- Clamp de cámara para no salir del mapa

**Archivos muertos (conservados para editor):**
- `WorldMapCanvas.tsx`, `WorldMapScene.ts` — solo usados por `/editor`

### 5. Fix clamp de cámara en la aldea

- `VillageHTMLCanvas.tsx` — `ZOOM_MIN` de `0.55 → 0.72`
- `clampCamera` reescrito: zoom < 1 fuerza centro, zoom ≥ 1 clamp dentro de bordes

### 6. DB: PostgreSQL local en VPS

- Creada DB `etheria` con usuario `etheria`
- `api.env` → `DATABASE_URL=postgresql://etheria:...@localhost:5432/etheria`
- Schema de Prisma con columna `race` agregada a `cities`
- Ciudades existentes actualizadas a `race = 'HUMAN'`

---

## Archivos clave para continuar

```
apps/api/src/
  domain/
    raceConfigData.ts       ← razas (NUEVO)
    cityCreation.ts         ← crea ciudad con race
    authService.ts          ← registerUser sin crear ciudad
    worldConfigData.ts      ← config de mundo single (futuro: multi-mundo)
  routes/
    city.ts                 ← bootstrap con race
    auth.ts                 ← try-catch
    world.ts                ← endpoints de mundo
  infrastructure/
    matecito.ts             ← DB provider (DB_PROVIDER=postgres)

apps/web/src/
  components/
    worldmap/
      WorldMapHTMLCanvas.tsx  ← mapa HTML/CSS (NUEVO)
      WorldMapCanvas.tsx      ← Phaser (solo editor)
    village/
      VillageHTMLCanvas.tsx   ← aldea HTML/CSS
      VillageView.tsx         ← vista principal (pueblo + mapa)
    landing/
      LandingFooter.tsx       ← footer con matecito.dev
    game/
      GameInitializer.tsx     ← auth + bootstrap + race flow
  app/play/
    select-race/page.tsx      ← página selección raza (NUEVO)
    page.tsx                  ← entrada del juego
  config/
    raceConfig.ts             ← datos UI de razas (NUEVO)
  i18n/
    es.json, en.json          ← +race keys
  game/scenes/                ← VACÍO (Phaser eliminado)
```

## Próximos pasos planificados

1. **Sistema multi-mundo** — tabla `worlds`, config por mundo, selección de mundo al entrar
2. **Editor: migrar de Phaser a HTML/CSS** — eliminar completamente Phaser
