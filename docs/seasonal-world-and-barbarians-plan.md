# Plan: estaciones mundiales, economia dinamica y barbaros PvE

## Objetivo

Implementar un sistema donde el mapa mundial no sea un fondo estatico, sino un sistema vivo:

- Las estaciones cambian la estrategia economica, militar y territorial.
- El clima tiene transiciones graduales y efectos por zona geografica.
- Los barbaros aparecen en el mapa como amenazas PvE con niveles, patrones de spawn y recompensas.
- Los barbaros pueden atacar ciudades de jugadores.
- Los jugadores pueden atacar campamentos barbaros para conseguir recursos, objetos o ventajas temporales.

El objetivo de diseno es que cada ciclo cree decisiones reales: prepararse, expandirse, atacar, defender, almacenar, negociar o cazar PvE.

## Principios de diseno

- Cada estacion debe favorecer estrategias distintas, no solo modificar porcentajes.
- Los valores deben salir de configuracion local o DB runtime, nunca hardcodeados en rutas/workers.
- Las estaciones deben afectar el mapa, la economia, la guerra y el PvE.
- El invierno debe funcionar como mecanica anti-whale: castiga sobreexpansion sin preparacion.
- La geografia debe importar: norte, centro, sur, costa, montana, bosque y llanura no deben sentirse iguales.
- Los barbaros deben ser parte del ecosistema: fuente de riesgo, recursos, progresion y actividad constante.

## Sistema de estaciones

### Ciclo base

El ciclo completo se compone de cuatro estaciones:

- Primavera: recuperacion, crecimiento, expansion temprana.
- Verano: produccion alta, campañas militares largas, comercio.
- Otono: cosecha, preparacion, tension estrategica.
- Invierno: escasez, desgaste, defensa, castigo a mala planificacion.

Cada estacion tiene tres fases internas:

- Inicio: efectos suaves, alertas tempranas y oportunidad de adaptacion.
- Pleno: efectos completos de la estacion.
- Transicion: 24-48 horas donde el clima cambia progresivamente hacia la proxima estacion.

### Duracion configurable

Crear `season_config` o `worldSeasonConfig` con:

- `serverSpeed`: multiplicador del servidor.
- `seasonDurationHours`: duracion base por estacion.
- `transitionDurationHours`: duracion de transicion.
- `phaseCurve`: curva de intensidad, por ejemplo `LINEAR`, `SMOOTH`, `HARSH`.
- `enabled`: permite activar/desactivar el sistema en dev.

Ejemplo de balance:

- Servidor x1: 5-6 semanas por estacion.
- Servidor x3: 10-14 dias por estacion.
- Dev local: 1-2 horas por estacion para testear ciclos completos.

### Estado persistido

Agregar entidad runtime:

```ts
WorldSeasonState {
  id: string;
  currentSeason: "SPRING" | "SUMMER" | "AUTUMN" | "WINTER";
  nextSeason: Season;
  phase: "START" | "PEAK" | "TRANSITION";
  intensity: number;
  startedAt: string;
  peakAt: string;
  transitionAt: string;
  endsAt: string;
  updatedAt: string;
}
```

`intensity` va de `0` a `1` y permite aplicar transiciones progresivas sin saltos bruscos.

## Efectos por estacion

### Primavera

Rol estrategico:

- Recuperacion post-invierno.
- Buen momento para reconstruir y expandirse.
- Actividad PvE moderada.

Efectos sugeridos:

- Produccion de comida positiva.
- Menor tiempo de construccion de edificios economicos.
- Spawn de barbaros bajo/medio.
- Mayor recuperacion de tropas heridas si se implementa hospital/sanacion.
- Menor chance de eventos climaticos severos.

Decisiones que habilita:

- Expandir minas, granjas y aserraderos.
- Reconstruir ejercitos.
- Atacar barbaros de bajo nivel para recuperar recursos.

### Verano

Rol estrategico:

- Temporada de guerra, comercio y produccion maxima.

Efectos sugeridos:

- Bonus de produccion general moderado.
- Mejor velocidad de marcha en llanuras/caminos.
- Mayor volumen comercial.
- Barbaros mas activos en rutas comerciales.
- Menor penalidad logistica para ataques largos.

Decisiones que habilita:

- Guerras ofensivas.
- Limpieza de campamentos barbaros.
- Expansiones territoriales.
- Proteccion de zonas de recursos.

### Otono

Rol estrategico:

- Cosecha y preparacion.
- El mapa empieza a tensarse antes del invierno.

Efectos sugeridos:

