# Spec — Catálogo web (marca blanca)

> **Estado:** aprobado (Maxi, 2026-10-25)
> **Última actualización:** 2026-10-26
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

Catálogo web que se vende a comercios de cualquier rubro. Cada comercio tiene su propia web con su logo y colores, muestra sus productos con foto, elige si muestra precios o no, y recibe pedidos y consultas por WhatsApp. No hay pagos online, cuentas de usuario ni panel propio: el comercio administra sus productos desde su planilla, la que ya sabe usar (una Hoja de Google, un Excel o un CSV en su Google Drive).

El repo `malbeldas/catalogo-web` es el **producto base**. Contiene el núcleo del catálogo, la portada de venta y la demo que Maxi muestra desde el celular a posibles clientes (ejemplo mayorista, ejemplo minorista y un catálogo armado en el momento con fotos del cliente). Cada cliente real recibe **un repo propio creado a partir de la base**, publicado gratis en GitHub Pages. El disparador de Google vive en la base, en `disparador/Codigo.gs`, y no se copia a los clientes.

Un comercio que ya tiene sitio puede llevar el catálogo en una subcarpeta de su repo.

Los extras de Distribuidora Pueyrredón (QR de reseñas con beneficio y probador de luces) **no forman parte de la base**: son diferenciales de Pueyrredón y viven solo en su repo. La base sí ofrece a cada cliente un QR de reseñas de Google **sin** beneficio (UC-023).

---

## 2. Actores y flujos principales

| ID | Actor | Flujo principal | Notas |
|---|---|---|---|
| UC-001 | Comprador | Navega el catálogo, filtra por categoría y busca por texto | Desde el celular, sin registrarse |
| UC-002 | Comprador | Arma un pedido (o una consulta de precios) y lo envía por WhatsApp | El mensaje sale armado; el comercio responde por WhatsApp |
| UC-010 | Comercio | Agrega, edita u oculta productos, precios y fotos en su planilla | Los cambios se ven en la web sin intervención nuestra |
| UC-011 | Comercio | Muestra u oculta los precios de toda la web | Desde la pestaña Ajustes de su planilla |
| UC-020 | Vendedor (Maxi) | Muestra la demo: ejemplo mayorista, minorista y "Tu cliente" | `tienda.html?t=<id>&demo=1` |
| UC-021 | Vendedor + Claude | Da de alta un cliente nuevo | Repo desde la base (o subcarpeta de su sitio) + su planilla o la plantilla, en menos de 1 hora |
| UC-022 | Claude | Lleva una mejora del núcleo a todos los clientes | Sin pisar lo propio de cada cliente |
| UC-023 | Vendedor + Claude | Arma el QR de reseñas de Google del comercio | Sin descuento ni filtro de estrellas (política de Google) |
| UC-024 | Posible cliente | Ve la portada, el precio y consulta por WhatsApp | `index.html` de la base |

### Criterios de aceptación

**UC-001 — Navegar y buscar**
- AC-001-1: la búsqueda ignora mayúsculas y acentos ("lampara" encuentra "Lámpara") y busca en nombre y descripción.
- AC-001-2: las categorías se muestran en el orden en que aparecen en la planilla; si hay una sola categoría no se muestra la barra.
- AC-001-3: con 3.000 productos la primera pantalla aparece en menos de 2 s en un celular de gama media con 4G.
- AC-001-4: a 375 px de ancho no hay scroll horizontal.
- AC-001-5: con `cat=<categoría>` o `q=<texto>` en la URL, el catálogo abre en esa categoría o con esa búsqueda (para enlazar desde otras páginas del sitio del comercio).

**UC-002 — Pedido por WhatsApp**
- AC-002-1: el botón abre `https://wa.me/<número>?text=<mensaje>` con el número de Ajustes.
- AC-002-2: el mensaje lista cada producto como `• <cantidad> × <nombre>`, y con precios visibles suma el subtotal por línea y el total estimado.
- AC-002-3: con precios ocultos el mensaje dice "Quiero consultar precio de" y no contiene ningún importe.
- AC-002-4: si el comprador escribe su nombre, el mensaje termina con "Soy <nombre>."; el nombre no se guarda en ningún otro lado.
- AC-002-5: en modo demo el pedido se muestra como chat de ejemplo y no abre WhatsApp.

