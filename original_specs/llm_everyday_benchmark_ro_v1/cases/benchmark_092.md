# Benchmark LLM — Set 092

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-092-01`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 3, 8, 13, 18, ...

### Răspuns de referință (obligatoriu în benchmark)

23

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 23.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-092-02`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Sunt 5 cutii cu câte 4 obiecte. Câte obiecte sunt în total?

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-092-03`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Ședința a fost mutată la ora 15.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-092-04`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Magazinul va fi închis luni pentru inventar și se redeschide marți.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Magazin închis luni pentru inventar, redeschis marți.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 5 — `RO-092-05`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Trei manageri discută introducerea unei zile pe săptămână fără ședințe. A spune că ar ajuta munca neîntreruptă, dar se teme că urgențele vor fi amânate. B susține ideea dacă există excepții pentru incidente și clienți importanți, dar nu vrea ca toate ședințele să fie mutate a doua zi. C spune că o regulă generală nu se potrivește tuturor: suportul are nevoie de coordonare zilnică, dar echipele de analiză ar beneficia mult.

Scrie o sinteză neutră, identifică acordurile și dezacordurile și propune un pilot de patru săptămâni. Definește maximum patru metrici simple. Nu prezenta pilotul ca fiind garantat eficient. Maximum 750 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Cele trei opinii au un punct comun: există o tensiune între **timpul neîntrerupt pentru lucru** și **nevoia de coordonare rapidă**.

**Acorduri.** A și B acceptă ideea de concentrare fără ședințe, dar cer protecție pentru urgențe. C adaugă faptul că nevoia diferă între echipe. Toți trei oferă motive pentru a evita o regulă absolută.

**Dezacordul principal** privește cât de uniformă trebuie să fie politica. C cere adaptare la tipul echipei, iar B atrage atenția că simpla mutare a ședințelor în ziua următoare nu ar reprezenta o îmbunătățire reală.

**Pilot de patru săptămâni:** o zi pe săptămână cu regula implicită „fără ședințe programate”, dar cu excepții pentru incidente, situații urgente cu clienți și coordonări scurte obligatorii în echipe precum suportul. Organizatorii trebuie să revizuiască întâlnirile și să decidă dacă pot fi anulate, scurtate, asincronizate sau mutate, nu transferate automat în ziua următoare.

Metrici: 1) ore totale de ședință/persoană/săptămână; 2) numărul ședințelor mutate în ziua următoare; 3) autoevaluarea timpului de lucru neîntrerupt; 4) incidente sau probleme urgente raportate ca întârziate.

La final, rezultatele trebuie discutate separat pe tipuri de echipe. Pilotul produce date; nu garantează că regula este utilă.

Pentru ca pilotul să fie interpretabil, regula trebuie comunicată înainte de început și păstrată relativ stabilă în cele patru săptămâni. Dacă excepțiile se schimbă în fiecare săptămână, rezultatele devin greu de comparat. După pilot, decizia poate fi diferită pe echipe: aceeași politică poate avea efect pozitiv pentru analiză și efect neutru sau negativ pentru suport. Această diferență ar fi un rezultat valid, nu un eșec al experimentului.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 255–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 6 — `RO-092-06`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Suediei?

### Răspuns de referință (obligatoriu în benchmark)

Stockholm

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Stockholm.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-092-07`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este media aritmetică.

### Răspuns de referință (obligatoriu în benchmark)

Este suma valorilor împărțită la numărul lor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 7–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 8 — `RO-092-08`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 11 kilometri? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

11000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 11000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-092-09`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The train is late.”

### Răspuns de referință (obligatoriu în benchmark)

Trenul are întârziere.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 10 — `RO-092-10`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 6 × 12?

### Răspuns de referință (obligatoriu în benchmark)

72

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 72.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
