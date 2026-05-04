# Guía de Integración Frontend — Kaan Core (v0.2.0-alpha)

> Este documento resume los endpoints y contratos del **Identity Kernel** para consumo desde cualquier frontend (React, Vue, Mobile, etc.).
> Para el catálogo completo de contratos, ver [`CONTRACTS.md`](CONTRACTS.md).

## Nota de Integración para FixFlow

Para FixFlow, el flujo de autenticación base (`/api/v1/auth/*`) ya está cubierto por Kaan Core y no requiere reimplementación en backend durante Fase 2.

En frontend (Expo), la prioridad de integración debe ser:

1. consumir login/refresh/me/logout y persistencia de token JWT;
2. consumir CRUD completo de `workspaces`;
3. consumir CRUD completo de `devices`;
4. consumir CRUD completo de `components` + carga de `component_photos`;
5. registrar `maintenance_logs`.

Resumen operativo actual de endpoints FixFlow en backend:

- Workspaces: `GET /workspaces`, `GET /workspaces/{id}`, `POST /workspaces`, `PUT/PATCH /workspaces/{id}`, `DELETE /workspaces/{id}`.
- Devices: `GET /workspaces/{workspace_id}/devices`, `POST /workspaces/{workspace_id}/devices`, `GET /devices/{device_id}`, `PUT/PATCH /devices/{device_id}`, `DELETE /devices/{device_id}`.
- Components: `GET /devices/{device_id}/components`, `GET /devices/{device_id}/components/{component_id}`, `POST /devices/{device_id}/components`, `PUT/PATCH /devices/{device_id}/components/{component_id}`, `DELETE /devices/{device_id}/components/{component_id}`.
- Component photos: `GET /components/{component_id}/photos`, `GET /components/{component_id}/photos/{photo_id}`, `POST /components/{component_id}/photos`, `PUT/PATCH /components/{component_id}/photos/{photo_id}`, `DELETE /components/{component_id}/photos/{photo_id}`.
- Maintenance wizard: `GET /devices/{device_id}/maintenance-wizard`, `POST /devices/{device_id}/maintenance-wizard/complete`.
- Maintenance wizard sessions: `POST /devices/{device_id}/maintenance-wizard/sessions/start`, `GET /maintenance-wizard/sessions/{session_id}`, `PATCH /maintenance-wizard/sessions/{session_id}/progress`, `POST /maintenance-wizard/sessions/{session_id}/save`, `POST /maintenance-wizard/sessions/{session_id}/save-and-exit`, `POST /maintenance-wizard/sessions/{session_id}/complete`.
- Wizard sessions list: `GET /maintenance-wizard/sessions?status=paused|in_progress|completed&device_id={id}`.
- Maintenance timeline: `GET /devices/{device_id}/maintenance-timeline`.
- Maintenance logs: `POST /devices/{device_id}/maintenance-logs`.
- Export specs (Excel-compatible CSV): `GET /devices/{device_id}/exports/specs/excel`.
- Export maintenance + observations (Excel-compatible CSV): `GET /devices/{device_id}/exports/maintenance/excel`.
- Export maintenance + observations (PDF): `GET /devices/{device_id}/exports/maintenance/pdf`.

Flujo recomendado para el boton "Comenzar mantenimiento":

1. Llamar `POST /devices/{device_id}/maintenance-wizard/sessions/start` para crear sesión persistente.

- Si ya existe sesión activa para ese dispositivo, backend devolverá la existente (`data.reused=true`) en vez de crear duplicada.
- Tomar siempre el id desde `data.session.id`.

2. Renderizar checklist opcional y guardar progreso con `PATCH /maintenance-wizard/sessions/{session_id}/progress` en cada avance.
3. Botón Guardar manual: `POST /maintenance-wizard/sessions/{session_id}/save`.
4. Botón Guardar y seguir después: `POST /maintenance-wizard/sessions/{session_id}/save-and-exit`.
5. Para reanudar, cargar `GET /maintenance-wizard/sessions/{session_id}`.
6. Al terminar, completar con `POST /maintenance-wizard/sessions/{session_id}/complete`.
7. Para plan `free`, ocultar/inhabilitar observaciones por componente (`component_steps[].observation`) porque backend lo bloquea con `403 AUTH_FORBIDDEN`.
8. Pantalla historial: usar `GET /devices/{device_id}/maintenance-timeline`.
9. Tarjeta "Continuar después": usar `GET /maintenance-wizard/sessions?status=paused`.