**UC-010 — Productos desde la planilla**
- AC-010-1: un producto nuevo en la planilla aparece en la web al recargar: hasta 5 minutos con la planilla publicada y unos 15 a 20 minutos con la planilla privada.
- AC-010-2: un producto con Visible = NO no aparece.
- AC-010-3: una fila sin nombre se ignora sin romper el resto del catálogo.
- AC-010-4: si la planilla no responde, la web muestra la última copia guardada del catálogo.
- AC-010-5: el comercio puede usar su planilla tal como la tiene (Hoja de Google, Excel o CSV en Drive) compartida con "cualquiera con el enlace", sin publicar nada.
- AC-010-6: con la planilla privada, la tarea respaldo de cada cliente se pide cada 15 minutos desde el disparador de Google, sin depender del cron de GitHub. Si GitHub rechaza el pedido, el dueño del disparador recibe un mail.

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

**UC-023 — QR de reseñas**
- AC-023-1: el QR abre el formulario de reseña de Google del comercio, sin pasos intermedios, sin pedir estrellas antes y sin ofrecer nada a cambio.
- AC-023-2: la tarjeta para imprimir lleva el logo, el color y el nombre del comercio, y nada de otra marca (regla hard 7).
- AC-023-3: si el comercio tiene GA4, cada escaneo cuenta como `resena_qr`, sin datos de quien escanea (regla hard 5).

**UC-024 — Portada de venta**
- AC-024-1: la portada muestra qué incluye el servicio y el precio (alta y abono).
- AC-024-2: un botón abre WhatsApp al número de ventas con un mensaje armado.
- AC-024-3: la portada no nombra a Pueyrredón ni a PLED fuera de los ejemplos, ni usa "Mostrador" (regla hard 7).
- AC-024-4: la portada muestra el catálogo con capturas reales, explica cómo funciona en 3 pasos y responde las preguntas frecuentes.
- AC-024-5: al compartir el link de la portada se ve una vista previa con título, descripción e imagen.

---

## 3. Modelo de datos

No hay base de datos. Los datos viven en tres lugares:

**`tienda.json`** (en el repo de cada cliente; lo completamos en el alta)
- `id` (slug), `nombre`, `bajada`, `tipo` (`Mayorista | Minorista | texto libre`)
- `logo` (ruta en `img/`), `logoCuadrado` (bool)
- `icono` (opcional): imagen cuadrada para la pestaña del navegador, cuando el logo es apaisado
- `color`, `acento` (hex)
- `planilla.privada: true` (por defecto): el catálogo sale del archivo del comercio, cuyo link va en el secreto `PLANILLA_URL` del repo, nunca en el código
- `planilla.web`, `planilla.ajustes`: URLs CSV de las dos pestañas publicadas (`Web` y `Ajustes`), para clientes con la planilla publicada
- `resenas` (opcional): link de reseña del Perfil de Empresa de Google del comercio (`https://g.page/r/…/review`). Con él, el alta genera `resena.html`, que es adonde apunta el QR (UC-023).
- `ga4` (opcional, ID de medición). Cuenta visitas y `enviar_pedido` (cantidad de productos); nunca el nombre ni el mensaje (regla hard 5).

**Planilla del comercio, pestaña `Productos` o primera hoja** (la edita el comercio; Hoja de Google, Excel o CSV)
- `Código` (único; si falta se usa el número de fila; también `SKU`)
- `Nombre` (obligatorio; también `Producto` o `Artículo`). Puede haber un título arriba de la fila de títulos.
- `Categoría` (también `Rubro`)
- `Descripción`
- `Precio` (número; acepta "$ 14.900" y "14900")
- `Precio anterior` (opcional; muestra tachado y % de descuento)
- `Foto` (link de Google Drive compartido "cualquiera con el link", o URL de imagen; también `Imagen`)
- `Visible` (`SÍ | NO`, vacío = SÍ)

**Planilla del comercio, pestaña `Web`** (no se edita; solo para clientes con la planilla publicada)
- Copia de `Productos` armada con fórmulas: solo filas visibles y la columna Precio vacía cuando Ajustes > Precios = NO (BR-PRE-001).

**Planilla del comercio, pestaña `Ajustes`**
- `WhatsApp` (número con código de país, sin +), `Precios` (`SÍ | NO`), `Nombre`, `Bajada`
- Si un valor de Ajustes está vacío, o el archivo no tiene pestaña `Ajustes`, se usa el de `tienda.json`.

