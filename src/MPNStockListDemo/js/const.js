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

// Service identifiers from Lightstreamer google_notifier_conf.xml and apple_notifier_conf.xm
const FIREBASE_APP_ID = "com.lightstreamer.demo.android.fcm";
const APPLE_APP_ID = "web.com.lightstreamer.demo";

// Project parameters for Safari
const APPLE_WEB_SERVICE_URL= "https://" + LS_HOST + ":" + LS_HTTPS_PORT + "/apple_web_service";
const APPLE_WEBSITE_PUSH_ID= "web.com.lightstreamer.demo";
const APPLE_USER_INFO= { };

// Project parameters for Chrome/Firefox
const FIREBASE_VAPID_KEY = "BGxHjswNaj-9T1cur3TJuyUCgL9yudMZDDcEV43zpSxnZDvS7KbqnwAGSRz9zWbqySTa0Oij-i29xxRWEF0WtA8";
const FIREBASE_CONFIG = {
        apiKey: "AIzaSyCzGpbPGMX03_3XbhHG54UZ4NGGAPgn18o",
        authDomain: "mpn-test-project-1.firebaseapp.com",
        databaseURL: "https://mpn-test-project-1.firebaseio.com",
        projectId: "mpn-test-project-1",
        storageBucket: "mpn-test-project-1.appspot.com",
        messagingSenderId: "484272051642",
        appId: "1:484272051642:web:ef6a71f5e70bb14678f983"
};
