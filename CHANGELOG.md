# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release is named after a legendary era in the world of Etheria.

---

## [Unreleased]

### Planned

---

## [0.5.4] - El Pulso de las Estaciones - 2026-06-10

> *"La nieve por fin cae sobre la aldea, los íconos brillan sin marcos, y el tablero del reino se siente vivo."*

### Added
- Retratos ilustrados para cada raza en la selección de raza y la página principal
- Íconos ilustrados propios en todo el HUD: misiones, maravilla, logros, feed y configuración

### Changed
- HUD móvil rediseñado: barra superior oscura con nombre de aldea, todos los recursos y estación siempre visibles; barra inferior más baja que tapa menos el mapa
- HUD de escritorio y móvil pulidos: sin emojis, íconos consistentes y textos traducibles
- Íconos del menú lateral rehechos: ahora con fondo transparente y 60 veces más livianos
- Carga mucho más rápida en el celular: edificios e imágenes pesadas reducidas (más de 13MB menos al entrar a la aldea)

### Fixed
- La música ahora arranca correctamente en el celular (el desbloqueo de audio fallaba en algunos dispositivos Android y quedaba en silencio para siempre)
- Efectos de estación: la nieve, hojas y pétalos ahora caen de verdad en el mapa y también se ven en la aldea (antes quedaban congelados o invisibles)
- Los efectos de estación ya no se reinician solos cada vez que el juego actualiza datos
- Íconos del menú lateral que aparecían con un cuadrado blanco de fondo

---

## [0.5.3] - El Rostro de los Reinos - 2026-06-10

> *"Etheria se mira al espejo: las razas ya tienen rostro, los mundos muestran su estación, y el reino avisa cuando cambia."*

### Added
- Aviso de nueva versión dentro del juego: cuando publicamos una actualización, los jugadores en partida ven un cartel con el botón Actualizar
- Modal de novedades al entrar al juego después de cada actualización
- Emblemas heráldicos para cada raza (Humanos, Elfos, Orcos y Enanos) en la selección de raza y la página principal
- Fondos de pantalla con arte del juego en la selección de raza y de mundo
- Las tarjetas de mundo muestran el arte y el ícono de su estación actual

### Changed
- Página de changelog rediseñada: línea de tiempo, etiquetas de color por tipo de cambio y fechas relativas
- La página principal reemplaza los emojis por íconos ilustrados propios
- Imágenes del juego optimizadas: la web carga mucho más rápido (más de 180MB menos de peso)
- Vista de mapa y aldea más fluidas: menos trabajo de render en cada actualización de datos

### Fixed
- Traducciones faltantes en la pantalla de inicio de sesión móvil
- El changelog público ya no muestra entradas internas en la página principal
- Recuperación automática cuando el juego queda con una versión vieja tras una actualización

---

## [0.5.1] - El Despertar de las Tierras - 2026-06-09

> *"Las tierras dormidas despiertan. El norte ya no está vacío, el invierno golpea con justicia, y los almacenes por fin crecen."*

### Fixed
- **[JUEGO] Invierno justo:** las ciudades ya no se corrompen al entrar en su primer invierno con tropas. Un bug hacía que la comida desapareciera y la ciudad quedara injugable.
- **[JUEGO] Bárbaros en todo el mapa:** el norte, centro y sur del mundo ahora tienen campamentos bárbaros. Antes estaban vacíos — 3 de las 7 zonas no recibían actividad.
- **[JUEGO] Almacenamiento avanzado funcional:** la tecnología que prometía aumentar tu capacidad de almacenamiento ahora realmente lo hace. Antes investigarla no tenía ningún efecto.
- **[JUEGO] Invierno con personalidad:** ahora el invierno pega más fuerte en el norte (+35%) y más leve en el sur (−30%), como corresponde al clima de cada región.

---

## [0.5.0] - La Era del Viajero - 2026-06-09

> *"Las murallas caen, los horizontes se expanden. Etheria ahora viaja contigo, en tu bolsillo, en cualquier pantalla. El reino no conoce fronteras."*

### Added
- **[JUEGO] Barra de navegación rápida** en la parte inferior para moverte entre tu aldea, el mapa, mensajes, alianza y rankings sin perderte.
- **[JUEGO] Cola de construcción mejorada** que se acomoda sola para no tapar los botones de navegación.
- **[JUEGO] Bordes de pantalla respetados** en teléfonos con notch o barra inferior, ahora nada queda tapado.
- **[JUEGO] Bonificaciones visibles al tocar** los íconos de mejoras activas, ahora también funcionan con el dedo.

### Changed
- **[JUEGO] Menú lateral reemplazado** por la nueva barra inferior en celulares, todo al alcance del pulgar.
- **[JUEGO] Ventanas mejoradas**:
  - Botones de cerrar más grandes y fáciles de tocar en todas las ventanas del juego.
  - Las ventanas ahora ocupan toda tu pantalla y se adaptan perfecto, sin desbordes.
  - Esquinas redondeadas que se ajustan solas según tu dispositivo.
- **[JUEGO] Mejor visión de tu aldea** en el celular, ahora podés alejarte un poco más para ver todo de un vistazo.
- **[JUEGO] Notificaciones reposicionadas** para que no se superpongan con los botones de abajo.

### Fixed
- **[JUEGO] Contenido de ventanas** que antes se veía amontonado en el celular ahora se muestra ordenado y legible.
- **[JUEGO] Información de mejoras** que solo se veía pasando el mouse ahora también se ve al tocar con el dedo.

---

## [0.2.4] - La Forja de la Guerra - 2026-05-08

> *"Nuevas armas brillan en la forja. Piqueros, ballesteros y catapultas cambian el arte de la guerra. Los espias se mueven en las sombras, y cada ciudad siente el peso de sus decisiones."*

### Added
- **[UNITS] 3 nuevas unidades + rebalanceo completo**
  - PIKEMAN: anti-caballeria (Atk 25, Def 20, HP 90, AP 8). Entrenable en Cuartel.
  - CROSSBOWMAN: ranged pesado (Atk 35, Def 6, HP 50, AP 15). Requiere REINFORCED_BOWS.
  - CATAPULT: asedio alternativo (Atk 65, Def 5, HP 60, AP 35). Requiere SIEGE_ENGINEERING.
  - Warrior: Atk 10→18, HP 100→120. Archer: Atk 20→28. Cavalry: balanceado. Siege: Atk 80→60 (ya no domina).
- **[UNITS] Cuartel ahora entrena todas las unidades** (WARRIOR, PIKEMAN, ARCHER, CROSSBOWMAN, SIEGE, CATAPULT, SPY). Establo solo CAVALRY.
- **[SPY] Espionaje rebalanceado**
  - Espiar ciudad: el spy YA NO se consume (vuelve). Si es detectado, se pierde.
  - Espiar campamento: el spy siempre se pierde (mision peligrosa).
  - Intel de ciudad mejorado: `"LOW (0-9)"` / `"MEDIUM (25-49)"` con rango numerico.
  - Deteccion base 15%→10%. SPY_NETWORK ahora da counter-intel (-5% deteccion al espiar).
  - SPY entrenable desde nivel 1 del Cuartel (sin requerir SPY_NETWORK).
