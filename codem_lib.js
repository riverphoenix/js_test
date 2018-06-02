var PersadoCodeMaxymiser = (function () {

  // General function to get all the query->value parameters from the url
      function getQueryVariable(variable)
      {
             var query = window.location.search.substring(1);
             var vars = query.split("&");
             for (var i=0;i<vars.length;i++) {
                     var pair = vars[i].split("=");
                     if(pair[0] == variable){return pair[1];}
             }
             return(false);
      }

      // Generate an almost unique UID to use (chances of ducplicate very low)
      function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16); 
        });
        return uuid; 
      };
  
      // General function to identify IE9 and below (in order to avoid making AJAX calls that don't work with IE <10)
      function isIE9OrBelow()
    {
       return /MSIE\s/.test(navigator.userAgent) && parseFloat(navigator.appVersion.split("MSIE")[1]) < 10;
    }

        // Add all the user information (userID, MarketingCloudID and SnowplowID) to the link elements we want in order to track them with analytics
      function add_links_to(elem,variant,userID,MID,snowID)
      {
        var elements = document.querySelectorAll(elem);
        Array.prototype.forEach.call(elements, function(el, i){
          var _href = el.getAttribute('href');
          if (_href.indexOf('?') > -1) {
              el.setAttribute('href', _href + '&persado_variant='+variant+'&persado_userID='+userID+'&persado_MID='+MID+'&snow_ID='+snowID);
           }
          else {
              el.setAttribute('href', _href + '?persado_variant='+variant+'&persado_userID='+userID+'&persado_MID='+MID+'&snow_ID='+snowID);
           }
        });
      }

      // Get all the IDs we need to track properly and construct the Enterprise API URL we will call
      function create_maxymiser_url(baseURL,userID, personalization_names,campaignID,AdobeID,SnowplowName) {

        var variant_enter = getQueryVariable("variant_code"); // IF variant is specified on query parameter then use it to serve the copy [mainly for QA]
        var MID = "0"; // Marketing Cloud ID
        var snowID = "0"; // Snowplow cookie ID if present
        var pers_param = ""; // Personalization parameters string for URL construction
                    
        try {
          if ((AdobeID)&&(typeof Visitor !== "undefined")) {
            var visitor = Visitor.getInstance(AdobeID); // Get Marketing Cloud ID using the customer credential
            MID = visitor.getMarketingCloudVisitorID();
          }
        } catch(errin){
        }

        try {
          cookieName = SnowplowName; // Get Snowplow cookie ID if available
          var matcher = new RegExp(cookieName + 'id\\.[a-f0-9]+=([^;]+);?');
          var match = document.cookie.match(matcher);
          if (match && match[1]) {
            snowID = match[1].split('.')[0];
          }
        } catch(errin){
        }

        for (var i = 0; i < personalization_names.length; i++) { // Create the personalization parameter query->value string
            pers_param = pers_param + "&" + personalization_names[i] + "=" + getQueryVariable(personalization_names[i]);
        }

        if (variant_enter) { // Create the URL with all the parameters set. We use the Adobe ID as the ID that will determine the random shuffling and also pass all additional query parameters for fontsize, name and variant_code
          urls = baseURL + campaignID +"/all?user_id="+userID+"&mid="+MID+"&snowID="+snowID+pers_param+"&variant_code="+variant_enter; 
        }
        else {
          urls = baseURL + campaignID +"/all?user_id="+userID+"&mid="+MID+"&snowID="+snowID+pers_param;
        }
        
        return { // Return all the information
            MID: MID,
            snowID: snowID,
            urls: urls
        };
      }

    function run_maxymiser(campaignID,userID, elementArray,targetArray,linksArray,personalization_names,AdobeID,SnowplowName,AdobeAnalytics,evarnm,timeout_soft,timeout_hard,waitApply,baseURL) { 

    try {  
      
      // Create the URL properly
      var max_ret = create_maxymiser_url(baseURL,userID, personalization_names,campaignID,AdobeID,SnowplowName);

      // Assign all the IDs to variables
      var MID = max_ret.MID;
      var snowID = max_ret.snowID;
      var urls = max_ret.urls;
      
      if (isIE9OrBelow()===true) { // If IE<10 then just unhide the elements we want to touch [which were hidden using Adobe Target] in order to show control and then exit
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                //document.querySelector(elementArray[i]).style.visibility = 'visible';
                dom.changeStyle(elementArray[i], 'visibility: visible');
              }
            }, timeout_soft);
        } else {

          var request = new XMLHttpRequest(); // The actual call to get our content
          request.open('GET', urls, true);

          request.timeout = timeout_hard;  // Timeout in case our server doesn't respond

          request.onload = function() {
          if (request.status >= 200 && request.status < 400) {
              var ret = JSON.parse(request.responseText); // Parse the JSON
              var variant = ret.variant; // Get the variant id to use it for analytics

              for (var i = 0; i < elementArray.length; i++) { // Change the elements depending on type
                // Change the src of the image and then unhide
                if ((targetArray[i].indexOf('.jpeg') > -1)||(targetArray[i].indexOf('.jpg') > -1)||(targetArray[i].indexOf('.png') > -1)||(targetArray[i].indexOf('.gif') > -1)) {
                      
                      var nImage = new Image();
                      var oldImage = document.querySelector(elementArray[i]);
                      nImage.addEventListener('load', function() {  
                        window.setTimeout(function() { oldImage.style.visibility = 'visible'; }, waitApply);
                      },false);
                      nImage.src = ret[targetArray[i]];
                      oldImage.src = nImage.src;
      
                  }
                else if (targetArray[i] == '.js') { // Run the JS code if javascript
                  window.setTimeout(function() {
                    eval(ret[targetArray[i]]);
                   }, waitApply);
                }
                else { // Change the html and then unhide
                  document.querySelector(elementArray[i]).innerHTML = ret[targetArray[i]];
                  window.setTimeout(function() {
                  document.querySelector(elementArray[i]).style.visibility = 'visible';
                  //dom.changeStyle(elementArray[i], 'visibility: visible');
                }, waitApply);
                }
              }
            
              for (var i = 0; i < linksArray.length; i++) { // Add the IDs we want to all link elements we want to track
                add_links_to(linksArray[i],variant,userID,MID,snowID);
                }

              try {
                if (typeof s_gi !== "undefined") { 
                  window.setTimeout(function(){ // This is used for Adobe Analytics. Save our variant ID on an eVar so we can track in in analytics across all pages. We do a Timeout in order to ensure the analytics js has loaded before our call
                    var s_account=AdobeAnalytics;
                    var s=s_gi(s_account);
                    s[evarnm] = variant;
                    s.tl(true,'o',variant);
                  },timeout_soft); }
              } catch(errout) { }

          } else {
              window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                //document.querySelector(elementArray[i]).style.visibility = 'visible';
                dom.changeStyle(elementArray[i], 'visibility: visible');
              }
            }, timeout_soft);
          }
          };

        request.onerror = function() {
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                //document.querySelector(elementArray[i]).style.visibility = 'visible';
                dom.changeStyle(elementArray[i], 'visibility: visible');
              }
            }, timeout_soft);
        };

        request.ontimeout = function() {
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                //document.querySelector(elementArray[i]).style.visibility = 'visible';
                dom.changeStyle(elementArray[i], 'visibility: visible');
              }
            }, timeout_soft);
      };

        request.send();
      }
           
      } catch(errout){ // In case of any error just unhide elements to show the control
        window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                //document.querySelector(elementArray[i]).style.visibility = 'visible';
                dom.changeStyle(elementArray[i], 'visibility: visible');
              }
            }, timeout_soft);
      }
    }
 
  return { run_maxymiser: run_maxymiser, generateUUID: generateUUID }
  
  })();