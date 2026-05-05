# FixFlow - Implementación Frontend (API Docs)

> **ATENCIÓN AGENTES DE IA:** Este archivo documenta estrictamente la estructura de los endpoints que el frontend consumirá. **Bajo ninguna circunstancia** se deben inventar rutas, nombres de campos, payloads o formatos de respuesta que no estén explícitamente definidos aquí. Si falta un endpoint, se debe solicitar/crear en el backend primero.

Este archivo debe ser copiado a la raíz del repositorio frontend una vez que sea inicializado para mantener sincronía.

---

## 0. Autenticación

Kaan Core ya maneja autenticación, JWT y ciclo de sesión. Para FixFlow no hace falta crear rutas nuevas de login/logout: el frontend debe consumir las rutas existentes del core bajo `/api/v1/auth/*`.

### `POST /api/v1/auth/login`
Inicia sesión y emite un JWT Bearer asociado a una `auth_session` persistida por backend.

**Payload exacto:**
```json
{
  "login": "user@example.com",
  "password": "Secret123456"
}
```

**Notas:**
- El campo es `login`, no `email`. Hoy el login en FixFlow se resuelve por email.
- El frontend debe guardar el token en `data.access_token`.

**Respuesta exitosa (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "token_type": "bearer",
    "access_token": "eyJ0eXAiOiJKV1QiLCJh...",
    "expires_in": 3600,
    "user": {
      "id": "01KHN2Y1XYWPBEPJGB1104GDZW",
      "name": "Pablo",
      "email": "user@example.com",
      "username": "pablo",
      "plan": "free"
    }
  }
}
```

**Dónde viene cada dato que necesita frontend:**
- Token: `data.access_token`
- Tipo de token: `data.token_type`
- Usuario autenticado: `data.user`
- Plan de suscripción: `data.user.plan`

**Valores actuales de `plan` en FixFlow:**
- `free`
- `pro`
- `premium`
- `enterprise`

### Matriz de planes (estado técnico actual del backend)

Esta tabla documenta la capacidad real según la implementación vigente en backend.

| Capacidad | Free | Pro | Premium | Enterprise |
|---|---:|---:|---:|---:|
| Workspaces propios | 1 | 3 | Ilimitados | Ilimitados |
| Equipos por workspace | 2 | 10 | Ilimitados | Ilimitados |
| Gestionar fotos por componente (`GET/POST/GET-by-id/PUT/PATCH/DELETE /components/{id}/photos`) | Parcial (lectura y eliminación; sin alta/edición) | Si | Si | Si |
| Observaciones por componente en wizard (`component_steps[].observation`) | No | Si | Si | Si |

Notas importantes:
- `Ilimitados` significa sin límite numérico aplicado por backend para esa regla.
- Las restricciones de planes hoy se validan por lógica de backend; el frontend debe usarlas para UX, pero nunca confiar solo en validación cliente.

### Capacidades definidas en código pero sin endpoint público de FixFlow (por ahora)

Existen reglas de plan modeladas para exportación y colaboradores, pero actualmente no hay endpoint público de FixFlow documentado en este archivo para consumirlas:

| Capacidad modelada | Free | Pro | Premium | Enterprise | Estado API actual |
|---|---:|---:|---:|---:|---|
| Exportar especificaciones | No | Si | Si | Si | Disponible en `GET /api/v1/devices/{device_id}/exports/specs/excel` |
| Colaboradores por workspace | 0 | 0 | 3 | Ilimitados | Sin endpoint público de gestión de colaboradores en FixFlow |

Regla de consumo:
- Si no hay endpoint documentado, frontend no debe asumir que la capacidad ya está disponible aunque exista una regla interna en backend.

### `GET /api/v1/auth/me`
Retorna el usuario autenticado a partir del Bearer Token actual.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Campos relevantes en respuesta:**
- `data.id`
- `data.name`
- `data.email`
- `data.username`
- `data.plan`
- `data.roles`
- `data.permissions`

Este endpoint es útil para rehidratar sesión en app boot, validar token persistido y reconstruir el store de autenticación en Zustand.

### `PUT /api/v1/auth/me`
Actualiza el perfil del usuario autenticado. Permite cambiar `name`, `username`, `email` y contraseña.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Reglas para cambio de contraseña desde perfil:**
- Para cambiar contraseña desde perfil autenticado, enviar `current_password`, `password` y `password_confirmation`.
- Si `current_password` es incorrecta o falta confirmación, backend responde `422 VALIDATION_ERROR`.

**Payload de ejemplo (cambio de contraseña):**
```json
{
  "current_password": "Secret123456",
  "password": "NewSecret789!",
  "password_confirmation": "NewSecret789!"
}
```

**Cuándo usar este endpoint vs forgot/reset:**
- Usuario logueado y conoce su contraseña actual: `PUT /api/v1/auth/me`.
- Usuario no logueado o no recuerda contraseña: `POST /api/v1/auth/forgot-password` + `POST /api/v1/auth/reset-password`.

### `GET /api/v1/auth/legal-consents/latest`
Retorna la versión legal vigente en backend y la última aceptación registrada del usuario autenticado.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Respuesta exitosa (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "required": {
      "terms_version": "2026-05-04",
      "privacy_version": "2026-05-04"
    },
    "accepted": {
      "terms_version": "2026-05-04",
      "privacy_version": "2026-05-04",
      "accepted_at": "2026-05-04T22:10:00+00:00",
      "source": "android"
    }
  }
}
```

