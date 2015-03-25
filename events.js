var priceRe = /^[$]([0-9]+[.][0-9]+)$/;

var OPTIONS_KEY = 'options';
var CHROME_SYNC_KEY_PREFIX = 'pr_';
var LAST_UPDATE_TS = 'lastUpdateTs';
var PRODUCT_URL_PREFIX = 'http://www.amazon.com/gp/product/';
  
function crawlAndUpdatePrice(product) {
  var url = PRODUCT_URL_PREFIX + product['productId'];
  var xhr = new XMLHttpRequest();
  xhr.responseType = 'document';
  xhr.onload = function(e) {
    var priceDiv = xhr.response.querySelector('#priceblock_ourprice');
	if (!priceDiv) {
	  priceDiv = xhr.response.querySelector('#priceblock_saleprice');
	}
    if (!priceDiv) {
      console.log('Failed to get price from ' + url);
	  return;
    }
    var price = 0.0;
	var textContent = priceDiv.textContent.replace(/\s+/g, ' ');
    var matchObj = priceRe.exec(textContent);
    if (matchObj) {
      price = parseFloat(matchObj[1]);
    } else {
      console.log('Failed to find price in ' + textContent);
	  return;
    }
	
	var now = Math.floor(Date.now() / 1000);
    product[LAST_UPDATE_TS] = now;
	var priceChanged = false;
	if (!product['history']) {
      if (price != product['price']) {
		product['history'] = { now : price };
		product['currentPrice'] = price;
		priceChanged = true;
	  }
    } else {
	  if (price != product['currentPrice']) {
		product['history'][now] = price;
		product['currentPrice'] = price;
		priceChanged = true;
	  }
	}
    var items = {};
	var key = CHROME_SYNC_KEY_PREFIX + product['productId'];
	if (priceChanged) {
	  var options = {
		'type': 'basic',
		'iconUrl': product['image'],
		'title': 'Price Changed!',
		'message': product['longName'],
		'isClickable': true
	  };
	  chrome.notifications.create(
		  key, options, function() {});
	}
	items[key] = product;
	chrome.storage.sync.set(items, function() {
	  if (product['quantity'] == 0) {
	    if (product['currentPrice'] <= product['expectedPrice']) {
		  var options = {
		    'type': 'basic',
			'iconUrl': product['image'],
			'title': 'Here is your expected price!',
			'message': product['longName'],
			'isClickable': true
		  };
	      chrome.notifications.create(
		    key, options, function() {});
	    }
	  } else if (product['currentPrice'] < product['price']) {
	    chrome.storage.sync.get(OPTIONS_KEY, function(items) {
		  if (!items || !items[OPTIONS_KEY]) {
		    console.log('Failed to get options!');
			return;
		  }
		  var options = items[OPTIONS_KEY];
		  if (!options['minPriceChange']) {
		    console.log('Faild to get minPriceChange!');
			return;
		  }
	      if ((product['price'] - product['currentPrice']) *
     		  product['quantity'] >= options['minPriceChange']) {
		    var options = {
		      'type': 'basic',
			  'iconUrl': product['image'],
			  'title': 'Ask for price match!',
			  'message': product['longName'],
			  'isClickable': true
		    };
	        chrome.notifications.create(
		      key, options, function() {});
		  }
		});
	  }
	});
  };
  xhr.open('GET', url, true);
  xhr.send();
}

function updatePrice() {
  chrome.storage.sync.get(
    null, function(products) {
	  var options = products[OPTIONS_KEY];
	  if (!options) {
	    options = {
		  'days' : 30,
		  'minPriceChange' : 5,
		  'refreshInterval' : 180
		};
	  }
	  console.log(options);
	  for (var key in products) {
	    if (key.indexOf(CHROME_SYNC_KEY_PREFIX) != 0) continue;
		var product = products[key];
		console.log(product);
		var now = Math.floor(Date.now() / 1000);
		if (now - product['buyTs'] > options['days'] * 24 * 60 * 60) {
		  chrome.storage.sync.remove(key);
		  continue;
		}
		var lastUpdateTs = product[LAST_UPDATE_TS];
		if (!lastUpdateTs) lastUpdateTs = product['buyTs'];
		crawlAndUpdatePrice(product);
	  }
	});
}

var asinsRe = /([?&]asins=([^&]+))(&|$)/;
function getProductIdsFromUrl(url) {
  var productIds = [];
  while (true) {
	var matchObj = asinsRe.exec(url)
	if (!matchObj) break;
	productIds.push(matchObj[2]);
	var index = url.indexOf(matchObj[1]);
	url = url.substring(index + matchObj[1].length);
  }
  return productIds;
}

chrome.webNavigation.onCompleted.addListener(function(details) {
  if (details.frameId != 0) return;
  var url = details.url;
  console.log(url);
  var productIds = getProductIdsFromUrl(url);
  var buyTs = Math.floor(details.timeStamp / 1000);
  var keys = [];
  for (var i = 0; i < productIds.length; ++i) {
	keys.push(CHROME_SYNC_KEY_PREFIX + productIds[i]);
  }
  chrome.storage.sync.get(keys, function(items) {
    var newItems = {};
	for (var i = 0; i < keys.length; ++i) {
	  var key = keys[i];
	  if (!items[key]) {
	    console.log('Failed to find ' + key + '!');
	  } else {
	    var product = items[key];
		product['buyTs'] = buyTs;
		newItems[key] = product;
      }
	}
	console.log(newItems);
	chrome.storage.sync.set(newItems);
  });
}, {url:[{
  urlPrefix:'https://www.amazon.com/gp/buy/thankyou/handlers/display.html'}]});
  
var alarmName = 'updatePrice';
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm['name'] == alarmName) updatePrice();
});
chrome.storage.sync.get(OPTIONS_KEY, function(items) {
  if (items && items[OPTIONS_KEY]) {
    var options = items[OPTIONS_KEY];
    chrome.alarms.create(
	    alarmName, {'periodInMinutes':options['refreshInterval']});
  } else {
    console.log('Failed to get options.');
  }
});

chrome.notifications.onClicked.addListener(function(id) {
  if (id.indexOf(CHROME_SYNC_KEY_PREFIX) == 0) {
    chrome.storage.sync.get(id, function(items) {
	  if (!items || !items[id]) {
	    console.log('Failed to find ' + id + '!');
		return;
	  }
	  var product = items[id];
	  var options = {};
	  if (product['quantity'] == 0 ||
	      (product['price'] - product['currentPrice']) * product['quantity'] < minChange) {
	    options.url = PRODUCT_URL_PREFIX + product['productId'];
	  } else {
	    options.url = 'https://www.amazon.com/gp/help/customer/contact-us';
	  }
	  chrome.tabs.create(options);
	});
  }
});

updatePrice();