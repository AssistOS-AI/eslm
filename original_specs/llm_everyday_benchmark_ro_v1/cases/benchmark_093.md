# Benchmark LLM — Set 093

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-093-01`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Ședința de luni a fost mutată marți la aceeași oră.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Ședința a fost reprogramată pentru marți.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 2 — `RO-093-02`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Dă-mi acces la fișier.”

### Răspuns de referință (obligatoriu în benchmark)

Te rog să îmi acorzi acces la fișier.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 3 — `RO-093-03`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 66 de pagini și a citit 49. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

17

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 17.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-093-04`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este o estimare.

### Răspuns de referință (obligatoriu în benchmark)

Este o aproximare informată a unei valori, durate sau cantități necunoscute exact.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 5 — `RO-093-05`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „unde mergi”

### Răspuns de referință (obligatoriu în benchmark)

Unde mergi?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 6 — `RO-093-06`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau un șablon pentru o excursie de trei zile cu patru prieteni. Avem o mașină și vrem o zi în natură, o zi într-un oraș și o jumătate de zi foarte relaxată. Unul dintre noi obosește ușor la mers și nu vrem trasee dificile. Vrem cel puțin două ore libere în fiecare zi. Plecăm vineri dimineață și ne întoarcem duminică seara.

Construiește un itinerar generic, pe intervale aproximative, și un plan de rezervă pentru ploaie în ziua de natură. Nu inventa un oraș sau o destinație concretă. Maximum 700 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

**Vineri — zi urbană ușoară.** Plecare dimineața și sosire în jurul prânzului. După cazare, păstrați timp pentru prânz și acomodare. După-amiaza poate include o zonă centrală compactă și o singură atracție principală. Rezervați apoi cel puțin două ore complet libere înainte de cină.

**Sâmbătă — natură fără trasee dificile.** Alegeți o zonă accesibilă cu mașina și un traseu scurt, relativ plat, sau mai multe puncte panoramice legate prin deplasări scurte. Planificați aproximativ două ore de activitate înainte de prânz, o pauză lungă și cel mult încă o activitate ușoară. După întoarcere, păstrați minimum două ore libere.

**Plan de ploaie.** Înlocuiți traseul cu o activitate interioară cu mers redus: muzeu, centru de vizitare sau spațiu cultural. Dacă vremea permite, se poate adăuga o deplasare scenică cu opriri foarte scurte.

**Duminică — jumătate de zi relaxată.** Mic dejun târziu, timp individual și cel mult o activitate opțională aproape de punctul de plecare. Plecați suficient de devreme pentru o întoarcere fără presiune.

Principiul general este o activitate principală și una opțională pe zi, astfel încât pauzele să poată fi extinse fără a strica programul.

Șablonul ar trebui adaptat în dimineața fiecărei zile după energie și vreme. Dacă membrul care obosește ușor are nevoie de o pauză mai lungă, eliminați activitatea opțională, nu pauza. De asemenea, deplasările cu mașina trebuie privite ca parte din program, nu ca timp „gratuit”. Un itinerar reușit aici este cel care păstrează spațiu de decizie, nu cel care maximizează numărul de obiective bifate.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 241–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 7 — `RO-093-07`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Propune un titlu pentru un club de lectură de weekend.

### Răspuns de referință (obligatoriu în benchmark)

Pagini de Weekend

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 8 — `RO-093-08`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Croației?

### Răspuns de referință (obligatoriu în benchmark)

Zagreb

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Zagreb.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-093-09`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce element are simbolul O?

### Răspuns de referință (obligatoriu în benchmark)

Oxigen

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Oxigen.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-093-10`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 67 de pagini și a citit 12. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

55

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 55.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