Si el usuario aún no acepta términos/política, `data.accepted` será `null`.

### `POST /api/v1/auth/legal-consents/accept`
Registra la aceptación de Términos y Privacidad del usuario autenticado, incluyendo auditoría básica.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Payload exacto:**
```json
{
  "terms_accepted": true,
  "privacy_accepted": true,
  "terms_version": "2026-05-04",
  "privacy_version": "2026-05-04",
  "source": "android"
}
```

`source` permite: `web`, `mobile`, `android`, `ios`.

Reglas:
- `terms_accepted` y `privacy_accepted` deben ser `true`.
- `terms_version` y `privacy_version` deben coincidir con la versión vigente en backend (`GET /auth/legal-consents/latest`).

Errores relevantes:
- `401 AUTH_UNAUTHENTICATED` si no hay sesión válida.
- `422 VALIDATION_ERROR` si faltan campos, si no se marcan como aceptados o si las versiones no coinciden.

### `POST /api/v1/auth/logout`
Invalida el token actual y revoca la sesión asociada en backend.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Respuesta exitosa (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "message": "Sesión cerrada correctamente."
  }
}
```

### Manejo de errores auth
- `401 AUTH_INVALID`: credenciales incorrectas.
- `401 AUTH_TOKEN_REVOKED`: token revocado o sesión ya cerrada.
- `401 AUTH_SESSION_NOT_FOUND`: el JWT no tiene sesión válida en DB.
- `401 AUTH_SESSION_EXPIRED`: la sesión asociada expiró.
- `403 AUTH_USER_INACTIVE`: usuario suspendido/inactivo.
- `403 AUTH_EMAIL_NOT_VERIFIED`: correo no verificado cuando la política del entorno lo exige.
- `429 AUTH_TOO_MANY_ATTEMPTS`: demasiados intentos de login.

### Flujos complementarios de autenticación disponibles hoy

Además del login/logout clásico, el backend ya soporta estos flujos headless:

- Registro público por correo: `POST /api/v1/auth/register`
- Verificación de email: `GET /api/v1/auth/verify-email/{id}/{hash}`
- Reenvío de verificación: `POST /api/v1/auth/email/verification-notification`
- Estado de verificación: `GET /api/v1/auth/email/verification-status`
- Solicitud de reset de password: `POST /api/v1/auth/forgot-password`
- Confirmación de reset: `POST /api/v1/auth/reset-password`

Requisitos de operación:
- Para que el registro público funcione, backend debe tener `KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION=true`.
- Para que verificación y reset funcionen correctamente en entorno headless, backend debe tener configuradas `KAAN_FRONTEND_VERIFY_EMAIL_URL` y `KAAN_FRONTEND_RESET_PASSWORD_URL`.
- Para que los correos salgan realmente, backend debe tener un mailer SMTP funcional; si `MAIL_MAILER=log`, el flujo queda solo en modo desarrollo/simulación.

Correos transaccionales actuales del backend:
- Registro: correo de bienvenida al crear cuenta.
- Verificación de email: se envía si `KAAN_AUTH_REQUIRE_VERIFIED_EMAIL=true`.
- Forgot password: envío de link de restablecimiento.
- Reset password exitoso: correo de alerta de cambio de contraseña.
- Cambio de contraseña desde perfil (`PUT /auth/me`): correo de alerta de cambio de contraseña.
- Cambio de plan por Stripe webhook: correo de confirmación de plan actualizado.

### Billing (Stripe)

### `POST /api/v1/billing/checkout-session`
Crea una sesión de Stripe Checkout para suscripción mensual.

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Payload exacto:**
```json
{
  "plan": "pro",
  "success_url": "https://fixflow.app/billing/success",
  "cancel_url": "https://fixflow.app/billing/cancel"
}
```

`plan` permite: `pro`, `premium`, `enterprise`.

**Respuesta exitosa (`201 Created`):**
```json
{
  "ok": true,
  "data": {
    "session_id": "cs_test_abc123",
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_abc123",
    "plan": "pro"
  }
}
```

Errores relevantes:
- `401 AUTH_UNAUTHENTICATED` si no hay sesión válida.
- `403 AUTH_EMAIL_NOT_VERIFIED` / `AUTH_USER_INACTIVE` por middleware de seguridad.
- `422 VALIDATION_ERROR` si payload inválido o si falta configuración Stripe en backend.

### `POST /api/v1/billing/mobile/subscription-intent`
Prepara una suscripción mensual para PaymentSheet nativo (app mobile, sin redirección web).

**Headers requeridos:**
```http
Authorization: Bearer {access_token}
```

**Payload exacto:**
```json
{
  "plan": "premium"
}
```

`plan` permite: `pro`, `premium`, `enterprise`.

**Respuesta exitosa (`201 Created`):**
```json
{
  "ok": true,
  "data": {
    "customer_id": "cus_123",
    "ephemeral_key": "ek_test_123",
    "payment_intent_client_secret": "pi_123_secret_abc",
    "subscription_id": "sub_123",
    "plan": "premium",
    "publishable_key": "pk_test_123"
  }
}
```

Errores relevantes:
- `401 AUTH_UNAUTHENTICATED` si no hay sesión válida.
- `403 AUTH_EMAIL_NOT_VERIFIED` / `AUTH_USER_INACTIVE` por middleware de seguridad.
- `422 VALIDATION_ERROR` si payload inválido o si falta configuración Stripe en backend.

### `POST /api/v1/billing/webhooks/stripe`
Webhook receptor para eventos de Stripe (sin auth JWT).

Headers requeridos:
- `Stripe-Signature`

Reglas:
- Backend valida firma con `STRIPE_WEBHOOK_SECRET`.
- Si firma inválida: `403 AUTH_FORBIDDEN`.
- Si payload/firma faltante: `422 VALIDATION_ERROR`.

### Login con Google

### `POST /api/v1/auth/google/exchange`
Intercambia un `id_token` de Google por el JWT estándar del backend.

**Payload exacto:**
```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6I..."
}
```

**Respuesta exitosa (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "token_type": "bearer",
    "access_token": "eyJ0eXAiOiJKV1QiLCJh...",
    "expires_in": 3600,
    "user": {
      "id": "01KHN2Y1XYWPBEPJGB1104GDZW",
      "name": "Google User",
      "email": "user@example.com",
      "username": null,
      "plan": "free"
    }
  }
}
```

