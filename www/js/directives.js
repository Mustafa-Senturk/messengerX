angular.module('starter.directives', [])

.directive('ngEnter', function() {
  return function(scope, element, attrs) {
    element.bind("keydown keypress", function(event) {
      if (event.which === 13) {
        scope.$apply(function() {
          scope.$eval(attrs.ngEnter);
        });

        event.preventDefault();
      }
    });
  };
})
.directive('channelImage', function(Cache, Sign) {
  return {
    restrict: 'A',
    scope: {
       users: '=users',
       channelImage : '=image',
       channelName : '=channelName',
       result: '&'
    },    
    replace: true,
    transclude: false,
    controller: function($scope) {
      var loginUserId = Sign.getUser().userId;
      var result = "../img/channel_image.jpg";
      var users = $scope.users;

      var friendId = '';

      var channelImage = $scope.channelImage;
      var channelName = $scope.channelName;

      if( users != undefined ){
        var userArray = users.split( "," );
        if( userArray.length == 2  ){
          friendId = users.replace(",", "" ).replace( loginUserId, "" );
        }
      }

      if( channelImage != '' ){
        result = channelImage;
        if( friendId != '' ){
          Cache.add( friendId, { 'NM':channelName , 'I': result } );
        }

      } else if( Cache.get( friendId ) != undefined ){
        result = Cache.get( friendId ).I;
      } 

      $scope.image = result;
    },
    template: '<img ng-src="{{image}}" />'
  };
})
.directive('popupLink', function ( $rootScope, $window, $ionicFrostedDelegate, $ionicScrollDelegate, $ionicPopup ) {       
  return {
    link: function(scope, element, attrs) {

      if( attrs.imageLink == "true" ){
        element.bind("load" , function(event){
          $ionicFrostedDelegate.update();
          $ionicScrollDelegate.scrollBottom(true);
        });
      }

      element.bind("click" , function(event){
        var url;
        if( attrs.popup != undefined ){
          url = attrs.popup;
        } else {
          url = attrs.src.replace( "T_", "" );
        }

        var left = screen.width/2 - 400
            , top = screen.height/2 - 300
            , popup = $window.open(url, '', "top=" + top + ",left=" + left + ",width=800,height=600");
      });
    }
  }
})
.directive('channelUsers', function(UTIL, $rootScope) {
  return {
    restrict: 'A',
    scope: {
       users: '=users',
       count: '&',
       className : '&'
    },    
    replace: true,
    transclude: false,
    controller: function($scope) {
      $scope.count = $scope.users.split( "," ).length;
      if( $scope.count > 2 ){
        $scope.className = "users";
      } else {
        $scope.className = "hidden";
      }
    },
    template: '<span class="{{className}}"><img src="'+$rootScope.rootImgPath+'/user-icon.png"></img>&nbsp;{{count}}</span>'
  };
})
.directive('updatedTime', function(UTIL) {
  return {
    restrict: 'A',
    scope: {
       timestamp: '=timestamp',
       timeString: '&'
    },    
    replace: true,
    transclude: false,
    controller: function($scope) {
      $scope.timeString = UTIL.timeToString( $scope.timestamp )[0];
    },
    template: '<span class="channel-time">{{timeString}}</span>'
  };
})
.directive('searchByKey', function($parse, $timeout, UTIL){
  var DELAY_TIME_BEFORE_POSTING = 100;
  return function(scope, elem, attrs) {

    var element = angular.element(elem)[0];
    var currentTimeout = null;

    var poster = $parse(attrs.post)(scope);
    var reseter = $parse(attrs.reset)(scope);

    element.oninput = function() {

      if(currentTimeout) {
        $timeout.cancel(currentTimeout)
      }
      currentTimeout = $timeout(function(){

        var searchKey = angular.element(element).val();

        if( searchKey != '' ){
          matches = [];
          var separated = UTIL.getMorphemes( searchKey );

          var datas = [];

          var items =attrs.items.split('.');
          if( items.length == 2  ){
            var item1 = items[0];
            var item2 = items[1];
            datas= scope[item1][item2];
          } else {
            datas = scope[attrs.items];
          }

          for( var key in datas ){
            var data = datas[key];
            if( UTIL.getMorphemes( data.user_name ).indexOf( separated ) > -1
              || data.chosung.indexOf( searchKey ) > -1 ){
              matches.push( data );
            }
          }

          poster( matches );
        } else {
          reseter();
        }

      }, DELAY_TIME_BEFORE_POSTING)
    }
  }
});