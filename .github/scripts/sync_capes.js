#!/usr/bin/env node

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// ESM nemá __dirname, je potřeba ho simulovat
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konstanty
const API_URL = "http://qverlix.serv.nu:3004/api";
const REPO_URL = "https://raw.githubusercontent.com/patekcz/Capetain/main/api/capes";
const BASE_DIR = path.resolve(__dirname, '..', '..');
const CAPES_DIR = path.join(BASE_DIR, 'api', 'capes');
const USERS_JSON_PATH = path.join(BASE_DIR, 'api', 'users.json');

// Vytvoření potřebných adresářů
const CUSTOM_DIR = path.join(CAPES_DIR, 'custom');
const PREMIUM_DIR = path.join(CAPES_DIR, 'premium');
const FREE_DIR = path.join(CAPES_DIR, 'free');

// Zajištění existence adresářů
[CUSTOM_DIR, PREMIUM_DIR, FREE_DIR].forEach(dir => {
  fs.ensureDirSync(dir);
});

/**
 * Získá data uživatelů z API
 * @returns {Promise<Object>} Data uživatelů
 */
async function fetchUserData() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      return await response.json();
    } else {
      console.error(`Chyba při získávání dat: ${response.status}`);
      return {};
    }
  } catch (e) {
    console.error(`Chyba při komunikaci s API: ${e.message}`);
    return {};
  }
}

/**
 * Stáhne texturu cape podle ID
 * @param {string} capeId ID cape textury
 * @returns {Promise<Buffer|null>} Buffer s obsahem cape textury nebo null
 */
async function downloadCape(capeId) {
  try {
    const response = await fetch(`${API_URL}/cape/${capeId}`);
    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    } else {
      console.error(`Chyba při stahování cape ${capeId}: ${response.status}`);
      return null;
    }
  } catch (e) {
    console.error(`Chyba při stahování cape ${capeId}: ${e.message}`);
    return null;
  }
}

/**
 * Hlavní funkce pro synchronizaci
 */
async function main() {
  // Načtení aktuálního users.json, pokud existuje
  let currentUsers = {};
  if (fs.existsSync(USERS_JSON_PATH)) {
    try {
      currentUsers = JSON.parse(fs.readFileSync(USERS_JSON_PATH, 'utf8'));
      console.log(`Načteno ${Object.keys(currentUsers).length} existujících uživatelů z users.json`);
    } catch (e) {
      console.error(`Chyba při načítání users.json: ${e.message}`);
    }
  }
  
  // Získání dat z API
  const userData = await fetchUserData();
  
  if (!userData || Object.keys(userData).length === 0) {
    console.error("Nepodařilo se získat data z API. Zachovávám existující data.");
    // Pokud API není dostupné, ukončíme proces, ale zachováme existující data
    console.log("Synchronizace ukončena - zachovány existující data.");
    return;
  }
  
  // Aktualizace users.json - zachováme stávající data jako základ
  const newUsers = { ...currentUsers };
  
  // Zpracování uživatelů postupně, jeden po druhém
  for (const [username, info] of Object.entries(userData)) {
    // Očekávaný formát: {"patek_cz":{"id":"custom_0","custom":true}}
    const capeId = info.id || "";
    
    if (!capeId) {
      console.error(`Uživatel ${username} nemá platné ID cape.`);
      continue;
    }
    
    // Určení typu cape podle příznaku
    const capeType = info.custom ? "custom" : 
                     capeId.startsWith("premium_") ? "premium" : "free";
    
    // Sestavení cesty a URL
    const capeTargetPath = path.join(capeType, `${capeId}.png`);
    const capeUrl = `${REPO_URL}/${capeType}/${capeId}.png`;
    
    // Cílový soubor pro cape texturu
    const targetDir = path.join(CAPES_DIR, capeType);
    fs.ensureDirSync(targetDir);
    const targetPath = path.join(targetDir, `${capeId}.png`);
    
    // Kontrola, zda již cape textura existuje
    const capeExists = fs.existsSync(targetPath);
    
    // Stáhneme pouze pokud cape ještě neexistuje nebo chceme aktualizovat
    if (!capeExists) {
      console.log(`Stahuji cape pro uživatele ${username} (ID: ${capeId})`);
      const capeContent = await downloadCape(capeId);
      
      if (capeContent) {
        // Uložení cape do správného adresáře
        fs.writeFileSync(targetPath, capeContent);
        console.log(`Cape pro uživatele ${username} úspěšně uložena`);
      } else {
        console.error(`Nepodařilo se stáhnout cape pro uživatele ${username}`);
        // Pokud cape nejde stáhnout a máme již existující URL, zachováme ho
        if (currentUsers[username]) {
          console.log(`Zachovávám existující záznam pro uživatele ${username}`);
          newUsers[username] = currentUsers[username];
          continue;
        }
      }
    } else {
      console.log(`Cape pro uživatele ${username} již existuje, přeskakuji stahování`);
    }
    
    // Přidání do slovníku - vždy aktualizujeme URL
    newUsers[username] = capeUrl;
  }
  
  // Logování změn
  const addedUsers = Object.keys(newUsers).filter(user => !currentUsers[user]);
  const updatedUsers = Object.keys(newUsers).filter(user => currentUsers[user] && currentUsers[user] !== newUsers[user]);
  const unchangedUsers = Object.keys(newUsers).filter(user => currentUsers[user] && currentUsers[user] === newUsers[user]);
  
  console.log(`Přidáno nových uživatelů: ${addedUsers.length}`);
  console.log(`Aktualizováno uživatelů: ${updatedUsers.length}`);
  console.log(`Nezměněno uživatelů: ${unchangedUsers.length}`);
  
  // Uložení aktualizovaného users.json
  fs.writeFileSync(USERS_JSON_PATH, JSON.stringify(newUsers, null, 4));
  
  console.log("Synchronizace dokončena.");
}

main().catch(error => {
  console.error(`Chyba při synchronizaci: ${error.message}`);
  process.exit(1);
}); 