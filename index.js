const config = require('config');

const google_key = config.get('Google.key');
const arcgis_username = config.get('ArcGis.username');
const arcgis_password = config.get('ArcGis.password');
const arcgis_url = config.get('ArcGis.url');
const to_location_string = config.get('Global.Locations.ToStreet') + " " + config.get('Global.Locations.ToPostCode') + " " +  config.get('Global.Locations.ToCity');
const to_location_street = config.get('Global.Locations.ToStreet');
const to_location_postcode = config.get('Global.Locations.ToPostCode');
const to_location_city =  config.get('Global.Locations.ToCity');

const from_location_street = config.get('Global.Locations.FromStreet');
const from_location_city = config.get('Global.Locations.FromCity');
const from_location_postcode = config.get('Global.Locations.FromPostCode');



var log4js = require('log4js');
var logger = log4js.getLogger();
logger.level = 'debug';
log4js.configure({
  appenders: { generic: { type: 'stdout' }, google: { type: 'stdout' }, arcgis: { type: 'stdout' }},
  categories: { default: { appenders: ['generic'], level: 'debug' } }
});

generateArcGisToken(arcgis_username, arcgis_password, function (status, token)
{

  const logger = log4js.getLogger('arcgis');
  if (status) {
      logger.error("Arcgis login Error:\n" + token);
  }
  else {
      logger.info("Arcgis login success: " + token);

      GetVellingeData(from_location_street, from_location_city, from_location_postcode, token, function (status, output)
      {
          const logger = log4js.getLogger('arcgis');
          var urlencode = require('urlencode');
          if (status) {
              logger.error("GetVellingeData Error:\n" + output);
          }
          else {
              logger.info("GetVellingeData Hemadress skolområde: " + output["attributes"]["SKOLOMR"]);
              logger.info("GetVellingeData HemadressLongitude: " + output["geometry"].x);
              logger.info("GetVellingeData HemadressLatitude: " + output["geometry"].y);

              var coordinates = output["geometry"].y + " " + output["geometry"].x;
              var to_location_string = urlencode(to_location_street + ", " + to_location_postcode + " " +  to_location_city);

              GetGoogleDistance(google_key, coordinates, to_location_string, function (status, output)
              {

                const logger = log4js.getLogger('google');
                if (status) {
                    logger.error(output);
                }
                else {
                    logger.info("Walking/Biking Distance is " + output + " metres");
                }
              });

            }
        });
        GetVellingeData(to_location_street, to_location_city, to_location_postcode, token, function (status, output)
        {
            const logger = log4js.getLogger('arcgis');
            if (status) {
                logger.error("GetVellingeData Error:\n" + output);
            }
            else {
                logger.info("GetVellingeData Skoladress skolområde: " + output["attributes"]["SKOLOMR"]);
                logger.info("GetVellingeData Skoladress Longitude: " + output["geometry"].x);
                logger.info("GetVellingeData Skoladress Latitude: " + output["geometry"].y);

                var coordinates = output["geometry"].y + " " + output["geometry"].x;
              }
          });
      }
    }
  );

async function GetGoogleDistance(key, fromLocation, toLocation, callback) {
  var Client = require('node-rest-client').Client;
  var google = new Client();
  var args = {
  		headers: {
  		 	"Content-Type": "application/json",
        "Accept": "application/json"
  		}
  };
  console.log("https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + fromLocation + "&destinations=" + toLocation + "&mode=walking&key=" + key);

    google.get("https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + fromLocation + "&destinations=" + toLocation + "&mode=walking&key=" + key, args, function (result, response) {
  	if(result.status === "OK"){
  		callback(false, result.rows[0].elements[0].distance.value)
  	}
  	else
  	{
  		callback(true, result);

  	}
  });

  google.on('error', function (err) {
      callback(true, err);
  });
}

async function generateArcGisToken(username, password, callback) {
      var Client = require('node-rest-client').Client;
      const parseJson = require('parse-json');
      var urlencode = require('urlencode');
      var arcgis = new Client();
      var args = {
          data: { username: username, password: password, referer:"requestip" },
      		headers: {
      		 	"Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
      		}
      };
      arcgis.post("https://www.arcgis.com/sharing/generateToken?f=json", args, function (result, response) {
      var jsonObject = parseJson(result)
        if (jsonObject["token"]) {
          var jsonObject = parseJson(result)
      		callback(false, jsonObject["token"]);
      	}
      	else
      	{
      		callback(true, result);

      	}
      });

      arcgis.on('error', function (err) {
          callback(true, err);
      });
}

async function GetVellingeData(address, city, postcode, token, callback) {
      var Client = require('node-rest-client').Client;
      const parseJson = require('parse-json');
      var urlencode = require('urlencode');
      var arcgis = new Client();
      var args = {
      		headers: {
      		 	"Content-Type": "application/json",
            "Accept": "application/json"
      		}
      };
      var searchString = urlencode("{\"0\":\"ADRESS='" + address + "' AND POSTNR='" + postcode + "' AND ORT='" + city + "'\"}");
      arcgis.get(arcgis_url + "/query?layerDefs=" + searchString + "&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&outSR=4326&datumTransformation=&applyVCSProjection=false&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&returnIdsOnly=false&returnCountOnly=false&returnDistinctValues=false&returnZ=false&returnM=false&returnHiddenFields=false&sqlFormat=standard&f=json&token=" + token, args, function (result, response) {
      	if (!result["error"]) {
          var jsonObject = parseJson(result)
      		callback(false, jsonObject["layers"][0]["features"][0]);
      	}
      	else
      	{
      		callback(true, result);

      	}
      });

      arcgis.on('error', function (err) {
          callback(true, err);
      });
}
