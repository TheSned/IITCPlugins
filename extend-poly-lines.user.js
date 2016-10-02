// ==UserScript==
// @id             extend-poly-lines@dsnedecor
// @name           IITC plugin: Extend Polygon Lines
// @category       Layer
// @version        0.0.5
// @updateURL      https://raw.githubusercontent.com/TheSned/IITCPlugins/master/extend-poly-lines.meta.js
// @downloadURL    https://raw.githubusercontent.com/TheSned/IITCPlugins/master/extend-poly-lines.user.js
// @description    Extends the lines of a polygon out past their vertices. Useful for determining which portals can be used for a layered field. drawTools Required.
// @include        https://www.ingress.com/intel*
// @include        http://www.ingress.com/intel*
// @match          https://www.ingress.com/intel*
// @match          http://www.ingress.com/intel*
// @grant          none
// ==/UserScript==


function wrapper(plugin_info) {
// ensure plugin framework is there, even if iitc is not yet loaded
if(typeof window.plugin !== 'function') window.plugin = function() {};

//PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
//(leaving them in place might break the 'About IITC' page or break update checks)
//plugin_info.buildName = 'jonatkins';
//plugin_info.dateTimeVersion = '20140815.141737';
//plugin_info.pluginId = 'extend-poly-lines';
//END PLUGIN AUTHORS NOTE

// PLUGIN START ////////////////////////////////////////////////////////

  /* whatsnew
   * 0.0.1 : initial release, runs with drawtools plugin installed, takes completed polygon(s) and then runs standard Fly Links logic.
   *
   * This is a hacked together version of the IITC plugin: Fly Links (v0.2.1.20140815.141737) http://iitc.jonatkins.com/release/plugins/fly-links.user.js
   *
   * todo : 
   *  -polygons currently handled as "rectanges", thus outlying portals from polygons can slip in - need to find a way to calculate incusion to a true polygon
   */

// use own namespace for plugin
window.plugin.extendPolyLines = function() {};

// const values

// zoom level used for projecting points between latLng and pixel coordinates. may affect precision of triangulation
window.plugin.extendPolyLines.PROJECT_ZOOM = 16;


window.plugin.extendPolyLines.linesLayerGroup = null;

window.plugin.extendPolyLines.updateLayer = function() {
  if (!window.map.hasLayer(window.plugin.extendPolyLines.linesLayerGroup))
    return;
  
  
  // From Leaflet.Geodesic (https://github.com/henrythasler/Leaflet.Geodesic/) 
  var vincenty_inverse =  function (p1, p2) {
    var φ1 = p1.lat.toRadians(), λ1 = p1.lng.toRadians();
    var φ2 = p2.lat.toRadians(), λ2 = p2.lng.toRadians();
    
    var ellipsoid = { a: 6378137, b: 6356752.3142, f: 1/298.257223563 }; // WGS-84
    var a = ellipsoid.a, b = ellipsoid.b, f = ellipsoid.f;

    var L = λ2 - λ1;
    var tanU1 = (1-f) * Math.tan(φ1), cosU1 = 1 / Math.sqrt((1 + tanU1*tanU1)), sinU1 = tanU1 * cosU1;
    var tanU2 = (1-f) * Math.tan(φ2), cosU2 = 1 / Math.sqrt((1 + tanU2*tanU2)), sinU2 = tanU2 * cosU2;

    var λ = L, λʹ, iterations = 0;
    do {
      var sinλ = Math.sin(λ), cosλ = Math.cos(λ);
      var sinSqσ = (cosU2*sinλ) * (cosU2*sinλ) + (cosU1*sinU2-sinU1*cosU2*cosλ) * (cosU1*sinU2-sinU1*cosU2*cosλ);
      var sinσ = Math.sqrt(sinSqσ);
      if (sinσ==0) return 0;  // co-incident points
      var cosσ = sinU1*sinU2 + cosU1*cosU2*cosλ;
      var σ = Math.atan2(sinσ, cosσ);
      var sinα = cosU1 * cosU2 * sinλ / sinσ;
      var cosSqα = 1 - sinα*sinα;
      var cos2σM = cosσ - 2*sinU1*sinU2/cosSqα;
      if (isNaN(cos2σM)) cos2σM = 0;  // equatorial line: cosSqα=0 (§6)
      var C = f/16*cosSqα*(4+f*(4-3*cosSqα));
      λʹ = λ;
      λ = L + (1-C) * f * sinα * (σ + C*sinσ*(cos2σM+C*cosσ*(-1+2*cos2σM*cos2σM)));
    } while (Math.abs(λ-λʹ) > 1e-12 && ++iterations<100);
    if (iterations>=100) {
      console.log('Formula failed to converge. Altering target position.')
      return this._vincenty_inverse(p1, {lat: p2.lat, lng:p2.lng-0.01})
      //  throw new Error('Formula failed to converge');
    }

    var uSq = cosSqα * (a*a - b*b) / (b*b);
    var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
    var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));
    var Δσ = B*sinσ*(cos2σM+B/4*(cosσ*(-1+2*cos2σM*cos2σM)-
      B/6*cos2σM*(-3+4*sinσ*sinσ)*(-3+4*cos2σM*cos2σM)));

    var s = b*A*(σ-Δσ);

    var fwdAz = Math.atan2(cosU2*sinλ,  cosU1*sinU2-sinU1*cosU2*cosλ);
    var revAz = Math.atan2(cosU1*sinλ, -sinU1*cosU2+cosU1*sinU2*cosλ);

    s = Number(s.toFixed(3)); // round to 1mm precision
    return { distance: s, initialBearing: fwdAz.toDegrees(), finalBearing: revAz.toDegrees() };
  };

  //From Leaflet.Geodesic (https://github.com/henrythasler/Leaflet.Geodesic/)
  var vincenty_direct = function (p1, initialBearing, distance, wrap) {
    var φ1 = p1.lat.toRadians(), λ1 = p1.lng.toRadians();
    var α1 = initialBearing.toRadians();
    var s = distance;

    var ellipsoid = { a: 6378137, b: 6356752.3142, f: 1/298.257223563 }; // WGS-84
    var a = ellipsoid.a, b = ellipsoid.b, f = ellipsoid.f;

    var sinα1 = Math.sin(α1);
    var cosα1 = Math.cos(α1);

    var tanU1 = (1-f) * Math.tan(φ1), cosU1 = 1 / Math.sqrt((1 + tanU1*tanU1)), sinU1 = tanU1 * cosU1;
    var σ1 = Math.atan2(tanU1, cosα1);
    var sinα = cosU1 * sinα1;
    var cosSqα = 1 - sinα*sinα;
    var uSq = cosSqα * (a*a - b*b) / (b*b);
    var A = 1 + uSq/16384*(4096+uSq*(-768+uSq*(320-175*uSq)));
    var B = uSq/1024 * (256+uSq*(-128+uSq*(74-47*uSq)));

    var σ = s / (b*A), σʹ, iterations = 0;
    do {
      var cos2σM = Math.cos(2*σ1 + σ);
      var sinσ = Math.sin(σ);
      var cosσ = Math.cos(σ);
      var Δσ = B*sinσ*(cos2σM+B/4*(cosσ*(-1+2*cos2σM*cos2σM)-
          B/6*cos2σM*(-3+4*sinσ*sinσ)*(-3+4*cos2σM*cos2σM)));
      σʹ = σ;
      σ = s / (b*A) + Δσ;
    } while (Math.abs(σ-σʹ) > 1e-12 && ++iterations);

    var x = sinU1*sinσ - cosU1*cosσ*cosα1;
    var φ2 = Math.atan2(sinU1*cosσ + cosU1*sinσ*cosα1, (1-f)*Math.sqrt(sinα*sinα + x*x));
    var λ = Math.atan2(sinσ*sinα1, cosU1*cosσ - sinU1*sinσ*cosα1);
    var C = f/16*cosSqα*(4+f*(4-3*cosSqα));
    var L = λ - (1-C) * f * sinα *
      (σ + C*sinσ*(cos2σM+C*cosσ*(-1+2*cos2σM*cos2σM)));
        
    if(wrap)
      var λ2 = (λ1+L+3*Math.PI)%(2*Math.PI) - Math.PI; // normalise to -180...+180
    else
      var λ2 = (λ1+L); // do not normalize

    var revAz = Math.atan2(sinα, -x);

    return {lat: φ2.toDegrees(), 
      lng: λ2.toDegrees(),
      finalBearing: revAz.toDegrees() 
    };
  };

  var drawLink = function(a, b, style) {
    var poly = L.geodesicPolyline([a, b], style);
    poly.addTo(window.plugin.extendPolyLines.linesLayerGroup);
  };

  var mapZoomToDistance = function(zoomLevel) {
    switch(zoomLevel) {
      case 17: return 2500;
      case 16: return 5000;
      case 15: return 10000;
      case 14: return 20000;
      case 13: return 40000;
      case 12: return 80000;
      case 11: return 160000;
      case 10: return 320000;
      case 9: return 640000;
      case 8: return 1280000;
      case 7: return 2560000;
      case 6: return 5120000;
      case 5: return 10240000;
      case 4: return 20480000;
      case 3: return 40960000;
      case 2: return 81920000;
      case 1: return 163840000;
    }
    return 10000; 
  };

  var extendEdge = function(a,b) {
    var finalBearing = vincenty_inverse(a,b).finalBearing;
    var direct = vincenty_direct(b, finalBearing, mapZoomToDistance(window.map.getZoom()), true);
    var c = new L.LatLng(direct.lat, direct.lng);
    drawLink(b, c, {
      color: '#FF0000',
      opacity: 1,
      weight: 1.5,
      clickable: false,
      smoothFactor: 1,
      dashArray: [6, 4],
    });
  };

  var processPolygon = function(layer) {
    var vertices = layer.getLatLngs();

    $.each(vertices, function(idx, vertex) {
      var previousVertex = (idx === 0) ? vertices[vertices.length - 1] : vertices[idx - 1];
      var nextVertex = (idx === (vertices.length - 1)) ? vertices[0] : vertices[idx + 1];
      extendEdge(previousVertex, vertex);
      extendEdge(nextVertex, vertex);
    });

    
  };

  window.plugin.extendPolyLines.linesLayerGroup.clearLayers();
  // var ctrl = [$('.leaflet-control-layers-selector + span:contains("Extend Polygon Lines")').parent()];
  // if (Object.keys(window.portals).length > window.plugin.extendPolyLines.MAX_PORTALS_TO_OBSERVE) {
  //   $.each(ctrl, function(guid, ctl) {ctl.addClass('disabled').attr('title', 'Too many portals: ' + Object.keys(window.portals).length);});
  //   return;
  // }
  

  var bounds;
  window.plugin.drawTools.drawnItems.eachLayer(function(layer) {
    if (!(layer instanceof L.GeodesicPolygon)) {
      return;
    }
    else{
      processPolygon(layer);
    }
  });
}

window.plugin.extendPolyLines.setup = function() {
  window.plugin.extendPolyLines.linesLayerGroup = new L.LayerGroup();
  
  window.addHook('pluginDrawTools', function(e) {
    window.plugin.extendPolyLines.updateLayer();
  });

  window.addLayerGroup('Extend Polygon Lines', window.plugin.extendPolyLines.linesLayerGroup, false);
}
var setup = window.plugin.extendPolyLines.setup;

  
/** Extend Number object with method to convert numeric degrees to radians */
if (typeof Number.prototype.toRadians == 'undefined') {
    Number.prototype.toRadians = function() { return this * Math.PI / 180; }
}
  
/** Extend Number object with method to convert radians to numeric (signed) degrees */
if (typeof Number.prototype.toDegrees == 'undefined') {
    Number.prototype.toDegrees = function() { return this * 180 / Math.PI; }
}
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


