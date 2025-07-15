# Plan de Implementación DevPipe

## Estructura del Proyecto

```
tracking-tool/
├── server/
│   ├── main.py           # Servidor Flask principal
│   ├── api/              # Endpoints de la API
│   │   ├── logs.py       # Endpoints para gestión de logs
│   │   ├── config.py     # Endpoints para configuración
│   │   └── files.py      # Endpoints para gestión de archivos
│   ├── core/             # Lógica central
│   │   ├── log_manager.py    # Gestión de logs y archivos
│   │   ├── file_watcher.py   # Monitoreo de archivos externos
│   │   └── config_manager.py # Gestión de configuración
│   └── utils/            # Utilidades
│       └── file_utils.py # Utilidades para manejo de archivos
├── client/
│   └── devpipe.js        # Cliente JavaScript (existente)
├── frontend/             # Panel web en React
│   ├── src/
│   │   ├── components/   # Componentes React
│   │   ├── pages/       # Páginas principales
│   │   └── api/         # Cliente API
│   └── public/          # Recursos estáticos
├── scripts/
│   └── devpipe.sh       # Script para comandos CLI
└── config/
    └── default.json     # Configuración por defecto
```

## Componentes Principales

### 1. Servidor Flask

#### Endpoints API:
- `POST /log` - Recibir logs de devpipe.js
- `GET /logs` - Obtener logs recientes
- `POST /config` - Actualizar configuración
- `GET /config` - Obtener configuración actual
- `POST /files/select` - Seleccionar archivo externo
- `POST /files/combine` - Combinar logs
- `DELETE /logs` - Borrar logs

#### Estados del Servidor:
1. Servidor Activo (devpipe start)
2. Monitoreo Activo (iniciado desde panel)
3. Captura en Pausa (desde panel)

### 2. Panel Web (React)

#### Características:
- Selector de carpeta para logs
- Selector de archivo externo
- Panel de monitoreo en tiempo real
- Configuración de filtros
- Botones de control (play/pause/stop)
- Vista combinada de logs
- Botón de limpieza de logs

#### Vistas Principales:
1. Dashboard
   - Monitor en tiempo real (últimos 10 logs por defecto)
   - Estado del servidor y monitoreo
   - Métricas básicas

2. Configuración
   - Selección de carpetas/archivos
   - Filtros de URL
   - Tamaño máximo de archivos
   - Número de logs a mostrar

3. Herramientas
   - Combinación de logs
   - Limpieza de logs
   - Copiar al portapapeles

### 3. Comandos CLI

```bash
devpipe start    # Inicia el servidor
devpipe stop     # Detiene el servidor
devpipe clean    # Limpia los logs
devpipe status   # Muestra estado actual
```

## Plan de Implementación

### Fase 1: Servidor Base
1. Implementar servidor Flask básico
2. Integrar endpoint de logs existente
3. Implementar gestión de configuración
4. Implementar sistema de monitoreo de archivos

### Fase 2: Panel Web
1. Configurar proyecto React
2. Implementar UI básica
3. Integrar con API del servidor
4. Implementar monitoreo en tiempo real
5. Implementar selección de archivos

### Fase 3: Integración
1. Implementar comandos CLI
2. Integrar monitoreo combinado
3. Implementar funcionalidad de combinación
4. Pruebas de integración

### Fase 4: Refinamiento
1. Optimización de rendimiento
2. Mejoras de UX
3. Pruebas finales

## Consideraciones Técnicas

### Monitoreo de Archivos
- Uso de `watchdog` para monitorear cambios
- Buffer circular para logs recientes
- Límite configurable de líneas a mostrar

### Sincronización
- Polling cada segundo para actualizaciones en tiempo real
- Estado centralizado en el servidor
- API REST para todas las operaciones

### Persistencia
- Logs en archivos planos
- Configuración en JSON
- Respaldo de estado del servidor

### Seguridad
- Sin autenticación en esta fase
- Validación básica de entradas
- Protección contra desbordamiento de memoria
