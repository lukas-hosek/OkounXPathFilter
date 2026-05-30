// ==UserScript==
// @name         Echelonův filtr
// @namespace    http://tampermonkey.net/
// @version      0.23
// @description  blocks and deletes unwanted posts from okoun.cz
// @author       echelon
// @match        https://*.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @updateURL    https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounAdminXPathFilter.user.js
// @run-at       document-end
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @require      https://github.com/StigNygaard/GMCommonAPI.js/raw/b1b872f8faa6be3f55ee5ba8015d1d991a5fda85/GMCommonAPI.js
// ==/UserScript==


// 1x1 transparent GIF. Assigning this to img.src aborts an in-progress image
// download (e.g. a >100 MB image) without re-requesting the page like src="" would.
const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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


function injectPluginStyles()
{
    let style = document.createElement("style");
    style.textContent = `
#pluginWidget {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    width: 320px;
    box-sizing: border-box;
    background: #fff;
    border: 1px solid #b0b0b0;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    padding: 0 16px 14px 16px;
    font: 13px/1.5 sans-serif;
    color: #222;
}
#pluginWidget .pluginTitle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 -16px 12px -16px;
    padding: 4px 6px 4px 14px;
    background: #3b5070;
    color: #fff;
    font-size: 14px;
    font-weight: bold;
    border-radius: 7px 7px 0 0;
}
#pluginWidget .pluginClose {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 20px;
    height: 20px;
    margin: 0;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 4px;
    background: transparent;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    padding: 0;
}
#pluginWidget .pluginClose:hover {
    background: rgba(255, 255, 255, 0.2);
}
#pluginWidget label {
    display: block;
    margin: 4px 0;
    cursor: pointer;
}
#pluginWidget label.indent {
    margin-left: 20px;
}
#pluginWidget input[type="checkbox"] {
    margin-right: 6px;
    vertical-align: middle;
}
#pluginWidget button {
    width: 100%;
    padding: 6px 10px;
    margin-bottom: 10px;
    background: #f5f5f5;
    border: 1px solid #b0b0b0;
    border-radius: 4px;
    cursor: pointer;
    font: inherit;
}
#pluginWidget button:hover {
    background: #e8e8e8;
}
#pluginWidget textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 80px;
    margin-top: 4px;
    padding: 6px;
    border: 1px solid #b0b0b0;
    border-radius: 4px;
    font: inherit;
    resize: vertical;
}
#pluginWidget .fieldLabel {
    display: block;
    margin-top: 8px;
    font-weight: bold;
}
`;
    document.head.appendChild(style);
}


function createPluginWidget()
{
    let xPath = "//div[@class='head']/div[@class='user']/a";
    let nastaveniA = document.evaluate(xPath, document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!nastaveniA)
    {
        return null;
    }

    injectPluginStyles();

    // Create "Pluginy" in page head
    let separatorNode = document.createTextNode(" | ");
    nastaveniA.after(separatorNode);
    let confToggleNode = document.createElement("a");
    confToggleNode.addEventListener("click", togglePluginWidgetVisibility);
    confToggleNode.href="#0";
    confToggleNode.innerText = "Pluginy";
    separatorNode.after(confToggleNode);

    // Create the floating widget. position:fixed (via CSS) keeps it out of the
    // document flow so it overlays the page instead of expanding the layout.
    let pluginWidget = document.createElement("div");
    pluginWidget.id = "pluginWidget";
    pluginWidget.style.display = "none";
    document.body.appendChild(pluginWidget);
    return pluginWidget;
}


function getPluginWidgetNode()
{
    let pluginWidget = document.getElementById("pluginWidget");
    return pluginWidget ? pluginWidget : createPluginWidget();
}

// The filter code itself

function buildRegex(blackList)
{
    const matchNothing = /(?!)/;
    if (blackList.length === 0)
    {
        // No patterns => match nothing, so we don't delete / hide everything.
        return matchNothing;
    }
    let regex = new RegExp("(" + blackList.join("|") + ")", "i");
    if (regex.test(""))
    {
        // Sanity check: if an empty string matches, something's terribly wrong.
        return matchNothing;
    }
    return regex;
}


