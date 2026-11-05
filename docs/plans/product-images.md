# Plan: fotos de productos

## Contexto

- **Web**: Next.js 16 con `output: "export"` (estático en Netlify). Sin servidor no hay optimización de `next/image`, así que los tamaños se generan antes de subir. Los productos se editan en `GardenForm` (`components/gardens/garden-form.tsx`), una fila `ProductRow` por producto, con borradores guardados en `localStorage` (`lib/garden-drafts.ts`). En el mapa se ven en la pestaña "Productos" de `GardenDrawer`, como una tabla.
- **Backend**: NestJS 12 + Mongoose en Render free. El disco es efímero y la instancia tiene poca RAM, así que **los bytes de las fotos nunca pasan por el backend**: solo firma URLs.
- **Modelo actual**: `Product` es un subdocumento sin `_id`, y `PATCH /gardens/:id` reemplaza el arreglo `products` entero.
- **Almacenamiento**: Cloudflare R2, bucket `shareyourgarden-images`, con un token "Object Read & Write" limitado a ese bucket (ya creado). La capa del backend usa el API de S3, así que sirve igual con B2, GCS o MinIO.
- **Objetivo**: que el dueño agregue **hasta 3 fotos por producto** y que los visitantes las vean en el mapa, sin salir del plan gratuito.

---

## 1. Decisiones de UX/UI

### 1.1 Dónde se agregan las fotos

**Dentro de cada `ProductRow`, debajo de los campos**, como una fila de hasta 3 tarjetas `Attachment` verticales dentro de un `AttachmentGroup`. No va en un paso aparte ni en un modal: la foto es un atributo del producto y el usuario ya está en ese contexto.

```
┌ Producto ─────────────────────────────────────────── ✕ ┐
│ [Tomates cherry        ] [🥕 Verdura ▾] [ 2 ] [kg ▾]    │
│                                                        │
│ ┌──────┐ ┌──────┐ ┌ ─ ─ ─┐                             │
│ │ foto │ │ foto ⋯│ │  ＋   │                             │
│ │Portada│ │Foto 2│ │Agregar│                            │
│ │      │ │Subiendo│ │ 2/3 │                             │
│ └──────┘ └──────┘ └ ─ ─ ─┘                             │
└────────────────────────────────────────────────────────┘
```

- **Cada foto es un `Attachment` con `orientation="vertical"` y `size="sm"`.** `AttachmentMedia variant="image"` lleva la miniatura recortada al centro (`aspect-square object-cover`), para que la fila se vea pareja aunque las fotos tengan proporciones distintas. `AttachmentTitle` dice "Portada" o "Foto 2", y `AttachmentDescription` dice el estado ("Subiendo…", "Lista" o el error).
- **La casilla para agregar es otro `Attachment` con `state="idle"`.** Lleva un `ImagePlusIcon` en `AttachmentMedia` (variante `icon`), el título "Agregar foto", el contador "2/3" como descripción y un borde punteado (`border-dashed`, el mismo estilo que el estado vacío de productos). Su `AttachmentTrigger` abre el selector de archivos. Solo aparece si quedan cupos. Así tiene el mismo tamaño y ritmo que las fotos, sin estilos propios.
- **La primera foto es la portada.** Es la que se ve en listados y en el drawer.
- **Acciones por foto, en `AttachmentActions`**: un `AttachmentAction` con `XIcon` para quitar y otro con `EllipsisIcon` que abre un `DropdownMenu` con "Usar como portada" (solo si no lo es). Reordenar arrastrando no vale la pena con 3 fotos: es difícil en táctil y poco accesible. "Usar como portada" cubre el único orden que importa.
- **`AttachmentTrigger` en cada foto lista** abre la misma galería del mapa (§1.4), para que el dueño vea cómo quedó.
- **Escritorio**: se pueden soltar archivos sobre la fila del producto. El borde de la fila se resalta (`ring-2 ring-primary/40`) mientras se arrastra encima.
- **Móvil**: la casilla abre el selector nativo con `accept="image/*"`, que ya ofrece cámara y galería. No usar `capture`, porque obliga a usar la cámara.
- **Selección múltiple**: se aceptan varias fotos de una vez. Si se eligen más de las que caben, se toman las primeras y un toast lo explica ("Solo caben 3 fotos por producto; agregamos 1").
- **Texto de confianza** bajo el título de la sección de productos (`FieldDescription`): "Puedes agregar hasta 3 fotos por producto. Quitamos la ubicación guardada en las fotos." Decir que se elimina el GPS da tranquilidad, porque son fotos tomadas en casa.

