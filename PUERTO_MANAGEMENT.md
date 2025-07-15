# 🔌 Manejo de Puertos en DevPipe

Este documento describe el sistema de manejo automático de puertos implementado en DevPipe para garantizar que el servidor siempre pueda iniciarse en el puerto 7845.

## 🎯 Objetivo

El sistema está diseñado para que el cliente DevPipe siempre use el puerto 7845, liberando automáticamente cualquier proceso que lo esté ocupando cuando sea necesario.

## 🔧 Funcionalidades Implementadas

### 1. Servidor Python - Liberación Automática de Puerto

El servidor Python (`server/main.py`) ahora incluye:

#### Funciones Principales:

- **`kill_process_on_port(port)`**: Termina procesos que usan un puerto específico
- **`is_port_available(port)`**: Verifica si un puerto está disponible
- **`ensure_port_available(port)`**: Asegura que un puerto esté libre

#### Comportamiento:

1. **Al iniciar el servidor**: Verifica si el puerto 7845 está disponible
2. **Si está ocupado**: Busca y termina los procesos que lo usan
3. **Métodos de terminación**:
   - Primero intenta `SIGTERM` (terminación elegante)
   - Si falla, usa `SIGKILL` (terminación forzada)
4. **Compatibilidad**: Usa `lsof` como método principal y `netstat` como respaldo

#### Ejemplo de Salida:

```bash
🚀 Iniciando DevPipe Server en puerto 7845...
⚠️  Puerto 7845 está ocupado, intentando liberar...
🔍 Encontrados procesos usando el puerto 7845: 12345
🔪 Terminando proceso 12345...
✅ Proceso 12345 terminado
✅ Puerto 7845 liberado exitosamente
✅ Servidor DevPipe iniciado en http://localhost:7845
```

### 2. Cliente JavaScript - Override de Puerto

El cliente JavaScript (`client/devpipe.js`) ahora incluye:

#### Funciones Disponibles:

- **`DevPipe.setPort(puerto)`**: Configura un puerto personalizado
- **`DevPipe.clearPort()`**: Elimina el puerto personalizado
- **`DevPipe.getCurrentPort()`**: Obtiene el puerto actual
- **`DevPipe.getServerUrl()`**: Obtiene la URL completa del servidor

#### Uso en Consola del Navegador:

```javascript
// Configurar puerto personalizado
DevPipe.setPort(8080);

// Verificar puerto actual
DevPipe.getCurrentPort(); // Retorna: 8080

// Verificar URL del servidor
DevPipe.getServerUrl(); // Retorna: "http://localhost:8080"

// Limpiar puerto personalizado
DevPipe.clearPort();

// Verificar que volvió al puerto por defecto
DevPipe.getCurrentPort(); // Retorna: 7845
```

#### Almacenamiento:

- El puerto personalizado se guarda en `localStorage` como `'devpipe_port'`
- Persiste entre sesiones del navegador
- Se aplica automáticamente al cargar la página

## 🧪 Pruebas

### Script de Prueba Automática

Ejecuta el script de prueba para verificar el funcionamiento:

```bash
python test_port_management.py
```

Este script:
1. Ocupa el puerto 7845 con un proceso dummy
2. Inicia el servidor DevPipe
3. Verifica que el puerto se libere automáticamente
4. Confirma que el servidor funcione correctamente

### Prueba Manual del Frontend

1. Abre una página con `devpipe.js` cargado
2. Abre la consola del navegador
3. Ejecuta los comandos de ejemplo mostrados arriba

## 🔄 Flujo de Trabajo

### Escenario Normal:
1. Usuario ejecuta `python server/main.py`
2. Puerto 7845 está libre
3. Servidor se inicia normalmente

### Escenario con Puerto Ocupado:
1. Usuario ejecuta `python server/main.py`
2. Puerto 7845 está ocupado por otro proceso
3. Sistema detecta el conflicto
4. Termina automáticamente el proceso conflictivo
5. Servidor se inicia en el puerto liberado

### Escenario con Puerto Personalizado (Frontend):
1. Usuario configura puerto personalizado: `DevPipe.setPort(8080)`
2. Cliente envía logs a `http://localhost:8080`
3. Configuración persiste en localStorage

## ⚙️ Configuración

### Puerto por Defecto

El puerto por defecto (7845) está configurado en:
- `config/config.json`: `"port": 7845`
- `server/core/config_manager.py`: Puerto por defecto en configuración
- `client/devpipe.js`: Puerto hardcodeado como respaldo

### Variables de Entorno

Puedes sobrescribir el puerto usando la variable de entorno `PORT`:

```bash
PORT=8080 python server/main.py
```

## 🛠️ Solución de Problemas

### Error: "No se pudo liberar el puerto"

**Posibles causas:**
- Proceso con permisos elevados ocupando el puerto
- Comando `lsof` no disponible en el sistema

**Soluciones:**
1. Ejecutar con `sudo` (no recomendado)
2. Cambiar el puerto en la configuración
3. Terminar manualmente el proceso conflictivo

### Error: "Comando 'lsof' no encontrado"

**Solución:**
```bash
# Ubuntu/Debian
sudo apt-get install lsof

# CentOS/RHEL
sudo yum install lsof

# macOS
brew install lsof
```

### Puerto Personalizado No Funciona

**Verificaciones:**
1. Confirmar que el puerto está guardado: `localStorage.getItem('devpipe_port')`
2. Verificar que el servidor esté corriendo en ese puerto
3. Limpiar localStorage y reintentar

## 📋 Comandos Útiles

```bash
# Verificar qué proceso usa el puerto 7845
lsof -i :7845

# Terminar proceso específico
kill -TERM <PID>

# Verificar puertos en uso
netstat -tlnp | grep 7845

# Probar conectividad
curl http://localhost:7845/config
```

## 🔮 Próximas Mejoras

1. **Interfaz gráfica** para configurar puerto en el frontend
2. **Detección automática** de puertos alternativos disponibles
3. **Logs más detallados** del proceso de liberación de puertos
4. **Configuración por proyecto** para puertos personalizados

---

## 📝 Notas Técnicas

- El sistema usa `SIGTERM` seguido de `SIGKILL` para máxima compatibilidad
- El cliente JavaScript verifica localStorage en cada carga de página
- La configuración del puerto se mantiene separada entre servidor y cliente para flexibilidad futura
- El sistema es compatible con Linux, macOS y Windows (con limitaciones en Windows para `lsof`)
