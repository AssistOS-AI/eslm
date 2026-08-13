# Benchmark LLM — Set 040

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-040-01`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 60 lei crește cu 25%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

75 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 75.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-040-02`

**Categorie:** `sumarizare_structurată`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă notițele într-un rezumat de maximum 180 de cuvinte, separat în: stare, risc principal, decizie și pas următor. Nu inventa informații.

Proiectul Atlas este finalizat în proporție de aproximativ 86%. Testarea funcțională de bază a trecut, însă livrarea unui echipament întârzie cu 4 zile. Bugetul nu s-a modificat. Echipa a decis să continue lucrul care nu depinde de echipament. Un nou punct de verificare va avea loc miercuri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă mută data demonstrației.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Proiectul Atlas este finalizat în proporție de aproximativ 86%, iar testarea funcțională de bază a fost trecută. Bugetul rămâne neschimbat.

**Risc principal.** Livrarea echipamentului întârzie cu 4 zile și poate afecta data demonstrației.

**Decizie.** Echipa continuă activitățile care nu depind de echipament și nu modifică deocamdată planul general.

**Pas următor.** Va avea loc un nou punct de verificare miercuri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă demonstrația trebuie reprogramată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 78–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 86; 4 zile; miercuri; buget.
- **Variații acceptabile:** Formularea poate varia, dar trebuie păstrate cele patru secțiuni și faptele.

---

## Exemplul 3 — `RO-040-03`

**Categorie:** `procente`  
**Domeniu:** `matematică aplicată`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Un preț de 300 lei crește cu 10%. Care este noul preț?

### Răspuns de referință (obligatoriu în benchmark)

330 lei

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 330.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-040-04`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 3 kilometri? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

3000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 3000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-040-05`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este o hartă?

### Răspuns de referință (obligatoriu în benchmark)

O reprezentare grafică și simbolică a unui teritoriu sau spațiu.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 6 — `RO-040-06`

**Categorie:** `factual`  
**Domeniu:** `statistică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un eșantion?

### Răspuns de referință (obligatoriu în benchmark)

Un subset dintr-o populație folosit pentru a trage concluzii despre ansamblu.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–19 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 7 — `RO-040-07`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „vultur”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

pasăre

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pasăre.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-040-08`

**Categorie:** `factual`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un verb?

### Răspuns de referință (obligatoriu în benchmark)

O parte de vorbire care exprimă de regulă acțiuni, stări sau existența.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 9 — `RO-040-09`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Serverul a fost repornit și serviciul funcționează din nou normal.”

### Răspuns de referință (obligatoriu în benchmark)

Serviciul a revenit la funcționare normală după repornire.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 10 — `RO-040-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „She reads every evening.”

### Răspuns de referință (obligatoriu în benchmark)

Ea citește în fiecare seară.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
