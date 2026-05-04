# Features Para Hacer El Mundo Mas Vivo Y Enganchar Jugadores

## Objetivo

Convertir el mapa de Etheria en un mundo que parezca activo incluso cuando el jugador no esta haciendo click: aldeas que progresan, amenazas que se mueven, eventos que cambian prioridades, rankings que dan objetivos claros y decisiones sociales que generan historias.

La prioridad es agregar sistemas que usen lo que ya existe: temporadas, barbaros, bots, ranking por Fuerza, alianzas, reportes de batalla, recursos y mapa mundial.

## Quick Wins

### Ranking vivo por categorias

Ademas del ranking general de Fuerza, agregar rankings semanales:

- Aldea con mayor crecimiento de Fuerza.
- Mayor saqueador.
- Mejor defensor.
- Mayor investigador.
- Mayor productor.
- Alianza con mas honor.

Por que engancha:

- Da objetivos a jugadores chicos aunque no puedan competir por top 1 global.
- Crea metas de corto plazo.
- Hace que el progreso diario tenga visibilidad.

MVP:

- Reusar `city/ranking/all`.
- Guardar snapshots diarios/semanales de Fuerza.
- Mostrar top 10 por categoria.

### Feed de mundo

Un panel de noticias del mundo con eventos relevantes:

- Una aldea subio al top 10.
- Una ciudad fue saqueada.
- Un campamento barbaro fue derrotado.
- Una temporada entro en pico.
- Una alianza firmo o rompio un tratado.
- Una aldea alcanzo cierto nivel de Fuerza.

Por que engancha:

- Hace que el mundo parezca compartido.
- Da contexto para atacar, defender o diplomar.
- Convierte acciones normales en historia.

MVP:

- Crear eventos simples en backend cuando ya ocurren cosas: batalla resuelta, investigacion completada, campamento derrotado, cambio de temporada.
- Mostrar un feed compacto en mapa y aldea.

### Marcadores de actividad en el mapa

Agregar indicadores visuales sobre aldeas y zonas:

- Aldea en construccion.
- Aldea con tropas marchando.
- Zona peligrosa por actividad barbara.
- Zona rica en cierto recurso.
- Campamentos barbaros con nivel de amenaza.

Por que engancha:

- El mapa deja de ser decorativo.
- Ayuda a tomar decisiones sin abrir mil paneles.
- Hace que mirar el mapa sea parte del juego.

MVP:

- Extender `/city/list/all` con `power`, `activityState`, `isUnderAttack`, `hasOutgoingBattle`.
- Renderizar badges pequenos en `WorldMapScene`.

## Sistemas De Retencion

### Misiones diarias y semanales

Misiones simples que empujan al jugador a tocar varios sistemas:

- Mejora 1 edificio.
- Entrena 10 unidades.
- Investiga una tecnologia.
- Derrota un campamento barbaro.
- Espia o ataca una aldea.
- Dona recursos a una alianza.

Por que engancha:

- Da direccion a jugadores nuevos.
- Genera rutina sin obligar a jugar horas.
- Permite recompensas pequenas sin romper balance.

MVP:

- 3 misiones diarias por jugador.
- Recompensas: recursos, boost temporal pequeno, cofres menores.
- Progreso guardado por usuario/ciudad.

### Logros visibles

Logros permanentes por hitos:

- Primera victoria.
- Primera defensa exitosa.
- Primera tech militar.
- Fuerza 5k, 10k, 25k.
- Sobrevivir un invierno.
- Derrotar barbaros de nivel alto.

Por que engancha:

- Da identidad.
- Marca progreso historico.
- Alimenta ranking/perfil futuro.

MVP:

- Tabla `achievements` y `city_achievements`.
- Mostrar insignias en ranking y modal de ciudad.

### Proteccion inicial con objetivos

En vez de solo proteger al novato, convertir esa etapa en una mini campaña:

- Proteccion por X horas o hasta cierto nivel de Fuerza.
- Objetivos guiados: produccion, defensa, investigacion, primer ataque a barbaros.
- Al terminar, recompensa y entrada al ranking normal.

Por que engancha:

- Reduce frustracion.
- Enseña sistemas sin tutorial largo.
- Da un primer arco de progreso.

MVP:

- Flag calculado por edad de ciudad y Fuerza.
- Barbaros y bots evitan atacar aldeas protegidas.
- UI muestra estado de proteccion.

## Mundo Vivo

### Eventos regionales por temporada

Cada temporada deberia cambiar el mapa de forma visible:

- Invierno: zonas frias consumen mas comida, barbaros mas agresivos.
- Primavera: bonus de comida, campamentos migran.
- Verano: bonus de produccion y mas comercio.
- Otono: preparacion para invierno, eventos de cosecha.

Por que engancha:

- Evita que todos los dias sean iguales.
- Cambia prioridades estrategicas.
- Hace que el calendario del mundo importe.

MVP:

- Eventos por zona con duracion limitada.
- Mostrar modificadores en mapa.
- Generar feed cuando inicia un evento regional.

### Caravanas y rutas comerciales

Agregar unidades neutrales o rutas entre aldeas/zonas:

- Caravanas que aparecen en el mapa.
- Pueden ser protegidas, comerciadas o saqueadas.
- Rutas mas largas tienen mejor recompensa y mas riesgo.

Por que engancha:

- Agrega decisiones no puramente militares.
- Hace que el mapa tenga movimiento.
- Crea conflicto indirecto entre jugadores.

MVP:

- Eventos de caravana generados por worker.
- Resolver interaccion simple: enviar tropas para escoltar o saquear.
- Recompensa segun distancia y riesgo.

### Campamentos barbaros con comportamiento propio

Los barbaros no deberian ser solo mobs estaticos:

