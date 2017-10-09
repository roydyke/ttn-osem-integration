'use strict';

/**
 * @module decoding/helpers
 * @license MIT
 */

/**
 * Transforms an array of bytes into an integer value.
 * NOTE: uses little endian; LSB comes first!
 * @param {Array} bytes - data to transform
 * @return {Number}
 */
const bytesToInt = function bytesToInt (bytes) {
  let v = 0;
  for (let i = 0; i < bytes.length; i++) {
    v = v | Number(bytes[i] << (i * 8));
  }

  return v;
};

/**
 * Matches the _ids of a set of sensors to a given set of properties.
 * @param {Array} sensors - Set of sensors as specified in Box.sensors
 * @param {Object} sensorMatchings - defines a set of allowed values for one
 *        or more properties. Once a property matches, the others are ignored.
 * @return {Object} Key-value pairs for each property of sensorMatchings and
 *         the matched sensorIds. If a match was not found, the key is not included.
 * @example <caption>sensorMatchings</caption>
 * {
 *   humidity: {
 *     title: ['rel. luftfeuchte', 'luftfeuchtigkeit', 'humidity'],
 *     type: ['HDC1008']
 *   },
 *   pressure: {
 *     title: ['luftdruck', 'druck', 'pressure', 'air pressure'],
 *     unit: ['°C', '°F']
 *   }
 * }
 * @example <caption>result</caption>
 * {
 *   humidity: '588876b67dd004f79259bd8a',
 *   pressure: '588876b67dd004f79259bd8b'
 * }
 */
const findSensorIds = function findSensorIds (sensors, sensorMatchings) {
  const sensorMap = {};

  // for each sensorId to find
  for (const phenomenon in sensorMatchings) {

    // for each sensor variable to look up
    for (const sensorProp in sensorMatchings[phenomenon]) {

      const aliases = sensorMatchings[phenomenon][sensorProp].map(a => a.toLowerCase());
      let foundIt = false;

      // for each unmatched sensor
      for (const sensor of sensors) {
        if (!sensor[sensorProp]) {
          continue;
        }

        const prop = sensor[sensorProp].toString().toLowerCase();

        if (aliases.includes(prop)) {
          sensorMap[phenomenon] = sensor._id.toString();
          foundIt = true;
          break;
        }
      }

      // don't check the other properties, if one did match
      if (foundIt) {
        break;
      }
    }
  }

  return sensorMap;
};

/**
 * Factory that returns a bufferTransformer `onResult`-hook, which applies the
 * value of the measurement from `sensorId` to the `property` of the following
 * measurements, until the measurement with this `sensorId` is found.
 * The used measurement is removed from the result.
 * If a transformer function is passed, the value will be passed trough the function.
 * @param {Object} args Parameters as mentioned in description.
 * @example
 * {
 *   sensorId: String,     // sensorId to match measurement against
 *   property: String,     // property to assign the value of the matched measure
 *   transformer: Function // optional value transformation function
 * }
 */
const applyValueFromMeasurement = function applyValueFromMeasurement (args) {
  const { sensorId, property, transformer } = args;

  return function (measurements) {
    // find "measurement" from the unixtime decoder
    // and discard it.
    for (let k = 0; k < measurements.length; k++) {
      if (measurements[k].sensor_id === sensorId) {
        const value = transformer
          ? transformer(measurements[k].value)
          : measurements[k].value;

        measurements.splice(k, 1);

        // apply the value to the following measurements,
        // until the next instance of `sensorId` is found.
        while (
          measurements[k] &&
          measurements[k].sensor_id !== sensorId
        ) {
          measurements[k++][property] = value;
        }

        break;
      }
    }
  };
};

module.exports = {
  applyValueFromMeasurement,
  bytesToInt,
  findSensorIds
};
