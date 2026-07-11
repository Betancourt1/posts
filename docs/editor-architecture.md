# Arquitectura de los editores

La autoria tiene tres entradas independientes: Notebook, Post e Imagen. Ninguna plantilla decide su tipo a partir de la URL una vez renderizada.

## Flujo

1. `editor-routing.js` clasifica la solicitud.
2. La ruta de compatibilidad `/editor` redirige a `/notebook-editor`, `/post-editor` o `/image-editor`.
3. Cada ruta carga su plantilla y su controlador inmutable.
4. Notebook y Post comparten solamente el motor visual de escritura.
5. Los tres editores usan el núcleo protegido `editor-core-client.js` para API, rutas, fechas, slugs y navegación.

## Responsabilidades

- `editor-routing.js`: única autoridad para elegir editor.
- `notebook-editor-controller.js`: capacidades exclusivas de notebooks.
- `post-editor-controller.js`: capacidades exclusivas de posts de texto.
- `image-editor-controller.js`: capacidades exclusivas de publicaciones de imagen.
- `writing-editor-template.js`: lienzo compartido por Notebook y Post; no clasifica contenido.
- `image-editor-template.js`: experiencia image-first.
- `editor-core-client.js`: infraestructura cliente sin decisiones de producto, servida únicamente bajo `/admin` en producción.
- `tools/editor_harness.mjs`: navegador y API aislados para regresiones.

## Invariantes

- Todo `/_index.md` es Notebook, incluso dentro de `fotografia/`.
- Un controlador no puede cambiarse mediante query parameters.
- Notebook nunca usa la publicación de posts en Are.na.
- Imagen requiere al menos un archivo o una imagen persistida.
- Guardar el blog y sincronizar Are.na siguen siendo operaciones distinguibles.
- Publicar regresa a la Notebook después del guardado; no espera el despliegue de Cloudflare.
- El arnés no usa el repositorio real, GitHub, Are.na ni credenciales.

## Decisión de producto: guardar no espera el despliegue

El orden obligatorio al pulsar `Guardar` o `Publicar` es:

1. Persistir el contenido en GitHub.
2. Sincronizar Are.na cuando esté seleccionado; si ya existe un vínculo y se desactiva, terminar esa desconexión.
3. Redirigir inmediatamente a la Notebook seleccionada.

Cloudflare Pages despliega de forma eventual y puede tardar varios minutos. La disponibilidad de la URL pública nunca debe bloquear la redirección del editor. Una verificación futura puede ejecutarse en segundo plano desde la Notebook, pero no debe insertarse entre la sincronización de Are.na y `redirectToNotebook()`.

El borrado es una excepción deliberada: puede verificar el 404 de la URL exacta para no comunicar una eliminación pública mientras una copia stale siga accesible. Esa comprobación no debe reutilizarse en el flujo de guardado.

## Pruebas

Pruebas unitarias rápidas:

```bash
npm test
```

Contrato completo de navegador, en 390x844 y 1280x800:

```bash
npm run test:editors
```

El arnés prueba los tres editores, sus controles exclusivos, el payload de guardado y la navegación final. Si falla, deja una captura en `/tmp/posts-editor-harness-*.png`; nunca escribe artefactos dentro del repositorio.

Antes de desplegar:

```bash
npm run site -- preflight
npm run build
```

## Regla para cambios futuros

Una capacidad nueva pertenece primero al controlador de un editor. Solo debe moverse al núcleo compartido cuando dos o más editores necesiten exactamente la misma semántica. Toda modificación de rutas o guardado debe añadir o ajustar primero un caso del arnés. Las pruebas de plantilla deben rechazar explícitamente cualquier espera de despliegue antes de `redirectToNotebook()`.