**`catalogo-respaldo.json`** (en el repo del cliente)
- Última copia válida de Productos + Ajustes, ya normalizada y sin importes si Precios = NO. La actualiza una tarea programada. Con `planilla.privada` es lo que muestra la web.

**En el celular del comprador:** nada. El carrito vive en memoria mientras la página está abierta.
**En el celular del vendedor (demo "Tu cliente"):** `localStorage` con el catálogo armado en el momento.

---

## 4. Páginas y acciones del sistema

**Repo base (`malbeldas/catalogo-web`)**
- `index.html` — portada de venta (landing): capturas reales del catálogo, cómo funciona, ejemplos, precio, preguntas frecuentes y WhatsApp de ventas. Precio y contacto salen de `portada.json`.
- `tienda.html?t=<id>&demo=1` — demo con barra de ejemplos y Funciones (pedido de ejemplo, precios sí/no, colores, armar catálogo).
- `tiendas/<id>.json` — datos de los ejemplos de la demo.
- `cliente/tienda.json` — molde de `tienda.json` para un cliente nuevo.
- `scripts/alta.mjs` y `scripts/verificar-alta.mjs` — arman y revisan la carpeta de un cliente (UC-021). Guía: `ALTA.md`.

**Repo de cada cliente**
- `index.html` — el catálogo del comercio. Lleva `<html data-tienda="tienda.json">`; la URL no cambia de comercio ni abre la demo.
- Con `planilla.privada`: `GET catalogo-respaldo.json`.
- Con la planilla publicada: `GET` a las URLs CSV de `Web` y `Ajustes`, y `GET catalogo-respaldo.json` si fallan.
- Pedido: navegación a `https://wa.me/<número>?text=<mensaje>`.

**Tareas programadas (GitHub Actions, gratis en repo público)**
- `respaldo` — baja la planilla (el archivo de `PLANILLA_URL` o las pestañas publicadas), la valida y, si cambió, actualiza `catalogo-respaldo.json`. La pide cada 15 minutos el disparador de Google; el cron de GitHub queda de respaldo.
- `ci` — en cada push y PR corre los tests.

**Disparador (Google Apps Script, en la cuenta del vendedor)**
- `disparar` — cada 15 minutos pide a GitHub correr `respaldo` en cada repo de la lista `CLIENTES`, con un token que solo puede disparar Actions. Los tokens y la lista viven en las propiedades del script, nunca en un repo.

---

## 5. Casos de error y comportamientos especiales

- **Archivo del comercio no compartido o sin columna Nombre** (planilla privada): la tarea respaldo termina en rojo, GitHub avisa por mail y la web sigue con la última copia.
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
**Comportamiento:** lo que se publica no debe tener importes. Con la planilla privada, la tarea respaldo los saca antes de guardar `catalogo-respaldo.json`, y el link del archivo vive solo en el secreto `PLANILLA_URL`. Con la planilla publicada, lo que está en la pestaña publicada es público aunque la web no lo muestre; por eso la plantilla separa `Productos` (privada, con precios) de `Web` (publicada, generada con fórmulas, que copia Precio solo si Ajustes > Precios = SÍ).
**Excepciones:** ninguna.

---

## 6. Stack y arquitectura

