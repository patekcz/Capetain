# Capetain - Synchronizace Cape Textur

Tento adresář obsahuje automatický systém pro synchronizaci cape textur s externím API.

## Workflow

Soubor `.github/workflows/sync-capes.yml` definuje GitHub Actions workflow, který:

1. Spouští se každých 12 hodin automaticky
2. Lze ho spustit také manuálně přes GitHub rozhraní
3. Stahuje data z API endpoint `qverlix.serv.nu:3004/api`
4. Zpracovává data a aktualizuje soubor `users.json`
5. Stahuje textury cape a ukládá je do správných adresářů
6. Commituje a pushuje změny do repozitáře

## Implementace

Synchronizační skript je implementován v JavaScriptu (Node.js) a využívá následující knihovny:
- `node-fetch` pro HTTP požadavky
- `fs-extra` pro práci se souborovým systémem

## Struktura

Textury cape jsou organizovány podle typu:

- `api/capes/custom/` - vlastní cape textury
- `api/capes/premium/` - prémiové cape textury
- `api/capes/free/` - základní cape textury

## Spuštění manuálně

Pro manuální spuštění synchronizace:

1. Jděte na záložku "Actions" v GitHub repozitáři
2. Vyberte workflow "Synchronize Capes"
3. Klikněte na "Run workflow"
4. Potvrďte spuštění kliknutím na zelené tlačítko

## Řešení problémů

Pokud synchronizace selže:

1. Zkontrolujte, zda je API dostupné
2. Zkontrolujte logy v GitHub Actions pro detailní informace o chybě
3. Ověřte, zda má GitHub Actions workflow dostatečná oprávnění pro push změn 