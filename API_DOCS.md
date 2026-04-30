# FixFlow - Implementación Frontend (API Docs)

> **ATENCIÓN AGENTES DE IA:** Este archivo documenta estrictamente la estructura de los endpoints que el frontend consumirá. **Bajo ninguna circunstancia** se deben inventar rutas, nombres de campos, payloads o formatos de respuesta que no estén explícitamente definidos aquí. Si falta un endpoint, se debe solicitar/crear en el backend primero.

Este archivo debe ser copiado a la raíz del repositorio frontend una vez que sea inicializado para mantener sincronía.

---

## 1. Workspaces

### `GET /api/workspaces`
Retorna la lista de workspaces a los que el usuario tiene acceso (sea owner o colaborador).

### `POST /api/workspaces`
Crea un nuevo workspace. (Sujeto a límite del Plan).
**Payload:**
```json
{
  "name": "Casa"
}
```

---

## 2. Devices (Equipos)

### `GET /api/workspaces/{workspace_id}/devices`
Retorna los equipos dentro de un workspace específico.

### `POST /api/workspaces/{workspace_id}/devices`
Crea un nuevo equipo. (Sujeto a límite del Plan).
**Payload:**
```json
{
  "name": "La Bestia"
}
```

### `GET /api/devices/{device_id}`
Retorna los detalles del equipo, incluyendo un arreglo anidado de `components` y su `last_maintenance_date` calculado.

---

## 3. Components

### `GET /api/devices/{device_id}/components`
Retorna la lista de componentes de un equipo. El frontend debe agruparlos visualmente por categoría.

### `POST /api/devices/{device_id}/components`
Registra un nuevo componente.
**Payload:**
```json
{
  "category": "cpu", // Debe ser uno del Enum: cpu, motherboard, ram, gpu, cooler, psu, storage, case, case_fans
  "name": "Ryzen 7 5800X3D",
  "capacity": "", // Opcional
  "speed": "3.4GHz", // Opcional
  "purchase_date": "2023-03-15", // Formato YYYY-MM-DD
  "store_url": "https://amazon.com/..." // Opcional
}
```

### `POST /api/components/{component_id}/photos`
Sube una foto para un componente. (El backend rechazará si el plan es Free).

---

## 4. Maintenance Logs

### `POST /api/devices/{device_id}/maintenance-logs`
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
- **Autenticación:** Todas las peticiones requerirán token Bearer (por definirse si Sanctum o JWT según base de Kaan Core).
- **Control de Límites:** El frontend debe leer el `plan` del usuario actual. Si el límite se alcanza, el frontend debe mostrar un modal de "Upgrade to Pro" y NO intentar hacer la petición POST (para evitar 403 innecesarios, aunque el backend igual lo protegerá).