- **[UI] Panel de Buffs Activos** debajo del SeasonHUD: iconos para cada buff/debuff con tooltip al hover mostrando efecto, fuente (Alianza/Tech/Zona/Winter) y tiempo restante si es temporal.
- **[UI] Modal de ataque desde el mapa** (AttackCityModal): selector de tropas con +/-1 y +/-10, costo total y boton de enviar.
- **[UI] Modales de Cuartel y Biblioteca redisenados**: stats de unidad, presets de cantidad, tabs por categoria, bonos activos.
- **[UI] Reportes de batalla visibles** en el modal de Mensajes (pestana Reports).
- **[POWER] Sistema de poder mejorado**: techBonuses aplicados a stats de unidades, HP y AP en la formula, ranking muestra columna Alianza y tooltip con breakdown (🏛️/⚔️/📚).

### Changed
- **[BOTS] Visibilidad de ataques**: cooldowns reducidos (global 120→45min, attack 20-60→10-30min, target 45→25min), distancia max 80→140, bots pueden atacar otros bots.
- **[BOTS] Overhaul de IA**: defense logic, spy intelligence, trade solo aliados, seasonal adaptation, consecutivas loss recovery, build order aleatorio, mail/chat templates, barb hunt por nivel.
- **[BALANCE] Velocidades de viaje**: Warrior 60→160, Cavalry 120→280, Trade 100→200, etc. Cap visual de 8 min removido.
- **[UI] SeasonHUD redisenado**: muestra modificadores de recursos, barra de intensidad, tiempo restante, winter pressure. Traducciones i18n completas.

### Fixed
- **[i18n] Bug de dot-notation** en keys de version del changelog (`0.2.2` → `v0_2_2`). ~30 keys faltantes agregados.
- **[i18n] SeasonHUD** completamente traducido (EN/ES).
- **[UI] ResourceBar** ya no se expande a todo el ancho al lado del SeasonHUD.
- **[UI] Modal de biblioteca** roto (`ACADEMY` → `LIBRARY`).
- **[UI] Cuartel** no mostraba unidades entrenadas.
- **[BOTS] Market accept** incluye fee. Trade solo a aliados.

## [0.2.3] - El Eco de las Batallas - 2026-05-08

> *"El clamor del acero resuena en los valles. Cada ataque deja su marca, cada espia su sombra, cada estacion su huella. Los reinos que escuchan sobreviven."*

### Added
- **[AUDIO] Sistema de musica ambiente con Web Audio API**
  - Motor de audio con `AudioContext` nativo: cache de buffers decodificados, `GainNode` para volumen sin reiniciar tracks, manejo de politica de autoplay via unlock en primer gesture.
  - Reproduccion aleatoria de los 10 tracks .ogg; al terminar uno, pausa de 30-90s y elige otro del pool.
  - Al cambiar de ruta o de vista (pueblo ↔ mapa), corta el track actual y arranca uno nuevo desde 0.
  - `audioStore` con `isUnlocked` + `unlock()`, persistencia en localStorage; controles en `SettingsModal`.
  - `MusicController` integrado en layout raiz; `data/audioTracks.ts` para agregar/quitar archivos sin tocar logica.
- **[NOTIFICATIONS] Reportes de ataque entrante y deteccion de espionaje**
  - Al lanzar un ataque PvP, el defensor recibe un `GameReport` tipo `INCOMING_ATTACK` con ETA y composicion de tropas. Toast inmediato via `GameNotificationWatcher`.
  - Al espiar una ciudad, chance de deteccion: 15% base + TOWER×5% + SPY_NETWORK +10% (max 85%). Si detectado, el objetivo recibe `SPY_DETECTED`.
  - Al resolverse la batalla, el reporte de incoming attack se marca como leido automaticamente.
- **[UI] SeasonHUD redisenado**
  - Muestra temporada actual con emoji, fase, modificadores de recursos (+/-X% coloreados), barra de intensidad y tiempo restante.
  - Efecto de winter pressure visible ("Las tropas consumen comida").
  - Integrado en la barra superior de recursos, visible en /play y /mapa.
- **[UI] Modales de cuartel y biblioteca redisenados**
  - Cuartel/Establo: modal dedicado sin scroll con tabs por tipo de unidad, grid de stats (Atk/Def/HP/Speed/Carry/AP), selector de cantidad x1/x5/x10, costo total + tiempo, upgrade compacto.
  - Biblioteca: modal dedicado con tabs por categoria, toggle "Investigadas", stats de cada tech (nivel, costo, tiempo), panel de Bonos Activos mostrando todos los efectos acumulados.
- **[UI] Reportes de batalla integrados en el modal de mensajes**
  - La pestana "Reports" ahora muestra tanto game reports como battle reports (resultado, losses, loot), que antes eran invisibles.

### Fixed
- **[UI] i18n faltante**
  - Agregados keys `play.mail.compose`, `play.mail.selectRecipient`, `play.battle.selectTroops`, `play.battle.available`, `play.army.speed/carry/ap`, `play.research.*`, `play.training.*`, `play.seasons.*`.
  - Todos los textos del SeasonHUD ahora usan i18n (EN/ES completo).
- **[UI] Modal de biblioteca roto**
  - Corregido `showResearch` que chequeaba `"ACADEMY"` (building inexistente) en vez de `"LIBRARY"`.
- **[UI] Modal de cuartel sin conteo de tropas**
  - `TrainingSection` ahora muestra las unidades entrenadas por tipo antes de los botones de entrenar.

### Changed
- **[WORLD] Velocidades de viaje rebalanceadas**
  - Warrior: 60→160, Archer: 50→130, Cavalry: 120→280, Siege: 20→70, Spy: 200→400, Trade: 100→200.
  - Animacion de viaje ahora dura lo mismo que el viaje real (quitado cap de 8 min).
  - Aplicado retroactivamente a movimientos activos preservando progreso proporcional.
- **[WORLD] Terrain overlay desactivado** (los rectangulos semi-transparentes ya no se renderizan).

