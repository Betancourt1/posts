# Editar contenido

El contenido canonico vive en dos raices Markdown:

- `content_es/`: contenido en espanol, publicado bajo `/es/`.
- `content_en/`: contenido en ingles, publicado bajo `/`.

GitHub conserva estos archivos. El runtime Astro no los recorre en cada request: los proyecta a D1 y consulta esa proyeccion para renderizar paginas, busqueda, tags, backlinks, archivos y el grafo de conocimiento.

## Escribir desde el navegador en produccion

La autoria real vive bajo `/admin/`, protegida por Cloudflare Access. Alli los cambios se guardan en GitHub, las imagenes se escriben en R2 y las mutaciones exitosas actualizan D1. Si se selecciona Are.na, su sincronizacion termina antes de volver a la Notebook elegida.

La superficie permite:

- Crear notebooks, que son carpetas con `_index.md`.
- Crear posts o paginas dentro de un notebook.
- Editar el post, pagina o notebook actual.
- Subir imagenes e insertar su Markdown.
- Activar `Typewriter` para mantener centrada la linea activa.

## Editor local aislado

Para trabajar directamente sobre los archivos locales, desde la raiz del repositorio:

```bash
npm run author:api
```

Este helper sirve los editores en `http://127.0.0.1:3001/` y escribe Markdown e imagenes en el filesystem. No levanta Astro, no usa Cloudflare Access y no actualiza D1. Es util para trabajo aislado del editor; `npm run test:editors` es la verificacion local segura de sus contratos.

Despues de editar archivos localmente, reconstruye la proyeccion antes de revisar el sitio:

```bash
cd edge
npm run db:seed:local
npm run dev
```

## Crear piezas nuevas

Desde la raiz del repositorio:

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

Los comandos crean borradores con `draft: true`. Para publicar, cambia el valor a `false` o usa `--publish` al crear el archivo.

Usa `hidden: true` cuando una pieza deba seguir accesible por su URL pero no aparecer en listados, busqueda, archivos, infraestructura o grafo. Tambien puedes crearla con `--hidden`.

## Editar piezas existentes

Las rutas habituales son:

- Posts: `content_es/posts/<anio>/<mes>/<archivo>.md`
- Zettelkasten: `content_es/zettelkasten/<archivo>.md`
- Lecturas: `content_es/lit/<archivo>.md`
- Proyectos: `content_es/proyectos-*/*.md` y `content_en/proyectos-*/*.md`
- Paginas principales: `content_es/<seccion>/index.md` y `content_en/<seccion>/index.md`

Para encontrar una pieza por titulo o palabra:

```bash
rg -n "texto que recuerdas" content_es content_en
```

Conserva UTF-8, front matter conciso, tags claros y nombres de archivo en minusculas con guiones bajos.

## Revisar antes de publicar

Valida el contenido desde la raiz:

```bash
npm run site -- validate
npm run site -- preflight
npm test
```

Valida el runtime de produccion desde `edge/`:

```bash
cd edge
npm test
npm run build
npm run preview
```

Para probar el sitio con una proyeccion D1 local creada desde el Markdown actual:

```bash
cd edge
npm run db:seed:local
npm run dev
```

Despues de un cambio de contenido ordinario no necesitas desplegar el Worker. El webhook o el editor actualizan D1. Usa `npm run db:seed:remote` solo para una reconstruccion remota completa.

## Administrar el contenido desde CLI

Desde la raiz del repositorio:

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

La CLI ofrece `--dry-run` en las acciones de escritura compatibles y `--json` en listados o diagnosticos.

## Medios

El editor local conserva archivos en `static/uploads/`; el editor desplegado usa R2. Para migrar o reconciliar los archivos locales con el bucket configurado en `edge/wrangler.jsonc`:

```bash
cd edge
npm run media:sync:dry-run
npm run media:sync
```

El runtime sirve esos objetos desde `/uploads/*` con su tipo de contenido y cache correspondiente.
