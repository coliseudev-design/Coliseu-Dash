#!/usr/bin/env python3
"""
apply_migration.py — Aplicador de Migrações Controlado
Coliseu Dashboard — Migração 001: Filtro por Filial/Departamento

Uso:
  python apply_migration.py --local      # Aplica no Postgres LOCAL (porta 5433)
  python apply_migration.py --vps        # Aplica na VPS via SSH (requer confirmação)

SEGURANÇA: --vps nunca vai rodar sem confirmação interativa.
"""

import argparse
import os
import sys

def apply_local():
    """Aplica a migração no banco PostgreSQL LOCAL (docker-compose.local.yml)"""
    import psycopg2
    
    CONN = {
        "host": "localhost",
        "port": 5433,
        "database": "coliseu_dashboard_local",
        "user": "coliseu_admin",
        "password": "coliseu_local_test_2026"
    }

    migration_file = os.path.join(
        os.path.dirname(__file__), 
        "middleware", "src", "db", "migrations", "001_add_depto_filial.sql"
    )

    print("🔧 Conectando ao PostgreSQL LOCAL (porta 5433)...")
    try:
        conn = psycopg2.connect(**CONN)
        conn.autocommit = True
        cur = conn.cursor()

        print(f"📄 Lendo migração: {migration_file}")
        with open(migration_file, "r", encoding="utf-8") as f:
            sql = f.read()

        print("⚙️  Aplicando migração 001_add_depto_filial.sql...")
        cur.execute(sql)

        # Verificação
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='dash_vendas' AND column_name='depto_id'")
        if cur.fetchone():
            print("✅ dash_vendas.depto_id: OK")
        else:
            print("❌ dash_vendas.depto_id: FALHOU")

        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='dash_financeiro' AND column_name='depto_id'")
        if cur.fetchone():
            print("✅ dash_financeiro.depto_id: OK")
        else:
            print("❌ dash_financeiro.depto_id: FALHOU")

        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name='dash_filiais'")
        if cur.fetchone():
            print("✅ dash_filiais: OK")
        else:
            print("❌ dash_filiais: FALHOU")

        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='dash_usuarios' AND column_name='filial_acesso'")
        if cur.fetchone():
            print("✅ dash_usuarios.filial_acesso: OK")
        else:
            print("❌ dash_usuarios.filial_acesso: FALHOU")

        cur.execute("SELECT matviewname FROM pg_matviews WHERE matviewname IN ('mv_dash_vendas_diario', 'mv_dash_financeiro_diario')")
        views = [r[0] for r in cur.fetchall()]
        print(f"✅ Materialized Views recriadas: {views}")

        cur.close()
        conn.close()
        print("\n🎉 Migração LOCAL aplicada com sucesso!")
        print("📝 Próximo passo: testar o middleware localmente e validar as queries de filial.")

    except Exception as e:
        print(f"\n❌ ERRO ao aplicar migração LOCAL: {e}")
        print("Verifique se o docker-compose.local.yml está rodando: docker-compose -f docker-compose.local.yml up -d")
        sys.exit(1)


def apply_vps():
    """Aplica a migração na VPS via SSH (requer confirmação dupla)"""
    import paramiko

    print("=" * 60)
    print("⚠️  ATENÇÃO: VOCÊ ESTÁ PRESTES A MODIFICAR O BANCO DA VPS!")
    print("=" * 60)
    print("Esta ação vai alterar o banco de dados de PRODUÇÃO.")
    print("Certifique-se de que:")
    print("  1. A migração foi testada LOCALMENTE com sucesso")
    print("  2. Você tem backup recente do banco")
    print("  3. O Coolify não está em processo de deploy")
    print()
    
    confirm1 = input("Digite 'CONFIRMAR' para continuar: ")
    if confirm1 != "CONFIRMAR":
        print("Operação cancelada.")
        sys.exit(0)
    
    confirm2 = input("Última chance — Digite 'VPS' para aplicar na produção: ")
    if confirm2 != "VPS":
        print("Operação cancelada.")
        sys.exit(0)

    VPS_HOST = "177.39.17.7"
    VPS_USER = "root"
    VPS_PASS = "6EFBC!c0:wzr%Ij"

    migration_file = os.path.join(
        os.path.dirname(__file__),
        "middleware", "src", "db", "migrations", "001_add_depto_filial.sql"
    )

    with open(migration_file, "r", encoding="utf-8") as f:
        sql_content = f.read()

    print("\n🔌 Conectando à VPS via SSH...")
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS)

        # Descobrir container do Postgres
        _, stdout, _ = client.exec_command(
            "docker ps --format '{{.Names}}' | grep -i 'coliseu.*db\\|postgres'"
        )
        pg_container = stdout.read().decode().strip().split('\n')[0]
        
        if not pg_container:
            print("❌ Container Postgres não encontrado! Verifique o nome do container.")
            client.close()
            sys.exit(1)

        print(f"📦 Container Postgres identificado: {pg_container}")

        # Copiar arquivo de migração para a VPS
        sftp = client.open_sftp()
        sftp.put(migration_file, "/tmp/001_add_depto_filial.sql")
        sftp.close()
        print("📄 Arquivo de migração enviado para /tmp/")

        # Aplicar migração dentro do container
        cmd = f"docker exec -i {pg_container} psql -U coliseu_admin -d coliseu_dashboard -f /tmp/001_add_depto_filial.sql"
        _, stdout, stderr = client.exec_command(cmd)
        output = stdout.read().decode()
        error = stderr.read().decode()

        print("\n--- Output da migração ---")
        print(output)
        if error:
            print("--- Warnings/Errors ---")
            print(error)

        # Verificação final
        check_cmd = f"docker exec {pg_container} psql -U coliseu_admin -d coliseu_dashboard -c \"SELECT column_name FROM information_schema.columns WHERE table_name='dash_vendas' AND column_name='depto_id'\""
        _, stdout, _ = client.exec_command(check_cmd)
        check_out = stdout.read().decode()
        
        if "depto_id" in check_out:
            print("\n✅ Verificação VPS: dash_vendas.depto_id existe — MIGRAÇÃO OK!")
        else:
            print("\n❌ Verificação VPS: depto_id NÃO encontrado — VERIFIQUE OS ERROS ACIMA!")

        client.close()

    except Exception as e:
        print(f"\n❌ ERRO ao aplicar migração VPS: {e}")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aplicador de Migração: Filtro por Filial")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--local", action="store_true", help="Aplica no banco LOCAL (seguro)")
    group.add_argument("--vps", action="store_true", help="Aplica na VPS (requer confirmação)")
    args = parser.parse_args()

    if args.local:
        apply_local()
    elif args.vps:
        apply_vps()
