# Benchmark LLM — Set 065

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-065-01`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „bună ziua domnule popescu”

### Răspuns de referință (obligatoriu în benchmark)

Bună ziua, domnule Popescu.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 2 — `RO-065-02`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Cât costă biletul?”

### Răspuns de referință (obligatoriu în benchmark)

How much does the ticket cost?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 3 — `RO-065-03`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 8 persoane și fiecare primește câte 5 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

40

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 40.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-065-04`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Uit des unde pun cheile. Răspunde concis.

### Răspuns de referință (obligatoriu în benchmark)

Alege un singur loc fix lângă intrare și pune cheile acolo de fiecare dată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 5 — `RO-065-05`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 5 persoane și fiecare primește câte 4 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-065-06`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Biroul este la etajul doi.”

### Răspuns de referință (obligatoriu în benchmark)

The office is on the second floor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 7 — `RO-065-07`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Echipa a încheiat testarea și pregătește lansarea de vineri.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Testare finalizată înainte de lansare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 8 — `RO-065-08`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce element are simbolul Au?

### Răspuns de referință (obligatoriu în benchmark)

Aur

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Aur.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-065-09`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Aplicația se închide când o deschid.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

problemă tehnică

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** problemă tehnică.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-065-10`

**Categorie:** `comparare_opțiuni`  
**Domeniu:** `decizie`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Trebuie să aleg între două variante pentru un workshop intern de o zi. Varianta A costă 460 lei de persoană, include sala, prânzul și echipamentul, dar necesită deplasare de 40 de minute. Varianta B costă 300 lei de persoană, este la birou și nu necesită deplasare, dar echipa trebuie să organizeze separat prânzul și materialele. Avem 12 participanți și vrem să reducem efortul de organizare mai mult decât costul.

Compară opțiunile în 120–220 de cuvinte și recomandă una singură. Nu inventa alte costuri.

### Răspuns de referință (obligatoriu în benchmark)

Pentru criteriul declarat — reducerea efortului de organizare — **Varianta A este mai potrivită**. Ea include sala, prânzul și echipamentul, deci elimină activități logistice care ar trebui gestionate separat în Varianta B. Dezavantajele sunt deplasarea de 40 de minute și costul mai mare, de 460 lei de persoană.

Varianta B este mai ieftină, la 300 lei de persoană, și nu cere deplasare. Totuși, echipa trebuie să organizeze prânzul și materialele, iar cerința spune că efortul contează mai mult decât costul.

Aș alege Varianta A, dacă deplasarea este acceptabilă. Nu aș calcula economii suplimentare pentru B deoarece nu au fost furnizate costurile prânzului și materialelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 102–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Varianta A; efort; 460; 300.
- **Variații acceptabile:** Se acceptă o recomandare diferită numai dacă este justificată strict prin criteriile furnizate și fără costuri inventate.
