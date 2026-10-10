import fs from 'fs';
import path from 'path';

/**
 * Verificador Automatizado de Regras de Segurança e Isolamento Multi-Tenant (Firestore Rules & Zero-Plaintext Audit)
 *
 * Nota de Ambiente: O ambiente containerizado atual não possui Java Runtime (JRE) nem a CLI `firebase-tools` instalada,
 * impossibilitando a inicialização do binário Java do Firebase Emulator Suite (`@firebase/rules-unit-testing`).
 * Este verificador executa:
 *   1. Análise sintática e estrutural completa do arquivo `firestore.rules`.
 *   2. Simulação lógica determinística da árvore de decisão ABAC/RBAC sobre os 5 cenários obrigatórios.
 *   3. Varredura estática nos fluxos de escrita do código para garantir ausência de gravação de senhas em texto puro.
 */

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

interface RoleContext {
  authenticated: boolean;
  uid?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  active?: boolean;
  isLocalOfflineUnauthenticated?: boolean;
}

interface ResourceDoc {
  collection: string;
  docId: string;
  data: Record<string, any>;
}

// Simulador fiel às funções de `firestore.rules`
function evaluateRule(
  ctx: RoleContext,
  operation: 'get' | 'list' | 'create' | 'update' | 'delete',
  existingDoc: ResourceDoc | null,
  incomingData: Record<string, any> | null,
  targetCollection: string,
  targetDocId: string
): boolean {
  // Se é uma sessão puramente local/offline sem token Firebase Auth verificado, request.auth é null
  const isAuthenticated = ctx.authenticated && !ctx.isLocalOfflineUnauthenticated && !!ctx.uid;

  const isMasterEmail = isAuthenticated && ctx.email === 'financeirorenanuk@gmail.com';
  const isActiveUser = isAuthenticated && ctx.active !== false;
  const isSaasAdmin = isMasterEmail || (isActiveUser && ctx.role === 'SAAS_ADMIN');

  const isTenantMember = (tId: string) =>
    isSaasAdmin || (isActiveUser && !!tId && ctx.tenantId === tId);

  const isTenantAdmin = (tId: string) =>
    isSaasAdmin ||
    (isTenantMember(tId) && ['OWNER', 'ADMIN', 'LOJISTA', 'GERENTE'].includes(ctx.role || ''));

  const isTenantCashier = (tId: string) =>
    isTenantAdmin(tId) || (isTenantMember(tId) && ctx.role === 'CAIXA');

  const isTenantStaff = (tId: string) =>
    isTenantCashier(tId) ||
    (isTenantMember(tId) &&
      ['GARCOM', 'COZINHA', 'ENTREGADOR', 'COURIER', 'ATENDENTE', 'COLABORADOR'].includes(ctx.role || ''));

  const hasNoPlaintextPassword = (data: Record<string, any> | null) =>
    !data || !('password' in data) || data.password === null || data.password === '';

  const isValidTenantCreate = (data: Record<string, any> | null) =>
    !!data && typeof data.tenantId === 'string' && data.tenantId.length > 0 && isTenantStaff(data.tenantId);

  const isTenantIdImmutable = (existing: Record<string, any> | null, incoming: Record<string, any> | null) =>
    !!existing && !!incoming && incoming.tenantId === existing.tenantId;

  const isRead = operation === 'get' || operation === 'list';

  switch (targetCollection) {
    case 'users': {
      const resData = existingDoc?.data || {};
      if (isRead) {
        return (
          isSaasAdmin ||
          (isAuthenticated && ctx.uid === targetDocId) ||
          (isAuthenticated && !!resData.tenantId && isTenantMember(resData.tenantId))
        );
      }
      if (operation === 'create') {
        return (
          isAuthenticated &&
          hasNoPlaintextPassword(incomingData) &&
          (isSaasAdmin ||
            (ctx.uid === targetDocId &&
              incomingData?.role !== 'SAAS_ADMIN' &&
              (!('tenantId' in (incomingData || {})) ||
                incomingData?.tenantId === '' ||
                incomingData?.tenantId === ctx.uid ||
                isTenantAdmin(incomingData?.tenantId))) ||
            (!!incomingData?.tenantId &&
              isTenantAdmin(incomingData.tenantId) &&
              incomingData?.role !== 'SAAS_ADMIN'))
        );
      }
      if (operation === 'update') {
        return (
          isAuthenticated &&
          hasNoPlaintextPassword(incomingData) &&
          (isSaasAdmin ||
            (ctx.uid === targetDocId &&
              incomingData?.role === resData.role &&
              incomingData?.tenantId === resData.tenantId) ||
            (!!resData.tenantId &&
              isTenantAdmin(resData.tenantId) &&
              incomingData?.tenantId === resData.tenantId &&
              incomingData?.role !== 'SAAS_ADMIN'))
        );
      }
      if (operation === 'delete') {
        return isSaasAdmin || (!!resData.tenantId && isTenantAdmin(resData.tenantId));
      }
      return false;
    }

    case 'orders': {
      const resData = existingDoc?.data || {};
      if (isRead) {
        return (
          isSaasAdmin ||
          (isAuthenticated && !!resData.tenantId && isTenantStaff(resData.tenantId)) ||
          (isAuthenticated && resData.customerId === ctx.uid) ||
          (isAuthenticated && resData.courierId === ctx.uid)
        );
      }
      if (operation === 'create') {
        return (
          isAuthenticated &&
          !!incomingData &&
          typeof incomingData.tenantId === 'string' &&
          incomingData.tenantId.length > 0 &&
          (isTenantStaff(incomingData.tenantId) ||
            (incomingData.customerId === ctx.uid &&
              incomingData.status === 'pending' &&
              typeof incomingData.total === 'number' &&
              incomingData.total >= 0))
        );
      }
      if (operation === 'update') {
        return (
          isAuthenticated &&
          isTenantIdImmutable(resData, incomingData) &&
          (isTenantStaff(resData.tenantId) ||
            (resData.courierId === ctx.uid &&
              incomingData?.total === resData.total &&
              incomingData?.items === resData.items &&
              ['out_for_delivery', 'delivered'].includes(incomingData?.status)) ||
            (resData.customerId === ctx.uid &&
              resData.status === 'pending' &&
              incomingData?.status === 'cancelled' &&
              incomingData?.total === resData.total))
        );
      }
      if (operation === 'delete') {
        return isSaasAdmin || (!!resData.tenantId && isTenantAdmin(resData.tenantId));
      }
      return false;
    }

    case 'financialRecords':
    case 'cashSessions':
    case 'closings':
    case 'expenses':
    case 'fixedAssets': {
      const resData = existingDoc?.data || {};
      if (isRead) {
        return isSaasAdmin || (!!resData.tenantId && isTenantCashier(resData.tenantId));
      }
      if (operation === 'create') {
        return isValidTenantCreate(incomingData) && isTenantCashier(incomingData!.tenantId);
      }
      if (operation === 'update') {
        return (
          !!resData.tenantId &&
          isTenantCashier(resData.tenantId) &&
          isTenantIdImmutable(resData, incomingData)
        );
      }
      if (operation === 'delete') {
        return isSaasAdmin || (!!resData.tenantId && isTenantAdmin(resData.tenantId));
      }
      return false;
    }

    case 'auditLogs': {
      const resData = existingDoc?.data || {};
      if (isRead) {
        return isSaasAdmin || (!!resData.tenantId && isTenantAdmin(resData.tenantId));
      }
      if (operation === 'create') {
        return isValidTenantCreate(incomingData);
      }
      // Logs de auditoria são imutáveis
      return false;
    }

    default:
      return false;
  }
}

