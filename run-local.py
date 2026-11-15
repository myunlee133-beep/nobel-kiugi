"""표준 라이브러리로 실행하는 로컬 미리보기. 종료는 Ctrl+C."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
import threading
import webbrowser

parser = argparse.ArgumentParser()
parser.add_argument('--no-browser', action='store_true')
parser.add_argument('--port', type=int, default=8766)
args = parser.parse_args()
root = Path(__file__).resolve().parent
server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root)))
url = f'http://127.0.0.1:{server.server_port}/nobel.html'
print(f'노벨상 키우기 로컬 수정판: {url}\n종료하려면 Ctrl+C를 누르세요.', flush=True)
if not args.no_browser:
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
