# Benchmark LLM — Set 002

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-002-01`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 26 este par? Răspunde doar cu „da” sau „nu”.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-002-02`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Unde găsesc chitanța?” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

facturare

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** facturare.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-002-03`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 6 persoane și fiecare primește câte 7 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

42

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 42.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-002-04`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 14:00 și durează 1 ore. La ce oră se termină? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

15:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 15:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-002-05`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Braziliei?

### Răspuns de referință (obligatoriu în benchmark)

Brasília

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Brasília.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-002-06`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „Please send the final version.”

### Răspuns de referință (obligatoriu în benchmark)

Te rog trimite versiunea finală.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 7 — `RO-002-07`

**Categorie:** `sumarizare_structurată`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă notițele într-un rezumat de maximum 180 de cuvinte, separat în: stare, risc principal, decizie și pas următor. Nu inventa informații.

Proiectul Atlas este finalizat în proporție de aproximativ 76%. Testarea funcțională de bază a trecut, însă livrarea unui echipament întârzie cu 3 zile. Bugetul nu s-a modificat. Echipa a decis să continue lucrul care nu depinde de echipament. Un nou punct de verificare va avea loc miercuri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă mută data demonstrației.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Proiectul Atlas este finalizat în proporție de aproximativ 76%, iar testarea funcțională de bază a fost trecută. Bugetul rămâne neschimbat.

**Risc principal.** Livrarea echipamentului întârzie cu 3 zile și poate afecta data demonstrației.

**Decizie.** Echipa continuă activitățile care nu depind de echipament și nu modifică deocamdată planul general.

**Pas următor.** Va avea loc un nou punct de verificare miercuri la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă demonstrația trebuie reprogramată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 78–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 76; 3 zile; miercuri; buget.
- **Variații acceptabile:** Formularea poate varia, dar trebuie păstrate cele patru secțiuni și faptele.

---

## Exemplul 8 — `RO-002-08`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „maria și ion au sosit”

### Răspuns de referință (obligatoriu în benchmark)

Maria și Ion au sosit.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 9 — `RO-002-09`

**Categorie:** `factual`  
**Domeniu:** `economie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este dobânda?

### Răspuns de referință (obligatoriu în benchmark)

Costul împrumutării banilor sau remunerația pentru economisire ori investiție.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–17 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 10 — `RO-002-10`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un omnivor?

### Răspuns de referință (obligatoriu în benchmark)

Un organism care consumă hrană vegetală și animală.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–16 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.
