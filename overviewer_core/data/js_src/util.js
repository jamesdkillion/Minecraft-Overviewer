overviewer.util = {
    /**
     * General initialization function, called when the page is loaded.
     * Probably shouldn't need changing unless some very different kind of new
     * feature gets added.
     */
    'initialize': function() {
        overviewer.util.initializeClassPrototypes();

        overviewer.collections.worlds = new overviewer.models.WorldCollection();

        $.each(overviewerConfig.worlds, function(index, el) {
                var n = new overviewer.models.WorldModel({name: el, id:el});
                overviewer.collections.worlds.add(n);
                });

        $.each(overviewerConfig.tilesets, function(index, el) {
                var newTset = new overviewer.models.TileSetModel(el);
                overviewer.collections.worlds.get(el.world).get("tileSets").add(newTset);
                });

        overviewer.collections.worlds.each(function(world, index, list) {
                var nv = new overviewer.views.WorldView({model: world});
                overviewer.collections.worldViews.push(nv);
                });

        overviewer.mapModel = new overviewer.models.GoogleMapModel({});
        overviewer.mapView = new overviewer.views.GoogleMapView({el: document.getElementById(overviewerConfig.CONST.mapDivId), model:overviewer.mapModel});

        // any controls must be created after the GoogleMapView is created
        // controls should be added in the order they should appear on screen, 
        // with controls on the outside of the page being added first

        var compass = new overviewer.views.CompassView({tagName: 'DIV', model:overviewer.mapModel});
        compass.render();

        var coordsdiv = new overviewer.views.CoordboxView({tagName: 'DIV'});
        coordsdiv.render();
        // Update coords on mousemove
        google.maps.event.addListener(overviewer.map, 'mousemove', function (event) {
            coordsdiv.updateCoords(event.latLng);    
        });

        google.maps.event.addListener(overviewer.map, 'maptypeid_changed', function(event) {
            //overviewer.map.getMapTypeId();
            compass.render();

        });

        var worldSelector = new overviewer.views.WorldSelectorView({tagName:'DIV'});
        overviewer.collections.worlds.bind("add", worldSelector.render, worldSelector);

        // hook up some events

        overviewer.mapModel.bind("change:currentWorldView", overviewer.mapView.render, overviewer.mapView);

        overviewer.mapView.render();

        /*
           overviewer.util.initializeMapTypes();
           overviewer.util.initializeMap();
           overviewer.util.initializeMarkers();
           overviewer.util.initializeRegions();
           overviewer.util.createMapControls();
           */
    },
    /**
     * This adds some methods to these classes because Javascript is stupid
     * and this seems like the best way to avoid re-creating the same methods
     * on each object at object creation time.
     */
    'initializeClassPrototypes': function() {
        overviewer.classes.MapProjection.prototype.fromLatLngToPoint = function(latLng) {
            var x = latLng.lng() * overviewerConfig.CONST.tileSize;
            var y = latLng.lat() * overviewerConfig.CONST.tileSize;
            return new google.maps.Point(x, y);
        };

        overviewer.classes.MapProjection.prototype.fromPointToLatLng = function(point) {
            var lng = point.x * this.inverseTileSize;
            var lat = point.y * this.inverseTileSize;
            return new google.maps.LatLng(lat, lng);
        };

        overviewer.classes.CoordMapType.prototype.getTile = function(coord, zoom, ownerDocument) {
            var div = ownerDocument.createElement('DIV');
            div.innerHTML = '(' + coord.x + ', ' + coord.y + ', ' + zoom +
                ')' + '<br />';
            //TODO: figure out how to get the current mapType, I think this
            //will add the maptile url to the grid thing once it works

            //div.innerHTML += overviewer.collections.mapTypes[0].getTileUrl(coord, zoom);

            //this should probably just have a css class
            div.style.width = this.tileSize.width + 'px';
            div.style.height = this.tileSize.height + 'px';
            div.style.fontSize = '10px';
            div.style.borderStyle = 'solid';
            div.style.borderWidth = '1px';
            div.style.borderColor = '#AAAAAA';
            return div;
        };
    },
    /**
     * Quote an arbitrary string for use in a regex matcher.
     * WTB parametized regexes, JavaScript...
     *
     *   From http://kevin.vanzonneveld.net
     *   original by: booeyOH
     *   improved by: Ates Goral (http://magnetiq.com)
     *   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
     *   bugfixed by: Onno Marsman
     *     example 1: preg_quote("$40");
     *     returns 1: '\$40'
     *     example 2: preg_quote("*RRRING* Hello?");
     *     returns 2: '\*RRRING\* Hello\?'
     *     example 3: preg_quote("\\.+*?[^]$(){}=!<>|:");
     *     returns 3: '\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:'
     */
    "pregQuote": function(str) {
        return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
    },
    /**
     * Change the map's div's background color according to the mapType's bg_color setting
     *
     * @param string mapTypeId
     * @return string
     */
    'getMapTypeBackgroundColor': function(id) {
        return overviewerConfig.tilesets[id].bgcolor;
    },
    /**
     * Gee, I wonder what this does.
     * 
     * @param string msg
     */
    'debug': function(msg) {
        if (overviewerConfig.map.debug) {
            console.log(msg);
        }
    },
    /**
     * Simple helper function to split the query string into key/value
     * pairs. Doesn't do any type conversion but both are lowercase'd.
     * 
     * @return Object
     */
    'parseQueryString': function() {
        var results = {};
        var queryString = location.search.substring(1);
        var pairs = queryString.split('&');
        for (i in pairs) {
            var pos = pairs[i].indexOf('=');
            var key = pairs[i].substring(0,pos).toLowerCase();
            var value = pairs[i].substring(pos+1).toLowerCase();
            overviewer.util.debug( 'Found GET paramter: ' + key + ' = ' + value);
            results[key] = value;
        }
        return results;
    },
    'getDefaultMapTypeId': function() {
        return overviewer.collections.mapTypeIds[0];
    },
    /**
     * helper to get map LatLng from world coordinates takes arguments in
     * X, Y, Z order (arguments are *out of order*, because within the
     * function we use the axes like the rest of Minecraft Overviewer --
     * with the Z and Y flipped from normal minecraft usage.)
     * 
     * @param int x
     * @param int z
     * @param int y
     * 
     * @return google.maps.LatLng
     */
    'fromWorldToLatLng': function(x, z, y, zoomLevels) {
        // the width and height of all the highest-zoom tiles combined,
        // inverted
        var perPixel = 1.0 / (overviewerConfig.CONST.tileSize *
                Math.pow(2, zoomLevels));

        if(overviewerConfig.map.north_direction == 'upper-left'){
            temp = x;
            x = -y-1;
            y = temp;
        } else if(overviewerConfig.map.north_direction == 'upper-right'){
            x = -x-1;
            y = -y-1;
        } else if(overviewerConfig.map.north_direction == 'lower-right'){
            temp = x;
            x = y;
            y = -temp-1;
        }

        // This information about where the center column is may change with
        // a different drawing implementation -- check it again after any
        // drawing overhauls!

        // point (0, 0, 127) is at (0.5, 0.0) of tile (tiles/2 - 1, tiles/2)
        // so the Y coordinate is at 0.5, and the X is at 0.5 -
        // ((tileSize / 2) / (tileSize * 2^zoomLevels))
        // or equivalently, 0.5 - (1 / 2^(zoomLevels + 1))
        var lng = 0.5 - (1.0 / Math.pow(2, zoomLevels + 1));
        var lat = 0.5;

        // the following metrics mimic those in
        // chunk_render in src/iterate.c

        // each block on X axis adds 12px to x and subtracts 6px from y
        lng += 12 * x * perPixel;
        lat -= 6 * x * perPixel;

        // each block on Y axis adds 12px to x and adds 6px to y
        lng += 12 * y * perPixel;
        lat += 6 * y * perPixel;

        // each block down along Z adds 12px to y
        lat += 12 * (128 - z) * perPixel;

        // add on 12 px to the X coordinate to center our point
        lng += 12 * perPixel;

        return new google.maps.LatLng(lat, lng);
    },
    /**
     * The opposite of fromWorldToLatLng
     * NOTE: X, Y and Z in this function are Minecraft world definitions
     * (that is, X is horizontal, Y is altitude and Z is vertical).
     * 
     * @param float lat
     * @param float lng
     * 
     * @return Array
     */
    'fromLatLngToWorld': function(lat, lng, zoomLevels) {
        // Initialize world x/y/z object to be returned
        var point = Array();
        point.x = 0;
        point.y = 64;
        point.z = 0;

        // the width and height of all the highest-zoom tiles combined,
        // inverted
        var perPixel = 1.0 / (overviewerConfig.CONST.tileSize *
                Math.pow(2, zoomLevels));

        // Revert base positioning
        // See equivalent code in fromWorldToLatLng()
        lng -= 0.5 - (1.0 / Math.pow(2, zoomLevels + 1));
        lat -= 0.5;

        // I'll admit, I plugged this into Wolfram Alpha:
        //   a = (x * 12 * r) + (z * 12 * r), b = (z * 6 * r) - (x * 6 * r)
        // And I don't know the math behind solving for for X and Z given
        // A (lng) and B (lat).  But Wolfram Alpha did. :)  I'd welcome
        // suggestions for splitting this up into long form and documenting
        // it. -RF
        point.x = (lng - 2 * lat) / (24 * perPixel)
            point.z = (lng + 2 * lat) / (24 * perPixel)

            // Adjust for the fact that we we can't figure out what Y is given
            // only latitude and longitude, so assume Y=64.
            point.x += 64;
        point.z -= 64;

        if(overviewerConfig.map.north_direction == 'upper-left'){
            temp = point.z;
            point.z = -point.x;
            point.x = temp;
        } else if(overviewerConfig.map.north_direction == 'upper-right'){
            point.x = -point.x;
            point.z = -point.z;
        } else if(overviewerConfig.map.north_direction == 'lower-right'){
            temp = point.z;
            point.z = point.x;
            point.x = -temp;
        }

        return point;
    },
    /**
     * Create the pop-up infobox for when you click on a region, this can't
     * be done in-line because of stupid Javascript scoping problems with
     * closures or something.
     * 
     * @param google.maps.Polygon|google.maps.Polyline shape
     */
    'createRegionInfoWindow': function(shape) {
        var infowindow = new google.maps.InfoWindow();
        google.maps.event.addListener(shape, 'click', function(event, i) {
                if (overviewer.collections.infoWindow) {
                overviewer.collections.infoWindow.close();
                }
                // Replace our Info Window's content and position
                var point = overviewer.util.fromLatLngToWorld(event.latLng.lat(),event.latLng.lng());
                var contentString = '<b>Region: ' + shape.name + '</b><br />' +
                'Clicked Location: <br />' + Math.round(point.x,1) + ', ' + point.y
                + ', ' + Math.round(point.z,1)
                + '<br />';
                infowindow.setContent(contentString);
                infowindow.setPosition(event.latLng);
                infowindow.open(overviewer.map);
                overviewer.collections.infoWindow = infowindow;
                });
    },
    /**
     * Same as createRegionInfoWindow()
     * 
     * @param google.maps.Marker marker
     */
    'createMarkerInfoWindow': function(marker) {
        var windowContent = '<div class="infoWindow"><img src="' + marker.icon +
            '"/><p>' + marker.title.replace(/\n/g,'<br/>') + '</p></div>';
        var infowindow = new google.maps.InfoWindow({
                'content': windowContent
                });
        google.maps.event.addListener(marker, 'click', function() {
                if (overviewer.collections.infoWindow) {
                overviewer.collections.infoWindow.close();
                }
                infowindow.open(overviewer.map, marker);
                overviewer.collections.infoWindow = infowindow;
                });
    },
    'initHash': function() {
        if(window.location.hash.split("/").length > 1) {
            overviewer.util.goToHash();
            // Clean up the hash.
            overviewer.util.updateHash();

            // Add a marker indicating the user-supplied position
            var coordinates = overviewer.util.fromLatLngToWorld(overviewer.map.getCenter().lat(), 
                    overviewer.map.getCenter().lng(),
                    overviewerConfig.tilesets[overviewer.currentTilesetId].zoomLevels);
            overviewer.collections.markerDatas.push([{
                    'msg': 'Coordinates ' + Math.floor(coordinates.x) + ', ' + Math.floor(coordinates.y) + ', ' + Math.floor(coordinates.z),
                    'x': coordinates.x,
                    'y': coordinates.y,
                    'z': coordinates.z,
                    'type': 'querypos'}]);
        }
    },
    'setHash': function(x, y, z, zoom, maptype)    {
        // remove the div prefix from the maptype (looks better)
        if (maptype)
        {
            maptype = maptype.replace(overviewerConfig.CONST.mapDivId, "");
        }
        window.location.replace("#/" + Math.floor(x) + "/" + Math.floor(y) + "/" + Math.floor(z) + "/" + zoom + "/" + maptype);
    },
    'updateHash': function() {
        var coordinates = overviewer.util.fromLatLngToWorld(overviewer.map.getCenter().lat(), 
                overviewer.map.getCenter().lng(),
                overviewerConfig.tilesets[overviewer.currentTilesetId].zoomLevels);
        var zoom = overviewer.map.getZoom();
        var maptype = overviewer.map.getMapTypeId();
        if (zoom == overviewerConfig.tilesets[overviewer.currentTilesetId].maxZoom) {
            zoom = 'max';
        } else if (zoom == overviewerConfig.tilesets[overviewer.currentTilesetId].minZoom) {
            zoom = 'min';
        } else {
            // default to (map-update friendly) negative zooms
            zoom -= overviewerConfig.tilesets[overviewer.currentTilesetId].maxZoom;
        }
        overviewer.util.setHash(coordinates.x, coordinates.y, coordinates.z, zoom, maptype);
    },
    'goToHash': function() {
        // Note: the actual data begins at coords[1], coords[0] is empty.
        var coords = window.location.hash.split("/");
        var latlngcoords = overviewer.util.fromWorldToLatLng(parseInt(coords[1]), 
                parseInt(coords[2]), 
                parseInt(coords[3]),
                overviewerConfig.tilesets[overviewer.currentTilesetId].zoomLevels);
        var zoom;
        var maptype = '';
        // The if-statements try to prevent unexpected behaviour when using incomplete hashes, e.g. older links
        if (coords.length > 4) {
            zoom = coords[4];
        }
        if (coords.length > 5) {
            maptype = coords[5];
        }

        if (zoom == 'max') {
            zoom = overviewerConfig.tilesets[overviewer.currentTilesetId].maxZoom;
        } else if (zoom == 'min') {
            zoom = overviewerConfig.tilesets[overviewer.currentTilesetId].minZoom;
        } else {
            zoom = parseInt(zoom);
            if (zoom < 0 && zoom + overviewerConfig.tilesets[overviewer.currentTilesetId].maxZoom >= 0) {
                // if zoom is negative, treat it as a "zoom out from max"
                zoom += overviewerConfig.tilesets[overviewer.currentTilesetId].maxZoom;
            } else {
                // fall back to default zoom
                zoom = overviewerConfig.tilesets[overviewer.currentTilesetId].defaultZoom;
            }
        }
        // If the maptype isn't set, set the default one.
        if (maptype == '') {
            // We can now set the map to use the 'coordinate' map type
            overviewer.map.setMapTypeId(overviewer.util.getDefaultMapTypeId());
        } else {
            // normalize the map type (this supports old-style,
            // 'mcmapLabel' style map types, converts them to 'shortname'
            if (maptype.lastIndexOf(overviewerConfig.CONST.mapDivId, 0) === 0) {
                maptype = maptype.replace(overviewerConfig.CONST.mapDivId, "");
                for (i in overviewer.collections.mapTypes) {
                    var type = overviewer.collections.mapTypes[i];
                    if (type.name == maptype) {
                        maptype = type.shortname;
                        break;
                    }
                }
            }

            overviewer.map.setMapTypeId(overviewerConfig.CONST.mapDivId + maptype);
        }

        overviewer.map.setCenter(latlngcoords);
        overviewer.map.setZoom(zoom);
    }
};
