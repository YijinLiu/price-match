var MONTH_NAMES = [
    'Jan',
    'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
];
var OPTIONS_KEY = 'options';
var CHROME_SYNC_KEY_PREFIX = 'pr_';

function updateProducts(scope, route) {
  scope['products'] = [];
  chrome.storage.sync.get(null, function(items) {
    for (var key in items) {
      if (key == OPTIONS_KEY) {
	    scope['options'] = items[key];
		continue;
	  }
	  if (key.indexOf(CHROME_SYNC_KEY_PREFIX) != 0) continue;
	  console.log(items[key]);
	  scope['products'].push(items[key]);
	}
	route.reload();
  });
}

var productUrlRe = /:[/][/]www[.]amazon[.]com[/]gp[/]product[/]([0-9A-Z]+)([/?]|$)/;
var apmApp = angular.module('apmApp', ['ngRoute']);
apmApp.controller('ProductsCtrl',  ['$scope', '$route', function ($scope, $route) {
  chrome.tabs.getSelected(null, function(tab) {
    if (productUrlRe.exec(tab.url)) {
      chrome.tabs.sendMessage(tab.id, {action: "getProduct"}, function(product) {
	    if (chrome.runtime.lastError) {
		  console.log(chrome.runtime.lastError.message);
		} else if (product) {
		  $scope['monitorProduct'] = product;
	      $route.reload();
		}
	  });
    }
  });
  $scope['monitor'] = function(product) {
	var input = prompt(
	    'Please input expected price. Current price is ' +
		product['price'] + '.', product['price']);
    if (!input) return;
    var expectedPrice = parseFloat(input);
	while (!expectedPrice || expectedPrice <= 0 ||
	       expectedPrice >= product['price']) {
	  input = prompt(
	      'Please input a valid expected price, which < ' +
		  product['price'] + '.', product['price']);
	  if (!input) return;
	  expectedPrice = parseFloat(input);
	}
    product['expectedPrice'] = expectedPrice;
	product['buyTs'] = Math.floor(Date.now() / 1000);
	var items = {};
	items[CHROME_SYNC_KEY_PREFIX + product['productId']] = product;
	chrome.storage.sync.set(items, function() {
	  updateProducts($scope, $route);
	});
  };
  $scope['formatTimestamp'] = function(ts) {
    if (!ts) return 'not bought!';
    var date = new Date(ts*1000);
	return MONTH_NAMES[date.getMonth()] + ' ' +
	       date.getDate() + ' ' +
		   date.getHours() + ':' + date.getMinutes();
  };
  $scope['remove'] = function(productId) {
    chrome.storage.sync.remove(
	    CHROME_SYNC_KEY_PREFIX + productId, function() {
		  if (!chrome.runtime.lastError) {
		    updateProducts($scope, $route);
		  } else {
		    alert('Failed to remove product: ' +
			      chrome.runtime.lastError.message);
		  }
		});
  };
  $scope['isRaised'] = function(product) {
    return product['currentPrice'] > product['price'];
  };
  $scope['isDropped'] = function(product) {
    return product['currentPrice'] < product['price'];
  };
  $scope['showProductName'] = function(productName) {
    var MAX_LENGTH = 94;
    if (productName.length <= MAX_LENGTH) {
	  return productName;
	}
	return productName.substring(0, MAX_LENGTH - 4) + '....';
  };
  updateProducts($scope, $route);
}]);