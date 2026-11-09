'use strict';

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/postgres');
const config = require('../config/env');
const logger = require('../config/logger');
const { getUserPermissions } = require('../utils/rbac');
const { requireWebJwt } = require('../middleware/auth');
const { Pool } = require('pg');

const ALL_SUPERADMIN_PERMISSIONS = [
    'inicio', 'financeiro', 'fluxo-caixa', 'estoque', 'comissoes',
    'ranking', 'estatisticas', 'inteligencia', 'produtos',
    'clientes', 'vendas', 'usuarios', 'layout_1', 'layout_2', 'layout_3',
    'bi_seller_hub', 'bi_sales', 'bi_supplier', 'bi_abc', 'bi_finance',
    'bi_customer', 'bi_comparative', 'bi_customer_analytics', 'bi_goals',
    'bi_heatmap', 'bi_ai_insights', 'bi_hub', 'bi_compras', 'bi_compras_ia',
    'bi_fiscal', 'config_parametros',
    'cadastro_metas', 'reset_senha', 'usuarios_criar', 'usuarios_status',
    'usuarios_versao', 'usuarios_filiais', 'usuarios_grupos'
];

let sharedIdentityPool = null;
function getIdentityPool() {
    if (!sharedIdentityPool) {
        sharedIdentityPool = new Pool({
            host: config.postgres.host,
            port: config.postgres.port,
            database: 'coliseu_identity',
            user: config.postgres.user,
            password: config.postgres.password,
            ssl: config.postgres.ssl ? { rejectUnauthorized: false } : false,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            application_name: 'coliseu-dash-identity-reader',
        });
        sharedIdentityPool.on('error', (err) => {
            logger.warn('[Auth] Aviso em cliente ocioso do pool coliseu_identity', { error: err.message });
        });
    }
    return sharedIdentityPool;
}

function normalizeLayoutVersion(v) {
    if (!v) return 'Dash 1.0';
    if (v === 'B.I 1.0' || v === 'BI IA' || v === 'B.I IA') return 'B.I IA.';
    return v;
}

