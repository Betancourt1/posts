# Visitas atribuidas a un CV

Los enlaces del CV pueden usar `https://fbetancourt.work/about/?cv_id=ID_OPACO`
o cualquier otra página pública, incluido `/es/about/`. Crea un ID aleatorio distinto
para cada **postulación y versión del CV**. No pongas nombres de empresas,
vacantes, correos ni personas en la URL. La relación `ID → empresa / vacante /
versión / fecha de envío` pertenece a una tabla privada fuera de este repositorio.

## Qué se registra

El navegador envía una sola petición `POST /api/cv-visits` por carga con
`{"cv_id":"…"}`. D1 guarda un número interno de evento, `cv_id` y `visited_at`
(segundos Unix UTC, generado por el servidor). No se recogen IP, user agent,
referente, ruta, cookies, huellas, ni un identificador persistente del visitante.
No hay eventos de interacción ni llamadas propias a `/cdn-cgi/rum`.

El script limpia `cv_id` antes de cargar los otros scripts y conserva los demás
parámetros, el fragmento y `history.state`. Los alias conservan la query hasta
llegar al destino. La URL canónica no incluye la query y los documentos con
`cv_id` usan `no-referrer`. El ID sí aparece en la petición inicial del documento;
esta implementación no cambia los registros de acceso que pueda mantener el
proveedor de hosting o un proxy.

Solo se intenta registrar en páginas públicas que existen, con JavaScript activo.
No se registra en `/admin/`, páginas 404, assets o APIs. No se propaga el ID a
enlaces internos. Recargar o volver a una URL ya limpiada no registra otra visita;
abrir nuevamente el enlace original sí puede hacerlo. Un fallo de red o D1 no
interrumpe la navegación, no se reintenta y puede perder la visita. Si el navegador
impide `replaceState`, la URL queda intacta y una nueva carga puede registrar otro
evento. No hay promesa de entrega exacta ni deduplicación entre dispositivos.

## Activación y operación privada

Se reutiliza el binding **DB** de `edge/wrangler.jsonc`; no requiere nuevos
servicios, credenciales ni cambios de Access. La migración
`edge/db/migrations/0003_cv_visits.sql` crea dos tablas separadas del contenido:
`cv_attributions` (IDs habilitados y caducidad) y `cv_visit_events` (visitas).
Los seeds de contenido no eliminan estas tablas. No hay API de lectura o alta
pública; tampoco se envía al cliente la lista de IDs habilitados.

Los ejemplos siguientes se ejecutan desde `edge/` y usan **D1 local**:

```sh
npm run db:migrate:local
node -e 'console.log(crypto.randomUUID())'
```

Copia el UUID generado en tu registro privado y sustituye `ID_GENERADO` en el SQL.
Se aceptan entre 16 y 64 caracteres ASCII: letras, dígitos, guion y guion bajo.
No reutilices los IDs de ejemplo ni uses IDs predecibles.

```sh
npx wrangler d1 execute DB --local --command "INSERT INTO cv_attributions (cv_id) VALUES ('ID_GENERADO');"
```

La caducidad predeterminada es de 180 días. En el CV coloca, por ejemplo,
`https://fbetancourt.work/es/about/?cv_id=ID_GENERADO`. **Un ID que no esté dado de
alta en la base del entorno de destino no guardará ninguna visita.**

Consulta privada por postulación/versión (la correspondencia comercial se busca
en tu registro externo, nunca en un endpoint público):

```sh
npx wrangler d1 execute DB --local --command "SELECT cv_id, COUNT(*) AS visitas, datetime(MIN(visited_at), 'unixepoch') AS primera_utc, datetime(MAX(visited_at), 'unixepoch') AS ultima_utc FROM cv_visit_events GROUP BY cv_id ORDER BY MAX(visited_at) DESC;"
npx wrangler d1 execute DB --local --command "SELECT id, datetime(visited_at, 'unixepoch') AS visita_utc FROM cv_visit_events WHERE cv_id = 'ID_GENERADO' ORDER BY visited_at DESC, id DESC;"
npx wrangler d1 execute DB --local --command "SELECT cv_id, enabled, datetime(expires_at, 'unixepoch') AS caduca_utc FROM cv_attributions;"
```

