# Benchmark LLM — Set 035

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-035-01`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „somon”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

pește

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pește.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-035-02`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Italiei?

### Răspuns de referință (obligatoriu în benchmark)

Roma

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Roma.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-035-03`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Cum resetez parola contului?” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-035-04`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „da am înțeles”

### Răspuns de referință (obligatoriu în benchmark)

Da, am înțeles.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 5 — `RO-035-05`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 9 × 2?

### Răspuns de referință (obligatoriu în benchmark)

18

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 18.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-035-06`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Propune un nume pentru o echipă de quiz.

### Răspuns de referință (obligatoriu în benchmark)

Mințile Curioase

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 7 — `RO-035-07`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Trimite raportul azi.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să trimiți raportul astăzi.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 8 — `RO-035-08`

**Categorie:** `sumarizare_structurată`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă notițele într-un rezumat de maximum 180 de cuvinte, separat în: stare, risc principal, decizie și pas următor. Nu inventa informații.

Proiectul Atlas este finalizat în proporție de aproximativ 80%. Testarea funcțională de bază a trecut, însă livrarea unui echipament întârzie cu 1 zile. Bugetul nu s-a modificat. Echipa a decis să continue lucrul care nu depinde de echipament. Un nou punct de verificare va avea loc vineri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă mută data demonstrației.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Proiectul Atlas este finalizat în proporție de aproximativ 80%, iar testarea funcțională de bază a fost trecută. Bugetul rămâne neschimbat.

**Risc principal.** Livrarea echipamentului întârzie cu 1 zile și poate afecta data demonstrației.

**Decizie.** Echipa continuă activitățile care nu depind de echipament și nu modifică deocamdată planul general.

**Pas următor.** Va avea loc un nou punct de verificare vineri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă demonstrația trebuie reprogramată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 78–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 80; 1 zile; vineri; buget.
- **Variații acceptabile:** Formularea poate varia, dar trebuie păstrate cele patru secțiuni și faptele.

---

## Exemplul 9 — `RO-035-09`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Un coleg ți-a trimis informația cerută. Răspunde în maximum 10 cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Mulțumesc, am primit informația și este foarte utilă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 10 — `RO-035-10`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 25% din 120?

### Răspuns de referință (obligatoriu în benchmark)

30

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 30.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
