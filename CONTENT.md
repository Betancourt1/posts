# Editar contenido

El contenido canónico vive en `content/`, organizado por sección. Puedes escribir en cualquier idioma. Las variantes que compartían nombre conservan sus archivos y sus rutas previas mediante el mapa de migración.

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
# Post dentro de content/posts/<anio>/<mes>/
npm run new:post -- "Titulo del texto"

# Nota zettelkasten
npm run new:zettel -- "Idea concreta"

# Página independiente
npm run new:page -- "Nombre de la pagina"

# Pagina dentro de una seccion existente
npm run new:page -- "Nuevo proyecto" --section proyectos-profesionales
```

Los comandos crean borradores con `draft: true`. Para publicar, cambia el valor a `false` o usa `--publish` al crear el archivo.

Usa `hidden: true` cuando una pieza deba seguir accesible por su URL pero no aparecer en listados, busqueda, archivos, infraestructura o grafo. Tambien puedes crearla con `--hidden`.

## Editar piezas existentes

Las rutas habituales son:

- Posts: `content/posts/<anio>/<mes>/<archivo>.md`
- Zettelkasten: `content/zettelkasten/<archivo>.md`
- Lecturas: `content/lit/<archivo>.md`
- Proyectos: `content/proyectos-*/*.md`
- Páginas principales: `content/<seccion>/index.md`

Para encontrar una pieza por titulo o palabra:

```bash
rg -n "texto que recuerdas" content
```

Conserva UTF-8, front matter conciso, tags claros y nombres de archivo en minusculas con guiones bajos.

### Proyectos

Cada archivo de `proyectos-profesionales/` es una pagina de proyecto: el front matter alimenta el catalogo y la cabecera, y el cuerpo es el caso completo. Ademas de `title`, solo `summary` es esencial para el catalogo; los demas campos son opcionales:

```yaml
summary: "Una frase para recruiters."
featured: true            # aparece primero, en grande
order: 1                  # menor primero, dentro de cada grupo
role: "Diseno y desarrollo"
period: "2025-2026"       # no se deduce de `date`
org: "Empresa o contexto"
status: live              # live | archived | private | research
highlights: ["Resultado concreto", "Otro resultado"]   # hasta 4; el catalogo muestra 3
technologies: ["Python", "SQL"]
project_links:            # el primer enlace valido es la accion del catalogo
  - type: demo            # demo | code | writing | data
    label: "Ver la demo"
    href: "https://example.org/"
```

- Escribe `highlights` y `technologies` entre corchetes con comillas dobles; las comas dentro de las comillas son validas (`"323,648 viajes"`).
- `status: private` (o, si falta `status`, el tag `private`) muestra una insignia y una nota de confidencialidad. Los enlaces solo se muestran si existen.
- Los valores de `status` no validos se ignoran y `highlights` se recorta a 4 al guardar.
- El editor del admin aun no expone `role`, `period`, `org`, `status`, `highlights` ni `order`, pero los conserva al guardar.

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
npm run site -- publish content/posts/2026/julio/archivo.md
npm run site -- hide content/posts/2026/julio/archivo.md
npm run site -- update content/posts/2026/julio/archivo.md --tags "ensayo, politica"
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
