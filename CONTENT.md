# Editar contenido

Este sitio tiene dos raices de contenido:

- `content_es/`: contenido en espanol, publicado bajo `/es/`.
- `content_en/`: contenido en ingles, publicado bajo `/`.

Para escribir, usa los comandos de autor antes de tocar rutas a mano.

## Escribir desde el navegador

```bash
npm run author
```

Abre `http://localhost:3000`. En la esquina inferior derecha aparece el boton `Author`.

Ese modo permite:

- Crear notebooks, que son carpetas con `_index.md`.
- Crear posts o paginas dentro de un notebook desde una pestaña de editor.
- Editar el post o pagina actual desde esa pestaña de editor.
- Editar el notebook actual desde esa pestaña de editor.
- Subir imagenes a `static/uploads/` e insertar el Markdown correspondiente.
- Activar `Typewriter` para escribir con la linea activa centrada.

Este modo usa una API local en `127.0.0.1:3001`. La UI de autor solo se renderiza con `npm run author`; `npm run build` no incluye los botones ni la API.

## Crear piezas nuevas

```bash
# Post en espanol, dentro de content_es/posts/<anio>/<mes>/
npm run new:post -- "Titulo del texto"

# Nota zettelkasten en espanol
npm run new:zettel -- "Idea concreta"

# Pagina independiente en espanol
npm run new:page -- "Nombre de la pagina" --lang es

# Pagina dentro de una seccion existente
npm run new:page -- "Nuevo proyecto" --lang es --section proyectos-profesionales
```

Los comandos crean borradores con `draft: true`, asi que puedes escribir sin publicar por accidente. Para publicar, cambia `draft: true` por `draft: false` o usa `--publish` al crear el archivo.

Si quieres que una pieza exista pero no aparezca en listados, busqueda, archivos o grafo, usa `hidden: true` o crea el archivo con `--hidden`.

## Editar piezas existentes

Las rutas importantes son:

- Posts: `content_es/posts/<anio>/<mes>/<archivo>.md`
- Zettelkasten: `content_es/zettelkasten/<archivo>.md`
- Lecturas: `content_es/lit/<archivo>.md`
- Proyectos: `content_es/proyectos-*/*.md` y `content_en/proyectos-*/*.md`
- Paginas principales: `content_es/<seccion>/index.md` y `content_en/<seccion>/index.md`

Para encontrar una pieza por titulo o palabra:

```bash
rg -n "texto que recuerdas" content_es content_en
```

## Revisar antes de publicar

```bash
npm run dev
```

Ese comando muestra tambien borradores, pero no levanta la API de escritura. Para editar desde el navegador usa `npm run author`. Cuando el contenido ya este listo:

```bash
npm run build
```

Si cambias contenido indexable y quieres actualizar el respaldo versionado de busqueda:

```bash
npm run build:local
```

## Administrar el sitio desde CLI

Para revisar, encontrar y administrar contenido sin recordar rutas:

```bash
npm run site -- status
npm run site -- list posts
npm run site -- find "texto que recuerdas"
npm run site -- drafts
```

Acciones utiles:

```bash
npm run site -- publish content_es/posts/2026/julio/archivo.md
npm run site -- hide content_es/posts/2026/julio/archivo.md
npm run site -- update content_es/posts/2026/julio/archivo.md --tags "ensayo, politica"
npm run site -- photo attach fotografia-slug ./foto.jpg --caption "Pie de foto"
npm run site -- media orphans
npm run site -- validate
npm run site -- preflight
```

La CLI usa `--dry-run` en acciones de escritura compatibles y `--json` en listados o diagnosticos.