El estado operativo de esta adopción se mantiene en `PROGRESS.md` y en `API_DOCS.md`.

## Reglas Generales

- **Base URL:** `https://tu-dominio.com/api/v1`
- **Headers requeridos:** `Accept: application/json` + `Authorization: Bearer <access_token>` (endpoints protegidos)

### Matriz operativa de planes para frontend (FixFlow)

Consumir siempre el plan desde `data.user.plan` (login) o `data.plan` (`/auth/me`) y aplicar estas reglas de UI:

| Capacidad                          |               Free |        Pro |      Premium |   Enterprise | Recomendación UI                                                                    |
| ---------------------------------- | -----------------: | ---------: | -----------: | -----------: | ----------------------------------------------------------------------------------- |
| Crear workspace                    |                  1 |          2 |            3 |   Ilimitados | Deshabilitar botón al llegar al límite y mostrar motivo                             |
| Crear equipo por workspace         |                  2 |          8 |           10 |   Ilimitados | Bloquear CTA dentro del workspace al superar límite                                 |
| Componentes por equipo             |    1 por categoría | Ilimitados |   Ilimitados |   Ilimitados | En `free`, bloquear si ya existe 1 del mismo `category`                             |
| Subir fotos por componente         |                 No | Ilimitadas |   Ilimitadas |            1 | Ocultar/inhabilitar módulo de fotos en `free`; en `enterprise` bloquear tras 1 foto |
| Wizard de mantenimiento            | Básico (sin notas) |   Completo |     Completo |     Completo | Ocultar campo observación y notas en `free`                                         |
| Exportar inventario (Excel)        |                 No |         Si |           Si |           Si | Mostrar CTA de export solo en Pro+                                                  |
| Exportar mantenimiento (PDF/Excel) |                 No |         No |           Si |           Si | Mostrar CTA de historial exportable solo en Premium+                                |
| Colaboradores                      |                 No |         No | Próximamente | Próximamente | No mostrar en UI hasta que exista endpoint documentado                              |

Notas de integración:

- Aunque el frontend oculte funciones por plan, backend mantiene la validación final (fuente de verdad).
- Si backend responde `403 AUTH_FORBIDDEN` por plan, mostrar mensaje de upgrade sin reintentos automáticos.
- Si backend responde `403 PLAN_LIMIT_REACHED`, el límite del plan fue alcanzado (ej: fotos por componente en Enterprise).
- Export de inventario devuelve `data.content_base64` (CSV) y frontend debe decodificarlo para descarga local.
- Export de mantenimiento devuelve `data.content_base64` (CSV) incluyendo observaciones por componente cuando existan.
- Export PDF de mantenimiento devuelve `data.content_base64` con `mime_type=application/pdf` para vista/descarga.
- En plan `free`, ocultar/inhabilitar el campo `component_steps[].observation` del wizard — backend lo bloquea con `403 AUTH_FORBIDDEN`.
- Capacidades como colaboradores y SSO no deben exponerse en UI hasta que exista endpoint público documentado.

### Base URL en desarrollo móvil

- Android Emulator: usar `http://10.0.2.2:<puerto>/api/v1` en vez de `localhost`.
- Dispositivo Android físico: usar la IP LAN de tu PC (`http://<tu-ip-local>:<puerto>/api/v1`).
- Si el backend corre con `php artisan serve`, iniciarlo idealmente con `--host=0.0.0.0` para exponerlo fuera de loopback.
- Si la app Android usa HTTP plano en desarrollo, verificar que el cliente permita cleartext traffic; si no, Axios puede lanzar `Network Error` sin llegar al backend.

