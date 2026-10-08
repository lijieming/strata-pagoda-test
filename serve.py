#!/usr/bin/env python3
"""Tiny no-cache static server for local development.

Usage:  python3 serve.py [port]     (default port 8123)
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the terminal quiet


class Server(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    with Server(("", PORT), NoCacheHandler) as httpd:
        print("serving on http://localhost:%d" % PORT)
        httpd.serve_forever()
