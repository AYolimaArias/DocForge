# Estructura de Componentes - DocForge

Esta carpeta contiene todos los componentes de la aplicación DocForge, organizados de manera modular y reutilizable.

## Estructura de Carpetas

```
components/
├── ui/                    # Componentes de interfaz base
│   ├── Button.tsx        # Botón reutilizable con variantes
│   ├── Card.tsx          # Contenedor de tarjeta
│   ├── Loader.tsx        # Indicador de carga
│   └── Alert.tsx         # Alertas y mensajes
├── Layout.tsx            # Layout principal de la aplicación
├── ErrorBoundary.tsx     # Manejo de errores
├── Sidebar.tsx           # Barra lateral con navegación
├── FileUpload.tsx        # Carga de archivos y repositorios
├── FileTree.tsx          # Árbol de archivos
├── AIInteraction.tsx     # Interacción con IA
├── DocumentPreview.tsx   # Vista previa de documentos
├── types.ts              # Tipos TypeScript compartidos
├── index.ts              # Exportaciones centralizadas
└── README.md             # Esta documentación
```

## Componentes UI Base

### Button
Botón reutilizable con múltiples variantes y tamaños.

```tsx
<Button variant="primary" size="md" icon="github">
  Iniciar sesión
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost'
- `size`: 'sm' | 'md' | 'lg'
- `icon`: 'refresh' | 'github' | 'upload' | 'info' | React.ReactNode

### Card
Contenedor de tarjeta con título opcional.

```tsx
<Card title="Mi Título" subtitle="Subtítulo opcional">
  Contenido de la tarjeta
</Card>
```

### Loader
Indicador de carga animado.

```tsx
<Loader size="md" />
```

### Alert
Alertas para mostrar mensajes de error, éxito o información.

```tsx
<Alert type="error" message="Mensaje de error" />
```

## Componentes de Funcionalidad

### Sidebar
Barra lateral que contiene:
- Logo de la aplicación
- Botón de nuevo proyecto
- Lista de documentos generados
- Panel de autenticación

### FileUpload
Maneja la carga de:
- Archivos ZIP
- Repositorios de GitHub
- Visualización del árbol de archivos

### FileTree
Renderiza la estructura de archivos en formato de árbol con:
- Carpetas expandibles
- Checkboxes para selección
- Iconos diferenciados

### AIInteraction
Interfaz para interactuar con la IA:
- Campo de texto para instrucciones
- Tooltip con ejemplos
- Manejo de diferentes formatos de salida

### DocumentPreview
Vista previa de documentos generados:
- Renderizado de Markdown
- Soporte para diagramas Mermaid
- Botón de descarga

## Componentes de Layout

### Layout
Wrapper principal que incluye:
- ErrorBoundary
- Estructura base de la aplicación

### ErrorBoundary
Maneja errores no capturados:
- Interfaz amigable para errores
- Opciones de recuperación
- Detalles técnicos en desarrollo

## Tipos Compartidos

### DocumentoGenerado
```tsx
type DocumentoGenerado = {
  id: string;
  tipo: "markdown" | "html" | "word" | "pdf";
  nombre: string;
  contenido: string | Blob;
  fecha: Date;
};
```

### User
```tsx
type User = {
  name?: string | null;
  avatar_url?: string | null;
  id?: string | null;
};
```

## Uso

Todos los componentes se exportan desde el archivo `index.ts`:

```tsx
import {
  Button,
  Card,
  Sidebar,
  FileUpload,
  AIInteraction,
  DocumentPreview,
  type DocumentoGenerado,
} from '../components';
```

## Convenciones

1. **Nomenclatura**: PascalCase para componentes, camelCase para props
2. **Props**: Interfaces TypeScript para todas las props
3. **Estilos**: Tailwind CSS con clases personalizadas cuando sea necesario
4. **Estado**: Props para datos, callbacks para eventos
5. **Accesibilidad**: Atributos ARIA y navegación por teclado
6. **Responsive**: Diseño adaptable a diferentes tamaños de pantalla

## Extensibilidad

Para agregar nuevos componentes:

1. Crear el archivo en la carpeta apropiada
2. Definir la interfaz TypeScript
3. Implementar el componente con Tailwind CSS
4. Exportar desde `index.ts`
5. Actualizar esta documentación 