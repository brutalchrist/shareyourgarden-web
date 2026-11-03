# Plan: mensajería para intercambios entre huertas

## Contexto

- **Web**: Next.js 16 con `output: "export"` (estático en Netlify). No hay rutas dinámicas en el servidor: las páginas con estado usan query params (como `/gardens/edit?id=`). La barra lateral (`AppSidebar`) solo se muestra a usuarios autenticados. `GardenDrawer` es un bottom sheet en móvil y un panel lateral no modal en escritorio, con las pestañas "Productos" y "Dueño".
- **Backend**: NestJS 12 + Mongoose en Render, con auth por JWT Bearer (`JwtAuthGuard`). Hoy `GET /gardens` es público y devuelve `owner.email`.
- **Objetivo**: que un usuario autenticado le escriba al dueño de una huerta para proponer un intercambio, y que ambos gestionen esas conversaciones desde una bandeja de mensajes.

---

## 1. Revisión UX/UI de la propuesta original

### 1.1 "El chat se podría ver en el drawer"

**Corrección: el drawer no debería alojar el chat completo.** El drawer es la *ficha* de la huerta (descubrimiento) y un chat es una tarea larga con su propio ciclo de vida. Si se mezclan:

- En móvil el drawer es un bottom sheet que se cierra con swipe. Al hacer scroll en el chat o al aparecer el teclado, es fácil cerrarlo por accidente y perder el contexto.
- Al tocar otro marcador, el panel de escritorio cambia de huerta y el chat quedaría a medio escribir.
- El chat terminaría duplicado: una copia en el drawer y otra en la bandeja.

**Patrón recomendado (Wallapop, Vinted, Airbnb, Marketplace):**

1. En el drawer va un **CTA principal fijo al pie**: "Proponer intercambio" (o "Contactar"), siempre visible por encima de las pestañas, con estilo `Button` por defecto y ancho completo en móvil.
2. Al pulsarlo se abre un **compositor rápido** dentro del mismo drawer (un `Popover` en escritorio y una vista apilada en móvil). Incluye:
   - Chips para elegir **qué producto interesa**, tomados de `garden.products`.
   - Un mensaje inicial prellenado y editable ("Hola, me interesan tus tomates. ¿Te interesaría cambiarlos por…?").
   - Botón "Enviar".
3. Al enviar se crea la conversación, aparece un toast "Mensaje enviado · Ver conversación" y el drawer sigue abierto. El usuario continúa explorando el mapa sin cambiar de contexto.
4. Si ya existe una conversación con esa huerta, el CTA cambia a **"Ver conversación"**, con un badge si tiene mensajes sin leer, y lleva a `/messages?c=<id>`.

Así el primer contacto es muy rápido (de 1 a 2 taps) y la conversación sigue en un único lugar: la bandeja.

### 1.2 Usuario no autenticado: el patrón "upsell"

La idea es correcta (*feature gating* visible), pero conviene ajustar la ejecución:

- **No usar un botón `disabled` con tooltip.** Los tooltips no existen en táctil, los botones deshabilitados no reciben foco (accesibilidad) y transmiten "roto" en lugar de "desbloqueable".
- **Botón activo con un ícono de candado** (`LockIcon` pequeño a la derecha o un `Badge` "Requiere cuenta"). Al pulsarlo se abre un **`Popover` (escritorio) o un `Drawer` anidado (móvil)** con:
  - Título: "Inicia sesión para escribirle a {dueño}".
  - 2 o 3 beneficios en una línea cada uno (por ejemplo: "Coordina intercambios", "Recibe respuestas en tu bandeja").
  - **El `GoogleSignInButton` ahí mismo**, sin redirigir a otra página. Hoy el login es de un clic con Google y no hay que sacar al usuario del flujo.
- **Conservar la intención:** guardar `{ gardenId, productName }` en `sessionStorage` antes del login. Al autenticarse se reabre automáticamente el compositor de esa huerta. Es el detalle que más mejora la conversión en este patrón.
- **Si el visitante es el dueño de la huerta**, el CTA no aparece y se muestra "Es tu huerta · Editar" (con el mismo `gardenEditHref`).
- Si la huerta está oculta (`active: false`), no se puede contactar.

### 1.3 Apartado de mensajería en el sidebar

De acuerdo. Un ítem **"Mensajes"** en el grupo de navegación, junto a "Mapa", con:

- Un `SidebarMenuBadge` con el total de no leídos (se oculta si es 0 y muestra "99+" como tope).
- En modo colapsado (`collapsible="icon"`) el badge se ve como un punto sobre el ícono.
- El mismo contador en el `<title>` de la pestaña ("(3) ShareYourGarden"), una convención muy conocida.

Para los anónimos, el sidebar ya no existe (`AppShell`), así que el upsell vive solo en el drawer. No hace falta un ítem de mensajes falso en el header.

### 1.4 Cómo agrupar los mensajes por huerta

**Corrección: no conviene un submenú de mensajes dentro de cada huerta.** Motivos:

- **Hay dos roles.** Un usuario recibe mensajes *sobre sus huertas* (como dueño), pero también *envía* mensajes a huertas ajenas (como interesado). Estas últimas no aparecen en "Mis huertas", así que un submenú por huerta deja la mitad de las conversaciones sin un lugar.
- Con el sidebar colapsado a íconos, los submenús desaparecen. Con 3 huertas y 10 conversaciones cada una, el sidebar se convierte en una bandeja mal hecha.
- Se duplica la navegación: la misma conversación sería alcanzable desde dos lugares con estados de activo distintos.

**Modelo recomendado: bandeja unificada y la huerta como dimensión de filtro.**

- **Unidad de conversación** = `(huerta, interesado)`. Es único: si Ana escribe dos veces a la "Huerta Norte" de Pedro, sigue siendo el mismo hilo. Si Ana le escribe a otra huerta de Pedro, es otro hilo, con lo que los mensajes quedan diferenciados por huerta de forma natural.
- **Cada fila de la bandeja** (`Item`) muestra el avatar de la otra persona, su nombre, **un chip con el nombre de la huerta** (con `SproutIcon`), la vista previa del último mensaje, la hora relativa y un punto de no leído.
- **Filtros en la parte superior de la bandeja** (`ToggleGroup` o `Tabs` compactos):
  - `Todos` · `Recibidos` (sobre mis huertas) · `Enviados` (huertas de otros).
  - Si se elige "Recibidos" y el usuario tiene más de una huerta, aparece un `Select`/`Combobox` "Huerta: Todas / Huerta Norte / Huerta Sur".
- **Puente desde "Mis huertas"**: en `NavGardens`, cada huerta muestra un `SidebarMenuBadge` con sus no leídos y su menú `…` gana la opción **"Ver mensajes"** → `/messages?garden=<id>`. Se obtiene la diferenciación por huerta que buscabas, sin duplicar el árbol.

### 1.5 Layout de la página de mensajes (tendencias actuales)

- **List–detail de dos paneles** en `md+` (bandeja de unos 320 px y conversación), como Linear, Slack o WhatsApp Web. En móvil es **apilado**: la lista y, al tocar una fila, la conversación a pantalla completa con un botón "atrás". Todo se controla con `?c=` en la URL, de modo que el "atrás" del navegador funciona y los enlaces se pueden compartir.
- **Cabecera de la conversación** con una **tarjeta de contexto fija**: nombre de la huerta, producto de interés y "Ver en el mapa" (`gardenMapHref`). Es el patrón de marketplaces: siempre se sabe *de qué* se está hablando.
- **Mensajes**:
  - Burbujas propias a la derecha (color `primary`) y ajenas a la izquierda (`muted`).
  - Mensajes consecutivos del mismo autor agrupados: avatar y hora solo en el último del grupo.
  - Separadores de día ("Hoy", "Ayer", "12 oct").
  - Hora completa al pasar el cursor o con long-press.
- **Scroller**: se ancla abajo, carga historial al llegar arriba (paginación por cursor `before`) sin saltos de scroll. Si el usuario está leyendo arriba y llega un mensaje, aparece un botón flotante "↓ 2 nuevos" en lugar de forzar el scroll.
- **Compositor**:
  - `Textarea` auto-creciente (hasta unas 6 líneas) dentro de `InputGroup` con un botón de enviar de ícono.
  - `Enter` envía y `Shift+Enter` hace salto de línea en escritorio. En móvil, `Enter` hace salto de línea.
  - Límite de 2000 caracteres, con un contador que aparece solo cerca del límite.
  - Respeta el teclado virtual con `h-dvh` / `interactive-widget=resizes-content`.