### Bots — Overhaul completo
- **[BOTS] No atacan otros bots** (excluidos de la lista de targets).
- **[BOTS] ERROR recovery con backoff exponencial**: bots en ERROR se resetean a ACTIVE con cooldown creciente (15min→30min→60min→120min).
- **[BOTS] Logica de defensa**: al detectar ataques entrantes, priorizan TOWER/BARRACKS/STABLE y cancelan ofensivas.
- **[BOTS] Spy intelligence**: si target fue espiado y tiene poder >1.5x, lo evitan.
- **[BOTS] Tropas en marcha no cuentan como disponibles** para nuevos ataques.
- **[BOTS] Memorias de decision**: `actionLog` de 20 entradas en state; `consecutiveLosses >= 2` cancela ataques (resetea tras 30min).
- **[BOTS] Market accept incluye fee** en el calculo de recursos.
- **[BOTS] Trade solo a aliados**: `chooseTrade` envia recursos solo a miembros de la misma alianza.
- **[BOTS] Chat pool**: 20+ frases variadas por perfil y canal.
- **[BOTS] Research usa categoria** (`ECONOMY/MILITARY/DEFENSE`) en vez de regex en ingles.
- **[BOTS] ECONOMIST puede unirse a alianzas**.
- **[BOTS] Tropas de ataque reducidas**: 50%→30% (MILITARIST 40%).
- **[BOTS] `favoredTargets` usado**: prioriza targets exitosos, anti-bullying cooldown x2 tras 3+.
- **[BOTS] Post-raid rebuild**: prioriza STORAGE/TOWER/FARM tras saqueo.
- **[BOTS] Adaptacion estacional completa**: SUMMER→GOLD_MINE/BARRACKS, AUTUMN→FARM/STORAGE, SPRING→TOWN_HALL/LUMBER_MILL, WINTER→FARM/STORAGE.
- **[BOTS] Reconstruccion de edificios destruidos**.
- **[BOTS] TECH_RUSHER prioriza unlocks** (`HORSE_BREEDING`, `SIEGE_ENGINEERING`, `SPY_NETWORK`).
- **[BOTS] Composicion de tropas variada**: entrena tipo con menos unidades.
- **[BOTS] Build order aleatorio** por bot + TOWER proactivo cada 6 upgrades.
- **[BOTS] Mail templates** variados por perfil.
- **[BOTS] Barbarian hunt por nivel** apropiado.
- **[BOTS] Query optimization**: limit en battles + config `BOT_ERROR_RECOVERY_MINUTES` / `BOT_METRICS_WINDOW_MINUTES`.

## [0.2.2] - El Mercado de los Reinos - 2026-05-08

> *"El oro corre mas rapido que la sangre, y las noticias mas rapido que el oro. Los reinos que dominan el comercio y la informacion gobiernan Etheria."*

### Added
- **[CORE] Auditoria full game v1** `[INTERNAL]`
  - Agregado reporte tecnico en `docs/audit-gameplay-v1.md` con estado de funciones actuales y propuestas nuevas priorizadas.
  - Ampliada la cobertura de tests de dominio para recursos, colas configurables, terreno del mundo y decision engine de bots.
- **[GAMEPLAY] Features V1 jugables**
  - Agregado centro unificado de reportes (`game_reports`) con endpoints `GET /reports` y `POST /reports/:id/read`, contador de no leidos y panel en `/play`.
  - Agregadas misiones iniciales (`player_quests`) con progreso por ciudad, claim de recompensas configuradas y reportes al completar.
  - Agregado mercado publico (`market_offers`) con crear/aceptar ofertas, requisito de `MARKET`, tarifa configurable y movimiento server-authoritative de recursos.
  - Agregado scouting con `SPY` sobre objetivos ya seleccionables; genera reportes `SPY_INTEL` con estimaciones sin revelar fog ni modificar visibilidad del mapa.
  - Agregados objetivos vivos de alianza con contribuciones de recursos, progreso visible y efecto temporal al completarse.
  - Extendida la persistencia dual MatecitoDB/PostgreSQL con colecciones, modelos Prisma y mapping en `postgresCompat`. `[INTERNAL]`
- **[UI] Reubicacion de gameplay V1**
  - Los reportes ahora se consultan desde el modal de mensajes, compartiendo badge de no leidos con el correo.
  - El mercado se abre desde el edificio `MARKET` en vez del sidebar.
  - Los campamentos barbaros pueden espiarse desde su modal y generan reportes sin revelar niebla.
- **[BOTS] Personalidades V2**
  - Los bots pueden crear/aceptar ofertas de mercado, contribuir a objetivos de alianza y hacer scouting usando servicios reales.
  - Las misiones iniciales salen de config de dominio para permitir balance y nuevas misiones futuras. `[INTERNAL]`
- **[WORLD] Reportes de temporada**
  - El worker de temporada emite reportes de sistema al cambiar estacion o fase, con impacto visible en el HUD.

### Fixed
- **[CORE] Robustez de recursos y colas**
  - La produccion pasiva ya no reduce recursos si `lastResourceUpdate` queda por delante del tiempo actual.
  - Los slots activos de colas configurables quedan limitados por el maximo de slots aunque el `.env` tenga valores inconsistentes.

## [0.2.1] - El Taller de Colas - 2026-05-07

### Added
- **[CORE] Colas secuenciales configurables**
  - Construcción, entrenamiento e investigación ahora soportan hasta 3 slots pendientes por ciudad.
  - Sólo 1 slot se ejecuta activamente por defecto; los siguientes quedan encadenados y avanzan cuando termina el anterior.
  - Los límites de slots y concurrencia salen de configuración (`CITY_QUEUE_*_MAX_SLOTS`, `CITY_QUEUE_*_ACTIVE_SLOTS`) para respetar el guideline de no hardcodear valores de gameplay.
- **[UI] Panel derecho de colas persistente**
  - `/play` muestra construcción, entrenamiento y saber en un único panel derecho siempre visible.
  - Cada item de cola incluye botón de cancelación con reembolso del 50% de recursos.
- **[WORLD] Asset de aldeas en mapa**
  - Las ciudades de jugadores y bots en `/mapa` ahora usan un sprite de aldea fortificada en vez del marcador genérico.
- **[BOTS] Simulacion viva de jugadores**
  - Los bots ahora pueden recuperarse de recursos criticos, priorizar economia antes de gastar y mantener memoria de sus decisiones.
  - Los bots pueden crear alianzas, unirse a alianzas, hablar por chat y enviar mensajes diplomaticos usando los mismos servicios que los jugadores.

### Changed
- **[BOTS] IA alineada con el motor de colas**
  - Los bots pueden llenar slots pendientes usando las mismas acciones de ciudad que los jugadores, en vez de detenerse ante una cola activa.
  - La simulacion de bots ahora funciona sobre la capa compatible de datos para respetar el proveedor configurado entre PostgreSQL y MatecitoDB.
- **[UI] Sidebar de juego simplificado**
  - Las colas duplicadas del sidebar izquierdo y del dock inferior fueron removidas para dejar una única fuente visual.

### Fixed
- **[EDITOR] Máscara de terreno del mapa**
  - Pintar `plains` ahora es visible en el overlay del editor.
  - El pincel cubre mejor los bordes de la grilla para evitar celdas difíciles de pintar.
  - La cámara del editor permite desplazar el mapa con margen adicional para pintar bordes cubiertos por paneles.

## [0.2.0] - El Mapa Viviente - 2026-05-06

### Added
- **[WORLD] Mapa del Mundo Dinámico (Live World Map)**
  - Visualización en tiempo real de ejércitos y caravanas comerciales sobre el mapa.
  - Las unidades se desplazan físicamente entre ciudades usando interpolación basada en tiempos de servidor.
  - Capa de **Clima Estacional**: El mapa refleja visualmente la estación actual (Nieve en invierno, tinte cálido en otoño, brillo solar en verano).
  - Sistema de **Niebla de Guerra**: Los jugadores solo pueden ver el mapa alrededor de su propia ciudad, revelando territorio al expandirse o explorar.
  - Menú Radial Interactivo: Nueva interfaz táctil/clic para interactuar con ciudades y campamentos directamente desde el mapa.
