/* Riot v2.2.4, @license MIT, (c) 2015 Muut Inc. + contributors */

/**
 * @warning: @liang
 * This file has been modified to disable AMD support on 16 March 2016.
 * (Please see the loading section at the bottom of this file)
 *
 * This matter should be discussed in the near future for a better fix.
 *
 */

;(function(window, undefined) {
    'use strict';
    var riot = { version: 'v2.2.4', settings: {} },
    //// be aware, internal usage

    // counter to give a unique id to all the Tag instances
        __uid = 0,

    // riot specific prefixes
        RIOT_PREFIX = 'riot-',
        RIOT_TAG = RIOT_PREFIX + 'tag',

    // for typeof == '' comparisons
        T_STRING = 'string',
        T_OBJECT = 'object',
        T_UNDEF  = 'undefined',
        T_FUNCTION = 'function',
    // special native tags that cannot be treated like the others
        SPECIAL_TAGS_REGEX = /^(?:opt(ion|group)|tbody|col|t[rhd])$/,
        RESERVED_WORDS_BLACKLIST = ['_item', '_id', 'update', 'root', 'mount', 'unmount', 'mixin', 'isMounted', 'isLoop', 'tags', 'parent', 'opts', 'trigger', 'on', 'off', 'one'],

    // version# for IE 8-11, 0 for others
        IE_VERSION = (window && window.document || {}).documentMode | 0,

    // Array.isArray for IE8 is in the polyfills
        isArray = Array.isArray

    riot.observable = function(el) {

        el = el || {}

        var callbacks = {},
            _id = 0

        el.on = function(events, fn) {
            if (isFunction(fn)) {
                if (typeof fn.id === T_UNDEF) fn._id = _id++

                events.replace(/\S+/g, function(name, pos) {
                    (callbacks[name] = callbacks[name] || []).push(fn)
                    fn.typed = pos > 0
                })
            }
            return el
        }

        el.off = function(events, fn) {
            if (events == '*') callbacks = {}
            else {
                events.replace(/\S+/g, function(name) {
                    if (fn) {
                        var arr = callbacks[name]
                        for (var i = 0, cb; (cb = arr && arr[i]); ++i) {
                            if (cb._id == fn._id) arr.splice(i--, 1)
                        }
                    } else {
                        callbacks[name] = []
                    }
                })
            }
            return el
        }

        // only single event supported
        el.one = function(name, fn) {
            function on() {
                el.off(name, on)
                fn.apply(el, arguments)
            }
            return el.on(name, on)
        }

        el.trigger = function(name) {
            var args = [].slice.call(arguments, 1),
                fns = callbacks[name] || []

            for (var i = 0, fn; (fn = fns[i]); ++i) {
                if (!fn.busy) {
                    fn.busy = 1
                    fn.apply(el, fn.typed ? [name].concat(args) : args)
                    if (fns[i] !== fn) { i-- }
                    fn.busy = 0
                }
            }

            if (callbacks.all && name != 'all') {
                el.trigger.apply(el, ['all', name].concat(args))
            }

            return el
        }

        return el

    }
    riot.mixin = (function() {
        var mixins = {}

        return function(name, mixin) {
            if (!mixin) return mixins[name]
            mixins[name] = mixin
        }

    })()

    ;(function(riot, evt, win) {

        // browsers only
        if (!win) return

        var loc = win.location,
            fns = riot.observable(),
            started = false,
            current

        function hash() {
            return loc.href.split('#')[1] || ''   // why not loc.hash.splice(1) ?
        }

        function parser(path) {
            return path.split('/')
        }

        function emit(path) {
            if (path.type) path = hash()

            if (path != current) {
                fns.trigger.apply(null, ['H'].concat(parser(path)))
                current = path
            }
        }

        var r = riot.route = function(arg) {
            // string
            if (arg[0]) {
                loc.hash = arg
                emit(arg)

                // function
            } else {
                fns.on('H', arg)
            }
        }

        r.exec = function(fn) {
            fn.apply(null, parser(hash()))
        }

        r.parser = function(fn) {
            parser = fn
        }

        r.stop = function () {
            if (started) {
                if (win.removeEventListener) win.removeEventListener(evt, emit, false) //@IE8 - the if()
                else win.detachEvent('on' + evt, emit) //@IE8
                fns.off('*')
                started = false
            }
        }

        r.start = function () {
            if (!started) {
                if (win.addEventListener) win.addEventListener(evt, emit, false) //@IE8 - the if()
                else win.attachEvent('on' + evt, emit) //IE8
                started = true
            }
        }

        // autostart the router
        r.start()

    })(riot, 'hashchange', window)
    /*

     //// How it works?


     Three ways:

     1. Expressions: tmpl('{ value }', data).
     Returns the result of evaluated expression as a raw object.

     2. Templates: tmpl('Hi { name } { surname }', data).
     Returns a string with evaluated expressions.

     3. Filters: tmpl('{ show: !done, highlight: active }', data).
     Returns a space separated list of trueish keys (mainly
     used for setting html classes), e.g. "show highlight".


     // Template examples

     tmpl('{ title || "Untitled" }', data)
     tmpl('Results are { results ? "ready" : "loading" }', data)
     tmpl('Today is { new Date() }', data)
     tmpl('{ message.length > 140 && "Message is too long" }', data)
     tmpl('This item got { Math.round(rating) } stars', data)
     tmpl('<h1>{ title }</h1>{ body }', data)


     // Falsy expressions in templates

     In templates (as opposed to single expressions) all falsy values
     except zero (undefined/null/false) will default to empty string:

     tmpl('{ undefined } - { false } - { null } - { 0 }', {})
     // will return: " - - - 0"

     */


    var brackets = (function(orig) {

        var cachedBrackets,
            r,
            b,
            re = /[{}]/g

        return function(x) {

            // make sure we use the current setting
            var s = riot.settings.brackets || orig

            // recreate cached vars if needed
            if (cachedBrackets !== s) {
                cachedBrackets = s
                b = s.split(' ')
                r = b.map(function (e) { return e.replace(/(?=.)/g, '\\') })
            }

            // if regexp given, rewrite it with current brackets (only if differ from default)
            return x instanceof RegExp ? (
                s === orig ? x :
                    new RegExp(x.source.replace(re, function(b) { return r[~~(b === '}')] }), x.global ? 'g' : '')
            ) :
                // else, get specific bracket
                b[x]
        }
    })('{ }')


    var tmpl = (function() {

        var cache = {},
            OGLOB = '"in d?d:' + (window ? 'window).' : 'global).'),
            reVars =
                /(['"\/])(?:[^\\]*?|\\.|.)*?\1|\.\w*|\w*:|\b(?:(?:new|typeof|in|instanceof) |(?:this|true|false|null|undefined)\b|function\s*\()|([A-Za-z_$]\w*)/g

        // build a template (or get it from cache), render with data
        return function(str, data) {
            return str && (cache[str] || (cache[str] = tmpl(str)))(data)
        }


        // create a template instance

        function tmpl(s, p) {

            if (s.indexOf(brackets(0)) < 0) {
                // return raw text
                s = s.replace(/\n|\r\n?/g, '\n')
                return function () { return s }
            }

            // temporarily convert \{ and \} to a non-character
            s = s
                .replace(brackets(/\\{/g), '\uFFF0')
                .replace(brackets(/\\}/g), '\uFFF1')

            // split string to expression and non-expresion parts
            p = split(s, extract(s, brackets(/{/), brackets(/}/)))

            // is it a single expression or a template? i.e. {x} or <b>{x}</b>
            s = (p.length === 2 && !p[0]) ?

                // if expression, evaluate it
                expr(p[1]) :

                // if template, evaluate all expressions in it
            '[' + p.map(function(s, i) {

                // is it an expression or a string (every second part is an expression)
                return i % 2 ?

                    // evaluate the expressions
                    expr(s, true) :

                    // process string parts of the template:
                '"' + s

                    // preserve new lines
                    .replace(/\n|\r\n?/g, '\\n')

                    // escape quotes
                    .replace(/"/g, '\\"') +

                '"'

            }).join(',') + '].join("")'

            return new Function('d', 'return ' + s
                    // bring escaped { and } back
                    .replace(/\uFFF0/g, brackets(0))
                    .replace(/\uFFF1/g, brackets(1)) + ';')

        }


        // parse { ... } expression

        function expr(s, n) {
            s = s

                // convert new lines to spaces
                .replace(/\n|\r\n?/g, ' ')

                // trim whitespace, brackets, strip comments
                .replace(brackets(/^[{ ]+|[ }]+$|\/\*.+?\*\//g), '')

            // is it an object literal? i.e. { key : value }
            return /^\s*[\w- "']+ *:/.test(s) ?

                // if object literal, return trueish keys
                // e.g.: { show: isOpen(), done: item.done } -> "show done"
            '[' +

                // extract key:val pairs, ignoring any nested objects
            extract(s,

                // name part: name:, "name":, 'name':, name :
                /["' ]*[\w- ]+["' ]*:/,

                // expression part: everything upto a comma followed by a name (see above) or end of line
                /,(?=["' ]*[\w- ]+["' ]*:)|}|$/
            ).map(function(pair) {

                    // get key, val parts
                    return pair.replace(/^[ "']*(.+?)[ "']*: *(.+?),? *$/, function(_, k, v) {

                        // wrap all conditional parts to ignore errors
                        return v.replace(/[^&|=!><]+/g, wrap) + '?"' + k + '":"",'

                    })

                }).join('') +

            '].join(" ").trim()' :

                // if js expression, evaluate as javascript
                wrap(s, n)

        }


        // execute js w/o breaking on errors or undefined vars

        function wrap(s, nonull) {
            s = s.trim()
            return !s ? '' : '(function(v){try{v=' +

                // prefix vars (name => data.name)
            s.replace(reVars, function(s, _, v) { return v ? '(("' + v + OGLOB + v + ')' : s }) +

                // default to empty string for falsy values except zero
            '}catch(e){}return ' + (nonull === true ? '!v&&v!==0?"":v' : 'v') + '}).call(d)'
        }


        // split string by an array of substrings

        function split(str, substrings) {
            var parts = []
            substrings.map(function(sub, i) {

                // push matched expression and part before it
                i = str.indexOf(sub)
                parts.push(str.slice(0, i), sub)
                str = str.slice(i + sub.length)
            })
            if (str) parts.push(str)

            // push the remaining part
            return parts
        }


        // match strings between opening and closing regexp, skipping any inner/nested matches

        function extract(str, open, close) {

            var start,
                level = 0,
                matches = [],
                re = new RegExp('(' + open.source + ')|(' + close.source + ')', 'g')

            str.replace(re, function(_, open, close, pos) {

                // if outer inner bracket, mark position
                if (!level && open) start = pos

                // in(de)crease bracket level
                level += open ? 1 : -1

                // if outer closing bracket, grab the match
                if (!level && close != null) matches.push(str.slice(start, pos + close.length))

            })

            return matches
        }

    })()

    /*
     lib/browser/tag/mkdom.js

     Includes hacks needed for the Internet Explorer version 9 and bellow

     */
// http://kangax.github.io/compat-table/es5/#ie8
// http://codeplanet.io/dropping-ie8/

    var mkdom = (function (checkIE) {

        var rootEls = {
                'tr': 'tbody',
                'th': 'tr',
                'td': 'tr',
                'tbody': 'table',
                'col': 'colgroup'
            },
            GENERIC = 'div'

        checkIE = checkIE && checkIE < 10

        // creates any dom element in a div, table, or colgroup container
        function _mkdom(html) {

            var match = html && html.match(/^\s*<([-\w]+)/),
                tagName = match && match[1].toLowerCase(),
                rootTag = rootEls[tagName] || GENERIC,
                el = mkEl(rootTag)

            el.stub = true

            if (checkIE && tagName && (match = tagName.match(SPECIAL_TAGS_REGEX)))
                ie9elem(el, html, tagName, !!match[1])
            else
                el.innerHTML = html

            return el
        }

        // creates tr, th, td, option, optgroup element for IE8-9
        /* istanbul ignore next */
        function ie9elem(el, html, tagName, select) {

            var div = mkEl(GENERIC),
                tag = select ? 'select>' : 'table>',
                child

            div.innerHTML = '<' + tag + html + '</' + tag

            child = div.getElementsByTagName(tagName)[0]
            if (child)
                el.appendChild(child)

        }
        // end ie9elem()

        return _mkdom

    })(IE_VERSION)

// { key, i in items} -> { key, i, items }
    function loopKeys(expr) {
        var b0 = brackets(0),
            els = expr.trim().slice(b0.length).match(/^\s*(\S+?)\s*(?:,\s*(\S+))?\s+in\s+(.+)$/)
        return els ? { key: els[1], pos: els[2], val: b0 + els[3] } : { val: expr }
    }

    function mkitem(expr, key, val) {
        var item = {}
        item[expr.key] = key
        if (expr.pos) item[expr.pos] = val
        return item
    }


    /* Beware: heavy stuff */
    function _each(dom, parent, expr) {

        remAttr(dom, 'each')

        var tagName = getTagName(dom),
            template = dom.outerHTML,
            hasImpl = !!tagImpl[tagName],
            impl = tagImpl[tagName] || {
                    tmpl: template
                },
            root = dom.parentNode,
            placeholder = document.createComment('riot placeholder'),
            tags = [],
            child = getTag(dom),
            checksum

        root.insertBefore(placeholder, dom)

        expr = loopKeys(expr)

        // clean template code
        parent
            .one('premount', function () {
                if (root.stub) root = parent.root
                // remove the original DOM node
                dom.parentNode.removeChild(dom)
            })
            .on('update', function () {
                var items = tmpl(expr.val, parent)

                // object loop. any changes cause full redraw
                if (!isArray(items)) {

                    checksum = items ? JSON.stringify(items) : ''

                    items = !items ? [] :
                        Object.keys(items).map(function (key) {
                            return mkitem(expr, key, items[key])
                        })
                }

                var frag = document.createDocumentFragment(),
                    i = tags.length,
                    j = items.length

                // unmount leftover items
                while (i > j) {
                    tags[--i].unmount()
                    tags.splice(i, 1)
                }

                for (i = 0; i < j; ++i) {
                    var _item = !checksum && !!expr.key ? mkitem(expr, items[i], i) : items[i]

                    if (!tags[i]) {
                        // mount new
                        tags[i] = new Tag(impl, {
                                parent: parent,
                                isLoop: true,
                                hasImpl: hasImpl,
                                root: SPECIAL_TAGS_REGEX.test(tagName) ? root : dom.cloneNode(),
                                item: _item
                            }, dom.innerHTML)
                        tags[i]._item = _item
                        tags[i].mount()

                        frag.appendChild(tags[i].root)
                    } else
                        tags[i].update(_item)

                    tags[i]._item = _item

                }

                root.insertBefore(frag, placeholder)

                if (child) parent.tags[tagName] = tags

            }).one('updated', function() {
                var keys = Object.keys(parent)// only set new values
                walk(root, function(node) {
                    // only set element node and not isLoop
                    if (node.nodeType == 1 && !node.isLoop && !node._looped) {
                        node._visited = false // reset _visited for loop node
                        node._looped = true // avoid set multiple each
                        setNamed(node, parent, keys)
                    }
                })
            })

    }


    function parseNamedElements(root, tag, childTags) {

        walk(root, function(dom) {
            if (dom.nodeType == 1) {
                dom.isLoop = dom.isLoop || (dom.parentNode && dom.parentNode.isLoop || dom.getAttribute('each')) ? 1 : 0

                // custom child tag
                var child = getTag(dom)

                if (child && !dom.isLoop) {
                    childTags.push(initChildTag(child, dom, tag))
                }

                if (!dom.isLoop)
                    setNamed(dom, tag, [])
            }

        })

    }

    function parseExpressions(root, tag, expressions) {

        function addExpr(dom, val, extra) {
            if (val.indexOf(brackets(0)) >= 0) {
                var expr = { dom: dom, expr: val }
                expressions.push(extend(expr, extra))
            }
        }

        walk(root, function(dom) {
            var type = dom.nodeType

            // text node
            if (type == 3 && dom.parentNode.tagName != 'STYLE') addExpr(dom, dom.nodeValue)
            if (type != 1) return

            /* element */

            // loop
            var attr = dom.getAttribute('each')

            if (attr) { _each(dom, tag, attr); return false }

            // attribute expressions
            each(dom.attributes, function(attr) {
                var name = attr.name,
                    bool = name.split('__')[1]

                addExpr(dom, attr.value, { attr: bool || name, bool: bool })
                if (bool) { remAttr(dom, name); return false }

            })

            // skip custom tags
            if (getTag(dom)) return false

        })

    }
    function Tag(impl, conf, innerHTML) {

        var self = riot.observable(this),
            opts = inherit(conf.opts) || {},
            dom = mkdom(impl.tmpl),
            parent = conf.parent,
            isLoop = conf.isLoop,
            hasImpl = conf.hasImpl,
            item = cleanUpData(conf.item),
            expressions = [],
            childTags = [],
            root = conf.root,
            fn = impl.fn,
            tagName = root.tagName.toLowerCase(),
            attr = {},
            propsInSyncWithParent = []

        if (fn && root._tag) {
            root._tag.unmount(true)
        }

        // not yet mounted
        this.isMounted = false
        root.isLoop = isLoop

        // keep a reference to the tag just created
        // so we will be able to mount this tag multiple times
        root._tag = this

        // create a unique id to this tag
        // it could be handy to use it also to improve the virtual dom rendering speed
        this._id = __uid++

        extend(this, { parent: parent, root: root, opts: opts, tags: {} }, item)

        // grab attributes
        each(root.attributes, function(el) {
            var val = el.value
            // remember attributes with expressions only
            if (brackets(/{.*}/).test(val)) attr[el.name] = val
        })

        if (dom.innerHTML && !/^(select|optgroup|table|tbody|tr|col(?:group)?)$/.test(tagName))
        // replace all the yield tags with the tag inner html
            dom.innerHTML = replaceYield(dom.innerHTML, innerHTML)

        // options
        function updateOpts() {
            var ctx = hasImpl && isLoop ? self : parent || self

            // update opts from current DOM attributes
            each(root.attributes, function(el) {
                opts[el.name] = tmpl(el.value, ctx)
            })
            // recover those with expressions
            each(Object.keys(attr), function(name) {
                opts[name] = tmpl(attr[name], ctx)
            })
        }

        function normalizeData(data) {
            for (var key in item) {
                if (typeof self[key] !== T_UNDEF)
                    self[key] = data[key]
            }
        }

        function inheritFromParent () {
            if (!self.parent || !isLoop) return
            each(Object.keys(self.parent), function(k) {
                // some properties must be always in sync with the parent tag
                var mustSync = !~RESERVED_WORDS_BLACKLIST.indexOf(k) && ~propsInSyncWithParent.indexOf(k)
                if (typeof self[k] === T_UNDEF || mustSync) {
                    // track the property to keep in sync
                    // so we can keep it updated
                    if (!mustSync) propsInSyncWithParent.push(k)
                    self[k] = self.parent[k]
                }
            })
        }

        this.update = function(data) {
            // make sure the data passed will not override
            // the component core methods
            data = cleanUpData(data)
            // inherit properties from the parent
            inheritFromParent()
            // normalize the tag properties in case an item object was initially passed
            if (data && typeof item === T_OBJECT) {
                normalizeData(data)
                item = data
            }
            extend(self, data)
            updateOpts()
            self.trigger('update', data)
            update(expressions, self)
            self.trigger('updated')
        }

        this.mixin = function() {
            each(arguments, function(mix) {
                mix = typeof mix === T_STRING ? riot.mixin(mix) : mix
                each(Object.keys(mix), function(key) {
                    // bind methods to self
                    if (key != 'init')
                        self[key] = isFunction(mix[key]) ? mix[key].bind(self) : mix[key]
                })
                // init method will be called automatically
                if (mix.init) mix.init.bind(self)()
            })
        }

        this.mount = function() {

            updateOpts()

            // initialiation
            if (fn) fn.call(self, opts)

            // parse layout after init. fn may calculate args for nested custom tags
            parseExpressions(dom, self, expressions)

            // mount the child tags
            toggle(true)

            // update the root adding custom attributes coming from the compiler
            // it fixes also #1087
            if (impl.attrs || hasImpl) {
                walkAttributes(impl.attrs, function (k, v) { root.setAttribute(k, v) })
                parseExpressions(self.root, self, expressions)
            }

            if (!self.parent || isLoop) self.update(item)

            // internal use only, fixes #403
            self.trigger('premount')

            if (isLoop && !hasImpl) {
                // update the root attribute for the looped elements
                self.root = root = dom.firstChild

            } else {
                while (dom.firstChild) root.appendChild(dom.firstChild)
                if (root.stub) self.root = root = parent.root
            }
            // if it's not a child tag we can trigger its mount event
            if (!self.parent || self.parent.isMounted) {
                self.isMounted = true
                self.trigger('mount')
            }
            // otherwise we need to wait that the parent event gets triggered
            else self.parent.one('mount', function() {
                // avoid to trigger the `mount` event for the tags
                // not visible included in an if statement
                if (!isInStub(self.root)) {
                    self.parent.isMounted = self.isMounted = true
                    self.trigger('mount')
                }
            })
        }


        this.unmount = function(keepRootTag) {
            var el = root,
                p = el.parentNode,
                ptag

            if (p) {

                if (parent) {
                    ptag = getImmediateCustomParentTag(parent)
                    // remove this tag from the parent tags object
                    // if there are multiple nested tags with same name..
                    // remove this element form the array
                    if (isArray(ptag.tags[tagName]))
                        each(ptag.tags[tagName], function(tag, i) {
                            if (tag._id == self._id)
                                ptag.tags[tagName].splice(i, 1)
                        })
                    else
                    // otherwise just delete the tag instance
                        ptag.tags[tagName] = undefined
                }

                else
                    while (el.firstChild) el.removeChild(el.firstChild)

                if (!keepRootTag)
                    p.removeChild(el)
                else
                // the riot-tag attribute isn't needed anymore, remove it
                    p.removeAttribute('riot-tag')
            }


            self.trigger('unmount')
            toggle()
            self.off('*')
            // somehow ie8 does not like `delete root._tag`
            root._tag = null

        }

        function toggle(isMount) {

            // mount/unmount children
            each(childTags, function(child) { child[isMount ? 'mount' : 'unmount']() })

            // listen/unlisten parent (events flow one way from parent to children)
            if (parent) {
                var evt = isMount ? 'on' : 'off'

                // the loop tags will be always in sync with the parent automatically
                if (isLoop)
                    parent[evt]('unmount', self.unmount)
                else
                    parent[evt]('update', self.update)[evt]('unmount', self.unmount)
            }
        }

        // named elements available for fn
        parseNamedElements(dom, this, childTags)


    }

    function setEventHandler(name, handler, dom, tag) {

        dom[name] = function(e) {

            var item = tag._item,
                ptag = tag.parent,
                el

            if (!item)
                while (ptag && !item) {
                    item = ptag._item
                    ptag = ptag.parent
                }

            // cross browser event fix
            e = e || window.event

            // ignore error on some browsers
            try {
                e.currentTarget = dom
                if (!e.target) e.target = e.srcElement
                if (!e.which) e.which = e.charCode || e.keyCode
            } catch (ignored) { /**/ }

            e.item = item

            // prevent default behaviour (by default)
            if (handler.call(tag, e) !== true && !/radio|check/.test(dom.type)) {
                if (e.preventDefault) e.preventDefault()
                e.returnValue = false
            }

            if (!e.preventUpdate) {
                el = item ? getImmediateCustomParentTag(ptag) : tag
                el.update()
            }

        }

    }

// used by if- attribute
    function insertTo(root, node, before) {
        if (root) {
            root.insertBefore(before, node)
            root.removeChild(node)
        }
    }

    function update(expressions, tag) {

        each(expressions, function(expr, i) {

            var dom = expr.dom,
                attrName = expr.attr,
                value = tmpl(expr.expr, tag),
                parent = expr.dom.parentNode

            if (expr.bool)
                value = value ? attrName : false
            else if (value == null)
                value = ''

            // leave out riot- prefixes from strings inside textarea
            // fix #815: any value -> string
            if (parent && parent.tagName == 'TEXTAREA') value = ('' + value).replace(/riot-/g, '')

            // no change
            if (expr.value === value) return
            expr.value = value

            // text node
            if (!attrName) {
                dom.nodeValue = '' + value    // #815 related
                return
            }

            // remove original attribute
            remAttr(dom, attrName)
            // event handler
            if (isFunction(value)) {
                setEventHandler(attrName, value, dom, tag)

                // if- conditional
            } else if (attrName == 'if') {
                var stub = expr.stub,
                    add = function() { insertTo(stub.parentNode, stub, dom) },
                    remove = function() { insertTo(dom.parentNode, dom, stub) }

                // add to DOM
                if (value) {
                    if (stub) {
                        add()
                        dom.inStub = false
                        // avoid to trigger the mount event if the tags is not visible yet
                        // maybe we can optimize this avoiding to mount the tag at all
                        if (!isInStub(dom)) {
                            walk(dom, function(el) {
                                if (el._tag && !el._tag.isMounted) el._tag.isMounted = !!el._tag.trigger('mount')
                            })
                        }
                    }
                    // remove from DOM
                } else {
                    stub = expr.stub = stub || document.createTextNode('')
                    // if the parentNode is defined we can easily replace the tag
                    if (dom.parentNode)
                        remove()
                    else
                    // otherwise we need to wait the updated event
                        (tag.parent || tag).one('updated', remove)

                    dom.inStub = true
                }
                // show / hide
            } else if (/^(show|hide)$/.test(attrName)) {
                if (attrName == 'hide') value = !value
                dom.style.display = value ? '' : 'none'

                // field value
            } else if (attrName == 'value') {
                dom.value = value

                // <img src="{ expr }">
            } else if (startsWith(attrName, RIOT_PREFIX) && attrName != RIOT_TAG) {
                if (value)
                    dom.setAttribute(attrName.slice(RIOT_PREFIX.length), value)

            } else {
                if (expr.bool) {
                    dom[attrName] = value
                    if (!value) return
                }

                if (typeof value !== T_OBJECT) dom.setAttribute(attrName, value)

            }

        })

    }
    function each(els, fn) {
        for (var i = 0, len = (els || []).length, el; i < len; i++) {
            el = els[i]
            // return false -> remove current item during loop
            if (el != null && fn(el, i) === false) i--
        }
        return els
    }

    function isFunction(v) {
        return typeof v === T_FUNCTION || false   // avoid IE problems
    }

    function remAttr(dom, name) {
        dom.removeAttribute(name)
    }

    function getTag(dom) {
        return dom.tagName && tagImpl[dom.getAttribute(RIOT_TAG) || dom.tagName.toLowerCase()]
    }

    function initChildTag(child, dom, parent) {
        var tag = new Tag(child, { root: dom, parent: parent }, dom.innerHTML),
            tagName = getTagName(dom),
            ptag = getImmediateCustomParentTag(parent),
            cachedTag

        // fix for the parent attribute in the looped elements
        tag.parent = ptag

        cachedTag = ptag.tags[tagName]

        // if there are multiple children tags having the same name
        if (cachedTag) {
            // if the parent tags property is not yet an array
            // create it adding the first cached tag
            if (!isArray(cachedTag))
                ptag.tags[tagName] = [cachedTag]
            // add the new nested tag to the array
            if (!~ptag.tags[tagName].indexOf(tag))
                ptag.tags[tagName].push(tag)
        } else {
            ptag.tags[tagName] = tag
        }

        // empty the child node once we got its template
        // to avoid that its children get compiled multiple times
        dom.innerHTML = ''

        return tag
    }

    function getImmediateCustomParentTag(tag) {
        var ptag = tag
        while (!getTag(ptag.root)) {
            if (!ptag.parent) break
            ptag = ptag.parent
        }
        return ptag
    }

    function getTagName(dom) {
        var child = getTag(dom),
            namedTag = dom.getAttribute('name'),
            tagName = namedTag && namedTag.indexOf(brackets(0)) < 0 ? namedTag : child ? child.name : dom.tagName.toLowerCase()

        return tagName
    }

    function extend(src) {
        var obj, args = arguments
        for (var i = 1; i < args.length; ++i) {
            if ((obj = args[i])) {
                for (var key in obj) {      // eslint-disable-line guard-for-in
                    src[key] = obj[key]
                }
            }
        }
        return src
    }

// with this function we avoid that the current Tag methods get overridden
    function cleanUpData(data) {
        if (!(data instanceof Tag) && !(data && typeof data.trigger == T_FUNCTION)) return data

        var o = {}
        for (var key in data) {
            if (!~RESERVED_WORDS_BLACKLIST.indexOf(key))
                o[key] = data[key]
        }
        return o
    }

    function walk(dom, fn) {
        if (dom) {
            if (fn(dom) === false) return
            else {
                dom = dom.firstChild

                while (dom) {
                    walk(dom, fn)
                    dom = dom.nextSibling
                }
            }
        }
    }

// minimize risk: only zero or one _space_ between attr & value
    function walkAttributes(html, fn) {
        var m,
            re = /([-\w]+) ?= ?(?:"([^"]*)|'([^']*)|({[^}]*}))/g

        while ((m = re.exec(html))) {
            fn(m[1].toLowerCase(), m[2] || m[3] || m[4])
        }
    }

    function isInStub(dom) {
        while (dom) {
            if (dom.inStub) return true
            dom = dom.parentNode
        }
        return false
    }

    function mkEl(name) {
        return document.createElement(name)
    }

    function replaceYield(tmpl, innerHTML) {
        return tmpl.replace(/<(yield)\/?>(<\/\1>)?/gi, innerHTML || '')
    }

    function $$(selector, ctx) {
        return (ctx || document).querySelectorAll(selector)
    }

    function $(selector, ctx) {
        return (ctx || document).querySelector(selector)
    }

    function inherit(parent) {
        function Child() {}
        Child.prototype = parent
        return new Child()
    }

    function setNamed(dom, parent, keys) {
        if (dom._visited) return
        var p,
            v = dom.getAttribute('id') || dom.getAttribute('name')

        if (v) {
            if (keys.indexOf(v) < 0) {
                p = parent[v]
                if (!p)
                    parent[v] = dom
                else if (isArray(p))
                    p.push(dom)
                else
                    parent[v] = [p, dom]
            }
            dom._visited = true
        }
    }

// faster String startsWith alternative
    function startsWith(src, str) {
        return src.slice(0, str.length) === str
    }

    /*
     Virtual dom is an array of custom tags on the document.
     Updates and unmounts propagate downwards from parent to children.
     */

    var virtualDom = [],
        tagImpl = {},
        styleNode

    function injectStyle(css) {

        if (riot.render) return // skip injection on the server

        if (!styleNode) {
            styleNode = mkEl('style')
            styleNode.setAttribute('type', 'text/css')
        }

        var head = document.head || document.getElementsByTagName('head')[0]

        if (styleNode.styleSheet)
            styleNode.styleSheet.cssText += css
        else
            styleNode.innerHTML += css

        if (!styleNode._rendered)
            if (styleNode.styleSheet) {
                document.body.appendChild(styleNode)
            } else {
                var rs = $('style[type=riot]')
                if (rs) {
                    rs.parentNode.insertBefore(styleNode, rs)
                    rs.parentNode.removeChild(rs)
                } else head.appendChild(styleNode)

            }

        styleNode._rendered = true

    }

    function mountTo(root, tagName, opts) {
        var tag = tagImpl[tagName],
        // cache the inner HTML to fix #855
            innerHTML = root._innerHTML = root._innerHTML || root.innerHTML

        // clear the inner html
        root.innerHTML = ''

        if (tag && root) tag = new Tag(tag, { root: root, opts: opts }, innerHTML)

        if (tag && tag.mount) {
            tag.mount()
            virtualDom.push(tag)
            return tag.on('unmount', function() {
                virtualDom.splice(virtualDom.indexOf(tag), 1)
            })
        }

    }

    riot.tag = function(name, html, css, attrs, fn) {
        if (isFunction(attrs)) {
            fn = attrs
            if (/^[\w\-]+\s?=/.test(css)) {
                attrs = css
                css = ''
            } else attrs = ''
        }
        if (css) {
            if (isFunction(css)) fn = css
            else injectStyle(css)
        }
        tagImpl[name] = { name: name, tmpl: html, attrs: attrs, fn: fn }
        return name
    }

    riot.mount = function(selector, tagName, opts) {

        var els,
            allTags,
            tags = []

        // helper functions

        function addRiotTags(arr) {
            var list = ''
            each(arr, function (e) {
                list += ', *[' + RIOT_TAG + '="' + e.trim() + '"]'
            })
            return list
        }

        function selectAllTags() {
            var keys = Object.keys(tagImpl)
            return keys + addRiotTags(keys)
        }

        function pushTags(root) {
            var last
            if (root.tagName) {
                if (tagName && (!(last = root.getAttribute(RIOT_TAG)) || last != tagName))
                    root.setAttribute(RIOT_TAG, tagName)

                var tag = mountTo(root,
                    tagName || root.getAttribute(RIOT_TAG) || root.tagName.toLowerCase(), opts)

                if (tag) tags.push(tag)
            }
            else if (root.length) {
                each(root, pushTags)   // assume nodeList
            }
        }

        // ----- mount code -----

        if (typeof tagName === T_OBJECT) {
            opts = tagName
            tagName = 0
        }

        // crawl the DOM to find the tag
        if (typeof selector === T_STRING) {
            if (selector === '*')
            // select all the tags registered
            // and also the tags found with the riot-tag attribute set
                selector = allTags = selectAllTags()
            else
            // or just the ones named like the selector
                selector += addRiotTags(selector.split(','))

            els = $$(selector)
        }
        else
        // probably you have passed already a tag or a NodeList
            els = selector

        // select all the registered and mount them inside their root elements
        if (tagName === '*') {
            // get all custom tags
            tagName = allTags || selectAllTags()
            // if the root els it's just a single tag
            if (els.tagName)
                els = $$(tagName, els)
            else {
                // select all the children for all the different root elements
                var nodeList = []
                each(els, function (_el) {
                    nodeList.push($$(tagName, _el))
                })
                els = nodeList
            }
            // get rid of the tagName
            tagName = 0
        }

        if (els.tagName)
            pushTags(els)
        else
            each(els, pushTags)

        return tags
    }

// update everything
    riot.update = function() {
        return each(virtualDom, function(tag) {
            tag.update()
        })
    }

// @deprecated
    riot.mountTo = riot.mount

    // share methods for other riot parts, e.g. compiler
    riot.util = { brackets: brackets, tmpl: tmpl }

    // support CommonJS, AMD & browser
    /* istanbul ignore next */
    if (typeof exports === T_OBJECT)
        module.exports = riot

    // @liang: disable define loading method to avoid errors on AMD env
    //else if (typeof define === 'function' && define.amd)
    //  define(function() { return (window.riot = riot) })

    else
        window.riot = riot

})(typeof window != 'undefined' ? window : void 0);
/*
 * Utils 函数
 */
var utils = {
    httpGet: function(url, params, callback, complete) {
        var xmlhttp = new XMLHttpRequest();
        var url = utils.concatParams(url, params);
        xmlhttp.open("GET", url, true);
        xmlhttp.send(null);
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4) {
                if (complete && typeof complete === 'function') {
                    complete();
                }
                if (xmlhttp.status === 200) {
                    var body = xmlhttp.responseText;
                    try {
                        if (typeof body === 'string') {
                            var data = JSON.parse(body);
                        }
                        else {
                            var data = body;
                        }
                    }
                    catch(e) {
                        alert('解析错误');
                    }
                    callback(data);
                }
            }
        }
    },

    httpPost: function(url, params, callback, complete) {
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/json");
        xmlhttp.send(params);
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4) { 
                if (complete && typeof complete === 'function') {
                    complete();
                }
                if (xmlhttp.status === 200) {
                    try {
                        var data = JSON.parse(xmlhttp.responseText)
                    }
                    catch(e) {
                        console.log('解析错误');
                    }
                    callback(data);
                }
                else {
                    console.log('网络错误');
                }
            } 
        };
    },

    jsonp: function (url, params, callback) {
        var now = Date.now();
        var script = document.createElement('script');
        var head = document.getElementsByTagName('head')[0];
        var url = utils.concatParams(url, params);
        if (!params.callback) {
            if (url.match(/\?/)) {
                var src = url + '&callback=jsonpCallback' + now;
            }
            else {
                var src = url + '?callback=jsonpCallback' + now;
            }
            var funcName = 'jsonpCallback' + now;
        }
        else {
            var src = url;
            var funcName = params.callback;
        }
        script.src = src;
        head.appendChild(script);
        window[funcName] = function(data) {
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                }
                catch(e) {}
            }
            callback(data);
        }
        script.onerror = function() {
            console.log('jsonp error');
        };
        script.onload = function() {
            head.removeChild(script);
        }
    },

    htmlEncode: function(value){
        var div = document.createElement('div');
        div.innerHTML = value; 
        return div.innerText;
    },

    concatParams: function(url, params) {
        if (url.match(/\?/)) {
            var str = '&'
        }
        else {
            var str = '?'
        }
        for(i in params) {
            str = str + i + '=' + params[i] + '&';
        }
        str = str.replace(/&$/, '');
        return url + str;
    },

    setCookie: function(key, value, expires, path) {
        var exp = new Date();
        var path = path || '/';
        exp.setTime(exp.getTime() + expires);
        document.cookie = key + "=" + escape (value) + ";path=" + path + ";expires=" + exp.toGMTString();
    },

    transBytes: function(bytes) {
        var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes == 0) return 'n/a';
        var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        if (i == 0) return bytes + sizes[i]; 
        return (bytes / Math.pow(1024, i)).toFixed(1) + sizes[i];
    },

    transTimes: function(timeStamp) {
        var timeStamp = parseInt(timeStamp, 10);
        var time = new Date(timeStamp * 1000)
        var now = new Date().getTime()/1000;
        var dv = now - timeStamp;
        if ( dv < 86400) {
            return time.getHours() + ':' + time.getMinutes();
        }
        else if ( dv > 86400 && dv < 172800) {
            return '昨天';
        }
        else if ( dv > 172800) {
            var Y = (time.getFullYear() + '-').substring(2);
            var M = (time.getMonth()+1 < 10 ? '0' + (time.getMonth()+1) : time.getMonth()+1) + '-';
            var D = time.getDate() < 10 ? '0' + time.getDate() : time.getDate();
            return Y + M + D;
        }
    },

    hasClass: function (obj, cls) {
        return obj.className.match(new RegExp('(\\s|^)' + cls + '(\\s|$)'));
    },

    addClass: function (obj, cls) {
        obj.className.trim();
        if (!this.hasClass(obj, cls)) obj.className += " " + cls;
    },

    removeClass: function (obj, cls) {
        if (utils.hasClass(obj, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            obj.className = obj.className.replace(reg, ' ');
        }
    },

    toggleClass: function(obj, cls) {
        if (utils.hasClass(obj, cls)) {
            var reg = new RegExp('(\\s|^)' + cls + '(\\s|$)');
            obj.className = obj.className.replace(reg, ' ');
        } 
        else {
            obj.className += " " + cls;
        }
    },

    insertAfter: function(newElement, targetElement){
        var parent = targetElement.parentNode;
        if (parent.lastChild == targetElement) {
            parent.appendChild(newElement);
        }
        else {
            parent.insertBefore(newElement, targetElement.nextSibling);
        }
    },

    insertAfterText: function(newElement, targetElement) {
        var parent = targetElement.parentNode;
        if (parent.lastChild == targetElement) {
            parent.appendChild(newElement);
        }
        else {
            var next = targetElement.nextSibling;
            if (next.nodeType === 3) {
                next = next.nextSibling;
            }
            parent.insertBefore(newElement, next);
        }
    },

    isType: function (type) {
        return function (obj) {
            return Object.prototype.toString.call(obj) === '[object ' + type + ']';
        }
    },

    makeArray: function () {
        return Array.prototype.concat(obj);
    },

    extend: function(src, obj) {
        for (var key in obj) {
            if (!src[key]) {
                src[key] = obj[key];
            }
        }
    },

    deepCopy: function (parent, child) {
        var toString = Object.prototype.toString;
        var defaultWrapper = (toString.call(parent) === '[object Array]') ? [] : {};
        var child = child || defaultWrapper;
        for (var i in parent) {
            if (toString.call(parent[i]) === '[object Object]') {
                child[i] = {}; //新建数组或者object来达到目的
                this.deepCopy(parent[i], child[i]);
            }
            else if (toString.call(parent[i]) === '[object Array]') {
                child[i] = []; //新建数组或者object来达到目的
                this.deepCopy(parent[i], child[i]);
            } 
            else {
                child[i] = parent[i];
            }
        }
        return child;
    }

};

