# Arquitectura y Lógica de Negocio para Migración DevPipe

## Objetivo General
Crear un sistema simple y robusto para monitoreo de logs en aplicaciones web, permitiendo la gestión y visualización centralizada desde un panel web.

## Componentes Principales

### 1. Cliente (devpipe.js)
- Script que se integra fácilmente en cualquier web.
- Captura automáticamente logs de consola y errores JS.
- Envía los logs al servidor mediante HTTP (fetch/ajax).

### 2. Servidor
- Recibe los logs enviados por el cliente.
- Guarda cada log en un archivo de texto plano (formato JSON por línea).
- Expone endpoints HTTP para:
  - Recibir logs.
  - Consultar logs recientes.
  - Limpiar logs.
  - Configurar filtros y ubicación del archivo.

### 3. Panel Web (Admin)
- Permite visualizar los logs en tiempo real o por consulta.
- Permite configurar:
  - Ubicación del archivo de logs.
  - Palabras clave/patrones para filtrar URLs (decidir qué logs aceptar).
  - Acciones administrativas (limpiar, descargar, etc).
- Muestra métricas básicas: cantidad de logs, tamaño del archivo, últimas URLs, etc.

## Flujos de Negocio

1. **Integración:** El usuario integra devpipe.js en su web.
2. **Captura:** El script intercepta logs y errores, los envía al servidor.
3. **Recepción:** El servidor recibe y almacena los logs en el archivo configurado.
4. **Visualización:** El panel web permite ver los logs, aplicar filtros y gestionar el archivo.
5. **Configuración:** El usuario puede cambiar la ubicación del archivo y los filtros de URL desde el panel.
6. **Administración:** El usuario puede limpiar logs, descargar el archivo, y ver métricas desde el panel.

## Requisitos Clave
- Facilidad de integración (1 línea de JS).
- Configuración flexible de filtros y archivo.
- Panel web intuitivo y rápido.
- Persistencia simple (archivo de texto).
- Seguridad básica (acceso restringido al panel).

## Consideraciones para la Migración
- Mantener la lógica de negocio, simplificando la arquitectura y eliminando dependencias innecesarias.
- Priorizar la estabilidad y facilidad de mantenimiento.
- Usar Flask para el backend por su simplicidad y robustez.
- Mantener la carpeta `client` y el script devpipe.js como base para la nueva versión.

---
Este documento servirá como guía para la migración y rediseño del sistema DevPipe.
