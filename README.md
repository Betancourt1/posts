# fbetancourt.work

Sitio personal estatico construido con [Hugo](https://gohugo.io/), busqueda local via Pagefind y despliegue en Cloudflare Pages.

## Estructura del proyecto

- `content_en/`: contenido en ingles; es el idioma default y se sirve desde `/`.
- `content_es/`: contenido en espanol; se sirve desde `/es/`.
  - `content_es/posts/<anio>/<mes>/`: escritos.
  - `content_es/zettelkasten/`: notas publicables.
  - `content_es/lit/`: lecturas y citas.
  - `content_es/about/`, `content_es/cv/`, `content_es/proyectos-*`: secciones del sitio.
- `layouts/`: templates de Hugo (`_default/`, `partials/`, `archives/`).
- `static/`: archivos estaticos que se copian tal cual al sitio generado.
- `static/pagefind/`: respaldo versionado del indice de busqueda.
- `public/`: salida generada del sitio; no se edita a mano.
- `archetypes/`: plantillas para nuevo contenido.
- `legacy/`: archivos historicos fuera del flujo principal de publicacion.

## Comandos utiles

Desde la raiz del repo:

```bash
# Desarrollo local, incluyendo borradores
npm run dev

# Desarrollo local con UI de autoria en navegador
npm run author

# Crear contenido sin recordar rutas internas
npm run new:post -- "Titulo del texto"
npm run new:zettel -- "Idea concreta"
npm run new:page -- "Nombre de la pagina" --lang es

# Build de produccion con indice de busqueda en public/pagefind
npm run build

# Build de produccion y sincronizacion de static/pagefind
npm run build:local
```

Si tienes `hugo` en PATH, tambien puedes usar `hugo server -D` y `hugo --gc --minify`.

## Crear contenido

La guia corta de autoria esta en `CONTENT.md`.

Para escribir desde el navegador usa:

```bash
npm run author
```

Ese modo agrega un panel local `Author` para crear notebooks, abrir una pestaña de editor para posts/paginas, editar la pagina actual, subir imagenes y escribir con modo `Typewriter`. El build de produccion no incluye ese panel.

```bash
# Nuevo post en espanol
npm run new:post -- "Mi post"

# Nueva nota zettelkasten
npm run new:zettel -- "Mi nota"

# Nueva pagina independiente
npm run new:page -- "Mi pagina" --lang es
```

Los comandos crean archivos con `draft: true` para evitar publicar por accidente. Usa nombres de archivo en minusculas y con guiones bajos para posts, por ejemplo `politica_como_identidad.md`. Para ocultar una pagina de listados, archivos, grafo de conocimiento, infraestructura y busqueda, usa `hidden: true` en el front matter o `--hidden` al crearla. Los archivos `no_post*` siguen funcionando como convencion heredada.

## Busqueda (Pagefind)

`npm run build` ejecuta Hugo y Pagefind. Para actualizar el respaldo versionado en `static/pagefind/`, ejecuta:

```bash
npm run build:local
```

Para despliegues en Cloudflare Pages usa `npm run build` como build command y `public` como output directory. Si el deploy solo ejecuta `hugo`, el boton de busqueda aparece pero los archivos `pagefind/*` no se generan.

## Cache y despliegue

- Las cabeceras HTTP para Cloudflare Pages estan en `static/_headers`.
- El deploy de Pages se alimenta desde la rama `main`.
