# PRD — Toolshop mini tienda (pruebas E2E de frontend)

**URL:** https://toolshop-mini-tienda.vercel.app
**Idioma de la interfaz:** español. **Moneda:** pesos colombianos (COP), sin decimales, formato `$ 63.900` (el espacio después de `$` puede ser un espacio no separable).
**Inicio de sesión:** no tiene. Cualquier visitante puede comprar.

## 1. Propósito

Mini tienda de herramientas que permite ver un catálogo, armar un carrito con reglas de negocio (cantidades y descuento ecológico) y pagar con Mercado Pago Checkout Pro en modo de prueba.

## 2. Alcance de las pruebas

**Dentro del alcance:** catálogo, carrito, cálculo de totales, persistencia del carrito, inicio del pago (redirección a Mercado Pago), páginas de resultado del pedido.

**Fuera del alcance (no ejecutar):**
- **No iniciar sesión en Mercado Pago ni completar pagos.** La prueba del pago termina cuando el navegador llega a una URL del dominio de Mercado Pago (contiene `mercadopago`). El pago real de prueba se valida manualmente.
- Webhooks, APIs internas y panel de Mercado Pago.

## 3. Catálogo (página `/`)

| Producto | data-testid (id) | Precio | Existencias | Ecológico |
|---|---|---|---|---|
| Alicate de combinación | combination-pliers | $ 52.000 | 12 | Sí |
| Cortapernos | bolt-cutters | $ 189.000 | 5 | No |
| Alicate de punta larga | long-nose-pliers | $ 41.500 | 0 (Agotado) | Sí |
| Martillo de uña | claw-hammer | $ 63.900 | 20 | Sí |
| Martillo Thor | thor-hammer | $ 459.000 | 2 | No |
| Serrucho para madera | wood-saw | $ 78.000 | 8 | Sí |
| Lijadora orbital | sheet-sander | $ 245.000 | 4 | No |
| Flexómetro 5 m | tape-measure | $ 29.900 | 30 | Sí |

Criterios:
- Se muestran los 8 productos, cada uno en `product-card-<id>` con precio (`product-price-<id>`) y existencias (`product-stock-<id>`).
- Los productos ecológicos muestran la insignia "Ecológico" (`eco-badge-<id>`); los demás no.
- "Alicate de punta larga" muestra "Agotado" y su botón (`add-to-cart-long-nose-pliers`) está **deshabilitado** con el texto "Agotado".
- El botón "Agregar" (nombre accesible "Agregar <producto> al carrito") suma 1 unidad y muestra el mensaje "<producto> agregado al carrito".
- El encabezado tiene el enlace "Carrito (N)"; el número (`cart-count`) es el total de **unidades** y se actualiza en cada página.

## 4. Carrito (página `/carrito`)

- Cada producto agregado aparece como una línea (`cart-line-<id>`) con nombre, precio unitario, campo de cantidad (`qty-input-<id>`, etiqueta "Cantidad de <producto>"), subtotal de línea y botón "Eliminar" (`remove-<id>`).
- Agregar el mismo producto varias veces **acumula** la cantidad en una sola línea.
- **Cantidad:** mínimo 1, máximo 99. Si se escribe 0 queda en 1; si se escribe 150 queda en 99.
- Totales: subtotal (`cart-subtotal`), descuento ecológico (`cart-eco-discount`, se muestra como `-$ X`) y total (`cart-total`). Los calcula el servidor; mientras calcula se muestra "…" y el botón dice "Calculando…".
- **Descuento ecológico:** si **más del 50 %** de las unidades del carrito son ecológicas, se descuenta el 5 % del subtotal, redondeado al peso. Exactamente 50 % **no** tiene descuento.
- Eliminar todas las líneas muestra "Tu carrito está vacío." (`cart-empty`) con el enlace "Ver el catálogo".
- El carrito **se conserva al recargar** la página.
- Errores de cálculo o de pago se muestran en `cart-error` o `checkout-error`.

### Casos con valores esperados

| Carrito | Subtotal | Descuento | Total |
|---|---|---|---|
| 1 Martillo de uña | $ 63.900 | -$ 3.195 | $ 60.705 |
| 2 Martillo de uña + 1 Flexómetro 5 m | $ 157.700 | -$ 7.885 | $ 149.815 |
| 1 Martillo de uña + 1 Cortapernos (50 % ecológico) | $ 252.900 | -$ 0 | $ 252.900 |
| 2 Martillo de uña + 1 Cortapernos (67 % ecológico) | $ 316.800 | -$ 15.840 | $ 300.960 |
| 3 Cortapernos + 1 Alicate de combinación | $ 619.000 | -$ 0 | $ 619.000 |

## 5. Pago

- El botón "Pagar" (`checkout-button`) está habilitado cuando los totales ya se calcularon.
- Al hacer clic, el botón muestra "Redirigiendo a Mercado Pago…" y el navegador navega a una URL de Mercado Pago (dominio que contiene `mercadopago`). **Ahí termina la prueba.**
- El carrito **no** se vacía al iniciar el pago.

## 6. Páginas de resultado

- `/pedido/fallo`: título "El pago no se completó", mensaje (`payment-failed`) y botón "Volver al carrito" (`back-to-cart`). El carrito sigue intacto.
- `/pedido/exito` **sin** parámetros: título "No pudimos confirmar el pago", mensaje (`payment-unconfirmed`) y enlace "Volver al carrito".
- `/pedido/exito` con un pago aprobado real muestra "¡Gracias por tu compra!", número de pedido (`order-reference`, formato `TS-AAAAMMDDhhmmss-XXXXXX`), estado "Aprobado" (`order-status`) y total (`order-total`), y vacía el carrito. Este caso requiere un pago real y se valida manualmente.

## 7. Notas para el agente de pruebas

- Preferir selectores por rol y nombre accesible o por `data-testid`.
- La app usa Next.js con navegación que conserva páginas anteriores ocultas en el DOM: usar siempre elementos **visibles**.
- No buscar alertas solo por `role="alert"`: Next.js agrega uno propio vacío (`__next-route-announcer__`). Usar los `data-testid` de la sección 4 y 6.
- Para empezar con un carrito vacío, usar una sesión limpia (el carrito vive en `localStorage`, clave `toolshop-carrito`).
