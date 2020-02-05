console.log("[firebase-messaging-sw.js] Service worker starting up...");

// NB keep the imports in synch with index.html
importScripts("env.js");
importScripts("https://www.gstatic.com/firebasejs/7.7.0/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/7.7.0/firebase-messaging.js");

var config = {
        apiKey: "AIzaSyCzGpbPGMX03_3XbhHG54UZ4NGGAPgn18o",
        authDomain: "mpn-test-project-1.firebaseapp.com",
        databaseURL: "https://mpn-test-project-1.firebaseio.com",
        projectId: "mpn-test-project-1",
        storageBucket: "mpn-test-project-1.appspot.com",
        messagingSenderId: "484272051642",
        appId: "1:484272051642:web:ef6a71f5e70bb14678f983"
};

firebase.initializeApp(config);

const messaging= firebase.messaging();

// Background notification event handler
// Note that this handler is not called if the notification has title and
// body properties set, see: github.com/firebase/quickstart-js/issues/71
messaging.setBackgroundMessageHandler(function(payload) {
  console.log("[firebase-messaging-sw.js] Received background MPN", payload);

  // Extract the data
  const item= payload.data.item;
  const stockName= payload.data.stockName;
  const lastPrice= payload.data.lastPrice;

  // Prepare the notification title
  const title= stockName + " price changed!";

  // Prepare the notification options, including the item ID in the "data"
  // field: it is used in the click handler to open the item details window
  const options= {
    "body": "New price is " + lastPrice,
    "icon": "/icon-512.png",
    "data": {
        "item": item
    }
  };

  // Show the notification
  return self.registration.showNotification(title, options);
});

// Notification click event handler
// We need the item ID to point to the appropriate item detail page,
// and it can be passed only by the notification options (see above)
messaging.onNotificationClick= function(event) {
  console.log("[firebase-messaging-sw.js] Clicked on MPN");

  // Close the notification
  event.notification.close();

  // Prepare the item details URL
  const url= POPUP_URL + event.notification.data.item;

  // Open a window with item details
  clients.openWindow(url);
};

console.log("[firebase-messaging-sw.js] Service worker started");