### Contrato de Respuesta (Envelope)

```json
// Éxito
{ "ok": true, "data": { ... } }

// Error (details SIEMPRE presente, puede ser null)
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Texto legible.",
    "details": null
  }
}
```

> **Invariante:** `error.details` siempre está presente en la respuesta de error (nunca se omite la key). Si no hay detalles adicionales, su valor es `null`. En `VALIDATION_ERROR` (422), `details` es un mapa `{ campo: [mensajes...] }`.

---

## 1) Autenticación y Onboarding

### Login

`POST /auth/login`

- **Body:** `{ "login": "email_o_username", "password": "..." }`
- **Response (200):** `data.access_token`, `data.token_type`, `data.expires_in`, `data.user`
- **Errores posibles:** `AUTH_INVALID` (401), `AUTH_USER_INACTIVE` (403), `AUTH_EMAIL_NOT_VERIFIED` (403), `AUTH_TOO_MANY_ATTEMPTS` (429), `AUTH_ACCOUNT_LOCKED` (429)

### Refresh

`POST /auth/refresh`

- **Header:** enviar el token actual (aunque esté próximo a expirar).
- **Response (200):** nuevo `access_token` + `expires_in`.
- **Errores posibles:** `AUTH_TOKEN_INVALID` (401), `AUTH_TOKEN_REVOKED` (401), `AUTH_SESSION_NOT_FOUND` (401), `AUTH_SESSION_EXPIRED` (401), `AUTH_JWT_ERROR` (401), `AUTH_USER_INACTIVE` (403), `AUTH_EMAIL_NOT_VERIFIED` (403)

### Registro Público

`POST /auth/register` (requiere `KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION=true`)

- **Body:** `name`, `email`, `password`, `password_confirmation`, `profile` (opcional: `{ "phone": "...", "company": "..." }`)
- **Política de contraseña:** mínimo 12 caracteres, al menos una mayúscula, una minúscula y un número.
- **Response (201):** `data.user` + `data.access_token` (si status=active y flag issue_token=true)
- **Errores posibles:** `REGISTRATION_DISABLED` (403), `VALIDATION_ERROR` (422), `AUTH_TOO_MANY_REQUESTS` (429)

### Verificación de Email

- **Link firmado:** `GET /auth/verify-email/{id}/{hash}` → redirige al frontend con query params (`verified=1/0`).
  - _Si envías `Accept: application/json`, devuelve `200 { ok:true, data:{ verified, message } }` (sin redirect)._
- **Estado (Check):** `GET /auth/email/verification-status` (requiere auth).
- **Resend:** `POST /auth/email/verification-notification` (requiere auth).
- **Errores posibles:** `AUTH_VERIFICATION_INVALID` (403), `AUTH_TOO_MANY_REQUESTS` (429)

### Password Reset

- **Forgot:** `POST /auth/forgot-password` (Body: `{ "email": "..." }`). Siempre devuelve 200 (no revela si existe).
  - **Errores posibles:** `VALIDATION_ERROR` (422), `AUTH_TOO_MANY_ATTEMPTS` (429 + Retry-After)
- **Reset:** `POST /auth/reset-password` (Body: `email`, `token`, `password`, `password_confirmation`).
  - **Política de contraseña:** mínimo 12 caracteres, al menos una mayúscula, una minúscula y un número.
  - Revoca TODAS las sesiones activas del usuario automáticamente.
  - **Errores posibles:** `VALIDATION_ERROR` (422), `AUTH_PASSWORD_RESET_INVALID` (422), `AUTH_TOO_MANY_ATTEMPTS` (429 + Retry-After)

Correos del flujo de contraseña:

- Forgot password envía enlace de restablecimiento.
- Reset password exitoso envía correo de alerta de cambio de contraseña.
- Cambio de contraseña desde `PUT /auth/me` también envía correo de alerta.

### Billing Stripe (Suscripciones)

- **Checkout session:** `POST /billing/checkout-session` (auth requerida).
  - Body: `plan` (`pro|premium|enterprise`), `success_url`, `cancel_url`.
  - Response (201): `data.session_id`, `data.checkout_url`, `data.plan`.
