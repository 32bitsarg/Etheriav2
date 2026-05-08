# Resumen de Cambios - Versión 0.2.0 "El Mapa Viviente"

Este documento detalla todas las implementaciones, correcciones y mejoras realizadas durante esta sesión de desarrollo para transformar Etheria en un entorno dinámico y robusto.

## 1. Modernización del Mapa del Mundo (Phaser 3)
Se ha transformado el mapa estático en una experiencia viva:
- **Movimientos en Tiempo Real**: Implementación de ejércitos y caravanas comerciales que se desplazan físicamente por el mapa. El sistema utiliza interpolación lineal para mostrar un movimiento fluido (60fps) basado en tiempos exactos del servidor.
- **Clima Estacional Visual**: Capas dinámicas que reaccionan a la estación actual. El mapa se tiñe de blanco en invierno, naranja cálido en otoño y brillo intenso en verano.
- **Niebla de Guerra (Fog of War)**: Sistema de visibilidad dinámica que oculta zonas no exploradas. Los jugadores tienen un radio de visión claro alrededor de su ciudad, mientras que el resto del mundo permanece bajo una niebla translúcida.
- **Menú Radial Interactivo**: Nueva interfaz táctil/clic para interactuar con ciudades y campamentos bárbaros directamente desde la escena de Phaser.

## 2. IA de Bots y QA Automatizado
Los bots ahora funcionan como una herramienta de calidad de software (QA) activa:
- **Acciones Reales**: Los bots utilizan exactamente las mismas funciones internas que los jugadores humanos (`attackCityAction`, `sendResourcesAction`, etc.), validando el motor de juego en cada paso.
- **Comportamiento Inteligente**:
    - **Agresión**: Atacan a jugadores reales de forma aleatoria, respetando la protección de novatos (24h) y cooldowns globales.
    - **Comercio**: Envían caravanas con recursos sobrantes para optimizar su economía.
    - **Mantenimiento**: Detectan y eliminan campamentos bárbaros cercanos.
- **Persistencia de Logs**: Todas las acciones (éxitos y errores) se registran en la base de datos (`BotActionLog`) para análisis posterior.

## 3. Correcciones de Errores y Estabilización
Se resolvieron varios bloqueadores técnicos reportados:
- **Error 404 (Alertas Bárbaras)**: Se corrigieron las rutas en los hooks de `useCity.ts` que apuntaban a endpoints inexistentes.
- **Runtime Error (Phaser)**: Se solucionó el fallo `camera.getScreenPoint is not a function` mediante el cálculo manual de coordenadas de pantalla, asegurando compatibilidad con todas las versiones de Phaser 3.
- **Optimización de Niebla**: Se corrigió el problema donde el mapa se veía completamente negro y se optimizó el uso de memoria en la actualización de frames.
- **Assets Fallback**: Se eliminaron las cargas de assets inexistentes que causaban 404 en consola, implementando representaciones geométricas temporales.

## 4. Interfaz de Usuario y HUD
- **Restauración de HUD**: Se revirtieron los cambios no solicitados en el HUD de recursos, restaurando la `ResourceBar` original en la parte superior de la pantalla.
- **Organización de Layout**: Se ajustó la cuadrícula (`village-shell`) para que el layout del juego sea consistente entre la vista de pueblo y la de mapa.

## 5. Internacionalización y Registro
- **Traducciones**: Se añadieron todas las claves necesarias para los nuevos sistemas en `es.json` y `en.json`.
- **Changelog**: Se actualizaron las versiones del proyecto:
    - `v0.1.1`: Landing page pública y blog de cambios.
    - `v0.2.0`: El Mapa Viviente y Bots Avanzados.

---
**Estado Actual**: Sistema estable con bots operando al 100% de éxito y visualización del mapa mundial funcional con clima y niebla activos.
