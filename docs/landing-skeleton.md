# Landing de ShareYourGarden: esqueleto para implementar

Documento de trabajo para quien construye la landing. Contiene el contexto real del producto (para que los textos no prometan lo que la app no hace), la visión que guía el tono, el esqueleto de secciones con su objetivo, el borrador de copy y las notas técnicas de implementación.

Los textos de la sección 5 son **provisionales**: están alineados con la visión y con lo que existe hoy, pero no están aprobados. Si se itera el copy en otro chat, pegar este documento completo y usar la plantilla del final.

---

## 1. Qué es el producto (solo lo que existe hoy)

ShareYourGarden es una red de vecinos que comparten lo que cultivan. Una persona publica su huerto en un mapa y lista qué tiene disponible. Quien lo encuentra le escribe al dueño desde la app para coordinar cómo compartirlo.

Descripción oficial actual (`Metadata.description`): «Comparte lo que crece en tu huerto y encuentra huertos cerca de ti.»

### Lo que se puede afirmar con seguridad

- El **mapa es público**: se ve sin crear cuenta.
- Se buscan huertos por texto y se filtran por tipo de producto: verdura, fruta, hierba, flor, semilla, almácigo, insumo.
- Cada huerto muestra su descripción, su dueño, qué productos tiene, en qué cantidad y unidad (kg, g, atado, litro, unidad) y **hasta 3 fotos por producto**. Los productos agotados se ven al final.
- Para **escribirle a un dueño o publicar un huerto hay que iniciar sesión con Google**. No hay otro método de acceso.
- La mensajería está dentro de la app: bandeja, conversaciones, avisos de mensajes nuevos y **notificaciones** (opcionales, el usuario las activa).
- **El correo de la persona no se muestra** a quien le escribe.
- Se puede **bloquear** a una persona.
- El dueño puede **ocultar** un huerto sin borrarlo.
- Se puede **instalar como app** en el teléfono y funciona sin conexión para lo básico.
- Está en **español e inglés**.
- El mapa abre en la ciudad del visitante (por su IP) sin pedir permisos.
- La app está **en beta** (el tour de bienvenida ya lo dice).

### Lo que NO existe (no prometerlo)

- **No hay pagos, ni precios, ni reservas dentro de la app.** Todo se coordina por mensajes.
- No hay valoraciones, reseñas ni verificación de identidad.
- No hay filtros por distancia, categoría de huerto ni calendario de cosechas.
- No hay cifras públicas (cantidad de huertos, comunas o usuarios).
- No hay un sistema de «comunidades» ni de grupos.
- **No hay eventos ni «saberes»**: son ideas a futuro. No mencionarlos en la landing como algo disponible.
- **La ubicación del huerto es exacta y pública** (el punto que eligió el dueño). No decir «ubicación aproximada» ni «tu dirección está protegida».
- **El nombre y la foto de Google del dueño son públicos** en la ficha del huerto. No decir «tus datos son privados» sin matizar eso.
- **No hay registro por invitación todavía.** Cualquiera con cuenta de Google puede entrar. No hablar de «acceso por invitación».
- No hay páginas de privacidad ni de términos.

### Cambios planificados que afectarán el copy

Cuando se implementen, hay que revisar los textos marcados. Hasta entonces, la landing describe el estado actual.

| Cambio planificado | Issue | Texto de la landing que cambiaría |
| --- | --- | --- |
| Ubicación aproximada en el mapa público | web#54 / backend#21 | Respuesta de FAQ sobre datos |
| Nombre público editable y foto de Google opcional | web#55 / backend#20 | Respuesta de FAQ sobre datos |
| Reportar conversaciones y huertos | web#56 / backend#19 | Sección de confianza |
| Explicación del proyecto para visitantes sin sesión | web#57 | Esta landing (es su implementación) |
| Consejos de seguridad para primeros encuentros | web#58 | FAQ de seguridad |
| Correo de comentarios fuera del código | web#59 | Contacto del footer y de la beta |

### Decisiones tomadas

