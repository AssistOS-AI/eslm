# Benchmark LLM — Set 072

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-072-01`

**Categorie:** `plan_învățare`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau un plan simplu de studiu pentru psihologie introductivă. Am 5 zile, câte 45 de minute pe zi. Sunt începător și nu vreau să acopăr prea mult. Fiecare zi trebuie să aibă un singur obiectiv principal, o activitate practică și 5 minute de recapitulare. În ultima zi vreau un mic test de autoevaluare.

Fă un plan scurt, concret, de maximum 250 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Planul poate fi:

Ziua 1: un concept de bază din psihologie introductivă; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 2: un concept de bază din psihologie introductivă; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 3: un concept de bază din psihologie introductivă; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 4: un concept de bază din psihologie introductivă; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 5: recapitulare și test scurt; 30 min test + corectare, 10 min revizuirea greșelilor, 5 min concluzii.

Păstrează notițele scurte. La finalul fiecărei zile notează un singur punct neclar și verifică-l la începutul zilei următoare. Obiectivul nu este să acoperi tot domeniul, ci să construiești o bază stabilă pentru psihologie introductivă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 100–260 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 5; 45; 5 minute; test.
- **Variații acceptabile:** Conținutul zilnic poate varia; sunt obligatorii numărul de zile, limita de timp, recapitularea și testul final.

---

## Exemplul 2 — `RO-072-02`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 5% din 400?

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-072-03`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 3 persoane și fiecare primește câte 7 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

21

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 21.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-072-04`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 30 este par? Răspunde doar cu „da” sau „nu”. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-072-05`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Când ajunge coletul?”

### Răspuns de referință (obligatoriu în benchmark)

livrare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** livrare.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-072-06`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un antonim potrivit pentru „ordine”.

### Răspuns de referință (obligatoriu în benchmark)

dezordine

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice antonim corect în context general.

---

## Exemplul 7 — `RO-072-07`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Spaniei?

### Răspuns de referință (obligatoriu în benchmark)

Madrid

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Madrid.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-072-08`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un atom?

### Răspuns de referință (obligatoriu în benchmark)

Cea mai mică unitate a unui element care îi păstrează proprietățile chimice.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 9 — `RO-072-09`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 96 ÷ 8?

### Răspuns de referință (obligatoriu în benchmark)

12

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-072-10`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Paul este mai înalt(ă) decât Ioana, iar Ioana este mai înalt(ă) decât Vlad. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Vlad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Vlad.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
