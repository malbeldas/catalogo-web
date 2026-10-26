# Planilla del comercio

`planilla-comercio.xlsx` es la plantilla que se le da a cada comercio en el alta (UC-021). El comercio carga sus productos ahí y la web los lee sola.

## Pestañas

| Pestaña | Quién la edita | Para qué |
|---|---|---|
| `Productos` | El comercio | Los productos. La tarea respaldo lee esta pestaña. |
| `Ajustes` | El comercio | WhatsApp, Precios, Nombre y Bajada |
| `Web` | Nadie: se arma sola con fórmulas | Solo para clientes con la planilla publicada |
| `Ayuda` | Nadie | Instrucciones para el comercio |

La plantilla es opcional: la tarea respaldo lee también la lista que el comercio ya tenga, en una Hoja de Google, un Excel o un CSV (AC-010-5).

## Pasos para el alta (los hace Claude o el vendedor, una sola vez)

1. En el Google Drive del comercio: **Nuevo > Subir archivo** y elegir `planilla-comercio.xlsx`. Puede quedar como Excel o guardarse como Hoja de Google; la tarea lee las dos.
2. **Compartir > Cualquier persona con el enlace > Lector** y copiar el link en el secreto `PLANILLA_URL` del repo del cliente (`ALTA.md`, paso 7). No publicar nada en la Web.
3. Compartir la planilla con el comercio como editor.

La tarea respaldo saca los productos con Visible = NO y, con `Ajustes > Precios` = NO, los importes, antes de guardar la copia que publica la web (BR-PRE-001, `SPEC.md` §5).

### Clientes con la planilla publicada

Un alta anterior lee `Web` y `Ajustes` publicadas como CSV. `Web` copia de `Productos` solo las filas con nombre y con Visible distinto de NO, y copia Precio y Precio anterior solo si `Ajustes > Precios` es SÍ. Para publicarla: **Archivo > Compartir > Publicar en la Web**, solo `Web` y `Ajustes` como CSV, **nunca** `Productos` ni "Todo el documento".

## Para el comercio

Las instrucciones están en la pestaña `Ayuda`. En resumen:

- Una fila por producto. El nombre es obligatorio.
- Precio con o sin `$` y puntos.
- Foto: un link de Drive compartido como "Cualquier persona con el enlace".
- Visible = NO esconde un producto sin borrarlo.
- Los cambios tardan unos 15 a 20 minutos en verse.

## Volver a generarla

```
python3 plantilla/generar.py          # 3000 filas en Web
python3 plantilla/generar.py 5000     # para catálogos más grandes
```

Requiere `openpyxl`. Solo se usa para regenerar la plantilla; la web no depende de esto.

Probada el 2026-10-25 importándola en Google Sheets:
- Con Precios = SÍ, `Web` trae los precios como número.
- Con Precios = NO, Precio y Precio anterior quedan vacíos.
- Las filas con Visible = NO (en cualquier combinación de mayúsculas) y las filas sin nombre quedan vacías.
