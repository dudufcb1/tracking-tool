/**
 * DevPipe Client - Framework de Observabilidad para Desarrollo Local
 * 
 * Este script captura console.log, errores y otros eventos del navegador
 * y los envía a un servidor local para monitoreo centralizado.
 * 
 * Solo se activa en entornos de desarrollo.
 */

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        serverUrl: getServerUrl(),
        endpoint: '/log',
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 10,
        batchTimeout: 2000,
        enabledInProduction: false
    };

    // Verificar si debe activarse
    if (!shouldActivate()) {
        console.log('[DevPipe] No activado - entorno de producción detectado');
        return;
    }

    class DevPipeClient {
        constructor() {
            this.originalConsole = {};
            this.logQueue = [];
            this.batchTimer = null;
            this.isActive = true;
            
            this.init();
        }

        init() {
            console.log('[DevPipe] Inicializando cliente de observabilidad...');
            
            this.backupOriginalMethods();
            this.interceptConsole();
            this.interceptErrors();
            this.interceptUnhandledRejections();
            this.startBatchProcessor();
            
            console.log('[DevPipe] Cliente inicializado correctamente');
        }

        backupOriginalMethods() {
            // Guardar referencias a los métodos originales
            this.originalConsole = {
                log: console.log.bind(console),
                error: console.error.bind(console),
                warn: console.warn.bind(console),
                info: console.info.bind(console),
                debug: console.debug.bind(console)
            };
        }

        interceptConsole() {
            const self = this;
            
            // Interceptar console.log
            console.log = function(...args) {
                self.originalConsole.log.apply(console, args);
                self.captureLog('log', args);
            };

            // Interceptar console.error
            console.error = function(...args) {
                self.originalConsole.error.apply(console, args);
                self.captureLog('error', args);
            };

            // Interceptar console.warn
            console.warn = function(...args) {
                self.originalConsole.warn.apply(console, args);
                self.captureLog('warn', args);
            };

            // Interceptar console.info
            console.info = function(...args) {
                self.originalConsole.info.apply(console, args);
                self.captureLog('info', args);
            };

            // Interceptar console.debug
            console.debug = function(...args) {
                self.originalConsole.debug.apply(console, args);
                self.captureLog('debug', args);
            };
        }

        interceptErrors() {
            const self = this;
            
            // Interceptar errores globales
            window.addEventListener('error', function(event) {
                self.captureError({
                    message: event.message,
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                    error: event.error,
                    stack: event.error ? event.error.stack : null
                });
            });
        }

        interceptUnhandledRejections() {
            const self = this;
            
            // Interceptar promesas rechazadas no manejadas
            window.addEventListener('unhandledrejection', function(event) {
                self.captureError({
                    message: 'Unhandled Promise Rejection: ' + (event.reason || 'Unknown reason'),
                    stack: event.reason && event.reason.stack ? event.reason.stack : null,
                    type: 'unhandledrejection'
                });
            });
        }

        captureLog(level, args) {
            if (!this.isActive) return;

            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg, null, 2);
                    } catch (e) {
                        return '[Object]';
                    }
                }
                return String(arg);
            }).join(' ');

            const logEntry = {
                level: level,
                message: message,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                additional_data: {
                    args_count: args.length,
                    page_title: document.title
                }
            };

            this.queueLog(logEntry);
        }

        captureError(errorInfo) {
            if (!this.isActive) return;

            const logEntry = {
                level: 'error',
                message: errorInfo.message || 'Unknown error',
                url: window.location.href,
                timestamp: new Date().toISOString(),
                user_agent: navigator.userAgent,
                stack_trace: errorInfo.stack,
                additional_data: {
                    filename: errorInfo.filename,
                    lineno: errorInfo.lineno,
                    colno: errorInfo.colno,
                    type: errorInfo.type || 'javascript_error',
                    page_title: document.title
                }
            };

            this.queueLog(logEntry);
        }

        queueLog(logEntry) {
            this.logQueue.push(logEntry);
            
            // Si la cola está llena, enviar inmediatamente
            if (this.logQueue.length >= CONFIG.batchSize) {
                this.flushQueue();
            }
        }

        startBatchProcessor() {
            // Procesar cola cada cierto tiempo
            setInterval(() => {
                if (this.logQueue.length > 0) {
                    this.flushQueue();
                }
            }, CONFIG.batchTimeout);
        }

        flushQueue() {
            if (this.logQueue.length === 0) return;

            const logsToSend = [...this.logQueue];
            this.logQueue = [];

            // Enviar logs uno por uno (el servidor espera logs individuales)
            logsToSend.forEach(log => this.sendLog(log));
        }

        async sendLog(logEntry, retryCount = 0) {
            try {
                const response = await fetch(CONFIG.serverUrl + CONFIG.endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(logEntry)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                
                // Si el monitoreo está desactivado, pausar el cliente
                if (result.status === 'monitoring_disabled') {
                    this.originalConsole.warn('[DevPipe] Monitoreo desactivado en el servidor');
                    return;
                }

                // Si fue filtrado, no es un error
                if (result.status === 'filtered_out') {
                    return;
                }

            } catch (error) {
                // Reintentar si no se alcanzó el máximo de reintentos
                if (retryCount < CONFIG.maxRetries) {
                    setTimeout(() => {
                        this.sendLog(logEntry, retryCount + 1);
                    }, CONFIG.retryDelay * Math.pow(2, retryCount)); // Backoff exponencial
                } else {
                    // Solo mostrar error en consola si es el último intento
                    this.originalConsole.error('[DevPipe] Error enviando log después de', CONFIG.maxRetries, 'intentos:', error.message);
                }
            }
        }

        // Método para desactivar temporalmente
        pause() {
            this.isActive = false;
            this.originalConsole.log('[DevPipe] Cliente pausado');
        }

        // Método para reactivar
        resume() {
            this.isActive = true;
            this.originalConsole.log('[DevPipe] Cliente reanudado');
        }

        // Método para restaurar console original
        restore() {
            Object.keys(this.originalConsole).forEach(method => {
                console[method] = this.originalConsole[method];
            });
            this.originalConsole.log('[DevPipe] Console original restaurado');
        }
    }

    // Función para obtener URL del servidor
    function getServerUrl() {
        // Intentar detectar automáticamente el puerto del servidor DevPipe
        const hostname = window.location.hostname || 'localhost';

        // Si estamos en el mismo host que DevPipe, usar el puerto correcto
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://${hostname}:7845`;
        }

        // Por defecto, usar localhost:7845
        return 'http://localhost:7845';
    }

    // Función para determinar si debe activarse
    function shouldActivate() {
        // Verificar variables de entorno comunes
        if (typeof process !== 'undefined' && process.env) {
            if (process.env.NODE_ENV === 'production' && !CONFIG.enabledInProduction) {
                return false;
            }
            if (process.env.NODE_ENV === 'development') {
                return true;
            }
        }

        // Verificar parámetros de URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('debug') === 'true' || urlParams.get('devpipe') === 'true') {
            return true;
        }

        // Verificar si es localhost o desarrollo
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
            return true;
        }

        // Verificar puerto de desarrollo común
        const port = window.location.port;
        const devPorts = ['3000', '3001', '7845', '8000', '8080', '8888', '9000'];
        if (devPorts.includes(port)) {
            return true;
        }

        // Por defecto, no activar en producción
        return false;
    }

    // Inicializar cliente
    const devPipeClient = new DevPipeClient();

    // Exponer globalmente para debugging
    window.DevPipe = {
        client: devPipeClient,
        pause: () => devPipeClient.pause(),
        resume: () => devPipeClient.resume(),
        restore: () => devPipeClient.restore(),
        config: CONFIG
    };

    // Log de inicialización
    console.log('[DevPipe] Cliente cargado y listo para capturar logs');

})();
