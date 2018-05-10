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
  
  // Adobe specific function to get from the mbox cookie the user_id that we use to identify the user in order to serve copy
  function getMboxCookie() {
    var value = "; " + document.cookie;
    var parts = value.split("; mbox=");
    if (parts.length >= 2) {
      parts = parts[1].split("|");
      for (var i = 0; i < parts.length; i++) {
          if (parts[i].startsWith("PC")) {
            return parts[i].substr(3,parts[i].indexOf("#", 4)-3);
          }
        }
    }
  }

  // General function to identify IE9 and below (in order to avoid making AJAX calls that don't work with IE <10)
  var isIE9OrBelow = function()
{
   return /MSIE\s/.test(navigator.userAgent) && parseFloat(navigator.appVersion.split("MSIE")[1]) < 10;
}

    // Add all the user information (userID, MarketingCloudID and SnowplowID) to the link elements we want in order to track them with analytics
  function add_links_to(elem,variant,userID,MID,snowID)
  { 
  $(elem).each(function() {
     var $this = $(this);       
     var _href = $this.attr("href");

     if (_href.indexOf('?') > -1) {
        $this.attr("href", _href + '&persado_variant='+variant+'&persado_userID='+userID+'&persado_MID='+MID+'&snow_ID='+snowID);
     }
     else {
        $this.attr("href", _href + '?persado_variant='+variant+'&persado_userID='+userID+'&persado_MID='+MID+'&snow_ID='+snowID);
     }
  });

  }

  // Get all the IDs we need to track properly and construct the Enterprise API URL we will call
  function create_adobe_url(baseURL,personalization_names,campaignID,AdobeID,SnowplowName) {

    var variant_enter = getQueryVariable("variant_code"); // IF variant is specified on query parameter then use it to serve the copy [mainly for QA]
    var MID = "0"; // Marketing Cloud ID
    var snowID = "0"; // Snowplow cookie ID if present
    var userID = "0"; // Adobe ID from mbox cookie
    var pers_param = ""; // Personalization parameters string for URL construction
    
    try {
        userID = getMboxCookie(); // Get Adobe ID from mbox cookie
    } catch(errin){
    }
        
    try {
      if (AdobeID) {
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
        userID: userID,
        MID: MID,
        snowID: snowID,
        urls: urls
    };
  }

  // Main function that will be called every time we have a new campaign
  function run_adobe(campaignID,elementArray,targetArray,linksArray='',personalization_names='',AdobeID='',SnowplowName='_sp_',AdobeAnalytics='',evarnm='eVar4',timeout_soft=1000,timeout_hard=5000,baseURL='http://roninds.ie.persado.com/one/api/v1/') {

try {

  // Create the URL properly
  var adobe_ret = create_adobe_url(baseURL,personalization_names,campaignID,AdobeID,SnowplowName);

  // Assign all the IDs to variables
  var MID = adobe_ret.MID;
  var snowID = adobe_ret.snowID;
  var urls = adobe_ret.urls;
  var userID = adobe_ret.userID;

  if (isIE9OrBelow===true) { // If IE<10 then just unhide the elements we want to touch [which were hidden using Adobe Target] in order to show control and then exit
      window.setTimeout(function() {
          for (var i = 0; i < elementArray.length; i++) {
            $(elementArray[i]).css("visibility", "visible");
          }
        }, timeout_soft);

    } else {

      $.ajax({ // Make AJAX call to our Enterprise API and get all the touchpoints we want to change
    url: urls,
      success: function( response ) {
      var ret = $.parseJSON(response); // Parse the JSON
      var variant = ret["variant"]; // Get the variant id to use it for analytics

      for (var i = 0; i < elementArray.length; i++) { // Change the elements depending on type
        // Change the src of the image and then unhide
        if ((targetArray[i].indexOf('.jpeg') > -1)||(targetArray[i].indexOf('.jpg') > -1)||(targetArray[i].indexOf('.png') > -1)||(targetArray[i].indexOf('.gif') > -1)) {
              $(elementArray[i]).load(function() {
                $(this).css("visibility", "visible");
              }).attr("src", ret[targetArray[i]]);
          }
        else if (targetArray[i] == '.js') { // Run the JS code if javascript
          eval(ret[targetArray[i]]);
        }
        else { // Change the html and then unhide
          $(elementArray[i]).html(ret[targetArray[i]]);
          $(elementArray[i]).css("visibility", "visible");
        }
      }
    
      for (var i = 0; i < linksArray.length; i++) { // Add the IDs we want to all link elements we want to track
        add_links_to(linksArray[i],variant,userID,MID,snowID);
        }

      try {
        window.setTimeout(function(){ // This is used for Adobe Analytics. Save our variant ID on an eVar so we can track in in analytics across all pages. We do a Timeout in order to ensure the analytics js has loaded before our call
          var s_account=AdobeAnalytics;
          var s=s_gi(s_account);
          s[evarnm] = variant;
          s.tl(true,'o',variant);
        },timeout_soft);
      } catch(errout) { }
      },
      error: function(){ // In case of any error just unhide elements to show the control
        window.setTimeout(function() {
          for (var i = 0; i < elementArray.length; i++) {
            $(elementArray[i]).css("visibility", "visible");
          }
        }, timeout_soft);
      },
      timeout: timeout_hard
    });
  }
       
  } catch(errout){ // In case of any error just unhide elements to show the control
    window.setTimeout(function() {
          for (var i = 0; i < elementArray.length; i++) {
            $(elementArray[i]).css("visibility", "visible");
          }
        }, timeout_soft);
  }
}