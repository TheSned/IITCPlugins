// ==UserScript==
// @id             portal-link-copy@sned
// @name           IITC plugin: Portal Link Copy
// @category       Tweaks
// @version        1.0.1.20170812.30832
// @namespace      https://github.com/jonatkins/ingress-intel-total-conversion
// @description    [local-2017-08-12-030832] Click the portal link to copy it to the clipboard.
// @include        https://*.ingress.com/intel*
// @include        http://*.ingress.com/intel*
// @match          https://*.ingress.com/intel*
// @match          http://*.ingress.com/intel*
// @include        https://*.ingress.com/mission/*
// @include        http://*.ingress.com/mission/*
// @match          https://*.ingress.com/mission/*
// @match          http://*.ingress.com/mission/*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
plugin_info.buildName = 'local';
plugin_info.dateTimeVersion = '20170812.30832';
plugin_info.pluginId = 'portal-link-copy';
//END PLUGIN AUTHORS NOTE



// PLUGIN START ////////////////////////////////////////////////////////

window.plugin.portalLinkCopy = {};

window.plugin.portalLinkCopy.setup = function() {
  var notifcationCSS = '.cpl-notification{width:200px;height:20px;height:auto;position:absolute;left:50%;margin-left:-100px;top:20px;z-index:10000;background-color: #383838;color: #F0F0F0;font-family: Calibri;font-size: 20px;padding:10px;text-align:center;border-radius: 2px;-webkit-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);-moz-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);}';
  $('head').append("<style>" + notifcationCSS + "</style>");
  $('body').append("<div class='cpl-notification' style='display:none'>Portal Link Copied</div>");

  window.addHook('portalDetailsUpdated', function(e) {
    $('#portaldetails .linkdetails a').each(function() {
      if($(this).text() === 'Portal link') {
        $(this).click(function(e) {
          if(document.queryCommandSupported('copy')){
            $('body').append('<textarea class="copy-portal-link-textarea">' + this.href + '</textarea>');
            $('.copy-portal-link-textarea').select();
            document.execCommand('copy');
            $('.copy-portal-link-textarea').remove();
            $('.cpl-notification').fadeIn(400).delay(3000).fadeOut(400);
            e.preventDefault();
            e.stopImmediatePropagation();
          }
        });
      }
    });
  });
};
var setup = window.plugin.portalLinkCopy.setup;

// PLUGIN END //////////////////////////////////////////////////////////


setup.info = plugin_info; //add the script info data to the function as a property
if(!window.bootPlugins) window.bootPlugins = [];
window.bootPlugins.push(setup);
// if IITC has already booted, immediately run the 'setup' function
if(window.iitcLoaded && typeof setup === 'function') setup();
} // wrapper end
// inject code into site context
var script = document.createElement('script');
var info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) info.script = { version: GM_info.script.version, name: GM_info.script.name, description: GM_info.script.description };
script.appendChild(document.createTextNode('('+ wrapper +')('+JSON.stringify(info)+');'));
(document.body || document.head || document.documentElement).appendChild(script);

