# DevPipe - Tracking Tool

Una herramienta de monitoreo y tracking en tiempo real para aplicaciones web, construida con Flask y React.

## 🚀 Características

- **Servidor Flask** con API REST completa
- **Sistema de logs** con rotación automática
- **Monitoreo de archivos** en tiempo real
- **Panel web React** para visualización (próximamente)
- **CLI tools** para gestión del proyecto

## 📁 Estructura del Proyecto

```
tracking-tool/
├── server/                 # Backend Flask
│   ├── main.py            # Servidor principal
│   ├── core/              # Módulos core
│   │   ├── config_manager.py
│   │   ├── file_watcher.py
│   │   ├── log_manager.py
│   │   └── models.py
│   └── api/               # Endpoints API
├── client/                # Frontend React (próximamente)
├── config/                # Archivos de configuración
├── logs/                  # Archivos de log
├── scripts/               # Scripts de utilidad
└── docs/                  # Documentación
```

## 🛠️ Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd tracking-tool
```

2. **Crear entorno virtual**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
```

3. **Instalar dependencias**
```bash
pip install -r requirements.txt
```

4. **Ejecutar el servidor**
```bash
python server/main.py
```

## 🔧 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/config` | Obtener configuración actual |
| POST | `/config` | Actualizar configuración |
| POST | `/log` | Enviar nuevo log |
| GET | `/logs` | Obtener logs recientes |
| POST | `/logs/clear` | Limpiar todos los logs |
| POST | `/monitoring/start` | Iniciar monitoreo |
| POST | `/monitoring/stop` | Detener monitoreo |

## 🧪 Tests

Ejecutar tests de endpoints:
```bash
./test_endpoints.sh
```

## 📝 Configuración

El archivo `config/config.json` contiene la configuración del sistema:

```json
{
  "port": 7845,
  "logDir": "logs",
  "maxFileSize": 100,
  "maxLogs": 20,
  "monitoring": {
    "enabled": false,
    "intervalMs": 1000
  },
  "urlFilters": []
}
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit los cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📋 Roadmap

- [x] **Fase 1**: Servidor Flask base
  - [x] API REST completa
  - [x] Sistema de logs
  - [x] Monitoreo de archivos
  - [x] Tests de endpoints
- [ ] **Fase 2**: Panel web React
  - [ ] Interface de usuario
  - [ ] Visualización en tiempo real
  - [ ] Configuración via web
- [ ] **Fase 3**: CLI y deployment
  - [ ] Scripts de gestión
  - [ ] Docker support
  - [ ] Deployment tools

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👥 Autores

- **Equipo DevPipe** - *Desarrollo inicial*

## 🙏 Agradecimientos

- Flask por el framework web
- Watchdog por el monitoreo de archivos
- La comunidad open source por las herramientas utilizadas
