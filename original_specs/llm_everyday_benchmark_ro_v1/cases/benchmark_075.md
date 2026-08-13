# Benchmark LLM — Set 075

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-075-01`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este un procent.

### Răspuns de referință (obligatoriu în benchmark)

Un procent exprimă o parte dintr-un întreg raportată la 100.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 2 — `RO-075-02`

**Categorie:** `calcul_aplicat`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este media numerelor 15, 18 și 3?

### Răspuns de referință (obligatoriu în benchmark)

12

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-075-03`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „crocodil”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt. Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

reptilă

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** reptilă.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 4 — `RO-075-04`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 47 de pagini și a citit 30. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

17

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 17.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-075-05`

**Categorie:** `clasificare_simplă`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică „somon”: mamifer, pasăre, reptilă, amfibian sau pește. Răspunde cu un singur cuvânt.

### Răspuns de referință (obligatoriu în benchmark)

pește

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–1 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** pește.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-075-06`

**Categorie:** `rescriere_email`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `medium`  
**Dificultate:** `medium`  
**Mod de evaluare:** `semantic`

### Prompt

Rescrie mesajul ca e-mail profesional, dar nu rigid. Păstrează toate informațiile și limitează răspunsul la 90–140 de cuvinte. Nu adăuga motive sau termene care nu apar în text.

Mesaj brut: „Salut. Nu ai trimis încă fișierul. Am nevoie de el până miercuri. Verifică și cifrele, pentru că ultima versiune avea două erori. Trimite-l când e gata.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Bună,

Am observat că fișierul nu a fost trimis încă. Te rog să îl finalizezi și să mi-l trimiți până miercuri. Înainte de trimitere, verifică încă o dată cifrele, deoarece în versiunea precedentă au rămas două erori.

Când ai versiunea finală, trimite-mi direct fișierul. Dacă apare ceva care împiedică respectarea termenului, spune-mi cât mai repede.

Mulțumesc.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 56–150 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** miercuri; două erori; cifre.
- **Variații acceptabile:** Se acceptă alte formule de salut și încheiere; nu se acceptă pierderea termenului sau inventarea de motive.

---

## Exemplul 7 — `RO-075-07`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „We finished the task.”

### Răspuns de referință (obligatoriu în benchmark)

Am terminat sarcina.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 8 — `RO-075-08`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Australiei?

### Răspuns de referință (obligatoriu în benchmark)

Canberra

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Canberra.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-075-09`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 72 ÷ 6?

### Răspuns de referință (obligatoriu în benchmark)

12

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 12.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-075-10`

**Categorie:** `sumarizare`  
**Domeniu:** `transformare text`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Rezuma într-o singură propoziție: „Echipa a terminat testele, iar lansarea rămâne programată pentru vineri.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Testele sunt finalizate; lansarea rămâne vineri.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 5–20 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice propoziție fidelă care păstrează ideile principale.
