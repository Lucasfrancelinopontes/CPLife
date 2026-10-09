#!/usr/bin/env python3
"""
Ponto de entrada do Painel de Treinamento Adaptativo - ICPC 2027
Execução: python run.py
"""

import sys
import webbrowser
import threading
import time
from pathlib import Path

# Adiciona o diretório atual ao sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.server import run_server

def open_browser(port):
    time.sleep(0.8)
    try:
        webbrowser.open(f"http://localhost:{port}")
    except Exception:
        pass

if __name__ == "__main__":
    port = 8080
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        port = int(sys.argv[1])
    
    # Abre o navegador automaticamente em background
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    # Inicia o servidor
    run_server(port=port)
