// \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
var __exportAll = (all, flags) => {
	let target = Object.setPrototypeOf({}, null);
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!(flags & 1)) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return flags & 2 ? target : Object.preventExtensions(target);
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") {
		for (let key of __getOwnPropNames(from)) if (!__hasOwnProp.call(to, key) && key !== except) {
			desc = __getOwnPropDesc(from, key);
			__defProp(to, key, {
				get: desc && desc.get && !desc.configurable ? desc.get : () => from[key],
				enumerable: !desc || desc.enumerable
			});
		}
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
// \0vite/modulepreload-polyfill.js
(function polyfill() {
	const relList = document.createElement("link").relList;
	if (relList && relList.supports && relList.supports("modulepreload")) return;
	for (const link of document.querySelectorAll("link[rel=\"modulepreload\"]")) processPreload(link);
	new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type !== "childList") continue;
			for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
		}
	}).observe(document, {
		childList: true,
		subtree: true
	});
	function getFetchOpts(link) {
		const fetchOpts = {};
		if (link.integrity) fetchOpts.integrity = link.integrity;
		if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
		if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
		else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
		else fetchOpts.credentials = "same-origin";
		return fetchOpts;
	}
	function processPreload(link) {
		if (link.ep) return;
		link.ep = true;
		const fetchOpts = getFetchOpts(link);
		fetch(link.href, fetchOpts);
	}
})();
// node_modules/scheduler/cjs/scheduler.production.js
/**
* @license React
* scheduler.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_scheduler_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	function push(heap, node) {
		var index = heap.length;
		heap.push(node);
		a: for (; 0 < index;) {
			var parentIndex = index - 1 >>> 1, parent = heap[parentIndex];
			if (0 < compare(parent, node)) heap[parentIndex] = node, heap[index] = parent, index = parentIndex;
			else break a;
		}
	}
	function peek(heap) {
		return 0 === heap.length ? null : heap[0];
	}
	function pop(heap) {
		if (0 === heap.length) return null;
		var first = heap[0], last = heap.pop();
		if (last !== first) {
			heap[0] = last;
			a: for (var index = 0, length = heap.length, halfLength = length >>> 1; index < halfLength;) {
				var leftIndex = 2 * (index + 1) - 1, left = heap[leftIndex], rightIndex = leftIndex + 1, right = heap[rightIndex];
				if (0 > compare(left, last)) rightIndex < length && 0 > compare(right, left) ? (heap[index] = right, heap[rightIndex] = last, index = rightIndex) : (heap[index] = left, heap[leftIndex] = last, index = leftIndex);
				else if (rightIndex < length && 0 > compare(right, last)) heap[index] = right, heap[rightIndex] = last, index = rightIndex;
				else break a;
			}
		}
		return first;
	}
	function compare(a, b) {
		var diff = a.sortIndex - b.sortIndex;
		return 0 !== diff ? diff : a.id - b.id;
	}
	exports.unstable_now = void 0;
	if ("object" === typeof performance && "function" === typeof performance.now) {
		var localPerformance = performance;
		exports.unstable_now = function() {
			return localPerformance.now();
		};
	} else {
		var localDate = Date, initialTime = localDate.now();
		exports.unstable_now = function() {
			return localDate.now() - initialTime;
		};
	}
	var taskQueue = [];
	var timerQueue = [];
	var taskIdCounter = 1;
	var currentTask = null;
	var currentPriorityLevel = 3;
	var isPerformingWork = !1;
	var isHostCallbackScheduled = !1;
	var isHostTimeoutScheduled = !1;
	var needsPaint = !1;
	var localSetTimeout = "function" === typeof setTimeout ? setTimeout : null;
	var localClearTimeout = "function" === typeof clearTimeout ? clearTimeout : null;
	var localSetImmediate = "undefined" !== typeof setImmediate ? setImmediate : null;
	function advanceTimers(currentTime) {
		for (var timer = peek(timerQueue); null !== timer;) {
			if (null === timer.callback) pop(timerQueue);
			else if (timer.startTime <= currentTime) pop(timerQueue), timer.sortIndex = timer.expirationTime, push(taskQueue, timer);
			else break;
			timer = peek(timerQueue);
		}
	}
	function handleTimeout(currentTime) {
		isHostTimeoutScheduled = !1;
		advanceTimers(currentTime);
		if (!isHostCallbackScheduled) if (null !== peek(taskQueue)) isHostCallbackScheduled = !0, isMessageLoopRunning || (isMessageLoopRunning = !0, schedulePerformWorkUntilDeadline());
		else {
			var firstTimer = peek(timerQueue);
			null !== firstTimer && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
		}
	}
	var isMessageLoopRunning = !1;
	var taskTimeoutID = -1;
	var frameInterval = 5;
	var startTime = -1;
	function shouldYieldToHost() {
		return needsPaint ? !0 : exports.unstable_now() - startTime < frameInterval ? !1 : !0;
	}
	function performWorkUntilDeadline() {
		needsPaint = !1;
		if (isMessageLoopRunning) {
			var currentTime = exports.unstable_now();
			startTime = currentTime;
			var hasMoreWork = !0;
			try {
				a: {
					isHostCallbackScheduled = !1;
					isHostTimeoutScheduled && (isHostTimeoutScheduled = !1, localClearTimeout(taskTimeoutID), taskTimeoutID = -1);
					isPerformingWork = !0;
					var previousPriorityLevel = currentPriorityLevel;
					try {
						b: {
							advanceTimers(currentTime);
							for (currentTask = peek(taskQueue); null !== currentTask && !(currentTask.expirationTime > currentTime && shouldYieldToHost());) {
								var callback = currentTask.callback;
								if ("function" === typeof callback) {
									currentTask.callback = null;
									currentPriorityLevel = currentTask.priorityLevel;
									var continuationCallback = callback(currentTask.expirationTime <= currentTime);
									currentTime = exports.unstable_now();
									if ("function" === typeof continuationCallback) {
										currentTask.callback = continuationCallback;
										advanceTimers(currentTime);
										hasMoreWork = !0;
										break b;
									}
									currentTask === peek(taskQueue) && pop(taskQueue);
									advanceTimers(currentTime);
								} else pop(taskQueue);
								currentTask = peek(taskQueue);
							}
							if (null !== currentTask) hasMoreWork = !0;
							else {
								var firstTimer = peek(timerQueue);
								null !== firstTimer && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
								hasMoreWork = !1;
							}
						}
						break a;
					} finally {
						currentTask = null, currentPriorityLevel = previousPriorityLevel, isPerformingWork = !1;
					}
					hasMoreWork = void 0;
				}
			} finally {
				hasMoreWork ? schedulePerformWorkUntilDeadline() : isMessageLoopRunning = !1;
			}
		}
	}
	var schedulePerformWorkUntilDeadline;
	if ("function" === typeof localSetImmediate) schedulePerformWorkUntilDeadline = function() {
		localSetImmediate(performWorkUntilDeadline);
	};
	else if ("undefined" !== typeof MessageChannel) {
		var channel = new MessageChannel(), port = channel.port2;
		channel.port1.onmessage = performWorkUntilDeadline;
		schedulePerformWorkUntilDeadline = function() {
			port.postMessage(null);
		};
	} else schedulePerformWorkUntilDeadline = function() {
		localSetTimeout(performWorkUntilDeadline, 0);
	};
	function requestHostTimeout(callback, ms) {
		taskTimeoutID = localSetTimeout(function() {
			callback(exports.unstable_now());
		}, ms);
	}
	exports.unstable_IdlePriority = 5;
	exports.unstable_ImmediatePriority = 1;
	exports.unstable_LowPriority = 4;
	exports.unstable_NormalPriority = 3;
	exports.unstable_Profiling = null;
	exports.unstable_UserBlockingPriority = 2;
	exports.unstable_cancelCallback = function(task) {
		task.callback = null;
	};
	exports.unstable_forceFrameRate = function(fps) {
		0 > fps || 125 < fps ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : frameInterval = 0 < fps ? Math.floor(1e3 / fps) : 5;
	};
	exports.unstable_getCurrentPriorityLevel = function() {
		return currentPriorityLevel;
	};
	exports.unstable_next = function(eventHandler) {
		switch (currentPriorityLevel) {
			case 1:
			case 2:
			case 3:
				var priorityLevel = 3;
				break;
			default: priorityLevel = currentPriorityLevel;
		}
		var previousPriorityLevel = currentPriorityLevel;
		currentPriorityLevel = priorityLevel;
		try {
			return eventHandler();
		} finally {
			currentPriorityLevel = previousPriorityLevel;
		}
	};
	exports.unstable_requestPaint = function() {
		needsPaint = !0;
	};
	exports.unstable_runWithPriority = function(priorityLevel, eventHandler) {
		switch (priorityLevel) {
			case 1:
			case 2:
			case 3:
			case 4:
			case 5: break;
			default: priorityLevel = 3;
		}
		var previousPriorityLevel = currentPriorityLevel;
		currentPriorityLevel = priorityLevel;
		try {
			return eventHandler();
		} finally {
			currentPriorityLevel = previousPriorityLevel;
		}
	};
	exports.unstable_scheduleCallback = function(priorityLevel, callback, options) {
		var currentTime = exports.unstable_now();
		"object" === typeof options && null !== options ? (options = options.delay, options = "number" === typeof options && 0 < options ? currentTime + options : currentTime) : options = currentTime;
		switch (priorityLevel) {
			case 1:
				var timeout = -1;
				break;
			case 2:
				timeout = 250;
				break;
			case 5:
				timeout = 0x3fffffff;
				break;
			case 4:
				timeout = 1e4;
				break;
			default: timeout = 5e3;
		}
		timeout = options + timeout;
		priorityLevel = {
			id: taskIdCounter++,
			callback,
			priorityLevel,
			startTime: options,
			expirationTime: timeout,
			sortIndex: -1
		};
		options > currentTime ? (priorityLevel.sortIndex = options, push(timerQueue, priorityLevel), null === peek(taskQueue) && priorityLevel === peek(timerQueue) && (isHostTimeoutScheduled ? (localClearTimeout(taskTimeoutID), taskTimeoutID = -1) : isHostTimeoutScheduled = !0, requestHostTimeout(handleTimeout, options - currentTime))) : (priorityLevel.sortIndex = timeout, push(taskQueue, priorityLevel), isHostCallbackScheduled || isPerformingWork || (isHostCallbackScheduled = !0, isMessageLoopRunning || (isMessageLoopRunning = !0, schedulePerformWorkUntilDeadline())));
		return priorityLevel;
	};
	exports.unstable_shouldYield = shouldYieldToHost;
	exports.unstable_wrapCallback = function(callback) {
		var parentPriorityLevel = currentPriorityLevel;
		return function() {
			var previousPriorityLevel = currentPriorityLevel;
			currentPriorityLevel = parentPriorityLevel;
			try {
				return callback.apply(this, arguments);
			} finally {
				currentPriorityLevel = previousPriorityLevel;
			}
		};
	};
}));
// node_modules/scheduler/index.js
var require_scheduler = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_scheduler_production();
}));
// node_modules/react/cjs/react.production.js
/**
* @license React
* react.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	};
	var assign = Object.assign;
	var emptyObject = {};
	function Component(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function(partialState, callback) {
		if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function(callback) {
		this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = !0;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = {
		H: null,
		A: null,
		T: null,
		S: null
	};
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
		var refProp = props.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== refProp ? refProp : null,
			props
		};
	}
	function cloneAndReplaceKey(oldElement, newKey) {
		return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
		return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
	}
	function escape(key) {
		var escaperLookup = {
			"=": "=0",
			":": "=2"
		};
		return "$" + key.replace(/[=:]/g, function(match) {
			return escaperLookup[match];
		});
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
		return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
	}
	function resolveThenable(thenable) {
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected": throw thenable.reason;
			default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
				"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
			}, function(error) {
				"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			})), thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
			}
		}
		throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
		var type = typeof children;
		if ("undefined" === type || "boolean" === type) children = null;
		var invokeCallback = !1;
		if (null === children) invokeCallback = !0;
		else switch (type) {
			case "bigint":
			case "string":
			case "number":
				invokeCallback = !0;
				break;
			case "object": switch (children.$$typeof) {
				case REACT_ELEMENT_TYPE:
				case REACT_PORTAL_TYPE:
					invokeCallback = !0;
					break;
				case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
			}
		}
		if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
			return c;
		})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
		invokeCallback = 0;
		var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
		if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if ("object" === type) {
			if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
			array = String(children);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
		}
		return invokeCallback;
	}
	function mapChildren(children, func, context) {
		if (null == children) return children;
		var result = [], count = 0;
		mapIntoArray(children, result, "", "", function(child) {
			return func.call(context, child, count++);
		});
		return result;
	}
	function lazyInitializer(payload) {
		if (-1 === payload._status) {
			var thenable = (0, payload._result)();
			thenable.then(function(moduleObject) {
				if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
			}, function(error) {
				if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			});
			-1 === payload._status && (payload._status = 0, payload._result = thenable);
		}
		if (1 === payload._status) return payload._result.default;
		throw payload._result;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	function startTransition(scope) {
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		try {
			var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
		} catch (error) {
			reportGlobalError(error);
		} finally {
			null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function addTransitionType(type) {
		var transition = ReactSharedInternals.T;
		if (null !== transition) {
			var transitionTypes = transition.types;
			null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
		} else startTransition(addTransitionType.bind(null, type));
	}
	var Children = {
		map: mapChildren,
		forEach: function(children, forEachFunc, forEachContext) {
			mapChildren(children, function() {
				forEachFunc.apply(this, arguments);
			}, forEachContext);
		},
		count: function(children) {
			var n = 0;
			mapChildren(children, function() {
				n++;
			});
			return n;
		},
		toArray: function(children) {
			return mapChildren(children, function(child) {
				return child;
			}) || [];
		},
		only: function(children) {
			if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
			return children;
		}
	};
	exports.Activity = REACT_ACTIVITY_TYPE;
	exports.Children = Children;
	exports.Component = Component;
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.Profiler = REACT_PROFILER_TYPE;
	exports.PureComponent = PureComponent;
	exports.StrictMode = REACT_STRICT_MODE_TYPE;
	exports.Suspense = REACT_SUSPENSE_TYPE;
	exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
	exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
	exports.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(size) {
			return ReactSharedInternals.H.useMemoCache(size);
		}
	};
	exports.addTransitionType = addTransitionType;
	exports.cache = function(fn) {
		return function() {
			return fn.apply(null, arguments);
		};
	};
	exports.cacheSignal = function() {
		return null;
	};
	exports.cloneElement = function(element, config, children) {
		if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
		var props = assign({}, element.props), key = element.key;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
		var propName = arguments.length - 2;
		if (1 === propName) props.children = children;
		else if (1 < propName) {
			for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		return ReactElement(element.type, key, props);
	};
	exports.createContext = function(defaultValue) {
		defaultValue = {
			$$typeof: REACT_CONTEXT_TYPE,
			_currentValue: defaultValue,
			_currentValue2: defaultValue,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		};
		defaultValue.Provider = defaultValue;
		defaultValue.Consumer = {
			$$typeof: REACT_CONSUMER_TYPE,
			_context: defaultValue
		};
		return defaultValue;
	};
	exports.createElement = function(type, config, children) {
		var propName, props = {}, key = null;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
		var childrenLength = arguments.length - 2;
		if (1 === childrenLength) props.children = children;
		else if (1 < childrenLength) {
			for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
		return ReactElement(type, key, props);
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(render) {
		return {
			$$typeof: REACT_FORWARD_REF_TYPE,
			render
		};
	};
	exports.isValidElement = isValidElement;
	exports.lazy = function(ctor) {
		return {
			$$typeof: REACT_LAZY_TYPE,
			_payload: {
				_status: -1,
				_result: ctor
			},
			_init: lazyInitializer
		};
	};
	exports.memo = function(type, compare) {
		return {
			$$typeof: REACT_MEMO_TYPE,
			type,
			compare: void 0 === compare ? null : compare
		};
	};
	exports.startTransition = startTransition;
	exports.unstable_useCacheRefresh = function() {
		return ReactSharedInternals.H.useCacheRefresh();
	};
	exports.use = function(usable) {
		return ReactSharedInternals.H.use(usable);
	};
	exports.useActionState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	exports.useCallback = function(callback, deps) {
		return ReactSharedInternals.H.useCallback(callback, deps);
	};
	exports.useContext = function(Context) {
		return ReactSharedInternals.H.useContext(Context);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(value, initialValue) {
		return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	exports.useEffect = function(create, deps) {
		return ReactSharedInternals.H.useEffect(create, deps);
	};
	exports.useEffectEvent = function(callback) {
		return ReactSharedInternals.H.useEffectEvent(callback);
	};
	exports.useId = function() {
		return ReactSharedInternals.H.useId();
	};
	exports.useImperativeHandle = function(ref, create, deps) {
		return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	exports.useInsertionEffect = function(create, deps) {
		return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	exports.useLayoutEffect = function(create, deps) {
		return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	exports.useMemo = function(create, deps) {
		return ReactSharedInternals.H.useMemo(create, deps);
	};
	exports.useOptimistic = function(passthrough, reducer) {
		return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	exports.useReducer = function(reducer, initialArg, init) {
		return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	exports.useRef = function(initialValue) {
		return ReactSharedInternals.H.useRef(initialValue);
	};
	exports.useState = function(initialState) {
		return ReactSharedInternals.H.useState(initialState);
	};
	exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
		return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	};
	exports.useTransition = function() {
		return ReactSharedInternals.H.useTransition();
	};
	exports.version = "19.3.1";
}));
// node_modules/react/index.js
var require_react = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_production();
}));
// node_modules/react-dom/cjs/react-dom.production.js
/**
* @license React
* react-dom.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_dom_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var React = require_react();
	function formatProdErrorMessage(code) {
		var url = "https://react.dev/errors/" + code;
		if (1 < arguments.length) {
			url += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
		}
		return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function noop() {}
	var Internals = {
		d: {
			f: noop,
			r: function() {
				throw Error(formatProdErrorMessage(522));
			},
			D: noop,
			C: noop,
			L: noop,
			m: noop,
			X: noop,
			S: noop,
			M: noop
		},
		p: 0,
		findDOMNode: null
	};
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable");
	var REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key");
	function createPortal$1(children, containerInfo, implementation) {
		var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
		return {
			$$typeof: REACT_PORTAL_TYPE,
			key: null == key ? null : key === REACT_OPTIMISTIC_KEY ? REACT_OPTIMISTIC_KEY : "" + key,
			children,
			containerInfo,
			implementation
		};
	}
	var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	function getCrossOriginStringAs(as, input) {
		if ("font" === as) return "";
		if ("string" === typeof input) return "use-credentials" === input ? input : "";
	}
	exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
	exports.browser = function(reason) {
		return {
			$$typeof: REACT_RECOVERABLE_TYPE,
			_reason: reason
		};
	};
	exports.createPortal = function(children, container) {
		var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
		if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType) throw Error(formatProdErrorMessage(299));
		return createPortal$1(children, container, null, key);
	};
	exports.flushSync = function(fn) {
		var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
		try {
			if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
		} finally {
			ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
		}
	};
	exports.preconnect = function(href, options) {
		"string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
	};
	exports.prefetchDNS = function(href) {
		"string" === typeof href && Internals.d.D(href);
	};
	exports.preinit = function(href, options) {
		if ("string" === typeof href && options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
			"style" === as ? Internals.d.S(href, "string" === typeof options.precedence ? options.precedence : void 0, {
				crossOrigin,
				integrity,
				fetchPriority
			}) : "script" === as && Internals.d.X(href, {
				crossOrigin,
				integrity,
				fetchPriority,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0
			});
		}
	};
	exports.preinitModule = function(href, options) {
		if ("string" === typeof href) if ("object" === typeof options && null !== options) {
			if (null == options.as || "script" === options.as) {
				var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
				Internals.d.M(href, {
					crossOrigin,
					integrity: "string" === typeof options.integrity ? options.integrity : void 0,
					nonce: "string" === typeof options.nonce ? options.nonce : void 0,
					fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
				});
			}
		} else options ?? Internals.d.M(href);
	};
	exports.preload = function(href, options) {
		if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
			var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
			Internals.d.L(href, as, {
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				type: "string" === typeof options.type ? options.type : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
				referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
				imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
				imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
				media: "string" === typeof options.media ? options.media : void 0
			});
		}
	};
	exports.preloadModule = function(href, options) {
		if ("string" === typeof href) if (options) {
			var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
			Internals.d.m(href, {
				as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
				crossOrigin,
				integrity: "string" === typeof options.integrity ? options.integrity : void 0,
				nonce: "string" === typeof options.nonce ? options.nonce : void 0,
				fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0
			});
		} else Internals.d.m(href);
	};
	exports.requestFormReset = function(form) {
		Internals.d.r(form);
	};
	exports.unstable_batchedUpdates = function(fn, a) {
		return fn(a);
	};
	exports.useFormState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useFormState(action, initialState, permalink);
	};
	exports.useFormStatus = function() {
		return ReactSharedInternals.H.useHostTransitionStatus();
	};
	exports.version = "19.3.1";
}));
// node_modules/react-dom/index.js
var require_react_dom = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function checkDCE() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") return;
		try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
		} catch (err) {
			console.error(err);
		}
	}
	checkDCE();
	module.exports = require_react_dom_production();
}));
// node_modules/react-dom/cjs/react-dom-client.production.js
/**
* @license React
* react-dom-client.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_dom_client_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var Scheduler = require_scheduler();
	var React = require_react();
	var ReactDOM = require_react_dom();
	function formatProdErrorMessage(code) {
		var url = "https://react.dev/errors/" + code;
		if (1 < arguments.length) {
			url += "?args[]=" + encodeURIComponent(arguments[1]);
			for (var i = 2; i < arguments.length; i++) url += "&args[]=" + encodeURIComponent(arguments[i]);
		}
		return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
	}
	function isValidContainer(node) {
		return !(!node || 1 !== node.nodeType && 9 !== node.nodeType && 11 !== node.nodeType);
	}
	function getNearestMountedFiber(fiber) {
		for (var node = fiber, nextNode = node; nextNode && !nextNode.alternate;) node = nextNode, 0 !== (node.flags & 4098) && (fiber = node.return), nextNode = node.return;
		for (; node.return;) node = node.return;
		return 3 === node.tag ? fiber : null;
	}
	function getSuspenseInstanceFromFiber(fiber) {
		if (13 === fiber.tag) {
			var suspenseState = fiber.memoizedState;
			null === suspenseState && (fiber = fiber.alternate, null !== fiber && (suspenseState = fiber.memoizedState));
			if (null !== suspenseState) return suspenseState.dehydrated;
		}
		return null;
	}
	function getActivityInstanceFromFiber(fiber) {
		if (31 === fiber.tag) {
			var activityState = fiber.memoizedState;
			null === activityState && (fiber = fiber.alternate, null !== fiber && (activityState = fiber.memoizedState));
			if (null !== activityState) return activityState.dehydrated;
		}
		return null;
	}
	function assertIsMounted(fiber) {
		if (getNearestMountedFiber(fiber) !== fiber) throw Error(formatProdErrorMessage(188));
	}
	function findCurrentFiberUsingSlowPath(fiber) {
		var alternate = fiber.alternate;
		if (!alternate) {
			alternate = getNearestMountedFiber(fiber);
			if (null === alternate) throw Error(formatProdErrorMessage(188));
			return alternate !== fiber ? null : fiber;
		}
		for (var a = fiber, b = alternate;;) {
			var parentA = a.return;
			if (null === parentA) break;
			var parentB = parentA.alternate;
			if (null === parentB) {
				b = parentA.return;
				if (null !== b) {
					a = b;
					continue;
				}
				break;
			}
			if (parentA.child === parentB.child) {
				for (parentB = parentA.child; parentB;) {
					if (parentB === a) return assertIsMounted(parentA), fiber;
					if (parentB === b) return assertIsMounted(parentA), alternate;
					parentB = parentB.sibling;
				}
				throw Error(formatProdErrorMessage(188));
			}
			if (a.return !== b.return) a = parentA, b = parentB;
			else {
				for (var didFindChild = !1, child$0 = parentA.child; child$0;) {
					if (child$0 === a) {
						didFindChild = !0;
						a = parentA;
						b = parentB;
						break;
					}
					if (child$0 === b) {
						didFindChild = !0;
						b = parentA;
						a = parentB;
						break;
					}
					child$0 = child$0.sibling;
				}
				if (!didFindChild) {
					for (child$0 = parentB.child; child$0;) {
						if (child$0 === a) {
							didFindChild = !0;
							a = parentB;
							b = parentA;
							break;
						}
						if (child$0 === b) {
							didFindChild = !0;
							b = parentB;
							a = parentA;
							break;
						}
						child$0 = child$0.sibling;
					}
					if (!didFindChild) throw Error(formatProdErrorMessage(189));
				}
			}
			if (a.alternate !== b) throw Error(formatProdErrorMessage(190));
		}
		if (3 !== a.tag) throw Error(formatProdErrorMessage(188));
		return a.stateNode.current === a ? fiber : alternate;
	}
	function findCurrentHostFiberImpl(node) {
		var tag = node.tag;
		if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node;
		for (node = node.child; null !== node;) {
			tag = findCurrentHostFiberImpl(node);
			if (null !== tag) return tag;
			node = node.sibling;
		}
		return null;
	}
	function traverseVisibleInstancesAndTextInstances(child, searchWithinHosts, fn, a, b, c) {
		for (; null !== child;) {
			if ((5 === child.tag || 27 === child.tag || 6 === child.tag) && fn(child, a, b, c) || (22 !== child.tag || null === child.memoizedState) && (searchWithinHosts || 5 !== child.tag && 27 !== child.tag) && traverseVisibleInstancesAndTextInstances(child.child, searchWithinHosts, fn, a, b, c)) return !0;
			child = child.sibling;
		}
		return !1;
	}
	function getFragmentParentInstanceOrContainerFiber(fiber) {
		for (fiber = fiber.return; null !== fiber;) {
			if (3 === fiber.tag || 5 === fiber.tag || 27 === fiber.tag) return fiber;
			fiber = fiber.return;
		}
		return null;
	}
	function fiberIsPortaledIntoHost(fiber) {
		var foundPortalParent = !1;
		for (fiber = fiber.return; null !== fiber;) {
			4 === fiber.tag && (foundPortalParent = !0);
			if (3 === fiber.tag || 5 === fiber.tag || 27 === fiber.tag) break;
			fiber = fiber.return;
		}
		return foundPortalParent;
	}
	function getFragmentInstanceOrTextInstanceSiblings(fiber) {
		var result = [null, null], parentHostFiber = getFragmentParentInstanceOrContainerFiber(fiber);
		if (null === parentHostFiber) return result;
		findFragmentInstanceOrTextInstanceSiblings(result, fiber, parentHostFiber.child, { foundSelf: !1 });
		return result;
	}
	function findFragmentInstanceOrTextInstanceSiblings(result, self, child, state) {
		for (; null !== child;) {
			if (child === self) state.foundSelf = !0;
			else if (5 === child.tag || 27 === child.tag || 6 === child.tag) {
				if (state.foundSelf) return result[1] = child, !0;
				result[0] = child;
			} else if ((22 !== child.tag || null === child.memoizedState) && findFragmentInstanceOrTextInstanceSiblings(result, self, child.child, state)) return !0;
			child = child.sibling;
		}
		return !1;
	}
	function getInstanceFromHostFiber(fiber) {
		switch (fiber.tag) {
			case 5:
			case 27:
			case 6: return fiber.stateNode;
			case 3: return fiber.stateNode.containerInfo;
			default: throw Error(formatProdErrorMessage(559));
		}
	}
	var searchTarget = null;
	var searchBoundary = null;
	function isFiberPrecedingCheck(child, target, boundary) {
		return child === boundary ? !0 : child === target ? (searchTarget = child, !0) : !1;
	}
	function isFiberFollowingCheck(child, target, boundary) {
		return child === boundary ? (searchBoundary = child, !1) : child === target ? (null !== searchBoundary && (searchTarget = child), !0) : !1;
	}
	function getParentForFragmentAncestors(inst) {
		if (null === inst) return null;
		do
			inst = null === inst ? null : inst.return;
		while (inst && 5 !== inst.tag && 27 !== inst.tag && 3 !== inst.tag);
		return inst ? inst : null;
	}
	function getLowestCommonAncestor(instA, instB, getParent) {
		for (var depthA = 0, tempA = instA; tempA; tempA = getParent(tempA)) depthA++;
		tempA = 0;
		for (var tempB = instB; tempB; tempB = getParent(tempB)) tempA++;
		for (; 0 < depthA - tempA;) instA = getParent(instA), depthA--;
		for (; 0 < tempA - depthA;) instB = getParent(instB), tempA--;
		for (; depthA--;) {
			if (instA === instB || null !== instB && instA === instB.alternate) return instA;
			instA = getParent(instA);
			instB = getParent(instB);
		}
		return null;
	}
	var assign = Object.assign;
	var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element");
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
	var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
	function getComponentNameFromType(type) {
		if (null == type) return null;
		if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
		if ("string" === typeof type) return type;
		switch (type) {
			case REACT_FRAGMENT_TYPE: return "Fragment";
			case REACT_PROFILER_TYPE: return "Profiler";
			case REACT_STRICT_MODE_TYPE: return "StrictMode";
			case REACT_SUSPENSE_TYPE: return "Suspense";
			case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
			case REACT_ACTIVITY_TYPE: return "Activity";
			case REACT_VIEW_TRANSITION_TYPE: return "ViewTransition";
		}
		if ("object" === typeof type) switch (type.$$typeof) {
			case REACT_PORTAL_TYPE: return "Portal";
			case REACT_CONTEXT_TYPE: return type.displayName || "Context";
			case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
			case REACT_FORWARD_REF_TYPE:
				var innerType = type.render;
				type = type.displayName;
				type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
				return type;
			case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
			case REACT_LAZY_TYPE:
				innerType = type._payload;
				type = type._init;
				try {
					return getComponentNameFromType(type(innerType));
				} catch (x) {}
		}
		return null;
	}
	var isArrayImpl = Array.isArray;
	var ReactSharedInternals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
	var sharedNotPendingObject = {
		pending: !1,
		data: null,
		method: null,
		action: null
	};
	var valueStack = [];
	var index = -1;
	function createCursor(defaultValue) {
		return { current: defaultValue };
	}
	function pop(cursor) {
		0 > index || (cursor.current = valueStack[index], valueStack[index] = null, index--);
	}
	function push(cursor, value) {
		index++;
		valueStack[index] = cursor.current;
		cursor.current = value;
	}
	var contextStackCursor = createCursor(null);
	var contextFiberStackCursor = createCursor(null);
	var rootInstanceStackCursor = createCursor(null);
	var hostTransitionProviderCursor = createCursor(null);
	function pushHostContainer(fiber, nextRootInstance) {
		push(rootInstanceStackCursor, nextRootInstance);
		push(contextFiberStackCursor, fiber);
		push(contextStackCursor, null);
		switch (nextRootInstance.nodeType) {
			case 9:
			case 11:
				fiber = (fiber = nextRootInstance.documentElement) ? (fiber = fiber.namespaceURI) ? getOwnHostContext(fiber) : 0 : 0;
				break;
			default: if (fiber = nextRootInstance.tagName, nextRootInstance = nextRootInstance.namespaceURI) nextRootInstance = getOwnHostContext(nextRootInstance), fiber = getChildHostContextProd(nextRootInstance, fiber);
			else switch (fiber) {
				case "svg":
					fiber = 1;
					break;
				case "math":
					fiber = 2;
					break;
				default: fiber = 0;
			}
		}
		pop(contextStackCursor);
		push(contextStackCursor, fiber);
	}
	function popHostContainer() {
		pop(contextStackCursor);
		pop(contextFiberStackCursor);
		pop(rootInstanceStackCursor);
	}
	function pushHostContext(fiber) {
		var stateHook = fiber.memoizedState;
		null !== stateHook && (HostTransitionContext._currentValue = stateHook.memoizedState, push(hostTransitionProviderCursor, fiber));
		stateHook = contextStackCursor.current;
		var JSCompiler_inline_result = getChildHostContextProd(stateHook, fiber.type);
		stateHook !== JSCompiler_inline_result && (push(contextFiberStackCursor, fiber), push(contextStackCursor, JSCompiler_inline_result));
	}
	function popHostContext(fiber) {
		contextFiberStackCursor.current === fiber && (pop(contextStackCursor), pop(contextFiberStackCursor));
		hostTransitionProviderCursor.current === fiber && (pop(hostTransitionProviderCursor), HostTransitionContext._currentValue = sharedNotPendingObject);
	}
	var prefix;
	var suffix;
	function describeBuiltInComponentFrame(name) {
		if (void 0 === prefix) try {
			throw Error();
		} catch (x) {
			var match = x.stack.trim().match(/\n( *(at )?)/);
			prefix = match && match[1] || "";
			suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
		}
		return "\n" + prefix + name + suffix;
	}
	var reentry = !1;
	function describeNativeComponentFrame(fn, construct) {
		if (!fn || reentry) return "";
		reentry = !0;
		var previousPrepareStackTrace = Error.prepareStackTrace;
		Error.prepareStackTrace = void 0;
		try {
			var RunInRootFrame = { DetermineComponentFrameRoot: function() {
				try {
					if (construct) {
						var Fake = function() {
							throw Error();
						};
						Object.defineProperty(Fake.prototype, "props", { set: function() {
							throw Error();
						} });
						if ("object" === typeof Reflect && Reflect.construct) {
							try {
								Reflect.construct(Fake, []);
							} catch (x) {
								var control = x;
							}
							Reflect.construct(fn, [], Fake);
						} else {
							try {
								Fake.call();
							} catch (x$1) {
								control = x$1;
							}
							Fake = !1;
							try {
								var prevProps = Object.getOwnPropertyDescriptor(fn.prototype, "props");
								Object.defineProperty(fn.prototype, "props", {
									configurable: !0,
									set: function() {
										throw Error();
									}
								});
								Fake = !0;
								new fn();
							} finally {
								Fake && (void 0 !== prevProps ? Object.defineProperty(fn.prototype, "props", prevProps) : delete fn.prototype.props);
							}
						}
					} else {
						try {
							throw Error();
						} catch (x$2) {
							control = x$2;
						}
						(Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {});
					}
				} catch (sample) {
					if (sample && control && "string" === typeof sample.stack) return [sample.stack, control.stack];
				}
				return [null, null];
			} };
			RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
			var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
			namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
			var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
			if (sampleStack && controlStack) {
				var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
				for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot");) RunInRootFrame++;
				for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes("DetermineComponentFrameRoot");) namePropDescriptor++;
				if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length) for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];) namePropDescriptor--;
				for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--) if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
					if (1 !== RunInRootFrame || 1 !== namePropDescriptor) do
						if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
							var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
							fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
							return frame;
						}
					while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
					break;
				}
			}
		} finally {
			reentry = !1, Error.prepareStackTrace = previousPrepareStackTrace;
		}
		return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
	}
	function describeFiber(fiber, childFiber) {
		switch (fiber.tag) {
			case 26:
			case 27:
			case 5: return describeBuiltInComponentFrame(fiber.type);
			case 16: return describeBuiltInComponentFrame("Lazy");
			case 13: return fiber.child !== childFiber && null !== childFiber ? describeBuiltInComponentFrame("Suspense Fallback") : describeBuiltInComponentFrame("Suspense");
			case 19: return describeBuiltInComponentFrame("SuspenseList");
			case 0:
			case 15: return describeNativeComponentFrame(fiber.type, !1);
			case 11: return describeNativeComponentFrame(fiber.type.render, !1);
			case 1: return describeNativeComponentFrame(fiber.type, !0);
			case 31: return describeBuiltInComponentFrame("Activity");
			case 30: return describeBuiltInComponentFrame("ViewTransition");
			default: return "";
		}
	}
	function getStackByFiberInDevAndProd(workInProgress) {
		try {
			var info = "", previous = null;
			do
				info += describeFiber(workInProgress, previous), previous = workInProgress, workInProgress = workInProgress.return;
			while (workInProgress);
			return info;
		} catch (x) {
			return "\nError generating stack: " + x.message + "\n" + x.stack;
		}
	}
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	var scheduleCallback$3 = Scheduler.unstable_scheduleCallback;
	var cancelCallback$1 = Scheduler.unstable_cancelCallback;
	var shouldYield = Scheduler.unstable_shouldYield;
	var requestPaint = Scheduler.unstable_requestPaint;
	var now = Scheduler.unstable_now;
	var getCurrentPriorityLevel = Scheduler.unstable_getCurrentPriorityLevel;
	var ImmediatePriority = Scheduler.unstable_ImmediatePriority;
	var UserBlockingPriority = Scheduler.unstable_UserBlockingPriority;
	var NormalPriority$1 = Scheduler.unstable_NormalPriority;
	var LowPriority = Scheduler.unstable_LowPriority;
	var IdlePriority = Scheduler.unstable_IdlePriority;
	var log$1 = Scheduler.log;
	var unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue;
	var rendererID = null;
	var injectedHook = null;
	function setIsStrictModeForDevtools(newIsStrictMode) {
		"function" === typeof log$1 && unstable_setDisableYieldValue(newIsStrictMode);
		if (injectedHook && "function" === typeof injectedHook.setStrictMode) try {
			injectedHook.setStrictMode(rendererID, newIsStrictMode);
		} catch (err) {}
	}
	var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
	var log = Math.log;
	var LN2 = Math.LN2;
	function clz32Fallback(x) {
		x >>>= 0;
		return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
	}
	var nextTransitionUpdateLane = 256;
	var nextTransitionDeferredLane = 262144;
	var nextRetryLane = 4194304;
	function getHighestPriorityLanes(lanes) {
		var pendingSyncLanes = lanes & 42;
		if (0 !== pendingSyncLanes) return pendingSyncLanes;
		switch (lanes & -lanes) {
			case 1: return 1;
			case 2: return 2;
			case 4: return 4;
			case 8: return 8;
			case 16: return 16;
			case 32: return 32;
			case 64: return 64;
			case 128: return 128;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072: return lanes & -lanes;
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return lanes & 3932160;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return lanes & 62914560;
			case 67108864: return 67108864;
			case 0x8000000: return 0x8000000;
			case 268435456: return 268435456;
			case 536870912: return 536870912;
			case 0x40000000: return 0;
			default: return lanes;
		}
	}
	function getNextLanes(root, wipLanes, rootHasPendingCommit) {
		var pendingLanes = root.pendingLanes;
		if (0 === pendingLanes) return 0;
		var nextLanes = 0, suspendedLanes = root.suspendedLanes, pingedLanes = root.pingedLanes;
		root = root.warmLanes;
		var nonIdlePendingLanes = pendingLanes & 0x7ffffff;
		0 !== nonIdlePendingLanes ? (pendingLanes = nonIdlePendingLanes & ~suspendedLanes, 0 !== pendingLanes ? nextLanes = getHighestPriorityLanes(pendingLanes) : (pingedLanes &= nonIdlePendingLanes, 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = nonIdlePendingLanes & ~root, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))))) : (nonIdlePendingLanes = pendingLanes & ~suspendedLanes, 0 !== nonIdlePendingLanes ? nextLanes = getHighestPriorityLanes(nonIdlePendingLanes) : 0 !== pingedLanes ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = pendingLanes & ~root, 0 !== rootHasPendingCommit && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
		return 0 === nextLanes ? 0 : 0 !== wipLanes && wipLanes !== nextLanes && 0 === (wipLanes & suspendedLanes) && (suspendedLanes = nextLanes & -nextLanes, rootHasPendingCommit = wipLanes & -wipLanes, suspendedLanes >= rootHasPendingCommit || 32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)) ? wipLanes : nextLanes;
	}
	function checkIfRootIsPrerendering(root, renderLanes) {
		return 0 === (root.pendingLanes & ~(root.suspendedLanes & ~root.pingedLanes) & renderLanes);
	}
	function getEntangledLanes(root, renderLanes) {
		0 !== (renderLanes & 8) && (renderLanes |= renderLanes & 32);
		var allEntangledLanes = root.entangledLanes;
		if (0 !== allEntangledLanes) for (root = root.entanglements, allEntangledLanes &= renderLanes; 0 < allEntangledLanes;) {
			var index$4 = 31 - clz32(allEntangledLanes), lane = 1 << index$4;
			renderLanes |= root[index$4];
			allEntangledLanes &= ~lane;
		}
		return renderLanes;
	}
	function computeExpirationTime(lane, currentTime) {
		switch (lane) {
			case 1:
			case 2:
			case 4:
			case 8:
			case 64: return currentTime + 250;
			case 16:
			case 32:
			case 128:
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152: return currentTime + 5e3;
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432: return -1;
			case 67108864:
			case 0x8000000:
			case 268435456:
			case 536870912:
			case 0x40000000: return -1;
			default: return -1;
		}
	}
	function claimNextRetryLane() {
		var lane = nextRetryLane;
		nextRetryLane <<= 1;
		0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
		return lane;
	}
	function createLaneMap(initial) {
		for (var laneMap = [], i = 0; 31 > i; i++) laneMap.push(initial);
		return laneMap;
	}
	function markRootUpdated$1(root, updateLane) {
		root.pendingLanes |= updateLane;
		268435456 !== updateLane && (root.suspendedLanes = 0, root.pingedLanes = 0, root.warmLanes = 0);
	}
	function markRootFinished(root, finishedLanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes) {
		var previouslyPendingLanes = root.pendingLanes;
		root.pendingLanes = remainingLanes;
		root.suspendedLanes = 0;
		root.pingedLanes = 0;
		root.warmLanes = 0;
		root.expiredLanes &= remainingLanes;
		root.entangledLanes &= remainingLanes;
		root.errorRecoveryDisabledLanes &= remainingLanes;
		root.shellSuspendCounter = 0;
		var entanglements = root.entanglements, expirationTimes = root.expirationTimes, hiddenUpdates = root.hiddenUpdates;
		for (remainingLanes = previouslyPendingLanes & ~remainingLanes; 0 < remainingLanes;) {
			var index$7 = 31 - clz32(remainingLanes), lane = 1 << index$7;
			entanglements[index$7] = 0;
			expirationTimes[index$7] = -1;
			var hiddenUpdatesForLane = hiddenUpdates[index$7];
			if (null !== hiddenUpdatesForLane) for (hiddenUpdates[index$7] = null, index$7 = 0; index$7 < hiddenUpdatesForLane.length; index$7++) {
				var update = hiddenUpdatesForLane[index$7];
				null !== update && (update.lane &= -536870913);
			}
			remainingLanes &= ~lane;
		}
		0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, 0);
		0 !== suspendedRetryLanes && 0 === updatedLanes && 0 !== root.tag && (root.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
	}
	function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
		root.pendingLanes |= spawnedLane;
		root.suspendedLanes &= ~spawnedLane;
		var spawnedLaneIndex = 31 - clz32(spawnedLane);
		root.entangledLanes |= spawnedLane;
		root.entanglements[spawnedLaneIndex] = root.entanglements[spawnedLaneIndex] | 0x40000000 | entangledLanes & 261930;
	}
	function markRootEntangled(root, entangledLanes) {
		var rootEntangledLanes = root.entangledLanes |= entangledLanes;
		for (root = root.entanglements; rootEntangledLanes;) {
			var index$8 = 31 - clz32(rootEntangledLanes), lane = 1 << index$8;
			lane & entangledLanes | root[index$8] & entangledLanes && (root[index$8] |= entangledLanes);
			rootEntangledLanes &= ~lane;
		}
	}
	function getBumpedLaneForHydration(root, renderLanes) {
		var renderLane = renderLanes & -renderLanes;
		renderLane = 0 !== (renderLane & 42) ? 1 : getBumpedLaneForHydrationByLane(renderLane);
		return 0 !== (renderLane & (root.suspendedLanes | renderLanes)) ? 0 : renderLane;
	}
	function getBumpedLaneForHydrationByLane(lane) {
		switch (lane) {
			case 2:
				lane = 1;
				break;
			case 8:
				lane = 4;
				break;
			case 32:
				lane = 16;
				break;
			case 256:
			case 512:
			case 1024:
			case 2048:
			case 4096:
			case 8192:
			case 16384:
			case 32768:
			case 65536:
			case 131072:
			case 262144:
			case 524288:
			case 1048576:
			case 2097152:
			case 4194304:
			case 8388608:
			case 16777216:
			case 33554432:
				lane = 128;
				break;
			case 268435456:
				lane = 0x8000000;
				break;
			default: lane = 0;
		}
		return lane;
	}
	function lanesToEventPriority(lanes) {
		lanes &= -lanes;
		return 2 < lanes ? 8 < lanes ? 0 !== (lanes & 0x7ffffff) ? 32 : 268435456 : 8 : 2;
	}
	function resolveUpdatePriority() {
		var updatePriority = ReactDOMSharedInternals.p;
		if (0 !== updatePriority) return updatePriority;
		updatePriority = window.event;
		return void 0 === updatePriority ? 32 : getEventPriority(updatePriority.type);
	}
	function runWithPriority(priority, fn) {
		var previousPriority = ReactDOMSharedInternals.p;
		try {
			return ReactDOMSharedInternals.p = priority, fn();
		} finally {
			ReactDOMSharedInternals.p = previousPriority;
		}
	}
	var randomKey = Math.random().toString(36).slice(2);
	var internalInstanceKey = "__reactFiber$" + randomKey;
	var internalPropsKey = "__reactProps$" + randomKey;
	var internalContainerInstanceKey = "__reactContainer$" + randomKey;
	var internalEventHandlersKey = "__reactEvents$" + randomKey;
	var internalEventHandlerListenersKey = "__reactListeners$" + randomKey;
	var internalEventHandlesSetKey = "__reactHandles$" + randomKey;
	var internalRootNodeResourcesKey = "__reactResources$" + randomKey;
	var internalHoistableMarker = "__reactMarker$" + randomKey;
	var internalLoadPendingKey = "__reactLoad$" + randomKey;
	function detachDeletedInstance(node) {
		delete node[internalInstanceKey];
		delete node[internalPropsKey];
		delete node[internalEventHandlerListenersKey];
		delete node[internalEventHandlesSetKey];
	}
	function getClosestInstanceFromNode(targetNode) {
		var targetInst;
		if (targetInst = targetNode[internalInstanceKey]) return targetInst;
		for (var parentNode = targetNode.parentNode; parentNode;) {
			if (targetInst = parentNode[internalContainerInstanceKey] || parentNode[internalInstanceKey]) {
				parentNode = targetInst.alternate;
				if (null !== targetInst.child || null !== parentNode && null !== parentNode.child) for (targetNode = getParentHydrationBoundary(targetNode); null !== targetNode;) {
					if (parentNode = targetNode[internalInstanceKey]) return parentNode;
					targetNode = getParentHydrationBoundary(targetNode);
				}
				return targetInst;
			}
			targetNode = parentNode;
			parentNode = targetNode.parentNode;
		}
		return null;
	}
	function getInstanceFromNode(node) {
		if (node = node[internalInstanceKey] || node[internalContainerInstanceKey]) {
			var tag = node.tag;
			if (5 === tag || 6 === tag || 13 === tag || 31 === tag || 26 === tag || 27 === tag || 3 === tag) return node;
		}
		return null;
	}
	function getNodeFromInstance(inst) {
		var tag = inst.tag;
		if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return inst.stateNode;
		throw Error(formatProdErrorMessage(33));
	}
	function getResourcesFromRoot(root) {
		var resources = root[internalRootNodeResourcesKey];
		resources || (resources = root[internalRootNodeResourcesKey] = {
			hoistableStyles: /* @__PURE__ */ new Map(),
			hoistableScripts: /* @__PURE__ */ new Map()
		});
		return resources;
	}
	function markNodeAsHoistable(node) {
		node[internalHoistableMarker] = !0;
	}
	function clearPendingLoadOnNode(node) {
		node[internalLoadPendingKey] = void 0;
	}
	var allNativeEvents = /* @__PURE__ */ new Set();
	var registrationNameDependencies = {};
	function registerTwoPhaseEvent(registrationName, dependencies) {
		registerDirectEvent(registrationName, dependencies);
		registerDirectEvent(registrationName + "Capture", dependencies);
	}
	function registerDirectEvent(registrationName, dependencies) {
		registrationNameDependencies[registrationName] = dependencies;
		for (registrationName = 0; registrationName < dependencies.length; registrationName++) allNativeEvents.add(dependencies[registrationName]);
	}
	var VALID_ATTRIBUTE_NAME_REGEX = RegExp("^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$");
	var illegalAttributeNameCache = {};
	var validatedAttributeNameCache = {};
	function isAttributeNameSafe(attributeName) {
		if (hasOwnProperty.call(validatedAttributeNameCache, attributeName)) return !0;
		if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return !1;
		if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) return validatedAttributeNameCache[attributeName] = !0;
		illegalAttributeNameCache[attributeName] = !0;
		return !1;
	}
	var viewTransitionMutationContext = !1;
	function pushMutationContext() {
		var prev = viewTransitionMutationContext;
		viewTransitionMutationContext = !1;
		return prev;
	}
	function setValueForAttribute(node, name, value) {
		if (isAttributeNameSafe(name)) if (null === value) node.removeAttribute(name);
		else {
			switch (typeof value) {
				case "undefined":
				case "function":
				case "symbol":
					node.removeAttribute(name);
					return;
				case "boolean":
					var prefix$10 = name.toLowerCase().slice(0, 5);
					if ("data-" !== prefix$10 && "aria-" !== prefix$10) {
						node.removeAttribute(name);
						return;
					}
			}
			node.setAttribute(name, value);
		}
	}
	function setValueForKnownAttribute(node, name, value) {
		if (null === value) node.removeAttribute(name);
		else {
			switch (typeof value) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					node.removeAttribute(name);
					return;
			}
			node.setAttribute(name, value);
		}
	}
	function setValueForNamespacedAttribute(node, namespace, name, value) {
		if (null === value) node.removeAttribute(name);
		else {
			switch (typeof value) {
				case "undefined":
				case "function":
				case "symbol":
				case "boolean":
					node.removeAttribute(name);
					return;
			}
			node.setAttributeNS(namespace, name, value);
		}
	}
	function getToStringValue(value) {
		switch (typeof value) {
			case "bigint":
			case "boolean":
			case "number":
			case "string":
			case "undefined": return value;
			case "object": return value;
			default: return "";
		}
	}
	function isCheckable(elem) {
		var type = elem.type;
		return (elem = elem.nodeName) && "input" === elem.toLowerCase() && ("checkbox" === type || "radio" === type);
	}
	function trackValueOnNode(node, valueField, currentValue) {
		var descriptor = Object.getOwnPropertyDescriptor(node.constructor.prototype, valueField);
		if (!node.hasOwnProperty(valueField) && "undefined" !== typeof descriptor && "function" === typeof descriptor.get && "function" === typeof descriptor.set) {
			var get = descriptor.get, set = descriptor.set;
			Object.defineProperty(node, valueField, {
				configurable: !0,
				get: function() {
					return get.call(this);
				},
				set: function(value) {
					currentValue = "" + value;
					set.call(this, value);
				}
			});
			Object.defineProperty(node, valueField, { enumerable: descriptor.enumerable });
			return {
				getValue: function() {
					return currentValue;
				},
				setValue: function(value) {
					currentValue = "" + value;
				},
				stopTracking: function() {
					node._valueTracker = null;
					delete node[valueField];
				}
			};
		}
	}
	function track(node) {
		if (!node._valueTracker) {
			var valueField = isCheckable(node) ? "checked" : "value";
			node._valueTracker = trackValueOnNode(node, valueField, "" + node[valueField]);
		}
	}
	function updateValueIfChanged(node) {
		if (!node) return !1;
		var tracker = node._valueTracker;
		if (!tracker) return !0;
		var lastValue = tracker.getValue();
		var value = "";
		node && (value = isCheckable(node) ? node.checked ? "true" : "false" : node.value);
		node = value;
		return node !== lastValue ? (tracker.setValue(node), !0) : !1;
	}
	var escapeSelectorAttributeValueInsideDoubleQuotesRegex = /[\n"\\]/g;
	function escapeSelectorAttributeValueInsideDoubleQuotes(value) {
		return value.replace(escapeSelectorAttributeValueInsideDoubleQuotesRegex, function(ch) {
			return "\\" + ch.charCodeAt(0).toString(16) + " ";
		});
	}
	function updateInput(element, value, defaultValue, lastDefaultValue, checked, defaultChecked, type, name) {
		element.name = "";
		null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type ? element.type = type : element.removeAttribute("type");
		if (null != value) if ("number" === type) {
			if (0 === value && "" === element.value || element.value != value) element.value = "" + getToStringValue(value);
		} else element.value !== "" + getToStringValue(value) && (element.value = "" + getToStringValue(value));
		else "submit" !== type && "reset" !== type || element.removeAttribute("value");
		null != value ? "number" === type && element.value == value ? setDefaultValue(element, getToStringValue(element.value)) : setDefaultValue(element, getToStringValue(value)) : null != defaultValue ? setDefaultValue(element, getToStringValue(defaultValue)) : null != lastDefaultValue && element.removeAttribute("value");
		null == checked && null != defaultChecked && (element.defaultChecked = !!defaultChecked);
		null != checked && (element.checked = checked && "function" !== typeof checked && "symbol" !== typeof checked);
		null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name ? element.name = "" + getToStringValue(name) : element.removeAttribute("name");
	}
	function initInput(element, value, defaultValue, checked, defaultChecked, type, name, isHydrating) {
		null != type && "function" !== typeof type && "symbol" !== typeof type && "boolean" !== typeof type && (element.type = type);
		if (null != value || null != defaultValue) {
			if (!("submit" !== type && "reset" !== type || void 0 !== value && null !== value)) {
				track(element);
				return;
			}
			defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
			value = null != value ? "" + getToStringValue(value) : defaultValue;
			isHydrating || value === element.value || (element.value = value);
			element.defaultValue = value;
		}
		checked = null != checked ? checked : defaultChecked;
		checked = "function" !== typeof checked && "symbol" !== typeof checked && !!checked;
		element.checked = isHydrating ? element.checked : !!checked;
		element.defaultChecked = !!checked;
		null != name && "function" !== typeof name && "symbol" !== typeof name && "boolean" !== typeof name && (element.name = name);
		track(element);
	}
	function setDefaultValue(node, value) {
		node.defaultValue !== "" + value && (node.defaultValue = "" + value);
	}
	function updateOptions(node, multiple, propValue, setDefaultSelected) {
		node = node.options;
		if (multiple) {
			multiple = {};
			for (var i = 0; i < propValue.length; i++) multiple["$" + propValue[i]] = !0;
			for (propValue = 0; propValue < node.length; propValue++) i = multiple.hasOwnProperty("$" + node[propValue].value), node[propValue].selected !== i && (node[propValue].selected = i), i && setDefaultSelected && (node[propValue].defaultSelected = !0);
		} else {
			propValue = "" + getToStringValue(propValue);
			multiple = null;
			for (i = 0; i < node.length; i++) {
				if (node[i].value === propValue) {
					node[i].selected = !0;
					setDefaultSelected && (node[i].defaultSelected = !0);
					return;
				}
				null !== multiple || node[i].disabled || (multiple = node[i]);
			}
			null !== multiple && (multiple.selected = !0);
		}
	}
	function updateTextarea(element, value, defaultValue) {
		if (null != value && (value = "" + getToStringValue(value), value !== element.value && (element.value = value), null == defaultValue)) {
			element.defaultValue !== value && (element.defaultValue = value);
			return;
		}
		element.defaultValue = null != defaultValue ? "" + getToStringValue(defaultValue) : "";
	}
	function initTextarea(element, value, defaultValue, children) {
		if (null == value) {
			if (null != children) {
				if (null != defaultValue) throw Error(formatProdErrorMessage(92));
				if (isArrayImpl(children)) {
					if (1 < children.length) throw Error(formatProdErrorMessage(93));
					children = children[0];
				}
				defaultValue = children;
			}
			defaultValue ??= "";
			value = defaultValue;
		}
		defaultValue = getToStringValue(value);
		element.defaultValue = defaultValue;
		children = element.textContent;
		children === defaultValue && "" !== children && null !== children && (element.value = children);
		track(element);
	}
	function setTextContent(node, text) {
		if (text) {
			var firstChild = node.firstChild;
			if (firstChild && firstChild === node.lastChild && 3 === firstChild.nodeType) {
				firstChild.nodeValue = text;
				return;
			}
		}
		node.textContent = text;
	}
	var unitlessNumbers = new Set("animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(" "));
	function setValueForStyle(style, styleName, value) {
		var isCustomProperty = 0 === styleName.indexOf("--");
		null == value || "boolean" === typeof value || "" === value ? isCustomProperty ? style.setProperty(styleName, "") : "float" === styleName ? style.cssFloat = "" : style[styleName] = "" : isCustomProperty ? style.setProperty(styleName, value) : "number" !== typeof value || 0 === value || unitlessNumbers.has(styleName) ? "float" === styleName ? style.cssFloat = value : style[styleName] = ("" + value).trim() : style[styleName] = value + "px";
	}
	function setValueForStyles(node, styles, prevStyles) {
		if (null != styles && "object" !== typeof styles) throw Error(formatProdErrorMessage(62));
		node = node.style;
		if (null != prevStyles) {
			for (var styleName in prevStyles) !prevStyles.hasOwnProperty(styleName) || null != styles && styles.hasOwnProperty(styleName) || (0 === styleName.indexOf("--") ? node.setProperty(styleName, "") : "float" === styleName ? node.cssFloat = "" : node[styleName] = "", viewTransitionMutationContext = !0);
			for (var styleName$16 in styles) styleName = styles[styleName$16], styles.hasOwnProperty(styleName$16) && prevStyles[styleName$16] !== styleName && (setValueForStyle(node, styleName$16, styleName), viewTransitionMutationContext = !0);
		} else for (var styleName$17 in styles) styles.hasOwnProperty(styleName$17) && setValueForStyle(node, styleName$17, styles[styleName$17]);
	}
	function isCustomElement(tagName) {
		if (-1 === tagName.indexOf("-")) return !1;
		switch (tagName) {
			case "annotation-xml":
			case "color-profile":
			case "font-face":
			case "font-face-src":
			case "font-face-uri":
			case "font-face-format":
			case "font-face-name":
			case "missing-glyph": return !1;
			default: return !0;
		}
	}
	var aliases = /* @__PURE__ */ new Map([
		["acceptCharset", "accept-charset"],
		["htmlFor", "for"],
		["httpEquiv", "http-equiv"],
		["crossOrigin", "crossorigin"],
		["accentHeight", "accent-height"],
		["alignmentBaseline", "alignment-baseline"],
		["arabicForm", "arabic-form"],
		["baselineShift", "baseline-shift"],
		["capHeight", "cap-height"],
		["clipPath", "clip-path"],
		["clipRule", "clip-rule"],
		["colorInterpolation", "color-interpolation"],
		["colorInterpolationFilters", "color-interpolation-filters"],
		["colorProfile", "color-profile"],
		["colorRendering", "color-rendering"],
		["dominantBaseline", "dominant-baseline"],
		["enableBackground", "enable-background"],
		["fillOpacity", "fill-opacity"],
		["fillRule", "fill-rule"],
		["floodColor", "flood-color"],
		["floodOpacity", "flood-opacity"],
		["fontFamily", "font-family"],
		["fontSize", "font-size"],
		["fontSizeAdjust", "font-size-adjust"],
		["fontStretch", "font-stretch"],
		["fontStyle", "font-style"],
		["fontVariant", "font-variant"],
		["fontWeight", "font-weight"],
		["glyphName", "glyph-name"],
		["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
		["glyphOrientationVertical", "glyph-orientation-vertical"],
		["horizAdvX", "horiz-adv-x"],
		["horizOriginX", "horiz-origin-x"],
		["imageRendering", "image-rendering"],
		["letterSpacing", "letter-spacing"],
		["lightingColor", "lighting-color"],
		["markerEnd", "marker-end"],
		["markerMid", "marker-mid"],
		["markerStart", "marker-start"],
		["maskType", "mask-type"],
		["overlinePosition", "overline-position"],
		["overlineThickness", "overline-thickness"],
		["paintOrder", "paint-order"],
		["panose-1", "panose-1"],
		["pointerEvents", "pointer-events"],
		["renderingIntent", "rendering-intent"],
		["shapeRendering", "shape-rendering"],
		["stopColor", "stop-color"],
		["stopOpacity", "stop-opacity"],
		["strikethroughPosition", "strikethrough-position"],
		["strikethroughThickness", "strikethrough-thickness"],
		["strokeDasharray", "stroke-dasharray"],
		["strokeDashoffset", "stroke-dashoffset"],
		["strokeLinecap", "stroke-linecap"],
		["strokeLinejoin", "stroke-linejoin"],
		["strokeMiterlimit", "stroke-miterlimit"],
		["strokeOpacity", "stroke-opacity"],
		["strokeWidth", "stroke-width"],
		["textAnchor", "text-anchor"],
		["textDecoration", "text-decoration"],
		["textRendering", "text-rendering"],
		["transformOrigin", "transform-origin"],
		["underlinePosition", "underline-position"],
		["underlineThickness", "underline-thickness"],
		["unicodeBidi", "unicode-bidi"],
		["unicodeRange", "unicode-range"],
		["unitsPerEm", "units-per-em"],
		["vAlphabetic", "v-alphabetic"],
		["vHanging", "v-hanging"],
		["vIdeographic", "v-ideographic"],
		["vMathematical", "v-mathematical"],
		["vectorEffect", "vector-effect"],
		["vertAdvY", "vert-adv-y"],
		["vertOriginX", "vert-origin-x"],
		["vertOriginY", "vert-origin-y"],
		["wordSpacing", "word-spacing"],
		["writingMode", "writing-mode"],
		["xmlnsXlink", "xmlns:xlink"],
		["xHeight", "x-height"]
	]);
	var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
	function sanitizeURL(url) {
		return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
	}
	function noop$1() {}
	var currentReplayingEvent = null;
	function getEventTarget(nativeEvent) {
		nativeEvent = nativeEvent.target || nativeEvent.srcElement || window;
		nativeEvent.correspondingUseElement && (nativeEvent = nativeEvent.correspondingUseElement);
		return 3 === nativeEvent.nodeType ? nativeEvent.parentNode : nativeEvent;
	}
	var restoreTarget = null;
	var restoreQueue = null;
	function restoreStateOfTarget(target) {
		var internalInstance = getInstanceFromNode(target);
		if (internalInstance && (target = internalInstance.stateNode)) {
			var props = target[internalPropsKey] || null;
			a: switch (target = internalInstance.stateNode, internalInstance.type) {
				case "input":
					updateInput(target, props.value, props.defaultValue, props.defaultValue, props.checked, props.defaultChecked, props.type, props.name);
					internalInstance = props.name;
					if ("radio" === props.type && null != internalInstance) {
						for (props = target; props.parentNode;) props = props.parentNode;
						props = props.querySelectorAll("input[name=\"" + escapeSelectorAttributeValueInsideDoubleQuotes("" + internalInstance) + "\"][type=\"radio\"]");
						for (internalInstance = 0; internalInstance < props.length; internalInstance++) {
							var otherNode = props[internalInstance];
							if (otherNode !== target && otherNode.form === target.form) {
								var otherProps = otherNode[internalPropsKey] || null;
								if (!otherProps) throw Error(formatProdErrorMessage(90));
								updateInput(otherNode, otherProps.value, otherProps.defaultValue, otherProps.defaultValue, otherProps.checked, otherProps.defaultChecked, otherProps.type, otherProps.name);
							}
						}
						for (internalInstance = 0; internalInstance < props.length; internalInstance++) otherNode = props[internalInstance], otherNode.form === target.form && updateValueIfChanged(otherNode);
					}
					break a;
				case "textarea":
					updateTextarea(target, props.value, props.defaultValue);
					break a;
				case "select": internalInstance = props.value, null != internalInstance && updateOptions(target, !!props.multiple, internalInstance, !1);
			}
		}
	}
	var isInsideEventHandler = !1;
	function batchedUpdates$1(fn, a, b) {
		if (isInsideEventHandler) return fn(a, b);
		isInsideEventHandler = !0;
		try {
			return fn(a);
		} finally {
			if (isInsideEventHandler = !1, null !== restoreTarget || null !== restoreQueue) {
				if (flushSyncWork$1(), restoreTarget && (a = restoreTarget, fn = restoreQueue, restoreQueue = restoreTarget = null, restoreStateOfTarget(a), fn)) for (a = 0; a < fn.length; a++) restoreStateOfTarget(fn[a]);
			}
		}
	}
	function getListener(inst, registrationName) {
		var stateNode = inst.stateNode;
		if (null === stateNode) return null;
		var props = stateNode[internalPropsKey] || null;
		if (null === props) return null;
		stateNode = props[registrationName];
		a: switch (registrationName) {
			case "onClick":
			case "onClickCapture":
			case "onDoubleClick":
			case "onDoubleClickCapture":
			case "onMouseDown":
			case "onMouseDownCapture":
			case "onMouseMove":
			case "onMouseMoveCapture":
			case "onMouseUp":
			case "onMouseUpCapture":
			case "onMouseEnter":
				(props = !props.disabled) || (inst = inst.type, props = !("button" === inst || "input" === inst || "select" === inst || "textarea" === inst));
				inst = !props;
				break a;
			default: inst = !1;
		}
		if (inst) return null;
		if (stateNode && "function" !== typeof stateNode) throw Error(formatProdErrorMessage(231, registrationName, typeof stateNode));
		return stateNode;
	}
	var canUseDOM = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement);
	var passiveBrowserEventsSupported = !1;
	if (canUseDOM) try {
		var options = {};
		Object.defineProperty(options, "passive", { get: function() {
			passiveBrowserEventsSupported = !0;
		} });
		window.addEventListener("test", options, options);
		window.removeEventListener("test", options, options);
	} catch (e) {
		passiveBrowserEventsSupported = !1;
	}
	var root = null;
	var startText = null;
	var fallbackText = null;
	function getData() {
		if (fallbackText) return fallbackText;
		var start, startValue = startText, startLength = startValue.length, end, endValue = "value" in root ? root.value : root.textContent, endLength = endValue.length;
		for (start = 0; start < startLength && startValue[start] === endValue[start]; start++);
		var minEnd = startLength - start;
		for (end = 1; end <= minEnd && startValue[startLength - end] === endValue[endLength - end]; end++);
		return fallbackText = endValue.slice(start, 1 < end ? 1 - end : void 0);
	}
	function getEventCharCode(nativeEvent) {
		var keyCode = nativeEvent.keyCode;
		"charCode" in nativeEvent ? (nativeEvent = nativeEvent.charCode, 0 === nativeEvent && 13 === keyCode && (nativeEvent = 13)) : nativeEvent = keyCode;
		10 === nativeEvent && (nativeEvent = 13);
		return 32 <= nativeEvent || 13 === nativeEvent ? nativeEvent : 0;
	}
	function functionThatReturnsTrue() {
		return !0;
	}
	function functionThatReturnsFalse() {
		return !1;
	}
	function createSyntheticEvent(Interface) {
		function SyntheticBaseEvent(reactName, reactEventType, targetInst, nativeEvent, nativeEventTarget) {
			this._reactName = reactName;
			this._targetInst = targetInst;
			this.type = reactEventType;
			this.nativeEvent = nativeEvent;
			this.target = nativeEventTarget;
			this.currentTarget = null;
			for (var propName in Interface) Interface.hasOwnProperty(propName) && (reactName = Interface[propName], this[propName] = reactName ? reactName(nativeEvent) : nativeEvent[propName]);
			this.isDefaultPrevented = (null != nativeEvent.defaultPrevented ? nativeEvent.defaultPrevented : !1 === nativeEvent.returnValue) ? functionThatReturnsTrue : functionThatReturnsFalse;
			this.isPropagationStopped = functionThatReturnsFalse;
			return this;
		}
		assign(SyntheticBaseEvent.prototype, {
			preventDefault: function() {
				this.defaultPrevented = !0;
				var event = this.nativeEvent;
				event && (event.preventDefault ? event.preventDefault() : "unknown" !== typeof event.returnValue && (event.returnValue = !1), this.isDefaultPrevented = functionThatReturnsTrue);
			},
			stopPropagation: function() {
				var event = this.nativeEvent;
				event && (event.stopPropagation ? event.stopPropagation() : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = !0), this.isPropagationStopped = functionThatReturnsTrue);
			},
			persist: function() {},
			isPersistent: functionThatReturnsTrue
		});
		return SyntheticBaseEvent;
	}
	var EventInterface = {
		eventPhase: 0,
		bubbles: 0,
		cancelable: 0,
		timeStamp: function(event) {
			return event.timeStamp || Date.now();
		},
		defaultPrevented: 0,
		isTrusted: 0
	};
	var SyntheticEvent = createSyntheticEvent(EventInterface);
	var UIEventInterface = assign({}, EventInterface, {
		view: 0,
		detail: 0
	});
	var SyntheticUIEvent = createSyntheticEvent(UIEventInterface);
	var lastMovementX;
	var lastMovementY;
	var lastMouseEvent;
	var MouseEventInterface = assign({}, UIEventInterface, {
		screenX: 0,
		screenY: 0,
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		getModifierState: getEventModifierState,
		button: 0,
		buttons: 0,
		relatedTarget: function(event) {
			return void 0 === event.relatedTarget ? event.fromElement === event.srcElement ? event.toElement : event.fromElement : event.relatedTarget;
		},
		movementX: function(event) {
			if ("movementX" in event) return event.movementX;
			event !== lastMouseEvent && (lastMouseEvent && "mousemove" === event.type ? (lastMovementX = event.screenX - lastMouseEvent.screenX, lastMovementY = event.screenY - lastMouseEvent.screenY) : lastMovementY = lastMovementX = 0, lastMouseEvent = event);
			return lastMovementX;
		},
		movementY: function(event) {
			return "movementY" in event ? event.movementY : lastMovementY;
		}
	});
	var SyntheticMouseEvent = createSyntheticEvent(MouseEventInterface);
	var SyntheticDragEvent = createSyntheticEvent(assign({}, MouseEventInterface, { dataTransfer: 0 }));
	var SyntheticFocusEvent = createSyntheticEvent(assign({}, UIEventInterface, { relatedTarget: 0 }));
	var SyntheticAnimationEvent = createSyntheticEvent(assign({}, EventInterface, {
		animationName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	}));
	var SyntheticClipboardEvent = createSyntheticEvent(assign({}, EventInterface, { clipboardData: function(event) {
		return "clipboardData" in event ? event.clipboardData : window.clipboardData;
	} }));
	var SyntheticCompositionEvent = createSyntheticEvent(assign({}, EventInterface, { data: 0 }));
	var normalizeKey = {
		Esc: "Escape",
		Spacebar: " ",
		Left: "ArrowLeft",
		Up: "ArrowUp",
		Right: "ArrowRight",
		Down: "ArrowDown",
		Del: "Delete",
		Win: "OS",
		Menu: "ContextMenu",
		Apps: "ContextMenu",
		Scroll: "ScrollLock",
		MozPrintableKey: "Unidentified"
	};
	var translateToKey = {
		8: "Backspace",
		9: "Tab",
		12: "Clear",
		13: "Enter",
		16: "Shift",
		17: "Control",
		18: "Alt",
		19: "Pause",
		20: "CapsLock",
		27: "Escape",
		32: " ",
		33: "PageUp",
		34: "PageDown",
		35: "End",
		36: "Home",
		37: "ArrowLeft",
		38: "ArrowUp",
		39: "ArrowRight",
		40: "ArrowDown",
		45: "Insert",
		46: "Delete",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NumLock",
		145: "ScrollLock",
		224: "Meta"
	};
	var modifierKeyToProp = {
		Alt: "altKey",
		Control: "ctrlKey",
		Meta: "metaKey",
		Shift: "shiftKey"
	};
	function modifierStateGetter(keyArg) {
		var nativeEvent = this.nativeEvent;
		return nativeEvent.getModifierState ? nativeEvent.getModifierState(keyArg) : (keyArg = modifierKeyToProp[keyArg]) ? !!nativeEvent[keyArg] : !1;
	}
	function getEventModifierState() {
		return modifierStateGetter;
	}
	var SyntheticKeyboardEvent = createSyntheticEvent(assign({}, UIEventInterface, {
		key: function(nativeEvent) {
			if (nativeEvent.key) {
				var key = normalizeKey[nativeEvent.key] || nativeEvent.key;
				if ("Unidentified" !== key) return key;
			}
			return "keypress" === nativeEvent.type ? (nativeEvent = getEventCharCode(nativeEvent), 13 === nativeEvent ? "Enter" : String.fromCharCode(nativeEvent)) : "keydown" === nativeEvent.type || "keyup" === nativeEvent.type ? translateToKey[nativeEvent.keyCode] || "Unidentified" : "";
		},
		code: 0,
		location: 0,
		ctrlKey: 0,
		shiftKey: 0,
		altKey: 0,
		metaKey: 0,
		repeat: 0,
		locale: 0,
		getModifierState: getEventModifierState,
		charCode: function(event) {
			return "keypress" === event.type ? getEventCharCode(event) : 0;
		},
		keyCode: function(event) {
			return "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
		},
		which: function(event) {
			return "keypress" === event.type ? getEventCharCode(event) : "keydown" === event.type || "keyup" === event.type ? event.keyCode : 0;
		}
	}));
	var SyntheticPointerEvent = createSyntheticEvent(assign({}, MouseEventInterface, {
		pointerId: 0,
		width: 0,
		height: 0,
		pressure: 0,
		tangentialPressure: 0,
		tiltX: 0,
		tiltY: 0,
		twist: 0,
		pointerType: 0,
		isPrimary: 0
	}));
	var SyntheticSubmitEvent = createSyntheticEvent(assign({}, EventInterface, { submitter: 0 }));
	var SyntheticTouchEvent = createSyntheticEvent(assign({}, UIEventInterface, {
		touches: 0,
		targetTouches: 0,
		changedTouches: 0,
		altKey: 0,
		metaKey: 0,
		ctrlKey: 0,
		shiftKey: 0,
		getModifierState: getEventModifierState
	}));
	var SyntheticTransitionEvent = createSyntheticEvent(assign({}, EventInterface, {
		propertyName: 0,
		elapsedTime: 0,
		pseudoElement: 0
	}));
	var SyntheticWheelEvent = createSyntheticEvent(assign({}, MouseEventInterface, {
		deltaX: function(event) {
			return "deltaX" in event ? event.deltaX : "wheelDeltaX" in event ? -event.wheelDeltaX : 0;
		},
		deltaY: function(event) {
			return "deltaY" in event ? event.deltaY : "wheelDeltaY" in event ? -event.wheelDeltaY : "wheelDelta" in event ? -event.wheelDelta : 0;
		},
		deltaZ: 0,
		deltaMode: 0
	}));
	var SyntheticToggleEvent = createSyntheticEvent(assign({}, EventInterface, {
		newState: 0,
		oldState: 0,
		source: 0
	}));
	var END_KEYCODES = [
		9,
		13,
		27,
		32
	];
	var canUseCompositionEvent = canUseDOM && "CompositionEvent" in window;
	var documentMode = null;
	canUseDOM && "documentMode" in document && (documentMode = document.documentMode);
	var canUseTextInputEvent = canUseDOM && "TextEvent" in window && !documentMode;
	var useFallbackCompositionData = canUseDOM && (!canUseCompositionEvent || documentMode && 8 < documentMode && 11 >= documentMode);
	var SPACEBAR_CHAR = String.fromCharCode(32);
	var hasSpaceKeypress = !1;
	function isFallbackCompositionEnd(domEventName, nativeEvent) {
		switch (domEventName) {
			case "keyup": return -1 !== END_KEYCODES.indexOf(nativeEvent.keyCode);
			case "keydown": return 229 !== nativeEvent.keyCode;
			case "keypress":
			case "mousedown":
			case "focusout": return !0;
			default: return !1;
		}
	}
	function getDataFromCustomEvent(nativeEvent) {
		nativeEvent = nativeEvent.detail;
		return "object" === typeof nativeEvent && "data" in nativeEvent ? nativeEvent.data : null;
	}
	var isComposing = !1;
	function getNativeBeforeInputChars(domEventName, nativeEvent) {
		switch (domEventName) {
			case "compositionend": return getDataFromCustomEvent(nativeEvent);
			case "keypress":
				if (32 !== nativeEvent.which) return null;
				hasSpaceKeypress = !0;
				return SPACEBAR_CHAR;
			case "textInput": return domEventName = nativeEvent.data, domEventName === SPACEBAR_CHAR && hasSpaceKeypress ? null : domEventName;
			default: return null;
		}
	}
	function getFallbackBeforeInputChars(domEventName, nativeEvent) {
		if (isComposing) return "compositionend" === domEventName || !canUseCompositionEvent && isFallbackCompositionEnd(domEventName, nativeEvent) ? (domEventName = getData(), fallbackText = startText = root = null, isComposing = !1, domEventName) : null;
		switch (domEventName) {
			case "paste": return null;
			case "keypress":
				if (!(nativeEvent.ctrlKey || nativeEvent.altKey || nativeEvent.metaKey) || nativeEvent.ctrlKey && nativeEvent.altKey) {
					if (nativeEvent.char && 1 < nativeEvent.char.length) return nativeEvent.char;
					if (nativeEvent.which) return String.fromCharCode(nativeEvent.which);
				}
				return null;
			case "compositionend": return useFallbackCompositionData && "ko" !== nativeEvent.locale ? null : nativeEvent.data;
			default: return null;
		}
	}
	var supportedInputTypes = {
		color: !0,
		date: !0,
		datetime: !0,
		"datetime-local": !0,
		email: !0,
		month: !0,
		number: !0,
		password: !0,
		range: !0,
		search: !0,
		tel: !0,
		text: !0,
		time: !0,
		url: !0,
		week: !0
	};
	function isTextInputElement(elem) {
		var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
		return "input" === nodeName ? !!supportedInputTypes[elem.type] : "textarea" === nodeName ? !0 : !1;
	}
	function createAndAccumulateChangeEvent(dispatchQueue, inst, nativeEvent, target) {
		restoreTarget ? restoreQueue ? restoreQueue.push(target) : restoreQueue = [target] : restoreTarget = target;
		inst = accumulateTwoPhaseListeners(inst, "onChange");
		0 < inst.length && (nativeEvent = new SyntheticEvent("onChange", "change", null, nativeEvent, target), dispatchQueue.push({
			event: nativeEvent,
			listeners: inst
		}));
	}
	var activeElement$1 = null;
	var activeElementInst$1 = null;
	function runEventInBatch(dispatchQueue) {
		processDispatchQueue(dispatchQueue, 0);
	}
	function getInstIfValueChanged(targetInst) {
		if (updateValueIfChanged(getNodeFromInstance(targetInst))) return targetInst;
	}
	function getTargetInstForChangeEvent(domEventName, targetInst) {
		if ("change" === domEventName) return targetInst;
	}
	var isInputEventSupported = !1;
	if (canUseDOM) {
		var JSCompiler_inline_result$jscomp$318;
		if (canUseDOM) {
			var isSupported$jscomp$inline_474 = "oninput" in document;
			if (!isSupported$jscomp$inline_474) {
				var element$jscomp$inline_475 = document.createElement("div");
				element$jscomp$inline_475.setAttribute("oninput", "return;");
				isSupported$jscomp$inline_474 = "function" === typeof element$jscomp$inline_475.oninput;
			}
			JSCompiler_inline_result$jscomp$318 = isSupported$jscomp$inline_474;
		} else JSCompiler_inline_result$jscomp$318 = !1;
		isInputEventSupported = JSCompiler_inline_result$jscomp$318 && (!document.documentMode || 9 < document.documentMode);
	}
	function stopWatchingForValueChange() {
		activeElement$1 && (activeElement$1.detachEvent("onpropertychange", handlePropertyChange), activeElementInst$1 = activeElement$1 = null);
	}
	function handlePropertyChange(nativeEvent) {
		if ("value" === nativeEvent.propertyName && getInstIfValueChanged(activeElementInst$1)) {
			var dispatchQueue = [];
			createAndAccumulateChangeEvent(dispatchQueue, activeElementInst$1, nativeEvent, getEventTarget(nativeEvent));
			batchedUpdates$1(runEventInBatch, dispatchQueue);
		}
	}
	function handleEventsForInputEventPolyfill(domEventName, target, targetInst) {
		"focusin" === domEventName ? (stopWatchingForValueChange(), activeElement$1 = target, activeElementInst$1 = targetInst, activeElement$1.attachEvent("onpropertychange", handlePropertyChange)) : "focusout" === domEventName && stopWatchingForValueChange();
	}
	function getTargetInstForInputEventPolyfill(domEventName) {
		if ("selectionchange" === domEventName || "keyup" === domEventName || "keydown" === domEventName) return getInstIfValueChanged(activeElementInst$1);
	}
	function getTargetInstForClickEvent(domEventName, targetInst) {
		if ("click" === domEventName) return getInstIfValueChanged(targetInst);
	}
	function getTargetInstForInputOrChangeEvent(domEventName, targetInst) {
		if ("input" === domEventName || "change" === domEventName) return getInstIfValueChanged(targetInst);
	}
	function is(x, y) {
		return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
	}
	var objectIs = "function" === typeof Object.is ? Object.is : is;
	function shallowEqual(objA, objB) {
		if (objectIs(objA, objB)) return !0;
		if ("object" !== typeof objA || null === objA || "object" !== typeof objB || null === objB) return !1;
		var keysA = Object.keys(objA), keysB = Object.keys(objB);
		if (keysA.length !== keysB.length) return !1;
		for (keysB = 0; keysB < keysA.length; keysB++) {
			var currentKey = keysA[keysB];
			if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey])) return !1;
		}
		return !0;
	}
	function getActiveElement(doc) {
		doc = doc || ("undefined" !== typeof document ? document : void 0);
		if ("undefined" === typeof doc) return null;
		try {
			return doc.activeElement || doc.body;
		} catch (e$20) {
			return doc.body;
		}
	}
	function getLeafNode(node) {
		for (; node && node.firstChild;) node = node.firstChild;
		return node;
	}
	function getNodeForCharacterOffset(root, offset) {
		var node = getLeafNode(root);
		root = 0;
		for (var nodeEnd; node;) {
			if (3 === node.nodeType) {
				nodeEnd = root + node.textContent.length;
				if (root <= offset && nodeEnd >= offset) return {
					node,
					offset: offset - root
				};
				root = nodeEnd;
			}
			a: {
				for (; node;) {
					if (node.nextSibling) {
						node = node.nextSibling;
						break a;
					}
					node = node.parentNode;
				}
				node = void 0;
			}
			node = getLeafNode(node);
		}
	}
	function containsNode(outerNode, innerNode) {
		return outerNode && innerNode ? outerNode === innerNode ? !0 : outerNode && 3 === outerNode.nodeType ? !1 : innerNode && 3 === innerNode.nodeType ? containsNode(outerNode, innerNode.parentNode) : "contains" in outerNode ? outerNode.contains(innerNode) : outerNode.compareDocumentPosition ? !!(outerNode.compareDocumentPosition(innerNode) & 16) : !1 : !1;
	}
	function getActiveElementDeep(containerInfo) {
		containerInfo = null != containerInfo && null != containerInfo.ownerDocument && null != containerInfo.ownerDocument.defaultView ? containerInfo.ownerDocument.defaultView : window;
		for (var element = getActiveElement(containerInfo.document); element instanceof containerInfo.HTMLIFrameElement;) {
			try {
				var JSCompiler_inline_result = "string" === typeof element.contentWindow.location.href;
			} catch (err) {
				JSCompiler_inline_result = !1;
			}
			if (JSCompiler_inline_result) containerInfo = element.contentWindow;
			else break;
			element = getActiveElement(containerInfo.document);
		}
		return element;
	}
	function hasSelectionCapabilities(elem) {
		var nodeName = elem && elem.nodeName && elem.nodeName.toLowerCase();
		return nodeName && ("input" === nodeName && ("text" === elem.type || "search" === elem.type || "tel" === elem.type || "url" === elem.type || "password" === elem.type) || "textarea" === nodeName || "true" === elem.contentEditable);
	}
	var skipSelectionChangeEvent = canUseDOM && "documentMode" in document && 11 >= document.documentMode;
	var activeElement = null;
	var activeElementInst = null;
	var lastSelection = null;
	var mouseDown = !1;
	function constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget) {
		var doc = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget.document : 9 === nativeEventTarget.nodeType ? nativeEventTarget : nativeEventTarget.ownerDocument;
		mouseDown || null == activeElement || activeElement !== getActiveElement(doc) || (doc = activeElement, "selectionStart" in doc && hasSelectionCapabilities(doc) ? doc = {
			start: doc.selectionStart,
			end: doc.selectionEnd
		} : (doc = (doc.ownerDocument && doc.ownerDocument.defaultView || window).getSelection(), doc = {
			anchorNode: doc.anchorNode,
			anchorOffset: doc.anchorOffset,
			focusNode: doc.focusNode,
			focusOffset: doc.focusOffset
		}), lastSelection && shallowEqual(lastSelection, doc) || (lastSelection = doc, doc = accumulateTwoPhaseListeners(activeElementInst, "onSelect"), 0 < doc.length && (nativeEvent = new SyntheticEvent("onSelect", "select", null, nativeEvent, nativeEventTarget), dispatchQueue.push({
			event: nativeEvent,
			listeners: doc
		}), nativeEvent.target = activeElement)));
	}
	function makePrefixMap(styleProp, eventName) {
		var prefixes = {};
		prefixes[styleProp.toLowerCase()] = eventName.toLowerCase();
		prefixes["Webkit" + styleProp] = "webkit" + eventName;
		prefixes["Moz" + styleProp] = "moz" + eventName;
		return prefixes;
	}
	var vendorPrefixes = {
		animationend: makePrefixMap("Animation", "AnimationEnd"),
		animationiteration: makePrefixMap("Animation", "AnimationIteration"),
		animationstart: makePrefixMap("Animation", "AnimationStart"),
		transitionrun: makePrefixMap("Transition", "TransitionRun"),
		transitionstart: makePrefixMap("Transition", "TransitionStart"),
		transitioncancel: makePrefixMap("Transition", "TransitionCancel"),
		transitionend: makePrefixMap("Transition", "TransitionEnd")
	};
	var prefixedEventNames = {};
	var style = {};
	canUseDOM && (style = document.createElement("div").style, "AnimationEvent" in window || (delete vendorPrefixes.animationend.animation, delete vendorPrefixes.animationiteration.animation, delete vendorPrefixes.animationstart.animation), "TransitionEvent" in window || delete vendorPrefixes.transitionend.transition);
	function getVendorPrefixedEventName(eventName) {
		if (prefixedEventNames[eventName]) return prefixedEventNames[eventName];
		if (!vendorPrefixes[eventName]) return eventName;
		var prefixMap = vendorPrefixes[eventName], styleProp;
		for (styleProp in prefixMap) if (prefixMap.hasOwnProperty(styleProp) && styleProp in style) return prefixedEventNames[eventName] = prefixMap[styleProp];
		return eventName;
	}
	var ANIMATION_END = getVendorPrefixedEventName("animationend");
	var ANIMATION_ITERATION = getVendorPrefixedEventName("animationiteration");
	var ANIMATION_START = getVendorPrefixedEventName("animationstart");
	var TRANSITION_RUN = getVendorPrefixedEventName("transitionrun");
	var TRANSITION_START = getVendorPrefixedEventName("transitionstart");
	var TRANSITION_CANCEL = getVendorPrefixedEventName("transitioncancel");
	var TRANSITION_END = getVendorPrefixedEventName("transitionend");
	var topLevelEventsToReactNames = /* @__PURE__ */ new Map();
	var simpleEventPluginEvents = "abort auxClick beforeToggle cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error fullscreenChange fullscreenError gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
	simpleEventPluginEvents.push("scrollEnd");
	function registerSimpleEvent(domEventName, reactName) {
		topLevelEventsToReactNames.set(domEventName, reactName);
		registerTwoPhaseEvent(reactName, [domEventName]);
	}
	var globalClientIdCounter$1 = 0;
	function getViewTransitionName(props, instance) {
		if (null != props.name && "auto" !== props.name) return props.name;
		if (null !== instance.autoName) return instance.autoName;
		props = pendingEffectsRoot.identifierPrefix;
		var globalClientId = globalClientIdCounter$1++;
		props = "_" + props + "t_" + globalClientId.toString(32) + "_";
		return instance.autoName = props;
	}
	function getClassNameByType(classByType) {
		if (null == classByType || "string" === typeof classByType) return classByType;
		var className = null, activeTypes = pendingTransitionTypes;
		if (null !== activeTypes) for (var i = 0; i < activeTypes.length; i++) {
			var match = classByType[activeTypes[i]];
			if (null != match) {
				if ("none" === match) return "none";
				className = null == className ? match : className + (" " + match);
			}
		}
		return null == className ? classByType.default : className;
	}
	function getViewTransitionClassName(defaultClass, eventClass) {
		defaultClass = getClassNameByType(defaultClass);
		eventClass = getClassNameByType(eventClass);
		return null == eventClass ? "auto" === defaultClass ? null : defaultClass : "auto" === eventClass ? null : eventClass;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	var concurrentQueues = [];
	var concurrentQueuesIndex = 0;
	var concurrentlyUpdatedLanes = 0;
	function finishQueueingConcurrentUpdates() {
		for (var endIndex = concurrentQueuesIndex, i = concurrentlyUpdatedLanes = concurrentQueuesIndex = 0; i < endIndex;) {
			var fiber = concurrentQueues[i];
			concurrentQueues[i++] = null;
			var queue = concurrentQueues[i];
			concurrentQueues[i++] = null;
			var update = concurrentQueues[i];
			concurrentQueues[i++] = null;
			var lane = concurrentQueues[i];
			concurrentQueues[i++] = null;
			if (null !== queue && null !== update) {
				var pending = queue.pending;
				null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
				queue.pending = update;
			}
			0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
		}
	}
	function enqueueUpdate$1(fiber, queue, update, lane) {
		concurrentQueues[concurrentQueuesIndex++] = fiber;
		concurrentQueues[concurrentQueuesIndex++] = queue;
		concurrentQueues[concurrentQueuesIndex++] = update;
		concurrentQueues[concurrentQueuesIndex++] = lane;
		concurrentlyUpdatedLanes |= lane;
		fiber.lanes |= lane;
		fiber = fiber.alternate;
		null !== fiber && (fiber.lanes |= lane);
	}
	function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
		enqueueUpdate$1(fiber, queue, update, lane);
		return getRootForUpdatedFiber(fiber);
	}
	function enqueueConcurrentRenderForLane(fiber, lane) {
		enqueueUpdate$1(fiber, null, null, lane);
		return getRootForUpdatedFiber(fiber);
	}
	function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
		sourceFiber.lanes |= lane;
		var alternate = sourceFiber.alternate;
		null !== alternate && (alternate.lanes |= lane);
		for (var isHidden = !1, parent = sourceFiber.return; null !== parent;) parent.childLanes |= lane, alternate = parent.alternate, null !== alternate && (alternate.childLanes |= lane), 22 === parent.tag && (sourceFiber = parent.stateNode, null === sourceFiber || sourceFiber._visibility & 1 || (isHidden = !0)), sourceFiber = parent, parent = parent.return;
		return 3 === sourceFiber.tag ? (parent = sourceFiber.stateNode, isHidden && null !== update && (isHidden = 31 - clz32(lane), sourceFiber = parent.hiddenUpdates, alternate = sourceFiber[isHidden], null === alternate ? sourceFiber[isHidden] = [update] : alternate.push(update), update.lane = lane | 536870912), parent) : null;
	}
	function getRootForUpdatedFiber(sourceFiber) {
		if (50 < nestedUpdateCount) throw nestedUpdateCount = 0, rootWithNestedUpdates = null, Error(formatProdErrorMessage(185));
		for (var parent = sourceFiber.return; null !== parent;) sourceFiber = parent, parent = sourceFiber.return;
		return 3 === sourceFiber.tag ? sourceFiber.stateNode : null;
	}
	var emptyContextObject = {};
	function FiberNode(tag, pendingProps, key, mode) {
		this.tag = tag;
		this.key = key;
		this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
		this.index = 0;
		this.refCleanup = this.ref = null;
		this.pendingProps = pendingProps;
		this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
		this.mode = mode;
		this.subtreeFlags = this.flags = 0;
		this.deletions = null;
		this.childLanes = this.lanes = 0;
		this.alternate = null;
	}
	function createFiberImplClass(tag, pendingProps, key, mode) {
		return new FiberNode(tag, pendingProps, key, mode);
	}
	function shouldConstruct(Component) {
		Component = Component.prototype;
		return !(!Component || !Component.isReactComponent);
	}
	function createWorkInProgress(current, pendingProps) {
		var workInProgress = current.alternate;
		null === workInProgress ? (workInProgress = createFiberImplClass(current.tag, pendingProps, current.key, current.mode), workInProgress.elementType = current.elementType, workInProgress.type = current.type, workInProgress.stateNode = current.stateNode, workInProgress.alternate = current, current.alternate = workInProgress) : (workInProgress.pendingProps = pendingProps, workInProgress.type = current.type, workInProgress.flags = 0, workInProgress.subtreeFlags = 0, workInProgress.deletions = null);
		workInProgress.flags = current.flags & 0x47f00000;
		workInProgress.childLanes = current.childLanes;
		workInProgress.lanes = current.lanes;
		workInProgress.child = current.child;
		workInProgress.memoizedProps = current.memoizedProps;
		workInProgress.memoizedState = current.memoizedState;
		workInProgress.updateQueue = current.updateQueue;
		pendingProps = current.dependencies;
		workInProgress.dependencies = null === pendingProps ? null : {
			lanes: pendingProps.lanes,
			firstContext: pendingProps.firstContext
		};
		workInProgress.sibling = current.sibling;
		workInProgress.index = current.index;
		workInProgress.ref = current.ref;
		workInProgress.refCleanup = current.refCleanup;
		return workInProgress;
	}
	function resetWorkInProgress(workInProgress, renderLanes) {
		workInProgress.flags &= 0x47f00002;
		var current = workInProgress.alternate;
		null === current ? (workInProgress.childLanes = 0, workInProgress.lanes = renderLanes, workInProgress.child = null, workInProgress.subtreeFlags = 0, workInProgress.memoizedProps = null, workInProgress.memoizedState = null, workInProgress.updateQueue = null, workInProgress.dependencies = null, workInProgress.stateNode = null) : (workInProgress.childLanes = current.childLanes, workInProgress.lanes = current.lanes, workInProgress.child = current.child, workInProgress.subtreeFlags = 0, workInProgress.deletions = null, workInProgress.memoizedProps = current.memoizedProps, workInProgress.memoizedState = current.memoizedState, workInProgress.updateQueue = current.updateQueue, workInProgress.type = current.type, renderLanes = current.dependencies, workInProgress.dependencies = null === renderLanes ? null : {
			lanes: renderLanes.lanes,
			firstContext: renderLanes.firstContext
		});
		return workInProgress;
	}
	function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
		var fiberTag = 0;
		owner = type;
		if ("function" === typeof owner) shouldConstruct(owner) && (fiberTag = 1);
		else if ("string" === typeof owner) fiberTag = isHostHoistableType(type, pendingProps, contextStackCursor.current) ? 26 : "html" === type || "head" === type || "body" === type ? 27 : 5;
		else a: switch (owner) {
			case REACT_ACTIVITY_TYPE: return type = createFiberImplClass(31, pendingProps, key, mode), type.elementType = REACT_ACTIVITY_TYPE, type.lanes = lanes, type;
			case REACT_FRAGMENT_TYPE: return createFiberFromFragment(pendingProps.children, mode, lanes, key);
			case REACT_STRICT_MODE_TYPE:
				fiberTag = 8;
				mode |= 24;
				break;
			case REACT_PROFILER_TYPE: return type = createFiberImplClass(12, pendingProps, key, mode | 2), type.elementType = REACT_PROFILER_TYPE, type.lanes = lanes, type;
			case REACT_SUSPENSE_TYPE: return type = createFiberImplClass(13, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_TYPE, type.lanes = lanes, type;
			case REACT_SUSPENSE_LIST_TYPE: return type = createFiberImplClass(19, pendingProps, key, mode), type.elementType = REACT_SUSPENSE_LIST_TYPE, type.lanes = lanes, type;
			case REACT_LEGACY_HIDDEN_TYPE:
			case REACT_VIEW_TRANSITION_TYPE: return type = mode | 32, type = createFiberImplClass(30, pendingProps, key, type), type.elementType = REACT_VIEW_TRANSITION_TYPE, type.lanes = lanes, type.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}, type;
			default:
				if ("object" === typeof owner && null !== owner) switch (owner.$$typeof) {
					case REACT_CONTEXT_TYPE:
						fiberTag = 10;
						break a;
					case REACT_CONSUMER_TYPE:
						fiberTag = 9;
						break a;
					case REACT_FORWARD_REF_TYPE:
						fiberTag = 11;
						break a;
					case REACT_MEMO_TYPE:
						fiberTag = 14;
						break a;
					case REACT_LAZY_TYPE:
						fiberTag = 16;
						owner = null;
						break a;
				}
				fiberTag = 29;
				pendingProps = Error(formatProdErrorMessage(130, null === type ? "null" : typeof type, ""));
				owner = null;
		}
		key = createFiberImplClass(fiberTag, pendingProps, key, mode);
		key.elementType = type;
		key.type = owner;
		key.lanes = lanes;
		return key;
	}
	function createFiberFromFragment(elements, mode, lanes, key) {
		elements = createFiberImplClass(7, elements, key, mode);
		elements.lanes = lanes;
		return elements;
	}
	function createFiberFromText(content, mode, lanes) {
		content = createFiberImplClass(6, content, null, mode);
		content.lanes = lanes;
		return content;
	}
	function createFiberFromDehydratedFragment(dehydratedNode) {
		var fiber = createFiberImplClass(18, null, null, 0);
		fiber.stateNode = dehydratedNode;
		return fiber;
	}
	function createFiberFromPortal(portal, mode, lanes) {
		mode = createFiberImplClass(4, null !== portal.children ? portal.children : [], portal.key, mode);
		mode.lanes = lanes;
		mode.stateNode = {
			containerInfo: portal.containerInfo,
			pendingChildren: null,
			implementation: portal.implementation
		};
		return mode;
	}
	var CapturedStacks = /* @__PURE__ */ new WeakMap();
	function createCapturedValueAtFiber(value, source) {
		if ("object" === typeof value && null !== value) {
			var existing = CapturedStacks.get(value);
			if (void 0 !== existing) return existing;
			source = {
				value,
				source,
				stack: getStackByFiberInDevAndProd(source)
			};
			CapturedStacks.set(value, source);
			return source;
		}
		return {
			value,
			source,
			stack: getStackByFiberInDevAndProd(source)
		};
	}
	var forkStack = [];
	var forkStackIndex = 0;
	var treeForkProvider = null;
	var treeForkCount = 0;
	var idStack = [];
	var idStackIndex = 0;
	var treeContextProvider = null;
	var treeContextId = 1;
	var treeContextOverflow = "";
	function pushTreeFork(workInProgress, totalChildren) {
		forkStack[forkStackIndex++] = treeForkCount;
		forkStack[forkStackIndex++] = treeForkProvider;
		treeForkProvider = workInProgress;
		treeForkCount = totalChildren;
	}
	function pushTreeId(workInProgress, totalChildren, index) {
		idStack[idStackIndex++] = treeContextId;
		idStack[idStackIndex++] = treeContextOverflow;
		idStack[idStackIndex++] = treeContextProvider;
		treeContextProvider = workInProgress;
		var baseIdWithLeadingBit = treeContextId;
		workInProgress = treeContextOverflow;
		var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
		baseIdWithLeadingBit &= ~(1 << baseLength);
		index += 1;
		var length = 32 - clz32(totalChildren) + baseLength;
		if (30 < length) {
			var numberOfOverflowBits = baseLength - baseLength % 5;
			length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
			baseIdWithLeadingBit >>= numberOfOverflowBits;
			baseLength -= numberOfOverflowBits;
			treeContextId = 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit;
			treeContextOverflow = length + workInProgress;
		} else treeContextId = 1 << length | index << baseLength | baseIdWithLeadingBit, treeContextOverflow = workInProgress;
	}
	function pushMaterializedTreeId(workInProgress) {
		null !== workInProgress.return && (pushTreeFork(workInProgress, 1), pushTreeId(workInProgress, 1, 0));
	}
	function popTreeContext(workInProgress) {
		for (; workInProgress === treeForkProvider;) treeForkProvider = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null, treeForkCount = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null;
		for (; workInProgress === treeContextProvider;) treeContextProvider = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextOverflow = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextId = idStack[--idStackIndex], idStack[idStackIndex] = null;
	}
	function restoreSuspendedTreeContext(workInProgress, suspendedContext) {
		idStack[idStackIndex++] = treeContextId;
		idStack[idStackIndex++] = treeContextOverflow;
		idStack[idStackIndex++] = treeContextProvider;
		treeContextId = suspendedContext.id;
		treeContextOverflow = suspendedContext.overflow;
		treeContextProvider = workInProgress;
	}
	var hydrationParentFiber = null;
	var nextHydratableInstance = null;
	var isHydrating = !1;
	var hydrationErrors = null;
	var rootOrSingletonContext = !1;
	var HydrationMismatchException = Error(formatProdErrorMessage(519));
	function throwOnHydrationMismatch(fiber) {
		queueHydrationError(createCapturedValueAtFiber(Error(formatProdErrorMessage(418, 1 < arguments.length && void 0 !== arguments[1] && arguments[1] ? "text" : "HTML", "")), fiber));
		throw HydrationMismatchException;
	}
	function prepareToHydrateHostInstance(fiber) {
		var instance = fiber.stateNode, type = fiber.type, props = fiber.memoizedProps;
		instance[internalInstanceKey] = fiber;
		instance[internalPropsKey] = props;
		switch (type) {
			case "dialog":
				listenToNonDelegatedEvent("cancel", instance);
				listenToNonDelegatedEvent("close", instance);
				break;
			case "iframe":
			case "object":
			case "embed":
				listenToNonDelegatedEvent("load", instance);
				break;
			case "video":
			case "audio":
				for (type = 0; type < mediaEventTypes.length; type++) listenToNonDelegatedEvent(mediaEventTypes[type], instance);
				break;
			case "source":
				listenToNonDelegatedEvent("error", instance);
				break;
			case "img":
			case "image":
			case "link":
				listenToNonDelegatedEvent("error", instance);
				listenToNonDelegatedEvent("load", instance);
				break;
			case "details":
				listenToNonDelegatedEvent("toggle", instance);
				break;
			case "input":
				listenToNonDelegatedEvent("invalid", instance);
				initInput(instance, props.value, props.defaultValue, props.checked, props.defaultChecked, props.type, props.name, !0);
				break;
			case "select":
				listenToNonDelegatedEvent("invalid", instance);
				break;
			case "textarea": listenToNonDelegatedEvent("invalid", instance), initTextarea(instance, props.value, props.defaultValue, props.children);
		}
		type = props.children;
		"string" !== typeof type && "number" !== typeof type && "bigint" !== typeof type || instance.textContent === "" + type || !0 === props.suppressHydrationWarning || checkForUnmatchedText(instance.textContent, type) ? (null != props.popover && (listenToNonDelegatedEvent("beforetoggle", instance), listenToNonDelegatedEvent("toggle", instance)), null != props.onScroll && listenToNonDelegatedEvent("scroll", instance), null != props.onScrollEnd && listenToNonDelegatedEvent("scrollend", instance), null != props.onClick && (instance.onclick = noop$1), instance = !0) : instance = !1;
		instance || throwOnHydrationMismatch(fiber, !0);
	}
	function popToNextHostParent(fiber) {
		for (hydrationParentFiber = fiber.return; hydrationParentFiber;) switch (hydrationParentFiber.tag) {
			case 5:
			case 31:
			case 13:
				rootOrSingletonContext = !1;
				return;
			case 27:
			case 3:
				rootOrSingletonContext = !0;
				return;
			default: hydrationParentFiber = hydrationParentFiber.return;
		}
	}
	function popHydrationState(fiber) {
		if (fiber !== hydrationParentFiber) return !1;
		if (!isHydrating) return popToNextHostParent(fiber), isHydrating = !0, !1;
		var tag = fiber.tag, JSCompiler_temp;
		if (JSCompiler_temp = 3 !== tag && 27 !== tag) {
			if (JSCompiler_temp = 5 === tag) JSCompiler_temp = fiber.type, JSCompiler_temp = !("form" !== JSCompiler_temp && "button" !== JSCompiler_temp) || shouldSetTextContent(fiber.type, fiber.memoizedProps);
			JSCompiler_temp = !JSCompiler_temp;
		}
		JSCompiler_temp && nextHydratableInstance && throwOnHydrationMismatch(fiber);
		popToNextHostParent(fiber);
		if (13 === tag) {
			fiber = fiber.memoizedState;
			fiber = null !== fiber ? fiber.dehydrated : null;
			if (!fiber) throw Error(formatProdErrorMessage(317));
			nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
		} else if (31 === tag) {
			fiber = fiber.memoizedState;
			fiber = null !== fiber ? fiber.dehydrated : null;
			if (!fiber) throw Error(formatProdErrorMessage(317));
			nextHydratableInstance = getNextHydratableInstanceAfterHydrationBoundary(fiber);
		} else 27 === tag ? (tag = nextHydratableInstance, isSingletonScope(fiber.type) ? (fiber = previousHydratableOnEnteringScopedSingleton, previousHydratableOnEnteringScopedSingleton = null, nextHydratableInstance = fiber) : nextHydratableInstance = tag) : nextHydratableInstance = hydrationParentFiber ? getNextHydratable(fiber.stateNode.nextSibling) : null;
		return !0;
	}
	function resetHydrationState() {
		nextHydratableInstance = hydrationParentFiber = null;
		isHydrating = !1;
	}
	function upgradeHydrationErrorsToRecoverable() {
		var queuedErrors = hydrationErrors;
		null !== queuedErrors && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = queuedErrors : workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, queuedErrors), hydrationErrors = null);
		return queuedErrors;
	}
	function queueHydrationError(error) {
		null === hydrationErrors ? hydrationErrors = [error] : hydrationErrors.push(error);
	}
	var valueCursor = createCursor(null);
	var currentlyRenderingFiber$1 = null;
	var lastContextDependency = null;
	function pushProvider(providerFiber, context, nextValue) {
		push(valueCursor, context._currentValue);
		context._currentValue = nextValue;
	}
	function popProvider(context) {
		context._currentValue = valueCursor.current;
		pop(valueCursor);
	}
	function scheduleContextWorkOnParentPath(parent, renderLanes, propagationRoot) {
		for (; null !== parent;) {
			var alternate = parent.alternate;
			(parent.childLanes & renderLanes) !== renderLanes ? (parent.childLanes |= renderLanes, null !== alternate && (alternate.childLanes |= renderLanes)) : null !== alternate && (alternate.childLanes & renderLanes) !== renderLanes && (alternate.childLanes |= renderLanes);
			if (parent === propagationRoot) break;
			parent = parent.return;
		}
	}
	function propagateContextChanges(workInProgress, contexts, renderLanes, forcePropagateEntireTree) {
		var fiber = workInProgress.child;
		null !== fiber && (fiber.return = workInProgress);
		for (; null !== fiber;) {
			var list = fiber.dependencies;
			if (null !== list) {
				var nextFiber = fiber.child;
				list = list.firstContext;
				a: for (; null !== list;) {
					var dependency = list;
					list = fiber;
					for (var i = 0; i < contexts.length; i++) if (dependency.context === contexts[i]) {
						list.lanes |= renderLanes;
						dependency = list.alternate;
						null !== dependency && (dependency.lanes |= renderLanes);
						scheduleContextWorkOnParentPath(list.return, renderLanes, workInProgress);
						forcePropagateEntireTree || (nextFiber = null);
						break a;
					}
					list = dependency.next;
				}
			} else if (18 === fiber.tag) {
				nextFiber = fiber.return;
				if (null === nextFiber) throw Error(formatProdErrorMessage(341));
				nextFiber.lanes |= renderLanes;
				list = nextFiber.alternate;
				null !== list && (list.lanes |= renderLanes);
				scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
				nextFiber = null;
			} else 13 === fiber.tag && null !== fiber.memoizedState && null === fiber.memoizedState.dehydrated ? (fiber.lanes |= renderLanes, nextFiber = fiber.alternate, null !== nextFiber && (nextFiber.lanes |= renderLanes), scheduleContextWorkOnParentPath(fiber.return, renderLanes, workInProgress), nextFiber = fiber.child, nextFiber = null !== nextFiber ? nextFiber.sibling : null) : nextFiber = fiber.child;
			if (null !== nextFiber) nextFiber.return = fiber;
			else for (nextFiber = fiber; null !== nextFiber;) {
				if (nextFiber === workInProgress) {
					nextFiber = null;
					break;
				}
				fiber = nextFiber.sibling;
				if (null !== fiber) {
					fiber.return = nextFiber.return;
					nextFiber = fiber;
					break;
				}
				nextFiber = nextFiber.return;
			}
			fiber = nextFiber;
		}
	}
	function propagateParentContextChanges(current, workInProgress, renderLanes, forcePropagateEntireTree) {
		current = null;
		for (var parent = workInProgress, isInsidePropagationBailout = !1; null !== parent;) {
			if (!isInsidePropagationBailout) {
				if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = !0;
				else if (0 !== (parent.flags & 262144)) break;
			}
			if (10 === parent.tag) {
				var currentParent = parent.alternate;
				if (null === currentParent) throw Error(formatProdErrorMessage(387));
				currentParent = currentParent.memoizedProps;
				if (null !== currentParent) {
					var context = parent.type;
					objectIs(parent.pendingProps.value, currentParent.value) || (null !== current ? current.push(context) : current = [context]);
				}
			} else if (parent === hostTransitionProviderCursor.current) {
				currentParent = parent.alternate;
				if (null === currentParent) throw Error(formatProdErrorMessage(387));
				currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState && (null !== current ? current.push(HostTransitionContext) : current = [HostTransitionContext]);
			}
			parent = parent.return;
		}
		null !== current && propagateContextChanges(workInProgress, current, renderLanes, forcePropagateEntireTree);
		workInProgress.flags |= 262144;
		return null !== current;
	}
	function checkIfContextChanged(currentDependencies) {
		for (currentDependencies = currentDependencies.firstContext; null !== currentDependencies;) {
			if (!objectIs(currentDependencies.context._currentValue, currentDependencies.memoizedValue)) return !0;
			currentDependencies = currentDependencies.next;
		}
		return !1;
	}
	function prepareToReadContext(workInProgress) {
		currentlyRenderingFiber$1 = workInProgress;
		lastContextDependency = null;
		workInProgress = workInProgress.dependencies;
		null !== workInProgress && (workInProgress.firstContext = null);
	}
	function readContext(context) {
		return readContextForConsumer(currentlyRenderingFiber$1, context);
	}
	function readContextDuringReconciliation(consumer, context) {
		null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
		return readContextForConsumer(consumer, context);
	}
	function readContextForConsumer(consumer, context) {
		var value = context._currentValue;
		context = {
			context,
			memoizedValue: value,
			next: null
		};
		if (null === lastContextDependency) {
			if (null === consumer) throw Error(formatProdErrorMessage(308));
			lastContextDependency = context;
			consumer.dependencies = {
				lanes: 0,
				firstContext: context
			};
			consumer.flags |= 524288;
		} else lastContextDependency = lastContextDependency.next = context;
		return value;
	}
	var AbortControllerLocal = "undefined" !== typeof AbortController ? AbortController : function() {
		var listeners = [], signal = this.signal = {
			aborted: !1,
			addEventListener: function(type, listener) {
				listeners.push(listener);
			}
		};
		this.abort = function() {
			signal.aborted = !0;
			listeners.forEach(function(listener) {
				return listener();
			});
		};
	};
	var scheduleCallback$2 = Scheduler.unstable_scheduleCallback;
	var NormalPriority = Scheduler.unstable_NormalPriority;
	var CacheContext = {
		$$typeof: REACT_CONTEXT_TYPE,
		Consumer: null,
		Provider: null,
		_currentValue: null,
		_currentValue2: null,
		_threadCount: 0
	};
	function createCache() {
		return {
			controller: new AbortControllerLocal(),
			data: /* @__PURE__ */ new Map(),
			refCount: 0
		};
	}
	function releaseCache(cache) {
		cache.refCount--;
		0 === cache.refCount && scheduleCallback$2(NormalPriority, function() {
			cache.controller.abort();
		});
	}
	function queueTransitionTypes(root, transitionTypes) {
		if (0 !== (root.pendingLanes & 4194048)) {
			var queued = root.transitionTypes;
			null === queued && (queued = root.transitionTypes = []);
			for (root = 0; root < transitionTypes.length; root++) {
				var transitionType = transitionTypes[root];
				-1 === queued.indexOf(transitionType) && queued.push(transitionType);
			}
		}
	}
	var entangledTransitionTypes = null;
	function claimQueuedTransitionTypes(root) {
		var claimed = root.transitionTypes;
		root.transitionTypes = null;
		return claimed;
	}
	var currentEntangledListeners = null;
	var currentEntangledPendingCount = 0;
	var currentEntangledLane = 0;
	var currentEntangledActionThenable = null;
	function entangleAsyncAction(transition, thenable) {
		if (null === currentEntangledListeners) {
			var entangledListeners = currentEntangledListeners = [];
			currentEntangledPendingCount = 0;
			currentEntangledLane = requestTransitionLane();
			currentEntangledActionThenable = {
				status: "pending",
				value: void 0,
				then: function(resolve) {
					entangledListeners.push(resolve);
				}
			};
		}
		currentEntangledPendingCount++;
		thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
		return thenable;
	}
	function pingEngtangledActionScope() {
		if (0 === --currentEntangledPendingCount && (entangledTransitionTypes = null, null !== currentEntangledListeners)) {
			null !== currentEntangledActionThenable && (currentEntangledActionThenable.status = "fulfilled");
			var listeners = currentEntangledListeners;
			currentEntangledListeners = null;
			currentEntangledLane = 0;
			currentEntangledActionThenable = null;
			for (var i = 0; i < listeners.length; i++) (0, listeners[i])();
		}
	}
	function chainThenableValue(thenable, result) {
		var listeners = [], thenableWithOverride = {
			status: "pending",
			value: null,
			reason: null,
			then: function(resolve) {
				listeners.push(resolve);
			}
		};
		thenable.then(function() {
			thenableWithOverride.status = "fulfilled";
			thenableWithOverride.value = result;
			for (var i = 0; i < listeners.length; i++) (0, listeners[i])(result);
		}, function(error) {
			thenableWithOverride.status = "rejected";
			thenableWithOverride.reason = error;
			for (error = 0; error < listeners.length; error++) (0, listeners[error])(void 0);
		});
		return thenableWithOverride;
	}
	var prevOnStartTransitionFinish = ReactSharedInternals.S;
	ReactSharedInternals.S = function(transition, returnValue) {
		globalMostRecentTransitionTime = now();
		"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && entangleAsyncAction(transition, returnValue);
		if (null !== entangledTransitionTypes) for (var root$28 = firstScheduledRoot; null !== root$28;) queueTransitionTypes(root$28, entangledTransitionTypes), root$28 = root$28.next;
		root$28 = transition.types;
		if (null !== root$28) {
			for (var root$29 = firstScheduledRoot; null !== root$29;) queueTransitionTypes(root$29, root$28), root$29 = root$29.next;
			if (0 !== currentEntangledLane) {
				root$29 = entangledTransitionTypes;
				null === root$29 && (root$29 = entangledTransitionTypes = []);
				for (var i = 0; i < root$28.length; i++) {
					var transitionType = root$28[i];
					-1 === root$29.indexOf(transitionType) && root$29.push(transitionType);
				}
			}
		}
		null !== prevOnStartTransitionFinish && prevOnStartTransitionFinish(transition, returnValue);
	};
	var resumedCache = createCursor(null);
	function peekCacheFromPool() {
		var cacheResumedFromPreviousRender = resumedCache.current;
		return null !== cacheResumedFromPreviousRender ? cacheResumedFromPreviousRender : workInProgressRoot.pooledCache;
	}
	function pushTransition(offscreenWorkInProgress, prevCachePool) {
		null === prevCachePool ? push(resumedCache, resumedCache.current) : push(resumedCache, prevCachePool.pool);
	}
	function getSuspendedCache() {
		var cacheFromPool = peekCacheFromPool();
		return null === cacheFromPool ? null : {
			parent: CacheContext._currentValue,
			pool: cacheFromPool
		};
	}
	var SuspenseException = Error(formatProdErrorMessage(460));
	var SuspenseyCommitException = Error(formatProdErrorMessage(474));
	var SuspenseActionException = Error(formatProdErrorMessage(542));
	var noopSuspenseyCommitThenable = { then: function() {} };
	function isThenableResolved(thenable) {
		thenable = thenable.status;
		return "fulfilled" === thenable || "rejected" === thenable;
	}
	function trackUsedThenable(thenableState, thenable, index) {
		index = thenableState[index];
		void 0 === index ? thenableState.push(thenable) : index !== thenable && (thenable.then(noop$1, noop$1), thenable = index);
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected":
				thenableState = thenable.reason;
				checkIfUseWrappedInAsyncCatch(thenableState);
				if (void 0 === thenableState && !("reason" in thenable)) throw Error(formatProdErrorMessage(600));
				throw thenableState;
			default:
				if ("string" === typeof thenable.status) thenable.then(noop$1, noop$1);
				else {
					thenableState = workInProgressRoot;
					if (null !== thenableState && 100 < thenableState.shellSuspendCounter) throw Error(formatProdErrorMessage(482));
					thenableState = thenable;
					thenableState.status = "pending";
					thenableState.then(function(fulfilledValue) {
						if ("pending" === thenable.status) {
							var fulfilledThenable = thenable;
							fulfilledThenable.status = "fulfilled";
							fulfilledThenable.value = fulfilledValue;
						}
					}, function(error) {
						if ("pending" === thenable.status) {
							var rejectedThenable = thenable;
							rejectedThenable.status = "rejected";
							rejectedThenable.reason = error;
						}
					});
				}
				switch (thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenableState = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState), thenableState;
				}
				suspendedThenable = thenable;
				throw SuspenseException;
		}
	}
	function resolveLazy(lazyType) {
		try {
			return (0, lazyType._init)(lazyType._payload);
		} catch (x) {
			if (null !== x && "object" === typeof x && "function" === typeof x.then) throw suspendedThenable = x, SuspenseException;
			throw x;
		}
	}
	var suspendedThenable = null;
	function getSuspendedThenable() {
		if (null === suspendedThenable) throw Error(formatProdErrorMessage(459));
		var thenable = suspendedThenable;
		suspendedThenable = null;
		return thenable;
	}
	function checkIfUseWrappedInAsyncCatch(rejectedReason) {
		if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException) throw Error(formatProdErrorMessage(483));
	}
	var thenableState$1 = null;
	var thenableIndexCounter$1 = 0;
	function unwrapThenable(thenable) {
		var index = thenableIndexCounter$1;
		thenableIndexCounter$1 += 1;
		null === thenableState$1 && (thenableState$1 = []);
		return trackUsedThenable(thenableState$1, thenable, index);
	}
	function coerceRef(workInProgress, element) {
		element = element.props.ref;
		workInProgress.ref = void 0 !== element ? element : null;
	}
	function throwOnInvalidObjectTypeImpl(returnFiber, newChild) {
		if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE) throw Error(formatProdErrorMessage(525));
		returnFiber = Object.prototype.toString.call(newChild);
		throw Error(formatProdErrorMessage(31, "[object Object]" === returnFiber ? "object with keys {" + Object.keys(newChild).join(", ") + "}" : returnFiber));
	}
	function createChildReconciler(shouldTrackSideEffects) {
		function deleteChild(returnFiber, childToDelete) {
			if (shouldTrackSideEffects) {
				var deletions = returnFiber.deletions;
				null === deletions ? (returnFiber.deletions = [childToDelete], returnFiber.flags |= 16) : deletions.push(childToDelete);
			}
		}
		function deleteRemainingChildren(returnFiber, currentFirstChild) {
			if (!shouldTrackSideEffects) return null;
			for (; null !== currentFirstChild;) deleteChild(returnFiber, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
			return null;
		}
		function mapRemainingChildren(currentFirstChild) {
			for (var existingChildren = /* @__PURE__ */ new Map(); null !== currentFirstChild;) null === currentFirstChild.key ? existingChildren.set(currentFirstChild.index, currentFirstChild) : existingChildren.set(currentFirstChild.key, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
			return existingChildren;
		}
		function useFiber(fiber, pendingProps) {
			fiber = createWorkInProgress(fiber, pendingProps);
			fiber.index = 0;
			fiber.sibling = null;
			return fiber;
		}
		function placeChild(newFiber, lastPlacedIndex, newIndex) {
			newFiber.index = newIndex;
			if (!shouldTrackSideEffects) return newFiber.flags |= 1048576, lastPlacedIndex;
			newIndex = newFiber.alternate;
			if (null !== newIndex) return newIndex = newIndex.index, newIndex < lastPlacedIndex ? (newFiber.flags |= 2, lastPlacedIndex) : newIndex;
			newFiber.flags |= 0x8000002;
			return lastPlacedIndex;
		}
		function placeSingleChild(newFiber) {
			shouldTrackSideEffects && null === newFiber.alternate && (newFiber.flags |= 0x8000002);
			return newFiber;
		}
		function updateTextNode(returnFiber, current, textContent, lanes) {
			if (null === current || 6 !== current.tag) return current = createFiberFromText(textContent, returnFiber.mode, lanes), current.return = returnFiber, current;
			current = useFiber(current, textContent);
			current.return = returnFiber;
			return current;
		}
		function updateElement(returnFiber, current, element, lanes) {
			var elementType = element.type;
			if (elementType === REACT_FRAGMENT_TYPE) return returnFiber = updateFragment(returnFiber, current, element.props.children, lanes, element.key), coerceRef(returnFiber, element), returnFiber;
			if (null !== current && (current.elementType === elementType || "object" === typeof elementType && null !== elementType && elementType.$$typeof === REACT_LAZY_TYPE && resolveLazy(elementType) === current.type)) return current = useFiber(current, element.props), coerceRef(current, element), current.return = returnFiber, current;
			current = createFiberFromTypeAndProps(element.type, element.key, element.props, null, returnFiber.mode, lanes);
			coerceRef(current, element);
			current.return = returnFiber;
			return current;
		}
		function updatePortal(returnFiber, current, portal, lanes) {
			if (null === current || 4 !== current.tag || current.stateNode.containerInfo !== portal.containerInfo || current.stateNode.implementation !== portal.implementation) return current = createFiberFromPortal(portal, returnFiber.mode, lanes), current.return = returnFiber, current;
			current = useFiber(current, portal.children || []);
			current.return = returnFiber;
			return current;
		}
		function updateFragment(returnFiber, current, fragment, lanes, key) {
			if (null === current || 7 !== current.tag) return current = createFiberFromFragment(fragment, returnFiber.mode, lanes, key), current.return = returnFiber, current;
			current = useFiber(current, fragment);
			current.return = returnFiber;
			return current;
		}
		function createChild(returnFiber, newChild, lanes) {
			if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild) return newChild = createFiberFromText("" + newChild, returnFiber.mode, lanes), newChild.return = returnFiber, newChild;
			if ("object" === typeof newChild && null !== newChild) {
				switch (newChild.$$typeof) {
					case REACT_ELEMENT_TYPE: return lanes = createFiberFromTypeAndProps(newChild.type, newChild.key, newChild.props, null, returnFiber.mode, lanes), coerceRef(lanes, newChild), lanes.return = returnFiber, lanes;
					case REACT_PORTAL_TYPE: return newChild = createFiberFromPortal(newChild, returnFiber.mode, lanes), newChild.return = returnFiber, newChild;
					case REACT_LAZY_TYPE: return newChild = resolveLazy(newChild), createChild(returnFiber, newChild, lanes);
				}
				if (isArrayImpl(newChild) || getIteratorFn(newChild)) return newChild = createFiberFromFragment(newChild, returnFiber.mode, lanes, null), newChild.return = returnFiber, newChild;
				if ("function" === typeof newChild.then) return createChild(returnFiber, unwrapThenable(newChild), lanes);
				if (newChild.$$typeof === REACT_CONTEXT_TYPE) return createChild(returnFiber, readContextDuringReconciliation(returnFiber, newChild), lanes);
				throwOnInvalidObjectTypeImpl(returnFiber, newChild);
			}
			return null;
		}
		function updateSlot(returnFiber, oldFiber, newChild, lanes) {
			var key = null !== oldFiber ? oldFiber.key : null;
			if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild) return null !== key ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
			if ("object" === typeof newChild && null !== newChild) {
				switch (newChild.$$typeof) {
					case REACT_ELEMENT_TYPE: return newChild.key === key ? updateElement(returnFiber, oldFiber, newChild, lanes) : null;
					case REACT_PORTAL_TYPE: return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
					case REACT_LAZY_TYPE: return newChild = resolveLazy(newChild), updateSlot(returnFiber, oldFiber, newChild, lanes);
				}
				if (isArrayImpl(newChild) || getIteratorFn(newChild)) return null !== key ? null : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
				if ("function" === typeof newChild.then) return updateSlot(returnFiber, oldFiber, unwrapThenable(newChild), lanes);
				if (newChild.$$typeof === REACT_CONTEXT_TYPE) return updateSlot(returnFiber, oldFiber, readContextDuringReconciliation(returnFiber, newChild), lanes);
				throwOnInvalidObjectTypeImpl(returnFiber, newChild);
			}
			return null;
		}
		function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
			if ("string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild) return existingChildren = existingChildren.get(newIdx) || null, updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
			if ("object" === typeof newChild && null !== newChild) {
				switch (newChild.$$typeof) {
					case REACT_ELEMENT_TYPE: return existingChildren = existingChildren.get(null === newChild.key ? newIdx : newChild.key) || null, updateElement(returnFiber, existingChildren, newChild, lanes);
					case REACT_PORTAL_TYPE: return existingChildren = existingChildren.get(null === newChild.key ? newIdx : newChild.key) || null, updatePortal(returnFiber, existingChildren, newChild, lanes);
					case REACT_LAZY_TYPE: return newChild = resolveLazy(newChild), updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes);
				}
				if (isArrayImpl(newChild) || getIteratorFn(newChild)) return existingChildren = existingChildren.get(newIdx) || null, updateFragment(returnFiber, existingChildren, newChild, lanes, null);
				if ("function" === typeof newChild.then) return updateFromMap(existingChildren, returnFiber, newIdx, unwrapThenable(newChild), lanes);
				if (newChild.$$typeof === REACT_CONTEXT_TYPE) return updateFromMap(existingChildren, returnFiber, newIdx, readContextDuringReconciliation(returnFiber, newChild), lanes);
				throwOnInvalidObjectTypeImpl(returnFiber, newChild);
			}
			return null;
		}
		function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
			for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null; null !== oldFiber && newIdx < newChildren.length; newIdx++) {
				oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
				var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
				if (null === newFiber) {
					null === oldFiber && (oldFiber = nextOldFiber);
					break;
				}
				shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
				currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
				null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
				previousNewFiber = newFiber;
				oldFiber = nextOldFiber;
			}
			if (newIdx === newChildren.length) return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
			if (null === oldFiber) {
				for (; newIdx < newChildren.length; newIdx++) oldFiber = createChild(returnFiber, newChildren[newIdx], lanes), null !== oldFiber && (currentFirstChild = placeChild(oldFiber, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
				isHydrating && pushTreeFork(returnFiber, newIdx);
				return resultingFirstChild;
			}
			for (oldFiber = mapRemainingChildren(oldFiber); newIdx < newChildren.length; newIdx++) nextOldFiber = updateFromMap(oldFiber, returnFiber, newIdx, newChildren[newIdx], lanes), null !== nextOldFiber && (shouldTrackSideEffects && (newFiber = nextOldFiber.alternate, null !== newFiber && oldFiber.delete(null === newFiber.key ? newIdx : newFiber.key)), currentFirstChild = placeChild(nextOldFiber, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
			shouldTrackSideEffects && oldFiber.forEach(function(child) {
				return deleteChild(returnFiber, child);
			});
			isHydrating && pushTreeFork(returnFiber, newIdx);
			return resultingFirstChild;
		}
		function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
			if (null == newChildren) throw Error(formatProdErrorMessage(151));
			for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null, step = newChildren.next(); null !== oldFiber && !step.done; newIdx++, step = newChildren.next()) {
				oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
				var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
				if (null === newFiber) {
					null === oldFiber && (oldFiber = nextOldFiber);
					break;
				}
				shouldTrackSideEffects && oldFiber && null === newFiber.alternate && deleteChild(returnFiber, oldFiber);
				currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
				null === previousNewFiber ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
				previousNewFiber = newFiber;
				oldFiber = nextOldFiber;
			}
			if (step.done) return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
			if (null === oldFiber) {
				for (; !step.done; newIdx++, step = newChildren.next()) step = createChild(returnFiber, step.value, lanes), null !== step && (currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
				isHydrating && pushTreeFork(returnFiber, newIdx);
				return resultingFirstChild;
			}
			for (oldFiber = mapRemainingChildren(oldFiber); !step.done; newIdx++, step = newChildren.next()) step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes), null !== step && (shouldTrackSideEffects && (nextOldFiber = step.alternate, null !== nextOldFiber && oldFiber.delete(null === nextOldFiber.key ? newIdx : nextOldFiber.key)), currentFirstChild = placeChild(step, currentFirstChild, newIdx), null === previousNewFiber ? resultingFirstChild = step : previousNewFiber.sibling = step, previousNewFiber = step);
			shouldTrackSideEffects && oldFiber.forEach(function(child) {
				return deleteChild(returnFiber, child);
			});
			isHydrating && pushTreeFork(returnFiber, newIdx);
			return resultingFirstChild;
		}
		function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
			"object" === typeof newChild && null !== newChild && newChild.type === REACT_FRAGMENT_TYPE && null === newChild.key && void 0 === newChild.props.ref && (newChild = newChild.props.children);
			if ("object" === typeof newChild && null !== newChild) {
				switch (newChild.$$typeof) {
					case REACT_ELEMENT_TYPE:
						a: {
							for (var key = newChild.key; null !== currentFirstChild;) {
								if (currentFirstChild.key === key) {
									key = newChild.type;
									if (key === REACT_FRAGMENT_TYPE) {
										if (7 === currentFirstChild.tag) {
											deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
											lanes = useFiber(currentFirstChild, newChild.props.children);
											coerceRef(lanes, newChild);
											lanes.return = returnFiber;
											returnFiber = lanes;
											break a;
										}
									} else if (currentFirstChild.elementType === key || "object" === typeof key && null !== key && key.$$typeof === REACT_LAZY_TYPE && resolveLazy(key) === currentFirstChild.type) {
										deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
										lanes = useFiber(currentFirstChild, newChild.props);
										coerceRef(lanes, newChild);
										lanes.return = returnFiber;
										returnFiber = lanes;
										break a;
									}
									deleteRemainingChildren(returnFiber, currentFirstChild);
									break;
								} else deleteChild(returnFiber, currentFirstChild);
								currentFirstChild = currentFirstChild.sibling;
							}
							newChild.type === REACT_FRAGMENT_TYPE ? (lanes = createFiberFromFragment(newChild.props.children, returnFiber.mode, lanes, newChild.key), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes) : (lanes = createFiberFromTypeAndProps(newChild.type, newChild.key, newChild.props, null, returnFiber.mode, lanes), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = lanes);
						}
						return placeSingleChild(returnFiber);
					case REACT_PORTAL_TYPE:
						a: {
							for (key = newChild.key; null !== currentFirstChild;) {
								if (currentFirstChild.key === key) if (4 === currentFirstChild.tag && currentFirstChild.stateNode.containerInfo === newChild.containerInfo && currentFirstChild.stateNode.implementation === newChild.implementation) {
									deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
									lanes = useFiber(currentFirstChild, newChild.children || []);
									lanes.return = returnFiber;
									returnFiber = lanes;
									break a;
								} else {
									deleteRemainingChildren(returnFiber, currentFirstChild);
									break;
								}
								else deleteChild(returnFiber, currentFirstChild);
								currentFirstChild = currentFirstChild.sibling;
							}
							lanes = createFiberFromPortal(newChild, returnFiber.mode, lanes);
							lanes.return = returnFiber;
							returnFiber = lanes;
						}
						return placeSingleChild(returnFiber);
					case REACT_LAZY_TYPE: return newChild = resolveLazy(newChild), reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
				}
				if (isArrayImpl(newChild)) return reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes);
				if (getIteratorFn(newChild)) {
					key = getIteratorFn(newChild);
					if ("function" !== typeof key) throw Error(formatProdErrorMessage(150));
					newChild = key.call(newChild);
					return reconcileChildrenIterator(returnFiber, currentFirstChild, newChild, lanes);
				}
				if ("function" === typeof newChild.then) return reconcileChildFibersImpl(returnFiber, currentFirstChild, unwrapThenable(newChild), lanes);
				if (newChild.$$typeof === REACT_CONTEXT_TYPE) return reconcileChildFibersImpl(returnFiber, currentFirstChild, readContextDuringReconciliation(returnFiber, newChild), lanes);
				throwOnInvalidObjectTypeImpl(returnFiber, newChild);
			}
			return "string" === typeof newChild && "" !== newChild || "number" === typeof newChild || "bigint" === typeof newChild ? (newChild = "" + newChild, null !== currentFirstChild && 6 === currentFirstChild.tag ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling), lanes = useFiber(currentFirstChild, newChild), lanes.return = returnFiber, returnFiber = lanes) : (deleteRemainingChildren(returnFiber, currentFirstChild), lanes = createFiberFromText(newChild, returnFiber.mode, lanes), lanes.return = returnFiber, returnFiber = lanes), placeSingleChild(returnFiber)) : deleteRemainingChildren(returnFiber, currentFirstChild);
		}
		return function(returnFiber, currentFirstChild, newChild, lanes) {
			try {
				thenableIndexCounter$1 = 0;
				var firstChildFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
				thenableState$1 = null;
				return firstChildFiber;
			} catch (x) {
				if (x === SuspenseException || x === SuspenseActionException) throw x;
				var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
				fiber.lanes = lanes;
				fiber.return = returnFiber;
				return fiber;
			}
		};
	}
	var reconcileChildFibers = createChildReconciler(!0);
	var mountChildFibers = createChildReconciler(!1);
	var hasForceUpdate = !1;
	function initializeUpdateQueue(fiber) {
		fiber.updateQueue = {
			baseState: fiber.memoizedState,
			firstBaseUpdate: null,
			lastBaseUpdate: null,
			shared: {
				pending: null,
				lanes: 0,
				hiddenCallbacks: null
			},
			callbacks: null
		};
	}
	function cloneUpdateQueue(current, workInProgress) {
		current = current.updateQueue;
		workInProgress.updateQueue === current && (workInProgress.updateQueue = {
			baseState: current.baseState,
			firstBaseUpdate: current.firstBaseUpdate,
			lastBaseUpdate: current.lastBaseUpdate,
			shared: current.shared,
			callbacks: null
		});
	}
	function createUpdate(lane) {
		return {
			lane,
			tag: 0,
			payload: null,
			callback: null,
			next: null
		};
	}
	function enqueueUpdate(fiber, update, lane) {
		var updateQueue = fiber.updateQueue;
		if (null === updateQueue) return null;
		updateQueue = updateQueue.shared;
		if (0 !== (executionContext & 2)) {
			var pending = updateQueue.pending;
			null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
			updateQueue.pending = update;
			update = getRootForUpdatedFiber(fiber);
			markUpdateLaneFromFiberToRoot(fiber, null, lane);
			return update;
		}
		enqueueUpdate$1(fiber, updateQueue, update, lane);
		return getRootForUpdatedFiber(fiber);
	}
	function entangleTransitions(root, fiber, lane) {
		fiber = fiber.updateQueue;
		if (null !== fiber && (fiber = fiber.shared, 0 !== (lane & 4194048))) {
			var queueLanes = fiber.lanes;
			queueLanes &= root.pendingLanes;
			lane |= queueLanes;
			fiber.lanes = lane;
			markRootEntangled(root, lane);
		}
	}
	function enqueueCapturedUpdate(workInProgress, capturedUpdate) {
		var queue = workInProgress.updateQueue, current = workInProgress.alternate;
		if (null !== current && (current = current.updateQueue, queue === current)) {
			var newFirst = null, newLast = null;
			queue = queue.firstBaseUpdate;
			if (null !== queue) {
				do {
					var clone = {
						lane: queue.lane,
						tag: queue.tag,
						payload: queue.payload,
						callback: null,
						next: null
					};
					null === newLast ? newFirst = newLast = clone : newLast = newLast.next = clone;
					queue = queue.next;
				} while (null !== queue);
				null === newLast ? newFirst = newLast = capturedUpdate : newLast = newLast.next = capturedUpdate;
			} else newFirst = newLast = capturedUpdate;
			queue = {
				baseState: current.baseState,
				firstBaseUpdate: newFirst,
				lastBaseUpdate: newLast,
				shared: current.shared,
				callbacks: current.callbacks
			};
			workInProgress.updateQueue = queue;
			return;
		}
		workInProgress = queue.lastBaseUpdate;
		null === workInProgress ? queue.firstBaseUpdate = capturedUpdate : workInProgress.next = capturedUpdate;
		queue.lastBaseUpdate = capturedUpdate;
	}
	var didReadFromEntangledAsyncAction = !1;
	function suspendIfUpdateReadFromEntangledAsyncAction() {
		if (didReadFromEntangledAsyncAction) {
			var entangledActionThenable = currentEntangledActionThenable;
			if (null !== entangledActionThenable) throw entangledActionThenable;
		}
	}
	function processUpdateQueue(workInProgress$jscomp$0, props, instance$jscomp$0, renderLanes) {
		didReadFromEntangledAsyncAction = !1;
		var queue = workInProgress$jscomp$0.updateQueue;
		hasForceUpdate = !1;
		var firstBaseUpdate = queue.firstBaseUpdate, lastBaseUpdate = queue.lastBaseUpdate, pendingQueue = queue.shared.pending;
		if (null !== pendingQueue) {
			queue.shared.pending = null;
			var lastPendingUpdate = pendingQueue, firstPendingUpdate = lastPendingUpdate.next;
			lastPendingUpdate.next = null;
			null === lastBaseUpdate ? firstBaseUpdate = firstPendingUpdate : lastBaseUpdate.next = firstPendingUpdate;
			lastBaseUpdate = lastPendingUpdate;
			var current = workInProgress$jscomp$0.alternate;
			null !== current && (current = current.updateQueue, pendingQueue = current.lastBaseUpdate, pendingQueue !== lastBaseUpdate && (null === pendingQueue ? current.firstBaseUpdate = firstPendingUpdate : pendingQueue.next = firstPendingUpdate, current.lastBaseUpdate = lastPendingUpdate));
		}
		if (null !== firstBaseUpdate) {
			var newState = queue.baseState;
			lastBaseUpdate = 0;
			current = firstPendingUpdate = lastPendingUpdate = null;
			pendingQueue = firstBaseUpdate;
			do {
				var updateLane = pendingQueue.lane & -536870913, isHiddenUpdate = updateLane !== pendingQueue.lane;
				if (isHiddenUpdate ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
					0 !== updateLane && updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction = !0);
					null !== current && (current = current.next = {
						lane: 0,
						tag: pendingQueue.tag,
						payload: pendingQueue.payload,
						callback: null,
						next: null
					});
					a: {
						var workInProgress = workInProgress$jscomp$0, update = pendingQueue;
						updateLane = props;
						var instance = instance$jscomp$0;
						switch (update.tag) {
							case 1:
								workInProgress = update.payload;
								if ("function" === typeof workInProgress) {
									newState = workInProgress.call(instance, newState, updateLane);
									break a;
								}
								newState = workInProgress;
								break a;
							case 3: workInProgress.flags = workInProgress.flags & -65537 | 128;
							case 0:
								workInProgress = update.payload;
								updateLane = "function" === typeof workInProgress ? workInProgress.call(instance, newState, updateLane) : workInProgress;
								if (null === updateLane || void 0 === updateLane) break a;
								newState = assign({}, newState, updateLane);
								break a;
							case 2: hasForceUpdate = !0;
						}
					}
					updateLane = pendingQueue.callback;
					null !== updateLane && (workInProgress$jscomp$0.flags |= 64, isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192), isHiddenUpdate = queue.callbacks, null === isHiddenUpdate ? queue.callbacks = [updateLane] : isHiddenUpdate.push(updateLane));
				} else isHiddenUpdate = {
					lane: updateLane,
					tag: pendingQueue.tag,
					payload: pendingQueue.payload,
					callback: pendingQueue.callback,
					next: null
				}, null === current ? (firstPendingUpdate = current = isHiddenUpdate, lastPendingUpdate = newState) : current = current.next = isHiddenUpdate, lastBaseUpdate |= updateLane;
				pendingQueue = pendingQueue.next;
				if (null === pendingQueue) if (pendingQueue = queue.shared.pending, null === pendingQueue) break;
				else isHiddenUpdate = pendingQueue, pendingQueue = isHiddenUpdate.next, isHiddenUpdate.next = null, queue.lastBaseUpdate = isHiddenUpdate, queue.shared.pending = null;
			} while (1);
			null === current && (lastPendingUpdate = newState);
			queue.baseState = lastPendingUpdate;
			queue.firstBaseUpdate = firstPendingUpdate;
			queue.lastBaseUpdate = current;
			null === firstBaseUpdate && (queue.shared.lanes = 0);
			workInProgressRootSkippedLanes |= lastBaseUpdate;
			workInProgress$jscomp$0.lanes = lastBaseUpdate;
			workInProgress$jscomp$0.memoizedState = newState;
		}
	}
	function callCallback(callback, context) {
		if ("function" !== typeof callback) throw Error(formatProdErrorMessage(191, callback));
		callback.call(context);
	}
	function commitCallbacks(updateQueue, context) {
		var callbacks = updateQueue.callbacks;
		if (null !== callbacks) for (updateQueue.callbacks = null, updateQueue = 0; updateQueue < callbacks.length; updateQueue++) callCallback(callbacks[updateQueue], context);
	}
	var currentTreeHiddenStackCursor = createCursor(null);
	var prevEntangledRenderLanesCursor = createCursor(0);
	function pushHiddenContext(fiber, context) {
		fiber = entangledRenderLanes;
		push(prevEntangledRenderLanesCursor, fiber);
		push(currentTreeHiddenStackCursor, context);
		entangledRenderLanes = fiber | context.baseLanes;
	}
	function reuseHiddenContextOnStack() {
		push(prevEntangledRenderLanesCursor, entangledRenderLanes);
		push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
	}
	function popHiddenContext() {
		entangledRenderLanes = prevEntangledRenderLanesCursor.current;
		pop(currentTreeHiddenStackCursor);
		pop(prevEntangledRenderLanesCursor);
	}
	var suspenseHandlerStackCursor = createCursor(null);
	var shellBoundary = null;
	function pushPrimaryTreeSuspenseHandler(handler) {
		var current = handler.alternate;
		push(suspenseStackCursor, suspenseStackCursor.current & 1);
		push(suspenseHandlerStackCursor, handler);
		null === shellBoundary && (null === current || null !== currentTreeHiddenStackCursor.current ? shellBoundary = handler : null !== current.memoizedState && (shellBoundary = handler));
	}
	function pushDehydratedActivitySuspenseHandler(fiber) {
		push(suspenseStackCursor, suspenseStackCursor.current);
		push(suspenseHandlerStackCursor, fiber);
		null === shellBoundary && (shellBoundary = fiber);
	}
	function pushOffscreenSuspenseHandler(fiber) {
		22 === fiber.tag ? (push(suspenseStackCursor, suspenseStackCursor.current), push(suspenseHandlerStackCursor, fiber), null === shellBoundary && (shellBoundary = fiber)) : reuseSuspenseHandlerOnStack();
	}
	function reuseSuspenseHandlerOnStack() {
		push(suspenseStackCursor, suspenseStackCursor.current);
		push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
	}
	function popSuspenseHandler(fiber) {
		pop(suspenseHandlerStackCursor);
		shellBoundary === fiber && (shellBoundary = null);
		pop(suspenseStackCursor);
	}
	var suspenseStackCursor = createCursor(0);
	function pushSuspenseListContext(fiber, newContext) {
		push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
		push(suspenseStackCursor, newContext);
	}
	function popSuspenseListContext(fiber) {
		pop(suspenseStackCursor);
		pop(suspenseHandlerStackCursor);
		shellBoundary === fiber && (shellBoundary = null);
	}
	function findFirstSuspended(row) {
		for (var node = row; null !== node;) {
			if (13 === node.tag) {
				var state = node.memoizedState;
				if (null !== state && (state = state.dehydrated, null === state || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state))) return node;
			} else if (19 === node.tag && "independent" !== node.memoizedProps.revealOrder) {
				if (0 !== (node.flags & 128)) return node;
			} else if (null !== node.child) {
				node.child.return = node;
				node = node.child;
				continue;
			}
			if (node === row) break;
			for (; null === node.sibling;) {
				if (null === node.return || node.return === row) return null;
				node = node.return;
			}
			node.sibling.return = node.return;
			node = node.sibling;
		}
		return null;
	}
	var renderLanes = 0;
	var currentlyRenderingFiber = null;
	var currentHook = null;
	var workInProgressHook = null;
	var didScheduleRenderPhaseUpdate = !1;
	var didScheduleRenderPhaseUpdateDuringThisPass = !1;
	var shouldDoubleInvokeUserFnsInHooksDEV = !1;
	var localIdCounter = 0;
	var thenableIndexCounter = 0;
	var thenableState = null;
	var globalClientIdCounter = 0;
	function throwInvalidHookError() {
		throw Error(formatProdErrorMessage(321));
	}
	function areHookInputsEqual(nextDeps, prevDeps) {
		if (null === prevDeps) return !1;
		for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++) if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
		return !0;
	}
	function renderWithHooks(current, workInProgress, Component, props, secondArg, nextRenderLanes) {
		renderLanes = nextRenderLanes;
		currentlyRenderingFiber = workInProgress;
		workInProgress.memoizedState = null;
		workInProgress.updateQueue = null;
		workInProgress.lanes = 0;
		ReactSharedInternals.H = null === current || null === current.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate;
		shouldDoubleInvokeUserFnsInHooksDEV = !1;
		nextRenderLanes = Component(props, secondArg);
		shouldDoubleInvokeUserFnsInHooksDEV = !1;
		didScheduleRenderPhaseUpdateDuringThisPass && (nextRenderLanes = renderWithHooksAgain(workInProgress, Component, props, secondArg));
		finishRenderingHooks(current);
		return nextRenderLanes;
	}
	function finishRenderingHooks(current) {
		ReactSharedInternals.H = ContextOnlyDispatcher;
		var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
		renderLanes = 0;
		workInProgressHook = currentHook = currentlyRenderingFiber = null;
		didScheduleRenderPhaseUpdate = !1;
		thenableIndexCounter = 0;
		thenableState = null;
		if (didRenderTooFewHooks) throw Error(formatProdErrorMessage(300));
		null === current || didReceiveUpdate || (current = current.dependencies, null !== current && checkIfContextChanged(current) && (didReceiveUpdate = !0));
	}
	function renderWithHooksAgain(workInProgress, Component, props, secondArg) {
		currentlyRenderingFiber = workInProgress;
		var numberOfReRenders = 0;
		do {
			didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
			thenableIndexCounter = 0;
			didScheduleRenderPhaseUpdateDuringThisPass = !1;
			if (25 <= numberOfReRenders) throw Error(formatProdErrorMessage(301));
			numberOfReRenders += 1;
			workInProgressHook = currentHook = null;
			if (null != workInProgress.updateQueue) {
				var children = workInProgress.updateQueue;
				children.lastEffect = null;
				children.events = null;
				children.stores = null;
				null != children.memoCache && (children.memoCache.index = 0);
			}
			ReactSharedInternals.H = HooksDispatcherOnRerender;
			children = Component(props, secondArg);
		} while (didScheduleRenderPhaseUpdateDuringThisPass);
		return children;
	}
	function TransitionAwareHostComponent() {
		var dispatcher = ReactSharedInternals.H, maybeThenable = dispatcher.useState()[0];
		maybeThenable = "function" === typeof maybeThenable.then ? useThenable(maybeThenable) : maybeThenable;
		dispatcher = dispatcher.useState()[0];
		(null !== currentHook ? currentHook.memoizedState : null) !== dispatcher && (currentlyRenderingFiber.flags |= 1024);
		return maybeThenable;
	}
	function checkDidRenderIdHook() {
		var didRenderIdHook = 0 !== localIdCounter;
		localIdCounter = 0;
		return didRenderIdHook;
	}
	function bailoutHooks(current, workInProgress, lanes) {
		workInProgress.updateQueue = current.updateQueue;
		workInProgress.flags &= -2053;
		current.lanes &= ~lanes;
	}
	function resetHooksOnUnwind(workInProgress) {
		if (didScheduleRenderPhaseUpdate) {
			for (workInProgress = workInProgress.memoizedState; null !== workInProgress;) {
				var queue = workInProgress.queue;
				null !== queue && (queue.pending = null);
				workInProgress = workInProgress.next;
			}
			didScheduleRenderPhaseUpdate = !1;
		}
		renderLanes = 0;
		workInProgressHook = currentHook = currentlyRenderingFiber = null;
		didScheduleRenderPhaseUpdateDuringThisPass = !1;
		thenableIndexCounter = localIdCounter = 0;
		thenableState = null;
	}
	function mountWorkInProgressHook() {
		var hook = {
			memoizedState: null,
			baseState: null,
			baseQueue: null,
			queue: null,
			next: null
		};
		null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = hook : workInProgressHook = workInProgressHook.next = hook;
		return workInProgressHook;
	}
	function updateWorkInProgressHook() {
		if (null === currentHook) {
			var nextCurrentHook = currentlyRenderingFiber.alternate;
			nextCurrentHook = null !== nextCurrentHook ? nextCurrentHook.memoizedState : null;
		} else nextCurrentHook = currentHook.next;
		var nextWorkInProgressHook = null === workInProgressHook ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
		if (null !== nextWorkInProgressHook) workInProgressHook = nextWorkInProgressHook, currentHook = nextCurrentHook;
		else {
			if (null === nextCurrentHook) {
				if (null === currentlyRenderingFiber.alternate) throw Error(formatProdErrorMessage(467));
				throw Error(formatProdErrorMessage(310));
			}
			currentHook = nextCurrentHook;
			nextCurrentHook = {
				memoizedState: currentHook.memoizedState,
				baseState: currentHook.baseState,
				baseQueue: currentHook.baseQueue,
				queue: currentHook.queue,
				next: null
			};
			null === workInProgressHook ? currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook : workInProgressHook = workInProgressHook.next = nextCurrentHook;
		}
		return workInProgressHook;
	}
	function createFunctionComponentUpdateQueue() {
		return {
			lastEffect: null,
			events: null,
			stores: null,
			memoCache: null
		};
	}
	function useThenable(thenable) {
		var index = thenableIndexCounter;
		thenableIndexCounter += 1;
		null === thenableState && (thenableState = []);
		thenable = trackUsedThenable(thenableState, thenable, index);
		index = currentlyRenderingFiber;
		null === (null === workInProgressHook ? index.memoizedState : workInProgressHook.next) && (index = index.alternate, ReactSharedInternals.H = null === index || null === index.memoizedState ? HooksDispatcherOnMount : HooksDispatcherOnUpdate);
		return thenable;
	}
	function use(usable) {
		if (null !== usable && "object" === typeof usable) {
			if ("function" === typeof usable.then) return useThenable(usable);
			if (usable.$$typeof === REACT_RECOVERABLE_TYPE) return;
			if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable);
		}
		throw Error(formatProdErrorMessage(438, String(usable)));
	}
	function useMemoCache(size) {
		var memoCache = null, updateQueue = currentlyRenderingFiber.updateQueue;
		null !== updateQueue && (memoCache = updateQueue.memoCache);
		if (null == memoCache) {
			var current = currentlyRenderingFiber.alternate;
			null !== current && (current = current.updateQueue, null !== current && (current = current.memoCache, null != current && (memoCache = {
				data: current.data.map(function(array) {
					return array.slice();
				}),
				index: 0
			})));
		}
		memoCache ??= {
			data: [],
			index: 0
		};
		null === updateQueue && (updateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = updateQueue);
		updateQueue.memoCache = memoCache;
		updateQueue = memoCache.data[memoCache.index];
		if (void 0 === updateQueue) for (updateQueue = memoCache.data[memoCache.index] = Array(size), current = 0; current < size; current++) updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
		memoCache.index++;
		return updateQueue;
	}
	function basicStateReducer(state, action) {
		return "function" === typeof action ? action(state) : action;
	}
	function updateReducer(reducer) {
		return updateReducerImpl(updateWorkInProgressHook(), currentHook, reducer);
	}
	function updateReducerImpl(hook, current, reducer) {
		var queue = hook.queue;
		if (null === queue) throw Error(formatProdErrorMessage(311));
		queue.lastRenderedReducer = reducer;
		var baseQueue = hook.baseQueue, pendingQueue = queue.pending;
		if (null !== pendingQueue) {
			if (null !== baseQueue) {
				var baseFirst = baseQueue.next;
				baseQueue.next = pendingQueue.next;
				pendingQueue.next = baseFirst;
			}
			current.baseQueue = baseQueue = pendingQueue;
			queue.pending = null;
		}
		pendingQueue = hook.baseState;
		if (null === baseQueue) hook.memoizedState = pendingQueue;
		else {
			current = baseQueue.next;
			var newBaseQueueFirst = baseFirst = null, newBaseQueueLast = null, update = current, didReadFromEntangledAsyncAction$64 = !1;
			do {
				var updateLane = update.lane & -536870913;
				if (updateLane !== update.lane ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
					var revertLane = update.revertLane;
					if (0 === revertLane) null !== newBaseQueueLast && (newBaseQueueLast = newBaseQueueLast.next = {
						lane: 0,
						revertLane: 0,
						gesture: null,
						action: update.action,
						hasEagerState: update.hasEagerState,
						eagerState: update.eagerState,
						next: null
					}), updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction$64 = !0);
					else if ((renderLanes & revertLane) === revertLane) {
						update = update.next;
						revertLane === currentEntangledLane && (didReadFromEntangledAsyncAction$64 = !0);
						continue;
					} else updateLane = {
						lane: 0,
						revertLane: update.revertLane,
						gesture: null,
						action: update.action,
						hasEagerState: update.hasEagerState,
						eagerState: update.eagerState,
						next: null
					}, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = updateLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = updateLane, currentlyRenderingFiber.lanes |= revertLane, workInProgressRootSkippedLanes |= revertLane;
					updateLane = update.action;
					shouldDoubleInvokeUserFnsInHooksDEV && reducer(pendingQueue, updateLane);
					pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
				} else revertLane = {
					lane: updateLane,
					revertLane: update.revertLane,
					gesture: update.gesture,
					action: update.action,
					hasEagerState: update.hasEagerState,
					eagerState: update.eagerState,
					next: null
				}, null === newBaseQueueLast ? (newBaseQueueFirst = newBaseQueueLast = revertLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = revertLane, currentlyRenderingFiber.lanes |= updateLane, workInProgressRootSkippedLanes |= updateLane;
				update = update.next;
			} while (null !== update && update !== current);
			null === newBaseQueueLast ? baseFirst = pendingQueue : newBaseQueueLast.next = newBaseQueueFirst;
			if (!objectIs(pendingQueue, hook.memoizedState) && (didReceiveUpdate = !0, didReadFromEntangledAsyncAction$64 && (reducer = currentEntangledActionThenable, null !== reducer))) throw reducer;
			hook.memoizedState = pendingQueue;
			hook.baseState = baseFirst;
			hook.baseQueue = newBaseQueueLast;
			queue.lastRenderedState = pendingQueue;
		}
		null === baseQueue && (queue.lanes = 0);
		return [hook.memoizedState, queue.dispatch];
	}
	function rerenderReducer(reducer) {
		var hook = updateWorkInProgressHook(), queue = hook.queue;
		if (null === queue) throw Error(formatProdErrorMessage(311));
		queue.lastRenderedReducer = reducer;
		var dispatch = queue.dispatch, lastRenderPhaseUpdate = queue.pending, newState = hook.memoizedState;
		if (null !== lastRenderPhaseUpdate) {
			queue.pending = null;
			var update = lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
			do
				newState = reducer(newState, update.action), update = update.next;
			while (update !== lastRenderPhaseUpdate);
			objectIs(newState, hook.memoizedState) || (didReceiveUpdate = !0);
			hook.memoizedState = newState;
			null === hook.baseQueue && (hook.baseState = newState);
			queue.lastRenderedState = newState;
		}
		return [newState, dispatch];
	}
	function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
		var fiber = currentlyRenderingFiber, hook = updateWorkInProgressHook(), isHydrating$jscomp$0 = isHydrating;
		if (isHydrating$jscomp$0) {
			if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
			getServerSnapshot = getServerSnapshot();
		} else getServerSnapshot = getSnapshot();
		var snapshotChanged = !objectIs((currentHook || hook).memoizedState, getServerSnapshot);
		snapshotChanged && (hook.memoizedState = getServerSnapshot, didReceiveUpdate = !0);
		hook = hook.queue;
		updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [subscribe]);
		subscribe = hook.getSnapshot !== getSnapshot || snapshotChanged || null !== workInProgressHook && 0 !== (workInProgressHook.memoizedState.tag & 1);
		pushSimpleEffect(subscribe ? 9 : 8, { destroy: void 0 }, updateStoreInstance.bind(null, fiber, hook, getServerSnapshot, getSnapshot), null);
		if (subscribe) {
			fiber.flags |= 2048;
			if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
			isHydrating$jscomp$0 || 0 !== (renderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
		}
		return getServerSnapshot;
	}
	function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
		fiber.flags |= 16384;
		fiber = {
			getSnapshot,
			value: renderedSnapshot
		};
		getSnapshot = currentlyRenderingFiber.updateQueue;
		null === getSnapshot ? (getSnapshot = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = getSnapshot, getSnapshot.stores = [fiber]) : (renderedSnapshot = getSnapshot.stores, null === renderedSnapshot ? getSnapshot.stores = [fiber] : renderedSnapshot.push(fiber));
	}
	function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
		inst.value = nextSnapshot;
		inst.getSnapshot = getSnapshot;
		checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
	}
	function subscribeToStore(fiber, inst, subscribe) {
		return subscribe(function() {
			checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
		});
	}
	function checkIfSnapshotChanged(inst) {
		var latestGetSnapshot = inst.getSnapshot;
		inst = inst.value;
		try {
			var nextValue = latestGetSnapshot();
			return !objectIs(inst, nextValue);
		} catch (error) {
			return !0;
		}
	}
	function forceStoreRerender(fiber) {
		var root = enqueueConcurrentRenderForLane(fiber, 2);
		null !== root && scheduleUpdateOnFiber(root, fiber, 2);
	}
	function mountStateImpl(initialState) {
		var hook = mountWorkInProgressHook();
		if ("function" === typeof initialState) {
			var initialStateInitializer = initialState;
			initialState = initialStateInitializer();
			if (shouldDoubleInvokeUserFnsInHooksDEV) {
				setIsStrictModeForDevtools(!0);
				try {
					initialStateInitializer();
				} finally {
					setIsStrictModeForDevtools(!1);
				}
			}
		}
		hook.memoizedState = hook.baseState = initialState;
		hook.queue = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: basicStateReducer,
			lastRenderedState: initialState
		};
		return hook;
	}
	function updateOptimisticImpl(hook, current, passthrough, reducer) {
		hook.baseState = passthrough;
		return updateReducerImpl(hook, currentHook, "function" === typeof reducer ? reducer : basicStateReducer);
	}
	function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
		if (isRenderPhaseUpdate(fiber)) throw Error(formatProdErrorMessage(485));
		fiber = actionQueue.action;
		if (null !== fiber) {
			var actionNode = {
				payload,
				action: fiber,
				next: null,
				isTransition: !0,
				status: "pending",
				value: null,
				reason: null,
				listeners: [],
				then: function(listener) {
					actionNode.listeners.push(listener);
				}
			};
			null !== ReactSharedInternals.T ? setPendingState(!0) : actionNode.isTransition = !1;
			setState(actionNode);
			setPendingState = actionQueue.pending;
			null === setPendingState ? (actionNode.next = actionQueue.pending = actionNode, runActionStateAction(actionQueue, actionNode)) : (actionNode.next = setPendingState.next, actionQueue.pending = setPendingState.next = actionNode);
		}
	}
	function runActionStateAction(actionQueue, node) {
		var action = node.action, payload = node.payload, prevState = actionQueue.state;
		if (node.isTransition) {
			var prevTransition = ReactSharedInternals.T, currentTransition = {};
			currentTransition.types = null !== prevTransition ? prevTransition.types : null;
			ReactSharedInternals.T = currentTransition;
			try {
				var returnValue = action(prevState, payload), onStartTransitionFinish = ReactSharedInternals.S;
				null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
				handleActionReturnValue(actionQueue, node, returnValue);
			} catch (error) {
				onActionError(actionQueue, node, error);
			} finally {
				null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
			}
		} else try {
			prevTransition = action(prevState, payload), handleActionReturnValue(actionQueue, node, prevTransition);
		} catch (error$70) {
			onActionError(actionQueue, node, error$70);
		}
	}
	function handleActionReturnValue(actionQueue, node, returnValue) {
		null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then ? returnValue.then(function(nextState) {
			onActionSuccess(actionQueue, node, nextState);
		}, function(error) {
			return onActionError(actionQueue, node, error);
		}) : onActionSuccess(actionQueue, node, returnValue);
	}
	function onActionSuccess(actionQueue, actionNode, nextState) {
		actionNode.status = "fulfilled";
		actionNode.value = nextState;
		notifyActionListeners(actionNode);
		actionQueue.state = nextState;
		actionNode = actionQueue.pending;
		null !== actionNode && (nextState = actionNode.next, nextState === actionNode ? actionQueue.pending = null : (nextState = nextState.next, actionNode.next = nextState, runActionStateAction(actionQueue, nextState)));
	}
	function onActionError(actionQueue, actionNode, error) {
		var last = actionQueue.pending;
		actionQueue.pending = null;
		if (null !== last) {
			last = last.next;
			do
				actionNode.status = "rejected", actionNode.reason = error, notifyActionListeners(actionNode), actionNode = actionNode.next;
			while (actionNode !== last);
		}
		actionQueue.action = null;
	}
	function notifyActionListeners(actionNode) {
		actionNode = actionNode.listeners;
		for (var i = 0; i < actionNode.length; i++) (0, actionNode[i])();
	}
	function actionStateReducer(oldState, newState) {
		return newState;
	}
	function mountActionState(action, initialStateProp) {
		if (isHydrating) {
			var ssrFormState = workInProgressRoot.formState;
			if (null !== ssrFormState) {
				a: {
					var JSCompiler_inline_result = currentlyRenderingFiber;
					if (isHydrating) {
						if (nextHydratableInstance) {
							b: {
								var JSCompiler_inline_result$jscomp$0 = nextHydratableInstance;
								for (var inRootOrSingleton = rootOrSingletonContext; 8 !== JSCompiler_inline_result$jscomp$0.nodeType;) {
									if (!inRootOrSingleton) {
										JSCompiler_inline_result$jscomp$0 = null;
										break b;
									}
									JSCompiler_inline_result$jscomp$0 = getNextHydratable(JSCompiler_inline_result$jscomp$0.nextSibling);
									if (null === JSCompiler_inline_result$jscomp$0) {
										JSCompiler_inline_result$jscomp$0 = null;
										break b;
									}
								}
								inRootOrSingleton = JSCompiler_inline_result$jscomp$0.data;
								JSCompiler_inline_result$jscomp$0 = "F!" === inRootOrSingleton || "F" === inRootOrSingleton ? JSCompiler_inline_result$jscomp$0 : null;
							}
							if (JSCompiler_inline_result$jscomp$0) {
								nextHydratableInstance = getNextHydratable(JSCompiler_inline_result$jscomp$0.nextSibling);
								JSCompiler_inline_result = "F!" === JSCompiler_inline_result$jscomp$0.data;
								break a;
							}
						}
						throwOnHydrationMismatch(JSCompiler_inline_result);
					}
					JSCompiler_inline_result = !1;
				}
				JSCompiler_inline_result && (initialStateProp = ssrFormState[0]);
			}
		}
		ssrFormState = mountWorkInProgressHook();
		ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
		JSCompiler_inline_result = {
			pending: null,
			lanes: 0,
			dispatch: null,
			lastRenderedReducer: actionStateReducer,
			lastRenderedState: initialStateProp
		};
		ssrFormState.queue = JSCompiler_inline_result;
		ssrFormState = dispatchSetState.bind(null, currentlyRenderingFiber, JSCompiler_inline_result);
		JSCompiler_inline_result.dispatch = ssrFormState;
		JSCompiler_inline_result = mountStateImpl(!1);
		inRootOrSingleton = dispatchOptimisticSetState.bind(null, currentlyRenderingFiber, !1, JSCompiler_inline_result.queue);
		JSCompiler_inline_result = mountWorkInProgressHook();
		JSCompiler_inline_result$jscomp$0 = {
			state: initialStateProp,
			dispatch: null,
			action,
			pending: null
		};
		JSCompiler_inline_result.queue = JSCompiler_inline_result$jscomp$0;
		ssrFormState = dispatchActionState.bind(null, currentlyRenderingFiber, JSCompiler_inline_result$jscomp$0, inRootOrSingleton, ssrFormState);
		JSCompiler_inline_result$jscomp$0.dispatch = ssrFormState;
		JSCompiler_inline_result.memoizedState = action;
		return [
			initialStateProp,
			ssrFormState,
			!1
		];
	}
	function updateActionState(action) {
		return updateActionStateImpl(updateWorkInProgressHook(), currentHook, action);
	}
	function updateActionStateImpl(stateHook, currentStateHook, action) {
		currentStateHook = updateReducerImpl(stateHook, currentStateHook, actionStateReducer)[0];
		stateHook = updateReducer(basicStateReducer)[0];
		if ("object" === typeof currentStateHook && null !== currentStateHook && "function" === typeof currentStateHook.then) try {
			var state = useThenable(currentStateHook);
		} catch (x) {
			if (x === SuspenseException) throw SuspenseActionException;
			throw x;
		}
		else state = currentStateHook;
		currentStateHook = updateWorkInProgressHook();
		var actionQueue = currentStateHook.queue, dispatch = actionQueue.dispatch;
		action !== currentStateHook.memoizedState && (currentlyRenderingFiber.flags |= 2048, pushSimpleEffect(9, { destroy: void 0 }, actionStateActionEffect.bind(null, actionQueue, action), null));
		return [
			state,
			dispatch,
			stateHook
		];
	}
	function actionStateActionEffect(actionQueue, action) {
		actionQueue.action = action;
	}
	function rerenderActionState(action) {
		var stateHook = updateWorkInProgressHook(), currentStateHook = currentHook;
		if (null !== currentStateHook) return updateActionStateImpl(stateHook, currentStateHook, action);
		updateWorkInProgressHook();
		stateHook = stateHook.memoizedState;
		currentStateHook = updateWorkInProgressHook();
		var dispatch = currentStateHook.queue.dispatch;
		currentStateHook.memoizedState = action;
		return [
			stateHook,
			dispatch,
			!1
		];
	}
	function pushSimpleEffect(tag, inst, create, deps) {
		tag = {
			tag,
			create,
			deps,
			inst,
			next: null
		};
		inst = currentlyRenderingFiber.updateQueue;
		null === inst && (inst = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = inst);
		create = inst.lastEffect;
		null === create ? inst.lastEffect = tag.next = tag : (deps = create.next, create.next = tag, tag.next = deps, inst.lastEffect = tag);
		return tag;
	}
	function updateRef() {
		return updateWorkInProgressHook().memoizedState;
	}
	function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
		var hook = mountWorkInProgressHook();
		currentlyRenderingFiber.flags |= fiberFlags;
		hook.memoizedState = pushSimpleEffect(1 | hookFlags, { destroy: void 0 }, create, void 0 === deps ? null : deps);
	}
	function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
		var hook = updateWorkInProgressHook();
		deps = void 0 === deps ? null : deps;
		var inst = hook.memoizedState.inst;
		null !== currentHook && null !== deps && areHookInputsEqual(deps, currentHook.memoizedState.deps) ? hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps) : (currentlyRenderingFiber.flags |= fiberFlags, hook.memoizedState = pushSimpleEffect(1 | hookFlags, inst, create, deps));
	}
	function mountEffect(create, deps) {
		mountEffectImpl(8390656, 8, create, deps);
	}
	function updateEffect(create, deps) {
		updateEffectImpl(2048, 8, create, deps);
	}
	function useEffectEventImpl(payload) {
		currentlyRenderingFiber.flags |= 4;
		var componentUpdateQueue = currentlyRenderingFiber.updateQueue;
		if (null === componentUpdateQueue) componentUpdateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = componentUpdateQueue, componentUpdateQueue.events = [payload];
		else {
			var events = componentUpdateQueue.events;
			null === events ? componentUpdateQueue.events = [payload] : events.push(payload);
		}
	}
	function updateEvent(callback) {
		var ref = updateWorkInProgressHook().memoizedState;
		useEffectEventImpl({
			ref,
			nextImpl: callback
		});
		return function() {
			if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
			return ref.impl.apply(void 0, arguments);
		};
	}
	function updateInsertionEffect(create, deps) {
		return updateEffectImpl(4, 2, create, deps);
	}
	function updateLayoutEffect(create, deps) {
		return updateEffectImpl(4, 4, create, deps);
	}
	function imperativeHandleEffect(create, ref) {
		if ("function" === typeof ref) {
			create = create();
			var refCleanup = ref(create);
			return function() {
				"function" === typeof refCleanup ? refCleanup() : ref(null);
			};
		}
		if (null !== ref && void 0 !== ref) return create = create(), ref.current = create, function() {
			ref.current = null;
		};
	}
	function updateImperativeHandle(ref, create, deps) {
		deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
		updateEffectImpl(4, 4, imperativeHandleEffect.bind(null, create, ref), deps);
	}
	function mountDebugValue() {}
	function updateCallback(callback, deps) {
		var hook = updateWorkInProgressHook();
		deps = void 0 === deps ? null : deps;
		var prevState = hook.memoizedState;
		if (null !== deps && areHookInputsEqual(deps, prevState[1])) return prevState[0];
		hook.memoizedState = [callback, deps];
		return callback;
	}
	function updateMemo(nextCreate, deps) {
		var hook = updateWorkInProgressHook();
		deps = void 0 === deps ? null : deps;
		var prevState = hook.memoizedState;
		if (null !== deps && areHookInputsEqual(deps, prevState[1])) return prevState[0];
		prevState = nextCreate();
		if (shouldDoubleInvokeUserFnsInHooksDEV) {
			setIsStrictModeForDevtools(!0);
			try {
				nextCreate();
			} finally {
				setIsStrictModeForDevtools(!1);
			}
		}
		hook.memoizedState = [prevState, deps];
		return prevState;
	}
	function mountDeferredValueImpl(hook, value, initialValue) {
		if (void 0 === initialValue || 0 !== (renderLanes & 0x40000000) && 0 === (workInProgressRootRenderLanes & 261930)) return hook.memoizedState = value;
		hook.memoizedState = initialValue;
		hook = requestDeferredLane();
		currentlyRenderingFiber.lanes |= hook;
		workInProgressRootSkippedLanes |= hook;
		return initialValue;
	}
	function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
		if (objectIs(value, prevValue)) return value;
		if (null !== currentTreeHiddenStackCursor.current) return hook = mountDeferredValueImpl(hook, value, initialValue), objectIs(hook, prevValue) || (didReceiveUpdate = !0), hook;
		if (0 === (renderLanes & 106) || 0 !== (renderLanes & 0x40000000) && 0 === (workInProgressRootRenderLanes & 261930)) return didReceiveUpdate = !0, hook.memoizedState = value;
		hook = requestDeferredLane();
		currentlyRenderingFiber.lanes |= hook;
		workInProgressRootSkippedLanes |= hook;
		return prevValue;
	}
	function startTransition(fiber, queue, pendingState, finishedState, callback) {
		var previousPriority = ReactDOMSharedInternals.p;
		ReactDOMSharedInternals.p = 0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		dispatchOptimisticSetState(fiber, !1, queue, pendingState);
		try {
			var returnValue = callback(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			if (null !== returnValue && "object" === typeof returnValue && "function" === typeof returnValue.then) dispatchSetStateInternal(fiber, queue, chainThenableValue(returnValue, finishedState), requestUpdateLane(fiber));
			else dispatchSetStateInternal(fiber, queue, finishedState, requestUpdateLane(fiber));
		} catch (error) {
			dispatchSetStateInternal(fiber, queue, {
				then: function() {},
				status: "rejected",
				reason: error
			}, requestUpdateLane());
		} finally {
			ReactDOMSharedInternals.p = previousPriority, null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function noop() {}
	function startHostTransition(formFiber, pendingState, action, formData) {
		if (5 !== formFiber.tag) throw Error(formatProdErrorMessage(476));
		startTransition(formFiber, ensureFormComponentIsStateful(formFiber).queue, pendingState, sharedNotPendingObject, null === action ? noop : function() {
			requestFormReset$1(formFiber);
			return action(formData);
		});
	}
	function ensureFormComponentIsStateful(formFiber) {
		var existingStateHook = formFiber.memoizedState;
		if (null !== existingStateHook) return existingStateHook;
		existingStateHook = {
			memoizedState: sharedNotPendingObject,
			baseState: sharedNotPendingObject,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: basicStateReducer,
				lastRenderedState: sharedNotPendingObject
			},
			next: null
		};
		var initialResetState = {};
		existingStateHook.next = {
			memoizedState: initialResetState,
			baseState: initialResetState,
			baseQueue: null,
			queue: {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: basicStateReducer,
				lastRenderedState: initialResetState
			},
			next: null
		};
		formFiber.memoizedState = existingStateHook;
		formFiber = formFiber.alternate;
		null !== formFiber && (formFiber.memoizedState = existingStateHook);
		return existingStateHook;
	}
	function requestFormReset$1(formFiber) {
		var stateHook = ensureFormComponentIsStateful(formFiber);
		null === stateHook.next && (stateHook = formFiber.alternate.memoizedState);
		dispatchSetStateInternal(formFiber, stateHook.next.queue, {}, requestUpdateLane());
	}
	function useHostTransitionStatus() {
		return readContext(HostTransitionContext);
	}
	function updateId() {
		return updateWorkInProgressHook().memoizedState;
	}
	function updateRefresh() {
		return updateWorkInProgressHook().memoizedState;
	}
	function refreshCache(fiber) {
		for (var provider = fiber.return; null !== provider;) {
			switch (provider.tag) {
				case 24:
				case 3:
					var lane = requestUpdateLane();
					fiber = createUpdate(lane);
					var root$73 = enqueueUpdate(provider, fiber, lane);
					null !== root$73 && (scheduleUpdateOnFiber(root$73, provider, lane), entangleTransitions(root$73, provider, lane));
					provider = { cache: createCache() };
					fiber.payload = provider;
					return;
			}
			provider = provider.return;
		}
	}
	function dispatchReducerAction(fiber, queue, action) {
		var lane = requestUpdateLane();
		action = {
			lane,
			revertLane: 0,
			gesture: null,
			action,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		isRenderPhaseUpdate(fiber) ? enqueueRenderPhaseUpdate(queue, action) : (action = enqueueConcurrentHookUpdate(fiber, queue, action, lane), null !== action && (scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane)));
	}
	function dispatchSetState(fiber, queue, action) {
		dispatchSetStateInternal(fiber, queue, action, requestUpdateLane());
	}
	function dispatchSetStateInternal(fiber, queue, action, lane) {
		var update = {
			lane,
			revertLane: 0,
			gesture: null,
			action,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
		else {
			var alternate = fiber.alternate;
			if (0 === fiber.lanes && (null === alternate || 0 === alternate.lanes) && (alternate = queue.lastRenderedReducer, null !== alternate)) try {
				var currentState = queue.lastRenderedState, eagerState = alternate(currentState, action);
				update.hasEagerState = !0;
				update.eagerState = eagerState;
				if (objectIs(eagerState, currentState)) return enqueueUpdate$1(fiber, queue, update, 0), null === workInProgressRoot && finishQueueingConcurrentUpdates(), !1;
			} catch (error) {}
			action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
			if (null !== action) return scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane), !0;
		}
		return !1;
	}
	function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
		action = {
			lane: 2,
			revertLane: requestTransitionLane(),
			gesture: null,
			action,
			hasEagerState: !1,
			eagerState: null,
			next: null
		};
		if (isRenderPhaseUpdate(fiber)) {
			if (throwIfDuringRender) throw Error(formatProdErrorMessage(479));
		} else throwIfDuringRender = enqueueConcurrentHookUpdate(fiber, queue, action, 2), null !== throwIfDuringRender && scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
	}
	function isRenderPhaseUpdate(fiber) {
		var alternate = fiber.alternate;
		return fiber === currentlyRenderingFiber || null !== alternate && alternate === currentlyRenderingFiber;
	}
	function enqueueRenderPhaseUpdate(queue, update) {
		didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = !0;
		var pending = queue.pending;
		null === pending ? update.next = update : (update.next = pending.next, pending.next = update);
		queue.pending = update;
	}
	function entangleTransitionUpdate(root, queue, lane) {
		if (0 !== (lane & 4194048)) {
			var queueLanes = queue.lanes;
			queueLanes &= root.pendingLanes;
			lane |= queueLanes;
			queue.lanes = lane;
			markRootEntangled(root, lane);
		}
	}
	var ContextOnlyDispatcher = {
		readContext,
		use,
		useCallback: throwInvalidHookError,
		useContext: throwInvalidHookError,
		useEffect: throwInvalidHookError,
		useImperativeHandle: throwInvalidHookError,
		useLayoutEffect: throwInvalidHookError,
		useInsertionEffect: throwInvalidHookError,
		useMemo: throwInvalidHookError,
		useReducer: throwInvalidHookError,
		useRef: throwInvalidHookError,
		useState: throwInvalidHookError,
		useDebugValue: throwInvalidHookError,
		useDeferredValue: throwInvalidHookError,
		useTransition: throwInvalidHookError,
		useSyncExternalStore: throwInvalidHookError,
		useId: throwInvalidHookError,
		useHostTransitionStatus: throwInvalidHookError,
		useFormState: throwInvalidHookError,
		useActionState: throwInvalidHookError,
		useOptimistic: throwInvalidHookError,
		useMemoCache: throwInvalidHookError,
		useCacheRefresh: throwInvalidHookError,
		useEffectEvent: throwInvalidHookError
	};
	var HooksDispatcherOnMount = {
		readContext,
		use,
		useCallback: function(callback, deps) {
			mountWorkInProgressHook().memoizedState = [callback, void 0 === deps ? null : deps];
			return callback;
		},
		useContext: readContext,
		useEffect: mountEffect,
		useImperativeHandle: function(ref, create, deps) {
			deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
			mountEffectImpl(4194308, 4, imperativeHandleEffect.bind(null, create, ref), deps);
		},
		useLayoutEffect: function(create, deps) {
			return mountEffectImpl(4194308, 4, create, deps);
		},
		useInsertionEffect: function(create, deps) {
			mountEffectImpl(4, 2, create, deps);
		},
		useMemo: function(nextCreate, deps) {
			var hook = mountWorkInProgressHook();
			deps = void 0 === deps ? null : deps;
			var nextValue = nextCreate();
			if (shouldDoubleInvokeUserFnsInHooksDEV) {
				setIsStrictModeForDevtools(!0);
				try {
					nextCreate();
				} finally {
					setIsStrictModeForDevtools(!1);
				}
			}
			hook.memoizedState = [nextValue, deps];
			return nextValue;
		},
		useReducer: function(reducer, initialArg, init) {
			var hook = mountWorkInProgressHook();
			if (void 0 !== init) {
				var initialState = init(initialArg);
				if (shouldDoubleInvokeUserFnsInHooksDEV) {
					setIsStrictModeForDevtools(!0);
					try {
						init(initialArg);
					} finally {
						setIsStrictModeForDevtools(!1);
					}
				}
			} else initialState = initialArg;
			hook.memoizedState = hook.baseState = initialState;
			reducer = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: reducer,
				lastRenderedState: initialState
			};
			hook.queue = reducer;
			reducer = reducer.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, reducer);
			return [hook.memoizedState, reducer];
		},
		useRef: function(initialValue) {
			var hook = mountWorkInProgressHook();
			initialValue = { current: initialValue };
			return hook.memoizedState = initialValue;
		},
		useState: function(initialState) {
			initialState = mountStateImpl(initialState);
			var queue = initialState.queue, dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
			queue.dispatch = dispatch;
			return [initialState.memoizedState, dispatch];
		},
		useDebugValue: mountDebugValue,
		useDeferredValue: function(value, initialValue) {
			return mountDeferredValueImpl(mountWorkInProgressHook(), value, initialValue);
		},
		useTransition: function() {
			var stateHook = mountStateImpl(!1);
			stateHook = startTransition.bind(null, currentlyRenderingFiber, stateHook.queue, !0, !1);
			mountWorkInProgressHook().memoizedState = stateHook;
			return [!1, stateHook];
		},
		useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
			var fiber = currentlyRenderingFiber, hook = mountWorkInProgressHook();
			if (isHydrating) {
				if (void 0 === getServerSnapshot) throw Error(formatProdErrorMessage(407));
				getServerSnapshot = getServerSnapshot();
			} else {
				getServerSnapshot = getSnapshot();
				if (null === workInProgressRoot) throw Error(formatProdErrorMessage(349));
				0 !== (workInProgressRootRenderLanes & 127) || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
			}
			hook.memoizedState = getServerSnapshot;
			var inst = {
				value: getServerSnapshot,
				getSnapshot
			};
			hook.queue = inst;
			mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [subscribe]);
			fiber.flags |= 2048;
			pushSimpleEffect(9, { destroy: void 0 }, updateStoreInstance.bind(null, fiber, inst, getServerSnapshot, getSnapshot), null);
			return getServerSnapshot;
		},
		useId: function() {
			var hook = mountWorkInProgressHook(), identifierPrefix = workInProgressRoot.identifierPrefix;
			if (isHydrating) {
				var JSCompiler_inline_result = treeContextOverflow;
				var idWithLeadingBit = treeContextId;
				JSCompiler_inline_result = (idWithLeadingBit & ~(1 << 32 - clz32(idWithLeadingBit) - 1)).toString(32) + JSCompiler_inline_result;
				identifierPrefix = "_" + identifierPrefix + "R_" + JSCompiler_inline_result;
				JSCompiler_inline_result = localIdCounter++;
				0 < JSCompiler_inline_result && (identifierPrefix += "H" + JSCompiler_inline_result.toString(32));
				identifierPrefix += "_";
			} else JSCompiler_inline_result = globalClientIdCounter++, identifierPrefix = "_" + identifierPrefix + "r_" + JSCompiler_inline_result.toString(32) + "_";
			return hook.memoizedState = identifierPrefix;
		},
		useHostTransitionStatus,
		useFormState: mountActionState,
		useActionState: mountActionState,
		useOptimistic: function(passthrough) {
			var hook = mountWorkInProgressHook();
			hook.memoizedState = hook.baseState = passthrough;
			var queue = {
				pending: null,
				lanes: 0,
				dispatch: null,
				lastRenderedReducer: null,
				lastRenderedState: null
			};
			hook.queue = queue;
			hook = dispatchOptimisticSetState.bind(null, currentlyRenderingFiber, !0, queue);
			queue.dispatch = hook;
			return [passthrough, hook];
		},
		useMemoCache,
		useCacheRefresh: function() {
			return mountWorkInProgressHook().memoizedState = refreshCache.bind(null, currentlyRenderingFiber);
		},
		useEffectEvent: function(callback) {
			var hook = mountWorkInProgressHook(), ref = { impl: callback };
			hook.memoizedState = ref;
			return function() {
				if (0 !== (executionContext & 2)) throw Error(formatProdErrorMessage(440));
				return ref.impl.apply(void 0, arguments);
			};
		}
	};
	var HooksDispatcherOnUpdate = {
		readContext,
		use,
		useCallback: updateCallback,
		useContext: readContext,
		useEffect: updateEffect,
		useImperativeHandle: updateImperativeHandle,
		useInsertionEffect: updateInsertionEffect,
		useLayoutEffect: updateLayoutEffect,
		useMemo: updateMemo,
		useReducer: updateReducer,
		useRef: updateRef,
		useState: function() {
			return updateReducer(basicStateReducer);
		},
		useDebugValue: mountDebugValue,
		useDeferredValue: function(value, initialValue) {
			return updateDeferredValueImpl(updateWorkInProgressHook(), currentHook.memoizedState, value, initialValue);
		},
		useTransition: function() {
			var booleanOrThenable = updateReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
			return ["boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable), start];
		},
		useSyncExternalStore: updateSyncExternalStore,
		useId: updateId,
		useHostTransitionStatus,
		useFormState: updateActionState,
		useActionState: updateActionState,
		useOptimistic: function(passthrough, reducer) {
			return updateOptimisticImpl(updateWorkInProgressHook(), currentHook, passthrough, reducer);
		},
		useMemoCache,
		useCacheRefresh: updateRefresh,
		useEffectEvent: updateEvent
	};
	var HooksDispatcherOnRerender = {
		readContext,
		use,
		useCallback: updateCallback,
		useContext: readContext,
		useEffect: updateEffect,
		useImperativeHandle: updateImperativeHandle,
		useInsertionEffect: updateInsertionEffect,
		useLayoutEffect: updateLayoutEffect,
		useMemo: updateMemo,
		useReducer: rerenderReducer,
		useRef: updateRef,
		useState: function() {
			return rerenderReducer(basicStateReducer);
		},
		useDebugValue: mountDebugValue,
		useDeferredValue: function(value, initialValue) {
			var hook = updateWorkInProgressHook();
			return null === currentHook ? mountDeferredValueImpl(hook, value, initialValue) : updateDeferredValueImpl(hook, currentHook.memoizedState, value, initialValue);
		},
		useTransition: function() {
			var booleanOrThenable = rerenderReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
			return ["boolean" === typeof booleanOrThenable ? booleanOrThenable : useThenable(booleanOrThenable), start];
		},
		useSyncExternalStore: updateSyncExternalStore,
		useId: updateId,
		useHostTransitionStatus,
		useFormState: rerenderActionState,
		useActionState: rerenderActionState,
		useOptimistic: function(passthrough, reducer) {
			var hook = updateWorkInProgressHook();
			if (null !== currentHook) return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
			hook.baseState = passthrough;
			return [passthrough, hook.queue.dispatch];
		},
		useMemoCache,
		useCacheRefresh: updateRefresh,
		useEffectEvent: updateEvent
	};
	function applyDerivedStateFromProps(workInProgress, ctor, getDerivedStateFromProps, nextProps) {
		ctor = workInProgress.memoizedState;
		getDerivedStateFromProps = getDerivedStateFromProps(nextProps, ctor);
		getDerivedStateFromProps = null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps ? ctor : assign({}, ctor, getDerivedStateFromProps);
		workInProgress.memoizedState = getDerivedStateFromProps;
		0 === workInProgress.lanes && (workInProgress.updateQueue.baseState = getDerivedStateFromProps);
	}
	var classComponentUpdater = {
		enqueueSetState: function(inst, payload, callback) {
			inst = inst._reactInternals;
			var lane = requestUpdateLane(), update = createUpdate(lane);
			update.payload = payload;
			void 0 !== callback && null !== callback && (update.callback = callback);
			payload = enqueueUpdate(inst, update, lane);
			null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
		},
		enqueueReplaceState: function(inst, payload, callback) {
			inst = inst._reactInternals;
			var lane = requestUpdateLane(), update = createUpdate(lane);
			update.tag = 1;
			update.payload = payload;
			void 0 !== callback && null !== callback && (update.callback = callback);
			payload = enqueueUpdate(inst, update, lane);
			null !== payload && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
		},
		enqueueForceUpdate: function(inst, callback) {
			inst = inst._reactInternals;
			var lane = requestUpdateLane(), update = createUpdate(lane);
			update.tag = 2;
			void 0 !== callback && null !== callback && (update.callback = callback);
			callback = enqueueUpdate(inst, update, lane);
			null !== callback && (scheduleUpdateOnFiber(callback, inst, lane), entangleTransitions(callback, inst, lane));
		}
	};
	function checkShouldComponentUpdate(workInProgress, ctor, oldProps, newProps, oldState, newState, nextContext) {
		workInProgress = workInProgress.stateNode;
		return "function" === typeof workInProgress.shouldComponentUpdate ? workInProgress.shouldComponentUpdate(newProps, newState, nextContext) : ctor.prototype && ctor.prototype.isPureReactComponent ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState) : !0;
	}
	function callComponentWillReceiveProps(workInProgress, instance, newProps, nextContext) {
		workInProgress = instance.state;
		"function" === typeof instance.componentWillReceiveProps && instance.componentWillReceiveProps(newProps, nextContext);
		"function" === typeof instance.UNSAFE_componentWillReceiveProps && instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
		instance.state !== workInProgress && classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
	}
	function resolveClassComponentProps(Component, baseProps) {
		var newProps = baseProps;
		if ("ref" in baseProps) {
			newProps = {};
			for (var propName in baseProps) "ref" !== propName && (newProps[propName] = baseProps[propName]);
		}
		if (Component = Component.defaultProps) {
			newProps === baseProps && (newProps = assign({}, newProps));
			for (var propName$77 in Component) void 0 === newProps[propName$77] && (newProps[propName$77] = Component[propName$77]);
		}
		return newProps;
	}
	function defaultOnUncaughtError(error) {
		reportGlobalError(error);
	}
	function defaultOnCaughtError(error) {
		console.error(error);
	}
	function defaultOnRecoverableError(error) {
		reportGlobalError(error);
	}
	function logUncaughtError(root, errorInfo) {
		try {
			(0, root.onUncaughtError)(errorInfo.value, { componentStack: errorInfo.stack });
		} catch (e$78) {
			setTimeout(function() {
				throw e$78;
			});
		}
	}
	function logCaughtError(root, boundary, errorInfo) {
		try {
			(0, root.onCaughtError)(errorInfo.value, {
				componentStack: errorInfo.stack,
				errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
			});
		} catch (e$79) {
			setTimeout(function() {
				throw e$79;
			});
		}
	}
	function createRootErrorUpdate(root, errorInfo, lane) {
		lane = createUpdate(lane);
		lane.tag = 3;
		lane.payload = { element: null };
		lane.callback = function() {
			logUncaughtError(root, errorInfo);
		};
		return lane;
	}
	function createClassErrorUpdate(lane) {
		lane = createUpdate(lane);
		lane.tag = 3;
		return lane;
	}
	function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
		var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
		if ("function" === typeof getDerivedStateFromError) {
			var error = errorInfo.value;
			update.payload = function() {
				return getDerivedStateFromError(error);
			};
			update.callback = function() {
				logCaughtError(root, fiber, errorInfo);
			};
		}
		var inst = fiber.stateNode;
		null !== inst && "function" === typeof inst.componentDidCatch && (update.callback = function() {
			logCaughtError(root, fiber, errorInfo);
			"function" !== typeof getDerivedStateFromError && (null === legacyErrorBoundariesThatAlreadyFailed ? legacyErrorBoundariesThatAlreadyFailed = /* @__PURE__ */ new Set([this]) : legacyErrorBoundariesThatAlreadyFailed.add(this));
			var stack = errorInfo.stack;
			this.componentDidCatch(errorInfo.value, { componentStack: null !== stack ? stack : "" });
		});
	}
	function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
		sourceFiber.flags |= 32768;
		if (null !== value && "object" === typeof value && "function" === typeof value.then) {
			returnFiber = sourceFiber.alternate;
			null !== returnFiber && propagateParentContextChanges(returnFiber, sourceFiber, rootRenderLanes, !0);
			sourceFiber = suspenseHandlerStackCursor.current;
			if (null !== sourceFiber) {
				switch (sourceFiber.tag) {
					case 31:
					case 13:
					case 19: return null === shellBoundary ? renderDidSuspendDelayIfPossible() : null === sourceFiber.alternate && 0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 3), sourceFiber.flags &= -257, sourceFiber.flags |= 65536, sourceFiber.lanes = rootRenderLanes, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? sourceFiber.updateQueue = /* @__PURE__ */ new Set([value]) : returnFiber.add(value), attachPingListener(root, value, rootRenderLanes)), !1;
					case 22: return sourceFiber.flags |= 65536, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, null === returnFiber ? (returnFiber = {
						transitions: null,
						markerInstances: null,
						retryQueue: /* @__PURE__ */ new Set([value])
					}, sourceFiber.updateQueue = returnFiber) : (sourceFiber = returnFiber.retryQueue, null === sourceFiber ? returnFiber.retryQueue = /* @__PURE__ */ new Set([value]) : sourceFiber.add(value)), attachPingListener(root, value, rootRenderLanes)), !1;
				}
				throw Error(formatProdErrorMessage(435, sourceFiber.tag));
			}
			attachPingListener(root, value, rootRenderLanes);
			renderDidSuspendDelayIfPossible();
			return !1;
		}
		if (isHydrating) return returnFiber = suspenseHandlerStackCursor.current, null !== returnFiber ? (0 === (returnFiber.flags & 65536) && (returnFiber.flags |= 256), returnFiber.flags |= 65536, returnFiber.lanes = rootRenderLanes, value !== HydrationMismatchException && (root = Error(formatProdErrorMessage(422), { cause: value }), queueHydrationError(createCapturedValueAtFiber(root, sourceFiber)))) : (value !== HydrationMismatchException && (returnFiber = Error(formatProdErrorMessage(423), { cause: value }), queueHydrationError(createCapturedValueAtFiber(returnFiber, sourceFiber))), root = root.current.alternate, root.flags |= 65536, rootRenderLanes &= -rootRenderLanes, root.lanes |= rootRenderLanes, value = createCapturedValueAtFiber(value, sourceFiber), rootRenderLanes = createRootErrorUpdate(root.stateNode, value, rootRenderLanes), enqueueCapturedUpdate(root, rootRenderLanes), 4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2)), !1;
		var wrapperError = Error(formatProdErrorMessage(520), { cause: value });
		wrapperError = createCapturedValueAtFiber(wrapperError, sourceFiber);
		null === workInProgressRootConcurrentErrors ? workInProgressRootConcurrentErrors = [wrapperError] : workInProgressRootConcurrentErrors.push(wrapperError);
		4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
		if (null === returnFiber) return !0;
		value = createCapturedValueAtFiber(value, sourceFiber);
		sourceFiber = returnFiber;
		do {
			switch (sourceFiber.tag) {
				case 3: return sourceFiber.flags |= 65536, root = rootRenderLanes & -rootRenderLanes, sourceFiber.lanes |= root, root = createRootErrorUpdate(sourceFiber.stateNode, value, root), enqueueCapturedUpdate(sourceFiber, root), !1;
				case 1:
					returnFiber = sourceFiber.type;
					wrapperError = sourceFiber.stateNode;
					if (0 === (sourceFiber.flags & 128) && ("function" === typeof returnFiber.getDerivedStateFromError || null !== wrapperError && "function" === typeof wrapperError.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(wrapperError)))) return sourceFiber.flags |= 65536, rootRenderLanes &= -rootRenderLanes, sourceFiber.lanes |= rootRenderLanes, rootRenderLanes = createClassErrorUpdate(rootRenderLanes), initializeClassErrorUpdate(rootRenderLanes, root, sourceFiber, value), enqueueCapturedUpdate(sourceFiber, rootRenderLanes), !1;
					break;
				case 22: if (null !== sourceFiber.memoizedState) return sourceFiber.flags |= 65536, !1;
			}
			sourceFiber = sourceFiber.return;
		} while (null !== sourceFiber);
		return !1;
	}
	var SelectiveHydrationException = Error(formatProdErrorMessage(461));
	var didReceiveUpdate = !1;
	function reconcileChildren(current, workInProgress, nextChildren, renderLanes) {
		workInProgress.child = null === current ? mountChildFibers(workInProgress, null, nextChildren, renderLanes) : reconcileChildFibers(workInProgress, current.child, nextChildren, renderLanes);
	}
	function updateForwardRef(current, workInProgress, Component, nextProps, renderLanes) {
		Component = Component.render;
		var ref = workInProgress.ref;
		if ("ref" in nextProps) {
			var propsWithoutRef = {};
			for (var key in nextProps) "ref" !== key && (propsWithoutRef[key] = nextProps[key]);
		} else propsWithoutRef = nextProps;
		prepareToReadContext(workInProgress);
		nextProps = renderWithHooks(current, workInProgress, Component, propsWithoutRef, ref, renderLanes);
		key = checkDidRenderIdHook();
		if (null !== current && !didReceiveUpdate) return bailoutHooks(current, workInProgress, renderLanes), bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		isHydrating && key && pushMaterializedTreeId(workInProgress);
		workInProgress.flags |= 1;
		reconcileChildren(current, workInProgress, nextProps, renderLanes);
		return workInProgress.child;
	}
	function updateMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
		if (null === current) {
			var type = Component.type;
			if ("function" === typeof type && !shouldConstruct(type) && void 0 === type.defaultProps && null === Component.compare) return workInProgress.tag = 15, workInProgress.type = type, updateSimpleMemoComponent(current, workInProgress, type, nextProps, renderLanes);
			current = createFiberFromTypeAndProps(Component.type, null, nextProps, workInProgress, workInProgress.mode, renderLanes);
			current.ref = workInProgress.ref;
			current.return = workInProgress;
			return workInProgress.child = current;
		}
		type = current.child;
		if (!checkScheduledUpdateOrContext(current, renderLanes)) {
			var prevProps = type.memoizedProps;
			Component = Component.compare;
			Component = null !== Component ? Component : shallowEqual;
			if (Component(prevProps, nextProps) && current.ref === workInProgress.ref) return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		}
		workInProgress.flags |= 1;
		current = createWorkInProgress(type, nextProps);
		current.ref = workInProgress.ref;
		current.return = workInProgress;
		return workInProgress.child = current;
	}
	function updateSimpleMemoComponent(current, workInProgress, Component, nextProps, renderLanes) {
		if (null !== current) {
			var prevProps = current.memoizedProps;
			if (shallowEqual(prevProps, nextProps) && current.ref === workInProgress.ref) if (didReceiveUpdate = !1, workInProgress.pendingProps = nextProps = prevProps, checkScheduledUpdateOrContext(current, renderLanes)) 0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
			else return workInProgress.lanes = current.lanes, bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		}
		return updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes);
	}
	function updateOffscreenComponent(current, workInProgress, renderLanes, nextProps) {
		var nextChildren = nextProps.children, prevState = null !== current ? current.memoizedState : null;
		null === current && null === workInProgress.stateNode && (workInProgress.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		});
		if ("hidden" === nextProps.mode) {
			if (0 !== (workInProgress.flags & 128)) {
				prevState = null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
				if (null !== current) {
					nextProps = workInProgress.child = current.child;
					for (nextChildren = 0; null !== nextProps;) nextChildren = nextChildren | nextProps.lanes | nextProps.childLanes, nextProps = nextProps.sibling;
					nextProps = nextChildren & ~prevState;
				} else nextProps = 0, workInProgress.child = null;
				return deferHiddenOffscreenComponent(current, workInProgress, prevState, renderLanes, nextProps);
			}
			if (0 !== (renderLanes & 536870912)) workInProgress.memoizedState = {
				baseLanes: 0,
				cachePool: null
			}, null !== current && pushTransition(workInProgress, null !== prevState ? prevState.cachePool : null), null !== prevState ? pushHiddenContext(workInProgress, prevState) : reuseHiddenContextOnStack(), pushOffscreenSuspenseHandler(workInProgress);
			else return nextProps = workInProgress.lanes = 536870912, deferHiddenOffscreenComponent(current, workInProgress, null !== prevState ? prevState.baseLanes | renderLanes : renderLanes, renderLanes, nextProps);
		} else null !== prevState ? (pushTransition(workInProgress, prevState.cachePool), pushHiddenContext(workInProgress, prevState), reuseSuspenseHandlerOnStack(), workInProgress.memoizedState = null) : (null !== current && pushTransition(workInProgress, null), reuseHiddenContextOnStack(), reuseSuspenseHandlerOnStack());
		reconcileChildren(current, workInProgress, nextChildren, renderLanes);
		return workInProgress.child;
	}
	function bailoutOffscreenComponent(current, workInProgress) {
		null !== current && 22 === current.tag || null !== workInProgress.stateNode || (workInProgress.stateNode = {
			_visibility: 1,
			_pendingMarkers: null,
			_retryCache: null,
			_transitions: null
		});
		return workInProgress.sibling;
	}
	function deferHiddenOffscreenComponent(current, workInProgress, nextBaseLanes, renderLanes, remainingChildLanes) {
		var JSCompiler_inline_result = peekCacheFromPool();
		JSCompiler_inline_result = null === JSCompiler_inline_result ? null : {
			parent: CacheContext._currentValue,
			pool: JSCompiler_inline_result
		};
		workInProgress.memoizedState = {
			baseLanes: nextBaseLanes,
			cachePool: JSCompiler_inline_result
		};
		null !== current && pushTransition(workInProgress, null);
		reuseHiddenContextOnStack();
		pushOffscreenSuspenseHandler(workInProgress);
		null !== current && propagateParentContextChanges(current, workInProgress, renderLanes, !0);
		workInProgress.childLanes = remainingChildLanes;
		return null;
	}
	function mountActivityChildren(workInProgress, nextProps) {
		nextProps = mountWorkInProgressOffscreenFiber({
			mode: nextProps.mode,
			children: nextProps.children
		}, workInProgress.mode);
		nextProps.ref = workInProgress.ref;
		workInProgress.child = nextProps;
		nextProps.return = workInProgress;
		return nextProps;
	}
	function retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes) {
		reconcileChildFibers(workInProgress, current.child, null, renderLanes);
		current = mountActivityChildren(workInProgress, workInProgress.pendingProps);
		current.flags |= 2;
		popSuspenseHandler(workInProgress);
		workInProgress.memoizedState = null;
		return current;
	}
	function updateActivityComponent(current, workInProgress, renderLanes) {
		var nextProps = workInProgress.pendingProps, didSuspend = 0 !== (workInProgress.flags & 128);
		workInProgress.flags &= -129;
		if (null === current) {
			if (isHydrating) {
				if ("hidden" === nextProps.mode) return current = mountActivityChildren(workInProgress, nextProps), workInProgress.lanes = 536870912, current.memoizedState = {
					baseLanes: 0,
					cachePool: null
				}, bailoutOffscreenComponent(null, current);
				pushDehydratedActivitySuspenseHandler(workInProgress);
				(current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(current, rootOrSingletonContext), current = null !== current && "&" === current.data ? current : null, null !== current && (workInProgress.memoizedState = {
					dehydrated: current,
					treeContext: null !== treeContextProvider ? {
						id: treeContextId,
						overflow: treeContextOverflow
					} : null,
					retryLane: 536870912,
					hydrationErrors: null
				}, renderLanes = createFiberFromDehydratedFragment(current), renderLanes.return = workInProgress, workInProgress.child = renderLanes, hydrationParentFiber = workInProgress, nextHydratableInstance = null)) : current = null;
				if (null === current) throw throwOnHydrationMismatch(workInProgress);
				workInProgress.lanes = 536870912;
				return null;
			}
			return mountActivityChildren(workInProgress, nextProps);
		}
		var prevState = current.memoizedState;
		if (null !== prevState) {
			var dehydrated = prevState.dehydrated;
			pushDehydratedActivitySuspenseHandler(workInProgress);
			if (didSuspend) if (workInProgress.flags & 256) workInProgress.flags &= -257, workInProgress = retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes);
			else if (null !== workInProgress.memoizedState) workInProgress.child = current.child, workInProgress.flags |= 128, workInProgress = null;
			else throw Error(formatProdErrorMessage(558));
			else if (didReceiveUpdate || propagateParentContextChanges(current, workInProgress, renderLanes, !1), didSuspend = 0 !== (renderLanes & current.childLanes), didReceiveUpdate || didSuspend) {
				if (null === currentTreeHiddenStackCursor.current) {
					nextProps = workInProgressRoot;
					if (null !== nextProps && (dehydrated = getBumpedLaneForHydration(nextProps, renderLanes), 0 !== dehydrated && dehydrated !== prevState.retryLane)) throw prevState.retryLane = dehydrated, enqueueConcurrentRenderForLane(current, dehydrated), scheduleUpdateOnFiber(nextProps, current, dehydrated), SelectiveHydrationException;
					renderDidSuspendDelayIfPossible();
				}
				workInProgress = retryActivityComponentWithoutHydrating(current, workInProgress, renderLanes);
			} else current = prevState.treeContext, nextHydratableInstance = getNextHydratable(dehydrated.nextSibling), hydrationParentFiber = workInProgress, isHydrating = !0, hydrationErrors = null, rootOrSingletonContext = !1, null !== current && restoreSuspendedTreeContext(workInProgress, current), workInProgress = mountActivityChildren(workInProgress, nextProps), workInProgress.flags |= 0x8001000;
			return workInProgress;
		}
		current = createWorkInProgress(current.child, {
			mode: nextProps.mode,
			children: nextProps.children
		});
		current.ref = workInProgress.ref;
		workInProgress.child = current;
		current.return = workInProgress;
		return current;
	}
	function markRef(current, workInProgress) {
		var ref = workInProgress.ref;
		if (null === ref) null !== current && null !== current.ref && (workInProgress.flags |= 4194816);
		else {
			if ("function" !== typeof ref && "object" !== typeof ref) throw Error(formatProdErrorMessage(284));
			if (null === current || current.ref !== ref) workInProgress.flags |= 4194816;
		}
	}
	function updateFunctionComponent(current, workInProgress, Component, nextProps, renderLanes) {
		prepareToReadContext(workInProgress);
		Component = renderWithHooks(current, workInProgress, Component, nextProps, void 0, renderLanes);
		nextProps = checkDidRenderIdHook();
		if (null !== current && !didReceiveUpdate) return bailoutHooks(current, workInProgress, renderLanes), bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		isHydrating && nextProps && pushMaterializedTreeId(workInProgress);
		workInProgress.flags |= 1;
		reconcileChildren(current, workInProgress, Component, renderLanes);
		return workInProgress.child;
	}
	function replayFunctionComponent(current, workInProgress, nextProps, Component, secondArg, renderLanes) {
		prepareToReadContext(workInProgress);
		workInProgress.updateQueue = null;
		nextProps = renderWithHooksAgain(workInProgress, Component, nextProps, secondArg);
		finishRenderingHooks(current);
		Component = checkDidRenderIdHook();
		if (null !== current && !didReceiveUpdate) return bailoutHooks(current, workInProgress, renderLanes), bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		isHydrating && Component && pushMaterializedTreeId(workInProgress);
		workInProgress.flags |= 1;
		reconcileChildren(current, workInProgress, nextProps, renderLanes);
		return workInProgress.child;
	}
	function updateClassComponent(current, workInProgress, Component, nextProps, renderLanes) {
		prepareToReadContext(workInProgress);
		if (null === workInProgress.stateNode) {
			var context = emptyContextObject, contextType = Component.contextType;
			"object" === typeof contextType && null !== contextType && (context = readContext(contextType));
			context = new Component(nextProps, context);
			workInProgress.memoizedState = null !== context.state && void 0 !== context.state ? context.state : null;
			context.updater = classComponentUpdater;
			workInProgress.stateNode = context;
			context._reactInternals = workInProgress;
			context = workInProgress.stateNode;
			context.props = nextProps;
			context.state = workInProgress.memoizedState;
			context.refs = {};
			initializeUpdateQueue(workInProgress);
			contextType = Component.contextType;
			context.context = "object" === typeof contextType && null !== contextType ? readContext(contextType) : emptyContextObject;
			context.state = workInProgress.memoizedState;
			contextType = Component.getDerivedStateFromProps;
			"function" === typeof contextType && (applyDerivedStateFromProps(workInProgress, Component, contextType, nextProps), context.state = workInProgress.memoizedState);
			"function" === typeof Component.getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || (contextType = context.state, "function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount(), contextType !== context.state && classComponentUpdater.enqueueReplaceState(context, context.state, null), processUpdateQueue(workInProgress, nextProps, context, renderLanes), suspendIfUpdateReadFromEntangledAsyncAction(), context.state = workInProgress.memoizedState);
			"function" === typeof context.componentDidMount && (workInProgress.flags |= 4194308);
			nextProps = !0;
		} else if (null === current) {
			context = workInProgress.stateNode;
			var unresolvedOldProps = workInProgress.memoizedProps, oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
			context.props = oldProps;
			var oldContext = context.context, contextType$jscomp$0 = Component.contextType;
			contextType = emptyContextObject;
			"object" === typeof contextType$jscomp$0 && null !== contextType$jscomp$0 && (contextType = readContext(contextType$jscomp$0));
			var getDerivedStateFromProps = Component.getDerivedStateFromProps;
			contextType$jscomp$0 = "function" === typeof getDerivedStateFromProps || "function" === typeof context.getSnapshotBeforeUpdate;
			unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
			contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (unresolvedOldProps || oldContext !== contextType) && callComponentWillReceiveProps(workInProgress, context, nextProps, contextType);
			hasForceUpdate = !1;
			var oldState = workInProgress.memoizedState;
			context.state = oldState;
			processUpdateQueue(workInProgress, nextProps, context, renderLanes);
			suspendIfUpdateReadFromEntangledAsyncAction();
			oldContext = workInProgress.memoizedState;
			unresolvedOldProps || oldState !== oldContext || hasForceUpdate ? ("function" === typeof getDerivedStateFromProps && (applyDerivedStateFromProps(workInProgress, Component, getDerivedStateFromProps, nextProps), oldContext = workInProgress.memoizedState), (oldProps = hasForceUpdate || checkShouldComponentUpdate(workInProgress, Component, oldProps, nextProps, oldState, oldContext, contextType)) ? (contextType$jscomp$0 || "function" !== typeof context.UNSAFE_componentWillMount && "function" !== typeof context.componentWillMount || ("function" === typeof context.componentWillMount && context.componentWillMount(), "function" === typeof context.UNSAFE_componentWillMount && context.UNSAFE_componentWillMount()), "function" === typeof context.componentDidMount && (workInProgress.flags |= 4194308)) : ("function" === typeof context.componentDidMount && (workInProgress.flags |= 4194308), workInProgress.memoizedProps = nextProps, workInProgress.memoizedState = oldContext), context.props = nextProps, context.state = oldContext, context.context = contextType, nextProps = oldProps) : ("function" === typeof context.componentDidMount && (workInProgress.flags |= 4194308), nextProps = !1);
		} else {
			context = workInProgress.stateNode;
			cloneUpdateQueue(current, workInProgress);
			contextType = workInProgress.memoizedProps;
			contextType$jscomp$0 = resolveClassComponentProps(Component, contextType);
			context.props = contextType$jscomp$0;
			getDerivedStateFromProps = workInProgress.pendingProps;
			oldState = context.context;
			oldContext = Component.contextType;
			oldProps = emptyContextObject;
			"object" === typeof oldContext && null !== oldContext && (oldProps = readContext(oldContext));
			unresolvedOldProps = Component.getDerivedStateFromProps;
			(oldContext = "function" === typeof unresolvedOldProps || "function" === typeof context.getSnapshotBeforeUpdate) || "function" !== typeof context.UNSAFE_componentWillReceiveProps && "function" !== typeof context.componentWillReceiveProps || (contextType !== getDerivedStateFromProps || oldState !== oldProps) && callComponentWillReceiveProps(workInProgress, context, nextProps, oldProps);
			hasForceUpdate = !1;
			oldState = workInProgress.memoizedState;
			context.state = oldState;
			processUpdateQueue(workInProgress, nextProps, context, renderLanes);
			suspendIfUpdateReadFromEntangledAsyncAction();
			var newState = workInProgress.memoizedState;
			contextType !== getDerivedStateFromProps || oldState !== newState || hasForceUpdate || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies) ? ("function" === typeof unresolvedOldProps && (applyDerivedStateFromProps(workInProgress, Component, unresolvedOldProps, nextProps), newState = workInProgress.memoizedState), (contextType$jscomp$0 = hasForceUpdate || checkShouldComponentUpdate(workInProgress, Component, contextType$jscomp$0, nextProps, oldState, newState, oldProps) || null !== current && null !== current.dependencies && checkIfContextChanged(current.dependencies)) ? (oldContext || "function" !== typeof context.UNSAFE_componentWillUpdate && "function" !== typeof context.componentWillUpdate || ("function" === typeof context.componentWillUpdate && context.componentWillUpdate(nextProps, newState, oldProps), "function" === typeof context.UNSAFE_componentWillUpdate && context.UNSAFE_componentWillUpdate(nextProps, newState, oldProps)), "function" === typeof context.componentDidUpdate && (workInProgress.flags |= 4), "function" === typeof context.getSnapshotBeforeUpdate && (workInProgress.flags |= 1024)) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress.flags |= 1024), workInProgress.memoizedProps = nextProps, workInProgress.memoizedState = newState), context.props = nextProps, context.state = newState, context.context = oldProps, nextProps = contextType$jscomp$0) : ("function" !== typeof context.componentDidUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress.flags |= 4), "function" !== typeof context.getSnapshotBeforeUpdate || contextType === current.memoizedProps && oldState === current.memoizedState || (workInProgress.flags |= 1024), nextProps = !1);
		}
		context = nextProps;
		markRef(current, workInProgress);
		nextProps = 0 !== (workInProgress.flags & 128);
		context || nextProps ? (context = workInProgress.stateNode, Component = nextProps && "function" !== typeof Component.getDerivedStateFromError ? null : context.render(), workInProgress.flags |= 1, null !== current && nextProps ? (workInProgress.child = reconcileChildFibers(workInProgress, current.child, null, renderLanes), workInProgress.child = reconcileChildFibers(workInProgress, null, Component, renderLanes)) : reconcileChildren(current, workInProgress, Component, renderLanes), workInProgress.memoizedState = context.state, current = workInProgress.child) : current = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
		return current;
	}
	function mountHostRootWithoutHydrating(current, workInProgress, nextChildren, renderLanes) {
		resetHydrationState();
		workInProgress.flags |= 256;
		reconcileChildren(current, workInProgress, nextChildren, renderLanes);
		return workInProgress.child;
	}
	var SUSPENDED_MARKER = {
		dehydrated: null,
		treeContext: null,
		retryLane: 0,
		hydrationErrors: null
	};
	function mountSuspenseOffscreenState(renderLanes) {
		return {
			baseLanes: renderLanes,
			cachePool: getSuspendedCache()
		};
	}
	function getRemainingWorkInPrimaryTree(current, primaryTreeDidDefer, renderLanes) {
		current = null !== current ? current.childLanes & ~renderLanes : 0;
		primaryTreeDidDefer && (current |= workInProgressDeferredLane);
		return current;
	}
	function updateSuspenseComponent(current, workInProgress, renderLanes) {
		var nextProps = workInProgress.pendingProps, showFallback = !1, didSuspend = 0 !== (workInProgress.flags & 128), JSCompiler_temp;
		(JSCompiler_temp = didSuspend) || (JSCompiler_temp = null !== current && null === current.memoizedState ? !1 : 0 !== (suspenseStackCursor.current & 2));
		JSCompiler_temp && (showFallback = !0, workInProgress.flags &= -129);
		JSCompiler_temp = 0 !== (workInProgress.flags & 32);
		workInProgress.flags &= -33;
		if (null === current) {
			if (isHydrating) {
				showFallback ? pushPrimaryTreeSuspenseHandler(workInProgress) : reuseSuspenseHandlerOnStack();
				(current = nextHydratableInstance) ? (current = canHydrateHydrationBoundary(current, rootOrSingletonContext), current = null !== current && "&" !== current.data ? current : null, null !== current && (workInProgress.memoizedState = {
					dehydrated: current,
					treeContext: null !== treeContextProvider ? {
						id: treeContextId,
						overflow: treeContextOverflow
					} : null,
					retryLane: 536870912,
					hydrationErrors: null
				}, renderLanes = createFiberFromDehydratedFragment(current), renderLanes.return = workInProgress, workInProgress.child = renderLanes, hydrationParentFiber = workInProgress, nextHydratableInstance = null)) : current = null;
				if (null === current) throw throwOnHydrationMismatch(workInProgress);
				isSuspenseInstanceFallback(current) ? workInProgress.lanes = 32 : workInProgress.lanes = 536870912;
				return null;
			}
			didSuspend = nextProps.children;
			nextProps = nextProps.fallback;
			if (showFallback) return reuseSuspenseHandlerOnStack(), showFallback = workInProgress.mode, didSuspend = mountWorkInProgressOffscreenFiber({
				mode: "hidden",
				children: didSuspend
			}, showFallback), nextProps = createFiberFromFragment(nextProps, showFallback, renderLanes, null), didSuspend.return = workInProgress, nextProps.return = workInProgress, didSuspend.sibling = nextProps, workInProgress.child = didSuspend, nextProps = workInProgress.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes), nextProps.childLanes = getRemainingWorkInPrimaryTree(current, JSCompiler_temp, renderLanes), workInProgress.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(null, nextProps);
			pushPrimaryTreeSuspenseHandler(workInProgress);
			return mountSuspensePrimaryChildren(workInProgress, didSuspend);
		}
		var prevState = current.memoizedState;
		if (null !== prevState) {
			var dehydrated$96 = prevState.dehydrated;
			if (null !== dehydrated$96) return updateDehydratedSuspenseComponent(current, workInProgress, didSuspend, JSCompiler_temp, nextProps, dehydrated$96, prevState, renderLanes);
		}
		if (showFallback) return reuseSuspenseHandlerOnStack(), showFallback = nextProps.fallback, didSuspend = workInProgress.mode, prevState = current.child, dehydrated$96 = prevState.sibling, nextProps = createWorkInProgress(prevState, {
			mode: "hidden",
			children: nextProps.children
		}), nextProps.subtreeFlags = prevState.subtreeFlags & 0x47f00000, null !== dehydrated$96 ? showFallback = createWorkInProgress(dehydrated$96, showFallback) : (showFallback = createFiberFromFragment(showFallback, didSuspend, renderLanes, null), showFallback.flags |= 2), showFallback.return = workInProgress, nextProps.return = workInProgress, nextProps.sibling = showFallback, workInProgress.child = nextProps, bailoutOffscreenComponent(null, nextProps), nextProps = workInProgress.child, showFallback = current.child.memoizedState, null === showFallback ? showFallback = mountSuspenseOffscreenState(renderLanes) : (didSuspend = showFallback.cachePool, null !== didSuspend ? (prevState = CacheContext._currentValue, didSuspend = didSuspend.parent !== prevState ? {
			parent: prevState,
			pool: prevState
		} : didSuspend) : didSuspend = getSuspendedCache(), showFallback = {
			baseLanes: showFallback.baseLanes | renderLanes,
			cachePool: didSuspend
		}), nextProps.memoizedState = showFallback, nextProps.childLanes = getRemainingWorkInPrimaryTree(current, JSCompiler_temp, renderLanes), workInProgress.memoizedState = SUSPENDED_MARKER, bailoutOffscreenComponent(current.child, nextProps);
		pushPrimaryTreeSuspenseHandler(workInProgress);
		renderLanes = current.child;
		current = renderLanes.sibling;
		renderLanes = createWorkInProgress(renderLanes, {
			mode: "visible",
			children: nextProps.children
		});
		renderLanes.return = workInProgress;
		renderLanes.sibling = null;
		null !== current && (JSCompiler_temp = workInProgress.deletions, null === JSCompiler_temp ? (workInProgress.deletions = [current], workInProgress.flags |= 16) : JSCompiler_temp.push(current));
		workInProgress.child = renderLanes;
		workInProgress.memoizedState = null;
		return renderLanes;
	}
	function mountSuspensePrimaryChildren(workInProgress, primaryChildren) {
		primaryChildren = mountWorkInProgressOffscreenFiber({
			mode: "visible",
			children: primaryChildren
		}, workInProgress.mode);
		primaryChildren.return = workInProgress;
		return workInProgress.child = primaryChildren;
	}
	function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
		offscreenProps = createFiberImplClass(22, offscreenProps, null, mode);
		offscreenProps.lanes = 0;
		return offscreenProps;
	}
	function retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes) {
		reconcileChildFibers(workInProgress, current.child, null, renderLanes);
		current = mountSuspensePrimaryChildren(workInProgress, workInProgress.pendingProps.children);
		current.flags |= 2;
		workInProgress.memoizedState = null;
		return current;
	}
	function updateDehydratedSuspenseComponent(current, workInProgress, didSuspend, didPrimaryChildrenDefer, nextProps, suspenseInstance, suspenseState, renderLanes) {
		if (didSuspend) {
			if (workInProgress.flags & 256) return pushPrimaryTreeSuspenseHandler(workInProgress), workInProgress.flags &= -257, retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
			if (null !== workInProgress.memoizedState) return reuseSuspenseHandlerOnStack(), workInProgress.child = current.child, workInProgress.flags |= 128, null;
			reuseSuspenseHandlerOnStack();
			suspenseInstance = nextProps.fallback;
			suspenseState = workInProgress.mode;
			nextProps = mountWorkInProgressOffscreenFiber({
				mode: "visible",
				children: nextProps.children
			}, suspenseState);
			suspenseInstance = createFiberFromFragment(suspenseInstance, suspenseState, renderLanes, null);
			suspenseInstance.flags |= 2;
			nextProps.return = workInProgress;
			suspenseInstance.return = workInProgress;
			nextProps.sibling = suspenseInstance;
			workInProgress.child = nextProps;
			reconcileChildFibers(workInProgress, current.child, null, renderLanes);
			nextProps = workInProgress.child;
			nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes);
			nextProps.childLanes = getRemainingWorkInPrimaryTree(current, didPrimaryChildrenDefer, renderLanes);
			workInProgress.memoizedState = SUSPENDED_MARKER;
			return bailoutOffscreenComponent(null, nextProps);
		}
		pushPrimaryTreeSuspenseHandler(workInProgress);
		if (isSuspenseInstanceFallback(suspenseInstance)) {
			didPrimaryChildrenDefer = suspenseInstance.nextSibling && suspenseInstance.nextSibling.dataset;
			if (didPrimaryChildrenDefer) var digest = didPrimaryChildrenDefer.dgst;
			didPrimaryChildrenDefer = digest;
			"" !== didPrimaryChildrenDefer && (nextProps = Error(formatProdErrorMessage(419)), nextProps.stack = "", nextProps.digest = didPrimaryChildrenDefer, queueHydrationError({
				value: nextProps,
				source: null,
				stack: null
			}));
			return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
		}
		didReceiveUpdate || propagateParentContextChanges(current, workInProgress, renderLanes, !1);
		didPrimaryChildrenDefer = 0 !== (renderLanes & current.childLanes);
		if (didReceiveUpdate || didPrimaryChildrenDefer) {
			if (null !== currentTreeHiddenStackCursor.current) return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
			didPrimaryChildrenDefer = workInProgressRoot;
			if (null !== didPrimaryChildrenDefer && (nextProps = getBumpedLaneForHydration(didPrimaryChildrenDefer, renderLanes), 0 !== nextProps && nextProps !== suspenseState.retryLane)) throw suspenseState.retryLane = nextProps, enqueueConcurrentRenderForLane(current, nextProps), scheduleUpdateOnFiber(didPrimaryChildrenDefer, current, nextProps), SelectiveHydrationException;
			isSuspenseInstancePending(suspenseInstance) || renderDidSuspendDelayIfPossible();
			return retrySuspenseComponentWithoutHydrating(current, workInProgress, renderLanes);
		}
		if (isSuspenseInstancePending(suspenseInstance)) return workInProgress.flags |= 192, workInProgress.child = current.child, null;
		current = suspenseState.treeContext;
		nextHydratableInstance = getNextHydratable(suspenseInstance.nextSibling);
		hydrationParentFiber = workInProgress;
		isHydrating = !0;
		hydrationErrors = null;
		rootOrSingletonContext = !1;
		null !== current && restoreSuspendedTreeContext(workInProgress, current);
		workInProgress = mountSuspensePrimaryChildren(workInProgress, nextProps.children);
		workInProgress.flags |= 0x8001000;
		return workInProgress;
	}
	function scheduleSuspenseWorkOnFiber(fiber, renderLanes, propagationRoot) {
		fiber.lanes |= renderLanes;
		var alternate = fiber.alternate;
		null !== alternate && (alternate.lanes |= renderLanes);
		scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
	}
	function findLastContentRow(firstChild) {
		for (var lastContentRow = null; null !== firstChild;) {
			var currentRow = firstChild.alternate;
			null !== currentRow && null === findFirstSuspended(currentRow) && (lastContentRow = firstChild);
			firstChild = firstChild.sibling;
		}
		return lastContentRow;
	}
	function initSuspenseListRenderState(workInProgress, isBackwards, tail, lastContentRow, tailMode, treeForkCount) {
		var renderState = workInProgress.memoizedState;
		null === renderState ? workInProgress.memoizedState = {
			isBackwards,
			rendering: null,
			renderingStartTime: 0,
			last: lastContentRow,
			tail,
			tailMode,
			treeForkCount
		} : (renderState.isBackwards = isBackwards, renderState.rendering = null, renderState.renderingStartTime = 0, renderState.last = lastContentRow, renderState.tail = tail, renderState.tailMode = tailMode, renderState.treeForkCount = treeForkCount);
	}
	function reverseChildren(fiber) {
		var row = fiber.child;
		for (fiber.child = null; null !== row;) {
			var nextRow = row.sibling;
			row.sibling = fiber.child;
			fiber.child = row;
			row = nextRow;
		}
	}
	function updateSuspenseListComponent(current, workInProgress, renderLanes) {
		var nextProps = workInProgress.pendingProps, revealOrder = nextProps.revealOrder, tailMode = nextProps.tail;
		nextProps = nextProps.children;
		var suspenseContext = suspenseStackCursor.current;
		if (workInProgress.flags & 128) return pushSuspenseListContext(workInProgress, suspenseContext), null;
		var shouldForceFallback = 0 !== (suspenseContext & 2);
		shouldForceFallback ? (suspenseContext = suspenseContext & 1 | 2, workInProgress.flags |= 128) : suspenseContext &= 1;
		pushSuspenseListContext(workInProgress, suspenseContext);
		"backwards" === revealOrder && null !== current ? (reverseChildren(current), reconcileChildren(current, workInProgress, nextProps, renderLanes), reverseChildren(current)) : reconcileChildren(current, workInProgress, nextProps, renderLanes);
		nextProps = isHydrating ? treeForkCount : 0;
		if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128)) a: for (current = workInProgress.child; null !== current;) {
			if (13 === current.tag) null !== current.memoizedState && scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
			else if (19 === current.tag) scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
			else if (null !== current.child) {
				current.child.return = current;
				current = current.child;
				continue;
			}
			if (current === workInProgress) break a;
			for (; null === current.sibling;) {
				if (null === current.return || current.return === workInProgress) break a;
				current = current.return;
			}
			current.sibling.return = current.return;
			current = current.sibling;
		}
		switch (revealOrder) {
			case "backwards":
				renderLanes = findLastContentRow(workInProgress.child);
				null === renderLanes ? (revealOrder = workInProgress.child, workInProgress.child = null) : (revealOrder = renderLanes.sibling, renderLanes.sibling = null, reverseChildren(workInProgress));
				initSuspenseListRenderState(workInProgress, !0, revealOrder, null, tailMode, nextProps);
				break;
			case "unstable_legacy-backwards":
				renderLanes = null;
				revealOrder = workInProgress.child;
				for (workInProgress.child = null; null !== revealOrder;) {
					current = revealOrder.alternate;
					if (null !== current && null === findFirstSuspended(current)) {
						workInProgress.child = revealOrder;
						break;
					}
					current = revealOrder.sibling;
					revealOrder.sibling = renderLanes;
					renderLanes = revealOrder;
					revealOrder = current;
				}
				initSuspenseListRenderState(workInProgress, !0, renderLanes, null, tailMode, nextProps);
				break;
			case "together":
				initSuspenseListRenderState(workInProgress, !1, null, null, void 0, nextProps);
				break;
			case "independent":
				workInProgress.memoizedState = null;
				break;
			default: renderLanes = findLastContentRow(workInProgress.child), null === renderLanes ? (revealOrder = workInProgress.child, workInProgress.child = null) : (revealOrder = renderLanes.sibling, renderLanes.sibling = null), initSuspenseListRenderState(workInProgress, !1, revealOrder, renderLanes, tailMode, nextProps);
		}
		return workInProgress.child;
	}
	function updateContextProvider(current, workInProgress, renderLanes) {
		var newProps = workInProgress.pendingProps;
		pushProvider(workInProgress, workInProgress.type, newProps.value);
		reconcileChildren(current, workInProgress, newProps.children, renderLanes);
		return workInProgress.child;
	}
	function bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes) {
		null !== current && (workInProgress.dependencies = current.dependencies);
		workInProgressRootSkippedLanes |= workInProgress.lanes;
		if (0 === (renderLanes & workInProgress.childLanes)) if (null !== current) {
			if (propagateParentContextChanges(current, workInProgress, renderLanes, !1), 0 === (renderLanes & workInProgress.childLanes)) return null;
		} else return null;
		if (null !== current && workInProgress.child !== current.child) throw Error(formatProdErrorMessage(153));
		if (null !== workInProgress.child) {
			current = workInProgress.child;
			renderLanes = createWorkInProgress(current, current.pendingProps);
			workInProgress.child = renderLanes;
			for (renderLanes.return = workInProgress; null !== current.sibling;) current = current.sibling, renderLanes = renderLanes.sibling = createWorkInProgress(current, current.pendingProps), renderLanes.return = workInProgress;
			renderLanes.sibling = null;
		}
		return workInProgress.child;
	}
	function checkScheduledUpdateOrContext(current, renderLanes) {
		if (0 !== (current.lanes & renderLanes)) return !0;
		current = current.dependencies;
		return null !== current && checkIfContextChanged(current) ? !0 : !1;
	}
	function attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress, renderLanes) {
		switch (workInProgress.tag) {
			case 3:
				pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
				pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
				resetHydrationState();
				break;
			case 27:
			case 5:
				pushHostContext(workInProgress);
				break;
			case 4:
				pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
				break;
			case 10:
				pushProvider(workInProgress, workInProgress.type, workInProgress.memoizedProps.value);
				break;
			case 31:
				if (null !== workInProgress.memoizedState) return workInProgress.flags |= 128, pushDehydratedActivitySuspenseHandler(workInProgress), null;
				break;
			case 13:
				var state$108 = workInProgress.memoizedState;
				if (null !== state$108) {
					if (null !== state$108.dehydrated) return pushPrimaryTreeSuspenseHandler(workInProgress), workInProgress.flags |= 128, null;
					state$108 = propagateParentContextChanges(current, workInProgress, renderLanes, !1);
					var primaryChildLanes = workInProgress.child.childLanes;
					if (state$108 || 0 !== (renderLanes & primaryChildLanes)) return updateSuspenseComponent(current, workInProgress, renderLanes);
					pushPrimaryTreeSuspenseHandler(workInProgress);
					current = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
					return null !== current ? current.sibling : null;
				}
				pushPrimaryTreeSuspenseHandler(workInProgress);
				break;
			case 19:
				if (workInProgress.flags & 128) return updateSuspenseListComponent(current, workInProgress, renderLanes);
				primaryChildLanes = 0 !== (current.flags & 128);
				state$108 = 0 !== (renderLanes & workInProgress.childLanes);
				state$108 || (propagateParentContextChanges(current, workInProgress, renderLanes, !1), state$108 = 0 !== (renderLanes & workInProgress.childLanes));
				if (primaryChildLanes) {
					if (state$108) return updateSuspenseListComponent(current, workInProgress, renderLanes);
					workInProgress.flags |= 128;
				}
				primaryChildLanes = workInProgress.memoizedState;
				null !== primaryChildLanes && (primaryChildLanes.rendering = null, primaryChildLanes.tail = null, primaryChildLanes.lastEffect = null);
				pushSuspenseListContext(workInProgress, suspenseStackCursor.current);
				if (state$108) break;
				else return null;
			case 22: return workInProgress.lanes = 0, updateOffscreenComponent(current, workInProgress, renderLanes, workInProgress.pendingProps);
			case 24: pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
		}
		return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
	}
	function beginWork(current, workInProgress, renderLanes) {
		if (null !== current) if (current.memoizedProps !== workInProgress.pendingProps) didReceiveUpdate = !0;
		else {
			if (!checkScheduledUpdateOrContext(current, renderLanes) && 0 === (workInProgress.flags & 128)) return didReceiveUpdate = !1, attemptEarlyBailoutIfNoScheduledUpdate(current, workInProgress, renderLanes);
			didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
		}
		else didReceiveUpdate = !1, isHydrating && 0 !== (workInProgress.flags & 1048576) && pushTreeId(workInProgress, treeForkCount, workInProgress.index);
		workInProgress.lanes = 0;
		switch (workInProgress.tag) {
			case 16:
				a: {
					var props = workInProgress.pendingProps;
					current = resolveLazy(workInProgress.elementType);
					workInProgress.type = current;
					if ("function" === typeof current) shouldConstruct(current) ? (props = resolveClassComponentProps(current, props), workInProgress.tag = 1, workInProgress = updateClassComponent(null, workInProgress, current, props, renderLanes)) : (workInProgress.tag = 0, workInProgress = updateFunctionComponent(null, workInProgress, current, props, renderLanes));
					else {
						if (void 0 !== current && null !== current) {
							var $$typeof = current.$$typeof;
							if ($$typeof === REACT_FORWARD_REF_TYPE) {
								workInProgress.tag = 11;
								workInProgress = updateForwardRef(null, workInProgress, current, props, renderLanes);
								break a;
							} else if ($$typeof === REACT_MEMO_TYPE) {
								workInProgress.tag = 14;
								workInProgress = updateMemoComponent(null, workInProgress, current, props, renderLanes);
								break a;
							} else if ($$typeof === REACT_CONTEXT_TYPE) {
								workInProgress.tag = 10;
								workInProgress.type = current;
								workInProgress = updateContextProvider(null, workInProgress, renderLanes);
								break a;
							}
						}
						workInProgress = getComponentNameFromType(current) || current;
						throw Error(formatProdErrorMessage(306, workInProgress, ""));
					}
				}
				return workInProgress;
			case 0: return updateFunctionComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, renderLanes);
			case 1: return props = workInProgress.type, $$typeof = resolveClassComponentProps(props, workInProgress.pendingProps), updateClassComponent(current, workInProgress, props, $$typeof, renderLanes);
			case 3:
				a: {
					pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
					if (null === current) throw Error(formatProdErrorMessage(387));
					props = workInProgress.pendingProps;
					var prevState = workInProgress.memoizedState;
					$$typeof = prevState.element;
					cloneUpdateQueue(current, workInProgress);
					processUpdateQueue(workInProgress, props, null, renderLanes);
					var nextState = workInProgress.memoizedState;
					props = nextState.cache;
					pushProvider(workInProgress, CacheContext, props);
					props !== prevState.cache && propagateContextChanges(workInProgress, [CacheContext], renderLanes, !0);
					suspendIfUpdateReadFromEntangledAsyncAction();
					props = nextState.element;
					if (prevState.isDehydrated) if (prevState = {
						element: props,
						isDehydrated: !1,
						cache: nextState.cache
					}, workInProgress.updateQueue.baseState = prevState, workInProgress.memoizedState = prevState, workInProgress.flags & 256) {
						workInProgress = mountHostRootWithoutHydrating(current, workInProgress, props, renderLanes);
						break a;
					} else if (props !== $$typeof) {
						$$typeof = createCapturedValueAtFiber(Error(formatProdErrorMessage(424)), workInProgress);
						queueHydrationError($$typeof);
						workInProgress = mountHostRootWithoutHydrating(current, workInProgress, props, renderLanes);
						break a;
					} else {
						current = workInProgress.stateNode.containerInfo;
						switch (current.nodeType) {
							case 9:
								current = current.body;
								break;
							default: current = "HTML" === current.nodeName ? current.ownerDocument.body : current;
						}
						nextHydratableInstance = getNextHydratable(current.firstChild);
						hydrationParentFiber = workInProgress;
						isHydrating = !0;
						hydrationErrors = null;
						rootOrSingletonContext = !0;
						renderLanes = mountChildFibers(workInProgress, null, props, renderLanes);
						for (workInProgress.child = renderLanes; renderLanes;) renderLanes.flags = renderLanes.flags & -3 | 0x8001000, renderLanes = renderLanes.sibling;
					}
					else {
						resetHydrationState();
						if (props === $$typeof) {
							workInProgress = bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
							break a;
						}
						reconcileChildren(current, workInProgress, props, renderLanes);
					}
					workInProgress = workInProgress.child;
				}
				return workInProgress;
			case 26: return markRef(current, workInProgress), null === current ? (renderLanes = getResource(workInProgress.type, null, workInProgress.pendingProps, null)) ? workInProgress.memoizedState = renderLanes : isHydrating || (workInProgress.stateNode = createHoistableInstance(workInProgress.type, workInProgress.pendingProps, rootInstanceStackCursor.current, workInProgress)) : workInProgress.memoizedState = getResource(workInProgress.type, current.memoizedProps, workInProgress.pendingProps, current.memoizedState), null;
			case 27: return pushHostContext(workInProgress), null === current && isHydrating && (props = workInProgress.stateNode = resolveSingletonInstance(workInProgress.type, workInProgress.pendingProps, rootInstanceStackCursor.current), hydrationParentFiber = workInProgress, rootOrSingletonContext = !0, $$typeof = nextHydratableInstance, isSingletonScope(workInProgress.type) ? (previousHydratableOnEnteringScopedSingleton = $$typeof, nextHydratableInstance = getNextHydratable(props.firstChild)) : nextHydratableInstance = $$typeof), reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes), markRef(current, workInProgress), null === current && (workInProgress.flags |= 4194304), workInProgress.child;
			case 5:
				if (null === current && isHydrating) {
					if ($$typeof = props = nextHydratableInstance) props = canHydrateInstance(props, workInProgress.type, workInProgress.pendingProps, rootOrSingletonContext), null !== props ? (workInProgress.stateNode = props, hydrationParentFiber = workInProgress, nextHydratableInstance = getNextHydratable(props.firstChild), rootOrSingletonContext = !1, $$typeof = !0) : $$typeof = !1;
					$$typeof || throwOnHydrationMismatch(workInProgress);
				}
				pushHostContext(workInProgress);
				$$typeof = workInProgress.type;
				prevState = workInProgress.pendingProps;
				nextState = null !== current ? current.memoizedProps : null;
				props = prevState.children;
				shouldSetTextContent($$typeof, prevState) ? props = null : null !== nextState && shouldSetTextContent($$typeof, nextState) && (workInProgress.flags |= 32);
				null !== workInProgress.memoizedState && ($$typeof = renderWithHooks(current, workInProgress, TransitionAwareHostComponent, null, null, renderLanes), HostTransitionContext._currentValue = $$typeof);
				markRef(current, workInProgress);
				reconcileChildren(current, workInProgress, props, renderLanes);
				return workInProgress.child;
			case 6:
				if (null === current && isHydrating) {
					if (current = renderLanes = nextHydratableInstance) renderLanes = canHydrateTextInstance(renderLanes, workInProgress.pendingProps, rootOrSingletonContext), null !== renderLanes ? (workInProgress.stateNode = renderLanes, hydrationParentFiber = workInProgress, nextHydratableInstance = null, current = !0) : current = !1;
					current || throwOnHydrationMismatch(workInProgress);
				}
				return null;
			case 13: return updateSuspenseComponent(current, workInProgress, renderLanes);
			case 4: return pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo), props = workInProgress.pendingProps, null === current ? workInProgress.child = reconcileChildFibers(workInProgress, null, props, renderLanes) : reconcileChildren(current, workInProgress, props, renderLanes), workInProgress.child;
			case 11: return updateForwardRef(current, workInProgress, workInProgress.type, workInProgress.pendingProps, renderLanes);
			case 7: return props = workInProgress.pendingProps, markRef(current, workInProgress), reconcileChildren(current, workInProgress, props, renderLanes), workInProgress.child;
			case 8: return reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes), workInProgress.child;
			case 12: return reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes), workInProgress.child;
			case 10: return updateContextProvider(current, workInProgress, renderLanes);
			case 9: return $$typeof = workInProgress.type._context, props = workInProgress.pendingProps.children, prepareToReadContext(workInProgress), $$typeof = readContext($$typeof), props = props($$typeof), workInProgress.flags |= 1, reconcileChildren(current, workInProgress, props, renderLanes), workInProgress.child;
			case 14: return updateMemoComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, renderLanes);
			case 15: return updateSimpleMemoComponent(current, workInProgress, workInProgress.type, workInProgress.pendingProps, renderLanes);
			case 19: return updateSuspenseListComponent(current, workInProgress, renderLanes);
			case 31: return updateActivityComponent(current, workInProgress, renderLanes);
			case 22: return updateOffscreenComponent(current, workInProgress, renderLanes, workInProgress.pendingProps);
			case 24: return prepareToReadContext(workInProgress), props = readContext(CacheContext), null === current ? ($$typeof = peekCacheFromPool(), null === $$typeof && ($$typeof = workInProgressRoot, prevState = createCache(), $$typeof.pooledCache = prevState, prevState.refCount++, null !== prevState && ($$typeof.pooledCacheLanes |= renderLanes), $$typeof = prevState), workInProgress.memoizedState = {
				parent: props,
				cache: $$typeof
			}, initializeUpdateQueue(workInProgress), pushProvider(workInProgress, CacheContext, $$typeof)) : (0 !== (current.lanes & renderLanes) && (cloneUpdateQueue(current, workInProgress), processUpdateQueue(workInProgress, null, null, renderLanes), suspendIfUpdateReadFromEntangledAsyncAction()), $$typeof = current.memoizedState, prevState = workInProgress.memoizedState, $$typeof.parent !== props ? ($$typeof = {
				parent: props,
				cache: props
			}, workInProgress.memoizedState = $$typeof, 0 === workInProgress.lanes && (workInProgress.memoizedState = workInProgress.updateQueue.baseState = $$typeof), pushProvider(workInProgress, CacheContext, props)) : (props = prevState.cache, pushProvider(workInProgress, CacheContext, props), props !== $$typeof.cache && propagateContextChanges(workInProgress, [CacheContext], renderLanes, !0))), reconcileChildren(current, workInProgress, workInProgress.pendingProps.children, renderLanes), workInProgress.child;
			case 30: return null === workInProgress.stateNode && (workInProgress.stateNode = {
				autoName: null,
				paired: null,
				clones: null,
				ref: null
			}), props = workInProgress.pendingProps, null != props.name && "auto" !== props.name ? workInProgress.flags |= null === current ? 18882560 : 18874368 : isHydrating && pushMaterializedTreeId(workInProgress), null !== current && current.memoizedProps.name !== props.name ? workInProgress.flags |= 4194816 : markRef(current, workInProgress), reconcileChildren(current, workInProgress, props.children, renderLanes), workInProgress.child;
			case 29: throw workInProgress.pendingProps;
		}
		throw Error(formatProdErrorMessage(156, workInProgress.tag));
	}
	function markUpdate(workInProgress) {
		workInProgress.flags |= 4;
	}
	function preloadInstanceAndSuspendIfNeeded(workInProgress, type, oldProps, newProps, renderLanes) {
		var JSCompiler_temp;
		if (JSCompiler_temp = 0 !== (workInProgress.mode & 32)) JSCompiler_temp = null === oldProps ? maySuspendCommit(type, newProps) : maySuspendCommit(type, newProps) && (newProps.src !== oldProps.src || newProps.srcSet !== oldProps.srcSet);
		if (JSCompiler_temp) {
			if (workInProgress.flags |= 16777216, (renderLanes & 335544128) === renderLanes) if (workInProgress.stateNode.complete) workInProgress.flags |= 8192;
			else if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
			else throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
		} else workInProgress.flags &= -16777217;
	}
	function preloadResourceAndSuspendIfNeeded(workInProgress, resource) {
		if ("stylesheet" !== resource.type || 0 !== (resource.state.loading & 4)) workInProgress.flags &= -16777217;
		else if (workInProgress.flags |= 16777216, !preloadResource(resource)) if (shouldRemainOnPreviousScreen()) workInProgress.flags |= 8192;
		else throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
	}
	function scheduleRetryEffect(workInProgress, retryQueue) {
		null !== retryQueue && (workInProgress.flags |= 4);
		workInProgress.flags & 16384 && (retryQueue = 22 !== workInProgress.tag ? claimNextRetryLane() : 536870912, workInProgress.lanes |= retryQueue, workInProgressSuspendedRetryLanes |= retryQueue);
	}
	function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
		if (!isHydrating) switch (renderState.tailMode) {
			case "visible": break;
			case "collapsed":
				for (var tailNode = renderState.tail, lastTailNode = null; null !== tailNode;) null !== tailNode.alternate && (lastTailNode = tailNode), tailNode = tailNode.sibling;
				null === lastTailNode ? hasRenderedATailFallback || null === renderState.tail ? renderState.tail = null : renderState.tail.sibling = null : lastTailNode.sibling = null;
				break;
			default:
				hasRenderedATailFallback = renderState.tail;
				for (tailNode = null; null !== hasRenderedATailFallback;) null !== hasRenderedATailFallback.alternate && (tailNode = hasRenderedATailFallback), hasRenderedATailFallback = hasRenderedATailFallback.sibling;
				null === tailNode ? renderState.tail = null : tailNode.sibling = null;
		}
	}
	function bubbleProperties(completedWork) {
		var didBailout = null !== completedWork.alternate && completedWork.alternate.child === completedWork.child, newChildLanes = 0, subtreeFlags = 0;
		if (didBailout) for (var child$113 = completedWork.child; null !== child$113;) newChildLanes |= child$113.lanes | child$113.childLanes, subtreeFlags |= child$113.subtreeFlags & 0x47f00000, subtreeFlags |= child$113.flags & 0x47f00000, child$113.return = completedWork, child$113 = child$113.sibling;
		else for (child$113 = completedWork.child; null !== child$113;) newChildLanes |= child$113.lanes | child$113.childLanes, subtreeFlags |= child$113.subtreeFlags, subtreeFlags |= child$113.flags, child$113.return = completedWork, child$113 = child$113.sibling;
		completedWork.subtreeFlags |= subtreeFlags;
		completedWork.childLanes = newChildLanes;
		return didBailout;
	}
	function completeWork(current, workInProgress, renderLanes) {
		var newProps = workInProgress.pendingProps;
		popTreeContext(workInProgress);
		switch (workInProgress.tag) {
			case 16:
			case 15:
			case 0:
			case 11:
			case 7:
			case 8:
			case 12:
			case 9:
			case 14: return bubbleProperties(workInProgress), null;
			case 1: return bubbleProperties(workInProgress), null;
			case 3:
				renderLanes = workInProgress.stateNode;
				newProps = null;
				null !== current && (newProps = current.memoizedState.cache);
				workInProgress.memoizedState.cache !== newProps && (workInProgress.flags |= 2048);
				popProvider(CacheContext);
				popHostContainer();
				renderLanes.pendingContext && (renderLanes.context = renderLanes.pendingContext, renderLanes.pendingContext = null);
				if (null === current || null === current.child) popHydrationState(workInProgress) ? markUpdate(workInProgress) : null === current || current.memoizedState.isDehydrated && 0 === (workInProgress.flags & 256) || (workInProgress.flags |= 1024, upgradeHydrationErrorsToRecoverable());
				bubbleProperties(workInProgress);
				return null;
			case 26:
				var type = workInProgress.type, nextResource = workInProgress.memoizedState;
				null === current ? (markUpdate(workInProgress), null !== nextResource ? (bubbleProperties(workInProgress), preloadResourceAndSuspendIfNeeded(workInProgress, nextResource)) : (bubbleProperties(workInProgress), preloadInstanceAndSuspendIfNeeded(workInProgress, type, null, newProps, renderLanes))) : nextResource ? nextResource !== current.memoizedState ? (markUpdate(workInProgress), bubbleProperties(workInProgress), preloadResourceAndSuspendIfNeeded(workInProgress, nextResource)) : (bubbleProperties(workInProgress), workInProgress.flags &= -16777217) : (current = current.memoizedProps, current !== newProps && markUpdate(workInProgress), bubbleProperties(workInProgress), preloadInstanceAndSuspendIfNeeded(workInProgress, type, current, newProps, renderLanes));
				return null;
			case 27:
				popHostContext(workInProgress);
				renderLanes = rootInstanceStackCursor.current;
				type = workInProgress.type;
				if (null !== current && null != workInProgress.stateNode) current.memoizedProps !== newProps && markUpdate(workInProgress);
				else {
					if (!newProps) {
						if (null === workInProgress.stateNode) throw Error(formatProdErrorMessage(166));
						bubbleProperties(workInProgress);
						workInProgress.subtreeFlags &= -33554433;
						return null;
					}
					current = contextStackCursor.current;
					popHydrationState(workInProgress) ? prepareToHydrateHostInstance(workInProgress, current) : (current = resolveSingletonInstance(type, newProps, renderLanes), workInProgress.stateNode = current, markUpdate(workInProgress));
				}
				bubbleProperties(workInProgress);
				workInProgress.subtreeFlags &= -33554433;
				return null;
			case 5:
				popHostContext(workInProgress);
				type = workInProgress.type;
				if (null !== current && null != workInProgress.stateNode) current.memoizedProps !== newProps && markUpdate(workInProgress);
				else {
					if (!newProps) {
						if (null === workInProgress.stateNode) throw Error(formatProdErrorMessage(166));
						bubbleProperties(workInProgress);
						workInProgress.subtreeFlags &= -33554433;
						return null;
					}
					nextResource = contextStackCursor.current;
					if (popHydrationState(workInProgress)) prepareToHydrateHostInstance(workInProgress, nextResource);
					else {
						var ownerDocument = getOwnerDocumentFromRootContainer(rootInstanceStackCursor.current);
						switch (nextResource) {
							case 1:
								nextResource = ownerDocument.createElementNS("http://www.w3.org/2000/svg", type);
								break;
							case 2:
								nextResource = ownerDocument.createElementNS("http://www.w3.org/1998/Math/MathML", type);
								break;
							default: switch (type) {
								case "svg":
									nextResource = ownerDocument.createElementNS("http://www.w3.org/2000/svg", type);
									break;
								case "math":
									nextResource = ownerDocument.createElementNS("http://www.w3.org/1998/Math/MathML", type);
									break;
								case "script":
									nextResource = ownerDocument.createElement("div");
									nextResource.innerHTML = "<script><\/script>";
									nextResource = nextResource.removeChild(nextResource.firstChild);
									break;
								case "select":
									nextResource = "string" === typeof newProps.is ? ownerDocument.createElement("select", { is: newProps.is }) : ownerDocument.createElement("select");
									newProps.multiple ? nextResource.multiple = !0 : newProps.size && (nextResource.size = newProps.size);
									break;
								default: nextResource = "string" === typeof newProps.is ? ownerDocument.createElement(type, { is: newProps.is }) : ownerDocument.createElement(type);
							}
						}
						nextResource[internalInstanceKey] = workInProgress;
						nextResource[internalPropsKey] = newProps;
						a: for (ownerDocument = workInProgress.child; null !== ownerDocument;) {
							if (5 === ownerDocument.tag || 6 === ownerDocument.tag) nextResource.appendChild(ownerDocument.stateNode);
							else if (4 !== ownerDocument.tag && 27 !== ownerDocument.tag && null !== ownerDocument.child) {
								ownerDocument.child.return = ownerDocument;
								ownerDocument = ownerDocument.child;
								continue;
							}
							if (ownerDocument === workInProgress) break a;
							for (; null === ownerDocument.sibling;) {
								if (null === ownerDocument.return || ownerDocument.return === workInProgress) break a;
								ownerDocument = ownerDocument.return;
							}
							ownerDocument.sibling.return = ownerDocument.return;
							ownerDocument = ownerDocument.sibling;
						}
						workInProgress.stateNode = nextResource;
						a: switch (setInitialProperties(nextResource, type, newProps), type) {
							case "button":
							case "input":
							case "select":
							case "textarea":
								newProps = !!newProps.autoFocus;
								break a;
							case "img":
								newProps = !0;
								break a;
							default: newProps = !1;
						}
						newProps && markUpdate(workInProgress);
					}
				}
				bubbleProperties(workInProgress);
				workInProgress.subtreeFlags &= -33554433;
				preloadInstanceAndSuspendIfNeeded(workInProgress, workInProgress.type, null === current ? null : current.memoizedProps, workInProgress.pendingProps, renderLanes);
				return null;
			case 6:
				if (current && null != workInProgress.stateNode) current.memoizedProps !== newProps && markUpdate(workInProgress);
				else {
					if ("string" !== typeof newProps && null === workInProgress.stateNode) throw Error(formatProdErrorMessage(166));
					current = rootInstanceStackCursor.current;
					if (popHydrationState(workInProgress)) {
						current = workInProgress.stateNode;
						renderLanes = workInProgress.memoizedProps;
						newProps = null;
						type = hydrationParentFiber;
						if (null !== type) switch (type.tag) {
							case 27:
							case 5: newProps = type.memoizedProps;
						}
						current[internalInstanceKey] = workInProgress;
						current = current.nodeValue === renderLanes || null !== newProps && !0 === newProps.suppressHydrationWarning || checkForUnmatchedText(current.nodeValue, renderLanes) ? !0 : !1;
						current || throwOnHydrationMismatch(workInProgress, !0);
					} else current = getOwnerDocumentFromRootContainer(current).createTextNode(newProps), current[internalInstanceKey] = workInProgress, workInProgress.stateNode = current;
				}
				bubbleProperties(workInProgress);
				return null;
			case 31:
				renderLanes = workInProgress.memoizedState;
				if (null === current || null !== current.memoizedState) {
					newProps = popHydrationState(workInProgress);
					if (null !== renderLanes) {
						if (null === current) {
							if (!newProps) throw Error(formatProdErrorMessage(318));
							current = workInProgress.memoizedState;
							current = null !== current ? current.dehydrated : null;
							if (!current) throw Error(formatProdErrorMessage(557));
							current[internalInstanceKey] = workInProgress;
						} else resetHydrationState(), 0 === (workInProgress.flags & 128) && (workInProgress.memoizedState = null), workInProgress.flags |= 4;
						bubbleProperties(workInProgress);
						current = !1;
					} else renderLanes = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = renderLanes), current = !0;
					if (!current) {
						if (workInProgress.flags & 256) return popSuspenseHandler(workInProgress), workInProgress;
						popSuspenseHandler(workInProgress);
						return null;
					}
					if (0 !== (workInProgress.flags & 128)) throw Error(formatProdErrorMessage(558));
				}
				bubbleProperties(workInProgress);
				return null;
			case 13:
				newProps = workInProgress.memoizedState;
				if (null === current || null !== current.memoizedState && null !== current.memoizedState.dehydrated) {
					type = popHydrationState(workInProgress);
					if (null !== newProps && null !== newProps.dehydrated) {
						if (null === current) {
							if (!type) throw Error(formatProdErrorMessage(318));
							type = workInProgress.memoizedState;
							type = null !== type ? type.dehydrated : null;
							if (!type) throw Error(formatProdErrorMessage(317));
							type[internalInstanceKey] = workInProgress;
						} else resetHydrationState(), 0 === (workInProgress.flags & 128) && (workInProgress.memoizedState = null), workInProgress.flags |= 4;
						bubbleProperties(workInProgress);
						type = !1;
					} else type = upgradeHydrationErrorsToRecoverable(), null !== current && null !== current.memoizedState && (current.memoizedState.hydrationErrors = type), type = !0;
					if (!type) {
						if (workInProgress.flags & 256) return popSuspenseHandler(workInProgress), workInProgress;
						popSuspenseHandler(workInProgress);
						return null;
					}
				}
				popSuspenseHandler(workInProgress);
				if (0 !== (workInProgress.flags & 128)) return workInProgress.lanes = renderLanes, workInProgress;
				renderLanes = null !== newProps;
				current = null !== current && null !== current.memoizedState;
				renderLanes && (newProps = workInProgress.child, type = null, null !== newProps.alternate && null !== newProps.alternate.memoizedState && null !== newProps.alternate.memoizedState.cachePool && (type = newProps.alternate.memoizedState.cachePool.pool), nextResource = null, null !== newProps.memoizedState && null !== newProps.memoizedState.cachePool && (nextResource = newProps.memoizedState.cachePool.pool), nextResource !== type && (newProps.flags |= 2048));
				renderLanes !== current && renderLanes && (workInProgress.child.flags |= 8192);
				scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
				bubbleProperties(workInProgress);
				return null;
			case 4: return popHostContainer(), null === current && listenToAllSupportedEvents(workInProgress.stateNode.containerInfo), workInProgress.flags |= 67108864, bubbleProperties(workInProgress), null;
			case 10: return popProvider(workInProgress.type), bubbleProperties(workInProgress), null;
			case 19:
				popSuspenseListContext(workInProgress);
				newProps = workInProgress.memoizedState;
				if (null === newProps) return bubbleProperties(workInProgress), null;
				type = 0 !== (workInProgress.flags & 128);
				nextResource = newProps.rendering;
				if (null === nextResource) if (type) cutOffTailIfNeeded(newProps, !1);
				else {
					if (0 !== workInProgressRootExitStatus || null !== current && 0 !== (current.flags & 128)) for (current = workInProgress.child; null !== current;) {
						nextResource = findFirstSuspended(current);
						if (null !== nextResource) {
							workInProgress.flags |= 128;
							cutOffTailIfNeeded(newProps, !1);
							current = nextResource.updateQueue;
							workInProgress.updateQueue = current;
							scheduleRetryEffect(workInProgress, current);
							workInProgress.subtreeFlags = 0;
							current = renderLanes;
							for (renderLanes = workInProgress.child; null !== renderLanes;) resetWorkInProgress(renderLanes, current), renderLanes = renderLanes.sibling;
							pushSuspenseListContext(workInProgress, suspenseStackCursor.current & 1 | 2);
							isHydrating && pushTreeFork(workInProgress, newProps.treeForkCount);
							return workInProgress.child;
						}
						current = current.sibling;
					}
					null !== newProps.tail && now() > workInProgressRootRenderTargetTime && (workInProgress.flags |= 128, type = !0, cutOffTailIfNeeded(newProps, !1), workInProgress.lanes = 4194304);
				}
				else {
					if (!type) if (current = findFirstSuspended(nextResource), null !== current) {
						if (workInProgress.flags |= 128, type = !0, current = current.updateQueue, workInProgress.updateQueue = current, scheduleRetryEffect(workInProgress, current), cutOffTailIfNeeded(newProps, !0), null === newProps.tail && "collapsed" !== newProps.tailMode && "visible" !== newProps.tailMode && !nextResource.alternate && !isHydrating) return bubbleProperties(workInProgress), null;
					} else 2 * now() - newProps.renderingStartTime > workInProgressRootRenderTargetTime && 536870912 !== renderLanes && (workInProgress.flags |= 128, type = !0, cutOffTailIfNeeded(newProps, !1), workInProgress.lanes = 4194304);
					newProps.isBackwards ? (nextResource.sibling = workInProgress.child, workInProgress.child = nextResource) : (current = newProps.last, null !== current ? current.sibling = nextResource : workInProgress.child = nextResource, newProps.last = nextResource);
				}
				if (null !== newProps.tail) {
					current = newProps.tail;
					a: {
						for (renderLanes = current; null !== renderLanes;) {
							if (null !== renderLanes.alternate) {
								renderLanes = !1;
								break a;
							}
							renderLanes = renderLanes.sibling;
						}
						renderLanes = !0;
					}
					newProps.rendering = current;
					newProps.tail = current.sibling;
					newProps.renderingStartTime = now();
					current.sibling = null;
					nextResource = suspenseStackCursor.current;
					nextResource = type ? nextResource & 1 | 2 : nextResource & 1;
					"visible" === newProps.tailMode || "collapsed" === newProps.tailMode || !renderLanes || isHydrating ? pushSuspenseListContext(workInProgress, nextResource) : (renderLanes = nextResource, push(suspenseHandlerStackCursor, workInProgress), push(suspenseStackCursor, renderLanes), null === shellBoundary && (shellBoundary = workInProgress));
					isHydrating && pushTreeFork(workInProgress, newProps.treeForkCount);
					return current;
				}
				bubbleProperties(workInProgress);
				return null;
			case 22:
			case 23: return popSuspenseHandler(workInProgress), popHiddenContext(), newProps = null !== workInProgress.memoizedState, null !== current ? null !== current.memoizedState !== newProps && (workInProgress.flags |= 8192) : newProps && (workInProgress.flags |= 8192), newProps ? 0 !== (renderLanes & 536870912) && 0 === (workInProgress.flags & 128) && (bubbleProperties(workInProgress), workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192)) : bubbleProperties(workInProgress), renderLanes = workInProgress.updateQueue, null !== renderLanes && scheduleRetryEffect(workInProgress, renderLanes.retryQueue), renderLanes = null, null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (renderLanes = current.memoizedState.cachePool.pool), newProps = null, null !== workInProgress.memoizedState && null !== workInProgress.memoizedState.cachePool && (newProps = workInProgress.memoizedState.cachePool.pool), newProps !== renderLanes && (workInProgress.flags |= 2048), null !== current && pop(resumedCache), null;
			case 24: return renderLanes = null, null !== current && (renderLanes = current.memoizedState.cache), workInProgress.memoizedState.cache !== renderLanes && (workInProgress.flags |= 2048), popProvider(CacheContext), bubbleProperties(workInProgress), null;
			case 25: return null;
			case 30: return workInProgress.flags |= 33554432, bubbleProperties(workInProgress), null;
		}
		throw Error(formatProdErrorMessage(156, workInProgress.tag));
	}
	function unwindWork(current, workInProgress) {
		popTreeContext(workInProgress);
		switch (workInProgress.tag) {
			case 1: return current = workInProgress.flags, current & 65536 ? (workInProgress.flags = current & -65537 | 128, workInProgress) : null;
			case 3: return popProvider(CacheContext), popHostContainer(), current = workInProgress.flags, 0 !== (current & 65536) && 0 === (current & 128) ? (workInProgress.flags = current & -65537 | 128, workInProgress) : null;
			case 26:
			case 27:
			case 5: return popHostContext(workInProgress), null;
			case 31:
				if (null !== workInProgress.memoizedState) {
					popSuspenseHandler(workInProgress);
					if (null === workInProgress.alternate) throw Error(formatProdErrorMessage(340));
					resetHydrationState();
				}
				current = workInProgress.flags;
				return current & 65536 ? (workInProgress.flags = current & -65537 | 128, workInProgress) : null;
			case 13:
				popSuspenseHandler(workInProgress);
				current = workInProgress.memoizedState;
				if (null !== current && null !== current.dehydrated) {
					if (null === workInProgress.alternate) throw Error(formatProdErrorMessage(340));
					resetHydrationState();
				}
				current = workInProgress.flags;
				return current & 65536 ? (workInProgress.flags = current & -65537 | 128, workInProgress) : null;
			case 19: return popSuspenseListContext(workInProgress), current = workInProgress.flags, current & 65536 ? (workInProgress.flags = current & -65537 | 128, current = workInProgress.memoizedState, null !== current && (current.rendering = null, current.tail = null), workInProgress.flags |= 4, workInProgress) : null;
			case 4: return popHostContainer(), null;
			case 10: return popProvider(workInProgress.type), null;
			case 22:
			case 23: return popSuspenseHandler(workInProgress), popHiddenContext(), null !== current && pop(resumedCache), current = workInProgress.flags, current & 65536 ? (workInProgress.flags = current & -65537 | 128, workInProgress) : null;
			case 24: return popProvider(CacheContext), null;
			case 25: return null;
			default: return null;
		}
	}
	function unwindInterruptedWork(current, interruptedWork) {
		popTreeContext(interruptedWork);
		switch (interruptedWork.tag) {
			case 3:
				popProvider(CacheContext);
				popHostContainer();
				break;
			case 26:
			case 27:
			case 5:
				popHostContext(interruptedWork);
				break;
			case 4:
				popHostContainer();
				break;
			case 31:
				null !== interruptedWork.memoizedState && popSuspenseHandler(interruptedWork);
				break;
			case 13:
				popSuspenseHandler(interruptedWork);
				break;
			case 19:
				popSuspenseListContext(interruptedWork);
				break;
			case 10:
				popProvider(interruptedWork.type);
				break;
			case 22:
			case 23:
				popSuspenseHandler(interruptedWork);
				popHiddenContext();
				null !== current && pop(resumedCache);
				break;
			case 24: popProvider(CacheContext);
		}
	}
	function commitHookEffectListMount(flags, finishedWork) {
		try {
			var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
			if (null !== lastEffect) {
				var firstEffect = lastEffect.next;
				updateQueue = firstEffect;
				do {
					if ((updateQueue.tag & flags) === flags) {
						lastEffect = void 0;
						var create = updateQueue.create, inst = updateQueue.inst;
						lastEffect = create();
						inst.destroy = lastEffect;
					}
					updateQueue = updateQueue.next;
				} while (updateQueue !== firstEffect);
			}
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor$jscomp$0) {
		try {
			var updateQueue = finishedWork.updateQueue, lastEffect = null !== updateQueue ? updateQueue.lastEffect : null;
			if (null !== lastEffect) {
				var firstEffect = lastEffect.next;
				updateQueue = firstEffect;
				do {
					if ((updateQueue.tag & flags) === flags) {
						var inst = updateQueue.inst, destroy = inst.destroy;
						if (void 0 !== destroy) {
							inst.destroy = void 0;
							lastEffect = finishedWork;
							var nearestMountedAncestor = nearestMountedAncestor$jscomp$0, destroy_ = destroy;
							try {
								destroy_();
							} catch (error) {
								captureCommitPhaseError(lastEffect, nearestMountedAncestor, error);
							}
						}
					}
					updateQueue = updateQueue.next;
				} while (updateQueue !== firstEffect);
			}
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	function commitClassCallbacks(finishedWork) {
		var updateQueue = finishedWork.updateQueue;
		if (null !== updateQueue) {
			var instance = finishedWork.stateNode;
			try {
				commitCallbacks(updateQueue, instance);
			} catch (error) {
				captureCommitPhaseError(finishedWork, finishedWork.return, error);
			}
		}
	}
	function safelyCallComponentWillUnmount(current, nearestMountedAncestor, instance) {
		instance.props = resolveClassComponentProps(current.type, current.memoizedProps);
		instance.state = current.memoizedState;
		try {
			instance.componentWillUnmount();
		} catch (error) {
			captureCommitPhaseError(current, nearestMountedAncestor, error);
		}
	}
	function safelyAttachRef(current, nearestMountedAncestor) {
		try {
			var ref = current.ref;
			if (null !== ref) {
				switch (current.tag) {
					case 26:
					case 27:
					case 5:
						var instanceToUse = current.stateNode;
						break;
					case 30:
						var instance = current.stateNode, name = getViewTransitionName(current.memoizedProps, instance);
						if (null === instance.ref || instance.ref.name !== name) instance.ref = createViewTransitionInstance(name);
						instanceToUse = instance.ref;
						break;
					case 7:
						if (null === current.stateNode) {
							var fragmentInstance = new FragmentInstance(current);
							traverseVisibleInstancesAndTextInstances(current.child, !1, addFragmentHandleToFiber, fragmentInstance, void 0, void 0);
							current.stateNode = fragmentInstance;
						}
						instanceToUse = current.stateNode;
						break;
					default: instanceToUse = current.stateNode;
				}
				"function" === typeof ref ? current.refCleanup = ref(instanceToUse) : ref.current = instanceToUse;
			}
		} catch (error) {
			captureCommitPhaseError(current, nearestMountedAncestor, error);
		}
	}
	function safelyDetachRef(current, nearestMountedAncestor) {
		var ref = current.ref, refCleanup = current.refCleanup;
		if (null !== ref) if ("function" === typeof refCleanup) try {
			refCleanup();
		} catch (error) {
			captureCommitPhaseError(current, nearestMountedAncestor, error);
		} finally {
			current.refCleanup = null, current = current.alternate, null != current && (current.refCleanup = null);
		}
		else if ("function" === typeof ref) try {
			ref(null);
		} catch (error$148) {
			captureCommitPhaseError(current, nearestMountedAncestor, error$148);
		}
		else ref.current = null;
	}
	function commitNewChildToFragmentInstances(fiber, parentFragmentInstances) {
		if ((5 === fiber.tag || 27 === fiber.tag || 6 === fiber.tag) && null === fiber.alternate && null !== parentFragmentInstances) for (var i = 0; i < parentFragmentInstances.length; i++) commitNewChildToFragmentInstance(fiber.stateNode, parentFragmentInstances[i]);
	}
	function commitFragmentInstanceInsertionEffects(fiber) {
		for (var parent = fiber.return; null !== parent;) {
			isFragmentInstanceParent(parent) && commitNewChildToFragmentInstance(fiber.stateNode, parent.stateNode);
			if (isFragmentInstanceHostBoundary(parent)) break;
			parent = parent.return;
		}
	}
	function commitFragmentInstanceDeletionEffects(fiber) {
		for (var parent = fiber.return; null !== parent;) {
			isFragmentInstanceParent(parent) && deleteChildFromFragmentInstance(fiber.stateNode, parent.stateNode);
			if (isFragmentInstanceHostBoundary(parent)) break;
			parent = parent.return;
		}
	}
	function isFragmentInstanceHostBoundary(fiber) {
		return 5 === fiber.tag || 3 === fiber.tag || 27 === fiber.tag;
	}
	function isFragmentInstanceParent(fiber) {
		return fiber && 7 === fiber.tag && null !== fiber.stateNode;
	}
	function commitHostMount(finishedWork) {
		var type = finishedWork.type, props = finishedWork.memoizedProps, instance = finishedWork.stateNode;
		try {
			a: switch (type) {
				case "button":
				case "input":
				case "select":
				case "textarea":
					props.autoFocus && instance.focus();
					break a;
				case "img": props.src ? instance.src = props.src : props.srcSet && (instance.srcset = props.srcSet);
			}
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	function commitHostUpdate(finishedWork, newProps, oldProps) {
		try {
			var domElement = finishedWork.stateNode;
			updateProperties(domElement, finishedWork.type, oldProps, newProps);
			domElement[internalPropsKey] = newProps;
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	function isHostParent(fiber) {
		return 5 === fiber.tag || 3 === fiber.tag || 26 === fiber.tag || 27 === fiber.tag && isSingletonScope(fiber.type) || 4 === fiber.tag;
	}
	function getHostSibling(fiber) {
		a: for (;;) {
			for (; null === fiber.sibling;) {
				if (null === fiber.return || isHostParent(fiber.return)) return null;
				fiber = fiber.return;
			}
			fiber.sibling.return = fiber.return;
			for (fiber = fiber.sibling; 5 !== fiber.tag && 6 !== fiber.tag && 18 !== fiber.tag;) {
				if (27 === fiber.tag && isSingletonScope(fiber.type)) continue a;
				if (fiber.flags & 2) continue a;
				if (null === fiber.child || 4 === fiber.tag) continue a;
				else fiber.child.return = fiber, fiber = fiber.child;
			}
			if (!(fiber.flags & 2)) return fiber.stateNode;
		}
	}
	function insertOrAppendPlacementNodeIntoContainer(node, before, parent, parentFragmentInstances) {
		var tag = node.tag;
		if (5 === tag || 6 === tag) tag = node.stateNode, before ? (9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent).insertBefore(tag, before) : (before = 9 === parent.nodeType ? parent.body : "HTML" === parent.nodeName ? parent.ownerDocument.body : parent, before.appendChild(tag), parent = parent._reactRootContainer, null !== parent && void 0 !== parent || null !== before.onclick || (before.onclick = noop$1)), commitNewChildToFragmentInstances(node, parentFragmentInstances), viewTransitionMutationContext = !0;
		else if (4 !== tag && (27 === tag && (commitNewChildToFragmentInstances(node, parentFragmentInstances), parentFragmentInstances = null, isSingletonScope(node.type) && (parent = node.stateNode, before = null)), node = node.child, null !== node)) for (insertOrAppendPlacementNodeIntoContainer(node, before, parent, parentFragmentInstances), node = node.sibling; null !== node;) insertOrAppendPlacementNodeIntoContainer(node, before, parent, parentFragmentInstances), node = node.sibling;
	}
	function insertOrAppendPlacementNode(node, before, parent, parentFragmentInstances) {
		var tag = node.tag;
		if (5 === tag || 6 === tag) tag = node.stateNode, before ? parent.insertBefore(tag, before) : parent.appendChild(tag), commitNewChildToFragmentInstances(node, parentFragmentInstances), viewTransitionMutationContext = !0;
		else if (4 !== tag && (27 === tag && (commitNewChildToFragmentInstances(node, parentFragmentInstances), parentFragmentInstances = null, isSingletonScope(node.type) && (parent = node.stateNode)), node = node.child, null !== node)) for (insertOrAppendPlacementNode(node, before, parent, parentFragmentInstances), node = node.sibling; null !== node;) insertOrAppendPlacementNode(node, before, parent, parentFragmentInstances), node = node.sibling;
	}
	function commitHostSingletonAcquisition(finishedWork) {
		var singleton = finishedWork.stateNode, props = finishedWork.memoizedProps;
		try {
			for (var type = finishedWork.type, attributes = singleton.attributes; attributes.length;) singleton.removeAttributeNode(attributes[0]);
			setInitialProperties(singleton, type, props);
			singleton[internalInstanceKey] = finishedWork;
			singleton[internalPropsKey] = props;
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	var shouldStartViewTransition = !1;
	var appearingViewTransitions = null;
	function trackEnterViewTransitions(placement) {
		if (30 === placement.tag || 0 !== (placement.subtreeFlags & 33554432)) shouldStartViewTransition = !0;
	}
	var viewTransitionCancelableChildren = null;
	function pushViewTransitionCancelableScope() {
		var prevChildren = viewTransitionCancelableChildren;
		viewTransitionCancelableChildren = null;
		return prevChildren;
	}
	var viewTransitionHostInstanceIdx = 0;
	function applyViewTransitionToHostInstances(fiber, name, className, collectMeasurements, stopAtNestedViewTransitions) {
		viewTransitionHostInstanceIdx = 0;
		return applyViewTransitionToHostInstancesRecursive(fiber.child, name, className, collectMeasurements, stopAtNestedViewTransitions);
	}
	function applyViewTransitionToHostInstancesRecursive(child, name, className, collectMeasurements, stopAtNestedViewTransitions) {
		for (var inViewport = !1; null !== child;) {
			if (5 === child.tag) {
				var instance = child.stateNode;
				if (null !== collectMeasurements) {
					var measurement = measureInstance(instance);
					collectMeasurements.push(measurement);
					measurement.view && (inViewport = !0);
				} else inViewport || measureInstance(instance).view && (inViewport = !0);
				shouldStartViewTransition = !0;
				applyViewTransitionName(instance, 0 === viewTransitionHostInstanceIdx ? name : name + "_" + viewTransitionHostInstanceIdx, className);
				viewTransitionHostInstanceIdx++;
			} else if (22 !== child.tag || null === child.memoizedState) 30 === child.tag && stopAtNestedViewTransitions || applyViewTransitionToHostInstancesRecursive(child.child, name, className, collectMeasurements, stopAtNestedViewTransitions) && (inViewport = !0);
			child = child.sibling;
		}
		return inViewport;
	}
	function restoreViewTransitionOnHostInstances(child, stopAtNestedViewTransitions) {
		for (; null !== child;) {
			if (5 === child.tag) restoreViewTransitionName(child.stateNode, child.memoizedProps);
			else if (22 !== child.tag || null === child.memoizedState) 30 === child.tag && stopAtNestedViewTransitions || restoreViewTransitionOnHostInstances(child.child, stopAtNestedViewTransitions);
			child = child.sibling;
		}
	}
	function commitAppearingPairViewTransitions(placement) {
		if (0 !== (placement.subtreeFlags & 18874368)) for (placement = placement.child; null !== placement;) {
			if (22 !== placement.tag || null === placement.memoizedState) {
				if (commitAppearingPairViewTransitions(placement), 30 === placement.tag && 0 !== (placement.flags & 18874368) && placement.stateNode.paired) {
					var props = placement.memoizedProps;
					if (null == props.name || "auto" === props.name) throw Error(formatProdErrorMessage(544));
					var name = props.name;
					props = getViewTransitionClassName(props.default, props.share);
					"none" !== props && (applyViewTransitionToHostInstances(placement, name, props, null, !1) || restoreViewTransitionOnHostInstances(placement.child, !1));
				}
			}
			placement = placement.sibling;
		}
	}
	function commitEnterViewTransitions(placement, gesture) {
		if (30 === placement.tag) {
			var state = placement.stateNode, props = placement.memoizedProps, name = getViewTransitionName(props, state), className = getViewTransitionClassName(props.default, state.paired ? props.share : props.enter);
			"none" !== className ? applyViewTransitionToHostInstances(placement, name, className, null, !1) ? (commitAppearingPairViewTransitions(placement), state.paired || gesture || scheduleViewTransitionEvent(placement, props.onEnter)) : restoreViewTransitionOnHostInstances(placement.child, !1) : commitAppearingPairViewTransitions(placement);
		} else if (0 !== (placement.subtreeFlags & 33554432)) for (placement = placement.child; null !== placement;) commitEnterViewTransitions(placement, gesture), placement = placement.sibling;
		else commitAppearingPairViewTransitions(placement);
	}
	function commitDeletedPairViewTransitions(deletion) {
		if (null !== appearingViewTransitions && 0 !== appearingViewTransitions.size) {
			var pairs = appearingViewTransitions;
			if (0 !== (deletion.subtreeFlags & 18874368)) for (deletion = deletion.child; null !== deletion;) {
				if (22 !== deletion.tag || null === deletion.memoizedState) {
					if (30 === deletion.tag && 0 !== (deletion.flags & 18874368)) {
						var props = deletion.memoizedProps, name = props.name;
						if (null != name && "auto" !== name) {
							var pair = pairs.get(name);
							if (void 0 !== pair) {
								var className = getViewTransitionClassName(props.default, props.share);
								"none" !== className && (applyViewTransitionToHostInstances(deletion, name, className, null, !1) ? (className = deletion.stateNode, pair.paired = className, className.paired = pair, scheduleViewTransitionEvent(deletion, props.onShare)) : restoreViewTransitionOnHostInstances(deletion.child, !1));
								pairs.delete(name);
								if (0 === pairs.size) break;
							}
						}
					}
					commitDeletedPairViewTransitions(deletion);
				}
				deletion = deletion.sibling;
			}
		}
	}
	function commitExitViewTransitions(deletion) {
		if (30 === deletion.tag) {
			var props = deletion.memoizedProps, name = getViewTransitionName(props, deletion.stateNode), pair = null !== appearingViewTransitions ? appearingViewTransitions.get(name) : void 0, className = getViewTransitionClassName(props.default, void 0 !== pair ? props.share : props.exit);
			"none" !== className && (applyViewTransitionToHostInstances(deletion, name, className, null, !1) ? void 0 !== pair ? (className = deletion.stateNode, pair.paired = className, className.paired = pair, appearingViewTransitions.delete(name), scheduleViewTransitionEvent(deletion, props.onShare)) : scheduleViewTransitionEvent(deletion, props.onExit) : restoreViewTransitionOnHostInstances(deletion.child, !1));
			null !== appearingViewTransitions && commitDeletedPairViewTransitions(deletion);
		} else if (0 !== (deletion.subtreeFlags & 33554432)) for (deletion = deletion.child; null !== deletion;) commitExitViewTransitions(deletion), deletion = deletion.sibling;
		else null !== appearingViewTransitions && commitDeletedPairViewTransitions(deletion);
	}
	function commitNestedViewTransitions(changedParent) {
		for (changedParent = changedParent.child; null !== changedParent;) {
			if (30 === changedParent.tag) {
				var props = changedParent.memoizedProps, name = getViewTransitionName(props, changedParent.stateNode);
				props = getViewTransitionClassName(props.default, props.update);
				changedParent.flags &= -5;
				"none" !== props && applyViewTransitionToHostInstances(changedParent, name, props, changedParent.memoizedState = [], !1);
			} else 0 !== (changedParent.subtreeFlags & 33554432) && commitNestedViewTransitions(changedParent);
			changedParent = changedParent.sibling;
		}
	}
	function restorePairedViewTransitions(parent) {
		if (0 !== (parent.subtreeFlags & 18874368)) for (parent = parent.child; null !== parent;) {
			if (22 !== parent.tag || null === parent.memoizedState) {
				if (30 === parent.tag && 0 !== (parent.flags & 18874368)) {
					var instance = parent.stateNode;
					null !== instance.paired && (instance.paired = null, restoreViewTransitionOnHostInstances(parent.child, !1));
				}
				restorePairedViewTransitions(parent);
			}
			parent = parent.sibling;
		}
	}
	function restoreEnterOrExitViewTransitions(fiber) {
		if (30 === fiber.tag) fiber.stateNode.paired = null, restoreViewTransitionOnHostInstances(fiber.child, !1), restorePairedViewTransitions(fiber);
		else if (0 !== (fiber.subtreeFlags & 33554432)) for (fiber = fiber.child; null !== fiber;) restoreEnterOrExitViewTransitions(fiber), fiber = fiber.sibling;
		else restorePairedViewTransitions(fiber);
	}
	function restoreNestedViewTransitions(changedParent) {
		for (changedParent = changedParent.child; null !== changedParent;) 30 === changedParent.tag ? restoreViewTransitionOnHostInstances(changedParent.child, !1) : 0 !== (changedParent.subtreeFlags & 33554432) && restoreNestedViewTransitions(changedParent), changedParent = changedParent.sibling;
	}
	function measureViewTransitionHostInstancesRecursive(parentViewTransition, child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions) {
		for (var inViewport = !1; null !== child;) {
			if (5 === child.tag) {
				var instance = child.stateNode;
				if (null !== previousMeasurements && viewTransitionHostInstanceIdx < previousMeasurements.length) {
					var previousMeasurement = previousMeasurements[viewTransitionHostInstanceIdx], nextMeasurement = measureInstance(instance);
					if (previousMeasurement.view || nextMeasurement.view) inViewport = !0;
					var JSCompiler_temp;
					if (JSCompiler_temp = 0 === (parentViewTransition.flags & 4)) if (nextMeasurement.clip) JSCompiler_temp = !0;
					else {
						JSCompiler_temp = previousMeasurement.rect;
						var newRect = nextMeasurement.rect;
						JSCompiler_temp = JSCompiler_temp.y !== newRect.y || JSCompiler_temp.x !== newRect.x || JSCompiler_temp.height !== newRect.height || JSCompiler_temp.width !== newRect.width;
					}
					JSCompiler_temp && (parentViewTransition.flags |= 4);
					nextMeasurement.abs ? nextMeasurement = !previousMeasurement.abs : (previousMeasurement = previousMeasurement.rect, nextMeasurement = nextMeasurement.rect, nextMeasurement = previousMeasurement.height !== nextMeasurement.height || previousMeasurement.width !== nextMeasurement.width);
					nextMeasurement && (parentViewTransition.flags |= 32);
				} else parentViewTransition.flags |= 32;
				0 !== (parentViewTransition.flags & 4) && applyViewTransitionName(instance, 0 === viewTransitionHostInstanceIdx ? newName : newName + "_" + viewTransitionHostInstanceIdx, className);
				inViewport && 0 !== (parentViewTransition.flags & 4) || (null === viewTransitionCancelableChildren && (viewTransitionCancelableChildren = []), viewTransitionCancelableChildren.push(instance, 0 === viewTransitionHostInstanceIdx ? oldName : oldName + "_" + viewTransitionHostInstanceIdx, child.memoizedProps));
				viewTransitionHostInstanceIdx++;
			} else if (22 !== child.tag || null === child.memoizedState) 30 === child.tag && stopAtNestedViewTransitions ? parentViewTransition.flags |= child.flags & 32 : measureViewTransitionHostInstancesRecursive(parentViewTransition, child.child, newName, oldName, className, previousMeasurements, stopAtNestedViewTransitions) && (inViewport = !0);
			child = child.sibling;
		}
		return inViewport;
	}
	function measureNestedViewTransitions(changedParent, gesture) {
		for (changedParent = changedParent.child; null !== changedParent;) {
			if (30 === changedParent.tag) {
				var props = changedParent.memoizedProps, state = changedParent.stateNode, name = getViewTransitionName(props, state), className = getViewTransitionClassName(props.default, props.update);
				if (gesture) {
					state = state.clones;
					var previousMeasurements = null === state ? null : state.map(measureClonedInstance);
				} else previousMeasurements = changedParent.memoizedState, changedParent.memoizedState = null;
				state = changedParent;
				var child = changedParent.child;
				viewTransitionHostInstanceIdx = 0;
				name = measureViewTransitionHostInstancesRecursive(state, child, name, name, className, previousMeasurements, !1);
				0 !== (changedParent.flags & 4) && name && (gesture || scheduleViewTransitionEvent(changedParent, props.onUpdate));
			} else 0 !== (changedParent.subtreeFlags & 33554432) && measureNestedViewTransitions(changedParent, gesture);
			changedParent = changedParent.sibling;
		}
	}
	var offscreenSubtreeIsHidden = !1;
	var offscreenSubtreeWasHidden = !1;
	var offscreenDirectParentIsHidden = !1;
	var needsFormReset = !1;
	var PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set;
	var nextEffect = null;
	var viewTransitionContextChanged = !1;
	var inUpdateViewTransition = !1;
	var rootViewTransitionAffected = !1;
	var rootViewTransitionNameCanceled = !1;
	function commitBeforeMutationEffects(root, firstChild, committedLanes) {
		root = root.containerInfo;
		eventsEnabled = _enabled;
		root = getActiveElementDeep(root);
		if (hasSelectionCapabilities(root)) {
			if ("selectionStart" in root) var JSCompiler_temp = {
				start: root.selectionStart,
				end: root.selectionEnd
			};
			else a: {
				JSCompiler_temp = (JSCompiler_temp = root.ownerDocument) && JSCompiler_temp.defaultView || window;
				var selection = JSCompiler_temp.getSelection && JSCompiler_temp.getSelection();
				if (selection && 0 !== selection.rangeCount) {
					JSCompiler_temp = selection.anchorNode;
					var anchorOffset = selection.anchorOffset, focusNode = selection.focusNode;
					selection = selection.focusOffset;
					try {
						JSCompiler_temp.nodeType, focusNode.nodeType;
					} catch (e$21) {
						JSCompiler_temp = null;
						break a;
					}
					var length = 0, start = -1, end = -1, indexWithinAnchor = 0, indexWithinFocus = 0, node = root, parentNode = null;
					b: for (;;) {
						for (var next;;) {
							node !== JSCompiler_temp || 0 !== anchorOffset && 3 !== node.nodeType || (start = length + anchorOffset);
							node !== focusNode || 0 !== selection && 3 !== node.nodeType || (end = length + selection);
							3 === node.nodeType && (length += node.nodeValue.length);
							if (null === (next = node.firstChild)) break;
							parentNode = node;
							node = next;
						}
						for (;;) {
							if (node === root) break b;
							parentNode === JSCompiler_temp && ++indexWithinAnchor === anchorOffset && (start = length);
							parentNode === focusNode && ++indexWithinFocus === selection && (end = length);
							if (null !== (next = node.nextSibling)) break;
							node = parentNode;
							parentNode = node.parentNode;
						}
						node = next;
					}
					JSCompiler_temp = -1 === start || -1 === end ? null : {
						start,
						end
					};
				} else JSCompiler_temp = null;
			}
			JSCompiler_temp = JSCompiler_temp || {
				start: 0,
				end: 0
			};
		} else JSCompiler_temp = null;
		selectionInformation = {
			focusedElem: root,
			selectionRange: JSCompiler_temp
		};
		_enabled = !1;
		committedLanes = (committedLanes & 335544064) === committedLanes;
		nextEffect = firstChild;
		for (firstChild = committedLanes ? 9270 : 1024; null !== nextEffect;) {
			root = nextEffect;
			if (committedLanes && (JSCompiler_temp = root.deletions, null !== JSCompiler_temp)) for (anchorOffset = 0; anchorOffset < JSCompiler_temp.length; anchorOffset++) committedLanes && commitExitViewTransitions(JSCompiler_temp[anchorOffset]);
			if (null === root.alternate && 0 !== (root.flags & 2)) committedLanes && trackEnterViewTransitions(root), commitBeforeMutationEffects_complete(committedLanes);
			else {
				if (22 === root.tag) {
					if (JSCompiler_temp = root.alternate, null !== root.memoizedState) {
						null !== JSCompiler_temp && null === JSCompiler_temp.memoizedState && committedLanes && commitExitViewTransitions(JSCompiler_temp);
						commitBeforeMutationEffects_complete(committedLanes);
						continue;
					} else if (null !== JSCompiler_temp && null !== JSCompiler_temp.memoizedState) {
						committedLanes && trackEnterViewTransitions(root);
						commitBeforeMutationEffects_complete(committedLanes);
						continue;
					}
				}
				JSCompiler_temp = root.child;
				0 !== (root.subtreeFlags & firstChild) && null !== JSCompiler_temp ? (JSCompiler_temp.return = root, nextEffect = JSCompiler_temp) : (committedLanes && commitNestedViewTransitions(root), commitBeforeMutationEffects_complete(committedLanes));
			}
		}
		appearingViewTransitions = null;
	}
	function commitBeforeMutationEffects_complete(isViewTransitionEligible$jscomp$0) {
		for (; null !== nextEffect;) {
			var fiber = nextEffect, isViewTransitionEligible = isViewTransitionEligible$jscomp$0, current = fiber.alternate, flags = fiber.flags;
			switch (fiber.tag) {
				case 0:
				case 11:
				case 15: break;
				case 1:
					if (0 !== (flags & 1024) && null !== current) {
						isViewTransitionEligible = void 0;
						flags = current.memoizedProps;
						current = current.memoizedState;
						var instance = fiber.stateNode;
						try {
							var resolvedPrevProps = resolveClassComponentProps(fiber.type, flags);
							isViewTransitionEligible = instance.getSnapshotBeforeUpdate(resolvedPrevProps, current);
							instance.__reactInternalSnapshotBeforeUpdate = isViewTransitionEligible;
						} catch (error) {
							captureCommitPhaseError(fiber, fiber.return, error);
						}
					}
					break;
				case 3:
					if (0 !== (flags & 1024)) {
						if (current = fiber.stateNode.containerInfo, isViewTransitionEligible = current.nodeType, 9 === isViewTransitionEligible) clearContainerSparingly(current);
						else if (1 === isViewTransitionEligible) switch (current.nodeName) {
							case "HEAD":
							case "HTML":
							case "BODY":
								clearContainerSparingly(current);
								break;
							default: current.textContent = "";
						}
					}
					break;
				case 5:
				case 26:
				case 27:
				case 6:
				case 4:
				case 17: break;
				case 30:
					isViewTransitionEligible && null !== current && (isViewTransitionEligible = getViewTransitionName(current.memoizedProps, current.stateNode), flags = fiber.memoizedProps, flags = getViewTransitionClassName(flags.default, flags.update), "none" !== flags && applyViewTransitionToHostInstances(current, isViewTransitionEligible, flags, current.memoizedState = [], !0));
					break;
				default: if (0 !== (flags & 1024)) throw Error(formatProdErrorMessage(163));
			}
			current = fiber.sibling;
			if (null !== current) {
				current.return = fiber.return;
				nextEffect = current;
				break;
			}
			nextEffect = fiber.return;
		}
	}
	function commitLayoutEffectOnFiber(finishedRoot, current, finishedWork) {
		var flags = finishedWork.flags;
		switch (finishedWork.tag) {
			case 0:
			case 11:
			case 15:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				flags & 4 && commitHookEffectListMount(5, finishedWork);
				break;
			case 1:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				if (flags & 4) if (finishedRoot = finishedWork.stateNode, null === current) try {
					finishedRoot.componentDidMount();
				} catch (error) {
					captureCommitPhaseError(finishedWork, finishedWork.return, error);
				}
				else {
					var prevProps = resolveClassComponentProps(finishedWork.type, current.memoizedProps);
					current = current.memoizedState;
					try {
						finishedRoot.componentDidUpdate(prevProps, current, finishedRoot.__reactInternalSnapshotBeforeUpdate);
					} catch (error$146) {
						captureCommitPhaseError(finishedWork, finishedWork.return, error$146);
					}
				}
				flags & 64 && commitClassCallbacks(finishedWork);
				flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
				break;
			case 3:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				if (flags & 64 && (finishedRoot = finishedWork.updateQueue, null !== finishedRoot)) {
					current = null;
					if (null !== finishedWork.child) switch (finishedWork.child.tag) {
						case 27:
						case 5:
							current = finishedWork.child.stateNode;
							break;
						case 1: current = finishedWork.child.stateNode;
					}
					try {
						commitCallbacks(finishedRoot, current);
					} catch (error) {
						captureCommitPhaseError(finishedWork, finishedWork.return, error);
					}
				}
				break;
			case 27: null === current && flags & 4 && commitHostSingletonAcquisition(finishedWork);
			case 26:
			case 5:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				null === current && flags & 4 && commitHostMount(finishedWork);
				flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
				break;
			case 12:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				break;
			case 31:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
				break;
			case 13:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
				flags & 64 && (finishedRoot = finishedWork.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot && (finishedWork = retryDehydratedSuspenseBoundary.bind(null, finishedWork), registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
				break;
			case 22:
				flags = null !== finishedWork.memoizedState || offscreenSubtreeIsHidden;
				if (!flags) {
					var newOffscreenSubtreeWasHidden = null !== current && null !== current.memoizedState || offscreenSubtreeWasHidden;
					current = offscreenSubtreeIsHidden;
					prevProps = offscreenSubtreeWasHidden;
					offscreenSubtreeIsHidden = flags;
					(offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden) && !prevProps ? (flags = 2, 0 !== (finishedWork.subtreeFlags & 8772) && (flags |= 1), recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, flags)) : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
					offscreenSubtreeIsHidden = current;
					offscreenSubtreeWasHidden = prevProps;
				}
				break;
			case 30:
				recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
				flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
				break;
			case 7: flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
			default: recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
		}
	}
	function hideOrUnhideAllChildren(parentFiber, isHidden) {
		for (parentFiber = parentFiber.child; null !== parentFiber;) hideOrUnhideAllChildrenOnFiber(parentFiber, isHidden), parentFiber = parentFiber.sibling;
	}
	function hideOrUnhideAllChildrenOnFiber(fiber, isHidden) {
		switch (fiber.tag) {
			case 5:
			case 26:
				try {
					var instance = fiber.stateNode;
					if (isHidden) {
						var style = instance.style;
						"function" === typeof style.setProperty ? style.setProperty("display", "none", "important") : style.display = "none";
					} else {
						var instance$jscomp$0 = fiber.stateNode, styleProp = fiber.memoizedProps.style, display = void 0 !== styleProp && null !== styleProp && styleProp.hasOwnProperty("display") ? styleProp.display : null;
						instance$jscomp$0.style.display = null == display || "boolean" === typeof display ? "" : ("" + display).trim();
					}
				} catch (error) {
					captureCommitPhaseError(fiber, fiber.return, error);
				}
				hideOrUnhideNearestPortals(fiber, isHidden);
				break;
			case 6:
				try {
					fiber.stateNode.nodeValue = isHidden ? "" : fiber.memoizedProps, viewTransitionMutationContext = !0;
				} catch (error) {
					captureCommitPhaseError(fiber, fiber.return, error);
				}
				break;
			case 18:
				try {
					var instance$jscomp$1 = fiber.stateNode;
					isHidden ? hideOrUnhideDehydratedBoundary(instance$jscomp$1, !0) : hideOrUnhideDehydratedBoundary(fiber.stateNode, !1);
				} catch (error) {
					captureCommitPhaseError(fiber, fiber.return, error);
				}
				break;
			case 22:
			case 23:
				null === fiber.memoizedState && hideOrUnhideAllChildren(fiber, isHidden);
				break;
			default: hideOrUnhideAllChildren(fiber, isHidden);
		}
	}
	function hideOrUnhideNearestPortals(parentFiber, isHidden$jscomp$0) {
		if (parentFiber.subtreeFlags & 67108864) for (parentFiber = parentFiber.child; null !== parentFiber;) {
			a: {
				var fiber = parentFiber, isHidden = isHidden$jscomp$0;
				switch (fiber.tag) {
					case 4:
						hideOrUnhideAllChildrenOnFiber(fiber, isHidden);
						break a;
					case 22:
						null === fiber.memoizedState && hideOrUnhideNearestPortals(fiber, isHidden);
						break a;
					default: hideOrUnhideNearestPortals(fiber, isHidden);
				}
			}
			parentFiber = parentFiber.sibling;
		}
	}
	function detachFiberAfterEffects(fiber) {
		var alternate = fiber.alternate;
		null !== alternate && (fiber.alternate = null, detachFiberAfterEffects(alternate));
		fiber.child = null;
		fiber.deletions = null;
		fiber.sibling = null;
		5 === fiber.tag && (alternate = fiber.stateNode, null !== alternate && detachDeletedInstance(alternate));
		fiber.stateNode = null;
		fiber.return = null;
		fiber.dependencies = null;
		fiber.memoizedProps = null;
		fiber.memoizedState = null;
		fiber.pendingProps = null;
		fiber.stateNode = null;
		fiber.updateQueue = null;
	}
	var hostParent = null;
	var hostParentIsContainer = !1;
	function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
		for (parent = parent.child; null !== parent;) commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent), parent = parent.sibling;
	}
	function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
		if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount) try {
			injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
		} catch (err) {}
		switch (deletedFiber.tag) {
			case 26:
				offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				deletedFiber.memoizedState ? deletedFiber.memoizedState.count-- : deletedFiber.stateNode && !offscreenSubtreeWasHidden && (deletedFiber = deletedFiber.stateNode, deletedFiber.parentNode.removeChild(deletedFiber));
				break;
			case 27:
				offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
				commitFragmentInstanceDeletionEffects(deletedFiber);
				var prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer;
				isSingletonScope(deletedFiber.type) && (hostParent = deletedFiber.stateNode, hostParentIsContainer = !1);
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				releaseSingletonInstance(deletedFiber.stateNode, deletedFiber.type, deletedFiber.memoizedProps);
				hostParent = prevHostParent;
				hostParentIsContainer = prevHostParentIsContainer;
				break;
			case 5: offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor), commitFragmentInstanceDeletionEffects(deletedFiber);
			case 6:
				6 === deletedFiber.tag && commitFragmentInstanceDeletionEffects(deletedFiber);
				prevHostParent = hostParent;
				prevHostParentIsContainer = hostParentIsContainer;
				hostParent = null;
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				hostParent = prevHostParent;
				hostParentIsContainer = prevHostParentIsContainer;
				if (null !== hostParent) if (hostParentIsContainer) try {
					(9 === hostParent.nodeType ? hostParent.body : "HTML" === hostParent.nodeName ? hostParent.ownerDocument.body : hostParent).removeChild(deletedFiber.stateNode), viewTransitionMutationContext = !0;
				} catch (error) {
					captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
				}
				else try {
					hostParent.removeChild(deletedFiber.stateNode), viewTransitionMutationContext = !0;
				} catch (error) {
					captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
				}
				break;
			case 18:
				null !== hostParent && (hostParentIsContainer ? (finishedRoot = hostParent, clearHydrationBoundary(9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot, deletedFiber.stateNode), retryIfBlockedOn(finishedRoot)) : clearHydrationBoundary(hostParent, deletedFiber.stateNode));
				break;
			case 4:
				prevHostParent = hostParent;
				prevHostParentIsContainer = hostParentIsContainer;
				hostParent = deletedFiber.stateNode.containerInfo;
				hostParentIsContainer = !0;
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				hostParent = prevHostParent;
				hostParentIsContainer = prevHostParentIsContainer;
				break;
			case 0:
			case 11:
			case 14:
			case 15:
				commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
				offscreenSubtreeWasHidden || commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				break;
			case 1:
				offscreenSubtreeWasHidden || (safelyDetachRef(deletedFiber, nearestMountedAncestor), prevHostParent = deletedFiber.stateNode, "function" === typeof prevHostParent.componentWillUnmount && safelyCallComponentWillUnmount(deletedFiber, nearestMountedAncestor, prevHostParent));
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				break;
			case 21:
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				break;
			case 22:
				offscreenSubtreeWasHidden = (prevHostParent = offscreenSubtreeWasHidden) || null !== deletedFiber.memoizedState;
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				offscreenSubtreeWasHidden = prevHostParent;
				break;
			case 30:
				safelyDetachRef(deletedFiber, nearestMountedAncestor);
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				break;
			case 7:
				offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
				recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
				break;
			default: recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
		}
	}
	function commitActivityHydrationCallbacks(finishedRoot, finishedWork) {
		if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot))) {
			finishedRoot = finishedRoot.dehydrated;
			try {
				retryIfBlockedOn(finishedRoot);
			} catch (error) {
				captureCommitPhaseError(finishedWork, finishedWork.return, error);
			}
		}
	}
	function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
		if (null === finishedWork.memoizedState && (finishedRoot = finishedWork.alternate, null !== finishedRoot && (finishedRoot = finishedRoot.memoizedState, null !== finishedRoot && (finishedRoot = finishedRoot.dehydrated, null !== finishedRoot)))) try {
			retryIfBlockedOn(finishedRoot);
		} catch (error) {
			captureCommitPhaseError(finishedWork, finishedWork.return, error);
		}
	}
	function getRetryCache(finishedWork) {
		switch (finishedWork.tag) {
			case 31:
			case 13:
			case 19:
				var retryCache = finishedWork.stateNode;
				null === retryCache && (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
				return retryCache;
			case 22: return finishedWork = finishedWork.stateNode, retryCache = finishedWork._retryCache, null === retryCache && (retryCache = finishedWork._retryCache = new PossiblyWeakSet()), retryCache;
			default: throw Error(formatProdErrorMessage(435, finishedWork.tag));
		}
	}
	function attachSuspenseRetryListeners(finishedWork, wakeables) {
		var retryCache = getRetryCache(finishedWork);
		wakeables.forEach(function(wakeable) {
			if (!retryCache.has(wakeable)) {
				retryCache.add(wakeable);
				var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
				wakeable.then(retry, retry);
			}
		});
	}
	function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber, lanes) {
		var deletions = parentFiber.deletions;
		if (null !== deletions) for (var i = 0; i < deletions.length; i++) {
			var childToDelete = deletions[i], root = root$jscomp$0, returnFiber = parentFiber, parent = returnFiber;
			a: for (; null !== parent;) {
				switch (parent.tag) {
					case 27:
						if (isSingletonScope(parent.type)) {
							hostParent = parent.stateNode;
							hostParentIsContainer = !1;
							break a;
						}
						break;
					case 5:
						hostParent = parent.stateNode;
						hostParentIsContainer = !1;
						break a;
					case 3:
					case 4:
						hostParent = parent.stateNode.containerInfo;
						hostParentIsContainer = !0;
						break a;
				}
				parent = parent.return;
			}
			if (null === hostParent) throw Error(formatProdErrorMessage(160));
			commitDeletionEffectsOnFiber(root, returnFiber, childToDelete);
			hostParent = null;
			hostParentIsContainer = !1;
			root = childToDelete.alternate;
			null !== root && (root.return = null);
			childToDelete.return = null;
		}
		if (parentFiber.subtreeFlags & 13886) for (parentFiber = parentFiber.child; null !== parentFiber;) commitMutationEffectsOnFiber(parentFiber, root$jscomp$0, lanes), parentFiber = parentFiber.sibling;
	}
	var currentHoistableRoot = null;
	function commitMutationEffectsOnFiber(finishedWork, root, lanes) {
		var current = finishedWork.alternate, flags = finishedWork.flags;
		switch (finishedWork.tag) {
			case 0:
			case 11:
			case 14:
			case 15:
				if (flags & 4 && (current = finishedWork.updateQueue, current = null !== current ? current.events : null, null !== current)) for (var ii = 0; ii < current.length; ii++) {
					var _eventPayloads$ii2 = current[ii];
					_eventPayloads$ii2.ref.impl = _eventPayloads$ii2.nextImpl;
				}
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 4 && (commitHookEffectListUnmount(3, finishedWork, finishedWork.return), commitHookEffectListMount(3, finishedWork), commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
				break;
			case 1:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
				flags & 64 && offscreenSubtreeIsHidden && (finishedWork = finishedWork.updateQueue, null !== finishedWork && (root = finishedWork.callbacks, null !== root && (lanes = finishedWork.shared.hiddenCallbacks, finishedWork.shared.hiddenCallbacks = null === lanes ? root : lanes.concat(root))));
				break;
			case 26:
				ii = currentHoistableRoot;
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
				if (flags & 4) if (flags = null !== current ? current.memoizedState : null, lanes = finishedWork.memoizedState, null === current) if (null === lanes) if (null === finishedWork.stateNode) if (offscreenSubtreeIsHidden) finishedWork.stateNode = createHoistableInstance(finishedWork.type, finishedWork.memoizedProps, root.containerInfo, finishedWork);
				else {
					a: {
						root = finishedWork.type;
						lanes = finishedWork.memoizedProps;
						flags = ii.ownerDocument || ii;
						b: switch (root) {
							case "title":
								current = flags.getElementsByTagName("title")[0];
								if (!current || current[internalHoistableMarker] || current[internalInstanceKey] || "http://www.w3.org/2000/svg" === current.namespaceURI || current.hasAttribute("itemprop")) current = flags.createElement(root), flags.head.insertBefore(current, flags.querySelector("head > title"));
								setInitialProperties(current, root, lanes);
								current[internalInstanceKey] = finishedWork;
								markNodeAsHoistable(current);
								root = current;
								break a;
							case "link":
								if (ii = getHydratableHoistableCache("link", "href", flags).get(root + (lanes.href || ""))) {
									for (_eventPayloads$ii2 = 0; _eventPayloads$ii2 < ii.length; _eventPayloads$ii2++) if (current = ii[_eventPayloads$ii2], current.getAttribute("href") === (null == lanes.href || "" === lanes.href ? null : lanes.href) && current.getAttribute("rel") === (null == lanes.rel ? null : lanes.rel) && current.getAttribute("title") === (null == lanes.title ? null : lanes.title) && current.getAttribute("crossorigin") === (null == lanes.crossOrigin ? null : lanes.crossOrigin)) {
										ii.splice(_eventPayloads$ii2, 1);
										break b;
									}
								}
								current = flags.createElement(root);
								setInitialProperties(current, root, lanes);
								flags.head.appendChild(current);
								break;
							case "meta":
								if (ii = getHydratableHoistableCache("meta", "content", flags).get(root + (lanes.content || ""))) {
									for (_eventPayloads$ii2 = 0; _eventPayloads$ii2 < ii.length; _eventPayloads$ii2++) if (current = ii[_eventPayloads$ii2], current.getAttribute("content") === (null == lanes.content ? null : "" + lanes.content) && current.getAttribute("name") === (null == lanes.name ? null : lanes.name) && current.getAttribute("property") === (null == lanes.property ? null : lanes.property) && current.getAttribute("http-equiv") === (null == lanes.httpEquiv ? null : lanes.httpEquiv) && current.getAttribute("charset") === (null == lanes.charSet ? null : lanes.charSet)) {
										ii.splice(_eventPayloads$ii2, 1);
										break b;
									}
								}
								current = flags.createElement(root);
								setInitialProperties(current, root, lanes);
								flags.head.appendChild(current);
								break;
							default: throw Error(formatProdErrorMessage(468, root));
						}
						current[internalInstanceKey] = finishedWork;
						markNodeAsHoistable(current);
						root = current;
					}
					finishedWork.stateNode = root;
				}
				else offscreenSubtreeIsHidden || mountHoistable(ii, finishedWork.type, finishedWork.stateNode);
				else finishedWork.stateNode = acquireResource(ii, lanes, finishedWork.memoizedProps);
				else flags !== lanes ? (null === flags ? (root = current.stateNode, null === root || offscreenSubtreeWasHidden || root.parentNode.removeChild(root)) : flags.count--, null === lanes ? offscreenSubtreeIsHidden || mountHoistable(ii, finishedWork.type, finishedWork.stateNode) : acquireResource(ii, lanes, finishedWork.memoizedProps)) : null === lanes && null !== finishedWork.stateNode && commitHostUpdate(finishedWork, finishedWork.memoizedProps, current.memoizedProps);
				break;
			case 27:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
				null !== current && flags & 4 && commitHostUpdate(finishedWork, finishedWork.memoizedProps, current.memoizedProps);
				break;
			case 5:
				ii = offscreenDirectParentIsHidden;
				offscreenDirectParentIsHidden = !1;
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				offscreenDirectParentIsHidden = ii;
				commitReconciliationEffects(finishedWork);
				flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
				if (finishedWork.flags & 32) {
					root = finishedWork.stateNode;
					try {
						setTextContent(root, ""), viewTransitionMutationContext = !0;
					} catch (error) {
						captureCommitPhaseError(finishedWork, finishedWork.return, error);
					}
				}
				flags & 4 && null != finishedWork.stateNode && (root = finishedWork.memoizedProps, commitHostUpdate(finishedWork, root, null !== current ? current.memoizedProps : root));
				flags & 1024 && (needsFormReset = !0);
				break;
			case 6:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				if (flags & 4) {
					if (null === finishedWork.stateNode) throw Error(formatProdErrorMessage(162));
					root = finishedWork.memoizedProps;
					lanes = finishedWork.stateNode;
					try {
						lanes.nodeValue = root, viewTransitionMutationContext = !0;
					} catch (error) {
						captureCommitPhaseError(finishedWork, finishedWork.return, error);
					}
				}
				break;
			case 3:
				viewTransitionMutationContext = !1;
				tagCaches = null;
				ii = currentHoistableRoot;
				currentHoistableRoot = getHoistableRoot(root.containerInfo);
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				currentHoistableRoot = ii;
				commitReconciliationEffects(finishedWork);
				if (flags & 4 && null !== current && current.memoizedState.isDehydrated) try {
					retryIfBlockedOn(root.containerInfo);
				} catch (error) {
					captureCommitPhaseError(finishedWork, finishedWork.return, error);
				}
				needsFormReset && (needsFormReset = !1, recursivelyResetForms(finishedWork));
				viewTransitionMutationContext = !1;
				break;
			case 4:
				flags = offscreenDirectParentIsHidden;
				offscreenDirectParentIsHidden = offscreenSubtreeIsHidden;
				current = pushMutationContext();
				ii = currentHoistableRoot;
				currentHoistableRoot = getHoistableRoot(finishedWork.stateNode.containerInfo);
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				currentHoistableRoot = ii;
				viewTransitionMutationContext && inUpdateViewTransition && (rootViewTransitionAffected = !0);
				viewTransitionMutationContext = current;
				offscreenDirectParentIsHidden = flags;
				break;
			case 12:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				break;
			case 31:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 4 && (root = finishedWork.updateQueue, null !== root && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root)));
				break;
			case 13:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				finishedWork.child.flags & 8192 && null !== finishedWork.memoizedState !== (null !== current && null !== current.memoizedState) && (globalMostRecentFallbackTime = now());
				flags & 4 && (root = finishedWork.updateQueue, null !== root && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root)));
				break;
			case 22:
				ii = null !== finishedWork.memoizedState;
				_eventPayloads$ii2 = null !== current && null !== current.memoizedState;
				var prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden, prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden, prevOffscreenDirectParentIsHidden$166 = offscreenDirectParentIsHidden;
				offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
				offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$166 || ii;
				offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
				offscreenDirectParentIsHidden = prevOffscreenDirectParentIsHidden$166;
				offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
				commitReconciliationEffects(finishedWork);
				flags & 8192 && (root = finishedWork.stateNode, root._visibility = ii ? root._visibility & -2 : root._visibility | 1, !ii || null === current || _eventPayloads$ii2 || offscreenSubtreeIsHidden || offscreenSubtreeWasHidden || (root = _eventPayloads$ii2 || offscreenSubtreeWasHidden, lanes = offscreenSubtreeIsHidden, current = offscreenSubtreeWasHidden, offscreenSubtreeIsHidden = ii || offscreenSubtreeIsHidden, offscreenSubtreeWasHidden = root, recursivelyTraverseDisappearLayoutEffects(finishedWork, 2), offscreenSubtreeIsHidden = lanes, offscreenSubtreeWasHidden = current), !ii && offscreenDirectParentIsHidden || hideOrUnhideAllChildren(finishedWork, ii));
				flags & 4 && (root = finishedWork.updateQueue, null !== root && (lanes = root.retryQueue, null !== lanes && (root.retryQueue = null, attachSuspenseRetryListeners(finishedWork, lanes))));
				break;
			case 19:
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				flags & 4 && (root = finishedWork.updateQueue, null !== root && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, root)));
				break;
			case 30:
				flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return));
				flags = pushMutationContext();
				ii = inUpdateViewTransition;
				_eventPayloads$ii2 = (lanes & 335544064) === lanes;
				prevOffscreenSubtreeIsHidden = finishedWork.memoizedProps;
				inUpdateViewTransition = _eventPayloads$ii2 && "none" !== getViewTransitionClassName(prevOffscreenSubtreeIsHidden.default, prevOffscreenSubtreeIsHidden.update);
				recursivelyTraverseMutationEffects(root, finishedWork, lanes);
				commitReconciliationEffects(finishedWork);
				_eventPayloads$ii2 && null !== current && viewTransitionMutationContext && (finishedWork.flags |= 4);
				inUpdateViewTransition = ii;
				viewTransitionMutationContext = flags;
				break;
			case 21: break;
			case 7: flags & 512 && (offscreenSubtreeWasHidden || null === current || safelyDetachRef(current, current.return)), current && null !== current.stateNode && (current.stateNode._fragmentFiber = finishedWork);
			default: recursivelyTraverseMutationEffects(root, finishedWork, lanes), commitReconciliationEffects(finishedWork);
		}
	}
	function commitReconciliationEffects(finishedWork) {
		var flags = finishedWork.flags;
		if (flags & 2) {
			try {
				for (var hostParentFiber, parentFiber = finishedWork.return; null !== parentFiber;) {
					if (isHostParent(parentFiber)) {
						hostParentFiber = parentFiber;
						break;
					}
					parentFiber = parentFiber.return;
				}
				parentFiber = null;
				for (var parent = finishedWork.return; null !== parent;) {
					if (isFragmentInstanceParent(parent)) {
						var fragmentInstance = parent.stateNode;
						null === parentFiber ? parentFiber = [fragmentInstance] : parentFiber.push(fragmentInstance);
					}
					if (isFragmentInstanceHostBoundary(parent)) break;
					parent = parent.return;
				}
				var JSCompiler_inline_result = parentFiber;
				if (null == hostParentFiber) throw Error(formatProdErrorMessage(160));
				switch (hostParentFiber.tag) {
					case 27:
						var parent$jscomp$0 = hostParentFiber.stateNode;
						insertOrAppendPlacementNode(finishedWork, getHostSibling(finishedWork), parent$jscomp$0, JSCompiler_inline_result);
						break;
					case 5:
						var parent$149 = hostParentFiber.stateNode;
						hostParentFiber.flags & 32 && (setTextContent(parent$149, ""), hostParentFiber.flags &= -33);
						insertOrAppendPlacementNode(finishedWork, getHostSibling(finishedWork), parent$149, JSCompiler_inline_result);
						break;
					case 3:
					case 4:
						var parent$151 = hostParentFiber.stateNode.containerInfo;
						insertOrAppendPlacementNodeIntoContainer(finishedWork, getHostSibling(finishedWork), parent$151, JSCompiler_inline_result);
						break;
					default: throw Error(formatProdErrorMessage(161));
				}
			} catch (error) {
				captureCommitPhaseError(finishedWork, finishedWork.return, error);
			}
			finishedWork.flags &= -3;
		}
		flags & 4096 && (finishedWork.flags &= -4097);
	}
	function recursivelyResetForms(parentFiber) {
		if (parentFiber.subtreeFlags & 1024) for (parentFiber = parentFiber.child; null !== parentFiber;) {
			var fiber = parentFiber;
			recursivelyResetForms(fiber);
			5 === fiber.tag && fiber.flags & 1024 && (fiber = fiber.stateNode, _enabled = !0, fiber.reset(), _enabled = !1);
			parentFiber = parentFiber.sibling;
		}
	}
	function recursivelyTraverseAfterMutationEffects(root, parentFiber) {
		if (parentFiber.subtreeFlags & 9270) for (parentFiber = parentFiber.child; null !== parentFiber;) commitAfterMutationEffectsOnFiber(parentFiber, root), parentFiber = parentFiber.sibling;
		else measureNestedViewTransitions(parentFiber, !1);
	}
	function commitAfterMutationEffectsOnFiber(finishedWork, root) {
		var current = finishedWork.alternate;
		if (null === current) commitEnterViewTransitions(finishedWork, !1);
		else switch (finishedWork.tag) {
			case 3:
				rootViewTransitionNameCanceled = viewTransitionContextChanged = !1;
				pushViewTransitionCancelableScope();
				recursivelyTraverseAfterMutationEffects(root, finishedWork);
				if (!viewTransitionContextChanged && !rootViewTransitionAffected) {
					finishedWork = viewTransitionCancelableChildren;
					if (null !== finishedWork) for (var i = 0; i < finishedWork.length; i += 3) {
						current = finishedWork[i];
						var oldName = finishedWork[i + 1];
						restoreViewTransitionName(current, finishedWork[i + 2]);
						current = current.ownerDocument.documentElement;
						null !== current && current.animate({
							opacity: [0, 0],
							pointerEvents: ["none", "none"]
						}, {
							duration: 0,
							fill: "forwards",
							pseudoElement: "::view-transition-group(" + oldName + ")"
						});
					}
					finishedWork = root.containerInfo;
					finishedWork = 9 === finishedWork.nodeType ? finishedWork.documentElement : finishedWork.ownerDocument.documentElement;
					null !== finishedWork && "" === finishedWork.style.viewTransitionName && (finishedWork.style.viewTransitionName = "none", finishedWork.animate({
						opacity: [0, 0],
						pointerEvents: ["none", "none"]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition-group(root)"
					}), finishedWork.animate({
						width: [0, 0],
						height: [0, 0]
					}, {
						duration: 0,
						fill: "forwards",
						pseudoElement: "::view-transition"
					}));
					rootViewTransitionNameCanceled = !0;
				}
				viewTransitionCancelableChildren = null;
				break;
			case 5:
				recursivelyTraverseAfterMutationEffects(root, finishedWork);
				break;
			case 4:
				i = viewTransitionContextChanged;
				viewTransitionContextChanged = !1;
				recursivelyTraverseAfterMutationEffects(root, finishedWork);
				viewTransitionContextChanged && (rootViewTransitionAffected = !0);
				viewTransitionContextChanged = i;
				break;
			case 22:
				null === finishedWork.memoizedState && (null !== current.memoizedState ? commitEnterViewTransitions(finishedWork, !1) : recursivelyTraverseAfterMutationEffects(root, finishedWork));
				break;
			case 30:
				i = viewTransitionContextChanged;
				oldName = pushViewTransitionCancelableScope();
				viewTransitionContextChanged = !1;
				recursivelyTraverseAfterMutationEffects(root, finishedWork);
				viewTransitionContextChanged && (finishedWork.flags |= 4);
				var props = finishedWork.memoizedProps, state = finishedWork.stateNode;
				root = getViewTransitionName(props, state);
				state = getViewTransitionName(current.memoizedProps, state);
				var className = getViewTransitionClassName(props.default, props.update);
				"none" === className ? root = !1 : (props = current.memoizedState, current.memoizedState = null, current = finishedWork.child, viewTransitionHostInstanceIdx = 0, root = measureViewTransitionHostInstancesRecursive(finishedWork, current, root, state, className, props, !0), viewTransitionHostInstanceIdx !== (null === props ? 0 : props.length) && (finishedWork.flags |= 32));
				0 !== (finishedWork.flags & 4) && root ? (scheduleViewTransitionEvent(finishedWork, finishedWork.memoizedProps.onUpdate), viewTransitionCancelableChildren = oldName) : null !== oldName && (oldName.push.apply(oldName, viewTransitionCancelableChildren), viewTransitionCancelableChildren = oldName);
				viewTransitionContextChanged = 0 !== (finishedWork.flags & 32) ? !0 : i;
				break;
			default: recursivelyTraverseAfterMutationEffects(root, finishedWork);
		}
	}
	function recursivelyTraverseLayoutEffects(root, parentFiber) {
		if (parentFiber.subtreeFlags & 8772) for (parentFiber = parentFiber.child; null !== parentFiber;) commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber), parentFiber = parentFiber.sibling;
	}
	function recursivelyTraverseDisappearLayoutEffects(parentFiber, layoutEffectTraversalFlags$jscomp$0) {
		for (parentFiber = parentFiber.child; null !== parentFiber;) {
			var finishedWork = parentFiber, layoutEffectTraversalFlags = layoutEffectTraversalFlags$jscomp$0;
			switch (finishedWork.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
					recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 1:
					safelyDetachRef(finishedWork, finishedWork.return);
					var instance = finishedWork.stateNode;
					"function" === typeof instance.componentWillUnmount && safelyCallComponentWillUnmount(finishedWork, finishedWork.return, instance);
					recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 27: 0 !== (layoutEffectTraversalFlags & 2) && releaseSingletonInstance(finishedWork.stateNode, finishedWork.type, finishedWork.memoizedProps);
				case 5:
					safelyDetachRef(finishedWork, finishedWork.return);
					5 !== finishedWork.tag && 27 !== finishedWork.tag || commitFragmentInstanceDeletionEffects(finishedWork);
					recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 6:
					commitFragmentInstanceDeletionEffects(finishedWork);
					break;
				case 26:
					safelyDetachRef(finishedWork, finishedWork.return);
					instance = finishedWork.stateNode;
					null !== finishedWork.memoizedState || null === instance || offscreenSubtreeWasHidden || instance.parentNode.removeChild(instance);
					recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 22:
					null === finishedWork.memoizedState && recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 30:
					safelyDetachRef(finishedWork, finishedWork.return);
					recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
					break;
				case 7: safelyDetachRef(finishedWork, finishedWork.return);
				default: recursivelyTraverseDisappearLayoutEffects(finishedWork, layoutEffectTraversalFlags);
			}
			parentFiber = parentFiber.sibling;
		}
	}
	function recursivelyTraverseReappearLayoutEffects(finishedRoot$jscomp$0, parentFiber, layoutEffectTraversalFlags) {
		layoutEffectTraversalFlags = 0 !== (parentFiber.subtreeFlags & 8772) ? layoutEffectTraversalFlags : layoutEffectTraversalFlags & -2;
		for (parentFiber = parentFiber.child; null !== parentFiber;) {
			var current = parentFiber.alternate, finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags, includeWorkInProgressEffects = 0 !== (layoutEffectTraversalFlags & 1);
			switch (finishedWork.tag) {
				case 0:
				case 11:
				case 15:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					commitHookEffectListMount(4, finishedWork);
					break;
				case 1:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					current = finishedWork;
					finishedRoot = current.stateNode;
					if ("function" === typeof finishedRoot.componentDidMount) try {
						finishedRoot.componentDidMount();
					} catch (error) {
						captureCommitPhaseError(current, current.return, error);
					}
					current = finishedWork;
					finishedRoot = current.updateQueue;
					if (null !== finishedRoot) {
						var instance = current.stateNode;
						try {
							var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
							if (null !== hiddenCallbacks) for (finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0; finishedRoot < hiddenCallbacks.length; finishedRoot++) callCallback(hiddenCallbacks[finishedRoot], instance);
						} catch (error) {
							captureCommitPhaseError(current, current.return, error);
						}
					}
					includeWorkInProgressEffects && flags & 64 && commitClassCallbacks(finishedWork);
					safelyAttachRef(finishedWork, finishedWork.return);
					break;
				case 27: 0 !== (layoutEffectTraversalFlags & 2) && commitHostSingletonAcquisition(finishedWork);
				case 5:
					5 !== finishedWork.tag && 27 !== finishedWork.tag || commitFragmentInstanceInsertionEffects(finishedWork);
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
					safelyAttachRef(finishedWork, finishedWork.return);
					break;
				case 6:
					commitFragmentInstanceInsertionEffects(finishedWork);
					break;
				case 26:
					instance = finishedWork.stateNode;
					null !== finishedWork.memoizedState || null === instance || offscreenSubtreeIsHidden || mountHoistable(getHoistableRoot(instance.ownerDocument), finishedWork.type, instance);
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					includeWorkInProgressEffects && null === current && flags & 4 && commitHostMount(finishedWork);
					safelyAttachRef(finishedWork, finishedWork.return);
					break;
				case 12:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					break;
				case 31:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					includeWorkInProgressEffects && flags & 4 && commitActivityHydrationCallbacks(finishedRoot, finishedWork);
					break;
				case 13:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					includeWorkInProgressEffects && flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
					break;
				case 22:
					null === finishedWork.memoizedState && recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					safelyAttachRef(finishedWork, finishedWork.return);
					break;
				case 30:
					recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
					safelyAttachRef(finishedWork, finishedWork.return);
					break;
				case 7: safelyAttachRef(finishedWork, finishedWork.return);
				default: recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, layoutEffectTraversalFlags);
			}
			parentFiber = parentFiber.sibling;
		}
	}
	function commitOffscreenPassiveMountEffects(current, finishedWork) {
		var previousCache = null;
		null !== current && null !== current.memoizedState && null !== current.memoizedState.cachePool && (previousCache = current.memoizedState.cachePool.pool);
		current = null;
		null !== finishedWork.memoizedState && null !== finishedWork.memoizedState.cachePool && (current = finishedWork.memoizedState.cachePool.pool);
		current !== previousCache && (null != current && current.refCount++, null != previousCache && releaseCache(previousCache));
	}
	function commitCachePassiveMountEffect(current, finishedWork) {
		current = null;
		null !== finishedWork.alternate && (current = finishedWork.alternate.memoizedState.cache);
		finishedWork = finishedWork.memoizedState.cache;
		finishedWork !== current && (finishedWork.refCount++, null != current && releaseCache(current));
	}
	function recursivelyTraversePassiveMountEffects(root, parentFiber, committedLanes, committedTransitions) {
		var isViewTransitionEligible = (committedLanes & 335544064) === committedLanes;
		if (parentFiber.subtreeFlags & (isViewTransitionEligible ? 10262 : 10256)) for (parentFiber = parentFiber.child; null !== parentFiber;) commitPassiveMountOnFiber(root, parentFiber, committedLanes, committedTransitions), parentFiber = parentFiber.sibling;
		else isViewTransitionEligible && restoreNestedViewTransitions(parentFiber);
	}
	function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
		var isViewTransitionEligible = (committedLanes & 335544064) === committedLanes;
		isViewTransitionEligible && null === finishedWork.alternate && null !== finishedWork.return && null !== finishedWork.return.alternate && restoreEnterOrExitViewTransitions(finishedWork);
		var flags = finishedWork.flags;
		switch (finishedWork.tag) {
			case 0:
			case 11:
			case 15:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				flags & 2048 && commitHookEffectListMount(9, finishedWork);
				break;
			case 1:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				break;
			case 3:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				isViewTransitionEligible && rootViewTransitionNameCanceled && (finishedRoot = finishedRoot.containerInfo, finishedRoot = 9 === finishedRoot.nodeType ? finishedRoot.body : "HTML" === finishedRoot.nodeName ? finishedRoot.ownerDocument.body : finishedRoot, "root" === finishedRoot.style.viewTransitionName && (finishedRoot.style.viewTransitionName = ""), finishedRoot = finishedRoot.ownerDocument.documentElement, null !== finishedRoot && "none" === finishedRoot.style.viewTransitionName && (finishedRoot.style.viewTransitionName = ""));
				flags & 2048 && (flags = null, null !== finishedWork.alternate && (flags = finishedWork.alternate.memoizedState.cache), finishedWork = finishedWork.memoizedState.cache, finishedWork !== flags && (finishedWork.refCount++, null != flags && releaseCache(flags)));
				break;
			case 12:
				if (flags & 2048) {
					recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
					flags = finishedWork.stateNode;
					try {
						var _finishedWork$memoize2 = finishedWork.memoizedProps, id = _finishedWork$memoize2.id, onPostCommit = _finishedWork$memoize2.onPostCommit;
						"function" === typeof onPostCommit && onPostCommit(id, null === finishedWork.alternate ? "mount" : "update", flags.passiveEffectDuration, -0);
					} catch (error) {
						captureCommitPhaseError(finishedWork, finishedWork.return, error);
					}
				} else recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				break;
			case 31:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				break;
			case 13:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				break;
			case 23: break;
			case 22:
				_finishedWork$memoize2 = finishedWork.stateNode;
				id = finishedWork.alternate;
				null !== finishedWork.memoizedState ? (isViewTransitionEligible && null !== id && null === id.memoizedState && restoreEnterOrExitViewTransitions(id), _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork)) : (isViewTransitionEligible && null !== id && null !== id.memoizedState && restoreEnterOrExitViewTransitions(finishedWork), _finishedWork$memoize2._visibility & 2 ? recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions) : (_finishedWork$memoize2._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, 0 !== (finishedWork.subtreeFlags & 10256) || !1)));
				flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
				break;
			case 24:
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
				break;
			case 30:
				isViewTransitionEligible && (flags = finishedWork.alternate, null !== flags && (restoreViewTransitionOnHostInstances(flags.child, !0), restoreViewTransitionOnHostInstances(finishedWork.child, !0)));
				recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
				break;
			default: recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
		}
	}
	function recursivelyTraverseReconnectPassiveEffects(finishedRoot$jscomp$0, parentFiber, committedLanes$jscomp$0, committedTransitions$jscomp$0, includeWorkInProgressEffects) {
		includeWorkInProgressEffects = includeWorkInProgressEffects && (0 !== (parentFiber.subtreeFlags & 10256) || !1);
		for (parentFiber = parentFiber.child; null !== parentFiber;) {
			var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, committedLanes = committedLanes$jscomp$0, committedTransitions = committedTransitions$jscomp$0, flags = finishedWork.flags;
			switch (finishedWork.tag) {
				case 0:
				case 11:
				case 15:
					recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
					commitHookEffectListMount(8, finishedWork);
					break;
				case 23: break;
				case 22:
					var instance = finishedWork.stateNode;
					null !== finishedWork.memoizedState ? instance._visibility & 2 ? recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork) : (instance._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects));
					includeWorkInProgressEffects && flags & 2048 && commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
					break;
				case 24:
					recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
					includeWorkInProgressEffects && flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
					break;
				default: recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
			}
			parentFiber = parentFiber.sibling;
		}
	}
	function recursivelyTraverseAtomicPassiveEffects(finishedRoot$jscomp$0, parentFiber) {
		if (parentFiber.subtreeFlags & 10256) for (parentFiber = parentFiber.child; null !== parentFiber;) {
			var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
			switch (finishedWork.tag) {
				case 22:
					recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
					flags & 2048 && commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
					break;
				case 24:
					recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
					flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
					break;
				default: recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
			}
			parentFiber = parentFiber.sibling;
		}
	}
	var suspenseyCommitFlag = 8192;
	function recursivelyAccumulateSuspenseyCommit(parentFiber, committedLanes, suspendedState) {
		if (parentFiber.subtreeFlags & suspenseyCommitFlag) for (parentFiber = parentFiber.child; null !== parentFiber;) accumulateSuspenseyCommitOnFiber(parentFiber, committedLanes, suspendedState), parentFiber = parentFiber.sibling;
	}
	function accumulateSuspenseyCommitOnFiber(fiber, committedLanes, suspendedState) {
		switch (fiber.tag) {
			case 26:
				recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
				fiber.flags & suspenseyCommitFlag && (null !== fiber.memoizedState ? suspendResource(suspendedState, currentHoistableRoot, fiber.memoizedState, fiber.memoizedProps) : (fiber = fiber.stateNode, (committedLanes & 335544128) === committedLanes && suspendInstance(suspendedState, fiber)));
				break;
			case 5:
				recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
				fiber.flags & suspenseyCommitFlag && (fiber = fiber.stateNode, (committedLanes & 335544128) === committedLanes && suspendInstance(suspendedState, fiber));
				break;
			case 3:
			case 4:
				var previousHoistableRoot = currentHoistableRoot;
				currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
				recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
				currentHoistableRoot = previousHoistableRoot;
				break;
			case 22:
				null === fiber.memoizedState && (previousHoistableRoot = fiber.alternate, null !== previousHoistableRoot && null !== previousHoistableRoot.memoizedState ? (previousHoistableRoot = suspenseyCommitFlag, suspenseyCommitFlag = 16777216, recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState), suspenseyCommitFlag = previousHoistableRoot) : recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState));
				break;
			case 30:
				if (0 !== (fiber.flags & suspenseyCommitFlag) && (previousHoistableRoot = fiber.memoizedProps.name, null != previousHoistableRoot && "auto" !== previousHoistableRoot)) {
					var state = fiber.stateNode;
					state.paired = null;
					null === appearingViewTransitions && (appearingViewTransitions = /* @__PURE__ */ new Map());
					appearingViewTransitions.set(previousHoistableRoot, state);
				}
				recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
				break;
			default: recursivelyAccumulateSuspenseyCommit(fiber, committedLanes, suspendedState);
		}
	}
	function detachAlternateSiblings(parentFiber) {
		var previousFiber = parentFiber.alternate;
		if (null !== previousFiber && (parentFiber = previousFiber.child, null !== parentFiber)) {
			previousFiber.child = null;
			do
				previousFiber = parentFiber.sibling, parentFiber.sibling = null, parentFiber = previousFiber;
			while (null !== parentFiber);
		}
	}
	function recursivelyTraversePassiveUnmountEffects(parentFiber) {
		var deletions = parentFiber.deletions;
		if (0 !== (parentFiber.flags & 16)) {
			if (null !== deletions) for (var i = 0; i < deletions.length; i++) {
				var childToDelete = deletions[i];
				nextEffect = childToDelete;
				commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
			}
			detachAlternateSiblings(parentFiber);
		}
		if (parentFiber.subtreeFlags & 10256) for (parentFiber = parentFiber.child; null !== parentFiber;) commitPassiveUnmountOnFiber(parentFiber), parentFiber = parentFiber.sibling;
	}
	function commitPassiveUnmountOnFiber(finishedWork) {
		switch (finishedWork.tag) {
			case 0:
			case 11:
			case 15:
				recursivelyTraversePassiveUnmountEffects(finishedWork);
				finishedWork.flags & 2048 && commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
				break;
			case 3:
				recursivelyTraversePassiveUnmountEffects(finishedWork);
				break;
			case 12:
				recursivelyTraversePassiveUnmountEffects(finishedWork);
				break;
			case 22:
				var instance = finishedWork.stateNode;
				null !== finishedWork.memoizedState && instance._visibility & 2 && (null === finishedWork.return || 13 !== finishedWork.return.tag) ? (instance._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork)) : recursivelyTraversePassiveUnmountEffects(finishedWork);
				break;
			default: recursivelyTraversePassiveUnmountEffects(finishedWork);
		}
	}
	function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
		var deletions = parentFiber.deletions;
		if (0 !== (parentFiber.flags & 16)) {
			if (null !== deletions) for (var i = 0; i < deletions.length; i++) {
				var childToDelete = deletions[i];
				nextEffect = childToDelete;
				commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
			}
			detachAlternateSiblings(parentFiber);
		}
		for (parentFiber = parentFiber.child; null !== parentFiber;) {
			deletions = parentFiber;
			switch (deletions.tag) {
				case 0:
				case 11:
				case 15:
					commitHookEffectListUnmount(8, deletions, deletions.return);
					recursivelyTraverseDisconnectPassiveEffects(deletions);
					break;
				case 22:
					i = deletions.stateNode;
					i._visibility & 2 && (i._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(deletions));
					break;
				default: recursivelyTraverseDisconnectPassiveEffects(deletions);
			}
			parentFiber = parentFiber.sibling;
		}
	}
	function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
		for (; null !== nextEffect;) {
			var fiber = nextEffect;
			switch (fiber.tag) {
				case 0:
				case 11:
				case 15:
					commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
					break;
				case 23:
				case 22:
					if (null !== fiber.memoizedState && null !== fiber.memoizedState.cachePool) {
						var cache = fiber.memoizedState.cachePool.pool;
						null != cache && cache.refCount++;
					}
					break;
				case 24: releaseCache(fiber.memoizedState.cache);
			}
			cache = fiber.child;
			if (null !== cache) cache.return = fiber, nextEffect = cache;
			else a: for (fiber = deletedSubtreeRoot; null !== nextEffect;) {
				cache = nextEffect;
				var sibling = cache.sibling, returnFiber = cache.return;
				detachFiberAfterEffects(cache);
				if (cache === fiber) {
					nextEffect = null;
					break a;
				}
				if (null !== sibling) {
					sibling.return = returnFiber;
					nextEffect = sibling;
					break a;
				}
				nextEffect = returnFiber;
			}
		}
	}
	var DefaultAsyncDispatcher = {
		getCacheForType: function(resourceType) {
			var cache = readContext(CacheContext), cacheForType = cache.data.get(resourceType);
			void 0 === cacheForType && (cacheForType = resourceType(), cache.data.set(resourceType, cacheForType));
			return cacheForType;
		},
		cacheSignal: function() {
			return readContext(CacheContext).controller.signal;
		}
	};
	var PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map;
	var executionContext = 0;
	var workInProgressRoot = null;
	var workInProgress = null;
	var workInProgressRootRenderLanes = 0;
	var workInProgressSuspendedReason = 0;
	var workInProgressThrownValue = null;
	var workInProgressRootDidSkipSuspendedSiblings = !1;
	var workInProgressRootIsPrerendering = !1;
	var workInProgressRootDidAttachPingListener = !1;
	var entangledRenderLanes = 0;
	var workInProgressRootExitStatus = 0;
	var workInProgressRootSkippedLanes = 0;
	var workInProgressRootInterleavedUpdatedLanes = 0;
	var workInProgressRootPingedLanes = 0;
	var workInProgressDeferredLane = 0;
	var workInProgressSuspendedRetryLanes = 0;
	var workInProgressRootConcurrentErrors = null;
	var workInProgressRootRecoverableErrors = null;
	var workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
	var globalMostRecentFallbackTime = 0;
	var globalMostRecentTransitionTime = 0;
	var workInProgressRootRenderTargetTime = 1e400;
	var workInProgressTransitions = null;
	var legacyErrorBoundariesThatAlreadyFailed = null;
	var pendingEffectsStatus = 0;
	var pendingEffectsRoot = null;
	var pendingFinishedWork = null;
	var pendingEffectsLanes = 0;
	var pendingEffectsRemainingLanes = 0;
	var pendingPassiveTransitions = null;
	var pendingRecoverableErrors = null;
	var pendingViewTransition = null;
	var pendingViewTransitionEvents = null;
	var pendingTransitionTypes = null;
	var nestedUpdateCount = 0;
	var rootWithNestedUpdates = null;
	function requestUpdateLane() {
		return 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes : null !== ReactSharedInternals.T ? requestTransitionLane() : resolveUpdatePriority();
	}
	function requestDeferredLane() {
		if (0 === workInProgressDeferredLane) if (0 === (workInProgressRootRenderLanes & 536870912) || isHydrating) {
			var lane = nextTransitionDeferredLane;
			nextTransitionDeferredLane <<= 1;
			0 === (nextTransitionDeferredLane & 3932160) && (nextTransitionDeferredLane = 262144);
			workInProgressDeferredLane = lane;
		} else workInProgressDeferredLane = 536870912;
		lane = suspenseHandlerStackCursor.current;
		null !== lane && (lane.flags |= 32);
		return workInProgressDeferredLane;
	}
	function scheduleViewTransitionEvent(fiber, callback) {
		if (null != callback) {
			var state = fiber.stateNode, instance = state.ref;
			null === instance && (instance = state.ref = createViewTransitionInstance(getViewTransitionName(fiber.memoizedProps, state)));
			null === pendingViewTransitionEvents && (pendingViewTransitionEvents = []);
			pendingViewTransitionEvents.push(callback.bind(null, instance));
		}
	}
	function scheduleUpdateOnFiber(root, fiber, lane) {
		if (root === workInProgressRoot && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root.cancelPendingCommit) prepareFreshStack(root, 0), markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, !1);
		markRootUpdated$1(root, lane);
		if (0 === (executionContext & 2) || root !== workInProgressRoot) root === workInProgressRoot && (0 === (executionContext & 2) && (workInProgressRootInterleavedUpdatedLanes |= lane), 4 === workInProgressRootExitStatus && markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, !1)), ensureRootIsScheduled(root);
	}
	function performWorkOnRoot(root$jscomp$0, lanes, forceSync) {
		if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
		var shouldTimeSlice = !forceSync && 0 === (lanes & 127) && 0 === (lanes & root$jscomp$0.expiredLanes) || checkIfRootIsPrerendering(root$jscomp$0, lanes), exitStatus = shouldTimeSlice ? renderRootConcurrent(root$jscomp$0, lanes) : renderRootSync(root$jscomp$0, lanes, !0), renderWasConcurrent = shouldTimeSlice;
		do {
			if (0 === exitStatus) {
				workInProgressRootIsPrerendering && !shouldTimeSlice && markRootSuspended(root$jscomp$0, lanes, 0, !1);
				break;
			} else {
				forceSync = root$jscomp$0.current.alternate;
				if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
					exitStatus = renderRootSync(root$jscomp$0, lanes, !1);
					renderWasConcurrent = !1;
					continue;
				}
				if (2 === exitStatus) {
					renderWasConcurrent = lanes;
					if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent) var JSCompiler_inline_result = 0;
					else JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913, JSCompiler_inline_result = 0 !== JSCompiler_inline_result ? JSCompiler_inline_result : JSCompiler_inline_result & 536870912 ? 536870912 : 0;
					if (0 !== JSCompiler_inline_result) {
						lanes = JSCompiler_inline_result;
						a: {
							var root = root$jscomp$0;
							exitStatus = workInProgressRootConcurrentErrors;
							var wasRootDehydrated = root.current.memoizedState.isDehydrated;
							wasRootDehydrated && (prepareFreshStack(root, JSCompiler_inline_result).flags |= 256);
							JSCompiler_inline_result = renderRootSync(root, JSCompiler_inline_result, !1);
							if (2 !== JSCompiler_inline_result && 6 !== JSCompiler_inline_result) {
								if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
									root.errorRecoveryDisabledLanes |= renderWasConcurrent;
									workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
									exitStatus = 4;
									break a;
								}
								renderWasConcurrent = workInProgressRootRecoverableErrors;
								workInProgressRootRecoverableErrors = exitStatus;
								null !== renderWasConcurrent && (null === workInProgressRootRecoverableErrors ? workInProgressRootRecoverableErrors = renderWasConcurrent : workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, renderWasConcurrent));
							}
							exitStatus = JSCompiler_inline_result;
						}
						renderWasConcurrent = !1;
						if (2 !== exitStatus) continue;
					}
				}
				if (1 === exitStatus) {
					prepareFreshStack(root$jscomp$0, 0);
					markRootSuspended(root$jscomp$0, lanes, 0, !0);
					break;
				}
				a: {
					shouldTimeSlice = root$jscomp$0;
					renderWasConcurrent = exitStatus;
					switch (renderWasConcurrent) {
						case 0:
						case 1: throw Error(formatProdErrorMessage(345));
						case 4: if ((lanes & 4194048) !== lanes && (lanes & 62914560) !== lanes) break;
						case 6:
							markRootSuspended(shouldTimeSlice, lanes, workInProgressDeferredLane, !workInProgressRootDidSkipSuspendedSiblings);
							break a;
						case 2:
							workInProgressRootRecoverableErrors = null;
							break;
						case 3:
						case 5: break;
						default: throw Error(formatProdErrorMessage(329));
					}
					if ((lanes & 62914560) === lanes && (exitStatus = globalMostRecentFallbackTime + 300 - now(), 10 < exitStatus)) {
						markRootSuspended(shouldTimeSlice, lanes, workInProgressDeferredLane, !workInProgressRootDidSkipSuspendedSiblings);
						if (0 !== getNextLanes(shouldTimeSlice, 0, !0)) break a;
						pendingEffectsLanes = lanes;
						shouldTimeSlice.timeoutHandle = scheduleTimeout(completeRootWhenReady.bind(null, shouldTimeSlice, forceSync, workInProgressRootRecoverableErrors, workInProgressTransitions, workInProgressRootDidIncludeRecursiveRenderUpdate, lanes, workInProgressDeferredLane, workInProgressRootInterleavedUpdatedLanes, workInProgressSuspendedRetryLanes, workInProgressRootDidSkipSuspendedSiblings, renderWasConcurrent, "Throttled", -0, 0), exitStatus);
						break a;
					}
					completeRootWhenReady(shouldTimeSlice, forceSync, workInProgressRootRecoverableErrors, workInProgressTransitions, workInProgressRootDidIncludeRecursiveRenderUpdate, lanes, workInProgressDeferredLane, workInProgressRootInterleavedUpdatedLanes, workInProgressSuspendedRetryLanes, workInProgressRootDidSkipSuspendedSiblings, renderWasConcurrent, null, -0, 0);
				}
			}
			break;
		} while (1);
		ensureRootIsScheduled(root$jscomp$0);
	}
	function completeRootWhenReady(root, finishedWork, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, completedRenderStartTime, completedRenderEndTime) {
		root.timeoutHandle = -1;
		var subtreeFlags = finishedWork.subtreeFlags, isViewTransitionEligible = (lanes & 335544064) === lanes;
		suspendedCommitReason = null;
		if (isViewTransitionEligible || subtreeFlags & 8192 || 16785408 === (subtreeFlags & 16785408)) {
			if (suspendedCommitReason = {
				stylesheets: null,
				count: 0,
				imgCount: 0,
				imgBytes: 0,
				suspenseyImages: [],
				waitingForImages: !0,
				waitingForViewTransition: !1,
				unsuspend: noop$1
			}, appearingViewTransitions = null, accumulateSuspenseyCommitOnFiber(finishedWork, lanes, suspendedCommitReason), isViewTransitionEligible && (subtreeFlags = suspendedCommitReason, isViewTransitionEligible = root.containerInfo, isViewTransitionEligible = (9 === isViewTransitionEligible.nodeType ? isViewTransitionEligible : isViewTransitionEligible.ownerDocument).__reactViewTransition, null != isViewTransitionEligible && (subtreeFlags.count++, subtreeFlags.waitingForViewTransition = !0, subtreeFlags = onUnsuspend.bind(subtreeFlags), isViewTransitionEligible.finished.then(subtreeFlags, subtreeFlags))), subtreeFlags = (lanes & 62914560) === lanes ? globalMostRecentFallbackTime - now() : (lanes & 4194048) === lanes ? globalMostRecentTransitionTime - now() : 0, subtreeFlags = waitForCommitToBeReady(suspendedCommitReason, subtreeFlags), null !== subtreeFlags) {
				pendingEffectsLanes = lanes;
				root.cancelPendingCommit = subtreeFlags(completeRoot.bind(null, root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, null, completedRenderStartTime, completedRenderEndTime));
				markRootSuspended(root, lanes, spawnedLane, !didSkipSuspendedSiblings);
				return;
			}
		}
		completeRoot(root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason);
	}
	function isRenderConsistentWithExternalStores(finishedWork) {
		for (var node = finishedWork;;) {
			var tag = node.tag;
			if ((0 === tag || 11 === tag || 15 === tag) && node.flags & 16384 && (tag = node.updateQueue, null !== tag && (tag = tag.stores, null !== tag))) for (var i = 0; i < tag.length; i++) {
				var check = tag[i], getSnapshot = check.getSnapshot;
				check = check.value;
				try {
					if (!objectIs(getSnapshot(), check)) return !1;
				} catch (error) {
					return !1;
				}
			}
			tag = node.child;
			if (node.subtreeFlags & 16384 && null !== tag) tag.return = node, node = tag;
			else {
				if (node === finishedWork) break;
				for (; null === node.sibling;) {
					if (null === node.return || node.return === finishedWork) return !0;
					node = node.return;
				}
				node.sibling.return = node.return;
				node = node.sibling;
			}
		}
		return !0;
	}
	function markRootSuspended(root, suspendedLanes, spawnedLane, didAttemptEntireTree) {
		suspendedLanes = getEntangledLanes(root, suspendedLanes);
		suspendedLanes &= ~workInProgressRootPingedLanes;
		suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
		root.suspendedLanes |= suspendedLanes;
		root.pingedLanes &= ~suspendedLanes;
		didAttemptEntireTree && (root.warmLanes |= suspendedLanes);
		didAttemptEntireTree = root.expirationTimes;
		for (var lanes = suspendedLanes; 0 < lanes;) {
			var index$6 = 31 - clz32(lanes), lane = 1 << index$6;
			didAttemptEntireTree[index$6] = -1;
			lanes &= ~lane;
		}
		0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
	}
	function flushSyncWork$1() {
		return 0 === (executionContext & 6) ? (flushSyncWorkAcrossRoots_impl(0, !1), !1) : !0;
	}
	function resetWorkInProgressStack() {
		if (null !== workInProgress) {
			if (0 === workInProgressSuspendedReason) var interruptedWork = workInProgress.return;
			else interruptedWork = workInProgress, lastContextDependency = currentlyRenderingFiber$1 = null, resetHooksOnUnwind(interruptedWork), thenableState$1 = null, thenableIndexCounter$1 = 0, interruptedWork = workInProgress;
			for (; null !== interruptedWork;) unwindInterruptedWork(interruptedWork.alternate, interruptedWork), interruptedWork = interruptedWork.return;
			workInProgress = null;
		}
	}
	function prepareFreshStack(root, lanes) {
		var timeoutHandle = root.timeoutHandle;
		-1 !== timeoutHandle && (root.timeoutHandle = -1, cancelTimeout(timeoutHandle));
		timeoutHandle = root.cancelPendingCommit;
		null !== timeoutHandle && (root.cancelPendingCommit = null, timeoutHandle());
		pendingEffectsLanes = 0;
		resetWorkInProgressStack();
		workInProgressRoot = root;
		workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
		workInProgressRootRenderLanes = lanes;
		workInProgressSuspendedReason = 0;
		workInProgressThrownValue = null;
		workInProgressRootDidSkipSuspendedSiblings = !1;
		workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
		workInProgressRootDidAttachPingListener = !1;
		workInProgressSuspendedRetryLanes = workInProgressDeferredLane = workInProgressRootPingedLanes = workInProgressRootInterleavedUpdatedLanes = workInProgressRootSkippedLanes = workInProgressRootExitStatus = 0;
		workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
		workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
		entangledRenderLanes = getEntangledLanes(root, lanes);
		finishQueueingConcurrentUpdates();
		return timeoutHandle;
	}
	function handleThrow(root, thrownValue) {
		currentlyRenderingFiber = null;
		ReactSharedInternals.H = ContextOnlyDispatcher;
		thrownValue === SuspenseException || thrownValue === SuspenseActionException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 3) : thrownValue === SuspenseyCommitException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = 4) : workInProgressSuspendedReason = thrownValue === SelectiveHydrationException ? 8 : null !== thrownValue && "object" === typeof thrownValue && "function" === typeof thrownValue.then ? 6 : 1;
		workInProgressThrownValue = thrownValue;
		null === workInProgress && (workInProgressRootExitStatus = 1, logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current)));
	}
	function shouldRemainOnPreviousScreen() {
		var handler = suspenseHandlerStackCursor.current;
		return null === handler ? !0 : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes ? null === shellBoundary ? !0 : !1 : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes || 0 !== (workInProgressRootRenderLanes & 536870912) ? handler === shellBoundary : !1;
	}
	function pushDispatcher() {
		var prevDispatcher = ReactSharedInternals.H;
		ReactSharedInternals.H = ContextOnlyDispatcher;
		return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
	}
	function pushAsyncDispatcher() {
		var prevAsyncDispatcher = ReactSharedInternals.A;
		ReactSharedInternals.A = DefaultAsyncDispatcher;
		return prevAsyncDispatcher;
	}
	function renderDidSuspendDelayIfPossible() {
		workInProgressRootExitStatus = 4;
		workInProgressRootDidSkipSuspendedSiblings || (workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes && null !== suspenseHandlerStackCursor.current || (workInProgressRootIsPrerendering = !0);
		0 === (workInProgressRootSkippedLanes & 0x7ffffff) && 0 === (workInProgressRootInterleavedUpdatedLanes & 0x7ffffff) || null === workInProgressRoot || markRootSuspended(workInProgressRoot, workInProgressRootRenderLanes, workInProgressDeferredLane, !1);
	}
	function renderRootSync(root, lanes, shouldYieldForPrerendering) {
		var prevExecutionContext = executionContext;
		executionContext |= 2;
		var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
		if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) workInProgressTransitions = null, prepareFreshStack(root, lanes);
		lanes = !1;
		var exitStatus = workInProgressRootExitStatus;
		a: do
			try {
				if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
					var unitOfWork = workInProgress, thrownValue = workInProgressThrownValue;
					switch (workInProgressSuspendedReason) {
						case 8:
							resetWorkInProgressStack();
							exitStatus = 6;
							break a;
						case 3:
						case 2:
						case 9:
						case 6:
							null === suspenseHandlerStackCursor.current && (lanes = !0);
							var reason = workInProgressSuspendedReason;
							workInProgressSuspendedReason = 0;
							workInProgressThrownValue = null;
							throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
							if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
								exitStatus = 0;
								break a;
							}
							break;
						default: reason = workInProgressSuspendedReason, workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
					}
				}
				workLoopSync();
				exitStatus = workInProgressRootExitStatus;
				break;
			} catch (thrownValue$184) {
				handleThrow(root, thrownValue$184);
			}
		while (1);
		lanes && root.shellSuspendCounter++;
		lastContextDependency = currentlyRenderingFiber$1 = null;
		executionContext = prevExecutionContext;
		ReactSharedInternals.H = prevDispatcher;
		ReactSharedInternals.A = prevAsyncDispatcher;
		null === workInProgress && (workInProgressRoot = null, workInProgressRootRenderLanes = 0, finishQueueingConcurrentUpdates());
		return exitStatus;
	}
	function workLoopSync() {
		for (; null !== workInProgress;) performUnitOfWork(workInProgress);
	}
	function renderRootConcurrent(root, lanes) {
		var prevExecutionContext = executionContext;
		executionContext |= 2;
		var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
		workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes ? (workInProgressTransitions = null, workInProgressRootRenderTargetTime = now() + 500, prepareFreshStack(root, lanes)) : workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
		a: do
			try {
				if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
					lanes = workInProgress;
					var thrownValue = workInProgressThrownValue;
					b: switch (workInProgressSuspendedReason) {
						case 1:
							workInProgressSuspendedReason = 0;
							workInProgressThrownValue = null;
							throwAndUnwindWorkLoop(root, lanes, thrownValue, 1);
							break;
						case 2:
						case 9:
							if (isThenableResolved(thrownValue)) {
								workInProgressSuspendedReason = 0;
								workInProgressThrownValue = null;
								replaySuspendedUnitOfWork(lanes);
								break;
							}
							lanes = function() {
								2 !== workInProgressSuspendedReason && 9 !== workInProgressSuspendedReason || workInProgressRoot !== root || (workInProgressSuspendedReason = 7);
								ensureRootIsScheduled(root);
							};
							thrownValue.then(lanes, lanes);
							break a;
						case 3:
							workInProgressSuspendedReason = 7;
							break a;
						case 4:
							workInProgressSuspendedReason = 5;
							break a;
						case 7:
							isThenableResolved(thrownValue) ? (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, replaySuspendedUnitOfWork(lanes)) : (workInProgressSuspendedReason = 0, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root, lanes, thrownValue, 7));
							break;
						case 5:
							var resource = null;
							switch (workInProgress.tag) {
								case 26: resource = workInProgress.memoizedState;
								case 5:
								case 27:
									var hostFiber = workInProgress;
									if (resource ? preloadResource(resource) : hostFiber.stateNode.complete) {
										workInProgressSuspendedReason = 0;
										workInProgressThrownValue = null;
										var sibling = hostFiber.sibling;
										if (null !== sibling) workInProgress = sibling;
										else {
											var returnFiber = hostFiber.return;
											null !== returnFiber ? (workInProgress = returnFiber, completeUnitOfWork(returnFiber)) : workInProgress = null;
										}
										break b;
									}
							}
							workInProgressSuspendedReason = 0;
							workInProgressThrownValue = null;
							throwAndUnwindWorkLoop(root, lanes, thrownValue, 5);
							break;
						case 6:
							workInProgressSuspendedReason = 0;
							workInProgressThrownValue = null;
							throwAndUnwindWorkLoop(root, lanes, thrownValue, 6);
							break;
						case 8:
							resetWorkInProgressStack();
							workInProgressRootExitStatus = 6;
							break a;
						default: throw Error(formatProdErrorMessage(462));
					}
				}
				workLoopConcurrentByScheduler();
				break;
			} catch (thrownValue$186) {
				handleThrow(root, thrownValue$186);
			}
		while (1);
		lastContextDependency = currentlyRenderingFiber$1 = null;
		ReactSharedInternals.H = prevDispatcher;
		ReactSharedInternals.A = prevAsyncDispatcher;
		executionContext = prevExecutionContext;
		if (null !== workInProgress) return 0;
		workInProgressRoot = null;
		workInProgressRootRenderLanes = 0;
		finishQueueingConcurrentUpdates();
		return workInProgressRootExitStatus;
	}
	function workLoopConcurrentByScheduler() {
		for (; null !== workInProgress && !shouldYield();) performUnitOfWork(workInProgress);
	}
	function performUnitOfWork(unitOfWork) {
		var next = beginWork(unitOfWork.alternate, unitOfWork, entangledRenderLanes);
		unitOfWork.memoizedProps = unitOfWork.pendingProps;
		null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
	}
	function replaySuspendedUnitOfWork(unitOfWork) {
		var next = unitOfWork;
		var current = next.alternate;
		switch (next.tag) {
			case 15:
			case 0:
				next = replayFunctionComponent(current, next, next.pendingProps, next.type, void 0, workInProgressRootRenderLanes);
				break;
			case 11:
				next = replayFunctionComponent(current, next, next.pendingProps, next.type.render, next.ref, workInProgressRootRenderLanes);
				break;
			case 5:
				resetHooksOnUnwind(next);
				var fiber = next;
				fiber === hydrationParentFiber && (isHydrating ? (popToNextHostParent(fiber), 5 === fiber.tag && null != fiber.stateNode && (nextHydratableInstance = fiber.stateNode)) : (popToNextHostParent(fiber), isHydrating = !0));
			default: unwindInterruptedWork(current, next), next = workInProgress = resetWorkInProgress(next, entangledRenderLanes), next = beginWork(current, next, entangledRenderLanes);
		}
		unitOfWork.memoizedProps = unitOfWork.pendingProps;
		null === next ? completeUnitOfWork(unitOfWork) : workInProgress = next;
	}
	function throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, suspendedReason) {
		lastContextDependency = currentlyRenderingFiber$1 = null;
		resetHooksOnUnwind(unitOfWork);
		thenableState$1 = null;
		thenableIndexCounter$1 = 0;
		var returnFiber = unitOfWork.return;
		try {
			if (throwException(root, returnFiber, unitOfWork, thrownValue, workInProgressRootRenderLanes)) {
				workInProgressRootExitStatus = 1;
				logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
				workInProgress = null;
				return;
			}
		} catch (error) {
			if (null !== returnFiber) throw workInProgress = returnFiber, error;
			workInProgressRootExitStatus = 1;
			logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
			workInProgress = null;
			return;
		}
		if (unitOfWork.flags & 32768) {
			if (isHydrating || 1 === suspendedReason) root = !0;
			else if (workInProgressRootIsPrerendering || 0 !== (workInProgressRootRenderLanes & 536870912)) root = !1;
			else if (workInProgressRootDidSkipSuspendedSiblings = root = !0, 2 === suspendedReason || 9 === suspendedReason || 3 === suspendedReason || 6 === suspendedReason) suspendedReason = suspenseHandlerStackCursor.current, null !== suspendedReason && 13 === suspendedReason.tag && (suspendedReason.flags |= 16384);
			unwindUnitOfWork(unitOfWork, root);
		} else completeUnitOfWork(unitOfWork);
	}
	function completeUnitOfWork(unitOfWork) {
		var completedWork = unitOfWork;
		do {
			if (0 !== (completedWork.flags & 32768)) {
				unwindUnitOfWork(completedWork, workInProgressRootDidSkipSuspendedSiblings);
				return;
			}
			unitOfWork = completedWork.return;
			var next = completeWork(completedWork.alternate, completedWork, entangledRenderLanes);
			if (null !== next) {
				workInProgress = next;
				return;
			}
			completedWork = completedWork.sibling;
			if (null !== completedWork) {
				workInProgress = completedWork;
				return;
			}
			workInProgress = completedWork = unitOfWork;
		} while (null !== completedWork);
		0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
	}
	function unwindUnitOfWork(unitOfWork, skipSiblings) {
		do {
			var next = unwindWork(unitOfWork.alternate, unitOfWork);
			if (null !== next) {
				next.flags &= 32767;
				workInProgress = next;
				return;
			}
			next = unitOfWork.return;
			null !== next && (next.flags |= 32768, next.subtreeFlags = 0, next.deletions = null);
			if (!skipSiblings && (unitOfWork = unitOfWork.sibling, null !== unitOfWork)) {
				workInProgress = unitOfWork;
				return;
			}
			workInProgress = unitOfWork = next;
		} while (null !== unitOfWork);
		workInProgressRootExitStatus = 6;
		workInProgress = null;
	}
	function completeRoot(root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedState) {
		root.cancelPendingCommit = null;
		do
			flushPendingEffects();
		while (0 !== pendingEffectsStatus);
		if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(327));
		if (null !== finishedWork) {
			if (finishedWork === root.current) throw Error(formatProdErrorMessage(177));
			root === workInProgressRoot && (workInProgress = workInProgressRoot = null, workInProgressRootRenderLanes = 0);
			pendingFinishedWork = finishedWork;
			pendingEffectsRoot = root;
			pendingEffectsLanes = lanes;
			pendingPassiveTransitions = transitions;
			pendingRecoverableErrors = recoverableErrors;
			commitRoot(root, finishedWork, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, suspendedState);
		}
	}
	function commitRoot(root, finishedWork, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, suspendedState) {
		var remainingLanes = finishedWork.lanes | finishedWork.childLanes;
		pendingEffectsRemainingLanes = remainingLanes;
		remainingLanes |= concurrentlyUpdatedLanes;
		markRootFinished(root, lanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes);
		pendingViewTransitionEvents = null;
		(lanes & 335544064) === lanes ? (pendingTransitionTypes = claimQueuedTransitionTypes(root), spawnedLane = 10262) : (pendingTransitionTypes = null, spawnedLane = 10256);
		0 !== (finishedWork.subtreeFlags & spawnedLane) || 0 !== (finishedWork.flags & spawnedLane) ? (root.callbackNode = null, root.callbackPriority = 0, scheduleCallback$1(NormalPriority$1, function() {
			flushPassiveEffects();
			return null;
		})) : (root.callbackNode = null, root.callbackPriority = 0);
		shouldStartViewTransition = !1;
		spawnedLane = 0 !== (finishedWork.flags & 13878);
		if (0 !== (finishedWork.subtreeFlags & 13878) || spawnedLane) {
			spawnedLane = ReactSharedInternals.T;
			ReactSharedInternals.T = null;
			updatedLanes = ReactDOMSharedInternals.p;
			ReactDOMSharedInternals.p = 2;
			suspendedRetryLanes = executionContext;
			executionContext |= 4;
			try {
				commitBeforeMutationEffects(root, finishedWork, lanes);
			} finally {
				executionContext = suspendedRetryLanes, ReactDOMSharedInternals.p = updatedLanes, ReactSharedInternals.T = spawnedLane;
			}
		}
		pendingEffectsStatus = 1;
		shouldStartViewTransition ? pendingViewTransition = startViewTransition(suspendedState, root.containerInfo, pendingTransitionTypes, flushMutationEffects, flushLayoutEffects, flushAfterMutationEffects, flushSpawnedWork, flushPassiveEffects, reportViewTransitionError, null, null) : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
	}
	function reportViewTransitionError(error) {
		if (0 !== pendingEffectsStatus) (0, pendingEffectsRoot.onRecoverableError)(error, { componentStack: null });
	}
	function flushAfterMutationEffects() {
		3 === pendingEffectsStatus && (pendingEffectsStatus = 0, commitAfterMutationEffectsOnFiber(pendingFinishedWork, pendingEffectsRoot), pendingEffectsStatus = 4);
	}
	function flushMutationEffects() {
		if (1 === pendingEffectsStatus) {
			pendingEffectsStatus = 0;
			var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, rootMutationHasEffect = 0 !== (finishedWork.flags & 13878);
			if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
				rootMutationHasEffect = ReactSharedInternals.T;
				ReactSharedInternals.T = null;
				var previousPriority = ReactDOMSharedInternals.p;
				ReactDOMSharedInternals.p = 2;
				var prevExecutionContext = executionContext;
				executionContext |= 4;
				try {
					inUpdateViewTransition = rootViewTransitionAffected = !1;
					commitMutationEffectsOnFiber(finishedWork, root, lanes);
					lanes = selectionInformation;
					var curFocusedElem = getActiveElementDeep(root.containerInfo), priorFocusedElem = lanes.focusedElem, priorSelectionRange = lanes.selectionRange;
					if (curFocusedElem !== priorFocusedElem && priorFocusedElem && priorFocusedElem.ownerDocument && containsNode(priorFocusedElem.ownerDocument.documentElement, priorFocusedElem)) {
						if (null !== priorSelectionRange && hasSelectionCapabilities(priorFocusedElem)) {
							var start = priorSelectionRange.start, end = priorSelectionRange.end;
							void 0 === end && (end = start);
							if ("selectionStart" in priorFocusedElem) priorFocusedElem.selectionStart = start, priorFocusedElem.selectionEnd = Math.min(end, priorFocusedElem.value.length);
							else {
								var doc = priorFocusedElem.ownerDocument || document, win = doc && doc.defaultView || window;
								if (win.getSelection) {
									var selection = win.getSelection(), length = priorFocusedElem.textContent.length, start$jscomp$0 = Math.min(priorSelectionRange.start, length), end$jscomp$0 = void 0 === priorSelectionRange.end ? start$jscomp$0 : Math.min(priorSelectionRange.end, length);
									!selection.extend && start$jscomp$0 > end$jscomp$0 && (curFocusedElem = end$jscomp$0, end$jscomp$0 = start$jscomp$0, start$jscomp$0 = curFocusedElem);
									var startMarker = getNodeForCharacterOffset(priorFocusedElem, start$jscomp$0), endMarker = getNodeForCharacterOffset(priorFocusedElem, end$jscomp$0);
									if (startMarker && endMarker && (1 !== selection.rangeCount || selection.anchorNode !== startMarker.node || selection.anchorOffset !== startMarker.offset || selection.focusNode !== endMarker.node || selection.focusOffset !== endMarker.offset)) {
										var range = doc.createRange();
										range.setStart(startMarker.node, startMarker.offset);
										selection.removeAllRanges();
										start$jscomp$0 > end$jscomp$0 ? (selection.addRange(range), selection.extend(endMarker.node, endMarker.offset)) : (range.setEnd(endMarker.node, endMarker.offset), selection.addRange(range));
									}
								}
							}
						}
						doc = [];
						for (selection = priorFocusedElem; selection = selection.parentNode;) 1 === selection.nodeType && doc.push({
							element: selection,
							left: selection.scrollLeft,
							top: selection.scrollTop
						});
						"function" === typeof priorFocusedElem.focus && priorFocusedElem.focus();
						for (priorFocusedElem = 0; priorFocusedElem < doc.length; priorFocusedElem++) {
							var info = doc[priorFocusedElem];
							info.element.scrollLeft = info.left;
							info.element.scrollTop = info.top;
						}
					}
					_enabled = !!eventsEnabled;
					selectionInformation = eventsEnabled = null;
				} finally {
					executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootMutationHasEffect;
				}
			}
			root.current = finishedWork;
			pendingEffectsStatus = 2;
		}
	}
	function flushLayoutEffects() {
		if (2 === pendingEffectsStatus) {
			pendingEffectsStatus = 0;
			var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, rootHasLayoutEffect = 0 !== (finishedWork.flags & 8772);
			if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
				rootHasLayoutEffect = ReactSharedInternals.T;
				ReactSharedInternals.T = null;
				var previousPriority = ReactDOMSharedInternals.p;
				ReactDOMSharedInternals.p = 2;
				var prevExecutionContext = executionContext;
				executionContext |= 4;
				try {
					commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
				} finally {
					executionContext = prevExecutionContext, ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = rootHasLayoutEffect;
				}
			}
			pendingEffectsStatus = 3;
		}
	}
	function flushSpawnedWork() {
		if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
			pendingEffectsStatus = 0;
			var committedViewTransition = pendingViewTransition;
			pendingViewTransition = null;
			requestPaint();
			var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, recoverableErrors = pendingRecoverableErrors, passiveSubtreeMask = (lanes & 335544064) === lanes ? 10262 : 10256;
			0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) || 0 !== (finishedWork.flags & passiveSubtreeMask) ? pendingEffectsStatus = 5 : (pendingEffectsStatus = 0, pendingFinishedWork = pendingEffectsRoot = null, releaseRootPooledCache(root, root.pendingLanes));
			passiveSubtreeMask = root.pendingLanes;
			0 === passiveSubtreeMask && (legacyErrorBoundariesThatAlreadyFailed = null);
			lanesToEventPriority(lanes);
			finishedWork = finishedWork.stateNode;
			if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot) try {
				injectedHook.onCommitFiberRoot(rendererID, finishedWork, void 0, 128 === (finishedWork.current.flags & 128));
			} catch (err) {}
			if (null !== recoverableErrors) {
				finishedWork = ReactSharedInternals.T;
				passiveSubtreeMask = ReactDOMSharedInternals.p;
				ReactDOMSharedInternals.p = 2;
				ReactSharedInternals.T = null;
				try {
					for (var onRecoverableError = root.onRecoverableError, i = 0; i < recoverableErrors.length; i++) {
						var recoverableError = recoverableErrors[i];
						onRecoverableError(recoverableError.value, { componentStack: recoverableError.stack });
					}
				} finally {
					ReactSharedInternals.T = finishedWork, ReactDOMSharedInternals.p = passiveSubtreeMask;
				}
			}
			recoverableErrors = pendingViewTransitionEvents;
			onRecoverableError = pendingTransitionTypes;
			pendingTransitionTypes = null;
			if (null !== recoverableErrors && (pendingViewTransitionEvents = null, null === onRecoverableError && (onRecoverableError = []), null !== committedViewTransition)) for (recoverableError = 0; recoverableError < recoverableErrors.length; recoverableError++) finishedWork = (0, recoverableErrors[recoverableError])(onRecoverableError), void 0 !== finishedWork && committedViewTransition.finished.finally(finishedWork);
			0 !== (pendingEffectsLanes & 3) && flushPendingEffects();
			ensureRootIsScheduled(root);
			passiveSubtreeMask = root.pendingLanes;
			0 !== (lanes & 261930) && 0 !== (passiveSubtreeMask & 42) ? root === rootWithNestedUpdates ? nestedUpdateCount++ : (nestedUpdateCount = 0, rootWithNestedUpdates = root) : (nestedUpdateCount = 0, rootWithNestedUpdates = null);
			flushSyncWorkAcrossRoots_impl(0, !1);
		}
	}
	function releaseRootPooledCache(root, remainingLanes) {
		0 === (root.pooledCacheLanes &= remainingLanes) && (remainingLanes = root.pooledCache, null != remainingLanes && (root.pooledCache = null, releaseCache(remainingLanes)));
	}
	function flushPendingEffects() {
		null !== pendingViewTransition && (pendingViewTransition.skipTransition(), pendingViewTransition = null);
		flushMutationEffects();
		flushLayoutEffects();
		flushSpawnedWork();
		return flushPassiveEffects();
	}
	function flushPassiveEffects() {
		if (5 !== pendingEffectsStatus) return !1;
		var root = pendingEffectsRoot, remainingLanes = pendingEffectsRemainingLanes;
		pendingEffectsRemainingLanes = 0;
		var renderPriority = lanesToEventPriority(pendingEffectsLanes), prevTransition = ReactSharedInternals.T, previousPriority = ReactDOMSharedInternals.p;
		try {
			ReactDOMSharedInternals.p = 32 > renderPriority ? 32 : renderPriority;
			ReactSharedInternals.T = null;
			renderPriority = pendingPassiveTransitions;
			pendingPassiveTransitions = null;
			var root$jscomp$0 = pendingEffectsRoot, lanes = pendingEffectsLanes;
			pendingEffectsStatus = 0;
			pendingFinishedWork = pendingEffectsRoot = null;
			pendingEffectsLanes = 0;
			if (0 !== (executionContext & 6)) throw Error(formatProdErrorMessage(331));
			var prevExecutionContext = executionContext;
			executionContext |= 4;
			commitPassiveUnmountOnFiber(root$jscomp$0.current);
			commitPassiveMountOnFiber(root$jscomp$0, root$jscomp$0.current, lanes, renderPriority);
			executionContext = prevExecutionContext;
			flushSyncWorkAcrossRoots_impl(0, !1);
			if (injectedHook && "function" === typeof injectedHook.onPostCommitFiberRoot) try {
				injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
			} catch (err) {}
			return !0;
		} finally {
			ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition, releaseRootPooledCache(root, remainingLanes);
		}
	}
	function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
		sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
		sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
		rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
		null !== rootFiber && (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
	}
	function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
		if (3 === sourceFiber.tag) captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
		else for (; null !== nearestMountedAncestor;) {
			if (3 === nearestMountedAncestor.tag) {
				captureCommitPhaseErrorOnRoot(nearestMountedAncestor, sourceFiber, error);
				break;
			} else if (1 === nearestMountedAncestor.tag) {
				var instance = nearestMountedAncestor.stateNode;
				if ("function" === typeof nearestMountedAncestor.type.getDerivedStateFromError || "function" === typeof instance.componentDidCatch && (null === legacyErrorBoundariesThatAlreadyFailed || !legacyErrorBoundariesThatAlreadyFailed.has(instance))) {
					sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
					error = createClassErrorUpdate(2);
					instance = enqueueUpdate(nearestMountedAncestor, error, 2);
					null !== instance && (initializeClassErrorUpdate(error, instance, nearestMountedAncestor, sourceFiber), markRootUpdated$1(instance, 2), ensureRootIsScheduled(instance));
					break;
				}
			}
			nearestMountedAncestor = nearestMountedAncestor.return;
		}
	}
	function attachPingListener(root, wakeable, lanes) {
		var pingCache = root.pingCache;
		if (null === pingCache) {
			pingCache = root.pingCache = new PossiblyWeakMap();
			var threadIDs = /* @__PURE__ */ new Set();
			pingCache.set(wakeable, threadIDs);
		} else threadIDs = pingCache.get(wakeable), void 0 === threadIDs && (threadIDs = /* @__PURE__ */ new Set(), pingCache.set(wakeable, threadIDs));
		threadIDs.has(lanes) || (workInProgressRootDidAttachPingListener = !0, threadIDs.add(lanes), root = pingSuspendedRoot.bind(null, root, wakeable, lanes), wakeable.then(root, root));
	}
	function pingSuspendedRoot(root, wakeable, pingedLanes) {
		var pingCache = root.pingCache;
		null !== pingCache && pingCache.delete(wakeable);
		root.pingedLanes |= root.suspendedLanes & pingedLanes;
		root.warmLanes &= ~pingedLanes;
		workInProgressRoot === root && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes && (4 === workInProgressRootExitStatus || 3 === workInProgressRootExitStatus && (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes && 300 > now() - globalMostRecentFallbackTime ? 0 === (executionContext & 2) ? prepareFreshStack(root, 0) : workInProgressRootPingedLanes |= pingedLanes : workInProgressRootPingedLanes |= pingedLanes, workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes && (workInProgressSuspendedRetryLanes = 0));
		ensureRootIsScheduled(root);
	}
	function retryTimedOutBoundary(boundaryFiber, retryLane) {
		0 === retryLane && (retryLane = claimNextRetryLane());
		boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
		null !== boundaryFiber && (markRootUpdated$1(boundaryFiber, retryLane), ensureRootIsScheduled(boundaryFiber));
	}
	function retryDehydratedSuspenseBoundary(boundaryFiber) {
		var suspenseState = boundaryFiber.memoizedState, retryLane = 0;
		null !== suspenseState && (retryLane = suspenseState.retryLane);
		retryTimedOutBoundary(boundaryFiber, retryLane);
	}
	function resolveRetryWakeable(boundaryFiber, wakeable) {
		var retryLane = 0;
		switch (boundaryFiber.tag) {
			case 31:
			case 13:
				var retryCache = boundaryFiber.stateNode;
				var suspenseState = boundaryFiber.memoizedState;
				null !== suspenseState && (retryLane = suspenseState.retryLane);
				break;
			case 19:
				retryCache = boundaryFiber.stateNode;
				break;
			case 22:
				retryCache = boundaryFiber.stateNode._retryCache;
				break;
			default: throw Error(formatProdErrorMessage(314));
		}
		null !== retryCache && retryCache.delete(wakeable);
		retryTimedOutBoundary(boundaryFiber, retryLane);
	}
	function scheduleCallback$1(priorityLevel, callback) {
		return scheduleCallback$3(priorityLevel, callback);
	}
	var firstScheduledRoot = null;
	var lastScheduledRoot = null;
	var didScheduleMicrotask = !1;
	var mightHavePendingSyncWork = !1;
	var isFlushingWork = !1;
	var currentEventTransitionLane = 0;
	function ensureRootIsScheduled(root) {
		root !== lastScheduledRoot && null === root.next && (null === lastScheduledRoot ? firstScheduledRoot = lastScheduledRoot = root : lastScheduledRoot = lastScheduledRoot.next = root);
		mightHavePendingSyncWork = !0;
		didScheduleMicrotask || (didScheduleMicrotask = !0, scheduleImmediateRootScheduleTask());
	}
	function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
		if (!isFlushingWork && mightHavePendingSyncWork) {
			isFlushingWork = !0;
			do {
				var didPerformSomeWork = !1;
				for (var root$190 = firstScheduledRoot; null !== root$190;) {
					if (!onlyLegacy) if (0 !== syncTransitionLanes) {
						var pendingLanes = root$190.pendingLanes;
						if (0 === pendingLanes) var JSCompiler_inline_result = 0;
						else {
							var suspendedLanes = root$190.suspendedLanes, pingedLanes = root$190.pingedLanes;
							JSCompiler_inline_result = (1 << 31 - clz32(42 | syncTransitionLanes) + 1) - 1;
							JSCompiler_inline_result &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
							JSCompiler_inline_result = JSCompiler_inline_result & 0xc000095 ? JSCompiler_inline_result & 0xc000095 | 1 : JSCompiler_inline_result ? JSCompiler_inline_result | 2 : 0;
						}
						0 !== JSCompiler_inline_result && (didPerformSomeWork = !0, performSyncWorkOnRoot(root$190, JSCompiler_inline_result));
					} else JSCompiler_inline_result = workInProgressRootRenderLanes, JSCompiler_inline_result = getNextLanes(root$190, root$190 === workInProgressRoot ? JSCompiler_inline_result : 0, null !== root$190.cancelPendingCommit || -1 !== root$190.timeoutHandle), 0 === (JSCompiler_inline_result & 3) || checkIfRootIsPrerendering(root$190, JSCompiler_inline_result) || (didPerformSomeWork = !0, performSyncWorkOnRoot(root$190, JSCompiler_inline_result));
					root$190 = root$190.next;
				}
			} while (didPerformSomeWork);
			isFlushingWork = !1;
		}
	}
	function processRootScheduleInImmediateTask() {
		processRootScheduleInMicrotask();
	}
	function processRootScheduleInMicrotask() {
		mightHavePendingSyncWork = didScheduleMicrotask = !1;
		var syncTransitionLanes = 0;
		0 !== currentEventTransitionLane && shouldAttemptEagerTransition() && (syncTransitionLanes = currentEventTransitionLane);
		for (var currentTime = now(), prev = null, root = firstScheduledRoot; null !== root;) {
			var next = root.next, nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
			if (0 === nextLanes) root.next = null, null === prev ? firstScheduledRoot = next : prev.next = next, null === next && (lastScheduledRoot = prev);
			else if (prev = root, 0 !== syncTransitionLanes || 0 !== (nextLanes & 3)) mightHavePendingSyncWork = !0;
			root = next;
		}
		0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus || flushSyncWorkAcrossRoots_impl(syncTransitionLanes, !1);
		0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
	}
	function scheduleTaskForRootDuringMicrotask(root, currentTime) {
		for (var suspendedLanes = root.suspendedLanes, pingedLanes = root.pingedLanes, expirationTimes = root.expirationTimes, lanes = root.pendingLanes & -62914561; 0 < lanes;) {
			var index$5 = 31 - clz32(lanes), lane = 1 << index$5, expirationTime = expirationTimes[index$5];
			if (-1 === expirationTime) {
				if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes)) expirationTimes[index$5] = computeExpirationTime(lane, currentTime);
			} else expirationTime <= currentTime && (root.expiredLanes |= lane);
			lanes &= ~lane;
		}
		currentTime = workInProgressRoot;
		suspendedLanes = workInProgressRootRenderLanes;
		suspendedLanes = getNextLanes(root, root === currentTime ? suspendedLanes : 0, null !== root.cancelPendingCommit || -1 !== root.timeoutHandle);
		pingedLanes = root.callbackNode;
		if (0 === suspendedLanes || root === currentTime && (2 === workInProgressSuspendedReason || 9 === workInProgressSuspendedReason) || null !== root.cancelPendingCommit) return null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes), root.callbackNode = null, root.callbackPriority = 0;
		if (0 === (suspendedLanes & 3) || checkIfRootIsPrerendering(root, suspendedLanes)) {
			currentTime = suspendedLanes & -suspendedLanes;
			if (currentTime === root.callbackPriority) return currentTime;
			null !== pingedLanes && cancelCallback$1(pingedLanes);
			switch (lanesToEventPriority(suspendedLanes)) {
				case 2:
				case 8:
					suspendedLanes = UserBlockingPriority;
					break;
				case 32:
					suspendedLanes = NormalPriority$1;
					break;
				case 268435456:
					suspendedLanes = IdlePriority;
					break;
				default: suspendedLanes = NormalPriority$1;
			}
			pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root);
			suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
			root.callbackPriority = currentTime;
			root.callbackNode = suspendedLanes;
			return currentTime;
		}
		null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
		root.callbackPriority = 2;
		root.callbackNode = null;
		return 2;
	}
	function performWorkOnRootViaSchedulerTask(root, didTimeout) {
		if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus) return root.callbackNode = null, root.callbackPriority = 0, null;
		var originalCallbackNode = root.callbackNode;
		if (flushPendingEffects() && root.callbackNode !== originalCallbackNode) return null;
		var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
		workInProgressRootRenderLanes$jscomp$0 = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0, null !== root.cancelPendingCommit || -1 !== root.timeoutHandle);
		if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
		performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
		scheduleTaskForRootDuringMicrotask(root, now());
		return null != root.callbackNode && root.callbackNode === originalCallbackNode ? performWorkOnRootViaSchedulerTask.bind(null, root) : null;
	}
	function performSyncWorkOnRoot(root, lanes) {
		if (flushPendingEffects()) return null;
		performWorkOnRoot(root, lanes, !0);
	}
	function scheduleImmediateRootScheduleTask() {
		scheduleMicrotask(function() {
			0 !== (executionContext & 6) ? scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask) : processRootScheduleInMicrotask();
		});
	}
	function requestTransitionLane() {
		if (0 === currentEventTransitionLane) {
			var actionScopeLane = currentEntangledLane;
			0 === actionScopeLane && (actionScopeLane = nextTransitionUpdateLane, nextTransitionUpdateLane <<= 1, 0 === (nextTransitionUpdateLane & 261888) && (nextTransitionUpdateLane = 256));
			currentEventTransitionLane = actionScopeLane;
		}
		return currentEventTransitionLane;
	}
	function coerceFormActionProp(actionProp) {
		return null == actionProp || "symbol" === typeof actionProp || "boolean" === typeof actionProp ? null : "function" === typeof actionProp ? actionProp : sanitizeURL(actionProp);
	}
	function extractEvents$1(dispatchQueue, domEventName, maybeTargetInst, nativeEvent, nativeEventTarget) {
		if ("submit" === domEventName && maybeTargetInst && maybeTargetInst.stateNode === nativeEventTarget) {
			var action = coerceFormActionProp((nativeEventTarget[internalPropsKey] || null).action), submitter = nativeEvent.submitter;
			submitter && (domEventName = (domEventName = submitter[internalPropsKey] || null) ? coerceFormActionProp(domEventName.formAction) : submitter.getAttribute("formAction"), null !== domEventName && (action = domEventName, submitter = null));
			var event = new SyntheticEvent("action", "action", null, nativeEvent, nativeEventTarget);
			dispatchQueue.push({
				event,
				listeners: [{
					instance: null,
					listener: function() {
						if (nativeEvent.defaultPrevented) {
							if (0 !== currentEventTransitionLane) {
								var formData = new FormData(nativeEventTarget, submitter);
								startHostTransition(maybeTargetInst, {
									pending: !0,
									data: formData,
									method: nativeEventTarget.method,
									action
								}, null, formData);
							}
						} else "function" === typeof action && (event.preventDefault(), formData = new FormData(nativeEventTarget, submitter), startHostTransition(maybeTargetInst, {
							pending: !0,
							data: formData,
							method: nativeEventTarget.method,
							action
						}, action, formData));
					},
					currentTarget: nativeEventTarget
				}]
			});
		}
	}
	for (var i$jscomp$inline_1667 = 0; i$jscomp$inline_1667 < simpleEventPluginEvents.length; i$jscomp$inline_1667++) {
		var eventName$jscomp$inline_1668 = simpleEventPluginEvents[i$jscomp$inline_1667];
		registerSimpleEvent(eventName$jscomp$inline_1668.toLowerCase(), "on" + (eventName$jscomp$inline_1668[0].toUpperCase() + eventName$jscomp$inline_1668.slice(1)));
	}
	registerSimpleEvent(ANIMATION_END, "onAnimationEnd");
	registerSimpleEvent(ANIMATION_ITERATION, "onAnimationIteration");
	registerSimpleEvent(ANIMATION_START, "onAnimationStart");
	registerSimpleEvent("dblclick", "onDoubleClick");
	registerSimpleEvent("focusin", "onFocus");
	registerSimpleEvent("focusout", "onBlur");
	registerSimpleEvent(TRANSITION_RUN, "onTransitionRun");
	registerSimpleEvent(TRANSITION_START, "onTransitionStart");
	registerSimpleEvent(TRANSITION_CANCEL, "onTransitionCancel");
	registerSimpleEvent(TRANSITION_END, "onTransitionEnd");
	registerDirectEvent("onMouseEnter", ["mouseout", "mouseover"]);
	registerDirectEvent("onMouseLeave", ["mouseout", "mouseover"]);
	registerDirectEvent("onPointerEnter", ["pointerout", "pointerover"]);
	registerDirectEvent("onPointerLeave", ["pointerout", "pointerover"]);
	registerTwoPhaseEvent("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
	registerTwoPhaseEvent("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
	registerTwoPhaseEvent("onBeforeInput", [
		"compositionend",
		"keypress",
		"textInput",
		"paste"
	]);
	registerTwoPhaseEvent("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
	registerTwoPhaseEvent("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
	registerTwoPhaseEvent("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
	var mediaEventTypes = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" ");
	var nonDelegatedEvents = new Set("beforetoggle cancel close invalid load scroll scrollend toggle".split(" ").concat(mediaEventTypes));
	function processDispatchQueue(dispatchQueue, eventSystemFlags) {
		eventSystemFlags = 0 !== (eventSystemFlags & 4);
		for (var i = 0; i < dispatchQueue.length; i++) {
			var _dispatchQueue$i = dispatchQueue[i], event = _dispatchQueue$i.event;
			_dispatchQueue$i = _dispatchQueue$i.listeners;
			a: {
				var previousInstance = void 0;
				if (eventSystemFlags) for (var i$jscomp$0 = _dispatchQueue$i.length - 1; 0 <= i$jscomp$0; i$jscomp$0--) {
					var _dispatchListeners$i = _dispatchQueue$i[i$jscomp$0], instance = _dispatchListeners$i.instance, currentTarget = _dispatchListeners$i.currentTarget;
					_dispatchListeners$i = _dispatchListeners$i.listener;
					if (instance !== previousInstance && event.isPropagationStopped()) break a;
					previousInstance = _dispatchListeners$i;
					event.currentTarget = currentTarget;
					try {
						previousInstance(event);
					} catch (error) {
						reportGlobalError(error);
					}
					event.currentTarget = null;
					previousInstance = instance;
				}
				else for (i$jscomp$0 = 0; i$jscomp$0 < _dispatchQueue$i.length; i$jscomp$0++) {
					_dispatchListeners$i = _dispatchQueue$i[i$jscomp$0];
					instance = _dispatchListeners$i.instance;
					currentTarget = _dispatchListeners$i.currentTarget;
					_dispatchListeners$i = _dispatchListeners$i.listener;
					if (instance !== previousInstance && event.isPropagationStopped()) break a;
					previousInstance = _dispatchListeners$i;
					event.currentTarget = currentTarget;
					try {
						previousInstance(event);
					} catch (error) {
						reportGlobalError(error);
					}
					event.currentTarget = null;
					previousInstance = instance;
				}
			}
		}
	}
	function listenToNonDelegatedEvent(domEventName, targetElement) {
		var JSCompiler_inline_result = targetElement[internalEventHandlersKey];
		void 0 === JSCompiler_inline_result && (JSCompiler_inline_result = targetElement[internalEventHandlersKey] = /* @__PURE__ */ new Set());
		var listenerSetKey = domEventName + "__bubble";
		JSCompiler_inline_result.has(listenerSetKey) || (addTrappedEventListener(targetElement, domEventName, 2, !1), JSCompiler_inline_result.add(listenerSetKey));
	}
	function listenToNativeEvent(domEventName, isCapturePhaseListener, target) {
		var eventSystemFlags = 0;
		isCapturePhaseListener && (eventSystemFlags |= 4);
		addTrappedEventListener(target, domEventName, eventSystemFlags, isCapturePhaseListener);
	}
	var listeningMarker = "_reactListening" + Math.random().toString(36).slice(2);
	function listenToAllSupportedEvents(rootContainerElement) {
		if (!rootContainerElement[listeningMarker]) {
			rootContainerElement[listeningMarker] = !0;
			allNativeEvents.forEach(function(domEventName) {
				"selectionchange" !== domEventName && (nonDelegatedEvents.has(domEventName) || listenToNativeEvent(domEventName, !1, rootContainerElement), listenToNativeEvent(domEventName, !0, rootContainerElement));
			});
			var ownerDocument = 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
			null === ownerDocument || ownerDocument[listeningMarker] || (ownerDocument[listeningMarker] = !0, listenToNativeEvent("selectionchange", !1, ownerDocument));
		}
	}
	function addTrappedEventListener(targetContainer, domEventName, eventSystemFlags, isCapturePhaseListener) {
		switch (getEventPriority(domEventName)) {
			case 2:
				var listenerWrapper = dispatchDiscreteEvent;
				break;
			case 8:
				listenerWrapper = dispatchContinuousEvent;
				break;
			default: listenerWrapper = dispatchEvent;
		}
		eventSystemFlags = listenerWrapper.bind(null, domEventName, eventSystemFlags, targetContainer);
		listenerWrapper = void 0;
		!passiveBrowserEventsSupported || "touchstart" !== domEventName && "touchmove" !== domEventName && "wheel" !== domEventName || (listenerWrapper = !0);
		isCapturePhaseListener ? void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, {
			capture: !0,
			passive: listenerWrapper
		}) : targetContainer.addEventListener(domEventName, eventSystemFlags, !0) : void 0 !== listenerWrapper ? targetContainer.addEventListener(domEventName, eventSystemFlags, { passive: listenerWrapper }) : targetContainer.addEventListener(domEventName, eventSystemFlags, !1);
	}
	function dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, targetInst$jscomp$0, targetContainer) {
		var ancestorInst = targetInst$jscomp$0;
		if (0 === (eventSystemFlags & 1) && 0 === (eventSystemFlags & 2) && null !== targetInst$jscomp$0) a: for (;;) {
			if (null === targetInst$jscomp$0) return;
			var nodeTag = targetInst$jscomp$0.tag;
			if (3 === nodeTag || 4 === nodeTag) {
				var container = targetInst$jscomp$0.stateNode.containerInfo;
				if (container === targetContainer) break;
				if (4 === nodeTag) for (nodeTag = targetInst$jscomp$0.return; null !== nodeTag;) {
					var grandTag = nodeTag.tag;
					if ((3 === grandTag || 4 === grandTag) && nodeTag.stateNode.containerInfo === targetContainer) return;
					nodeTag = nodeTag.return;
				}
				for (; null !== container;) {
					nodeTag = getClosestInstanceFromNode(container);
					if (null === nodeTag) return;
					grandTag = nodeTag.tag;
					if (5 === grandTag || 6 === grandTag || 26 === grandTag || 27 === grandTag) {
						targetInst$jscomp$0 = ancestorInst = nodeTag;
						continue a;
					}
					container = container.parentNode;
				}
			}
			targetInst$jscomp$0 = targetInst$jscomp$0.return;
		}
		batchedUpdates$1(function() {
			var targetInst = ancestorInst, nativeEventTarget = getEventTarget(nativeEvent), dispatchQueue = [];
			a: {
				var reactName = topLevelEventsToReactNames.get(domEventName);
				if (void 0 !== reactName) {
					var SyntheticEventCtor = SyntheticEvent, reactEventType = domEventName;
					switch (domEventName) {
						case "keypress": if (0 === getEventCharCode(nativeEvent)) break a;
						case "keydown":
						case "keyup":
							SyntheticEventCtor = SyntheticKeyboardEvent;
							break;
						case "focusin":
							reactEventType = "focus";
							SyntheticEventCtor = SyntheticFocusEvent;
							break;
						case "focusout":
							reactEventType = "blur";
							SyntheticEventCtor = SyntheticFocusEvent;
							break;
						case "beforeblur":
						case "afterblur":
							SyntheticEventCtor = SyntheticFocusEvent;
							break;
						case "click": if (2 === nativeEvent.button) break a;
						case "auxclick":
						case "dblclick":
						case "mousedown":
						case "mousemove":
						case "mouseup":
						case "mouseout":
						case "mouseover":
						case "contextmenu":
							SyntheticEventCtor = SyntheticMouseEvent;
							break;
						case "drag":
						case "dragend":
						case "dragenter":
						case "dragexit":
						case "dragleave":
						case "dragover":
						case "dragstart":
						case "drop":
							SyntheticEventCtor = SyntheticDragEvent;
							break;
						case "touchcancel":
						case "touchend":
						case "touchmove":
						case "touchstart":
							SyntheticEventCtor = SyntheticTouchEvent;
							break;
						case ANIMATION_END:
						case ANIMATION_ITERATION:
						case ANIMATION_START:
							SyntheticEventCtor = SyntheticAnimationEvent;
							break;
						case TRANSITION_END:
							SyntheticEventCtor = SyntheticTransitionEvent;
							break;
						case "scroll":
						case "scrollend":
							SyntheticEventCtor = SyntheticUIEvent;
							break;
						case "wheel":
							SyntheticEventCtor = SyntheticWheelEvent;
							break;
						case "copy":
						case "cut":
						case "paste":
							SyntheticEventCtor = SyntheticClipboardEvent;
							break;
						case "gotpointercapture":
						case "lostpointercapture":
						case "pointercancel":
						case "pointerdown":
						case "pointermove":
						case "pointerout":
						case "pointerover":
						case "pointerup":
							SyntheticEventCtor = SyntheticPointerEvent;
							break;
						case "submit":
							SyntheticEventCtor = SyntheticSubmitEvent;
							break;
						case "toggle":
						case "beforetoggle": SyntheticEventCtor = SyntheticToggleEvent;
					}
					var inCapturePhase = 0 !== (eventSystemFlags & 4), accumulateTargetOnly = !inCapturePhase && ("scroll" === domEventName || "scrollend" === domEventName), reactEventName = inCapturePhase ? null !== reactName ? reactName + "Capture" : null : reactName;
					inCapturePhase = [];
					for (var instance = targetInst, lastHostComponent; null !== instance;) {
						var _instance = instance;
						lastHostComponent = _instance.stateNode;
						_instance = _instance.tag;
						5 !== _instance && 26 !== _instance && 27 !== _instance || null === lastHostComponent || null === reactEventName || (_instance = getListener(instance, reactEventName), null != _instance && inCapturePhase.push(createDispatchListener(instance, _instance, lastHostComponent)));
						if (accumulateTargetOnly) break;
						instance = instance.return;
					}
					0 < inCapturePhase.length && (reactName = new SyntheticEventCtor(reactName, reactEventType, null, nativeEvent, nativeEventTarget), dispatchQueue.push({
						event: reactName,
						listeners: inCapturePhase
					}));
				}
			}
			if (0 === (eventSystemFlags & 7)) {
				a: {
					SyntheticEventCtor = "mouseover" === domEventName || "pointerover" === domEventName;
					reactName = "mouseout" === domEventName || "pointerout" === domEventName;
					if (SyntheticEventCtor && nativeEvent !== currentReplayingEvent && (reactEventType = nativeEvent.relatedTarget || nativeEvent.fromElement) && (getClosestInstanceFromNode(reactEventType) || reactEventType[internalContainerInstanceKey])) break a;
					if (reactName || SyntheticEventCtor) {
						reactEventType = nativeEventTarget.window === nativeEventTarget ? nativeEventTarget : (SyntheticEventCtor = nativeEventTarget.ownerDocument) ? SyntheticEventCtor.defaultView || SyntheticEventCtor.parentWindow : window;
						if (reactName) {
							if (SyntheticEventCtor = nativeEvent.relatedTarget || nativeEvent.toElement, reactName = targetInst, SyntheticEventCtor = SyntheticEventCtor ? getClosestInstanceFromNode(SyntheticEventCtor) : null, null !== SyntheticEventCtor && (accumulateTargetOnly = getNearestMountedFiber(SyntheticEventCtor), inCapturePhase = SyntheticEventCtor.tag, SyntheticEventCtor !== accumulateTargetOnly || 5 !== inCapturePhase && 27 !== inCapturePhase && 6 !== inCapturePhase)) SyntheticEventCtor = null;
						} else reactName = null, SyntheticEventCtor = targetInst;
						if (reactName !== SyntheticEventCtor) {
							inCapturePhase = SyntheticMouseEvent;
							_instance = "onMouseLeave";
							reactEventName = "onMouseEnter";
							instance = "mouse";
							if ("pointerout" === domEventName || "pointerover" === domEventName) inCapturePhase = SyntheticPointerEvent, _instance = "onPointerLeave", reactEventName = "onPointerEnter", instance = "pointer";
							accumulateTargetOnly = null == reactName ? reactEventType : getNodeFromInstance(reactName);
							lastHostComponent = null == SyntheticEventCtor ? reactEventType : getNodeFromInstance(SyntheticEventCtor);
							reactEventType = new inCapturePhase(_instance, instance + "leave", reactName, nativeEvent, nativeEventTarget);
							reactEventType.target = accumulateTargetOnly;
							reactEventType.relatedTarget = lastHostComponent;
							_instance = null;
							getClosestInstanceFromNode(nativeEventTarget) === targetInst && (inCapturePhase = new inCapturePhase(reactEventName, instance + "enter", SyntheticEventCtor, nativeEvent, nativeEventTarget), inCapturePhase.target = lastHostComponent, inCapturePhase.relatedTarget = accumulateTargetOnly, _instance = inCapturePhase);
							accumulateTargetOnly = _instance;
							inCapturePhase = reactName && SyntheticEventCtor ? getLowestCommonAncestor(reactName, SyntheticEventCtor, getParent) : null;
							null !== reactName && accumulateEnterLeaveListenersForEvent(dispatchQueue, reactEventType, reactName, inCapturePhase, !1);
							null !== SyntheticEventCtor && null !== accumulateTargetOnly && accumulateEnterLeaveListenersForEvent(dispatchQueue, accumulateTargetOnly, SyntheticEventCtor, inCapturePhase, !0);
						}
					}
				}
				a: {
					reactName = targetInst ? getNodeFromInstance(targetInst) : window;
					SyntheticEventCtor = reactName.nodeName && reactName.nodeName.toLowerCase();
					if ("select" === SyntheticEventCtor || "input" === SyntheticEventCtor && "file" === reactName.type) var getTargetInstFunc = getTargetInstForChangeEvent;
					else if (isTextInputElement(reactName)) if (isInputEventSupported) getTargetInstFunc = getTargetInstForInputOrChangeEvent;
					else {
						getTargetInstFunc = getTargetInstForInputEventPolyfill;
						var handleEventFunc = handleEventsForInputEventPolyfill;
					}
					else SyntheticEventCtor = reactName.nodeName, !SyntheticEventCtor || "input" !== SyntheticEventCtor.toLowerCase() || "checkbox" !== reactName.type && "radio" !== reactName.type ? targetInst && isCustomElement(targetInst.elementType) && (getTargetInstFunc = getTargetInstForChangeEvent) : getTargetInstFunc = getTargetInstForClickEvent;
					if (getTargetInstFunc && (getTargetInstFunc = getTargetInstFunc(domEventName, targetInst))) {
						createAndAccumulateChangeEvent(dispatchQueue, getTargetInstFunc, nativeEvent, nativeEventTarget);
						break a;
					}
					handleEventFunc && handleEventFunc(domEventName, reactName, targetInst);
				}
				handleEventFunc = targetInst ? getNodeFromInstance(targetInst) : window;
				switch (domEventName) {
					case "focusin":
						if (isTextInputElement(handleEventFunc) || "true" === handleEventFunc.contentEditable) activeElement = handleEventFunc, activeElementInst = targetInst, lastSelection = null;
						break;
					case "focusout":
						lastSelection = activeElementInst = activeElement = null;
						break;
					case "mousedown":
						mouseDown = !0;
						break;
					case "contextmenu":
					case "mouseup":
					case "dragend":
						mouseDown = !1;
						constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
						break;
					case "selectionchange": if (skipSelectionChangeEvent) break;
					case "keydown":
					case "keyup": constructSelectEvent(dispatchQueue, nativeEvent, nativeEventTarget);
				}
				var fallbackData;
				if (canUseCompositionEvent) b: {
					switch (domEventName) {
						case "compositionstart":
							var eventType = "onCompositionStart";
							break b;
						case "compositionend":
							eventType = "onCompositionEnd";
							break b;
						case "compositionupdate":
							eventType = "onCompositionUpdate";
							break b;
					}
					eventType = void 0;
				}
				else isComposing ? isFallbackCompositionEnd(domEventName, nativeEvent) && (eventType = "onCompositionEnd") : "keydown" === domEventName && 229 === nativeEvent.keyCode && (eventType = "onCompositionStart");
				eventType && (useFallbackCompositionData && "ko" !== nativeEvent.locale && (isComposing || "onCompositionStart" !== eventType ? "onCompositionEnd" === eventType && isComposing && (fallbackData = getData()) : (root = nativeEventTarget, startText = "value" in root ? root.value : root.textContent, isComposing = !0)), handleEventFunc = accumulateTwoPhaseListeners(targetInst, eventType), 0 < handleEventFunc.length && (eventType = new SyntheticCompositionEvent(eventType, domEventName, null, nativeEvent, nativeEventTarget), dispatchQueue.push({
					event: eventType,
					listeners: handleEventFunc
				}), fallbackData ? eventType.data = fallbackData : (fallbackData = getDataFromCustomEvent(nativeEvent), null !== fallbackData && (eventType.data = fallbackData))));
				if (fallbackData = canUseTextInputEvent ? getNativeBeforeInputChars(domEventName, nativeEvent) : getFallbackBeforeInputChars(domEventName, nativeEvent)) eventType = accumulateTwoPhaseListeners(targetInst, "onBeforeInput"), 0 < eventType.length && (handleEventFunc = new SyntheticCompositionEvent("onBeforeInput", "beforeinput", null, nativeEvent, nativeEventTarget), dispatchQueue.push({
					event: handleEventFunc,
					listeners: eventType
				}), handleEventFunc.data = fallbackData);
				extractEvents$1(dispatchQueue, domEventName, targetInst, nativeEvent, nativeEventTarget);
			}
			processDispatchQueue(dispatchQueue, eventSystemFlags);
		});
	}
	function createDispatchListener(instance, listener, currentTarget) {
		return {
			instance,
			listener,
			currentTarget
		};
	}
	function accumulateTwoPhaseListeners(targetFiber, reactName) {
		for (var captureName = reactName + "Capture", listeners = []; null !== targetFiber;) {
			var _instance2 = targetFiber, stateNode = _instance2.stateNode;
			_instance2 = _instance2.tag;
			5 !== _instance2 && 26 !== _instance2 && 27 !== _instance2 || null === stateNode || (_instance2 = getListener(targetFiber, captureName), null != _instance2 && listeners.unshift(createDispatchListener(targetFiber, _instance2, stateNode)), _instance2 = getListener(targetFiber, reactName), null != _instance2 && listeners.push(createDispatchListener(targetFiber, _instance2, stateNode)));
			if (3 === targetFiber.tag) return listeners;
			targetFiber = targetFiber.return;
		}
		return [];
	}
	function getParent(inst) {
		if (null === inst) return null;
		do
			inst = inst.return;
		while (inst && 5 !== inst.tag && 27 !== inst.tag);
		return inst ? inst : null;
	}
	function accumulateEnterLeaveListenersForEvent(dispatchQueue, event, target, common, inCapturePhase) {
		for (var registrationName = event._reactName, listeners = []; null !== target && target !== common;) {
			var _instance3 = target, alternate = _instance3.alternate, stateNode = _instance3.stateNode;
			_instance3 = _instance3.tag;
			if (null !== alternate && alternate === common) break;
			5 !== _instance3 && 26 !== _instance3 && 27 !== _instance3 || null === stateNode || (alternate = stateNode, inCapturePhase ? (stateNode = getListener(target, registrationName), null != stateNode && listeners.unshift(createDispatchListener(target, stateNode, alternate))) : inCapturePhase || (stateNode = getListener(target, registrationName), null != stateNode && listeners.push(createDispatchListener(target, stateNode, alternate))));
			target = target.return;
		}
		0 !== listeners.length && dispatchQueue.push({
			event,
			listeners
		});
	}
	var NORMALIZE_NEWLINES_REGEX = /\r\n?/g;
	var NORMALIZE_NULL_AND_REPLACEMENT_REGEX = /\u0000|\uFFFD/g;
	function normalizeMarkupForTextOrAttribute(markup) {
		return ("string" === typeof markup ? markup : "" + markup).replace(NORMALIZE_NEWLINES_REGEX, "\n").replace(NORMALIZE_NULL_AND_REPLACEMENT_REGEX, "");
	}
	function checkForUnmatchedText(serverText, clientText) {
		clientText = normalizeMarkupForTextOrAttribute(clientText);
		return normalizeMarkupForTextOrAttribute(serverText) === clientText ? !0 : !1;
	}
	function setProp(domElement, tag, key, value, props, prevValue) {
		switch (key) {
			case "children":
				if ("string" === typeof value) "body" === tag || "textarea" === tag && "" === value || setTextContent(domElement, value);
				else if ("number" === typeof value || "bigint" === typeof value) "body" !== tag && setTextContent(domElement, "" + value);
				else return;
				break;
			case "className":
				setValueForKnownAttribute(domElement, "class", value);
				break;
			case "tabIndex":
				setValueForKnownAttribute(domElement, "tabindex", value);
				break;
			case "dir":
			case "role":
			case "viewBox":
			case "width":
			case "height":
				setValueForKnownAttribute(domElement, key, value);
				break;
			case "style":
				setValueForStyles(domElement, value, prevValue);
				return;
			case "data": if ("object" !== tag) {
				setValueForKnownAttribute(domElement, "data", value);
				break;
			}
			case "src":
			case "href":
				if ("" === value && ("a" !== tag || "href" !== key)) {
					domElement.removeAttribute(key);
					break;
				}
				if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value) {
					domElement.removeAttribute(key);
					break;
				}
				value = sanitizeURL(value);
				domElement.setAttribute(key, value);
				break;
			case "action":
			case "formAction":
				if ("function" === typeof value) {
					domElement.setAttribute(key, "javascript:throw new Error('A React form was unexpectedly submitted. If you called form.submit() manually, consider using form.requestSubmit() instead. If you\\'re trying to use event.stopPropagation() in a submit event handler, consider also calling event.preventDefault().')");
					break;
				} else "function" === typeof prevValue && ("formAction" === key ? ("input" !== tag && setProp(domElement, tag, "name", props.name, props, null), setProp(domElement, tag, "formEncType", props.formEncType, props, null), setProp(domElement, tag, "formMethod", props.formMethod, props, null), setProp(domElement, tag, "formTarget", props.formTarget, props, null)) : (setProp(domElement, tag, "encType", props.encType, props, null), setProp(domElement, tag, "method", props.method, props, null), setProp(domElement, tag, "target", props.target, props, null)));
				if (null == value || "symbol" === typeof value || "boolean" === typeof value) {
					domElement.removeAttribute(key);
					break;
				}
				value = sanitizeURL(value);
				domElement.setAttribute(key, value);
				break;
			case "onClick":
				null != value && (domElement.onclick = noop$1);
				return;
			case "onScroll":
				null != value && listenToNonDelegatedEvent("scroll", domElement);
				return;
			case "onScrollEnd":
				null != value && listenToNonDelegatedEvent("scrollend", domElement);
				return;
			case "dangerouslySetInnerHTML":
				if (null != value) {
					if ("object" !== typeof value || !("__html" in value)) throw Error(formatProdErrorMessage(61));
					key = value.__html;
					if (null != key) {
						if (null != props.children) throw Error(formatProdErrorMessage(60));
						(null != prevValue ? prevValue.__html : void 0) !== key && (domElement.innerHTML = key);
					}
				}
				break;
			case "multiple":
				domElement.multiple = value && "function" !== typeof value && "symbol" !== typeof value;
				break;
			case "muted":
				domElement.muted = value && "function" !== typeof value && "symbol" !== typeof value;
				break;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "defaultValue":
			case "defaultChecked":
			case "innerHTML":
			case "ref": break;
			case "autoFocus": break;
			case "xlinkHref":
				if (null == value || "function" === typeof value || "boolean" === typeof value || "symbol" === typeof value) {
					domElement.removeAttribute("xlink:href");
					break;
				}
				key = sanitizeURL(value);
				domElement.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", key);
				break;
			case "contentEditable":
			case "spellCheck":
			case "draggable":
			case "value":
			case "autoReverse":
			case "externalResourcesRequired":
			case "focusable":
			case "preserveAlpha":
				null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
				break;
			case "inert":
			case "allowFullScreen":
			case "async":
			case "autoPlay":
			case "controls":
			case "credentialless":
			case "default":
			case "defer":
			case "disabled":
			case "disablePictureInPicture":
			case "disableRemotePlayback":
			case "formNoValidate":
			case "hidden":
			case "loop":
			case "noModule":
			case "noValidate":
			case "open":
			case "playsInline":
			case "readOnly":
			case "required":
			case "reversed":
			case "scoped":
			case "seamless":
			case "itemScope":
				value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, "") : domElement.removeAttribute(key);
				break;
			case "capture":
			case "download":
				!0 === value ? domElement.setAttribute(key, "") : !1 !== value && null != value && "function" !== typeof value && "symbol" !== typeof value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
				break;
			case "cols":
			case "rows":
			case "size":
			case "span":
				null != value && "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value ? domElement.setAttribute(key, value) : domElement.removeAttribute(key);
				break;
			case "rowSpan":
			case "start":
				null == value || "function" === typeof value || "symbol" === typeof value || isNaN(value) ? domElement.removeAttribute(key) : domElement.setAttribute(key, value);
				break;
			case "popover":
				listenToNonDelegatedEvent("beforetoggle", domElement);
				listenToNonDelegatedEvent("toggle", domElement);
				setValueForAttribute(domElement, "popover", value);
				break;
			case "xlinkActuate":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:actuate", value);
				break;
			case "xlinkArcrole":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:arcrole", value);
				break;
			case "xlinkRole":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:role", value);
				break;
			case "xlinkShow":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:show", value);
				break;
			case "xlinkTitle":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:title", value);
				break;
			case "xlinkType":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/1999/xlink", "xlink:type", value);
				break;
			case "xmlBase":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/XML/1998/namespace", "xml:base", value);
				break;
			case "xmlLang":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/XML/1998/namespace", "xml:lang", value);
				break;
			case "xmlSpace":
				setValueForNamespacedAttribute(domElement, "http://www.w3.org/XML/1998/namespace", "xml:space", value);
				break;
			case "is":
				setValueForAttribute(domElement, "is", value);
				break;
			case "innerText":
			case "textContent": return;
			default: if (!(2 < key.length) || "o" !== key[0] && "O" !== key[0] || "n" !== key[1] && "N" !== key[1]) key = aliases.get(key) || key, setValueForAttribute(domElement, key, value);
			else return;
		}
		viewTransitionMutationContext = !0;
	}
	function setPropOnCustomElement(domElement, tag, key, value, props, prevValue) {
		switch (key) {
			case "style":
				setValueForStyles(domElement, value, prevValue);
				return;
			case "dangerouslySetInnerHTML":
				if (null != value) {
					if ("object" !== typeof value || !("__html" in value)) throw Error(formatProdErrorMessage(61));
					key = value.__html;
					if (null != key) {
						if (null != props.children) throw Error(formatProdErrorMessage(60));
						(null != prevValue ? prevValue.__html : void 0) !== key && (domElement.innerHTML = key);
					}
				}
				break;
			case "children":
				if ("string" === typeof value) setTextContent(domElement, value);
				else if ("number" === typeof value || "bigint" === typeof value) setTextContent(domElement, "" + value);
				else return;
				break;
			case "onScroll":
				null != value && listenToNonDelegatedEvent("scroll", domElement);
				return;
			case "onScrollEnd":
				null != value && listenToNonDelegatedEvent("scrollend", domElement);
				return;
			case "onClick":
				null != value && (domElement.onclick = noop$1);
				return;
			case "suppressContentEditableWarning":
			case "suppressHydrationWarning":
			case "innerHTML":
			case "ref": return;
			case "innerText":
			case "textContent": return;
			default:
				if (!registrationNameDependencies.hasOwnProperty(key)) a: {
					if ("o" === key[0] && "n" === key[1] && (props = key.endsWith("Capture"), prevValue = key.slice(2, props ? key.length - 7 : void 0), tag = domElement[internalPropsKey] || null, tag = null != tag ? tag[key] : null, "function" === typeof tag && domElement.removeEventListener(prevValue, tag, props), "function" === typeof value)) {
						"function" !== typeof tag && null !== tag && (key in domElement ? domElement[key] = null : domElement.hasAttribute(key) && domElement.removeAttribute(key));
						domElement.addEventListener(prevValue, value, props);
						break a;
					}
					viewTransitionMutationContext = !0;
					key in domElement ? domElement[key] = value : !0 === value ? domElement.setAttribute(key, "") : setValueForAttribute(domElement, key, value);
				}
				return;
		}
		viewTransitionMutationContext = !0;
	}
	function setInitialProperties(domElement, tag, props) {
		switch (tag) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "img":
				listenToNonDelegatedEvent("error", domElement);
				listenToNonDelegatedEvent("load", domElement);
				var hasSrc = !1, hasSrcSet = !1, propKey;
				for (propKey in props) if (props.hasOwnProperty(propKey)) {
					var propValue = props[propKey];
					if (null != propValue) switch (propKey) {
						case "src":
							hasSrc = !0;
							break;
						case "srcSet":
							hasSrcSet = !0;
							break;
						case "children":
						case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(137, tag));
						default: setProp(domElement, tag, propKey, propValue, props, null);
					}
				}
				hasSrcSet && setProp(domElement, tag, "srcSet", props.srcSet, props, null);
				hasSrc && setProp(domElement, tag, "src", props.src, props, null);
				return;
			case "input":
				listenToNonDelegatedEvent("invalid", domElement);
				var defaultValue = propKey = propValue = hasSrcSet = null, checked = null, defaultChecked = null;
				for (hasSrc in props) if (props.hasOwnProperty(hasSrc)) {
					var propValue$204 = props[hasSrc];
					if (null != propValue$204) switch (hasSrc) {
						case "name":
							hasSrcSet = propValue$204;
							break;
						case "type":
							propValue = propValue$204;
							break;
						case "checked":
							checked = propValue$204;
							break;
						case "defaultChecked":
							defaultChecked = propValue$204;
							break;
						case "value":
							propKey = propValue$204;
							break;
						case "defaultValue":
							defaultValue = propValue$204;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (null != propValue$204) throw Error(formatProdErrorMessage(137, tag));
							break;
						default: setProp(domElement, tag, hasSrc, propValue$204, props, null);
					}
				}
				initInput(domElement, propKey, defaultValue, checked, defaultChecked, propValue, hasSrcSet, !1);
				return;
			case "select":
				listenToNonDelegatedEvent("invalid", domElement);
				hasSrc = propValue = propKey = null;
				for (hasSrcSet in props) if (props.hasOwnProperty(hasSrcSet) && (defaultValue = props[hasSrcSet], null != defaultValue)) switch (hasSrcSet) {
					case "value":
						propKey = defaultValue;
						break;
					case "defaultValue":
						propValue = defaultValue;
						break;
					case "multiple": hasSrc = defaultValue;
					default: setProp(domElement, tag, hasSrcSet, defaultValue, props, null);
				}
				tag = propKey;
				props = propValue;
				domElement.multiple = !!hasSrc;
				null != tag ? updateOptions(domElement, !!hasSrc, tag, !1) : null != props && updateOptions(domElement, !!hasSrc, props, !0);
				return;
			case "textarea":
				listenToNonDelegatedEvent("invalid", domElement);
				propKey = hasSrcSet = hasSrc = null;
				for (propValue in props) if (props.hasOwnProperty(propValue) && (defaultValue = props[propValue], null != defaultValue)) switch (propValue) {
					case "value":
						hasSrc = defaultValue;
						break;
					case "defaultValue":
						hasSrcSet = defaultValue;
						break;
					case "children":
						propKey = defaultValue;
						break;
					case "dangerouslySetInnerHTML":
						if (null != defaultValue) throw Error(formatProdErrorMessage(91));
						break;
					default: setProp(domElement, tag, propValue, defaultValue, props, null);
				}
				initTextarea(domElement, hasSrc, hasSrcSet, propKey);
				return;
			case "option":
				for (checked in props) if (props.hasOwnProperty(checked) && (hasSrc = props[checked], null != hasSrc)) switch (checked) {
					case "selected":
						domElement.selected = hasSrc && "function" !== typeof hasSrc && "symbol" !== typeof hasSrc;
						break;
					default: setProp(domElement, tag, checked, hasSrc, props, null);
				}
				return;
			case "dialog":
				listenToNonDelegatedEvent("beforetoggle", domElement);
				listenToNonDelegatedEvent("toggle", domElement);
				listenToNonDelegatedEvent("cancel", domElement);
				listenToNonDelegatedEvent("close", domElement);
				break;
			case "iframe":
			case "object":
				listenToNonDelegatedEvent("load", domElement);
				break;
			case "video":
			case "audio":
				for (hasSrc = 0; hasSrc < mediaEventTypes.length; hasSrc++) listenToNonDelegatedEvent(mediaEventTypes[hasSrc], domElement);
				break;
			case "image":
				listenToNonDelegatedEvent("error", domElement);
				listenToNonDelegatedEvent("load", domElement);
				break;
			case "details":
				listenToNonDelegatedEvent("toggle", domElement);
				break;
			case "embed":
			case "source":
			case "link": listenToNonDelegatedEvent("error", domElement), listenToNonDelegatedEvent("load", domElement);
			case "area":
			case "base":
			case "br":
			case "col":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "track":
			case "wbr":
			case "menuitem":
				for (defaultChecked in props) if (props.hasOwnProperty(defaultChecked) && (hasSrc = props[defaultChecked], null != hasSrc)) switch (defaultChecked) {
					case "children":
					case "dangerouslySetInnerHTML": throw Error(formatProdErrorMessage(137, tag));
					default: setProp(domElement, tag, defaultChecked, hasSrc, props, null);
				}
				return;
			default: if (isCustomElement(tag)) {
				for (propValue$204 in props) props.hasOwnProperty(propValue$204) && (hasSrc = props[propValue$204], void 0 !== hasSrc && setPropOnCustomElement(domElement, tag, propValue$204, hasSrc, props, void 0));
				return;
			}
		}
		for (defaultValue in props) props.hasOwnProperty(defaultValue) && (hasSrc = props[defaultValue], null != hasSrc && setProp(domElement, tag, defaultValue, hasSrc, props, null));
	}
	var emptyProps = {};
	function updateProperties(domElement, tag, lastProps, nextProps) {
		switch (tag) {
			case "div":
			case "span":
			case "svg":
			case "path":
			case "a":
			case "g":
			case "p":
			case "li": break;
			case "input":
				var name = null, type = null, value = null, defaultValue = null, lastDefaultValue = null, checked = null, defaultChecked = null;
				for (propKey in lastProps) {
					var lastProp = lastProps[propKey];
					if (lastProps.hasOwnProperty(propKey) && null != lastProp) switch (propKey) {
						case "checked": break;
						case "value": break;
						case "defaultValue": lastDefaultValue = lastProp;
						default: nextProps.hasOwnProperty(propKey) || setProp(domElement, tag, propKey, null, nextProps, lastProp);
					}
				}
				for (var propKey$221 in nextProps) {
					var propKey = nextProps[propKey$221];
					lastProp = lastProps[propKey$221];
					if (nextProps.hasOwnProperty(propKey$221) && (null != propKey || null != lastProp)) switch (propKey$221) {
						case "type":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							type = propKey;
							break;
						case "name":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							name = propKey;
							break;
						case "checked":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							checked = propKey;
							break;
						case "defaultChecked":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							defaultChecked = propKey;
							break;
						case "value":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							value = propKey;
							break;
						case "defaultValue":
							propKey !== lastProp && (viewTransitionMutationContext = !0);
							defaultValue = propKey;
							break;
						case "children":
						case "dangerouslySetInnerHTML":
							if (null != propKey) throw Error(formatProdErrorMessage(137, tag));
							break;
						default: propKey !== lastProp && setProp(domElement, tag, propKey$221, propKey, nextProps, lastProp);
					}
				}
				updateInput(domElement, value, defaultValue, lastDefaultValue, checked, defaultChecked, type, name);
				return;
			case "select":
				propKey = value = defaultValue = propKey$221 = null;
				for (type in lastProps) if (lastDefaultValue = lastProps[type], lastProps.hasOwnProperty(type) && null != lastDefaultValue) switch (type) {
					case "value": break;
					case "multiple": propKey = lastDefaultValue;
					default: nextProps.hasOwnProperty(type) || setProp(domElement, tag, type, null, nextProps, lastDefaultValue);
				}
				for (name in nextProps) if (type = nextProps[name], lastDefaultValue = lastProps[name], nextProps.hasOwnProperty(name) && (null != type || null != lastDefaultValue)) switch (name) {
					case "value":
						type !== lastDefaultValue && (viewTransitionMutationContext = !0);
						propKey$221 = type;
						break;
					case "defaultValue":
						type !== lastDefaultValue && (viewTransitionMutationContext = !0);
						defaultValue = type;
						break;
					case "multiple": type !== lastDefaultValue && (viewTransitionMutationContext = !0), value = type;
					default: type !== lastDefaultValue && setProp(domElement, tag, name, type, nextProps, lastDefaultValue);
				}
				tag = defaultValue;
				lastProps = value;
				nextProps = propKey;
				null != propKey$221 ? updateOptions(domElement, !!lastProps, propKey$221, !1) : !!nextProps !== !!lastProps && (null != tag ? updateOptions(domElement, !!lastProps, tag, !0) : updateOptions(domElement, !!lastProps, lastProps ? [] : "", !1));
				return;
			case "textarea":
				propKey = propKey$221 = null;
				for (defaultValue in lastProps) if (name = lastProps[defaultValue], lastProps.hasOwnProperty(defaultValue) && null != name && !nextProps.hasOwnProperty(defaultValue)) switch (defaultValue) {
					case "value": break;
					case "children": break;
					default: setProp(domElement, tag, defaultValue, null, nextProps, name);
				}
				for (value in nextProps) if (name = nextProps[value], type = lastProps[value], nextProps.hasOwnProperty(value) && (null != name || null != type)) switch (value) {
					case "value":
						name !== type && (viewTransitionMutationContext = !0);
						propKey$221 = name;
						break;
					case "defaultValue":
						name !== type && (viewTransitionMutationContext = !0);
						propKey = name;
						break;
					case "children": break;
					case "dangerouslySetInnerHTML":
						if (null != name) throw Error(formatProdErrorMessage(91));
						break;
					default: name !== type && setProp(domElement, tag, value, name, nextProps, type);
				}
				updateTextarea(domElement, propKey$221, propKey);
				return;
			case "option":
				for (var propKey$237 in lastProps) if (propKey$221 = lastProps[propKey$237], lastProps.hasOwnProperty(propKey$237) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$237)) switch (propKey$237) {
					case "selected":
						domElement.selected = !1;
						break;
					default: setProp(domElement, tag, propKey$237, null, nextProps, propKey$221);
				}
				for (lastDefaultValue in nextProps) if (propKey$221 = nextProps[lastDefaultValue], propKey = lastProps[lastDefaultValue], nextProps.hasOwnProperty(lastDefaultValue) && propKey$221 !== propKey && (null != propKey$221 || null != propKey)) switch (lastDefaultValue) {
					case "selected":
						propKey$221 !== propKey && (viewTransitionMutationContext = !0);
						domElement.selected = propKey$221 && "function" !== typeof propKey$221 && "symbol" !== typeof propKey$221;
						break;
					default: setProp(domElement, tag, lastDefaultValue, propKey$221, nextProps, propKey);
				}
				return;
			case "img":
			case "link":
			case "area":
			case "base":
			case "br":
			case "col":
			case "embed":
			case "hr":
			case "keygen":
			case "meta":
			case "param":
			case "source":
			case "track":
			case "wbr":
			case "menuitem":
				for (var propKey$242 in lastProps) propKey$221 = lastProps[propKey$242], lastProps.hasOwnProperty(propKey$242) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$242) && setProp(domElement, tag, propKey$242, null, nextProps, propKey$221);
				for (checked in nextProps) if (propKey$221 = nextProps[checked], propKey = lastProps[checked], nextProps.hasOwnProperty(checked) && propKey$221 !== propKey && (null != propKey$221 || null != propKey)) switch (checked) {
					case "children":
					case "dangerouslySetInnerHTML":
						if (null != propKey$221) throw Error(formatProdErrorMessage(137, tag));
						break;
					default: setProp(domElement, tag, checked, propKey$221, nextProps, propKey);
				}
				return;
			default: if (isCustomElement(tag)) {
				for (var propKey$247 in lastProps) propKey$221 = lastProps[propKey$247], lastProps.hasOwnProperty(propKey$247) && void 0 !== propKey$221 && !nextProps.hasOwnProperty(propKey$247) && setPropOnCustomElement(domElement, tag, propKey$247, void 0, nextProps, propKey$221);
				for (defaultChecked in nextProps) propKey$221 = nextProps[defaultChecked], propKey = lastProps[defaultChecked], !nextProps.hasOwnProperty(defaultChecked) || propKey$221 === propKey || void 0 === propKey$221 && void 0 === propKey || setPropOnCustomElement(domElement, tag, defaultChecked, propKey$221, nextProps, propKey);
				return;
			}
		}
		for (var propKey$252 in lastProps) propKey$221 = lastProps[propKey$252], lastProps.hasOwnProperty(propKey$252) && null != propKey$221 && !nextProps.hasOwnProperty(propKey$252) && setProp(domElement, tag, propKey$252, null, nextProps, propKey$221);
		for (lastProp in nextProps) propKey$221 = nextProps[lastProp], propKey = lastProps[lastProp], !nextProps.hasOwnProperty(lastProp) || propKey$221 === propKey || null == propKey$221 && null == propKey || setProp(domElement, tag, lastProp, propKey$221, nextProps, propKey);
	}
	function isLikelyStaticResource(initiatorType) {
		switch (initiatorType) {
			case "css":
			case "script":
			case "font":
			case "img":
			case "image":
			case "input":
			case "link": return !0;
			default: return !1;
		}
	}
	function estimateBandwidth() {
		if ("function" === typeof performance.getEntriesByType) {
			for (var count = 0, bits = 0, resourceEntries = performance.getEntriesByType("resource"), i = 0; i < resourceEntries.length; i++) {
				var entry = resourceEntries[i], transferSize = entry.transferSize, initiatorType = entry.initiatorType, duration = entry.duration;
				if (transferSize && duration && isLikelyStaticResource(initiatorType)) {
					initiatorType = 0;
					duration = entry.responseEnd;
					for (i += 1; i < resourceEntries.length; i++) {
						var overlapEntry = resourceEntries[i], overlapStartTime = overlapEntry.startTime;
						if (overlapStartTime > duration) break;
						var overlapTransferSize = overlapEntry.transferSize, overlapInitiatorType = overlapEntry.initiatorType;
						overlapTransferSize && isLikelyStaticResource(overlapInitiatorType) && (overlapEntry = overlapEntry.responseEnd, initiatorType += overlapTransferSize * (overlapEntry < duration ? 1 : (duration - overlapStartTime) / (overlapEntry - overlapStartTime)));
					}
					--i;
					bits += 8 * (transferSize + initiatorType) / (entry.duration / 1e3);
					count++;
					if (10 < count) break;
				}
			}
			if (0 < count) return bits / count / 1e6;
		}
		return navigator.connection && (count = navigator.connection.downlink, "number" === typeof count) ? count : 5;
	}
	var eventsEnabled = null;
	var selectionInformation = null;
	function getOwnerDocumentFromRootContainer(rootContainerElement) {
		return 9 === rootContainerElement.nodeType ? rootContainerElement : rootContainerElement.ownerDocument;
	}
	function getOwnHostContext(namespaceURI) {
		switch (namespaceURI) {
			case "http://www.w3.org/2000/svg": return 1;
			case "http://www.w3.org/1998/Math/MathML": return 2;
			default: return 0;
		}
	}
	function getChildHostContextProd(parentNamespace, type) {
		if (0 === parentNamespace) switch (type) {
			case "svg": return 1;
			case "math": return 2;
			default: return 0;
		}
		return 1 === parentNamespace && "foreignObject" === type ? 0 : parentNamespace;
	}
	function createHoistableInstance(type, props, rootContainerInstance, internalInstanceHandle) {
		rootContainerInstance = getOwnerDocumentFromRootContainer(rootContainerInstance).createElement(type);
		rootContainerInstance[internalInstanceKey] = internalInstanceHandle;
		rootContainerInstance[internalPropsKey] = props;
		setInitialProperties(rootContainerInstance, type, props);
		markNodeAsHoistable(rootContainerInstance);
		return rootContainerInstance;
	}
	function shouldSetTextContent(type, props) {
		return "textarea" === type || "noscript" === type || "string" === typeof props.children || "number" === typeof props.children || "bigint" === typeof props.children || "object" === typeof props.dangerouslySetInnerHTML && null !== props.dangerouslySetInnerHTML && null != props.dangerouslySetInnerHTML.__html;
	}
	var currentPopstateTransitionEvent = null;
	function shouldAttemptEagerTransition() {
		var event = window.event;
		if (event && "popstate" === event.type) {
			if (event === currentPopstateTransitionEvent) return !1;
			currentPopstateTransitionEvent = event;
			return !0;
		}
		currentPopstateTransitionEvent = null;
		return !1;
	}
	var scheduleTimeout = "function" === typeof setTimeout ? setTimeout : void 0;
	var cancelTimeout = "function" === typeof clearTimeout ? clearTimeout : void 0;
	var localPromise = "function" === typeof Promise ? Promise : void 0;
	var localRequestAnimationFrame = "function" === typeof requestAnimationFrame ? requestAnimationFrame : scheduleTimeout;
	var scheduleMicrotask = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof localPromise ? function(callback) {
		return localPromise.resolve(null).then(callback).catch(handleErrorInNextTick);
	} : scheduleTimeout;
	function handleErrorInNextTick(error) {
		setTimeout(function() {
			throw error;
		});
	}
	function isSingletonScope(type) {
		return "head" === type;
	}
	function clearHydrationBoundary(parentInstance, hydrationInstance) {
		var node = hydrationInstance, depth = 0;
		do {
			var nextNode = node.nextSibling;
			parentInstance.removeChild(node);
			if (nextNode && 8 === nextNode.nodeType) if (node = nextNode.data, "/$" === node || "/&" === node) {
				if (0 === depth) {
					parentInstance.removeChild(nextNode);
					retryIfBlockedOn(hydrationInstance);
					return;
				}
				depth--;
			} else if ("$" === node || "$?" === node || "$~" === node || "$!" === node || "&" === node) depth++;
			else if ("html" === node) clearSingletonPreambleContribution(parentInstance.ownerDocument.documentElement);
			else if ("head" === node) {
				node = parentInstance.ownerDocument.head;
				clearSingletonPreambleContribution(node);
				for (var node$jscomp$0 = node.firstChild; node$jscomp$0;) {
					var nextNode$jscomp$0 = node$jscomp$0.nextSibling, nodeName = node$jscomp$0.nodeName;
					node$jscomp$0[internalHoistableMarker] || "SCRIPT" === nodeName || "STYLE" === nodeName || "LINK" === nodeName && "stylesheet" === node$jscomp$0.rel.toLowerCase() || node.removeChild(node$jscomp$0);
					node$jscomp$0 = nextNode$jscomp$0;
				}
			} else "body" === node && clearSingletonPreambleContribution(parentInstance.ownerDocument.body);
			node = nextNode;
		} while (node);
		retryIfBlockedOn(hydrationInstance);
	}
	function hideOrUnhideDehydratedBoundary(suspenseInstance, isHidden) {
		var node = suspenseInstance;
		suspenseInstance = 0;
		do {
			var nextNode = node.nextSibling;
			1 === node.nodeType ? isHidden ? (node._stashedDisplay = node.style.display, node.style.display = "none") : (node.style.display = node._stashedDisplay || "", "" === node.getAttribute("style") && node.removeAttribute("style")) : 3 === node.nodeType && (isHidden ? (node._stashedText = node.nodeValue, node.nodeValue = "") : node.nodeValue = node._stashedText || "");
			if (nextNode && 8 === nextNode.nodeType) if (node = nextNode.data, "/$" === node) if (0 === suspenseInstance) break;
			else suspenseInstance--;
			else "$" !== node && "$?" !== node && "$~" !== node && "$!" !== node || suspenseInstance++;
			node = nextNode;
		} while (node);
	}
	function applyViewTransitionName(instance, name, className) {
		name = CSS.escape(name) !== name ? "r-" + btoa(name).replace(/=/g, "") : name;
		instance.style.viewTransitionName = name;
		null != className && (instance.style.viewTransitionClass = className);
		className = getComputedStyle(instance);
		if ("inline" === className.display) {
			name = instance.getClientRects();
			if (1 === name.length) var JSCompiler_inline_result = 1;
			else for (var i = JSCompiler_inline_result = 0; i < name.length; i++) {
				var rect = name[i];
				0 < rect.width && 0 < rect.height && JSCompiler_inline_result++;
			}
			1 === JSCompiler_inline_result && (instance = instance.style, instance.display = 1 === name.length ? "inline-block" : "block", instance.marginTop = "-" + className.paddingTop, instance.marginBottom = "-" + className.paddingBottom);
		}
	}
	function restoreViewTransitionName(instance, props) {
		instance = instance.style;
		props = props.style;
		var viewTransitionName = null != props ? props.hasOwnProperty("viewTransitionName") ? props.viewTransitionName : props.hasOwnProperty("view-transition-name") ? props["view-transition-name"] : null : null;
		instance.viewTransitionName = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : ("" + viewTransitionName).trim();
		viewTransitionName = null != props ? props.hasOwnProperty("viewTransitionClass") ? props.viewTransitionClass : props.hasOwnProperty("view-transition-class") ? props["view-transition-class"] : null : null;
		instance.viewTransitionClass = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : ("" + viewTransitionName).trim();
		"inline-block" === instance.display && (null == props ? instance.display = instance.margin = "" : (viewTransitionName = props.display, instance.display = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : viewTransitionName, viewTransitionName = props.margin, null != viewTransitionName ? instance.margin = viewTransitionName : (viewTransitionName = props.hasOwnProperty("marginTop") ? props.marginTop : props["margin-top"], instance.marginTop = null == viewTransitionName || "boolean" === typeof viewTransitionName ? "" : viewTransitionName, props = props.hasOwnProperty("marginBottom") ? props.marginBottom : props["margin-bottom"], instance.marginBottom = null == props || "boolean" === typeof props ? "" : props)));
	}
	function createMeasurement(rect, computedStyle, element) {
		element = element.ownerDocument.defaultView;
		return {
			rect,
			abs: "absolute" === computedStyle.position || "fixed" === computedStyle.position,
			clip: "none" !== computedStyle.clipPath || "visible" !== computedStyle.overflow || "none" !== computedStyle.filter || "none" !== computedStyle.mask || "none" !== computedStyle.mask || "0px" !== computedStyle.borderRadius,
			view: 0 <= rect.bottom && 0 <= rect.right && rect.top <= element.innerHeight && rect.left <= element.innerWidth
		};
	}
	function measureInstance(instance) {
		return createMeasurement(instance.getBoundingClientRect(), getComputedStyle(instance), instance);
	}
	function measureClonedInstance(instance) {
		var measuredRect = instance.getBoundingClientRect();
		measuredRect = new DOMRect(measuredRect.x + 2e4, measuredRect.y + 2e4, measuredRect.width, measuredRect.height);
		var computedStyle = getComputedStyle(instance);
		return createMeasurement(measuredRect, computedStyle, instance);
	}
	function forceLayout(ownerDocument) {
		return ownerDocument.documentElement.clientHeight;
	}
	function waitForImageToLoad(resolve) {
		this.addEventListener("load", resolve);
		this.addEventListener("error", resolve);
	}
	function startViewTransition(suspendedState, rootContainer, transitionTypes, mutationCallback, layoutCallback, afterMutationCallback, spawnedWorkCallback, passiveCallback, errorCallback) {
		var ownerDocument = 9 === rootContainer.nodeType ? rootContainer : rootContainer.ownerDocument;
		try {
			var transition = ownerDocument.startViewTransition({
				update: function() {
					var ownerWindow = ownerDocument.defaultView, pendingNavigation = ownerWindow.navigation && ownerWindow.navigation.transition, previousFontLoadingStatus = ownerDocument.fonts.status;
					mutationCallback();
					var blockingPromises = [];
					"loaded" === previousFontLoadingStatus && (forceLayout(ownerDocument), "loading" === ownerDocument.fonts.status && blockingPromises.push(ownerDocument.fonts.ready));
					previousFontLoadingStatus = blockingPromises.length;
					if (null !== suspendedState) for (var suspenseyImages = suspendedState.suspenseyImages, imgBytes = 0, i = 0; i < suspenseyImages.length; i++) {
						var suspenseyImage = suspenseyImages[i];
						if (!suspenseyImage.complete) {
							var rect = suspenseyImage.getBoundingClientRect();
							if (0 < rect.bottom && 0 < rect.right && rect.top < ownerWindow.innerHeight && rect.left < ownerWindow.innerWidth) {
								imgBytes += estimateImageBytes(suspenseyImage);
								if (imgBytes > estimatedBytesWithinLimit) {
									blockingPromises.length = previousFontLoadingStatus;
									break;
								}
								suspenseyImage = new Promise(waitForImageToLoad.bind(suspenseyImage));
								blockingPromises.push(suspenseyImage);
							}
						}
					}
					if (0 < blockingPromises.length) return ownerWindow = Promise.race([Promise.all(blockingPromises), new Promise(function(resolve) {
						return setTimeout(resolve, 500);
					})]).then(layoutCallback, layoutCallback), (pendingNavigation ? Promise.allSettled([pendingNavigation.finished, ownerWindow]) : ownerWindow).then(afterMutationCallback, afterMutationCallback);
					layoutCallback();
					if (pendingNavigation) return pendingNavigation.finished.then(afterMutationCallback, afterMutationCallback);
					afterMutationCallback();
				},
				types: transitionTypes
			});
			ownerDocument.__reactViewTransition = transition;
			var viewTransitionAnimations = [];
			transition.ready.then(function() {
				for (var animations = ownerDocument.documentElement.getAnimations({ subtree: !0 }), i = 0; i < animations.length; i++) {
					var animation = animations[i], effect = animation.effect, pseudoElement = effect.pseudoElement;
					if (null != pseudoElement && pseudoElement.startsWith("::view-transition")) {
						viewTransitionAnimations.push(animation);
						animation = effect.getKeyframes();
						for (var height = pseudoElement = void 0, unchangedDimensions = !0, j = 0; j < animation.length; j++) {
							var keyframe = animation[j], w = keyframe.width;
							if (void 0 === pseudoElement) pseudoElement = w;
							else if (pseudoElement !== w) {
								unchangedDimensions = !1;
								break;
							}
							w = keyframe.height;
							if (void 0 === height) height = w;
							else if (height !== w) {
								unchangedDimensions = !1;
								break;
							}
							delete keyframe.width;
							delete keyframe.height;
							"none" === keyframe.transform && delete keyframe.transform;
						}
						unchangedDimensions && void 0 !== pseudoElement && void 0 !== height && (effect.setKeyframes(animation), unchangedDimensions = getComputedStyle(effect.target, effect.pseudoElement), unchangedDimensions.width !== pseudoElement || unchangedDimensions.height !== height) && (unchangedDimensions = animation[0], unchangedDimensions.width = pseudoElement, unchangedDimensions.height = height, unchangedDimensions = animation[animation.length - 1], unchangedDimensions.width = pseudoElement, unchangedDimensions.height = height, effect.setKeyframes(animation));
					}
				}
				spawnedWorkCallback();
			}, function(error) {
				ownerDocument.__reactViewTransition === transition && (ownerDocument.__reactViewTransition = null);
				try {
					if ("object" === typeof error && null !== error) switch (error.name) {
						case "InvalidStateError": if ("View transition was skipped because document visibility state is hidden." === error.message || "Skipping view transition because document visibility state has become hidden." === error.message || "Skipping view transition because viewport size changed." === error.message || "Transition was aborted because of invalid state" === error.message) error = null;
					}
					null !== error && errorCallback(error);
				} finally {
					mutationCallback(), layoutCallback(), spawnedWorkCallback();
				}
			});
			transition.finished.finally(function() {
				for (var i = 0; i < viewTransitionAnimations.length; i++) viewTransitionAnimations[i].cancel();
				ownerDocument.__reactViewTransition === transition && (ownerDocument.__reactViewTransition = null);
				passiveCallback();
			});
			return transition;
		} catch (x) {
			return mutationCallback(), layoutCallback(), spawnedWorkCallback(), null;
		}
	}
	function ViewTransitionPseudoElement(pseudo, name) {
		this._scope = document.documentElement;
		this._selector = "::view-transition-" + pseudo + "(" + name + ")";
	}
	ViewTransitionPseudoElement.prototype.animate = function(keyframes, options) {
		options = "number" === typeof options ? { duration: options } : assign({}, options);
		options.pseudoElement = this._selector;
		return this._scope.animate(keyframes, options);
	};
	ViewTransitionPseudoElement.prototype.getAnimations = function() {
		for (var scope = this._scope, selector = this._selector, animations = scope.getAnimations({ subtree: !0 }), result = [], i = 0; i < animations.length; i++) {
			var effect = animations[i].effect;
			null !== effect && effect.target === scope && effect.pseudoElement === selector && result.push(animations[i]);
		}
		return result;
	};
	ViewTransitionPseudoElement.prototype.getComputedStyle = function() {
		return getComputedStyle(this._scope, this._selector);
	};
	function createViewTransitionInstance(name) {
		return {
			name,
			group: new ViewTransitionPseudoElement("group", name),
			imagePair: new ViewTransitionPseudoElement("image-pair", name),
			old: new ViewTransitionPseudoElement("old", name),
			new: new ViewTransitionPseudoElement("new", name)
		};
	}
	function FragmentInstance(fragmentFiber) {
		this._fragmentFiber = fragmentFiber;
		this._observers = this._eventListeners = null;
	}
	FragmentInstance.prototype.addEventListener = function(type, listener, optionsOrUseCapture) {
		var signal = null, cleanup = null;
		if (null != optionsOrUseCapture && "boolean" !== typeof optionsOrUseCapture && (signal = optionsOrUseCapture.signal || null, null !== signal && signal.aborted)) return;
		null === this._eventListeners && (this._eventListeners = []);
		var listeners = this._eventListeners;
		if (-1 === indexOfEventListener(listeners, type, listener, optionsOrUseCapture)) {
			var fragmentInstance = this, attachedListener = listener;
			null != optionsOrUseCapture && "boolean" !== typeof optionsOrUseCapture && !0 === optionsOrUseCapture.once && (attachedListener = function(event) {
				fragmentInstance.removeEventListener(type, listener, optionsOrUseCapture);
				"function" === typeof listener ? listener.call(this, event) : listener.handleEvent(event);
			});
			null !== signal && (cleanup = fragmentInstance.removeEventListener.bind(fragmentInstance, type, listener, optionsOrUseCapture), signal.addEventListener("abort", cleanup, { once: !0 }), cleanup = signal.removeEventListener.bind(signal, "abort", cleanup));
			signal = getAttachOptions(optionsOrUseCapture);
			listeners.push({
				type,
				listener,
				optionsOrUseCapture,
				attachedListener,
				cleanup
			});
			traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, addEventListenerToChild, type, attachedListener, signal);
		}
		this._eventListeners = listeners;
	};
	function addEventListenerToChild(child, type, listener, optionsOrUseCapture) {
		getInstanceFromHostFiber(child).addEventListener(type, listener, optionsOrUseCapture);
		return !1;
	}
	FragmentInstance.prototype.removeEventListener = function(type, listener, optionsOrUseCapture) {
		var listeners = this._eventListeners;
		if (null !== listeners && (listener = indexOfEventListener(listeners, type, listener, optionsOrUseCapture), -1 !== listener)) {
			var _listeners$index = listeners[listener];
			optionsOrUseCapture = _listeners$index.attachedListener;
			var cleanup = _listeners$index.cleanup;
			_listeners$index = getAttachOptions(_listeners$index.optionsOrUseCapture);
			traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, removeEventListenerFromChild, type, optionsOrUseCapture, _listeners$index);
			listeners.splice(listener, 1);
			null !== cleanup && cleanup();
		}
	};
	function removeEventListenerFromChild(child, type, listener, optionsOrUseCapture) {
		getInstanceFromHostFiber(child).removeEventListener(type, listener, optionsOrUseCapture);
		return !1;
	}
	function getAttachOptions(opts) {
		return null != opts && "boolean" !== typeof opts && (!0 === opts.once || opts.signal instanceof AbortSignal) ? {
			capture: opts.capture,
			passive: opts.passive
		} : opts;
	}
	function normalizeListenerOptions(opts) {
		return null == opts ? "c=0" : "boolean" === typeof opts ? "c=" + (opts ? "1" : "0") : "c=" + (opts.capture ? "1" : "0");
	}
	function indexOfEventListener(eventListeners, type, listener, optionsOrUseCapture) {
		if (0 === eventListeners.length) return -1;
		optionsOrUseCapture = normalizeListenerOptions(optionsOrUseCapture);
		for (var i = 0; i < eventListeners.length; i++) {
			var item = eventListeners[i];
			if (item.type === type && item.listener === listener && normalizeListenerOptions(item.optionsOrUseCapture) === optionsOrUseCapture) return i;
		}
		return -1;
	}
	FragmentInstance.prototype.dispatchEvent = function(event) {
		var parentHostFiber = getFragmentParentInstanceOrContainerFiber(this._fragmentFiber);
		if (null === parentHostFiber) return !0;
		parentHostFiber = getInstanceFromHostFiber(parentHostFiber);
		var eventListeners = this._eventListeners;
		if (null !== eventListeners && 0 < eventListeners.length || !event.bubbles) {
			var temp = 9 === parentHostFiber.nodeType ? parentHostFiber.createComment("") : document.createTextNode("");
			if (eventListeners) for (var i = 0; i < eventListeners.length; i++) {
				var _eventListeners$i = eventListeners[i];
				temp.addEventListener(_eventListeners$i.type, _eventListeners$i.attachedListener, getAttachOptions(_eventListeners$i.optionsOrUseCapture));
			}
			parentHostFiber.appendChild(temp);
			event = temp.dispatchEvent(event);
			if (eventListeners) for (i = 0; i < eventListeners.length; i++) _eventListeners$i = eventListeners[i], temp.removeEventListener(_eventListeners$i.type, _eventListeners$i.attachedListener, getAttachOptions(_eventListeners$i.optionsOrUseCapture));
			parentHostFiber.removeChild(temp);
			return event;
		}
		return parentHostFiber.dispatchEvent(event);
	};
	FragmentInstance.prototype.focus = function(focusOptions) {
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !0, setFocusOnFiberIfFocusable, focusOptions, void 0, void 0);
	};
	function setFocusOnFiberIfFocusable(fiber, focusOptions) {
		if (6 === fiber.tag) return !1;
		fiber = getInstanceFromHostFiber(fiber);
		return setFocusIfFocusable(fiber, focusOptions);
	}
	FragmentInstance.prototype.focusLast = function(focusOptions) {
		var children = [];
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !0, collectChildren, children, void 0, void 0);
		for (var i = children.length - 1; 0 <= i && !setFocusOnFiberIfFocusable(children[i], focusOptions); i--);
	};
	function collectChildren(child, collection) {
		collection.push(child);
		return !1;
	}
	FragmentInstance.prototype.blur = function() {
		var parentHostFiber = getFragmentParentInstanceOrContainerFiber(this._fragmentFiber);
		null !== parentHostFiber && (parentHostFiber = getInstanceFromHostFiber(parentHostFiber), parentHostFiber = getOwnerDocumentFromRootContainer(parentHostFiber).activeElement, null !== parentHostFiber && traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, blurActiveElementWithinFragment, parentHostFiber, void 0, void 0));
	};
	function blurActiveElementWithinFragment(child, activeElement) {
		if (6 === child.tag) return !1;
		child = getInstanceFromHostFiber(child);
		return child === activeElement || child.contains(activeElement) ? (activeElement.blur(), !0) : !1;
	}
	FragmentInstance.prototype.observeUsing = function(observer) {
		null === this._observers && (this._observers = /* @__PURE__ */ new Set());
		this._observers.add(observer);
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, observeChild, observer, void 0, void 0);
	};
	function observeChild(child, observer) {
		if (6 === child.tag) return !1;
		child = getInstanceFromHostFiber(child);
		observer.observe(child);
		return !1;
	}
	FragmentInstance.prototype.unobserveUsing = function(observer) {
		var observers = this._observers;
		if (null !== observers && observers.has(observer)) {
			observers.delete(observer);
			traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, unobserveChild, observer, void 0, void 0);
			for (var i = observers = 0; i < pendingIntersectionUnobserves.length; i++) {
				var pending = pendingIntersectionUnobserves[i];
				pending.fragmentInstance === this && pending.observer === observer ? observer.unobserve(pending.instance) : pendingIntersectionUnobserves[observers++] = pending;
			}
			pendingIntersectionUnobserves.length = observers;
		}
	};
	function unobserveChild(child, observer) {
		if (6 === child.tag) return !1;
		child = getInstanceFromHostFiber(child);
		observer.unobserve(child);
		return !1;
	}
	var pendingIntersectionUnobserves = [];
	var intersectionUnobserveScheduled = !1;
	function schedulePendingIntersectionUnobserve(fragmentInstance, observer, instance) {
		pendingIntersectionUnobserves.push({
			fragmentInstance,
			observer,
			instance
		});
		intersectionUnobserveScheduled || (intersectionUnobserveScheduled = !0, requestPostPaintCallback(function() {
			intersectionUnobserveScheduled = !1;
			var pending = pendingIntersectionUnobserves;
			pendingIntersectionUnobserves = [];
			for (var i = 0; i < pending.length; i++) {
				var item = pending[i];
				item.observer.unobserve(item.instance);
			}
		}));
	}
	FragmentInstance.prototype.getClientRects = function() {
		var rects = [];
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, collectClientRects, rects, void 0, void 0);
		return rects;
	};
	function collectClientRects(child, rects) {
		if (6 === child.tag) {
			child = child.stateNode;
			var range = child.ownerDocument.createRange();
			range.selectNodeContents(child);
			rects.push.apply(rects, range.getClientRects());
		} else child = getInstanceFromHostFiber(child), rects.push.apply(rects, child.getClientRects());
		return !1;
	}
	FragmentInstance.prototype.getRootNode = function(getRootNodeOptions) {
		var parentHostFiber = getFragmentParentInstanceOrContainerFiber(this._fragmentFiber);
		return null === parentHostFiber ? this : getInstanceFromHostFiber(parentHostFiber).getRootNode(getRootNodeOptions);
	};
	FragmentInstance.prototype.compareDocumentPosition = function(otherNode) {
		var parentHostFiber = getFragmentParentInstanceOrContainerFiber(this._fragmentFiber);
		if (null === parentHostFiber) return Node.DOCUMENT_POSITION_DISCONNECTED;
		var children = [];
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, collectChildren, children, void 0, void 0);
		var parentHostInstance = getInstanceFromHostFiber(parentHostFiber);
		if (0 === children.length) {
			children = parentHostInstance;
			if (fiberIsPortaledIntoHost(this._fragmentFiber)) {
				a: {
					for (parentHostFiber = this._fragmentFiber.return; null !== parentHostFiber;) {
						if (4 === parentHostFiber.tag) {
							parentHostFiber = parentHostFiber.stateNode.containerInfo;
							break a;
						}
						if (3 === parentHostFiber.tag || 5 === parentHostFiber.tag || 27 === parentHostFiber.tag) break;
						parentHostFiber = parentHostFiber.return;
					}
					parentHostFiber = null;
				}
				null != parentHostFiber && (children = parentHostFiber);
			}
			parentHostFiber = this._fragmentFiber;
			var result = parentHostInstance = children.compareDocumentPosition(otherNode);
			children === otherNode ? result = Node.DOCUMENT_POSITION_CONTAINS : parentHostInstance & Node.DOCUMENT_POSITION_CONTAINED_BY && (children = getFragmentInstanceOrTextInstanceSiblings(parentHostFiber)[1], null === children ? result = Node.DOCUMENT_POSITION_PRECEDING : (otherNode = getInstanceFromHostFiber(children).compareDocumentPosition(otherNode), result = 0 === otherNode || otherNode & Node.DOCUMENT_POSITION_FOLLOWING ? Node.DOCUMENT_POSITION_FOLLOWING : Node.DOCUMENT_POSITION_PRECEDING));
			return result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
		}
		parentHostFiber = getInstanceFromHostFiber(children[0]);
		result = getInstanceFromHostFiber(children[children.length - 1]);
		var parentHostInstanceFromDOM = fiberIsPortaledIntoHost(this._fragmentFiber) ? parentHostFiber.parentElement : parentHostInstance;
		if (null == parentHostInstanceFromDOM) return Node.DOCUMENT_POSITION_DISCONNECTED;
		parentHostInstance = parentHostInstanceFromDOM.compareDocumentPosition(parentHostFiber) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		parentHostInstanceFromDOM = parentHostInstanceFromDOM.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_CONTAINED_BY;
		var firstResult = parentHostFiber.compareDocumentPosition(otherNode), lastResult = result.compareDocumentPosition(otherNode), otherNodeIsWithinFirstOrLastChild = firstResult & Node.DOCUMENT_POSITION_CONTAINED_BY || lastResult & Node.DOCUMENT_POSITION_CONTAINED_BY;
		lastResult = parentHostInstance && parentHostInstanceFromDOM && firstResult & Node.DOCUMENT_POSITION_FOLLOWING && lastResult & Node.DOCUMENT_POSITION_PRECEDING;
		parentHostFiber = parentHostInstance && parentHostFiber === otherNode || parentHostInstanceFromDOM && result === otherNode || otherNodeIsWithinFirstOrLastChild || lastResult ? Node.DOCUMENT_POSITION_CONTAINED_BY : !parentHostInstance && parentHostFiber === otherNode || !parentHostInstanceFromDOM && result === otherNode ? Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC : firstResult;
		return parentHostFiber & Node.DOCUMENT_POSITION_DISCONNECTED || parentHostFiber & Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC || validateDocumentPositionWithFiberTree(parentHostFiber, this._fragmentFiber, children[0], children[children.length - 1], otherNode) ? parentHostFiber : Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
	};
	function validateDocumentPositionWithFiberTree(documentPosition, fragmentFiber, precedingBoundaryFiber, followingBoundaryFiber, otherNode) {
		var otherFiber = getClosestInstanceFromNode(otherNode);
		if (documentPosition & Node.DOCUMENT_POSITION_CONTAINED_BY) {
			if (precedingBoundaryFiber = !!otherFiber) a: {
				for (; null !== otherFiber;) {
					if (7 === otherFiber.tag && (otherFiber === fragmentFiber || otherFiber.alternate === fragmentFiber)) {
						precedingBoundaryFiber = !0;
						break a;
					}
					otherFiber = otherFiber.return;
				}
				precedingBoundaryFiber = !1;
			}
			return precedingBoundaryFiber;
		}
		if (documentPosition & Node.DOCUMENT_POSITION_CONTAINS) {
			if (null === otherFiber) return otherFiber = otherNode.ownerDocument, otherNode === otherFiber || otherNode === otherFiber.documentElement || otherNode === otherFiber.body;
			a: {
				otherFiber = fragmentFiber;
				for (fragmentFiber = getFragmentParentInstanceOrContainerFiber(fragmentFiber); null !== otherFiber;) {
					if (!(5 !== otherFiber.tag && 3 !== otherFiber.tag && 27 !== otherFiber.tag || otherFiber !== fragmentFiber && otherFiber.alternate !== fragmentFiber)) {
						otherFiber = !0;
						break a;
					}
					otherFiber = otherFiber.return;
				}
				otherFiber = !1;
			}
			return otherFiber;
		}
		return documentPosition & Node.DOCUMENT_POSITION_PRECEDING ? ((fragmentFiber = !!otherFiber) && !(fragmentFiber = otherFiber === precedingBoundaryFiber) && (fragmentFiber = getLowestCommonAncestor(precedingBoundaryFiber, otherFiber, getParentForFragmentAncestors), null === fragmentFiber ? fragmentFiber = !1 : (traverseVisibleInstancesAndTextInstances(fragmentFiber, !0, isFiberPrecedingCheck, otherFiber, precedingBoundaryFiber), otherFiber = searchTarget, searchTarget = null, fragmentFiber = null !== otherFiber)), fragmentFiber) : documentPosition & Node.DOCUMENT_POSITION_FOLLOWING ? ((fragmentFiber = !!otherFiber) && !(fragmentFiber = otherFiber === followingBoundaryFiber) && (fragmentFiber = getLowestCommonAncestor(followingBoundaryFiber, otherFiber, getParentForFragmentAncestors), null === fragmentFiber ? fragmentFiber = !1 : (traverseVisibleInstancesAndTextInstances(fragmentFiber, !0, isFiberFollowingCheck, otherFiber, followingBoundaryFiber), otherFiber = searchTarget, searchBoundary = searchTarget = null, fragmentFiber = null !== otherFiber)), fragmentFiber) : !1;
	}
	function scrollTextNodeIntoView(textNode, resolvedAlignToTop) {
		var range = textNode.ownerDocument.createRange();
		range.selectNodeContents(textNode);
		textNode = range.getBoundingClientRect();
		window.scrollTo(window.scrollX + textNode.left, resolvedAlignToTop ? window.scrollY + textNode.top : window.scrollY + textNode.bottom - window.innerHeight);
	}
	FragmentInstance.prototype.scrollIntoView = function(alignToTop) {
		if ("object" === typeof alignToTop) throw Error(formatProdErrorMessage(566));
		var children = [];
		traverseVisibleInstancesAndTextInstances(this._fragmentFiber.child, !1, collectChildren, children, void 0, void 0);
		var resolvedAlignToTop = !1 !== alignToTop;
		if (0 === children.length) {
			var hostSiblings = getFragmentInstanceOrTextInstanceSiblings(this._fragmentFiber);
			hostSiblings = resolvedAlignToTop ? hostSiblings[1] || hostSiblings[0] || getFragmentParentInstanceOrContainerFiber(this._fragmentFiber) : hostSiblings[0] || hostSiblings[1];
			if (null === hostSiblings) return;
			if (6 === hostSiblings.tag) {
				alignToTop = getInstanceFromHostFiber(hostSiblings);
				scrollTextNodeIntoView(alignToTop, resolvedAlignToTop);
				return;
			}
			hostSiblings = getInstanceFromHostFiber(hostSiblings);
			if (9 !== hostSiblings.nodeType) {
				if (11 === hostSiblings.nodeType) {
					resolvedAlignToTop = "host" in hostSiblings ? hostSiblings.host : null;
					null !== resolvedAlignToTop && resolvedAlignToTop.scrollIntoView(alignToTop);
					return;
				}
				hostSiblings.scrollIntoView(alignToTop);
			}
		}
		for (hostSiblings = resolvedAlignToTop ? children.length - 1 : 0; hostSiblings !== (resolvedAlignToTop ? -1 : children.length);) {
			var child = children[hostSiblings];
			6 === child.tag ? (child = getInstanceFromHostFiber(child), scrollTextNodeIntoView(child, resolvedAlignToTop)) : getInstanceFromHostFiber(child).scrollIntoView(alignToTop);
			hostSiblings += resolvedAlignToTop ? -1 : 1;
		}
	};
	function addFragmentHandleToFiber(child, fragmentInstance) {
		child = getInstanceFromHostFiber(child);
		addFragmentHandleToInstance(child, fragmentInstance);
		return !1;
	}
	function addFragmentHandleToInstance(instance, fragmentInstance) {
		instance.reactFragments ??= /* @__PURE__ */ new Set();
		instance.reactFragments.add(fragmentInstance);
	}
	function commitNewChildToFragmentInstance(childInstance, fragmentInstance) {
		var eventListeners = fragmentInstance._eventListeners;
		if (null !== eventListeners) for (var i$jscomp$0 = 0; i$jscomp$0 < eventListeners.length; i$jscomp$0++) {
			var _eventListeners$i3 = eventListeners[i$jscomp$0];
			childInstance.addEventListener(_eventListeners$i3.type, _eventListeners$i3.attachedListener, getAttachOptions(_eventListeners$i3.optionsOrUseCapture));
		}
		3 !== childInstance.nodeType && (eventListeners = fragmentInstance._observers, null !== eventListeners && eventListeners.forEach(function(observer) {
			for (var writeIdx = 0, i = 0; i < pendingIntersectionUnobserves.length; i++) {
				var pending = pendingIntersectionUnobserves[i];
				if (pending.fragmentInstance !== fragmentInstance || pending.observer !== observer || pending.instance !== childInstance) pendingIntersectionUnobserves[writeIdx++] = pending;
			}
			pendingIntersectionUnobserves.length = writeIdx;
			observer.observe(childInstance);
		}), addFragmentHandleToInstance(childInstance, fragmentInstance));
	}
	function deleteChildFromFragmentInstance(childInstance, fragmentInstance) {
		var eventListeners = fragmentInstance._eventListeners;
		if (null !== eventListeners) for (var i = 0; i < eventListeners.length; i++) {
			var _eventListeners$i4 = eventListeners[i];
			childInstance.removeEventListener(_eventListeners$i4.type, _eventListeners$i4.attachedListener, getAttachOptions(_eventListeners$i4.optionsOrUseCapture));
		}
		3 !== childInstance.nodeType && (eventListeners = fragmentInstance._observers, null !== eventListeners && eventListeners.forEach(function(observer) {
			"string" === typeof observer.rootMargin ? schedulePendingIntersectionUnobserve(fragmentInstance, observer, childInstance) : observer.unobserve(childInstance);
		}), null != childInstance.reactFragments && childInstance.reactFragments.delete(fragmentInstance));
	}
	function clearContainerSparingly(container) {
		var nextNode = container.firstChild;
		nextNode && 10 === nextNode.nodeType && (nextNode = nextNode.nextSibling);
		for (; nextNode;) {
			var node = nextNode;
			nextNode = nextNode.nextSibling;
			switch (node.nodeName) {
				case "HTML":
				case "HEAD":
				case "BODY":
					clearContainerSparingly(node);
					detachDeletedInstance(node);
					continue;
				case "SCRIPT":
				case "STYLE": continue;
				case "LINK": if ("stylesheet" === node.rel.toLowerCase()) continue;
			}
			container.removeChild(node);
		}
	}
	function canHydrateInstance(instance, type, props, inRootOrSingleton) {
		for (; 1 === instance.nodeType;) {
			var anyProps = props;
			if (instance.nodeName.toLowerCase() !== type.toLowerCase()) {
				if (!inRootOrSingleton && ("INPUT" !== instance.nodeName || "hidden" !== instance.type)) break;
			} else if (!inRootOrSingleton) if ("input" === type && "hidden" === instance.type) {
				var name = null == anyProps.name ? null : "" + anyProps.name;
				if ("hidden" === anyProps.type && instance.getAttribute("name") === name) return instance;
			} else return instance;
			else if (!instance[internalHoistableMarker]) switch (type) {
				case "meta":
					if (!instance.hasAttribute("itemprop")) break;
					return instance;
				case "link":
					name = instance.getAttribute("rel");
					if ("stylesheet" === name && instance.hasAttribute("data-precedence")) break;
					else if (name !== anyProps.rel || instance.getAttribute("href") !== (null == anyProps.href || "" === anyProps.href ? null : anyProps.href) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin) || instance.getAttribute("title") !== (null == anyProps.title ? null : anyProps.title)) break;
					return instance;
				case "style":
					if (instance.hasAttribute("data-precedence")) break;
					return instance;
				case "script":
					name = instance.getAttribute("src");
					if ((name !== (null == anyProps.src ? null : anyProps.src) || instance.getAttribute("type") !== (null == anyProps.type ? null : anyProps.type) || instance.getAttribute("crossorigin") !== (null == anyProps.crossOrigin ? null : anyProps.crossOrigin)) && name && instance.hasAttribute("async") && !instance.hasAttribute("itemprop")) break;
					return instance;
				default: return instance;
			}
			instance = getNextHydratable(instance.nextSibling);
			if (null === instance) break;
		}
		return null;
	}
	function canHydrateTextInstance(instance, text, inRootOrSingleton) {
		if ("" === text) return null;
		for (; 3 !== instance.nodeType;) {
			if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton) return null;
			instance = getNextHydratable(instance.nextSibling);
			if (null === instance) return null;
		}
		return instance;
	}
	function canHydrateHydrationBoundary(instance, inRootOrSingleton) {
		for (; 8 !== instance.nodeType;) {
			if ((1 !== instance.nodeType || "INPUT" !== instance.nodeName || "hidden" !== instance.type) && !inRootOrSingleton) return null;
			instance = getNextHydratable(instance.nextSibling);
			if (null === instance) return null;
		}
		return instance;
	}
	function isSuspenseInstancePending(instance) {
		return "$?" === instance.data || "$~" === instance.data;
	}
	function isSuspenseInstanceFallback(instance) {
		return "$!" === instance.data || "$?" === instance.data && "loading" !== instance.ownerDocument.readyState;
	}
	function registerSuspenseInstanceRetry(instance, callback) {
		var ownerDocument = instance.ownerDocument;
		if ("$~" === instance.data) instance._reactRetry = callback;
		else if ("$?" !== instance.data || "loading" !== ownerDocument.readyState) callback();
		else {
			var listener = function() {
				callback();
				ownerDocument.removeEventListener("DOMContentLoaded", listener);
			};
			ownerDocument.addEventListener("DOMContentLoaded", listener);
			instance._reactRetry = listener;
		}
	}
	function getNextHydratable(node) {
		for (; null != node; node = node.nextSibling) {
			var nodeType = node.nodeType;
			if (1 === nodeType || 3 === nodeType) break;
			if (8 === nodeType) {
				nodeType = node.data;
				if ("$" === nodeType || "$!" === nodeType || "$?" === nodeType || "$~" === nodeType || "&" === nodeType || "F!" === nodeType || "F" === nodeType) break;
				if ("/$" === nodeType || "/&" === nodeType) return null;
			}
		}
		return node;
	}
	var previousHydratableOnEnteringScopedSingleton = null;
	function getNextHydratableInstanceAfterHydrationBoundary(hydrationInstance) {
		hydrationInstance = hydrationInstance.nextSibling;
		for (var depth = 0; hydrationInstance;) {
			if (8 === hydrationInstance.nodeType) {
				var data = hydrationInstance.data;
				if ("/$" === data || "/&" === data) {
					if (0 === depth) return getNextHydratable(hydrationInstance.nextSibling);
					depth--;
				} else "$" !== data && "$!" !== data && "$?" !== data && "$~" !== data && "&" !== data || depth++;
			}
			hydrationInstance = hydrationInstance.nextSibling;
		}
		return null;
	}
	function getParentHydrationBoundary(targetInstance) {
		targetInstance = targetInstance.previousSibling;
		for (var depth = 0; targetInstance;) {
			if (8 === targetInstance.nodeType) {
				var data = targetInstance.data;
				if ("$" === data || "$!" === data || "$?" === data || "$~" === data || "&" === data) {
					if (0 === depth) return targetInstance;
					depth--;
				} else "/$" !== data && "/&" !== data || depth++;
			}
			targetInstance = targetInstance.previousSibling;
		}
		return null;
	}
	function setFocusIfFocusable(node, focusOptions) {
		function handleFocus() {
			didFocus = !0;
		}
		if (node.ownerDocument.activeElement === node) return !0;
		var didFocus = !1;
		try {
			node.ownerDocument.addEventListener("focus", handleFocus, !0), (node.focus || HTMLElement.prototype.focus).call(node, focusOptions);
		} finally {
			node.ownerDocument.removeEventListener("focus", handleFocus, !0);
		}
		return didFocus;
	}
	function requestPostPaintCallback(callback) {
		localRequestAnimationFrame(function() {
			localRequestAnimationFrame(function(time) {
				return callback(time);
			});
		});
	}
	function resolveSingletonInstance(type, props, rootContainerInstance) {
		props = getOwnerDocumentFromRootContainer(rootContainerInstance);
		switch (type) {
			case "html":
				type = props.documentElement;
				if (!type) throw Error(formatProdErrorMessage(452));
				return type;
			case "head":
				type = props.head;
				if (!type) throw Error(formatProdErrorMessage(453));
				return type;
			case "body":
				type = props.body;
				if (!type) throw Error(formatProdErrorMessage(454));
				return type;
			default: throw Error(formatProdErrorMessage(451));
		}
	}
	function releaseSingletonInstance(instance, type, props) {
		for (var propKey in props) {
			var propValue = props[propKey];
			props.hasOwnProperty(propKey) && null != propValue && setProp(instance, type, propKey, null, emptyProps, propValue);
		}
		null != props.dangerouslySetInnerHTML && (instance.textContent = "");
		instance.onclick === noop$1 && (instance.onclick = null);
		detachDeletedInstance(instance);
	}
	function clearSingletonPreambleContribution(instance) {
		for (var attributes = instance.attributes; attributes.length;) instance.removeAttributeNode(attributes[0]);
		detachDeletedInstance(instance);
	}
	var preloadPropsMap = /* @__PURE__ */ new Map();
	var preconnectsSet = /* @__PURE__ */ new Set();
	function getHoistableRoot(container) {
		if ("function" === typeof container.getRootNode) {
			var rootNode = container.getRootNode();
			if (9 === rootNode.nodeType || 11 === rootNode.nodeType) return rootNode;
		}
		return 9 === container.nodeType ? container : container.ownerDocument;
	}
	var previousDispatcher = ReactDOMSharedInternals.d;
	ReactDOMSharedInternals.d = {
		f: flushSyncWork,
		r: requestFormReset,
		D: prefetchDNS,
		C: preconnect,
		L: preload,
		m: preloadModule,
		X: preinitScript,
		S: preinitStyle,
		M: preinitModuleScript
	};
	function flushSyncWork() {
		var previousWasRendering = previousDispatcher.f(), wasRendering = flushSyncWork$1();
		return previousWasRendering || wasRendering;
	}
	function requestFormReset(form) {
		var formInst = getInstanceFromNode(form);
		null !== formInst && 5 === formInst.tag && "form" === formInst.type ? requestFormReset$1(formInst) : previousDispatcher.r(form);
	}
	var globalDocument = "undefined" === typeof document ? null : document;
	function preconnectAs(rel, href, crossOrigin) {
		var ownerDocument = globalDocument;
		if (ownerDocument && "string" === typeof href && href) {
			var limitedEscapedHref = escapeSelectorAttributeValueInsideDoubleQuotes(href);
			limitedEscapedHref = "link[rel=\"" + rel + "\"][href=\"" + limitedEscapedHref + "\"]";
			"string" === typeof crossOrigin && (limitedEscapedHref += "[crossorigin=\"" + crossOrigin + "\"]");
			preconnectsSet.has(limitedEscapedHref) || (preconnectsSet.add(limitedEscapedHref), rel = {
				rel,
				crossOrigin,
				href
			}, null === ownerDocument.querySelector(limitedEscapedHref) && (href = ownerDocument.createElement("link"), setInitialProperties(href, "link", rel), markNodeAsHoistable(href), ownerDocument.head.appendChild(href)));
		}
	}
	function prefetchDNS(href) {
		previousDispatcher.D(href);
		preconnectAs("dns-prefetch", href, null);
	}
	function preconnect(href, crossOrigin) {
		previousDispatcher.C(href, crossOrigin);
		preconnectAs("preconnect", href, crossOrigin);
	}
	function preload(href, as, options) {
		previousDispatcher.L(href, as, options);
		var ownerDocument = globalDocument;
		if (ownerDocument && href && as) {
			var preloadSelector = "link[rel=\"preload\"][as=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(as) + "\"]";
			"image" === as ? options && options.imageSrcSet ? (preloadSelector += "[imagesrcset=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(options.imageSrcSet) + "\"]", "string" === typeof options.imageSizes && (preloadSelector += "[imagesizes=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(options.imageSizes) + "\"]")) : preloadSelector += "[href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]" : preloadSelector += "[href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]";
			var key = preloadSelector;
			switch (as) {
				case "style":
					key = getStyleKey(href);
					break;
				case "script": key = getScriptKey(href);
			}
			if (!(preloadPropsMap.has(key) || (href = assign({
				rel: "preload",
				href: "image" === as && options && options.imageSrcSet ? void 0 : href,
				as
			}, options), preloadPropsMap.set(key, href), null !== ownerDocument.querySelector(preloadSelector) || "style" === as && ownerDocument.querySelector(getStylesheetSelectorFromKey(key)) || "script" === as && ownerDocument.querySelector(getScriptSelectorFromKey(key))))) {
				var instance = ownerDocument.createElement("link");
				setInitialProperties(instance, "link", href);
				"style" === as && (instance[internalLoadPendingKey] = !0, instance.onload = instance.onerror = function() {
					clearPendingLoadOnNode(instance);
				});
				markNodeAsHoistable(instance);
				ownerDocument.head.appendChild(instance);
			}
		}
	}
	function preloadModule(href, options) {
		previousDispatcher.m(href, options);
		var ownerDocument = globalDocument;
		if (ownerDocument && href) {
			var as = options && "string" === typeof options.as ? options.as : "script", preloadSelector = "link[rel=\"modulepreload\"][as=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(as) + "\"][href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"]", key = preloadSelector;
			switch (as) {
				case "audioworklet":
				case "paintworklet":
				case "serviceworker":
				case "sharedworker":
				case "worker":
				case "script": key = getScriptKey(href);
			}
			if (!preloadPropsMap.has(key) && (href = assign({
				rel: "modulepreload",
				href
			}, options), preloadPropsMap.set(key, href), null === ownerDocument.querySelector(preloadSelector))) {
				switch (as) {
					case "audioworklet":
					case "paintworklet":
					case "serviceworker":
					case "sharedworker":
					case "worker":
					case "script": if (ownerDocument.querySelector(getScriptSelectorFromKey(key))) return;
				}
				as = ownerDocument.createElement("link");
				setInitialProperties(as, "link", href);
				markNodeAsHoistable(as);
				ownerDocument.head.appendChild(as);
			}
		}
	}
	function preinitStyle(href, precedence, options) {
		previousDispatcher.S(href, precedence, options);
		var ownerDocument = globalDocument;
		if (ownerDocument && href) {
			var styles = getResourcesFromRoot(ownerDocument).hoistableStyles, key = getStyleKey(href);
			precedence = precedence || "default";
			var resource = styles.get(key);
			if (!resource) {
				var state = {
					loading: 0,
					preload: null
				};
				if (resource = ownerDocument.querySelector(getStylesheetSelectorFromKey(key))) state.loading = 5;
				else {
					href = assign({
						rel: "stylesheet",
						href,
						"data-precedence": precedence
					}, options);
					(options = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(href, options);
					var link = resource = ownerDocument.createElement("link");
					markNodeAsHoistable(link);
					setInitialProperties(link, "link", href);
					link._p = new Promise(function(resolve, reject) {
						link.onload = resolve;
						link.onerror = reject;
					});
					link.addEventListener("load", function() {
						state.loading |= 1;
					});
					link.addEventListener("error", function() {
						state.loading |= 2;
					});
					state.loading |= 4;
					insertStylesheet(resource, precedence, ownerDocument);
				}
				resource = {
					type: "stylesheet",
					instance: resource,
					count: 1,
					state
				};
				styles.set(key, resource);
			}
		}
	}
	function preinitScript(src, options) {
		previousDispatcher.X(src, options);
		var ownerDocument = globalDocument;
		if (ownerDocument && src) {
			var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
			resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({
				src,
				async: !0
			}, options), (options = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
				type: "script",
				instance: resource,
				count: 1,
				state: null
			}, scripts.set(key, resource));
		}
	}
	function preinitModuleScript(src, options) {
		previousDispatcher.M(src, options);
		var ownerDocument = globalDocument;
		if (ownerDocument && src) {
			var scripts = getResourcesFromRoot(ownerDocument).hoistableScripts, key = getScriptKey(src), resource = scripts.get(key);
			resource || (resource = ownerDocument.querySelector(getScriptSelectorFromKey(key)), resource || (src = assign({
				src,
				async: !0,
				type: "module"
			}, options), (options = preloadPropsMap.get(key)) && adoptPreloadPropsForScript(src, options), resource = ownerDocument.createElement("script"), markNodeAsHoistable(resource), setInitialProperties(resource, "link", src), ownerDocument.head.appendChild(resource)), resource = {
				type: "script",
				instance: resource,
				count: 1,
				state: null
			}, scripts.set(key, resource));
		}
	}
	function getResource(type, currentProps, pendingProps, currentResource) {
		var JSCompiler_inline_result = (JSCompiler_inline_result = rootInstanceStackCursor.current) ? getHoistableRoot(JSCompiler_inline_result) : null;
		if (!JSCompiler_inline_result) throw Error(formatProdErrorMessage(446));
		switch (type) {
			case "meta":
			case "title": return null;
			case "style": return "string" === typeof pendingProps.precedence && "string" === typeof pendingProps.href ? (pendingProps = getStyleKey(pendingProps.href), currentProps = getResourcesFromRoot(JSCompiler_inline_result).hoistableStyles, currentResource = currentProps.get(pendingProps), currentResource || (currentResource = {
				type: "style",
				instance: null,
				count: 0,
				state: null
			}, currentProps.set(pendingProps, currentResource)), currentResource) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			case "link":
				if ("stylesheet" === pendingProps.rel && "string" === typeof pendingProps.href && "string" === typeof pendingProps.precedence) {
					type = getStyleKey(pendingProps.href);
					var styles$268 = getResourcesFromRoot(JSCompiler_inline_result).hoistableStyles, resource$269 = styles$268.get(type);
					resource$269 || (JSCompiler_inline_result = JSCompiler_inline_result.ownerDocument || JSCompiler_inline_result, resource$269 = {
						type: "stylesheet",
						instance: null,
						count: 0,
						state: {
							loading: 0,
							preload: null
						}
					}, styles$268.set(type, resource$269), (styles$268 = JSCompiler_inline_result.querySelector(getStylesheetSelectorFromKey(type))) ? styles$268._p || (resource$269.instance = styles$268, resource$269.state.loading = 5) : (styles$268 = preloadPropsMap.get(type), styles$268 || (styles$268 = {
						rel: "preload",
						as: "style",
						href: pendingProps.href,
						crossOrigin: pendingProps.crossOrigin,
						integrity: pendingProps.integrity,
						media: pendingProps.media,
						hrefLang: pendingProps.hrefLang,
						referrerPolicy: pendingProps.referrerPolicy
					}, preloadPropsMap.set(type, styles$268)), preloadStylesheet(JSCompiler_inline_result, type, styles$268, resource$269.state)));
					if (currentProps && null === currentResource) throw Error(formatProdErrorMessage(528, ""));
					return resource$269;
				}
				if (currentProps && null !== currentResource) throw Error(formatProdErrorMessage(529, ""));
				return null;
			case "script": return currentProps = pendingProps.async, pendingProps = pendingProps.src, "string" === typeof pendingProps && currentProps && "function" !== typeof currentProps && "symbol" !== typeof currentProps ? (pendingProps = getScriptKey(pendingProps), currentProps = getResourcesFromRoot(JSCompiler_inline_result).hoistableScripts, currentResource = currentProps.get(pendingProps), currentResource || (currentResource = {
				type: "script",
				instance: null,
				count: 0,
				state: null
			}, currentProps.set(pendingProps, currentResource)), currentResource) : {
				type: "void",
				instance: null,
				count: 0,
				state: null
			};
			default: throw Error(formatProdErrorMessage(444, type));
		}
	}
	function getStyleKey(href) {
		return "href=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(href) + "\"";
	}
	function getStylesheetSelectorFromKey(key) {
		return "link[rel=\"stylesheet\"][" + key + "]";
	}
	function stylesheetPropsFromRawProps(rawProps) {
		return assign({}, rawProps, {
			"data-precedence": rawProps.precedence,
			precedence: null
		});
	}
	function preloadStylesheet(ownerDocument, key, preloadProps, state) {
		if (key = ownerDocument.querySelector("link[rel=\"preload\"][as=\"style\"][" + key + "]")) {
			if (!0 !== key[internalLoadPendingKey]) {
				state.loading = 1;
				return;
			}
		} else key = ownerDocument.createElement("link"), key[internalLoadPendingKey] = !0, key.onload = key.onerror = clearPendingLoadOnNode.bind(null, key), setInitialProperties(key, "link", preloadProps), markNodeAsHoistable(key), ownerDocument.head.appendChild(key);
		state.preload = key;
		key.addEventListener("load", function() {
			return state.loading |= 1;
		});
		key.addEventListener("error", function() {
			return state.loading |= 2;
		});
	}
	function getScriptKey(src) {
		return "[src=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(src) + "\"]";
	}
	function getScriptSelectorFromKey(key) {
		return "script[async]" + key;
	}
	function acquireResource(hoistableRoot, resource, props) {
		resource.count++;
		if (null === resource.instance) switch (resource.type) {
			case "style":
				var instance = hoistableRoot.querySelector("style[data-href~=\"" + escapeSelectorAttributeValueInsideDoubleQuotes(props.href) + "\"]");
				if (instance) return resource.instance = instance, markNodeAsHoistable(instance), instance;
				var styleProps = assign({}, props, {
					"data-href": props.href,
					"data-precedence": props.precedence,
					href: null,
					precedence: null
				});
				instance = (hoistableRoot.ownerDocument || hoistableRoot).createElement("style");
				markNodeAsHoistable(instance);
				setInitialProperties(instance, "style", styleProps);
				insertStylesheet(instance, props.precedence, hoistableRoot);
				return resource.instance = instance;
			case "stylesheet":
				styleProps = getStyleKey(props.href);
				var instance$274 = hoistableRoot.querySelector(getStylesheetSelectorFromKey(styleProps));
				if (instance$274) return resource.state.loading |= 4, resource.instance = instance$274, markNodeAsHoistable(instance$274), instance$274;
				instance = stylesheetPropsFromRawProps(props);
				(styleProps = preloadPropsMap.get(styleProps)) && adoptPreloadPropsForStylesheet(instance, styleProps);
				instance$274 = (hoistableRoot.ownerDocument || hoistableRoot).createElement("link");
				markNodeAsHoistable(instance$274);
				var linkInstance = instance$274;
				linkInstance._p = new Promise(function(resolve, reject) {
					linkInstance.onload = resolve;
					linkInstance.onerror = reject;
				});
				setInitialProperties(instance$274, "link", instance);
				resource.state.loading |= 4;
				insertStylesheet(instance$274, props.precedence, hoistableRoot);
				return resource.instance = instance$274;
			case "script":
				instance$274 = getScriptKey(props.src);
				if (styleProps = hoistableRoot.querySelector(getScriptSelectorFromKey(instance$274))) return resource.instance = styleProps, markNodeAsHoistable(styleProps), styleProps;
				instance = props;
				if (styleProps = preloadPropsMap.get(instance$274)) instance = assign({}, props), adoptPreloadPropsForScript(instance, styleProps);
				hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
				styleProps = hoistableRoot.createElement("script");
				markNodeAsHoistable(styleProps);
				setInitialProperties(styleProps, "link", instance);
				hoistableRoot.head.appendChild(styleProps);
				return resource.instance = styleProps;
			case "void": return null;
			default: throw Error(formatProdErrorMessage(443, resource.type));
		}
		else "stylesheet" === resource.type && 0 === (resource.state.loading & 4) && (instance = resource.instance, resource.state.loading |= 4, insertStylesheet(instance, props.precedence, hoistableRoot));
		return resource.instance;
	}
	function insertStylesheet(instance, precedence, root) {
		for (var nodes = root.querySelectorAll("link[rel=\"stylesheet\"][data-precedence],style[data-precedence]"), last = nodes.length ? nodes[nodes.length - 1] : null, prior = last, i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.dataset.precedence === precedence) prior = node;
			else if (prior !== last) break;
		}
		prior ? prior.parentNode.insertBefore(instance, prior.nextSibling) : (precedence = 9 === root.nodeType ? root.head : root, precedence.insertBefore(instance, precedence.firstChild));
	}
	function adoptPreloadPropsForStylesheet(stylesheetProps, preloadProps) {
		stylesheetProps.crossOrigin ??= preloadProps.crossOrigin;
		stylesheetProps.referrerPolicy ??= preloadProps.referrerPolicy;
		stylesheetProps.title ??= preloadProps.title;
	}
	function adoptPreloadPropsForScript(scriptProps, preloadProps) {
		scriptProps.crossOrigin ??= preloadProps.crossOrigin;
		scriptProps.referrerPolicy ??= preloadProps.referrerPolicy;
		scriptProps.integrity ??= preloadProps.integrity;
	}
	var tagCaches = null;
	function getHydratableHoistableCache(type, keyAttribute, ownerDocument) {
		if (null === tagCaches) {
			var cache = /* @__PURE__ */ new Map();
			var caches = tagCaches = /* @__PURE__ */ new Map();
			caches.set(ownerDocument, cache);
		} else caches = tagCaches, cache = caches.get(ownerDocument), cache || (cache = /* @__PURE__ */ new Map(), caches.set(ownerDocument, cache));
		if (cache.has(type)) return cache;
		cache.set(type, null);
		ownerDocument = ownerDocument.getElementsByTagName(type);
		for (caches = 0; caches < ownerDocument.length; caches++) {
			var node = ownerDocument[caches];
			if (!(node[internalHoistableMarker] || node[internalInstanceKey] || "link" === type && "stylesheet" === node.getAttribute("rel")) && "http://www.w3.org/2000/svg" !== node.namespaceURI) {
				var nodeKey = node.getAttribute(keyAttribute) || "";
				nodeKey = type + nodeKey;
				var existing = cache.get(nodeKey);
				existing ? existing.push(node) : cache.set(nodeKey, [node]);
			}
		}
		return cache;
	}
	function mountHoistable(hoistableRoot, type, instance) {
		hoistableRoot = hoistableRoot.ownerDocument || hoistableRoot;
		hoistableRoot.head.insertBefore(instance, "title" === type ? hoistableRoot.querySelector("head > title") : null);
	}
	function isHostHoistableType(type, props, hostContext) {
		if (1 === hostContext || null != props.itemProp) return !1;
		switch (type) {
			case "meta":
			case "title": return !0;
			case "style":
				if ("string" !== typeof props.precedence || "string" !== typeof props.href || "" === props.href) break;
				return !0;
			case "link":
				if ("string" !== typeof props.rel || "string" !== typeof props.href || "" === props.href || props.onLoad || props.onError) break;
				switch (props.rel) {
					case "stylesheet": return type = props.disabled, "string" === typeof props.precedence && null == type;
					default: return !0;
				}
			case "script": if (props.async && "function" !== typeof props.async && "symbol" !== typeof props.async && !props.onLoad && !props.onError && props.src && "string" === typeof props.src) return !0;
		}
		return !1;
	}
	function maySuspendCommit(type, props) {
		return "img" === type && null != props.src && "" !== props.src && null == props.onLoad && "lazy" !== props.loading;
	}
	function preloadResource(resource) {
		return "stylesheet" === resource.type && 0 === (resource.state.loading & 3) ? !1 : !0;
	}
	function estimateImageBytes(instance) {
		return (instance.width || 100) * (instance.height || 100) * ("number" === typeof devicePixelRatio ? devicePixelRatio : 1) * .25;
	}
	function suspendInstance(state, instance) {
		"function" === typeof instance.decode && (state.imgCount++, instance.complete || (state.imgBytes += estimateImageBytes(instance), state.suspenseyImages.push(instance)), state = onUnsuspendImg.bind(state), instance.decode().then(state, state));
	}
	function suspendResource(state, hoistableRoot, resource, props) {
		if ("stylesheet" === resource.type && ("string" !== typeof props.media || !1 !== matchMedia(props.media).matches) && 0 === (resource.state.loading & 4)) {
			if (null === resource.instance) {
				var key = getStyleKey(props.href), instance = hoistableRoot.querySelector(getStylesheetSelectorFromKey(key));
				if (instance) {
					hoistableRoot = instance._p;
					null !== hoistableRoot && "object" === typeof hoistableRoot && "function" === typeof hoistableRoot.then && (state.count++, state = onUnsuspend.bind(state), hoistableRoot.then(state, state));
					resource.state.loading |= 4;
					resource.instance = instance;
					markNodeAsHoistable(instance);
					return;
				}
				instance = hoistableRoot.ownerDocument || hoistableRoot;
				props = stylesheetPropsFromRawProps(props);
				(key = preloadPropsMap.get(key)) && adoptPreloadPropsForStylesheet(props, key);
				instance = instance.createElement("link");
				markNodeAsHoistable(instance);
				var linkInstance = instance;
				linkInstance._p = new Promise(function(resolve, reject) {
					linkInstance.onload = resolve;
					linkInstance.onerror = reject;
				});
				setInitialProperties(instance, "link", props);
				resource.instance = instance;
			}
			null === state.stylesheets && (state.stylesheets = /* @__PURE__ */ new Map());
			state.stylesheets.set(resource, hoistableRoot);
			(hoistableRoot = resource.state.preload) && 0 === (resource.state.loading & 3) && (state.count++, resource = onUnsuspend.bind(state), hoistableRoot.addEventListener("load", resource), hoistableRoot.addEventListener("error", resource));
		}
	}
	var estimatedBytesWithinLimit = 0;
	function waitForCommitToBeReady(state, timeoutOffset) {
		state.stylesheets && 0 === state.count && insertSuspendedStylesheets(state, state.stylesheets);
		return 0 < state.count || 0 < state.imgCount ? function(commit) {
			var stylesheetTimer = setTimeout(function() {
				state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets);
				if (state.unsuspend) {
					var unsuspend = state.unsuspend;
					state.unsuspend = null;
					unsuspend();
				}
			}, 6e4 + timeoutOffset);
			0 < state.imgBytes && 0 === estimatedBytesWithinLimit && (estimatedBytesWithinLimit = 62500 * estimateBandwidth());
			var imgTimer = setTimeout(function() {
				state.waitingForImages = !1;
				if (0 === state.count && (state.stylesheets && insertSuspendedStylesheets(state, state.stylesheets), state.unsuspend)) {
					var unsuspend = state.unsuspend;
					state.unsuspend = null;
					unsuspend();
				}
			}, (state.imgBytes > estimatedBytesWithinLimit ? 50 : 800) + timeoutOffset);
			state.unsuspend = commit;
			return function() {
				state.unsuspend = null;
				clearTimeout(stylesheetTimer);
				clearTimeout(imgTimer);
			};
		} : null;
	}
	function checkIfFullyUnsuspended(state) {
		if (0 === state.count && (0 === state.imgCount || !state.waitingForImages)) {
			if (state.stylesheets) insertSuspendedStylesheets(state, state.stylesheets);
			else if (state.unsuspend) {
				var unsuspend = state.unsuspend;
				state.unsuspend = null;
				unsuspend();
			}
		}
	}
	function onUnsuspend() {
		this.count--;
		checkIfFullyUnsuspended(this);
	}
	function onUnsuspendImg() {
		this.imgCount--;
		checkIfFullyUnsuspended(this);
	}
	var precedencesByRoot = null;
	function insertSuspendedStylesheets(state, resources) {
		state.stylesheets = null;
		null !== state.unsuspend && (state.count++, precedencesByRoot = /* @__PURE__ */ new Map(), resources.forEach(insertStylesheetIntoRoot, state), precedencesByRoot = null, onUnsuspend.call(state));
	}
	function insertStylesheetIntoRoot(root, resource) {
		if (!(resource.state.loading & 4)) {
			var precedences = precedencesByRoot.get(root);
			if (precedences) var last = precedences.get(null);
			else {
				precedences = /* @__PURE__ */ new Map();
				precedencesByRoot.set(root, precedences);
				for (var nodes = root.querySelectorAll("link[data-precedence],style[data-precedence]"), i = 0; i < nodes.length; i++) {
					var node = nodes[i];
					if ("LINK" === node.nodeName || "not all" !== node.getAttribute("media")) precedences.set(node.dataset.precedence, node), last = node;
				}
				last && precedences.set(null, last);
			}
			nodes = resource.instance;
			node = nodes.getAttribute("data-precedence");
			i = precedences.get(node) || last;
			i === last && precedences.set(null, nodes);
			precedences.set(node, nodes);
			this.count++;
			last = onUnsuspend.bind(this);
			nodes.addEventListener("load", last);
			nodes.addEventListener("error", last);
			i ? i.parentNode.insertBefore(nodes, i.nextSibling) : (root = 9 === root.nodeType ? root.head : root, root.insertBefore(nodes, root.firstChild));
			resource.state.loading |= 4;
		}
	}
	var HostTransitionContext = {
		$$typeof: REACT_CONTEXT_TYPE,
		Provider: null,
		Consumer: null,
		_currentValue: sharedNotPendingObject,
		_currentValue2: sharedNotPendingObject,
		_threadCount: 0
	};
	function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, formState) {
		this.tag = 1;
		this.containerInfo = containerInfo;
		this.pingCache = this.current = this.pendingChildren = null;
		this.timeoutHandle = -1;
		this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
		this.callbackPriority = 0;
		this.expirationTimes = createLaneMap(-1);
		this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
		this.entanglements = createLaneMap(0);
		this.hiddenUpdates = createLaneMap(null);
		this.identifierPrefix = identifierPrefix;
		this.onUncaughtError = onUncaughtError;
		this.onCaughtError = onCaughtError;
		this.onRecoverableError = onRecoverableError;
		this.pooledCache = null;
		this.pooledCacheLanes = 0;
		this.formState = formState;
		this.transitionTypes = null;
		this.incompleteTransitions = /* @__PURE__ */ new Map();
	}
	function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, formState, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator) {
		containerInfo = new FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, onDefaultTransitionIndicator, formState);
		tag = 1;
		!0 === isStrictMode && (tag |= 24);
		isStrictMode = createFiberImplClass(3, null, null, tag);
		containerInfo.current = isStrictMode;
		isStrictMode.stateNode = containerInfo;
		tag = createCache();
		tag.refCount++;
		containerInfo.pooledCache = tag;
		tag.refCount++;
		isStrictMode.memoizedState = {
			element: initialChildren,
			isDehydrated: hydrate,
			cache: tag
		};
		initializeUpdateQueue(isStrictMode);
		return containerInfo;
	}
	function getContextForSubtree(parentComponent) {
		if (!parentComponent) return emptyContextObject;
		parentComponent = emptyContextObject;
		return parentComponent;
	}
	function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
		parentComponent = getContextForSubtree(parentComponent);
		null === container.context ? container.context = parentComponent : container.pendingContext = parentComponent;
		container = createUpdate(lane);
		container.payload = { element };
		callback = void 0 === callback ? null : callback;
		null !== callback && (container.callback = callback);
		element = enqueueUpdate(rootFiber, container, lane);
		null !== element && (scheduleUpdateOnFiber(element, rootFiber, lane), entangleTransitions(element, rootFiber, lane));
	}
	function markRetryLaneImpl(fiber, retryLane) {
		fiber = fiber.memoizedState;
		if (null !== fiber && null !== fiber.dehydrated) {
			var a = fiber.retryLane;
			fiber.retryLane = 0 !== a && a < retryLane ? a : retryLane;
		}
	}
	function markRetryLaneIfNotHydrated(fiber, retryLane) {
		markRetryLaneImpl(fiber, retryLane);
		(fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
	}
	function attemptContinuousHydration(fiber) {
		if (13 === fiber.tag || 31 === fiber.tag) {
			var root = enqueueConcurrentRenderForLane(fiber, 67108864);
			null !== root && scheduleUpdateOnFiber(root, fiber, 67108864);
			markRetryLaneIfNotHydrated(fiber, 67108864);
		}
	}
	function attemptHydrationAtCurrentPriority(fiber) {
		if (13 === fiber.tag || 31 === fiber.tag) {
			var lane = requestUpdateLane();
			lane = getBumpedLaneForHydrationByLane(lane);
			var root = enqueueConcurrentRenderForLane(fiber, lane);
			null !== root && scheduleUpdateOnFiber(root, fiber, lane);
			markRetryLaneIfNotHydrated(fiber, lane);
		}
	}
	var _enabled = !0;
	function dispatchDiscreteEvent(domEventName, eventSystemFlags, container, nativeEvent) {
		var prevTransition = ReactSharedInternals.T;
		ReactSharedInternals.T = null;
		var previousPriority = ReactDOMSharedInternals.p;
		try {
			ReactDOMSharedInternals.p = 2, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
		} finally {
			ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
		}
	}
	function dispatchContinuousEvent(domEventName, eventSystemFlags, container, nativeEvent) {
		var prevTransition = ReactSharedInternals.T;
		ReactSharedInternals.T = null;
		var previousPriority = ReactDOMSharedInternals.p;
		try {
			ReactDOMSharedInternals.p = 8, dispatchEvent(domEventName, eventSystemFlags, container, nativeEvent);
		} finally {
			ReactDOMSharedInternals.p = previousPriority, ReactSharedInternals.T = prevTransition;
		}
	}
	function dispatchEvent(domEventName, eventSystemFlags, targetContainer, nativeEvent) {
		if (_enabled) {
			var blockedOn = findInstanceBlockingEvent(nativeEvent);
			if (null === blockedOn) dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, return_targetInst, targetContainer), clearIfContinuousEvent(domEventName, nativeEvent);
			else if (queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent)) nativeEvent.stopPropagation();
			else if (clearIfContinuousEvent(domEventName, nativeEvent), eventSystemFlags & 4 && -1 < discreteReplayableEvents.indexOf(domEventName)) {
				for (; null !== blockedOn;) {
					var fiber = getInstanceFromNode(blockedOn);
					if (null !== fiber) switch (fiber.tag) {
						case 3:
							fiber = fiber.stateNode;
							if (fiber.current.memoizedState.isDehydrated) {
								var lanes = getHighestPriorityLanes(fiber.pendingLanes);
								if (0 !== lanes) {
									var root = fiber;
									root.pendingLanes |= 2;
									for (root.entangledLanes |= 2; lanes;) {
										var lane = 1 << 31 - clz32(lanes);
										root.entanglements[1] |= lane;
										lanes &= ~lane;
									}
									ensureRootIsScheduled(fiber);
									0 === (executionContext & 6) && (workInProgressRootRenderTargetTime = now() + 500, flushSyncWorkAcrossRoots_impl(0, !1));
								}
							}
							break;
						case 31:
						case 13: root = enqueueConcurrentRenderForLane(fiber, 2), null !== root && scheduleUpdateOnFiber(root, fiber, 2), flushSyncWork$1(), markRetryLaneIfNotHydrated(fiber, 2);
					}
					fiber = findInstanceBlockingEvent(nativeEvent);
					null === fiber && dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, return_targetInst, targetContainer);
					if (fiber === blockedOn) break;
					blockedOn = fiber;
				}
				null !== blockedOn && nativeEvent.stopPropagation();
			} else dispatchEventForPluginEventSystem(domEventName, eventSystemFlags, nativeEvent, null, targetContainer);
		}
	}
	function findInstanceBlockingEvent(nativeEvent) {
		nativeEvent = getEventTarget(nativeEvent);
		return findInstanceBlockingTarget(nativeEvent);
	}
	var return_targetInst = null;
	function findInstanceBlockingTarget(targetNode) {
		return_targetInst = null;
		targetNode = getClosestInstanceFromNode(targetNode);
		if (null !== targetNode) {
			var nearestMounted = getNearestMountedFiber(targetNode);
			if (null === nearestMounted) targetNode = null;
			else {
				var tag = nearestMounted.tag;
				if (13 === tag) {
					targetNode = getSuspenseInstanceFromFiber(nearestMounted);
					if (null !== targetNode) return targetNode;
					targetNode = null;
				} else if (31 === tag) {
					targetNode = getActivityInstanceFromFiber(nearestMounted);
					if (null !== targetNode) return targetNode;
					targetNode = null;
				} else if (3 === tag) {
					if (nearestMounted.stateNode.current.memoizedState.isDehydrated) return 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
					targetNode = null;
				} else nearestMounted !== targetNode && (targetNode = null);
			}
		}
		return_targetInst = targetNode;
		return null;
	}
	function getEventPriority(domEventName) {
		switch (domEventName) {
			case "beforetoggle":
			case "cancel":
			case "click":
			case "close":
			case "contextmenu":
			case "copy":
			case "cut":
			case "auxclick":
			case "dblclick":
			case "dragend":
			case "dragstart":
			case "drop":
			case "focusin":
			case "focusout":
			case "input":
			case "invalid":
			case "keydown":
			case "keypress":
			case "keyup":
			case "mousedown":
			case "mouseup":
			case "paste":
			case "pause":
			case "play":
			case "pointercancel":
			case "pointerdown":
			case "pointerup":
			case "ratechange":
			case "reset":
			case "seeked":
			case "submit":
			case "toggle":
			case "touchcancel":
			case "touchend":
			case "touchstart":
			case "volumechange":
			case "change":
			case "selectionchange":
			case "textInput":
			case "compositionstart":
			case "compositionend":
			case "compositionupdate":
			case "beforeblur":
			case "afterblur":
			case "beforeinput":
			case "blur":
			case "fullscreenchange":
			case "fullscreenerror":
			case "focus":
			case "hashchange":
			case "popstate":
			case "select":
			case "selectstart": return 2;
			case "drag":
			case "dragenter":
			case "dragexit":
			case "dragleave":
			case "dragover":
			case "mousemove":
			case "mouseout":
			case "mouseover":
			case "pointermove":
			case "pointerout":
			case "pointerover":
			case "resize":
			case "scroll":
			case "touchmove":
			case "wheel":
			case "mouseenter":
			case "mouseleave":
			case "pointerenter":
			case "pointerleave": return 8;
			case "message": switch (getCurrentPriorityLevel()) {
				case ImmediatePriority: return 2;
				case UserBlockingPriority: return 8;
				case NormalPriority$1:
				case LowPriority: return 32;
				case IdlePriority: return 268435456;
				default: return 32;
			}
			default: return 32;
		}
	}
	var hasScheduledReplayAttempt = !1;
	var queuedFocus = null;
	var queuedDrag = null;
	var queuedMouse = null;
	var queuedPointers = /* @__PURE__ */ new Map();
	var queuedPointerCaptures = /* @__PURE__ */ new Map();
	var queuedExplicitHydrationTargets = [];
	var discreteReplayableEvents = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset".split(" ");
	function clearIfContinuousEvent(domEventName, nativeEvent) {
		switch (domEventName) {
			case "focusin":
			case "focusout":
				queuedFocus = null;
				break;
			case "dragenter":
			case "dragleave":
				queuedDrag = null;
				break;
			case "mouseover":
			case "mouseout":
				queuedMouse = null;
				break;
			case "pointerover":
			case "pointerout":
				queuedPointers.delete(nativeEvent.pointerId);
				break;
			case "gotpointercapture":
			case "lostpointercapture": queuedPointerCaptures.delete(nativeEvent.pointerId);
		}
	}
	function accumulateOrCreateContinuousQueuedReplayableEvent(existingQueuedEvent, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
		if (null === existingQueuedEvent || existingQueuedEvent.nativeEvent !== nativeEvent) return existingQueuedEvent = {
			blockedOn,
			domEventName,
			eventSystemFlags,
			nativeEvent,
			targetContainers: [targetContainer]
		}, null !== blockedOn && (blockedOn = getInstanceFromNode(blockedOn), null !== blockedOn && attemptContinuousHydration(blockedOn)), existingQueuedEvent;
		existingQueuedEvent.eventSystemFlags |= eventSystemFlags;
		blockedOn = existingQueuedEvent.targetContainers;
		null !== targetContainer && -1 === blockedOn.indexOf(targetContainer) && blockedOn.push(targetContainer);
		return existingQueuedEvent;
	}
	function queueIfContinuousEvent(blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent) {
		switch (domEventName) {
			case "focusin": return queuedFocus = accumulateOrCreateContinuousQueuedReplayableEvent(queuedFocus, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent), !0;
			case "dragenter": return queuedDrag = accumulateOrCreateContinuousQueuedReplayableEvent(queuedDrag, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent), !0;
			case "mouseover": return queuedMouse = accumulateOrCreateContinuousQueuedReplayableEvent(queuedMouse, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent), !0;
			case "pointerover":
				var pointerId = nativeEvent.pointerId;
				queuedPointers.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointers.get(pointerId) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent));
				return !0;
			case "gotpointercapture": return pointerId = nativeEvent.pointerId, queuedPointerCaptures.set(pointerId, accumulateOrCreateContinuousQueuedReplayableEvent(queuedPointerCaptures.get(pointerId) || null, blockedOn, domEventName, eventSystemFlags, targetContainer, nativeEvent)), !0;
		}
		return !1;
	}
	function attemptExplicitHydrationTarget(queuedTarget) {
		var targetInst = getClosestInstanceFromNode(queuedTarget.target);
		if (null !== targetInst) {
			var nearestMounted = getNearestMountedFiber(targetInst);
			if (null !== nearestMounted) {
				if (targetInst = nearestMounted.tag, 13 === targetInst) {
					if (targetInst = getSuspenseInstanceFromFiber(nearestMounted), null !== targetInst) {
						queuedTarget.blockedOn = targetInst;
						runWithPriority(queuedTarget.priority, function() {
							attemptHydrationAtCurrentPriority(nearestMounted);
						});
						return;
					}
				} else if (31 === targetInst) {
					if (targetInst = getActivityInstanceFromFiber(nearestMounted), null !== targetInst) {
						queuedTarget.blockedOn = targetInst;
						runWithPriority(queuedTarget.priority, function() {
							attemptHydrationAtCurrentPriority(nearestMounted);
						});
						return;
					}
				} else if (3 === targetInst && nearestMounted.stateNode.current.memoizedState.isDehydrated) {
					queuedTarget.blockedOn = 3 === nearestMounted.tag ? nearestMounted.stateNode.containerInfo : null;
					return;
				}
			}
		}
		queuedTarget.blockedOn = null;
	}
	function attemptReplayContinuousQueuedEvent(queuedEvent) {
		if (null !== queuedEvent.blockedOn) return !1;
		for (var targetContainers = queuedEvent.targetContainers; 0 < targetContainers.length;) {
			var nextBlockedOn = findInstanceBlockingEvent(queuedEvent.nativeEvent);
			if (null === nextBlockedOn) {
				nextBlockedOn = queuedEvent.nativeEvent;
				var nativeEventClone = new nextBlockedOn.constructor(nextBlockedOn.type, nextBlockedOn);
				currentReplayingEvent = nativeEventClone;
				nextBlockedOn.target.dispatchEvent(nativeEventClone);
				currentReplayingEvent = null;
			} else return targetContainers = getInstanceFromNode(nextBlockedOn), null !== targetContainers && attemptContinuousHydration(targetContainers), queuedEvent.blockedOn = nextBlockedOn, !1;
			targetContainers.shift();
		}
		return !0;
	}
	function attemptReplayContinuousQueuedEventInMap(queuedEvent, key, map) {
		attemptReplayContinuousQueuedEvent(queuedEvent) && map.delete(key);
	}
	function replayUnblockedEvents() {
		hasScheduledReplayAttempt = !1;
		null !== queuedFocus && attemptReplayContinuousQueuedEvent(queuedFocus) && (queuedFocus = null);
		null !== queuedDrag && attemptReplayContinuousQueuedEvent(queuedDrag) && (queuedDrag = null);
		null !== queuedMouse && attemptReplayContinuousQueuedEvent(queuedMouse) && (queuedMouse = null);
		queuedPointers.forEach(attemptReplayContinuousQueuedEventInMap);
		queuedPointerCaptures.forEach(attemptReplayContinuousQueuedEventInMap);
	}
	function scheduleCallbackIfUnblocked(queuedEvent, unblocked) {
		queuedEvent.blockedOn === unblocked && (queuedEvent.blockedOn = null, hasScheduledReplayAttempt || (hasScheduledReplayAttempt = !0, Scheduler.unstable_scheduleCallback(Scheduler.unstable_NormalPriority, replayUnblockedEvents)));
	}
	var lastScheduledReplayQueue = null;
	function scheduleReplayQueueIfNeeded(formReplayingQueue) {
		lastScheduledReplayQueue !== formReplayingQueue && (lastScheduledReplayQueue = formReplayingQueue, Scheduler.unstable_scheduleCallback(Scheduler.unstable_NormalPriority, function() {
			lastScheduledReplayQueue === formReplayingQueue && (lastScheduledReplayQueue = null);
			for (var i = 0; i < formReplayingQueue.length; i += 3) {
				var form = formReplayingQueue[i], submitterOrAction = formReplayingQueue[i + 1], formData = formReplayingQueue[i + 2];
				if ("function" !== typeof submitterOrAction) if (null === findInstanceBlockingTarget(submitterOrAction || form)) continue;
				else break;
				var formInst = getInstanceFromNode(form);
				null !== formInst && (formReplayingQueue.splice(i, 3), i -= 3, startHostTransition(formInst, {
					pending: !0,
					data: formData,
					method: form.method,
					action: submitterOrAction
				}, submitterOrAction, formData));
			}
		}));
	}
	function retryIfBlockedOn(unblocked) {
		function unblock(queuedEvent) {
			return scheduleCallbackIfUnblocked(queuedEvent, unblocked);
		}
		null !== queuedFocus && scheduleCallbackIfUnblocked(queuedFocus, unblocked);
		null !== queuedDrag && scheduleCallbackIfUnblocked(queuedDrag, unblocked);
		null !== queuedMouse && scheduleCallbackIfUnblocked(queuedMouse, unblocked);
		queuedPointers.forEach(unblock);
		queuedPointerCaptures.forEach(unblock);
		for (var i = 0; i < queuedExplicitHydrationTargets.length; i++) {
			var queuedTarget = queuedExplicitHydrationTargets[i];
			queuedTarget.blockedOn === unblocked && (queuedTarget.blockedOn = null);
		}
		for (; 0 < queuedExplicitHydrationTargets.length && (i = queuedExplicitHydrationTargets[0], null === i.blockedOn);) attemptExplicitHydrationTarget(i), null === i.blockedOn && queuedExplicitHydrationTargets.shift();
		i = (unblocked.ownerDocument || unblocked).$$reactFormReplay;
		if (null != i) for (queuedTarget = 0; queuedTarget < i.length; queuedTarget += 3) {
			var form = i[queuedTarget], submitterOrAction = i[queuedTarget + 1], formProps = form[internalPropsKey] || null;
			if ("function" === typeof submitterOrAction) formProps || scheduleReplayQueueIfNeeded(i);
			else if (formProps) {
				var action = null;
				if (submitterOrAction && submitterOrAction.hasAttribute("formAction")) {
					if (form = submitterOrAction, formProps = submitterOrAction[internalPropsKey] || null) action = formProps.formAction;
					else if (null !== findInstanceBlockingTarget(form)) continue;
				} else action = formProps.action;
				"function" === typeof action ? i[queuedTarget + 1] = action : (i.splice(queuedTarget, 3), queuedTarget -= 3);
				scheduleReplayQueueIfNeeded(i);
			}
		}
	}
	function defaultOnDefaultTransitionIndicator() {
		function handleNavigate(event) {
			event.canIntercept && "react-transition" === event.info && event.intercept({
				handler: function() {
					return new Promise(function(resolve) {
						return pendingResolve = resolve;
					});
				},
				focusReset: "manual",
				scroll: "manual"
			});
		}
		function handleNavigateComplete() {
			null !== pendingResolve && (pendingResolve(), pendingResolve = null);
			isCancelled || setTimeout(startFakeNavigation, 20);
		}
		function startFakeNavigation() {
			if (!isCancelled && !navigation.transition) {
				var currentEntry = navigation.currentEntry;
				currentEntry && null != currentEntry.url && navigation.navigate(currentEntry.url, {
					state: currentEntry.getState(),
					info: "react-transition",
					history: "replace"
				});
			}
		}
		if ("object" === typeof navigation) {
			var isCancelled = !1, pendingResolve = null;
			navigation.addEventListener("navigate", handleNavigate);
			navigation.addEventListener("navigatesuccess", handleNavigateComplete);
			navigation.addEventListener("navigateerror", handleNavigateComplete);
			setTimeout(startFakeNavigation, 100);
			return function() {
				isCancelled = !0;
				navigation.removeEventListener("navigate", handleNavigate);
				navigation.removeEventListener("navigatesuccess", handleNavigateComplete);
				navigation.removeEventListener("navigateerror", handleNavigateComplete);
				null !== pendingResolve && (pendingResolve(), pendingResolve = null);
			};
		}
	}
	function ReactDOMRoot(internalRoot) {
		this._internalRoot = internalRoot;
	}
	ReactDOMHydrationRoot.prototype.render = ReactDOMRoot.prototype.render = function(children) {
		var root = this._internalRoot;
		if (null === root) throw Error(formatProdErrorMessage(409));
		updateContainerImpl(root.current, requestUpdateLane(), children, root, null, null);
	};
	ReactDOMHydrationRoot.prototype.unmount = ReactDOMRoot.prototype.unmount = function() {
		var root = this._internalRoot;
		if (null !== root) {
			this._internalRoot = null;
			var container = root.containerInfo;
			updateContainerImpl(root.current, 2, null, root, null, null);
			flushSyncWork$1();
			container[internalContainerInstanceKey] = null;
		}
	};
	function ReactDOMHydrationRoot(internalRoot) {
		this._internalRoot = internalRoot;
	}
	ReactDOMHydrationRoot.prototype.unstable_scheduleHydration = function(target) {
		if (target) {
			var updatePriority = resolveUpdatePriority();
			target = {
				blockedOn: null,
				target,
				priority: updatePriority
			};
			for (var i = 0; i < queuedExplicitHydrationTargets.length && 0 !== updatePriority && updatePriority < queuedExplicitHydrationTargets[i].priority; i++);
			queuedExplicitHydrationTargets.splice(i, 0, target);
			0 === i && attemptExplicitHydrationTarget(target);
		}
	};
	var isomorphicReactPackageVersion$jscomp$inline_2043 = React.version;
	if ("19.3.1" !== isomorphicReactPackageVersion$jscomp$inline_2043) throw Error(formatProdErrorMessage(527, isomorphicReactPackageVersion$jscomp$inline_2043, "19.3.1"));
	ReactDOMSharedInternals.findDOMNode = function(componentOrElement) {
		var fiber = componentOrElement._reactInternals;
		if (void 0 === fiber) {
			if ("function" === typeof componentOrElement.render) throw Error(formatProdErrorMessage(188));
			componentOrElement = Object.keys(componentOrElement).join(",");
			throw Error(formatProdErrorMessage(268, componentOrElement));
		}
		componentOrElement = findCurrentFiberUsingSlowPath(fiber);
		componentOrElement = null !== componentOrElement ? findCurrentHostFiberImpl(componentOrElement) : null;
		componentOrElement = null === componentOrElement ? null : componentOrElement.stateNode;
		return componentOrElement;
	};
	var internals$jscomp$inline_2586 = {
		bundleType: 0,
		version: "19.3.1",
		rendererPackageName: "react-dom",
		currentDispatcherRef: ReactSharedInternals,
		reconcilerVersion: "19.3.1"
	};
	if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
		var hook$jscomp$inline_2587 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
		if (!hook$jscomp$inline_2587.isDisabled && hook$jscomp$inline_2587.supportsFiber) try {
			rendererID = hook$jscomp$inline_2587.inject(internals$jscomp$inline_2586), injectedHook = hook$jscomp$inline_2587;
		} catch (err) {}
	}
	exports.createRoot = function(container, options) {
		if (!isValidContainer(container)) throw Error(formatProdErrorMessage(299));
		var isStrictMode = !1, identifierPrefix = "", onUncaughtError = defaultOnUncaughtError, onCaughtError = defaultOnCaughtError, onRecoverableError = defaultOnRecoverableError;
		null !== options && void 0 !== options && (!0 === options.unstable_strictMode && (isStrictMode = !0), void 0 !== options.identifierPrefix && (identifierPrefix = options.identifierPrefix), void 0 !== options.onUncaughtError && (onUncaughtError = options.onUncaughtError), void 0 !== options.onCaughtError && (onCaughtError = options.onCaughtError), void 0 !== options.onRecoverableError && (onRecoverableError = options.onRecoverableError));
		options = createFiberRoot(container, 1, !1, null, null, isStrictMode, identifierPrefix, null, onUncaughtError, onCaughtError, onRecoverableError, defaultOnDefaultTransitionIndicator);
		container[internalContainerInstanceKey] = options.current;
		listenToAllSupportedEvents(container);
		return new ReactDOMRoot(options);
	};
}));
// node_modules/react-dom/client.js
var require_client = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	function checkDCE() {
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") return;
		try {
			__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
		} catch (err) {
			console.error(err);
		}
	}
	checkDCE();
	module.exports = require_react_dom_client_production();
}));
// node_modules/react/cjs/react-jsx-runtime.production.js
/**
* @license React
* react-jsx-runtime.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_jsx_runtime_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	function jsxProd(type, config, maybeKey) {
		var key = null;
		void 0 !== maybeKey && (key = "" + maybeKey);
		void 0 !== config.key && (key = "" + config.key);
		if ("key" in config) {
			maybeKey = {};
			for (var propName in config) "key" !== propName && (maybeKey[propName] = config[propName]);
		} else maybeKey = config;
		config = maybeKey.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== config ? config : null,
			props: maybeKey
		};
	}
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.jsx = jsxProd;
	exports.jsxs = jsxProd;
}));
// node_modules/react/jsx-runtime.js
var require_jsx_runtime = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = require_react_jsx_runtime_production();
}));
// src/components/FighterEmblem.tsx
var import_react = require_react();
var import_client = require_client();
var import_jsx_runtime = require_jsx_runtime();
function FighterEmblem({ id, className = "w-9 h-9" }) {
	if (id === "blaze") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 36 36",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "18",
				r: "16",
				fill: "#7F1D1D",
				stroke: "#0F172A",
				strokeWidth: "2.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M11 26 L12 16 L9 12 L15 14 L18 6 L21 14 L27 11 L24 16 L25 26 Z",
				fill: "#EF4444",
				stroke: "#0F172A",
				strokeWidth: "1.8",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M14 21 L22 20 L21 24 L14 24 Z",
				fill: "#FDE047"
			})
		]
	});
	if (id === "gale") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 36 36",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "18",
				r: "16",
				fill: "#1E3A8A",
				stroke: "#0F172A",
				strokeWidth: "2.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M8 14 L22 10 L26 24 L13 24 Z",
				fill: "#2563EB",
				stroke: "#0F172A",
				strokeWidth: "1.8",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M12 28 Q22 22 29 10",
				fill: "none",
				stroke: "#67E8F9",
				strokeWidth: "3",
				strokeLinecap: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "17",
				y: "16",
				width: "7",
				height: "3",
				fill: "#67E8F9"
			})
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 36 36",
		className,
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "18",
				r: "16",
				fill: "#78350F",
				stroke: "#0F172A",
				strokeWidth: "2.5"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				d: "M9 14 L7 7 L13 12 H23 L29 7 L27 14 L26 26 H10 Z",
				fill: "#475569",
				stroke: "#0F172A",
				strokeWidth: "1.8",
				strokeLinejoin: "round"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
				x: "12",
				y: "17",
				width: "12",
				height: "4",
				fill: "#FEF08A",
				stroke: "#0F172A",
				strokeWidth: "1.2"
			})
		]
	});
}
// src/components/GameHud.tsx
function getDamageColor(damage) {
	if (damage >= 120) return "text-red-400";
	if (damage >= 70) return "text-amber-300";
	return "text-slate-50";
}
function FighterCard({ fighter }) {
	const isP1 = fighter.slot === 0;
	const tagLabel = fighter.isLocalControl === true ? "YOU" : isP1 ? "P1" : fighter.isCpu ? "CPU" : "P2";
	const accentBorder = isP1 ? "border-red-500/75" : "border-blue-500/75";
	const tagBg = isP1 ? "bg-red-600" : "bg-blue-600";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border-2 ${accentBorder} shadow-[0_8px_20px_rgba(0,0,0,0.55)] min-w-[205px] sm:min-w-[235px]`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative shrink-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
				id: fighter.id,
				className: "w-11 h-11"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded text-[10px] font-extrabold tracking-wide text-white ${tagBg}`,
				children: tagLabel
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col flex-1 min-w-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-baseline justify-between gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-display text-lg font-bold tracking-wide text-slate-100 leading-none truncate",
					children: fighter.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					"data-testid": `damage-p${fighter.slot + 1}`,
					className: `font-display text-3xl font-extrabold leading-none tabular-nums hud-stroke ${getDamageColor(fighter.damage)}`,
					children: [fighter.damage, "%"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex items-center gap-1.5 mt-1.5",
				"aria-label": `${fighter.stocks} stocks remaining`,
				children: Array.from({ length: fighter.maxStocks }).map((_, idx) => {
					const alive = idx < fighter.stocks;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
						viewBox: "0 0 14 14",
						className: "w-3.5 h-3.5",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
							cx: "7",
							cy: "7",
							r: "5.5",
							fill: alive ? fighter.primaryColor : "transparent",
							stroke: alive ? fighter.accentColor : "#475569",
							strokeWidth: "2"
						})
					}, idx);
				})
			})]
		})]
	});
}
function GameHud({ hud, muted, isOnline = false, onToggleMute, onPause, onRestart }) {
	const mins = Math.floor(hud.elapsedSeconds / 60);
	const secs = String(hud.elapsedSeconds % 60).padStart(2, "0");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-start justify-between",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-28 hidden sm:block" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "px-3.5 py-1 rounded-lg bg-slate-950/88 border border-slate-700/75 text-slate-100 font-mono-tabular text-sm font-bold shadow-md",
						children: [
							mins,
							":",
							secs
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 pointer-events-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								tabIndex: -1,
								"aria-label": muted ? "Unmute audio (M)" : "Mute audio (M)",
								title: muted ? "Unmute (M)" : "Mute (M)",
								onClick: (e) => {
									e.currentTarget.blur();
									onToggleMute();
								},
								className: "w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									viewBox: "0 0 24 24",
									className: "w-5 h-5",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", {
										points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5",
										fill: "currentColor"
									}), muted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: "22",
										y1: "9",
										x2: "16",
										y2: "15"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
										x1: "16",
										y1: "9",
										x2: "22",
										y2: "15"
									})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.5 8.5a5 5 0 0 1 0 7" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M18.5 5.5a9 9 0 0 1 0 13" })] })]
								})
							}),
							!isOnline && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								tabIndex: -1,
								"aria-label": "Restart match (R)",
								title: "Restart (R)",
								onClick: (e) => {
									e.currentTarget.blur();
									onRestart();
								},
								className: "w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									viewBox: "0 0 24 24",
									className: "w-5 h-5",
									fill: "none",
									stroke: "currentColor",
									strokeWidth: "2.2",
									strokeLinecap: "round",
									strokeLinejoin: "round",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 12a9 9 0 1 0 3-6.7L3 8" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 3v5h5" })]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								tabIndex: -1,
								"aria-label": "Pause match (P or Escape)",
								title: "Pause (Esc)",
								onClick: (e) => {
									e.currentTarget.blur();
									onPause();
								},
								className: "w-10 h-10 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-700 text-slate-100 flex items-center justify-center transition-colors cursor-pointer",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
									viewBox: "0 0 24 24",
									className: "w-5 h-5",
									fill: "currentColor",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
										x: "6",
										y: "5",
										width: "4",
										height: "14",
										rx: "1"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", {
										x: "14",
										y: "5",
										width: "4",
										height: "14",
										rx: "1"
									})]
								})
							})
						]
					})
				]
			}),
			(hud.countdownText || hud.koBannerText) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 pointer-events-none flex items-center justify-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-display italic font-extrabold text-7xl sm:text-8xl tracking-wider text-amber-400 hud-stroke",
					children: hud.countdownText ?? hud.koBannerText
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end justify-center gap-4 sm:gap-10 pb-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterCard, { fighter: hud.fighters[0] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterCard, { fighter: hud.fighters[1] })]
			})
		]
	});
}
// src/components/StatusModal.tsx
function PauseModal({ isOnline = false, controlSummary, onResume, onRestart, onReturnTitle }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 p-4",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": isOnline ? "Online Match Menu" : "Match Paused",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-4xl font-extrabold italic tracking-wide text-white",
						children: isOnline ? "MATCH MENU" : "PAUSED"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-slate-400 mt-1",
						children: isOnline ? "Online match stays live while this menu is open" : "Press Esc or P to resume battle"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-slate-300 text-center leading-relaxed border-y border-slate-800 py-2.5",
					children: controlSummary ?? "Normal: J / Z · Special: K / X · Up + Special: Recovery · Shield / Dodge: L / C"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onResume,
							className: "w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer",
							children: "Resume Match"
						}),
						!isOnline && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onRestart,
							className: "w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer",
							children: "Restart Match"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onReturnTitle,
							className: "w-full py-2.5 px-4 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-slate-800 transition-colors cursor-pointer",
							children: isOnline ? "Leave Online Match" : "Back to Title"
						})
					]
				})
			]
		})
	});
}
function GameOverModal({ result, isOnline = false, onlineRole, rematchRequested = false, opponentRematchRequested = false, onRequestRematch, onPlayAgain, onReturnTitle }) {
	const p1Won = result.winnerSlot === 0;
	const p2Label = result.mode === "cpu" ? "CPU" : "P2";
	const isGuest = isOnline && onlineRole === "guest";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-20 flex items-center justify-center bg-slate-950/78 p-4",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Match Results",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs font-semibold uppercase tracking-widest text-amber-400",
							children: [
								result.stageName,
								" · ",
								result.durationSeconds,
								"s"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "font-display text-5xl font-extrabold italic tracking-wide text-white mt-1",
							children: [result.winnerName, " WINS!"]
						}),
						isOnline && opponentRematchRequested && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-semibold text-emerald-400 mt-1.5",
							children: "Opponent wants a rematch!"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-lg p-3.5 border ${p1Won ? "bg-slate-800/90 border-red-500" : "bg-slate-950/80 border-slate-800"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mb-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
								id: result.p1Stats.fighterId,
								className: "w-8 h-8"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-bold text-red-400",
								children: "P1"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-bold text-white leading-none",
								children: result.p1Stats.name
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-1 text-xs tabular-nums",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "KOs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-white",
										children: result.p1Stats.kos
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Damage Dealt" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-white",
										children: [result.p1Stats.damageDealt, "%"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stocks Left" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-white",
										children: result.p1Stats.stocksLeft
									})]
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: `rounded-lg p-3.5 border ${!p1Won ? "bg-slate-800/90 border-blue-500" : "bg-slate-950/80 border-slate-800"}`,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mb-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
								id: result.p2Stats.fighterId,
								className: "w-8 h-8"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-bold text-blue-400",
								children: p2Label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-sm font-bold text-white leading-none",
								children: result.p2Stats.name
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col gap-1 text-xs tabular-nums",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "KOs" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-white",
										children: result.p2Stats.kos
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Damage Dealt" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-white",
										children: [result.p2Stats.damageDealt, "%"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-slate-300",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Stocks Left" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-bold text-white",
										children: result.p2Stats.stocksLeft
									})]
								})
							]
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [isGuest ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						disabled: rematchRequested,
						onClick: onRequestRematch,
						className: "flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-300 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-default",
						children: rematchRequested ? "Rematch Requested..." : "Request Rematch"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"data-start": "true",
						onClick: onPlayAgain,
						className: "flex-1 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer",
						children: isOnline && opponentRematchRequested ? "Start Rematch" : "Play Again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onReturnTitle,
						className: "py-3 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 transition-colors cursor-pointer whitespace-nowrap",
						children: isOnline ? "Back to Lobby" : "Change Fighters"
					})]
				})
			]
		})
	});
}
function DisconnectModal({ message, onReturnLobby }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": "Connection Lost",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-4 text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl font-extrabold uppercase tracking-wide text-white",
					children: "Connection Lost"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-slate-300",
					children: message
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: onReturnLobby,
					className: "w-full py-2.5 px-4 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer",
					children: "Back to Online Lobby"
				})
			]
		})
	});
}
// src/game/fighters.ts
var FIGHTERS = {
	blaze: {
		id: "blaze",
		name: "Blaze",
		archetype: "Flame Brawler",
		tagline: "Fireball barrages, comet dashes, and rising phoenix uppercuts",
		weight: .96,
		maxSpeed: 395,
		groundAccel: 2650,
		airAccel: 1680,
		jumpForce: 640,
		doubleJumpForce: 600,
		gravity: 1650,
		fallSpeedMax: 720,
		fastFallMax: 1020,
		width: 40,
		height: 64,
		primaryColor: "#EF4444",
		secondaryColor: "#991B1B",
		accentColor: "#FDBA74",
		attacks: {
			jab: {
				kind: "jab",
				name: "Ember Jab",
				windup: .06,
				active: .1,
				recovery: .12,
				damage: 7,
				baseKnockback: 125,
				knockbackGrowth: 1.55,
				angleDeg: 32,
				rangeX: 54,
				rangeY: 42,
				offsetX: 34,
				offsetY: -34,
				hitstop: .035
			},
			sideTilt: {
				kind: "sideTilt",
				name: "Flare Kick",
				windup: .1,
				active: .12,
				recovery: .18,
				damage: 13,
				baseKnockback: 195,
				knockbackGrowth: 3.8,
				angleDeg: 36,
				rangeX: 66,
				rangeY: 46,
				offsetX: 40,
				offsetY: -34,
				hitstop: .055,
				selfVx: 180
			},
			upAir: {
				kind: "upAir",
				name: "Sky Snap",
				windup: .07,
				active: .13,
				recovery: .14,
				damage: 11,
				baseKnockback: 185,
				knockbackGrowth: 3.4,
				angleDeg: 82,
				rangeX: 58,
				rangeY: 56,
				offsetX: 8,
				offsetY: -72,
				hitstop: .045
			},
			downAir: {
				kind: "downAir",
				name: "Meteor Heel",
				windup: .11,
				active: .14,
				recovery: .2,
				damage: 14,
				baseKnockback: 190,
				knockbackGrowth: 3.6,
				angleDeg: -78,
				rangeX: 50,
				rangeY: 54,
				offsetX: 6,
				offsetY: 4,
				hitstop: .065,
				isMeteor: true
			},
			neutralSpecial: {
				kind: "neutralSpecial",
				name: "Fireball",
				windup: .13,
				active: .08,
				recovery: .2,
				damage: 10,
				baseKnockback: 145,
				knockbackGrowth: 2,
				angleDeg: 40,
				rangeX: 40,
				rangeY: 36,
				offsetX: 36,
				offsetY: -36,
				hitstop: .035,
				projectileSpeed: 560,
				projectileVy: 0,
				projectileGravity: 0,
				projectileRadius: 14,
				projectileVisual: "fireball"
			},
			sideSpecial: {
				kind: "sideSpecial",
				name: "Flame Comet",
				windup: .11,
				active: .22,
				recovery: .21,
				damage: 15,
				baseKnockback: 215,
				knockbackGrowth: 4.1,
				angleDeg: 28,
				rangeX: 66,
				rangeY: 50,
				offsetX: 32,
				offsetY: -34,
				hitstop: .065,
				selfVx: 610,
				selfVy: -115
			},
			upSpecial: {
				kind: "upSpecial",
				name: "Rising Phoenix",
				windup: .08,
				active: .28,
				recovery: .2,
				damage: 14,
				baseKnockback: 210,
				knockbackGrowth: 3.9,
				angleDeg: 74,
				rangeX: 60,
				rangeY: 68,
				offsetX: 14,
				offsetY: -44,
				hitstop: .06,
				selfVx: 185,
				selfVy: -840,
				isRecovery: true
			},
			downSpecial: {
				kind: "downSpecial",
				name: "Solar Nova",
				windup: .16,
				active: .15,
				recovery: .24,
				damage: 18,
				baseKnockback: 235,
				knockbackGrowth: 4.5,
				angleDeg: 55,
				rangeX: 120,
				rangeY: 78,
				offsetX: 0,
				offsetY: -32,
				hitstop: .08
			}
		}
	},
	gale: {
		id: "gale",
		name: "Gale",
		archetype: "Wind Blade",
		tagline: "Razor wind crescents, cyclone launches, and projectile reflection",
		weight: .88,
		maxSpeed: 425,
		groundAccel: 2480,
		airAccel: 1980,
		jumpForce: 665,
		doubleJumpForce: 635,
		gravity: 1510,
		fallSpeedMax: 680,
		fastFallMax: 980,
		width: 36,
		height: 64,
		primaryColor: "#3B82F6",
		secondaryColor: "#1D4ED8",
		accentColor: "#67E8F9",
		attacks: {
			jab: {
				kind: "jab",
				name: "Swift Slash",
				windup: .05,
				active: .11,
				recovery: .11,
				damage: 6,
				baseKnockback: 115,
				knockbackGrowth: 1.45,
				angleDeg: 38,
				rangeX: 68,
				rangeY: 44,
				offsetX: 42,
				offsetY: -34,
				hitstop: .035
			},
			sideTilt: {
				kind: "sideTilt",
				name: "Crescent Sweep",
				windup: .09,
				active: .13,
				recovery: .17,
				damage: 12,
				baseKnockback: 185,
				knockbackGrowth: 3.6,
				angleDeg: 34,
				rangeX: 82,
				rangeY: 54,
				offsetX: 48,
				offsetY: -36,
				hitstop: .05,
				selfVx: 130
			},
			upAir: {
				kind: "upAir",
				name: "Whirl Arc",
				windup: .06,
				active: .14,
				recovery: .13,
				damage: 11,
				baseKnockback: 185,
				knockbackGrowth: 3.5,
				angleDeg: 85,
				rangeX: 76,
				rangeY: 62,
				offsetX: 4,
				offsetY: -76,
				hitstop: .045
			},
			downAir: {
				kind: "downAir",
				name: "Gale Plunge",
				windup: .1,
				active: .16,
				recovery: .18,
				damage: 13,
				baseKnockback: 180,
				knockbackGrowth: 3.5,
				angleDeg: -82,
				rangeX: 52,
				rangeY: 64,
				offsetX: 4,
				offsetY: 6,
				hitstop: .06,
				isMeteor: true
			},
			neutralSpecial: {
				kind: "neutralSpecial",
				name: "Tempest Blade",
				windup: .12,
				active: .08,
				recovery: .18,
				damage: 8,
				baseKnockback: 135,
				knockbackGrowth: 1.9,
				angleDeg: 54,
				rangeX: 42,
				rangeY: 36,
				offsetX: 38,
				offsetY: -36,
				hitstop: .03,
				projectileSpeed: 680,
				projectileVy: 0,
				projectileGravity: 0,
				projectileRadius: 15,
				projectileVisual: "windblade"
			},
			sideSpecial: {
				kind: "sideSpecial",
				name: "Zephyr Dash",
				windup: .08,
				active: .2,
				recovery: .18,
				damage: 13,
				baseKnockback: 200,
				knockbackGrowth: 3.85,
				angleDeg: 32,
				rangeX: 76,
				rangeY: 48,
				offsetX: 38,
				offsetY: -34,
				hitstop: .055,
				selfVx: 660,
				selfVy: -95
			},
			upSpecial: {
				kind: "upSpecial",
				name: "Updraft Cyclone",
				windup: .07,
				active: .28,
				recovery: .18,
				damage: 13,
				baseKnockback: 200,
				knockbackGrowth: 3.7,
				angleDeg: 78,
				rangeX: 66,
				rangeY: 74,
				offsetX: 14,
				offsetY: -46,
				hitstop: .055,
				selfVx: 215,
				selfVy: -865,
				isRecovery: true
			},
			downSpecial: {
				kind: "downSpecial",
				name: "Gale Reflector",
				windup: .09,
				active: .18,
				recovery: .19,
				damage: 12,
				baseKnockback: 205,
				knockbackGrowth: 3.6,
				angleDeg: 64,
				rangeX: 130,
				rangeY: 74,
				offsetX: 0,
				offsetY: -34,
				hitstop: .055,
				reflectsProjectiles: true
			}
		}
	},
	titan: {
		id: "titan",
		name: "Titan",
		archetype: "Stone Juggernaut",
		tagline: "Arcing boulders, armored ram charges, and seismic ground slams",
		weight: 1.26,
		maxSpeed: 325,
		groundAccel: 2050,
		airAccel: 1280,
		jumpForce: 605,
		doubleJumpForce: 560,
		gravity: 1760,
		fallSpeedMax: 790,
		fastFallMax: 1140,
		width: 52,
		height: 74,
		primaryColor: "#F59E0B",
		secondaryColor: "#92400E",
		accentColor: "#FEF08A",
		attacks: {
			jab: {
				kind: "jab",
				name: "Granite Fist",
				windup: .09,
				active: .11,
				recovery: .14,
				damage: 9,
				baseKnockback: 150,
				knockbackGrowth: 1.85,
				angleDeg: 30,
				rangeX: 64,
				rangeY: 50,
				offsetX: 40,
				offsetY: -40,
				hitstop: .045
			},
			sideTilt: {
				kind: "sideTilt",
				name: "Boulder Smash",
				windup: .15,
				active: .14,
				recovery: .22,
				damage: 18,
				baseKnockback: 230,
				knockbackGrowth: 4.5,
				angleDeg: 34,
				rangeX: 78,
				rangeY: 56,
				offsetX: 48,
				offsetY: -40,
				hitstop: .08,
				selfVx: 140
			},
			upAir: {
				kind: "upAir",
				name: "Anvil Clap",
				windup: .1,
				active: .14,
				recovery: .18,
				damage: 15,
				baseKnockback: 210,
				knockbackGrowth: 4.1,
				angleDeg: 84,
				rangeX: 70,
				rangeY: 62,
				offsetX: 4,
				offsetY: -80,
				hitstop: .065
			},
			downAir: {
				kind: "downAir",
				name: "Tectonic Stomp",
				windup: .14,
				active: .16,
				recovery: .22,
				damage: 18,
				baseKnockback: 215,
				knockbackGrowth: 4.2,
				angleDeg: -85,
				rangeX: 66,
				rangeY: 58,
				offsetX: 0,
				offsetY: 6,
				hitstop: .08,
				isMeteor: true
			},
			neutralSpecial: {
				kind: "neutralSpecial",
				name: "Boulder Toss",
				windup: .2,
				active: .1,
				recovery: .24,
				damage: 15,
				baseKnockback: 190,
				knockbackGrowth: 3.1,
				angleDeg: 42,
				rangeX: 46,
				rangeY: 46,
				offsetX: 42,
				offsetY: -44,
				hitstop: .055,
				projectileSpeed: 420,
				projectileVy: -290,
				projectileGravity: 820,
				projectileRadius: 19,
				projectileVisual: "boulder"
			},
			sideSpecial: {
				kind: "sideSpecial",
				name: "Tectonic Ram",
				windup: .15,
				active: .25,
				recovery: .24,
				damage: 20,
				baseKnockback: 245,
				knockbackGrowth: 4.7,
				angleDeg: 26,
				rangeX: 74,
				rangeY: 58,
				offsetX: 36,
				offsetY: -38,
				hitstop: .085,
				selfVx: 520,
				selfVy: -105,
				superArmor: true
			},
			upSpecial: {
				kind: "upSpecial",
				name: "Magma Geyser",
				windup: .1,
				active: .28,
				recovery: .22,
				damage: 17,
				baseKnockback: 220,
				knockbackGrowth: 4.1,
				angleDeg: 74,
				rangeX: 72,
				rangeY: 72,
				offsetX: 12,
				offsetY: -48,
				hitstop: .075,
				selfVx: 170,
				selfVy: -805,
				isRecovery: true
			},
			downSpecial: {
				kind: "downSpecial",
				name: "Quake Slam",
				windup: .21,
				active: .17,
				recovery: .27,
				damage: 22,
				baseKnockback: 255,
				knockbackGrowth: 4.9,
				angleDeg: 62,
				rangeX: 168,
				rangeY: 70,
				offsetX: 0,
				offsetY: -28,
				hitstop: .095
			}
		}
	}
};
var FIGHTER_LIST = [
	FIGHTERS.blaze,
	FIGHTERS.gale,
	FIGHTERS.titan
];
// src/game/hotkeys.ts
var HOTKEY_ACTION_LABELS = [
	{
		action: "left",
		label: "Move Left"
	},
	{
		action: "right",
		label: "Move Right"
	},
	{
		action: "up",
		label: "Aim Up"
	},
	{
		action: "down",
		label: "Crouch / Drop"
	},
	{
		action: "jump",
		label: "Jump"
	},
	{
		action: "attack",
		label: "Normal Attack"
	},
	{
		action: "special",
		label: "Special"
	},
	{
		action: "shield",
		label: "Shield / Dodge"
	}
];
var HOTKEY_STORAGE_KEY = "skyline_brawl_hotkeys_v1";
var ALL_ACTIONS = [
	"left",
	"right",
	"up",
	"down",
	"jump",
	"attack",
	"special",
	"shield"
];
function createDefaultHotkeys() {
	return {
		singlePrimary: {
			left: "KeyA",
			right: "KeyD",
			up: "KeyW",
			down: "KeyS",
			jump: "Space",
			attack: "KeyJ",
			special: "KeyK",
			shield: "KeyL"
		},
		singleSecondary: {
			left: "ArrowLeft",
			right: "ArrowRight",
			up: "ArrowUp",
			down: "ArrowDown",
			attack: "KeyZ",
			special: "KeyX",
			shield: "KeyC"
		},
		singleTapJump: true,
		localP1: {
			left: "KeyA",
			right: "KeyD",
			up: "KeyW",
			down: "KeyS",
			jump: "Space",
			attack: "KeyF",
			special: "KeyG",
			shield: "KeyH"
		},
		localP1TapJump: true,
		localP2: {
			left: "ArrowLeft",
			right: "ArrowRight",
			up: "ArrowUp",
			down: "ArrowDown",
			jump: "Slash",
			attack: "KeyJ",
			special: "KeyK",
			shield: "KeyL"
		},
		localP2TapJump: true
	};
}
function cloneHotkeySettings(src) {
	return {
		singlePrimary: { ...src.singlePrimary },
		singleSecondary: { ...src.singleSecondary },
		singleTapJump: src.singleTapJump,
		localP1: { ...src.localP1 },
		localP1TapJump: src.localP1TapJump,
		localP2: { ...src.localP2 },
		localP2TapJump: src.localP2TapJump
	};
}
function loadHotkeySettings() {
	const defaults = createDefaultHotkeys();
	if (typeof window === "undefined" || !window.localStorage) return defaults;
	try {
		const raw = window.localStorage.getItem(HOTKEY_STORAGE_KEY);
		if (!raw) return defaults;
		const parsed = JSON.parse(raw);
		const pickMap = (candidate, fallback) => {
			const obj = candidate && typeof candidate === "object" ? candidate : {};
			return {
				left: typeof obj.left === "string" && obj.left ? obj.left : fallback.left,
				right: typeof obj.right === "string" && obj.right ? obj.right : fallback.right,
				up: typeof obj.up === "string" && obj.up ? obj.up : fallback.up,
				down: typeof obj.down === "string" && obj.down ? obj.down : fallback.down,
				jump: typeof obj.jump === "string" && obj.jump ? obj.jump : fallback.jump,
				attack: typeof obj.attack === "string" && obj.attack ? obj.attack : fallback.attack,
				special: typeof obj.special === "string" && obj.special ? obj.special : fallback.special,
				shield: typeof obj.shield === "string" && obj.shield ? obj.shield : fallback.shield
			};
		};
		const pickSecondary = (candidate, fallback) => {
			if (!candidate || typeof candidate !== "object") return { ...fallback };
			const obj = candidate;
			const out = {};
			for (const act of ALL_ACTIONS) if (act in obj) {
				if (typeof obj[act] === "string" && obj[act]) out[act] = obj[act];
			} else if (fallback[act]) out[act] = fallback[act];
			return out;
		};
		return {
			singlePrimary: pickMap(parsed.singlePrimary, defaults.singlePrimary),
			singleSecondary: pickSecondary(parsed.singleSecondary, defaults.singleSecondary),
			singleTapJump: typeof parsed.singleTapJump === "boolean" ? parsed.singleTapJump : defaults.singleTapJump,
			localP1: pickMap(parsed.localP1, defaults.localP1),
			localP1TapJump: typeof parsed.localP1TapJump === "boolean" ? parsed.localP1TapJump : defaults.localP1TapJump,
			localP2: pickMap(parsed.localP2, defaults.localP2),
			localP2TapJump: typeof parsed.localP2TapJump === "boolean" ? parsed.localP2TapJump : defaults.localP2TapJump
		};
	} catch {
		return defaults;
	}
}
function saveHotkeySettings(settings) {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(HOTKEY_STORAGE_KEY, JSON.stringify(settings));
	} catch {}
}
function rebindHotkey(settings, target, newCode) {
	if (newCode === "Escape") return settings;
	const next = cloneHotkeySettings(settings);
	if (target.scope === "singleSecondary") {
		if (!newCode) {
			delete next.singleSecondary[target.action];
			return next;
		}
		if (next.singlePrimary[target.action] === newCode) return next;
		const prev = next.singleSecondary[target.action];
		for (const act of ALL_ACTIONS) {
			if (act !== target.action && next.singleSecondary[act] === newCode) {
				if (prev) next.singleSecondary[act] = prev;
				else delete next.singleSecondary[act];
			}
			if (next.singlePrimary[act] === newCode) {
				if (prev) next.singlePrimary[act] = prev;
				else {
					delete next.singleSecondary[target.action];
					return next;
				}
			}
		}
		next.singleSecondary[target.action] = newCode;
		return next;
	}
	if (!newCode) return next;
	if (target.scope === "singlePrimary") {
		const prev = next.singlePrimary[target.action];
		if (prev === newCode) return next;
		for (const act of ALL_ACTIONS) {
			if (act !== target.action && next.singlePrimary[act] === newCode) next.singlePrimary[act] = prev;
			if (next.singleSecondary[act] === newCode) next.singleSecondary[act] = prev;
		}
		next.singlePrimary[target.action] = newCode;
		return next;
	}
	const targetMap = target.scope === "localP1" ? next.localP1 : next.localP2;
	const otherMap = target.scope === "localP1" ? next.localP2 : next.localP1;
	const prev = targetMap[target.action];
	if (prev === newCode) return next;
	for (const act of ALL_ACTIONS) {
		if (act !== target.action && targetMap[act] === newCode) targetMap[act] = prev;
		if (otherMap[act] === newCode) otherMap[act] = prev;
	}
	targetMap[target.action] = newCode;
	return next;
}
function isHotkeyBound(settings, mode, code) {
	if (mode === "local") return ALL_ACTIONS.some((a) => settings.localP1[a] === code || settings.localP2[a] === code);
	return ALL_ACTIONS.some((a) => settings.singlePrimary[a] === code || settings.singleSecondary[a] === code);
}
function readInputFromBindings(keysHeld, keysJustPressed, primary, secondary, tapJump) {
	const codesFor = (action) => {
		const alt = secondary?.[action];
		return alt ? [primary[action], alt] : [primary[action]];
	};
	const held = (codes) => codes.some((c) => keysHeld.has(c));
	const just = (codes) => codes.some((c) => keysJustPressed.has(c));
	const jumpCodes = tapJump ? [...codesFor("jump"), ...codesFor("up")] : codesFor("jump");
	const shieldCodes = codesFor("shield");
	return {
		left: held(codesFor("left")),
		right: held(codesFor("right")),
		up: held(codesFor("up")),
		down: held(codesFor("down")),
		jumpJustPressed: just(jumpCodes),
		jumpHeld: held(jumpCodes),
		attackJustPressed: just(codesFor("attack")),
		specialJustPressed: just(codesFor("special")),
		shieldHeld: held(shieldCodes),
		dodgeJustPressed: just(shieldCodes)
	};
}
var KEY_CODE_LABELS = {
	Space: "Space",
	ArrowLeft: "←",
	ArrowRight: "→",
	ArrowUp: "↑",
	ArrowDown: "↓",
	ShiftLeft: "L-Shift",
	ShiftRight: "R-Shift",
	ControlLeft: "L-Ctrl",
	ControlRight: "R-Ctrl",
	AltLeft: "L-Alt",
	AltRight: "R-Alt",
	Enter: "Enter",
	NumpadEnter: "NumEnter",
	Tab: "Tab",
	Slash: "/",
	Period: ".",
	Comma: ",",
	Semicolon: ";",
	Quote: "'",
	BracketLeft: "[",
	BracketRight: "]",
	Backslash: "\\",
	Minus: "-",
	Equal: "=",
	Backquote: "`",
	Backspace: "Backspace"
};
function formatKeyCode(code) {
	if (!code) return "—";
	if (KEY_CODE_LABELS[code]) return KEY_CODE_LABELS[code];
	if (code.startsWith("Key") && code.length === 4) return code.slice(3);
	if (code.startsWith("Digit") && code.length === 6) return code.slice(5);
	if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
	return code;
}
function formatControlSummary(settings, mode) {
	if (mode === "local") {
		const p1 = settings.localP1;
		const p2 = settings.localP2;
		return `P1: ${formatKeyCode(p1.left)}/${formatKeyCode(p1.right)} ${formatKeyCode(p1.jump)} ${formatKeyCode(p1.attack)}/${formatKeyCode(p1.special)}/${formatKeyCode(p1.shield)} · P2: ${formatKeyCode(p2.left)}/${formatKeyCode(p2.right)} ${formatKeyCode(p2.jump)} ${formatKeyCode(p2.attack)}/${formatKeyCode(p2.special)}/${formatKeyCode(p2.shield)}`;
	}
	const s = settings.singlePrimary;
	return `Move ${formatKeyCode(s.left)}/${formatKeyCode(s.right)} · Jump ${formatKeyCode(s.jump)} · Attack ${formatKeyCode(s.attack)} · Special ${formatKeyCode(s.special)} · Shield ${formatKeyCode(s.shield)}`;
}
// src/game/netcode.ts
var ROOM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
var PEER_PREFIX = "skyline-brawl-";
function generateRoomCode(length = 6) {
	let out = "";
	for (let i = 0; i < length; i++) out += ROOM_ALPHABET[Math.floor(Math.random() * 32)];
	return out;
}
function normalizeRoomCode(raw) {
	return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}
function isValidRoomCode(code) {
	const norm = normalizeRoomCode(code);
	return norm.length >= 4 && norm.length <= 8;
}
function roomCodeToPeerId(code) {
	return `${PEER_PREFIX}${normalizeRoomCode(code)}`;
}
function buildRoomInviteUrl(currentHref, roomCode) {
	const url = new URL(currentHref);
	url.searchParams.delete("autostart");
	url.searchParams.set("room", normalizeRoomCode(roomCode));
	return url.toString();
}
function parseRoomFromSearch(search) {
	const raw = new URLSearchParams(search).get("room");
	if (!raw) return null;
	const norm = normalizeRoomCode(raw);
	return isValidRoomCode(norm) ? norm : null;
}
var NetInputTracker = class {
	constructor() {
		this.lastJumpSeq = 0;
		this.lastAttackSeq = 0;
		this.lastSpecialSeq = 0;
		this.lastDodgeSeq = 0;
		this.latestHeld = {
			left: false,
			right: false,
			up: false,
			down: false,
			jumpHeld: false,
			shieldHeld: false
		};
		this.pending = null;
	}
	reset() {
		this.lastJumpSeq = 0;
		this.lastAttackSeq = 0;
		this.lastSpecialSeq = 0;
		this.lastDodgeSeq = 0;
		this.latestHeld = {
			left: false,
			right: false,
			up: false,
			down: false,
			jumpHeld: false,
			shieldHeld: false
		};
		this.pending = null;
	}
	pushRemote(payload) {
		this.latestHeld = {
			left: payload.left,
			right: payload.right,
			up: payload.up,
			down: payload.down,
			jumpHeld: payload.jumpHeld,
			shieldHeld: payload.shieldHeld
		};
		this.pending = payload;
	}
	consumeFrameInput() {
		const p = this.pending;
		let jumpJustPressed = false;
		let attackJustPressed = false;
		let specialJustPressed = false;
		let dodgeJustPressed = false;
		if (p) {
			if (p.jumpSeq > this.lastJumpSeq) {
				this.lastJumpSeq = p.jumpSeq;
				jumpJustPressed = true;
			}
			if (p.attackSeq > this.lastAttackSeq) {
				this.lastAttackSeq = p.attackSeq;
				attackJustPressed = true;
			}
			if (p.specialSeq > this.lastSpecialSeq) {
				this.lastSpecialSeq = p.specialSeq;
				specialJustPressed = true;
			}
			if (p.dodgeSeq > this.lastDodgeSeq) {
				this.lastDodgeSeq = p.dodgeSeq;
				dodgeJustPressed = true;
			}
		}
		return {
			...this.latestHeld,
			jumpJustPressed,
			attackJustPressed,
			specialJustPressed,
			dodgeJustPressed
		};
	}
};
var r1 = (n) => Math.round(n * 10) / 10;
var r2 = (n) => Math.round(n * 100) / 100;
function serializeFighterState(f) {
	return {
		id: f.spec.id,
		x: r1(f.x),
		y: r1(f.y),
		vx: r1(f.vx),
		vy: r1(f.vy),
		facing: f.facing,
		grounded: f.grounded,
		damage: Math.round(f.damage),
		stocks: f.stocks,
		hitstunTimer: r2(f.hitstunTimer),
		hitFlashTimer: r2(f.hitFlashTimer),
		invulnTimer: r2(f.invulnTimer),
		respawnTimer: r2(f.respawnTimer),
		shieldHealth: Math.round(f.shieldHealth),
		shieldBrokenTimer: r2(f.shieldBrokenTimer),
		shielding: f.shielding,
		dodgeTimer: r2(f.dodgeTimer),
		squashX: r2(f.squashX),
		squashY: r2(f.squashY),
		walkPhase: r2(f.walkPhase),
		attackKind: f.attack ? f.attack.kind : null,
		attackElapsed: f.attack ? r2(f.attack.elapsed) : 0,
		ledgeGrab: f.ledgeGrab ? { ...f.ledgeGrab } : null
	};
}
function applyFighterState(target, snap) {
	if (target.spec.id !== snap.id) target.spec = FIGHTERS[snap.id];
	target.x = snap.x;
	target.y = snap.y;
	target.vx = snap.vx;
	target.vy = snap.vy;
	target.facing = snap.facing;
	target.grounded = snap.grounded;
	target.damage = snap.damage;
	target.stocks = snap.stocks;
	target.hitstunTimer = snap.hitstunTimer;
	target.hitFlashTimer = snap.hitFlashTimer;
	target.invulnTimer = snap.invulnTimer;
	target.respawnTimer = snap.respawnTimer;
	target.shieldHealth = snap.shieldHealth;
	target.shieldBrokenTimer = snap.shieldBrokenTimer;
	target.shielding = snap.shielding;
	target.dodgeTimer = snap.dodgeTimer;
	target.squashX = snap.squashX;
	target.squashY = snap.squashY;
	target.walkPhase = snap.walkPhase;
	target.ledgeGrab = snap.ledgeGrab ? { ...snap.ledgeGrab } : null;
	if (snap.attackKind) {
		const spec = target.spec.attacks[snap.attackKind];
		target.attack = {
			kind: snap.attackKind,
			elapsed: snap.attackElapsed,
			hasHit: false,
			spec
		};
	} else target.attack = null;
}
function serializeProjectiles(projectiles) {
	return projectiles.map((p) => ({
		id: p.id,
		ownerSlot: p.ownerSlot,
		visual: p.visual,
		x: r1(p.x),
		y: r1(p.y),
		vx: r1(p.vx),
		vy: r1(p.vy),
		radius: p.radius,
		color: p.color
	}));
}
function deserializeProjectiles(items) {
	return items.map((p) => ({
		id: p.id,
		ownerSlot: p.ownerSlot,
		visual: p.visual,
		x: p.x,
		y: p.y,
		vx: p.vx,
		vy: p.vy,
		gravity: 0,
		radius: p.radius,
		damage: 0,
		baseKnockback: 0,
		knockbackGrowth: 0,
		angleDeg: 0,
		color: p.color,
		life: 0,
		maxLife: 1.6
	}));
}
// src/game/stages.ts
var STAGES = {
	sky_temple: {
		id: "sky_temple",
		name: "Sky Temple",
		subtitle: "Shifting perches, shrinking altar & solar vents",
		platforms: [
			{
				id: "main_deck",
				x: -360,
				y: 120,
				width: 720,
				height: 46,
				passThrough: false
			},
			{
				id: "left_perch",
				x: -290,
				y: 12,
				width: 170,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "move",
					ampX: -48,
					ampY: 24,
					period: 7.2
				}
			},
			{
				id: "right_perch",
				x: 120,
				y: 12,
				width: 170,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "move",
					ampX: 48,
					ampY: -24,
					period: 7.2
				}
			},
			{
				id: "top_altar",
				x: -95,
				y: -96,
				width: 190,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "shrink",
					period: 10,
					solidDuration: 4.5,
					warnDuration: 1.6,
					goneDuration: 2.6,
					minWidth: 42
				}
			}
		],
		hazard: {
			kind: "solar_pillar",
			period: 9.5,
			initialDelay: 4.5,
			telegraphDuration: 1.1,
			activeDuration: .5,
			width: 96,
			yTop: -220,
			yBottom: 120,
			xSpots: [
				0,
				-195,
				195
			],
			damage: 9,
			baseKnockback: 220,
			knockbackGrowth: 2.8,
			angleDeg: 85
		},
		spawns: [{
			x: -175,
			y: 120,
			facing: 1
		}, {
			x: 175,
			y: 120,
			facing: -1
		}],
		blastZones: {
			left: -760,
			right: 760,
			top: -470,
			bottom: 510
		},
		skyTop: "#0B1224",
		skyMid: "#1C2B4B",
		skyBottom: "#6D4534",
		stoneMain: "#334155",
		stoneTrim: "#E2E8F0"
	},
	twin_pillars: {
		id: "twin_pillars",
		name: "Twin Spires",
		subtitle: "Phasing skybridge, moving crests & storm updraft",
		platforms: [
			{
				id: "west_deck",
				x: -410,
				y: 128,
				width: 280,
				height: 44,
				passThrough: false
			},
			{
				id: "east_deck",
				x: 130,
				y: 128,
				width: 280,
				height: 44,
				passThrough: false
			},
			{
				id: "center_bridge",
				x: -105,
				y: 52,
				width: 210,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "shrink",
					period: 9.2,
					solidDuration: 4.2,
					warnDuration: 1.6,
					goneDuration: 2.2,
					minWidth: 44
				}
			},
			{
				id: "west_crest",
				x: -340,
				y: -48,
				width: 150,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "move",
					ampX: 0,
					ampY: 54,
					period: 6.4
				}
			},
			{
				id: "east_crest",
				x: 190,
				y: -48,
				width: 150,
				height: 16,
				passThrough: true,
				behavior: {
					kind: "move",
					ampX: 0,
					ampY: -54,
					period: 6.4
				}
			}
		],
		hazard: {
			kind: "storm_updraft",
			period: 9,
			initialDelay: 4,
			telegraphDuration: .9,
			activeDuration: 2.4,
			width: 170,
			yTop: -170,
			yBottom: 230,
			xSpots: [0],
			damage: 0,
			baseKnockback: 0,
			knockbackGrowth: 0,
			angleDeg: 90,
			liftAccel: 2050
		},
		spawns: [{
			x: -270,
			y: 128,
			facing: 1
		}, {
			x: 270,
			y: 128,
			facing: -1
		}],
		blastZones: {
			left: -780,
			right: 780,
			top: -470,
			bottom: 510
		},
		skyTop: "#0A1628",
		skyMid: "#16354D",
		skyBottom: "#5B4D3B",
		stoneMain: "#3B4254",
		stoneTrim: "#CBD5E1"
	}
};
var STAGE_LIST = [STAGES.sky_temple, STAGES.twin_pillars];
// src/components/TitleScreen.tsx
function getStatusText(online) {
	switch (online.status) {
		case "creating": return "Opening room...";
		case "waiting": return "Waiting for opponent to join...";
		case "connecting": return `Joining room ${online.roomCode}...`;
		case "connected": return online.pingMs !== null ? `Connected · ${online.pingMs} ms` : "Connected";
		case "disconnected": return online.error || "Opponent disconnected.";
		case "error": return online.error || "Connection error.";
		default: return "Ready to connect.";
	}
}
function TitleScreen({ config, hotkeys, menuView, onlineTab, joinCode, onlineState, onChangeMenuView, onChangeOnlineTab, onChangeJoinCode, onChangeConfig, onChangeHotkeys, onStartMatch, onHostOnline, onJoinOnline, onLeaveOnline, onGuestChoice, onStartOnlineMatch }) {
	const [copiedType, setCopiedType] = (0, import_react.useState)(null);
	const [setupTab, setSetupTab] = (0, import_react.useState)("match");
	const [hotkeyScopeTab, setHotkeyScopeTab] = (0, import_react.useState)(() => config.mode === "local" ? "local" : "single");
	const [listeningTarget, setListeningTarget] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (menuView !== "setup" || setupTab !== "hotkeys") setListeningTarget(null);
	}, [menuView, setupTab]);
	(0, import_react.useEffect)(() => {
		if (!listeningTarget) return;
		const onCaptureKey = (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.repeat) return;
			if (e.code === "Escape") {
				setListeningTarget(null);
				return;
			}
			if (/^F\d+$/.test(e.code)) return;
			if (listeningTarget.scope === "singleSecondary" && (e.code === "Backspace" || e.code === "Delete")) {
				onChangeHotkeys(rebindHotkey(hotkeys, listeningTarget, null));
				setListeningTarget(null);
				return;
			}
			onChangeHotkeys(rebindHotkey(hotkeys, listeningTarget, e.code));
			setListeningTarget(null);
		};
		window.addEventListener("keydown", onCaptureKey, { capture: true });
		return () => window.removeEventListener("keydown", onCaptureKey, { capture: true });
	}, [
		listeningTarget,
		hotkeys,
		onChangeHotkeys
	]);
	(0, import_react.useEffect)(() => {
		if (menuView !== "main") return;
		const onKeyDown = (e) => {
			if (e.repeat) return;
			const tag = e.target?.tagName;
			if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT") {
				if (e.code === "Enter") return;
			}
			if (e.code === "Enter" || e.code === "Space") {
				e.preventDefault();
				onStartMatch();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [menuView, onStartMatch]);
	const update = (patch) => {
		onChangeConfig({
			...config,
			...patch
		});
	};
	const quickPlay = (mode) => {
		const next = {
			...config,
			mode,
			onlineRole: void 0
		};
		onChangeConfig(next);
		onStartMatch(next);
	};
	const openOnlineMenu = () => {
		onChangeMenuView("online");
		onChangeOnlineTab("host");
		if (onlineState.status === "idle" || onlineState.status === "error" || onlineState.status === "disconnected") onHostOnline();
	};
	const copyText = async (value, kind) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopiedType(kind);
			window.setTimeout(() => setCopiedType((cur) => cur === kind ? null : cur), 1600);
		} catch {}
	};
	const setStage = (stage) => update({ stage });
	const setStocks = (stocks) => update({ stocks });
	const setDifficulty = (difficulty) => update({ difficulty });
	const setP1 = (p1Fighter) => update({ p1Fighter });
	const setP2 = (p2Fighter) => update({ p2Fighter });
	const isConnected = onlineState.status === "connected";
	const activeSummaryMode = menuView === "online" ? "online" : config.mode;
	const isListening = (target) => listeningTarget !== null && listeningTarget.scope === target.scope && listeningTarget.action === target.action;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-10 flex flex-col justify-between p-6 sm:p-8 pointer-events-none",
		children: [
			menuView === "main" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center text-center gap-4 pt-2 sm:pt-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
					viewBox: "0 0 460 112",
					className: "w-[300px] sm:w-[400px] h-auto drop-shadow-[0_6px_18px_rgba(0,0,0,0.65)]",
					role: "img",
					"aria-label": "Skyline Brawl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M18 56 L42 18 L56 18 L38 56 L58 94 L44 94 Z",
							fill: "#EF4444",
							stroke: "#0B1120",
							strokeWidth: "4",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
							d: "M46 56 L70 18 L84 18 L66 56 L86 94 L72 94 Z",
							fill: "#F59E0B",
							stroke: "#0B1120",
							strokeWidth: "4",
							strokeLinejoin: "round"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							x: "100",
							y: "60",
							fill: "#F8FAFC",
							stroke: "#0B1120",
							strokeWidth: "8",
							paintOrder: "stroke fill",
							fontFamily: "'Barlow Condensed', sans-serif",
							fontWeight: "800",
							fontStyle: "italic",
							fontSize: "56",
							letterSpacing: "2",
							children: "SKYLINE"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", {
							x: "102",
							y: "102",
							fill: "#FBBF24",
							stroke: "#0B1120",
							strokeWidth: "7",
							paintOrder: "stroke fill",
							fontFamily: "'Barlow Condensed', sans-serif",
							fontWeight: "800",
							fontStyle: "italic",
							fontSize: "44",
							letterSpacing: "4",
							children: "BRAWL"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
					"aria-label": "Main menu",
					className: "pointer-events-auto flex flex-col w-full max-w-[260px] gap-2.5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							"data-start": "true",
							onClick: (e) => {
								e.currentTarget.blur();
								quickPlay("cpu");
							},
							className: "w-full py-3 px-6 rounded-lg bg-amber-500 hover:bg-amber-400 active:translate-y-0.5 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_5px_0_#92400E] transition-colors cursor-pointer whitespace-nowrap",
							children: "Play vs CPU"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: (e) => {
								e.currentTarget.blur();
								quickPlay("local");
							},
							className: "w-full py-2.5 px-6 rounded-lg bg-slate-900/92 hover:bg-slate-800 text-slate-100 font-display text-xl font-bold uppercase tracking-wide border border-slate-700 transition-colors cursor-pointer whitespace-nowrap",
							children: "2P Local"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: (e) => {
								e.currentTarget.blur();
								openOnlineMenu();
							},
							className: "w-full py-2.5 px-6 rounded-lg bg-blue-600/95 hover:bg-blue-500 text-white font-display text-xl font-bold uppercase tracking-wide border border-blue-400/60 transition-colors cursor-pointer whitespace-nowrap",
							children: "Play Online"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => onChangeMenuView("setup"),
							className: "w-full py-2.5 px-6 rounded-lg bg-slate-950/90 hover:bg-slate-900 text-slate-300 hover:text-white font-semibold text-sm border border-slate-800 transition-colors cursor-pointer whitespace-nowrap",
							children: "Match Setup"
						})
					]
				})]
			}),
			menuView === "setup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				"aria-label": "Match setup",
				className: "pointer-events-auto mx-auto my-auto w-full max-w-[470px] max-h-[calc(100vh-88px)] overflow-y-auto rounded-xl bg-slate-950/94 border border-slate-700/85 p-5 shadow-2xl flex flex-col gap-3.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-2xl font-extrabold uppercase tracking-wide text-white",
						children: "Match Setup"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSetupTab("match"),
								className: `px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${setupTab === "match" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`,
								children: "Match"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setHotkeyScopeTab(config.mode === "local" ? "local" : "single");
									setSetupTab("hotkeys");
								},
								className: `px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${setupTab === "hotkeys" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`,
								children: "Hotkeys"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								setListeningTarget(null);
								onChangeMenuView("main");
							},
							className: "px-3 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer",
							children: "Back"
						})]
					})]
				}), setupTab === "match" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => update({
									mode: "cpu",
									onlineRole: void 0
								}),
								className: `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${config.mode === "cpu" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`,
								children: "1P vs CPU"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => update({
									mode: "local",
									onlineRole: void 0
								}),
								className: `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${config.mode === "local" ? "bg-amber-500 text-slate-950" : "text-slate-300 hover:text-white"}`,
								children: "2P Local"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-medium text-slate-400",
								children: "Stocks"
							}), [
								2,
								3,
								5
							].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								"aria-label": `${n} stocks`,
								onClick: () => setStocks(n),
								className: `w-8 h-8 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${config.stocks === n ? "bg-slate-100 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"}`,
								children: n
							}, n))]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold text-red-400 mb-1.5",
							children: "Player 1"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-col gap-1.5",
							children: FIGHTER_LIST.map((f) => {
								const selected = config.p1Fighter === f.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-label": `Player 1 select ${f.name}`,
									onClick: () => setP1(f.id),
									className: `flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${selected ? "bg-slate-800 border-red-500 text-white" : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
										id: f.id,
										className: "w-7 h-7 shrink-0"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-bold",
										children: f.name
									})]
								}, `p1-${f.id}`);
							})
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold text-blue-400 mb-1.5",
							children: config.mode === "cpu" ? "CPU Rival" : "Player 2"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex flex-col gap-1.5",
							children: FIGHTER_LIST.map((f) => {
								const selected = config.p2Fighter === f.id;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-label": `${config.mode === "cpu" ? "CPU" : "Player 2"} select ${f.name}`,
									onClick: () => setP2(f.id),
									className: `flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${selected ? "bg-slate-800 border-blue-500 text-white" : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
										id: f.id,
										className: "w-7 h-7 shrink-0"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-bold",
										children: f.name
									})]
								}, `p2-${f.id}`);
							})
						})] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1.5",
							children: STAGE_LIST.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setStage(st.id),
								className: `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${config.stage === st.id ? "bg-slate-100 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"}`,
								children: st.name
							}, st.id))
						}), config.mode === "cpu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex items-center gap-1",
							children: [
								["chill", "Chill"],
								["standard", "Standard"],
								["fierce", "Fierce"]
							].map(([diff, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setDifficulty(diff),
								className: `px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${config.difficulty === diff ? "bg-blue-500 text-white" : "bg-slate-900 text-slate-400 hover:text-slate-200"}`,
								children: label
							}, diff))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						"data-start": "true",
						onClick: (e) => {
							e.currentTarget.blur();
							onStartMatch();
						},
						className: "w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_4px_0_#92400E] transition-colors cursor-pointer",
						children: "Start Match"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-2.5",
					"aria-label": "Hotkey bindings",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setListeningTarget(null);
										setHotkeyScopeTab("single");
									},
									className: `px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${hotkeyScopeTab === "single" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"}`,
									children: "1P / Online"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setListeningTarget(null);
										setHotkeyScopeTab("local");
									},
									className: `px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${hotkeyScopeTab === "local" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"}`,
									children: "2P Local"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setListeningTarget(null);
									onChangeHotkeys(createDefaultHotkeys());
								},
								className: "px-2.5 py-1.5 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer",
								children: "Reset Defaults"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							"data-testid": "hotkey-status-hint",
							className: `text-xs ${listeningTarget ? "text-amber-300 font-semibold" : "text-slate-400"}`,
							children: listeningTarget ? listeningTarget.scope === "singleSecondary" ? "Press any key to bind (Esc cancels, Backspace clears)..." : "Press any key to bind (Esc cancels)..." : "Click a key button to rebind. Duplicate keys swap automatically."
						}),
						hotkeyScopeTab === "single" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-[1fr_92px_92px] gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Action" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-center",
										children: "Primary"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-center",
										children: "Alt"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-1",
								children: HOTKEY_ACTION_LABELS.map(({ action, label }) => {
									const primTarget = {
										scope: "singlePrimary",
										action
									};
									const altTarget = {
										scope: "singleSecondary",
										action
									};
									const primActive = isListening(primTarget);
									const altActive = isListening(altTarget);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-[1fr_92px_92px] items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/75 border border-slate-800/80",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-semibold text-slate-200",
												children: label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												"aria-label": `${label} primary hotkey`,
												onClick: () => setListeningTarget(primActive ? null : primTarget),
												className: `py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${primActive ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700"}`,
												children: primActive ? "Press key..." : formatKeyCode(hotkeys.singlePrimary[action])
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												"aria-label": `${label} alternate hotkey`,
												onClick: () => setListeningTarget(altActive ? null : altTarget),
												className: `py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${altActive ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800"}`,
												children: altActive ? "Press key..." : formatKeyCode(hotkeys.singleSecondary[action])
											})
										]
									}, `hk-single-${action}`);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between pt-1.5 border-t border-slate-800",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-300",
									children: "Tap Up to Jump"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									"aria-pressed": hotkeys.singleTapJump,
									onClick: () => onChangeHotkeys({
										...hotkeys,
										singleTapJump: !hotkeys.singleTapJump
									}),
									className: `px-3 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${hotkeys.singleTapJump ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300 border border-slate-700"}`,
									children: hotkeys.singleTapJump ? "ON" : "OFF"
								})]
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-[1fr_92px_92px] gap-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Action" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-center text-red-400",
										children: "Player 1"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-center text-blue-400",
										children: "Player 2"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-1",
								children: HOTKEY_ACTION_LABELS.map(({ action, label }) => {
									const p1Target = {
										scope: "localP1",
										action
									};
									const p2Target = {
										scope: "localP2",
										action
									};
									const p1Active = isListening(p1Target);
									const p2Active = isListening(p2Target);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-[1fr_92px_92px] items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/75 border border-slate-800/80",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-semibold text-slate-200",
												children: label
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												"aria-label": `P1 ${label} hotkey`,
												onClick: () => setListeningTarget(p1Active ? null : p1Target),
												className: `py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${p1Active ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-red-500/40"}`,
												children: p1Active ? "Press key..." : formatKeyCode(hotkeys.localP1[action])
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												"aria-label": `P2 ${label} hotkey`,
												onClick: () => setListeningTarget(p2Active ? null : p2Target),
												className: `py-1 px-2 rounded text-xs font-mono-tabular font-bold border transition-colors cursor-pointer ${p2Active ? "bg-amber-500 text-slate-950 border-amber-300" : "bg-slate-800 hover:bg-slate-700 text-slate-100 border-blue-500/40"}`,
												children: p2Active ? "Press key..." : formatKeyCode(hotkeys.localP2[action])
											})
										]
									}, `hk-local-${action}`);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-2 pt-1.5 border-t border-slate-800",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": hotkeys.localP1TapJump,
									onClick: () => onChangeHotkeys({
										...hotkeys,
										localP1TapJump: !hotkeys.localP1TapJump
									}),
									className: `flex-1 py-1 px-2 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${hotkeys.localP1TapJump ? "bg-slate-800 border-red-500/50 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`,
									children: ["P1 Tap Up Jump: ", hotkeys.localP1TapJump ? "ON" : "OFF"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": hotkeys.localP2TapJump,
									onClick: () => onChangeHotkeys({
										...hotkeys,
										localP2TapJump: !hotkeys.localP2TapJump
									}),
									className: `flex-1 py-1 px-2 rounded-md text-xs font-semibold border transition-colors cursor-pointer ${hotkeys.localP2TapJump ? "bg-slate-800 border-blue-500/50 text-white" : "bg-slate-900 border-slate-800 text-slate-400"}`,
									children: ["P2 Tap Up Jump: ", hotkeys.localP2TapJump ? "ON" : "OFF"]
								})]
							})
						] })
					]
				})]
			}),
			menuView === "online" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				"aria-label": "Online 1v1 Lobby",
				className: "pointer-events-auto mx-auto my-auto w-full max-w-[460px] rounded-xl bg-slate-950/95 border border-slate-700/85 p-5 shadow-2xl flex flex-col gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-display text-2xl font-extrabold uppercase tracking-wide text-white leading-none",
							children: "Online 1v1"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							"data-testid": "online-status-text",
							className: `text-xs font-medium mt-1 ${onlineState.status === "connected" ? "text-emerald-400" : onlineState.status === "error" || onlineState.status === "disconnected" ? "text-rose-400" : "text-slate-400"}`,
							children: getStatusText(onlineState)
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								onLeaveOnline();
								onChangeMenuView("main");
							},
							className: "px-3 py-1 rounded-md text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer",
							children: "Back"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-slate-900 border border-slate-800",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								onChangeOnlineTab("host");
								if (onlineState.role !== "host" || onlineState.status === "idle" || onlineState.status === "error" || onlineState.status === "disconnected") onHostOnline();
							},
							className: `py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer ${onlineTab === "host" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"}`,
							children: "Create Room"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => {
								onChangeOnlineTab("join");
								if (onlineState.role === "host") onLeaveOnline();
							},
							className: `py-1.5 rounded-md text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer ${onlineTab === "join" ? "bg-blue-600 text-white" : "text-slate-300 hover:text-white"}`,
							children: "Join Room"
						})]
					}),
					onlineTab === "host" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-[11px] uppercase tracking-wider text-slate-400 font-semibold",
								children: "Room Code"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								"data-testid": "host-room-code",
								className: "font-mono-tabular text-2xl font-extrabold tracking-widest text-amber-400 leading-tight",
								children: onlineState.roomCode || "......"
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !onlineState.roomCode,
									onClick: () => copyText(onlineState.roomCode, "code"),
									className: "px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors cursor-pointer",
									children: copiedType === "code" ? "Copied!" : "Copy Code"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									disabled: !onlineState.roomCode,
									onClick: () => copyText(buildRoomInviteUrl(window.location.href, onlineState.roomCode), "link"),
									className: "px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer",
									children: copiedType === "link" ? "Link Copied!" : "Copy Invite Link"
								})]
							})]
						}),
						(onlineState.status === "error" || onlineState.status === "disconnected") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: onHostOnline,
							className: "w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors cursor-pointer",
							children: "Open New Room"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-red-400 mb-1.5",
								children: "Your Fighter (P1)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-1.5",
								children: FIGHTER_LIST.map((f) => {
									const selected = config.p1Fighter === f.id;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setP1(f.id),
										className: `flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${selected ? "bg-slate-800 border-red-500 text-white" : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
											id: f.id,
											className: "w-7 h-7 shrink-0"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold",
											children: f.name
										})]
									}, `host-p1-${f.id}`);
								})
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-blue-400 mb-1.5",
								children: "Opponent (P2)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-[136px] rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-col items-center justify-center text-center gap-2",
								children: isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
										id: config.p2Fighter,
										className: "w-11 h-11"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-bold text-white",
										children: FIGHTERS[config.p2Fighter].name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `text-[11px] font-bold uppercase tracking-wider ${onlineState.guestReady ? "text-emerald-400" : "text-amber-300"}`,
										children: onlineState.guestReady ? "Ready" : "Picking Fighter"
									})
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-slate-400 leading-relaxed",
									children: "Share the code or invite link with a friend to connect."
								})
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-1.5",
								children: STAGE_LIST.map((st) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setStage(st.id),
									className: `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${config.stage === st.id ? "bg-slate-100 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"}`,
									children: st.name
								}, `host-st-${st.id}`))
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-slate-400",
									children: "Stocks"
								}), [
									2,
									3,
									5
								].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setStocks(n),
									className: `w-7 h-7 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${config.stocks === n ? "bg-slate-100 text-slate-950" : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800"}`,
									children: n
								}, `host-stk-${n}`))]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !isConnected,
							onClick: onStartOnlineMatch,
							className: "w-full py-3 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-display text-2xl font-extrabold uppercase tracking-wide shadow-[0_4px_0_#92400E] disabled:shadow-none transition-colors cursor-pointer disabled:cursor-not-allowed",
							children: isConnected ? "Start Online Match" : "Waiting for Opponent..."
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: (e) => {
								e.preventDefault();
								if (isValidRoomCode(joinCode)) onJoinOnline(joinCode);
							},
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								"aria-label": "Room code",
								placeholder: "Enter room code",
								value: joinCode,
								maxLength: 8,
								onChange: (e) => onChangeJoinCode(normalizeRoomCode(e.target.value)),
								className: "flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 focus:border-blue-500 outline-none font-mono-tabular text-lg font-bold tracking-widest text-white uppercase placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: !isValidRoomCode(joinCode) || onlineState.status === "connecting",
								className: "px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-display text-lg font-bold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed",
								children: onlineState.status === "connecting" ? "Joining..." : "Connect"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-red-400 mb-1.5",
								children: "Host (P1)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-[136px] rounded-lg bg-slate-900/90 border border-slate-800 p-3 flex flex-col items-center justify-center text-center gap-2",
								children: isConnected ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
										id: config.p1Fighter,
										className: "w-11 h-11"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-sm font-bold text-white",
										children: FIGHTERS[config.p1Fighter].name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-[11px] text-slate-400",
										children: [
											STAGES[config.stage].name,
											" · ",
											config.stocks,
											" Stocks"
										]
									})
								] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs text-slate-400 leading-relaxed",
									children: "Enter the host's room code to join their lobby."
								})
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs font-semibold text-blue-400 mb-1.5",
								children: "Your Fighter (P2)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-col gap-1.5",
								children: FIGHTER_LIST.map((f) => {
									const selected = config.p2Fighter === f.id;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											setP2(f.id);
											onGuestChoice(f.id, onlineState.guestReady);
										},
										className: `flex items-center gap-2.5 p-2 rounded-lg border text-left transition-colors cursor-pointer ${selected ? "bg-slate-800 border-blue-500 text-white" : "bg-slate-900/90 border-slate-800 text-slate-300 hover:border-slate-600"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FighterEmblem, {
											id: f.id,
											className: "w-7 h-7 shrink-0"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold",
											children: f.name
										})]
									}, `guest-p2-${f.id}`);
								})
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							disabled: !isConnected,
							onClick: () => onGuestChoice(config.p2Fighter, !onlineState.guestReady),
							className: `w-full py-3 rounded-lg font-display text-2xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed ${!isConnected ? "bg-slate-800 text-slate-500" : onlineState.guestReady ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "bg-amber-500 hover:bg-amber-400 text-slate-950"}`,
							children: !isConnected ? "Connect to Ready Up" : onlineState.guestReady ? "Ready! Waiting for Host..." : "Ready Up"
						})
					] })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "w-full text-center text-xs sm:text-sm text-slate-300/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatControlSummary(hotkeys, activeSummaryMode) })
			})
		]
	});
}
// src/game/audio.ts
var SoundSynth = class {
	constructor() {
		this.ctx = null;
		this.muted = false;
	}
	setMuted(muted) {
		this.muted = muted;
	}
	isMuted() {
		return this.muted;
	}
	unlock() {
		if (typeof window === "undefined") return;
		if (!this.ctx) {
			const AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) this.ctx = new AudioCtx();
		}
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
	}
	ready() {
		if (this.muted) return null;
		if (!this.ctx) this.unlock();
		if (!this.ctx || this.ctx.state !== "running") return null;
		return this.ctx;
	}
	pitchVar(base, pct = .08) {
		return base * (1 + (Math.random() * 2 - 1) * pct);
	}
	playJump(isDouble = false) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = isDouble ? "triangle" : "sine";
		const startFreq = this.pitchVar(isDouble ? 320 : 210);
		const endFreq = startFreq * 1.9;
		osc.frequency.setValueAtTime(startFreq, now);
		osc.frequency.exponentialRampToValueAtTime(endFreq, now + .11);
		gain.gain.setValueAtTime(.12, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .12);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .13);
	}
	playLand() {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(this.pitchVar(120), now);
		osc.frequency.exponentialRampToValueAtTime(48, now + .07);
		gain.gain.setValueAtTime(.08, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .07);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .08);
	}
	playSwing(isHeavy = false) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(this.pitchVar(isHeavy ? 260 : 380), now);
		osc.frequency.exponentialRampToValueAtTime(isHeavy ? 95 : 150, now + .11);
		gain.gain.setValueAtTime(.09, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .11);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .12);
	}
	playHit(heavy, targetDamage) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = heavy ? "sawtooth" : "square";
		const base = heavy ? 160 : 220;
		osc.frequency.setValueAtTime(this.pitchVar(base + Math.min(90, targetDamage * .4)), now);
		osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? .19 : .1));
		gain.gain.setValueAtTime(heavy ? .22 : .13, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + (heavy ? .2 : .11));
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + (heavy ? .21 : .12));
		if (heavy) {
			const snap = ctx.createOscillator();
			const snapGain = ctx.createGain();
			snap.type = "triangle";
			snap.frequency.setValueAtTime(this.pitchVar(760), now);
			snap.frequency.exponentialRampToValueAtTime(190, now + .08);
			snapGain.gain.setValueAtTime(.16, now);
			snapGain.gain.exponentialRampToValueAtTime(.001, now + .09);
			snap.connect(snapGain);
			snapGain.connect(ctx.destination);
			snap.start(now);
			snap.stop(now + .09);
		}
	}
	playShieldBlock(broken = false) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(broken ? 680 : this.pitchVar(520), now);
		osc.frequency.exponentialRampToValueAtTime(broken ? 110 : 780, now + (broken ? .3 : .09));
		gain.gain.setValueAtTime(broken ? .2 : .12, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + (broken ? .32 : .1));
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + (broken ? .33 : .11));
	}
	playBlastKo() {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sawtooth";
		osc.frequency.setValueAtTime(140, now);
		osc.frequency.exponentialRampToValueAtTime(28, now + .45);
		gain.gain.setValueAtTime(.28, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .48);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .5);
		const chime = ctx.createOscillator();
		const cGain = ctx.createGain();
		chime.type = "triangle";
		chime.frequency.setValueAtTime(520, now);
		chime.frequency.exponentialRampToValueAtTime(180, now + .35);
		cGain.gain.setValueAtTime(.14, now);
		cGain.gain.exponentialRampToValueAtTime(.001, now + .36);
		chime.connect(cGain);
		cGain.connect(ctx.destination);
		chime.start(now);
		chime.stop(now + .37);
	}
	playCountdown(isGo) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
		gain.gain.setValueAtTime(isGo ? .16 : .1, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + (isGo ? .28 : .14));
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + (isGo ? .3 : .15));
	}
	playVictory() {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		[
			523.25,
			659.25,
			783.99,
			1046.5
		].forEach((freq, i) => {
			const t = now + i * .09;
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(freq, t);
			gain.gain.setValueAtTime(.14, t);
			gain.gain.exponentialRampToValueAtTime(.001, t + .32);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(t);
			osc.stop(t + .34);
		});
	}
	playHazardTelegraph() {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "sine";
		osc.frequency.setValueAtTime(300, now);
		osc.frequency.exponentialRampToValueAtTime(620, now + .35);
		gain.gain.setValueAtTime(.06, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .38);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .4);
	}
	playHazardErupt(isWind) {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = isWind ? "triangle" : "sawtooth";
		osc.frequency.setValueAtTime(isWind ? 260 : 185, now);
		osc.frequency.exponentialRampToValueAtTime(isWind ? 520 : 58, now + .28);
		gain.gain.setValueAtTime(isWind ? .08 : .14, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .3);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .32);
	}
	playLedgeGrab() {
		const ctx = this.ready();
		if (!ctx) return;
		const now = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(this.pitchVar(460), now);
		osc.frequency.exponentialRampToValueAtTime(680, now + .06);
		gain.gain.setValueAtTime(.11, now);
		gain.gain.exponentialRampToValueAtTime(.001, now + .08);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + .09);
	}
};
// src/game/ai.ts
function createCpuBrain() {
	return {
		decisionTimer: .35,
		attackCooldown: .9,
		shieldTimer: 0,
		desiredDir: 0
	};
}
function isPlatActive(p) {
	return !("active" in p) || p.active;
}
function findNearestSolidPlatform(x, platforms) {
	const solids = platforms.filter((p) => !p.passThrough && isPlatActive(p));
	let best = solids[0] ?? platforms[0];
	let bestDist = 1e400;
	for (const p of solids) {
		const cx = p.x + p.width * .5;
		const dist = Math.abs(x - cx);
		if (dist < bestDist) {
			bestDist = dist;
			best = p;
		}
	}
	return best;
}
function isOverStagePlatform(x, stageOrPlatforms) {
	return (Array.isArray(stageOrPlatforms) ? stageOrPlatforms : stageOrPlatforms.platforms).some((p) => !p.passThrough && isPlatActive(p) && x >= p.x + 16 && x <= p.x + p.width - 16);
}
function computeCpuInput(cpu, opponent, stage, difficulty, brain, dt, platformsOverride, activeHazard) {
	const input = {
		left: false,
		right: false,
		up: false,
		down: false,
		jumpJustPressed: false,
		jumpHeld: false,
		attackJustPressed: false,
		specialJustPressed: false,
		shieldHeld: false,
		dodgeJustPressed: false
	};
	if (cpu.respawnTimer > 0 || cpu.hitstunTimer > 0) return input;
	if (cpu.ledgeGrab) {
		if (cpu.ledgeGrab.timer >= .2) {
			if (Math.abs(opponent.x - cpu.x) < 110 && Math.abs(opponent.y - cpu.ledgeGrab.ledgeY) < 60 && Math.random() < .45) input.attackJustPressed = true;
			else if (opponent.y < cpu.ledgeGrab.ledgeY - 40 || Math.random() < .35) {
				input.jumpJustPressed = true;
				input.jumpHeld = true;
			} else if (cpu.ledgeGrab.side === -1) input.right = true;
			else input.left = true;
		}
		return input;
	}
	brain.decisionTimer = Math.max(0, brain.decisionTimer - dt);
	brain.attackCooldown = Math.max(0, brain.attackCooldown - dt);
	brain.shieldTimer = Math.max(0, brain.shieldTimer - dt);
	const reactionCadence = difficulty === "fierce" ? .08 : difficulty === "standard" ? .16 : .28;
	const attackCadence = difficulty === "fierce" ? .28 : difficulty === "standard" ? .48 : .8;
	const platforms = platformsOverride ?? stage.platforms;
	const nearestSolid = findNearestSolidPlatform(cpu.x, platforms);
	const leftLedgeX = nearestSolid.x;
	const rightLedgeX = nearestSolid.x + nearestSolid.width;
	const targetLedgeX = Math.abs(cpu.x - leftLedgeX) <= Math.abs(cpu.x - rightLedgeX) ? leftLedgeX : rightLedgeX;
	if (!isOverStagePlatform(cpu.x, platforms)) {
		const horizDistToLedge = Math.abs(targetLedgeX - cpu.x);
		if (cpu.x < targetLedgeX) input.right = true;
		else input.left = true;
		const belowDeck = cpu.y > nearestSolid.y + 18;
		if (horizDistToLedge > 165 && cpu.y <= nearestSolid.y + 55 && cpu.y >= nearestSolid.y - 90 && !cpu.attack && cpu.jumpsRemaining <= 1) {
			input.specialJustPressed = true;
			return input;
		}
		if (belowDeck) {
			if (cpu.jumpsRemaining > 0 && cpu.vy > -60) {
				input.jumpJustPressed = true;
				input.jumpHeld = true;
			} else if (!cpu.upSpecialUsed && cpu.vy > 80) {
				input.up = true;
				input.specialJustPressed = true;
			}
		} else if (cpu.y > nearestSolid.y - 40 && cpu.vy > 180 && cpu.jumpsRemaining > 0) {
			input.jumpJustPressed = true;
			input.jumpHeld = true;
		}
		return input;
	}
	if (brain.shieldTimer > 0) {
		input.shieldHeld = true;
		return input;
	}
	const dx = opponent.x - cpu.x;
	const dy = opponent.y - cpu.y;
	const dist = Math.hypot(dx, dy);
	if (cpu.grounded && opponent.attack && dist < 115 && brain.decisionTimer <= 0 && difficulty !== "chill") {
		if (Math.random() < (difficulty === "fierce" ? .45 : .25)) {
			brain.shieldTimer = .28;
			brain.decisionTimer = reactionCadence;
			input.shieldHeld = true;
			return input;
		}
	}
	if (brain.decisionTimer <= 0) {
		brain.decisionTimer = reactionCadence;
		if (Math.abs(dx) > 58) brain.desiredDir = dx > 0 ? 1 : -1;
		else brain.desiredDir = 0;
	}
	if (activeHazard && activeHazard.spec.kind === "solar_pillar" && activeHazard.phase !== "idle" && Math.abs(cpu.x - activeHazard.x) < activeHazard.spec.width * .68) brain.desiredDir = cpu.x >= activeHazard.x ? 1 : -1;
	const nextEdgeLeft = nearestSolid.x + 28;
	const nextEdgeRight = nearestSolid.x + nearestSolid.width - 28;
	if (cpu.grounded && cpu.x < nextEdgeLeft && brain.desiredDir === -1) brain.desiredDir = 1;
	else if (cpu.grounded && cpu.x > nextEdgeRight && brain.desiredDir === 1) brain.desiredDir = -1;
	if (brain.desiredDir === -1) input.left = true;
	if (brain.desiredDir === 1) input.right = true;
	if (dy < -75 && cpu.grounded && Math.abs(dx) < 220) {
		input.jumpJustPressed = true;
		input.jumpHeld = true;
	} else if (dy > 75 && cpu.grounded && cpu.onPassThrough) input.down = true;
	if (brain.attackCooldown <= 0 && !cpu.attack) {
		if (dist < 88) {
			if (dy < -42) {
				input.up = true;
				input.attackJustPressed = true;
			} else if (!cpu.grounded && dy > 32) {
				input.down = true;
				input.attackJustPressed = true;
			} else if (opponent.damage > 75 || Math.random() < .35) {
				if (dx !== 0) {
					input.left = dx < 0;
					input.right = dx > 0;
				}
				input.specialJustPressed = Math.random() < .45;
				input.attackJustPressed = !input.specialJustPressed;
			} else {
				if (dx !== 0 && Math.abs(dx) > 48) {
					input.left = dx < 0;
					input.right = dx > 0;
				}
				input.attackJustPressed = true;
			}
			brain.attackCooldown = attackCadence;
		} else if (dist > 180 && dist < 440 && Math.abs(dy) < 55 && cpu.grounded) {
			if (difficulty !== "chill" || Math.random() < .5) {
				input.left = false;
				input.right = false;
				cpu.facing = dx >= 0 ? 1 : -1;
				input.specialJustPressed = true;
				brain.attackCooldown = attackCadence * 1.45;
			}
		}
	}
	return input;
}
// src/game/combat.ts
function createFighterRuntime(slot, spec, isCpu, stage, stocks) {
	const spawn = stage.spawns[slot];
	return {
		slot,
		spec,
		isCpu,
		x: spawn.x,
		y: spawn.y,
		vx: 0,
		vy: 0,
		facing: spawn.facing,
		grounded: true,
		onPassThrough: false,
		groundedPlatformId: null,
		ledgeGrab: null,
		ledgeCooldown: 0,
		dropThroughTimer: 0,
		coyoteTimer: .1,
		jumpBufferTimer: 0,
		jumpsRemaining: 2,
		upSpecialUsed: false,
		damage: 0,
		stocks,
		hitstunTimer: 0,
		hitFlashTimer: 0,
		invulnTimer: 0,
		respawnTimer: 0,
		shieldHealth: 100,
		shieldBrokenTimer: 0,
		shielding: false,
		dodgeTimer: 0,
		attack: null,
		squashX: 1,
		squashY: 1,
		walkPhase: 0,
		smokeTimer: 0,
		kos: 0,
		deaths: 0,
		damageDealt: 0,
		peakDamage: 0,
		lastHitBySlot: null
	};
}
/**
* Classic Smash-inspired knockback formula:
* Knockback scales nonlinearly with target's current damage percentage and inversely with fighter weight.
*/
function calculateKnockback(targetDamage, targetWeight, baseKnockback, knockbackGrowth) {
	const safeDamage = Math.max(0, Math.min(350, targetDamage));
	const scaled = baseKnockback + safeDamage * knockbackGrowth * (1 + Math.min(180, safeDamage) * .0018);
	return Math.min(1650, scaled / Math.max(.8, targetWeight));
}
function chooseAttackKind(fighter, input, isSpecial) {
	if (isSpecial) {
		if (input.up) {
			if (fighter.upSpecialUsed && !fighter.grounded) return null;
			return "upSpecial";
		}
		if (input.down) return "downSpecial";
		if (input.left || input.right) return "sideSpecial";
		return "neutralSpecial";
	}
	if (input.up) return "upAir";
	if (input.down && !fighter.grounded) return "downAir";
	if (input.left || input.right) return "sideTilt";
	return "jab";
}
function getAttackHitbox(fighter, spec) {
	const cx = fighter.x + spec.offsetX * fighter.facing;
	const cy = fighter.y + spec.offsetY;
	return {
		left: cx - spec.rangeX * .5,
		right: cx + spec.rangeX * .5,
		top: cy - spec.rangeY * .5,
		bottom: cy + spec.rangeY * .5
	};
}
function getHurtbox(fighter) {
	const halfW = fighter.spec.width * .5;
	return {
		left: fighter.x - halfW,
		right: fighter.x + halfW,
		top: fighter.y - fighter.spec.height,
		bottom: fighter.y
	};
}
function boxesOverlap(a, b) {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}
function isAttackActive(attack) {
	return attack.elapsed >= attack.spec.windup && attack.elapsed < attack.spec.windup + attack.spec.active;
}
function getAttackTotalDuration(spec) {
	return spec.windup + spec.active + spec.recovery;
}
function applyHit(attacker, attackerSlot, attackerFacing, target, damage, baseKnockback, knockbackGrowth, angleDeg, hitstop) {
	const impactX = target.x;
	const impactY = target.y - target.spec.height * .52;
	if (target.invulnTimer > 0 || target.dodgeTimer > 0 || target.respawnTimer > 0) return {
		connected: false,
		blocked: false,
		shieldBroken: false,
		knockbackMagnitude: 0,
		launchVx: 0,
		launchVy: 0,
		hitstop: 0,
		impactX,
		impactY
	};
	if (target.shielding && target.shieldHealth > 0) {
		target.shieldHealth = Math.max(0, target.shieldHealth - damage * 2.4);
		target.vx = attackerFacing * (180 + damage * 8);
		if (target.shieldHealth <= 0) {
			target.shielding = false;
			target.shieldBrokenTimer = 2;
			target.vy = -420;
			target.grounded = false;
			target.hitstunTimer = 2;
			return {
				connected: true,
				blocked: true,
				shieldBroken: true,
				knockbackMagnitude: 420,
				launchVx: target.vx,
				launchVy: target.vy,
				hitstop: .08,
				impactX,
				impactY
			};
		}
		return {
			connected: true,
			blocked: true,
			shieldBroken: false,
			knockbackMagnitude: 150,
			launchVx: target.vx,
			launchVy: 0,
			hitstop: Math.min(.04, hitstop * .65),
			impactX,
			impactY
		};
	}
	target.damage = Math.min(999, target.damage + damage);
	target.peakDamage = Math.max(target.peakDamage, target.damage);
	target.lastHitBySlot = attackerSlot;
	if (attacker) attacker.damageDealt += damage;
	if (target.attack && target.attack.spec.superArmor && isAttackActive(target.attack)) {
		target.hitFlashTimer = .06;
		return {
			connected: true,
			blocked: false,
			shieldBroken: false,
			knockbackMagnitude: 0,
			launchVx: target.vx,
			launchVy: target.vy,
			hitstop: Math.min(.04, hitstop * .5),
			impactX,
			impactY
		};
	}
	const kb = calculateKnockback(target.damage, target.spec.weight, baseKnockback, knockbackGrowth);
	const rad = angleDeg * Math.PI / 180;
	let dirX = Math.cos(rad) * attackerFacing;
	let dirY = -Math.sin(rad);
	if (target.grounded && dirY > .25) dirY = -Math.abs(dirY) * .72;
	const launchVx = dirX * kb;
	const launchVy = dirY * kb;
	target.vx = launchVx;
	target.vy = launchVy;
	target.grounded = false;
	target.groundedPlatformId = null;
	if (target.ledgeGrab) {
		target.ledgeGrab = null;
		target.ledgeCooldown = .4;
	}
	target.attack = null;
	target.shielding = false;
	target.hitFlashTimer = .09;
	target.hitstunTimer = Math.min(.85, .11 + kb / 1500);
	target.squashX = .78;
	target.squashY = 1.24;
	return {
		connected: true,
		blocked: false,
		shieldBroken: false,
		knockbackMagnitude: kb,
		launchVx,
		launchVy,
		hitstop: Math.min(.11, hitstop + (target.damage > 100 ? .02 : 0)),
		impactX,
		impactY
	};
}
function checkBlastZone(fighter, stage) {
	if (fighter.respawnTimer > 0) return null;
	if (fighter.x < stage.blastZones.left) return "left";
	if (fighter.x > stage.blastZones.right) return "right";
	if (fighter.y - fighter.spec.height > stage.blastZones.bottom) return "bottom";
	if (fighter.y < stage.blastZones.top && fighter.hitstunTimer > 0) return "top";
	return null;
}
function respawnFighter(fighter, stage) {
	fighter.x = fighter.slot === 0 ? -90 : 90;
	fighter.y = -180;
	fighter.vx = 0;
	fighter.vy = 0;
	fighter.facing = fighter.slot === 0 ? 1 : -1;
	fighter.grounded = false;
	fighter.onPassThrough = false;
	fighter.groundedPlatformId = null;
	fighter.ledgeGrab = null;
	fighter.ledgeCooldown = 0;
	fighter.damage = 0;
	fighter.hitstunTimer = 0;
	fighter.hitFlashTimer = 0;
	fighter.shieldHealth = 100;
	fighter.shieldBrokenTimer = 0;
	fighter.shielding = false;
	fighter.dodgeTimer = 0;
	fighter.attack = null;
	fighter.jumpsRemaining = 2;
	fighter.upSpecialUsed = false;
	fighter.invulnTimer = 2;
	fighter.respawnTimer = 1.35;
	fighter.lastHitBySlot = null;
}
function checkProjectileHit(proj, target, attacker) {
	if (proj.ownerSlot === target.slot) return null;
	if (!boxesOverlap({
		left: proj.x - proj.radius,
		right: proj.x + proj.radius,
		top: proj.y - proj.radius,
		bottom: proj.y + proj.radius
	}, getHurtbox(target))) return null;
	const facing = proj.vx >= 0 ? 1 : -1;
	return applyHit(attacker, proj.ownerSlot, facing, target, proj.damage, proj.baseKnockback, proj.knockbackGrowth, proj.angleDeg, .04);
}
function tryReflectProjectiles(reflector, projectiles) {
	if (!reflector.attack || !reflector.attack.spec.reflectsProjectiles || !isAttackActive(reflector.attack)) return 0;
	const hitbox = getAttackHitbox(reflector, reflector.attack.spec);
	let reflectedCount = 0;
	for (const proj of projectiles) {
		if (proj.ownerSlot === reflector.slot) continue;
		if (boxesOverlap(hitbox, {
			left: proj.x - proj.radius,
			right: proj.x + proj.radius,
			top: proj.y - proj.radius,
			bottom: proj.y + proj.radius
		})) {
			proj.ownerSlot = reflector.slot;
			proj.vx = -proj.vx * 1.45;
			proj.vy = proj.vy !== 0 ? proj.vy * .85 : 0;
			proj.damage = Math.round(proj.damage * 1.35);
			proj.life = 0;
			proj.color = reflector.spec.accentColor;
			reflectedCount += 1;
		}
	}
	return reflectedCount;
}
// src/game/hazards.ts
function createStageRuntime(stage) {
	return {
		platforms: stage.platforms.map((p) => ({
			...p,
			baseX: p.x,
			baseY: p.y,
			baseWidth: p.width,
			prevX: p.x,
			prevY: p.y,
			dx: 0,
			dy: 0,
			active: true,
			warningRatio: 0
		})),
		hazard: stage.hazard ? {
			spec: stage.hazard,
			phase: "idle",
			phaseProgress: 0,
			x: stage.hazard.xSpots[0] ?? 0,
			spotIndex: 0,
			hitSlots: [false, false]
		} : null,
		cycleTimer: 0
	};
}
function stepStageRuntime(runtime, elapsed, options) {
	const hazardsEnabled = options?.hazardsEnabled ?? true;
	runtime.cycleTimer = elapsed;
	const events = {
		telegraphStarted: false,
		erupted: false,
		collapsedPlatforms: [],
		reformedPlatforms: []
	};
	for (const plat of runtime.platforms) {
		plat.prevX = plat.x;
		plat.prevY = plat.y;
		const behavior = plat.behavior;
		if (!behavior) {
			plat.dx = 0;
			plat.dy = 0;
			plat.active = true;
			plat.warningRatio = 0;
			continue;
		}
		if (behavior.kind === "move") {
			const t = elapsed + (behavior.phase ?? 0);
			const wave = Math.sin(t / behavior.period * Math.PI * 2);
			plat.x = plat.baseX + behavior.ampX * wave;
			plat.y = plat.baseY + behavior.ampY * wave;
			plat.width = plat.baseWidth;
			plat.active = true;
			plat.warningRatio = 0;
		} else if (behavior.kind === "shrink") {
			if (!hazardsEnabled) {
				plat.x = plat.baseX;
				plat.y = plat.baseY;
				plat.width = plat.baseWidth;
				plat.active = true;
				plat.warningRatio = 0;
			} else {
				const wasActive = plat.active;
				const minW = behavior.minWidth ?? 40;
				const cycleT = ((elapsed + (behavior.phase ?? 0)) % behavior.period + behavior.period) % behavior.period;
				const warnEnd = behavior.solidDuration + behavior.warnDuration;
				const goneEnd = warnEnd + behavior.goneDuration;
				const centerX = plat.baseX + plat.baseWidth * .5;
				if (cycleT < behavior.solidDuration) {
					plat.width = plat.baseWidth;
					plat.active = true;
					plat.warningRatio = 0;
				} else if (cycleT < warnEnd) {
					const p = (cycleT - behavior.solidDuration) / Math.max(.01, behavior.warnDuration);
					plat.width = plat.baseWidth - (plat.baseWidth - minW) * p;
					plat.active = true;
					plat.warningRatio = p;
				} else if (cycleT < goneEnd) {
					plat.width = 0;
					plat.active = false;
					plat.warningRatio = 0;
				} else {
					const reformDur = Math.max(.05, behavior.period - goneEnd);
					const p = (cycleT - goneEnd) / reformDur;
					plat.width = minW + (plat.baseWidth - minW) * p;
					plat.active = true;
					plat.warningRatio = 0;
				}
				plat.x = centerX - plat.width * .5;
				plat.y = plat.baseY;
				if (wasActive && !plat.active) events.collapsedPlatforms.push(plat);
				else if (!wasActive && plat.active) events.reformedPlatforms.push(plat);
			}
		}
		plat.dx = plat.x - plat.prevX;
		plat.dy = plat.y - plat.prevY;
	}
	if (runtime.hazard) {
		const haz = runtime.hazard;
		const spec = haz.spec;
		const prevPhase = haz.phase;
		if (!hazardsEnabled || elapsed < spec.initialDelay) {
			haz.phase = "idle";
			haz.phaseProgress = 0;
			haz.hitSlots = [false, false];
		} else {
			const t = elapsed - spec.initialDelay;
			const cycleIndex = Math.floor(t / spec.period);
			const cycleT = t % spec.period;
			const spotIndex = cycleIndex % Math.max(1, spec.xSpots.length);
			haz.spotIndex = spotIndex;
			haz.x = spec.xSpots[spotIndex] ?? 0;
			if (cycleT < spec.telegraphDuration) {
				haz.phase = "telegraph";
				haz.phaseProgress = cycleT / Math.max(.01, spec.telegraphDuration);
				haz.hitSlots = [false, false];
				if (prevPhase !== "telegraph") events.telegraphStarted = true;
			} else if (cycleT < spec.telegraphDuration + spec.activeDuration) {
				haz.phase = "active";
				haz.phaseProgress = (cycleT - spec.telegraphDuration) / Math.max(.01, spec.activeDuration);
				if (prevPhase !== "active") events.erupted = true;
			} else {
				haz.phase = "idle";
				haz.phaseProgress = 0;
				haz.hitSlots = [false, false];
			}
		}
	}
	return events;
}
function applyStageHazardEffects(runtime, fighters, dt) {
	const haz = runtime.hazard;
	if (!haz || haz.phase !== "active") return [];
	const spec = haz.spec;
	const hazBox = {
		left: haz.x - spec.width * .5,
		right: haz.x + spec.width * .5,
		top: spec.yTop,
		bottom: spec.yBottom
	};
	const hits = [];
	for (const f of fighters) {
		if (f.stocks <= 0 || f.respawnTimer > 0) continue;
		if (!boxesOverlap(hazBox, getHurtbox(f))) continue;
		if (spec.kind === "storm_updraft") {
			const lift = spec.liftAccel ?? 1900;
			if (!f.grounded && f.invulnTimer <= 0) {
				f.vy = Math.max(-460, f.vy - lift * dt);
				f.upSpecialUsed = false;
			}
		} else {
			if (haz.hitSlots[f.slot]) continue;
			const res = applyHit(null, f.slot === 0 ? 1 : 0, f.x >= haz.x ? 1 : -1, f, spec.damage, spec.baseKnockback, spec.knockbackGrowth, spec.angleDeg, .05);
			if (res.connected) {
				haz.hitSlots[f.slot] = true;
				hits.push(res);
			}
		}
	}
	return hits;
}
// src/game/particles.ts
var POOL_SIZE = 280;
var ParticlePool = class {
	constructor() {
		this.cursor = 0;
		this.items = Array.from({ length: POOL_SIZE }, () => ({
			active: false,
			kind: "spark",
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			size: 4,
			grow: 0,
			life: 0,
			maxLife: 1,
			color: "#ffffff",
			alpha: 1
		}));
	}
	clear() {
		for (let i = 0; i < POOL_SIZE; i++) this.items[i].active = false;
	}
	spawn(kind, x, y, vx, vy, size, grow, maxLife, color, alpha = 1) {
		const slot = this.items[this.cursor];
		this.cursor = (this.cursor + 1) % POOL_SIZE;
		slot.active = true;
		slot.kind = kind;
		slot.x = x;
		slot.y = y;
		slot.vx = vx;
		slot.vy = vy;
		slot.size = size;
		slot.grow = grow;
		slot.life = 0;
		slot.maxLife = maxLife;
		slot.color = color;
		slot.alpha = alpha;
	}
	spawnBurst(x, y, count, speed, color, kind = "spark") {
		for (let i = 0; i < count; i++) {
			const ang = Math.PI * 2 * i / count + (Math.random() - .5) * .45;
			const spd = speed * (.45 + Math.random() * .75);
			this.spawn(kind, x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, kind === "star" ? 9 + Math.random() * 6 : 4 + Math.random() * 5, -4, .24 + Math.random() * .24, color, 1);
		}
	}
	spawnRing(x, y, color, startSize = 10, grow = 220) {
		this.spawn("ring", x, y, 0, 0, startSize, grow, .26, color, .9);
	}
	spawnDust(x, y, dir, count = 4) {
		for (let i = 0; i < count; i++) this.spawn("dust", x + (Math.random() - .5) * 14, y - 3, dir * (40 + Math.random() * 75) + (Math.random() - .5) * 50, -18 - Math.random() * 45, 6 + Math.random() * 6, 14, .26 + Math.random() * .14, "#CBD5E1", .65);
	}
	update(dt) {
		for (let i = 0; i < POOL_SIZE; i++) {
			const p = this.items[i];
			if (!p.active) continue;
			p.life += dt;
			if (p.life >= p.maxLife) {
				p.active = false;
				continue;
			}
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.kind === "spark" || p.kind === "star") {
				p.vx *= Math.pow(.18, dt);
				p.vy *= Math.pow(.18, dt);
			} else if (p.kind === "smoke") p.vy -= 22 * dt;
			p.size = Math.max(.5, p.size + p.grow * dt);
		}
	}
};
// src/game/physics.ts
function stepFighterPhysics(fighter, input, stage, dt, platformsOverride) {
	const events = {
		jumped: false,
		doubleJumped: false,
		landed: false,
		dodged: false,
		grabbedLedge: null,
		startedAttack: null,
		spawnedProjectile: false
	};
	if (fighter.hitFlashTimer > 0) fighter.hitFlashTimer = Math.max(0, fighter.hitFlashTimer - dt);
	if (fighter.invulnTimer > 0) fighter.invulnTimer = Math.max(0, fighter.invulnTimer - dt);
	if (fighter.ledgeCooldown > 0) fighter.ledgeCooldown = Math.max(0, fighter.ledgeCooldown - dt);
	if (fighter.dropThroughTimer > 0) fighter.dropThroughTimer = Math.max(0, fighter.dropThroughTimer - dt);
	if (fighter.dodgeTimer > 0) fighter.dodgeTimer = Math.max(0, fighter.dodgeTimer - dt);
	const squashRate = 1 - Math.exp(-16 * dt);
	fighter.squashX += (1 - fighter.squashX) * squashRate;
	fighter.squashY += (1 - fighter.squashY) * squashRate;
	if (fighter.respawnTimer > 0) {
		fighter.respawnTimer = Math.max(0, fighter.respawnTimer - dt);
		fighter.vy = 0;
		fighter.vx = 0;
		if (input.left || input.right || input.jumpJustPressed || input.attackJustPressed || input.specialJustPressed) fighter.respawnTimer = 0;
		else return events;
	}
	if (fighter.shieldBrokenTimer > 0) fighter.shieldBrokenTimer = Math.max(0, fighter.shieldBrokenTimer - dt);
	if (fighter.hitstunTimer > 0) {
		fighter.hitstunTimer = Math.max(0, fighter.hitstunTimer - dt);
		fighter.shielding = false;
		fighter.ledgeGrab = null;
		const diX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
		const diY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
		fighter.vx += diX * 320 * dt;
		fighter.vy += diY * 180 * dt;
		fighter.vx *= Math.pow(.72, dt);
		fighter.vy += fighter.spec.gravity * .9 * dt;
		fighter.smokeTimer -= dt;
		applyMovementAndPlatforms(fighter, platformsOverride ?? stage.platforms, dt, events);
		return events;
	}
	if (fighter.ledgeGrab) {
		stepLedgeHang(fighter, input, dt, events);
		return events;
	}
	if (fighter.grounded) {
		fighter.coyoteTimer = .1;
		fighter.jumpsRemaining = 2;
		fighter.upSpecialUsed = false;
	} else fighter.coyoteTimer = Math.max(0, fighter.coyoteTimer - dt);
	if (input.jumpJustPressed) fighter.jumpBufferTimer = .12;
	else fighter.jumpBufferTimer = Math.max(0, fighter.jumpBufferTimer - dt);
	const canAct = !fighter.attack && fighter.shieldBrokenTimer <= 0;
	if (canAct && !fighter.grounded && input.dodgeJustPressed && fighter.dodgeTimer <= 0) {
		fighter.dodgeTimer = .22;
		fighter.invulnTimer = Math.max(fighter.invulnTimer, .2);
		const dirX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
		const dirY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
		if (dirX !== 0 || dirY !== 0) {
			const len = Math.hypot(dirX, dirY);
			fighter.vx = dirX / len * 440;
			fighter.vy = dirY / len * 380;
		} else {
			fighter.vx *= .4;
			fighter.vy = Math.min(fighter.vy, 60);
		}
		fighter.squashX = 1.15;
		fighter.squashY = .85;
		events.dodged = true;
	}
	fighter.shielding = canAct && fighter.grounded && input.shieldHeld && fighter.shieldHealth > 2 && fighter.dodgeTimer <= 0;
	if (fighter.shielding) {
		fighter.shieldHealth = Math.max(0, fighter.shieldHealth - 22 * dt);
		fighter.vx *= Math.pow(.02, dt);
	} else fighter.shieldHealth = Math.min(100, fighter.shieldHealth + 14 * dt);
	const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
	if (canAct && !fighter.shielding && moveDir !== 0) fighter.facing = moveDir > 0 ? 1 : -1;
	if (canAct && fighter.grounded && fighter.onPassThrough && input.down && !input.attackJustPressed && !input.specialJustPressed) {
		fighter.grounded = false;
		fighter.onPassThrough = false;
		fighter.groundedPlatformId = null;
		fighter.dropThroughTimer = .22;
		fighter.y += 4;
		fighter.vy = Math.max(fighter.vy, 180);
	}
	if (canAct && !fighter.shielding && fighter.jumpBufferTimer > 0) {
		if (fighter.coyoteTimer > 0) {
			fighter.vy = -fighter.spec.jumpForce;
			fighter.grounded = false;
			fighter.groundedPlatformId = null;
			fighter.coyoteTimer = 0;
			fighter.jumpBufferTimer = 0;
			fighter.jumpsRemaining = 1;
			fighter.squashX = .82;
			fighter.squashY = 1.22;
			events.jumped = true;
		} else if (fighter.jumpsRemaining > 0) {
			fighter.vy = -fighter.spec.doubleJumpForce;
			fighter.jumpsRemaining -= 1;
			fighter.jumpBufferTimer = 0;
			if (moveDir !== 0) fighter.vx = moveDir * fighter.spec.maxSpeed * .9;
			fighter.squashX = .8;
			fighter.squashY = 1.25;
			events.doubleJumped = true;
		}
	}
	if (!input.jumpHeld && fighter.vy < -220 && !fighter.attack) fighter.vy *= Math.pow(.08, dt * 8);
	if (canAct && !fighter.shielding && fighter.dodgeTimer <= 0) {
		if (input.specialJustPressed || input.attackJustPressed) {
			const kind = chooseAttackKind(fighter, input, input.specialJustPressed);
			if (kind) {
				const spec = fighter.spec.attacks[kind];
				fighter.attack = {
					kind,
					elapsed: 0,
					hasHit: false,
					spec
				};
				if (kind === "upSpecial") fighter.upSpecialUsed = true;
				if (spec.selfVx !== void 0) fighter.vx = spec.selfVx * fighter.facing;
				if (spec.selfVy !== void 0) {
					fighter.vy = spec.selfVy;
					fighter.grounded = false;
					fighter.groundedPlatformId = null;
				}
				events.startedAttack = kind;
			}
		}
	}
	if (fighter.attack) {
		const prevElapsed = fighter.attack.elapsed;
		fighter.attack.elapsed += dt;
		const spec = fighter.attack.spec;
		if (spec.projectileSpeed && prevElapsed < spec.windup && fighter.attack.elapsed >= spec.windup) events.spawnedProjectile = true;
		if (fighter.attack.elapsed >= getAttackTotalDuration(spec)) fighter.attack = null;
	}
	if (!fighter.shielding) {
		const accel = fighter.grounded ? fighter.spec.groundAccel : fighter.spec.airAccel;
		const attackControlScale = fighter.attack ? fighter.attack.spec.isRecovery ? .95 : fighter.grounded ? .2 : .6 : 1;
		if (moveDir !== 0) {
			const targetVx = moveDir * fighter.spec.maxSpeed;
			const step = accel * attackControlScale * dt;
			if (fighter.vx < targetVx) fighter.vx = Math.min(targetVx, fighter.vx + step);
			else if (fighter.vx > targetVx) fighter.vx = Math.max(targetVx, fighter.vx - step);
		} else if (fighter.grounded && !fighter.attack) {
			const friction = 2600 * dt;
			if (Math.abs(fighter.vx) <= friction) fighter.vx = 0;
			else fighter.vx -= Math.sign(fighter.vx) * friction;
		} else fighter.vx *= Math.pow(.65, dt);
	}
	if (fighter.grounded && Math.abs(fighter.vx) > 20 && !fighter.attack) fighter.walkPhase += Math.abs(fighter.vx) * dt * .042;
	if (!fighter.grounded) {
		const gravScale = fighter.attack?.kind === "upSpecial" && fighter.attack.elapsed < fighter.attack.spec.windup + fighter.attack.spec.active ? .48 : 1;
		fighter.vy += fighter.spec.gravity * gravScale * dt;
		const maxFall = input.down && !fighter.attack ? fighter.spec.fastFallMax : fighter.spec.fallSpeedMax;
		if (fighter.vy > maxFall) fighter.vy = maxFall;
	}
	const activePlatforms = platformsOverride ?? stage.platforms;
	applyMovementAndPlatforms(fighter, activePlatforms, dt, events);
	tryGrabLedge(fighter, activePlatforms, input, events);
	return events;
}
function stepLedgeHang(fighter, input, dt, events) {
	const lg = fighter.ledgeGrab;
	if (!lg) return;
	lg.timer += dt;
	const halfW = fighter.spec.width * .5;
	fighter.x = lg.ledgeX + lg.side * halfW * .65;
	fighter.y = lg.ledgeY + fighter.spec.height * .72;
	fighter.vx = 0;
	fighter.vy = 0;
	fighter.grounded = false;
	fighter.facing = lg.side === -1 ? 1 : -1;
	if (lg.timer >= .08 && (input.jumpJustPressed || input.up)) {
		fighter.ledgeGrab = null;
		fighter.ledgeCooldown = .28;
		fighter.vy = -fighter.spec.jumpForce * .96;
		fighter.vx = -lg.side * fighter.spec.maxSpeed * .48;
		fighter.jumpsRemaining = 1;
		fighter.squashX = .82;
		fighter.squashY = 1.22;
		events.jumped = true;
		return;
	}
	if (lg.timer >= .08 && (input.attackJustPressed || input.specialJustPressed)) {
		fighter.x = lg.ledgeX - lg.side * (halfW + 18);
		fighter.y = lg.ledgeY;
		fighter.grounded = true;
		fighter.onPassThrough = false;
		fighter.groundedPlatformId = lg.platformId;
		fighter.ledgeGrab = null;
		fighter.ledgeCooldown = .35;
		fighter.invulnTimer = Math.max(fighter.invulnTimer, .22);
		const tiltSpec = fighter.spec.attacks.sideTilt;
		fighter.attack = {
			kind: "sideTilt",
			elapsed: 0,
			hasHit: false,
			spec: tiltSpec
		};
		fighter.vx = (tiltSpec.selfVx ?? 140) * fighter.facing;
		events.startedAttack = "sideTilt";
		return;
	}
	const inwardPressed = lg.side === -1 && input.right || lg.side === 1 && input.left;
	const outwardPressed = lg.side === -1 && input.left || lg.side === 1 && input.right;
	if (lg.timer >= .14 && (inwardPressed || input.shieldHeld || input.dodgeJustPressed)) {
		fighter.x = lg.ledgeX - lg.side * (halfW + 14);
		fighter.y = lg.ledgeY;
		fighter.grounded = true;
		fighter.onPassThrough = false;
		fighter.groundedPlatformId = lg.platformId;
		fighter.ledgeGrab = null;
		fighter.ledgeCooldown = .35;
		fighter.invulnTimer = Math.max(fighter.invulnTimer, .25);
		fighter.squashX = 1.16;
		fighter.squashY = .84;
		events.landed = true;
		return;
	}
	if (lg.timer >= .14 && (input.down || outwardPressed) || lg.timer >= 2.4) {
		fighter.ledgeGrab = null;
		fighter.ledgeCooldown = .4;
		fighter.vy = 140;
		fighter.jumpsRemaining = 2;
	}
}
function tryGrabLedge(fighter, platforms, input, events) {
	if (fighter.grounded || fighter.ledgeGrab || fighter.ledgeCooldown > 0 || fighter.hitstunTimer > 0 || input.down) return;
	const isRecovery = Boolean(fighter.attack?.spec.isRecovery);
	if (fighter.vy < -460 && !isRecovery) return;
	const halfW = fighter.spec.width * .5;
	for (const plat of platforms) {
		if (plat.passThrough || !isPlatformActive(plat)) continue;
		const edges = [{
			side: -1,
			lx: plat.x
		}, {
			side: 1,
			lx: plat.x + plat.width
		}];
		for (const edge of edges) {
			const inX = edge.side === -1 ? fighter.x >= edge.lx - 48 && fighter.x <= edge.lx + 18 : fighter.x >= edge.lx - 18 && fighter.x <= edge.lx + 48;
			const inY = fighter.y >= plat.y + 8 && fighter.y <= plat.y + 96;
			if (inX && inY) {
				fighter.ledgeGrab = {
					platformId: plat.id,
					side: edge.side,
					ledgeX: edge.lx,
					ledgeY: plat.y,
					timer: 0
				};
				fighter.x = edge.lx + edge.side * halfW * .65;
				fighter.y = plat.y + fighter.spec.height * .72;
				fighter.vx = 0;
				fighter.vy = 0;
				fighter.facing = edge.side === -1 ? 1 : -1;
				fighter.attack = null;
				fighter.shielding = false;
				fighter.jumpsRemaining = 2;
				fighter.upSpecialUsed = false;
				fighter.invulnTimer = Math.max(fighter.invulnTimer, .55);
				fighter.squashX = .9;
				fighter.squashY = 1.08;
				events.grabbedLedge = {
					x: edge.lx,
					y: plat.y,
					side: edge.side
				};
				return;
			}
		}
	}
}
function isPlatformActive(plat) {
	return !("active" in plat) || plat.active;
}
function applyMovementAndPlatforms(fighter, platforms, dt, events) {
	if (fighter.grounded && fighter.groundedPlatformId) {
		const riding = platforms.find((p) => p.id === fighter.groundedPlatformId && isPlatformActive(p));
		if (riding) {
			fighter.x += riding.dx ?? 0;
			fighter.y += riding.dy ?? 0;
		}
	}
	const prevY = fighter.y;
	const prevX = fighter.x;
	fighter.x += fighter.vx * dt;
	fighter.y += fighter.vy * dt;
	const halfW = fighter.spec.width * .5;
	let landedPlatform = null;
	if (fighter.vy >= 0) for (const plat of platforms) {
		if (!isPlatformActive(plat)) continue;
		if (plat.passThrough && fighter.dropThroughTimer > 0) continue;
		if (!(fighter.x + halfW * .72 > plat.x && fighter.x - halfW * .72 < plat.x + plat.width)) continue;
		if (prevY <= ("prevY" in plat ? plat.prevY : plat.y) + 10 && fighter.y >= plat.y) {
			if (!landedPlatform || plat.y < landedPlatform.y) landedPlatform = plat;
		}
	}
	if (landedPlatform) {
		const wasAirborne = !fighter.grounded;
		const impactVy = fighter.vy;
		fighter.y = landedPlatform.y;
		fighter.vy = 0;
		fighter.grounded = true;
		fighter.onPassThrough = landedPlatform.passThrough;
		fighter.groundedPlatformId = landedPlatform.id;
		if (wasAirborne && impactVy > 120) {
			fighter.squashX = 1.22;
			fighter.squashY = .78;
			events.landed = true;
		}
	} else {
		fighter.grounded = false;
		fighter.onPassThrough = false;
		fighter.groundedPlatformId = null;
	}
	for (const plat of platforms) {
		if (!isPlatformActive(plat)) continue;
		if (plat.passThrough) continue;
		if (!(fighter.y > plat.y + 6 && fighter.y - fighter.spec.height < plat.y + plat.height)) continue;
		if (prevX + halfW <= plat.x + 4 && fighter.x + halfW > plat.x) {
			fighter.x = plat.x - halfW;
			if (fighter.vx > 0) fighter.vx = 0;
		} else if (prevX - halfW >= plat.x + plat.width - 4 && fighter.x - halfW < plat.x + plat.width) {
			fighter.x = plat.x + plat.width + halfW;
			if (fighter.vx < 0) fighter.vx = 0;
		}
	}
}
function computeDynamicCamera(f1, f2, stage, viewportW, viewportH) {
	const clampX = (val) => Math.max(stage.blastZones.left * .45, Math.min(stage.blastZones.right * .45, val));
	const clampY = (val) => Math.max(stage.blastZones.top * .45, Math.min(stage.blastZones.bottom * .35, val));
	const x1 = clampX(f1.x);
	const y1 = clampY(f1.y - 36);
	const x2 = clampX(f2.x);
	const y2 = clampY(f2.y - 36);
	const midX = (x1 + x2) * .5;
	const midY = (y1 + y2) * .5 - 22;
	const spanX = Math.max(460, Math.abs(x1 - x2) + 360);
	const spanY = Math.max(300, Math.abs(y1 - y2) + 260);
	const zoomX = viewportW / spanX;
	const zoomY = viewportH / spanY;
	const baseScale = Math.min(viewportW / 1180, viewportH / 680);
	const zoom = Math.max(baseScale * .72, Math.min(baseScale * 1.18, Math.min(zoomX, zoomY)));
	return {
		x: midX * .55,
		y: midY * .55,
		zoom
	};
}
// src/game/renderer.ts
var cachedBgCanvas = null;
var cachedBgKey = "";
function getStaticBackdrop(width, height, stage) {
	const key = `${stage.id}:${width}:${height}`;
	if (cachedBgCanvas && cachedBgKey === key) return cachedBgCanvas;
	if (!cachedBgCanvas) cachedBgCanvas = document.createElement("canvas");
	cachedBgCanvas.width = width;
	cachedBgCanvas.height = height;
	cachedBgKey = key;
	const bctx = cachedBgCanvas.getContext("2d");
	if (!bctx) return cachedBgCanvas;
	const skyGrad = bctx.createLinearGradient(0, 0, 0, height);
	skyGrad.addColorStop(0, stage.skyTop);
	skyGrad.addColorStop(.58, stage.skyMid);
	skyGrad.addColorStop(1, stage.skyBottom);
	bctx.fillStyle = skyGrad;
	bctx.fillRect(0, 0, width, height);
	const sunX = width * .5;
	const sunY = height * .42;
	const sunGrad = bctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, Math.min(width, height) * .48);
	sunGrad.addColorStop(0, "rgba(251, 191, 36, 0.22)");
	sunGrad.addColorStop(.55, "rgba(245, 158, 11, 0.06)");
	sunGrad.addColorStop(1, "rgba(245, 158, 11, 0)");
	bctx.fillStyle = sunGrad;
	bctx.fillRect(0, 0, width, height);
	return cachedBgCanvas;
}
function renderArena(ctx, width, height, state) {
	const { stage, platforms, activeHazard, fighters, projectiles, particles, blastBeams, worldTime } = state;
	const bg = getStaticBackdrop(width, height, stage);
	ctx.drawImage(bg, 0, 0, width, height);
	ctx.save();
	ctx.translate(width * .5 + state.shakeX, height * .52 + state.shakeY);
	ctx.scale(state.camZoom, state.camZoom);
	ctx.translate(-state.camX, -state.camY);
	if (activeHazard && activeHazard.phase !== "idle") drawStageHazard(ctx, activeHazard, worldTime);
	drawStagePlatforms(ctx, stage, platforms, worldTime);
	for (const beam of blastBeams) {
		const t = beam.life / beam.maxLife;
		const alpha = Math.max(0, 1 - t);
		ctx.save();
		ctx.translate(beam.x, beam.y);
		ctx.rotate(beam.angle);
		ctx.globalAlpha = alpha * .9;
		ctx.fillStyle = beam.color;
		const halfBeam = (1 - t * .55) * 64;
		ctx.beginPath();
		ctx.moveTo(0, -halfBeam * .25);
		ctx.lineTo(740, -halfBeam * 1.4);
		ctx.lineTo(740, halfBeam * 1.4);
		ctx.lineTo(0, halfBeam * .25);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	for (const fighter of fighters) {
		if (fighter.stocks <= 0) continue;
		drawFighter(ctx, fighter, worldTime, state.isTitleTour);
	}
	for (const proj of projectiles) drawProjectile(ctx, proj, worldTime);
	drawParticles(ctx, particles);
	ctx.restore();
	if (!state.isTitleTour) for (const fighter of fighters) {
		if (fighter.stocks <= 0 || fighter.respawnTimer > 0) continue;
		drawOffstageIndicator(ctx, width, height, fighter, state);
	}
}
function drawStageHazard(ctx, hazard, worldTime) {
	const { spec, phase, phaseProgress, x } = hazard;
	const halfW = spec.width * .5;
	const height = spec.yBottom - spec.yTop;
	ctx.save();
	if (spec.kind === "solar_pillar") {
		if (phase === "telegraph") {
			const pulse = .55 + Math.sin(worldTime * 22) * .3;
			ctx.fillStyle = `rgba(251, 146, 60, ${.1 + phaseProgress * .22})`;
			ctx.fillRect(x - halfW, spec.yTop, spec.width, height);
			ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
			ctx.fillRect(x - halfW, spec.yBottom - 6, spec.width, 8);
			ctx.fillStyle = "#FEF08A";
			ctx.fillRect(x - halfW * phaseProgress, spec.yBottom - 4, spec.width * phaseProgress, 4);
		} else if (phase === "active") {
			ctx.globalAlpha = Math.max(.2, 1 - phaseProgress * .65);
			ctx.fillStyle = "#FB923C";
			ctx.fillRect(x - halfW, spec.yTop, spec.width, height);
			ctx.fillStyle = "#FEF08A";
			ctx.fillRect(x - halfW * .52, spec.yTop, spec.width * .52 * 2, height);
			ctx.fillStyle = "#FFFFFF";
			ctx.fillRect(x - halfW * .2, spec.yTop, spec.width * .4, height);
		}
	} else if (spec.kind === "storm_updraft") {
		const isTel = phase === "telegraph";
		ctx.fillStyle = isTel ? `rgba(103, 232, 249, ${.06 + phaseProgress * .1})` : "rgba(103, 232, 249, 0.14)";
		ctx.fillRect(x - halfW, spec.yTop, spec.width, height);
		const streamCount = 4;
		ctx.strokeStyle = isTel ? "rgba(103, 232, 249, 0.45)" : "rgba(186, 230, 253, 0.72)";
		ctx.lineWidth = isTel ? 2 : 3;
		ctx.lineCap = "round";
		for (let i = 0; i < streamCount; i++) {
			const sx = x - halfW * .65 + i / 3 * spec.width * .65;
			const offset = (worldTime * (isTel ? 140 : 340) + i * 95) % height;
			const sy = spec.yBottom - offset;
			const len = isTel ? 28 : 48;
			ctx.beginPath();
			ctx.moveTo(sx, sy);
			ctx.lineTo(sx, Math.max(spec.yTop, sy - len));
			ctx.stroke();
		}
		if (!isTel) {
			const chevY = spec.yBottom - 40 - worldTime * 200 % (height - 80);
			ctx.beginPath();
			ctx.moveTo(x - 18, chevY + 12);
			ctx.lineTo(x, chevY);
			ctx.lineTo(x + 18, chevY + 12);
			ctx.stroke();
		}
	}
	ctx.restore();
}
function drawStagePlatforms(ctx, stage, platforms, worldTime) {
	for (const plat of platforms) {
		if (plat.behavior?.kind === "move") {
			const { ampX, ampY } = plat.behavior;
			const cx0 = plat.baseX + plat.baseWidth * .5;
			const cy0 = plat.baseY + plat.height * .5;
			ctx.save();
			ctx.strokeStyle = "rgba(148, 163, 184, 0.24)";
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 6]);
			ctx.beginPath();
			ctx.moveTo(cx0 - ampX, cy0 - ampY);
			ctx.lineTo(cx0 + ampX, cy0 + ampY);
			ctx.stroke();
			ctx.restore();
		}
		if (!plat.active) {
			ctx.save();
			ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
			ctx.lineWidth = 2;
			ctx.setLineDash([6, 5]);
			ctx.strokeRect(plat.baseX, plat.baseY, plat.baseWidth, plat.height);
			ctx.restore();
			continue;
		}
		if (plat.passThrough) {
			const warn = plat.warningRatio;
			const pulse = warn > 0 ? .5 + Math.sin(worldTime * 22) * .5 : 0;
			ctx.fillStyle = warn > 0 ? pulse > .5 ? "#991B1B" : "#7C2D12" : "#475569";
			ctx.beginPath();
			ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
			ctx.fill();
			ctx.fillStyle = warn > 0 ? "#FCA5A5" : "#E2E8F0";
			ctx.fillRect(plat.x + 2, plat.y, Math.max(0, plat.width - 4), 4);
			if (plat.behavior?.kind === "move") {
				ctx.fillStyle = "#38BDF8";
				ctx.fillRect(plat.x + plat.width * .25, plat.y + plat.height - 3, plat.width * .5, 3);
			} else if (warn > 0) {
				ctx.fillStyle = "#EF4444";
				ctx.fillRect(plat.x, plat.y, 6, plat.height);
				ctx.fillRect(plat.x + plat.width - 6, plat.y, 6, plat.height);
			}
		} else {
			const cx = plat.x + plat.width * .5;
			const underDepth = 64;
			ctx.fillStyle = "#1E293B";
			ctx.beginPath();
			ctx.moveTo(plat.x + 14, plat.y + plat.height - 2);
			ctx.lineTo(plat.x + plat.width - 14, plat.y + plat.height - 2);
			ctx.lineTo(cx + plat.width * .18, plat.y + plat.height + underDepth);
			ctx.lineTo(cx - plat.width * .18, plat.y + plat.height + underDepth);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = stage.stoneMain;
			ctx.beginPath();
			ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
			ctx.fill();
			ctx.fillStyle = "#F8FAFC";
			ctx.fillRect(plat.x + 4, plat.y, plat.width - 8, 5);
			ctx.fillStyle = "#F59E0B";
			ctx.fillRect(plat.x + 4, plat.y + 5, 12, 4);
			ctx.fillRect(plat.x + plat.width - 16, plat.y + 5, 12, 4);
		}
	}
}
function drawFighter(ctx, f, time, isTitleTour) {
	ctx.save();
	if (f.invulnTimer > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = .55;
	if (f.respawnTimer > 0) {
		ctx.save();
		ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
		ctx.beginPath();
		ctx.ellipse(f.x, f.y + 6, 36, 7, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.strokeStyle = f.spec.accentColor;
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.restore();
	}
	if (f.grounded) {
		ctx.fillStyle = "rgba(2, 6, 23, 0.42)";
		ctx.beginPath();
		ctx.ellipse(f.x, f.y + 2, f.spec.width * .55, 5, 0, 0, Math.PI * 2);
		ctx.fill();
	}
	if (f.ledgeGrab) {
		ctx.save();
		ctx.strokeStyle = f.slot === 0 ? "#FCA5A5" : "#93C5FD";
		ctx.fillStyle = f.spec.accentColor;
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(f.ledgeGrab.ledgeX, f.ledgeGrab.ledgeY + 2, 7 + Math.sin(time * 12) * 1.5, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.arc(f.ledgeGrab.ledgeX, f.ledgeGrab.ledgeY + 2, 3.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
	}
	ctx.translate(f.x, f.y);
	ctx.scale(f.facing * f.squashX, f.squashY);
	const isHitFlash = f.hitFlashTimer > 0;
	const stride = f.grounded && Math.abs(f.vx) > 25 ? Math.sin(f.walkPhase) : 0;
	const idleBob = f.grounded && Math.abs(f.vx) <= 25 ? Math.sin(time * 4.5 + f.slot) * 1.8 : 0;
	if (f.spec.id === "blaze") drawBlazeSprite(ctx, f, time, stride, idleBob, isHitFlash);
	else if (f.spec.id === "gale") drawGaleSprite(ctx, f, time, stride, idleBob, isHitFlash);
	else drawTitanSprite(ctx, f, time, stride, idleBob, isHitFlash);
	if (f.ledgeGrab) {
		ctx.save();
		ctx.fillStyle = f.spec.accentColor;
		ctx.strokeStyle = "#0F172A";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(13, -f.spec.height * .7, 5.5, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
	if (f.attack) drawAttackEffects(ctx, f, time);
	if (f.shielding && f.shieldHealth > 0) {
		const ratio = Math.max(.25, f.shieldHealth / 100);
		const shieldR = Math.max(f.spec.width, f.spec.height) * .68 * ratio;
		ctx.fillStyle = f.slot === 0 ? "rgba(239, 68, 68, 0.28)" : "rgba(59, 130, 246, 0.28)";
		ctx.strokeStyle = f.slot === 0 ? "#FCA5A5" : "#93C5FD";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(0, -f.spec.height * .5, shieldR, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
	if (f.shieldBrokenTimer > 0) {
		ctx.fillStyle = "#FACC15";
		for (let i = 0; i < 3; i++) {
			const ang = time * 6 + i * Math.PI * 2 / 3;
			ctx.beginPath();
			ctx.arc(Math.cos(ang) * 18, -f.spec.height - 10 + Math.sin(ang) * 5, 3.5, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();
	if (!isTitleTour) {
		ctx.save();
		const tagY = f.y - f.spec.height - 22;
		const label = f.slot === 0 ? "P1" : f.isCpu ? "CPU" : "P2";
		ctx.fillStyle = f.slot === 0 ? "#EF4444" : "#3B82F6";
		ctx.beginPath();
		ctx.moveTo(f.x - 6, tagY + 4);
		ctx.lineTo(f.x + 6, tagY + 4);
		ctx.lineTo(f.x, tagY + 11);
		ctx.closePath();
		ctx.fill();
		ctx.font = "700 12px \"Barlow Condensed\", sans-serif";
		ctx.textAlign = "center";
		ctx.lineWidth = 3;
		ctx.strokeStyle = "#0B1120";
		ctx.strokeText(label, f.x, tagY);
		ctx.fillStyle = "#F8FAFC";
		ctx.fillText(label, f.x, tagY);
		ctx.restore();
	}
}
function drawBlazeSprite(ctx, f, time, stride, idleBob, flash) {
	const mainCol = flash ? "#FFFFFF" : "#EF4444";
	const darkCol = flash ? "#F8FAFC" : "#7F1D1D";
	const flameCol = flash ? "#FFFFFF" : "#FB923C";
	const goldCol = flash ? "#FFFFFF" : "#FDE047";
	ctx.strokeStyle = "#0F172A";
	ctx.lineWidth = 2.8;
	const ribbonWave = Math.sin(time * 9) * 3;
	ctx.fillStyle = flameCol;
	ctx.beginPath();
	ctx.moveTo(-6, -54 + idleBob);
	ctx.lineTo(-24, -58 + ribbonWave);
	ctx.lineTo(-19, -49 + ribbonWave);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	const legF = f.grounded ? stride * 10 : 8;
	const legB = f.grounded ? -stride * 10 : -7;
	ctx.fillStyle = "#1E293B";
	ctx.beginPath();
	ctx.roundRect(-8 + legB, -22, 10, 22, 4);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(-2 + legF, -22, 10, 22, 4);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = mainCol;
	ctx.fillRect(-8 + legB, -6, 10, 6);
	ctx.fillRect(-2 + legF, -6, 10, 6);
	ctx.fillStyle = mainCol;
	ctx.beginPath();
	ctx.moveTo(-13, -47 + idleBob);
	ctx.lineTo(13, -47 + idleBob);
	ctx.lineTo(10, -21 + idleBob);
	ctx.lineTo(-10, -21 + idleBob);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = goldCol;
	ctx.fillRect(-10, -26 + idleBob, 20, 4.5);
	const headY = -54 + idleBob;
	ctx.fillStyle = darkCol;
	ctx.beginPath();
	ctx.arc(0, headY, 12.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	const flicker = Math.sin(time * 14) * 1.6;
	ctx.fillStyle = flameCol;
	ctx.beginPath();
	ctx.moveTo(-10, headY - 6);
	ctx.lineTo(-12, headY - 19 + flicker);
	ctx.lineTo(-4, headY - 13);
	ctx.lineTo(2, headY - 24 - flicker);
	ctx.lineTo(7, headY - 13);
	ctx.lineTo(13, headY - 18 + flicker * .5);
	ctx.lineTo(9, headY - 6);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = goldCol;
	ctx.beginPath();
	ctx.moveTo(2, headY - 2);
	ctx.lineTo(10, headY - 4);
	ctx.lineTo(9, headY + 1);
	ctx.lineTo(2, headY + 1);
	ctx.closePath();
	ctx.fill();
	if (!f.attack) {
		ctx.fillStyle = flameCol;
		ctx.beginPath();
		ctx.arc(14, -34 + idleBob - stride * 4, 6, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}
}
function drawGaleSprite(ctx, f, time, stride, idleBob, flash) {
	const mainCol = flash ? "#FFFFFF" : "#2563EB";
	const darkCol = flash ? "#F8FAFC" : "#1E3A8A";
	const windCol = flash ? "#FFFFFF" : "#67E8F9";
	ctx.strokeStyle = "#0F172A";
	ctx.lineWidth = 2.6;
	const waveA = Math.sin(time * 8) * 4;
	const waveB = Math.cos(time * 7) * 3;
	ctx.fillStyle = windCol;
	ctx.beginPath();
	ctx.moveTo(-5, -46 + idleBob);
	ctx.quadraticCurveTo(-22, -48 + waveA, -32, -34 + waveB);
	ctx.lineTo(-16, -37 + waveA * .5);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	const legF = f.grounded ? stride * 11 : 9;
	const legB = f.grounded ? -stride * 11 : -7;
	ctx.fillStyle = "#0F172A";
	ctx.beginPath();
	ctx.roundRect(-6 + legB, -23, 8, 23, 3.5);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(-1 + legF, -23, 8, 23, 3.5);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = mainCol;
	ctx.beginPath();
	ctx.moveTo(-11, -47 + idleBob);
	ctx.lineTo(11, -47 + idleBob);
	ctx.lineTo(13, -18 + idleBob);
	ctx.lineTo(-12, -20 + idleBob);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = windCol;
	ctx.beginPath();
	ctx.moveTo(-2, -45 + idleBob);
	ctx.lineTo(8, -45 + idleBob);
	ctx.lineTo(2, -24 + idleBob);
	ctx.lineTo(-5, -24 + idleBob);
	ctx.closePath();
	ctx.fill();
	const headY = -54 + idleBob;
	ctx.fillStyle = darkCol;
	ctx.beginPath();
	ctx.moveTo(-18, headY - 8);
	ctx.lineTo(4, headY - 14);
	ctx.lineTo(12, headY - 2);
	ctx.lineTo(9, headY + 9);
	ctx.lineTo(-10, headY + 9);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = windCol;
	ctx.fillRect(1, headY - 3, 9, 3.5);
	if (!f.attack) {
		ctx.save();
		ctx.translate(9, -32 + idleBob);
		ctx.rotate(-.45 + stride * .08);
		ctx.fillStyle = "#E2E8F0";
		ctx.beginPath();
		ctx.moveTo(0, -2);
		ctx.quadraticCurveTo(16, -5, 28, -11);
		ctx.quadraticCurveTo(18, -1, 0, 2);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
}
function drawTitanSprite(ctx, f, time, stride, idleBob, flash) {
	const mainCol = flash ? "#FFFFFF" : "#D97706";
	const armorCol = flash ? "#FFFFFF" : "#78350F";
	const stoneCol = flash ? "#FFFFFF" : "#475569";
	const goldCol = flash ? "#FFFFFF" : "#FEF08A";
	ctx.strokeStyle = "#0F172A";
	ctx.lineWidth = 3.2;
	const legF = f.grounded ? stride * 8 : 6;
	const legB = f.grounded ? -stride * 8 : -6;
	ctx.fillStyle = stoneCol;
	ctx.beginPath();
	ctx.roundRect(-13 + legB, -24, 14, 24, 4);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(-1 + legF, -24, 14, 24, 4);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = armorCol;
	ctx.beginPath();
	ctx.moveTo(-22, -56 + idleBob);
	ctx.lineTo(22, -56 + idleBob);
	ctx.lineTo(16, -22 + idleBob);
	ctx.lineTo(-16, -22 + idleBob);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = mainCol;
	ctx.beginPath();
	ctx.roundRect(-24, -58 + idleBob, 15, 16, 4);
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.roundRect(9, -58 + idleBob, 15, 16, 4);
	ctx.fill();
	ctx.stroke();
	const pulse = .8 + Math.sin(time * 4) * .2;
	ctx.fillStyle = goldCol;
	ctx.globalAlpha *= pulse;
	ctx.beginPath();
	ctx.moveTo(0, -49 + idleBob);
	ctx.lineTo(7, -39 + idleBob);
	ctx.lineTo(0, -29 + idleBob);
	ctx.lineTo(-7, -39 + idleBob);
	ctx.closePath();
	ctx.fill();
	ctx.globalAlpha = 1;
	const headY = -61 + idleBob;
	ctx.fillStyle = stoneCol;
	ctx.beginPath();
	ctx.roundRect(-12, headY - 11, 24, 20, 5);
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = goldCol;
	ctx.beginPath();
	ctx.moveTo(-9, headY - 10);
	ctx.lineTo(-15, headY - 21);
	ctx.lineTo(-3, headY - 11);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(5, headY - 10);
	ctx.lineTo(14, headY - 21);
	ctx.lineTo(10, headY - 10);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.fillStyle = "#0F172A";
	ctx.fillRect(-4, headY - 4, 14, 6);
	ctx.fillStyle = goldCol;
	ctx.fillRect(1, headY - 2.5, 7, 3);
	if (!f.attack) {
		ctx.fillStyle = mainCol;
		ctx.beginPath();
		ctx.roundRect(13, -40 + idleBob - stride * 3, 14, 15, 4);
		ctx.fill();
		ctx.stroke();
	}
}
function drawAttackEffects(ctx, f, time) {
	const atk = f.attack;
	if (!atk) return;
	const active = isAttackActive(atk);
	const windupRatio = Math.min(1, atk.elapsed / Math.max(.01, atk.spec.windup));
	ctx.save();
	if (!active && atk.elapsed < atk.spec.windup) {
		ctx.fillStyle = f.spec.accentColor;
		ctx.globalAlpha = .65 * windupRatio;
		ctx.beginPath();
		ctx.arc(8, -f.spec.height * .55, 10 + windupRatio * 9, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();
		return;
	}
	if (!active) {
		ctx.restore();
		return;
	}
	const cx = atk.spec.offsetX;
	const cy = atk.spec.offsetY;
	if (f.spec.id === "blaze") {
		if (atk.kind === "upSpecial") {
			ctx.fillStyle = "#FB923C";
			ctx.globalAlpha = .85;
			ctx.beginPath();
			ctx.moveTo(0, -68);
			ctx.lineTo(36, -34);
			ctx.lineTo(12, -16);
			ctx.lineTo(0, -28);
			ctx.lineTo(-28, -18);
			ctx.lineTo(-32, -40);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = "#FEF08A";
			ctx.beginPath();
			ctx.ellipse(cx, cy, 18, 28, 0, 0, Math.PI * 2);
			ctx.fill();
		} else if (atk.kind === "downSpecial") {
			ctx.fillStyle = "rgba(251, 146, 60, 0.5)";
			ctx.strokeStyle = "#FEF08A";
			ctx.lineWidth = 4;
			ctx.beginPath();
			ctx.ellipse(0, cy, atk.spec.rangeX * .5, atk.spec.rangeY * .45, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
		} else {
			ctx.fillStyle = "#FB923C";
			ctx.globalAlpha = .85;
			ctx.beginPath();
			ctx.ellipse(cx, cy, atk.spec.rangeX * .52, atk.spec.rangeY * .42, 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#FEF08A";
			ctx.beginPath();
			ctx.ellipse(cx + 4, cy, atk.spec.rangeX * .28, atk.spec.rangeY * .22, 0, 0, Math.PI * 2);
			ctx.fill();
		}
	} else if (f.spec.id === "gale") {
		if (atk.kind === "downSpecial") {
			ctx.strokeStyle = "#67E8F9";
			ctx.lineWidth = 4;
			ctx.fillStyle = "rgba(103, 232, 249, 0.24)";
			ctx.beginPath();
			ctx.arc(0, -34, atk.spec.rangeX * .48, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();
			ctx.strokeStyle = "#FFFFFF";
			ctx.lineWidth = 2.5;
			ctx.beginPath();
			ctx.arc(0, -34, atk.spec.rangeX * .32, time * 12, time * 12 + Math.PI * 1.3);
			ctx.stroke();
		} else if (atk.kind === "upSpecial") {
			ctx.strokeStyle = "#67E8F9";
			ctx.lineWidth = 3.5;
			for (let i = 0; i < 3; i++) {
				ctx.beginPath();
				ctx.ellipse(8, -14 - i * 20, 28 - i * 4, 8, 0, 0, Math.PI * 2);
				ctx.stroke();
			}
		} else {
			ctx.strokeStyle = "#67E8F9";
			ctx.lineWidth = 8;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.ellipse(cx - 10, cy, atk.spec.rangeX * .58, atk.spec.rangeY * .46, 0, -1.1, 1.1);
			ctx.stroke();
			ctx.strokeStyle = "#FFFFFF";
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.ellipse(cx - 8, cy, atk.spec.rangeX * .54, atk.spec.rangeY * .42, 0, -.95, .95);
			ctx.stroke();
		}
	} else if (atk.kind === "downSpecial") {
		ctx.fillStyle = "#94A3B8";
		ctx.strokeStyle = "#0F172A";
		ctx.lineWidth = 2.5;
		for (const dir of [-1, 1]) for (let i = 1; i <= 3; i++) {
			const sx = dir * (22 * i);
			const sh = 46 - i * 8;
			ctx.beginPath();
			ctx.moveTo(sx - 11, 0);
			ctx.lineTo(sx, -sh);
			ctx.lineTo(sx + 11, 0);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
	} else if (atk.kind === "sideSpecial") {
		ctx.fillStyle = "rgba(254, 240, 138, 0.42)";
		ctx.strokeStyle = "#FACC15";
		ctx.lineWidth = 4;
		ctx.beginPath();
		ctx.moveTo(10, -70);
		ctx.lineTo(42, -38);
		ctx.lineTo(10, -4);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else {
		ctx.fillStyle = "#F59E0B";
		ctx.strokeStyle = "#FEF08A";
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.roundRect(cx - atk.spec.rangeX * .45, cy - atk.spec.rangeY * .4, atk.spec.rangeX * .9, atk.spec.rangeY * .8, 8);
		ctx.fill();
		ctx.stroke();
	}
	ctx.restore();
}
function drawProjectile(ctx, p, time) {
	ctx.save();
	ctx.translate(p.x, p.y);
	if (p.visual === "fireball") {
		const dir = p.vx >= 0 ? 1 : -1;
		ctx.scale(dir, 1);
		ctx.fillStyle = "#EF4444";
		ctx.beginPath();
		ctx.moveTo(p.radius, 0);
		ctx.quadraticCurveTo(0, -p.radius * 1.1, -p.radius * 1.9, -3);
		ctx.lineTo(-p.radius * 1.3, 0);
		ctx.lineTo(-p.radius * 1.9, 5);
		ctx.quadraticCurveTo(0, p.radius * 1.1, p.radius, 0);
		ctx.closePath();
		ctx.fill();
		ctx.fillStyle = "#FEF08A";
		ctx.beginPath();
		ctx.arc(2, 0, p.radius * .52, 0, Math.PI * 2);
		ctx.fill();
	} else if (p.visual === "windblade") {
		ctx.rotate(time * 16 * (p.vx >= 0 ? 1 : -1));
		ctx.strokeStyle = "#67E8F9";
		ctx.lineWidth = 5;
		ctx.lineCap = "round";
		ctx.beginPath();
		ctx.arc(0, 0, p.radius, -1.3, 1.3);
		ctx.stroke();
		ctx.strokeStyle = "#FFFFFF";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.arc(0, 0, p.radius * .72, 1.8, 4.4);
		ctx.stroke();
	} else {
		ctx.rotate(time * 8 * (p.vx >= 0 ? 1 : -1));
		ctx.fillStyle = "#78350F";
		ctx.strokeStyle = "#0F172A";
		ctx.lineWidth = 3;
		ctx.beginPath();
		const sides = 7;
		for (let i = 0; i < sides; i++) {
			const a = i / sides * Math.PI * 2;
			const r = p.radius * (i % 2 === 0 ? 1.05 : .85);
			if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
			else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#F59E0B";
		ctx.beginPath();
		ctx.arc(-3, -3, p.radius * .3, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();
}
function drawParticles(ctx, pool) {
	for (let i = 0; i < pool.items.length; i++) {
		const p = pool.items[i];
		if (!p.active) continue;
		const t = p.life / p.maxLife;
		const alpha = Math.max(0, (1 - t) * p.alpha);
		ctx.save();
		ctx.globalAlpha = alpha;
		if (p.kind === "ring") {
			ctx.strokeStyle = p.color;
			ctx.lineWidth = Math.max(1, 3.5 * (1 - t));
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.stroke();
		} else if (p.kind === "star") {
			ctx.fillStyle = p.color;
			ctx.translate(p.x, p.y);
			ctx.rotate(t * 4);
			ctx.fillRect(-p.size * .5, -p.size * .5, p.size, p.size);
		} else {
			ctx.fillStyle = p.color;
			ctx.beginPath();
			ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}
}
function drawOffstageIndicator(ctx, width, height, fighter, state) {
	const sx = (fighter.x - state.camX) * state.camZoom + width * .5;
	const sy = (fighter.y - fighter.spec.height * .5 - state.camY) * state.camZoom + height * .52;
	const margin = 42;
	if (sx >= margin && sx <= width - margin && sy >= margin && sy <= height - margin) return;
	const bx = Math.max(margin, Math.min(width - margin, sx));
	const by = Math.max(margin, Math.min(height - margin, sy));
	const ang = Math.atan2(sy - by, sx - bx);
	ctx.save();
	ctx.translate(bx, by);
	ctx.save();
	ctx.rotate(ang);
	ctx.fillStyle = fighter.slot === 0 ? "#EF4444" : "#3B82F6";
	ctx.beginPath();
	ctx.moveTo(30, 0);
	ctx.lineTo(18, -8);
	ctx.lineTo(18, 8);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
	ctx.strokeStyle = fighter.slot === 0 ? "#EF4444" : "#3B82F6";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(0, 0, 21, 0, Math.PI * 2);
	ctx.fill();
	ctx.stroke();
	ctx.font = "800 13px \"Barlow Condensed\", sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#F8FAFC";
	ctx.fillText(fighter.slot === 0 ? "P1" : fighter.isCpu ? "CPU" : "P2", 0, 1);
	ctx.restore();
}
// src/game/engine.ts
var EMPTY_INPUT = {
	left: false,
	right: false,
	up: false,
	down: false,
	jumpJustPressed: false,
	jumpHeld: false,
	attackJustPressed: false,
	specialJustPressed: false,
	shieldHeld: false,
	dodgeJustPressed: false
};
var GameEngine = class {
	constructor(container, initialConfig, callbacks) {
		this.audio = new SoundSynth();
		this.particles = new ParticlePool();
		this.screenState = "title";
		this.projectiles = [];
		this.blastBeams = [];
		this.cpuBrain = createCpuBrain();
		this.keysHeld = /* @__PURE__ */ new Set();
		this.keysJustPressed = /* @__PURE__ */ new Set();
		this.hotkeys = createDefaultHotkeys();
		this.rafId = 0;
		this.paceTimerId = 0;
		this.destroyed = false;
		this.lastTime = 0;
		this.worldTime = 0;
		this.matchElapsed = 0;
		this.countdownTimer = 0;
		this.lastCountdownInt = 4;
		this.hitstopTimer = 0;
		this.trauma = 0;
		this.koBannerTimer = 0;
		this.koBannerText = null;
		this.matchEndDelayTimer = -1;
		this.winnerSlot = null;
		this.nextProjId = 1;
		this.lastHudKey = "";
		this.remoteInputTracker = new NetInputTracker();
		this.pendingNetEvents = [];
		this.nextNetEventSeq = 1;
		this.netStateSeq = 0;
		this.netSyncAccum = 0;
		this.lastRemoteStateSeq = 0;
		this.lastRemoteEventSeq = 0;
		this.guestJumpSeq = 0;
		this.guestAttackSeq = 0;
		this.guestSpecialSeq = 0;
		this.guestDodgeSeq = 0;
		this.lastSentInputKey = "";
		this.guestInputAccum = 0;
		this.camX = 0;
		this.camY = 0;
		this.camZoom = 1;
		this.viewportW = 1280;
		this.viewportH = 720;
		this.resizeObserver = null;
		this.handleKeyDown = (e) => {
			const code = e.code;
			if (this.screenState === "playing" && (code === "Space" || code === "ArrowUp" || code === "ArrowDown" || code === "ArrowLeft" || code === "ArrowRight" || isHotkeyBound(this.hotkeys, this.config.mode, code))) e.preventDefault();
			if (e.repeat) return;
			try {
				this.audio.unlock();
			} catch {}
			if (this.screenState === "playing") {
				const boundToGame = isHotkeyBound(this.hotkeys, this.config.mode, code);
				if (code === "Escape" || e.key === "Escape" || !boundToGame && (code === "KeyP" || e.key === "p" || e.key === "P")) {
					e.preventDefault();
					this.callbacks.onScreenStateRequest?.("paused");
					return;
				}
				if (!boundToGame && code === "KeyM") {
					this.audio.setMuted(!this.audio.isMuted());
					return;
				}
			}
			if (!this.keysHeld.has(code)) this.keysJustPressed.add(code);
			this.keysHeld.add(code);
		};
		this.handleKeyUp = (e) => {
			this.keysHeld.delete(e.code);
		};
		this.handleBlur = () => {
			this.clearInputs();
		};
		this.handleVisibility = () => {
			if (document.hidden) this.clearInputs();
		};
		this.handlePointerDown = () => {
			this.audio.unlock();
		};
		this.loop = (now) => {
			if (this.destroyed) return;
			if (this.isPausedFreeze()) return;
			const frameStart = performance.now();
			const rawDt = (now - this.lastTime) / 1e3;
			this.lastTime = now;
			const dt = Math.min(Math.max(rawDt, .001), .05);
			this.worldTime += dt;
			if (this.screenState === "title") this.stepTitlePreview(dt);
			else if (this.screenState === "playing" || this.screenState === "paused" && this.config.mode === "online") this.stepPlaying(dt);
			this.keysJustPressed.clear();
			this.renderFrame();
			const renderMs = performance.now() - frameStart;
			this.scheduleNextFrame(renderMs);
		};
		this.callbacks = callbacks;
		this.config = { ...initialConfig };
		this.stage = STAGES[this.config.stage];
		this.stageRuntime = createStageRuntime(this.stage);
		this.canvas = document.createElement("canvas");
		this.canvas.className = "block w-full h-full outline-none";
		this.canvas.tabIndex = 0;
		this.canvas.setAttribute("data-testid", "game-canvas");
		container.appendChild(this.canvas);
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Could not initialize 2D context");
		this.ctx = ctx;
		this.fighters = this.spawnPair();
		this.setupResize(container);
		this.bindEvents();
		this.emitHudSnapshot();
		this.lastTime = performance.now();
		this.loop(this.lastTime);
	}
	spawnPair() {
		return [createFighterRuntime(0, FIGHTERS[this.config.p1Fighter], false, this.stage, this.config.stocks), createFighterRuntime(1, FIGHTERS[this.config.p2Fighter], this.config.mode === "cpu", this.stage, this.config.stocks)];
	}
	setupResize(container) {
		const updateSize = () => {
			const rect = container.getBoundingClientRect();
			const dpr = Math.min(window.devicePixelRatio || 1, 2);
			this.viewportW = Math.max(320, rect.width);
			this.viewportH = Math.max(240, rect.height);
			this.canvas.width = Math.round(this.viewportW * dpr);
			this.canvas.height = Math.round(this.viewportH * dpr);
			this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		updateSize();
		this.resizeObserver = new ResizeObserver(updateSize);
		this.resizeObserver.observe(container);
	}
	bindEvents() {
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
		window.addEventListener("pointerdown", this.handlePointerDown);
		window.addEventListener("blur", this.handleBlur);
		document.addEventListener("visibilitychange", this.handleVisibility);
	}
	destroy() {
		this.destroyed = true;
		cancelAnimationFrame(this.rafId);
		if (this.paceTimerId) window.clearTimeout(this.paceTimerId);
		this.resizeObserver?.disconnect();
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		window.removeEventListener("pointerdown", this.handlePointerDown);
		window.removeEventListener("blur", this.handleBlur);
		document.removeEventListener("visibilitychange", this.handleVisibility);
		this.canvas.remove();
	}
	clearInputs() {
		this.keysHeld.clear();
		this.keysJustPressed.clear();
	}
	setHotkeys(next) {
		this.hotkeys = cloneHotkeySettings(next);
	}
	isPausedFreeze() {
		return this.screenState === "paused" && this.config.mode !== "online";
	}
	setScreenState(next) {
		const wasFrozen = this.screenState === "paused" && this.config.mode !== "online";
		this.screenState = next;
		if (next === "playing") {
			this.clearInputs();
			this.canvas.focus();
			if (wasFrozen) {
				this.lastTime = performance.now();
				this.scheduleNextFrame(0);
			}
		} else {
			this.clearInputs();
			if (next === "paused" && this.config.mode !== "online") this.renderFrame();
			else if (wasFrozen) {
				this.lastTime = performance.now();
				this.scheduleNextFrame(0);
			}
		}
	}
	updatePreviewConfig(config) {
		this.config = { ...config };
		this.stage = STAGES[this.config.stage];
		this.stageRuntime = createStageRuntime(this.stage);
		if (this.screenState === "title") {
			this.fighters = this.spawnPair();
			this.projectiles = [];
			this.particles.clear();
			this.emitHudSnapshot();
		}
	}
	startNewMatch(config, skipCountdown = false) {
		this.config = { ...config };
		this.stage = STAGES[this.config.stage];
		this.stageRuntime = createStageRuntime(this.stage);
		this.fighters = this.spawnPair();
		this.projectiles = [];
		this.blastBeams = [];
		this.particles.clear();
		this.cpuBrain = createCpuBrain();
		this.matchElapsed = 0;
		this.countdownTimer = skipCountdown ? 0 : 1.5;
		this.lastCountdownInt = skipCountdown ? 0 : 4;
		this.hitstopTimer = 0;
		this.trauma = 0;
		this.koBannerTimer = 0;
		this.koBannerText = null;
		this.matchEndDelayTimer = -1;
		this.winnerSlot = null;
		this.remoteInputTracker.reset();
		this.pendingNetEvents = [];
		this.nextNetEventSeq = 1;
		this.netStateSeq = 0;
		this.netSyncAccum = 0;
		this.lastRemoteStateSeq = 0;
		this.lastRemoteEventSeq = 0;
		this.guestJumpSeq = 0;
		this.guestAttackSeq = 0;
		this.guestSpecialSeq = 0;
		this.guestDodgeSeq = 0;
		this.lastSentInputKey = "";
		this.guestInputAccum = 0;
		const wasFrozen = this.screenState === "paused" && this.config.mode !== "online";
		this.clearInputs();
		this.screenState = "playing";
		this.canvas.focus();
		this.lastHudKey = "";
		this.emitHudSnapshot();
		if (wasFrozen) {
			this.lastTime = performance.now();
			this.scheduleNextFrame(0);
		}
	}
	pushRemoteInput(payload) {
		this.remoteInputTracker.pushRemote(payload);
	}
	applyRemoteState(payload) {
		if (this.config.mode !== "online" || this.config.onlineRole !== "guest") return;
		if (payload.seq <= this.lastRemoteStateSeq) return;
		this.lastRemoteStateSeq = payload.seq;
		const prevCountdown = this.countdownTimer;
		this.matchElapsed = payload.t;
		this.countdownTimer = payload.cd;
		if (this.countdownTimer > 0) {
			const sec = Math.ceil(this.countdownTimer * 2);
			if (sec !== this.lastCountdownInt && sec > 0) {
				this.lastCountdownInt = sec;
				this.audio.playCountdown(false);
			}
		} else if (prevCountdown > 0 && this.countdownTimer === 0) this.audio.playCountdown(true);
		if (payload.banner && payload.banner !== this.koBannerText) this.koBannerTimer = .85;
		else if (!payload.banner && this.koBannerTimer <= 0) this.koBannerText = null;
		if (payload.banner) this.koBannerText = payload.banner;
		this.winnerSlot = payload.win;
		applyFighterState(this.fighters[0], payload.f[0]);
		applyFighterState(this.fighters[1], payload.f[1]);
		this.projectiles = deserializeProjectiles(payload.p);
		stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: this.countdownTimer <= 0 });
		for (const ev of payload.ev) {
			if (ev.seq <= this.lastRemoteEventSeq) continue;
			this.lastRemoteEventSeq = ev.seq;
			this.replayNetEvent(ev);
		}
		this.emitHudSnapshot();
	}
	applyRemoteMatchEnd(result) {
		this.winnerSlot = result.winnerSlot;
		this.audio.playVictory();
		this.emitHudSnapshot();
		this.callbacks.onMatchEnd(result);
	}
	queueNetEvent(kind, x, y, extra) {
		if (this.config.mode !== "online" || this.config.onlineRole !== "host") return;
		this.pendingNetEvents.push({
			seq: this.nextNetEventSeq++,
			kind,
			x: Math.round(x * 10) / 10,
			y: Math.round(y * 10) / 10,
			...extra
		});
	}
	replayNetEvent(ev) {
		switch (ev.kind) {
			case "jump":
				this.audio.playJump(false);
				this.particles.spawnDust(ev.x, ev.y, -(ev.dir ?? 1), 4);
				break;
			case "doubleJump":
				this.audio.playJump(true);
				this.particles.spawnRing(ev.x, ev.y, ev.color ?? "#93C5FD", 8, 130);
				break;
			case "land":
				this.audio.playLand();
				this.particles.spawnDust(ev.x, ev.y, 0, 5);
				break;
			case "dodge":
				this.particles.spawnRing(ev.x, ev.y, "#E2E8F0", 10, 140);
				break;
			case "ledgeGrab":
				this.audio.playLedgeGrab();
				this.particles.spawnRing(ev.x, ev.y, ev.color ?? "#FBBF24", 9, 130);
				this.particles.spawnBurst(ev.x, ev.y, 6, 180, ev.color ?? "#FBBF24", "spark");
				break;
			case "swing":
				this.audio.playSwing(Boolean(ev.heavy));
				break;
			case "hit":
				this.audio.playHit(Boolean(ev.heavy), ev.dir ?? 20);
				this.particles.spawnBurst(ev.x, ev.y, ev.heavy ? 18 : 9, ev.heavy ? 480 : 280, ev.heavy ? "#FDE047" : "#F8FAFC", ev.heavy ? "star" : "spark");
				this.particles.spawnRing(ev.x, ev.y, ev.heavy ? "#FB923C" : "#F8FAFC", 10, ev.heavy ? 260 : 140);
				this.trauma = Math.min(1, this.trauma + (ev.heavy ? .45 : .2));
				break;
			case "shieldBlock":
				this.audio.playShieldBlock(Boolean(ev.flag));
				this.particles.spawnRing(ev.x, ev.y, ev.flag ? "#FACC15" : "#93C5FD", 12, 180);
				if (ev.flag) this.trauma = Math.min(1, this.trauma + .55);
				break;
			case "ko":
				this.blastBeams.push({
					x: ev.x,
					y: ev.y,
					angle: ev.angle ?? 0,
					color: ev.color ?? "#F8FAFC",
					life: 0,
					maxLife: .55
				});
				this.particles.spawnBurst(ev.x, ev.y, 26, 620, ev.color ?? "#FBBF24", "star");
				this.audio.playBlastKo();
				this.trauma = .85;
				break;
			case "hazardTelegraph":
				this.audio.playHazardTelegraph();
				break;
			case "hazardErupt": {
				const isWind = Boolean(ev.flag);
				this.audio.playHazardErupt(isWind);
				this.particles.spawnBurst(ev.x, ev.y, 14, 360, isWind ? "#67E8F9" : "#FEF08A", isWind ? "spark" : "star");
				if (!isWind) this.trauma = Math.min(1, this.trauma + .28);
				break;
			}
		}
	}
	readPlayerInput(slot) {
		if (this.screenState === "paused") return { ...EMPTY_INPUT };
		if (this.config.mode === "cpu" || this.config.mode === "online") return readInputFromBindings(this.keysHeld, this.keysJustPressed, this.hotkeys.singlePrimary, this.hotkeys.singleSecondary, this.hotkeys.singleTapJump);
		if (slot === 0) return readInputFromBindings(this.keysHeld, this.keysJustPressed, this.hotkeys.localP1, void 0, this.hotkeys.localP1TapJump);
		return readInputFromBindings(this.keysHeld, this.keysJustPressed, this.hotkeys.localP2, void 0, this.hotkeys.localP2TapJump);
	}
	scheduleNextFrame(renderMs) {
		if (this.destroyed) return;
		if (this.isPausedFreeze()) return;
		if (renderMs > 10) this.paceTimerId = window.setTimeout(() => {
			if (!this.destroyed && !this.isPausedFreeze()) this.rafId = requestAnimationFrame(this.loop);
		}, 32);
		else this.rafId = requestAnimationFrame(this.loop);
	}
	stepTitlePreview(dt) {
		stepStageRuntime(this.stageRuntime, this.worldTime, { hazardsEnabled: false });
		this.camX = Math.sin(this.worldTime * .35) * 70;
		this.camY = -12 + Math.cos(this.worldTime * .25) * 14;
		const baseScale = Math.min(this.viewportW / 1180, this.viewportH / 680);
		this.camZoom = baseScale * 1.02;
		this.particles.update(dt);
	}
	stepGuestPlaying(dt) {
		this.trauma = Math.max(0, this.trauma - 1.9 * dt);
		this.particles.update(dt);
		for (let i = this.blastBeams.length - 1; i >= 0; i--) {
			this.blastBeams[i].life += dt;
			if (this.blastBeams[i].life >= this.blastBeams[i].maxLife) this.blastBeams.splice(i, 1);
		}
		if (this.koBannerTimer > 0) {
			this.koBannerTimer = Math.max(0, this.koBannerTimer - dt);
			if (this.koBannerTimer === 0) this.koBannerText = null;
		}
		const input = this.readPlayerInput(1);
		if (input.jumpJustPressed) this.guestJumpSeq += 1;
		if (input.attackJustPressed) this.guestAttackSeq += 1;
		if (input.specialJustPressed) this.guestSpecialSeq += 1;
		if (input.dodgeJustPressed) this.guestDodgeSeq += 1;
		const payload = {
			left: input.left,
			right: input.right,
			up: input.up,
			down: input.down,
			jumpHeld: input.jumpHeld,
			shieldHeld: input.shieldHeld,
			jumpSeq: this.guestJumpSeq,
			attackSeq: this.guestAttackSeq,
			specialSeq: this.guestSpecialSeq,
			dodgeSeq: this.guestDodgeSeq
		};
		const inputKey = `${payload.left ? 1 : 0}${payload.right ? 1 : 0}${payload.up ? 1 : 0}${payload.down ? 1 : 0}${payload.jumpHeld ? 1 : 0}${payload.shieldHeld ? 1 : 0}:${payload.jumpSeq}:${payload.attackSeq}:${payload.specialSeq}:${payload.dodgeSeq}`;
		this.guestInputAccum += dt;
		if (inputKey !== this.lastSentInputKey || this.guestInputAccum >= .033) {
			this.lastSentInputKey = inputKey;
			this.guestInputAccum = 0;
			this.callbacks.onSendNetMessage?.({
				type: "input",
				payload
			});
		}
		if (this.countdownTimer <= 0) {
			this.matchElapsed += dt;
			stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: true });
			for (const f of this.fighters) {
				if (f.stocks <= 0 || f.respawnTimer > 0 || f.ledgeGrab) continue;
				f.x += f.vx * dt * .55;
				f.y += f.vy * dt * .55;
			}
			for (const p of this.projectiles) {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
			}
		} else stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: false });
		this.updateCamera(dt);
		this.emitHudSnapshot();
	}
	broadcastHostState(force = false) {
		if (this.config.mode !== "online" || this.config.onlineRole !== "host") return;
		if (!force && this.netSyncAccum < 1 / 30 && this.pendingNetEvents.length === 0) return;
		this.netSyncAccum = 0;
		const ev = this.pendingNetEvents;
		this.pendingNetEvents = [];
		this.callbacks.onSendNetMessage?.({
			type: "state",
			payload: {
				seq: ++this.netStateSeq,
				t: Math.round(this.matchElapsed * 1e3) / 1e3,
				cd: Math.round(this.countdownTimer * 1e3) / 1e3,
				banner: this.koBannerText,
				win: this.winnerSlot,
				f: [serializeFighterState(this.fighters[0]), serializeFighterState(this.fighters[1])],
				p: serializeProjectiles(this.projectiles),
				ev
			}
		});
	}
	stepPlaying(dt) {
		if (this.config.mode === "online" && this.config.onlineRole === "guest") {
			this.stepGuestPlaying(dt);
			return;
		}
		this.trauma = Math.max(0, this.trauma - 1.9 * dt);
		this.particles.update(dt);
		for (let i = this.blastBeams.length - 1; i >= 0; i--) {
			this.blastBeams[i].life += dt;
			if (this.blastBeams[i].life >= this.blastBeams[i].maxLife) this.blastBeams.splice(i, 1);
		}
		if (this.koBannerTimer > 0) {
			this.koBannerTimer = Math.max(0, this.koBannerTimer - dt);
			if (this.koBannerTimer === 0) this.koBannerText = null;
		}
		this.netSyncAccum += dt;
		if (this.countdownTimer > 0) {
			this.countdownTimer = Math.max(0, this.countdownTimer - dt);
			const sec = Math.ceil(this.countdownTimer * 2);
			if (sec !== this.lastCountdownInt && sec > 0) {
				this.lastCountdownInt = sec;
				this.audio.playCountdown(false);
			}
			if (this.countdownTimer === 0) {
				this.audio.playCountdown(true);
				this.koBannerText = "FIGHT!";
				this.koBannerTimer = .75;
			}
			this.updateCamera(dt);
			this.emitHudSnapshot();
			this.broadcastHostState(this.countdownTimer === 0);
			return;
		}
		if (this.matchEndDelayTimer > 0) {
			this.matchEndDelayTimer = Math.max(0, this.matchEndDelayTimer - dt);
			if (this.matchEndDelayTimer === 0 && this.winnerSlot !== null) {
				this.audio.playVictory();
				this.finalizeMatch(this.winnerSlot);
				return;
			}
		}
		if (this.hitstopTimer > 0) {
			this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
			this.updateCamera(dt);
			this.broadcastHostState();
			return;
		}
		this.matchElapsed += dt;
		const stageEvents = stepStageRuntime(this.stageRuntime, this.matchElapsed, { hazardsEnabled: true });
		if (stageEvents.telegraphStarted) {
			this.audio.playHazardTelegraph();
			this.queueNetEvent("hazardTelegraph", 0, 0);
		}
		if (stageEvents.erupted && this.stageRuntime.hazard) {
			const haz = this.stageRuntime.hazard;
			const isWind = haz.spec.kind === "storm_updraft";
			const eruptY = isWind ? 80 : haz.spec.yBottom - 16;
			this.audio.playHazardErupt(isWind);
			this.particles.spawnBurst(haz.x, eruptY, 14, 360, isWind ? "#67E8F9" : "#FEF08A", isWind ? "spark" : "star");
			if (!isWind) this.trauma = Math.min(1, this.trauma + .28);
			this.queueNetEvent("hazardErupt", haz.x, eruptY, { flag: isWind });
		}
		for (const collapsed of stageEvents.collapsedPlatforms) this.particles.spawnDust(collapsed.baseX + collapsed.baseWidth * .5, collapsed.baseY, 0, 8);
		for (const reformed of stageEvents.reformedPlatforms) this.particles.spawnRing(reformed.baseX + reformed.baseWidth * .5, reformed.baseY + reformed.height * .5, "#94A3B8", 12, 140);
		const inputs = [this.readPlayerInput(0), this.config.mode === "cpu" ? computeCpuInput(this.fighters[1], this.fighters[0], this.stage, this.config.difficulty, this.cpuBrain, dt, this.stageRuntime.platforms, this.stageRuntime.hazard) : this.config.mode === "online" ? this.remoteInputTracker.consumeFrameInput() : this.readPlayerInput(1)];
		for (let i = 0; i < 2; i++) {
			const f = this.fighters[i];
			if (f.stocks <= 0) continue;
			const ev = stepFighterPhysics(f, inputs[i], this.stage, dt, this.stageRuntime.platforms);
			if (ev.jumped) {
				this.audio.playJump(false);
				this.particles.spawnDust(f.x, f.y, -f.facing, 4);
				this.queueNetEvent("jump", f.x, f.y, { dir: f.facing });
			}
			if (ev.doubleJumped) {
				this.audio.playJump(true);
				this.particles.spawnRing(f.x, f.y, f.spec.accentColor, 8, 130);
				this.queueNetEvent("doubleJump", f.x, f.y, { color: f.spec.accentColor });
			}
			if (ev.landed) {
				this.audio.playLand();
				this.particles.spawnDust(f.x, f.y, 0, 5);
				this.queueNetEvent("land", f.x, f.y);
			}
			if (ev.dodged) {
				const dy = f.y - f.spec.height * .5;
				this.particles.spawnRing(f.x, dy, "#E2E8F0", 10, 140);
				this.queueNetEvent("dodge", f.x, dy);
			}
			if (ev.grabbedLedge) {
				this.audio.playLedgeGrab();
				this.particles.spawnRing(ev.grabbedLedge.x, ev.grabbedLedge.y, f.spec.accentColor, 9, 130);
				this.particles.spawnBurst(ev.grabbedLedge.x, ev.grabbedLedge.y, 6, 180, f.spec.accentColor, "spark");
				this.queueNetEvent("ledgeGrab", ev.grabbedLedge.x, ev.grabbedLedge.y, { color: f.spec.accentColor });
			}
			if (ev.startedAttack) {
				const heavy = ev.startedAttack.includes("Special") || ev.startedAttack === "sideTilt";
				this.audio.playSwing(heavy);
				this.queueNetEvent("swing", f.x, f.y, { heavy });
			}
			if (ev.spawnedProjectile && f.attack) {
				const spec = f.attack.spec;
				this.projectiles.push({
					id: this.nextProjId++,
					ownerSlot: f.slot,
					visual: spec.projectileVisual ?? "fireball",
					x: f.x + spec.offsetX * f.facing,
					y: f.y + spec.offsetY,
					vx: (spec.projectileSpeed ?? 520) * f.facing,
					vy: spec.projectileVy ?? 0,
					gravity: spec.projectileGravity ?? 0,
					radius: spec.projectileRadius ?? 13,
					damage: spec.damage,
					baseKnockback: spec.baseKnockback,
					knockbackGrowth: spec.knockbackGrowth,
					angleDeg: spec.angleDeg,
					color: f.spec.accentColor,
					life: 0,
					maxLife: 1.6
				});
			}
			if (f.attack && isAttackActive(f.attack) && Math.random() < .55) {
				const kind = f.attack.kind;
				if (kind === "upSpecial" || kind === "sideSpecial" || kind === "downSpecial") {
					const sparkColor = f.spec.id === "blaze" ? "#FB923C" : f.spec.id === "gale" ? "#67E8F9" : "#FACC15";
					this.particles.spawn(f.spec.id === "titan" && kind === "sideSpecial" ? "dust" : "spark", f.x + (Math.random() - .5) * 26, f.y - f.spec.height * .45 + (Math.random() - .5) * 22, -f.vx * .25 + (Math.random() - .5) * 80, -40 + (Math.random() - .5) * 70, f.spec.id === "titan" ? 6 : 4.5, -2, .22, sparkColor, .9);
				}
			}
			if (f.hitstunTimer > 0 && f.smokeTimer <= 0 && f.damage > 75) {
				f.smokeTimer = .045;
				this.particles.spawn("smoke", f.x, f.y - f.spec.height * .5, (Math.random() - .5) * 35, (Math.random() - .5) * 35, 9, 12, .34, f.damage > 120 ? "#94A3B8" : "#CBD5E1", .75);
			}
		}
		this.resolveMeleePair(this.fighters[0], this.fighters[1]);
		this.resolveMeleePair(this.fighters[1], this.fighters[0]);
		for (const f of this.fighters) {
			if (f.stocks <= 0) continue;
			if (tryReflectProjectiles(f, this.projectiles) > 0) {
				const ry = f.y - f.spec.height * .5;
				this.audio.playShieldBlock(false);
				this.particles.spawnRing(f.x, ry, "#67E8F9", 16, 220);
				this.queueNetEvent("shieldBlock", f.x, ry, { flag: false });
			}
		}
		for (let i = this.projectiles.length - 1; i >= 0; i--) {
			const p = this.projectiles[i];
			p.life += dt;
			p.vy += p.gravity * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			if (p.visual === "fireball" && Math.random() < .45) this.particles.spawn("spark", p.x, p.y, -p.vx * .15, -25, 4, -4, .18, "#FB923C", .85);
			const target = this.fighters[p.ownerSlot === 0 ? 1 : 0];
			const attacker = this.fighters[p.ownerSlot];
			const res = target.stocks > 0 ? checkProjectileHit(p, target, attacker) : null;
			if (res && res.connected) {
				this.onHitConnected(res, p.visual === "boulder");
				this.projectiles.splice(i, 1);
				continue;
			}
			if (p.life >= p.maxLife || Math.abs(p.x) > 1e3 || p.y > this.stage.blastZones.bottom) this.projectiles.splice(i, 1);
		}
		const hazardHits = applyStageHazardEffects(this.stageRuntime, this.fighters, dt);
		for (const hRes of hazardHits) this.onHitConnected(hRes, true);
		for (const f of this.fighters) {
			if (f.stocks <= 0) continue;
			const side = checkBlastZone(f, this.stage);
			if (side) this.handleBlastKo(f, side);
		}
		this.updateCamera(dt);
		this.emitHudSnapshot();
		this.broadcastHostState();
	}
	resolveMeleePair(attacker, defender) {
		if (attacker.stocks <= 0 || defender.stocks <= 0 || !attacker.attack || attacker.attack.hasHit || attacker.attack.spec.projectileSpeed) return;
		if (!isAttackActive(attacker.attack)) return;
		if (!boxesOverlap(getAttackHitbox(attacker, attacker.attack.spec), getHurtbox(defender))) return;
		attacker.attack.hasHit = true;
		const spec = attacker.attack.spec;
		const res = applyHit(attacker, attacker.slot, attacker.facing, defender, spec.damage, spec.baseKnockback, spec.knockbackGrowth, spec.angleDeg, spec.hitstop);
		if (res.connected) {
			const heavy = spec.damage >= 12 || defender.damage > 95;
			this.onHitConnected(res, heavy);
		}
	}
	onHitConnected(res, heavy) {
		if (res.blocked) {
			this.audio.playShieldBlock(res.shieldBroken);
			this.particles.spawnRing(res.impactX, res.impactY, res.shieldBroken ? "#FACC15" : "#93C5FD", 12, 180);
			this.hitstopTimer = Math.max(this.hitstopTimer, res.hitstop);
			if (res.shieldBroken) {
				this.trauma = Math.min(1, this.trauma + .55);
				this.koBannerText = "SHIELD BREAK!";
				this.koBannerTimer = 1;
			}
			this.queueNetEvent("shieldBlock", res.impactX, res.impactY, { flag: res.shieldBroken });
		} else {
			const pitchMag = Math.round(res.knockbackMagnitude * .15);
			this.audio.playHit(heavy, pitchMag);
			this.particles.spawnBurst(res.impactX, res.impactY, heavy ? 18 : 9, heavy ? 480 : 280, heavy ? "#FDE047" : "#F8FAFC", heavy ? "star" : "spark");
			this.particles.spawnRing(res.impactX, res.impactY, heavy ? "#FB923C" : "#F8FAFC", 10, heavy ? 260 : 140);
			this.hitstopTimer = Math.max(this.hitstopTimer, res.hitstop);
			this.trauma = Math.min(1, this.trauma + (heavy ? .45 : .2));
			this.queueNetEvent("hit", res.impactX, res.impactY, {
				heavy,
				dir: pitchMag
			});
		}
		this.emitHudSnapshot();
	}
	handleBlastKo(victim, side) {
		victim.stocks = Math.max(0, victim.stocks - 1);
		victim.deaths += 1;
		const other = this.fighters[victim.slot === 0 ? 1 : 0];
		if (victim.lastHitBySlot === other.slot || victim.lastHitBySlot === null) other.kos += 1;
		const angle = side === "left" ? 0 : side === "right" ? Math.PI : side === "top" ? Math.PI * .5 : -Math.PI * .5;
		const bx = Math.max(this.stage.blastZones.left, Math.min(this.stage.blastZones.right, victim.x));
		const by = Math.max(this.stage.blastZones.top, Math.min(this.stage.blastZones.bottom, victim.y));
		this.blastBeams.push({
			x: bx,
			y: by,
			angle,
			color: victim.spec.primaryColor,
			life: 0,
			maxLife: .55
		});
		this.particles.spawnBurst(bx, by, 26, 620, victim.spec.accentColor, "star");
		this.audio.playBlastKo();
		this.trauma = .85;
		this.hitstopTimer = .08;
		this.queueNetEvent("ko", bx, by, {
			angle: Math.round(angle * 100) / 100,
			color: victim.spec.accentColor
		});
		if (victim.stocks > 0) {
			respawnFighter(victim, this.stage);
			this.koBannerText = "KO!";
			this.koBannerTimer = .85;
		} else {
			this.winnerSlot = other.slot;
			this.koBannerText = "GAME!";
			this.koBannerTimer = 1.2;
			this.matchEndDelayTimer = .65;
		}
		this.emitHudSnapshot();
		this.broadcastHostState(true);
	}
	finalizeMatch(winnerSlot) {
		const f1 = this.fighters[0];
		const f2 = this.fighters[1];
		const winner = this.fighters[winnerSlot];
		const loser = this.fighters[winnerSlot === 0 ? 1 : 0];
		const result = {
			winnerSlot,
			winnerName: winner.slot === 0 ? `P1 · ${winner.spec.name}` : `${winner.isCpu ? "CPU" : "P2"} · ${winner.spec.name}`,
			loserName: loser.slot === 0 ? `P1 · ${loser.spec.name}` : `${loser.isCpu ? "CPU" : "P2"} · ${loser.spec.name}`,
			mode: this.config.mode,
			stageName: this.stage.name,
			durationSeconds: Math.round(this.matchElapsed),
			p1Stats: {
				name: f1.spec.name,
				fighterId: f1.spec.id,
				kos: f1.kos,
				stocksLeft: f1.stocks,
				damageDealt: Math.round(f1.damageDealt),
				peakDamage: Math.round(f1.peakDamage)
			},
			p2Stats: {
				name: f2.spec.name,
				fighterId: f2.spec.id,
				kos: f2.kos,
				stocksLeft: f2.stocks,
				damageDealt: Math.round(f2.damageDealt),
				peakDamage: Math.round(f2.peakDamage)
			}
		};
		this.broadcastHostState(true);
		if (this.config.mode === "online" && this.config.onlineRole === "host") this.callbacks.onSendNetMessage?.({
			type: "match_end",
			result
		});
		this.emitHudSnapshot();
		this.callbacks.onMatchEnd(result);
	}
	updateCamera(dt) {
		const target = computeDynamicCamera(this.fighters[0], this.fighters[1], this.stage, this.viewportW, this.viewportH);
		const rate = 1 - Math.exp(-7.5 * dt);
		this.camX += (target.x - this.camX) * rate;
		this.camY += (target.y - this.camY) * rate;
		this.camZoom += (target.zoom - this.camZoom) * rate;
	}
	renderFrame() {
		const shakeMag = this.trauma * this.trauma * 18;
		const shakeX = (Math.random() * 2 - 1) * shakeMag;
		const shakeY = (Math.random() * 2 - 1) * shakeMag;
		renderArena(this.ctx, this.viewportW, this.viewportH, {
			stage: this.stage,
			platforms: this.stageRuntime.platforms,
			activeHazard: this.stageRuntime.hazard,
			fighters: this.fighters,
			projectiles: this.projectiles,
			particles: this.particles,
			blastBeams: this.blastBeams,
			camX: this.camX,
			camY: this.camY,
			camZoom: this.camZoom,
			shakeX,
			shakeY,
			worldTime: this.worldTime,
			isTitleTour: this.screenState === "title"
		});
	}
	toHudFighter(f) {
		const isLocalControl = this.config.mode === "online" ? f.slot === (this.config.onlineRole === "guest" ? 1 : 0) : void 0;
		return {
			slot: f.slot,
			id: f.spec.id,
			name: f.spec.name,
			isCpu: f.isCpu,
			isLocalControl,
			damage: Math.round(f.damage),
			stocks: f.stocks,
			maxStocks: this.config.stocks,
			shieldRatio: f.shieldHealth / 100,
			hitFlash: f.hitFlashTimer > 0,
			respawning: f.respawnTimer > 0,
			primaryColor: f.spec.primaryColor,
			accentColor: f.spec.accentColor
		};
	}
	emitHudSnapshot() {
		let countdownText = null;
		if (this.countdownTimer > 0) {
			const sec = Math.ceil(this.countdownTimer * 2);
			countdownText = sec > 0 ? String(sec) : null;
		}
		const f1 = this.toHudFighter(this.fighters[0]);
		const f2 = this.toHudFighter(this.fighters[1]);
		const elapsedSeconds = Math.floor(this.matchElapsed);
		const s1 = Math.round(f1.shieldRatio * 20);
		const s2 = Math.round(f2.shieldRatio * 20);
		const hudKey = `${f1.id}:${f1.damage}:${f1.stocks}:${s1}:${f1.isLocalControl ?? ""}|${f2.id}:${f2.damage}:${f2.stocks}:${s2}:${f2.isLocalControl ?? ""}|${elapsedSeconds}|${countdownText ?? ""}|${this.koBannerText ?? ""}|${this.winnerSlot ?? ""}`;
		if (hudKey === this.lastHudKey) return;
		this.lastHudKey = hudKey;
		this.callbacks.onHudUpdate({
			fighters: [f1, f2],
			elapsedSeconds,
			countdownText,
			winnerSlot: this.winnerSlot,
			koBannerText: this.koBannerText
		});
	}
};
// node_modules/peerjs-js-binarypack/dist/binarypack.mjs
var $e8379818650e2442$export$93654d4f2d6cd524 = class {
	constructor() {
		this.encoder = new TextEncoder();
		this._pieces = [];
		this._parts = [];
	}
	append_buffer(data) {
		this.flush();
		this._parts.push(data);
	}
	append(data) {
		this._pieces.push(data);
	}
	flush() {
		if (this._pieces.length > 0) {
			const buf = new Uint8Array(this._pieces);
			this._parts.push(buf);
			this._pieces = [];
		}
	}
	toArrayBuffer() {
		const buffer = [];
		for (const part of this._parts) buffer.push(part);
		return $e8379818650e2442$var$concatArrayBuffers(buffer).buffer;
	}
};
function $e8379818650e2442$var$concatArrayBuffers(bufs) {
	let size = 0;
	for (const buf of bufs) size += buf.byteLength;
	const result = new Uint8Array(size);
	let offset = 0;
	for (const buf of bufs) {
		const view = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
		result.set(view, offset);
		offset += buf.byteLength;
	}
	return result;
}
function $0cfd7828ad59115f$export$417857010dc9287f(data) {
	return new $0cfd7828ad59115f$var$Unpacker(data).unpack();
}
function $0cfd7828ad59115f$export$2a703dbb0cb35339(data) {
	const packer = new $0cfd7828ad59115f$export$b9ec4b114aa40074();
	const res = packer.pack(data);
	if (res instanceof Promise) return res.then(() => packer.getBuffer());
	return packer.getBuffer();
}
var $0cfd7828ad59115f$var$Unpacker = class {
	constructor(data) {
		this.index = 0;
		this.dataBuffer = data;
		this.dataView = new Uint8Array(this.dataBuffer);
		this.length = this.dataBuffer.byteLength;
	}
	unpack() {
		const type = this.unpack_uint8();
		if (type < 128) return type;
		else if ((type ^ 224) < 32) return (type ^ 224) - 32;
		let size;
		if ((size = type ^ 160) <= 15) return this.unpack_raw(size);
		else if ((size = type ^ 176) <= 15) return this.unpack_string(size);
		else if ((size = type ^ 144) <= 15) return this.unpack_array(size);
		else if ((size = type ^ 128) <= 15) return this.unpack_map(size);
		switch (type) {
			case 192: return null;
			case 193: return;
			case 194: return false;
			case 195: return true;
			case 202: return this.unpack_float();
			case 203: return this.unpack_double();
			case 204: return this.unpack_uint8();
			case 205: return this.unpack_uint16();
			case 206: return this.unpack_uint32();
			case 207: return this.unpack_uint64();
			case 208: return this.unpack_int8();
			case 209: return this.unpack_int16();
			case 210: return this.unpack_int32();
			case 211: return this.unpack_int64();
			case 212: return;
			case 213: return;
			case 214: return;
			case 215: return;
			case 216:
				size = this.unpack_uint16();
				return this.unpack_string(size);
			case 217:
				size = this.unpack_uint32();
				return this.unpack_string(size);
			case 218:
				size = this.unpack_uint16();
				return this.unpack_raw(size);
			case 219:
				size = this.unpack_uint32();
				return this.unpack_raw(size);
			case 220:
				size = this.unpack_uint16();
				return this.unpack_array(size);
			case 221:
				size = this.unpack_uint32();
				return this.unpack_array(size);
			case 222:
				size = this.unpack_uint16();
				return this.unpack_map(size);
			case 223:
				size = this.unpack_uint32();
				return this.unpack_map(size);
		}
	}
	unpack_uint8() {
		const byte = this.dataView[this.index] & 255;
		this.index++;
		return byte;
	}
	unpack_uint16() {
		const bytes = this.read(2);
		const uint16 = (bytes[0] & 255) * 256 + (bytes[1] & 255);
		this.index += 2;
		return uint16;
	}
	unpack_uint32() {
		const bytes = this.read(4);
		const uint32 = ((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3];
		this.index += 4;
		return uint32;
	}
	unpack_uint64() {
		const bytes = this.read(8);
		const uint64 = ((((((bytes[0] * 256 + bytes[1]) * 256 + bytes[2]) * 256 + bytes[3]) * 256 + bytes[4]) * 256 + bytes[5]) * 256 + bytes[6]) * 256 + bytes[7];
		this.index += 8;
		return uint64;
	}
	unpack_int8() {
		const uint8 = this.unpack_uint8();
		return uint8 < 128 ? uint8 : uint8 - 256;
	}
	unpack_int16() {
		const uint16 = this.unpack_uint16();
		return uint16 < 32768 ? uint16 : uint16 - 65536;
	}
	unpack_int32() {
		const uint32 = this.unpack_uint32();
		return uint32 < 2 ** 31 ? uint32 : uint32 - 2 ** 32;
	}
	unpack_int64() {
		const uint64 = this.unpack_uint64();
		return uint64 < 2 ** 63 ? uint64 : uint64 - 2 ** 64;
	}
	unpack_raw(size) {
		if (this.length < this.index + size) throw new Error(`BinaryPackFailure: index is out of range ${this.index} ${size} ${this.length}`);
		const buf = this.dataBuffer.slice(this.index, this.index + size);
		this.index += size;
		return buf;
	}
	unpack_string(size) {
		const bytes = this.read(size);
		let i = 0;
		let str = "";
		let c;
		let code;
		while (i < size) {
			c = bytes[i];
			if (c < 160) {
				code = c;
				i++;
			} else if ((c ^ 192) < 32) {
				code = (c & 31) << 6 | bytes[i + 1] & 63;
				i += 2;
			} else if ((c ^ 224) < 16) {
				code = (c & 15) << 12 | (bytes[i + 1] & 63) << 6 | bytes[i + 2] & 63;
				i += 3;
			} else {
				code = (c & 7) << 18 | (bytes[i + 1] & 63) << 12 | (bytes[i + 2] & 63) << 6 | bytes[i + 3] & 63;
				i += 4;
			}
			str += String.fromCodePoint(code);
		}
		this.index += size;
		return str;
	}
	unpack_array(size) {
		const objects = new Array(size);
		for (let i = 0; i < size; i++) objects[i] = this.unpack();
		return objects;
	}
	unpack_map(size) {
		const map = {};
		for (let i = 0; i < size; i++) {
			const key = this.unpack();
			map[key] = this.unpack();
		}
		return map;
	}
	unpack_float() {
		const uint32 = this.unpack_uint32();
		const sign = uint32 >> 31;
		const exp = (uint32 >> 23 & 255) - 127;
		const fraction = uint32 & 8388607 | 8388608;
		return (sign === 0 ? 1 : -1) * fraction * 2 ** (exp - 23);
	}
	unpack_double() {
		const h32 = this.unpack_uint32();
		const l32 = this.unpack_uint32();
		const sign = h32 >> 31;
		const exp = (h32 >> 20 & 2047) - 1023;
		const frac = (h32 & 0xfffff | 1048576) * 2 ** (exp - 20) + l32 * 2 ** (exp - 52);
		return (sign === 0 ? 1 : -1) * frac;
	}
	read(length) {
		const j = this.index;
		if (j + length <= this.length) return this.dataView.subarray(j, j + length);
		else throw new Error("BinaryPackFailure: read index out of range");
	}
};
var $0cfd7828ad59115f$export$b9ec4b114aa40074 = class {
	getBuffer() {
		return this._bufferBuilder.toArrayBuffer();
	}
	pack(value) {
		if (typeof value === "string") this.pack_string(value);
		else if (typeof value === "number") {
			if (Math.floor(value) === value) this.pack_integer(value);
			else this.pack_double(value);
		} else if (typeof value === "boolean") {
			if (value === true) this._bufferBuilder.append(195);
			else if (value === false) this._bufferBuilder.append(194);
		} else if (value === void 0) this._bufferBuilder.append(192);
		else if (typeof value === "object") {
			if (value === null) this._bufferBuilder.append(192);
			else {
				const constructor = value.constructor;
				if (value instanceof Array) {
					const res = this.pack_array(value);
					if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
				} else if (value instanceof ArrayBuffer) this.pack_bin(new Uint8Array(value));
				else if ("BYTES_PER_ELEMENT" in value) {
					const v = value;
					this.pack_bin(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));
				} else if (value instanceof Date) this.pack_string(value.toString());
				else if (value instanceof Blob) return value.arrayBuffer().then((buffer) => {
					this.pack_bin(new Uint8Array(buffer));
					this._bufferBuilder.flush();
				});
				else if (constructor == Object || constructor.toString().startsWith("class")) {
					const res = this.pack_object(value);
					if (res instanceof Promise) return res.then(() => this._bufferBuilder.flush());
				} else throw new Error(`Type "${constructor.toString()}" not yet supported`);
			}
		} else throw new Error(`Type "${typeof value}" not yet supported`);
		this._bufferBuilder.flush();
	}
	pack_bin(blob) {
		const length = blob.length;
		if (length <= 15) this.pack_uint8(160 + length);
		else if (length <= 65535) {
			this._bufferBuilder.append(218);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(219);
			this.pack_uint32(length);
		} else throw new Error("Invalid length");
		this._bufferBuilder.append_buffer(blob);
	}
	pack_string(str) {
		const encoded = this._textEncoder.encode(str);
		const length = encoded.length;
		if (length <= 15) this.pack_uint8(176 + length);
		else if (length <= 65535) {
			this._bufferBuilder.append(216);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(217);
			this.pack_uint32(length);
		} else throw new Error("Invalid length");
		this._bufferBuilder.append_buffer(encoded);
	}
	pack_array(ary) {
		const length = ary.length;
		if (length <= 15) this.pack_uint8(144 + length);
		else if (length <= 65535) {
			this._bufferBuilder.append(220);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(221);
			this.pack_uint32(length);
		} else throw new Error("Invalid length");
		const packNext = (index) => {
			if (index < length) {
				const res = this.pack(ary[index]);
				if (res instanceof Promise) return res.then(() => packNext(index + 1));
				return packNext(index + 1);
			}
		};
		return packNext(0);
	}
	pack_integer(num) {
		if (num >= -32 && num <= 127) this._bufferBuilder.append(num & 255);
		else if (num >= 0 && num <= 255) {
			this._bufferBuilder.append(204);
			this.pack_uint8(num);
		} else if (num >= -128 && num <= 127) {
			this._bufferBuilder.append(208);
			this.pack_int8(num);
		} else if (num >= 0 && num <= 65535) {
			this._bufferBuilder.append(205);
			this.pack_uint16(num);
		} else if (num >= -32768 && num <= 32767) {
			this._bufferBuilder.append(209);
			this.pack_int16(num);
		} else if (num >= 0 && num <= 0xffffffff) {
			this._bufferBuilder.append(206);
			this.pack_uint32(num);
		} else if (num >= -0x80000000 && num <= 0x7fffffff) {
			this._bufferBuilder.append(210);
			this.pack_int32(num);
		} else if (num >= -0x8000000000000000 && num <= 0x8000000000000000) {
			this._bufferBuilder.append(211);
			this.pack_int64(num);
		} else if (num >= 0 && num <= 0x10000000000000000) {
			this._bufferBuilder.append(207);
			this.pack_uint64(num);
		} else throw new Error("Invalid integer");
	}
	pack_double(num) {
		let sign = 0;
		if (num < 0) {
			sign = 1;
			num = -num;
		}
		const exp = Math.floor(Math.log(num) / Math.LN2);
		const frac0 = num / 2 ** exp - 1;
		const frac1 = Math.floor(frac0 * 2 ** 52);
		const b32 = 2 ** 32;
		const h32 = sign << 31 | exp + 1023 << 20 | frac1 / b32 & 0xfffff;
		const l32 = frac1 % b32;
		this._bufferBuilder.append(203);
		this.pack_int32(h32);
		this.pack_int32(l32);
	}
	pack_object(obj) {
		const keys = Object.keys(obj);
		const length = keys.length;
		if (length <= 15) this.pack_uint8(128 + length);
		else if (length <= 65535) {
			this._bufferBuilder.append(222);
			this.pack_uint16(length);
		} else if (length <= 0xffffffff) {
			this._bufferBuilder.append(223);
			this.pack_uint32(length);
		} else throw new Error("Invalid length");
		const packNext = (index) => {
			if (index < keys.length) {
				const prop = keys[index];
				if (obj.hasOwnProperty(prop)) {
					this.pack(prop);
					const res = this.pack(obj[prop]);
					if (res instanceof Promise) return res.then(() => packNext(index + 1));
				}
				return packNext(index + 1);
			}
		};
		return packNext(0);
	}
	pack_uint8(num) {
		this._bufferBuilder.append(num);
	}
	pack_uint16(num) {
		this._bufferBuilder.append(num >> 8);
		this._bufferBuilder.append(num & 255);
	}
	pack_uint32(num) {
		const n = num & 0xffffffff;
		this._bufferBuilder.append((n & 0xff000000) >>> 24);
		this._bufferBuilder.append((n & 0xff0000) >>> 16);
		this._bufferBuilder.append((n & 65280) >>> 8);
		this._bufferBuilder.append(n & 255);
	}
	pack_uint64(num) {
		const high = num / 2 ** 32;
		const low = num % 2 ** 32;
		this._bufferBuilder.append((high & 0xff000000) >>> 24);
		this._bufferBuilder.append((high & 0xff0000) >>> 16);
		this._bufferBuilder.append((high & 65280) >>> 8);
		this._bufferBuilder.append(high & 255);
		this._bufferBuilder.append((low & 0xff000000) >>> 24);
		this._bufferBuilder.append((low & 0xff0000) >>> 16);
		this._bufferBuilder.append((low & 65280) >>> 8);
		this._bufferBuilder.append(low & 255);
	}
	pack_int8(num) {
		this._bufferBuilder.append(num & 255);
	}
	pack_int16(num) {
		this._bufferBuilder.append((num & 65280) >> 8);
		this._bufferBuilder.append(num & 255);
	}
	pack_int32(num) {
		this._bufferBuilder.append(num >>> 24 & 255);
		this._bufferBuilder.append((num & 0xff0000) >>> 16);
		this._bufferBuilder.append((num & 65280) >>> 8);
		this._bufferBuilder.append(num & 255);
	}
	pack_int64(num) {
		const high = Math.floor(num / 2 ** 32);
		const low = num % 2 ** 32;
		this._bufferBuilder.append((high & 0xff000000) >>> 24);
		this._bufferBuilder.append((high & 0xff0000) >>> 16);
		this._bufferBuilder.append((high & 65280) >>> 8);
		this._bufferBuilder.append(high & 255);
		this._bufferBuilder.append((low & 0xff000000) >>> 24);
		this._bufferBuilder.append((low & 0xff0000) >>> 16);
		this._bufferBuilder.append((low & 65280) >>> 8);
		this._bufferBuilder.append(low & 255);
	}
	constructor() {
		this._bufferBuilder = new $e8379818650e2442$export$93654d4f2d6cd524();
		this._textEncoder = new TextEncoder();
	}
};
// node_modules/webrtc-adapter/src/js/utils.js
var logDisabled_ = true;
var deprecationWarnings_ = true;
/**
* Extract browser version out of the provided user agent string.
*
* @param {!string} uastring userAgent string.
* @param {!string} expr Regular expression used as match criteria.
* @param {!number} pos position in the version string to be returned.
* @return {!number} browser version.
*/
function extractVersion(uastring, expr, pos) {
	const match = uastring.match(expr);
	return match && match.length >= pos && parseFloat(match[pos], 10);
}
function wrapPeerConnectionEvent(window, eventNameToWrap, wrapper) {
	if (!window.RTCPeerConnection) return;
	if (!Object.getOwnPropertyDescriptor(EventTarget.prototype, "addEventListener").writable) {
		log("Unable to polyfill events");
		return;
	}
	const proto = window.RTCPeerConnection.prototype;
	const nativeAddEventListener = proto.addEventListener;
	proto.addEventListener = function(nativeEventName, cb) {
		if (nativeEventName !== eventNameToWrap) return nativeAddEventListener.apply(this, arguments);
		const wrappedCallback = (e) => {
			const modifiedEvent = wrapper(e);
			if (modifiedEvent) {
				if (cb.handleEvent) cb.handleEvent(modifiedEvent);
				else cb(modifiedEvent);
			}
		};
		this._eventMap = this._eventMap || {};
		if (!this._eventMap[eventNameToWrap]) this._eventMap[eventNameToWrap] = /* @__PURE__ */ new Map();
		this._eventMap[eventNameToWrap].set(cb, wrappedCallback);
		return nativeAddEventListener.apply(this, [nativeEventName, wrappedCallback]);
	};
	const nativeRemoveEventListener = proto.removeEventListener;
	proto.removeEventListener = function(nativeEventName, cb) {
		if (nativeEventName !== eventNameToWrap || !this._eventMap || !this._eventMap[eventNameToWrap]) return nativeRemoveEventListener.apply(this, arguments);
		if (!this._eventMap[eventNameToWrap].has(cb)) return nativeRemoveEventListener.apply(this, arguments);
		const unwrappedCb = this._eventMap[eventNameToWrap].get(cb);
		this._eventMap[eventNameToWrap].delete(cb);
		if (this._eventMap[eventNameToWrap].size === 0) delete this._eventMap[eventNameToWrap];
		if (Object.keys(this._eventMap).length === 0) delete this._eventMap;
		return nativeRemoveEventListener.apply(this, [nativeEventName, unwrappedCb]);
	};
	Object.defineProperty(proto, "on" + eventNameToWrap, {
		get() {
			return this["_on" + eventNameToWrap];
		},
		set(cb) {
			if (this["_on" + eventNameToWrap]) {
				this.removeEventListener(eventNameToWrap, this["_on" + eventNameToWrap]);
				delete this["_on" + eventNameToWrap];
			}
			if (cb) this.addEventListener(eventNameToWrap, this["_on" + eventNameToWrap] = cb);
		},
		enumerable: true,
		configurable: true
	});
}
function disableLog(bool) {
	if (typeof bool !== "boolean") return /* @__PURE__ */ new Error("Argument type: " + typeof bool + ". Please use a boolean.");
	logDisabled_ = bool;
	return bool ? "adapter.js logging disabled" : "adapter.js logging enabled";
}
/**
* Disable or enable deprecation warnings
* @param {!boolean} bool set to true to disable warnings.
*/
function disableWarnings(bool) {
	if (typeof bool !== "boolean") return /* @__PURE__ */ new Error("Argument type: " + typeof bool + ". Please use a boolean.");
	deprecationWarnings_ = !bool;
	return "adapter.js deprecation warnings " + (bool ? "disabled" : "enabled");
}
function log() {
	if (typeof window === "object") {
		if (logDisabled_) return;
		if (typeof console !== "undefined" && typeof console.log === "function") console.log.apply(console, arguments);
	}
}
/**
* Shows a deprecation warning suggesting the modern and spec-compatible API.
*/
function deprecated(oldMethod, newMethod) {
	if (!deprecationWarnings_) return;
	console.warn(oldMethod + " is deprecated, please use " + newMethod + " instead.");
}
/**
* Browser detector.
*
* @return {object} result containing browser and version
*     properties.
*/
function detectBrowser(window) {
	const result = {
		browser: null,
		version: null
	};
	if (typeof window === "undefined" || !window.navigator || !window.navigator.userAgent) {
		result.browser = "Not a browser.";
		return result;
	}
	const { navigator } = window;
	if (navigator.userAgentData && navigator.userAgentData.brands) {
		const chromium = navigator.userAgentData.brands.find((brand) => {
			return brand.brand === "Chromium";
		});
		if (chromium) {
			const version = parseInt(chromium.version, 10);
			if (version >= 90) return {
				browser: "chrome",
				version
			};
		}
	}
	if (navigator.mozGetUserMedia) {
		result.browser = "firefox";
		result.version = parseInt(extractVersion(navigator.userAgent, /Firefox\/(\d+)\./, 1));
	} else if (navigator.webkitGetUserMedia || window.isSecureContext === false && window.webkitRTCPeerConnection) {
		result.browser = "chrome";
		result.version = parseInt(extractVersion(navigator.userAgent, /Chrom(e|ium)\/(\d+)\./, 2)) || null;
	} else if (window.RTCPeerConnection && navigator.userAgent.match(/AppleWebKit\/(\d+)\./)) {
		result.browser = "safari";
		result.version = parseInt(extractVersion(navigator.userAgent, /AppleWebKit\/(\d+)\./, 1));
		result.supportsUnifiedPlan = window.RTCRtpTransceiver && "currentDirection" in window.RTCRtpTransceiver.prototype;
		result._safariVersion = extractVersion(navigator.userAgent, /Version\/(\d+(\.?\d+))/, 1);
	} else {
		result.browser = "Not a supported browser.";
		return result;
	}
	return result;
}
/**
* Checks if something is an object.
*
* @param {*} val The something you want to check.
* @return true if val is an object, false otherwise.
*/
function isObject(val) {
	return Object.prototype.toString.call(val) === "[object Object]";
}
/**
* Remove all empty objects and undefined values
* from a nested object -- an enhanced and vanilla version
* of Lodash's `compact`.
*/
function compactObject(data) {
	if (!isObject(data)) return data;
	return Object.keys(data).reduce(function(accumulator, key) {
		const isObj = isObject(data[key]);
		const value = isObj ? compactObject(data[key]) : data[key];
		const isEmptyObject = isObj && !Object.keys(value).length;
		if (value === void 0 || isEmptyObject) return accumulator;
		return Object.assign(accumulator, { [key]: value });
	}, {});
}
function walkStats(stats, base, resultSet) {
	if (!base || resultSet.has(base.id)) return;
	resultSet.set(base.id, base);
	Object.keys(base).forEach((name) => {
		if (name.endsWith("Id")) walkStats(stats, stats.get(base[name]), resultSet);
		else if (name.endsWith("Ids")) base[name].forEach((id) => {
			walkStats(stats, stats.get(id), resultSet);
		});
	});
}
function filterStats(result, track, outbound) {
	const streamStatsType = outbound ? "outbound-rtp" : "inbound-rtp";
	const filteredResult = /* @__PURE__ */ new Map();
	if (track === null) return filteredResult;
	const trackStats = [];
	result.forEach((value) => {
		if (value.type === "track" && value.trackIdentifier === track.id) trackStats.push(value);
	});
	trackStats.forEach((trackStat) => {
		result.forEach((stats) => {
			if (stats.type === streamStatsType && stats.trackId === trackStat.id) walkStats(result, stats, filteredResult);
		});
	});
	return filteredResult;
}
// node_modules/webrtc-adapter/src/js/chrome/getusermedia.js
var logging = log;
function shimGetUserMedia$2(window, browserDetails) {
	if (browserDetails.version >= 64) return;
	const navigator = window && window.navigator;
	if (!navigator.mediaDevices) return;
	const constraintsToChrome_ = function(c) {
		if (typeof c !== "object" || c.mandatory || c.optional) return c;
		const cc = {};
		Object.keys(c).forEach((key) => {
			if (key === "require" || key === "advanced" || key === "mediaSource") return;
			const r = typeof c[key] === "object" ? c[key] : { ideal: c[key] };
			if (r.exact !== void 0 && typeof r.exact === "number") r.min = r.max = r.exact;
			const oldname_ = function(prefix, name) {
				if (prefix) return prefix + name.charAt(0).toUpperCase() + name.slice(1);
				return name === "deviceId" ? "sourceId" : name;
			};
			if (r.ideal !== void 0) {
				cc.optional = cc.optional || [];
				let oc = {};
				if (typeof r.ideal === "number") {
					oc[oldname_("min", key)] = r.ideal;
					cc.optional.push(oc);
					oc = {};
					oc[oldname_("max", key)] = r.ideal;
					cc.optional.push(oc);
				} else {
					oc[oldname_("", key)] = r.ideal;
					cc.optional.push(oc);
				}
			}
			if (r.exact !== void 0 && typeof r.exact !== "number") {
				cc.mandatory = cc.mandatory || {};
				cc.mandatory[oldname_("", key)] = r.exact;
			} else ["min", "max"].forEach((mix) => {
				if (r[mix] !== void 0) {
					cc.mandatory = cc.mandatory || {};
					cc.mandatory[oldname_(mix, key)] = r[mix];
				}
			});
		});
		if (c.advanced) cc.optional = (cc.optional || []).concat(c.advanced);
		return cc;
	};
	const shimConstraints_ = function(constraints, func) {
		if (browserDetails.version >= 61) return func(constraints);
		constraints = JSON.parse(JSON.stringify(constraints));
		if (constraints && typeof constraints.audio === "object") {
			const remap = function(obj, a, b) {
				if (a in obj && !(b in obj)) {
					obj[b] = obj[a];
					delete obj[a];
				}
			};
			constraints = JSON.parse(JSON.stringify(constraints));
			remap(constraints.audio, "autoGainControl", "googAutoGainControl");
			remap(constraints.audio, "noiseSuppression", "googNoiseSuppression");
			constraints.audio = constraintsToChrome_(constraints.audio);
		}
		if (constraints && typeof constraints.video === "object") {
			let face = constraints.video.facingMode;
			face = face && (typeof face === "object" ? face : { ideal: face });
			const getSupportedFacingModeLies = browserDetails.version < 66;
			if (face && (face.exact === "user" || face.exact === "environment" || face.ideal === "user" || face.ideal === "environment") && !(navigator.mediaDevices.getSupportedConstraints && navigator.mediaDevices.getSupportedConstraints().facingMode && !getSupportedFacingModeLies)) {
				delete constraints.video.facingMode;
				let matches;
				if (face.exact === "environment" || face.ideal === "environment") matches = ["back", "rear"];
				else if (face.exact === "user" || face.ideal === "user") matches = ["front"];
				if (matches) return navigator.mediaDevices.enumerateDevices().then((devices) => {
					devices = devices.filter((d) => d.kind === "videoinput");
					let dev = devices.find((d) => matches.some((match) => d.label.toLowerCase().includes(match)));
					if (!dev && devices.length && matches.includes("back")) dev = devices[devices.length - 1];
					if (dev) constraints.video.deviceId = face.exact ? { exact: dev.deviceId } : { ideal: dev.deviceId };
					constraints.video = constraintsToChrome_(constraints.video);
					logging("chrome: " + JSON.stringify(constraints));
					return func(constraints);
				});
			}
			constraints.video = constraintsToChrome_(constraints.video);
		}
		logging("chrome: " + JSON.stringify(constraints));
		return func(constraints);
	};
	const shimError_ = function(e) {
		if (browserDetails.version >= 64) return e;
		return {
			name: {
				PermissionDeniedError: "NotAllowedError",
				PermissionDismissedError: "NotAllowedError",
				InvalidStateError: "NotAllowedError",
				DevicesNotFoundError: "NotFoundError",
				ConstraintNotSatisfiedError: "OverconstrainedError",
				TrackStartError: "NotReadableError",
				MediaDeviceFailedDueToShutdown: "NotAllowedError",
				MediaDeviceKillSwitchOn: "NotAllowedError",
				TabCaptureError: "AbortError",
				ScreenCaptureError: "AbortError",
				DeviceCaptureError: "AbortError"
			}[e.name] || e.name,
			message: e.message,
			constraint: e.constraint || e.constraintName,
			toString() {
				return this.name + (this.message && ": ") + this.message;
			}
		};
	};
	const getUserMedia_ = function(constraints, onSuccess, onError) {
		shimConstraints_(constraints, (c) => {
			navigator.webkitGetUserMedia(c, onSuccess, (e) => {
				if (onError) onError(shimError_(e));
			});
		});
	};
	navigator.getUserMedia = getUserMedia_.bind(navigator);
	if (navigator.mediaDevices.getUserMedia) {
		const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = function(cs) {
			return shimConstraints_(cs, (c) => origGetUserMedia(c).then((stream) => {
				if (c.audio && !stream.getAudioTracks().length || c.video && !stream.getVideoTracks().length) {
					stream.getTracks().forEach((track) => {
						track.stop();
					});
					throw new DOMException("", "NotFoundError");
				}
				return stream;
			}, (e) => Promise.reject(shimError_(e))));
		};
	}
}
// node_modules/webrtc-adapter/src/js/chrome/chrome_shim.js
var chrome_shim_exports = /* @__PURE__ */ __exportAll({
	fixNegotiationNeeded: () => fixNegotiationNeeded,
	shimAddTrackRemoveTrack: () => shimAddTrackRemoveTrack,
	shimAddTrackRemoveTrackWithNative: () => shimAddTrackRemoveTrackWithNative,
	shimGetSendersWithDtmf: () => shimGetSendersWithDtmf,
	shimGetUserMedia: () => shimGetUserMedia$2,
	shimMediaStream: () => shimMediaStream,
	shimOnTrack: () => shimOnTrack$1,
	shimPeerConnection: () => shimPeerConnection$1,
	shimSenderReceiverGetStats: () => shimSenderReceiverGetStats
});
function shimMediaStream(window) {
	window.MediaStream = window.MediaStream || window.webkitMediaStream;
}
function shimOnTrack$1(window, browserDetails) {
	if (browserDetails.version > 102) return;
	if (typeof window === "object" && window.RTCPeerConnection && !("ontrack" in window.RTCPeerConnection.prototype)) {
		Object.defineProperty(window.RTCPeerConnection.prototype, "ontrack", {
			get() {
				return this._ontrack;
			},
			set(f) {
				if (this._ontrack) this.removeEventListener("track", this._ontrack);
				this.addEventListener("track", this._ontrack = f);
			},
			enumerable: true,
			configurable: true
		});
		const origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
		window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
			if (!this._ontrackpoly) {
				this._ontrackpoly = (e) => {
					e.stream.addEventListener("addtrack", (te) => {
						let receiver;
						if (window.RTCPeerConnection.prototype.getReceivers) receiver = this.getReceivers().find((r) => r.track && r.track.id === te.track.id);
						else receiver = { track: te.track };
						const event = new Event("track");
						event.track = te.track;
						event.receiver = receiver;
						event.transceiver = { receiver };
						event.streams = [e.stream];
						this.dispatchEvent(event);
					});
					e.stream.getTracks().forEach((track) => {
						let receiver;
						if (window.RTCPeerConnection.prototype.getReceivers) receiver = this.getReceivers().find((r) => r.track && r.track.id === track.id);
						else receiver = { track };
						const event = new Event("track");
						event.track = track;
						event.receiver = receiver;
						event.transceiver = { receiver };
						event.streams = [e.stream];
						this.dispatchEvent(event);
					});
				};
				this.addEventListener("addstream", this._ontrackpoly);
			}
			return origSetRemoteDescription.apply(this, arguments);
		};
	} else wrapPeerConnectionEvent(window, "track", (e) => {
		if (!e.transceiver) Object.defineProperty(e, "transceiver", { value: { receiver: e.receiver } });
		return e;
	});
}
function shimGetSendersWithDtmf(window) {
	if (typeof window === "object" && window.RTCPeerConnection && !("getSenders" in window.RTCPeerConnection.prototype) && "createDTMFSender" in window.RTCPeerConnection.prototype) {
		const shimSenderWithDtmf = function(pc, track) {
			return {
				track,
				get dtmf() {
					if (this._dtmf === void 0) {
						if (track.kind === "audio") this._dtmf = pc.createDTMFSender(track);
						else this._dtmf = null;
					}
					return this._dtmf;
				},
				_pc: pc
			};
		};
		if (!window.RTCPeerConnection.prototype.getSenders) {
			window.RTCPeerConnection.prototype.getSenders = function getSenders() {
				this._senders = this._senders || [];
				return this._senders.slice();
			};
			const origAddTrack = window.RTCPeerConnection.prototype.addTrack;
			window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
				let sender = origAddTrack.apply(this, arguments);
				if (!sender) {
					sender = shimSenderWithDtmf(this, track);
					this._senders.push(sender);
				}
				return sender;
			};
			const origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
			window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
				origRemoveTrack.apply(this, arguments);
				const idx = this._senders.indexOf(sender);
				if (idx !== -1) this._senders.splice(idx, 1);
			};
		}
		const origAddStream = window.RTCPeerConnection.prototype.addStream;
		window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
			this._senders = this._senders || [];
			origAddStream.apply(this, [stream]);
			stream.getTracks().forEach((track) => {
				this._senders.push(shimSenderWithDtmf(this, track));
			});
		};
		const origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
		window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
			this._senders = this._senders || [];
			origRemoveStream.apply(this, [stream]);
			stream.getTracks().forEach((track) => {
				const sender = this._senders.find((s) => s.track === track);
				if (sender) this._senders.splice(this._senders.indexOf(sender), 1);
			});
		};
	} else if (typeof window === "object" && window.RTCPeerConnection && "getSenders" in window.RTCPeerConnection.prototype && "createDTMFSender" in window.RTCPeerConnection.prototype && window.RTCRtpSender && !("dtmf" in window.RTCRtpSender.prototype)) {
		const origGetSenders = window.RTCPeerConnection.prototype.getSenders;
		window.RTCPeerConnection.prototype.getSenders = function getSenders() {
			const senders = origGetSenders.apply(this, []);
			senders.forEach((sender) => sender._pc = this);
			return senders;
		};
		Object.defineProperty(window.RTCRtpSender.prototype, "dtmf", { get() {
			if (this._dtmf === void 0) {
				if (this.track.kind === "audio") this._dtmf = this._pc.createDTMFSender(this.track);
				else this._dtmf = null;
			}
			return this._dtmf;
		} });
	}
}
function shimSenderReceiverGetStats(window, browserDetails) {
	if (browserDetails.version >= 67) return;
	if (!(typeof window === "object" && window.RTCPeerConnection && window.RTCRtpSender && window.RTCRtpReceiver)) return;
	if (!("getStats" in window.RTCRtpSender.prototype)) {
		const origGetSenders = window.RTCPeerConnection.prototype.getSenders;
		if (origGetSenders) window.RTCPeerConnection.prototype.getSenders = function getSenders() {
			const senders = origGetSenders.apply(this, []);
			senders.forEach((sender) => sender._pc = this);
			return senders;
		};
		const origAddTrack = window.RTCPeerConnection.prototype.addTrack;
		if (origAddTrack) window.RTCPeerConnection.prototype.addTrack = function addTrack() {
			const sender = origAddTrack.apply(this, arguments);
			sender._pc = this;
			return sender;
		};
		window.RTCRtpSender.prototype.getStats = function getStats() {
			const sender = this;
			return this._pc.getStats().then((result) => filterStats(result, sender.track, true));
		};
	}
	if (!("getStats" in window.RTCRtpReceiver.prototype)) {
		const origGetReceivers = window.RTCPeerConnection.prototype.getReceivers;
		if (origGetReceivers) window.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
			const receivers = origGetReceivers.apply(this, []);
			receivers.forEach((receiver) => receiver._pc = this);
			return receivers;
		};
		wrapPeerConnectionEvent(window, "track", (e) => {
			e.receiver._pc = e.srcElement;
			return e;
		});
		window.RTCRtpReceiver.prototype.getStats = function getStats() {
			const receiver = this;
			return this._pc.getStats().then((result) => filterStats(result, receiver.track, false));
		};
	}
	if (!("getStats" in window.RTCRtpSender.prototype && "getStats" in window.RTCRtpReceiver.prototype)) return;
	const origGetStats = window.RTCPeerConnection.prototype.getStats;
	window.RTCPeerConnection.prototype.getStats = function getStats() {
		if (arguments.length > 0 && arguments[0] instanceof window.MediaStreamTrack) {
			const track = arguments[0];
			let sender;
			let receiver;
			let err;
			this.getSenders().forEach((s) => {
				if (s.track === track) {
					if (sender) err = true;
					else sender = s;
				}
			});
			this.getReceivers().forEach((r) => {
				if (r.track === track) {
					if (receiver) err = true;
					else receiver = r;
				}
				return r.track === track;
			});
			if (err || sender && receiver) return Promise.reject(new DOMException("There are more than one sender or receiver for the track.", "InvalidAccessError"));
			else if (sender) return sender.getStats();
			else if (receiver) return receiver.getStats();
			return Promise.reject(new DOMException("There is no sender or receiver for the track.", "InvalidAccessError"));
		}
		return origGetStats.apply(this, arguments);
	};
}
function shimAddTrackRemoveTrackWithNative(window) {
	window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
		this._shimmedLocalStreams = this._shimmedLocalStreams || {};
		return Object.keys(this._shimmedLocalStreams).map((streamId) => this._shimmedLocalStreams[streamId][0]);
	};
	const origAddTrack = window.RTCPeerConnection.prototype.addTrack;
	window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
		if (!stream) return origAddTrack.apply(this, arguments);
		this._shimmedLocalStreams = this._shimmedLocalStreams || {};
		const sender = origAddTrack.apply(this, arguments);
		if (!this._shimmedLocalStreams[stream.id]) this._shimmedLocalStreams[stream.id] = [stream, sender];
		else if (this._shimmedLocalStreams[stream.id].indexOf(sender) === -1) this._shimmedLocalStreams[stream.id].push(sender);
		return sender;
	};
	const origAddStream = window.RTCPeerConnection.prototype.addStream;
	window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
		this._shimmedLocalStreams = this._shimmedLocalStreams || {};
		stream.getTracks().forEach((track) => {
			if (this.getSenders().find((s) => s.track === track)) throw new DOMException("Track already exists.", "InvalidAccessError");
		});
		const existingSenders = this.getSenders();
		origAddStream.apply(this, arguments);
		const newSenders = this.getSenders().filter((newSender) => existingSenders.indexOf(newSender) === -1);
		this._shimmedLocalStreams[stream.id] = [stream].concat(newSenders);
	};
	const origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
	window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
		this._shimmedLocalStreams = this._shimmedLocalStreams || {};
		delete this._shimmedLocalStreams[stream.id];
		return origRemoveStream.apply(this, arguments);
	};
	const origRemoveTrack = window.RTCPeerConnection.prototype.removeTrack;
	window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
		this._shimmedLocalStreams = this._shimmedLocalStreams || {};
		if (sender) Object.keys(this._shimmedLocalStreams).forEach((streamId) => {
			const idx = this._shimmedLocalStreams[streamId].indexOf(sender);
			if (idx !== -1) this._shimmedLocalStreams[streamId].splice(idx, 1);
			if (this._shimmedLocalStreams[streamId].length === 1) delete this._shimmedLocalStreams[streamId];
		});
		return origRemoveTrack.apply(this, arguments);
	};
}
function shimAddTrackRemoveTrack(window, browserDetails) {
	if (!window.RTCPeerConnection) return;
	if (window.RTCPeerConnection.prototype.addTrack && browserDetails.version >= 65) return shimAddTrackRemoveTrackWithNative(window);
	const origGetLocalStreams = window.RTCPeerConnection.prototype.getLocalStreams;
	window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
		const nativeStreams = origGetLocalStreams.apply(this);
		this._reverseStreams = this._reverseStreams || {};
		return nativeStreams.map((stream) => this._reverseStreams[stream.id]);
	};
	const origAddStream = window.RTCPeerConnection.prototype.addStream;
	window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
		this._streams = this._streams || {};
		this._reverseStreams = this._reverseStreams || {};
		stream.getTracks().forEach((track) => {
			if (this.getSenders().find((s) => s.track === track)) throw new DOMException("Track already exists.", "InvalidAccessError");
		});
		if (!this._reverseStreams[stream.id]) {
			const newStream = new window.MediaStream(stream.getTracks());
			this._streams[stream.id] = newStream;
			this._reverseStreams[newStream.id] = stream;
			stream = newStream;
		}
		origAddStream.apply(this, [stream]);
	};
	const origRemoveStream = window.RTCPeerConnection.prototype.removeStream;
	window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
		this._streams = this._streams || {};
		this._reverseStreams = this._reverseStreams || {};
		origRemoveStream.apply(this, [this._streams[stream.id] || stream]);
		delete this._reverseStreams[this._streams[stream.id] ? this._streams[stream.id].id : stream.id];
		delete this._streams[stream.id];
	};
	window.RTCPeerConnection.prototype.addTrack = function addTrack(track, stream) {
		if (this.signalingState === "closed") throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.", "InvalidStateError");
		const streams = [].slice.call(arguments, 1);
		if (streams.length !== 1 || !streams[0].getTracks().find((t) => t === track)) throw new DOMException("The adapter.js addTrack polyfill only supports a single  stream which is associated with the specified track.", "NotSupportedError");
		if (this.getSenders().find((s) => s.track === track)) throw new DOMException("Track already exists.", "InvalidAccessError");
		this._streams = this._streams || {};
		this._reverseStreams = this._reverseStreams || {};
		const oldStream = this._streams[stream.id];
		if (oldStream) {
			oldStream.addTrack(track);
			Promise.resolve().then(() => {
				this.dispatchEvent(new Event("negotiationneeded"));
			});
		} else {
			const newStream = new window.MediaStream([track]);
			this._streams[stream.id] = newStream;
			this._reverseStreams[newStream.id] = stream;
			this.addStream(newStream);
		}
		return this.getSenders().find((s) => s.track === track);
	};
	function replaceInternalStreamId(pc, description) {
		let sdp = description.sdp;
		Object.keys(pc._reverseStreams || []).forEach((internalId) => {
			const externalStream = pc._reverseStreams[internalId];
			const internalStream = pc._streams[externalStream.id];
			sdp = sdp.replace(new RegExp(internalStream.id, "g"), externalStream.id);
		});
		return new RTCSessionDescription({
			type: description.type,
			sdp
		});
	}
	function replaceExternalStreamId(pc, description) {
		let sdp = description.sdp;
		Object.keys(pc._reverseStreams || []).forEach((internalId) => {
			const externalStream = pc._reverseStreams[internalId];
			const internalStream = pc._streams[externalStream.id];
			sdp = sdp.replace(new RegExp(externalStream.id, "g"), internalStream.id);
		});
		return new RTCSessionDescription({
			type: description.type,
			sdp
		});
	}
	["createOffer", "createAnswer"].forEach(function(method) {
		const nativeMethod = window.RTCPeerConnection.prototype[method];
		const methodObj = { [method]() {
			const args = arguments;
			if (arguments.length && typeof arguments[0] === "function") return nativeMethod.apply(this, [
				(description) => {
					const desc = replaceInternalStreamId(this, description);
					args[0].apply(null, [desc]);
				},
				(err) => {
					if (args[1]) args[1].apply(null, err);
				},
				arguments[2]
			]);
			return nativeMethod.apply(this, arguments).then((description) => replaceInternalStreamId(this, description));
		} };
		window.RTCPeerConnection.prototype[method] = methodObj[method];
	});
	const origSetLocalDescription = window.RTCPeerConnection.prototype.setLocalDescription;
	window.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
		if (!arguments.length || !arguments[0].type) return origSetLocalDescription.apply(this, arguments);
		arguments[0] = replaceExternalStreamId(this, arguments[0]);
		return origSetLocalDescription.apply(this, arguments);
	};
	const origLocalDescription = Object.getOwnPropertyDescriptor(window.RTCPeerConnection.prototype, "localDescription");
	Object.defineProperty(window.RTCPeerConnection.prototype, "localDescription", { get() {
		const description = origLocalDescription.get.apply(this);
		if (description.type === "") return description;
		return replaceInternalStreamId(this, description);
	} });
	window.RTCPeerConnection.prototype.removeTrack = function removeTrack(sender) {
		if (this.signalingState === "closed") throw new DOMException("The RTCPeerConnection's signalingState is 'closed'.", "InvalidStateError");
		if (!sender._pc) throw new DOMException("Argument 1 of RTCPeerConnection.removeTrack does not implement interface RTCRtpSender.", "TypeError");
		if (!(sender._pc === this)) throw new DOMException("Sender was not created by this connection.", "InvalidAccessError");
		this._streams = this._streams || {};
		let stream;
		Object.keys(this._streams).forEach((streamid) => {
			if (this._streams[streamid].getTracks().find((track) => sender.track === track)) stream = this._streams[streamid];
		});
		if (stream) {
			if (stream.getTracks().length === 1) this.removeStream(this._reverseStreams[stream.id]);
			else stream.removeTrack(sender.track);
			this.dispatchEvent(new Event("negotiationneeded"));
		}
	};
}
function shimPeerConnection$1(window, browserDetails) {
	if (!window.RTCPeerConnection && window.webkitRTCPeerConnection) window.RTCPeerConnection = window.webkitRTCPeerConnection;
	if (!window.RTCPeerConnection) return;
	if (browserDetails.version < 53) [
		"setLocalDescription",
		"setRemoteDescription",
		"addIceCandidate"
	].forEach(function(method) {
		const nativeMethod = window.RTCPeerConnection.prototype[method];
		const methodObj = { [method]() {
			arguments[0] = new (method === "addIceCandidate" ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
			return nativeMethod.apply(this, arguments);
		} };
		window.RTCPeerConnection.prototype[method] = methodObj[method];
	});
}
function fixNegotiationNeeded(window, browserDetails) {
	if (browserDetails.version > 102) return;
	wrapPeerConnectionEvent(window, "negotiationneeded", (e) => {
		const pc = e.target;
		if (browserDetails.version < 72 || pc.getConfiguration && pc.getConfiguration().sdpSemantics === "plan-b") {
			if (pc.signalingState !== "stable") return;
		}
		return e;
	});
}
// node_modules/webrtc-adapter/src/js/firefox/getusermedia.js
function shimGetUserMedia$1(window, browserDetails) {
	const navigator = window && window.navigator;
	if (!navigator.mediaDevices) return;
	const MediaStreamTrack = window && window.MediaStreamTrack;
	navigator.getUserMedia = function(constraints, onSuccess, onError) {
		deprecated("navigator.getUserMedia", "navigator.mediaDevices.getUserMedia");
		navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);
	};
	if (!(browserDetails.version > 55 && "autoGainControl" in navigator.mediaDevices.getSupportedConstraints())) {
		const remap = function(obj, a, b) {
			if (a in obj && !(b in obj)) {
				obj[b] = obj[a];
				delete obj[a];
			}
		};
		const nativeGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = function(c) {
			if (typeof c === "object" && typeof c.audio === "object") {
				c = JSON.parse(JSON.stringify(c));
				remap(c.audio, "autoGainControl", "mozAutoGainControl");
				remap(c.audio, "noiseSuppression", "mozNoiseSuppression");
			}
			return nativeGetUserMedia(c);
		};
		if (MediaStreamTrack && MediaStreamTrack.prototype.getSettings) {
			const nativeGetSettings = MediaStreamTrack.prototype.getSettings;
			MediaStreamTrack.prototype.getSettings = function() {
				const obj = nativeGetSettings.apply(this, arguments);
				remap(obj, "mozAutoGainControl", "autoGainControl");
				remap(obj, "mozNoiseSuppression", "noiseSuppression");
				return obj;
			};
		}
		if (MediaStreamTrack && MediaStreamTrack.prototype.applyConstraints) {
			const nativeApplyConstraints = MediaStreamTrack.prototype.applyConstraints;
			MediaStreamTrack.prototype.applyConstraints = function(c) {
				if (this.kind === "audio" && typeof c === "object") {
					c = JSON.parse(JSON.stringify(c));
					remap(c, "autoGainControl", "mozAutoGainControl");
					remap(c, "noiseSuppression", "mozNoiseSuppression");
				}
				return nativeApplyConstraints.apply(this, [c]);
			};
		}
	}
}
// node_modules/webrtc-adapter/src/js/firefox/getdisplaymedia.js
function shimGetDisplayMedia(window, preferredMediaSource) {
	if (!window.navigator.mediaDevices) return;
	if (window.navigator.mediaDevices && "getDisplayMedia" in window.navigator.mediaDevices) return;
	window.navigator.mediaDevices.getDisplayMedia = function getDisplayMedia(constraints) {
		if (!(constraints && constraints.video)) {
			const err = new DOMException("getDisplayMedia without video constraints is undefined");
			err.name = "NotFoundError";
			err.code = 8;
			return Promise.reject(err);
		}
		if (constraints.video === true) constraints.video = { mediaSource: preferredMediaSource };
		else constraints.video.mediaSource = preferredMediaSource;
		return window.navigator.mediaDevices.getUserMedia(constraints);
	};
}
// node_modules/webrtc-adapter/src/js/firefox/firefox_shim.js
var firefox_shim_exports = /* @__PURE__ */ __exportAll({
	shimAddTransceiver: () => shimAddTransceiver,
	shimCreateAnswer: () => shimCreateAnswer,
	shimCreateOffer: () => shimCreateOffer,
	shimGetDisplayMedia: () => shimGetDisplayMedia,
	shimGetParameters: () => shimGetParameters,
	shimGetStats: () => shimGetStats,
	shimGetUserMedia: () => shimGetUserMedia$1,
	shimOnTrack: () => shimOnTrack,
	shimPeerConnection: () => shimPeerConnection,
	shimRTCDataChannel: () => shimRTCDataChannel,
	shimReceiverGetStats: () => shimReceiverGetStats,
	shimRemoveStream: () => shimRemoveStream,
	shimSenderGetStats: () => shimSenderGetStats
});
function shimOnTrack(window) {
	if (typeof window === "object" && window.RTCTrackEvent && "receiver" in window.RTCTrackEvent.prototype && !("transceiver" in window.RTCTrackEvent.prototype)) Object.defineProperty(window.RTCTrackEvent.prototype, "transceiver", { get() {
		return { receiver: this.receiver };
	} });
}
function shimPeerConnection(window, browserDetails) {
	if (typeof window !== "object" || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) return;
	if (!window.RTCPeerConnection && window.mozRTCPeerConnection) window.RTCPeerConnection = window.mozRTCPeerConnection;
	if (browserDetails.version < 53) [
		"setLocalDescription",
		"setRemoteDescription",
		"addIceCandidate"
	].forEach(function(method) {
		const nativeMethod = window.RTCPeerConnection.prototype[method];
		const methodObj = { [method]() {
			arguments[0] = new (method === "addIceCandidate" ? window.RTCIceCandidate : window.RTCSessionDescription)(arguments[0]);
			return nativeMethod.apply(this, arguments);
		} };
		window.RTCPeerConnection.prototype[method] = methodObj[method];
	});
}
function shimGetStats(window, browserDetails) {
	if (typeof window !== "object" || !(window.RTCPeerConnection || window.mozRTCPeerConnection)) return;
	if (browserDetails.version >= 151) return;
	const modernStatsTypes = {
		inboundrtp: "inbound-rtp",
		outboundrtp: "outbound-rtp",
		candidatepair: "candidate-pair",
		localcandidate: "local-candidate",
		remotecandidate: "remote-candidate"
	};
	const nativeGetStats = window.RTCPeerConnection.prototype.getStats;
	window.RTCPeerConnection.prototype.getStats = function getStats() {
		const [selector, onSucc, onErr] = arguments;
		if (this.signalingState === "closed") return Promise.resolve(/* @__PURE__ */ new Map());
		return nativeGetStats.apply(this, [selector || null]).then((stats) => {
			if (browserDetails.version < 53 && !onSucc) try {
				stats.forEach((stat) => {
					stat.type = modernStatsTypes[stat.type] || stat.type;
				});
			} catch (e) {
				if (e.name !== "TypeError") throw e;
				stats.forEach((stat, i) => {
					stats.set(i, Object.assign({}, stat, { type: modernStatsTypes[stat.type] || stat.type }));
				});
			}
			return stats;
		}).then(onSucc, onErr);
	};
}
function shimSenderGetStats(window) {
	if (!(typeof window === "object" && window.RTCPeerConnection && window.RTCRtpSender)) return;
	if (window.RTCRtpSender && "getStats" in window.RTCRtpSender.prototype) return;
	const origGetSenders = window.RTCPeerConnection.prototype.getSenders;
	if (origGetSenders) window.RTCPeerConnection.prototype.getSenders = function getSenders() {
		const senders = origGetSenders.apply(this, []);
		senders.forEach((sender) => sender._pc = this);
		return senders;
	};
	const origAddTrack = window.RTCPeerConnection.prototype.addTrack;
	if (origAddTrack) window.RTCPeerConnection.prototype.addTrack = function addTrack() {
		const sender = origAddTrack.apply(this, arguments);
		sender._pc = this;
		return sender;
	};
	window.RTCRtpSender.prototype.getStats = function getStats() {
		return this.track ? this._pc.getStats(this.track) : Promise.resolve(/* @__PURE__ */ new Map());
	};
}
function shimReceiverGetStats(window) {
	if (!(typeof window === "object" && window.RTCPeerConnection && window.RTCRtpSender)) return;
	if (window.RTCRtpSender && "getStats" in window.RTCRtpReceiver.prototype) return;
	const origGetReceivers = window.RTCPeerConnection.prototype.getReceivers;
	if (origGetReceivers) window.RTCPeerConnection.prototype.getReceivers = function getReceivers() {
		const receivers = origGetReceivers.apply(this, []);
		receivers.forEach((receiver) => receiver._pc = this);
		return receivers;
	};
	wrapPeerConnectionEvent(window, "track", (e) => {
		e.receiver._pc = e.srcElement;
		return e;
	});
	window.RTCRtpReceiver.prototype.getStats = function getStats() {
		return this._pc.getStats(this.track);
	};
}
function shimRemoveStream(window) {
	if (!window.RTCPeerConnection || "removeStream" in window.RTCPeerConnection.prototype) return;
	window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
		deprecated("removeStream", "removeTrack");
		this.getSenders().forEach((sender) => {
			if (sender.track && stream.getTracks().includes(sender.track)) this.removeTrack(sender);
		});
	};
}
function shimRTCDataChannel(window) {
	if (window.DataChannel && !window.RTCDataChannel) window.RTCDataChannel = window.DataChannel;
}
function shimAddTransceiver(window, browserDetails) {
	if (!(typeof window === "object" && window.RTCPeerConnection)) return;
	if (browserDetails.version >= 110) return;
	const origAddTransceiver = window.RTCPeerConnection.prototype.addTransceiver;
	if (origAddTransceiver) window.RTCPeerConnection.prototype.addTransceiver = function addTransceiver() {
		this.setParametersPromises = [];
		let sendEncodings = arguments[1] && arguments[1].sendEncodings;
		if (sendEncodings === void 0) sendEncodings = [];
		sendEncodings = [...sendEncodings];
		const shouldPerformCheck = sendEncodings.length > 0;
		if (shouldPerformCheck) sendEncodings.forEach((encodingParam) => {
			if ("rid" in encodingParam) {
				if (!/^[a-z0-9]{0,16}$/i.test(encodingParam.rid)) throw new TypeError("Invalid RID value provided.");
			}
			if ("scaleResolutionDownBy" in encodingParam) {
				if (!(parseFloat(encodingParam.scaleResolutionDownBy) >= 1)) throw new RangeError("scale_resolution_down_by must be >= 1.0");
			}
			if ("maxFramerate" in encodingParam) {
				if (!(parseFloat(encodingParam.maxFramerate) >= 0)) throw new RangeError("max_framerate must be >= 0.0");
			}
		});
		const transceiver = origAddTransceiver.apply(this, arguments);
		if (shouldPerformCheck) {
			const { sender } = transceiver;
			const params = sender.getParameters();
			if (!("encodings" in params) || params.encodings.length === 1 && Object.keys(params.encodings[0]).length === 0) {
				params.encodings = sendEncodings;
				sender.sendEncodings = sendEncodings;
				this.setParametersPromises.push(sender.setParameters(params).then(() => {
					delete sender.sendEncodings;
				}).catch(() => {
					delete sender.sendEncodings;
				}));
			}
		}
		return transceiver;
	};
}
function shimGetParameters(window, browserDetails) {
	if (!(typeof window === "object" && window.RTCRtpSender)) return;
	if (browserDetails.version >= 110) return;
	const origGetParameters = window.RTCRtpSender.prototype.getParameters;
	if (origGetParameters) window.RTCRtpSender.prototype.getParameters = function getParameters() {
		const params = origGetParameters.apply(this, arguments);
		if (!("encodings" in params)) params.encodings = [].concat(this.sendEncodings || [{}]);
		return params;
	};
}
function shimCreateOffer(window, browserDetails) {
	if (!(typeof window === "object" && window.RTCPeerConnection)) return;
	if (browserDetails.version >= 110) return;
	const origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
	window.RTCPeerConnection.prototype.createOffer = function createOffer() {
		if (this.setParametersPromises && this.setParametersPromises.length) return Promise.all(this.setParametersPromises).then(() => {
			return origCreateOffer.apply(this, arguments);
		}).finally(() => {
			this.setParametersPromises = [];
		});
		return origCreateOffer.apply(this, arguments);
	};
}
function shimCreateAnswer(window, browserDetails) {
	if (!(typeof window === "object" && window.RTCPeerConnection)) return;
	if (browserDetails.version >= 110) return;
	const origCreateAnswer = window.RTCPeerConnection.prototype.createAnswer;
	window.RTCPeerConnection.prototype.createAnswer = function createAnswer() {
		if (this.setParametersPromises && this.setParametersPromises.length) return Promise.all(this.setParametersPromises).then(() => {
			return origCreateAnswer.apply(this, arguments);
		}).finally(() => {
			this.setParametersPromises = [];
		});
		return origCreateAnswer.apply(this, arguments);
	};
}
// node_modules/webrtc-adapter/src/js/safari/safari_shim.js
var safari_shim_exports = /* @__PURE__ */ __exportAll({
	shimAudioContext: () => shimAudioContext,
	shimCallbacksAPI: () => shimCallbacksAPI,
	shimConstraints: () => shimConstraints,
	shimCreateOfferLegacy: () => shimCreateOfferLegacy,
	shimGetUserMedia: () => shimGetUserMedia,
	shimLocalStreamsAPI: () => shimLocalStreamsAPI,
	shimRTCIceServerUrls: () => shimRTCIceServerUrls,
	shimRemoteStreamsAPI: () => shimRemoteStreamsAPI,
	shimTrackEventTransceiver: () => shimTrackEventTransceiver
});
function shimLocalStreamsAPI(window) {
	if (typeof window !== "object" || !window.RTCPeerConnection) return;
	if (!("getLocalStreams" in window.RTCPeerConnection.prototype)) window.RTCPeerConnection.prototype.getLocalStreams = function getLocalStreams() {
		if (!this._localStreams) this._localStreams = [];
		return this._localStreams;
	};
	if (!("addStream" in window.RTCPeerConnection.prototype)) {
		const _addTrack = window.RTCPeerConnection.prototype.addTrack;
		window.RTCPeerConnection.prototype.addStream = function addStream(stream) {
			if (!this._localStreams) this._localStreams = [];
			if (!this._localStreams.includes(stream)) this._localStreams.push(stream);
			stream.getAudioTracks().forEach((track) => _addTrack.call(this, track, stream));
			stream.getVideoTracks().forEach((track) => _addTrack.call(this, track, stream));
		};
		window.RTCPeerConnection.prototype.addTrack = function addTrack(track, ...streams) {
			if (streams) streams.forEach((stream) => {
				if (!this._localStreams) this._localStreams = [stream];
				else if (!this._localStreams.includes(stream)) this._localStreams.push(stream);
			});
			return _addTrack.apply(this, arguments);
		};
	}
	if (!("removeStream" in window.RTCPeerConnection.prototype)) window.RTCPeerConnection.prototype.removeStream = function removeStream(stream) {
		if (!this._localStreams) this._localStreams = [];
		const index = this._localStreams.indexOf(stream);
		if (index === -1) return;
		this._localStreams.splice(index, 1);
		const tracks = stream.getTracks();
		this.getSenders().forEach((sender) => {
			if (tracks.includes(sender.track)) this.removeTrack(sender);
		});
	};
}
function shimRemoteStreamsAPI(window) {
	if (typeof window !== "object" || !window.RTCPeerConnection) return;
	if (!("getRemoteStreams" in window.RTCPeerConnection.prototype)) window.RTCPeerConnection.prototype.getRemoteStreams = function getRemoteStreams() {
		return this._remoteStreams ? this._remoteStreams : [];
	};
	if (!("onaddstream" in window.RTCPeerConnection.prototype)) {
		Object.defineProperty(window.RTCPeerConnection.prototype, "onaddstream", {
			get() {
				return this._onaddstream;
			},
			set(f) {
				if (this._onaddstream) {
					this.removeEventListener("addstream", this._onaddstream);
					this.removeEventListener("track", this._onaddstreampoly);
				}
				this.addEventListener("addstream", this._onaddstream = f);
				this.addEventListener("track", this._onaddstreampoly = (e) => {
					e.streams.forEach((stream) => {
						if (!this._remoteStreams) this._remoteStreams = [];
						if (this._remoteStreams.includes(stream)) return;
						this._remoteStreams.push(stream);
						const event = new Event("addstream");
						event.stream = stream;
						this.dispatchEvent(event);
					});
				});
			}
		});
		const origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
		window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
			const pc = this;
			if (!this._onaddstreampoly) this.addEventListener("track", this._onaddstreampoly = function(e) {
				e.streams.forEach((stream) => {
					if (!pc._remoteStreams) pc._remoteStreams = [];
					if (pc._remoteStreams.indexOf(stream) >= 0) return;
					pc._remoteStreams.push(stream);
					const event = new Event("addstream");
					event.stream = stream;
					pc.dispatchEvent(event);
				});
			});
			return origSetRemoteDescription.apply(pc, arguments);
		};
	}
}
function shimCallbacksAPI(window) {
	if (typeof window !== "object" || !window.RTCPeerConnection) return;
	const prototype = window.RTCPeerConnection.prototype;
	const origCreateOffer = prototype.createOffer;
	const origCreateAnswer = prototype.createAnswer;
	const setLocalDescription = prototype.setLocalDescription;
	const setRemoteDescription = prototype.setRemoteDescription;
	const addIceCandidate = prototype.addIceCandidate;
	prototype.createOffer = function createOffer(successCallback, failureCallback) {
		const options = arguments.length >= 2 ? arguments[2] : arguments[0];
		const promise = origCreateOffer.apply(this, [options]);
		if (!failureCallback) return promise;
		promise.then(successCallback, failureCallback);
		return Promise.resolve();
	};
	prototype.createAnswer = function createAnswer(successCallback, failureCallback) {
		const options = arguments.length >= 2 ? arguments[2] : arguments[0];
		const promise = origCreateAnswer.apply(this, [options]);
		if (!failureCallback) return promise;
		promise.then(successCallback, failureCallback);
		return Promise.resolve();
	};
	let withCallback = function(description, successCallback, failureCallback) {
		const promise = setLocalDescription.apply(this, [description]);
		if (!failureCallback) return promise;
		promise.then(successCallback, failureCallback);
		return Promise.resolve();
	};
	prototype.setLocalDescription = withCallback;
	withCallback = function(description, successCallback, failureCallback) {
		const promise = setRemoteDescription.apply(this, [description]);
		if (!failureCallback) return promise;
		promise.then(successCallback, failureCallback);
		return Promise.resolve();
	};
	prototype.setRemoteDescription = withCallback;
	withCallback = function(candidate, successCallback, failureCallback) {
		const promise = addIceCandidate.apply(this, [candidate]);
		if (!failureCallback) return promise;
		promise.then(successCallback, failureCallback);
		return Promise.resolve();
	};
	prototype.addIceCandidate = withCallback;
}
function shimGetUserMedia(window) {
	const navigator = window && window.navigator;
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		const mediaDevices = navigator.mediaDevices;
		const _getUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);
		navigator.mediaDevices.getUserMedia = (constraints) => {
			return _getUserMedia(shimConstraints(constraints));
		};
	}
	if (!navigator.getUserMedia && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) navigator.getUserMedia = function getUserMedia(constraints, cb, errcb) {
		navigator.mediaDevices.getUserMedia(constraints).then(cb, errcb);
	}.bind(navigator);
}
function shimConstraints(constraints) {
	if (constraints && constraints.video !== void 0) return Object.assign({}, constraints, { video: compactObject(constraints.video) });
	return constraints;
}
function shimRTCIceServerUrls(window) {
	if (!window.RTCPeerConnection) return;
	const OrigPeerConnection = window.RTCPeerConnection;
	window.RTCPeerConnection = function RTCPeerConnection(pcConfig, pcConstraints) {
		if (pcConfig && pcConfig.iceServers) {
			const newIceServers = [];
			for (let i = 0; i < pcConfig.iceServers.length; i++) {
				let server = pcConfig.iceServers[i];
				if (server.urls === void 0 && server.url) {
					deprecated("RTCIceServer.url", "RTCIceServer.urls");
					server = JSON.parse(JSON.stringify(server));
					server.urls = server.url;
					delete server.url;
					newIceServers.push(server);
				} else newIceServers.push(pcConfig.iceServers[i]);
			}
			pcConfig.iceServers = newIceServers;
		}
		return new OrigPeerConnection(pcConfig, pcConstraints);
	};
	window.RTCPeerConnection.prototype = OrigPeerConnection.prototype;
	if ("generateCertificate" in OrigPeerConnection) Object.defineProperty(window.RTCPeerConnection, "generateCertificate", { get() {
		return OrigPeerConnection.generateCertificate;
	} });
}
function shimTrackEventTransceiver(window) {
	if (typeof window === "object" && window.RTCTrackEvent && "receiver" in window.RTCTrackEvent.prototype && !("transceiver" in window.RTCTrackEvent.prototype)) Object.defineProperty(window.RTCTrackEvent.prototype, "transceiver", { get() {
		return { receiver: this.receiver };
	} });
}
function shimCreateOfferLegacy(window) {
	const origCreateOffer = window.RTCPeerConnection.prototype.createOffer;
	window.RTCPeerConnection.prototype.createOffer = function createOffer(offerOptions) {
		if (offerOptions) {
			if (typeof offerOptions.offerToReceiveAudio !== "undefined") offerOptions.offerToReceiveAudio = !!offerOptions.offerToReceiveAudio;
			const audioTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "audio");
			if (offerOptions.offerToReceiveAudio === false && audioTransceiver) {
				if (audioTransceiver.direction === "sendrecv") {
					if (audioTransceiver.setDirection) audioTransceiver.setDirection("sendonly");
					else audioTransceiver.direction = "sendonly";
				} else if (audioTransceiver.direction === "recvonly") {
					if (audioTransceiver.setDirection) audioTransceiver.setDirection("inactive");
					else audioTransceiver.direction = "inactive";
				}
			} else if (offerOptions.offerToReceiveAudio === true && !audioTransceiver) this.addTransceiver("audio", { direction: "recvonly" });
			if (typeof offerOptions.offerToReceiveVideo !== "undefined") offerOptions.offerToReceiveVideo = !!offerOptions.offerToReceiveVideo;
			const videoTransceiver = this.getTransceivers().find((transceiver) => transceiver.receiver.track.kind === "video");
			if (offerOptions.offerToReceiveVideo === false && videoTransceiver) {
				if (videoTransceiver.direction === "sendrecv") {
					if (videoTransceiver.setDirection) videoTransceiver.setDirection("sendonly");
					else videoTransceiver.direction = "sendonly";
				} else if (videoTransceiver.direction === "recvonly") {
					if (videoTransceiver.setDirection) videoTransceiver.setDirection("inactive");
					else videoTransceiver.direction = "inactive";
				}
			} else if (offerOptions.offerToReceiveVideo === true && !videoTransceiver) this.addTransceiver("video", { direction: "recvonly" });
		}
		return origCreateOffer.apply(this, arguments);
	};
}
function shimAudioContext(window) {
	if (typeof window !== "object" || window.AudioContext) return;
	window.AudioContext = window.webkitAudioContext;
}
// node_modules/sdp/sdp.js
var require_sdp = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	var SDPUtils = {};
	SDPUtils.generateIdentifier = function() {
		return Math.random().toString(36).substring(2, 12);
	};
	SDPUtils.localCName = SDPUtils.generateIdentifier();
	SDPUtils.splitLines = function(blob) {
		return blob.trim().split("\n").map((line) => line.trim());
	};
	SDPUtils.splitSections = function(blob) {
		return blob.split("\nm=").map((part, index) => (index > 0 ? "m=" + part : part).trim() + "\r\n");
	};
	SDPUtils.getDescription = function(blob) {
		const sections = SDPUtils.splitSections(blob);
		return sections && sections[0];
	};
	SDPUtils.getMediaSections = function(blob) {
		const sections = SDPUtils.splitSections(blob);
		sections.shift();
		return sections;
	};
	SDPUtils.matchPrefix = function(blob, prefix) {
		return SDPUtils.splitLines(blob).filter((line) => line.indexOf(prefix) === 0);
	};
	SDPUtils.parseCandidate = function(line) {
		let parts;
		if (line.indexOf("a=candidate:") === 0) parts = line.substring(12).split(" ");
		else parts = line.substring(10).split(" ");
		const candidate = {
			foundation: parts[0],
			component: {
				1: "rtp",
				2: "rtcp"
			}[parts[1]] || parts[1],
			protocol: parts[2].toLowerCase(),
			priority: parseInt(parts[3], 10),
			ip: parts[4],
			address: parts[4],
			port: parseInt(parts[5], 10),
			type: parts[7]
		};
		for (let i = 8; i < parts.length; i += 2) switch (parts[i]) {
			case "raddr":
				candidate.relatedAddress = parts[i + 1];
				break;
			case "rport":
				candidate.relatedPort = parseInt(parts[i + 1], 10);
				break;
			case "tcptype":
				candidate.tcpType = parts[i + 1];
				break;
			case "ufrag":
				candidate.ufrag = parts[i + 1];
				candidate.usernameFragment = parts[i + 1];
				break;
			default: if (candidate[parts[i]] === void 0) candidate[parts[i]] = parts[i + 1];
		}
		return candidate;
	};
	SDPUtils.writeCandidate = function(candidate) {
		const sdp = [];
		sdp.push(candidate.foundation);
		const component = candidate.component;
		if (component === "rtp") sdp.push(1);
		else if (component === "rtcp") sdp.push(2);
		else sdp.push(component);
		sdp.push(candidate.protocol.toUpperCase());
		sdp.push(candidate.priority);
		sdp.push(candidate.address || candidate.ip);
		sdp.push(candidate.port);
		const type = candidate.type;
		sdp.push("typ");
		sdp.push(type);
		if (type !== "host" && candidate.relatedAddress && candidate.relatedPort !== void 0) {
			sdp.push("raddr");
			sdp.push(candidate.relatedAddress);
			sdp.push("rport");
			sdp.push(candidate.relatedPort);
		}
		if (candidate.tcpType && candidate.protocol.toLowerCase() === "tcp") {
			sdp.push("tcptype");
			sdp.push(candidate.tcpType);
		}
		if (candidate.usernameFragment || candidate.ufrag) {
			sdp.push("ufrag");
			sdp.push(candidate.usernameFragment || candidate.ufrag);
		}
		return "candidate:" + sdp.join(" ");
	};
	SDPUtils.parseIceOptions = function(line) {
		return line.substring(14).split(" ");
	};
	SDPUtils.parseRtpMap = function(line) {
		let parts = line.substring(9).split(" ");
		const parsed = { payloadType: parseInt(parts.shift(), 10) };
		parts = parts[0].split("/");
		parsed.name = parts[0];
		parsed.clockRate = parseInt(parts[1], 10);
		parsed.channels = parts.length === 3 ? parseInt(parts[2], 10) : 1;
		parsed.numChannels = parsed.channels;
		return parsed;
	};
	SDPUtils.writeRtpMap = function(codec) {
		let pt = codec.payloadType;
		if (codec.preferredPayloadType !== void 0) pt = codec.preferredPayloadType;
		const channels = codec.channels || codec.numChannels || 1;
		return "a=rtpmap:" + pt + " " + codec.name + "/" + codec.clockRate + (channels !== 1 ? "/" + channels : "") + "\r\n";
	};
	SDPUtils.parseExtmap = function(line) {
		const parts = line.substring(9).split(" ");
		return {
			id: parseInt(parts[0], 10),
			direction: parts[0].indexOf("/") > 0 ? parts[0].split("/")[1] : "sendrecv",
			uri: parts[1],
			attributes: parts.slice(2).join(" ")
		};
	};
	SDPUtils.writeExtmap = function(headerExtension) {
		return "a=extmap:" + (headerExtension.id || headerExtension.preferredId) + (headerExtension.direction && headerExtension.direction !== "sendrecv" ? "/" + headerExtension.direction : "") + " " + headerExtension.uri + (headerExtension.attributes ? " " + headerExtension.attributes : "") + "\r\n";
	};
	SDPUtils.parseFmtp = function(line) {
		const parsed = {};
		const parts = line.substring(line.indexOf(" ") + 1).split(";");
		for (let j = 0; j < parts.length; j++) {
			const [key, ...rest] = parts[j].trim().split("=");
			parsed[key.trim()] = rest.length ? rest.join("=") : void 0;
		}
		return parsed;
	};
	SDPUtils.writeFmtp = function(codec) {
		let line = "";
		let pt = codec.payloadType;
		if (codec.preferredPayloadType !== void 0) pt = codec.preferredPayloadType;
		if (codec.parameters && Object.keys(codec.parameters).length) {
			const params = [];
			Object.keys(codec.parameters).forEach((param) => {
				if (codec.parameters[param] !== void 0) params.push(param + "=" + codec.parameters[param]);
				else params.push(param);
			});
			line += "a=fmtp:" + pt + " " + params.join(";") + "\r\n";
		}
		return line;
	};
	SDPUtils.parseRtcpFb = function(line) {
		const parts = line.substring(line.indexOf(" ") + 1).split(" ");
		return {
			type: parts.shift(),
			parameter: parts.join(" ")
		};
	};
	SDPUtils.writeRtcpFb = function(codec) {
		let lines = "";
		let pt = codec.payloadType;
		if (codec.preferredPayloadType !== void 0) pt = codec.preferredPayloadType;
		if (codec.rtcpFeedback && codec.rtcpFeedback.length) codec.rtcpFeedback.forEach((fb) => {
			lines += "a=rtcp-fb:" + pt + " " + fb.type + (fb.parameter && fb.parameter.length ? " " + fb.parameter : "") + "\r\n";
		});
		return lines;
	};
	SDPUtils.parseSsrcMedia = function(line) {
		const sp = line.indexOf(" ");
		const parts = { ssrc: parseInt(line.substring(7, sp), 10) };
		const colon = line.indexOf(":", sp);
		if (colon > -1) {
			parts.attribute = line.substring(sp + 1, colon);
			parts.value = line.substring(colon + 1);
		} else parts.attribute = line.substring(sp + 1);
		return parts;
	};
	SDPUtils.parseSsrcGroup = function(line) {
		const parts = line.substring(13).split(" ");
		return {
			semantics: parts.shift(),
			ssrcs: parts.map((ssrc) => parseInt(ssrc, 10))
		};
	};
	SDPUtils.getMid = function(mediaSection) {
		const mid = SDPUtils.matchPrefix(mediaSection, "a=mid:")[0];
		if (mid) return mid.substring(6);
	};
	SDPUtils.parseFingerprint = function(line) {
		const parts = line.substring(14).split(" ");
		return {
			algorithm: parts[0].toLowerCase(),
			value: parts[1].toUpperCase()
		};
	};
	SDPUtils.getDtlsParameters = function(mediaSection, sessionpart) {
		return {
			role: "auto",
			fingerprints: SDPUtils.matchPrefix(mediaSection + sessionpart, "a=fingerprint:").map(SDPUtils.parseFingerprint)
		};
	};
	SDPUtils.writeDtlsParameters = function(params, setupType) {
		let sdp = "a=setup:" + setupType + "\r\n";
		params.fingerprints.forEach((fp) => {
			sdp += "a=fingerprint:" + fp.algorithm + " " + fp.value + "\r\n";
		});
		return sdp;
	};
	SDPUtils.parseCryptoLine = function(line) {
		const parts = line.substring(9).split(" ");
		return {
			tag: parseInt(parts[0], 10),
			cryptoSuite: parts[1],
			keyParams: parts[2],
			sessionParams: parts.slice(3)
		};
	};
	SDPUtils.writeCryptoLine = function(parameters) {
		return "a=crypto:" + parameters.tag + " " + parameters.cryptoSuite + " " + (typeof parameters.keyParams === "object" ? SDPUtils.writeCryptoKeyParams(parameters.keyParams) : parameters.keyParams) + (parameters.sessionParams ? " " + parameters.sessionParams.join(" ") : "") + "\r\n";
	};
	SDPUtils.parseCryptoKeyParams = function(keyParams) {
		if (keyParams.indexOf("inline:") !== 0) return null;
		const parts = keyParams.substring(7).split("|");
		return {
			keyMethod: "inline",
			keySalt: parts[0],
			lifeTime: parts[1],
			mkiValue: parts[2] ? parts[2].split(":")[0] : void 0,
			mkiLength: parts[2] ? parts[2].split(":")[1] : void 0
		};
	};
	SDPUtils.writeCryptoKeyParams = function(keyParams) {
		return keyParams.keyMethod + ":" + keyParams.keySalt + (keyParams.lifeTime ? "|" + keyParams.lifeTime : "") + (keyParams.mkiValue && keyParams.mkiLength ? "|" + keyParams.mkiValue + ":" + keyParams.mkiLength : "");
	};
	SDPUtils.getCryptoParameters = function(mediaSection, sessionpart) {
		return SDPUtils.matchPrefix(mediaSection + sessionpart, "a=crypto:").map(SDPUtils.parseCryptoLine);
	};
	SDPUtils.getIceParameters = function(mediaSection, sessionpart) {
		const ufrag = SDPUtils.matchPrefix(mediaSection + sessionpart, "a=ice-ufrag:")[0];
		const pwd = SDPUtils.matchPrefix(mediaSection + sessionpart, "a=ice-pwd:")[0];
		if (!(ufrag && pwd)) return null;
		return {
			usernameFragment: ufrag.substring(12),
			password: pwd.substring(10)
		};
	};
	SDPUtils.writeIceParameters = function(params) {
		let sdp = "a=ice-ufrag:" + params.usernameFragment + "\r\na=ice-pwd:" + params.password + "\r\n";
		if (params.iceLite) sdp += "a=ice-lite\r\n";
		return sdp;
	};
	SDPUtils.parseRtpParameters = function(mediaSection) {
		const description = {
			codecs: [],
			headerExtensions: [],
			fecMechanisms: [],
			rtcp: []
		};
		const mline = SDPUtils.splitLines(mediaSection)[0].split(" ");
		description.profile = mline[2];
		for (let i = 3; i < mline.length; i++) {
			const pt = mline[i];
			const rtpmapline = SDPUtils.matchPrefix(mediaSection, "a=rtpmap:" + pt + " ")[0];
			if (rtpmapline) {
				const codec = SDPUtils.parseRtpMap(rtpmapline);
				const fmtps = SDPUtils.matchPrefix(mediaSection, "a=fmtp:" + pt + " ");
				codec.parameters = fmtps.length ? SDPUtils.parseFmtp(fmtps[0]) : {};
				codec.rtcpFeedback = SDPUtils.matchPrefix(mediaSection, "a=rtcp-fb:" + pt + " ").map(SDPUtils.parseRtcpFb);
				description.codecs.push(codec);
				switch (codec.name.toUpperCase()) {
					case "RED":
					case "ULPFEC": description.fecMechanisms.push(codec.name.toUpperCase());
				}
			}
		}
		SDPUtils.matchPrefix(mediaSection, "a=extmap:").forEach((line) => {
			description.headerExtensions.push(SDPUtils.parseExtmap(line));
		});
		const wildcardRtcpFb = SDPUtils.matchPrefix(mediaSection, "a=rtcp-fb:* ").map(SDPUtils.parseRtcpFb);
		description.codecs.forEach((codec) => {
			wildcardRtcpFb.forEach((fb) => {
				if (!codec.rtcpFeedback.find((existingFeedback) => {
					return existingFeedback.type === fb.type && existingFeedback.parameter === fb.parameter;
				})) codec.rtcpFeedback.push(fb);
			});
		});
		return description;
	};
	SDPUtils.writeRtpDescription = function(kind, caps) {
		let sdp = "";
		sdp += "m=" + kind + " ";
		sdp += caps.codecs.length > 0 ? "9" : "0";
		sdp += " " + (caps.profile || "UDP/TLS/RTP/SAVPF") + " ";
		sdp += caps.codecs.map((codec) => {
			if (codec.preferredPayloadType !== void 0) return codec.preferredPayloadType;
			return codec.payloadType;
		}).join(" ") + "\r\n";
		sdp += "c=IN IP4 0.0.0.0\r\n";
		sdp += "a=rtcp:9 IN IP4 0.0.0.0\r\n";
		caps.codecs.forEach((codec) => {
			sdp += SDPUtils.writeRtpMap(codec);
			sdp += SDPUtils.writeFmtp(codec);
			sdp += SDPUtils.writeRtcpFb(codec);
		});
		let maxptime = 0;
		caps.codecs.forEach((codec) => {
			if (codec.maxptime > maxptime) maxptime = codec.maxptime;
		});
		if (maxptime > 0) sdp += "a=maxptime:" + maxptime + "\r\n";
		if (caps.headerExtensions) caps.headerExtensions.forEach((extension) => {
			sdp += SDPUtils.writeExtmap(extension);
		});
		return sdp;
	};
	SDPUtils.parseRtpEncodingParameters = function(mediaSection) {
		const encodingParameters = [];
		const description = SDPUtils.parseRtpParameters(mediaSection);
		const hasRed = description.fecMechanisms.indexOf("RED") !== -1;
		const hasUlpfec = description.fecMechanisms.indexOf("ULPFEC") !== -1;
		const ssrcs = SDPUtils.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils.parseSsrcMedia(line)).filter((parts) => parts.attribute === "cname");
		const primarySsrc = ssrcs.length > 0 && ssrcs[0].ssrc;
		let secondarySsrc;
		const flows = SDPUtils.matchPrefix(mediaSection, "a=ssrc-group:FID").map((line) => {
			return line.substring(17).split(" ").map((part) => parseInt(part, 10));
		});
		if (flows.length > 0 && flows[0].length > 1 && flows[0][0] === primarySsrc) secondarySsrc = flows[0][1];
		description.codecs.forEach((codec) => {
			if (codec.name.toUpperCase() === "RTX" && codec.parameters.apt) {
				let encParam = {
					ssrc: primarySsrc,
					codecPayloadType: parseInt(codec.parameters.apt, 10)
				};
				if (primarySsrc && secondarySsrc) encParam.rtx = { ssrc: secondarySsrc };
				encodingParameters.push(encParam);
				if (hasRed) {
					encParam = JSON.parse(JSON.stringify(encParam));
					encParam.fec = {
						ssrc: primarySsrc,
						mechanism: hasUlpfec ? "red+ulpfec" : "red"
					};
					encodingParameters.push(encParam);
				}
			}
		});
		if (encodingParameters.length === 0 && primarySsrc) encodingParameters.push({ ssrc: primarySsrc });
		let bandwidth = SDPUtils.matchPrefix(mediaSection, "b=");
		if (bandwidth.length) {
			if (bandwidth[0].indexOf("b=TIAS:") === 0) bandwidth = parseInt(bandwidth[0].substring(7), 10);
			else if (bandwidth[0].indexOf("b=AS:") === 0) bandwidth = parseInt(bandwidth[0].substring(5), 10) * 1e3 * .95 - 16e3;
			else bandwidth = void 0;
			encodingParameters.forEach((params) => {
				params.maxBitrate = bandwidth;
			});
		}
		return encodingParameters;
	};
	SDPUtils.parseRtcpParameters = function(mediaSection) {
		const rtcpParameters = {};
		const remoteSsrc = SDPUtils.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils.parseSsrcMedia(line)).filter((obj) => obj.attribute === "cname")[0];
		if (remoteSsrc) {
			rtcpParameters.cname = remoteSsrc.value;
			rtcpParameters.ssrc = remoteSsrc.ssrc;
		}
		const rsize = SDPUtils.matchPrefix(mediaSection, "a=rtcp-rsize");
		rtcpParameters.reducedSize = rsize.length > 0;
		rtcpParameters.compound = rsize.length === 0;
		rtcpParameters.mux = SDPUtils.matchPrefix(mediaSection, "a=rtcp-mux").length > 0;
		return rtcpParameters;
	};
	SDPUtils.writeRtcpParameters = function(rtcpParameters) {
		let sdp = "";
		if (rtcpParameters.reducedSize) sdp += "a=rtcp-rsize\r\n";
		if (rtcpParameters.mux) sdp += "a=rtcp-mux\r\n";
		if (rtcpParameters.ssrc !== void 0 && rtcpParameters.cname) sdp += "a=ssrc:" + rtcpParameters.ssrc + " cname:" + rtcpParameters.cname + "\r\n";
		return sdp;
	};
	SDPUtils.parseMsid = function(mediaSection) {
		let parts;
		const spec = SDPUtils.matchPrefix(mediaSection, "a=msid:");
		if (spec.length === 1) {
			parts = spec[0].substring(7).split(" ");
			return {
				stream: parts[0],
				track: parts[1]
			};
		}
		const planB = SDPUtils.matchPrefix(mediaSection, "a=ssrc:").map((line) => SDPUtils.parseSsrcMedia(line)).filter((msidParts) => msidParts.attribute === "msid");
		if (planB.length > 0) {
			parts = planB[0].value.split(" ");
			return {
				stream: parts[0],
				track: parts[1]
			};
		}
	};
	SDPUtils.parseSctpDescription = function(mediaSection) {
		const mline = SDPUtils.parseMLine(mediaSection);
		const maxSizeLine = SDPUtils.matchPrefix(mediaSection, "a=max-message-size:");
		let maxMessageSize;
		if (maxSizeLine.length > 0) maxMessageSize = parseInt(maxSizeLine[0].substring(19), 10);
		if (isNaN(maxMessageSize)) maxMessageSize = 65536;
		const sctpPort = SDPUtils.matchPrefix(mediaSection, "a=sctp-port:");
		if (sctpPort.length > 0) return {
			port: parseInt(sctpPort[0].substring(12), 10),
			protocol: mline.fmt,
			maxMessageSize
		};
		const sctpMapLines = SDPUtils.matchPrefix(mediaSection, "a=sctpmap:");
		if (sctpMapLines.length > 0) {
			const parts = sctpMapLines[0].substring(10).split(" ");
			return {
				port: parseInt(parts[0], 10),
				protocol: parts[1],
				maxMessageSize
			};
		}
	};
	SDPUtils.writeSctpDescription = function(media, sctp) {
		let output = [];
		if (media.protocol !== "DTLS/SCTP") output = [
			"m=" + media.kind + " 9 " + media.protocol + " " + sctp.protocol + "\r\n",
			"c=IN IP4 0.0.0.0\r\n",
			"a=sctp-port:" + sctp.port + "\r\n"
		];
		else output = [
			"m=" + media.kind + " 9 " + media.protocol + " " + sctp.port + "\r\n",
			"c=IN IP4 0.0.0.0\r\n",
			"a=sctpmap:" + sctp.port + " " + sctp.protocol + " 65535\r\n"
		];
		if (sctp.maxMessageSize !== void 0) output.push("a=max-message-size:" + sctp.maxMessageSize + "\r\n");
		return output.join("");
	};
	SDPUtils.generateSessionId = function() {
		return Math.random().toString().substr(2, 22);
	};
	SDPUtils.writeSessionBoilerplate = function(sessId, sessVer, sessUser) {
		let sessionId;
		const version = sessVer !== void 0 ? sessVer : 2;
		if (sessId) sessionId = sessId;
		else sessionId = SDPUtils.generateSessionId();
		return "v=0\r\no=" + (sessUser || "thisisadapterortc") + " " + sessionId + " " + version + " IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n";
	};
	SDPUtils.getDirection = function(mediaSection, sessionpart) {
		const lines = SDPUtils.splitLines(mediaSection);
		for (let i = 0; i < lines.length; i++) switch (lines[i]) {
			case "a=sendrecv":
			case "a=sendonly":
			case "a=recvonly":
			case "a=inactive": return lines[i].substring(2);
		}
		if (sessionpart) return SDPUtils.getDirection(sessionpart);
		return "sendrecv";
	};
	SDPUtils.getKind = function(mediaSection) {
		return SDPUtils.splitLines(mediaSection)[0].split(" ")[0].substring(2);
	};
	SDPUtils.isRejected = function(mediaSection) {
		return mediaSection.split(" ", 2)[1] === "0";
	};
	SDPUtils.parseMLine = function(mediaSection) {
		const parts = SDPUtils.splitLines(mediaSection)[0].substring(2).split(" ");
		return {
			kind: parts[0],
			port: parseInt(parts[1], 10),
			protocol: parts[2],
			fmt: parts.slice(3).join(" ")
		};
	};
	SDPUtils.parseOLine = function(mediaSection) {
		const parts = SDPUtils.matchPrefix(mediaSection, "o=")[0].substring(2).split(" ");
		return {
			username: parts[0],
			sessionId: parts[1],
			sessionVersion: parseInt(parts[2], 10),
			netType: parts[3],
			addressType: parts[4],
			address: parts[5]
		};
	};
	SDPUtils.isValidSDP = function(blob) {
		if (typeof blob !== "string" || blob.length === 0) return false;
		const lines = SDPUtils.splitLines(blob);
		for (let i = 0; i < lines.length; i++) if (lines[i].length < 2 || lines[i].charAt(1) !== "=") return false;
		return true;
	};
	if (typeof module === "object") module.exports = SDPUtils;
}));
// node_modules/webrtc-adapter/src/js/common_shim.js
var common_shim_exports = /* @__PURE__ */ __exportAll({
	removeExtmapAllowMixed: () => removeExtmapAllowMixed,
	shimAddIceCandidateNullOrEmpty: () => shimAddIceCandidateNullOrEmpty,
	shimConnectionState: () => shimConnectionState,
	shimMaxMessageSize: () => shimMaxMessageSize,
	shimParameterlessSetLocalDescription: () => shimParameterlessSetLocalDescription,
	shimRTCIceCandidate: () => shimRTCIceCandidate,
	shimRTCIceCandidateRelayProtocol: () => shimRTCIceCandidateRelayProtocol,
	shimSendThrowTypeError: () => shimSendThrowTypeError
});
var import_sdp = /* @__PURE__ */ __toESM(require_sdp());
function shimRTCIceCandidate(window) {
	if (!window.RTCIceCandidate || window.RTCIceCandidate && "foundation" in window.RTCIceCandidate.prototype) return;
	const NativeRTCIceCandidate = window.RTCIceCandidate;
	window.RTCIceCandidate = function RTCIceCandidate(args) {
		if (typeof args === "object" && args.candidate && args.candidate.indexOf("a=") === 0) {
			args = JSON.parse(JSON.stringify(args));
			args.candidate = args.candidate.substring(2);
		}
		if (args.candidate && args.candidate.length) {
			const nativeCandidate = new NativeRTCIceCandidate(args);
			const parsedCandidate = import_sdp.default.parseCandidate(args.candidate);
			for (const key in parsedCandidate) if (!(key in nativeCandidate)) Object.defineProperty(nativeCandidate, key, { value: parsedCandidate[key] });
			nativeCandidate.toJSON = function toJSON() {
				return {
					candidate: nativeCandidate.candidate,
					sdpMid: nativeCandidate.sdpMid,
					sdpMLineIndex: nativeCandidate.sdpMLineIndex,
					usernameFragment: nativeCandidate.usernameFragment
				};
			};
			return nativeCandidate;
		}
		return new NativeRTCIceCandidate(args);
	};
	window.RTCIceCandidate.prototype = NativeRTCIceCandidate.prototype;
	wrapPeerConnectionEvent(window, "icecandidate", (e) => {
		if (e.candidate) Object.defineProperty(e, "candidate", {
			value: new window.RTCIceCandidate(e.candidate),
			writable: "false"
		});
		return e;
	});
}
function shimRTCIceCandidateRelayProtocol(window) {
	if (!window.RTCIceCandidate || window.RTCIceCandidate && "relayProtocol" in window.RTCIceCandidate.prototype) return;
	wrapPeerConnectionEvent(window, "icecandidate", (e) => {
		if (e.candidate) {
			const parsedCandidate = import_sdp.default.parseCandidate(e.candidate.candidate);
			if (parsedCandidate.type === "relay") e.candidate.relayProtocol = {
				0: "tls",
				1: "tcp",
				2: "udp"
			}[parsedCandidate.priority >> 24];
		}
		return e;
	});
}
function shimMaxMessageSize(window, browserDetails) {
	if (!window.RTCPeerConnection) return;
	if (browserDetails.browser === "chrome" && browserDetails.version > 102) return;
	if (browserDetails.browser === "firefox" && browserDetails.version >= 113) return;
	if (!("sctp" in window.RTCPeerConnection.prototype)) Object.defineProperty(window.RTCPeerConnection.prototype, "sctp", { get() {
		return typeof this._sctp === "undefined" ? null : this._sctp;
	} });
	const sctpInDescription = function(description) {
		if (!description || !description.sdp) return false;
		const sections = import_sdp.default.splitSections(description.sdp);
		sections.shift();
		return sections.some((mediaSection) => {
			const mLine = import_sdp.default.parseMLine(mediaSection);
			return mLine && mLine.kind === "application" && mLine.protocol.indexOf("SCTP") !== -1;
		});
	};
	const getRemoteFirefoxVersion = function(description) {
		const match = description.sdp.match(/mozilla...THIS_IS_SDPARTA-(\d+)/);
		if (match === null || match.length < 2) return -1;
		const version = parseInt(match[1], 10);
		return version !== version ? -1 : version;
	};
	const getCanSendMaxMessageSize = function(remoteIsFirefox) {
		let canSendMaxMessageSize = 65536;
		if (browserDetails.browser === "firefox") {
			if (browserDetails.version < 57) {
				if (remoteIsFirefox === -1) canSendMaxMessageSize = 16384;
				else canSendMaxMessageSize = 0x7ffffff5;
			} else if (browserDetails.version < 60) canSendMaxMessageSize = browserDetails.version === 57 ? 65535 : 65536;
			else canSendMaxMessageSize = 0x7ffffff5;
		}
		return canSendMaxMessageSize;
	};
	const getMaxMessageSize = function(description, remoteIsFirefox) {
		let maxMessageSize = 65536;
		if (browserDetails.browser === "firefox" && browserDetails.version === 57) maxMessageSize = 65535;
		const match = import_sdp.default.matchPrefix(description.sdp, "a=max-message-size:");
		if (match.length > 0) maxMessageSize = parseInt(match[0].substring(19), 10);
		else if (browserDetails.browser === "firefox" && remoteIsFirefox !== -1) maxMessageSize = 0x7ffffff5;
		return maxMessageSize;
	};
	const origSetRemoteDescription = window.RTCPeerConnection.prototype.setRemoteDescription;
	window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription() {
		this._sctp = null;
		if (browserDetails.browser === "chrome" && browserDetails.version >= 76) {
			const { sdpSemantics } = this.getConfiguration();
			if (sdpSemantics === "plan-b") Object.defineProperty(this, "sctp", {
				get() {
					return typeof this._sctp === "undefined" ? null : this._sctp;
				},
				enumerable: true,
				configurable: true
			});
		}
		if (sctpInDescription(arguments[0])) {
			const isFirefox = getRemoteFirefoxVersion(arguments[0]);
			const canSendMMS = getCanSendMaxMessageSize(isFirefox);
			const remoteMMS = getMaxMessageSize(arguments[0], isFirefox);
			let maxMessageSize;
			if (canSendMMS === 0 && remoteMMS === 0) maxMessageSize = Number.POSITIVE_INFINITY;
			else if (canSendMMS === 0 || remoteMMS === 0) maxMessageSize = Math.max(canSendMMS, remoteMMS);
			else maxMessageSize = Math.min(canSendMMS, remoteMMS);
			const sctp = {};
			Object.defineProperty(sctp, "maxMessageSize", { get() {
				return maxMessageSize;
			} });
			this._sctp = sctp;
		}
		return origSetRemoteDescription.apply(this, arguments);
	};
}
function shimSendThrowTypeError(window, browserDetails) {
	if (!(window.RTCPeerConnection && "createDataChannel" in window.RTCPeerConnection.prototype)) return;
	if (browserDetails.browser === "chrome" && browserDetails.version >= 149) return;
	if (browserDetails.browser === "firefox" && browserDetails.version > 60) return;
	function wrapDcSend(dc, pc) {
		const origDataChannelSend = dc.send;
		dc.send = function send() {
			const data = arguments[0];
			const length = data.length || data.size || data.byteLength;
			if (dc.readyState === "open" && pc.sctp && length > pc.sctp.maxMessageSize) throw new TypeError("Message too large (can send a maximum of " + pc.sctp.maxMessageSize + " bytes)");
			return origDataChannelSend.apply(dc, arguments);
		};
	}
	const origCreateDataChannel = window.RTCPeerConnection.prototype.createDataChannel;
	window.RTCPeerConnection.prototype.createDataChannel = function createDataChannel() {
		const dataChannel = origCreateDataChannel.apply(this, arguments);
		wrapDcSend(dataChannel, this);
		return dataChannel;
	};
	wrapPeerConnectionEvent(window, "datachannel", (e) => {
		wrapDcSend(e.channel, e.target);
		return e;
	});
}
function shimConnectionState(window) {
	if (!window.RTCPeerConnection || "connectionState" in window.RTCPeerConnection.prototype) return;
	const proto = window.RTCPeerConnection.prototype;
	Object.defineProperty(proto, "connectionState", {
		get() {
			return {
				completed: "connected",
				checking: "connecting"
			}[this.iceConnectionState] || this.iceConnectionState;
		},
		enumerable: true,
		configurable: true
	});
	Object.defineProperty(proto, "onconnectionstatechange", {
		get() {
			return this._onconnectionstatechange || null;
		},
		set(cb) {
			if (this._onconnectionstatechange) {
				this.removeEventListener("connectionstatechange", this._onconnectionstatechange);
				delete this._onconnectionstatechange;
			}
			if (cb) this.addEventListener("connectionstatechange", this._onconnectionstatechange = cb);
		},
		enumerable: true,
		configurable: true
	});
	["setLocalDescription", "setRemoteDescription"].forEach((method) => {
		const origMethod = proto[method];
		proto[method] = function() {
			if (!this._connectionstatechangepoly) {
				this._connectionstatechangepoly = (e) => {
					const pc = e.target;
					if (pc._lastConnectionState !== pc.connectionState) {
						pc._lastConnectionState = pc.connectionState;
						const newEvent = new Event("connectionstatechange", e);
						pc.dispatchEvent(newEvent);
					}
					return e;
				};
				this.addEventListener("iceconnectionstatechange", this._connectionstatechangepoly);
			}
			return origMethod.apply(this, arguments);
		};
	});
}
function removeExtmapAllowMixed(window, browserDetails) {
	if (!window.RTCPeerConnection) return;
	if (browserDetails.browser === "chrome" && browserDetails.version >= 71) return;
	if (browserDetails.browser === "safari" && browserDetails._safariVersion >= 13.1) return;
	const nativeSRD = window.RTCPeerConnection.prototype.setRemoteDescription;
	window.RTCPeerConnection.prototype.setRemoteDescription = function setRemoteDescription(desc) {
		if (desc && desc.sdp && desc.sdp.indexOf("\na=extmap-allow-mixed") !== -1) {
			const sdp = desc.sdp.split("\n").filter((line) => {
				return line.trim() !== "a=extmap-allow-mixed";
			}).join("\n");
			if (window.RTCSessionDescription && desc instanceof window.RTCSessionDescription) arguments[0] = new window.RTCSessionDescription({
				type: desc.type,
				sdp
			});
			else desc.sdp = sdp;
		}
		return nativeSRD.apply(this, arguments);
	};
}
function shimAddIceCandidateNullOrEmpty(window, browserDetails) {
	if (!(window.RTCPeerConnection && window.RTCPeerConnection.prototype)) return;
	const nativeAddIceCandidate = window.RTCPeerConnection.prototype.addIceCandidate;
	if (!nativeAddIceCandidate || nativeAddIceCandidate.length === 0) return;
	window.RTCPeerConnection.prototype.addIceCandidate = function addIceCandidate() {
		if (!arguments[0]) {
			if (arguments[1]) arguments[1].apply(null);
			return Promise.resolve();
		}
		if ((browserDetails.browser === "chrome" && browserDetails.version < 78 || browserDetails.browser === "firefox" && browserDetails.version < 68 || browserDetails.browser === "safari") && arguments[0] && arguments[0].candidate === "") return Promise.resolve();
		return nativeAddIceCandidate.apply(this, arguments);
	};
}
function shimParameterlessSetLocalDescription(window, browserDetails) {
	if (!(window.RTCPeerConnection && window.RTCPeerConnection.prototype)) return;
	const nativeSetLocalDescription = window.RTCPeerConnection.prototype.setLocalDescription;
	if (!nativeSetLocalDescription || nativeSetLocalDescription.length === 0) return;
	window.RTCPeerConnection.prototype.setLocalDescription = function setLocalDescription() {
		let desc = arguments[0] || {};
		if (typeof desc !== "object" || desc.type && desc.sdp) return nativeSetLocalDescription.apply(this, arguments);
		desc = {
			type: desc.type,
			sdp: desc.sdp
		};
		if (!desc.type) switch (this.signalingState) {
			case "stable":
			case "have-local-offer":
			case "have-remote-pranswer":
				desc.type = "offer";
				break;
			default: desc.type = "answer";
		}
		if (desc.sdp || desc.type !== "offer" && desc.type !== "answer") return nativeSetLocalDescription.apply(this, [desc]);
		return (desc.type === "offer" ? this.createOffer : this.createAnswer).apply(this).then((d) => nativeSetLocalDescription.apply(this, [d]));
	};
}
// node_modules/webrtc-adapter/src/js/adapter_factory.js
function adapterFactory({ window } = {}, options = {
	shimChrome: true,
	shimFirefox: true,
	shimSafari: true
}) {
	const logging = log;
	const browserDetails = detectBrowser(window);
	const adapter = {
		browserDetails,
		commonShim: common_shim_exports,
		extractVersion,
		disableLog,
		disableWarnings,
		sdp: import_sdp
	};
	switch (browserDetails.browser) {
		case "chrome":
			if (!chrome_shim_exports || !shimPeerConnection$1 || !options.shimChrome) {
				logging("Chrome shim is not included in this adapter release.");
				return adapter;
			}
			if (browserDetails.version === null) {
				logging("Chrome shim can not determine version, not shimming.");
				return adapter;
			}
			logging("adapter.js shimming chrome.");
			adapter.browserShim = chrome_shim_exports;
			shimAddIceCandidateNullOrEmpty(window, browserDetails);
			shimParameterlessSetLocalDescription(window, browserDetails);
			shimGetUserMedia$2(window, browserDetails);
			shimMediaStream(window, browserDetails);
			shimPeerConnection$1(window, browserDetails);
			shimOnTrack$1(window, browserDetails);
			shimAddTrackRemoveTrack(window, browserDetails);
			shimGetSendersWithDtmf(window, browserDetails);
			shimSenderReceiverGetStats(window, browserDetails);
			fixNegotiationNeeded(window, browserDetails);
			shimRTCIceCandidate(window, browserDetails);
			shimRTCIceCandidateRelayProtocol(window, browserDetails);
			shimConnectionState(window, browserDetails);
			shimMaxMessageSize(window, browserDetails);
			shimSendThrowTypeError(window, browserDetails);
			removeExtmapAllowMixed(window, browserDetails);
			break;
		case "firefox":
			if (!firefox_shim_exports || !shimPeerConnection || !options.shimFirefox) {
				logging("Firefox shim is not included in this adapter release.");
				return adapter;
			}
			logging("adapter.js shimming firefox.");
			adapter.browserShim = firefox_shim_exports;
			shimAddIceCandidateNullOrEmpty(window, browserDetails);
			shimParameterlessSetLocalDescription(window, browserDetails);
			shimGetUserMedia$1(window, browserDetails);
			shimPeerConnection(window, browserDetails);
			shimGetStats(window, browserDetails);
			shimOnTrack(window, browserDetails);
			shimRemoveStream(window, browserDetails);
			shimSenderGetStats(window, browserDetails);
			shimReceiverGetStats(window, browserDetails);
			shimRTCDataChannel(window, browserDetails);
			shimAddTransceiver(window, browserDetails);
			shimGetParameters(window, browserDetails);
			shimCreateOffer(window, browserDetails);
			shimCreateAnswer(window, browserDetails);
			shimRTCIceCandidate(window, browserDetails);
			shimConnectionState(window, browserDetails);
			shimMaxMessageSize(window, browserDetails);
			shimSendThrowTypeError(window, browserDetails);
			break;
		case "safari":
			if (!safari_shim_exports || !options.shimSafari) {
				logging("Safari shim is not included in this adapter release.");
				return adapter;
			}
			logging("adapter.js shimming safari.");
			adapter.browserShim = safari_shim_exports;
			shimAddIceCandidateNullOrEmpty(window, browserDetails);
			shimParameterlessSetLocalDescription(window, browserDetails);
			shimRTCIceServerUrls(window, browserDetails);
			shimCreateOfferLegacy(window, browserDetails);
			shimCallbacksAPI(window, browserDetails);
			shimLocalStreamsAPI(window, browserDetails);
			shimRemoteStreamsAPI(window, browserDetails);
			shimTrackEventTransceiver(window, browserDetails);
			shimGetUserMedia(window, browserDetails);
			shimAudioContext(window, browserDetails);
			shimRTCIceCandidate(window, browserDetails);
			shimRTCIceCandidateRelayProtocol(window, browserDetails);
			shimMaxMessageSize(window, browserDetails);
			shimSendThrowTypeError(window, browserDetails);
			removeExtmapAllowMixed(window, browserDetails);
			break;
		default: logging("Unsupported browser!");
	}
	return adapter;
}
// node_modules/webrtc-adapter/src/js/adapter_core.js
var adapter = adapterFactory({ window: typeof window === "undefined" ? void 0 : window });
// node_modules/peerjs/dist/bundler.mjs
function $parcel$export(e, n, v, s) {
	Object.defineProperty(e, n, {
		get: v,
		set: s,
		enumerable: true,
		configurable: true
	});
}
var $fcbcc7538a6776d5$export$f1c5f4c9cb95390b = class {
	constructor() {
		this.chunkedMTU = 16300;
		this._dataCount = 1;
		this.chunk = (blob) => {
			const chunks = [];
			const size = blob.byteLength;
			const total = Math.ceil(size / this.chunkedMTU);
			let index = 0;
			let start = 0;
			while (start < size) {
				const end = Math.min(size, start + this.chunkedMTU);
				const b = blob.slice(start, end);
				const chunk = {
					__peerData: this._dataCount,
					n: index,
					data: b,
					total
				};
				chunks.push(chunk);
				start = end;
				index++;
			}
			this._dataCount++;
			return chunks;
		};
	}
};
function $fcbcc7538a6776d5$export$52c89ebcdc4f53f2(bufs) {
	let size = 0;
	for (const buf of bufs) size += buf.byteLength;
	const result = new Uint8Array(size);
	let offset = 0;
	for (const buf of bufs) {
		result.set(buf, offset);
		offset += buf.byteLength;
	}
	return result;
}
var $fb63e766cfafaab9$var$webRTCAdapter = adapter.default || adapter;
var $fb63e766cfafaab9$export$25be9502477c137d = new class {
	isWebRTCSupported() {
		return typeof RTCPeerConnection !== "undefined";
	}
	isBrowserSupported() {
		const browser = this.getBrowser();
		const version = this.getVersion();
		if (!this.supportedBrowsers.includes(browser)) return false;
		if (browser === "chrome") return version >= this.minChromeVersion;
		if (browser === "firefox") return version >= this.minFirefoxVersion;
		if (browser === "safari") return !this.isIOS && version >= this.minSafariVersion;
		return false;
	}
	getBrowser() {
		return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.browser;
	}
	getVersion() {
		return $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
	}
	isUnifiedPlanSupported() {
		const browser = this.getBrowser();
		const version = $fb63e766cfafaab9$var$webRTCAdapter.browserDetails.version || 0;
		if (browser === "chrome" && version < this.minChromeVersion) return false;
		if (browser === "firefox" && version >= this.minFirefoxVersion) return true;
		if (!window.RTCRtpTransceiver || !("currentDirection" in RTCRtpTransceiver.prototype)) return false;
		let tempPc;
		let supported = false;
		try {
			tempPc = new RTCPeerConnection();
			tempPc.addTransceiver("audio");
			supported = true;
		} catch (e) {} finally {
			if (tempPc) tempPc.close();
		}
		return supported;
	}
	toString() {
		return `Supports:
    browser:${this.getBrowser()}
    version:${this.getVersion()}
    isIOS:${this.isIOS}
    isWebRTCSupported:${this.isWebRTCSupported()}
    isBrowserSupported:${this.isBrowserSupported()}
    isUnifiedPlanSupported:${this.isUnifiedPlanSupported()}`;
	}
	constructor() {
		this.isIOS = typeof navigator !== "undefined" ? [
			"iPad",
			"iPhone",
			"iPod"
		].includes(navigator.platform) : false;
		this.supportedBrowsers = [
			"firefox",
			"chrome",
			"safari"
		];
		this.minFirefoxVersion = 59;
		this.minChromeVersion = 72;
		this.minSafariVersion = 605;
	}
}();
var $9a84a32bf0bf36bb$export$f35f128fd59ea256 = (id) => {
	return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(id);
};
var $0e5fd1585784c252$export$4e61f672936bec77 = () => Math.random().toString(36).slice(2);
var $4f4134156c446392$var$DEFAULT_CONFIG = {
	iceServers: [{ urls: "stun:stun.l.google.com:19302" }, {
		urls: ["turn:eu-0.turn.peerjs.com:3478", "turn:us-0.turn.peerjs.com:3478"],
		username: "peerjs",
		credential: "peerjsp"
	}],
	sdpSemantics: "unified-plan"
};
var $4f4134156c446392$export$f8f26dd395d7e1bd = class extends $fcbcc7538a6776d5$export$f1c5f4c9cb95390b {
	noop() {}
	blobToArrayBuffer(blob, cb) {
		const fr = new FileReader();
		fr.onload = function(evt) {
			if (evt.target) cb(evt.target.result);
		};
		fr.readAsArrayBuffer(blob);
		return fr;
	}
	binaryStringToArrayBuffer(binary) {
		const byteArray = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) byteArray[i] = binary.charCodeAt(i) & 255;
		return byteArray.buffer;
	}
	isSecure() {
		return location.protocol === "https:";
	}
	constructor(...args) {
		super(...args), this.CLOUD_HOST = "0.peerjs.com", this.CLOUD_PORT = 443, this.chunkedBrowsers = {
			Chrome: 1,
			chrome: 1
		}, this.defaultConfig = $4f4134156c446392$var$DEFAULT_CONFIG, this.browser = $fb63e766cfafaab9$export$25be9502477c137d.getBrowser(), this.browserVersion = $fb63e766cfafaab9$export$25be9502477c137d.getVersion(), this.pack = $0cfd7828ad59115f$export$2a703dbb0cb35339, this.unpack = $0cfd7828ad59115f$export$417857010dc9287f, this.supports = function() {
			const supported = {
				browser: $fb63e766cfafaab9$export$25be9502477c137d.isBrowserSupported(),
				webRTC: $fb63e766cfafaab9$export$25be9502477c137d.isWebRTCSupported(),
				audioVideo: false,
				data: false,
				binaryBlob: false,
				reliable: false
			};
			if (!supported.webRTC) return supported;
			let pc;
			try {
				pc = new RTCPeerConnection($4f4134156c446392$var$DEFAULT_CONFIG);
				supported.audioVideo = true;
				let dc;
				try {
					dc = pc.createDataChannel("_PEERJSTEST", { ordered: true });
					supported.data = true;
					supported.reliable = !!dc.ordered;
					try {
						dc.binaryType = "blob";
						supported.binaryBlob = !$fb63e766cfafaab9$export$25be9502477c137d.isIOS;
					} catch (e) {}
				} catch (e) {} finally {
					if (dc) dc.close();
				}
			} catch (e) {} finally {
				if (pc) pc.close();
			}
			return supported;
		}(), this.validateId = $9a84a32bf0bf36bb$export$f35f128fd59ea256, this.randomToken = $0e5fd1585784c252$export$4e61f672936bec77;
	}
};
var $4f4134156c446392$export$7debb50ef11d5e0b = new $4f4134156c446392$export$f8f26dd395d7e1bd();
var $257947e92926277a$var$LOG_PREFIX = "PeerJS: ";
var $257947e92926277a$var$Logger = class {
	get logLevel() {
		return this._logLevel;
	}
	set logLevel(logLevel) {
		this._logLevel = logLevel;
	}
	log(...args) {
		if (this._logLevel >= 3) this._print(3, ...args);
	}
	warn(...args) {
		if (this._logLevel >= 2) this._print(2, ...args);
	}
	error(...args) {
		if (this._logLevel >= 1) this._print(1, ...args);
	}
	setLogFunction(fn) {
		this._print = fn;
	}
	_print(logLevel, ...rest) {
		const copy = [$257947e92926277a$var$LOG_PREFIX, ...rest];
		for (const i in copy) if (copy[i] instanceof Error) copy[i] = "(" + copy[i].name + ") " + copy[i].message;
		if (logLevel >= 3) console.log(...copy);
		else if (logLevel >= 2) console.warn("WARNING", ...copy);
		else if (logLevel >= 1) console.error("ERROR", ...copy);
	}
	constructor() {
		this._logLevel = 0;
	}
};
var $257947e92926277a$export$2e2bcd8739ae039 = new $257947e92926277a$var$Logger();
var $c4dcfd1d1ea86647$exports = {};
var $c4dcfd1d1ea86647$var$has = Object.prototype.hasOwnProperty;
var $c4dcfd1d1ea86647$var$prefix = "~";
/**
* Constructor to create a storage for our `EE` objects.
* An `Events` instance is a plain object whose properties are event names.
*
* @constructor
* @private
*/ function $c4dcfd1d1ea86647$var$Events() {}
if (Object.create) {
	$c4dcfd1d1ea86647$var$Events.prototype = Object.create(null);
	if (!new $c4dcfd1d1ea86647$var$Events().__proto__) $c4dcfd1d1ea86647$var$prefix = false;
}
/**
* Representation of a single event listener.
*
* @param {Function} fn The listener function.
* @param {*} context The context to invoke the listener with.
* @param {Boolean} [once=false] Specify if the listener is a one-time listener.
* @constructor
* @private
*/ function $c4dcfd1d1ea86647$var$EE(fn, context, once) {
	this.fn = fn;
	this.context = context;
	this.once = once || false;
}
/**
* Add a listener for a given event.
*
* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
* @param {(String|Symbol)} event The event name.
* @param {Function} fn The listener function.
* @param {*} context The context to invoke the listener with.
* @param {Boolean} once Specify if the listener is a one-time listener.
* @returns {EventEmitter}
* @private
*/ function $c4dcfd1d1ea86647$var$addListener(emitter, event, fn, context, once) {
	if (typeof fn !== "function") throw new TypeError("The listener must be a function");
	var listener = new $c4dcfd1d1ea86647$var$EE(fn, context || emitter, once), evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
	if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	else emitter._events[evt] = [emitter._events[evt], listener];
	return emitter;
}
/**
* Clear event by name.
*
* @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
* @param {(String|Symbol)} evt The Event name.
* @private
*/ function $c4dcfd1d1ea86647$var$clearEvent(emitter, evt) {
	if (--emitter._eventsCount === 0) emitter._events = new $c4dcfd1d1ea86647$var$Events();
	else delete emitter._events[evt];
}
/**
* Minimal `EventEmitter` interface that is molded against the Node.js
* `EventEmitter` interface.
*
* @constructor
* @public
*/ function $c4dcfd1d1ea86647$var$EventEmitter() {
	this._events = new $c4dcfd1d1ea86647$var$Events();
	this._eventsCount = 0;
}
/**
* Return an array listing the events for which the emitter has registered
* listeners.
*
* @returns {Array}
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.eventNames = function eventNames() {
	var names = [], events, name;
	if (this._eventsCount === 0) return names;
	for (name in events = this._events) if ($c4dcfd1d1ea86647$var$has.call(events, name)) names.push($c4dcfd1d1ea86647$var$prefix ? name.slice(1) : name);
	if (Object.getOwnPropertySymbols) return names.concat(Object.getOwnPropertySymbols(events));
	return names;
};
/**
* Return the listeners registered for a given event.
*
* @param {(String|Symbol)} event The event name.
* @returns {Array} The registered listeners.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.listeners = function listeners(event) {
	var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, handlers = this._events[evt];
	if (!handlers) return [];
	if (handlers.fn) return [handlers.fn];
	for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) ee[i] = handlers[i].fn;
	return ee;
};
/**
* Return the number of listeners listening to a given event.
*
* @param {(String|Symbol)} event The event name.
* @returns {Number} The number of listeners.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.listenerCount = function listenerCount(event) {
	var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event, listeners = this._events[evt];
	if (!listeners) return 0;
	if (listeners.fn) return 1;
	return listeners.length;
};
/**
* Calls each of the listeners registered for a given event.
*
* @param {(String|Symbol)} event The event name.
* @returns {Boolean} `true` if the event had listeners, else `false`.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
	if (!this._events[evt]) return false;
	var listeners = this._events[evt], len = arguments.length, args, i;
	if (listeners.fn) {
		if (listeners.once) this.removeListener(event, listeners.fn, void 0, true);
		switch (len) {
			case 1: return listeners.fn.call(listeners.context), true;
			case 2: return listeners.fn.call(listeners.context, a1), true;
			case 3: return listeners.fn.call(listeners.context, a1, a2), true;
			case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
			case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
			case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
		}
		for (i = 1, args = new Array(len - 1); i < len; i++) args[i - 1] = arguments[i];
		listeners.fn.apply(listeners.context, args);
	} else {
		var length = listeners.length, j;
		for (i = 0; i < length; i++) {
			if (listeners[i].once) this.removeListener(event, listeners[i].fn, void 0, true);
			switch (len) {
				case 1:
					listeners[i].fn.call(listeners[i].context);
					break;
				case 2:
					listeners[i].fn.call(listeners[i].context, a1);
					break;
				case 3:
					listeners[i].fn.call(listeners[i].context, a1, a2);
					break;
				case 4:
					listeners[i].fn.call(listeners[i].context, a1, a2, a3);
					break;
				default:
					if (!args) for (j = 1, args = new Array(len - 1); j < len; j++) args[j - 1] = arguments[j];
					listeners[i].fn.apply(listeners[i].context, args);
			}
		}
	}
	return true;
};
/**
* Add a listener for a given event.
*
* @param {(String|Symbol)} event The event name.
* @param {Function} fn The listener function.
* @param {*} [context=this] The context to invoke the listener with.
* @returns {EventEmitter} `this`.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.on = function on(event, fn, context) {
	return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, false);
};
/**
* Add a one-time listener for a given event.
*
* @param {(String|Symbol)} event The event name.
* @param {Function} fn The listener function.
* @param {*} [context=this] The context to invoke the listener with.
* @returns {EventEmitter} `this`.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.once = function once(event, fn, context) {
	return $c4dcfd1d1ea86647$var$addListener(this, event, fn, context, true);
};
/**
* Remove the listeners of a given event.
*
* @param {(String|Symbol)} event The event name.
* @param {Function} fn Only remove the listeners that match this function.
* @param {*} context Only remove the listeners that have this context.
* @param {Boolean} once Only remove one-time listeners.
* @returns {EventEmitter} `this`.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	var evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
	if (!this._events[evt]) return this;
	if (!fn) {
		$c4dcfd1d1ea86647$var$clearEvent(this, evt);
		return this;
	}
	var listeners = this._events[evt];
	if (listeners.fn) {
		if (listeners.fn === fn && (!once || listeners.once) && (!context || listeners.context === context)) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
	} else {
		for (var i = 0, events = [], length = listeners.length; i < length; i++) if (listeners[i].fn !== fn || once && !listeners[i].once || context && listeners[i].context !== context) events.push(listeners[i]);
		if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
		else $c4dcfd1d1ea86647$var$clearEvent(this, evt);
	}
	return this;
};
/**
* Remove all listeners, or those of the specified event.
*
* @param {(String|Symbol)} [event] The event name.
* @returns {EventEmitter} `this`.
* @public
*/ $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	var evt;
	if (event) {
		evt = $c4dcfd1d1ea86647$var$prefix ? $c4dcfd1d1ea86647$var$prefix + event : event;
		if (this._events[evt]) $c4dcfd1d1ea86647$var$clearEvent(this, evt);
	} else {
		this._events = new $c4dcfd1d1ea86647$var$Events();
		this._eventsCount = 0;
	}
	return this;
};
$c4dcfd1d1ea86647$var$EventEmitter.prototype.off = $c4dcfd1d1ea86647$var$EventEmitter.prototype.removeListener;
$c4dcfd1d1ea86647$var$EventEmitter.prototype.addListener = $c4dcfd1d1ea86647$var$EventEmitter.prototype.on;
$c4dcfd1d1ea86647$var$EventEmitter.prefixed = $c4dcfd1d1ea86647$var$prefix;
$c4dcfd1d1ea86647$var$EventEmitter.EventEmitter = $c4dcfd1d1ea86647$var$EventEmitter;
$c4dcfd1d1ea86647$exports = $c4dcfd1d1ea86647$var$EventEmitter;
var $78455e22dea96b8c$exports = {};
$parcel$export($78455e22dea96b8c$exports, "ConnectionType", () => $78455e22dea96b8c$export$3157d57b4135e3bc);
$parcel$export($78455e22dea96b8c$exports, "PeerErrorType", () => $78455e22dea96b8c$export$9547aaa2e39030ff);
$parcel$export($78455e22dea96b8c$exports, "BaseConnectionErrorType", () => $78455e22dea96b8c$export$7974935686149686);
$parcel$export($78455e22dea96b8c$exports, "DataConnectionErrorType", () => $78455e22dea96b8c$export$49ae800c114df41d);
$parcel$export($78455e22dea96b8c$exports, "SerializationType", () => $78455e22dea96b8c$export$89f507cf986a947);
$parcel$export($78455e22dea96b8c$exports, "SocketEventType", () => $78455e22dea96b8c$export$3b5c4a4b6354f023);
$parcel$export($78455e22dea96b8c$exports, "ServerMessageType", () => $78455e22dea96b8c$export$adb4a1754da6f10d);
var $78455e22dea96b8c$export$3157d57b4135e3bc = /*#__PURE__*/ function(ConnectionType) {
	ConnectionType["Data"] = "data";
	ConnectionType["Media"] = "media";
	return ConnectionType;
}({});
var $78455e22dea96b8c$export$9547aaa2e39030ff = /*#__PURE__*/ function(PeerErrorType) {
	/**
	* The client's browser does not support some or all WebRTC features that you are trying to use.
	*/ PeerErrorType["BrowserIncompatible"] = "browser-incompatible";
	/**
	* You've already disconnected this peer from the server and can no longer make any new connections on it.
	*/ PeerErrorType["Disconnected"] = "disconnected";
	/**
	* The ID passed into the Peer constructor contains illegal characters.
	*/ PeerErrorType["InvalidID"] = "invalid-id";
	/**
	* The API key passed into the Peer constructor contains illegal characters or is not in the system (cloud server only).
	*/ PeerErrorType["InvalidKey"] = "invalid-key";
	/**
	* Lost or cannot establish a connection to the signalling server.
	*/ PeerErrorType["Network"] = "network";
	/**
	* The peer you're trying to connect to does not exist.
	*/ PeerErrorType["PeerUnavailable"] = "peer-unavailable";
	/**
	* PeerJS is being used securely, but the cloud server does not support SSL. Use a custom PeerServer.
	*/ PeerErrorType["SslUnavailable"] = "ssl-unavailable";
	/**
	* Unable to reach the server.
	*/ PeerErrorType["ServerError"] = "server-error";
	/**
	* An error from the underlying socket.
	*/ PeerErrorType["SocketError"] = "socket-error";
	/**
	* The underlying socket closed unexpectedly.
	*/ PeerErrorType["SocketClosed"] = "socket-closed";
	/**
	* The ID passed into the Peer constructor is already taken.
	*
	* :::caution
	* This error is not fatal if your peer has open peer-to-peer connections.
	* This can happen if you attempt to {@apilink Peer.reconnect} a peer that has been disconnected from the server,
	* but its old ID has now been taken.
	* :::
	*/ PeerErrorType["UnavailableID"] = "unavailable-id";
	/**
	* Native WebRTC errors.
	*/ PeerErrorType["WebRTC"] = "webrtc";
	return PeerErrorType;
}({});
var $78455e22dea96b8c$export$7974935686149686 = /*#__PURE__*/ function(BaseConnectionErrorType) {
	BaseConnectionErrorType["NegotiationFailed"] = "negotiation-failed";
	BaseConnectionErrorType["ConnectionClosed"] = "connection-closed";
	return BaseConnectionErrorType;
}({});
var $78455e22dea96b8c$export$49ae800c114df41d = /*#__PURE__*/ function(DataConnectionErrorType) {
	DataConnectionErrorType["NotOpenYet"] = "not-open-yet";
	DataConnectionErrorType["MessageToBig"] = "message-too-big";
	return DataConnectionErrorType;
}({});
var $78455e22dea96b8c$export$89f507cf986a947 = /*#__PURE__*/ function(SerializationType) {
	SerializationType["Binary"] = "binary";
	SerializationType["BinaryUTF8"] = "binary-utf8";
	SerializationType["JSON"] = "json";
	SerializationType["None"] = "raw";
	return SerializationType;
}({});
var $78455e22dea96b8c$export$3b5c4a4b6354f023 = /*#__PURE__*/ function(SocketEventType) {
	SocketEventType["Message"] = "message";
	SocketEventType["Disconnected"] = "disconnected";
	SocketEventType["Error"] = "error";
	SocketEventType["Close"] = "close";
	return SocketEventType;
}({});
var $78455e22dea96b8c$export$adb4a1754da6f10d = /*#__PURE__*/ function(ServerMessageType) {
	ServerMessageType["Heartbeat"] = "HEARTBEAT";
	ServerMessageType["Candidate"] = "CANDIDATE";
	ServerMessageType["Offer"] = "OFFER";
	ServerMessageType["Answer"] = "ANSWER";
	ServerMessageType["Open"] = "OPEN";
	ServerMessageType["Error"] = "ERROR";
	ServerMessageType["IdTaken"] = "ID-TAKEN";
	ServerMessageType["InvalidKey"] = "INVALID-KEY";
	ServerMessageType["Leave"] = "LEAVE";
	ServerMessageType["Expire"] = "EXPIRE";
	return ServerMessageType;
}({});
var $520832d44ba058c8$export$83d89fbfd8236492 = "1.5.5";
var $8f5bfa60836d261d$export$4798917dbf149b79 = class extends $c4dcfd1d1ea86647$exports.EventEmitter {
	constructor(secure, host, port, path, key, pingInterval = 5e3) {
		super(), this.pingInterval = pingInterval, this._disconnected = true, this._messagesQueue = [];
		const wsProtocol = secure ? "wss://" : "ws://";
		this._baseUrl = wsProtocol + host + ":" + port + path + "peerjs?key=" + key;
	}
	start(id, token) {
		this._id = id;
		const wsUrl = `${this._baseUrl}&id=${id}&token=${token}`;
		if (!!this._socket || !this._disconnected) return;
		this._socket = new WebSocket(wsUrl + "&version=1.5.5");
		this._disconnected = false;
		this._socket.onmessage = (event) => {
			let data;
			try {
				data = JSON.parse(event.data);
				$257947e92926277a$export$2e2bcd8739ae039.log("Server message received:", data);
			} catch (e) {
				$257947e92926277a$export$2e2bcd8739ae039.log("Invalid server message", event.data);
				return;
			}
			this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Message, data);
		};
		this._socket.onclose = (event) => {
			if (this._disconnected) return;
			$257947e92926277a$export$2e2bcd8739ae039.log("Socket closed.", event);
			this._cleanup();
			this._disconnected = true;
			this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Disconnected);
		};
		this._socket.onopen = () => {
			if (this._disconnected) return;
			this._sendQueuedMessages();
			$257947e92926277a$export$2e2bcd8739ae039.log("Socket open");
			this._scheduleHeartbeat();
		};
	}
	_scheduleHeartbeat() {
		this._wsPingTimer = setTimeout(() => {
			this._sendHeartbeat();
		}, this.pingInterval);
	}
	_sendHeartbeat() {
		if (!this._wsOpen()) {
			$257947e92926277a$export$2e2bcd8739ae039.log(`Cannot send heartbeat, because socket closed`);
			return;
		}
		const message = JSON.stringify({ type: $78455e22dea96b8c$export$adb4a1754da6f10d.Heartbeat });
		this._socket.send(message);
		this._scheduleHeartbeat();
	}
	/** Is the websocket currently open? */ _wsOpen() {
		return !!this._socket && this._socket.readyState === 1;
	}
	/** Send queued messages. */ _sendQueuedMessages() {
		const copiedQueue = [...this._messagesQueue];
		this._messagesQueue = [];
		for (const message of copiedQueue) this.send(message);
	}
	/** Exposed send for DC & Peer. */ send(data) {
		if (this._disconnected) return;
		if (!this._id) {
			this._messagesQueue.push(data);
			return;
		}
		if (!data.type) {
			this.emit($78455e22dea96b8c$export$3b5c4a4b6354f023.Error, "Invalid message");
			return;
		}
		if (!this._wsOpen()) return;
		const message = JSON.stringify(data);
		this._socket.send(message);
	}
	close() {
		if (this._disconnected) return;
		this._cleanup();
		this._disconnected = true;
	}
	_cleanup() {
		if (this._socket) {
			this._socket.onopen = this._socket.onmessage = this._socket.onclose = null;
			this._socket.close();
			this._socket = void 0;
		}
		clearTimeout(this._wsPingTimer);
	}
};
var $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a = class {
	constructor(connection) {
		this.connection = connection;
	}
	/** Returns a PeerConnection object set up correctly (for data, media). */ startConnection(options) {
		const peerConnection = this._startPeerConnection();
		this.connection.peerConnection = peerConnection;
		if (this.connection.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media && options._stream) this._addTracksToConnection(options._stream, peerConnection);
		if (options.originator) {
			const dataConnection = this.connection;
			const config = { ordered: !!options.reliable };
			const dataChannel = peerConnection.createDataChannel(dataConnection.label, config);
			dataConnection._initializeDataChannel(dataChannel);
			this._makeOffer();
		} else this.handleSDP("OFFER", options.sdp);
	}
	/** Start a PC. */ _startPeerConnection() {
		$257947e92926277a$export$2e2bcd8739ae039.log("Creating RTCPeerConnection.");
		const peerConnection = new RTCPeerConnection(this.connection.provider.options.config);
		this._setupListeners(peerConnection);
		return peerConnection;
	}
	/** Set up various WebRTC listeners. */ _setupListeners(peerConnection) {
		const peerId = this.connection.peer;
		const connectionId = this.connection.connectionId;
		const connectionType = this.connection.type;
		const provider = this.connection.provider;
		$257947e92926277a$export$2e2bcd8739ae039.log("Listening for ICE candidates.");
		peerConnection.onicecandidate = (evt) => {
			if (!evt.candidate || !evt.candidate.candidate) return;
			$257947e92926277a$export$2e2bcd8739ae039.log(`Received ICE candidates for ${peerId}:`, evt.candidate);
			provider.socket.send({
				type: $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate,
				payload: {
					candidate: evt.candidate,
					type: connectionType,
					connectionId
				},
				dst: peerId
			});
		};
		peerConnection.oniceconnectionstatechange = () => {
			switch (peerConnection.iceConnectionState) {
				case "failed":
					$257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState is failed, closing connections to " + peerId);
					this.connection.emitError($78455e22dea96b8c$export$7974935686149686.NegotiationFailed, "Negotiation of connection to " + peerId + " failed.");
					this.connection.close();
					break;
				case "closed":
					$257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState is closed, closing connections to " + peerId);
					this.connection.emitError($78455e22dea96b8c$export$7974935686149686.ConnectionClosed, "Connection to " + peerId + " closed.");
					this.connection.close();
					break;
				case "disconnected":
					$257947e92926277a$export$2e2bcd8739ae039.log("iceConnectionState changed to disconnected on the connection with " + peerId);
					break;
				case "completed": peerConnection.onicecandidate = () => {};
			}
			this.connection.emit("iceStateChanged", peerConnection.iceConnectionState);
		};
		$257947e92926277a$export$2e2bcd8739ae039.log("Listening for data channel");
		peerConnection.ondatachannel = (evt) => {
			$257947e92926277a$export$2e2bcd8739ae039.log("Received data channel");
			const dataChannel = evt.channel;
			provider.getConnection(peerId, connectionId)._initializeDataChannel(dataChannel);
		};
		$257947e92926277a$export$2e2bcd8739ae039.log("Listening for remote stream");
		peerConnection.ontrack = (evt) => {
			$257947e92926277a$export$2e2bcd8739ae039.log("Received remote stream");
			const stream = evt.streams[0];
			const connection = provider.getConnection(peerId, connectionId);
			if (connection.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media) {
				const mediaConnection = connection;
				this._addStreamToMediaConnection(stream, mediaConnection);
			}
		};
	}
	cleanup() {
		$257947e92926277a$export$2e2bcd8739ae039.log("Cleaning up PeerConnection to " + this.connection.peer);
		const peerConnection = this.connection.peerConnection;
		if (!peerConnection) return;
		this.connection.peerConnection = null;
		peerConnection.onicecandidate = peerConnection.oniceconnectionstatechange = peerConnection.ondatachannel = peerConnection.ontrack = () => {};
		const peerConnectionNotClosed = peerConnection.signalingState !== "closed";
		let dataChannelNotClosed = false;
		const dataChannel = this.connection.dataChannel;
		if (dataChannel) dataChannelNotClosed = !!dataChannel.readyState && dataChannel.readyState !== "closed";
		if (peerConnectionNotClosed || dataChannelNotClosed) peerConnection.close();
	}
	async _makeOffer() {
		const peerConnection = this.connection.peerConnection;
		const provider = this.connection.provider;
		try {
			const offer = await peerConnection.createOffer(this.connection.options.constraints);
			$257947e92926277a$export$2e2bcd8739ae039.log("Created offer.");
			if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") offer.sdp = this.connection.options.sdpTransform(offer.sdp) || offer.sdp;
			try {
				await peerConnection.setLocalDescription(offer);
				$257947e92926277a$export$2e2bcd8739ae039.log("Set localDescription:", offer, `for:${this.connection.peer}`);
				let payload = {
					sdp: offer,
					type: this.connection.type,
					connectionId: this.connection.connectionId,
					metadata: this.connection.metadata
				};
				if (this.connection.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Data) {
					const dataConnection = this.connection;
					payload = {
						...payload,
						label: dataConnection.label,
						reliable: dataConnection.reliable,
						serialization: dataConnection.serialization
					};
				}
				provider.socket.send({
					type: $78455e22dea96b8c$export$adb4a1754da6f10d.Offer,
					payload,
					dst: this.connection.peer
				});
			} catch (err) {
				if (err != "OperationError: Failed to set local offer sdp: Called in wrong state: kHaveRemoteOffer") {
					provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
					$257947e92926277a$export$2e2bcd8739ae039.log("Failed to setLocalDescription, ", err);
				}
			}
		} catch (err_1) {
			provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err_1);
			$257947e92926277a$export$2e2bcd8739ae039.log("Failed to createOffer, ", err_1);
		}
	}
	async _makeAnswer() {
		const peerConnection = this.connection.peerConnection;
		const provider = this.connection.provider;
		try {
			const answer = await peerConnection.createAnswer();
			$257947e92926277a$export$2e2bcd8739ae039.log("Created answer.");
			if (this.connection.options.sdpTransform && typeof this.connection.options.sdpTransform === "function") answer.sdp = this.connection.options.sdpTransform(answer.sdp) || answer.sdp;
			try {
				await peerConnection.setLocalDescription(answer);
				$257947e92926277a$export$2e2bcd8739ae039.log(`Set localDescription:`, answer, `for:${this.connection.peer}`);
				provider.socket.send({
					type: $78455e22dea96b8c$export$adb4a1754da6f10d.Answer,
					payload: {
						sdp: answer,
						type: this.connection.type,
						connectionId: this.connection.connectionId
					},
					dst: this.connection.peer
				});
			} catch (err) {
				provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
				$257947e92926277a$export$2e2bcd8739ae039.log("Failed to setLocalDescription, ", err);
			}
		} catch (err_1) {
			provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err_1);
			$257947e92926277a$export$2e2bcd8739ae039.log("Failed to create answer, ", err_1);
		}
	}
	/** Handle an SDP. */ async handleSDP(type, sdp) {
		sdp = new RTCSessionDescription(sdp);
		const peerConnection = this.connection.peerConnection;
		const provider = this.connection.provider;
		$257947e92926277a$export$2e2bcd8739ae039.log("Setting remote description", sdp);
		const self = this;
		try {
			await peerConnection.setRemoteDescription(sdp);
			$257947e92926277a$export$2e2bcd8739ae039.log(`Set remoteDescription:${type} for:${this.connection.peer}`);
			if (type === "OFFER") await self._makeAnswer();
		} catch (err) {
			provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
			$257947e92926277a$export$2e2bcd8739ae039.log("Failed to setRemoteDescription, ", err);
		}
	}
	/** Handle a candidate. */ async handleCandidate(ice) {
		$257947e92926277a$export$2e2bcd8739ae039.log(`handleCandidate:`, ice);
		try {
			await this.connection.peerConnection.addIceCandidate(ice);
			$257947e92926277a$export$2e2bcd8739ae039.log(`Added ICE candidate for:${this.connection.peer}`);
		} catch (err) {
			this.connection.provider.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.WebRTC, err);
			$257947e92926277a$export$2e2bcd8739ae039.log("Failed to handleCandidate, ", err);
		}
	}
	_addTracksToConnection(stream, peerConnection) {
		$257947e92926277a$export$2e2bcd8739ae039.log(`add tracks from stream ${stream.id} to peer connection`);
		if (!peerConnection.addTrack) return $257947e92926277a$export$2e2bcd8739ae039.error(`Your browser does't support RTCPeerConnection#addTrack. Ignored.`);
		stream.getTracks().forEach((track) => {
			peerConnection.addTrack(track, stream);
		});
	}
	_addStreamToMediaConnection(stream, mediaConnection) {
		$257947e92926277a$export$2e2bcd8739ae039.log(`add stream ${stream.id} to media connection ${mediaConnection.connectionId}`);
		mediaConnection.addStream(stream);
	}
};
var $23779d1881157a18$export$6a678e589c8a4542 = class extends $c4dcfd1d1ea86647$exports.EventEmitter {
	/**
	* Emits a typed error message.
	*
	* @internal
	*/ emitError(type, err) {
		$257947e92926277a$export$2e2bcd8739ae039.error("Error:", err);
		this.emit("error", new $23779d1881157a18$export$98871882f492de82(`${type}`, err));
	}
};
var $23779d1881157a18$export$98871882f492de82 = class extends Error {
	/**
	* @internal
	*/ constructor(type, err) {
		if (typeof err === "string") super(err);
		else {
			super();
			Object.assign(this, err);
		}
		this.type = type;
	}
};
var $5045192fc6d387ba$export$23a2a68283c24d80 = class extends $23779d1881157a18$export$6a678e589c8a4542 {
	/**
	* Whether the media connection is active (e.g. your call has been answered).
	* You can check this if you want to set a maximum wait time for a one-sided call.
	*/ get open() {
		return this._open;
	}
	constructor(peer, provider, options) {
		super(), this.peer = peer, this.provider = provider, this.options = options, this._open = false;
		this.metadata = options.metadata;
	}
};
var $5c1d08c7c57da9a3$export$4a84e95a2324ac29 = class $5c1d08c7c57da9a3$export$4a84e95a2324ac29 extends $5045192fc6d387ba$export$23a2a68283c24d80 {
	static #_ = this.ID_PREFIX = "mc_";
	/**
	* For media connections, this is always 'media'.
	*/ get type() {
		return $78455e22dea96b8c$export$3157d57b4135e3bc.Media;
	}
	get localStream() {
		return this._localStream;
	}
	get remoteStream() {
		return this._remoteStream;
	}
	constructor(peerId, provider, options) {
		super(peerId, provider, options);
		this._localStream = this.options._stream;
		this.connectionId = this.options.connectionId || $5c1d08c7c57da9a3$export$4a84e95a2324ac29.ID_PREFIX + $4f4134156c446392$export$7debb50ef11d5e0b.randomToken();
		this._negotiator = new $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a(this);
		if (this._localStream) this._negotiator.startConnection({
			_stream: this._localStream,
			originator: true
		});
	}
	/** Called by the Negotiator when the DataChannel is ready. */ _initializeDataChannel(dc) {
		this.dataChannel = dc;
		this.dataChannel.onopen = () => {
			$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc connection success`);
			this.emit("willCloseOnRemote");
		};
		this.dataChannel.onclose = () => {
			$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc closed for:`, this.peer);
			this.close();
		};
	}
	addStream(remoteStream) {
		$257947e92926277a$export$2e2bcd8739ae039.log("Receiving stream", remoteStream);
		this._remoteStream = remoteStream;
		super.emit("stream", remoteStream);
	}
	/**
	* @internal
	*/ handleMessage(message) {
		const type = message.type;
		const payload = message.payload;
		switch (message.type) {
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Answer:
				this._negotiator.handleSDP(type, payload.sdp);
				this._open = true;
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate:
				this._negotiator.handleCandidate(payload.candidate);
				break;
			default: $257947e92926277a$export$2e2bcd8739ae039.warn(`Unrecognized message type:${type} from peer:${this.peer}`);
		}
	}
	/**
	* When receiving a {@apilink PeerEvents | `call`} event on a peer, you can call
	* `answer` on the media connection provided by the callback to accept the call
	* and optionally send your own media stream.
	
	*
	* @param stream A WebRTC media stream.
	* @param options
	* @returns
	*/ answer(stream, options = {}) {
		if (this._localStream) {
			$257947e92926277a$export$2e2bcd8739ae039.warn("Local stream already exists on this MediaConnection. Are you answering a call twice?");
			return;
		}
		this._localStream = stream;
		if (options && options.sdpTransform) this.options.sdpTransform = options.sdpTransform;
		this._negotiator.startConnection({
			...this.options._payload,
			_stream: stream
		});
		const messages = this.provider._getMessages(this.connectionId);
		for (const message of messages) this.handleMessage(message);
		this._open = true;
	}
	/**
	* Exposed functionality for users.
	*/ /**
	* Closes the media connection.
	*/ close() {
		if (this._negotiator) {
			this._negotiator.cleanup();
			this._negotiator = null;
		}
		this._localStream = null;
		this._remoteStream = null;
		if (this.provider) {
			this.provider._removeConnection(this);
			this.provider = null;
		}
		if (this.options && this.options._stream) this.options._stream = null;
		if (!this.open) return;
		this._open = false;
		super.emit("close");
	}
};
var $abf266641927cd89$export$2c4e825dc9120f87 = class {
	constructor(_options) {
		this._options = _options;
	}
	_buildRequest(method) {
		const protocol = this._options.secure ? "https" : "http";
		const { host, port, path, key } = this._options;
		const url = new URL(`${protocol}://${host}:${port}${path}${key}/${method}`);
		url.searchParams.set("ts", `${Date.now()}${Math.random()}`);
		url.searchParams.set("version", $520832d44ba058c8$export$83d89fbfd8236492);
		return fetch(url.href, { referrerPolicy: this._options.referrerPolicy });
	}
	/** Get a unique ID from the server via XHR and initialize with it. */ async retrieveId() {
		try {
			const response = await this._buildRequest("id");
			if (response.status !== 200) throw new Error(`Error. Status:${response.status}`);
			return response.text();
		} catch (error) {
			$257947e92926277a$export$2e2bcd8739ae039.error("Error retrieving ID", error);
			let pathError = "";
			if (this._options.path === "/" && this._options.host !== $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) pathError = " If you passed in a `path` to your self-hosted PeerServer, you'll also need to pass in that same path when creating a new Peer.";
			throw new Error("Could not get an ID from the server." + pathError);
		}
	}
	/** @deprecated */ async listAllPeers() {
		try {
			const response = await this._buildRequest("peers");
			if (response.status !== 200) {
				if (response.status === 401) {
					let helpfulError = "";
					if (this._options.host === $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) helpfulError = "It looks like you're using the cloud server. You can email team@peerjs.com to enable peer listing for your API key.";
					else helpfulError = "You need to enable `allow_discovery` on your self-hosted PeerServer to use this feature.";
					throw new Error("It doesn't look like you have permission to list peers IDs. " + helpfulError);
				}
				throw new Error(`Error. Status:${response.status}`);
			}
			return response.json();
		} catch (error) {
			$257947e92926277a$export$2e2bcd8739ae039.error("Error retrieving list peers", error);
			throw new Error("Could not get list peers from the server." + error);
		}
	}
};
var $6366c4ca161bc297$export$d365f7ad9d7df9c9 = class $6366c4ca161bc297$export$d365f7ad9d7df9c9 extends $5045192fc6d387ba$export$23a2a68283c24d80 {
	static #_ = this.ID_PREFIX = "dc_";
	static #_2 = this.MAX_BUFFERED_AMOUNT = 8388608;
	get type() {
		return $78455e22dea96b8c$export$3157d57b4135e3bc.Data;
	}
	constructor(peerId, provider, options) {
		super(peerId, provider, options);
		this.connectionId = this.options.connectionId || $6366c4ca161bc297$export$d365f7ad9d7df9c9.ID_PREFIX + $0e5fd1585784c252$export$4e61f672936bec77();
		this.label = this.options.label || this.connectionId;
		this.reliable = !!this.options.reliable;
		this._negotiator = new $b82fb8fc0514bfc1$export$89e6bb5ad64bf4a(this);
		this._negotiator.startConnection(this.options._payload || {
			originator: true,
			reliable: this.reliable
		});
	}
	/** Called by the Negotiator when the DataChannel is ready. */ _initializeDataChannel(dc) {
		this.dataChannel = dc;
		this.dataChannel.onopen = () => {
			$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc connection success`);
			this._open = true;
			this.emit("open");
		};
		this.dataChannel.onmessage = (e) => {
			$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc onmessage:`, e.data);
		};
		this.dataChannel.onclose = () => {
			$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} dc closed for:`, this.peer);
			this.close();
		};
	}
	/**
	* Exposed functionality for users.
	*/ /** Allows user to close connection. */ close(options) {
		if (options?.flush) {
			this.send({ __peerData: { type: "close" } });
			return;
		}
		if (this._negotiator) {
			this._negotiator.cleanup();
			this._negotiator = null;
		}
		if (this.provider) {
			this.provider._removeConnection(this);
			this.provider = null;
		}
		if (this.dataChannel) {
			this.dataChannel.onopen = null;
			this.dataChannel.onmessage = null;
			this.dataChannel.onclose = null;
			this.dataChannel = null;
		}
		if (!this.open) return;
		this._open = false;
		super.emit("close");
	}
	/** Allows user to send data. */ send(data, chunked = false) {
		if (!this.open) {
			this.emitError($78455e22dea96b8c$export$49ae800c114df41d.NotOpenYet, "Connection is not open. You should listen for the `open` event before sending messages.");
			return;
		}
		return this._send(data, chunked);
	}
	async handleMessage(message) {
		const payload = message.payload;
		switch (message.type) {
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Answer:
				await this._negotiator.handleSDP(message.type, payload.sdp);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Candidate:
				await this._negotiator.handleCandidate(payload.candidate);
				break;
			default: $257947e92926277a$export$2e2bcd8739ae039.warn("Unrecognized message type:", message.type, "from peer:", this.peer);
		}
	}
};
var $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b = class extends $6366c4ca161bc297$export$d365f7ad9d7df9c9 {
	get bufferSize() {
		return this._bufferSize;
	}
	_initializeDataChannel(dc) {
		super._initializeDataChannel(dc);
		this.dataChannel.binaryType = "arraybuffer";
		this.dataChannel.addEventListener("message", (e) => this._handleDataMessage(e));
	}
	_bufferedSend(msg) {
		if (this._buffering || !this._trySend(msg)) {
			this._buffer.push(msg);
			this._bufferSize = this._buffer.length;
		}
	}
	_trySend(msg) {
		if (!this.open) return false;
		if (this.dataChannel.bufferedAmount > $6366c4ca161bc297$export$d365f7ad9d7df9c9.MAX_BUFFERED_AMOUNT) {
			this._buffering = true;
			setTimeout(() => {
				this._buffering = false;
				this._tryBuffer();
			}, 50);
			return false;
		}
		try {
			this.dataChannel.send(msg);
		} catch (e) {
			$257947e92926277a$export$2e2bcd8739ae039.error(`DC#:${this.connectionId} Error when sending:`, e);
			this._buffering = true;
			this.close();
			return false;
		}
		return true;
	}
	_tryBuffer() {
		if (!this.open) return;
		if (this._buffer.length === 0) return;
		const msg = this._buffer[0];
		if (this._trySend(msg)) {
			this._buffer.shift();
			this._bufferSize = this._buffer.length;
			this._tryBuffer();
		}
	}
	close(options) {
		if (options?.flush) {
			this.send({ __peerData: { type: "close" } });
			return;
		}
		this._buffer = [];
		this._bufferSize = 0;
		super.close();
	}
	constructor(...args) {
		super(...args), this._buffer = [], this._bufferSize = 0, this._buffering = false;
	}
};
var $9fcfddb3ae148f88$export$f0a5a64d5bb37108 = class extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
	close(options) {
		super.close(options);
		this._chunkedData = {};
	}
	constructor(peerId, provider, options) {
		super(peerId, provider, options), this.chunker = new $fcbcc7538a6776d5$export$f1c5f4c9cb95390b(), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.Binary, this._chunkedData = {};
	}
	_handleDataMessage({ data }) {
		const deserializedData = $0cfd7828ad59115f$export$417857010dc9287f(data);
		const peerData = deserializedData["__peerData"];
		if (peerData) {
			if (peerData.type === "close") {
				this.close();
				return;
			}
			this._handleChunk(deserializedData);
			return;
		}
		this.emit("data", deserializedData);
	}
	_handleChunk(data) {
		const id = data.__peerData;
		const chunkInfo = this._chunkedData[id] || {
			data: [],
			count: 0,
			total: data.total
		};
		chunkInfo.data[data.n] = new Uint8Array(data.data);
		chunkInfo.count++;
		this._chunkedData[id] = chunkInfo;
		if (chunkInfo.total === chunkInfo.count) {
			delete this._chunkedData[id];
			const data = $fcbcc7538a6776d5$export$52c89ebcdc4f53f2(chunkInfo.data);
			this._handleDataMessage({ data });
		}
	}
	_send(data, chunked) {
		const blob = $0cfd7828ad59115f$export$2a703dbb0cb35339(data);
		if (blob instanceof Promise) return this._send_blob(blob);
		if (!chunked && blob.byteLength > this.chunker.chunkedMTU) {
			this._sendChunks(blob);
			return;
		}
		this._bufferedSend(blob);
	}
	async _send_blob(blobPromise) {
		const blob = await blobPromise;
		if (blob.byteLength > this.chunker.chunkedMTU) {
			this._sendChunks(blob);
			return;
		}
		this._bufferedSend(blob);
	}
	_sendChunks(blob) {
		const blobs = this.chunker.chunk(blob);
		$257947e92926277a$export$2e2bcd8739ae039.log(`DC#${this.connectionId} Try to send ${blobs.length} chunks...`);
		for (const blob of blobs) this.send(blob, true);
	}
};
var $bbaee3f15f714663$export$6f88fe47d32c9c94 = class extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
	_handleDataMessage({ data }) {
		super.emit("data", data);
	}
	_send(data, _chunked) {
		this._bufferedSend(data);
	}
	constructor(...args) {
		super(...args), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.None;
	}
};
var $817f931e3f9096cf$export$48880ac635f47186 = class extends $a229bedbcaa6ca23$export$ff7c9d4c11d94e8b {
	_handleDataMessage({ data }) {
		const deserializedData = this.parse(this.decoder.decode(data));
		const peerData = deserializedData["__peerData"];
		if (peerData && peerData.type === "close") {
			this.close();
			return;
		}
		this.emit("data", deserializedData);
	}
	_send(data, _chunked) {
		const encodedData = this.encoder.encode(this.stringify(data));
		if (encodedData.byteLength >= $4f4134156c446392$export$7debb50ef11d5e0b.chunkedMTU) {
			this.emitError($78455e22dea96b8c$export$49ae800c114df41d.MessageToBig, "Message too big for JSON channel");
			return;
		}
		this._bufferedSend(encodedData);
	}
	constructor(...args) {
		super(...args), this.serialization = $78455e22dea96b8c$export$89f507cf986a947.JSON, this.encoder = new TextEncoder(), this.decoder = new TextDecoder(), this.stringify = JSON.stringify, this.parse = JSON.parse;
	}
};
var $dd0187d7f28e386f$export$2e2bcd8739ae039 = class $416260bce337df90$export$ecd1fc136c422448 extends $23779d1881157a18$export$6a678e589c8a4542 {
	static #_ = this.DEFAULT_KEY = "peerjs";
	/**
	* The brokering ID of this peer
	*
	* If no ID was specified in {@apilink Peer | the constructor},
	* this will be `undefined` until the {@apilink PeerEvents | `open`} event is emitted.
	*/ get id() {
		return this._id;
	}
	get options() {
		return this._options;
	}
	get open() {
		return this._open;
	}
	/**
	* @internal
	*/ get socket() {
		return this._socket;
	}
	/**
	* A hash of all connections associated with this peer, keyed by the remote peer's ID.
	* @deprecated
	* Return type will change from Object to Map<string,[]>
	*/ get connections() {
		const plainConnections = Object.create(null);
		for (const [k, v] of this._connections) plainConnections[k] = v;
		return plainConnections;
	}
	/**
	* true if this peer and all of its connections can no longer be used.
	*/ get destroyed() {
		return this._destroyed;
	}
	/**
	* false if there is an active connection to the PeerServer.
	*/ get disconnected() {
		return this._disconnected;
	}
	constructor(id, options) {
		super(), this._serializers = {
			raw: $bbaee3f15f714663$export$6f88fe47d32c9c94,
			json: $817f931e3f9096cf$export$48880ac635f47186,
			binary: $9fcfddb3ae148f88$export$f0a5a64d5bb37108,
			"binary-utf8": $9fcfddb3ae148f88$export$f0a5a64d5bb37108,
			default: $9fcfddb3ae148f88$export$f0a5a64d5bb37108
		}, this._id = null, this._lastServerId = null, this._destroyed = false, this._disconnected = false, this._open = false, this._connections = /* @__PURE__ */ new Map(), this._lostMessages = /* @__PURE__ */ new Map();
		let userId;
		if (id && id.constructor == Object) options = id;
		else if (id) userId = id.toString();
		options = {
			debug: 0,
			host: $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST,
			port: $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_PORT,
			path: "/",
			key: $416260bce337df90$export$ecd1fc136c422448.DEFAULT_KEY,
			token: $4f4134156c446392$export$7debb50ef11d5e0b.randomToken(),
			config: $4f4134156c446392$export$7debb50ef11d5e0b.defaultConfig,
			referrerPolicy: "strict-origin-when-cross-origin",
			serializers: {},
			...options
		};
		this._options = options;
		this._serializers = {
			...this._serializers,
			...this.options.serializers
		};
		if (this._options.host === "/") this._options.host = window.location.hostname;
		if (this._options.path) {
			if (this._options.path[0] !== "/") this._options.path = "/" + this._options.path;
			if (this._options.path[this._options.path.length - 1] !== "/") this._options.path += "/";
		}
		if (this._options.secure === void 0 && this._options.host !== $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) this._options.secure = $4f4134156c446392$export$7debb50ef11d5e0b.isSecure();
		else if (this._options.host == $4f4134156c446392$export$7debb50ef11d5e0b.CLOUD_HOST) this._options.secure = true;
		if (this._options.logFunction) $257947e92926277a$export$2e2bcd8739ae039.setLogFunction(this._options.logFunction);
		$257947e92926277a$export$2e2bcd8739ae039.logLevel = this._options.debug || 0;
		this._api = new $abf266641927cd89$export$2c4e825dc9120f87(options);
		this._socket = this._createServerConnection();
		if (!$4f4134156c446392$export$7debb50ef11d5e0b.supports.audioVideo && !$4f4134156c446392$export$7debb50ef11d5e0b.supports.data) {
			this._delayedAbort($78455e22dea96b8c$export$9547aaa2e39030ff.BrowserIncompatible, "The current browser does not support WebRTC");
			return;
		}
		if (!!userId && !$4f4134156c446392$export$7debb50ef11d5e0b.validateId(userId)) {
			this._delayedAbort($78455e22dea96b8c$export$9547aaa2e39030ff.InvalidID, `ID "${userId}" is invalid`);
			return;
		}
		if (userId) this._initialize(userId);
		else this._api.retrieveId().then((id) => this._initialize(id)).catch((error) => this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, error));
	}
	_createServerConnection() {
		const socket = new $8f5bfa60836d261d$export$4798917dbf149b79(this._options.secure, this._options.host, this._options.port, this._options.path, this._options.key, this._options.pingInterval);
		socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Message, (data) => {
			this._handleMessage(data);
		});
		socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Error, (error) => {
			this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.SocketError, error);
		});
		socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Disconnected, () => {
			if (this.disconnected) return;
			this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Network, "Lost connection to server.");
			this.disconnect();
		});
		socket.on($78455e22dea96b8c$export$3b5c4a4b6354f023.Close, () => {
			if (this.disconnected) return;
			this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.SocketClosed, "Underlying socket is already closed.");
		});
		return socket;
	}
	/** Initialize a connection with the server. */ _initialize(id) {
		this._id = id;
		this.socket.start(id, this._options.token);
	}
	/** Handles messages from the server. */ _handleMessage(message) {
		const type = message.type;
		const payload = message.payload;
		const peerId = message.src;
		switch (type) {
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Open:
				this._lastServerId = this.id;
				this._open = true;
				this.emit("open", this.id);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Error:
				this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, payload.msg);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.IdTaken:
				this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.UnavailableID, `ID "${this.id}" is taken`);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.InvalidKey:
				this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.InvalidKey, `API KEY "${this._options.key}" is invalid`);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Leave:
				$257947e92926277a$export$2e2bcd8739ae039.log(`Received leave message from ${peerId}`);
				this._cleanupPeer(peerId);
				this._connections.delete(peerId);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Expire:
				this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.PeerUnavailable, `Could not connect to peer ${peerId}`);
				break;
			case $78455e22dea96b8c$export$adb4a1754da6f10d.Offer: {
				const connectionId = payload.connectionId;
				let connection = this.getConnection(peerId, connectionId);
				if (connection) {
					connection.close();
					$257947e92926277a$export$2e2bcd8739ae039.warn(`Offer received for existing Connection ID:${connectionId}`);
				}
				if (payload.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Media) {
					const mediaConnection = new $5c1d08c7c57da9a3$export$4a84e95a2324ac29(peerId, this, {
						connectionId,
						_payload: payload,
						metadata: payload.metadata
					});
					connection = mediaConnection;
					this._addConnection(peerId, connection);
					this.emit("call", mediaConnection);
				} else if (payload.type === $78455e22dea96b8c$export$3157d57b4135e3bc.Data) {
					const dataConnection = new this._serializers[payload.serialization](peerId, this, {
						connectionId,
						_payload: payload,
						metadata: payload.metadata,
						label: payload.label,
						serialization: payload.serialization,
						reliable: payload.reliable
					});
					connection = dataConnection;
					this._addConnection(peerId, connection);
					this.emit("connection", dataConnection);
				} else {
					$257947e92926277a$export$2e2bcd8739ae039.warn(`Received malformed connection type:${payload.type}`);
					return;
				}
				const messages = this._getMessages(connectionId);
				for (const message of messages) connection.handleMessage(message);
				break;
			}
			default: {
				if (!payload) {
					$257947e92926277a$export$2e2bcd8739ae039.warn(`You received a malformed message from ${peerId} of type ${type}`);
					return;
				}
				const connectionId = payload.connectionId;
				const connection = this.getConnection(peerId, connectionId);
				if (connection && connection.peerConnection) connection.handleMessage(message);
				else if (connectionId) this._storeMessage(connectionId, message);
				else $257947e92926277a$export$2e2bcd8739ae039.warn("You received an unrecognized message:", message);
				break;
			}
		}
	}
	/** Stores messages without a set up connection, to be claimed later. */ _storeMessage(connectionId, message) {
		if (!this._lostMessages.has(connectionId)) this._lostMessages.set(connectionId, []);
		this._lostMessages.get(connectionId).push(message);
	}
	/**
	* Retrieve messages from lost message store
	* @internal
	*/ _getMessages(connectionId) {
		const messages = this._lostMessages.get(connectionId);
		if (messages) {
			this._lostMessages.delete(connectionId);
			return messages;
		}
		return [];
	}
	/**
	* Connects to the remote peer specified by id and returns a data connection.
	* @param peer The brokering ID of the remote peer (their {@apilink Peer.id}).
	* @param options for specifying details about Peer Connection
	*/ connect(peer, options = {}) {
		options = {
			serialization: "default",
			...options
		};
		if (this.disconnected) {
			$257947e92926277a$export$2e2bcd8739ae039.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect, or call reconnect on this peer if you believe its ID to still be available.");
			this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Disconnected, "Cannot connect to new Peer after disconnecting from server.");
			return;
		}
		const dataConnection = new this._serializers[options.serialization](peer, this, options);
		this._addConnection(peer, dataConnection);
		return dataConnection;
	}
	/**
	* Calls the remote peer specified by id and returns a media connection.
	* @param peer The brokering ID of the remote peer (their peer.id).
	* @param stream The caller's media stream
	* @param options Metadata associated with the connection, passed in by whoever initiated the connection.
	*/ call(peer, stream, options = {}) {
		if (this.disconnected) {
			$257947e92926277a$export$2e2bcd8739ae039.warn("You cannot connect to a new Peer because you called .disconnect() on this Peer and ended your connection with the server. You can create a new Peer to reconnect.");
			this.emitError($78455e22dea96b8c$export$9547aaa2e39030ff.Disconnected, "Cannot connect to new Peer after disconnecting from server.");
			return;
		}
		if (!stream) {
			$257947e92926277a$export$2e2bcd8739ae039.error("To call a peer, you must provide a stream from your browser's `getUserMedia`.");
			return;
		}
		const mediaConnection = new $5c1d08c7c57da9a3$export$4a84e95a2324ac29(peer, this, {
			...options,
			_stream: stream
		});
		this._addConnection(peer, mediaConnection);
		return mediaConnection;
	}
	/** Add a data/media connection to this peer. */ _addConnection(peerId, connection) {
		$257947e92926277a$export$2e2bcd8739ae039.log(`add connection ${connection.type}:${connection.connectionId} to peerId:${peerId}`);
		if (!this._connections.has(peerId)) this._connections.set(peerId, []);
		this._connections.get(peerId).push(connection);
	}
	_removeConnection(connection) {
		const connections = this._connections.get(connection.peer);
		if (connections) {
			const index = connections.indexOf(connection);
			if (index !== -1) connections.splice(index, 1);
		}
		this._lostMessages.delete(connection.connectionId);
	}
	/** Retrieve a data/media connection for this peer. */ getConnection(peerId, connectionId) {
		const connections = this._connections.get(peerId);
		if (!connections) return null;
		for (const connection of connections) if (connection.connectionId === connectionId) return connection;
		return null;
	}
	_delayedAbort(type, message) {
		setTimeout(() => {
			this._abort(type, message);
		}, 0);
	}
	/**
	* Emits an error message and destroys the Peer.
	* The Peer is not destroyed if it's in a disconnected state, in which case
	* it retains its disconnected state and its existing connections.
	*/ _abort(type, message) {
		$257947e92926277a$export$2e2bcd8739ae039.error("Aborting!");
		this.emitError(type, message);
		if (!this._lastServerId) this.destroy();
		else this.disconnect();
	}
	/**
	* Destroys the Peer: closes all active connections as well as the connection
	* to the server.
	*
	* :::caution
	* This cannot be undone; the respective peer object will no longer be able
	* to create or receive any connections, its ID will be forfeited on the server,
	* and all of its data and media connections will be closed.
	* :::
	*/ destroy() {
		if (this.destroyed) return;
		$257947e92926277a$export$2e2bcd8739ae039.log(`Destroy peer with ID:${this.id}`);
		this.disconnect();
		this._cleanup();
		this._destroyed = true;
		this.emit("close");
	}
	/** Disconnects every connection on this peer. */ _cleanup() {
		for (const peerId of this._connections.keys()) {
			this._cleanupPeer(peerId);
			this._connections.delete(peerId);
		}
		this.socket.removeAllListeners();
	}
	/** Closes all connections to this peer. */ _cleanupPeer(peerId) {
		const connections = this._connections.get(peerId);
		if (!connections) return;
		for (const connection of connections) connection.close();
	}
	/**
	* Disconnects the Peer's connection to the PeerServer. Does not close any
	*  active connections.
	* Warning: The peer can no longer create or accept connections after being
	*  disconnected. It also cannot reconnect to the server.
	*/ disconnect() {
		if (this.disconnected) return;
		const currentId = this.id;
		$257947e92926277a$export$2e2bcd8739ae039.log(`Disconnect peer with ID:${currentId}`);
		this._disconnected = true;
		this._open = false;
		this.socket.close();
		this._lastServerId = currentId;
		this._id = null;
		this.emit("disconnected", currentId);
	}
	/** Attempts to reconnect with the same ID.
	*
	* Only {@apilink Peer.disconnect | disconnected peers} can be reconnected.
	* Destroyed peers cannot be reconnected.
	* If the connection fails (as an example, if the peer's old ID is now taken),
	* the peer's existing connections will not close, but any associated errors events will fire.
	*/ reconnect() {
		if (this.disconnected && !this.destroyed) {
			$257947e92926277a$export$2e2bcd8739ae039.log(`Attempting reconnection to server with ID ${this._lastServerId}`);
			this._disconnected = false;
			this._initialize(this._lastServerId);
		} else if (this.destroyed) throw new Error("This peer cannot reconnect to the server. It has already been destroyed.");
		else if (!this.disconnected && !this.open) $257947e92926277a$export$2e2bcd8739ae039.error("In a hurry? We're still trying to make the initial connection!");
		else throw new Error(`Peer ${this.id} cannot reconnect because it is not disconnected from the server!`);
	}
	/**
	* Get a list of available peer IDs. If you're running your own server, you'll
	* want to set allow_discovery: true in the PeerServer options. If you're using
	* the cloud server, email team@peerjs.com to get the functionality enabled for
	* your key.
	*/ listAllPeers(cb = (_) => {}) {
		this._api.listAllPeers().then((peers) => cb(peers)).catch((error) => this._abort($78455e22dea96b8c$export$9547aaa2e39030ff.ServerError, error));
	}
};
// src/game/p2p.ts
var ICE_CONFIG = { iceServers: [
	{ urls: "stun:stun.l.google.com:19302" },
	{ urls: "stun:stun1.l.google.com:19302" },
	{ urls: "stun:stun2.l.google.com:19302" }
] };
var P2PTransport = class {
	constructor(events) {
		this.peer = null;
		this.conn = null;
		this.role = null;
		this.roomCode = "";
		this.pingTimer = null;
		this.connectTimeout = null;
		this.destroyed = false;
		this.events = events;
	}
	getRole() {
		return this.role;
	}
	getRoomCode() {
		return this.roomCode;
	}
	isConnected() {
		return Boolean(this.conn && this.conn.open);
	}
	hostRoom(preferredCode) {
		this.cleanupPeer();
		this.destroyed = false;
		this.role = "host";
		this.roomCode = preferredCode ? normalizeRoomCode(preferredCode) : generateRoomCode(6);
		this.events.onStatusChange("creating");
		this.events.onPingUpdate(null);
		const peer = new $dd0187d7f28e386f$export$2e2bcd8739ae039(roomCodeToPeerId(this.roomCode), {
			config: ICE_CONFIG,
			debug: 0
		});
		this.peer = peer;
		peer.on("open", () => {
			if (this.destroyed || this.peer !== peer) return;
			this.events.onRoomReady(this.roomCode);
			this.events.onStatusChange("waiting");
		});
		peer.on("connection", (incoming) => {
			if (this.destroyed || this.peer !== peer) {
				incoming.close();
				return;
			}
			if (this.conn && this.conn.open) {
				incoming.close();
				return;
			}
			this.attachConnection(incoming);
		});
		peer.on("error", (err) => {
			if (this.destroyed || this.peer !== peer) return;
			if (err?.type === "unavailable-id" && !preferredCode) {
				this.hostRoom();
				return;
			}
			this.events.onStatusChange("error", err?.message || "Could not reach room signaling service.");
		});
	}
	joinRoom(rawCode) {
		const code = normalizeRoomCode(rawCode);
		if (!isValidRoomCode(code)) {
			this.events.onStatusChange("error", "Enter a valid 4–8 character room code.");
			return;
		}
		this.cleanupPeer();
		this.destroyed = false;
		this.role = "guest";
		this.roomCode = code;
		this.events.onStatusChange("connecting");
		this.events.onPingUpdate(null);
		const peer = new $dd0187d7f28e386f$export$2e2bcd8739ae039({
			config: ICE_CONFIG,
			debug: 0
		});
		this.peer = peer;
		this.connectTimeout = window.setTimeout(() => {
			if (this.destroyed || this.peer !== peer) return;
			if (!this.conn || !this.conn.open) {
				this.events.onStatusChange("error", `Room ${code} did not respond. Check the code and ensure the host is waiting.`);
				this.cleanupPeer();
			}
		}, 14e3);
		peer.on("open", () => {
			if (this.destroyed || this.peer !== peer) return;
			const conn = peer.connect(roomCodeToPeerId(code), {
				reliable: true,
				serialization: "json"
			});
			this.attachConnection(conn);
		});
		peer.on("error", (err) => {
			if (this.destroyed || this.peer !== peer) return;
			const msg = err?.type === "peer-unavailable" ? `Room ${code} was not found.` : err?.message || "Connection failed.";
			this.events.onStatusChange("error", msg);
		});
	}
	attachConnection(conn) {
		this.conn = conn;
		conn.on("open", () => {
			if (this.destroyed || this.conn !== conn) return;
			if (this.connectTimeout !== null) {
				window.clearTimeout(this.connectTimeout);
				this.connectTimeout = null;
			}
			this.events.onStatusChange("connected");
			this.startPingLoop();
		});
		conn.on("data", (raw) => {
			if (this.destroyed || this.conn !== conn) return;
			const msg = raw;
			if (!msg || typeof msg !== "object" || !("type" in msg)) return;
			if (msg.type === "ping") {
				this.send({
					type: "pong",
					ts: msg.ts
				});
				return;
			}
			if (msg.type === "pong") {
				const rtt = Math.max(1, Math.round(performance.now() - msg.ts));
				this.events.onPingUpdate(rtt);
				return;
			}
			this.events.onMessage(msg);
		});
		conn.on("close", () => {
			if (this.destroyed || this.conn !== conn) return;
			this.stopPingLoop();
			this.conn = null;
			this.events.onPingUpdate(null);
			if (this.role === "host") this.events.onStatusChange("disconnected", "Opponent left the room.");
			else this.events.onStatusChange("disconnected", "Disconnected from host.");
		});
		conn.on("error", () => {
			if (this.destroyed || this.conn !== conn) return;
			this.stopPingLoop();
			this.events.onPingUpdate(null);
			this.events.onStatusChange("error", "Peer connection error.");
		});
	}
	startPingLoop() {
		this.stopPingLoop();
		this.send({
			type: "ping",
			ts: performance.now()
		});
		this.pingTimer = window.setInterval(() => {
			if (this.conn?.open) this.send({
				type: "ping",
				ts: performance.now()
			});
		}, 2e3);
	}
	stopPingLoop() {
		if (this.pingTimer !== null) {
			window.clearInterval(this.pingTimer);
			this.pingTimer = null;
		}
	}
	send(msg) {
		if (this.conn && this.conn.open) try {
			this.conn.send(msg);
		} catch {}
	}
	cleanupPeer() {
		this.stopPingLoop();
		if (this.connectTimeout !== null) {
			window.clearTimeout(this.connectTimeout);
			this.connectTimeout = null;
		}
		if (this.conn) {
			try {
				this.conn.close();
			} catch {}
			this.conn = null;
		}
		if (this.peer) {
			try {
				this.peer.destroy();
			} catch {}
			this.peer = null;
		}
	}
	destroy() {
		this.destroyed = true;
		this.cleanupPeer();
		this.role = null;
		this.roomCode = "";
		this.events.onPingUpdate(null);
	}
};
// src/App.tsx
var INITIAL_CONFIG = {
	mode: "cpu",
	p1Fighter: "blaze",
	p2Fighter: "gale",
	stage: "sky_temple",
	stocks: 3,
	difficulty: "standard"
};
var INITIAL_ONLINE = {
	status: "idle",
	error: null,
	role: null,
	roomCode: "",
	pingMs: null,
	guestReady: false
};
var INITIAL_HUD = {
	fighters: [{
		slot: 0,
		id: "blaze",
		name: "Blaze",
		isCpu: false,
		damage: 0,
		stocks: 3,
		maxStocks: 3,
		shieldRatio: 1,
		hitFlash: false,
		respawning: false,
		primaryColor: "#EF4444",
		accentColor: "#FDBA74"
	}, {
		slot: 1,
		id: "gale",
		name: "Gale",
		isCpu: true,
		damage: 0,
		stocks: 3,
		maxStocks: 3,
		shieldRatio: 1,
		hitFlash: false,
		respawning: false,
		primaryColor: "#3B82F6",
		accentColor: "#67E8F9"
	}],
	elapsedSeconds: 0,
	countdownText: null,
	winnerSlot: null,
	koBannerText: null
};
function App() {
	const mountRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	const p2pRef = (0, import_react.useRef)(null);
	const initialInviteRoom = (0, import_react.useRef)(typeof window !== "undefined" ? parseRoomFromSearch(window.location.search) : null);
	const [config, setConfig] = (0, import_react.useState)(INITIAL_CONFIG);
	const configRef = (0, import_react.useRef)(INITIAL_CONFIG);
	const [hotkeys, setHotkeys] = (0, import_react.useState)(() => loadHotkeySettings());
	const hotkeysRef = (0, import_react.useRef)(hotkeys);
	const [screenState, setScreenState] = (0, import_react.useState)(() => {
		return new URLSearchParams(window.location.search).get("autostart") === "1" ? "playing" : "title";
	});
	const screenStateRef = (0, import_react.useRef)(screenState);
	const [menuView, setMenuView] = (0, import_react.useState)(() => initialInviteRoom.current ? "online" : "main");
	const [onlineTab, setOnlineTab] = (0, import_react.useState)(() => initialInviteRoom.current ? "join" : "host");
	const [joinCode, setJoinCode] = (0, import_react.useState)(() => initialInviteRoom.current ?? "");
	const [onlineState, setOnlineState] = (0, import_react.useState)(INITIAL_ONLINE);
	const onlineStateRef = (0, import_react.useRef)(INITIAL_ONLINE);
	const [hud, setHud] = (0, import_react.useState)(INITIAL_HUD);
	const [matchResult, setMatchResult] = (0, import_react.useState)(null);
	const [muted, setMuted] = (0, import_react.useState)(false);
	const [rematchRequested, setRematchRequested] = (0, import_react.useState)(false);
	const [opponentRematchRequested, setOpponentRematchRequested] = (0, import_react.useState)(false);
	const [disconnectNotice, setDisconnectNotice] = (0, import_react.useState)(null);
	const updateOnlineState = (0, import_react.useCallback)((updater) => {
		setOnlineState((prev) => {
			const next = updater(prev);
			onlineStateRef.current = next;
			return next;
		});
	}, []);
	(0, import_react.useEffect)(() => {
		screenStateRef.current = screenState;
		document.body.dataset.state = screenState;
		engineRef.current?.setScreenState(screenState);
	}, [screenState]);
	(0, import_react.useEffect)(() => {
		const container = mountRef.current;
		if (!container) return;
		const engine = new GameEngine(container, configRef.current, {
			onHudUpdate: (snapshot) => {
				setHud(snapshot);
			},
			onMatchEnd: (result) => {
				setMatchResult(result);
				setScreenState("gameover");
			},
			onScreenStateRequest: (next) => {
				setScreenState(next);
			},
			onSendNetMessage: (msg) => {
				p2pRef.current?.send(msg);
			}
		});
		engine.setHotkeys(hotkeysRef.current);
		engineRef.current = engine;
		const sendLobbySnapshot = (curConfig, guestReady) => {
			p2pRef.current?.send({
				type: "lobby",
				stage: curConfig.stage,
				stocks: curConfig.stocks,
				p1Fighter: curConfig.p1Fighter,
				p2Fighter: curConfig.p2Fighter,
				hostReady: true,
				guestReady
			});
		};
		const transport = new P2PTransport({
			onStatusChange: (status, detail) => {
				const role = transport.getRole();
				const roomCode = transport.getRoomCode();
				updateOnlineState((prev) => ({
					...prev,
					status,
					role,
					roomCode: roomCode || prev.roomCode,
					error: status === "error" || status === "disconnected" ? detail ?? null : null,
					guestReady: status === "connected" ? prev.guestReady : false
				}));
				if (status === "connected" && role === "host") sendLobbySnapshot(configRef.current, false);
				if ((status === "disconnected" || status === "error") && screenStateRef.current !== "title" && configRef.current.mode === "online") setDisconnectNotice(detail || "Opponent disconnected from the match.");
			},
			onRoomReady: (roomCode) => {
				updateOnlineState((prev) => ({
					...prev,
					roomCode
				}));
			},
			onPingUpdate: (pingMs) => {
				updateOnlineState((prev) => ({
					...prev,
					pingMs
				}));
			},
			onMessage: (msg) => {
				const role = transport.getRole();
				switch (msg.type) {
					case "lobby": {
						if (role !== "guest") break;
						const next = {
							...configRef.current,
							mode: "online",
							onlineRole: "guest",
							stage: msg.stage,
							stocks: msg.stocks,
							p1Fighter: msg.p1Fighter,
							p2Fighter: msg.p2Fighter
						};
						configRef.current = next;
						setConfig(next);
						engineRef.current?.updatePreviewConfig(next);
						updateOnlineState((prev) => ({
							...prev,
							guestReady: msg.guestReady
						}));
						break;
					}
					case "guest_choice": {
						if (role !== "host") break;
						const next = {
							...configRef.current,
							p2Fighter: msg.fighter
						};
						configRef.current = next;
						setConfig(next);
						engineRef.current?.updatePreviewConfig(next);
						updateOnlineState((prev) => ({
							...prev,
							guestReady: msg.ready
						}));
						sendLobbySnapshot(next, msg.ready);
						break;
					}
					case "start_match": {
						const next = {
							...configRef.current,
							mode: "online",
							onlineRole: role ?? "guest",
							stage: msg.stage,
							stocks: msg.stocks,
							p1Fighter: msg.p1Fighter,
							p2Fighter: msg.p2Fighter
						};
						configRef.current = next;
						setConfig(next);
						setMatchResult(null);
						setRematchRequested(false);
						setOpponentRematchRequested(false);
						setDisconnectNotice(null);
						setScreenState("playing");
						engineRef.current?.startNewMatch(next, false);
						break;
					}
					case "input":
						if (role === "host") engineRef.current?.pushRemoteInput(msg.payload);
						break;
					case "state":
						if (role === "guest") engineRef.current?.applyRemoteState(msg.payload);
						break;
					case "match_end":
						if (role === "guest") engineRef.current?.applyRemoteMatchEnd(msg.result);
						break;
					case "rematch_request":
						setOpponentRematchRequested(true);
						break;
					case "return_lobby":
						setMatchResult(null);
						setRematchRequested(false);
						setOpponentRematchRequested(false);
						setMenuView("online");
						setScreenState("title");
						engineRef.current?.updatePreviewConfig(configRef.current);
				}
			}
		});
		p2pRef.current = transport;
		if (new URLSearchParams(window.location.search).get("autostart") === "1") {
			engine.startNewMatch(configRef.current, true);
			setScreenState("playing");
		} else if (initialInviteRoom.current) {
			const next = {
				...configRef.current,
				mode: "online",
				onlineRole: "guest"
			};
			configRef.current = next;
			setConfig(next);
			updateOnlineState((prev) => ({
				...prev,
				role: "guest",
				roomCode: initialInviteRoom.current ?? ""
			}));
			transport.joinRoom(initialInviteRoom.current);
		}
		return () => {
			transport.destroy();
			p2pRef.current = null;
			engine.destroy();
			engineRef.current = null;
		};
	}, [updateOnlineState]);
	const handleChangeConfig = (0, import_react.useCallback)((next) => {
		configRef.current = next;
		setConfig(next);
		engineRef.current?.updatePreviewConfig(next);
		if (onlineStateRef.current.role === "host" && onlineStateRef.current.status === "connected") p2pRef.current?.send({
			type: "lobby",
			stage: next.stage,
			stocks: next.stocks,
			p1Fighter: next.p1Fighter,
			p2Fighter: next.p2Fighter,
			hostReady: true,
			guestReady: onlineStateRef.current.guestReady
		});
	}, []);
	const handleChangeHotkeys = (0, import_react.useCallback)((next) => {
		hotkeysRef.current = next;
		setHotkeys(next);
		saveHotkeySettings(next);
		engineRef.current?.setHotkeys(next);
	}, []);
	const handleStartMatch = (0, import_react.useCallback)((overrideConfig) => {
		const nextConfig = overrideConfig ?? configRef.current;
		if (overrideConfig) {
			configRef.current = overrideConfig;
			setConfig(overrideConfig);
		}
		setMatchResult(null);
		setRematchRequested(false);
		setOpponentRematchRequested(false);
		setDisconnectNotice(null);
		setScreenState("playing");
		engineRef.current?.startNewMatch(nextConfig, false);
	}, []);
	const handleHostOnline = (0, import_react.useCallback)(() => {
		const next = {
			...configRef.current,
			mode: "online",
			onlineRole: "host"
		};
		configRef.current = next;
		setConfig(next);
		engineRef.current?.updatePreviewConfig(next);
		updateOnlineState(() => ({
			...INITIAL_ONLINE,
			role: "host",
			status: "creating"
		}));
		p2pRef.current?.hostRoom();
	}, [updateOnlineState]);
	const handleJoinOnline = (0, import_react.useCallback)((rawCode) => {
		const code = normalizeRoomCode(rawCode);
		const next = {
			...configRef.current,
			mode: "online",
			onlineRole: "guest"
		};
		configRef.current = next;
		setConfig(next);
		engineRef.current?.updatePreviewConfig(next);
		updateOnlineState(() => ({
			...INITIAL_ONLINE,
			role: "guest",
			roomCode: code,
			status: "connecting"
		}));
		p2pRef.current?.joinRoom(code);
	}, [updateOnlineState]);
	const handleLeaveOnline = (0, import_react.useCallback)(() => {
		p2pRef.current?.destroy();
		updateOnlineState(() => INITIAL_ONLINE);
		const next = {
			...configRef.current,
			mode: "cpu",
			onlineRole: void 0
		};
		configRef.current = next;
		setConfig(next);
		engineRef.current?.updatePreviewConfig(next);
	}, [updateOnlineState]);
	const handleGuestChoice = (0, import_react.useCallback)((fighter, ready) => {
		const next = {
			...configRef.current,
			p2Fighter: fighter
		};
		configRef.current = next;
		setConfig(next);
		engineRef.current?.updatePreviewConfig(next);
		updateOnlineState((prev) => ({
			...prev,
			guestReady: ready
		}));
		p2pRef.current?.send({
			type: "guest_choice",
			fighter,
			ready
		});
	}, [updateOnlineState]);
	const handleStartOnlineMatch = (0, import_react.useCallback)(() => {
		if (!p2pRef.current?.isConnected()) return;
		const next = {
			...configRef.current,
			mode: "online",
			onlineRole: "host"
		};
		configRef.current = next;
		setConfig(next);
		p2pRef.current.send({
			type: "start_match",
			stage: next.stage,
			stocks: next.stocks,
			p1Fighter: next.p1Fighter,
			p2Fighter: next.p2Fighter
		});
		setMatchResult(null);
		setRematchRequested(false);
		setOpponentRematchRequested(false);
		setDisconnectNotice(null);
		setScreenState("playing");
		engineRef.current?.startNewMatch(next, false);
	}, []);
	const handleRequestRematch = (0, import_react.useCallback)(() => {
		setRematchRequested(true);
		p2pRef.current?.send({ type: "rematch_request" });
	}, []);
	const handleResume = (0, import_react.useCallback)(() => {
		setScreenState("playing");
	}, []);
	const handleRestart = (0, import_react.useCallback)(() => {
		if (configRef.current.mode === "online") return;
		setMatchResult(null);
		setScreenState("playing");
		engineRef.current?.startNewMatch(configRef.current, false);
	}, []);
	const handleReturnTitle = (0, import_react.useCallback)(() => {
		const isOnline = configRef.current.mode === "online";
		const isLeavingMidMatch = isOnline && (screenStateRef.current === "paused" || Boolean(disconnectNotice));
		setMatchResult(null);
		setRematchRequested(false);
		setOpponentRematchRequested(false);
		setDisconnectNotice(null);
		if (isOnline && !isLeavingMidMatch && p2pRef.current?.isConnected()) {
			p2pRef.current.send({ type: "return_lobby" });
			setMenuView("online");
			setScreenState("title");
			engineRef.current?.updatePreviewConfig(configRef.current);
			return;
		}
		if (isOnline) {
			handleLeaveOnline();
			setMenuView("online");
			setScreenState("title");
			return;
		}
		setMenuView("main");
		setScreenState("title");
		engineRef.current?.updatePreviewConfig(configRef.current);
	}, [disconnectNotice, handleLeaveOnline]);
	const handleToggleMute = (0, import_react.useCallback)(() => {
		const engine = engineRef.current;
		if (!engine) return;
		const next = !engine.audio.isMuted();
		engine.audio.setMuted(next);
		setMuted(next);
	}, []);
	(0, import_react.useEffect)(() => {
		const onKeyDown = (e) => {
			if (e.repeat) return;
			const boundToGame = isHotkeyBound(hotkeysRef.current, configRef.current.mode, e.code);
			if (screenStateRef.current === "paused" && (e.code === "Escape" || !boundToGame && e.code === "KeyP")) {
				e.preventDefault();
				handleResume();
			} else if (screenStateRef.current === "playing" && !boundToGame && e.code === "KeyR" && configRef.current.mode !== "online") {
				e.preventDefault();
				handleRestart();
			} else if (screenStateRef.current === "playing" && !boundToGame && e.code === "KeyM") setMuted(engineRef.current?.audio.isMuted() ?? false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [handleResume, handleRestart]);
	const isOnlineMatch = config.mode === "online";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "relative w-full h-full overflow-hidden bg-slate-950",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				ref: mountRef,
				className: "fixed inset-0"
			}),
			screenState === "title" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TitleScreen, {
				config,
				hotkeys,
				menuView,
				onlineTab,
				joinCode,
				onlineState,
				onChangeMenuView: setMenuView,
				onChangeOnlineTab: setOnlineTab,
				onChangeJoinCode: setJoinCode,
				onChangeConfig: handleChangeConfig,
				onChangeHotkeys: handleChangeHotkeys,
				onStartMatch: handleStartMatch,
				onHostOnline: handleHostOnline,
				onJoinOnline: handleJoinOnline,
				onLeaveOnline: handleLeaveOnline,
				onGuestChoice: handleGuestChoice,
				onStartOnlineMatch: handleStartOnlineMatch
			}),
			(screenState === "playing" || screenState === "paused") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameHud, {
				hud,
				muted,
				isOnline: isOnlineMatch,
				onToggleMute: handleToggleMute,
				onPause: () => setScreenState("paused"),
				onRestart: handleRestart
			}),
			screenState === "paused" && !disconnectNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseModal, {
				isOnline: isOnlineMatch,
				controlSummary: formatControlSummary(hotkeys, config.mode),
				onResume: handleResume,
				onRestart: handleRestart,
				onReturnTitle: handleReturnTitle
			}),
			screenState === "gameover" && matchResult && !disconnectNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GameOverModal, {
				result: matchResult,
				isOnline: isOnlineMatch,
				onlineRole: config.onlineRole,
				rematchRequested,
				opponentRematchRequested,
				onRequestRematch: handleRequestRematch,
				onPlayAgain: () => isOnlineMatch ? handleStartOnlineMatch() : handleStartMatch(),
				onReturnTitle: handleReturnTitle
			}),
			disconnectNotice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DisconnectModal, {
				message: disconnectNotice,
				onReturnLobby: handleReturnTitle
			})
		]
	});
}
// src/main.tsx
(0, import_client.createRoot)(document.getElementById("root")).render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(App, {}));