- Migran si nadie los ataca.
- Se fortalecen si saquean aldeas.
- Se dividen en campamentos menores.
- Crean jefes regionales.

Por que engancha:

- Crea amenazas emergentes.
- Da objetivos PvE compartidos.
- Hace que ignorar el mundo tenga consecuencias.

MVP:

- `lastActionAt`, `raidCount`, `growthLevel`.
- Worker que sube nivel si el campamento vive demasiado.
- Feed cuando aparece un jefe regional.

## Social Y Competencia

### Alianzas con objetivos compartidos

Las alianzas necesitan objetivos mas alla de chat/tratados:

- Construir una maravilla de alianza.
- Defender una zona.
- Derrotar un jefe barbaro.
- Mantener tratados de paz.
- Competir por honor semanal.

Por que engancha:

- Retiene por compromiso social.
- Da razon para volver.
- Hace que jugadores chicos aporten.

MVP:

- Objetivo semanal de alianza.
- Progreso acumulado por acciones normales.
- Ranking de alianzas por honor/progreso.

### Diplomacia con consecuencias visibles

Que los tratados cambien el mundo:

- Paz: bonus de comercio/produccion entre alianzas.
- Hostilidad: ataques dan mas honor pero mas riesgo.
- Romper tratado: penalizacion visible de reputacion.

Por que engancha:

- Crea politica.
- Hace que decisiones sociales importen.
- Alimenta historias del feed.

MVP:

- Mostrar estado diplomatico en mapa/ranking.
- Feed publico de tratados.
- Honor score mas visible.

### Perfiles publicos de aldeas

Al hacer click en una aldea:

- Nombre de aldea.
- Fuerza total.
- Ranking.
- Alianza.
- Ultimos logros publicos.
- Estado diplomatico.

Por que engancha:

- Facilita elegir objetivos.
- Da prestigio.
- Convierte el ranking en algo inspeccionable.

MVP:

- Endpoint `GET /city/:id/public-profile`.
- Modal desde mapa y ranking.

## Bots Como Mundo Vivo

### Bots con personalidad visible

Los bots ya tienen perfiles internos. Hacerlos visibles de forma sutil:

- Aldeas economicas crecen rapido en edificios.
- Aldeas militaristas atacan mas.
- Aldeas tecnologicas suben investigacion.
- Sus nombres y acciones aparecen en ranking/feed.

Por que engancha:

- El mundo no se siente vacio.
- Los jugadores tienen rivales tempranos.
- Sirve como QA permanente.

MVP:

- No mostrar "bot" al jugador.
- Usar perfiles para variar crecimiento.
- Feed normal cuando un bot gana, pierde o sube de ranking.

### Rivalidades generadas

Detectar interacciones repetidas:

- Si A ataca a B varias veces, crear rivalidad.
- Si B se defiende, feed especial.
- Bonus de honor por revancha.

Por que engancha:

- Crea historias personales.
- Convierte combates anonimos en narrativa.
- Motiva volver para responder.

MVP:

- Tabla `city_rivalries`.
- Contador por par de ciudades.
- Mostrar "Rival" en perfil publico.

## Features De Mayor Impacto

### Control de zonas

Dividir el mapa en regiones controlables:

- Una alianza domina una zona si tiene mas Fuerza activa ahi.
- Control da bonus pequeno de produccion o vision.
- Barbaros pueden disputar zonas.

Por que engancha:

- Da objetivo macro.
- Crea guerra territorial.
- Hace que la ubicacion de la aldea importe.

MVP:

- Calcular dominio por zona usando ciudades y alianzas.
- Mostrar overlay de zona en mapa.
- Bonus pequeno y visible.

### Jefes barbaros de temporada

Un jefe aparece durante eventos:

- Requiere varios ataques para derrotarlo.
- Tiene ranking de contribucion.
- Da recompensa global o regional.

Por que engancha:

- Evento PvE compartido.
- Da actividad social sin PvP obligatorio.
- Buen contenido para temporadas.

MVP:

- Campamento especial con HP/poder persistente.
- Ataques reducen poder.
- Top contribuyentes reciben recompensa.

### Marchas visibles

Mostrar lineas o animaciones de tropas en el mapa:

- Ataques saliendo.
- Retornos.
- Barbaros marchando.
- Caravanas.

Por que engancha:

- Hace el mapa vivo visualmente.
- Aumenta tension.
- Ayuda a entender que el mundo sigue funcionando.

MVP:

- Endpoint de marchas activas por zona o mapa.
- Render simple con lineas animadas.

## Roadmap Recomendado

### Fase 1: Mundo con senales

- Feed de mundo.
- Ranking por categorias.
- Modal de perfil publico de aldea.
- Marcadores de actividad en mapa.

### Fase 2: Rutina y retencion

- Misiones diarias/semanales.
- Logros.
- Proteccion inicial con objetivos.
- Eventos regionales simples.

### Fase 3: Mundo emergente

- Campamentos barbaros que crecen/migran.
- Jefes barbaros de temporada.
- Rivalidades.
- Marchas visibles.

### Fase 4: Social profundo

- Objetivos de alianza.
- Control de zonas.
- Diplomacia visible.
- Ranking de alianzas por temporada.

## Prioridad Recomendada

1. Feed de mundo.
2. Ranking por categorias.
3. Perfil publico de aldea.
4. Misiones diarias.
5. Marcadores de actividad en mapa.
6. Barbaros que crecen si nadie los controla.
7. Jefes barbaros de temporada.
8. Objetivos de alianza.
9. Control de zonas.
10. Marchas visibles.

Estas diez features atacan tres problemas centrales: el mundo se siente mas vivo, el jugador entiende que hacer cada dia y sus acciones generan reputacion visible.
