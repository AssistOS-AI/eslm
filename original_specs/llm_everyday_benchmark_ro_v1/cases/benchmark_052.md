# Benchmark LLM — Set 052

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-052-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 42 ÷ 6?

### Răspuns de referință (obligatoriu în benchmark)

7

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 7.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-052-02`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este media numerelor 2, 4 și 18?

### Răspuns de referință (obligatoriu în benchmark)

8

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 8.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-052-03`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „mulțumesc maria”

### Răspuns de referință (obligatoriu în benchmark)

Mulțumesc, Maria.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 4 — `RO-052-04`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 10:00 și durează 2 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

12:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-052-05`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Vlad Stan are 46 de ani și locuiește în Timișoara.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Vlad Stan, 46 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Vlad; Stan; 46.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 6 — `RO-052-06`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câte ore sunt în 240 de minute? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

4 ore

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 4.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-052-07`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Costurile logistice au crescut în trimestrul curent.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Creșterea costurilor logistice

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 8 — `RO-052-08`

**Categorie:** `factual`  
**Domeniu:** `artă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este perspectiva în desen?

### Răspuns de referință (obligatoriu în benchmark)

Un ansamblu de tehnici pentru reprezentarea impresiei de adâncime pe o suprafață plană.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–21 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 9 — `RO-052-09`

**Categorie:** `plan_învățare`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau un plan simplu de studiu pentru statistică de bază. Am 5 zile, câte 45 de minute pe zi. Sunt începător și nu vreau să acopăr prea mult. Fiecare zi trebuie să aibă un singur obiectiv principal, o activitate practică și 5 minute de recapitulare. În ultima zi vreau un mic test de autoevaluare.

Fă un plan scurt, concret, de maximum 250 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Planul poate fi:

Ziua 1: un concept de bază din statistică de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 2: un concept de bază din statistică de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 3: un concept de bază din statistică de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 4: un concept de bază din statistică de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 5: recapitulare și test scurt; 30 min test + corectare, 10 min revizuirea greșelilor, 5 min concluzii.

Păstrează notițele scurte. La finalul fiecărei zile notează un singur punct neclar și verifică-l la începutul zilei următoare. Obiectivul nu este să acoperi tot domeniul, ci să construiești o bază stabilă pentru statistică de bază.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 100–260 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 5; 45; 5 minute; test.
- **Variații acceptabile:** Conținutul zilnic poate varia; sunt obligatorii numărul de zile, limita de timp, recapitularea și testul final.

---

## Exemplul 10 — `RO-052-10`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este formula chimică a apei?

### Răspuns de referință (obligatoriu în benchmark)

H₂O

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** H₂O.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
