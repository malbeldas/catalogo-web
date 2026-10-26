---
name: catalogo-web
description: Governance file for AI coding agents working on catalogo-web. Defines documentation routing, precedence rules, and operational protocol.
---

# CLAUDE.md — Catálogo web (marca blanca)

> Esta es la primera lectura obligatoria antes de cualquier tarea. Te dice **dónde está la verdad** sobre cada aspecto del proyecto y **en qué orden** consultarla.

---

## 1. Qué es este proyecto

Catálogo web de marca blanca para comercios de cualquier rubro: productos con foto, precios visibles u ocultos y pedidos por WhatsApp, administrado por cada comercio desde su propia planilla (Hoja de Google, Excel o CSV en su Drive). Este repo (`malbeldas/catalogo-web`) es el **producto base**: contiene el núcleo, la portada de venta y la demo. Cada cliente real tiene un repo propio creado desde esta base (`SPEC.md` §1).

No hay glosario separado; los términos del dominio (comercio, comprador, planilla, pestaña Web, respaldo, núcleo) están definidos en `SPEC.md` §1 y §3.

---

## 2. Stack (resumen — fuente de verdad: `SPEC.md` §6)

- HTML, CSS y JavaScript en el navegador, sin framework ni paso de build (ES modules nativos).
- Datos del comercio: su archivo en Google Drive (Hoja de Google, Excel o CSV), que la tarea respaldo lee con el link del secreto `PLANILLA_URL` y guarda en `catalogo-respaldo.json`. Los clientes anteriores publican las pestañas `Web` y `Ajustes` como CSV.
- Hosting: GitHub Pages, un repo por cliente. Se publica lo que está en `main`.
- Automatización: GitHub Actions (CI y respaldo del catálogo); un Apps Script en la cuenta de Google del vendedor la dispara cada 15 minutos.
- Medición: GA4 opcional por cliente.
- Tests: `node:test` (unit) + Playwright con Chromium en emulación de celular (E2E).

---

## 3. Mapa de documentación — qué consultar para qué

La documentación está en la raíz del repo. Cada archivo es **autoritativo en su área** y las áreas no se solapan.

| Pregunta que estás resolviendo | Archivo autoritativo | Tipo de contenido |
|---|---|---|
| ¿Qué hace el producto y para quién? | `SPEC.md` §1, §2 | Alcance, actores, flujos UC-xxx y criterios AC-xxx-n |
| ¿Qué datos hay y dónde viven? | `SPEC.md` §3 | `tienda.json`, pestañas de la planilla, respaldo |
| ¿Qué páginas, lecturas y tareas programadas existen? | `SPEC.md` §4 | Páginas, URLs CSV, workflows |
| ¿Qué pasa cuando algo falla? | `SPEC.md` §5 | Casos de error y BR-PRE-001 |
| ¿Con qué se construye y cómo se organiza? | `SPEC.md` §6 | Stack y estructura de carpetas objetivo |
| ¿Qué no se puede hacer nunca? | `SPEC.md` §7 | Reglas hard 1 a 8 |
| ¿Por qué se eligió X y no Y? | `SPEC.md` §8 | Decisiones con alternativas descartadas |
| ¿Qué se testea y qué no? | `SPEC.md` §11 | Alcance de unit, E2E y CI |
| ¿Esto entra en el producto? | `SPEC.md` §12 | Fuera de scope |
| ¿Cómo ejecuto una tarea paso a paso? | `task-execution-prompt.md` | Workflow Learn → Plan → Write → Validate → PR |
| ¿Qué tarea hago? | GitHub Issues del repo | Una tarea por issue (`#N`) |
| ¿Cómo se usa la demo? | `README.md` | Resumen de páginas y parámetros |

### Precedencia ante conflicto

Si dos fuentes se contradicen:

1. `SPEC.md` gana sobre todo lo demás, incluido el código.
2. `CLAUDE.md` gana sobre `README.md` y sobre el texto de un issue en temas de proceso (cómo se trabaja).
3. Un issue no puede ampliar el alcance de `SPEC.md`: si pide algo que el spec no contempla o contradice, primero se propone el cambio al spec (§4.5).
4. El código actual es la referencia más débil: si difiere del spec, es un desvío a corregir.

Si después de aplicar las reglas anteriores el conflicto persiste: **detenerse y reportar la discrepancia** al humano antes de codear.

---

## 4. Protocolo operativo para cada tarea

**Toda tarea que llega a Claude Code se ejecuta en este orden. Sin excepciones.**

### 4.1 Identificar IDs involucrados

- `UC-NNN` — flujos (`SPEC.md` §2). Ejemplo: `UC-002` pedido por WhatsApp.
- `AC-NNN-N` — criterios de aceptación de cada flujo (`SPEC.md` §2). Ejemplo: `AC-011-1` precios ocultos ausentes del HTML.
- `BR-PRE-NNN` — reglas de negocio (`SPEC.md` §5). Hoy existe `BR-PRE-001`.
- Reglas hard: se citan como "regla hard N" (`SPEC.md` §7).
- Tareas: `#N` (número de issue de GitHub).

> **Regla dura:** las reglas se citan por ID, no se parafrasean.

