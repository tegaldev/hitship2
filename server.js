var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

var BattleshipGame = require('./app/game.js');
var GameStatus = require('./app/gameStatus.js');

var port = 5600;

var users = {};
var gameIdCounter = 1;

app.use(express.static(__dirname + '/public'));

http.listen(port, function(){
  console.log('listening on *:' + port);
});

io.on('connection', function(socket) {
  console.log((new Date().toISOString()) + ' ID ' + socket.id + ' connected.');

  // erstellt den Benutzer als Object für spätere Daten
  users[socket.id] = {
    inGame: null,
    player: null
  }; 

  // Betritt den Warteraum, man muss auf einen zweiten Spieler warten.
  socket.join('waiting room');

  /**
   * Chat Chat Chat
   */
  socket.on('chat', function(msg) {
    if(users[socket.id].inGame !== null && msg) {
      console.log((new Date().toISOString()) + ' Chat message from ' + socket.id + ': ' + msg);
      
      // Sende eine Nachricht Gegner
      socket.broadcast.to('game' + users[socket.id].inGame.id).emit('chat', {
        name: 'Opponent',
        message: entities.encode(msg),
      });

      // Sende Nachricht an selbst
      io.to(socket.id).emit('chat', {
        name: 'Me',
        message: entities.encode(msg),
      });
    }
  });

  /**
   * Verarbeite Schuss vom Clienten
   */
  socket.on('shot', function(position) {
    var game = users[socket.id].inGame, opponent;

    if(game !== null) {
      // Ist der Benutzer dran?
      if(game.currentPlayer === users[socket.id].player) {
        opponent = game.currentPlayer === 0 ? 1 : 0;

        if(game.shoot(position)) {
          // Führt der Schuss zum Ende?
          checkGameOver(game);

          // Erneuert den Spielstatus auf beiden Seiten
          io.to(socket.id).emit('update', game.getGameState(users[socket.id].player, opponent));
          io.to(game.getPlayerId(opponent)).emit('update', game.getGameState(opponent, opponent));
        }
      }
    }
  });
  
  /**
   * Wenn ein Spieler das Spiel verlasst
   */
  socket.on('leave', function() {
    if(users[socket.id].inGame !== null) {
      leaveGame(socket);

      socket.join('waiting room');
      joinWaitingPlayers();
    }
  });

  /**
   * Wenn ein Spieler die Verbindung verliert
   */
  socket.on('disconnect', function() {
    console.log((new Date().toISOString()) + ' ID ' + socket.id + ' disconnected.');
    
    leaveGame(socket);

    delete users[socket.id];
  });

  joinWaitingPlayers();
});

/**
 * Genieriert das Spiel wärend man im Warteraum ist
 */
function joinWaitingPlayers() {
  var players = getClientsInRoom('waiting room');
  
  if(players.length >= 2) {
    // Zwei Spieler Warten -> er kreeiert ein neues Spiel
    var game = new BattleshipGame(gameIdCounter++, players[0].id, players[1].id);

    // Erstelle einen neuen Raum für dieses Spiel
    players[0].leave('waiting room');
    players[1].leave('waiting room');
    players[0].join('game' + game.id);
    players[1].join('game' + game.id);

    users[players[0].id].player = 0;
    users[players[1].id].player = 1;
    users[players[0].id].inGame = game;
    users[players[1].id].inGame = game;
    
    io.to('game' + game.id).emit('join', game.id);

    // Er soll das Spielfeld aufbauen
    io.to(players[0].id).emit('update', game.getGameState(0, 0));
    io.to(players[1].id).emit('update', game.getGameState(1, 1));

    console.log((new Date().toISOString()) + " " + players[0].id + " and " + players[1].id + " have joined game ID " + game.id);
  }
}

/**
 * Wenn das Benutzer Spiel verlassen wird.
 * @param {type} socket
 */
function leaveGame(socket) {
  if(users[socket.id].inGame !== null) {
    console.log((new Date().toISOString()) + ' ID ' + socket.id + ' left game ID ' + users[socket.id].inGame.id);

    // Benachrichte Spieler
    socket.broadcast.to('game' + users[socket.id].inGame.id).emit('notification', {
      message: 'Opponent has left the game'
    });

    if(users[socket.id].inGame.gameStatus !== GameStatus.gameOver) {
      // Spiel ist nicht feriggestellt, abbrechen.
      users[socket.id].inGame.abortGame(users[socket.id].player);
      checkGameOver(users[socket.id].inGame);
    }

    socket.leave('game' + users[socket.id].inGame.id);

    users[socket.id].inGame = null;
    users[socket.id].player = null;

    io.to(socket.id).emit('leave');
  }
}

/**
 * Benachrichitge den Spieler, wenn das Spiel vorbei ist.
 * @param {type} game
 */
function checkGameOver(game) {
  if(game.gameStatus === GameStatus.gameOver) {
    console.log((new Date().toISOString()) + ' Game ID ' + game.id + ' ended.');
    io.to(game.getWinnerId()).emit('gameover', true);
    io.to(game.getLoserId()).emit('gameover', false);
  }
}

/**
 * Finde alle sockets in einem Raum
 * @param {type} room
 * @returns {Array}
 */
function getClientsInRoom(room) {
  var clients = [];
  for (var id in io.sockets.adapter.rooms[room]) {
    clients.push(io.sockets.adapter.nsp.connected[id]);
  }
  return clients;
}
