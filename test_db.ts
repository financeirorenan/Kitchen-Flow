import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as initClientFirestore, doc, getDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initClientApp(config, "test-client-app");
const db = initClientFirestore(app, config.firestoreDatabaseId || "(default)");

async function test() {
  const tenantDoc = await getDoc(doc(db, "tenants", "tenant_tubak"));
  console.log("TENANT DOC EXISTS:", tenantDoc.exists());
  if (tenantDoc.exists()) {
    console.log("TENANT DATA:", tenantDoc.data());
  }
  
  const settingsDoc = await getDoc(doc(db, "settings", "tenant_tubak"));
  console.log("SETTINGS DOC EXISTS:", settingsDoc.exists());
  if (settingsDoc.exists()) {
    console.log("SETTINGS DATA:", settingsDoc.data());
  }
}

test().catch(console.error);
