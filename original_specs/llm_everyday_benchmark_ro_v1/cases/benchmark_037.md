# Benchmark LLM — Set 037

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-037-01`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Magazinul va fi închis luni pentru inventar și se redeschide marți.”

### Răspuns de referință (obligatoriu în benchmark)

Magazin închis luni pentru inventar, redeschis marți.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 2 — `RO-037-02`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Contul a fost creat cu succes.”

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-037-03`

**Categorie:** `sumarizare_structurată`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă notițele într-un rezumat de maximum 180 de cuvinte, separat în: stare, risc principal, decizie și pas următor. Nu inventa informații.

Proiectul Atlas este finalizat în proporție de aproximativ 82%. Testarea funcțională de bază a trecut, însă livrarea unui echipament întârzie cu 2 zile. Bugetul nu s-a modificat. Echipa a decis să continue lucrul care nu depinde de echipament. Un nou punct de verificare va avea loc luni la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă mută data demonstrației.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Proiectul Atlas este finalizat în proporție de aproximativ 82%, iar testarea funcțională de bază a fost trecută. Bugetul rămâne neschimbat.

**Risc principal.** Livrarea echipamentului întârzie cu 2 zile și poate afecta data demonstrației.

**Decizie.** Echipa continuă activitățile care nu depind de echipament și nu modifică deocamdată planul general.

**Pas următor.** Va avea loc un nou punct de verificare luni la ora 11:00. Dacă echipamentul nu a sosit până atunci, managerul va decide dacă demonstrația trebuie reprogramată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 78–180 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** 82; 2 zile; luni; buget.
- **Variații acceptabile:** Formularea poate varia, dar trebuie păstrate cele patru secțiuni și faptele.

---

## Exemplul 4 — `RO-037-04`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Contul a fost creat cu succes.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-037-05`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Proiectul merge bine.”

### Răspuns de referință (obligatoriu în benchmark)

The project is going well.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 6 — `RO-037-06`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 9:00 și durează 2 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

11:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 11:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-037-07`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un ecosistem?

### Răspuns de referință (obligatoriu în benchmark)

Ansamblul organismelor și al mediului fizic cu care acestea interacționează.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 8 — `RO-037-08`

**Categorie:** `corectare_text`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Corectează majusculele și punctuația: „dacă plouă rămânem acasă”

### Răspuns de referință (obligatoriu în benchmark)

Dacă plouă, rămânem acasă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă variante de punctuație corecte și naturale.

---

## Exemplul 9 — `RO-037-09`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Vreau să reduc risipa de mâncare din frigider. Dă maximum trei pași.

### Răspuns de referință (obligatoriu în benchmark)

Planifică mesele în jurul alimentelor care expiră primele și congelează surplusul potrivit.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 10 — `RO-037-10`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Turciei?

### Răspuns de referință (obligatoriu în benchmark)

Ankara

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Ankara.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
