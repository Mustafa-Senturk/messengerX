angular.module('messengerx.controllers', [])

.controller('FriendsCtrl', function($scope, $rootScope, $state, $stateParams, $ionicModal, $ionicScrollDelegate, $templateCache, Friends, EventManager, ChatLauncher, ChannelDao, Sign, UTIL) {

  /**
   * @ngdoc function, 
   * @name listFriend
   * @module messengerx.controllers
   * @kind function
   *
   * @description Retrieve friends in database
   * DB에서 친구 list 를 조회한다.
   */
  $scope.listFriend = function(){
    Friends.list(function(friends){
      if( friends !== undefined ){
        $scope.friends = [];
        $scope.friends = friends;
        $scope.friendCount = $scope.friends.length;

        $templateCache.removeAll();
      }
    });
  };

  /**
   * @ngdoc function
   * @name syncFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Sync friends with server
   * 서버에서 친구 list 를 조회한다.
   */
  $scope.syncFriends = function(){
    Friends.refresh(function(result){
      $rootScope.syncFlag = false;
      $scope.listFriend();
    });
  };

  $scope.friends = [];
  $scope.friendCount = 0;
  $scope.searchKey = "";

  // Init EventManager
  if( $rootScope.syncFlag ) {
    $scope.syncFriends();
  } else {
    $scope.listFriend();
  }

  // EventManager를 초기화한다.
  EventManager.init();

  /**
   * @ngdoc function
   * @name postFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Apply friends display.
   * @param {array} filtered friends by searchKey;
   * 초성검색 완료후 수행할 funtion. searchByKey directive에서 호출한다.
   */
  $scope.postFriends = function(friends){
    if( friends !== undefined ){
      $scope.friends = [];
      $scope.friends = friends;
      $scope.friendCount = friends.length;
    }
  };

  /**
   * @ngdoc function
   * @name resetFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Reset friends list
   * 초성검색 완료후 수행할 funtion. searchByKey directive에서 호출한다.
   */
  $scope.resetFriends = function(){
    Friends.list(function(friends){
      if( friends !== undefined ){
        $scope.friends = [];
        $scope.friends = friends;
        $scope.friendCount = friends.length;
      }
    });
  };

  /**
   * @ngdoc function
   * @name gotoAccount
   * @module messengerx.controllers
   * @kind function
   *
   * @description Navigate to Account Menu.
   * login 사용자의 profile 클릭시 tab.accout 화면으로 이동한다.
   */
  $scope.gotoAccount = function(){
    $state.go( 'tab.account' );
  };

  /**
   * @ngdoc function
   * @name gotoChat
   * @module messengerx.controllers
   * @kind function
   *
   * @description Navigate to Chat screen.
   * @param {string} Selected friend
   * 친구이름 클릭시 채널을 생성하고 Chat window로 이동한다.
   */
  $scope.opening = false;
  $scope.gotoChat = function( friendIds ) {

    // double click 시 중복으로 창이 open 되는 것을 막기 위한 변수
    if ($scope.opening) {
      return;
    }
    $scope.opening = true;
    $stateParams.friendIds = friendIds;
    var jsonObject = {};
    jsonObject.U = [friendIds,Sign.getUser().userId];
    var channelId = UTIL.generateChannelId( jsonObject );
    ChatLauncher.gotoChat( channelId, $stateParams, function(){
      $scope.opening = false;
    });

    setTimeout( function (){
       $scope.opening = false;
    }, 10000 );
  };

  /**
   * @ngdoc function
   * @name removeFriend
   * @module messengerx.controllers
   * @kind function
   *
   * @description Save selected friends into server
   * 선택한 친구를 삭제한다.
   */
  $scope.removeFriend = function( friendId, itemInx ) {
    Friends.remove( friendId, function( data ){
      $scope.friends.splice(itemInx, 1);
      $scope.friendCount = $scope.friends.length;
    });
  };

  /**
   * @ngdoc function
   * @name openUserModal
   * @module messengerx.controllers
   * @kind function
   *
   * @description Open User modal to friend management
   * 친구 추가를 위한 modal popup을 open한다.
   */
  $scope.openUserModal = function() {
    $scope.modal.datas = [];
    $scope.modal.selection = [];
    $scope.modal.num = 1;
    $scope.modal.changed = false;
    $scope.modal.visible = true;
    $scope.modal.search = '';
    $scope.modal.show();
  };

  /**
   * @description make template for modal-user
   * modal-user 를 위한 popup을 초기화한다.
   */
  $ionicModal.fromTemplateUrl('templates/modal-users.html', {
    scope: $scope,
    animation: 'slide-in-up',
    focusFirstInput: true
  }).then(function(modal) {
    $scope.modal = modal;
    $scope.modal.changed = false;
    $scope.modal.visible = false;
  });

  /**
   * @ngdoc eventHandler
   * @name modal.hidden
   * @module messengerx.controllers
   * @kind eventHandler
   *
   * @description event called when modal closing
   * modal 종료 event 가 호출되면 modal 을 닫고 친구리스트를 서버에서 가져와서 갱신한다.
   */
  $scope.$on('modal.hidden', function() {
    $scope.modal.visible = false;

    if($scope.modal.changed){
      // Sync friends with Server
      $scope.syncFriends();
      $scope.modal.changed = false;
    }
  });

  /**
   * @ngdoc eventHandler
   * @name modal.shown
   * @module messengerx.controllers
   * @kind eventHandler
   *
   * @description event called when modal opening
   * modal 종료 event 가 호출되면 검색값을 초기화한다.
   */
  $scope.$on('modal.shown', function() {
    document.getElementById( "searchKey" ).value = "";
    $ionicScrollDelegate.$getByHandle('modalContent').scrollTop(true);
  });
})

