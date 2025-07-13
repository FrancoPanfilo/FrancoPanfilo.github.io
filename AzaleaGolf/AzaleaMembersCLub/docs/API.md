# 📚 Documentación de API - Azalea Golf Simulator

## 📋 Índice

1. [Autenticación](#autenticación)
2. [Gestión de Usuarios](#gestión-de-usuarios)
3. [Gestión de Sesiones](#gestión-de-sesiones)
4. [Análisis de Datos](#análisis-de-datos)
5. [Exportación](#exportación)
6. [Utilidades](#utilidades)
7. [Manejo de Errores](#manejo-de-errores)
8. [Caché](#caché)
9. [Paginación](#paginación)
10. [Validación](#validación)

---

## 🔐 Autenticación

### `auth.js`

#### `getCurrentUserData(uid = null)`

Obtiene los datos del usuario actual desde Firestore o caché.

**Parámetros:**

- `uid` (string, opcional): ID del usuario. Si no se proporciona, usa el usuario actual.

**Retorna:** `Promise<Object|null>`

- Objeto con datos del usuario o `null` si no existe

**Ejemplo:**

```javascript
import { getCurrentUserData } from "./auth.js";

const userData = await getCurrentUserData();
console.log(userData.nombre, userData.apellido);
```

#### `handleLogout()`

Maneja el cierre de sesión del usuario.

**Retorna:** `Promise<void>`

**Ejemplo:**

```javascript
import { handleLogout } from "./auth.js";

await handleLogout();
```

#### Funciones de verificación de página

- `isLoginPage()`: Verifica si está en la página de login
- `isRegisterPage()`: Verifica si está en la página de registro
- `isSessionsPage()`: Verifica si está en la página de sesiones
- `isHomePage()`: Verifica si está en la página principal

---

## 👥 Gestión de Usuarios

### Estructura de Datos de Usuario

```javascript
{
  nombre: string,
  apellido: string,
  email: string,
  fechaRegistro: string, // ISO date
  ultimaActividad: string, // ISO date
  Sesiones: Array<Session>
}
```

### Funciones de Usuario

#### `setupLoginForm()`

Configura el formulario de inicio de sesión con validación en tiempo real.

#### `setupRegisterForm()`

Configura el formulario de registro con validación completa.

---

## 📊 Gestión de Sesiones

### Estructura de Datos de Sesión

```javascript
{
  fecha: string, // ISO date
  datos: Array<Shot>,
  stats: {
    shotCount: number,
    sessionTime: string
  }
}
```

### Estructura de Datos de Tiro

```javascript
{
  "club name": string,
  "ball speed (mph)": number,
  "launch angle (deg)": number,
  "back spin (rpm)": number,
  "side spin (rpm l-/r+)": number,
  "carry (yds)": number,
  "total distance (yds)": number,
  "peak height (yds)": number,
  "descent angle (deg)": number,
  "club speed (mph)": number,
  "efficiency": number,
  "angle of attack (deg)": number,
  "club path (deg out-in-/in-out+)": number
}
```

### Funciones de Sesiones

#### `loadSessions()`

Carga todas las sesiones del usuario actual.

**Retorna:** `Promise<void>`

#### `loadSessionData(sessionId)`

Carga los datos específicos de una sesión.

**Parámetros:**

- `sessionId` (string): ID de la sesión

**Retorna:** `Promise<Array<Shot>>`

#### `displayShotsTable(data, sessionIndex)`

Muestra la tabla de tiros para una sesión.

**Parámetros:**

- `data` (Array<Shot>): Datos de los tiros
- `sessionIndex` (number): Índice de la sesión

---

## 📈 Análisis de Datos

### Funciones de Análisis

#### `calculateClubAverages(club, shots)`

Calcula los promedios para un palo específico.

**Parámetros:**

- `club` (string): Nombre del palo
- `shots` (Array<Shot>): Array de tiros

**Retorna:** `Array<string>` - Promedios formateados

#### `updateClubAverages()`

Actualiza los promedios mostrados en la tabla.

#### `formatClubName(clubName, short = false)`

Formatea el nombre de un palo.

**Parámetros:**

- `clubName` (string): Código del palo
- `short` (boolean): Si retornar versión corta

**Retorna:** `string` - Nombre formateado

#### `getClubOrder(clubName)`

Obtiene el orden jerárquico de un palo.

**Parámetros:**

- `clubName` (string): Código del palo

**Retorna:** `number` - Orden del palo

---

## 📄 Exportación

### `pdfExport.js`

#### `exportSessionToPDF(sessionData, userData, selectedShots)`

Exporta una sesión a PDF.

**Parámetros:**

- `sessionData` (Array<Shot>): Datos de la sesión
- `userData` (Object): Datos del usuario
- `selectedShots` (Set<number>): Índices de tiros seleccionados

**Retorna:** `Promise<void>`

### `yardageBook.js`

#### `createYardageBook(sessions, userData, options)`

Crea un yardage book con múltiples sesiones.

**Parámetros:**

- `sessions` (Array<Session>): Sesiones a incluir
- `userData` (Object): Datos del usuario
- `options` (Object): Opciones de configuración

**Retorna:** `Promise<void>`

---

## 🛠️ Utilidades

### `utils/constants.js`

#### Constantes de Golf

```javascript
import { GOLF_CONSTANTS, ENUMS, COLOR_PALETTE } from "./utils/constants.js";
```

#### Funciones Helper

##### `formatClubName(clubCode, short = false)`

Formatea nombre de palo.

##### `getClubColor(clubCode)`

Obtiene color para un palo.

##### `validateMetricRange(value, metric)`

Valida rango de métrica.

##### `formatMetric(value, metric, decimals = 1)`

Formatea métrica con unidades.

##### `formatDate(date, format = 'DD/MM/YYYY HH:mm')`

Formatea fecha.

##### `generateId(prefix = '')`

Genera ID único.

##### `debounce(func, wait)`

Implementa debounce.

##### `throttle(func, limit)`

Implementa throttle.

##### `deepClone(obj)`

Clona objeto profundamente.

---

## ⚠️ Manejo de Errores

### `utils/errorHandler.js`

#### `handleError(error, context = 'general', options = {})`

Maneja errores generales.

**Parámetros:**

- `error` (Error|string): Error a manejar
- `context` (string): Contexto del error
- `options` (Object): Opciones adicionales

#### `handleFirebaseAuthError(error, context = 'auth')`

Maneja errores específicos de Firebase Auth.

**Parámetros:**

- `error` (Error): Error de Firebase
- `context` (string): Contexto del error

**Retorna:** `string` - Mensaje de error traducido

#### `handleFirestoreError(error, context = 'firestore')`

Maneja errores específicos de Firestore.

**Parámetros:**

- `error` (Error): Error de Firestore
- `context` (string): Contexto del error

**Retorna:** `string` - Mensaje de error traducido

#### `showNotification(message, type = 'error')`

Muestra notificación al usuario.

**Parámetros:**

- `message` (string): Mensaje a mostrar
- `type` (string): Tipo de notificación ('error', 'success', 'warning', 'info')

---

## 💾 Caché

### `utils/cache.js`

#### `cacheSet(key, value, ttl)`

Guarda dato en caché.

**Parámetros:**

- `key` (string): Clave del dato
- `value` (any): Valor a guardar
- `ttl` (number): Tiempo de vida en ms

#### `cacheGet(key)`

Obtiene dato del caché.

**Parámetros:**

- `key` (string): Clave del dato

**Retorna:** `any` - Valor almacenado o null

#### `cacheWithFallback(key, fetchFunction, ttl)`

Obtiene del caché o ejecuta función de fallback.

**Parámetros:**

- `key` (string): Clave del caché
- `fetchFunction` (Function): Función que obtiene datos
- `ttl` (number): Tiempo de vida

**Retorna:** `Promise<any>` - Datos del caché o función

#### Funciones específicas

- `cacheSession(sessionId, sessionData)`: Guarda sesión en caché
- `getCachedSession(sessionId)`: Obtiene sesión del caché
- `cacheUserData(userId, userData)`: Guarda datos de usuario
- `getCachedUserData(userId)`: Obtiene datos de usuario

---

## 📄 Paginación

### `utils/pagination.js`

#### `PaginationManager`

Clase principal para manejar paginación.

**Constructor:**

```javascript
new PaginationManager(container, options);
```

**Parámetros:**

- `container` (HTMLElement): Contenedor donde mostrar datos
- `options` (Object): Opciones de configuración

**Métodos principales:**

- `loadData(items, resetPage = true)`: Carga datos
- `goToPage(page)`: Va a página específica
- `sort(column, direction)`: Ordena datos
- `filter(filter)`: Filtra datos
- `getCurrentPageData()`: Obtiene datos de página actual

#### `TablePagination`

Extensión para paginar tablas.

#### `ListPagination`

Extensión para paginar listas.

---

## ✅ Validación

### `utils/validators.js`

#### `validateEmail(email)`

Valida formato de email.

**Parámetros:**

- `email` (string): Email a validar

**Retorna:** `Object` - `{isValid, message}`

#### `validatePassword(password)`

Valida contraseña.

**Parámetros:**

- `password` (string): Contraseña a validar

**Retorna:** `Object` - `{isValid, message, strength}`

#### `validateName(name, fieldName = 'nombre')`

Valida nombre.

**Parámetros:**

- `name` (string): Nombre a validar
- `fieldName` (string): Nombre del campo

**Retorna:** `Object` - `{isValid, message}`

#### `validateForm(formData, validationRules)`

Valida formulario completo.

**Parámetros:**

- `formData` (Object): Datos del formulario
- `validationRules` (Object): Reglas de validación

**Retorna:** `Object` - `{isValid, errors, fieldErrors}`

#### `setupRealTimeValidation(form, validationRules)`

Configura validación en tiempo real.

**Parámetros:**

- `form` (HTMLElement): Elemento del formulario
- `validationRules` (Object): Reglas de validación

---

## 🔧 Configuración

### `config.js`

#### `firebaseConfig`

Configuración de Firebase.

#### `appConfig`

Configuración de la aplicación:

```javascript
{
  appName: string,
  version: string,
  pagination: {
    sessionsPerPage: number,
    shotsPerPage: number
  },
  export: {
    maxShotsPerExport: number,
    supportedFormats: Array<string>
  },
  cache: {
    sessionTimeout: number,
    maxCacheSize: number
  }
}
```

#### `errorMessages`

Mensajes de error centralizados.

#### `validations`

Reglas de validación:

```javascript
{
  email: { pattern: RegExp, message: string },
  password: { minLength: number, message: string },
  name: { minLength: number, maxLength: number, pattern: RegExp, message: string }
}
```

---

## 📱 Eventos y Listeners

### Eventos Globales

#### `onAuthStateChanged`

Escucha cambios en el estado de autenticación.

#### `DOMContentLoaded`

Inicializa la aplicación cuando el DOM está listo.

### Eventos de Formulario

#### `submit`

Maneja envío de formularios de login y registro.

#### `input`

Validación en tiempo real.

#### `blur`

Validación al perder foco.

### Eventos de Interfaz

#### `click`

- Selección de sesiones
- Navegación de paginación
- Cierre de modales
- Exportación

#### `change`

- Filtros
- Switches de vista
- Selección múltiple

---

## 🎨 Estilos y CSS

### Variables CSS

```css
:root {
  --primary-color: #280e18;
  --secondary-color: #514549;
  --accent-color: rgb(43, 41, 41);
  --success-color: #27ae60;
  --error-color: #e74c3c;
  --warning-color: #f39c12;
  --info-color: #3498db;
}
```

### Clases Utilitarias

- `.btn`, `.btn-primary`, `.btn-secondary`
- `.card`, `.card-header`, `.card-body`
- `.table`, `.table-container`
- `.notification`, `.modal`
- `.loading-spinner`, `.empty-state`

---

## 🔒 Seguridad

### Validaciones Implementadas

- Validación de email
- Validación de contraseña
- Validación de nombres
- Sanitización de inputs
- Validación de rangos de datos

### Medidas de Seguridad

- Autenticación con Firebase
- Reglas de Firestore
- Validación en frontend y backend
- Manejo seguro de errores

---

## 📊 Performance

### Optimizaciones

- Sistema de caché
- Paginación de datos
- Lazy loading
- Debounce en búsquedas
- Throttle en eventos

### Métricas

- Tiempo de carga inicial: < 2s
- Tiempo de respuesta: < 500ms
- Compatibilidad: 95%+ navegadores

---

## 🐛 Debugging

### Logs

Los logs usan emojis para facilitar identificación:

- 🔧 Configuración
- ✅ Éxito
- ❌ Error
- 🔄 Estado
- 👤 Usuario
- 📦 Caché
- 💾 Firestore

### Console

```javascript
console.log("✅ Operación exitosa");
console.error("❌ Error en operación");
console.warn("⚠️ Advertencia");
```

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Cargar sesiones con caché

```javascript
import { cacheWithFallback, getCachedSession } from "./utils/cache.js";
import { loadSessionData } from "./auth.js";

const sessionData = await cacheWithFallback(
  `session_${sessionId}`,
  () => loadSessionData(sessionId),
  60 * 60 * 1000 // 1 hora
);
```

### Ejemplo 2: Validar formulario

```javascript
import { validateForm, setupRealTimeValidation } from "./utils/validators.js";

const validationRules = {
  email: { required: true, type: "email" },
  password: { required: true, minLength: 6 },
};

setupRealTimeValidation(form, validationRules);
const result = validateForm(formData, validationRules);
```

### Ejemplo 3: Manejar errores

```javascript
import {
  handleFirebaseAuthError,
  showNotification,
} from "./utils/errorHandler.js";

try {
  await signInWithEmailAndPassword(auth, email, password);
  showNotification("¡Inicio de sesión exitoso!", "success");
} catch (error) {
  const message = handleFirebaseAuthError(error, "login");
  showNotification(message, "error");
}
```

### Ejemplo 4: Paginación

```javascript
import { TablePagination } from "./utils/pagination.js";

const pagination = new TablePagination(container, {
  itemsPerPage: 50,
  columns: [
    { key: "club name", title: "Palo", sortable: true },
    { key: "total distance (yds)", title: "Distancia", sortable: true },
  ],
  onPageChange: (data, page) => {
    console.log(`Página ${page}:`, data);
  },
});

pagination.loadData(sessionData);
```

---

## 🔄 Migración y Actualizaciones

### Versión 1.0.0

- Sistema de autenticación básico
- Gestión de sesiones
- Exportación a PDF/CSV

### Versión 1.1.0

- Sistema de caché
- Paginación
- Manejo de errores mejorado

### Versión 1.2.0

- Validación en tiempo real
- Yardage books
- Performance optimizado

---

## 📞 Soporte

Para soporte técnico:

- 📧 Email: soporte@azaleagolf.com
- 💬 Discord: [Servidor de la comunidad](https://discord.gg/azaleagolf)
- 📖 Wiki: [Documentación completa](https://github.com/tu-usuario/azalea-golf-simulator/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/azalea-golf-simulator/issues)

---

_Última actualización: Enero 2025_
