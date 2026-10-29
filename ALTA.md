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
- La lista de productos, con fotos, en el archivo que ya use: una Hoja de Google, un Excel o un CSV. Si no tiene, se arma con la plantilla. El alta incluye hasta 50 productos cargados por nosotros.

## Pasos

| # | Paso | Quién | Tiempo |
|---|---|---|---|
| 1 | Crear el repo | Vendedor | 2 min |
| 2 | Armar la carpeta con `alta.mjs` | Claude | 1 min |
| 3 | Planilla en Drive, compartida con el enlace | Vendedor y Claude | 20 min |
| 4 | Completar `tienda.json` y el logo | Claude | 5 min |
| 5 | Verificar | Claude | 1 min |
| 6 | Subir y activar GitHub Pages | Claude o vendedor | 5 min |
| 7 | Guardar el link, correr la tarea respaldo y sumarla al disparador | Vendedor o Claude | 5 min |
| 8 | Probarlo en el celular y mandar el link | Vendedor | 5 min |
| 9 | Opcional: QR de reseñas de Google | Vendedor y Claude | 10 min |

Total: unos 40 minutos, 50 con el QR.

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

Copia `core/` sin la demo, la tarea de respaldo, los tests del cliente con su `ci.yml` y un `tienda.json` para completar, y genera `index.html`. No copia nada de la portada, de la demo ni de los ejemplos.

Si el comercio ya tiene un sitio en ese repo, el catálogo va en una subcarpeta y no pisa nada:

```
node scripts/alta.mjs ../sitio-del-comercio catalogo
```

La web queda en `<url del sitio>/catalogo/`, y la tarea de respaldo queda en la raíz del repo y corre dentro de `catalogo/`. Desde otras páginas del sitio se puede enlazar una categoría con `catalogo/?cat=<categoría>` o una búsqueda con `catalogo/?q=<texto>`. En los pasos siguientes, "la carpeta del cliente" es esa subcarpeta.

### 3. Planilla (vendedor y Claude)

La planilla es el archivo del comercio tal como lo tenga, en su Google Drive. No se publica nada (AC-010-5).

1. Si el comercio ya tiene su lista en una Hoja de Google, un Excel o un CSV, se usa esa. Si no tiene, subí `plantilla/planilla-comercio.xlsx` a su Drive. Claude puede subirla con el conector de Drive.
2. Los productos, una fila por producto, en una pestaña `Productos` o en la primera hoja. Solo hace falta la columna `Nombre`, y se reconocen también `Producto`, `Artículo`, `Rubro`, `Imagen` y `SKU`. Puede haber un título arriba de los títulos de las columnas. Las fotos van como links de Drive compartidos como "Cualquier persona con el enlace".
3. Si tiene una pestaña `Ajustes` (la plantilla la trae), completá WhatsApp y Precios (SÍ o NO). Si no la tiene, valen los de `tienda.json`.
4. **Compartir > Cualquier persona con el enlace > Lector** y copiá el link. Ese link no va en el repo, va en un secreto (paso 7): el archivo puede tener los precios aunque la web los oculte (BR-PRE-001).
5. Compartí el archivo con el comercio como editor, si no es suyo.

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
| `icono` | Opcional: imagen cuadrada para la pestaña del navegador, si el logo es apaisado |
| `color` | Hex, por ejemplo `#1f2937` |
| `wa` | El WhatsApp con 54 y sin +: `5491122223333`. Se usa si Ajustes no tiene uno o la planilla no responde |
| `precios` | `true` o `false`. Se usa si Ajustes no lo dice |
| `planilla` | `{"privada": true}`, como viene en el molde. El link va en el secreto `PLANILLA_URL` (paso 7) |
| `ga4` | Opcional: el ID de medición de Google Analytics (`G-…`). Cuenta visitas y pedidos enviados, nunca el nombre del comprador |

Después volvé a correr `node scripts/alta.mjs ../catalogo`. Así `index.html` toma el nombre, la bajada y el logo para el título y el ícono. No pisa lo que completaste.

