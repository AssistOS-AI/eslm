# Benchmark LLM — Set 080

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-080-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 27 - 26?

### Răspuns de referință (obligatoriu în benchmark)

1

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 1.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-080-02`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Ioana Munteanu are 52 de ani și locuiește în Oradea.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Oradea

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Oradea.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 3 — `RO-080-03`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Mexicului?

### Răspuns de referință (obligatoriu în benchmark)

Ciudad de México

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Ciudad de México.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-080-04`

**Categorie:** `sfat_practic`  
**Domeniu:** `viață cotidiană`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Am multe fotografii pe telefon și vreau să le organizez. Răspunde concis.

### Răspuns de referință (obligatoriu în benchmark)

Elimină duplicatele, apoi grupează restul pe ani, evenimente sau persoane.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–60 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă soluții practice echivalente care respectă cerința.

---

## Exemplul 5 — `RO-080-05`

**Categorie:** `rescriere_email`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Rescrie mesajul ca e-mail profesional, dar nu rigid. Păstrează toate informațiile și limitează răspunsul la 90–140 de cuvinte. Nu adăuga motive sau termene care nu apar în text.

Mesaj brut: „Salut. Nu ai trimis încă fișierul. Am nevoie de el până joi. Verifică și cifrele, pentru că ultima versiune avea două erori. Trimite-l când e gata.”

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

## Exemplul 6 — `RO-080-06`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The weather changed quickly.”

### Răspuns de referință (obligatoriu în benchmark)

Vremea s-a schimbat repede.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 7 — `RO-080-07`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Schimbă data întâlnirii.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să modifici data întâlnirii.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 8 — `RO-080-08`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „The meeting starts at nine.”

### Răspuns de referință (obligatoriu în benchmark)

Ședința începe la nouă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 9 — `RO-080-09`

**Categorie:** `șir_numeric`  
**Domeniu:** `logică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Continuă șirul cu un singur număr: 5, 15, 25, 35, ... Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

45

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 45.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-080-10`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Ecranul rămâne alb după actualizare.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

problemă tehnică

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** problemă tehnică.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
