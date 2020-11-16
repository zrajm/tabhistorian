function escapeHtml(text) {
    'use strict';
    return text.replace(/[\"&<>]/g, (a) => (
        { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a]));
}

// https://gist.github.com/pbroschwitz/3891293
String.prototype.fmt = function (o) {
    'use strict';
    return this.replace(/{([^{}]*)}/g, (a, b) => {
        let r = o[b];
        return typeof r === 'string' || typeof r === 'number' ? r : a;
    });
};

// Load value named <key>, invok callback with returned value (will be
// undefined if it does not exist).
function load(key, hook) {
    chrome.storage.local.get(key, (data) => hook(data[key]));
}

// Save key/value pair in chrome.storage.local. If value is a function, then
// any previously existing value is read, and passed to it and whatever the
// function returns will be saved. Throws in saving failed.
function save(key, value) {
    load(key, (oldValue) => {
        let newValue = typeof value !== 'function' ? value : value(oldValue);
        chrome.storage.local.set({ [key]: newValue }, function () {
            let err = chrome.runtime.lastError;
            if (err) {
                throw('save(): Unable to save value: ' + err.message);
            }
        });
    });
}

// Invoke hook() whenever value <key> is modified. The hook is called with the
// new value as its first arg, the old value as its second arg.
function onChange(key, hook) {
    chrome.storage.local.onChanged.addListener(function(changes) {
        if (changes.hasOwnProperty(key)) {
            var x = changes[key];
            hook(x.newValue, x.oldValue);
        }
    });
}

// Given a session-specific Chrome windowId + tabId, invokes a callback
// function with the storeId as the only argument. If either winId or tabId is
// undefined the callback will be invoked argument 'undefined'.
function getStoreId(winId, tabId, hook) {
    load('_', (ids = { _: 0 }) => {
        if (winId !== undefined && !ids[winId]) {
            ids[winId] = {};
        }
        if (tabId !== undefined && !ids[winId][tabId]) {
            ids[winId][tabId] = String(ids._);
            ids._ += 1;
            save('_', ids);
        }
        // Only works bcuz 'undefined' is never as an array index.
        hook(ids[winId][tabId]);
    });
}

/*[eof]*/
