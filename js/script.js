/* Author: Jonas Skovmand <jonas@satf.se>
This is in no way endorsed by or affiliated with Herraiz Soto & Co or OMMWRITER.
*/

var OWWMRITER_SimpleNote = (function () {
	var O_sn = this, O_auth = false, O_token = false, instance;
	
	function isAuthed () {
		return O_auth === true;
	}
	
	function getInstance () {
		if ( typeof instance === 'undefined' )
		{
			instance = new SimpleNote();
		}
		
		return instance;
	}
	
	function handleAuth(auth)
	{
		if ( auth.email && auth.token )
		{
			O_auth = true;
		}
		else
		{
			O_auth = false;
		}
	}
	
	function fakeAuth ( obj ) {
		var SN = this.getInstance();
		SN.fakeAuth(obj);
	}
	
	function auth ( email, password, callback ) {
		var SN = this.getInstance();
		SN.auth({
			"email": email,
			"password": password,
			success: function() {
				OWWMRITER_SimpleNote.handleAuth(SN.getAuthDetails());
				if ( typeof callback === 'function' )
				{
					callback({response:'success', auth: SN.getAuthDetails()});
				}
			},
			error: function( code ) {
				if ( typeof callback === 'function' )
				{
					callback({response:'error', message: code});
				}
			}
		});
	}
	
	function list ( callback ) {
		var SN = this.getInstance();
		SN.retrieveIndex({
			success: function( resultsArray ) {
				var l = resultsArray.length;
				for ( var i=0; i<l; i++)
				{
					if ( resultsArray[i].deleted == true ) continue; // ignore deleted
					SN.retrieveNote({
						key: resultsArray[i].key,
						success: function(notehash){
							if ( typeof callback === 'function' )
							{
								callback( { response: 'success', result: notehash });
							}
						},
						error: function (code) {
							callback( { response: 'error', message: code });
						}
					});
				}
				
			},
			error: function( code ) {
				if ( typeof callback === 'function' )
				{
					callback( { response: 'error', message: code } );
				}
			}
		});
	}

	function open ( obj ) {
		var SN = this.getInstance();
		SN.retrieveNote({
			"key": obj.key,
			success: obj.success,
			error: obj.error
		});
	}
	
	function create ( obj ) {
		
		if ( !obj.success || !obj.error ) {
			throw "Callback error";
		}
		
		var SN = this.getInstance();
		SN.createNote({
			"body": obj.body,
			success: obj.success,
			error: obj.error
		});
	}
	
	function save ( key, body ) {
		var SN = this.getInstance();
		
		if ( !key )
		{
			SN.createNote({
				"body": body,
				success: function( noteID ) {
					console.info( noteID );
				},
				error: function( code ) {
					console.error( code );
				}
			});
		}

		SN.updateNote({
			"key": key,
			"body": body,
			success: function( noteID ) {
				console.info( noteID );
				// >> "[SimpleNote-internal ID string]"
			},
			error: function( code ) {
				console.error( code );
			}
		});
	}
	
	return {
		isAuthed: isAuthed,
		getInstance: getInstance,
		fakeAuth: fakeAuth,
		auth: auth,
		list: list,
		open: open,
		save: save,
		create: create,
		handleAuth: handleAuth
	};
})();

