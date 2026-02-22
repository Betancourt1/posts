# fbetancourt.work

Sitio personal estatico construido con [Hugo](https://gohugo.io/), con busqueda local via Pagefind y despliegue en Cloudflare Pages.

## Estructura del proyecto

- `content/`: contenido principal del sitio.
  - `content/posts/<anio>/<mes>/`: escritos.
  - `content/about/`, `content/cv/`, `content/proyectos-*`, `content/zettelkasten/`: secciones del portafolio.
- `layouts/`: templates de Hugo (`_default/`, `partials/`, `archives/`).
- `static/`: archivos estaticos que se copian tal cual al sitio generado.
- `public/`: salida generada del sitio.
- `archetypes/`: plantillas para nuevo contenido.
- `legacy/`: archivos historicos fuera del flujo principal de publicacion.

## Comandos utiles

Desde la raiz del repo:

```powershell
# Desarrollo local con borradores
.\tools\hugo\hugo.exe server -D

# Build de produccion
.\tools\hugo\hugo.exe --gc --minify
```

Si tienes `hugo` en PATH, puedes usar `hugo server -D` y `hugo --gc --minify`.

## Crear contenido

```powershell
# Nuevo post
.\tools\hugo\hugo.exe new posts/2026/febrero/mi_post.md

# Nueva nota zettelkasten (usa archetypes/zettel.md)
.\tools\hugo\hugo.exe new --kind zettel zettelkasten/mi_nota.md
```

## Busqueda (Pagefind)

Despues de generar `public/`, puedes regenerar el indice:

```powershell
npx pagefind --site public
```

## Cache y despliegue

- Las cabeceras HTTP para Cloudflare Pages estan en `static/_headers`.
- El deploy de Pages se alimenta desde la rama `main`.
