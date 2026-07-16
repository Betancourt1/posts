# fbetancourt.work

Sitio personal bilingue servido por Astro SSR como Cloudflare Worker. Los archivos Markdown en Git son la fuente canonica del contenido; D1 mantiene la proyeccion consultable que usa el runtime y R2 almacena los medios publicados.

## Estructura del proyecto

- `edge/`: aplicacion de produccion.
  - `src/pages/`: rutas publicas, rutas protegidas de autoria y APIs.
  - `src/views/`, `src/layouts/` y `src/components/`: renderizado Astro.
  - `src/lib/`: consultas D1, proyeccion de Markdown, reconciliacion con GitHub y acceso a medios.
  - `client/`: comportamiento que se ejecuta en el navegador.
  - `db/migrations/`: esquema de la proyeccion D1.
  - `scripts/`: preparacion de assets, seed de D1 y sincronizacion de medios.
- `content_en/`: Markdown en ingles, servido desde `/`.
- `content_es/`: Markdown en espanol, servido desde `/es/`.
  - `posts/<anio>/<mes>/`: escritos.
  - `zettelkasten/`: notas publicables.
  - `lit/`: lecturas y citas.
  - `about/`, `cv/` y `proyectos-*`: otras secciones.
- `functions/`: logica compartida por los editores y las rutas de administracion; Astro la adapta bajo `/admin/`.
- `static/`: fuentes de CSS, tipografias, iconos, scripts compartidos y medios locales.
- `tools/`: utilidades locales de autoria, contenido y QA.
- `data/`: datos adicionales que consume el runtime, como el portafolio de codigo.

## Flujo del contenido

1. `content_en/` y `content_es/` guardan el Markdown canonico en GitHub.
2. El seed, el webhook de GitHub o una mutacion del editor proyectan el Markdown a D1.
3. Las rutas Astro consultan D1 y renderizan HTML en el Worker.
4. La busqueda, el grafo, los tags, backlinks y archivos usan esa misma proyeccion.
5. Las imagenes publicadas se guardan en R2 y se sirven desde `/uploads/*`.

Cambiar contenido no requiere reconstruir toda la aplicacion. Cambiar codigo, componentes o assets si requiere compilar y desplegar el Worker.

## Desarrollo y despliegue

Ejecuta los comandos de produccion desde `edge/`:

```bash
cd edge

# Preparar una D1 local desde el Markdown del repositorio
npm run db:seed:local

# Ejecutar Astro localmente
npm run dev

# Pruebas y build del Worker
npm test
npm run build

# Revisar el build localmente
npm run preview

# Desplegar codigo de produccion cuando este explicitamente en alcance
npm run deploy
```

Para una reconstruccion remota completa de la proyeccion, usa `npm run db:seed:remote`. Para copiar los archivos existentes de `static/uploads/` a R2, usa `npm run media:sync`; valida primero con `npm run media:sync:dry-run`.

Un `git push` no despliega el Worker. Los cambios de codigo llegan a produccion mediante `npm run deploy` desde `edge/`.

## Contenido y utilidades locales

La guia completa esta en `CONTENT.md`; la separacion de Notebook, Post e Imagen esta en `docs/editor-architecture.md`.

Desde la raiz del repositorio:

```bash
# Crear contenido sin recordar rutas internas
npm run new:post -- "Titulo del texto"
npm run new:zettel -- "Idea concreta"
npm run new:page -- "Nombre de la pagina" --lang es

# Revisar contratos de editores y contenido
npm test
npm run test:editors
npm run site -- preflight

# Levantar solo la API/editor de archivos local cuando sea necesario
npm run author:api

# Preparar evidencia para una revision visual del editor local
npm run visual:qa -- --feature "mobile author editor" --target editor=http://127.0.0.1:3001/editor?theme=dark
```

Los comandos de creacion generan `draft: true` para evitar publicaciones accidentales. Usa nombres de archivo en minusculas y con guiones bajos, por ejemplo `politica_como_identidad.md`. Para conservar una pagina accesible por URL pero excluirla de listados, busqueda, archivos, infraestructura y grafo, usa `hidden: true`; `no_post*` sigue soportado como convencion heredada.

`npm run author:api` es un editor local aislado que escribe directamente en el filesystem. No levanta Astro ni actualiza D1; despues de usarlo, vuelve a ejecutar `cd edge && npm run db:seed:local` antes de revisar el contenido en el runtime local.

## Autoria en produccion

La superficie protegida vive bajo `/admin/` y requiere Cloudflare Access. Al guardar, el editor persiste el Markdown en GitHub, completa la sincronizacion opcional con Are.na y actualiza la proyeccion D1. Los uploads del editor de produccion se escriben directamente en R2.

La disponibilidad publica nunca debe depender de esperar un despliegue de codigo: contenido y codigo tienen ciclos distintos.

## QA visual

Para cambios de interfaz, inicia primero `npm run author:api`. La CLI de QA genera capturas y un manifiesto en `tmp/visual-qa/<fecha>-<feature>/`:

```bash
npm run visual:qa -- \
  --feature "mobile author editor" \
  --reference /tmp/mockup.png \
  --target editor=http://127.0.0.1:3001/editor?theme=dark \
  --target editor_props=http://127.0.0.1:3001/editor?theme=dark \
  --click "editor_props=#top-settings-button" \
  --assert-responsive
```

`--assert-responsive` falla si encuentra overflow horizontal o controles moviles menores a 44 px.
