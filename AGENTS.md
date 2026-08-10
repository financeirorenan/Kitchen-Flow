# Diretrizes de Desenvolvimento e Regras de Blindagem (KitchenFlow / SaaS)

## 🛡️ Regras de Proteção e Blindagem de Módulos (CÓDIGO CONGELADO)

As regras abaixo são estritas e devem ser seguidas em todas as interações de código.

### 1. Sistema de Autenticação e Login (`Login.tsx`, `/api/auth/login`, `App.tsx` Auth Listener)
- **Status**: **BLINDADO**
- **Regras**:
  - O fluxo de login e carregamento de dados do usuário possui fallback resiliente para cota do Firestore e desconexões do SDK.
  - **NÃO** alterar a lógica de verificação de permissões, papéis (`SAAS_ADMIN`, `OWNER`, `LOJISTA`) ou redirecionamento de rotas.
  - Em caso de falha na cota do Firestore, o sistema deve utilizar fallbacks locais/SaaS sem deslogar ou bloquear o usuário.

### 2. Módulo Financeiro e Fluxo de Caixa (`Finance.tsx`, APIs Financeiras)
- **Status**: **BLINDADO**
- **Regras**:
  - As rotinas de cálculo de receitas, despesas, saldos, extratos e conciliação de faturamento do lojista e SaaS devem ser mantidas intactas.
  - Nenhuma refatoração global pode modificar os tipos ou cálculos do módulo financeiro.

### 3. Protocolo de Bloqueio ("TRAVAR")
- Sempre que o usuário enviar o comando **`TRAVAR`** acompanhado do nome de uma funcionalidade/módulo:
  - Essa área deve ser registrada como **CÓDIGO INTOCÁVEL/CONGELADO**.
  - Futuras alterações em outras telas, componentes ou APIs **JAMAIS** devem modificar, simplificar ou sobreescrever funções ou rotas pertencentes aos módulos travados.

### 4. Tolerância a Falhas do Firestore (Quota Limit / Network Errors)
- Erros de cota do Firestore (`Quota limit exceeded`) ou falhas internas de asserção do SDK (`INTERNAL ASSERTION FAILED`) devem ser capturados silenciosamente com alertas no console/UI amigável, sem crashar a aplicação ou interromper fluxos do usuário.