.controller('UsersModalCtrl', function($scope, Users, Sign, Friends) {

  /**
   * @ngdoc function
   * @name toggleSelection
   * @module messengerx.controllers
   * @kind function
   *
   * @description Push selected userId into selection array
   * 선택된 친구를 selection array에 추가하거나 제거한다.
   * @param {string} selected userId in user modal
   */
  $scope.toggleSelection = function( friendId ){
    var inx = $scope.modal.selection.indexOf( friendId );
    if( inx > -1 ){
      $scope.modal.selection.splice(inx, 1);
    } else {
      $scope.modal.selection.push( friendId );
    }
  };

  /**
   * @ngdoc function
   * @name addFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Save selected friends into server
   * 선택된 친구를 친구리스트에 추가한다.
   */
  $scope.addFriends = function() {
    var res = $scope.modal.selection;

    // res에는 modal에서 넘어오는 선택된 frenids
    if(res.length > 0){
      var addUsers = [];
      for( var key in res ){
        if( addUsers.indexOf( res[key] ) < 0 ){
          addUsers.push( res[key] );
        }
      }

      // 친구 추가 API를 호출 후 modal을 닫는다.
      Friends.add( addUsers, function( data ){
        $scope.modal.changed = true;
        $scope.modal.hide();
      });
    }
  };

  $scope.searchUsers = function() {

    $scope.modal.visible = true;
    $scope.modal.num = 1;

    $scope.retrieveUsers();
  };

  /**
   * @ngdoc function
   * @name retrieveUsers
   * @module messengerx.controllers
   * @kind function
   *
   * @description Search user from server
   * 서버에서 검색조건을 이용하여 사용자를 검색한다.
   */
  $scope.retrieveUsers = function() {

    if($scope.modal.visible){

      var loginUserId = Sign.getUser().userId;

      // 아직 친구가 아닌 사용자만 조회하기 위한 option
      var query = {
        GR: {'$ne': loginUserId}
      };

      // 이름이나 ID로 사용자를 조회하기 위해 like조건을 만든다.
      if($scope.modal.search) {
      }

      var searchKey = $scope.modal.search;
      if( searchKey == '' ){
        $scope.$broadcast('scroll.infiniteScrollComplete');
        return;
      }

      Users.search(searchKey, $scope.modal.num, function(response){
        var users = response.result.users;

        if( users !== undefined ){
          if($scope.modal.num > 1) {
            $scope.modal.datas = [];
            $scope.modal.datas = $scope.modal.datas.concat(users);
          }else{
            $scope.modal.datas = [];
            $scope.modal.datas = users;
            $scope.$apply();
          }

          $scope.modal.num = $scope.modal.num + 1;
        }

        // scroll이 끝났음을 알리는 event 를 호출한다.
        $scope.$broadcast('scroll.infiniteScrollComplete');

        if( !users || users.length < 50) {
          $scope.modal.visible = false;
        }
      });
    }
  };
})
.controller('ChannelCtrl', function($scope, $rootScope, $rootElement, $window, $state, $stateParams, ChannelDao, Friends, Cache, Sign, ChatLauncher ) {

  $scope.channelArray = [];

  /**
   * @ngdoc function
   * @name listFriend
   * @module messengerx.controllers
   * @kind function
   *
   * @description transitionTo Chat window 
   * channel 클릭시 해당 channel의 chat window로 이동한다.
   */
  $scope.gotoChat = function( channelId ) {

    ChannelDao.get( channelId ).then(function(data) {
      $stateParams.channelId = channelId;
      $stateParams.channelUsers = data.channel_users;
      $stateParams.channelName = data.channel_name;

      ChatLauncher.gotoChat( channelId, $stateParams );
    });
  };

  /**
   * @ngdoc function
   * @name listFriend
   * @module messengerx.controllers
   * @kind function
   *
   * @description Retrieve channel in database
   * local strorage에 있는 채널 정보를 조회후 갱신한다.
   */
  $rootScope.refreshChannel = function( ){
    ChannelDao.list( $scope ).then(function(channels) {
      $scope.channelArray = [];
      $scope.channelArray = channels;
    });

    // unread count를 갱신한다.
    ChannelDao.getAllCount().then( function ( result ){
      $rootScope.totalUnreadCount = result.total_count;
    });
  };

  $scope.refreshChannel();
})
.controller('FriendsModalCtrl', function($scope, $rootScope, $state, Users, Friends, Chat, UTIL, ChannelDao, Sign) {
  var loginUser = Sign.getUser();

  /**
   * @ngdoc function
   * @name toggleSelection
   * @module messengerx.controllers
   * @kind function
   *
   * @description Push selected userId into selection array
   * local strorage에 있는 채널 정보를 조회후 갱신한다.
   */
  $scope.toggleSelection = function( friendId ){
    var inx = $scope.modal.selection.indexOf( friendId );
    if( inx > -1 ){
      $scope.modal.selection.splice(inx, 1);
    } else {
      $scope.modal.selection.push( friendId );
    }
  };

  /**
   * @ngdoc function
   * @name inviteFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Invite friend to current channel
   *  1:1 channel : create new channel for multiple channel
   *  multiple channel : Add selected friends into current channel and change channel name
   * 현재 channel에 친구를 초대한다.
   * 1:1 대화시에는 새로운 channel을 만들어 사용자를 추가하고 그렇지 않으면 사용자 추가 후 channel 이름을 변경한다.
   */
  $scope.inviteFriends = function() {
    var res = $scope.modal.selection;
    var channelId = $scope.modal.channelId;
    var channelName = $scope.modal.channelName;
    var channelUsers = $scope.modal.channelUsers;
    var loginUser = Sign.getUser();

    // Selected Friends array
    if(res.length > 0){

      var joinUsers = [];

      // Selection -> join users
      for( var key in res ){
        joinUsers.push( res[key] );

        if( channelUsers.indexOf( res[key] ) < 0 ){
          channelUsers.push( res[key] );
        }
      }

      $scope.modal.channelUsers = channelUsers;

      // 1:1 channel 인 경우 ID에 $가 separator로 포함되어 있다.
      if( channelId.indexOf( "$" ) > -1 ){

        // create new channel for multiple user
        $rootScope.$stateParams.friendIds = channelUsers.join( "$" );
        $state.transitionTo('chat', {}, { reload: true, inherit: true, notify: true });
      } else {
        // Add selected friends into current channel and change channel name
        channelName = channelName + ","+UTIL.getNames( joinUsers );
        $scope.modal.channelName = channelName;

        // Update channel info server with current channel info
        var joinObject = { 'U' : joinUsers, 'DT' : { 'NM' : channelName,'US' : channelUsers, 'F' : loginUser.userName, 'UC': channelUsers.length } };
        Chat.join( channelId, joinObject, function(data){
          if( data.status == 'ok' ){
            var iMsg = UTIL.getInviteMessage( joinUsers );

            // Send channel join message and update channel info in local db
            Chat.send( iMsg, false, 'J' );
            ChannelDao.updateUsers( { 'channel': channelId, 'name' : channelName, 'users': channelUsers } );
          }
        });
      }

      $scope.modal.changed = true;
      $scope.modal.hide();
    }
  };

  /**
   * @ngdoc function
   * @name postFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Apply friends display.
   * @param {array} filtered friends by searchKey;
   */
  $scope.postFriends = function(friends){
    if( friends != undefined ){
      $scope.modal.datas = [];
      $scope.modal.datas = friends;
    }
  };

  /**
   * @ngdoc function
   * @name resetFriends
   * @module messengerx.controllers
   * @kind function
   *
   * @description Reset friends list
   */
  $scope.resetFriends = function(){
    Friends.list(function(friends){
      if( friends != undefined ){
        $scope.modal.datas = [];
        $scope.modal.datas= friends;
      }
    });
  };
})

