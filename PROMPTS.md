# Prompts para el agente de Cursor

Úsalos en orden, uno a la vez, en el chat del agente (modo **Agent**). Después de cada uno
revisa lo que hizo y cuéntale a Claude el resultado antes de pasar al siguiente.

## P1 — Reglas del carrito

```
Lee SPEC.md y .cursor/rules/proyecto.mdc. Crea src/data/products.json con el catálogo de la sección 3 y src/lib/carrito.ts con las reglas de la sección 4, más src/lib/carrito.test.ts con Vitest cubriendo todos los casos límite de la sección 9. Instala y configura Vitest y agrega los scripts test y test:coverage. Todavía no hagas interfaz ni API. Al final ejecuta npm test y npm run lint y dime el resultado.
```

## P2 — API de productos y totales

```
Implementa GET /api/products y POST /api/cart/quote según la sección 6 de SPEC.md, usando src/lib/carrito.ts. Valida la entrada y responde 400 con { error } en español en cada caso que lista la spec. Agrega pruebas de la ruta quote (caso válido y cada caso 400). Ejecuta npm test, npm run lint y npm run build.
```

## P3 — Interfaz: catálogo y carrito

```
Construye las páginas / y /carrito según las secciones 5 y 8 de SPEC.md. El carrito se guarda en localStorage con la clave toolshop-carrito (solo productId y quantity) y los totales siempre vienen de POST /api/cart/quote. Respeta todos los data-testid, los roles accesibles, el formato COP y el estado de carga del botón. El botón Pagar todavía no hace nada. Ejecuta npm run lint y npm run build.
```

## P4 — Pago con Mercado Pago

```
Integra Mercado Pago Checkout Pro según la sección 6 de SPEC.md: POST /api/checkout con el SDK oficial mercadopago v2 (Preference), las páginas /pedido/exito (consulta el pago desde el servidor con Payment) y /pedido/fallo, y conecta el botón Pagar para redirigir a checkoutUrl. Crea .env.example con las variables de la sección 7, sin valores. Agrega pruebas de /api/checkout con el SDK simulado. No pongas ninguna clave en el código. Ejecuta npm test, npm run lint y npm run build.
```

## P5 — Webhook

```
Implementa POST /api/webhooks/mercadopago según la sección 6 de SPEC.md: validación de x-signature con HMAC-SHA256 y comparación en tiempo constante, 401 si la firma falta o no es válida, consulta del pago y registro en el log si está aprobado. Agrega pruebas con firma válida, inválida y ausente. Ejecuta npm test, npm run lint y npm run build.
```

## P6 — CI con GitHub Actions

```
Crea .github/workflows/ci.yml que corra en push y pull_request a main con Node 22 en ubuntu-latest: npm ci, npm run lint, npm test y npm run build. Usa variables de entorno ficticias solo para que el build no falle (sin claves reales). Explícame brevemente cada paso.
```
