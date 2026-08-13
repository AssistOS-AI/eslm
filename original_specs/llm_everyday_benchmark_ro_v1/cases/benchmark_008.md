# Benchmark LLM — Set 008

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-008-01`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 8 persoane și fiecare primește câte 5 pahare cu apă. Câte pahare sunt necesare? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

40

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 40.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-008-02`

**Categorie:** `plan_învățare`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau un plan simplu de studiu pentru istorie europeană. Am 6 zile, câte 45 de minute pe zi. Sunt începător și nu vreau să acopăr prea mult. Fiecare zi trebuie să aibă un singur obiectiv principal, o activitate practică și 5 minute de recapitulare. În ultima zi vreau un mic test de autoevaluare.

Fă un plan scurt, concret, de maximum 250 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Planul poate fi:

Ziua 1: un concept de bază din istorie europeană; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 2: un concept de bază din istorie europeană; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 3: un concept de bază din istorie europeană; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 4: un concept de bază din istorie europeană; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 5: un concept de bază din istorie europeană; 25 min studiu, 15 min exercițiu practic, 5 min recapitulare.
Ziua 6: recapitulare și test scurt; 30 min test + corectare, 10 min revizuirea greșelilor, 5 min concluzii.

Păstrează notițele scurte. La finalul fiecărei zile notează un singur punct neclar și verifică-l la începutul zilei următoare. Obiectivul nu este să acoperi tot domeniul, ci să construiești o bază stabilă pentru istorie europeană.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 100–260 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 6; 45; 5 minute; test.
- **Variații acceptabile:** Conținutul zilnic poate varia; sunt obligatorii numărul de zile, limita de timp, recapitularea și testul final.

---

## Exemplul 3 — `RO-008-03`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Scrie o invitație foarte scurtă la o cafea între colegi.

### Răspuns de referință (obligatoriu în benchmark)

Ai timp pentru o cafea după prânz?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 4 — `RO-008-04`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Biblioteca își prelungește programul în perioada examenelor.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Program extins în perioada examenelor

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 5 — `RO-008-05`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 132 ÷ 11? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

12

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-008-06`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 7 kilometri?

### Răspuns de referință (obligatoriu în benchmark)

7000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 7000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-008-07`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Vreau să schimb adresa de livrare.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

livrare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** livrare.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-008-08`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana este mai înalt(ă) decât Vlad, iar Vlad este mai înalt(ă) decât Mihai. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Mihai

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Mihai.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-008-09`

**Categorie:** `factual`  
**Domeniu:** `tehnologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este o copie de siguranță?

### Răspuns de referință (obligatoriu în benchmark)

O copie separată a datelor păstrată pentru recuperare în caz de pierdere sau corupere.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 10 — `RO-008-10`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „cal”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

mamifer

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** mamifer.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