.controller('AccountCtrl', function($scope, $rootScope, $ionicPopup, Sign, DB) {
  $scope.loginUser = Sign.getUser();

  $scope.newImage = '';

  /**
   * @ngdoc function
   * @name updateUserInfo
   * @module messengerx.controllers
   * @kind function
   *
   * @description Update my info
   * @param {string} new image url;
   * server의 사용자 정보를 수정한다.
   */
  $scope.updateUserInfo = function(newImage){
    if( newImage !== '' ){
      $scope.loginUser.image = newImage;
    }

    // A : applicationId
    var params = { 'A' : $rootScope.app, 'U' : $scope.loginUser.userId, 'PW' : $scope.loginUser.password, 'D' : $rootScope.deviceId, 'N' : $rootScope.notiId,
               DT : { 'NM' : $scope.loginUser.userName, 'I': $scope.loginUser.image, 'MG' : $scope.loginUser.message } };

    // update userInfo in server
    Sign.update( params, function(data){
      if( data.status === 'ok' ){
        // set updated user info current session
        Sign.setUser( $scope.loginUser );
      }
    });
  };

  /**
   * @ngdoc function
   * @name clearData
   * @module messengerx.controllers
   * @kind function
   *
   * @description delete all stored datas in current device
   * local DB에 저장되어 있는 모든 data를 삭제한다.
   */
  $scope.clearData = function(){
    // An elaborate, custom popup
    var myPopup = $ionicPopup.confirm({
      title: 'Do you want clear data?',
      subTitle:'This action will delete all stored datas in current device, not datas in server.'
    });
    myPopup.then(function(res) {
      if( res === true ){
        DB.clearAll( Sign.getUser().userId);
        $rootScope.syncFlag = true;
        $rootScope.totalUnreadCount = 0;
      }
    });
  };  
})
.controller('EmoticonCtrl', function($scope, $rootScope, $ionicPopup, Sign, ChannelDao, Chat, UTIL, Emoticons) {
  var loginUser = Sign.getUser();
  var channelId = '';

  $scope.emoticon = {};
  Emoticons.list( { group : 'custom' }, function(emoticons){
    if( emoticons.length > 0 ){
      $scope.emoticon = emoticons[0];
    }
  });

  /**
   * @ngdoc function
   * @name openFileDialog
   * @module messengerx.controllers
   * @kind function
   *
   * @description open file dialog
   * file을 선택하기 위한 dialog를 호출한다.
   */
  $scope.openFileDialog = function() {
    ionic.trigger('click', { target: document.getElementById('file') });
  };

  /**
   * @ngdoc function
   * @name initSelfChannel
   * @module messengerx.controllers
   * @kind function
   *
   * @description make self channel for emoticon file upload
   * file 업로드를 위한 self channel을 생성한다.
   */
  var initSelfChannel = function(){

    // self channel for loginUser
    var channelUsers = [loginUser.userId];

    var createObject = {};
    createObject.U = channelUsers;
    channelId = UTIL.generateChannelId(createObject);
    createObject.DT = { 'US' : channelUsers, 'UC': channelUsers.length };
    createObject.C = channelId;

    $rootScope.xpush.createChannel(channelUsers, channelId, createObject.DT, function(data){

      var param = {};
      param.app = loginUser.app;
      param.channel = channelId;
      param.userId = loginUser.userId;
      param.deviceId = loginUser.deviceId;

      // Channel Init
      Chat.init( param, '', $scope, function( messages ){
      });
    });
  };

  // Initialize this controller
  initSelfChannel();

  /**
   * @ngdoc eventHandler
   * @name inputObj
   * @module messengerx.controllers
   * @kind eventHandler
   *
   * @description event when object changed
   * file 객체의 내용이 변경되면 호출되는 event
   */
  var inputObj = document.getElementById('file');
  var progressbar = document.getElementById( "progress_bar" );

  angular.element( inputObj ).on('change',function(event) {

    var file = inputObj.files[0];

    // File Type check, image type 이 아닌 경우를 체크
    if( file.type.indexOf( "image" ) < 0 ){
      var alertMessage = {title: 'Upload Failed'};
      alertMessage.subTitle = 'Upload only images';

      $ionicPopup.alert( alertMessage );
      inputObj.value = ""
      return;
    }

    // upload file stream
    $rootScope.xpush.uploadStream( channelId, {
      file: inputObj, type : 'image'
    }, function(data, idx){
      inputObj.value = "";
      progressbar.value = data;
      progressbar.style.display = "block";
    }, function(data,idx){
      var tname = data.result.tname;

      inputObj.value = "";
      console.log("completed ["+idx+"]: "+JSON.stringify(data));

      var imageUrl = $rootScope.xpush.getFileUrl(channelId, tname );
      var param = {group:'custom', tag :'', image : imageUrl};
      progressbar.style.display = "none";

      // Save emoticon to local db
      Emoticons.add( param, $scope.emoticon );
    });
  });
})
.controller('SplashCtrl', function($state, $scope, $rootScope, $localStorage, Sign, Cache, Friends ) {
  var storedUser;

  var login = function(){
    $rootScope.xpush.login( storedUser.userId, storedUser.password, storedUser.deviceId, 'ADD_DEVICE', function(err, result){

      $rootScope.loginUser = storedUser;

      // Save session Info
      Sign.setUser( storedUser );

      // Push userImage and userName into local cache oject
      Cache.add(storedUser.userId, {'NM':storedUser.userName, 'I':storedUser.image});

      // Retrieve refresh history for sync friends
      Friends.getRefreshHistory(function(history){
        // Do not update within 30 min
        if( history != undefined && ( Date.now() - history.time ) < (60 * 30 * 1000) ){
          $rootScope.syncFlag = false;
        } else {
          $rootScope.syncFlag = true;
        }

        $state.go('tab.friends');
      });
    });
  };  

  var delay = 1500;
  setTimeout( function (){

    storedUser = $localStorage.loginUser;
    // local storage에 저장되어 있는 user가 있을 때, 
    if( storedUser != undefined ){

      // xpush 객체가 있는지 체크 후 login 을 호출함.
      var checkXpush = setInterval( function(){
        if( $rootScope.xpush ){
          clearInterval( checkXpush );
          login();
        }
      }, 100 );

    } else {

      // local storage의 객체가 없으면 login page로 이동한다.
      $state.go('signin');
    }
  }, delay);
})
.controller('ErrorCtrl', function($scope, $state){
  $scope.gotoSignIn = function(){
    $state.go('signin');
  };
})
.controller('MessageCtrl', function($scope, $state, MessageDao, UTIL, Cache, $ionicFrostedDelegate, $ionicScrollDelegate){

  $scope.messages = [];
  $scope.data = { 'searchKey' : '' };

  $scope.scan = function(){

    // search key로 해당하는 message를 조회한다.
    MessageDao.scan( $scope.data.searchKey ).then(function(messageArray) {
      var messages = [];
      for( var inx = 0 ; inx < messageArray.length ; inx++ ){
        var data = messageArray[inx];
        var dateStrs = UTIL.timeToString( data.time );
        var dateMessage = dateStrs[1]+" "+dateStrs[2];

        messages.push( { type : data.type, date : dateMessage, message : data.message, name : data.sender_name, image : Cache.get( data.sender_id ).I } );
      }

      // Message in local database
      $scope.messages = [];
      $scope.messages = $scope.messages.concat(messages);
      $scope.data.searchKey = '';

      setTimeout( function(){
        $ionicFrostedDelegate.update();
        $ionicScrollDelegate.scrollBottom(true);
      }, 300 );
    });
  }
})
.controller('SignInCtrl', function($scope, $rootScope, $state, $location, $stateParams, $ionicPopup, Friends, Sign, Cache) {

  // node webkit이 아닌 navigation bar를 보이지 않게 처리한다.
  if( window.root ){
    $scope.hideNavbar = "false";
  } else {
    $scope.hideNavbar = "true";
  }

  /**
   * @ngdoc function
   * @name signIn
   * @module messengerx.controllers
   * @kind function
   *
   * @description Authorization
   * ID 와 PW를 입력받아 login 처리를 한다.
   * @param {jsonObject} Json object that is mapped to the screen
   */
  $scope.signIn = function(user) {
		var params = { 'A' : $rootScope.app, 'U' : user.userId, 'PW' : user.password, 'D' : $rootScope.deviceId, 'N' : $rootScope.notiId };

    $rootScope.xpush.login( user.userId, user.password, $rootScope.deviceId, 'ADD_DEVICE', function(err, result){
      if(err){
        var alertMessage = {title: 'Login Failed'};
        if(err == 'ERR-NOTEXIST'){
          alertMessage.subTitle = 'User is not existed. Please try again.';
        }else if(err == 'ERR-PASSWORD'){
          alertMessage.subTitle ='Password is wrong. Please try again.'; // Forgot your password?
        }else {
          alertMessage.subTitle = 'Invalid log in or server error. Please try again.';
        }

        $ionicPopup.alert(alertMessage);

      }else{

        // Create current session Info
        var loginUser = {};
        loginUser.app = params.A;
        loginUser.userId = user.userId;
        loginUser.password = params.PW;
        loginUser.deviceId = $rootScope.deviceId;

        loginUser.image = result.user.DT.I;
        loginUser.userName = result.user.DT.NM;
        loginUser.message = result.user.DT.MG;

        $rootScope.loginUser = loginUser;

        // Save session Info
        Sign.setUser( loginUser );

        // Push userImage and userName into local cache oject
        Cache.add(user.userId, {'NM':loginUser.userName, 'I':loginUser.image});

        // Retrieve refresh history for sync friends
        Friends.getRefreshHistory(function(history){

          // Do not update within an hour( 60s )
          if( history != undefined && ( history.time - Date.now() ) < 60000 ){
            $rootScope.syncFlag = false;
          } else {
            $rootScope.syncFlag = true;
          }

          $state.go('tab.friends');
        });
      }
    });
  };

  $scope.gotoSignUp = function(){
    $state.go('signup');
  };

  $scope.$watch('$viewContentLoaded', function() {
    document.getElementById( "userId" ).focus();
  });
})
.controller('SignUpCtrl', function($scope, $rootScope, $state, $stateParams, $http, Sign, STATIC_URL) {
  /**
   * @ngdoc function
   * @name signUp
   * @module messengerx.controllers
   * @kind function
   *
   * @description Create user into server
   * 새로운 user를 생성한다.
   * @param {jsonObject} Json object that is mapped to the screen
   */
  $scope.signUp = function(user) {
    var hash = CryptoJS.SHA256( user.password );
    var encPassword = hash.toString(CryptoJS.enc.Base64);
    
    var params = { 'A' : $rootScope.app, 'U' : user.userId, 'PW' : user.password, 'D' : $rootScope.deviceId, 'N' : $rootScope.notiId,
     'DT' : {'NM' : user.userName, 'I':STATIC_URL+'/img/default_image.jpg', 'MG':'' } };
    Sign.register( params, function(data){
      $state.go('signin');
    });
  };
})
.controller('ChatCtrl', function($state, $scope, $rootScope, $ionicPopup, $xpushSlide, $ionicBackdrop, $ionicFrostedDelegate, $ionicScrollDelegate, $ionicModal, $window, Users, EventManager, Friends, Sign, Chat, Cache, ChannelDao, NoticeDao, UTIL, Emoticons, STATIC_URL) {

  var loginUser = Sign.getUser();

  var channelId;
  var channelName;
  var channelUsers = [];
  var stateParams = $rootScope.$stateParams;
  $scope.messages = [];

  $scope.channelUserDatas = [];

  if( loginUser !=undefined ){
    $scope.loginUserImage = loginUser.image;
  }

  /**
   * @ngdoc eventHandler
   * @name $popupOpened
   * @module messengerx.controllers
   * @kind eventHandler
   *
   * @description Generate a pop-up screen from th parent screen
   * parent 창에서 popupOpened를 호출하면, chat 초기화를 시작한다.
   * @param {jsonObject}
   * @param {jsonObject} Json object from the parent screen
   */
  $rootScope.$on("$popupOpened", function (data, args) {
    // Copy session object and cache object

    Sign.setUser( args.loginUser );
    Cache.set( args.cache );
    loginUser = Sign.getUser();

    $scope.parentScope = args.parentScope;
    $scope.loginUserImage = loginUser.image;

    $rootScope.xpush.setSessionInfo( loginUser.userId, loginUser.deviceId, function(){

      $rootScope.xpush._globalConnection = args.globalConnection;
      $rootScope.xpush.isExistUnread = false;

      // Initialize chat controller
      channelId = args.stateParams.channelId;
      $rootScope.focusedChannel = channelId;
      if( channelId != undefined ){

        // channelId가 있을 경우, init 한다.
        $rootScope.xpush.getChannelAsync( channelId, function(){
          prepareChatService( args.stateParams );
          EventManager.addEvent();
        });
      } else {
        prepareChatService( args.stateParams );
        EventManager.addEvent();
      }
    });

    // window에 focus를 잃으면
    $rootScope.$on('$windowBlur', function (){
      Chat.sendSys( 'off' );
    });

    // window에 focus를 받으면 현재 channel 을 활성화시킨다.
    $rootScope.$on('$windowFocus', function (){
      $rootScope.focusedChannel = channelId;
      Chat.sendSys( 'on' );
    });

    // window에 close 되었을떄
    $rootScope.$on('$windowClose', function (){
      Chat.sendSys( 'off' );
    });

    // node webkit 일때, popupClose event를 발생시킨다. 팝업리스트를 관리하기 위함.
    if( window.root ){
      var popupWin = require('nw.gui').Window.get();
      popupWin.on('close', function() {
        $scope.parentScope.$broadcast( "$popupClose", channelId );
        Chat.sendSys( 'off' );
        // Hide the window to give user the feeling of closing immediately
        this.hide();
        this.close(true);
      });
    }
  });

  /**
   * @ngdoc function
   * @name initChatService
   * @module messengerx.controllers
   * @kind function
   *
   * @description Initialize Chat service
   * Chat service 를 초기화한다.
   * @param {jsonObject}
   * @param {String} Invite Message
   */
  var initChatService = function( inviteMsg ){

    $rootScope.currentScope = $scope;

    var param = {};
    param.app = loginUser.app;
    param.channel = channelId;
    param.userId = loginUser.userId;
    param.deviceId = loginUser.deviceId;

    // Chat Init
    Chat.init( param, inviteMsg, $scope, function( messages ){

      if( messages != undefined ){

        // Message in local database
        $scope.messages = [];
        $scope.messages = $scope.messages.concat(messages);

        setTimeout( function(){
          $ionicFrostedDelegate.update();
          $ionicScrollDelegate.scrollBottom(true);

          if( $scope.parentScope != undefined ){
            var args = {"channelId":channelId};

            // Broadcast $popupOpen event for
            $scope.parentScope.$broadcast("$popupOpen", args);
          }
        }, 300 );
      }

      // Send On Event
      Chat.sendSys( 'on' );

      // Retreive notice from DB
      NoticeDao.get( channelId ).then(function(data) {
        if( data !== undefined ){
          var dateStrs = UTIL.timeToString( data.updated );

          // YYYYMMDD min:ss
          var dateMessage = dateStrs[1]+" "+dateStrs[2];

          // ChannelData 에서 Notice 정보를 추출한 뒤, notice가 있을 경우, 화면에 그려준다.
          $rootScope.xpush.getChannelData( channelId, function( err, channelInfo ){
            var noticeData = channelInfo.DT.NT;
            var noticeMessage = { date : dateMessage, message : data.message,location:data.location, name : Cache.get( data.sender_id ).NM,
                                  image : Cache.get( data.sender_id ).I , useFlag : data.use_flag, foldFlag : data.fold_flag,
                                  voteFlag : data.vote_flag, Y_US : noticeData.Y.US, N_US: noticeData.N.US };
            $scope.setNotice( noticeMessage );
            
            setChannelUsers( noticeData );
          });
        } else {
          setChannelUsers();
        }
      });
    });
  };

  /**
   * @ngdoc function
   * @name prepareChatService
   * @module messengerx.controllers
   * @kind function
   *
   * @description prepareChat current controller
   * @param {jsonObject} stateParams
   */
  var prepareChatService = function( stateParams ){

    // If channelId is exist, use the channel
    if( stateParams.channelId !== undefined ) {
      channelId = stateParams.channelId;

      channelUsers = stateParams.channelUsers.split(",");
      channelUsers.sort();
      channelName = stateParams.channelName;

      initChatService( '' );
    } else {
      // make friend string to array
      var friendIds = stateParams.friendIds.split("$");
      channelUsers = channelUsers.concat( friendIds );

      if( channelUsers.indexOf( loginUser.userId ) < 0 ){
        channelUsers.push( loginUser.userId );
      }

      channelName = UTIL.getNames( channelUsers );

      var createObject = {};
      createObject.U = channelUsers;
      createObject.NM = channelName;
      createObject.DT = { 'NM' : channelName, 'US' : channelUsers, 'F' : loginUser.userName, 'UC': channelUsers.length };

      // Generate channel id
      channelId = UTIL.generateChannelId(createObject);
      createObject.C = channelId;

      // Create channel with channel info and save into local db
      $rootScope.xpush.createChannel(channelUsers, channelId, createObject.DT, function(data){
        createObject.unreadCount = 0;
        ChannelDao.insert( createObject );

        var inviteMsg = "";
        if( channelUsers.length > 2 ){
          inviteMsg = UTIL.getInviteMessage( channelUsers );
        }

        initChatService( inviteMsg );
      });
    }

    // Reset $stateParams
    $rootScope.$stateParams = {};
    $scope.channelName = channelName;
    $scope.channelId = channelId;
    $scope.channelUsers = channelUsers;

    // Retrieve emoticon list from local db.
    Emoticons.list( {}, function(emoticons){
      var baseImgPath = STATIC_URL+'/img';
      $scope.emoticons.push( { group : 's2', tag : 'ion-happy', 'CN' : 'tab-item tab-item-active', items : {
          "01" : [baseImgPath+'/emo/s2/anger.PNG', baseImgPath+'/emo/s2/burn.PNG', baseImgPath+'/emo/s2/cool.PNG', baseImgPath+'/emo/s2/love.PNG'],
          "02" : [baseImgPath+'/emo/s2/shout.PNG', baseImgPath+'/emo/s2/smile.PNG']}}
      );

      $scope.emoticons.push( { group : 'b2', tag : 'ion-icecream', 'CN' : 'tab-item', items : {
          "01" : [baseImgPath+'/emo/b2/anger.png', baseImgPath+'/emo/b2/exciting.png', baseImgPath+'/emo/b2/happy.png', baseImgPath+'/emo/b2/greedy.png'],
          "02" : [baseImgPath+'/emo/b2/victory.png', baseImgPath+'/emo/b2/unhappy.png']}}
      );

      $scope.emoticons = $scope.emoticons.concat( emoticons );
    });
  };

  if( stateParams !== undefined ){
    prepareChatService( stateParams );
  }

  /**
   * @ngdoc function
   * @name setChannelUsers
   * @module messengerx.controllers
   * @kind function
   *
   * @description Retrieve user in channel and set vote status;
   * channel 내의 사용자 정보를 조회한 후 vote status 를 세팅한다.
   * @param {jsonObject} noticeData
   */
  var setChannelUsers = function( noticeData ){
    // Channel 에 속해있는 사용자 정보를 조회

    $scope.channelUserDatas = [];
    Users.search( channelUsers[0], -1, function( users ){

      users.forEach( function( user ){
        var data = { "NM" : user.DT.NM, "I" : user.DT.I };

        if( !Cache.has( user.U ) ){
          Cache.add( user.U, data );
        }

        data.U = user.U;
        // vote 여부를  확인한다.
        if( noticeData !== undefined ){
          if( noticeData.Y.US.indexOf( user.U ) > -1 ){
            data.agree = 'Y';
          } else if( noticeData.N.US.indexOf( user.U ) > -1  ){
            data.agree = 'N';
          }
        }

        $scope.channelUserDatas.push( data );
      });
    });
  };

  /**
   * @ngdoc function
   * @name add
   * @module messengerx.controllers
   * @kind function
   *
   * @description Add message to screen and Update scroll
   * 신규 메세지를 화면에 나타내고 scroll을 update한다.
   * @param {jsonObject} nextMessage
   * @param {blloean} snapFlag
   */
  $scope.add = function( nextMessage, snapFlag ) {
    $scope.messages.push(angular.extend({}, nextMessage));
    $scope.$apply();

    // Update the scroll area and tell the frosted glass to redraw itself.
    if( nextMessage.type !== 'RI' && nextMessage.type !== 'SI' ){
      $ionicFrostedDelegate.update();
      $ionicScrollDelegate.scrollBottom(true);
    }

    if( snapFlag ){
      $scope.remove( nextMessage.id );  
    }
  };

  /**
   * @ngdoc function
   * @name add
   * @module messengerx.controllers
   * @kind function
   *
   * @description Remove message in 10 seconds
   * 10분 내에 해당 메세지를 삭제한다.
   * @param {string} messageId
   */
  $scope.remove = function( msgId ){
    setTimeout( function(){
      var msg = document.getElementById( "message_"+msgId );
      var msgInx = msg.getAttribute( "index" );
      angular.element( msg ).remove();
      $scope.messages.splice(msgInx, 1);
    }, 10000 );
  };

  /**
   * @ngdoc function
   * @name send
   * @module messengerx.controllers
   * @kind function
   * @description Send Message and reset input text
   * 입력받은 메시지를 전송한 후, chat 입력 창을 초기화한다.
   */
  $scope.send = function() {
    if( $scope.inputMessage !== '' ){
      var msg = $scope.inputMessage;
      $scope.inputMessage = '';
      Chat.send( msg, $scope.toggles.useSnap );
    }
  };

  /**
   * @ngdoc function
   * @name setNotice
   * @module messengerx.controllers
   * @kind function
   *
   * @description Display noticeMsg
   * Notice 메세지를 화면에 보여준다.
   * @param {string} noticeMsg
   * @param {boolean} resetFlag
   */
  $scope.setNotice = function( noticeMsg, resetFlag ) {
    $scope.notice = noticeMsg;

    // notice 가 신규로 등록되었다면, 투표 상태를 초기화한다.
    if( resetFlag ){
      $scope.channelUserDatas.forEach( function( channelUserData ){
        channelUserData.agree = undefined;
      });
    }
    $scope.toggleNotice( true );
  };

  $scope.selection = [];

  /**
   * @ngdoc function
   * @name openFriendModal
   * @module messengerx.controllers
   * @kind function
   *
   * @description Open User modal to friend management
   * channel에 사용자를 초대하기 위한 popup 창을 open한다.
   */
  $scope.openFriendModal = function() {

    $scope.toggleMenu(false);

    Friends.list(function(friends){

      if( friends != undefined ){
        $scope.modal.datas =  [];
        $scope.modal.datas = friends;
      }

      $scope.modal.selection = [];
      $scope.modal.num = 1;
      $scope.modal.changed = false;
      $scope.modal.visible = true;
      $scope.modal.show();
      $scope.modal.channelUsers = $scope.channelUsers;
      $scope.modal.channelName = $scope.channelName;
      $scope.modal.channelId = $scope.channelId;
    });
  };

  $ionicModal.fromTemplateUrl('templates/modal-friends.html', function(modal) {
    $scope.modal = modal;
    $scope.modal.changed = false;
    $scope.modal.visible = false;
  }, {
    animation: 'slide-in-up',
    focusFirstInput: true
  });

  $scope.$on('modal.hidden', function() {
    $scope.modal.visible = false;

    if($scope.modal.changed){
      $scope.modal.changed = false;
      $scope.channelName = $scope.modal.channelName;
      $scope.channelUsers = $scope.modal.channelUsers;
    }
  });

  $scope.$on('modal.shown', function() {
    document.getElementById( "searchKey" ).value = "";
  });

  $scope.$on('$destroy', function() {
    window.onbeforeunload = undefined;

    // Init currentChannel
    $rootScope.currentChannel = '';
    Chat.sendSys( 'off' );
  });

  /**
   * @ngdoc eventHandler
   * @name locationChangeStart
   * @module messengerx.controllers
   * @kind eventHandler
   *
   * @description called when chat screen out
   * Chat 화면에서 나갈때 호출된다. popup window를 사용하지 않을때
   * @param {object} event
   * @param {object} next state
   * @param {object} currnet state
   */

  $scope.$on('$locationChangeStart', function(event, next, current) {

    // Chat screen 에서 나갈 떄 호출된다.
    if( current.indexOf('/chat') > -1 ){
      $rootScope.currentChannel = '';
      Chat.sendSys( 'off' );
    }
  });

  /**
   * @ngdoc function
   * @name openWebRTC
   * @module messengerx.controllers
   * @kind function
   *
   * @description Open webRTC for video chatting
   * webRTC 창을 open한다.
   * @param {string} webRTC key
   */
  $scope.openWebRTC = function( key ){
    $scope.toggleExt( false );

    var newFlag = false;
    if( key === undefined ){
      newFlag = true;
    }

    var chKey = newFlag ? UTIL.getUniqueKey() : key;

    var params = {
      S: $rootScope.host,
      A: $rootScope.app,
      C: chKey,
      U: {
        U: loginUser.userId,
        A: loginUser.deviceId
      }
    };

    var url = $rootScope.rootPath+'popup-video.html?'+encodeURIComponent(JSON.stringify(params));

    var popup = $window.open(url, chKey, "width=800,height=600,location=no,toolbar=no,menubar=no,scrollbars=no,resizable=yes");
    popup.onbeforeunload = function(){
      Chat.send( chKey, $scope.toggles.useSnap, 'VO' );
    };

    // Send video call
    if( newFlag ){
      Chat.send( chKey, $scope.toggles.useSnap, 'VI' );
    }
  };

  $scope.emoticons = [];

  $scope.curEmoTabId = "0";
  $scope.toggles = { 'showEmo' : false, 'showExt' : false, 'showMenu' : false, 'useTTS' : false, 'bookmarkOnly' : false, 'useSnap' : false};
  /**
   * @ngdoc function
   * @name toggleEmoticons
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide emoticon div
   * Emoticon 영역을 표시하거나 숨긴다.
   * @param {boolean}
   */
  $scope.toggleEmoticons = function( flag ){
    $scope.toggles.showEmo = flag;
    if( $scope.toggles.showEmo === true ){
      document.getElementById( 'tabbody'+$scope.curEmoTabId ).style.display = "block";
      document.getElementById( 'chat-extends' ).style.display = "none";
      document.getElementById( "chat-notice" ).style.display = "none";

      document.getElementById( 'chat-emoticons' ).style.display = "block";
      document.getElementById( 'chat-emoticons' ).className = "chat-extends slider-top";
      $scope.toggles.showExt = false;
    } else {
      document.getElementById( 'chat-emoticons' ).className = "chat-extends slider-top closed";
      $scope.toggleNotice( true );
    }
  };

  /**
   * @ngdoc function
   * @name toggleExt
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide extension div
   * Emoticon extension 영역을 표시하거나 숨긴다.
   * @param {boolean}
   */
  $scope.toggleExt = function( flag ) {
    $scope.toggles.showExt = flag;
    if( $scope.toggles.showExt === true ){

      document.getElementById( 'chat-emoticons' ).style.display = "none";
      document.getElementById( 'chat-notice' ).style.display = "none";

      document.getElementById( 'chat-extends' ).style.display = "block";
      document.getElementById( 'chat-extends' ).className = "chat-extends slider-top";
      $scope.toggles.showEmo = false;
    } else {
      document.getElementById( 'chat-extends' ).className = "chat-extends slider-top closed";
      $scope.toggleNotice( true );
    }
  };

 /**
   * @ngdoc function
   * @name toggleExt
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide menu div
   * Emoticon menu 영역을 표시하거나 숨긴다.
   * @param {boolean}
   */
  $scope.chatExtendsMenuClass = "hidden";
  // An elaborate, custom popup
  $scope.slidePopup;
  $scope.toggleMenu = function( flag ) {
    $scope.toggles.showMenu = flag;

    if( $scope.toggles.showMenu === true ){

      document.getElementById( 'chat-emoticons' ).style.display = "none";
      document.getElementById( 'chat-extends' ).style.display = "none";
      $scope.toggles.showExt = false;
      $scope.toggles.showEmo = false;

      $scope.slidePopup = $xpushSlide.show({
        templateUrl : 'templates/chat-menu.html',
        scope: $scope
      });

    } else {
      if( $scope.slidePopup != undefined ){
        $scope.slidePopup.close();
      }
    }
  };

  /**
   * @ngdoc function
   * @name toggleNotice
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide Notice div
   * notice 영역을 보여주거나 숨긴다.
   * @param {boolean}
   */
  $scope.toggleNotice = function( flag ) {

    if( flag && $scope.notice && $scope.notice.useFlag === 'Y' && !$scope.toggles.showEmo && !$scope.toggles.showExt ){
      if( $scope.notice.foldFlag == 'N' ) {
        document.getElementById( "chat-notice" ).style.display = "block";
        document.getElementById( "chat-notice-button" ).style.display = "none";
      } else {
        document.getElementById( "chat-notice" ).style.display = "none";
        document.getElementById( "chat-notice-button" ).style.display = "block";
      }
    } else {
      document.getElementById( "chat-notice" ).style.display = "none";
      document.getElementById( "chat-notice-button" ).style.display = "none";
    }
  };

  /**
   * @ngdoc function
   * @name toggleNotice
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide Notice div's menu
   * notice menu 영역을 보여주거나 숨긴다.
   * @param {boolean}
   */
  $scope.toggleNoticeMenu = function(){
    if( $scope.showNoticeMenu ){
      document.getElementById( "chat-notice-menu" ).style.display = "none";
      document.getElementById( "notice-message" ).style.whiteSpace =  "nowrap";
      $scope.showNoticeMenu = false;
    } else {
      document.getElementById( "notice-message" ).style.whiteSpace = "normal";
      document.getElementById( "chat-notice-menu" ).style.display = "flex";
      $scope.showNoticeMenu = true;
    }
  };

  /**
   * @ngdoc function
   * @name sendEmoticon
   * @module messengerx.controllers
   * @kind function
   *
   * @description Send selected emoticon url
   * 선택한 emoticon의 URL 을 전송한다.
   * @param {string} url
   */
  $scope.sendEmoticon = function(url){
    $scope.toggleEmoticons( false );
    document.getElementById( 'chat-emoticons' ).style.display = "none";
    Chat.send( url, $scope.toggles.useSnap, 'E' );
  };

  /**
   * @ngdoc function
   * @name tabActive
   * @module messengerx.controllers
   * @kind function
   *
   * @description Active selected tab and deactive another tab
   * 선택된 emoticon tab을 active 시킨다.
   * @param {string} selected tabId
   */
  $scope.tabActive = function( tabId ){
    $scope.curEmoTabId = tabId;
    var tabs = document.getElementById( 'emoticon-tabs' ).getElementsByTagName( "a" );

    for( var inx = 0, until = tabs.length; inx < until; inx++ ){
      if( tabs[inx].id == "tab"+tabId ){
        tabs[inx].className = "tab-item tab-item-active";
        document.getElementById( "tabbody"+inx ).style.display = "block";
      } else {
        tabs[inx].className = "tab-item";
        document.getElementById( "tabbody"+inx ).style.display = "none";
      }
    }
  };


  /**
   * @ngdoc function
   * @name openFileDialog
   * @module messengerx.controllers
   * @kind function
   *
   * @description open file dialog
   * file을 선택하기 위한 dialog를 호출한다.
   * @param {string} sourceType
   */
  var itemInx = 0;
  $scope.openFileDialog = function( sourceType ) {
    // If android or IOS, use native plugin
    if( navigator.camera ){

      var opts = {
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: sourceType,
        encodingType: 0
      };

      navigator.camera.getPicture(onSuccess, onFail, opts);

      function onSuccess(FILE_URI){
        $scope.toggleExt( false );

        // cordova에서 넘어온 FILE_URI를 file 형태로 인식한다.
        window.resolveLocalFileSystemURL(
          FILE_URI,
          function(fileEntry){
            fileEntry.file(function(file){
              var sizeLimit = 20;

              //20M가 넘는 경우 제한을 건다.
              if( file.size  > 1024 * 1024 * sizeLimit ){
                $ionicPopup.alert({
                  title: 'Upload failed',
                  template: 'File size exceeds limit : '+ sizeLimit +'M'
                });
                return;
              }

              var orgFileName = fileEntry.nativeURL.substring( fileEntry.nativeURL.lastIndexOf( "/" )+1 );
              uploadFile( FILE_URI, orgFileName );
            }, function(){
            //error
            });
          },
          function(){
          }
        );
      }

      function uploadFile(FILE_URI, orgFileName) {

        var options = {type : 'image', name:orgFileName };
        var tp = "SFP";

        var thisInx = itemInx;
        var newMessage = { type : tp, inx : thisInx, message : inputObj.value };

        $scope.messages.push(angular.extend({}, newMessage));
        $scope.$apply();

        setTimeout( function(){
          var progressbar = document.getElementById( "progress_bar"+thisInx );
          var tempDiv = document.getElementById( "progress_div"+thisInx );

          $ionicFrostedDelegate.update();
          $ionicScrollDelegate.scrollBottom(true);

          // WebView에서는 file DOM 객체를 지원하지 않기 떄문에, REST 방식으로 file을 보낸다. 
          $rootScope.xpush.uploadFile(channelId, FILE_URI,
          options,
          function ( data ){
            progressbar.value = data;
          },
          function (data){
            var imageUrl = $rootScope.xpush.getFileUrl(channelId, JSON.parse(data.response).result.tname );
            angular.element( tempDiv ).remove();
            Chat.send( imageUrl, $scope.toggles.useSnap, 'I' );
          });

        }, 100 );
        itemInx++;
      }

      function onFail(message) {
        $scope.toggleExt( false );
        itemInx++;
      }
    } else {
      // If using browser, use file dialog
      $scope.toggleExt( false );
      ionic.trigger('click', { target: document.getElementById('file') });
    }
  };

  // browser, nodewebkit 이용시 file DOM 객체에 event 를 적용한다.
  var inputObj = document.getElementById('file');
  angular.element( inputObj ).on('change',function(event) {

    var file = inputObj.files[0];
    var sizeLimit = 20;

    if( file.size > 1024 * 1024 * sizeLimit ){

      $ionicPopup.alert({
        title: 'Upload failed',
        template: 'File size exceeds limit : '+ sizeLimit +'M'
      });

      inputObj.value = "";
      return;
    }

    var type = UTIL.getType( inputObj.value );

    var options = {
      file: inputObj
    };

    // image type 인 경우에는 thumbnail을 만들기 위해 options의 type에 image라고 추가한다.
    if( type === 'image' ){
      options.type = "image";
    }

    var tp = "";

    // if video, add vido progress bar. Otherwise show progress bar.
    // video 파일 전송시 progreess bar 형태가 조금 다르다 SVP : Send Video Progress, SFP : Send File Progress
    if( type === 'video' ){
      tp = "SVP"; 
    } else {
      tp = "SFP";
    }

    var nextMessage = { type : tp, inx : itemInx, message : inputObj.value };
    var thisInx = itemInx;

    $scope.messages.push(angular.extend({}, nextMessage));
    $scope.$apply();
    itemInx++;

    setTimeout( function(){
      $ionicFrostedDelegate.update();
      $ionicScrollDelegate.scrollBottom(true);
      uploadStream( options, type, thisInx );
    }, 100 );
  });

  /**
   * @ngdoc function
   * @name uploadStream
   * @module messengerx.controllers
   * @kind function
   *
   * @description upload file using socket stream.
   * socket stream을 이용해서 file을 전송한다.
   * @param {object} options
   * @param {string} type
   * @param {number} itemJnx
   */
  var uploadStream = function( options, type, itemJnx ){
    var progressbar = document.getElementById( "progress_bar"+itemJnx );
    var tempDiv = document.getElementById( "progress_div"+itemJnx );

    $rootScope.xpush.uploadStream( channelId, options, function(data, idx){
      inputObj.value = "";

      // Update progress bar
      progressbar.value = data;
    }, function(data,idx){
      var msg;
      var msgType;

      // 전송 완료 후 type 에 따라 업로드한 결과를 공유한다.
      if( type === 'image' ){
        msg = $rootScope.xpush.getFileUrl(channelId, data.result.tname );
        msgType = 'I';
      } else if ( type === 'video' ) {
        msg = data.result.name;
        msgType = 'V';
      } else {
        msg = $rootScope.xpush.getFileUrl(channelId, data.result.name );
        msgType = 'I';
      }

      // remove progress bar
      angular.element( tempDiv ).remove();
      inputObj.value = "";
      console.log("completed ["+idx+"]: "+JSON.stringify(data));

      Chat.send( msg, $scope.toggles.useSnap, msgType );
    });
  };

  /**
   * @ngdoc function
   * @name showNoticePopup
   * @module messengerx.controllers
   * @kind function
   *
   * @description Open Notice popup to input notice message
   * Notice 를 입력하기 위한 Popup을 open한다.
   */
  $scope.showNoticePopup = function() {
    $scope.toggleMenu( false );

    $scope.data = {}

    // An elaborate, custom popup
    var myPopup = $ionicPopup.show({
      template: '<input type="text" ng-model="data.notice">',
      title: 'Notice',
      scope: $scope,
      buttons: [
        { text: 'Cancel' },
        {
          text: '<b>Save</b>',
          type: 'button-positive',
          onTap: function(e) {
            if (!$scope.data.notice) {
              //don't allow the user to close unless he enters wifi password
              e.preventDefault();
            } else {
              return $scope.data;
            }
          }
        },
      ]
    });
    myPopup.then(function(data) {

      var noticeMessage = data.notice;

      if( noticeMessage !== undefined ){
        Chat.send( noticeMessage, $scope.toggles.useSnap, 'N' );

        // Notice 입력완료 시, notice 정보를 channel에 update한다.
        var query = { $set:{ 'DT.NT' : { 'MG' : noticeMessage, 'Y': { 'US':[] }, 'N': { 'US':[] } } } };
        $rootScope.xpush.updateChannel( channelId, query, function( data ){
        });
      }
    });
  };

  /**
   * @ngdoc function
   * @name updateNotice
   * @module messengerx.controllers
   * @kind function
   *
   * @description Update Notice option
   * notice 를 upate한다.
   * @param {boolean} useFlag
   * @param {boolean} foldFlag
   */
  $scope.updateNotice = function( useFlag, foldFlag ) {
    var param = {'channelId': channelId, useFlag : useFlag, foldFlag : foldFlag };

    // Update notice at local DB;
    NoticeDao.update( param );

    if( $scope.notice !== undefined ){
      // notice 사용 여부와 접기 여부를 update한다.
      $scope.notice.useFlag = param.useFlag;
      $scope.notice.foldFlag = param.foldFlag;
    }

    // 사용하지 않는다면, notice 창을 닫는다.
    if( useFlag === 'N' ){
      $scope.toggleNotice( false );
    } else {
      $scope.toggleNotice( true );
    }
  };

  /**
   * @ngdoc function
   * @name voteNotice
   * @module messengerx.controllers
   * @kind function
   *
   * @description Vote to the notice
   * notice에 투표한다.
   * @param {boolean} flag
   */
  $scope.voteNotice = function( flag ){
    var param = {'channelId': channelId, 'useFlag' : $scope.notice.useFlag, 'foldFlag' : $scope.notice.foldFlag  };
    param.voteFlag = flag ? 'Y':'N';

    if( param.voteFlag === $scope.notice.voteFlag ){
      return;
    }

    // Update notice at local DB;
    NoticeDao.update( param );

    var query;

    // 투표 상태에 따라
    if( flag ){
      query = { $addToSet:{ 'DT.NT.Y.US' : loginUser.userId }, $pull:{ 'DT.NT.N.US' : loginUser.userId } };
    } else {
      query = { $pull:{ 'DT.NT.Y.US' : loginUser.userId }, $addToSet:{ 'DT.NT.N.US' : loginUser.userId } };
    }

    // channel 을 update 한다. 
    $rootScope.xpush.updateChannel( channelId, query, function( err, result ){
      $scope.notice.voteFlag = param.voteFlag;
      $scope.notice.N_US = result.DT.NT.N.US;
      $scope.notice.Y_US = result.DT.NT.Y.US;

      $rootScope.xpush.getChannelData( channelId, function( err, channelInfo ){
        var noticeData = channelInfo.DT.NT;
        setChannelUsers( noticeData );
        $scope.$apply();
      });
    });
  };

  /**
   * @ngdoc function
   * @name exitChannel
   * @module messengerx.controllers
   * @kind function
   *
   * @description exit from channel
   * channel에서 나간다.
   */
  $scope.exitChannel = function(){
    // An elaborate, custom popup
    var myPopup = $ionicPopup.confirm({
      title: 'Do you want exit channel?'
    });
    myPopup.then(function(res) {
      if( res === true ){
        Chat.exitChannel( channelId, function(){
          // popup 사용 중일때는 channel 정보를 갱신하고 popup 창을 닫는다.
          if( $rootScope.usePopupFlag ){
            if( $scope.parentScope && $scope.parentScope.refreshChannel ){
              $scope.parentScope.refreshChannel();
              setTimeout( function(){
                window.close();
              }, 100 );
            }
          } else {

            // popup을 사용중이 아니라면, channel tab으로 화면 전환을 한다.
            if( $scope.slidePopup ){
              $scope.slidePopup.close();
            }
            setTimeout( function(){
              $state.go( 'tab.channel' );
            }, 100 );
          }
        });
      }
    });
  };

  /**
   * @ngdoc function
   * @name gotoBack
   * @module messengerx.controllers
   * @kind function
   *
   * @description history back for single application
   * chat 화면에서 이전 화면으로 돌아가기 위한 history back
   */
  $scope.gotoBack = function( ) {
    $window.history.back();
  };

  /**
   * @ngdoc function
   * @name setOnlineStatus
   * @module messengerx.controllers
   * @kind function
   *
   * @description Set frined's online status on off
   * 사용자의 online status를 변경한다.
   */
  $scope.setOnlineStatus = function( msg ){
    if( msg === "on" ){
      document.getElementById( "status_on" ).style.display = "inline";
      document.getElementById( "status_off" ).style.display = "none";
    } else {
      document.getElementById( "status_on" ).style.display = "none";
      document.getElementById( "status_off" ).style.display = "inline";
    }
  };

  /**
   * @ngdoc function
   * @name setBookmark
   * @module messengerx.controllers
   * @kind function
   *
   * @description history back for single application
   * local DB에 bookmark를 추가한다.
   * @param {string} message
   */
  $scope.setBookmark = function( message ){
    var param = {'channel': channelId, 'senderId' : message.senderId, 'timestamp' : message.timestamp };
    if( message.bookmarkFlag == 'Y' ){
      message.bookmarkFlag = 'N';
      param.bookmarkFlag = 'N';
    } else {
      message.bookmarkFlag = 'Y';
      param.bookmarkFlag = 'Y';
    }

    Chat.updateMessage( param );
  };

  /**
   * @ngdoc function
   * @name toggleBookmarkOnly
   * @module messengerx.controllers
   * @kind function
   *
   * @description show or hide bookmark only
   * bookmark 된 message만 보여준다.
   */
  $scope.toggleBookmarkOnly = function() {
    if( $scope.toggles.bookmarkOnly ){
      $scope.toggles.bookmarkOnly = false;
    } else {
      $scope.toggles.bookmarkOnly = true;
    }

    $scope.toggleMenu( false );
    var param = { 'channel' : channelId } ;
    if( $scope.toggles.bookmarkOnly ){
      param.bookmarkFlag = 'Y';
    }

    // channel list 내에서 bookmark 된 message 만 조회한다.
    Chat.list( param, function( messages ){

      $scope.messages = [];
      $scope.messages = $scope.messages.concat(messages);

      setTimeout( function(){
        $ionicFrostedDelegate.update();
        $ionicScrollDelegate.scrollBottom(true);
      }, 100 );
    });
  };

  /**
   * @ngdoc function
   * @name toggleTTS
   * @module messengerx.controllers
   * @kind function
   *
   * @description enable or disable TTS
   * TTS를 on 하거나 off 한다.
   */
  $scope.toggleTTS = function() {
    if( $scope.toggles.useTTS ){
      $scope.toggles.useTTS = false;
    } else {
      $scope.toggles.useTTS = true;

      if( window.speechSynthesis ){
        var u = new SpeechSynthesisUtterance();
        u.text = 'She is ready';
        u.lang = 'ko-KR';
        window.speechSynthesis.speak(u);
      }
    }
  };

  /**
   * @ngdoc function
   * @name toggleTTS
   * @module messengerx.controllers
   * @kind function
   *
   * @description enable or disable TTS
   * TTS를 on 하거나 off 한다.
   */
  $scope.toggleSnap = function() {
    if( $scope.toggles.useSnap ){
      $scope.toggles.useSnap = false;
    } else {
      $scope.toggles.useSnap = true;
    }
  };
})
.controller('ViewCtrl', function($scope, $rootScope) {

  // 전송한 이미지나 동영상을 보여주기 위한 controller
  if( window.root ){
    $scope.hideNavbar = "false";

    var gui = require('nw.gui');
    var win = gui.Window.get();
    win.setMinimumSize(100, 100);
  } else {
    $scope.hideNavbar = "true";
  }

  var query = document.location.href;
  var vars = query.split("&");
  var type = vars[0].split("=")[1];
  var srcName=decodeURIComponent( query.split("src=")[1] ).replace( "#/", "");

  $scope.movieSrc = "";

  // 화면이 완료되면
  $scope.$watch('$viewContentLoaded', function() {

    var offsetX = $scope.hideNavbar=="true"?16:0;
    var offsetY = 0;

    var topBarY = $scope.hideNavbar=="true"?0:44;

    // image 인 경우
    if( type == 'SI' || type == 'RI'  ){
      var imgObj =  document.getElementById('imgContent');
      imgObj.style.display = "block";
      var element = angular.element( imgObj );

      element.bind( 'load', function (){
        offsetY = imgObj.scrollWidth > screen.width ? 84+ topBarY: 66+topBarY;
        window.resizeTo(imgObj.width+offsetX, imgObj.height+offsetY);
      });

      $scope.imageSrc = srcName;


    // video 인 경우
    } else if( type == 'SV' || type == 'RV' ) {
      var video =  document.getElementById('videoContent');
      var videoSourceObj =  document.getElementById('videoSource');

      video.style.display = "block";
      video.src = srcName;

      video.addEventListener('loadeddata', function (){
        offsetY = video.videoWidth > screen.width ? 84+ topBarY: 66+topBarY;
        window.resizeTo(video.videoWidth+offsetX, video.videoHeight+offsetY);
      });
    }
  });

  $scope.close = function(){
    window.close();
  };
});
