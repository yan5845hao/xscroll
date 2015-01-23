define(function(require, exports, module) {

	var Util = require('../util');
	var Animate = require('../animate');
	//最短滚动条高度
	var MIN_SCROLLBAR_SIZE = 60;
	//滚动条被卷去剩下的最小高度
	var BAR_MIN_SIZE = 8;
	//transform
	var transform = Util.prefixStyle("transform");

	var transformStr = Util.vendor ? ["-", Util.vendor, "-transform"].join("") : "transform";
	//transition webkitTransition MozTransition OTransition msTtransition
	var transition = Util.prefixStyle("transition");

	var borderRadius = Util.prefixStyle("borderRadius");

	var transitionDuration = Util.prefixStyle("transitionDuration");

	var ScrollBar = function(cfg) {
		this.userConfig = cfg;
		this.init(cfg.xscroll);
	}

	Util.mix(ScrollBar.prototype, {
		init: function(xscroll) {
			var self = this;
			self.xscroll = xscroll;
			self.type = self.userConfig.type;
			self.isY = self.type == "y" ? true : false;
			self.scrollTopOrLeft = self.isY ? "scrollTop" : "scrollLeft";
			var boundry = self.xscroll.boundry;
			self.containerSize = self.isY ? self.xscroll.containerHeight + boundry._xtop + boundry._xbottom : self.xscroll.containerWidth + boundry._xright + boundry._xleft;
			self.indicateSize = self.isY ? self.xscroll.height : self.xscroll.width;
			self.pos = self.isY ? xscroll.getScrollTop() : xscroll.getScrollLeft();
			self.render();
			self._bindEvt();
		},
		destroy: function() {
			var self = this;
			self.scrollbar && self.scrollbar.remove();
			self.xscroll.off("scaleanimate", self._update, self);
			self.xscroll.off("scrollend", self._update, self);
			self.xscroll.off("scrollanimate", self._update, self);
			!self.xscroll.userConfig.useTransition && self.xscroll.off("scroll", self._update, self);
			delete self;
		},
		render: function() {
			var self = this;
			if (self.__isRender) return;
			self.__isRender = true;
			var xscroll = self.xscroll;
			var translateZ = xscroll.userConfig.gpuAcceleration ? " translateZ(0) " : "";
			var transform = translateZ ? transformStr + ":" + translateZ + ";" : "";
			var commonCss = "opacity:0;position:absolute;z-index:999;overflow:hidden;-webkit-border-radius:2px;-moz-border-radius:2px;-o-border-radius:2px;"+ transform;
			var css = self.isY ? 
				"width: 2px;bottom:5px;top:5px;right:2px;" + commonCss :
				"height:2px;left:5px;right:5px;bottom:2px;" + commonCss;
			self.scrollbar = document.createElement("div");
			self.scrollbar.style.cssText = css;
			xscroll.renderTo.appendChild(self.scrollbar);
			var size = self.isY ? "width:100%;" : "height:100%;";
			self.indicate = document.createElement("div");
			self.indicate.style.cssText = size + "position:absolute;background:rgba(0,0,0,0.3);-webkit-border-radius:2px;-moz-border-radius:2px;-o-border-radius:2px;"
			self.scrollbar.appendChild(self.indicate);
			self._update();
			self.hide();
		},
		_update: function(pos, duration, easing) {
			var self = this;
			var pos =undefined === pos ? (self.isY ? self.xscroll.getScrollTop() : self.xscroll.getScrollLeft()) : pos;
			var barInfo = self.computeScrollBar(pos);
			var size = self.isY ? "height" : "width";
			self.indicate.style[size] = Math.round(barInfo.size) + "px";
			if (duration && easing) {
				self.scrollTo(barInfo.pos, duration, easing);
			} else {
				self.moveTo(barInfo.pos);
			}
		},
		//计算边界碰撞时的弹性
		computeScrollBar: function(pos) {
			var self = this;
			var type = self.isY ? "y" : "x";
			var pos = Math.round(pos);
			var spacing = 10;
			var boundry = self.xscroll.boundry;
			self.containerSize = self.isY ? self.xscroll.containerHeight + boundry._xtop + boundry._xbottom : self.xscroll.containerWidth + boundry._xright + boundry._xleft;
			//视区尺寸
			self.size = self.isY ? self.xscroll.height : self.xscroll.width;
			self.indicateSize = self.isY ? self.xscroll.height - spacing : self.xscroll.width - spacing;
			//滚动条容器高度
			var indicateSize = self.indicateSize;
			var containerSize = self.containerSize;
			//pos bottom/right
			var posout = containerSize - self.size;
			var ratio = pos / containerSize;
			var barpos = indicateSize * ratio;
			var barSize = Math.round(indicateSize * self.size / containerSize);
			var _barpos = barpos * (indicateSize - MIN_SCROLLBAR_SIZE + barSize) / indicateSize;
			if (barSize < MIN_SCROLLBAR_SIZE) {
				barSize = MIN_SCROLLBAR_SIZE;
				barpos = _barpos;
			}
			if (barpos < 0) {
				barpos = Math.abs(pos) * barSize / MIN_SCROLLBAR_SIZE > barSize - BAR_MIN_SIZE ? BAR_MIN_SIZE - barSize : pos * barSize / MIN_SCROLLBAR_SIZE;
			} else if (barpos + barSize > indicateSize && pos - posout > 0) {
				var _pos = pos - containerSize + indicateSize + spacing;
				if (_pos * barSize / MIN_SCROLLBAR_SIZE > barSize - BAR_MIN_SIZE) {
					barpos = indicateSize + spacing - BAR_MIN_SIZE;
				} else {
					barpos = indicateSize + spacing - barSize + _pos * barSize / MIN_SCROLLBAR_SIZE;
				}
			}
			self.barpos = Math.round(barpos);
			return result = {
				size: Math.round(barSize),
				pos:self.barpos
			};
		},

		scrollTo: function(pos, duration, easing) {
			var self = this;
			var translateZ = self.xscroll.userConfig.gpuAcceleration ? " translateZ(0) " : "";
			var config = {
				css: {
					transform: self.isY ? "translateY(" + pos + "px)" : "translateX(" + pos + "px)"
				},
				duration: duration,
				easing: easing,
				useTransition: self.xscroll.userConfig.useTransition
			};
			self.__timer = self.__timer || new Animate(self.indicate, config);
			//run
			self.__timer.stop();
			self.__timer.reset(config);
			self.__timer.run();
		},
		moveTo: function(pos) {
			var self = this;
			self.show();
			var translateZ = self.xscroll.userConfig.gpuAcceleration ? " translateZ(0) " : "";
			self.isY ? self.indicate.style[transform] = "translateY(" + pos + "px) " + translateZ : self.indicate.style[transform] = "translateX(" + pos + "px) " + translateZ
			if (Util.isBadAndroid()) {
				self.indicate.style[transitionDuration] = "0.001s";
			} else {
				self.indicate.style[transition] = "";
			}
		},
		_bindEvt: function() {
			var self = this;
			if (self.__isEvtBind) return;
			self.__isEvtBind = true;
			var type = self.isY ? "y" : "x";
			var isBoundryOut = function(type) {
				return type == "x" ? (self.xscroll.getBoundryOutLeft() >= 0 || self.xscroll.getBoundryOutRight() >= 0) : (self.xscroll.getBoundryOutTop() >= 0 || self.xscroll.getBoundryOutBottom() >= 0);
			}
			if (self.xscroll.userConfig.useTransition) {
				self.xscroll.on("pan", function(e) {
					self._update(e[self.scrollTopOrLeft]);
				});
				self.xscroll.on("scrollanimate", function(e) {
					if (!e.zoomType || e.zoomType != type) return;
					self._update(e[self.scrollTopOrLeft], e.duration, e.easing);
				});
				// self.xscroll.on("scaleanimate",function(e){self._update(e.pos);})
			}else{
				self.xscroll.on("scroll", function(e) {
					self._update(e[self.scrollTopOrLeft]);
				});
			} 

			

			self.xscroll.on("panend", function(e) {
				if (Math.abs(e.velocity == 0) && !isBoundryOut(type)) {
					self.hide();
				}
			});
			self.xscroll.on("scrollend", function(e) {
				if (!isBoundryOut()) {
					self._update(e[self.scrollTopOrLeft]);
					self.hide();
				}
			});
		},
		reset: function() {
			var self = this;
			self.pos = 0;
			self._update();
		},
		hide: function() {
			var self = this;
			self.scrollbar.style.opacity = 0;
			self.scrollbar.style[transition] = "opacity 0.3s ease-out .5s";
		},
		show: function() {
			var self = this;
			self.scrollbar.style.opacity = 1;
			if (Util.isBadAndroid()) {
				self.scrollbar.style[transitionDuration] = "0.001s";
			} else {
				self.scrollbar.style[transition] = "";
			}
		}
	});

	if (typeof module == 'object' && module.exports) {
		module.exports = ScrollBar;
	} else {
		return ScrollBar;
	}

});