- **[BOTS] IA Avanzada y QA Automatizado**
  - Los bots ahora pueden atacar a jugadores reales de forma aleatoria, respetando la protección de novatos y tiempos de cooldown global.
  - Sistema de comercio automático: los bots envían recursos sobrantes a aliados o a ellos mismos para optimizar su economía.
  - Caza de bárbaros: la IA ahora detecta y elimina campamentos cercanos para limpiar el mapa y obtener recursos.
  - Los bots utilizan las mismas funciones (`cityActions`) que los jugadores, asegurando una validación de QA constante del motor de juego.
- **[API] Infraestructura de Movimientos Globales**
  - Endpoint `GET /api/city/world/movements`: unifica todas las batallas y caravanas activas del servidor en un solo flujo de datos para el cliente.
  - Soporte para ataques coordinados a campamentos bárbaros con tiempo de viaje real.

---

## [0.1.1] - La Puerta de Etheria - 2026-05-05

### Added
- **[WEB] Landing page pública para Conquest of Etheria**
  - Nueva landing page en `/` con diseño moderno y minimalista: Hero, Features, Screenshots, Lore, Footer, y sección de última versión.
  - Todo el contenido de marketing configurable desde `landingContent.ts` (zero hardcodeo).
  - Sección `LatestVersionSection` que muestra la última versión del changelog directamente en la landing.
  - Diseño dark fantasy refinado: glassmorphism sutil, gradientes ambientales, tipografía elegante.
- **[WEB] Blog de changelog sincronizado automáticamente**
  - Rutas `/changelog` y `/changelog/[version]` con SSG y páginas estáticas.
  - Parser robusto en `changelogParser.ts` con búsqueda recursiva del archivo para build time.
  - `getLatestRelease()` utilidad para obtener la versión más reciente.
- **[WEB] Layout público compartido**
  - Route group `(public)` con layout compartido que incluye Navbar fija y Footer en todas las páginas públicas.
  - Navbar y Footer visibles siempre en landing, login, registro y changelog.
  - Footer con atribución: "Desarrollado por 32bitsarg <3".
- **[WEB] Juego movido a `/play`**
  - Ruta `/play` es la nueva entrada al cliente de juego.
  - Login y registro redirigen a `/play` tras autenticación exitosa.
  - `GameInitializer` actualizado para permitir rutas públicas sin redirección forzada.
- **[WEB] Login y Registro rediseñados**
  - Nuevo diseño minimalista con tarjetas glassmorphism, mejor espaciado y tipografía.
  - Inputs con bordes redondeados, estados focus mejorados, y mensajes de error refinados.

---

## [0.1.0] - La Resistencia del Invierno - 2026-05-04

### Fixed
- **[CORE] Winter Pressure timing bug (CRITICAL)**
  - `evaluateWinterPressure` now uses real elapsed time (`hoursElapsed`) derived from `lastWinterEvaluatedAt` timestamp instead of assuming hourly ticks.
  - Eliminated double food penalty: winter pressure now uses `effective.production.foodPerHour` (already includes season/zone modifiers) instead of reapplying `foodProductionPenalty * zoneIntensity` on top of raw production.
  - Starvation hours, food balance, and desertion losses now scale proportionally to `hoursElapsed`, fixing the bug where armies starved/deserted in minutes instead of hours on 5-second worker ticks.
  - `lastWinterEvaluatedAt` is now persisted per city, making winter calculations survive worker/API restarts.
  - Added `resetWinterState()` to cleanly reset penalties when winter ends.
- **[CORE] Production calculation precision**
  - `calculateEffectiveProduction` now applies `Math.floor` only once at the end of the calculation chain instead of after each modifier step, recovering 1-3 units/hour in early-game production.

### Changed
- **[CORE] Season effects config-driven**
  - Moved hardcoded `seasonEffects` from `production.ts` to `seasonConfigData.ts` via `SEASON_RESOURCE_MODIFIERS`, following the "zero hardcoded gameplay values" guideline.
- **[CORE] Building production curve rebalance**
  - Changed `prodMult` formula from linear (`level * base.prodMultiplier`) to exponential (`Math.pow(base.prodMultiplier, level - 1)`), making late-game upgrades (levels 15-20) economically rational.
  - Adjusted base multipliers: GOLD_MINE/LUMBER_MILL `1.25 → 1.20`, QUARRY/FARM `1.25 → 1.18` to prevent early-game explosion while maintaining attractive late-game ROI.
- **[CORE] Extracted magic numbers to config**
  - Created `cityBaseConfig.ts` with `CITY_BASE_CONFIG.baseStorage`, replacing hardcoded `1000/1000/500/500` in `calculateCityStats`.
  - Created `battleConfigData.ts` with `BATTLE_CONFIG.lootWeights`, replacing inline `0.4/0.3/0.2/0.1` in `calculateLoot`.
  - Barbarian attack loot/survival values now read from `LOCAL_BARBARIAN_ATTACK_CONFIG` instead of inline objects in `queueWorker.ts`.
- **[PERF] Resource tick N+1 query elimination**
  - `processResourceTicks` now preloads all alliance memberships and effects in two bulk queries before the city loop, replacing per-city `getActiveAllianceEffects` calls.

### Added
- **[TEST] Unit test foundation**
  - Added Vitest setup (`vitest.config.ts`, `package.json` scripts) to `apps/api`.
  - Added 13 tests for `winterPressure.ts` covering: food balance, starvation scaling, combat penalty, desertion, recovery, and reset.
  - Added 8 tests for `production.ts` covering: base production, tech bonuses, seasonal modifiers (SPRING/WINTER), zone modifiers, combined modifiers, and non-negative production guarantee.
- **[INFRA] Repository publication hygiene**
  - Rewrote `README.md` to match the current project state, setup flow, contribution limits, and security expectations.
  - Replaced real-looking values in `.env.example` with placeholders.
  - Expanded `.gitignore` for nested env files, generated builds, caches, temporary assets, logs, and secret-bearing file types.
- **[CORE] Barbarian spawn persistence diagnostics**
  - Barbarian spawn now initializes season state when missing instead of silently skipping camp generation.
  - Barbarian camp and army inserts now validate DB errors and verify the persisted records after write.
  - Barbarian camp reads now surface PostgreSQL/Matecito errors instead of treating failed queries as empty data.

### Added
- **[CORE] World events planning**
  - Added an implementation plan for a public world event feed covering schema, domain services, emitters, routes, UI modal, testing, and rollout order.
- **[CORE] Bot player simulation MVP**
  - Added a design document for bot players as live QA simulation.
  - Added PostgreSQL bot persistence for bot identity, action logs, and metric snapshots.
  - Added shared city action services so humans and bots execute the same build, train, research, and attack logic.
  - Added a configurable bot worker with economy, military, tech-rusher, and balanced profiles.
  - Added bot action metrics for attempts, successes, expected blocks, validation errors, unexpected errors, battles, and research progress.
