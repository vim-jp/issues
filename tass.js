/**
 * @license MIT copyright (c) 2012 cho45 ( www.lowreal.net )
 * https://github.com/cho45/tasscss/blob/master/LICENSE
 */
function TASS (c, callback) {
	function processInclude (c) {
		return c.replace(/@include\s+([\w\-]+)(\(.*?\))?\s*;/g, function (_, name, args) {
			var mixin = TASS.mixins[name];
			if (!mixin) return '/* unknown mixin: ' + name + ' */';
			var content = mixin.content;
			if (args) {
				var scan = args.slice(1, -1);
				var r = /\s*((?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|\([^\)]*\)|[^,()])+)|,|./g;
				var a = [], m; while ((m = r.exec(scan))) if (m[1]) a.push(m[1]);
				for (var i = 0, len = mixin.args.length; i < len; i++) content = mixin.args[i] + " : " + a[i] + ";\n" + content;
			}
			return content;
		});
	}

	function paralell (obj, cont) {
		var results = {}, n = 0;
		for (var key in obj) if (obj.hasOwnProperty(key)) (function (k, f, i) {
			f(function (r) { results[k] = r; if (--n <= 0) cont(results) });
		})(key, obj[key], n++);
		if (!n) cont(results);
	}

	var external = /^@include\s+(.+?\..+?)\s*;\n?/gm;
	var resources = {}; c.replace(external, function (_, path) {
		resources[path] = function (cont) {
			TASS.read(path, function (data) {
				if (/\.css$/.test(path)) {
					cont(data);
				} else {
					TASS(data, cont);
				}
			});
		};
		return _;
	});

	paralell(resources, function (resources) {
		c = c.replace(/^@mixin\s+([\w\-]+)\s*(\([^\)]+\))?\s*\{([\s\S]*?)^\}/gm, function (_, name, args, content) {
			if (args) args = args.slice(1, -1).split(/\s*,\s*/);
			TASS.mixins[name] = {
				args : args,
				content : processInclude(content)
			};
			return '';
		});

		var nesting  = [ [] ];
		var level    = [];
		var variables = TASS.variables;
		c = processInclude(c).replace(/(^[^\{\};]+\{)|(\})|^\s*(\$[\w\-]+\s*:.+);|(\$[\w\-]+)/gm, function (_, open, close, vardef, varget) {
			if (open) {
				var scope = function (_parent) { this._parent = _parent };
				scope.prototype = variables;
				variables = new scope(variables);

				var selectors = open.replace(/^\s*|\s*\{\s*$/g, '').split(/\s*,\s*/);
				var nextnesting = [];
				for (var j = 0, lenj = selectors.length; j < lenj; j++)
					for (var i = 0, len = nesting.length; i < len; i++)
						nextnesting.push( nesting[i].concat(selectors[j]) );
				nesting = nextnesting;
				level.push(selectors);

				var expanded = [];
				for (var i = 0, len = nesting.length; i < len; i++) expanded.push(nesting[i].join(" "));

				return (nesting[0].length - 1 ? "}\n" : "") + expanded.join(",\n") + " {";
			} else
			if (close) {
				variables = variables._parent;
				nesting.length = nesting.length / level.pop().length;
				for (var i = 0, len = nesting.length; i < len; i++) nesting[i].pop();
				return (nesting[0].length ? "" : "}");
			} else
			if (vardef) {
				vardef = vardef.match(/^(\$[\w\-]+)?\s*:\s*(.*)$/);
				variables[vardef[1]] = vardef[2];
				return '';
			} else
			if (varget) {
				return typeof variables[varget] === 'undefined' ?  '/* unknown variable: ' + verget + ' */': variables[varget];
			}
		});

		c = c.replace(/ &/g, '').replace(/^\s+/gm, '');

		c = c.replace(external, function (_, path) {
			return (typeof resources[path] !== 'string') ? '/* failed to load: ' + path + '*/' : resources[path];
		});

		callback(c);
	});
}
TASS.version = "0.2.0";
TASS.init = function () {
	TASS.mixins = {};
	TASS.variables = {};
};
TASS.read = function (path, callback) {
	throw "Not implemented";
};
TASS.init();

this.TASS = TASS;

if (typeof document != 'undefined') (function () {
	TASS.read = function (path, callback) {
		var req;
		try {
			req = new XMLHttpRequest();
		} catch (e) {
			try {
				req = new ActiveXObject('MSXML2.XMLHTTP.6.0');
			} catch (e) {
				try {
					req = new ActiveXObject('MSXML2.XMLHTTP.3.0');
				} catch (e) {
					console.log('[TASS] Error: Cannot create XMLHttpRequest object');
				}
			}
		}
		req.open('GET', path, true);
		req.onreadystatechange = function (e) {
			if (req.readyState != 4) return;
			if (req.status == 200) {
				callback(req.responseText);
			} else {
				callback('/* [TASS] Error:' + req.status + ' ' + req.responseText + ' */');
			}
		};
		req.send(null);
	};

	var links = document.getElementsByTagName('link');
	for (var i = 0, it; (it = links[i]); i++) (function (link) {
		if (link.rel != 'stylesheet/tass' || !link.href) return;
		TASS.read(link.href, function (data) {
			TASS(data, function (css) {
				var style = document.createElement('style');
				style.type = 'text/css';
				style.appendChild(document.createTextNode(css));
				link.parentNode.insertBefore(style, link);
			});
		});
	})(it);
})();
