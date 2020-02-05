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


var redColor = "#f8b87a";
var greenColor = "lightgreen";
var backC = "transparent";
var hotTxtCol = "#000000";
var fieldsList = ["last_price", "time", "pct_change", "bid_quantity", "bid", "ask", "ask_quantity", "min", "max", "ref_price", "open_price", "stock_name", "item_status"];
var itemList1 = ["item1", "item2", "item3", "item4", "item5", "item6", "item7", "item8", "item9", "item10", "item11", "item12", "item13", "item14", "item15"];
var itemList2 = ["item16", "item17", "item18", "item19", "item20", "item21", "item22", "item23", "item24", "item25", "item26", "item27", "item28", "item29", "item30"];
var imgUp = "images/quotes_up.gif";
var imgDown = "images/quotes_down.gif";
var doFade = location.search.indexOf("fade=ON") > -1;
var unique = Math.floor(Math.random() * 1000);
var lsClient;
var pageNumber = 1;
var subsItemList1;
var subsItemList2;
var styleH = "lshot";
var styleC = "lscold";
var dynaGrid = null;


//////////////// Grid Sort Management

var initialSort = "stock_name";
var direction = false; // true = decreasing; false = increasing; null = no sort

function changeSort(sortOn) {
  var sortedBy = dynaGrid.getSortField();
  if (sortOn == sortedBy) {
    if (direction == false) {
      direction = true;
      document.getElementById("img_" + sortOn).src = "images/down.gif";
    } else if (direction == true) {
      direction = null;
      document.getElementById("img_" + sortOn).src = "images/spacer.gif";
      document.getElementById("col_" + sortOn + "_s").className = "tabletitle";
      document.getElementById("col_" + sortOn).className = "tabletitle";
    } else {
      direction = false;
      document.getElementById("img_" + sortOn).src = "images/up.gif";
    }
  } else {
    direction = false;
    if (sortedBy != null) {
      document.getElementById("img_" + sortedBy).src = "images/spacer.gif";
      document.getElementById("col_" + sortedBy + "_s").className = "tabletitle";
      document.getElementById("col_" + sortedBy).className = "tabletitle";
    }
    document.getElementById("img_" + sortOn).src = "images/up.gif";
    document.getElementById("col_" + sortOn + "_s").className = "tableTitleSorted";
    document.getElementById("col_" + sortOn).className = "tableTitleSorted";
  }

  if (direction == null) {
    dynaGrid.setSort(null);
  } else {
    if (sortOn == "time" || sortOn == "stock_name") {
      dynaGrid.setSort(sortOn, direction);
    } else {
      dynaGrid.setSort(sortOn, direction, true, false);
    }
  }
}

function main() {

    var protocolToUse= document.location.protocol != "file:" ? document.location.protocol : "http:";
    var portToUse= document.location.protocol == "https:" ? LS_HTTPS_PORT : LS_HTTP_PORT;
    // in accordance with the port configuration in the factory lightstreamer_conf.xml
    // (although the https port is not open by the factory lightstreamer_conf.xml)
    lsClient= new Ls.LightstreamerClient(protocolToUse + "//" + LS_HOST + ":" + portToUse, "DEMO");

    lsClient.addListener(new Ls.StatusWidget("left", "0px", true));

    dynaGrid = new Ls.DynaGrid("stocks",true);
    var cellList = dynaGrid.extractFieldList()

    // dynaGrid.setSort("stock_name");
    changeSort("stock_name");
    dynaGrid.setNodeTypes(["div","span","img","a","input"]);
    dynaGrid.setAutoCleanBehavior(true, false);
    dynaGrid.addListener({
        onVisualUpdate: function(key,info,domNode) {
            if (info == null) {
                return;
            }

            //general style and effects
            info.setHotTime(400);
            info.setStyle(styleH,styleC);
            if (info.getChangedFieldValue("stock_name") != null) {
                dynaGrid.updateRow(key,{click:"openPopup('"+key+"');return false;"});

                // Get the MPN notify check box from the DOM: we can't assign its onClick
                // event as done above because we already use the data-field for its checked
                // state, so we must scavenge the DOM node
                var cellNode= domNode.children[13];
                var checkboxNode= cellNode.firstChild;
                checkboxNode.onclick= function() {
                    return toggleMpnSubscription(key, function(item, subscribed) {

                        // Error handler: reset the check button to its previous state
                        dynaGrid.updateRow(item, { "notify": subscribed });
                    });
                }

            } else if (doFade) {
                info.setHotToColdTime(300);
            }

            if (info.getChangedFieldValue("item_status") == "inactive") {
                //possible if testing the JMS version of the Data Adapter
                //if it happens we want all the cells to be highlighted in grey;
                //first we force the highlighting on every cell
                forceHighlight(info,true,cellList);

                info.setAttribute("#808080","#808080","color");

            } else {

                if ((info.getChangedFieldValue("item_status") == "active" && dynaGrid.getValue(key,"item_status") == "inactive")) {
                    //possible if testing the JMS version of the Data Adapter
                    //so we force again the highlighting on every cell to restore
                    //the "active" color
                    forceHighlight(info,true,cellList);

                    info.setAttribute("#000000","#000000","color");
                    info.setCellAttribute("stock_name","#000080","#000080","color");
                }

                // illumination color
                // choose the backgroundColor
                var lastPrice = info.getChangedFieldValue("last_price");
                if (lastPrice !== null) {
                    var prevPrice = dynaGrid.getValue(key,"last_price");
                    if (!prevPrice || lastPrice > prevPrice) {
                        info.setAttribute(greenColor,null,"backgroundColor");
                    } else {
                        info.setAttribute(redColor,null,"backgroundColor");
                    }
                } else {
                    info.setAttribute(greenColor,null,"backgroundColor");
                }

                //put arrow and handle change style
                var pctChange = info.getChangedFieldValue("pct_change");
                if (pctChange !== null) {
                    pctChange = formatDecimal(pctChange,2,true)+"%";
                    hotTxtCol = (pctChange.charAt(0) == '-') ? "#dd0000" : "#009900";
                    if (pctChange.indexOf("-") > -1) {
                        info.setCellValue("arrow",imgDown);
                        info.setCellAttribute("arrow",null,null,"backgroundColor");

                        info.setCellAttribute("pct_change","black",hotTxtCol,"color");
                        info.setCellValue("pct_change",pctChange);
                    } else {
                        info.setCellValue("arrow",imgUp);
                        info.setCellAttribute("arrow",null,null,"backgroundColor");

                        info.setCellAttribute("pct_change","black",hotTxtCol,"color");
                        info.setCellValue("pct_change","+"+pctChange);

                    }
                    info.setCellAttribute("pct_change","bold","bold","fontWeight");
                }

                // format decimal fields.
                formatDecimalField(info, "last_price");
                formatDecimalField(info, "bid");
                formatDecimalField(info, "ask");
                formatDecimalField(info, "min");
                formatDecimalField(info, "max");
                formatDecimalField(info, "ref_price");
                formatDecimalField(info, "open_price");

                // format the timestamp
                var time = info.getChangedFieldValue("time");
                if (time != null) {
                    info.setCellValue("time",formatTime(time));
                }

            }

        }
    });

    subsItemList1 = new Ls.Subscription("MERGE",itemList1,fieldsList);
    subsItemList1.addListener(dynaGrid);
    subsItemList1.setDataAdapter("QUOTE_ADAPTER");
    subsItemList1.setRequestedSnapshot("yes");
    subsItemList1.setRequestedMaxFrequency(1);
    subsItemList1.addListener({
        onSubscription: function() {
            console.log("Subscription completed for item list of page 1");

            // Also update the Notify flag, based on MPN subscriptions
            enumerateMpnSubscriptions(updateNotifyFlag);
        }
    });

    subsItemList2 = new Ls.Subscription("MERGE",itemList2,fieldsList);
    subsItemList2.addListener(dynaGrid);
    subsItemList2.setDataAdapter("QUOTE_ADAPTER");
    subsItemList2.setRequestedSnapshot("yes");
    subsItemList2.setRequestedMaxFrequency(1);
    subsItemList2.addListener({
        onSubscription: function() {
            console.log("Subscription completed for item list of page 2");

            // Also update the Notify flag, based on MPN subscriptions
            enumerateMpnSubscriptions(updateNotifyFlag);
        }
    });

    lsClient.subscribe(subsItemList1);
    //lsClient.subscribe(subsItemList2); //we may also subscribe both lists simultaneously

    //enable switch
    document.getElementById("switchP2").style.display = "";
    
    lsClient.connect();
}

