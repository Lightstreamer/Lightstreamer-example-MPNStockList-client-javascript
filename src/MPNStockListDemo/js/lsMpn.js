/*
  Copyright (c) Lightstreamer Srl

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/


var mpnDevice= null;

//////////////// MPN Device Creation and Registration

function getDeviceToken() {
    return new Promise((resolve, reject) => {
        
        // Check if we are on Safari, if not we assume we are on Chrome or Firefox
        if (window.safari != undefined) {
            console.log("Requesting device token for Safari...");
            
            // Prepare permission callback
            var checkRemotePermission= function(permissionData) {
                if (permissionData.permission === 'default') {
                    console.log("Safari push notification permissions requested");
                    
                    // Request permissions, the callback is this same function
                    window.safari.pushNotification.requestPermission(APPLE_WEB_SERVICE_URL, APPLE_WEBSITE_PUSH_ID, APPLE_USER_INFO, checkRemotePermission);
                } 
                else if (permissionData.permission === 'denied') {
                    console.log("Safari push notification permissions denied");
                    
                    reject("Push notification permissions denied");
                } 
                else if (permissionData.permission === 'granted') {
                    console.log("Safari push notification permissions granted, token: " + permissionData.deviceToken);
                    
                    resolve(permissionData.deviceToken);
                }
            };

            // Check permissions to send push notifications
            var permissionData= window.safari.pushNotification.permission(APPLE_WEBSITE_PUSH_ID);
            checkRemotePermission(permissionData);
        }
        else {
            console.log("Requesting device token for Chrome/Firefox via Firebase Messaging...");
            
            // Initialize Firebase, its instance is needed to create the MPN device
            var firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);

            // Get the Firebase Messaging instance and configure the VAPID key
            var messaging = firebaseApp.messaging();
            messaging.usePublicVapidKey(FIREBASE_VAPID_KEY);

            // Set the foreground notification event
            messaging.onMessage(function(payload) {
                console.log("Received foreground MPN", payload);
            });

            Notification.requestPermission().then(function(permission) {
                if (permission === "granted") {
                    messaging.getToken().then(function(currentToken) {
                        if (currentToken) {
                            console.log("Chrome/Firefox push notification permissions granted, token: " + currentToken);
                            
                            resolve(currentToken);
                        } 
                        else {
                            console.log("Chrome/Firefox push notification permissions denied");
                            
                            reject("Push notification permissions denied");
                        }
                    }).catch(function(err) {
                        console.log("Chrome/Firefox push notification permissions request failed", err);
                        
                        reject(err);
                    });
                }
                else {
                    console.log("Push notification permissions denied");
                    
                    reject("Push notification permissions denied");
                }
            });
        }
    });
}

function doRegister(token, subscriptionEnumerator) {
    return new Promise((resolve, reject) => {
        
        // Prepare the MPN device listener: its purpose is to update the item's
        // Notify button status whenever an MPN subscription for that item is
        // activated or deactivated
        var mpnDeviceListener= {
                onRegistered: function() {
                    console.log("MPN device registered successfully");
                    
                    resolve();
                },
                
                onRegistrationFailed: function(code, message) {
                    console.log("MPN device registration failed: " + code + ", " + message);
                    
                    reject("MPN device registration failed: " + code + ", " + message);
                },
                
                onSubscriptionsUpdated: function() {
                    var mpnSubscriptions= lsClient.getMpnSubscriptions();
                    
                    console.log("MPN subscriptions updated: " + mpnSubscriptions.length + " active MPN subscriptions");
                    
                    // Update the Notify button status
                    var i= 0;
                    for (i= 0; i < mpnSubscriptions.length; i++) {
                        var mpnSubscription= mpnSubscriptions[i];
                        var item= mpnSubscription.getItemGroup();
                        var notificationFormat= mpnSubscription.getNotificationFormat();
                        var triggerExpression= mpnSubscription.getTriggerExpression();
                        
                        // Call the subscription enumerator
                        subscriptionEnumerator(item, JSON.parse(notificationFormat), triggerExpression);
                    }
                }
        };
        
        // Create the MPN device
        var appId = window.safari ? APPLE_APP_ID : FIREBASE_APP_ID;
        var platform = window.safari ? 'Apple' : 'Google';
        mpnDevice = new Ls.MpnDevice(token, appId, platform);
        
        // Add the MPN device listener
        mpnDevice.addListener(mpnDeviceListener);
        
        // Register the MPN device
        lsClient.registerForMpn(mpnDevice);
    });
}

//////////////// MPN Subscription Enumeration

function enumerateMpnSubscriptions(subscriptionEnumerator) {
    if (mpnDevice == null)
      return;

    var mpnSubscriptions= lsClient.getMpnSubscriptions();

    // Enumerate the MPN subscriptions
    for (var i= 0; i < mpnSubscriptions.length; i++) {
      var mpnSubscription= mpnSubscriptions[i];
      var item= mpnSubscription.getItemGroup();
      var notificationFormat= mpnSubscription.getNotificationFormat();
      var triggerExpression= mpnSubscription.getTriggerExpression();

      // Call the subscription enumerator
      subscriptionEnumerator(item, JSON.parse(notificationFormat), triggerExpression);
    }
}


//////////////// MPN Subscription Activation and Deactivation

function toggleMpnSubscription(item, errorHandler) {
    if (mpnDevice == null) {
        alert("No MPN device registered yet: please, press the Register button below");
        return false;
    }

    var mpnSubscription= null;

    // Check if item is subscribed or not
    var mpnSubscriptions= lsClient.getMpnSubscriptions();
    for (var i= 0; i < mpnSubscriptions.length; i++) {
        var subscriptionItem= mpnSubscriptions[i].getItemGroup();
        var triggerExpression= mpnSubscriptions[i].getTriggerExpression();
        if ((subscriptionItem == item) && (triggerExpression == null)) {
            mpnSubscription= mpnSubscriptions[i];
            break;
        }
    }

    if (mpnSubscription == null) {

        // Item is not subscribed, let's subscribe it
        console.log("Subscribing MPN for item " + item + "...");

        // Prepare the notification format
        var notificationFormat= buildNotificationFormat(
                item,
                "${stock_name} price changed!",
                "New price is ${last_price}");

        // Prepare the MPN subscription
        mpnSubscription= new Ls.MpnSubscription("MERGE", [item], ["stock_name", "last_price"]);
        mpnSubscription.setNotificationFormat(notificationFormat);
        mpnSubscription.setDataAdapter("QUOTE_ADAPTER");

        mpnSubscription.addListener({
            onSubscription: function() {
                console.log("MPN subscription for item " + item + " activated");
            },

            onSubscriptionError: function(code, message) {
                alert("MPN subscription to " + item + " failed: " + code + ", " + message);

                // Also call the error handler
                errorHandler(item, false);
            }
        });

        // Activate the MPN subscription
        lsClient.subscribeMpn(mpnSubscription, true);

    } else {

        // Item is subscribed, let's unsubscribe it
        console.log("Unsubscribing MPN for item " + item + "...");

        // Add a listener to the subscription, to show an alert
        // in case of unsubscription failure
        mpnSubscription.addListener({
            onUnsubscription: function() {
                console.log("MPN subscription for item " + item + " deactivated");
            },

            onUnsubscriptionError: function(code, message) {
                alert("MPN unsubscription from " + item + " failed: " + code + ", " + message);

                // Also call the error handler
                errorHandler(item, true);
            }
        });

        // Deactivate the MPN subscription
        lsClient.unsubscribeMpn(mpnSubscription);
    }

    return true;
};

function toggleMpnSubscriptionWithTrigger(item, dir, threshold, errorHandler) {
    if (mpnDevice == null) {
        alert("No MPN device registered yet");
        return false;
    }

    var mpnSubscription= null;

    // Check if item is subscribed or not
    var mpnSubscriptions= lsClient.getMpnSubscriptions();
    for (var i= 0; i < mpnSubscriptions.length; i++) {
        var subscriptionItem= mpnSubscriptions[i].getItemGroup();
        var triggerExpression= mpnSubscriptions[i].getTriggerExpression();
        if ((subscriptionItem == item) && (triggerExpression != null)) {

            // Extract the trigger direction and threshold
            // from the trigger expression
            var regex= /.* ([<>]) (\d+\.?\d*)/g;
            var matches= regex.exec(triggerExpression);
            if (matches != null) {
                var subscriptionDir= matches[1];
                var subscriptionThreshold= matches[2];

                if ((subscriptionDir == dir) && (subscriptionThreshold == threshold)) {
                    mpnSubscription= mpnSubscriptions[i];
                    break;
                }
            }
        }
    }

    if (mpnSubscription == null) {

        // Item is not subscribed, let's subscribe it
        var trigger= "Double.parseDouble(${last_price}) " + dir + " " + threshold;

        console.log("Subscribing MPN for item " + item + " with trigger: " + trigger);

        // Prepare the notification format
        var notificationFormat= buildNotificationFormat(
                item,
                "${stock_name} price is now " + dir + " " + threshold + "!",
                "New price is ${last_price}");

        // Prepare the MPN subscription
        mpnSubscription= new Ls.MpnSubscription("MERGE", [item], ["stock_name", "last_price"]);
        mpnSubscription.setNotificationFormat(notificationFormat);
        mpnSubscription.setTriggerExpression(trigger);
        mpnSubscription.setDataAdapter("QUOTE_ADAPTER");

        mpnSubscription.addListener({
            onSubscription: function() {
                console.log("MPN subscription with trigger for item " + item + " activated");
            },

            onSubscriptionError: function(code, message) {
                alert("MPN subscription to " + item + " failed: " + code + ", " + message);

                // Also call the error handler
                errorHandler(item, false);
            }
        });

        // Activate the MPN subscription
        lsClient.subscribeMpn(mpnSubscription, true);

    } else {

        // Item is subscribed, let's unsubscribe it
        console.log("Unsubscribing MPN for item " + item + " with trigger " + dir + " " + threshold + "...");

        // Add a listener to the subscription, to show an alert
        // in case of unsubscription failure
        mpnSubscription.addListener({
            onUnsubscription: function() {
                console.log("MPN subscription with trigger for item " + item + " deactivated");
            },

            onUnsubscriptionError: function(code, message) {
                alert("MPN unsubscription from " + item + " failed: " + code + ", " + message);

                // Also call the error handler
                errorHandler(item, true);
            }
        });

        // Deactivate the MPN subscription
        lsClient.unsubscribeMpn(mpnSubscription);
    }

    return true;
}

function buildNotificationFormat(item, title, body) {
  var notificationFormat= null;

  // Prepare the notification format appropriate for the platform
  if (window.safari != undefined) {

    // Notification format for Safari
    builder= new Ls.SafariMpnBuilder();
    builder.setTitle(title);
    builder.setBody(body);
    builder.setAction("View");
    builder.setUrlArguments([item]);

    notificationFormat= builder.build();

  } else {

    // Notification format for Chrome/Firefox
    builder= new Ls.FirebaseMpnBuilder();
    builder.setData({
      "item": item,
      "stockName": "${stock_name}",
      "lastPrice": "${last_price}"
    });

    // Note: if you set the title, body and icon properties,
    // you can't customize them later in the service worker (the
    // background message handler is not called if they are set),
    // see: firebase-messaging-sw.js

    notificationFormat= builder.build();
  }

  return notificationFormat;
}