Comportamiento backend:
- Si el usuario no existe, se crea automáticamente con rol por defecto del core.
- Si ya existe por correo, se vincula su identidad de Google y se reutiliza la cuenta existente.
- Si Google no reporta email verificado, backend rechaza con `403 AUTH_EMAIL_NOT_VERIFIED`.
- Si el usuario está inactivo/suspendido, backend rechaza con `403 AUTH_USER_INACTIVE`.

Errores relevantes:
- `401 AUTH_TOKEN_INVALID`: `id_token` inválido, no verificable o no pertenece a los `client_id` permitidos.
- `403 AUTH_FORBIDDEN`: login con Google deshabilitado en el entorno.
- `403 AUTH_EMAIL_NOT_VERIFIED`: Google no reporta email verificado.
- `429 AUTH_TOO_MANY_ATTEMPTS`: exceso de intentos.

Requisitos de operación para habilitarlo:
- `KAAN_AUTH_GOOGLE_ENABLED=true`
- `KAAN_AUTH_GOOGLE_CLIENT_IDS=<client_id_1>,<client_id_2>`

Nota de integración para el setup actual de FixFlow:
- Si frontend usa un flujo unificado Web + Android con `@react-native-google-signin/google-signin` y el `id_token` emitido llega con `aud` del cliente Web, backend solo necesita registrar el **Web Client ID** en `KAAN_AUTH_GOOGLE_CLIENT_IDS`.
- El nombre de paquete Android y el `SHA-1` siguen siendo obligatorios en Google Cloud para configurar el cliente Android, pero backend no los valida directamente.

