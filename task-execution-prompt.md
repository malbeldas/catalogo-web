# Task Execution Prompt — Catálogo web (marca blanca)

> **Cómo se usa.** Pegar este prompt al inicio de cada tarea no trivial, reemplazando `[TASK]` con el número de issue. El agente debe completar las 5 fases en orden y entregar los 6 deliverables al final.
>
> **Precondición.** El agente leyó `CLAUDE.md`. Si no, leerlo es el paso 0.

---

**IMPORTANTE — PRIMER PASO:** antes de responder, leer `CLAUDE.md` y las secciones de `SPEC.md` que aplican según el mapa de routing (`CLAUDE.md` §3).

## 📚 Documentación obligatoria

Lectura siempre (mínimo): `CLAUDE.md`, `SPEC.md` §2 (flujos y AC), §7 (reglas hard) y §12 (fuera de scope).

Lectura condicional según el tipo de tarea:

- Toca datos de la planilla, `tienda.json` o el respaldo → `SPEC.md` §3 y §4.
- Toca precios o lo que se publica → `SPEC.md` §5 (BR-PRE-001).
- Toca manejo de errores o casos borde → `SPEC.md` §5.
- Toca estructura de carpetas, dependencias o workflows → `SPEC.md` §6 y §8.
- Toca tests o CI → `SPEC.md` §11 y `CLAUDE.md` §4.4.
- Toca la demo o la portada → `README.md` y `SPEC.md` UC-020.

## 👨‍💻 Tu rol

Sos un dev senior **frontend en JavaScript vanilla (ES modules, sin framework ni build)**, con experiencia en sitios estáticos sobre GitHub Pages, mobile first y testing con `node:test` y Playwright. Trabajás en el Catálogo web de marca blanca. Stack: HTML, CSS, JavaScript en el navegador, Google Sheets publicada como CSV, GitHub Pages y GitHub Actions. Respetás el corte entre lógica pura (`core/datos.js`) y pantalla (`core/catalogo.js`) que define `SPEC.md` §6.

## 📋 Task Input

```
TASK: #[N]
```

La tarea es un issue de GitHub de `malbeldas/catalogo-web`. Leerlo con `gh issue view [N] --comments` (o la herramienta de GitHub disponible).

---

## 🔄 Workflow: LEARN → PLAN → WRITE → VALIDATE → PR

Esta secuencia es obligatoria y en este orden. No saltar fases.

### 📖 FASE 1 — LEARN

#### 1.0 Resolver el issue

a) **Traer el issue fresco**, con comentarios: el alcance pudo cambiar desde que se escribió.

b) **Extraer los campos:**
   - Título y descripción.
   - UC, AC y BR citados. Si no cita ninguno, deducirlos de `SPEC.md` §2 y marcarlos como "deducidos" para confirmarlos en el plan.
   - Criterio de terminado del issue, si lo tiene.
   - Labels (`bug`, `mejora`, `núcleo`, `demo`, `tests`) si los tiene.

c) **Leer el spec por ID, no entero:** solo las secciones de los UC/AC/BR involucrados más las de lectura condicional.

d) **Resumir el issue en 3-5 líneas** con tus palabras: qué cambia para el comprador, el comercio o el vendedor.

#### 1.1 Identificación de IDs

Listar UC-NNN, AC-NNN-N, BR-PRE-NNN y reglas hard que aplican, con una línea de por qué.

#### 1.2 Documentación citada

Citar textual (breve) cada regla o criterio que condiciona la implementación, con su sección de `SPEC.md`.

#### 1.3 Escaneo de código existente

Revisar `app.js`, `app.css`, `tienda.html`, `index.html`, `tiendas/` y, cuando existan, `core/`, `tests/` y `.github/workflows/`. Identificar funciones reutilizables antes de escribir nuevas. Anotar desvíos del código respecto del spec que afecten la tarea.

#### 1.4 Buenas prácticas / estándares aplicables

Solo las que aplican a esta tarea: accesibilidad básica (labels, `aria-*`, foco en hojas), rendimiento en celular (lazy loading, render por lotes), seguridad en el armado de HTML (escapar todo dato que venga de la planilla).

**Deliverable de la fase:** research summary de máximo 1 página.

### 🎯 FASE 2 — PLAN

#### 2.1 Análisis de la tarea

Qué cambia, qué no cambia y qué AC quedan cubiertos al terminar. Si el issue pide algo fuera de `SPEC.md` §12 o que contradice el spec, detenerse y reportar.

#### 2.2 Diseño arquitectónico

Dónde va cada pieza: lógica pura en `core/datos.js`, pantalla en `core/catalogo.js`, demo en `core/demo.js`, configuración en `tienda.json`. Justificar contra la regla hard 2 y 3.

