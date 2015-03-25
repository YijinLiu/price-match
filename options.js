var OPTIONS_KEY = 'options';

function restoreOptions() {
  chrome.storage.sync.get(OPTIONS_KEY, function(items) {
    if (!items || !items[OPTIONS_KEY]) return;
	var options = items[OPTIONS_KEY];
	if (options['days']) {
      document.getElementById('days').value = options['days'];
	}
	if (options['minPriceChange']) {
	  document.getElementById('min_price_change').value =
  		  options['minPriceChange'];
    }
	if (options['refreshInterval']) {
	  document.getElementById('refresh_interval').value =
  		  options['refreshInterval'];
    }
  });
  document.getElementById('save').addEventListener('click', saveOptions);
}

function saveOptions() {
  var items = {};
  items[OPTIONS_KEY] = {
      'days' : parseInt(document.getElementById('days').value),
	  'minPriceChange' : parseFloat(document.getElementById('min_price_change').value),
	  'refreshInterval' : parseInt(document.getElementById('refresh_interval').value)
  };
  console.log(items);
  chrome.storage.sync.set(items, function() {
    if (chrome.runtime.lastError) {
	  console.log(chrome.runtime.lastError.message);
	}
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);