- Bonus fuerte de comida durante parte de la estacion.
- Bonus a almacenamiento o eficiencia de graneros si existe tecnologia relacionada.
- Aumento gradual de spawn barbaro.
- Alertas de invierno.
- Penalidad creciente a ataques largos durante transicion.

Decisiones que habilita:

- Almacenar comida.
- Firmar tratados antes del invierno.
- Limpiar campamentos peligrosos antes de que escalen.
- Fortificar ciudades fronterizas.

### Invierno

Rol estrategico:

- Escasez, defensa, supervivencia y anti-whale.

Efectos sugeridos:

- Reduccion de produccion de comida, especialmente en norte.
- Mayor consumo o presion logistica segun cantidad de tropas/ciudades.
- Penalidad a velocidad de marcha en zonas frias.
- Menor eficiencia ofensiva en ataques largos.
- Campamentos barbaros pueden volverse mas agresivos por saqueo.
- Bonus defensivo menor para ciudades preparadas o con tecnologias invernales.

Decisiones que habilita:

- Defender y conservar.
- Atacar objetivos cercanos, no campañas enormes.
- Cazar barbaros por comida si falta.
- Usar diplomacia para sobrevivir.

## Zonificacion geografica

### Modelo de zonas

El mapa mundial debe dividirse en zonas climaticas:

- Norte helado.
- Centro templado.
- Sur calido.
- Costa.
- Montana.
- Bosque.
- Llanura.

Cada ciudad y campamento barbaro resuelve su zona a partir de coordenadas y terrain tags.

### Intensidad geografica

La estacion global define el clima base, pero cada zona multiplica su intensidad.

Ejemplos:

- Norte en invierno: `1.35x` intensidad.
- Costa en invierno: `0.75x` intensidad.
- Sur en verano: `1.2x` calor, pero menos invierno.
- Montana: mas penalidad de marcha en invierno.
- Bosque: mas spawn barbaro y mejor madera.

### Implementacion tecnica

Agregar config:

```ts
WorldZoneConfig {
  id: string;
  name: string;
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  terrainTags: string[];
  seasonIntensity: Record<Season, number>;
  resourceModifiers: Record<ResourceType, number>;
  travelModifiers: Record<Season, number>;
  barbarianSpawnModifier: number;
}
```

No conviene guardar la zona fija en cada ciudad al principio. Mejor resolverla con un helper puro:

```ts
resolveWorldZone(posX, posY, worldConfig): WorldZoneConfig
```

Si luego el mapa crece, se puede cachear `zoneId` en ciudades y campamentos.

## Integracion con economia

### Produccion efectiva

La produccion final debe salir de una sola funcion de dominio:

```ts
calculateEffectiveProduction({
  baseProduction,
  techBonuses,
  allianceEffects,
  seasonState,
  worldZone,
  buildings,
})
```

Orden recomendado:

1. Produccion base por edificios.
2. Bonus de tecnologias.
3. Bonus de alianza/diplomacia.
4. Modificador de estacion.
5. Modificador geografico.
6. Caps de almacenamiento.

Esto evita que el HUD muestre una cosa y el worker genere otra.

### Comida y anti-whale

Para que invierno nivele sin sentirse injusto:

- No matar ciudades automaticamente.
- Aplicar presion gradual.
- Castigar principalmente tropas/ciudades sobredimensionadas sin comida.
- Dar herramientas de preparacion.

Opciones:

- Consumo de comida por tropas.
- Penalidad de entrenamiento si la ciudad esta sin comida.
- Reduccion de moral/ataque si hay hambruna.
- Desertion suave solo si la hambruna dura muchas horas.

Config sugerida:

```ts
WinterPressureConfig {
  foodProductionPenalty: number;
  troopFoodConsumptionPerHour: Record<UnitType, number>;
  starvationGraceHours: number;
  starvationAttackPenalty: number;
  desertionAfterHours: number;
}
```

## Integracion con tecnologias

Agregar tecnologias nuevas o extender las existentes:

- Graneros Avanzados: reduce penalidad de invierno sobre comida.
- Rutas Comerciales Invernalizadas: reduce penalidad de marcha en invierno.
- Caza y Recoleccion: aumenta recompensas contra barbaros en invierno.
- Cartografia del Norte: mejora exploracion y vision de campamentos en zonas frias.
- Logistica Estacional: reduce consumo de comida por tropas.

Los efectos deben entrar por `techConfigData.ts`, no por ifs hardcodeados.

Ejemplo de efecto:

