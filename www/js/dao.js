angular.module('starter.dao', [])

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
.factory('ChannelDao', function(DB, UTIL, APP_INFO, Sign) {
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
        "SELECT new.channel_id, new.channel_name, new.channel_users ";

        if( jsonObj.image != undefined ){
          query += ", new.channel_image ";
        } else {
          query += ", old.channel_image ";
        }

        query += ", new.latest_message, IFNULL( old.unread_count, new.unread_count) as unread_count, new.channel_updated, new.owner_id "+
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
        
        var channel = {'channel_id':jsonObj.channel,'channel_name':jsonObj.name,'unread_count': unreadCount, 'latest_message':jsonObj.message, 'channel_users':jsonObj.users.join(','), 'channel_image':jsonObj.image, 'channel_updated': currentTimestamp};
        
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
.factory('MessageDao', function(DB, Sign, Cache) {file:///D:/ionic/workspace/messengerX/www/index.html#/tab/
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
.factory('DB', function($q, DB_CONFIG) {
  var self = this;
  self.db = null;
  var changeDBFlag = false;

  self.init = function() {

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
});