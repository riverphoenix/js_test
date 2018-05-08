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

  function create_adobe_url(baseURL,campaignID,AdobeID,SnowplowName) {
    var variant_enter = getQueryVariable("variant_code");
    var MID = "0";
    var snowID = "0";

    try {
      if (AdobeID) {
        var visitor = Visitor.getInstance(AdobeID);
        MID = visitor.getMarketingCloudVisitorID(); 
      }
    } catch(errin){
    }

    try {
      cookieName = SnowplowName;
      var matcher = new RegExp(cookieName + 'id\\.[a-f0-9]+=([^;]+);?');
      var match = document.cookie.match(matcher);
      if (match && match[1]) {
        snowID = match[1].split('.')[0];
      }
    } catch(errin){
    }

    if (variant_enter) { 
      urls = baseURL + campaignID +"/all?user_id=${user.pcId}&mid="+MID+"&snowID="+snowID+"&name="+getQueryVariable("name")+"&fontsize="+getQueryVariable("fontsize")+"&variant_code="+variant_enter; 
    }
    else {
      urls = baseURL + campaignID +"/all?user_id=${user.pcId}&mid="+MID+"&snowID="+snowID+"&name="+getQueryVariable("name")+"&fontsize="+getQueryVariable("fontsize");
    }
    
    return {
        MID: MID,
        snowID: snowID,
        urls: urls
    };
  }

  function run_adobe(campaignID,elementArray,targetArray,linksArray='',AdobeID='',SnowplowName='_sp_',AdobeAnalytics='',evarnm='eVar4',timeout_soft=1000,timeout_hard=5000,baseURL='http://test.rsquared.io/one/api/v1/') {

try {

  var adobe_ret = create_adobe_url(baseURL,campaignID,AdobeID,SnowplowName);

  var MID = adobe_ret.MID;
  var snowID = adobe_ret.snowID;
  var urls = adobe_ret.urls;
      $.ajax({
    url: urls,
      success: function( response ) {
      var ret = $.parseJSON(response);
      var variant = ret["variant"];

      for (var i = 0; i < elementArray.length; i++) {
        if ((targetArray[i].indexOf('.jpeg') > -1)||(targetArray[i].indexOf('.jpg') > -1)||(targetArray[i].indexOf('.png') > -1)||(targetArray[i].indexOf('.gif') > -1)) {
              $(elementArray[i]).load(function() {
                $(this).css("visibility", "visible");
              }).attr("src", ret[targetArray[i]]);
          }
        else if (targetArray[i] == '.js') {
          eval(ret[targetArray[i]]);
        }
        else {
          $(elementArray[i]).html(ret[targetArray[i]]);
          $(elementArray[i]).css("visibility", "visible");
        }
      }
    
      for (var i = 0; i < linksArray.length; i++) {
        add_links_to(linksArray[i],variant,"${user.pcId}",MID,snowID);
        }

      try {
        window.setTimeout(function(){
          var s_account=AdobeAnalytics;
          var s=s_gi(s_account);
          s[evarnm] = variant;
          s.tl(true,'o',variant);
        },timeout_soft);
      } catch(errout) { }
      },
      error: function(){
        window.setTimeout(function() {
          for (var i = 0; i < elementArray.length; i++) {
            $(elementArray[i]).css("visibility", "visible");
          }
        }, timeout_soft);
      },
      timeout: timeout_hard
  });
       
  } catch(errout){
    window.setTimeout(function() {
          for (var i = 0; i < elementArray.length; i++) {
            $(elementArray[i]).css("visibility", "visible");
          }
        }, timeout_soft);
  }
}

run_adobe("CID1002",[".present_img img",".present h1"],["pic.jpeg","body.html"],["div.section_btn a"],"A7413E6F59A7FD770A495E6F@AdobeOrg","_sp_","persadotemplate","eVar4",1000,5000,'http://test.rsquared.io/one/api/v1/');