- **Envío optimista**: el mensaje aparece al instante con estado "Enviando…" y, si falla, muestra "No se envió · Reintentar". No hace falta lo de "escribiendo…" ni confirmaciones de lectura con doble check en la v1. Basta con un "Visto" discreto bajo el último mensaje propio.
- **Estados vacíos** con `Empty`:
  - Bandeja vacía: "Aún no tienes conversaciones · Explora el mapa".
  - Nada seleccionado en escritorio: ilustración más "Elige una conversación".
- **Skeletons** en la lista y en la conversación mientras cargan. Hay que tener en cuenta que Render "duerme" y el primer request puede tardar varios segundos.

### 1.6 Privacidad y confianza (más importante de lo que parece)

- **Dejar de exponer `owner.email` en `GET /gardens` (público).** Hoy cualquiera puede extraer los correos de todos los dueños desde el mapa. Con el chat ya no hace falta: la pestaña "Dueño" pasa a mostrar el nombre, el avatar y "Miembro desde…", y el contacto se hace por el CTA.
- Acción mínima de **"Bloquear usuario"** en el menú `…` de la conversación. Al bloquear, el otro ya no puede enviar mensajes y el hilo queda en solo lectura.
- **Rate limit** en la creación de conversaciones (por ejemplo, 10 por hora por usuario) para evitar spam.
- Si la huerta se elimina, la conversación **no se borra**: queda en solo lectura con el aviso "Esta huerta ya no está disponible".

---

## 2. Componentes shadcn

> **Sin verificar:** desde esta sesión no se pudo consultar el registro de shadcn (ui.shadcn.com está bloqueado por la red), así que no confirmé los nombres exactos de **Message** y **Message Scroller** ni de sus subcomponentes. Antes de implementar hay que ejecutar:
>
> ```bash
> pnpm dlx shadcn@latest view message message-scroller
> ```
>
> Si los nombres difieren, se ajustan los imports del paso 4. Si alguno no existe para el estilo `base-vega`, la alternativa es un `div` con `overflow-y-auto` y `flex-col-reverse` más burbujas propias con `cva`.

| Necesidad | Componente | Estado en el repo |
| --- | --- | --- |
| Burbuja de mensaje (avatar, contenido, hora) | `Message` | agregar |
| Lista con anclaje abajo y botón "ir al final" | `Message Scroller` | agregar |
| Filas de la bandeja | `Item` (`ItemMedia`, `ItemContent`, `ItemTitle`, `ItemDescription`, `ItemActions`) | agregar |
| Compositor | `InputGroup` + `Textarea` (`InputGroupTextarea`) | ya existe |
| Estados vacíos | `Empty` | ya existe |
| Avatares | `Avatar` | ya existe |
| Chip de huerta y contadores | `Badge`, `SidebarMenuBadge` | ya existe |
| Filtros Todos/Recibidos/Enviados | `ToggleGroup` (o `Tabs`) | agregar `toggle-group` |
| Filtro por huerta | `Select` / `Combobox` | ya existe |
| Upsell de login y compositor rápido | `Popover` (escritorio) / `Drawer` anidado (móvil) | agregar `popover` |
| Carga | `Skeleton`, `Spinner` | `skeleton` existe, agregar `spinner` |
| Atajo de envío | `Kbd` ("⏎ Enviar") | agregar |
| Confirmar bloqueo | `AlertDialog` | ya existe |
| Toasts | `sonner` | ya existe |

```bash
pnpm dlx shadcn@latest add message message-scroller item toggle-group popover spinner kbd
```

---

## 3. Backend (`shareyourgarden-backend`)

### 3.1 Modelo

Nuevo módulo `src/conversations/`:

```ts
// Conversation
{
  gardenId: ObjectId            // ref Garden, index
  gardenOwnerId: ObjectId       // ref User, index
  requesterId: ObjectId         // ref User, index
  // Snapshots para mostrar la bandeja sin joins y sobrevivir al borrado de la huerta
  garden: { name: string }
  owner: { name: string; picture?: string }
  requester: { name: string; picture?: string }
  productName?: string          // producto de interés inicial
  lastMessage?: { body: string; senderId: ObjectId; createdAt: Date }
  lastReadAt: { owner?: Date; requester?: Date }
  blockedBy?: ObjectId
  gardenDeleted: boolean        // default false
  createdAt, updatedAt
}
// índice único { gardenId: 1, requesterId: 1 }
// índices { gardenOwnerId: 1, updatedAt: -1 } y { requesterId: 1, updatedAt: -1 }

// Message
{
  conversationId: ObjectId      // index
  senderId: ObjectId
  body: string                  // trim, 1..2000
  createdAt
}
// índice { conversationId: 1, createdAt: -1 }
```

