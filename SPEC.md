# Spec — Catálogo web (marca blanca)

> **Estado:** aprobado (Maxi, 2026-10-25)
> **Última actualización:** 2026-10-25
> **Autor:** Claude, para Maxi Albeldas
> **Nivel de spec:** `light` (proyecto mediano, 80-150h estimadas)

---

> **Cómo usar este documento.**
> Este es el contrato del producto base. Todas las webs de clientes (incluida, más adelante, la de Distribuidora Pueyrredón) salen de este repo y respetan este spec.
> Si el código contradice el spec, gana el spec o se actualiza el spec antes de tocar código.
>
> **Regla operativa:** ningún PR puede mergearse mientras este archivo tenga `[A COMPLETAR]` adentro.

---

## Índice

1. Qué es esto
2. Actores y flujos principales
3. Modelo de datos
4. Páginas y acciones del sistema
5. Casos de error y comportamientos especiales
6. Stack y arquitectura
7. Reglas hard del proyecto
8. Decisiones técnicas tomadas
9. Riesgos conocidos
10. Pendientes con Maxi / preguntas abiertas
11. Testing mínimo
12. Fuera de scope

---

## 1. Qué es esto

Catálogo web que se vende a comercios de cualquier rubro. Cada comercio tiene su propia web con su logo y colores, muestra sus productos con foto, elige si muestra precios o no, y recibe pedidos y consultas por WhatsApp. No hay pagos online, cuentas de usuario ni panel propio: el comercio administra sus productos desde una planilla de Google que ya sabe usar.

El repo `malbeldas/catalogo-web` es el **producto base**. Contiene el núcleo del catálogo, la portada de venta y la demo que Maxi muestra desde el celular a posibles clientes (ejemplo mayorista, ejemplo minorista y un catálogo armado en el momento con fotos del cliente). Cada cliente real recibe **un repo propio creado a partir de la base**, publicado gratis en GitHub Pages.

Los extras de Distribuidora Pueyrredón (QR de reseñas con beneficio y probador de luces) **no forman parte de la base**: son diferenciales de Pueyrredón y viven solo en su repo.

---

## 2. Actores y flujos principales

| ID | Actor | Flujo principal | Notas |
|---|---|---|---|
| UC-001 | Comprador | Navega el catálogo, filtra por categoría y busca por texto | Desde el celular, sin registrarse |
| UC-002 | Comprador | Arma un pedido (o una consulta de precios) y lo envía por WhatsApp | El mensaje sale armado; el comercio responde por WhatsApp |
| UC-010 | Comercio | Agrega, edita u oculta productos, precios y fotos en su planilla | Los cambios se ven en la web sin intervención nuestra |
| UC-011 | Comercio | Muestra u oculta los precios de toda la web | Desde la pestaña Ajustes de su planilla |
| UC-020 | Vendedor (Maxi) | Muestra la demo: ejemplo mayorista, minorista y "Tu cliente" | `tienda.html?t=<id>&demo=1` |
| UC-021 | Vendedor + Claude | Da de alta un cliente nuevo | Repo desde la base + planilla desde la plantilla, en menos de 1 hora |
| UC-022 | Claude | Lleva una mejora del núcleo a todos los clientes | Sin pisar lo propio de cada cliente |

### Criterios de aceptación

**UC-001 — Navegar y buscar**
- AC-001-1: la búsqueda ignora mayúsculas y acentos ("lampara" encuentra "Lámpara") y busca en nombre y descripción.
- AC-001-2: las categorías se muestran en el orden en que aparecen en la planilla; si hay una sola categoría no se muestra la barra.
- AC-001-3: con 3.000 productos la primera pantalla aparece en menos de 2 s en un celular de gama media con 4G.
- AC-001-4: a 375 px de ancho no hay scroll horizontal.

**UC-002 — Pedido por WhatsApp**
- AC-002-1: el botón abre `https://wa.me/<número>?text=<mensaje>` con el número de Ajustes.
- AC-002-2: el mensaje lista cada producto como `• <cantidad> × <nombre>`, y con precios visibles suma el subtotal por línea y el total estimado.
- AC-002-3: con precios ocultos el mensaje dice "Quiero consultar precio de" y no contiene ningún importe.
- AC-002-4: si el comprador escribe su nombre, el mensaje termina con "Soy <nombre>."; el nombre no se guarda en ningún otro lado.
- AC-002-5: en modo demo el pedido se muestra como chat de ejemplo y no abre WhatsApp.

