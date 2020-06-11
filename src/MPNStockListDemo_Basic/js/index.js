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


var stocksGrid= null;
var lsClient= null;

function main() {

    var protocolToUse= document.location.protocol != "file:" ? document.location.protocol : "http:";
    var portToUse= document.location.protocol == "https:" ? LS_HTTPS_PORT : LS_HTTP_PORT;
    // in accordance with the port configuration in the factory lightstreamer_conf.xml
    // (although the https port is not open by the factory lightstreamer_conf.xml)
    lsClient= new Ls.LightstreamerClient(protocolToUse + "//" + LS_HOST + ":" + portToUse, "DEMO");

    lsClient.addListener(new Ls.StatusWidget("left", "0px", true));

    stocksGrid= new Ls.StaticGrid("stocks",true);
    stocksGrid.setAutoCleanBehavior(true,false);
    stocksGrid.addListener({
        onVisualUpdate: function(key,info) {
            if (info == null) {
                //cleaning
                return;
            }
            var cold= (key.substring(4) % 2 == 1) ? "#efefef" : "#dedede";
            info.setAttribute("yellow", cold, "backgroundColor");
        }
    });

    var stockSubscription= new Ls.Subscription("MERGE", stocksGrid.extractItemList(), stocksGrid.extractFieldList());
    stockSubscription.addListener(stocksGrid);
    stockSubscription.setDataAdapter("QUOTE_ADAPTER");
    stockSubscription.setRequestedSnapshot("yes");
    lsClient.subscribe(stockSubscription);

    // Prepare the MPN subscription error handler
    window.mpnErrorHandler= function(item, subscribed) {
        stocksGrid.updateRow(item, { "notify": subscribed });
    };
    
    lsClient.connect();
    
    if (!("Notification" in window)) {
        document.getElementById("mpnButton").className = "discMpnButtonDisabled";
        document.getElementById("mpnBox").className = "discMpnBoxError";
        document.getElementById("mpnBox").innerHTML = "This browser does not support desktop notification";
    }
    else if (Notification.permission === "denied") {
        document.getElementById("mpnButton").className = "discMpnButtonDisabled";
        document.getElementById("mpnBox").className = "discMpnBoxError";
        document.getElementById("mpnBox").innerHTML = "You have disabled the notifications. Please, enable them and reload the page.";
    }
    else if (Notification.permission === "granted") {
        register();
        document.getElementById("mpnButton").className = "discMpnButtonDisabled";
    }
}


//////////////// MPN Device Registration

function register() {
    document.getElementById("mpnButton").className = "discMpnButtonDisabled";
    document.getElementById("mpnBox").className = "discMpnBoxOk";
    document.getElementById("mpnBox").innerHTML = "Registering...";
    
    getDeviceToken()
    .then(function(token) {
        return doRegister(token, subscriptionEnumerator);
    })
    .then(function() {
        document.getElementById("mpnBox").className = "discMpnBoxOk";
        document.getElementById("mpnBox").innerHTML = "You can now register individual stock prices by flagging the Notify checkboxes above.";
    })
    .catch(function(error) {
        document.getElementById("mpnButton").className = "discMpnButton";
        document.getElementById("mpnBox").className = "discMpnBoxError";
        document.getElementById("mpnBox").innerHTML = error;
    });
}

function subscriptionEnumerator(item, notificationFormat, triggerExpression) {
    // Subscription enumerator: set the check button,
    // but only for subscriptions with no trigger
    // (the others are handled in the standard demo)
    if (triggerExpression == null)
        stocksGrid.updateRow(item, { "notify": true });
}

main();