utils.extend(utils, {
    isArray: utils.isType('Array'),
    isObject: utils.isType('Object'),
    isFunction: utils.isType('Function'),
    isElement: function (obj) {
        return Object.prototype.toString.call(obj).indexOf('Element') !== -1;
    },
});

utils.extend(utils, {
    jsLoader: (function () {
        var HEAD_NODE = document.head || document.getElementsByTagName('head')[0];
        var cache = {};
        var _cid = 0;
        var tasks = [];
        var isArray = utils.isArray;
        var isFunction = utils.isFunction;
        var makeArray = utils.makeArray;
        var DONE = 'done';
        var INPROCESS = 'inprocess';
        var REJECTED = 'rejected';
        var PENDING = 'pending';
        var processCache = {};

        /**
         * 产生客户端id
         * @return {Number} [description]
         */
        function cid() {
            return _cid++;
        }

        function isCSS(css) {
            return css.match(/\.css\??/);
        }

        /**
         * Script对象，储存需要加载的脚本的基本信息
         * @param {String} uri 地址
         */
        function Script(uri) {
            this.uri = uri;
            this.cid = cid();
            this.status = PENDING;
        }

        /**
         * 从缓存中获取需要的Script对象
         * @param  {String} uri [description]
         * @return {Object}     需要的Script对象
         */
        Script.get = function (uri) {
            // 如果不存在于缓存中，创建一个新的Script对象
            return cache[uri] || (cache[uri] = new Script(uri));
        };

        /**
         * 当加载完成或失败时调用的处理函数
         * @param  {Object} js Script对象
         * @return {[type]}    [description]
         */
        Script.resolve = function (js) {
            var self = this;
            self.status++;
            if (js && js.status === REJECTED) {
                var error = Error('Source: ' + js.uri + ' load failed');
                reject(error);
            }
            if (self.status === self.task.length) {
                setTimeout(function () {
                    self.callback && self.callback();
                    self = null;
                    resolve(tasks.shift());
                }, 7);
            }
        };

        /**
         * jsLoader
         * @param  {[type]}   js       function or string or array
         * @param  {Function} callback 加载完成后的回调
         * @return {Function}          
         */
        function jsLoader(js, callback) {
            jsLoader.then(js, callback).start();
            return jsLoader;
        }

        /**
         * then方法用于向任务列表增加任务
         * @param  {[type]}   js       function or string or array
         * @param  {Function} callback [description]
         * @return {Function}          [description]
         */
        jsLoader.then = function (js, callback) {
            if (!js) {
                return jsLoader;
            }
            if (!isArray(js)) {
                js = makeArray(js);
            }
            var resolver = {
                task: [],
                callback: callback,
                status: 0
            };
            for (var i = 0; i < js.length; i++) {
                resolver.task.push(getCache(js[i]));
            }
            tasks.push(resolver);
            // jsLoader.resolve();
            return jsLoader;
        };

        /**
         * [reject description]
         * @param  {Object} e Object Error
         * @return {[type]}   [description]
         */
        function reject(e) {
            throw e;
        }

        /**
         * 执行任务序列中的任务
         * @param  {Object} resolver [description]
         * @return {[type]}          [description]
         */
        function resolve(resolver) {
            if (!resolver) {
                if (!tasks.length) {
                    return;
                }
            }
            for (var i = 0; i < resolver.task.length; i++) {
                var js = resolver.task[i];
                request(js, resolver);
            }
        }

        /**
         * 开始
         * @return {[type]} [description]
         */
        jsLoader.start = function () {
            resolve(tasks.shift());
            return jsLoader;
        }

        function loadStyles(script, resolver) {
            var node = document.createElement('link');
            node.type = 'text/css';
            node.rel = 'stylesheet';
            node.href = script.uri;
            HEAD_NODE.appendChild(node);
            node = null;
            script.status = DONE;
            Script.resolve.call(resolver);
        }

        /**
         * [request description]
         * @param  {[type]} js       [description]
         * @param  {[type]} resolver [description]
         * @return {[type]}          [description]
         */
        function request(js, resolver) {
            if (isFunction(js.uri)) {
                try {
                    js.uri();
                    js.status = DONE;
                    Script.resolve.call(resolver);
                }
                catch (e) {
                    js.status = REJECTED;
                    Script.resolve.call(resolver);
                }
                return;
            }
            if (js.status === DONE) {
                Script.resolve.call(resolver);
                return;
            }
            if (isCSS(js.uri)) {
                loadStyles(js, resolver);
                return;
            }
            if (js.status === INPROCESS) {
                // 在loading过程中，标记遇到的resolver
                js.changeStatus = true;
                processCache[js.cid] = processCache[js.cid] || [];
                processCache[js.cid].push({js:js, resolver:resolver});
                return;
            }
            js.status = INPROCESS;
            var node = document.createElement('script');
            node.async = true;
            node.src = js.uri;
            node.onload = node.onerror = onloadResolve;
            HEAD_NODE.appendChild(node);

            function onloadResolve(evt) {
                if (evt.type === 'error') {
                    js.status = REJECTED;
                }
                if (evt.type === 'load') {
                    js.status = DONE;
                }
                Script.resolve.call(resolver, js);
                if (js.changeStatus) {
                    // 如果加载完成，处理处在waiting状态下的任务
                    js.changeStatus = false;
                    for (var i = 0; i < processCache[js.cid].length; i++) {
                        var tmp = processCache[js.cid][i];
                        Script.resolve.call(tmp.resolver, tmp.js);
                    }
                    processCache[js.cid] = null;
                }
                node.onload = node.onerror = null;
                HEAD_NODE.removeChild(node);
                node = null;
            }
        }

        /**
         * 获取可能存在别名的Script对象
         * @param  {String} uri [description]
         * @return {Object}     Script Object
         */
        function getCache(uri) {
            var src = getAlias(uri);
            return  src ? Script.get(src) : Script.get(uri);
        }

        /**
         * 获取真实地址
         * @param  {String} str [description]
         * @return {[type]}     [description]
         */
        function getAlias(str) {
            return jsLoader.alias[str];
        }

        jsLoader.alias = {};

        return jsLoader;

    })()
});