### 4.2 Ejecutar el workflow Learn → Plan → Write → Validate → PR

Definido en detalle en `task-execution-prompt.md` (raíz del repo).

Resumen:

1. **LEARN** — leer el issue y las secciones del spec que cita, escanear el código existente.
2. **PLAN** — diseñar el cambio y justificar decisiones contra el spec.
3. **WRITE** — implementar código + tests.
4. **VALIDATE** — checklist contra las reglas hard y los AC, correr los tests.
5. **PR** — rama por issue, PR con `Closes #N`, CI en verde. El merge lo hace Maxi.

### 4.3 Reglas duras para producción de código

Citadas de `SPEC.md` §7:

1. **Costo cero.** Solo GitHub Pages, GitHub Actions de repo público, Google Drive (Hojas de Google, Excel o CSV) y Google Apps Script. Ningún servicio pago sin decisión de Maxi.
2. **`core/` es idéntico en todos los repos.** Lo propio de cada cliente vive solo en `tienda.json`, `img/` y su planilla. Un cambio al núcleo se hace en la base y se propaga (UC-022); nunca se edita `core/` en un repo de cliente.
3. **Lógica sin DOM en `core/datos.js`.** Todo lo que transforma datos (CSV, precios, búsqueda, mensaje) es función pura con test unitario.
4. **Precios ocultos = precios ausentes** (BR-PRE-001): ni en el HTML, ni en el mensaje, ni en `catalogo-respaldo.json`, ni en la pestaña publicada.
5. **Ningún dato personal guardado.** El nombre del comprador solo viaja en el mensaje de WhatsApp: nunca en la URL de la web, en GA4 ni en `localStorage`.
6. **Mobile first.** Todo se prueba a 375 px. Sin scripts externos salvo GA4 y Google Fonts.
7. **Marca blanca de verdad.** El sitio de un cliente no muestra nada de Pueyrredón, PLED ni del proveedor del catálogo. No se usa el nombre "Mostrador".
8. **Cada criterio de aceptación tiene su test** y ningún cambio se publica con CI en rojo.

### 4.4 Reglas duras para testing

El proyecto no tiene capas formales; el corte es entre lógica pura y pantalla (`SPEC.md` §6, §11):

- Todo lo que vive en `core/datos.js` (CSV, normalización de productos, link de foto, búsqueda, mensaje de WhatsApp) lleva **test unitario con `node:test`**, sin dependencias ni DOM.
- Todo flujo de pantalla (buscar, filtrar, carrito, envío, precios ocultos, respaldo, demo) lleva **test E2E con Playwright** en Chromium a 375×740 táctil, con la planilla simulada interceptando las URLs CSV. Nunca se llama a Google ni a WhatsApp reales desde un test.
- El título de cada test empieza con el AC que cubre, por ejemplo `AC-002-3 con precios ocultos el mensaje no tiene importes`. Un AC sin test es una tarea incompleta (regla hard 8).
- Un bug corregido suma un test que fallaba antes del arreglo.
- No se testea automáticamente lo listado en `SPEC.md` §11 como manual (aspecto visual, demora de Google, WhatsApp real, Safari real). El aspecto visual se revisa con una captura a 375 px que se adjunta al PR.

### 4.5 Propuestas de documentación

Si la tarea introduce contexto nuevo (una decisión, un caso de error, un AC), proponer el diff sobre `SPEC.md` en la descripción del PR. Si no, omitir.

**No editar `SPEC.md` ni `CLAUDE.md` directamente** salvo que el issue lo pida de forma explícita y Maxi lo haya aprobado.

---

## 5. Lo que NO está cubierto por la documentación (todavía)

- **Diseño visual:** no hay design system. Colores y logo salen de `tienda.json` de cada cliente; para todo lo demás, seguir el estilo existente en `core/catalogo.css`.
- **Glosario:** no hay archivo propio (ver §1).
- **Seguridad:** no hay doc dedicado; las reglas hard 4 y 5 cubren lo esencial.
- **Preguntas abiertas de negocio:** `SPEC.md` §10 (dominios y cuentas de GitHub).

---

## 6. Reglas de comunicación con el humano

- **Tono profesional y conciso** en español rioplatense, con voseo.
- **Citar IDs siempre** (UC, AC, BR, regla hard, issue).
- **Decir "no sé"** cuando el spec no cubre el caso, y preguntar antes de suponer.
- **Esperar la decisión de Maxi** cuando se le ofrecen opciones: no construir la opción recomendada antes de que elija.

---

## 7. Cómo arrancar una tarea (cheat sheet)

1. Leer el issue: `gh issue view <N>` (o la herramienta de GitHub disponible).
2. Anotar los UC, AC y BR que cita; si no cita ninguno, deducirlos del spec y confirmarlos en el plan.
3. Crear la rama `issue-<N>-<slug>` desde `main` actualizado.
4. Seguir `task-execution-prompt.md` fase por fase.
5. Correr `node --test tests/unit` y `npx playwright test` antes del PR.
6. Abrir el PR con `Closes #<N>` y esperar CI en verde. No mergear: lo hace Maxi.

---

*Documento vivo. Si encontrás un caso recurrente no cubierto, proponé adición a este archivo antes que improvisar.*