---

## 1. Workspaces

### `GET /api/v1/workspaces`
Retorna la lista de workspaces a los que el usuario tiene acceso (sea owner o colaborador).

### `GET /api/v1/workspaces/{workspace_id}`
Retorna el detalle de un workspace específico (si el usuario pertenece al workspace).

### `POST /api/v1/workspaces`
Crea un nuevo workspace. Sujeto a límite del plan del usuario.

**Payload:**
```json
{
  "name": "Casa"
}
```

### `PUT /api/v1/workspaces/{workspace_id}`
Actualiza un workspace existente (solo owner).

### `PATCH /api/v1/workspaces/{workspace_id}`
Alias de actualización parcial (misma validación que `PUT`).

### `DELETE /api/v1/workspaces/{workspace_id}`
Elimina (soft delete) un workspace existente (solo owner).

---

## 2. Devices (Equipos)

### `GET /api/v1/workspaces/{workspace_id}/devices`
Retorna los equipos dentro de un workspace específico.

### `POST /api/v1/workspaces/{workspace_id}/devices`
Crea un nuevo equipo. Sujeto a límite del plan del usuario.

**Payload:**
```json
{
  "name": "La Bestia"
}
```

### `GET /api/v1/devices/{device_id}`
Retorna los detalles del equipo, incluyendo un arreglo anidado de `components` y su `last_maintenance_date` calculado.

### `PUT /api/v1/devices/{device_id}`
Actualiza un dispositivo existente (mismo workspace del usuario).

**Payload:**
```json
{
  "name": "Workstation Principal"
}
```

### `PATCH /api/v1/devices/{device_id}`
Alias parcial de actualización (misma validación que `PUT`).

### `DELETE /api/v1/devices/{device_id}`
Elimina (soft delete) un dispositivo existente.

### `GET /api/v1/devices/{device_id}/exports/specs/excel`
Exporta las especificaciones de componentes del dispositivo en formato CSV compatible con Excel.

**Respuesta (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "format": "excel_csv",
    "file_name": "device-12-components-20260503-123000.csv",
    "mime_type": "text/csv; charset=UTF-8",
    "content_base64": "<base64>"
  }
}
```

Reglas de negocio:
- Requiere pertenecer al workspace del dispositivo.
- En plan `free` responde `403 AUTH_FORBIDDEN`.
- Frontend debe decodificar `data.content_base64` para descargar/guardar el archivo.

### `GET /api/v1/devices/{device_id}/exports/maintenance/excel`
Exporta historial de mantenimiento del dispositivo con observaciones por componente en formato CSV compatible con Excel.

**Respuesta (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "format": "excel_csv",
    "file_name": "device-12-maintenance-20260503-123000.csv",
    "mime_type": "text/csv; charset=UTF-8",
    "content_base64": "<base64>"
  }
}
```

