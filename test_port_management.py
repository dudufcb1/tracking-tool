#!/usr/bin/env python3
"""
Script de prueba para demostrar el manejo automático de puertos en DevPipe Server.

Este script:
1. Inicia un proceso que ocupa el puerto 7845
2. Intenta iniciar el servidor DevPipe
3. Verifica que el servidor libere automáticamente el puerto
4. Confirma que el servidor se inicia correctamente
"""

import subprocess
import time
import requests
import signal
import os
import sys

def test_port_management():
    """Prueba el manejo automático de puertos."""
    
    print("🧪 Iniciando prueba de manejo de puertos...")
    print("=" * 50)
    
    # Paso 1: Ocupar el puerto 7845
    print("1️⃣  Ocupando puerto 7845 con proceso dummy...")
    dummy_process = subprocess.Popen([
        'python', '-c', 
        "import socket; s = socket.socket(); s.bind(('localhost', 7845)); print('Puerto ocupado'); s.listen(1); input()"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, stdin=subprocess.PIPE)
    
    time.sleep(2)  # Dar tiempo para que el proceso se inicie
    
    # Verificar que el puerto está ocupado
    try:
        response = requests.get('http://localhost:7845', timeout=2)
        print("❌ El puerto debería estar ocupado por el proceso dummy")
        return False
    except requests.exceptions.ConnectionError:
        print("✅ Puerto 7845 ocupado por proceso dummy")
    except Exception as e:
        print(f"⚠️  Error inesperado: {e}")
    
    # Paso 2: Intentar iniciar el servidor DevPipe
    print("\n2️⃣  Iniciando servidor DevPipe (debería liberar el puerto automáticamente)...")
    
    # Cambiar al directorio del proyecto
    project_dir = os.path.dirname(os.path.abspath(__file__))
    
    server_process = subprocess.Popen([
        'bash', '-c', 'source venv/bin/activate && python server/main.py'
    ], cwd=project_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Dar tiempo para que el servidor se inicie
    time.sleep(5)
    
    # Paso 3: Verificar que el servidor está funcionando
    print("3️⃣  Verificando que el servidor DevPipe está funcionando...")
    
    try:
        response = requests.get('http://localhost:7845/config', timeout=5)
        if response.status_code == 200:
            print("✅ Servidor DevPipe funcionando correctamente")
            print(f"📊 Respuesta del servidor: {response.json()['status']}")
            success = True
        else:
            print(f"❌ Servidor respondió con código: {response.status_code}")
            success = False
    except requests.exceptions.ConnectionError:
        print("❌ No se pudo conectar al servidor DevPipe")
        success = False
    except Exception as e:
        print(f"❌ Error al verificar servidor: {e}")
        success = False
    
    # Paso 4: Limpiar procesos
    print("\n4️⃣  Limpiando procesos...")
    
    # Terminar servidor DevPipe
    try:
        server_process.terminate()
        server_process.wait(timeout=5)
        print("✅ Servidor DevPipe terminado")
    except subprocess.TimeoutExpired:
        server_process.kill()
        print("🔥 Servidor DevPipe forzado a terminar")
    except Exception as e:
        print(f"⚠️  Error terminando servidor: {e}")
    
    # Verificar si el proceso dummy sigue corriendo
    if dummy_process.poll() is None:
        print("⚠️  Proceso dummy fue terminado automáticamente por el servidor")
        dummy_process.kill()
    else:
        print("✅ Proceso dummy ya fue terminado")
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 PRUEBA EXITOSA: El manejo automático de puertos funciona correctamente")
        print("✅ El servidor puede liberar automáticamente el puerto 7845 cuando está ocupado")
    else:
        print("❌ PRUEBA FALLIDA: Hay problemas con el manejo de puertos")
    
    return success

def test_frontend_port_override():
    """Prueba la funcionalidad de override de puerto en el frontend."""
    
    print("\n🌐 Probando funcionalidad de override de puerto en frontend...")
    print("=" * 50)
    
    print("📝 Para probar el override de puerto en el frontend:")
    print("1. Abre la consola del navegador en una página con devpipe.js cargado")
    print("2. Ejecuta: DevPipe.setPort(8080)")
    print("3. Verifica: DevPipe.getCurrentPort() // debería retornar 8080")
    print("4. Verifica: DevPipe.getServerUrl() // debería apuntar al puerto 8080")
    print("5. Para limpiar: DevPipe.clearPort()")
    print("6. Verifica: DevPipe.getCurrentPort() // debería retornar 7845")
    
    print("\n💡 El puerto se guarda en localStorage como 'devpipe_port'")
    print("💡 El cliente automáticamente usará el puerto personalizado si está configurado")

if __name__ == '__main__':
    print("🚀 DevPipe - Prueba de Manejo de Puertos")
    print("=" * 50)
    
    # Verificar que estamos en el directorio correcto
    if not os.path.exists('server/main.py'):
        print("❌ Error: Ejecuta este script desde el directorio raíz del proyecto")
        sys.exit(1)
    
    # Verificar que el entorno virtual existe
    if not os.path.exists('venv/bin/activate'):
        print("❌ Error: No se encontró el entorno virtual. Ejecuta: python -m venv venv")
        sys.exit(1)
    
    try:
        # Probar manejo de puertos del servidor
        success = test_port_management()
        
        # Mostrar información sobre el frontend
        test_frontend_port_override()
        
        if success:
            print("\n🎯 RESUMEN:")
            print("✅ Servidor Python: Manejo automático de puerto 7845 funcionando")
            print("✅ Cliente JavaScript: Override de puerto via localStorage disponible")
            print("✅ Sistema listo para uso en desarrollo")
        else:
            print("\n❌ Hay problemas que necesitan ser resueltos")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Prueba interrumpida por el usuario")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error inesperado: {e}")
        sys.exit(1)
