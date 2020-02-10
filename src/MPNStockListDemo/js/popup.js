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


//////////////// Extract Settings from the Querystring

function LS_extractParam(name) {
  var pattern = new RegExp("[?&]" + name + "=[^&]*");
  var result = pattern.exec(location.search);
  if (result && result[0]) {
    var prefLen = name.length + 2;
    return unescape(result[0].substring(prefLen));
  } else {
    return null;
  }
}

var itemName = LS_extractParam("item");


//////////////// Detail Table Management

var detailsSchema = ["last_price", "time", "pct_change", "bid_quantity", "bid", "ask", "ask_quantity", "min", "max", "ref_price", "open_price", "stock_name", "item_status"];
var redColor = "#db1819";
var greenColor = "#15820a";
var lsClient = null;

function main() {

    var protocolToUse= document.location.protocol != "file:" ? document.location.protocol : "http:";
    var portToUse= document.location.protocol == "https:" ? LS_HTTPS_PORT : LS_HTTP_PORT;
    // in accordance with the port configuration in the factory lightstreamer_conf.xml
    // (although the https port is not open by the factory lightstreamer_conf.xml)
    lsClient= new Ls.LightstreamerClient(protocolToUse + "//" + LS_HOST + ":" + portToUse, "DEMO");

    lsClient.addListener(new Ls.StatusWidget("left", "0px", true));
    
    //Grid conf
    var stockData = new Ls.StaticGrid("details",true);
    var cellList = stockData.extractFieldList();
    stockData.addListener({
        onVisualUpdate: function(key,info) {
            if (info == null) {
                return;
            }

            info.setHotTime(0);

            if (info.getChangedFieldValue("item_status") == "inactive") {
                //possible if testing the JMS version of the Data Adapter
                //if it happens we want all the cells to be highlighted in grey;
                //first we force the highlighting on every cell
                forceHighlight(info,true,cellList);

                info.setAttribute("#808080","#808080","color");

            } else {

                if ((info.getChangedFieldValue("item_status") == "active" && stockData.getValue(key,"item_status") == "inactive")) {
                    //possible if testing the JMS version of the Data Adapter
                    //so we force again the highlighting on every cell to restore
                    //the "active" color
                    forceHighlight(info,true,cellList);

                    info.setAttribute("#000000","#000000","color");
                    info.setCellAttribute("stock_name","#000080","#000080","color");
                }

                var lastPrice = info.getChangedFieldValue("last_price");
                if (lastPrice !== null) {
                    var prevPrice = stockData.getValue(key,"last_price");
                    if (!prevPrice || lastPrice > prevPrice) {
                        info.setCellAttribute("last_price",greenColor,greenColor,"color");
                        info.setCellAttribute("last_price","bold","bold","fontWeight");
                    } else {
                        info.setCellAttribute("last_price",redColor,redColor,"color");
                        info.setCellAttribute("last_price","bold","bold","fontWeight");
                    }
                }

                var newChng = info.getChangedFieldValue("pct_change");
                if (newChng !== null) {
                    var chngCol = (newChng.charAt(0) == '-') ? redColor : greenColor;
                    info.setCellAttribute("pct_change",chngCol,chngCol,"color");
                    info.setCellAttribute("pct_change","bold","bold","fontWeight");

                    if (newChng > 0) {
                        newChng = "+" + newChng;
                    }
                    newChng += "%";
                    info.setCellValue("pct_change", newChng);
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

    //Chart conf
    var stockChart = new Ls.Chart("chartstock", true);
    stockChart.configureArea("lsgbox",213,270,0,50);
    stockChart.setXAxis("time", function(stringDate) {
        stringDate = new String(stringDate);
        i1 = stringDate.indexOf(':');
        i2= stringDate.lastIndexOf(':');
        return(stringDate.substring(0,i1)*3600+stringDate.substring(i1+1,i2)*60+stringDate.substring(i2+1,stringDate.length)*1);
    });
    stockChart.addYAxis(["last_price"], function(yValue) {
        var y = new String(yValue);
        if (y.indexOf(",") > -1 ) {
            var y=y.replace(",",".");
        }
        return new Number(y);
    });

    stockChart.addListener(new Ls.SimpleChartListener());
    stockChart.addListener({
        onNewLine: function(key,newChartLine,nowX,nowY) {
            newChartLine.setStyle("blue","blue",1,1);
        }
    });

    //Subscription conf
    var stockSubscription = new Ls.Subscription("MERGE",itemName,stockData.extractFieldList());
    stockSubscription.setDataAdapter("QUOTE_ADAPTER");
    stockSubscription.setRequestedSnapshot("yes");
    stockSubscription.addListener(stockData);
    stockSubscription.addListener(stockChart);
    lsClient.subscribe(stockSubscription);

    // Register the MPN device
    getDeviceToken()
    .then(function(token) {
        return doRegister(token, function(item, notificationFormat, triggerExpression) {
            
            // Subscription enumerator: look for subscriptions
            // for this item and with a trigger expression
            if ((item == itemName) && (triggerExpression != null)) {
                
                // Extract the trigger direction and threshold
                // from the trigger expression
                var regex= /.* ([<>]) (\d+\.?\d*)/g;
                var matches= regex.exec(triggerExpression);
                if (matches != null) {
                    var dir= matches[1];
                    var threshold= matches[2];
                    
                    if (dir == ">") {
                        var field= document.getElementById("high_thr");
                        var button= document.getElementById("high_thr_button");
                        
                        field.value= threshold;
                        field.disabled= true;
                        button.value= "Remove";
                        
                    } else if (dir == "<") {
                        var field= document.getElementById("low_thr");
                        var button= document.getElementById("low_thr_button");
                        
                        field.value= threshold;
                        field.disabled= true;
                        button.value= "Remove";
                        
                    } else
                        console.log("Unknown threshold direction on MPN subscription for " + item + ": " + triggerExpression);
                    
                } else
                    console.log("Unknown trigger on MPN subscription for " + item + ": " + triggerExpression);
            }
        });
    });
    
    lsClient.connect();
}

//////////////// Threshold Management

function toggleHighThreshold() {

    var field= document.getElementById("high_thr");
    var button= document.getElementById("high_thr_button");

    if (button.value == "Add") {

      // Check it is an appropriate number
      var fieldValue= parseFloat(field.value);
      if (isNaN(fieldValue) || (fieldValue <= 0.0)) {
        alert("Specify a positive number to add a high threshold MPN");
        return;
      }

      // Change state of field and button
      field.disabled= true;
      button.value= "Remove";

      // Add the MPN subscription
      toggleMpnSubscriptionWithTrigger(itemName, ">", field.value, function(item, subscribed) {
        field.disabled= false;
        button.value= "Add";
      });

    } else if (button.value == "Remove") {

      // Change state of field and button
      field.disabled= false;
      button.value= "Add";

      // Remove the MPN subscription
      toggleMpnSubscriptionWithTrigger(itemName, ">", field.value, function(item, subscribed) {
        field.disabled= true;
        button.value= "Remove";
      });

    } else {
      console.log("Alien value in the High Threshold submit button!");
    }
}

function toggleLowThreshold() {

    var field= document.getElementById("low_thr");
    var button= document.getElementById("low_thr_button");

    if (button.value == "Add") {

      // Check it is an appropriate number
      var fieldValue= parseFloat(field.value);
      if (isNaN(fieldValue) || (fieldValue <= 0.0)) {
        alert("Specify a positive number to add a low threshold MPN");
        return;
      }

      // Change state of field and button
      field.disabled= true;
      button.value= "Remove";

      // Add the MPN subscription
      toggleMpnSubscriptionWithTrigger(itemName, "<", field.value, function(item, subscribed) {
        field.disabled= false;
        button.value= "Add";
      });

    } else if (button.value == "Remove") {

      // Change state of field and button
      field.disabled= false;
      button.value= "Add";

      // Remove the MPN subscription
      toggleMpnSubscriptionWithTrigger(itemName, "<", field.value, function(item, subscribed) {
        field.disabled= true;
        button.value= "Remove";
      });

    } else {
      console.log("Alien value in the Low Threshold submit button!");
    }
}

main();
