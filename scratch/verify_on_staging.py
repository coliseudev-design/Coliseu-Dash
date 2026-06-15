import paramiko

HOST = '177.39.17.7'
USER = 'root'
PASS = '6EFBC!c0:wzr%Ij'

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS)
        print("OK: Conectado ao VPS de Staging")

        # Dynamic container discovery
        _, stdout, _ = client.exec_command("docker ps --format '{{.Names}}' | grep -E 'coliseu-mw|dashboard-middleware'")
        container_name = stdout.read().decode('utf-8').strip().split('\n')[0]
        if not container_name:
            print("Erro: Container do middleware não encontrado!")
            return
        print(f"OK: Container ativo: {container_name}")

        node_script = """
const db = require('./src/db/postgres');
const { getUserPermissions } = require('./src/utils/rbac');

async function check() {
  let testUserId = null;
  let createdGroupIds = [];
  try {
    // Obter um tenant_id válido do banco
    const tenantRes = await db.query('SELECT DISTINCT tenant_id FROM dash_usuarios WHERE tenant_id != $1 LIMIT 1', ['00000000-0000-0000-0000-000000000000']);
    if (tenantRes.rowCount === 0) {
      console.log('Nenhum tenant cliente encontrado.');
      return;
    }
    const tenantId = tenantRes.rows[0].tenant_id;
    
    // 1. Criar um usuário temporário com role = 'user'
    const userRes = await db.query(
      `INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, versao)
       VALUES ($1, 'temp_user_test@coliseu.com.br', 'Temp User Test', 'user', true, 'no-pass-hash', 'Dash 1.0')
       RETURNING id, tenant_id, role, versao`
      , [tenantId]
    );
    const testUser = userRes.rows[0];
    testUserId = testUser.id;
    console.log('Usuário de Teste Criado:', 'temp_user_test@coliseu.com.br', '(ID:', testUser.id, ', Perfil:', testUser.role, ', Tenant:', testUser.tenant_id, ')');

    // 2. Buscar todos os grupos deste tenant
    const { rows: groups } = await db.query('SELECT id, nome, versao FROM dash_grupos_acesso WHERE tenant_id = $1', [tenantId]);
    console.log('Grupos de Acesso no Tenant:', groups.map(g => ({ id: g.id, nome: g.nome, versao: g.versao })));

    if (groups.length === 0) {
      console.log('Criando grupos de teste...');
      // Criar grupos de teste para Dash 1.0 e B.I 1.0
      const g1 = await db.query(`INSERT INTO dash_grupos_acesso (tenant_id, versao, nome) VALUES ($1, 'Dash 1.0', 'Grupo Dash Teste') RETURNING id, nome, versao`, [tenantId]);
      const g2 = await db.query(`INSERT INTO dash_grupos_acesso (tenant_id, versao, nome) VALUES ($1, 'B.I 1.0', 'Grupo BI Teste') RETURNING id, nome, versao`, [tenantId]);
      groups.push(g1.rows[0], g2.rows[0]);
      createdGroupIds.push(g1.rows[0].id, g2.rows[0].id);
      
      // Inserir algumas permissões de teste para esses grupos
      await db.query(`INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar) VALUES ($1, 'inicio', true)`, [g1.rows[0].id]);
      await db.query(`INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar) VALUES ($1, 'vendas', true)`, [g1.rows[0].id]);
      await db.query(`INSERT INTO dash_permissoes (grupo_id, recurso, pode_acessar) VALUES ($1, 'financeiro', true)`, [g2.rows[0].id]);
    }

    // 3. Vincular o usuário temporário aos grupos
    const groupIdsToBind = groups.map(g => g.id);
    for (const gId of groupIdsToBind) {
      await db.query('INSERT INTO dash_usuario_grupo (usuario_id, grupo_id) VALUES ($1, $2)', [testUser.id, gId]);
    }
    console.log('Sucesso: Usuário vinculado aos grupos:', groupIdsToBind);

    // Debug 1: Confirmar se o usuário existe no DB usando a query de rbac
    const dbUserRes = await db.query(
      'SELECT id, role, versao, tenant_id FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
      [testUser.id, testUser.tenant_id]
    );
    console.log('Debug 1 - SELECT Usuário:', dbUserRes.rows[0]);

    // Debug 2: Confirmar se os registros estão na tabela dash_usuario_grupo
    const dbMappingRes = await db.query(
      'SELECT usuario_id, grupo_id FROM dash_usuario_grupo WHERE usuario_id = $1',
      [testUser.id]
    );
    console.log('Debug 2 - SELECT dash_usuario_grupo:', dbMappingRes.rows);

    // Debug 3: Confirmar se as permissões existem para os grupos mapeados
    const dbPermsRes = await db.query(
      'SELECT grupo_id, recurso, pode_acessar FROM dash_permissoes WHERE grupo_id = ANY($1)',
      [groupIdsToBind]
    );
    console.log('Debug 3 - SELECT dash_permissoes:', dbPermsRes.rows);

    // 4. Testar a resolução de permissões (RBAC) dinamicamente para cada versão
    for (const version of ['Dash 1.0', 'B.I 1.0', 'B.I IA.']) {
      // Simular troca de versão ativa na tabela de usuários
      await db.query('UPDATE dash_usuarios SET versao = $1 WHERE id = $2', [version, testUser.id]);
      
      // Resolver permissões
      const permissions = await getUserPermissions(testUser.id, testUser.tenant_id);
      
      // Buscar o grupo correspondente
      const targetGroup = groups.find(g => g.versao === version);
      const groupName = targetGroup ? targetGroup.nome : 'Nenhum grupo';
      
      console.log(`Permissões resolvidas para versão "${version}" (Grupo: "${groupName}"):`, permissions.length, 'recursos liberados:', permissions);
    }

  } catch(e) {
    console.error('Erro durante o teste:', e);
  } finally {
    // Limpar tudo
    console.log('Iniciando limpeza...');
    if (testUserId) {
      await db.query('DELETE FROM dash_usuario_grupo WHERE usuario_id = $1', [testUserId]);
      await db.query('DELETE FROM dash_usuarios WHERE id = $1', [testUserId]);
    }
    if (createdGroupIds.length > 0) {
      await db.query('DELETE FROM dash_grupos_acesso WHERE id = ANY($1)', [createdGroupIds]);
    }
    console.log('OK: Limpeza concluída.');
    process.exit(0);
  }
}
check();
"""

        # Executar script node
        cmd = f"docker exec -i {container_name} node"
        stdin, stdout, stderr = client.exec_command(cmd)
        stdin.write(node_script)
        stdin.close()

        print("\n=== RESULTADO DO TESTE ===")
        out = stdout.read().decode('utf-8')
        err = stderr.read().decode('utf-8')
        if out:
            print(out)
        if err:
            print("ERR:", err)

    except Exception as e:
        print(f"Erro: {e}")
    finally:
        client.close()

if __name__ == '__main__':
    main()
