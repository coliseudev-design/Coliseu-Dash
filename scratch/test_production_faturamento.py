# -*- coding: utf-8 -*-
import paramiko
import json

HOST = '2.24.82.19'
USER = 'root'
PASSWORD = 'Col@13894645'
TENANT_ID = '816f97c4-66fb-4ef8-905d-e0551cbf2942' # TESTE PETCLUB

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASSWORD)
        print("Connected to VPS")

        # 1. Fetch sales summing with discount subtracted
        sales_query = (
            f"SELECT "
            f"  COUNT(v.id_firebird) AS total_pedidos, "
            f"  COALESCE(SUM(v.valor_total), 0) AS bruto, "
            f"  COALESCE(SUM(v.valor_desconto), 0) AS desconto, "
            f"  COALESCE(SUM(v.valor_total - COALESCE(v.valor_desconto, 0)), 0) AS liquido_com_desconto "
            f"FROM dash_vendas v "
            f"WHERE v.tenant_id = '{TENANT_ID}' "
            f"  AND COALESCE(v.data_vencimento, v.data_venda) >= '2026-06-01' "
            f"  AND COALESCE(v.data_vencimento, v.data_venda) <= '2026-06-10' "
            f"  AND UPPER(TRIM(v.status)) IN ('FATURADO', 'FINALIZADO', 'PROCESSADO')"
        )
        cmd = f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -t -A -F ',' -c \"{sales_query}\""
        stdin, stdout, stderr = client.exec_command(cmd)
        sales_res = stdout.read().decode('utf-8').strip()
        
        # 2. Fetch devolucoes
        dev_query = (
            f"SELECT COALESCE(SUM(d.valor), 0) AS total "
            f"FROM dash_devolucoes d "
            f"WHERE d.tenant_id = '{TENANT_ID}' "
            f"  AND d.data_devolucao >= '2026-06-01' "
            f"  AND d.data_devolucao <= '2026-06-10'"
        )
        cmd_dev = f"docker exec vasjsucz4yxcb7m4rtqindd2 psql -U coliseu_admin -d coliseu_dashboard -t -A -c \"{dev_query}\""
        stdin, stdout, stderr = client.exec_command(cmd_dev)
        dev_res = stdout.read().decode('utf-8').strip()

        print(f"Sales Query Result (count, bruto, desconto, liquido_com_desconto): {sales_res}")
        print(f"Devoluções Query Result: {dev_res}")

        if sales_res:
            parts = sales_res.split(',')
            count = int(parts[0])
            bruto = float(parts[1])
            desconto = float(parts[2])
            liquido = float(parts[3])
            devolucao = float(dev_res) if dev_res else 0.0
            
            faturamento_final = liquido - devolucao
            print("\n=== FINAL RESULTS ===")
            print(f"Total Orders: {count}")
            print(f"Gross (Bruto): R$ {bruto:,.2f}")
            print(f"Discounts (Descontos): R$ {desconto:,.2f}")
            print(f"Returns (Devoluções): R$ {devolucao:,.2f}")
            print(f"Net Faturamento (Liquido - Devolucoes): R$ {faturamento_final:,.2f}")

    except Exception as e:
        print("Error:", e)
    finally:
        client.close()

if __name__ == '__main__':
    main()