/**
 * Login interno do Dashboard.
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios', code: 'MISSING_CREDENTIALS' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const rawPassword = String(password);

        // Super Admin Master (aceita admin@coliseu.com ou admin@coliseu.com.br com credencial master)
        const isSuperAdminEmail = normalizedEmail === 'admin@coliseu.com' ||
            (normalizedEmail === 'admin@coliseu.com.br' && (rawPassword === '98683818' || rawPassword.trim() === '98683818'));

        if (isSuperAdminEmail) {
            if (rawPassword !== '98683818' && rawPassword.trim() !== '98683818') {
                logger.warn('[Auth] Falha de login Super Admin: senha incorreta', { email: normalizedEmail, ip: req.ip });
                return res.status(401).json({ error: 'Senha incorreta', code: 'INVALID_LOGIN' });
            }

            const { selectedTenantId } = req.body;
            const superVersion = ['Dash 1.0', 'B.I IA.'].includes(req.body.versao) ? req.body.versao : 'Dash 1.0';
            const identityPool = getIdentityPool();

            if (!selectedTenantId) {
                try {
                    const result = await identityPool.query(
                        `SELECT "Id" AS id, "Name" AS name FROM companies WHERE "Status" = 0 ORDER BY "Name" ASC`
                    );
                    return res.status(200).json({
                        requiresSelection: true,
                        requiresCompanySelection: true,
                        companies: result.rows
                    });
                } catch (dbErr) {
                    logger.warn('[Auth] Fallback local ativado para listagem de empresas Super Admin', { error: dbErr.message });
                    try {
                        const fallbackRes = await db.query(`
                            SELECT
                                t.tenant_id AS id,
                                COALESCE(
                                    (SELECT f.nome FROM dash_filiais f WHERE f.tenant_id = t.tenant_id ORDER BY f.is_default DESC NULLS LAST, f.id ASC LIMIT 1),
                                    (SELECT u.nome FROM dash_usuarios u WHERE u.tenant_id = t.tenant_id ORDER BY u.id ASC LIMIT 1),
                                    t.tenant_id::text
                                ) AS name
                            FROM (
                                SELECT DISTINCT tenant_id FROM dash_usuarios WHERE tenant_id != '00000000-0000-0000-0000-000000000000'
                                UNION
                                SELECT DISTINCT tenant_id FROM dash_sync_metadata WHERE tenant_id != '00000000-0000-0000-0000-000000000000'
                            ) t
                            ORDER BY name ASC
                        `);
                        return res.status(200).json({
                            requiresSelection: true,
                            requiresCompanySelection: true,
                            companies: fallbackRes.rows
                        });
                    } catch (fbErr) {
                        logger.error('[Auth] Erro ao buscar empresas no fallback local', { error: fbErr.message });
                        return res.status(500).json({ error: 'Erro ao carregar lista de empresas', code: 'IDENTITY_DB_ERROR' });
                    }
                }
            } else {
                let companyName = 'Empresa Selecionada';
                try {
                    const result = await identityPool.query(
                        `SELECT "Name" FROM companies WHERE "Id" = $1`,
                        [selectedTenantId]
                    );
                    if (result.rowCount > 0) {
                        companyName = result.rows[0].Name;
                    }
                } catch (dbErr) {
                    logger.error('[Auth] Erro ao obter nome da empresa selecionada', { error: dbErr.message });
                }

                const token = jwt.sign(
                    {
                        sub: '00000000-0000-0000-0000-000000000000',
                        email: normalizedEmail,
                        tenant: selectedTenantId,
                        tenantId: selectedTenantId,
                        module: config.security.expectedModuleSlug,
                        companyName: companyName,
                        role: 'master',
                        layoutVersion: superVersion
                    },
                    config.security.jwtDeviceKey,
                    { expiresIn: '12h' }
                );

                logger.info('[Auth] Login Super Admin bem-sucedido', { email: normalizedEmail, tenant: selectedTenantId, version: superVersion, ip: req.ip });

                return res.status(200).json({
                    token,
                    user: {
                        id: '00000000-0000-0000-0000-000000000000',
                        email: normalizedEmail,
                        nome: 'Super Administrador Coliseu',
                        role: 'master',
                        tenant_id: selectedTenantId,
                        permissions: ALL_SUPERADMIN_PERMISSIONS,
                        versao: superVersion,
                        layout_version: superVersion,
                        available_versions: ['Dash 1.0', 'B.I IA.']
                    }
                });
            }
        }

        // Buscar usuário localmente (prioriza registros ativos e mais recentes caso haja múltiplos tenants)
        const query = `
            SELECT id, tenant_id, email, nome, role, ativo, senha_hash, permissions, versao, precisa_trocar_senha
            FROM dash_usuarios
            WHERE LOWER(TRIM(email)) = $1
            ORDER BY ativo DESC, id DESC
        `;
        const result = await db.query(query, [normalizedEmail]);

        if (result.rowCount === 0) {
            logger.warn('[Auth] Falha de login: usuário não encontrado', { email: normalizedEmail, ip: req.ip });
            return res.status(401).json({ error: 'Usuário não encontrado', code: 'INVALID_LOGIN' });
        }

        const activeCandidates = result.rows.filter(r => r.ativo);
        if (activeCandidates.length === 0) {
            logger.warn('[Auth] Login bloqueado: usuário inativo', { email: normalizedEmail, ip: req.ip });
            return res.status(403).json({ error: 'Usuário inativo', code: 'USER_INACTIVE' });
        }

        // Validar senha contra candidatos ativos (com tolerância segura a espaço em branco acidental no copiar/colar)
        let user = null;
        for (const candidate of activeCandidates) {
            if (!candidate.senha_hash) continue;
            let matched = await bcrypt.compare(rawPassword, candidate.senha_hash);
            if (!matched && rawPassword !== rawPassword.trim()) {
                matched = await bcrypt.compare(rawPassword.trim(), candidate.senha_hash);
            }
            if (matched) {
                user = candidate;
                break;
            }
        }

        if (!user) {
            logger.warn('[Auth] Falha de login: senha incorreta', {
                email: normalizedEmail,
                userId: activeCandidates[0].id,
                tenant: activeCandidates[0].tenant_id,
                ip: req.ip,
            });
            return res.status(401).json({ error: 'Senha incorreta', code: 'INVALID_LOGIN' });
        }

        user.versao = normalizeLayoutVersion(user.versao);

        // Solicita alteração de senha se a flag de troca obrigatória estiver ativa
        if (user.precisa_trocar_senha === true) {
            logger.info('[Auth] Login requer troca de senha temporária', { email: user.email, ip: req.ip });
            return res.status(200).json({ requiresPasswordChange: true, email: user.email });
        }

        const selectedVersion = normalizeLayoutVersion(req.body.versao || user.versao || 'Dash 1.0');

        // Validar licença de versão no Identity Server
        let licensedVersions = [];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000') {
            const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

            if (identityApiUrl && identityInternalKey) {
                try {
                    const url = `${identityApiUrl}/internal/companies/${user.tenant_id}/modules/${expectedModuleSlug}/info`;
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Internal-Api-Key': identityInternalKey
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeout);

                    if (response.status === 200) {
                        const licenseData = await response.json();
                        if (licenseData.isActive === false) {
                            return res.status(403).json({ error: 'Licença desativada no servidor de licenças.', code: 'LICENSE_INACTIVE' });
                        }
                        licensedVersions = licenseData.versions || [];
                        if (licensedVersions.length > 0 && !licensedVersions.includes(selectedVersion)) {
                            logger.warn('[Auth] Bloqueio de login: versão não habilitada na licença', { email: user.email, selectedVersion, licensedVersions });
                            return res.status(403).json({ 
                                error: `A versão '${selectedVersion}' não está habilitada na licença da empresa no servidor de licenças.`, 
                                code: 'VERSION_NOT_LICENSED' 
                            });
                        }
                    } else if (response.status === 403) {
                        const licenseData = await response.json().catch(() => ({}));
                        const reason = licenseData.reason || licenseData.error || 'Empresa inativa ou módulo bloqueado no controle de licenças.';
                        logger.warn('[Auth] Login bloqueado pelo Identity Server (403)', { email: user.email, reason });
                        return res.status(403).json({ error: reason, code: 'MODULE_BLOCKED' });
                    } else {
                        logger.warn('[Auth] Resposta inesperada do Identity Server no login', { status: response.status, tenant: user.tenant_id });
                    }
                } catch (err) {
                    logger.error('[Auth] Erro ao comunicar com o servidor de licenças durante login', err);
                    // Tolerância: prosseguir caso de erro na comunicação
                }
            }
        }

        // Buscar as versões às quais o usuário tem acesso
        let available_versions = [];
        if (user.role === 'master' || user.role === 'admin') {
            available_versions = ['Dash 1.0', 'B.I IA.'];
        } else {
            const versionsRes = await db.query(
                `SELECT DISTINCT g.versao 
                 FROM dash_usuario_grupo ug
                 JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                 WHERE ug.usuario_id = $1`,
                [user.id]
            );
            available_versions = versionsRes.rows.map(r => r.versao);
            if (user.versao && !available_versions.includes(user.versao)) {
                available_versions.push(user.versao);
            }
        }

        // Filtrar as versões disponíveis baseadas na licença
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            available_versions = available_versions.filter(v => licensedVersions.includes(v));
        }

        // Validar se o usuário tem permissão para a versão selecionada
        if (!available_versions.includes(selectedVersion)) {
            logger.warn('[Auth] Bloqueio de login: usuário sem permissão para a versão', { email: user.email, selectedVersion, available_versions });
            return res.status(403).json({
                error: `Você não tem acesso à versão '${selectedVersion}'. Verifique seus grupos de acesso.`,
                code: 'USER_VERSION_ACCESS_DENIED'
            });
        }

        // Atualizar a versão ativa do usuário no banco de dados se for diferente
        if (user.versao !== selectedVersion) {
            await db.query('UPDATE dash_usuarios SET versao = $1 WHERE id = $2', [selectedVersion, user.id]);
            user.versao = selectedVersion;
        }

        // Gerar JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                tenant: user.tenant_id,
                tenantId: user.tenant_id,
                module: config.security.expectedModuleSlug,
                companyName: user.tenant_id === '00000000-0000-0000-0000-000000000000' ? 'Coliseu Sistemas (Master)' : 'Empresa Cliente',
                role: user.role,
                layoutVersion: selectedVersion
            },
            config.security.jwtDeviceKey,
            { expiresIn: '12h' }
        );

        logger.info('[Auth] Login interno bem-sucedido', { email: user.email, tenant: user.tenant_id, version: selectedVersion });

        const permissions = await getUserPermissions(user.id, user.tenant_id);

        // Filtrar as permissões de layout (layout_1, layout_2, layout_3) com base na licença contratada
        let filteredPermissions = [...permissions];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            if (!licensedVersions.includes('Dash 1.0')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_1');
            }
            if (!licensedVersions.includes('B.I IA.')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_3');
            }
        }

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions: filteredPermissions,
                versao: selectedVersion,
                layout_version: selectedVersion,
                available_versions
            }
        });

    } catch (err) {
        logger.error('[Auth] Erro na rota de login', err);
        res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
});

/**
 * Rota para alterar a senha padrão/temporária
 */
