/**
 * Ship constructor
 * @param {Number} size
 */
function Ship(size) {
  this.x = 0;
  this.y = 0;
  this.size = size;
  this.hits = 0;
  this.horizontal = false;
}

/**
 * Prüft ob das Schiff gesunken ist
 * @returns {Boolean}
 */
Ship.prototype.isSunk = function() {
  return this.hits >= this.size;
};

module.exports = Ship;


