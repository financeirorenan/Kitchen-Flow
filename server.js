/**
 * Arquivo de Entrada para Hospedagem Node.js (ex: Hostinger, cPanel)
 * 
 * Este arquivo resolve a inicialização em ambientes que buscam por "server.js" na raiz do projeto.
 * Ele inicia o servidor compilado e otimizado localizado em "./dist/server.cjs".
 */

// Define o ambiente de produção como padrão
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

// Inicializa o servidor principal compilado
require('./dist/server.cjs');