- **Mobile PaymentSheet intent:** `POST /billing/mobile/subscription-intent` (auth requerida).
  - Body: `plan` (`pro|premium|enterprise`).
  - Response (201): `data.customer_id`, `data.ephemeral_key`, `data.payment_intent_client_secret`, `data.subscription_id`, `data.plan`, `data.publishable_key`.
- **Webhook Stripe:** `POST /billing/webhooks/stripe` (sin auth JWT; validación por firma Stripe).

Requisitos backend para operación:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_EPHEMERAL_KEY_API_VERSION`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PREMIUM_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`

Flujo frontend recomendado:

1. Llamar `POST /billing/checkout-session` con `plan` y URLs de retorno.
2. Redirigir al usuario a `data.checkout_url`.
3. Esperar sincronización de plan vía webhook y refrescar sesión con `GET /auth/me` al volver a app.

Flujo mobile recomendado (PaymentSheet nativo):

1. Llamar `POST /billing/mobile/subscription-intent` con `plan`.
2. Inicializar PaymentSheet con `customer_id`, `ephemeral_key`, `payment_intent_client_secret` y `publishable_key`.
3. Presentar PaymentSheet dentro de la app (sin WebView externa).
4. Tras pago exitoso, refrescar sesión con `GET /auth/me` para obtener el plan sincronizado.

Correo transaccional de billing:

- Cuando el plan cambia efectivamente por webhook de Stripe, backend envía correo de confirmación de cambio de plan con nombre legible del plan (Free / Pro / Premium / Enterprise) y el motivo del cambio.
- Para cancelaciones/downgrades, el subject del correo es distinto: **"Tu suscripción ha finalizado"**.

### Google Sign-In

- **Endpoint disponible:** `POST /auth/google/exchange`
- **Payload:** `{ "id_token": "<google_id_token>" }`
- **Respuesta:** misma forma que login tradicional (`data.token_type`, `data.access_token`, `data.expires_in`, `data.user`).

Reglas de integración:

- Frontend debe obtener `id_token` desde el SDK oficial de Google para cada plataforma.
- Backend valida el token contra Google y contra `KAAN_AUTH_GOOGLE_CLIENT_IDS`.
- Si el email no viene verificado por Google, backend responde `403 AUTH_EMAIL_NOT_VERIFIED`.
- Si Google login está apagado en backend, responde `403 AUTH_FORBIDDEN`.

Checklist frontend para botón Google:

1. Obtener `id_token` válido en cliente.
2. Enviarlo a `POST /auth/google/exchange`.
3. Guardar `data.access_token` exactamente igual que en login normal.
4. Reusar el mismo estado/auth store y refresh flow existentes.

Nota para el setup actual de FixFlow:

- Web y Android usarán un flujo unificado.
- El backend de FixFlow debe validar el `id_token` contra el **Web Client ID** configurado en Google Cloud.
- El `applicationId` Android (`com.kaanforge.fixflow`) y el `SHA-1` son necesarios para Google Sign-In en Android, pero no se envían ni se validan directamente en el backend.

### Paso a paso manual para dejar operativo registro + verificación + reset

#### Lo que debe hacer backend/infra

1. Configurar un SMTP real en `.env`.
2. Activar `KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION=true`.
3. Definir `KAAN_FRONTEND_VERIFY_EMAIL_URL` y `KAAN_FRONTEND_RESET_PASSWORD_URL`.
4. Limpiar caché de configuración con `php artisan config:clear`.
5. Probar envío real de correos antes de integrar el frontend.

#### Lo que debe hacer frontend

1. Crear pantalla de registro que consuma `POST /auth/register`.
2. Crear pantalla de “revisa tu correo” tras registro cuando el entorno requiera verificación.
3. Crear pantalla de “forgot password” que consuma `POST /auth/forgot-password`.
4. Crear pantalla de reset que lea `email` y `token` desde la URL del frontend y consuma `POST /auth/reset-password`.
5. Crear pantalla de resultado para verificación de email leyendo los query params de retorno del backend.

