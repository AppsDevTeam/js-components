import { getToken, deleteToken } from "firebase/messaging";

const run = (config) => {
    const $enableBtn = $('[data-adt-notifications-enable]');
    const $disableBtn = $('[data-adt-notifications-disable]');

    const updateButtons = () => {
        if (Notification.permission === 'granted') {
            $enableBtn.hide();
            $disableBtn.show();
        } else {
            $enableBtn.show();
            $disableBtn.hide();
        }
    };

    // Enable notifications
    $enableBtn.on('click', function () {
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
    $disableBtn.on('click', function () {
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

        $.nette.ajax({
            url: config.removeAllFirebaseTokensLink
        });

        window.adtNotificationsToken = null;
        updateButtons();
    });

    // Initial state: check if notifications are already enabled
    if (Notification.permission === 'granted' && window.messaging) {
        getToken(window.messaging, { vapidKey: config.vapidKey })
            .then(function (currentToken) {
                if (currentToken) {
                    window.adtNotificationsToken = currentToken;
                }
                updateButtons();
            })
            .catch(function () {
                updateButtons();
            });
    } else {
        updateButtons();
    }
}

export default { run };