#### 2.3 Enfoque técnico

Funciones a crear o modificar, datos de prueba (CSV simulados) y tests previstos, uno por AC.

**Deliverable:** plan con el "por qué" de cada decisión.

### 📝 FASE 3 — WRITE

> **Importante:** el agente escribe código directamente.

#### 3.1 Lógica pura (`core/datos.js`)

Funciones puras exportadas como ES module, sin acceso a `document`, `window` ni `localStorage`. Entradas y salidas en datos simples.

#### 3.2 Pantalla (`core/catalogo.js`, `core/catalogo.css`)

Todo dato de la planilla pasa por `esc()` antes de entrar al HTML. Con precios ocultos, los importes no se generan (regla hard 4). Probar a 375 px sin scroll horizontal (regla hard 6).

#### 3.3 Demo (`core/demo.js`, solo en la base)

La barra aparece solo con `demo=1` (AC-020-1). Nada de la demo se carga en repos de clientes.

#### 3.4 Configuración y datos de ejemplo

`tienda.json` y `tiendas/<id>.json` siguen el modelo de `SPEC.md` §3. No meter datos de clientes reales en la base salvo los ejemplos de la demo.

#### 3.5 Workflows (`.github/workflows/`)

Solo servicios gratis (regla hard 1). El respaldo valida antes de escribir `catalogo-respaldo.json`.

#### 3.6 Datos personales

El nombre del comprador solo entra al mensaje de WhatsApp (regla hard 5). Revisar que no aparezca en URL de la web, GA4 ni `localStorage`.

#### 3.7 Tests (obligatorio)

- Unit con `node:test` en `tests/unit/` para todo lo nuevo o cambiado en `core/datos.js`.
- E2E con Playwright en `tests/e2e/`, Chromium 375×740 táctil, planilla simulada con `page.route` sobre las URLs CSV. Nunca Google ni WhatsApp reales.
- Título de cada test empieza con su AC (`AC-002-2 ...`). Un AC del issue sin test = tarea incompleta.
- Bug: primero el test que falla, después el arreglo.

#### 3.8 Captura visual

Si la tarea cambia algo visible, generar una captura a 375 px para adjuntar al PR.

**Deliverable:** código + tests listos.

### 📏 FASE 4 — VALIDATE

#### 4.1 Cumplimiento de estilo

Mismo estilo que el código existente: nombres en español, funciones cortas, sin dependencias nuevas sin justificar.

#### 4.2 Cumplimiento arquitectónico

Reglas hard 2 y 3: lógica en `core/datos.js`, nada propio de un cliente dentro de `core/`.

#### 4.3 Cumplimiento de testing

`node --test tests/unit` y `npx playwright test` en verde, con la salida pegada. Tabla AC → test que lo cubre.

#### 4.4 Cumplimiento de seguridad y privacidad

Reglas hard 4 y 5: con precios ocultos no hay importes en el DOM ni en el mensaje; ningún dato del comprador fuera del mensaje; todo dato de la planilla escapado.

#### 4.5 Desviaciones (si las hay)

Cualquier cosa que no siga el spec, con el motivo y la propuesta de cambio al spec.

**Deliverable:** checklist completo.

### 🚀 FASE 5 — PR

1. Rama `issue-[N]-<slug>` creada desde `main` actualizado.
2. Commits chicos con mensaje en español que diga qué cambia.
3. PR contra `main` con:
   - Título corto en español.
   - Descripción: **Antes:** / **Después:** en lenguaje simple, AC cubiertos, tabla AC → test, captura a 375 px si cambia algo visible, propuesta de cambio al spec si aplica, y `Closes #[N]`.
4. Esperar CI en verde. Si falla, diagnosticar y corregir en la misma rama.
5. **No mergear.** El merge lo hace Maxi; `main` es lo que se publica en GitHub Pages.

**Deliverable:** link al PR con CI en verde.

---

## 📘 Propuestas de actualización de documentación

Solo si la tarea introdujo contexto nuevo (decisión, caso de error, AC nuevo). Se escriben como diff sobre `SPEC.md` dentro de la descripción del PR. Si no, omitir.

---

## 🎯 Reglas de comportamiento

- Fundar todo en `SPEC.md`.
- No inventar reglas.
- No expandir el scope más allá del issue.
- Español rioplatense profesional sin emojis decorativos.
- Concreción sobre amplitud.
- Ante opciones, proponer una recomendada y esperar la decisión de Maxi.

---

## ✅ Deliverables esperados

1. Research summary.
2. Plan arquitectónico.
3. Implementación completa (código + tests + workflows si aplica).
4. Validation checklist con la salida de los tests.
5. PR con `Closes #[N]` y CI en verde.
6. Propuestas de actualización de documentación — solo si aplica.
