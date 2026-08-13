# Benchmark LLM — Set 100

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-100-01`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Am un buget lunar fictiv. Venit net: 7.500 lei. Cheltuieli fixe: chirie 2.200, utilități 550, abonamente și telefon 250, transport 450. Cheltuieli variabile medii: mâncare 1.500, ieșiri 700, cumpărături diverse 600. Pun deoparte 500 lei lunar.

Nu cer consultanță financiară sau investiții. Verifică aritmetica, spune cât rămâne, ce proporție aproximativă din venit merge pe cheltuieli fixe și propune două modalități banale de a crea un buffer mai mare fără să atingi chiria sau economisirea de 500 lei. Nu presupune alte datorii sau venituri. Maximum 650 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Cheltuielile fixe sunt 2.200 + 550 + 250 + 450 = **3.450 lei**. Cheltuielile variabile sunt 1.500 + 700 + 600 = **2.800 lei**. Împreună cu economisirea de 500 lei, totalul alocat este **6.750 lei**.

Din venitul de 7.500 lei rămân **750 lei** nealocați.

Cheltuielile fixe reprezintă 3.450 / 7.500, adică aproximativ **46%** din venitul net.

Pentru un buffer mai mare fără a reduce chiria și fără a atinge economisirea de 500 lei, cele mai evidente zone sunt cheltuielile variabile.

**Prima opțiune:** stabilește un plafon mai mic pentru ieșiri, reducând moderat frecvența sau costul mediu.

**A doua opțiune:** urmărește separat categoria „cumpărături diverse”. Fiind largă, poate ascunde achiziții impulsive. O listă și o scurtă perioadă de așteptare pentru cumpărăturile neesențiale pot reduce suma.

Nu este corect să estimăm exact cât se va economisi prin aceste schimbări fără date despre comportamentul real. Din cifrele oferite, există deja un buffer de 750 lei.

Pentru urmărire, este util ca cele trei categorii variabile să fie notate separat în fiecare lună, nu amestecate într-o singură sumă. Astfel se poate vedea dacă bufferul de 750 lei este real sau dacă există cheltuieli neregulate care nu au fost incluse în scenariul fictiv. Analiza de aici verifică doar aritmetica și structura bugetului furnizat; nu estimează nevoi, randamente sau recomandări de investiții.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 214–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 2 — `RO-100-02`

**Categorie:** `comunicare_profesională`  
**Domeniu:** `muncă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Nu înțelegi o cerință. Ce întrebare de clarificare pui?

### Răspuns de referință (obligatoriu în benchmark)

Poți da un exemplu concret al rezultatului pe care îl aștepți?

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 3–30 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări naturale, politicoase și funcțional echivalente.

---

## Exemplul 3 — `RO-100-03`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un antonim potrivit pentru „sus”.

### Răspuns de referință (obligatoriu în benchmark)

jos

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice antonim corect în context general.

---

## Exemplul 4 — `RO-100-04`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Elena este mai înalt(ă) decât Mihai, iar Mihai este mai înalt(ă) decât Maria. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Maria

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Maria.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-100-05`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am 30 de minute până plec și trebuie să mă pregătesc pentru o întâlnire. Ce ai face mai întâi?

### Răspuns de referință (obligatoriu în benchmark)

Prioritizează lucrurile esențiale, verifică ora și adresa, apoi folosește timpul rămas pentru detalii.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 12–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 6 — `RO-100-06`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 18 este par? Răspunde doar cu „da” sau „nu”.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-100-07`

**Categorie:** `generare_titlu`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Transformă propoziția într-un titlu de maximum 8 cuvinte: „Compania deschide un nou birou regional în toamnă.”

### Răspuns de referință (obligatoriu în benchmark)

Deschiderea unui nou birou regional

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice titlu fidel, clar și de maximum 8 cuvinte.

---

## Exemplul 8 — `RO-100-08`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 8 × 6?

### Răspuns de referință (obligatoriu în benchmark)

48

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 48.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-100-09`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Câți metri sunt în 16 kilometri?

### Răspuns de referință (obligatoriu în benchmark)

16000 metri

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 16000.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-100-10`

**Categorie:** `factual`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este un paragraf?

### Răspuns de referință (obligatoriu în benchmark)

Un grup de enunțuri organizate în jurul unei idei principale.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.
