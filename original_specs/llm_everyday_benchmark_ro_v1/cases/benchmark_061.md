# Benchmark LLM — Set 061

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-061-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 32 ÷ 8?

### Răspuns de referință (obligatoriu în benchmark)

4

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 4.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-061-02`

**Categorie:** `explicație_educațională`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Explică unui elev de liceu diferența dintre corelație și cauzalitate. Folosește maximum 180 de cuvinte, un exemplu simplu și o propoziție finală de tip „pe scurt”. Evită jargonul inutil.

### Răspuns de referință (obligatoriu în benchmark)

Diferența esențială este aceasta: corelația descrie o asociere, în timp ce cauzalitatea implică faptul că o schimbare produce sau contribuie la alta.

Un exemplu simplu ar trebui să arate că termenii pot fi legați, dar răspund la întrebări diferite. De aceea nu trebuie folosiți ca sinonime și nici unul nu trebuie dedus automat din celălalt fără informații suficiente.

**Pe scurt:** cele două concepte sunt apropiate ca subiect, dar descriu proprietăți sau roluri diferite; explicația corectă începe prin separarea clară a acestor roluri.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 82–190 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Exemplul poate varia; diferența conceptuală trebuie să fie corectă și pe înțelesul unui elev.

---

## Exemplul 3 — `RO-061-03`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 9, 19, 29, 39, ...

### Răspuns de referință (obligatoriu în benchmark)

49

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 49.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-061-04`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „pinguin”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

pasăre

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pasăre.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-061-05`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 5 persoane și fiecare primește câte 7 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

35

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 35.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-061-06`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce tip de animal este păianjenul?

### Răspuns de referință (obligatoriu în benchmark)

Arahnid

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Arahnid.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-061-07`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Pachetul a fost livrat ieri.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-061-08`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este cloud computing.

### Răspuns de referință (obligatoriu în benchmark)

Este furnizarea la cerere a resurselor de calcul, stocare sau servicii prin rețea.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 9 — `RO-061-09`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 15:00 și durează 3 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

18:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 18:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-061-10`

**Categorie:** `factual`  
**Domeniu:** `economie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un buget?

### Răspuns de referință (obligatoriu în benchmark)

Un plan al veniturilor și cheltuielilor pentru o perioadă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–17 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.
