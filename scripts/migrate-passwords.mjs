/**
 * scripts/migrate-passwords.mjs
 *
 * Correção de segurança: senhas de usuários/entregadores eram gravadas em
 * texto puro no Firestore (coleções "users" e "couriers"). O servidor já
 * foi corrigido para gravar hashes bcrypt a partir de agora, e migra
 * automaticamente uma conta para hash na próxima vez que ela fizer login
 * com sucesso — mas isso significa que contas que não fizerem login tão
 * cedo continuam com a senha em texto puro até lá.
 *
 * Este script varre as duas coleções uma única vez e converte qualquer
 * senha que ainda esteja em texto puro para um hash bcrypt, sem esperar
 * o login de cada usuário. É seguro rodar mais de uma vez: ele pula
 * qualquer senha que já esteja em formato de hash bcrypt.
 *
 * Como rodar:
 *   1. npm install
 *   2. Configure as credenciais do Admin SDK do Firebase no ambiente,
 *      como já é feito para rodar o server.ts (mesmo projeto/credenciais).
 *   3. node scripts/migrate-passwords.mjs
 *   4. Revise o resumo impresso no final.
 *
 * IMPORTANTE: faça backup/export da coleção antes de rodar em produção,
 * e rode primeiro contra um projeto de teste/emulador se possível.
 */

import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import bcrypt from "bcryptjs";

const BCRYPT_HASH_REGEX = /^\$2[aby]?\$\d{2}\$/;

function isBcryptHash(value) {
  return typeof value === "string" && BCRYPT_HASH_REGEX.test(value);
}

async function migrateCollection(db, collectionName) {
  const snapshot = await db.collection(collectionName).get();

  let migrated = 0;
  let alreadyHashed = 0;
  let skippedNoPassword = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const currentPassword = data.password;

    if (!currentPassword || typeof currentPassword !== "string") {
      skippedNoPassword++;
      continue;
    }

    if (isBcryptHash(currentPassword)) {
      alreadyHashed++;
      continue;
    }

    try {
      const hashed = await bcrypt.hash(currentPassword, 12);
      await docSnap.ref.update({ password: hashed });
      migrated++;
      console.log(`  [OK] ${collectionName}/${docSnap.id} migrado para hash.`);
    } catch (err) {
      failed++;
      console.error(`  [ERRO] ${collectionName}/${docSnap.id}:`, err.message || err);
    }
  }

  return { collectionName, total: snapshot.size, migrated, alreadyHashed, skippedNoPassword, failed };
}

async function main() {
  if (!getApps().length) {
    initializeApp();
  }

  const db = getFirestore();

  console.log("Iniciando migração de senhas em texto puro para hash bcrypt...\n");

  const results = [];
  for (const collectionName of ["users", "couriers"]) {
    console.log(`Processando coleção "${collectionName}"...`);
    const result = await migrateCollection(db, collectionName);
    results.push(result);
    console.log("");
  }

  console.log("=== Resumo da migração ===");
  for (const r of results) {
    console.log(
      `${r.collectionName}: ${r.total} documentos | ` +
      `${r.migrated} migrados agora | ` +
      `${r.alreadyHashed} já estavam em hash | ` +
      `${r.skippedNoPassword} sem campo de senha | ` +
      `${r.failed} falharam`
    );
  }

  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  if (totalFailed > 0) {
    console.warn(`\nAtenção: ${totalFailed} documento(s) falharam ao migrar. Revise os erros acima.`);
    process.exitCode = 1;
  } else {
    console.log("\nMigração concluída sem erros.");
  }
}

main().catch((err) => {
  console.error("Falha geral na migração:", err);
  process.exitCode = 1;
});
