import socket

def test_conn():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3.0)
    try:
        print("Connecting to 2.24.82.19:5432...")
        s.connect(('2.24.82.19', 5432))
        print("Connection SUCCESSFUL!")
    except Exception as e:
        print("Connection FAILED:", e)
    finally:
        s.close()

test_conn()