Campos relevantes en el CSV:
- `performed_at`, `description`, `summary`
- `component_name`, `category`, `observation`
- `component_checklist_done`, `global_checklist_done`

Reglas de negocio:
- Requiere pertenecer al workspace del dispositivo.
- En plan `free` responde `403 AUTH_FORBIDDEN`.
- En planes `pro`, `premium` y `enterprise` incluye observaciones guardadas en wizard/logs.
- Frontend debe decodificar `data.content_base64` para descargar/guardar el archivo.

### `GET /api/v1/devices/{device_id}/exports/maintenance/pdf`
Exporta historial de mantenimiento del dispositivo con observaciones por componente en formato PDF.

**Respuesta (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "format": "pdf",
    "file_name": "device-12-maintenance-20260503-123000.pdf",
    "mime_type": "application/pdf",
    "content_base64": "<base64>"
  }
}
```

Reglas de negocio:
- Requiere pertenecer al workspace del dispositivo.
- En plan `free` responde `403 AUTH_FORBIDDEN`.
- En planes `pro`, `premium` y `enterprise` incluye observaciones guardadas en wizard/logs.
- Frontend debe decodificar `data.content_base64` para descarga/compartición del archivo.

### `POST /api/v1/devices/{device_id}/exports/maintenance/calendar`
Exporta un evento recurrente de mantenimiento en formato iCalendar (`.ics`) para importar en Google Calendar/Apple Calendar/Outlook.

**Payload exacto:**
```json
{
  "start_date": "2026-06-15",
  "title": "Mantenimiento semestral",
  "description": "Limpieza y revisión general",
  "location": "Casa",
  "interval_months": 6
}
```

`start_date` define el día inicial elegido por usuario. Desde ese día el backend genera recurrencia cada 6 meses.

**Respuesta (`200 OK`):**
```json
{
  "ok": true,
  "data": {
    "format": "ical_ics",
    "file_name": "device-12-maintenance-reminder-oficina-principal.ics",
    "mime_type": "text/calendar; charset=UTF-8",
    "content_base64": "QkVHSU46VkNBTEVOREFSLi4u"
  }
}
```

Reglas de negocio:
- Requiere pertenecer al workspace del dispositivo.
- Disponible para cualquier plan (`free`, `pro`, `premium`, `enterprise`).
- Frontend debe decodificar `data.content_base64` y abrir/compartir el archivo `.ics`.

Errores relevantes de este bloque:
- `403 AUTH_FORBIDDEN`: usuario autenticado sin acceso al workspace del dispositivo.
- `422 VALIDATION_ERROR`: payload inválido (por ejemplo, `name` vacío o ausente).

---

## 3. Components

### Regla de cardinalidad por categoría
- Se permiten múltiples componentes de la misma categoría dentro de un mismo equipo.
- Esto aplica explícitamente a `ram`, `storage` y `case_fans`.
- También se permite en el resto de categorías si el caso de uso lo requiere (por ejemplo, múltiples GPUs en builds avanzadas).
- El frontend no debe forzar unicidad por categoría en formularios ni estado local.

### `GET /api/v1/devices/{device_id}/components`
Retorna la lista de componentes de un equipo. El frontend debe agruparlos visualmente por categoría.

### `GET /api/v1/devices/{device_id}/components/{component_id}`
Retorna el detalle de un componente específico.

### `POST /api/v1/devices/{device_id}/components`
Registra un nuevo componente.

**Payload:**
```json
{
  "category": "cpu",
  "name": "Ryzen 7 5800X3D",
  "capacity": "",
  "speed": "3.4GHz",
  "purchase_date": "2023-03-15",
  "purchase_condition": "new",
  "store_url": "https://amazon.com/..."
}
```

`purchase_date` acepta fecha valida y backend la normaliza a `YYYY-MM-DD`.

**Campos técnicos por categoría (payload correcto recomendado):**
- `cpu`: `cores`, `threads`, `base_clock`, `boost_clock`, `socket`, `tdp`
- `motherboard`: `socket`, `chipset`, `form_factor`, `ram_slots`, `pcie_slots`
- `ram`: `capacity`, `speed`, `ram_type`, `modules`, `latency`
- `gpu`: `vram`, `base_clock`, `boost_clock`, `tdp`, `length_mm`, `speed`
- `cooler`: `cooler_type`, `radiator_size`, `fan_size`, `socket_support`
- `psu`: `wattage`, `certification`, `modular`
- `storage`: `capacity`, `storage_type`, `interface`, `read_speed`, `write_speed`, `speed`
- `case`: `form_factor`, `max_gpu_length`, `max_cooler_height`, `preinstalled_fans`
- `case_fans`: `fan_size`, `rpm`, `airflow`, `connector`

Además, se acepta `specs` (objeto JSON) siempre que sus claves correspondan a la categoría enviada.

Compatibilidad importante para frontend:
- Para `ram`, `capacity` y `speed` se aceptan tanto en root como dentro de `specs`.

Si se envían campos técnicos que no aplican a la categoría, el backend responderá `422 VALIDATION_ERROR`.

### `PUT /api/v1/devices/{device_id}/components/{component_id}`
Actualiza un componente existente usando el mismo payload que creación.

### `PATCH /api/v1/devices/{device_id}/components/{component_id}`
Alias parcial de actualización (misma validación que `PUT`).

### `DELETE /api/v1/devices/{device_id}/components/{component_id}`
Elimina (soft delete) un componente existente.

Errores relevantes de este bloque:
- `404 NOT_FOUND`: componente no encontrado o no pertenece al `device_id` enviado.
- `403 AUTH_FORBIDDEN`: usuario autenticado sin acceso al dispositivo.

**Valores válidos para `category`:**
- `cpu`
- `motherboard`
- `ram`
- `gpu`
- `cooler`
- `psu`
- `storage`
- `case`
- `case_fans`

### `GET /api/v1/components/{component_id}/photos`
Lista fotos del componente.

### `GET /api/v1/components/{component_id}/photos/{photo_id}`
Obtiene una foto puntual del componente.

### `POST /api/v1/components/{component_id}/photos`
Crea una foto para el componente. El backend rechazará la operación si el plan del usuario no permite subida de fotos.

### `PUT/PATCH /api/v1/components/{component_id}/photos/{photo_id}`
Actualiza una foto existente. Requiere el mismo tipo de payload que `POST` y respeta la misma regla de plan.

### `DELETE /api/v1/components/{component_id}/photos/{photo_id}`
Elimina una foto existente del componente.

**Payload soportado para `POST` y `PUT/PATCH` (una de estas dos opciones):**
```json
{
  "path": "components/gpu-front.jpg"
}
```

o multipart/form-data con archivo en campo `photo`.

### Recomendación de implementación frontend para fotos (Web/Mobile)
- Sí, se recomienda usar Expo Image Picker para móvil y también para web cuando el flujo sea seleccionar imagen desde el dispositivo.
- En web/PC, Expo Image Picker abrirá selector de archivos del navegador.
- Si en web necesitas más control del selector (tipos de archivo, UX de desktop), puedes usar fallback a un input file/document picker, pero siempre enviando multipart/form-data con campo `photo`.
- Manejo recomendado de errores en frontend:
  - Error HTTP backend: mostrar `error.code` del envelope.
  - Error de red: mostrar mensaje de conectividad.
  - Error local de selección/lectura de archivo: mostrar error de cliente, no de backend.

---

## 4. Maintenance Logs

### `GET /api/v1/devices/{device_id}/maintenance-wizard`
Inicia el flujo guiado de mantenimiento para el dispositivo actual.

Retorna:
- `wizard_version`
- `device` (id y nombre)
- `global_steps` — pasos que aplican a cualquier equipo (limpieza exterior/interior, cableado, revisión visual)
- `component_steps` — pasos sugeridos según la categoría de cada componente registrado

**Pasos globales incluidos:**
| key | Título |
|---|---|
| `clean-external` | Limpiar por fuera |
| `clean-internal` | Limpiar por dentro |
| `cable-management` | Revisar el cableado |
| `visual-check` | Revisión visual general |

**Pasos por categoría de componente:**
| Categoría | Keys incluidos |
|---|---|
| `cpu` | `cpu-clean`, `cpu-paste` |
| `gpu` | `gpu-clean`, `gpu-paste` |
| `storage` | `storage-health`, `storage-connector`, `storage-heatsink` |
| `ram` | `ram-reseat`, `ram-contacts`, `ram-bios` |
| `cooler` | `cooler-clean`, `cooler-noise`, `cooler-mount` |
| `psu` | `psu-clean`, `psu-noise`, `psu-cables` |
| `motherboard` | `mb-clean`, `mb-cmos`, `mb-capacitors` |
| cualquier otra | `component-clean`, `component-check` |

Todos los pasos son opcionales. El frontend debe renderizarlos tal como los recibe, sin hardcodear títulos.

### `POST /api/v1/devices/{device_id}/maintenance-wizard/complete`
Finaliza el wizard y registra un maintenance log con snapshot del checklist.

**Payload base (ejemplo):**
```json
{
  "description": "Mantenimiento guiado",
  "performed_at": "2026-05-01 18:00:00",
  "summary": "Sin daños visibles.",
  "wizard_version": "v1",
  "global_steps": [
    {
      "key": "clean-external",
      "title": "Limpiar por fuera",
      "checked": true,
      "notes": null
    }
  ],
  "component_steps": [
    {
      "component_id": 1,
      "component_name": "Ryzen 7",
      "category": "cpu",
      "observation": "Temperatura estable",
      "steps": [
        {
          "key": "cpu-paste",
          "title": "Cambiar la pasta térmica",
          "checked": true,
          "notes": "Aplicada pasta nueva"
        }
      ]
    }
  ]
}
```

Reglas importantes:
- `summary` (observación global) disponible para todos los planes.
- `component_steps[].observation` solo está habilitado para `pro`, `premium` y `enterprise`.
- En plan `free`, enviar observaciones por componente retorna `403 AUTH_FORBIDDEN`.
- El backend no valida las keys ni títulos individuales de los pasos — almacena el payload tal como llega.

### Sesiones persistentes del wizard (guardar y continuar después)

### `POST /api/v1/devices/{device_id}/maintenance-wizard/sessions/start`
Crea una sesión persistente de wizard para el usuario autenticado. Retorna `session.id` y payload inicial.

Comportamiento anti-duplicados:
- Si ya existe una sesión activa (`in_progress` o `paused`) para ese usuario y dispositivo, backend no crea otra.
- Responde `200` con la sesión existente (`data.reused = true`).
- Si no existe, crea nueva sesión y responde `201` (`data.reused = false`).

Shape de respuesta:
```json
{
  "ok": true,
  "data": {
    "reused": true,
    "session": {
      "id": "123",
      "status": "paused",
      "payload": {
        "global_steps": [],
        "component_steps": []
      }
    }
  }
}
```

### `GET /api/v1/maintenance-wizard/sessions/{session_id}`
Retorna el estado actual de una sesión para reanudar el wizard.

Incluye el estado completo persistido para reanudar sin pérdida:
- `payload.global_steps`
- `payload.component_steps`
- valores actuales de `checked`, `notes` y `observation` (si aplica por plan)

### `GET /api/v1/maintenance-wizard/sessions`
Lista sesiones del usuario autenticado para dashboard de continuidad.

Query params soportados:
- `status` (opcional, default `paused`): `paused|in_progress|completed`
- `device_id` (opcional): filtra por dispositivo

Caso de uso recomendado:
- Mostrar bloque "Pendientes por retomar" usando `status=paused`.
- Mostrar bloque "En progreso" usando `status=in_progress`.

### `PATCH /api/v1/maintenance-wizard/sessions/{session_id}/progress`
Guardado incremental (autosave) del progreso por step.

### `POST /api/v1/maintenance-wizard/sessions/{session_id}/save`
Guardado manual explícito (botón Guardar).

### `POST /api/v1/maintenance-wizard/sessions/{session_id}/save-and-exit`
Guarda y marca sesión como `paused` para continuar más tarde.

### `POST /api/v1/maintenance-wizard/sessions/{session_id}/complete`
Completa la sesión, genera `maintenance_log` y marca sesión como `completed`.

### `GET /api/v1/devices/{device_id}/maintenance-timeline`
Retorna timeline del dispositivo con:
- Eventos `maintenance_log` (completados).
- Eventos `wizard_session` en estado `in_progress`/`paused` del usuario actual.

### `POST /api/v1/devices/{device_id}/maintenance-logs`
Registra una acción de mantenimiento.

**Payload:**
```json
{
  "description": "Cambio de pasta térmica",
  "performed_at": "2024-04-30 14:00:00"
}
```

---

## Reglas de Integración Frontend
- Autenticación: todas las peticiones protegidas requieren `Authorization: Bearer {access_token}`.
- Estado auth en frontend: el store debe tomar el token desde `data.access_token` y el usuario desde `data.user`.
- Control de límites: el frontend debe leer `data.user.plan` tras login o `data.plan` desde `/api/v1/auth/me` para habilitar o bloquear acciones premium sin inventar flags cliente.
- Contrato base: todas las respuestas respetan el envelope del core: éxito `{ ok: true, data: ... }`, error `{ ok: false, error: { code, message, details } }`.

### Notas de compatibilidad Web/Mobile para base URL

- Web local: usar normalmente `http://localhost` o el host local configurado para tu entorno.
- Android Emulator: **no usar `localhost` ni `127.0.0.1`** para llegar al backend del host. Usar `http://10.0.2.2` más el puerto correspondiente.
- Dispositivo Android físico en la misma red: usar la IP LAN de tu PC, por ejemplo `http://192.168.1.50` más el puerto correspondiente.
- iOS Simulator: puede usar `http://127.0.0.1` o `http://localhost` según el entorno local.
- Si el backend se sirve solo por HTTP en desarrollo, Android puede requerir permitir cleartext traffic en la app. Si esto no está configurado del lado frontend/native, Axios puede fallar con `Network Error` antes de recibir respuesta del backend.

