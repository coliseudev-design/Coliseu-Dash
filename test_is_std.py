import re

db_source = """declare variable ITEM integer;
begin
    select coalesce(max(id_item),0)+1 from PEDIDO_ITENS where id_pedido = :ID_PEDIDO into :ITEM;
"""

expected_ddl = """CREATE PROCEDURE MOB_CADASTRAR_PEDIDO_ITEM (
    ID_PEDIDO INTEGER
)
AS
declare variable ITEM integer;
begin
    select coalesce(max(id_item),0)+1 from PEDIDO_ITENS where id_pedido = :ID_PEDIDO into :ITEM;
"""

def normalize(s):
    return re.sub(r'\s+', '', s).upper()

idx_r_n = expected_ddl.find('AS\r\n')
idx_n = expected_ddl.find('AS\n')
idx = idx_r_n if idx_r_n != -1 else idx_n

if idx != -1:
    expected_body = expected_ddl[idx + 3:] if idx_r_n != -1 else expected_ddl[idx + 3:]
else:
    expected_body = expected_ddl

print('EXPECTED:', normalize(expected_body))
print('DB:', normalize(db_source))
