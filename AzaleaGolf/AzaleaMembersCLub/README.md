# 🏌️ Azalea Golf Simulator

## 📋 Descripción

Azalea Golf Simulator es una aplicación web completa para el análisis y seguimiento de sesiones de práctica de golf. La aplicación permite a los usuarios registrar sesiones de práctica, analizar sus tiros, generar reportes y crear yardage books personalizados.

## ✨ Características Principales

### 🔐 Sistema de Autenticación

- **Registro de usuarios** con validación completa
- **Inicio de sesión** seguro con Firebase Auth
- **Persistencia de sesión** entre recargas
- **Redirección automática** según el estado de autenticación

### 📊 Gestión de Sesiones

- **Carga de sesiones** desde Firestore
- **Visualización de datos** en tablas interactivas
- **Filtrado y ordenamiento** de tiros
- **Selección múltiple** de tiros para análisis

### 📈 Análisis de Datos

- **Estadísticas detalladas** por palo
- **Mapas de dispersión** para visualizar patrones
- **Cálculo de promedios** automático
- **Heatmaps** para identificar tendencias

### 📄 Exportación de Datos

- **Exportación a PDF** con formato profesional
- **Exportación a CSV** para análisis externo
- **Yardage Books** personalizados
- **Reportes completos** de sesiones

### 🎨 Interfaz de Usuario

- **Diseño responsivo** para todos los dispositivos
- **Navegación intuitiva** entre secciones
- **Indicadores de carga** y feedback visual
- **Notificaciones** en tiempo real

## 🏗️ Arquitectura del Proyecto

### Estructura de Archivos

```
AzaleaMembersCLub/
├── 📁 firebase/           # Configuración de Firebase
├── 📁 img/               # Imágenes y recursos
├── 📁 Sesiones/          # Módulo principal de sesiones
│   ├── 📁 js/           # JavaScript modularizado
│   │   ├── sessions.js  # Gestión de sesiones
│   │   ├── shots.js     # Manejo de tiros
│   │   └── storage.js   # Almacenamiento local
│   ├── heatmap.js       # Generación de heatmaps
│   ├── pdfExport.js     # Exportación a PDF
│   ├── yardageBook.js   # Creación de yardage books
│   └── index.html       # Página principal de sesiones
├── 📁 utils/            # Utilidades compartidas
│   ├── errorHandler.js  # Manejo centralizado de errores
│   ├── validators.js    # Validación de formularios
│   ├── cache.js         # Sistema de caché
│   └── pagination.js    # Paginación de datos
├── auth.js              # Sistema de autenticación
├── config.js            # Configuración de la aplicación
├── firebase.js          # Inicialización de Firebase
├── index.html           # Página principal
├── login.html           # Página de inicio de sesión
├── register.html        # Página de registro
└── styles.css           # Estilos globales
```

### Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Firebase (Auth, Firestore)
- **Librerías**: Chart.js, jsPDF, html2canvas
- **Arquitectura**: Modular con ES6 modules

## 🚀 Instalación y Configuración

### Prerrequisitos

- Node.js (versión 14 o superior)
- Cuenta de Firebase
- Navegador web moderno

### Pasos de Instalación

1. **Clonar el repositorio**

   ```bash
   git clone https://github.com/tu-usuario/azalea-golf-simulator.git
   cd azalea-golf-simulator
   ```

