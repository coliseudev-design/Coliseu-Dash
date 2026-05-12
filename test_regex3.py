import re
expected_ddl = """CREATE PROCEDURE MOB_CADASTRAR_PEDIDO_ITEM (
    ID_PEDIDO INTEGER,
    OBSERVACAO VARCHAR(50)
)
AS
declare variable ITEM integer;"""
name = 'MOB_CADASTRAR_PEDIDO_ITEM'
pattern = r'CREATE\s+(?:OR\s+ALTER\s+)?PROCEDURE\s+' + name + r'\s*(?:\([^)]*\))?\s*AS\s*'
m = re.search(pattern, expected_ddl, re.IGNORECASE | re.DOTALL)
if m:
    print('MATCHED HEADER!')
else:
    print('NO MATCH!')
