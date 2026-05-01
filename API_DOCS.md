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

---

## 1. Workspaces

### `GET /api/v1/workspaces`
Retorna la lista de workspaces a los que el usuario tiene acceso (sea owner o colaborador).

### `POST /api/v1/workspaces`
Crea un nuevo workspace. Sujeto a límite del plan del usuario.

**Payload:**
```json
{
  "name": "Casa"
}
```

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

---

## 3. Components

### `GET /api/v1/devices/{device_id}/components`
Retorna la lista de componentes de un equipo. El frontend debe agruparlos visualmente por categoría.

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
  "store_url": "https://amazon.com/..."
}
```

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

### `POST /api/v1/components/{component_id}/photos`
Sube una foto para un componente. El backend rechazará la operación si el plan del usuario no permite fotos.

**Payload soportado (una de estas dos opciones):**
```json
{
  "path": "components/gpu-front.jpg"
}
```

o multipart/form-data con archivo en campo `photo`.

---

## 4. Maintenance Logs

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
