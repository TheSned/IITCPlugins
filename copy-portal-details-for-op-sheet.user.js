// ==UserScript==
// @id copy-portal-details-for-op-sheet
// @name IITC Plugin: Copy Portal Details for Op Sheet
// @category Misc
// @version 1.0.0
// @namespace https://iitc.me
// @description Copies Portal Name, URL, and GUID to the clipboard separated by tabs
// @author TheSned
// @include        *://*.ingress.com/intel*
// @include        *://*.ingress.com/mission/*
// @include        *://intel.ingress.com/*
// @match          *://*.ingress.com/intel*
// @match          *://*.ingress.com/mission/*
// @match          *://intel.ingress.com/*
// @grant          none
// ==/UserScript==

// Wrapper function that will be stringified and injected
// into the document. Because of this, normal closure rules
// do not apply here.
function wrapper(plugin_info) {
  // Make sure that window.plugin exists. IITC defines it as a no-op function,
  // and other plugins assume the same.
  if (typeof window.plugin !== 'function') window.plugin = function() {};

  // Use own namespace for plugin
  window.plugin.copyPortalDetails = function() {};

  // Name of the IITC build for first-party plugins
  plugin_info.buildName = 'copyPortalDetails';

  // Datetime-derived version of the plugin
  plugin_info.dateTimeVersion = '20190216003500';

  // ID/name of the plugin
  plugin_info.pluginId = 'copyPortalDetails';

  // The entry point for this plugin.
  function setup() {
    let notificationCss = '.ps-notification{width:200px;height:20px;height:auto;position:absolute;left:50%;margin-left:-100px;top:20px;z-index:10000;background-color: #383838;color: #F0F0F0;font-family: Calibri;font-size: 20px;padding:10px;text-align:center;border-radius: 2px;-webkit-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);-moz-box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);box-shadow: 0px 0px 24px -1px rgba(56, 56, 56, 1);}';
    $('head').append("<style>" + notificationCss + "</style>");
    $('body').append("<div class='ps-notification' style='display:none'>Portal Details Copied</div>");
    window.addHook('portalDetailsUpdated', window.plugin.copyPortalDetails.addToSidebar);
  }

  window.plugin.copyPortalDetails.addToSidebar = function() {
    $('.linkdetails').append('<aside><a id="portal-details" onclick="window.plugin.copyPortalDetails.copyPortalDetails(\'' + window.selectedPortal + '\', event);return false;">Portal Details</a></aside>');
  };

  window.plugin.copyPortalDetails.copyPortalDetails = function(guid, event) {

    let portalDetails = portalDetail.get(guid);
    let p_name = "";
    
    if(guid === window.selectedPortal){
      p_name = $('#portaldetails .title').first().text();
    } else if(guid !== window.selectedPortal && event !== undefined) {
      p_name = $(event.currentTarget).parents().siblings('div.mpv-linkdetails[data-portal-title]').data('portal-title');
      if(p_name === undefined){
        p_name = $(event.currentTarget).parents().siblings('h3.mpv-title').text();
      }
    }

    let p_latE6 = portalDetails.latE6;
    let p_lngE6 = portalDetails.lngE6;

    let copyPortalDetailsText = '';
    copyPortalDetailsText += p_name + '\t';
    copyPortalDetailsText += 'https://intel.ingress.com/intel?ll=' + p_latE6 / 1E6 + ',' + p_lngE6 / 1E6 + '&z=17&pll=' + p_latE6 / 1E6 + ',' + p_lngE6 / 1E6 + '\t';
    copyPortalDetailsText += guid;
    
    
    if(document.queryCommandSupported('copy')){
      $('body').append('<textarea class="portal-details-textarea">' + copyPortalDetailsText + '</textarea>');
      $('.portal-details-textarea').select();
      document.execCommand('copy');
      $('.portal-details-textarea').remove();
      $('.ps-notification').fadeIn(400).delay(3000).fadeOut(400);
    } else {
      // Todo, iPhone fix
    }
  };

  // Add an info property for IITC's plugin system
  setup.info = plugin_info;

  // Make sure window.bootPlugins exists and is an array
  if (!window.bootPlugins) window.bootPlugins = [];
  // Add our startup hook
  window.bootPlugins.push(setup);
  // If IITC has already booted, immediately run the 'setup' function
  if (window.iitcLoaded && typeof setup === 'function') setup();
}


// Create a script element to hold our content script
var script = document.createElement('script');
var info = {};

// GM_info is defined by the assorted monkey-themed browser extensions
// and holds information parsed from the script header.
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}

// Create a text node and our IIFE inside of it
var textContent = document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ')');
// Add some content to the script element
script.appendChild(textContent);
// Finally, inject it... wherever.
(document.body || document.head || document.documentElement).appendChild(script);
