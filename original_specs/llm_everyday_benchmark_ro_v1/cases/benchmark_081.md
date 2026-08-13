# Benchmark LLM — Set 081

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-081-01`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 17 kilometri?

### Răspuns de referință (obligatoriu în benchmark)

17000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 17000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-081-02`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am o oră liberă și trei sarcini mici. Ce ai face mai întâi?

### Răspuns de referință (obligatoriu în benchmark)

Estimează durata, începe cu cea mai importantă și lasă câteva minute pentru verificare.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 3 — `RO-081-03`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Chinei?

### Răspuns de referință (obligatoriu în benchmark)

Beijing

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Beijing.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-081-04`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Sunt 6 cutii cu câte 4 obiecte. Câte obiecte sunt în total?

### Răspuns de referință (obligatoriu în benchmark)

24

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 24.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-081-05`

**Categorie:** `comparare_opțiuni`  
**Domeniu:** `decizie`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Trebuie să aleg între două variante pentru un workshop intern de o zi. Varianta A costă 360 lei de persoană, include sala, prânzul și echipamentul, dar necesită deplasare de 40 de minute. Varianta B costă 225 lei de persoană, este la birou și nu necesită deplasare, dar echipa trebuie să organizeze separat prânzul și materialele. Avem 12 participanți și vrem să reducem efortul de organizare mai mult decât costul.

Compară opțiunile în 120–220 de cuvinte și recomandă una singură. Nu inventa alte costuri.

### Răspuns de referință (obligatoriu în benchmark)

Pentru criteriul declarat — reducerea efortului de organizare — **Varianta A este mai potrivită**. Ea include sala, prânzul și echipamentul, deci elimină activități logistice care ar trebui gestionate separat în Varianta B. Dezavantajele sunt deplasarea de 40 de minute și costul mai mare, de 360 lei de persoană.

Varianta B este mai ieftină, la 225 lei de persoană, și nu cere deplasare. Totuși, echipa trebuie să organizeze prânzul și materialele, iar cerința spune că efortul contează mai mult decât costul.

Aș alege Varianta A, dacă deplasarea este acceptabilă. Nu aș calcula economii suplimentare pentru B deoarece nu au fost furnizate costurile prânzului și materialelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 102–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Varianta A; efort; 360; 225.
- **Variații acceptabile:** Se acceptă o recomandare diferită numai dacă este justificată strict prin criteriile furnizate și fără costuri inventate.

---

## Exemplul 6 — `RO-081-06`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Slovaciei?

### Răspuns de referință (obligatoriu în benchmark)

Bratislava

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Bratislava.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-081-07`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un sinonim potrivit pentru „mic”.

### Răspuns de referință (obligatoriu în benchmark)

redus

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice sinonim corect în context general.

---

## Exemplul 8 — `RO-081-08`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Sunt 9 cutii cu câte 8 obiecte. Câte obiecte sunt în total?

### Răspuns de referință (obligatoriu în benchmark)

72

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 72.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-081-09`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La aproximativ ce temperatură fierbe apa la nivelul mării?

### Răspuns de referință (obligatoriu în benchmark)

100 °C

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–10 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 100 °C.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-081-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The answer is correct.”

### Răspuns de referință (obligatoriu în benchmark)

Răspunsul este corect.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
