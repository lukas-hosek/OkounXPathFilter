// ==UserScript==
// @name         Echelonův filtr
// @namespace    http://tampermonkey.net/
// @version      0.17
// @description  blocks and deletes unwanted posts from okoun.cz
// @author       echelon
// @match        https://www.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @updateURL    https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://github.com/StigNygaard/GMCommonAPI.js/raw/master/GMCommonAPI.js
// ==/UserScript==


const defaultBlackList = 'adijunkt, Bernhard_Weiss, bmn, Brandenburg, Bloodrot, Branimir, bretislav.jonas, d.smiricky, Dagobert_Durr, Das_Reich, florian_geyer, frantisek.kachna, Gotz_Berlichingen, Hajny_Filiburg, hamacek, Handschar, Hilfswilliger, horacek, Horst_Wessel, Charlemagne, Charlemagne_, Isidor, Januar, jarda.dusek, jasanek, Jurij_Ozerov, Kama, Karstjager, Koprovka, Knour, Kpt_Tuma, Landstorm_Netherland, Langemarck, Laser_eye, Lutzow, maqeo.cz, Maria_Theresia, mazurek, mazanej_lucifer, Mudrford, Neknubak, Nibelungen, Nord_, Norland, OberSturmKlippFurher, Oblazek, piANistka, Plch, Plsik_Liskovy, Polizei, pixicz, Prinz_Eugen, profesor_Birkermaier, Protez_alpska, prucha, ritna.diera, vojin.kouba, vonavka, Wallonien, Zufanek';
const defaultRegexList = 'kouba$';

// storage access
function getStorageValue(key, defaultvalue) {
    try {
        return GMC.getValue(key, defaultvalue)
    } catch { // fallback to local storage, for GMC does not seem to work in Stay/Safari, hell knows why
        let val=unsafeWindow.localStorage.getItem('cz.ocs.EchelonScriptPrivateData.'+key) // unsafeWindow needed to fix opening new tabs, see thread https://www.okoun.cz/boards/ryba_bez_parazitu?rootId=1072120407#article-1072133489
        if (val===null) val=defaultvalue
        return val
    }
}
function setStorageValue(key, value) {
    try {
        GMC.setValue(key, value)
    } catch { // see above
        unsafeWindow.localStorage.setItem('cz.ocs.EchelonScriptPrivateData.'+key, value)
    }
}

// Plugin registration

function togglePluginWidgetVisibility()
{
    let pluginWidget = document.getElementById("pluginWidget");
    pluginWidget.style.display = pluginWidget.style.display == "none" ? "block" : "none";
}


function createPluginWidget()
{
    let xPath = "//div[@class='head']/div[@class='user']/a";
    let nastaveniA = document.evaluate(xPath, document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!nastaveniA)
    {
        return null;
    }

    // Create "Pluginy" in page head
    let separatorNode = document.createTextNode(" | ");
    nastaveniA.after(separatorNode);
    let confToggleNode = document.createElement("a");
    confToggleNode.addEventListener("click", togglePluginWidgetVisibility);
    confToggleNode.href="#0";
    confToggleNode.innerText = "Pluginy";
    separatorNode.after(confToggleNode);

    // Create the floating widget
    let pluginWidget = document.createElement("div");
    pluginWidget.id = "pluginWidget";
    pluginWidget.style = "background-color:white; border: 2px solid black; padding: 10px; float:right; display:none;";
    separatorNode.parentNode.after(pluginWidget);
    return pluginWidget;
}


function getPluginWidgetNode()
{
    let pluginWidget = document.getElementById("pluginWidget");
    return pluginWidget ? pluginWidget : createPluginWidget();
}

// The filter code itself