### 1.2 Subir apenas se elige la foto

La subida empieza **en cuanto se elige la foto**, no al guardar. Así, al pulsar "Guardar" ya está casi todo arriba y el guardado es instantáneo.

Cada foto usa la prop `state` de `Attachment`, que ya trae los estilos (shimmer mientras trabaja y tratamiento destructivo en error):

| `state` | Cuándo | Cómo se ve |
| --- | --- | --- |
| `processing` | Reduciendo la foto en el navegador | Vista previa local (`URL.createObjectURL`) y "Preparando…". |
| `uploading` | PUT a R2 en curso | "Subiendo…". No muestra porcentaje: con ~200 KB la barra saltaría de 0 a 100. |
| `done` | Subida lista | Sin descripción, o "Portada". Se anuncia en una región `aria-live="polite"`: "Foto agregada a Tomates cherry". |
| `error` | Falló el procesamiento o la subida | El motivo en `AttachmentDescription` (no solo el color, como pide la guía del componente) y un `AttachmentAction` con `RotateCcwIcon` "Reintentar" junto al de quitar. |

- **Mientras haya fotos subiendo, "Guardar" muestra un `Spinner` y dice "Subiendo fotos…"**, deshabilitado. Si hay fotos con error, el guardado falla con el mismo patrón de validación del formulario: foco en la primera casilla con error y el mensaje "Reintenta o quita las fotos que no se subieron".
- **Quitar una foto no pide confirmación.** Nada se borra de verdad hasta guardar, y "Cancelar" o "Descartar cambios" la recuperan. Se muestra un toast "Foto quitada · Deshacer" (sonner) para que sea reversible sin modal.

### 1.3 Errores esperables y sus mensajes

| Caso | Mensaje |
| --- | --- |
| Formato que el navegador no puede leer (HEIC en Chrome de escritorio) | "No pudimos leer esta foto. Prueba con JPG o PNG." En iPhone no ocurre, porque Safari entrega JPEG al elegir desde la galería. |
| Archivo original de más de 25 MB | "La foto es demasiado grande (máx. 25 MB)." |
| Sin conexión o error de red | Estado de error con "Reintentar". |
| Límite de subidas (`429`) | "Subiste muchas fotos seguidas. Intenta en unos minutos." |
| Backend sin bucket configurado (`503`) | La casilla "Agregar foto" se reemplaza por "Las fotos no están disponibles en este momento". |

### 1.4 Cómo se ven en el mapa (`GardenDrawer`)

- **Pestaña "Productos"**: la tabla pasa a ser una **lista de `Item`** (componente que ya existe), más fácil de leer en el ancho del drawer que una tabla de 4 columnas:
  - A la izquierda, `ItemMedia` con la portada en 48 px (`rounded-md object-cover`). Si el producto no tiene fotos, se muestra el ícono de su tipo sobre `bg-muted` (los mismos `TYPE_ICONS` del formulario), así la lista queda alineada.
  - Al centro, el nombre y debajo el tipo en `text-muted-foreground`.
  - A la derecha, la cantidad.
  - Si hay más de una foto, un `Badge` pequeño "+2" sobre la miniatura.
