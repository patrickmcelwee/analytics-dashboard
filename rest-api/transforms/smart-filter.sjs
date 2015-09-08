function filterContent(context, params, content) {
  // Note that content is document node, not a JavaScript object.
  if (content.documentFormat == 'JSON') {
    // If content is a JSON document, you must call toObject on it 
    // before you can manipulate the content as a JavaScript object 
    // or modify it.
    var result = content.toObject();

    Object.keys(result).forEach(function(key) {
      if (!params[key]) {
        delete result[key];
      }
    });

    return result;
  } else if (content.documentFormat == 'XML') {
    var result = {};
    var nodes = content.root.childNodes;

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var key = node.localname;
      if (params[key]) {
        if (node.nodeType === 1) {
          var children = node.childNodes;
          for (var j = 0; j < children.length; j++) {
            var child = children[j];
            if (child.nodeType === 3) {
              if (params[key] === 'number')
                result[key] = parseFloat(child.nodeValue);
              else
                result[key] = child.nodeValue;
              break;
            }
          }
        }
      }
    }

    return result;
  } else {
    return content;
  }
};

exports.transform = filterContent;