Los no leídos se calculan como los mensajes del otro con `createdAt > lastReadAt[miRol]`. Para el contador global basta una agregación sobre las conversaciones del usuario cuyo `lastMessage.createdAt > lastReadAt[rol]` y `lastMessage.senderId != yo`, lo que cuenta conversaciones con no leídos y no mensajes individuales. Es la métrica que muestran casi todas las apps.

### 3.2 Endpoints (todos con `JwtAuthGuard`)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/conversations` | `{ gardenId, productName?, body }`. Crea la conversación o reutiliza la existente y agrega el mensaje. `400` si la huerta es propia, `404` si no existe o está oculta, `429` por rate limit. Devuelve la conversación. |
| `GET` | `/conversations?role=all\|received\|sent&gardenId=` | Bandeja ordenada por `updatedAt desc`, con `unread: boolean` y `role` por fila. Paginación con `before` (cursor de `updatedAt`). |
| `GET` | `/conversations/summary` | `{ unread: number, byGarden: { [gardenId]: number } }` para el sidebar. Es lo único que se consulta periódicamente. |
| `GET` | `/conversations/:id` | Detalle. `404` si el usuario no participa (no `403`, para no filtrar si existe). |
| `GET` | `/conversations/:id/messages?before=&after=&limit=30` | `before` para el historial y `after` para traer los nuevos. |
| `POST` | `/conversations/:id/messages` | `{ body }`. `409` si la conversación está bloqueada o la huerta fue eliminada. |
| `POST` | `/conversations/:id/read` | Marca como leída (`lastReadAt[rol] = now`). |
| `POST` | `/conversations/:id/block` | Bloquea al otro participante. |

Otros cambios:

- `GardensService.remove`: marca `gardenDeleted: true` en sus conversaciones en lugar de borrarlas.
- `GardensService.toDto`: **quitar `owner.email` de la respuesta pública** (se mantiene en `GET /gardens/mine`).
- Tests unitarios del servicio y un e2e en `test/conversations.e2e-spec.ts`, siguiendo el estilo de `gardens.e2e-spec.ts`.

### 3.3 Tiempo real

Se recomienda **polling en la v1**, en lugar de WebSockets o SSE:

- Render (plan gratis) duerme y corta las conexiones largas, y el sitio es estático, sin servidor propio.
- `EventSource` no permite enviar el header `Authorization`, así que SSE obligaría a meter el token en la URL o a usar `fetch` en streaming.

Esquema de polling:

- `summary` cada 30 s, y solo con la pestaña visible (`document.visibilityState`).
- Con una conversación abierta, `messages?after=<último>` cada 4 s, con backoff hasta 15 s si no llega nada.
- Se refresca de inmediato al volver el foco a la pestaña.

La v2 puede migrar a SSE (`@Sse()` en Nest) sin cambiar el contrato de datos.

---

## 4. Frontend (`shareyourgarden-web`)

### 4.1 Datos

- `lib/types.ts`: `Conversation`, `ConversationRole`, `Message`, `ConversationSummary` y `toConversation` / `toMessage`, siguiendo el patrón de `toGarden`.
- `lib/conversations.ts`: funciones sobre `apiRequest` (`listConversations`, `getConversation`, `startConversation`, `listMessages`, `sendMessage`, `markRead`, `blockConversation`, `getSummary`).
- `lib/pending-contact.ts`: guarda y lee en `sessionStorage` la intención de contacto previa al login (con try/catch).
- `components/messages-provider.tsx`: contexto con `summary`, `refreshSummary()` y el polling de 30 s. Se monta en `AppShell` solo si `status === "authenticated"`, como `MyGardensProvider`.

### 4.2 Rutas

- `app/[locale]/messages/page.tsx`: página estática. Lee `?c=<conversationId>` y `?garden=<gardenId>&role=` con `useSearchParams` dentro de `Suspense`, igual que `gardens/edit`.

### 4.3 Componentes nuevos (`components/messages/`)