- **Runtime:** navegador. HTML, CSS y JavaScript sin framework ni paso de build (ES modules nativos).
- **Datos:** el archivo del comercio en Google Drive (Hoja de Google, Excel o CSV), leído por la tarea respaldo; o Google Sheets publicada como CSV (gratis).
- **Hosting:** GitHub Pages, un repo por cliente (gratis).
- **Automatización:** GitHub Actions (respaldo y CI), gratis en repos públicos. Google Apps Script en la cuenta del vendedor pide la tarea respaldo de cada cliente cada 15 minutos.
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
index.html            # generado por scripts/alta.mjs desde tienda.html de la base
scripts/respaldo.mjs  # copiado de la base, como core/
scripts/xlsx.mjs      # copiado de la base: lee Excel sin dependencias
package.json          # mínimo: {"type": "module"}
tests/
├── unit/             # node:test sobre core/datos.js
└── e2e/              # Playwright, planilla simulada
.github/workflows/    # ci.yml, respaldo.yml
SPEC.md
CLAUDE.md
```

El disparador de Google vive en la base, en `disparador/Codigo.gs`, y no se copia a los clientes.

Un comercio que ya tiene sitio puede llevar el catálogo en una subcarpeta (`scripts/alta.mjs <repo> catalogo`); la tarea de respaldo queda en la raíz y corre en esa subcarpeta.

---

## 7. Reglas hard del proyecto

1. **Costo cero.** Solo GitHub Pages, GitHub Actions de repo público, Google Drive (Hojas de Google, Excel o CSV) y Google Apps Script. Ningún servicio pago sin decisión de Maxi.
2. **`core/` es idéntico en todos los repos.** Lo propio de cada cliente vive solo en `tienda.json`, `img/` y su planilla. Un cambio al núcleo se hace en la base y se propaga (UC-022); nunca se edita `core/` en un repo de cliente.
3. **Lógica sin DOM en `core/datos.js`.** Todo lo que transforma datos (CSV, precios, búsqueda, mensaje) es función pura con test unitario.
4. **Precios ocultos = precios ausentes** (BR-PRE-001): ni en el HTML, ni en el mensaje, ni en `catalogo-respaldo.json`, ni en la pestaña publicada.
5. **Ningún dato personal guardado.** El nombre del comprador solo viaja en el mensaje de WhatsApp: nunca en la URL de la web, en GA4 ni en `localStorage`.
6. **Mobile first.** Todo se prueba a 375 px. Sin scripts externos salvo GA4 y Google Fonts.
7. **Marca blanca de verdad.** El sitio de un cliente no muestra nada de Pueyrredón, PLED ni del proveedor del catálogo. No se usa el nombre "Mostrador".
8. **Cada criterio de aceptación tiene su test** y ningún cambio se publica con CI en rojo.

---

## 8. Decisiones técnicas tomadas

**Planilla de Google como panel del comercio.**
Evaluado: panel propio con base de datos (Supabase). Descartado: costo y curva de uso para el comercio. La planilla es gratis y el comercio ya la conoce. Decisión de Maxi (2026-10-25).

**El archivo del comercio tal como lo tiene, leído por la tarea respaldo.**
Evaluado: CSV publicado leído por la web (lo que había). Descartado como modo por defecto: obliga a una Hoja de Google con pestañas armadas y al paso "Publicar en la Web", que un Excel subido no tiene, y deja al comercio atado a un formato. Costo aceptado: los cambios se ven en unos 15 a 20 minutos en lugar de 5. Decisión de Maxi (2026-10-26). El CSV publicado queda para clientes que ya lo usan.

**La tarea respaldo la dispara un Apps Script cada 15 minutos.**
Evaluado: solo el cron de GitHub. Descartado: en la práctica casi no corre (en Pueyrredón, ninguna vez en las primeras horas después del merge; en la base, una vez en 18 horas). Evaluado: un servicio de cron externo gratis. Descartado: un proveedor más con el token adentro. Apps Script está en la misma cuenta de Google que ya se usa, es gratis y un solo script sirve para todos los clientes. Decisión de Maxi (2026-10-26).

**Lectura directa del CSV publicado, con respaldo programado** (clientes con la planilla publicada).
Evaluado: solo build programado (la web lee un JSON generado cada X horas). Descartado como única vía porque el comercio espera ver sus cambios al rato. Evaluado: Apps Script como API. Descartado: requiere que cada comercio implemente un script. El CSV publicado no pide nada al comercio; el respaldo cubre caídas.

**Un repo por cliente creado desde la base.**
Evaluado: todos los clientes en un solo repo. Descartado: cada cliente quiere su link (y a futuro su dominio), y un error en un cliente no debe afectar a otro. Decisión de Maxi (2026-10-25). Costo: hay que propagar el núcleo (UC-022).

**Sin framework ni build.**
Evaluado: Astro o Vite. Descartado en fase 1: el catálogo entra en menos de 1.000 líneas, GitHub Pages lo sirve tal cual y no hay paso que pueda romperse al publicar. Se revisa si aparece una segunda superficie compleja.

**Extras de Pueyrredón fuera de la base.**
QR de reseñas con beneficio y probador de luces quedan en el repo de Pueyrredón. Decisión de Maxi (2026-10-25).

**QR de reseñas sin beneficio para todos los clientes.**
Evaluado: llevar el QR de Pueyrredón (con 5% OFF) a la base. Descartado: Google prohíbe ofrecer algo a cambio de reseñas y puede bajar o sacar reseñas del perfil del cliente. El QR de la base lleva directo al formulario de Google, sin descuento ni filtro de estrellas, y apunta a una página del sitio del cliente para que la tarjeta impresa siga sirviendo si cambia el link. Decisión de Maxi (2026-10-26).

---

## 9. Riesgos conocidos

- **Demora en verse los cambios:** hasta 5 minutos con la planilla publicada y unos 15 a 20 con la privada. Se avisa en la planilla plantilla.
- **Token vencido:** los tokens de GitHub de grano fino vencen (como mucho al año). Al vencer, el disparador falla, llega un mail y la web queda con la última copia hasta renovarlo.
- **Límite de Apps Script:** los disparadores de una cuenta gratis corren como mucho 90 minutos por día; alcanza para unos 25 clientes cada 15 minutos.
- **Cron pausado:** GitHub pausa las tareas programadas de un repo público sin actividad por 60 días. Solo afecta al cron de respaldo; el disparador de Google sigue pidiendo la tarea.
- **Fotos desde Google Drive:** dependen de un enlace no oficial de miniaturas; si Google lo cambia, las fotos dejan de verse hasta ajustar `core/datos.js`. Alternativa: subir fotos a `img/` del repo.
- **Lo publicado es público:** cualquier dato en la pestaña publicada se puede leer aunque la web no lo muestre (mitigado por BR-PRE-001). Con la planilla privada, quien tenga el link del archivo ve todo lo que tiene; por eso el link vive solo en el secreto del repo.
- **Propagar el núcleo a muchos repos:** con 20+ clientes hace falta automatizar UC-022; hasta 5 clientes alcanza con un script manual.
- **Límites de GitHub Pages:** 1 GB por sitio y ~100 GB de tráfico por mes. Sobra para catálogos con fotos livianas.

---

## 10. Pendientes con Maxi / preguntas abiertas

- ~~¿Cuánto se cobra y qué incluye el alta?~~ Decidido (Maxi, 2026-10-26): $39.900 de alta con hasta 50 productos cargados por nosotros, más $5.900 por mes. La planilla y las fotos las armamos nosotros (`ALTA.md`).
- ¿Dominio propio por cliente? Tiene costo anual del cliente; hasta decidir, `<cuenta>.github.io`.
- ¿Las cuentas de GitHub de cada cliente son de Maxi o del cliente?
- ~~¿Cuándo se migra la web de Pueyrredón?~~ Decidido (Maxi, 2026-10-26): Pueyrredón es el primer cliente y el piloto del alta. Su catálogo pasó a la base en `catalogo/` de su repo actual, con su Excel como planilla privada; el resto de su sitio queda como está.
- ~~Backlog: ¿Jira o GitHub Issues?~~ Decidido (Maxi, 2026-10-25): GitHub Issues.

---

## 11. Testing mínimo

- **Unit (`node:test`, sin dependencias):** `scripts/` — lectura de Excel y CSV del comercio, links de Drive, tarea respaldo, alta y su verificación. `core/datos.js` — parseo de CSV (comillas, comas, celdas vacías, saltos de línea), normalización de productos (sin nombre, precio con "$" y puntos, Visible = NO, códigos repetidos), link de foto de Drive, búsqueda sin acentos, mensaje de WhatsApp con y sin precios (AC-002-2, AC-002-3, AC-002-4).
- **E2E (Playwright, Chromium, 375×740 táctil):** planilla simulada interceptando las URLs CSV. Flujos: buscar y filtrar (UC-001), armar pedido y verificar el link exacto de `wa.me` (UC-002), precios ocultos ausentes del DOM (AC-011-1), planilla caída con respaldo (AC-010-4), planilla privada (AC-010-5), demo solo con `demo=1` (AC-020-1), catálogo de un cliente generado con el alta (AC-021-1).
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
- QR de reseñas con beneficio (descuento o regalo a cambio de la reseña) y probador de luces (diferenciales de Pueyrredón). El QR de reseñas sin beneficio sí entra (UC-023).
- Varios idiomas o monedas.
- Dominios pagos administrados por nosotros.

---

## Apéndice — cuándo subir al siguiente nivel

Pasar al framework completo si aparece alguno de estos: más de 3 personas desarrollando en paralelo, terceros integrando contra el catálogo, cobros online, o módulos opcionales que se venden por separado.

---

*Documento vivo. Cualquier cambio de alcance se escribe acá antes de tocar código.*
