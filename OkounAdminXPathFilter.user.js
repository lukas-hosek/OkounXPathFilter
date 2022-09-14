// ==UserScript==
// @name         echelon's admin xpath filter
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  blocks and deletes unwanted posts from okoun.cz
// @author       echelon
// @match        https://www.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @updateURL    https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://github.com/StigNygaard/GMCommonAPI.js/raw/master/GMCommonAPI.js
// ==/UserScript==


const defaultBanList = 'adijunkt, Bernhard_Weiss, bmn, Brandenburg, Bloodrot, Branimir, bretislav.jonas, d.smiricky, Dagobert_Durr, Das_Reich, florian_geyer, frantisek.kachna, Gotz_Berlichingen, Hajny_Filiburg, hamacek, Handschar, Hilfswilliger, horacek, Horst_Wessel, Charlemagne, Charlemagne_, Isidor, Januar, jarda.dusek, jasanek, Jurij_Ozerov, Kama, Karstjager, Koprovka, Knour, Kpt_Tuma, Landstorm_Netherland, Langemarck, Laser_eye, Lutzow, maqeo.cz, Maria_Theresia, mazurek, mazanej_lucifer, Mudrford, Neknubak, Nibelungen, Nord_, Norland, OberSturmKlippFurher, Oblazek, piANistka, Plch, Plsik_Liskovy, Polizei, pixicz, Prinz_Eugen, profesor_Birkermaier, Protez_alpska, prucha, ritna.diera, vojin.kouba, vonavka, Wallonien, Zufanek';
var ultradebilove;


function deletePosts()
{
    // Construct xpath query, selects all delete checkboxes in posts by users in the ban list
    let xPath = '//div[@class=\'meta\']/span[@class=\'user\' and (text() = \'' + ultradebilove[0] + '\'';
    for (let i = 1; i < ultradebilove.length; ++i)
    {
        xPath += ' or text() = \'' + ultradebilove[i] + '\'';
    }
    xPath += ')]/../span[@class=\'delete\']/input';

    let xPathResult = document.evaluate(xPath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    if (xPathResult.snapshotLength > 0)
    {
        // Click all checkboxes
        for (let i = 0; i < xPathResult.snapshotLength; ++i)
        {
            let checkbox = xPathResult.snapshotItem(i);
            checkbox.click();
        }

        let xPathDeleteForm = '//form[@name=\'markArticlesForm\' or @name=\'markMessagesForm\']';
        let deleteForm = document.evaluate(xPathDeleteForm, document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (deleteForm)
        {
            // Create an invisible iframe in which the deletion form will be executed
            let docBody = document.getElementById('body');
            let iframe = document.createElement('iframe');
            iframe.height = '1';
            iframe.width = '1';
            iframe.name='deletionIframe';
            iframe.id = 'deletionIframe';
            docBody.appendChild(iframe);
            let oldTarget = deleteForm.target;
            deleteForm.target='deletionIframe';
            deleteForm.submit();
            // Restore old form target so that delete works as usual
            deleteForm.target = oldTarget;
        }
    }
}


function stopImages()
{
    // Construct xpath query, selects all imgs in posts posted by people in the ban list
    let xPath = '//span[@class=\'user\' and (text() = \'' + ultradebilove[0] + '\'';
    for (let i = 1; i < ultradebilove.length; ++i)
    {
        xPath += ' or text() = \'' + ultradebilove[i] + '\'';
    }
    xPath += ')]/../..//img';
    let xPathResult = document.evaluate(xPath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

    // Set img.src to an empty string to stop loading. Works in Firefox.
    for (let i = xPathResult.snapshotLength-1; i >= 0; --i)
    {
        let elem = xPathResult.snapshotItem(i);
        elem.src='';
    }
}


function hidePosts()
{
    // Construct xpath query, selects all divs that contain <span class='user'>ultradebil</span>
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

async function parseBanList(response)
{
    if (!response.ok)
    {
        return;
    }
    let responseText = await response.text();
    let parser = new DOMParser();
    let doc = parser.parseFromString(responseText, 'text/html');
    if (doc.querySelector('parseerror'))
    {
        return;
    }
    let xdata = doc.getElementsByClassName('xdata');
    if (xdata.length != 1)
    {
        return;
    }
    let banArray = xdata[0].textContent.split(', ');
    if (banArray.length < 5)
    {
        // just a sanity check
        return;
    }
    GMC.setValue('bannedUsers', xdata[0].textContent);
    console.log(`Banlist updated, ${banArray.length} records`);
}


function updateBanList()
{
  	let updateTimestamp = parseInt(GMC.getValue('updateTimestamp', 0));
    let currentTimestamp = Date.now();
  	let updateInterval = 1 * 60 * 60 * 1000;
    if (updateTimestamp + updateInterval > currentTimestamp)
    {
        // List is sufficiently up to date
      return;
    }
    GMC.setValue('updateTimestamp', currentTimestamp);

    fetch('https://www.okoun.cz/boards/seznam_parazitu').then(res => parseBanList(res));
}


(function() {
    'use strict';

    let listOfBannedUsers = GMC.getValue('bannedUsers', defaultBanList);
    ultradebilove = listOfBannedUsers.split(', ');
    console.log(`${ultradebilove.length} records`);

    deletePosts();
    stopImages();
    hidePosts();

    updateBanList();
})();