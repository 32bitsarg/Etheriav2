# Social — Guía de Changelog para Usuarios

> Regla de Social para cualquier changelog o release notes público.

## Principio

El changelog público **no es documentación técnica**. El que lo lee es un jugador, no un developer.

## Reglas

### ✅ Hacer
- Explicar **qué cambió en la experiencia del jugador**
- Usar lenguaje simple, accesible
- Enfocarse en el beneficio: "Ahora podés..." / "Mejoramos..."
- Nombres de features que el jugador ve en pantalla

### ❌ No hacer
- Mencionar archivos, componentes, breakpoints CSS (`max-sm:`, `lg:`)
- Usar jerga de desarrollo: `touch targets`, `safe-area`, `breakpoints`, `i18n`, `ZOOM_MIN`
- Listar cambios internos que el jugador no percibe
- Incluir nombres técnicos: `VillageHTMLCanvas`, `globals.css`, `VillageImmersiveDock`

### Ejemplos

| ❌ Técnico | ✅ Usuario |
|---|---|
| `Touch targets de cierre >= 44x44px en BuildingModal` | `Botones más grandes y fáciles de tocar en todas las ventanas` |
| `max-sm:max-w-[calc(100vw-16px)] en modales` | `Ventanas que se adaptan perfecto a tu pantalla` |
| `ZOOM_MIN 0.8 en mobile` | `Mejor visión de tu aldea en el celular` |
| `Safe-area support con env(safe-area-inset-bottom)` | `El juego respeta los bordes de tu teléfono sin tapar nada` |
| `MobileBottomNav con 5 iconos` | `Barra de navegación rápida para moverte entre secciones` |

## Flujo para cada release

1. **Frontend** entrega los cambios al CEO
2. **Social** traduce cada cambio a lenguaje de jugador
3. **CEO** revisa que no quede jerga técnica
4. Se publica

---

_Creado: 2026-06-09 — Sesión CEO Chaty_
