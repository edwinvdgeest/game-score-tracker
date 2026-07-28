-- 011_seed_dutch_game_text.sql
-- Nederlandse omschrijving en speluitleg voor de bestaande spellen.
-- Run this migration manually in Supabase Studio (SQL editor).
--
-- LET OP: deze migratie koppelt op id, niet op naam. De spelnamen in de database
-- zijn niet consistent (dubbele spaties in "Keer op keer nog een keer  - lvl 3",
-- wisselende hoofdletters), dus op naam joinen zou stilzwijgend missen. Daardoor
-- is dit bestand specifiek voor déze database; bij een verse installatie doet het
-- niets. Dat is hier de juiste afweging.
--
-- Idempotent: opnieuw draaien schrijft dezelfde waarden. Rijen met text_locked =
-- true (handmatig aangepast) of text_source = 'claude' blijven ongemoeid.
--
-- Bewust NIET meegenomen — deze spellen ken ik niet betrouwbaar genoeg om er
-- regels voor te schrijven, en een verzonnen uitleg is erger dan geen uitleg.
-- Ze tonen in de app het "nog geen uitleg — vul aan"-kaartje:
--   Mozaa, Arsch mallows, Geven en Nemen, Clever Challenge 1, Beverclan.

-- ---------------------------------------------------------------------------
-- Deel 1: hoofdspellen met een eigen omschrijving en speluitleg
-- ---------------------------------------------------------------------------
WITH seed(id, description, rules_summary) AS (
  VALUES
    -- Ticket to Ride
    ('0d8716f7-f9b2-46a4-8506-719a49b65509'::uuid,
     $$Bouw treinroutes tussen steden op de kaart van Noord-Amerika. Je verzamelt gekleurde treinkaarten en claimt daarmee trajecten, terwijl je stiekem probeert de verbindingen op je geheime bestemmingskaarten af te maken. Makkelijk uit te leggen, maar er zit meer spanning in dan je verwacht zodra iemand net dat ene traject voor je neus wegkaapt.$$,
     $$Doel: verbind de steden op je bestemmingskaarten met elkaar en verdien zo veel mogelijk punten.

Verloop: op je beurt doe je precies één ding. Je pakt twee treinkaarten, of je claimt een traject door evenveel kaarten van de juiste kleur in te leveren als het traject lang is, of je trekt nieuwe bestemmingskaarten. Een geclaimd traject is van jou; niemand kan er meer bij.

Winnen: langere trajecten leveren meer punten op. Aan het eind tel je de punten van je trajecten op, plus de punten van bestemmingskaarten die je hebt afgemaakt, min de punten van kaarten die je niet hebt gehaald. Wie de langste aaneengesloten route heeft, krijgt een bonus. Hoogste totaal wint.

Tip: claim een traject dat je echt nodig hebt liever te vroeg dan te laat. Wachten op de perfecte kleur kost je vaak precies de verbinding waar je op rekende.$$),

    -- Uno
    ('b68ac230-890a-489b-a7a4-857c292f1904'::uuid,
     $$Het kaartspel dat iedereen kent: leg een kaart die past op kleur of getal en probeer als eerste van al je kaarten af te komen. Met actiekaarten waarmee je de beurt omdraait, iemand overslaat of vier kaarten laat trekken. Kort, chaotisch en prima met een grote groep.$$,
     $$Doel: als eerste al je kaarten kwijtraken.

Verloop: iedereen krijgt zeven kaarten. Op je beurt leg je een kaart die past op de kleur of het getal van de bovenste kaart op de aflegstapel. Kun je niets, dan pak je een kaart van de trekstapel. Actiekaarten doen wat erop staat: Pakken Twee, Beurt Overslaan, Richting Omdraaien, en de Joker waarmee je zelf een kleur kiest.

Winnen: heb je nog één kaart in je hand, dan roep je "Uno". Vergeet je dat en iemand betrapt je, dan pak je strafkaarten. Wie als eerste al zijn kaarten kwijt is, wint de ronde.

Tip: bewaar een Joker voor het eind. Een kleur kunnen kiezen op het moment dat je bijna klaar bent is meer waard dan hem vroeg spelen.$$),

    -- Lost Cities
    ('a6aa1d55-1ebd-48de-a263-f2bb4aee35ed'::uuid,
     $$Een kaartspel voor twee waarin je expedities uitrust naar vijf verre bestemmingen. Elke expeditie die je start kost je punten, dus je moet kiezen: begin je eraan en zet je door, of laat je hem lopen? Speelt kort, maar je zit continu te wikken en te wegen.$$,
     $$Doel: verdien punten met expedities, en begin er alleen aan als je ze ver genoeg kunt brengen.

Verloop: op je beurt speel je één kaart en pak je er één. Kaarten leg je in oplopende volgorde op je eigen expeditie in die kleur — een kaart die lager is dan de vorige kun je niet meer kwijt. Wil je een kaart niet spelen, dan leg je hem op de aflegstapel, waar je tegenstander hem kan pakken. Inzetkaarten aan het begin van een expeditie verdubbelen de opbrengst, maar ook het verlies.

Winnen: elke gestarte expeditie begint op min twintig punten. Je telt de waarde van je gespeelde kaarten daarbij op. Wie na het opmaken van de trekstapel de meeste punten heeft, wint.

Tip: een expeditie starten die je niet afmaakt is de duurste fout in dit spel. Bij twijfel: niet beginnen.$$),

    -- Port Royal
    ('5c4486a3-c08e-49f9-affb-09d7bf6ba36b'::uuid,
     $$Een kaartspel over de haven van Port Royal, waarin je schepen binnenhaalt en bemanning inhuurt. De kern is doorgaan of stoppen: elke kaart die je omdraait kan geld opleveren, maar draai je een tweede schip van dezelfde kleur om, dan ben je alles kwijt. Kort, gemeen en verrassend spannend.$$,
     $$Doel: verzamel als eerste genoeg invloed door personen in te huren.

Verloop: op je beurt draai je kaarten om uit de stapel en legt ze in de haven. Schepen leveren munten op, personen kun je inhuren. Je mag doorgaan zolang je durft, maar zodra er een tweede schip met dezelfde vlagkleur verschijnt, eindigt je beurt en krijg je niets. Stop je op tijd, dan mag je één kaart kopen; de andere spelers mogen daarna ook kopen en betalen jou daarvoor.

Winnen: personen geven invloedpunten en bijzondere voordelen. Zodra iemand aan het eind van zijn beurt genoeg invloed heeft, wordt die ronde nog afgemaakt en wint de speler met de meeste invloed.

Tip: kijk naar welke vlagkleuren al in de haven liggen voordat je nog een kaart omdraait. Twee kleuren op tafel betekent vaak dat stoppen slimmer is dan het lijkt.$$),

    -- Mikado
    ('86989e67-0ec4-49ab-a696-87ce51f93425'::uuid,
     $$Het klassieke stokjesspel: laat de bundel vallen en haal er om de beurt één stokje uit zonder dat de rest beweegt. Geen regels om te onthouden, alleen een vaste hand en het lef om te stoppen op het juiste moment.$$,
     $$Doel: verzamel de meeste punten door stokjes weg te halen zonder andere stokjes te laten bewegen.

Verloop: houd de bundel rechtop op tafel en laat hem los, zodat de stokjes kriskras neervallen. Om de beurt probeer je één stokje weg te halen. Beweegt er een ander stokje, ook maar een klein beetje, dan is je beurt voorbij en is de volgende aan de beurt. Lukt het wel, dan mag je nog een keer.

Winnen: elke kleur stokje is een aantal punten waard; de zeldzame kleuren tellen het zwaarst. Als alle stokjes weg zijn, telt iedereen zijn punten. Hoogste totaal wint.

Tip: begin bij de stokjes die bovenop liggen, ook als ze weinig punten waard zijn. Elk stokje dat je veilig weghaalt maakt de volgende makkelijker.$$),

    -- PimPamPet
    ('2f261792-bd10-455c-8bc7-682b644a2f88'::uuid,
     $$Nederlandse klassieker: draai aan de pijl voor een letter, lees de categorie voor en roep als eerste een antwoord dat met die letter begint. Werkt met alle leeftijden door elkaar en is vooral leuk omdat iedereen tegelijk zit te denken.$$,
     $$Doel: verzamel de meeste kaarten door als eerste een goed antwoord te roepen.

Verloop: iemand leest een categorie voor van de kaart, bijvoorbeeld "iets dat je in de keuken vindt". Dan draai je aan de pijl, die op een letter blijft staan. Iedereen mag meteen roepen. Wie als eerste een geldig antwoord roept dat met die letter begint, wint de kaart.

Winnen: wie de meeste kaarten heeft als de stapel op is, wint. Je kunt ook afspreken dat je speelt tot iemand een vast aantal kaarten heeft.

Tip: roep gerust iets halfs zodra je het hebt. Twijfelen tot je zeker weet dat het klopt kost je bijna altijd de kaart.$$),

    -- Regenwormen (Heckmeck am Bratwurmeck)
    ('bb488a02-ec05-413b-9512-c2312d4e1c92'::uuid,
     $$Dobbelspel waarin je regenwormen bij elkaar graait. Je gooit met acht dobbelstenen en legt er steeds een soort apart, maar je moet minstens één worm te pakken krijgen. Gooi je te gulzig, dan verlies je alles én mag een ander een tegel van je stelen.$$,
     $$Doel: verzamel de tegels met de meeste regenwormen erop.

Verloop: gooi met acht dobbelstenen. Kies één cijfer of het wormsymbool en leg alle dobbelstenen met dat teken apart. Dat teken mag je daarna niet meer kiezen. Met de rest gooi je opnieuw, net zolang tot je stopt of vastloopt. De wormen tellen als vijf punten. Met je totaal pak je een tegel van tafel, of de bovenste tegel van een andere speler als die precies past.

Winnen: mislukt je worp, dan lever je je bovenste tegel in en gaat de hoogste tegel van tafel af. Als de tafel leeg is, telt iedereen de wormen op zijn tegels. De meeste wormen wint.

Tip: zonder worm heb je niets, hoe hoog je totaal ook is. Pak hem liever te vroeg dan te laat.$$),

    -- Vlotte geesten (Geistesblitz)
    ('ff531f9f-0bf4-40b2-9b14-bd8cdd8f6f5d'::uuid,
     $$Reactiespel met vijf houten voorwerpen op tafel. Er wordt een kaart omgedraaid en jij moet het goede voorwerp grijpen — maar welk voorwerp dat is, hangt ervan af of de kleuren op de kaart kloppen of juist niet. Je hersenen weten het antwoord ruim voordat je hand meewerkt.$$,
     $$Doel: verzamel de meeste kaarten door steeds als eerste het juiste voorwerp te pakken.

Verloop: zet de witte geest, de groene fles, de blauwe boek, de grijze muis en de rode stoel in een kring. Draai een kaart om. Staat er een voorwerp op in zijn eigen kleur, dan grijp je dat voorwerp. Staat er niets in de juiste kleur, dan grijp je het voorwerp dat op de kaart in kleur noch vorm voorkomt.

Winnen: wie het juiste voorwerp pakt, krijgt de kaart. Wie ernaast grijpt, geeft een kaart terug aan de speler die het wel goed had. Als de stapel op is, wint wie de meeste kaarten heeft.

Tip: kijk eerst naar de kleuren, niet naar de plaatjes. Bijna alle fouten komen doordat je de vorm herkent voordat je de kleur hebt gecontroleerd.$$),

    -- Take 5 (6 nimmt!)
    ('093c4414-f55e-4505-aafb-2caabe8b2f97'::uuid,
     $$Kaartspel waarin je juist zo min mogelijk punten wilt hebben. Iedereen kiest tegelijk een kaart, en die worden van laag naar hoog aan vier rijen toegevoegd. Wie de zesde kaart in een rij legt, mag de hele rij meenemen — en daar zitten precies de strafpunten in.$$,
     $$Doel: eindig met zo min mogelijk strafpunten, hier ossenkoppen genoemd.

Verloop: iedereen kiest tegelijk een kaart uit zijn hand en legt die gedekt neer. Daarna worden alle kaarten omgedraaid en van laag naar hoog aangelegd, steeds aan de rij die eindigt op het dichtstbijzijnde lagere getal. Ligt jouw kaart als zesde in een rij, dan neem je die hele rij en begint de rij opnieuw met jouw kaart. Is je kaart lager dan het eind van elke rij, dan kies je zelf welke rij je meeneemt.

Winnen: elke kaart die je moet innemen heeft één tot zeven ossenkoppen. Aan het eind telt iedereen zijn ossenkoppen op. De laagste score wint.

Tip: een heel lage kaart is geen veilige kaart. Als je hem speelt op een moment dat alle rijen hoog staan, mag je zelf een rij oprapen.$$),

    -- El dorado (The Quest for El Dorado)
    ('03d72360-8d6b-487a-82cd-7fb7ad7b8809'::uuid,
     $$Een race door de jungle naar de gouden stad, waarbij je onderweg je eigen kaartenset opbouwt. Je koopt ontdekkingsreizigers en uitrusting die je verder helpen door moeras, oerwoud en water. Voelt als een bordspel en een deckbuilder tegelijk, en is in een klein uur uitgespeeld.$$,
     $$Doel: bereik als eerste het veld van El Dorado aan het eind van het parcours.

Verloop: je begint met een klein setje basiskaarten. Op je beurt speel je kaarten uit je hand om je pion vooruit te zetten: elk terreinvak vraagt om een bepaald symbool, en hoe zwaarder het terrein, hoe meer symbolen je moet inleveren. In plaats van bewegen mag je met de kracht van je kaarten een nieuwe kaart kopen uit de markt. Gespeelde kaarten gaan op je aflegstapel; is je trekstapel op, dan schud je die weer.

Winnen: wie als eerste het eindvak bereikt, wint direct. Blokkades onderweg kosten beurten, dus de kortste route is niet altijd de snelste.

Tip: koop vroeg een paar sterke kaarten in plaats van meteen zo ver mogelijk te lopen. Een opgeruimd stapeltje brengt je later per beurt veel verder.$$),

    -- Flip 7
    ('697438ab-3d3f-4e80-8fe1-5ec898ae293a'::uuid,
     $$Push-your-luck in zijn simpelste vorm: je laat kaarten omdraaien en telt de getallen op, maar zodra je een getal krijgt dat je al had, ben je die ronde alles kwijt. Zeven verschillende kaarten op tafel levert een dikke bonus op. Uitleg duurt een minuut, en het werkt met een grote groep.$$,
     $$Doel: verzamel over meerdere rondes als eerste genoeg punten.

Verloop: om de beurt zeg je of je nog een kaart wilt of dat je stopt. Elke kaart die je krijgt leg je open voor je neer. Krijg je een getal dat al voor je ligt, dan is je ronde voorbij en levert die niets op. Stop je op tijd, dan zijn je kaarten aan het eind van de ronde je punten waard.

Winnen: lukt het je om zeven verschillende getallen voor je te krijgen, dan eindigt de ronde en krijg je een flinke bonus. De punten van alle rondes tellen op; wie als eerste over de afgesproken grens komt, wint.

Tip: hoe meer kaarten er voor je liggen, hoe groter de kans dat de volgende dubbel is. Vanaf een stuk of vijf kaarten is stoppen meestal de betere keuze.$$),

    -- Beverbende
    ('d718ea73-dc78-439c-a2de-dfc36d22f184'::uuid,
     $$Kaartspel waarin je vier gedekte kaarten voor je hebt liggen en er maar twee van kent. Door te ruilen, te gluren en op het juiste moment te stoppen probeer je zo laag mogelijk uit te komen. Vooral een geheugenspel, en kinderen zijn er vaak beter in dan volwassenen.$$,
     $$Doel: eindig met de laagste totaalwaarde in je rij kaarten.

Verloop: iedereen krijgt vier gedekte kaarten en mag er aan het begin twee van bekijken. Op je beurt trek je een kaart en kies je: ruilen met een van je eigen kaarten, of afleggen en het speciale effect gebruiken. Met die effecten mag je bijvoorbeeld een eigen kaart bekijken, gluren bij een ander, of twee kaarten omwisselen.

Winnen: denk je dat je het laagst zit, dan roep je dat de ronde stopt. Iedereen krijgt nog één beurt, daarna draait iedereen zijn kaarten om. Laagste totaal wint de ronde.

Tip: onthouden waar de hoge kaarten van je buren liggen is meer waard dan je eigen rij perfect kennen. Met een ruil kun je die dan precies bij hen laten liggen.$$),

    -- Taco spel — aanname: dit is Taco Kat Geit Kaas Pizza (Taco Cat Goat Cheese Pizza).
    -- Klopt dat niet, pas de tekst dan aan via Bewerken op de spelpagina.
    ('10529325-14e5-47ed-941c-9100b50de00b'::uuid,
     $$Kaartspel waarin iedereen om de beurt een kaart omdraait en hardop de vaste rij opzegt: taco, kat, geit, kaas, pizza. Komt het woord overeen met de kaart, dan moet je zo snel mogelijk je hand op de stapel slaan. De laatste hand krijgt alle kaarten. Puur chaos, en daarom leuk.$$,
     $$Doel: als eerste al je kaarten kwijtraken.

Verloop: verdeel alle kaarten gedekt over de spelers. Om de beurt leg je een kaart open op de stapel en zeg je daarbij het volgende woord uit de rij taco, kat, geit, kaas, pizza. Daarna begint de rij weer van voren af aan. Zegt iemand het woord dat ook op de omgedraaide kaart staat, dan slaat iedereen zo snel mogelijk met zijn hand op de stapel.

Winnen: wie als laatste zijn hand op de stapel legt, neemt alle kaarten mee. Sla je erop terwijl het niet klopt, dan krijg je de stapel ook. Wie als eerste geen kaarten meer heeft, wint.

Tip: zeg het woord hardop en in een vast ritme. Wie te snel gaat, mist precies de kaart waar het om draait.$$),

    -- Qwixx
    ('8174ec04-7cc1-49fc-94d6-3dae854701f1'::uuid,
     $$Klein dobbelspel op een scoreblaadje: je kruist getallen af in vier gekleurde rijen, maar altijd van links naar rechts. Elk getal dat je overslaat ben je voorgoed kwijt. Duurt een kwartier en je doet ook mee als je niet aan de beurt bent.$$,
     $$Doel: kruis zo veel mogelijk getallen af in de vier gekleurde rijen.

Verloop: er wordt met zes dobbelstenen gegooid: twee witte en vier gekleurde. Iedereen mag de som van de twee witte afkruisen. De speler die aan de beurt is mag daarna ook nog een witte met een gekleurde combineren en dat getal in de bijbehorende kleur afkruisen. Rood en geel lopen oplopend, groen en blauw aflopend, en je moet altijd naar rechts. Kruis je niets af terwijl je aan de beurt was, dan krijg je een misworp.

Winnen: hoe meer kruisjes op een rij, hoe meer die rij oplevert; de punten lopen snel op. Sluit iemand een rij af of heeft iemand vier misworpen, dan eindigt het spel. Hoogste totaal wint.

Tip: aan het begin een paar getallen overslaan om verderop te komen is bijna altijd de moeite waard. Zuinig zijn met de eerste kruisjes kost je later de hele rij.$$),

    -- Keer op Keer (Noch mal!)
    ('9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Iedereen speelt op zijn eigen blaadje met een raster in gekleurde vlakken. Er wordt met kleur- en cijferdobbelstenen gegooid, en jij kruist aaneengesloten vakjes af. Omdat iedereen elke worp kan gebruiken, zit je nooit te wachten.$$,
     $$Doel: kruis zo veel mogelijk vakjes af en maak kolommen en kleuren compleet.

Verloop: er worden drie kleurdobbelstenen en drie cijferdobbelstenen gegooid. De speler die aan de beurt is kiest één kleur en één cijfer en kruist zoveel aaneengesloten vakjes van die kleur af. De andere spelers mogen de overgebleven dobbelstenen gebruiken. Je eerste kruisje van een beurt moet altijd grenzen aan iets dat je al hebt afgekruist, of in de startkolom staan. Twee keer per spel mag je een joker gebruiken.

Winnen: complete kolommen leveren punten op, en wie een kleur als eerste helemaal afkruist krijgt de hoogste bonus. Aan het eind trek je de ongebruikte jokers ervan af. Hoogste totaal wint.

Tip: ga vroeg voor één kleur helemaal af te maken. De bonus voor de eerste die dat lukt is groter dan wat je met losse kolommen bij elkaar sprokkelt.$$),

    -- Clever (Ganz schön clever)
    ('0bc14b40-5c1b-4fea-986a-fd9939de00fa'::uuid,
     $$Dobbelspel waarin je met zes gekleurde dobbelstenen je scoreblad invult. De clou: elke dobbelsteen die je níet kiest, ligt klaar voor je tegenstanders. En één goed gekozen vakje kan een reeks bonussen op gang brengen die het halve blad in één keer vult.$$,
     $$Doel: vul je scoreblad zo slim mogelijk in en verdien de meeste punten.

Verloop: je gooit met zes dobbelstenen en kiest er één om in te vullen op het bijbehorende gekleurde deel van je blad. Alle dobbelstenen met een lagere waarde gaan op de zilveren schaal en zijn voor de andere spelers. Daarna gooi je opnieuw met wat overblijft, drie keer per beurt. Ingevulde vakjes geven bonussen: een extra worp, een vinkje, een vos of meteen een vakje in een andere kleur.

Winnen: elk kleurdeel telt op zijn eigen manier: oplopende reeksen, vermenigvuldigen, of een vaste puntenladder. De vossen zijn zoveel waard als je zwakste kleurdeel. Na de laatste ronde telt iedereen op; hoogste totaal wint.

Tip: jaag op kettingen. Een vakje dat een bonus geeft die weer een vakje invult is veel meer waard dan het hoogste losse getal op tafel.$$)
)
UPDATE games g
SET description   = s.description,
    rules_summary = s.rules_summary,
    text_source   = 'seed'
