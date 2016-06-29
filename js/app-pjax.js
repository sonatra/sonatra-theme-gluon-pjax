/*
 * This file is part of the Sonatra package.
 *
 * (c) François Pluchino <francois.pluchino@sonatra.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/*global define*/
/*global navigator*/
/*global window*/
/*global jQuery*/

/**
 * @param {jQuery} $
 *
 * @typedef {object}           define.amd
 * @typedef {object|undefined} window.pjaxMainScripts
 *
 * @author François Pluchino <francois.pluchino@sonatra.com>
 */
(function (factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'jquery-pjax'], factory);
    } else {
        // Browser globals
        factory(jQuery);
    }
}(function ($) {
    'use strict';

    /**
     * Trigger the event.
     *
     * @param {String}  type   The event type
     * @param {AppPjax} self   The app pjax instance
     * @param {*}       [data] The data
     *
     * @private
     */
    function triggerEvent(type, self, data) {
        $.event.trigger({
            type: 'apppjax:' + type + '.st.apppjax',
            sidebar: self,
            eventData: data,
            time: new Date()
        });
    }

    /**
     * Get the width of native scrollbar.
     *
     * @returns {Number}
     */
    function getNativeScrollWidth() {
        var sbDiv = document.createElement("div"),
            size;
        sbDiv.style.width = '100px';
        sbDiv.style.height = '100px';
        sbDiv.style.overflow = 'scroll';
        sbDiv.style.position = 'absolute';
        sbDiv.style.top = '-9999px';
        document.body.appendChild(sbDiv);
        size = sbDiv.offsetWidth - sbDiv.clientWidth;
        document.body.removeChild(sbDiv);

        return size;
    }

    /**
     * Lock the scroll of body.
     *
     * @param {AppPjax} self The app pjax instance
     *
     * @private
     */
    function lockBodyScroll(self) {
        var bodyPad = parseInt((self.$body.css('padding-right') || 0), 10),
            hasScrollbar = self.$body.get(0).scrollHeight > document.documentElement.clientHeight
                && 'hidden' !== self.$body.css('overflow-y');

        if (hasScrollbar) {
            self.originalBodyPad = document.body.style.paddingRight || '';
            self.originalBodyOverflowY = document.body.style.overflowY || '';

            self.$body.css({
                'padding-right': (bodyPad + self.nativeScrollWidth) + 'px',
                'overflow-y': 'hidden'
            });

            triggerEvent('lock-body-scroll', self, self.nativeScrollWidth);
        }
    }

    /**
     * Unlock the scroll of body.
     *
     * @param {AppPjax} self The app pjax instance
     *
     * @private
     */
    function unlockBodyScroll(self) {
        if (null !== self.originalBodyPad || null !== self.originalBodyOverflowY) {
            self.$body.css({
                'padding-right': self.originalBodyPad,
                'overflow-y': self.originalBodyOverflowY
            });

            self.originalBodyPad = null;
            self.originalBodyOverflowY = null;
            triggerEvent('unlock-body-scroll', self, self.nativeScrollWidth);
        }
    }

    /**
     * Unregister the plugins.
     *
     * @param {AppPjax} self The app pjax instance
     *
     * @private
     */
    function unregisterPlugins(self) {
        var destroyers = $.fn.appPjax.Constructor.API_DESTROYERS,
            size = destroyers.length,
            sizeR = self.unregisters.length,
            i,
            j;

        if (!self.canUnregister) {
            return;
        }

        for (i = 0; i < size; ++i) {
            destroyers[i](self.$container);
        }

        for (j = 0; j < sizeR; ++j) {
            self.unregisters[j](self.$container);
        }
        self.unregisters.splice(0, sizeR);
        self.canUnregister = false;
    }

    /**
     * Action on click to link.
     *
     * @param {jQuery.Event|Event} event   The jquery event
     * @param {Object}             options The pjax options
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onClickAction(event, options) {
        var $target = $(event.target);

        if (undefined !== $target.attr('data-pjax-replace')) {
            options.replace = true;
        }

        if (undefined !== $target.attr('data-pjax-push')) {
            options.push = 'false' !== $target.attr('data-pjax-push');
        }
    }

    /**
     * Action on click to reload page.
     *
     * @param {jQuery.Event|Event} event
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onRefreshAction(event) {
        $.pjax.reload(event.data.options.containerSelector, event.data.options.pjaxOptions);
    }

    /**
     * Action on submit form.
     *
     * @param {jQuery.Event|Event} event
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onSubmitAction(event) {
        var options = {},
            $target = $(event.target);

        if (undefined !== $target.attr('data-pjax-replace')) {
            options.replace = true;
        }

        if (undefined !== $target.attr('data-pjax-push')) {
            options.push = 'false' !== $target.attr('data-pjax-push');
        }

        $.pjax.submit(event, event.data.options.containerSelector, options);
    }

    /**
     * Action on pjax popstate event.
     *
     * @param {jQuery.Event|Event} event
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onPopStateAction(event) {
        unregisterPlugins(event.data);
    }

    /**
     * Action on pjax before send event.
     *
     * @param {jQuery.Event|Event} event
     * @param {XMLHttpRequest}     xhr
     * @param {Object}             options
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onBeforeSendAction(event, xhr, options) {
        var self = event.data;

        if (null !== self.delayOptions) {
            self.delayRequest = false;
            self.delayOptions = null;
        }

        if (!self.$container.hasClass('content-before-show')) {
            self.$spinner.removeClass('preloader-container-open');
            self.$container.addClass('content-before-show');
            self.$container.before(self.$spinner);

            window.setTimeout(function () {
                lockBodyScroll(self);
                self.$spinner.addClass('preloader-container-open');
            }, 1);
        }

        if (self.delayRequest) {
            self.delayOptions = options;
            xhr.abort();

            return;
        }

        unregisterPlugins(self);
    }

    /**
     * Action on pjax complete event.
     *
     * @param {jQuery.Event|Event} event
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onCompleteAction(event) {
        var self = event.data;

        self.$container.scrollTop(0);
        self.$spinner.remove();
        self.$container.removeClass('content-before-show');
        unlockBodyScroll(self);
    }

    /**
     * Action on pjax error event.
     *
     * @param {jQuery.Event|Event} event
     * @param {Object}             xhr
     * @param {String}             textStatus
     * @param {Object}             errorThrown
     * @param {Object}             options
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @return {Boolean}
     *
     * @private
     */
    function onErrorAction(event, xhr, textStatus, errorThrown, options) {
        var self = event.data,
            message = xhr.responseText,
            lang;

        if ('abort' === errorThrown) {
            return false;
        }

        if (xhr.status === 0) {
            lang = self.langData();
            message = self.options.errorTemplate;
            message = message.replace('%icon%', 'cloud');
            message = message.replace('%message%', lang.error_message);
            message = message.replace('%reload%', lang.reload);
        }

        options.success(message, textStatus, xhr);

        return false;
    }

    /**
     * Action on pjax end event.
     *
     * @param {jQuery.Event|Event} event
     *
     * @typedef {AppPjax} Event.data The app pjax instance
     *
     * @private
     */
    function onEndAction(event) {
        var self = event.data,
            registers = $.fn.appPjax.Constructor.API_REGISTERS,
            size = registers.length,
            i;

        self.executeMainScripts();

        for (i = 0; i < size; ++i) {
            registers[i](self.$container);
        }

        self.canUnregister = true;
    }

    // APP PJAX CLASS DEFINITION
    // =========================

    /**
     * @constructor
     *
     * @param {string|elements|object|jQuery} element
     * @param {object}                        options
     *
     * @this AppPjax
     */
    var AppPjax = function (element, options) {
        this.guid           = $.guid;
        this.canUnregister  = true;
        this.options        = $.extend(true, {}, AppPjax.DEFAULTS, options);
        this.delayRequest   = false;
        this.delayOptions   = null;
        this.unregisters    = [];
        this.$element       = $(element);
        this.$body          = $('body');
        this.$container     = $(this.options.containerSelector);
        this.$spinner       = $(
            '<div class="preloader-container">' +
                '<div class="' + this.$container.attr('class') + '">' +
                    '<div class="container-fluid">' +
                        this.options.spinnerTemplate +
                    '</div>' +
                '</div>' +
            '</div>'
        );
        this.nativeScrollWidth     = getNativeScrollWidth();
        this.originalBodyPad       = null;
        this.originalBodyOverflowY = null;

        if (0 === $(this.options.containerSelector).length) {
            return;
        }

        this.$element.pjax(this.options.linkSelector, this.options.containerSelector, this.options.pjaxOptions);
        this.$element
            .on('click.st.apppjax' + this.guid, '#btn-error-reload', this, onRefreshAction)
            .on('submit.st.apppjax' + this.guid, 'form[data-pjax]', this, onSubmitAction)
            .on('pjax:click.st.apppjax' + this.guid, null, this, onClickAction)
            .on('pjax:popstate.st.apppjax' + this.guid, null, this, onPopStateAction)
            .on('pjax:beforeSend.st.apppjax' + this.guid, null, this, onBeforeSendAction)
            .on('pjax:complete.st.apppjax' + this.guid, null, this, onCompleteAction)
            .on('pjax:error.st.apppjax' + this.guid, null, this, onErrorAction)
            .on('pjax:end.st.apppjax' + this.guid, null, this, onEndAction);

        var $metaLanguage = $('head > meta[http-equiv="Content-Language"]');

        if (this.options.locale === null && $metaLanguage.length === 1) {
            this.options.locale = $metaLanguage.attr('content');
        }
    },
        old;

    /**
     * Defaults options.
     *
     * @type {Object}
     */
    AppPjax.DEFAULTS = {
        locale: null,
        linkSelector: 'a:not([data-force-load])',
        containerSelector: '#pjax-container',
        pjaxOptions: {
            timeout: 60000
        },
        spinnerTemplate: '<div class="spinner-wrapper"><svg class="spinner spinner-accent"><circle class="spinner-path" cx="22" cy="22" r="20" /></svg></div>',
        errorTemplate: '<div class="container-fluid"><div class="row"><div class="col-md-6 col-md-offset-3"><div class="message-wrapper error-wrapper"><h1><span class="mdi mdi-%icon%"></span></h1><h2>%message%</h2><button class="btn btn-accent btn-ripple" id="btn-error-reload">%reload%</button></div></div></div></div>'
    };

    /**
     * Defaults languages.
     *
     * @type {Object}
     */
    AppPjax.LANGUAGES = {
        en: {
            reload: 'Reload',
            error_message: 'Cannot establish connection to the server'
        }
    };

    /**
     * List of function to register plugins initialized by the data attribute API.
     *
     * @type {Array}
     */
    AppPjax.API_REGISTERS = [];

    /**
     * List of function to destroy the plugins initialized by the data attribute API.
     *
     * @type {Array}
     */
    AppPjax.API_DESTROYERS = [];

    /**
     * Get the language configuration.
     *
     * @param {string} [locale] The ISO code of language
     *
     * @returns {object} The language configuration
     *
     * @this AppPjax
     */
    AppPjax.prototype.langData = function (locale) {
        if (undefined === locale) {
            locale = this.options.locale;
        }

        locale = locale.toLowerCase().replace('-', '_');

        if (locale.indexOf('_') >= 0 && undefined === AppPjax.LANGUAGES[locale]) {
            locale = locale.substr(0, locale.indexOf('_'));
        }

        if (undefined === AppPjax.LANGUAGES[locale]) {
            locale = 'en';
        }

        return AppPjax.LANGUAGES[locale];
    };

    /**
     * Add unregister function.
     *
     * A unregister function is an destroyer function but it's executed only one time
     * on the before replace content event of pjax.
     *
     * @callback unregisterCallback
     *
     * @param {unregisterCallback} unregister The function for unregister pjax component.
     *
     * @this AppPjax
     */
    AppPjax.prototype.addUnregister = function (unregister) {
        this.unregisters.push(unregister);
    };

    /**
     * Register the global unregisters defined before the init of this plugin.
     *
     * @this AppPjax
     */
    AppPjax.prototype.executeMainScripts = function () {
        var u;

        if (typeof window.pjaxMainScripts === 'object') {
            for (u = 0; u < window.pjaxMainScripts.length; ++u) {
                window.pjaxMainScripts[u]();
            }

            delete window.pjaxMainScripts;
        }
    };

    /**
     * Delay the request.
     *
     * @param {boolean} delay Check if the request must be delayed
     *
     * @this AppPjax
     */
    AppPjax.prototype.setDelayRequest = function (delay) {
        this.delayRequest = typeof(delay) === "boolean" ? delay : false;
    };

    /**
     * Send the delayed request.
     *
     * @this AppPjax
     */
    AppPjax.prototype.sendDelayedRequest = function () {
        var options;

        if (null !== this.delayOptions) {
            options = this.delayOptions;
            this.delayRequest = false;
            this.delayOptions = null;
            $.pjax(options);
        }
    };

    /**
     * Destroy instance.
     *
     * @this AppPjax
     */
    AppPjax.prototype.destroy = function () {
        this.$element
            .off('click.st.apppjax' + this.guid, '#btn-error-reload', onRefreshAction)
            .off('submit.st.apppjax' + this.guid, 'form[data-pjax]', onSubmitAction)
            .off('pjax:click.st.apppjax' + this.guid, onClickAction)
            .off('pjax:popstate.st.apppjax' + this.guid, onPopStateAction)
            .off('pjax:beforeSend.st.apppjax' + this.guid, onBeforeSendAction)
            .off('pjax:complete.st.apppjax' + this.guid, onCompleteAction)
            .off('pjax:error.st.apppjax' + this.guid, onErrorAction)
            .off('pjax:end.st.apppjax' + this.guid, onEndAction)
            .removeData('st.apppjax');

        delete this.$element;
        delete this.$body;
        delete this.$container;
        delete this.$spinner;
        delete this.delayRequest;
        delete this.delayOptions;
        delete this.options;
        delete this.guid;
        delete this.canUnregister;
        delete this.nativeScrollWidth;
        delete this.originalBodyPad;
        delete this.originalBodyOverflowY;
    };


    // APP PJAX PLUGIN DEFINITION
    // ==========================

    function Plugin(option, value) {
        return this.each(function () {
            var $this   = $(this),
                data    = $this.data('st.apppjax'),
                options = typeof option === 'object' && option;

            if (!data && option === 'destroy') {
                return;
            }

            if (!data) {
                data = new AppPjax(this, options);
                $this.data('st.apppjax', data);
            }

            if (typeof option === 'string') {
                data[option](value);
            }
        });
    }

    old = $.fn.appPjax;

    $.fn.appPjax             = Plugin;
    $.fn.appPjax.Constructor = AppPjax;


    // APP PJAX NO CONFLICT
    // ====================

    $.fn.appPjax.noConflict = function () {
        $.fn.appPjax = old;

        return this;
    };
}));
