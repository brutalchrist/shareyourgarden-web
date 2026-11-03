# Plan: inicio de sesión con Google

## Contexto

- **Web** (`shareyourgarden-web`): Next.js 16 con `output: "export"` (sitio estático en Netlify). No hay servidor Next: sin route handlers, sin middleware, sin cookies httpOnly propias. Todo el auth vive en el cliente.
- **Backend** (`backend`): NestJS 12 + Mongoose en Render (`https://shareyourgarden-backend.onrender.com`). Hoy no tiene usuarios ni auth; CORS abierto (`app.enableCors()`).
- Web y backend están en dominios distintos (netlify.app vs onrender.com), así que una cookie de sesión del backend sería de terceros (bloqueada por Safari y cada vez más por Chrome). Por eso se usa **token Bearer**.

## Flujo elegido

1. La web carga Google Identity Services (GIS) y muestra el botón "Iniciar sesión con Google".
2. Google devuelve al cliente un **ID token** (JWT firmado por Google, campo `credential`).
3. La web hace `POST /auth/google` con ese `credential`.
4. El backend verifica el ID token con `google-auth-library` (firma, `aud` = nuestro client ID, `iss`, expiración, `email_verified`), hace upsert del usuario en Mongo y responde con **su propio JWT de acceso**.
5. La web guarda el token en `localStorage` y lo envía como `Authorization: Bearer <token>` en las llamadas protegidas.
6. Al recargar, la web llama `GET /auth/me` para restaurar la sesión; si responde 401 borra el token.

Se descarta el flujo de authorization code / redirect porque requiere un endpoint servidor en el dominio de la web o cookies cross-site.

## Contrato API (acordado con backend)

### `POST /auth/google`

Request:

```json
{ "credential": "<ID token de Google>" }
```

Response `200`:

```json
{
  "accessToken": "<JWT del backend>",
  "user": {
    "id": "<ObjectId>",
    "email": "ana@example.com",
    "name": "Ana Pérez",
    "picture": "https://lh3.googleusercontent.com/..."
  }
}
```

Errores: `400` si falta `credential`; `401` si el token es inválido, expiró, `aud` no coincide o el email no está verificado.

### `GET /auth/me`

Header `Authorization: Bearer <accessToken>`. Responde `200` con el objeto `user` de arriba, o `401`.

### JWT del backend

- HS256, secreto `JWT_SECRET`, expiración 7 días.
- Payload: `{ sub: <userId>, email }`.
- Sin refresh token en esta primera versión: al expirar, el usuario vuelve a pulsar el botón (GIS suele resolverlo con un clic).

## Backend (lo implementa la sesión del repo `backend`)

1. Dependencias: `google-auth-library`, `@nestjs/jwt`.
2. Variables de entorno (agregar a `.env.default` y a Render): `GOOGLE_CLIENT_ID`, `JWT_SECRET`, `CORS_ORIGINS` (lista separada por comas).
3. `src/users/`: entidad `User` (`googleId` único e indexado, `email` único, `name`, `picture`, timestamps), `UsersService.upsertFromGoogle(payload)`.
4. `src/auth/`: `AuthModule`, `AuthController` (`POST /auth/google`, `GET /auth/me`), `AuthService` (verifica con `OAuth2Client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID })`, firma el JWT), `JwtAuthGuard` reutilizable para futuros endpoints protegidos, DTO con `class-validator`.
5. CORS en `main.ts`: restringir a `CORS_ORIGINS` (por defecto `http://localhost:3000`) y permitir el header `Authorization`.
6. Tests: unit de `AuthService` con `OAuth2Client` mockeado (token válido, `aud` incorrecto, email no verificado) y e2e de los dos endpoints.
7. `GET /gardens` sigue siendo público; proteger escrituras queda para cuando existan.

## Web

1. **Config**
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID` en `.env.example` y en `netlify.toml` (`[build.environment]`).
   - Tipos de GIS: devDependency `@types/google.accounts`.
2. **`lib/api.ts`**
   - Agregar `apiPost`.
   - Leer el token desde un pequeño módulo `lib/auth-token.ts` (`getToken` / `setToken` / `clearToken` sobre `localStorage`, con try/catch) e inyectar `Authorization` si existe.
   - Exponer el status en el error (o una clase `ApiError`) para detectar 401.
3. **`lib/types.ts`**: interfaz `User` y `AuthResponse`.
4. **`components/auth-provider.tsx`** (cliente, mismo patrón que `search-provider.tsx`)
   - Estado `user`, `status: "loading" | "authenticated" | "anonymous"`.
   - Al montar: si hay token, `GET /auth/me`; si falla con 401, `clearToken()`.
   - `signInWithCredential(credential)`: `POST /auth/google`, guarda token y usuario.
   - `signOut()`: `clearToken()`, `google.accounts.id.disableAutoSelect()`, `user = null`.
   - Hook `useAuth()`.
5. **`components/google-sign-in-button.tsx`**
   - Carga `https://accounts.google.com/gsi/client` con `next/script` (`strategy="afterInteractive"`).
   - `google.accounts.id.initialize({ client_id, callback: ({ credential }) => signInWithCredential(credential), use_fedcm_for_prompt: true })` y `renderButton` en un `div` ref, con `theme` según `next-themes`.
6. **`components/app-header.tsx`**
   - `anonymous`: botón de Google.
   - `authenticated`: avatar (`user.picture`) + nombre + botón "Cerrar sesión".
   - `loading`: placeholder del mismo tamaño para evitar salto de layout.
7. **`app/layout.tsx`**: envolver con `AuthProvider` dentro de `ThemeProvider`.

## Google Cloud Console (manual, lo hace el dueño del proyecto)

1. Crear proyecto o reutilizar uno, configurar la pantalla de consentimiento OAuth (externa, scopes `openid email profile`).
2. Crear credencial **OAuth client ID → Web application**.
3. Authorized JavaScript origins: `http://localhost:3000`, `http://localhost`, y el dominio de producción de Netlify. No admite comodines: los deploy previews de Netlify no podrán iniciar sesión salvo que se agreguen a mano.
4. No hace falta redirect URI (flujo con botón/popup).
5. El mismo client ID va en `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (web) y `GOOGLE_CLIENT_ID` (backend). No es secreto.

## Orden de trabajo

1. Crear el client ID en Google Cloud.
2. Backend: endpoints + deploy en Render con las nuevas variables.
3. Web: provider, botón, header; probar contra el backend local (`pnpm dev` + `yarn start:dev`).
4. Configurar variables en Netlify y desplegar.

## Verificación

- Local: iniciar sesión, recargar (la sesión persiste vía `/auth/me`), cerrar sesión, borrar o alterar el token (vuelve a anónimo sin romper el mapa).
- Backend rechaza un ID token emitido para otro client ID (401).
- `pnpm lint`, `pnpm typecheck`, `pnpm build` (debe seguir siendo export estático).

## Riesgos y decisiones abiertas

- **Token en `localStorage`**: expuesto ante XSS. Aceptable para la v1 por la restricción de export estático. Alternativa futura: servir web y API bajo el mismo dominio (proxy de Netlify `/api/* → Render`) y pasar a cookie httpOnly `SameSite=Lax`.
- **Cold start de Render**: el primer `POST /auth/google` puede tardar; mostrar estado de carga en el botón.
- **Vinculación con jardines**: `Garden.owner` hoy es `{ name, email }` embebido. Relacionarlo con `User` queda fuera de este alcance.
