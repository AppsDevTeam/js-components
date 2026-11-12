import { getToken, deleteToken } from "firebase/messaging";

const ENABLE_SELECTOR = '[data-adt-notifications-enable]';
const DISABLE_SELECTOR = '[data-adt-notifications-disable]';

// Vypnutí notifikací platí per prohlížeč (stejně jako token). Oprávnění
// v prohlížeči zůstává "granted", takže bez tohoto flagu by tichý sync
// po dalším načtení stránky token znovu vygeneroval a notifikace zapnul.
const OPT_OUT_KEY = 'adtNotificationsOptOut';

const run = (config) => {
    const updateButtons = () => {
        const $enableBtn = $(ENABLE_SELECTOR);
        const $disableBtn = $(DISABLE_SELECTOR);

        if (Notification.permission !== 'granted') {
            $enableBtn.show();
            $disableBtn.hide();
            return;
        }

        navigator.serviceWorker.getRegistrations().then(function (registrations) {
            var hasFirebaseSw = registrations.some(function (registration) {
                return registration.active && registration.active.scriptURL.includes('firebase-messaging-sw');
            });

            if (hasFirebaseSw) {
                $enableBtn.hide();
                $disableBtn.show();
            } else {
                $enableBtn.show();
                $disableBtn.hide();
            }
        });
    };

    // Enable notifications
    $(document).on('click', ENABLE_SELECTOR, function () {
        localStorage.removeItem(OPT_OUT_KEY);

        if (window.messaging) {
            Notification.requestPermission().then(function (permission) {
                if (permission !== 'granted') {
                    alert(_('appJs.firebase.error.notificationsPermissionError'));
                    return;
                }

                getToken(window.messaging, { vapidKey: config.vapidKey })
                    .then(function (currentToken) {
                        if (currentToken) {
                            window.adtNotificationsToken = currentToken;
                            $.nette.ajax({
                                url: config.setFirebaseTokenLink.replace('__firebaseToken__', currentToken)
                            });
                            updateButtons();
                        } else {
                            alert(_('appJs.firebase.error.notificationsPermissionError'));
                        }
                    })
                    .catch(function (err) {
                        console.error(err);
                        alert(_('appJs.firebase.error.notificationsPermissionError'));
                    });
            });
        } else {
            alert(_('appJs.firebase.error.notificationsNotSupported'));
        }
    });

    // Disable notifications
    $(document).on('click', DISABLE_SELECTOR, function () {
        var currentToken = window.adtNotificationsToken;

        localStorage.setItem(OPT_OUT_KEY, '1');

        var cleanup = window.messaging
            ? deleteToken(window.messaging)
                .then(function () {
                    return navigator.serviceWorker.getRegistrations();
                })
                .then(function (registrations) {
                    return Promise.all(registrations
                        .filter(function (registration) {
                            return registration.active && registration.active.scriptURL.includes('firebase-messaging-sw');
                        })
                        .map(function (registration) {
                            return registration.unregister();
                        }));
                })
                .catch(function (err) {
                    console.error(err);
                })
            : Promise.resolve();

        // maže se jen token tohoto prohlížeče - vypnutí nesmí odhlásit
        // notifikace uživatele na jeho ostatních prohlížečích/zařízeních
        $.nette.ajax({
            url: currentToken && config.removeFirebaseTokenLink
                ? config.removeFirebaseTokenLink.replace('__firebaseToken__', currentToken)
                : config.removeAllFirebaseTokensLink
        });

        window.adtNotificationsToken = null;

        // updateButtons až po dokončení odregistrace service workeru - AJAX
        // (a jeho ajaxComplete -> updateButtons) jinak stihne doběhnout dřív,
        // uvidí ještě zaregistrovaný SW a tlačítka vrátí do stavu "zapnuto"
        cleanup.then(function () {
            updateButtons();
        });
    });

    // window.messaging se inicializuje async v Messaging komponentě, která nemusí
    // doběhnout dřív než tento init (typicky po F5). Počkáme na ni, jinak by se
    // getToken nikdy nezavolal a window.adtNotificationsToken by zůstal nenastavený.
    var waitForMessaging = function (timeoutMs) {
        return new Promise(function (resolve) {
            if (window.messaging) {
                resolve(window.messaging);
                return;
            }
            var elapsed = 0;
            var step = 100;
            var interval = setInterval(function () {
                if (window.messaging) {
                    clearInterval(interval);
                    resolve(window.messaging);
                } else if ((elapsed += step) >= timeoutMs) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, step);
        });
    };

    // Initial state: s uděleným oprávněním funguje getToken() bez user interaction
    // (chybějící token vygeneruje vč. registrace service workeru); token, který
    // backend nezná (není v config.knownTokens), rovnou synchronizujeme na server.
    if (Notification.permission === 'granted' && !localStorage.getItem(OPT_OUT_KEY)) {
        waitForMessaging(5000).then(function (messaging) {
            if (!messaging) {
                updateButtons();
                return;
            }

            getToken(messaging, { vapidKey: config.vapidKey })
                .then(function (currentToken) {
                    if (currentToken) {
                        window.adtNotificationsToken = currentToken;

                        var knownTokens = config.knownTokens || [];
                        if (config.syncFirebaseTokenLink && knownTokens.indexOf(currentToken) === -1) {
                            $.nette.ajax({
                                url: config.syncFirebaseTokenLink.replace('__firebaseToken__', currentToken)
                            });
                        }
                    }
                    updateButtons();
                })
                .catch(function () {
                    updateButtons();
                });
        });
    } else {
        updateButtons();
    }

    $(document).on('ajaxComplete', function () {
        updateButtons();
    });
}

export default { run };
