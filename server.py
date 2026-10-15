#!/usr/bin/env python3
"""Local-only static server. Python 3.8+, standard library, no pip required."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, socket, sys, threading, webbrowser

ROOT = Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js':'text/javascript', '.mjs':'text/javascript', '.glb':'model/gltf-binary', '.json':'application/json', '.svg':'image/svg+xml'}
    def __init__(self,*a,**kw):
        super().__init__(*a,directory=str(ROOT),**kw)
    def end_headers(self):
        self.send_header('Cache-Control','no-cache')
        super().end_headers()
    def log_message(self,fmt,*args):
        if len(args)>1 and str(args[1]).startswith(('4','5')): super().log_message(fmt,*args)

def main():
    parser=argparse.ArgumentParser(description='MediLink local server')
    parser.add_argument('--port',type=int,default=8080)
    parser.add_argument('--no-open',action='store_true')
    parser.add_argument('--check',action='store_true',help='Validate packaged launch files without starting a server')
    args=parser.parse_args()
    required=['index.html','style.css','src/app.js','vendor/three.module.js','vendor/three.core.js','assets/models/floor-1.glb','assets/models/floor-2.glb','assets/collision-1.json','assets/collision-2.json']
    missing=[p for p in required if not (ROOT/p).is_file()]
    if missing: print('Berkas belum lengkap:',', '.join(missing));return 1
    if args.check: print('OK. Semua berkas peluncuran tersedia. Python',sys.version.split()[0]);return 0
    if not 1024<=args.port<=65525: print('Gunakan port 1024 sampai 65525.');return 1
    server=None
    for port in range(args.port,args.port+10):
        try: server=ThreadingHTTPServer(('127.0.0.1',port),Handler);break
        except OSError as error:
            if error.errno not in (48,98,10048): raise
    if server is None: print('Sepuluh port sedang dipakai. Coba --port 9000.');return 1
    url='http://127.0.0.1:{}/'.format(server.server_port)
    print('\nMediLink Hospital Network Explorer\nBuka: '+url+'\nSemua aset tersedia lokal.\nTekan Ctrl+C untuk menutup server.\n',flush=True)
    if not args.no_open:
        timer=threading.Timer(.6,lambda:webbrowser.open(url));timer.daemon=True;timer.start()
    try: server.serve_forever()
    except KeyboardInterrupt: print('\nServer dihentikan.')
    finally: server.server_close()
    return 0
if __name__=='__main__': raise SystemExit(main())
