#!/usr/bin/env python3
"""Ponto de entrada do CPLife.

Exemplos:
    python run.py
    python run.py --demo
    python run.py --data-dir C:\\cplife-test-data
"""

import argparse
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
    parser = argparse.ArgumentParser(description="CPLife - acompanhamento local de programação competitiva")
    parser.add_argument("port", nargs="?", type=int, default=8080)
    parser.add_argument("--demo", action="store_true", help="inicia diretamente no modo demonstração")
    parser.add_argument("--data-dir", type=Path, help="usa um diretório de dados isolado")
    args = parser.parse_args()
    port = args.port
    
    # Abre o navegador automaticamente em background
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    # Inicia o servidor
    run_server(port=port, mode="demo" if args.demo else None, data_dir=args.data_dir)