function deletePosts(blackList)
{
    let regexString = "(" + blackList.join("|")+")";
    let regex = new RegExp(regexString, "i");

    let selectedPosts = 0;
    for (let span of document.querySelectorAll("span.user"))
    {
        let testResult = regex.test(span.innerText);
        let div = span.parentNode.parentNode;
        let checkboxes = div.getElementsByTagName("input");
        for (let checkbox of checkboxes)
        {
            if (checkbox.type != "checkbox")
            {
                continue;
            }
            checkbox.checked = testResult;
            if (testResult)
            {
                ++selectedPosts;
            }
        }
    }
    if (selectedPosts > 0)
    {
        let xPathDeleteForm = "//form[@name='markArticlesForm' or @name='markMessagesForm']";
        let deleteForm = document.evaluate(xPathDeleteForm, document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (deleteForm)
        {
            console.log(`Deleting ${selectedPosts} posts`);
            // Create an invisible iframe in which the deletion form will be executed
            let docBody = document.getElementById("body");
            let iframe = document.createElement("iframe");
            iframe.height = "1";
            iframe.width = "1";
            iframe.name = "deletionIframe";
            iframe.id = "deletionIframe";
            docBody.appendChild(iframe);
            let oldTarget = deleteForm.target;
            deleteForm.target = "deletionIframe";
            deleteForm.submit();
            // Restore old form target so that delete works as usual
            deleteForm.target = oldTarget;
        }
    }
}


function hidePostsRegex(blackList, minimizeOnly)
{
    let regexString = "(" + blackList.join("|")+")";
    let regex = new RegExp(regexString, "i");

    for (let span of document.querySelectorAll("span.user"))
    {
        if (regex.test(span.innerText))
        {
            let div = span.parentNode.parentNode;
            let imgs = div.getElementsByTagName("img")
            for (let img of imgs)
            {
                img.src="";
            }
            if (minimizeOnly) {
                div.style.height = '1.5em';
                div.style.overflow = 'hidden';
                div.style.border = '1px solid gray';
                div.style.opacity = '0.5';
                div.onclick = function () {
                    if (div.style.height === '') {
                        div.style.height = '2em';
                    } else {
                        div.style.height = '';
                    }
                }
            } else {
                div.parentNode.removeChild(div);
            }
        }
    }
}


function rot13(message)
{
  const alpha = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLM';
  return message.replace(/[a-z]/gi, letter => alpha[alpha.indexOf(letter) + 13]);
}


async function parseBlackList(response)
{
    if (!response.ok)
    {
        return;
    }
    let responseText = await response.text();
    let parser = new DOMParser();
    let doc = parser.parseFromString(responseText, "text/html");
    if (doc.querySelector("parseerror"))
    {
        return;
    }
    let xdata = doc.getElementsByClassName("xdata");
    let usersArray = [];
    let patternsArray = [];
    if (xdata.length == 1)
    {
        usersArray = xdata[0].textContent.split(", ");
        if (usersArray.length > 2)
        {
            setStorageValue("bannedUsers", xdata[0].textContent);
        }

    }
    let regexCyphertext = doc.getElementsByClassName("extdata");
    if (regexCyphertext.length == 1)
    {
        let asciidata = atob(rot13(regexCyphertext[0].title));
        patternsArray = asciidata.split(",");
        if (patternsArray.length > 2)
        {
            setStorageValue("bannedPatterns", asciidata);
        }
    }

    console.log(`Blacklist updated, ${usersArray.length} records, ${patternsArray.length} patterns`);
}


function updateBlackList(force)
{
  	// Skip if we're not logged in
    if (document.getElementsByClassName("login").length > 0)
    {
        return;
    }

    let updateTimestamp = parseInt(getStorageValue("updateTimestamp", 0));
    let currentTimestamp = Date.now();
  	let updateInterval = 30 * 60 * 1000;
    if (updateTimestamp + updateInterval > currentTimestamp && !force)
    {
        // List is sufficiently up to date
      return;
    }
    setStorageValue("updateTimestamp", currentTimestamp);

    // wouldn't it be better to open "...?searchedStrings="? Compare https://www.okoun.cz/boards/jak_na_okouna?contextId=1072808500#article-1072808500 tho!
    fetch("https://www.okoun.cz/boards/ryba_bez_parazitu?contextId=1071957010#article-1071957010").then(res => parseBlackList(res));
}


function userListToArray(userList)
{
    if (userList.trim().length > 0)
    {
        let userArray = userList.split(",");
        return userArray.map(str => str.trim());
    }
    else
    {
        return [];
    }
}


function userListToRegexArray(userList)
{
    if (userList.trim().length > 0)
    {
        let userArray = userList.split(",");
        return userArray.map(str => "^" + str.trim().replace(".", "\.") + "$");
    }
    else
    {
        return [];
    }
}


// Configuration support functions

function onCheckboxToggle(confName, value)
{
    setStorageValue(confName, value ? "true" : "false");
}


function addCheckbox(name, defaultVal, pluginNode)
{
    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    checkBox.checked = getStorageValue(name, defaultVal ? "true" : "false") == "true";
    checkBox.addEventListener("change", event => onCheckboxToggle(name, event.target.checked));
    pluginNode.append(checkBox);
    pluginNode.append(document.createTextNode(name));
}


function onTextAreaChange(confName, value)
{
    setStorageValue(confName, value);
}


function addTextArea(name, defaultVal, pluginNode)
{
    pluginNode.append(document.createTextNode(name));
    pluginNode.append(document.createElement("br"));
    let textArea = document.createElement("textarea");
    textArea.value = getStorageValue(name, defaultVal);
    textArea.addEventListener("change", event => onTextAreaChange(name, event.target.value));
    pluginNode.append(textArea);
}


function addButton(name, callback, pluginNode)
{
    let button = document.createElement("button");
    button.innerText = name;
    button.type = "button";
    button.addEventListener("click", callback);
    pluginNode.append(button);
}


function addPluginSettings(pluginNode)
{
    let title = document.createElement("div");
    title.innerText = "Echelonův filtr " + GM_info.script.version;
    pluginNode.append(title);

    addButton("Zkontrolovat aktualizace blacklistu", event => updateBlackList(true), pluginNode);
    pluginNode.append(document.createElement("br"));
    addCheckbox("Schovávat", true, pluginNode);
    pluginNode.append(document.createElement("br"));
    pluginNode.append(document.createTextNode("\xa0\xa0"));
    addCheckbox("Jen minimalizovat", false, pluginNode);
    pluginNode.append(document.createElement("br"));
    addCheckbox("Mazat", true, pluginNode);
    pluginNode.append(document.createElement("br"));
    pluginNode.append(document.createTextNode("\xa0\xa0"));
    addCheckbox("I z vlastního filtru ⚠️", false, pluginNode);
    pluginNode.append(document.createElement("br"));

    addTextArea("Vlastní filtr", "testovaci.kakes", pluginNode);
}



(function() {
    'use strict';

    let blackListString = getStorageValue("bannedUsers", defaultBlackList);
    let regexListString = getStorageValue("bannedPatterns", defaultRegexList);

    let blackList = userListToRegexArray(blackListString).concat(userListToArray(regexListString));

    let customBlackListString = getStorageValue("Vlastní filtr", "testovaci.kakes");
    let customBlackList = userListToRegexArray(customBlackListString);

    let filteringEnabled = getStorageValue("Schovávat", "true") == "true";
    let minimizeOnly = getStorageValue("Jen minimalizovat", "true") == "true";
    let deletingEnabled = getStorageValue("Mazat", "true") == "true";
    let customDeletingEnabled = getStorageValue("I z vlastního filtru ⚠️", "false") == "true";

    if (deletingEnabled)
    {
        let array = customDeletingEnabled ? blackList.concat(customBlackList) : blackList;
        deletePosts(array);
    }
    if (filteringEnabled)
    {
        let array = blackList.concat(customBlackList);
        hidePostsRegex(array, minimizeOnly);
    }

    addPluginSettings(getPluginWidgetNode());

    updateBlackList(false);
})();