- **[CORE] Village power ranking and bot error reports**
  - Added automatic markdown reports for bot validation and unexpected errors with reproduction context.
  - Added city power calculation from buildings, army, and research.
  - Added a city ranking endpoint and UI view that ranks villages by Fuerza using village names.
  - Changed ranking to open as a modal from the sidebar without leaving the current view.
  - Added city renaming from the resource HUD and randomized default names for new players and bots.
- **[CORE] Season system - Phase 1: Visible seasons without strong impact**
  - Added shared schemas: `SeasonSchema`, `SeasonPhaseSchema`, `WorldSeasonStateSchema`, `WorldZoneSchema`, `WorldStateResponseSchema`, `SeasonConfigSchema`
  - Added `seasonConfigData.ts` with configurable season durations per server speed (x1: ~5 weeks, x3: ~10 days, dev: fast cycles)
  - Added `worldZoneConfigData.ts` with 7 climate zones (North, Center, South, Coast, Mountain, Forest, Plains) with season intensity multipliers
  - Added `seasons.ts` domain helpers: `getSeasonState`, `initializeSeasonState`, `advanceSeason`, `calculateIntensity`, `getCurrentPhase`
  - Added `seasonWorker.ts` running every 30s to advance season phases and update intensity
  - Added `GET /world/season` endpoint returning current season state
  - Added `GET /world/state` endpoint returning season + zone snapshots
  - Added `POST /admin/world/season/advance` endpoint for dev/admin season forcing
  - Added `GET /world/config` endpoint returning full world + season configuration
  - Added `SeasonHUD` component showing current season, phase, intensity (during transition), and time remaining
  - Added `useWorldSeason` and `useWorldState` React Query hooks
  - Integrated SeasonHUD into TopNav bar
  - Season intensity uses configurable phase curves (LINEAR, SMOOTH, HARSH) with smooth transitions
  - All values loaded from config files, zero hardcoded gameplay numbers
- **[CORE] Season system - Phase 2: Seasonal production integration**
  - Added `production.ts` domain module with `calculateEffectiveProduction` applying modifiers in strict order: base → tech → alliance → season → zone → caps
  - Replaced duplicate `applyProductionBonuses` in `queueWorker.ts` and `city.ts` with centralized `calculateEffectiveProduction`
  - Resource ticks now apply seasonal and geographic zone modifiers
  - City snapshot response includes `seasonModifiers` showing total multiplier per resource
  - Season effects: Spring (+food), Summer (+all), Autumn (++food), Winter (-food, -wood), all scaled by intensity
  - Geographic zone modifiers loaded from `worldZoneConfigData.ts` based on city position
- **[CORE] Barbarian camps - Phase 3: Backend + Frontend rendering**
  - Added shared schemas: `BarbarianCampSchema`, `BarbarianArmySchema`, `BarbarianRewardTableSchema`, `BarbarianCampMapItemSchema`, `BarbarianCampDetailSchema`
  - Added `barbarianConfigData.ts` with zone density, archetype configs, and power calculation
  - Added `barbarianRewardConfigData.ts` with reward ranges per archetype/level
  - Added `barbarians.ts` domain module with spawn logic, army generation, and camp detail fetcher
  - Added `BARBARIAN_CAMPS` and `BARBARIAN_ARMIES` collections in MatecitoDB
  - Added `barbarianSpawnWorker.ts` running every 60s to fill zones up to max density
  - Added `GET /world/barbarians` endpoint for lightweight camp listing
  - Added `GET /world/barbarians/:id` endpoint for detailed camp info with army and rewards
  - Updated `GET /world/state` to include `barbarianCamps` array
  - Updated `WorldStateResponseSchema` to include `barbarianCamps` field
  - Added `useBarbarianCamps` and `useBarbarianCampDetail` React Query hooks
  - Added barbarian camp rendering to `WorldMapScene.ts` with archetype-colored triangle markers
  - Added `BarbarianCampModal` component showing army composition, estimated power, and rewards
  - Updated `WorldMapCanvas` to pass barbarian data and handle camp selection events
  - Added barbarian state (`barbarianCamps`, `selectedCamp`, `showCampModal`) to `gameStore.ts`
  - Camp markers show level badge and name; click opens detail modal with attack button (disabled, Phase 4)
- **[CORE] Barbarian attack - Phase 4: Backend battles + Frontend attack UI**
  - Added shared schemas: `AttackBarbarianRequestSchema`, `BarbarianBattleResultSchema`, `BarbarianBattleSchema`
  - Added `BARBARIAN_BATTLES` collection in MatecitoDB for battle lifecycle tracking
  - Added `POST /world/barbarians/:id/attack` endpoint: validates units, creates battle record, deducts units
  - Added `processBarbarianBattles()` in `queueWorker.ts`: resolves MARCHING -> RETURNING with battle outcome
  - Added `processBarbarianReturns()` in `queueWorker.ts`: resolves RETURNING -> VICTORY/DEFEAT, distributes loot, returns surviving units
  - Barbarian battles reuse `resolveBattle()` but skip wall/tower/defender tech logic
  - Added `useAttackBarbarianCamp` React Query mutation hook
  - Updated `BarbarianCampModal` with troop selection UI (+1/+10 buttons), attack button, and victory/defeat result screen
  - Fixed circular imports: `getUnitStats` imported from `units.js` instead of `battles.js`
- **[CORE] Barbarians attack players - Phase 5: Backend worker + Frontend alerts**
  - Added shared schemas: `BarbarianAttackSchema`, `BarbarianAttackAlertSchema`
  - Added `BARBARIAN_ATTACKS` and `BARBARIAN_ATTACK_ALERTS` collections in MatecitoDB
  - Added `barbarianAttackConfigData.ts` with configurable attack rules: min city age, cooldowns, loot caps, survival resources, archetype frequencies, season multipliers
  - Added `barbarianAttacks.ts` domain module with target selection scoring, army fraction calculation, and attack creation
  - Target selection considers: resource attractiveness, defense weakness, distance, season aggression, power ratio
  - Added `processBarbarianAttacks()` in queue worker: selects targets based on archetype frequency and season, creates attack marches
  - Added `resolveBarbarianAttackArrivals()`: resolves Barbarian vs Player battles with wall/tower defense, creates battle reports, applies loot with survival minimums
  - Added `processBarbarianAttackReturns()`: returns surviving barbarian troops to camp army
  - Anti-frustration protections: min city age (2h), min city power, attack cooldowns (12h per camp, 6h per city), max simultaneous attacks, survival resource floor
  - Season affects attack frequency (Winter 1.5x, Spring 0.7x) and army size (Winter 1.4x, Spring 0.8x)
  - Archetype-specific frequencies: Raiders 4/day, Hunters 3/day, Marauders 2/day, Warhost 1/day, Nomads 5/day
  - Added `GET /world/barbarian-alerts/:cityId` endpoint for fetching incoming attack alerts
  - Added `POST /world/barbarian-alerts/:id/read` endpoint for dismissing alerts
  - Added `useBarbarianAttackAlerts` and `useMarkBarbarianAlertRead` React Query hooks
  - Added `BarbarianAttackAlertBanner` component showing urgent incoming attack warnings with countdown timer
  - Added barbarian attack alerts to `gameStore.ts` state management
  - Updated `BattlePanel` ReportsTab to show barbarian attack indicator on relevant battle reports
   - Integrated `BarbarianAttackAlertBanner` into `VillageView` shell
