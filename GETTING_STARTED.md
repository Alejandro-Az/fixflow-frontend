# Kaan Core Backend — Guía de Adopción

> Este documento es para **cualquier equipo que adopta Kaan Core como base de un proyecto nuevo**.
> Cubre todo el proceso desde cero: modelo de adopción, prerequisitos, configuración del entorno, feature flags, cómo extender el core y qué no tocar.

---

## 1. Qué es este documento

Esta guía es el punto de partida para cualquier equipo que arranca un nuevo proyecto usando Kaan Core Backend como kernel de identidad y seguridad.

Cubre el proceso completo de adopción: desde clonar el repositorio hasta tener el sistema levantado, verificado y listo para extender con la lógica de negocio propia del proyecto.

---

## 2. Modelo de Adopción

El modelo de adopción de Kaan Core es **clone → rename → configure → extend**.

Cada proyecto que usa Kaan Core es una **copia independiente** del repositorio. No existe un mecanismo de actualización automática entre el core original y los proyectos derivados. Cada copia evoluciona de forma autónoma.

Este modelo permite:

- Libertad total para extender sin restricciones del repositorio upstream
- Estabilidad: cambios en el core original no afectan proyectos derivados en producción
- Claridad: cada proyecto tiene su propio historial de git

**Consecuencia importante:** si el core original recibe mejoras de seguridad o correcciones críticas, incorporarlas en proyectos derivados es una decisión explícita del equipo responsable de cada proyecto (cherry-pick o merge manual).

---

## 3. Prerequisitos del Sistema

Antes de iniciar, verificar que el entorno cuenta con:

| Componente | Versión mínima | Notas |
|------------|---------------|-------|
| PHP | 8.2+ | Con las extensiones listadas abajo |
| Composer | 2.x | |
| MySQL | 8.0+ | Para entornos reales y staging/producción |
| SQLite | Cualquier versión reciente | Solo para desarrollo local y tests |

**Extensiones PHP requeridas:**

- `mbstring`
- `pdo`
- `pdo_mysql`
- `openssl`
- `dom`
- `xml`
- `xmlwriter`
- `sqlite3` (solo para tests)

Para verificar las extensiones activas:

```bash
php -m
```

---

## 4. Paso a Paso: Arrancar un Proyecto Nuevo

### Paso 1 — Clonar y desacoplar del repositorio original

```bash
git clone <url-repo-kaan-core> nombre-del-proyecto
cd nombre-del-proyecto
git remote remove origin
git remote add origin <url-nuevo-repo>
```

Esto crea una copia del core con su historial completo y la desacopla del repositorio original. A partir de aquí, el proyecto evoluciona de forma independiente.

### Paso 2 — Instalar dependencias

```bash
composer install
```

### Paso 3 — Configurar el entorno

```bash
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
```

Luego editar `.env` con los valores reales del proyecto. Ver las tablas de variables a continuación.

#### Configuración recomendada si usarás registro por correo y recuperación de contraseña

Si el proyecto usará registro público, verificación de email o recuperación de contraseña, además de las variables base debes configurar un mailer real y las URLs headless del frontend.

Ejemplo de SMTP con Hostinger (ajustar exactamente según el panel real del buzón):

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_SCHEME=ssl
MAIL_USERNAME=contactoysoporte@kaanforge.com
MAIL_PASSWORD=TU_PASSWORD_REAL_DEL_BUZON
MAIL_FROM_ADDRESS=contactoysoporte@kaanforge.com
MAIL_FROM_NAME="Kaan Forge"

KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION=true
KAAN_AUTH_REQUIRE_VERIFIED_EMAIL=true
KAAN_FRONTEND_VERIFY_EMAIL_URL=https://tu-frontend.com/auth/verify-email
KAAN_FRONTEND_RESET_PASSWORD_URL=https://tu-frontend.com/auth/reset-password
```

Notas:
- Si Hostinger indica `587` con `tls`, usar `MAIL_PORT=587` y `MAIL_SCHEME=tls`.
- No versionar nunca passwords reales del buzón en git.
- Si `MAIL_MAILER=log`, los correos no se envían realmente; solo se registran en logs para desarrollo.

#### Variables obligatorias

Estas variables deben estar configuradas antes del primer boot. Si alguna falta, `kaan:install` abortará con un error descriptivo.

| Variable | Por qué es obligatoria |
|----------|------------------------|
| `APP_KEY` | Generada con `key:generate`. Sin ella la app no arranca. |
| `JWT_SECRET` | Generada con `jwt:secret`. Sin ella la autenticación JWT no funciona. |
| `APP_URL` | URL real del proyecto (ej: `https://api.miproyecto.com`). |
| `DB_CONNECTION` | Siempre `mysql` en entornos reales. |
| `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | Conexión a MySQL del proyecto. |
| `KAAN_ADMIN_PASSWORD` | Sin default. `kaan:install` aborta si está vacío. Mínimo 12 caracteres con complejidad alta. |

#### Variables con default que deben revisarse para producción

Estas variables tienen valores por defecto funcionales para desarrollo, pero deben revisarse antes de desplegar en entornos reales.

| Variable | Default | Recomendación para producción |
|----------|---------|-------------------------------|
| `APP_ENV` | `local` | `production` o `staging` |
| `APP_DEBUG` | `true` | `false` — nunca `true` fuera de local |
| `KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION` | `false` | Alinear con el modelo de negocio del proyecto |
| `KAAN_AUTH_REQUIRE_VERIFIED_EMAIL` | `false` | `true` recomendado en producción |
| `KAAN_AUTH_REGISTRATION_DEFAULT_STATUS` | `active` | Revisar según nivel de riesgo del proyecto |
| `LOG_CHANNEL` / `LOG_STACK` | `stack` / `single` | `LOG_STACK=json` en producción para logs estructurados |
| `KAAN_FRONTEND_VERIFY_EMAIL_URL` | vacío | Obligatorio si el proyecto usa verificación de email headless |
| `KAAN_FRONTEND_RESET_PASSWORD_URL` | vacío | Obligatorio si el proyecto usa reset de password headless |
| `KAAN_ADMIN_EMAIL` | `admin@kaan.dev` | Cambiar siempre al email real del administrador |

### Paso 4 — Inicializar el sistema

```bash
php artisan kaan:install
```

Este comando ejecuta las migraciones, siembra el RBAC base (roles, permisos) y crea el superadmin con las credenciales configuradas en `.env`.

En entornos `production` y `staging`, el comando verifica el readiness del sistema antes de ejecutar y aborta si detecta problemas críticos (variables faltantes, conexión fallida, etc.).

### Paso 5 — Verificar el sistema

```bash
php artisan kaan:health
```

Este comando verifica el estado de todos los componentes del sistema: base de datos, configuración, JWT, migraciones pendientes y más.

**Verde = sistema listo.** Resolver todos los WARNs antes de ir a producción. Cualquier ERROR bloquea el arranque.

### Paso 6 — Verificación manual de flujos de auth por correo

Después del boot inicial, si el proyecto usará auth por correo, validar manualmente estos flujos:

#### Registro público
1. Confirmar que `KAAN_AUTH_ALLOW_PUBLIC_REGISTRATION=true`.
2. Ejecutar `POST /api/v1/auth/register` con un correo real de prueba.
3. Confirmar que el correo de verificación llega al inbox.
4. Confirmar que el enlace redirige a la URL definida en `KAAN_FRONTEND_VERIFY_EMAIL_URL`.

#### Forgot password / reset password
1. Ejecutar `POST /api/v1/auth/forgot-password` con un correo real existente.
2. Confirmar recepción del correo de reset.
3. Confirmar que el enlace redirige a `KAAN_FRONTEND_RESET_PASSWORD_URL`.
4. Confirmar que `POST /api/v1/auth/reset-password` permite establecer nueva contraseña.
5. Confirmar que las sesiones anteriores quedan revocadas tras el reset.

#### Google Sign-In
Qué debes preparar manualmente:
1. Crear proyecto en Google Cloud Console.
2. Configurar OAuth consent screen.
3. Crear credenciales para las plataformas objetivo (web/android/ios).
4. Guardar `client_id` y cargarlos en `KAAN_AUTH_GOOGLE_CLIENT_IDS`.
5. Habilitar `KAAN_AUTH_GOOGLE_ENABLED=true`.
6. Limpiar caché de config con `php artisan config:clear`.

Para el setup actual de FixFlow:
- Registrar en backend solo el **Web Client ID** si ese es el `aud` con el que frontend obtiene el `id_token`.
- El cliente Android en Google Cloud sigue siendo necesario para que Google Play Services valide la app (`package name` + `SHA-1`), pero backend no necesita ese Android Client ID si el `id_token` final viene emitido para el cliente Web.

Endpoint backend disponible:
- `POST /api/v1/auth/google/exchange`

Payload esperado:
```json
{
	"id_token": "<google_id_token>"
}
```

Resultado esperado:
- Si el token es válido y el email viene verificado, backend vincula/crea usuario y emite JWT estándar.

---

## 5. Feature Flags: Activar y Desactivar Módulos

Kaan Core usa un sistema de feature flags para controlar qué módulos están activos en cada instalación. Las flags viven en `config/kaan.php` bajo la clave `features` y se controlan con variables de entorno en `.env`.

**Si una feature está OFF, sus rutas no se registran en la aplicación.** El módulo no existe desde el punto de vista de la API.

| Variable de entorno | Default | Qué activa | Dependencias |
|---------------------|---------|-----------|--------------|
| `KAAN_FEATURE_ADMIN` | `true` | Panel admin completo: dashboard, users, roles, permissions | Ninguna |
| `KAAN_FEATURE_AUDIT` | `true` | Audit logs → `GET /api/v1/admin/audit-logs` | Requiere `KAAN_FEATURE_ADMIN=true` |
| `KAAN_FEATURE_LOGIN_ATTEMPTS` | `true` | Registro de intentos de login y bloqueo de cuentas | Ninguna |
| `KAAN_FEATURE_ADMIN_SECURITY` | `true` | Vista de seguridad → `GET /api/v1/admin/security/login-attempts` | Requiere `KAAN_FEATURE_ADMIN=true` |
| `KAAN_FEATURE_API_KEYS` | `false` | Service accounts + API Keys para integraciones M2M | Ninguna |
| `KAAN_FEATURE_POLICY_CENTER` | `false` | Policy Center → `GET/PATCH /api/v1/admin/policies/**` | Requiere `KAAN_FEATURE_ADMIN=true` |

**Modulos siempre activos (no configurables por diseño):**

- Autenticación JWT + gestión de sesiones
- RBAC (Spatie + guard `api`)
- Health check

> **Importante — Caché de rutas:** Al cambiar una flag en `.env`, regenerar la caché para que tome efecto:
>
> ```bash
> php artisan config:clear && php artisan route:clear
> php artisan config:cache && php artisan route:cache
> ```
>
> Sin este paso, el sistema seguirá usando la configuración anterior en memoria.

---

## 6. Cómo Extender el Core: Qué Agregar y Dónde

Kaan Core está diseñado para ser extendido sin modificar sus archivos base. La forma correcta es agregar código propio en las ubicaciones convencionales.

### Qué se puede agregar libremente

| Tipo | Ubicación |
|------|-----------|
| Controladores | `app/Http/Controllers/{Dominio}/` |
| Rutas | `routes/api/v1/` (nuevo archivo, convención: `{modulo}.php`, ej: `products.php`) |
| Form Requests | `app/Http/Requests/{Dominio}/` |
| Services | `app/Services/{Dominio}/` |
| API Resources | `app/Http/Resources/{Dominio}/` |
| Modelos | `app/Models/` con sus migraciones en `database/migrations/` |

### Convenciones que todo código nuevo debe respetar

**Capas:** Usar el patrón `Controller → Form Request → Service → API Resource` cuando la complejidad lo justifique. No crear capas innecesarias para lógica simple.

**Respuestas:** Toda respuesta debe usar el envelope estándar del core:

```json
{ "ok": true, "data": {} }
{ "ok": false, "error": { "code": "STRING", "message": "...", "details": {} } }
```

**Rutas:** Todas bajo `/api/v1/`. Las rutas protegidas deben usar `auth:api` + los middleware de sesión del core (`EnsureTokenNotRevoked`, `TouchAuthSession`). Las rutas que requieren permiso específico deben usar `EnsureHasPermission:nombre.del.permiso`.

**Idioma:** Código en inglés, comentarios complejos en español.

---

## 7. Qué NO Modificar del Core

Para no romper el sistema base ni complicar la incorporación futura de mejoras del core, los siguientes archivos no deben modificarse en proyectos derivados.

| Archivo / Directorio | Motivo |
|----------------------|--------|
| `app/Http/Middleware/` | Middleware de seguridad del kernel. Un cambio aquí puede romper auth o RBAC en todo el sistema. |
| `app/Services/AuditLogger.php` | Sistema de auditoría central. Modificarlo puede romper la trazabilidad de operaciones. |
| `app/Models/User.php`, `Role.php`, `AuthSession.php`, `LoginAttempt.php` | Modelos del core. Extender con traits u observers, no modificar directamente. |
| `database/migrations/` (migraciones existentes) | Las migraciones ya ejecutadas no deben modificarse. Crear nuevas para cambios. |
| `routes/api/v1/` (archivos existentes del core) | No modificar rutas existentes del core. Agregar nuevos archivos de rutas para funcionalidad propia. |
| `config/kaan.php` | Se puede agregar configuración nueva, pero nunca eliminar ni renombrar claves existentes. |

**Alternativa recomendada para extender comportamiento del core:** usar Observers, Events y Listeners de Laravel para reaccionar a cambios en los modelos del core sin modificar su código directamente.

---

## 8. Recursos Adicionales

| Recurso | Para qué |
|---------|----------|
| `DOCUMENTATION.md` | Referencia técnica completa: arquitectura, middleware, RBAC, comandos, convenciones |
| `docs/PRODUCTION-READINESS.md` | Checklist exhaustivo antes de ir a producción |
| `docs/frontend-integration.md` | Integrar un frontend: JWT, headers, manejo de errores, flujos de auth |
| `docs/CONTRACTS.md` | Contratos formales de la API |
| `storage/api-docs/api-docs.json` | Swagger / OpenAPI — explorar todos los endpoints |
| `php artisan kaan:health` | Verificar el estado del sistema en cualquier momento |

---

_Versión: 1.0.0 · Última actualización: 18 de Marzo de 2026_
