# Benchmark LLM — Set 063

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-063-01`

**Categorie:** `procente`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât reprezintă 10% din 60?

### Răspuns de referință (obligatoriu în benchmark)

6

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 6.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-063-02`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „liliac”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

mamifer

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** mamifer.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-063-03`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „cal”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

mamifer

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** mamifer.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-063-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Am nevoie de o pauză.”

### Răspuns de referință (obligatoriu în benchmark)

I need a break.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-063-05`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Mihai Rusu are 33 de ani și locuiește în București.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Mihai Rusu, 33 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Mihai; Rusu; 33.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 6 — `RO-063-06`

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

Grupează feedbackul în maximum 4 teme, spune ce apare pozitiv și ce problemă se repetă. Nu inventa frecvențe în afara celor 8 comentarii. Maximum 220 de cuvinte. Respectă strict formatul cerut.

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

## Exemplul 7 — `RO-063-07`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am de citit 40 de pagini în două zile. Dă maximum trei pași.

### Răspuns de referință (obligatoriu în benchmark)

Împarte lectura în două sesiuni de aproximativ 20 de pagini și lasă câteva minute pentru recapitulare.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 8 — `RO-063-08`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Mihai este mai înalt(ă) decât Paul, iar Paul este mai înalt(ă) decât Ioana. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Ioana

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Ioana.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-063-09`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 4 persoane și fiecare primește câte 7 pahare cu apă. Câte pahare sunt necesare? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

28

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 28.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-063-10`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câte picioare are în mod tipic un păianjen adult?

### Răspuns de referință (obligatoriu în benchmark)

8

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 8.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