var OWWMRITER = (function() {
	var oww = this;
	this.settings = {
		saveKey: 'oww_user_settings',
		submergeTimeout: 2500, // milliseconds
		imageBackgroundFolder: 'images/backgrounds/', // relative to index path
		keyboardSoundFolder: 'sounds/keyboard/',
		backgroundSoundFolder: 'sounds/background/',
		audioMode: 'wav'
	};
	
	OWWMRITER_SimpleNote.getInstance().setOpenDataTable('http://xn--stf-qla.se/owwmriter/js/yql_simplenote.xml');
	
	this.snnotes = [];
	this.submerged = false;
	this._keyboardSounds = [];
	
	if ( Modernizr.audio.mp3 )
	{
		this.settings.audioMode = 'mp3';
	}
	else if ( Modernizr.audio.ogg )
	{
		this.settings.audioMode = 'ogg';
	}
	
	this.sticky = new StickyStore();
	this.user_settings = this.sticky.get(this.settings.saveKey) || {};
	
	this.moved = function() {
		if ( this.submerged && !$('#colorbox').is(':visible') )
		{
			this.resurface();
		}
		clearTimeout(this.submergeTimer);
		this.submergeTimer = setTimeout(this.submerge, this.settings.submergeTimeout);
	};
	
	this.submerge = function () {
		this.submerged = true;
		if ( !$('#colorbox').is(':visible') )
		{
			$('#canvas').focus();
		}
		$('body').addClass('oww-submerged');
	};
	
	this.resurface = function () {
		this.submerged = false;
		$('body').removeClass('oww-submerged');
	};
	
	this.setBackground = function ( value ) {
		var $owb = $('#oww-background').length > 0 ? $('#oww-background') : $('<div/>').append($('<img/>').attr('id','oww-background')).prependTo('body').find('#oww-background');
		$owb.attr('src', this.settings.imageBackgroundFolder + value);
	};
	
	this.setKeyboardSound = function ( value ) {
		if ( value === 'off' )
		{
			// disable keyboard sound.
			$('#canvas').unbind('keyup.keyboardsounds');
			this._keyboardSounds = [];
			return;
		}
		
		this._keyboardSounds = [];
		value = value.split('|');
		var volume = value[0];
		var sounds = value[1].split(',');
		for ( var i=0; i<sounds.length; i++ )
		{
			this._keyboardSounds[i] = new Audio();
			this._keyboardSounds[i].src = this.settings.keyboardSoundFolder + sounds[i] + '.' + this.settings.audioMode;
			this._keyboardSounds[i].volume = parseFloat(volume);
			this._keyboardSounds[i].load();
		}
		
		
		$('#canvas').bind('keyup.keyboardsounds',function(){
			oww._keyboardSounds[Math.floor(Math.random()*oww._keyboardSounds.length)].play();
		});
	};
	
	this.setBackgroundSound = function ( value ) {
		if ( value === 'off' )
		{
			// disable keyboard sound.
			if ( this._backgroundSound )
			{
				this._backgroundSound.pause();
			}
			return;
		}
		
		// fade out, fade in music?
		
		value = value.split('|');
		var volume = value[0];
		var sound = value[1];
		
		if ( !this._backgroundSound )
		{
			this._backgroundSound = new Audio();
			this._backgroundSound.addEventListener('ended', function(){this.play();}, false);
		}
		else
		{
			this._backgroundSound.pause();
			this._backgroundSound.currentTime = 0;
		}
		
		sound = this.settings.backgroundSoundFolder + sound + '.' + this.settings.audioMode;
		this._backgroundSound.src = sound;
		this._backgroundSound.volume = parseFloat(volume);
		this._backgroundSound.play();
	};
	
	this.setFontSize = function ( value ) {
		value = 'oww-font-size-' + value;
		var $canvas = $('#canvas');
		if ( $canvas.data('oww-font-size') )
		{
			$canvas.removeClass($canvas.data('oww-font-size'));
		}
		$canvas.data('oww-font-size',value).addClass(value);
	};
	
	this.setFont = function ( value ) {
		value = 'oww-font-' + value;
		var $canvas = $('#canvas');
		if ( $canvas.data('oww-font') )
		{
			$canvas.removeClass($canvas.data('oww-font'));
		}
		$canvas.data('oww-font',value).addClass(value);
	};
	
	this.countWords = function ( string ) {
		return string.length === 0 ? 0 : string.match(/\b\S+\b/g).length;
	};
	
	this.loginPrompt = function ( ){
		this.submerge();
		$.colorbox({
			href:'#simplenote-login',
			inline:true,
			onComplete:function(){$('#colorbox input:first').focus();}
		});
		return false;
	};
	
	this.checkAuth = function ( obj ) {
		var auth = OWWMRITER_SimpleNote.isAuthed(), savedAuth = this.getSavedAuth();
		
		if ( !auth && typeof savedAuth !== 'undefined' && savedAuth.email && savedAuth.token )
		{
			OWWMRITER_SimpleNote.fakeAuth($.extend({}, savedAuth, {
				success: function(){
					OWWMRITER_SimpleNote.handleAuth(savedAuth);
					obj.success();
				},
				error: function(){
					OWWMRITER_SimpleNote.handleAuth({});
					oww.removeSavedAuth();
					obj.error();
				}
			}));
			return false;
		}
		
		if ( !auth )
		{
			this.loginPrompt();
		}
		
		return true;
	};
	
	this.save = function ( saveas ) {
		var key = this.getKey(), saveas = typeof saveas == 'undefined' || !saveas || saveas == 'save' ? false : true, res = this.checkAuth({
			success: function(){
				console.log('saveas', saveas);
				oww.save(saveas);
			},
			error: function(){
				oww.save(saveas);
			}
		});
		
		if ( !res ) return;
		
		if ( typeof key == 'undefined' || saveas )
		{
			this.submerge();
			this.saveAsDialog();
			return;
		}
		
		OWWMRITER_SimpleNote.save(key, $('#canvas').val());
	};
	
	this.saveas = function () {
		this.save(true);
	};
	
	this.open = function () {
		var res = this.checkAuth({
			success: function(){
				oww.open();
			},
			error: function(){
				oww.open();
			}
		});
			
		if ( !res ) return;
		this.submerge();
		this.snnotes = [];
		OWWMRITER_SimpleNote.list(this.populateOpenCallback);
	};
	
	this.load = function ( key ) {
		this.saveKey(key);
		OWWMRITER_SimpleNote.open({
			'key': key,
			success: function(res) { $('#canvas').val(res.body); },
			error: function(res) { console.log('ERROR',res); }
		});
	}
	
	this.saveSettings = function ( key, value ) {
		if ( key === 'utilities' )
		{
			return;
		}
		this.user_settings[key] = value;
		this.sticky.set(this.settings.saveKey, this.user_settings);
	};
	
	this.getSetting = function ( key ) {
		return this.user_settings[key];
	};
	
	this.removeSetting = function ( key ) {
		delete this.user_settings[key];
		this.sticky.set(this.settings.saveKey, this.user_settings);
	};
	
	this.getSavedAuth = function ( ) {
		return this.getSetting('sn');
	};
	
	this.removeSavedAuth = function ( ) {
		this.removeSetting('sn');
	};
	
	this.saveAuth = function ( ) {
		this.saveSettings('sn', OWWMRITER_SimpleNote.getInstance().getAuthDetails());
	};
	
	this.getKey = function ( ) {
		return this.getSetting('sncurrentkey');
	};
	
	this.saveKey = function ( key ) {
		this.saveSettings ( 'sncurrentkey', key );
	};
	
	this.saveAsDialog = function ( ) {
		this.snnotes = [];
		OWWMRITER_SimpleNote.list(this.populateSaveAsCallback);
	};
	
	this.newSimpleNote = function ( ) {
		OWWMRITER_SimpleNote.create({
			"body": $('#canvas').val(),
			success: function ( key ) {
				oww.saveKey ( key );
			},
			error: function ( code ) {
				console.log ('ERROR', code );
			}
		});
	};
	
	this.populateCallback = function ( response, $el ) {
		if ( response.response == 'success' )
		{
			if ( this.snnotes.length === 0 )
			{
				$el.find('ul li').remove();
				$.colorbox({
					href:$el.selector,
					width: '500px',
					inline:true
				});
			}
			
			if ( response.result.deleted )
			{
				return;
			}
			
			this.snnotes.push(response.result);
			$el.find('ul').append($('<li/>').data('key', response.result.key).text(response.result.body.split("\n")[0]));
			
		}
		else
		{
			// ERROR
			console.log('ERROR', response.message);
			console.log(response);
		}
	}
	
	this.populateOpenCallback = function ( response ) {
		this.populateCallback ( response, $('#simplenote-list-open') );
	};
	
	this.populateSaveAsCallback = function ( response ) {
		this.populateCallback ( response, $('#simplenote-list') );
	};
	
	return this;
})();


