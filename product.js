var pathRe = /^[/]gp[/]product[/]([0-9A-Z]+)([/?]|$)/;
var priceRe = /^[$]([0-9]+[.][0-9]+)$/;
var CHROME_SYNC_KEY_PREFIX = 'pr_';

function getProduct() {
  var matchObj = pathRe.exec(window.location.pathname);
  if (!matchObj) {
    console.log('Cannot find product id: ' + window.location.pathname);
  }
  var productId = matchObj[1];
  
  var titleDiv = document.querySelector('#productTitle');
  if (!titleDiv) {
    console.log('Failed to find title.');
    return;
  }
  var name = titleDiv.textContent.trim().replace(/\s+/g, ' ');
  
  var priceDiv = document.querySelector('#priceblock_ourprice');
  if (!priceDiv) {
    console.log('Failed to get price from ' + url);
	return;
  }
  var price = 0.0;
  var textContent = priceDiv.textContent.replace(/\s+/g, ' ');
  matchObj = priceRe.exec(textContent);
  if (matchObj) {
    price = parseFloat(matchObj[1]);
  } else {
    console.log('Failed to find price in ' + textContent);
	return;
  }
  
  var isPrime = false;
  if (document.querySelector('.a-icon-prime')) {
    isPrime = true;
  }
  
  var imgEl = document.querySelector('#altImages img');
  if (!imgEl) {
    console.log('Failed to find image.');
	return;
  }
  var image = imgEl['src'].replace(/_SS[0-9]+_[.]jpg$/, '_SS75_.jpg');
  
  return {
	'shortName' : name,
	'longName' : name,
	'image' : image,
	'productId' : productId,
	'price' : price,
    'quantity' : 0,
	'isPrime' : isPrime
  };
}

function interceptOneClick() {
  var oneClickBtn = document.querySelector('#oneClickBuyButton');
  if (!oneClickBtn) {
    console.log('Cannot find one click button');
	return;
  }
  oneClickBtn.onclick = function() {
    console.log('Intercepted one click.');
    var product = getProduct();
	if (!product) {
	  console.log('Cannot find product!');
	  return;
	}
	var quantityEl = document.querySelector('#quantity');
	if (!quantityEl) {
	  console.log('Cannot find quantity element!.');
	  return;
	}
	product['quantity'] = parseInt(quantityEl.value);
	var items = {};
	var key = CHROME_SYNC_KEY_PREFIX + product['productId'];
	items[key] = product;
	chrome.storage.sync.set(items);
	// Continue propagate the event.
	return true;
  };
}

chrome.extension.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.action == "getProduct") {
    var product = getProduct();
	if (product) {
	  console.log(product);
      sendResponse(product);
	}
  }
  sendResponse(null);
});
interceptOneClick();