/*
 * 全局事件监控
 */
var EventCtrl = EC = riot.observable();
var iToolkit = itk = riot;
riot.tag('itk-calendar', '<div class="itk-calendar-wrapper"> <div class="itk-calendar-head">   <div class="itk-calendar-year" onclick="{ openYearList }">{ year.text } <span class="itk-calendar-select-icon"></span></div> <div class="itk-calendar-month"><span class="itk-calendar-month-left" onclick="{ prevMonth }"></span>{ month.text }<span class="itk-calendar-month-right" onclick="{ nextMonth }"></span></div>   </div> <div class="itk-calendar-body"> <div class="itk-calendar-weeks"> <div class="itk-calendar-week" each="{ text in weekArr }">{ text }</div> </div> <div class="itk-calendar-days"> <div each="{ dayArr }" class="itk-calendar-day { overflow: overflow } { selected: parent.showSelected && parent.selectedYear === year && parent.selectedMonth === month && parent.selectedDay === day } { today: parent.showToday && parent.toYear === year && parent.toMonth === month && parent.today === day } { defuse: !year && !month }" data-year="{ year }" data-month="{ month }" data-day="{ day }" onclick="{ (year && month) ? dayClicked : \'return false;\' }" >{ day }</div> </div> </div> <div class="itk-calendar-years" show="{ openList }"> <div class="itk-calendar-year-item { selected: parent.year.text === i }" each="{ i in yearList }" onclick="{ clickYear }">{ i }</div> </div> </div>', 'hide="{ !open }"', function(opts) {



    var self = this;

    self.i18n = {
        zh_cn: {
            weekArr: ['一','二','三','四','五','六', '日'],
            monthArr: ['一月','二月','三月','四月','五月','六月','七月','八月','九月','十月','十一月','十二月']
        },
        en_us: {
            weekArr: ['Mo','Tu','We','Th','Fr','Sa','Su'],
            monthArr: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        }
    };



    var el = self.root;

    var classList = [
        'itk-calendar-label',
        'itk-calendar-input',
        'itk-calendar-calendarIcon'
    ];

    
    self.mapping = function (opts) {
        if (!utils.isObject(opts)) {
            throw new TypeError('Config is not a object!');
            return;
        }
        for (var i in opts) {
            self[i] = opts[i];
        }
    };

    window['itkCalendarLanguage'] = window['itkCalendarLanguage'] || {};

    
    self.langMixin = function (lang) {
        if (lang) {
            for (var type in lang) {
                if (!window['itkCalendarLanguage'][type]) {
                    window['itkCalendarLanguage'][type] = lang[type];
                }
            }
            delete lang;
        }
    };

    
    self.initWeekList = function (type) {
        var list = self.i18n[type] || window['itkCalendarLanguage'][type];
        if (list) {
            self.weekArr = list.weekArr;
            self.monthArr = list.monthArr;
        }
        else {
            if (!self.weekArr || !self.monthArr) {
                var list = self.i18n.zh_cn;
                self.weekArr = list.weekArr;
                self.monthArr = list.monthArr;
            }
        }
    };

    self.getDaysCount = function (year, month) {
        var ret = 0;
        switch (month) {
            case 1:
            case 3:
            case 5:
            case 7:
            case 8:
            case 10:
            case 12:
            case 0:
            case 13:
                ret = 31;
                break;
            case 4:
            case 6:
            case 9:
            case 11:
                ret = 30;
                break;
            case 2:
                ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? ret = 29 : ret = 28;
                break;
            default:
                throw new Error('你算错了');
                break;
        }
        return ret;
    };

    self.drawDays = function (timeStamp) {
        var date;
        if (timeStamp) {
            date = new Date(timeStamp);
        }
        else {
            date = new Date();
        }
        var thisMonth = date.getMonth();
        var thisYear = date.getFullYear();

        self.month = {
            text: self.monthArr[thisMonth],
            val: thisMonth + 1
        };

        self.year = {
            text: thisYear,
            val: thisYear
        };

        thisMonth = thisMonth + 1;

        var thisMonthDays = self.getDaysCount(thisYear, thisMonth);
        var prevMonthDays = self.getDaysCount(thisYear, thisMonth - 1);
        var nextMonthDays = self.getDaysCount(thisYear, thisMonth + 1);
        date.setDate(1);
        var firstDay = date.getDay();
        date.setDate(thisMonthDays);
        var lastDay = date.getDay();

        var dayArr = [];
        for (var i = 0, len = firstDay ? firstDay - 1 : 6; i < len; i++) {
            dayArr.push({
                year: '',
                month: '',
                day: prevMonthDays - i
            });
        }
        dayArr.reverse();
        for (var i = 0, len = thisMonthDays; i < len; i++) {
            dayArr.push({
                year: thisYear,
                month: thisMonth,
                day: i + 1
            });
        }
        for (var i = 0, len = lastDay ? 7 - lastDay : 0; i < len; i++) {
            dayArr.push({
                year: '',
                month: '',
                day: i + 1
            });
        }
        switch (dayArr.length / 7) {
            case 4:
                for (var i = 0; i < 7; i++) {
                    dayArr.push({
                        year: '',
                        month: '',
                        day: i + 1
                    });
                }
                self.overflow = false;
                break;
            case 6:
                self.overflow = true;
                break;
            default:
                self.overflow = false;
                break;
        }
        return dayArr;
    };

    self.initDays = function (timeStamp) {
        var tmp_date = new Date();
        self.today = tmp_date.getDate();
        self.toMonth = tmp_date.getMonth() + 1;
        self.toYear = tmp_date.getFullYear();

        if (self.defaultSelected) {
            self.selectedDay = self.today;
            self.selectedMonth = self.toMonth;
            self.selectedYear = self.toYear;
        }

        











        for (var prev = self.toYear - 10, last = self.toYear + 11; prev < last; prev++) {
            self.yearList.push(prev);
        }

        self.dayArr = self.drawDays(timeStamp);
        self.update();
    };

    self.getNum = function (v) {
        return v > 10 ? v : '0' + v;
    }

    self.formatter = function (type) {
        var date = new Date(self.selectedYear, self.selectedMonth - 1, self.selectedDay, 0, 0, 0);
        var timeStamp = date.getTime();
        var ret;
        switch (type) {
            case 'unixTimeStamp':
                ret = self.getUnixTimeStamp(timeStamp);
                break;
            case 'timeStamp':
                ret = self.getTimeStamp(timeStamp);
                break;
            default:
                if (!type) {
                    var type = 'yyyy/mm/dd';
                }
                ret = type.replace(/(yyyy|mm|dd|yy|m|d)/ig, function (v) {
                    if (v === 'yyyy') {
                        return self.selectedYear;
                    }
                    if (v === 'mm') {
                        return self.getNum(self.selectedMonth);
                    }
                    if (v === 'dd') {
                        return self.getNum(self.selectedDay);
                    }
                    if (v === 'yy') {
                        return self.selectedYear.toString().substr(2, 4);
                    }
                    if (v === 'm') {
                        return self.selectedMonth;
                    }
                    if (v === 'd') {
                        return self.selectedDay;
                    }
                });
                break;
        }
        return ret;
    };

    
    self.dayClicked = function (e) {
        self.selectedDay = e.item.day;
        self.selectedMonth = e.item.month;
        self.selectedYear = e.item.year;
        self.onSelect && self.onSelect(self.formatter, self.getYear(), self.getMonth(), self.getDay());
        self.update();
    };

    self.open = false;















    self.offset = function (elm) {
        if ( !elm.getClientRects().length ) {
            return { top: 0, left: 0 };
        }

        rect = elm.getBoundingClientRect();

        if ( rect.width || rect.height ) {
            doc = elm.ownerDocument;
            win = window;
            docElem = doc.documentElement;

            return {
                top: rect.top + win.pageYOffset - docElem.clientTop,
                left: rect.left + win.pageXOffset - docElem.clientLeft
            };
        }

        return rect;
    };

    self.location = function (e) {
        if (self.element) {

            var pos = self.offset(self.element);
            self.root.style.position = 'fixed';
            self.root.style.top = (pos.top + self.element.offsetHeight) + 'px';
            self.root.style.left = pos.left + 'px';
        }
    };

    self.closeIt = function (e) {
        var className = e.target.className;
        if (
            e.target === self.element ||
            classList.indexOf(className) > -1 ||
            className.indexOf('itk-calendar') > -1 && className.indexOf('itk-calendar-day') === -1
        ) {
            return;
        }
        self.open = false;
        self.update();
    };

    self.openIt = function (e) {
        self.open = true;
        self.update();
        self.location(e);
    };

    
    self.unbindEvent = function () {
        if (self.element) {
            document.removeEventListener('click', self.closeIt, false);
            self.element.removeEventListener('click', self.openIt, false);
        }
    };

    self.on('mount', function () {

        var config = self.opts.opts || self.opts || {};
        self.yearList = [];
        self.mapping(config);
        self.langMixin(self.customLang);
        self.initWeekList(self.language);
        self.initDays(self.initTime);

        if (self.element) {


            if (!utils.hasClass(self.element, 'itk-calendar-input') && self.element.getAttribute('calendar') !== null) {
                var parent = self.element.parentNode;
                var wrap = document.createElement('label');
                wrap.className = classList[0];
                parent.insertBefore(wrap, self.element);
                utils.addClass(self.element, classList[1]);
                wrap.appendChild(self.element);
                var icon = document.createElement('span');
                icon.className = classList[2];
                wrap.appendChild(icon);
                self.element = wrap;
            }

            document.addEventListener('click', self.closeIt, false);
            self.element.addEventListener('click', self.openIt, false);
        }
        else {
            self.open = true;
        }
        self.update();
    });

    self.on('unmount', function () {
        self.unbindEvent();
    });

    
    self.getTimeStamp = function (timeStamp) {
        return timeStamp;
    };

    
    self.getUnixTimeStamp = function (timeStamp) {
        return Math.ceil(timeStamp / 1000).toString();
    };

    
    self.getYear = function () {
        return self.selectedYear;
    };

    
    self.getMonth = function () {
        return self.selectedMonth;
    };

    
    self.isBoundary = function (y, m, direction) {
        var firstYear = self.yearList[0];
        var lastYear = self.yearList[self.yearList.length - 1];
        if (
            y < firstYear ||
            y > lastYear ||
            y === firstYear && m === 0 && direction === -1 ||
            y === lastYear && m === 13 && direction === 1
        ) {
            return false;
        }
        return [y , m];
    };

    
    self.getDay = function () {
        return self.selectedDay;
    };

    self.reset = function (date) {
        self.dayArr = self.drawDays(new Date(date[0], date[1], 1).getTime());
        self.update();
    }







    self.nextMonth = function () {
        var year = self.year.val;
        var month = self.month.val - 1;
        year = month === 11 ? year + 1 : year;
        month = month === 11 ? 0 : month + 1;
        var date = self.isBoundary(year, month, 1);
        date && self.reset(date);
    };







    self.prevMonth = function () {
        var month = self.month.val - 1;
        var year = self.year.val;
        year = month === 0 ? year - 1 : year;
        month = month === 0 ? 11 : month - 1;
        var date = self.isBoundary(year, month, -1);
        date && self.reset(date);
    };

    self.openYearList = function () {
        self.openList = !self.openList;
    };

    self.clickYear = function (e) {
        self.openList = false;
        self.reset([e.item.i, self.month.val - 1]);
    };
    
});

