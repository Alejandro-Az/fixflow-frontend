# Guía de Estilos y Componentes Frontend (FixFlow)

Este documento centraliza las reglas vitales para el desarrollo y mantenimiento del frontend, con especial énfasis en prevenir los errores de compilación de estilos (`NativeWind` v4) que han ocurrido repetidamente.

## 1. La Regla de Oro de NativeWind v4

**El problema:** Importar componentes primitivos como `View`, `Text`, o `TouchableOpacity` directamente desde `react-native` en los archivos de tus pantallas hará que **Tailwind los ignore por completo**. Tu código se mostrará sin estilos, en blanco y negro, independientemente de las clases de `className` que utilices.

**La causa:** En esta arquitectura, `NativeWind` utiliza un sistema de "cssInterop". Para que un componente nativo sea capaz de "entender" y procesar las clases de Tailwind (como `bg-surface` o `text-[#6699cc]`), este componente tiene que pasar primero por una interpolación.

### Cómo Importar Correctamente

Todos los componentes base ya interpolados y listos para usar se encuentran en `src/components/ui.tsx`. 

**❌ INCORRECTO (Jamás hacer esto):**
```javascript
import { View, Text, TouchableOpacity } from 'react-native';
```

**✅ CORRECTO:**
```javascript
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView } from 'relative/path/to/src/components/ui';
// Excepción: Cosas nativas puras como Platform, Alert o ActivityIndicator pueden o no venir de ui.tsx dependiendo de si requieren clases o no. Si necesitan clases, sácalas de ui.tsx.
```

> **Consejo Operativo:** Si alguna vez creas una pantalla o componente nuevo y los estilos CSS parecen simplemente "no estar conectando", revisa los imports antes que nada. El 99% de las veces es un import fantasma de `react-native`.

## 2. Nomenclatura de Categorías (Frontend vs Backend)

El backend de FixFlow impone validaciones estrictas sobre el campo `category` al recibir payloads. Si el frontend envía una string que no coincide, el servidor devolverá `422 VALIDATION_ERROR`.

**Categorías oficiales soportadas:**
- `cpu`
- `gpu`
- `ram`
- `motherboard`
- `psu`
- `storage`
- `cooler` *(NOTA: JAMÁS USAR `cooling` NI VARIABLES ASOCIADAS)*
- `case`
- `case_fans`

Todo componente (`CategoryRow`, `CATEGORIES`, `CATEGORY_ICONS`) debe hacer match 1:1 con estas variables.
