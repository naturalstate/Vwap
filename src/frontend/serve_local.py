#!/usr/bin/env python3
"""
Simple HTTP server to serve the React build folder on local network
Usage: python serve_local.py
"""

import http.server
import socketserver
import socket
import os

# Configuration
PORT = 8000
BUILD_DIR = "build"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def get_local_ip():
    """Get the local IP address"""
    try:
        # Connect to a dummy address to get local IP
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except Exception:
        return "localhost"

def main():
    # Change to build directory
    if os.path.exists(BUILD_DIR):
        os.chdir(BUILD_DIR)
        print(f"Serving from: {os.getcwd()}")
    else:
        print(f"Error: {BUILD_DIR} directory not found!")
        print("Make sure you run 'npm run build' first")
        return

    # Get local IP
    local_ip = get_local_ip()
    
    # Create and start server
    with socketserver.TCPServer(("0.0.0.0", PORT), MyHTTPRequestHandler) as httpd:
        print(f"\n🚀 Server started successfully!")
        print(f"📱 Local access: http://localhost:{PORT}")
        print(f"🌐 Network access: http://{local_ip}:{PORT}")
        print(f"\n💡 Share this URL with your wife: http://{local_ip}:{PORT}")
        print(f"\n🛑 Press Ctrl+C to stop the server")
        print("-" * 50)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n👋 Server stopped.")

if __name__ == "__main__":
    main()
