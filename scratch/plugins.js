/**
 * Owl Carousel v2.3.4
 * Copyright 2013-2018 David Deutsch
 * Licensed under: SEE LICENSE IN https://github.com/OwlCarousel2/OwlCarousel2/blob/master/LICENSE
 */
/**
 * Owl carousel
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 * @todo Lazy Load Icon
 * @todo prevent animationend bubling
 * @todo itemsScaleUp
 * @todo Test Zepto
 * @todo stagePadding calculate wrong active classes
 */
;(function($, window, document, undefined) {

	/**
	 * Creates a carousel.
	 * @class The Owl Carousel.
	 * @public
	 * @param {HTMLElement|jQuery} element - The element to create the carousel for.
	 * @param {Object} [options] - The options
	 */
	function Owl(element, options) {

		/**
		 * Current settings for the carousel.
		 * @public
		 */
		this.settings = null;

		/**
		 * Current options set by the caller including defaults.
		 * @public
		 */
		this.options = $.extend({}, Owl.Defaults, options);

		/**
		 * Plugin element.
		 * @public
		 */
		this.$element = $(element);

		/**
		 * Proxied event handlers.
		 * @protected
		 */
		this._handlers = {};

		/**
		 * References to the running plugins of this carousel.
		 * @protected
		 */
		this._plugins = {};

		/**
		 * Currently suppressed events to prevent them from being retriggered.
		 * @protected
		 */
		this._supress = {};

		/**
		 * Absolute current position.
		 * @protected
		 */
		this._current = null;

		/**
		 * Animation speed in milliseconds.
		 * @protected
		 */
		this._speed = null;

		/**
		 * Coordinates of all items in pixel.
		 * @todo The name of this member is missleading.
		 * @protected
		 */
		this._coordinates = [];

		/**
		 * Current breakpoint.
		 * @todo Real media queries would be nice.
		 * @protected
		 */
		this._breakpoint = null;

		/**
		 * Current width of the plugin element.
		 */
		this._width = null;

		/**
		 * All real items.
		 * @protected
		 */
		this._items = [];

		/**
		 * All cloned items.
		 * @protected
		 */
		this._clones = [];

		/**
		 * Merge values of all items.
		 * @todo Maybe this could be part of a plugin.
		 * @protected
		 */
		this._mergers = [];

		/**
		 * Widths of all items.
		 */
		this._widths = [];

		/**
		 * Invalidated parts within the update process.
		 * @protected
		 */
		this._invalidated = {};

		/**
		 * Ordered list of workers for the update process.
		 * @protected
		 */
		this._pipe = [];

		/**
		 * Current state information for the drag operation.
		 * @todo #261
		 * @protected
		 */
		this._drag = {
			time: null,
			target: null,
			pointer: null,
			stage: {
				start: null,
				current: null
			},
			direction: null
		};

		/**
		 * Current state information and their tags.
		 * @type {Object}
		 * @protected
		 */
		this._states = {
			current: {},
			tags: {
				'initializing': [ 'busy' ],
				'animating': [ 'busy' ],
				'dragging': [ 'interacting' ]
			}
		};

		$.each([ 'onResize', 'onThrottledResize' ], $.proxy(function(i, handler) {
			this._handlers[handler] = $.proxy(this[handler], this);
		}, this));

		$.each(Owl.Plugins, $.proxy(function(key, plugin) {
			this._plugins[key.charAt(0).toLowerCase() + key.slice(1)]
				= new plugin(this);
		}, this));

		$.each(Owl.Workers, $.proxy(function(priority, worker) {
			this._pipe.push({
				'filter': worker.filter,
				'run': $.proxy(worker.run, this)
			});
		}, this));

		this.setup();
		this.initialize();
	}

	/**
	 * Default options for the carousel.
	 * @public
	 */
	Owl.Defaults = {
		items: 3,
		loop: false,
		center: false,
		rewind: false,
		checkVisibility: true,

		mouseDrag: true,
		touchDrag: true,
		pullDrag: true,
		freeDrag: false,

		margin: 0,
		stagePadding: 0,

		merge: false,
		mergeFit: true,
		autoWidth: false,

		startPosition: 0,
		rtl: false,

		smartSpeed: 250,
		fluidSpeed: false,
		dragEndSpeed: false,

		responsive: {},
		responsiveRefreshRate: 200,
		responsiveBaseElement: window,

		fallbackEasing: 'swing',
		slideTransition: '',

		info: false,

		nestedItemSelector: false,
		itemElement: 'div',
		stageElement: 'div',

		refreshClass: 'owl-refresh',
		loadedClass: 'owl-loaded',
		loadingClass: 'owl-loading',
		rtlClass: 'owl-rtl',
		responsiveClass: 'owl-responsive',
		dragClass: 'owl-drag',
		itemClass: 'owl-item',
		stageClass: 'owl-stage',
		stageOuterClass: 'owl-stage-outer',
		grabClass: 'owl-grab'
	};

	/**
	 * Enumeration for width.
	 * @public
	 * @readonly
	 * @enum {String}
	 */
	Owl.Width = {
		Default: 'default',
		Inner: 'inner',
		Outer: 'outer'
	};

	/**
	 * Enumeration for types.
	 * @public
	 * @readonly
	 * @enum {String}
	 */
	Owl.Type = {
		Event: 'event',
		State: 'state'
	};

	/**
	 * Contains all registered plugins.
	 * @public
	 */
	Owl.Plugins = {};

	/**
	 * List of workers involved in the update process.
	 */
	Owl.Workers = [ {
		filter: [ 'width', 'settings' ],
		run: function() {
			this._width = this.$element.width();
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			cache.current = this._items && this._items[this.relative(this._current)];
		}
	}, {
		filter: [ 'items', 'settings' ],
		run: function() {
			this.$stage.children('.cloned').remove();
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			var margin = this.settings.margin || '',
				grid = !this.settings.autoWidth,
				rtl = this.settings.rtl,
				css = {
					'width': 'auto',
					'margin-left': rtl ? margin : '',
					'margin-right': rtl ? '' : margin
				};

			!grid && this.$stage.children().css(css);

			cache.css = css;
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			var width = (this.width() / this.settings.items).toFixed(3) - this.settings.margin,
				merge = null,
				iterator = this._items.length,
				grid = !this.settings.autoWidth,
				widths = [];

			cache.items = {
				merge: false,
				width: width
			};

			while (iterator--) {
				merge = this._mergers[iterator];
				merge = this.settings.mergeFit && Math.min(merge, this.settings.items) || merge;

				cache.items.merge = merge > 1 || cache.items.merge;

				widths[iterator] = !grid ? this._items[iterator].width() : width * merge;
			}

			this._widths = widths;
		}
	}, {
		filter: [ 'items', 'settings' ],
		run: function() {
			var clones = [],
				items = this._items,
				settings = this.settings,
				// TODO: Should be computed from number of min width items in stage
				view = Math.max(settings.items * 2, 4),
				size = Math.ceil(items.length / 2) * 2,
				repeat = settings.loop && items.length ? settings.rewind ? view : Math.max(view, size) : 0,
				append = '',
				prepend = '';

			repeat /= 2;

			while (repeat > 0) {
				// Switch to only using appended clones
				clones.push(this.normalize(clones.length / 2, true));
				append = append + items[clones[clones.length - 1]][0].outerHTML;
				clones.push(this.normalize(items.length - 1 - (clones.length - 1) / 2, true));
				prepend = items[clones[clones.length - 1]][0].outerHTML + prepend;
				repeat -= 1;
			}

			this._clones = clones;

			$(append).addClass('cloned').appendTo(this.$stage);
			$(prepend).addClass('cloned').prependTo(this.$stage);
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function() {
			var rtl = this.settings.rtl ? 1 : -1,
				size = this._clones.length + this._items.length,
				iterator = -1,
				previous = 0,
				current = 0,
				coordinates = [];

			while (++iterator < size) {
				previous = coordinates[iterator - 1] || 0;
				current = this._widths[this.relative(iterator)] + this.settings.margin;
				coordinates.push(previous + current * rtl);
			}

			this._coordinates = coordinates;
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function() {
			var padding = this.settings.stagePadding,
				coordinates = this._coordinates,
				css = {
					'width': Math.ceil(Math.abs(coordinates[coordinates.length - 1])) + padding * 2,
					'padding-left': padding || '',
					'padding-right': padding || ''
				};

			this.$stage.css(css);
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			var iterator = this._coordinates.length,
				grid = !this.settings.autoWidth,
				items = this.$stage.children();

			if (grid && cache.items.merge) {
				while (iterator--) {
					cache.css.width = this._widths[this.relative(iterator)];
					items.eq(iterator).css(cache.css);
				}
			} else if (grid) {
				cache.css.width = cache.items.width;
				items.css(cache.css);
			}
		}
	}, {
		filter: [ 'items' ],
		run: function() {
			this._coordinates.length < 1 && this.$stage.removeAttr('style');
		}
	}, {
		filter: [ 'width', 'items', 'settings' ],
		run: function(cache) {
			cache.current = cache.current ? this.$stage.children().index(cache.current) : 0;
			cache.current = Math.max(this.minimum(), Math.min(this.maximum(), cache.current));
			this.reset(cache.current);
		}
	}, {
		filter: [ 'position' ],
		run: function() {
			this.animate(this.coordinates(this._current));
		}
	}, {
		filter: [ 'width', 'position', 'items', 'settings' ],
		run: function() {
			var rtl = this.settings.rtl ? 1 : -1,
				padding = this.settings.stagePadding * 2,
				begin = this.coordinates(this.current()) + padding,
				end = begin + this.width() * rtl,
				inner, outer, matches = [], i, n;

			for (i = 0, n = this._coordinates.length; i < n; i++) {
				inner = this._coordinates[i - 1] || 0;
				outer = Math.abs(this._coordinates[i]) + padding * rtl;

				if ((this.op(inner, '<=', begin) && (this.op(inner, '>', end)))
					|| (this.op(outer, '<', begin) && this.op(outer, '>', end))) {
					matches.push(i);
				}
			}

			this.$stage.children('.active').removeClass('active');
			this.$stage.children(':eq(' + matches.join('), :eq(') + ')').addClass('active');

			this.$stage.children('.center').removeClass('center');
			if (this.settings.center) {
				this.$stage.children().eq(this.current()).addClass('center');
			}
		}
	} ];

	/**
	 * Create the stage DOM element
	 */
	Owl.prototype.initializeStage = function() {
		this.$stage = this.$element.find('.' + this.settings.stageClass);

		// if the stage is already in the DOM, grab it and skip stage initialization
		if (this.$stage.length) {
			return;
		}

		this.$element.addClass(this.options.loadingClass);

		// create stage
		this.$stage = $('<' + this.settings.stageElement + '>', {
			"class": this.settings.stageClass
		}).wrap( $( '<div/>', {
			"class": this.settings.stageOuterClass
		}));

		// append stage
		this.$element.append(this.$stage.parent());
	};

	/**
	 * Create item DOM elements
	 */
	Owl.prototype.initializeItems = function() {
		var $items = this.$element.find('.owl-item');

		// if the items are already in the DOM, grab them and skip item initialization
		if ($items.length) {
			this._items = $items.get().map(function(item) {
				return $(item);
			});

			this._mergers = this._items.map(function() {
				return 1;
			});

			this.refresh();

			return;
		}

		// append content
		this.replace(this.$element.children().not(this.$stage.parent()));

		// check visibility
		if (this.isVisible()) {
			// update view
			this.refresh();
		} else {
			// invalidate width
			this.invalidate('width');
		}

		this.$element
			.removeClass(this.options.loadingClass)
			.addClass(this.options.loadedClass);
	};

	/**
	 * Initializes the carousel.
	 * @protected
	 */
	Owl.prototype.initialize = function() {
		this.enter('initializing');
		this.trigger('initialize');

		this.$element.toggleClass(this.settings.rtlClass, this.settings.rtl);

		if (this.settings.autoWidth && !this.is('pre-loading')) {
			var imgs, nestedSelector, width;
			imgs = this.$element.find('img');
			nestedSelector = this.settings.nestedItemSelector ? '.' + this.settings.nestedItemSelector : undefined;
			width = this.$element.children(nestedSelector).width();

			if (imgs.length && width <= 0) {
				this.preloadAutoWidthImages(imgs);
			}
		}

		this.initializeStage();
		this.initializeItems();

		// register event handlers
		this.registerEventHandlers();

		this.leave('initializing');
		this.trigger('initialized');
	};

	/**
	 * @returns {Boolean} visibility of $element
	 *                    if you know the carousel will always be visible you can set `checkVisibility` to `false` to
	 *                    prevent the expensive browser layout forced reflow the $element.is(':visible') does
	 */
	Owl.prototype.isVisible = function() {
		return this.settings.checkVisibility
			? this.$element.is(':visible')
			: true;
	};

	/**
	 * Setups the current settings.
	 * @todo Remove responsive classes. Why should adaptive designs be brought into IE8?
	 * @todo Support for media queries by using `matchMedia` would be nice.
	 * @public
	 */
	Owl.prototype.setup = function() {
		var viewport = this.viewport(),
			overwrites = this.options.responsive,
			match = -1,
			settings = null;

		if (!overwrites) {
			settings = $.extend({}, this.options);
		} else {
			$.each(overwrites, function(breakpoint) {
				if (breakpoint <= viewport && breakpoint > match) {
					match = Number(breakpoint);
				}
			});

			settings = $.extend({}, this.options, overwrites[match]);
			if (typeof settings.stagePadding === 'function') {
				settings.stagePadding = settings.stagePadding();
			}
			delete settings.responsive;

			// responsive class
			if (settings.responsiveClass) {
				this.$element.attr('class',
					this.$element.attr('class').replace(new RegExp('(' + this.options.responsiveClass + '-)\\S+\\s', 'g'), '$1' + match)
				);
			}
		}

		this.trigger('change', { property: { name: 'settings', value: settings } });
		this._breakpoint = match;
		this.settings = settings;
		this.invalidate('settings');
		this.trigger('changed', { property: { name: 'settings', value: this.settings } });
	};

	/**
	 * Updates option logic if necessery.
	 * @protected
	 */
	Owl.prototype.optionsLogic = function() {
		if (this.settings.autoWidth) {
			this.settings.stagePadding = false;
			this.settings.merge = false;
		}
	};

	/**
	 * Prepares an item before add.
	 * @todo Rename event parameter `content` to `item`.
	 * @protected
	 * @returns {jQuery|HTMLElement} - The item container.
	 */
	Owl.prototype.prepare = function(item) {
		var event = this.trigger('prepare', { content: item });

		if (!event.data) {
			event.data = $('<' + this.settings.itemElement + '/>')
				.addClass(this.options.itemClass).append(item)
		}

		this.trigger('prepared', { content: event.data });

		return event.data;
	};

	/**
	 * Updates the view.
	 * @public
	 */
	Owl.prototype.update = function() {
		var i = 0,
			n = this._pipe.length,
			filter = $.proxy(function(p) { return this[p] }, this._invalidated),
			cache = {};

		while (i < n) {
			if (this._invalidated.all || $.grep(this._pipe[i].filter, filter).length > 0) {
				this._pipe[i].run(cache);
			}
			i++;
		}

		this._invalidated = {};

		!this.is('valid') && this.enter('valid');
	};

	/**
	 * Gets the width of the view.
	 * @public
	 * @param {Owl.Width} [dimension=Owl.Width.Default] - The dimension to return.
	 * @returns {Number} - The width of the view in pixel.
	 */
	Owl.prototype.width = function(dimension) {
		dimension = dimension || Owl.Width.Default;
		switch (dimension) {
			case Owl.Width.Inner:
			case Owl.Width.Outer:
				return this._width;
			default:
				return this._width - this.settings.stagePadding * 2 + this.settings.margin;
		}
	};

	/**
	 * Refreshes the carousel primarily for adaptive purposes.
	 * @public
	 */
	Owl.prototype.refresh = function() {
		this.enter('refreshing');
		this.trigger('refresh');

		this.setup();

		this.optionsLogic();

		this.$element.addClass(this.options.refreshClass);

		this.update();

		this.$element.removeClass(this.options.refreshClass);

		this.leave('refreshing');
		this.trigger('refreshed');
	};

	/**
	 * Checks window `resize` event.
	 * @protected
	 */
	Owl.prototype.onThrottledResize = function() {
		window.clearTimeout(this.resizeTimer);
		this.resizeTimer = window.setTimeout(this._handlers.onResize, this.settings.responsiveRefreshRate);
	};

	/**
	 * Checks window `resize` event.
	 * @protected
	 */
	Owl.prototype.onResize = function() {
		if (!this._items.length) {
			return false;
		}

		if (this._width === this.$element.width()) {
			return false;
		}

		if (!this.isVisible()) {
			return false;
		}

		this.enter('resizing');

		if (this.trigger('resize').isDefaultPrevented()) {
			this.leave('resizing');
			return false;
		}

		this.invalidate('width');

		this.refresh();

		this.leave('resizing');
		this.trigger('resized');
	};

	/**
	 * Registers event handlers.
	 * @todo Check `msPointerEnabled`
	 * @todo #261
	 * @protected
	 */
	Owl.prototype.registerEventHandlers = function() {
		if ($.support.transition) {
			this.$stage.on($.support.transition.end + '.owl.core', $.proxy(this.onTransitionEnd, this));
		}

		if (this.settings.responsive !== false) {
			this.on(window, 'resize', this._handlers.onThrottledResize);
		}

		if (this.settings.mouseDrag) {
			this.$element.addClass(this.options.dragClass);
			this.$stage.on('mousedown.owl.core', $.proxy(this.onDragStart, this));
			this.$stage.on('dragstart.owl.core selectstart.owl.core', function() { return false });
		}

		if (this.settings.touchDrag){
			this.$stage.on('touchstart.owl.core', $.proxy(this.onDragStart, this));
			this.$stage.on('touchcancel.owl.core', $.proxy(this.onDragEnd, this));
		}
	};

	/**
	 * Handles `touchstart` and `mousedown` events.
	 * @todo Horizontal swipe threshold as option
	 * @todo #261
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragStart = function(event) {
		var stage = null;

		if (event.which === 3) {
			return;
		}

		if ($.support.transform) {
			stage = this.$stage.css('transform').replace(/.*\(|\)| /g, '').split(',');
			stage = {
				x: stage[stage.length === 16 ? 12 : 4],
				y: stage[stage.length === 16 ? 13 : 5]
			};
		} else {
			stage = this.$stage.position();
			stage = {
				x: this.settings.rtl ?
					stage.left + this.$stage.width() - this.width() + this.settings.margin :
					stage.left,
				y: stage.top
			};
		}

		if (this.is('animating')) {
			$.support.transform ? this.animate(stage.x) : this.$stage.stop()
			this.invalidate('position');
		}

		this.$element.toggleClass(this.options.grabClass, event.type === 'mousedown');

		this.speed(0);

		this._drag.time = new Date().getTime();
		this._drag.target = $(event.target);
		this._drag.stage.start = stage;
		this._drag.stage.current = stage;
		this._drag.pointer = this.pointer(event);

		$(document).on('mouseup.owl.core touchend.owl.core', $.proxy(this.onDragEnd, this));

		$(document).one('mousemove.owl.core touchmove.owl.core', $.proxy(function(event) {
			var delta = this.difference(this._drag.pointer, this.pointer(event));

			$(document).on('mousemove.owl.core touchmove.owl.core', $.proxy(this.onDragMove, this));

			if (Math.abs(delta.x) < Math.abs(delta.y) && this.is('valid')) {
				return;
			}

			event.preventDefault();

			this.enter('dragging');
			this.trigger('drag');
		}, this));
	};

	/**
	 * Handles the `touchmove` and `mousemove` events.
	 * @todo #261
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragMove = function(event) {
		var minimum = null,
			maximum = null,
			pull = null,
			delta = this.difference(this._drag.pointer, this.pointer(event)),
			stage = this.difference(this._drag.stage.start, delta);

		if (!this.is('dragging')) {
			return;
		}

		event.preventDefault();

		if (this.settings.loop) {
			minimum = this.coordinates(this.minimum());
			maximum = this.coordinates(this.maximum() + 1) - minimum;
			stage.x = (((stage.x - minimum) % maximum + maximum) % maximum) + minimum;
		} else {
			minimum = this.settings.rtl ? this.coordinates(this.maximum()) : this.coordinates(this.minimum());
			maximum = this.settings.rtl ? this.coordinates(this.minimum()) : this.coordinates(this.maximum());
			pull = this.settings.pullDrag ? -1 * delta.x / 5 : 0;
			stage.x = Math.max(Math.min(stage.x, minimum + pull), maximum + pull);
		}

		this._drag.stage.current = stage;

		this.animate(stage.x);
	};

	/**
	 * Handles the `touchend` and `mouseup` events.
	 * @todo #261
	 * @todo Threshold for click event
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onDragEnd = function(event) {
		var delta = this.difference(this._drag.pointer, this.pointer(event)),
			stage = this._drag.stage.current,
			direction = delta.x > 0 ^ this.settings.rtl ? 'left' : 'right';

		$(document).off('.owl.core');

		this.$element.removeClass(this.options.grabClass);

		if (delta.x !== 0 && this.is('dragging') || !this.is('valid')) {
			this.speed(this.settings.dragEndSpeed || this.settings.smartSpeed);
			this.current(this.closest(stage.x, delta.x !== 0 ? direction : this._drag.direction));
			this.invalidate('position');
			this.update();

			this._drag.direction = direction;

			if (Math.abs(delta.x) > 3 || new Date().getTime() - this._drag.time > 300) {
				this._drag.target.one('click.owl.core', function() { return false; });
			}
		}

		if (!this.is('dragging')) {
			return;
		}

		this.leave('dragging');
		this.trigger('dragged');
	};

	/**
	 * Gets absolute position of the closest item for a coordinate.
	 * @todo Setting `freeDrag` makes `closest` not reusable. See #165.
	 * @protected
	 * @param {Number} coordinate - The coordinate in pixel.
	 * @param {String} direction - The direction to check for the closest item. Ether `left` or `right`.
	 * @return {Number} - The absolute position of the closest item.
	 */
	Owl.prototype.closest = function(coordinate, direction) {
		var position = -1,
			pull = 30,
			width = this.width(),
			coordinates = this.coordinates();

		if (!this.settings.freeDrag) {
			// check closest item
			$.each(coordinates, $.proxy(function(index, value) {
				// on a left pull, check on current index
				if (direction === 'left' && coordinate > value - pull && coordinate < value + pull) {
					position = index;
				// on a right pull, check on previous index
				// to do so, subtract width from value and set position = index + 1
				} else if (direction === 'right' && coordinate > value - width - pull && coordinate < value - width + pull) {
					position = index + 1;
				} else if (this.op(coordinate, '<', value)
					&& this.op(coordinate, '>', coordinates[index + 1] !== undefined ? coordinates[index + 1] : value - width)) {
					position = direction === 'left' ? index + 1 : index;
				}
				return position === -1;
			}, this));
		}

		if (!this.settings.loop) {
			// non loop boundries
			if (this.op(coordinate, '>', coordinates[this.minimum()])) {
				position = coordinate = this.minimum();
			} else if (this.op(coordinate, '<', coordinates[this.maximum()])) {
				position = coordinate = this.maximum();
			}
		}

		return position;
	};

	/**
	 * Animates the stage.
	 * @todo #270
	 * @public
	 * @param {Number} coordinate - The coordinate in pixels.
	 */
	Owl.prototype.animate = function(coordinate) {
		var animate = this.speed() > 0;

		this.is('animating') && this.onTransitionEnd();

		if (animate) {
			this.enter('animating');
			this.trigger('translate');
		}

		if ($.support.transform3d && $.support.transition) {
			this.$stage.css({
				transform: 'translate3d(' + coordinate + 'px,0px,0px)',
				transition: (this.speed() / 1000) + 's' + (
					this.settings.slideTransition ? ' ' + this.settings.slideTransition : ''
				)
			});
		} else if (animate) {
			this.$stage.animate({
				left: coordinate + 'px'
			}, this.speed(), this.settings.fallbackEasing, $.proxy(this.onTransitionEnd, this));
		} else {
			this.$stage.css({
				left: coordinate + 'px'
			});
		}
	};

	/**
	 * Checks whether the carousel is in a specific state or not.
	 * @param {String} state - The state to check.
	 * @returns {Boolean} - The flag which indicates if the carousel is busy.
	 */
	Owl.prototype.is = function(state) {
		return this._states.current[state] && this._states.current[state] > 0;
	};

	/**
	 * Sets the absolute position of the current item.
	 * @public
	 * @param {Number} [position] - The new absolute position or nothing to leave it unchanged.
	 * @returns {Number} - The absolute position of the current item.
	 */
	Owl.prototype.current = function(position) {
		if (position === undefined) {
			return this._current;
		}

		if (this._items.length === 0) {
			return undefined;
		}

		position = this.normalize(position);

		if (this._current !== position) {
			var event = this.trigger('change', { property: { name: 'position', value: position } });

			if (event.data !== undefined) {
				position = this.normalize(event.data);
			}

			this._current = position;

			this.invalidate('position');

			this.trigger('changed', { property: { name: 'position', value: this._current } });
		}

		return this._current;
	};

	/**
	 * Invalidates the given part of the update routine.
	 * @param {String} [part] - The part to invalidate.
	 * @returns {Array.<String>} - The invalidated parts.
	 */
	Owl.prototype.invalidate = function(part) {
		if ($.type(part) === 'string') {
			this._invalidated[part] = true;
			this.is('valid') && this.leave('valid');
		}
		return $.map(this._invalidated, function(v, i) { return i });
	};

	/**
	 * Resets the absolute position of the current item.
	 * @public
	 * @param {Number} position - The absolute position of the new item.
	 */
	Owl.prototype.reset = function(position) {
		position = this.normalize(position);

		if (position === undefined) {
			return;
		}

		this._speed = 0;
		this._current = position;

		this.suppress([ 'translate', 'translated' ]);

		this.animate(this.coordinates(position));

		this.release([ 'translate', 'translated' ]);
	};

	/**
	 * Normalizes an absolute or a relative position of an item.
	 * @public
	 * @param {Number} position - The absolute or relative position to normalize.
	 * @param {Boolean} [relative=false] - Whether the given position is relative or not.
	 * @returns {Number} - The normalized position.
	 */
	Owl.prototype.normalize = function(position, relative) {
		var n = this._items.length,
			m = relative ? 0 : this._clones.length;

		if (!this.isNumeric(position) || n < 1) {
			position = undefined;
		} else if (position < 0 || position >= n + m) {
			position = ((position - m / 2) % n + n) % n + m / 2;
		}

		return position;
	};

	/**
	 * Converts an absolute position of an item into a relative one.
	 * @public
	 * @param {Number} position - The absolute position to convert.
	 * @returns {Number} - The converted position.
	 */
	Owl.prototype.relative = function(position) {
		position -= this._clones.length / 2;
		return this.normalize(position, true);
	};

	/**
	 * Gets the maximum position for the current item.
	 * @public
	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
	 * @returns {Number}
	 */
	Owl.prototype.maximum = function(relative) {
		var settings = this.settings,
			maximum = this._coordinates.length,
			iterator,
			reciprocalItemsWidth,
			elementWidth;

		if (settings.loop) {
			maximum = this._clones.length / 2 + this._items.length - 1;
		} else if (settings.autoWidth || settings.merge) {
			iterator = this._items.length;
			if (iterator) {
				reciprocalItemsWidth = this._items[--iterator].width();
				elementWidth = this.$element.width();
				while (iterator--) {
					reciprocalItemsWidth += this._items[iterator].width() + this.settings.margin;
					if (reciprocalItemsWidth > elementWidth) {
						break;
					}
				}
			}
			maximum = iterator + 1;
		} else if (settings.center) {
			maximum = this._items.length - 1;
		} else {
			maximum = this._items.length - settings.items;
		}

		if (relative) {
			maximum -= this._clones.length / 2;
		}

		return Math.max(maximum, 0);
	};

	/**
	 * Gets the minimum position for the current item.
	 * @public
	 * @param {Boolean} [relative=false] - Whether to return an absolute position or a relative position.
	 * @returns {Number}
	 */
	Owl.prototype.minimum = function(relative) {
		return relative ? 0 : this._clones.length / 2;
	};

	/**
	 * Gets an item at the specified relative position.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
	 */
	Owl.prototype.items = function(position) {
		if (position === undefined) {
			return this._items.slice();
		}

		position = this.normalize(position, true);
		return this._items[position];
	};

	/**
	 * Gets an item at the specified relative position.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @return {jQuery|Array.<jQuery>} - The item at the given position or all items if no position was given.
	 */
	Owl.prototype.mergers = function(position) {
		if (position === undefined) {
			return this._mergers.slice();
		}

		position = this.normalize(position, true);
		return this._mergers[position];
	};

	/**
	 * Gets the absolute positions of clones for an item.
	 * @public
	 * @param {Number} [position] - The relative position of the item.
	 * @returns {Array.<Number>} - The absolute positions of clones for the item or all if no position was given.
	 */
	Owl.prototype.clones = function(position) {
		var odd = this._clones.length / 2,
			even = odd + this._items.length,
			map = function(index) { return index % 2 === 0 ? even + index / 2 : odd - (index + 1) / 2 };

		if (position === undefined) {
			return $.map(this._clones, function(v, i) { return map(i) });
		}

		return $.map(this._clones, function(v, i) { return v === position ? map(i) : null });
	};

	/**
	 * Sets the current animation speed.
	 * @public
	 * @param {Number} [speed] - The animation speed in milliseconds or nothing to leave it unchanged.
	 * @returns {Number} - The current animation speed in milliseconds.
	 */
	Owl.prototype.speed = function(speed) {
		if (speed !== undefined) {
			this._speed = speed;
		}

		return this._speed;
	};

	/**
	 * Gets the coordinate of an item.
	 * @todo The name of this method is missleanding.
	 * @public
	 * @param {Number} position - The absolute position of the item within `minimum()` and `maximum()`.
	 * @returns {Number|Array.<Number>} - The coordinate of the item in pixel or all coordinates.
	 */
	Owl.prototype.coordinates = function(position) {
		var multiplier = 1,
			newPosition = position - 1,
			coordinate;

		if (position === undefined) {
			return $.map(this._coordinates, $.proxy(function(coordinate, index) {
				return this.coordinates(index);
			}, this));
		}

		if (this.settings.center) {
			if (this.settings.rtl) {
				multiplier = -1;
				newPosition = position + 1;
			}

			coordinate = this._coordinates[position];
			coordinate += (this.width() - coordinate + (this._coordinates[newPosition] || 0)) / 2 * multiplier;
		} else {
			coordinate = this._coordinates[newPosition] || 0;
		}

		coordinate = Math.ceil(coordinate);

		return coordinate;
	};

	/**
	 * Calculates the speed for a translation.
	 * @protected
	 * @param {Number} from - The absolute position of the start item.
	 * @param {Number} to - The absolute position of the target item.
	 * @param {Number} [factor=undefined] - The time factor in milliseconds.
	 * @returns {Number} - The time in milliseconds for the translation.
	 */
	Owl.prototype.duration = function(from, to, factor) {
		if (factor === 0) {
			return 0;
		}

		return Math.min(Math.max(Math.abs(to - from), 1), 6) * Math.abs((factor || this.settings.smartSpeed));
	};

	/**
	 * Slides to the specified item.
	 * @public
	 * @param {Number} position - The position of the item.
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.to = function(position, speed) {
		var current = this.current(),
			revert = null,
			distance = position - this.relative(current),
			direction = (distance > 0) - (distance < 0),
			items = this._items.length,
			minimum = this.minimum(),
			maximum = this.maximum();

		if (this.settings.loop) {
			if (!this.settings.rewind && Math.abs(distance) > items / 2) {
				distance += direction * -1 * items;
			}

			position = current + distance;
			revert = ((position - minimum) % items + items) % items + minimum;

			if (revert !== position && revert - distance <= maximum && revert - distance > 0) {
				current = revert - distance;
				position = revert;
				this.reset(current);
			}
		} else if (this.settings.rewind) {
			maximum += 1;
			position = (position % maximum + maximum) % maximum;
		} else {
			position = Math.max(minimum, Math.min(maximum, position));
		}

		this.speed(this.duration(current, position, speed));
		this.current(position);

		if (this.isVisible()) {
			this.update();
		}
	};

	/**
	 * Slides to the next item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.next = function(speed) {
		speed = speed || false;
		this.to(this.relative(this.current()) + 1, speed);
	};

	/**
	 * Slides to the previous item.
	 * @public
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 */
	Owl.prototype.prev = function(speed) {
		speed = speed || false;
		this.to(this.relative(this.current()) - 1, speed);
	};

	/**
	 * Handles the end of an animation.
	 * @protected
	 * @param {Event} event - The event arguments.
	 */
	Owl.prototype.onTransitionEnd = function(event) {

		// if css2 animation then event object is undefined
		if (event !== undefined) {
			event.stopPropagation();

			// Catch only owl-stage transitionEnd event
			if ((event.target || event.srcElement || event.originalTarget) !== this.$stage.get(0)) {
				return false;
			}
		}

		this.leave('animating');
		this.trigger('translated');
	};

	/**
	 * Gets viewport width.
	 * @protected
	 * @return {Number} - The width in pixel.
	 */
	Owl.prototype.viewport = function() {
		var width;
		if (this.options.responsiveBaseElement !== window) {
			width = $(this.options.responsiveBaseElement).width();
		} else if (window.innerWidth) {
			width = window.innerWidth;
		} else if (document.documentElement && document.documentElement.clientWidth) {
			width = document.documentElement.clientWidth;
		} else {
			console.warn('Can not detect viewport width.');
		}
		return width;
	};

	/**
	 * Replaces the current content.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The new content.
	 */
	Owl.prototype.replace = function(content) {
		this.$stage.empty();
		this._items = [];

		if (content) {
			content = (content instanceof jQuery) ? content : $(content);
		}

		if (this.settings.nestedItemSelector) {
			content = content.find('.' + this.settings.nestedItemSelector);
		}

		content.filter(function() {
			return this.nodeType === 1;
		}).each($.proxy(function(index, item) {
			item = this.prepare(item);
			this.$stage.append(item);
			this._items.push(item);
			this._mergers.push(item.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
		}, this));

		this.reset(this.isNumeric(this.settings.startPosition) ? this.settings.startPosition : 0);

		this.invalidate('items');
	};

	/**
	 * Adds an item.
	 * @todo Use `item` instead of `content` for the event arguments.
	 * @public
	 * @param {HTMLElement|jQuery|String} content - The item content to add.
	 * @param {Number} [position] - The relative position at which to insert the item otherwise the item will be added to the end.
	 */
	Owl.prototype.add = function(content, position) {
		var current = this.relative(this._current);

		position = position === undefined ? this._items.length : this.normalize(position, true);
		content = content instanceof jQuery ? content : $(content);

		this.trigger('add', { content: content, position: position });

		content = this.prepare(content);

		if (this._items.length === 0 || position === this._items.length) {
			this._items.length === 0 && this.$stage.append(content);
			this._items.length !== 0 && this._items[position - 1].after(content);
			this._items.push(content);
			this._mergers.push(content.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
		} else {
			this._items[position].before(content);
			this._items.splice(position, 0, content);
			this._mergers.splice(position, 0, content.find('[data-merge]').addBack('[data-merge]').attr('data-merge') * 1 || 1);
		}

		this._items[current] && this.reset(this._items[current].index());

		this.invalidate('items');

		this.trigger('added', { content: content, position: position });
	};

	/**
	 * Removes an item by its position.
	 * @todo Use `item` instead of `content` for the event arguments.
	 * @public
	 * @param {Number} position - The relative position of the item to remove.
	 */
	Owl.prototype.remove = function(position) {
		position = this.normalize(position, true);

		if (position === undefined) {
			return;
		}

		this.trigger('remove', { content: this._items[position], position: position });

		this._items[position].remove();
		this._items.splice(position, 1);
		this._mergers.splice(position, 1);

		this.invalidate('items');

		this.trigger('removed', { content: null, position: position });
	};

	/**
	 * Preloads images with auto width.
	 * @todo Replace by a more generic approach
	 * @protected
	 */
	Owl.prototype.preloadAutoWidthImages = function(images) {
		images.each($.proxy(function(i, element) {
			this.enter('pre-loading');
			element = $(element);
			$(new Image()).one('load', $.proxy(function(e) {
				element.attr('src', e.target.src);
				element.css('opacity', 1);
				this.leave('pre-loading');
				!this.is('pre-loading') && !this.is('initializing') && this.refresh();
			}, this)).attr('src', element.attr('src') || element.attr('data-src') || element.attr('data-src-retina'));
		}, this));
	};

	/**
	 * Destroys the carousel.
	 * @public
	 */
	Owl.prototype.destroy = function() {

		this.$element.off('.owl.core');
		this.$stage.off('.owl.core');
		$(document).off('.owl.core');

		if (this.settings.responsive !== false) {
			window.clearTimeout(this.resizeTimer);
			this.off(window, 'resize', this._handlers.onThrottledResize);
		}

		for (var i in this._plugins) {
			this._plugins[i].destroy();
		}

		this.$stage.children('.cloned').remove();

		this.$stage.unwrap();
		this.$stage.children().contents().unwrap();
		this.$stage.children().unwrap();
		this.$stage.remove();
		this.$element
			.removeClass(this.options.refreshClass)
			.removeClass(this.options.loadingClass)
			.removeClass(this.options.loadedClass)
			.removeClass(this.options.rtlClass)
			.removeClass(this.options.dragClass)
			.removeClass(this.options.grabClass)
			.attr('class', this.$element.attr('class').replace(new RegExp(this.options.responsiveClass + '-\\S+\\s', 'g'), ''))
			.removeData('owl.carousel');
	};

	/**
	 * Operators to calculate right-to-left and left-to-right.
	 * @protected
	 * @param {Number} [a] - The left side operand.
	 * @param {String} [o] - The operator.
	 * @param {Number} [b] - The right side operand.
	 */
	Owl.prototype.op = function(a, o, b) {
		var rtl = this.settings.rtl;
		switch (o) {
			case '<':
				return rtl ? a > b : a < b;
			case '>':
				return rtl ? a < b : a > b;
			case '>=':
				return rtl ? a <= b : a >= b;
			case '<=':
				return rtl ? a >= b : a <= b;
			default:
				break;
		}
	};

	/**
	 * Attaches to an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The event handler to attach.
	 * @param {Boolean} capture - Wether the event should be handled at the capturing phase or not.
	 */
	Owl.prototype.on = function(element, event, listener, capture) {
		if (element.addEventListener) {
			element.addEventListener(event, listener, capture);
		} else if (element.attachEvent) {
			element.attachEvent('on' + event, listener);
		}
	};

	/**
	 * Detaches from an internal event.
	 * @protected
	 * @param {HTMLElement} element - The event source.
	 * @param {String} event - The event name.
	 * @param {Function} listener - The attached event handler to detach.
	 * @param {Boolean} capture - Wether the attached event handler was registered as a capturing listener or not.
	 */
	Owl.prototype.off = function(element, event, listener, capture) {
		if (element.removeEventListener) {
			element.removeEventListener(event, listener, capture);
		} else if (element.detachEvent) {
			element.detachEvent('on' + event, listener);
		}
	};

	/**
	 * Triggers a public event.
	 * @todo Remove `status`, `relatedTarget` should be used instead.
	 * @protected
	 * @param {String} name - The event name.
	 * @param {*} [data=null] - The event data.
	 * @param {String} [namespace=carousel] - The event namespace.
	 * @param {String} [state] - The state which is associated with the event.
	 * @param {Boolean} [enter=false] - Indicates if the call enters the specified state or not.
	 * @returns {Event} - The event arguments.
	 */
	Owl.prototype.trigger = function(name, data, namespace, state, enter) {
		var status = {
			item: { count: this._items.length, index: this.current() }
		}, handler = $.camelCase(
			$.grep([ 'on', name, namespace ], function(v) { return v })
				.join('-').toLowerCase()
		), event = $.Event(
			[ name, 'owl', namespace || 'carousel' ].join('.').toLowerCase(),
			$.extend({ relatedTarget: this }, status, data)
		);

		if (!this._supress[name]) {
			$.each(this._plugins, function(name, plugin) {
				if (plugin.onTrigger) {
					plugin.onTrigger(event);
				}
			});

			this.register({ type: Owl.Type.Event, name: name });
			this.$element.trigger(event);

			if (this.settings && typeof this.settings[handler] === 'function') {
				this.settings[handler].call(this, event);
			}
		}

		return event;
	};

	/**
	 * Enters a state.
	 * @param name - The state name.
	 */
	Owl.prototype.enter = function(name) {
		$.each([ name ].concat(this._states.tags[name] || []), $.proxy(function(i, name) {
			if (this._states.current[name] === undefined) {
				this._states.current[name] = 0;
			}

			this._states.current[name]++;
		}, this));
	};

	/**
	 * Leaves a state.
	 * @param name - The state name.
	 */
	Owl.prototype.leave = function(name) {
		$.each([ name ].concat(this._states.tags[name] || []), $.proxy(function(i, name) {
			this._states.current[name]--;
		}, this));
	};

	/**
	 * Registers an event or state.
	 * @public
	 * @param {Object} object - The event or state to register.
	 */
	Owl.prototype.register = function(object) {
		if (object.type === Owl.Type.Event) {
			if (!$.event.special[object.name]) {
				$.event.special[object.name] = {};
			}

			if (!$.event.special[object.name].owl) {
				var _default = $.event.special[object.name]._default;
				$.event.special[object.name]._default = function(e) {
					if (_default && _default.apply && (!e.namespace || e.namespace.indexOf('owl') === -1)) {
						return _default.apply(this, arguments);
					}
					return e.namespace && e.namespace.indexOf('owl') > -1;
				};
				$.event.special[object.name].owl = true;
			}
		} else if (object.type === Owl.Type.State) {
			if (!this._states.tags[object.name]) {
				this._states.tags[object.name] = object.tags;
			} else {
				this._states.tags[object.name] = this._states.tags[object.name].concat(object.tags);
			}

			this._states.tags[object.name] = $.grep(this._states.tags[object.name], $.proxy(function(tag, i) {
				return $.inArray(tag, this._states.tags[object.name]) === i;
			}, this));
		}
	};

	/**
	 * Suppresses events.
	 * @protected
	 * @param {Array.<String>} events - The events to suppress.
	 */
	Owl.prototype.suppress = function(events) {
		$.each(events, $.proxy(function(index, event) {
			this._supress[event] = true;
		}, this));
	};

	/**
	 * Releases suppressed events.
	 * @protected
	 * @param {Array.<String>} events - The events to release.
	 */
	Owl.prototype.release = function(events) {
		$.each(events, $.proxy(function(index, event) {
			delete this._supress[event];
		}, this));
	};

	/**
	 * Gets unified pointer coordinates from event.
	 * @todo #261
	 * @protected
	 * @param {Event} - The `mousedown` or `touchstart` event.
	 * @returns {Object} - Contains `x` and `y` coordinates of current pointer position.
	 */
	Owl.prototype.pointer = function(event) {
		var result = { x: null, y: null };

		event = event.originalEvent || event || window.event;

		event = event.touches && event.touches.length ?
			event.touches[0] : event.changedTouches && event.changedTouches.length ?
				event.changedTouches[0] : event;

		if (event.pageX) {
			result.x = event.pageX;
			result.y = event.pageY;
		} else {
			result.x = event.clientX;
			result.y = event.clientY;
		}

		return result;
	};

	/**
	 * Determines if the input is a Number or something that can be coerced to a Number
	 * @protected
	 * @param {Number|String|Object|Array|Boolean|RegExp|Function|Symbol} - The input to be tested
	 * @returns {Boolean} - An indication if the input is a Number or can be coerced to a Number
	 */
	Owl.prototype.isNumeric = function(number) {
		return !isNaN(parseFloat(number));
	};

	/**
	 * Gets the difference of two vectors.
	 * @todo #261
	 * @protected
	 * @param {Object} - The first vector.
	 * @param {Object} - The second vector.
	 * @returns {Object} - The difference.
	 */
	Owl.prototype.difference = function(first, second) {
		return {
			x: first.x - second.x,
			y: first.y - second.y
		};
	};

	/**
	 * The jQuery Plugin for the Owl Carousel
	 * @todo Navigation plugin `next` and `prev`
	 * @public
	 */
	$.fn.owlCarousel = function(option) {
		var args = Array.prototype.slice.call(arguments, 1);

		return this.each(function() {
			var $this = $(this),
				data = $this.data('owl.carousel');

			if (!data) {
				data = new Owl(this, typeof option == 'object' && option);
				$this.data('owl.carousel', data);

				$.each([
					'next', 'prev', 'to', 'destroy', 'refresh', 'replace', 'add', 'remove'
				], function(i, event) {
					data.register({ type: Owl.Type.Event, name: event });
					data.$element.on(event + '.owl.carousel.core', $.proxy(function(e) {
						if (e.namespace && e.relatedTarget !== this) {
							this.suppress([ event ]);
							data[event].apply(this, [].slice.call(arguments, 1));
							this.release([ event ]);
						}
					}, data));
				});
			}

			if (typeof option == 'string' && option.charAt(0) !== '_') {
				data[option].apply(data, args);
			}
		});
	};

	/**
	 * The constructor for the jQuery Plugin
	 * @public
	 */
	$.fn.owlCarousel.Constructor = Owl;

})(window.Zepto || window.jQuery, window, document);

/**
 * AutoRefresh Plugin
 * @version 2.3.4
 * @author Artus Kolanowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the auto refresh plugin.
	 * @class The Auto Refresh Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var AutoRefresh = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Refresh interval.
		 * @protected
		 * @type {number}
		 */
		this._interval = null;

		/**
		 * Whether the element is currently visible or not.
		 * @protected
		 * @type {Boolean}
		 */
		this._visible = null;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.autoRefresh) {
					this.watch();
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, AutoRefresh.Defaults, this._core.options);

		// register event handlers
		this._core.$element.on(this._handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	AutoRefresh.Defaults = {
		autoRefresh: true,
		autoRefreshInterval: 500
	};

	/**
	 * Watches the element.
	 */
	AutoRefresh.prototype.watch = function() {
		if (this._interval) {
			return;
		}

		this._visible = this._core.isVisible();
		this._interval = window.setInterval($.proxy(this.refresh, this), this._core.settings.autoRefreshInterval);
	};

	/**
	 * Refreshes the element.
	 */
	AutoRefresh.prototype.refresh = function() {
		if (this._core.isVisible() === this._visible) {
			return;
		}

		this._visible = !this._visible;

		this._core.$element.toggleClass('owl-hidden', !this._visible);

		this._visible && (this._core.invalidate('width') && this._core.refresh());
	};

	/**
	 * Destroys the plugin.
	 */
	AutoRefresh.prototype.destroy = function() {
		var handler, property;

		window.clearInterval(this._interval);

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.AutoRefresh = AutoRefresh;

})(window.Zepto || window.jQuery, window, document);

/**
 * Lazy Plugin
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the lazy plugin.
	 * @class The Lazy Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Lazy = function(carousel) {

		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Already loaded items.
		 * @protected
		 * @type {Array.<jQuery>}
		 */
		this._loaded = [];

		/**
		 * Event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel change.owl.carousel resized.owl.carousel': $.proxy(function(e) {
				if (!e.namespace) {
					return;
				}

				if (!this._core.settings || !this._core.settings.lazyLoad) {
					return;
				}

				if ((e.property && e.property.name == 'position') || e.type == 'initialized') {
					var settings = this._core.settings,
						n = (settings.center && Math.ceil(settings.items / 2) || settings.items),
						i = ((settings.center && n * -1) || 0),
						position = (e.property && e.property.value !== undefined ? e.property.value : this._core.current()) + i,
						clones = this._core.clones().length,
						load = $.proxy(function(i, v) { this.load(v) }, this);
					//TODO: Need documentation for this new option
					if (settings.lazyLoadEager > 0) {
						n += settings.lazyLoadEager;
						// If the carousel is looping also preload images that are to the "left"
						if (settings.loop) {
              position -= settings.lazyLoadEager;
              n++;
            }
					}

					while (i++ < n) {
						this.load(clones / 2 + this._core.relative(position));
						clones && $.each(this._core.clones(this._core.relative(position)), load);
						position++;
					}
				}
			}, this)
		};

		// set the default options
		this._core.options = $.extend({}, Lazy.Defaults, this._core.options);

		// register event handler
		this._core.$element.on(this._handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	Lazy.Defaults = {
		lazyLoad: false,
		lazyLoadEager: 0
	};

	/**
	 * Loads all resources of an item at the specified position.
	 * @param {Number} position - The absolute position of the item.
	 * @protected
	 */
	Lazy.prototype.load = function(position) {
		var $item = this._core.$stage.children().eq(position),
			$elements = $item && $item.find('.owl-lazy');

		if (!$elements || $.inArray($item.get(0), this._loaded) > -1) {
			return;
		}

		$elements.each($.proxy(function(index, element) {
			var $element = $(element), image,
                url = (window.devicePixelRatio > 1 && $element.attr('data-src-retina')) || $element.attr('data-src') || $element.attr('data-srcset');

			this._core.trigger('load', { element: $element, url: url }, 'lazy');

			if ($element.is('img')) {
				$element.one('load.owl.lazy', $.proxy(function() {
					$element.css('opacity', 1);
					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
				}, this)).attr('src', url);
            } else if ($element.is('source')) {
                $element.one('load.owl.lazy', $.proxy(function() {
                    this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
                }, this)).attr('srcset', url);
			} else {
				image = new Image();
				image.onload = $.proxy(function() {
					$element.css({
						'background-image': 'url("' + url + '")',
						'opacity': '1'
					});
					this._core.trigger('loaded', { element: $element, url: url }, 'lazy');
				}, this);
				image.src = url;
			}
		}, this));

		this._loaded.push($item.get(0));
	};

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Lazy.prototype.destroy = function() {
		var handler, property;

		for (handler in this.handlers) {
			this._core.$element.off(handler, this.handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Lazy = Lazy;

})(window.Zepto || window.jQuery, window, document);

/**
 * AutoHeight Plugin
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the auto height plugin.
	 * @class The Auto Height Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var AutoHeight = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		this._previousHeight = null;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel refreshed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.autoHeight) {
					this.update();
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.autoHeight && e.property.name === 'position'){
					this.update();
				}
			}, this),
			'loaded.owl.lazy': $.proxy(function(e) {
				if (e.namespace && this._core.settings.autoHeight
					&& e.element.closest('.' + this._core.settings.itemClass).index() === this._core.current()) {
					this.update();
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, AutoHeight.Defaults, this._core.options);

		// register event handlers
		this._core.$element.on(this._handlers);
		this._intervalId = null;
		var refThis = this;

		// These changes have been taken from a PR by gavrochelegnou proposed in #1575
		// and have been made compatible with the latest jQuery version
		$(window).on('load', function() {
			if (refThis._core.settings.autoHeight) {
				refThis.update();
			}
		});

		// Autoresize the height of the carousel when window is resized
		// When carousel has images, the height is dependent on the width
		// and should also change on resize
		$(window).resize(function() {
			if (refThis._core.settings.autoHeight) {
				if (refThis._intervalId != null) {
					clearTimeout(refThis._intervalId);
				}

				refThis._intervalId = setTimeout(function() {
					refThis.update();
				}, 250);
			}
		});

	};

	/**
	 * Default options.
	 * @public
	 */
	AutoHeight.Defaults = {
		autoHeight: false,
		autoHeightClass: 'owl-height'
	};

	/**
	 * Updates the view.
	 */
	AutoHeight.prototype.update = function() {
		var start = this._core._current,
			end = start + this._core.settings.items,
			lazyLoadEnabled = this._core.settings.lazyLoad,
			visible = this._core.$stage.children().toArray().slice(start, end),
			heights = [],
			maxheight = 0;

		$.each(visible, function(index, item) {
			heights.push($(item).height());
		});

		maxheight = Math.max.apply(null, heights);

		if (maxheight <= 1 && lazyLoadEnabled && this._previousHeight) {
			maxheight = this._previousHeight;
		}

		this._previousHeight = maxheight;

		this._core.$stage.parent()
			.height(maxheight)
			.addClass(this._core.settings.autoHeightClass);
	};

	AutoHeight.prototype.destroy = function() {
		var handler, property;

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] !== 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.AutoHeight = AutoHeight;

})(window.Zepto || window.jQuery, window, document);

/**
 * Video Plugin
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the video plugin.
	 * @class The Video Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Video = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Cache all video URLs.
		 * @protected
		 * @type {Object}
		 */
		this._videos = {};

		/**
		 * Current playing item.
		 * @protected
		 * @type {jQuery}
		 */
		this._playing = null;

		/**
		 * All event handlers.
		 * @todo The cloned content removale is too late
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function(e) {
				if (e.namespace) {
					this._core.register({ type: 'state', name: 'playing', tags: [ 'interacting' ] });
				}
			}, this),
			'resize.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.video && this.isInFullScreen()) {
					e.preventDefault();
				}
			}, this),
			'refreshed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.is('resizing')) {
					this._core.$stage.find('.cloned .owl-video-frame').remove();
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && e.property.name === 'position' && this._playing) {
					this.stop();
				}
			}, this),
			'prepared.owl.carousel': $.proxy(function(e) {
				if (!e.namespace) {
					return;
				}

				var $element = $(e.content).find('.owl-video');

				if ($element.length) {
					$element.css('display', 'none');
					this.fetch($element, $(e.content));
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Video.Defaults, this._core.options);

		// register event handlers
		this._core.$element.on(this._handlers);

		this._core.$element.on('click.owl.video', '.owl-video-play-icon', $.proxy(function(e) {
			this.play(e);
		}, this));
	};

	/**
	 * Default options.
	 * @public
	 */
	Video.Defaults = {
		video: false,
		videoHeight: false,
		videoWidth: false
	};

	/**
	 * Gets the video ID and the type (YouTube/Vimeo/vzaar only).
	 * @protected
	 * @param {jQuery} target - The target containing the video data.
	 * @param {jQuery} item - The item containing the video.
	 */
	Video.prototype.fetch = function(target, item) {
			var type = (function() {
					if (target.attr('data-vimeo-id')) {
						return 'vimeo';
					} else if (target.attr('data-vzaar-id')) {
						return 'vzaar'
					} else {
						return 'youtube';
					}
				})(),
				id = target.attr('data-vimeo-id') || target.attr('data-youtube-id') || target.attr('data-vzaar-id'),
				width = target.attr('data-width') || this._core.settings.videoWidth,
				height = target.attr('data-height') || this._core.settings.videoHeight,
				url = target.attr('href');

		if (url) {

			/*
					Parses the id's out of the following urls (and probably more):
					https://www.youtube.com/watch?v=:id
					https://youtu.be/:id
					https://vimeo.com/:id
					https://vimeo.com/channels/:channel/:id
					https://vimeo.com/groups/:group/videos/:id
					https://app.vzaar.com/videos/:id

					Visual example: https://regexper.com/#(http%3A%7Chttps%3A%7C)%5C%2F%5C%2F(player.%7Cwww.%7Capp.)%3F(vimeo%5C.com%7Cyoutu(be%5C.com%7C%5C.be%7Cbe%5C.googleapis%5C.com)%7Cvzaar%5C.com)%5C%2F(video%5C%2F%7Cvideos%5C%2F%7Cembed%5C%2F%7Cchannels%5C%2F.%2B%5C%2F%7Cgroups%5C%2F.%2B%5C%2F%7Cwatch%5C%3Fv%3D%7Cv%5C%2F)%3F(%5BA-Za-z0-9._%25-%5D*)(%5C%26%5CS%2B)%3F
			*/

			id = url.match(/(http:|https:|)\/\/(player.|www.|app.)?(vimeo\.com|youtu(be\.com|\.be|be\.googleapis\.com|be\-nocookie\.com)|vzaar\.com)\/(video\/|videos\/|embed\/|channels\/.+\/|groups\/.+\/|watch\?v=|v\/)?([A-Za-z0-9._%-]*)(\&\S+)?/);

			if (id[3].indexOf('youtu') > -1) {
				type = 'youtube';
			} else if (id[3].indexOf('vimeo') > -1) {
				type = 'vimeo';
			} else if (id[3].indexOf('vzaar') > -1) {
				type = 'vzaar';
			} else {
				throw new Error('Video URL not supported.');
			}
			id = id[6];
		} else {
			throw new Error('Missing video URL.');
		}

		this._videos[url] = {
			type: type,
			id: id,
			width: width,
			height: height
		};

		item.attr('data-video', url);

		this.thumbnail(target, this._videos[url]);
	};

	/**
	 * Creates video thumbnail.
	 * @protected
	 * @param {jQuery} target - The target containing the video data.
	 * @param {Object} info - The video info object.
	 * @see `fetch`
	 */
	Video.prototype.thumbnail = function(target, video) {
		var tnLink,
			icon,
			path,
			dimensions = video.width && video.height ? 'width:' + video.width + 'px;height:' + video.height + 'px;' : '',
			customTn = target.find('img'),
			srcType = 'src',
			lazyClass = '',
			settings = this._core.settings,
			create = function(path) {
				icon = '<div class="owl-video-play-icon"></div>';

				if (settings.lazyLoad) {
					tnLink = $('<div/>',{
						"class": 'owl-video-tn ' + lazyClass,
						"srcType": path
					});
				} else {
					tnLink = $( '<div/>', {
						"class": "owl-video-tn",
						"style": 'opacity:1;background-image:url(' + path + ')'
					});
				}
				target.after(tnLink);
				target.after(icon);
			};

		// wrap video content into owl-video-wrapper div
		target.wrap( $( '<div/>', {
			"class": "owl-video-wrapper",
			"style": dimensions
		}));

		if (this._core.settings.lazyLoad) {
			srcType = 'data-src';
			lazyClass = 'owl-lazy';
		}

		// custom thumbnail
		if (customTn.length) {
			create(customTn.attr(srcType));
			customTn.remove();
			return false;
		}

		if (video.type === 'youtube') {
			path = "//img.youtube.com/vi/" + video.id + "/hqdefault.jpg";
			create(path);
		} else if (video.type === 'vimeo') {
			$.ajax({
				type: 'GET',
				url: '//vimeo.com/api/v2/video/' + video.id + '.json',
				jsonp: 'callback',
				dataType: 'jsonp',
				success: function(data) {
					path = data[0].thumbnail_large;
					create(path);
				}
			});
		} else if (video.type === 'vzaar') {
			$.ajax({
				type: 'GET',
				url: '//vzaar.com/api/videos/' + video.id + '.json',
				jsonp: 'callback',
				dataType: 'jsonp',
				success: function(data) {
					path = data.framegrab_url;
					create(path);
				}
			});
		}
	};

	/**
	 * Stops the current video.
	 * @public
	 */
	Video.prototype.stop = function() {
		this._core.trigger('stop', null, 'video');
		this._playing.find('.owl-video-frame').remove();
		this._playing.removeClass('owl-video-playing');
		this._playing = null;
		this._core.leave('playing');
		this._core.trigger('stopped', null, 'video');
	};

	/**
	 * Starts the current video.
	 * @public
	 * @param {Event} event - The event arguments.
	 */
	Video.prototype.play = function(event) {
		var target = $(event.target),
			item = target.closest('.' + this._core.settings.itemClass),
			video = this._videos[item.attr('data-video')],
			width = video.width || '100%',
			height = video.height || this._core.$stage.height(),
			html,
			iframe;

		if (this._playing) {
			return;
		}

		this._core.enter('playing');
		this._core.trigger('play', null, 'video');

		item = this._core.items(this._core.relative(item.index()));

		this._core.reset(item.index());

		html = $( '<iframe frameborder="0" allowfullscreen mozallowfullscreen webkitAllowFullScreen ></iframe>' );
		html.attr( 'height', height );
		html.attr( 'width', width );
		if (video.type === 'youtube') {
			html.attr( 'src', '//www.youtube.com/embed/' + video.id + '?autoplay=1&rel=0&v=' + video.id );
		} else if (video.type === 'vimeo') {
			html.attr( 'src', '//player.vimeo.com/video/' + video.id + '?autoplay=1' );
		} else if (video.type === 'vzaar') {
			html.attr( 'src', '//view.vzaar.com/' + video.id + '/player?autoplay=true' );
		}

		iframe = $(html).wrap( '<div class="owl-video-frame" />' ).insertAfter(item.find('.owl-video'));

		this._playing = item.addClass('owl-video-playing');
	};

	/**
	 * Checks whether an video is currently in full screen mode or not.
	 * @todo Bad style because looks like a readonly method but changes members.
	 * @protected
	 * @returns {Boolean}
	 */
	Video.prototype.isInFullScreen = function() {
		var element = document.fullscreenElement || document.mozFullScreenElement ||
				document.webkitFullscreenElement;

		return element && $(element).parent().hasClass('owl-video-frame');
	};

	/**
	 * Destroys the plugin.
	 */
	Video.prototype.destroy = function() {
		var handler, property;

		this._core.$element.off('click.owl.video');

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Video = Video;

})(window.Zepto || window.jQuery, window, document);

/**
 * Animate Plugin
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the animate plugin.
	 * @class The Navigation Plugin
	 * @param {Owl} scope - The Owl Carousel
	 */
	var Animate = function(scope) {
		this.core = scope;
		this.core.options = $.extend({}, Animate.Defaults, this.core.options);
		this.swapping = true;
		this.previous = undefined;
		this.next = undefined;

		this.handlers = {
			'change.owl.carousel': $.proxy(function(e) {
				if (e.namespace && e.property.name == 'position') {
					this.previous = this.core.current();
					this.next = e.property.value;
				}
			}, this),
			'drag.owl.carousel dragged.owl.carousel translated.owl.carousel': $.proxy(function(e) {
				if (e.namespace) {
					this.swapping = e.type == 'translated';
				}
			}, this),
			'translate.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this.swapping && (this.core.options.animateOut || this.core.options.animateIn)) {
					this.swap();
				}
			}, this)
		};

		this.core.$element.on(this.handlers);
	};

	/**
	 * Default options.
	 * @public
	 */
	Animate.Defaults = {
		animateOut: false,
		animateIn: false
	};

	/**
	 * Toggles the animation classes whenever an translations starts.
	 * @protected
	 * @returns {Boolean|undefined}
	 */
	Animate.prototype.swap = function() {

		if (this.core.settings.items !== 1) {
			return;
		}

		if (!$.support.animation || !$.support.transition) {
			return;
		}

		this.core.speed(0);

		var left,
			clear = $.proxy(this.clear, this),
			previous = this.core.$stage.children().eq(this.previous),
			next = this.core.$stage.children().eq(this.next),
			incoming = this.core.settings.animateIn,
			outgoing = this.core.settings.animateOut;

		if (this.core.current() === this.previous) {
			return;
		}

		if (outgoing) {
			left = this.core.coordinates(this.previous) - this.core.coordinates(this.next);
			previous.one($.support.animation.end, clear)
				.css( { 'left': left + 'px' } )
				.addClass('animated owl-animated-out')
				.addClass(outgoing);
		}

		if (incoming) {
			next.one($.support.animation.end, clear)
				.addClass('animated owl-animated-in')
				.addClass(incoming);
		}
	};

	Animate.prototype.clear = function(e) {
		$(e.target).css( { 'left': '' } )
			.removeClass('animated owl-animated-out owl-animated-in')
			.removeClass(this.core.settings.animateIn)
			.removeClass(this.core.settings.animateOut);
		this.core.onTransitionEnd();
	};

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Animate.prototype.destroy = function() {
		var handler, property;

		for (handler in this.handlers) {
			this.core.$element.off(handler, this.handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Animate = Animate;

})(window.Zepto || window.jQuery, window, document);

/**
 * Autoplay Plugin
 * @version 2.3.4
 * @author Bartosz Wojciechowski
 * @author Artus Kolanowski
 * @author David Deutsch
 * @author Tom De Caluwé
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	/**
	 * Creates the autoplay plugin.
	 * @class The Autoplay Plugin
	 * @param {Owl} scope - The Owl Carousel
	 */
	var Autoplay = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * The autoplay timeout id.
		 * @type {Number}
		 */
		this._call = null;

		/**
		 * Depending on the state of the plugin, this variable contains either
		 * the start time of the timer or the current timer value if it's
		 * paused. Since we start in a paused state we initialize the timer
		 * value.
		 * @type {Number}
		 */
		this._time = 0;

		/**
		 * Stores the timeout currently used.
		 * @type {Number}
		 */
		this._timeout = 0;

		/**
		 * Indicates whenever the autoplay is paused.
		 * @type {Boolean}
		 */
		this._paused = true;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && e.property.name === 'settings') {
					if (this._core.settings.autoplay) {
						this.play();
					} else {
						this.stop();
					}
				} else if (e.namespace && e.property.name === 'position' && this._paused) {
					// Reset the timer. This code is triggered when the position
					// of the carousel was changed through user interaction.
					this._time = 0;
				}
			}, this),
			'initialized.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.autoplay) {
					this.play();
				}
			}, this),
			'play.owl.autoplay': $.proxy(function(e, t, s) {
				if (e.namespace) {
					this.play(t, s);
				}
			}, this),
			'stop.owl.autoplay': $.proxy(function(e) {
				if (e.namespace) {
					this.stop();
				}
			}, this),
			'mouseover.owl.autoplay': $.proxy(function() {
				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
					this.pause();
				}
			}, this),
			'mouseleave.owl.autoplay': $.proxy(function() {
				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
					this.play();
				}
			}, this),
			'touchstart.owl.core': $.proxy(function() {
				if (this._core.settings.autoplayHoverPause && this._core.is('rotating')) {
					this.pause();
				}
			}, this),
			'touchend.owl.core': $.proxy(function() {
				if (this._core.settings.autoplayHoverPause) {
					this.play();
				}
			}, this)
		};

		// register event handlers
		this._core.$element.on(this._handlers);

		// set default options
		this._core.options = $.extend({}, Autoplay.Defaults, this._core.options);
	};

	/**
	 * Default options.
	 * @public
	 */
	Autoplay.Defaults = {
		autoplay: false,
		autoplayTimeout: 5000,
		autoplayHoverPause: false,
		autoplaySpeed: false
	};

	/**
	 * Transition to the next slide and set a timeout for the next transition.
	 * @private
	 * @param {Number} [speed] - The animation speed for the animations.
	 */
	Autoplay.prototype._next = function(speed) {
		this._call = window.setTimeout(
			$.proxy(this._next, this, speed),
			this._timeout * (Math.round(this.read() / this._timeout) + 1) - this.read()
		);

		if (this._core.is('interacting') || document.hidden) {
			return;
		}
		this._core.next(speed || this._core.settings.autoplaySpeed);
	}

	/**
	 * Reads the current timer value when the timer is playing.
	 * @public
	 */
	Autoplay.prototype.read = function() {
		return new Date().getTime() - this._time;
	};

	/**
	 * Starts the autoplay.
	 * @public
	 * @param {Number} [timeout] - The interval before the next animation starts.
	 * @param {Number} [speed] - The animation speed for the animations.
	 */
	Autoplay.prototype.play = function(timeout, speed) {
		var elapsed;

		if (!this._core.is('rotating')) {
			this._core.enter('rotating');
		}

		timeout = timeout || this._core.settings.autoplayTimeout;

		// Calculate the elapsed time since the last transition. If the carousel
		// wasn't playing this calculation will yield zero.
		elapsed = Math.min(this._time % (this._timeout || timeout), timeout);

		if (this._paused) {
			// Start the clock.
			this._time = this.read();
			this._paused = false;
		} else {
			// Clear the active timeout to allow replacement.
			window.clearTimeout(this._call);
		}

		// Adjust the origin of the timer to match the new timeout value.
		this._time += this.read() % timeout - elapsed;

		this._timeout = timeout;
		this._call = window.setTimeout($.proxy(this._next, this, speed), timeout - elapsed);
	};

	/**
	 * Stops the autoplay.
	 * @public
	 */
	Autoplay.prototype.stop = function() {
		if (this._core.is('rotating')) {
			// Reset the clock.
			this._time = 0;
			this._paused = true;

			window.clearTimeout(this._call);
			this._core.leave('rotating');
		}
	};

	/**
	 * Pauses the autoplay.
	 * @public
	 */
	Autoplay.prototype.pause = function() {
		if (this._core.is('rotating') && !this._paused) {
			// Pause the clock.
			this._time = this.read();
			this._paused = true;

			window.clearTimeout(this._call);
		}
	};

	/**
	 * Destroys the plugin.
	 */
	Autoplay.prototype.destroy = function() {
		var handler, property;

		this.stop();

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.autoplay = Autoplay;

})(window.Zepto || window.jQuery, window, document);

/**
 * Navigation Plugin
 * @version 2.3.4
 * @author Artus Kolanowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {
	'use strict';

	/**
	 * Creates the navigation plugin.
	 * @class The Navigation Plugin
	 * @param {Owl} carousel - The Owl Carousel.
	 */
	var Navigation = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Indicates whether the plugin is initialized or not.
		 * @protected
		 * @type {Boolean}
		 */
		this._initialized = false;

		/**
		 * The current paging indexes.
		 * @protected
		 * @type {Array}
		 */
		this._pages = [];

		/**
		 * All DOM elements of the user interface.
		 * @protected
		 * @type {Object}
		 */
		this._controls = {};

		/**
		 * Markup for an indicator.
		 * @protected
		 * @type {Array.<String>}
		 */
		this._templates = [];

		/**
		 * The carousel element.
		 * @type {jQuery}
		 */
		this.$element = this._core.$element;

		/**
		 * Overridden methods of the carousel.
		 * @protected
		 * @type {Object}
		 */
		this._overrides = {
			next: this._core.next,
			prev: this._core.prev,
			to: this._core.to
		};

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'prepared.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.dotsData) {
					this._templates.push('<div class="' + this._core.settings.dotClass + '">' +
						$(e.content).find('[data-dot]').addBack('[data-dot]').attr('data-dot') + '</div>');
				}
			}, this),
			'added.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.dotsData) {
					this._templates.splice(e.position, 0, this._templates.pop());
				}
			}, this),
			'remove.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.dotsData) {
					this._templates.splice(e.position, 1);
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && e.property.name == 'position') {
					this.draw();
				}
			}, this),
			'initialized.owl.carousel': $.proxy(function(e) {
				if (e.namespace && !this._initialized) {
					this._core.trigger('initialize', null, 'navigation');
					this.initialize();
					this.update();
					this.draw();
					this._initialized = true;
					this._core.trigger('initialized', null, 'navigation');
				}
			}, this),
			'refreshed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._initialized) {
					this._core.trigger('refresh', null, 'navigation');
					this.update();
					this.draw();
					this._core.trigger('refreshed', null, 'navigation');
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Navigation.Defaults, this._core.options);

		// register event handlers
		this.$element.on(this._handlers);
	};

	/**
	 * Default options.
	 * @public
	 * @todo Rename `slideBy` to `navBy`
	 */
	Navigation.Defaults = {
		nav: false,
		navText: [
			'<span aria-label="' + 'Previous' + '">&#x2039;</span>',
			'<span aria-label="' + 'Next' + '">&#x203a;</span>'
		],
		navSpeed: false,
		navElement: 'button type="button" role="presentation"',
		navContainer: false,
		navContainerClass: 'owl-nav',
		navClass: [
			'owl-prev',
			'owl-next'
		],
		slideBy: 1,
		dotClass: 'owl-dot',
		dotsClass: 'owl-dots',
		dots: true,
		dotsEach: false,
		dotsData: false,
		dotsSpeed: false,
		dotsContainer: false
	};

	/**
	 * Initializes the layout of the plugin and extends the carousel.
	 * @protected
	 */
	Navigation.prototype.initialize = function() {
		var override,
			settings = this._core.settings;

		// create DOM structure for relative navigation
		this._controls.$relative = (settings.navContainer ? $(settings.navContainer)
			: $('<div>').addClass(settings.navContainerClass).appendTo(this.$element)).addClass('disabled');

		this._controls.$previous = $('<' + settings.navElement + '>')
			.addClass(settings.navClass[0])
			.html(settings.navText[0])
			.prependTo(this._controls.$relative)
			.on('click', $.proxy(function(e) {
				this.prev(settings.navSpeed);
			}, this));
		this._controls.$next = $('<' + settings.navElement + '>')
			.addClass(settings.navClass[1])
			.html(settings.navText[1])
			.appendTo(this._controls.$relative)
			.on('click', $.proxy(function(e) {
				this.next(settings.navSpeed);
			}, this));

		// create DOM structure for absolute navigation
		if (!settings.dotsData) {
			this._templates = [ $('<button role="button">')
				.addClass(settings.dotClass)
				.append($('<span>'))
				.prop('outerHTML') ];
		}

		this._controls.$absolute = (settings.dotsContainer ? $(settings.dotsContainer)
			: $('<div>').addClass(settings.dotsClass).appendTo(this.$element)).addClass('disabled');

		this._controls.$absolute.on('click', 'button', $.proxy(function(e) {
			var index = $(e.target).parent().is(this._controls.$absolute)
				? $(e.target).index() : $(e.target).parent().index();

			e.preventDefault();

			this.to(index, settings.dotsSpeed);
		}, this));

		/*$el.on('focusin', function() {
			$(document).off(".carousel");

			$(document).on('keydown.carousel', function(e) {
				if(e.keyCode == 37) {
					$el.trigger('prev.owl')
				}
				if(e.keyCode == 39) {
					$el.trigger('next.owl')
				}
			});
		});*/

		// override public methods of the carousel
		for (override in this._overrides) {
			this._core[override] = $.proxy(this[override], this);
		}
	};

	/**
	 * Destroys the plugin.
	 * @protected
	 */
	Navigation.prototype.destroy = function() {
		var handler, control, property, override, settings;
		settings = this._core.settings;

		for (handler in this._handlers) {
			this.$element.off(handler, this._handlers[handler]);
		}
		for (control in this._controls) {
			if (control === '$relative' && settings.navContainer) {
				this._controls[control].html('');
			} else {
				this._controls[control].remove();
			}
		}
		for (override in this.overides) {
			this._core[override] = this._overrides[override];
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	/**
	 * Updates the internal state.
	 * @protected
	 */
	Navigation.prototype.update = function() {
		var i, j, k,
			lower = this._core.clones().length / 2,
			upper = lower + this._core.items().length,
			maximum = this._core.maximum(true),
			settings = this._core.settings,
			size = settings.center || settings.autoWidth || settings.dotsData
				? 1 : settings.dotsEach || settings.items;

		if (settings.slideBy !== 'page') {
			settings.slideBy = Math.min(settings.slideBy, settings.items);
		}

		if (settings.dots || settings.slideBy == 'page') {
			this._pages = [];

			for (i = lower, j = 0, k = 0; i < upper; i++) {
				if (j >= size || j === 0) {
					this._pages.push({
						start: Math.min(maximum, i - lower),
						end: i - lower + size - 1
					});
					if (Math.min(maximum, i - lower) === maximum) {
						break;
					}
					j = 0, ++k;
				}
				j += this._core.mergers(this._core.relative(i));
			}
		}
	};

	/**
	 * Draws the user interface.
	 * @todo The option `dotsData` wont work.
	 * @protected
	 */
	Navigation.prototype.draw = function() {
		var difference,
			settings = this._core.settings,
			disabled = this._core.items().length <= settings.items,
			index = this._core.relative(this._core.current()),
			loop = settings.loop || settings.rewind;

		this._controls.$relative.toggleClass('disabled', !settings.nav || disabled);

		if (settings.nav) {
			this._controls.$previous.toggleClass('disabled', !loop && index <= this._core.minimum(true));
			this._controls.$next.toggleClass('disabled', !loop && index >= this._core.maximum(true));
		}

		this._controls.$absolute.toggleClass('disabled', !settings.dots || disabled);

		if (settings.dots) {
			difference = this._pages.length - this._controls.$absolute.children().length;

			if (settings.dotsData && difference !== 0) {
				this._controls.$absolute.html(this._templates.join(''));
			} else if (difference > 0) {
				this._controls.$absolute.append(new Array(difference + 1).join(this._templates[0]));
			} else if (difference < 0) {
				this._controls.$absolute.children().slice(difference).remove();
			}

			this._controls.$absolute.find('.active').removeClass('active');
			this._controls.$absolute.children().eq($.inArray(this.current(), this._pages)).addClass('active');
		}
	};

	/**
	 * Extends event data.
	 * @protected
	 * @param {Event} event - The event object which gets thrown.
	 */
	Navigation.prototype.onTrigger = function(event) {
		var settings = this._core.settings;

		event.page = {
			index: $.inArray(this.current(), this._pages),
			count: this._pages.length,
			size: settings && (settings.center || settings.autoWidth || settings.dotsData
				? 1 : settings.dotsEach || settings.items)
		};
	};

	/**
	 * Gets the current page position of the carousel.
	 * @protected
	 * @returns {Number}
	 */
	Navigation.prototype.current = function() {
		var current = this._core.relative(this._core.current());
		return $.grep(this._pages, $.proxy(function(page, index) {
			return page.start <= current && page.end >= current;
		}, this)).pop();
	};

	/**
	 * Gets the current succesor/predecessor position.
	 * @protected
	 * @returns {Number}
	 */
	Navigation.prototype.getPosition = function(successor) {
		var position, length,
			settings = this._core.settings;

		if (settings.slideBy == 'page') {
			position = $.inArray(this.current(), this._pages);
			length = this._pages.length;
			successor ? ++position : --position;
			position = this._pages[((position % length) + length) % length].start;
		} else {
			position = this._core.relative(this._core.current());
			length = this._core.items().length;
			successor ? position += settings.slideBy : position -= settings.slideBy;
		}

		return position;
	};

	/**
	 * Slides to the next item or page.
	 * @public
	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
	 */
	Navigation.prototype.next = function(speed) {
		$.proxy(this._overrides.to, this._core)(this.getPosition(true), speed);
	};

	/**
	 * Slides to the previous item or page.
	 * @public
	 * @param {Number} [speed=false] - The time in milliseconds for the transition.
	 */
	Navigation.prototype.prev = function(speed) {
		$.proxy(this._overrides.to, this._core)(this.getPosition(false), speed);
	};

	/**
	 * Slides to the specified item or page.
	 * @public
	 * @param {Number} position - The position of the item or page.
	 * @param {Number} [speed] - The time in milliseconds for the transition.
	 * @param {Boolean} [standard=false] - Whether to use the standard behaviour or not.
	 */
	Navigation.prototype.to = function(position, speed, standard) {
		var length;

		if (!standard && this._pages.length) {
			length = this._pages.length;
			$.proxy(this._overrides.to, this._core)(this._pages[((position % length) + length) % length].start, speed);
		} else {
			$.proxy(this._overrides.to, this._core)(position, speed);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Navigation = Navigation;

})(window.Zepto || window.jQuery, window, document);

/**
 * Hash Plugin
 * @version 2.3.4
 * @author Artus Kolanowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {
	'use strict';

	/**
	 * Creates the hash plugin.
	 * @class The Hash Plugin
	 * @param {Owl} carousel - The Owl Carousel
	 */
	var Hash = function(carousel) {
		/**
		 * Reference to the core.
		 * @protected
		 * @type {Owl}
		 */
		this._core = carousel;

		/**
		 * Hash index for the items.
		 * @protected
		 * @type {Object}
		 */
		this._hashes = {};

		/**
		 * The carousel element.
		 * @type {jQuery}
		 */
		this.$element = this._core.$element;

		/**
		 * All event handlers.
		 * @protected
		 * @type {Object}
		 */
		this._handlers = {
			'initialized.owl.carousel': $.proxy(function(e) {
				if (e.namespace && this._core.settings.startPosition === 'URLHash') {
					$(window).trigger('hashchange.owl.navigation');
				}
			}, this),
			'prepared.owl.carousel': $.proxy(function(e) {
				if (e.namespace) {
					var hash = $(e.content).find('[data-hash]').addBack('[data-hash]').attr('data-hash');

					if (!hash) {
						return;
					}

					this._hashes[hash] = e.content;
				}
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (e.namespace && e.property.name === 'position') {
					var current = this._core.items(this._core.relative(this._core.current())),
						hash = $.map(this._hashes, function(item, hash) {
							return item === current ? hash : null;
						}).join();

					if (!hash || window.location.hash.slice(1) === hash) {
						return;
					}

					window.location.hash = hash;
				}
			}, this)
		};

		// set default options
		this._core.options = $.extend({}, Hash.Defaults, this._core.options);

		// register the event handlers
		this.$element.on(this._handlers);

		// register event listener for hash navigation
		$(window).on('hashchange.owl.navigation', $.proxy(function(e) {
			var hash = window.location.hash.substring(1),
				items = this._core.$stage.children(),
				position = this._hashes[hash] && items.index(this._hashes[hash]);

			if (position === undefined || position === this._core.current()) {
				return;
			}

			this._core.to(this._core.relative(position), false, true);
		}, this));
	};

	/**
	 * Default options.
	 * @public
	 */
	Hash.Defaults = {
		URLhashListener: false
	};

	/**
	 * Destroys the plugin.
	 * @public
	 */
	Hash.prototype.destroy = function() {
		var handler, property;

		$(window).off('hashchange.owl.navigation');

		for (handler in this._handlers) {
			this._core.$element.off(handler, this._handlers[handler]);
		}
		for (property in Object.getOwnPropertyNames(this)) {
			typeof this[property] != 'function' && (this[property] = null);
		}
	};

	$.fn.owlCarousel.Constructor.Plugins.Hash = Hash;

})(window.Zepto || window.jQuery, window, document);

/**
 * Support Plugin
 *
 * @version 2.3.4
 * @author Vivid Planet Software GmbH
 * @author Artus Kolanowski
 * @author David Deutsch
 * @license The MIT License (MIT)
 */
;(function($, window, document, undefined) {

	var style = $('<support>').get(0).style,
		prefixes = 'Webkit Moz O ms'.split(' '),
		events = {
			transition: {
				end: {
					WebkitTransition: 'webkitTransitionEnd',
					MozTransition: 'transitionend',
					OTransition: 'oTransitionEnd',
					transition: 'transitionend'
				}
			},
			animation: {
				end: {
					WebkitAnimation: 'webkitAnimationEnd',
					MozAnimation: 'animationend',
					OAnimation: 'oAnimationEnd',
					animation: 'animationend'
				}
			}
		},
		tests = {
			csstransforms: function() {
				return !!test('transform');
			},
			csstransforms3d: function() {
				return !!test('perspective');
			},
			csstransitions: function() {
				return !!test('transition');
			},
			cssanimations: function() {
				return !!test('animation');
			}
		};

	function test(property, prefixed) {
		var result = false,
			upper = property.charAt(0).toUpperCase() + property.slice(1);

		$.each((property + ' ' + prefixes.join(upper + ' ') + upper).split(' '), function(i, property) {
			if (style[property] !== undefined) {
				result = prefixed ? property : true;
				return false;
			}
		});

		return result;
	}

	function prefixed(property) {
		return test(property, true);
	}

	if (tests.csstransitions()) {
		/* jshint -W053 */
		$.support.transition = new String(prefixed('transition'))
		$.support.transition.end = events.transition.end[ $.support.transition ];
	}

	if (tests.cssanimations()) {
		/* jshint -W053 */
		$.support.animation = new String(prefixed('animation'))
		$.support.animation.end = events.animation.end[ $.support.animation ];
	}

	if (tests.csstransforms()) {
		/* jshint -W053 */
		$.support.transform = new String(prefixed('transform'));
		$.support.transform3d = tests.csstransforms3d();
	}

})(window.Zepto || window.jQuery, window, document);
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
// Sound Manager
///////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////
/** @license
 *
 * SoundManager 2: JavaScript Sound for the Web
 * ----------------------------------------------
 * http://schillmania.com/projects/soundmanager2/
 *
 * Copyright (c) 2007, Scott Schiller. All rights reserved.
 * Code provided under the BSD License:
 * http://schillmania.com/projects/soundmanager2/license.txt
 *
 * V2.97a.20170601
 */

/**
 * About this file
 * -------------------------------------------------------------------------------------
 * This is the fully-commented source version of the SoundManager 2 API,
 * recommended for use during development and testing.
 *
 * See soundmanager2-nodebug-jsmin.js for an optimized build (~11KB with gzip.)
 * http://schillmania.com/projects/soundmanager2/doc/getstarted/#basic-inclusion
 * Alternately, serve this file with gzip for 75% compression savings (~30KB over HTTP.)
 *
 * You may notice <d> and </d> comments in this source; these are delimiters for
 * debug blocks which are removed in the -nodebug builds, further optimizing code size.
 *
 * Also, as you may note: Whoa, reliable cross-platform/device audio support is hard! ;)
 */

(function SM2(window, _undefined) {

/* global Audio, document, window, navigator, define, module, SM2_DEFER, opera, setTimeout, setInterval, clearTimeout, sm2Debugger */

'use strict';

if (!window || !window.document) {

  // Don't cross the [environment] streams. SM2 expects to be running in a browser, not under node.js etc.
  // Additionally, if a browser somehow manages to fail this test, as Egon said: "It would be bad."

  throw new Error('SoundManager requires a browser with window and document objects.');

}

var soundManager = null;

/**
 * The SoundManager constructor.
 *
 * @constructor
 * @param {string} smURL Optional: Path to SWF files
 * @param {string} smID Optional: The ID to use for the SWF container element
 * @this {SoundManager}
 * @return {SoundManager} The new SoundManager instance
 */

function SoundManager(smURL, smID) {

  /**
   * soundManager configuration options list
   * defines top-level configuration properties to be applied to the soundManager instance (eg. soundManager.flashVersion)
   * to set these properties, use the setup() method - eg., soundManager.setup({url: '/swf/', flashVersion: 9})
   */

  this.setupOptions = {

    url: (smURL || null),             // path (directory) where SoundManager 2 SWFs exist, eg., /path/to/swfs/
    flashVersion: 8,                  // flash build to use (8 or 9.) Some API features require 9.
    debugMode: true,                  // enable debugging output (console.log() with HTML fallback)
    debugFlash: false,                // enable debugging output inside SWF, troubleshoot Flash/browser issues
    useConsole: true,                 // use console.log() if available (otherwise, writes to #soundmanager-debug element)
    consoleOnly: true,                // if console is being used, do not create/write to #soundmanager-debug
    waitForWindowLoad: false,         // force SM2 to wait for window.onload() before trying to call soundManager.onload()
    bgColor: '#ffffff',               // SWF background color. N/A when wmode = 'transparent'
    useHighPerformance: false,        // position:fixed flash movie can help increase js/flash speed, minimize lag
    flashPollingInterval: null,       // msec affecting whileplaying/loading callback frequency. If null, default of 50 msec is used.
    html5PollingInterval: null,       // msec affecting whileplaying() for HTML5 audio, excluding mobile devices. If null, native HTML5 update events are used.
    flashLoadTimeout: 1000,           // msec to wait for flash movie to load before failing (0 = infinity)
    wmode: null,                      // flash rendering mode - null, 'transparent', or 'opaque' (last two allow z-index to work)
    allowScriptAccess: 'always',      // for scripting the SWF (object/embed property), 'always' or 'sameDomain'
    useFlashBlock: false,             // *requires flashblock.css, see demos* - allow recovery from flash blockers. Wait indefinitely and apply timeout CSS to SWF, if applicable.
    useHTML5Audio: true,              // use HTML5 Audio() where API is supported (most Safari, Chrome versions), Firefox (MP3/MP4 support varies.) Ideally, transparent vs. Flash API where possible.
    forceUseGlobalHTML5Audio: false,  // if true, a single Audio() object is used for all sounds - and only one can play at a time.
    ignoreMobileRestrictions: false,  // if true, SM2 will not apply global HTML5 audio rules to mobile UAs. iOS > 7 and WebViews may allow multiple Audio() instances.
    html5Test: /^(probably|maybe)$/i, // HTML5 Audio() format support test. Use /^probably$/i; if you want to be more conservative.
    preferFlash: false,               // overrides useHTML5audio, will use Flash for MP3/MP4/AAC if present. Potential option if HTML5 playback with these formats is quirky.
    noSWFCache: false,                // if true, appends ?ts={date} to break aggressive SWF caching.
    idPrefix: 'sound'                 // if an id is not provided to createSound(), this prefix is used for generated IDs - 'sound0', 'sound1' etc.

  };

  this.defaultOptions = {

    /**
     * the default configuration for sound objects made with createSound() and related methods
     * eg., volume, auto-load behaviour and so forth
     */

    autoLoad: false,        // enable automatic loading (otherwise .load() will be called on demand with .play(), the latter being nicer on bandwidth - if you want to .load yourself, you also can)
    autoPlay: false,        // enable playing of file as soon as possible (much faster if "stream" is true)
    from: null,             // position to start playback within a sound (msec), default = beginning
    loops: 1,               // how many times to repeat the sound (position will wrap around to 0, setPosition() will break out of loop when >0)
    onid3: null,            // callback function for "ID3 data is added/available"
    onerror: null,          // callback function for "load failed" (or, playback/network/decode error under HTML5.)
    onload: null,           // callback function for "load finished"
    whileloading: null,     // callback function for "download progress update" (X of Y bytes received)
    onplay: null,           // callback for "play" start
    onpause: null,          // callback for "pause"
    onresume: null,         // callback for "resume" (pause toggle)
    whileplaying: null,     // callback during play (position update)
    onposition: null,       // object containing times and function callbacks for positions of interest
    onstop: null,           // callback for "user stop"
    onfinish: null,         // callback function for "sound finished playing"
    multiShot: true,        // let sounds "restart" or layer on top of each other when played multiple times, rather than one-shot/one at a time
    multiShotEvents: false, // fire multiple sound events (currently onfinish() only) when multiShot is enabled
    position: null,         // offset (milliseconds) to seek to within loaded sound data.
    pan: 0,                 // "pan" settings, left-to-right, -100 to 100
    playbackRate: 1,        // rate at which to play the sound (HTML5-only)
    stream: true,           // allows playing before entire file has loaded (recommended)
    to: null,               // position to end playback within a sound (msec), default = end
    type: null,             // MIME-like hint for file pattern / canPlay() tests, eg. audio/mp3
    usePolicyFile: false,   // enable crossdomain.xml request for audio on remote domains (for ID3/waveform access)
    volume: 100             // self-explanatory. 0-100, the latter being the max.

  };

  this.flash9Options = {

    /**
     * flash 9-only options,
     * merged into defaultOptions if flash 9 is being used
     */

    onfailure: null,        // callback function for when playing fails (Flash 9, MovieStar + RTMP-only)
    isMovieStar: null,      // "MovieStar" MPEG4 audio mode. Null (default) = auto detect MP4, AAC etc. based on URL. true = force on, ignore URL
    usePeakData: false,     // enable left/right channel peak (level) data
    useWaveformData: false, // enable sound spectrum (raw waveform data) - NOTE: May increase CPU load.
    useEQData: false,       // enable sound EQ (frequency spectrum data) - NOTE: May increase CPU load.
    onbufferchange: null,   // callback for "isBuffering" property change
    ondataerror: null       // callback for waveform/eq data access error (flash playing audio in other tabs/domains)

  };

  this.movieStarOptions = {

    /**
     * flash 9.0r115+ MPEG4 audio options,
     * merged into defaultOptions if flash 9+movieStar mode is enabled
     */

    bufferTime: 3,          // seconds of data to buffer before playback begins (null = flash default of 0.1 seconds - if AAC playback is gappy, try increasing.)
    serverURL: null,        // rtmp: FMS or FMIS server to connect to, required when requesting media via RTMP or one of its variants
    onconnect: null,        // rtmp: callback for connection to flash media server
    duration: null          // rtmp: song duration (msec)

  };

  this.audioFormats = {

    /**
     * determines HTML5 support + flash requirements.
     * if no support (via flash and/or HTML5) for a "required" format, SM2 will fail to start.
     * flash fallback is used for MP3 or MP4 if HTML5 can't play it (or if preferFlash = true)
     */

    mp3: {
      type: ['audio/mpeg; codecs="mp3"', 'audio/mpeg', 'audio/mp3', 'audio/MPA', 'audio/mpa-robust'],
      required: true
    },

    mp4: {
      related: ['aac', 'm4a', 'm4b'], // additional formats under the MP4 container
      type: ['audio/mp4; codecs="mp4a.40.2"', 'audio/aac', 'audio/x-m4a', 'audio/MP4A-LATM', 'audio/mpeg4-generic'],
      required: false
    },

    ogg: {
      type: ['audio/ogg; codecs=vorbis'],
      required: false
    },

    opus: {
      type: ['audio/ogg; codecs=opus', 'audio/opus'],
      required: false
    },

    wav: {
      type: ['audio/wav; codecs="1"', 'audio/wav', 'audio/wave', 'audio/x-wav'],
      required: false
    },

    flac: {
      type: ['audio/flac'],
      required: false
    }

  };

  // HTML attributes (id + class names) for the SWF container

  this.movieID = 'sm2-container';
  this.id = (smID || 'sm2movie');

  this.debugID = 'soundmanager-debug';
  this.debugURLParam = /([#?&])debug=1/i;

  // dynamic attributes

  this.versionNumber = 'V2.97a.20170601';
  this.version = null;
  this.movieURL = null;
  this.altURL = null;
  this.swfLoaded = false;
  this.enabled = false;
  this.oMC = null;
  this.sounds = {};
  this.soundIDs = [];
  this.muted = false;
  this.didFlashBlock = false;
  this.filePattern = null;

  this.filePatterns = {
    flash8: /\.mp3(\?.*)?$/i,
    flash9: /\.mp3(\?.*)?$/i
  };

  // support indicators, set at init

  this.features = {
    buffering: false,
    peakData: false,
    waveformData: false,
    eqData: false,
    movieStar: false
  };

  // flash sandbox info, used primarily in troubleshooting

  this.sandbox = {
    // <d>
    type: null,
    types: {
      remote: 'remote (domain-based) rules',
      localWithFile: 'local with file access (no internet access)',
      localWithNetwork: 'local with network (internet access only, no local access)',
      localTrusted: 'local, trusted (local+internet access)'
    },
    description: null,
    noRemote: null,
    noLocal: null
    // </d>
  };

  /**
   * format support (html5/flash)
   * stores canPlayType() results based on audioFormats.
   * eg. { mp3: boolean, mp4: boolean }
   * treat as read-only.
   */

  this.html5 = {
    usingFlash: null // set if/when flash fallback is needed
  };

  // file type support hash
  this.flash = {};

  // determined at init time
  this.html5Only = false;

  // used for special cases (eg. iPad/iPhone/palm OS?)
  this.ignoreFlash = false;

  /**
   * a few private internals (OK, a lot. :D)
   */

  var SMSound,
  sm2 = this, globalHTML5Audio = null, flash = null, sm = 'soundManager', smc = sm + ': ', h5 = 'HTML5::', id, ua = navigator.userAgent, wl = window.location.href.toString(), doc = document, doNothing, setProperties, init, fV, on_queue = [], debugOpen = true, debugTS, didAppend = false, appendSuccess = false, didInit = false, disabled = false, windowLoaded = false, _wDS, wdCount = 0, initComplete, mixin, assign, extraOptions, addOnEvent, processOnEvents, initUserOnload, delayWaitForEI, waitForEI, rebootIntoHTML5, setVersionInfo, handleFocus, strings, initMovie, domContentLoaded, winOnLoad, didDCLoaded, getDocument, createMovie, catchError, setPolling, initDebug, debugLevels = ['log', 'info', 'warn', 'error'], defaultFlashVersion = 8, disableObject, failSafely, normalizeMovieURL, oRemoved = null, oRemovedHTML = null, str, flashBlockHandler, getSWFCSS, swfCSS, toggleDebug, loopFix, policyFix, complain, idCheck, waitingForEI = false, initPending = false, startTimer, stopTimer, timerExecute, h5TimerCount = 0, h5IntervalTimer = null, parseURL, messages = [],
  canIgnoreFlash, needsFlash = null, featureCheck, html5OK, html5CanPlay, html5ErrorCodes, html5Ext, html5Unload, domContentLoadedIE, testHTML5, event, slice = Array.prototype.slice, useGlobalHTML5Audio = false, lastGlobalHTML5URL, hasFlash, detectFlash, badSafariFix, html5_events, showSupport, flushMessages, wrapCallback, idCounter = 0, didSetup, msecScale = 1000,
  is_iDevice = ua.match(/(ipad|iphone|ipod)/i), isAndroid = ua.match(/android/i), isIE = ua.match(/msie|trident/i),
  isWebkit = ua.match(/webkit/i),
  isSafari = (ua.match(/safari/i) && !ua.match(/chrome/i)),
  isOpera = (ua.match(/opera/i)),
  mobileHTML5 = (ua.match(/(mobile|pre\/|xoom)/i) || is_iDevice || isAndroid),
  isBadSafari = (!wl.match(/usehtml5audio/i) && !wl.match(/sm2-ignorebadua/i) && isSafari && !ua.match(/silk/i) && ua.match(/OS\sX\s10_6_([3-7])/i)), // Safari 4 and 5 (excluding Kindle Fire, "Silk") occasionally fail to load/play HTML5 audio on Snow Leopard 10.6.3 through 10.6.7 due to bug(s) in QuickTime X and/or other underlying frameworks. :/ Confirmed bug. https://bugs.webkit.org/show_bug.cgi?id=32159
  hasConsole = (window.console !== _undefined && console.log !== _undefined),
  isFocused = (doc.hasFocus !== _undefined ? doc.hasFocus() : null),
  tryInitOnFocus = (isSafari && (doc.hasFocus === _undefined || !doc.hasFocus())),
  okToDisable = !tryInitOnFocus,
  flashMIME = /(mp3|mp4|mpa|m4a|m4b)/i,
  emptyURL = 'about:blank', // safe URL to unload, or load nothing from (flash 8 + most HTML5 UAs)
  emptyWAV = 'data:audio/wave;base64,/UklGRiYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQIAAAD//w==', // tiny WAV for HTML5 unloading
  overHTTP = (doc.location ? doc.location.protocol.match(/http/i) : null),
  http = (!overHTTP ? '//' : ''),
  // mp3, mp4, aac etc.
  netStreamMimeTypes = /^\s*audio\/(?:x-)?(?:mpeg4|aac|flv|mov|mp4|m4v|m4a|m4b|mp4v|3gp|3g2)\s*(?:$|;)/i,
  // Flash v9.0r115+ "moviestar" formats
  netStreamTypes = ['mpeg4', 'aac', 'flv', 'mov', 'mp4', 'm4v', 'f4v', 'm4a', 'm4b', 'mp4v', '3gp', '3g2'],
  netStreamPattern = new RegExp('\\.(' + netStreamTypes.join('|') + ')(\\?.*)?$', 'i');

  this.mimePattern = /^\s*audio\/(?:x-)?(?:mp(?:eg|3))\s*(?:$|;)/i; // default mp3 set

  // use altURL if not "online"
  this.useAltURL = !overHTTP;

  swfCSS = {
    swfBox: 'sm2-object-box',
    swfDefault: 'movieContainer',
    swfError: 'swf_error', // SWF loaded, but SM2 couldn't start (other error)
    swfTimedout: 'swf_timedout',
    swfLoaded: 'swf_loaded',
    swfUnblocked: 'swf_unblocked', // or loaded OK
    sm2Debug: 'sm2_debug',
    highPerf: 'high_performance',
    flashDebug: 'flash_debug'
  };

  /**
   * HTML5 error codes, per W3C
   * Error code 1, MEDIA_ERR_ABORTED: Client aborted download at user's request.
   * Error code 2, MEDIA_ERR_NETWORK: A network error of some description caused the user agent to stop fetching the media resource, after the resource was established to be usable.
   * Error code 3, MEDIA_ERR_DECODE: An error of some description occurred while decoding the media resource, after the resource was established to be usable.
   * Error code 4, MEDIA_ERR_SRC_NOT_SUPPORTED: Media (audio file) not supported ("not usable.")
   * Reference: https://html.spec.whatwg.org/multipage/embedded-content.html#error-codes
   */
  html5ErrorCodes = [
    null,
    'MEDIA_ERR_ABORTED',
    'MEDIA_ERR_NETWORK',
    'MEDIA_ERR_DECODE',
    'MEDIA_ERR_SRC_NOT_SUPPORTED'
  ];

  /**
   * basic HTML5 Audio() support test
   * try...catch because of IE 9 "not implemented" nonsense
   * https://github.com/Modernizr/Modernizr/issues/224
   */

  this.hasHTML5 = (function() {
    try {
      // new Audio(null) for stupid Opera 9.64 case, which throws not_enough_arguments exception otherwise.
      return (Audio !== _undefined && (isOpera && opera !== _undefined && opera.version() < 10 ? new Audio(null) : new Audio()).canPlayType !== _undefined);
    } catch(e) {
      return false;
    }
  }());

  /**
   * Public SoundManager API
   * -----------------------
   */

  /**
   * Configures top-level soundManager properties.
   *
   * @param {object} options Option parameters, eg. { flashVersion: 9, url: '/path/to/swfs/' }
   * onready and ontimeout are also accepted parameters. call soundManager.setup() to see the full list.
   */

  this.setup = function(options) {

    var noURL = (!sm2.url);

    // warn if flash options have already been applied

    if (options !== _undefined && didInit && needsFlash && sm2.ok() && (options.flashVersion !== _undefined || options.url !== _undefined || options.html5Test !== _undefined)) {
      complain(str('setupLate'));
    }

    // TODO: defer: true?

    assign(options);

    if (!useGlobalHTML5Audio) {

      if (mobileHTML5) {

        // force the singleton HTML5 pattern on mobile, by default.
        if (!sm2.setupOptions.ignoreMobileRestrictions || sm2.setupOptions.forceUseGlobalHTML5Audio) {
          messages.push(strings.globalHTML5);
          useGlobalHTML5Audio = true;
        }

      } else if (sm2.setupOptions.forceUseGlobalHTML5Audio) {

        // only apply singleton HTML5 on desktop if forced.
        messages.push(strings.globalHTML5);
        useGlobalHTML5Audio = true;

      }

    }

    if (!didSetup && mobileHTML5) {

      if (sm2.setupOptions.ignoreMobileRestrictions) {

        messages.push(strings.ignoreMobile);

      } else {

        // prefer HTML5 for mobile + tablet-like devices, probably more reliable vs. flash at this point.

        // <d>
        if (!sm2.setupOptions.useHTML5Audio || sm2.setupOptions.preferFlash) {
          // notify that defaults are being changed.
          sm2._wD(strings.mobileUA);
        }
        // </d>

        sm2.setupOptions.useHTML5Audio = true;
        sm2.setupOptions.preferFlash = false;

        if (is_iDevice) {

          // no flash here.
          sm2.ignoreFlash = true;

        } else if ((isAndroid && !ua.match(/android\s2\.3/i)) || !isAndroid) {

          /**
           * Android devices tend to work better with a single audio instance, specifically for chained playback of sounds in sequence.
           * Common use case: exiting sound onfinish() -> createSound() -> play()
           * Presuming similar restrictions for other mobile, non-Android, non-iOS devices.
           */

          // <d>
          sm2._wD(strings.globalHTML5);
          // </d>

          useGlobalHTML5Audio = true;

        }

      }

    }

    // special case 1: "Late setup". SM2 loaded normally, but user didn't assign flash URL eg., setup({url:...}) before SM2 init. Treat as delayed init.

    if (options) {

      if (noURL && didDCLoaded && options.url !== _undefined) {
        sm2.beginDelayedInit();
      }

      // special case 2: If lazy-loading SM2 (DOMContentLoaded has already happened) and user calls setup() with url: parameter, try to init ASAP.

      if (!didDCLoaded && options.url !== _undefined && doc.readyState === 'complete') {
        setTimeout(domContentLoaded, 1);
      }

    }

    didSetup = true;

    return sm2;

  };

  this.ok = function() {

    return (needsFlash ? (didInit && !disabled) : (sm2.useHTML5Audio && sm2.hasHTML5));

  };

  this.supported = this.ok; // legacy

  this.getMovie = function(movie_id) {

    // safety net: some old browsers differ on SWF references, possibly related to ExternalInterface / flash version
    return id(movie_id) || doc[movie_id] || window[movie_id];

  };

  /**
   * Creates a SMSound sound object instance. Can also be overloaded, e.g., createSound('mySound', '/some.mp3');
   *
   * @param {object} oOptions Sound options (at minimum, url parameter is required.)
   * @return {object} SMSound The new SMSound object.
   */

  this.createSound = function(oOptions, _url) {

    var cs, cs_string, options, oSound = null;

    // <d>
    cs = sm + '.createSound(): ';
    cs_string = cs + str(!didInit ? 'notReady' : 'notOK');
    // </d>

    if (!didInit || !sm2.ok()) {
      complain(cs_string);
      return false;
    }

    if (_url !== _undefined) {
      // function overloading in JS! :) ... assume simple createSound(id, url) use case.
      oOptions = {
        id: oOptions,
        url: _url
      };
    }

    // inherit from defaultOptions
    options = mixin(oOptions);

    options.url = parseURL(options.url);

    // generate an id, if needed.
    if (options.id === _undefined) {
      options.id = sm2.setupOptions.idPrefix + (idCounter++);
    }

    // <d>
    if (options.id.toString().charAt(0).match(/^[0-9]$/)) {
      sm2._wD(cs + str('badID', options.id), 2);
    }

    sm2._wD(cs + options.id + (options.url ? ' (' + options.url + ')' : ''), 1);
    // </d>

    if (idCheck(options.id, true)) {
      sm2._wD(cs + options.id + ' exists', 1);
      return sm2.sounds[options.id];
    }

    function make() {

      options = loopFix(options);
      sm2.sounds[options.id] = new SMSound(options);
      sm2.soundIDs.push(options.id);
      return sm2.sounds[options.id];

    }

    if (html5OK(options)) {

      oSound = make();
      // <d>
      if (!sm2.html5Only) {
        sm2._wD(options.id + ': Using HTML5');
      }
      // </d>
      oSound._setup_html5(options);

    } else {

      if (sm2.html5Only) {
        sm2._wD(options.id + ': No HTML5 support for this sound, and no Flash. Exiting.');
        return make();
      }

      // TODO: Move HTML5/flash checks into generic URL parsing/handling function.

      if (sm2.html5.usingFlash && options.url && options.url.match(/data:/i)) {
        // data: URIs not supported by Flash, either.
        sm2._wD(options.id + ': data: URIs not supported via Flash. Exiting.');
        return make();
      }

      if (fV > 8) {
        if (options.isMovieStar === null) {
          // attempt to detect MPEG-4 formats
          options.isMovieStar = !!(options.serverURL || (options.type ? options.type.match(netStreamMimeTypes) : false) || (options.url && options.url.match(netStreamPattern)));
        }
        // <d>
        if (options.isMovieStar) {
          sm2._wD(cs + 'using MovieStar handling');
          if (options.loops > 1) {
            _wDS('noNSLoop');
          }
        }
        // </d>
      }

      options = policyFix(options, cs);
      oSound = make();

      if (fV === 8) {
        flash._createSound(options.id, options.loops || 1, options.usePolicyFile);
      } else {
        flash._createSound(options.id, options.url, options.usePeakData, options.useWaveformData, options.useEQData, options.isMovieStar, (options.isMovieStar ? options.bufferTime : false), options.loops || 1, options.serverURL, options.duration || null, options.autoPlay, true, options.autoLoad, options.usePolicyFile);
        if (!options.serverURL) {
          // We are connected immediately
          oSound.connected = true;
          if (options.onconnect) {
            options.onconnect.apply(oSound);
          }
        }
      }

      if (!options.serverURL && (options.autoLoad || options.autoPlay)) {
        // call load for non-rtmp streams
        oSound.load(options);
      }

    }

    // rtmp will play in onconnect
    if (!options.serverURL && options.autoPlay) {
      oSound.play();
    }

    return oSound;

  };

  /**
   * Destroys a SMSound sound object instance.
   *
   * @param {string} sID The ID of the sound to destroy
   */

  this.destroySound = function(sID, _bFromSound) {

    // explicitly destroy a sound before normal page unload, etc.

    if (!idCheck(sID)) return false;

    var oS = sm2.sounds[sID], i;

    oS.stop();

    // Disable all callbacks after stop(), when the sound is being destroyed
    oS._iO = {};

    oS.unload();

    for (i = 0; i < sm2.soundIDs.length; i++) {
      if (sm2.soundIDs[i] === sID) {
        sm2.soundIDs.splice(i, 1);
        break;
      }
    }

    if (!_bFromSound) {
      // ignore if being called from SMSound instance
      oS.destruct(true);
    }

    oS = null;
    delete sm2.sounds[sID];

    return true;

  };

  /**
   * Calls the load() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   */

  this.load = function(sID, oOptions) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].load(oOptions);

  };

  /**
   * Calls the unload() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   */

  this.unload = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].unload();

  };

  /**
   * Calls the onPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod The relevant callback to fire
   * @param {object} oScope Optional: The scope to apply the callback to
   * @return {SMSound} The SMSound object
   */

  this.onPosition = function(sID, nPosition, oMethod, oScope) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].onposition(nPosition, oMethod, oScope);

  };

  // legacy/backwards-compability: lower-case method name
  this.onposition = this.onPosition;

  /**
   * Calls the clearOnPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPosition The position to watch for
   * @param {function} oMethod Optional: The relevant callback to fire
   * @return {SMSound} The SMSound object
   */

  this.clearOnPosition = function(sID, nPosition, oMethod) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].clearOnPosition(nPosition, oMethod);

  };

  /**
   * Calls the play() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {object} oOptions Optional: Sound options
   * @return {SMSound} The SMSound object
   */

  this.play = function(sID, oOptions) {

    var result = null,
        // legacy function-overloading use case: play('mySound', '/path/to/some.mp3');
        overloaded = (oOptions && !(oOptions instanceof Object));

    if (!didInit || !sm2.ok()) {
      complain(sm + '.play(): ' + str(!didInit ? 'notReady' : 'notOK'));
      return false;
    }

    if (!idCheck(sID, overloaded)) {

      // no sound found for the given ID. Bail.
      if (!overloaded) return false;

      if (overloaded) {
        oOptions = {
          url: oOptions
        };
      }

      if (oOptions && oOptions.url) {
        // overloading use case, create+play: .play('someID', {url:'/path/to.mp3'});
        sm2._wD(sm + '.play(): Attempting to create "' + sID + '"', 1);
        oOptions.id = sID;
        result = sm2.createSound(oOptions).play();
      }

    } else if (overloaded) {

      // existing sound object case
      oOptions = {
        url: oOptions
      };

    }

    if (result === null) {
      // default case
      result = sm2.sounds[sID].play(oOptions);
    }

    return result;

  };

  // just for convenience
  this.start = this.play;

  /**
   * Calls the setPlaybackRate() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.setPlaybackRate = function(sID, rate, allowOverride) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPlaybackRate(rate, allowOverride);

  };

  /**
   * Calls the setPosition() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nMsecOffset Position (milliseconds)
   * @return {SMSound} The SMSound object
   */

  this.setPosition = function(sID, nMsecOffset) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPosition(nMsecOffset);

  };

  /**
   * Calls the stop() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.stop = function(sID) {

    if (!idCheck(sID)) return false;

    sm2._wD(sm + '.stop(' + sID + ')', 1);

    return sm2.sounds[sID].stop();

  };

  /**
   * Stops all currently-playing sounds.
   */

  this.stopAll = function() {

    var oSound;
    sm2._wD(sm + '.stopAll()', 1);

    for (oSound in sm2.sounds) {
      if (sm2.sounds.hasOwnProperty(oSound)) {
        // apply only to sound objects
        sm2.sounds[oSound].stop();
      }
    }

  };

  /**
   * Calls the pause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.pause = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].pause();

  };

  /**
   * Pauses all currently-playing sounds.
   */

  this.pauseAll = function() {

    var i;
    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].pause();
    }

  };

  /**
   * Calls the resume() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.resume = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].resume();

  };

  /**
   * Resumes all currently-paused sounds.
   */

  this.resumeAll = function() {

    var i;
    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].resume();
    }

  };

  /**
   * Calls the togglePause() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.togglePause = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].togglePause();

  };

  /**
   * Calls the setPan() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nPan The pan value (-100 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setPan = function(sID, nPan) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setPan(nPan);

  };

  /**
   * Calls the setVolume() method of a SMSound object by ID
   * Overloaded case: pass only volume argument eg., setVolume(50) to apply to all sounds.
   *
   * @param {string} sID The ID of the sound
   * @param {number} nVol The volume value (0 to 100)
   * @return {SMSound} The SMSound object
   */

  this.setVolume = function(sID, nVol) {

    // setVolume(50) function overloading case - apply to all sounds

    var i, j;

    if (sID !== _undefined && !isNaN(sID) && nVol === _undefined) {
      for (i = 0, j = sm2.soundIDs.length; i < j; i++) {
        sm2.sounds[sm2.soundIDs[i]].setVolume(sID);
      }
      return false;
    }

    // setVolume('mySound', 50) case

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].setVolume(nVol);

  };

  /**
   * Calls the mute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.mute = function(sID) {

    var i = 0;

    if (sID instanceof String) {
      sID = null;
    }

    if (!sID) {

      sm2._wD(sm + '.mute(): Muting all sounds');
      for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].mute();
      }
      sm2.muted = true;

    } else {

      if (!idCheck(sID)) return false;

      sm2._wD(sm + '.mute(): Muting "' + sID + '"');
      return sm2.sounds[sID].mute();

    }

    return true;

  };

  /**
   * Mutes all sounds.
   */

  this.muteAll = function() {

    sm2.mute();

  };

  /**
   * Calls the unmute() method of either a single SMSound object by ID, or all sound objects.
   *
   * @param {string} sID Optional: The ID of the sound (if omitted, all sounds will be used.)
   */

  this.unmute = function(sID) {

    var i;

    if (sID instanceof String) {
      sID = null;
    }

    if (!sID) {

      sm2._wD(sm + '.unmute(): Unmuting all sounds');
      for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
        sm2.sounds[sm2.soundIDs[i]].unmute();
      }
      sm2.muted = false;

    } else {

      if (!idCheck(sID)) return false;

      sm2._wD(sm + '.unmute(): Unmuting "' + sID + '"');

      return sm2.sounds[sID].unmute();

    }

    return true;

  };

  /**
   * Unmutes all sounds.
   */

  this.unmuteAll = function() {

    sm2.unmute();

  };

  /**
   * Calls the toggleMute() method of a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.toggleMute = function(sID) {

    if (!idCheck(sID)) return false;

    return sm2.sounds[sID].toggleMute();

  };

  /**
   * Retrieves the memory used by the flash plugin.
   *
   * @return {number} The amount of memory in use
   */

  this.getMemoryUse = function() {

    // flash-only
    var ram = 0;

    if (flash && fV !== 8) {
      ram = parseInt(flash._getMemoryUse(), 10);
    }

    return ram;

  };

  /**
   * Undocumented: NOPs soundManager and all SMSound objects.
   */

  this.disable = function(bNoDisable) {

    // destroy all functions
    var i;

    if (bNoDisable === _undefined) {
      bNoDisable = false;
    }

    // already disabled?
    if (disabled) return false;

    disabled = true;

    _wDS('shutdown', 1);

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      disableObject(sm2.sounds[sm2.soundIDs[i]]);
    }

    disableObject(sm2);

    // fire "complete", despite fail
    initComplete(bNoDisable);

    event.remove(window, 'load', initUserOnload);

    return true;

  };

  /**
   * Determines playability of a MIME type, eg. 'audio/mp3'.
   */

  this.canPlayMIME = function(sMIME) {

    var result;

    if (sm2.hasHTML5) {
      result = html5CanPlay({
        type: sMIME
      });
    }

    if (!result && needsFlash) {
      // if flash 9, test netStream (movieStar) types as well.
      result = (sMIME && sm2.ok() ? !!((fV > 8 ? sMIME.match(netStreamMimeTypes) : null) || sMIME.match(sm2.mimePattern)) : null); // TODO: make less "weird" (per JSLint)
    }

    return result;

  };

  /**
   * Determines playability of a URL based on audio support.
   *
   * @param {string} sURL The URL to test
   * @return {boolean} URL playability
   */

  this.canPlayURL = function(sURL) {

    var result;

    if (sm2.hasHTML5) {
      result = html5CanPlay({
        url: sURL
      });
    }

    if (!result && needsFlash) {
      result = (sURL && sm2.ok() ? !!(sURL.match(sm2.filePattern)) : null);
    }

    return result;

  };

  /**
   * Determines playability of an HTML DOM &lt;a&gt; object (or similar object literal) based on audio support.
   *
   * @param {object} oLink an HTML DOM &lt;a&gt; object or object literal including href and/or type attributes
   * @return {boolean} URL playability
   */

  this.canPlayLink = function(oLink) {

    if (oLink.type !== _undefined && oLink.type && sm2.canPlayMIME(oLink.type)) return true;

    return sm2.canPlayURL(oLink.href);

  };

  /**
   * Retrieves a SMSound object by ID.
   *
   * @param {string} sID The ID of the sound
   * @return {SMSound} The SMSound object
   */

  this.getSoundById = function(sID, _suppressDebug) {

    if (!sID) return null;

    var result = sm2.sounds[sID];

    // <d>
    if (!result && !_suppressDebug) {
      sm2._wD(sm + '.getSoundById(): Sound "' + sID + '" not found.', 2);
    }
    // </d>

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has successfully initialized.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.onready = function(oMethod, oScope) {

    var sType = 'onready',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (didInit) {
        sm2._wD(str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = window;
      }

      addOnEvent(sType, oMethod, oScope);
      processOnEvents();

      result = true;

    } else {

      throw str('needFunction', sType);

    }

    return result;

  };

  /**
   * Queues a callback for execution when SoundManager has failed to initialize.
   *
   * @param {function} oMethod The callback method to fire
   * @param {object} oScope Optional: The scope to apply to the callback
   */

  this.ontimeout = function(oMethod, oScope) {

    var sType = 'ontimeout',
        result = false;

    if (typeof oMethod === 'function') {

      // <d>
      if (didInit) {
        sm2._wD(str('queue', sType));
      }
      // </d>

      if (!oScope) {
        oScope = window;
      }

      addOnEvent(sType, oMethod, oScope);
      processOnEvents({ type: sType });

      result = true;

    } else {

      throw str('needFunction', sType);

    }

    return result;

  };

  /**
   * Writes console.log()-style debug output to a console or in-browser element.
   * Applies when debugMode = true
   *
   * @param {string} sText The console message
   * @param {object} nType Optional log level (number), or object. Number case: Log type/style where 0 = 'info', 1 = 'warn', 2 = 'error'. Object case: Object to be dumped.
   */

  this._writeDebug = function(sText, sTypeOrObject) {

    // pseudo-private console.log()-style output
    // <d>

    var sDID = 'soundmanager-debug', o, oItem;

    if (!sm2.setupOptions.debugMode) return false;

    if (hasConsole && sm2.useConsole) {
      if (sTypeOrObject && typeof sTypeOrObject === 'object') {
        // object passed; dump to console.
        console.log(sText, sTypeOrObject);
      } else if (debugLevels[sTypeOrObject] !== _undefined) {
        console[debugLevels[sTypeOrObject]](sText);
      } else {
        console.log(sText);
      }
      if (sm2.consoleOnly) return true;
    }

    o = id(sDID);

    if (!o) return false;

    oItem = doc.createElement('div');

    if (++wdCount % 2 === 0) {
      oItem.className = 'sm2-alt';
    }

    if (sTypeOrObject === _undefined) {
      sTypeOrObject = 0;
    } else {
      sTypeOrObject = parseInt(sTypeOrObject, 10);
    }

    oItem.appendChild(doc.createTextNode(sText));

    if (sTypeOrObject) {
      if (sTypeOrObject >= 2) {
        oItem.style.fontWeight = 'bold';
      }
      if (sTypeOrObject === 3) {
        oItem.style.color = '#ff3333';
      }
    }

    // top-to-bottom
    // o.appendChild(oItem);

    // bottom-to-top
    o.insertBefore(oItem, o.firstChild);

    o = null;
    // </d>

    return true;

  };

  // <d>
  // last-resort debugging option
  if (wl.indexOf('sm2-debug=alert') !== -1) {
    this._writeDebug = function(sText) {
      window.alert(sText);
    };
  }
  // </d>

  // alias
  this._wD = this._writeDebug;

  /**
   * Provides debug / state information on all SMSound objects.
   */

  this._debug = function() {

    // <d>
    var i, j;
    _wDS('currentObj', 1);

    for (i = 0, j = sm2.soundIDs.length; i < j; i++) {
      sm2.sounds[sm2.soundIDs[i]]._debug();
    }
    // </d>

  };

  /**
   * Restarts and re-initializes the SoundManager instance.
   *
   * @param {boolean} resetEvents Optional: When true, removes all registered onready and ontimeout event callbacks.
   * @param {boolean} excludeInit Options: When true, does not call beginDelayedInit() (which would restart SM2).
   * @return {object} soundManager The soundManager instance.
   */

  this.reboot = function(resetEvents, excludeInit) {

    // reset some (or all) state, and re-init unless otherwise specified.

    // <d>
    if (sm2.soundIDs.length) {
      sm2._wD('Destroying ' + sm2.soundIDs.length + ' SMSound object' + (sm2.soundIDs.length !== 1 ? 's' : '') + '...');
    }
    // </d>

    var i, j, k;

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {
      sm2.sounds[sm2.soundIDs[i]].destruct();
    }

    // trash ze flash (remove from the DOM)

    if (flash) {

      try {

        if (isIE) {
          oRemovedHTML = flash.innerHTML;
        }

        oRemoved = flash.parentNode.removeChild(flash);

      } catch(e) {

        // Remove failed? May be due to flash blockers silently removing the SWF object/embed node from the DOM. Warn and continue.

        _wDS('badRemove', 2);

      }

    }

    // actually, force recreate of movie.

    oRemovedHTML = oRemoved = needsFlash = flash = null;

    sm2.enabled = didDCLoaded = didInit = waitingForEI = initPending = didAppend = appendSuccess = disabled = useGlobalHTML5Audio = sm2.swfLoaded = false;

    sm2.soundIDs = [];
    sm2.sounds = {};

    idCounter = 0;
    didSetup = false;

    if (!resetEvents) {
      // reset callbacks for onready, ontimeout etc. so that they will fire again on re-init
      for (i in on_queue) {
        if (on_queue.hasOwnProperty(i)) {
          for (j = 0, k = on_queue[i].length; j < k; j++) {
            on_queue[i][j].fired = false;
          }
        }
      }
    } else {
      // remove all callbacks entirely
      on_queue = [];
    }

    // <d>
    if (!excludeInit) {
      sm2._wD(sm + ': Rebooting...');
    }
    // </d>

    // reset HTML5 and flash canPlay test results

    sm2.html5 = {
      usingFlash: null
    };

    sm2.flash = {};

    // reset device-specific HTML/flash mode switches

    sm2.html5Only = false;
    sm2.ignoreFlash = false;

    window.setTimeout(function() {

      // by default, re-init

      if (!excludeInit) {
        sm2.beginDelayedInit();
      }

    }, 20);

    return sm2;

  };

  this.reset = function() {

    /**
     * Shuts down and restores the SoundManager instance to its original loaded state, without an explicit reboot. All onready/ontimeout handlers are removed.
     * After this call, SM2 may be re-initialized via soundManager.beginDelayedInit().
     * @return {object} soundManager The soundManager instance.
     */

    _wDS('reset');

    return sm2.reboot(true, true);

  };

  /**
   * Undocumented: Determines the SM2 flash movie's load progress.
   *
   * @return {number or null} Percent loaded, or if invalid/unsupported, null.
   */

  this.getMoviePercent = function() {

    /**
     * Interesting syntax notes...
     * Flash/ExternalInterface (ActiveX/NPAPI) bridge methods are not typeof "function" nor instanceof Function, but are still valid.
     * Furthermore, using (flash && flash.PercentLoaded) causes IE to throw "object doesn't support this property or method".
     * Thus, 'in' syntax must be used.
     */

    return (flash && 'PercentLoaded' in flash ? flash.PercentLoaded() : null);

  };

  /**
   * Additional helper for manually invoking SM2's init process after DOM Ready / window.onload().
   */

  this.beginDelayedInit = function() {

    windowLoaded = true;
    domContentLoaded();

    setTimeout(function() {

      if (initPending) return false;

      createMovie();
      initMovie();
      initPending = true;

      return true;

    }, 20);

    delayWaitForEI();

  };

  /**
   * Destroys the SoundManager instance and all SMSound instances.
   */

  this.destruct = function() {

    sm2._wD(sm + '.destruct()');
    sm2.disable(true);

  };

  /**
   * SMSound() (sound object) constructor
   * ------------------------------------
   *
   * @param {object} oOptions Sound options (id and url are required attributes)
   * @return {SMSound} The new SMSound object
   */

  SMSound = function(oOptions) {

    var s = this, resetProperties, add_html5_events, remove_html5_events, stop_html5_timer, start_html5_timer, attachOnPosition, onplay_called = false, onPositionItems = [], onPositionFired = 0, detachOnPosition, applyFromTo, lastURL = null, lastHTML5State, urlOmitted;

    lastHTML5State = {
      // tracks duration + position (time)
      duration: null,
      time: null
    };

    this.id = oOptions.id;

    // legacy
    this.sID = this.id;

    this.url = oOptions.url;
    this.options = mixin(oOptions);

    // per-play-instance-specific options
    this.instanceOptions = this.options;

    // short alias
    this._iO = this.instanceOptions;

    // assign property defaults
    this.pan = this.options.pan;
    this.volume = this.options.volume;

    // whether or not this object is using HTML5
    this.isHTML5 = false;

    // internal HTML5 Audio() object reference
    this._a = null;

    // for flash 8 special-case createSound() without url, followed by load/play with url case
    urlOmitted = (!this.url);

    /**
     * SMSound() public methods
     * ------------------------
     */

    this.id3 = {};

    /**
     * Writes SMSound object parameters to debug console
     */

    this._debug = function() {

      // <d>
      sm2._wD(s.id + ': Merged options:', s.options);
      // </d>

    };

    /**
     * Begins loading a sound per its *url*.
     *
     * @param {object} options Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.load = function(options) {

      var oSound = null, instanceOptions;

      if (options !== _undefined) {
        s._iO = mixin(options, s.options);
      } else {
        options = s.options;
        s._iO = options;
        if (lastURL && lastURL !== s.url) {
          _wDS('manURL');
          s._iO.url = s.url;
          s.url = null;
        }
      }

      if (!s._iO.url) {
        s._iO.url = s.url;
      }

      s._iO.url = parseURL(s._iO.url);

      // ensure we're in sync
      s.instanceOptions = s._iO;

      // local shortcut
      instanceOptions = s._iO;

      sm2._wD(s.id + ': load (' + instanceOptions.url + ')');

      if (!instanceOptions.url && !s.url) {
        sm2._wD(s.id + ': load(): url is unassigned. Exiting.', 2);
        return s;
      }

      // <d>
      if (!s.isHTML5 && fV === 8 && !s.url && !instanceOptions.autoPlay) {
        // flash 8 load() -> play() won't work before onload has fired.
        sm2._wD(s.id + ': Flash 8 load() limitation: Wait for onload() before calling play().', 1);
      }
      // </d>

      if (instanceOptions.url === s.url && s.readyState !== 0 && s.readyState !== 2) {
        _wDS('onURL', 1);
        // if loaded and an onload() exists, fire immediately.
        if (s.readyState === 3 && instanceOptions.onload) {
          // assume success based on truthy duration.
          wrapCallback(s, function() {
            instanceOptions.onload.apply(s, [(!!s.duration)]);
          });
        }
        return s;
      }

      // reset a few state properties

      s.loaded = false;
      s.readyState = 1;
      s.playState = 0;
      s.id3 = {};

      // TODO: If switching from HTML5 -> flash (or vice versa), stop currently-playing audio.

      if (html5OK(instanceOptions)) {

        oSound = s._setup_html5(instanceOptions);

        if (!oSound._called_load) {

          s._html5_canplay = false;

          // TODO: review called_load / html5_canplay logic

          // if url provided directly to load(), assign it here.

          if (s.url !== instanceOptions.url) {

            sm2._wD(_wDS('manURL') + ': ' + instanceOptions.url);

            s._a.src = instanceOptions.url;

            // TODO: review / re-apply all relevant options (volume, loop, onposition etc.)

            // reset position for new URL
            s.setPosition(0);

          }

          // given explicit load call, try to preload.

          // early HTML5 implementation (non-standard)
          s._a.autobuffer = 'auto';

          // standard property, values: none / metadata / auto
          // reference: http://msdn.microsoft.com/en-us/library/ie/ff974759%28v=vs.85%29.aspx
          s._a.preload = 'auto';

          s._a._called_load = true;

        } else {

          sm2._wD(s.id + ': Ignoring request to load again');

        }

      } else {

        if (sm2.html5Only) {
          sm2._wD(s.id + ': No flash support. Exiting.');
          return s;
        }

        if (s._iO.url && s._iO.url.match(/data:/i)) {
          // data: URIs not supported by Flash, either.
          sm2._wD(s.id + ': data: URIs not supported via Flash. Exiting.');
          return s;
        }

        try {
          s.isHTML5 = false;
          s._iO = policyFix(loopFix(instanceOptions));
          // if we have "position", disable auto-play as we'll be seeking to that position at onload().
          if (s._iO.autoPlay && (s._iO.position || s._iO.from)) {
            sm2._wD(s.id + ': Disabling autoPlay because of non-zero offset case');
            s._iO.autoPlay = false;
          }
          // re-assign local shortcut
          instanceOptions = s._iO;
          if (fV === 8) {
            flash._load(s.id, instanceOptions.url, instanceOptions.stream, instanceOptions.autoPlay, instanceOptions.usePolicyFile);
          } else {
            flash._load(s.id, instanceOptions.url, !!(instanceOptions.stream), !!(instanceOptions.autoPlay), instanceOptions.loops || 1, !!(instanceOptions.autoLoad), instanceOptions.usePolicyFile);
          }
        } catch(e) {
          _wDS('smError', 2);
          debugTS('onload', false);
          catchError({
            type: 'SMSOUND_LOAD_JS_EXCEPTION',
            fatal: true
          });
        }

      }

      // after all of this, ensure sound url is up to date.
      s.url = instanceOptions.url;

      return s;

    };

    /**
     * Unloads a sound, canceling any open HTTP requests.
     *
     * @return {SMSound} The SMSound object
     */

    this.unload = function() {

      // Flash 8/AS2 can't "close" a stream - fake it by loading an empty URL
      // Flash 9/AS3: Close stream, preventing further load
      // HTML5: Most UAs will use empty URL

      if (s.readyState !== 0) {

        sm2._wD(s.id + ': unload()');

        if (!s.isHTML5) {

          if (fV === 8) {
            flash._unload(s.id, emptyURL);
          } else {
            flash._unload(s.id);
          }

        } else {

          stop_html5_timer();

          if (s._a) {

            s._a.pause();

            // update empty URL, too
            lastURL = html5Unload(s._a);

          }

        }

        // reset load/status flags
        resetProperties();

      }

      return s;

    };

    /**
     * Unloads and destroys a sound.
     */

    this.destruct = function(_bFromSM) {

      sm2._wD(s.id + ': Destruct');

      if (!s.isHTML5) {

        // kill sound within Flash
        // Disable the onfailure handler
        s._iO.onfailure = null;
        flash._destroySound(s.id);

      } else {

        stop_html5_timer();

        if (s._a) {
          s._a.pause();
          html5Unload(s._a);
          if (!useGlobalHTML5Audio) {
            remove_html5_events();
          }
          // break obvious circular reference
          s._a._s = null;
          s._a = null;
        }

      }

      if (!_bFromSM) {
        // ensure deletion from controller
        sm2.destroySound(s.id, true);
      }

    };

    /**
     * Begins playing a sound.
     *
     * @param {object} options Optional: Sound options
     * @return {SMSound} The SMSound object
     */

    this.play = function(options, _updatePlayState) {

      var fN, allowMulti, a, onready,
          audioClone, onended, oncanplay,
          startOK = true;

      // <d>
      fN = s.id + ': play(): ';
      // </d>

      // default to true
      _updatePlayState = (_updatePlayState === _undefined ? true : _updatePlayState);

      if (!options) {
        options = {};
      }

      // first, use local URL (if specified)
      if (s.url) {
        s._iO.url = s.url;
      }

      // mix in any options defined at createSound()
      s._iO = mixin(s._iO, s.options);

      // mix in any options specific to this method
      s._iO = mixin(options, s._iO);

      s._iO.url = parseURL(s._iO.url);

      s.instanceOptions = s._iO;

      // RTMP-only
      if (!s.isHTML5 && s._iO.serverURL && !s.connected) {
        if (!s.getAutoPlay()) {
          sm2._wD(fN + ' Netstream not connected yet - setting autoPlay');
          s.setAutoPlay(true);
        }
        // play will be called in onconnect()
        return s;
      }

      if (html5OK(s._iO)) {
        s._setup_html5(s._iO);
        start_html5_timer();
      }

      if (s.playState === 1 && !s.paused) {

        allowMulti = s._iO.multiShot;

        if (!allowMulti) {

          sm2._wD(fN + 'Already playing (one-shot)', 1);

          if (s.isHTML5) {
            // go back to original position.
            s.setPosition(s._iO.position);
          }

          return s;

        }

        sm2._wD(fN + 'Already playing (multi-shot)', 1);

      }

      // edge case: play() with explicit URL parameter
      if (options.url && options.url !== s.url) {

        // special case for createSound() followed by load() / play() with url; avoid double-load case.
        if (!s.readyState && !s.isHTML5 && fV === 8 && urlOmitted) {

          urlOmitted = false;

        } else {

          // load using merged options
          s.load(s._iO);

        }

      }

      if (!s.loaded) {

        if (s.readyState === 0) {

          sm2._wD(fN + 'Attempting to load');

          // try to get this sound playing ASAP
          if (!s.isHTML5 && !sm2.html5Only) {

            // flash: assign directly because setAutoPlay() increments the instanceCount
            s._iO.autoPlay = true;
            s.load(s._iO);

          } else if (s.isHTML5) {

            // iOS needs this when recycling sounds, loading a new URL on an existing object.
            s.load(s._iO);

          } else {

            sm2._wD(fN + 'Unsupported type. Exiting.');

            return s;

          }

          // HTML5 hack - re-set instanceOptions?
          s.instanceOptions = s._iO;

        } else if (s.readyState === 2) {

          sm2._wD(fN + 'Could not load - exiting', 2);

          return s;

        } else {

          sm2._wD(fN + 'Loading - attempting to play...');

        }

      } else {

        // "play()"
        sm2._wD(fN.substr(0, fN.lastIndexOf(':')));

      }

      if (!s.isHTML5 && fV === 9 && s.position > 0 && s.position === s.duration) {
        // flash 9 needs a position reset if play() is called while at the end of a sound.
        sm2._wD(fN + 'Sound at end, resetting to position: 0');
        options.position = 0;
      }

      /**
       * Streams will pause when their buffer is full if they are being loaded.
       * In this case paused is true, but the song hasn't started playing yet.
       * If we just call resume() the onplay() callback will never be called.
       * So only call resume() if the position is > 0.
       * Another reason is because options like volume won't have been applied yet.
       * For normal sounds, just resume.
       */

      if (s.paused && s.position >= 0 && (!s._iO.serverURL || s.position > 0)) {

        // https://gist.github.com/37b17df75cc4d7a90bf6
        sm2._wD(fN + 'Resuming from paused state', 1);
        s.resume();

      } else {

        s._iO = mixin(options, s._iO);

        /**
         * Preload in the event of play() with position under Flash,
         * or from/to parameters and non-RTMP case
         */
        if (((!s.isHTML5 && s._iO.position !== null && s._iO.position > 0) || (s._iO.from !== null && s._iO.from > 0) || s._iO.to !== null) && s.instanceCount === 0 && s.playState === 0 && !s._iO.serverURL) {

          onready = function() {
            // sound "canplay" or onload()
            // re-apply position/from/to to instance options, and start playback
            s._iO = mixin(options, s._iO);
            s.play(s._iO);
          };

          // HTML5 needs to at least have "canplay" fired before seeking.
          if (s.isHTML5 && !s._html5_canplay) {

            // this hasn't been loaded yet. load it first, and then do this again.
            sm2._wD(fN + 'Beginning load for non-zero offset case');

            s.load({
              // note: custom HTML5-only event added for from/to implementation.
              _oncanplay: onready
            });

          } else if (!s.isHTML5 && !s.loaded && (!s.readyState || s.readyState !== 2)) {

            // to be safe, preload the whole thing in Flash.

            sm2._wD(fN + 'Preloading for non-zero offset case');

            s.load({
              onload: onready
            });

          }

          // otherwise, we're ready to go. re-apply local options, and continue

          s._iO = applyFromTo();

        }

        // sm2._wD(fN + 'Starting to play');

        // increment instance counter, where enabled + supported
        if (!s.instanceCount || s._iO.multiShotEvents || (s.isHTML5 && s._iO.multiShot && !useGlobalHTML5Audio) || (!s.isHTML5 && fV > 8 && !s.getAutoPlay())) {
          s.instanceCount++;
        }

        // if first play and onposition parameters exist, apply them now
        if (s._iO.onposition && s.playState === 0) {
          attachOnPosition(s);
        }

        s.playState = 1;
        s.paused = false;

        s.position = (s._iO.position !== _undefined && !isNaN(s._iO.position) ? s._iO.position : 0);

        if (!s.isHTML5) {
          s._iO = policyFix(loopFix(s._iO));
        }

        if (s._iO.onplay && _updatePlayState) {
          s._iO.onplay.apply(s);
          onplay_called = true;
        }

        s.setVolume(s._iO.volume, true);
        s.setPan(s._iO.pan, true);

        if (s._iO.playbackRate !== 1) {
          s.setPlaybackRate(s._iO.playbackRate);
        }

        if (!s.isHTML5) {

          startOK = flash._start(s.id, s._iO.loops || 1, (fV === 9 ? s.position : s.position / msecScale), s._iO.multiShot || false);

          if (fV === 9 && !startOK) {
            // edge case: no sound hardware, or 32-channel flash ceiling hit.
            // applies only to Flash 9, non-NetStream/MovieStar sounds.
            // http://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/flash/media/Sound.html#play%28%29
            sm2._wD(fN + 'No sound hardware, or 32-sound ceiling hit', 2);
            if (s._iO.onplayerror) {
              s._iO.onplayerror.apply(s);
            }

          }

        } else if (s.instanceCount < 2) {

            // HTML5 single-instance case

            start_html5_timer();

            a = s._setup_html5();

            s.setPosition(s._iO.position);

            a.play();

          } else {

            // HTML5 multi-shot case

            sm2._wD(s.id + ': Cloning Audio() for instance #' + s.instanceCount + '...');

            audioClone = new Audio(s._iO.url);

            onended = function() {
              event.remove(audioClone, 'ended', onended);
              s._onfinish(s);
              // cleanup
              html5Unload(audioClone);
              audioClone = null;
            };

            oncanplay = function() {
              event.remove(audioClone, 'canplay', oncanplay);
              try {
                audioClone.currentTime = s._iO.position / msecScale;
              } catch(err) {
                complain(s.id + ': multiShot play() failed to apply position of ' + (s._iO.position / msecScale));
              }
              audioClone.play();
            };

            event.add(audioClone, 'ended', onended);

            // apply volume to clones, too
            if (s._iO.volume !== _undefined) {
              audioClone.volume = Math.max(0, Math.min(1, s._iO.volume / 100));
            }

            // playing multiple muted sounds? if you do this, you're weird ;) - but let's cover it.
            if (s.muted) {
              audioClone.muted = true;
            }

            if (s._iO.position) {
              // HTML5 audio can't seek before onplay() event has fired.
              // wait for canplay, then seek to position and start playback.
              event.add(audioClone, 'canplay', oncanplay);
            } else {
              // begin playback at currentTime: 0
              audioClone.play();
            }

          }

      }

      return s;

    };

    // just for convenience
    this.start = this.play;

    /**
     * Stops playing a sound (and optionally, all sounds)
     *
     * @param {boolean} bAll Optional: Whether to stop all sounds
     * @return {SMSound} The SMSound object
     */

    this.stop = function(bAll) {

      var instanceOptions = s._iO,
          originalPosition;

      if (s.playState === 1) {

        sm2._wD(s.id + ': stop()');

        s._onbufferchange(0);
        s._resetOnPosition(0);
        s.paused = false;

        if (!s.isHTML5) {
          s.playState = 0;
        }

        // remove onPosition listeners, if any
        detachOnPosition();

        // and "to" position, if set
        if (instanceOptions.to) {
          s.clearOnPosition(instanceOptions.to);
        }

        if (!s.isHTML5) {

          flash._stop(s.id, bAll);

          // hack for netStream: just unload
          if (instanceOptions.serverURL) {
            s.unload();
          }

        } else if (s._a) {

            originalPosition = s.position;

            // act like Flash, though
            s.setPosition(0);

            // hack: reflect old position for onstop() (also like Flash)
            s.position = originalPosition;

            // html5 has no stop()
            // NOTE: pausing means iOS requires interaction to resume.
            s._a.pause();

            s.playState = 0;

            // and update UI
            s._onTimer();

            stop_html5_timer();

          }

        s.instanceCount = 0;
        s._iO = {};

        if (instanceOptions.onstop) {
          instanceOptions.onstop.apply(s);
        }

      }

      return s;

    };

    /**
     * Undocumented/internal: Sets autoPlay for RTMP.
     *
     * @param {boolean} autoPlay state
     */

    this.setAutoPlay = function(autoPlay) {

      sm2._wD(s.id + ': Autoplay turned ' + (autoPlay ? 'on' : 'off'));
      s._iO.autoPlay = autoPlay;

      if (!s.isHTML5) {
        flash._setAutoPlay(s.id, autoPlay);
        if (autoPlay) {
          // only increment the instanceCount if the sound isn't loaded (TODO: verify RTMP)
          if (!s.instanceCount && s.readyState === 1) {
            s.instanceCount++;
            sm2._wD(s.id + ': Incremented instance count to ' + s.instanceCount);
          }
        }
      }

    };

    /**
     * Undocumented/internal: Returns the autoPlay boolean.
     *
     * @return {boolean} The current autoPlay value
     */

    this.getAutoPlay = function() {

      return s._iO.autoPlay;

    };

    /**
     * Sets the playback rate of a sound (HTML5-only.)
     *
     * @param {number} playbackRate (+/-)
     * @return {SMSound} The SMSound object
     */

    this.setPlaybackRate = function(playbackRate) {

      // Per Mozilla, limit acceptable values to prevent playback from stopping (unless allowOverride is truthy.)
      // https://developer.mozilla.org/en-US/Apps/Build/Audio_and_video_delivery/WebAudio_playbackRate_explained
      var normalizedRate = Math.max(0.5, Math.min(4, playbackRate));

      // <d>
      if (normalizedRate !== playbackRate) {
        sm2._wD(s.id + ': setPlaybackRate(' + playbackRate + '): limiting rate to ' + normalizedRate, 2);
      }
      // </d>

      if (s.isHTML5) {
        try {
          s._iO.playbackRate = normalizedRate;
          s._a.playbackRate = normalizedRate;
        } catch(e) {
          sm2._wD(s.id + ': setPlaybackRate(' + normalizedRate + ') failed: ' + e.message, 2);
        }
      }

      return s;

    };

    /**
     * Sets the position of a sound.
     *
     * @param {number} nMsecOffset Position (milliseconds)
     * @return {SMSound} The SMSound object
     */

    this.setPosition = function(nMsecOffset) {

      if (nMsecOffset === _undefined) {
        nMsecOffset = 0;
      }

      var position, position1K,
          // Use the duration from the instance options, if we don't have a track duration yet.
          // position >= 0 and <= current available (loaded) duration
          offset = (s.isHTML5 ? Math.max(nMsecOffset, 0) : Math.min(s.duration || s._iO.duration, Math.max(nMsecOffset, 0)));

      s.position = offset;
      position1K = s.position / msecScale;
      s._resetOnPosition(s.position);
      s._iO.position = offset;

      if (!s.isHTML5) {

        position = (fV === 9 ? s.position : position1K);

        if (s.readyState && s.readyState !== 2) {
          // if paused or not playing, will not resume (by playing)
          flash._setPosition(s.id, position, (s.paused || !s.playState), s._iO.multiShot);
        }

      } else if (s._a) {

        // Set the position in the canplay handler if the sound is not ready yet
        if (s._html5_canplay) {

          if (s._a.currentTime.toFixed(3) !== position1K.toFixed(3)) {

            /**
             * DOM/JS errors/exceptions to watch out for:
             * if seek is beyond (loaded?) position, "DOM exception 11"
             * "INDEX_SIZE_ERR": DOM exception 1
             */
            sm2._wD(s.id + ': setPosition(' + position1K + ')');

            try {
              s._a.currentTime = position1K;
              if (s.playState === 0 || s.paused) {
                // allow seek without auto-play/resume
                s._a.pause();
              }
            } catch(e) {
              sm2._wD(s.id + ': setPosition(' + position1K + ') failed: ' + e.message, 2);
            }

          }

        } else if (position1K) {

          // warn on non-zero seek attempts
          sm2._wD(s.id + ': setPosition(' + position1K + '): Cannot seek yet, sound not ready', 2);
          return s;

        }

        if (s.paused) {

          // if paused, refresh UI right away by forcing update
          s._onTimer(true);

        }

      }

      return s;

    };

    /**
     * Pauses sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.pause = function(_bCallFlash) {

      if (s.paused || (s.playState === 0 && s.readyState !== 1)) return s;

      sm2._wD(s.id + ': pause()');
      s.paused = true;

      if (!s.isHTML5) {
        if (_bCallFlash || _bCallFlash === _undefined) {
          flash._pause(s.id, s._iO.multiShot);
        }
      } else {
        s._setup_html5().pause();
        stop_html5_timer();
      }

      if (s._iO.onpause) {
        s._iO.onpause.apply(s);
      }

      return s;

    };

    /**
     * Resumes sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    /**
     * When auto-loaded streams pause on buffer full they have a playState of 0.
     * We need to make sure that the playState is set to 1 when these streams "resume".
     * When a paused stream is resumed, we need to trigger the onplay() callback if it
     * hasn't been called already. In this case since the sound is being played for the
     * first time, I think it's more appropriate to call onplay() rather than onresume().
     */

    this.resume = function() {

      var instanceOptions = s._iO;

      if (!s.paused) return s;

      sm2._wD(s.id + ': resume()');
      s.paused = false;
      s.playState = 1;

      if (!s.isHTML5) {

        if (instanceOptions.isMovieStar && !instanceOptions.serverURL) {
          // Bizarre Webkit bug (Chrome reported via 8tracks.com dudes): AAC content paused for 30+ seconds(?) will not resume without a reposition.
          s.setPosition(s.position);
        }

        // flash method is toggle-based (pause/resume)
        flash._pause(s.id, instanceOptions.multiShot);

      } else {

        s._setup_html5().play();
        start_html5_timer();

      }

      if (!onplay_called && instanceOptions.onplay) {

        instanceOptions.onplay.apply(s);
        onplay_called = true;

      } else if (instanceOptions.onresume) {

        instanceOptions.onresume.apply(s);

      }

      return s;

    };

    /**
     * Toggles sound playback.
     *
     * @return {SMSound} The SMSound object
     */

    this.togglePause = function() {

      sm2._wD(s.id + ': togglePause()');

      if (s.playState === 0) {
        s.play({
          position: (fV === 9 && !s.isHTML5 ? s.position : s.position / msecScale)
        });
        return s;
      }

      if (s.paused) {
        s.resume();
      } else {
        s.pause();
      }

      return s;

    };

    /**
     * Sets the panning (L-R) effect.
     *
     * @param {number} nPan The pan value (-100 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setPan = function(nPan, bInstanceOnly) {

      if (nPan === _undefined) {
        nPan = 0;
      }

      if (bInstanceOnly === _undefined) {
        bInstanceOnly = false;
      }

      if (!s.isHTML5) {
        flash._setPan(s.id, nPan);
      } // else { no HTML5 pan? }

      s._iO.pan = nPan;

      if (!bInstanceOnly) {
        s.pan = nPan;
        s.options.pan = nPan;
      }

      return s;

    };

    /**
     * Sets the volume.
     *
     * @param {number} nVol The volume value (0 to 100)
     * @return {SMSound} The SMSound object
     */

    this.setVolume = function(nVol, _bInstanceOnly) {

      /**
       * Note: Setting volume has no effect on iOS "special snowflake" devices.
       * Hardware volume control overrides software, and volume
       * will always return 1 per Apple docs. (iOS 4 + 5.)
       * http://developer.apple.com/library/safari/documentation/AudioVideo/Conceptual/HTML-canvas-guide/AddingSoundtoCanvasAnimations/AddingSoundtoCanvasAnimations.html
       */

      if (nVol === _undefined) {
        nVol = 100;
      }

      if (_bInstanceOnly === _undefined) {
        _bInstanceOnly = false;
      }

      if (!s.isHTML5) {

        flash._setVolume(s.id, (sm2.muted && !s.muted) || s.muted ? 0 : nVol);

      } else if (s._a) {

        if (sm2.muted && !s.muted) {
          s.muted = true;
          s._a.muted = true;
        }

        // valid range for native HTML5 Audio(): 0-1
        s._a.volume = Math.max(0, Math.min(1, nVol / 100));

      }

      s._iO.volume = nVol;

      if (!_bInstanceOnly) {
        s.volume = nVol;
        s.options.volume = nVol;
      }

      return s;

    };

    /**
     * Mutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.mute = function() {

      s.muted = true;

      if (!s.isHTML5) {
        flash._setVolume(s.id, 0);
      } else if (s._a) {
        s._a.muted = true;
      }

      return s;

    };

    /**
     * Unmutes the sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.unmute = function() {

      s.muted = false;
      var hasIO = (s._iO.volume !== _undefined);

      if (!s.isHTML5) {
        flash._setVolume(s.id, hasIO ? s._iO.volume : s.options.volume);
      } else if (s._a) {
        s._a.muted = false;
      }

      return s;

    };

    /**
     * Toggles the muted state of a sound.
     *
     * @return {SMSound} The SMSound object
     */

    this.toggleMute = function() {

      return (s.muted ? s.unmute() : s.mute());

    };

    /**
     * Registers a callback to be fired when a sound reaches a given position during playback.
     *
     * @param {number} nPosition The position to watch for
     * @param {function} oMethod The relevant callback to fire
     * @param {object} oScope Optional: The scope to apply the callback to
     * @return {SMSound} The SMSound object
     */

    this.onPosition = function(nPosition, oMethod, oScope) {

      // TODO: basic dupe checking?

      onPositionItems.push({
        position: parseInt(nPosition, 10),
        method: oMethod,
        scope: (oScope !== _undefined ? oScope : s),
        fired: false
      });

      return s;

    };

    // legacy/backwards-compability: lower-case method name
    this.onposition = this.onPosition;

    /**
     * Removes registered callback(s) from a sound, by position and/or callback.
     *
     * @param {number} nPosition The position to clear callback(s) for
     * @param {function} oMethod Optional: Identify one callback to be removed when multiple listeners exist for one position
     * @return {SMSound} The SMSound object
     */

    this.clearOnPosition = function(nPosition, oMethod) {

      var i;

      nPosition = parseInt(nPosition, 10);

      if (isNaN(nPosition)) {
        // safety check
        return;
      }

      for (i = 0; i < onPositionItems.length; i++) {

        if (nPosition === onPositionItems[i].position) {
          // remove this item if no method was specified, or, if the method matches

          if (!oMethod || (oMethod === onPositionItems[i].method)) {

            if (onPositionItems[i].fired) {
              // decrement "fired" counter, too
              onPositionFired--;
            }

            onPositionItems.splice(i, 1);

          }

        }

      }

    };

    this._processOnPosition = function() {

      var i, item, j = onPositionItems.length;

      if (!j || !s.playState || onPositionFired >= j) return false;

      for (i = j - 1; i >= 0; i--) {

        item = onPositionItems[i];

        if (!item.fired && s.position >= item.position) {

          item.fired = true;
          onPositionFired++;
          item.method.apply(item.scope, [item.position]);

          //  reset j -- onPositionItems.length can be changed in the item callback above... occasionally breaking the loop.
          j = onPositionItems.length;

        }

      }

      return true;

    };

    this._resetOnPosition = function(nPosition) {

      // reset "fired" for items interested in this position
      var i, item, j = onPositionItems.length;

      if (!j) return false;

      for (i = j - 1; i >= 0; i--) {

        item = onPositionItems[i];

        if (item.fired && nPosition <= item.position) {
          item.fired = false;
          onPositionFired--;
        }

      }

      return true;

    };

    /**
     * SMSound() private internals
     * --------------------------------
     */

    applyFromTo = function() {

      var instanceOptions = s._iO,
          f = instanceOptions.from,
          t = instanceOptions.to,
          start, end;

      end = function() {

        // end has been reached.
        sm2._wD(s.id + ': "To" time of ' + t + ' reached.');

        // detach listener
        s.clearOnPosition(t, end);

        // stop should clear this, too
        s.stop();

      };

      start = function() {

        sm2._wD(s.id + ': Playing "from" ' + f);

        // add listener for end
        if (t !== null && !isNaN(t)) {
          s.onPosition(t, end);
        }

      };

      if (f !== null && !isNaN(f)) {

        // apply to instance options, guaranteeing correct start position.
        instanceOptions.position = f;

        // multiShot timing can't be tracked, so prevent that.
        instanceOptions.multiShot = false;

        start();

      }

      // return updated instanceOptions including starting position
      return instanceOptions;

    };

    attachOnPosition = function() {

      var item,
          op = s._iO.onposition;

      // attach onposition things, if any, now.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.onPosition(parseInt(item, 10), op[item]);
          }
        }

      }

    };

    detachOnPosition = function() {

      var item,
          op = s._iO.onposition;

      // detach any onposition()-style listeners.

      if (op) {

        for (item in op) {
          if (op.hasOwnProperty(item)) {
            s.clearOnPosition(parseInt(item, 10));
          }
        }

      }

    };

    start_html5_timer = function() {

      if (s.isHTML5) {
        startTimer(s);
      }

    };

    stop_html5_timer = function() {

      if (s.isHTML5) {
        stopTimer(s);
      }

    };

    resetProperties = function(retainPosition) {

      if (!retainPosition) {
        onPositionItems = [];
        onPositionFired = 0;
      }

      onplay_called = false;

      s._hasTimer = null;
      s._a = null;
      s._html5_canplay = false;
      s.bytesLoaded = null;
      s.bytesTotal = null;
      s.duration = (s._iO && s._iO.duration ? s._iO.duration : null);
      s.durationEstimate = null;
      s.buffered = [];

      // legacy: 1D array
      s.eqData = [];

      s.eqData.left = [];
      s.eqData.right = [];

      s.failures = 0;
      s.isBuffering = false;
      s.instanceOptions = {};
      s.instanceCount = 0;
      s.loaded = false;
      s.metadata = {};

      // 0 = uninitialised, 1 = loading, 2 = failed/error, 3 = loaded/success
      s.readyState = 0;

      s.muted = false;
      s.paused = false;

      s.peakData = {
        left: 0,
        right: 0
      };

      s.waveformData = {
        left: [],
        right: []
      };

      s.playState = 0;
      s.position = null;

      s.id3 = {};

    };

    resetProperties();

    /**
     * Pseudo-private SMSound internals
     * --------------------------------
     */

    this._onTimer = function(bForce) {

      /**
       * HTML5-only _whileplaying() etc.
       * called from both HTML5 native events, and polling/interval-based timers
       * mimics flash and fires only when time/duration change, so as to be polling-friendly
       */

      var duration, isNew = false, time, x = {};

      if (s._hasTimer || bForce) {

        // TODO: May not need to track readyState (1 = loading)

        if (s._a && (bForce || ((s.playState > 0 || s.readyState === 1) && !s.paused))) {

          duration = s._get_html5_duration();

          if (duration !== lastHTML5State.duration) {

            lastHTML5State.duration = duration;
            s.duration = duration;
            isNew = true;

          }

          // TODO: investigate why this goes wack if not set/re-set each time.
          s.durationEstimate = s.duration;

          time = (s._a.currentTime * msecScale || 0);

          if (time !== lastHTML5State.time) {

            lastHTML5State.time = time;
            isNew = true;

          }

          if (isNew || bForce) {

            s._whileplaying(time, x, x, x, x);

          }

        }/* else {

          // sm2._wD('_onTimer: Warn for "'+s.id+'": '+(!s._a?'Could not find element. ':'')+(s.playState === 0?'playState bad, 0?':'playState = '+s.playState+', OK'));

          return false;

        }*/

      }

      return isNew;

    };

    this._get_html5_duration = function() {

      var instanceOptions = s._iO,
          // if audio object exists, use its duration - else, instance option duration (if provided - it's a hack, really, and should be retired) OR null
          d = (s._a && s._a.duration ? s._a.duration * msecScale : (instanceOptions && instanceOptions.duration ? instanceOptions.duration : null)),
          result = (d && !isNaN(d) && d !== Infinity ? d : null);

      return result;

    };

    this._apply_loop = function(a, nLoops) {

      /**
       * boolean instead of "loop", for webkit? - spec says string. http://www.w3.org/TR/html-markup/audio.html#audio.attrs.loop
       * note that loop is either off or infinite under HTML5, unlike Flash which allows arbitrary loop counts to be specified.
       */

      // <d>
      if (!a.loop && nLoops > 1) {
        sm2._wD('Note: Native HTML5 looping is infinite.', 1);
      }
      // </d>

      a.loop = (nLoops > 1 ? 'loop' : '');

    };

    this._setup_html5 = function(options) {

      var instanceOptions = mixin(s._iO, options),
          a = useGlobalHTML5Audio ? globalHTML5Audio : s._a,
          dURL = decodeURI(instanceOptions.url),
          sameURL;

      /**
       * "First things first, I, Poppa..." (reset the previous state of the old sound, if playing)
       * Fixes case with devices that can only play one sound at a time
       * Otherwise, other sounds in mid-play will be terminated without warning and in a stuck state
       */

      if (useGlobalHTML5Audio) {

        if (dURL === decodeURI(lastGlobalHTML5URL)) {
          // global HTML5 audio: re-use of URL
          sameURL = true;
        }

      } else if (dURL === decodeURI(lastURL)) {

        // options URL is the same as the "last" URL, and we used (loaded) it
        sameURL = true;

      }

      if (a) {

        if (a._s) {

          if (useGlobalHTML5Audio) {

            if (a._s && a._s.playState && !sameURL) {

              // global HTML5 audio case, and loading a new URL. stop the currently-playing one.
              a._s.stop();

            }

          } else if (!useGlobalHTML5Audio && dURL === decodeURI(lastURL)) {

            // non-global HTML5 reuse case: same url, ignore request
            s._apply_loop(a, instanceOptions.loops);

            return a;

          }

        }

        if (!sameURL) {

          // don't retain onPosition() stuff with new URLs.

          if (lastURL) {
            resetProperties(false);
          }

          // assign new HTML5 URL

          a.src = instanceOptions.url;

          s.url = instanceOptions.url;

          lastURL = instanceOptions.url;

          lastGlobalHTML5URL = instanceOptions.url;

          a._called_load = false;

        }

      } else {

        if (instanceOptions.autoLoad || instanceOptions.autoPlay) {

          s._a = new Audio(instanceOptions.url);
          s._a.load();

        } else {

          // null for stupid Opera 9.64 case
          s._a = (isOpera && opera.version() < 10 ? new Audio(null) : new Audio());

        }

        // assign local reference
        a = s._a;

        a._called_load = false;

        if (useGlobalHTML5Audio) {

          globalHTML5Audio = a;

        }

      }

      s.isHTML5 = true;

      // store a ref on the track
      s._a = a;

      // store a ref on the audio
      a._s = s;

      add_html5_events();

      s._apply_loop(a, instanceOptions.loops);

      if (instanceOptions.autoLoad || instanceOptions.autoPlay) {

        s.load();

      } else {

        // early HTML5 implementation (non-standard)
        a.autobuffer = false;

        // standard ('none' is also an option.)
        a.preload = 'auto';

      }

      return a;

    };

    add_html5_events = function() {

      if (s._a._added_events) return false;

      var f;

      function add(oEvt, oFn, bCapture) {
        return s._a ? s._a.addEventListener(oEvt, oFn, bCapture || false) : null;
      }

      s._a._added_events = true;

      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          add(f, html5_events[f]);
        }
      }

      return true;

    };

    remove_html5_events = function() {

      // Remove event listeners

      var f;

      function remove(oEvt, oFn, bCapture) {
        return (s._a ? s._a.removeEventListener(oEvt, oFn, bCapture || false) : null);
      }

      sm2._wD(s.id + ': Removing event listeners');
      s._a._added_events = false;

      for (f in html5_events) {
        if (html5_events.hasOwnProperty(f)) {
          remove(f, html5_events[f]);
        }
      }

    };

    /**
     * Pseudo-private event internals
     * ------------------------------
     */

    this._onload = function(nSuccess) {

      var fN,
          // check for duration to prevent false positives from flash 8 when loading from cache.
          loadOK = !!nSuccess || (!s.isHTML5 && fV === 8 && s.duration);

      // <d>
      fN = s.id + ': ';
      sm2._wD(fN + (loadOK ? 'onload()' : 'Failed to load / invalid sound?' + (!s.duration ? ' Zero-length duration reported.' : ' -') + ' (' + s.url + ')'), (loadOK ? 1 : 2));

      if (!loadOK && !s.isHTML5) {
        if (sm2.sandbox.noRemote === true) {
          sm2._wD(fN + str('noNet'), 1);
        }
        if (sm2.sandbox.noLocal === true) {
          sm2._wD(fN + str('noLocal'), 1);
        }
      }
      // </d>

      s.loaded = loadOK;
      s.readyState = (loadOK ? 3 : 2);
      s._onbufferchange(0);

      if (!loadOK && !s.isHTML5) {
        // note: no error code from Flash.
        s._onerror();
      }

      if (s._iO.onload) {
        wrapCallback(s, function() {
          s._iO.onload.apply(s, [loadOK]);
        });
      }

      return true;

    };

    this._onerror = function(errorCode, description) {

      // https://html.spec.whatwg.org/multipage/embedded-content.html#error-codes
      if (s._iO.onerror) {
        wrapCallback(s, function() {
          s._iO.onerror.apply(s, [errorCode, description]);
        });
      }

    };

    this._onbufferchange = function(nIsBuffering) {

      // ignore if not playing
      if (s.playState === 0) return false;

      if ((nIsBuffering && s.isBuffering) || (!nIsBuffering && !s.isBuffering)) return false;

      s.isBuffering = (nIsBuffering === 1);

      if (s._iO.onbufferchange) {
        sm2._wD(s.id + ': Buffer state change: ' + nIsBuffering);
        s._iO.onbufferchange.apply(s, [nIsBuffering]);
      }

      return true;

    };

    /**
     * Playback may have stopped due to buffering, or related reason.
     * This state can be encountered on iOS < 6 when auto-play is blocked.
     */

    this._onsuspend = function() {

      if (s._iO.onsuspend) {
        sm2._wD(s.id + ': Playback suspended');
        s._iO.onsuspend.apply(s);
      }

      return true;

    };

    /**
     * flash 9/movieStar + RTMP-only method, should fire only once at most
     * at this point we just recreate failed sounds rather than trying to reconnect
     */

    this._onfailure = function(msg, level, code) {

      s.failures++;
      sm2._wD(s.id + ': Failure (' + s.failures + '): ' + msg);

      if (s._iO.onfailure && s.failures === 1) {
        s._iO.onfailure(msg, level, code);
      } else {
        sm2._wD(s.id + ': Ignoring failure');
      }

    };

    /**
     * flash 9/movieStar + RTMP-only method for unhandled warnings/exceptions from Flash
     * e.g., RTMP "method missing" warning (non-fatal) for getStreamLength on server
     */

    this._onwarning = function(msg, level, code) {

      if (s._iO.onwarning) {
        s._iO.onwarning(msg, level, code);
      }

    };

    this._onfinish = function() {

      // store local copy before it gets trashed...
      var io_onfinish = s._iO.onfinish;

      s._onbufferchange(0);
      s._resetOnPosition(0);

      // reset some state items
      if (s.instanceCount) {

        s.instanceCount--;

        if (!s.instanceCount) {

          // remove onPosition listeners, if any
          detachOnPosition();

          // reset instance options
          s.playState = 0;
          s.paused = false;
          s.instanceCount = 0;
          s.instanceOptions = {};
          s._iO = {};
          stop_html5_timer();

          // reset position, too
          if (s.isHTML5) {
            s.position = 0;
          }

        }

        if (!s.instanceCount || s._iO.multiShotEvents) {
          // fire onfinish for last, or every instance
          if (io_onfinish) {
            sm2._wD(s.id + ': onfinish()');
            wrapCallback(s, function() {
              io_onfinish.apply(s);
            });
          }
        }

      }

    };

    this._whileloading = function(nBytesLoaded, nBytesTotal, nDuration, nBufferLength) {

      var instanceOptions = s._iO;

      s.bytesLoaded = nBytesLoaded;
      s.bytesTotal = nBytesTotal;
      s.duration = Math.floor(nDuration);
      s.bufferLength = nBufferLength;

      if (!s.isHTML5 && !instanceOptions.isMovieStar) {

        if (instanceOptions.duration) {
          // use duration from options, if specified and larger. nobody should be specifying duration in options, actually, and it should be retired.
          s.durationEstimate = (s.duration > instanceOptions.duration) ? s.duration : instanceOptions.duration;
        } else {
          s.durationEstimate = parseInt((s.bytesTotal / s.bytesLoaded) * s.duration, 10);
        }

      } else {

        s.durationEstimate = s.duration;

      }

      // for flash, reflect sequential-load-style buffering
      if (!s.isHTML5) {
        s.buffered = [{
          start: 0,
          end: s.duration
        }];
      }

      // allow whileloading to fire even if "load" fired under HTML5, due to HTTP range/partials
      if ((s.readyState !== 3 || s.isHTML5) && instanceOptions.whileloading) {
        instanceOptions.whileloading.apply(s);
      }

    };

    this._whileplaying = function(nPosition, oPeakData, oWaveformDataLeft, oWaveformDataRight, oEQData) {

      var instanceOptions = s._iO,
          eqLeft;

      // flash safety net
      if (isNaN(nPosition) || nPosition === null) return false;

      // Safari HTML5 play() may return small -ve values when starting from position: 0, eg. -50.120396875. Unexpected/invalid per W3, I think. Normalize to 0.
      s.position = Math.max(0, nPosition);

      s._processOnPosition();

      if (!s.isHTML5 && fV > 8) {

        if (instanceOptions.usePeakData && oPeakData !== _undefined && oPeakData) {
          s.peakData = {
            left: oPeakData.leftPeak,
            right: oPeakData.rightPeak
          };
        }

        if (instanceOptions.useWaveformData && oWaveformDataLeft !== _undefined && oWaveformDataLeft) {
          s.waveformData = {
            left: oWaveformDataLeft.split(','),
            right: oWaveformDataRight.split(',')
          };
        }

        if (instanceOptions.useEQData) {
          if (oEQData !== _undefined && oEQData && oEQData.leftEQ) {
            eqLeft = oEQData.leftEQ.split(',');
            s.eqData = eqLeft;
            s.eqData.left = eqLeft;
            if (oEQData.rightEQ !== _undefined && oEQData.rightEQ) {
              s.eqData.right = oEQData.rightEQ.split(',');
            }
          }
        }

      }

      if (s.playState === 1) {

        // special case/hack: ensure buffering is false if loading from cache (and not yet started)
        if (!s.isHTML5 && fV === 8 && !s.position && s.isBuffering) {
          s._onbufferchange(0);
        }

        if (instanceOptions.whileplaying) {
          // flash may call after actual finish
          instanceOptions.whileplaying.apply(s);
        }

      }

      return true;

    };

    this._oncaptiondata = function(oData) {

      /**
       * internal: flash 9 + NetStream (MovieStar/RTMP-only) feature
       *
       * @param {object} oData
       */

      sm2._wD(s.id + ': Caption data received.');

      s.captiondata = oData;

      if (s._iO.oncaptiondata) {
        s._iO.oncaptiondata.apply(s, [oData]);
      }

    };

    this._onmetadata = function(oMDProps, oMDData) {

      /**
       * internal: flash 9 + NetStream (MovieStar/RTMP-only) feature
       * RTMP may include song title, MovieStar content may include encoding info
       *
       * @param {array} oMDProps (names)
       * @param {array} oMDData (values)
       */

      sm2._wD(s.id + ': Metadata received.');

      var oData = {}, i, j;

      for (i = 0, j = oMDProps.length; i < j; i++) {
        oData[oMDProps[i]] = oMDData[i];
      }

      s.metadata = oData;

      if (s._iO.onmetadata) {
        s._iO.onmetadata.call(s, s.metadata);
      }

    };

    this._onid3 = function(oID3Props, oID3Data) {

      /**
       * internal: flash 8 + flash 9 ID3 feature
       * may include artist, song title etc.
       *
       * @param {array} oID3Props (names)
       * @param {array} oID3Data (values)
       */

      sm2._wD(s.id + ': ID3 data received.');

      var oData = [], i, j;

      for (i = 0, j = oID3Props.length; i < j; i++) {
        oData[oID3Props[i]] = oID3Data[i];
      }

      s.id3 = mixin(s.id3, oData);

      if (s._iO.onid3) {
        s._iO.onid3.apply(s);
      }

    };

    // flash/RTMP-only

    this._onconnect = function(bSuccess) {

      bSuccess = (bSuccess === 1);
      sm2._wD(s.id + ': ' + (bSuccess ? 'Connected.' : 'Failed to connect? - ' + s.url), (bSuccess ? 1 : 2));
      s.connected = bSuccess;

      if (bSuccess) {

        s.failures = 0;

        if (idCheck(s.id)) {
          if (s.getAutoPlay()) {
            // only update the play state if auto playing
            s.play(_undefined, s.getAutoPlay());
          } else if (s._iO.autoLoad) {
            s.load();
          }
        }

        if (s._iO.onconnect) {
          s._iO.onconnect.apply(s, [bSuccess]);
        }

      }

    };

    this._ondataerror = function(sError) {

      // flash 9 wave/eq data handler
      // hack: called at start, and end from flash at/after onfinish()
      if (s.playState > 0) {
        sm2._wD(s.id + ': Data error: ' + sError);
        if (s._iO.ondataerror) {
          s._iO.ondataerror.apply(s);
        }
      }

    };

    // <d>
    this._debug();
    // </d>

  }; // SMSound()

  /**
   * Private SoundManager internals
   * ------------------------------
   */

  getDocument = function() {

    return (doc.body || doc.getElementsByTagName('div')[0]);

  };

  id = function(sID) {

    return doc.getElementById(sID);

  };

  mixin = function(oMain, oAdd) {

    // non-destructive merge
    var o1 = (oMain || {}), o2, o;

    // if unspecified, o2 is the default options object
    o2 = (oAdd === _undefined ? sm2.defaultOptions : oAdd);

    for (o in o2) {

      if (o2.hasOwnProperty(o) && o1[o] === _undefined) {

        if (typeof o2[o] !== 'object' || o2[o] === null) {

          // assign directly
          o1[o] = o2[o];

        } else {

          // recurse through o2
          o1[o] = mixin(o1[o], o2[o]);

        }

      }

    }

    return o1;

  };

  wrapCallback = function(oSound, callback) {

    /**
     * 03/03/2013: Fix for Flash Player 11.6.602.171 + Flash 8 (flashVersion = 8) SWF issue
     * setTimeout() fix for certain SMSound callbacks like onload() and onfinish(), where subsequent calls like play() and load() fail when Flash Player 11.6.602.171 is installed, and using soundManager with flashVersion = 8 (which is the default).
     * Not sure of exact cause. Suspect race condition and/or invalid (NaN-style) position argument trickling down to the next JS -> Flash _start() call, in the play() case.
     * Fix: setTimeout() to yield, plus safer null / NaN checking on position argument provided to Flash.
     * https://getsatisfaction.com/schillmania/topics/recent_chrome_update_seems_to_have_broken_my_sm2_audio_player
     */
    if (!oSound.isHTML5 && fV === 8) {
      window.setTimeout(callback, 0);
    } else {
      callback();
    }

  };

  // additional soundManager properties that soundManager.setup() will accept

  extraOptions = {
    onready: 1,
    ontimeout: 1,
    defaultOptions: 1,
    flash9Options: 1,
    movieStarOptions: 1
  };

  assign = function(o, oParent) {

    /**
     * recursive assignment of properties, soundManager.setup() helper
     * allows property assignment based on whitelist
     */

    var i,
        result = true,
        hasParent = (oParent !== _undefined),
        setupOptions = sm2.setupOptions,
        bonusOptions = extraOptions;

    // <d>

    // if soundManager.setup() called, show accepted parameters.

    if (o === _undefined) {

      result = [];

      for (i in setupOptions) {

        if (setupOptions.hasOwnProperty(i)) {
          result.push(i);
        }

      }

      for (i in bonusOptions) {

        if (bonusOptions.hasOwnProperty(i)) {

          if (typeof sm2[i] === 'object') {
            result.push(i + ': {...}');
          } else if (sm2[i] instanceof Function) {
            result.push(i + ': function() {...}');
          } else {
            result.push(i);
          }

        }

      }

      sm2._wD(str('setup', result.join(', ')));

      return false;

    }

    // </d>

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // if not an {object} we want to recurse through...

        if (typeof o[i] !== 'object' || o[i] === null || o[i] instanceof Array || o[i] instanceof RegExp) {

          // check "allowed" options

          if (hasParent && bonusOptions[oParent] !== _undefined) {

            // valid recursive / nested object option, eg., { defaultOptions: { volume: 50 } }
            sm2[oParent][i] = o[i];

          } else if (setupOptions[i] !== _undefined) {

            // special case: assign to setupOptions object, which soundManager property references
            sm2.setupOptions[i] = o[i];

            // assign directly to soundManager, too
            sm2[i] = o[i];

          } else if (bonusOptions[i] === _undefined) {

            // invalid or disallowed parameter. complain.
            complain(str((sm2[i] === _undefined ? 'setupUndef' : 'setupError'), i), 2);

            result = false;

          } else if (sm2[i] instanceof Function) {

            /**
             * valid extraOptions (bonusOptions) parameter.
             * is it a method, like onready/ontimeout? call it.
             * multiple parameters should be in an array, eg. soundManager.setup({onready: [myHandler, myScope]});
             */
            sm2[i].apply(sm2, (o[i] instanceof Array ? o[i] : [o[i]]));

          } else {

            // good old-fashioned direct assignment
            sm2[i] = o[i];

          }

        } else if (bonusOptions[i] === _undefined) {

          // recursion case, eg., { defaultOptions: { ... } }

          // invalid or disallowed parameter. complain.
          complain(str((sm2[i] === _undefined ? 'setupUndef' : 'setupError'), i), 2);

          result = false;

        } else {

          // recurse through object
          return assign(o[i], i);

        }

      }

    }

    return result;

  };

  function preferFlashCheck(kind) {

    // whether flash should play a given type
    return (sm2.preferFlash && hasFlash && !sm2.ignoreFlash && (sm2.flash[kind] !== _undefined && sm2.flash[kind]));

  }

  /**
   * Internal DOM2-level event helpers
   * ---------------------------------
   */

  event = (function() {

    // normalize event methods
    var old = (window.attachEvent),
    evt = {
      add: (old ? 'attachEvent' : 'addEventListener'),
      remove: (old ? 'detachEvent' : 'removeEventListener')
    };

    // normalize "on" event prefix, optional capture argument
    function getArgs(oArgs) {

      var args = slice.call(oArgs),
          len = args.length;

      if (old) {
        // prefix
        args[1] = 'on' + args[1];
        if (len > 3) {
          // no capture
          args.pop();
        }
      } else if (len === 3) {
        args.push(false);
      }

      return args;

    }

    function apply(args, sType) {

      // normalize and call the event method, with the proper arguments
      var element = args.shift(),
          method = [evt[sType]];

      if (old) {
        // old IE can't do apply().
        element[method](args[0], args[1]);
      } else {
        element[method].apply(element, args);
      }

    }

    function add() {
      apply(getArgs(arguments), 'add');
    }

    function remove() {
      apply(getArgs(arguments), 'remove');
    }

    return {
      add: add,
      remove: remove
    };

  }());

  /**
   * Internal HTML5 event handling
   * -----------------------------
   */

  function html5_event(oFn) {

    // wrap html5 event handlers so we don't call them on destroyed and/or unloaded sounds

    return function(e) {

      var s = this._s,
          result;

      if (!s || !s._a) {
        // <d>
        if (s && s.id) {
          sm2._wD(s.id + ': Ignoring ' + e.type);
        } else {
          sm2._wD(h5 + 'Ignoring ' + e.type);
        }
        // </d>
        result = null;
      } else {
        result = oFn.call(this, e);
      }

      return result;

    };

  }

  html5_events = {

    // HTML5 event-name-to-handler map

    abort: html5_event(function() {

      sm2._wD(this._s.id + ': abort');

    }),

    // enough has loaded to play

    canplay: html5_event(function() {

      var s = this._s,
          position1K;

      if (s._html5_canplay) {
        // this event has already fired. ignore.
        return;
      }

      s._html5_canplay = true;
      sm2._wD(s.id + ': canplay');
      s._onbufferchange(0);

      // position according to instance options
      position1K = (s._iO.position !== _undefined && !isNaN(s._iO.position) ? s._iO.position / msecScale : null);

      // set the position if position was provided before the sound loaded
      if (this.currentTime !== position1K) {
        sm2._wD(s.id + ': canplay: Setting position to ' + position1K);
        try {
          this.currentTime = position1K;
        } catch(ee) {
          sm2._wD(s.id + ': canplay: Setting position of ' + position1K + ' failed: ' + ee.message, 2);
        }
      }

      // hack for HTML5 from/to case
      if (s._iO._oncanplay) {
        s._iO._oncanplay();
      }

    }),

    canplaythrough: html5_event(function() {

      var s = this._s;

      if (!s.loaded) {
        s._onbufferchange(0);
        s._whileloading(s.bytesLoaded, s.bytesTotal, s._get_html5_duration());
        s._onload(true);
      }

    }),

    durationchange: html5_event(function() {

      // durationchange may fire at various times, probably the safest way to capture accurate/final duration.

      var s = this._s,
          duration;

      duration = s._get_html5_duration();

      if (!isNaN(duration) && duration !== s.duration) {

        sm2._wD(this._s.id + ': durationchange (' + duration + ')' + (s.duration ? ', previously ' + s.duration : ''));

        s.durationEstimate = s.duration = duration;

      }

    }),

    // TODO: Reserved for potential use
    /*
    emptied: html5_event(function() {

      sm2._wD(this._s.id + ': emptied');

    }),
    */

    ended: html5_event(function() {

      var s = this._s;

      sm2._wD(s.id + ': ended');

      s._onfinish();

    }),

    error: html5_event(function() {

      var description = (html5ErrorCodes[this.error.code] || null);
      sm2._wD(this._s.id + ': HTML5 error, code ' + this.error.code + (description ? ' (' + description + ')' : ''));
      this._s._onload(false);
      this._s._onerror(this.error.code, description);

    }),

    loadeddata: html5_event(function() {

      var s = this._s;

      sm2._wD(s.id + ': loadeddata');

      // safari seems to nicely report progress events, eventually totalling 100%
      if (!s._loaded && !isSafari) {
        s.duration = s._get_html5_duration();
      }

    }),

    loadedmetadata: html5_event(function() {

      sm2._wD(this._s.id + ': loadedmetadata');

    }),

    loadstart: html5_event(function() {

      sm2._wD(this._s.id + ': loadstart');
      // assume buffering at first
      this._s._onbufferchange(1);

    }),

    play: html5_event(function() {

      // sm2._wD(this._s.id + ': play()');
      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    playing: html5_event(function() {

      sm2._wD(this._s.id + ': playing ' + String.fromCharCode(9835));
      // once play starts, no buffering
      this._s._onbufferchange(0);

    }),

    progress: html5_event(function(e) {

      // note: can fire repeatedly after "loaded" event, due to use of HTTP range/partials

      var s = this._s,
          i, j, progStr, buffered = 0,
          isProgress = (e.type === 'progress'),
          ranges = e.target.buffered,
          // firefox 3.6 implements e.loaded/total (bytes)
          loaded = (e.loaded || 0),
          total = (e.total || 1);

      // reset the "buffered" (loaded byte ranges) array
      s.buffered = [];

      if (ranges && ranges.length) {

        // if loaded is 0, try TimeRanges implementation as % of load
        // https://developer.mozilla.org/en/DOM/TimeRanges

        // re-build "buffered" array
        // HTML5 returns seconds. SM2 API uses msec for setPosition() etc., whether Flash or HTML5.
        for (i = 0, j = ranges.length; i < j; i++) {
          s.buffered.push({
            start: ranges.start(i) * msecScale,
            end: ranges.end(i) * msecScale
          });
        }

        // use the last value locally
        buffered = (ranges.end(0) - ranges.start(0)) * msecScale;

        // linear case, buffer sum; does not account for seeking and HTTP partials / byte ranges
        loaded = Math.min(1, buffered / (e.target.duration * msecScale));

        // <d>
        if (isProgress && ranges.length > 1) {
          progStr = [];
          j = ranges.length;
          for (i = 0; i < j; i++) {
            progStr.push((e.target.buffered.start(i) * msecScale) + '-' + (e.target.buffered.end(i) * msecScale));
          }
          sm2._wD(this._s.id + ': progress, timeRanges: ' + progStr.join(', '));
        }

        if (isProgress && !isNaN(loaded)) {
          sm2._wD(this._s.id + ': progress, ' + Math.floor(loaded * 100) + '% loaded');
        }
        // </d>

      }

      if (!isNaN(loaded)) {

        // TODO: prevent calls with duplicate values.
        s._whileloading(loaded, total, s._get_html5_duration());
        if (loaded && total && loaded === total) {
          // in case "onload" doesn't fire (eg. gecko 1.9.2)
          html5_events.canplaythrough.call(this, e);
        }

      }

    }),

    ratechange: html5_event(function() {

      sm2._wD(this._s.id + ': ratechange');

    }),

    suspend: html5_event(function(e) {

      // download paused/stopped, may have finished (eg. onload)
      var s = this._s;

      sm2._wD(this._s.id + ': suspend');
      html5_events.progress.call(this, e);
      s._onsuspend();

    }),

    stalled: html5_event(function() {

      sm2._wD(this._s.id + ': stalled');

    }),

    timeupdate: html5_event(function() {

      this._s._onTimer();

    }),

    waiting: html5_event(function() {

      var s = this._s;

      // see also: seeking
      sm2._wD(this._s.id + ': waiting');

      // playback faster than download rate, etc.
      s._onbufferchange(1);

    })

  };

  html5OK = function(iO) {

    // playability test based on URL or MIME type

    var result;

    if (!iO || (!iO.type && !iO.url && !iO.serverURL)) {

      // nothing to check
      result = false;

    } else if (iO.serverURL || (iO.type && preferFlashCheck(iO.type))) {

      // RTMP, or preferring flash
      result = false;

    } else {

      // Use type, if specified. Pass data: URIs to HTML5. If HTML5-only mode, no other options, so just give 'er
      result = ((iO.type ? html5CanPlay({ type: iO.type }) : html5CanPlay({ url: iO.url }) || sm2.html5Only || iO.url.match(/data:/i)));

    }

    return result;

  };

  html5Unload = function(oAudio) {

    /**
     * Internal method: Unload media, and cancel any current/pending network requests.
     * Firefox can load an empty URL, which allegedly destroys the decoder and stops the download.
     * https://developer.mozilla.org/En/Using_audio_and_video_in_Firefox#Stopping_the_download_of_media
     * However, Firefox has been seen loading a relative URL from '' and thus requesting the hosting page on unload.
     * Other UA behaviour is unclear, so everyone else gets an about:blank-style URL.
     */

    var url;

    if (oAudio) {

      // Firefox and Chrome accept short WAVe data: URIs. Chome dislikes audio/wav, but accepts audio/wav for data: MIME.
      // Desktop Safari complains / fails on data: URI, so it gets about:blank.
      url = (isSafari ? emptyURL : (sm2.html5.canPlayType('audio/wav') ? emptyWAV : emptyURL));

      oAudio.src = url;

      // reset some state, too
      if (oAudio._called_unload !== _undefined) {
        oAudio._called_load = false;
      }

    }

    if (useGlobalHTML5Audio) {

      // ensure URL state is trashed, also
      lastGlobalHTML5URL = null;

    }

    return url;

  };

  html5CanPlay = function(o) {

    /**
     * Try to find MIME, test and return truthiness
     * o = {
     *  url: '/path/to/an.mp3',
     *  type: 'audio/mp3'
     * }
     */

    if (!sm2.useHTML5Audio || !sm2.hasHTML5) return false;

    var url = (o.url || null),
        mime = (o.type || null),
        aF = sm2.audioFormats,
        result,
        offset,
        fileExt,
        item;

    // account for known cases like audio/mp3

    if (mime && sm2.html5[mime] !== _undefined) return (sm2.html5[mime] && !preferFlashCheck(mime));

    if (!html5Ext) {

      html5Ext = [];

      for (item in aF) {

        if (aF.hasOwnProperty(item)) {

          html5Ext.push(item);

          if (aF[item].related) {
            html5Ext = html5Ext.concat(aF[item].related);
          }

        }

      }

      html5Ext = new RegExp('\\.(' + html5Ext.join('|') + ')(\\?.*)?$', 'i');

    }

    // TODO: Strip URL queries, etc.
    fileExt = (url ? url.toLowerCase().match(html5Ext) : null);

    if (!fileExt || !fileExt.length) {

      if (!mime) {

        result = false;

      } else {

        // audio/mp3 -> mp3, result should be known
        offset = mime.indexOf(';');

        // strip "audio/X; codecs..."
        fileExt = (offset !== -1 ? mime.substr(0, offset) : mime).substr(6);

      }

    } else {

      // match the raw extension name - "mp3", for example
      fileExt = fileExt[1];

    }

    if (fileExt && sm2.html5[fileExt] !== _undefined) {

      // result known
      result = (sm2.html5[fileExt] && !preferFlashCheck(fileExt));

    } else {

      mime = 'audio/' + fileExt;
      result = sm2.html5.canPlayType({ type: mime });

      sm2.html5[fileExt] = result;

      // sm2._wD('canPlayType, found result: ' + result);
      result = (result && sm2.html5[mime] && !preferFlashCheck(mime));
    }

    return result;

  };

  testHTML5 = function() {

    /**
     * Internal: Iterates over audioFormats, determining support eg. audio/mp3, audio/mpeg and so on
     * assigns results to html5[] and flash[].
     */

    if (!sm2.useHTML5Audio || !sm2.hasHTML5) {

      // without HTML5, we need Flash.
      sm2.html5.usingFlash = true;
      needsFlash = true;

      return false;

    }

    // double-whammy: Opera 9.64 throws WRONG_ARGUMENTS_ERR if no parameter passed to Audio(), and Webkit + iOS happily tries to load "null" as a URL. :/
    var a = (Audio !== _undefined ? (isOpera && opera.version() < 10 ? new Audio(null) : new Audio()) : null),
        item, lookup, support = {}, aF, i;

    function cp(m) {

      var canPlay, j,
          result = false,
          isOK = false;

      if (!a || typeof a.canPlayType !== 'function') return result;

      if (m instanceof Array) {

        // iterate through all mime types, return any successes

        for (i = 0, j = m.length; i < j; i++) {

          if (sm2.html5[m[i]] || a.canPlayType(m[i]).match(sm2.html5Test)) {

            isOK = true;
            sm2.html5[m[i]] = true;

            // note flash support, too
            sm2.flash[m[i]] = !!(m[i].match(flashMIME));

          }

        }

        result = isOK;

      } else {

        canPlay = (a && typeof a.canPlayType === 'function' ? a.canPlayType(m) : false);
        result = !!(canPlay && (canPlay.match(sm2.html5Test)));

      }

      return result;

    }

    // test all registered formats + codecs

    aF = sm2.audioFormats;

    for (item in aF) {

      if (aF.hasOwnProperty(item)) {

        lookup = 'audio/' + item;

        support[item] = cp(aF[item].type);

        // write back generic type too, eg. audio/mp3
        support[lookup] = support[item];

        // assign flash
        if (item.match(flashMIME)) {

          sm2.flash[item] = true;
          sm2.flash[lookup] = true;

        } else {

          sm2.flash[item] = false;
          sm2.flash[lookup] = false;

        }

        // assign result to related formats, too

        if (aF[item] && aF[item].related) {

          for (i = aF[item].related.length - 1; i >= 0; i--) {

            // eg. audio/m4a
            support['audio/' + aF[item].related[i]] = support[item];
            sm2.html5[aF[item].related[i]] = support[item];
            sm2.flash[aF[item].related[i]] = support[item];

          }

        }

      }

    }

    support.canPlayType = (a ? cp : null);
    sm2.html5 = mixin(sm2.html5, support);

    sm2.html5.usingFlash = featureCheck();
    needsFlash = sm2.html5.usingFlash;

    return true;

  };

  strings = {

    // <d>
    notReady: 'Unavailable - wait until onready() has fired.',
    notOK: 'Audio support is not available.',
    domError: sm + 'exception caught while appending SWF to DOM.',
    spcWmode: 'Removing wmode, preventing known SWF loading issue(s)',
    swf404: smc + 'Verify that %s is a valid path.',
    tryDebug: 'Try ' + sm + '.debugFlash = true for more security details (output goes to SWF.)',
    checkSWF: 'See SWF output for more debug info.',
    localFail: smc + 'Non-HTTP page (' + doc.location.protocol + ' URL?) Review Flash player security settings for this special case:\nhttp://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html\nMay need to add/allow path, eg. c:/sm2/ or /users/me/sm2/',
    waitFocus: smc + 'Special case: Waiting for SWF to load with window focus...',
    waitForever: smc + 'Waiting indefinitely for Flash (will recover if unblocked)...',
    waitSWF: smc + 'Waiting for 100% SWF load...',
    needFunction: smc + 'Function object expected for %s',
    badID: 'Sound ID "%s" should be a string, starting with a non-numeric character',
    currentObj: smc + '_debug(): Current sound objects',
    waitOnload: smc + 'Waiting for window.onload()',
    docLoaded: smc + 'Document already loaded',
    onload: smc + 'initComplete(): calling soundManager.onload()',
    onloadOK: sm + '.onload() complete',
    didInit: smc + 'init(): Already called?',
    secNote: 'Flash security note: Network/internet URLs will not load due to security restrictions. Access can be configured via Flash Player Global Security Settings Page: http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager04.html',
    badRemove: smc + 'Failed to remove Flash node.',
    shutdown: sm + '.disable(): Shutting down',
    queue: smc + 'Queueing %s handler',
    smError: 'SMSound.load(): Exception: JS-Flash communication failed, or JS error.',
    fbTimeout: 'No flash response, applying .' + swfCSS.swfTimedout + ' CSS...',
    fbLoaded: 'Flash loaded',
    fbHandler: smc + 'flashBlockHandler()',
    manURL: 'SMSound.load(): Using manually-assigned URL',
    onURL: sm + '.load(): current URL already assigned.',
    badFV: sm + '.flashVersion must be 8 or 9. "%s" is invalid. Reverting to %s.',
    as2loop: 'Note: Setting stream:false so looping can work (flash 8 limitation)',
    noNSLoop: 'Note: Looping not implemented for MovieStar formats',
    needfl9: 'Note: Switching to flash 9, required for MP4 formats.',
    mfTimeout: 'Setting flashLoadTimeout = 0 (infinite) for off-screen, mobile flash case',
    needFlash: smc + 'Fatal error: Flash is needed to play some required formats, but is not available.',
    gotFocus: smc + 'Got window focus.',
    policy: 'Enabling usePolicyFile for data access',
    setup: sm + '.setup(): allowed parameters: %s',
    setupError: sm + '.setup(): "%s" cannot be assigned with this method.',
    setupUndef: sm + '.setup(): Could not find option "%s"',
    setupLate: sm + '.setup(): url, flashVersion and html5Test property changes will not take effect until reboot().',
    noURL: smc + 'Flash URL required. Call soundManager.setup({url:...}) to get started.',
    sm2Loaded: 'SoundManager 2: Ready. ' + String.fromCharCode(10003),
    reset: sm + '.reset(): Removing event callbacks',
    mobileUA: 'Mobile UA detected, preferring HTML5 by default.',
    globalHTML5: 'Using singleton HTML5 Audio() pattern for this device.',
    ignoreMobile: 'Ignoring mobile restrictions for this device.'
    // </d>

  };

  str = function() {

    // internal string replace helper.
    // arguments: o [,items to replace]
    // <d>

    var args,
        i, j, o,
        sstr;

    // real array, please
    args = slice.call(arguments);

    // first argument
    o = args.shift();

    sstr = (strings && strings[o] ? strings[o] : '');

    if (sstr && args && args.length) {
      for (i = 0, j = args.length; i < j; i++) {
        sstr = sstr.replace('%s', args[i]);
      }
    }

    return sstr;
    // </d>

  };

  loopFix = function(sOpt) {

    // flash 8 requires stream = false for looping to work
    if (fV === 8 && sOpt.loops > 1 && sOpt.stream) {
      _wDS('as2loop');
      sOpt.stream = false;
    }

    return sOpt;

  };

  policyFix = function(sOpt, sPre) {

    if (sOpt && !sOpt.usePolicyFile && (sOpt.onid3 || sOpt.usePeakData || sOpt.useWaveformData || sOpt.useEQData)) {
      sm2._wD((sPre || '') + str('policy'));
      sOpt.usePolicyFile = true;
    }

    return sOpt;

  };

  complain = function(sMsg) {

    // <d>
    if (hasConsole && console.warn !== _undefined) {
      console.warn(sMsg);
    } else {
      sm2._wD(sMsg);
    }
    // </d>

  };

  doNothing = function() {

    return false;

  };

  disableObject = function(o) {

    var oProp;

    for (oProp in o) {
      if (o.hasOwnProperty(oProp) && typeof o[oProp] === 'function') {
        o[oProp] = doNothing;
      }
    }

    oProp = null;

  };

  failSafely = function(bNoDisable) {

    // general failure exception handler

    if (bNoDisable === _undefined) {
      bNoDisable = false;
    }

    if (disabled || bNoDisable) {
      sm2.disable(bNoDisable);
    }

  };

  normalizeMovieURL = function(movieURL) {

    var urlParams = null, url;

    if (movieURL) {

      if (movieURL.match(/\.swf(\?.*)?$/i)) {

        urlParams = movieURL.substr(movieURL.toLowerCase().lastIndexOf('.swf?') + 4);

        // assume user knows what they're doing
        if (urlParams) return movieURL;

      } else if (movieURL.lastIndexOf('/') !== movieURL.length - 1) {

        // append trailing slash, if needed
        movieURL += '/';

      }

    }

    url = (movieURL && movieURL.lastIndexOf('/') !== -1 ? movieURL.substr(0, movieURL.lastIndexOf('/') + 1) : './') + sm2.movieURL;

    if (sm2.noSWFCache) {
      url += ('?ts=' + new Date().getTime());
    }

    return url;

  };

  setVersionInfo = function() {

    // short-hand for internal use

    fV = parseInt(sm2.flashVersion, 10);

    if (fV !== 8 && fV !== 9) {
      sm2._wD(str('badFV', fV, defaultFlashVersion));
      sm2.flashVersion = fV = defaultFlashVersion;
    }

    // debug flash movie, if applicable

    var isDebug = (sm2.debugMode || sm2.debugFlash ? '_debug.swf' : '.swf');

    if (sm2.useHTML5Audio && !sm2.html5Only && sm2.audioFormats.mp4.required && fV < 9) {
      sm2._wD(str('needfl9'));
      sm2.flashVersion = fV = 9;
    }

    sm2.version = sm2.versionNumber + (sm2.html5Only ? ' (HTML5-only mode)' : (fV === 9 ? ' (AS3/Flash 9)' : ' (AS2/Flash 8)'));

    // set up default options
    if (fV > 8) {

      // +flash 9 base options
      sm2.defaultOptions = mixin(sm2.defaultOptions, sm2.flash9Options);
      sm2.features.buffering = true;

      // +moviestar support
      sm2.defaultOptions = mixin(sm2.defaultOptions, sm2.movieStarOptions);
      sm2.filePatterns.flash9 = new RegExp('\\.(mp3|' + netStreamTypes.join('|') + ')(\\?.*)?$', 'i');
      sm2.features.movieStar = true;

    } else {

      sm2.features.movieStar = false;

    }

    // regExp for flash canPlay(), etc.
    sm2.filePattern = sm2.filePatterns[(fV !== 8 ? 'flash9' : 'flash8')];

    // if applicable, use _debug versions of SWFs
    sm2.movieURL = (fV === 8 ? 'soundmanager2.swf' : 'soundmanager2_flash9.swf').replace('.swf', isDebug);

    sm2.features.peakData = sm2.features.waveformData = sm2.features.eqData = (fV > 8);

  };

  setPolling = function(bPolling, bHighPerformance) {

    if (!flash) {
      return;
    }

    flash._setPolling(bPolling, bHighPerformance);

  };

  initDebug = function() {

    // starts debug mode, creating output <div> for UAs without console object

    // allow force of debug mode via URL
    // <d>
    if (sm2.debugURLParam.test(wl)) {
      sm2.setupOptions.debugMode = sm2.debugMode = true;
    }

    if (id(sm2.debugID)) {
      return;
    }

    var oD, oDebug, oTarget, oToggle, tmp;

    if (sm2.debugMode && !id(sm2.debugID) && (!hasConsole || !sm2.useConsole || !sm2.consoleOnly)) {

      oD = doc.createElement('div');
      oD.id = sm2.debugID + '-toggle';

      oToggle = {
        position: 'fixed',
        bottom: '0px',
        right: '0px',
        width: '1.2em',
        height: '1.2em',
        lineHeight: '1.2em',
        margin: '2px',
        textAlign: 'center',
        border: '1px solid #999',
        cursor: 'pointer',
        background: '#fff',
        color: '#333',
        zIndex: 10001
      };

      oD.appendChild(doc.createTextNode('-'));
      oD.onclick = toggleDebug;
      oD.title = 'Toggle SM2 debug console';

      if (ua.match(/msie 6/i)) {
        oD.style.position = 'absolute';
        oD.style.cursor = 'hand';
      }

      for (tmp in oToggle) {
        if (oToggle.hasOwnProperty(tmp)) {
          oD.style[tmp] = oToggle[tmp];
        }
      }

      oDebug = doc.createElement('div');
      oDebug.id = sm2.debugID;
      oDebug.style.display = (sm2.debugMode ? 'block' : 'none');

      if (sm2.debugMode && !id(oD.id)) {
        try {
          oTarget = getDocument();
          oTarget.appendChild(oD);
        } catch(e2) {
          throw new Error(str('domError') + ' \n' + e2.toString());
        }
        oTarget.appendChild(oDebug);
      }

    }

    oTarget = null;
    // </d>

  };

  idCheck = this.getSoundById;

  // <d>
  _wDS = function(o, errorLevel) {

    return (!o ? '' : sm2._wD(str(o), errorLevel));

  };

  toggleDebug = function() {

    var o = id(sm2.debugID),
    oT = id(sm2.debugID + '-toggle');

    if (!o) {
      return;
    }

    if (debugOpen) {
      // minimize
      oT.innerHTML = '+';
      o.style.display = 'none';
    } else {
      oT.innerHTML = '-';
      o.style.display = 'block';
    }

    debugOpen = !debugOpen;

  };

  debugTS = function(sEventType, bSuccess, sMessage) {

    // troubleshooter debug hooks

    if (window.sm2Debugger !== _undefined) {
      try {
        sm2Debugger.handleEvent(sEventType, bSuccess, sMessage);
      } catch(e) {
        // oh well
        return false;
      }
    }

    return true;

  };
  // </d>

  getSWFCSS = function() {

    var css = [];

    if (sm2.debugMode) {
      css.push(swfCSS.sm2Debug);
    }

    if (sm2.debugFlash) {
      css.push(swfCSS.flashDebug);
    }

    if (sm2.useHighPerformance) {
      css.push(swfCSS.highPerf);
    }

    return css.join(' ');

  };

  flashBlockHandler = function() {

    // *possible* flash block situation.

    var name = str('fbHandler'),
        p = sm2.getMoviePercent(),
        css = swfCSS,
        error = {
          type: 'FLASHBLOCK'
        };

    if (sm2.html5Only) {
      // no flash, or unused
      return;
    }

    if (!sm2.ok()) {

      if (needsFlash) {
        // make the movie more visible, so user can fix
        sm2.oMC.className = getSWFCSS() + ' ' + css.swfDefault + ' ' + (p === null ? css.swfTimedout : css.swfError);
        sm2._wD(name + ': ' + str('fbTimeout') + (p ? ' (' + str('fbLoaded') + ')' : ''));
      }

      sm2.didFlashBlock = true;

      // fire onready(), complain lightly
      processOnEvents({
        type: 'ontimeout',
        ignoreInit: true,
        error: error
      });

      catchError(error);

    } else {

      // SM2 loaded OK (or recovered)

      // <d>
      if (sm2.didFlashBlock) {
        sm2._wD(name + ': Unblocked');
      }
      // </d>

      if (sm2.oMC) {
        sm2.oMC.className = [getSWFCSS(), css.swfDefault, css.swfLoaded + (sm2.didFlashBlock ? ' ' + css.swfUnblocked : '')].join(' ');
      }

    }

  };

  addOnEvent = function(sType, oMethod, oScope) {

    if (on_queue[sType] === _undefined) {
      on_queue[sType] = [];
    }

    on_queue[sType].push({
      method: oMethod,
      scope: (oScope || null),
      fired: false
    });

  };

  processOnEvents = function(oOptions) {

    // if unspecified, assume OK/error

    if (!oOptions) {
      oOptions = {
        type: (sm2.ok() ? 'onready' : 'ontimeout')
      };
    }

    // not ready yet.
    if (!didInit && oOptions && !oOptions.ignoreInit) return false;

    // invalid case
    if (oOptions.type === 'ontimeout' && (sm2.ok() || (disabled && !oOptions.ignoreInit))) return false;

    var status = {
          success: (oOptions && oOptions.ignoreInit ? sm2.ok() : !disabled)
        },

        // queue specified by type, or none
        srcQueue = (oOptions && oOptions.type ? on_queue[oOptions.type] || [] : []),

        queue = [], i, j,
        args = [status],
        canRetry = (needsFlash && !sm2.ok());

    if (oOptions.error) {
      args[0].error = oOptions.error;
    }

    for (i = 0, j = srcQueue.length; i < j; i++) {
      if (srcQueue[i].fired !== true) {
        queue.push(srcQueue[i]);
      }
    }

    if (queue.length) {

      // sm2._wD(sm + ': Firing ' + queue.length + ' ' + oOptions.type + '() item' + (queue.length === 1 ? '' : 's'));
      for (i = 0, j = queue.length; i < j; i++) {

        if (queue[i].scope) {
          queue[i].method.apply(queue[i].scope, args);
        } else {
          queue[i].method.apply(this, args);
        }

        if (!canRetry) {
          // useFlashBlock and SWF timeout case doesn't count here.
          queue[i].fired = true;

        }

      }

    }

    return true;

  };

  initUserOnload = function() {

    window.setTimeout(function() {

      if (sm2.useFlashBlock) {
        flashBlockHandler();
      }

      processOnEvents();

      // call user-defined "onload", scoped to window

      if (typeof sm2.onload === 'function') {
        _wDS('onload', 1);
        sm2.onload.apply(window);
        _wDS('onloadOK', 1);
      }

      if (sm2.waitForWindowLoad) {
        event.add(window, 'load', initUserOnload);
      }

    }, 1);

  };

  detectFlash = function() {

    /**
     * Hat tip: Flash Detect library (BSD, (C) 2007) by Carl "DocYes" S. Yestrau
     * http://featureblend.com/javascript-flash-detection-library.html / http://featureblend.com/license.txt
     */

    // this work has already been done.
    if (hasFlash !== _undefined) return hasFlash;

    var hasPlugin = false, n = navigator, obj, type, types, AX = window.ActiveXObject;

    // MS Edge 14 throws an "Unspecified Error" because n.plugins is inaccessible due to permissions
    var nP;

    try {
      nP = n.plugins;
    } catch(e) {
      nP = undefined;
    }

    if (nP && nP.length) {

      type = 'application/x-shockwave-flash';
      types = n.mimeTypes;

      if (types && types[type] && types[type].enabledPlugin && types[type].enabledPlugin.description) {
        hasPlugin = true;
      }

    } else if (AX !== _undefined && !ua.match(/MSAppHost/i)) {

      // Windows 8 Store Apps (MSAppHost) are weird (compatibility?) and won't complain here, but will barf if Flash/ActiveX object is appended to the DOM.
      try {
        obj = new AX('ShockwaveFlash.ShockwaveFlash');
      } catch(e) {
        // oh well
        obj = null;
      }

      hasPlugin = (!!obj);

      // cleanup, because it is ActiveX after all
      obj = null;

    }

    hasFlash = hasPlugin;

    return hasPlugin;

  };

  featureCheck = function() {

    var flashNeeded,
        item,
        formats = sm2.audioFormats,
        // iPhone <= 3.1 has broken HTML5 audio(), but firmware 3.2 (original iPad) + iOS4 works.
        isSpecial = (is_iDevice && !!(ua.match(/os (1|2|3_0|3_1)\s/i)));

    if (isSpecial) {

      // has Audio(), but is broken; let it load links directly.
      sm2.hasHTML5 = false;

      // ignore flash case, however
      sm2.html5Only = true;

      // hide the SWF, if present
      if (sm2.oMC) {
        sm2.oMC.style.display = 'none';
      }

    } else if (sm2.useHTML5Audio) {

        if (!sm2.html5 || !sm2.html5.canPlayType) {
          sm2._wD('SoundManager: No HTML5 Audio() support detected.');
          sm2.hasHTML5 = false;
        }

        // <d>
        if (isBadSafari) {
          sm2._wD(smc + 'Note: Buggy HTML5 Audio in Safari on this OS X release, see https://bugs.webkit.org/show_bug.cgi?id=32159 - ' + (!hasFlash ? ' would use flash fallback for MP3/MP4, but none detected.' : 'will use flash fallback for MP3/MP4, if available'), 1);
        }
        // </d>

      }

    if (sm2.useHTML5Audio && sm2.hasHTML5) {

      // sort out whether flash is optional, required or can be ignored.

      // innocent until proven guilty.
      canIgnoreFlash = true;

      for (item in formats) {

        if (formats.hasOwnProperty(item)) {

          if (formats[item].required) {

            if (!sm2.html5.canPlayType(formats[item].type)) {

              // 100% HTML5 mode is not possible.
              canIgnoreFlash = false;
              flashNeeded = true;

            } else if (sm2.preferFlash && (sm2.flash[item] || sm2.flash[formats[item].type])) {

              // flash may be required, or preferred for this format.
              flashNeeded = true;

            }

          }

        }

      }

    }

    // sanity check...
    if (sm2.ignoreFlash) {
      flashNeeded = false;
      canIgnoreFlash = true;
    }

    sm2.html5Only = (sm2.hasHTML5 && sm2.useHTML5Audio && !flashNeeded);

    return (!sm2.html5Only);

  };

  parseURL = function(url) {

    /**
     * Internal: Finds and returns the first playable URL (or failing that, the first URL.)
     * @param {string or array} url A single URL string, OR, an array of URL strings or {url:'/path/to/resource', type:'audio/mp3'} objects.
     */

    var i, j, urlResult = 0, result;

    if (url instanceof Array) {

      // find the first good one
      for (i = 0, j = url.length; i < j; i++) {

        if (url[i] instanceof Object) {

          // MIME check
          if (sm2.canPlayMIME(url[i].type)) {
            urlResult = i;
            break;
          }

        } else if (sm2.canPlayURL(url[i])) {

          // URL string check
          urlResult = i;
          break;

        }

      }

      // normalize to string
      if (url[urlResult].url) {
        url[urlResult] = url[urlResult].url;
      }

      result = url[urlResult];

    } else {

      // single URL case
      result = url;

    }

    return result;

  };


  startTimer = function(oSound) {

    /**
     * attach a timer to this sound, and start an interval if needed
     */

    if (!oSound._hasTimer) {

      oSound._hasTimer = true;

      if (!mobileHTML5 && sm2.html5PollingInterval) {

        if (h5IntervalTimer === null && h5TimerCount === 0) {

          h5IntervalTimer = setInterval(timerExecute, sm2.html5PollingInterval);

        }

        h5TimerCount++;

      }

    }

  };

  stopTimer = function(oSound) {

    /**
     * detach a timer
     */

    if (oSound._hasTimer) {

      oSound._hasTimer = false;

      if (!mobileHTML5 && sm2.html5PollingInterval) {

        // interval will stop itself at next execution.

        h5TimerCount--;

      }

    }

  };

  timerExecute = function() {

    /**
     * manual polling for HTML5 progress events, ie., whileplaying()
     * (can achieve greater precision than conservative default HTML5 interval)
     */

    var i;

    if (h5IntervalTimer !== null && !h5TimerCount) {

      // no active timers, stop polling interval.

      clearInterval(h5IntervalTimer);

      h5IntervalTimer = null;

      return;

    }

    // check all HTML5 sounds with timers

    for (i = sm2.soundIDs.length - 1; i >= 0; i--) {

      if (sm2.sounds[sm2.soundIDs[i]].isHTML5 && sm2.sounds[sm2.soundIDs[i]]._hasTimer) {
        sm2.sounds[sm2.soundIDs[i]]._onTimer();
      }

    }

  };

  catchError = function(options) {

    options = (options !== _undefined ? options : {});

    if (typeof sm2.onerror === 'function') {
      sm2.onerror.apply(window, [{
        type: (options.type !== _undefined ? options.type : null)
      }]);
    }

    if (options.fatal !== _undefined && options.fatal) {
      sm2.disable();
    }

  };

  badSafariFix = function() {

    // special case: "bad" Safari (OS X 10.3 - 10.7) must fall back to flash for MP3/MP4
    if (!isBadSafari || !detectFlash()) {
      // doesn't apply
      return;
    }

    var aF = sm2.audioFormats, i, item;

    for (item in aF) {

      if (aF.hasOwnProperty(item)) {

        if (item === 'mp3' || item === 'mp4') {

          sm2._wD(sm + ': Using flash fallback for ' + item + ' format');
          sm2.html5[item] = false;

          // assign result to related formats, too
          if (aF[item] && aF[item].related) {
            for (i = aF[item].related.length - 1; i >= 0; i--) {
              sm2.html5[aF[item].related[i]] = false;
            }
          }

        }

      }

    }

  };

  /**
   * Pseudo-private flash/ExternalInterface methods
   * ----------------------------------------------
   */

  this._setSandboxType = function(sandboxType) {

    // <d>
    // Security sandbox according to Flash plugin
    var sb = sm2.sandbox;

    sb.type = sandboxType;
    sb.description = sb.types[(sb.types[sandboxType] !== _undefined ? sandboxType : 'unknown')];

    if (sb.type === 'localWithFile') {

      sb.noRemote = true;
      sb.noLocal = false;
      _wDS('secNote', 2);

    } else if (sb.type === 'localWithNetwork') {

      sb.noRemote = false;
      sb.noLocal = true;

    } else if (sb.type === 'localTrusted') {

      sb.noRemote = false;
      sb.noLocal = false;

    }
    // </d>

  };

  this._externalInterfaceOK = function(swfVersion) {

    // flash callback confirming flash loaded, EI working etc.
    // swfVersion: SWF build string

    if (sm2.swfLoaded) {
      return;
    }

    var e;

    debugTS('swf', true);
    debugTS('flashtojs', true);
    sm2.swfLoaded = true;
    tryInitOnFocus = false;

    if (isBadSafari) {
      badSafariFix();
    }

    // complain if JS + SWF build/version strings don't match, excluding +DEV builds
    // <d>
    if (!swfVersion || swfVersion.replace(/\+dev/i, '') !== sm2.versionNumber.replace(/\+dev/i, '')) {

      e = sm + ': Fatal: JavaScript file build "' + sm2.versionNumber + '" does not match Flash SWF build "' + swfVersion + '" at ' + sm2.url + '. Ensure both are up-to-date.';

      // escape flash -> JS stack so this error fires in window.
      setTimeout(function() {
        throw new Error(e);
      }, 0);

      // exit, init will fail with timeout
      return;

    }
    // </d>

    // IE needs a larger timeout
    setTimeout(init, isIE ? 100 : 1);

  };

  /**
   * Private initialization helpers
   * ------------------------------
   */

  createMovie = function(movieID, movieURL) {

    // ignore if already connected
    if (didAppend && appendSuccess) return false;

    function initMsg() {

      // <d>

      var options = [],
          title,
          msg = [],
          delimiter = ' + ';

      title = 'SoundManager ' + sm2.version + (!sm2.html5Only && sm2.useHTML5Audio ? (sm2.hasHTML5 ? ' + HTML5 audio' : ', no HTML5 audio support') : '');

      if (!sm2.html5Only) {

        if (sm2.preferFlash) {
          options.push('preferFlash');
        }

        if (sm2.useHighPerformance) {
          options.push('useHighPerformance');
        }

        if (sm2.flashPollingInterval) {
          options.push('flashPollingInterval (' + sm2.flashPollingInterval + 'ms)');
        }

        if (sm2.html5PollingInterval) {
          options.push('html5PollingInterval (' + sm2.html5PollingInterval + 'ms)');
        }

        if (sm2.wmode) {
          options.push('wmode (' + sm2.wmode + ')');
        }

        if (sm2.debugFlash) {
          options.push('debugFlash');
        }

        if (sm2.useFlashBlock) {
          options.push('flashBlock');
        }

      } else if (sm2.html5PollingInterval) {
          options.push('html5PollingInterval (' + sm2.html5PollingInterval + 'ms)');
        }

      if (options.length) {
        msg = msg.concat([options.join(delimiter)]);
      }

      sm2._wD(title + (msg.length ? delimiter + msg.join(', ') : ''), 1);

      showSupport();

      // </d>

    }

    if (sm2.html5Only) {

      // 100% HTML5 mode
      setVersionInfo();

      initMsg();
      sm2.oMC = id(sm2.movieID);
      init();

      // prevent multiple init attempts
      didAppend = true;

      appendSuccess = true;

      return false;

    }

    // flash path
    var remoteURL = (movieURL || sm2.url),
    localURL = (sm2.altURL || remoteURL),
    swfTitle = 'JS/Flash audio component (SoundManager 2)',
    oTarget = getDocument(),
    extraClass = getSWFCSS(),
    isRTL = null,
    html = doc.getElementsByTagName('html')[0],
    oEmbed, oMovie, tmp, movieHTML, oEl, s, x, sClass;

    isRTL = (html && html.dir && html.dir.match(/rtl/i));
    movieID = (movieID === _undefined ? sm2.id : movieID);

    function param(name, value) {
      return '<param name="' + name + '" value="' + value + '" />';
    }

    // safety check for legacy (change to Flash 9 URL)
    setVersionInfo();
    sm2.url = normalizeMovieURL(overHTTP ? remoteURL : localURL);
    movieURL = sm2.url;

    sm2.wmode = (!sm2.wmode && sm2.useHighPerformance ? 'transparent' : sm2.wmode);

    if (sm2.wmode !== null && (ua.match(/msie 8/i) || (!isIE && !sm2.useHighPerformance)) && navigator.platform.match(/win32|win64/i)) {
      /**
       * extra-special case: movie doesn't load until scrolled into view when using wmode = anything but 'window' here
       * does not apply when using high performance (position:fixed means on-screen), OR infinite flash load timeout
       * wmode breaks IE 8 on Vista + Win7 too in some cases, as of January 2011 (?)
       */
      messages.push(strings.spcWmode);
      sm2.wmode = null;
    }

    oEmbed = {
      name: movieID,
      id: movieID,
      src: movieURL,
      quality: 'high',
      allowScriptAccess: sm2.allowScriptAccess,
      bgcolor: sm2.bgColor,
      pluginspage: http + 'www.macromedia.com/go/getflashplayer',
      title: swfTitle,
      type: 'application/x-shockwave-flash',
      wmode: sm2.wmode,
      // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
      hasPriority: 'true'
    };

    if (sm2.debugFlash) {
      oEmbed.FlashVars = 'debug=1';
    }

    if (!sm2.wmode) {
      // don't write empty attribute
      delete oEmbed.wmode;
    }

    if (isIE) {

      // IE is "special".
      oMovie = doc.createElement('div');
      movieHTML = [
        '<object id="' + movieID + '" data="' + movieURL + '" type="' + oEmbed.type + '" title="' + oEmbed.title + '" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" codebase="http://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=6,0,40,0">',
        param('movie', movieURL),
        param('AllowScriptAccess', sm2.allowScriptAccess),
        param('quality', oEmbed.quality),
        (sm2.wmode ? param('wmode', sm2.wmode) : ''),
        param('bgcolor', sm2.bgColor),
        param('hasPriority', 'true'),
        (sm2.debugFlash ? param('FlashVars', oEmbed.FlashVars) : ''),
        '</object>'
      ].join('');

    } else {

      oMovie = doc.createElement('embed');
      for (tmp in oEmbed) {
        if (oEmbed.hasOwnProperty(tmp)) {
          oMovie.setAttribute(tmp, oEmbed[tmp]);
        }
      }

    }

    initDebug();
    extraClass = getSWFCSS();
    oTarget = getDocument();

    if (oTarget) {

      sm2.oMC = (id(sm2.movieID) || doc.createElement('div'));

      if (!sm2.oMC.id) {

        sm2.oMC.id = sm2.movieID;
        sm2.oMC.className = swfCSS.swfDefault + ' ' + extraClass;
        s = null;
        oEl = null;

        if (!sm2.useFlashBlock) {
          if (sm2.useHighPerformance) {
            // on-screen at all times
            s = {
              position: 'fixed',
              width: '8px',
              height: '8px',
              // >= 6px for flash to run fast, >= 8px to start up under Firefox/win32 in some cases. odd? yes.
              bottom: '0px',
              left: '0px',
              overflow: 'hidden'
            };
          } else {
            // hide off-screen, lower priority
            s = {
              position: 'absolute',
              width: '6px',
              height: '6px',
              top: '-9999px',
              left: '-9999px'
            };
            if (isRTL) {
              s.left = Math.abs(parseInt(s.left, 10)) + 'px';
            }
          }
        }

        if (isWebkit) {
          // soundcloud-reported render/crash fix, safari 5
          sm2.oMC.style.zIndex = 10000;
        }

        if (!sm2.debugFlash) {
          for (x in s) {
            if (s.hasOwnProperty(x)) {
              sm2.oMC.style[x] = s[x];
            }
          }
        }

        try {

          if (!isIE) {
            sm2.oMC.appendChild(oMovie);
          }

          oTarget.appendChild(sm2.oMC);

          if (isIE) {
            oEl = sm2.oMC.appendChild(doc.createElement('div'));
            oEl.className = swfCSS.swfBox;
            oEl.innerHTML = movieHTML;
          }

          appendSuccess = true;

        } catch(e) {

          throw new Error(str('domError') + ' \n' + e.toString());

        }

      } else {

        // SM2 container is already in the document (eg. flashblock use case)
        sClass = sm2.oMC.className;
        sm2.oMC.className = (sClass ? sClass + ' ' : swfCSS.swfDefault) + (extraClass ? ' ' + extraClass : '');
        sm2.oMC.appendChild(oMovie);

        if (isIE) {
          oEl = sm2.oMC.appendChild(doc.createElement('div'));
          oEl.className = swfCSS.swfBox;
          oEl.innerHTML = movieHTML;
        }

        appendSuccess = true;

      }

    }

    didAppend = true;

    initMsg();

    // sm2._wD(sm + ': Trying to load ' + movieURL + (!overHTTP && sm2.altURL ? ' (alternate URL)' : ''), 1);

    return true;

  };

  initMovie = function() {

    if (sm2.html5Only) {
      createMovie();
      return false;
    }

    // attempt to get, or create, movie (may already exist)
    if (flash) return false;

    if (!sm2.url) {

      /**
       * Something isn't right - we've reached init, but the soundManager url property has not been set.
       * User has not called setup({url: ...}), or has not set soundManager.url (legacy use case) directly before init time.
       * Notify and exit. If user calls setup() with a url: property, init will be restarted as in the deferred loading case.
       */

       _wDS('noURL');
       return false;

    }

    // inline markup case
    flash = sm2.getMovie(sm2.id);

    if (!flash) {

      if (!oRemoved) {

        // try to create
        createMovie(sm2.id, sm2.url);

      } else {

        // try to re-append removed movie after reboot()
        if (!isIE) {
          sm2.oMC.appendChild(oRemoved);
        } else {
          sm2.oMC.innerHTML = oRemovedHTML;
        }

        oRemoved = null;
        didAppend = true;

      }

      flash = sm2.getMovie(sm2.id);

    }

    if (typeof sm2.oninitmovie === 'function') {
      setTimeout(sm2.oninitmovie, 1);
    }

    // <d>
    flushMessages();
    // </d>

    return true;

  };

  delayWaitForEI = function() {

    setTimeout(waitForEI, 1000);

  };

  rebootIntoHTML5 = function() {

    // special case: try for a reboot with preferFlash: false, if 100% HTML5 mode is possible and useFlashBlock is not enabled.

    window.setTimeout(function() {

      complain(smc + 'useFlashBlock is false, 100% HTML5 mode is possible. Rebooting with preferFlash: false...');

      sm2.setup({
        preferFlash: false
      }).reboot();

      // if for some reason you want to detect this case, use an ontimeout() callback and look for html5Only and didFlashBlock == true.
      sm2.didFlashBlock = true;

      sm2.beginDelayedInit();

    }, 1);

  };

  waitForEI = function() {

    var p,
        loadIncomplete = false;

    if (!sm2.url) {
      // No SWF url to load (noURL case) - exit for now. Will be retried when url is set.
      return;
    }

    if (waitingForEI) {
      return;
    }

    waitingForEI = true;
    event.remove(window, 'load', delayWaitForEI);

    if (hasFlash && tryInitOnFocus && !isFocused) {
      // Safari won't load flash in background tabs, only when focused.
      _wDS('waitFocus');
      return;
    }

    if (!didInit) {
      p = sm2.getMoviePercent();
      if (p > 0 && p < 100) {
        loadIncomplete = true;
      }
    }

    setTimeout(function() {

      p = sm2.getMoviePercent();

      if (loadIncomplete) {
        // special case: if movie *partially* loaded, retry until it's 100% before assuming failure.
        waitingForEI = false;
        sm2._wD(str('waitSWF'));
        window.setTimeout(delayWaitForEI, 1);
        return;
      }

      // <d>
      if (!didInit) {

        sm2._wD(sm + ': No Flash response within expected time. Likely causes: ' + (p === 0 ? 'SWF load failed, ' : '') + 'Flash blocked or JS-Flash security error.' + (sm2.debugFlash ? ' ' + str('checkSWF') : ''), 2);

        if (!overHTTP && p) {

          _wDS('localFail', 2);

          if (!sm2.debugFlash) {
            _wDS('tryDebug', 2);
          }

        }

        if (p === 0) {

          // if 0 (not null), probably a 404.
          sm2._wD(str('swf404', sm2.url), 1);

        }

        debugTS('flashtojs', false, ': Timed out' + (overHTTP ? ' (Check flash security or flash blockers)' : ' (No plugin/missing SWF?)'));

      }
      // </d>

      // give up / time-out, depending

      if (!didInit && okToDisable) {

        if (p === null) {

          // SWF failed to report load progress. Possibly blocked.

          if (sm2.useFlashBlock || sm2.flashLoadTimeout === 0) {

            if (sm2.useFlashBlock) {

              flashBlockHandler();

            }

            _wDS('waitForever');

          } else if (!sm2.useFlashBlock && canIgnoreFlash) {

            // no custom flash block handling, but SWF has timed out. Will recover if user unblocks / allows SWF load.
            rebootIntoHTML5();

          } else {

            _wDS('waitForever');

            // fire any regular registered ontimeout() listeners.
            processOnEvents({
              type: 'ontimeout',
              ignoreInit: true,
              error: {
                type: 'INIT_FLASHBLOCK'
              }
            });

          }

        } else if (sm2.flashLoadTimeout === 0) {

          // SWF loaded? Shouldn't be a blocking issue, then.

          _wDS('waitForever');

        } else if (!sm2.useFlashBlock && canIgnoreFlash) {

          rebootIntoHTML5();

        } else {

          failSafely(true);

        }

      }

    }, sm2.flashLoadTimeout);

  };

  handleFocus = function() {

    function cleanup() {
      event.remove(window, 'focus', handleFocus);
    }

    if (isFocused || !tryInitOnFocus) {
      // already focused, or not special Safari background tab case
      cleanup();
      return true;
    }

    okToDisable = true;
    isFocused = true;
    _wDS('gotFocus');

    // allow init to restart
    waitingForEI = false;

    // kick off ExternalInterface timeout, now that the SWF has started
    delayWaitForEI();

    cleanup();
    return true;

  };

  flushMessages = function() {

    // <d>

    // SM2 pre-init debug messages
    if (messages.length) {
      sm2._wD('SoundManager 2: ' + messages.join(' '), 1);
      messages = [];
    }

    // </d>

  };

  showSupport = function() {

    // <d>

    flushMessages();

    var item, tests = [];

    if (sm2.useHTML5Audio && sm2.hasHTML5) {
      for (item in sm2.audioFormats) {
        if (sm2.audioFormats.hasOwnProperty(item)) {
          tests.push(item + ' = ' + sm2.html5[item] + (!sm2.html5[item] && needsFlash && sm2.flash[item] ? ' (using flash)' : (sm2.preferFlash && sm2.flash[item] && needsFlash ? ' (preferring flash)' : (!sm2.html5[item] ? ' (' + (sm2.audioFormats[item].required ? 'required, ' : '') + 'and no flash support)' : ''))));
        }
      }
      sm2._wD('SoundManager 2 HTML5 support: ' + tests.join(', '), 1);
    }

    // </d>

  };

  initComplete = function(bNoDisable) {

    if (didInit) return false;

    if (sm2.html5Only) {
      // all good.
      _wDS('sm2Loaded', 1);
      didInit = true;
      initUserOnload();
      debugTS('onload', true);
      return true;
    }

    var wasTimeout = (sm2.useFlashBlock && sm2.flashLoadTimeout && !sm2.getMoviePercent()),
        result = true,
        error;

    if (!wasTimeout) {
      didInit = true;
    }

    error = {
      type: (!hasFlash && needsFlash ? 'NO_FLASH' : 'INIT_TIMEOUT')
    };

    sm2._wD('SoundManager 2 ' + (disabled ? 'failed to load' : 'loaded') + ' (' + (disabled ? 'Flash security/load error' : 'OK') + ') ' + String.fromCharCode(disabled ? 10006 : 10003), disabled ? 2 : 1);

    if (disabled || bNoDisable) {

      if (sm2.useFlashBlock && sm2.oMC) {
        sm2.oMC.className = getSWFCSS() + ' ' + (sm2.getMoviePercent() === null ? swfCSS.swfTimedout : swfCSS.swfError);
      }

      processOnEvents({
        type: 'ontimeout',
        error: error,
        ignoreInit: true
      });

      debugTS('onload', false);
      catchError(error);

      result = false;

    } else {

      debugTS('onload', true);

    }

    if (!disabled) {

      if (sm2.waitForWindowLoad && !windowLoaded) {

        _wDS('waitOnload');
        event.add(window, 'load', initUserOnload);

      } else {

        // <d>
        if (sm2.waitForWindowLoad && windowLoaded) {
          _wDS('docLoaded');
        }
        // </d>

        initUserOnload();

      }

    }

    return result;

  };

  /**
   * apply top-level setupOptions object as local properties, eg., this.setupOptions.flashVersion -> this.flashVersion (soundManager.flashVersion)
   * this maintains backward compatibility, and allows properties to be defined separately for use by soundManager.setup().
   */

  setProperties = function() {

    var i,
        o = sm2.setupOptions;

    for (i in o) {

      if (o.hasOwnProperty(i)) {

        // assign local property if not already defined

        if (sm2[i] === _undefined) {

          sm2[i] = o[i];

        } else if (sm2[i] !== o[i]) {

          // legacy support: write manually-assigned property (eg., soundManager.url) back to setupOptions to keep things in sync
          sm2.setupOptions[i] = sm2[i];

        }

      }

    }

  };


  init = function() {

    // called after onload()

    if (didInit) {
      _wDS('didInit');
      return false;
    }

    function cleanup() {
      event.remove(window, 'load', sm2.beginDelayedInit);
    }

    if (sm2.html5Only) {

      if (!didInit) {
        // we don't need no steenking flash!
        cleanup();
        sm2.enabled = true;
        initComplete();
      }

      return true;

    }

    // flash path
    initMovie();

    try {

      // attempt to talk to Flash
      flash._externalInterfaceTest(false);

      /**
       * Apply user-specified polling interval, OR, if "high performance" set, faster vs. default polling
       * (determines frequency of whileloading/whileplaying callbacks, effectively driving UI framerates)
       */
      setPolling(true, (sm2.flashPollingInterval || (sm2.useHighPerformance ? 10 : 50)));

      if (!sm2.debugMode) {
        // stop the SWF from making debug output calls to JS
        flash._disableDebug();
      }

      sm2.enabled = true;
      debugTS('jstoflash', true);

      if (!sm2.html5Only) {
        // prevent browser from showing cached page state (or rather, restoring "suspended" page state) via back button, because flash may be dead
        // http://www.webkit.org/blog/516/webkit-page-cache-ii-the-unload-event/
        event.add(window, 'unload', doNothing);
      }

    } catch(e) {

      sm2._wD('js/flash exception: ' + e.toString());

      debugTS('jstoflash', false);

      catchError({
        type: 'JS_TO_FLASH_EXCEPTION',
        fatal: true
      });

      // don't disable, for reboot()
      failSafely(true);

      initComplete();

      return false;

    }

    initComplete();

    // disconnect events
    cleanup();

    return true;

  };

  domContentLoaded = function() {

    if (didDCLoaded) return false;

    didDCLoaded = true;

    // assign top-level soundManager properties eg. soundManager.url
    setProperties();

    initDebug();

    if (!hasFlash && sm2.hasHTML5) {

      sm2._wD('SoundManager 2: No Flash detected' + (!sm2.useHTML5Audio ? ', enabling HTML5.' : '. Trying HTML5-only mode.'), 1);

      sm2.setup({
        useHTML5Audio: true,
        // make sure we aren't preferring flash, either
        // TODO: preferFlash should not matter if flash is not installed. Currently, stuff breaks without the below tweak.
        preferFlash: false
      });

    }

    testHTML5();

    if (!hasFlash && needsFlash) {

      messages.push(strings.needFlash);

      // TODO: Fatal here vs. timeout approach, etc.
      // hack: fail sooner.
      sm2.setup({
        flashLoadTimeout: 1
      });

    }

    if (doc.removeEventListener) {
      doc.removeEventListener('DOMContentLoaded', domContentLoaded, false);
    }

    initMovie();

    return true;

  };

  domContentLoadedIE = function() {

    if (doc.readyState === 'complete') {
      domContentLoaded();
      doc.detachEvent('onreadystatechange', domContentLoadedIE);
    }

    return true;

  };

  winOnLoad = function() {

    // catch edge case of initComplete() firing after window.load()
    windowLoaded = true;

    // catch case where DOMContentLoaded has been sent, but we're still in doc.readyState = 'interactive'
    domContentLoaded();

    event.remove(window, 'load', winOnLoad);

  };

  // sniff up-front
  detectFlash();

  // focus and window load, init (primarily flash-driven)
  event.add(window, 'focus', handleFocus);
  event.add(window, 'load', delayWaitForEI);
  event.add(window, 'load', winOnLoad);

  if (doc.addEventListener) {

    doc.addEventListener('DOMContentLoaded', domContentLoaded, false);

  } else if (doc.attachEvent) {

    doc.attachEvent('onreadystatechange', domContentLoadedIE);

  } else {

    // no add/attachevent support - safe to assume no JS -> Flash either
    debugTS('onload', false);
    catchError({
      type: 'NO_DOM2_EVENTS',
      fatal: true
    });

  }

} // SoundManager()

// SM2_DEFER details: http://www.schillmania.com/projects/soundmanager2/doc/getstarted/#lazy-loading

if (window.SM2_DEFER === _undefined || !SM2_DEFER) {
  soundManager = new SoundManager();
}

/**
 * SoundManager public interfaces
 * ------------------------------
 */

if (typeof module === 'object' && module && typeof module.exports === 'object') {

  /**
   * commonJS module
   */

  module.exports.SoundManager = SoundManager;
  module.exports.soundManager = soundManager;

} else if (typeof define === 'function' && define.amd) {

  /**
   * AMD - requireJS
   * basic usage:
   * require(["/path/to/soundmanager2.js"], function(SoundManager) {
   *   SoundManager.getInstance().setup({
   *     url: '/swf/',
   *     onready: function() { ... }
   *   })
   * });
   *
   * SM2_DEFER usage:
   * window.SM2_DEFER = true;
   * require(["/path/to/soundmanager2.js"], function(SoundManager) {
   *   SoundManager.getInstance(function() {
   *     var soundManager = new SoundManager.constructor();
   *     soundManager.setup({
   *       url: '/swf/',
   *       ...
   *     });
   *     ...
   *     soundManager.beginDelayedInit();
   *     return soundManager;
   *   })
   * });
   */

  define(function() {
    /**
     * Retrieve the global instance of SoundManager.
     * If a global instance does not exist it can be created using a callback.
     *
     * @param {Function} smBuilder Optional: Callback used to create a new SoundManager instance
     * @return {SoundManager} The global SoundManager instance
     */
    function getInstance(smBuilder) {
      if (!window.soundManager && smBuilder instanceof Function) {
        var instance = smBuilder(SoundManager);
        if (instance instanceof SoundManager) {
          window.soundManager = instance;
        }
      }
      return window.soundManager;
    }
    return {
      constructor: SoundManager,
      getInstance: getInstance
    };
  });

}

// standard browser case

// constructor
window.SoundManager = SoundManager;

/**
 * note: SM2 requires a window global due to Flash, which makes calls to window.soundManager.
 * Flash may not always be needed, but this is not known until async init and SM2 may even "reboot" into Flash mode.
 */

// public API, flash callbacks etc.
window.soundManager = soundManager;

}(window));
///////////////////////////////////////////////////////////
//// Sound Manager Bar UI
///////////////////////////////////////////////////////////
(function(window) {

  /**
   * SoundManager 2: "Bar UI" player
   * Copyright (c) 2014, Scott Schiller. All rights reserved.
   * http://www.schillmania.com/projects/soundmanager2/
   * Code provided under BSD license.
   * http://schillmania.com/projects/soundmanager2/license.txt
   */

  /* global console, document, navigator, soundManager, window */

  'use strict';

  var Player,
      players = [],
      // CSS selector that will get us the top-level DOM node for the player UI.
      playerSelector = '.sm2-bar-ui',
      playerOptions,
      utils;

  /**
   * The following are player object event callback examples.
   * Override globally by setting window.sm2BarPlayers.on = {}, or individually by window.sm2BarPlayers[0].on = {} etc.
   * soundObject is provided for whileplaying() etc., but playback control should be done via the player object.
   */
  players.on = {
    /*
    play: function(player, soundObject) {
      console.log('playing', player);
    },
    whileplaying: function(player, soundObject) {
      console.log('whileplaying', player, soundObject);
    },
    finish: function(player, soundObject) {
      // each sound
      console.log('finish', player);
    },
    pause: function(player, soundObject) {
      console.log('pause', player);
    },
    error: function(player, soundObject) {
      console.log('error', player);
    },
    end: function(player, soundObject) {
      // end of playlist
      console.log('end', player);
    }
    */
  };

  playerOptions = {
    // useful when multiple players are in use, or other SM2 sounds are active etc.
    stopOtherSounds: true,
    // CSS class to let the browser load the URL directly e.g., <a href="foo.mp3" class="sm2-exclude">download foo.mp3</a>
    excludeClass: 'sm2-exclude'
  };

  soundManager.setup({
    // trade-off: higher UI responsiveness (play/progress bar), but may use more CPU.
    html5PollingInterval: 50,
    flashVersion: 9
  });

  soundManager.onready(function() {

    var nodes, i, j;

    nodes = utils.dom.getAll(playerSelector);

    if (nodes && nodes.length) {
      for (i = 0, j = nodes.length; i < j; i++) {
        players.push(new Player(nodes[i]));
      }
    }

  });

  /**
   * player bits
   */

  Player = function(playerNode) {

    var css, dom, extras, playlistController, soundObject, actions, actionData, defaultItem, defaultVolume, firstOpen, exports;

    css = {
      disabled: 'disabled',
      selected: 'selected',
      active: 'active',
      legacy: 'legacy',
      noVolume: 'no-volume',
      playlistOpen: 'playlist-open'
    };

    dom = {
      o: null,
      playlist: null,
      playlistTarget: null,
      playlistContainer: null,
      time: null,
      player: null,
      progress: null,
      progressTrack: null,
      progressBar: null,
      duration: null,
      volume: null
    };

    // prepended to tracks when a sound fails to load/play
    extras = {
      loadFailedCharacter: '<span title="Failed to load/play." class="load-error">✖</span>'
    };

    function stopOtherSounds() {

      if (playerOptions.stopOtherSounds) {
        soundManager.stopAll();
      }

    }

    function callback(method, oSound) {
      if (method) {
        // fire callback, passing current player and sound objects
        if (exports.on && exports.on[method]) {
          exports.on[method](exports, oSound);
        } else if (players.on[method]) {
          players.on[method](exports, oSound);
        }
      }
    }

    function getTime(msec, useString) {

      // convert milliseconds to hh:mm:ss, return as object literal or string

      var nSec = Math.floor(msec / 1000),
          hh = Math.floor(nSec / 3600),
          min = Math.floor(nSec / 60) - Math.floor(hh * 60),
          sec = Math.floor(nSec - (hh * 3600) - (min * 60));

      // if (min === 0 && sec === 0) return null; // return 0:00 as null

      return (useString ? ((hh ? hh + ':' : '') + (hh && min < 10 ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec)) : { min: min, sec: sec });

    }

    function setTitle(item) {

      // given a link, update the "now playing" UI.

      // if this is an <li> with an inner link, grab and use the text from that.
      var links = item.getElementsByTagName('a');

      if (links.length) {
        item = links[0];
      }

      // remove any failed character sequence, also
      dom.playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li>' + item.innerHTML.replace(extras.loadFailedCharacter, '') + '</li></ul>';

      if (dom.playlistTarget.getElementsByTagName('li')[0].scrollWidth > dom.playlistTarget.offsetWidth) {
        // this item can use <marquee>, in fact.
        dom.playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li><marquee>' + item.innerHTML + '</marquee></li></ul>';
      }

    }

    function makeSound(url) {

      var sound = soundManager.createSound({

        url: url,

        volume: defaultVolume,

        whileplaying: function() {

          var progressMaxLeft = 100,
              left,
              width;

          left = Math.min(progressMaxLeft, Math.max(0, (progressMaxLeft * (this.position / this.durationEstimate)))) + '%';
          width = Math.min(100, Math.max(0, (100 * (this.position / this.durationEstimate)))) + '%';

          if (this.duration) {

            dom.progress.style.left = left;
            dom.progressBar.style.width = width;

            // TODO: only write changes
            dom.time.innerHTML = getTime(this.position, true);

          }

          callback('whileplaying', this);

        },

        onbufferchange: function(isBuffering) {

          if (isBuffering) {
            utils.css.add(dom.o, 'buffering');
          } else {
            utils.css.remove(dom.o, 'buffering');
          }

        },

        onplay: function() {
          utils.css.swap(dom.o, 'paused', 'playing');
          callback('play', this);
        },

        onpause: function() {
          utils.css.swap(dom.o, 'playing', 'paused');
          callback('pause', this);
        },

        onresume: function() {
          utils.css.swap(dom.o, 'paused', 'playing');
        },

        whileloading: function() {

          if (!this.isHTML5) {
            dom.duration.innerHTML = getTime(this.durationEstimate, true);
          }

        },

        onload: function(ok) {

          if (ok) {

            dom.duration.innerHTML = getTime(this.duration, true);

          } else if (this._iO && this._iO.onerror) {

            this._iO.onerror();

          }

        },

        onerror: function() {

          // sound failed to load.
          var item, element, html;

          item = playlistController.getItem();

          if (item) {

            // note error, delay 2 seconds and advance?
            // playlistTarget.innerHTML = '<ul class="sm2-playlist-bd"><li>' + item.innerHTML + '</li></ul>';

            if (extras.loadFailedCharacter) {
              dom.playlistTarget.innerHTML = dom.playlistTarget.innerHTML.replace('<li>', '<li>' + extras.loadFailedCharacter + ' ');
              if (playlistController.data.playlist && playlistController.data.playlist[playlistController.data.selectedIndex]) {
                element = playlistController.data.playlist[playlistController.data.selectedIndex].getElementsByTagName('a')[0];
                html = element.innerHTML;
                if (html.indexOf(extras.loadFailedCharacter) === -1) {
                  element.innerHTML = extras.loadFailedCharacter + ' ' + html;
                }
              }
            }

          }

          callback('error', this);

          // load next, possibly with delay.

          if (navigator.userAgent.match(/mobile/i)) {
            // mobile will likely block the next play() call if there is a setTimeout() - so don't use one here.
            actions.next();
          } else {
            if (playlistController.data.timer) {
              window.clearTimeout(playlistController.data.timer);
            }
            playlistController.data.timer = window.setTimeout(actions.next, 2000);
          }

        },

        onstop: function() {

          utils.css.remove(dom.o, 'playing');

        },

        onfinish: function() {

          var lastIndex, item;

          utils.css.remove(dom.o, 'playing');

          dom.progress.style.left = '0%';

          lastIndex = playlistController.data.selectedIndex;

          callback('finish', this);

          // next track?
          item = playlistController.getNext();

          // don't play the same item over and over again, if at end of playlist (excluding single item case.)
          if (item && (playlistController.data.selectedIndex !== lastIndex || (playlistController.data.playlist.length === 1 && playlistController.data.loopMode))) {

            playlistController.select(item);

            setTitle(item);

            stopOtherSounds();

            // play next
            this.play({
              url: playlistController.getURL()
            });

          } else {

            // end of playlist case

            // explicitly stop?
            // this.stop();

            callback('end', this);

          }

        }

      });

      return sound;

    }

    function playLink(link) {

      // if a link is OK, play it.

      if (soundManager.canPlayURL(link.href)) {

        // if there's a timer due to failure to play one track, cancel it.
        // catches case when user may use previous/next after an error.
        if (playlistController.data.timer) {
          window.clearTimeout(playlistController.data.timer);
          playlistController.data.timer = null;
        }

        if (!soundObject) {
          soundObject = makeSound(link.href);
        }

        // required to reset pause/play state on iOS so whileplaying() works? odd.
        soundObject.stop();

        playlistController.select(link.parentNode);

        setTitle(link.parentNode);

        // reset the UI
        // TODO: function that also resets/hides timing info.
        dom.progress.style.left = '0px';
        dom.progressBar.style.width = '0px';

        stopOtherSounds();

        soundObject.play({
          url: link.href,
          position: 0
        });

      }

    }

    function PlaylistController() {

      var data;

      data = {

        // list of nodes?
        playlist: [],

        // NOTE: not implemented yet.
        // shuffledIndex: [],
        // shuffleMode: false,

        // selection
        selectedIndex: 0,

        loopMode: false,

        timer: null

      };

      function getPlaylist() {

        return data.playlist;

      }

      function getItem(offset) {

        var list,
            item;

        // given the current selection (or an offset), return the current item.

        // if currently null, may be end of list case. bail.
        if (data.selectedIndex === null) {
          return offset;
        }

        list = getPlaylist();

        // use offset if provided, otherwise take default selected.
        offset = (offset !== undefined ? offset : data.selectedIndex);

        // safety check - limit to between 0 and list length
        offset = Math.max(0, Math.min(offset, list.length));

        item = list[offset];

        return item;

      }

      function findOffsetFromItem(item) {

        // given an <li> item, find it in the playlist array and return the index.
        var list,
            i,
            j,
            offset;

        offset = -1;

        list = getPlaylist();

        if (list) {

          for (i = 0, j = list.length; i < j; i++) {
            if (list[i] === item) {
              offset = i;
              break;
            }
          }

        }

        return offset;

      }

      function getNext() {

        // don't increment if null.
        if (data.selectedIndex !== null) {
          data.selectedIndex++;
        }

        if (data.playlist.length > 1) {

          if (data.selectedIndex >= data.playlist.length) {

            if (data.loopMode) {

              // loop to beginning
              data.selectedIndex = 0;

            } else {

              // no change
              data.selectedIndex--;

              // end playback
              // data.selectedIndex = null;

            }

          }

        } else {

          data.selectedIndex = null;

        }

        return getItem();

      }

      function getPrevious() {

        data.selectedIndex--;

        if (data.selectedIndex < 0) {
          // wrapping around beginning of list? loop or exit.
          if (data.loopMode) {
            data.selectedIndex = data.playlist.length - 1;
          } else {
            // undo
            data.selectedIndex++;
          }
        }

        return getItem();

      }

      function resetLastSelected() {

        // remove UI highlight(s) on selected items.
        var items,
            i, j;

        items = utils.dom.getAll(dom.playlist, '.' + css.selected);

        for (i = 0, j = items.length; i < j; i++) {
          utils.css.remove(items[i], css.selected);
        }

      }

      function select(item) {

        var offset,
            itemTop,
            itemBottom,
            containerHeight,
            scrollTop,
            itemPadding,
            liElement;

        // remove last selected, if any
        resetLastSelected();

        if (item) {

          liElement = utils.dom.ancestor('li', item);

          utils.css.add(liElement, css.selected);

          itemTop = item.offsetTop;
          itemBottom = itemTop + item.offsetHeight;
          containerHeight = dom.playlistContainer.offsetHeight;
          scrollTop = dom.playlist.scrollTop;
          itemPadding = 8;

          if (itemBottom > containerHeight + scrollTop) {
            // bottom-align
            dom.playlist.scrollTop = (itemBottom - containerHeight) + itemPadding;
          } else if (itemTop < scrollTop) {
            // top-align
            dom.playlist.scrollTop = item.offsetTop - itemPadding;
          }

        }

        // update selected offset, too.
        offset = findOffsetFromItem(liElement);

        data.selectedIndex = offset;

      }

      function playItemByOffset(offset) {

        var item;

        offset = (offset || 0);

        item = getItem(offset);

        if (item) {
          playLink(item.getElementsByTagName('a')[0]);
        }

      }

      function getURL() {

        // return URL of currently-selected item
        var item, url;

        item = getItem();

        if (item) {
          url = item.getElementsByTagName('a')[0].href;
        }

        return url;

      }

      function refreshDOM() {

        // get / update playlist from DOM

        if (!dom.playlist) {
          if (window.console && console.warn) {
            console.warn('refreshDOM(): playlist node not found?');
          }
          return;
        }

        data.playlist = dom.playlist.getElementsByTagName('li');

      }

      function initDOM() {

        dom.playlistTarget = utils.dom.get(dom.o, '.sm2-playlist-target');
        dom.playlistContainer = utils.dom.get(dom.o, '.sm2-playlist-drawer');
        dom.playlist = utils.dom.get(dom.o, '.sm2-playlist-bd');

      }

      function initPlaylistController() {

        // inherit the default SM2 volume
        defaultVolume = soundManager.defaultOptions.volume;

        initDOM();
        refreshDOM();

        // animate playlist open, if HTML classname indicates so.
        if (utils.css.has(dom.o, css.playlistOpen)) {
          // hackish: run this after API has returned
          window.setTimeout(function() {
            actions.menu(true);
          }, 1);
        }

      }

      initPlaylistController();

      return {
        data: data,
        refresh: refreshDOM,
        getNext: getNext,
        getPrevious: getPrevious,
        getItem: getItem,
        getURL: getURL,
        playItemByOffset: playItemByOffset,
        select: select
      };

    }

    function isRightClick(e) {

      // only pay attention to left clicks. old IE differs where there's no e.which, but e.button is 1 on left click.
      if (e && ((e.which && e.which === 2) || (e.which === undefined && e.button !== 1))) {
        // http://www.quirksmode.org/js/events_properties.html#button
        return true;
      }

      return false;

    }

    function getActionData(target) {

      // DOM measurements for volume slider

      if (!target) {
        return;
      }

      actionData.volume.x = utils.position.getOffX(target);
      actionData.volume.y = utils.position.getOffY(target);

      actionData.volume.width = target.offsetWidth;
      actionData.volume.height = target.offsetHeight;

      // potentially dangerous: this should, but may not be a percentage-based value.
      actionData.volume.backgroundSize = parseInt(utils.style.get(target, 'background-size'), 10);

      // IE gives pixels even if background-size specified as % in CSS. Boourns.
      if (window.navigator.userAgent.match(/msie|trident/i)) {
        actionData.volume.backgroundSize = (actionData.volume.backgroundSize / actionData.volume.width) * 100;
      }

    }

    function handleMouseDown(e) {

      var links,
          target;

      target = e.target || e.srcElement;

      if (isRightClick(e)) {
        return;
      }

      // normalize to <a>, if applicable.
      if (target.nodeName.toLowerCase() !== 'a') {

        links = target.getElementsByTagName('a');
        if (links && links.length) {
          target = target.getElementsByTagName('a')[0];
        }

      }

      if (utils.css.has(target, 'sm2-volume-control')) {

        // drag case for volume

        getActionData(target);

        utils.events.add(document, 'mousemove', actions.adjustVolume);
        utils.events.add(document, 'touchmove', actions.adjustVolume);
        utils.events.add(document, 'mouseup', actions.releaseVolume);
        utils.events.add(document, 'touchend', actions.releaseVolume);

        // and apply right away
        actions.adjustVolume(e);

      }

    }

    function handleMouse(e) {

      var target, barX, barWidth, x, clientX, newPosition, sound;

      target = dom.progressTrack;

      barX = utils.position.getOffX(target);
      barWidth = target.offsetWidth;
      clientX = utils.events.getClientX(e);

      x = (clientX - barX);

      newPosition = (x / barWidth);

      sound = soundObject;

      if (sound && sound.duration) {

        sound.setPosition(sound.duration * newPosition);

        // a little hackish: ensure UI updates immediately with current position, even if audio is buffering and hasn't moved there yet.
        if (sound._iO && sound._iO.whileplaying) {
          sound._iO.whileplaying.apply(sound);
        }

      }

      if (e.preventDefault) {
        e.preventDefault();
      }

      return false;

    }

    function releaseMouse(e) {

      utils.events.remove(document, 'mousemove', handleMouse);
      utils.events.remove(document, 'touchmove', handleMouse);

      utils.css.remove(dom.o, 'grabbing');

      utils.events.remove(document, 'mouseup', releaseMouse);
      utils.events.remove(document, 'touchend', releaseMouse);

      utils.events.preventDefault(e);

      return false;

    }

    function handleProgressMouseDown(e) {

      if (isRightClick(e)) {
        return;
      }

      utils.css.add(dom.o, 'grabbing');

      utils.events.add(document, 'mousemove', handleMouse);
      utils.events.add(document, 'touchmove', handleMouse);
      utils.events.add(document, 'mouseup', releaseMouse);
      utils.events.add(document, 'touchend', releaseMouse);

      handleMouse(e);

    }

    function handleClick(e) {

      var evt,
          target,
          offset,
          targetNodeName,
          methodName,
          href,
          handled;

      evt = (e || window.event);

      target = evt.target || evt.srcElement;

      if (target && target.nodeName) {

        targetNodeName = target.nodeName.toLowerCase();

        if (targetNodeName !== 'a') {

          // old IE (IE 8) might return nested elements inside the <a>, eg., <b> etc. Try to find the parent <a>.

          if (target.parentNode) {

            do {
              target = target.parentNode;
              targetNodeName = target.nodeName.toLowerCase();
            } while (targetNodeName !== 'a' && target.parentNode);

            if (!target) {
              // something went wrong. bail.
              return false;
            }

          }

        }

        if (targetNodeName === 'a') {

          // yep, it's a link.

          href = target.href;

          if (soundManager.canPlayURL(href)) {

            // not excluded
            if (!utils.css.has(target, playerOptions.excludeClass)) {

              // find this in the playlist

              playLink(target);

              handled = true;

            }

          } else {

            // is this one of the action buttons, eg., play/pause, volume, etc.?
            offset = target.href.lastIndexOf('#');

            if (offset !== -1) {

              methodName = target.href.substr(offset + 1);

              if (methodName && actions[methodName]) {
                handled = true;
                actions[methodName](e);
              }

            }

          }

          // fall-through case

          if (handled) {
            // prevent browser fall-through
            return utils.events.preventDefault(evt);
          }

        }

      }

      return true;

    }

    function init() {

      // init DOM?

      if (!playerNode && window.console && console.warn) {
        console.warn('init(): No playerNode element?');
      }

      dom.o = playerNode;

      // are we dealing with a crap browser? apply legacy CSS if so.
      if (window.navigator.userAgent.match(/msie [678]/i)) {
        utils.css.add(dom.o, css.legacy);
      }

      if (window.navigator.userAgent.match(/mobile/i)) {
        // majority of mobile devices don't let HTML5 audio set volume.
        utils.css.add(dom.o, css.noVolume);
      }

      dom.progress = utils.dom.get(dom.o, '.sm2-progress-ball');

      dom.progressTrack = utils.dom.get(dom.o, '.sm2-progress-track');

      dom.progressBar = utils.dom.get(dom.o, '.sm2-progress-bar');

      dom.volume = utils.dom.get(dom.o, 'a.sm2-volume-control');

      // measure volume control dimensions
      if (dom.volume) {
        getActionData(dom.volume);
      }

      dom.duration = utils.dom.get(dom.o, '.sm2-inline-duration');

      dom.time = utils.dom.get(dom.o, '.sm2-inline-time');

      playlistController = new PlaylistController();

      defaultItem = playlistController.getItem(0);

      playlistController.select(defaultItem);

      if (defaultItem) {
        setTitle(defaultItem);
      }

      utils.events.add(dom.o, 'mousedown', handleMouseDown);
      utils.events.add(dom.o, 'touchstart', handleMouseDown);
      utils.events.add(dom.o, 'click', handleClick);
      utils.events.add(dom.progressTrack, 'mousedown', handleProgressMouseDown);
      utils.events.add(dom.progressTrack, 'touchstart', handleProgressMouseDown);

    }

    // ---

    actionData = {

      volume: {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        backgroundSize: 0
      }

    };

    actions = {

      play: function(offsetOrEvent) {

        /**
         * This is an overloaded function that takes mouse/touch events or offset-based item indices.
         * Remember, "auto-play" will not work on mobile devices unless this function is called immediately from a touch or click event.
         * If you have the link but not the offset, you can also pass a fake event object with a target of an <a> inside the playlist - e.g. { target: someMP3Link }
         */

        var target,
            href,
            e;

        if (offsetOrEvent !== undefined && !isNaN(offsetOrEvent)) {
          // smells like a number.
          playlistController.playItemByOffset(offsetOrEvent);
          return;
        }

        // DRY things a bit
        e = offsetOrEvent;

        if (e && e.target) {

          target = e.target || e.srcElement;

          href = target.href;

        }

        // haaaack - if null due to no event, OR '#' due to play/pause link, get first link from playlist
        if (!href || href.indexOf('#') !== -1) {
          href = dom.playlist.getElementsByTagName('a')[0].href;
        }

        if (!soundObject) {
          soundObject = makeSound(href);
        }

        // edge case: if the current sound is not playing, stop all others.
        if (!soundObject.playState) {
          stopOtherSounds();
        }

        // TODO: if user pauses + unpauses a sound that had an error, try to play next?
        soundObject.togglePause();

        // special case: clear "play next" timeout, if one exists.
        // edge case: user pauses after a song failed to load.
        if (soundObject.paused && playlistController.data.timer) {
          window.clearTimeout(playlistController.data.timer);
          playlistController.data.timer = null;
        }

      },

      pause: function() {

        if (soundObject && soundObject.readyState) {
          soundObject.pause();
        }

      },

      resume: function() {

        if (soundObject && soundObject.readyState) {
          soundObject.resume();
        }

      },

      stop: function() {

        // just an alias for pause, really.
        // don't actually stop because that will mess up some UI state, i.e., dragging the slider.
        return actions.pause();

      },

      next: function(/* e */) {

        var item, lastIndex;

        // special case: clear "play next" timeout, if one exists.
        if (playlistController.data.timer) {
          window.clearTimeout(playlistController.data.timer);
          playlistController.data.timer = null;
        }

        lastIndex = playlistController.data.selectedIndex;

        item = playlistController.getNext(true);

        // don't play the same item again
        if (item && playlistController.data.selectedIndex !== lastIndex) {
          playLink(item.getElementsByTagName('a')[0]);
        }

      },

      prev: function(/* e */) {

        var item, lastIndex;

        lastIndex = playlistController.data.selectedIndex;

        item = playlistController.getPrevious();

        // don't play the same item again
        if (item && playlistController.data.selectedIndex !== lastIndex) {
          playLink(item.getElementsByTagName('a')[0]);
        }

      },

      shuffle: function(e) {

        // NOTE: not implemented yet.

        var target = (e ? e.target || e.srcElement : utils.dom.get(dom.o, '.shuffle'));

        if (target && !utils.css.has(target, css.disabled)) {
          utils.css.toggle(target.parentNode, css.active);
          playlistController.data.shuffleMode = !playlistController.data.shuffleMode;
        }

      },

      repeat: function(e) {

        var target = (e ? e.target || e.srcElement : utils.dom.get(dom.o, '.repeat'));

        if (target && !utils.css.has(target, css.disabled)) {
          utils.css.toggle(target.parentNode, css.active);
          playlistController.data.loopMode = !playlistController.data.loopMode;
        }

      },

      menu: function(ignoreToggle) {

        var isOpen;

        isOpen = utils.css.has(dom.o, css.playlistOpen);

        // hackish: reset scrollTop in default first open case. odd, but some browsers have a non-zero scroll offset the first time the playlist opens.
        if (playlistController && !playlistController.data.selectedIndex && !firstOpen) {
          dom.playlist.scrollTop = 0;
          firstOpen = true;
        }

        // sniff out booleans from mouse events, as this is referenced directly by event handlers.
        if (typeof ignoreToggle !== 'boolean' || !ignoreToggle) {

          if (!isOpen) {
            // explicitly set height:0, so the first closed -> open animation runs properly
            dom.playlistContainer.style.height = '0px';
          }

          isOpen = utils.css.toggle(dom.o, css.playlistOpen);

        }

        // playlist
        dom.playlistContainer.style.height = (isOpen ? dom.playlistContainer.scrollHeight : 0) + 'px';

      },

      adjustVolume: function(e) {

        /**
         * NOTE: this is the mousemove() event handler version.
         * Use setVolume(50), etc., to assign volume directly.
         */

        var backgroundMargin,
            pixelMargin,
            target,
            value,
            volume;

        value = 0;

        target = dom.volume;

        // safety net
        if (e === undefined) {
          return false;
        }

        // normalize between mouse and touch events
        var clientX = utils.events.getClientX(e);

        if (!e || clientX === undefined) {
          // called directly or with a non-mouseEvent object, etc.
          // proxy to the proper method.
          if (arguments.length && window.console && window.console.warn) {
            console.warn('Bar UI: call setVolume(' + e + ') instead of adjustVolume(' + e + ').');
          }
          return actions.setVolume.apply(this, arguments);
        }

        // based on getStyle() result
        // figure out spacing around background image based on background size, eg. 60% background size.
        // 60% wide means 20% margin on each side.
        backgroundMargin = (100 - actionData.volume.backgroundSize) / 2;

        // relative position of mouse over element
        value = Math.max(0, Math.min(1, (clientX - actionData.volume.x) / actionData.volume.width));

        target.style.clip = 'rect(0px, ' + (actionData.volume.width * value) + 'px, ' + actionData.volume.height + 'px, ' + (actionData.volume.width * (backgroundMargin / 100)) + 'px)';

        // determine logical volume, including background margin
        pixelMargin = ((backgroundMargin / 100) * actionData.volume.width);

        volume = Math.max(0, Math.min(1, ((clientX - actionData.volume.x) - pixelMargin) / (actionData.volume.width - (pixelMargin * 2)))) * 100;

        // set volume
        if (soundObject) {
          soundObject.setVolume(volume);
        }

        defaultVolume = volume;

        return utils.events.preventDefault(e);

      },

      releaseVolume: function(/* e */) {

        utils.events.remove(document, 'mousemove', actions.adjustVolume);
        utils.events.remove(document, 'touchmove', actions.adjustVolume);
        utils.events.remove(document, 'mouseup', actions.releaseVolume);
        utils.events.remove(document, 'touchend', actions.releaseVolume);

      },

      setVolume: function(volume) {

        // set volume (0-100) and update volume slider UI.

        var backgroundSize,
            backgroundMargin,
            backgroundOffset,
            target,
            from,
            to;

        if (volume === undefined || isNaN(volume)) {
          return;
        }

        if (dom.volume) {

          target = dom.volume;

          // based on getStyle() result
          backgroundSize = actionData.volume.backgroundSize;

          // figure out spacing around background image based on background size, eg. 60% background size.
          // 60% wide means 20% margin on each side.
          backgroundMargin = (100 - backgroundSize) / 2;

          // margin as pixel value relative to width
          backgroundOffset = actionData.volume.width * (backgroundMargin / 100);

          from = backgroundOffset;
          to = from + ((actionData.volume.width - (backgroundOffset * 2)) * (volume / 100));

          target.style.clip = 'rect(0px, ' + to + 'px, ' + actionData.volume.height + 'px, ' + from + 'px)';

        }

        // apply volume to sound, as applicable
        if (soundObject) {
          soundObject.setVolume(volume);
        }

        defaultVolume = volume;

      }

    };

    init();

    // TODO: mixin actions -> exports

    exports = {
      // Per-instance events: window.sm2BarPlayers[0].on = { ... } etc. See global players.on example above for reference.
      on: null,
      actions: actions,
      dom: dom,
      playlistController: playlistController
    };

    return exports;

  };

  // barebones utilities for logic, CSS, DOM, events etc.

  utils = {

    array: (function() {

      function compare(property) {

        var result;

        return function(a, b) {

          if (a[property] < b[property]) {
            result = -1;
          } else if (a[property] > b[property]) {
            result = 1;
          } else {
            result = 0;
          }
          return result;
        };

      }

      function shuffle(array) {

        // Fisher-Yates shuffle algo

        var i, j, temp;

        for (i = array.length - 1; i > 0; i--) {
          j = Math.floor(Math.random() * (i + 1));
          temp = array[i];
          array[i] = array[j];
          array[j] = temp;
        }

        return array;

      }

      return {
        compare: compare,
        shuffle: shuffle
      };

    }()),

    css: (function() {

      function hasClass(o, cStr) {

        return (o.className !== undefined ? new RegExp('(^|\\s)' + cStr + '(\\s|$)').test(o.className) : false);

      }

      function addClass(o, cStr) {

        if (!o || !cStr || hasClass(o, cStr)) {
          return; // safety net
        }
        o.className = (o.className ? o.className + ' ' : '') + cStr;

      }

      function removeClass(o, cStr) {

        if (!o || !cStr || !hasClass(o, cStr)) {
          return;
        }
        o.className = o.className.replace(new RegExp('( ' + cStr + ')|(' + cStr + ')', 'g'), '');

      }

      function swapClass(o, cStr1, cStr2) {

        var tmpClass = {
          className: o.className
        };

        removeClass(tmpClass, cStr1);
        addClass(tmpClass, cStr2);

        o.className = tmpClass.className;

      }

      function toggleClass(o, cStr) {

        var found,
            method;

        found = hasClass(o, cStr);

        method = (found ? removeClass : addClass);

        method(o, cStr);

        // indicate the new state...
        return !found;

      }

      return {
        has: hasClass,
        add: addClass,
        remove: removeClass,
        swap: swapClass,
        toggle: toggleClass
      };

    }()),

    dom: (function() {

      function getAll(param1, param2) {

        var node,
            selector,
            results;

        if (arguments.length === 1) {

          // .selector case
          node = document.documentElement;
          // first param is actually the selector
          selector = param1;

        } else {

          // node, .selector
          node = param1;
          selector = param2;

        }

        // sorry, IE 7 users; IE 8+ required.
        if (node && node.querySelectorAll) {

          results = node.querySelectorAll(selector);

        }

        return results;

      }

      function get(/* parentNode, selector */) {

        var results = getAll.apply(this, arguments);

        // hackish: if an array, return the last item.
        if (results && results.length) {
          return results[results.length - 1];
        }

        // handle "not found" case
        return results && results.length === 0 ? null : results;

      }

      function ancestor(nodeName, element, checkCurrent) {

        if (!element || !nodeName) {
          return element;
        }

        nodeName = nodeName.toUpperCase();

        // return if current node matches.
        if (checkCurrent && element && element.nodeName === nodeName) {
          return element;
        }

        while (element && element.nodeName !== nodeName && element.parentNode) {
          element = element.parentNode;
        }

        return (element && element.nodeName === nodeName ? element : null);

      }

      return {
        ancestor: ancestor,
        get: get,
        getAll: getAll
      };

    }()),

    position: (function() {

      function getOffX(o) {

        // http://www.xs4all.nl/~ppk/js/findpos.html
        var curleft = 0;

        if (o.offsetParent) {

          while (o.offsetParent) {

            curleft += o.offsetLeft;

            o = o.offsetParent;

          }

        } else if (o.x) {

            curleft += o.x;

        }

        return curleft;

      }

      function getOffY(o) {

        // http://www.xs4all.nl/~ppk/js/findpos.html
        var curtop = 0;

        if (o.offsetParent) {

          while (o.offsetParent) {

            curtop += o.offsetTop;

            o = o.offsetParent;

          }

        } else if (o.y) {

            curtop += o.y;

        }

        return curtop;

      }

      return {
        getOffX: getOffX,
        getOffY: getOffY
      };

    }()),

    style: (function() {

      function get(node, styleProp) {

        // http://www.quirksmode.org/dom/getstyles.html
        var value;

        if (node.currentStyle) {

          value = node.currentStyle[styleProp];

        } else if (window.getComputedStyle) {

          value = document.defaultView.getComputedStyle(node, null).getPropertyValue(styleProp);

        }

        return value;

      }

      return {
        get: get
      };

    }()),

    events: (function() {

      var add, remove, preventDefault, getClientX;

      add = function(o, evtName, evtHandler) {
        // return an object with a convenient detach method.
        var eventObject = {
          detach: function() {
            return remove(o, evtName, evtHandler);
          }
        };
        if (window.addEventListener) {
          o.addEventListener(evtName, evtHandler, false);
        } else {
          o.attachEvent('on' + evtName, evtHandler);
        }
        return eventObject;
      };

      remove = (window.removeEventListener !== undefined ? function(o, evtName, evtHandler) {
        return o.removeEventListener(evtName, evtHandler, false);
      } : function(o, evtName, evtHandler) {
        return o.detachEvent('on' + evtName, evtHandler);
      });

      preventDefault = function(e) {
        if (e.preventDefault) {
          e.preventDefault();
        } else {
          e.returnValue = false;
          e.cancelBubble = true;
        }
        return false;
      };

      getClientX = function(e) {
        // normalize between desktop (mouse) and touch (mobile/tablet/?) events.
        // note pageX for touch, which normalizes zoom/scroll/pan vs. clientX.
        return (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].pageX)));
      };

      return {
        add: add,
        preventDefault: preventDefault,
        remove: remove,
        getClientX: getClientX
      };

    }()),

    features: (function() {

      var getAnimationFrame,
          localAnimationFrame,
          localFeatures,
          prop,
          styles,
          testDiv,
          transform;

        testDiv = document.createElement('div');

      /**
       * hat tip: paul irish
       * http://paulirish.com/2011/requestanimationframe-for-smart-animating/
       * https://gist.github.com/838785
       */

      localAnimationFrame = (window.requestAnimationFrame
        || window.webkitRequestAnimationFrame
        || window.mozRequestAnimationFrame
        || window.oRequestAnimationFrame
        || window.msRequestAnimationFrame
        || null);

      // apply to window, avoid "illegal invocation" errors in Chrome
      getAnimationFrame = localAnimationFrame ? function() {
        return localAnimationFrame.apply(window, arguments);
      } : null;

      function has(propName) {

        // test for feature support
        return (testDiv.style[propName] !== undefined ? propName : null);

      }

      // note local scope.
      localFeatures = {

        transform: {
          ie: has('-ms-transform'),
          moz: has('MozTransform'),
          opera: has('OTransform'),
          webkit: has('webkitTransform'),
          w3: has('transform'),
          prop: null // the normalized property value
        },

        rotate: {
          has3D: false,
          prop: null
        },

        getAnimationFrame: getAnimationFrame

      };

      localFeatures.transform.prop = (
        localFeatures.transform.w3 ||
        localFeatures.transform.moz ||
        localFeatures.transform.webkit ||
        localFeatures.transform.ie ||
        localFeatures.transform.opera
      );

      function attempt(style) {

        try {
          testDiv.style[transform] = style;
        } catch(e) {
          // that *definitely* didn't work.
          return false;
        }
        // if we can read back the style, it should be cool.
        return !!testDiv.style[transform];

      }

      if (localFeatures.transform.prop) {

        // try to derive the rotate/3D support.
        transform = localFeatures.transform.prop;
        styles = {
          css_2d: 'rotate(0deg)',
          css_3d: 'rotate3d(0,0,0,0deg)'
        };

        if (attempt(styles.css_3d)) {
          localFeatures.rotate.has3D = true;
          prop = 'rotate3d';
        } else if (attempt(styles.css_2d)) {
          prop = 'rotate';
        }

        localFeatures.rotate.prop = prop;

      }

      testDiv = null;

      return localFeatures;

    }())

  };

  // ---

  // expose to global
  window.sm2BarPlayers = players;
  window.sm2BarPlayerOptions = playerOptions;
  window.SM2BarPlayer = Player;

}(window));
//////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////
////// Count Down ////////////////////////////////////////////
/*
 *  Countdown 360 - v0.1.9
 *  This is a simple attractive circular countdown timer that counts down a number of seconds. The style is configurable and callbacks are supported on completion.
 *  https://github.com/johnschult/jquery.countdown360
 *
 *  Made by John Schult
 *  Under MIT License
 */
;(function ($, window, document, undefined) {
  var pluginName = "countdown360",
    defaults = {
      radius: 15.5,                    // radius of arc
      strokeStyle: "#477050",          // the color of the stroke
      strokeWidth: undefined,          // the stroke width, dynamically calulated if omitted in options
      fillStyle: "#8ac575",            // the fill color
      fontColor: "#477050",            // the font color
      fontFamily: "sans-serif",        // the font family
      fontSize: undefined,             // the font size, dynamically calulated if omitted in options
      fontWeight: 700,                 // the font weight
      autostart: true,                 // start the countdown automatically
      seconds: 10,                     // the number of seconds to count down
      label: ["second", "seconds"],    // the label to use or false if none
      startOverAfterAdding: true,      // Start the timer over after time is added with addSeconds
      smooth: false,                   // should the timer be smooth or stepping
      onComplete: function () {}
    };

  function Plugin(element, options) {
    this.element = element;
    this.settings = $.extend({}, defaults, options);
    if (!this.settings.fontSize) { this.settings.fontSize = this.settings.radius/1.2; }
    if (!this.settings.strokeWidth) { this.settings.strokeWidth = this.settings.radius/4; }
    this._defaults = defaults;
    this._name = pluginName;
    this._init();
  }

  Plugin.prototype = {
    getTimeRemaining: function()
    {
    
      var timeRemaining = this._secondsLeft(this.getElapsedTime());
      return timeRemaining;
    },
    getElapsedTime: function()
    {
      return  Math.round((new Date().getTime() - this.startedAt.getTime())/1000);
    },
    extendTimer: function (value) {
      var seconds = parseInt(value),
          secondsElapsed = Math.round((new Date().getTime() - this.startedAt.getTime())/1000);
      if ((this._secondsLeft(secondsElapsed) + seconds) <= this.settings.seconds) {
        this.startedAt.setSeconds(this.startedAt.getSeconds() + parseInt(value));
      }
    },

    addSeconds: function (value) {
      var secondsElapsed = Math.round((new Date().getTime() - this.startedAt.getTime())/1000);
      if (this.settings.startOverAfterAdding) {
          this.settings.seconds = this._secondsLeft(secondsElapsed) + parseInt(value);
          this.start();
        } else {
          this.settings.seconds += parseInt(value);
        }
    },

    start: function () {
      this.startedAt = new Date();
      this._drawCountdownShape(Math.PI*3.5, true);
      this._drawCountdownLabel(0);
      var timerInterval = 1000;
      if (this.settings.smooth) {
        timerInterval = 16;
      }
      this.interval = setInterval(jQuery.proxy(this._draw, this), timerInterval);
    },

    stop: function (cb) {
      clearInterval(this.interval);
      if (cb) { cb(); }
    },

    _init: function () {
      this.settings.width = (this.settings.radius * 2) + (this.settings.strokeWidth * 2);
      this.settings.height = this.settings.width;
      this.settings.arcX = this.settings.radius + this.settings.strokeWidth;
      this.settings.arcY = this.settings.arcX;
      this._initPen(this._getCanvas());
      if (this.settings.autostart) { this.start(); }
    },

    _getCanvas: function () {
      var $canvas = $("<canvas id=\"countdown360_" + $(this.element).attr("id") + "\" width=\"" +
                      this.settings.width + "\" height=\"" +
                      this.settings.height + "\">" +
                      "<span id=\"countdown-text\" role=\"status\" aria-live=\"assertive\"></span></canvas>");
      $(this.element).prepend($canvas[0]);
      return $canvas[0];
    },

    _initPen: function (canvas) {
      this.pen              = canvas.getContext("2d");
      this.pen.lineWidth    = this.settings.strokeWidth;
      this.pen.strokeStyle  = this.settings.strokeStyle;
      this.pen.fillStyle    = this.settings.fillStyle;
      this.pen.textAlign    = "center";
      this.pen.textBaseline = "middle";
      this.ariaText = $(canvas).children("#countdown-text");
      this._clearRect();
    },

    _clearRect: function () {
      this.pen.clearRect(0, 0, this.settings.width, this.settings.height);
    },

    _secondsLeft: function(secondsElapsed) {
      return this.settings.seconds - secondsElapsed;
    },

    _drawCountdownLabel: function (secondsElapsed) {
      this.ariaText.text(secondsLeft);
      this.pen.font         = this.settings.fontWeight + " " + this.settings.fontSize + "px " + this.settings.fontFamily;
      var secondsLeft = this._secondsLeft(secondsElapsed),
          label = secondsLeft === 1 ? this.settings.label[0] : this.settings.label[1],
          drawLabel = this.settings.label && this.settings.label.length === 2,
          x = this.settings.width/2;
      if (drawLabel) {
        y = this.settings.height/2 - (this.settings.fontSize/6.2);
      } else {
        y = this.settings.height/2;
      }
      this.pen.fillStyle = this.settings.fillStyle;
      this.pen.fillText(secondsLeft + 1, x, y);
      this.pen.fillStyle  = this.settings.fontColor;
      this.pen.fillText(secondsLeft, x, y);
      if (drawLabel) {
        this.pen.font = "normal small-caps " + (this.settings.fontSize/3) + "px " + this.settings.fontFamily;
        this.pen.fillText(label, this.settings.width/2, this.settings.height/2 + (this.settings.fontSize/2.2));
      }
    },

    _drawCountdownShape: function (endAngle, drawStroke) {
      this.pen.fillStyle = this.settings.fillStyle;
      this.pen.beginPath();
      this.pen.arc(this.settings.arcX, this.settings.arcY, this.settings.radius, Math.PI*1.5, endAngle, false);
      this.pen.fill();
      if (drawStroke) { this.pen.stroke(); }
    },

    _draw: function () {
      var millisElapsed, secondsElapsed;
      millisElapsed = new Date().getTime() - this.startedAt.getTime();
      secondsElapsed = Math.floor((millisElapsed)/1000);
        endAngle = (Math.PI*3.5) - (((Math.PI*2)/(this.settings.seconds * 1000)) * millisElapsed);
      this._clearRect();
      this._drawCountdownShape(Math.PI*3.5, false);
      if (secondsElapsed < this.settings.seconds) {
        this._drawCountdownShape(endAngle, true);
        this._drawCountdownLabel(secondsElapsed);
      } else {
        this._drawCountdownLabel(this.settings.seconds);
        this.stop();
        this.settings.onComplete();
      }
    }

  };

  $.fn[pluginName] = function (options) {
    var plugin;
    this.each(function() {
      plugin = $.data(this, "plugin_" + pluginName);
      if (!plugin) {
        plugin = new Plugin(this, options);
        $.data(this, "plugin_" + pluginName, plugin);
      }
    });
    return plugin;
  };

})(jQuery, window, document);
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
////////////// Jquery Confirm ///////////////////////////////////
/////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////
/*!
 * jquery-confirm v3.3.2 (http://craftpip.github.io/jquery-confirm/)
 * Author: Boniface Pereira
 * Website: www.craftpip.com
 * Contact: hey@craftpip.com
 *
 * Copyright 2013-2018 jquery-confirm
 * Licensed under MIT (https://github.com/craftpip/jquery-confirm/blob/master/LICENSE)
 */


/**
 * UMD (Universal Module Definition) to support CommonJS, AMD and browser
 * Thanks to https://github.com/umdjs/umd
 */
(function(factory){
    if(typeof define === 'function' && define.amd){
        // AMD. Register as an anonymous module.
        define(['jquery', 'window'], factory);
    }else if(typeof module === 'object' && module.exports){
        // Node/CommonJS
        module.exports = function(root, jQuery){
            if(jQuery === undefined){
                // require('jQuery') returns a factory that requires window to
                // build a jQuery instance, we normalize how we use modules
                // that require this pattern but the window provided is a noop
                // if it's defined (how jquery works)
                if(typeof window !== 'undefined'){
                    jQuery = require('jquery');
                }
                else{
                    jQuery = require('jquery')(root);
                }
            }
            factory(jQuery, window);
            return jQuery;
        };
    }else{
        // Browser globals
        factory(jQuery, window);
    }
}(function($, window){
    "use strict";
    var jconfirm, Jconfirm;

    $.fn.confirm = function(options, option2){
        if(typeof options === 'undefined') options = {};
        if(typeof options === 'string'){
            options = {
                content: options,
                title: (option2) ? option2 : false
            };
        }
        /*
         *  Alias of $.confirm to emulate native confirm()
         */
        $(this).each(function(){
            var $this = $(this);
            if($this.attr('jc-attached')){
                console.warn('jConfirm has already been attached to this element ', $this[0]);
                return;
            }

            $this.on('click', function(e){
                e.preventDefault();
                var jcOption = $.extend({}, options);
                if($this.attr('data-title'))
                    jcOption['title'] = $this.attr('data-title');
                if($this.attr('data-content'))
                    jcOption['content'] = $this.attr('data-content');
                if(typeof jcOption['buttons'] === 'undefined')
                    jcOption['buttons'] = {};

                jcOption['$target'] = $this;
                if($this.attr('href') && Object.keys(jcOption['buttons']).length === 0){
                    var buttons = $.extend(true, {}, jconfirm.pluginDefaults.defaultButtons, (jconfirm.defaults || {}).defaultButtons || {});
                    var firstBtn = Object.keys(buttons)[0];
                    jcOption['buttons'] = buttons;
                    jcOption.buttons[firstBtn].action = function(){
                        location.href = $this.attr('href');
                    };
                }
                jcOption['closeIcon'] = false;
                var instance = $.confirm(jcOption);
            });

            $this.attr('jc-attached', true);
        });
        return $(this);
    };
    $.confirm = function(options, option2){
        if(typeof options === 'undefined') options = {};
        if(typeof options === 'string'){
            options = {
                content: options,
                title: (option2) ? option2 : false
            };
        }

        var putDefaultButtons = !(options['buttons'] === false);

        if(typeof options['buttons'] !== 'object')
            options['buttons'] = {};

        if(Object.keys(options['buttons']).length === 0 && putDefaultButtons){
            var buttons = $.extend(true, {}, jconfirm.pluginDefaults.defaultButtons, (jconfirm.defaults || {}).defaultButtons || {});
            options['buttons'] = buttons;
        }

        /*
         *  Alias of jconfirm
         */
        return jconfirm(options);
    };
    $.alert = function(options, option2){
        if(typeof options === 'undefined') options = {};
        if(typeof options === 'string'){
            options = {
                content: options,
                title: (option2) ? option2 : false
            };
        }

        var putDefaultButtons = !(options['buttons'] === false);

        if(typeof options.buttons !== 'object')
            options.buttons = {};

        if(Object.keys(options['buttons']).length === 0 && putDefaultButtons){
            var buttons = $.extend(true, {}, jconfirm.pluginDefaults.defaultButtons, (jconfirm.defaults || {}).defaultButtons || {});
            var firstBtn = Object.keys(buttons)[0];
            options['buttons'][firstBtn] = buttons[firstBtn];
        }
        /*
         *  Alias of jconfirm
         */
        return jconfirm(options);
    };
    $.dialog = function(options, option2){
        if(typeof options === 'undefined') options = {};
        if(typeof options === 'string'){
            options = {
                content: options,
                title: (option2) ? option2 : false,
                closeIcon: function(){
                    // Just close the modal
                }
            };
        }

        options['buttons'] = {}; // purge buttons

        if(typeof options['closeIcon'] === 'undefined'){
            // Dialog must have a closeIcon.
            options['closeIcon'] = function(){
            }
        }
        /*
         *  Alias of jconfirm
         */
        options.confirmKeys = [13];
        return jconfirm(options);
    };

    jconfirm = function(options){
        if(typeof options === 'undefined') options = {};
        /*
         * initial function for calling.
         */
        var pluginOptions = $.extend(true, {}, jconfirm.pluginDefaults);
        if(jconfirm.defaults){
            pluginOptions = $.extend(true, pluginOptions, jconfirm.defaults);
        }

        /*
         * merge options with plugin defaults.
         */
        pluginOptions = $.extend(true, {}, pluginOptions, options);
        var instance = new Jconfirm(pluginOptions);
        jconfirm.instances.push(instance);
        return instance;
    };
    Jconfirm = function(options){
        /*
         * constructor function Jconfirm,
         * options = user options.
         */
        $.extend(this, options);
        this._init();
    };
    Jconfirm.prototype = {
        _init: function(){
            var that = this;

            if(!jconfirm.instances.length)
                jconfirm.lastFocused = $('body').find(':focus');

            this._id = Math.round(Math.random() * 99999);
            /**
             * contentParsed maintains the contents for $content, before it is put in DOM
             */
            this.contentParsed = $(document.createElement('div'));

            if(!this.lazyOpen){
                setTimeout(function(){
                    that.open();
                }, 0);
            }
        },
        _buildHTML: function(){
            var that = this;

            // prefix the animation string and store in animationParsed
            this._parseAnimation(this.animation, 'o');
            this._parseAnimation(this.closeAnimation, 'c');
            this._parseBgDismissAnimation(this.backgroundDismissAnimation);
            this._parseColumnClass(this.columnClass);
            this._parseTheme(this.theme);
            this._parseType(this.type);

            /*
             * Append html.
             */
            var template = $(this.template);
            template.find('.jconfirm-box').addClass(this.animationParsed).addClass(this.backgroundDismissAnimationParsed).addClass(this.typeParsed);

            if(this.typeAnimated)
                template.find('.jconfirm-box').addClass('jconfirm-type-animated');

            if(this.useBootstrap){
                template.find('.jc-bs3-row').addClass(this.bootstrapClasses.row);
                template.find('.jc-bs3-row').addClass('justify-content-md-center justify-content-sm-center justify-content-xs-center justify-content-lg-center');

                template.find('.jconfirm-box-container').addClass(this.columnClassParsed);

                if(this.containerFluid)
                    template.find('.jc-bs3-container').addClass(this.bootstrapClasses.containerFluid);
                else
                    template.find('.jc-bs3-container').addClass(this.bootstrapClasses.container);
            }else{
                template.find('.jconfirm-box').css('width', this.boxWidth);
            }

            if(this.titleClass)
                template.find('.jconfirm-title-c').addClass(this.titleClass);

            template.addClass(this.themeParsed);
            var ariaLabel = 'jconfirm-box' + this._id;
            template.find('.jconfirm-box').attr('aria-labelledby', ariaLabel).attr('tabindex', -1);
            template.find('.jconfirm-content').attr('id', ariaLabel);
            if(this.bgOpacity !== null)
                template.find('.jconfirm-bg').css('opacity', this.bgOpacity);
            if(this.rtl)
                template.addClass('jconfirm-rtl');

            this.$el = template.appendTo(this.container);
            this.$jconfirmBoxContainer = this.$el.find('.jconfirm-box-container');
            this.$jconfirmBox = this.$body = this.$el.find('.jconfirm-box');
            this.$jconfirmBg = this.$el.find('.jconfirm-bg');
            this.$title = this.$el.find('.jconfirm-title');
            this.$titleContainer = this.$el.find('.jconfirm-title-c');
            this.$content = this.$el.find('div.jconfirm-content');
            this.$contentPane = this.$el.find('.jconfirm-content-pane');
            this.$icon = this.$el.find('.jconfirm-icon-c');
            this.$closeIcon = this.$el.find('.jconfirm-closeIcon');
            this.$holder = this.$el.find('.jconfirm-holder');
            // this.$content.css(this._getCSS(this.animationSpeed, this.animationBounce));
            this.$btnc = this.$el.find('.jconfirm-buttons');
            this.$scrollPane = this.$el.find('.jconfirm-scrollpane');

            that.setStartingPoint();

            // for loading content via URL
            this._contentReady = $.Deferred();
            this._modalReady = $.Deferred();
            this.$holder.css({
                'padding-top': this.offsetTop,
                'padding-bottom': this.offsetBottom,
            });

            this.setTitle();
            this.setIcon();
            this._setButtons();
            this._parseContent();
            this.initDraggable();

            if(this.isAjax)
                this.showLoading(false);

            $.when(this._contentReady, this._modalReady).then(function(){
                if(that.isAjaxLoading)
                    setTimeout(function(){
                        that.isAjaxLoading = false;
                        that.setContent();
                        that.setTitle();
                        that.setIcon();
                        setTimeout(function(){
                            that.hideLoading(false);
                            that._updateContentMaxHeight();
                        }, 100);
                        if(typeof that.onContentReady === 'function')
                            that.onContentReady();
                    }, 50);
                else{
                    // that.setContent();
                    that._updateContentMaxHeight();
                    that.setTitle();
                    that.setIcon();
                    if(typeof that.onContentReady === 'function')
                        that.onContentReady();
                }

                // start countdown after content has loaded.
                if(that.autoClose)
                    that._startCountDown();
            }).then(function(){
                that._watchContent();
            });

            if (this.animation === 'none') {
                this.animationSpeed = 1;
                this.animationBounce = 1;
            }

            this.$body.css(this._getCSS(this.animationSpeed, this.animationBounce));
            this.$contentPane.css(this._getCSS(this.animationSpeed, 1));
            this.$jconfirmBg.css(this._getCSS(this.animationSpeed, 1));
            this.$jconfirmBoxContainer.css(this._getCSS(this.animationSpeed, 1));
        },
        _typePrefix: 'jconfirm-type-',
        typeParsed: '',
        _parseType: function(type){
            this.typeParsed = this._typePrefix + type;
        },
        setType: function(type){
            var oldClass = this.typeParsed;
            this._parseType(type);
            this.$jconfirmBox.removeClass(oldClass).addClass(this.typeParsed);
        },
        themeParsed: '',
        _themePrefix: 'jconfirm-',
        setTheme: function(theme){
            var previous = this.theme;
            this.theme = theme || this.theme;
            this._parseTheme(this.theme);
            if(previous)
                this.$el.removeClass(previous);
            this.$el.addClass(this.themeParsed);
            this.theme = theme;
        },
        _parseTheme: function(theme){
            var that = this;
            theme = theme.split(',');
            $.each(theme, function(k, a){
                if(a.indexOf(that._themePrefix) === -1)
                    theme[k] = that._themePrefix + $.trim(a);
            });
            this.themeParsed = theme.join(' ').toLowerCase();
        },
        backgroundDismissAnimationParsed: '',
        _bgDismissPrefix: 'jconfirm-hilight-',
        _parseBgDismissAnimation: function(bgDismissAnimation){
            var animation = bgDismissAnimation.split(',');
            var that = this;
            $.each(animation, function(k, a){
                if(a.indexOf(that._bgDismissPrefix) === -1)
                    animation[k] = that._bgDismissPrefix + $.trim(a);
            });
            this.backgroundDismissAnimationParsed = animation.join(' ').toLowerCase();
        },
        animationParsed: '',
        closeAnimationParsed: '',
        _animationPrefix: 'jconfirm-animation-',
        setAnimation: function(animation){
            this.animation = animation || this.animation;
            this._parseAnimation(this.animation, 'o');
        },
        _parseAnimation: function(animation, which){
            which = which || 'o'; // parse what animation and store where. open or close?
            var animations = animation.split(',');
            var that = this;
            $.each(animations, function(k, a){
                if(a.indexOf(that._animationPrefix) === -1)
                    animations[k] = that._animationPrefix + $.trim(a);
            });
            var a_string = animations.join(' ').toLowerCase();
            if(which === 'o')
                this.animationParsed = a_string;
            else
                this.closeAnimationParsed = a_string;

            return a_string;
        },
        setCloseAnimation: function(closeAnimation){
            this.closeAnimation = closeAnimation || this.closeAnimation;
            this._parseAnimation(this.closeAnimation, 'c');
        },
        setAnimationSpeed: function(speed){
            this.animationSpeed = speed || this.animationSpeed;
            // this.$body.css(this._getCSS(this.animationSpeed, this.animationBounce));
        },
        columnClassParsed: '',
        setColumnClass: function(colClass){
            if(!this.useBootstrap){
                console.warn("cannot set columnClass, useBootstrap is set to false");
                return;
            }
            this.columnClass = colClass || this.columnClass;
            this._parseColumnClass(this.columnClass);
            this.$jconfirmBoxContainer.addClass(this.columnClassParsed);
        },
        _updateContentMaxHeight: function(){
            var height = $(window).height() - (this.$jconfirmBox.outerHeight() - this.$contentPane.outerHeight()) - (this.offsetTop + this.offsetBottom);
            this.$contentPane.css({
                'max-height': height + 'px'
            });
        },
        setBoxWidth: function(width){
            if(this.useBootstrap){
                console.warn("cannot set boxWidth, useBootstrap is set to true");
                return;
            }
            this.boxWidth = width;
            this.$jconfirmBox.css('width', width);
        },
        _parseColumnClass: function(colClass){
            colClass = colClass.toLowerCase();
            var p;
            switch(colClass){
                case 'xl':
                case 'xlarge':
                    p = 'col-md-12';
                    break;
                case 'l':
                case 'large':
                    p = 'col-md-8 col-md-offset-2';
                    break;
                case 'm':
                case 'medium':
                    p = 'col-md-6 col-md-offset-3';
                    break;
                case 's':
                case 'small':
                    p = 'col-md-4 col-md-offset-4';
                    break;
                case 'xs':
                case 'xsmall':
                    p = 'col-md-2 col-md-offset-5';
                    break;
                default:
                    p = colClass;
            }
            this.columnClassParsed = p;
        },
        initDraggable: function(){
            var that = this;
            var $t = this.$titleContainer;

            this.resetDrag();
            if(this.draggable){
                $t.on('mousedown', function(e){
                    $t.addClass('jconfirm-hand');
                    that.mouseX = e.clientX;
                    that.mouseY = e.clientY;
                    that.isDrag = true;
                });
                $(window).on('mousemove.' + this._id, function(e){
                    if(that.isDrag){
                        that.movingX = e.clientX - that.mouseX + that.initialX;
                        that.movingY = e.clientY - that.mouseY + that.initialY;
                        that.setDrag();
                    }
                });

                $(window).on('mouseup.' + this._id, function(){
                    $t.removeClass('jconfirm-hand');
                    if(that.isDrag){
                        that.isDrag = false;
                        that.initialX = that.movingX;
                        that.initialY = that.movingY;
                    }
                })
            }
        },
        resetDrag: function(){
            this.isDrag = false;
            this.initialX = 0;
            this.initialY = 0;
            this.movingX = 0;
            this.movingY = 0;
            this.mouseX = 0;
            this.mouseY = 0;
            this.$jconfirmBoxContainer.css('transform', 'translate(' + 0 + 'px, ' + 0 + 'px)');
        },
        setDrag: function(){
            if(!this.draggable)
                return;

            this.alignMiddle = false;
            var boxWidth = this.$jconfirmBox.outerWidth();
            var boxHeight = this.$jconfirmBox.outerHeight();
            var windowWidth = $(window).width();
            var windowHeight = $(window).height();
            var that = this;
            var dragUpdate = 1;
            if(that.movingX % dragUpdate === 0 || that.movingY % dragUpdate === 0){
                if(that.dragWindowBorder){
                    var leftDistance = (windowWidth / 2) - boxWidth / 2;
                    var topDistance = (windowHeight / 2) - boxHeight / 2;
                    topDistance -= that.dragWindowGap;
                    leftDistance -= that.dragWindowGap;

                    if(leftDistance + that.movingX < 0){
                        that.movingX = -leftDistance;
                    }else if(leftDistance - that.movingX < 0){
                        that.movingX = leftDistance;
                    }

                    if(topDistance + that.movingY < 0){
                        that.movingY = -topDistance;
                    }else if(topDistance - that.movingY < 0){
                        that.movingY = topDistance;
                    }
                }

                that.$jconfirmBoxContainer.css('transform', 'translate(' + that.movingX + 'px, ' + that.movingY + 'px)');
            }
        },
        _scrollTop: function(){
            if(typeof pageYOffset !== 'undefined'){
                //most browsers except IE before #9
                return pageYOffset;
            }
            else{
                var B = document.body; //IE 'quirks'
                var D = document.documentElement; //IE with doctype
                D = (D.clientHeight) ? D : B;
                return D.scrollTop;
            }
        },
        _watchContent: function(){
            var that = this;
            if(this._timer) clearInterval(this._timer);

            var prevContentHeight = 0;
            this._timer = setInterval(function(){
                if(that.smoothContent){
                    var contentHeight = that.$content.outerHeight() || 0;
                    if(contentHeight !== prevContentHeight){
 
                       // Commented out to prevent scroll to top when updating the content 
                       // (for example when using ajax in forms in content) 
                       // that.$contentPane.css({
                       //     'height': contentHeight
                       // }).scrollTop(0);
                        prevContentHeight = contentHeight;
                    }
                    var wh = $(window).height();
                    var total = that.offsetTop + that.offsetBottom + that.$jconfirmBox.height() - that.$contentPane.height() + that.$content.height();
                    if(total < wh){
                        that.$contentPane.addClass('no-scroll');
                    }else{
                        that.$contentPane.removeClass('no-scroll');
                    }
                }
            }, this.watchInterval);
        },
        _overflowClass: 'jconfirm-overflow',
        _hilightAnimating: false,
        highlight: function(){
            this.hiLightModal();
        },
        hiLightModal: function(){
            var that = this;
            if(this._hilightAnimating)
                return;

            that.$body.addClass('hilight');
            var duration = parseFloat(that.$body.css('animation-duration')) || 2;
            this._hilightAnimating = true;
            setTimeout(function(){
                that._hilightAnimating = false;
                that.$body.removeClass('hilight');
            }, duration * 1000);
        },
        _bindEvents: function(){
            var that = this;
            this.boxClicked = false;

            this.$scrollPane.click(function(e){ // Ignore propagated clicks
                if(!that.boxClicked){ // Background clicked
                    /*
                     If backgroundDismiss is a function and its return value is truthy
                     proceed to close the modal.
                     */
                    var buttonName = false;
                    var shouldClose = false;
                    var str;

                    if(typeof that.backgroundDismiss === 'function')
                        str = that.backgroundDismiss();
                    else
                        str = that.backgroundDismiss;

                    if(typeof str === 'string' && typeof that.buttons[str] !== 'undefined'){
                        buttonName = str;
                        shouldClose = false;
                    }else if(typeof str === 'undefined' || !!(str) === true){
                        shouldClose = true;
                    }else{
                        shouldClose = false;
                    }

                    if(buttonName){
                        var btnResponse = that.buttons[buttonName].action.apply(that);
                        shouldClose = (typeof btnResponse === 'undefined') || !!(btnResponse);
                    }

                    if(shouldClose)
                        that.close();
                    else
                        that.hiLightModal();
                }
                that.boxClicked = false;
            });

            this.$jconfirmBox.click(function(e){
                that.boxClicked = true;
            });

            var isKeyDown = false;
            $(window).on('jcKeyDown.' + that._id, function(e){
                if(!isKeyDown){
                    isKeyDown = true;
                }
            });
            $(window).on('keyup.' + that._id, function(e){
                if(isKeyDown){
                    that.reactOnKey(e);
                    isKeyDown = false;
                }
            });

            $(window).on('resize.' + this._id, function(){
                that._updateContentMaxHeight();
                setTimeout(function(){
                    that.resetDrag();
                }, 100);
            });
        },
        _cubic_bezier: '0.36, 0.55, 0.19',
        _getCSS: function(speed, bounce){
            return {
                '-webkit-transition-duration': speed / 1000 + 's',
                'transition-duration': speed / 1000 + 's',
                '-webkit-transition-timing-function': 'cubic-bezier(' + this._cubic_bezier + ', ' + bounce + ')',
                'transition-timing-function': 'cubic-bezier(' + this._cubic_bezier + ', ' + bounce + ')'
            };
        },
        _setButtons: function(){
            var that = this;
            /*
             * Settings up buttons
             */

            var total_buttons = 0;
            if(typeof this.buttons !== 'object')
                this.buttons = {};

            $.each(this.buttons, function(key, button){
                total_buttons += 1;
                if(typeof button === 'function'){
                    that.buttons[key] = button = {
                        action: button
                    };
                }

                that.buttons[key].text = button.text || key;
                that.buttons[key].btnClass = button.btnClass || 'btn-default';
                that.buttons[key].action = button.action || function(){
                };
                that.buttons[key].keys = button.keys || [];
                that.buttons[key].isHidden = button.isHidden || false;
                that.buttons[key].isDisabled = button.isDisabled || false;

                $.each(that.buttons[key].keys, function(i, a){
                    that.buttons[key].keys[i] = a.toLowerCase();
                });

                var button_element = $('<button type="button" class="btn"></button>')
                    .html(that.buttons[key].text)
                    .addClass(that.buttons[key].btnClass)
                    .prop('disabled', that.buttons[key].isDisabled)
                    .css('display', that.buttons[key].isHidden ? 'none' : '')
                    .click(function(e){
                        e.preventDefault();
                        var res = that.buttons[key].action.apply(that, [that.buttons[key]]);
                        that.onAction.apply(that, [key, that.buttons[key]]);
                        that._stopCountDown();
                        if(typeof res === 'undefined' || res)
                            that.close();
                    });

                that.buttons[key].el = button_element;
                that.buttons[key].setText = function(text){
                    button_element.html(text);
                };
                that.buttons[key].addClass = function(className){
                    button_element.addClass(className);
                };
                that.buttons[key].removeClass = function(className){
                    button_element.removeClass(className);
                };
                that.buttons[key].disable = function(){
                    that.buttons[key].isDisabled = true;
                    button_element.prop('disabled', true);
                };
                that.buttons[key].enable = function(){
                    that.buttons[key].isDisabled = false;
                    button_element.prop('disabled', false);
                };
                that.buttons[key].show = function(){
                    that.buttons[key].isHidden = false;
                    button_element.css('display', '');
                };
                that.buttons[key].hide = function(){
                    that.buttons[key].isHidden = true;
                    button_element.css('display', 'none');
                };
                /*
                 Buttons are prefixed with $_ or $$ for quick access
                 */
                that['$_' + key] = that['$$' + key] = button_element;
                that.$btnc.append(button_element);
            });

            if(total_buttons === 0) this.$btnc.hide();
            if(this.closeIcon === null && total_buttons === 0){
                /*
                 in case when no buttons are present & closeIcon is null, closeIcon is set to true,
                 set closeIcon to true to explicitly tell to hide the close icon
                 */
                this.closeIcon = true;
            }

            if(this.closeIcon){
                if(this.closeIconClass){
                    // user requires a custom class.
                    var closeHtml = '<i class="' + this.closeIconClass + '"></i>';
                    this.$closeIcon.html(closeHtml);
                }

                this.$closeIcon.click(function(e){
                    e.preventDefault();

                    var buttonName = false;
                    var shouldClose = false;
                    var str;

                    if(typeof that.closeIcon === 'function'){
                        str = that.closeIcon();
                    }else{
                        str = that.closeIcon;
                    }

                    if(typeof str === 'string' && typeof that.buttons[str] !== 'undefined'){
                        buttonName = str;
                        shouldClose = false;
                    }else if(typeof str === 'undefined' || !!(str) === true){
                        shouldClose = true;
                    }else{
                        shouldClose = false;
                    }
                    if(buttonName){
                        var btnResponse = that.buttons[buttonName].action.apply(that);
                        shouldClose = (typeof btnResponse === 'undefined') || !!(btnResponse);
                    }
                    if(shouldClose){
                        that.close();
                    }
                });
                this.$closeIcon.show();
            }else{
                this.$closeIcon.hide();
            }
        },
        setTitle: function(string, force){
            force = force || false;

            if(typeof string !== 'undefined')
                if(typeof string === 'string')
                    this.title = string;
                else if(typeof string === 'function'){
                    if(typeof string.promise === 'function')
                        console.error('Promise was returned from title function, this is not supported.');

                    var response = string();
                    if(typeof response === 'string')
                        this.title = response;
                    else
                        this.title = false;
                }else
                    this.title = false;

            if(this.isAjaxLoading && !force)
                return;

            this.$title.html(this.title || '');
            this.updateTitleContainer();
        },
        setIcon: function(iconClass, force){
            force = force || false;

            if(typeof iconClass !== 'undefined')
                if(typeof iconClass === 'string')
                    this.icon = iconClass;
                else if(typeof iconClass === 'function'){
                    var response = iconClass();
                    if(typeof response === 'string')
                        this.icon = response;
                    else
                        this.icon = false;
                }
                else
                    this.icon = false;

            if(this.isAjaxLoading && !force)
                return;

            this.$icon.html(this.icon ? '<i class="' + this.icon + '"></i>' : '');
            this.updateTitleContainer();
        },
        updateTitleContainer: function(){
            if(!this.title && !this.icon){
                this.$titleContainer.hide();
            }else{
                this.$titleContainer.show();
            }
        },
        setContentPrepend: function(content, force){
            if(!content)
                return;

            this.contentParsed.prepend(content);
        },
        setContentAppend: function(content){
            if(!content)
                return;

            this.contentParsed.append(content);
        },
        setContent: function(content, force){
            force = !!force;
            var that = this;
            if(content)
                this.contentParsed.html('').append(content);
            if(this.isAjaxLoading && !force)
                return;

            this.$content.html('');
            this.$content.append(this.contentParsed);
            setTimeout(function(){
                that.$body.find('input[autofocus]:visible:first').focus();
            }, 100);
        },
        loadingSpinner: false,
        showLoading: function(disableButtons){
            this.loadingSpinner = true;
            this.$jconfirmBox.addClass('loading');
            if(disableButtons)
                this.$btnc.find('button').prop('disabled', true);

        },
        hideLoading: function(enableButtons){
            this.loadingSpinner = false;
            this.$jconfirmBox.removeClass('loading');
            if(enableButtons)
                this.$btnc.find('button').prop('disabled', false);

        },
        ajaxResponse: false,
        contentParsed: '',
        isAjax: false,
        isAjaxLoading: false,
        _parseContent: function(){
            var that = this;
            var e = '&nbsp;';

            if(typeof this.content === 'function'){
                var res = this.content.apply(this);
                if(typeof res === 'string'){
                    this.content = res;
                }
                else if(typeof res === 'object' && typeof res.always === 'function'){
                    // this is ajax loading via promise
                    this.isAjax = true;
                    this.isAjaxLoading = true;
                    res.always(function(data, status, xhr){
                        that.ajaxResponse = {
                            data: data,
                            status: status,
                            xhr: xhr
                        };
                        that._contentReady.resolve(data, status, xhr);
                        if(typeof that.contentLoaded === 'function')
                            that.contentLoaded(data, status, xhr);
                    });
                    this.content = e;
                }else{
                    this.content = e;
                }
            }

            if(typeof this.content === 'string' && this.content.substr(0, 4).toLowerCase() === 'url:'){
                this.isAjax = true;
                this.isAjaxLoading = true;
                var u = this.content.substring(4, this.content.length);
                $.get(u).done(function(html){
                    that.contentParsed.html(html);
                }).always(function(data, status, xhr){
                    that.ajaxResponse = {
                        data: data,
                        status: status,
                        xhr: xhr
                    };
                    that._contentReady.resolve(data, status, xhr);
                    if(typeof that.contentLoaded === 'function')
                        that.contentLoaded(data, status, xhr);
                });
            }

            if(!this.content)
                this.content = e;

            if(!this.isAjax){
                this.contentParsed.html(this.content);
                this.setContent();
                that._contentReady.resolve();
            }
        },
        _stopCountDown: function(){
            clearInterval(this.autoCloseInterval);
            if(this.$cd)
                this.$cd.remove();
        },
        _startCountDown: function(){
            var that = this;
            var opt = this.autoClose.split('|');
            if(opt.length !== 2){
                console.error('Invalid option for autoClose. example \'close|10000\'');
                return false;
            }

            var button_key = opt[0];
            var time = parseInt(opt[1]);
            if(typeof this.buttons[button_key] === 'undefined'){
                console.error('Invalid button key \'' + button_key + '\' for autoClose');
                return false;
            }

            var seconds = Math.ceil(time / 1000);
            this.$cd = $('<span class="countdown"> (' + seconds + ')</span>')
                .appendTo(this['$_' + button_key]);

            this.autoCloseInterval = setInterval(function(){
                that.$cd.html(' (' + (seconds -= 1) + ') ');
                if(seconds <= 0){
                    that['$$' + button_key].trigger('click');
                    that._stopCountDown();
                }
            }, 1000);
        },
        _getKey: function(key){
            // very necessary keys.
            switch(key){
                case 192:
                    return 'tilde';
                case 13:
                    return 'enter';
                case 16:
                    return 'shift';
                case 9:
                    return 'tab';
                case 20:
                    return 'capslock';
                case 17:
                    return 'ctrl';
                case 91:
                    return 'win';
                case 18:
                    return 'alt';
                case 27:
                    return 'esc';
                case 32:
                    return 'space';
            }

            // only trust alphabets with this.
            var initial = String.fromCharCode(key);
            if(/^[A-z0-9]+$/.test(initial))
                return initial.toLowerCase();
            else
                return false;
        },
        reactOnKey: function(e){
            var that = this;

            /*
             Prevent keyup event if the dialog is not last!
             */
            var a = $('.jconfirm');
            if(a.eq(a.length - 1)[0] !== this.$el[0])
                return false;

            var key = e.which;
            /*
             Do not react if Enter or Space is pressed on input elements
             */
            if(this.$content.find(':input').is(':focus') && /13|32/.test(key))
                return false;

            var keyChar = this._getKey(key);

            // If esc is pressed
            if(keyChar === 'esc' && this.escapeKey){
                if(this.escapeKey === true){
                    this.$scrollPane.trigger('click');
                }
                else if(typeof this.escapeKey === 'string' || typeof this.escapeKey === 'function'){
                    var buttonKey;
                    if(typeof this.escapeKey === 'function'){
                        buttonKey = this.escapeKey();
                    }else{
                        buttonKey = this.escapeKey;
                    }

                    if(buttonKey)
                        if(typeof this.buttons[buttonKey] === 'undefined'){
                            console.warn('Invalid escapeKey, no buttons found with key ' + buttonKey);
                        }else{
                            this['$_' + buttonKey].trigger('click');
                        }
                }
            }

            // check if any button is listening to this key.
            $.each(this.buttons, function(key, button){
                if(button.keys.indexOf(keyChar) !== -1){
                    that['$_' + key].trigger('click');
                }
            });
        },
        setDialogCenter: function(){
            console.info('setDialogCenter is deprecated, dialogs are centered with CSS3 tables');
        },
        _unwatchContent: function(){
            clearInterval(this._timer);
        },
        close: function(onClosePayload){
            var that = this;

            if(typeof this.onClose === 'function')
                this.onClose(onClosePayload);

            this._unwatchContent();

            /*
             unbind the window resize & keyup event.
             */
            $(window).unbind('resize.' + this._id);
            $(window).unbind('keyup.' + this._id);
            $(window).unbind('jcKeyDown.' + this._id);

            if(this.draggable){
                $(window).unbind('mousemove.' + this._id);
                $(window).unbind('mouseup.' + this._id);
                this.$titleContainer.unbind('mousedown');
            }

            that.$el.removeClass(that.loadedClass);
            $('body').removeClass('jconfirm-no-scroll-' + that._id);
            that.$jconfirmBoxContainer.removeClass('jconfirm-no-transition');

            setTimeout(function(){
                that.$body.addClass(that.closeAnimationParsed);
                that.$jconfirmBg.addClass('jconfirm-bg-h');
                var closeTimer = (that.closeAnimation === 'none') ? 1 : that.animationSpeed;

                setTimeout(function(){
                    that.$el.remove();

                    var l = jconfirm.instances;
                    var i = jconfirm.instances.length - 1;
                    for(i; i >= 0; i--){
                        if(jconfirm.instances[i]._id === that._id){
                            jconfirm.instances.splice(i, 1);
                        }
                    }

                    // Focusing a element, scrolls automatically to that element.
                    // no instances should be open, lastFocused should be true, the lastFocused element must exists in DOM
                    if(!jconfirm.instances.length){
                        if(that.scrollToPreviousElement && jconfirm.lastFocused && jconfirm.lastFocused.length && $.contains(document, jconfirm.lastFocused[0])){
                            var $lf = jconfirm.lastFocused;
                            if(that.scrollToPreviousElementAnimate){
                                var st = $(window).scrollTop();
                                var ot = jconfirm.lastFocused.offset().top;
                                var wh = $(window).height();
                                if(!(ot > st && ot < (st + wh))){
                                    var scrollTo = (ot - Math.round((wh / 3)));
                                    $('html, body').animate({
                                        scrollTop: scrollTo
                                    }, that.animationSpeed, 'swing', function(){
                                        // gracefully scroll and then focus.
                                        $lf.focus();
                                    });
                                }else{
                                    // the element to be focused is already in view.
                                    $lf.focus();
                                }
                            }else{
                                $lf.focus();
                            }
                            jconfirm.lastFocused = false;
                        }
                    }

                    if(typeof that.onDestroy === 'function')
                        that.onDestroy();

                }, closeTimer * 0.40);
            }, 50);

            return true;
        },
        open: function(){
            if(this.isOpen())
                return false;

            // var that = this;
            this._buildHTML();
            this._bindEvents();
            this._open();

            return true;
        },
        setStartingPoint: function(){
            var el = false;

            if(this.animateFromElement !== true && this.animateFromElement){
                el = this.animateFromElement;
                jconfirm.lastClicked = false;
            }else if(jconfirm.lastClicked && this.animateFromElement === true){
                el = jconfirm.lastClicked;
                jconfirm.lastClicked = false;
            }else{
                return false;
            }

            if(!el)
                return false;

            var offset = el.offset();

            var iTop = el.outerHeight() / 2;
            var iLeft = el.outerWidth() / 2;

            // placing position of jconfirm modal in center of clicked element
            iTop -= this.$jconfirmBox.outerHeight() / 2;
            iLeft -= this.$jconfirmBox.outerWidth() / 2;

            // absolute position on screen
            var sourceTop = offset.top + iTop;
            sourceTop = sourceTop - this._scrollTop();
            var sourceLeft = offset.left + iLeft;

            // window halved
            var wh = $(window).height() / 2;
            var ww = $(window).width() / 2;

            var targetH = wh - this.$jconfirmBox.outerHeight() / 2;
            var targetW = ww - this.$jconfirmBox.outerWidth() / 2;

            sourceTop -= targetH;
            sourceLeft -= targetW;

            // Check if the element is inside the viewable window.
            if(Math.abs(sourceTop) > wh || Math.abs(sourceLeft) > ww)
                return false;

            this.$jconfirmBoxContainer.css('transform', 'translate(' + sourceLeft + 'px, ' + sourceTop + 'px)');
        },
        _open: function(){
            var that = this;
            if(typeof that.onOpenBefore === 'function')
                that.onOpenBefore();

            this.$body.removeClass(this.animationParsed);
            this.$jconfirmBg.removeClass('jconfirm-bg-h');
            this.$body.focus();

            that.$jconfirmBoxContainer.css('transform', 'translate(' + 0 + 'px, ' + 0 + 'px)');

            setTimeout(function(){
                that.$body.css(that._getCSS(that.animationSpeed, 1));
                that.$body.css({
                    'transition-property': that.$body.css('transition-property') + ', margin'
                });
                that.$jconfirmBoxContainer.addClass('jconfirm-no-transition');
                that._modalReady.resolve();
                if(typeof that.onOpen === 'function')
                    that.onOpen();

                that.$el.addClass(that.loadedClass);
            }, this.animationSpeed);
        },
        loadedClass: 'jconfirm-open',
        isClosed: function () {
            return !this.$el || this.$el.parent().length === 0;
        },
        isOpen: function(){
            return !this.isClosed();
        },
        toggle: function(){
            if(!this.isOpen())
                this.open();
            else
                this.close();
        }
    };

    jconfirm.instances = [];
    jconfirm.lastFocused = false;
    jconfirm.pluginDefaults = {
        template: '' +
        '<div class="jconfirm">' +
        '<div class="jconfirm-bg jconfirm-bg-h"></div>' +
        '<div class="jconfirm-scrollpane">' +
        '<div class="jconfirm-row">' +
        '<div class="jconfirm-cell">' +
        '<div class="jconfirm-holder">' +
        '<div class="jc-bs3-container">' +
        '<div class="jc-bs3-row">' +
        '<div class="jconfirm-box-container jconfirm-animated">' +
        '<div class="jconfirm-box" role="dialog" aria-labelledby="labelled" tabindex="-1">' +
        '<div class="jconfirm-closeIcon">&times;</div>' +
        '<div class="jconfirm-title-c">' +
        '<span class="jconfirm-icon-c"></span>' +
        '<span class="jconfirm-title"></span>' +
        '</div>' +
        '<div class="jconfirm-content-pane">' +
        '<div class="jconfirm-content"></div>' +
        '</div>' +
        '<div class="jconfirm-buttons">' +
        '</div>' +
        '<div class="jconfirm-clear">' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div></div>',
        title: 'Hello',
        titleClass: '',
        type: 'default',
        typeAnimated: true,
        draggable: true,
        dragWindowGap: 15,
        dragWindowBorder: true,
        animateFromElement: true,
        /**
         * @deprecated
         */
        alignMiddle: true,
        smoothContent: true,
        content: 'Are you sure to continue?',
        buttons: {},
        defaultButtons: {
            ok: {
                action: function(){
                }
            },
            close: {
                action: function(){
                }
            }
        },
        contentLoaded: function(){
        },
        icon: '',
        lazyOpen: false,
        bgOpacity: null,
        theme: 'light',
        animation: 'scale',
        closeAnimation: 'scale',
        animationSpeed: 400,
        animationBounce: 1,
        escapeKey: true,
        rtl: false,
        container: 'body',
        containerFluid: false,
        backgroundDismiss: false,
        backgroundDismissAnimation: 'shake',
        autoClose: false,
        closeIcon: null,
        closeIconClass: false,
        watchInterval: 100,
        columnClass: 'col-md-4 col-md-offset-4 col-sm-6 col-sm-offset-3 col-xs-10 col-xs-offset-1',
        boxWidth: '50%',
        scrollToPreviousElement: true,
        scrollToPreviousElementAnimate: true,
        useBootstrap: true,
        offsetTop: 40,
        offsetBottom: 40,
        bootstrapClasses: {
            container: 'container',
            containerFluid: 'container-fluid',
            row: 'row'
        },
        onContentReady: function(){

        },
        onOpenBefore: function(){

        },
        onOpen: function(){

        },
        onClose: function(){

        },
        onDestroy: function(){

        },
        onAction: function(){

        }
    };

    /**
     * This refers to the issue #241 and #246
     *
     * Problem:
     * Button A is clicked (keydown) using the Keyboard ENTER key
     * A opens the jconfirm modal B,
     * B has registered ENTER key for one of its button C
     * A is released (keyup), B gets the keyup event and triggers C.
     *
     * Solution:
     * Register a global keydown event, that tells jconfirm if the keydown originated inside jconfirm
     */
    var keyDown = false;
    $(window).on('keydown', function(e){
        if(!keyDown){
            var $target = $(e.target);
            var pass = false;
            if($target.closest('.jconfirm-box').length)
                pass = true;
            if(pass)
                $(window).trigger('jcKeyDown');

            keyDown = true;
        }
    });
    $(window).on('keyup', function(){
        keyDown = false;
    });
    jconfirm.lastClicked = false;
    $(document).on('mousedown', 'button, a', function(){
        jconfirm.lastClicked = $(this);
    });
}));
