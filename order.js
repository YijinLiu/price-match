function getProductId(dedupArg) {
  var pos = dedupArg.indexOf('|');
  return dedupArg.substring(0, pos);
}

function getProductList() {
  var productList = [];
  var elList = document.querySelectorAll(
      'div.shipping-group > div.a-row > div.a-column:first-child');
  if (!elList) {
    console.log('Failed to find shipping groups!');
    return productList;
  }
  
  for (var i = 0; i < elList.length; ++i) {
    var groupEl = elList[i];
    var dupOrderCheckArgsElList = groupEl.querySelectorAll(
        'input[name="dupOrderCheckArgs"]');
	var imgElList = groupEl.querySelectorAll(
	    'div.a-row > div.a-column > img[alt]');
    if (dupOrderCheckArgsElList.length == 0) {
	  console.log('Cannot find dupOrderCheckArgs!');
	  continue;
	}
	if (imgElList.length == 0) {
	  console.log('Cannot find images!');
	  continue;
	}
	if (dupOrderCheckArgsElList.length != imgElList.length) {
	  console.log('Confused... :( ' + 
	              dupOrderCheckArgsElList.length + ' VS ' +
				  imgElList.length);
	  continue;
	}
    for (var j = 0; j < dupOrderCheckArgsElList.length; ++j) {
	  var productId = getProductId(dupOrderCheckArgsElList[j]['value']);
	  var imgEl = imgElList[j];
      var image = imgEl['src'];
      var shortName = imgEl['alt'];
      var productDiv = imgEl.parentNode.nextSibling;
	  while (productDiv.nodeName != 'DIV') {
	    productDiv = productDiv.nextSibling;
	  }
      var price = 0.0;
      var quantity = 1;
      var priceRe = /^[$]([0-9]+[.][0-9]+)$/;
      var quantityRe = /^Quantity: ([0-9]+) Change/;
	  var longName = '';
	  var isPrime = false;
      for (var k = 0; k < productDiv.childNodes.length; ++k) {
        var child = productDiv.childNodes[k];
	    if (child.nodeName != 'DIV') continue;
	    var textContent = child.textContent.trim().replace(/\s+/g, ' ');
        if (!longName) {
	      longName = textContent;
	      continue;
	    }
	    var matches = priceRe.exec(textContent);
	    if (matches) {
	      price = parseFloat(matches[1]);
	      if (child.querySelector('.a-icon-prime')) {
	        isPrime = true;
	      }
	      continue;
	    }
	    matches = quantityRe.exec(textContent);
	    if (matches) {
	      quantity = parseInt(matches[1]);
	      continue;
	    }
      }
      productList.push({
	    'shortName' : shortName,
	    'longName' : longName,
	    'image' : image,
	    'productId' : productId,
	    'price' : price / quantity,
		'quantity' : quantity,
	    'isPrime' : isPrime
	  });
    }
  }
  return productList;
}

var chromeSyncKeyPrefix = 'pr_';

function findProductsAndModifySubmitUrl() {
  var productList = getProductList();
  if (productList.length == 0) return;
  for (var i = 0; i < productList.length; ++i) {
    var productId = productList[i]['productId'];
	var items = {};
	items[chromeSyncKeyPrefix + productId] = productList[i];
	chrome.storage.sync.set(items);
  }
}
findProductsAndModifySubmitUrl();