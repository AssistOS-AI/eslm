# Rezumat de arhitectură
## Model lingvistic cu execuție simbolică

## 1. Viziunea sistemului

Sistemul propus este un model lingvistic executabil simbolic, construit peste arhitectura existentă. Codul generic și reutilizabil rămâne în `src`. Aici intră înțelegerea generală a limbii, parserul CNL, compoziția semantică, planificarea, algoritmii de reasoning, mecanismele de căutare, rezolvarea constrângerilor, gestionarea contradicțiilor, provenance și încărcarea dinamică a cunoașterii.

Cunoașterea nu este înglobată în cod. Ea este păstrată în oricâte knowledge bases independente, versionate și declarative. Un KB poate conține termeni, fapte, evenimente, roluri semantice, lexicon, ontologii, reguli declarative, defaults, excepții, constrângeri, contexte și provenance. Nu poate conține JavaScript, Java sau alt cod executabil arbitrar.

La runtime, sistemul primește instrucțiuni, fapte, context și obiective exprimate în text. Încearcă să le înțeleagă simbolic, identifică KB-urile și shard-urile relevante, descompune taskul în subprobleme, selectează metodele disponibile și execută un plan. Dacă nu poate demonstra un rezultat, trebuie să distingă între limbaj neînțeles, cunoaștere lipsă, algoritm absent, ambiguitate, contradicție și depășirea bugetului de calcul.

## 2. Înțelegerea limbii

Intrarea în engleză este încercată mai întâi de parserul simbolic. CNL-ul este un subset extensibil al limbii engleze, construit progresiv pornind de la formele necesare benchmarkurilor de reasoning. Tehnica recomandată este un chart parser de tip Earley, cu feature sau unification grammar și acțiuni de compoziție semantică.

Parserul nu trebuie să reducă limbajul la pattern matching. El trebuie să producă entități, relații, evenimente, roluri, cuantificatori, scope pentru negație, temporalitate, modalitate, alternative de coreferență și obiective de interogare. Unknown words pot rămâne simboluri atunci când rolul gramatical este clar.

LLM-ul este opțional. El poate traduce alte limbi sau simplifica sintactic un text pe care CNL-ul nu îl poate procesa. Nu are voie să răspundă, să deducă, să introducă world knowledge, să rezolve ambiguități prin ghicire sau să modifice negația, cuantificatorii și ordinea temporală. Output-ul său este retrimis aceluiași parser simbolic și este acceptat numai după validare.

Procentul de inputuri procesate fără LLM este o metrică principală. În timpul învățării pe benchmarkuri trebuie să crească împreună cu accuracy. O creștere de scor produsă numai prin folosirea mai frecventă a normalizatorului nu reprezintă progresul urmărit.

## 3. Trecerea din documente în KB

Un CLI poate porni un coding agent cu un set mic de skill-uri și unul sau mai multe documente. Agentul înregistrează versiunile surselor, păstrează span-urile, încearcă parsing simbolic direct și folosește fallback-ul lingvistic numai când este necesar.

Semantic IR-ul rezultat este transformat în înregistrări declarative. Fiecare afirmație păstrează sursa, polaritatea, modalitatea, timpul, contextul și confidence-ul. Entity resolution este conservativ; două entități cu nume asemănătoare nu sunt unificate fără dovezi.

Dacă apare un termen nou, un frame verbal sau o regulă de domeniu, acestea se adaugă în KB. Dacă apare o construcție sintactică generică pe care parserul nu o suportă, coding agent-ul poate propune o schimbare în `src`, dar numai după ce dovedește că forma apare repetat și că noua regulă nu produce regresii pe benchmarkurile existente.

## 4. Structura KB-urilor

KB-ul are o formă canonică, portabilă și ușor de inspectat, precum JSONL sau un stream CBOR tipizat. Aceasta este sursa semantică reproductibilă. Pentru runtime, KB-ul este compilat în segmente binare imutabile, dictionary-coded, sortate și indexate.

Faptele unare și binare primesc acces rapid prin indexuri ordonate. Evenimentele sunt reprezentate separat, cu role edges pentru agent, patient, theme, recipient, source, destination și instrument. Regulile sunt date declarative de tip Datalog/Horn sau default rules tipizate, interpretate de operatori de încredere din `src`.