| Pregunta | Decisión |
| --- | --- |
| ¿Es gratis? | **Sí.** Es una iniciativa sin fines de lucro y no se va a monetizar |
| ¿Es solo intercambio? | **Lo decide cada comunidad.** La landing habla de compartir y da como ejemplo regalo o trueque; **no menciona precios ni dinero**. Si en alguna comunidad hay dinero de por medio, es decisión de ella. La app no maneja pagos, así que el copy no habla de «intercambio» como si fuera una transacción |
| ¿Huerto o huerta? | **Huerto** en toda la landing |
| ¿Se mantiene el aviso «beta»? | **Sí**, con tono cercano («ayúdanos a mejorarlo»), no como advertencia |
| ¿Hay cifras reales? | **No.** La sección de prueba social se omite |
| ¿En qué ciudades hay huertos? | Se habla de «cerca de ti», sin ciudades concretas |

Pendiente aparte (no es de la landing): unificar «huerta» → «huerto» en la mensajería («Es tu huerta», «Esta huerta ya no está disponible»).

---

## 2. Visión (para entender el tono)

- Iniciativa **sin fines de lucro**, pensada como un bien común: mutual y comunitaria, no comercial.
- Apunta a la **ayuda mutua** entre personas que comparten un territorio.
- El corazón es **compartir lo que se cultiva**.
- Quiere ir generando **redes de personas afines** a la cooperación. El intercambio mismo crea esos lazos.
- Las comunidades **surgen solas**: la landing no debería vender «comunidades» ya armadas.

Esto es el trasfondo del tono. La landing no tiene que declarar la visión completa, solo ser coherente con ella.

---

## 3. Público y tono

**Dos públicos, dos beneficios:**

| Público | Quiere | Barrera principal |
| --- | --- | --- |
| **Tiene un huerto** (o excedentes) | Que no se pierda lo que le sobra, conocer vecinos | «¿Quién va a venir a mi casa?», «¿me da trabajo?» |
| **Quiere cultivar o conseguir productos** | Verdura, semillas y almácigos cerca, sin patio propio | «¿Es real?», «¿hay algo cerca de mí?» |

**Tono de la marca (por cómo ya escribe la app):** cercano, concreto, de vecinos. Frases cortas, tuteo, sin jerga. Ejemplos reales de la app:

- «Una red de vecinos que comparten lo que cultivan: verduras, semillas, almácigos e insumos.»
- «Cada pin es un huerto. Busca un producto o filtra por tipo.»
- «Publica lo que te sobra y tus vecinos te encontrarán.»
- «Tu correo nunca se muestra.»

**Evitar:** «solución», «plataforma innovadora», «revolucionar», «ecosistema», «startup», signos de exclamación en exceso, y prometer ahorro, sostenibilidad medible o seguridad absoluta. Tampoco «economía colaborativa» (suena a plataformas comerciales); si hace falta un término, «compartir» y «ayuda mutua».

---

## 4. Esqueleto de la landing

Orden de arriba a abajo. Cada sección tiene un objetivo y un límite de longitud pensado para que el diseño no se rompa en el teléfono.

| # | Sección | Objetivo | Límite |
| --- | --- | --- | --- |
| 1 | Header | Orientar y ofrecer la acción principal | Wordmark + 2–3 enlaces + CTA |
| 2 | Hero | Que se entienda qué es en 5 segundos y llevar a una acción | Título ≤ 60 caracteres; subtítulo ≤ 140 |
| 3 | Por qué existe | Decir que es sin fines de lucro y de vecinos | Título ≤ 40; texto ≤ 200 |
| 4 | Cómo funciona | Mostrar que es simple | 3 pasos, título ≤ 20 y texto ≤ 70 caracteres |
| 5 | Dos audiencias | Hablarle a cada público por separado | 1 titular + 1 frase + 1 botón cada uno |
| 6 | Huertos destacados | Mostrar el producto real | Datos reales del mapa; sin texto propio salvo el título |
| 7 | Confianza | Quitar el miedo a contactar a desconocidos | 3 puntos, ≤ 80 caracteres cada uno |
| 8 | Preguntas frecuentes | Resolver dudas que frenan | 6 preguntas, respuestas ≤ 220 caracteres |
| 9 | Llamado final | Cerrar con una sola acción | Título ≤ 50; un botón |
| 10 | Footer | Contacto y datos básicos | Enlaces, idioma, derechos |

Se omite la sección de **prueba social** (no hay cifras reales). Si más adelante existen, va entre «Por qué existe» y «Cómo funciona».

