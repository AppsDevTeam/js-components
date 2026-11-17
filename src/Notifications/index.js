import naja from 'naja';
import { getToken, deleteToken } from "firebase/messaging";

const ENABLE_SELECTOR = '[data-adt-notifications-enable]';
const DISABLE_SELECTOR = '[data-adt-notifications-disable]';

// background request - it must not abort the user's requests nor change the history
const sendSignal = (url) => {
    naja.makeRequest('GET', url, null, { history: false, unique: false }).catch(function (err) {
        console.error(err);
    });
};

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
                            sendSignal(config.setFirebaseTokenLink.replace('__firebaseToken__', currentToken));
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
        if (window.messaging) {
            deleteToken(window.messaging)
                .then(function () {
                    // Unregister service worker
                    return navigator.serviceWorker.getRegistrations();
                })
                .then(function (registrations) {
                    registrations.forEach(function (registration) {
                        if (registration.active && registration.active.scriptURL.includes('firebase-messaging-sw')) {
                            registration.unregister();
                        }
                    });
                })
                .catch(function (err) {
                    console.error(err);
                });
        }

        sendSignal(config.removeAllFirebaseTokensLink);

        window.adtNotificationsToken = null;
        updateButtons();
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

    // Initial state: check if notifications are already enabled
    if (Notification.permission === 'granted') {
        waitForMessaging(5000).then(function (messaging) {
            if (!messaging) {
                updateButtons();
                return;
            }

            getToken(messaging, { vapidKey: config.vapidKey })
                .then(function (currentToken) {
                    if (currentToken) {
                        window.adtNotificationsToken = currentToken;
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

    naja.addEventListener('complete', function () {
        updateButtons();
    });
}

export default { run };