Ejemplos:
- Laravel con `php artisan serve --host=0.0.0.0 --port=8000`:
  - Web local: `http://localhost:8000/api/v1`
  - Android Emulator: `http://10.0.2.2:8000/api/v1`
- XAMPP/Apache local:
  - Web local: `http://localhost/api/v1`
  - Android Emulator: normalmente usar la IP LAN del host o una configuración expuesta del servidor local, porque `http://10.0.2.2/api/v1` depende de cómo esté resuelto el virtual host.

---

## Regla Obligatoria de Actualización de Este Documento

Esta sección define una política obligatoria para backend y frontend:

1. **Todo cambio que impacte autenticación o sesión DEBE actualizar `API_DOCS.md` en el mismo PR.**
2. **No se considera terminado un cambio de auth/integración si este archivo no refleja el contrato final real.**
3. **Si cambia el manejo de errores en frontend (HTTP vs red vs almacenamiento local), también debe actualizarse esta guía.**
4. **Si cambia persistencia de token (web/mobile), debe documentarse el comportamiento esperado y fallback correspondiente.**

### Checklist obligatorio en cada cambio de auth/integración

- Ruta exacta del endpoint afectado.
- Payload exacto esperado por backend.
- Estructura exacta de respuesta (`data.access_token`, `data.user`, `data.user.plan`, etc.).
- Códigos de error relevantes y su interpretación en frontend.
- Diferenciación explícita entre:
  - Error HTTP con respuesta backend.
  - Error de red sin respuesta.
  - Error local de persistencia de sesión/token.
- Notas de compatibilidad Web/Mobile (por ejemplo: storage de sesión y base URL por plataforma).

> **Regla operativa:** si un cambio de implementación genera dudas en frontend por falta de detalle documental, el cambio se considera incompleto hasta actualizar `API_DOCS.md`.
