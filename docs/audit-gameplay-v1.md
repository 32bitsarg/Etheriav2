# Audit Gameplay v1

Fecha: 2026-05-08
Rama: `audit-gameplay-v1`

## Estado validado

- Build web completo: `pnpm --filter @etheria/web build`.
- Typecheck API: `pnpm --filter @etheria/api lint`.
- Tests API: `pnpm --filter @etheria/api test:run`.
- Cobertura de dominio ampliada de 21 a 36 tests.

## Funciones actuales auditadas

### Core ciudad y economia
- Recursos: produccion pasiva, caps, affordability, suma/resta y clamp.
- Colas: limites configurables para construccion, entrenamiento e investigacion.
- Riesgo corregido: timestamps desordenados ya no reducen recursos pasivos.
- Riesgo corregido: `activeSlots` queda cappeado por `maxSlots` aunque el `.env` venga mal.

### Mundo y mapa
- Terreno: conversion world/normalized, buildable/walkable, busqueda de punto buildable y multiplicador de path.
- Riesgo pendiente: falta test de integracion con el JSON real del editor cuando exista `world-terrain-mask.json`.

### Bots
- Decision engine: recuperacion economica, llenado de slots, caza de barbaros y compatibilidad de logs sociales.
- Hallazgo de balance: un bot militarista puede preferir entrenar antes que cazar barbaros si el peso militar supera agresion. Es correcto segun pesos actuales, pero conviene tunear perfiles si queremos mas PvE activo.

### Social, combate y editor
- Estado estatico revisado: alianzas/chat/mail, batalla PvP/barbaros, editor de aldea y terrain mask estan presentes y conectados por rutas/hooks.
- Riesgo pendiente: hay mucha logica en rutas y workers con `any`; no rompe build, pero baja mantenibilidad y dificulta tests end-to-end.

## Propuestas nuevas priorizadas

1. Centro de reportes unificado: batalla, comercio, barbaros, mail, sistema y alianza.
2. Misiones iniciales configurables: construir, entrenar, investigar, mirar mapa, unirse/crear alianza.
3. Exploracion con spies: revelar fog, inspeccionar ciudades y descubrir campamentos.
4. Mercado avanzado: ofertas entre jugadores, tarifas por nivel de Market y limites configurables.
5. Alianzas vivas: objetivos de alianza, contribuciones, ranking y anuncios.
6. Bot personalities v2: memoria persistente de aliados/enemigos, retaliacion, preferencias sociales y objetivos semanales.
7. Eventos de temporada visibles: modificadores claros en HUD y reportes de impacto.
8. Editor como engine tool: preview de pathfinding, heatmap de spawn, warnings antes de guardar y validacion de assets.

## Recomendacion de siguiente rama

- `feature-report-center-v1` para empezar por reportes, porque ordena feedback de todos los sistemas existentes.
- `feature-onboarding-quests-v1` si la prioridad es retencion y guia de jugador nuevo.
- `feature-spy-exploration-v1` si la prioridad es darle sentido tactico a fog/mapa/spies.