router.post('/change-default-password', async (req, res) => {
    try {
        const { email, password, newPassword, selectedTenantId, versao } = req.body;

        if (!email || !password || !newPassword) {
            return res.status(400).json({ error: 'Email, senha atual e nova senha são obrigatórios', code: 'MISSING_FIELDS' });
        }

        if (newPassword === '123456' || newPassword === password) {
            return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual e não pode ser "123456"', code: 'PASSWORD_TOO_WEAK' });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        // Buscar usuário localmente
        const query = `
            SELECT id, tenant_id, email, nome, role, ativo, senha_hash, permissions, versao, precisa_trocar_senha
            FROM dash_usuarios
            WHERE LOWER(TRIM(email)) = $1
            ORDER BY ativo DESC, id DESC
        `;
        const result = await db.query(query, [normalizedEmail]);

        if (result.rowCount === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado', code: 'INVALID_LOGIN' });
        }

        const user = result.rows[0];

        if (!user.ativo) {
            return res.status(403).json({ error: 'Usuário inativo', code: 'USER_INACTIVE' });
        }

        if (password !== '123456' && user.precisa_trocar_senha !== true) {
            return res.status(400).json({ error: 'Esta rota é apenas para alteração de senha temporária/padrão', code: 'NOT_DEFAULT_PASSWORD' });
        }

        // Validar se a senha atual confere
        let isMatch = await bcrypt.compare(String(password), user.senha_hash);
        if (!isMatch && String(password) !== String(password).trim()) {
            isMatch = await bcrypt.compare(String(password).trim(), user.senha_hash);
        }
        if (!isMatch) {
            return res.status(401).json({ error: 'Senha atual incorreta', code: 'INVALID_LOGIN' });
        }

        // Criar hash da nova senha
        const salt = await bcrypt.genSalt(10);
        const newSenhaHash = await bcrypt.hash(newPassword, salt);

        const selectedVersion = normalizeLayoutVersion(versao || user.versao || 'Dash 1.0');

        // Atualizar senha e versão no DB
        await db.query(
            'UPDATE dash_usuarios SET senha_hash = $1, versao = $2, precisa_trocar_senha = false WHERE id = $3',
            [newSenhaHash, selectedVersion, user.id]
        );

        user.versao = selectedVersion;

        // Validar licença de versão no Identity Server
        let licensedVersions = [];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000') {
            const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

            if (identityApiUrl && identityInternalKey) {
                try {
                    const url = `${identityApiUrl}/internal/companies/${user.tenant_id}/modules/${expectedModuleSlug}/info`;
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 3000);

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Internal-Api-Key': identityInternalKey
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeout);

                    if (response.status === 200) {
                        const licenseData = await response.json();
                        if (licenseData.isActive === false) {
                            return res.status(403).json({ error: 'Licença desativada no servidor de licenças.', code: 'LICENSE_INACTIVE' });
                        }
                        licensedVersions = licenseData.versions || [];
                        if (licensedVersions.length > 0 && !licensedVersions.includes(selectedVersion)) {
                            return res.status(403).json({ 
                                error: `A versão '${selectedVersion}' não está habilitada na licença da empresa no servidor de licenças.`, 
                                code: 'VERSION_NOT_LICENSED' 
                            });
                        }
                    }
                } catch (err) {
                    logger.error('[Auth] Erro ao comunicar com o servidor de licenças na troca de senha', err);
                }
            }
        }

        // Buscar as versões às quais o usuário tem acesso
        let available_versions = [];
        if (user.role === 'master' || user.role === 'admin') {
            available_versions = ['Dash 1.0', 'B.I IA.'];
        } else {
            const versionsRes = await db.query(
                `SELECT DISTINCT g.versao 
                 FROM dash_usuario_grupo ug
                 JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                 WHERE ug.usuario_id = $1`,
                [user.id]
            );
            available_versions = versionsRes.rows.map(r => r.versao);
            if (user.versao && !available_versions.includes(user.versao)) {
                available_versions.push(user.versao);
            }
        }

        // Filtrar por licença
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            available_versions = available_versions.filter(v => licensedVersions.includes(v));
        }

        // Validar permissão
        if (!available_versions.includes(selectedVersion)) {
            return res.status(403).json({
                error: `Você não tem acesso à versão '${selectedVersion}'. Verifique seus grupos de acesso.`,
                code: 'USER_VERSION_ACCESS_DENIED'
            });
        }

        // Gerar JWT
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                tenant: user.tenant_id,
                tenantId: user.tenant_id,
                module: config.security.expectedModuleSlug,
                companyName: user.tenant_id === '00000000-0000-0000-0000-000000000000' ? 'Coliseu Sistemas (Master)' : 'Empresa Cliente',
                role: user.role,
                layoutVersion: selectedVersion
            },
            config.security.jwtDeviceKey,
            { expiresIn: '12h' }
        );

        const permissions = await getUserPermissions(user.id, user.tenant_id);

        let filteredPermissions = [...permissions];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            if (!licensedVersions.includes('Dash 1.0')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_1');
            }
            if (!licensedVersions.includes('B.I IA.')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_3');
            }
        }

        logger.info('[Auth] Senha padrão alterada e login realizado com sucesso', { email: user.email });

        res.status(200).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions: filteredPermissions,
                versao: selectedVersion,
                layout_version: selectedVersion,
                available_versions
            }
        });

    } catch (err) {
        logger.error('[Auth] Erro ao alterar senha padrão', err);
        res.status(500).json({ error: 'Erro interno no servidor ao alterar a senha', code: 'INTERNAL_ERROR' });
    }
});