**UC-010 — Productos desde la planilla**
- AC-010-1: un producto nuevo en la planilla aparece en la web al recargar, con la demora propia de Google (hasta 5 minutos).
- AC-010-2: un producto con Visible = NO no aparece.
- AC-010-3: una fila sin nombre se ignora sin romper el resto del catálogo.
- AC-010-4: si la planilla no responde, la web muestra la última copia guardada del catálogo.

**UC-011 — Mostrar u ocultar precios**
- AC-011-1: con Precios = NO no aparece ningún precio en la página (ni en el HTML), ni el porcentaje de descuento, ni el total.
- AC-011-2: con Precios = SÍ, un producto sin precio muestra "Consultar".

**UC-020 — Demo**
- AC-020-1: la barra de demo aparece solo con `demo=1`.
- AC-020-2: "Tu cliente" permite cargar logo y productos con fotos del celular; queda guardado solo en ese celular y se puede borrar.

**UC-021 — Alta de cliente**
- AC-021-1: un cliente nuevo queda publicado completando solo `tienda.json`, su logo y su planilla, sin tocar el núcleo.

**UC-022 — Actualizar el núcleo**
- AC-022-1: la actualización reemplaza solo `core/` en el repo del cliente; `tienda.json`, `img/` y la planilla no se tocan.

---

## 3. Modelo de datos

No hay base de datos. Los datos viven en tres lugares:

**`tienda.json`** (en el repo de cada cliente; lo completamos en el alta)
- `id` (slug), `nombre`, `bajada`, `tipo` (`Mayorista | Minorista | texto libre`)
- `logo` (ruta en `img/`), `logoCuadrado` (bool)
- `color`, `acento` (hex)
- `planilla.web`, `planilla.ajustes`: URLs CSV de las dos pestañas publicadas (`Web` y `Ajustes`)
- `ga4` (opcional, ID de medición)

**Planilla del comercio, pestaña `Productos`** (la edita el comercio)
- `Código` (único; si falta se usa el número de fila)
- `Nombre` (obligatorio)
- `Categoría`
- `Descripción`
- `Precio` (número; acepta "$ 14.900" y "14900")
- `Precio anterior` (opcional; muestra tachado y % de descuento)
- `Foto` (link de Google Drive compartido "cualquiera con el link", o URL de imagen)
- `Visible` (`SÍ | NO`, vacío = SÍ)

**Planilla del comercio, pestaña `Web`** (no se edita; se publica)
- Copia de `Productos` armada con fórmulas: solo filas visibles y la columna Precio vacía cuando Ajustes > Precios = NO (BR-PRE-001).

**Planilla del comercio, pestaña `Ajustes`**
- `WhatsApp` (número con código de país, sin +), `Precios` (`SÍ | NO`), `Nombre`, `Bajada`
- Si un valor de Ajustes está vacío, se usa el de `tienda.json`.

**`catalogo-respaldo.json`** (en el repo del cliente)
- Última copia válida de Productos + Ajustes, ya normalizada. La actualiza una tarea programada.

**En el celular del comprador:** nada. El carrito vive en memoria mientras la página está abierta.
**En el celular del vendedor (demo "Tu cliente"):** `localStorage` con el catálogo armado en el momento.

---

## 4. Páginas y acciones del sistema

**Repo base (`malbeldas/catalogo-web`)**
- `index.html` — portada de venta con acceso a los ejemplos.
- `tienda.html?t=<id>&demo=1` — demo con barra de ejemplos y Funciones (pedido de ejemplo, precios sí/no, colores, armar catálogo).
- `tiendas/<id>.json` — datos de los ejemplos de la demo.

**Repo de cada cliente**
- `index.html` — el catálogo del comercio.
- Lectura de la planilla: `GET` a las URLs CSV publicadas de `Web` y `Ajustes`.
- Respaldo: `GET catalogo-respaldo.json` si la planilla falla.
- Pedido: navegación a `https://wa.me/<número>?text=<mensaje>`.

**Tareas programadas (GitHub Actions, gratis en repo público)**
- `respaldo` — cada 6 horas baja la planilla, la valida y, si cambió, actualiza `catalogo-respaldo.json`.
- `ci` — en cada push y PR corre los tests.

---

## 5. Casos de error y comportamientos especiales