| Archivo | Responsabilidad |
| --- | --- |
| `messages-layout.tsx` | List–detail: dos columnas en `md+` y apilado en móvil según `?c=`. |
| `conversation-list.tsx` | Filtros (`ToggleGroup` + `Select` de huerta), lista de `Item`, skeleton y `Empty`. |
| `conversation-list-item.tsx` | Avatar, nombre, chip de huerta, vista previa, hora relativa (`useFormatter().relativeTime` de next-intl) y punto de no leído. |
| `conversation-view.tsx` | Cabecera con tarjeta de contexto de la huerta, menú `…` (Ver en el mapa, Bloquear), `MessageScroller`, compositor y el polling de 4 s. Llama a `markRead` al abrir y al recibir mensajes con la pestaña visible. |
| `message-group.tsx` | Agrupa por autor y por día y renderiza los `Message`. |
| `message-composer.tsx` | `InputGroup` + textarea auto-creciente, atajos de teclado, envío optimista con reintento y contador cerca del límite. |
| `contact-garden-button.tsx` | CTA del drawer con cuatro estados: anónimo (candado → `SignInRequired`), dueño ("Es tu huerta"), con conversación ("Ver conversación" con badge) y nuevo (abre `QuickComposer`). |
| `quick-composer.tsx` | Chips de productos, mensaje prellenado y enviar. Muestra el toast "Ver conversación". |
| `sign-in-required.tsx` | Popover o drawer con texto, beneficios y `GoogleSignInButton`. Guarda la intención pendiente. |

### 4.4 Cambios en componentes existentes

- `components/map/garden-drawer.tsx`:
  - Agregar un pie fijo con `ContactGardenButton`, fuera del área con scroll de las pestañas.
  - En la pestaña "Dueño", quitar el email y mostrar el avatar y el nombre.
  - Al montar, si hay una intención pendiente para `displayed.id` y el usuario ya está autenticado, abrir el `QuickComposer`.
- `components/app-sidebar.tsx`: agregar `{ title: "messages", href: "/messages", icon: MessageCircleIcon }` a `navItems` con un `SidebarMenuBadge` de `summary.unread`.
- `components/nav-gardens.tsx`:
  - Agregar un `SidebarMenuBadge` por huerta (`summary.byGarden[id]`). Hoy el `EyeOffIcon` usa `ml-auto`, así que hay que acomodar ambos.
  - Agregar el ítem "Ver mensajes" al menú `…`.
- `components/app-shell.tsx`: montar `MessagesProvider` y actualizar `document.title` con los no leídos.
- `messages/es.json` y `messages/en.json`: nuevos namespaces `Messages`, `ContactGarden` y `SignInRequired`, y la clave `Sidebar.messages`. Hay que ejecutar `pnpm check:messages`.

### 4.5 Accesibilidad

- La lista de mensajes es una región con `role="log"` y `aria-live="polite"`, para que los mensajes nuevos se anuncien.
- Las burbujas incluyen el autor y la hora en texto para lectores de pantalla (`sr-only`).
- El foco va al compositor al abrir una conversación, y vuelve a la lista con "atrás" en móvil.
- Contraste de las burbujas `primary` verificado en modo claro y oscuro.

---

## 5. Fases

1. **Backend MVP**: entidades, endpoints, quitar el email público y tests.
2. **Frontend: contacto**: `ContactGardenButton`, `SignInRequired` con intención pendiente y `QuickComposer` en el drawer.
3. **Frontend: bandeja**: página `/messages`, list–detail, `Message` / `Message Scroller` y compositor con envío optimista.
4. **Sidebar y notificaciones**: `MessagesProvider`, badges en "Mensajes" y en "Mis huertas", y contador en el título.
5. **Confianza**: bloquear usuario, rate limit y conversaciones de huertas eliminadas en solo lectura.
6. **Más adelante (fuera del alcance)**: SSE, notificación por email de mensajes sin leer tras X horas, estado del intercambio (propuesto / acordado / completado) como tarjeta especial en el chat, y fotos adjuntas.

## 6. Verificación

- Backend: `npm test` y `npm run test:e2e`. Casos clave:
  - No se puede escribir a una huerta propia.
  - Un usuario no participante recibe `404`.
  - El índice único evita hilos duplicados.
  - Los no leídos se calculan bien por rol.
  - El email ya no aparece en `GET /gardens`.
- Web: `pnpm lint`, `pnpm typecheck`, `pnpm check:messages` y `pnpm build` (export estático).
- Manual con dos cuentas:
  - Anónimo → candado → login → el compositor se reabre solo.
  - Envío → aparece el badge en el sidebar del dueño en ≤30 s.
  - Respuesta → la conversación se actualiza en ≤4 s.
  - Móvil: teclado virtual, "atrás" y swipe del drawer sin perder el texto.