//////////////// MPN Device Registration

function registerForMpn() {
    document.getElementById("mpnButton").className = "discMpnButtonDisabled";
    document.getElementById("mpnBox").className = "discMpnBoxOk";
    document.getElementById("mpnBox").innerHTML = "Registering...";
    
    // Register the MPN device
    registerMpnDevice(updateNotifyFlag)
    .then(() => {
        document.getElementById("mpnBox").className = "discMpnBoxOk";
        document.getElementById("mpnBox").innerHTML = "You can now register individual stock prices by flagging the Notify checkboxes above.";
    }, (error) => {
        document.getElementById("mpnBox").className = "discMpnBoxError";
        document.getElementById("mpnBox").innerHTML = error;
    });
}


//////////////// Stock Details Popup Management

function openPopup(item) {
  var wdt = window.open("popup.html?item=" + item, "SLDpopup_" + unique + "_" + item, "width=575,height=320,history=0,resizable,status=1,menubar=1");
  wdt.focus();
  return false;
}


//////////////// Stock Grid Management

function changePage(groupNumber) {
  if (groupNumber == 1) {
    pageNumber = 1;
    document.getElementById("switchP1").style.display = "none";
    document.getElementById("switchP2").style.display = "";
    lsClient.unsubscribe(subsItemList2);
    lsClient.subscribe(subsItemList1);
  } else if (groupNumber == 2) {
    pageNumber = 2;
    document.getElementById("switchP1").style.display = "";
    document.getElementById("switchP2").style.display = "none";
    lsClient.unsubscribe(subsItemList1);
    lsClient.subscribe(subsItemList2);
  }
}


//////////////// Notification Flag Update

function updateNotifyFlag(item, notificationFormat, triggerExpression) {

  // Check if the item is part of the current page
  switch (pageNumber) {
    case 1: if (!itemList1.includes(item))
      return;
    break;

    case 2: if (!itemList2.includes(item))
      return;
    break;
  }

  // Check if the item has a trigger expression, in that case
  // it is handled in the popup
  if (triggerExpression != null)
    return;

  // Set the "Notify" flag for the current item
  dynaGrid.updateRow(item, { "notify": true });
}

main();
if (!("Notification" in window)) {
    alert("This browser does not support desktop notification");
}
else if (Notification.permission === "granted") {
    registerForMpn();
    document.getElementById("mpnButton").className = "discMpnButtonDisabled";
}
else if (Notification.permission === "denied") {
    document.getElementById("mpnButton").className = "discMpnButtonDisabled";
    document.getElementById("mpnBox").className = "discMpnBoxError";
    document.getElementById("mpnBox").innerHTML = "You have disabled the notifications. Please, enable them and reload the page.";
}