- **Planilla caída o despublicada:** se usa `catalogo-respaldo.json` y no se avisa al comprador. Si tampoco hay respaldo, mensaje "Estamos actualizando el catálogo" y botón de WhatsApp directo.
- **Fila sin nombre:** se ignora. Fila con precio no numérico: se trata como sin precio ("Consultar").
- **Códigos repetidos:** gana la primera fila y las demás se ignoran.
- **Foto rota o link de Drive privado:** se muestra un recuadro neutro con la inicial del producto, sin ícono de imagen rota.
- **Precios = NO:** los importes no se renderizan (no alcanza con ocultarlos por CSS). Ver BR-PRE-001.
- **Sin número de WhatsApp:** el carrito sigue funcionando pero el botón de enviar se reemplaza por "Este comercio todavía no cargó su WhatsApp".
- **Catálogo grande (Pueyrredón: 2.637 productos):** se renderiza de a 60 tarjetas y se cargan más al bajar; fotos con `loading="lazy"`.
- **Demo "Tu cliente" sin espacio en el celular:** aviso "No hay más lugar en este celular: quitá algún producto".

### BR-PRE-001 — Precios ocultos no salen del servidor de datos
**Aplica a:** planilla y web.
**Condición:** el comercio no quiere mostrar precios.
**Comportamiento:** la pestaña publicada no debe tener la columna Precio completa. Lo que está en la pestaña publicada es público aunque la web no lo muestre. Por eso la planilla plantilla separa `Productos` (privada, con precios) de `Web` (publicada, generada con fórmulas, que copia Precio solo si Ajustes > Precios = SÍ).
**Excepciones:** ninguna.

---

## 6. Stack y arquitectura

- **Runtime:** navegador. HTML, CSS y JavaScript sin framework ni paso de build (ES modules nativos).
- **Datos:** Google Sheets publicada como CSV (gratis).
- **Hosting:** GitHub Pages, un repo por cliente (gratis).
- **Automatización:** GitHub Actions (respaldo programado y CI), gratis en repos públicos.
- **Medición:** GA4 opcional por cliente.
- **Testing:** `node:test` (unit, sin dependencias) + Playwright con Chromium en emulación de celular (E2E).

**Estructura de carpetas (objetivo):**

```
core/                 # núcleo: idéntico en todos los clientes, solo se edita en la base
├── datos.js          # lógica pura: CSV, normalización, búsqueda, mensaje de WhatsApp (sin DOM)
├── catalogo.js       # render, carrito, hojas
├── catalogo.css
└── demo.js           # solo en la base
tienda.json           # propio del cliente
img/                  # propio del cliente
catalogo-respaldo.json
index.html
tests/
├── unit/             # node:test sobre core/datos.js
└── e2e/              # Playwright, planilla simulada
.github/workflows/    # ci.yml, respaldo.yml
SPEC.md
CLAUDE.md
```

Hoy el código está en `app.js` y `app.css` sin separar; la división en `core/` es la primera tarea técnica.

---

## 7. Reglas hard del proyecto

1. **Costo cero.** Solo GitHub Pages, GitHub Actions de repo público y Google Sheets. Ningún servicio pago sin decisión de Maxi.
2. **`core/` es idéntico en todos los repos.** Lo propio de cada cliente vive solo en `tienda.json`, `img/` y su planilla. Un cambio al núcleo se hace en la base y se propaga (UC-022); nunca se edita `core/` en un repo de cliente.
3. **Lógica sin DOM en `core/datos.js`.** Todo lo que transforma datos (CSV, precios, búsqueda, mensaje) es función pura con test unitario.
4. **Precios ocultos = precios ausentes** (BR-PRE-001): ni en el HTML, ni en el mensaje, ni en la pestaña publicada.
5. **Ningún dato personal guardado.** El nombre del comprador solo viaja en el mensaje de WhatsApp: nunca en la URL de la web, en GA4 ni en `localStorage`.
6. **Mobile first.** Todo se prueba a 375 px. Sin scripts externos salvo GA4 y Google Fonts.
7. **Marca blanca de verdad.** El sitio de un cliente no muestra nada de Pueyrredón, PLED ni del proveedor del catálogo. No se usa el nombre "Mostrador".
8. **Cada criterio de aceptación tiene su test** y ningún cambio se publica con CI en rojo.

---

## 8. Decisiones técnicas tomadas

**Planilla de Google como panel del comercio.**
Evaluado: panel propio con base de datos (Supabase). Descartado: costo y curva de uso para el comercio. La planilla es gratis y el comercio ya la conoce. Decisión de Maxi (2026-10-25).