### Reglas transversales

- **Un solo botón primario por pantalla.** El primario siempre es *explorar el mapa* (no requiere cuenta). *Compartir mi huerto* es secundario.
- Los botones empiezan con verbo, van en minúscula salvo la primera letra y no llevan punto final.
- Todo texto debe existir en **español e inglés**. El español es la fuente; la app valida con `pnpm check:messages` que los dos catálogos tengan las mismas claves y los mismos argumentos.
- Móvil primero: en el teléfono el título del hero no debería pasar de 4 líneas.
- No afirmar nada de la lista «Lo que NO existe».

---

## 5. Borrador provisional de textos

> Punto de partida para iterar, no copy aprobado.

### 1. Header

- Wordmark: ShareYourGarden, con una pequeña etiqueta «beta»
- Enlaces: Cómo funciona · Mapa · Preguntas
- Selector de idioma: ES / EN
- CTA: **Explorar huertos**

### 2. Hero

- Título: *Una red de vecinos que comparten lo que cultivan.*
- Subtítulo: *Encuentra verduras, semillas y almácigos cerca de ti, o publica lo que te sobra. Sin fines de lucro.*
- CTA primario: **Explorar el mapa**
- CTA secundario: **Compartir mi huerto**
- Apoyo bajo los botones (opcional): *No necesitas cuenta para ver el mapa.*

Alternativas de título:
- *Lo que sobra en un huerto le sirve a otro.*
- *Encuentra huertos cerca de ti.*

> Se descartó «Cultiva en el huerto de tu vecino»: la app no organiza cultivar en el huerto ajeno, solo compartir lo que hay disponible.

### 3. Por qué existe

- Título: *Un proyecto sin fines de lucro*
- Texto: *ShareYourGarden nace para que los vecinos se apoyen entre sí. Lo que sobra en un huerto le sirve a otro, y cada comunidad decide cómo compartir.*
- Línea de beta (opcional): *Estamos en beta. Cuéntanos qué mejorarías.* (enlace al contacto)

### 4. Cómo funciona

- **1. Busca** — Encuentra huertos cerca en el mapa.
- **2. Conecta** — Escríbele al dueño y acuerden cómo compartirlo.
- **3. Cultiva** — Siembra, cosecha y comparte lo que crece.

### 5. Dos audiencias

- **Tengo un huerto** — Publica lo que te sobra y tus vecinos te encontrarán. → **Publicar mi huerto**
- **Quiero cultivar** — Encuentra verduras, semillas y almácigos cerca de ti. → **Buscar un huerto**

### 6. Huertos destacados

- Título: *Huertos cerca de ti*
- Subtítulo: *Esto es lo que tus vecinos están compartiendo.*
- Contenido: tarjetas con datos reales (nombre del huerto, tipo de producto y cantidad de productos). **No mostrar ubicación** en las tarjetas por ahora: hoy el backend solo entrega el punto exacto. Si no hay suficientes huertos, mostrar el mapa en su lugar.

### 7. Confianza

- *Tu correo nunca se muestra.*
- *Puedes bloquear a quien no quieras que te escriba.*
- *Tú decides cuándo mostrar u ocultar tu huerto.*

### 8. Preguntas frecuentes

| Pregunta | Respuesta (validar antes de publicar) |
| --- | --- |
| ¿Cuesta algo usar ShareYourGarden? | *No. Es un proyecto sin fines de lucro y usarlo es gratis.* |
| ¿Necesito una cuenta? | *Para ver el mapa, no. Para escribirle a alguien o publicar tu huerto, sí: se entra con Google.* |
| ¿Qué pasa con mis datos? | *Tu correo no se muestra a otras personas. Quien ve tu huerto ve tu nombre, tu foto de Google y el punto que marcaste en el mapa.* |
| ¿Cómo coordino lo que quiero compartir? | *Por los mensajes de la app. Cada persona y cada comunidad decide cómo compartir, por ejemplo regalo o trueque; ustedes acuerdan lugar y día.* |
| ¿Cómo cuido mi seguridad al encontrarme con alguien? | *Al principio, encuéntrense en un lugar público o de paso, avisa a alguien de confianza y no compartas datos sensibles por mensaje. Si algo no te gusta, bloquea a esa persona.* |
| ¿Funciona en el teléfono? | *Sí. Se puede instalar como app y avisa cuando llega un mensaje.* |

