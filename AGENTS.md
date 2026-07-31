# Diretrizes e Regras de Estabilidade do Projeto (KitchenFlow)

## Proteção de Funcionalidades Existentes
Para garantir a integridade do sistema, as seguintes áreas e módulos que já foram desenvolvidos e testados **NÃO DEVEM SER ALTERADOS** a menos que o usuário peça expressamente uma modificação direta nessas partes:

1. **Autenticação & Login**:
   - Fluxo de login, permissões, troca de operador e perfis de acesso.
2. **Fechamento de Mesas e Pedidos**:
   - Divisão de conta por itens com seleção de quantidade fracionada/individual por pessoa.
   - Cálculo de saldos restantes, troco, formas de pagamento parciais e atualização de status da mesa.
3. **Fechamento de Caixa & Operação Financeira**:
   - Abertura, suprimento, sangria e fechamento de caixa diário.
4. **KDS & Monitor de Pedidos**:
   - Visualização de itens e categorias no KDS, layout de preparo e checklists de cozinha.

## Regra de Escopo
- Alterações futuras devem ser estritamente focadas apenas na solicitação pontual do usuário.
- Nenhuma regressão ou refatoração indesejada deve afetar os fluxos maduros acima.