```ts
{
  type: "SEASON_MODIFIER",
  target: "WINTER_FOOD_PENALTY",
  stat: "reduction",
  value: 0.15,
  operation: "ADD"
}
```

## Sistema de barbaros PvE

### Objetivo

Los barbaros deben crear actividad constante y riesgo controlado:

- Objetivos para jugadores nuevos.
- Amenazas para ciudades descuidadas.
- Fuente de recursos alternativa en invierno.
- Puntos calientes del mapa para conflicto indirecto entre jugadores.

### Entidades

```ts
BarbarianCamp {
  id: string;
  name: string;
  level: number;
  archetype: "RAIDERS" | "HUNTERS" | "MARAUDERS" | "WARHOST" | "NOMADS";
  posX: number;
  posY: number;
  zoneId: string;
  status: "ACTIVE" | "DEFEATED" | "DESPAWNING";
  spawnedAt: string;
  expiresAt?: string;
  lastActionAt?: string;
  nextAttackAt?: string;
  ownerEventId?: string;
}

BarbarianArmy {
  id: string;
  campId: string;
  units: Record<UnitType, number>;
  power: number;
}

BarbarianRewardTable {
  id: string;
  campLevelMin: number;
  campLevelMax: number;
  season?: Season;
  zoneId?: string;
  resources: ResourceRange;
  dropChance?: Record<string, number>;
}
```

### Tipos de campamentos

#### Raiders

- Campamentos comunes.
- Atacan ciudades cercanas de bajo/medio poder.
- Recompensa equilibrada.

#### Hunters

- Menos tropas, mas velocidad.
- Buen objetivo para caballeria.
- Mayor recompensa de comida/pieles si luego hay crafting.

#### Marauders

- Mas agresivos.
- Priorizan ciudades con muchos recursos sin defensa.
- Mejor loot de oro y madera.

#### Warhost

- Campamento de alto nivel.
- Requiere alianza o jugador avanzado.
- Puede lanzar ataques fuertes.
- Recompensas importantes.

#### Nomads

- Spawnean y se mueven o despawnean rapido.
- Eventos temporales.
- Buenos para actividad diaria.

## Spawn de barbaros

### Formas de spawn

1. Spawn natural por zona.
2. Spawn estacional.
3. Spawn reactivo por baja actividad PvE.
4. Spawn de evento global.
5. Spawn por frontera despoblada.

### Spawn natural

Cada zona tiene:

- Densidad maxima de campamentos.
- Nivel minimo y maximo.
- Tipos permitidos.
- Distancia minima a ciudades.
- Distancia minima entre campamentos.

### Spawn estacional

- Primavera: mas campamentos bajos.
- Verano: mas campamentos en rutas y zonas ricas.
- Otono: aumento progresivo.
- Invierno: menos campamentos chicos, mas saqueadores agresivos.

### Spawn reactivo

Si una zona queda sin campamentos, el worker repone lentamente.

Esto evita:

- Mapas vacios.
- Farmeo infinito inmediato.
- Ventaja excesiva por limpiar una zona con bots.

### Worker de spawn

Crear worker:

```ts
processBarbarianSpawns()
```

Responsabilidades:

- Leer `worldSeasonState`.
- Leer config de zonas y densidades.
- Contar campamentos activos por zona.
- Elegir posiciones validas.
- Crear campamento + ejercito.
- Agendar `nextAttackAt` si el arquetipo ataca.

Debe correr con intervalos configurables.

## Ataques de barbaros a jugadores

### Seleccion de objetivo

Un campamento puede atacar si:

- Esta activo.
- Tiene `nextAttackAt <= now`.
- Hay ciudades dentro de radio.
- La ciudad no esta bajo proteccion inicial.
- La diferencia de poder no es abusiva.

Score sugerido:

- Recursos almacenados.
- Distancia.
- Defensa baja.
- Actividad reciente del jugador.
- Temporada.
- Nivel del campamento.

### Proteccion contra frustracion

Reglas necesarias:

- No atacar ciudades nuevas.
- No encadenar ataques al mismo jugador.
- No saquear por debajo de un minimo de supervivencia.
- Avisar con tiempo: "Exploradores informan movimiento barbaro".
- Permitir cancelar/derrotar el ataque interceptando el campamento.

### Resolucion

Reusar el sistema de batallas existente:

- `attackerType: "PLAYER" | "BARBARIAN"`
- `defenderType: "PLAYER" | "BARBARIAN"`
- Battle report para jugador.
- Loot limitado.
- Perdidas aplicadas a ejercito barbaro si corresponde.