> Nota para quien redacta: la respuesta sobre datos describe lo que pasa hoy. Cuando se implementen web#54 y web#55 (ubicación aproximada, nombre público y foto opcional) hay que reescribirla.

### 9. Llamado final

- Título: *Hay un huerto esperándote.*
- Subtítulo: *Encuentra uno cerca o comparte el tuyo.*
- Botón: **Explorar huertos**

### 10. Footer

- © 2026 ShareYourGarden
- Contacto (ver nota) · Selector de idioma
- **Sin enlaces a Privacidad ni Términos** hasta que existan esas páginas.
- Nota: el correo de contacto hoy está escrito en el código del tour (`FEEDBACK_EMAIL`). Usar la misma variable de entorno cuando se resuelva web#59, y no repetir el correo en los textos.

---

## 6. Metadatos (SEO y compartir)

- Título de la pestaña: hoy `ShareYourGarden`.
- Meta descripción: hoy «Comparte lo que crece en tu huerto y encuentra huertos cerca de ti.» (≤ 155 caracteres; la actual mide ~80). Se puede ampliar mencionando que es sin fines de lucro.
- Imagen para compartir (Open Graph): no existe todavía.

---

## 7. Notas técnicas para quien implementa

Basadas en `product-technical-context.md`. Verificar contra el código antes de construir.

- **Hoy no existe landing.** La raíz `/` redirige al mapa (`/{locale}/map/`). La landing sería la página en `/{locale}/`. Hay que decidir qué pasa con `/` y con `public/_redirects`.
- **PWA (obligatorio al implementar):** el manifiesto usa `start_url: "/"`. Con una landing en `/`, quien tenga la app instalada vería la landing cada vez que la abra. Al construir la landing hay que cambiar `start_url` para que la app instalada abra el mapa, y revisar que el service worker (precache de `/`) siga coherente.
- **Quién la ve:** la landing es la cara visible del proyecto y la ve todo el mundo, con o sin sesión. No hay redirección automática para quien ya inició sesión; esas personas llegan al mapa desde el CTA o desde la app instalada.
- **Salida estática:** el proyecto usa `output: "export"`. La landing no puede depender de un servidor Next.js; los datos reales (huertos destacados) se piden desde el navegador a `GET /gardens?polygon=…`. Esa llamada exige un área: usar la que da `/api/geo` o la vista guardada, o caer al mapa.
- **Primer request lento:** el backend está en Render (plan gratuito). La sección de huertos destacados debe tener estado de carga y de error, y no bloquear el resto de la página.
- **i18n:** los textos van en `messages/es.json` y `messages/en.json` bajo un namespace nuevo (por ejemplo `Landing`). `pnpm check:messages` debe pasar en CI.
- **UI:** usar primero los componentes de `components/ui/`, tokens semánticos (`text-muted-foreground`, `bg-brand`), sin colores crudos ni `dark:` (convención de `AGENTS.md`). Fuentes: Bricolage Grotesque para títulos y wordmark, Inter para texto.
- **Convenciones de git:** Conventional Commits y squash merge; ramas con el tipo como prefijo (`feat/landing`).
- **Accesibilidad:** CTA con foco visible, contraste en tema claro y oscuro, y un solo `<h1>`.

---

## 8. Plantilla para pedir iteraciones de copy

```text
Tengo el esqueleto de la landing de ShareYourGarden (pegado arriba).

Quiero iterar: [sección, por ejemplo "Hero"].
Público al que le habla: [tiene huerto / quiere cultivar / ambos].
Tono: cercano, de vecinos, tuteo, frases cortas.
Restricciones: respetar los límites de longitud de la tabla y no prometer nada
de la lista «Lo que NO existe».

Dame 5 variantes distintas (no parecidas entre sí), cada una con:
- el texto en español,
- una versión en inglés,
- en una línea, qué idea o ángulo defiende.

Al final marca cuál recomiendas y por qué.
```

Cuando una sección quede aprobada, llevarla a la sección 5 reemplazando el borrador, para que este documento sea siempre la fuente de verdad.
