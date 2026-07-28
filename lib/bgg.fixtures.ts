/**
 * Vaste BGG XML-responses voor de tests.
 *
 * boardgamegeek.com is niet bereikbaar vanuit de ontwikkelomgeving, dus alle
 * parse- en matchlogica wordt hiertegen getest in plaats van tegen het echte
 * netwerk. De XML hieronder is overgenomen van de vorm die de XML API 2
 * teruggeeft, inclusief de eigenaardigheden die de parser moet overleven:
 * HTML-entiteiten in namen, meerdere <name>-elementen per item, ontbrekende
 * <statistics>, en "0" als betekenis voor "onbekend".
 */

/** Zoekresultaat met meerdere edities — de kern van de matchtests. */
export const SEARCH_XML_QWIXX = `<?xml version="1.0" encoding="utf-8"?>
<items total="4" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="131260">
    <name type="primary" value="Qwixx"/>
    <yearpublished value="2012"/>
  </item>
  <item type="boardgame" id="167220">
    <name type="primary" value="Qwixx: Big Points"/>
    <yearpublished value="2014"/>
  </item>
  <item type="boardgame" id="204190">
    <name type="primary" value="Qwixx: Gemischtes Doppel"/>
    <yearpublished value="2016"/>
  </item>
  <item type="boardgame" id="286480">
    <name type="alternate" value="Qwixx Deluxe"/>
    <yearpublished value="2019"/>
  </item>
</items>`;

/** Uno: veel heruitgaven met exact dezelfde naam — test de id-tiebreak. */
export const SEARCH_XML_UNO = `<?xml version="1.0" encoding="utf-8"?>
<items total="3" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="161936">
    <name type="primary" value="Uno"/>
    <yearpublished value="1992"/>
  </item>
  <item type="boardgame" id="2223">
    <name type="primary" value="Uno"/>
    <yearpublished value="1971"/>
  </item>
  <item type="boardgame" id="279715">
    <name type="primary" value="Uno Flip!"/>
    <yearpublished value="2019"/>
  </item>
</items>`;

/** Entiteiten en diakritische tekens in de naam. */
export const SEARCH_XML_ENTITIES = `<?xml version="1.0" encoding="utf-8"?>
<items total="2" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="8203">
    <name type="primary" value="Hey, That&#039;s My Fish!"/>
    <yearpublished value="2003"/>
  </item>
  <item type="boardgame" id="21790">
    <name type="primary" value="Thurn und Taxis: Gl&#252;ck &amp; Glas"/>
    <yearpublished value="2006"/>
  </item>
</items>`;

/** Zoekresultaat zonder jaartal. */
export const SEARCH_XML_NO_YEAR = `<?xml version="1.0" encoding="utf-8"?>
<items total="1" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="999001">
    <name type="primary" value="Geven en Nemen"/>
  </item>
</items>`;

/** Nul treffers. */
export const SEARCH_XML_EMPTY = `<?xml version="1.0" encoding="utf-8"?>
<items total="0" termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
</items>`;

/** Volledige thing-respons met statistics. */
export const THING_XML_QWIXX = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="131260">
    <thumbnail>https://cf.geekdo-images.com/abc/img/thumb/pic1804000.jpg</thumbnail>
    <image>https://cf.geekdo-images.com/abc/img/original/pic1804000.jpg</image>
    <name type="alternate" sortindex="1" value="Qwixx: het dobbelspel"/>
    <name type="primary" sortindex="1" value="Qwixx"/>
    <description>Een snel dobbelspel.&amp;#10;&amp;#10;Kruis zoveel mogelijk vakjes af&amp;lt;br/&amp;gt;en scoor punten.</description>
    <yearpublished value="2012"/>
    <minplayers value="2"/>
    <maxplayers value="5"/>
    <playingtime value="15"/>
    <minplaytime value="15"/>
    <maxplaytime value="15"/>
    <link type="boardgamecategory" id="1017" value="Dice"/>
    <link type="boardgamemechanic" id="2072" value="Dice Rolling"/>
    <statistics page="1">
      <ratings>
        <average value="7.03812"/>
        <averageweight value="1.2153"/>
      </ratings>
    </statistics>
  </item>
</items>`;

/** Minimale thing-respons: geen statistics, geen jaartal, speelduur 0. */
export const THING_XML_MINIMAL = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
  <item type="boardgame" id="999002">
    <name type="primary" sortindex="1" value="Mozaa"/>
    <yearpublished value="0"/>
    <minplayers value="2"/>
    <maxplayers value="4"/>
    <playingtime value="0"/>
  </item>
</items>`;

/** Respons zonder item — BGG geeft dit bij een onbekend id. */
export const THING_XML_NO_ITEM = `<?xml version="1.0" encoding="utf-8"?>
<items termsofuse="https://boardgamegeek.com/xmlapi/termsofuse">
</items>`;
