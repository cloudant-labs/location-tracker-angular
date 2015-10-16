// create our angular app and inject ngAnimate and ui-router 
// =============================================================================
angular.module('locationTrackingApp', ['ngAnimate', 'ngRoute'])


/* VALUES */

.value("map", {})
    .value("watchID", null)
    .value("remotedb", 'https://rajsingh:genjisan@rajsingh.cloudant.com/locationtracker')
    .value("num", 0)
    .value("successMessage", {})
    .value("errorMessage", "error")


/* ROUTES */

.config(['$routeProvider', function($routeProvider) {

    $routeProvider.
    when('/welcome', {
        templateUrl: 'welcome.html',
        controller: 'locationWelcomeController'
    }).
    when('/tracking', {
        templateUrl: 'tracking.html',
        controller: 'locationTrackingController'
    }).
    when('/savedata', {
        templateUrl: 'savedata.html',
        controller: 'locationTrackingSaveDataController'
    }).
    when('/success', {
        templateUrl: 'success.html',
        controller: 'locationTrackingSuccessController'
    }).
    when('/error', {
        templateUrl: 'error.html',
        controller: 'locationTrackingErrorController'
    }).
    when('/map', {
        templateUrl: 'map-result.html',
        controller: 'mapResultController'
    }).
    otherwise({
        redirectTo: '/welcome'
    })

}])


/* welcome.html Controller */
.controller('locationWelcomeController', function($scope) {
    $scope.transEnter = function() {}
    $scope.transLeave = function() {};
})


/* tracking.html Controller */
.controller('locationTrackingController', function($scope, map, watchID, pouchLocal, num) {

    /* VARS */
    var mapTracker; // map object
    var lc; // location control object
    var last_lon = 0;
    var last_lat = 0;
    var session_id = guid();
    var db = pouchLocal;
    var watchID = {}; //geolocation object holder

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        if (navigator.geolocation) {

            /* vars to pass into leaflet map object */
            var osmUrl = 'https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png';
            var osmAttrib = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="http://mapbox.com">Mapbox</a>';
            var osm = new L.TileLayer(osmUrl, {
                attribution: osmAttrib,
                id: 'examples.map-i875mjb7'
            });

            /* instantiate Leaflet tracking map */
            mapTracker = new L.Map('map', {
                layers: [osm],
                zoom: 18,
                zoomControl: true
            });

            /* Instantiate Leaflet Locate plugin */
            lc = L.control.locate({
                follow: true
            }).addTo(mapTracker);

            mapTracker.locate({
                setView: true
            });

            /* store geolocation in an object to */
            geoLoc = navigator.geolocation;
            var watchOptions = {
                maximumAge: 0,
                timeout: 10000,
                enableHighAccuracy: true
            };
            watchID = geoLoc.watchPosition(doWatch, watchError, watchOptions);

            /* leaflet events */
            mapTracker.on('locationfound', onLocationFound);
            mapTracker.on('startfollowing', function() {
                mapTracker.on('dragstart', lc._stopFollowing, lc);
            }).on('stopfollowing', function() {
                mapTracker.off('dragstart', lc._stopFollowing, lc);
            });

        } else {
            alert("Geolocation IS NOT available!");
        }
    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        geoLoc.clearWatch(watchID);
        mapTracker.remove();
    };

    /* locationfound event handler */
    function onLocationFound(e) {
        var radius = e.accuracy / 2;
        L.marker(e.latlng).addTo(mapTracker).bindPopup(
            '<span>Latitude&nbsp;&nbsp;</span>' + e.latlng.lat +
            '<br><span>Longitude&nbsp;&nbsp;</span>' + e.latlng.lng);
        lc.start();
    }

    /* geoLoc.watchPosition event handler */
    function doWatch(position) {
        var lon = Number(Math.round(position.coords.longitude + 'e' + 4) + 'e-' + 4);
        var lat = Number(Math.round(position.coords.latitude + 'e' + 4) + 'e-' + 4);
        if ((lon == last_lon) && (lat == last_lat)) return null;

        if (last_lon == 0) {
            last_lon = lon;
            last_lat = lat;
        }

        /* create points to connect (last and latest) */
        var pointA = new L.LatLng(last_lat, last_lon);
        var pointB = new L.LatLng(lat, lon);
        var pointList = [pointA, pointB];

        last_lon = lon;
        last_lat = lat;

        /* create line to connect points */
        var polyline = new L.Polyline(pointList, {
            color: '#e5603d',
            weight: 4,
            opacity: 0.64,
            smoothFactor: 1
        });
        polyline.addTo(mapTracker);

        /* data object to write to your NoSQL doc */
        var coord = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat]
            },
            "properties": {
                "session_id": session_id,
                "timestamp": position.timestamp
            }
        };

        /* PUT object to db */
        db.put(coord, position.timestamp.toString(), function callback(err, response) {
            if (err) {
                alert('PUT ERROR: ' + err);
            }

            /* get doc and update lat + lon text in the view */
            db.get(response.id, function callback(err, doc) {
                if (err) {
                    console.log('ERROR: ' + err);
                }
                $('.longitude-coordinate').text(doc.geometry.coordinates[0]);
                $('.latitude-coordinate').text(doc.geometry.coordinates[1]);
            });
        });
    }

    /* geoLoc.watchPosition event error handler */
    function watchError(err) {
        $('.longitude-coordinate, .latitude-coordinate').text("permission denied...");
        alert('Error' + err.code + ' msg: ' + err.message);
    }

    /**
     * Generates a GUID string.
     * @returns {String} The generated GUID.
     * @example af8a8416-6e18-a307-bd9c-f2c947bbb3aa
     * @author Slavik Meltser (slavik@meltser.info).
     * @link http://slavik.meltser.info/?p=142
     */
    function guid() {
        function _p8(s) {
            var p = (Math.random().toString(16) + "000000000").substr(2, 8);
            return s ? "-" + p.substr(0, 4) + "-" + p.substr(4, 4) : p;
        }
        return _p8() + _p8(true) + _p8(true) + _p8();
    }
})


