var socket = io();

$(function() {
  /**
   * Erfolgreich zum Server verbunden
   */
  socket.on('connect', function() {
    console.log('Connected to server.');
    $('#disconnected').hide();
    $('#waiting-room').show();   
  });

  /**
   * Wenn ein Disconect zum Server besteht
   */
  socket.on('disconnect', function() {
    console.log('Disconnected from server.');
    $('#waiting-room').hide();
    $('#game').hide();
    $('#disconnected').show();
  });

  /**
   * Benutzer ist dem Spiel beigetreten
   */
  socket.on('join', function(gameId) {
    Game.initGame();
    $('#messages').empty();
    $('#disconnected').hide();
    $('#waiting-room').hide();
    $('#game').show();
    $('#game-number').html(gameId);
  })

  /**
   * Akutalisiert den Spieler Status
   */
  socket.on('update', function(gameState) {
    Game.setTurn(gameState.turn);
    Game.updateGrid(gameState.gridIndex, gameState.grid);
  });

  /**
   * Chat nachricht
   */
  socket.on('chat', function(msg) {
   // $('#messages').append('Willkommen im Chat');
    $('#messages').append('<li><strong>' + msg.name + ':</strong> ' + msg.message + '</li>');
    $('#messages-list').scrollTop($('#messages-list')[0].scrollHeight);
  });

  /**
   * Spiel benachrichtigung
   */
  socket.on('notification', function(msg) {
    $('#messages').append('<li>' + msg.message + '</li>');
    $('#messages-list').scrollTop($('#messages-list')[0].scrollHeight);
  });

  /**
   * Ändert das Spiel zu Spiel vorbei
   */
  socket.on('gameover', function(isWinner) {
    Game.setGameOver(isWinner);
  });
  
  /**
   * Verlassen des Spiels -> Warteraum
   */
  socket.on('leave', function() {
    $('#game').hide();
    $('#waiting-room').show();
  });

  /**
   * Sende eine Nachricht an den Server
   */
  $('#message-form').submit(function() {
    socket.emit('chat', $('#message').val());
    $('#message').val('');
    return false;
  });

});

/**
 * Sende eine Anfrage bei Verlassen des Spiels
 * @param {type} e Event
 */
function sendLeaveRequest(e) {
  e.preventDefault();
  socket.emit('leave');
}

/**
 * Sendet die Schusskoordinaten an den Server
 * @param {type} square
 */
function sendShot(square) {
  socket.emit('shot', square);
}