- **[CORE] Seasons affect barbarians - Phase 6: Seasonal spawn, rewards, escalation, and winter pressure**
  - Added `LOCAL_SEASONAL_SPAWN_CONFIG` to `barbarianConfigData.ts`: configurable spawn probability, archetype weights, level bonuses, density multipliers, and escalation rules per season
  - Replaced hardcoded seasonal weights in `pickRandomArchetype()` with config-driven `archetypeWeights` (Winter: MARAUDERS/WARHOST 1.5x, Spring: NOMADS 1.3x, etc.)
  - Replaced hardcoded level adjustments in `pickCampLevel()` with config-driven `levelBonus` (Winter +2, Autumn +1)
  - Replaced hardcoded spawn chances in `processBarbarianSpawns()` with config-driven `spawnProbability` (Spring 0.4, Summer 0.35, Autumn 0.45, Winter 0.25)
  - Added `getEffectiveMaxDensity()` applying seasonal `densityMultiplier` (Spring 1.2x, Winter 0.7x)
  - Added `SEASONAL_REWARD_MULTIPLIERS` to `barbarianRewardConfigData.ts`: Winter 1.3x, Autumn 1.15x, Summer 1.0x, Spring 0.85x
  - Added `calculateActualReward()`: random reward within config range with season multiplier and overkill penalty (threshold from config, linear decay to 0.3x at 3x threshold)
  - Updated `getBarbarianCampDetail()` and barbarian battle resolution to use season-aware reward calculation
  - Added `winterPressure.ts` domain module: per-troop food consumption, zone intensity multipliers, starvation grace period, combat penalty, and desertion mechanics
  - Integrated winter pressure into `processResourceTicks()`: applies troop food consumption during winter, tracks `winterState` on city records, applies desertion losses after extended starvation
  - Added `processCampEscalation()`: surviving camps level up every 24h with 30% chance (configurable), up to max level 10
  - Added escalation check to `barbarianSpawnWorker` (runs every 5 spawn ticks)
  - Winter pressure config: WARRIOR 0.5/h, ARCHER 0.4/h, CAVALRY 1.0/h, SIEGE 0.3/h, SPY 0.2/h; 4h grace; -20% combat after grace; 5% desertion/hour after 12h starvation
  - Zone winter intensity: North 1.35x, Mountain 1.2x, Center/Plains 1.0x, Forest 0.9x, Coast 0.75x, South 0.7x
  - Added `spawnedAt` field to `BarbarianCampMapItemSchema` for camp age tracking
  - Added `WinterPressureBanner` component: collapsible warning showing food deficit, starvation countdown, troop consumption, and combat penalty
  - Integrated `WinterPressureBanner` into `VillageView` shell (hidden during immersive view)
  - Added `useWinterPressure` React Query hook for fetching city winter pressure data
  - Added escalation indicators to `WorldMapScene.ts`: pulsing orange ring on camps nearing level-up (within 2h of escalation threshold)
  - Updated `GET /world/barbarians` endpoint to include `spawnedAt` timestamp
  - Updated `GET /world/state` endpoint to include `spawnedAt` in barbarian camp snapshots

---

## [0.0.4] - La Diplomacia de los Reinos - 2026-05-01

> *"Los reinos ya no crecen solos: pactan, traicionan, marchan y prosperan bajo alianzas que dejan huella en toda Etheria."*

### Added
- **[SOCIAL] Alliance diplomacy and mail MVP**
  - Added player mail with unread badges from the village sidebar
  - Added alliance creation/join flow gated by Alliance Center level 5
  - Added alliance roles, editable public forum/introduction, peace treaties, public diplomacy history, and timed alliance effects
- **[SOCIAL] Realtime alliance and global chat MVP**
  - New collections: `alliances`, `alliance_members`, `chat_messages`
  - New endpoints: `GET /alliances/me`, `POST /alliances`, `POST /alliances/:id/join`
  - New endpoints: `GET /chat/messages`, `POST /chat/messages`
  - Village dock now includes a realtime chat tab with `Global` and `Alianza`
- **[UI] Immersive bottom dock for village queues and chat**
  - Unified dock for construction queue, active research, and chat
  - Dock styling aligned with the existing medieval fantasy UI
- **[INFRA] Local config sources for static gameplay data**
  - Added code-based sources for building, unit, tech, and world config under `apps/api/src/domain`

### Changed
- **[CORE] Resource generation now applies active gameplay modifiers**
  - Resource ticks and city snapshots apply technology production bonuses and active alliance peace production effects
- **[CORE] Combat and training now use effective technology modifiers consistently**
  - Attack travel speed uses attacker unit speed bonuses
  - Training costs use active training cost reduction on both backend validation and village UI previews
  - Battle resolution now evaluates attacker and defender technology bonuses independently
- **[CORE] City bootstrap payload now includes active research and alliance membership**
  - `researchQueue`, `activeResearch`, and `allianceMembership` are hydrated into the base city payload
- **[UI] Village actions now use authoritative backend mutations**
  - Building upgrade, unit training, and research start from `village` now use API mutations instead of local-only optimistic state
- **[INFRA] Social/chat limits are configurable through environment-based social config**
  - Chat max length, rate limit window, bootstrap history size, and default alliance bootstrap values moved behind backend config
- **[BALANCE] Building config coverage is now enforced at seed and API boot**
  - `building_configs` must cover every active `BuildingType` and all levels up to each type's `maxLevel`
- **[INFRA] Static balance/runtime split**
  - Building configs, unit configs, tech configs, and world config now load from local code instead of Matecito collections
  - `db:setup` now focuses on runtime collections only
  - `db:seed` is no longer required for static gameplay balance
- **[INFRA] World generation config moved to DB**
  - New `world_config` collection with dev fallback gated by `ALLOW_DEV_DEFAULTS`
- **[UI] `/mapa` now uses continuous land rendering**
  - Removed visual dependence on island/zones in the Phaser scene
  - Castle markers are placed directly on persistent city coordinates
- **[CORE] Defensive building model simplified**
  - `WALL` removed from the shared building catalog and frontend build menus
  - `TOWER` now acts as the single defensive structure for both passive defense bonus and tower damage
  - Legacy wall records are normalized as towers at runtime to avoid breaking existing cities

### Fixed
- **[CORE] Technology modifiers no longer drop global unit bonuses**
  - Unit stat calculations now include both `all` and per-unit technology effects