- **Al tocar la miniatura se abre una galería** (`Dialog` + `Carousel`):
  - Fondo oscuro, foto en tamaño completo con `object-contain`, el nombre del producto y la cantidad como pie de foto, y un indicador "1 / 3".
  - Swipe en táctil, flechas del teclado en escritorio, y botones anterior/siguiente solo en `md+`.
  - En móvil ocupa toda la pantalla; en escritorio, un máximo de `max-w-3xl`.
  - Se cierra con Esc, con la ✕ o tocando fuera. El foco vuelve a la miniatura que la abrió.
- **Las imágenes cargan sin saltos de layout**: `width` y `height` reales (los guarda el backend), `loading="lazy"`, `decoding="async"` y fondo `bg-muted` mientras cargan.
- **Fotos rotas** (si alguna vez falta un objeto): `onError` cambia al ícono del tipo de producto. Nunca se muestra el ícono de imagen rota del navegador.

### 1.5 Accesibilidad

- El `AttachmentTrigger` de la casilla para agregar lleva `aria-label` "Agregar foto a Tomates cherry (2 de 3)". El `<input type="file">` queda oculto (`sr-only`), no con `display: none`, para que siga accesible.
- Todos los `AttachmentAction` son íconos, así que cada uno lleva `aria-label` con el nombre: "Quitar foto 2 de Tomates cherry", "Reintentar…", "Más opciones…". El trigger de cada foto: "Ver foto 2 de Tomates cherry". El trigger queda detrás de las acciones, así que ambos se enfocan y se pulsan por separado.
- Cada miniatura lleva un `alt` automático: "Foto 1 de Tomates cherry". Pedir texto alternativo al dueño agregaría fricción para poco beneficio en un catálogo de este tipo.
- El `AttachmentGroup` lleva `role="group"` y `aria-label` "Fotos de Tomates cherry".
- El menú `⋯` funciona con teclado (Base UI ya lo resuelve). La galería atrapa el foco (`Dialog`) y anuncia "Foto 2 de 3".
- El estado de error se entiende por el texto, no solo por el color.

---

## 2. Componentes shadcn

### 2.1 Ya instalados

| Componente | Uso |
| --- | --- |
| `Button` | Navegación de la galería. |
| `Badge` | "+2" sobre la miniatura del drawer. |
| `DropdownMenu` | Menú `⋯` de cada foto ("Usar como portada"). |
| `Spinner` | Botón "Guardar" ocupado. |
| `Skeleton` | Miniaturas mientras cargan en el drawer. |
| `Item` (`ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`) | Lista de productos del drawer. |
| `Field` (`FieldDescription`, `FieldError`) | Texto de ayuda y errores de la sección de fotos. |
| `sonner` | "Foto quitada · Deshacer" y avisos de límite. |

### 2.2 A agregar con el CLI

```bash
pnpm dlx shadcn@latest add attachment dialog carousel
```

- **`attachment`**: cada foto del formulario y la casilla para agregar. Partes que se usan:

  | Parte | Uso |
  | --- | --- |
  | `AttachmentGroup` | La fila de fotos de cada producto (scroll horizontal con snap si el ancho no alcanza). |
  | `Attachment` | `orientation="vertical"`, `size="sm"` y `state` según la subida (§1.2). |
  | `AttachmentMedia` | `variant="image"` con el `<img>`, o `variant="icon"` con `ImagePlusIcon` en la casilla para agregar. |
  | `AttachmentTitle` / `AttachmentDescription` | "Portada" o "Foto 2", y el estado o el error. |
  | `AttachmentActions` / `AttachmentAction` | Quitar, reintentar y el `⋯` (como `render` del `DropdownMenuTrigger`). |
  | `AttachmentTrigger` | Abre la galería en las fotos listas y el selector de archivos en la casilla para agregar. |

  El componente no trae selector de archivos, zona para soltar ni lógica de subida. Eso vive en `ProductImagesField` y `use-image-uploads`.
- **`dialog`**: contenedor de la galería.
- **`carousel`**: usa `embla-carousel-react` (unos 7 kB gzip). Hay que confirmar que el registro tenga la variante para el estilo `base-vega`. Si no, la galería se arma con `Dialog` y un contenedor con `scroll-snap-type: x mandatory`, sin dependencias.

