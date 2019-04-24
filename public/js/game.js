var GameStatus = {
  inProgress: 1,
  gameOver: 2
}

var Game = (function() {
  var canvas = [], context = [], grid = [],
      gridHeight = 361, gridWidth = 361, gridBorder = 1,
      gridRows = 10, gridCols = 10, markPadding = 10, shipPadding = 3,
      squareHeight = (gridHeight - gridBorder * gridRows - gridBorder) / gridRows,
      squareWidth = (gridWidth - gridBorder * gridCols - gridBorder) / gridCols,
      turn = false, gameStatus, squareHover = { x: -1, y: -1 };

  canvas[0] = document.getElementById('canvas-grid1');    // Spieler 
  canvas[1] = document.getElementById('canvas-grid2');    // Gegner
  context[0] = canvas[0].getContext('2d');
  context[1] = canvas[1].getContext('2d');

  /**
   * Highlightet bei Mouseover
   */
  canvas[1].addEventListener('mousemove', function(e) {
    var pos = getCanvasCoordinates(e, canvas[1]);
    squareHover = getSquare(pos.x, pos.y);
    drawGrid(1);
  });

  /**
   * Maus bewegt sich außerhalb des Grids, kein Highlight
   */
  canvas[1].addEventListener('mouseout', function(e) {
    squareHover = { x: -1, y: -1 };
    drawGrid(1);
  });

  /**
   * Schießt auf das Feld bei Mausklick (wenn gerade dran).
   */
  canvas[1].addEventListener('click', function(e) {
    if(turn) {
      var pos = getCanvasCoordinates(e, canvas[1]);
      var square = getSquare(pos.x, pos.y);
      sendShot(square);
    }
  });

  /**
   * Anhand der Mauskoordinaten wird das Rechteck ausgewählt
   * @param {type} x Mouse x
   * @param {type} y Mouse y
   * @returns {Object}
   */
  function getSquare(x, y) {
    return {
      x: Math.floor(x / (gridWidth / gridCols)),
      y: Math.floor(y / (gridHeight / gridRows))
    };
  };

  /**
   * Bekommt die Maus Position anhand des Rasters Oben, Links unten
   * @param {type} event
   * @param {type} canvas
   * @returns {Object} Position
   */
  function getCanvasCoordinates(event, canvas) {
    rect = canvas.getBoundingClientRect();
    return {
      x: Math.round((event.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
      y: Math.round((event.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
    };
  };

  /**
   * Startet ein neues Spiel
   */
  function initGame() {
    var i;

    gameStatus = GameStatus.inProgress;
    
    // Generiert ein leeres Spielfeld
    grid[0] = { shots: Array(gridRows * gridCols), ships: [] };
    grid[1] = { shots: Array(gridRows * gridCols), ships: [] };

    for(i = 0; i < gridRows * gridCols; i++) {
      grid[0].shots[i] = 0;
      grid[1].shots[i] = 0;
    }

    // Gibt die Klassen aus, verlierer, gewinner, usw.
    $('#turn-status').removeClass('alert-your-turn').removeClass('alert-opponent-turn')
            .removeClass('alert-winner').removeClass('alert-loser');

    drawGrid(0);
    drawGrid(1);
  };

  /**
   * Updated spieler oder gegner Spielfeld
   * @param {type} player
   * @param {type} gridState
   * @returns {undefined}
   */
  function updateGrid(player, gridState) {
    grid[player] = gridState;
    drawGrid(player);
  };

  /**
   * Wechselt den Status welcher Spieler dran ist
   * @param {type} turnState
   * @returns {undefined}
   */
  function setTurn(turnState) {
    if(gameStatus !== GameStatus.gameOver) {
      turn = turnState;

      if(turn) {
        $('#turn-status').removeClass('alert-opponent-turn').addClass('alert-your-turn').html('Du bist am Zug!');
      } else {
        $('#turn-status').removeClass('alert-your-turn').addClass('alert-opponent-turn').html('Warte auf Gegenspieler');
      }
    }
  };

  /**
   * Setzt das spiel zu Game over und gibt die Nachricht aus ob gewonnen oder verloren
   * @param {Boolean} isWinner
   */
  function setGameOver(isWinner) {
    gameStatus = GameStatus.gameOver;
    turn = false;
    
    if(isWinner) {
      $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn')
              .addClass('alert-winner').html('Du hast Gewonnen! <a href="#" class="btn-leave-game">Nochmal?</a>.');
    } else {
      $('#turn-status').removeClass('alert-opponent-turn').removeClass('alert-your-turn')
              .addClass('alert-loser').html('Du hast verloren. <a href="#" class="btn-leave-game">Rematch?</a>.');
    }
    $('.btn-leave-game').click(sendLeaveRequest);
  }

  /*
   * Zeichnet das Spielfeld mit Rechtecken, Schiffen und Markierungen
   */
  function drawGrid(gridIndex) {
    drawSquares(gridIndex);
    drawShips(gridIndex);
    drawMarks(gridIndex);
  };

  /**
   * Erstellt den Grid und den Hintergrund, Farben
   * @param {Number} gridIndex
   */
  function drawSquares(gridIndex) {
    var i, j, squareX, squareY;

    context[gridIndex].fillStyle = '#ddd'
    context[gridIndex].fillRect(0, 0, gridWidth, gridHeight);

    for(i = 0; i < gridRows; i++) {
      for(j = 0; j < gridCols; j++) {
        squareX = j * (squareWidth + gridBorder) + gridBorder;
        squareY = i * (squareHeight + gridBorder) + gridBorder;

        context[gridIndex].fillStyle = '#f6f8f9'

        // Highlightet das Kästchen wenn der Benutzer am Zug ist auf noch nicht geschossenen Feldern, gegner Feld
        if(j === squareHover.x && i === squareHover.y &&
                gridIndex === 1 && grid[gridIndex].shots[i * gridCols + j] === 0 && turn) {
          context[gridIndex].fillStyle = '#3dc8ff';
        }

        context[gridIndex].fillRect(squareX, squareY, squareWidth, squareHeight);
      }
    }
  };

  /**
   * erstellt sichtbare Schiffe auf das Feld
   * @param {Number} gridIndex
   */
  function drawShips(gridIndex) {
    var ship, i, x, y,
        shipWidth, shipLength;

    context[gridIndex].fillStyle = '#020c1d';
    
    for(i = 0; i < grid[gridIndex].ships.length; i++) {
      ship = grid[gridIndex].ships[i];

      x = ship.x * (squareWidth + gridBorder) + gridBorder + shipPadding;
      y = ship.y * (squareHeight + gridBorder) + gridBorder + shipPadding;
      shipWidth = squareWidth - shipPadding * 2;
      shipLength = squareWidth * ship.size + (gridBorder * (ship.size - 1)) - shipPadding * 2;

      if(ship.horizontal) {
        context[gridIndex].fillRect(x, y, shipLength, shipWidth);
      } else {
        context[gridIndex].fillRect(x, y, shipWidth, shipLength);
      }
    }
  };
  
  /**
   * Erstellt die Schüsse auf dem FeldDraw shot marks on grid (black crosses for missed and red circles for hits)
   * @param {Number} gridIndex
   */
  function drawMarks(gridIndex) {
    var i, j, squareX, squareY;

    for(i = 0; i < gridRows; i++) {
      for(j = 0; j < gridCols; j++) {
        squareX = j * (squareWidth + gridBorder) + gridBorder;
        squareY = i * (squareHeight + gridBorder) + gridBorder;

        // erstellt ein schwarzes Kreuz, wenn daneben geschossen wurde.
        if(grid[gridIndex].shots[i * gridCols + j] === 1) {
          context[gridIndex].beginPath();
          context[gridIndex].moveTo(squareX + markPadding, squareY + markPadding);
          context[gridIndex].lineTo(squareX + squareWidth - markPadding, squareY + squareHeight - markPadding);
          context[gridIndex].moveTo(squareX + squareWidth - markPadding, squareY + markPadding);
          context[gridIndex].lineTo(squareX + markPadding, squareY + squareHeight - markPadding);
          context[gridIndex].strokeStyle = '#000000';
          context[gridIndex].stroke();
        }
        // erstellt einen Kreis, wenn getroffen wurde
        else if(grid[gridIndex].shots[i * gridCols + j] === 2) {
          context[gridIndex].beginPath();
          context[gridIndex].arc(squareX + squareWidth / 2, squareY + squareWidth / 2,
                                 squareWidth / 2 - markPadding, 0, 2 * Math.PI, false);
          context[gridIndex].fillStyle = '#b90615';
          context[gridIndex].fill();
        }
      }
    }
  };

  return {
    'initGame': initGame,
    'updateGrid': updateGrid,
    'setTurn': setTurn,
    'setGameOver': setGameOver
  };
})();
