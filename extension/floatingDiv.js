function createFloatingDiv(apiName, trimmedResult, tabId) {
    // $('#myFloatingDiv').html('${trimmedResult}');
    let formattedResult = trimmedResult.replace(/\n/g, '<br>');
    const functionAsString = `
        try {
            if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
                console.log('jQuery or jQuery UI is not loaded');
            } else {
                console.log('jQuery and jQuery UI are loaded');
            }

            if (!$('#myFloatingDiv').length) {
                $('body').append('<div id="myFloatingDiv" title="${apiName}"></div>');
                $('#myFloatingDiv').dialog({
                    draggable: true,
                    width: 500,
                    close: function() { $(this).dialog('destroy').remove(); }
                });
            }
            $('#myFloatingDiv').html(${JSON.stringify(formattedResult)});
            $('#myFloatingDiv').dialog('option', 'position', {
                my: 'left top',
                at: 'left+' + (window.lastClickedCoords.x || 10) + ' top+' + (window.lastClickedCoords.y || 10),
                of: window
            });
            console.log("Code is executing!");    
        } catch (e) {
             console.error(e);
        }       
    `;
    chrome.tabs.executeScript(tabId, {code: functionAsString}, function (result) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        } else {
            console.log('Script executed.');
        }
    });

}