Para dejar de recibir visitas de un enlace o borrar su historial:

```sh
npx wrangler d1 execute DB --local --command "UPDATE cv_attributions SET enabled = 0 WHERE cv_id = 'ID_GENERADO';"
# El borrado del ID elimina sus eventos en cascada.
npx wrangler d1 execute DB --local --command "DELETE FROM cv_attributions WHERE cv_id = 'ID_GENERADO';"
```

La caducidad deja de aceptar visitas, pero no borra el historial automáticamente.
Para una retención de 180 días, el operador puede ejecutar periódicamente:

```sh
npx wrangler d1 execute DB --local --command "DELETE FROM cv_visit_events WHERE visited_at < unixepoch() - 15552000;"
```

**Producción pendiente de autorización:** revisar la cuenta y el binding DB,
aplicar la migración con `npm run db:migrate:remote`, desplegar mediante
`npm run deploy` y registrar los IDs con `--remote` en lugar de `--local`.
Esas acciones no forman parte de implementar/probar localmente. Tras autorizar y
ejecutar la activación, comprobar el enlace público y consultar D1 remota antes
de afirmar que está almacenando visitas en producción. Las consultas remotas
usan las credenciales existentes del operador y sus resultados deben ser privados.

## Límites e interpretación

- Son **visitas atribuidas al enlace**, no humanos confirmados, reclutadores
  identificados, visitantes únicos ni una medida de interés. No detectan si
  alguien abrió el PDF. Los bots que ejecuten JavaScript y los enlaces reenviados
  pueden registrar visitas con el mismo ID. Los bots sin JavaScript no lo harán.
- La API admite únicamente JSON con `cv_id`, hasta 128 bytes reales, y exige
  origen coincidente. Rechaza otros campos, métodos, orígenes y tipos de contenido.
  Origin ayuda frente a envíos desde otras webs; no autentica personas ni impide
  que un cliente programático lo falsifique.
- El alta privada, la caducidad y una inserción SQL atómica limitan cada ID a
  100 eventos en las últimas 24 horas y 1.000 filas totales. Al borrar historial
  se libera ese cupo. Son límites de almacenamiento, no protección completa del
  presupuesto de peticiones o D1. Quien conozca un enlace puede falsificar visitas
  o agotar su cupo; tampoco existe garantía de conteo exhaustivo.
- Se devuelve `204` vacío tanto al guardar como al ignorar un ID desconocido,
  deshabilitado, caducado o limitado. **204 no prueba persistencia**: la verificación
  exige consultar D1. Una falla de almacenamiento devuelve `503` sin detalles.
- La lista privada de correspondencia nunca debe añadirse a Markdown público,
  archivos estáticos, el bundle del cliente, Git ni las respuestas de la API.

## Comprobación local

```sh
# Desde la raíz: contratos compartidos
npm test
# Desde edge/: validación, límites concurrentes y persistencia tras reiniciar D1
npm test
npm run build
npm run db:seed:local
npm run preview
```

Registra un ID **en D1 local**, abre
`http://127.0.0.1:4321/es/about/?cv_id=ID_GENERADO&keep=1#contacto` y verifica:
una petición al endpoint, URL sin `cv_id` con `keep` y fragmento conservados,
una fila nueva en la consulta privada, y que dicha fila siga allí tras reiniciar
el preview. Recargar, cambiar de idioma y navegar no deben generar más eventos.
Prueba un ID inválido y uno no registrado: ninguno debe añadir filas. Con el
endpoint bloqueado u offline, la página y sus enlaces deben seguir funcionando.