FROM seed s
WHERE g.id = s.id
  AND g.text_locked = FALSE
  AND (g.text_source IS NULL OR g.text_source = 'seed');

-- ---------------------------------------------------------------------------
-- Deel 2: varianten koppelen aan hun hoofdspel
--
-- Een variant erft doosfoto, omschrijving en speluitleg van het hoofdspel en
-- krijgt alleen een eigen regel over wat er anders is. Dat scheelt niet alleen
-- schrijfwerk: het hoofdspel hoeft maar één keer bij BoardGameGeek opgezocht te
-- worden en alle varianten hebben meteen een plaatje.
--
-- De losse Clever- en Keer op Keer-uitgaven staan hier ook tussen. Het zijn
-- zelfstandige spellen met dezelfde kernregels maar eigen scorebladen; ik ken die
-- bladen niet precies genoeg om ze uit te schrijven, dus ze erven de kernuitleg
-- en de variant_note zegt eerlijk wat ik er wel van weet.
-- ---------------------------------------------------------------------------
WITH variants(id, parent_id, variant_note) AS (
  VALUES
    -- Qwixx-scorebladen
    ('284ead93-be3a-404d-a794-4ef9b9f1088c'::uuid, '8174ec04-7cc1-49fc-94d6-3dae854701f1'::uuid,
     $$Scoreblad "Ketting" met een afwijkende puntentelling. De dobbelregels blijven die van het basisspel.$$),
    ('50c831a6-c8ba-4ac4-9997-d28c528e1132'::uuid, '8174ec04-7cc1-49fc-94d6-3dae854701f1'::uuid,
     $$Scoreblad "Longo" met langere rijen. De dobbelregels blijven die van het basisspel.$$),
    ('f2c14ef0-72e6-4faf-878c-0c8ba45b492e'::uuid, '8174ec04-7cc1-49fc-94d6-3dae854701f1'::uuid,
     $$Scoreblad "Treden" met een trapsgewijze indeling. De dobbelregels blijven die van het basisspel.$$),
    ('3959445e-3b23-4423-b9b0-0cd2d889eb96'::uuid, '8174ec04-7cc1-49fc-94d6-3dae854701f1'::uuid,
     $$Alternatief scoreblad. De dobbelregels blijven die van het basisspel.$$),

    -- Keer op Keer: de niveaubladen van "nog een keer"
    ('813d0c44-030b-4f81-91c3-abb31278074a'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 2 uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),
    ('643e8449-7b1e-4de1-8d73-81ec43c09c0e'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 2, oranje blad, uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),
    ('2c2d7ae9-cc54-419c-bbd7-00145e056a0e'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 3 uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),
    ('2685ff96-b811-459d-8ae5-df9fd6467982'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 3, paars blad, uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),
    ('24e7a4b9-3a55-4053-906e-0385311bd28a'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 4 uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),
    ('47a54a23-e5a1-4c36-92ae-a49fb0aceda7'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Niveau 4, geel blad, uit "Keer op keer nog een keer". Ander raster, zelfde dobbelregels.$$),

    -- Keer op Keer: zelfstandige uitgaven met dezelfde kern
    ('9985040c-8051-4d30-877f-95165de63e87'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Zelfstandig vervolg op Keer op Keer met nieuwe scorebladen en extra bonussen. De kern — kleur- en cijferdobbelstenen, aaneengesloten vakjes afkruisen — is hetzelfde.$$),
    ('e053880a-5d8f-4cc2-85c5-cfc91251cef5'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Derde uitgave in de Keer op Keer-reeks, met een eigen scoreblad. De kernregels zijn die van het basisspel.$$),
    ('e47cad8c-eb9c-4313-afde-14fe24145413'::uuid, '9721198b-bb1c-4cee-9658-ec9fc3ea214d'::uuid,
     $$Kinderversie met een eenvoudiger raster en kortere speelduur. De kernregels zijn die van het basisspel.$$),

    -- Clever-familie
    ('862f14e1-df7a-4056-9e25-955a60711bc6'::uuid, '0bc14b40-5c1b-4fea-986a-fd9939de00fa'::uuid,
     $$Zelfstandig vervolg op Clever met een eigen scoreblad en andere bonusketens. De kern — dobbelsteen kiezen, lagere waarden doorgeven aan de tegenstanders — is hetzelfde.$$),
    ('c3759d2e-636d-497e-9bef-7c4c2befe2ec'::uuid, '0bc14b40-5c1b-4fea-986a-fd9939de00fa'::uuid,
     $$Derde deel in de Clever-reeks, met een eigen scoreblad. De kernregels zijn die van het basisspel.$$),
    ('fc5e0147-af6c-4707-8004-2199c12767cc'::uuid, '0bc14b40-5c1b-4fea-986a-fd9939de00fa'::uuid,
     $$Vierde deel in de Clever-reeks, met een eigen scoreblad. De kernregels zijn die van het basisspel.$$),
    -- Clever Challenge 1 krijgt bewust géén eigen tekst: ik weet niet welke opgave
    -- op dit blad staat. Wel de koppeling, zodat het de doosfoto van Clever krijgt.
    ('2f6ae515-1752-4ae5-975e-b020db4b837f'::uuid, '0bc14b40-5c1b-4fea-986a-fd9939de00fa'::uuid,
     NULL)
)
UPDATE games g
SET parent_game_id = v.parent_id,
    variant_note   = COALESCE(v.variant_note, g.variant_note)
FROM variants v
WHERE g.id = v.id
  AND g.text_locked = FALSE;
