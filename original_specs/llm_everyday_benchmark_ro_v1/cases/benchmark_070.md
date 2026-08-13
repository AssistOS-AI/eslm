# Benchmark LLM — Set 070

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-070-01`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un erbivor?

### Răspuns de referință (obligatoriu în benchmark)

Un animal care se hrănește în principal cu plante.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–17 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 2 — `RO-070-02`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este longitudinea?

### Răspuns de referință (obligatoriu în benchmark)

Distanța unghiulară față de meridianul de origine, exprimată în grade est sau vest.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–21 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 3 — `RO-070-03`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Echipa de suport introduce un sistem nou de prioritizare a cererilor.”

### Răspuns de referință (obligatoriu în benchmark)

Nou sistem de prioritizare în suport

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 4 — `RO-070-04`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 78 - 42?

### Răspuns de referință (obligatoriu în benchmark)

36

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 36.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-070-05`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana este mai înalt(ă) decât Radu, iar Radu este mai înalt(ă) decât Daria. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Daria

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Daria.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-070-06`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Au fost primite zece aplicații, dintre care patru au trecut de prima selecție.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Patru din zece aplicații au trecut prima selecție.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 7 — `RO-070-07`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Indiei?

### Răspuns de referință (obligatoriu în benchmark)

New Delhi

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** New Delhi.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-070-08`

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

Grupează feedbackul în maximum 4 teme, spune ce apare pozitiv și ce problemă se repetă. Nu inventa frecvențe în afara celor 8 comentarii. Maximum 220 de cuvinte. Păstrează răspunsul clar și concis.

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

## Exemplul 9 — `RO-070-09`

**Categorie:** `creativ_scurt`  
**Domeniu:** `creativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Scrie o propoziție optimistă despre începutul unei zile.

### Răspuns de referință (obligatoriu în benchmark)

O zi nouă înseamnă încă o ocazie de a începe bine.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia liber dacă respectă tema și limita.

---

## Exemplul 10 — `RO-070-10`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am 30 de minute până plec și trebuie să mă pregătesc pentru o întâlnire. Dă maximum trei pași.

### Răspuns de referință (obligatoriu în benchmark)

Prioritizează lucrurile esențiale, verifică ora și adresa, apoi folosește timpul rămas pentru detalii.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.
