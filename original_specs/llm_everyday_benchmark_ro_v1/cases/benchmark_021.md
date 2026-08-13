# Benchmark LLM — Set 021

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-021-01`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Danemarcei?

### Răspuns de referință (obligatoriu în benchmark)

Copenhaga

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Copenhaga.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-021-02`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Raportul este 4:7. Dacă primul termen devine 16, care trebuie să fie al doilea?

### Răspuns de referință (obligatoriu în benchmark)

28

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 28.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-021-03`

**Categorie:** `factual`  
**Domeniu:** `fizică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce instrument măsoară presiunea atmosferică?

### Răspuns de referință (obligatoriu în benchmark)

Barometrul

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Barometrul.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-021-04`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un antonim potrivit pentru „clar”.

### Răspuns de referință (obligatoriu în benchmark)

confuz

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice antonim corect în context general.

---

## Exemplul 5 — `RO-021-05`

**Categorie:** `factual`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un sinonim?

### Răspuns de referință (obligatoriu în benchmark)

Un cuvânt cu sens identic sau apropiat de al altui cuvânt.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–19 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 6 — `RO-021-06`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câte ore sunt în 300 de minute? Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

5 ore

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 5.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-021-07`

**Categorie:** `sinteză_feedback`  
**Domeniu:** `analiză text`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Ai următoarele 8 comentarii despre o aplicație fictivă:
1. „Se deschide repede.”
2. „Uneori nu primesc notificările.”
3. „Interfața este simplă.”
4. „Căutarea găsește greu documentele vechi.”
5. „Îmi place că pot salva favorite.”
6. „Aș vrea text mai mare.”
7. „Am primit două notificări pentru același eveniment.”
8. „Configurarea inițială a fost ușoară.”

Grupează feedbackul în maximum 4 teme, spune ce apare pozitiv și ce problemă se repetă. Nu inventa frecvențe în afara celor 8 comentarii. Maximum 220 de cuvinte. Păstrează sensul exact al cererii.

### Răspuns de referință (obligatoriu în benchmark)

Aș grupa feedbackul în patru teme:

1. **Viteză și configurare:** deschiderea rapidă și configurarea inițială ușoară sunt puncte pozitive.
2. **Interfață și accesibilitate:** interfața este apreciată ca simplă, dar există o cerere pentru text mai mare.
3. **Căutare și organizare:** favoritele sunt apreciate, însă găsirea documentelor vechi este dificilă.
4. **Notificări:** uneori notificările lipsesc, iar alteori apar duplicate.

Aspectele pozitive clare sunt simplitatea, viteza, configurarea și favoritele. Problema care se repetă este fiabilitatea notificărilor, deoarece două comentarii diferite semnalează comportament incorect în aceeași zonă.

Din acest eșantion nu putem deduce cât de frecvente sunt problemele în întreaga bază de utilizatori.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 100–230 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** notificări; interfață; căutare; favorite.
- **Variații acceptabile:** Gruparea poate varia între 3 și 4 teme, dar trebuie recunoscute cele două probleme legate de notificări.

---

## Exemplul 8 — `RO-021-08`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 8 persoane și fiecare primește câte 3 pahare cu apă. Câte pahare sunt necesare? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

24

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 24.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-021-09`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Vânzările au crescut, dar profitul a scăzut din cauza costurilor de transport.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Vânzări în creștere, profit redus de costurile de transport.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 10 — `RO-021-10`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 16:00 și durează 1 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

17:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 17:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
