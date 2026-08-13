# Benchmark LLM — Set 027

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-027-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 17 - 16?

### Răspuns de referință (obligatoriu în benchmark)

1

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 1.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-027-02`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 6, 8, 10, 12, ...

### Răspuns de referință (obligatoriu în benchmark)

14

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 14.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-027-03`

**Categorie:** `explicație_educațională`  
**Domeniu:** `învățare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Explică unui elev de liceu diferența dintre rezumat și parafrazare. Folosește maximum 180 de cuvinte, un exemplu simplu și o propoziție finală de tip „pe scurt”. Evită jargonul inutil.

### Răspuns de referință (obligatoriu în benchmark)

Diferența esențială este aceasta: rezumatul comprimă ideile principale, iar parafrazarea reformulează conținutul păstrând în mare aceeași informație.

Un exemplu simplu ar trebui să arate că termenii pot fi legați, dar răspund la întrebări diferite. De aceea nu trebuie folosiți ca sinonime și nici unul nu trebuie dedus automat din celălalt fără informații suficiente.

**Pe scurt:** cele două concepte sunt apropiate ca subiect, dar descriu proprietăți sau roluri diferite; explicația corectă începe prin separarea clară a acestor roluri.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 77–190 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Exemplul poate varia; diferența conceptuală trebuie să fie corectă și pe înțelesul unui elev.

---

## Exemplul 4 — `RO-027-04`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este media numerelor 10, 3 și 14?

### Răspuns de referință (obligatoriu în benchmark)

9

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 9.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-027-05`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 5 kilometri?

### Răspuns de referință (obligatoriu în benchmark)

5000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 5000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-027-06`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am de citit 40 de pagini în două zile. Ce ai face mai întâi?

### Răspuns de referință (obligatoriu în benchmark)

Împarte lectura în două sesiuni de aproximativ 20 de pagini și lasă câteva minute pentru recapitulare.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 7 — `RO-027-07`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Ana Popescu are 28 de ani și locuiește în Iași.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Iași

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Iași.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 8 — `RO-027-08`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Maria este mai înalt(ă) decât Ioana, iar Ioana este mai înalt(ă) decât Vlad. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Vlad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Vlad.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-027-09`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Sunt 4 cutii cu câte 7 obiecte. Câte obiecte sunt în total?

### Răspuns de referință (obligatoriu în benchmark)

28

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 28.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-027-10`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Mihai este mai înalt(ă) decât Elena, iar Elena este mai înalt(ă) decât Andrei. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Andrei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Andrei.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