Pentru volume foarte mari, pachetul este împărțit în shard-uri. Manifestul descrie predicatele, intervalele de identificatori, Bloom filters, indexurile, dimensiunile și dependențele fiecărui shard. Canonical records și runtime indexes rămân separate, iar toate artefactele compilate pot fi reconstruite.

## 5. Încărcarea dinamică

Înregistrarea unui KB în catalog nu înseamnă încărcarea faptelor în memorie. Catalogul păstrează numai manifestele, namespace-urile, limbile, domeniile, acoperirea de predicate, indexurile lexicale și directoarele compacte de termeni.

După parsing, runtime-ul construiește o semnătură a taskului. Aceasta conține conceptele, predicatele, entitățile, tipul răspunsului și capabilitățile de reasoning necesare. Catalogul selectează KB-uri candidate, apoi manifestele identifică shard-urile și blocurile potrivite.

Selecția aproximativă poate ordona candidații, dar nu are voie să elimine sigur cunoaștere relevantă. Bloom filters pot exclude numai prin răspuns negativ. În reasoning multi-hop, noi entități și subobiective pot declanșa încărcarea unor shard-uri suplimentare. Un cache cu buget explicit păstrează dicționarele și blocurile frecvent utilizate.

## 6. Planificarea simbolică

Textul este transformat într-un task frame cu instrucțiuni, fapte, constrângeri, obiective, context și contractul răspunsului. Fiecare algoritm reutilizabil din `src` publică un capability descriptor care declară tipurile de input și output, precondițiile, costul, soundness-ul și forma proof-ului produs.

Plannerul descompune taskul într-un graf de subprobleme AND/OR și selectează metode potrivite. Poate combina deducție, căutare în graf, temporal reasoning, CSP, SAT, aritmetică, default reasoning sau abducție, în funcție de capabilitățile înregistrate.

Planurile de domeniu pot exista în KB ca date declarative, dar pot referi numai metode deja implementate în `src`. Dacă un subobiectiv are premisele necesare, dar nu există niciun algoritm aplicabil, sistemul raportează explicit lipsa metodei.

## 7. Învățarea pe benchmarkuri

Coding agent-ul lucrează separat asupra KB-ului curent și asupra core-ului. Default-ul este să adauge knowledge în KB. Core-ul este schimbat numai pentru lacune structurale și reutilizabile.

Fiecare benchmark este împărțit conceptual în development, fresh, regression și shadow. Agentul inspectează development failures, dar îmbunătățirile sunt acceptate numai dacă se reproduc pe exemple fresh, nonce substitutions, teste metamorphic și suitele de regresie anterioare.

Failure-urile sunt clasificate după parsing, lexicon, semantic composition, coreference, knowledge, retrieval, rules, methods, planning sau resource limits. Un răspuns corect cu proof greșit rămâne un failure latent.

Benchmarkurile definesc și curriculum-ul CNL. LogicBench, RuleTaker, ProofWriter și PrOntoQA solicită forme logice controlate. CLUTRR și StepGame solicită compoziție relațională. SATBench și ZebraLogic solicită constrângeri și search. FOLIO, WinoGrande, ReClor și LogiQA împing sistemul spre limbaj mai natural. CommonsenseQA, SocialIQA, PIQA și alphaNLI solicită KB-uri de commonsense, defaults și abducție.

## 8. Rezultatul urmărit

Sistemul final trebuie să poată primi o problemă în text și să întoarcă un răspuns justificat sau un status onest. Statusurile diferențiază SOLVED, PARTIAL, UNKNOWN, AMBIGUOUS, UNPARSED, MISSING_KNOWLEDGE, NO_APPLICABLE_METHOD, INCONSISTENT_CONTEXT și RESOURCE_LIMIT.

După stabilizare, sistemul se compară cu modele lingvistice mici existente, fără antrenarea unui Transformer propriu. Comparația folosește aceleași probleme și măsoară accuracy, generalizare sistematică, direct symbolic rate, proof validity, provenance, consum de memorie, latență și costul actualizării cunoașterii.

Contribuția principală nu este un singur scor. Este o hartă a competențelor care au putut fi transformate în cod generic, cunoaștere declarativă și reasoning verificabil, împreună cu o descriere precisă a taskurilor care încă necesită normalizare neurală, knowledge suplimentar sau algoritmi noi.