/* savedata.html Controller */
.controller('locationTrackingSaveDataController', function($scope, map, watchID, pouchLocal, remotedb, successMessage, errorMessage) {

    var timer;

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        navigator.geolocation.clearWatch(watchID);
        db = pouchLocal;

        timer = setInterval(function() {
            $(".dot-anim")
                .velocity("transition.slideUpBigIn", {
                    drag: true
                })
                .delay(750)
                .velocity({
                    opacity: 0
                }, 750)
        }, 2000);

        db.replicate.to(remotedb).on('complete', function(info) {
            var timer = setTimeout(function() {
                successMessage.docs_written = info.docs_written;
                successMessage.start_time = info.start_time;
                window.location = "#/success";
            }, 2000)

        }).on('error', function(err) {
            errorMessage = 'error replicating: ' + err;
            window.location = "#/error";
        });
    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        clearInterval(timer);
    };
})


.controller('locationTrackingSuccessController', function($scope, successMessage) {
    $scope.docs_written = successMessage.docs_written;
    $scope.start_time = successMessage.start_time;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})


.controller('locationTrackingErrorController', function($scope, errorMessage) {
    $scope.error_message = errorMessage;

    $scope.transEnter = function() {};
    $scope.transLeave = function() {};
})


.controller('mapResultController', function($scope, pouchResult) {
    var mapResult = {};

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transEnter = function() {
        var db = pouchResult.$$state.value.docs;
        var _len = db.length;

        /* instantiate Leaflet map */
        mapResult = new L.Map('mapResult');

        L.tileLayer('https://{s}.tiles.mapbox.com/v3/{id}/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: 'Map data &copy; ' +
                '<a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
                '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
            detectRetina: true,
            id: 'examples.map-20v6611k'
        }).addTo(mapResult);

        var last_lat = 0;
        var last_lon = 0;

        var movementLayer = L.geoJson(null, {
            pointToLayer: function(feature, latlng) {

                // setup a default lat + lng coordinate
                if (last_lat == 0) {
                    last_lat = latlng.lat;
                    last_lon = latlng.lng;
                }

                // we store coordinates so that we can have a start and end point, or pointA and pointB 
                var pointA = [last_lat, last_lon];
                var pointB = [latlng.lat, latlng.lng];
                var pointList = [pointA, pointB];

                last_lat = latlng.lat;
                last_lon = latlng.lng;

                var firstpolyline = new L.Polyline(pointList, {
                    color: '#e5603d',
                    weight: 4,
                    opacity: 0.64,
                    smoothFactor: 1
                });
                firstpolyline.addTo(mapResult);

                markeroptions = {
                    icon: L.icon({
                        iconUrl: 'script/images/marker-icon-blue.png',
                        iconRetinaUrl: 'script/images/marker-icon-blue-2x.png',
                        iconSize: [25, 41],
                        iconAnchor: [10, 10],
                        shadowURL: 'script/images/marker-icon-shadow.png',
                        shadowRetinaURL: 'script/images/marker-icon-shadow-2x.png',
                        shadowSize: [41, 41],
                        shadowAnchor: [10, 10]
                    })
                }
                return L.marker(latlng, markeroptions).bindPopup(
                    '<span>Latitude&nbsp;&nbsp;</span>' + latlng.lat +
                    '<br><span>Longitude&nbsp;&nbsp;</span>' + latlng.lng);
            }
        }).addTo(mapResult);

        function updateMovingLayer(doc) {
            // console.log(doc.properties.timestamp);
            // console.log(doc.geometry.coordinates);
            movementLayer.addData(doc);
            mapResult.fitBounds(movementLayer.getBounds());
        }

        /* Run loop to take docs and begin drawing map points*/
        for (var i = 0; i < _len - 1; i++) {
            updateMovingLayer(db[i]);
        };

    };

    /* triggered from velocity callback within the animation module `enter` hook */
    $scope.transLeave = function() {
        mapResult.remove();
    };

})


