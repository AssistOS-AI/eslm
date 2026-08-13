# Benchmark LLM — Set 003

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-003-01`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 86 este par? Răspunde doar cu „da” sau „nu”. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-003-02`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Daria Dumitru are 61 de ani și locuiește în Constanța.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Constanța

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Constanța.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 3 — `RO-003-03`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 10, 13, 16, 19, ...

### Răspuns de referință (obligatoriu în benchmark)

22

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 22.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-003-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „Thank you for your help.”

### Răspuns de referință (obligatoriu în benchmark)

Mulțumesc pentru ajutor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-003-05`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 75 de pagini și a citit 23. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

52

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 52.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-003-06`

**Categorie:** `extracție_structurată`  
**Domeniu:** `documente`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Extrage numai informația explicită și returnează un tabel cu: companie, taxă_lunară, monedă, termen_plată_zile, durată_inițială_luni. Apoi scrie două observații scurte. Dacă un câmp lipsește, scrie „necunoscut”.

Text: „Contractul cu Arbor SRL are o durată inițială de 12 luni. Taxa lunară este de 2200 EUR. Facturile se plătesc în maximum 15 zile de la emitere. Fragmentul nu precizează nimic despre reînnoire.”

### Răspuns de referință (obligatoriu în benchmark)

| Câmp | Valoare |
|---|---|
| companie | Arbor SRL |
| taxă_lunară | 2200 |
| monedă | EUR |
| termen_plată_zile | 15 |
| durată_inițială_luni | 12 |

Observații: fragmentul nu oferă informații despre reînnoire. Valorile din tabel sunt extrase direct din text, fără interpretarea validității juridice a clauzelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 34–150 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Arbor; 2200; EUR; 15; 12.
- **Variații acceptabile:** Ordinea observațiilor poate varia; valorile extrase trebuie să fie exacte.

---

## Exemplul 7 — `RO-003-07`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 500 lei crește cu 20%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

600 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 600.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-003-08`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Verifică din nou cifrele.”

### Răspuns de referință (obligatoriu în benchmark)

Te rog să verifici încă o dată cifrele.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 9 — `RO-003-09`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Poloniei?

### Răspuns de referință (obligatoriu în benchmark)

Varșovia

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Varșovia.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-003-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The coffee is hot.”

### Răspuns de referință (obligatoriu în benchmark)

Cafeaua este fierbinte.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
