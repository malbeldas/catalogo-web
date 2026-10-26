# Catálogo web (marca blanca)

Catálogo para comercios: productos con fotos, precios visibles u ocultos y pedidos por WhatsApp.

- `index.html`: portada de la demo.
- `tienda.html?t=<id>&demo=1`: el catálogo. Con `demo=1` aparece la barra para pasar entre ejemplos y mostrar las funciones; el pedido se muestra como chat de ejemplo en vez de abrir WhatsApp.
- `tiendas/<id>.json`: un archivo por negocio (nombre, bajada, logo, color, WhatsApp, precios sí/no, categorías y productos).
- `t=propia`: catálogo que se arma en el momento con fotos del celular (queda guardado solo en ese celular).

## Clientes

Cada cliente tiene su propio repo, armado desde esta base con `scripts/alta.mjs` y revisado con `scripts/verificar-alta.mjs`. Los pasos completos están en [ALTA.md](ALTA.md).
