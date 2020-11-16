// FIXME: Hilight current tab & window in popup.

// chrome.tabs.goForward -- to navigate history?
// chrome.tabs.goBack
// chrome.tabs.captureVisibleTab -- grab screenshot of currently active tab

// Will this work to change url inside a tab, and add it to the tab's history?
// $('#color').click(() => {
//     chrome.tabs.executeScript({
//         code: 'document.location = myNewUrl;'
//     });
// });


function debug(...args) {
    let text = args.map((x) => (
        typeof x === 'string' ? x : JSON.stringify(x, 0, 2)
    )).join(' ') + '\n';
    $('#debug')
        .append(escapeHtml(text))
        .removeAttr('hidden');
    console.log(text);
}

// Load stored tabs.
function drawTabs($e) {
    load('_', (storeIds = {}) => {

        // Draw graph for each window.
        Object.keys(storeIds).forEach((winId) => {              // foreach window
            if (winId === '_') { return; }
            const $win = $(`<div class=window data-id="${winId}">`).appendTo($e);

            // Draw graph for each tab inside windows.
            // (Sort tabs in current GUI order, add closed tabs last.)
            tabSort(winId, Object.keys(storeIds[winId]), (tabIds, tabOrder) => {
                tabIds.forEach((tabId) => {                     // foreach tab
                    const $tab = $(`<div class=tab data-id="${tabId}">`).appendTo($win);
                    if (tabOrder[tabId] === undefined) {
                        $tab.addClass('closed');
                    }
                    // $(`<div class="page special">${tabId}</div>`).appendTo($tab);
                    // $(`<div class="page special">${tabOrder[tabId]}</div>`).appendTo($tab);

                    // Draw graph for page visids inside tabs.
                    load(storeIds[winId][tabId], (pages) => {
                        pages.reverse().forEach((page) => {               // foreach page visit
                            const name = escapeHtml(page.name.replace(/<[^>]*>/, ''));
                            $(`<div class=page>${name}</div>`).appendTo($tab);
                        });
                    });
                });
            });
        });
    });
}

// Go to specified window & tab. Callback is invoked with the returned chrome
// Window and Tab objects. If either tab or window does not exist, invoke
// failhook.
function gotoTab(winId, tabId, { pass = ()=>{}, fail = ()=>{} }) {
    testTab(winId, tabId, {
        fail: () => {
            fail(winId, tabId);
        },
        pass: (win, tab) => {
            chrome.windows.getCurrent((win) => {
                // If not current window add window-switching to hook.
                if (win.id !== winId) {
                    pass = (win, tab) => {
                        gotoWindow(winId, (win) => pass(win, tab));
                    };
                }
                // Switch tab and call hook.
                gotoTab(tabId, (tab) => pass(win, tab));
            });
        },
    });
    function testTab(winId, tabId, { pass, fail }) {
        chrome.windows.get(winId, (win) => {
            chrome.tabs.get(tabId, (tab) => {
                if (win && tab) {
                    pass(win, tab);
                } else {
                    fail(winId, tabId);
                }
            });
        });
    }
    function gotoWindow(winId, hook) {
        chrome.windows.update(winId, { focused: true }, (win) => hook(win));
    }
    function gotoTab(tabId, hook) {
        chrome.tabs.update(tabId, { active: true }, (tab) => hook(tab));
    }
}

function resurrectTab(winId, tabId, hook) {
    getStoreId(winId, tabId, (storeId) => {
        debug(winId, tabId, storeId);
        load(storeId, (pages) => {
            const [first, ...rest] = pages;
            chrome.tabs.create({ url: first.url });
            rest.forEach((page) => {
                chrome.tabs.update({ url: page.url });
            });
        });
    });
}

// FIXME
function loadTab(winId, tabId, hook) {
    getStoreId(winId, tabId, (storeId) => {
        load(storeId, (pages) => {
            const [first, ...rest] = pages;
            chrome.tabs.create({ url: first.url });
            rest.forEach((page) => {
                chrome.tabs.update({ url: page.url });
            });
        });
    });
    // const [last] = pages.slice(-1)
    // debug('LOADING TAB:', storeId, pages );
    // debug('------------------------------------------------------------');
    // debug(first);
    // debug('------------------------------------------------------------');
    // debug(rest);
    // debug('------------------------------------------------------------');
}


// // Does a chrome.tabs.query, and makes sure returned result is sorted by first
// // 'windowId', then 'index' properties.
// function tabQuery(queryInfo, hook) {
//     chrome.tabs.query(queryInfo, (tabs) => {
//         hook(tabs.sort((a, b) => (
//             a.windowId - b.windowId || a.index - b.index
//         )));
//     });
// }

// Will sort tabIds (in the same order as they are in window winId) and invoke
// hook function with the list of sorted tabIds.
function tabSort(winId, tabIds, hook) {
    function numOrInf(x) {
        return x === undefined ? Infinity : x;
    }
    chrome.tabs.query({ windowId: parseInt(winId, 10) }, (tabs) => {
        // Create mapping between tabId and its tab 'index' number.
        const tabOrder = tabs.reduce((a, tab) => ({
            ...a, [tab.id]: tab.index,
        }), {});

        // Sort tabs according to the mapping (undefined = Infinity).
        const newTabIds = tabIds.sort((a, b) => (
            numOrInf(tabOrder[a]) - numOrInf(tabOrder[b])
            // FIXME: Sort deleted tabs by title (or closing time?)
        ));
        hook(newTabIds, tabOrder);
    });
}

// e.target         -- clicked element
// e.currentTarget  -- element specified by .on() <selector> arg
// e.delegateTarget -- element where handler is attached
function main() {
    'use strict';
    $('div')
        .on('click', '#clear', () => {
            if (confirm('Clear all data?')) {
                chrome.storage.local.clear();
                chrome.runtime.reload();
            }
        })
        .on('click', '#reload', () => {
            chrome.runtime.reload()
        });

    // Either select (an existing tab) or re-create a previously closed one.
    $('#state').on('click', 'div.tab', (e) => {
        const $e = $(e.currentTarget);
        const tabId = $e.data('id');
        const winId = $e.closest('.window').data('id');
        gotoTab(winId, tabId, window.close, (winId, tabId) => {
            alert(`No such window/tab`);
        });
        gotoTab(winId, tabId, {
            pass: window.close,              // close popup
            fail: (winId, tabId) => {
                resurrectTab(winId, tabId);
                //alert(`No such window/tab`);
            },
        });
    });

    drawTabs($('#state'));
}

$(main);

// Get current tab.
// chrome.tabs.query({ currentWindow: true, active: true }, ([tab]) => {
//     getStoreId(tab.windowId, tab.id, (storeId) => {
//         load(storeId, (tabHistory) => {
//             debug(
//                 'Window/Tab: {windowId}/{id}'.fmt(tab),
//                 'StoreId: ' + storeId,
//                 'History: ' + JSON.stringify(tabHistory, 0, 2),
//             );
//         });
//     });
// });

/*[eof]*/