function deletePosts(blackList)
{
    let regex = buildRegex(blackList);

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
    let regex = buildRegex(blackList);

    for (let span of document.querySelectorAll("span.user"))
    {
        if (regex.test(span.innerText))
        {
            let div = span.parentNode.parentNode;
            let imgs = div.getElementsByTagName("img")
            for (let img of imgs)
            {
                // Abort any in-progress image download before hiding/removing the post.
                img.src = BLANK_IMAGE;
                img.removeAttribute("srcset"); // src is ignored when srcset is present
            }
            if (minimizeOnly) {
                div.style.height = '1.5em';
                div.style.overflow = 'hidden';
                div.style.border = '1px solid gray';
                div.style.opacity = '0.5';
                div.onclick = function () {
                    if (div.style.height === '1.5em') {
                        div.style.height = '';
                    } else {
                        div.style.height = '1.5em';
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


function patternListToRegexArray(patternList)
{
    if (patternList.trim().length > 0)
    {
        let patternArray = patternList.split(",");
        // Drop empty entries so a stray comma can't accidentally inject a pattern that matches everything
        return patternArray.map(str => str.trim()).filter(str => str.length > 0);
    }
    else
    {
        return [];
    }
}


function escapeRegex(str)
{
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}


function userListToRegexArray(userList)
{
    if (userList.trim().length > 0)
    {
        let userArray = userList.split(",");
        return userArray.map(str => "^" + escapeRegex(str.trim()) + "$");
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


function addCheckbox(name, defaultVal, pluginNode, indent)
{
    let label = document.createElement("label");
    if (indent)
    {
        label.className = "indent";
    }
    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    checkBox.checked = getStorageValue(name, defaultVal ? "true" : "false") == "true";
    checkBox.addEventListener("change", event => onCheckboxToggle(name, event.target.checked));
    label.append(checkBox);
    label.append(document.createTextNode(name));
    pluginNode.append(label);
}


function onTextAreaChange(confName, value)
{
    setStorageValue(confName, value);
}


function addTextArea(name, defaultVal, pluginNode)
{
    let fieldLabel = document.createElement("span");
    fieldLabel.className = "fieldLabel";
    fieldLabel.innerText = name;
    pluginNode.append(fieldLabel);
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
    title.className = "pluginTitle";
    pluginNode.append(title);

    let titleText = document.createElement("span");
    titleText.innerText = "Echelonův filtr " + GM_info.script.version;
    title.append(titleText);

    let closeButton = document.createElement("button");
    closeButton.className = "pluginClose";
    closeButton.type = "button";
    closeButton.innerText = "✕";
    closeButton.title = "Zavřít";
    closeButton.addEventListener("click", togglePluginWidgetVisibility);
    title.append(closeButton);

    addButton("Zkontrolovat aktualizace blacklistu", event => updateBlackList(true), pluginNode);
    addCheckbox("Schovávat", true, pluginNode);
    addCheckbox("Jen minimalizovat", false, pluginNode, true);
    addCheckbox("Mazat", true, pluginNode);
    addCheckbox("I z vlastního filtru ⚠️", false, pluginNode, true);

    addTextArea("Vlastní filtr", "testovaci.kakes", pluginNode);
}


function hideSidebar()
{
    let hideReqDiv = document.getElementsByClassName("HideSidebar");
    if (hideReqDiv.length != 1)
    {
        return;
    }
    let sidebar = document.getElementsByClassName("yui-u ctx");
    if (sidebar.length != 1)
    {
        return;
    }
    sidebar[0].parentNode.removeChild(sidebar[0]);
    let mainDiv = document.getElementsByClassName("yui-u yui-ge first main");
    if (mainDiv.length != 1)
    {
        return;
    }
    mainDiv[0].style.width = '100%';
}



(function() {
    'use strict';

    let blackListString = getStorageValue("bannedUsers", defaultBlackList);
    let regexListString = getStorageValue("bannedPatterns", defaultRegexList);

    let blackList = userListToRegexArray(blackListString).concat(patternListToRegexArray(regexListString));

    let customBlackListString = getStorageValue("Vlastní filtr", "testovaci.kakes");
    let customBlackList = userListToRegexArray(customBlackListString);

    let filteringEnabled = getStorageValue("Schovávat", "true") == "true";
    let minimizeOnly = getStorageValue("Jen minimalizovat", "false") == "true";
    let deletingEnabled = getStorageValue("Mazat", "true") == "true";
    let customDeletingEnabled = getStorageValue("I z vlastního filtru ⚠️", "false") == "true";

    hideSidebar();

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
