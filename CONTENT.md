# Editar contenido

Este sitio tiene dos raices de contenido:

- `content_es/`: contenido en espanol, publicado bajo `/es/`.
- `content_en/`: contenido en ingles, publicado bajo `/`.

Para escribir, usa los comandos de autor antes de tocar rutas a mano.

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

Ese comando muestra tambien borradores. Cuando el contenido ya este listo:

```bash
npm run build
```

Si cambias contenido indexable y quieres actualizar el respaldo versionado de busqueda:

```bash
npm run build:local
```
