# Benchmark LLM — Set 069

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-069-01`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Cum resetez parola contului?” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-069-02`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 16 + 2?

### Răspuns de referință (obligatoriu în benchmark)

18

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 18.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-069-03`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Radu este mai înalt(ă) decât Paul, iar Paul este mai înalt(ă) decât Maria. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Maria

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Maria.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-069-04`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 12:00 și durează 3 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

15:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 15:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-069-05`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cum se numește schimbarea din solid în lichid?

### Răspuns de referință (obligatoriu în benchmark)

Topire

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Topire.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-069-06`

**Categorie:** `factual`  
**Domeniu:** `muzică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câte taste are în mod obișnuit un pian modern standard?

### Răspuns de referință (obligatoriu în benchmark)

88

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 88.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-069-07`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Paul este mai înalt(ă) decât Mihai, iar Mihai este mai înalt(ă) decât Ana. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Ana

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Ana.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-069-08`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Mihai Rusu are 47 de ani și locuiește în București.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Mihai Rusu, 47 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Mihai; Rusu; 47.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 9 — `RO-069-09`

**Categorie:** `plan_învățare`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau un plan simplu de studiu pentru economie de bază. Am 7 zile, câte 45 de minute pe zi. Sunt începător și nu vreau să acopăr prea mult. Fiecare zi trebuie să aibă un singur obiectiv principal, o activitate practică și 5 minute de recapitulare. În ultima zi vreau un mic test de autoevaluare.

Fă un plan scurt, concret, de maximum 250 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Planul poate fi:

Ziua 1: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 2: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 3: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 4: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 5: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 6: un concept de bază din economie de bază; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 7: recapitulare și test scurt; 30 min test + corectare, 10 min revizuirea greșelilor, 5 min concluzii.

Păstrează notițele scurte. La finalul fiecărei zile notează un singur punct neclar și verifică-l la începutul zilei următoare. Obiectivul nu este să acoperi tot domeniul, ci să construiești o bază stabilă pentru economie de bază.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 100–260 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 7; 45; 5 minute; test.
- **Variații acceptabile:** Conținutul zilnic poate varia; sunt obligatorii numărul de zile, limita de timp, recapitularea și testul final.

---

## Exemplul 10 — `RO-069-10`

**Categorie:** `factual`  
**Domeniu:** `tehnologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este o bază de date?

### Răspuns de referință (obligatoriu în benchmark)

Un sistem organizat pentru stocarea și regăsirea datelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–16 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.
