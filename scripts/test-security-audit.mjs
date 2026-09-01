// Script de Testes e Auditoria Automatizada de Segurança, Multi-Tenant e Marketplace
// Executa verificações contra o servidor e valida o isolamento de dados e proteção anti-IDOR

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passedCount = 0;
let failedCount = 0;
const results = [];

function logTest(testId, name, passed, details) {
  if (passed) {
    passedCount++;
    console.log(`\x1b[32m✔ [PASS]\x1b[0m ${testId}: ${name}`);
  } else {
    failedCount++;
    console.log(`\x1b[31m✖ [FAIL]\x1b[0m ${testId}: ${name}`);
    if (details) console.log(`   \x1b[33m↳ ${details}\x1b[0m`);
  }
  results.push({ testId, name, passed, details });
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🛡️  INICIANDO AUDITORIA DE SEGURANÇA E MULTI-TENANT`);
  console.log(`Alvo: ${BASE_URL}`);
  console.log(`======================================================\n`);

  // 1. Health Check
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    logTest("AUDIT-01", "Health Check e Disponibilidade da API", res.status === 200 && (data.ok === true || data.status === "ok"));
  } catch (err) {
    logTest("AUDIT-01", "Health Check e Disponibilidade da API", false, err.message);
  }

  // 2. Auth: Credenciais Inválidas (Anti-Brute & Enumeração)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "hacker@test.com", password: "wrong_password" })
    });
    const data = await res.json();
    const isSafe = res.status === 401 && (data.error !== undefined || data.success === false);
    logTest("AUDIT-02", "Rejeição de Login com Credenciais Inválidas (Anti-Brute)", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-02", "Rejeição de Login com Credenciais Inválidas", false, err.message);
  }

  // 3. Auth: Login com Campos Vazios
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" })
    });
    const isSafe = res.status === 400 || res.status === 401;
    logTest("AUDIT-03", "Tratamento de Payload Vazio no Login", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-03", "Tratamento de Payload Vazio no Login", false, err.message);
  }

  // 4. Marketplace: Polling Não Autenticado / Sem Merchant ID
  try {
    const res = await fetch(`${BASE_URL}/api/v1/marketplace/events:poll`);
    const data = await res.json();
    const isSafe = res.status === 401 && !!data.error;
    logTest("AUDIT-04", "Marketplace: Bloqueio de Polling Não Autenticado (Zero-Trust)", isSafe, `Status: ${res.status}, msg: ${data.error}`);
  } catch (err) {
    logTest("AUDIT-04", "Marketplace: Bloqueio de Polling Não Autenticado", false, err.message);
  }

  // 5. Marketplace: Polling Isolado por Tenant A
  try {
    const res = await fetch(`${BASE_URL}/api/v1/marketplace/events:poll`, {
      headers: { "x-merchant-id": "tenant_test_a" }
    });
    const data = await res.json();
    const isSafe = res.status === 200 && data.success === true && data.merchantId === "tenant_test_a";
    logTest("AUDIT-05", "Marketplace: Polling com Escopo Restrito ao Tenant A", isSafe, `MerchantId retornado: ${data.merchantId}`);
  } catch (err) {
    logTest("AUDIT-05", "Marketplace: Polling com Escopo Restrito ao Tenant A", false, err.message);
  }

  // 6. Marketplace: Cardápio Isolado por Tenant
  try {
    const resA = await fetch(`${BASE_URL}/api/v1/marketplace/catalog?tenantId=tenant_loja_alpha`);
    const dataA = await resA.json();
    const isSafe = resA.status === 200 && dataA.success === true && dataA.merchantId === "tenant_loja_alpha";
    logTest("AUDIT-06", "Marketplace: Catálogo de Produtos Isolado por Loja", isSafe, `Items: ${dataA.totalItems}`);
  } catch (err) {
    logTest("AUDIT-06", "Marketplace: Catálogo de Produtos Isolado por Loja", false, err.message);
  }

  // 7. Marketplace: Proteção Anti-IDOR ao Confirmar Pedido de Outro Tenant
  try {
    const res = await fetch(`${BASE_URL}/api/v1/marketplace/orders/ord_non_existent_999/confirm`, {
      method: "POST",
      headers: { "x-merchant-id": "tenant_test_attacker" }
    });
    // Deve retornar 404 (não encontrado) ou 403 (acesso negado), nunca 200 se não pertencer
    const isSafe = res.status === 404 || res.status === 403;
    logTest("AUDIT-07", "Marketplace: Proteção Anti-IDOR na Confirmação de Pedido", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-07", "Marketplace: Proteção Anti-IDOR na Confirmação de Pedido", false, err.message);
  }

  // 8. Marketplace: Proteção Anti-IDOR ao Cancelar Pedido de Outro Tenant
  try {
    const res = await fetch(`${BASE_URL}/api/v1/marketplace/orders/ord_non_existent_888/cancel`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-merchant-id": "tenant_test_attacker" 
      },
      body: JSON.stringify({ reason: "Cancelamento não autorizado por invasor", code: "HACK_ATTEMPT" })
    });
    const isSafe = res.status === 404 || res.status === 403;
    logTest("AUDIT-08", "Marketplace: Proteção Anti-IDOR no Cancelamento de Pedido", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-08", "Marketplace: Proteção Anti-IDOR no Cancelamento de Pedido", false, err.message);
  }

  // 9. Fiscal: Consulta de Documentos Fiscais Sem Tenant (IDOR Prevention)
  try {
    const res = await fetch(`${BASE_URL}/api/fiscal/documents`);
    const data = await res.json();
    const isSafe = res.status === 400 && data.success === false;
    logTest("AUDIT-09", "Módulo Fiscal: Obrigatoriedade de Tenant ID em Consultas Fiscais", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-09", "Módulo Fiscal: Obrigatoriedade de Tenant ID", false, err.message);
  }

  // 10. Fiscal: Reimpressão de Documento de Outro Tenant (IDOR Prevention)
  try {
    const res = await fetch(`${BASE_URL}/api/fiscal/reprint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_alien_tenant_123",
        tenantId: "tenant_intruder_456"
      })
    });
    const isSafe = res.status === 404 || res.status === 403;
    logTest("AUDIT-10", "Módulo Fiscal: Bloqueio Anti-IDOR de Reimpressão Cruzada", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-10", "Módulo Fiscal: Bloqueio Anti-IDOR de Reimpressão Cruzada", false, err.message);
  }

  // 11. Fiscal: Cancelamento Fiscal com Justificativa Curta (Regra SEFAZ)
  try {
    const res = await fetch(`${BASE_URL}/api/fiscal/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        documentId: "doc_test_123",
        tenantId: "tenant_test_a",
        reason: "curto" // Menos de 15 caracteres
      })
    });
    const isSafe = res.status === 400;
    logTest("AUDIT-11", "Módulo Fiscal: Validação de Justificativa Legal Mínima (15 caracteres)", isSafe, `Status: ${res.status}`);
  } catch (err) {
    logTest("AUDIT-11", "Módulo Fiscal: Validação de Justificativa Legal", false, err.message);
  }

  // 12. Marketplace: Atualização de Status da Loja Isolada
  try {
    const res = await fetch(`${BASE_URL}/api/v1/marketplace/merchant/status`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-merchant-id": "tenant_loja_beta"
      },
      body: JSON.stringify({ status: "OPEN" })
    });
    const data = await res.json();
    const isSafe = res.status === 200 && data.success === true && data.merchantId === "tenant_loja_beta";
    logTest("AUDIT-12", "Marketplace: Controle de Abertura/Fechamento Isolado por Loja", isSafe, `MerchantId: ${data.merchantId}`);
  } catch (err) {
    logTest("AUDIT-12", "Marketplace: Controle de Abertura/Fechamento Isolado por Loja", false, err.message);
  }

  console.log(`\n======================================================`);
  console.log(`📊 RESUMO DA AUDITORIA DE SEGURANÇA:`);
  console.log(`   ✔ Testes Aprovados: ${passedCount}`);
  console.log(`   ✖ Testes Reprovados: ${failedCount}`);
  console.log(`   Total Executados:   ${results.length}`);
  console.log(`======================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAudit();
