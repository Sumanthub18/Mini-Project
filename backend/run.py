"""
Entrypoint to run the Day 3 Scam or Safe Flask backend server.
"""
import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
    print(f"[*] Starting Scam or Safe? Day 3 Backend on port {port} (Debug: {debug})...")
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)