**Lectura directa del CSV publicado, con respaldo programado.**
Evaluado: solo build programado (la web lee un JSON generado cada X horas). Descartado como única vía porque el comercio espera ver sus cambios al rato. Evaluado: Apps Script como API. Descartado: requiere que cada comercio implemente un script. El CSV publicado no pide nada al comercio; el respaldo cubre caídas.

**Un repo por cliente creado desde la base.**
Evaluado: todos los clientes en un solo repo. Descartado: cada cliente quiere su link (y a futuro su dominio), y un error en un cliente no debe afectar a otro. Decisión de Maxi (2026-10-25). Costo: hay que propagar el núcleo (UC-022).

**Sin framework ni build.**
Evaluado: Astro o Vite. Descartado en fase 1: el catálogo entra en menos de 1.000 líneas, GitHub Pages lo sirve tal cual y no hay paso que pueda romperse al publicar. Se revisa si aparece una segunda superficie compleja.

**Extras de Pueyrredón fuera de la base.**
QR de reseñas con beneficio y probador de luces quedan en el repo de Pueyrredón. Decisión de Maxi (2026-10-25).

---

## 9. Riesgos conocidos

- **Demora de Google al publicar:** los cambios de la planilla tardan hasta 5 minutos en verse. Se avisa en la planilla plantilla.
- **Fotos desde Google Drive:** dependen de un enlace no oficial de miniaturas; si Google lo cambia, las fotos dejan de verse hasta ajustar `core/datos.js`. Alternativa: subir fotos a `img/` del repo.
- **Lo publicado es público:** cualquier dato en la pestaña publicada se puede leer aunque la web no lo muestre (mitigado por BR-PRE-001).
- **Propagar el núcleo a muchos repos:** con 20+ clientes hace falta automatizar UC-022; hasta 5 clientes alcanza con un script manual.
- **Límites de GitHub Pages:** 1 GB por sitio y ~100 GB de tráfico por mes. Sobra para catálogos con fotos livianas.
- **Desvío actual:** hoy la barra de demo aparece por defecto (`demo` distinto de `0`), aunque el README dice `demo=1`. Se corrige con AC-020-1.

---

## 10. Pendientes con Maxi / preguntas abiertas

- ¿Cuánto se cobra y qué incluye el alta? (afecta UC-021: quién arma la planilla y las fotos).
- ¿Dominio propio por cliente? Tiene costo anual del cliente; hasta decidir, `<cuenta>.github.io`.
- ¿Las cuentas de GitHub de cada cliente son de Maxi o del cliente?
- ¿Cuándo se migra la web de Pueyrredón a un repo de cliente de esta base?
- Backlog: los skills de planificación crean épicas e historias en Jira y Jira no está conectado. ¿Conectamos Jira o usamos GitHub Issues (gratis)?

---

## 11. Testing mínimo

- **Unit (`node:test`, sin dependencias):** `core/datos.js` — parseo de CSV (comillas, comas, celdas vacías, saltos de línea), normalización de productos (sin nombre, precio con "$" y puntos, Visible = NO, códigos repetidos), link de foto de Drive, búsqueda sin acentos, mensaje de WhatsApp con y sin precios (AC-002-2, AC-002-3, AC-002-4).
- **E2E (Playwright, Chromium, 375×740 táctil):** planilla simulada interceptando las URLs CSV. Flujos: buscar y filtrar (UC-001), armar pedido y verificar el link exacto de `wa.me` (UC-002), precios ocultos ausentes del DOM (AC-011-1), planilla caída con respaldo (AC-010-4), demo solo con `demo=1` (AC-020-1).
- **CI:** GitHub Actions corre unit + E2E en cada push y PR.

**Lo que NO se testea automáticamente en fase 1:**
- Aspecto visual (se revisa con capturas a 375 px antes de publicar).
- Demora real de Google al publicar la planilla.
- Apertura real de WhatsApp en el celular.
- Safari real (no hay WebKit en el entorno; se usa emulación de iPhone en Chromium).

---

## 12. Fuera de scope

- Pagos online, carrito con checkout, stock o envíos calculados.
- Cuentas de compradores o del comercio, y panel propio.
- QR de reseñas con beneficio y probador de luces (diferenciales de Pueyrredón).
- Varios idiomas o monedas.
- Dominios pagos administrados por nosotros.

---

## Apéndice — cuándo subir al siguiente nivel

Pasar al framework completo si aparece alguno de estos: más de 3 personas desarrollando en paralelo, terceros integrando contra el catálogo, cobros online, o módulos opcionales que se venden por separado.

---

*Documento vivo. Cualquier cambio de alcance se escribe acá antes de tocar código.*
