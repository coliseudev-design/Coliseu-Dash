import re
expected_ddl = """CREATE PROCEDURE MOB_CADASTRAR_PEDIDO (
    CLIENTE integer,
    DATA timestamp,
    HORA timestamp,
    OBSERVACAO varchar(50),
    PRAZO_PEDIDO varchar(20),
    TIPO_OPERACAO varchar(20),
    PAGAMENTO integer,
    VALOR_DESCONTO numeric(15,2),
    TOTAL_PEDIDO numeric(15,2),
    CONDICAO_PAGAMENTO integer,
    DEPTO integer,
    EMPRESA integer)
AS
declare variable CD_NP integer;"""
name = 'MOB_CADASTRAR_PEDIDO'
pattern = r'CREATE\s+(?:OR\s+ALTER\s+)?PROCEDURE\s+' + name + r'\s*(?:\([^)]*\))?\s*AS\s*'
m = re.search(pattern, expected_ddl, re.IGNORECASE | re.DOTALL)
if m:
    print('MATCHED HEADER!')
else:
    print('NO MATCH!')
