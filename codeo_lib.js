  var PersadoCodeOptimizely = (function () {

    // General function to get the target from our touchpoint API
  function getTouchpointTarget(json_in, target_in)
      {
        for (var i = 0; i < json_in.length; i++) { //iterate amongst all objects
            if (json_in[i]['name'] == target_in) {
              return {
                typeS: json_in[i]['type'],
                contentS: json_in[i]['content']
                };
            }
          }
      }

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

      // Read UserID from Optimzely
      function getOptimizelyUser() {
        var visitor = window.optimizely.get("visitor");
        return visitor.visitorId;
   }
  
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
      function create_optimizely_url(baseURL,personalization_names,campaignID,AdobeID,SnowplowName) {

        var variant_enter = getQueryVariable("variant_code"); // IF variant is specified on query parameter then use it to serve the copy [mainly for QA]
        var MID = "0"; // Marketing Cloud ID
        var snowID = "0"; // Snowplow cookie ID if present
        var userID = "0"; // UserID from Optimizely
        var pers_param = ""; // Personalization parameters string for URL construction
        
    try {
      userID = getOptimizelyUser(); // Get User ID from Optimizely
    } catch(errin) { }

        try {
          if ((AdobeID)&&(typeof Visitor !== "undefined")) {
            var visitor = Visitor.getInstance(AdobeID); // Get Marketing Cloud ID using the customer credential
            MID = visitor.getMarketingCloudVisitorID();
          }
        } catch(errin){ }

        try {
          cookieName = SnowplowName; // Get Snowplow cookie ID if available
          var matcher = new RegExp(cookieName + 'id\\.[a-f0-9]+=([^;]+);?');
          var match = document.cookie.match(matcher);
          if (match && match[1]) {
            snowID = match[1].split('.')[0];
          }
        } catch(errin){ }

        for (var i = 0; i < personalization_names.length; i++) { // Create the personalization parameter query->value string
            pers_param = pers_param + "&" + personalization_names[i] + "=" + getQueryVariable(personalization_names[i]);
        }

        if (variant_enter) { // Create the URL with all the parameters set. We use the Adobe ID as the ID that will determine the random shuffling and also pass all additional query parameters for fontsize, name and variant_code
          urls = baseURL + campaignID +"/variant.json?user_id="+userID+"&mid="+MID+"&snowID="+snowID+pers_param+"&variant_code="+variant_enter; 
        }
        else {
          urls = baseURL + campaignID +"/variant.json?user_id="+userID+"&mid="+MID+"&snowID="+snowID+pers_param;
        }
        
        return { // Return all the information
            MID: MID,
            snowID: snowID,
            urls: urls,
            userID: userID
        };
      }

    function run_optimizely(campaignID, elementArray,targetArray,linksArray,personalization_names,AdobeID,SnowplowName,AdobeAnalytics,evarnm,timeout_soft,timeout_hard,baseURL) { 

    try {  
      
      // Create the URL properly
      var opt_ret = create_optimizely_url(baseURL,personalization_names,campaignID,AdobeID,SnowplowName);

      // Assign all the IDs to variables
      var MID = opt_ret.MID;
      var snowID = opt_ret.snowID;
      var urls = opt_ret.urls;
      var userID = opt_ret.userID;

      if (isIE9OrBelow()===true) { // If IE<10 then just unhide the elements we want to touch [which were hidden using Adobe Target] in order to show control and then exit
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                document.querySelector(elementArray[i]).style.visibility = 'visible';
              }
            }, timeout_soft);
        } else {

          var request = new XMLHttpRequest(); // The actual call to get our content
          request.open('GET', urls, true);

          request.timeout = timeout_hard;  // Timeout in case our server doesn't respond

          request.onload = function() {
          if (request.status >= 200 && request.status < 400) {
              var ret = JSON.parse(request.responseText); // Parse the JSON
              var variant = ret.variant_code; // Get the variant id to use it for analytics

              window["optimizely"].push({ "type": "user", "attributes": { "PersadoVariant": variant} }); // Add the variant to Optimizely tracking

              for (var i = 0; i < elementArray.length; i++) { // Change the elements depending on type
                targJS = getTouchpointTarget(ret.touchpoints, targetArray[i]); // Get our touchpoint
                
                // Change the src of the image and then unhide
                if ((targJS.typeS.indexOf('jpeg') > -1)||(targJS.typeS.indexOf('jpg') > -1)||(targJS.typeS.indexOf('png') > -1)||(targJS.typeS.indexOf('gif') > -1)) {                     
                      
                      var nImage = new Image();
                      var oldImage = document.querySelector(elementArray[i]);
                      nImage.addEventListener('load', function() {  oldImage.style.visibility = 'visible'; },false);
                      nImage.src = targJS.contentS;
                      oldImage.src = nImage.src;
      
                  }
                else if (targJS.typeS == 'application/javascript') { // Run the JS code if javascript
                  eval(targJS.contentS);
                }
                else { // Change the html and then unhide
                  document.querySelector(elementArray[i]).innerHTML = targJS.contentS;
                  document.querySelector(elementArray[i]).style.visibility = 'visible';
                }
              }
            
              for (var j = 0; j < linksArray.length; j++) { // Add the IDs we want to all link elements we want to track
                add_links_to(linksArray[j],variant,userID,MID,snowID);
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
                document.querySelector(elementArray[i]).style.visibility = 'visible';
              }
            }, timeout_soft);
          }
          };

        request.onerror = function() {
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                document.querySelector(elementArray[i]).style.visibility = 'visible';
              }
            }, timeout_soft);
        };

        request.ontimeout = function() {
          window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                document.querySelector(elementArray[i]).style.visibility = 'visible';
              }
            }, timeout_soft);
      };

        request.send();
      }
           
      } catch(errout){ // In case of any error just unhide elements to show the control
        window.setTimeout(function() {
              for (var i = 0; i < elementArray.length; i++) {
                document.querySelector(elementArray[i]).style.visibility = 'visible';
              }
            }, timeout_soft);
      }
    }
 
  return { run_optimizely: run_optimizely };
  
  })();