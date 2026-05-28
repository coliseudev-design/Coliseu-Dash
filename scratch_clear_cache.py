import sqlite3
import os

db_path = os.path.expandvars(r'%APPDATA%\ColiseuSales\Worker\sync_cache.sqlite')
print(f"DB: {db_path}")
print(f"Existe: {os.path.exists(db_path)}")
print(f"Tamanho: {os.path.getsize(db_path)} bytes")

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# Ver todas as entidades e contagens
cur.execute("SELECT Entity, COUNT(*) as qtd FROM SyncHashes GROUP BY Entity ORDER BY qtd DESC")
rows = cur.fetchall()
print("\n=== Entidades no cache ===")
for r in rows:
    print(f"  {r[0]}: {r[1]} hashes")

# Ver Dash_Vendas especificamente
cur.execute("SELECT COUNT(*), MIN(CAST(IdFirebird AS INTEGER)), MAX(CAST(IdFirebird AS INTEGER)) FROM SyncHashes WHERE Entity = 'Dash_Vendas'")
r = cur.fetchone()
print(f"\n=== Dash_Vendas ===")
print(f"  Registros no cache: {r[0]}")
print(f"  Min id_firebird: {r[1]}")
print(f"  Max id_firebird: {r[2]}")

# LIMPAR HASHES DE Dash_Vendas para forçar reenvio completo
print("\n=== Limpando Dash_Vendas do cache ===")
cur.execute("DELETE FROM SyncHashes WHERE Entity = 'Dash_Vendas'")
deleted = cur.rowcount
conn.commit()
print(f"  Deletados: {deleted} hashes")
print("  Próximo ciclo do worker vai reenviar TODOS os registros de Dash_Vendas")

# Confirmar
cur.execute("SELECT COUNT(*) FROM SyncHashes WHERE Entity = 'Dash_Vendas'")
print(f"  Restantes: {cur.fetchone()[0]}")

conn.close()
print("\nDone! O worker vai reenviar todos os registros no próximo ciclo (2 minutos).")
