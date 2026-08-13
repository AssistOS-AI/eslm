# Benchmark LLM — Set 010

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-010-01`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este un rezumat executiv.

### Răspuns de referință (obligatoriu în benchmark)

Este o sinteză scurtă a celor mai importante informații, decizii și riscuri.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 2 — `RO-010-02`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Sistemul va fi indisponibil două ore pentru mentenanță.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Mentenanță programată a sistemului

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 3 — `RO-010-03`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Raportul este 2:4. Dacă primul termen devine 6, care trebuie să fie al doilea?

### Răspuns de referință (obligatoriu în benchmark)

12

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-010-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Telefonul este în geantă.”

### Răspuns de referință (obligatoriu în benchmark)

The phone is in the bag.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-010-05`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Cererea pentru produs a crescut în ultimele trei luni.”

### Răspuns de referință (obligatoriu în benchmark)

Creșterea cererii pentru produs

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 6 — `RO-010-06`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 150 lei crește cu 5%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

157.5 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 157.5.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-010-07`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este media numerelor 3, 4 și 3?

### Răspuns de referință (obligatoriu în benchmark)

3.33

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 3.33.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-010-08`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Mi-a plăcut foarte mult experiența.”

### Răspuns de referință (obligatoriu în benchmark)

pozitiv

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pozitiv.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-010-09`

**Categorie:** `extracție_structurată`  
**Domeniu:** `documente`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Extrage numai informația explicită și returnează un tabel cu: companie, taxă_lunară, monedă, termen_plată_zile, durată_inițială_luni. Apoi scrie două observații scurte. Dacă un câmp lipsește, scrie „necunoscut”.

Text: „Contractul cu Terra SRL are o durată inițială de 12 luni. Taxa lunară este de 2950 EUR. Facturile se plătesc în maximum 30 zile de la emitere. Fragmentul nu precizează nimic despre reînnoire.”

### Răspuns de referință (obligatoriu în benchmark)

| Câmp | Valoare |
|---|---|
| companie | Terra SRL |
| taxă_lunară | 2950 |
| monedă | EUR |
| termen_plată_zile | 30 |
| durată_inițială_luni | 12 |

Observații: fragmentul nu oferă informații despre reînnoire. Valorile din tabel sunt extrase direct din text, fără interpretarea validității juridice a clauzelor.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 34–150 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Terra; 2950; EUR; 30; 12.
- **Variații acceptabile:** Ordinea observațiilor poate varia; valorile extrase trebuie să fie exacte.

---

## Exemplul 10 — `RO-010-10`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 10 + 21?

### Răspuns de referință (obligatoriu în benchmark)

31

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 31.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