/**
 * Logout do usuário.
 */
router.post('/logout', async (req, res) => {
    // Como usamos JWT, o frontend já remove o token.
    // Aqui podemos apenas retornar sucesso ou invalidar sessão no futuro.
    res.status(200).json({ message: 'Logout realizado com sucesso' });
});

/**
 * Cadastro de novo usuário.
 */
router.post('/register', async (req, res) => {
    try {
        const { nome, email, password, companyKey } = req.body;

        if (!nome || !email || !password || !companyKey) {
            return res.status(400).json({ error: 'Nome, email, senha e ID da Empresa (CompanyKey) são obrigatórios', code: 'MISSING_FIELDS' });
        }

        // 1. Validação no Servidor de Licenças (Limite de Dispositivos/Cadastros)
        const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

        if (!identityApiUrl || !identityInternalKey) {
            logger.warn('[Auth] Falta configuração do IDENTITY_API_URL/KEY. Bloqueando cadastro por segurança.');
            return res.status(500).json({ error: 'Erro de infraestrutura do sistema de licenças', code: 'CONFIG_ERROR' });
        }

        let licenseData = {};
        try {
            const url = `${identityApiUrl}/internal/companies/${companyKey}/modules/${expectedModuleSlug}/info`;
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Api-Key': identityInternalKey
                },
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (response.status !== 200) {
                const data = await response.json().catch(() => ({}));
                const reason = data.reason || data.error || 'Empresa inativa ou módulo bloqueado.';
                return res.status(403).json({ error: reason, code: 'MODULE_BLOCKED' });
            }

            licenseData = await response.json();
            const deviceLimit = licenseData.deviceLimit || 0;

            // Checar a quantidade atual de usuários para este tenant
            const countQuery = `SELECT COUNT(*) as total FROM dash_usuarios WHERE tenant_id = $1`;
            const countResult = await db.query(countQuery, [companyKey]);
            const currentUsersCount = parseInt(countResult.rows[0].total, 10);

            if (deviceLimit > 0 && currentUsersCount >= deviceLimit) {
                return res.status(403).json({ 
                    error: `O limite de licenças (${deviceLimit}) para esta empresa foi atingido. Nenhuma nova conta pode ser criada.`, 
                    code: 'LICENSE_LIMIT_REACHED' 
                });
            }
        } catch (err) {
            logger.error('[Auth] Erro ao comunicar com o servidor de licenças durante cadastro', err);
            return res.status(503).json({ error: 'Servidor de licenças temporariamente indisponível. Não foi possível validar sua licença.', code: 'LICENSE_API_ERROR' });
        }

        // 2. Valida se o email já existe
        const checkQuery = `SELECT id FROM dash_usuarios WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`;
        const checkResult = await db.query(checkQuery, [email]);
        
        if (checkResult.rowCount > 0) {
            return res.status(409).json({ error: 'Este email já está em uso', code: 'EMAIL_IN_USE' });
        }

        // Hash da senha
        const salt = await bcrypt.genSalt(10);
        const senhaHash = await bcrypt.hash(password, salt);

        // Insere o usuário (default role: admin)
        const insertQuery = `
            INSERT INTO dash_usuarios (tenant_id, email, nome, role, ativo, senha_hash, permissions, versao, precisa_trocar_senha)
            VALUES ($1, $2, $3, 'admin', true, $4, NULL, 'Dash 1.0', false)
            RETURNING id, tenant_id, email, nome, role, permissions, versao
        `;
        const result = await db.query(insertQuery, [companyKey, email, nome, senhaHash]);
        const user = result.rows[0];

        logger.info('[Auth] Novo usuário cadastrado com sucesso', { email: user.email, tenant: user.tenant_id });

        // Gerar token JWT imediatamente para autenticação automática sem atrito
        const companyName = licenseData.nomeDaEmpresa || licenseData.companyName || 'Empresa Cliente';
        const selectedVersion = user.versao || 'Dash 1.0';
        const token = jwt.sign(
            {
                sub: user.id,
                email: user.email,
                tenant: user.tenant_id,
                tenantId: user.tenant_id,
                module: expectedModuleSlug,
                companyName: companyName,
                role: user.role,
                layoutVersion: selectedVersion
            },
            config.security.jwtDeviceKey,
            { expiresIn: '12h' }
        );

        const permissions = await getUserPermissions(user.id, user.tenant_id);
        const available_versions = (licenseData.versions && licenseData.versions.length > 0)
            ? licenseData.versions
            : ['Dash 1.0', 'B.I IA.'];

        // Retorna sucesso com token e perfil para login instantâneo
        res.status(201).json({
            message: 'Usuário cadastrado com sucesso',
            token,
            user: {
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                permissions,
                versao: selectedVersion,
                layout_version: selectedVersion,
                available_versions
            }
        });
    } catch (err) {
        logger.error('[Auth] Erro na rota de cadastro', err);
        // Tratar erro de UUID mal formatado (caso o usuário digite texto comum em vez de CompanyKey válida)
        if (err.code === '22P02') {
            return res.status(400).json({ error: 'ID da Empresa inválido. O CompanyKey deve ser um UUID válido.', code: 'INVALID_UUID' });
        }
        res.status(500).json({ error: 'Erro interno no servidor ao cadastrar', code: 'INTERNAL_ERROR' });
    }
});

