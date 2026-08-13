# Benchmark LLM — Set 095

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-095-01`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 80 - 19?

### Răspuns de referință (obligatoriu în benchmark)

61

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 61.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-095-02`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 18 ÷ 2?

### Răspuns de referință (obligatoriu în benchmark)

9

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 9.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 3 — `RO-095-03`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Am următoarele notițe dintr-o ședință de proiect: versiunea 2.1 trebuia lansată pe 18 septembrie; funcțiile principale sunt gata; testele arată o încetinire de aproximativ 25% peste 5.000 de utilizatori simultan; echipa de infrastructură crede că optimizarea cache-ului poate ajuta, dar nu a terminat testele; două probleme de interfață sunt deschise; clientul Beta cere data inițială; echipa de produs acceptă o amânare de maximum o săptămână dacă performanța nu este rezolvată; bugetul este în parametri; joi se repetă testul; decizia finală este vineri la 13:00; dacă se amână, Beta trebuie anunțat în aceeași zi.

Scrie un rezumat executiv cu: stare, riscuri, decizii deja luate, lucruri încă nedecise și acțiuni următoare. Nu transforma incertitudinile în fapte. Maximum 650 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

**Stare.** Versiunea 2.1 este aproape pregătită funcțional: funcțiile principale sunt finalizate, iar bugetul rămâne în parametri. Persistă însă o problemă de performanță și două probleme de interfață.

**Riscuri.** Riscul principal este degradarea performanței la încărcare mare: aproximativ 25% încetinire peste 5.000 de utilizatori simultan. Optimizarea cache-ului este o ipoteză de remediere, nu o soluție confirmată. Există și un risc comercial deoarece clientul Beta solicită data inițială.

**Decizii deja luate.** Testul de performanță va fi repetat joi. Decizia finală privind lansarea va fi luată vineri la ora 13:00. Dacă se decide amânarea, Beta va fi informat în aceeași zi. Echipa de produs acceptă cel mult o săptămână de amânare.

**Încă nedecis.** Nu este stabilit dacă lansarea rămâne pe 18 septembrie și nu este demonstrat că optimizarea cache-ului rezolvă problema.

**Acțiuni următoare.** Finalizarea optimizării, repetarea testelor, urmărirea problemelor de interfață și pregătirea deciziei go/no-go de vineri. Dacă rezultatul conduce la amânare, comunicarea către Beta trebuie trimisă imediat.

Concluzia este că proiectul este aproape gata, dar data lansării depinde de validarea performanței.

Pentru decizia de vineri ar fi util un criteriu explicit de acceptare a performanței, deoarece notițele nu precizează ce nivel este considerat suficient. Acesta este un gol de informație, nu un motiv de a inventa un prag. Conducerea ar trebui să distingă între problemele care blochează lansarea, problemele acceptabile temporar și problemele care pot fi remediate după lansare, pe baza unor criterii stabilite de echipă.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 238–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 4 — `RO-095-04`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 79 de pagini și a citit 13. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

66

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 66.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 5 — `RO-095-05`

**Categorie:** `problemă_scurtă`  
**Domeniu:** `raționament cantitativ`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ana are de citit 93 de pagini și a citit 64. Câte pagini au rămas?

### Răspuns de referință (obligatoriu în benchmark)

29

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–5 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 29.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 6 — `RO-095-06`

**Categorie:** `factual`  
**Domeniu:** `muzică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Ce este ritmul în muzică?

### Răspuns de referință (obligatoriu în benchmark)

Organizarea în timp a duratelor și accentelor sonore.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–16 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Formulări semantic echivalente sunt acceptabile.

---

## Exemplul 7 — `RO-095-07`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 4 × 10?

### Răspuns de referință (obligatoriu în benchmark)

40

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 40.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-095-08`

**Categorie:** `factual`  
**Domeniu:** `chimie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce element are simbolul Fe?

### Răspuns de referință (obligatoriu în benchmark)

Fier

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Fier.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 9 — `RO-095-09`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Coreei de Sud?

### Răspuns de referință (obligatoriu în benchmark)

Seul

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Seul.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 10 — `RO-095-10`

**Categorie:** `factual`  
**Domeniu:** `geografie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Care este capitala Thailandei?

### Răspuns de referință (obligatoriu în benchmark)

Bangkok

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Bangkok.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
