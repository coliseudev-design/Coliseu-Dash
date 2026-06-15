'use strict';

const db = require('../db/postgres');

/**
 * Recupera a lista de permissões ativa para o usuário do tenant correspondente.
 * @param {number|string} userId
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
async function getUserPermissions(userId, tenantId) {
    const userRes = await db.query(
        'SELECT id, role, grupo_id, versao, permissions FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
    );

    if (userRes.rowCount === 0) return [];

    const user = userRes.rows[0];

    // Se for master, tem acesso irrestrito a todos os layouts e abas
    if (user.role === 'master') {
        return [
            'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes', 
            'ranking', 'estatisticas', 'inteligencia', 'produtos', 
            'clientes', 'vendas', 'usuarios', 'layout_1', 'layout_2', 'layout_3'
        ];
    }

    // Buscar permissões do grupo correspondente à versão ativa na tabela associativa
    const permRes = await db.query(
        `SELECT p.recurso 
         FROM dash_permissoes p
         JOIN dash_grupos_acesso g ON p.grupo_id = g.id
         JOIN dash_usuario_grupo ug ON ug.grupo_id = g.id
         WHERE ug.usuario_id = $1 AND g.versao = $2 AND p.pode_acessar = true`,
        [userId, user.versao]
    );

    if (permRes.rowCount > 0) {
        return permRes.rows.map(r => r.recurso);
    }

    // Fallback: se não achar na tabela associativa, mas tiver o grupo_id no usuário
    if (user.grupo_id) {
        const legacyPermRes = await db.query(
            'SELECT recurso FROM dash_permissoes WHERE grupo_id = $1 AND pode_acessar = true',
            [user.grupo_id]
        );
        return legacyPermRes.rows.map(r => r.recurso);
    }

    // Se for administrador do tenant e não tiver grupo associado, libera todos os acessos do layout dele por padrão
    if (user.role === 'admin') {
        return [
            'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes', 
            'ranking', 'estatisticas', 'inteligencia', 'produtos', 
            'clientes', 'vendas', 'usuarios', 'layout_1', 'layout_2', 'layout_3'
        ];
    }

    // Fallback: permissões estáticas do campo antigo
    if (user.permissions) {
        try {
            return typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions;
        } catch (e) {
            return [];
        }
    }

    return [];
}

module.exports = {
    getUserPermissions
};
