(function () {
	var scripts = document.getElementsByTagName('script');
	var script  = scripts[scripts.length-1];
	var container = document.createElement('div');
	script.parentNode.insertBefore(container, script);

	var callback; do {
		callback = 'jsonp' + Math.floor(Math.random() * 0xffff);
	} while (window[callback]);

	window[callback] = function (res) {
		delete window[callback];
		container.innerHTML = tmpl(script.innerHTML, res);
	};

	var api   = script.getAttribute('data-api');

	var uri = 'https://api.github.com/' + api + ';callback=' + callback;
	var s = document.createElement('script');
	s.type = 'text/javascript';
	s.src = uri;
	document.getElementsByTagName('head')[0].appendChild(s);


	// Simple JavaScript Templating
	// John Resig - http://ejohn.org/ - MIT Licensed
	function tmpl (str, data) {
		tmpl.cache = {};

		// Figure out if we're getting a template, or if we need to
		// load the template - and be sure to cache the result.
		var fn = /^[\w\-]+$/.test(str) ? tmpl.cache[str] = tmpl.cache[str] || tmpl(document.getElementById(str).innerHTML) :
			// Generate a reusable function that will serve as a template
			// generator (and which will be cached).
			new Function("obj",
			"var p=[],print=function(){p.push.apply(p,arguments);};" +

			// Introduce the data as local variables using with(){}
			"with(obj){p.push('" +

			// Convert the template into pure JavaScript
			str
				.replace(/[\r\t\n]/g, " ")
				.split("<%").join("\t")
				.replace(/((^|%>)[^\t]*)'/g, "$1\r")
				.replace(/\t=(.*?)%>/g, "',String($1).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&#34;').replace(/\'/g,'&#39;'),'")
				.split("\t").join("');")
				.split("%>").join("p.push('")
				.split("\r").join("\\'") +

			"');}return p.join('');");

		// Provide some basic currying to the user
		return data ? fn( data ) : fn;
	}
}) ();

