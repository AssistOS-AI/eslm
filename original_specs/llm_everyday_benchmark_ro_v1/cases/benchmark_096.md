# Benchmark LLM — Set 096

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-096-01`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Vreau răspuns acum.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să îmi trimiți un răspuns cât mai curând.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 2 — `RO-096-02`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Cum resetez parola contului?”

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-096-03`

**Categorie:** `traducere`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Tradu în română: „Good morning.”

### Răspuns de referință (obligatoriu în benchmark)

Bună dimineața.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 2–15 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă traduceri naturale semantic echivalente.

---

## Exemplul 4 — `RO-096-04`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Elena Marin are 55 de ani și locuiește în Arad.” extrage doar orașul.

### Răspuns de referință (obligatoriu în benchmark)

Arad

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Arad.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 5 — `RO-096-05`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Trebuie să aleg un apartament de închiriat dintre trei opțiuni. A: 520 EUR/lună, 38 m², la 10 minute de mers pe jos de birou, etaj 4 fără lift, contract minim 12 luni. B: 460 EUR/lună, 52 m², la 35 de minute cu transportul public, etaj 2 cu lift, contract minim 6 luni. C: 590 EUR/lună, 45 m², la 20 de minute cu bicicleta, etaj 3 cu lift, contract minim 12 luni și include parcare.

Lucrez de la birou patru zile pe săptămână, nu am mașină, prefer un spațiu mai mare, dar timpul pierdut pe drum contează mult. Bugetul maxim este 600 EUR. Nu știu cât voi rămâne în oraș după următoarele 8 luni.

Compară opțiunile după cost, spațiu, navetă, flexibilitate și facilități. Recomandă una singură, menționează compromisul principal și spune ce informație lipsă ar putea schimba alegerea. Maximum 700 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

Toate cele trei opțiuni se încadrează în bugetul maxim, deci alegerea depinde mai ales de navetă, spațiu și flexibilitate.

**A** are cea mai bună poziție pentru birou: 10 minute pe jos. Dezavantajele sunt suprafața cea mai mică, lipsa liftului și contractul de 12 luni, slab aliniat cu incertitudinea după 8 luni.

**B** este cel mai ieftin și cel mai mare: 460 EUR și 52 m². Are și contractul cel mai flexibil, de 6 luni. Dezavantajul este naveta de 35 de minute cu transportul public, repetată patru zile pe săptămână.

**C** rămâne în buget și oferă 45 m², lift și o navetă de 20 de minute cu bicicleta. Parcarea are valoare redusă deoarece nu ai mașină. Contractul de 12 luni rămâne o problemă.

**Recomandare: B.** Combinația de spațiu, cost și flexibilitate reduce riscul contractual și răspunde preferinței pentru un apartament mai mare. Compromisul principal este timpul de navetă.

Informația care ar putea schimba decizia este calitatea reală a navetei: frecvența transportului, schimbările necesare și durata în orele de vârf. Dacă proprietarul lui A ar accepta un contract de aproximativ 8 luni, A ar deveni mult mai atractiv datorită distanței foarte mici față de birou.

O verificare finală bună ar fi să pui criteriile într-o ordine explicită: flexibilitate, navetă, spațiu, apoi cost. Aceasta reduce riscul de a alege doar după preț. Recomandarea nu presupune că B este „cel mai bun” universal, ci doar că este cel mai bine aliniat cu preferințele declarate. Dacă una dintre preferințe se schimbă — de exemplu dacă naveta devine criteriul dominant — concluzia trebuie recalculată.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 256–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 6 — `RO-096-06`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 65 + 33?

### Răspuns de referință (obligatoriu în benchmark)

98

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 98.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-096-07`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

La o masă sunt 3 persoane și fiecare primește câte 5 pahare cu apă. Câte pahare sunt necesare?

### Răspuns de referință (obligatoriu în benchmark)

15

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 15.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-096-08`

**Categorie:** `explicație`  
**Domeniu:** `explicații`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Explică pe scurt ce este o premisă.

### Răspuns de referință (obligatoriu în benchmark)

Este o afirmație folosită ca bază pentru o concluzie sau un argument.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 10–55 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă explicații echivalente, clare și corecte conceptual.

---

## Exemplul 9 — `RO-096-09`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Vreau să-mi schimb adresa de e-mail.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

cont

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** cont.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-096-10`

**Categorie:** `clasificare_intenție`  
**Domeniu:** `customer support`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Clasifică cererea: cont, facturare, problemă tehnică sau livrare. „Ecranul rămâne alb după actualizare.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

problemă tehnică

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** problemă tehnică.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
