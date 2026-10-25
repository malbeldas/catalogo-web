# Planilla del comercio

`planilla-comercio.xlsx` es la plantilla que se le da a cada comercio en el alta (UC-021). El comercio carga sus productos ahí y la web los lee sola.

## Pestañas

| Pestaña | Quién la edita | ¿Se publica? |
|---|---|---|
| `Productos` | El comercio | **No.** Tiene los precios aunque estén ocultos. |
| `Ajustes` | El comercio | Sí |
| `Web` | Nadie: se arma sola con fórmulas | Sí |
| `Ayuda` | Nadie | No |

`Web` copia de `Productos` solo las filas con nombre y con Visible distinto de NO. Copia Precio y Precio anterior solo si `Ajustes > Precios` es SÍ. Con NO, los importes no llegan a lo publicado (BR-PRE-001, `SPEC.md` §5).

## Pasos para el alta (los hace Claude o el vendedor, una sola vez)

1. En el Google Drive del comercio: **Nuevo > Subir archivo** y elegir `planilla-comercio.xlsx`.
2. Abrirla con **Hojas de cálculo de Google** y luego **Archivo > Guardar como Hojas de cálculo de Google**.
3. **Archivo > Compartir > Publicar en la Web**:
   - En **Contenido publicado y configuración**, dejar tildadas solo `Web` y `Ajustes`. **Nunca** `Productos` ni "Todo el documento".
   - Arriba, elegir la pestaña `Web` y el formato **Valores separados por comas (.csv)**, tocar **Publicar** y copiar el link en `planilla.web` de `tienda.json`.
   - Repetir con la pestaña `Ajustes` y copiar el link en `planilla.ajustes`.
4. Compartir la planilla con el comercio como editor.

## Para el comercio

Las instrucciones están en la pestaña `Ayuda`. En resumen:

- Una fila por producto. El nombre es obligatorio.
- Precio con o sin `$` y puntos.
- Foto: un link de Drive compartido como "Cualquier persona con el enlace".
- Visible = NO esconde un producto sin borrarlo.
- Los cambios tardan hasta 5 minutos en verse (`SPEC.md` §9).

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