riot.tag('itk-center', '<div class="itk-loading {default: default}" > <yield> </div>', function(opts) {
        var self = this;
        var config = self.opts.opts || self.opts;
        self.default = false;
        
        self.on('mount', function() {
            var parentDom = self.root.parentNode;
            var parentPosition = window.getComputedStyle(parentDom, null).position;
            if (parentPosition === 'static') {
                parentDom.style.position = 'relative';
            }

            self.childDom = self.root.getElementsByClassName('itk-loading')[0];

            if (self.childDom.innerHTML.trim()) {
                self.default = false;
                self.update();
            }

            var cellHeight = parseInt(window.getComputedStyle(self.childDom, null).height.replace('px', ''), 10);
            self.root.style.marginTop = '-' + cellHeight/2 + 'px';
            
        });

        self.root.show = function(){
            if (self.childDom) {
                self.childDom.style.display = 'block';
            }
        }

        self.root.hide = function(){
            if (self.childDom) {
                self.childDom.style.display = 'none';
            }
        }
    
});
riot.tag('date-picker', '<yield>', function(opts) {
    var self = this;
    var EL = self.root;
    var config = self.opts.opts || self.opts;

    var js = document.scripts;

    var path = '';

    var jsPath = '';

    if (!config.path) {
        for (var i = 0; i < js.length; i++) {
            if (!js[i].src) {
                continue;
            }
            if (/itoolkit.min.js|itoolkit.js/.test(js[i].src)) {
                jsPath = js[i].src.replace(/itoolkit.min.js|itoolkit.js/, '');
                break;
            }
        }
        path = jsPath + 'plugins/laydate/';
    }
    else {
        path = config.path;
    }

    var theme = config.theme ? config.theme : 'default';

    utils.jsLoader([
        path + 'laydate.min.js',
        path + '/need/' + 'laydate.css',
        path + '/skins/' + theme + '/laydate.css'
    ], function () {
        for (var i = 0; i < EL.children.length; i++) {
            var child = EL.children[i];
            if (child.attributes['pTrigger']) {
                self.pTrigger = child;
            }
            if (child.attributes['media']) {
                self.media = child;
            }
        }
        self.resolve();
        self.update();
    });

    this.resolve = function() {
        if (self.pTrigger || self.media) {
            if (self.pTrigger === self.media) {
                config.elem = config.pTrigger = self.media;
            }
            if (typeof self.pTrigger === 'undefined') {
                config.elem = self.media;
            }
            if (
                self.pTrigger
                && self.media
                && (self.pTrigger !== self.media)
            ) {
                config.pTrigger = self.pTrigger;
                config.elem = self.media;
            }
            if (self.pTrigger && !self.media) {
                config.elem = self.pTrigger;
                config.justChoose = true;
            }
        }
        else {
            throw 'media and pTrigger property was not found in the element';
        }

        if (config.pTrigger) {
            config.pTrigger.onclick = function (e) {
                laydate(config);
            }
            return;
        }
        laydate(config);
    }.bind(this);
    
});

