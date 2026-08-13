# Benchmark LLM — Set 033

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-033-01`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 5, 7, 9, 11, ...

### Răspuns de referință (obligatoriu în benchmark)

13

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 13.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-033-02`

**Categorie:** `comparare_opțiuni`  
**Domeniu:** `decizie`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Trebuie să aleg între două variante pentru un workshop intern de o zi. Varianta A costă 420 lei de persoană, include sala, prânzul și echipamentul, dar necesită deplasare de 40 de minute. Varianta B costă 270 lei de persoană, este la birou și nu necesită deplasare, dar echipa trebuie să organizeze separat prânzul și materialele. Avem 12 participanți și vrem să reducem efortul de organizare mai mult decât costul.

Compară opțiunile în 120–220 de cuvinte și recomandă una singură. Nu inventa alte costuri.

### Răspuns de referință (obligatoriu în benchmark)

Pentru criteriul declarat — reducerea efortului de organizare — **Varianta A este mai potrivită**. Ea include sala, prânzul și echipamentul, deci elimină activități logistice care ar trebui gestionate separat în Varianta B. Dezavantajele sunt deplasarea de 40 de minute și costul mai mare, de 420 lei de persoană.

Varianta B este mai ieftină, la 270 lei de persoană, și nu cere deplasare. Totuși, echipa trebuie să organizeze prânzul și materialele, iar cerința spune că efortul contează mai mult decât costul.

Aș alege Varianta A, dacă deplasarea este acceptabilă. Nu aș calcula economii suplimentare pentru B deoarece nu au fost furnizate costurile prânzului și materialelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 102–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Varianta A; efort; 420; 270.
- **Variații acceptabile:** Se acceptă o recomandare diferită numai dacă este justificată strict prin criteriile furnizate și fără costuri inventate.

---

## Exemplul 3 — `RO-033-03`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 2 × 12? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

24

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 24.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-033-04`

**Categorie:** `factual`  
**Domeniu:** `civică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce înseamnă separația puterilor?

### Răspuns de referință (obligatoriu în benchmark)

Distribuirea funcțiilor statului între ramuri distincte, de regulă legislativă, executivă și judecătorească.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 5 — `RO-033-05`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 5 × 3?

### Răspuns de referință (obligatoriu în benchmark)

15

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 15.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-033-06`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Vreau să-mi schimb adresa de e-mail.”

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-033-07`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Raportul este 8:6. Dacă primul termen devine 40, care trebuie să fie al doilea?

### Răspuns de referință (obligatoriu în benchmark)

30

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 30.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-033-08`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 44 - 34?

### Răspuns de referință (obligatoriu în benchmark)

10

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 10.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-033-09`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Cursul începe în septembrie și înscrierile se închid la finalul lui august.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Înscrierile se închid la final de august; cursul începe în septembrie.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 10 — `RO-033-10`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Andrei este mai înalt(ă) decât Radu, iar Radu este mai înalt(ă) decât Vlad. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Vlad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Vlad.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