#### URLs mínimas recomendadas en frontend

- Verificación de email: `/auth/verify-email`
- Reset de password: `/auth/reset-password`
- Login: `/login`
- Registro: `/register`
- Forgot password: `/forgot-password`

#### Comportamiento recomendado del frontend

- Si `register` devuelve token, guardar `data.access_token` igual que en login.
- Si el backend exige email verificado, mostrar estado claro y acción para reenviar verificación.
- En forgot password, no revelar si el correo existe; respetar siempre el mensaje genérico del backend.
- En reset exitoso, redirigir a login y pedir autenticación nuevamente.

---

## 2) Self-Service (Cuenta del Usuario)

### Logout

`POST /auth/logout`

- Revoca el token actual y marca la sesión como cerrada en DB.
- **Response (200):** `{ "ok": true, "data": { "message": "Sesión cerrada correctamente." } }`
- **Acción recomendada:** limpiar `access_token` local y redirigir a Login.

### Perfil ("Me")

`GET /auth/me`

- Retorna `data.id`, `data.name`, `data.email`, `data.roles[]`, `data.permissions[]`.
- **Tip:** Usa `permissions` para mostrar/ocultar secciones del UI (nunca basarse en el nombre del rol).

### Actualizar Perfil y Contraseña

`PUT /auth/me`

- Endpoint autenticado para actualizar `name`, `username`, `email` y tambien contraseña desde la pantalla de perfil.
- Si se envia `password`, tambien se requiere `current_password` y `password_confirmation`.

Payload recomendado para cambio de contraseña desde perfil:

```json
{
  "current_password": "ClaveActual123",
  "password": "NuevaClave123",
  "password_confirmation": "NuevaClave123"
}
```

Regla de UX para frontend:

- Usuario autenticado que recuerda su clave actual: usar `PUT /auth/me`.
- Usuario que no puede iniciar sesion o no recuerda su clave: usar `POST /auth/forgot-password` + `POST /auth/reset-password`.

Errores comunes en `PUT /auth/me`:

- `401 AUTH_UNAUTHENTICATED` si no hay token valido.
- `422 VALIDATION_ERROR` si `current_password` no coincide o si falta `password_confirmation`.

### Gestión de Sesiones (Security Hub)

Base: `/auth/sessions`

- `GET /` — Lista dispositivos activos (IP, User Agent, Last Seen).
- `DELETE /{id}` — Revoca una sesión (idempotente; devuelve `was_already_revoked`). **Nota:** `id` expuesto por este endpoint es un ULID string (identificador público), no el PK numérico interno; el endpoint acepta únicamente ese ID público.
- `POST /revoke-others` — Cierra todas excepto la actual.
- `POST /revoke-all` — Cierra absolutamente todo (incluye la actual).

---

## 3) Control Plane (Administración)

> **Regla de Oro:** basa tu UI en los permisos del usuario (`admin.users.manage`, `admin.audit.view`, etc.) y no en el nombre del rol.

- **Usuarios:** `GET/POST /admin/users`, `GET/PATCH/DELETE /admin/users/{ulid}`. Soporta `?q=`, `?status=`, paginación.
  - Para asignar rol en creación (`POST /admin/users`), enviar `role` (name) o `role_id` (public_id ULID del rol).
  - Para cambio de rol en `PUT/PATCH /admin/users/{ulid}`, enviar `role` (name) o `role_id` (public_id ULID del rol).
- **Roles:** `GET/POST /admin/roles`, `GET/PUT/PATCH/DELETE /admin/roles/{id}` donde `id` es ULID público del rol.
- **Permisos:** `GET /admin/permissions`.
- **Auditoría:** `GET /admin/audit-logs` (permiso `admin.audit.view`). Soporta `?user_id=`, `?action=`, `?from=`, `?to=`.
- **Seguridad:** `GET /admin/security/login-attempts` (permiso `admin.security.view`). Soporta `?q=`, `?ip=`, `?status=`, `?from=`, `?to=`.