No hace falta `Progress`: las fotos pesan ~200 KB después de reducirlas y suben en menos de un segundo, así que un `Spinner` comunica mejor que una barra que salta de 0 a 100.

---

## 3. Infraestructura (Cloudflare R2)

### 3.1 Estructura del bucket

```
tmp/{imageId}/full       ← subidas sin confirmar; se borran solas a las 24 h
tmp/{imageId}/thumb
gardens/{gardenId}/{imageId}/full   ← fotos confirmadas al guardar la huerta
gardens/{gardenId}/{imageId}/thumb
```

- `imageId` es un UUID generado por el backend. Como una foto nunca cambia (editarla es subir otra), los objetos son inmutables y se sirven con `Cache-Control: public, max-age=31536000, immutable`.
- El prefijo `gardens/{gardenId}/` permite borrar todas las fotos de una huerta de una vez.
- Las claves no llevan extensión. El tipo va en el `Content-Type` del objeto (`image/webp`, o `image/jpeg` si el navegador no codifica WebP).

### 3.2 Configuración pendiente en Cloudflare

1. **CORS del bucket** (Settings → CORS policy):

   ```json
   [
     {
       "AllowedOrigins": ["https://<tu-sitio>.netlify.app", "http://localhost:3000"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["Content-Type", "Content-Length"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Para leer las imágenes con `<img>` no hace falta CORS.
2. **Regla de ciclo de vida** (Settings → Object lifecycle rules): borrar objetos con prefijo `tmp/` 1 día después de creados.
3. **Acceso público**: **pendiente de decidir**.
   - Opción A: dominio propio en Cloudflare (por ejemplo `img.<dominio>`), con caché del CDN. Es la recomendada.
   - Opción B: un Worker en `*.workers.dev` que lee del bucket. Es gratis y no requiere dominio, pero no tiene caché y está limitado a 100 mil peticiones al día.

   La URL elegida va en `PUBLIC_ASSETS_URL`. El frontend recibe las URLs completas desde la API, así que cambiar de opción no toca la web.
4. **Alertas de facturación** activadas.
5. **Bucket de desarrollo** `shareyourgarden-images-dev` con su propio token y la misma configuración, con `http://localhost:3000` en CORS.

---

## 4. Backend (`shareyourgarden-backend`)

### 4.1 Configuración

Variables nuevas en `.env.default` y en la tabla del README:

| Variable | Descripción |
| --- | --- |
| `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| `S3_REGION` | `auto` para R2. |
| `S3_BUCKET` | `shareyourgarden-images` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Credenciales del token. Solo en Render y en `.env` local, nunca en el repo. |
| `PUBLIC_ASSETS_URL` | Base pública desde donde se sirven las fotos. |

**Son opcionales**, a diferencia de `GOOGLE_CLIENT_ID`. Si faltan, la app arranca igual y las fotos quedan desactivadas (`503 IMAGES_DISABLED`). Así quien haga fork o desarrolle en local no necesita un bucket para levantar el proyecto.

Dependencias: `@aws-sdk/client-s3` y `@aws-sdk/s3-request-presigner`.

### 4.2 Módulo `storage/`

`StorageService` es un envoltorio fino sobre el cliente S3:

- `presignPut(key, contentType, contentLength)`: firma un PUT válido por 10 minutos. `Content-Type` y `Content-Length` van firmados, así que R2 rechaza un archivo de otro tipo o tamaño. Esto es necesario porque R2 no soporta POST con política.
- `head(key)`: confirma que el objeto existe y devuelve su tamaño.
- `copy(from, to)`: copia con `MetadataDirective: REPLACE` para fijar el `Cache-Control` inmutable.
- `deletePrefix(prefix)` y `deleteKeys(keys)`.
- `publicUrl(key)`.

En los tests se reemplaza por un mock. No se llama a R2 desde los tests.

### 4.3 Modelo

```ts
@Schema({ _id: false })
export class ProductImage {
  @Prop({ required: true }) id: string // UUID
  @Prop({ required: true, min: 1 }) width: number
  @Prop({ required: true, min: 1 }) height: number
}

