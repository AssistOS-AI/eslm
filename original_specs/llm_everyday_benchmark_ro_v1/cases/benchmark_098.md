# Benchmark LLM — Set 098

> 10 exemple. Răspunsurile de referință sunt orientative, cu excepția cazurilor marcate `exact`.

---

## Exemplul 1 — `RO-098-01`

**Categorie:** `timp`  
**Domeniu:** `raționament temporal`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

O activitate începe la 16:00 și durează 3 ore. La ce oră se termină?

### Răspuns de referință (obligatoriu în benchmark)

19:00

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–4 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 19:00.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 2 — `RO-098-02`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Nu ai completat tabelul.”

### Răspuns de referință (obligatoriu în benchmark)

Am observat că tabelul nu este încă complet; te rog să îl finalizezi.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 3 — `RO-098-03`

**Categorie:** `task_complex_cotidian`  
**Domeniu:** `decizie și sinteză`  
**Clasă de lungime:** `long`  
**Dificultate:** `medium-hard`  
**Mod de evaluare:** `semantic`

### Prompt

Am de pregătit în patru săptămâni un examen introductiv cu trei blocuri: statistică de bază, probabilitate și interpretarea graficelor. Pot studia cinci zile pe săptămână, aproximativ 60 de minute pe zi. La statistică știu media și mediana, dar uit formulele. La probabilitate sunt începător. La grafice mă descurc bine, dar greșesc când axele sunt trunchiate sau două grafice au scări diferite.

Vreau un plan pe patru săptămâni. Fiecare săptămână trebuie să aibă un obiectiv, tipuri de exerciții și o verificare la final. În ultima săptămână vreau două simulări scurte. Nu recomanda resurse online specifice și nu presupune că pot studia în weekend. Include și o metodă simplă pentru a urmări greșelile recurente. Maximum 750 de cuvinte.

### Răspuns de referință (obligatoriu în benchmark)

**Săptămâna 1 — statistică de bază.** Consolidează media, mediana, modul, intervalul și măsuri elementare de variație. Alternează recapitularea formulelor cu exerciții în care trebuie să alegi măsura potrivită, nu doar să o calculezi. Verificarea finală: 12–15 exerciții fără notițe.

**Săptămâna 2 — probabilitate.** Începe cu evenimente, rezultate posibile, probabilități simple și complement. Folosește probleme mici cu monede, zaruri și selecții. Verificarea finală: aproximativ 10 probleme, dintre care câteva cer explicarea metodei.

**Săptămâna 3 — grafice și integrare.** Combină exerciții de statistică și probabilitate cu interpretarea graficelor. Exersează deliberat axe trunchiate, scări diferite și comparații înșelătoare. Verificarea finală: un mini-test cu toate cele trei blocuri.

**Săptămâna 4 — simulări.** În primele două zile revizuiește erorile recurente. În ziua 3 fă o simulare scurtă. În ziua 4 corectează și refă problemele ratate. În ziua 5 fă a doua simulare.

Pentru greșeli, folosește un tabel cu patru coloane: problemă, tip de eroare, motiv, regulă de reținut. Dacă aceeași categorie apare de trei ori, ea devine prioritate în sesiunea următoare.

Planul păstrează weekendul liber și folosește cele 60 de minute zilnice pentru consolidare, nu pentru acoperirea excesivă a materiei.

La finalul fiecărei săptămâni, nu urmări doar scorul total. Notează separat greșelile de concept, greșelile de calcul și greșelile de citire a cerinței. Dacă scorul crește, dar aceeași categorie de eroare rămâne, planul trebuie ajustat. În ultima săptămână evită să introduci capitole noi; simulările și corectarea greșelilor au prioritate față de extinderea materiei.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 235–850 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Răspunsul poate varia; trebuie să respecte toate constrângerile, să folosească datele furnizate și să nu inventeze informații esențiale.

---

## Exemplul 4 — `RO-098-04`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Dă-mi acces la fișier.” Folosește doar informațiile din cerere.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să îmi acorzi acces la fișier.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 5 — `RO-098-05`

**Categorie:** `rescriere`  
**Domeniu:** `comunicare`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Reformulează mai politicos, fără să schimbi sensul: „Răspunde mai repede.” Răspunde direct și nu adăuga informații necerute.

### Răspuns de referință (obligatoriu în benchmark)

Te rog să răspunzi cât mai curând posibil.

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 4–22 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă formulări politicoase echivalente.

---

## Exemplul 6 — `RO-098-06`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 28 + 42?

### Răspuns de referință (obligatoriu în benchmark)

70

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 70.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 7 — `RO-098-07`

**Categorie:** `calcul`  
**Domeniu:** `matematică`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Cât este 6 × 4?

### Răspuns de referință (obligatoriu în benchmark)

24

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** 24.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.

---

## Exemplul 8 — `RO-098-08`

**Categorie:** `extracție`  
**Domeniu:** `informații structurate`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Din textul „Radu Ilie are 36 de ani și locuiește în Cluj-Napoca.” extrage numele complet și vârsta.

### Răspuns de referință (obligatoriu în benchmark)

Radu Ilie, 36 ani

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–8 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** Radu; Ilie; 36.
- **Variații acceptabile:** Se acceptă orice format scurt care păstrează exact valorile extrase.

---

## Exemplul 9 — `RO-098-09`

**Categorie:** `vocabular`  
**Domeniu:** `limbă`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `semantic`

### Prompt

Dă un sinonim potrivit pentru „nou”.

### Răspuns de referință (obligatoriu în benchmark)

recent

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–3 cuvinte.
- **Mod de corectare:** echivalență semantică; nu se cere formularea identică cu referința.
- **Elemente esențiale:** să răspundă direct la cerere și să nu contrazică datele furnizate.
- **Variații acceptabile:** Se acceptă orice sinonim corect în context general.

---

## Exemplul 10 — `RO-098-10`

**Categorie:** `factual`  
**Domeniu:** `biologie`  
**Clasă de lungime:** `short`  
**Dificultate:** `easy`  
**Mod de evaluare:** `exact`

### Prompt

Ce organe realizează principalul schimb de gaze la om?

### Răspuns de referință (obligatoriu în benchmark)

Plămânii

### Criterii indicative / opționale pentru evaluare

- **Dimensiune orientativă a răspunsului:** 1–9 cuvinte.
- **Mod de corectare:** potrivire exactă sau numeric echivalentă.
- **Elemente esențiale:** Plămânii.
- **Variații acceptabile:** Se acceptă doar răspunsul factual/numeric echivalent; evaluatorul poate normaliza majuscule, spații și diacritice unde este rezonabil.
