# Perla Dental

Demo de una web para una clínica dental, creada por **Astravia Studio**. Es un prototipo estático (HTML, CSS y JavaScript sin framework) pensado para enseñar a un cliente cómo se vería su sitio: tono cercano, fotografía real, movimiento cuidado y una reserva de cita guiada.

> ⚠️ **Es una demo.** Los datos (teléfono, dirección, nombres de los doctores, cifras) son de ejemplo y el formulario de cita **no envía nada** a ningún sitio. Ver [Antes de publicar](#antes-de-publicar).

## Qué incluye

- **Hero** con foto a pantalla completa. Al cargar, la imagen "se enfoca", los titulares suben por máscaras y la cifra cuenta hasta su valor.
- **Cabecera fija** con barra de progreso de lectura y una perla que marca la sección activa mientras se hace scroll.
- **Tratamientos** en un acordeón horizontal (vertical en móvil), con un botón por tratamiento que lleva a la cita ya preseleccionado.
- **Conoce Perla Dental**: collage de 4 fotos con efecto "cortina" al entrar y profundidad al pasar el ratón.
- **Equipo**: carrusel **infinito** con la tarjeta central destacada (sin huecos en los extremos).
- **Cita guiada en 3 pasos**: tratamiento, día y hora, y datos de contacto.
  - Los días son los próximos laborables, y las horas ya pasadas de hoy aparecen desactivadas.
  - Al terminar muestra un resumen y permite **añadir la cita al calendario**: Google Calendar, Outlook o un archivo `.ics`. Solo la última opción descarga algo.
- **"Abierto ahora"** calculado con el horario de la clínica (lunes a viernes, 9:00 a 19:00).
- **Chat flotante** con respuestas guionizadas (horario, tratamientos, primera consulta, cita).
- **Scroll suave** con inercia, enlaces sin subrayado (hover tipo "roll" y perla) y un cursor del sistema sin adornos.

## Tecnología

| Qué | Con qué |
|---|---|
| Maquetación y estilos | HTML5 y CSS (variables, `clamp()`, container queries, `clip-path`). **Todo en `rem`**, sin `px` |
| Interacción | JavaScript vanilla, sin dependencias de build |
| Scroll suave | [Lenis](https://github.com/darkroomengineering/lenis) v1.1.20 (incluido en `assets/vendor/`) |
| Iconos | [Tabler Icons](https://tabler.io/icons) (outline), incrustados como sprite SVG |
| Tipografías | Bricolage Grotesque (títulos) y Figtree (texto), desde Google Fonts |
| Servidor de desarrollo | Script propio de Node, con recarga automática y sin dependencias |

No hay `package.json` ni paso de compilación: lo que ves en el repositorio es lo que se publica.

## Cómo ejecutarlo

Necesitas [Node.js](https://nodejs.org) 18 o superior.

```bash
node dev-server.js
```

Abre <http://localhost:3000>. El servidor recarga la página solo cada vez que guardas un cambio en HTML, CSS, JS o imágenes. Si el puerto está ocupado usa el siguiente libre; para elegir otro:

```bash
PORT=4000 node dev-server.js
```

También funciona con cualquier servidor de archivos estáticos (por ejemplo `python -m http.server 3000`), pero sin la recarga automática.

## Estructura

```
.
├── index.html              Página única (sprite de iconos incluido al principio)
├── favicon.ico
├── dev-server.js           Servidor local con recarga automática (no se publica)
├── css/
│   ├── global.css          Tokens (color, escala tipográfica --fs-*, radios, ritmo), reset y base
│   ├── styles.css          Componentes y secciones
│   ├── booking.css         Cita guiada, resumen, menú de calendarios y "Abierto ahora"
│   └── motion.css          Entradas, micro-interacciones y modo de movimiento reducido
├── js/
│   ├── main.js             Menú móvil, acordeón, carrusel infinito del equipo, chat
│   ├── booking.js          Cita guiada, calendarios (.ics, Google, Outlook) y "Abierto ahora"
│   └── motion.js           Entradas al hacer scroll, scroll suave, cifra animada, efectos
└── assets/
    ├── favicon.svg · apple-touch-icon.png · icon-192.png
    ├── img/                Fotos optimizadas (hero, collage, equipo) e imagen de vista previa
    └── vendor/             Lenis y su licencia
```

La carpeta `_recursoslocales/` (originales sin optimizar y referencias de trabajo) está en el `.gitignore` y no forma parte del repositorio.

## Decisiones de diseño

- **Paleta:** azul de marca (`#0a6fe8` y `#0759c6`), naranja `#c2410c` para las acciones y pasteles suaves por tratamiento. Regla de botones: **blanco sobre superficies oscuras y naranja sobre superficies claras**.
- **Tipografía:** escala `--fs-*` en `global.css`; ningún texto por debajo de 0,875 rem.
- **Movimiento:** una idea común, "la sonrisa se enfoca", con entradas distintas según el contenido y sin rebotes. Todo respeta `prefers-reduced-motion`.
- **El contenido siempre es visible si falla el JavaScript.** Sin JS, el asistente de cita se sustituye por un aviso con teléfono y WhatsApp.

## Accesibilidad y calidad

Verificado con Playwright en **Chromium, Firefox y WebKit** y con **axe-core** (WCAG 2.2 AA, 0 problemas):

- Recorrido completo con teclado, foco visible y enlace para saltar al contenido.
- Radios reales en la cita (tratamiento, día y hora), anuncio del paso actual a lectores de pantalla y copias del carrusel marcadas como `aria-hidden` e `inert`.
- Sin scroll horizontal de 320 a 2560 px.
- Peso aproximado de la página: 1,5 MB en 22 peticiones.

Los scripts de prueba no forman parte del repositorio.

## Antes de publicar

- [ ] **Quitar `noindex`:** en el `<head>` hay `<meta name="robots" content="noindex, nofollow">` para que la demo no aparezca en buscadores. Elimínalo en la web definitiva.
- [ ] **Vista previa al compartir:** `og:image` y `twitter:image` usan una ruta relativa. WhatsApp, Facebook y X necesitan la **dirección absoluta**, por ejemplo `https://tu-dominio.com/assets/img/og-image.jpg`. Cambia también `og:url` si lo añades.
- [ ] **Sustituir los datos de ejemplo:** teléfono (`900 000 000`), WhatsApp (`+34 900 000 000`), correo (`hola@perladental.demo`), dirección, horario, nombres y especialidades del equipo y la cifra "8.000+".
- [ ] **Conectar el formulario de cita:** ahora solo muestra un resumen en pantalla. Hay que enviarlo a un correo o a un sistema de agenda.
- [ ] **Redes sociales y política de privacidad:** se quitaron los enlaces porque no había destinos reales.
- [ ] **Tipografías:** se cargan desde Google Fonts. En producción conviene alojarlas en el propio sitio.
- [ ] **Zona horaria:** "Abierto ahora" usa la hora del visitante, no la de la clínica.

Para publicar solo hacen falta `index.html`, `favicon.ico`, `css/`, `js/` y `assets/`. No subas `dev-server.js`, `.claude/` ni `_recursoslocales/`.

## Despliegue en Vercel

Es un sitio estático: no necesita comando de build ni carpeta de salida.

1. En Vercel, **Add New → Project** e importa el repositorio de Git.
2. Framework Preset: **Other**. Deja vacíos *Build Command* y *Output Directory*, y como *Root Directory* la raíz del repo.
3. Despliega. El archivo `.vercelignore` evita que se publiquen `dev-server.js`, `.claude/`, `_recursoslocales/` y este README.
4. Con la URL final (por ejemplo `https://perla-dental.vercel.app`), actualiza `og:image`, `twitter:image` y `og:url` en `index.html` con la dirección absoluta y vuelve a desplegar.

También se puede desplegar desde la terminal con `npx vercel` (y `npx vercel --prod` para producción).

## Créditos y licencias

- Diseño y desarrollo: **Astravia Studio**.
- Las fotografías están generadas con IA (Flow).
- [Lenis](https://github.com/darkroomengineering/lenis), licencia MIT (copia en `assets/vendor/LENIS-LICENSE.txt`).
- [Tabler Icons](https://tabler.io/icons), licencia MIT.
- Bricolage Grotesque y Figtree, licencia SIL Open Font License (Google Fonts).
- La carpeta `.claude/skills/` contiene las skills de Claude Code usadas en el proyecto (diseño, crítica, accesibilidad y copy).

**Licencia del proyecto:** pendiente de definir.
# astraviastudio-perladental
