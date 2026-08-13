# Benchmark LLM — Set 001

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-001-01`

**Categorie:** `factual`  
**Domeniu:** `astronomie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care planetă este numită Planeta Roșie?

### Răspuns de referință (obligatoriu în benchmark)

Marte

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Marte.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-001-02`

**Categorie:** `extracție_structurată`  
**Domeniu:** `documente`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Extrage numai informația explicită și returnează un tabel cu: companie, taxă_lunară, monedă, termen_plată_zile, durată_inițială_luni. Apoi scrie două observații scurte. Dacă un câmp lipsește, scrie „necunoscut”.

Text: „Contractul cu Orion SRL are o durată inițială de 18 luni. Taxa lunară este de 1700 EUR. Facturile se plătesc în maximum 25 zile de la emitere. Fragmentul nu precizează nimic despre reînnoire.”

### Răspuns de referință (obligatoriu în benchmark)

| Câmp | Valoare |
|---|---|
| companie | Orion SRL |
| taxă_lunară | 1700 |
| monedă | EUR |
| termen_plată_zile | 25 |
| durată_inițială_luni | 18 |

Observații: fragmentul nu oferă informații despre reînnoire. Valorile din tabel sunt extrase direct din text, fără interpretarea validității juridice a clauzelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 34–150 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Orion; 1700; EUR; 25; 18.
- **Variații acceptabile:** Ordinea observațiilor poate varia; valorile extrase trebuie să fie exacte.

---

## Exemplul 3 — `RO-001-03`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 2, 5, 8, 11, ...

### Răspuns de referință (obligatoriu în benchmark)

14

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 14.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-001-04`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 67 este par? Răspunde doar cu „da” sau „nu”. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

nu

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** nu.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-001-05`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 36 ÷ 12?

### Răspuns de referință (obligatoriu în benchmark)

3

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 3.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-001-06`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Factura din luna aceasta este prea mare.”

### Răspuns de referință (obligatoriu în benchmark)

facturare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** facturare.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-001-07`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Vrei să spui că nu ești sigur de o informație.

### Răspuns de referință (obligatoriu în benchmark)

Nu sunt sigur de această informație; ar trebui să o verificăm înainte de a o folosi.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 8 — `RO-001-08`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Nu uita documentele.”

### Răspuns de referință (obligatoriu în benchmark)

Do not forget the documents.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 9 — `RO-001-09`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Produsul a ajuns stricat și sunt dezamăgit.”

### Răspuns de referință (obligatoriu în benchmark)

negativ

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** negativ.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-001-10`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este condensarea?

### Răspuns de referință (obligatoriu în benchmark)

Transformarea unui gaz sau vapor în lichid.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.
