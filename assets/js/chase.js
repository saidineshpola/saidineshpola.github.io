/*
 * Cursor chase: the mouse runs after the pointer, the cat runs after the mouse.
 * Stop moving and all three end up in the same spot. Toggled from the options
 * menu and remembered in localStorage.
 */
(function (window, document) {
	'use strict';

	var SPRITES = [
		{ glyph: '\uD83D\uDC01', size: 20, ease: 0.16 },
		{ glyph: '\uD83D\uDC08', size: 26, ease: 0.075 }
	];

	var pointer = { x: -1, y: -1 };
	var sprites = [];
	var frame = null;
	var woken = false;

	function canRun() {
		if (!window.matchMedia) return false;
		if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return false;
		return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	function build() {
		if (sprites.length) return;
		for (var i = 0; i < SPRITES.length; i++) {
			var node = document.createElement('div');
			node.className = 'chase-sprite';
			node.setAttribute('aria-hidden', 'true');
			node.style.fontSize = SPRITES[i].size + 'px';
			node.textContent = SPRITES[i].glyph;
			document.body.appendChild(node);
			sprites.push({
				node: node,
				x: pointer.x,
				y: pointer.y,
				ease: SPRITES[i].ease,
				facing: 1
			});
		}
	}

	function step() {
		var targetX = pointer.x;
		var targetY = pointer.y;

		for (var i = 0; i < sprites.length; i++) {
			var s = sprites[i];
			var dx = targetX - s.x;
			var dy = targetY - s.y;

			s.x += dx * s.ease;
			s.y += dy * s.ease;

			// The glyphs face left, so flip them when heading right.
			if (dx > 1) s.facing = -1;
			else if (dx < -1) s.facing = 1;

			s.node.style.transform = 'translate3d(' + Math.round(s.x) + 'px,' + Math.round(s.y) +
				'px,0) translate(-50%,-50%) scaleX(' + s.facing + ')';

			// Each sprite chases the one in front of it.
			targetX = s.x;
			targetY = s.y;
		}

		frame = window.requestAnimationFrame(step);
	}

	function onMove(event) {
		pointer.x = event.clientX;
		pointer.y = event.clientY;

		if (!woken) {
			woken = true;
			for (var i = 0; i < sprites.length; i++) {
				sprites[i].x = pointer.x;
				sprites[i].y = pointer.y;
				sprites[i].node.classList.add('is-awake');
			}
		}
	}

	function start() {
		build();
		document.addEventListener('mousemove', onMove);
		if (!frame) frame = window.requestAnimationFrame(step);
	}

	function stop() {
		document.removeEventListener('mousemove', onMove);
		if (frame) window.cancelAnimationFrame(frame);
		frame = null;
		woken = false;
		for (var i = 0; i < sprites.length; i++) sprites[i].node.classList.remove('is-awake');
	}

	function isOn() {
		return localStorage.getItem('chase') !== 'off';
	}

	function paintButton() {
		var button = document.getElementById('chase');
		if (button) button.classList.toggle('off', !isOn());
	}

	var CursorChase = {
		supported: canRun(),

		init: function () {
			if (!CursorChase.supported) {
				var button = document.getElementById('chase');
				if (button) button.remove();
				return;
			}
			paintButton();
			if (isOn()) start();
		},

		toggle: function () {
			if (!CursorChase.supported) return;
			localStorage.setItem('chase', isOn() ? 'off' : 'on');
			paintButton();
			if (isOn()) start();
			else stop();
		}
	};

	window.CursorChase = CursorChase;

	if (document.readyState !== 'loading') CursorChase.init();
	else document.addEventListener('DOMContentLoaded', CursorChase.init);
})(window, document);
