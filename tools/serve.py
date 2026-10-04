"""
Local preview server for the site, with browser caching turned off.

    python tools/serve.py          # http://127.0.0.1:8765
    python tools/serve.py 9000     # another port

Python's own `python -m http.server` sends no Cache-Control header, so browsers cache
pages heuristically and a reload can show the previous build. This sends no-store on
every response, so what you see is always what is on disk.
"""
import functools
import http.server
import os
import sys


class Server(http.server.ThreadingHTTPServer):
    # A browser opens several connections at once. With the default backlog of 5,
    # Windows refuses the overflow and an image can fail to load (ERR_CONNECTION_REFUSED).
    request_queue_size = 64


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the console quiet
        pass


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    handler = functools.partial(NoStore, directory=root)
    print(f"Serving {root} at http://127.0.0.1:{port}/ (no-store)")
    Server(("127.0.0.1", port), handler).serve_forever()


if __name__ == "__main__":
    main()
