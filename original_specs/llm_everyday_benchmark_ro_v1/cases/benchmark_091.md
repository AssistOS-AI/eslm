# Benchmark LLM — Set 091

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-091-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 5 × 2?

### Răspuns de referință (obligatoriu în benchmark)

10

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 10.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-091-02`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Întâlnirea a fost anulată.”

### Răspuns de referință (obligatoriu în benchmark)

The meeting was canceled.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 3 — `RO-091-03`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Compania deschide un nou birou regional în toamnă.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Deschiderea unui nou birou regional

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 4 — `RO-091-04`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 27 este par? Răspunde doar cu „da” sau „nu”.

### Răspuns de referință (obligatoriu în benchmark)

nu

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** nu.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-091-05`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Mihai este mai înalt(ă) decât Andrei, iar Andrei este mai înalt(ă) decât Daria. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Daria

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Daria.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-091-06`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un sinonim potrivit pentru „fericit”.

### Răspuns de referință (obligatoriu în benchmark)

bucuros

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice sinonim corect în context general.

---

## Exemplul 7 — `RO-091-07`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Rescrie următoarea explicație pentru un cititor fără pregătire economică, folosind un exemplu simplu și fără formule: „O organizație are costuri care se modifică atunci când volumul activității crește sau scade și costuri care rămân relativ stabile pe termen scurt. Materialele consumate pentru fiecare produs tind să crească odată cu numărul de produse, în timp ce chiria poate rămâne aceeași într-un anumit interval. Această clasificare nu spune dacă un cost este important sau neimportant. Unele costuri au componente mixte, de exemplu o taxă fixă plus o componentă proporțională cu utilizarea. Clasificarea ajută la estimarea modului în care se schimbă cheltuielile când se modifică volumul activității.”

Maximum 650 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

O organizație plătește lucruri diferite pentru a funcționa, iar aceste cheltuieli nu se schimbă toate în același fel.

Unele costuri cresc sau scad odată cu activitatea. Dacă o brutărie produce mai multe pâini, va folosi mai multă făină și mai multe ambalaje. Acestea sunt exemple de **costuri variabile**, deoarece sunt legate destul de direct de cât se produce.

Alte costuri se schimbă mai puțin pe termen scurt. Chiria spațiului, de exemplu, poate rămâne aceeași fie că brutăria produce într-o zi 500 sau 700 de pâini. Acesta este un **cost fix** în intervalul analizat.

„Fix” nu înseamnă „mic” sau „neimportant”. Chiria poate fi o cheltuială foarte mare. La fel, „variabil” nu înseamnă că un cost este neglijabil: o cantitate mică de material pentru fiecare produs poate deveni o sumă mare când producția este mare.

Există și costuri mixte. Un serviciu poate avea o taxă lunară fixă plus o sumă care crește în funcție de utilizare.

Distincția este utilă pentru o întrebare practică: **cum se schimbă cheltuielile dacă activitatea crește sau scade?** Clasificarea descrie comportamentul costului, nu cât de bun, rău sau important este acesta.

Exemplul cu brutăria este util deoarece arată că aceeași organizație poate avea simultan toate cele trei tipuri de cost. Făina este legată de volumul produs, chiria rămâne stabilă într-un interval, iar unele servicii pot combina o taxă fixă cu utilizarea. În practică, clasificarea depinde și de perioada analizată: un cost care pare fix pe termen scurt se poate schimba pe termen mai lung.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 246–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 8 — `RO-091-08`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este o sursă primară.

### Răspuns de referință (obligatoriu în benchmark)

Este o sursă directă din perioada sau fenomenul studiat, precum un document original sau un experiment.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 9 — `RO-091-09`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Raportul este 8:4. Dacă primul termen devine 40, care trebuie să fie al doilea?

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-091-10`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în engleză: „Mâncarea este pregătită.”

### Răspuns de referință (obligatoriu în benchmark)

The food is ready.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.