- **[CORE] Battle resolution no longer applies defender tech bonuses to attacker calculations**
  - Defender wall/tower bonuses remain defender-only while attacker combat tech and dishonor effects apply only to attacker damage
- **[ECONOMY] Training cancellation refunds now respect the effective reduced training cost**
  - Refunds are calculated from the same cost basis used when starting training
- **[CORE] Removed silent fallback defaults for missing `building_configs`**
  - API now fails explicitly when a building config is missing instead of returning fake zero-value defaults
- **[UI] World map terrain background as raster asset**
  - Generated land background under `public/assets/backgrounds/world-map-ground.png`
  - Phaser world map now renders a fixed terrestrial background instead of water/islands
- **[API] Configurable terrestrial world map endpoint**
  - `GET /city/world-map` returns map bounds, camera settings, terrain asset path, and decor settings
- **[CORE] Configurable soft-cluster spawn allocation**
  - New cities spawn from `world_config.map` + `world_config.spawn`
  - Positions persist directly in `cities.posX/posY` without island/slot allocation
- **[INFRA] Auth system (MatecitoDB sessions)**
  - `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
  - HTTP-only session cookie (`etheria_session`) with remember-me support
  - Frontend pages `/login` and `/registro` with "Recordar usuario"
- **[CORE] World map islands + slots persistence**
  - `islands` + `island_slots` collections
  - `/city/islands` endpoint returns islands + slot occupancy counts
  - City creation allocates a slot (4-9 per island via 9 slots)
- **[UI] Phaser world map (pan/zoom + animated water)**
  - Water tile + island sprites as real assets under `public/assets/map`

---

## [0.0.3] - La Forja de Armas - 2025-04-29

> *"El conocimiento es el arma más poderosa. Aquellos que dominan la forja de armas y la ciencia de la guerra conquistarán Etheria."*

### Added
- **[CORE] Technology Tree — 22 Researchable Technologies**
  - 3 categories: **Economy** (6 techs), **Military** (8 techs), **Defense** (6 techs)
  - 2 mutually exclusive specialization branches: **Siege Mastery** vs **Cavalry Mastery**
  - Prerequisites system: must unlock lower tiers before advanced techs
  - Sequential leveling: technologies must be researched one level at a time
  - `TechConfig` schema with effects, costs, prerequisites, and mutual exclusions
  - `CityTech` and `ResearchQueue` collections for persistence

- **[CORE] Tech Bonuses System — Real Combat Impact**
  - `calculateTechBonuses()` computes aggregated bonuses from all unlocked techs
  - Unit stat bonuses: attack, HP, defense, speed, armor penetration (per unit type)
  - Resource production bonuses (+5% / +10% / +15% tiers)
  - Wall defense multiplier: `1 + wallLevel * 0.08 * techBonus`
  - Tower damage per round: `towerLevel * 5 + techBonus`
  - Training cost reduction (-15% with Wartime Economy)
  - Tech bonuses stored on city record for fast lookup

- **[CORE] Real Wall & Tower Combat Effects**
  - `resolveBattle()` now reads actual Wall and Tower levels from defender's buildings
  - Wall bonus formula: `defenderHp * (1 + wallLevel * 0.08 * wallBonusMultiplier)`
  - Tower damage: inflicts `towerLevel * 5 + towerDamageBonus` HP per round to attacker
  - Both bonuses apply dynamically based on defender's infrastructure + researched techs

- **[CORE] Unit Unlock Gates**
  - **Cavalry** requires `HORSE_BREEDING` tech
  - **Siege** requires `SIEGE_ENGINEERING` tech
  - **Spy** requires `SPY_NETWORK` tech
  - Frontend shows locked units with requirements
  - Backend validates unlock status before training

- **[API] Research Endpoints**
  - `GET /city/:id/techs` — list all techs with unlock status, costs, and canResearch flag
  - `POST /city/:id/research` — start researching a technology (validates prerequisites, resources, mutex)

- **[WORKER] Research Queue Processing**
  - `processResearchQueues()` checks for completed research every 5s
  - Upserts `city_techs` record with new level
  - Recalculates and stores `techBonuses` on city

- **[UI] Research Panel**
  - `ResearchPanel.tsx` with 3 tabs (Economy / Military / Defense)
  - Visual tech cards showing: name, description, level, cost, time, prerequisites
  - Color-coded categories and lock/unlock states
  - Active research indicator with completion timer
  - Toggle button + Library building integration (click Library → Open Research)

- **[SEED] Tech Configs Seed Data**
  - 22 technologies with balanced costs and effects
  - Progressive difficulty: early techs ~300g/5min, late specializations ~2500g/40min

### Changed
- `resolveBattle()` signature: now accepts `wallLevel`, `towerLevel`, and `techBonuses`
- `getUnitStats()` now accepts `techBonuses` parameter for dynamic stat calculation
- `getCityWithResources()` now fetches `cityTechs` and `researchQueue`
- `queueWorker.ts` now processes research queues between training and resource ticks

---

## [0.0.2] - Las Primeras Guerras - 2025-04-28

> *"Cuando las primeras ciudades crecieron, los comandantes miraron más allá de sus muros. Así comenzaron las Guerras de Etheria."*

### Added
- **[CORE] Battle System v2 — End-to-End Warfare**
  - `resolveBattle()` now applies losses to **both attacker and defender**
  - `calculateLoot()` based on surviving units' carry capacity
    - Loot distribution: 40% gold, 30% wood, 20% stone, 10% food
    - Cannot exceed defender's available resources or total carry
  - **Battle Resolution Worker** (`processBattles()` in `queueWorker.ts`)
    - Detects battles where `arrivesAt <= now` and `status = MARCHING`
    - Resolves combat, applies defender losses, deducts loot
    - Creates battle reports for both attacker and defender
    - Transitions battle to `RETURNING` state with `returnsAt` timestamp
  - **Battle Return Worker** (`processBattleReturns()`)
    - When `returnsAt <= now`, adds surviving troops back to attacker
    - Transfers loot to attacker's resources (capped by storage)
    - Finalizes battle status to `VICTORY` or `DEFEAT`
  - **Battle Reports collection** (`battle_reports`)
    - Persistent reports with attacker/defender names, losses, loot
    - Read/unread status per recipient city
    - Separate perspective for attacker (VICTORY/DEFEAT) vs defender
- **[API] Battle Routes**
  - `GET /city/list/all` — list all cities for attack target selection
  - `GET /city/:id/battles/reports` — fetch battle reports
  - `POST /city/:id/battles/reports/:reportId/read` — mark report as read
  - `GET /city/:id/battles/active` — fetch marching/returning battles
- **[UI] Battle Panel** (`BattlePanel.tsx`)
  - Three-tab interface: **Attack**, **Reports**, **Active**
  - **Attack tab**: dropdown of all cities, unit selector with count validation
  - **Reports tab**: chronological list with losses, loot, read/unread status
  - **Active tab**: live timers for marching/returning battles
- **[UI] React Query Battle Hooks**
  - `useAllCities()` — fetch attack targets
  - `useAttackCity()` — send attack with optimistic invalidation
  - `useBattleReports()` — poll reports every 5s
  - `useMarkReportRead()` — mark individual reports as read
  - `useActiveBattles()` — poll active battles every 5s
- **[CORE] Unit Stats v2 — HP & Armor Penetration**
  - Extended `unit_configs` schema with two new DB-driven stats:
    - `hp` — hit points per unit (determines army durability)
    - `armorPenetration` — reduces enemy effective defense before damage calc
  - All unit types re-balanced with distinct combat roles:
    - **Warrior**: tanky infantry (100 HP, 0 AP) — high survivability
    - **Archer**: ranged glass cannon (60 HP, 5 AP) — ignores light armor
    - **Cavalry**: fast shock troops (120 HP, 10 AP) — breaks formations
    - **Siege**: wall destroyer (80 HP, 30 AP) — massive armor penetration
    - **Spy**: scout only (30 HP, 0 AP) — no combat value
  - Stats scale per level via `statMultiplier` (HP) and `apMultiplier` (armor penetration)
  - `getUnitStats()` returns `hp` and `armorPenetration` with legacy fallback defaults
  - `resolveBattle()` completely rewritten using **HP pool combat model**:
    - Calculates total army HP and damage-per-round for both sides
    - Damage formula: `max(1, attack - max(0, enemyDefense - armorPenetration))`
    - Simulates rounds: winner is whoever destroys enemy HP pool first
    - Losses distributed proportionally by each unit type's HP contribution
    - Defender gets +20% effective HP from wall bonus (placeholder for real wall levels)

### Changed
- **[CORE] Visual Assets**
  - All 13 building types have procedural placeholder sprites
  - Scaffold texture for buildings under construction
  - Dark fantasy theme consistent across UI and game layer
- **[UI] Frontend-Backend Integration (Fase 1 Complete)**
  - Guest auth system (`guestAuth.ts`) with `localStorage` persistence
  - `GameInitializer` component: auto-creates or resumes city on load
  - Next.js API proxy rewrites (`/api/*` → backend) already configured
  - React Query hooks (`useCity`, `useBuildBuilding`, `useUpgradeBuilding`) with 5s polling
- **[UI] Real-time Resource Display**
  - `ResourceBar` calculates resources locally between server syncs (1s tick)
  - Shows production rates and storage caps with color-coded caps
  - Server remains authoritative; frontend is visual-only calculation
- **[UI] Building Interaction System**
  - Click existing building → opens `BuildingInfoPanel` with upgrade button
  - Select building from `BuildingMenu` → click tile → `BuildConfirmationModal`
  - `QueuePanel` shows live construction timers with progress bars
- **[UI] Phaser Map Integration**
  - `GameScene` renders real buildings from API (not hardcoded)
  - Construction sites show scaffold sprite with animated timer
  - Level badges displayed on buildings (level > 1)
  - `BootScene` generates `SCAFFOLD` texture and improved placeholders

---

## [0.0.1] - La Fundación de Etheria - 2025-04-28

> *"En el principio, solo existía el Vacío. Luego, los Primeros Constructores alzaron sus ciudades desde la tierra, y así nació Etheria."*

### Added
- Development guidelines (`GUIDELINES.md`) enforcing changelog-driven development and zero hardcoded values
- **Backend hotfix applied** to matecito.dev (`search_fields` / `search_vector` columns + error surfacing)
- **Migrated database from PostgreSQL/Prisma to matecito.dev document DB**
  - Configs stored in `building_configs` (225 records) and `unit_configs` (85 records)
  - Runtime cache in memory for instant reads
  - All domain logic (`getBuildingCost`, `getUnitStats`, etc.) reads from DB
- **Unit Config Table** (`unit_configs`) with 5 unit types × 20 levels
  - Warriors, Archers, Cavalry, Siege, Spies
  - All stats (attack, defense, speed, carry, training cost/time) are DB-driven
- **Building Queue Completion Worker** (`queueWorker.ts`)
  - Tick every 5 seconds checks for completed build queues
  - Upgrades building level and recalculates city production/storage
- **Training Queue Completion Worker**
  - Adds completed units to city when training finishes
- **Resource Tick System**
  - Updates all cities' resources every 5 seconds based on elapsed time
  - Resources capped by storage limits
- `.env` configured with matecito.dev credentials for `etheria.matecito.dev`
- Seed script `seed-matecito.ts` for game balance configs
- **Monorepo architecture** with Turborepo + pnpm workspaces
- **Frontend**: Next.js 15 + React 19 + Phaser 3.85 game engine
- **Backend**: Hono API with Clean Architecture
- **Tilemap system**: 50x50 grid with camera pan, zoom, and click-to-build
- **10 starter buildings** for new cities:
  - Town Hall, Barracks, Stable, Farm
  - Gold Mine, Lumber Mill, Quarry
  - Alliance Center, Library, Storage
- **Resource system**: Gold, Wood, Stone, Food, Gems with passive generation
- **Building configs stored in DB** for easy balancing:
  - Cost formulas with multipliers per level
  - Production rates per hour
  - Storage capacity bonuses
  - Build times with scaling
- **City creation API** (`POST /city/create`) with starter buildings
- **Building queue system** for construction and upgrades
- **Training queue** for military units
- **Battle/Attack system** with travel time calculation
- **Resource calculation** based on elapsed time (offline progression)
- **HUD overlay**: Resource bar + Building menu in React
- **Domain separation**: Pure game logic isolated from HTTP/DB infrastructure
- **Shared types package** with Zod schemas for type-safe API contracts
- **CHANGELOG** and **README** documentation

### Technical
- TypeScript strict mode across all packages
- Hot reload for all services via Turborepo
- Environment-based configuration
- Seed script for game balance tuning

---

## Version Naming Convention

| Version | Name | Theme |
|---------|------|-------|
| 0.0.1 | **La Fundación de Etheria** | The First Cities |
| 0.0.2 | **Las Primeras Guerras** | Military & Warfare |
| 0.0.3 | *La Forja de Armas* | Advanced Units & Gear |
| 0.0.4 | **La Diplomacia de los Reinos** | Alliances & Chat |
| 0.1.0 | **La Resistencia del Invierno** | Seasons & Barbarians |
| 0.1.1 | **La Puerta de Etheria** | Public Web & Landing |
| 0.2.0 | **El Mapa Viviente** | Live World & Smart Bots |
| 0.2.1 | **El Taller de Colas** | Queue Workshop |
| 0.2.2 | **El Mercado de los Reinos** | Market, Reports & Espionage |
| 0.2.3 | **El Eco de las Batallas** | Audio, Notifications & Bot AI |
| 0.2.4 | **La Forja de la Guerra** | PvP Balance, Units & Buffs |
| 0.3.0 | *Las Ruinas Olvidadas* | Exploration & PvE |
| 0.4.0 | *El Pacto de Sangre* | Diplomacy & Alliances |
| 0.5.0 | *La Edad de los Héroes* | Heroes & Quests |
| 1.0.0 | **La Era de los Imperios** | Full Release |

---

