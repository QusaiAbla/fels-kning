# IT-Hjälpen — Intern webbapplikation för IT-felsökning &amp; användarstöd

En premium, statisk webbapplikation byggd med ren HTML, CSS och vanilla JavaScript
för intern IT-support: självbetjäningsflöden med förgrenad felsökning, samt en
adminpanel för att bygga och underhålla flödena utan kod.

## Innehåll

```
it-helpdesk/
├── index.html          Startsida + frågeflöde + resultat (SPA)
├── admin.html           Adminpanel (PIN-skyddad)
├── css/
│   ├── styles.css        Delat designsystem (färger, typografi, komponenter)
│   └── admin.css         Adminpanelens layout (sidomeny, flödesbyggare, tabeller)
├── js/
│   ├── store.js          Datalager: läser data/*.json, sparar i localStorage
│   ├── main.js            Logik för startsida, frågeflöde och resultat
│   └── admin.js           Logik för adminpanelen (CRUD, flödesbyggare, inställningar)
├── data/
│   ├── flows.json         Alla felsökningsflöden (frågor, grenar, resultat)
│   └── config.json        Admin-PIN, organisationsnamn, supportmejl
└── README.md
```

## Komma igång

Appen är helt statisk. Enklast är att servera mappen lokalt (för att undvika
webbläsarens CORS-begränsningar på `fetch()` av lokala filer):

```bash
cd it-helpdesk
python3 -m http.server 8080
# öppna http://localhost:8080
```

Du kan även öppna `index.html` direkt via dubbelklick — appen har en inbyggd
fallback så att grundflödena fungerar även utan `fetch()`, men lokal server
rekommenderas för full funktionalitet (t.ex. import/export).

## Distribution till GitHub Pages

1. Pusha innehållet i denna mapp till ett GitHub-repo.
2. Gå till **Settings → Pages** i repot.
3. Välj grenen (t.ex. `main`) och rotmappen (`/`) som källa.
4. Din app är nu tillgänglig på `https://<användarnamn>.github.io/<repo>/`.

Ingen build-process eller server krävs — allt är statiska filer.

## Adminpanel

Klicka på **Admin**-knappen längst ned till höger på startsidan.

- **Standardkod:** `210021` (byt denna omgående via **Inställningar → Byt
  administratörskod**).
- Adminpanelen har fyra vyer: **Översikt**, **Flöden**, **Flödesbyggare** och
  **Inställningar**.
- I **Flödesbyggaren** ser du flödet som ett nod-träd. Klicka på en nod för att
  redigera frågetext, instruktioner, bild-URL, videolänk, externa länkar och
  svarsalternativ. Varje svarsalternativ kopplas till nästa nod, eller så kan
  du skapa och koppla en ny nod direkt.
- Markera en nod som **Slutresultat** för att göra den till en slutnod med
  statusfärg (grön = löst, gul = kräver åtgärd, röd = eskalera) samt en
  punktlista med rekommenderad åtgärd.

### Viktigt om datalagring (statisk hosting)

Eftersom appen är helt statisk (ingen server/databas) sparas alla ändringar du
gör i adminpanelen i webbläsarens `localStorage` på den enhet/webbläsare du
använder. De syns alltså inte automatiskt för andra användare eller enheter.

För att publicera ändringar permanent till alla användare:

1. Gå till **Inställningar → Data &amp; export** i adminpanelen.
2. Klicka **Exportera flows.json** (och **Exportera config.json** vid behov).
3. Ersätt filerna i `/data`-mappen i ditt GitHub-repo med de exporterade
   filerna och commit:a/pusha ändringen.
4. GitHub Pages uppdateras automatiskt inom någon minut.

Du kan också **importera** en `flows.json`-fil i adminpanelen för att snabbt
läsa in en tidigare exporterad eller manuellt redigerad datamängd.

## Datamodell (`data/flows.json`)

```jsonc
{
  "flows": [
    {
      "id": "flow_wifi",
      "title": "Wi-Fi fungerar inte",
      "description": "Kort beskrivning som visas på startkortet",
      "icon": "📶",
      "status": "published",       // "published" | "draft"
      "startNode": "n1",
      "nodes": {
        "n1": {
          "id": "n1",
          "type": "question",        // "question" | "result"
          "text": "Frågetext",
          "instructions": "Steg-för-steg-instruktioner (valfritt)",
          "image": "https://... (valfri bild-URL)",
          "video": "https://... (valfri video-länk, YouTube stöds för inbäddning)",
          "links": [{ "label": "Läs mer", "url": "https://..." }],
          "options": [
            { "label": "Ja", "next": "n2" },
            { "label": "Nej", "next": "n3" }
          ]
        },
        "n3": {
          "id": "n3",
          "type": "result",
          "status": "danger",         // "success" | "warning" | "danger"
          "title": "Rubrik för åtgärden",
          "summary": ["Punkt 1", "Punkt 2", "Punkt 3"]
        }
      }
    }
  ]
}
```

## Designsystem

| Roll | Färg |
|---|---|
| Primär (header/navigation/knappar) | `#0B2A4A` |
| Accent (Admin, varningar, eskalering) | `#C8102E` |
| Bakgrund | `#FFFFFF` |
| Sekundär yta | `#F4F6F8` |
| Länkar/interaktiva element | `#0056A3` |
| Brödtext | `#2B2B2B` |
| Rubriker | `#0B2A4A` |

Typografi: **Inter** för rubriker/brödtext, **IBM Plex Mono** för tekniska
detaljer (statusetiketter, steg-räknare, nod-ID) — en medveten touch som
speglar en IT-avdelnings vokabulär utan att kännas kall.

## Tillgänglighet &amp; responsivitet

- Fullt responsiv: fungerar från mobil (320px) till stor desktop.
- Synlig fokusindikator (`:focus-visible`) på alla interaktiva element.
- Respekterar `prefers-reduced-motion`.
- Semantisk HTML med korrekta `<label>`-kopplingar i formulär.

## Säkerhetsnotis

PIN-koden i `config.json` skyddar mot oavsiktlig åtkomst till adminpanelen,
men detta är **inte** en robust autentiseringslösning (koden går att läsa i
klientkoden/localStorage av en teknisk användare). Använd inte denna lösning
för känslig eller reglerad information — komplettera med nätverksbegränsning
(t.ex. endast tillgängligt på internt nät/VPN) om högre säkerhet krävs.