riot.tag('itk-div', '<yield>', function(opts) {
    var self = this;
    var config = self.opts.opts || self.opts;
    var EL = self.root;

    for (i in config) {
        self[i] = config[i];
    }
    
    
    self.getData = function(params) {
        var params = params || {};
        if (EL.getAttribute('data-get')) {
            var method = 'httpGet';
        }
        else if (EL.getAttribute('data-jsonp')) {
            var method = 'jsonp';
        }
        
        utils[method](self.superDivUrl, params, function(data) {
            for (i in data) {
                self.data = {};
                self.data[i] = data[i];
            }
            self.update();
        });
    }

    self.on('mount', function() {
        EL.style.display = 'block';
        self.superDivUrl = EL.getAttribute('data-get') || EL.getAttribute('data-jsonp');
        if (self.superDivUrl) {
            self.getData(config.params);
        }
    })
    
    
    self.loadData = EL.loadData = function(newData, colName){
        colName = colName || 'data';
        self[colName] = newData
        self.update();
    }

    self.reload = EL.reload = function() {
        if (self.superDivUrl) {
            self.getData(config.params);
        }
        else {
            self.update();
        }
    }
    
});
riot.tag('itk-editor', '<textarea rows="10" cols="80" style="display:none;"></textarea>', function(opts) {
        var self = this;
        var EL = self.root;
        var config = self.opts.opts || self.opts;
        var js = document.scripts;
        var path = '';
        var jsPath = '';
        var type = config.type || 'standard';
        var filebrowserImageUploadUrl = config.filebrowserImageUploadUrl;

        var initContent;
        if (config.initContent) {
            initContent = config.initContent;
        }

        var initEditor;
        if (config.initEditor) {
            initEditor = config.initEditor;
        }

        var topConfig = {};

        topConfig.image_previewText = '';
        topConfig.filebrowserImageUploadUrl = filebrowserImageUploadUrl;

        if (config.editorConfig) {

            var editorConfig = config.editorConfig;

            for (x in editorConfig) {

                if (x != 'image_previewText' && x != 'filebrowserImageUploadUrl' && x != 'initContent' && x != 'initEditor') {
                    topConfig[x] = editorConfig[x];
                }
            }

        }

        if (!config.path) {
            for (var i = 0; i < js.length; i++) {
                if (!js[i].src) {
                    continue;
                }
                if (/itoolkit.min.js|itoolkit.js/.test(js[i].src)) {
                    jsPath = js[i].src.replace(/itoolkit.min.js|itoolkit.js/, '');
                    break;
                }
            }
            path = jsPath + 'plugins/ckeditor/';
        }
        else {
            path = config.path;
        }

        self.on('mount', function () {

            EL.style.visibility = 'hidden';

            var textarea = EL.getElementsByTagName('textarea')[0];

            var id = EL.getAttribute('id');

            textarea.setAttribute('id', EL.getAttribute('id'));
            EL.removeAttribute('id');

            utils.jsLoader([
                path + type + '/ckeditor.js'
            ], function () {

                var editor = CKEDITOR.replace(id, topConfig);

                console.log(topConfig);

                EL.style.visibility = 'visible';

                self.update();

                if (initContent) {
                    editor.setData(initContent);
                }

                if (initEditor) {
                    initEditor(editor);
                }

            });
        })

    
});
riot.tag('itk-form', '<form onsubmit="{ submit }" > <yield> </form>', function(opts) {
    var self = this;
    var EL = self.root;
    var config = self.opts.opts || self.opts;
    var keyWords = [
        'insertTip',
        'ajaxSubmit',
        'submit',
        'removeTips',
        'insertTip',
        'removeTip',
        'loadData',
        'getData',
        'setData',
        'triggerSubmit'
    ];   //保留字，不被覆盖

    var checkList = [
        'allowEmpty',
        'allowempty',
        'max',
        'min',
        'valid',
        'vr'
    ];

    var NUMBER_REGEXP = {
        NON_NEGATIVE_INT: /^0$|^-[1-9]\d*$/,                            //非负整数（正整数 + 0）
        POSITIVE_INT: /^[1-9]\d*$/,                                     //正整数
        NON_POSITIVE_INT: /^[1-9]\d*$|^0$/,                             //非正整数（负整数 + 0）
        NEGATIVE_INT: /^-[1-9]\d*$/,                                    //负整数
        INT: /^-?[1-9]\d*$|^0$/,                                        //整数
        NON_NEGATIVE_FLOAT: /^(\d)(\.\d+)?$|^([1-9]\d*)(\.\d+)?$|^0$/,  //非负浮点数（正浮点数 + 0）
        POSITIVE_FLOAT: /^(\d)(\.\d+)?$|^([1-9]\d*)(\.\d+)?$/,          //正浮点数
        NON_POSITIVE_FLOAT: /^(-\d)(\.\d+)?$|^(-[1-9]\d*)(\.\d+)?$|^0$/,//非正浮点数（负浮点数 + 0）
        NEGATIVE_FLOAT: /^(-\d)(\.\d+)?$|^(-[1-9]\d*)(\.\d+)?$/,        //负浮点数
        FLOAT: /^(-?\d)(\.\d+)?$|^(-?[1-9]\d*)(\.\d+)?$|^0$/            //浮点数
    };

    self.presentWarning = '必填';
    self.emailWarning = '邮箱格式错误';
    self.mobileWarning = '手机格式错误';
    self.urlWarning = '网址格式错误';
    self.successTips = config.successTipsText || '通过';
    self.regexpWarning = '字段不符合验证规则';
    self.numWarning = '数字格式错误';

    self.passClass = config.passClass || 'valid-pass';
    self.failedClass = config.failedClass || 'valid-failed';

    
    self.comparator = function (type) {
        return {
            handler: function (validation, attrs) {
                switch (type) {
                    case 'number':
                        return self.numComparator(validation, attrs);
                    case 'string':
                    default:
                        return self.strCompatator(validation, attrs);
                }
            }
        };
    };

    
    self.strCompatator = function(validation, attrs) {
        var min = parseInt(attrs.min, 10);
        var max = parseInt(attrs.max, 10);
        var nMin = isNaN(min);
        var nMax = isNaN(max);
        var len = attrs.value.length;
        if (!nMin && !nMax) {
            if (len > max || len < min) {
                validation.msg.push(self.bpWarning(min, max));
            }
        }
        else {
            if (!nMin && len < min) {
                validation.msg.push(self.minWarning(min));
            }
            if (!nMax && len > max) {
                validation.msg.push(self.maxWarning(max));
            }
        }
        return validation;
    };

    

    self.numComparator = function(validation, attrs) {
        var min = parseInt(attrs.min, 10);
        var max = parseInt(attrs.max, 10);
        var nMin = isNaN(min);
        var nMax = isNaN(max);
        var value = +attrs.value;
        if (!nMin && !nMax) {
            if (value > max || value < min) {
                validation.msg.push(self.numBpWarning(min, max));
            }
        }
        else {
            if (!nMin && value < min) {
                validation.msg.push(self.minNumWarning(min));
            }
            if (!nMax && value > max) {
                validation.msg.push(self.maxNumWarning(max));
            }
        }
        return validation;
    };

    self.one('mount', function() {
        EL.style.display = 'block';
        if (config.realTime && config.valid) {
            var elems = self.root.getElementsByTagName('form')[0].elements;
            for (var i = 0, len = elems.length; i < len; i ++) {
                var type = elems[i].type;
                if (type !== 'submit' || type !== 'button') {
                    elems[i].addEventListener('input', valueOnChange, false);
                    elems[i].addEventListener('change', valueOnChange, false);
                }
            }
        }
    });

    
    function valueOnChange(e) {
        doCheck([], this);
    }

    function isType(obj) {
        return Object.prototype.toString.call(obj).match(/\ (.*)\]/)[1];
    }

    function dif(obj) {
        var constructor = isType(obj);
        if (constructor === 'Null'
            || constructor === 'Undefined'
            || constructor === 'Function'
        ) {
            return obj;
        }
        return new window[constructor](obj);
    }

    EL.loadData = function(newData, colName){
        if (utils.isObject(newData)) {
            for(var i in newData) {
                newData[i] = dif(newData[i]);
            }
        }
        else {
            newData = dif(newData);
        }
        colName = colName || 'data';
        self[colName] = newData;
        self.update();
    };

    EL.setData = function(newData, name){
        self.data[name] = dif(newData);
        self.update();
    };

    EL.triggerSubmit = function () {
        var form = EL.querySelector('form');
        form && form.submit();
    };

    self.checkExistKey = function(obj, key, value) {
        if (obj.hasOwnProperty(key)) {
            if (utils.isArray(obj[key])) {
                obj[key].push(value);
            }
            else {
                var arr = [];
                arr.push(obj[key]);
                arr.push(value)
                obj[key] = arr;
            }
        }
        else {
            obj[key] = value;
        }
    }

    self.getData = EL.getData = function(){
        var elems = self.root.getElementsByTagName('form')[0].elements;
        var params = {};
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].name) {
                var value;
                if (elems[i].tagName === "SELECT") {
                    var options = elems[i].options;
                    for (var j = 0; j < options.length; j++) {
                        if (options[j].selected) {
                           value = options[j].value;
                           self.checkExistKey(params, elems[i].name, encodeURIComponent(value));
                        }
                    }
                }
                else if (elems[i].type === "checkbox" || elems[i].type === "radio"){
                    if (elems[i].checked) {
                        value = elems[i].value;
                        self.checkExistKey(params, elems[i].name, encodeURIComponent(value));
                    }
                }
                else {
                    value = elems[i].value;
                    self.checkExistKey(params, elems[i].name, encodeURIComponent(value));
                }
            }
        }
        return params;
    }



    self.submitingText = config.submitingText || '提交中...';
    if (config.valid === undefined) {
        config.valid = true;
    }

    self.maxWarning = config.maxWarning || function(n) {
        return '不得超过' + n + '个字符';
    }
    self.minWarning = config.minWarning || function(n) {
        return '不得小于' + n + '个字符';
    }

    self.bpWarning = config.bpWarning || function (min, max) {
        return '只允许' + min + '-' + max + '个字符';
    }

    self.minNumWarning = config.minNumWarning || function (n) {
        return '不得小于' + n;
    }
    self.maxNumWarning = config.maxNumWarning || function (n) {
        return '不得大于' + n;
    }
    self.numBpWarning = config.numBpWarning || function (min, max) {
        return '输入数字应在' + min + '-' + max + '之间';
    }

    
    self.removeTips = EL.removeTips = function() {
        var root = self.root;
        var elems = root.getElementsByTagName('form')[0].elements;
        var tips = root.getElementsByClassName('tip-container');
        if (tips && tips.length) {
            del();
        }

        function del() {
            for (i = 0; i < tips.length; i++) {
                tips[i].parentNode.removeChild(tips[i]);
                if (tips.length) {
                    del();
                }
            }
        }

        for (var i = 0; i < elems.length; i++) {
            utils.removeClass(elems[i], self.passClass);
            utils.removeClass(elems[i], self.failedClass);
        }
    }

    

    self.removeTipNode = function(dom) {
        var tip = dom.nextElementSibling;
        if (tip && tip.className.match(/tip-container/)) {
            dom.parentNode.removeChild(tip);
        }
    };
    self.removeTip = EL.removeTip = function(dom){
        self.removeTipNode(dom);
        utils.removeClass(dom, self.passClass);
        utils.removeClass(dom, self.failedClass);
    };

    self.insertTip = EL.insertTip = function(dom, message, className){
        self.removeTipNode(dom);
        var tipContainer = document.createElement('span');
        tipContainer.className = className;
        tipContainer.innerHTML = message;
        utils.insertAfterText(tipContainer, dom);
    };

    self.onValidRefuse = EL.onValidRefuse = config.onValidRefuse || function(dom, errorTips) {
        self.insertTip(dom, errorTips, 'tip-container');
        utils.removeClass(dom, self.passClass);
        utils.addClass(dom, self.failedClass);
    };

    self.onValidPass = EL.onValidPass = config.onValidPass || function(dom, successTips) {
        self.insertTip(dom, successTips, 'tip-container success');
        utils.removeClass(dom, self.failedClass);
        utils.addClass(dom, self.passClass);
    };

    
    self.ajaxSubmit = function(elems, url) {
        var params = '';
        for (var i = 0; i < elems.length; i++) {
            if (elems[i].name) {
                var value;
                if (elems[i].tagName === "SELECT") {
                    var options = elems[i].options;
                    for (var j = 0; j < options.length; j++) {
                        if (options[j].selected) {
                           value = options[j].value;
                           params += elems[i].name + "=" + encodeURIComponent(value) + "&";
                        }
                    }
                }
                else if (elems[i].type === "checkbox" || elems[i].type === "radio"){
                    if (elems[i].checked) {
                        value = elems[i].value;
                        params += elems[i].name + "=" + encodeURIComponent(value) + "&";
                    }
                }
                else {
                    value = elems[i].value;
                    params += elems[i].name + "=" + encodeURIComponent(value) + "&";
                }
            }
            if (elems[i].type === "submit") {
                var submitbtn = elems[i];
                var attr = submitbtn.tagName === 'BUTTON'
                         ? 'innerHTML'
                         : 'value';
                var submitingText = submitbtn[attr];
                submitbtn.disabled = 'disabled';
                submitbtn[attr] = self.submitingText;
            }
        }
        var xmlhttp = new XMLHttpRequest();
        xmlhttp.open("POST", url, true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.send(params);
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState === 4) {
                self.removeTips();
                submitbtn[attr] = submitingText;
                submitbtn.disabled = false;
                if (config.complete && typeof config.complete === 'function') {
                    config.complete();
                }
                if (xmlhttp.status === 200) {
                    try {
                        var result = JSON.parse(xmlhttp.responseText);
                        config.callback && config.callback(result);
                        EC.trigger('submit_success', result);
                    }catch(e){
                        throw new Error(e.message);
                    }
                }
                else {
                    config.errCallback && config.errCallback(params);
                    EC.trigger('submit_error', params);
                }
            }
        };
    }

    
    this.submit = function(e) {
        var validArr = [];
        var elems = self.root.getElementsByTagName('form')[0].elements;
        var action = self.action || self.root.getAttribute('action');
        var url = action;

        if (config.valid) {
            for (var i = 0; i < elems.length; i++) {
                doCheck(validArr, elems[i]);
            }
        }

        if (!validArr.length) {
            try {
                config.beforeSubmit && config.beforeSubmit(validArr);
            }
            catch (e) {
                validArr.push(e);
            }
        }
        if (!validArr.length) {
            if (config.normalSubmit) {
                self.root.firstChild.setAttribute('action', action);
                return true;
            }
            else {
                e.preventDefault();
                self.ajaxSubmit(elems, url);
            }
        }
        else {
            return false;
        }
    }.bind(this);

    function getCheckParam(elem) {
        var elem = elem;
        var attributes = elem.attributes;
        var ret = {};
        for (var i = 0; i < attributes.length; i++) {
            var attr = attributes[i];
            ret[attr.name] = attr.value;
        }
        ret.value = elem.value;
        return ret;
    }

    function isNeedCheck(attrs) {
        for (var i = 0; i < checkList.length; i++) {
            if (attrs[checkList[i]]) {
                return true;
            }
        }
        return false;
    }

    
    self.Validation = function(validArr, name, dom) {
        this.msg = [];
        this.validTip = function() {
            if (this.msg.length) {
                self.onValidRefuse(dom, this.msg[0]);
                validArr.push(name)
            }
            else {
                if (config.forbidTips) {
                    self.removeTip(dom);
                }
                else {
                    self.onValidPass(dom, self.successTips);
                }
            }
        }
    };

    
    self.rulesConfig = {
        email: {
            regexp: /^([a-zA-Z0-9_\-\.])+\@([a-zA-Z0-9_-])+(.[a-zA-Z0-9_-])+/,
            msg: self.emailWarning
        },
        present: {
            regexp: /\S+/,
            msg: self.presentWarning
        },
        url: {
            regexp: /((http|ftp|https|file):\/\/([\w\-]+\.)+[\w\-]+(\/[\w\u4e00-\u9fa5\-\.\/?\@\%\!\&=\+\~\:\#\;\,]*)?)/,
            msg: self.urlWarning
        },
        mobile: {
            regexp:/^1[3|4|5|8][0-9]\d{4,8}$/,
            msg: self.mobileWarning
        }
    };

    self.valid = function(rule, validation, attrs) {
        if (self.rules[rule]) {
            var judgeResult = self.rules[rule](attrs);
            if (judgeResult === true) {
                self.comparator('string').handler(validation, attrs);
            }
            else {
                validation.msg.push(judgeResult);
            }
            return validation;
        }
    };


    self.validNumRange = function(validation, attrs) {
        var reg = NUMBER_REGEXP[attrs.valid.toUpperCase()];
        if (!reg.test(attrs.value)) {
            validation.msg.push(self.numWarning);
        }
        else {
            self.comparator('number').handler(validation, attrs);
        }
        return validation;
    };

    self.validUnion = function (validation, validArr, elem, attrs) {
        if (attrs.vr) {
            var arr = attrs.vr.split('::');
            var method = arr[0];
            var params = arr[1] ? arr[1].split(',') : undefined;
            var flag = false;
            try {
                flag = iToolkit[method].apply(elem, params);
            }
            catch (e) {
                flag = false;
                throw e;
            }
            if (!flag) {
                validation.msg.push('');
            }
        }
        return validation;
    };

    self.validEmpty = function (validation, attrs) {
        if (attrs.value === '') {
            validation.msg.push(self.presentWarning);
        }
        return validation;
    };

    
    self.on('mount', function() {
        self.init();
    });

    self.init = function() {
        for (i in config) {
            if (keyWords.indexOf(i) < 0) {
                if (self.hasOwnProperty(i)) {
                    self[i] = utils.deepCopy(config[i], self[i]);
                }
                else {
                    self[i] = config[i];
                }
            }
        }
        self.data = config.data;
        self.rules = {};

        for (ruleConfig in self.rulesConfig) {
            if (utils.isObject(self.rulesConfig[ruleConfig])) {
                (function(ruleConfig) {
                    self.rules[ruleConfig] = function(attrs) {
                        if (attrs.value.match(self.rulesConfig[ruleConfig].regexp)) {
                            return true;
                        }
                        else {
                            return self.rulesConfig[ruleConfig].msg;
                        }
                    }
                })(ruleConfig);
            }
            else if (utils.isFunction(self.rulesConfig[ruleConfig])) {
                self.rules[ruleConfig] = self.rulesConfig[ruleConfig];
            }
        }
        self.update();
    };


    
    function doCheck(validArr, elem) {
        var dom = elem;
        var attrs = getCheckParam(elem);
        if (!isNeedCheck(attrs)) {
            return;
        }
        var validation = new self.Validation(validArr, attrs.name, dom);
        if (attrs.name) {
            if ((attrs.allowEmpty || attrs.allowempty) && attrs.value === '') {
                self.onValidPass(dom, self.successTips);
                return;
            }
            self.validEmpty(validation, attrs);
            if (attrs.valid) {
                if (self.rules[attrs.valid]) {
                    self.valid(attrs.valid, validation, attrs);
                }
                else if (NUMBER_REGEXP[attrs.valid.toUpperCase()]) {
                    self.validNumRange(validation, attrs);
                }
            }
            else if (!attrs.valid) {
                if (attrs.min || attrs.max){
                    self.comparator('string').handler(validation, attrs);
                }
            }
        }
        if (!validArr.length) {
            self.validUnion(validation, validArr, dom, attrs);
        }
        validation.validTip();
    }
    
});

riot.tag('itk-goto-top', '<yield></yield> <div class="itk-topbtn" id="itk-goto-top-btn"> <div class="itk-arrow"></div> <div class="itk-stick"></div> </div>', function(opts) {
        var self = this;
        var rt = self.root;
        var config = self.opts.opts || self.opts;

        var defaultDom;
        var ua = window.navigator.userAgent;
        if (ua.match(/firefox/i)) {
            defaultDom = document.documentElement;
        }
        else {
            defaultDom = document.body;
        }

 
        self.speed = 50000*(config.speed || 100);
        self.showHeight = config.showHeight || 300;
        self.right = config.right || 30;
        self.bottom = config.bottom || 30;
        self.dom = config.dom || defaultDom;

        rt.style.right = self.right + 'px';
        rt.style.bottom = self.bottom + 'px';

        self.init = function(){

            var top;

            var scrollHandler = function(){
                top = self.dom.scrollTop;

                if(top > self.showHeight){
                    rt.style.display = 'block';
                }
                else{
                    rt.style.display = 'none';
                }  
            }

            var clickHandler = function(){

                var dist = self.speed / top;
                var timer = setInterval(backTop, 20);
                function backTop(){
                    self.dom.scrollTop -= dist;
                    if( self.dom.scrollTop === 0 ) {
                        clearInterval(timer);
                    }
                }
            }

            if (self.dom === defaultDom) {
                var eventTrigger = window;
            }
            else {
                var eventTrigger = self.dom;
            }

            eventTrigger.addEventListener("scroll",scrollHandler);
            rt.addEventListener("click",clickHandler);
        }

        self.on('mount',function(){
            var defaultBtn = rt.querySelector('#itk-goto-top-btn');
            if(rt.firstElementChild === defaultBtn) {
                defaultBtn.style.display = 'block';
            }
            else {
                defaultBtn.style.display = 'none';
            }
            self.init();
        })
    
});
riot.tag('itk-modal', '<div class="itk-modal-dialog" riot-style="width:{width}; height:{height}"> <div class="itk-modal-title"> <span>{ title }</span> <div class="itk-modal-close-wrap" onclick="{ close }"> <div class="itk-modal-close"></div> </div> </div> <div class="itk-modal-container"> <yield> </div> <div class="itk-modal-footer"> <button class="itk-cancle-btn" onclick="{ close }">{ cancelText || \'取消\' }</button> <button class="itk-submit-btn" onclick="{ confirm }">{ submitText || \'确认\' }</button> </div> </div>', function(opts) {

    var self = this;
    var config = self.opts.opts || self.opts;
    var EL = self.root;
    for (i in config) {
        self[i] = config[i];
    }

    config.width = (typeof config.width === 'string' && config.width.match('px')) ? config.width : config.width + 'px';
    config.height = (typeof config.height === 'string' && config.height.match('px')) ? config.height : config.height + 'px'
    self.width = config.width || '600px';
    self.height = config.height || 'auto';
    self.cancleText = config.cancleText || '取消';
    self.submitText = config.submitText || '确认';

    self.on('mount', function() {
        var container = self.root.querySelector('.itk-modal-container');
        var head = self.root.querySelector('.itk-modal-title');
        var foot = self.root.querySelector('.itk-modal-footer');
        if (self.hideFooter) {
            foot.style.display = 'none';
        }
        var headHeight = parseInt(window.getComputedStyle(head, null).height.replace('px', ''));
        var footHeight = parseInt(window.getComputedStyle(foot, null).height.replace('px', ''));
        if (config.height) {
            container.style.height = (parseInt(self.height) - footHeight - headHeight - 2) + 'px';
        }

    })

    if (document.querySelector("[modal-open-target='" + self.root.id + "']")) {
        document.querySelector("[modal-open-target='" + self.root.id + "']").onclick = function() {
            self.root.style.display = 'block';
            self.onOpen && self.onOpen();
        }
    }

    self.root.open = function() {
        self.root.style.display = 'block';
        self.onOpen && self.onOpen();
    }

    self.close = self.root.close = function() {
        self.root.style.display = 'none';
        self.onClose && self.onClose();
    }

    self.loadData = self.root.loadData = function(newData, colName){
        colName = colName || 'data';
        self[colName] = newData;
        self.update();
    }

    self.confirm = self.root.confirm = function(e) {
        self.onSubmit && self.onSubmit();
    }




});

riot.tag('itk-paginate', '<div onselectstart="return false" ondragstart="return false"> <div class="itk-paginate"> <li onclick="{ goFirst }">«</li> <li onclick="{ goPrev }">‹</li> </div> <ul class="itk-paginate"> <li each="{ pages }" onclick="{ parent.changePage }" class="{ active: parent.currentPage == page }">{ page }</li> </ul> <div class="itk-paginate"> <li onclick="{ goNext }">›</li> <li onclick="{ goLast }">»</li> </div> <div class="itk-paginate"> <form onsubmit="{ redirect }" style="position:relative;"> <span class="redirect" if="{ redirect }">跳转到<input class="jumpPage" name="page" riot-type={"number"} style="width: 40px;">页 </span> <div class="itk-paginate-tips" riot-style="top: { tipsTop }; left: { tipsLeft }; display: { showTip }"> 请输入1～{ pageCount }之间的数字 </div> <span class="page-sum" if="{ showPageCount }"> 共<em>{ pageCount }</em>页 </span> <span class="item-sum" if="{ showItemCount }"> <em>{ count }</em>条 </span> <input type="submit" style="display: none;"> </form> </div> </div>', function(opts) {
        var self = this;
        var EL = self.root;
        var config = self.opts.opts || self.opts;
        self.showTip = 'none';
        self.count = config.count || 0;
        self.pagesize = config.pagesize || 20;
        self.pageCount = config.pageCount || Math.ceil(self.count/self.pagesize) || 1;
        self.currentPage = config.currentPage || 1;
        self.url = config.url || '';
        self.showNumber = config.showNumber || 5;

        self.redirect = config.redirect || true;
        self.showPageCount = config.showPageCount || true;
        self.showItemCount = config.showItemCount || true;
        self.needInit = config.needInit || false;

        self.updateCurrentPage = function () {
            if (self.currentPage > Math.ceil(self.showNumber/2) && self.pageCount > self.showNumber) {
                self.pages = [];
                if (self.pageCount - self.currentPage > 2) {
                    var origin = self.currentPage - Math.ceil(self.showNumber/2);
                    var last = self.currentPage + Math.floor(self.showNumber/2);
                }
                else {
                    var last = self.pageCount;
                    var origin = self.pageCount - self.showNumber;
                }
                for (i = origin; i < last; i++) {
                    self.pages.push({page: i + 1});
                    self.update();
                }
            }
            else if (self.currentPage < (Math.ceil(self.showNumber/2) + 1) && self.pageCount > self.showNumber){
                self.pages = [];
                for (i = 0; i < self.showNumber; i++) {
                    self.pages.push({page: i + 1});
                }
                self.pages.push({page: '...'});
            }
        };
        EL.addCount = function (num) {
            var count = self.count + num;
            var oldPageCount = self.pageCount;
            count < 0
            ? self.count = 0
            : self.count = count;

            self.pageCount = Math.ceil(self.count/self.pagesize) || 1;
            self.currentPage = (
                self.currentPage > self.pageCount
                ? self.pageCount
                : self.currentPage
            );

            if (self.pageCount <= self.showNumber) {
                self.pages = [];
                for (var i = 0; i < self.pageCount; i++) {
                    self.pages.push({page: i + 1});
                }
            }

            if (

                self.needInit

                || (self.pageCount < oldPageCount && self.currentPage <= self.pageCount)
            ) {
                config.callback(self.currentPage);
            }

            self.pageChange(self.currentPage)
            self.update();
        };

        self.pages = [];
        
        if (self.pageCount < (self.showNumber + 1)) {
            for (i = 0; i < self.pageCount; i++) {
                self.pages.push({page: i + 1});
            }
        } 
        else {
            for (i = 0; i < self.showNumber; i++) {
                self.pages.push({page: i + 1});
            }
            self.pages.push({page: '...'});
        }

        if (self.needInit) {
            config.callback(self.currentPage);
        }
        self.updateCurrentPage();
        self.update();

        this.goFirst = function(e) {
            self.pageChange(1);
        }.bind(this);

        this.goPrev = function(e) {
            if (self.currentPage > 1) {
                self.pageChange(self.currentPage - 1);
            }
        }.bind(this);

        this.goNext = function(e) {
            if (self.currentPage < self.pageCount) {
                self.pageChange(self.currentPage + 1);
            }
        }.bind(this);
        
        this.goLast = function(e) {
            self.pageChange(self.pageCount);
        }.bind(this);

        this.redirect = function(e) {
            var index = parseInt(self.page.value, 10);
            if (
                index &&
                index < (self.pageCount + 1) &&
                index > 0
            ) {
                self.pageChange(parseInt(index, 10));
            }
            else {
                self.tipsLeft = self.page.offsetLeft;
                self.tipsTop = self.page.offsetTop + self.page.offsetHeight + 8;
                self.showTip = 'block';
                setTimeout(function () {
                    self.showTip = 'none';
                    self.update();
                }, 1500)
                self.update();
            }
        }.bind(this);

        this.changePage = function(e) {
            var page = e.item.page
            if (typeof(page) === 'string') {
                return false;
            }
            else {
                self.pageChange(page);
            }
        }.bind(this);

        self.pageChange = function(page) {
            if (self.currentPage != page) {
                self.currentPage = page;
                config.callback(page);
            }
            self.updateCurrentPage();
        };

    
});
riot.tag('itk-select', '<yield></yield> <ul class="itk-selected-container" onmousedown="{ showOptions }"> <li class="itk-selected-option" each="{realData }" if="{ selected && parent.mutiple}"> { name } <span class="itk-close" onmousedown="{ cancel }" >×</span> </li> <li class="itk-single-option" each="{ realData }" if="{ selected && !parent.mutiple}"> { name } </li> <li class="itk-search-wrap"> <input type="text" class="form-control itk-select-search" oninput="{ filter }" onfocus="{ filter }" onkeyup="{ keyboardHandle }"> </li> </ul> <ul class="itk-options-container"> <li class="itk-options" each="{ realData }" onmousedown="{ toggle }" if="{ !hide }"> <span class="itk-option-check" if="{ selected }"></span> <span class="empty-icon" if="{ !selected }"></span> { name } </li> <li class="no-result" if="{ noResult }">无搜索结果</li> </ul>', function(opts) {
        var self = this;
        var config = self.opts.opts || self.opts;
        self.gotOptions = false;
        self.chooseOnce = true;

        self.init = self.root.init = function() {
            self.gotOptions = false;
            self.update();
        };

        
        self.realData = [];
        self.root.exportData = self.realData;

        self.initData = self.root.initData = function() {
            if (self.root.querySelector('select')) {
                var options = self.root.querySelector('select').querySelectorAll('option');
                var mutiple = self.root.querySelector('select').hasAttribute('mutiple');
                if (mutiple) {
                    self.mutiple = true;
                }
                else {
                    self.mutiple = false;
                    self.noSearch = true;
                }
            }
            if (options && options.length && !self.gotOptions) {
                self.options = options;
                self.searchInput = self.root.querySelector('.itk-select-search');
                self.optionsWrap = self.root.querySelector('.itk-options-container');
                self.realData = [];
                for (i = 0; i < options.length; i++) {
                    self.realData.push({
                        name: options[i].innerHTML,
                        value: options[i].getAttribute('value'),
                        selected: options[i].getAttribute('selected'),
                        index: i
                    });
                }
                self.searchInput.onfocus = function () {
                    self.optionsWrap.style.display = 'block';
                };

                self.searchInput.onblur = function () {
                    self.optionsWrap.style.display = 'none';
                    self.searchInput.value = '';
                    self.resetSelectOpt();
                };

                if (self.noSearch) {
                    self.searchInput.style.width = '0px';
                }
                self.gotOptions = true;
                self.update();
            }
        };


        self.on('update', function() { 
            setTimeout(function() {
                self.initData();
            }, 0)
            
        });



        self.on('mount', function() {
            if (config) {
                for (var i in config) {
                    self[i] = config[i];
                }
                self.update();
            }
        });

        self.filter = function(e) {
            self.resetSelectOpt();
            var v = e.target.value;
            e.target.style.width = (0.9 * v.length + 1) + 'em';
            var match;
            for (i = 0; i < self.realData.length; i++) {
                if (!self.realData[i].name.match(v)) {
                    self.realData[i].hide = true;
                }
                else {
                    self.realData[i].hide = false;
                    match = true;
                }
            }
            self.noResult = !match;
        };

        self.toggle = function(e) {
            if (self.mutiple) {
                if (e.item.selected) {
                    e.item.selected = false;
                    self.options[e.item.index].selected = false;
                }
                else {
                    e.item.selected = true;
                    self.options[e.item.index].selected = true;
                }
            }
            else {
                for (i = 0; i < self.realData.length; i++) {
                    self.realData[i].selected = false;
                    self.options[i].selected = false;
                }
                e.item.selected = true;
                self.options[e.item.index].selected = true;
            }
            self.update();
            if (self.chooseOnce) {
                self.searchInput.blur();
            }
        };

        self.cancel = function(e) {
            e.stopPropagation();
            e.item.selected = false;
            self.options[e.item.index].selected = false;
            self.update();
        };

        self.showOptions = function(e) {
            if (self.searchInput && self.searchInput !== document.activeElement) {
                self.searchInput.focus();
            }
            else {
                self.searchInput.blur();
            }
        };

        
        self.keyboardHandle = function(e) {
            var searchInput = e.target;
            searchInput.options = self.root.querySelectorAll('.itk-options');
            if (searchInput.seletedIndex === undefined ){
                searchInput.seletedIndex = -1;
            }

            var keyCode = e.keyCode;
            if (keyCode === 37 || keyCode === 38){
                self.clearSelectedOpt(searchInput);
                searchInput.seletedIndex--;
                if (searchInput.seletedIndex < 0){
                    searchInput.seletedIndex = searchInput.options.length - 1;
                }
                self.setSelectedOpt(searchInput);
            }
            else if (keyCode === 39 || keyCode === 40){
                self.clearSelectedOpt(searchInput);
                searchInput.seletedIndex++;
                if (searchInput.seletedIndex >= searchInput.options.length){
                    searchInput.seletedIndex = 0;
                }
                self.setSelectedOpt(searchInput);
            }
            else if (keyCode === 13){
                self.chooseByKeyboard(searchInput);
            }
            else if (keyCode === 27){
                self.searchInput.blur();
            }
        };

        self.chooseByKeyboard = function(target){
            var e = document.createEvent("MouseEvents");
            var dom = target.options[target.seletedIndex];
            e.initEvent("mousedown", true, true);
            if (dom) {
                dom.dispatchEvent(e);
            }
        };

        self.clearSelectedOpt = function(target){
            if (target.options) {
                var dom = target.options[target.seletedIndex];
                if (target.seletedIndex >= 0 && dom) {
                    dom.style.background = "";
                    dom.scrollIntoView();
                }
            }
        };

        self.resetSelectOpt = function() {
            self.clearSelectedOpt(self.searchInput);
            self.searchInput.seletedIndex = -1;
        };

        self.setSelectedOpt = function(target){
            var dom = target.options[target.seletedIndex];
            if (dom) {
                dom.style.background = "#eff3f8";
                dom.scrollIntoView();
            }
        };
    
});


riot.tag('itk-slide', ' <yield>', function(opts) {
            var self = this;
            var EL = self.root;
            var config = self.opts.opts || self.opts;
            var js = document.scripts;
            var path = '';
            var jsPath = '';


            for (var i = 0; i < js.length; i++) {
                if (!js[i].src) {
                    continue;
                }
                if (/itoolkit.min.js|itoolkit.js/.test(js[i].src)) {
                    jsPath = js[i].src.replace(/itoolkit.min.js|itoolkit.js/, '');
                    break;
                }
            }

            path = jsPath + 'plugins/';

            self.loadSource = function(path) {
                utils.jsLoader([
                    path + 'slick/slick.css',
                    path + 'slick/slick-theme.css',
                    path + 'slick/slick.js',
                ], function () {
                    $(EL).slick(config);
                    EL.style.visibility = 'visible';
                });
            }

            if (typeof jQuery == 'undefined') {
                utils.jsLoader([
                    path + 'jquery/jquery-1.12.0.min.js',
                ], function () {
                    self.loadSource(path);
                });
            } else {
                self.loadSource(path);
            }            
        
});
riot.tag('itk-table', '<yield>', function(opts) {
        var self = this;
        var config = self.opts.opts || self.opts;
        var EL = self.root;
        
        self.init = function() {
            EL.style.display = 'block';
            for (i in config) {
                if (!self[i]) {
                    self[i] = config[i];
                }
            }
            self.originData = utils.deepCopy(self.data);
            self.update();
        };


        self.on('mount', function() {
            self.init();
        });

        
        self.compare = function(a, b) {
            if (a[self.orderkeyName] > b[self.orderkeyName]) {
                return 1;
            } 
            else if (a[self.orderkeyName] === b[self.orderkeyName]) {
                return 0;
            }
            else {
                return -1;
            }
        }

        self.clearOrder = function() {
            self.ordered = false;
            self.reversed = false;
        }

        
        self.loadData = EL.loadData = function(data) {
            self.data = data;
            self.originData = utils.deepCopy(data);
            self.update();
            return self.data;
        };
        
        
        self.exportData = EL.exportData = function() {
            return self.data;
        }
        
        
        self.reset = EL.reset = function() {
            self.data = utils.deepCopy(self.originData);
            self.update();
        };

        
        self.orderBy = function(col) {
            return function() {
                self.orderkeyName = col;
                if (self.ordered !== col) {
                    if (self.reversed !== col) {
                        self.data = self.data.sort(self.compare)
                    }
                    else {
                        self.data = self.data.reverse();
                    }
                    self.ordered = col;
                    self.reversed = false;
                    self.update()
                }
                return self.data;
            }
        };

        EL.orderBy = function(col) {
            self.orderBy(col)();
        };

        
        self.reverseBy = function(col) {
            return function() {
                self.orderkeyName = col;
                if (self.reversed !== col) {
                    if (self.ordered !== col) {
                        self.data = self.data.sort(self.compare);
                        self.data = self.data.reverse();
                    }
                    else {
                        self.data = self.data.reverse();
                    }
                    self.ordered = false;
                    self.reversed = col;
                    self.update()
                }
                return self.data;
            }
        };
        
        EL.reverseBy = function(col) {
            self.reverseBy(col)();
        };
        
        self.toggleBy = function(col) {
            if (self.ordered === col) {
                return self.reverseBy(col);
            }
            else {
                return self.orderBy(col);
            }
        };

        EL.toggleBy = function(col) {
            if (self.ordered === col) {
                EL.reverseBy(col);
            }
            else {
                EL.orderBy(col);
            }
        };

        
        
        self.append = function(rows) {
            return function() {
                self.clearOrder();
                if (utils.isObject(rows)) {
                    self.data.push(rows);
                }
                else if (utils.isArray(rows)) {
                    self.data = self.data.concat(rows);
                }
                self.update();
            }
        };

        EL.append = function(rows) {
            self.append(rows)();
        };
        
        
        self.prepend = function(rows) {
            return function() {
                self.clearOrder();
                if (utils.isObject(rows)) {
                    self.data.unshift(rows);
                }
                else if (utils.isArray(rows)) {
                    self.data = rows.concat(self.data);
                }
                self.update();
            }
        };
        EL.prepend = function(rows) {
            self.prepend(rows)();
        };
        
        
        self.deleteBy = function(col, value) {
            return function() {
                if (col && value) {
                    self.clearOrder();
                    for (var i = 0 ; i < self.data.length; i++) {
                        if (self.data[i][col] === value) {
                            self.data.splice(i, 1);
                            i = i - 1;
                        }
                    }
                    self.update();
                }
            };
        }

        EL.deleteBy = function (col, value) {
            self.deleteBy(col, value)();
        }


    
});
riot.tag('itk-tree-item', '<input type="checkbox" __checked="{ item.selected }" if="{ parent.rootConfig.showCheck }" onchange="{ checkHandle }"> <i class="tree-item-{ iconType } { open: item.opened }" onclick="{ toggle }" if="{ item.children }"></i> <i class="tree-item-icon" if="{ item.children }"></i> <i class="tree-no-{ iconType }" if="{ !item.children }"></i> <div onclick="{ leftClick }">{ item.name }</div>', function(opts) {
    
    var self = this;
    self.iconType = self.parent.rootConfig.iconType || 'arrow';
    
    
    self.selectchildren = function(item, bool) {
        var selectChildItem = function(item) {
            if (item && item.children) {
                for(var i = 0; i < item.children.length; i++) {
                    item.children[i].selected = bool;
                    selectChildItem(item.children[i]);
                }
            }
        };
        selectChildItem(item, bool);
        self.parent.treeroot.update();
    };

    
    self.cancelParent = function(item) {
        var cancelParentSelect = function(item) {
            if (item && item.pnode) {
                item.pnode.selected = false;
                cancelParentSelect(item.pnode);
            }
        };
        cancelParentSelect(item);
        self.parent.treeroot.update();
    };

    
    this.checkHandle = function(e) {
        var config = self.parent.rootConfig
        var checkCb = config.onCheck;
        var uncheckCb = config.onUnCheck;
        if (self.item.selected) {
            self.item.selected = false;
            uncheckCb && uncheckCb(self.item, e.target);

            if (config.link) {
                self.selectchildren(self.item, false);
                self.cancelParent(self.item);
            }
        }
        else if (!self.item.selected) {
            self.item.selected = true;
            checkCb && checkCb(self.item, e.target);
            if (config.link) {
                self.selectchildren(self.item, true);
            }
        }
    }.bind(this);
    
    
    this.toggle = function(e) {
        if (self.item.opened === true) {
            self.item.opened = false;
        }
        else {
            self.item.opened = true;
        }
        self.parent.treeroot.update();
    }.bind(this);

    
    this.leftClick = function(e) {
        var config = self.parent.rootConfig;
        if (config.folder && config.children) {
            if (self.item.opened === true) {
                self.item.opened = false;
            }
            else {
                self.item.opened = true;
            }
        }
        else {
            var leftClick = config.onLeftClick;
            if (leftClick) {
                leftClick(self.item, e.target);
            }
        }
    }.bind(this);


});

riot.tag('itk-tree', '<div class="tree-item-wrap" each="{ item, i in data }" onselectstart="return false" ondragstart="return false"> <itk-tree-item class="tree-item-row { root: item.level==1 }" riot-style="padding-left: { countPadding(item.level) }"></itk-tree-item> <ul class="tree-child-wrap" if="{ item.opened && item.children }"> <itk-tree data="{ item.children }"></itk-tree> </ul> </div>', function(opts) {
    var self = this;
    self.config = self.opts.opts || self.opts;

    
    self.dataHandle = function(data, idName, pidName) {
        var data = data || []
        var id = idName || 'id';
        var pid = pidName || 'pid';

        var dataMap = {};
        data.forEach(function(node) {
            if (self.config.name) {
                node.name = node[self.config.name];
            }
            dataMap[node[id]] = node;
        });

        var tree = [];
        data.forEach(function(node) {
            var parent = dataMap[node[pid]];
            if (parent) {
                if (!parent.children) {
                    parent.children = [];
                }
                node.pnode = parent;
                parent.children.push(node);
            }
            else {
                tree.push(node);
            }
        });

        var countLevel = function(tree, level) {
            var level = level + 1;
            tree.forEach(function(item) {
                item.level = level - 1;

                if (item.level < (self.config.openLevel + 1)) {
                    item.opened = true;
                }
                if (item.children) {
                    countLevel(item.children, level);
                }
            })
        };
        countLevel(tree, 1);
        return tree;

    };
    
    
    if (!self.parent || self.parent.root.tagName !== 'ITK-TREE') {
        if (self.config.handleData) {
            var tree = self.dataHandle(self.config.data);
            self.data = tree;
        }
        self.rootConfig = self.config;
        self.treeroot = self;
    }
    else {
        self.data = self.config.data;
        self.rootConfig = self.parent.rootConfig || self.parent.parent.rootConfig;
        self.treeroot = self.parent.treeroot || self.parent.parent.treeroot;
    }
    self.treeroot.update();
    
    
    
    this.countPadding = function(level) {
        var padding = self.rootConfig.padding || 20;
        return (level - 1) * padding + 'px';
    }.bind(this);
    
    
});
riot.tag('itk-uploader', '<yield> <div class="itk-uploader-btn" name="uploadBtn"> <span class="icon"></span> <span class="text">{ text }</span> </div>', function(opts) {

            var self = this;
            var EL = self.root;
            var config = self.opts.opts || self.opts;

            self.text = config.buttonText || '上传文件';

            var js = document.scripts;
            var jsPath = '';
            for (var i = 0; i < js.length; i++) {
                if (!js[i].src) {
                    continue;
                }
                if (/itoolkit.min.js|itoolkit.js/.test(js[i].src)) {
                    jsPath = js[i].src.replace(/itoolkit.min.js|itoolkit.js/, '');
                    break;
                }
            }
            path = jsPath + 'plugins/uploader/';
            var sourceArr = [
                path + 'SimpleAjaxUploader.min.js',
            ];

            self.on('mount', function () {

                var defaultBtn = EL.querySelector('.itk-uploader-btn');

                if (EL.firstElementChild === defaultBtn && !config.btn) { // 默认按钮
                    defaultBtn.style.display = 'inline-block';
                }
                else if (EL.firstElementChild !== defaultBtn && !config.btn) { // 控件内第一个元素作为按钮
                    defaultBtn = EL.firstElementChild;
                }// else 则是用户在配置中指定了 btn

                utils.jsLoader(sourceArr, function () {

                    var json = {};
                    json.button = config.btn || defaultBtn;

                    json.url = config.url ? config.url : "";
                    json.name = config.name ? config.name : "";
                    json.multipart = config.multipart ? config.multipart : true;
                    json.responseType = config.responseType ? config.responseType : "";
                    json.startXHR = config.startXHR ? config.startXHR : null;
                    json.onSubmit = config.onSubmit ? config.onSubmit : null;
                    json.onComplete = config.onComplete ? config.onComplete : null;
                    json.onError = config.onError ? config.onError : null;

                    var uploader = new ss.SimpleUpload(json);
                });
            })
        
});
