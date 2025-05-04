(function ( w, d ) {
	
	function OneUp ( _text, _time, _clss ) {
		var el = d.createElement ('div');
		var cl = 'pk_oneup pk_noselect';

		el.style.cssText = 'margin-top:20px;opacity:0';
		if (_clss) cl = cl + ' ' + _clss;

		el.className = cl;
		el.innerHTML = _text || '';

		d.body.appendChild ( el );
		setTimeout (function() {
			el.style.cssText = 'margin-top:0px;opacity:1';
			
			setTimeout (function() {
				el.style.cssText = 'margin-top:-20px;opacity:0';
				
				setTimeout (function() {
					el.parentNode.removeChild ( el );
					el = null;
				}, 330);
			}, _time || 720);
		}, 25);
	}

	w.OneUp = OneUp;
})( window, document );
(function ( w, d ) {
	'use strict';

	var _v = '0.9',
		_id = -1;

	function PKAE () {
		var q = this; // keeping track of current context

		q.el = null; // reference of main html element
		q.id = ++_id; // auto incremental id
		q._deps = {}; // dependencies

		w.PKAudioList[q.id] = q;

		var events = {};

		q.fireEvent = function ( eventName, value, value2 ) {
			var group = events[eventName];
			if (!group) return (false);

			var l = group.length;
			while (l-- > 0) {
				group[l] && group[l] ( value, value2 );
			}
		};

		q.listenFor = function ( eventName, callback ) {
			if (!events[eventName])
				events[eventName] = [ callback ];
			else
				events[eventName].unshift ( callback  );
		};

		q.stopListeningFor = function ( eventName, callback ) {
			var group = events[eventName];
			if (!group) return (false);

			var l = group.length;
			while (l-- > 0) {
				if (group[l] && group[l] === callback) {
					group[l] = null; break;
				}
			}
		};

		q.stopListeningForName = function ( eventName ) {
			var group = events[eventName];
			if (!group) return (false);
			events[eventName] = null;
		};

		q.init = function ( el_id ) {
			var el = d.getElementById( el_id );
			if (!el) {
				console.log ('invalid element');
				return ;
			}
			q.el = el;

			// init libraries
			q.ui     = new q._deps.ui ( q ); q._deps.uifx ( q );
			q.engine = new q._deps.engine ( q );
			q.state  = new q._deps.state ( 4, q );
			q.rec    = new q._deps.rec ( q );
			q.fls    = new q._deps.fls ( q );

			if (w.location.href.split('local=')[1]) {
				var sess = w.location.href.split('local=')[1];

				q.fls.Init (function () {
					q.fls.GetSession (sess, function ( e ) {
						if(e && e.id === sess )
						{
							q.engine.LoadDB ( e );
						}
					});
				});
			}

			return (q);
		};

		// check if we are mobile and hide tooltips on hover
		q.isMobile = (/iphone|ipod|ipad|android/).test
			(navigator.userAgent.toLowerCase ());
	};

	!w.PKAudioList && (w.PKAudioList = []);

	// ideally we do not want a global singleto refferencing our audio tool
	// but since this is a limited demo we can safely do it.
	w.PKAudioEditor = new PKAE ();

	PKAudioList.push (w.PKAudioEditor); // keeping track in the audiolist array of our instance

})( window, document );
(function( w, d, PKAE ) {
	'use strict';
	
	function KeyHandler () {
		var q = this;
		
		q.keyMap          = {}; // holds a map of all the active keys
		q.callbacks       = {}; // callbacks for when a key combintation becomes active
		q.singleCallbacks = {}; // callbacks to the 'keypress' event - not required

		q.addCallback = function (callback_name, callback_function, keys) {
			q.callbacks[ callback_name ] = {
				keys : keys,
				callback : callback_function
			};
		};
		q.addSingleCallback = function (callback_name, callback_function, key) {
			q.singleCallbacks[ callback_name ] = {
				key : key,
				callback : callback_function
			};
		};
		q.removeCallback = function ( callback_name ) {
			q.callbacks[ callback_name ] = null;
		};
		
		d.addEventListener ('keydown', function ( e ) {
			var keyCode = e.keyCode;

			q.keyDown (keyCode, e);
		});

		q.keyDown = function (keyCode, e ) {
			q.keyMap[keyCode] = 1;

			for (var key in q.callbacks) {
				var group = q.callbacks[key];
				if (!group) continue;
				
				var l = group.keys.length;
				var all_ok = true;
				while (l-- > 0) {
					if (!q.keyMap[group.keys[l]])
					{
						all_ok = false;
						break;
					}
				}

				all_ok && group.callback && group.callback ( keyCode, q.keyMap, e );
			}			
		};

		q.keyUp = function ( keyCode ) {
			q.keyMap[keyCode] = 0;
		};

		q.keyPress = function ( keyCode, e ) {
			for (var key in q.singleCallbacks) {
				var group = q.singleCallbacks[key];
				if (!group) continue;
				
				if (group.key === keyCode)
					group.callback && group.callback ( e );
			}
		};

		d.addEventListener ('keyup', function ( e ) {
			var keyCode = e.keyCode;
			q.keyUp (keyCode);
		});

		d.addEventListener ('keypress', function ( e ) {
			var keyCode = e.keyCode;

			q.keyPress (keyCode, e);
		});

		w.addEventListener ('blur', function ( e ) {
			q.keyMap = {};
		}, false);
		d.addEventListener ('contextmenu', function( e ) {
			e.preventDefault();
		}, false);
	};
	
	PKAE._deps.keyhandler = KeyHandler;

})( window, document, PKAudioEditor  );
(function ( win, doc, PKAE ) {
	'use strict';

	var activeMenu = [],
		namespace = win,
		contextStorage = {},
		_id = 0;

	var closeEvent = [ 'mousedown', 'touchup' ];

		/**
		*	Goes through every single context instance and terminates
		*	it.
		**/
	var closeContext = function ( e, force ) {
			if (!e) return ;
			if (activeMenu.length === 0) return ;

			var el = e.target || e.srcElement;

			if (!el || el.className.indexOf('_action') === -1 || force)
			{
				var l = activeMenu.length;
				while (l--) terminate (activeMenu[ l ]);
				activeMenu = [];
			}
		},
		/**
		*	Go through every children element of the context el, 
		*	and remove all listeners and added attributes, then remove it
		*	from the dom also
		**/
		terminate = function( e ) {
			var children = e.currentMenu.getElementsByTagName('*'),
			len = children.length;

			while( len-- )
				children[ len ].parentNode.removeChild( children[ len ] );

			e.currentMenu.removeEventListener( closeEvent, stopPropagation );
			doc.body.removeChild( e.currentMenu );
			e.currentMenu = null;
			return false;
		},
		/** stop propagation func, so that we don't have to use anonymous funcs **/
		stopPropagation	=	function(e){ e.stopPropagation(); },
		openContext = function( e, x, y ) {

			closeContext(null);
			activeMenu.push( e );
			
			//go through all the options and make the div
			var div = doc.createElement('div'),
			a,
			marginOffset = 4,
			opts = e.options,
			leftOffset = x - marginOffset,
			topOffset = y - marginOffset,
			width = 0, height = 0;

			div.className = "pk_contextMenu " + e.menuClass;
			div.id = e.token;

			for( var i = 0, len = opts.length; i < len; ++i ) {
				if( opts[ i ].isHTML )
				{
					a = doc.createElement('div');
					a.innerHTML = opts[ i ].isHTML;
					div.appendChild( a );
				}
				else {
					a = doc.createElement('a');
					a.className = 'pk_ctx_action';
					a.cnt = 1;
					a.innerHTML = opts[ i ].name;
					a.callback = opts[ i ].callback;

					a.addEventListener( 'click', a.callback, false );
					
					div.appendChild( a );
				}
			}

			e.currentMenu = div;
			div.addEventListener( closeEvent, stopPropagation, false );

			doc.body.appendChild( div );

			width = div.offsetWidth;
			height = div.offsetHeight;

			if( win.innerWidth < ( leftOffset + width ) && win.innerHeight < ( topOffset + height ) )
				div.style.cssText = "top:" + ( topOffset - height ) + "px;left:" + ( leftOffset - width ) + "px;";
			else if( win.innerWidth < ( leftOffset + width ) )
				div.style.cssText = "top:" + ( topOffset ) + "px;left:" + ( leftOffset - width ) + "px;";
			else if( win.innerHeight < ( topOffset + height ) )
				div.style.cssText = "top:" + ( topOffset - height ) + "px;left:" + ( leftOffset ) + "px;";
			else
				div.style.cssText = "top:" + ( topOffset ) + "px;left:" + ( leftOffset ) + "px;";

			if (e.onOpen) {
				e.onOpen ( e, div );
			}

      	return false;
	},
	openMenu = function( e )
	{
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		else {
			e = {pageX:0, pageY:0};
		}

		// ---- 
		var instance = getInstance ( this );
		var pageX = e.pageX || e.clientX + doc.documentElement.scrollLeft;
		var pageY = e.pageY || e.clientY + doc.documentElement.scrollTop;

		if (!instance) return false;

		instance.curr_target = e.target || e.srcElement;

		openContext ( instance, pageX, pageY );
	},
	getInstance = function( elem ) {
		return contextStorage[ elem.getAttribute( 'data-token' ) ];
	};

	/**
	*	Context Menu Constructor
	**/
	var contextMenu = namespace.contextMenu = function( elem, options ) {
		if (!(this instanceof contextMenu)) return new contextMenu( elem, options );
		if (!options) options = {};

		var open_events = ['contextmenu', 'longpress'];

		this.elem = elem;
		this.options = [];
		this.menuClass = options.className || 'pk_open';
		this.curr_target = null;

		// modified context menu to open only when double click + no movement
		// if (elem) elem.addEventListener( 'contextmenu', openMenu, false );
		if (elem) elem.addEventListener( 'pk_ctxmn', openMenu, false );

		this.token = ++_id;
		if (elem) elem.setAttribute( 'data-token', this.token );

		contextStorage[ this.token ] = this;
	};
	/**
	*	Wrapper to the private openMenu function
	**/
	contextMenu.prototype.open = function( e ) {
		openMenu.call( this.elem, e );
	};
	contextMenu.prototype.close = function( e ) {
		closeContext();
	};
	contextMenu.prototype.openWithToken = function( token, x, y ) {
		openContext( contextStorage[ token ], x||0, y||0 );
	};
	/**
	*	Closes context and removes it fully
	**/
	contextMenu.prototype.destroy = function() {
		// this.elem.removeEventListener( 'contextmenu', openMenu );
		this.elem.removeEventListener( 'pk_ctxmn', openMenu );

		closeContext();
		contextStorage[ this.token ] = null;

		return false;
	},
	/**
	*	Adds option
	*	@param	string	name of the option
	*	@param	function to run when its chosen
	*	@param	if this is set, then append the HTML instead of its name in its position
	*	@param	initialization code to run when the object is appended to the dom
	**/
	contextMenu.prototype.addOption = function( name, callback, isHTML ) {
		var q = this;
		this.options.push({ "name" : name, "callback" : function( e ) {

			callback && callback( q, q._open );
			closeContext( q, true );
		},
		"isHTML"	: isHTML
	});
	};


	// todo touch controls too? #### 
	doc.addEventListener( closeEvent[0], closeContext, false );
	doc.addEventListener( 'killCTX', closeContext, false );


	PKAE._deps.ContextMenu = contextMenu;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';


	// STORING THE CUSTOM FX PRESETS IN LOCALSTORAGE
	function PK_FX_PRESETS () {
		var presets = {};

		this.Set = function (filter_id, obj) {
			var arr = presets[ filter_id ];

			if (!arr) {
				arr = [];
				presets[ filter_id ] = arr;
			}

			arr.push (obj);
			localStorage.setItem ('pk_presetfx', JSON.stringify (presets));

			return (arr);
		}

		this.Save = function () {
			localStorage.setItem ('pk_presetfx', JSON.stringify (presets));
		};

		this.Get = function ( filter_id ) {
			if (!filter_id) return (presets);
			return (presets[ filter_id ]);
		};

		this.GetSingle = function ( filter_id, custom_id ) {
			if (!filter_id) return (false);
			if (!custom_id) return (false);

			var arr = presets[ filter_id ];
			var l = arr.length;
			var found = null;

			while (l-- > 0) {
				if (arr[l].id === custom_id)
				{
					found = arr[l];
					break;
				}
			}

			if (found) return (found);
			return (false);
		};

		this.Del = function ( filter_id, custom_id ) {
			if (!filter_id) return (presets);

			var arr = presets[ filter_id ];
			var l = arr.length;
			var found = false;

			while (l-- > 0) {
				if (arr[l].id === custom_id)
				{
					arr.splice (l, 1);
					found = true;
					break;
				}
			}

			if (found)
				localStorage.setItem ('pk_presetfx', JSON.stringify (presets));

			return (arr);
		};

		// loadCustomPresets
		if (!w.localStorage)
		{
			this.Set = function(){};
			return ;
		}

		var json = w.localStorage.getItem ('pk_presetfx');
		var tmp = null;

		if (!json) return ;
		try { tmp = JSON.parse (json); } catch (e){}

		if (tmp) presets = tmp;
	};



	function PKUI_FX ( app ) {
		var UI = app.ui;

		var curr_filter_ui = null;
		var modal_name = 'modalfx';
		var modal_esc_key = modal_name + 'esc';

		var custom_presets = new PK_FX_PRESETS ();


		app.listenFor ('DidCloseFX_UI', function () {
			curr_filter_ui = null;
		});

		app.listenFor ('DidOpenFX_UI', function ( modal ) {
			curr_filter_ui = modal;
		});

		app.listenFor ('RequestFXUI_SELCUT', function () {
			var eng  = app.engine;
			var wv   = eng.wavesurfer;
			var bk   = wv.backend;
			var rate = bk.buffer.sampleRate;

			var region = wv.regions.list[0];
			if (!region) return (false);

			app.fireEvent('RequestPause');

			// mark the region as 
			region.element.style.background = 'red';

			var reg = {
                    pos: {
                        start: (region.start * rate) >> 0,
                        end:   (region.end * rate) >> 0
                    },
                    initpos: {
                        start: (region.start * rate) >> 0,
                        end:   (region.end * rate) >> 0
                    }
			};

			wv.backend.reg = reg;

			var update_reg = function( region ) {
				reg.pos.start = (region.start * rate) >> 0;
				reg.pos.end = (region.end * rate) >> 0;

				wv.drawBuffer (true);
			};

			wv.on ('region-updated', update_reg);
			// -- now make sure we resize it if needed be
		});

		app.listenFor ('RequestFXUI_Gain', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'gain';
			var auto = null;

			var getvalue = function ( q ) {
				var value;

				if (auto) {
					value = auto.GetValue ();
				} else {
					var input = q.el_body.getElementsByTagName('input')[0];
					value = [{val: input.value / 1}];
				}

				return (value);
			};

			var x = new PKAudioFXModal({
				id: filter_id,
			    title:'Apply Gain to selected range',

				presets:[
					{name:'Silence',val:0},
					{name:'-50%',val:0.5},
					{name:'-25%',val:0.75},
					{name:'+25%',val:1.25},
					{name:'+50%',val:1.5},
					{name:'+100%',val:2}
				],
				custom_pres:custom_presets.Get (filter_id),
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			preview: function ( q ) {
				var value = getvalue ( q );
				app.fireEvent ('RequestActionFX_PREVIEW_GAIN', value);
			},
			  buttons: [
				{
					title:'Apply Gain',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var value = getvalue ( q );

						if (value[0].val != 1.0)
							app.fireEvent ('RequestActionFX_GAIN', value);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row" style="border:none"><label>Gain percentage</label>' + 
				'<input type="range" class="pk_horiz" min="0.0" max="2.5" step="0.01" value="1.0" />'+
				'<span class="pk_val">100%</span></div>' +
				'<div class="pk_row" style="border:none;padding:0">',
				// '<a style="float:left;margin:0" class="pk_modal_a_bottom">Volume Graph</a></div>',

			  setup:function( q ) {
				  var range = q.el_body.getElementsByTagName ('input')[0];
				  var span = q.el_body.getElementsByTagName  ('span')[0];
				  var graph_btn = q.el_body.getElementsByTagName  ('a')[0];

				  range.oninput = function() {
					span.innerHTML = ((range.value * 100) >> 0) + '%';
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', [{val: range.value / 1}]);
				  };

				  //graph_btn.onclick = function () {
				  //	auto = new PKAudioEditor._deps.FxAUT (app, q);
				  //};

				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet (modal_name);
				  app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;

				    q.Destroy ();
				  }, [27]);
			  }
			}, app);
			x.Show();
		});

		app.listenFor ('RequestActionFXUI_Rate', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'speed';

			var x = new PKAudioFXModal({
				id: filter_id,
			  title:'Change Speed',
				presets:[
					{name:'A lot slower',val:0.65},
					{name:'Slightly slower',val:0.85},
					{name:'Slightly faster',val:1.15},
					{name:'Blazing Fast',val:1.4}
				],
				custom_pres:custom_presets.Get (filter_id),
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			preview: function ( q ) {
				var input = q.el_body.getElementsByTagName('input')[0];
				var value = input.value.trim() / 1;
				app.fireEvent ('RequestActionFX_PREVIEW_RATE', value);
			},

			  buttons: [
				{
					title:'Apply Rate',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var input = q.el_body.getElementsByTagName('input')[0];
						var value = input.value.trim() / 1;

						if (value != 1.0)
							app.fireEvent ('RequestActionFX_RATE', value);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row" style="border:none"><label>Playback Rate</label>' + 
				'<input type="range" class="pk_horiz" min="0.2" max="2.0" step="0.05" value="1.0" />'+
				'<span class="pk_val">1.0</span></div>',
			  setup:function( q ) {
				  var range = q.el_body.getElementsByTagName('input')[0];
				  var span = q.el_body.getElementsByTagName('span')[0];

				  range.oninput = function() {
					span.innerHTML = range.value;
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', range.value/1);
				  };
				  
				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet (modal_name);
				   
				  app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
				  	if (!app.ui.InteractionHandler.check (modal_name)) return ;

				    q.Destroy ();
				  }, [27]);
			  }
			}, app);
			x.Show();
		});

		app.listenFor ('RequestActionFXUI_Speed', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'speed';

			var x = new PKAudioFXModal({
				id: filter_id,
			  title:'Change Speed',
				presets:[
					{name:'-1/4',val:0.25},
					{name:'-1/2',val:0.5},
					{name:'Slightly slower',val:0.85},
					{name:'Slightly faster',val:1.1},
					{name:'+1/4',val:1.25},
					{name:'+1/2',val:1.5}
				],
				custom_pres:custom_presets.Get (filter_id),
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			preview: function ( q ) {
				var input = q.el_body.getElementsByTagName('input')[0];
				var value = input.value.trim() / 1;
				app.fireEvent ('RequestActionFX_PREVIEW_SPEED', value);
			},

			  buttons: [
				{
					title:'Apply Rate',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var input = q.el_body.getElementsByTagName('input')[0];
						var value = input.value.trim() / 1;

						if (value != 1.0)
							app.fireEvent ('RequestActionFX_SPEED', value);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row" style="border:none"><label>Playback Rate</label>' + 
				'<input type="range" class="pk_horiz" min="0.2" max="2.0" step="0.05" value="1.0" />'+
				'<span class="pk_val">1.0</span></div>',
			  setup:function( q ) {
				  var range = q.el_body.getElementsByTagName('input')[0];
				  var span = q.el_body.getElementsByTagName('span')[0];

				  range.oninput = function() {
					span.innerHTML = range.value;
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', range.value/1);
				  };
				  
				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet (modal_name);
				   
				  app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
				  	if (!app.ui.InteractionHandler.check (modal_name)) return ;

				    q.Destroy ();
				  }, [27]);
			  }
			}, app);
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_Flip', function () {
			if (!PKAudioEditor.engine.is_ready) return ;

			app.fireEvent ( 'RequestRegionClear');
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'flip';
			var mode = 0;

			var x = new PKAudioFXModal({
				id: filter_id,
			  	title:'Channel Info',
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			buttons: [
				{
					title:'Apply Changes',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						if (mode === 1)
						{
							// check if we are doing force mono, or force flip
							var mono  = q.el_body.getElementsByClassName('pk_c_mm')[0];
							var flip  = q.el_body.getElementsByClassName('pk_c_fl')[0];

							if (mono.checked)
							{
								var chans = q.el_body.getElementsByClassName('pk_c_c');
								// check which channel we pick

								if (chans[0].checked) {
									app.fireEvent ('RequestActionFX_Flip', 'mono', 0);
								}
								else if (chans[1].checked) {
									app.fireEvent ('RequestActionFX_Flip', 'mono', 1);
								}
							}
							else if (flip.checked) {
								app.fireEvent ('RequestActionFX_Flip', 'flip');
							}
						}

						else if (mode === 2)
						{
							var stereo  = q.el_body.getElementsByClassName('pk_c_ms')[0];
							if (stereo.checked) {
								app.fireEvent ('RequestActionFX_Flip', 'stereo');
							}
						}

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row pk_mm" style="border:none;display:none">'+

					'<div class="pk_row">'+
					'<input type="checkbox" class="pk_check pk_c_mm" id="xmm" name="makeMono">'+
					'<label for="xmm">Make Mono</label></div>' + 
			  		'<div class="pk_row" style="padding-left:30px">' +
					'<input type="radio" class="pk_check pk_c_c" id="kf6" name="chnl" value="left">'+
					'<label class="pk_dis" for="kf6">Left Channel</label>'+
					'<input type="radio" class="pk_check pk_c_c" id="kf7" name="chnl" value="right">'+
					'<label class="pk_dis" for="kf7">Right Channel</label>'+
					'</div>'+ 

					'<div class="pk_row"><input type="checkbox" class="pk_check pk_c_fl" id="xfc" name="flipChn">'+
					'<label for="xfc">Flip Channels</label></div>' + 
					'</div>' +

					'<div class="pk_row pk_ms" style="border:none;display:none">'+
						'<div class="pk_row"><input type="checkbox" class="pk_check pk_c_ms" id="xms" checked name="makeStereo">'+
						'<label for="xms">Make Stereo</label></div>' + 
					'</div>',
			  setup:function( q ) {
			  	  var main = null;
				  var num = PKAudioEditor.engine.wavesurfer.backend.buffer.numberOfChannels;
				  if (num === 2)
				  {
				  	mode = 1;
				  	main = q.el_body.getElementsByClassName('pk_mm')[0];
				  	
				  	var mono  = main.getElementsByClassName('pk_c_mm')[0];
				  	var flip  = main.getElementsByClassName('pk_c_fl')[0];
				  	var chans = main.getElementsByClassName('pk_c_c');
				  	var tmp   = main.getElementsByClassName('pk_dis');
				  	var lbls  = [tmp[0], tmp[1]];

				  	mono.onchange = function( e ) { 
				  		if (mono.checked) {
				  			flip.checked = false;
				  			chans[0].checked = true;
				  			lbls[0].className = '';
				  			lbls[1].className = '';
				  		}
				  		else {
				  			chans[0].checked = false;
				  			chans[1].checked = false;
				  			lbls[0].className = 'pk_dis';
				  			lbls[1].className = 'pk_dis';
				  		}
				  	};

				  	flip.onchange = function( e ) {
				  		if (flip.checked) {
				  			mono.checked = false;
				  			mono.onchange ();
				  		}
				  	};

				  }
				  else
				  {
				  	mode = 2;
				  	main = q.el_body.getElementsByClassName('pk_ms')[0];
				  }

				  main.style.display = 'block';

				  // --

				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet (modal_name);
				  app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
				  	if (!app.ui.InteractionHandler.check (modal_name)) return ;
				    q.Destroy ();
				  }, [27]);
			  }
			}, app);
			x.Show();
		});



		app.listenFor ('RequestFXUI_Silence', function () {
			var x = new PKSimpleModal({
			  title: 'Insert Silence',
			  ondestroy: function( q ) {
				UI.InteractionHandler.on = false;
				UI.KeyHandler.removeCallback ('modalTemp');
			  },
			  buttons:[
				{
					title:'Insert Silence',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var input = q.el_body.getElementsByClassName('pk_horiz')[0];
						var value = input.value.trim() / 1;

						var radios = q.el_body.getElementsByClassName('pk_check');
						var offset = 0;

						if (radios[1].checked)
							offset = PKAudioEditor.engine.wavesurfer.getCurrentTime().toFixed(3)/1;

						if (value > 0.001)
							UI.fireEvent ('RequestActionSilence', offset, value);
						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row"><input type="radio" class="pk_check" id="ifeq" name="rdslnc" value="beginning">'+ 
				'<label  for="ifeq">Insert silence at beginning</label><br/>' +
				'<input type="radio" class="pk_check"  id="vgdja" name="rdslnc" checked value="cursor">'+
				'<label for="vgdja">Insert silence at current cursor (<span class="pkcdpk"></span>)</label></div>'+
				'<div class="pk_row"><label>Silence in seconds</label>'+
				'<input type="range" min="0.0" max="30.0" class="pk_horiz" step="0.01" value="5.0" />'+
				'<span class="pk_val">5s</span></div>',
			  setup:function( q ) {
					var cursor_pos_el = q.el_body.getElementsByClassName('pkcdpk')[0];
					cursor_pos_el.innerHTML = PKAudioEditor.engine.wavesurfer.getCurrentTime().toFixed(2) + 's';

					var range = q.el_body.getElementsByClassName('pk_horiz')[0];
					var span = q.el_body.getElementsByClassName('pk_val')[0];

					range.oninput = function() {
						span.innerHTML = (range.value/1).toFixed (2) + 's';
					};

					UI.fireEvent ('RequestPause');
					UI.InteractionHandler.checkAndSet ('modal');
					UI.KeyHandler.addCallback ('modalTemp', function ( e ) {
						q.Destroy ();
					}, [27]);
			  }
			});
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_Compressor', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'compressor';
			var auto = null;
			var getvalue = function ( q ) {
				var ret;
				var value = [];

				if (auto) {
					value = auto.GetValue ();
				} else {
					var inputs = q.el_body.getElementsByTagName('input');
					value[0] = {val:inputs[0].value / 1};
					value[1] = {val:inputs[1].value / 1};
					value[2] = {val:inputs[2].value / 1};
					value[3] = {val:inputs[3].value / 1};
					value[4] = {val:inputs[4].value / 1};
				}

				ret = {
					threshold: value[0],
					knee:  value[1],
					ratio:  value[2],
					attack:  value[3],
					release:  value[4]
				};

				return (ret);
			};

			var x = new PKAudioFXModal({
			  id    : filter_id,
			  title : 'Apply Compression to selected range',
			  clss  : 'pk_bigger',
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
				presets:[
					{name:'Classic',val:'-40,5,7,0.002,0.1'},
					{name:'Light',val:'-6,2,2.5,0.002,0.05'},
					{name:'Dashed Distortion',val:'-45,26,2.05,0.233,0.0'},
					{name:'Chaotic Distortion',val:'-60,14,11.07,0.036,0.00'}
				],
				custom_pres:custom_presets.Get (filter_id),
			preview: function ( q ) {
				var inputs = q.el_body.getElementsByTagName('input');
				var val = getvalue (q);
				app.fireEvent ('RequestActionFX_PREVIEW_COMPRESSOR', val);
			},

			  buttons: [
				{
					title:'Apply',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {		
						var inputs = q.el_body.getElementsByTagName('input');
						var val = getvalue ( q );
						
						app.fireEvent ('RequestActionFX_Compressor', val);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row"><label class="pk_line">Threshold</label>' + 
				'<input class="pk_horiz" type="range" min="-100" max="0" step="0.1" value="-24.0" />'+
				'<span class="pk_val">-24.0</span></div>'+

				'<div class="pk_row"><label class="pk_line">Knee</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="40.0" step="0.01" value="30.0" />'+
				'<span class="pk_val">30.0</span></div>'+

				'<div class="pk_row"><label class="pk_line">Ratio</label>' + 
				'<input class="pk_horiz" type="range" min="1.0" max="20.0" step="0.01" value="12.0" />'+
				'<span class="pk_val">12.0</span></div>'+

				'<div class="pk_row"><label class="pk_line">Attack</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="1.0" step="0.001" value="0.003" />'+
				'<span class="pk_val">0.003</span></div>'+

				'<div class="pk_row" style="border:none"><label class="pk_line">Release</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="1.0" step="0.001" value="0.25" />'+
				'<span class="pk_val">0.25</span></div>',
				//'<a style="float:left;margin:0" class="pk_modal_a_bottom">Volume Graph</a></div>',
			  setup:function( q ) {
				var inputs = q.el_body.getElementsByTagName ('input');
				for (var i = 0; i < inputs.length; ++i)
				{
				  inputs[i].oninput = function () {
					  var span = this.parentNode.getElementsByTagName ('span')[0];
					  span.innerHTML = (this.value/1).toFixed (3);
					  
					  updateFilter ();
				  };
				}

				//var graph_btn = q.el_body.getElementsByTagName  ('a')[0];
				//graph_btn.onclick = function () {
				//		auto = new PKAudioEditor._deps.FxAUT (PKAudioEditor, q);
				//};
				
				function updateFilter() {
					var val = getvalue ( q );
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', val);
				}

				app.fireEvent ('RequestPause');
				app.ui.InteractionHandler.checkAndSet (modal_name);
				app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;
					q.Destroy ();
				}, [27]);
				// ---
			  }
			}, app);
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_Normalize', function () {
			app.fireEvent ('RequestSelect', 1);

			var x = new PKSimpleModal({
			  title: 'Normalize',
			  ondestroy: function( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback ('modalTemp');
			  },
			  buttons:[
				{
					title:'Normalize Audio',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var input = q.el_body.getElementsByClassName('pk_horiz')[0];
						var value = (input.value / 1);

						var toggle = q.el_body.getElementsByClassName('pk_check')[0].checked;
						app.fireEvent ('RequestActionFX_Normalize', [toggle, value]);
						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row">'+
			    '<input type="checkbox" id="vhcjgs" class="pk_check" name="normEqually">'+
				'<label for="vhcjgs">Normalize L/R Equally</label></div>' + 
				'<div class="pk_row" style="border:none"><label>Normalize to</label>'+
				'<input type="range" min="0.0" max="2.0" class="pk_horiz" step="0.01" value="1.0" />'+
				'<span class="pk_val">100%</span></div>',
			  setup:function( q ) {
				  var range = q.el_body.getElementsByClassName('pk_horiz')[0];
				  var span = q.el_body.getElementsByClassName('pk_val')[0];

				  range.oninput = function() {
					span.innerHTML = (((range.value/1)*100) >> 0) + '%';
				  };

				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet ('modal');
					app.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
						q.Destroy ();
					}, [27]);
			  }
			});x.Show();
		});


		app.listenFor ('RequestActionFXUI_ParaGraphicEQ', function () {
			PKAudioEditor._deps.FxEQ (app, custom_presets);
		});

		app.listenFor ('RequestActionTempo', function () {
			PKAudioEditor._deps.FxTMP (app);
		});

		app.listenFor ('RequestActionNewRec', function () {
			PKAudioEditor._deps.FxREC (app);
		});

		//app.listenFor ('RequestActionAUTO', function ( filter ) {
		//	PKAudioEditor._deps.FxAUT (app, filter);
		//});

		app.listenFor ('RequestActionFXUI_GraphicEQ', function ( num_of_bands ) {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'graph_eq';
			var auto = null;
			var getvalue = function ( ranges ) {
				var val = {};

				if (auto) {
					val = auto.GetValue ();
				} else {
					val = [];
					var len = ranges.length;
					for (var i = 0; i < len; ++i)
					{
						var range = ranges [ i ];
						val.push ({
							'type' : range.getAttribute ('data-type'),
							'freq' : range.getAttribute ('data-freq')/1,
							'val'  : range.value / 1,
							'q'    : band_q
						});
					}
				}

				return (val);
			};

			var bands_str = '<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="32" data-type="lowshelf" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">< 32hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="64" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">64hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="125" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">125hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="250" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">250hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="500" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">500hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="1000" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">1000hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="2000" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">2000hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="4000" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">4000hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="8000" data-type="peaking" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm">8000hz</span></div>'+
				'<div class="pk_col"><span class="pk_val">0 db</span>'+
				'<input class="pk_vert" data-freq="16000" data-type="highshelf" '+
				'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
				'<span class="pk_btm"> >16000hz</span></div>';
			var presets = [
				{name:'Reset', val:'0,0,0,0,0,0,0,0,0,0'},
				{name:'Old Radio', val:'-25,-22,-20,-18,-9,0,8,10,-8,-25'},
				{name:'Lo Fi', val:'-18,-12,0,2,0,4,4,-1,-6,-8'}
			];
			var band_q = 4.6;

			if (num_of_bands === 20)
			{
				filter_id += '_2';
				presets = null; // maybe add presets?
				band_q = 10.2;
				bands_str = '<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="31" data-type="lowshelf" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">< 31hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="44" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">44hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="63" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">63hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="88" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">88hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="125" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">125hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="180" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">180hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="250" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">250hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="335" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">335hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="500" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">500hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="710" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">710hz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="1000" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">1khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="1400" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">1.4khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="2000" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">2khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="2800" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">2.8khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="4000" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">4khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="5600" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">5.6khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="8000" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">8khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="11300" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">11.3khz</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="16000" data-type="peaking" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm">16k</span></div>'+
					'<div class="pk_col"><span class="pk_val">0 db</span>'+
					'<input class="pk_vert" data-freq="22000" data-type="highshelf" '+
					'type="range" min="-25.0" max="25.0" step="0.01" value="0.0" />'+
					'<span class="pk_btm"> >22khz</span></div>';
			}

			var x = new PKAudioFXModal({
			  id: filter_id,
			  title:'Graphic EQ',
			  clss: num_of_bands === 20 ? 'pk_dens' : '',
			  custom_pres:custom_presets.Get (filter_id),
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			preview: function ( q ) {
				var ranges = q.el_body.getElementsByTagName('input');
				var len = ranges.length;

				app.fireEvent ('RequestActionFX_PREVIEW_PARAMEQ', getvalue (ranges));
			},

			  buttons: [
				{
					title:'Apply EQ',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						var ranges = q.el_body.getElementsByTagName('input');
						app.fireEvent ('RequestActionFX_PARAMEQ', getvalue (ranges));

						q.Destroy ();
					}
				}
			  ],
			  presets:presets,
			  body:'<div class="pk_h200">' +
			  	bands_str+
				'<div style="clear:both;"></div></div>',
				//'<a style="float:left;margin:0" class="pk_modal_a_bottom">Volume Graph</a></div>',
			  setup:function( q ) {
					var ranges = q.el_body.getElementsByTagName('input');
					var len = ranges.length;

					  //var graph_btn = q.el_body.getElementsByTagName  ('a')[0];
					  //graph_btn.onclick = function () {
					  //		auto = new PKAudioEditor._deps.FxAUT (PKAudioEditor, q, function ( obj, range ) {
					  //			obj.type = range.getAttribute ('data-type');
					  //			obj.freq = range.getAttribute ('data-freq')/1;
					  //			obj.q    = band_q;
					  //		});
					  //};

					for (var i = 0; i < len; ++i) {
						var range = ranges[i];

						range.oninput = function() {
						  var span = this.parentNode.getElementsByTagName('span')[0];
						  span.innerHTML = ((this.value) >> 0) + ' db';
						  app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', getvalue (ranges));
						};
					}

					app.fireEvent ('RequestPause');
					app.ui.InteractionHandler.checkAndSet (modal_name);
					app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
						if (!app.ui.InteractionHandler.check (modal_name)) return ;
						q.Destroy ();
					}, [27]);
			  }
			}, app);
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_HardLimiter', function () {

			app.fireEvent ('RequestSelect', 1);

			var x = new PKAudioFXModal({
			  title: 'Hard Limiting',
			  ondestroy: function( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback ('modalTemp');
			  },
			  buttons:[
				{
					title:'Hard Limiting',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {
						app.fireEvent ('RequestActionFX_HardLimit', q.updateFilter (q));
						q.Destroy ();
					}
				}
			  ],
				preview: function ( q ) {
					app.fireEvent ('RequestActionFX_PREVIEW_HardLimit', q.updateFilter ( q ));
				},
			  body:
				'<div class="pk_row"><input type="checkbox" class="pk_check" id="xighs" name="normEqually">'+
				'<label for="xighs">Hard Limiting</label></div>' + 

				'<div class="pk_row"><label>Limit to</label>'+
				'<input type="range" min="0.1" max="1.0" class="pk_horiz pk_w180" step="0.01" value="0.99" />'+
				'<span class="pk_val">99%</span></div>'+

				'<div class="pk_row"><label>Ratio between lows and highs</label>'+
				'<input type="range" min="0.0" max="1.0" class="pk_horiz pk_w180" step="0.01" value="0.0" />'+
				'<span class="pk_val">Ratio 0%</span></div>'+

				'<div class="pk_row"><label>Look Ahead (ms)</label>'+
				'<input type="range" min="1.0" max="500.0" class="pk_horiz pk_w180" step="0.01" value="10.0" />'+
				'<span class="pk_val">10 ms</span></div>',
			  updateFilter : function ( q ) {
					var val = [q.el_body.getElementsByClassName('pk_check')[0].checked];
					var ranges = q.el_body.getElementsByClassName('pk_horiz');

					for (var i = 0; i < ranges.length; ++i)
					{
						var range = ranges [ i ];
						val.push (range.value / 1);
					}
					return (val);
				},
			  setup:function( q ) {
				  var ranges = q.el_body.getElementsByClassName('pk_horiz');
				  
				  ranges[0].oninput = function() {
					var span = this.parentNode.getElementsByTagName('span')[0];
					span.innerHTML = (((this.value/1)*100) >> 0) + '%';
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', q.updateFilter (q));
				  };
				  ranges[1].oninput = function() {
					var span = this.parentNode.getElementsByTagName('span')[0];
					span.innerHTML = 'Ratio ' + (((this.value/1)*100) >> 0) + '%';
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', q.updateFilter (q));
				  };
				  ranges[2].oninput = function() {
					var span = this.parentNode.getElementsByTagName('span')[0];
					span.innerHTML = (this.value/1) + 'ms';
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', q.updateFilter (q));
				  };


				  app.fireEvent ('RequestPause');
				  app.ui.InteractionHandler.checkAndSet ('modal');
					app.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
						q.Destroy ();
					}, [27]);
			  }
			}, app);x.Show();
		});


		app.listenFor ('RequestActionFXUI_Delay', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'delay';
			var auto = null;
			var getvalue = function ( q ) {
				var ret;
				var value = [];

				if (auto) {
					value = auto.GetValue ();
				} else {
					var inputs = q.el_body.getElementsByTagName('input');
					value[0] = {val:inputs[0].value / 1};
					value[1] = {val:inputs[1].value / 1};
					value[2] = {val:inputs[2].value / 1};
				}

				ret = {
					delay: value[0],
					feedback:  value[1],
					mix:  value[2]
				};

				return (ret);
			};

			var x = new PKAudioFXModal({
			  id    : filter_id,
			  title : 'Apply Delay to selected range',
			  clss  : 'pk_bigger',
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
				presets:[
					{name:'Classic',val:'0.3,0.4,0.4'},
					{name:'Spacey',val:'3.0,0.6,0.3'}
				],
				custom_pres:custom_presets.Get (filter_id),
			preview: function ( q ) {
				var val = getvalue (q);

				app.fireEvent ('RequestActionFX_PREVIEW_DELAY', val);
			},

			  buttons: [
				{
					title:'Apply',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {		
						var val = getvalue (q);
						
						app.fireEvent ('RequestActionFX_DELAY', val);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row"><label class="pk_line">Delay Time</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="6.0" step="0.01" value="0.28" />'+
				'<span class="pk_val">0.28</span></div>'+

				'<div class="pk_row"><label class="pk_line">Feedback</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="1.0" step="0.01" value="0.5" />'+
				'<span class="pk_val">0.5</span></div>'+

				'<div class="pk_row"><label class="pk_line">Wet</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="1.0" step="0.01" value="0.4" />'+
				'<span class="pk_val">0.4</span></div>',
				//'<a style="float:left;margin:0" class="pk_modal_a_bottom">Volume Graph</a></div>',
			  setup:function( q ) {
				var inputs = q.el_body.getElementsByTagName ('input');
				for (var i = 0; i < inputs.length; ++i)
				{
				  inputs[i].oninput = function () {
					  var span = this.parentNode.getElementsByTagName ('span')[0];
					  span.innerHTML = (this.value/1).toFixed (3);
					  
					  updateFilter ();
				  };
				}

				//var graph_btn = q.el_body.getElementsByTagName  ('a')[0];
				//graph_btn.onclick = function () {
				//	auto = new PKAudioEditor._deps.FxAUT (app, q);
				//};

				function updateFilter() {
					var val = getvalue (q);					
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', val);
				}

				app.fireEvent ('RequestPause');
				app.ui.InteractionHandler.checkAndSet (modal_name);
				app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;
					q.Destroy ();
				}, [27]);
				// ---
			  }
			}, app);
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_Distortion', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'dist';
			var auto = null;
			var getvalue = function ( q ) {
				var value;

				if (auto) {
					value = auto.GetValue ();
				} else {
					var input = q.el_body.getElementsByTagName('input')[0];
					value = [{val: input.value / 1}];
				}

				return (value);
			};

			var x = new PKAudioFXModal({
			  id    : filter_id,
			  title : 'Apply Distortion to selected range',
			  clss  : 'pk_bigger',
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			preview: function ( q ) {
				var val = getvalue (q);
				app.fireEvent ('RequestActionFX_PREVIEW_DISTORT', val);
			},

			  buttons: [
				{
					title:'Apply',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {		
						var val = getvalue (q);
						app.fireEvent ('RequestActionFX_DISTORT', val);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row"><label class="pk_line">Gain</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="2.0" step="0.01" value="0.5" />'+
				'<span class="pk_val">0.5</span></div>',
				// '<a style="float:left;margin:0" class="pk_modal_a_bottom">Volume Graph</a></div>',

			  setup:function( q ) {
				var inputs = q.el_body.getElementsByTagName ('input');
				for (var i = 0; i < inputs.length; ++i)
				{
				  inputs[i].oninput = function () {
					  var span = this.parentNode.getElementsByTagName ('span')[0];
					  span.innerHTML = (this.value/1).toFixed (2);
					  
					  updateFilter ();
				  };
				}

				//var graph_btn = q.el_body.getElementsByTagName  ('a')[0];
				//graph_btn.onclick = function () {
				//	auto = new PKAudioEditor._deps.FxAUT (app, q);
				//};

				function updateFilter() {
					var val = getvalue (q);
					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', val);
				}

				app.fireEvent ('RequestPause');
				app.ui.InteractionHandler.checkAndSet (modal_name);
				app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;
					q.Destroy ();
				}, [27]);
				// ---
			  }
			}, app);
			x.Show();
		});


		app.listenFor ('RequestActionFXUI_Reverb', function () {
			app.fireEvent ('RequestSelect', 1);

			var filter_id = 'reverb';

			var x = new PKAudioFXModal({
			  id    : filter_id,
			  title : 'Apply Reverb to selected range',
			  clss  : 'pk_bigger',
			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
			},
			presets:[
				{name:'Classic',val:'0.3,0.4,0.4'},
				{name:'Spacey',val:'3.0,0.6,0.3'}
			],
			custom_pres:custom_presets.Get (filter_id),
			preview: function ( q ) {
				var inputs = q.el_body.getElementsByTagName('input');
				var val = {
					time:      inputs[0].value/1,
					decay:     inputs[1].value/1,
					mix:       inputs[2].value/1
				};
				app.fireEvent ('RequestActionFX_PREVIEW_REVERB', val);
			},

			  buttons: [
				{
					title:'Apply',
					clss:'pk_modal_a_accpt',
					callback: function( q ) {		
						var inputs = q.el_body.getElementsByTagName('input');
						var val = {
							time:     inputs[0].value/1,
							decay:  inputs[1].value/1,
							mix:       inputs[2].value/1
						};
						
						app.fireEvent ('RequestActionFX_REVERB', val);

						q.Destroy ();
					}
				}
			  ],
			  body:'<div class="pk_row"><label class="pk_line">Time</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="3.0" step="0.01" value="0.3" />'+
				'<span class="pk_val">0.3</span></div>'+

				'<div class="pk_row"><label class="pk_line">Decay</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="3.0" step="0.01" value="0.05" />'+
				'<span class="pk_val">0.05</span></div>'+

				'<div class="pk_row"><label class="pk_line">Wet</label>' + 
				'<input class="pk_horiz" type="range" min="0.0" max="1.0" step="0.01" value="0.6" />'+
				'<span class="pk_val">0.6</span></div>',
			  setup:function( q ) {
				var inputs = q.el_body.getElementsByTagName ('input');
				for (var i = 0; i < inputs.length; ++i)
				{
				  inputs[i].oninput = function () {
					  var span = this.parentNode.getElementsByTagName ('span')[0];
					  span.innerHTML = (this.value/1).toFixed (3);
					  
					  updateFilter ();
				  };
				}
				
				function updateFilter() {
					var inputs = q.el_body.getElementsByTagName('input');
					var val = {
						time:     inputs[0].value/1,
						decay:  inputs[1].value/1,
						mix:       inputs[2].value/1
					};

					app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', val);
				}

				app.fireEvent ('RequestPause');
				app.ui.InteractionHandler.checkAndSet (modal_name);
				app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;
					q.Destroy ();
				}, [27]);
				// ---
			  }
			}, app);
			x.Show();
		});

		// -----

		var current_tags = null;
		app.listenFor ('RequestActionID3', function (flag, new_tags) {
				if (flag) {
					current_tags = new_tags;
					return ;
				}

				var modal_id = '_id3';

				var render_tags = function ( el, tags ) {
					var str = '<div style="margin-top:18px">';

					str += '<div><span class="pk_id3ttl">Artist</span><span>' + (tags.artist || '-') + '</span></div>';
					str += '<div><span class="pk_id3ttl">Title</span><span>' + (tags.title || '-') + '</span></div>';
					str += '<div><span class="pk_id3ttl">Album</span><span>' + (tags.album || '-') + '</span></div>';
					str += '<div><span class="pk_id3ttl">Year</span><span>' + (tags.year || '-') + '</span></div>';
					str += '<div><span class="pk_id3ttl">Genre</span><span>' + (tags.genre || '-') + '</span></div>';
					str += '<div style="max-width:700px"><span class="pk_id3ttl">Comment</span><span>' + ((tags.comment||{}).text || '-') + '</span></div>';
					str += '<div><span class="pk_id3ttl">Track</span><span>' + (tags.track || '-') + '</span></div>';
					str += '<div style="max-width:700px"><span class="pk_id3ttl">Lyrics</span><span>' + ((tags.lyrics||{}).lyrics || '-') + '</span></div>';

					if ('picture' in tags)
					{
						var image = tags.picture;
						var base64str = '';
						for (var i = 0; i < image.data.length; ++i) {
							base64str += String.fromCharCode (image.data[i]);
						}

						str += '<div><span style="float:left" class="pk_id3ttl">Cover</span>' +
								'<span><img style="max-width:340px" src="data:' + 
								image.format + ';base64,' + window.btoa(base64str) + '"/></span></div>';
					}

					el.innerHTML = str + '</div>';
				};

				new PKSimpleModal({
				  title:'ID3 Metatags Explorer',

				  ondestroy: function( q ) {
				  	app.ui.InteractionHandler.forceUnset (modal_id);
					app.ui.KeyHandler.removeCallback (modal_id + 'esc');
				  },

				  buttons:[
				  ],
				  body:'<input type="file" accept="audio/*" />'+
				  	'<div class="pk_row pk_ttx">Choose file to view audio metatags!</div>',
				  setup:function( q ) {
				  		var input  = q.el_body.getElementsByTagName ('input')[0];
				  		var txt_el = q.el_body.getElementsByClassName ('pk_ttx')[0];

				  		input.onchange = function ( e ) {
							var reader = new FileReader();
							
							reader.onload = function() {
								var tags = PKAudioEditor.engine.ID3 (this.result);

								if (!tags) {
									txt_el.innerHTML = '<div style="padding:30px 0">No audio metadata found...</div>';
								} else {
									render_tags (txt_el, tags);
								}
							};

							reader.readAsArrayBuffer(this.files[0]);
				  		};

				  		if (current_tags) {
				  			render_tags (txt_el, current_tags);
				  		}

					  	app.ui.InteractionHandler.forceSet (modal_id);
						app.ui.KeyHandler.addCallback (modal_id + 'esc', function ( e ) {
							if (!app.ui.InteractionHandler.check (modal_id)) return ;
							q.Destroy ();
						}, [27]);
				  }
				}).Show();

		});


		// ---- save presets
		app.listenFor ('RequestSavePreset', function () {
			if (!curr_filter_ui) return ;

			var el = curr_filter_ui.el_body;
			if (!el) return ;

			var escapeHtml = function (text) {
			  var map = {
			    '&': '&amp;',
			    '<': '&lt;',
			    '>': '&gt;',
			    '"': '&quot;',
			    "'": '&#039;'
			  };

			  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
			};

			// check if the preset is custom
			var is_new = true;
			var custom_id = null;
			var el_presets = curr_filter_ui.el_presets;
			var sel_opt = el_presets.options[el_presets.selectedIndex];

			var inputs = el.querySelectorAll('select, input');
			var preset_obj = {
				target:curr_filter_ui.id,
				name:'My Preset',
				id:curr_filter_ui.id + '_' + ((Math.random() * 99) >> 0),
				date:Date.now(),
				val:''
			};

			if (sel_opt && sel_opt.getAttribute('data-custom'))
			{
				is_new = false;
				custom_id = sel_opt.getAttribute('data-custom');
			}

			// ----------
			for (var i = 0; i < inputs.length; ++i)
			{
				if (inputs[i].type === 'checkbox') {
					preset_obj.val += (inputs[i].checked ? '1' : '0') + ',';
				}
				else {
					preset_obj.val += inputs[i].value + ',';
				}
			}

			if (preset_obj.val.length > 0)
			{
					preset_obj.val = preset_obj.val.substring(0, preset_obj.val.length - 1);

					// open ui for setting preset name
					var modal_id = '_ctPr';
					var default_txt = '';

					var btn_delete = {};
					var btn_update = {};
					var custom_obj = null;

					if (!is_new)
					{
							custom_obj = custom_presets.GetSingle (preset_obj.target, custom_id);
							default_txt = 'value="' + custom_obj.name + '"';

							btn_delete = {
									title:'Delete',
									clss:'pk_modal_a_red',
									callback: function( q ) {

										OneUp ('Successfully deleted preset!', 1400);

										var custom = custom_presets.Del (preset_obj.target, custom_id);
										app.fireEvent ('DidSetPresets', preset_obj.target, custom);

										q.Destroy ();
										// -
									}
							};

							btn_update = {
									title:'Update',
									callback: function( q ) {

										if (custom_obj)
										{
											var input = q.el_body.getElementsByTagName ('input')[0];
											var value = input.value.trim ();

											value = escapeHtml (value);

											if (value.length > 0)
											{
												OneUp ('Successfully updated preset!', 1400);

												// add preset to localStorage
												custom_obj.name = value;
												custom_obj.val = preset_obj.val;

												custom_presets.Save ();

												var arr = custom_presets.Get (preset_obj.target);
												app.fireEvent ('DidSetPresets', preset_obj.target, arr);

												q.Destroy ();
											}
											else
											{
												OneUp ('Name is too short...', 1200);
											}
										}
										// -
									}
							};
					}

					var title = 'Save Custom Preset for filter "' + curr_filter_ui.id + '"';
					if (!is_new) {
						var cname = custom_obj.name;
						title = 'Edit Custom Preset "' + cname + '", for filter "' + curr_filter_ui.id + '"';
					}

					new PKSimpleModal({
					  title:title,
					  
					  ondestroy: function( q ) {
					  	app.ui.InteractionHandler.forceUnset (modal_id);

						app.ui.KeyHandler.removeCallback (modal_id + 'esc');
						app.ui.KeyHandler.removeCallback (modal_id + 'ent');
					  },

					  buttons:[
						{
							title: is_new ? 'Save' : 'Save As New',
							clss:'pk_modal_a_accpt',
							callback: function( q ) {
								var input = q.el_body.getElementsByTagName ('input')[0];
								var value = input.value.trim ();

								value = escapeHtml (value);

								if (value.length > 0)
								{
									OneUp ('Successfully saved preset!', 1400);

									// add preset to localStorage
									preset_obj.name = value;

									var custom = custom_presets.Set (preset_obj.target, preset_obj);

									app.fireEvent ('DidSetPresets', preset_obj.target, custom);
									app.fireEvent ('RequestSetPresetActive', preset_obj.target, preset_obj.id);

									q.Destroy ();
								}
								else
								{
									OneUp ('Name is too short...', 1200);
								}
								// -
							}
						},

						btn_update,
						btn_delete
					  ],
					  body:'<label for="k07">Preset Name</label>' + 
						'<input style="min-width:340px" maxlength="16" placeholder="Please type a name, eg: My Preset" ' + default_txt + ' class="pk_txt" type="text" id="k07" />',
					  setup:function( q ) {
					  	  	// app.fireEvent ('RequestPause');

						  	app.ui.InteractionHandler.forceSet (modal_id);

							app.ui.KeyHandler.addCallback (modal_id + 'esc', function ( e ) {
								if (!app.ui.InteractionHandler.check (modal_id)) return ;

								q.Destroy ();
							}, [27]);

							app.ui.KeyHandler.addCallback (modal_id + 'en', function ( e ) {
								if (!app.ui.InteractionHandler.check (modal_id)) return ;

								q.els.bottom[0].click ();
							}, [13]);

							setTimeout(function() {
								if (q.el) {
									var inp = q.el.getElementsByTagName('input')[0];
									inp.focus ();

									if (inp.value.length > 0) {
										inp.selectionStart = inp.selectionEnd = inp.value.length;
									}
								}
							},20);
					  }
					}).Show();
					// ---
			}

			// document.querySelector('.pk_modal_main').getElementsByTagName('input')[0].value 
		});









		// ---- windows ----

		var eq_win = {};

		app.listenFor ('WillUnload', function () {
			var cur;

			for (var k in eq_win) {
				cur = eq_win[k];
				if (cur && !cur.type) {
					cur.destroy && cur.destroy ();
				}
			}

			eq_win = {};
		});

		app.listenFor ('RequestDragI', function ( url ) {
			if (app.isMobile) {
				alert ('unsupported on mobile');
				return ;
			}

			var cur_win = eq_win[url];

			if (!cur_win || !cur_win.el) return ;

			cur_win.el.style.pointerEvents = 'none';
			cur_win.el.style.zIndex = '9';

			cur_win.win.document.body.classList.add ('c');

			var el_back = document.createElement ('div');
			el_back.className = 'pk_modal_back';
			document.body.appendChild (el_back);

			var is_drag = true;
			var x = 0;
			var y = 0;
			var moved = 2;

			var top = parseInt (cur_win.el.style.top) || 0;
			var left = parseInt (cur_win.el.style.left) || 0;

			app.ui.InteractionHandler.on = true;

			setTimeout (function() {
				if (cur_win && cur_win.el)
				{
					cur_win.el.style.display = 'none';
					setTimeout(function() {
						cur_win.el.style.display = 'block';					
					},0);
					el_back.focus ();
				}
			}, 60);

			el_back.onmousemove = function ( e ) {
				if (!is_drag) return ;

				if (x === 0 && y === 0)
				{
					x = e.pageX;
					y = e.pageY;

					return ;
				}

				var dist_x = e.pageX - x;
				var dist_y = e.pageY - y;

				top  += dist_y;
				left += dist_x;

				cur_win.el.style.top  = top + 'px';
				cur_win.el.style.left = left + 'px';

				x = e.pageX;
				y = e.pageY;

				--moved;
			};

			el_back.onmouseup = function ( e ) {
				is_drag = false;

				cur_win.win.document.body.classList.remove ('c');
				cur_win.el.style.pointerEvents = '';
				cur_win.el.style.zIndex = '7';

				app.ui.InteractionHandler.on = false;

				document.body.removeChild (el_back);

				if (e.type === 'mouseup')
				{
					if (moved > 0)
					{
						cur_win.el.style.top  = '0px';

						var ch = app.ui.BarBtm.el.childNodes;

						var lw = 0;
						for (var ji = 0; ji < ch.length; ++ji) {
							if (cur_win.el === ch[ji]) break;
							lw += ch[ji].clientWidth + 18;
						}

						cur_win.el.style.left = lw + 'px';
						// ----
					}
					// check if we didn't move - in that return 
				}

				el_back.onmousemove = null;
				el_back.onmouseleave = null;
				el_back.onmouseup = null;
				el_back = null;
			};

			el_back.onmouseleave = function ( e ) {
				el_back.onmouseup ( e );
				app.fireEvent ('RequestShowFreqAn', url, [ [(window.screenLeft + e.pageX)||0, (window.screenTop + e.pageY)||0], 0]);
			};
		});

		app.listenFor ('RequestShowFreqAn', function ( url, args_arr ) {

			if (app.isMobile) {
				alert ('Currently unsupported on mobile');
				return ;
			}

			var toggle = args_arr[ 0 ];
			var type   = args_arr[ 1 ];
			var title = 'Frequency Analysis';
			var curr_win = eq_win[ url ];

			if (url === 'sp') title = 'Spectrum Analysis';

			var toggled = false;
			if (curr_win && toggle)
			{
				var ext = false;
				if (curr_win.type === type) ext = true;

				curr_win.destroy ();
				curr_win = null;

				eq_win[url] = null;

				if (ext) return ;
				toggled = true;
			}

			var freq_cb = function (_, freq) {
				curr_win && curr_win.win.update && curr_win.win.update (freq);
			};

			var setEvents = function ( obj, _url ) {
				obj.win.destroy = function () {
					app.stopListeningFor ('DidAudioProcess', freq_cb);
					app.fireEvent ('DidToggleFreqAn', _url, null);

					// if (obj && obj.type === undefined) {
					if (obj && obj === eq_win[url]) {
						eq_win[url] = null;
					}

					var stop = true;
					for (var k in eq_win) {
						if (eq_win[k]) {
							stop = false;
							break;
						}
					}

					if (stop) app.engine.wavesurfer.backend.logFrequencies = false;
				};

				app.listenFor ('DidAudioProcess', freq_cb);
				app.fireEvent ('DidToggleFreqAn', _url, curr_win);
				app.engine.wavesurfer.backend.logFrequencies = true;
			};

			if (!type)
			{
				var makePopup = function ( dat ) {
					var extra = '';
					if (dat && dat[0]) {
						dat[0] = Math.max (0, dat[0] - 200) >> 0;
						dat[1] = Math.max (0, dat[1]) >> 0;

						extra = ',left=' + dat[0] + ',top=' + dat[1];
					}

					var wnd = window.open ('/' + url + '.html', title, "directories=no,titlebar=no,toolbar=no,"+
							"location=no,status=no,menubar=no,scrollbars=no,resizable=no,width=600,height=188" + extra);

					if (!wnd) {
						OneUp ('Please allow pop-ups for AudioMass!', 3600, 'pk_r');
						return ;
					}

					eq_win[url] = {
						type : type,
						el   : null,
						win  : wnd,
						destroy : function () {
							wnd && wnd.close && wnd.close ();
						}
					};

					curr_win = eq_win[url];

					// wnd.moveTo(500, 100);

					setEvents ( curr_win, url );
				};

				if (!toggled) makePopup (toggle);
				else setTimeout(function(){makePopup (toggle)}, 130);
			}
			else if (type === 1)
			{
				var iframe = document.createElement ('iframe');
				iframe.className = 'pk_frqan';
				iframe.id = 'pk_fr' + url;

				if (app.ui.BarBtm.on) {
					var ch = app.ui.BarBtm.el.childNodes;
					var lw = 0;
					for (var ji = 0; ji < ch.length; ++ji) {
						lw += ch[ji].clientWidth + 18;
					}

					iframe.style.left = lw + 'px';
				}

				app.ui.BarBtm.el.appendChild( iframe );
				app.ui.BarBtm.Show ();

				eq_win[url] = {
					type : type,
					el   : iframe,
					win  : null,
					destroy : function () {
						iframe.parentNode.removeChild ( iframe );
						iframe = null;

						var ch = app.ui.BarBtm.el.childNodes; 
						if (ch.length === 0) {
							app.ui.BarBtm.Hide ();
							return ;
						}

						setTimeout(function () {
							var lw = 0;
							for (var ji = 0; ji < ch.length; ++ji) {
								if (!ch[ji] || !ch[ji].parentNode) continue;

								if (ch[ji].offsetTop > -20) {
									ch[ji].style.top = '0px';
									ch[ji].style.left = lw + 'px';
								}

								lw += ch[ji].clientWidth + 18;
							}
						},198);
						// --
					}
				};

				curr_win = eq_win[url];

				iframe.onload = function (e) {
					if (curr_win && curr_win.type === type)
					{
						curr_win.win = iframe.contentWindow;
						setEvents ( curr_win, url );
					}
				};
				iframe.src = '/' + url + '.html?iframe=1';
			}
			// ---

		});

		// ----
	};

	PKAE._deps.uifx = PKUI_FX;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';

	// 
	// MAIN UI CLASS
	var PKUI = function( app ) {
		var q = this;

		this.el = app.el;

		// if mobile add proper class
		this.el.className += ' pk_app' + (app.isMobile ? ' pk_mob' : '');
		
		// hold refferences to the event functions
		this.fireEvent = app.fireEvent;
		this.listenFor = app.listenFor;

		// keep track of the active UI element
		this.InteractionHandler = {
			on  : false,
			by  : null,
			arr : [],

			check: function ( _name ) {
				if (this.on && this.by !== _name) {
					return (false);
				}
				return (true);
			},

			checkAndSet: function ( _name ) {
				if (!this.check (_name))
					return (false);

				this.on = true;
				this.by = _name;

				return (true);
			},

			forceSet: function ( _name ) {
				if (this.on)
				{
					this.arr.push ({
						on: this.on,
						by: this.by
					});
				}

				this.on = true;
				this.by = _name;
			},

			forceUnset: function ( _name ) {
				if (this.check (_name))
				{
					var prev = this.arr.pop ();
					if (prev)
					{
						this.on = prev.on;
						this.by = prev.by;
					}
					else
					{
						this.on = false;
						this.by = null;
					}
				}
				// ---
			}
		};

		if (app.isMobile)
		{
			d.body.className = 'pk_stndln';
			var fxd = d.createElement ('div');
			fxd.className = 'pk_fxd';
			fxd.appendChild (this.el);

			d.body.appendChild (fxd);

			_makeMobileScroll (this);
		}

		this.KeyHandler = new app._deps.keyhandler ( this ); // initializing keyhandler
		this.TopHeader  = new _makeUITopHeader ( _topbarConfig ( app ), this ); // topmost menu
		this.Toolbar    = new _makeUIToolbar ( this ); // main toolbar and controls
		this.footer     = new _makeUIMainView ( this, app );
		this.BarBtm     = new _makeUIBarBottom (this, app);

		this.Dock      = function ( id, arg1, arg2 ) {
			app.fireEvent (id, arg1, arg2);
		};

		app.listenFor ('ShowError', function( message ) {
			new PKSimpleModal ({
				title : 'Oops! Something is not right',
				clss:'pk_modal_anim',
				ondestroy : function( q ) {
					app.ui.InteractionHandler.on = false;
					app.ui.KeyHandler.removeCallback ('modalTempErr');
				},
				buttons:[],
				body:'<p>' + message + '</p>',
				setup:function( q ) {
					app.fireEvent ('RequestPause');
					app.fireEvent( 'RequestRegionClear');

					app.ui.InteractionHandler.checkAndSet ('modal');
					app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
						q.Destroy ();
					}, [27]);
				}
			}).Show ();
		});

		app.listenFor ('RequestKeyDown', function ( key ) {
			q.KeyHandler.keyDown ( key, null );
			q.KeyHandler.keyUp ( key );
		});
	};


	//top bar config list
	function _topbarConfig ( app, ui ) {
		return [
			{
				name:'File',
				children : [
					{
						name: 'Export / Download',
						action: function () {
								new PKSimpleModal({
								  title:'Export / Download',

								  ondestroy: function( q ) {
									app.ui.InteractionHandler.on = false;
									app.ui.KeyHandler.removeCallback ('modalTemp');
								  },

								  buttons:[
									{
										title:'Export',
										clss:'pk_modal_a_accpt',
										callback: function( q ) {
											var input = q.el_body.getElementsByTagName('input')[0];
											var value = input.value.trim();
											
											var format = 'mp3';
											var kbps = 128;
											var export_sel = false;
											var stereo     = false;
											
											var radios = q.el_body.getElementsByClassName ('pk_check');
											var l = radios.length;
											while (l-- > 0) {
												if (radios[l].checked)
												{
													if (radios[l].name == 'frmtex')
													{
														format = radios[l].value;
													}
													else if (radios[l].name == 'xport')
													{
														if (radios[l].value === 'sel')
														{
															var region = app.engine.wavesurfer.regions.list[0];
															if (!region) export_sel = false;
															else export_sel = [region.start, region.end];
														}
													}
													else if (radios[l].name == 'chnl')
													{
														if (radios[l].value === 'stereo')
														{
															stereo = true;
														}
													}
													else
													{
														kbps = radios[l].value / 1;
													}
												}
											}

											if (format == 'flac')
											{
												kbps = document.getElementById('flac-comp').value / 1;
											}

											app.engine.DownloadFile ( value, format, kbps, export_sel, stereo );
											q.Destroy ();
											// -
										}
									}
								  ],
								  body:'<div class="pk_row"><label for="k0">File Name</label>' + 
									'<input style="min-width:250px" placeholder="mp3 filename" value="audiomass-output.mp3" ' +
									'class="pk_txt" type="text" id="k0" /></div>'+

									'<div class="pk_row" id="frmtex" style="padding-bottom:4px"><label style="display:inline">Format</label>'+
									'<input type="radio" class="pk_check" id="k01" name="frmtex" checked value="mp3">'+
									'<label for="k01">mp3</label>' +
									'<input type="radio" class="pk_check" id="k02" name="frmtex" value="wav">'+  
									'<label for="k02">wav <i>(44100hz)</i></label>' +
									'<input type="radio" class="pk_check" id="k03" name="frmtex" value="flac">'+  
									'<label for="k03">flac</i></label>' +
									'</div>' +

									'<div class="pk_row" id="frmtex-mp3"><input type="radio" class="pk_check" id="k1" name="rdslnc" checked value="128">'+ 
									'<label  for="k1">128kbps</label>' +
									'<input type="radio" class="pk_check"  id="k2" name="rdslnc" value="192">'+
									'<label for="k2">192kbps</label>'+
									'<input type="radio" class="pk_check"  id="k3" name="rdslnc" value="256">'+
									'<label for="k3">256kbps</label></div>'+

									'<div class="pk_row" style="display:none" id="frmtex-flac">'+
									'<label>Flac: Compression Level</label>'+
									'<input type="range" class="pk_horiz" min="0" max="8" step="1" value="5" id="flac-comp">'+
									'<span class="pk_val" style="float:left;margin-left:15px">5</span></div>' +

									'<div class="pk_row" style="padding-bottom:5px">' +
									'<input type="radio" class="pk_check" id="k6" name="chnl" checked value="mono">'+
									'<label for="k6">Mono</label>'+
									'<input type="radio" class="pk_check pk_stereo" id="k7" name="chnl" value="stereo">'+
									'<label for="k7">Stereo</label>'+
									'</div>'+
									'<div class="pk_row">' + 
									'<input type="radio" class="pk_check" id="k4" name="xport" checked value="whole">'+
									'<label for="k4">Export whole file</label>'+
									'<input type="radio" class="pk_check" id="k5" name="xport" value="sel">'+
									'<label class="pk_lblmp3" for="k5">Export Selection Only</label></div>',
									
								  setup:function( q ) {
								  		var wv = PKAudioEditor.engine.wavesurfer;
								  		//console.log( document.getElementById('frmtex') );

								  		// if no region
										var region = wv.regions.list[0];
										if (!region) {
											var lbl = q.el_body.getElementsByClassName('pk_lblmp3')[0];
											lbl.className = 'pk_dis';
										}

										var chan_num = wv.backend.buffer.numberOfChannels;
										if (chan_num === 2) {
											q.el_body.getElementsByClassName('pk_stereo')[0].checked = true;
										}

								  		app.fireEvent ('RequestPause');
										app.ui.InteractionHandler.checkAndSet ('modal');
										app.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
											q.Destroy ();
										}, [27]);

										setTimeout(function() {
											if (!q.el) return ;
											var inputtxt = q.el.getElementsByTagName('input')[0];
											inputtxt && inputtxt.select ();

									  		var format = document.getElementById('frmtex');
									  		var mp3conf = document.getElementById('frmtex-mp3');
									  		var flacconf = document.getElementById('frmtex-flac');

											document.getElementById('flac-comp').oninput = function() {
												this.parentNode.getElementsByTagName('span')[0].innerText = this.value;
											};

									  		format && format.addEventListener('change', function(e){
												var inputs = this.getElementsByTagName('input');
												for (var i = 0; i < inputs.length; ++i)
												{
													if (inputs[i].checked)
													{
														if (inputs[i].value === 'mp3')
														{
															mp3conf.style.display = 'block';
															flacconf.style.display = 'none';
															inputtxt.value = inputtxt.value.replace('.wav', '.mp3').replace('.flac', '.mp3');
														}
														else if (inputs[i].value === 'flac')
														{
															mp3conf.style.display = 'none';
															flacconf.style.display = 'block';
															inputtxt.value = inputtxt.value.replace('.mp3', '.flac').replace('.wav', '.flac');
														}
														else
														{
															mp3conf.style.display = 'none';
															flacconf.style.display = 'none';
															inputtxt.value = inputtxt.value.replace('.mp3', '.wav').replace('.flac', '.wav');
														}
													}
												}
									  		}, false);

										},20);
								  }
								}).Show();
						},
						clss: 'pk_inact',
						setup: function ( obj ) {
							obj.setAttribute('data-id', 'dl');

							app.listenFor ('DidUnloadFile', function () {
								obj.classList.add ('pk_inact');
							});
							app.listenFor ('DidLoadFile', function () {
								obj.classList.remove ('pk_inact');
							});
						}
					},

					{
						name: 'Load from Computer',
						type: 'file',
						action: function ( e ) {
							app.fireEvent ('RequestLoadLocalFile');
						}
					},
					
					{
						name: 'Load Sample File',
						action: function ( e ) {
							app.engine.LoadSample ();
						}	
					},
					
					{
						name: 'Load From URL',
						action: function ( e ) {
								new PKSimpleModal({
								  title:'Load audio from remote url',
								  
								  ondestroy: function( q ) {
									app.ui.InteractionHandler.on = false;
									app.ui.KeyHandler.removeCallback ('modalTemp');
									app.ui.KeyHandler.removeCallback ('modalTempEnter');
								  },
								  
								  buttons:[
									{
										title:'Load Asset',
										clss:'pk_modal_a_accpt',
										callback: function( q ) {
											var input = q.el_body.getElementsByTagName('input')[0];
											var value = input.value.trim();

											function isURL ( str ) {
											    var pattern = new RegExp('^((https?:)?\\/\\/)?'+ // protocol
											        '(?:\\S+(?::\\S*)?@)?' + // authentication
											        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
											        '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
											        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
											        '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
											        '(\\#[-a-z\\d_]*)?$','i'); // fragment locater
											    if (!pattern.test(str)) {
											        return false;
											    } else {
											        return true;
											    }
											};
											
											if (isURL (value))
											{
												// LOAD FROM URL....
												app.engine.LoadURL ( value );
												q.Destroy ();
											}
											else
											{
												OneUp ('Invalid URL entered', 1100);
											}
											// -
										}
									}
								  ],
								  body:'<label for="k00">Insert url</label>' + 
									'<input style="min-width:250px" placeholder="Please insert url" class="pk_txt" type="text" id="k00" />',
								  setup:function( q ) {

								  	  app.fireEvent ('RequestPause');
									  app.ui.InteractionHandler.checkAndSet ('modal');
										app.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
											q.Destroy ();
										}, [27]);

										app.ui.KeyHandler.addCallback ('modalTempEnter', function ( e ) {
											q.els.bottom[0].click ();
										}, [13]);

										setTimeout(function() {
											q.el && q.el.getElementsByTagName('input')[0].focus ();
										},20);
								  }
								}).Show();
						}
						// ---
					},

					{
						name: 'New Recording',
						action: function ( e ) {
							app.fireEvent('RequestActionNewRec');
						}
					},

					{
						name: 'Save Draft Locally',
						clss: 'pk_inact',
						action: function ( e ) {
							if (!app.engine.is_ready) return ;

							var saving = function ( type, name ) {
								var buff = app.engine.wavesurfer.backend.buffer;

								if (type === 'copy') buff = app.engine.GetCopyBuff ();
								else if (type === 'sel') buff = app.engine.GetSel ();

								var func = function ( fls ) {								
									var rr = Math.random().toString(36).substring(7);

									fls.SaveSession (buff, rr, name);
									app.stopListeningFor ('DidOpenDB', func);
								};

								app.listenFor ('DidOpenDB', func);

								if (!app.fls.on) app.fls.Init (function(err){if(err){alert("db error")}});
								else app.fireEvent ('DidOpenDB', app.fls);
							};

							// modal that asks for - full file, selection, copy buffer
							new PKSimpleModal ({
								title : 'Save Local Draft of...',

								ondestroy : function( q ) {
									app.ui.InteractionHandler.on = false;
									app.ui.KeyHandler.removeCallback ('modalTempErr');
								},

								buttons:[
									{
										title:'Save',
										clss:'pk_modal_a_accpt',
										callback: function( q ) {
											var type = 'whole';
											var input = q.el_body.getElementsByTagName ('input');
											var name = input[ input.length - 1 ].value;
											if (name) {
												name = name.trim ();
												if (name.length >= 100) name = name.substr(0,99).trim();
												if (name.length === 0) name = null;
											}
											else {
												name = null;
											}

											for (var i = 0; i < input.length; ++i) {
												if (input[i].checked)
												{
													type = input[i].value;
													break;
												}
											}

											saving (type, name);

											q.Destroy ();
										}
									}
								],

								body:'<p>Please choose source...</p>' +
									'<div class="pk_row"><input type="radio" class="pk_check" id="sl1" name="rdslnc" checked value="whole">'+ 
									'<label style="vertical-align:top" for="sl1">Whole Track</label>' +
									'<input type="radio" class="pk_check"  id="sl2" name="rdslnc" value="sel">'+
									'<label style="vertical-align:top" class="pk_lblsel" for="sl2">Selection'+
									'<i style="display:block;font-size:11px;margin-top:-5px"></i></label>'+
									'<input type="radio" class="pk_check"  id="sl3" name="rdslnc" value="copy">'+
									'<label style="vertical-align:top" class="pk_lblsel2" for="sl3">"Copy" clipboard/buffer</label></div>'+

									'<div class="pk_row"><label for="slk0">Draft Name</label>' + 
									'<input style="min-width:250px" placeholder="(optional) filename" maxlength="100" ' +
									'class="pk_txt" type="text" id="slk0" /></div>',

								setup:function( q ) {
									// check if selection
							  		var wv = app.engine.wavesurfer;

							  		// if no region
									var region = wv.regions.list[0];
									var lblr = q.el_body.getElementsByClassName('pk_lblsel')[0];
									if (!region) {
										lblr.className = 'pk_dis';
									} else {
										q.el_body.getElementsByClassName('pk_check')[1].checked = true;
										lblr.childNodes[1].textContent = app.ui.formatTime(region.start) + ' to ' + app.ui.formatTime(region.end);
									}

									// if no copy buffer
									var copy = app.engine.GetCopyBuff ();
									if (!copy) {
										var lbl = q.el_body.getElementsByClassName('pk_lblsel2')[0];
										lbl.className = 'pk_dis';
									}

									if (!app.isMobile)
									{
										setTimeout(function() {
											q.el && q.el.getElementsByClassName('pk_txt')[0].focus ();
										},20);
									}

									app.fireEvent ('RequestPause');

									app.ui.InteractionHandler.checkAndSet ('modal');
									app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
										q.Destroy ();
									}, [27]);
								}
							}).Show ();

							return ;
						},

						setup: function ( obj ) {
							app.listenFor ('DidUnloadFile', function () {
								obj.classList.add ('pk_inact');
							});
							app.listenFor ('DidLoadFile', function () {
								obj.classList.remove ('pk_inact');
							});

							app.listenFor ('DidStoreDB', function ( obj, e ) {
									var name = obj.id;
									var txt = '<div style="padding:2px 0">id: ' + name + '</div>'+
										'<div style="padding:2px 0"><span>durr: ' + obj.durr + 's</span>'+
										'&nbsp;&nbsp;&nbsp;'+
										'<span>chan: ' + (obj.chans === 1 ? 'mono' : 'stereo') + '</span></div>'+
										'<div style="padding:2px 0"><img src="' + obj.thumb + '" /></div>';

									new PKSimpleModal ({
										title : 'Succesfully Stored',

										ondestroy : function( q ) {
											app.ui.InteractionHandler.on = false;
											app.ui.KeyHandler.removeCallback ('modalTempErr');
										},

										buttons:[
											{
												title:'OPEN IN NEW WINDOW',
												callback: function( q ) {
													window.open ( window.location.pathname + '?local=' + name);

													q.Destroy ();
												}
											}
										],

										body:'<p>Open in new window?</p>' + txt,
										setup:function( q ) {
											app.fireEvent ('RequestPause');
											app.fireEvent( 'RequestRegionClear');

											app.ui.InteractionHandler.checkAndSet ('modal');
											app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
												q.Destroy ();
											}, [27]);
										}
									}).Show ();
							});
						}	
					},

					{
						name: 'Open Local Drafts',
						action: function ( e ) {

							var datenow = new Date ();
							var time_ago = function ( arg ) {
							    var a = (datenow - arg) / 1E3 >> 0;
							    if (59 >= a) return datenow = 1 < a ? 's' : '', a + ' second' + datenow + ' ago';
							    if (60 <= a && 3599 >= a) return a = Math.floor(a / 60), a + ' minute' + (1 < a ? 's' : '') + ' ago';
							    if (3600 <= a && 86399 >= a) return a = Math.floor(a / 3600), a + ' hour' + (1 < a ? 's' : '') + ' ago';
							    if (86400 <= a && 2592030 >= a) return a = Math.floor(a / 86400), a + ' day' + (1 < a ? 's' : '') + ' ago';
							    if (2592031 <= a) return a = Math.floor(a / 2592E3), a + ' month' + (1 < a ? 's' : '') + ' ago';
							};
							var func = function ( fls ) {								
								fls.ListSessions(function( ret ) {

									var msg = '';
									if (ret.length === 0) {
										msg += 'No drafts found...';
									}
									else
									{
										for (var i = 0; i < ret.length; ++i)
										{
											var curr = ret[i];
											var date = new Date(curr.created);
											var datestr =  (date.getMonth()+1) + '/' + 
															date.getDate() + '/' + 
															date.getFullYear() + "  " + 
															date.getHours() + ":" + 
															date.getMinutes() + ":" + 
															date.getSeconds();
											var agostr = time_ago (date);
											var filename = curr.name || '-';
											var duration = curr.durr;
											var thumb    = curr.thumb;
											var chns     = (curr.chans === 1 ? 'mono' : 'stereo');

											msg += '<div id="pk_' + curr.id + '" class="pk_lcldrf">'+
											'<div style="padding-bottom:2px"><span><i class="pk_i">name:</i>' + filename + '</span></div>' +
											'<div><span class="pk_lcls"><i class="pk_i">id:</i><strong>' + curr.id + '</strong><br/><i class="pk_i">chn:</i>'+ chns +'</span>' + 
											'<span class="pk_lcls" style="width:50%;text-align:center"><i class="pk_i">date:</i><span>' + datestr + '<br/>'+ agostr +'</span></span>' +
											'<span style="text-align:right;float:right" class="pk_lcls"><i class="pk_i">durr:</i>' + duration + 's</span></div><div>' +

											'<img class="pk_lcli" src="' + thumb + '" />' +
											'<a class="pk_lcla2" onclick="PKAudioEditor.fireEvent(\'LoadDraft\',\'' + curr.id + '\', 3);">PLAY</a>' +
											'<a class="pk_lcla" onclick="PKAudioEditor.fireEvent(\'LoadDraft\',\'' + curr.id + '\');">Open</a>';

											if (app.engine.is_ready) {
												msg += '<a onclick="PKAudioEditor.fireEvent(\'LoadDraft\',\'' + curr.id +
												 '\',1);" class="pk_lcla">Append to Current Track</a>';
											}
											msg += '<a class="pk_lcla" style="color:#ad2b2b" onclick="PKAudioEditor.fireEvent(\'LoadDraft\',\'' + curr.id + '\',2);">Del</a>';
											msg += '</div></div>';
										}
									}

									var modal;
									var closeModal = function ( val, val2 ) {
										if (val2 === 2 || val2 === 3) return ;

										modal.Destroy ();
										modal = null;
									};

									var set_act_btn = function ( name, state ) {
										var act;
										if (!state) {
											act = modal.el_body.getElementsByClassName('pk_act')[0];
											if (act) {
												act.classList.remove ('pk_act');
											}
										}
										else {
											var el = document.getElementById ('pk_' + name);
											if (el) {
												act = el.getElementsByClassName ('pk_lcla2')[0];
												act && act.classList.add ('pk_act');
											}
										}
										// --
									};

									app.listenFor ('_lclStart', set_act_btn);

									modal = new PKSimpleModal ({
										title : 'Local Drafts',
										clss  : 'pk_bigger',

										ondestroy : function( q ) {

											app.fireEvent ('_lclStop');

											app.ui.InteractionHandler.on = false;
											app.ui.KeyHandler.removeCallback ('modalTempErr');
											app.stopListeningFor ('LoadDraft', closeModal);
											app.stopListeningFor ('_lclStart', set_act_btn);
										},

										buttons:[],

										body:'<div>' + msg + '</div>',
										setup:function( q ) {
											app.fireEvent ('RequestPause');
											app.fireEvent( 'RequestRegionClear');

											app.listenFor ('LoadDraft', closeModal);

											app.ui.InteractionHandler.checkAndSet ('modal');
											app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
												q.Destroy ();
											}, [27]);
										}
									});

									modal.Show ();
								});

								app.stopListeningFor ('DidOpenDB', func);
							};

							app.listenFor ('DidOpenDB', func);

							if (!app.fls.on) app.fls.Init (function(err){if(err){alert("db error")}});
							else app.fireEvent ('DidOpenDB', app.fls);
						},
						setup: function () {
							var source = {};

							app.listenFor ('_lclStop', function ( name, append ) {
								if (source.src) {
									source.src.stop ();
									source.src.disconnect ();
									source.src.onended = null;
									source.aud.close && source.aud.close ();
									source = {};
								}
							});

							app.listenFor ('LoadDraft', function ( name, append ) {
									app.fls.Init (function (err) {
										if (err) return ;

										if (append === 2)
										{
											if (source.id === name)
											{
												app.fireEvent ('_lclStart', source.id, 0);
												source.src.stop ();
												source.src.disconnect ();
												source.src.onended = null;
												source.aud.close && source.aud.close ();
												source = {};
											}

											app.fls.DelSession (name, function (name) {
												var id = 'pk_' + name;
												var el = document.getElementById (id);

												if (el)
												{
													if ( el.parentNode.children.length === 1 ) {
														el.parentNode.innerHTML = 'No drafts found...';
													}
													else el.parentNode.removeChild(el);


													el = null;
												}
											});
											return ;
										}

										if (append === 3)
										{
											if (source.id) {
												var xt = false;
												if (source.id === name) xt = true;

												app.fireEvent ('_lclStart', source.id, 0);
												source.src.stop ();
												source.src.disconnect ();
												source.src.onended = null;
												source.aud.close && source.aud.close ();

												source = {};

												if (xt) return ;
											}

											// generate audio context here...
											var aud_cont = new (w.AudioContext || w.webkitAudioContext)();
								            if (aud_cont && aud_cont.state == 'suspended') {
								                aud_cont.resume && aud_cont.resume ();
								            }

											app.fls.GetSession (name, function ( e ) {
												if(e && e.id === name )
												{
													source.id  = e.id;
													source.aud = aud_cont;
													source.src = app.engine.PlayBuff (e.data, e.chans, e.samplerate, aud_cont);
													if (!source.src) {
														source.aud && source.aud.close && source.aud.close ();
														source = {};

														return ;
													}

													source.src.onended = function ( e ) {
														app.fireEvent ('_lclStart', source.id, 0);
														source.src.stop ();
														source.src.disconnect ();
														source.src.onended = null;
														source.aud.close && source.aud.close ();

														source = {};
													};

													app.fireEvent ('_lclStart', e.id, 1);
												}
											});
											return ;
										}

										var overwrite = (function ( app, name, append ) {
											return function () {
												app.fls.GetSession (name, function ( e ) {
													if(e && e.id === name )
													{
														app.engine.wavesurfer.backend._add = append ? 1 : 0;
														app.engine.LoadDB ( e );
													}
												});
											};
										})( app, name, append );

										// --- ask if we want to click the first one
										if (app.engine.is_ready && !append)
										{
											var mm = new PKSimpleModal ({
												title : 'Open in Existing?',
												body  : '<div>Open in new window, or in the current one?</div>',
												buttons:[
													{
														title:'OPEN',
														clss:'pk_modal_a_accpt',
														callback: function( q ) {
															overwrite ();

															q.Destroy ();
														}
													},
													{
														title:'OPEN IN NEW',
														clss:'pk_modal_a_accpt',
														callback: function( q ) {
															window.open (window.location.pathname + '?local=' + name);
															q.Destroy ();
														}
													}
												],
												setup: function ( q ) {
													app.ui.InteractionHandler.checkAndSet ('mm');
													app.ui.KeyHandler.addCallback ('mmErr', function ( e ) {
														q.Destroy ();
													}, [27]);
												},
												ondestroy: function ( q ) {
													overwrite = null;
													app.ui.InteractionHandler.on = false;
													app.ui.KeyHandler.removeCallback ('mmErr');
												}
											});

											setTimeout(function() { mm.Show (); },0);
											return ;
										}

										overwrite ();
										// --
									});
							});
							// ---
						}
					}
				]
			},
			{
				name:'Edit',
				children:[
					{
						name: 'Undo <span class="pk_shrtct">Shft+Z</span>',
						clss: 'pk_inact',
						action: function () {
							app.fireEvent ('StateRequestUndo');
						},
						setup: function ( obj ) {
							app.listenFor ('DidStateChange', function ( undo_states, redo_states ) {
								if (undo_states.length === 0)
								{
									obj.innerHTML = 'Undo <span class="pk_shrtct">Shft+Z</span>';
									obj.classList.add ('pk_inact');
								}
								else
								{
									obj.innerHTML = 'Undo&nbsp;<i style="pointer-events:none">' + undo_states[undo_states.length - 1].desc + '</i><span class="pk_shrtct">Shft+Z</span>';
									obj.classList.remove ('pk_inact');
								}
							});
						}
					},
					
					{
						name: 'Redo <span class="pk_shrtct">Shft+Y</span>',
						clss: 'pk_inact',
						action: function () {
							app.fireEvent ('StateRequestRedo');
						},
						setup: function ( obj ) {
							app.listenFor('DidStateChange', function ( undo_states, redo_states ) {
								if (redo_states.length === 0)
								{
									obj.innerHTML = 'Redo <span class="pk_shrtct">Shft+Y</span>';
									obj.classList.add ('pk_inact');
								}
								else
								{
									obj.innerHTML = 'Redo&nbsp;<i style="pointer-events:none">' + redo_states[0].desc  + '</i><span class="pk_shrtct">Shft+Y</span>';
									obj.classList.remove ('pk_inact');
								}
							});
						}
					},

					{
						name: 'Play <span class="pk_shrtct">Space</span>',
						action: function () {
							app.fireEvent ('RequestPlay');
						}
					},
					
					{
						name: 'Stop',
						action: function () {
							app.fireEvent ('RequestStop');
						}
					},
					
					{
						name: 'Select All <span class="pk_shrtct">Shft+A</span>',
						action: function () {
							app.fireEvent ('RequestSelect');
						}
					},
					
					{
						name: 'Deselect All <span class="pk_shrtct">~</span>',
						action: function () {
							app.fireEvent ('RequestDeselect');
						}
					},

					{
						name   : 'Channel Info/Flip',
						action : function () {
							app.fireEvent ('RequestActionFXUI_Flip');
						},
						clss: 'pk_inact',
						setup: function ( obj ) {
							app.listenFor ('DidUnloadFile', function () {
								obj.classList.add ('pk_inact');
							});
							app.listenFor ('DidLoadFile', function () {
								obj.classList.remove ('pk_inact');
							});
						}
					}
				]
			},
			{
				name:'Effects',
				children:[
					{
						name:'Gain',
						action:function () {
							app.fireEvent ('RequestFXUI_Gain');
						}
					},

					{
						name:'Fade In',
						action:function () {
							app.fireEvent ('RequestActionFX_FadeIn');
						}
					},

					{
						name:'Fade Out',
						action:function () {
							app.fireEvent ('RequestActionFX_FadeOut');
						}
					},

                    {
                        name: "Noise Reduction (Voice)",
                        action: function () {
                            app.fireEvent("RequestActionFX_NoiseRNN");
                        },
                    },

					{
						name   : 'Paragraphic EQ',
						action:function () {
							app.fireEvent ('RequestActionFXUI_ParaGraphicEQ');
						}
					},

					{
						name:'Compressor',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Compressor');
						}
					},


					{
						name   : 'Normalize',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Normalize');
						}
					},

					{
						name   : 'Graphic EQ',
						action:function () {
							app.fireEvent ('RequestActionFXUI_GraphicEQ', 10);
						}
					},

					{
						name   : 'Graphic EQ (20 bands)',
						action:function () {
							app.fireEvent ('RequestActionFXUI_GraphicEQ', 20);
						}
					},

					{
						name   : 'Hard Limiter',
						action:function () {
							app.fireEvent ('RequestActionFXUI_HardLimiter');
						}
					},

					{
						name   : 'Delay',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Delay');
						}
					},

					{
						name:'Distortion',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Distortion');
						}
					},


					{
						name:'Reverb',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Reverb');
						}
					},

					{
						name   : 'Speed Up / Slow Down (pitch)',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Speed');
						}
					},

					{
						name : 'Playback Rate',
						action:function () {
							app.fireEvent ('RequestActionFXUI_Rate');
						}
					},

					{
						name   : 'Reverse',
						action : function () {
							app.fireEvent ('RequestActionFX_Reverse');
						}
					},
					
					{
						name   : 'Invert',
						action : function () {
							app.fireEvent ('RequestActionFX_Invert');
						}
					},

					{
						name   : 'Remove Silence',
						action : function () {
							app.fireEvent ('RequestActionFX_RemSil');
						}
					}
					
				]
			},
			{
				name:'View',
				children:[
					{
						name:'Follow Cursor  &#10004;',
						action: function ( obj ) {
							app.fireEvent ('RequestViewFollowCursorToggle');
						},
						setup: function ( obj ) {
							// perhaps read from stored settings?

							app.listenFor ('DidViewFollowCursorToggle', function ( val ) {
								var txt = 'Follow Cursor';

								if (val) {
									obj.innerHTML = txt + ' &#10004;';
								} else {
									obj.textContent = txt;
								}
							});
						}
					},

					{
						name:'Peak Separators &#10004;',
						action: function ( obj ) {
							app.fireEvent ('RequestViewPeakSeparatorToggle');
						},
						setup: function ( obj ) {
							app.listenFor ('DidViewPeakSeparatorToggle', function ( val ) {
								var txt = 'Peak Separators';
								if (val) {
									obj.innerHTML = txt + ' &#10004;';
								} else {
									obj.textContent = txt;
								}
							});
						}
					},

					{
						name:'Timeline &#10004;',
						action: function ( obj ) {
							app.fireEvent ('RequestViewTimelineToggle');
						},
						setup: function ( obj ) {
							app.listenFor ('DidViewTimelineToggle', function ( val ) {
								var txt = 'Timeline';
								if (val) {
									obj.innerHTML = txt + ' &#10004;';
								} else {
									obj.textContent = txt;
								}
							});
						}
					},

					{
						name:'---'
					},

					{
						name:'Frequency Analyser',
						action: function ( obj ) {
							app.fireEvent ('RequestShowFreqAn', 'eq', [1]);
						},
						setup: function ( obj ) {
							app.listenFor ('DidToggleFreqAn', function ( url, val ) {
								if (url !== 'eq') return ;

								var txt = 'Frequency Analyser';
								if (val) {
									obj.innerHTML = txt + ' &#10004;';
								} else {
									obj.textContent = txt;
								}
							});
						}
					},

					{
						name:'Spectrum Analyser',
						action: function ( obj ) {
							app.fireEvent ('RequestShowFreqAn', 'sp', [1]);
						},
						setup: function ( obj ) {
							app.listenFor ('DidToggleFreqAn', function ( url, val ) {
								if (url !== 'sp') return ;

								var txt = 'Spectrum Analyser';
								if (val) {
									obj.innerHTML = txt + ' &#10004;';
								} else {
									obj.textContent = txt;
								}
							});
						}
					},

					{
						name:'Tempo Tools',
						action: function ( obj ) {
							app.fireEvent ('RequestActionTempo');
						}
					},

					{
						name:'ID3 Tags',
						action: function ( obj ) {
							app.fireEvent ('RequestActionID3');
						}
					},

					{
						name:'---'
					},

					{
						name:'Center to Cursor <span class="pk_shrtct">[Tab]</span>',
						action: function ( obj ) {
							app.fireEvent ('RequestViewCenterToCursor');
						}
					},

					{
						name:'Reset Zoom <span class="pk_shrtct">[0]</span>',
						action: function ( obj ) {
							app.fireEvent ('RequestZoomUI', 0);
						}
					}

				]
			},
			{
				name:'Help',
				children:[
					{
						name   : 'Store Offline Version',
						action : function () {
							if (window.location.href.indexOf('-cache') > 0) {

								function onUpdateReady ( e ) {
									if (confirm ('Would you like to refresh the page to load the newer version?'))
										window.location.reload();
								}
								function downLoading ( e ) {
									OneUp ('Downloading newer version', 1500);
								}

								window.applicationCache.onupdateready = onUpdateReady;
								window.applicationCache.ondownloading = downLoading;

								if(window.applicationCache.status === window.applicationCache.UPDATEREADY) {
									onUpdateReady ();
								}

								window.applicationCache.update ();

								return ;
							}

							var message = 'This will open a new window that will try to store a local version in your browser'; // nicer text

							new PKSimpleModal ({
								title : 'Open Offline Version?',

								ondestroy : function( q ) {
									app.ui.InteractionHandler.on = false;
									app.ui.KeyHandler.removeCallback ('modalTempErr');
								},

								buttons:[
									{
										title:'OPEN',
										callback: function( q ) {
											window.open ('/index-cache.html');
											q.Destroy ();
										}
									}
								],
								body:'<p>' + message + '</p>',
								setup:function( q ) {
									app.fireEvent ('RequestPause');
									app.fireEvent( 'RequestRegionClear');

									app.ui.InteractionHandler.checkAndSet ('modal');
									app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
										q.Destroy ();
									}, [27]);
								}
							}).Show ();
							// -
						},
						setup: function ( obj ) {
							if (window.location.href.indexOf('-cache') > 0)
							{
								obj.innerHTML = 'Update Offline Version';
							}
						}
					},

					{
						name:'---'
					},

					{
						name   : 'About',
						action : function () {
							window.open ('/about.html');
						}
					},

					{
						name   : 'See Welcome Message',
						action : function () {
							PKAudioEditor._deps.Wlc ();
						}
					},
					// {
					// 	name   : 'About AudioMass',
					// 	action : function () {
					// 		window.open ('/about.html');
					// 	}
					// },

					// {
					// 	name:'---'
					// },

					{
						name   : 'SourceCode on Github',
						action : function () {
							window.open ('https://github.com/pkalogiros/audiomass');
						}
					}
				]
			}
		];
	};

	// 
	// TOP-BAR CLASS
	// 
	function _makeUITopHeader ( menu_tree, UI ) {
		var header = d.createElement ( 'div' );
		header.className = 'pk_hdr pk_noselect';

		var _name = 'TopHeader',
			_default_class = 'pk_btn pk_noselect';

		var target_index = -1;
		var target_el = null;
		var target_el_old = null;
		var target_option = null;
		var top_els = [];
		var q = this;

		// recursively build the interface
		function build_menus ( parent_el, tree_obj, level ) {
			for (var i = 0; i < tree_obj.length; ++i)
			{
				var btn_container = d.createElement ( 'div' );
				var curr_obj = tree_obj[i];
				
				if (level === 0)
				{
					btn_container.className = _default_class;
					var btn = d.createElement ( 'button' );
					btn.innerHTML = curr_obj.name;
					btn_container.appendChild ( btn );
				}
				else
				{
					btn_container.className = 'pk_menu_el';
					var btn = d.createElement ( 'button' );
					btn.className = 'pk_opt ' + (curr_obj.clss ? curr_obj.clss : '');
					btn.setAttribute ( 'tab-index', '-1' );
					btn.setAttribute ( 'data-index', i );
					btn.innerHTML = curr_obj.name;
					btn_container.appendChild ( btn );

					if (curr_obj.action)
					{
						(function ( btn, action ) {
							btn.onclick = function ( obj ) {
								if (this.classList.contains('pk_inact')) return ;

								q.closeMenu ();
								action ( obj );
							};
						})( btn, curr_obj.action );
					}
					if (curr_obj.setup)
					{
						curr_obj.setup ( btn );
					}
				}
				parent_el.appendChild ( btn_container );
				
				if (level === 0)
					top_els[i] = btn_container.childNodes[0];

				if (curr_obj.children)
				{
					var ch = curr_obj.children;
					var list = d.createElement('div');
					list.className = 'pk_menu';
					
					build_menus ( list, curr_obj.children, level + 1 );
					btn_container.appendChild ( list );
				}
				// --- 
			}
		};
		build_menus ( header, menu_tree, 0 );
		
		this.getOpenElement = function () {
			return target_el;
		};
		this.closeMenu = function() {
			if (!target_el) return ;

			target_el.parentNode.className = _default_class;
			target_el = target_el_old = null;

			if (target_option)
			{
				target_option.classList.remove ('pk_act');
				target_option = null;
			}
			
			UI.InteractionHandler.on = false;
			d.removeEventListener ( 'mouseup', mouseup );
			
			// de-register keys
			UI.KeyHandler.removeCallback (_name + 1);
			UI.KeyHandler.removeCallback (_name + 2);
			UI.KeyHandler.removeCallback (_name + 3);
			UI.KeyHandler.removeCallback (_name + 4);
			UI.KeyHandler.removeCallback (_name + 5);
			UI.KeyHandler.removeCallback (_name + 6);
		};
		
		this.openMenu = function ( index, is_mouse ) {
			if (target_el) {
				target_el.parentNode.className = _default_class;
			}

			if (index === -1) {
				index = target_index === -1 ? 0 : target_index;
			}

			var curr_target = top_els[ index ];
			target_el = curr_target;

			var parent = curr_target.parentNode;
			var left = parent.getBoundingClientRect ().left;
			var max = window.innerWidth;
			var offset = 0;

			if ( max - left < 200 )
			{
				offset = (264 - (max - left)) >> 0;

				if (offset > 1)
					parent.getElementsByClassName ('pk_menu')[0].style.left = (-offset / 2) + 'px';
			}

			parent.className += ' pk_vis';
			setTimeout(function() {
				if (target_el === curr_target)
					parent.className += ' pk_act';
			},0);

			target_index = index;
			
			UI.InteractionHandler.checkAndSet (_name);
			
			if (!is_mouse)
				d.addEventListener ( 'mouseup', mouseup, false );
			
			// register keystrokes
			UI.KeyHandler.addCallback (_name + 1, function ( key ) {
				if (target_index === 0)
					target_index = top_els.length;
				
				q.closeMenu ();
				q.openMenu ( target_index - 1 );				
			}, [37]);
			UI.KeyHandler.addCallback (_name + 2, function ( key ) {
				if (target_index === top_els.length - 1)
					target_index = -1;

				q.closeMenu ();
				q.openMenu ( target_index + 1 );				
			}, [39]);
			UI.KeyHandler.addCallback (_name + 3, function ( key ) {
				q.closeMenu ();			
			}, [27]);
			UI.KeyHandler.addCallback (_name + 4, function ( key, m, e ) {
				if (!target_option)
				{
					var els = target_el.parentNode.getElementsByClassName ('pk_opt');
					if (els[0]) {
						target_option = els[0];
						target_option.classList.add ('pk_act');
					}
				}
				else
				{
					var ind = target_option.getAttribute ('data-index')/1;
					target_option.classList.remove ('pk_act');
					
					target_option = target_el.parentNode.getElementsByClassName ('pk_opt');
					if (ind - 1 < 0)
					{
						target_option = target_option[target_option.length - 1];
					}
					else
					{
						target_option = target_option[ind - 1];
					}
					target_option.classList.add ('pk_act');
				}
			}, [38]);
			UI.KeyHandler.addCallback (_name + 5, function ( key, m, e ) {
				if (!target_option)
				{
					var els = target_el.parentNode.getElementsByClassName ('pk_opt');
					if (els[0]) {
						target_option = els[0];
						target_option.classList.add ('pk_act');
					}
				}
				else
				{
					var ind = target_option.getAttribute ('data-index')/1;
					target_option.classList.remove ('pk_act');
					
					target_option = target_el.parentNode.getElementsByClassName ('pk_opt');
					if (target_option.length <= ind + 1)
					{
						target_option = target_option[0];
					}
					else
					{
						target_option = target_option[ind + 1];
					}
					target_option.classList.add ('pk_act');				
				}
			}, [40]);
			UI.KeyHandler.addCallback (_name + 6, function ( key ) {
				if (target_option)
					target_option.click();
				else
					q.closeMenu ();
			}, [13]);

			return (true);
		};

		UI.listenFor ('DidReadyFire', function () {
			q.closeMenu ();
		});

		// register hot keys for opening the menu 
		function _checkForAct( x ) {
				if (target_el == x || !x) return (false);

				var par = x.parentNode;
				while (par && target_el) {
					if (target_el.parentNode == par) {
						return (false);
					}
					par = par.parentNode;
				}
				
				var l = top_els.length;
				while(l-- > 0) {
					if (top_els[l] === x) {				
						return q.openMenu (l, true);
					}
				}
				return (false);
		}

		// now make the buttons interactive
		var mousemove = function ( e ) {
			if (!UI.InteractionHandler.check (_name)) {
				return (false);
			}

			if (target_el || (UI.InteractionHandler.on && UI.InteractionHandler.by === _name) )
			{
				var x = e.target || e.srcElement;
				
				if (x.className.indexOf('pk_opt') >= 0)
				{
					if (target_option)
						target_option.classList.remove ('pk_act');

					target_option = x;
					target_option.classList.add ('pk_act');
				}
				else
				{
					if (target_option)
						target_option.classList.remove ('pk_act');
					target_option = null;
				}

				return _checkForAct ( x );
			}

			return (false);
		};
		var mouseup = function( e ) {
			var x = e.target || e.srcElement;

			if (target_el)
			{
				// todo check for inner menu?
				var par = x;
				var found = false;
				while (par && target_el) {
					if (target_el.parentNode == par) {
						found = true;
						break;
					}
					par = par.parentNode;
				}

				if (!found || target_el_old === x) {
					q.closeMenu();
				}
			}
			else
			{
				UI.InteractionHandler.on = false;
				d.removeEventListener ( 'mouseup', mouseup );
			}
			
			target_el_old = null;
		};

		header.addEventListener ( 'mousemove', mousemove, false );
		header.addEventListener ( 'mousedown', function( e ) {
			if (!UI.InteractionHandler.checkAndSet (_name)) {
				return (false);
			}

			d.removeEventListener ( 'mouseup', mouseup );

			if (target_el)
			{
				if (!_checkForAct ( e.target || e.srcElement ))
					target_el_old = target_el;
				else
					target_el_old = null;

				d.addEventListener ( 'mouseup', mouseup, false );
			}
			else
			{
				target_el_old = null;
				d.addEventListener ( 'mouseup', mouseup, false );
				_checkForAct ( e.target || e.srcElement );
			}
			// -
		}, false);

		UI.el.appendChild ( header );
		// -
	};


	// ####
	function _makeUIBarBottom ( UI, app ) {
		var q = this;

		var bar_bottom_el = d.createElement ('div');
		bar_bottom_el.className = 'pk_dck';
		UI.el.appendChild( bar_bottom_el );

		q.el = bar_bottom_el;
		q.on = false;
		q.height = 130;

		q.Show = function () {
			q.on = true;
			bar_bottom_el.style.display = 'block';

			app.fireEvent ('RequestResize');
		};
		q.Hide = function () {
			q.on = false;
			bar_bottom_el.style.display = 'none';

			app.fireEvent ('RequestResize');
		};
	};

	function _makeUIMainView ( UI, app ) {
		var q = this;

		var audio_container = d.createElement ('div');
		audio_container.className = 'pk_av_cont';
		UI.el.appendChild( audio_container );


		var main_audio_view = d.createElement ( 'div' );
		main_audio_view.className = 'pk_av pk_noselect';
		main_audio_view.id = 'pk_av_' + app.id;
		audio_container.appendChild( main_audio_view );

		
		var footer = d.createElement ( 'div' );
		footer.className = 'pk_ftr pk_noselect';
		UI.el.appendChild( footer );

		// make panner buttons
		var btn_panner_cnt = d.createElement ('div');
		btn_panner_cnt.className = 'pk_panner pk_noselect';

		var panner_col_left = d.createElement ('div');
		panner_col_left.className = 'pk_pan_left';
		var panner_col_right = d.createElement ('div');
		panner_col_right.className = 'pk_pan_right';

		var btn_panner_left = d.createElement ('button');
		var btn_panner_right = d.createElement ('button');
		btn_panner_left.setAttribute ('tabIndex', -1);
		btn_panner_right.setAttribute ('tabIndex', -1);
		btn_panner_left.className = 'pk_pan_btn';
		btn_panner_right.className = 'pk_pan_btn';

		btn_panner_left.innerHTML = '<strong>L</strong> ON';
		btn_panner_right.innerHTML = '<strong>R</strong> ON';

		panner_col_left.appendChild ( btn_panner_left );
		panner_col_right.appendChild ( btn_panner_right );
		btn_panner_cnt.appendChild ( panner_col_left );
		btn_panner_cnt.appendChild ( panner_col_right );
		audio_container.appendChild ( btn_panner_cnt );


		btn_panner_left.onclick = function () {
			app.fireEvent ('RequestChanToggle', 0);
			this.blur();
		};
		btn_panner_right.onclick = function () {
			app.fireEvent ('RequestChanToggle', 1);
			this.blur();
		};
		app.listenFor ('DidChanToggle', function ( chan, val ) {
			if ( chan === 0) {
				if (val)
				{
					btn_panner_left.classList.remove ('pk_inact');
					btn_panner_left.innerHTML = '<strong>L</strong> ON';
				}
				else
				{
					btn_panner_left.classList.add ('pk_inact');
					btn_panner_left.innerHTML = '<strong>L</strong> OFF';
				}
			} else {
				if (val)
				{
					btn_panner_right.classList.remove ('pk_inact');
					btn_panner_right.innerHTML = '<strong>R</strong> ON';
				}
				else
				{
					btn_panner_right.classList.add ('pk_inact');
					btn_panner_right.innerHTML = '<strong>R</strong> OFF';
				}
			}
		});

		// zoom btns
		var btn_zoom_cnt = d.createElement ('div');
		btn_zoom_cnt.className = 'pk_zoombtn';

		var btn_zoom_in_h = d.createElement ('button');
		btn_zoom_in_h.className = 'pk_btn pk_zoom_in_h';
		btn_zoom_in_h.innerHTML = '+<span>Zoom In Horiz (+)</span>';
		btn_zoom_in_h.setAttribute ('tabIndex', -1);
		btn_zoom_in_h.onclick = function () {
			app.fireEvent ('RequestZoomUI', 'h', -1);
			this.blur();
		};

		var btn_zoom_out_h = d.createElement ('button');
		btn_zoom_out_h.className = 'pk_btn pk_zoom_out_h pk_inact';
		btn_zoom_out_h.innerHTML = '&ndash;<span>Zoom Out Horiz (-)</span>';
		btn_zoom_out_h.setAttribute ('tabIndex', -1);
		btn_zoom_out_h.onclick = function () {
			app.fireEvent ('RequestZoomUI', 'h', 1);
			this.blur();
		};

		var btn_zoom_reset = d.createElement ('button');
		btn_zoom_reset.className = 'pk_btn pk_zoom_reset pk_inact';
		btn_zoom_reset.innerHTML = '[R] <span>Reset Zoom (0)</span>';
		btn_zoom_reset.setAttribute ('tabIndex', -1);
		btn_zoom_reset.onclick = function () {
			app.fireEvent ('RequestZoomUI', 0);
			this.blur();
		};
		UI.KeyHandler.addCallback ('Key0', function ( key ) {
			if (UI.InteractionHandler.on) return ;
			app.fireEvent ('RequestZoomUI', 0);
		}, [48]);

		UI.KeyHandler.addCallback ('KeyZO', function ( key ) {
			if (UI.InteractionHandler.on) return ;
			app.fireEvent ('RequestZoomUI', 'h', 1);
		}, [189]);
		UI.KeyHandler.addCallback ('KeyZI', function ( key ) {
			if (UI.InteractionHandler.on) return ;
			app.fireEvent ('RequestZoomUI', 'h', -1);
		}, [187]);

		var btn_zoom_in_v = d.createElement ('button');
		btn_zoom_in_v.className = 'pk_btn pk_zoom_in_v';
		btn_zoom_in_v.innerHTML = '&#x2195; +<span>Zoom In Vertically</span>';
		btn_zoom_in_v.setAttribute ('tabIndex', -1);
		btn_zoom_in_v.onclick = function () {
			app.fireEvent ('RequestZoomUI', 'v', -1);
			this.blur();
		};

		var btn_zoom_out_v = d.createElement ('button');
		btn_zoom_out_v.className = 'pk_btn pk_zoom_out_v';
		btn_zoom_out_v.innerHTML = '&#x2195; &ndash;<span>Zoom Out Vertically</span>';
		btn_zoom_out_v.setAttribute ('tabIndex', -1);
		btn_zoom_out_v.onclick = function () {
			app.fireEvent ('RequestZoomUI', 'v', 1);
			this.blur();
		};

		btn_zoom_cnt.appendChild ( btn_zoom_in_h );
		btn_zoom_cnt.appendChild ( btn_zoom_out_h );
		btn_zoom_cnt.appendChild ( btn_zoom_reset );
		btn_zoom_cnt.appendChild ( btn_zoom_in_v );
		btn_zoom_cnt.appendChild ( btn_zoom_out_v );

		footer.appendChild ( btn_zoom_cnt );
		// end of zoom btns
		
		var wavezoom = d.createElement ( 'div' );
		wavezoom.className = 'pk_wavescroll';

		var wavepoint_visible = false;
		var wavepoint = d.createElement ( 'div' );
		wavepoint.className = 'pk_wavepoint';

		var wavedrag = d.createElement ( 'div' );
		var wavedrag_style = wavedrag.style;
		wavedrag.className = 'pk_wavedrag pk_inact';

		var wavedrag_left = d.createElement ( 'div' );
		wavedrag_left.className = 'pk_wavedrag_l';
		var wavedrag_right = d.createElement ( 'div' );
		wavedrag_right.className = 'pk_wavedrag_r';

		wavezoom.appendChild ( wavepoint );
		wavedrag.appendChild ( wavedrag_left );
		wavedrag.appendChild ( wavedrag_right );
		wavezoom.appendChild ( wavedrag );
		footer.appendChild ( wavezoom );

		var temp = 0;
		var wavedrag_width = 100;
		wavezoom.onclick = function( e ) {
			if (window.performance.now() - temp < 20)
			{
				return ;
			}

			var rect = e.target.getBoundingClientRect();
			var x = e.clientX - rect.left;
			UI.fireEvent ('RequestPan', x, 2);
		};
		
		// add zoom event, and add seek event....
		UI.listenFor ('DidZoom', function ( v ) {
			var e = v[0];
			var o = v[1];

			if (e === 1) {
				btn_zoom_out_h.classList.add ('pk_inact');
				btn_zoom_reset.classList.add ('pk_inact');
			} else {
				btn_zoom_out_h.classList.remove ('pk_inact');
				btn_zoom_reset.classList.remove ('pk_inact');
			}

			if (v[2] != 1) {
				btn_zoom_reset.classList.remove ('pk_inact');
			}

			if (e === 1) {
				if (wavepoint_visible)
				{
					wavepoint.style.display = 'none';
					wavepoint_visible = false;
				}
			} else {

				if (!wavepoint_visible)
				{
					wavepoint.style.display = 'block';
					var perc = app.engine.wavesurfer.getCurrentTime() / app.engine.wavesurfer.getDuration ();
					// wavepoint.style.left = ((perc * 100).toFixed(2)/1) + '%';
					wavepoint.style.left = ((perc * 10000)>>0)/100 + '%';
					wavepoint_visible = true;
				}
			}

			// get zoom value and left...
			if ((100/e) > 99)
			{
				wavedrag_width = 100;
				wavedrag_style.width = '100%';
				wavedrag_style.left =  '0%';
				//wavedrag_style.transform = 'translate(0,0)';
				wavedrag.classList.add ('pk_inact');
			}
			else
			{
				wavedrag_width = (100/e);
				wavedrag_style.width = wavedrag_width + '%';
				wavedrag_style.left =  o + '%';
				//wavedrag_style.transform = 'translate(' +  (e * o) + '%,0)';
				wavedrag.classList.remove ('pk_inact');
			}
		});
		UI.listenFor ('DidCursorCenter', function( val, zoom ) {

			requestAnimationFrame(function () {
				wavedrag_style.left = (val * 100) + '%';
				//wavedrag_style.transform = 'translate(' + (val * zoom * 100) + '%,0)';
			});
		});
		
		var drag_mode = 0;
		var startingX = 0;
		var waveScrollMouseMove = function( e ) {
			e.stopPropagation(); e.preventDefault();

			var clx = e.clientX;

			if (e.touches) {
				if (e.touches.length > 1) return ;

				clx = e.touches[0].clientX;
			}

			var diff = -startingX + clx;
			if (drag_mode === 0)
				UI.fireEvent ('RequestPan', diff, 1);
			else if (drag_mode === -1)
			{
				UI.fireEvent ('RequestZoom', diff, -1);
			}
			else if (drag_mode === 1)
			{
				UI.fireEvent ('RequestZoom', diff, 1);
			}
			
			startingX = clx;
		},
		waveScrollMouseUp = function ( e ) {
			if (e.touches && e.touches.length > 1) return ;

			PKAudioEditor.engine.wavesurfer.Interacting &= ~(1 << 1);
			e.stopPropagation();e.preventDefault();
			drag_mode = 0;
			temp = window.performance.now();
			
			wavedrag.classList.remove ('pk_drag');
			
			document.removeEventListener('mousemove', waveScrollMouseMove);
			document.removeEventListener('mouseup', waveScrollMouseUp);

			document.removeEventListener('touchmove', waveScrollMouseMove, {passive:false});
			document.removeEventListener('touchend', waveScrollMouseUp);
		};

		var mdown = function ( e ) {
			if (!PKAudioEditor.engine.is_ready) return ;

			if (e.target === wavedrag) {
				drag_mode = 0;
			} else if ( e.target === wavedrag_left) {
				drag_mode = -1;
			} else if ( e.target === wavedrag_right) {
				drag_mode = 1;
			}
			
			wavedrag.className += ' pk_drag';

			startingX = e.clientX;
			PKAudioEditor.engine.wavesurfer.Interacting |= (1 << 1);

			if (e.is_touch)
			{
				document.addEventListener ('touchmove', waveScrollMouseMove, {passive:false});
				document.addEventListener ('touchend', waveScrollMouseUp, false);
			}
			else
			{		
				document.addEventListener ('mousemove', waveScrollMouseMove, false);
				document.addEventListener ('mouseup', waveScrollMouseUp, false);	
			}
		};

		wavedrag.addEventListener ('mousedown', mdown, false);

		if ('ontouchstart' in window) {
			wavedrag.addEventListener ('touchstart', function ( e ) {
				e.preventDefault ();
				e.stopPropagation ();

				if (e.touches.length > 1) {
					return ;
				}

				var ev = {
					is_touch : true,
					target : wavedrag,
					clientX: e.touches[0].clientX
				};
				mdown ( ev );
			}, false);
		}
		
		
		this.volumeGauge = d.createElement( 'div' );
		this.volumeGauge2 = d.createElement( 'div' );
		
		this.volumeGaugeInner = d.createElement( 'div' );
		this.volumeGaugeInner2 = d.createElement( 'div' );
		this.volumeGaugePeaker = d.createElement( 'div' );
		this.volumeGaugePeaker2 = d.createElement( 'div' );

		var volume_parent = d.createElement('div');
		
		this.volumeGauge.className = 'pk_volpar';
		this.volumeGauge2.className = 'pk_volpar';
		this.volumeGaugeInner.className = 'pk_vol';
		this.volumeGaugeInner2.className = 'pk_vol';
		this.volumeGaugePeaker.className = 'pk_peaker';
		this.volumeGaugePeaker2.className = 'pk_peaker';
		
		this.volumeGauge.appendChild ( this.volumeGaugeInner );
		this.volumeGauge.appendChild( this.volumeGaugePeaker );
		
		this.volumeGauge2.appendChild ( this.volumeGaugeInner2 );
		this.volumeGauge2.appendChild( this.volumeGaugePeaker2 );
		
		var markers = d.createElement('div');
		markers.className = 'pk_markers pk_noselect';
		
		var str = '<span class="pk_mark1">-Inf</span>';
		for (var i = 35; i >= 0; --i)
		{
			str += '<span class="pk_mark1 '+(i%2?'pk_odd':'')+'">' + -(i*2) + '</span>';
		}
		markers.innerHTML = str;
		
		volume_parent.appendChild( this.volumeGauge );
		volume_parent.appendChild( this.volumeGauge2 );
		volume_parent.appendChild( markers );
		
		volume_parent.onclick = function() {
			q.volumeGaugePeaker.className = 'pk_peaker';
			q.volumeGaugePeaker2.className = 'pk_peaker';
		};

		footer.appendChild( volume_parent );

		// change temp message, it's pretty ugly #### TODO
		var ttmp = d.createElement('div');
		ttmp.className = 'pk_tmpMsg';
		ttmp.innerHTML = 'Drag n drop an Audio File in this window, or click ' +
		'<a style="white-space:nowrap;border:1px solid;border-radius:23px;padding:5px 18px;font-size:0.94em;margin-left:5px" '+
		'onclick="PKAudioEditor.engine.LoadSample()">here to use a sample</a>';
		main_audio_view.appendChild( ttmp );

		var ttmp2 = d.createElement('div');
		ttmp2.className = 'pk_tmpMsg2';
		ttmp2.innerHTML = '<span>Please Wait...</span><div class="pk_mload"><div></div></div>' + 
			'<div class="pk_prc"><span>0%</span>' + 
			'<button tabIndex="-1" class="pk_btn" '+
			'onclick="PKAudioEditor.fireEvent(\'RequestCancelModal\');">cancel</button></div>';

		d.body.appendChild( ttmp2 );
		UI.loaderEl = ttmp2;

		UI.listenFor ('WillDownloadFile', function() {
			UI.loaderEl.classList.add ('pk_act');
			UI.loaderEl.getElementsByTagName('span')[1].style.display = 'none';
		});
		UI.listenFor ('DidDownloadFile', function() {
			UI.loaderEl.classList.remove ('pk_act');
		});
		UI.listenFor ('DidProgressModal', function ( val ) {
			UI.loaderEl.getElementsByTagName('span')[1].style.display = 'block';
			UI.loaderEl.getElementsByTagName('span')[1].textContent = val + '%';
		});
	}

	
	function _makeUIToolbar (UI) {
		var container = d.createElement ( 'div' );
		container.className = 'pk_tbc';

		var toolbar = d.createElement ( 'div' );
		toolbar.className = 'pk_tb pk_noselect';

		var btn_groups = d.createElement( 'div' );
		btn_groups.className = 'pk_btngroup';
		
		var transport = d.createElement( 'div' );
		transport.className = 'pk_transport';

		// play button
		var btn_stop = d.createElement ('button');
		btn_stop.setAttribute ('tabIndex', -1);
		btn_stop.innerHTML = '<span>Stop Playback (Space)</span>';
		btn_stop.className = 'pk_btn pk_stop icon-stop2';
		btn_stop.onclick = function() {
			UI.fireEvent('RequestStop');
		};
		transport.appendChild ( btn_stop );

		var btn_play = d.createElement ('button');
		btn_play.setAttribute ('tabIndex', -1);
		btn_play.className = 'pk_btn pk_play icon-play3';
		btn_play.innerHTML = '<span>Play (Space)</span>';
		transport.appendChild ( btn_play );
		btn_play.onclick = function() {
			UI.fireEvent('RequestPlay');
			this.blur();
		};
		UI.listenFor ('DidStopPlay', function(){
			btn_play.classList.remove ('pk_act');
		});
		UI.listenFor ('DidPlay', function(){
			btn_play.classList.add ('pk_act');
		});

		var btn_pause = d.createElement ('button');
		btn_pause.setAttribute('tabIndex', -1);
		btn_pause.className = 'pk_btn pk_pause icon-pause2';
		btn_pause.innerHTML = '<span>Pause (Shift+Space)</span>';
		transport.appendChild ( btn_pause );
		btn_pause.onclick = function() {
			UI.fireEvent('RequestPause');
			this.blur();
		};

		var btn_loop = d.createElement ('button');
		btn_loop.setAttribute('tabIndex', -1);
		btn_loop.className = 'pk_btn pk_loop icon-loop';
		btn_loop.innerHTML = '<span>Toggle Loop (L)</span>';
		transport.appendChild ( btn_loop );
		btn_loop.onclick = function() {
			UI.fireEvent('RequestSetLoop');
			this.blur();
		};
		UI.listenFor('DidSetLoop', function( val ) {
			val ? btn_loop.classList.add('pk_act') :
				  btn_loop.classList.remove('pk_act');
		});

		var btn_back_jump = d.createElement ('button');
		btn_back_jump.setAttribute('tabIndex', -1);
		btn_back_jump.className = 'pk_btn pk_back_jump icon-backward2';
		btn_back_jump.innerHTML = '<span>Seek (left arrow)</span>';
		transport.appendChild ( btn_back_jump );

		///////////////////////////////////////////////////////////
		// REWING / BACK BTN
		var btn_back_focus = false;
		var btn_back_tm = null;
		btn_back_jump.onclick = function() {

			if (!btn_back_focus)
			{
				if (btn_back_tm) {
					clearTimeout(btn_back_tm);
					btn_back_tm = null;
				}

				var big_step = PKAudioEditor.engine.wavesurfer.getDuration () / 20;
				var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
				big_step /= ((zoom/2)+0.5);
				if (big_step > 1) big_step = big_step << 0;

				UI.fireEvent ('RequestSkipBack', big_step);
			}

			this.blur();
			btn_back_focus = false;
		};

		btn_back_jump.onmouseleave = function () {
			if (btn_back_tm) {
				clearTimeout(btn_back_tm);
				btn_back_tm = null;
			}
			this.blur();
		};

		btn_back_jump.onfocus = function() {
			var btn = this;
			btn_back_focus = false;

			var step = function ( num, count ) {
				if (document.activeElement === btn)
				{
					btn_back_focus = true;

					UI.fireEvent ('RequestSkipBack', num);

					var block = 4450;

					var middle_step = PKAudioEditor.engine.wavesurfer.getDuration () / block;
					var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
					middle_step /= zoom;

					if (count < 12) {
						middle_step = 0;
					}

					setTimeout(function() {
						step (num + middle_step, ++count);
					},40);
				}
			};
			btn_back_tm = setTimeout(function(){

				var small = PKAudioEditor.engine.wavesurfer.getDuration () / 2000;
				var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
				small /= zoom;

				if (small < 0.01) {
					small = 0.01;
				}

				step (small, 0);
			},390);
		};
		////////////////////////

		var btn_front_jump = d.createElement ('button');
		btn_front_jump.setAttribute('tabIndex', -1);
		btn_front_jump.className = 'pk_btn pk_front_jump icon-forward3';
		btn_front_jump.innerHTML = '<span>Seek (right arrow)</span>';
		transport.appendChild ( btn_front_jump );

		var btn_frnt_focus = false;
		var btn_frnt_tm = null;
		btn_front_jump.onclick = function() {
			if (!btn_frnt_focus)
			{
				if (btn_frnt_tm) {
					clearTimeout(btn_frnt_tm);
					btn_frnt_tm = null;
				}

				var big_step = PKAudioEditor.engine.wavesurfer.getDuration () / 20;
				var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
				big_step /= ((zoom/2)+0.5);
				if (big_step > 1) big_step = big_step << 0;

				UI.fireEvent ('RequestSkipFront', big_step);
			}

			this.blur();
			btn_frnt_focus = false;
		};
		btn_front_jump.onmouseleave = function () {
			if (btn_frnt_tm) {
				clearTimeout(btn_frnt_tm);
				btn_frnt_tm = null;
			}
			this.blur();
		};
		btn_front_jump.onfocus = function() {
			var btn = this;
			btn_frnt_focus = false;

			var step = function ( num, count ) {
				if (document.activeElement === btn)
				{
					btn_frnt_focus = true;

					UI.fireEvent ('RequestSkipFront', num);

					var block = 4450;

					var middle_step = PKAudioEditor.engine.wavesurfer.getDuration () / block;
					var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
					middle_step /= zoom;

					if (count < 12) {
						middle_step = 0;
					}

					setTimeout(function() {
						step (num + middle_step, ++count);
					},40);
				}
			};
			btn_frnt_tm = setTimeout(function(){

				var small = PKAudioEditor.engine.wavesurfer.getDuration () / 2000;
				var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
				small /= zoom;

				if (small < 0.01) {
					small = 0.01;
				}

				step (small, 0);
			},390);
		};
		////////////////////////


		var k_arr_bck_time = 0;
		var k_arr_bck_mult = 1;
		var k_arr_bck_skip_frames = 4;
		UI.KeyHandler.addCallback ('KeyArrowBack', function ( key, c, ev ) {
			if (UI.InteractionHandler.on || !PKAudioEditor.engine.is_ready) return ;

			var time = ev.timeStamp;
			var diff = time - k_arr_bck_time;

			if (diff > 158) {
				k_arr_bck_mult = 1;
				k_arr_bck_skip_frames = 4;
			} else {
				if (--k_arr_bck_skip_frames < 0 && k_arr_bck_mult < 6.0)
					k_arr_bck_mult += 0.05;
			}

			k_arr_bck_time = time;

			// get zoom factor
			var jump = 0.5;
			var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
			var total_dur = PKAudioEditor.engine.wavesurfer.getDuration ();			

			jump = Math.max(total_dur / 200, 0.05);
			jump /= zoom;
			jump *= k_arr_bck_mult;

			UI.fireEvent( 'RequestSkipBack', jump );
		}, [37]);

		var k_arr_frnt_time = 0;
		var k_arr_frnt_mult = 1;
		var k_arr_frnt_skip_frames = 4;
		UI.KeyHandler.addCallback ('KeyArrowFront', function ( key, c, ev ) {
			if (UI.InteractionHandler.on || !PKAudioEditor.engine.is_ready) return ;

			var time = ev.timeStamp;
			var diff = time - k_arr_frnt_time;

			if (diff > 158) {
				k_arr_frnt_mult = 1;
				k_arr_frnt_skip_frames = 4;
			} else {
				if (--k_arr_frnt_skip_frames < 0 && k_arr_frnt_mult < 6.0)
					k_arr_frnt_mult += 0.05;
			}

			k_arr_frnt_time = time;

			var jump = 0.5;
			var zoom = PKAudioEditor.engine.wavesurfer.ZoomFactor;
			var total_dur = PKAudioEditor.engine.wavesurfer.getDuration ();			

			jump = Math.max(total_dur / 200, 0.05);

			jump /= zoom;
			jump *= k_arr_frnt_mult;

			UI.fireEvent( 'RequestSkipFront', jump );
		}, [39]);
		UI.KeyHandler.addCallback ('KeyShiftArrowBack', function ( key ) {
			if (UI.InteractionHandler.on || !PKAudioEditor.engine.is_ready) return ;

			var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
			if (region)
			{
				var pos = PKAudioEditor.engine.wavesurfer.ActiveMarker;
				var total_dur = PKAudioEditor.engine.wavesurfer.getDuration ();

				var durr = region.end / total_dur;

				if (pos > (durr + 0.004))
				{
					UI.fireEvent( 'RequestSeekTo', durr - 0.0001 );
					return ;
				}

				durr = region.start / total_dur;
				
				if (pos > (durr + 0.004))
				{
					UI.fireEvent( 'RequestSeekTo', durr );
					return ;
				}
			}
			
			UI.fireEvent( 'RequestSeekTo', 0 );
		}, [16, 37]);
		UI.KeyHandler.addCallback ('KeyShiftArrowFront', function ( key ) {
			if (UI.InteractionHandler.on || !PKAudioEditor.engine.is_ready) return ;

			// if region skip to the region
			var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
			if (region)
			{
				var pos = PKAudioEditor.engine.wavesurfer.ActiveMarker;
				var total_dur = PKAudioEditor.engine.wavesurfer.getDuration ();

				var durr = region.start / total_dur;
				
				if (pos < (durr - 0.004))
				{
					UI.fireEvent( 'RequestSeekTo', durr );
					return ;
				}

				durr = region.end / total_dur;

				if (pos < (durr - 0.004))
				{
					UI.fireEvent( 'RequestSeekTo', durr - 0.0001 );
					return ;
				}
			}

			UI.fireEvent( 'RequestSeekTo', 0.994 );
		}, [16, 39]);
		UI.KeyHandler.addCallback ('killctx', function ( e ) {
			var event = new Event ('killCTX', {bubbles: true});
			document.body.dispatchEvent (event);
		}, [27]);

		var btn_back_total = d.createElement ('button');
		btn_back_total.setAttribute('tabIndex', -1);
		btn_back_total.className = 'pk_btn icon-previous2';
		btn_back_total.innerHTML = '<span>Seek Start (Shift + left arrow)</span>';
		transport.appendChild ( btn_back_total );
		btn_back_total.onclick = function() {
			UI.fireEvent( 'RequestRegionClear');
			UI.fireEvent( 'RequestSeekTo', 0 );
			this.blur();
		};

		var btn_front_total = d.createElement ('button');
		btn_front_total.setAttribute('tabIndex', -1);
		btn_front_total.className = 'pk_btn icon-next2';
		btn_front_total.innerHTML = '<span>Seek End (Shift + right arrow)</span>';
		btn_front_total.onclick = function() {
			UI.fireEvent( 'RequestRegionClear');
			UI.fireEvent( 'RequestSeekTo', 0.996);
			this.blur();
		};
		transport.appendChild ( btn_front_total );


		var btn_rec = d.createElement ('button');
		btn_rec.setAttribute('tabIndex', -1);
		btn_rec.className = 'pk_btn icon-rec';
		btn_rec.innerHTML = '<span>Record (R)</span>';
		btn_rec.onclick = function() {
			if (this.getAttribute('disabled') === 'disabled') {
				this.blur (); return ;
			}

			UI.fireEvent('RequestActionRecordToggle');
			this.blur();
		};

		UI.listenFor ('ErrorRec', function() {
			btn_rec.style.opacity = 0.6;
			btn_rec.setAttribute("disabled", "disabled");
		});

		transport.appendChild ( btn_rec );
		UI.KeyHandler.addCallback ('KeyRecR', function( k ) {
			if (UI.InteractionHandler.on) return ;
			btn_rec.click ();
		}, [82]);

		UI.listenFor ('DidActionRecordStart', function () {
			btn_rec.classList.add ('pk_act');
		});
		UI.listenFor ('DidActionRecordStop', function () {
			btn_rec.classList.remove ('pk_act');
		});

		UI.KeyHandler.addCallback ('KeyTab', function ( key ) {
			if (UI.InteractionHandler.on || !PKAudioEditor.engine.is_ready) return ;

			UI.fireEvent ('RequestViewCenterToCursor');
		}, [9]);

		var is_chrome = !!window.chrome;
		var timing = d.createElement( 'div' );
		timing.className = 'pk_timecontainer';

		var timingspan = d.createElement( 'span' );

		if (!is_chrome)
		{
			timingspan.textContent = '00:00:000';
			timingspan.className = 'pk_timing';
			timing.appendChild( timingspan );
		}

		/////
		var pk_timingcnv = d.createElement( 'canvas' );
		pk_timingcnv.className = 'pk_timingcnv';
		pk_timingcnv.width = 150;
		pk_timingcnv.height = 40;
		var pk_timingnum = '00:00:000';
		var pk_timingctx = pk_timingcnv.getContext('2d', {alpha:false});
		var timing_caches = {};

		if (is_chrome)
		{
			timing.appendChild( pk_timingcnv );
			pk_timingctx.fillStyle = "#000";
			pk_timingctx.fillRect(0, 0, 150, 40);

			for (var ii = 0; ii < 11; ++ii)
			{
				var curr_cache = d.createElement('canvas');
				curr_cache.width = 18;
				curr_cache.height = 26;
				var curr_ctx = curr_cache.getContext('2d', {alpha:false});
				curr_ctx.font = "29px Helvetica, Arial, sans-serif";
				curr_ctx.textAlign = "center";
				curr_ctx.fillStyle = "#000";
				curr_ctx.fillRect(0, 0, 18, 26);
				curr_ctx.fillStyle = "#fff";
				curr_ctx.textBaseline = 'middle';

				if (ii === 10) {
					curr_ctx.fillText (':', 8, 14);
					timing_caches[':'] = curr_cache;
				}
				else {
					curr_ctx.fillText (ii + '', 9, 14);
					timing_caches[ii+''] = curr_cache;
				}
				// timing_caches.push (curr_cache);
				// document.body.appendChild( curr_cache );
			}

			(function (pk_timingctx, timing_caches){
				var ttm = '00:00:000';
				for (var jk = 0; jk < ttm.length; ++jk)
				{
					pk_timingctx.drawImage (timing_caches[ttm[jk]], jk * 16, 10);
				}
			})(pk_timingctx, timing_caches);
		}
		/////


		var total_duration = d.createElement( 'span' );
		total_duration.textContent = '00:00:000';
		total_duration.className = 'pk_total_dur';
		timing.appendChild( total_duration );
		
		var hover_duration = d.createElement( 'span' );
		hover_duration.textContent = '00:00:000';
		hover_duration.className = 'pk_hover_dur';
		timing.appendChild( hover_duration );

		setTimeout(function () {
			UI.listenFor ('DidZoom', function (v, f) {
				// do something smarter for f (event) ####
				if (f)
					hover_duration.textContent = formatTime (
						PKAudioEditor.engine.wavesurfer.drawer.handleEvent(f) * 
						PKAudioEditor.engine.wavesurfer.VisibleDuration + 
						PKAudioEditor.engine.wavesurfer.LeftProgress );
			});

			var old_refresh = 0;

			var avv = d.getElementsByClassName('pk_av')[0]; 
			avv.addEventListener ('mousemove', function ( e ) {
				// re-run the mousemove fam on zoom based on the pointer position)

				// throttle this as well ####  violation
				var new_refresh = e.timeStamp;

				if (new_refresh - old_refresh < 58) {
					return ;
				}

				old_refresh = new_refresh;

				hover_duration.textContent = formatTime (
					PKAudioEditor.engine.wavesurfer.drawer.handleEvent( e ) * 
					PKAudioEditor.engine.wavesurfer.VisibleDuration + 
					PKAudioEditor.engine.wavesurfer.LeftProgress );
			}, false);


			var main_context = PKAudioEditor._deps.ContextMenu ( avv );

			main_context.addOption ('Select Visible View', function( e,x,i ) {
				UI.fireEvent ('RequestRegionSet');
			}, false );

			main_context.addOption ('Reset Zoom', function( e ) {
				UI.fireEvent ('RequestZoomUI', 0);
			}, false );

			main_context.addOption ('Set Volume/Gain', function( e ) {
				UI.fireEvent ('RequestFXUI_Gain');
			}, false );

			main_context.addOption ('Copy', function( e ) {
				var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
				if (!region) return ;

				UI.fireEvent( 'RequestActionCopy');
			}, false );
			main_context.addOption ('Paste', function( e ) {
				if (!copable) return ;
				UI.fireEvent( 'RequestActionPaste');
			}, false );
			main_context.addOption ('Cut', function( e ) {
				var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
				if (!region) return ;

				UI.fireEvent( 'RequestActionCut', 1);
			}, false );
			main_context.addOption ('Insert Silence', function( e ) {
				UI.fireEvent ('RequestFXUI_Silence', 0); // #### call effect
			}, false );
			// --- 


			var copable = false;
			UI.listenFor ('DidSetClipboard', function ( val ) {
				if (val)
					copable = true;
				else
					copable = false;
			});

			main_context.onOpen = function ( menu, div ) {
				var divs = div.childNodes;
				if (!copable) divs[4].className += ' pk_inact';

				UI.fireEvent ('RequestPause');

				var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
				if (region) return ;

				divs[3].className += ' pk_inact';
				divs[5].className += ' pk_inact';
			};

		}, 1000);
		
		UI.listenFor ('DidUpdateLen', function( val ) {
			total_duration.textContent = formatTime (val);
		});
		
		function formatTime( time ) {
			var time_s = time >> 0;
			var miliseconds = time - time_s;

			if (time_s < 10)
			{
				if (time === 0) return '00:00:000';
				time_s = '00:0' + time_s;
			}
			else if (time_s < 60)
			{
				time_s = '00:' + time_s;
			}
			else
			{
				var m = (time_s / 60) >> 0;
				var s = (time_s % 60);
				time_s = ((m<10)?'0':'') + m + ':' + (s < 10 ? '0'+s : s);
			}

			if (miliseconds < 0.1)
			{
				return time_s + ':0' + (miliseconds < 0.01 ? '0' : '') + ((miliseconds*1000)>>0);
			}

			return time_s + ':' + ((miliseconds*1000)>>0); // (miliseconds+'').substr(2, 3);
		}
		UI.formatTime = formatTime;
		
		var volume1 = 0;
		var volume2 = 0;
		var old_refresh = 0;
		var wvpnt = document.querySelector('.pk_wavepoint');

		UI.listenFor ('DidAudioProcess', function( val ) {

			var time = val[0];
			var loudness = val[1];

			var new_refresh =  val[2] || w.performance.now ();

			if (new_refresh - old_refresh < 50) {
				return ;
			}

			old_refresh = new_refresh;

			if (time > -1)
			{
				if (!is_chrome)
				{
					timingspan.textContent = formatTime (time);
				}
				else
				{
					var ttm = formatTime (time);
					var exit = false;

					for (var jk = 0; jk < ttm.length; ++jk)
					{
						if (!exit)
						{
							if (ttm[jk] === pk_timingnum[jk]) {
								continue;
							}
							else {
								// pk_timingctx.clearRect ((jk * 16), 10, (9 - jk) * 16, 35);
								exit = true;
							}
						}

						pk_timingctx.drawImage (timing_caches[ttm[jk]], jk * 16, 10);
					}
					pk_timingnum = ttm;
				}

				
				if (PKAudioEditor.engine.wavesurfer.ZoomFactor > 1)
				{
					var perc = time / PKAudioEditor.engine.wavesurfer.getDuration ();

					if (!wvpnt) wvpnt = document.querySelector('.pk_wavepoint');
					wvpnt.style.left = ((perc * 10000)>>0)/100 + '%';
					// wvpnt.style.left = ((perc * 100).toFixed(2)/1) + '%';
				}
			}

			if (!loudness)
			{
				UI.footer.volumeGaugePeaker.className = 'pk_peaker';
				UI.footer.volumeGaugePeaker2.className = 'pk_peaker';

				UI.footer.volumeGaugeInner.style.transform = 'translate3d(0,0,0)';
				UI.footer.volumeGaugeInner2.style.transform = 'translate3d(0,0,0)';
				// UI.footer.volumeGaugeInner.style.width = '100%';
				// UI.footer.volumeGaugeInner2.style.width = '100%';
			}
			else if (loudness[0] > 0) {
				UI.footer.volumeGaugePeaker.className = 'pk_peaker pk_act';
				
				UI.footer.volumeGaugeInner.style.transform = 'translate3d(100%,0,0)';
				// UI.footer.volumeGaugeInner.style.width = '0%';
				volume1 = 100;

				UI.footer.volumeGaugePeaker.setAttribute ('title', 'Peak at ' + PKAudioEditor.engine.wavesurfer.getCurrentTime().toFixed(2) );
				if (loudness[1] > 0) {
					UI.footer.volumeGaugePeaker2.className = 'pk_peaker pk_act';
					
					UI.footer.volumeGaugeInner2.style.transform = 'translate3d(100%,0,0)';
					// UI.footer.volumeGaugeInner2.style.width = '0%';
					volume2 = 100;

					UI.footer.volumeGaugePeaker2.setAttribute ('title', 'Peak at ' + PKAudioEditor.engine.wavesurfer.getCurrentTime().toFixed(2) );
				}
			}
			else if (loudness[1] > 0) {
				UI.footer.volumeGaugePeaker2.className = 'pk_peaker pk_act';
				
				UI.footer.volumeGaugeInner2.style.transform = 'translate3d(100%,0,0)';
				// UI.footer.volumeGaugeInner2.style.width = '0%';
				volume2 = 100;

				UI.footer.volumeGaugePeaker2.setAttribute ('title', 'Peak at ' + PKAudioEditor.engine.wavesurfer.getCurrentTime().toFixed(2) );
			}
			else
			{
				var tmp = (100 + loudness[0]);
				if (tmp < -100) volume1 = 0; // tmp = -100;
				else
				{
					volume1 = volume1 + (tmp - volume1)/4;
					if (isNaN (volume1)) volume1 = 0;
				}

				tmp = (100 + loudness[1]);
				if (tmp < -100) volume2 = 0; //tmp = -100;
				else
				{
					volume2 = volume2 + (tmp - volume2)/4;
					if (isNaN (volume2)) volume2 = 0;
				}

				UI.footer.volumeGaugeInner.style.transform = 'translate3d(' + volume1 + '%,0,0)';
				UI.footer.volumeGaugeInner2.style.transform = 'translate3d(' + volume2 + '%,0,0)';
				// UI.footer.volumeGaugeInner.style.width = (100 - volume1) + '%';
				// UI.footer.volumeGaugeInner2.style.width = (100 - volume2) + '%';
			}
		});
		
		
		var actions = d.createElement( 'div' );
		actions.className = 'pk_ctns';
		
		var copy_btn = d.createElement ('button');
		copy_btn.setAttribute('tabIndex', -1);
		copy_btn.className = 'pk_btn icon-files-empty pk_inact';
		copy_btn.innerHTML = '<span>Copy Selection (Shift + C)</span>';
		actions.appendChild ( copy_btn );

		copy_btn.onclick = function() {
			UI.fireEvent( 'RequestActionCopy');
			this.blur();
		};

		UI.listenFor ('DidSetClipboard', function ( val ) {
			if (val)
				paste_btn.classList.remove ('pk_inact');
			else
				paste_btn.classList.add ('pk_inact');
		});

		var paste_btn = d.createElement ('button');
		paste_btn.setAttribute('focusable', 'false');
		paste_btn.className = 'pk_btn icon-file-text2 pk_inact';
		paste_btn.innerHTML = '<span>Paste Selection (Shift + V)</span>';
		actions.appendChild ( paste_btn );

		paste_btn.onclick = function() {
			UI.fireEvent( 'RequestActionPaste');
			this.blur();
		};

		var cut_btn = d.createElement ('button');
		cut_btn.setAttribute('tabIndex', -1);
		cut_btn.className = 'pk_btn icon-scissors pk_inact';
		cut_btn.innerHTML = '<span>Cut Selection (Shift + X)</span>';
		actions.appendChild ( cut_btn );

		cut_btn.onclick = function() {
			UI.fireEvent( 'RequestActionCut', 1);
			this.blur();
		};
		
		var silence_btn = d.createElement ('button');
		silence_btn.setAttribute('tabIndex', -1);
		silence_btn.className = 'pk_btn icon-silence';
		silence_btn.innerHTML = '<span>Insert Silence (Shift + N)</span>';
		actions.appendChild ( silence_btn );
		
		UI.KeyHandler.addCallback ('KeyShiftN', function( k ) {
			if (UI.InteractionHandler.on) return ;
			
			silence_btn.click ();
		},[16, 78]);

		silence_btn.onclick = function() {
			UI.fireEvent( 'RequestFXUI_Silence');			
			this.blur();
		};

		
		
		var selection = d.createElement( 'div' );
		selection.className = 'pk_selection';
		selection.innerHTML = '<div class="pk_sellist">' + 
			'<span class="pk_title">Selection:</span>' + 
			'<div><span class="title">Start:</span><span class="s_s pk_dat">-</span></div>' + 
			'<div><span class="title">End:</span><span class="s_e pk_dat">-</span></div>' + 
			'<div><span  class="title">Duration:</span><span class="s_d pk_dat">-</span></div>' +
		'</div>';
		
		var btn_clear_selection = d.createElement ('button');
		btn_clear_selection.setAttribute('tabIndex', -1);
		btn_clear_selection.className = 'pk_btn icon-clearsel pk_inact';
		btn_clear_selection.innerHTML = '<span>Clear Selection (Q key)</span>';

		var sel_spans = selection.getElementsByClassName('pk_dat');
		UI.listenFor ('DidCreateRegion', function ( region ) {
			copy_btn.classList.remove ('pk_inact');
			cut_btn.classList.remove ('pk_inact');
			btn_clear_selection.classList.remove  ('pk_inact');
			
			if (region)
			{
				if (!sel_spans[0]) sel_spans = document.querySelectorAll('.pk_sellist .pk_dat');
				sel_spans[0].textContent = region.start.toFixed(3);
				sel_spans[1].textContent = region.end.toFixed(3);
				sel_spans[2].textContent = (region.end - region.start).toFixed(3);
			}
		});
		UI.listenFor ('DidDestroyRegion', function () {
			copy_btn.classList.add ('pk_inact');
			cut_btn.classList.add  ('pk_inact');
			btn_clear_selection.classList.add  ('pk_inact');

			if (!sel_spans[0]) sel_spans = document.querySelectorAll('.pk_sellist .pk_dat');
			sel_spans[0].textContent = '-';
			sel_spans[1].textContent = '-';
			sel_spans[2].textContent = '-';
		});
		
		btn_clear_selection.onclick = function () {
			UI.fireEvent( 'RequestRegionClear');
			this.blur ();
		};
		selection.appendChild ( btn_clear_selection );
		
		toolbar.appendChild ( timing );
		
		
		UI.listenFor ('DidChanToggle', function ( chan, val ) {
			var region = PKAudioEditor.engine.wavesurfer.regions.list[0];
			if (!region) return ;

			if (val === 1) {
				region.element.style.top = '0';
				region.element.style.height = '100%';
				return ;
			}

			if (chan === 0) {
				region.element.style.top = '50%';
				region.element.style.height = '50%';
				return ;
			}

			if (chan === 1) {
				region.element.style.top = '0';
				region.element.style.height = '50%';
			}
			//
		});

		// end
		toolbar.appendChild ( btn_groups );
		btn_groups.appendChild ( transport );
		btn_groups.appendChild ( actions );
		toolbar.appendChild ( selection );

		container.appendChild ( toolbar );

		UI.el.appendChild ( container );

		dragNDrop( d.getElementById('app'), 'pk_overlay', function ( e ) {
			PKAudioEditor.engine.LoadArrayBuffer ( new Blob([e]) );
		}, 'arrayBuffer' );

		// -
	};

	function _makeMobileScroll (UI) {

		var getFactor = function () {
			var screen_h = window.screen.height;
			var screen_w = window.screen.width;

			var iw = window.innerWidth;
			var ih = window.innerHeight;

			var bars_visible = false;
			var ratio = 0;

			if (window.orientation === 0) {
				ratio = ih / screen_h;
			}
			else if (window.orientation === 90 || window.orientation === -90) {
				ratio = ih / screen_w;
			}
			if (ratio < 0.8) bars_visible = true;

			return (bars_visible);
		};

		var ex = -1;
		var ey = -1;

		var allow = false;
		// var first = false;
		d.body.addEventListener ('touchstart', function( e ) {
			ex = e.touches[0].pageX;
			ey = e.touches[0].pageY;

			// first = true;
			allow = false;
		});

		d.body.addEventListener ('touchend', function( e ) {
			ex = -1;
			ey = -1;

			// first = false;
			allow = false;
		});

		d.body.addEventListener ('touchmove', function( e ) {
			if (e.target.tagName === 'INPUT') return ;
			if (allow) return ;

			var ny = e.touches[0].pageY;
			var nx = e.touches[0].pageX;
			var direction = ey - ny;
			var direction2 = ex - nx;

			// if (first) {
			//	first = false;
			// }

			if ( direction === 0 || (Math.abs (direction) < 3 && Math.abs (direction2) > 3 ) || (Math.abs (direction) < 6 && Math.abs (direction2) > 10 ) ) {
				ey = ny;
				ex = nx;
				allow = true;

				return ;
			}

			ey = ny;
			ex = nx;

			var xx = document.getElementsByClassName ('pk_modal_back');

			if (xx[0])
			{
				xx = xx[0];
				if ( xx.scrollHeight > window.innerHeight )
				{
					var scrolled = xx.scrollTop;

					if (direction > 0)
					{
						var modal_h = document.getElementsByClassName ('pk_modal')[0].clientHeight;

						if ((modal_h - scrolled) < (window.innerHeight - 80))
						{
							e.preventDefault ();
						}
					}
					else
					{
						if (scrolled <= 0)
						{
							e.preventDefault ();
						}
					}

					allow = true;
					return ;
				}
				else
				{
					e.preventDefault ();

					allow = true;
					return ;
				}
			}


			if (!getFactor ()) {
				e.preventDefault ();
				allow = true;
			}

		}, {passive:false});
	};
	// ---

	PKAE._deps.ui = PKUI;
	
})( window, document, PKAudioEditor );
(function ( w, d ) {
	
	var _id = 0;

	function PKSimpleModal ( config ) {
		var q = this;

		this.id = config.id ? config.id : (++_id);

		var el = d.createElement ('div');
		this.els = {
			toolbar:[],
			bottom:[]
		};
		el.className = 'pk_modal ' + (config.clss ? config.clss : '');

		q.el = el;

		// backdrop
		var el_back = d.createElement ('div');
		el_back.className = 'pk_modal_back';
		this.el_back = el_back;

		// var centerer
		var el_cont = d.createElement ('div');
		el_cont.className = 'pk_modal_cnt';
		this.el_cont = el_cont;
		
		// title
		var el_title = d.createElement ('div');
		el_title.className = 'pk_noselect pk_modal_title';
		el_title.innerHTML = '<span>'+ (config.title || '') +'</span>';
		el.appendChild ( el_title );
		this.el_title = el_title;

		// main
		var el_main = d.createElement ('div');
		el_main.className = 'pk_modal_main';
		el.appendChild ( el_main );
		this.el_body = el_main;

		// bottom buttons
		var el_bottom = d.createElement ('div');
		el_bottom.className = 'pk_noselect pk_modal_bottom';
		// -----------
		var a_cancel = d.createElement ('a');
		a_cancel.innerHTML = 'CANCEL';
		a_cancel.className = 'pk_modal_cancel pk_modal_a_bottom';
		a_cancel.onclick = function () {
			q.Destroy ();
		};
		el_bottom.appendChild ( a_cancel );
		
		// check if we need to construct more buttons from the config...
		if (config.buttons && config.buttons.length > 0)
		{
			for (var i = 0; i < config.buttons.length; ++i)
			{
				var curr = config.buttons[i];

				if (!curr.title || !curr.callback) continue;
				var a_bottom = d.createElement ('a');
				a_bottom.innerHTML = curr.title;
				a_bottom.className = 'pk_modal_a_bottom ' + (curr.clss ? curr.clss : '');
				
				if (curr.callback)
				{
					(function ( callback ) {
						a_bottom.onclick = function () {
							callback ( q );
						};
					})( curr.callback );
				}
				q.els.bottom.push (a_bottom);
				el_bottom.appendChild ( a_bottom );
			}
		}
		el.appendChild ( el_bottom );

		// -----
		if (config.toolbar && config.toolbar.length > 0)
		{
			for (var i = 0; i < config.toolbar.length; ++i)
			{
				var curr = config.toolbar[i];
				if (!curr.title || !curr.callback) continue;
				var a_link = d.createElement ('a');
				a_link.innerHTML = curr.title;
				a_link.className = 'pk_modal_a_top ' + (curr.clss ? curr.clss : '');
				el_title.appendChild ( a_link );

				if (curr.callback)
				{
					(function ( callback ) {
						a_link.onclick = function () {
							callback ( q, this );
						};
					})( curr.callback );
				}
				q.els.toolbar.push (a_link);
			}
		}

		this.ondestroy = config.ondestroy;
		if (config.body) q.el_body.innerHTML = config.body;
		if (config.onpreset) this.onpreset = config.onpreset;
		if (config.setup) config.setup ( this );
	};
	
	PKSimpleModal.prototype.Show = function () {

		this.el_back.appendChild ( this.el_cont );
		this.el_cont.appendChild ( this.el );

		d.body.appendChild ( this.el_back );

		return (this);
	};

	PKSimpleModal.prototype.Destroy = function () {

		if (this.ondestroy) {
			this.ondestroy ( this );
			this.ondestroy = null;
		}
		this.els = null;
		d.body.removeChild ( this.el_back );
	};

	
	// Extended modal 
	function PKAudioFXModal ( config, app ) {
		var toolbar = null;

		if (config.preview)
		{
			toolbar = [
				{
					title:'ON',
					clss:'pk_inact',
					callback: function ( q, el ) {
						app.fireEvent ('RequestActionFX_TOGGLE');
					}
				},
				{
					title:'Preview',
					callback: function ( q ) {
						config.preview && config.preview ( q );
					}
				}
			];
		}

		var inner_modal = new PKSimpleModal({
			id: config.id,
			title: config.title,
			clss: config.clss,
			presets: config.presets,
			updateFilter: config.updateFilter,
			ondestroy: function ( q ) {

				app.fireEvent ('DidCloseFX_UI');

				app.stopListeningFor ('DidStartPreview',  q._evstart);
				app.stopListeningFor ('DidStopPreview',   q._evstop);
				app.stopListeningFor ('DidTogglePreview', q._evtoggle);
				app.stopListeningFor ('DidSetPresets', q._updatePresets);
				app.stopListeningFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);
				app.stopListeningFor ('RequestSetPresetActive',  q._updpreset);

				app.fireEvent ('RequestActionFX_PREVIEW_STOP');

				// if preview remove callback
				app.ui.KeyHandler.removeCallback ('ksp' + q.id);

				
				config.ondestroy && config.ondestroy ( q );
			},
			toolbar: toolbar,
			buttons: config.buttons,
			body: config.body,
			onpreset: config.onpreset,
			setup:function( q ) {
				app.fireEvent ('RequestActionFX_TOGGLE', 1);

				var slf = this;
				app.ui.KeyHandler.addCallback ('ksp' + q.id, function ( key, map ) {
					if (!app.ui.InteractionHandler.check ('modalfx')) return ;

					var tb = slf.toolbar;
					if (tb && tb.length > 0)
					{
						var k = tb.length;
						while (k-- > 0) {
							if (tb[k].title === 'Preview') {
								tb[k].callback ( q );
								break;
							}
						}
					}
				}, [32]);

			  q._evstart = function () {
				  q.els.toolbar[0].classList.remove ('pk_inact');
				  q.els.toolbar[1].classList.add ('pk_act');
			  };
			  q._evstop = function () {
				  q.els.toolbar[0].classList.add ('pk_inact');
				  q.els.toolbar[1].classList.remove ('pk_act');										  
			  }

			  q._evtoggle = function ( val ) {
				  var el = q.els.toolbar[0];
				  if (val) el.innerHTML = 'ON';
				  else el.innerHTML = 'OFF';									
			  };

			  var stopped_listening = false;
			  q._updpreview = function ( val ) {
					var sel_opt = q.el_presets.options[q.el_presets.selectedIndex];
				  	var btn = q.el.getElementsByClassName('pk_sel_edt')[0];

				  	if (val === 't')
				  	{
				  		if (sel_opt && sel_opt.getAttribute('data-custom')) {
							btn.style.visibility = 'visible';
							btn.style.opacity = '1';
							app.stopListeningFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);
				  		}
				  		else
				  		{
							btn.style.visibility = 'hidden';
							btn.style.opacity = '0';

							app.stopListeningFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);

							//if (stopped_listening)
							//{
								setTimeout(function (){
				  					app.listenFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);
				  				}, 100);
				  				stopped_listening = false;
							//}
				  		}
						return ;
				  	}

					// if (sel_opt && sel_opt.getAttribute('data-custom')) {
					btn.style.visibility = 'visible';
					btn.style.opacity = '1';
					stopped_listening = true;
					app.stopListeningFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);
					// }
			  };

			  q._updpreset = function ( fx_id, preset_id ) {
			  	  if (fx_id && fx_id !== q.id) {
			  	  	return ;
			  	  }

		  		  var opts = q.el_presets.getElementsByTagName('option');
		  		  var ll = opts.length;
		  		  var curr = null;

		  		  while (ll-- > 0) {
		  		  	curr = opts[ll];

		  		  	if (curr.getAttribute('data-custom') === preset_id) {
		  		  		curr.selected = 'selected';
		  		  		break;
		  		  	}
		  		  }
			  };

			  q._updatePresets = function ( fx_id, presets ) {
			  	  if (fx_id && fx_id !== q.id) {
			  	  	return ;
			  	  }

				  var d = document;
				  var sel_presets = q.el.getElementsByClassName ('pk_sel'); 

				  // if presets exist remove them
				  if (sel_presets.length > 0)
				  {
				  		  sel_presets = sel_presets[0];
				  		  var opts = sel_presets.getElementsByTagName('option');
				  		  var ll = opts.length;
				  		  var curr = null;

				  		  while (ll-- > 0) {
				  		  	curr = opts[ll];

				  		  	if (curr.getAttribute('data-custom')) {
				  		  		sel_presets.removeChild( curr );
				  		  	}
				  		  }

				  		  if (presets.length === 0) return ;

							var opt = d.createElement ('option');
							// opt.value = '---custom----';
							opt.setAttribute ('disabled', '1');
							opt.setAttribute ('data-custom', '1');
							opt.innerHTML = '----custom-----';
							sel_presets.appendChild( opt );

						  for (var i = 0; i < presets.length; ++i)
						  {
							var opt = d.createElement ('option');
							var curr = presets[ i ];
							opt.value = curr.val;
							opt.setAttribute ('data-custom', curr.id);
							opt.innerHTML = curr.name;
							sel_presets.appendChild( opt );
						  }

				  		  return ;
				  }
				  else
				  {
				  		sel_presets = d.createElement ('select');
				  		sel_presets.className = 'pk_sel';
				  }

				  if (presets.length === 0) return ;


				  for (var i = -1; i < presets.length; ++i)
				  {
					var opt = d.createElement ('option');
					
					if (i === -1)
					{
						opt.value = 'null';
						opt.innerHTML = 'Presets';
					}
					else
					{
						var curr = presets[ i ];
						opt.value = curr.val;
						opt.innerHTML = curr.name;
					}
					sel_presets.appendChild( opt );
				  }
				  
				  sel_presets.onchange = function () {
					  var val_arr = this.value.split(',');
					  var els = q.el.getElementsByTagName('input');

					  q._updpreview ('t');

					  if (q.onpreset)
					  {
					  	q.onpreset (this.value);
					  	return ;
					  }

					  var len = els.length;
					  
					  for (var i = 0; i < len; ++i) {
						  if (!val_arr[ i ]) break;

						  var curr_val = val_arr[ i ].trim ();
						  var curr_input = els[ i ];
						  
						  if (curr_val === 'null') continue;
						  
						  if (curr_input.type === 'checkbox' || curr_input.type === 'radio')
							curr_input.checked = curr_val;
						  else
						  {
							curr_input.value = curr_val;
							curr_input.oninput && curr_input.oninput.apply (curr_input);
						  }
					  }
				  };
				  var btm = q.el.getElementsByClassName('pk_modal_bottom')[0];

				  btm.appendChild ( sel_presets );
				  q.el_presets = sel_presets;

				  // now add preset edit button
				  var edit_presets = d.createElement ('a');
				  edit_presets.className = 'pk_sel_edt';
				  edit_presets.innerHTML = '...<span>Save or Modify preset</span>';
				  edit_presets.onclick = function () {
				  	app.fireEvent ('RequestSavePreset');
				  };

				  btm.appendChild ( edit_presets );
				  app.listenFor ('RequestActionFX_UPDATE_PREVIEW',  q._updpreview);
				  app.listenFor ('RequestSetPresetActive',  q._updpreset);
			  };


			  app.listenFor ('DidStartPreview',  q._evstart);
			  app.listenFor ('DidStopPreview',   q._evstop);
			  app.listenFor ('DidTogglePreview', q._evtoggle);
			  app.fireEvent ('DidOpenFX_UI', q);

			  if (config.updateFilter) q.updateFilter = config.updateFilter;
			  
			  if (config.presets)
			  {
			  	q._updatePresets (null, config.presets);
			  	if (config.custom_pres) q._updatePresets (null, config.custom_pres);

				app.listenFor ('DidSetPresets', q._updatePresets);
			  }

			  config.setup && config.setup ( q );
			}
		});
	
		return (inner_modal);
	};
	
	w.PKSimpleModal = PKSimpleModal;
	w.PKAudioFXModal = PKAudioFXModal;
})( window, document );
(function ( PKAE ) {
	'use strict';
	
	function PKState ( _depth, app ) {
		if (!_depth) _depth = 1;

		var q = this;

		var _id = 1;
		var _fireEvent = app.fireEvent;
		var _listenFor = app.listenFor;

		var undo_state_list = [];
		var redo_state_list = [];

		q.getLastUndoState = function () {
			return (undo_state_list [ undo_state_list.length - 1]);
		};

		q.pushUndoState = function ( state ) {
			if (!state) return (false);

			if (!state.id) state.id = ++_id;
			if (undo_state_list.length >= _depth) undo_state_list.shift ();

			if (undo_state_list.length > 0)
			{
				if (undo_state_list[undo_state_list.length - 1].id !== state.id - 1)
					undo_state_list = [];
			}
			if (redo_state_list.length > 0)
			{
				if (redo_state_list[0].id !== state.id + 1)
					redo_state_list = [];
			}

			undo_state_list.push ( state );

			_fireEvent ( 'StatePush', undo_state_list.length );
			_fireEvent ( 'DidStateChange', undo_state_list, redo_state_list);
			
			return (true);
		};

		q.popUndoState = function () {
			var last_state =undo_state_list.pop ();

			if (last_state) {	
				if (redo_state_list.length > 0)
				{
					if (redo_state_list[0].id !== last_state.id + 1)
						redo_state_list = [];
				}

				var temp = app.engine.wavesurfer.backend.buffer;
				_fireEvent ( 'StateDidPop', last_state, 1 );
				
				last_state.data = temp; 
				redo_state_list.unshift (last_state);

				_fireEvent ( 'DidStateChange', undo_state_list, redo_state_list);
			}

			return (last_state);
		};
		
		q.shiftRedoState = function () {
			var last_state = redo_state_list.shift ();
			
			if (last_state) {
				if (undo_state_list.length > 0)
				{
					if (undo_state_list[undo_state_list.length - 1].id !== last_state.id - 1)
						undo_state_list = [];
				}

				var temp = app.engine.wavesurfer.backend.buffer;
				_fireEvent ( 'StateDidPop', last_state, 0 );

				last_state.data = temp; 
				undo_state_list.push (last_state);

				_fireEvent ( 'DidStateChange', undo_state_list, redo_state_list);
			}
			
			return (last_state);
		};
		
		q.clearAllState = function () {
			undo_state_list = [];
			redo_state_list = [];

			_fireEvent ( 'StateClearAll' );
			_fireEvent ( 'DidStateChange', [], []);
		};

		_listenFor ('StateRequestPush', function ( _state ) {
			q.pushUndoState ( _state );
		});
		_listenFor ('StateRequestUndo', function () {
			q.popUndoState ();
		});
		_listenFor ('StateRequestRedo', function () {
			q.shiftRedoState ();
		});
		_listenFor ('StateRequestClearAll', function () {
			q.clearAllState ();
		});
		_listenFor ('StateRequestLastState', function () {
			_fireEvent ('StateDidLastState', q.getLastUndoState ());
		});
		// -
	};
	
	PKAE._deps.state = PKState;
	
})( PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';

	function PKEng ( app ) {
		var q = this;
		
		var wavesurfer = WaveSurfer.create ({
			container: '#' + 'pk_av_' + app.id,
			scrollParent: false,
			hideScrollbar:true,
			partialRender:false,
			fillParent:false,
			pixelRatio:1,
			progressColor:'rgba(128,85,85,0.24)',
			splitChannels:true,
			autoCenter:true,
			height:w.innerHeight - 168,
			plugins: [
				WaveSurfer.regions.create({
					dragSelection: {
						slop: 5
					}
				})
			]
		});
		this.wavesurfer = wavesurfer;

		var AudioUtils = new app._deps.audioutils ( app, wavesurfer );
		q.is_ready = false;
		
		this.TrimTo = function( val, num ) {
			var nums = {'0':1, '1':10, '2':100,'3':1000,'4':10000,'5':100000};
			var dec = nums[num];
			return ((val *dec) >> 0) / dec;
		}

		this.LoadArrayBuffer = function ( e ) {
			var func = function () {
				app.listenFor ('RequestCancelModal', function() {
					wavesurfer.cancelBufferLoad ();
					if (wavesurfer.arraybuffer) q.is_ready = true;

					app.fireEvent ('RequestResize');
					setTimeout(function() { app.fireEvent ('DidDownloadFile'); }, 12);
					app.stopListeningForName ('RequestCancelModal');

					OneUp ('Canceled Loading', 1350);
				});

				app.fireEvent ('RequestZoomUI', 0);

				app.fireEvent ('WillDownloadFile');
				q.is_ready = false;
				wavesurfer.loadBlob( e );
				app.fireEvent ('DidUnloadFile');

				wavesurfer.regions && wavesurfer.regions.clear();
			};

			if ( q.is_ready )
			{
					//  ----------------
					new PKSimpleModal ({
						title : 'Open or append',
						clss  : 'pk_modal_anim pk_fnt10',
						ondestroy : function ( q ) {
							app.ui.InteractionHandler.on = false;
							app.ui.KeyHandler.removeCallback ('modalTempErr');
						},
						buttons:[
							{
								title:'OPEN NEW',
								callback: function( q ) {
									wavesurfer.backend._add = 0;
									func ();
									q.Destroy ();
								}
							},
							{
								title:'ADD IN EXISTING',
								callback: function( q ) {
									wavesurfer.backend._add = 1;
									func ();
									q.Destroy ();
								}
							}
						],
						body    : '<p>Append file to existing track?</p>',
						setup   : function( q ) {
							app.ui.InteractionHandler.checkAndSet ('modal');
							app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
								q.Destroy ();
							}, [27]);
						}
					}).Show ();

					return ;
			}

			wavesurfer.backend._add = 0;
			func ();
			// --- 
		};

		this.LoadDB = function ( e ) {
			var new_buffer = wavesurfer.backend.ac.createBuffer (
					e.data.length,
					e.data[0].byteLength / 4,
					e.samplerate
			);

			for (var i = 0; i < e.data.length; ++i) {

				var arr = new Float32Array (e.data[i]);

				if (new_buffer.copyToChannel)
				{
					new_buffer.copyToChannel (arr, i, 0);
				}
				else
				{
					var chan = new_buffer.getChannelData (i);
					chan.set (arr);
				}
			}

			var append = wavesurfer.backend._add;
			var old_durr = wavesurfer.getDuration ();

			PKAudioEditor.engine.wavesurfer.loadDecodedBuffer (new_buffer);
			_compute_channels ();
			var new_durr = wavesurfer.getDuration ();
			app.fireEvent ('DidUpdateLen', new_durr);

			if (!append) app.fireEvent ('RequestSeekTo', 0);
			else {
					wavesurfer.regions.clear();
					wavesurfer.regions.add({
						start:old_durr,
						end:new_durr,
						id:'t'
					});
			}
			// --------
		};

		this.LoadFile = function ( e ) {
			if (e.files.length > 0)
			{
				if (e.files[0].type == "audio/mp3"
					|| e.files[0].type == "audio/wave"
					|| e.files[0].type == "audio/mpeg"
					|| e.files[0].type == "audio/aiff"
					|| e.files[0].type == "audio/flac"
					|| e.files[0].type == "audio/ogg")
				{

							var func = function () {
									app.listenFor ('RequestCancelModal', function() {
										wavesurfer.cancelBufferLoad ();
										AudioUtils.DownloadFileCancel ();
										if (wavesurfer.arraybuffer) q.is_ready = true;

										app.fireEvent ('RequestResize');
										setTimeout(function() { 
											app.fireEvent ('DidDownloadFile');
										}, 12);
										app.stopListeningForName ('RequestCancelModal');

										OneUp ('Canceled Loading', 1350);
									});

									app.fireEvent ('WillDownloadFile');
									q.is_ready = false;
									wavesurfer.loadBlob( e.files[0] );
									app.fireEvent ('DidUnloadFile');
									wavesurfer.regions && wavesurfer.regions.clear();
							};

							if ( q.is_ready )
							{
									//  ----------------
									new PKSimpleModal ({
										title : 'Open or append',
										clss  : 'pk_modal_anim pk_fnt10',
										ondestroy : function ( q ) {
											app.ui.InteractionHandler.on = false;
											app.ui.KeyHandler.removeCallback ('modalTempErr');
										},
										buttons:[
											{
												title:'OPEN NEW',
												callback: function( q ) {
													wavesurfer.backend._add = 0;
													func ();
													q.Destroy ();
												}
											},
											{
												title:'ADD IN EXISTING',
												callback: function( q ) {
													wavesurfer.backend._add = 1;
													func ();
													q.Destroy ();
												}
											}
										],
										body    : '<p>Append file to existing track?</p>',
										setup   : function( q ) {
											app.ui.InteractionHandler.checkAndSet ('modal');
											app.ui.KeyHandler.addCallback ('modalTempErr', function ( e ) {
												q.Destroy ();
											}, [27]);
										}
									}).Show ();

									return ;
							}

							wavesurfer.backend._add = 0;
							func ();

							// ----					
				}
			}
		};

		this.DownloadFile = function ( name, format, kbps, selection, stereo ) {
			if (!q.is_ready) return ;

			app.fireEvent ('WillDownloadFile');

			app.listenFor ('RequestCancelModal', function() {
				AudioUtils.DownloadFileCancel ();
				if (wavesurfer.arraybuffer) q.is_ready = true;

				app.fireEvent ('RequestResize');
				setTimeout(function() { app.fireEvent ('DidDownloadFile'); }, 12);
				app.stopListeningForName ('RequestCancelModal');
			});

			setTimeout(function() {
				AudioUtils.DownloadFile ( name, format, kbps, selection, stereo, function ( val ) {
					if (val === 'done')
					{
						setTimeout(function() { app.fireEvent ('DidDownloadFile'); }, 12);
						app.stopListeningForName ('RequestCancelModal');
					}
					else
						app.fireEvent ('DidProgressModal', val);
				});
			}, 220);
		}
		this.LoadSample = function () {

			app.fireEvent ('WillDownloadFile');
			
			setTimeout(function () {

				app.listenFor ('RequestCancelModal', function() {
					if (wavesurfer.cancelAjax ())
					{
						if (wavesurfer.arraybuffer) q.is_ready = true;

						app.fireEvent ('RequestResize');
						setTimeout(function() { app.fireEvent ('DidDownloadFile'); }, 12);
						app.stopListeningForName ('RequestCancelModal');

						OneUp ('Canceled Loading', 1380);
					}
				});

				app.fireEvent ('RequestZoomUI', 0);
				q.is_ready = false;
				wavesurfer.load ('test.mp3');
			}, 180);
		}
		this.LoadURL = function ( url ) {
			app.fireEvent ('WillDownloadFile');

			/*
			var context =  new AudioContext (); // wavesurfer.backend.ac;
			var audio_el = d.createElement ('audio');
			audio_el.autoplay = true;
			audio_el.controls = true;
			audio_el.preload = true;
//			audio_el.playbackRate = 0.5;
			d.body.appendChild( audio_el );
			audio_el.src = url;

			setTimeout(function() {
				var source = context.createMediaElementSource (audio_el);
				// source.connect(context.destination);

				var time_duration = audio_el.duration / 1;
				var first = true;
				var audio_buffer = null;
				var sample_rate = 0;
				var chans = 0;

				var scriptNode = context.createScriptProcessor (4096, 1, 1);
				window.sss = scriptNode;
				window.eee = source;
				window.ccc = context;

				var prev_time = 0;

				scriptNode.onaudioprocess = function( ev ) {
					if (audio_el.paused) return ;

					var ctime = audio_el.currentTime / 1;

					if ((ctime + 0.0001) >= time_duration)
					{
						//if (!first) {
						//	console.log ("done");
						//	first = 100;
						//}
						return ;
					}

					var inputBuffer = ev.inputBuffer;
					// var outputBuffer = ev.outputBuffer;

					if (first) {
						first = false;

						sample_rate = inputBuffer.sampleRate;
						chans      = inputBuffer.numberOfChannels;
						audio_buffer = context.createBuffer (
							inputBuffer.numberOfChannels,
							time_duration * inputBuffer.sampleRate,
							inputBuffer.sampleRate
						);

						window.audio_buffer = audio_buffer;
					}

					var curr_time = (ctime * sample_rate) >> 0;

					 // console.log( curr_time, "   ", (curr_time - prev_time), "  ", ((curr_time - prev_time) > (4096*2))?true:false  );
					 // prev_time = curr_time;

					  for (var channel = 0; channel < inputBuffer.numberOfChannels; ++channel) {
					    var inputData = inputBuffer.getChannelData(channel);
					    // var outputData = outputBuffer.getChannelData(channel);
					    var final_data = audio_buffer.getChannelData(channel);

					    // console.log( inputData );

					    // Loop through the 4096 samples
					    for (var sample = 0; sample < inputBuffer.length; ++sample) {
					      // make output equal to the same as the input
					      // outputData[sample] = inputData[sample];

					      final_data[curr_time + sample] = inputData[sample];

					      // add noise to each output sample
					      // outputData[sample] += ((Math.random() * 2) - 1) * 0.2;         
					    }
					  }
				};

				source.connect(scriptNode);
				scriptNode.connect(context.destination);
			},2000);
			*/

			setTimeout(function () {
				app.listenFor ('RequestCancelModal', function() {
					if (wavesurfer.cancelAjax())
					{
						if (wavesurfer.arraybuffer) q.is_ready = true;

						app.fireEvent ('RequestResize');
						setTimeout(function() { app.fireEvent ('DidDownloadFile'); }, 12);
						app.stopListeningForName ('RequestCancelModal');

						OneUp ('Canceled Loading', 1350);
					}
				});

				wavesurfer.load ( url );
				q.is_ready = false;
			}, 180);
		}

		app.listenFor ('RequestResize', function () {
			wavesurfer.fireEvent ('resize');

			var h = window.innerHeight;
			var bottom = 0;

			if (app.ui && app.ui.BarBtm) {
				bottom = (app.ui.BarBtm.on ? app.ui.BarBtm.height : 0);
			}

			wavesurfer.setHeight( (h < 280 ? 280 : h) - 168 - bottom);
			// app.fireEvent ('DidResize');
		});

		wavesurfer.on ('ready', function () {
			app.fireEvent ('DidReadyFire');

			if (wavesurfer.backend._add) {
				wavesurfer.backend._add = 0;
			}

			if (q.is_ready) return ;
			q.is_ready = true;

			// dirty hack for default message
			var dirtymsg = document.getElementsByClassName('pk_tmpMsg');
			if (dirtymsg.length > 0)
			{
				dirtymsg = dirtymsg[0];
				dirtymsg.parentNode.removeChild( dirtymsg );
			}

			copy_buffer = null;
			app.fireEvent ('DidDownloadFile');

			app.fireEvent ('StateRequestClearAll');
			app.fireEvent ('DidLoadFile');
			app.fireEvent ('DidUpdateLen', wavesurfer.getDuration ());
			app.fireEvent ('DidSetClipboard', 0);
			app.fireEvent ('RequestSeekTo', 0);

			app.fireEvent ('RequestResize');
			wavesurfer.getWaveEl().style.opacity = '1';

			// loaded successfully
			app.stopListeningForName ('RequestCancelModal');

			setTimeout(function () {OneUp ('Loaded Successfully')}, 180);

			// check if the audio file is mono or stereo and rebuild both UI and audio engine accordingly...
			if (wavesurfer.backend.buffer.numberOfChannels === 1) {
				wavesurfer.backend.SetNumberOfChannels (1);
				wavesurfer.ActiveChannels = [1];
				wavesurfer.drawer.params.ActiveChannels = wavesurfer.ActiveChannels;
				wavesurfer.SelectedChannelsLen = 1;

				app.el.classList.add ('pk_mono');
			} else if (wavesurfer.backend.buffer.numberOfChannels === 2) {
				wavesurfer.backend.SetNumberOfChannels (2);
				wavesurfer.ActiveChannels = [1, 1];
				wavesurfer.drawer.params.ActiveChannels = wavesurfer.ActiveChannels;
				wavesurfer.SelectedChannelsLen = 2;

				app.el.classList.remove ('pk_mono');
			}
			// ---
		});

		wavesurfer.on ('pause', function() {
			app.fireEvent ('DidStopPlay');
		});
		wavesurfer.on ('play', function() {
			app.fireEvent ('DidPlay');
		});
		wavesurfer.on ('seek', function ( where, stamp ) {
			var time = wavesurfer.getCurrentTime();
			var loudness = wavesurfer.getLoudness();

			app.fireEvent ('DidAudioProcess', [time, loudness, stamp]);
		});

		app.listenFor ('RequestStop', function( val ) {
			if (app.rec.isActive ()) {
				app.fireEvent ('RequestActionRecordStop');
				return (false);
			}

			var region = wavesurfer.regions.list[0];
			if (region) wavesurfer.ActiveMarker = region.start / wavesurfer.getDuration ();

			wavesurfer.stop ( val );
		});
		app.listenFor ('RequestPlay', function ( x ) { // unique listener
			if (q.in_fx) return ;

			app.fireEvent ('RequestActionRecordStop');

			if ( !x && wavesurfer.isPlaying ()) {
				wavesurfer.stop ();
				wavesurfer.play ();
			}
			else {
				if (!app.rec.isActive ()) {
					wavesurfer.play ();
				} else {
					setTimeout(function() {
						if (!app.rec.isActive () && !x && !wavesurfer.isPlaying ()) {
							wavesurfer.play ();
						}
					}, 220);
				}
			}
		});
		app.listenFor ('RequestPause', function () {
			app.fireEvent ('RequestActionRecordStop');
			wavesurfer.pause();
		});

		app.listenFor ('RequestSetLoop', function () {
			if (!q.is_ready) return ;

			var skip_seek = false;

			if (wavesurfer.regions.list[0])
			{
				if (wavesurfer.regions.list[0].loop)
					wavesurfer.regions.list[0].loop = false;
				else
					wavesurfer.regions.list[0].loop = true;
			}
			else
			{
				skip_seek = true;
				wavesurfer.regions.add({
					start:0.01,
					end:wavesurfer.getDuration() - 0.01,
					id:'t'
				});
				wavesurfer.regions.list[0].loop = true;
			}
			
			var will_loop = wavesurfer.regions.list[0].loop;
			app.fireEvent('DidSetLoop', will_loop);
			if (will_loop && !skip_seek /*&& wavesurfer.isPlaying ()*/) {
				app.fireEvent ('RequestSeekTo', wavesurfer.regions.list[0].start / wavesurfer.getDuration ());
			}
		});
		app.listenFor ('RequestSkipBack', function( val ) {
			wavesurfer.skipBackward ( val )
		});
		app.listenFor ('RequestSkipFront', function( val ) {
			wavesurfer.skipForward ( val );
		});
		app.listenFor ('RequestSeekTo', function( val ) {
			if (val > 1.0) return ;
			wavesurfer.seekTo( val );
		});
		app.ui.KeyHandler.addCallback ('zkA', function ( key, m, e ) {
			e.preventDefault ();
		}, [38]);
		app.ui.KeyHandler.addCallback ('zkD', function ( key, m, e ) {
			e.preventDefault ();
		}, [40]);
		app.ui.KeyHandler.addSingleCallback ('KeyPlayPause', function ( e ) {
			if (app.ui.InteractionHandler.on) return ;
			e.preventDefault();
			//e.stopPropagation();
		}, 32);

		app.ui.KeyHandler.addSingleCallback ('KeyTilda', function ( e ) {
			var open_el = app.ui.TopHeader.getOpenElement();

			if (open_el)
			{
				app.ui.TopHeader.closeMenu ();
				e.preventDefault();
				return ;
			}

			if (app.ui.InteractionHandler.on) return ;
			e.preventDefault();

			app.ui.TopHeader.openMenu (-1);
		}, 96);

		app.ui.KeyHandler.addSingleCallback ('KeyQ', function ( e ) {
			if (app.ui.InteractionHandler.on) return ;
			e.preventDefault();
			app.fireEvent ('RequestDeselect');
		}, 113);


		app.ui.KeyHandler.addCallback ('kF12', function ( k, i, e ) {
			e.preventDefault();
			e.stopPropagation();
		}, [123]);
		/*app.ui.KeyHandler.addCallback ('kF5', function ( k, i, e ) {
			e.preventDefault();
			e.stopPropagation();
		}, [116]);
		*/

		app.ui.KeyHandler.addCallback ('KeyShiftSpace' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			wavesurfer.playPause();
		}, [16, 32]);
		app.ui.KeyHandler.addCallback ('KeySpace' + app.id, function ( key, map ) {
			if (app.ui.InteractionHandler.on) return ;			
			if (map[16] === 1) return ;

			if (PKAudioEditor.engine.wavesurfer.isPlaying())
			{
				app.fireEvent ('RequestStop');
			}
			else
			{
				app.fireEvent ('RequestPlay');
			}
		}, [32]);
		app.ui.KeyHandler.addCallback ('KeyShiftCopy' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			app.fireEvent( 'RequestActionCopy');
		}, [16, 67]);
		app.ui.KeyHandler.addCallback ('KeyShiftUndo' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			app.fireEvent ('StateRequestUndo');
		}, [16, 90]);
		app.ui.KeyHandler.addCallback ('KeyShiftRedo' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			app.fireEvent ('StateRequestRedo');
		}, [16, 89]);
		app.ui.KeyHandler.addCallback ('KeyShiftPaste' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			app.fireEvent( 'RequestActionPaste');
		}, [16, 86]);
		app.ui.KeyHandler.addCallback ('KeyShiftCut' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			app.fireEvent( 'RequestActionCut', 1);
		}, [16, 88]);
		app.ui.KeyHandler.addCallback ('KeyDel' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;

			app.fireEvent( 'RequestActionCut');
		}, [8]);
		app.ui.KeyHandler.addCallback ('KeyShiftSelectAll' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			app.fireEvent ('RequestSelect');
		}, [16, 65]);
		app.ui.KeyHandler.addSingleCallback ('KeyLoopToggle', function ( e ) {
			if (app.ui.InteractionHandler.on) return ;
			e.preventDefault();
			e.stopPropagation();
			app.fireEvent ('RequestSetLoop');
		}, 108);
		app.ui.KeyHandler.addCallback ('KeyShiftSave' + app.id, function ( key ) {
			if (app.ui.InteractionHandler.on) return ;
			
			// fire event to open the save menu
			document.querySelector('.pk_opt[data-id="dl"]').click();
		}, [16, 83]);

		wavesurfer.container.addEventListener('mousedown', function(e) {
			if (e.which === 3) {
				// wavesurfer.regions.clear();
				e.preventDefault();
			}
		},false);
		
		// select all... ####
		app.listenFor ('RequestSelect', function( ifnot, custom ) {
			if (!q.is_ready) return ;

			if (ifnot)
			{
				var region = wavesurfer.regions.list[0];
				if (region) return (false);
			}

			if (!custom)
			{
				wavesurfer.regions.add({
					start:0.000,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				
				if (!wavesurfer.isPlaying ())
				setTimeout(function () {
					app.fireEvent ('RequestSeekTo', 0.00);
				},0);	
			}
			else
			{
				wavesurfer.regions.add({
					start:custom[0],
					end:custom[1],
					id:'t'
				});
				if (!wavesurfer.isPlaying ())
				setTimeout(function () {
					app.fireEvent ('RequestSeekTo', custom[0]/wavesurfer.getDuration ());
				},0);	
			}
		});
		app.listenFor ('RequestDeselect', function() {
			wavesurfer.regions.clear ();
			app.fireEvent ('RequestSeekTo', 0);
		});
		
		(function() {
			var input = null;
			app.listenFor ('RequestLoadLocalFile', function () {
					wavesurfer.pause();
					
					if (input)
					{
						input.parentNode.removeChild( input );
						input.onchange = null;
					}

					input = d.createElement( 'input' );
					input.setAttribute ('type', 'file');
					input.setAttribute ('accept', 'audio/*');
					input.className = 'pk_inpfile';
					input.onchange = function () {
						q.LoadFile ( input );

						input.parentNode.removeChild( input );
						input.onchange = null;
						input = null;
					};
					app.el.appendChild ( input ); // maybe not append?

					input.click ();
			});
		})();
		
		wavesurfer.container.addEventListener('dblclick', function(e){
			app.fireEvent ('RequestSelect', false, 
				[ wavesurfer.LeftProgress,
				wavesurfer.LeftProgress + wavesurfer.VisibleDuration ]
			);
		}, false);
		wavesurfer.container.addEventListener ('click', function( e ) {
			if (!q.is_ready) return ;
			
			if (!app.ui.KeyHandler.keyMap[16])
				wavesurfer.regions.clear();
		}, false);
		
		var dbncr = null;
		w.addEventListener('resize', function() {
			if (!wavesurfer) return ;

			if (dbncr) {
				clearTimeout (dbncr);
			}

			dbncr = setTimeout(function(){

				//requestAnimationFrame(function (){
					app.fireEvent ('RequestResize');

					if (app.isMobile) {
						window.scrollTo (0, 200);
					}
				//});
			},84);
		}, false);

//		w.addEventListener ('orientationchange', function () {
//  			app.fireEvent ('RequestResize');
//		});

		w.addEventListener('beforeunload', function (e) {
		  app.fireEvent ('WillUnload');

		  // e.preventDefault();
		  // e.returnValue = '';
		});

		wavesurfer.on('error', function (error_msg) {

			// if loading - cancel loading
			setTimeout(function() {
				app.fireEvent ('DidDownloadFile'); // just hides the interface
				q.is_ready = false;
			}, 20);

			app.fireEvent ('ShowError', error_msg);
		});

		wavesurfer.on('audioprocess', function ( time, stamp ) {
			// var time = wavesurfer.getCurrentTime();
			var loudness = wavesurfer.getLoudness();
		
			app.fireEvent ('DidAudioProcess', [time, loudness, stamp], wavesurfer.backend.FreqArr);
		});
		wavesurfer.on('DidZoom', function ( e ) {
			app.fireEvent ('DidZoom', [wavesurfer.ZoomFactor, (wavesurfer.LeftProgress/wavesurfer.getDuration()) * 100, wavesurfer.params.verticalZoom], e);
		});
		 wavesurfer.on('region-removed', function (){
			app.fireEvent('DidSetLoop', 0);
			app.fireEvent('DidDestroyRegion');
		 });
		 app.listenFor ('RequestRegionClear', function () {
			wavesurfer.regions.clear();
		 });
		app.listenFor ('RequestRegionSet', function ( start, end ) {
			if (!q.is_ready) return ;

			if (!start) {
				start =  wavesurfer.LeftProgress / 1;
			}
			if (!end) {
				end = (wavesurfer.LeftProgress + wavesurfer.VisibleDuration) / 1;
			}

			// add a region where the paste happened
			wavesurfer.regions.clear();
			wavesurfer.regions.add({
				start: start,
				end:   end,
				id:'t'
			});
		});

		var copy_buffer = null;

		this.GetCopyBuff = function () {
			return (copy_buffer);
		};

		this.GetSel = function () {
			var region = wavesurfer.regions.list[0];
			if (!region) return (false);

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);
			
			var copybuffer = AudioUtils.Copy (
				start,
				end
			);

			return (copybuffer);
		};

		this.PlayBuff = function ( buff_arr, chans, sample_rate, aud_cont ) {
			var audio_ctx;

			if (aud_cont) audio_ctx = aud_cont;
			else audio_ctx = new (w.AudioContext || w.webkitAudioContext)();

			if (!audio_ctx) return ;

			var bytes = buff_arr[0].byteLength / 4;

			var buffer = audio_ctx.createBuffer (
				chans,
				bytes,
				sample_rate
			);

			for (var i = 0; i < chans; ++i) {
				buffer.getChannelData ( i ).set (
					new Float32Array (buff_arr[ i ])
				);
			}

			var source = audio_ctx.createBufferSource ();
			source.buffer = buffer;

			source.connect ( audio_ctx.destination );
			source.start ( 0 );

			return (source);
		};

		this.GetFX = function ( fx, val ) {
			return AudioUtils.FXBank[fx]( val );
		};

		this.GetWave = function ( buffer, ww, hh, offset, llen, cnv, cx ) {
			var chan_data = buffer.getChannelData ( 0 );
			var sample_rate = buffer.sampleRate;

			var peaks = [];
			var curr_time = 0;
			var width = ww || 200;
			var height = hh || 80;
			var half_height = (height / 2);
			var new_width = width;
			var pixels = 0;
			var raw_pixels = 0;

			var start_offset = offset || 0;
			var end_offset   = llen || ((buffer.duration * sample_rate) >> 0);
			var length       = end_offset - start_offset;
			var mod          = (length / width) >> 0;

			var max   = 0;
			var min   = 0;

			for (var i = 0; i < new_width; ++i) {
				var new_offset = start_offset + (mod * i);

				max = 0;
				min = 0;

				if (new_offset >= 0)
				{
					for (var j = 0; j < mod; j += 3) {
						if ( chan_data[ new_offset + j] > max ) {
							max = chan_data[ new_offset + j];
						}
						else if ( chan_data[ new_offset + j] < min ) {
							min = chan_data[ new_offset + j];
						}
					}
				}

				peaks[2 * i] = max;
				peaks[2 * i + 1 ] = min;
			}

			var canvas = cnv;
			var ctx = cx;

			if (!canvas) {
				canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;

				ctx = canvas.getContext ('2d', {alpha:false,antialias:false});
			}

			ctx.fillStyle = "#000";
			ctx.fillRect ( 0, 0, width, height );
			ctx.fillStyle = '#99c2c6';
			
			ctx.beginPath ();
	        ctx.moveTo ( 0, half_height );

			for (var i = 0; i < width; ++i) {
				var peak = peaks[i * 2];
				var _h = Math.round (peak * half_height);
				ctx.lineTo ( i, half_height - _h);
			}

			for (var i = width - 1; i >= 0; --i) {
				var peak = peaks[ (i * 2) + 1];
				var _h = Math.round (peak * half_height);
				ctx.lineTo ( i, half_height - _h);
			}

			ctx.closePath();
			ctx.fill();

			return (canvas.toDataURL('image/jpeg', 0.56));
			// ---
		};

		app.listenFor ('RequestActionCut', function ( use_clipboard ) {
			if (!q.is_ready) return ;
			
			var region = wavesurfer.regions.list[0];
			if (!region) return (false);

			app.fireEvent ('RequestPause');

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ( (region.end - region.start), 3)

			app.fireEvent ('StateRequestPush', {
				desc : use_clipboard ? 'Cut' : 'Delete',
				meta : [ start, end ],
				data : wavesurfer.backend.buffer
			});

			var cutbuffer = AudioUtils.Trim (
				start,
				end
			);
			wavesurfer.regions.clear();

			var tmp = (start - 0.03);
			if (tmp < 0) tmp = 0;

			app.fireEvent ('RequestSeekTo', tmp / wavesurfer.getDuration ());
			
			if (use_clipboard) {
				copy_buffer = cutbuffer;

				app.fireEvent ('DidSetClipboard', 1);
				app.fireEvent ('DidCut', cutbuffer);

				OneUp ('Cut :: ' + q.TrimTo (start, 2) + ' to ' + q.TrimTo (start/1 + end/1, 2), 1100);
			}
			else {
				OneUp ('Delete :: ' + q.TrimTo (start, 2) + ' to ' + q.TrimTo (start/1 + end/1, 2), 1100);
			}

			/*
			var image = app.engine.GetWave (copy_buffer);
			var eel = document.getElementsByClassName('pk_tb')[0];
			var imm = new Image();
			imm.src = image;
			eel.appendChild( imm );
			*/
		});
		
		app.listenFor ('RequestActionCopy', function () {
			if (!q.is_ready) return ;
			
			var region = wavesurfer.regions.list[0];
			if (!region) return (false);

			app.fireEvent('RequestPause');

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);
			
			var copybuffer = AudioUtils.Copy (
				start,
				end
			);

			copy_buffer = copybuffer;
			app.fireEvent ('DidSetClipboard', 1);
			app.fireEvent ('DidCopy', copybuffer);

			OneUp ('Copied range');
		});
		
		app.listenFor ('RequestActionSilence', function ( offset, silence_duration ) {
			if (!q.is_ready) return ;

			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];
			
			if (!silence_duration || silence_duration < 0) silence_duration = 1;

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Silence',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}

			var start = offset;
			var end = silence_duration;

			handleStateInline ( start, end );
			dims = AudioUtils.Insert (
				offset, 
				AudioUtils.MakeSilence ( silence_duration )
			);

			// add a region where the paste happened
			wavesurfer.regions.clear();
			wavesurfer.regions.add({
				start:dims[0],
				end:dims[1],
				id:'t'
			});

			app.fireEvent ('RequestSeekTo', (dims[0]/wavesurfer.getDuration()));
			
			OneUp ('Inserted Silence');
		});

		app.listenFor ('RequestActionPaste', function () {
			if (!q.is_ready) return ;
			if (!copy_buffer) return (false);

			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Paste',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				var offset = q.TrimTo (wavesurfer.getCurrentTime(), 3);
				
				handleStateInline ( offset );
				dims = AudioUtils.Insert ( offset, copy_buffer );
			}
			else {
				var start = q.TrimTo (region.start, 3);
				var end = q.TrimTo ((region.end - region.start), 3);

				handleStateInline ( start, end );

				dims = AudioUtils.Replace (
					start,
					end,
					copy_buffer
				);
			}

			// add a region where the paste happened
			wavesurfer.regions.clear();
			wavesurfer.regions.add({
				start:dims[0],
				end:dims[1],
				id:'t'
			});

			var new_seek = 0;
			if (wavesurfer.getDuration () > 0.0001) {
				new_seek = dims[0]/wavesurfer.getDuration ();
			}
			app.fireEvent ('RequestSeekTo', new_seek);

			OneUp ('Paste to ' + dims[0].toFixed(2), 982);
		});

		var _sk = false;
		app.listenFor ('RequestActionRecordToggle', function () {
			if (!q.is_ready) {
				// if not ready then bring up the new recording toggle!
				app.fireEvent('RequestActionNewRec');

				return ;
			}
			
			if (app.rec.isActive ()) {
				app.fireEvent('RequestActionRecordStop');
			} else {
				// skipping the sounds of keyboard
				if (_sk) return ;

				_sk = true;
				setTimeout(function () {
					app.fireEvent('RequestActionRecordStart');
					setTimeout(function() {
						_sk = false;
					}, 50);
				},26);
			}
		});

		app.listenFor ('RequestActionRecordStop', function () {
			if (!q.is_ready) return ;
			if (!app.rec.isActive ()) return (false);

			app.rec.stop ();
		});

		app.listenFor ('RequestActionRecordStart', function () {
			if (!q.is_ready) return ;

			app.fireEvent ('RequestPause');

			if (app.rec.isActive ()) return (false);

			var pos = wavesurfer.getCurrentTime () * wavesurfer.backend.buffer.sampleRate;
			app.rec.start ( pos, function ( offset, buffers ) {

				// app.fireEvent ('RequestPause');
				function handleStateInline ( start, end ) {
					app.fireEvent ('StateRequestPush', {
						desc : 'Record Audio',
						meta : [ start, end ],
						data : wavesurfer.backend.buffer
					});
				}

				// fire did record event!
				app.fireEvent ('DidActionRecordStop', !!buffers);
				if (!buffers)
				{
					return ;
				}

				handleStateInline ( offset );
				var dims = AudioUtils.ReplaceFloatArrays ( offset, buffers );

				// add a region where the paste happened
				wavesurfer.regions.clear();
				wavesurfer.regions.add({
					start:dims[0],
					end:dims[1],
					id:'t'
				});

				app.fireEvent ('RequestSeekTo', (dims[0]/wavesurfer.getDuration()));
				OneUp ('Recorded Audio ' + dims[0].toFixed(2), 982);
			}, function () {
				// on start
				app.fireEvent ('DidActionRecordStart');
			});

			// --- ending offset is song full duration...
			// if we have a selected area - mark that one as the end
			var region = wavesurfer.regions.list[0];
			if (region)
				app.rec.setEndingOffset ( region.end * wavesurfer.backend.buffer.sampleRate );
			else
				app.rec.setEndingOffset ( wavesurfer.getDuration () * wavesurfer.backend.buffer.sampleRate );
		});
		
		app.listenFor ('RequestActionFX_PREVIEW_HardLimit', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.HardLimit ( val ) );
			app.fireEvent ('DidStartPreview');
		});
		app.listenFor ('RequestActionFX_HardLimit', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Hard Limit (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.HardLimit ( val ) );
			
			OneUp ('Applied Hard Limit (fx)');
		});
		
		app.listenFor ('RequestActionFX_PARAMEQ', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Parametric EQ (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.ParametricEQ ( val ) );
			
			OneUp ('Applied Parametric EQ (fx)');
		});
		app.listenFor ('RequestActionFX_PREVIEW_PARAMEQ', function ( val ) {
			if (!q.is_ready || !val) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.ParametricEQ ( val ) );
			app.fireEvent ('DidStartPreview');
		});

		app.listenFor ('RequestActionFX_PREVIEW_DISTORT', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Distortion ( val ) );
			app.fireEvent ('DidStartPreview');
		});
		app.listenFor ('RequestActionFX_DISTORT', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Distortion (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Distortion ( val ) );
			
			OneUp ('Applied Distortion (fx)');
		});

		app.listenFor ('RequestActionFX_PREVIEW_DELAY', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Delay ( val ) );
			app.fireEvent ('DidStartPreview');
		});
		app.listenFor ('RequestActionFX_DELAY', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Delay (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Delay ( val ) );
			
			OneUp ('Applied Delay (fx)');
		});

		app.listenFor ('RequestActionFX_PREVIEW_REVERB', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Reverb ( val ) );
			app.fireEvent ('DidStartPreview');
		});
		app.listenFor ('RequestActionFX_REVERB', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Reverb (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Reverb ( val ) );
			
			OneUp ('Applied Reverb (fx)');
		});

		app.listenFor ('RequestActionFX_PREVIEW_COMPRESSOR', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Compressor ( val ) );
			app.fireEvent ('DidStartPreview');
		});

		app.listenFor ('RequestActionFX_Compressor', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Compressor (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Compressor ( val ) );
			
			OneUp ('Applied Compressor (fx)');
		});
		app.listenFor ('RequestActionFX_Normalize', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Normalize ',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3)
			var end = q.TrimTo ((region.end - region.start), 3)

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Normalize ( val ) );
			
			OneUp ('Applied Normalize');
		});

		app.listenFor ('RequestActionFX_Invert', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Invert ',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3)
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Invert() );
			
			OneUp ('Applied Invert');
		});

		app.listenFor ('RequestActionFX_RemSil', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Remove Silence ',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3)
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );

						var originalBuffer = wavesurfer.backend.buffer;
						var sil_arr = [];
						var sil_offset = 210;
						var vol_offset = 56;
						var count = 0;
						var inv_count = 0;
						var start = 0;
						var end   = 0;
						var found = false;
						var jump = 500;

						for (var i = 0; i < 1; ++i)
						{
							var channel = originalBuffer.getChannelData (i);

							for (var j = 0; j < channel.length; ++j)
							{
								if (Math.abs (channel[j]) < 0.000368)
								{
									if (count === 0) {

										if (j > jump)
											start = j - jump;
										else
											start = j;
									}
									if (++count > sil_offset)
									{
										inv_count = 0;
										end = j;
										found = true;
									}
								}
								else
								{
									if (found)
									{
										if (++inv_count > vol_offset)
										{
											sil_arr.push([start, end]);
											j += jump;

											count = 0;
											start = 0;
											end =   0;
											found = false;
											inv_count = 0;
										}
										else
										{
											end = j;
										}
									}
									else
									{
										count = 0;
										start = 0;
										end =   0;
										found = false;
										inv_count = 0;
									}
								}
							}

							if (found) {
								sil_arr.push([start, end]);
							}
						}

						if (sil_arr.length > 0)
						{
								var reduce = 0;
								for (var i = 0; i < sil_arr.length; ++i)
								{
									reduce += (sil_arr[i][1] - sil_arr[i][0]);
								}

								var emptySegment   = wavesurfer.backend.ac.createBuffer (
									originalBuffer.numberOfChannels,
									originalBuffer.length - reduce,
									originalBuffer.sampleRate
								);

								for (var i = 0; i < originalBuffer.numberOfChannels; ++i)
								{
									var channel = originalBuffer.getChannelData ( i );
									var new_channel = emptySegment.getChannelData ( i );

									var sil_offset = 0;
									var o = 0;
									var sil_curr = sil_arr[o];
									var sil_curr_start = sil_curr[0];
									var sil_curr_end   = sil_curr[1];
									var h = 0;
									var use_old = false;
									var old_h = 0;

									for (var j = 0; j < new_channel.length; ++j)
									{
										h = j + sil_offset;
										if (h > sil_curr_start && h < sil_curr_end)
										{
											if (h < sil_curr_start + jump)
											{
												var perc = (jump - (h - sil_curr_start)) / jump;
												new_channel[ j ] = (channel[ h ] * perc) ; // / (h - sil_curr_start));
												new_channel[ j ] += (1 - perc) * channel[ j + (sil_offset + (sil_curr_end - sil_curr_start)) ];

												continue;
											}
											else
											{
												sil_offset = sil_offset + (sil_curr_end - sil_curr_start);
												sil_curr = sil_arr[++o];
												if (sil_curr)
												{
													sil_curr_start = sil_curr[0];
													sil_curr_end   = sil_curr[1];
												}
												h = j + sil_offset;
											}
										}

										new_channel[ j ] = channel[ h ];
									}
								}

								AudioUtils.FullReplace (
									emptySegment
								);
						}

			setTimeout (function() {
				wavesurfer.drawBuffer();
			},40);

			OneUp ('Applied :: Remove Silence');
		});


		var _compute_channels = function () {
			var buff = wavesurfer.backend.buffer;
			var chans = buff.numberOfChannels;

			if (chans === 1) {
				wavesurfer.ActiveChannels = [1];
				app.el.classList.add ('pk_mono');
			}
			else {
				wavesurfer.ActiveChannels = [1, 1];
				app.el.classList.remove ('pk_mono');
			}

			wavesurfer.drawer.params.ActiveChannels = wavesurfer.ActiveChannels;
			wavesurfer.SelectedChannelsLen = chans;
		};

		app.listenFor ('RequestActionFX_Flip', function ( val, val2 ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var start = 0;
			var end   = wavesurfer.getDuration();

			function handleStateInline ( start, end, title, cb ) {
				app.fireEvent ('StateRequestPush', {
					desc : title,
					meta : [ start, end ],
					data : wavesurfer.backend.buffer,
					cb   : cb
				});
			}

			if (val === 'flip')
			{
				handleStateInline ( start, end, 'Flip Channels' );
				AudioUtils.FX ( start, end, AudioUtils.FXBank.Flip ( val ) );
			}
			else if (val === 'stereo')
			{
				handleStateInline ( start, end, 'Make Stereo', function(){_compute_channels ()});

				var originalBuffer = wavesurfer.backend.buffer;
				var emptySegment   = wavesurfer.backend.ac.createBuffer (
					2,
					originalBuffer.length,
					originalBuffer.sampleRate
				);
				emptySegment.getChannelData ( 0 ).set (
					originalBuffer.getChannelData ( 0 )
				);
				emptySegment.getChannelData ( 1 ).set (
					originalBuffer.getChannelData ( 0 )
				);

				AudioUtils.FullReplace (
					emptySegment
				);

				wavesurfer.regions.clear();
				wavesurfer.regions.add({
					start:start,
					end:end,
					id:'t'
				});

				_compute_channels ();

				app.fireEvent ('RequestSeekTo', 0.00);
			}
			else if (val === 'mono')
			{
				handleStateInline ( start, end, 'Make Mono', function(){_compute_channels()} );

				var originalBuffer = wavesurfer.backend.buffer;
				var emptySegment   = wavesurfer.backend.ac.createBuffer (
					1,
					originalBuffer.length,
					originalBuffer.sampleRate
				);
				emptySegment.getChannelData ( 0 ).set (
					originalBuffer.getChannelData ( val2 )
				);
				AudioUtils.FullReplace (
					emptySegment
				);

				wavesurfer.regions.clear();
				wavesurfer.regions.add({
					start:start,
					end:end,
					id:'t'
				});

				_compute_channels ();

				app.fireEvent ('RequestSeekTo', 0.00);
			}

			OneUp ('Applied Channel Change: ' + val);
		});

		app.listenFor ('RequestActionFX_Reverse', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Reverse ',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3)
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Reverse() );
			
			OneUp ('Applied Reverse');
		});

		var noisernn_load = !1;
        app.listenFor("RequestActionFX_NoiseRNN", function (a) {
        	var h = wavesurfer;
            if (q.is_ready) { // n -> q
                app.fireEvent("RequestPause");
                var b = function () {
                    var f = h.regions.list[0];
                    f || (h.regions.add({ start: 0, end: h.getDuration() - 0, id: "t" }), (f = h.regions.list[0]));
                    var m = q.TrimTo(f.start, 3),
                        k = q.TrimTo(f.end - f.start, 3);
                    f = f.end - f.start;
                    f = q.TrimTo(f, 3);
                    app.fireEvent("StateRequestPush", { desc: "Apply Noise RNN (fx)", meta: [m, k], data: h.backend.buffer });
                    for (var u = AudioUtils.Copy(m, k), w = 0; w < u.numberOfChannels; w++) {
                        var x = u.getChannelData(w),
                            z = wasm_denoise_stream_perf(x);
                        x.set(z);
                    }
                    AudioUtils.Replace(m, k, u);
                    app.fireEvent("RequestSeekTo", m / h.getDuration());
                    wavesurfer.regions.clear();
                    h.regions.add({ start: m, end: m + f, id: "t" });
                    OneUp("Applied Noise RNN (fx)");
                };
                noisernn_load
                    ? b()
                    : ((a = document.createElement("script")),
                      (a.src = "rnn_denoise.js"),
                      (a.onload = function () {
                          noisernn_load = !0;
                          var f = function () {
                              window.Module && window.Module.asm && window.Module.asm.malloc
                                  ? b()
                                  : setTimeout(function () {
                                        f();
                                    }, 350);
                          };
                          setTimeout(function () {
                              f();
                          }, 100);
                      }),
                      (a.onerror = function () {
                          alert("Could not download noise Reduction script");
                      }),
                      document.head.appendChild(a));
            }
        });

		app.listenFor ('RequestActionFX_FadeIn', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Fade In (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.FadeIn() );
			
			OneUp ('Applied Fade In (fx)');
		});
		app.listenFor ('RequestActionFX_FadeOut', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Fade Out (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}
			
			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.FadeOut() );
			
			OneUp ('Applied Fade Out (fx)');
		});
		
		
		var fx_preview_debounce = null;
		app.listenFor ('RequestActionFX_UPDATE_PREVIEW', function ( val ) {
			if (!AudioUtils.previewing) return ;
			
			clearTimeout (fx_preview_debounce);
			fx_preview_debounce = setTimeout(function () {
				AudioUtils.FXPreviewUpdate ( val );
			}, 44);
		});
		app.listenFor ('RequestActionFX_TOGGLE', function ( val ) {

			if (val)
			{
				AudioUtils.FXPreviewInit (true);
				return ;
			}

			app.fireEvent ('DidTogglePreview', AudioUtils.FXPreviewToggle ());
		});
		app.listenFor ('RequestActionFX_PREVIEW_STOP', function () {
			AudioUtils.FXPreviewStop ();
			app.fireEvent ('DidStopPreview');
		});
		app.listenFor ('RequestActionFX_PREVIEW_GAIN', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Gain( val ) );
			
			app.fireEvent ('DidStartPreview');
		});

		app.listenFor ('RequestActionFX_GAIN', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Gain (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			handleStateInline ( start, end );
			AudioUtils.FX( start, end, AudioUtils.FXBank.Gain( val ) );

			OneUp ('Applied Gain (fx)');
		});

		app.listenFor ('RequestActionFX_PREVIEW_SPEED', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Speed( val ) );
			
			app.fireEvent ('DidStartPreview');
		});

		app.listenFor ('RequestActionFX_RATE', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Rate (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}
			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);
			var duration = (region.end - region.start) / val;
			duration = q.TrimTo (duration, 3);

			handleStateInline ( start, end );

			var fx_buffer = AudioUtils.Copy ( start, end );
			var originalBuffer = wavesurfer.backend.buffer;
			var new_offset = ((start/1)   * originalBuffer.sampleRate) >> 0;
			var new_len    = ((duration/1) * originalBuffer.sampleRate) >> 0;
			var old_len    = ((end/1) * originalBuffer.sampleRate) >> 0;
			var stretch_ratio = new_len / old_len;

			var getOfflineAudioContext = function (channels, sampleRate, duration) {
					return new (window.OfflineAudioContext ||
					window.webkitOfflineAudioContext)(channels, duration, sampleRate);
			};
			var audio_ctx = getOfflineAudioContext ( // offlineCtx
					wavesurfer.SelectedChannelsLen, // orig_buffer.numberOfChannels,
					fx_buffer.sampleRate,
					new_len
			);

			/*
			var TimeStretcher = function(o){o=o||{};this.ws=o.windowSize||1024;this.or=o.overlapRatio||0.5;this.sw=o.seekWindowMs||30;}
			TimeStretcher.prototype.stretch=function(buf,ts){
			  if(ts<=0) throw new Error("Stretch ratio must be positive");
			  var ch=buf.numberOfChannels, sr=buf.sampleRate, il=buf.length, ol=Math.floor(il*ts),
			      out=new AudioBuffer({numberOfChannels:ch,length:ol,sampleRate:sr});
			  for(var c=0;c<ch;c++){
			    var inD=buf.getChannelData(c), outD=out.getChannelData(c), ws=this.ws,
			        ov=Math.floor(ws*this.or), hs=ws-ov, sw=Math.floor(this.sw*sr/1000),
			        win=this._hannWindow(ws), iIdx=0, oIdx=0;
			    while(oIdx<ol-ws){
			      var nIdx=Math.min(Math.floor(oIdx/ts),il-ws-sw);
			      if(iIdx>0 && Math.abs(nIdx-iIdx)>hs){
			        var ssi=Math.max(0,nIdx-sw), sei=Math.min(il-ws,nIdx+sw);
			        iIdx=this._findBestMatch(inD,iIdx+hs,ssi,sei,ws);
			      } else { iIdx=nIdx; }
			      for(var i=0;i<ws;i++){
			        if(iIdx+i<il && oIdx+i<ol)
			          outD[oIdx+i]+= inD[iIdx+i]*win[i];
			      }
			      oIdx+=hs;
			    }
			    this._normalizeOutput(outD);
			  }
			  return out;
			};
			TimeStretcher.prototype._hannWindow=function(l){var w=new Float32Array(l);for(var i=0;i<l;i++)w[i]=0.5*(1-Math.cos(2*Math.PI*i/(l-1)));return w;};
			TimeStretcher.prototype._findBestMatch=function(d,ref,s,e,ws){
			  var bp=s,be=Number.MAX_VALUE, refArr=new Float32Array(ws);
			  for(var i=0;i<ws;i++) if(ref+i<d.length) refArr[i]=d[ref+i];
			  for(var pos=s;pos<=e;pos++){
			    var err=0;
			    for(var i=0;i<ws;i+=4) {
			      if(pos+i<d.length){var diff=refArr[i]-d[pos+i];err+=diff*diff;}
			    }
			    if(err<be){be=err;bp=pos;}
			  }
			  return bp;
			};
			TimeStretcher.prototype._normalizeOutput=function(d){
			  var m=0; for(var i=0;i<d.length;i++) m=Math.max(m,Math.abs(d[i]));
			  if(m>1){var g=0.95/m; for(var i=0;i<d.length;i++) d[i]*=g;}
			};*/
			var stretchAudio = function (input_buffer, sampleRate, stretchRatio) {
			  // Parameters (in seconds)
			  let channels_len = input_buffer.numberOfChannels;
			  let samples = [ input_buffer.getChannelData(0) ];
			  for (let i = 1; i < channels_len; ++i) {
			  	samples.push ( input_buffer.getChannelData(i) );
			  }

			  let grainDurationSec = 0.05; // 50 ms
			  const analysisHopSec = 0.025; // 25 ms (50% overlap)
			  const desiredOverlap = 0.5;
			  const synthesisHopSec = analysisHopSec * stretchRatio; // output hop

			  // Adjust grain duration for ratios > 1
			  if (stretchRatio > 1) {
			    grainDurationSec = synthesisHopSec / (1 - desiredOverlap);
			  }

			  // Convert durations to samples
			  const grainSize = Math.floor(grainDurationSec * sampleRate);
			  const analysisHop = Math.floor(analysisHopSec * sampleRate);
			  const synthesisHop = Math.floor(synthesisHopSec * sampleRate);

			  // Precompute Hann window
			  const window = new Float32Array(grainSize);
			  for (let i = 0; i < grainSize; i++) {
			    // Using (grainSize - 1) so that the window spans [0, grainDurationSec]
			    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (grainSize - 1)));
			  }

			  // Estimate number of grains and output length
			  const numGrains = Math.floor((samples[0].length - grainSize) / analysisHop);
			  const outputLength = synthesisHop * numGrains + grainSize;
			  let output = [ new Float32Array(outputLength) ];
			  for (let i = 1; i < channels_len; ++i) {
			  	output.push ( new Float32Array(outputLength) );
			  }

			  // Process each grain: copy, window, and add to output
			  let inputIndex = 0;
			  let outputIndex = 0;
			  for (let n = 0; n < numGrains; ++n) {
			    // For each sample in the grain, multiply by the window and add to the output
			    for (let i = 0; i < grainSize; ++i) {
			    	for (let j = 0; j < channels_len; ++j) {
			      		output[j][outputIndex + i] += samples[j][inputIndex + i] * window[i];
			      	}
			    }
			    inputIndex += analysisHop;
			    outputIndex += synthesisHop;
			  }

			  	/*
				let normalization = new Float32Array(outputLength);
				inputIndex = 0;
				outputIndex = 0;
				for (let n = 0; n < numGrains; ++n) {
				  for (let i = 0; i < grainSize; ++i) {
				    normalization[outputIndex + i] += window[i];
				  }
				  inputIndex += analysisHop;
				  outputIndex += synthesisHop;
				}

				// Normalize each channel's output:
				for (let j = 0; j < channels_len; ++j) {
				  for (let i = 0; i < outputLength; ++i) {
				    if (normalization[i] > 0) {
				      output[j][i] /= normalization[i];
				    }
				  }
				}
				*/
			  
			  return output;
			};

			/// -----
			var filter = [];
			//if (stretch_ratio < 1) {
			//	var fx = AudioUtils.FXBank.Rate( stretch_ratio );
			//	var source = {buffer:null, disconnect:function(){}};
			//	source.buffer = fx_buffer;
			//	filter = fx.filter ( audio_ctx, audio_ctx.destination, source, duration );
			//}
			//else
			//{
				// use timestretcher here...
				// var ts = new TimeStretcher({windowSize:2048,overlapRatio:0.75,seekWindowMs:20}).stretch(fx_buffer,stretch_ratio);
				const stretchedSamples = stretchAudio(fx_buffer, fx_buffer.sampleRate, stretch_ratio);

				// Optionally, if you need an AudioBuffer from the stretchedSamples:
				// const offlineCtx = new OfflineAudioContext(stretchedSamples.length, stretchedSamples[0].length, fx_buffer.sampleRate);
				const newBuffer = audio_ctx.createBuffer(stretchedSamples.length, stretchedSamples[0].length, fx_buffer.sampleRate);
				
				for (let i = 0; i < stretchedSamples.length; ++i) {
					newBuffer.copyToChannel(stretchedSamples[i], i);
				}

				var source = audio_ctx.createBufferSource ();
				source.buffer = newBuffer;
				source.connect ( audio_ctx.destination );
				source.start ();
			//}

			q.in_fx = true;
			app.ui.InteractionHandler.on = true;
			// OneUp ('Please wait, applying FX', 2600);

			var offline_callback = function( rendered_buffer ) {
				AudioUtils.Replace (start, end, rendered_buffer);

				wavesurfer.regions.clear();
				wavesurfer.regions.add({
					start:start,
					end: start + duration,
					id:'t'
				});

				app.fireEvent ('RequestSeekTo', (start/wavesurfer.getDuration()));

				OneUp ('Applied Rate (fx)');

				if (filter.length > 0) {
					for (var i = 0; i < filter.length; ++i) filter[i].disconnect ();
				} else filter && filter.disconnect && filter.disconnect ();

				rendered_buffer = fx_buffer = filter = null;
				source.disconnect ();

				q.in_fx = false;
				app.ui.InteractionHandler.on = false;
			};

			var offline_renderer = audio_ctx.startRendering(); 
			if (offline_renderer)
				offline_renderer.then( offline_callback ).catch(function(err) {
					console.log('Rendering failed: ' + err);
				});
			else
				audio_ctx.oncomplete = function ( e ) {
					offline_callback ( e.renderedBuffer );
				};
		});

		app.listenFor ('RequestActionFX_PREVIEW_RATE', function ( val ) {
			if (!q.is_ready) return ;
			if (AudioUtils.previewing) {
				AudioUtils.FXPreviewStop ();
				app.fireEvent ('DidStopPreview');
				return ;
			}

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}

			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);
			var duration = (region.end - region.start) / val;

			var originalBuffer = wavesurfer.backend.buffer;
			var new_offset = ((start/1)   * originalBuffer.sampleRate) >> 0;
			var new_len    = ((duration/1) * originalBuffer.sampleRate) >> 0;
			var old_len    = ((end/1) * originalBuffer.sampleRate) >> 0;

			// -----
			var stretch_ratio = new_len / old_len;

			AudioUtils.FXPreview( start, end, AudioUtils.FXBank.Rate( stretch_ratio ) );

			app.fireEvent ('DidStartPreview');
		});

		app.listenFor ('RequestActionFX_SPEED', function ( val ) {
			if (!q.is_ready) return ;
			
			app.fireEvent('RequestPause');

			var region = wavesurfer.regions.list[0];
			var dims = [ 0, 0 ];

			function handleStateInline ( start, end ) {
				app.fireEvent ('StateRequestPush', {
					desc : 'Apply Speed (fx)',
					meta : [ start, end ],
					data : wavesurfer.backend.buffer
				});
			}

			if (!region) {
				wavesurfer.regions.add({
					start:0.00,
					end:wavesurfer.getDuration() - 0.00,
					id:'t'
				});
				region = wavesurfer.regions.list[0];
			}

			
			var start = q.TrimTo (region.start, 3);
			var end = q.TrimTo ((region.end - region.start), 3);
			var duration = (region.end - region.start) / val;
			duration = q.TrimTo (duration, 3);

			handleStateInline ( start, end );

			var fx_buffer = AudioUtils.Copy ( start, end );
			var originalBuffer = wavesurfer.backend.buffer;
			var new_offset = ((start/1)   * originalBuffer.sampleRate) >> 0;
			var new_len    = ((duration/1) * originalBuffer.sampleRate) >> 0;
			var old_len    = ((end/1) * originalBuffer.sampleRate) >> 0;

			/*
			var emptySegment = wavesurfer.backend.ac.createBuffer (
				wavesurfer.SelectedChannelsLen,
				new_len,
				originalBuffer.sampleRate
			);*/

			q.in_fx = true;
			app.ui.InteractionHandler.on = true;
			var fx = AudioUtils.FXBank.Speed( val );

			var getOfflineAudioContext = function (channels, sampleRate, duration) {
					return new (window.OfflineAudioContext ||
					window.webkitOfflineAudioContext)(channels, duration, sampleRate);
			};
			var audio_ctx = getOfflineAudioContext (
					wavesurfer.SelectedChannelsLen, // orig_buffer.numberOfChannels,
					originalBuffer.sampleRate,
					new_len
			);

			var source = audio_ctx.createBufferSource ();
			source.buffer = fx_buffer;

			var filter = fx.filter ( audio_ctx, audio_ctx.destination, source, duration );

			source.start ();

			var offline_callback = function( rendered_buffer ) {

				AudioUtils.Replace (start, end, rendered_buffer);

				wavesurfer.regions.clear();
				wavesurfer.regions.add({
					start:start,
					end: start + duration,
					id:'t'
				});

				app.fireEvent ('RequestSeekTo', (start/wavesurfer.getDuration()));

				OneUp ('Applied Speed (fx)');

				if (filter.length > 0) {
					for (var i = 0; i < filter.length; ++i) filter[i].disconnect ();
				} else filter && filter.disconnect && filter.disconnect ();

				// is this needed?
				rendered_buffer = fx_buffer = filter = null;
				source.disconnect ();
				// audio_ctx.close ();
				// -
				q.in_fx = false;
				app.ui.InteractionHandler.on = false;
			};

			var offline_renderer = audio_ctx.startRendering(); 
			if (offline_renderer)
				offline_renderer.then( offline_callback ).catch(function(err) {
					console.log('Rendering failed: ' + err);
				});
			else
				audio_ctx.oncomplete = function ( e ) {
					offline_callback ( e.renderedBuffer );
				};
		});
		
		app.listenFor ('StateDidPop', function ( state, undo ) {
			if (!q.is_ready) return ;
			app.fireEvent ('RequestPause');

			wavesurfer.regions.clear();
			wavesurfer.loadDecodedBuffer (state.data);

			if (state.cb) state.cb ();

			var new_durr = wavesurfer.getDuration ();
			app.fireEvent ('DidUpdateLen', new_durr);

			if (state.meta && state.meta.length > 0)
			{
				if (state.meta[1])
				{
					wavesurfer.regions.add({
						start:state.meta[0]/1,
						end:state.meta[0]/1 + state.meta[1]/1,
						id:'t'
					});
				}
				else
				{
					if (!new_durr) new_durr = 0.0001;
					app.fireEvent ('RequestSeekTo', (state.meta[0]/new_durr));
				}
			}
			
			if (undo) OneUp ('Undo ' + state.desc);
			else OneUp ('Redo ' + state.desc);
		});


		// --- 
		app.listenFor ('RequestChanToggle', function ( chan_index, force_val ) {
			if (!q.is_ready) return (false);

			if (wavesurfer.ActiveChannels.length <= chan_index) return (false);

			var oldval = wavesurfer.ActiveChannels[ chan_index ];
			var val = -1;

			if (force_val) val = force_val;
			else {
				if (oldval === 1) val = 0;
				else val = 1;
			}

			if (oldval !== val)
			{
				wavesurfer.ActiveChannels[ chan_index ] = val;
				if (val === 0) {
					--wavesurfer.SelectedChannelsLen;
					// silece the channel itself

					if (chan_index === 0) {
						wavesurfer.backend.gainNode2.gain.value = 0.0;
					} else {
						wavesurfer.backend.gainNode1.gain.value = 0.0;
					}
				}
				else {
					++wavesurfer.SelectedChannelsLen;

					if (chan_index === 0) {
						wavesurfer.backend.gainNode2.gain.value = 1.0;
					} else {
						wavesurfer.backend.gainNode1.gain.value = 1.0;
					}
				}

				wavesurfer.ForceDraw ();
				app.fireEvent ('DidChanToggle', chan_index, val);
			}
		});

		// ----
		wavesurfer.on( 'region-updated', function () {
			if (wavesurfer.regions.list[0])
			{
				app.fireEvent ('DidCreateRegion', wavesurfer.regions.list[0]);
			}
		});
		wavesurfer.on( 'region-update-end', function () {
			app.fireEvent ('DidCreateRegion', wavesurfer.regions.list[0]);

			var start = wavesurfer.regions.list[0].start;
			if (!wavesurfer.isPlaying ())
				app.fireEvent ('RequestSeekTo', (start/wavesurfer.getDuration() ));
		});
		wavesurfer.on( 'cursorcenter', function ( e ) {
			app.fireEvent ('DidCursorCenter', e, wavesurfer.ZoomFactor);
		});
		
		var wave = wavesurfer.drawer.canvases[0].wave.parentNode;

		var drag_x = 0;
		var drag_move = function ( e ) {
			
			var diff = drag_x - e.clientX;
			
			// find diff percentage from full width...
			
			// drag the waveform now
			app.fireEvent ('RequestPan', diff );
			
			drag_x = e.clientX;
		};
		
		app.listenFor ('RequestZoom', function ( diff, mode ) {
			var wv = wavesurfer;

			// compute new ZoomFactor...
			diff *= wv.ZoomFactor;

			// compute availabel left ZoomFactor
			if (mode === -1)
			{
				var width = wv.drawer.width;
				var available_pixels = width - width/wv.ZoomFactor;
				var target = wv.ZoomFactor - 1;
				if (target <= 0) return ;

				 var old_zoomfactor = wv.ZoomFactor;
				 wv.ZoomFactor += (diff*target)/available_pixels;
				 if (wv.ZoomFactor < 1) wv.ZoomFactor = 1;
				 
				 var new_vis_dur = wv.getDuration() / wv.ZoomFactor;

				 if (new_vis_dur <= 0.5)
				 {
				 	wv.ZoomFactor = old_zoomfactor;
				 	return ;
				 }

				 wv.VisibleDuration = new_vis_dur;
				 
				var time_moved = wv.VisibleDuration * (diff / wv.drawer.width);
				wv.LeftProgress += time_moved;
				
				if (wv.LeftProgress + wv.VisibleDuration >= wv.getDuration ())
				{
					wv.LeftProgress = wv.getDuration () - wv.VisibleDuration;
				}
				else if (wv.LeftProgress < 0) {
					wv.LeftProgress = 0;
				}
			}
			else if (mode === 1)
			{
				var width = wv.drawer.width;
				var available_pixels = width - width/wv.ZoomFactor;
				var target = wv.ZoomFactor - 1;
				if (target <= 0) return ;

				var old_factor = wv.ZoomFactor; 
				wv.ZoomFactor -= (diff*target)/available_pixels;
				if (wv.ZoomFactor < 1) wv.ZoomFactor = 1;
				var temp = wv.getDuration() / wv.ZoomFactor;
				if (temp + wv.LeftProgress > wv.getDuration()) {
					wv.ZoomFactor = old_factor;
				}
				else
				{
					if (temp <= 0.5)
					{
						wv.ZoomFactor = old_factor;
						return ;
					}

					wv.VisibleDuration = temp;
				}
				// -
			}
			
			// wv.ZoomFactor -= Math.abs (diff / (wv.drawer.width / 2));
			// console.log( diff + " BLAH " + wv.ZoomFactor + '   ' +  (diff / wv.drawer.width) );
			wv.ForceDraw ();
			app.fireEvent ('DidZoom', [wavesurfer.ZoomFactor, (wavesurfer.LeftProgress/wavesurfer.getDuration()) * 100, wavesurfer.params.verticalZoom]);
		});
		
		app.listenFor ('RequestPan', function( diff, mode ) {
			var wv = wavesurfer;
			
			if (mode === 1) diff *= wv.ZoomFactor;
			else if (mode === 2) {
				var time_moved = wv.getDuration() * (diff / wv.drawer.width);
				wv.LeftProgress = time_moved;

				wv.ForceDraw ();
				app.fireEvent ('DidZoom', [wavesurfer.ZoomFactor, (wavesurfer.LeftProgress/wavesurfer.getDuration()) * 100, wavesurfer.params.verticalZoom]);

				return ;
			}
			
			if (wv.ZoomFactor > 0)
			{
				// drag and draw by X pixels...
				var time_moved = wv.VisibleDuration * (diff / wv.drawer.width);
				wv.LeftProgress += time_moved;
				
				if (wv.LeftProgress + wv.VisibleDuration >= wv.getDuration ())
				{
					wv.LeftProgress = wv.getDuration () - wv.VisibleDuration;
				}
				else if (wv.LeftProgress < 0) {
					wv.LeftProgress = 0;
				}

				wv.ForceDraw ();
				app.fireEvent ('DidZoom', [wavesurfer.ZoomFactor, (wavesurfer.LeftProgress/wavesurfer.getDuration()) * 100, wavesurfer.params.verticalZoom]);
			}
		});
		

		wave.addEventListener ('mousedown', function( e ) {
			if (e.which === 3) {
				e.preventDefault();
				
				wavesurfer.Interacting |= (1 << 1);

				drag_x = e.clientX;
				wave.className = 'pk_grabbing';
				
				document.addEventListener ('mousemove', drag_move, false);
				return (false);
			} else {
				app.fireEvent ('MouseDown');
				app.fireEvent ('RequestChanToggle', 0, 1);
				app.fireEvent ('RequestChanToggle', 1, 1);
			}
		}, false);
		wave.addEventListener ('mouseleave', function( e ) {
			document.removeEventListener ('mousemove', drag_move);

			if (wave.className !== '')
			{
				wave.className = '';
				setTimeout(function () {
					wavesurfer.Interacting &= ~(1 << 1);
				}, 20);

			}
		}, false);
		wave.addEventListener ('mouseup', function( e ) {
			if (e.which === 3)
			{
				if (wave.className !== '')
				{
					wave.className = '';
					setTimeout(function () {
						wavesurfer.Interacting &= ~(1 << 1);
					}, 20);
				}
				document.removeEventListener ('mousemove', drag_move);
			}
		}, false);

		app.fireEvent ('RequestResize');

		app.listenFor ('RequestViewFollowCursorToggle', function () {
			var val = !wavesurfer.FollowCursor;
			wavesurfer.FollowCursor = val;

			// jump to curr cursor position
			if (val && q.is_ready) {
				wavesurfer.CursorCenter ();
			}

			app.fireEvent ( 'DidViewFollowCursorToggle', val );
		});
		app.listenFor ('RequestViewPeakSeparatorToggle', function () {
			if (!q.is_ready) return ;

			var val = !wavesurfer.params.limits ;
			wavesurfer.params.limits = val;

			wavesurfer.ForceDraw ();

			app.fireEvent ( 'DidViewPeakSeparatorToggle', val );
		});

		
		app.listenFor ('RequestViewTimelineToggle', function () {
			if (!q.is_ready) return ;

			var val = !wavesurfer.params.timeline ;
			wavesurfer.params.timeline = val;

			wavesurfer.ForceDraw ();

			app.fireEvent ( 'DidViewTimelineToggle', val );
		});

		app.listenFor ('RequestViewCenterToCursor', function () {
			if (!q.is_ready) return ;
			wavesurfer.CursorCenter ();
		});


		app.listenFor ('RequestZoomUI', function (type, val) {
			if (!q.is_ready) return ;

			if (type === 0) {
				wavesurfer.ResetZoom ();
				return ;
			}

			if (type === 'h') {
				wavesurfer.SetZoom ( 0.5, val );
			}

			if (type === 'v') {
				wavesurfer.SetZoomVertical ( val );
			}
		});
		// -


		this.ID3 = function ( arraybuffer ) {
			var tags = null;
			// var ttt = window.performance.now();

            var bytes = new Uint8Array( arraybuffer );
            if (bytes.length < 64) {
            	app.fireEvent ('RequestActionID3', 1, tags);
            	return tags;
            }

            if (bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) {
				tags = ID3v2.ReadTags ( arraybuffer );

				//console.log( window.performance.now() - ttt );
				// console.log( tags );
            }
            else if (bytes[4] === 102 && bytes[5] === 116 && bytes[6] === 121 && 
            	bytes[7] === 112 && bytes[8] === 77 && bytes[9] === 52) {

            	tags = ID4.ReadTags ( arraybuffer );
				// console.log( window.performance.now() - ttt );
				// console.log( tags );
            }
            bytes = null;

            app.fireEvent ('RequestActionID3', 1, tags);

            return (tags);
		};
		// ---
	};

	PKAE._deps.engine = PKEng;

})( window, document, PKAudioEditor );
(function( PKAE ) {
	'use strict';

	function AudioUtils ( master, wavesurfer ) {

		// audio destination
		var audio_destination = wavesurfer.backend.analyser;
		var audio_ctx   = wavesurfer.backend.ac;
		var audio_script_node = audio_ctx.createScriptProcessor(256);

		function loadDecoded ( new_buffer ) {
			wavesurfer.loadDecodedBuffer ( new_buffer );
			master.fireEvent ('DidUpdateLen', wavesurfer.getDuration ());
		};

		function OverwriteBufferWithSegment (_offset, _duration, withBuffer ) {
			var originalBuffer = wavesurfer.backend.buffer;
			TrimBuffer( _offset, _duration, true );
			var ret = InsertSegmentToBuffer ( _offset, withBuffer );

			setTimeout (function() {
				wavesurfer.drawBuffer();
			},40);

			return (ret);
		}

		function OverwriteBuffer ( withBuffer ) {
			loadDecoded ( withBuffer );
			setTimeout (function() {
				wavesurfer.drawBuffer();
			},40);
		}
		
		function MakeSilenceBuffer ( _duration ) {
			var originalBuffer = wavesurfer.backend.buffer;
			var emptySegment = wavesurfer.backend.ac.createBuffer(
				originalBuffer.numberOfChannels,
				_duration * originalBuffer.sampleRate,
				originalBuffer.sampleRate
			);

			return (emptySegment);
		}


		function CopyBufferSegment( _offset, _duration ) {
			var originalBuffer = wavesurfer.backend.buffer;

			var new_len    = ((_duration/1) * originalBuffer.sampleRate) >> 0;
			var new_offset = ((_offset/1)   * originalBuffer.sampleRate) >> 0;

			var emptySegment = wavesurfer.backend.ac.createBuffer (
				wavesurfer.SelectedChannelsLen,
				new_len,
				originalBuffer.sampleRate
			);

			for (var i = 0, u = 0; i < wavesurfer.ActiveChannels.length; ++i) {
				if (wavesurfer.ActiveChannels[ i ] === 0) continue;

				emptySegment.getChannelData ( u ).set (
					originalBuffer.getChannelData ( i ).slice ( new_offset, new_len + new_offset )
				);

				++u;
			}
			return (emptySegment);
		};
		
		
		function TrimBuffer( _offset, _duration, force ) {
			var originalBuffer = wavesurfer.backend.buffer;

			var new_len    = ((_duration/1) * originalBuffer.sampleRate) >> 0;
			var new_offset = ((_offset/1)   * originalBuffer.sampleRate) >> 0;

			var emptySegment = wavesurfer.backend.ac.createBuffer (
				!force ? wavesurfer.SelectedChannelsLen : originalBuffer.numberOfChannels,
				new_len,
				originalBuffer.sampleRate
			);

			var uberSegment = null;

			if (!force && wavesurfer.SelectedChannelsLen < originalBuffer.numberOfChannels)
			{
				uberSegment = wavesurfer.backend.ac.createBuffer (
					originalBuffer.numberOfChannels,
					originalBuffer.length,
					originalBuffer.sampleRate
				);

				for (var i = 0; i < originalBuffer.numberOfChannels; ++i) {
					var chan_data = originalBuffer.getChannelData ( i );
					var uber_chan_data = uberSegment.getChannelData ( i );

					if (wavesurfer.ActiveChannels[ i ] === 0)
					{
						uber_chan_data.set (
							chan_data
						);
					}
					else
					{
						var segment_chan_data = emptySegment.getChannelData (0);

						segment_chan_data.set (
							chan_data.slice ( new_offset, new_offset + new_len )
						);
						
						uber_chan_data.set (
							chan_data.slice ( 0, new_offset )
						);

						uber_chan_data.set (
							chan_data.slice ( new_offset + new_len ), new_offset + new_len
						);
					}
				}
			}
			else
			{
				uberSegment = wavesurfer.backend.ac.createBuffer(
					originalBuffer.numberOfChannels,
					originalBuffer.length - new_len,
					originalBuffer.sampleRate
				);

				for (var i = 0; i < originalBuffer.numberOfChannels; ++i) {
					var chan_data = originalBuffer.getChannelData(i);
					var segment_chan_data = emptySegment.getChannelData(i);
					var uber_chan_data = uberSegment.getChannelData(i);

					segment_chan_data.set (
						chan_data.slice ( new_offset, new_offset + new_len )
					);
					
					uber_chan_data.set (
						chan_data.slice ( 0, new_offset )
					);
					
					uber_chan_data.set (
						chan_data.slice ( new_offset + new_len ), new_offset
					);
				}
			}

			loadDecoded ( uberSegment, originalBuffer );

			return (emptySegment);
		};
		
		
		
		function InsertSegmentToBuffer( _offset, buffer ) {
			var originalBuffer = wavesurfer.backend.buffer;
			var uberSegment = wavesurfer.backend.ac.createBuffer(
				originalBuffer.numberOfChannels,
				originalBuffer.length + buffer.length,
				originalBuffer.sampleRate
			);

			_offset = ((_offset / 1) * originalBuffer.sampleRate) >> 0;

			for (var i = 0; i < originalBuffer.numberOfChannels; ++i) {

				var chan_data = originalBuffer.getChannelData( i );
				var uberChanData = uberSegment.getChannelData( i );
				var segment_chan_data = null;

				if (buffer.numberOfChannels === 1)
					segment_chan_data = buffer.getChannelData( 0 );
				else
					segment_chan_data = buffer.getChannelData( i );

				// check to see if we have only 1 channel selected
				if (wavesurfer.SelectedChannelsLen === 1)
				{
					// check if we have the selected channel
					if (wavesurfer.ActiveChannels[ i ] === 0)
					{
						// keep original
						uberChanData.set (
							chan_data
						);
					
						continue;
					}
				}

				if (_offset > 0)
				{
					uberChanData.set (
						chan_data.slice ( 0, _offset )
					);
				}

				uberChanData.set (
					segment_chan_data, _offset
				);

				if (_offset < (originalBuffer.length + buffer.length) )
				{
					uberChanData.set (
						chan_data.slice( _offset ), _offset + segment_chan_data.length
					);
				}
			}
			
			loadDecoded ( uberSegment, originalBuffer );

			return [
				(_offset / originalBuffer.sampleRate), 
				(_offset / originalBuffer.sampleRate) + (buffer.length / originalBuffer.sampleRate)
			];
		};


		function ReplaceFloatArrays ( _offset, arrays ) {
			var originalBuffer = wavesurfer.backend.buffer;
			var arr_len = arrays.length;
			var arr_samples = arrays[0].length;

			var new_len = (arr_samples * arr_len);
			var buff_len = originalBuffer.length;

			_offset = ((_offset / 1) * originalBuffer.sampleRate) >> 0;

			if (buff_len < (_offset + new_len)) {
				buff_len = (_offset + new_len);
			}

			var uberSegment = wavesurfer.backend.ac.createBuffer (
				originalBuffer.numberOfChannels,
				buff_len,
				originalBuffer.sampleRate
			);

			for (var i = 0; i < originalBuffer.numberOfChannels; i++) {
				var chan_data = originalBuffer.getChannelData( i );
				var uberChanData = uberSegment.getChannelData( i );


				if (_offset > 0)
				{
					uberChanData.set (
						chan_data.slice ( 0, _offset )
					);
				}

				for (var j = 0; j < arr_len; ++j)
				{
					uberChanData.set (
						arrays[ j ], _offset + (j * arr_samples)
					);
				}

				if (_offset < (originalBuffer.length + new_len) )
				{
					uberChanData.set (
						chan_data.slice( _offset + new_len ), _offset + new_len
					);
				}
			}

			loadDecoded ( uberSegment, originalBuffer );

			return [
				(_offset / originalBuffer.sampleRate), 
				(_offset / originalBuffer.sampleRate) + (new_len / originalBuffer.sampleRate)
			];
		};

		function InsertFloatArrays( _offset, arrays ) {
			var originalBuffer = wavesurfer.backend.buffer;
			var arr_len = arrays.length;
			var arr_samples = arrays[0].length;

			var new_len = (arr_samples * arr_len);

			_offset = ((_offset / 1) * originalBuffer.sampleRate) >> 0;

			var uberSegment = wavesurfer.backend.ac.createBuffer(
				originalBuffer.numberOfChannels,
				originalBuffer.length + new_len,
				originalBuffer.sampleRate
			);

			for (var i = 0; i < originalBuffer.numberOfChannels; i++) {
				var chan_data = originalBuffer.getChannelData( i );
				var uberChanData = uberSegment.getChannelData( i );


				if (_offset > 0)
				{
					uberChanData.set (
						chan_data.slice ( 0, _offset )
					);
				}

				for (var j = 0; j < arr_len; ++j)
				{
					uberChanData.set (
						arrays[ j ], _offset + (j * arr_samples)
					);
				}

				if (_offset < (originalBuffer.length + new_len) )
				{
					uberChanData.set (
						chan_data.slice( _offset ), _offset + new_len
					);
				}
			}

			loadDecoded ( uberSegment, originalBuffer );

			return [
				(_offset / originalBuffer.sampleRate), 
				(_offset / originalBuffer.sampleRate) + (new_len / originalBuffer.sampleRate)
			];
		};
		
		function getAudioContext() {
			if (!window.WaveSurferAudioContext) {
				window.WaveSurferAudioContext = new (window.AudioContext ||
					window.webkitAudioContext)();
			}
			return window.WaveSurferAudioContext;
		}
		function getOfflineAudioContext (channels, sampleRate, duration) {
			return new (window.OfflineAudioContext ||
					window.webkitOfflineAudioContext)(channels, duration, sampleRate);
		};

		function initPreview (val) {
			this.previewVal = val;
		};

		function stopPreview (_fx) {
			if (!this.previewing) return ;

			if (_fx) {
				_fx.destroy && _fx.destroy ();
			}

			if (this.PreviewFilter)
			{
				if (this.PreviewFilter.length > 0)
				{
					for (var ii = 0; ii < this.PreviewFilter.length; ++ii)
						this.PreviewFilter[ ii ].disconnect ();
				}
				else
					this.PreviewFilter.disconnect ();
			}

			var script_node = audio_script_node; // wavesurfer.backend.scriptNode

			script_node.disconnect ();
			wavesurfer.backend.scriptNode.connect (audio_ctx.destination);
			// wavesurfer.backend.scriptNode.connect (audio_ctx.destination);
			// wavesurfer.backend.scriptNode.onaudioprocess = null;

			this.PreviewSource.stop();
			this.PreviewSource.disconnect ();

			this.PreviewDestination = this.PreviewSource = this.PreviewFilter = this.PreviewUpdate = null;
			this.previewing = 0;
		}
		function togglePreview () {
			if (!this.previewing) {

				this.previewVal = !this.previewVal;
				return (this.previewVal);
			}

			if (this.previewing === 2)
			{
//				if (this.PreviewFilter)
//				{
//					if (this.PreviewFilter.length > 0)
//					{
//						for (var ii = 0; ii < this.PreviewFilter.length; ++ii)
//							this.PreviewFilter[ ii ].disconnect ();
//					}
//					else
//						this.PreviewFilter.disconnect ();
//				}

				if (this.PreviewTog) {
					this.PreviewTog (false, this.PreviewSource);
				}

				this.PreviewSource.disconnect ();
				this.PreviewSource.connect (this.PreviewDestination);
				this.previewing = 1;
				this.previewVal = false;
				
				return (false);
			}
			else
			{
				this.PreviewSource.disconnect ();

				if (this.PreviewFilter)
				{
					if (this.PreviewFilter.length > 0)
					{
						!this.PreviewFilter[ 0 ].buffer && this.PreviewSource.connect (this.PreviewFilter[ 0 ]);
//						var ii = 0;
//						for (; ii < this.PreviewFilter.length - 1; ++ii)
//						{
//							this.PreviewFilter[ ii ].disconnect ();
//							this.PreviewFilter[ ii ].connect (this.PreviewFilter[ ii + 1 ]);
//						}
//						this.PreviewFilter[ ii ].connect (this.PreviewDestination);
					}
					else
					{
						!this.PreviewFilter.buffer && this.PreviewSource.connect (this.PreviewFilter);
						this.PreviewFilter.disconnect ();
						this.PreviewFilter.connect (this.PreviewDestination);
					}
				}

				if (this.PreviewTog) {
					this.PreviewTog (true, this.PreviewSource);
				}

				this.previewing = 2;
				this.previewVal = true;

				return (true);
			}
		}


		function previewEffect ( _offset, _duration, _fx ) {
			if (this.previewing) stopPreview (_fx);

			var orig_buffer = wavesurfer.backend.buffer;

			if (!_offset && !_duration)
			{
				_offset = 0;
				_duration = (orig_buffer.length / orig_buffer.sampleRate) >> 0;
			}

			var script_node = audio_script_node; //wavesurfer.backend.scriptNode;
			var fx_buffer = CopyBufferSegment (_offset, _duration);
			var audio_ctx = wavesurfer.backend.ac || getAudioContext ();
			var source = audio_ctx.createBufferSource ();
			source.buffer = fx_buffer;
			source.loop = true;

			this.PreviewFilter = this.PreviewTog = null;
			if (!_fx)
				source.connect (audio_destination);
			else
			{
				this.PreviewTog    = _fx.preview;
				this.PreviewUpdate = _fx.update;
				this.PreviewFilter = _fx.filter ( audio_ctx, audio_destination, source, _duration/1 );
			}

			script_node.disconnect ();
			wavesurfer.backend.scriptNode.disconnect ();
			script_node.connect( audio_ctx.destination );

			var skipp = 1;
			var prev_fft = 0;
			var dataArray = null;

			script_node.onaudioprocess = ( e ) => {

				var loudness = [0, 0];
				var temp = 0;
				// var flip = false;
				--skipp;

				if (skipp === 0)
				{
					if (audio_destination.getFloatTimeDomainData)
					{
						if (prev_fft !== audio_destination.fftSize)
						{
		                	dataArray = new Float32Array(audio_destination.fftSize); // Float32Array needs to be the same length as the fftSize 
		                	prev_fft = audio_destination.fftSize;
		                }
		                audio_destination.getFloatTimeDomainData (dataArray); // fill the Float32Array with data returned from getFloatTimeDomainData()

		                for (var j = 0; j < audio_destination.fftSize; j += 1) {
		                    var x = dataArray[j];
		                    if (Math.abs(x) >= temp) {
		                        temp = Math.abs(x);
		                    }
		                }

		                loudness[0] = 20 * Math.log10(temp) + 0.001;
					}
					else
					{
						if (prev_fft !== audio_destination.fftSize)
						{
		                	dataArray = new Uint8Array(audio_destination.fftSize); // Float32Array needs to be the same length as the fftSize 
		                	prev_fft = audio_destination.fftSize;
		                }
		                audio_destination.getByteTimeDomainData (dataArray); // fill the Float32Array with data returned from getFloatTimeDomainData()

		                var total_float = 0;

						for (var j = 0; j < audio_destination.fftSize; j += 1) {
						    var float = ( dataArray[j] / 0x80 ) - 1;
						    total_float += ( float * float );
						}
						var rms = Math.sqrt (total_float / audio_destination.fftSize);
						loudness[0] = 20 * ( Math.log(rms) / Math.log(10) );
					}

	                if (loudness[0] < -100) loudness[0] = -100;
	                loudness[1] = loudness[0];

					// audio_destination.fftSize = 512;
					audio_destination.getByteFrequencyData( wavesurfer.backend.FreqArr );

					//wavesurfer.backend.peak_frequency = Math.max.apply( null, wavesurfer.backend.FreqArr );
					master.fireEvent ('DidAudioProcess',[-1, loudness, e.timeStamp], wavesurfer.backend.FreqArr);
					// wavesurfer.backend.peak_frequency = [0, 0];
					skipp = 2;
				}
			};

			source.start ();

			this.PreviewSource = source;
			this.PreviewDestination = audio_destination;
			this.previewing = 2;

			if (!this.previewVal)
			{
				togglePreview.call (this);
			}

			return (source);
		}

		function applyEffect( _offset, _duration, _fx ) {
			var orig_buffer = wavesurfer.backend.buffer;

			if (!_offset && !_duration)
			{
				_offset = 0;
				_duration = (orig_buffer.length / orig_buffer.sampleRate) >> 0;
			}

			if (_offset <0) _offset = 0;
			if (wavesurfer.getDuration () < _duration)
				_duration  = wavesurfer.getDuration ();

			var fx_buffer = CopyBufferSegment ( _offset, _duration );
			var new_offset = ((_offset/1)   * orig_buffer.sampleRate) >> 0;

			var audio_ctx = getOfflineAudioContext (
					wavesurfer.SelectedChannelsLen, // orig_buffer.numberOfChannels,
					orig_buffer.sampleRate,
					fx_buffer.length
			);

			var source = audio_ctx.createBufferSource ();
			source.buffer = fx_buffer;

			var filter = null;
			if (_fx) {
				filter = _fx.filter ( audio_ctx, audio_ctx.destination, source, _duration/1 );
				filter.destroy && filter.destroy ();
			}

			source.start ();

			var offline_callback = function( rendered_buffer ) {
				var uber_buffer = wavesurfer.backend.ac.createBuffer(
					orig_buffer.numberOfChannels,
					orig_buffer.length,
					orig_buffer.sampleRate
				);
				
				for (var i = 0; i < orig_buffer.numberOfChannels; ++i)
				{
					var uber_chan_data = uber_buffer.getChannelData (i);
					var chan_data = orig_buffer.getChannelData (i);

					// check if channel is active
					if (wavesurfer.ActiveChannels[ i ] === 0)
					{
						uber_chan_data.set (
							chan_data
						);
						continue;
					}

					var fx_chan_data = null;
					if (rendered_buffer.numberOfChannels === 1)
						fx_chan_data = rendered_buffer.getChannelData( 0 );
					else
						fx_chan_data = rendered_buffer.getChannelData( i );

					uber_chan_data.set (
						chan_data
					);

					uber_chan_data.set (
						fx_chan_data, new_offset, fx_chan_data.length - new_offset
					);
				}

				loadDecoded ( uber_buffer );
				
				if (filter.length > 0) {
					for (var i = 0; i < filter.length; ++i) filter[i].disconnect ();
				} else filter && filter.disconnect && filter.disconnect ();

				// is this needed?
				rendered_buffer = fx_buffer = filter = null;
				source.disconnect ();
				// audio_ctx.close ();
				// -
			};

			var offline_renderer = audio_ctx.startRendering(); 
			if (offline_renderer)
				offline_renderer.then( offline_callback ).catch(function(err) {
					console.log('Rendering failed: ' + err);
				});
			else
				audio_ctx.oncomplete = function ( e ) {
					offline_callback ( e.renderedBuffer );
				};
		};


/*
		/////////////// -----------------------
		// ATTEMPTING BACKGROUND NOISE REMOVAL
		function findTopFrequencies (_offset, _duration, callback) {
			var q = this;

			var audio_ctx = getAudioContext ();
			var buffer_source = audio_ctx.createBufferSource();
			buffer_source.buffer = CopyBufferSegment (_offset, _duration);

			var analyser = audio_ctx.createAnalyser ();
			analyser.fftSize  = 2048;
			analyser.minDecibelsis  = -40;
			analyser.maxDecibelsis  = 0;
			var scp = audio_ctx.createScriptProcessor (256, 0, 1);

			buffer_source.connect (analyser);
			scp.connect (audio_ctx.destination);
			// buffer_source.loop = true;

			var samples = 0;
			var finger_print = new Uint16Array (analyser.frequencyBinCount);
			var freq_data = new Uint8Array (analyser.frequencyBinCount);
			scp.onaudioprocess = function () {
				analyser.getByteFrequencyData (freq_data);

				for (var i = 0; i < freq_data.length; ++i)
				{
					finger_print[ i ] += freq_data [ i ];
				}
				++samples;
			};
			buffer_source.onended = function() {

				   var sampleRate = buffer_source.buffer.sampleRate;
				   buffer_source.stop ();
				   buffer_source.disconnect ();
				   scp.disconnect ();
				   
				for (var i = 0; i < finger_print.length; ++i)
				{
					finger_print[ i ] /= samples >> 0;
					if (finger_print[ i ] < 10) {
						finger_print[ i ] = 0;
					}
				}

				callback && callback.apply (q, [finger_print] );
			};
			buffer_source.start (0);
		}
		function killdTopFrequencies (_offset, _duration, _noise_profile) {
			var q = this;
			var step = function ( _offset, _duration, callback ) {
				findTopFrequencies (_offset, _duration, function( frequencies ) {
					var similarity = [];
					var similar_frequencies = 0;

					for (var i = 0; i < _noise_profile.length; ++i)
					{
						var val = Math.abs ( frequencies[ i ] - _noise_profile[ i ] );
						if (val < 10)
						{
							similarity[ i ] = (val == 0 && _noise_profile[ i ] > 0) ? 5 : val;
							++similar_frequencies;
						}
					}

					if ( similar_frequencies > _noise_profile.length / 3)
					{
						cleanUpSpecificAudioRange.apply (q, [_offset, _duration, similarity]);
					}
					
					callback && callback ();
				});
			};
			if (_duration <= 0.1) step ( _offset, _duration );
			else
			{
				var new_offset = _offset;
				var goal = _offset + _duration;

				var test = function () {
					if ( new_offset < goal ) {
						var dur_step = 0.1;
						if (new_offset + dur_step > goal) dur_step = goal - new_offset;

						step ( new_offset, dur_step, test );
						new_offset += dur_step;
					}
				}
				test ();
				// -
				
			}
		}
		function cleanUpSpecificAudioRange (_offset, _duration, _frequencies) {
			// var fx_buffer = CopyBufferSegment (_offset, _duration);
			var val = [];
			var all_ok = false;
			
			for (var i = 0; i < _frequencies.length; ++i)
			{
				if (!_frequencies[i]) continue;
				val.push({
					'type' : 'notch',
					'freq' : (i * wavesurfer.backend.ac.sampleRate/_frequencies.length)/2,
					'val'  : -35,//(_frequencies[i]),
					'q'	   : 10.0
				});
				all_ok = true;
			}

			if (all_ok)
			{
				var ff = this.FXBank.ParametricEQ( val );
				this.FX( _offset, _duration, ff );
			}

*/

/*
						var bands = [];
						var len = val.length;

						var makeEQ = function ( band ) {
							var eq = audio_ctx.createBiquadFilter ();
							eq.type = band.type;
							eq.gain.value = ~~band.val;
							eq.Q.value = 1;
							eq.frequency.value = band.freq;

							return (eq);
						};
						
						var eq = makeEQ ( val [0] );
						bands.push ( eq );
						source.connect (eq);

						for (var i = 1; i < len - 1; ++i)
						{
							eq = makeEQ ( val [ i ] );
							bands [ i - 1 ].connect ( eq );
							bands.push ( eq );
						}
						eq = makeEQ ( val [ len - 1 ] );
						bands [ bands.length - 1 ].connect ( eq );
						bands.push ( eq );
						eq.connect (audio_ctx.destination);

						return (bands);
*/
//		}
		// ENDOF ATTEMPTING BACKGROUND NOISE REMOVAL
		/////////////// -----------------------
		

		var worker = null;
		function DownloadFileCancel () {
			if (worker) {
				worker.terminate ();
				worker = null;
			}
		}

		function DownloadFile( with_name, format, kbps, selection, stereo, callback ) {
			if (wavesurfer && wavesurfer.backend && wavesurfer.backend.buffer){}
			else {
				return false;
			}
			

			if (format === 'mp3') {
				worker = new Worker('lame.js');
			}
			else if (format === 'flac') {
				worker = new Worker('flac.js');
			}
			else {
				worker = new Worker('wav.js');
			}

			var originalBuffer = wavesurfer.backend.buffer;
			var sample_rate = originalBuffer.sampleRate;

			var channels = originalBuffer.numberOfChannels;

			var data_left = originalBuffer.getChannelData ( 0 );
			var data_right = null;
			if (channels === 2)
				data_right = originalBuffer.getChannelData ( 1 );

			if (!stereo && channels === 2)
			{
				if (!wavesurfer.ActiveChannels[0] && wavesurfer.ActiveChannels[1])
				{
					data_left  = originalBuffer.getChannelData ( 1 );
					data_right = null;
					channels   = 1;
				}
			}

			if (stereo && !data_right)
			{
				data_right = data_left;
				channels   = 2;
			}
			else if (!stereo && data_right)
			{
				data_right = null;
				channels   = 1;
			}

			var len = data_left.length, i = 0;
			var offset = 0;

			if (selection)
			{
				offset = (selection[0] * sample_rate) >> 0;
				len = ((selection[1] * sample_rate) >> 0) - offset;
			}

			var dataAsInt16ArrayLeft = new Int16Array(len);
			var dataAsInt16ArrayRight = null;


			if (data_right)
			{
				dataAsInt16ArrayRight = new Int16Array(len);

				while(i < len) {
					dataAsInt16ArrayLeft[i] = convert(data_left[offset + i]);
				 	dataAsInt16ArrayRight[i] = convert(data_right[offset + i]);
				 	++i;
				}
			}
			else
			{
				while(i < len) {
					dataAsInt16ArrayLeft[i] = convert(data_left[offset + i]);
				 	++i;
				}
			}
			function convert ( n ) {
				 var v = n < 0 ? n * 32768 : n * 32767;       // convert in range [-32768, 32767]
				 return Math.max(-32768, Math.min(32768, v)); // clamp
			}

			worker.onmessage = function( ev ) {
				if (ev.data.percentage)
				{
					callback && callback ( ev.data.percentage );
					return ;
				}
				forceDownload( ev.data );

				worker.terminate ();
				worker = null;
			}

			worker.postMessage ({
				sample_rate: sample_rate,
				kbps:!kbps ? 128 : kbps,
				flac_compression: kbps,
				channels: channels
			});
			worker.postMessage ( dataAsInt16ArrayLeft.buffer, [dataAsInt16ArrayLeft.buffer] );
			if (data_right)
				worker.postMessage ( dataAsInt16ArrayRight.buffer, [dataAsInt16ArrayRight.buffer] );
			else
				worker.postMessage (null);

			// function forceDownload ( mp3Data ) {
			// 	var blob = new Blob (mp3Data, {type:'audio/mp3'});
			function forceDownload ( blob ) {			
				var url = (window.URL || window.webkitURL).createObjectURL(blob);

				var a = document.createElement( 'a' );
				a.href = url;
				a.download = with_name ? with_name : 'output.mp3';
				a.style.display = 'none';
				document.body.appendChild( a );
				a.click();

				callback && callback ('done');
			}
		}
		
		function updatePreview ( val ) {
			if (!this.previewing) return ;
			this.PreviewUpdate && this.PreviewUpdate ( this.PreviewFilter, audio_ctx, val, this.PreviewSource );
		}
		

		// EFFECTS LOGIC
		var FXBank = {
			Gain : function( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var gain = audio_ctx.createGain ();

						for (var k = 0; k < val.length; ++k)
						{
							var curr = val[k];
							if (curr.length)
							{
								for (var i = 0; i < curr.length; ++i) {
									gain.gain.linearRampToValueAtTime (curr[i].val, audio_ctx.currentTime + curr[i].time);
								}
							}
							else
							{
								gain.gain.setValueAtTime ( curr.val, audio_ctx.currentTime );
							}
						}

						gain.connect (destination);
						source.connect (gain);

						return (gain);
					},
					update : function ( gain, audio_ctx, val ) {
						for (var k = 0; k < val.length; ++k)
						{
							var curr = val[k];
							if (curr.length)
							{
								for (var i = 0; i < curr.length; ++i) {
									gain.gain.linearRampToValueAtTime (curr[i].val, audio_ctx.currentTime + curr[i].time);
								}
							}
							else
							{
								gain.gain.setValueAtTime ( curr.val, audio_ctx.currentTime );
							}
						}
						// ----
					}
				};
			},
			
			FadeIn : function( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var gain = audio_ctx.createGain ();
						gain.gain.setValueAtTime (0, audio_ctx.currentTime);
						gain.gain.linearRampToValueAtTime (1, audio_ctx.currentTime + duration/1);
						gain.connect (destination);	
						source.connect (gain);

						return (gain);
					}
				};
			},
			
			FadeOut : function( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var gain = audio_ctx.createGain ();
						gain.gain.setValueAtTime (1, audio_ctx.currentTime);
						gain.gain.linearRampToValueAtTime (0, audio_ctx.currentTime + duration/1);
						gain.connect (destination);			
						source.connect (gain);

						return (gain);
					}
				};
			},
			
			Compressor : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var compressor = audio_ctx.createDynamicsCompressor ();

						for (var k in val)
						{
							if (val[k].length)
							{
								for (var i = 0; i < val[k].length; ++i)
								{
									var curr = val[k][i];
									compressor[k].linearRampToValueAtTime (curr.val, audio_ctx.currentTime + curr.time);
								}
							}
							else
							{
								compressor[k].setValueAtTime ( val[k].val, audio_ctx.currentTime );
							}
						}

						compressor.connect (destination);
						source.connect (compressor);

						return (compressor);
					},
					update : function ( compressor, audio_ctx, val ) {
						for (var k in val)
						{
							if (val[k].length)
							{
								for (var i = 0; i < val[k].length; ++i)
								{
									var curr = val[k][i];
									compressor[k].linearRampToValueAtTime (curr.val, audio_ctx.currentTime + curr.time);
								}
							}
							else
							{
								compressor[k].setValueAtTime ( val[k].val, audio_ctx.currentTime );
							}
						}
						// ---
					}
				};
			},

			Reverse : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						for (var i = 0; i < source.buffer.numberOfChannels; ++i) {
							Array.prototype.reverse.call( source.buffer.getChannelData (i) );
						}

						source.connect (destination);
						return (source);
					},
					update : function () {}
				};
			},
			
			Invert : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						for (var i = 0; i < source.buffer.numberOfChannels; ++i) {
							var channel = source.buffer.getChannelData (i);
							
							for (var j = 0; j < channel.length; ++j)
								channel[j] *= -1;
						}

						source.connect (destination);
						return (source);
					},
					update : function () {}
				};
			},

			Flip : function ( val, val2 ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						if (val === 'flip')
						{
							var chan0 = source.buffer.getChannelData (0);
							var chan1 = source.buffer.getChannelData (1);
							var tmp   = 0;

							for (var j = 0; j < chan0.length; ++j)
							{
								tmp = chan0[j];
								chan0[j] = chan1[j];
								chan1[j] = tmp;
							}
						}

						source.connect (destination);
						return (source);
					},
					update : function () {}
				};
			},

			Normalize : function ( val ) { //todo ASM JS??
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var max_val = val[1] || 1.0;
						var equally = val[0];
						var max_peak = 0;

						for (var i = 0; i < source.buffer.numberOfChannels; ++i) {
							var chan_data = source.buffer.getChannelData (i);

							// iterating faster first time...
							for (var k = 1, len = chan_data.length; k < len; k = k + 10) {
								var curr = Math.abs ( chan_data [ k ] );
								if (max_peak < curr)
									max_peak = curr;
							}

							var diff = max_val / max_peak;

							if (!equally) {
								for (var k = 0, len = chan_data.length; k < len; ++k) {
									chan_data[ k ] *= diff;
								}
								max_peak = 0;
							}
						}
						
						if (equally) {
							var diff = max_val / max_peak;

							for (var i = 0; i < source.buffer.numberOfChannels; ++i) {
								var chan_data = source.buffer.getChannelData (i);

								for (var k = 0, len = chan_data.length; k < len; ++k) {
									chan_data[ k ] *= diff;
								}
							}
						}

						source.connect (destination);
						return (source);
					},
					update : function () {}
				};
			},
			
			HardLimit : function ( val ) { //todo ASM JS??
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var max_val = val[1] || 1.0;
						var ratio = val[2] || 0.0;
						var look_ahead = val[3] || 15; // ms
						var equally = false; //val[0];
						var max_peak = 0;

						var buffer = audio_ctx.createBuffer(
							source.buffer.numberOfChannels,
							source.buffer.length,
							source.buffer.sampleRate
						);
						
						look_ahead = (look_ahead * buffer.sampleRate/1000) >> 0;
						
						for (var i = 0; i < buffer.numberOfChannels; ++i) {
							var chan_data = buffer.getChannelData (i);
							chan_data.set ( source.buffer.getChannelData (i) );

							// iterating faster first time...
							for (var b = 0, len = chan_data.length; b < len; ++b)
							{
								for (var k = 0; k < look_ahead; k = k + 10) {
									var curr = Math.abs ( chan_data [ b + k ] );
									if (max_peak < curr)
										max_peak = curr;
								}
								
								var diff = (max_val / max_peak);

								if (!equally) {
									for (var k = 0; k < look_ahead; ++k) {
										var orig_val = chan_data[ b + k ];
										var new_val = orig_val * diff;

										var peak_diff = max_val - Math.abs (new_val);
										peak_diff *= orig_val < 0 ? -ratio : ratio;

										chan_data[ b + k ] = (new_val + peak_diff);
									}
									b += look_ahead;
									max_peak = 0;
								}
							}
							// -----
						}

						// todo handle disconnected LEFT AND RIGHT
						var temp_source = audio_ctx.createBufferSource ();
						temp_source.buffer = buffer;
						temp_source.loop = true;
						temp_source.start ();

						temp_source.connect (destination);
						return (temp_source);
					},
					update : function ( filtered_source, audio_ctx, val, source ) {
						// stop the existing onerror
						filtered_source.disconnect ();
						filtered_source.buffer = null;
						filtered_source = null;

						var ff = this.FXBank.HardLimit( val );
						this.PreviewFilter = ff.filter ( audio_ctx, audio_destination, source, 0 );
					}
				};
			},
			
			ParametricEQ : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						var bands = [];
						var len = val.length;

						var makeEQ = function ( band ) {
							var eq = audio_ctx.createBiquadFilter ();

							if (band.length)
							{
								for (var i = 0; i < band.length; ++i)
								{
									eq.gain.linearRampToValueAtTime (~~band[i].val, audio_ctx.currentTime + band[i].time);
								}

								band = band[0];
							}
							else eq.gain.value = ~~band.val;

							eq.type = band.type;
							eq.Q.value = band.q || 1.0;
							eq.frequency.value = band.freq;

							return (eq);
						};

						if (!val[0])
						{
							val[0] = {
								type:'peaking',
								val:0,
								q:1,
								freq:500
							};
						}

						var eq = makeEQ ( val[0] );
						bands.push ( eq );
						source.connect (eq);

						if (val.length === 1)
						{
							eq.connect (destination);
							return (bands);
						}

						for (var i = 1; i < len - 1; ++i)
						{
							eq = makeEQ ( val [ i ] );
							bands [ i - 1 ].connect ( eq );
							bands.push ( eq );
						}
						eq = makeEQ ( val[ len - 1 ] );
						bands [ bands.length - 1 ].connect ( eq );
						bands.push ( eq );
						eq.connect (destination);

						return (bands);
					},
					update : function ( bands, audio_ctx, val, source ) {

						if (bands.length !== val.length)
						{
							var makeEQ = function ( band ) {
								var eq = audio_ctx.createBiquadFilter ();
								return (eq);
							};

							if (bands.length < val.length)
							{
								var l = val.length - bands.length;
								while (l-- > 0)
								{
									var eq = makeEQ ();
									var connect_to = bands[0];
									bands.unshift (eq);
									eq.connect (connect_to);
								}

								source.disconnect ();
								source.connect (bands[0]);
							}
							else
							{
								if (val.length > 0)
								{
										var l = bands.length - val.length;
										source.disconnect ();

										for (var i = 0; i < l; ++i)
										{
											var eq = bands.shift();
											eq.disconnect ();
										}

										source.connect (bands[0]);
								}
								else
								{
										val[0] = {
											type:'peaking',
											val:0,
											q:1,
											freq:500
										};
								}
							}
						}

						var len = val.length;
						for (var i = 0; i < len; ++i)
						{
							var eq = bands [ i ];
							eq.type = val[ i ].type;
							eq.gain.value =  ~~val[ i ].val;
							eq.Q.value = val[ i ].q || 1.0;
							eq.frequency.value = val[ i ].freq;
						}
						// -
					}
				};
			},

			Rate : function ( val ) {
				var prev_val = 1.0;
				var temp_source = [];

				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						var fx_buffer = source.buffer;

						var stretch_ratio = val;
						let grainDuration = 0.05;  // 50 ms grain
						const analysisHop = 0.025;   // 25 ms step (50% overlap)
						const desiredOverlap = 0.5;            // 50% overlap
						const synthesisHop = analysisHop * stretch_ratio;  //  output hop

						if (stretch_ratio > 1) {
							grainDuration = synthesisHop / (1 - desiredOverlap); // 0.15 sec (150 ms
						}

						var offlineCtx = audio_ctx;
						const now = audio_ctx.currentTime;

						// var filter = fx.filter ( offlineCtx, offlineCtx.destination, null, duration );
						var applyHannWindowFast = function (gainNode, outputTime, grainDuration) {
							// The automation curve using a Hann window shape
							const numSteps = 50;

							for (let i = 0; i <= numSteps; i++) {
								const t = (i / numSteps) * grainDuration;
								const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * t) / grainDuration));
								gainNode.gain.linearRampToValueAtTime(windowValue, outputTime + t);
							}
						};

						// Schedule grains
						var grainIndex = 0;
						var filter_chain = [];

						for (let t = 0; t < fx_buffer.duration; t += analysisHop) {
								const offset = t;
								const outputTime = grainIndex * synthesisHop;
								if (offset + grainDuration > fx_buffer.duration) break;  // stop if beyond source

								const grainSource = offlineCtx.createBufferSource();
								grainSource.buffer = fx_buffer;

								const grainGain = offlineCtx.createGain();
								grainSource.connect(grainGain);
								grainGain.connect(offlineCtx.destination);

								applyHannWindowFast (grainGain, now + outputTime, grainDuration);

								grainSource.start(now + outputTime, offset, grainDuration);
								filter_chain.push (grainGain);
								temp_source[grainIndex] = grainSource;

								++grainIndex;
						}

						return (filter_chain);
					},

					destroy : function () {
						temp_source = [];
					},

					update : function ( filter_chain, audio_ctx, val, source ) {
						prev_val = 1 / val;
						var fx_buffer = source.buffer;

						let grainDuration = 0.05;  // 50 ms grain
						const analysisHop = 0.025;   // 25 ms step (50% overlap)
						const desiredOverlap = 0.5;            // 50% overlap
						const synthesisHop = analysisHop * prev_val;  //  output hop

						if (prev_val > 1) {
							grainDuration = synthesisHop / (1 - desiredOverlap); // 0.15 sec (150 ms
						}

						const now = audio_ctx.currentTime;

						// var filter = fx.filter ( offlineCtx, offlineCtx.destination, null, duration );
						var applyHannWindowFast = function (gainNode, outputTime, grainDuration) {
							// The automation curve using a Hann window shape
							const numSteps = 50;

							for (let i = 0; i <= numSteps; i++) {
								const t = (i / numSteps) * grainDuration;
								const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * t) / grainDuration));
								gainNode.gain.linearRampToValueAtTime(windowValue, outputTime + t);
							}
						};

						// Schedule grains
						var l = filter_chain.length;
						var t = 0;
						for (var i = 0; i < l; ++i) {
								const offset = t;
								const outputTime = i * synthesisHop;
								//if (offset + grainDuration > fx_buffer.duration) break;
								const grainGain = filter_chain[i];
								let grainSource = temp_source[i];
								grainSource.stop();

								grainSource = audio_ctx.createBufferSource();
								grainGain.gain.setValueAtTime(grainGain.gain.value, now);
								grainGain.gain.cancelScheduledValues(now);

								grainSource.buffer = fx_buffer;
								grainSource.connect(grainGain);
								temp_source[i] = grainSource;

								applyHannWindowFast (grainGain, outputTime + now, grainDuration);

								grainSource.start(now + outputTime, offset, grainDuration);
								t += analysisHop;
						}
						// --
					}
				};
			},

			Speed : function ( val ) {
				var prev_val = 1.0;

				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						var inputNode = audio_ctx.createGain();

						source.playbackRate.value = val;
						source.connect (inputNode);

						// line in to dry mix
						inputNode.connect (destination);

						var filter_chain = [ inputNode ];

						return (filter_chain);
					},

					preview: function (state, source) {
						if (!state) source.playbackRate.value = 1.0;
						else source.playbackRate.value = prev_val;
					},

					update : function ( filter_chain, audio_ctx, val, source ) {
						prev_val = val;
						source.playbackRate.value = val;
					}
				};
			},

			Delay : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						var inputNode = audio_ctx.createGain();
						var outputNode = audio_ctx.createGain();
						var dryGainNode = audio_ctx.createGain();
						var wetGainNode = audio_ctx.createGain();
						var feedbackGainNode = audio_ctx.createGain();
						var delayNode = audio_ctx.createDelay();

						source.connect (inputNode);

						// line in to dry mix
						inputNode.connect (dryGainNode);
						// dry line out
						dryGainNode.connect (outputNode);

						// feedback loop
						delayNode.connect (feedbackGainNode);
						feedbackGainNode.connect (delayNode);

						// line in to wet mix
						inputNode.connect (delayNode);
						// wet out
						delayNode.connect (wetGainNode);

						// wet line out
						wetGainNode.connect (outputNode);
						outputNode.connect (destination);

						var filter_chain = [ inputNode, outputNode, dryGainNode,
							wetGainNode, feedbackGainNode, delayNode ];

						if (!val.delay.length)
							delayNode.delayTime.value = val.delay.val;
						else {
							for (var i = 0; i < val.delay.length; ++i) {
								delayNode.delayTime.linearRampToValueAtTime (val.delay[i].val, val.delay[i].time + audio_ctx.currentTime );
							}
						}

						if (!val.feedback.length)
							feedbackGainNode.gain.value = val.feedback.val;
						else {
							for (var i = 0; i < val.feedback.length; ++i) {
								feedbackGainNode.gain.linearRampToValueAtTime (val.feedback[i].val, val.feedback[i].time + audio_ctx.currentTime );
							}
						}

						if (!val.mix.length) {
							dryGainNode.gain.value = 1 - ((val.mix.val - 0.5) * 2);
							wetGainNode.gain.value = 1 - ((0.5 - val.mix.val) * 2);
						}
						else {
							for (var i = 0; i < val.mix.length; ++i) {
								dryGainNode.gain.linearRampToValueAtTime (1 - ((val.mix[i].val - 0.5) * 2), val.mix[i].time + audio_ctx.currentTime );
								wetGainNode.gain.linearRampToValueAtTime (1 - ((0.5 - val.mix[i].val) * 2), val.mix[i].time + audio_ctx.currentTime );
							}
						}

						return (filter_chain);
					},

					update : function ( filter_chain, audio_ctx, val ) {
						// update filter chain...
						var inputNode = filter_chain[0];
						var outputNode = filter_chain[1];
						var dryGainNode = filter_chain[2];
						var wetGainNode = filter_chain[3];
						var feedbackGainNode = filter_chain[4];
						var delayNode = filter_chain[5];

						if (!val.delay.length)
							delayNode.delayTime.value = val.delay.val;
						else {
							for (var i = 0; i < val.delay.length; ++i) {
								delayNode.delayTime.linearRampToValueAtTime (val.delay[i].val, val.delay[i].time + audio_ctx.currentTime );
							}
						}

						if (!val.feedback.length)
							feedbackGainNode.gain.value = val.feedback.val;
						else {
							for (var i = 0; i < val.feedback.length; ++i) {
								feedbackGainNode.gain.linearRampToValueAtTime (val.feedback[i].val, val.feedback[i].time + audio_ctx.currentTime );
							}
						}

						if (!val.mix.length) {
							dryGainNode.gain.value = 1 - ((val.mix.val - 0.5) * 2);
							wetGainNode.gain.value = 1 - ((0.5 - val.mix.val) * 2);
						}
						else {
							for (var i = 0; i < val.mix.length; ++i) {
								dryGainNode.gain.linearRampToValueAtTime (1 - ((val.mix[i].val - 0.5) * 2), val.mix[i].time + audio_ctx.currentTime );
								wetGainNode.gain.linearRampToValueAtTime (1 - ((0.5 - val.mix[i].val) * 2), val.mix[i].time + audio_ctx.currentTime );
							}
						}
						// ---
					}
				};
			},

			Distortion : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {

						var wave_shaper = audio_ctx.createWaveShaper ();
						// var gain = parseInt (0.5 * 100, 10);
						var compute_dist = function ( val ) {
							var gain = parseInt ( (val / 1) * 100, 10);
							var n_samples = 44100;
							var curve = new Float32Array (n_samples);
							var deg = Math.PI / 180;
							var x;

							for (var i = 0; i < n_samples; ++i ) {
								x = i * 2 / n_samples - 1;
								curve[i] = (3 + gain) * x * 20 * deg / (Math.PI + gain * Math.abs(x));
							}

							return (curve);
						};


						for (var k = 0; k < val.length; ++k)
						{
							var curr = val[k];
							if (curr.length)
							{
								for (var i = 0; i < curr.length; ++i) {
									wave_shaper.curve.linearRampToValueAtTime (compute_dist(curr[i].val), audio_ctx.currentTime + curr[i].time);
								}
							}
							else
							{
								wave_shaper.curve = compute_dist (curr.val);
							}
						}

						source.connect (wave_shaper);
						wave_shaper.connect (destination);

						return (wave_shaper);
					},

					update : function ( filter, audio_ctx, val ) {

						var compute_dist = function ( val ) {
							var gain = parseInt ( (val / 1) * 100, 10);
							var n_samples = 44100;
							var curve = new Float32Array (n_samples);
							var deg = Math.PI / 180;
							var x;

							for (var i = 0; i < n_samples; ++i ) {
								x = i * 2 / n_samples - 1;
								curve[i] = (3 + gain) * x * 20 * deg / (Math.PI + gain * Math.abs(x));
							}

							return (curve);
						};


						for (var k = 0; k < val.length; ++k)
						{
							var curr = val[k];
							if (curr.length)
							{
								for (var i = 0; i < curr.length; ++i) {
									filter.curve.linearRampToValueAtTime (compute_dist(curr[i].val), audio_ctx.currentTime + curr[i].time);
								}
							}
							else
							{
								filter.curve = compute_dist (curr.val);
							}
						}
						// ----
					}
				};
			},

			Reverb : function ( val ) {
				return {
					filter : function ( audio_ctx, destination, source, duration ) {
						// ----
						var inputNode = audio_ctx.createGain();
						var reverbNode = audio_ctx.createConvolver();
						var outputNode = audio_ctx.createGain();
						var wetGainNode = audio_ctx.createGain();
						var dryGainNode = audio_ctx.createGain();

						source.connect (inputNode);

						inputNode.connect (reverbNode);
						reverbNode.connect (wetGainNode);
						inputNode.connect (dryGainNode);
						dryGainNode.connect (outputNode);
						wetGainNode.connect (outputNode);
						outputNode.connect (destination);

						var filter_chain = [ inputNode, outputNode, reverbNode, dryGainNode, wetGainNode ];

						// set defaults
						dryGainNode.gain.value = 1 - ((val.mix - 0.5) * 2);
						wetGainNode.gain.value = 1 - ((0.5 - val.mix) * 2);

						var length = audio_ctx.sampleRate * val.time;
						var impulse = audio_ctx.createBuffer (2, length, audio_ctx.sampleRate);
						var impulseL = impulse.getChannelData(0);
						var impulseR = impulse.getChannelData(1);
						var n, i;

						for (i = 0; i < length; i++) {
							n = val.reverse ? length - i : i;
							impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, val.decay);
							impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, val.decay);
						}
						reverbNode.buffer = impulse;

						return (filter_chain);
					},

					update : function ( filter_chain, audio_ctx, val ) {

						audio_ctx   = wavesurfer.backend.ac;

						var reverbNode = filter_chain[2];
						var dryGainNode = filter_chain[3];
						var wetGainNode = filter_chain[4];

						dryGainNode.gain.value = 1 - ((val.mix - 0.5) * 2);
						wetGainNode.gain.value = 1 - ((0.5 - val.mix) * 2);

						var length = audio_ctx.sampleRate * val.time;
						var impulse = audio_ctx.createBuffer (2, length, audio_ctx.sampleRate);
						var impulseL = impulse.getChannelData(0);
						var impulseR = impulse.getChannelData(1);
						var n, i;

						for (i = 0; i < length; i++) {
							n = val.reverse ? length - i : i;
							impulseL[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, val.decay);
							impulseR[i] = (Math.random() * 2 - 1) * Math.pow(1 - n / length, val.decay);
						}
						reverbNode.buffer = impulse;
					}
				};
			}
		};


		this.FXPreviewUpdate = updatePreview;
		this.FXPreviewStop = stopPreview;
		this.FXPreviewToggle = togglePreview;
		this.FXPreviewInit = initPreview;
		this.FXPreview = previewEffect;
		this.FX = applyEffect;
		this.FXBank = FXBank;

		this.Trim = TrimBuffer;
		this.Copy = CopyBufferSegment;
		this.Insert = InsertSegmentToBuffer;
		this.InsertFloatArrays = InsertFloatArrays;
		this.ReplaceFloatArrays = ReplaceFloatArrays;
		this.Replace = OverwriteBufferWithSegment;
		this.FullReplace = OverwriteBuffer;
		this.MakeSilence = MakeSilenceBuffer;
		this.DownloadFile = DownloadFile;
		this.DownloadFileCancel = DownloadFileCancel;
		// this.ComputeTopFrequencies = findTopFrequencies;
		// this.MatchTopFrequencies= killdTopFrequencies;
		// ---
	};
	
	PKAE._deps.audioutils = AudioUtils;
})( PKAudioEditor );
(function( parent ) {
	'use strict';

	/** parent object, set in the end of the selfcalling function **/
	var parent = parent || window,
		/** instance of File Reader **/
		reader,
		readFile,
		/**
		*	Removes class from element
		*	@param htmlObject	target element
		*	@param	string	"class to be removed"
		**/
		removeClass	= function( el, value ) {
			if ( !el.className ) return false;
			var classes = el.className.split(' '),
				ret = [];
			for( var i = 0, l = classes.length; i < l; ++i )
				if( classes[i] != value )
					ret.push( classes[ i ] );
			el.className = ret.join(' ');
		};
		
	if( !window.FileReader || !document.addEventListener ) {
		throw( "File API not supported" );
		readFile = function(){ throw( "File API not supported" ); };
	}
	else {
		reader = new FileReader();
		readFile = function ( file, callback, method ) {
			/** Error handler (throws error at the console) **/
			reader.onerror = function( e ) {
				var message,
					lut = [ "File not found.", "File coulnot be opened",  
						"File couldnot be uploaded", "Couldnot read File", "File too large" ];
				// http://www.w3.org/TR/FileAPI/#ErrorDescriptions
				throw( lut[ ( e.target.error.code - 1 ) ] );
			},
			/** Success, calling the callback **/
			reader.onloadend = function( e ) {
				callback && callback( e.target.result, file.name );
				reader.onloadend = null;
			};
			
			// the method is specified in the beginning of the file
			reader[ method ]( file );
			return false;
		};
	}
	
	/**
	*	Drag n Drop Files module
	*	@param	HTMLElement, could be the Body
	*	@param	DOMElement/String, if a string is specified then a div will be built and appended to the body
	*			with that String as its id. If a dom element is passed, that will be used instead. This object
	*			acts as an overlay and the file should be droped to this object. If this object is null, then the first argument
	*			will be used as the overlay.
	*	@param	Function,	will be called with the file data, and the filename as its arguments
	*	@param	String,	possible values "text, binarytext, arrabuffer" decides how the file will be read
	*			if let null, defaults to text
	*	@param	String,	class name to be added to the overlay (default is '__fadingIn')
	**/
	parent.dragNDrop = function( body, overlay_id, callback, method, _clss ) {
		var win = window;
		// check to see if we are using a mobile device - no need for dragNdrop in devices
		// that do not support it somehow yet
		if( ( 'ontouchstart' in window ) )
			return "mobile";
		
			/** JS Object, used to define the file-reading method **/
		var method_lut = {
				'text'		 :	'readAsText',
				'binary'	 :	'readAsBinaryText',
				'arrayBuffer':	'readAsArrayBuffer'
			},
			/** class added/removed from overlay object **/
			clss = _clss ? _clss : "__fadingIn",
			method = method ? method_lut[ method ] : 'readAsText',
			/** how many events cast (dragenter/dragleave) **/
			entered = 0,
			/** 
			* DOMElement sink for the drag events 
			* if left unspecified then the body inherits the role
			**/
			overlay = !!overlay_id ? overlay_id : body,
			/**
			*	(void) if the overlay_id specified is a string, then a div with that id is built
			*	and appended to the body. Else the default is used
			**/
			_overlayBuilder = function() {
				if( typeof overlay_id === "string" )
				{
					var tmp = document.createElement( 'div' );
					overlay = document.createElement( 'div' );
					overlay.id = overlay_id;
					
					tmp.innerHTML = "Drag n drop Files!";
					overlay.appendChild( tmp );

					body.appendChild( overlay );
					tmp = null;
				}
			},
			/**
			*	JS Object
			*	The events Object contains various functions that control 
			*	the behavior of the events fired
			**/
			events = {
				/**
				*	(void) Prevents default action and bubbling up
				**/
				silencer	:	function( e ) {
					e.preventDefault();
					e.stopPropagation()
				},
				
				/**
				*	Shows message to drop file
				**/
				onDragEnter	:	function( e ) {
					// overlay.className += " " + clss;
					++entered;
					
					setTimeout(function() {
						if( entered > 1 )
							entered = 1;
					}, 10 )
				},
				/**
				*	Hides the overlay... twist included!
				**/
				onDragLeave	:	function( e ) {
					--entered;
					
					if( entered <= 0 )
					{
						removeClass( overlay, clss );
						entered = 0;
					}
				},
				/**
				* Files dropped
				**/
				onDrop	:	function( e ) {
					// prevent the event from bubbling/firing default
					events.silencer( e );
					
					// Hide the overlay
					removeClass( overlay, clss );
					entered = 0;
					
					/** dropped files. **/
					var files = e.dataTransfer.files,
						len;
					
					// If anything is wrong with the dropped files, exit.
					if(	!files || !files.length )
						return false;
					
					len = files.length;
					while( len-- )
						// iterate files array and load them
						readFile( files[ len ], callback, method );
				}
			};
		
		(function init() {
			//_overlayBuilder();
			// events initialization
			body.parentNode.addEventListener( "dragenter", events.onDragEnter, false );
			body.addEventListener( "dragleave", events.onDragLeave, false );
			body.addEventListener( "dragover", events.silencer, false);
			body.addEventListener( "drop", events.onDrop, false);
			return false;
		})( body );
	};
})( window );
(function ( w, d, PKAE ) {
	'use strict';

	var PKREC = function ( app ) {
		var q = this;

		var media_stream_source = null;
		var audio_stream = null;
		var audio_context = null;
		var script_processor = null;

		var buffer_size = 2048 * 2; // * 2 ?
		var channel_num = 1;
		var channel_num_out = 1;

		var is_active = false;

		var starting_offset = 0;
		var ending_offset = 0;

		var sample_rate = 0;

		var temp_buffers = [];
		var temp_buffer_index = -1;
		var jumps = 1;

		var end_record_func = null;
		var start_record_func = null;

		// temp vars
		var curr_offset = 0;
		var first_skip = 8; // skip first samples to evade the button's click
		var fetchBufferFunction = function( ev ) {

			if (first_skip > 0) {
				--first_skip;
				return ;
			}

			curr_offset += ev.inputBuffer.duration * sample_rate;
			if (ending_offset <= curr_offset)
			{
				ending_offset > 0 && q.stop ();
				return ;
			}

			var float_array = ev.inputBuffer.getChannelData (0).slice (0);
			temp_buffers[ ++temp_buffer_index ]  = float_array;

			if (--jumps === 0)
			{
				requestAnimationFrame(function(){
					jumps = 4;
					app.engine.wavesurfer.DrawTemp ( starting_offset, temp_buffers );
				});
			}
		};

		this.isActive = function () {
			return (is_active);
		};

		this.setEndingOffset = function ( ending_offset_seconds ) {
			ending_offset = ending_offset_seconds; // ####  * 100
		};

		this.start = function ( _at_offset, _end_callback, _start_callback, _sample_rate ) {
			if (is_active) return (false);
			if (!navigator.mediaDevices)
			{
				app.fireEvent ('ErrorRec');
				app.fireEvent ('ShowError', 'No recording device found');
				return (false);
			}

			starting_offset = _at_offset / 1;
			if (isNaN (starting_offset) || !starting_offset) starting_offset = 0;
			curr_offset = starting_offset;

			audio_context = app.engine.wavesurfer.backend.getAudioContext ();
			if (!audio_context)
			{
				app.fireEvent ('ErrorRec');
				app.fireEvent ('ShowError', 'No recording device found');
				return (false);
			}

			if (audio_context.currentTime === 0) {
				app.engine.wavesurfer.backend.source.start (0);
				app.engine.wavesurfer.backend.source.stop (0);
			}

			if (!_sample_rate)
			{
				if (app.engine.wavesurfer.backend.buffer) {
					sample_rate = app.engine.wavesurfer.backend.buffer.sampleRate;
				}
				else {
					sample_rate = audio_context.sampleRate;
				}
			}

			end_record_func = function (offset, buffers, _callback) {
				async function downsampleAudioBuffer(buffers, sourceSampleRate, targetSampleRate) {
					// Step 1: Concatenate the Float32Array chunks
					const totalLength = buffers.reduce((sum, buf) => sum + buf.length, 0);
					const concatenated = new Float32Array(totalLength);
					let offset = 0;
					for (let i = 0; i < buffers.length; i++) {
						concatenated.set(buffers[i], offset);
						offset += buffers[i].length;
					}

					// Step 2: Create an AudioBuffer from the concatenated data at the source sample rate
					// Create a temporary AudioContext to build the AudioBuffer
					const tempCtx = new AudioContext({ sampleRate: sourceSampleRate });
					const audioBuffer = tempCtx.createBuffer(1, totalLength, sourceSampleRate);
					audioBuffer.copyToChannel(concatenated, 0, 0);

					// Release the temporary context if you don't need it anymore
					tempCtx.close();

					// Step 3: Use an OfflineAudioContext to resample the AudioBuffer to the target sample rate
					const duration = audioBuffer.duration;
					const newLength = Math.ceil(duration * targetSampleRate);
					const offlineCtx = new OfflineAudioContext(1, newLength, targetSampleRate);

					const source = offlineCtx.createBufferSource();
					source.buffer = audioBuffer;
					source.connect(offlineCtx.destination);
					source.start(0);

					// Render the resampled AudioBuffer
					const renderedBuffer = await offlineCtx.startRendering();

					// Return the downsampled Float32Array
					return renderedBuffer.getChannelData(0);
				}

				var source_sample_rate = audio_context ? audio_context.sampleRate : 48000;
				if (source_sample_rate === sample_rate) {
					_callback ();
					_end_callback (offset, buffers);	
					return ;
				}

				downsampleAudioBuffer(buffers, source_sample_rate, sample_rate).then(newBuffer => {
					_callback ();
					_end_callback (offset, [newBuffer]);
				}).catch(error => {
					_callback ();
					console.error("Error during downsampling:", error);
				});

				// _end_callback (offset, buffers);
			};
			start_record_func = _start_callback;

			navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function( stream ) {
				audio_stream = stream;
				media_stream_source = audio_context.createMediaStreamSource ( stream );

            	script_processor = audio_context.createScriptProcessor (
                	buffer_size, channel_num, channel_num_out
                );

            	media_stream_source.connect ( script_processor );
            	script_processor.connect ( audio_context.destination );

            	is_active = true;
            	start_record_func && start_record_func ();

            	script_processor.onaudioprocess = fetchBufferFunction;
			}).catch(function(error) {
				app.fireEvent ('ErrorRec');

				if (error && error.message)
				{
					app.fireEvent ('ShowError', error.message);
				}
			});

			return (true);
		};

		this.stop = function ( cancel_recording ) {
			if (!is_active) return ;

			// fire one last callback to clean temp_buffers?
			audio_stream.getTracks().forEach(function (stream) {
				stream.stop ();
			});

			script_processor.onaudioprocess = null;
			media_stream_source.disconnect ();
			script_processor.disconnect ();

			app.engine.wavesurfer.DrawTemp ( null );

			if (temp_buffers.length > 0 && !cancel_recording)
				end_record_func && end_record_func ( starting_offset / sample_rate, temp_buffers, function (){
					is_active = false;
				});
			else
				end_record_func && end_record_func ( null, null, function(){
					is_active = false;
				});

			sample_rate = 0;
			first_skip = 8;
			jumps = 1;
			temp_buffer_index = -1;
			starting_offset = ending_offset = 0;
			temp_buffers = [];
			audio_stream = null; audio_context = null;
			end_record_func = start_record_func = null;
		};
		// ---
	};

	PKAE._deps.rec = PKREC;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
'use strict';

setTimeout(function () {

	PKAudioEditor._deps.Wlc = function () {
			var body_str = '';
			var body_str2 = '';

			if (PKAE.isMobile) {
				change -= 15;
				body_str = 'Tips:<br/>Please make sure your device is not in silent mode. You might need to physically flip the silent switch. '+
				'<img src="phone-switch.jpg" style="max-width:224px;max-height:126px;width:40%;margin: 10px auto; display: block;"/>'+
				'<br/><br/>';
			}
			else {
				body_str = 'Tips:<br/>Please keep in mind that most key shortcuts rely on the <strong>Shift + <u>key</u></strong> combo. (eg Shift+Z for undo, Shift+C copy, Shift+X cut... etc )<br/><br/>';
				body_str2 = 'Check out the codebase on <a href="https://github.com/pkalogiros/audiomass" target="_blank">Github</a><br/><br/>'; // checkout the code on github
			}

			// Welcome to AudioMass,
			var md = new PKSimpleModal({
				title: '<font style="font-size:15px">Welcome to AudioMass</font>',
				ondestroy: function( q ) {
					PKAE.ui.InteractionHandler.on = false;
					PKAE.ui.KeyHandler.removeCallback ('modalTemp');
			},
			body:'<div style="overflow:auto;-webkit-overflow-scrolling:touch;max-width:580px;width:calc(100vw - 40px);max-height:calc(100vh - 340px);min-height:110px;font-size:13px; color:#95c6c6;padding-top:7px;">'+
				'AudioMass is a free, open source, web-based Audio and Waveform Editor.<br />It runs entirely in the browser with no backend and no plugins required!'+
				'<br/><br/><br/>'+
				body_str+
				'You can load any type of audio your browser supports and perform operations such as fade in, cut, trim, change the volume, '+
				'and apply a plethora of audio effects.<br/><br/>'+
				body_str2+
				'</div>',
			setup:function( q ) {
					PKAE.ui.InteractionHandler.checkAndSet ('modal');
					PKAE.ui.KeyHandler.addCallback ('modalTemp', function ( e ) {
						q.Destroy ();
					}, [27]);

					// ------
					var scroll = q.el_body.getElementsByTagName('div')[0];
					scroll.addEventListener ('touchstart', function(e){
						e.stopPropagation ();
					}, false);
					scroll.addEventListener ('touchmove', function(e){
						e.stopPropagation ();
					}, false);

					// ------
				}
			});
			md.Show ();
			document.getElementsByClassName('pk_modal_cancel')[0].innerHTML = '&nbsp; &nbsp; &nbsp; OK &nbsp; &nbsp; &nbsp;';
	};

	var change = 96;
	var exists = w.localStorage && w.localStorage.getItem ('k');

	if (!exists) {
		change = 0;
		w.localStorage && w.localStorage.setItem ('k', 1);
	}

	if ( ((Math.random () * 100) >> 0) < change) return ;
	PKAudioEditor._deps.Wlc ();

}, 320);

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';

	var modal_name = 'modalfx';
	var modal_esc_key = modal_name + 'esc';
	var max_db_val = 35;

	function PK_FX_PGEQ () {
		var q = this;
		var _id = 0;

		var _is_render_scheduled  = false;
		var _is_render_scheduled2 = false;

		q.act = null;
		q.ranges = [];
		q.ui = {};

		this.Callback = function(){};

		this.Init = function ( container ) {
			var q = this;

			q.el = container;
			_make_ui ( q );
			_make_evs ( q );

			q.Render ();
		};

		this.Add = function (type, is_on, freq, gain, qval, coords_x, coords_y) {
			var q = this;

			var new_range = {
				id: (++_id),
				type: type ? type : 'peaking',
				freq: freq || 0,
				gain: gain || 0,
				q: qval || 5,

				// interface
				_on:  is_on,
				_hov: false,
				_el: null,
				_coords: {
					x: coords_x || 0,
					y: coords_y || 0
				},
				_arr:[]
			};

			q.ranges.push (new_range);
			q.ranges.sort (_compare);

			if (q.act) {
				q.act.el.classList.remove ('pk_act');
			}

			q.act = new_range;

			_range_compute_arr (new_range);
			new_range.el = _range_render_el (q, new_range, ' pk_act');

			q.Callback && q.Callback ();

			q.Render ();
		};

		this.Remove = function (range) {
			var q = this;

			var l = q.ranges.length;

			while (l-- > 0) {
				if (q.ranges[l] === range) {
					q.ranges.splice (l, 1); 
					break;
				}
			}

			if (range.el) {
				range.el.parentNode.removeChild (range.el);
				range.el = null;
			}

			if (q.act && q.act === range) {
				q.act = null;
			}

			q.Render ();
		};

		var _fillstyle = '#d9d955';

		var _anim_render = function () {
			_render ( q );
		};

		this.Render = function () {
			var q = this;

			if (_is_render_scheduled) return ;
			_is_render_scheduled = true;

			requestAnimationFrame (_anim_render);
		};

		this.RenderBars = function (_, freq) {
			var q = this;

			if (_is_render_scheduled2) return ;
			_is_render_scheduled2 = true;

			requestAnimationFrame (function () {
				_render_bars ( q, freq );
			});
		};

		var _render_bars = function( q, freq ) {
			_is_render_scheduled2 = false;

			if (!freq) return ;

			var ctx    = q.ui.ctx_bars;
			var canvas = q.ui.canvas_bars;

			var cw = canvas.width;
			var ch = canvas.height;

			// ctx.fillStyle = '#000';
			// ctx.fillRect (0, 0, cw, ch);
			ctx.clearRect (0, 0, cw, ch);

			var bufferLength = 512; // 256
			var max_bars = 117 * 2;
			var barWidth = (cw / max_bars).toFixed(1)/1;
			var barHeight = 0;
			var x = 0;

			// 
			for (var i = 0; i < 117; ++i)
			{
				barHeight = freq[i];

				// map.push ( i * 43 );

				var newheight = ((barHeight / 256) * ch) >> 0;

				ctx.fillRect (x, ch - newheight, barWidth, newheight);
				x += barWidth;// + 1;
			}

			for (var i = 0; i < 117; ++i)
			{
				// (116*3.4)
				barHeight = freq[117 + ((i * 3.34) >> 0)];

				// map.push ( (120 + (i * 3)) * 43 );
				var newheight = ((barHeight / 256) * ch) >> 0;

				ctx.fillRect (x, ch - newheight, barWidth, newheight);
				x += barWidth;// + 1;
			}

//			console.log( map );

			// what if we care for the small bars first
/*
			var steps = (total_freq/bufferLength) >> 0;

			// we care for

			// 256 bars

			// 32
			// 64
			// 125
			// 250
			// 500
			// 1000
			// 2000
			// 4000
			// 8000
			// 16000
			// 20000
			var arr = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 20000];
			var curr = 0;
			var curr_bars = 0;
			var bars_per_entry = (bufferLength / 10) >> 0;

			for (var i = 0; i < bufferLength; ++i) {

				if (++curr_bars < bars_per_entry)
				{

					var ff = arr[ curr ];
					var ff_next = arr[ curr + 1];

					var m = 0;
					for (; m < bufferLength; ++m)
					{
						if (m * steps > ff) {
							--m;
							break;
						}
					}

					barHeight = freq[ m ];

					var newheight = ((barHeight / 256) * ch) >> 0;
					ctx.fillRect (x, ch - newheight, barWidth, newheight);
					x += barWidth;// + 1;
				}
				else
				{
					++curr;
					curr_bars = 0;
				}
			}
*/

//			for (var i = 0; i < bufferLength; ++i) {
//				barHeight = freq[i];
//				var newheight = ((barHeight / 256) * ch) >> 0;

//				ctx.fillRect (x, ch - newheight, barWidth, newheight);
//				x += barWidth;// + 1;
//			}
		};



		var line_arr = new Array (1000);
		var _render = function ( q ) {
			_is_render_scheduled = false;

			var ctx    = q.ui.ctx_eq;
			var canvas = q.ui.canvas_eq;

			var cw = canvas.width;
			var ch = canvas.height;

			var ch_half = ch / 2;

			// --------------------
			ctx.clearRect (0, 0, cw, ch);

			ctx.fillStyle   = _fillstyle;

			if (q.ranges.length === 0)
			{
				ctx.beginPath ();
				ctx.moveTo (0,  ch_half);
				ctx.lineTo (cw, ch_half);
				ctx.stroke ();

				return ;
			}

			// render the line based on the elements
			var first = true;
			var arr = [];
			for (var i = 0; i < total; ++i) {
				arr[i] = 0;
			}

			for (var o = 0; o < q.ranges.length; ++o)
			{
				var curr = q.ranges[ o ];

				if (!curr._on) continue;

				if (first)
				{
					first = false;
					for (var i = 0; i < total; ++i)
					{
						line_arr[i] = curr._arr[i];
					}
				}
				else
				{
					for (var i = 0; i < total; ++i)
					{
						line_arr[i] += curr._arr[i];
					}
				}
				// ---
			}


			if (first)
			{
				ctx.beginPath ();
				ctx.moveTo (0,  ch_half);
				ctx.lineTo (cw, ch_half);
				ctx.stroke ();
			}
			else
			{
				// --
				ctx.beginPath ();
				ctx.moveTo ( 0, ch_half - (line_arr[ 0 ] * (ch_half / max_db_val)) );

				for (var i = 0; i < (total / 4); i += 1) {
					var el = line_arr[ i ];

					var x = (i * 2) * (cw / total);
					var y = ch_half - (el * (ch_half / max_db_val));

					ctx.lineTo ( x, y );
				}

				var hh = 0;
				for (var i = (total / 4); i < total; i += 3) {
					var el = line_arr[ i ];

					hh += 2;

					var x = ((total / 2) + hh) * (cw / total);
					var y = ch_half - (el * (ch_half / max_db_val));

					ctx.lineTo ( x, y );
				}

				ctx.stroke ();
			}
			// ---


			// draw the dots
			var radius = 6;
			for (var o = 0; o < q.ranges.length; ++o)
			{
				var curr = q.ranges[ o ];

				var center_x = curr._coords.x;
				var center_y = curr._coords.y;

				ctx.beginPath ();
				ctx.arc (center_x, center_y, radius, 0, 2 * Math.PI, false);

				if (curr === q.act) {
					ctx.shadowBlur = 24;

					if (curr._on)
						ctx.fillStyle = '#fff';
					else 
						ctx.fillStyle = '#686868';

					ctx.stroke ();
					ctx.fill ();

					ctx.shadowBlur = 0;
					ctx.fillStyle = _fillstyle;
				}
				else if (curr._hov) {

					if (curr._on)
						ctx.fillStyle = 'blue';
					else 
						ctx.fillStyle = 'darkblue';

					ctx.stroke ();
					ctx.fill ();

					ctx.fillStyle = _fillstyle;
				}
				else if (curr._on) {
					ctx.fill ();
				}
				else {
					ctx.fillStyle = '#555';
					ctx.fill ();
					ctx.fillStyle = _fillstyle;
				}
			}

			// ---
		};



		////////////////////////////////////////////
		// helpers
		var _dbncr = null;
		var total_freq = 20000; // 22000
		var total = 1000;
		var jump = (total_freq / total) >> 0;

		function _range_update ( q, range, new_range, compute_coords ) {
			var modified = false;
			var old_val = null;

			for (var key in new_range)
			{
				if (range[key] !== new_range[key])
				{
					modified = true;
					old_val = range[key];
					range[key] = new_range[key];

					if (key === '_on')
					{
						var el = document.getElementById ('pgon' + range.id);
						el.checked = range[key];
					}
					else if (key === 'freq')
					{
						var el = range.el.getElementsByClassName('pk_freq')[0];
						//requestAnimationFrame (function () {
							el.value = range[key];
						//});
					}
					else if (key === 'gain')
					{
						var el = range.el.getElementsByClassName('pk_gain')[0];
						//requestAnimationFrame (function () {
							el.value = range[key];
						//});
					}
					else if (key === 'q')
					{
						var el = range.el.getElementsByClassName('pk_q')[0];
						//requestAnimationFrame (function () {
							el.value = range[key];
						//});
					}
					else if (key === 'type')
					{
						// -----
						var el = range.el.getElementsByTagName('select')[0];
						if (range[key] === 'peaking') el.options[0].selected = true;
						else if (range[key] === 'lowpass') el.options[1].selected = true;
						else if (range[key] === 'highpass') el.options[2].selected = true;

						_range_compute_arr (range);
						q.ranges.sort (_compare);
					}
					// ---
				}
			}

			if (modified)
			{
				if (compute_coords)
				{
					// compute coords of the canvas
					var canvas = q.ui.canvas_eq;
					var cw = canvas.width;
					var ch = canvas.height;

					var tmp_x = 0;
					if (range.freq <= 5000) {
						range._coords.x = ((range.freq / 5000) * (cw / 2) ).toFixed(1)/1;
					} else {
						range._coords.x = ((cw / 2) + (((range.freq - 5000) / 15000) * (cw / 2))).toFixed(1)/1;
					}

					// range._coords.x = ((range.freq / total_freq) * cw).toFixed(1)/1;

					if (range.type === 'peaking')
						range._coords.y = ((1.0 - ((range.gain + max_db_val) / (max_db_val * 2))) * ch).toFixed(1)/1;
					else
						range._coords.y = (ch / 2).toFixed(1)/1;
				}

				if (_dbncr) {
					clearTimeout (_dbncr);
				}

				_dbncr = setTimeout (function () {
					q.Callback ();
					_dbncr = null;
				}, 38);

				q.Render ();
			}
			// ---
		};

		function _ease (t) { return t*t*t*t*t };
		function _ease_out (t) { return t*t*t*t  };

		function _range_compute_arr ( range ) {
			var arr = [];

			for (var i = 0; i < total; ++i) {
				arr[i] = 0;
			}

			range._arr = arr;

			// -------------
			var rounding      = total_freq * (2 / range.q);
			var half_rounding = (rounding / jump) >> 0;

			if (range.type === 'peaking')
			{
					var edge_left  = range.freq - (rounding / 2);
					var edge_right = range.freq + (rounding / 2);

					var start = (edge_left  / jump) >> 0;
					var end   = (edge_right / jump) >> 0;

					var j = 0;
					for (var i = start; i < end; ++i)
					{
						var ii = (i * jump);
						if (ii < range.freq)
						{
							++j;
							arr[i] += _ease (j / (half_rounding / 2)) * range.gain;
						}
						else
						{
							--j;
							arr[i] += _ease (j / (half_rounding / 2)) * range.gain;
						}
					}

					return ;
			}

			if (range.type === 'highpass')
			{
					var edge_left = range.freq - rounding;
					var start     = (edge_left  / jump) >> 0;
					var end       = (range.freq / jump) >> 0;

					for (var i = 0; i < start; ++i)
					{
						arr[i] = -max_db_val;
					}

					// todo improve this!!!
					var j = half_rounding;
					for (var i = start; i < end; ++i)
					{
						--j;
						arr[i] -= _ease_out (j / half_rounding) * max_db_val;
					}

					return ;
			}

			if (range.type === 'lowpass')
			{
					var edge_right = range.freq + rounding;
					var start      = (range.freq  / jump) >> 0;
					var end        = (edge_right  / jump) >> 0;

					for (var i = end; i < total; ++i)
					{
						arr[i] = -max_db_val;
					}

					// todo improve this!!!
					var j = 0;
					for (var i = start; i < end; ++i)
					{
						++j;
						arr[i] -= _ease_out (j / half_rounding) * max_db_val;
					}

					return ;
			}

			// -------------
		}

		function _make_ui ( q ) {
			var el_drawer = d.createElement ('div');
			el_drawer.className = 'pk_row';

			var canvas_bars = d.createElement ('canvas');
			var canvas_eq   = d.createElement ('canvas');

			canvas_bars.className = 'pk_peq2';
			canvas_eq.className   = 'pk_peq';

			canvas_bars.width  = 450 / 2;
			canvas_bars.height = 224 / 2;

			canvas_eq.width  = 450;
			canvas_eq.height = 225;

			var ctx_bars = canvas_bars.getContext ('2d', {alpha:true, antialias:false});
			var ctx_eq   = canvas_eq.getContext ('2d', {alpha:true, antialias:false});

			ctx_bars.fillStyle =  '#365457'; // '#486a6e';

			// ctx_eq.lineWidth = 2;
			ctx_eq.strokeStyle = '#FF0000';
			ctx_eq.shadowColor = '#FF2222';
			ctx_eq.shadowBlur  = 0;


			// render the decibel and the frequencies
			var marker_freqs = d.createElement ('div');
			marker_freqs.className = 'pk_peq3 pk_noselect';
			marker_freqs.innerHTML = '<span>32</span>' +
//			'<span>32</span>' +
//			'<span>64</span>' +
//			'<span>128</span>' +
//			'<span>250</span>' +
//			'<span>500</span>' +
			'<span style="position:absolute;left:3.5%">500<span></span></span>' +
			'<span style="position:absolute;left:9%">1k<span></span></span>' +
			'<span style="position:absolute;left:19%">2k<span></span></span>' +
			'<span style="position:absolute;left:38%">4k<span></span></span>' +
			'<span style="position:absolute;left:50%">5k<span></span></span>' +
			'<span style="position:absolute;left:59%">8k<span></span></span>' +
			'<span style="position:absolute;left:72%">12k<span></span></span>' +
			'<span style="position:absolute;left:85%">16k<span></span></span>' +
			'<span style="float:right">20k</span>';


			var marker_dbs = d.createElement ('div');
			marker_dbs.className = 'pk_peq4 pk_noselect';
			marker_dbs.innerHTML = '<span style="top:0">35</span>' +
			'<span style="top:10%">28<span></span></span>' +
			'<span style="top:20%">21<span></span></span>' +
			'<span style="top:30%">14<span></span></span>' +
			'<span style="top:40%">7<span></span></span>' +			
			'<span>0<span></span></span>' +
			'<span style="top:60%">-7<span></span></span>' +
			'<span style="top:70%">-14<span></span></span>' +
			'<span style="top:80%">-21<span></span></span>' +
			'<span style="top:90%">-28<span></span></span>' +			
			'<span style="top:100%">35</span>';

			el_drawer.appendChild ( canvas_bars );
			el_drawer.appendChild ( canvas_eq );
			el_drawer.appendChild ( marker_freqs );
			el_drawer.appendChild ( marker_dbs );

			q.el.appendChild ( el_drawer );

			// element's area
			var el_list = document.createElement ('div');
			el_list.className = 'pk_row pk_noselect pk_pglst';

			el_list.innerHTML = '<div class="pk_pgeq_els">' +
				'<span class="pk_txlft"> #</span><span>type</span><span>gain</span><span>freq</span><span>Q</span>' +
			'</div>';

			q.el.appendChild ( el_list );

			q.ui.ctx_bars = ctx_bars;
			q.ui.ctx_eq   = ctx_eq;

			q.ui.canvas_bars = canvas_bars;
			q.ui.canvas_eq   = canvas_eq;
			q.ui.el_list     = el_list;
		}

		function _make_evs ( q ) {
			var ctx    = q.ui.ctx_eq;
			var canvas = q.ui.canvas_eq;

			var click_time = 0;
			var is_dragging = false;


			var _move = function ( e ) {
				if (!is_dragging || !q.act) return ;

				var ex = 0;
				var ey = 0;

				if (e.touches) {
					if (e.touches.length > 1) { return ; }

					ex = e.touches[0].clientX;
					ey = e.touches[0].clientY;
				} else {
					ex = e.clientX;
					ey = e.clientY;
				}

				var bounds = canvas.getBoundingClientRect ();
				var cw = canvas.width;
				var ch = canvas.height;

				var posx = ex - bounds.left;
				var posy = ey - bounds.top;

				var rel_x = posx / cw;
				var rel_y = posy / ch;

				q.act._coords.x = posx;
				q.act._coords.y = posy;

				// up until half it's 0 - 5000, second half 5000 -> 2200
				var freq = 0;

				if (rel_x <= 0.5) {
					freq = (5000 * (rel_x * 2)) >> 0
				} else {
					freq = 5000 + ((((rel_x - 0.5) * 2) * 15000) >> 0);
				}

//				var freq = (rel_x * (total_freq) + 0) >> 0; // + 16 (min freq)
				var gain = (((rel_y - 0.5) * -2) * max_db_val).toFixed (2) / 1;

				_range_update (q, q.act, {
					'freq': freq,
					'gain': gain
				});
				_range_compute_arr (q.act);
			};

			var _end = function ( e ) {
				is_dragging = false;

				canvas.removeEventListener ('mousemove', _move);
				canvas.removeEventListener ('mouseup', _end);

				canvas.removeEventListener ('touchmove', _move);
				canvas.removeEventListener ('touchup', _end);
			};

			var mdown = function ( e ) {
					var unchecked = !!q.act;

					if (q.ranges.length === 0)
					{
						if (unchecked) q.Render ();
						return ;
					}

					var bounds = canvas.getBoundingClientRect ();
					var cw = canvas.width;
					var ch = canvas.height;

					var posx = e.clientX - bounds.left;
					var posy = e.clientY - bounds.top;

					var dist_x = e.is_touch ? 20 : 10;
					var dist_y = e.is_touch ? 20 : 9;

					for (var o = 0; o < q.ranges.length; ++o)
					{
						var curr = q.ranges[ o ];

						if ( Math.abs (curr._coords.x - posx) < dist_x && Math.abs (curr._coords.y - posy) < dist_y)
						{
							if (unchecked) {
								q.act.el.classList.remove ('pk_act');
							}

							q.act = curr;
							q.act.el.classList.add ('pk_act');

							is_dragging = true;

							q.Render ();

							// check if we are targetting a circle

							if (!e.is_touch)
							{
								canvas.addEventListener ('mousemove', _move, false);
								canvas.addEventListener ('mouseup', _end, false);
							}
							else
							{
								e.ev.preventDefault  ();
								e.ev.stopPropagation ();

								canvas.addEventListener ('touchmove', _move, false);
								canvas.addEventListener ('touchup', _end, false);	
							}

							return ;
						}
						// ---
					}

					if (unchecked) {
						q.act.el.classList.remove ('pk_act');
						// un-highlight
						q.act = null;

						q.Render ();
					}

					// ----
			};

			canvas.addEventListener ('mousedown', mdown, false);


			canvas.addEventListener ('touchstart', function ( e ) {
				if (e.touches.length > 1) {
					e.preventDefault ();
					e.stopPropagation ();

					return ;
				}

				var ev = {
					clientX  : e.touches[0].clientX,
					clientY  : e.touches[0].clientY,
					is_touch : true,
					ev       : e
				};

				mdown ( ev );
			});


			canvas.addEventListener ('click', function ( e ) {
				if (e.timeStamp - click_time < 260)
				{
						var bounds = canvas.getBoundingClientRect ();
						var cw = canvas.width;
						var ch = canvas.height;
						var posx = e.clientX - bounds.left;
						var posy = e.clientY - bounds.top;

						var rel_x = posx / cw;
						var rel_y = posy / ch;

						var freq = 0;
						if (rel_x <= 0.5) {
							freq = (5000 * (rel_x * 2)) >> 0
						} else {
							freq = 5000 + ((((rel_x - 0.5) * 2) * 15000) >> 0);
						}

						// var freq = (rel_x * (total_freq) + 0) >> 0; // + 16 (min freq)
						var gain = (((rel_y - 0.5) * -2) * max_db_val).toFixed(2)/1;
						var qval = 5;
						var type = 'peaking';

						q.Add (type, true, freq, gain, qval, posx, posy);
				}

				click_time = e.timeStamp;
			}, false);

			// ---

		}

		function _range_render_el ( q, range, clss ) {
			var el_list = q.ui.el_list;

			var el = d.createElement ('div');
			el.className = 'pk_pgeq_els' + (clss ? clss : '');
			el.setAttribute ('data-id', range.id);

			el.addEventListener ('click', function ( e ) {
				if (!range.el) return ;

				if (range !== q.act)
				{
					if (q.act)
					{
						q.act.el.classList.remove ('pk_act');
					}

					q.act = range;
					q.act.el.classList.add ('pk_act');

					q.Render ();
				}
			}, false);

			el.addEventListener ('mouseover', function ( e ) {
				if (!range.el) return ;

				if (!range._hov)
				{
					range._hov = true;
					q.Render ();
				}
			}, false);

			el.addEventListener ('mouseleave', function ( e ) {
				if (!range.el) return ;

				if (range._hov)
				{
					range._hov = false;
					q.Render ();
				}
			}, false);

			// # & on or off
			var chckd = range._on ? 'checked' : '';
			var num = '<i>' + range.id + '</i>';
			var el_num = d.createElement ('div');
			el_num.className = 'pk_txlft';
			el_num.innerHTML = num + 
				'<input type="checkbox" id="pgon' + range.id + '" class="pk_check" name="onoff" ' + chckd +'>' +
				'<label for="pgon' + range.id + '">ON</label>';

			el_num.getElementsByTagName('input')[0].onchange = function ( e ) {
				_range_update (q, range, {'_on': !!this.checked});

				var lbl = this.parentNode.getElementsByTagName('label')[0];
				lbl.innerHTML = this.checked ? 'ON' : 'OFF';
			};
			el.appendChild (el_num);

			// type
			var sel1 = range.type === 'lowpass' ? 'selected' : '';
			var sel2 = range.type === 'highpass' ? 'selected' : '';
			var el_type = d.createElement ('div');
			el_type.innerHTML = '<select><option>peaking</option><option ' + sel1 + '>lowpass</option><option ' + sel2 + '>highpass</option></select>';

			el_type.getElementsByTagName('select')[0].onchange = function ( e ) {
				var val = this.options[this.selectedIndex].value;

				if (val === 'peaking') {
					el.classList.remove ('pk_dis');
				} else {
					el.classList.add ('pk_dis');
				}

				_range_update (q, range, {'type': val}, 1);
			};

			el.appendChild (el_type);

			// gain
			var el_gain = d.createElement ('div');
			el_gain.innerHTML = '<input type="number" class="pk_val pk_gain" min="-35" max="35" value="' + range.gain + '">';

			el_gain.getElementsByClassName('pk_gain')[0].onchange = function ( e ) {
				if (!this.value) {
					this.value = 0;
				}

				if (this.hasAttribute ('data-open')) {
					this.parentNode.getElementsByClassName('pk_horiz')[0].value = this.value;
				}

				_range_update (q, range, {'gain': this.value / 1}, 1);
				_range_compute_arr (range);
			};
			el_gain.getElementsByClassName('pk_gain')[0].onfocus = function ( e ) {
				if (this.hasAttribute ('data-open')) return ;

				var self = this;
				var parent = this.parentNode;
				var bar = document.createElement ('div');
				bar.className = 'pk_pgeq_freq pk_gain';
				bar.innerHTML = '<div class="pk_arr"></div><input type="range" min="-35" max="35" class="pk_horiz pk_gain" step="0.1" value="' + range.gain + '">';

				bar.getElementsByClassName('pk_horiz')[0].oninput = function ( e ) {
					if (self.value != this.value) {
						self.value = this.value;
						self.onchange ();
					}
				};

				parent.appendChild (bar);
				this.setAttribute('data-open', '1');

				var down = function ( e ) {
					if ( !e.target.classList.contains ('pk_gain') || (e.target.type === self.type && e.target !== self) )
					{
						self.removeAttribute ('data-open');
						parent.removeChild (bar);
						q.el.removeEventListener ('mousedown', down);
						return ;
					}
				};
				q.el.addEventListener ('mousedown', down, false);
			};
			el.appendChild (el_gain);

			// freq
			var el_freq = d.createElement ('div');
			el_freq.innerHTML = '<input type="number" class="pk_val pk_freq" min="16" max="20000" value="' + range.freq + '">';
			el_freq.getElementsByClassName('pk_freq')[0].onchange = function ( e ) {
				if (!this.value) {
					this.value = 500;
				}

				if (this.hasAttribute ('data-open')) {
					this.parentNode.getElementsByClassName('pk_horiz')[0].value = this.value;
				}

				_range_update (q, range, {'freq': this.value / 1}, 1);
				_range_compute_arr (range);
			};

			el_freq.getElementsByClassName('pk_freq')[0].onfocus = function ( e ) {
				if (this.hasAttribute ('data-open')) return ;

				var self = this;
				var parent = this.parentNode;
				var bar = document.createElement ('div');
				bar.className = 'pk_pgeq_freq pk_freq';
				bar.innerHTML = '<div class="pk_arr"></div><input type="range" min="16" max="20000" class="pk_horiz pk_freq" step="1" value="' + range.freq + '">';

				bar.getElementsByClassName('pk_horiz')[0].oninput = function ( e ) {
					if (self.value != this.value) {
						self.value = this.value;
						self.onchange ();
					}
				};

				parent.appendChild (bar);
				this.setAttribute('data-open', '1');

				var down = function ( e ) {
					if ( !e.target.classList.contains ('pk_freq') || (e.target.type === self.type && e.target !== self) )
					{
						self.removeAttribute ('data-open');
						parent.removeChild (bar);
						q.el.removeEventListener ('mousedown', down);
					}
				};
				q.el.addEventListener ('mousedown', down, false);
			};

			el.appendChild (el_freq);

			// q
			var el_q = d.createElement ('div');
			el_q.innerHTML = '<input type="number" class="pk_val pk_q" min="1" max="50" value="' + range.q + '">';
			el_q.getElementsByClassName('pk_q')[0].onchange = function ( e ) {

				if (!this.value) {
					this.value = 1;
				}

				if (this.hasAttribute ('data-open')) {
					this.parentNode.getElementsByClassName('pk_horiz')[0].value = this.value;
				}

				_range_update (q, range, {'q': this.value / 1}, 1);
				_range_compute_arr (range);
			};

			el_q.getElementsByClassName('pk_q')[0].onfocus = function ( e ) {
				if (this.hasAttribute ('data-open')) return ;

				var self = this;
				var parent = this.parentNode;
				var bar = document.createElement ('div');
				bar.className = 'pk_pgeq_freq pk_q';
				bar.innerHTML = '<div class="pk_arr"></div><input type="range" min="1" max="50" class="pk_horiz pk_q" step="0.1" value="' + range.q + '">';

				bar.getElementsByClassName('pk_horiz')[0].oninput = function ( e ) {
					if (self.value != this.value) {
						self.value = this.value;
						self.onchange ();
					}
				};

				parent.appendChild (bar);
				this.setAttribute('data-open', '1');

				var down = function ( e ) {
					if ( !e.target.classList.contains ('pk_q') || (e.target.type === self.type && e.target !== self) )
					{
						self.removeAttribute ('data-open');
						parent.removeChild (bar);
						q.el.removeEventListener ('mousedown', down);
					}
				};
				q.el.addEventListener ('mousedown', down, false);
			};
			el.appendChild (el_q);

			// delete
			var el_del = d.createElement ('div');
			el_del.className = 'pk_del';
			el_del.innerHTML = '<a style="cursor:pointer">DELETE</a>';
			el_del.getElementsByTagName('a')[0].onclick = function ( e ) {
				q.Remove (range);
			};

			el.appendChild (el_del);

			// ----------------------
			el_list.appendChild (el);

			return (el);
		}

		function _compare ( a, b ) {
				if (a.type === 'peaking' && b.type !== 'peaking') return -1;
				if (b.type === 'peaking' && a.type !== 'peaking') return 1;

				return 0;
		}
		// ---
	};


	var ParagraphicModal = function ( app, custom_presets ) {

		app.fireEvent ('RequestSelect', 1);

		var filter_id = 'paragraphic_eq';

		// -------
		var PGEQ = new PK_FX_PGEQ ();
		var DrawBars = function (_, freq) {
			PGEQ.RenderBars (_, freq);
		};
		var updateFilter = function () {
			if (!PGEQ) return ;

			var val = [];
			var ranges = PGEQ.ranges;
			  
			for (var i = 0; i < ranges.length; ++i)
			{
				var range = ranges [ i ];
				if (range._on)
				{
					val.push ({
						'type' : range.type,
						'freq' : range.freq,
						'val'  : range.gain,
						'q'    : range.q
					});
				}
			}
			return (val);
		};

		var x = new PKAudioFXModal ({
			id: filter_id,
			title: 'Paragraphic EQ',

			ondestroy: function ( q ) {
				app.stopListeningFor ('DidAudioProcess', DrawBars);
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);

				PGEQ = null;
			},

			preview: function ( q ) {
				app.fireEvent ('RequestActionFX_PREVIEW_PARAMEQ', updateFilter ());
			},

			body: '',
			
			presets:[
					{name:'Old Telephone',val:'1,highpass,0,5800,5.8,1,lowpass,0,7060,5'}
			],

			custom_pres:custom_presets.Get (filter_id),

			onpreset: function ( val ) {
				var l = PGEQ.ranges.length;
				while (l-- > 0) {
					PGEQ.Remove (PGEQ.ranges[l]);
				}

				var canvas = PGEQ.ui.canvas_eq;
				var cw = canvas.width;
				var ch = canvas.height;

				var list = val.split(',');
				var len = list.length;
				var els = (len / 5) >> 0;

				for (var j = 0; j < els; ++j)
				{
					var curr = [];
					var offset = j * 5;

					curr[0] = !!(list[ offset + 0 ] / 1);
					curr[1] = list[ offset + 1 ];
					curr[2] = list[ offset + 2 ] / 1;
					curr[3] = list[ offset + 3 ] / 1;
					curr[4] = list[ offset + 4 ] / 1;

					var x = 0;
					var y = 0;

					if (curr[3] < 5000) {
						x = (curr[3] / 5000) * (cw / 2);
					} else {
						x = ((cw / 2) + (((curr[3] - 5000) / 15000) * (cw / 2))).toFixed(1)/1;
					}

					if (curr[1] === 'peaking')
						y = ((1.0 - (((curr[2]/1) + max_db_val) / (max_db_val * 2))) * ch).toFixed(1)/1;
					else
						y = (ch / 2).toFixed(1)/1;

					// (type, is_on, freq, gain, qval, coords_x, coords_y)
					PGEQ.Add (curr[1], !!curr[0], curr[3]/1, curr[2]/1, curr[4]/1, x, y);
				}
			},

			buttons: [{
				title:'Apply EQ',
				clss:'pk_modal_a_accpt',
				callback: function( q ) {

					app.fireEvent ('RequestActionFX_PARAMEQ', updateFilter ());
					q.Destroy ();
				}
			}],

			setup:function( q ) {
					PGEQ.Init ( q.el_body );

					PGEQ.Callback = function () {
						app.fireEvent ('RequestActionFX_UPDATE_PREVIEW', updateFilter ());
					};

					app.listenFor ('DidAudioProcess', DrawBars);

					app.fireEvent ('RequestPause');
					app.ui.InteractionHandler.checkAndSet (modal_name);
					app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
						if (!app.ui.InteractionHandler.check (modal_name)) return ;
						q.Destroy ();
					}, [27]);
			}
		}, app);

		x.Show ();
	};

	PKAudioEditor._deps.FxEQ = ParagraphicModal;








	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	function getOfflineAudioContext (channels, sampleRate, duration) {
		return new (window.OfflineAudioContext ||
				window.webkitOfflineAudioContext)(channels, duration, sampleRate);
	};
	function _normalize_array (data) {
		var new_array = [];
		for (var i = 0; i < data.length; ++i) {
			new_array.push ( Math.abs (Math.round ((data[i + 1] - data[i]) * 1000)) );
		}

		return (new_array);
	};

	function _normalize_array2 (data) {
		var new_array = [];
		for (var i = 0; i < data.length; ++i) {
			new_array.push ( Math.round (Math.abs (data[i] * 1000)) );
		}

		return (new_array);
	};

	function _group_rhythm ( data, diff_arr ) {
 			if (diff_arr.length <= 1) return ;

			var peak_median = 0;
			for (var i = 0; i < data.length; ++i) {
				peak_median += data[i];
			}

			peak_median /= diff_arr.length;
			peak_median -= peak_median * 0.2;

			var diff_median = 0;
			for (var i = 0; i < diff_arr.length; ++i) {
				diff_median += diff_arr[i];
			}

			diff_median /= diff_arr.length;
			if (diff_median > 1) diff_median -= (diff_median * 0.2);

			var existing = 0;
			for (var i = 0; i < diff_arr.length; ++i) {
				if (diff_arr[i] <= diff_median) continue;
			 	++existing;
			}

			// console.log (" DIFF MEDIAN IS ", diff_median, "    and total beats: ", existing, "  out of: ", diff_arr.length);
			// clean-up the drums array - based on the median.
			// console.log ( JSON.stringify( data ) );
			// console.log ("----------");

			for (var i = 0, j = 0; i < data.length; ++i)
			{
				if (data[i] !== 0) {

					if (diff_arr[j] && diff_arr[j] < diff_median) {

						if (data[i] > peak_median && diff_arr[j] > (diff_median * 0.6)){
							//console.log ( 'ZEROEDC NOOOOT ', i, '    ',  data[i], ' with median ', peak_median , '  but diff was  ', diff_arr[j],  '   yet. ',  diff_median );
						}
						else {
							//console.log ( 'ZEROEDC ', i, '    ',  data[i], ' with median ', peak_median , '  but diff was  ', diff_arr[j],  '   yet. ',  diff_median );
							data[i] = 0;
						}
					}

					++j;
				}
				// ----
			}

			// console.log( data );
			window.final_arr = data;

			// console.log ( JSON.stringify( data ) );

			// now count distance between peaks
			var distances = {};
			var unique_distances = [];
			var first_found = 0;
			var is_first = true;
			for (var i = 0; i < data.length - 1; ++i) // #### do not litter the last data
			{
				if (data[i] === 0) {
					++first_found;
					continue;
				}

				//if (first_found < 1 && !is_first) {
				//	continue;
				//}

				if (is_first) {
					is_first = false;
				}

				first_found = 0;

				var own = [];
				unique_distances.push (own);

				// console.log ('----------------------------------');
				// console.log ('COMPUTING DISTANCE OF ' + i + '    value ' + data[i] );

				var interval = 0;
				var total = 12;
				var last_found = 0;
				for (var j = i + 1; j < 1000; ++j) {
					if (data[j] === 0) { ++interval; ++last_found; continue; }
					else if (!data[j]) { break; }

					if (last_found < 0) {
						continue;
					}
					last_found = 0;

					if (--total === 0) break;

					own.push (interval);

					// if it exists, immediately reach out for the next one.
					if (!distances[interval]) distances[interval] = 0;
					distances[interval] += 1;

					// console.log ('distance with index ' + j + '    value ' + data[j] + '    is ' + interval );
				}
				// break;
			}

			console.log(unique_distances);

			// grab only the big peaks.

			function getmax (a) {
				var m = -Infinity,
				i = 0,
				n = a.length;

				for (; i != n; ++i) {
					if (a[i] > m) {
						m = a[i];
					}
				}
				return m;
			}

			function getmin (a) {
				var m = Infinity,
				i = 0,
				n = a.length;

				for (; i != n; ++i) {
					if (a[i] !== 0 && a[i] < m) {
						m = a[i];
					}
				}
				return m;
			}

			var max = getmax (data);
			var min = getmin (data);
			var count = 0;
			var threshold = Math.round ((max - min) * 0.3);

			var velocities = [];
			for (var i = 0; i < data.length; ++i) {
				if (data[i] === 0) continue;

				if (data[i] >= (max - threshold)) {
					velocities.push (3);
				}
				else if (data[i] >= (max - (threshold * 2))) {
					velocities.push (2);
				}
				else if (data[i] >= (max - (threshold * 3))) {
					velocities.push (1);
				}
				else {
					velocities.push (0);
				}
			}


			return ([distances, velocities]);
	};

	var TempoToolsModal = function ( app ) {
		app.fireEvent ('RequestSelect', 1);
		var filter_id = 'tempo_tools';
		var act_index = 1;
		var act_tool  = null;

		// ------
		var TempoMetro = function ( app, modal ) {
			var q = this;
			q.app = app;

			var bpm = 120;
			var tick = null;
			var count = 0;
			var time = ((60.0 / bpm) * 1000) >> 0;
			var audioContext = null; // new AudioContext();
			var osc = null;
			var amp = null;
			var ready = false;
			var volume = 0.5;
			var accentuate = true;

			var DidStopPlay = null;
			var DidPlay = null;
			var MetronomeAct = null;
			var MetronomeInAct = null;

			q.Init = function ( container ) {
				var q = this;

				q.el = container;

				_make_ui ( q );
				_make_evs ( q );
			};

			q.Destroy = function () {
				q.app.stopListeningFor ('DidStopPlay', DidStopPlay);
				q.app.stopListeningFor ('DidPlay', DidPlay);
				q.app.stopListeningFor ('DidStartMetro', MetronomeAct);
				q.app.stopListeningFor ('DidStopMetro', MetronomeInAct);

				DidStopPlay = null;
				DidPlay = null;
				MetronomeAct = null;
				MetronomeInAct = null;

				if (ready) {
					if (tick) {
						clearTimeout (tick);
						tick = null;
					}

					if (audioContext) {
						var now = audioContext.currentTime;
						osc.stop (now);

						amp.disconnect ();
						osc.disconnect ();

						audioContext = null;

						ready = false;
					}
				}

				if (q.body) {
					q.body.parentNode.removeChild ( q.body );
					q.body = null;
				}

				q.app = null;
			};

			function _make_ui ( q ) {
				var el_drawer = d.createElement ('div');
				el_drawer.className = 'pk_row';

				el_drawer.innerHTML = '<div class="pk_row">'+
					'<label>BPM</label>'+
					'<input type="range" min="20" max="300" class="pk_horiz" step="1" value="120" />'+
					'<span class="pk_val">120</span>'+
					'</div>'+

					'<div class="pk_row">'+
					'<label>Volume</label>'+
					'<input type="range" min="0.0" max="1.0" class="pk_horiz" step="0.1" value="0.5" />'+
					'<span class="pk_val">50%</span>'+
					'</div>'+

					'<div class="pk_row">'+
			    	'<input type="checkbox" id="xxcjgs" class="pk_check" checked name="metroAccent">'+
					'<label for="xxcjgs">Accentuate metronome click</label></div>' + 

					'<div class="pk_row">'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Metronome</a>'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Play Track</a>'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Play Both</a>'+
					'</div>';

				q.body = el_drawer;
				q.el.appendChild ( el_drawer );
			};

			function _make_evs ( q ) {
				  var range = q.body.getElementsByClassName('pk_horiz')[0];
				  var span  = q.body.getElementsByClassName('pk_val')[0];

				  var range2 = q.body.getElementsByClassName('pk_horiz')[1];
				  var span2  = q.body.getElementsByClassName('pk_val')[1];

				  var checkbox = q.body.getElementsByClassName('pk_check')[0];

				  range.oninput = function() {
				  	bpm = (range.value/1);
					span.innerHTML = bpm;

					time = ((60.0 / bpm) * 1000) >> 0;
				  };

				  range2.oninput = function() {
				  	var val = (range2.value/1);
				  	volume = val;

					span2.innerHTML = ((val*100) >> 0) + '%';
				  };

				  checkbox.oninput = function() {
				  	accentuate = checkbox.checked;
				  };

				var metronome_btn = q.body.getElementsByClassName ('pk_modal_a_bottom')[0];
				var play_btn      = q.body.getElementsByClassName ('pk_modal_a_bottom')[1];
				var both_btn      = q.body.getElementsByClassName ('pk_modal_a_bottom')[2];

				metronome_btn.onclick = function () {
					if (tick) {
						clearTimeout (tick);
						tick = null;
						count = 0;

						q.app.fireEvent ('DidStopMetro');
						return ;
					}

					var play = function () {
						tick = setTimeout (function() {
							if (!tick) return ;

							if (++count % 4 === 0)
								_metronome (1);
							else
								_metronome (0);

							play ();
						}, time);
					};

					count = 0;
					if (!ready) _prepare ();

					q.app.fireEvent ('DidStartMetro');

					_metronome (1);
					play ();
				};

				MetronomeInAct = function() {
					metronome_btn.classList.remove ('pk_act');
				};
				MetronomeAct = function() {
					metronome_btn.classList.add ('pk_act');
				};
				q.app.listenFor ('DidStartMetro', MetronomeAct);
				q.app.listenFor ('DidStopMetro', MetronomeInAct);

				play_btn.onclick = function () {
					if (PKAudioEditor.engine.wavesurfer.isPlaying()) {
						q.app.fireEvent ('RequestStop');
					}
					else {
						q.app.fireEvent ('RequestPlay');
					}
				};
				if (!PKAudioEditor.engine.wavesurfer.isReady)
				{
					play_btn.className += ' pk_inact';
					both_btn.className += ' pk_inact';
				}

				if (PKAudioEditor.engine.wavesurfer.isPlaying()) {
					play_btn.className += ' pk_act';
				}

				DidStopPlay = function() {
					play_btn.classList.remove ('pk_act');
					play_btn.innerText = 'Play Track';
				};
				DidPlay = function() {
					play_btn.classList.add ('pk_act');
					play_btn.innerText = 'Stop Track';
				};
				q.app.listenFor ('DidStopPlay', DidStopPlay);
				q.app.listenFor ('DidPlay', DidPlay);

				both_btn.onclick = function () {
					if (tick) metronome_btn.onclick ();
					if (PKAudioEditor.engine.wavesurfer.isPlaying()) play_btn.onclick ();

					setTimeout(function() {
						if (!tick && !PKAudioEditor.engine.wavesurfer.isPlaying())
						{
							play_btn.onclick ();
							setTimeout(function(){
								metronome_btn.onclick ();
							},0);
						}
					},66);
				};
			};

			function _metronome ( type ) {
				if (type === 1 && accentuate) {
					osc.frequency.value = 880.0;
				} else {
					osc.frequency.value = 440.0;
				}

				amp.gain.setValueAtTime (amp.gain.value, audioContext.currentTime);
				amp.gain.linearRampToValueAtTime (volume, audioContext.currentTime + 0.01);
				amp.gain.linearRampToValueAtTime (0.0, audioContext.currentTime + 0.12);
			};

			function _prepare () {
				audioContext = new (window.AudioContext || window.webkitAudioContext)();

				osc = audioContext.createOscillator ();
				amp = audioContext.createGain();
				amp.gain.value = 0;

				osc.connect (amp);
				amp.connect (audioContext.destination);

				osc.start (0);

				ready = true;
				// osc.stop( time + 0.05 );
			};
		};

		var TempoTap = function ( app, modal ) {
			var q = this;
			q.app = app;

			var DidStopPlay = null;
			var DidPlay = null;
			var DidSetLoop = null;
			var DidAudioProcess = null;

			q.Init = function ( container ) {
				var q = this;

				q.el = container;

				_make_ui ( q );
				_make_evs ( q );
			};

			q.Destroy = function () {
				q.app.stopListeningFor ('DidStopPlay', DidStopPlay);
				q.app.stopListeningFor ('DidPlay', DidPlay);
				q.app.stopListeningFor ('DidSetLoop', DidSetLoop);
				q.app.stopListeningFor ('DidAudioProcess', DidAudioProcess);

				DidStopPlay = null;
				DidPlay = null;
				DidSetLoop = null;
				DidAudioProcess = null;

				q.app.ui.KeyHandler.removeCallback ('tmpTap');

				if (q.body) {
					q.body.parentNode.removeChild ( q.body );
					q.body = null;
				}

				q.app = null;
			};

			function _make_ui ( q ) {
				var el_drawer = d.createElement ('div');
				el_drawer.className = 'pk_row';

				// Estimate tempo for selected area button
				el_drawer.innerHTML = '<div class="pk_row pk_pgeq_els">' + 
					'<span>Average BPM</span>'+
					'<input style="margin-left:2px;min-width:64px;max-width:64px" '+
					'type="text" class="pk_val pk_gain" value="-">'+
					'</div>'+

					'<div class="pk_row pk_pgeq_els">'+
					'<span>Nearest BPM</span>'+
					'<input style="margin-left:2px;min-width:64px;max-width:64px" '+
					'type="text" class="pk_val pk_gain" value="-">'+
					'</div>'+

					'<div class="pk_row pk_pgeq_els">'+
					'<span>Timing Taps</span>'+
					'<input style="margin-left:2px;min-width:64px;max-width:64px" '+
					'type="text" class="pk_val pk_gain" value="-">'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Reset</a>'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Play Track</a>'+
					'<a class="pk_modal_a_bottom" style="display:inline-block;float:none">Loop</a>'+
					'</div>'+

					'<div><div id="pk_tmp_tap">'+
					'<span style="opacity:0" class="pk_obj2">CLEARED...</span>'+
					'<span class="pk_obj2">STAND BY...</span>'+
					'</div>'+

					'<div id="pk_tmp_tap2" style="position:relative">'+
					'<canvas width="1000" height="200" style="image-rendering:pixelated;width:500px;height:100px;display:block;background:#000"></canvas>'+
					'<span style="z-index:3;background:red;position:absolute;display:block;width:2px;height:100px;'+
					'left:50%;margin-left:-1px;top:0"></span>'+
					'</div></div>'+

					'<div id="pk_tmp_tap3">'+
					'<span style="position:absolute;top:50%;display:block;width:80%;left:10%;font-size:12px;'+
					'margin-top:-20px;user-select:none;text-align:center;pointer-events:none;color:#ccc">'+
					'Tap in this area, or hit [SPACE] rhythmically, to measure BPM.'+
					'</span>'+
					'</div>';

				q.body = el_drawer;
				q.el.appendChild ( el_drawer );
			};

			function _make_evs ( q ) {
				var tap_graph = q.body.querySelectorAll('#pk_tmp_tap')[0];
				var tap_area  = q.body.querySelectorAll('#pk_tmp_tap3')[0];
				var reset_btn = q.body.getElementsByClassName ('pk_modal_a_bottom')[0];
				var play_btn  = q.body.getElementsByClassName ('pk_modal_a_bottom')[1];
				var loop_btn  = q.body.getElementsByClassName ('pk_modal_a_bottom')[2];

				var canvas    = q.body.getElementsByTagName('canvas')[0];
				var ctx       = canvas.getContext('2d', {alpha:false,antialias:false});

				var tempCanvas = document.createElement('canvas');
				tempCanvas.width = 500 * 2;
				tempCanvas.height = 100 * 2;
				var tempCtx = tempCanvas.getContext ('2d', {alpha:false,antialias:false});

				ctx.imageSmoothingEnabled = true;
				tempCtx.imageSmoothingEnabled = true;

				var value_els = q.body.getElementsByClassName ('pk_val');
				var tap_msg   = tap_graph.getElementsByClassName ('pk_obj2');
				var tap_msg2  = tap_area.getElementsByTagName('span')[0];

				var bpm_el       = value_els[ 0 ];
				var bpm_el_round = value_els[ 1 ];
				var bpm_el_count = value_els[ 2 ];
				var reset_wait   = 3000;

				var time_msec = 0;
				var time_msec_prev = 0;
				var time_msec_first = 0;
				var count = 0;
				var bpm = 0;
				var steps_count = 0;
				var first = true;
				var is_playing = false;

				var _reset_count = function ( force ) {
					if (first) {
						tap_msg[1].style.opacity = '0';
					}

					count = 0;
					steps_count = 0;
					first = true;

					setTimeout(function() {
						if (!first) return ;

					  	tap_msg[0].style.opacity = '0.5';
						if (!force) {
							reset_btn.className += ' pk_act';
						  	setTimeout(function() {
									reset_btn.classList.remove ('pk_act');
							},140);
						}

					  	setTimeout(function() {
					  		if (first) {
					  			tap_msg[0].style.opacity = '0';
					  			tap_msg[1].style.opacity = '0.5';
					  		} else {
					  			tap_msg[0].style.opacity = '0';
					  			tap_msg[1].style.opacity = '0';
					  		}
					  	}, force ? 490 : 874);
					}, (force ? 0 : 150));

					if (force)
					{
						bpm_el.value       = '-';
						bpm_el_round.value = '-';
						bpm_el_count.value = '-';

						var els = tap_graph.parentNode.getElementsByClassName('pk_obj');
						var l = els.length;

						while (l-- > 0) {
							if (els[l]) {
								els[l].parentNode.removeChild (els[l]);
							}
						}
					}
				};

				reset_btn.onclick = function () {
					_reset_count (true);
				};

				play_btn.onclick = function () {
					if (PKAudioEditor.engine.wavesurfer.isPlaying()) {
						q.app.fireEvent ('RequestStop');
					}
					else {
						q.app.fireEvent ('RequestPlay');
					}
				};

				if (!PKAudioEditor.engine.wavesurfer.isReady)
				{
					play_btn.className += ' pk_inact';
					loop_btn.className += ' pk_inact';
				}
				if (PKAudioEditor.engine.wavesurfer.isPlaying()) {
					play_btn.className += ' pk_act';
				}

				DidStopPlay = function() {
					is_playing = false;
					play_btn.classList.remove ('pk_act');
					play_btn.innerText = 'Play Track';
				};
				DidPlay = function() {
					is_playing = true;
					play_btn.classList.add ('pk_act');
					play_btn.innerText = 'Stop Track';
				};

				q.app.listenFor ('DidStopPlay', DidStopPlay);
				q.app.listenFor ('DidPlay', DidPlay);

				var old_left_time  = -999999;
				var old_right_time = -999999;
				var peaks          = [];
				var skipp = false;
				var remaining = 0;

				DidAudioProcess = function() {
					//if (skipp) {
					//	skipp = false;
					//	return ;
					//}
					//skipp = true;

					var wv = PKAudioEditor.engine.wavesurfer;
					var buffer = wv.backend.buffer;
					var chan_data = buffer.getChannelData ( 0 );
					var sample_rate = buffer.sampleRate;

					var curr_time = wv.getCurrentTime ();
					var width = 500;
					var height = 100;
					var half_height = (height / 2) * 2;
					var new_width = width;
					var cached_index = 0;
					var pixels = 0;
					var raw_pixels = 0;
					var limit = 3;

					var left_time = curr_time - (limit/2);
					var right_time = curr_time + (limit/2);
					var quick_render = false;

					var start_offset = (left_time * sample_rate) >> 0;
					var end_offset   = ((left_time + limit) * sample_rate) >> 0;
					var length       = end_offset - start_offset;
					var mod          = (length / width) >> 0;

					if (left_time < old_right_time)
					{
						// find pixels
						var diff   = right_time - old_right_time;
						// pixels = Math.round ( (diff / limit) * width);

						raw_pixels = ( (diff / limit) * width);
						pixels = Math.round ( raw_pixels );

						raw_pixels = ((raw_pixels*1000) >> 0)/1000;

						if (pixels >= 0) {
							if (pixels === 0) return ;

							new_width = pixels;

							start_offset = (old_right_time * sample_rate) >> 0;
							end_offset   = (right_time * sample_rate) >> 0;
							length       = end_offset - start_offset;
							mod          = (length / pixels) >> 0;

							peaks = peaks.slice (pixels * 2);
							cached_index = width - pixels;

							quick_render = true;
						}
					}

					old_right_time = right_time;

					var max   = 0;
					var min   = 0;

					for (var i = 0; i < new_width; ++i) {
						var new_offset = start_offset + (mod * i);

						max = 0;
						min = 0;

						if (new_offset >= 0)
						{
							for (var j = 0; j < mod; j += 3) {
								if ( chan_data[ new_offset + j] > max ) {
									max = chan_data[ new_offset + j];
								}
								else if ( chan_data[ new_offset + j] < min ) {
									min = chan_data[ new_offset + j];
								}
							}
						}

						peaks[2 * (i + cached_index)] = max;
						peaks[2 * (i + cached_index) + 1 ] = min;
					}

					if (quick_render)
					{
						// var imgdata = ctx.getImageData(0, 0, width, height);
						// tempCtx.putImageData (imgdata, 0, 0);
						tempCtx.drawImage (canvas, 0, 0); //, width, height, 0, 0, width, height);
					}

					ctx.fillStyle = "#000";
					// ctx.clearRect( 0, 0, width, height );
					ctx.fillRect ( 0, 0, width * 2, height * 2 );
					ctx.fillStyle = '#99c2c6';

					if (quick_render)
					{
						var forward = Math.round (raw_pixels * 2);
						remaining += forward - raw_pixels * 2;
						if (remaining > 1) {
							forward -= 1;
							remaining = 0;
						}

						// ctx.translate(-1.5, 0);
						ctx.translate (-forward, 0);
						ctx.drawImage (tempCanvas, 0, 0); //, width, height, 0, 0, width, height);
						ctx.setTransform (1, 0, 0, 1, 0, 0);

//						ctx.drawImage (tempCanvas, 0, 0, width, 100, -(raw_pixels.toFixed(1)/1), 0, width, 100);


			            ctx.beginPath ();

			            var peak = peaks[ (width - pixels - 2) * 2];
			            var _h = Math.round (peak * half_height);
			            ctx.moveTo ( (width - pixels - 2) * 2, half_height - _h);

						for (var i = (width - pixels - 1); i < width; ++i) {
							peak = peaks[i * 2];
							_h = Math.round (peak * half_height);
							ctx.lineTo ( i* 2, half_height - _h);
						}

						for (var i = width - 1; i >= (width - pixels - 1); --i) {
							var peak = peaks[ (i * 2) + 1];
							var _h = Math.round (peak * half_height);
							ctx.lineTo ( i* 2, half_height - _h);
						}

						ctx.closePath();
						ctx.fill();
					}
					else
					{
			            ctx.beginPath ();
			            ctx.moveTo ( 0, half_height );

						for (var i = 0; i < width; ++i) {
							var peak = peaks[i * 2];
							var _h = Math.round (peak * half_height);
							ctx.lineTo ( i * 2, half_height - _h);
						}

						for (var i = width - 1; i >= 0; --i) {
							var peak = peaks[ (i * 2) + 1];
							var _h = Math.round (peak * half_height);
							ctx.lineTo ( i * 2, half_height - _h);
						}

						ctx.closePath();
						ctx.fill();
					}

					//console.log( peaks );

				};

				q.app.listenFor ('DidAudioProcess', DidAudioProcess); 

				if (PKAudioEditor.engine.wavesurfer.regions.list[0])
				{
					if (PKAudioEditor.engine.wavesurfer.regions.list[0].loop)
						loop_btn.className += ' pk_act';
				}
				loop_btn.onclick = function() {
					q.app.fireEvent('RequestSetLoop');
				};

				DidSetLoop = function( val ) {
					val ? loop_btn.classList.add('pk_act') :
						  loop_btn.classList.remove('pk_act');
				};
				q.app.listenFor('DidSetLoop', DidSetLoop);

				tap_graph.parentNode.addEventListener ('transitionend', function ( e ) {
				  if (!tap_graph) return ;

				  var el = e.target;
				  if (el.tagName !== 'DIV') return ;

				  el.parentNode.removeChild ( el );
				  --steps_count;

				  if (steps_count === 0) {

				  	if (is_playing)
				  		setTimeout(function() {
				  			if (steps_count === 0)
				  				_reset_count ();
				  		},1100);
				  	else
				  		_reset_count ();
				  }
				});

				tap_area.onclick = function ( ev ) {
					if (ev) {
						ev.preventDefault ();
						ev.stopPropagation ();
					}

					if (first) {
						first = false;
						tap_msg[1].style.opacity = '0';
					}

					time_msec = Date.now ();

					if ((time_msec - time_msec_prev) > reset_wait) {
						count = 0;
					}

					if (count === 0)
					{
						time_msec_first = time_msec;
						count = 1;

						bpm_el.value       = 'First Beat';
						bpm_el_round.value = 'First Beat';
						bpm_el_count.value = count;
					}
					else
					{
						bpm = 60000 * count / (time_msec - time_msec_first);
						++count;

						bpm_el.value       = Math.round (bpm * 100) / 100;
						bpm_el_round.value = Math.round (bpm);
						bpm_el_count.value = count;
					}

					var step = document.createElement ('div');
					step.className = 'pk_obj';

					if (is_playing) {
						canvas.parentNode.appendChild (step);
					}
					else {
						tap_graph.appendChild (step);
					}
					++steps_count;

					tap_area.classList.add ('pk_act');

					requestAnimationFrame(function() {
						step.style.transform = 'translate3d(-10%,0,0)';

						setTimeout(function() {
							tap_area.classList.remove ('pk_act');
						},56);
					});

					time_msec_prev = time_msec;
				};

				app.ui.KeyHandler.addCallback ('tmpTap', function ( e, o, ev ) {
					if (!app.ui.InteractionHandler.check (modal_name)) return ;
					
					ev.preventDefault ();
					ev.stopPropagation ();

					tap_area.onclick (null);
				}, [32]);

				// ---
			};
		};


		// events
		var TempoEstimation = function ( app, modal ) {
			var q = this;
			q.app = app;

			q.Init = function ( container ) {
				var q = this;

				q.el = container;

				_make_ui ( q );
				_make_evs ( q );
			};

			q.Destroy = function () {
				if (q.body) {
					q.body.parentNode.removeChild ( q.body );
					q.body = null;
				}

				q.app = null;
			};

			q.Est = function ( selection ) {
				var q = this;

				var wavesurfer = q.app.engine.wavesurfer;
				var buffer     = wavesurfer.backend.buffer;

				var starting_time = 20.375;
				var ending_time   = wavesurfer.getDuration ();
				var sample_rate   = buffer.sampleRate;

				var look_ahead    = 10 * sample_rate;
				var offset_rate   = starting_time * sample_rate;
				var duration_rate = ending_time * sample_rate;
				var dist_rhythm   = {};

				// now run offline 
				var audio_ctx = getOfflineAudioContext (
						1,
						buffer.sampleRate,
						buffer.length
				);

				var source = audio_ctx.createBufferSource ();
				source.buffer = buffer;

                var filter = audio_ctx.createBiquadFilter ();
                filter.type = 'highpass';
                filter.frequency.value = 50;
                filter.Q.value = 1.1;
                source.connect (filter);

                var filter2 = audio_ctx.createBiquadFilter ();
                filter2.type = 'lowpass';
                filter2.frequency.value = 140;
                filter2.Q.value = 2.5;
                filter.connect (filter2);
                filter2.connect (audio_ctx.destination);

				source.start (0);

				var offline_callback = function( rendered_buffer ) {
					_pass ( rendered_buffer, offset_rate, duration_rate );
				};

				var _pass = function ( rendered_buffer, offset, duration ) {

					var chan_data = rendered_buffer.getChannelData ( 0 );
					var new_arr = [];
					var diff_arr = [];
	                var currval = 0;
	                var prev_val = 0;
	                var bottom = 100000;
	                var top = -100000;
	                var found_pick = false;
	                var going_up = false;
	                var peak_dist = 0;
	                var peak_prev = 0;
	                var next_offset = offset + look_ahead;

					var trimmed_arr = [];
					var modulus_coefficient = Math.round (look_ahead / 200);
					var plus_one = look_ahead + modulus_coefficient;

					for (var i = 0; i < plus_one; ++i) {
						if (i % modulus_coefficient === 0) {

							// look into 50 neighboring entries for higher values.
							var val_clean = chan_data[ offset + i ];
							var val = Math.abs (val_clean);

							//console.log( "was ", val_clean );

							var tmp_val = 0;
							for (var uu = 1; uu < 50; ++uu) {
								tmp_val = Math.abs (chan_data[ offset + i - uu ]);

								if (tmp_val > val) {
									val_clean = chan_data[ offset + i - uu ];
									val = Math.abs (val_clean);
								}
							}

							for (var uu = 1; uu < 50; ++uu) {
								tmp_val = Math.abs (chan_data[ offset + i + uu ]);

								if (tmp_val > val) {
									val_clean = chan_data[ offset + i + uu ];
									val = Math.abs (val_clean);
								}
							}

							//console.log( "added ", val_clean );
							//console.log("-----");

							trimmed_arr.push ( val_clean );
						}
					}

					trimmed_arr = _normalize_array2 (trimmed_arr);
					trimmed_arr.pop ();

					// ------------
					prev_val = trimmed_arr[0];
					for (var j = 1; j < trimmed_arr.length; ++j) {
						currval = trimmed_arr[j];

						if (currval > prev_val) {

               				if (!going_up) {
               					if (bottom > prev_val) {
               						bottom = prev_val;
               						top = -100000;
               					}
               				}

               				going_up = true;
						}
               			else if (currval < prev_val ) {

               				if (going_up) {

               					// console.log (":: peak: ", prev_val.toFixed(2)/1, "  bottom: ", bottom.toFixed(2)/1, "  diff: ", Math.abs(prev_val-bottom).toFixed(2)/1 );

               					found_pick = true;

               					if (peak_dist < 3 && Math.abs (new_arr[peak_prev] - prev_val) < 150) {
               						// debugger;

               						if (prev_val > new_arr[peak_prev]) {
               							new_arr[peak_prev] = 0;
               							diff_arr.pop ();
               						}
               						else {
               							found_pick = false;
               						}
               					}

               					if (found_pick) {
               						diff_arr.push (Math.abs (prev_val - bottom));

               						peak_dist = 0;
               						new_arr.push ( prev_val );

               						peak_prev = new_arr.length - 1;

               						if (prev_val > top) {
               							top = prev_val;
               							bottom = 100000;
               						}
               					}
               					// -----
               				}

               				going_up = false;
               			}

               			prev_val = currval;

						if (!found_pick) {
							new_arr.push ( 0 );
							//console.log( "ZEROED ", new_arr.length - 1 );
							++peak_dist;
						}
						else {
							found_pick = false;
						}
					}

					// console.log( trimmed_arr );
					// console.log( new_arr );
					// window.trimmed_arr = trimmed_arr;
					// window.new_arr = new_arr;
					// window.chan = chan_data;

					// ----
                    var ret = _group_rhythm ( new_arr, diff_arr );
                    if (!ret) {
                    	console.log ("something weird happened, error 244");
                    	return ;
                    }

                    var distances = ret[0];

                    // console.log( diff_arr );
                    // console.log( ret[1] );

                    for (var k in distances) {
                    	if (!dist_rhythm[ k ]) dist_rhythm[ k ] = 0;

                    	dist_rhythm[ k ] += distances[ k ];
                    }

                     
                    console.log ( distances );
                    // console.log( ' ---------------- ' );
                    // console.log ('--------- END OF PASS -------  ',  offset, ' / ', duration);

                    if (next_offset + look_ahead >= duration) {

                    	 // Done... 
                    	 console.log ( dist_rhythm );
                    } else {
                   // 	_pass ( rendered_buffer, next_offset, duration );
                    }
                    // ----
				};


				var offline_renderer = audio_ctx.startRendering(); 
				if (offline_renderer)
					offline_renderer.then( offline_callback ).catch(function(err) {
						console.log('Rendering failed: ' + err);
					});
				else
					audio_ctx.oncomplete = function ( e ) {
						offline_callback ( e.renderedBuffer );
					};
			};

			function _make_ui ( q ) {
				var el_drawer = d.createElement ('div');
				el_drawer.className = 'pk_row';

				// Estimate tempo for selected area button
				el_drawer.innerHTML = '<div class="pk_row">' + 
				'<input type="radio" class="pk_check" id="tt4" name="xport" checked value="whole">'+
				'<label for="tt4">Whole track</label>'+
				'<input type="radio" class="pk_check" id="tt5" name="xport" value="sel">'+
				'<label class="pk_lblmp3" for="tt5">Estimate for Selection Only</label></div>' +
				'<div class="pk_row">' + 
				'<a class="pk_modal_a_bottom" style="margin:0;float:left">Estimate</a>'+
				'</div>';

				q.body = el_drawer;
				q.el.appendChild ( el_drawer );
			};

			function _make_evs ( q ) {
				var btn_est = q.body.getElementsByTagName ('a')[0];
				if (!btn_est) return ;

				btn_est.onclick = function () {
					q.Est && q.Est (1);
					// q.app && q.app.fireEvent ('ReqEst', 1);
				};
			};
		};

		var x = new PKAudioFXModal ({
			id: filter_id,
			title: 'Tempo & Rhythm Tools',

			ondestroy: function ( q ) {
				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);
				act_tool.Destroy ();
				act_tool = null;

				app.fireEvent ('RequestStop');
			},

			body: '<div class="pk_tbs">' +
				'<a class="pk_tbsa pk_inact">Tempo Estimation</a>' +
				'<a class="pk_tbsa">Tempo Tap</a>' +
				'<a class="pk_tbsa">Metronome</a></div>',

//			buttons: [{
//				title:'Apply EQ',
//				clss:'pk_modal_a_accpt',
//				callback: function( q ) {
//					q.Destroy ();
//				}
//			}],

			setup:function( q ) {
					var toplinks = q.el_body.getElementsByClassName('pk_tbsa');

					var destroy = function () {
						if (act_tool) {
							act_tool.Destroy ();
							act_tool = null;
							toplinks[act_index].classList.remove('pk_act');
						}
					};

					var activate = function () {
						// get the active state
						if (act_index === 0) {
							// toplinks[0].className += ' pk_act';
							// act_tool = new TempoEstimation ( app, q );
							return ;
						}
						else if (act_index === 1) {
							toplinks[1].className += ' pk_act';
							act_tool = new TempoTap ( app, q );
						}
						else if (act_index === 2) {
							toplinks[2].className += ' pk_act';
							act_tool = new TempoMetro ( app, q );
						}

						act_tool && act_tool.Init ( q.el_body );
					};

					//toplinks[0].onclick = function() {
					//	destroy ();
					//	act_index = 0;
					//	activate ();
					//};
					toplinks[1].onclick = function() {
						if (act_index === 1) return ;

						destroy (); act_index = 1;
						activate ();
					};
					toplinks[2].onclick = function() {
						if (act_index === 2) return ;

						destroy (); act_index = 2;
						activate ();
					};

					activate ();

					// ---
					app.fireEvent ('RequestPause');
					app.ui.InteractionHandler.checkAndSet (modal_name);
					app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
						if (!app.ui.InteractionHandler.check (modal_name)) return ;
						q.Destroy ();
					}, [27]);
			}
		}, app);

		x.Show ();
		// ------
	};


	PKAudioEditor._deps.FxTMP = TempoToolsModal;


	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////////////
	var RecModal = function ( app ) {
		var filter_id = 'rec_tools';

		var audio_stream = null;
		var audio_context = null;
		var script_processor = null;
		var media_stream_source = null;
		var temp_buffers = []
		var newbuff = null;
		var sample_rate = 44100;
		var buffer_size = 2048; // * 2 ?
		var channel_num = 1;
		var channel_num_out = 1;

		var stop_audio = function () {
			if (!audio_stream) return ;

			audio_stream.getTracks().forEach(function (stream) {
				stream.stop ();
			});

			if (script_processor) {
				script_processor.onaudioprocess = null;
			}
			media_stream_source && media_stream_source.disconnect ();
			script_processor && script_processor.disconnect ();
			media_stream_source = null;
			audio_stream = null; audio_context = null;
		};

		var x = new PKAudioFXModal ({
			id: filter_id,
			title: 'New Recording',

			ondestroy: function ( q ) {
				// destroy audio...
				stop_audio ();

				temp_buffers = [];
				newbuff = null;

				app.ui.InteractionHandler.on = false;
				app.ui.KeyHandler.removeCallback (modal_esc_key);

				app.fireEvent ('RequestStop');
			},

			body: '<div class="pk_rec" style="user-select:none">' +
				'<div class="pk_row">' +
				  '<label>Devices:</label>' +
				  '<select style="max-width:220px"></select>' +
				'</div>' +
				'<div class="pk_row">' +

				  '<div style="float:left"><label>Volume</label>' +
				  '<canvas width="200" height="40"></canvas></div>' +

				  '<div style="float:left;margin-left:20px;"><label>Time</label>' +
				  '<span style="font-size: 24px;line-height: 50px;">0.0</span></div>' +
				  '<div style="clear:both;height:10px"></div>' +
				  '<div><label>Waveform</label><canvas width="1000" height="200" style="image-rendering:pixelated;width:500px;height:100px;display:block;background:#000"></canvas></div>'+
				'</div>' +
				'<div class="pk_row">' +
				  '<a class="pk_tbsa pk_inact" style="text-align: center;">START RECORDING</a>' +
				  '<a class="pk_tbsa pk_inact" style="margin-left: 24px; text-align: center;">PAUSE</a>' +
				'</div>' +
				'<div class="pk_row">' +
					'<a class="pk_tbsa" style="float:left;display:none;text-align:center;box-shadow:0 0 7px #3a6b79 inset;">OPEN RECORDING</a>' +
					'<a class="pk_tbsa" style="float:left;display:none;margin-left: 24px; text-align: center;">APPEND TO EXISTING</a>' +
				'</div>' +
				'</div>',

//			buttons: [{
//				title:'Apply EQ',
//				clss:'pk_modal_a_accpt',
//				callback: function( q ) {
//					q.Destroy ();
//				}
//			}],

			setup:function( q ) {
					var is_ready = false;
					var is_active = false;
					var is_paused = false;
					var has_recorded = false;

					var mainbtns = q.el_body.getElementsByClassName('pk_tbsa');
					var btn_start = mainbtns[0];
					var btn_pause = mainbtns[1];
					var btn_open  = mainbtns[2];
					var btn_add   = mainbtns[3];
					var time_span = q.el_body.getElementsByTagName('span')[0];
					var devices_sel = q.el_body.getElementsByTagName('select')[0];
					var devices = [];
					var volcanvas = q.el_body.getElementsByTagName('canvas')[0];
					var volctx = volcanvas.getContext('2d', {alpha:false,antialias:false});

					var freqcanvas = q.el_body.getElementsByTagName('canvas')[1];
					var freqctx = freqcanvas.getContext('2d', {alpha:false,antialias:false});
					var tempCanvas = document.createElement('canvas');
					tempCanvas.width = 500 * 2;
					tempCanvas.height = 100 * 2;
					var tempCtx = tempCanvas.getContext ('2d', {alpha:false,antialias:false});


					var first_skip = 12;
					var curr_offset = 0;
					var temp_buffer_index = -1;
					var volume = 0;
					var currtime = 0;
					var has_devices = false;

					var old_left_time  = -999999;
					var old_right_time = -999999;
					var peaks          = [];
					var skipp = false;
					var remaining = 0;
					var debounce = false;

					temp_buffers = [];
					newbuff = null;

					var draw_volume = function () {
						volctx.fillStyle = "#000";
						volctx.fillRect(0,0,200,40);

						if (!is_active) {
							return ;
						}

						volctx.fillStyle = "green";
						volctx.fillRect(0, 0, volume*200*1.67, 40);

						time_span.innerText = ((currtime * 10) >> 0) / 10;

						window.requestAnimationFrame( draw_volume );
					};

					var fetchBufferFunction = function (ev) {
						if (first_skip > 0) {
							--first_skip;
							return ;
						}

						if (is_paused) {
							return ;
						}

						curr_offset += ev.inputBuffer.duration * sample_rate;
						var float_array = ev.inputBuffer.getChannelData (0).slice (0);
						temp_buffers[ ++temp_buffer_index ]  = float_array;

						var sum = 0;
						var x;

						for (var i = 0; i < buffer_size; i += 2) {
							x = float_array[i];
							sum += x * x;
						}

						var rms =  Math.sqrt(sum / (buffer_size / 2) );
						volume = Math.max(rms, volume * 0.9);


						var curr_time = (temp_buffer_index * buffer_size) / sample_rate;
						currtime = curr_time;
						var width = 500;
						var height = 100;
						var half_height = (height / 2) * 2;
						var new_width = width;
						var cached_index = 0;
						var pixels = 0;
						var raw_pixels = 0;
						var limit = 3;

						var left_time = curr_time - limit;
						var right_time = curr_time; // + (limit/2);
						var quick_render = false;

						var start_offset = (left_time * sample_rate) >> 0;
						var end_offset   = ((left_time + limit) * sample_rate) >> 0;
						var length       = end_offset - start_offset;
						var mod          = (length / width) >> 0;

						if (left_time < old_right_time)
						{
							// find pixels
							var diff   = right_time - old_right_time;
							// pixels = Math.round ( (diff / limit) * width);

							raw_pixels = ( (diff / limit) * width);
							pixels = Math.round ( raw_pixels );

							raw_pixels = ((raw_pixels*1000) >> 0)/1000;

							if (pixels >= 0) {
								if (pixels === 0) return ;

								new_width = pixels;

								start_offset = (old_right_time * sample_rate) >> 0;
								end_offset   = (right_time * sample_rate) >> 0;
								length       = end_offset - start_offset;
								mod          = (length / pixels) >> 0;

								peaks = peaks.slice (pixels * 2);
								cached_index = width - pixels;

								quick_render = true;
							}
						}

						old_right_time = right_time;

						var max   = 0;
						var min   = 0;

						for (var i = 0; i < new_width; ++i)
						{
							var new_offset = start_offset + (mod * i);

							max = 0;
							min = 0;

							if (new_offset >= 0)
							{
								for (var j = 0; j < mod; j += 3) {
									var temp = new_offset + j;
									var temp2 = (temp/2048) >> 0;
									var temp3 = temp % 2048;

									if (!temp_buffers[temp2]) continue;

									if ( temp_buffers[temp2][ temp3 ] > max ) {
										max = temp_buffers[temp2][ temp3 ];
									}
									else if ( temp_buffers[temp2][ temp3 ] < min ) {
										min = temp_buffers[temp2][ temp3 ];
									}
								}
							}

							peaks[2 * (i + cached_index)] = max;
							peaks[2 * (i + cached_index) + 1 ] = min;
						}

						if (quick_render)
						{
							// var imgdata = ctx.getImageData(0, 0, width, height);
							// tempCtx.putImageData (imgdata, 0, 0);
							tempCtx.drawImage (freqcanvas, 0, 0); //, width, height, 0, 0, width, height);
						}

						freqctx.fillStyle = "#000";
						// freqctx.clearRect( 0, 0, width, height );
						freqctx.fillRect ( 0, 0, width * 2, height * 2 );
						freqctx.fillStyle = '#99c2c6';

						if (quick_render)
						{
							var forward = Math.round (raw_pixels * 2);
							remaining += forward - raw_pixels * 2;
							if (remaining > 1) {
								forward -= 1;
								remaining = 0;
							}

							// freqctx.translate(-1.5, 0);
							freqctx.translate (-forward, 0);
							freqctx.drawImage (tempCanvas, 0, 0); //, width, height, 0, 0, width, height);
							freqctx.setTransform (1, 0, 0, 1, 0, 0);

	//						freqctx.drawImage (tempCanvas, 0, 0, width, 100, -(raw_pixels.toFixed(1)/1), 0, width, 100);


				            freqctx.beginPath ();

				            var peak = peaks[ (width - pixels - 2) * 2];
				            var _h = Math.round (peak * half_height);
				            freqctx.moveTo ( (width - pixels - 2) * 2, half_height - _h);

							for (var i = (width - pixels - 1); i < width; ++i) {
								peak = peaks[i * 2];
								_h = Math.round (peak * half_height);
								freqctx.lineTo ( i* 2, half_height - _h);
							}

							for (var i = width - 1; i >= (width - pixels - 1); --i) {
								var peak = peaks[ (i * 2) + 1];
								var _h = Math.round (peak * half_height);
								freqctx.lineTo ( i* 2, half_height - _h);
							}

							freqctx.closePath();
							freqctx.fill();
						}
						else
						{
				            freqctx.beginPath ();
				            freqctx.moveTo ( 0, half_height );

							for (var i = 0; i < width; ++i) {
								var peak = peaks[i * 2];
								var _h = Math.round (peak * half_height);
								freqctx.lineTo ( i * 2, half_height - _h);
							}

							for (var i = width - 1; i >= 0; --i) {
								var peak = peaks[ (i * 2) + 1];
								var _h = Math.round (peak * half_height);
								freqctx.lineTo ( i * 2, half_height - _h);
							}

							freqctx.closePath();
							freqctx.fill();
						}

					};

					navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function( _stream ) {
						_stream.getTracks().forEach(function (stream) {
							stream.stop ();
						});

						enumerate ();
					}).catch(function(error) {
						alert("no microphone permissions found!");
					});

					var enumerate = function () {
						if (navigator.mediaDevices.enumerateDevices) {
							navigator.mediaDevices.enumerateDevices().then((devices) => {
							  devices = devices.filter((d) => d.kind === 'audioinput');
							  has_devices = true;

							  var len = devices.length;
							  for (var i = 0; i < len; ++i) {
							  		var el = document.createElement('option');
							  		el.value = devices[i].deviceId;
							  		el.innerText = devices[i].label;
							  		devices_sel.appendChild (el);
							  }

							  is_ready = true;
							  btn_start.classList.remove ('pk_inact');
							});
						}
						else {
							devices_sel.parentNode.style.display = 'none';
							has_devices = false;
							is_ready = true;
							btn_start.classList.remove ('pk_inact');
						}
					};

					var stop = function () {
						stop_audio ();

						is_active = false;
						is_paused = false;
						first_skip = 10;

						++temp_buffer_index;
						var k = -1;
						newbuff = new Float32Array (temp_buffer_index * buffer_size);
						for (var i = 0; i < temp_buffer_index; ++i)
						{
							for (var j = 0; j < buffer_size; ++j)
							{
								newbuff[++k] = temp_buffers[i][j];
							}
						}

						temp_buffer_index = -1;
						temp_buffers = [];

						// ------
						btn_open.style.display = 'block';

						// check to see if we are ready
						if (app.engine.is_ready) {
							btn_add.style.display = 'block';
						}

						has_recorded = true;
					};
					// ---

					btn_start.onclick = function () {
						if (!is_ready) return ;

						if (debounce) {
							return ;
						}

						debounce = true;
						setTimeout(function() {
							debounce = false;
						}, 260);

						// check if recording exists - ask for confirmation
						if (has_recorded) {
							if (!window.confirm("Are you sure? This will discard the current recording."))
							{
								return ;
							}
						}


						if (is_active) {
							stop ();

							btn_pause.classList.add ('pk_inact');
							btn_start.innerText = 'START RECORDING';
							btn_start.style.boxShadow = 'none';

							return ;
						}

						temp_buffer_index = -1;
						temp_buffers = [];
						newbuff = null;
						volume = 0;

						btn_open.style.display = 'none';
						btn_add.style.display = 'none';

						audio_context = new (window.AudioContext || window.webkitAudioContext)();
						sample_rate = audio_context.sampleRate;

						var audio_val = true;
						if (has_devices) {
							audio_val = {deviceId: devices_sel.value};
							// devices_sel.options[devices_sel.selectedIndex].value;
						}

						navigator.mediaDevices.getUserMedia({ audio: audio_val }).then(function( stream ) {
							audio_stream = stream;
							media_stream_source = audio_context.createMediaStreamSource ( stream );

			            	script_processor = audio_context.createScriptProcessor (
			                	buffer_size, channel_num, channel_num_out
			                );

			            	media_stream_source.connect ( script_processor );
			            	script_processor.connect ( audio_context.destination );

			            	is_active = true;
			            	btn_pause.classList.remove ('pk_inact');
			            	btn_start.innerText = 'FINISH RECORDING';
			            	btn_start.style.boxShadow = '#992222 0px 0px 6px inset';
			            	script_processor.onaudioprocess = fetchBufferFunction;

			            	draw_volume ();

						}).catch(function(error) {

						});

					};

					btn_pause.onclick = function () {
						if (!is_ready) return ;
						if (!is_active) return ;

						is_paused = !is_paused;

						btn_pause.innerText = is_paused ? 'UN-PAUSE' : 'PAUSE';
					};

					btn_open.onclick = function () {
						if (debounce) {
							return ;
						}

						debounce = true;
						setTimeout(function() {
							debounce = false;
						}, 150);

						app.engine.wavesurfer.backend._add = 0;
						app.engine.LoadDB ({
							samplerate: sample_rate,
							data: [
								newbuff.buffer
							]
						});

						// ----
						q.Destroy ();
					};

					btn_add.onclick = function () {
						if (debounce) {
							return ;
						}

						debounce = true;
						setTimeout(function() {
							debounce = false;
						}, 150);

						app.engine.wavesurfer.backend._add = 1;
						app.engine.LoadDB ({
							samplerate: sample_rate,
							data: [
								newbuff.buffer
							]
						});

						// ----
						q.Destroy ();
					};

					// ---
					app.fireEvent ('RequestPause');
					app.ui.InteractionHandler.checkAndSet (modal_name);
					app.ui.KeyHandler.addCallback (modal_esc_key, function ( e ) {
						if (!app.ui.InteractionHandler.check (modal_name)) return ;
						q.Destroy ();
					}, [27]);
			}
		}, app);

		x.Show ();
	};

	PKAudioEditor._deps.FxREC = RecModal;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';

	var _pid = 0;
	var _aid = 0;

	function FXAutomation ( app, filter_modal, val_cb, preview_cb ) {
		var q = this;

		q.modal = filter_modal;
		q.app  = app;
		q.wv    = app.engine.wavesurfer;
		q.points = {};
		q.act = null;
		q.act_point = null;
		q.in_auto = false;
		q.rbuff = null;

		q.btn_auto = _make_btn_auto ( q );

		q.GetValue = function () {
			var data = [];

			var inputs = q.modal.el_body.getElementsByTagName('input');
			var plen = q.points.length;

			for (var i = 0; i < inputs.length; ++i)
			{
				var curr = inputs[i];
				if (q.points[curr.id])
				{
					var arr = [];
					var p = q.points[curr.id];
					for (var j = 0; j < p.length; ++j)
					{
						var tmp = {
							time: p[j].time,
							val: p[j].val
						};
						arr.push(tmp);
						val_cb && val_cb (tmp, curr);
					}
					data.push (arr);
				}
				else
				{
					var tmp = {
						val: curr.value
					};

					data.push (tmp);
					val_cb && val_cb (tmp, curr);
				}
			}

			return (data);
		};

		q.cw = 500;
		q.ch = 200;
		var els  = _make_canvas ( q, q.cw, q.ch );
		q.canvas = els[0];
		q.ctx    = els[1];


		var _fillstyle = '#d9d955';
		q.Render = function () {
				var ctx = q.ctx;
				var cw = q.cw;
				var ch = q.ch;

				if (q.rbuff)
					q.app.engine.GetWave (q.rbuff, 500, 200, null, null, q.canvas, q.ctx);

				// ctx.clearRect (0, 0, q.cw, q.ch);
				ctx.fillStyle   = _fillstyle;
				ctx.strokeStyle = '#FF0000';

				if (!q.act) return ;

				ctx.beginPath ();
				ctx.moveTo ( 0, ch / 2 );
				var last_y = ch / 2;

				for (var o = 0; o < q.points[q.act.id].length; ++o)
				{
					var curr = q.points[q.act.id][ o ];

					var center_x = curr.ax;
					var center_y = curr.ay;

					ctx.lineTo ( center_x, center_y );
					last_y = center_y;
				}

				ctx.lineTo ( cw, last_y );
				ctx.stroke ();

				var radius = 6;
				for (var o = 0; o < q.points[q.act.id].length; ++o)
				{
					var curr = q.points[q.act.id][ o ];

					var center_x = curr.ax;
					var center_y = curr.ay;

					ctx.beginPath ();
					ctx.arc (center_x, center_y, radius, 0, 2 * Math.PI, false);

					if (curr === q.act_point) {
						ctx.shadowBlur = 24;

						if (curr._on)
							ctx.fillStyle = '#fff';
						else 
							ctx.fillStyle = '#686868';

						ctx.stroke ();
						ctx.fill ();

						ctx.shadowBlur = 0;
						ctx.fillStyle = _fillstyle;
					}
					else if (curr._hov) {

						if (curr._on)
							ctx.fillStyle = 'blue';
						else 
							ctx.fillStyle = 'darkblue';

						ctx.stroke ();
						ctx.fill ();

						ctx.fillStyle = _fillstyle;
					}
					else if (curr._on) {
						ctx.fill ();
					}
					else {
						ctx.fillStyle = '#555';
						ctx.fill ();
						ctx.fillStyle = _fillstyle;
					}
				}
		};


		_make_controls ( q );

		// -------
		function _make_controls ( q ) {
			var click_time = 0;
			q.canvas.addEventListener ('click', function ( e ) {
				if (!q.act) return;
				if (e.timeStamp - click_time < 260)
				{
						var bounds = q.canvas.getBoundingClientRect ();
						var cw = q.cw;
						var ch = q.ch;
						var posx = e.clientX - bounds.left;
						var posy = e.clientY - bounds.top;

						var rel_x = posx / cw;
						var rel_y = posy / ch;

						if (!q.points[q.act.id]) q.points[q.act.id] = [];

						var duration;
						var region = q.wv.regions.list[0];
						if (region) {
							duration = region.end - region.start;
						} else {
							duration = q.wv.getDuration();
						}

						q.points[q.act.id].push ({
							// el:q.act.el,
							id: ++_pid,
							x: rel_x,
							y: rel_y,
							ax: rel_x * cw,
							ay: rel_y * ch,
							time: duration * rel_x,
							val : ((1 - rel_y) * (q.act.max - q.act.min)) + q.act.min,
							_on:  true,
							_hov: false,
						});

						q.points[q.act.id].sort( _compare );
						q.act_point = q.points[q.act.id][q.points[q.act.id].length - 1];

						//_process ( q, q.wv.backend.buffer );

						q.Render ();
						// ----
				}

				click_time = e.timeStamp;
			}, false);

			var is_dragging = false;
			var skip = 3;
			q.canvas.addEventListener ('mousemove', function ( e ) {
				if (!is_dragging || !q.act_point) return ;

				var ex = 0;
				var ey = 0;

				if (e.touches) {
					if (e.touches.length > 1) { return ; }

					ex = e.touches[0].clientX;
					ey = e.touches[0].clientY;
				} else {
					ex = e.clientX;
					ey = e.clientY;
				}

				var bounds = q.canvas.getBoundingClientRect ();
				var cw = q.cw;
				var ch = q.ch;

				var posx = ex - bounds.left;
				var posy = ey - bounds.top;

				var rel_x = posx / cw;
				var rel_y = posy / ch;

				q.act_point.ax = posx;
				q.act_point.ay = posy;

				q.act_point.x = rel_x;
				q.act_point.y = rel_y;

				var duration;
				var region = q.wv.regions.list[0];
				if (region) {
					duration = region.end - region.start;
				} else {
					duration = q.wv.getDuration();
				}

				q.act_point.time = duration * rel_x;
				q.act_point.val  = ((1 - rel_y) * q.act.max - q.act.min) + q.act.min; 

				q.Render ();

				if (--skip === 0) {
					skip = 4;
					_process ( q, q.wv.backend.buffer );
				}
			});

			q.canvas.addEventListener ('mousedown', function ( e ) {
				is_dragging = false;
				if (!q.act) return ;

				var bounds = q.canvas.getBoundingClientRect ();
				var cw = q.cw;
				var ch = q.ch;

				var posx = e.clientX - bounds.left;
				var posy = e.clientY - bounds.top;

				var dist_x = e.is_touch ? 20 : 10;
				var dist_y = e.is_touch ? 20 : 9;

				if (!q.points[q.act.id]) q.points[q.act.id] = [];

				for (var o = 0; o < q.points[q.act.id].length; ++o)
				{
					var curr = q.points[q.act.id][ o ];
					if ( Math.abs (curr.ax - posx) < dist_x && Math.abs (curr.ay - posy) < dist_y)
					{
						is_dragging = true;
						q.act_point = curr;
						q.Render ();

						break;
					}
				}

				if (!is_dragging)
				{
					q.act_point = null;
					q.Render ();
				}
			});

			q.canvas.addEventListener ('mouseup', function ( e ) {
				is_dragging = false;
			});


			var act_el = null;
	  		q.modal.el_body.addEventListener ('mouseover', function(e) {
	  			if (!q.in_auto) return ;
	  			if (e.target.tagName === 'INPUT') {
	  				e.target.classList.add ('pk_aut');
	  			}
	  		});
	  		q.modal.el_body.addEventListener ('mouseout', function(e) {
	  			if (!q.in_auto) return ;
	  			if (e.target.tagName === 'INPUT') {
	  				e.target.classList.remove ('pk_aut');
	  			}
	  		});
	  		q.modal.el_body.addEventListener ('click', function(e) {
	  			if (!q.in_auto) return ;
	  			if (e.target.classList.contains ('pk_aut'))
	  			{
	  				if (act_el) {
	  					act_el.classList.remove ('pk_aut_act');
	  					act_el = null;
	  				}

	  				e.target.classList.add ('pk_aut_act');
	  				act_el = e.target;

	  				if (!e.target.id) e.target.id = 'pk' + (++_aid);

	  				q.act = {
	  					id: e.target.id,
	  					el: e.target,
	  					type:e.target.range,
	  					min:e.target.min/1,
	  					max:e.target.max/1,
	  					step:e.target.step/1
	  				};

	  				if (!q.points[q.act.id]) q.points[q.act.id] = [];

	  				q.Render ();
	  			}

	  			// console.log( 'click ', e.target );
	  		});
		};


		function _make_btn_auto ( q ) {
			var btn_automate = d.createElement ('a');
			btn_automate.className = 'pk_modal_a_bottom';
			btn_automate.innerHTML = 'AUTOMATE';

			var in_auto = false;
  			btn_automate.onclick = function () {
  				q.in_auto = !q.in_auto;

  				if (q.in_auto) {
  					btn_automate.classList.add ('pk_act');
  				} else {
					btn_automate.classList.remove ('pk_act');
  				}
  			};

  			q.modal.el_body.appendChild( btn_automate );

  			return (btn_automate);
  		};

  		function _make_canvas ( q ) {
			var cc = document.createElement ('canvas');
			cc.width = 500; cc.height = 200;
			cc.style.background = '#000';
			var ctx = cc.getContext('2d');

			q.modal.el_body.appendChild( cc );

			var buff = q.wv.backend.buffer;
			
			var img = new Image();
			img.onload = function () {
				ctx.drawImage (img, 0, 0);
			};

			var offset; var length;
			var region = q.wv.regions.list[0];
			if (region) {
				offset = (region.start * buff.sampleRate) >> 0;
				length = (region.end * buff.sampleRate) >> 0;
			}

			_process ( q, buff );

			img.src = q.app.engine.GetWave (buff, 500, 200, offset, length);

			return ([cc, ctx]);
  		};

		function _compare ( a, b ) {
				if (a.x > b.x) return 1;
				return -1;
		};

		function _process ( q, buffer ) {
			var getOfflineAudioContext = function (channels, sampleRate, duration) {
					return new (window.OfflineAudioContext ||
					window.webkitOfflineAudioContext)(channels, duration, sampleRate);
			};

			var region = q.wv.regions.list[0];
			var offs = 0;
			var durr = buffer.duration;
			if (region) {
				offs = region.start;
				durr = region.end - region.start;
			}

			var audio_ctx = getOfflineAudioContext (
					1, // orig_buffer.numberOfChannels,
					8000,
					(durr * 8000) >> 0
			);

			var newbuffer = audio_ctx.createBuffer (1, durr * buffer.sampleRate, buffer.sampleRate);
			newbuffer.getChannelData ( 0 ).set (
				buffer.getChannelData ( 0 ).slice ( (offs * buffer.sampleRate) / 4, ((offs + durr) * buffer.sampleRate)/4 ) 
			);

			var source = audio_ctx.createBufferSource ();
			source.buffer = newbuffer;

			//var fx = q.app.engine.GetFX ('Gain', q.GetValue ());
			//console.log ( fx.filter ( audio_ctx, audio_ctx.destination, source ) );

			source.connect (audio_ctx.destination);
			source.start (0); //, offs, durr);

			var offline_callback = function( rendered_buffer ) {
						q.rbuff = rendered_buffer;

						debugger;

						// var img = new Image();
						// img.src = q.app.engine.GetWave (rendered_buffer, 500, 200);

						q.Render ();

			};
			var offline_renderer = audio_ctx.startRendering(); 
			if (offline_renderer)
				offline_renderer.then( offline_callback ).catch(function(err) {
					console.log('Rendering failed: ' + err);
				});
			else
				audio_ctx.oncomplete = function ( e ) {
					offline_callback ( e.renderedBuffer );
				};

			// ---------
		};
	};

	PKAudioEditor._deps.FxAUT = FXAutomation;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
	'use strict';

	var db;
	var db_name    = 'audiomass';
	var db_version = 1;
	var db_ready   = false;

	var compressors = {
		'l4z' : {
			ready: false,
			loading: false,
			compress: null,
			decompress: null,
			init : function ( callback ) {

				var q = this;
				q.loading = true;

				var lz4BlockWASM;

				lz4BlockCodec.createInstance('wasm').then(instance => {
				    lz4BlockWASM = instance;

				    q.ready = true;
				    q.loading = false;
				    q.compress = function( input, offset ) {
				    	if (!lz4BlockWASM) {
				    		if (input instanceof ArrayBuffer)
				    			return new Uint8Array(input);
				    		else
				    			return input;
				    	}

			    		return lz4BlockWASM.encodeBlock(input, 0);
					};
				    q.decompress = function( input, offset, size ) {
				    	if (!lz4BlockWASM) {
				    		if (input instanceof ArrayBuffer)
				    			return new Uint8Array(input);
				    		else
				    			return input;
				    	}

			    		return lz4BlockWASM.decodeBlock(input, 0, size);
					};

					callback && callback ();
				});
				// ---
			}
		}
	};

	var compression = 'l4z';

	function SaveLocal ( app ) {
		var q = this;
		q.on = false;

		this.Init = function ( callback ) {
			if (q.on) {
				callback && callback ();
				return ;
			}

			if (!window.indexedDB) {
				callback && callback ('err');
				return ;
			}

			var request = indexedDB.open (db_name, db_version);

			request.onerror = function(e) {
				callback && callback ('err');
				// console.error('Unable to open database.');
			};

			request.onupgradeneeded = function(e) {
				var db = e.target.result;
				db.createObjectStore('sessions', {keyPath:'id'});
			};

			request.onsuccess = function(e) {
				db = e.target.result;

				db.onerror = function( e ) {
					console.log( e );
				};

				setTimeout(function() {
					db_ready = true;
					q.on = true;

					callback && callback ();
					app.fireEvent ('DidOpenDB', q);
				},120);
			};
		};

		this.SaveSession = function ( buffer, id, name ) {
			var q = this;

			var comp = compressors[ compression ];
			if (!comp.loading && !comp.ready) {
				comp.init (function() {
					q.SaveSession (buffer, id, name);
				});

				return ;
			}

			var chans = buffer.numberOfChannels;
			var arr_buffs = [];
			var arr_buffs2 = [];
			var arr;
			var tmp;

			var sample_rate = buffer.sampleRate;

			for (var i = 0; i < chans; ++i) {
				arr = buffer.getChannelData ( i );

				arr_buffs2.push (arr.buffer.byteLength);
				tmp = comp.compress ( arr.buffer, 0);
				arr_buffs.push ( tmp.buffer.slice (tmp.byteOffset, tmp.byteLength + tmp.byteOffset));
			}

			tmp = null;

			var ob = {
				id : id,
				name: name,
				created: new Date().getTime(),
				data: arr_buffs,
				data2: arr_buffs2,
				durr: buffer.duration.toFixed(3)/1,
				chans: chans,
				comp: compression,
				thumb: PKAudioEditor.engine.GetWave (buffer),
				samplerate: sample_rate
			};

			var trans = db.transaction(['sessions'], 'readwrite');
			var addReq = trans.objectStore('sessions').add(ob);

			addReq.onerror = function(e) {
				app.fireEvent ('ErrorDB', e);

				console.log('error storing data');
				console.error(e);
			};

			trans.oncomplete = function ( e ) {
				app.fireEvent ('DidStoreDB', ob, e );
				// console.log( 'data stored', id, e );
            };
		};

		this.GetSession = function ( id, callback ) {
			var trans = db.transaction(['sessions'], 'readonly');
			//hard coded id
			var req = trans.objectStore('sessions').get(id);

			req.onsuccess = function(e) {
				// console.log( e.target.result );


				var record = e.target.result;

				if (record && record.comp)
				{
					var comp = compressors[ compression ];
					if (!comp.loading && !comp.ready) {
						comp.init (function() {

							var data_arr = [];
							var tmp = null;

							for (var i = 0; i < record.data.length; ++i) {
								tmp = comp.decompress (record.data[i], 0, record.data2[i]);
								data_arr.push ( 
									tmp.buffer.slice (tmp.byteOffset, tmp.byteLength + tmp.byteOffset)
								);
							}

							tmp = null;
							record.data = data_arr;

							callback && callback ( record );
						});

						return ;
					}

					var data_arr = [];
					var tmp = null;

					for (var i = 0; i < record.data.length; ++i) {
						tmp = comp.decompress (record.data[i], 0, record.data2[i]);
						data_arr.push ( 
							tmp.buffer.slice (tmp.byteOffset, tmp.byteLength + tmp.byteOffset)
						);
					}

					tmp = null;
					record.data = data_arr;
				}

				callback && callback ( record );
			};
		};

		this.DelSession = function ( id, callback ) {
			var trans = db.transaction(['sessions'], 'readwrite');

			var req = trans.objectStore('sessions').delete (id);
			req.onsuccess = function (e) {
				callback && callback ( id );
			};
		};

		this.ListSessions = function ( callback ) {
			var trans = db.transaction(['sessions'], 'readonly');
			var object_store = trans.objectStore('sessions');
			var req = object_store.openCursor();
			var ret = [];

			req.onerror = function(event) {
			   console.err("error fetching data");
			};
			req.onsuccess = function(event) {
			   var cursor = event.target.result;
			   if (cursor) {
			       var key = cursor.primaryKey;
			       var value = cursor.value;

			       ret.push (value);
			       cursor.continue();
			   }
			   else {
					var rr = ret.sort(function compare( a, b ) {
						  if ( a.created > b.created ){
						    return -1;
						  }
						  if ( a.created < b.created ){
						    return 1;
						  }
						  return 0;
					});

					callback && callback (rr);
			       // no more results
			   }
			};
		};
		// ---
	};

	PKAudioEditor._deps.fls = SaveLocal;

})( window, document, PKAudioEditor );
(function ( w, d, PKAE ) {
    'use strict';


    var StringUtils = {
        readUTF16String: function(bytes, bigEndian, maxBytes) {
            var ix = 0;
            var offset1 = 1, offset2 = 0;
            maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

            if( bytes[0] == 0xFE && bytes[1] == 0xFF ) {
                bigEndian = true;
                ix = 2;
            } else if( bytes[0] == 0xFF && bytes[1] == 0xFE ) {
                bigEndian = false;
                ix = 2;
            }
            if( bigEndian ) {
                offset1 = 0;
                offset2 = 1;
            }

            var arr = [];
            for( var j = 0; ix < maxBytes; j++ ) {
                var byte1 = bytes[ix+offset1];
                var byte2 = bytes[ix+offset2];
                var word1 = (byte1<<8)+byte2;
                ix += 2;
                if( word1 == 0x0000 ) {
                    break;
                } else if( byte1 < 0xD8 || byte1 >= 0xE0 ) {
                    arr[j] = String.fromCharCode(word1);
                } else {
                    var byte3 = bytes[ix+offset1];
                    var byte4 = bytes[ix+offset2];
                    var word2 = (byte3<<8)+byte4;
                    ix += 2;
                    arr[j] = String.fromCharCode(word1, word2);
                }
            }
            var string = new String(arr.join(""));
            string.bytesReadCount = ix;
            return string;
        },
        readUTF8String: function(bytes, maxBytes) {
            var ix = 0;
            maxBytes = Math.min(maxBytes||bytes.length, bytes.length);

            if( bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF ) {
                ix = 3;
            }

            var arr = [];
            for( var j = 0; ix < maxBytes; j++ ) {
                var byte1 = bytes[ix++];
                if( byte1 == 0x00 ) {
                    break;
                } else if( byte1 < 0x80 ) {
                    arr[j] = String.fromCharCode(byte1);
                } else if( byte1 >= 0xC2 && byte1 < 0xE0 ) {
                    var byte2 = bytes[ix++];
                    arr[j] = String.fromCharCode(((byte1&0x1F)<<6) + (byte2&0x3F));
                } else if( byte1 >= 0xE0 && byte1 < 0xF0 ) {
                    var byte2 = bytes[ix++];
                    var byte3 = bytes[ix++];
                    arr[j] = String.fromCharCode(((byte1&0xFF)<<12) + ((byte2&0x3F)<<6) + (byte3&0x3F));
                } else if( byte1 >= 0xF0 && byte1 < 0xF5) {
                    var byte2 = bytes[ix++];
                    var byte3 = bytes[ix++];
                    var byte4 = bytes[ix++];
                    var codepoint = ((byte1&0x07)<<18) + ((byte2&0x3F)<<12)+ ((byte3&0x3F)<<6) + (byte4&0x3F) - 0x10000;
                    arr[j] = String.fromCharCode(
                        (codepoint>>10) + 0xD800,
                        (codepoint&0x3FF) + 0xDC00
                    );
                }
            }
            var string = new String(arr.join(""));
            string.bytesReadCount = ix;
            return string;
        },
        readNullTerminatedString: function(bytes, maxBytes) {
            var arr = [];
            maxBytes = maxBytes || bytes.length;
            for ( var i = 0; i < maxBytes; ) {
                var byte1 = bytes[i++];
                if( byte1 == 0x00 ) break;
                arr[i-1] = String.fromCharCode(byte1);
            }       
            var string = new String(arr.join(""));
            string.bytesReadCount = i;
            return string;
        }
    };

    var getBytesAt = function(data, iOffset, iLength) {
        var bytes = new Array(iLength);
        for( var i = 0; i < iLength; i++ ) {
            bytes[i] = data.getUint8(iOffset+i);
        }
        return bytes;
    };
    var getStringWithCharsetAt = function(data, iOffset, iLength, iCharset) {
        var bytes = getBytesAt(data, iOffset, iLength);
        var sString;

        switch( iCharset.toLowerCase() ) {
            case 'utf-16':
            case 'utf-16le':
            case 'utf-16be':
                sString = StringUtils.readUTF16String(bytes, iCharset);
                break;

            case 'utf-8':
                sString = StringUtils.readUTF8String(bytes);
                break;

            default:
                sString = StringUtils.readNullTerminatedString(bytes);
                break;
        }

        return sString;
    };

    var ID3v2 = {
        readFrameData: {}
    };

    ID3v2.frames = {
        // v2.2
        "BUF" : "Recommended buffer size",
        "CNT" : "Play counter",
        "COM" : "Comments",
        "CRA" : "Audio encryption",
        "CRM" : "Encrypted meta frame",
        "ETC" : "Event timing codes",
        "EQU" : "Equalization",
        "GEO" : "General encapsulated object",
        "IPL" : "Involved people list",
        "LNK" : "Linked information",
        "MCI" : "Music CD Identifier",
        "MLL" : "MPEG location lookup table",
        "PIC" : "Attached picture",
        "POP" : "Popularimeter",
        "REV" : "Reverb",
        "RVA" : "Relative volume adjustment",
        "SLT" : "Synchronized lyric/text",
        "STC" : "Synced tempo codes",
        "TAL" : "Album/Movie/Show title",
        "TBP" : "BPM (Beats Per Minute)",
        "TCM" : "Composer",
        "TCO" : "Content type",
        "TCR" : "Copyright message",
        "TDA" : "Date",
        "TDY" : "Playlist delay",
        "TEN" : "Encoded by",
        "TFT" : "File type",
        "TIM" : "Time",
        "TKE" : "Initial key",
        "TLA" : "Language(s)",
        "TLE" : "Length",
        "TMT" : "Media type",
        "TOA" : "Original artist(s)/performer(s)",
        "TOF" : "Original filename",
        "TOL" : "Original Lyricist(s)/text writer(s)",
        "TOR" : "Original release year",
        "TOT" : "Original album/Movie/Show title",
        "TP1" : "Lead artist(s)/Lead performer(s)/Soloist(s)/Performing group",
        "TP2" : "Band/Orchestra/Accompaniment",
        "TP3" : "Conductor/Performer refinement",
        "TP4" : "Interpreted, remixed, or otherwise modified by",
        "TPA" : "Part of a set",
        "TPB" : "Publisher",
        "TRC" : "ISRC (International Standard Recording Code)",
        "TRD" : "Recording dates",
        "TRK" : "Track number/Position in set",
        "TSI" : "Size",
        "TSS" : "Software/hardware and settings used for encoding",
        "TT1" : "Content group description",
        "TT2" : "Title/Songname/Content description",
        "TT3" : "Subtitle/Description refinement",
        "TXT" : "Lyricist/text writer",
        "TXX" : "User defined text information frame",
        "TYE" : "Year",
        "UFI" : "Unique file identifier",
        "ULT" : "Unsychronized lyric/text transcription",
        "WAF" : "Official audio file webpage",
        "WAR" : "Official artist/performer webpage",
        "WAS" : "Official audio source webpage",
        "WCM" : "Commercial information",
        "WCP" : "Copyright/Legal information",
        "WPB" : "Publishers official webpage",
        "WXX" : "User defined URL link frame",
        // v2.3
        "AENC" : "Audio encryption",
        "APIC" : "Attached picture",
        "COMM" : "Comments",
        "COMR" : "Commercial frame",
        "ENCR" : "Encryption method registration",
        "EQUA" : "Equalization",
        "ETCO" : "Event timing codes",
        "GEOB" : "General encapsulated object",
        "GRID" : "Group identification registration",
        "IPLS" : "Involved people list",
        "LINK" : "Linked information",
        "MCDI" : "Music CD identifier",
        "MLLT" : "MPEG location lookup table",
        "OWNE" : "Ownership frame",
        "PRIV" : "Private frame",
        "PCNT" : "Play counter",
        "POPM" : "Popularimeter",
        "POSS" : "Position synchronisation frame",
        "RBUF" : "Recommended buffer size",
        "RVAD" : "Relative volume adjustment",
        "RVRB" : "Reverb",
        "SYLT" : "Synchronized lyric/text",
        "SYTC" : "Synchronized tempo codes",
        "TALB" : "Album/Movie/Show title",
        "TBPM" : "BPM (beats per minute)",
        "TCOM" : "Composer",
        "TCON" : "Content type",
        "TCOP" : "Copyright message",
        "TDAT" : "Date",
        "TDLY" : "Playlist delay",
        "TENC" : "Encoded by",
        "TEXT" : "Lyricist/Text writer",
        "TFLT" : "File type",
        "TIME" : "Time",
        "TIT1" : "Content group description",
        "TIT2" : "Title/songname/content description",
        "TIT3" : "Subtitle/Description refinement",
        "TKEY" : "Initial key",
        "TLAN" : "Language(s)",
        "TLEN" : "Length",
        "TMED" : "Media type",
        "TOAL" : "Original album/movie/show title",
        "TOFN" : "Original filename",
        "TOLY" : "Original lyricist(s)/text writer(s)",
        "TOPE" : "Original artist(s)/performer(s)",
        "TORY" : "Original release year",
        "TOWN" : "File owner/licensee",
        "TPE1" : "Lead performer(s)/Soloist(s)",
        "TPE2" : "Band/orchestra/accompaniment",
        "TPE3" : "Conductor/performer refinement",
        "TPE4" : "Interpreted, remixed, or otherwise modified by",
        "TPOS" : "Part of a set",
        "TPUB" : "Publisher",
        "TRCK" : "Track number/Position in set",
        "TRDA" : "Recording dates",
        "TRSN" : "Internet radio station name",
        "TRSO" : "Internet radio station owner",
        "TSIZ" : "Size",
        "TSRC" : "ISRC (international standard recording code)",
        "TSSE" : "Software/Hardware and settings used for encoding",
        "TYER" : "Year",
        "TXXX" : "User defined text information frame",
        "UFID" : "Unique file identifier",
        "USER" : "Terms of use",
        "USLT" : "Unsychronized lyric/text transcription",
        "WCOM" : "Commercial information",
        "WCOP" : "Copyright/Legal information",
        "WOAF" : "Official audio file webpage",
        "WOAR" : "Official artist/performer webpage",
        "WOAS" : "Official audio source webpage",
        "WORS" : "Official internet radio station homepage",
        "WPAY" : "Payment",
        "WPUB" : "Publishers official webpage",
        "WXXX" : "User defined URL link frame"
    };

    var pictureType = [
        "32x32 pixels 'file icon' (PNG only)",
        "Other file icon",
        "Cover (front)",
        "Cover (back)",
        "Leaflet page",
        "Media (e.g. lable side of CD)",
        "Lead artist/lead performer/soloist",
        "Artist/performer",
        "Conductor",
        "Band/Orchestra",
        "Composer",
        "Lyricist/text writer",
        "Recording Location",
        "During recording",
        "During performance",
        "Movie/video screen capture",
        "A bright coloured fish",
        "Illustration",
        "Band/artist logotype",
        "Publisher/Studio logotype"
    ];

    var getStringAt = function(data, iOffset, iLength) {
        var aStr = [];
        for (var i=iOffset,j=0;i<iOffset+iLength;i++,j++) {
            aStr[j] = String.fromCharCode(data.getUint8(i));
        }
        return aStr.join("");
    };
    var getLongAt = function(data, iOffset, bBigEndian) {
        var iByte1 = data.getUint8(iOffset),
            iByte2 = data.getUint8(iOffset + 1),
            iByte3 = data.getUint8(iOffset + 2),
            iByte4 = data.getUint8(iOffset + 3);

        var iLong = bBigEndian ?
            (((((iByte1 << 8) + iByte2) << 8) + iByte3) << 8) + iByte4
            : (((((iByte4 << 8) + iByte3) << 8) + iByte2) << 8) + iByte1;
        if (iLong < 0) iLong += 4294967296;
        return iLong;
    };
    var getSLongAt = function(data, iOffset, bBigEndian) {
        var iULong = getLongAt(data, iOffset, bBigEndian);
        if (iULong > 2147483647)
            return iULong - 4294967296;
        else
            return iULong;
    };
    var getShortAt = function(data, iOffset, bBigEndian) {
        var iShort = bBigEndian ?
            (data.getUint8(iOffset) << 8) + data.getUint8(iOffset + 1)
            : (data.getUint8(iOffset + 1) << 8) + data.getUint8(iOffset);
        if (iShort < 0) iShort += 65536;
        return iShort;
    };
    var getInteger24At = function(data, iOffset, bBigEndian) {
        var iByte1 = data.getUint8(iOffset),
            iByte2 = data.getUint8(iOffset + 1),
            iByte3 = data.getUint8(iOffset + 2);

        var iInteger = bBigEndian ?
            ((((iByte1 << 8) + iByte2) << 8) + iByte3)
            : ((((iByte3 << 8) + iByte2) << 8) + iByte1);
        if (iInteger < 0) iInteger += 16777216;
        return iInteger;
    };
    var isBitSetAt = function ( dataview, offset, bit ) {
        var ibyte = dataview.getUint8(offset);
        return (ibyte & (1 << bit)) != 0;
    };
    var readSynchsafeInteger32At = function (offset, data) {
        var size1 = data.getUint8(offset);
        var size2 = data.getUint8(offset+1);
        var size3 = data.getUint8(offset+2);
        var size4 = data.getUint8(offset+3);
        // 0x7f = 0b01111111
        var size = size4 & 0x7f
                 | ((size3 & 0x7f) << 7)
                 | ((size2 & 0x7f) << 14)
                 | ((size1 & 0x7f) << 21);

        return size;
    };
    var readFrameFlags = function(data, offset) {
        var flags =
        {
            message:
            {
                tag_alter_preservation  : isBitSetAt(data, offset, 6),
                file_alter_preservation : isBitSetAt(data, offset, 5),
                read_only               : isBitSetAt(data, offset, 4)
            },
            format:
            {
                grouping_identity       : isBitSetAt(data, offset+1, 7),
                compression             : isBitSetAt(data, offset+1, 3),
                encription              : isBitSetAt(data, offset+1, 2),
                unsynchronisation       : isBitSetAt(data, offset+1, 1),
                data_length_indicator   : isBitSetAt(data, offset+1, 0)
            }
        };

        return flags;
    };
    var _shortcuts = {
        "title"     : ["TIT2", "TT2"],
        "artist"    : ["TPE1", "TP1"],
        "album"     : ["TALB", "TAL"],
        "year"      : ["TYER", "TYE"],
        "comment"   : ["COMM", "COM"],
        "track"     : ["TRCK", "TRK"],
        "genre"     : ["TCON", "TCO"],
        "picture"   : ["APIC", "PIC"],
        "lyrics"    : ["USLT", "ULT"]
    };
    var _defaultShortcuts = ["title", "artist", "album", "track"];

    var getTagsFromShortcuts = function(shortcuts) {
        var tags = [];
        for( var i = 0, shortcut; shortcut = shortcuts[i]; i++ ) {
            tags = tags.concat(_shortcuts[shortcut]||[shortcut]);
        }
        return tags;
    };
    var getFrameData = function( frames, ids ) {
        if( typeof ids == 'string' ) { ids = [ids]; }

        for( var i = 0, id; id = ids[i]; i++ ) {
            if( id in frames ) { return frames[id].data; }
        }
    };
    var readFrames = function (offset, end, data, id3header, tags) {
            var frames = {};
            var frameDataSize;
            var major = id3header["major"];

            tags = getTagsFromShortcuts(tags || _defaultShortcuts);

            while( offset < end ) {
                var readFrameFunc = null;
                var frameData = data;
                var frameDataOffset = offset;
                var flags = null;

                switch( major ) {
                    case 2:
                    var frameID = getStringAt(frameData, frameDataOffset, 3);
                    var frameSize = getInteger24At(frameData, frameDataOffset+3, true);
                    var frameHeaderSize = 6;
                    break;

                    case 3:
                    var frameID = getStringAt(frameData, frameDataOffset, 4);
                    var frameSize = getLongAt(frameData, frameDataOffset+4, true);
                    var frameHeaderSize = 10;
                    break;

                    case 4:
                    var frameID = getStringAt(frameData, frameDataOffset, 4);
                    var frameSize = readSynchsafeInteger32At(frameDataOffset+4, frameData);
                    var frameHeaderSize = 10;
                    break;
                }
                // if last frame GTFO
                if( frameID == "" ) { break; }

                // advance data offset to the next frame data
                offset += frameHeaderSize + frameSize;
                // skip unwanted tags
                if( tags.indexOf( frameID ) < 0 ) { continue; }

                // read frame message and format flags
                if( major > 2 )
                {
                    flags = readFrameFlags(frameData, frameDataOffset+8);
                }

                frameDataOffset += frameHeaderSize;

                // the first 4 bytes are the real data size
                // (after unsynchronisation && encryption)
                if( flags && flags.format.data_length_indicator )
                {
                    frameDataSize = readSynchsafeInteger32At(frameDataOffset, frameData);
                    frameDataOffset += 4;
                    frameSize -= 4;
                }

                // TODO: support unsynchronisation
                if( flags && flags.format.unsynchronisation )
                {
                    //frameData = removeUnsynchronisation(frameData, frameSize);
                    continue;
                }

                // find frame parsing function

                if( frameID in ID3v2.readFrameData ) {
                    readFrameFunc = ID3v2.readFrameData[frameID];
                } else if( frameID[0] == "T" ) {
                    readFrameFunc = ID3v2.readFrameData["T*"];
                }

                var parsedData = readFrameFunc ? readFrameFunc(frameDataOffset, frameSize, frameData, flags) : undefined;
                var desc = frameID in ID3v2.frames ? ID3v2.frames[frameID] : 'Unknown';

                var frame = {
                    id          : frameID,
                    size        : frameSize,
                    description : desc,
                    data        : parsedData
                };

                if( frameID in frames ) {
                    if( frames[frameID].id ) {
                        frames[frameID] = [frames[frameID]];
                    }
                    frames[frameID].push(frame);
                } else {
                    frames[frameID] = frame;
                }
            }

            return frames;
    };

    function getTextEncoding( bite ) {
        var charset;
        switch( bite )
        {
            case 0x00:
                charset = 'iso-8859-1';
                break;

            case 0x01:
                charset = 'utf-16';
                break;

            case 0x02:
                charset = 'utf-16be';
                break;

            case 0x03:
                charset = 'utf-8';
                break;
        }

        return charset;
    }

    function getTime( duration )
    {
        var duration    = duration/1000,
            seconds     = Math.floor( duration ) % 60,
            minutes     = Math.floor( duration/60 ) % 60,
            hours       = Math.floor( duration/3600 );

        return {
            seconds : seconds,
            minutes : minutes,
            hours   : hours
        };
    }

    function formatTime( time )
    {
        var seconds = time.seconds < 10 ? '0'+time.seconds : time.seconds;
        var minutes = (time.hours > 0 && time.minutes < 10) ? '0'+time.minutes : time.minutes;

        return (time.hours>0?time.hours+':':'') + minutes + ':' + seconds;
    }

    ID3v2.readFrameData['APIC'] = function readPictureFrame(offset, length, data, flags, v) {
        v = v || '3';

        var start = offset;
        var charset = getTextEncoding( data.getUint8(offset) );
        switch( v ) {
            case '2':
                var format = getStringAt(data, offset+1, 3);
                offset += 4;
                break;

            case '3':
            case '4':
                var format = getStringWithCharsetAt(data, offset+1, length - (offset-start), '');
                offset += 1 + format.bytesReadCount;
                break;
        }
        var bite = data.getUint8(offset, 1);
        var type = pictureType[bite];
        var desc = getStringWithCharsetAt(data, offset+1, length - (offset-start), charset);

        offset += 1 + desc.bytesReadCount;

        return {
            "format" : format.toString(),
            "type" : type,
            "description" : desc.toString(),
            "data" : getBytesAt(data, offset, (start+length) - offset)
        };
    };

    ID3v2.readFrameData['COMM'] = function readCommentsFrame(offset, length, data) {
        var start = offset;
        var charset = getTextEncoding( data.getUint8(offset) );
        var language = getStringAt(data, offset+1, 3 );
        var shortdesc = getStringWithCharsetAt(data, offset+4, length-4, charset);

        offset += 4 + shortdesc.bytesReadCount;
        var text = getStringWithCharsetAt(data, offset, (start+length) - offset, charset );

        return {
            language : language,
            short_description : shortdesc.toString(),
            text : text.toString()
        };
    };

    ID3v2.readFrameData['COM'] = ID3v2.readFrameData['COMM'];

    ID3v2.readFrameData['PIC'] = function(offset, length, data, flags) {
        return ID3v2.readFrameData['APIC'](offset, length, data, flags, '2');
    };

    ID3v2.readFrameData['PCNT'] = function readCounterFrame(offset, length, data) {
        // FIXME: implement the rest of the spec
        return data.getInteger32At(offset);
    };

    ID3v2.readFrameData['CNT'] = ID3v2.readFrameData['PCNT'];

    ID3v2.readFrameData['T*'] = function readTextFrame(offset, length, data) {
        var charset = getTextEncoding( data.getUint8(offset) );

        return getStringWithCharsetAt(data, offset+1, length-1, charset).toString();
    };

    ID3v2.readFrameData['TCON'] = function readGenreFrame(offset, length, data) {
        var text = ID3v2.readFrameData['T*'].apply( this, arguments );
        return text.replace(/^\(\d+\)/, '');
    };

    ID3v2.readFrameData['TCO'] = ID3v2.readFrameData['TCON'];

    //ID3v2.readFrameData['TLEN'] = function readLengthFrame(offset, length, data) {
    //    var text = ID3v2.readFrameData['T*'].apply( this, arguments );
    //
    //    return {
    //        text : text,
    //        parsed : formatTime( getTime(parseInt(text)) )
    //    };
    //};

    ID3v2.readFrameData['USLT'] = function readLyricsFrame(offset, length, data) {
        var start = offset;
        var charset = getTextEncoding( data.getUint8(offset) );
        var language = getStringAt(data, offset+1, 3 );
        var descriptor = getStringWithCharsetAt(data, offset+4, length-4, charset );

        offset += 4 + descriptor.bytesReadCount;
        var lyrics = getStringWithCharsetAt(data, offset, (start+length) - offset, charset );

        return {
            language : language,
            descriptor : descriptor.toString(),
            lyrics : lyrics.toString()
        };
    };

    ID3v2.readFrameData['ULT'] = ID3v2.readFrameData['USLT'];


    ID3v2.ReadTags = function ( arraybuffer ) {
        var data = new DataView ( arraybuffer );
        var offset = 0;


        var major = data.getUint8(offset+3);
        if( major > 4 ) { return {version: '>2.4'}; }
        var revision = data.getUint8(offset+4);
        var unsynch = isBitSetAt(data, offset+5, 7);
        var xheader = isBitSetAt(data, offset+5, 6);
        var xindicator = isBitSetAt(data, offset+5, 5);
        var size = readSynchsafeInteger32At(offset+6, data);
        offset += 10;

        if( xheader ) {
            var xheadersize = data.getInt32( offset, true ); //data.getLongAt(offset, true);
            // The 'Extended header size', currently 6 or 10 bytes, excludes itself.
            offset += xheadersize + 4;
        }

        var id3 = {
            "version" : '2.' + major + '.' + revision,
            "major" : major,
            "revision" : revision,
            "flags" : {
                "unsynchronisation" : unsynch,
                "extended_header" : xheader,
                "experimental_indicator" : xindicator
            },
            "size" : size
        };

        var frames = unsynch ? {} : readFrames(offset, size-10, data, id3);
        // create shortcuts for most common data
        for( var name in _shortcuts ) if(_shortcuts.hasOwnProperty(name)) {
            var data = getFrameData( frames, _shortcuts[name] );
            if( data ) id3[name] = data;
        }

        for( var frame in frames ) {
            if( frames.hasOwnProperty(frame) ) {
                id3[frame] = frames[frame];
            }
        }

        return id3;
    };

    w.ID3v2 = ID3v2;


    /// -------

    var ID4 = {};

    ID4.types = {
        '0'     : 'uint8',
        '1'     : 'text',
        '13'    : 'jpeg',
        '14'    : 'png',
        '21'    : 'uint8'
    };
    ID4.atom = {
        '©alb': ['album'],
        '©art': ['artist'],
        '©ART': ['artist'],
        'aART': ['artist'],
        '©day': ['year'],
        '©nam': ['title'],
        '©gen': ['genre'],
        'trkn': ['track'],
        '©wrt': ['composer'],
        '©too': ['encoder'],
        'cprt': ['copyright'],
        'covr': ['picture'],
        '©grp': ['grouping'],
        'keyw': ['keyword'],
        '©lyr': ['lyrics'],
        '©cmt': ['comment'],
        'tmpo': ['tempo'],
        'cpil': ['compilation'],
        'disk': ['disc']
    };

    ID4.loadData = function(arraybuffer, callback) {
        var data = new DataView ( arraybuffer );
        // load the header of the first block
        loadAtom(data, 0, data.byteLength, callback);
    };

    /**
     * Make sure that the [offset, offset+7] bytes (the block header) are
     * already loaded before calling this function.
     */
    function loadAtom(data, offset, length, callback) {
        // 8 is the size of the atomSize and atomName fields.
        // When reading the current block we always read 8 more bytes in order
        // to also read the header of the next block.
        var atomSize = getLongAt(data, offset, true);
        if (atomSize == 0) return callback();
        var atomName = getStringAt(data, offset + 4, 4);

        // Container atoms
        if (['moov', 'udta', 'meta', 'ilst'].indexOf(atomName) > -1)
        {
            if (atomName == 'meta') offset += 4; // next_item_id (uint32)
            // data.loadRange([offset+8, offset+8 + 8], function() {
                loadAtom(data, offset + 8, atomSize - 8, callback);
            // });
        } else {
            // Value atoms
            var readAtom = atomName in ID4.atom;
            // data.loadRange([offset+(readAtom?0:atomSize), offset+atomSize + 8], function() {
                loadAtom(data, offset+atomSize, length, callback);
            // });
        }
    };

    ID4.ReadTags = function(arraybuffer) {
        var data = new DataView ( arraybuffer );
        var tag = {};
        readAtom(tag, data, 0, data.byteLength);
        return tag;
    };

    function readAtom(tag, data, offset, length, indent)
    {
        // debugger;

        indent = indent === undefined ? "" : indent + "  ";
        var seek = offset;
        while (seek < offset + length)
        {
            var atomSize = data.getInt32(seek); // getLongAt(data, seek, true);
            if (atomSize == 0) return;
            var atomName = getStringAt(data, seek + 4, 4);
            // Container atoms
            if (atomName === 'meta')
            {
                seek += 4; // next_item_id (uint32)
                readAtom(tag, data, seek + 8, atomSize - 8, indent);
                return; 
            }
            if (atomName === 'moov' || atomName === 'udta' || atomName === 'ilst' ) // ['moov', 'udta', 'meta', 'ilst'].indexOf(atomName) > -1)
            {
                readAtom(tag, data, seek + 8, atomSize - 8, indent);
                return;
            }

            /*
            if (['moov', 'udta', 'meta', 'ilst'].indexOf(atomName) > -1)
            {
                if (atomName === 'meta') seek += 4; // next_item_id (uint32)
                readAtom(tag, data, seek + 8, atomSize - 8, indent);
                return;
            }
            */

            // Value atoms
            if (ID4.atom[atomName])
            {
                var klass = getInteger24At(data, seek + 16 + 1, true);
                var atom = ID4.atom[atomName];
                var type = ID4.types[klass];
                if (atomName === 'trkn')
                {
                    tag[atom[0]] = data.getUint8(seek + 16 + 11);
                    tag['count'] = data.getUint8(seek + 16 + 13);
                }
                else
                {
                    // 16: name + size + "data" + size (4 bytes each)
                    // 4: atom version (1 byte) + atom flags (3 bytes)
                    // 4: NULL (usually locale indicator)
                    var dataStart = seek + 16 + 4 + 4;
                    var dataEnd = atomSize - 16 - 4 - 4;
                    var atomData;
                    switch( type ) {
                        case 'text':
                            atomData = getStringWithCharsetAt(data, dataStart, dataEnd, "UTF-8");
                            break;

                        case 'uint8':
                            atomData = getShortAt(data, dataStart);
                            break;

                        case 'jpeg':
                        case 'png':
                            atomData = {
                                format  : "image/" + type,
                                data    : getBytesAt(data, dataStart, dataEnd)
                            };
                            break;
                    }

                    if (atom[0] === "comment") {
                        tag[atom[0]] = {
                            "text": atomData
                        };
                    } else {
                        tag[atom[0]] = atomData;
                    }
                }
            }
            seek += atomSize;
        }
    }

    w.ID4 = ID4;

})( window, document, PKAudioEditor );
/*******************************************************************************

    lz4-block-codec-any.js
        A wrapper to instanciate a wasm- and/or js-based LZ4 block
        encoder/decoder.
    Copyright (C) 2018 Raymond Hill

    BSD-2-Clause License (http://www.opensource.org/licenses/bsd-license.php)

    Redistribution and use in source and binary forms, with or without
    modification, are permitted provided that the following conditions are
    met:

    1. Redistributions of source code must retain the above copyright
    notice, this list of conditions and the following disclaimer.

    2. Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the following disclaimer
    in the documentation and/or other materials provided with the
    distribution.

    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
    "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
    LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
    A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
    OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
    SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
    LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
    DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
    THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
    (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
    OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

    Home: https://github.com/gorhill/lz4-wasm

    I used the same license as the one picked by creator of LZ4 out of respect
    for his creation, see https://lz4.github.io/lz4/

*/

'use strict';

/******************************************************************************/

(function(context) {                    // >>>> Start of private namespace

/******************************************************************************/

let wd = (function() {
    let url = document.currentScript.src;
    let match = /[^\/]+$/.exec(url);
    return match !== null ?
        url.slice(0, match.index) :
        '';
})();

let removeScript = function(script) {
    if ( !script ) { return; }
    if ( script.parentNode === null ) { return; }
    script.parentNode.removeChild(script);
};

let createInstanceWASM = function() {
    if ( context.LZ4BlockWASM instanceof Function ) {
        let instance = new context.LZ4BlockWASM();
        return instance.init().then(( ) => { return instance; });
    }
    if ( context.LZ4BlockWASM === null ) {
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        let script = document.createElement('script');
        script.src = wd + 'lz4-block-codec-wasm.js';
        script.addEventListener('load', ( ) => {
            if ( context.LZ4BlockWASM instanceof Function === false ) {
                context.LZ4BlockWASM = null;
                context.LZ4BlockWASM = undefined;
                resolve(null);
            } else {
                let instance = new context.LZ4BlockWASM();
                instance.init()
                    .then(( ) => {
                        resolve(instance);
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        });
        script.addEventListener('error', ( ) => {
            context.LZ4BlockWASM = null;
            resolve(null);
        });
        document.head.appendChild(script);
        removeScript(script);
    });
};

let createInstanceJS = function() {
    if ( context.LZ4BlockJS instanceof Function ) {
        let instance = new context.LZ4BlockJS();
        return instance.init().then(( ) => { return instance; });
    }
    if ( context.LZ4BlockJS === null ) {
        return Promise.resolve(null);
    }
    return new Promise((resolve, reject) => {
        let script = document.createElement('script');
        script.src = wd + 'lz4-block-codec-js.js';
        script.addEventListener('load', ( ) => {
            if ( context.LZ4BlockJS instanceof Function === false ) {
                context.LZ4BlockJS = null;
                resolve(null);
            } else {
                let instance = new context.LZ4BlockJS();
                instance.init()
                    .then(( ) => {
                        resolve(instance);
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
        });
        script.addEventListener('error', ( ) => {
            context.LZ4BlockJS = null;
            resolve(null);
        });
        document.head.appendChild(script);
        removeScript(script);
    });
};

/******************************************************************************/

context.lz4BlockCodec = {
    createInstance: function(flavor) {
        let instantiator;
        if ( flavor === 'wasm' ) {
            instantiator = createInstanceWASM;
        } else if ( flavor === 'js' ) {
            instantiator = createInstanceJS;
        } else {
            instantiator = createInstanceWASM || createInstanceJS;
        }
        return (instantiator)()
            .then(instance => {
                if ( instance ) { return instance; }
                if ( flavor === undefined ) {
                    return createInstanceJS();
                }
                return null;
            })
            .catch(( ) => {
                if ( flavor === undefined ) {
                    return createInstanceJS();
                }
                return null;
            });
    },
    reset: function() {
        context.LZ4BlockWASM = undefined;
        context.LZ4BlockJS = undefined;
    }
};

/******************************************************************************/

})(this || self);                       // <<<< End of private namespace