// En Product:
@Prop({ type: [ProductImageSchema], default: [] })
images: ProductImage[]
```

Nueva colección **`uploads`**, para las subidas pendientes de confirmar:

```ts
{ _id: imageId, userId, contentType, fullSize, thumbSize, createdAt }
// Índice TTL de 24 h sobre createdAt, alineado con la regla de `tmp/`.
```

Sirve para tres cosas: comprobar que el `imageId` que llega al guardar lo subió **ese mismo usuario**, aplicar el límite de subidas y que el registro se limpie solo.

**No hace falta dar `id` a los productos.** La identidad la tiene cada foto. Al guardar, el backend compara los `imageId` de la huerta antes y después, aunque el arreglo de productos se reemplace entero. Así no cambia el `PATCH` ni se necesita migración.

### 4.4 Endpoints

**`POST /uploads/images`** (`JwtAuthGuard`)

```jsonc
// Body
{ "contentType": "image/webp", "fullSize": 184320, "thumbSize": 21504, "width": 1600, "height": 1200 }

// 201
{
  "id": "b3e1…",
  "full":  { "url": "<PUT firmado>", "headers": { "Content-Type": "image/webp" } },
  "thumb": { "url": "<PUT firmado>", "headers": { "Content-Type": "image/webp" } },
  "previewUrl": "<PUBLIC_ASSETS_URL>/tmp/b3e1…/thumb"
}
```

- `contentType` debe ser `image/webp` o `image/jpeg`. Límites: `fullSize` ≤ 1,5 MB, `thumbSize` ≤ 200 KB, y `width`/`height` entre 1 y 4096.
- Límite de **30 subidas por hora por usuario**, contadas en `uploads` con el mismo patrón de `assertUnderConversationLimit` (`429 TOO_MANY_UPLOADS`).
- `previewUrl` permite mostrar la foto aunque se recargue la página antes de guardar (borradores en `localStorage`). Funciona mientras exista `tmp/`, es decir, 24 h.

**`POST /gardens` y `PATCH /gardens/:id`**: `ProductInputDto` agrega:

```ts
@IsOmittable() @IsArray() @ArrayMaxSize(3)
@ValidateNested({ each: true }) @Type(() => ProductImageInputDto)
images?: ProductImageInputDto[]   // { id: UUID }
```

Al guardar, en `GardensService`:

1. Junta los `imageId` del body y verifica que no haya repetidos en toda la huerta (`400 DUPLICATE_IMAGE`).
2. Para cada `imageId` que **no** estaba en la huerta:
   - Debe existir en `uploads` con `userId` igual al usuario (si no, `400 INVALID_IMAGE`).
   - Hace `head` de `tmp/{id}/full` y `tmp/{id}/thumb`. Si falta alguno, `400 IMAGE_NOT_UPLOADED`.
   - Copia ambos a `gardens/{gardenId}/{id}/…`. En `create`, el `_id` de la huerta se genera antes con `new Types.ObjectId()`.
   - Toma `width` y `height` del registro de `uploads`.
3. Para las fotos que ya estaban, conserva sus `width` y `height` guardados. El cliente solo manda el `id`.
4. Guarda la huerta.
5. Borra de `uploads` los registros confirmados y, **después de guardar**, borra del bucket las fotos que estaban antes y ya no están. Esto último es "best effort": si falla, se registra en el log y no se le devuelve error al usuario.

**`DELETE /gardens/:id`**: además de lo actual, `deletePrefix("gardens/{id}/")` (best effort).

### 4.5 Respuesta

`mapEntityToDto` agrega a cada producto:

```jsonc
"images": [
  { "id": "b3e1…", "url": "<PUBLIC>/gardens/<g>/b3e1…/full", "thumbUrl": "<PUBLIC>/gardens/<g>/b3e1…/thumb", "width": 1600, "height": 1200 }
]
```

Las URLs las arma el backend con `PUBLIC_ASSETS_URL`, así que cambiar de dominio o de proveedor no requiere tocar la web ni migrar datos.

### 4.6 Códigos de error nuevos (`src/common/errors.ts`)

`IMAGES_DISABLED`, `TOO_MANY_UPLOADS`, `INVALID_IMAGE`, `IMAGE_NOT_UPLOADED` y `DUPLICATE_IMAGE`.

---

## 5. Frontend (`shareyourgarden-web`)

### 5.1 Procesamiento en el navegador (`lib/image-processing.ts`)

Es una función pura, sin UI: `processImage(file)` devuelve `{ full, thumb, width, height, contentType }`.

1. `createImageBitmap(file, { imageOrientation: "from-image" })`: decodifica y aplica la rotación EXIF. Si falla, es el error de "formato no compatible".
2. **`full`**: el lado mayor queda en 1600 px como máximo (sin agrandar fotos chicas). Se dibuja en un canvas y se exporta con `toBlob("image/webp", 0.8)`.
3. **`thumb`**: recorte cuadrado al centro de 320 px (cubre 64–160 px de pantalla a 2x), con calidad 0,75.
4. Si `blob.type` no es `image/webp` (algunos Safari no codifican WebP), se repite con `image/jpeg` y calidad 0,82.
5. **Al volver a codificar desde el canvas se descartan todos los metadatos**, incluido el GPS. Esta es la garantía de privacidad. Nunca se sube el archivo original.

Si el procesamiento en el hilo principal se nota en teléfonos lentos, más adelante se puede mover a un Web Worker con `OffscreenCanvas`. No hace falta para empezar.

### 5.2 Datos (`lib/types.ts`, `lib/uploads.ts`)

```ts
export interface ProductImage {
  id: string
  url: string
  thumbUrl: string
  width: number
  height: number
}
// Product gana `images: ProductImage[]` (y `toGarden` lo normaliza a []).
// GardenInput envía `images: { id: string }[]` por producto.
```

`lib/uploads.ts` expone `uploadImage(file, signal)`: procesa la foto, llama a `POST /uploads/images` y hace los dos `PUT` en paralelo con `fetch` directo a R2, sin el header `Authorization`. Devuelve `{ id, previewUrl, width, height }`. Acepta un `AbortSignal` para cancelar si se quita la foto mientras sube.

### 5.3 Componentes nuevos (`components/gardens/`)

| Archivo | Responsabilidad |
| --- | --- |
| `product-images-field.tsx` | `AttachmentGroup` con un `Attachment` por foto más la casilla para agregar. Input oculto, drag & drop sobre la fila del producto, acciones, menú `⋯`, mapeo del estado de cada subida a la prop `state`, región `aria-live` y toasts. Recibe `images` y `onChange` del `ProductRow`. |
| `use-image-uploads.ts` | Cola de subidas por formulario. Limita a 2 subidas simultáneas, cancela con `AbortController` al quitar una foto y libera los `ObjectURL` al desmontar. Expone `pendingCount` y `errorCount` para el botón "Guardar". |
| `product-thumbnail.tsx` | Portada o ícono del tipo con fondo `bg-muted`. Maneja `onError`. Se usa en el drawer y, más adelante, en el compositor rápido. |
| `product-gallery.tsx` | `Dialog` + `Carousel` con contador, pie de foto y foco de vuelta a la miniatura de origen. |

### 5.4 Cambios en componentes existentes

- **`components/gardens/garden-form.tsx`**:
  - `ProductDraft` gana `images: DraftImage[]`, con `{ localId, id?, url, status: "processing" | "uploading" | "done" | "error", error? }`. `status` usa los mismos valores que la prop `state` de `Attachment`, así que se pasa directo.
  - `toDraft` carga las fotos existentes como `done`, con `url = thumbUrl`.
  - `toInput` envía solo los `id` de las fotos `done`. `validate` agrega el error `imagesPending` si hay fotos subiendo o con error.
  - `snapshot` incluye los `id` en orden, así agregar, quitar o cambiar la portada cuenta como cambio.
  - El botón "Guardar" muestra "Subiendo fotos…" mientras `pendingCount > 0`.
  - `ProductRow` renderiza `ProductImagesField` en una fila completa (`col-span-full`) bajo los campos.
- **`lib/garden-drafts.ts`**: el borrador guarda solo fotos `done` (con `id` y `previewUrl`). Si al restaurarlo la vista previa ya no carga (pasaron más de 24 h), la foto se quita del borrador y se avisa con el mensaje `restoredImagesExpired`.
- **`lib/products.ts`**: mover ahí `TYPE_ICONS` desde `garden-form.tsx` para compartirlo con `ProductThumbnail`.
- **`components/map/garden-drawer.tsx`**: reemplazar la `Table` de productos por la lista de `Item` con `ProductThumbnail`, y abrir `ProductGallery` al tocar una miniatura.
- **ESLint**: la regla `@next/next/no-img-element` se desactiva por línea, con un comentario que explica que el sitio es estático y las imágenes ya vienen optimizadas.
- **`messages/es.json` y `messages/en.json`**:
  - `GardenForm.photos.*`: título, ayuda, contador, portada, quitar, reintentar, subiendo, estados y errores de la tabla 1.3.
  - El namespace `ProductGallery`.
  - Ejecutar `pnpm check:messages`.

---

## 6. Fases

0. **Infraestructura** (a mano, en Cloudflare): token ✅. Faltan CORS, regla de `tmp/`, acceso público, alertas de facturación y bucket de desarrollo.
1. **Backend**:
   - `StorageService`, `POST /uploads/images` y la colección `uploads`.
   - `images` en `Product`, con copia, validación y limpieza en `create`, `update` y `remove`.
   - Tests unitarios y e2e con el storage simulado.
   - Variables en Render.
2. **Web: subir fotos**: agregar `attachment`; `image-processing`, `uploads`, `ProductImagesField`, `use-image-uploads` y la integración en `GardenForm` y en los borradores.
3. **Web: ver fotos**: `ProductThumbnail`, la lista de productos en el drawer y `ProductGallery` (requiere agregar `dialog` y `carousel`).
4. **Más adelante (fuera del alcance)**:
   - Miniaturas en los chips del compositor rápido de mensajes.
   - Una foto de portada de la huerta en el encabezado del drawer.
   - Botón "Reportar foto" y una herramienta de moderación para borrar fotos.
   - Procesamiento en un Web Worker.
   - Formato AVIF.

## 7. Verificación

- **Backend**: `yarn test` y `yarn test:e2e`. Casos clave:
  - No se puede usar un `imageId` subido por otro usuario.
  - Una foto declarada pero no subida devuelve `IMAGE_NOT_UPLOADED`.
  - Más de 3 fotos en un producto se rechaza.
  - Quitar una foto o un producto borra sus objetos; borrar la huerta borra su prefijo.
  - Sin variables `S3_*`, la app arranca y `POST /uploads/images` devuelve `503`.
  - Se aplica el límite de 30 subidas por hora.
- **Web**: `pnpm lint`, `pnpm typecheck`, `pnpm check:messages` y `pnpm build` (export estático).
- **Manual**:
  - Foto de iPhone y de Android con GPS: descargar la versión subida y comprobar con `exiftool` que no tiene metadatos.
  - Foto vertical con rotación EXIF: se ve derecha.
  - Panorámica de 12000 px: queda en 1600 px y pesa menos de 400 KB.
  - Elegir 5 fotos con 3 cupos: se agregan las que caben y aparece el toast.
  - Cortar la red mientras sube: error, "Reintentar" y luego éxito.
  - Recargar la página con fotos sin guardar: el borrador las restaura.
  - Quitar una foto, guardar y comprobar en el panel de R2 que el objeto ya no está.
  - Galería en móvil (swipe), en escritorio (flechas y Esc) y en modo oscuro.
  - Lector de pantalla: el anuncio de "Foto agregada" y la etiqueta de la casilla vacía.