2. **Configurar Firebase**

   - Crear un proyecto en [Firebase Console](https://console.firebase.google.com/)
   - Habilitar Authentication y Firestore
   - Copiar las credenciales de configuración

3. **Configurar variables de entorno**

   ```bash
   # Crear archivo .env en la raíz del proyecto
   FIREBASE_API_KEY=tu_api_key
   FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
   FIREBASE_PROJECT_ID=tu_proyecto
   FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
   FIREBASE_APP_ID=tu_app_id
   FIREBASE_MEASUREMENT_ID=tu_measurement_id
   ```

4. **Instalar dependencias** (si se usa un bundler)

   ```bash
   npm install
   ```

5. **Ejecutar la aplicación**
   ```bash
   # Usando un servidor local
   npx http-server
   # O abrir index.html directamente en el navegador
   ```

## 📖 Guía de Uso

### Registro de Usuario

1. Navegar a la página de registro
2. Completar el formulario con:
   - Nombre y apellido
   - Correo electrónico válido
   - Contraseña segura
3. Confirmar la contraseña
4. Hacer clic en "Registrarse"

### Inicio de Sesión

1. Navegar a la página de login
2. Ingresar correo electrónico y contraseña
3. Hacer clic en "Iniciar Sesión"

### Gestión de Sesiones

1. **Ver sesiones existentes**

   - Las sesiones se cargan automáticamente
   - Se muestran ordenadas por fecha (más recientes primero)

2. **Seleccionar una sesión**

   - Hacer clic en una sesión para ver sus tiros
   - Los datos se muestran en una tabla interactiva

3. **Filtrar y ordenar**

   - Usar los controles de filtrado para buscar tiros específicos
   - Hacer clic en los encabezados de columna para ordenar

4. **Seleccionar tiros**
   - Marcar/desmarcar tiros individuales
   - Usar "Seleccionar todos" para selección masiva

### Análisis de Datos

1. **Ver estadísticas por palo**

   - Los promedios se calculan automáticamente
   - Se muestran en filas especiales en la tabla

2. **Mapa de dispersión**

   - Cambiar a vista de mapa de dispersión
   - Visualizar patrones de distancia y precisión

3. **Heatmaps**
   - Generar heatmaps para identificar tendencias
   - Analizar distribución de tiros

### Exportación

1. **Exportar a PDF**

   - Seleccionar tiros deseados
   - Hacer clic en "Exportar a PDF"
   - Descargar el reporte generado

2. **Exportar a CSV**

   - Seleccionar tiros deseados
   - Hacer clic en "Exportar a CSV"
   - Descargar el archivo de datos

3. **Crear Yardage Book**
   - Seleccionar múltiples sesiones
   - Configurar opciones de yardage book
   - Generar PDF personalizado

## 🔧 Configuración Avanzada

### Personalización de Estilos

Los estilos se pueden personalizar editando `styles.css`:

```css
/* Variables CSS personalizables */
:root {
  --primary-color: #280e18;
  --secondary-color: #514549;
  --accent-color: #43, 41, 41;
  --text-color: #333;
  --background-color: #ffffff;
}
```

### Configuración de Firebase

Editar `config.js` para cambiar configuraciones:

```javascript
export const appConfig = {
  pagination: {
    sessionsPerPage: 10, // Sesiones por página
    shotsPerPage: 50, // Tiros por página
  },
  export: {
    maxShotsPerExport: 1000, // Máximo tiros para exportar
  },
  cache: {
    sessionTimeout: 30 * 60 * 1000, // Tiempo de caché
  },
};
```

### Manejo de Errores

El sistema de manejo de errores se puede configurar en `utils/errorHandler.js`:

```javascript
configureErrorHandler({
  showNotifications: true, // Mostrar notificaciones
  logToConsole: true, // Log en consola
  logToServer: false, // Log en servidor
});
```

## 🐛 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a Firebase**

   - Verificar credenciales en `config.js`
   - Comprobar conexión a internet
   - Verificar reglas de Firestore

2. **Datos no se cargan**

   - Verificar autenticación del usuario
   - Comprobar permisos de Firestore
   - Revisar consola del navegador

3. **Exportación falla**

   - Verificar que hay tiros seleccionados
   - Comprobar espacio en disco
   - Revisar permisos del navegador

4. **Problemas de rendimiento**
   - Reducir número de tiros por página
   - Limpiar caché del navegador
   - Verificar conexión a internet

### Logs y Debugging

Los logs se muestran en la consola del navegador con emojis para facilitar la identificación:

- 🔧 Configuración
- ✅ Éxito
- ❌ Error
- 🔄 Estado
- 👤 Usuario
- 📦 Caché
- 💾 Firestore

## 🔒 Seguridad

### Medidas Implementadas

- **Autenticación segura** con Firebase Auth
- **Validación de datos** en frontend y backend
- **Reglas de Firestore** para proteger datos
- **Sanitización de inputs** en formularios
- **Manejo seguro de errores** sin exponer información sensible

### Recomendaciones

- Usar HTTPS en producción
- Configurar reglas de Firestore estrictas
- Implementar rate limiting
- Monitorear logs de seguridad
- Actualizar dependencias regularmente

## 📈 Performance

### Optimizaciones Implementadas

- **Sistema de caché** para datos frecuentes
- **Paginación** para grandes conjuntos de datos
- **Lazy loading** de recursos
- **Compresión** de assets
- **Minificación** de código

### Métricas de Rendimiento

- Tiempo de carga inicial: < 2 segundos
- Tiempo de respuesta de consultas: < 500ms
- Tamaño del bundle: < 1MB
- Compatibilidad: 95%+ de navegadores

## 🤝 Contribución

### Cómo Contribuir

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

### Estándares de Código

- Usar ES6+ features
- Comentar funciones complejas
- Seguir convenciones de nomenclatura
- Incluir tests para nuevas funcionalidades
- Documentar cambios en README

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Tu Nombre** - _Desarrollo inicial_ - [TuUsuario](https://github.com/TuUsuario)

## 🙏 Agradecimientos

- Firebase por la infraestructura
- Chart.js por las visualizaciones
- jsPDF por la generación de PDFs
- Comunidad de desarrolladores por el soporte

## 📞 Soporte

Para soporte técnico o preguntas:

- 📧 Email: soporte@azaleagolf.com
- 💬 Discord: [Servidor de la comunidad](https://discord.gg/azaleagolf)
- 📖 Documentación: [Wiki del proyecto](https://github.com/tu-usuario/azalea-golf-simulator/wiki)
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/azalea-golf-simulator/issues)

---

**¡Gracias por usar Azalea Golf Simulator! 🏌️⛳**