### 5. Verificar (Claude)

```
node scripts/verificar-alta.mjs ../catalogo
```

Con `PLANILLA_URL=<link del paso 3>` adelante, además baja el archivo y revisa que se pueda leer. Esto anda en las tareas de GitHub pero no desde una sesión de Claude, que no llega a Google.

Tiene que decir **✓ El alta está lista para publicar**. Si no, lista qué corregir, por ejemplo:
- un dato que falta;
- falta `catalogo-respaldo.json`, porque la tarea respaldo todavía no corrió (paso 7);
- precios a la vista con Precios = NO;
- `core/` distinto al de la base;
- algo de otra marca (regla hard 7).

### 6. Subir y activar Pages (Claude o vendedor)

```
cd ../catalogo
git add -A && git commit -m "Alta del catálogo" && git push -u origin main
```

En el repo, **Settings > Pages**: *Deploy from a branch*, `main`, carpeta `/ (root)`. A los pocos minutos la web está en la URL del paso 1.

Revisá que el CI del repo (**Actions > CI**) termine en verde después del push.

### 7. Guardar el link, correr la tarea respaldo y sumarla al disparador (vendedor o Claude)

1. En el repo, **Settings > Secrets and variables > Actions > New repository secret**: nombre `PLANILLA_URL`, valor el link del paso 3. Claude lo puede hacer con `gh secret set PLANILLA_URL` si tiene permiso de administrador en el repo.
2. **Actions > respaldo > Run workflow.** Tiene que terminar en verde y dejar `catalogo-respaldo.json` en `main`. Si termina en rojo, el archivo no está compartido con el enlace o no tiene la columna `Nombre`.
3. **Sumar el cliente al disparador (vendedor).** Si el disparador todavía no está instalado, seguí [Disparador](#disparador-una-sola-vez) primero.
   - En GitHub, editá el token de la cuenta del repo (**Settings > Developer settings > Personal access tokens > Fine-grained tokens**) y sumá el repo en **Repository access**. Si la cuenta es nueva para el disparador, creá un token para ella.
   - En el proyecto de Apps Script, **Configuración del proyecto > Propiedades de secuencia de comandos**: agregá el repo en una línea nueva de `CLIENTES` (`cuenta/repo`).

Desde ahí el disparador pide la tarea cada 15 minutos: lee el archivo, saca los productos con Visible = NO y los precios si Precios = NO, y guarda la copia que muestra la web. Un cambio del comercio se ve en la web en unos 15 a 20 minutos (AC-010-6). El cron de GitHub del workflow queda de respaldo, pero no se puede contar con él: casi no corre solo.

4. **Sumar el cliente a `clientes.json` de la base** (Claude), con su repo y su carpeta, para que reciba las mejoras del núcleo ([Llevar una mejora del núcleo a los clientes](#llevar-una-mejora-del-núcleo-a-los-clientes)).

**Clientes con la planilla publicada:** un alta anterior puede seguir con `planilla.web` y `planilla.ajustes` (los links CSV de "Publicar en la Web") y sin el secreto. En ese modo la web lee la planilla directo y la tarea respaldo guarda la copia para cuando Google falla.

### 8. Probar y entregar (vendedor)

En el celular, abrí la URL:
- Buscá un producto.
- Armá un pedido y tocá enviar: tiene que abrir WhatsApp al número del comercio.
- Si los precios están ocultos, que no aparezca ninguno.

Mandale al comercio el link de su web y el de su planilla. Anotá cuánto tardó el alta.

### 9. QR de reseñas de Google (opcional, vendedor y Claude)

Una tarjeta con el logo y el color del comercio y un QR que abre el formulario de reseña de Google (UC-023). Va incluida en el alta. Solo sirve si el comercio tiene Perfil de Empresa de Google; si no tiene, este paso se saltea.

**Sin nada a cambio.** La tarjeta no ofrece descuentos, regalos ni sorteos, y no pregunta antes cuántas estrellas pondría: Google no permite pedir reseñas a cambio de algo ni pedírselas solo a los clientes contentos, y puede borrarlas o penalizar el perfil (AC-023-1). Decíselo al comercio: la tarjeta se entrega a todos los clientes por igual.

1. **El link de reseña (vendedor o comercio).** Con la cuenta de Google que administra el perfil, buscá el nombre del negocio en Google o abrí [business.google.com](https://business.google.com). En el panel del perfil, tocá **Pedir reseñas** y copiá el link. Tiene esta forma: `https://g.page/r/<código>/review`. También sirve uno `https://search.google.com/local/writereview?placeid=<id>`.
2. **`tienda.json` (Claude).** Agregá el campo `resenas` con ese link y volvé a correr `node scripts/alta.mjs ../catalogo`. Genera `resena.html`, la página a la que apunta el QR: manda directo a Google y, si el comercio tiene `ga4`, cuenta el escaneo como `resena_qr`, sin datos de quien escanea (AC-023-3). Como el QR apunta a esa página y no a Google, si cambia el link de reseña se corrige `tienda.json` y las tarjetas impresas siguen sirviendo.
3. **Verificar y subir (Claude).** `node scripts/verificar-alta.mjs ../catalogo` revisa que `resenas` sea un link de reseña de Google y que esté `resena.html`. Después, commit y push como en el paso 6.
4. **La tarjeta (Claude).** Desde el repo base, con `npm ci` hecho:

   ```
   node scripts/qr-resenas.mjs ../catalogo https://<cuenta>.github.io/catalogo/
   ```

   La URL es la de la web del comercio (paso 1, o la subcarpeta). Deja en `qr-resenas/`:
   - `tarjeta.png`, una tarjeta sola, para mandar por WhatsApp o imprimir;
   - `tarjetas-A4.pdf`, 4 tarjetas por hoja A4 con líneas de corte.

   Las dos llevan solo el logo, el color y el nombre del comercio (AC-023-2).
5. **Probar (vendedor).** Escaneá el QR del PNG con la cámara del celular: tiene que abrir el formulario de reseña del negocio en Google. Si la web recién se publicó, esperá a que GitHub Pages termine.
6. **Entregar (vendedor).** Mandale al comercio el PNG y el PDF. Lo imprime en cualquier imprenta o en su casa, en papel grueso, y deja la tarjeta en la caja o la manda con cada pedido.

## Disparador (una sola vez)

Un Apps Script en tu cuenta de Google que cada 15 minutos le pide a GitHub correr la tarea respaldo de cada cliente (AC-010-6, `SPEC.md` §4). Es uno solo para todos los clientes. Lo hace el vendedor, porque necesita su cuenta de GitHub y la de Google; lleva unos 10 minutos.

### 1. Un token de GitHub por cuenta

Un token por cada cuenta u organización dueña de repos de clientes. Por ejemplo, uno para `malbeldas` y otro para `distribuidora-pueyrredon`.

1. En GitHub: **Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token**.
2. **Token name:** `Disparador catálogos`. **Expiration:** el plazo más largo que te ofrezca. Anotá la fecha: cuando vence, el disparador falla y te llega un mail.
3. **Resource owner:** la cuenta o la organización de los repos.
4. **Repository access > Only select repositories:** los repos de catálogo de esa cuenta.
5. **Permissions > Repository permissions > Actions: Read and write.** Nada más; el resto queda en *No access*.
6. **Generate token** y copiá el token. GitHub lo muestra una sola vez.

Si el dueño es una organización, puede que el token quede pendiente de aprobación: se aprueba en la organización, en **Settings > Personal access tokens > Pending requests**.

El token no va en ningún repo ni en el chat: va solo en las propiedades del script (paso 3).

### 2. El proyecto de Apps Script

1. Entrá a [script.google.com](https://script.google.com) con tu cuenta de Google y tocá **Nuevo proyecto**.
2. Arriba, cambiale el nombre a `Disparador catálogos`.
3. Borrá todo lo que trae `Código.gs` y pegá el contenido de `disparador/Codigo.gs` de este repo. Guardá.

### 3. Las propiedades

En **Configuración del proyecto** (el engranaje), **Propiedades de secuencia de comandos > Agregar propiedad de secuencia de comandos**:

| Propiedad | Valor |
|---|---|
| `CLIENTES` | Un repo por línea, como `cuenta/repo`. Por ejemplo `distribuidora-pueyrredon/distribuidora-pueyrredon.github.io` |
| `TOKEN_<cuenta>` | El token de esa cuenta. Por ejemplo `TOKEN_distribuidora-pueyrredon` |

Guardá.

### 4. Instalar y autorizar

1. En el editor, elegí la función `instalar` en la lista de arriba y tocá **Ejecutar**.
2. Google pide permisos. Como es un script tuyo y no está publicado, avisa que la app no está verificada: **Configuración avanzada > Ir a Disparador catálogos** y **Permitir**. Pide conectarse a servicios externos (GitHub) y administrar sus propios activadores.
3. En el registro tiene que decir **Actualización pedida para N cliente(s).** Si dice que falta un token o que GitHub respondió 401, 403 o 404, revisá el token (paso 1) y las propiedades (paso 3), y volvé a correr `instalar`. Correrlo de nuevo no duplica nada.

`instalar` deja un activador cada 15 minutos. Se ve en **Activadores** (el reloj). Ahí, en el activador, **Notificaciones de fallos** dice cada cuánto te avisa Google por mail si falla; con **Diariamente** llega un resumen por día.

### 5. Comprobar

En GitHub, en el repo de un cliente, **Actions > respaldo**: aparece una corrida con el evento `workflow_dispatch` cada unos 15 minutos.

## Después del alta

- El comercio edita solo su archivo. Los cambios se ven en unos 15 a 20 minutos.
- Si llega un mail de Apps Script con un error del disparador, dice qué cliente falló y por qué. Lo más común es un token vencido: se genera uno nuevo (paso 1 del disparador) y se reemplaza en las propiedades.
- Si el comercio cambia de archivo, se cambia el secreto `PLANILLA_URL`. Si deja de compartirlo, la tarea respaldo queda en rojo, GitHub avisa por mail y la web sigue con la última copia.
- Una mejora del núcleo se hace en la base y se lleva a los clientes con `propagar-nucleo.mjs` (abajo). Nunca se edita `core/` en el repo de un cliente.

## Llevar una mejora del núcleo a los clientes

Cuando se mergea en la base un cambio de `core/`, de la tarea de respaldo o de los tests del cliente (UC-022, AC-022-1). Lo hace Claude desde la base actualizada, con permiso para pushear en los repos de los clientes.

1. Ver qué cambiaría, sin tocar nada:
   ```
   node scripts/propagar-nucleo.mjs --simular
   ```
2. Si está bien, abrir los PRs:
   ```
   node scripts/propagar-nucleo.mjs
   ```
   Para un solo cliente, se agrega su repo al final, por ejemplo `node scripts/propagar-nucleo.mjs distribuidora-pueyrredon/distribuidora-pueyrredon.github.io`.
3. El script lista cómo quedó cada cliente:
   - **al día:** ya tenía este núcleo;
   - **PR:** con el link al PR en su repo;
   - **error:** con el motivo. Si sus tests fallan con el núcleo nuevo, no se le abre PR y los demás siguen. Se revisa ese cliente aparte.
4. En cada PR, esperar el CI en verde (la prueba de humo con sus datos) y mergear (vendedor). Con el merge, GitHub Pages publica el núcleo nuevo en unos minutos.

El script solo cambia `core/`, la tarea de respaldo, los tests y `ci.yml`. `tienda.json`, `img/` y la planilla del cliente no se tocan.
