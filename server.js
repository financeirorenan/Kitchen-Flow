/**
 * Entry Point de Inicialização para Hospedagem Node.js (ex: Hostinger, cPanel, Heroku, Render)
 * 
 * Este arquivo resolve a inicialização do servidor em ambientes que buscam pelo arquivo
 * "server.js" por padrão na raiz do projeto. Ele carrega a build otimizada e compilada
 * em CommonJS localizada em "./dist/server.cjs".
 */

// Garantir que o ambiente de produção esteja sendo carregado de forma limpa
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Inicializar o servidor compilado do KitchenFlow AI
require('./dist/server.cjs');
