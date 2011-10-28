/* Author: Jonas Skovmand <jonas@satf.se>
This is in no way endorsed by or affiliated with Herraiz Soto & Co or OMMWRITER.

*/


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
	
	this.submergeTimer;
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
		if ( this.submerged )
			this.resurface();
		clearTimeout(this.submergeTimer);
		this.submergeTimer = setTimeout(this.submerge, this.settings.submergeTimeout);
	};
	
	this.submerge = function () {
		this.submerged = true;
		$('#canvas').focus();
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
		if ( value == 'off' )
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
			this._keyboardSounds[i] = new Audio;
			this._keyboardSounds[i].src = this.settings.keyboardSoundFolder + sounds[i] + '.' + this.settings.audioMode;
			this._keyboardSounds[i].volume = parseFloat(volume);
			this._keyboardSounds[i].load();
		}
		
		
		$('#canvas').bind('keyup.keyboardsounds',function(){
			oww._keyboardSounds[Math.floor(Math.random()*oww._keyboardSounds.length)].play();
		});
	};
	
	this.setBackgroundSound = function ( value ) {
		if ( value == 'off' )
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
			this._backgroundSound = new Audio;
			this._backgroundSound.addEventListener('ended', function(){this.play()}, false);
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
			$canvas.removeClass($canvas.data('oww-font-size'))
		}
		$canvas.data('oww-font-size',value).addClass(value);
	};
	
	this.setFont = function ( value ) {
		value = 'oww-font-' + value;
		var $canvas = $('#canvas');
		if ( $canvas.data('oww-font') )
		{
			$canvas.removeClass($canvas.data('oww-font'))
		}
		$canvas.data('oww-font',value).addClass(value);
	};
	
	this.utilityAction = function ( value ) {
		// save etc.
	};
	
	this.countWords = function ( string ) {
		return string.length == 0 ? 0 : string.match(/\b\S+\b/g).length;
	}
	
	this.save = function ( key, value ) {
		if ( key == 'utilities' ) return;
		this.user_settings[key] = value;
		this.sticky.set(this.settings.saveKey, this.user_settings);
	}
	
	return this;
})();

$(function(){
	
	$('#toolbar .oww-menu li')
		.hover(function(){
			var $o = $(this);
			if ( $o.hasClass('oww-enabled') ) return;
			$o.addClass('oww-hover');
		}, function(){
			$(this).removeClass('oww-hover');
		}).click(function(){
			$o = $(this);
			var $old = $o.siblings('.oww-enabled')
			if ( $old.length > 0 )
			{
				var $oimg = $old.first().removeClass('oww-enabled').find('img');
				$oimg.attr('src', $oimg.attr('src').replace('.png', '_.png'));
			}
			
			$o.removeClass('oww-hover').addClass('oww-enabled');
			var $img = $o.find('img');
			$img.attr('src', $img.attr('src').replace('_', '') );
			OWWMRITER.save($o.parents('.oww-menu').attr('data-menu'), $o.attr('data-key'));
			OWWMRITER[$o.attr('data-function')]($o.attr('data-value'));
			$('#canvas').focus();
			return false;
		})
	;
	
	
	var _saved = OWWMRITER.user_settings;
	
	if ( _saved != null )
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
	
});