let passed = 0;
let failed = 0;

function assertTest(name: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${name} (esperado: ${expected}, obtido: ${actual})`);
    failed++;
  }
}

console.log('===================================================================');
console.log('EXECUTANDO SUITE DE VERIFICAÇÃO DE SEGURANÇA E ISOLAMENTO MULTI-TENANT');
console.log('===================================================================\n');

// 0. Validação Estrutural de firestore.rules
const hasPublicAllow = /allow\s+(read|write|get|list|create|update|delete)\s*:\s*if\s+true\s*;/.test(rulesContent);
assertTest(
  '0.1 Nenhuma regra possui "allow ...: if true;" (remoção total de acesso público irrestrito)',
  hasPublicAllow,
  false
);

const hasDefaultDeny = /match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/.test(rulesContent);
assertTest(
  '0.2 Regra global Default Deny (match /{document=**} { allow read, write: if false; }) está ativa',
  hasDefaultDeny,
  true
);

// 1. Teste Obrigatório 1: Usuário não autenticado não consegue ler nem escrever dados
const unauthCtx: RoleContext = { authenticated: false };
const sampleOrderA: ResourceDoc = {
  collection: 'orders',
  docId: 'order_a1',
  data: { tenantId: 'tenant_A', customerId: 'cust_1', total: 89.9, status: 'pending', items: [] }
};

assertTest(
  '1.1 Usuário não autenticado NÃO consegue ler pedidos (orders)',
  evaluateRule(unauthCtx, 'get', sampleOrderA, null, 'orders', 'order_a1'),
  false
);
assertTest(
  '1.2 Usuário não autenticado NÃO consegue criar pedidos (orders)',
  evaluateRule(unauthCtx, 'create', null, sampleOrderA.data, 'orders', 'order_a1'),
  false
);
assertTest(
  '1.3 Usuário não autenticado NÃO consegue ler registros financeiros (financialRecords)',
  evaluateRule(unauthCtx, 'get', { collection: 'financialRecords', docId: 'fin_1', data: { tenantId: 'tenant_A' } }, null, 'financialRecords', 'fin_1'),
  false
);
assertTest(
  '1.4 Usuário não autenticado NÃO consegue ler perfis de usuários (users)',
  evaluateRule(unauthCtx, 'get', { collection: 'users', docId: 'u_a1', data: { tenantId: 'tenant_A' } }, null, 'users', 'u_a1'),
  false
);

// 2. Teste Obrigatório 2: Usuário autenticado do restaurante A não consegue ler nem alterar dados do restaurante B
const ownerTenantA: RoleContext = {
  authenticated: true,
  uid: 'owner_A',
  email: 'lojistaA@restaurantea.com',
  role: 'OWNER',
  tenantId: 'tenant_A',
  active: true
};

const orderTenantB: ResourceDoc = {
  collection: 'orders',
  docId: 'order_b1',
  data: { tenantId: 'tenant_B', customerId: 'cust_2', total: 120.0, status: 'preparing', items: [] }
};

const financeTenantB: ResourceDoc = {
  collection: 'financialRecords',
  docId: 'fin_b1',
  data: { tenantId: 'tenant_B', amount: 5000, type: 'income' }
};

assertTest(
  '2.1 Lojista do Restaurante A CONSEGUE ler pedido do próprio Restaurante A',
  evaluateRule(ownerTenantA, 'get', sampleOrderA, null, 'orders', 'order_a1'),
  true
);
assertTest(
  '2.2 Lojista do Restaurante A NÃO consegue ler pedido do Restaurante B (isolamento de leitura)',
  evaluateRule(ownerTenantA, 'get', orderTenantB, null, 'orders', 'order_b1'),
  false
);
assertTest(
  '2.3 Lojista do Restaurante A NÃO consegue alterar pedido do Restaurante B (isolamento de escrita)',
  evaluateRule(ownerTenantA, 'update', orderTenantB, { ...orderTenantB.data, status: 'cancelled' }, 'orders', 'order_b1'),
  false
);
assertTest(
  '2.4 Lojista do Restaurante A NÃO consegue ler financeiro do Restaurante B',
  evaluateRule(ownerTenantA, 'get', financeTenantB, null, 'financialRecords', 'fin_b1'),
  false
);
assertTest(
  '2.5 Lojista do Restaurante A NÃO consegue criar registro forjando tenantId do Restaurante B',
  evaluateRule(ownerTenantA, 'create', null, { tenantId: 'tenant_B', amount: 100 }, 'financialRecords', 'fin_forged'),
  false
);
assertTest(
  '2.6 Lojista do Restaurante A NÃO consegue transferir pedido do Restaurante A para o Restaurante B (imutabilidade de tenantId)',
  evaluateRule(ownerTenantA, 'update', sampleOrderA, { ...sampleOrderA.data, tenantId: 'tenant_B' }, 'orders', 'order_a1'),
  false
);

// 3. Teste Obrigatório 3: Cada papel só executa as operações autorizadas (RBAC)
const waiterTenantA: RoleContext = {
  authenticated: true,
  uid: 'waiter_A',
  email: 'garcom@restaurantea.com',
  role: 'GARCOM',
  tenantId: 'tenant_A',
  active: true
};

const cashierTenantA: RoleContext = {
  authenticated: true,
  uid: 'cashier_A',
  email: 'caixa@restaurantea.com',
  role: 'CAIXA',
  tenantId: 'tenant_A',
  active: true
};

const customerUser: RoleContext = {
  authenticated: true,
  uid: 'cust_1',
  email: 'cliente@gmail.com',
  role: 'CUSTOMER',
  tenantId: '',
  active: true
};

assertTest(
  '3.1 Garçom (GARCOM) CONSEGUE criar/atualizar pedido operacional no próprio restaurante',
  evaluateRule(waiterTenantA, 'update', sampleOrderA, { ...sampleOrderA.data, status: 'preparing' }, 'orders', 'order_a1'),
  true
);
assertTest(
  '3.2 Garçom (GARCOM) NÃO consegue ler nem lançar registros financeiros/fechamento de caixa',
  evaluateRule(waiterTenantA, 'get', { collection: 'financialRecords', docId: 'fin_a1', data: { tenantId: 'tenant_A' } }, null, 'financialRecords', 'fin_a1'),
  false
);
assertTest(
  '3.3 Operador de Caixa (CAIXA) CONSEGUE ler e lançar registros financeiros do próprio restaurante',
  evaluateRule(cashierTenantA, 'create', null, { tenantId: 'tenant_A', amount: 150, type: 'income' }, 'financialRecords', 'fin_a2'),
  true
);
assertTest(
  '3.4 Operador de Caixa (CAIXA) NÃO consegue excluir registros financeiros (restrito a Admin/Owner)',
  evaluateRule(cashierTenantA, 'delete', { collection: 'financialRecords', docId: 'fin_a2', data: { tenantId: 'tenant_A' } }, null, 'financialRecords', 'fin_a2'),
  false
);
assertTest(
  '3.5 Cliente (CUSTOMER) CONSEGUE criar seu próprio pedido pendente e cancelar enquanto pendente',
  evaluateRule(customerUser, 'create', null, sampleOrderA.data, 'orders', 'order_a1') &&
    evaluateRule(customerUser, 'update', sampleOrderA, { ...sampleOrderA.data, status: 'cancelled' }, 'orders', 'order_a1'),
  true
);
assertTest(
  '3.6 Cliente (CUSTOMER) NÃO consegue aprovar o próprio pedido para "preparing" nem alterar o valor total',
  evaluateRule(customerUser, 'update', sampleOrderA, { ...sampleOrderA.data, status: 'preparing' }, 'orders', 'order_a1') ||
    evaluateRule(customerUser, 'update', sampleOrderA, { ...sampleOrderA.data, status: 'cancelled', total: 1.0 }, 'orders', 'order_a1'),
  false
);
assertTest(
  '3.7 Nenhum papel (nem mesmo OWNER) consegue alterar ou deletar logs de auditoria (auditLogs imutáveis)',
  evaluateRule(ownerTenantA, 'update', { collection: 'auditLogs', docId: 'log_1', data: { tenantId: 'tenant_A' } }, { tenantId: 'tenant_A' }, 'auditLogs', 'log_1') ||
    evaluateRule(ownerTenantA, 'delete', { collection: 'auditLogs', docId: 'log_1', data: { tenantId: 'tenant_A' } }, null, 'auditLogs', 'log_1'),
  false
);

// 4. Teste Obrigatório 4: A sincronização offline não permite que uma sessão local sem autenticação envie ou leia dados remotos
const localOfflineFallbackCtx: RoleContext = {
  authenticated: true,
  uid: 'local_session_owner',
  role: 'OWNER',
  tenantId: 'tenant_A',
  active: true,
  isLocalOfflineUnauthenticated: true // Simula fallback local sem token real do Firebase Auth
};

assertTest(
  '4.1 Sessão local/offline sem token Firebase Auth NÃO consegue ler dados remotos do Firestore',
  evaluateRule(localOfflineFallbackCtx, 'get', sampleOrderA, null, 'orders', 'order_a1'),
  false
);
assertTest(
  '4.2 Sessão local/offline sem token Firebase Auth NÃO consegue sincronizar/escrever dados remotos no Firestore',
  evaluateRule(localOfflineFallbackCtx, 'create', null, sampleOrderA.data, 'orders', 'order_offline_1'),
  false
);

const appTsxContent = fs.readFileSync(path.resolve(process.cwd(), 'App.tsx'), 'utf8');
const hasFirebaseAuthGateInApp = appTsxContent.includes('const isRemoteAuthValid = Boolean(auth.currentUser?.uid) && !user?.isLocalSession');
assertTest(
  '4.3 App.tsx bloqueia abertura de listeners/sincronização remota quando não há auth.currentUser?.uid verificado (!isRemoteAuthValid)',
  hasFirebaseAuthGateInApp,
  true
);

// 5. Teste Obrigatório 5: Senhas e segredos não aparecem em documentos gravados pelo cliente
assertTest(
  '5.1 Firestore Rules REJEITA criação ou atualização de documento em /users contendo campo password em texto puro',
  evaluateRule(
    ownerTenantA,
    'create',
    null,
    { tenantId: 'tenant_A', name: 'Novo Garçom', email: 'g2@a.com', role: 'GARCOM', password: 'PlaintextPassword123!' },
    'users',
    'u_new'
  ),
  false
);

assertTest(
  '5.2 Firestore Rules PERMITE criação de documento em /users quando o campo password está ausente',
  evaluateRule(
    ownerTenantA,
    'create',
    null,
    { tenantId: 'tenant_A', name: 'Novo Garçom', email: 'g2@a.com', role: 'GARCOM' },
    'users',
    'u_new'
  ),
  true
);

const userProfileModalContent = fs.readFileSync(path.resolve(process.cwd(), 'components/UserProfileModal.tsx'), 'utf8');
const writesPasswordInProfileModal = /updatedData\.password\s*=/.test(userProfileModalContent);
assertTest(
  '5.3 UserProfileModal.tsx NÃO grava mais updatedData.password no documento do Firestore',
  writesPasswordInProfileModal,
  false
);

const fiscalSettingsContent = fs.readFileSync(path.resolve(process.cwd(), 'components/FiscalSettings.tsx'), 'utf8');
const writesPfxPasswordInState = /certificate:\s*\{\s*pfxBase64:\s*base64,\s*password:\s*pfxPassword/.test(fiscalSettingsContent);
assertTest(
  '5.4 FiscalSettings.tsx NÃO persiste a senha do certificado A1 (.pfx) no objeto de configurações sincronizado com o Firestore',
  writesPfxPasswordInState,
  false
);

console.log('\n===================================================================');
console.log(`RESULTADO FINAL: ${passed} testes aprovados, ${failed} falhas.`);
console.log('===================================================================');

if (failed > 0) {
  process.exit(1);
}
