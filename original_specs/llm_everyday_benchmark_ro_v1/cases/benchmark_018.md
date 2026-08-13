# Benchmark LLM — Set 018

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-018-01`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „șarpe”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

reptilă

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** reptilă.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-018-02`

**Categorie:** `factual`  
**Domeniu:** `statistică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este corelația?

### Răspuns de referință (obligatoriu în benchmark)

O asociere statistică între două variabile; nu demonstrează singură cauzalitatea.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–18 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 3 — `RO-018-03`

**Categorie:** `rescriere_email`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Rescrie mesajul ca e-mail profesional, dar nu rigid. Păstrează toate informațiile și limitează răspunsul la 90–140 de cuvinte. Nu adăuga motive sau termene care nu apar în text.

Mesaj brut: „Salut. Nu ai trimis încă fișierul. Am nevoie de el până joi. Verifică și cifrele, pentru că ultima versiune avea două erori. Trimite-l când e gata.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Bună,

Am observat că fișierul nu a fost trimis încă. Te rog să îl finalizezi și să mi-l trimiți până joi. Înainte de trimitere, verifică încă o dată cifrele, deoarece în versiunea precedentă au rămas două erori.

Când ai versiunea finală, trimite-mi direct fișierul. Dacă apare ceva care împiedică respectarea termenului, spune-mi cât mai repede.

Mulțumesc.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 56–150 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** joi; două erori; cifre.
- **Variații acceptabile:** Se acceptă alte formule de salut și încheiere; nu se acceptă pierderea termenului sau inventarea de motive.

---

## Exemplul 4 — `RO-018-04`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 88 ÷ 11?

### Răspuns de referință (obligatoriu în benchmark)

8

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 8.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-018-05`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Statelor Unite?

### Răspuns de referință (obligatoriu în benchmark)

Washington, D.C.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Washington, D.C..
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-018-06`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 4, 8, 12, 16, ...

### Răspuns de referință (obligatoriu în benchmark)

20

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 20.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-018-07`

**Categorie:** `da_nu`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Numărul 68 este par? Răspunde doar cu „da” sau „nu”.

### Răspuns de referință (obligatoriu în benchmark)

da

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** da.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-018-08`

**Categorie:** `clasificare_sentiment`  
**Domeniu:** `clasificare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică tonul ca pozitiv, negativ sau neutru. Răspunde cu un singur cuvânt: „Ședința a fost mutată la ora 15.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

neutru

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** neutru.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-018-09`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Ioana Munteanu are 38 de ani și locuiește în Oradea.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Oradea

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Oradea.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 10 — `RO-018-10`

**Categorie:** `ordine_logică`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Daria este mai înalt(ă) decât Vlad, iar Vlad este mai înalt(ă) decât Radu. Cine este cel mai scund?

### Răspuns de referință (obligatoriu în benchmark)

Radu

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–2 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Radu.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
