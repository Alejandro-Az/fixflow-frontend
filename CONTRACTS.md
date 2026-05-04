# API Contracts — v0.2.0-alpha

> **Ley del Core.** Este documento define qué está congelado, qué no, y qué constituye un breaking change.
> Cualquier módulo nuevo (incluidos **Módulo 4: API Keys / Service Accounts** y **Módulo 5: Policy Center**) **debe heredar estos contratos**.

---

## 1) Principio rector

| Nivel                                  | Qué aplica                                                       |
| -------------------------------------- | ---------------------------------------------------------------- |
| **Contrato fuerte** (no romper)        | HTTP status + `error.code` + shape mínimo                        |
| **Contrato débil** (puede evolucionar) | `error.message` (copy/i18n), contenido exacto de `error.details` |
| **No congelar** (expansión libre)      | Campos adicionales, orden de llaves JSON, textos                 |

> **Ley:** cambiar `error.code` o el status HTTP de un error existente es un **breaking change**, aunque el JSON "se vea igual".

---

## 2) Envelope global

### Success

```json
{ "ok": true, "data": {} }
```

### Error

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Texto legible (NO congelar).",
    "details": null
  }
}
```

**Invariantes congeladas**

- `ok` siempre existe y es boolean.
- Success: existe `data` y no existe `error`.
- Error: existe `error` y no existe `data`.
- `error` siempre incluye `code`, `message`, `details`.
- `details` puede ser `null` si no aplica (pero la key siempre está presente).

---

## 3) Semántica HTTP — política canónica

El Core evita `204` para no romper el envelope universal. En su lugar se usa `200` con `data`.

| Status | Semántica                                                                        |
| ------ | -------------------------------------------------------------------------------- |
| `200`  | OK                                                                               |
| `201`  | Recurso creado                                                                   |
| `401`  | No autenticado / identidad no confiable (token/sesión/credenciales)              |
| `403`  | Autenticado pero bloqueado por regla (RBAC/estado/verificación/feature behavior) |
| `404`  | Ruta o recurso no existe                                                         |
| `422`  | Error de validación                                                              |
| `429`  | Rate limit / bloqueo por abuso                                                   |
| `500`  | Error interno no controlado                                                      |

> **Ley:** cambiar 403→401 o 404→403 es breaking change aunque el JSON sea igual.

---

## 4) Catálogo oficial de `error.code` (v0.2.0-alpha)

> Un módulo nuevo no puede inventar códigos fuera de este catálogo sin actualizar este documento + Swagger + tests.

### Validación

- `VALIDATION_ERROR` (422) — `details` = mapa `{campo: [mensajes...]}`
- `POLICY_CONFLICT` (422) — Conflicto de reglas cruzadas en policies

### Auth / JWT / Sesiones

- `AUTH_UNAUTHENTICATED` (401) — falta token / guard no autentica
- `AUTH_INVALID` (401) — credenciales incorrectas
- `AUTH_TOKEN_EXPIRED` (401) — JWT expirado
- `AUTH_TOKEN_INVALID` (401) — JWT inválido/malformado
- `AUTH_TOKEN_REVOKED` (401) — JWT revocado/blacklist
- `AUTH_SESSION_NOT_FOUND` (401) — no existe sesión DB para `jti`
- `AUTH_SESSION_EXPIRED` (401) — sesión DB expirada
- `AUTH_JWT_ERROR` (401) — error JWT general (no clasificado)

### API Keys

- `AUTH_API_KEY_MISSING` (401) — falta API key en la solicitud
- `AUTH_API_KEY_INVALID` (401) — API key desconocida/incorrecta (**por defecto** también cubre revoked/expired)
- `AUTH_API_KEY_REVOKED` (401) — API key revocada/blacklist (**solo si** `KAAN_API_KEYS_EXCHANGE_VERBOSE_ERRORS=true`)
- `AUTH_API_KEY_EXPIRED` (401) — API key expirada (**solo si** `KAAN_API_KEYS_EXCHANGE_VERBOSE_ERRORS=true`)

> **Seguridad:** Por defecto, `revoked` y `expired` responden como `AUTH_API_KEY_INVALID` para prevenir
> enumeración de estado. Activar `verbose_errors` solo en entornos internos de confianza.

### Autorización y reglas

- `AUTH_FORBIDDEN` (403)
- `AUTH_USER_INACTIVE` (403)
- `AUTH_EMAIL_NOT_VERIFIED` (403)
- `AUTH_VERIFICATION_INVALID` (403)
- `REGISTRATION_DISABLED` (403)
- `POLICY_READ_ONLY` (403) — Policy es de solo lectura

### Rate limit / bloqueos

- `RATE_LIMIT_EXCEEDED` (429) — rate limit global (Tier 1 api) o administrativo (Tier 2 admin) — header requerido: `Retry-After`, body incluye `details.retry_after` (int)
- `AUTH_TOO_MANY_ATTEMPTS` (429) — rate limit login/forgot
- `AUTH_TOO_MANY_REQUESTS` (429) — rate limit registro/resend — header recomendado: `Retry-After`
- `AUTH_ACCOUNT_LOCKED` (429) — bloqueo por intentos fallidos
- `AUTH_API_KEY_TOO_MANY_ATTEMPTS` (429) — rate limit en exchange endpoint — header requerido: `Retry-After`

### Not Found

- `NOT_FOUND` (404) — modelo/recurso no existe (Eloquent)
- `RESOURCE_NOT_FOUND` (404) — ruta no existe (incluye routing feature OFF)
- `POLICY_NOT_FOUND` (404) — Policy inexistente

### Errores internos

- `SERVER_ERROR` (500)
- `CONFIG_VERIFY_EMAIL_URL_MISSING` (500)

### Password Reset

- `AUTH_PASSWORD_RESET_INVALID` (422) — token de reset inválido o expirado

---

## 5) Política 401 vs 403

- **401** = identidad no válida/verificable (token/sesión/credenciales).
- **403** = identidad válida, pero regla bloquea (RBAC/estado/verificación/feature behavior).

Ejemplos congelados:

- Token revocado / sesión inválida → 401
- Usuario inactivo → 403
- Email no verificado → 403
- Sin permiso RBAC → 403
- Registro deshabilitado → 403

---

## 6) Gating por Feature Flags

### Routing feature flags

Aplican a flags tipo `config('kaan.features.*')`.

- **Feature OFF** → la ruta no se registra → `404 RESOURCE_NOT_FOUND`
- **Feature ON** → la ruta existe y responde normalmente (puede ser 401/403 según auth/RBAC)

**Congelado:** Feature OFF nunca devuelve 401/403/500. Solo `404 RESOURCE_NOT_FOUND`.

**Restricción intencional:** Flags deben ser estables al momento de `php artisan route:cache`. Cambios requieren limpiar cachés en deploy (`config:clear`, `route:clear`).

### Behavior flags

Ejemplo: `kaan.auth.allow_public_registration=false` → `403 REGISTRATION_DISABLED` (ruta existe pero la acción se niega).

---

## 7) Paginación estándar

```json
{
  "ok": true,
  "data": { "data": [], "links": {}, "meta": {} }
}
```

**Invariantes mínimas congeladas:**

- `data.data` existe y es array.
- `data.links` existe y es objeto.
- `data.meta` existe y es objeto.
- `data.meta.current_page`, `data.meta.per_page`, `data.meta.total` existen y son numéricos.

**No congelar:** set completo de keys en `meta`, URLs exactas en `links`.

---

## 8) Identificadores públicos

- Todo recurso expone `id` como string (ULID).
- Endpoints `show/update/delete` usan ese `id` como route key.
- IDs internos auto-increment nunca se exponen.

> Nota: `auth_sessions` es un resource addressable y por tanto expone `id` como ULID string. Los endpoints como `DELETE /api/v1/auth/sessions/{id}` aceptan únicamente el identificador público.
>
> Nota: `roles` es resource addressable con `id` público (`public_id`, ULID string). Los endpoints de roles aceptan únicamente este identificador público.

---

### 8.1) Matriz Canónica de Recursos e Identificadores

| Resource         | Addressable               | ID Type                   | Notes                             |
| ---------------- | ------------------------- | ------------------------- | --------------------------------- |
| `users`          | Sí                        | `public_id` (string ULID) | Route key pública                 |
| `roles`          | Sí                        | `public_id` (string ULID) | Sin fallback numérico             |
| `auth_sessions`  | Sí                        | `public_id` (string ULID) | Sin fallback numérico             |
| `permissions`    | Catálogo (No addressable) | N/A                       | **Congelado**: Consumo por `name` |
| `audit_logs`     | No                        | Informativo/interno       | Read-only                         |
| `login_attempts` | No                        | Informativo/interno       | Read-only                         |

---

### 8.2) Estado Contractual de Permissions

A diferencia de Usuarios o Roles, los **Permissions** no se consideran "recursos de negocio" direccionables, sino un **catálogo técnico** de capacidades del sistema.

**Decisión de Diseño**:

- **Consumo por Name**: El contrato fuerte es el `name` del permiso. El frontend y los middlewares deben depender exclusivamente de este string.
- **Sin ID Público**: No se emitirá `public_id` ni se permitirá el acceso vía `{id}`. Convertirlos en recursos direccionables se considera sobreingeniería (anti-pattern) para el estado actual del Core.
- **Inmutabilidad de Interfaz**: Los permisos se definen en el Core/Módulos (Developer-driven). El Admin puede asignarlos a Roles, pero no "editar" el objeto permiso habitualmente.

> **Regla**: Si un permiso cambia de nombre, se considera un **breaking change** contractual, ya que rompe la lógica de autorización en el código y frontend.

---

## 9) Contratos mínimos por endpoint (Core)

> "Mínimo" = campos que siempre estarán. Agregar campos es non-breaking.

| Endpoint                                                 | Mínimo garantizado                                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `POST /auth/login` (200)                                 | `data.access_token`, `data.token_type`, `data.expires_in`, `data.user`                                                                     |
| `POST /auth/google/exchange` (200)                       | `data.access_token`, `data.token_type`, `data.expires_in`, `data.user`                                                                     |
| `POST /auth/api-keys/exchange` (200)                     | `data.access_token`, `data.token_type`, `data.expires_in`, `data.user` (Header req: `X-API-Key`)                                           |
| `GET /auth/me` (200)                                     | `data.id`, `data.email`                                                                                                                    |
| `GET /admin/dashboard/summary` (200)                     | `data.metrics`, `data.recent_activity` (Contenido interno variable según permisos granulares del usuario autenticado)                      |
| `GET /admin/users` (200)                                 | Paginación estándar                                                                                                                        |
| `POST /admin/users` (201)                                | `data.id`, `data.name`, `data.email`, `data.status` (Req: pass min 12, mixedCase, numbers)                                                 |
| `GET /admin/users/{id}` (200)                            | `data.id`, `data.name`, `data.email`, `data.status`                                                                                        |
| `PUT /admin/users/{id}` (200)                            | `data.id`, `data.name`, `data.email`, `data.status` (Pass opcional, pero si se envía debe cumplir min 12, mixedCase, numbers)              |
| `GET /devices/{id}/exports/specs/excel` (200)            | `data.format`, `data.file_name`, `data.mime_type`, `data.content_base64`                                                                   |
| `GET /devices/{id}/exports/maintenance/excel` (200)      | `data.format`, `data.file_name`, `data.mime_type`, `data.content_base64`                                                                   |
| `GET /devices/{id}/exports/maintenance/pdf` (200)        | `data.format`, `data.file_name`, `data.mime_type`, `data.content_base64`                                                                   |
| `GET /components/{component}/photos` (200)               | `data[]` con `id`, `path`, `created_at`                                                                                                    |
| `POST /components/{component}/photos` (201)              | `data.id`, `data.path`, `data.created_at`                                                                                                  |
| `GET /components/{component}/photos/{photo}` (200)       | `data.id`, `data.path`, `data.created_at`                                                                                                  |
| `PUT/PATCH /components/{component}/photos/{photo}` (200) | `data.id`, `data.path`, `data.created_at`                                                                                                  |
| `DELETE /components/{component}/photos/{photo}` (200)    | `data.message`                                                                                                                             |
| `POST /billing/checkout-session` (201)                   | `data.session_id`, `data.checkout_url`, `data.plan`                                                                                        |
| `POST /billing/mobile/subscription-intent` (201)         | `data.customer_id`, `data.ephemeral_key`, `data.payment_intent_client_secret`, `data.subscription_id`, `data.plan`, `data.publishable_key` |
| `POST /billing/webhooks/stripe` (200)                    | `data.received`                                                                                                                            |

---

## 10) RBAC (Spatie)

- Sin permiso → `403` + `AUTH_FORBIDDEN` (sin excepciones).
- Guard RBAC = `api` (cambiarlo es breaking change).
- Los nombres de permisos se consideran "contrato" desde que se asignan en producción.

---

## 11) Reglas para Contract Tests

### A) Contrato valida interfaz, no lógica

- Interfaz: rutas, shape mínimo, status, error.code, paginación.
- Lógica: auditoría, revocación, prune, etc. → van en feature/security tests.

### B) Congelar mínimos, permitir expansión

- ✅ `assertJsonStructure`, `assertJsonPath`
- ❌ `assertExactJson` salvo casos muy justificados

### C) Nunca congelar `error.message`

- Congelar: status + `error.code`
- No congelar: texto

### D) Matriz de flags

Los contracts de routing requieren tests ON/OFF para:

- `KAAN_FEATURE_ADMIN`
- `KAAN_FEATURE_AUDIT`
- `KAAN_FEATURE_ADMIN_SECURITY`
- `KAAN_FEATURE_API_KEYS` (Módulo 4)
- `KAAN_FEATURE_POLICY_CENTER` (Módulo 5)

> **Nota:** `auth_sessions` y `rbac` son core capabilities obligatorias y no requieren tests ON/OFF.

---

## 12) Política de versionado (breaking vs non-breaking)

### Non-breaking

- Agregar campos a respuestas existentes.
- Agregar endpoints.
- Agregar nuevos `error.code` (sin eliminar/alterar existentes).
- Agregar permisos nuevos.

### Breaking (requiere bump mayor / `/api/v2`)

- Eliminar/renombrar campos o cambiar tipos.
- Cambiar status HTTP de un error existente.
- Cambiar/eliminar un `error.code` existente.
- Cambiar semántica de endpoint sin cambiar path/version.
- Cambiar política de presencia de `details`.
- Cambiar guard RBAC.

---

## 13) Gobernanza de Cambios de Contrato (Obligatoria)

Todo cambio que afecte cualquiera de estos elementos se considera cambio contractual y debe pasar esta política:

- HTTP status
- `error.code`
- shape de request/response
- tipo de dato de cualquier campo público
- identificador público usado por rutas (`{id}`, `{role}`, etc.)

> **Importante:** Cada cambio contractual debe reflejarse en los tres niveles de documentación: técnica (Level 1), integración frontend (Level 2) y producto (Level 3) si afecta el valor comercial.

Checklist mínimo obligatorio por cambio:

1. Actualizar este archivo (`docs/CONTRACTS.md`) con la nueva regla.
2. Actualizar Swagger/OpenAPI (`app/Docs/*`) para reflejar exactamente el contrato.
3. Actualizar/agregar tests de contrato o feature que validen el cambio.
4. Registrar el cambio en `CHANGELOG.md` con impacto y acción requerida.

Si falta cualquiera de los cuatro puntos, el cambio no se considera cerrado.

### Validación mínima recomendada en PR/release

```bash
php artisan test
php artisan l5-swagger:generate
```

Además, si hubo cambios de rutas o schemas, revisar el diff de `storage/api-docs/api-docs.json` antes de aprobar.