### Dashboard

`GET /admin/dashboard/summary`

- No requiere permiso específico — filtra la respuesta según los permisos del usuario autenticado.
- **Response (200):** `data.metrics` + `data.recent_activity`. Los campos presentes dependen de los permisos:

| Campo                                      | Permiso requerido                                |
| ------------------------------------------ | ------------------------------------------------ |
| `metrics.users` (total, active, suspended) | `admin.users.manage`                             |
| `metrics.roles`                            | `admin.roles.manage`                             |
| `metrics.active_sessions`                  | `admin.security.view` + feature `admin_security` |
| `metrics.failed_logins_24h`                | `admin.security.view` + feature `login_attempts` |
| `recent_activity.login_attempts`           | `admin.security.view` + feature `login_attempts` |
| `recent_activity.audit_logs`               | `admin.audit.view` + feature `audit`             |

- **Tip:** Renderiza solo las secciones cuyas keys existen en `data.metrics` — no asumas que todas están presentes.

### Service Accounts y API Keys

Base: `/admin/service-accounts`

- `GET /admin/service-accounts` — Lista service accounts (permiso `admin.service_accounts.manage`). Soporta paginación estándar.
- `POST /admin/service-accounts` — Crea un service account.
- `GET /admin/service-accounts/{ulid}` — Detalle de un service account.
- `PUT/PATCH /admin/service-accounts/{ulid}` — Actualiza un service account.

API Keys de un service account (permiso `admin.api_keys.manage`):

- `GET /admin/service-accounts/{ulid}/api-keys` — Lista las API keys del service account.
- `POST /admin/service-accounts/{ulid}/api-keys` — Genera una nueva API key. **La clave solo se muestra una vez en la respuesta** — el frontend debe pedirle al usuario que la guarde.
- `POST /admin/api-keys/{ulid}/rotate` — Rota una API key (invalida la anterior, genera una nueva).
- `DELETE /admin/api-keys/{ulid}` — Revoca una API key permanentemente.

### Policy Center (M5)

Base: `/admin/policies`

- `GET /admin/policies` (permiso `admin.policies.view`): lista policies agrupadas y devuelve `ETag: W/"policy-v{n}"`.
- `GET /admin/policies/{key}` (permiso `admin.policies.view`): detalle por policy.
- `PATCH /admin/policies` (permiso `admin.policies.manage`): actualización batch atómica.

Notas de consumo:

- Si una policy es sensible (`meta.sensitive=true`), la API devuelve `value: null` y `meta.redacted=true`.
- El payload de `GET /admin/policies` incluye `data.degraded=true` cuando el sistema cae en modo degradado y opera con defaults.
- Si `KAAN_FEATURE_POLICY_CENTER=false`, los endpoints responden `404 RESOURCE_NOT_FOUND` (ruta no registrada).

### Paginación estándar

Todos los listados devuelven:

```json
{ "ok": true, "data": { "data": [...], "links": {...}, "meta": { "current_page": 1, "per_page": 15, "total": 42 } } }
```

Parámetros: `?page=N&per_page=N` (default 15).

Regla de límites:

- Hard cap técnico: `per_page <= 1000`.
- Máximo real en runtime: gobernado por Policy Center (`api.pagination.max_per_page`).

### Health y observabilidad mínima

`GET /health`

- Endpoint público para monitoreo básico.
- Incluye:
  - `data.db` (estado de conectividad DB)
  - `data.policy_center_enabled` (si el módulo está activo por feature flag)
  - `data.policy_center_degraded` (si Policy Center no pudo cargar snapshot y opera en fallback)
  - `data.service_accounts_enabled` (si el módulo de Service Accounts / API Keys está activo — `KAAN_FEATURE_API_KEYS=true`)
- No expone detalles sensibles de policies (keys, valores, versiones internas).

---

## 4) Interceptores y Manejo de Errores

### Errores que debes manejar siempre (must-handle)