/**
 * GET /api/auth/me
 * Retorna o perfil do usuário logado com as permissões ativas.
 */
router.get('/me', requireWebJwt, async (req, res) => {
    try {
        if (req.user && (req.user.email === 'admin@coliseu.com' || (req.user.email === 'admin@coliseu.com.br' && req.user.role === 'master'))) {
            const activeVer = normalizeLayoutVersion(req.user.layoutVersion || 'Dash 1.0');
            return res.json({
                user: {
                    id: req.user.id || '00000000-0000-0000-0000-000000000000',
                    email: req.user.email,
                    nome: 'Super Administrador Coliseu',
                    role: 'master',
                    tenant_id: req.tenant.id,
                    permissions: ALL_SUPERADMIN_PERMISSIONS,
                    versao: activeVer,
                    layout_version: activeVer,
                    available_versions: ['Dash 1.0', 'B.I IA.']
                }
            });
        }

        const userId = req.user.id;
        const tenantId = req.tenant.id;

        const { rows } = await db.query(
            'SELECT id, tenant_id, email, nome, role, versao, grupo_id FROM dash_usuarios WHERE id = $1 AND tenant_id = $2',
            [userId, tenantId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado', code: 'USER_NOT_FOUND' });
        }

        const user = rows[0];
        user.versao = normalizeLayoutVersion(user.versao);
        const permissions = await getUserPermissions(user.id, user.tenant_id);

        // Buscar licença no Identity Server para filtrar versões
        let licensedVersions = [];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000') {
            const { identityApiUrl, identityInternalKey, expectedModuleSlug } = config.security;

            if (identityApiUrl && identityInternalKey) {
                try {
                    const url = `${identityApiUrl}/internal/companies/${user.tenant_id}/modules/${expectedModuleSlug}/info`;
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 2000);

                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Internal-Api-Key': identityInternalKey
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeout);

                    if (response.status === 200) {
                        const licenseData = await response.json();
                        licensedVersions = licenseData.versions || [];
                    }
                } catch (err) {
                    logger.warn('[Auth] Falha tolerada ao consultar licenças no /me', { err: err.message, tenantId: user.tenant_id });
                }
            }
        }

        // Buscar as versões às quais o usuário tem acesso
        let available_versions = [];
        if (user.role === 'master' || user.role === 'admin') {
            available_versions = ['Dash 1.0', 'B.I IA.'];
        } else {
            const versionsRes = await db.query(
                `SELECT DISTINCT g.versao 
                 FROM dash_usuario_grupo ug
                 JOIN dash_grupos_acesso g ON ug.grupo_id = g.id
                 WHERE ug.usuario_id = $1`,
                [user.id]
            );
            available_versions = versionsRes.rows.map(r => r.versao);
            if (user.versao && !available_versions.includes(user.versao)) {
                available_versions.push(user.versao);
            }
        }

        // Filtrar as versões disponíveis baseadas na licença
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            available_versions = available_versions.filter(v => licensedVersions.includes(v));
        }

        // Filtrar as permissões de layout (layout_1, layout_2, layout_3) com base na licença contratada
        let filteredPermissions = [...permissions];
        if (user.tenant_id !== '00000000-0000-0000-0000-000000000000' && licensedVersions.length > 0) {
            if (!licensedVersions.includes('Dash 1.0')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_1');
            }
            if (!licensedVersions.includes('B.I IA.')) {
                filteredPermissions = filteredPermissions.filter(p => p !== 'layout_3');
            }
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                nome: user.nome,
                role: user.role,
                tenant_id: user.tenant_id,
                permissions: filteredPermissions,
                versao: user.versao,
                layout_version: user.versao,
                grupo_id: user.grupo_id,
                available_versions
            }
        });
    } catch (err) {
        logger.error('[Auth] Erro no endpoint /me', err);
        res.status(500).json({ error: 'Erro interno no servidor', code: 'INTERNAL_ERROR' });
    }
});

module.exports = router;
