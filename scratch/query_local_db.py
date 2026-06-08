import psycopg2
import sys

try:
    conn = psycopg2.connect(
        host="localhost",
        port=5433,
        database="coliseu_dashboard_local",
        user="coliseu_admin",
        password="coliseu_local_test_2026"
    )
    cursor = conn.cursor()
    
    # Query the database
    cursor.execute("""
        SELECT id_firebird, numero_pedido, data_venda, data_vencimento, valor_total, status, cfop 
        FROM dash_vendas 
        WHERE numero_pedido = '228914' OR valor_total = 259.90;
    """)
    rows = cursor.fetchall()
    print("=== LOCAL DATABASE RESULTS (5433) ===")
    for row in rows:
        print(row)
    
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error connecting to local DB on 5433: {e}")