No duplicar logica de combate. Extender el modelo de battle para soportar entidades no ciudad.

## Ataques de jugadores a barbaros

### Flujo de usuario

En `/mapa`:

1. Jugador hace click en campamento barbaro.
2. Se abre radial o modal compacto.
3. Opciones: Atacar, Espiar, Ver nivel/recompensa estimada.
4. Jugador elige unidades.
5. Se crea marcha.
6. Al llegar, se resuelve batalla.
7. Si gana, obtiene recompensas.
8. Campamento queda derrotado, degradado o despawnea.

### Recompensas

Recompensas posibles:

- Oro, madera, piedra, comida.
- Bonus estacional temporal.
- Fragmentos de mapa o pistas de eventos.
- Prestigio/honor.
- Items si luego se implementa inventario.

Calculo recomendado:

```ts
calculateBarbarianReward({
  campLevel,
  archetype,
  season,
  zone,
  playerLosses,
  overkillRatio,
  rewardTable,
})
```

Para evitar abuso:

- Penalizar overkill extremo.
- Capear recompensas por nivel de jugador/ciudad.
- Cooldown o densidad limitada por zona.
- No permitir farmear campamentos muy inferiores de forma rentable.

## Integracion con mapa

### Visual

Campamentos visibles como sprites:

- Nivel 1-3: fogata/campamento chico.
- Nivel 4-6: empalizada.
- Nivel 7-9: fortin.
- Nivel 10+: warhost con estandartes.

Estados visuales:

- Activo.
- Espiado.
- En combate.
- Derrotado/despawning.
- Agresivo: icono rojo o animacion sutil.

### Datos para `/city/world-map`

Extender endpoint o crear endpoint separado:

- `GET /world/barbarians`
- `GET /world/season`

Mejor opcion inicial:

- Mantener `GET /city/world-map` para config visual.
- Crear `GET /world/state` que devuelva season + barbaros visibles.

Payload:

```ts
{
  season: WorldSeasonState,
  zones: WorldZoneSnapshot[],
  barbarianCamps: BarbarianCampMapItem[]
}
```

## Backend: endpoints propuestos

### Estaciones

- `GET /world/season`
- `GET /world/state`
- `POST /admin/world/season/advance` solo dev/admin.

### Barbaros

- `GET /world/barbarians`
- `GET /world/barbarians/:id`
- `POST /world/barbarians/:id/attack`
- `POST /world/barbarians/:id/spy`

### Reportes

Se puede reutilizar battle reports, agregando:

- `attackerKind`
- `defenderKind`
- `barbarianCampId`
- `reward`

## Backend: workers propuestos

### `processSeasonTicks`

- Avanza fase e intensidad.
- Genera alertas globales.
- Actualiza cache/state.

### `processResourceTicks`

- Debe llamar a `calculateEffectiveProduction`.
- Incluye tech, alianza, estacion y zona.

### `processBarbarianSpawns`

- Mantiene densidad por zona.
- Spawnea segun estacion e intensidad.

### `processBarbarianActions`

- Decide ataques PvE.
- Crea batallas barbaras.
- Respeta protecciones y cooldowns.

### `processBattles`

- Extender para resolver:
  - Player vs Player.
  - Player vs Barbarian.
  - Barbarian vs Player.

## Shared schemas

Agregar en `packages/shared`:

- `SeasonSchema`
- `SeasonPhaseSchema`
- `WorldSeasonStateSchema`
- `WorldZoneSchema`
- `BarbarianCampSchema`
- `BarbarianArchetypeSchema`
- `AttackBarbarianRequestSchema`
- `SpyBarbarianRequestSchema`
- `WorldStateResponseSchema`

## Configuracion local

Crear archivos:

- `apps/api/src/domain/seasonConfigData.ts`
- `apps/api/src/domain/worldZoneConfigData.ts`
- `apps/api/src/domain/barbarianConfigData.ts`
- `apps/api/src/domain/barbarianRewardConfigData.ts`

Evitar hardcodear:

- Duraciones.
- Modificadores.
- Rangos de spawn.
- Niveles.
- Recompensas.
- Radios de ataque.
- Cooldowns.

## Postgres / persistencia

Tablas sugeridas:

- `world_season_state`
- `barbarian_camps`
- `barbarian_armies`
- `barbarian_spawn_events`

Campos extra en `battles`:

- `attackerKind`
- `defenderKind`
- `attackerCampId`
- `defenderCampId`
- `reward`

Si se quiere evitar migracion grande al inicio, se puede usar JSON nullable para campos PvE, pero la version final deberia tipar bien el modelo.

