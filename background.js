// When user navigates around, save current state.
function do_thingy(tabId, changeInfo, tab) {
    // Can be: 'unloaded', 'loading', 'complete' or undefined.
    if (changeInfo.status !== 'complete') { return; }

    let winId = tab.windowId;
    getStoreId(winId, tabId, (storeId) => {
        //console.log('WIN/TAB/STORE: {winId}/{tabId}/{storeId}'.fmt({winId, tabId, storeId}));
        getStoreId(winId, tab.openerTabId, (fromStoreId) => {
            // FIXME: When there is a 'from' field, copy the history of the from.
            // (But keep reference to where it was copied from?)
            let entry = {
                from: fromStoreId,
                //time: Date.now(),
                url:  tab.url,
                name: tab.title,
            };
            save(storeId, (value = []) => {
                let newValue = value.concat(entry);
                //console.log('SAVE:', storeId, '=>', JSON.stringify(newValue, 0, 2));
                return newValue;
            });
        });
    });
}

// When user changes page inside a tab.
chrome.tabs.onUpdated.addListener(do_thingy);

/******************************************************************************/
/******************************************************************************/
/******************************************************************************/

// https://stackoverflow.com/a/11156533/351162
// Invoked when user changes tab.
// chrome.tabs.onActivated.addListener(function(activeInfo) {
//     // how to fetch tab url using activeInfo.tabid
//     chrome.tabs.get(activeInfo.tabId, function(tab){
//         console.log(tab.url);
//     });
// });

// https://stackoverflow.com/a/17584559/351162
// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
//     console.log('Page uses History API and we heard a pushSate/replaceState.');
//     // do your thing
// });

/*[eof]*/
