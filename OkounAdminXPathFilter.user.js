// ==UserScript==
// @name         echelon's admin xpath filter
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       You
// @match        https://www.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @updateURL    https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @grant        none
// ==/UserScript==


const ultradebilove = ['adijunkt', 'Bernhard_Weiss', 'bmn', 'Brandenburg', 'Branimir', 'bretislav.jonas', 'd.smiricky', 'Dagobert_Durr', 'Das_Reich', 'florian_geyer', 'frantisek.kachna', 'Gotz_Berlichingen', 'Hajny_Filiburg', 'hamacek', 'Handschar', 'Hilfswilliger', 'horacek', 'Horst_Wessel', 'Charlemagne', 'Charlemagne_', 'Isidor', 'Januar', 'jarda.dusek', 'jasanek', 'Jurij_Ozerov', 'Kama', 'Karstjager', 'Koprovka', 'Knour', 'Kpt_Tuma', 'Landstorm_Netherland', 'Langemarck', 'Laser_eye', 'Lutzow', 'maqeo.cz', 'Maria_Theresia', 'mazurek', 'mazanej_lucifer', 'Mudrford', 'Neknubak', 'Nibelungen', 'Nord_', 'Norland', 'OberSturmKlippFurher', 'Oblazek', 'piANistka', 'Plch', 'Plsik_Liskovy', 'Polizei', 'pixicz', 'Prinz_Eugen', 'profesor_Birkermaier', 'Protez_alpska', 'prucha', 'ritna.diera', 'vojin.kouba', 'vonavka', 'Wallonien', 'Zufanek'];

function deletePosts()
{
    // construct xpath query, selects all divs that contain <span class='user'>ultradebil</span>
    let xPath = '//div[@class=\'meta\']/span[@class=\'user\' and (text() = \'' + ultradebilove[0] + '\'';
    for (let i = 1; i < ultradebilove.length; ++i)
    {
        xPath += ' or text() = \'' + ultradebilove[i] + '\'';
    }
    xPath += ')]/../span[@class=\'delete\']/input';
    //xPath += ')]/..';

    console.log(xPath);

    let xPathResult = document.evaluate(xPath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    console.log(xPathResult.snapshotLength);

    if (xPathResult.snapshotLength > 0)
    {
        for (let i = 0; i < xPathResult.snapshotLength; ++i)
        {
            let checkbox = xPathResult.snapshotItem(i);

            checkbox.click();
        }

        let xPathDeleteForm = '//form[@name=\'markArticlesForm\' or @name=\'markMessagesForm\']';
        let deleteForm = document.evaluate(xPathDeleteForm, document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (deleteForm)
        {

            let docBody = document.getElementById('body');
            let iframe = document.createElement('iframe');
            iframe.height = '1';
            iframe.width = '1';
            iframe.name='deletionIframe';
            iframe.id = 'deletionIframe';
            docBody.appendChild(iframe);

            deleteForm.target='deletionIframe';
            deleteForm.submit();
        }

    }
}

function hidePosts()
{
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
}

(function() {
    'use strict';

    deletePosts(ultradebilove);
    hidePosts(ultradebilove);
})();