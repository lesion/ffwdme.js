var Base = require('./base');

var OSRM = Base.extend({
  /**
   * Creates a new instance of the OSRM routing service class.
   * When doing so, this object adds itself as the a global handler for route
   * responses.
   *
   * Options:
   * - apiKey
   *
   * @class The class represents a client for the ffwdme routing service
   * using OSRM.
   *
   * @augments ffwdme.Class
   * @constructs
   *
   */
  constructor: function(options) {
    this.base(options);
    this.bindAll(this, 'parse', 'error');

    if (options.anchorPoint) {
      this.anchorPoint = options.anchorPoint;
      this.direction = this.start;
      this.start = this.anchorPoint;
    }
  },

  /**
   * The base url for the service.
   *
   * @type String
   */
  BASE_URL: 'https://router.project-osrm.org/viaroute?',


  routeType: 'car',

  route: null,
  anchorPoint: null,
  direction: null,

  fetch: function() {

    var via = '';
    console.error('Dentro fetch')
    console.error(this.start)

    console.error(this.dest)
    if (this.direction) {
      console.error('sono qui dentro !!!oasfdij oasf doa fd')
      console.error(this.direction)
      via += '&point=' + [this.direction.lat, this.direction.lng].join('%2C');
    }

    var reqUrl = [
      this.BASE_URL,
      'loc=',
      [
        this.start.lat,
        this.start.lng,
      ].join(','),
      '&loc=',
      [
        this.dest.lat,
        this.dest.lng
      ].join(','),
      '&instructions=true'
    ];

    ffwdme.trigger(this.eventPrefix() + ':start', {
      routing: this
    });
    fetch(reqUrl.join(''))
      .then(function(a) {
        return a.json()
      })
      .then(this.parse)
      .catch(this.error)
      // do not need JSONP
      // ffwdme.utils.Proxy.get({
      //   url: reqUrl.join(''),
      //   success: this.parse,
      //   error: this.error
      // });

    return ffwdme;
  },

  error: function(error) {
    this.base(error);
  },

  // https://github.com/Project-OSRM/osrm-backend/wiki/Server-api
  parse: function(response) {
	

    var route_summary = response.route_summary

    var routeStruct = { directions: [] };
    routeStruct.summary = {
      distance: parseInt(route_summary.total_distance, 10),
      duration: route_summary.total_time / 1000
    };

    var path = ffwdme.Route.decodePolyline(response.route_geometry,6);

    var instruction, d, extractedStreet, geomArr;
    var instructions = response.route_instructions;

    // we remove the last instruction as it only says "Finish!" in
    // GraphHopper and has no value for us.
    // instructions.pop();
    var last_instruction_idx = -1
    
    for (var i = 0, len = instructions.length; i < len; i++) {
      instruction = instructions[i];
      d = {
        instruction:  instruction[1],
        distance:     parseInt(instruction[2], 10),
        duration:     instruction[4] / 1000,
        turnAngle:    this.extractTurnAngle(instruction[0]),
        turnType:     this.extractTurnType(instruction[0])
      };

      if(last_instruction_idx>=0){
        // console.error('prendo da ' + last_instruction_idx + ' a ' + instruction[3])
        d.path = path.slice(last_instruction_idx, parseInt(instruction[3]));
      }
      else
        d.path = path.slice(0,1)
      last_instruction_idx = parseInt(instruction[3])

    
      d.street = instruction[1] 

      routeStruct.directions.push(d);
    }

    this.route = new ffwdme.Route().parse(routeStruct);

    this.success(response, this.route);
  },

  // "FINISH"
  // "EXIT1"
  // "EXIT2"
  // "EXIT3"
  // "EXIT4"
  // "EXIT5"
  // "EXIT6"
  // "TU"
  extractTurnType: function(indication) {
    var name;
    // exit on roundbout in OSM is in form of "11-n" where n is exit number
    var round_abount_exit = indication.match(/11-(.*)/)
    if (round_abount_exit) {
      name = 'EXIT' + round_abount_exit[1]
      return name
    }

    switch (indication) {
      case '1': //continue (go straight)
      case '10':
        name = 'C';
        break;
      case '7': // turn left
        name = 'TL';
        break;
      case '2': // turn slight left
        name = 'TSLL';
        break;
      case '6': // turn sharp left
        name = 'TSHL';
        break;
      case '3': // turn right
        name = 'TR';
        break;
      case '8': // turn slight right
        name = 'TSLR';
        break;
      case '4': // turn sharp right
        name = 'TSHR';
        break;
      case '5': // U-turn
        name = 'TU';
        break;
      case '15':
        name = 'FINISH';
        break;
      default:
        name = 'C';
    }
    return name;
  },

  // see https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md
  extractTurnAngle: function(indication) {
    var angle;
    var round_abount_exit = indication.match(/11-(.*)/)
    if (round_abount_exit) {
      return 0
    }
    switch (indication) {
      case '1': //continue (go straight)
      case '10':
        angle = 0;
        break;
      case '3': // turn left
        angle = 90;
        break;
      case '2': // turn slight left
        angle = 45;
        break;
      case '4': // turn sharp left
        angle = 135;
        break;
      case '7': // turn right
        angle = -90;
        break;
      case '6': // turn slight right
        angle = -45;
        break;
      case '8': // turn sharp right
        angle = -135;
        break;
      case '5': // U-turn
        angle = 180;
        break;
      default:
        angle = -1;
    }
    return angle;
  }
});

module.exports = OSRM;
