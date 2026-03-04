# La Panchoneta - Panel Administrador

## 📋 Descripción
Sistema de gestión y administración para La Panchoneta, una cadena de comida rápida especializada en panchos. Este panel permite administrar productos, categorías, combos, stock, ingredientes y más.

## 🚀 Características Principales

### Módulos Implementados
- **Dashboard**: Vista general con métricas y estadísticas
- **Productos**: CRUD completo de productos con gestión de imágenes
- **Categorías**: Gestión de categorías de productos
- **Combos**: Creación y administración de combos promocionales
- **Stock**: Control de inventario con alertas de stock bajo
- **Ingredientes**: Gestión de ingredientes base
- **Gustos/Sabores**: Administración de variantes de productos
- **Adicionales**: Gestión de productos adicionales

### Funcionalidades
- 🔐 Sistema de autenticación con roles
- 🏢 Selección de sucursal para trabajo específico
- 📊 Dashboard con KPIs en tiempo real
- 🔍 Búsqueda y filtros avanzados
- 📱 Diseño responsive con Bootstrap 5
- 🎨 Interfaz moderna con colores personalizados
- ⚡ Arquitectura modular con Angular 18

## 🛠️ Tecnologías Utilizadas
- **Frontend**: Angular 18 (Standalone Components)
- **Estilos**: Bootstrap 5.3 + SCSS personalizado
- **Iconos**: Bootstrap Icons
- **Gráficos**: Chart.js (preparado para implementación)
- **HTTP**: HttpClient con interceptores para autenticación

## 📦 Instalación

### Prerequisitos
- Node.js 18+ 
- npm 9+
- Angular CLI 18

### Pasos de instalación

1. **Clonar o descargar el proyecto**
```bash
cd panchoneta-admin
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar el backend**
Editar el archivo `src/app/core/services/auth.service.ts` y `product.service.ts` para apuntar a tu API:
```typescript
private apiUrl = 'http://tu-backend-url/api';
```

4. **Ejecutar en desarrollo**
```bash
npm start
# o
ng serve
```

El sistema estará disponible en `http://localhost:4200`

5. **Compilar para producción**
```bash
npm run build
# o
ng build --configuration production
```

## 🏗️ Estructura del Proyecto

```
panchoneta-admin/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models/        # Modelos de datos
│   │   │   ├── services/      # Servicios de API
│   │   │   ├── interceptors/  # Interceptores HTTP
│   │   │   └── guards/        # Guards de rutas
│   │   ├── pages/
│   │   │   ├── login/         # Página de login
│   │   │   ├── dashboard/     # Dashboard principal
│   │   │   ├── products/      # Gestión de productos
│   │   │   ├── categories/    # Gestión de categorías
│   │   │   ├── combos/        # Gestión de combos
│   │   │   ├── stock/         # Control de inventario
│   │   │   └── ...           # Otros módulos
│   │   ├── app.component.ts   # Componente principal
│   │   └── app.routes.ts      # Configuración de rutas
│   ├── assets/                # Recursos estáticos
│   ├── index.html            # HTML principal
│   ├── main.ts               # Bootstrap de la aplicación
│   └── styles.scss           # Estilos globales
├── angular.json              # Configuración de Angular
├── package.json              # Dependencias
└── tsconfig.json            # Configuración TypeScript
```

## 🔑 Autenticación y Roles

El sistema maneja 4 roles principales:
- **SuperAdmin**: Acceso total al sistema
- **Admin**: Administración de franquicia
- **Manager**: Gestión de sucursal
- **Employee**: Operaciones básicas

## 📡 Integración con Backend

El sistema espera un backend con los siguientes endpoints:

### Autenticación
- `POST /api/login` - Login de usuario
- `POST /api/logout` - Logout

### Productos
- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto
- `PUT /api/products/:id` - Actualizar producto
- `DELETE /api/products/:id` - Eliminar producto
- `PATCH /api/products/:id/stock` - Actualizar stock

### Categorías
- `GET /api/categories` - Listar categorías
- `GET /api/categories/:id` - Obtener categoría
- `POST /api/categories` - Crear categoría
- `PUT /api/categories/:id` - Actualizar categoría
- `DELETE /api/categories/:id` - Eliminar categoría

### Combos
- `GET /api/combos` - Listar combos
- `POST /api/combos` - Crear combo
- `PUT /api/combos/:id` - Actualizar combo
- `DELETE /api/combos/:id` - Eliminar combo

## 🎨 Personalización

### Colores principales
Los colores del sistema se pueden personalizar en `src/styles.scss`:

```scss
:root {
  --primary-color: #ff6b35;    // Naranja principal
  --secondary-color: #f7931e;  // Naranja secundario
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  --info-color: #17a2b8;
}
```

## 📝 Notas de Desarrollo

### Próximas Implementaciones
1. **POS (Punto de Venta)**: Sistema de ventas integrado
2. **Reportes**: Módulo de reportes y estadísticas avanzadas
3. **Caja**: Control de caja con apertura y cierre
4. **Integración AFIP**: Facturación electrónica
5. **API PedidosYa**: Recepción automática de pedidos
6. **MercadoPago**: Integración de pagos online

### Estado Actual
- ✅ Estructura base completa
- ✅ Sistema de autenticación
- ✅ CRUD de productos y categorías
- ✅ Gestión de combos
- ✅ Control de stock básico
- ⏳ Integración con backend real
- ⏳ Módulos de adicionales, gustos e ingredientes
- ⏳ Sistema de reportes

## 🤝 Soporte

Para soporte o consultas sobre el sistema, contactar al equipo de desarrollo.

## 📄 Licencia

Sistema privado desarrollado para La Panchoneta. Todos los derechos reservados.

---

**Versión**: 1.0.0  
**Última actualización**: Noviembre 2024  
**Desarrollado para**: La Panchoneta