## Frontend

### HUD

Mostrar:

- Estacion actual.
- Fase.
- Tiempo hasta proxima fase.
- Intensidad si esta en transicion.
- Alerta si hay evento severo.

Debe ser compacto, no un panel gigante.

### Mapa

Mostrar:

- Tinte/ambientacion estacional.
- Campamentos barbaros.
- Nivel del campamento.
- Estado agresivo o neutral.
- Tooltip con riesgo/recompensa estimada.

### Modal/radial de campamento

Opciones:

- Atacar.
- Espiar.
- Ver recompensas estimadas.
- Ver distancia/tiempo de marcha.

### Reportes

Extender reportes:

- "Victoria contra barbaros".
- "Campamento barbaro saqueo tu ciudad".
- Mostrar loot, perdidas y campamento.

## Fases de implementacion

### Fase 1: modelo de estaciones sin efectos destructivos

- Shared schemas.
- Config local de estaciones y zonas.
- Worker `processSeasonTicks`.
- Endpoint `GET /world/season`.
- HUD compacto de estacion.
- Changelog.

Riesgo bajo. Permite validar UX sin tocar economia.

### Fase 2: produccion efectiva estacional

- Crear `calculateEffectiveProduction`.
- Integrar en city snapshot y resource worker.
- Mostrar produccion/hora ya modificada.
- Agregar alertas de transicion.

Riesgo medio. Requiere testear que HUD y worker coincidan.

### Fase 3: campamentos barbaros pasivos

- Entidades y config.
- Worker de spawn.
- Render en mapa.
- Click/modal.
- Sin ataques todavia.

Riesgo medio. Valida densidad y visual.

### Fase 4: jugador ataca barbaros

- Endpoint attack.
- Battle support Player vs Barbarian.
- Reward calculation.
- Reports.
- Campamento derrotado/despawn.

Riesgo alto. Toca combate y recompensas.

### Fase 5: barbaros atacan jugadores

- Worker de acciones barbaras.
- Seleccion de objetivo.
- Protecciones anti-frustracion.
- Alertas previas.
- Battle support Barbarian vs Player.

Riesgo alto. Requiere buen balance.

### Fase 6: estaciones afectan barbaros

- Spawn estacional.
- Agresividad estacional.
- Recompensas estacionales.
- Invierno como presion anti-whale.

Riesgo medio/alto por balance.

## Test plan

### Estaciones

- El estado avanza correctamente de fase.
- La transicion no salta de golpe.
- El endpoint devuelve la misma estacion que usa el worker.
- Dev config permite ciclos rapidos.

### Produccion

- HUD y worker usan la misma produccion efectiva.
- Tech bonuses se acumulan con estacion y alianza.
- Caps de storage siguen respetandose.
- Invierno no genera valores negativos salvo sistemas explicitamente disenados para consumo.

### Zonas

- Ciudades en norte reciben mayor invierno.
- Costa reduce penalidad invernal.
- El resolver de zona es determinista.

### Barbaros

- Spawnean respetando distancia minima.
- No exceden densidad por zona.
- Niveles respetan zona/estacion.
- Despawnean o quedan derrotados correctamente.

### Player vs Barbarian

- El jugador no puede atacar sin unidades suficientes.
- La marcha calcula tiempo correctamente.
- Al ganar recibe recompensa.
- Al perder no recibe recompensa.
- Battle report se crea.

### Barbarian vs Player

- No atacan ciudades nuevas.
- No atacan repetidamente al mismo objetivo sin cooldown.
- Saqueo respeta limites.
- El jugador recibe alerta/reporte.

## Riesgos y decisiones pendientes

- Definir si el consumo de comida por tropas entra en la primera version de invierno o en una fase posterior.
- Definir si barbaros usan unidades existentes o tipos propios.
- Definir si espiar barbaros requiere `SPY_NETWORK`.
- Definir si las recompensas incluyen items ahora o solo recursos.
- Definir si los campamentos pueden subir de nivel si sobreviven demasiado.

## Recomendacion de implementacion

No implementar todo junto.

Orden recomendado:

1. Estaciones visibles sin impacto fuerte.
2. Produccion efectiva centralizada.
3. Barbaros pasivos en mapa.
4. Ataques de jugadores contra barbaros.
5. Barbaros atacando jugadores.
6. Invierno anti-whale completo con comida/logistica.

Este orden reduce riesgo porque primero crea infraestructura observable, despues toca economia, y recien al final introduce sistemas que pueden castigar al jugador.
