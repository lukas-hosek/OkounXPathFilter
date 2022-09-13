// ==UserScript==
// @name         echelon's xpath filter
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  try to take over the world!
// @author       You
// @match        https://www.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://raw.githubusercontent.com/lukas-hosek/OkounXPathFilter/main/OkounXPathFilter.user.js#bypass=true
// @updateURL    https://raw.githubusercontent.com/lukas-hosek/OkounXPathFilter/main/OkounXPathFilter.user.js#bypass=true
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    let ultradebilove = ['adijunkt', 'Bernhard_Weiss', 'bmn', 'Brandenburg', 'Branimir', 'bretislav.jonas', 'd.smiricky', 'Dagobert_Durr', 'Das_Reich', 'florian_geyer', 'frantisek.kachna', 'Gotz_Berlichingen', 'Hajny_Filiburg', 'hamacek', 'Handschar', 'Hilfswilliger', 'horacek', 'Horst_Wessel', 'Charlemagne', 'Charlemagne_', 'Isidor', 'Januar', 'jarda.dusek', 'jasanek', 'Jurij_Ozerov', 'Kama', 'Karstjager', 'Koprovka', 'Knour', 'Kpt_Tuma', 'Landstorm_Netherland', 'Langemarck', 'Laser_eye', 'Lutzow', 'maqeo.cz', 'Maria_Theresia', 'mazurek', 'mazanej_lucifer', 'Mudrford', 'Neknubak', 'Nibelungen', 'Nord_', 'Norland', 'OberSturmKlippFurher', 'Oblazek', 'piANistka', 'Plch', 'Plsik_Liskovy', 'Polizei', 'pixicz', 'Prinz_Eugen', 'profesor_Birkermaier', 'Protez_alpska', 'prucha', 'ritna.diera', 'vojin.kouba', 'vonavka', 'Wallonien', 'Zufanek'];

    // construct xpath query, selects all divs that contain <span class='user'>ultradebil</span>
    let xPath = '//span[@class=\'user\' and (text() = \'' + ultradebilove[0] + '\'';
    for (let i = 1; i < ultradebilove.length; ++i)
    {
        xPath += ' or text() = \'' + ultradebilove[i] + '\'';
    }
    xPath += ')]/../..';

    let xPathResult = document.evaluate(xPath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    // delete all found divs, starting with oldest so that we don't invalidate newer query results
    for (let i = xPathResult.snapshotLength-1; i >= 0; --i)
    {
        let elem = xPathResult.snapshotItem(i);
        elem.parentNode.removeChild(elem);
    }

})();