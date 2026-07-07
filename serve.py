#!/usr/bin/env python3
"""
Local dev server for the portfolio site.

Run:  python serve.py
Then open http://localhost:8000

Serves the site like a normal static server, plus one extra endpoint:
  POST /api/projects  — receives the full projects array as JSON and
                        writes it to projects/projects.json on disk.

This is what lets the on-site Add/Edit Project form save directly to
your local files. It only exists when you run this script; the deployed
GitHub Pages site is static and never exposes this endpoint.
"""
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECTS_PATH = os.path.join(ROOT, 'projects', 'projects.json')
PORT = 8000


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != '/api/projects':
            self._send_json(404, {'ok': False, 'error': 'Not found'})
            return
        try:
            length = int(self.headers.get('Content-Length', 0))
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, list):
                raise ValueError('Expected a JSON array of projects')
        except Exception as e:
            self._send_json(400, {'ok': False, 'error': str(e)})
            return
        with open(PROJECTS_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f'  ✔ Saved {len(data)} projects to projects/projects.json')
        self._send_json(200, {'ok': True, 'count': len(data)})


if __name__ == '__main__':
    print(f'Serving on http://localhost:{PORT}  (Ctrl+C to stop)')
    print('Add/Edit Project form will save directly to projects/projects.json')
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
