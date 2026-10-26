# Alta de un cliente

Pasos para publicar el catálogo de un comercio nuevo en menos de 1 hora (UC-021, AC-021-1). El cliente queda con su repo, su planilla y su web, sin tocar el núcleo (regla hard 2).

Quién hace cada paso:
- **Vendedor:** quien vende el servicio y tiene las cuentas de GitHub y Google.
- **Claude:** lo puede hacer desde una sesión con el repo base.
- **Comercio:** el cliente.

## Antes de empezar

Pedile al comercio:
- Nombre del negocio y una frase corta (rubro o bajada).
- Logo, cuadrado o apaisado.
- Color de la marca. Si no tiene, sale del logo.
- WhatsApp donde quiere recibir los pedidos.
- Si muestra precios o los deja a consultar.
- La lista de productos, con fotos. El alta incluye hasta 50 productos cargados por nosotros.

## Pasos

| # | Paso | Quién | Tiempo |
|---|---|---|---|
| 1 | Crear el repo | Vendedor | 2 min |
| 2 | Armar la carpeta con `alta.mjs` | Claude | 1 min |
| 3 | Planilla desde la plantilla y publicada | Vendedor y Claude | 25 min |
| 4 | Completar `tienda.json` y el logo | Claude | 5 min |
| 5 | Verificar | Claude | 1 min |
| 6 | Subir y activar GitHub Pages | Claude o vendedor | 5 min |
| 7 | Correr el respaldo una vez | Claude | 2 min |
| 8 | Probarlo en el celular y mandar el link | Vendedor | 5 min |

Total: unos 45 minutos.

### 1. Crear el repo (vendedor)

En GitHub, **New repository**:
- **Público.** GitHub Pages y Actions son gratis solo en repos públicos (regla hard 1).
- Vacío: sin README, sin licencia y sin `.gitignore`.
- Nombre `catalogo`. La web queda en `https://<cuenta>.github.io/catalogo/`.

Si la cuenta u organización es solo de ese cliente, el repo puede llamarse `<cuenta>.github.io` y la web queda en la raíz.

De quién es la cuenta (tuya o del cliente) sigue abierto en `SPEC.md` §10.

### 2. Armar la carpeta (Claude)

Desde el repo base actualizado:

```
git clone https://github.com/<cuenta>/catalogo.git ../catalogo
node scripts/alta.mjs ../catalogo
```

Copia `core/` sin la demo, la tarea de respaldo y un `tienda.json` para completar, y genera `index.html`. No copia nada de la portada, de la demo ni de los ejemplos.

### 3. Planilla (vendedor y Claude)

Seguí `plantilla/README.md`:
1. Subí `plantilla/planilla-comercio.xlsx` a Drive y guardala como Hoja de cálculo de Google. Claude puede hacerlo con el conector de Drive.
2. Cargá los productos en la pestaña `Productos`, una fila por producto. Las fotos van como links de Drive compartidos como "Cualquier persona con el enlace".
3. En `Ajustes`, completá WhatsApp y Precios (SÍ o NO).
4. **Archivo > Compartir > Publicar en la Web** (vendedor; no se puede hacer sin la pantalla de Google):
   - Solo `Web` y `Ajustes`, en formato CSV.
   - **Nunca** `Productos` ni "Todo el documento": ahí están los precios aunque estén ocultos (BR-PRE-001).
   - Copiá los dos links.
5. Compartí la planilla con el comercio como editor.

### 4. `tienda.json` y logo (Claude)

En la carpeta del cliente:
- Copiá el logo a `img/` (JPG o PNG, liviano: 512 px alcanza).
- Completá `tienda.json`:

| Campo | Qué va |
|---|---|
| `id` | El nombre corto, sin espacios: `kiosco-ana` |
| `nombre`, `bajada` | Como en la planilla. Si Ajustes los trae, ganan los de Ajustes |
| `tipo` | `Mayorista`, `Minorista` o un texto corto |
| `logo` | `img/<archivo>` |
| `logoCuadrado` | `true` si el logo es cuadrado; `false` si es apaisado |
| `color` | Hex, por ejemplo `#1f2937` |
| `wa` | El WhatsApp con 54 y sin +: `5491122223333`. Se usa si Ajustes no tiene uno o la planilla no responde |
| `precios` | `true` o `false`. Se usa si Ajustes no lo dice |
| `planilla.web`, `planilla.ajustes` | Los dos links del paso 3 |

Después volvé a correr `node scripts/alta.mjs ../catalogo`. Así `index.html` toma el nombre, la bajada y el logo para el título y el ícono. No pisa lo que completaste.

### 5. Verificar (Claude)

```
node scripts/verificar-alta.mjs ../catalogo
```

Tiene que decir **✓ El alta está lista para publicar**. Si no, lista qué corregir, por ejemplo:
- un dato que falta;
- una pestaña mal publicada;
- precios a la vista con Precios = NO;
- `core/` distinto al de la base;
- algo de otra marca (regla hard 7).

### 6. Subir y activar Pages (Claude o vendedor)

```
cd ../catalogo
git add -A && git commit -m "Alta del catálogo" && git push -u origin main
```

En el repo, **Settings > Pages**: *Deploy from a branch*, `main`, carpeta `/ (root)`. A los pocos minutos la web está en la URL del paso 1.

### 7. Correr el respaldo una vez (Claude)

**Actions > respaldo > Run workflow.** Tiene que terminar en verde y dejar `catalogo-respaldo.json` en `main`. Desde ahí corre solo cada 6 horas (AC-010-4).

GitHub pausa las tareas programadas de un repo sin actividad por 60 días. Si el comercio no cambia nada en ese tiempo, el respaldo deja de correr hasta que alguien lo reactive desde Actions. La web sigue andando con la planilla.

### 8. Probar y entregar (vendedor)

En el celular, abrí la URL:
- Buscá un producto.
- Armá un pedido y tocá enviar: tiene que abrir WhatsApp al número del comercio.
- Si los precios están ocultos, que no aparezca ninguno.

Mandale al comercio el link de su web y el de su planilla. Anotá cuánto tardó el alta.

## Después del alta

- El comercio edita solo su planilla. Los cambios se ven en hasta 5 minutos (`SPEC.md` §9).
- Una mejora del núcleo se hace en la base y se lleva a cada cliente volviendo a correr `alta.mjs` sobre su repo (UC-022, STORY-008). Nunca se edita `core/` en el repo de un cliente.
