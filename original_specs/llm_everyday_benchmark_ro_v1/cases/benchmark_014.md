# Benchmark LLM — Set 014

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-014-01`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Cursul începe în septembrie și înscrierile se închid la finalul lui august.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Înscrierile se închid la final de august; cursul începe în septembrie.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.

---

## Exemplul 2 — `RO-014-02`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Nu am primit codul de autentificare.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-014-03`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Vreau răspuns acum.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să îmi trimiți un răspuns cât mai curând.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 4 — `RO-014-04`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „They moved to a new apartment.”

### Răspuns de referință (obligatoriu în benchmark)

S-au mutat într-un apartament nou.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 5 — `RO-014-05`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Maria este mai înalt(ă) decât Daria, iar Daria este mai înalt(ă) decât Vlad. Cine este cel mai scund? Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Vlad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Vlad.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-014-06`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 4 persoane și fiecare primește câte 7 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

28

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 28.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-014-07`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Un coleg spune că nu poate termina o sarcină azi. Dă un răspuns scurt și constructiv.

### Răspuns de referință (obligatoriu în benchmark)

În regulă. Spune-mi ce mai rămâne și care este cel mai realist termen nou.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 8 — `RO-014-08`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Muzeul lansează o expoziție dedicată fotografiei urbane.”

### Răspuns de referință (obligatoriu în benchmark)

Expoziție de fotografie urbană

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 9 — `RO-014-09`

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

Grupează feedbackul în maximum 4 teme, spune ce apare pozitiv și ce problemă se repetă. Nu inventa frecvențe în afara celor 8 comentarii. Maximum 220 de cuvinte.

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

## Exemplul 10 — `RO-014-10`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Proiectul a întârziat două zile din cauza unei livrări, dar bugetul nu s-a schimbat.”

### Răspuns de referință (obligatoriu în benchmark)

Întârziere de două zile fără impact asupra bugetului.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.
