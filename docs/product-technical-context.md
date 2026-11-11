# ShareYourGarden Web: contexto técnico del producto

Este documento describe lo que hace la aplicación web **hoy**, según el código de este repositorio (rama `master`, hasta el PR #50). No incluye planes ni ideas. Lo que sale de los documentos de `docs/plans/` solo se menciona cuando el código lo confirma.

El backend vive en otro repositorio y **no se revisó para este documento**. Lo que se dice de él sale de cómo lo llama el frontend (`lib/*.ts`).

## 1. Qué es

Una aplicación para compartir lo que produce un huerto con gente cercana. Una persona publica su huerto en un mapa, indica qué productos tiene disponibles (verduras, frutas, hierbas, flores, semillas, almácigos, insumos) y quien lo encuentra puede escribirle al dueño desde la propia aplicación.

El texto de la app lo define así (`messages/es.json`, `Metadata.description`): «Comparte lo que crece en tu huerto y encuentra huertos cerca de ti.»

Idiomas: español (por defecto) e inglés.

## 2. Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16.4.3 (App Router), React 19.3, TypeScript |
| Salida | **Export estático** (`output: "export"` en `next.config.ts`), servido como archivos por Netlify. `trailingSlash: true` |
| Estilos y UI | Tailwind CSS 4, shadcn/ui sobre Base UI (`@base-ui/react`), `lucide-react`, `sonner` (toasts), `embla-carousel-react` |
| Mapa | MapLibre GL 6 con teselas vectoriales de OpenFreeMap, `supercluster` para agrupar marcadores |
| i18n | `next-intl` 4 |
| Tema | `next-themes` (claro, oscuro, sistema) |
| Fuentes | Inter (texto), Bricolage Grotesque (títulos y wordmark), Geist Mono |
| Autenticación | Google Identity Services en el cliente; el backend devuelve su propio JWT |
| Geocodificación | Photon (komoot), llamada directa desde el navegador |
| Gestor de paquetes | pnpm 12.4.1, Node 22 (`.nvmrc`) |

El proyecto trae un aviso en `AGENTS.md`: esta versión de Next.js tiene cambios incompatibles respecto a lo conocido, y la documentación está en `node_modules/next/dist/docs/`.

## 3. Arquitectura general

### 3.1 No hay servidor Next.js

Todo es estático. Consecuencias que se ven en el código:

- **No hay rutas dinámicas.** El id de un huerto o de una conversación viaja en el query string: `/gardens/edit/?id=…`, `/messages/?c=…`, `/map/?garden=…&lat=…&lng=…`. Cada página que lee `useSearchParams` va dentro de un `<Suspense>`.
- **No hay middleware ni cookies propias.** La sesión es un token en `localStorage`.
- **El idioma está en la URL** (`/es/map/`, `/en/map/`). Se genera un HTML por idioma con `generateStaticParams`.
- Lo único «de servidor» es una **Edge Function de Netlify** (`netlify/edge-functions/geo.ts`, en `/api/geo`).

### 3.2 Rutas

| Ruta | Archivo | Acceso | Qué hace |
| --- | --- | --- | --- |
| `/` | `app/(locale-redirect)/page.tsx` | Público | Script en el cliente que elige el idioma y redirige a `/{locale}/map/`. Mantiene path, query y hash |
| `/{locale}/map/` | `app/[locale]/map/page.tsx` | Público | Mapa con todos los huertos activos. Es la pantalla principal |
| `/{locale}/gardens/new/` | `…/gardens/new/page.tsx` | Con sesión | Crear un huerto |
| `/{locale}/gardens/edit/?id=` | `…/gardens/edit/page.tsx` | Con sesión | Editar o eliminar un huerto propio |
| `/{locale}/messages/` | `…/messages/page.tsx` | Con sesión | Bandeja y conversaciones |
| `/{locale}/offline/` | `…/offline/page.tsx` | Público | Página sin conexión |
| `/{locale}/404/` | `…/404/page.tsx` | Público | Página 404 por idioma |

**No existe una landing.** La raíz redirige directamente al mapa. El mapa es la pantalla de entrada para visitantes anónimos y para usuarios con sesión.

`public/_redirects` (Netlify):

- `/es/*` y `/en/*` que no existan sirven `/{locale}/404/` con estado 404.
- Cualquier otra ruta sin idioma (por ejemplo enlaces antiguos como `/map/`) sirve `/index.html` con estado 200, que elige idioma y redirige conservando la ruta.

### 3.3 Árbol de proveedores

`app/[locale]/layout.tsx` anida, de fuera hacia dentro:

`NextIntlClientProvider` → `ThemeProvider` → `AuthProvider` → `MyGardensProvider` → `MessagesProvider` → `TooltipProvider` → `WelcomeTourProvider` → `AppShell`.

Fuera de `AppShell` y dentro de los proveedores: `Toaster` (sonner, arriba al centro), `InstallPrompt` y `ServiceWorker`.

`AppShell` (`components/app-shell.tsx`) pinta un `SidebarProvider` con `AppHeader` y el contenido. La **barra lateral solo existe para usuarios autenticados**; el árbol de React no cambia al iniciar o cerrar sesión, así que el mapa no se vuelve a montar.

### 3.4 Variables de entorno

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL del backend. Por defecto `http://localhost:1337`. En Netlify: `https://shareyourgarden-backend.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID OAuth web de Google. Debe coincidir con `GOOGLE_CLIENT_ID` del backend |
| `NEXT_PUBLIC_DEV_CENTER` | Opcional, solo desarrollo: `"lat,lng"` donde abre el mapa en lugar de `/api/geo` |
| `URL` | Lo define Netlify en el build; se usa como `metadataBase` |

## 4. Funcionalidades

### 4.1 Mapa (`components/map/`)

Es el núcleo del producto y funciona **sin iniciar sesión**.

**Carga de huertos.** `GardenMap` pide al backend los huertos dentro del área visible: `GET /gardens?polygon=<GeoJSON del bounds>&where=<texto>`. Se vuelve a pedir cuando cambia el área, el texto de búsqueda o la lista de huertos propios. Las peticiones usan `AbortController`.

**Búsqueda y filtros** (`MapSearch`, flotando sobre el mapa):

- Campo de texto. Se envía al backend como `where`. El atajo `/` enfoca el campo en escritorio; `Esc` lo limpia.
- Filtro por tipo de producto (`ToggleGroup`). **El backend busca solo por texto; el tipo se filtra en el cliente** sobre lo que devolvió (comentario en `garden-map.tsx`).
- Si el resultado filtrado queda vacío se muestra `MapEmptyState`.

**Marcadores.**

- Se agrupan con `supercluster`. Radio de 60 px para pines y 110 px para «chips».
- Hasta el zoom 14 se ven pines; desde el zoom 14 pasan a chips con el nombre del huerto y la cantidad de productos.
- Si un grupo no se puede separar acercando el zoom (zoom máximo 15), se despliega en abanico («spider») alrededor del grupo.
- El ícono depende del tipo de producto: el tipo filtrado, o el primer producto del huerto. Los huertos propios y el seleccionado tienen estilo distinto.
- Los marcadores son accesibles por teclado (`role="button"`, Enter y Espacio).

**Vista inicial.** Varias fuentes pueden posicionar el mapa y solo mueve la vista una más precisa que la actual, y solo si el usuario no tocó el mapa (`initial-view.ts`). De menor a mayor precisión:

1. Mundo entero (zoom 1), si no se sabe nada.
2. **Aproximada** por IP: `GET /api/geo` (Edge Function de Netlify, que lee `context.geo`; no se envía a terceros ni se guarda). Zoom 11. En local no existe, salvo `NEXT_PUBLIC_DEV_CENTER` o `netlify dev`.
3. **Primer huerto propio** del usuario (zoom 13).
4. **Última vista guardada** en `localStorage` (`map-view`); solo se guarda si el zoom es 8 o más.
5. **Geolocalización del navegador**.
6. **Huerto enlazado** desde otra pantalla (`?garden=&lat=&lng=`), que además abre su ficha.

**Otros detalles.** Inclinación (pitch) de 30° para ver edificios en 3D; rotación desactivada; botón de «ubicarme»; estilo claro u oscuro según el tema, con la paleta recoloreada para que los parques compartan el verde del producto (`map-style.ts`). `worker.ts` registra la URL del worker de MapLibre, que el bundler no detecta solo.

El mapa se carga con `dynamic(..., { ssr: false })`. La barra de búsqueda está fuera del mapa para que aparezca en el HTML prerenderizado antes de que cargue MapLibre.

### 4.2 Ficha del huerto (`GardenDrawer`)

Al tocar un marcador se abre un `Drawer`:

- **Móvil:** hoja inferior modal, se cierra deslizando.
- **Escritorio:** panel lateral flotante **no modal** que deja usar el mapa y cambiar de marcador sin cerrarlo.

Contenido: nombre, descripción, dueño (avatar y nombre), «actualizado hace…» (hora relativa, se refresca cada minuto) y la lista de productos con tipo y cantidad. Los productos agotados (cantidad 0) van al final. Si un producto tiene fotos, toda la fila abre una galería (`ProductGallery`, con carrusel). Al pie, fijo, está el bloque de contacto.

### 4.3 Contactar al dueño (`components/messages/contact-garden.tsx`)

El pie de la ficha muestra uno de varios paneles según el caso:

- **Sin sesión:** invitación a iniciar sesión con el botón de Google.
- **Con sesión:** compositor para escribir el primer mensaje (máximo 2000 caracteres; el contador solo aparece cerca del límite). Se puede elegir como interés uno de los productos del huerto, mostrados como chips (`productName`, opcional).
- **Ya existe una conversación** sobre ese huerto: se ofrece abrirla. Se busca con `GET /conversations?role=sent&gardenId=…&limit=1`.

Enviar llama a `POST /conversations` con `{ gardenId, body, productName? }`. El backend reutiliza la conversación si el usuario ya había escrito sobre ese huerto.

### 4.4 Crear y editar huertos (`components/gardens/`)

Un huerto tiene: nombre (máx. 80), descripción (máx. 500), estado `active` (si es `false` no aparece en el mapa público y solo lo ve su dueño), ubicación (punto GeoJSON) y hasta 50 productos.

**Un producto** tiene nombre (máx. 60), tipo, cantidad (≥ 0), unidad y hasta 3 fotos.

- Tipos: `vegetable`, `fruit`, `herb`, `flower`, `seed`, `seedbed`, `supply`.
- Unidades: `unit`, `kg`, `g`, `bunch`, `l`.
- Viajan y se guardan como **códigos estables**; las etiquetas se traducen en la interfaz. Valores desconocidos (huertos antiguos) se muestran tal cual. El backend valida las mismas listas.

**Formulario** (`garden-form.tsx`, `sections.tsx`): tres secciones, `info`, `location` y `products`.

- En escritorio es una sola página.
- En móvil, al **crear** se llena por pasos y al **editar** se abre una sección a la vez. La sección activa va en `?section=` (`use-section-param.ts`).
- La validación (`draft.ts`) devuelve códigos de error que se traducen al mostrarlos. Cada paso solo muestra los errores de sus propias secciones.

**Ubicación** (`location-picker.tsx`, `address-search.tsx`): se elige haciendo clic en el mapa, buscando una dirección (Photon), arrastrando el marcador o usando la geolocalización. Un clic en un mapa muy alejado hace zoom en vez de fijar el punto. El nombre del lugar se obtiene con geocodificación inversa (`use-place-name.ts`).

**Borradores.** Los cambios sin guardar se mantienen en `sessionStorage` (`syg.gardenDraft.<id|new>`), por pestaña. Cada borrador guarda sobre qué versión del huerto se hizo (`base`); si el huerto cambió, el borrador se descarta. Así se puede salir a mirar el mapa y volver sin perder lo escrito.

**Fotos de productos** (`lib/image-processing.ts`, `lib/uploads.ts`, `use-image-uploads.ts`):

1. En el navegador se reduce la imagen: versión completa de hasta 1600 px de lado (máx. ~1,5 MB) y miniatura cuadrada de 320 px (máx. ~200 KB). Prefiere WebP y cae a JPEG. El original puede pesar hasta 25 MB.
2. `POST /uploads/images` reserva un id y devuelve URLs firmadas para la imagen completa y la miniatura.
3. El navegador sube ambos archivos con `PUT` directo al almacenamiento, sin cabecera `Authorization` (la firma de la URL es la credencial). **Los bytes nunca pasan por el backend.**
4. La subida empieza al elegir la foto, no al guardar. Guardar se bloquea mientras haya fotos pendientes (`imagesPending`).
5. Las fotos se envían al guardar el huerto por **id**.

Errores de foto: `unreadable`, `tooLarge`, `tooMany` (código `TOO_MANY_UPLOADS`), `disabled` (código `IMAGES_DISABLED`) y `failed`. Los tres primeros salvo `tooMany` son finales y no se reintentan.

**Estado compartido.** `MyGardensProvider` guarda los huertos del usuario (`GET /gardens/mine`) y expone `create`, `update` y `remove`. Así la barra lateral, el formulario y el mapa se actualizan sin volver a pedir datos. La actualización pone el huerto editado al principio de la lista.

**Eliminar:** `DeleteGardenDialog` → `DELETE /gardens/:id`. Las conversaciones del huerto quedan en solo lectura con la razón `garden-deleted`.

### 4.5 Mensajería (`components/messages/`, `lib/conversations.ts`)

**Modelo.** Una conversación es única por huerto e interesado. Cada usuario la ve desde su rol: `owner` (es dueño del huerto) o `requester` (escribió a un huerto ajeno).

**Bandeja** (`MessagesView`). Estado en la URL:

- `?c=<id>` conversación abierta.
- `?role=received|sent` filtro (`all` es el valor por defecto y no aparece).
- `?garden=<id>` filtra por uno de mis huertos; solo se aplica con `role=received`.

En escritorio hay dos paneles (lista y conversación). En móvil se muestra uno a la vez, según `?c=`.

**Conversación** (`ConversationThread`):

- Mensajes agrupados por autor y por día, con paginación hacia atrás (`before`).
- **Polling** de mensajes nuevos (`after`) con backoff entre 4 s y 15 s. Solo corre con la pestaña visible (`usePageVisible`).
- **Envío optimista:** el mensaje aparece de inmediato; si falla queda marcado «no se envió» con opción de reintentar (con clave estable para no duplicar).
- Marca como leída (`POST /conversations/:id/read`) cuando el último mensaje del otro llega a estar visible en pantalla.
- Indicador de lectura del otro usuario (`otherLastReadAt`).
- Límite de 2000 caracteres por mensaje.

**Bloqueo** (`conversation-safety.tsx`): `POST` / `DELETE /conversations/:id/block`. El bloqueo es entre personas y aplica a todas sus conversaciones. El hilo queda en solo lectura (`readOnly: "blocked"`); la API no revela quién bloqueó, pero `blockedByMe` permite ofrecer desbloquear.

**No leídos** (`MessagesProvider`):

- `GET /conversations/summary` devuelve `{ unread, byGarden }`.
- Se consulta cada 30 s, o cada 120 s si las notificaciones push están activas. Se pausa con la pestaña oculta.
- Se refleja en: la barra lateral y el encabezado, el título de la pestaña (`(3) ShareYourGarden`) y la insignia del ícono de la app instalada (`navigator.setAppBadge`).

### 4.6 Notificaciones push (`lib/push.ts`, `hooks/use-push.ts`, `public/sw.js`)

- Web Push con clave VAPID: `GET /push/public-key` (un 503 significa que el backend no tiene push configurado).
- Suscribir: `POST /push/subscriptions` con `{ endpoint, keys, locale }`. Desactivar: `DELETE /push/subscriptions`.
- Estados: `unavailable`, `unsupported`, `ios-install` (iOS solo permite push en la app instalada), `denied`, `off`, `on`.
- Se pide permiso solo desde un clic del usuario. Al cerrar sesión se elimina la suscripción del navegador (`disablePush`) para que no lleguen mensajes al usuario anterior. Tras iniciar sesión o cambiar de idioma se sincroniza (`syncPushSubscription`).
- La carga útil del push **no incluye el texto del mensaje**, solo quién escribió y sobre qué huerto. El service worker construye el título en el idioma del usuario y lleva a `/{locale}/messages/?c=<id>`.
- No muestra notificación si la persona ya está leyendo esa conversación, salvo en Safari/Apple, que deja de entregar pushes que no muestran nada.
- Se gestiona desde el menú de usuario (`PushMenu`).

### 4.7 Autenticación (`components/auth-provider.tsx`, `lib/auth.ts`)

1. El botón de Google (`GoogleSignInButton`) obtiene un ID token (`credential`).
2. `POST /auth/google` con `{ credential }` devuelve `{ accessToken, user }`.
3. El token se guarda en `localStorage` (`syg.accessToken`) y se envía como `Authorization: Bearer …` en cada petición (`lib/api.ts`).
4. Al cargar, si hay token se llama `GET /auth/me`. Un 401 borra el token.
5. Cerrar sesión: elimina la suscripción push, borra el token, llama `disableAutoSelect` de Google y limpia los datos del usuario.

El frontend solo usa Google como proveedor. No hay registro por correo.

Usuario (`User`): `id`, `email`, `name?`, `picture?`, `onboardingCompletedAt?`.

### 4.8 Onboarding (`components/onboarding/`)

Un tour de bienvenida en cinco pasos: `welcome`, `map`, `exchange`, `messages`, `share`. Aparece a las cuentas nuevas. Se marca como visto con `PATCH /users/me` `{ onboardingCompleted: true }`; el servidor pone la fecha. Se puede volver a ver desde el menú de usuario (pasa `false`). En táctil se cambia de paso deslizando (50 px). Incluye un correo de contacto para comentarios, escrito directamente en el código.

### 4.9 PWA y modo sin conexión

- `app/manifest.ts` genera un único manifiesto: `display: standalone`, `start_url: "/"`, íconos de 192 y 512 px y uno maskable. El nombre y la descripción vienen del idioma por defecto.
- `public/sw.js` (se registra solo en producción desde `ServiceWorker`):
  - **Páginas:** red primero; sin conexión, la última copia vista o la página offline del idioma.
  - **`/_next/static/`:** caché primero (los nombres cambian con el contenido). Se conservan como máximo 300 entradas.
  - **Otros archivos** (íconos, manifiesto): caché con revalidación en segundo plano.
  - **No intercepta** peticiones a otros orígenes (API, teselas, Google), `?_rsc=` ni `/api/`.
  - Al instalarse precachea `/`, las páginas offline y sus scripts.
  - Cambiar `VERSION` borra todas las cachés en la siguiente visita.
- `InstallPrompt` ofrece instalar la app (evento `beforeinstallprompt`; en iOS muestra instrucciones). Si se descarta, no vuelve a aparecer durante un tiempo (`install-prompt-dismissed` en `localStorage`).
- Netlify sirve `/sw.js` con `Cache-Control: no-cache`.

### 4.10 Internacionalización

- Idiomas: `es` (por defecto) y `en`; `localePrefix: "always"`.
- Mensajes en `messages/es.json` y `messages/en.json`, formato ICU.
- El idioma de un visitante se decide **en el navegador**: preferencia guardada (`locale-preference`), luego idiomas del navegador, luego el idioma por defecto.
- `pnpm check:messages` (`scripts/check-messages.mjs`, ejecutado en CI) exige que todo catálogo tenga las mismas claves que el español, sin mensajes vacíos y con los mismos argumentos ICU y etiquetas.
- Las rutas usan los helpers de `i18n/navigation.ts`; `i18n/metadata.ts` genera los `alternates` (hreflang).

### 4.11 Navegación y tema

- **Encabezado** (`AppHeader`): ruta de migas, botón «Comparte tu huerto» (lleva a la creación) y contador de no leídos.
- **Barra lateral** (solo con sesión): enlaces «Mapa» y «Mensajes», lista «Mis huertos» (`NavGardens`) y el menú de usuario. Cada huerto de la lista abre su edición y tiene un menú con: editar productos (`?section=products`), verlo en el mapa (`gardenMapHref`) y ver sus mensajes recibidos (`/messages/?role=received&garden=<id>`), con indicador de no leídos por huerto.
- **Menú de usuario** (`NavUser`): tour de bienvenida, notificaciones, idioma, aspecto claro u oscuro y cerrar sesión.
- Tema claro, oscuro o del sistema. Los colores de marca son variables `--brand` / `--brand-foreground` en `app/globals.css`.

## 5. Contrato con el backend (visto desde el cliente)

Todas las llamadas pasan por `lib/api.ts` (`apiGet`, `apiPost`, `apiPatch`, `apiDelete`). Los errores son `ApiError` con `status` y un `code` opcional del cuerpo JSON (por ejemplo `GARDEN_NOT_FOUND`, `TOO_MANY_UPLOADS`, `IMAGES_DISABLED`). Una respuesta 204 devuelve `undefined`.

| Método y ruta | Uso |
| --- | --- |
| `POST /auth/google` | Intercambia el ID token de Google por un JWT |
| `GET /auth/me` | Restaura la sesión |
| `PATCH /users/me` | Marca el tour de bienvenida como visto o no |
| `GET /gardens?polygon=&where=` | Huertos dentro del área, con búsqueda de texto |
| `GET /gardens/mine` | Huertos del usuario |
| `GET /gardens/:id` | Un huerto |
| `POST /gardens` | Crear |
| `PATCH /gardens/:id` | Actualizar (parcial) |
| `DELETE /gardens/:id` | Eliminar |
| `POST /uploads/images` | Reserva un id y devuelve URLs firmadas de subida |
| `POST /conversations` | Empieza una conversación o reutiliza la existente |
| `GET /conversations?role=&gardenId=&before=&limit=` | Lista paginada (`{ conversations, hasMore }`) |
| `GET /conversations/summary` | `{ unread, byGarden }` |
| `GET /conversations/:id` | Una conversación |
| `GET /conversations/:id/messages?before=&after=&limit=` | Mensajes (`{ messages, hasMore }`, del más antiguo al más nuevo) |
| `POST /conversations/:id/messages` | Enviar un mensaje `{ body }` |
| `POST /conversations/:id/read` | Marcar como leída |
| `POST` / `DELETE /conversations/:id/block` | Bloquear o desbloquear |
| `GET /push/public-key` | Clave VAPID (503 si no hay push) |
| `POST` / `DELETE /push/subscriptions` | Alta y baja de la suscripción |

Las respuestas se normalizan con `toGarden`, `toConversation` y `toMessage` (`lib/types.ts`), que rellenan valores por defecto para tolerar campos ausentes.

**Privacidad de datos visible en el código:** `Person.email` solo llega al dueño del huerto (comentario en `lib/types.ts`). La API de conversaciones no expone quién bloqueó.

### Servicios externos que llama el navegador directamente

- **OpenFreeMap** (`tiles.openfreemap.org`): estilo y teselas del mapa.
- **Photon** (`photon.komoot.io`): búsqueda de direcciones y geocodificación inversa. Es una instancia pública sin clave; el código indica cambiar la URL para autoalojarla. Solo traduce nombres a `en`, `de` y `fr`; para otros idiomas (incluido el español) pide los nombres locales de OpenStreetMap.
- **Google Identity Services**: botón e ID token.
- **Almacenamiento de imágenes**: URLs firmadas que entrega el backend.

## 6. Modelo de datos del cliente (`lib/types.ts`)

```ts
Garden {
  id, name, description,
  active: boolean            // false: solo lo ve su dueño
  location: { type: "Point", coordinates: [lng, lat] }
  products: Product[]
  owner: { name, email?, picture? }
  ownerId?, updatedAt?
}
Product { name, type, quantity, unit?, images: ProductImage[] }   // images[0] es la portada
ProductImage { id, url, thumbUrl, width, height }

Conversation {
  id, gardenId, gardenName, productName?,
  role: "owner" | "requester",
  otherUser: { id, name, picture? },
  lastMessage: { body, senderId, createdAt } | null,
  unreadCount, otherLastReadAt,
  readOnly: "blocked" | "garden-deleted" | null,
  blockedByMe, createdAt, updatedAt
}
Message { id, conversationId, senderId, body, createdAt }
```

Las coordenadas siguen la convención GeoJSON `[lng, lat]`, al revés de lo habitual en la interfaz. `Place.coordinates` (Photon) también.

## 7. Datos guardados en el navegador

| Clave | Almacenamiento | Contenido |
| --- | --- | --- |
| `syg.accessToken` | `localStorage` | JWT de la sesión |
| `locale-preference` | `localStorage` | Idioma elegido explícitamente |
| `map-view` | `localStorage` | Última vista del mapa (centro y zoom) |
| `install-prompt-dismissed` | `localStorage` | Fecha en que se descartó el aviso de instalación |
| `syg.gardenDraft.<id\|new>` | `sessionStorage` | Borrador del formulario de huerto |
| Caché `pages-v1`, `assets-v1` | Cache Storage | Páginas y archivos estáticos del service worker |

Todos los accesos van en `try/catch`: la app funciona (sin persistir) si el almacenamiento está bloqueado, por ejemplo en modo privado.

## 8. Estructura del repositorio

```
app/                    Rutas (App Router), manifiesto, estilos globales
  (locale-redirect)/    Raíz "/" que elige idioma y redirige
  [locale]/             map, gardens/new, gardens/edit, messages, offline, 404
components/
  ui/                   Componentes shadcn (Base UI)
  map/                  Mapa, marcadores, búsqueda, ficha, selector de ubicación
  gardens/              Formulario, fotos, diálogo de eliminar
  messages/             Bandeja, conversación, bloqueo, push
  onboarding/           Tour de bienvenida
  *.tsx                 Shell, encabezado, barra lateral, proveedores
hooks/                  use-mobile, use-page-visible, use-push
i18n/                   routing, navigation, request, metadata, preferencia de idioma
lib/                    Cliente de API y funciones por recurso, tipos, geocodificación, imágenes
messages/               es.json, en.json
netlify/edge-functions/ geo.ts
public/                 sw.js, _redirects, íconos
scripts/                check-messages.mjs, generate-icons.sh
docs/plans/             Planes de diseño (ver aviso abajo)
```

## 9. Desarrollo, CI y despliegue

```bash
pnpm install
cp .env.example .env.local
pnpm dev          # http://localhost:3000
pnpm lint
pnpm typecheck    # next typegen && tsc --noEmit
pnpm check:messages
pnpm build        # genera out/
```

- **CI** (`.github/workflows/main.yml`) en push y PR a `master`: `lint`, `typecheck`, `check:messages` y `build`.
- **Despliegue:** Netlify construye con `pnpm build` y publica `out/`. Netlify también ejecuta la Edge Function. Con `pnpm dev` no existe `/api/geo`; usar `netlify dev` o `NEXT_PUBLIC_DEV_CENTER`.
- El service worker solo se registra en producción: en `pnpm dev` no hay caché que oculte cambios, y por eso las notificaciones push tampoco funcionan en desarrollo (`pushSupported()` exige `NODE_ENV === "production"`).
- El backend está en Render (plan gratuito, según los planes): el primer request tras un periodo de inactividad puede tardar varios segundos.

### Convenciones del proyecto (`AGENTS.md`)

- Commits y títulos de PR en Conventional Commits (`type(scope): summary`), con squash merge. Las ramas empiezan con el tipo: `feat/…`, `fix/…`, `style/…`.
- UI: usar primero los componentes de `components/ui/` (`Item`, `Badge`, `Alert`, `Empty`), añadir faltantes con el CLI de shadcn, usar tokens semánticos (`text-muted-foreground`, `bg-brand`) y no usar colores crudos ni `dark:`.

## 10. Notas y puntos a tener en cuenta

- **`docs/plans/` es histórico.** Son planes de diseño escritos antes de implementar; pueden no coincidir con el código actual (por ejemplo, el plan de mensajería habla de pestañas «Productos» y «Dueño» en la ficha, que el código actual ya no tiene). Ante una diferencia, manda el código.
- **El filtro por tipo de producto es solo del cliente.** Si el área tiene muchos huertos, el backend los devuelve todos y el cliente descarta los que no coinciden.
- **El polling es la base de la mensajería.** No hay WebSockets ni SSE; push mejora la latencia con la pestaña cerrada y reduce la frecuencia del polling del resumen.
- **La identidad depende de Google.** No hay otro método de acceso.
- **Sin landing.** Un visitante nuevo llega directo al mapa. La única explicación del producto para visitantes anónimos es el propio mapa; el tour de bienvenida solo se muestra a cuentas con sesión.
- **Hay un correo personal en el código** (`FEEDBACK_EMAIL` en `components/onboarding/welcome-tour.tsx`) para recibir comentarios del tour.
- **Foto y nombre de Google** del dueño se muestran en la ficha pública (`picture`, con `referrerPolicy="no-referrer"`).
- No se revisó: el repositorio del backend, las reglas de validación reales de la API, los límites de tasa ni la configuración del almacenamiento de imágenes.
