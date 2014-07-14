angular.module('starter.services', [])

/**
 * A simple example service that returns some data.
 */
.factory('UserDao', function(Sign, DB) {
  return {
    addFriend : function( userIds ){
      var loginUserId = Sign.getUser().userId;

      var inUserId = "";
      for( var inx = 0 ; inx < userIds.length ; inx++ ){
        inUserId += "'"+userIds[inx]+"'";

        if( inx < userIds.length-1 ){
          inUserId += ", ";
        }
      }

      var query =
        "UPDATE TB_USER "+
        "SET friend_flag = 'Y' "+
        "WHERE user_id in ( "+
        inUserId +
        " ) "+
        "AND owner_id = ? ";

      var cond = [
        loginUserId
      ];

      return DB.query(query, cond).then(function(result) {
        return result;
      });      
    },
    add : function(jsonObj, friendFlag){
      var loginUserId = Sign.getUser().userId;

      var query = "INSERT OR ";

      if(jsonObj.friendFlag){
        query +="REPLACE ";
      } else {
        query +="IGNORE ";
      }

      query += "INTO TB_USER (user_id, user_name, message, image, chosung, owner_id ";

      if(jsonObj.friendFlag){
        query += ", friend_flag ";
      }

      query += ") VALUES ( ?, ?, ?, ?, ?, ? ";

      if(friendFlag){
        query += ", 'Y' ";
      }

      query += ") ";

      var currentTimestamp = Date.now();
      var cond = [
        jsonObj.userId,
        jsonObj.userName,
        jsonObj.message,
        jsonObj.image,
        jsonObj.chosung,
        loginUserId
      ];

      return DB.query(query, cond).then(function(result) {
        return result;
      });      
    },
    list : function( jsonObj ){
      var loginUserId = Sign.getUser().userId;
      return DB.query(
        'SELECT user_id, user_name, message, image, chosung, owner_id, friend_flag FROM TB_USER where owner_id = ? and friend_flag = ? ORDER BY user_name', [loginUserId, jsonObj.friendFlag]
      ).then(function(result) {
        return DB.fetchAll(result);
      });
    }  
  }
})
.factory('Cache', function(){
  var cache = {};

  return {
    all : function(){
      return cache;
    },
    add : function(key, value){
      cache[key] = value;
    },
    remove : function(key){
      delete cache[key];
    },
    get : function(key){
      return cache[key];
    }
  }
})
.factory('Friends', function(SocketManager, Sign, UTIL, UserDao, Cache) {
  // Might use a resource here that returns a JSON array
  var loginUserId;
  var scope;

  return {
    add: function(userIds, callback) {
      loginUserId = Sign.getUser().userId;
      SocketManager.get( function( socket ){
        socket.emit( 'group-add', {'U':userIds, 'GR' : loginUserId}, function( data ){
          
          // Multi Add Friend
          UserDao.addFriend( userIds );
          callback( data );
        });
      });      
    },
    list : function(callback){
      UserDao.list( { 'friendFlag' : 'Y'} ).then( function ( result ){
        friends = {};
        for( var key in result ){
          Cache.add( result[key].user_id, { 'NM' : result[key].user_name, 'I': result[key].image });
        }

        callback( result );
      });
    },
    refresh : function(callback){
      var loginUserId = Sign.getUser().userId;    
      SocketManager.get( function( socket ){        
        socket.emit( 'group-list', {'GR':loginUserId}, function( data ){
          if( data.status == 'ok' ){
            var users = data.result;

            for( var inx = 0 ; inx < users.length ; inx++ ){              
              if( users[inx].userId != loginUserId ){
                var user = { 'userId' : users[inx].U, 'userName': users[inx].DT.NM, 
                  'message' : users[inx].DT.MG, 'image': users[inx].DT.I, 'chosung' : UTIL.getChosung( users[inx].DT.NM ), 'friendFlag' : 'Y' };
                UserDao.add( user, true );
              }
            }
            callback( {'status':'ok'} );
          }
        });
      });
    },
    getNames : function( userIds ){
      var loginUserId = Sign.getUser().userId;
      var loginUserName = Sign.getUser().userName;
      var result;      
      var userNames = [];

      var userArray = angular.copy( userIds );

      var friends = Cache.all();

      // Room with 2 people
      if( userArray.length == 2 && userArray.indexOf( loginUserId ) > -1 ){
        userArray.splice( userArray.indexOf( loginUserId ), 1 );

        var name = userArray[0];
        if( friends[ userArray[0] ] != undefined ){
          name = friends[ userArray[0] ].NM;
        }

        userNames.push( name );
      } else {

        for( var inx = 0 ; inx < userArray.length ; inx++ ){
          var name = userArray[inx];
          if( userArray[inx] == loginUserId ){
            name = loginUserName;
          }else if( friends[ userArray[inx] ] != undefined ){
            name = friends[ userArray[inx] ].NM;
          }

          userNames.push( name );
        }
      }

      return userNames.join(",");
    }
  }
})
.factory('Users', function(SocketManager, Sign, UserDao, UTIL, Cache) {
  var loginUserId;

  return {
    refresh : function(callback){

      loginUserId = Sign.getUser().userId;

      SocketManager.get( function( socket ){        
        socket.emit( 'user-list', {}, function( data ){
          console.log( 'user-list' );
          if( data.status == 'ok' ){
            var userArray = data.result;
            for( var inx = 0 ; inx < userArray.length ; inx++ ){             
              var cUserId = userArray[inx].U;

              if( cUserId != loginUserId ){
                var user = { 'userId' : userArray[inx].U, 'userName': userArray[inx].DT.NM, 'image': userArray[inx].DT.I,
                  'message' : userArray[inx].DT.MG, 'chosung' : UTIL.getChosung( userArray[inx].DT.NM ) };
                UserDao.add( user );
                Cache.add( userArray[inx].U, { 'NM' : userArray[inx].DT.NM, 'I': userArray[inx].DT.I } );
              }
            }
          }

          UserDao.list( { 'friendFlag' : 'N'} ).then( function ( result ){
            callback( result );
          });
        });
      });
    },
    list : function(callback){
      UserDao.list( { 'friendFlag' : 'N'} ).then( function ( result ){
        callback( result );
      });
    }
  }
})
.factory('Channels', function(DB, UTIL, APP_INFO, Sign) {
  // Might use a resource here that returns a JSON array
  var scope;
  var loginUserId;

  return {
    get : function( channelId ){
      loginUserId = Sign.getUser().userId;
      return DB.query(
        'SELECT channel_id, channel_name, channel_users, channel_image, latest_message, unread_count, channel_updated FROM TB_CHANNEL where channel_id = ? and owner_id = ? ', [channelId,loginUserId]
      ).then(function(result) {
          return DB.fetch(result);
        });
    },
    list : function( $scope, socket ){
      scope = $scope;
      loginUserId = Sign.getUser().userId;

      return DB.query(
        'SELECT channel_id, channel_name, channel_users, channel_image, latest_message, unread_count, channel_updated FROM TB_CHANNEL where owner_id = ? ORDER BY channel_updated DESC', [loginUserId]
      ).then(function(result) {
        return DB.fetchAll(result);
      });
    },
    addCount : function(jsonObj){
      loginUserId = Sign.getUser().userId;

      var query =
        "INSERT OR REPLACE INTO TB_CHANNEL "+
        "(channel_id, unread_count, channel_updated, owner_id) "+
        "SELECT new.channel_id, IFNULL( old.unread_count, new.unread_count) as unread_count, new.channel_updated, new.owner_id "+
        "FROM ( "+
        "  SELECT ? as channel_id, 0 as unread_count , ? as channel_updated, ? as owner_id " +
        ") as new " +
        " LEFT JOIN ( " +
        "   SELECT channel_id, unread_count + 1 as unread_count, channel_updated, owner_id " +
        "   FROM TB_CHANNEL " +
        " ) AS old ON new.channel_id = old.channel_id AND new.owner_id = old.owner_id ; ";

      var cond = [
        jsonObj.channel,
        Date.now(),
        loginUserId
      ];

      return DB.query(query, cond).then(function(result) {
        return result;
      });

    },
    getAllCount : function(jsonObj){
      loginUserId = Sign.getUser().userId;

      return DB.query(
        'SELECT sum( unread_count ) as total_count FROM TB_CHANNEL where owner_id = ? ', [loginUserId]
      ).then(function(result) {
        return DB.fetch(result);
      });
    },
    updateUsers : function(param){
      loginUserId = Sign.getUser().userId;

      var query = "UPDATE TB_CHANNEL ";
      query += "SET channel_name = ? , channel_users = ? ";
      query += "WHERE channel_id = ? and owner_id = ? ";     

      var cond = [ param.name , param.users, param.channel, loginUserId ];

      return DB.query(query, cond).then(function(result) {
        return result;
      });
    },    
    update : function(param){
      loginUserId = Sign.getUser().userId;

      var cond = [Date.now()];

      var query = "UPDATE TB_CHANNEL ";
      query += "SET unread_count = 0, channel_updated = ? ";

      if( param.message != undefined && param.message != '' && param.image != undefined && param.image != '' ){
        query += ", latest_message = ?, channel_image = ? ";
        cond.push( param.message );
        cond.push( param.image );
      } else if ( param.message != undefined && param.message != '' ){
        query += ", latest_message = ? ";
        cond.push( param.message );
      } else  if ( param.image != undefined && param.image != '' ){
        query += ", channel_image = ? ";
        cond.push( param.image );
      }

      query += "WHERE channel_id = ? and owner_id = ? ";    

      cond.push( param.channel );
      cond.push( loginUserId );

      return DB.query(query, cond).then(function(result) {
        return result;
      });
    },
    insert : function(jsonObj){
      loginUserId = Sign.getUser().userId;
      var query =
        "INSERT OR IGNORE INTO TB_CHANNEL "+
        "(channel_id, channel_name, channel_users, unread_count, channel_updated, owner_id) VALUES "+
        "(?, ?, ?, 0, ?, ?)";

      var cond = [
        jsonObj.C,
        jsonObj.NM,
        jsonObj.U,
        Date.now(),
        loginUserId
      ];

      return DB.query(query, cond).then(function(result) {
        return result;
      });        

    },
    add : function(jsonObj){
      loginUserId = Sign.getUser().userId;

      var query =
        "INSERT OR REPLACE INTO TB_CHANNEL "+
        "(channel_id, channel_name, channel_users, channel_image, latest_message, unread_count, channel_updated, owner_id) "+
        "SELECT new.channel_id, new.channel_name, new.channel_users, new.channel_image, new.latest_message, IFNULL( old.unread_count, new.unread_count) as unread_count, new.channel_updated, new.owner_id "+
        "FROM ( "+
        "  SELECT ? as channel_id, ? as channel_name, ? as channel_users, ? as channel_image, ? as latest_message, 1 as unread_count, ? as channel_updated, ? as owner_id " +
        ") as new " +
        " LEFT JOIN ( " +
        "   SELECT channel_id, channel_name, channel_users, channel_image, unread_count + 1 as unread_count, channel_updated, owner_id " +
        "   FROM TB_CHANNEL " +
        " ) AS old ON new.channel_id = old.channel_id AND old.owner_id = new.owner_id ; ";      

      var currentTimestamp = Date.now();
      var cond = [
        jsonObj.channel,
        jsonObj.name,
        jsonObj.users,
        jsonObj.image,
        jsonObj.message,
        currentTimestamp,
        loginUserId
      ];

      if( scope != undefined ){

        var unreadCount = 1;    
        var searchIndex = -1;
        for( var inx = 0 ; inx < scope.channelArray.length; inx++ ){
          if( scope.channelArray[inx].channel_id == jsonObj.channel ){
            searchIndex = inx;
            break;
          }
        }

        if( searchIndex > -1 ){
          unreadCount = scope.channelArray[ searchIndex ].unread_count + 1;
          scope.channelArray.splice(searchIndex, 1);
        }
        
        var channel = {'channel_id':jsonObj.channel,'channel_name':jsonObj.name,'unread_count': unreadCount, 'latest_message':jsonObj.message, 'channel_image':jsonObj.image, 'channel_updated': currentTimestamp};
        scope.channelArray.unshift( channel );
        scope.$apply();     
      }

      return DB.query(query, cond).then(function(result) {
        return result;
      });
    },
    generateId : function(jsonObj){
      var channelId;
      if( jsonObj.U.length > 2 ){
        channelId = UTIL.getUniqueKey()+"^"+APP_INFO.appKey;;
      } else {
        channelId = jsonObj.U.sort().join( "$" )+"^"+APP_INFO.appKey;
      }
      return channelId;
    }
  }
})
.factory('Messages', function(DB, Sign, Cache) {file:///D:/ionic/workspace/messengerX/www/index.html#/tab/
  // Might use a resource here that returns a JSON array
  var scope;

  return {
    list : function( channel ){
      var loginUserId = Sign.getUser().userId;
      return DB.query(
        'SELECT sender_id, sender_name, sender_image, message, time, type FROM TB_MESSAGE WHERE channel_id = ? and owner_id = ? ;', [channel,loginUserId]
      ).then(function(result) {
        return DB.fetchAll(result);
      });
    },
    add : function(jsonObj){      
      var loginUserId = Sign.getUser().userId;
      var query =
        "INSERT INTO TB_MESSAGE "+
        "(channel_id, sender_id, sender_name, sender_image, message, type, time, owner_id) VALUES "+
        "(?, ?, ?, ?, ?, ?, ?, ?)";

      var cond = [
        jsonObj.C,
        jsonObj.S,
        jsonObj.UO.NM,
        jsonObj.UO.I,
        jsonObj.MG,
        jsonObj.type,
        jsonObj.TS,
        loginUserId
      ];

      // Add to Cache
      Cache.add( jsonObj.S, {'NM':jsonObj.UO.NM, 'I':jsonObj.UO.I} );

      return DB.query(query, cond).then(function(result) {
        return result;
      });
    }
  }
})
.factory('SocketManager', function($http, $rootScope, Sign, Channels, Messages, UTIL ) {
  var sessionSocket;
  var initFlag = false;
  var self;
  return {
    get : function(callback){
      if( !initFlag ){
        this.init( function( socket ) {
          sessionSocket = socket;
          callback( sessionSocket );
        });
      } else {
        callback( sessionSocket );
      }
    },
    init : function(callback){
      self = this;

      var loginUser = Sign.getUser();

      var socketOptions ={
        transports: ['websocket'],
        'force new connection': true
      };      

      var query =
        'A='+loginUser.app+'&'+
        'U='+encodeURIComponent(loginUser.userId)+'&'+
        'D='+loginUser.deviceId+'&'+
        'TK='+loginUser.userToken;
      // Session Socket
      var socket = io.connect(loginUser.sessionServer+'/session?'+query, socketOptions);

      socket.on('connect', function() {
        console.log( 'session socket connect');
        initFlag = true;
        sessionSocket = socket;

        // Sync Channel && Read Message
        self.channelList(function( channels ){
          self.unreadMessage( channels, function(result){
            socket.emit("message-received");

            Channels.getAllCount().then( function ( result ){
              $rootScope.totalUnreadCount = result.total_count;
              callback( socket );
            });
          });
        });
      });

      socket.on('_event', function (messageObject) {
        if( messageObject.event == 'NOTIFICATION' ){

          var data = messageObject.DT;

          socket.emit( 'channel-get', { 'C' : data.C }, function( channelJson ){
            console.log( channelJson );
            var channel = {'channel': data.C, 'users' : channelJson.result.DT.US};
            channel.message = decodeURIComponent( data.MG );

            if( channelJson.result.DT.UC > 2 ){
              channel.name = channelJson.result.DT.NM;
              channel.image = '';
            } else {
              channel.name = data.UO.NM;
              channel.image = data.UO.I;
            }

            $rootScope.totalUnreadCount++;
            Channels.add( channel );          
          });
        }
      });

      socket.on('disconnect', function (data) {
        console.info('session socket disconnect');
      });
    },
    close : function(){
      initFlag = false;
      sessionSocket.disconnect();
    },
    unreadMessage : function(channels, callback){
      var loginUser = Sign.getUser();
      sessionSocket.emit( "message-unread", function(resultObject) {
          var messageArray = resultObject.result;

          for( var inx = 0 ; inx < messageArray.length ; inx++ ){
            try {
            var data = messageArray[inx].MG.DT;
            data = JSON.parse(data);

            data.MG = decodeURIComponent( data.MG );          
            data.type = data.UO.U == loginUser.userId ? 'S':'R';

            var channel = channels[data.C];
            channel.message = data.MG;

            if( channel.users.length > 2 ){
              channel.name = channel.name;
            } else {
              channel.name = data.UO.NM;
              channel.image = data.UO.I;
            }
            Channels.add( channel );
            Messages.add( data );
            } catch(e){
              console.log( e );
            }
          }

        callback({'status':'ok'});
      });
    },
    channelList : function(callback){
      var loginUser = Sign.getUser();      
      sessionSocket.emit( "channel-list", function(resultObject) {    
        try { 
          var channelArray = resultObject.result;

          var channels = {};
          for( var inx = 0 ; inx < channelArray.length ; inx++ ){
            var data = channelArray[inx];
            var channel = {'channel': data.C, 'users' : data.DT.US };
            if( data.DT.UC > 2 ){
              channel.name = data.DT.NM;
            } else {
              channel.name = data.DT.F;
            }

            channels[ data.C ] =  channel;
          }
        } catch(e){
          console.log( e );
        }

        callback(channels);
      });
    }   
  }
})
.factory('Sign', function($http, $state, $rootScope, BASE_URL) {
  var loginUser;
  return {
    login : function( params, callback ){
      $http.post("http://"+BASE_URL+":8000/auth", params)
      .success(function(data) {
        callback( data );
      })
      .error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
      });
    },
    logout : function(){

      // Clear login
      loginUser = {};
      $rootScope.loginUser = {};
      //$state.go('signin');
      $state.transitionTo('signin', {}, { reload: true, notify: true });
    },    
    register : function( params, callback ){
      $http.post("http://"+BASE_URL+":8000/user/register", params)
      .success(function(data) {
        callback( data );
      })
      .error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
      });
    },
    update : function( params, callback ){
      $http.post("http://"+BASE_URL+":8000/user/update", params)
      .success(function(data) {
        callback( data );
      })
      .error(function(data, status, headers, config) {
        // called asynchronously if an error occurs
        // or server returns response with an error status.
      });
    },

    setUser : function( user ){
      loginUser = user;
    },
    getUser : function(){
      return loginUser;
    }
  }
})
.factory('Chat', function($http, $rootScope, BASE_URL, Channels, Messages, UTIL, Cache ) {
  var channelSocket;
  var CONF = {};

  return {
    init : function( params, loginUser, $scope, callback ){
      $http.get("http://"+BASE_URL+":8000/node/"+ encodeURIComponent( params.app ) + "/"+ encodeURIComponent( params.channel )+'?1=1' )
      .success(function( data ) {

        var latestDate;

        var socketServerUrl = data.result.server.url;

        CONF._app = params.app;
        CONF._channel = params.channel;
        CONF._user = { U : loginUser.userId, NM : loginUser.userName, I : loginUser.image};

        var query = "A=" + params.app + "&C=" + params.channel + "&U=" + params.userId + "&D=" + params.deviceId
         + "&S=" + data.result.server.name;
         
        var socketOptions ={
          'force new connection': true
        };

        channelSocket = io.connect(socketServerUrl+'/channel?'+query, socketOptions);

        channelSocket.on('connect', function() {
          console.log( 'channel connect' );
          channelSocket.emit( 'message-unread', function(jsonObj){
            var unreadMessages = jsonObj.result;
            
            var latestMessage = '';
            for( var inx = 0 ; inx < unreadMessages.length ; inx++ ){
              var data = JSON.parse( unreadMessages[inx].MG.DT );
              data.MG = decodeURIComponent( data.MG );              
              data.type = data.UO.U == loginUser.userId ? 'S':'R';

              latestMessage = data.MG;
              Messages.add( data );
            }

            //message received complete
            if( unreadMessages != undefined && unreadMessages.length > 0 ){
              channelSocket.emit("message-received");
            }

            /*
            *Reset Count Start
            */      
            var param = { 'channel' :  params.channel, 'reset' : true, 'message': latestMessage };
            Channels.update( param );

            /*
            *Reset Count End
            */
            var messages = [];
            Messages.list( params.channel ).then(function(messageArray) {
              for( var inx = 0 ; inx < messageArray.length ; inx++ ){
                var data = messageArray[inx];
                var dateStrs = UTIL.timeToString( data.time );

                var content;
                if( inx > 0 ){
                  latestDate =  UTIL.timeToString( messageArray[inx-1].time )[1];
                }

                if( latestDate != dateStrs[1] ){
                  content = '<span class="date">'+dateStrs[1]+'</span>';
                  messages.push( { content : content, from : 'T', date : dateStrs[1] } );
                }

                if(data.type == 'R'){                
                  content = '<div class="small">'+ data.sender_name+'</div>' ;
                  content += '<div class="from">'
                  content += '<img src="'+ Cache.get( data.sender_id ).I+'" class="profile"/>';
                  content += '<span class="from">'+data.message+'</span>';
                  content += '<span class="time">'+ dateStrs[2]+'</span>';
                  content += '</div>';
                } else {
                  content = '<span>'+data.message+'</span>';
                }

                messages.push( { content : content, from : data.type, date : dateStrs[1] } );
              }

              callback(messages);
            });
          });
        }); 

        channelSocket.on('connect_error', function(data) {
          console.log( data );[]
        });         

        channelSocket.on('MG', function (data) {

          try {

          data.MG = decodeURIComponent(data.MG); 
          data.type = data.UO.U == loginUser.userId ? 'S':'R' ;

          var content;
          var dateStrs = UTIL.timeToString( data.TS );

          if( latestDate != dateStrs[1] ){
            content = '<span class="date">'+dateStrs[1]+'</span>';
            $scope.add( { content : content, from : 'T', date : dateStrs[1] } );
            latestDate = dateStrs[1];
          }          

          if(data.type == 'R'){

            content = '<div class="small">'+ data.UO.NM+'</div>' ;
            content += '<div class="from">';
            content += '<img src="'+ data.UO.I+'" class="profile"/>';
            content += '<span >'+decodeURIComponent( data.MG )+'</span>';
            content += '<span class="time">'+dateStrs[2]+'</span>';
            content += '</div>'
            
          } else {
            content = '<span>'+data.MG+'</span>' 
          }

          var nextMessage = { content : content, from : data.type, date : dateStrs[1] };

          // Add to DB
          Messages.add( data );

          // 2 people Channel

          var param = { 'channel':data.C, 'reset' : true, 'message':data.MG };

          if( data.type == 'R' && data.C.indexOf( "$" ) > -1 ){
            param.image = data.UO.I
          }

          Channels.update( param );
          $scope.add( nextMessage );

          } catch ( e ){
            console.log( e );
          } 
        });
      })
      .error(function(data, status, headers, config) {
        console.log( status );
        // called asynchronously if an error occurs
        // or server returns response with an error status.
      });
    },
    send : function(msg){
      var param = {
        A:      CONF._app,
        C:  CONF._channel,
        NM:     'MG',
        DT:     {
          UO:     CONF._user,
          MG:  msg,
          S : CONF._user.U
        }
      };

      channelSocket.emit('send', param, function (data) {
      });
    },
    join : function( param, callback){
      channelSocket.emit('join', param, function (data) {
        callback( data );
      });
    },
    exit : function(){
      channelSocket.disconnect();
    }
  }
})
.factory('DB', function($q, DB_CONFIG) {
  var self = this;
  self.db = null;
  var changeDBFlag = false;

  self.init = function() {
    // Use self.db = window.sqlitePlugin.openDatabase({name: DB_CONFIG.name}); in production


    try {
      if (!window.openDatabase) {
        window.plugins.toast.showShortCenter(
          "죄송합니다. DB를 지원하지 않습니다. \n북마크 기능을 사용하실 수 없습니다.",function(a){},function(b){}
        );
      } else {
        var shortName = DB_CONFIG.name;
        var displayName = 'news database';
        var maxSize = 5 * 1024 * 1024; // in bytes
        self.db = openDatabase(shortName, '', displayName, maxSize);      
      }
    } catch(e) {
      // Error handling code goes here.
      if (e == INVALID_STATE_ERR) {
        // Version number mismatch.
        window.plugins.toast.showShortCenter(
          "죄송합니다. DB 버젼을 지원하지 않습니다.\n북마크 기능을 사용하실 수 없습니다.",function(a){},function(b){}
        );
        return;
      } else {
        window.plugins.toast.showShortCenter(
          "죄송합니다. "+e+"\n북마크 기능을 사용하실 수 없습니다.",function(a){},function(b){}
        );
        return;
      }
    }

    if( self.db.version != DB_CONFIG.version ){    
      self.db.changeVersion(self.db.version, DB_CONFIG.version, function (t) {        
        changeDBFlag = true;
      });
    }

    angular.forEach(DB_CONFIG.tables, function(table) {
      var columns = [];

      angular.forEach(table.columns, function(column) {
        columns.push(column.name + ' ' + column.type);
      });

      if( changeDBFlag ){
        var query = 'DROP TABLE ' + table.name;
        self.query(query);
      }

      var query = 'CREATE TABLE IF NOT EXISTS ' + table.name + ' (' + columns.join(',') + ')';      
      self.query(query);

      if( table.table_index != undefined ){
        setTimeout( function(){

          var query = 'CREATE '+ table.table_index.type +' INDEX IF NOT EXISTS ' + table.table_index.name +' ON ' +table.name + ' (' + table.table_index.columns.join(',') + ')';
          self.query(query);
        }, 2000 );
      }
    });
  };

  self.query = function(query, bindings) {
    bindings = typeof bindings !== 'undefined' ? bindings : [];
    var deferred = $q.defer();
    self.db.transaction(function(transaction) {
      transaction.executeSql(query, bindings, function(transaction, result) {
        deferred.resolve(result);
      }, function(transaction, error) {
        deferred.reject(error);
      });
    });

    return deferred.promise;
  };

  self.fetchAll = function(result) {
    var output = [];

    for (var i = 0; i < result.rows.length; i++) {
      output.push(result.rows.item(i));
    }

    return output;
  };

  self.fetch = function(result) {
    if( result.rows == undefined || result.rows.length == 0 ){
      return undefined;
    } else {
      return result.rows.item(0);
    }
  };

  return self;
})
.factory('UTIL', function(){
  var cho = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
  return {          
    getUniqueKey : function () {
      var s = [], itoh = '0123456789ABCDEF';
      for (var i = 0; i < 36; i++) s[i] = Math.floor(Math.random()*0x10);
      s[14] = 4;
      s[19] = (s[19] & 0x3) | 0x8;

      for (var x = 0; x < 36; x++) s[x] = itoh[s[x]];
      s[8] = s[13] = s[18] = s[23] = '-';

      return s.join('');
    },
    timeToString : function( timestamp ){
      var cDate = new Date();

      var cYyyymmdd = cDate.getFullYear()+""+(cDate.getMonth()+1)+""+cDate.getDate();
      var date = new Date( timestamp );

      var yyyy = date.getFullYear();
      var mm = date.getMonth()+1;
      var dd = date.getDate();

      var hour = date.getHours();
      hour = hour >= 10 ? hour : "0"+hour;

      var minute = date.getMinutes();
      minute = minute >= 10 ? minute : "0"+minute;

      var yyyymmdd = yyyy + "" + mm + ""+ dd;

      var result = [];
      if ( cYyyymmdd != yyyymmdd  ) {
        result.push( yyyy + "." + mm + "."+ dd );
      } else {
        result.push( hour + ":" + minute );
      }

      result.push( yyyy + "." + mm + "."+ dd );
      result.push( hour + ":" + minute );

      return result;
    },
    getChosung : function(str) {
      result = "";
      for(i=0;i<str.length;i++) {
        code = str.charCodeAt(i)-44032;
        if(code>-1 && code<11172) result += cho[Math.floor(code/588)];
      }
      return result;      
    },
    getMorphemes : function(str){

      var choArray = Array(
      'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ',
      'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ',
      'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ' );

      var jungArray = Array(
      'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ',
      'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ',
      'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ',
      'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ' );

      var jongArray = Array(
      '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ',
      'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ',
      'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ' );

      var result = "";
      for( var inx =0 ; inx < str.length ; inx++ ){
        var ch = str.charAt(inx);
        
        if (ch.search(/[^a-zA-Z]+/) === -1) {
          result += ch;
          continue;
        } else if( choArray.indexOf( ch ) > -1 ){
          result += ch;
          continue;
        }

        var code = str.charCodeAt(inx);
        var uniValue = code - 0xAC00;

        var jong = uniValue % 28;
        var jung = ( ( uniValue - jong ) / 28 ) % 21;
        var cho = parseInt (( ( uniValue - jong ) / 28 ) / 21);

        result += choArray[cho]+jungArray[jung]+jongArray[jong];
      }

      return result;
    }      
  }
});