| Code                          | HTTP | Acción Recomendada                                                                                                    |
| ----------------------------- | ---- | --------------------------------------------------------------------------------------------------------------------- |
| `AUTH_UNAUTHENTICATED`        | 401  | Limpiar token → redirigir a Login                                                                                     |
| `AUTH_TOKEN_EXPIRED`          | 401  | Intentar `POST /auth/refresh`. Si falla → Login                                                                       |
| `AUTH_TOKEN_REVOKED`          | 401  | Sesión cerrada remotamente → Login                                                                                    |
| `AUTH_SESSION_NOT_FOUND`      | 401  | Fail-closed → Login                                                                                                   |
| `AUTH_SESSION_EXPIRED`        | 401  | Sesión DB expirada → Login                                                                                            |
| `AUTH_USER_INACTIVE`          | 403  | Mostrar "Cuenta Suspendida"                                                                                           |
| `AUTH_EMAIL_NOT_VERIFIED`     | 403  | Redirigir a pantalla "Verifica tu email"                                                                              |
| `AUTH_FORBIDDEN`              | 403  | Mostrar "Sin permisos"                                                                                                |
| `VALIDATION_ERROR`            | 422  | Mapear `error.details` a los inputs del formulario                                                                    |
| `POLICY_CONFLICT`             | 422  | Mostrar conflicto de reglas cruzadas y no asumir retry automático                                                     |
| `POLICY_READ_ONLY`            | 403  | Bloquear edición en UI para esa policy                                                                                |
| `POLICY_NOT_FOUND`            | 404  | Invalidar cache local de catálogo y refrescar listado                                                                 |
| `RATE_LIMIT_EXCEEDED`         | 429  | Rate limit global o administrativo → leer `Retry-After`, mostrar countdown. **Puede aparecer en cualquier endpoint.** |
| `AUTH_TOO_MANY_ATTEMPTS`      | 429  | Leer header `Retry-After`, mostrar countdown (Login)                                                                  |
| `AUTH_TOO_MANY_REQUESTS`      | 429  | Límite de peticiones (p.ej. registro público, reenvío verificación) → leer `Retry-After`                              |
| `AUTH_ACCOUNT_LOCKED`         | 429  | Bloqueo persistente DB → mostrar "Cuenta bloqueada", leer `Retry-After`                                               |
| `NOT_FOUND`                   | 404  | Recurso no existe → mostrar "No encontrado" / navegar atrás                                                           |
| `RESOURCE_NOT_FOUND`          | 404  | Ruta no existe → tratar como "módulo no disponible / feature OFF"                                                     |
| `VALIDATION_ERROR (Password)` | 422  | Mapear error de complejidad: 12 caracteres, mayúsculas, minúsculas y números.                                         |

> Para el catálogo completo de error codes, ver [`CONTRACTS.md`](CONTRACTS.md) §4.

### Patrón `Retry-After` en 429

Todas las respuestas 429 incluyen el header `Retry-After` (segundos). Ejemplo de Axios interceptor:

```javascript
axios.interceptors.response.use(null, (error) => {
  if (error.response?.status === 429) {
    const retryAfter = error.response.headers["retry-after"];
    // Mostrar countdown de retryAfter segundos
  }
  if (error.response?.status === 401) {
    // Limpiar token y redirigir a login
  }
  return Promise.reject(error);
});
```

### Mapeo de `VALIDATION_ERROR` (422)

```javascript
// error.details = { "email": ["El campo email es obligatorio."], "password": ["La contraseña debe tener al menos 12 caracteres, una mayúscula, una minúscula y un número."] }
Object.entries(error.details).forEach(([field, messages]) => {
  setFieldError(field, messages[0]); // React Hook Form, Formik, etc.
});
```

### Flujo de Refresh recomendado

1. Guardar `expires_in` del login.
2. Antes de que expire: `POST /auth/refresh` con el token actual.
3. Si refresh falla (401) → limpiar token, redirigir a login.
4. Si refresh éxito → actualizar `access_token` local.

---

> Para una referencia técnica exhaustiva de cada campo, consulta el Swagger en `/api/documentation`.
