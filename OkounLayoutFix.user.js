// ==UserScript==
// @name         Okoun layout fix
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  try to take over the world!
// @author       echelon
// @match        https://www.okoun.cz/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=okoun.cz
// @downloadURL  https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounLayoutFix.user.js
// @updateURL    https://github.com/lukas-hosek/OkounXPathFilter/raw/main/OkounLayoutFix.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://github.com/StigNygaard/GMCommonAPI.js/raw/master/GMCommonAPI.js
// ==/UserScript==

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

function addCheckbox(name, defaultVal, pluginNode)
{
    let checkBox = document.createElement("input");
    checkBox.type = "checkbox";
    checkBox.checked = GMC.getValue(name, defaultVal ? "true" : "false") == "true";
    checkBox.addEventListener("change", event => onCheckboxToggle(name, event.target.checked));
    pluginNode.append(checkBox);
    pluginNode.append(document.createTextNode(name));
}

function layoutUnbreak()
{
    for (let i= 0; i < document.styleSheets.length; ++i)
    {
        let sheet = document.styleSheets.item(i);
        for (let j = 2; j < sheet.cssRules.length; ++j)
        {
            let rule = sheet.cssRules.item(j);
            if (rule.selectorText == "#body")
            {
                rule.style.maxWidth="";
            }
        }
    }
}

function addPluginSettings(pluginNode)
{
    let title = document.createElement("div");
    title.innerText = "Layout fixy";
    pluginNode.append(title);

    addCheckbox("No max width", true, pluginNode);
}

(function() {
    'use strict';

    let bodyUnbreakEnabled = GMC.getValue("No max width", "true") == "true";

    if (bodyUnbreakEnabled)
    {
        layoutUnbreak();
    }

    layoutUnbreak();

    addPluginSettings(getPluginWidgetNode());
})();