/* local storage for tracking map */
.factory('pouchLocal', [function() {
    var db = new PouchDB('localdb');
    return db;
}])


/* cloudant db storage for result map */
// .factory('pouchResult', ["remotedb", function(remotedb) {
//     var db = new PouchDB(remotedb);
//     return db;
// }])
/* cloudant db storage for result map */
.factory('pouchResult', ['remotedb', '$http', function(remotedb, $http) {
 
    function handleSuccess( response ) {
        console.log(response.data);
        return( response.data );
    };
    
    function handleError( response ) {
        console.log("err: "+JSON.stringify(response.data));
        return( response.data );
     };
 
    var request = $http({
        method: "post",
        url: remotedb +'/_find',
 
        data: {
                "selector": {"properties.timestamp": {"$gt":1}},
                "sort": [{"properties.timestamp": "asc"}],
                // "limit": 400,
                "skip": 0
            }
        }
    );
 
    return (request.then( handleSuccess, handleError));
}])




/* Directive used on controller items to allow for multiple trans in/out */
.directive('animationdirective', ['$animate', '$timeout',
    function($animate, $timeout) {
        return {
            restrict: 'A',
            link: function(scope, element, attrs) {

                /* jquery button hovers added because clicks were sticking on mobile phone */
                $('.trans-button .btn').hover(
                    function() {
                        $(this).addClass('btnHover')
                    },
                    function() {
                        $(this).removeClass('btnHover')
                    }
                );

                $timeout(function() {
                    $animate.addClass(element, 'anim-page-transition-js');
                }, 10);
            }
        }
    }
])


/* animation module for running javascript transitions */
.animation('.anim-page-transition-js',
    function() {
        return {

            enter: function(element, done) {
                var _element = $(element);
                _element.addClass("visible");

                /* array of items to transition in sequentially */
                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 0,
                            translateY: "+200px"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: 1000 + (index * 100),
                            queue: false,
                            complete: function(elements) {
                                /**/
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 0,
                        translateY: "100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 500,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            /* call transEnter function within the called element's controller*/
                            angular.element(_element).scope().transEnter();
                        }
                    });

                _element.find(".trans-button")
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        easing: "easeInOutQuad",
                        delay: 1500,
                        queue: false,
                        complete: function(elements) {
                            /**/
                        }
                    });
            },
            leave: function(element, done) {
                var _element = $(element);

                /* call transLeave function within the called element's controller*/
                angular.element(_element).scope().transLeave();

                _element.find(".trans-button")
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "+100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1500,
                        delay: 0,
                        complete: function(elements) {
                            /**/
                        }
                    });

                $.each([".trans-step1", ".trans-step2", ".trans-step3", ".trans-step4"], function(index, value) {
                    _element.find(value)
                        .velocity({
                            opacity: 1,
                            translateY: "0"
                        }, {
                            duration: 0
                        })
                        .velocity({
                            opacity: 0,
                            translateY: "-200px"
                        }, {
                            easing: "easeInOutQuad",
                            duration: 1000 + (index * 200),
                            delay: (index * 100),
                            queue: false,
                            complete: function(elements) {
                                /**/
                            }
                        });
                });

                _element
                    .velocity({
                        opacity: 1,
                        translateY: "0%"
                    }, {
                        duration: 0
                    })
                    .velocity({
                        opacity: 0,
                        translateY: "-100%"
                    }, {
                        easing: "easeInOutQuad",
                        duration: 1000,
                        delay: 1000,
                        queue: false,
                        complete: function(elements) {
                            /**/
                            $(element).remove();
                        }
                    });
            }
        }
    }
);