$(function(){
	
	$('#toolbar .oww-menu li')
		.hover(function(){
			var $o = $(this);
			if ( $o.hasClass('oww-enabled') ) {
				return;
			}
			$o.addClass('oww-hover');
		}, function(){
			$(this).removeClass('oww-hover');
		}).click(function(){
			var $o = $(this), $old = $o.siblings('.oww-enabled');
			if ( $old.length > 0 )
			{
				var $oimg = $old.first().removeClass('oww-enabled').find('img');
				$oimg.attr('src', $oimg.attr('src').replace('.png', '_.png'));
			}
			
			$o.removeClass('oww-hover').addClass('oww-enabled');
			var $img = $o.find('img');
			$img.attr('src', $img.attr('src').replace('_', '') );
			OWWMRITER.saveSettings($o.parents('.oww-menu').attr('data-menu'), $o.attr('data-key'));
			OWWMRITER[$o.attr('data-function')]($o.attr('data-value'));
			$('#canvas').focus();
			return false;
		})
	;
	
	var _saved = OWWMRITER.user_settings;
	
	if ( _saved !== null )
	{
		$('#toolbar .oww-menu').each(function(index){
			var key = $(this).attr('data-menu');
			if ( typeof _saved[key] != 'undefined' )
			{
				
				$(this).find('li[data-key=' + _saved[key] + ']').attr('data-saved', true);
			}
			
		});
	}
	
	$('#toolbar .oww-menu').each(function(index){
		if ( $(this).find('[data-saved]').length > 0 )
		{
			$(this).find('[data-saved]').click();
		}
		else
		{
			$(this).find('[data-default]').click();
		}
	});
	
	$('body').mousemove(function(event){
		OWWMRITER.moved();
	}).mousemove();
	
	$('#canvas').bind('keyup.canvas click.canvas blur.canvas focus.canvas change.canvas paste.canvas', function(event){
		$('#wordcount').text(OWWMRITER.countWords($(this).val()));
	}).focus();
	
	$('#simplenote-create-new').live('click', function(){
		OWWMRITER.newSimpleNote();
		$.colorbox.close();
		return false;
	});
	
	$('#simplenote-list-refresh').live('click', function(){
		OWWMRITER.snnotes = [];
		OWWMRITER.saveAsDialog();
		return false;
	});
	
	$('#simplenote-login-form').live('submit', function(){
		var O_form = $(this);
		OWWMRITER_SimpleNote.auth(O_form.find('input[name=email]').val(), O_form.find('input[name=password]').val(), function(data){
			if ( data.response === 'success' )
			{
				OWWMRITER.saveAuth();
				OWWMRITER.saveAsDialog();
			}
			else
			{
				console.log('ERROR', data.message);
				console.log(data);
			}
		});
		return false;
	});
	
	$('#simplenote-list-notes li').live('click', function(){
		OWWMRITER.saveKey($(this).data('key'));
		$.colorbox.close();
		return false;
	});
	
	$('#simplenote-list-open-notes li').live('click', function(){
		OWWMRITER.load($(this).data('key'));
		$.colorbox.close();
		return false;
	});
	
});