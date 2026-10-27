/** Standalone Gameface adapter. Keep its browser dependencies inside this function. */
export function runOreClient(desktopWidth, desktopHeight) {
  'use strict';
  if (window.__coreOreInstalled) return;
  window.__coreOreInstalled = true;
  var active = null,
    cached = {},
    loading = {},
    pending = null,
    hidden = null,
    saved = null;
  var overlay = null,
    canvas = null,
    outgoingCanvas = null,
    elements = {},
    captions = {},
    controls = [],
    specs = {};
  var assetsDue = null;
  var frameHeader = '',
    frameState = null,
    frameWait = null;
  var selections = {},
    switchControls = {},
    localRevision = 0;
  var visibilityStamp = '',
    visibility = {};
  var currentLayout = null,
    keyboardFocus = false;
  var regions = {},
    scrollMemory = {},
    scrollDrag = null;
  var localValues = {},
    dirty = {},
    queuedValues = {},
    queuedAt = {},
    queuedAction = null,
    fieldControls = {},
    fieldDrag = null,
    popup = null,
    inputSequence = 0;
  var failedSession = null,
    ready = false,
    focused = null,
    focusMemory = {},
    priorFocus = null,
    heldKey = null;
  var carrierHint = null,
    lostAt = null,
    dismissing = false,
    scheduled = false,
    observer = null,
    observedRoot = null;
  var lastPaint = '',
    mountedAsset = null,
    presentedSession = null;
  var diagnostics = false;
  var debug = (window.__coreOreDebug = {
    status: 'waiting',
    error: null,
    scans: 0,
    paints: 0,
    layoutRequests: 0,
  });

  window.__coreOreBindNativeInput = function (input, changed) {
    if (!input || typeof changed !== 'function') return;

    function receive() {
      var session = input.getAttribute('data-core-ore-input-session'),
        packet;

      if (!session) return;

      try {
        packet = JSON.parse(input.value);
      } catch (invalid) {
        return;
      }

      if (!packet || String(packet.session) !== session) return;
      changed(input.value, { addedChars: '', removedChars: '', invalidChars: '', index: -1 });
    }

    input.addEventListener('core-ore-field-change', receive);
    input.setAttribute('data-core-ore-field-bridge', '1');

    return function () {
      input.removeEventListener('core-ore-field-change', receive);
      input.removeAttribute('data-core-ore-field-bridge');
      input.removeAttribute('data-core-ore-input-session');
    };
  };

  var fonts = document.createElement('style');

  fonts.textContent
    = '@font-face{font-family:CoreOreMojangles;src:url("/hbui/core-ore/fonts/mojangles.ttf");coh-font-sdf:off;}'
      + '@font-face{font-family:CoreOreMinecraftTen;src:url("/hbui/core-ore/fonts/minecraft-ten.ttf");coh-font-sdf:off;}';
  (document.head || document.body).appendChild(fonts);

  function restore() {
    if (hidden) {
      hidden.style.visibility = saved.visibility;
      hidden.style.pointerEvents = saved.pointerEvents;
    }

    hidden = saved = null;
  }

  function resetPresentation() {
    canvas = currentLayout = null;
    elements = {};
    captions = {};
    controls = [];
    specs = {};
    regions = {};
    scrollDrag = null;
    fieldDrag = null;
    closePopup();
    fieldControls = {};
    mountedAsset = null;
    presentedSession = null;
    assetsDue = null;
    selections = {};
    switchControls = {};
    localRevision = 0;
  }

  function removePresentation() {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = outgoingCanvas = null;
    resetPresentation();
  }

  function teardown() {
    restore();
    removePresentation();
    active = null;
    pending = null;
    failedSession = null;
    ready = false;
    carrierHint = null;
    lostAt = null;
    dismissing = false;
    heldKey = null;
    focused = null;
    lastPaint = '';
    focusMemory = {};
    scrollMemory = {};
    keyboardFocus = false;
    localValues = {};
    dirty = {};
    queuedValues = {};
    queuedAt = {};
    queuedAction = null;
    inputSequence = 0;
    frameHeader = '';
    frameState = frameWait = null;
    debug.pending = null;
    debug.focused = null;
    debug.status = debug.error ? 'failed' : 'waiting';
    if (
      priorFocus
      && document.getElementById('root')
      && document.getElementById('root').contains(priorFocus)
      && priorFocus.focus
    )
      priorFocus.focus();
    priorFocus = null;
  }

  function fail(message) {
    if (active && failedSession === active.session) return;
    debug.error = String(message);
    debug.status = 'failed';
    if (active) failedSession = active.session;
    pending = null;
    ready = false;
    debug.pending = null;
    queuedValues = {};
    queuedAt = {};
    queuedAction = null;
    fieldDrag = null;
    scrollDrag = null;
    closePopup();
    if (overlay) overlay.style.display = 'none';
    var dismiss = target('dismiss');

    debug.closeRequested = !!dismiss;

    if (dismiss) {
      try {
        dismiss.dispatchEvent(clickEvent());
      } catch (closeError) {
        debug.closeError = String(closeError);
      }
    }

    showStatus();
  }

  function showStatus() {
    var badge = document.getElementById('core-ore-bootstrap');

    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'core-ore-bootstrap';
      badge.style.cssText
        = 'position:fixed;right:12px;top:12px;max-width:460px;padding:10px;background:#172028;color:white;border:1px solid #83cda0;font:14px sans-serif;z-index:2147481000;pointer-events:none;';
      document.body.appendChild(badge);
    }

    badge.style.display
      = debug.error || (diagnostics && active) ? '' : !active || overlay ? 'none' : '';
    badge.textContent
      = diagnostics && active
        ? 'Ore diagnostics | focus: '
        + focused
        + ' | ready: '
        + ready
        + ' | reply: '
        + debug.lastAckMs
        + ' ms | DOM notifications: '
        + !!debug.notifications
        + ' | scale: '
        + debug.scale
        + ' | native form: '
        + debug.transport
        + ' | images: '
        + (debug.imagesLoaded || 0)
        + '/'
        + (debug.imagesExpected || 0)
        : debug.error
          ? 'Experimental UI failed: ' + debug.error + (active ? ' | Press Escape to close.' : '')
          : 'Custom UI: ' + debug.status;
  }

  function findText(prefix) {
    var root = document.getElementById('root');

    if (!root) return null;
    var nodes = root.querySelectorAll('*'),
      best = null,
      length = Infinity;

    debug.nativeElements = nodes.length;

    for (var i = 0; i < nodes.length; i++) {
      var text = (nodes[i].textContent || '').trim();

      if (text.indexOf(prefix) === 0 && text.length <= length) {
        best = nodes[i];
        length = text.length;
      }
    }

    return best;
  }

  function target(id, session) {
    if (session === undefined) session = active && active.session;
    if (session === null || session === undefined) return null;
    var leaf = findText('CORE_ORE_ACTION:' + session + ':' + id + ' |');
    var root = document.getElementById('root'),
      fallback = null;

    for (var node = leaf; node && node !== root; node = node.parentElement) {
      var tag = (node.tagName || '').toLowerCase();

      if (
        tag === 'button'
        || node.getAttribute('role') === 'button'
        || node.hasAttribute('tabindex')
      )
        return node;
      if (!fallback && tag === 'fast-div' && node.hasAttribute('data-testid')) fallback = node;
    }

    return fallback || leaf;
  }

  function requestRefresh() {
    if (scheduled) return;
    scheduled = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(refresh);
    else window.setTimeout(refresh, 0);
  }

  function clickEvent() {
    try {
      return new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        view: window,
      });
    } catch (unsupported) {
      var event = document.createEvent('MouseEvents');

      if (!event || typeof event.initMouseEvent !== 'function')
        throw new Error('Native click event unavailable');
      event.initMouseEvent(
        'click',
        true,
        true,
        window,
        1,
        0,
        0,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null,
      );

      return event;
    }
  }

  function dispatch(id, readiness) {
    if (
      !active
      || failedSession === active.session
      || (!readiness && (!ready || presentedSession !== active.session))
    )
      return;

    if (!readiness) {
      var value = valueFor(id);

      if (!value || !value.visible || !value.enabled) return;
    }

    if (pending) {
      if (!readiness && pending.kind === 'field' && queuedAction === null) queuedAction = id;

      return;
    }

    if (!readiness && hasQueuedValues()) {
      queuedAction = id;
      flushFieldChanges(true);

      return;
    }

    var native = target(id);

    if (!native) return fail('Native action target missing: ' + id);
    pending = {
      ack: active.ack,
      revision: active.revision,
      time: Date.now(),
      ready: readiness,
      target: native.tagName || 'unknown',
    };
    debug.pending = id;
    debug.status = readiness ? 'checking callback' : 'waiting for action';
    updateControls();
    var sent = pending;

    window.setTimeout(function () {
      if (pending === sent) updateControls();
    }, 200);

    try {
      native.dispatchEvent(clickEvent());
      requestRefresh();
    } catch (error) {
      fail(error);
    }
  }

  function closePopup() {
    if (popup && popup.parentNode) popup.parentNode.removeChild(popup);
    popup = null;
    for (var id in fieldControls)
      if (fieldControls[id].spec.field.kind === 'dropdown')
        fieldControls[id].node.setAttribute('aria-expanded', 'false');
  }

  function popupGeometry() {
    return [
      debug.scale,
      canvas.style.left,
      canvas.style.top,
      window.innerWidth,
      window.innerHeight,
    ].join('|');
  }

  function fieldColor(code) {
    var colors = [
      '#000000',
      '#0000aa',
      '#00aa00',
      '#00aaaa',
      '#aa0000',
      '#aa00aa',
      '#ffaa00',
      '#aaaaaa',
      '#555555',
      '#5555ff',
      '#55ff55',
      '#55ffff',
      '#ff5555',
      '#ff55ff',
      '#ffff55',
      '#ffffff',
    ];
    var match = String(code || '').match(/\u00a7([0-9a-f])/i);

    return match ? colors[parseInt(match[1], 16)] : 'inherit';
  }

  function hasQueuedValues() {
    for (var id in queuedValues) return true;

    return false;
  }

  function flushFieldChanges(force) {
    if (
      !active
      || pending
      || !ready
      || lostAt !== null
      || failedSession === active.session
      || presentedSession !== active.session
    )
      return;
    force = force || queuedAction !== null;

    for (var id in queuedValues) {
      var control = fieldControls[id];

      if (!control || !available(control)) {
        delete queuedValues[id];
        delete queuedAt[id];
        delete dirty[id];
        var accepted = valueFor(id);

        if (control && accepted) {
          localValues[id] = accepted.input;
          renderField(control);
          styleControl(control);
        }

        continue;
      }

      if (control.composing || (!force && queuedAt[id] > Date.now())) continue;
      var value = queuedValues[id];

      delete queuedValues[id];
      delete queuedAt[id];
      sendField(id, value);

      return;
    }

    if (!hasQueuedValues() && queuedAction !== null) {
      var action = queuedAction;

      queuedAction = null;
      dispatch(action, false);
    }
  }

  function fieldEvent(name) {
    try {
      return new Event(name, { bubbles: true, cancelable: true });
    } catch (unsupported) {}

    var types = ['Event', 'Events', 'HTMLEvents'],
      event;

    for (var i = 0; i < types.length; i++) {
      try {
        event = document.createEvent(types[i]);

        if (event && typeof event.initEvent === 'function') {
          event.initEvent(name, true, true);

          return event;
        }
      } catch (unsupported) {}
    }

    // Gameface also exposes the MouseEvent interface for dispatching named DOM events.
    try {
      return new MouseEvent(name, {
        bubbles: true,
        cancelable: true,
        button: 0,
        buttons: 0,
        view: window,
      });
    } catch (unsupported) {}

    types = ['MouseEvent', 'MouseEvents'];

    for (var i = 0; i < types.length; i++) {
      try {
        event = document.createEvent(types[i]);

        if (event && typeof event.initMouseEvent === 'function') {
          event.initMouseEvent(
            name,
            true,
            true,
            window,
            0,
            0,
            0,
            0,
            0,
            false,
            false,
            false,
            false,
            0,
            null,
          );

          return event;
        }
      } catch (unsupported) {}
    }

    throw new Error('Native field event unavailable: ' + name);
  }

  function sendField(id, value) {
    var label = findText('CORE_ORE_INPUT:' + active.session + ' |'),
      input = null;

    for (
      var node = label;
      node && node !== document.getElementById('root');
      node = node.parentElement
    ) {
      var candidates = node.querySelectorAll('input,textarea');

      if (candidates.length === 1) {
        input = candidates[0];
        break;
      }

      if (candidates.length > 1) break;
    }

    if (!input) return fail('Native field input missing');
    if (input.getAttribute('data-core-ore-field-bridge') !== '1')
      return fail('Native field callback adapter missing; reload the matching resource pack');
    var packet = JSON.stringify({
      session: active.session,
      sequence: ++inputSequence,
      id: id,
      value: value,
    });

    if (packet.length > 5000) return fail('Field change exceeds native text limit');
    pending = {
      kind: 'field',
      fieldId: id,
      ack: active.ack,
      revision: active.revision,
      time: Date.now(),
      ready: false,
      target: 'field input',
    };
    debug.pending = id;
    updateControls();

    try {
      var event = fieldEvent('core-ore-field-change');

      input.setAttribute('data-core-ore-input-session', String(active.session));
      var descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value');

      if (descriptor && descriptor.set) descriptor.set.call(input, packet);
      else input.value = packet;
      input.dispatchEvent(event);
      requestRefresh();
    } catch (error) {
      fail(error);
    }
  }

  function editField(control, value) {
    if (
      !available(control)
      || !ready
      || lostAt !== null
      || presentedSession !== active.session
      || (pending && pending.kind !== 'field')
    )
      return;
    if (localValues[control.id] === value) return;
    localValues[control.id] = value;
    dirty[control.id] = true;
    queuedValues[control.id] = value;
    var delay
      = control.spec.field.kind === 'input' ? 120 : control.spec.field.kind === 'slider' ? 50 : 0;

    queuedAt[control.id] = Date.now() + delay;
    renderField(control);
    styleControl(control);
    debug.inputs = localValues;
    var session = active.session;

    if (delay)
      window.setTimeout(function () {
        if (active && active.session === session) flushFieldChanges();
      }, delay);
    else flushFieldChanges();
  }

  function fieldNumber(control, value) {
    var field = control.spec.field,
      step = field.step || 1;
    var end = field.min + Math.floor((field.max - field.min) / step + 1e-9) * step;

    return Number(
      Math.max(
        field.min,
        Math.min(end, Math.round((value - field.min) / step) * step + field.min),
      ).toFixed(10),
    );
  }

  function pointerNumber(control, event) {
    var spec = control.spec,
      scale = debug.scale || 1,
      left = parseFloat(canvas.style.left) + spec.rect[0] * scale;

    if (spec.region)
      left
        += currentLayout.nodes.filter(function (node) {
          return node.scroll && node.scroll.id === spec.region;
        })[0].scroll.viewport[0] * scale;
    var width = spec.rect[2] * scale,
      thumb = (spec.field.thumbWidth || 16) * scale;

    return fieldNumber(
      control,
      spec.field.min
      + ((Number(event.clientX) - left - thumb / 2) / Math.max(1, width - thumb))
      * (spec.field.max - spec.field.min),
    );
  }

  function openDropdown(control) {
    closePopup();
    if (!available(control) || (pending && pending.kind !== 'field')) return;
    var spec = control.spec,
      scale = debug.scale || 1,
      field = spec.field;

    popup = document.createElement('div');
    popup.style.cssText
      = 'position:absolute;box-sizing:border-box;overflow:hidden;pointer-events:auto;image-rendering:pixelated;z-index:50;';
    var x = spec.rect[0],
      y = spec.rect[1] + spec.rect[3];

    if (spec.region) {
      var region = regions[spec.region];

      x += region.spec.scroll.viewport[0];
      y += region.spec.scroll.viewport[1] - region.offset;
    }

    var padding = scale,
      rowHeight = 17 * scale,
      contentHeight = field.options.length * rowHeight + scale;
    var height = Math.min(
      (field.popupHeight || Math.min(8, field.options.length) * 17 + 3) * scale,
      window.innerHeight - 24,
    );
    var width = Math.min(spec.rect[2] * scale, window.innerWidth - 24),
      left = parseFloat(canvas.style.left),
      top = parseFloat(canvas.style.top);

    if (top + y * scale + height > window.innerHeight - 12) y -= spec.rect[3] + height / scale;
    popup.style.left
      = Math.max(12 - left, Math.min(x * scale, window.innerWidth - 12 - left - width)) + 'px';
    popup.style.top
      = Math.max(12 - top, Math.min(y * scale, window.innerHeight - 12 - top - height)) + 'px';
    popup.style.width = width + 'px';
    popup.style.height = height + 'px';
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('data-core-ore-owner', control.id);
    popup.setAttribute('data-core-ore-geometry', popupGeometry());
    var background = document.createElement('div');

    background.style.cssText
      = 'position:absolute;box-sizing:border-box;left:0;top:0;width:100%;height:100%;pointer-events:none;';
    if (field.surfaces && field.surfaces.popupBackground)
      surface(background, field.surfaces.popupBackground);
    popup.appendChild(background);
    var viewport = document.createElement('div');

    viewport.style.cssText
      = 'position:absolute;overflow:hidden;left:'
        + padding
        + 'px;top:'
        + padding
        + 'px;width:'
        + (width - 2 * padding)
        + 'px;height:'
        + (height - 2 * padding)
        + 'px;';
    popup.appendChild(viewport);
    var list = document.createElement('div'),
      offset = 0;

    list.style.cssText
      = 'position:absolute;left:0;top:0;width:100%;height:' + contentHeight + 'px;';
    viewport.appendChild(list);
    field.options.forEach(function (option, index) {
      var row = document.createElement('div'),
        selected = localValues[control.id] === index,
        style = option.style || {},
        faces = field.surfaces || {};

      row.style.cssText
        = 'position:absolute;box-sizing:border-box;left:0;top:'
          + index * rowHeight
          + 'px;width:100%;height:'
          + (rowHeight + scale)
          + 'px;cursor:pointer;';
      row.style.zIndex = selected ? '1' : '0';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(selected));
      var face = document.createElement('div');

      face.style.cssText
        = 'position:absolute;box-sizing:border-box;left:0;top:0;width:100%;height:100%;pointer-events:none;';
      row.appendChild(face);
      var normal = selected
        ? faces['option' + index + 'Selected']
        || faces.optionSelected
        || faces['option' + index + 'Background']
        || faces.optionBackground
        : faces['option' + index + 'Background'] || faces.optionBackground;

      if (normal) surface(face, normal);
      var label = document.createElement('div'),
        fontSize = 10 * (style.scale || 1) * scale,
        color = (selected && style.colorSelected) || style.color;

      label.textContent = option.label.replace(/\u00a7./g, '');
      label.style.cssText
        = 'position:absolute;box-sizing:border-box;left:0;top:'
          + (selected ? (style.dropSelected || 0) * scale : 0)
          + 'px;width:100%;height:100%;display:flex;flex-direction:row;align-items:center;justify-content:'
          + (style.align === 'center'
            ? 'center'
            : style.align === 'right'
              ? 'flex-end'
              : 'flex-start')
            + ';padding:0 '
            + 4 * scale
            + 'px;font-family:'
            + (style.font === 'MinecraftTen' ? 'CoreOreMinecraftTen' : 'CoreOreMojangles')
            + ';font-size:'
            + fontSize
            + 'px;line-height:'
            + fontSize
            + 'px;white-space:pre;pointer-events:none;';
      label.style.color = color
        ? 'rgb('
        + color
          .map(function (channel) {
            return Math.round(channel * 255);
          })
          .join(',')
          + ')'
        : fieldColor(option.label);
      row.appendChild(label);
      row.addEventListener('mouseenter', function () {
        row.style.zIndex = '2';
        var hover = faces['option' + index + 'Hover'] || faces.optionHover;

        if (hover) surface(face, hover);
      });
      row.addEventListener('mouseleave', function () {
        row.style.zIndex = selected ? '1' : '0';
        if (normal) surface(face, normal);
      });
      row.addEventListener('mousedown', function (event) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        editField(control, index);
        closePopup();
        focusControl(control.id);
      });
      list.appendChild(row);
    });
    popup.addEventListener('wheel', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var delta = event.deltaY || 0;

      delta
        = event.deltaMode === 1
          ? delta * rowHeight
          : event.deltaMode === 2
            ? delta * (height - 2 * padding)
            : delta;
      offset = Math.max(0, Math.min(contentHeight - (height - 2 * padding), offset + delta));
      list.style.top = -offset + 'px';
    });
    canvas.appendChild(popup);
    control.node.setAttribute('aria-expanded', 'true');
  }

  function makeField(node, spec) {
    node.style.pointerEvents = 'auto';
    var field = spec.field,
      control = { node: node, id: spec.id, spec: spec, hovered: false, pressed: false };

    fieldControls[spec.id] = control;
    controls.push(control);
    node.style.outline = 'none';
    node.setAttribute(
      'role',
      field.kind === 'toggle'
        ? 'switch'
        : field.kind === 'slider'
          ? 'slider'
          : field.kind === 'dropdown'
            ? 'combobox'
            : 'group',
    );
    var inner = document.createElement(field.kind === 'input' ? 'input' : 'div');

    control.inner = inner;
    node.appendChild(inner);
    inner.style.cssText = 'position:absolute;box-sizing:border-box;';
    inner.tabIndex = -1;

    if (field.kind === 'slider') {
      control.track = document.createElement('div');
      control.progress = document.createElement('div');
      control.thumb = document.createElement('div');
      node.appendChild(control.track);
      node.appendChild(control.progress);
      node.appendChild(control.thumb);
    }

    if (field.kind === 'input') {
      inner.setAttribute('type', 'text');
      inner.setAttribute('maxlength', '512');
      inner.setAttribute('placeholder', field.placeholder || '');
      inner.addEventListener('input', function () {
        editField(control, inner.value);
      });
      inner.addEventListener('compositionstart', function () {
        control.composing = true;
      });
      inner.addEventListener('compositionend', function () {
        control.composing = false;
        editField(control, inner.value);
        flushFieldChanges(queuedAction !== null);
      });
      inner.addEventListener('focus', function () {
        if (available(control) && focused !== spec.id) focusControl(spec.id);
      });
    }

    node.addEventListener('focus', function () {
      if (available(control) && focused !== spec.id) focusControl(spec.id);
    });
    node.addEventListener('mouseenter', function () {
      control.hovered = true;
      renderField(control);
      styleControl(control);
    });
    node.addEventListener('mouseleave', function () {
      control.hovered = false;
      styleControl(control);
    });
    node.addEventListener('keydown', onKey);
    node.addEventListener('keyup', onKeyUp);
    node.addEventListener('mousedown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.stopPropagation();

      if (!available(control) || (pending && pending.kind !== 'field') || !ready) {
        event.preventDefault();

        return;
      }

      if (field.kind !== 'input') event.preventDefault();
      keyboardFocus = false;
      focusControl(spec.id);
      if (field.kind === 'toggle') editField(control, !localValues[spec.id]);
      if (field.kind === 'dropdown') openDropdown(control);

      if (field.kind === 'slider' && isFinite(Number(event.clientX))) {
        editField(control, pointerNumber(control, event));
        fieldDrag = control;
        renderField(control);
      }
    });
  }

  function renderField(control) {
    if (!ownsControl(control)) return;
    var field = control.spec.field,
      value = localValues[control.id],
      scale = debug.scale || 1,
      width = control.spec.rect[2] * scale,
      height = control.spec.rect[3] * scale;
    var inner = control.inner;

    inner.style.cssText
      = 'position:absolute;box-sizing:border-box;left:0;top:0;width:100%;height:100%;display:flex;flex-direction:row;justify-content:flex-start;align-items:center;padding:0 '
        + (field.inset === undefined ? 8 : field.inset) * scale
        + 'px;font:inherit;font-size:'
        + 10 * (field.scale || 1) * scale
        + 'px;font-family:'
        + (field.font === 'MinecraftTen' ? 'CoreOreMinecraftTen' : 'CoreOreMojangles')
        + ';color:inherit;border:0;background:transparent;outline:none;';

    if (field.kind === 'input') {
      if (!control.composing && inner.value !== String(value)) inner.value = String(value);
      inner.disabled = !available(control) || !ready || !!(pending && pending.kind !== 'field');

      return;
    }

    if (field.kind === 'toggle') {
      inner.textContent = '';
      control.node.setAttribute('aria-checked', String(!!value));
    }

    if (field.kind === 'dropdown') {
      inner.textContent = ((field.options[value] || {}).label || '').replace(/\u00a7./g, '');
      inner.style.color = fieldColor(field.color);
      control.node.setAttribute(
        'aria-expanded',
        String(!!popup && popup.getAttribute('data-core-ore-owner') === control.id),
      );
    }

    if (field.kind === 'slider') {
      inner.textContent = '';
      var surfaces = field.surfaces || {},
        fraction = (value - field.min) / (field.max - field.min),
        thumbWidth = (field.thumbWidth || 16) * scale,
        thumbHeight = (field.thumbHeight || 16) * scale,
        trackHeight = (field.trackHeight || 10) * scale;

      control.track.style.cssText
        = 'position:absolute;box-sizing:border-box;pointer-events:none;left:0;top:'
          + (height - trackHeight) / 2
          + 'px;width:100%;height:'
          + trackHeight
          + 'px;';
      control.progress.style.cssText
        = 'position:absolute;box-sizing:border-box;pointer-events:none;left:0;top:'
          + (height - trackHeight) / 2
          + 'px;width:'
          + fraction * width
          + 'px;height:'
          + trackHeight
          + 'px;';
      control.thumb.style.cssText
        = 'position:absolute;box-sizing:border-box;pointer-events:none;left:'
          + fraction * (width - thumbWidth)
          + 'px;top:'
          + (height - thumbHeight) / 2
          + 'px;width:'
          + thumbWidth
          + 'px;height:'
          + thumbHeight
          + 'px;';
      surface(
        control.progress,
        control.hovered ? surfaces.progressHover || surfaces.progress : surfaces.progress,
      );
      surface(
        control.thumb,
        !available(control)
          ? surfaces.thumbLocked || surfaces.thumb
          : fieldDrag === control
            ? surfaces.thumbPressed || surfaces.thumb
            : control.hovered
              ? surfaces.thumbHover || surfaces.thumb
              : surfaces.thumb,
      );
      control.node.setAttribute('aria-valuemin', String(field.min));
      control.node.setAttribute('aria-valuemax', String(field.max));
      control.node.setAttribute('aria-valuenow', String(value));
    }
  }

  function conceal(carrier, title, session) {
    if (hidden && hidden.contains(carrier)) return true;
    var nativeReady = target('ready', session),
      root = document.getElementById('root'),
      titleLabel = title && findText(title);

    if (!nativeReady || !titleLabel || carrier.contains(titleLabel)) return false;

    for (
      var node = carrier.parentElement;
      node && node !== root && node !== document.body;
      node = node.parentElement
    ) {
      if (node.contains(nativeReady) && node.contains(titleLabel)) {
        restore();
        priorFocus = document.activeElement;
        saved = { visibility: node.style.visibility, pointerEvents: node.style.pointerEvents };
        hidden = node;
        node.style.visibility = 'hidden';
        node.style.pointerEvents = 'none';

        return true;
      }
    }

    return false;
  }

  function rawValue(id) {
    for (var i = 0; active && i < active.values.length; i++)
      if (active.values[i].id === id) return active.values[i];

    return (specs[id] && specs[id].initial) || null;
  }

  function switchState(id) {
    var spec = specs[id],
      control = switchControls[id],
      choice = spec && spec.switch;

    if (!choice) return 'off';
    var on = choice.exclusive
      ? selections[choice.group] === choice.index
      : !!selections[choice.group];
    var value = rawValue(id),
      locked = value && !value.enabled,
      hovered = control && control.hovered;

    return (on ? 'on' : 'off') + (locked ? 'Locked' : '') + (hovered ? 'Hover' : '');
  }

  function valueFor(id) {
    var value = rawValue(id),
      spec = specs[id];

    if (!value || !value.visible || !spec) return value;
    var stamp = [active.session, active.revision, localRevision, mountedAsset].join('|');

    if (stamp !== visibilityStamp) {
      visibilityStamp = stamp;
      visibility = {};
    }

    var visible = visibility[id];

    if (visible === undefined) {
      visible
        = (!spec.parent || !!(valueFor(spec.parent) || {}).visible)
          && (!spec.gates
            || spec.gates.every(function (gate) {
              if (gate.owner) return gate.states.indexOf(switchState(gate.owner)) >= 0;
              var mask = rawValue(gate.selection),
                indexes = (mask && mask.selection) || gate.indexes;

              return (
                indexes.indexOf(selections[gate.group] === undefined ? 0 : selections[gate.group])
                >= 0
              );
            }));
      visibility[id] = visible;
    }

    if (visible) return value;
    var result = {};

    for (var key in value) result[key] = value[key];
    result.visible = false;

    return result;
  }

  function repaintSwitches() {
    localRevision++;
    lastPaint = '';
    if (currentLayout) paint(currentLayout);
  }

  function available(control) {
    if (!ownsControl(control)) return false;
    var value = valueFor(control.id);
    var owner = control.spec && control.spec.region && regions[control.spec.region];
    var visibleRegion = !owner || (valueFor(owner.spec.id) && valueFor(owner.spec.id).visible);

    return !!(value && value.visible && value.enabled && visibleRegion);
  }

  function ownsControl(control) {
    return !!(active && overlay && currentLayout && elements[control.id] === control.node);
  }

  function ownsEvent(event) {
    for (
      var node = event.target;
      node && typeof node.getAttribute === 'function';
      node = node.parentElement
    ) {
      var id = node.getAttribute('data-core-ore-id');

      if (id) return elements[id] === node;
      if (node.getAttribute('data-core-ore-owner')) return node === popup;
    }

    return true;
  }

  function setScroll(region, value) {
    region.offset = Math.max(
      0,
      Math.min(value, Math.max(0, region.spec.scroll.extent - region.spec.scroll.viewport[3])),
    );
    var memory = scrollMemory[active.screen] || (scrollMemory[active.screen] = {});

    memory[region.spec.scroll.id] = region.offset;
    debug.scrolls = memory;
    var scale = debug.scale || 1,
      height = region.spec.scroll.viewport[3] * scale,
      extent = Math.max(region.spec.scroll.extent * scale, height);
    var thumbHeight = Math.min(
      height,
      Math.max(12 * scale, (height * height) / Math.max(1, extent)),
    );

    region.content.style.top = -region.offset * scale + 'px';
    region.thumb.style.height = thumbHeight + 'px';
    region.thumb.style.top
      = ((height - thumbHeight) * region.offset)
        / Math.max(1, region.spec.scroll.extent - region.spec.scroll.viewport[3])
        + 'px';
    region.thumbHeight = thumbHeight;
    region.track.style.display = extent > height ? '' : 'none';
    region.track.setAttribute('aria-valuenow', String(Math.round(region.offset)));
    region.track.setAttribute(
      'aria-valuemax',
      String(Math.max(0, region.spec.scroll.extent - region.spec.scroll.viewport[3])),
    );
  }

  function scrollForFocus() {
    for (var i = 0; i < controls.length; i++)
      if (controls[i].id === focused && controls[i].spec) {
        var spec = controls[i].spec;

        return regions[spec.scroll ? spec.scroll.id : spec.region];
      }

    return null;
  }

  function makeScroll(node, spec) {
    node.style.pointerEvents = 'auto';
    var viewport = document.createElement('div'),
      content = document.createElement('div');
    var track = document.createElement('div'),
      thumb = document.createElement('div');

    viewport.style.cssText = 'position:absolute;overflow:hidden;pointer-events:auto;';
    content.style.cssText = 'position:absolute;left:0;top:0;pointer-events:auto;';
    track.style.cssText = 'position:absolute;background:#30343a;pointer-events:auto;';
    thumb.style.cssText
      = 'position:absolute;left:0;width:100%;background:#c9cbd0;pointer-events:auto;';
    track.setAttribute('role', 'scrollbar');
    track.setAttribute('aria-orientation', 'vertical');
    viewport.appendChild(content);
    node.appendChild(viewport);
    track.appendChild(thumb);
    node.appendChild(track);
    var region = {
      node: node,
      spec: spec,
      viewport: viewport,
      content: content,
      track: track,
      thumb: thumb,
      offset: 0,
      thumbHeight: 0,
    };

    regions[spec.scroll.id] = region;
    var control = { node: node, id: spec.id, spec: spec, scroll: region };

    controls.push(control);
    node.setAttribute('role', 'region');
    node.setAttribute('aria-label', 'Scroll region ' + spec.scroll.id);
    node.style.outline = 'none';
    node.addEventListener('focus', function () {
      if (available(control) && focused !== spec.id) focusControl(spec.id);
    });
    node.addEventListener('mousedown', function () {
      keyboardFocus = false;
      focusControl(spec.id);
    });
    node.addEventListener('keydown', onKey);
    node.addEventListener('keyup', onKeyUp);
    node.addEventListener('wheel', function (event) {
      if (!ready || !available(control) || lostAt !== null || presentedSession !== active.session)
        return;
      event.preventDefault();
      event.stopPropagation();
      var delta = typeof event.deltaY === 'number' ? event.deltaY : -(event.wheelDelta || 0);
      var units
        = event.deltaMode === 1
          ? delta * 12
          : event.deltaMode === 2
            ? delta * spec.scroll.viewport[3]
            : delta / (debug.scale || 1);

      setScroll(region, region.offset + units);
    });
    track.addEventListener('mousedown', function (event) {
      if ((event.button !== undefined && event.button !== 0) || !ready || !available(control))
        return;
      event.preventDefault();
      event.stopPropagation();
      keyboardFocus = false;
      focusControl(spec.id);
      var y = Number(event.clientY);

      if (!isFinite(y)) return;

      if (event.target !== thumb) {
        var top = parseFloat(canvas.style.top) + spec.scroll.viewport[1] * debug.scale;
        var travel = spec.scroll.viewport[3] * debug.scale - region.thumbHeight;

        setScroll(
          region,
          ((y - top - region.thumbHeight / 2) / Math.max(1, travel))
          * Math.max(0, spec.scroll.extent - spec.scroll.viewport[3]),
        );
      }

      scrollDrag = { region: region, y: y, offset: region.offset };
    });
  }

  function surface(node, source) {
    node.style.imageRendering = 'pixelated';
    node.style.background = 'transparent';
    node.style.border = '0px solid transparent';
    node.style.borderImageSource = 'none';
    node.style.backgroundImage = 'none';
    if (!source || !currentLayout) return;
    var info = currentLayout.textures && currentLayout.textures[source];

    if (!info) return fail('Texture metadata missing: ' + source);

    if (info.slice) {
      var s = info.slice,
        base = info.base || info.size,
        scale = debug.scale || 1;

      node.style.borderWidth = [s[1], s[2], s[3], s[0]]
        .map(function (v) {
          return v * scale + 'px';
        })
        .join(' ');
      node.style.borderImageSource = 'url("' + source + '")';
      node.style.borderImageSlice
        = [
          (s[1] * info.size[1]) / base[1],
          (s[2] * info.size[0]) / base[0],
          (s[3] * info.size[1]) / base[1],
          (s[0] * info.size[0]) / base[0],
        ].join(' ') + ' fill';
      node.style.borderImageWidth = node.style.borderWidth;
      node.style.borderImageRepeat = 'stretch';
    } else {
      node.style.backgroundImage = 'url("' + source + '")';
      node.style.backgroundSize = '100% 100%';
      node.style.backgroundRepeat = 'no-repeat';
    }
  }

  function styleControl(control) {
    if (!ownsControl(control)) return;
    var disabled = !available(control),
      busy
        = !ready
          || presentedSession !== active.session
          || (!!pending && !(control.spec && control.spec.field && pending.kind === 'field'))
          || lostAt !== null;
    var feedback = busy && (!pending || Date.now() - pending.time >= 200);
    var node = control.node,
      isFocused = focused === control.id;

    {
      var faces = control.spec.backgrounds;
      var field = control.spec.field,
        checked = field && field.kind === 'toggle' && localValues[control.id],
        extra = (field && field.surfaces) || {};
      var source = checked
        ? disabled
          ? extra.checkedLocked || extra.checkedBackground
          : control.hovered
            ? extra.checkedHover || extra.checkedBackground
            : extra.checkedBackground
        : faces
          && (disabled
            ? faces.disabled || faces.normal
            : control.pressed
              ? faces.pressed || faces.normal
              : control.hovered || (keyboardFocus && isFocused)
                ? faces.hover || faces.normal
                : faces.normal);

      surface(field && field.kind === 'slider' ? control.track : node, source);
      if (field && field.kind === 'slider') surface(node, null);
    }

    node.style.boxShadow = keyboardFocus && isFocused ? 'inset 0 0 0 1px #ffd86b' : 'none';
    node.style.opacity = feedback ? '0.85' : '1';
    node.style.cursor = disabled ? 'default' : feedback ? 'progress' : 'pointer';
    node.setAttribute('aria-disabled', String(disabled || busy));
    node.setAttribute('aria-busy', String(busy));
    node.setAttribute('data-core-ore-focus', isFocused ? 'true' : 'false');
    node.tabIndex = !disabled && isFocused ? 0 : -1;
  }

  function updateControls() {
    for (var i = 0; i < controls.length; i++) styleControl(controls[i]);
  }

  function focusControl(id) {
    var control = null;

    for (var i = 0; i < controls.length; i++)
      if (controls[i].id === id && available(controls[i])) control = controls[i];
    if (!control) return;
    focused = id;
    debug.focused = id;
    if (active) focusMemory[active.screen] = id;

    if (control.spec && control.spec.region && regions[control.spec.region]) {
      var region = regions[control.spec.region],
        top = control.spec.rect[1],
        bottom = top + control.spec.rect[3];

      if (top < region.offset) setScroll(region, top);
      else if (bottom > region.offset + region.spec.scroll.viewport[3])
        setScroll(region, bottom - region.spec.scroll.viewport[3]);
    }

    updateControls();
    if (diagnostics) showStatus();
    if (control.spec && control.spec.field && control.spec.field.kind === 'input') {
      if (control.inner.focus) control.inner.focus();
    } else if (control.node.focus) control.node.focus();
  }

  function ensureFocus() {
    for (var i = 0; i < controls.length; i++)
      if (controls[i].id === focused && available(controls[i])) return;

    for (var j = 0; j < controls.length; j++)
      if (available(controls[j])) {
        focusControl(controls[j].id);

        return;
      }

    focused = null;
    debug.focused = null;
  }

  function moveFocus(delta) {
    var options = [],
      index = -1;

    for (var i = 0; i < controls.length; i++) if (available(controls[i])) options.push(controls[i]);
    for (var j = 0; j < options.length; j++) if (options[j].id === focused) index = j;
    if (options.length) focusControl(options[(index + delta + options.length) % options.length].id);
  }

  function activate(control) {
    if (!available(control)) return;

    if (control.spec.switch) {
      if (!ready || presentedSession !== active.session || pending || lostAt !== null) return;
      var choice = control.spec.switch;

      selections[choice.group] = choice.exclusive ? choice.index : !selections[choice.group];
      repaintSwitches();

      return;
    }

    if (control.spec && control.spec.field) {
      var field = control.spec.field;

      if (field.kind === 'toggle') editField(control, !localValues[control.id]);
      else if (field.kind === 'dropdown') openDropdown(control);

      return;
    }

    if (control.scroll) {
      setScroll(
        control.scroll,
        control.scroll.offset + control.scroll.spec.scroll.viewport[3] * 0.8,
      );

      return;
    }

    if (hidden && ready && lostAt === null && active && presentedSession === active.session)
      dispatch(control.id, false);
  }

  function bind(node, id, spec) {
    node.style.pointerEvents = 'auto';
    var control = { node: node, id: id, spec: spec, hovered: false, pressed: false };

    controls.push(control);
    node.setAttribute('role', 'button');
    if (spec.switch) switchControls[id] = control;
    node.style.outline = 'none';
    node.addEventListener('mouseenter', function () {
      if (!ownsControl(control)) return;
      control.hovered = true;
      styleControl(control);
      if (spec.switch) repaintSwitches();
    });
    node.addEventListener('mouseleave', function () {
      if (!ownsControl(control)) return;
      control.hovered = control.pressed = false;
      styleControl(control);
      if (spec.switch) repaintSwitches();
    });
    node.addEventListener('mouseup', function () {
      control.pressed = false;
      styleControl(control);
    });
    node.addEventListener('mousedown', function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (!available(control)) return;
      keyboardFocus = false;
      focusControl(id);
      control.pressed = true;
      styleControl(control);
      activate(control);
    });
    node.addEventListener('focus', function () {
      if (focused !== id && available(control)) focusControl(id);
    });
    node.addEventListener('keydown', onKey);
    node.addEventListener('keyup', onKeyUp);
  }

  function stopKey(event) {
    event.__coreOreHandled = true;
    event.preventDefault();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();
    else event.stopPropagation();
  }

  function key(event) {
    var name = String(event.key || event.code || '').toLowerCase();

    return (
      {
        'tab': 'Tab',
        'enter': 'Enter',
        'numpadenter': 'Enter',
        'escape': 'Escape',
        'esc': 'Escape',
        'space': ' ',
        'spacebar': ' ',
        'arrowup': 'ArrowUp',
        'up': 'ArrowUp',
        'arrowdown': 'ArrowDown',
        'down': 'ArrowDown',
        'f8': 'F8',
        ' ': ' ',
      }[name]
      || {
        9: 'Tab',
        13: 'Enter',
        27: 'Escape',
        32: ' ',
        33: 'pageup',
        34: 'pagedown',
        35: 'end',
        36: 'home',
        38: 'ArrowUp',
        40: 'ArrowDown',
        119: 'F8',
      }[event.keyCode || event.which]
      || name
    );
  }

  function onKey(event) {
    if (!ownsEvent(event)) return;
    if (event.__coreOreHandled) return;
    if (!active || !overlay || !hidden || failedSession === active.session) return;
    var name = key(event);
    var editing = fieldControls[focused],
      field = editing && editing.spec.field;

    if (editing && editing.composing) return;

    if (name === 'F8') {
      stopKey(event);
      diagnostics = !diagnostics;
      showStatus();

      return;
    }

    if (name === 'Escape' || name === 'Esc') {
      if (popup) {
        stopKey(event);
        closePopup();

        return;
      }

      dismissing = true;

      return;
    }

    if (field && field.kind === 'input' && name !== 'Tab') return;

    if (
      field
      && (field.kind === 'slider' || field.kind === 'dropdown')
      && ['arrowleft', 'arrowright', 'ArrowUp', 'ArrowDown', 'home', 'end'].indexOf(name) >= 0
    ) {
      stopKey(event);
      keyboardFocus = true;
      var direction = name === 'arrowleft' || name === 'ArrowDown' ? -1 : 1;

      if (field.kind === 'slider')
        editField(
          editing,
          name === 'home'
            ? field.min
            : name === 'end'
              ? fieldNumber(editing, field.max)
              : fieldNumber(editing, localValues[editing.id] + direction * field.step),
        );
      else {
        editField(
          editing,
          name === 'home'
            ? 0
            : name === 'end'
              ? field.options.length - 1
              : Math.max(0, Math.min(field.options.length - 1, localValues[editing.id] + direction)),
        );
        closePopup();
      }

      return;
    }

    var scroll = scrollForFocus();

    if (scroll && ['pageup', 'pagedown', 'home', 'end'].indexOf(name) >= 0) {
      stopKey(event);
      keyboardFocus = true;
      setScroll(
        scroll,
        name === 'home'
          ? 0
          : name === 'end'
            ? scroll.spec.scroll.extent
            : scroll.offset + (name === 'pageup' ? -1 : 1) * scroll.spec.scroll.viewport[3] * 0.8,
      );
      updateControls();

      return;
    }

    if (name === 'Tab' || name === 'ArrowDown' || name === 'ArrowUp') {
      closePopup();
      keyboardFocus = true;
      stopKey(event);
      moveFocus(name === 'ArrowUp' || (name === 'Tab' && event.shiftKey) ? -1 : 1);

      return;
    }

    if (name !== 'Enter' && name !== ' ' && name !== 'Spacebar') return;
    stopKey(event);
    if (heldKey || event.repeat) return;
    keyboardFocus = true;
    heldKey = name;

    for (var i = 0; i < controls.length; i++)
      if (controls[i].id === focused) {
        controls[i].pressed = true;
        styleControl(controls[i]);
        activate(controls[i]);
        break;
      }
  }

  function onKeyUp(event) {
    if (!ownsEvent(event)) return;
    if (event.__coreOreHandled) return;
    var name = key(event);

    if (
      fieldControls[focused]
      && fieldControls[focused].spec.field.kind === 'input'
      && name !== 'Enter'
    )
      return;
    if (name !== 'Enter' && name !== ' ' && name !== 'Spacebar') return;
    if (active && overlay && hidden) stopKey(event);
    heldKey = null;

    for (var i = 0; i < controls.length; i++) {
      controls[i].pressed = false;
      styleControl(controls[i]);
    }
  }

  function mount(layout) {
    if (outgoingCanvas) {
      if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    } else outgoingCanvas = canvas;

    if (outgoingCanvas) {
      outgoingCanvas.style.pointerEvents = 'none';
      outgoingCanvas.setAttribute('aria-hidden', 'true');

      for (var old = 0; old < controls.length; old++) {
        controls[old].node.style.pointerEvents = 'none';
        if (controls[old].inner) controls[old].inner.style.pointerEvents = 'none';

        if (controls[old].scroll) {
          controls[old].scroll.track.style.pointerEvents = 'none';
          controls[old].scroll.thumb.style.pointerEvents = 'none';
        }
      }
    }

    resetPresentation();
    currentLayout = layout;

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'core-ore-presentation';
      overlay.style.cssText
        = 'position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147480000;pointer-events:none;color:#fff;font-family:CoreOreMojangles,"Minecraft Seven Pixel Perfect",sans-serif;';
      var inputError = document.createElement('div');

      inputError.id = 'core-ore-input-error';
      inputError.style.cssText
        = 'position:absolute;left:20px;bottom:20px;max-width:90%;padding:8px;color:#fff;background:#7b2020;pointer-events:none;';
      overlay.appendChild(inputError);
      document.body.appendChild(overlay);
    }

    canvas = document.createElement('div');
    canvas.setAttribute('data-core-ore-page', layout.screen);
    canvas.style.cssText = 'position:absolute;pointer-events:auto;';
    canvas.style.visibility = outgoingCanvas ? 'hidden' : 'visible';
    overlay.appendChild(canvas);

    if (layout.background) {
      var backdrop = document.createElement('div');

      backdrop.style.cssText
        = 'position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:pixelated;z-index:-1;background-size:100% 100%;';
      backdrop.style.backgroundImage = 'url("' + layout.background + '")';
      canvas.appendChild(backdrop);
    }

    if (outgoingCanvas) assetsDue = Date.now() + 5000;
    debug.imagesLoaded = 0;
    debug.imagesExpected = 0;
    for (var i = 0; i < layout.nodes.length; i++)
      (function (baseline) {
        var spec = {};

        for (var property in baseline) spec[property] = baseline[property];
        specs[spec.id] = spec;

        if (spec.switch) {
          var choice = spec.switch;

          if (selections[choice.group] === undefined)
            selections[choice.group] = choice.exclusive ? 0 : choice.on;
          if (choice.on) selections[choice.group] = choice.exclusive ? choice.index : true;
        }

        var node = document.createElement(spec.kind === 'image' ? 'img' : 'div');

        node.setAttribute('data-core-ore-id', spec.id);
        node.style.cssText
          = 'position:absolute;box-sizing:border-box;overflow:hidden;image-rendering:pixelated;';
        if (spec.kind === 'panel') node.style.pointerEvents = 'none';
        if (spec.kind === 'button' || (spec.kind === 'switch' && !spec.switch.passive))
          bind(node, spec.id, spec);
        if (spec.kind === 'switch' && spec.switch.passive) node.style.pointerEvents = 'none';
        if (spec.kind === 'field') makeField(node, spec);
        if (spec.kind === 'scroll') makeScroll(node, spec);

        if (spec.kind === 'image') {
          debug.imagesExpected++;
          node.style.cssText += 'object-fit:contain;pointer-events:none;';
          var loaded = false;

          node.addEventListener('load', function () {
            if (!loaded && elements[spec.id] === node) {
              loaded = true;
              debug.imagesLoaded++;
              requestRefresh();
            }
          });
          node.addEventListener('error', function () {
            if (elements[spec.id] === node && mountedAsset === layout.asset)
              fail('Image loading failed: ' + spec.source);
          });
        }

        if (spec.kind === 'text') {
          node.style.pointerEvents = 'none';
          var caption = document.createElement('div');

          caption.style.cssText
            = 'position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;';
          node.appendChild(caption);
          captions[spec.id] = caption;
        }

        if (spec.region && !regions[spec.region])
          return fail('Scroll region missing: ' + spec.region);

        if (!spec.fill && !(spec.flow && spec.flow.parent)) {
          for (
            var ancestor = spec.parent;
            ancestor && specs[ancestor];
            ancestor = specs[ancestor].parent
          ) {
            var anchor = specs[ancestor];

            if (anchor.region !== spec.region || anchor.kind === 'scroll') break;

            if (anchor.flow && (anchor.flow.parent || anchor.flow.row || anchor.flow.column)) {
              spec.offsetParent = ancestor;
              break;
            }
          }
        }

        (
          (spec.fill && elements[spec.fill])
          || (spec.flow && spec.flow.parent && elements[spec.flow.parent])
          || (spec.offsetParent && elements[spec.offsetParent])
          || (spec.region ? regions[spec.region].content : canvas)
        ).appendChild(node);
        elements[spec.id] = node;
        if (spec.kind === 'image') node.setAttribute('src', spec.source);
      })(layout.nodes[i]);
    mountedAsset = layout.asset;
    for (var source in layout.textures || {})
      (function (source) {
        var image = document.createElement('img'),
          owner = canvas,
          loaded = false;

        debug.imagesExpected++;
        image.style.cssText
          = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;';
        image.addEventListener('load', function () {
          if (!loaded && currentLayout === layout && canvas === owner) {
            loaded = true;
            debug.imagesLoaded++;
            requestRefresh();
          }
        });
        image.addEventListener('error', function () {
          if (currentLayout === layout && canvas === owner)
            fail('Texture loading failed: ' + source);
        });
        image.setAttribute('src', source);
        canvas.appendChild(image);
      })(source);
    focused = null;
  }

  function paint(layout) {
    if (!overlay || mountedAsset !== layout.asset) mount(layout);
    overlay.style.display = '';
    overlay.style.visibility = hidden ? 'visible' : 'hidden';
    var inputError = document.getElementById('core-ore-input-error');

    if (inputError) {
      inputError.textContent = active.error || '';
      inputError.style.display = active.error ? '' : 'none';
    }

    var localizedStamp = layout.nodes
      .filter(function (node) {
        return node.localize;
      })
      .map(function (node) {
        var native = findText('CORE_ORE_TEXT:' + active.session + ':' + node.id + ' | ');

        return (native && native.textContent) || '';
      })
      .join('|');
    var stamp = [
      active.session,
      active.revision,
      ready,
      !!pending,
      lostAt,
      window.innerWidth,
      window.innerHeight,
      localizedStamp,
      debug.imagesLoaded,
      localRevision,
    ].join(':');

    if (assetsDue !== null && Date.now() >= assetsDue && debug.imagesLoaded < debug.imagesExpected)
      return fail('Destination assets loading timed out');
    if (stamp === lastPaint) return;
    lastPaint = stamp;
    debug.paints++;
    var bounds = layout.view
      ? layout.view.bounds
      : [0, 0, layout.canvas.width, layout.canvas.height];
    var requested
      = (layout.view && layout.view.uiScale)
        || Math.max(
          1,
          Math.floor(Math.min(window.innerWidth / desktopWidth, window.innerHeight / desktopHeight)),
        );
    var scale = Math.max(
      0.25,
      Math.min(
        requested,
        (window.innerWidth - 40) / Math.max(1, bounds[2]),
        (window.innerHeight - 40) / Math.max(1, bounds[3]),
      ),
    );

    debug.scale = scale;
    canvas.style.left = (window.innerWidth - bounds[2] * scale) / 2 - bounds[0] * scale + 'px';
    canvas.style.top = (window.innerHeight - bounds[3] * scale) / 2 - bounds[1] * scale + 'px';
    canvas.style.width = layout.canvas.width * scale + 'px';
    canvas.style.height = layout.canvas.height * scale + 'px';
    var flowingCounts = {};

    for (var i = 0; i < layout.nodes.length; i++) {
      var baseline = layout.nodes[i],
        spec = specs[baseline.id],
        node = elements[spec.id],
        value = valueFor(spec.id);

      if (!value) return fail('Missing value for ' + spec.id);
      spec.rect = value.rect || baseline.rect;
      spec.scroll = value.scroll || baseline.scroll;
      spec.textStyle = value.textStyle || baseline.textStyle;
      spec.backgrounds = value.backgrounds || baseline.backgrounds;
      if (
        !Array.isArray(spec.rect)
        || spec.rect.length !== 4
        || spec.rect.some(function (n) {
          return typeof n !== 'number' || !isFinite(n);
        })
        || spec.rect[2] < 0
        || spec.rect[3] < 0
      )
        return fail('Invalid live geometry');
      if (
        spec.scroll
        && (!Array.isArray(spec.scroll.viewport)
          || spec.scroll.viewport.length !== 4
          || spec.scroll.viewport.some(function (n) {
            return typeof n !== 'number' || !isFinite(n);
          })
          || spec.scroll.id !== baseline.scroll.id
          || spec.scroll.viewport[2] < 11
          || spec.scroll.viewport[3] <= 0
          || !isFinite(spec.scroll.extent)
          || spec.scroll.extent < 0)
      )
        return fail('Invalid live Scroll geometry');
      var x = spec.rect[0],
        y = spec.rect[1],
        width = spec.rect[2],
        height = spec.rect[3];
      var offset = spec.offsetParent && specs[spec.offsetParent];

      node.style.left = (x - (offset ? offset.rect[0] : 0)) * scale + 'px';
      node.style.top = (y - (offset ? offset.rect[1] : 0)) * scale + 'px';
      node.style.width = width * scale + 'px';
      node.style.height = height * scale + 'px';
      if (spec.flow && spec.flow.autoHeight) node.style.height = 'auto';
      if (spec.flow && spec.flow.padding)
        node.style.padding = spec.flow.padding
          .map(function (n) {
            return n * scale + 'px';
          })
          .join(' ');

      if (spec.flow && (spec.flow.row || spec.flow.column)) {
        node.style.display = 'flex';
        node.style.flexDirection = spec.flow.column ? 'column' : 'row';
        node.style.alignItems = spec.flow.column ? 'flex-start' : 'center';
      }

      if (spec.flow && spec.flow.parent) {
        node.style.position = 'relative';
        node.style.left = '0px';
        node.style.top = '0px';
        node.style.flexShrink = '0';
        if (spec.flow.hug) node.style.width = 'auto';
        var parent = specs[spec.flow.parent],
          previous = flowingCounts[spec.flow.parent] || 0,
          gap = value.visible && previous ? (spec.flow.gap || 0) * scale : 0;

        node.style.marginLeft = parent.flow && parent.flow.column ? '0px' : gap + 'px';
        node.style.marginTop = parent.flow && parent.flow.column ? gap + 'px' : '0px';
        if (value.visible) flowingCounts[spec.flow.parent] = previous + 1;
      }

      if (spec.layer) node.style.zIndex = String(spec.layer);

      if (spec.fill) {
        node.style.position = 'absolute';
        node.style.left = '0px';
        node.style.top = '0px';
        node.style.width = '100%';
        node.style.height = '100%';
      }

      node.style.display = value.visible ? '' : 'none';
      if (value.visible && spec.flow && (spec.flow.row || spec.flow.column))
        node.style.display = 'flex';
      if (spec.kind !== 'button') surface(node, spec.backgrounds && spec.backgrounds.normal);

      if (spec.kind === 'field') {
        if (!dirty[spec.id]) localValues[spec.id] = value.input;
        renderField(fieldControls[spec.id]);
      }

      if (spec.kind === 'scroll') {
        var region = regions[spec.scroll.id],
          viewport = spec.scroll.viewport;

        region.viewport.style.left = (viewport[0] - x) * scale + 'px';
        region.viewport.style.top = (viewport[1] - y) * scale + 'px';
        region.viewport.style.width = Math.max(0, viewport[2] - 11) * scale + 'px';
        region.viewport.style.height = viewport[3] * scale + 'px';
        region.content.style.width = region.viewport.style.width;
        region.content.style.height = Math.max(viewport[3], spec.scroll.extent) * scale + 'px';
        region.track.style.left = (viewport[0] - x + viewport[2] - 8) * scale + 'px';
        region.track.style.top = region.viewport.style.top;
        region.track.style.width = 5 * scale + 'px';
        region.track.style.height = viewport[3] * scale + 'px';
        var memory = scrollMemory[active.screen];

        setScroll(region, (memory && memory[spec.scroll.id]) || 0);
      }

      if (spec.kind === 'text') {
        var style = spec.textStyle || { scale: 1, align: 'left' };
        var caption = captions[spec.id],
          color = style.color,
          offset = style.offset || [0, 0];

        caption.style.cssText
          = 'position:absolute;left:'
            + offset[0] * scale
            + 'px;top:'
            + offset[1] * scale
            + 'px;display:flex;flex-direction:row;align-items:flex-start;white-space:pre;box-sizing:border-box;'
            + 'justify-content:'
            + (style.align === 'center'
              ? 'center'
              : style.align === 'right'
                ? 'flex-end'
                : 'flex-start')
              + ';width:'
              + width * scale
              + 'px;height:'
              + height * scale
              + 'px;font-size:'
              + 10 * style.scale * scale
              + 'px;line-height:1;text-align:'
              + style.align
              + ';font-family:'
              + (style.font === 'MinecraftTen'
                ? 'CoreOreMinecraftTen,"Minecraft Ten v2"'
                : 'CoreOreMojangles,"Minecraft Seven Pixel Perfect"')
              + ',sans-serif;color:'
              + (color
                ? 'rgb('
                + color
                  .map(function (v) {
                    return Math.round(v * 255);
                  })
                  .join(',')
                  + ')'
                : '#fff')
              + ';text-shadow:'
              + (style.shadow ? scale + 'px ' + scale + 'px #3f3f3f' : 'none')
              + ';';
        var text = value.text;

        if (spec.localize) {
          var translated = findText('CORE_ORE_TEXT:' + active.session + ':' + spec.id + ' | ');

          if (translated)
            text = (translated.textContent || '')
              .slice(('CORE_ORE_TEXT:' + active.session + ':' + spec.id + ' | ').length)
              .replace(/\u00a7./g, '');
        }

        if (spec.localize) {
          caption.style.whiteSpace = 'pre-wrap';
          caption.style.overflow = 'hidden';
        }

        if (spec.flow && spec.flow.hug) {
          caption.style.position = 'relative';
          caption.style.width = 'auto';
          caption.style.whiteSpace = 'pre';
        }

        formattedCaption(caption, text, spec.localize ? null : value.formatting, style, scale);
      }

      if (
        spec.kind === 'image'
        && spec.live
        && value.source
        && node.getAttribute('src') !== value.source
      ) {
        if (!/^pack:\/\/textures\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.png$/.test(value.source))
          return fail('Invalid live image');
        node.setAttribute('src', value.source);
      }
    }

    for (var regionId in regions) {
      var localRegion = regions[regionId],
        first = localRegion.content.children[0],
        firstSpec = first && specs[first.getAttribute('data-core-ore-id')];

      if (
        firstSpec
        && firstSpec.flow
        && firstSpec.flow.autoHeight
        && typeof first.getBoundingClientRect === 'function'
        && (valueFor(localRegion.spec.id) || {}).visible
      ) {
        var extent = first.getBoundingClientRect().height / scale,
          scroll = localRegion.spec.scroll;

        if (isFinite(extent) && extent >= 0) {
          localRegion.spec.scroll = { id: scroll.id, viewport: scroll.viewport, extent: extent };
          setScroll(localRegion, localRegion.offset);
        }
      }
    }

    if (outgoingCanvas && debug.imagesLoaded < debug.imagesExpected) {
      debug.status = 'loading screen';
      updateControls();

      return;
    }

    canvas.style.visibility = 'visible';
    assetsDue = null;

    if (outgoingCanvas) {
      if (outgoingCanvas.parentNode) outgoingCanvas.parentNode.removeChild(outgoingCanvas);
      outgoingCanvas = null;
    }

    if (presentedSession !== active.session) {
      presentedSession = active.session;
      var remembered = focusMemory[active.screen];

      focused = null;
      if (remembered) focusControl(remembered);
    }

    if (ready && !pending) debug.status = 'active';
    ensureFocus();
    updateControls();
    debug.paintedRevision = active.revision;

    if (popup && popup.getAttribute('data-core-ore-geometry') !== popupGeometry()) {
      var dropdown = fieldControls[popup.getAttribute('data-core-ore-owner')];

      if (dropdown) openDropdown(dropdown);
      else closePopup();
    }
  }

  function formattedCaption(caption, text, formatting, style, scale) {
    if (!formatting || !formatting.length) {
      if (caption.textContent !== text || caption.__oreFormatting) {
        caption.textContent = text;
        caption.__oreFormatting = null;
      }

      return;
    }

    if (
      !Array.isArray(formatting)
      || formatting.some(function (item) {
        return (
          !Array.isArray(item)
          || item.length !== 2
          || !integer(item[0])
          || item[0] > text.length
          || !/^[0-9a-flor]$/.test(item[1])
        );
      })
    )
      return fail('Invalid text formatting');
    caption.style.flexDirection = 'column';
    caption.style.alignItems = 'stretch';
    caption.style.justifyContent = 'flex-start';
    var stamp = JSON.stringify([text, formatting, scale, style.scale, style.align]);

    if (caption.__oreFormatting === stamp) return;
    caption.textContent = '';
    caption.__oreFormatting = stamp;
    var palette = [
      '#000000',
      '#0000aa',
      '#00aa00',
      '#00aaaa',
      '#aa0000',
      '#aa00aa',
      '#ffaa00',
      '#aaaaaa',
      '#555555',
      '#5555ff',
      '#55ff55',
      '#55ffff',
      '#ff5555',
      '#ff55ff',
      '#ffff55',
      '#ffffff',
    ];
    var color = '',
      bold = false,
      italic = false,
      index = 0,
      position = 0,
      line;

    function nextLine() {
      line = document.createElement('div');
      line.style.cssText = 'display:flex;flex-direction:row;flex-shrink:0;white-space:pre;';
      line.style.height = 10 * style.scale * scale + 'px';
      line.style.justifyContent
        = style.align === 'center' ? 'center' : style.align === 'right' ? 'flex-end' : 'flex-start';
      caption.appendChild(line);
    }

    nextLine();

    while (position <= text.length) {
      while (index < formatting.length && formatting[index][0] === position) {
        var code = formatting[index++][1];

        if (code === 'r') {
          color = '';
          bold = italic = false;
        } else if (code === 'l') bold = true;
        else if (code === 'o') italic = true;
        else color = palette[parseInt(code, 16)];
      }

      if (position === text.length) break;

      if (text.charAt(position) === '\n') {
        position++;
        nextLine();
        continue;
      }

      var end = index < formatting.length ? formatting[index][0] : text.length,
        newline = text.indexOf('\n', position);

      if (newline >= 0) end = Math.min(end, newline);
      if (end <= position) return fail('Invalid text formatting order');
      var span = document.createElement('span');

      span.style.cssText = 'display:flex;flex-direction:row;flex-shrink:0;white-space:pre;';
      span.style.color = color || 'inherit';
      span.style.fontWeight = bold ? 'bold' : 'normal';
      span.style.fontStyle = italic ? 'italic' : 'normal';
      span.textContent = text.slice(position, end);
      line.appendChild(span);
      position = end;
    }
  }

  function load(state) {
    if (cached[state.asset] || loading[state.asset]) return;
    var xhr = new XMLHttpRequest(),
      asset = state.asset;

    loading[asset] = true;
    debug.layoutRequests++;
    xhr.open('GET', asset, true);
    xhr.timeout = 5000;

    xhr.onload = function () {
      loading[asset] = false;

      try {
        if (xhr.status !== 200 && xhr.status !== 0) throw new Error('Layout HTTP ' + xhr.status);
        var layout = JSON.parse(xhr.responseText);

        if (
          layout.schema !== 'core-ore-layout/1'
          || layout.asset !== asset
          || asset !== '/hbui/core-ore/' + layout.screen + '.json'
          || !layout.canvas
          || !(layout.canvas.width > 0)
          || !(layout.canvas.height > 0)
          || !Array.isArray(layout.nodes)
          || layout.nodes.length > 16384
        )
          throw new Error('Invalid layout');

        function positivePair(value) {
          return (
            Array.isArray(value)
            && value.length === 2
            && value.every(function (n) {
              return typeof n === 'number' && isFinite(n) && n > 0;
            })
          );
        }

        for (var source in layout.textures || {}) {
          var info = layout.textures[source],
            base = info.base || info.size;

          if (
            !/^pack:\/\/textures\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.png$/.test(source)
            || !positivePair(info.size)
            || !positivePair(base)
            || (info.slice
              && (!Array.isArray(info.slice)
                || info.slice.length !== 4
                || info.slice.some(function (n) {
                  return typeof n !== 'number' || !isFinite(n) || n < 0;
                })
                || info.slice[0] + info.slice[2] > base[0]
                || info.slice[1] + info.slice[3] > base[1]))
          )
            throw new Error('Invalid texture metadata');
        }

        if (
          layout.view
          && (!Array.isArray(layout.view.bounds)
            || layout.view.bounds.length !== 4
            || layout.view.bounds.some(function (n) {
              return typeof n !== 'number' || !isFinite(n);
            })
            || !(layout.view.bounds[2] > 0)
            || !(layout.view.bounds[3] > 0)
            || (layout.view.uiScale !== undefined
              && (!(layout.view.uiScale > 0) || layout.view.uiScale > 16)))
        )
          throw new Error('Invalid presentation bounds or scale');
        var ids = {};

        for (var i = 0; i < layout.nodes.length; i++) {
          var node = layout.nodes[i],
            style = node.textStyle;

          if (
            !/^n(?:_[0-9]+)*$/.test(node.id)
            || ids[node.id]
            || ['panel', 'text', 'button', 'image', 'scroll', 'field', 'switch'].indexOf(node.kind)
            < 0
            || (node.kind === 'image'
              && !/^pack:\/\/textures\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.png$/.test(
                node.source || '',
              ))
              || !Array.isArray(node.rect)
              || node.rect.length !== 4
              || node.rect.some(function (v) {
                return typeof v !== 'number' || !isFinite(v);
              })
              || (style
                && (!(style.scale > 0)
                  || style.scale > 8
                  || ['left', 'center', 'right'].indexOf(style.align) < 0))
          )
            throw new Error('Invalid layout node');
          ids[node.id] = true;
          if (
            node.kind === 'field'
            && (!node.field
              || ['toggle', 'slider', 'dropdown', 'input'].indexOf(node.field.kind) < 0
              || (node.field.name !== undefined && typeof node.field.name !== 'string'))
          )
            throw new Error('Invalid field metadata');
          if (node.flow && node.flow.parent && !ids[node.flow.parent])
            throw new Error('Invalid text flow ownership');

          if (node.backgrounds)
            for (var face in node.backgrounds) {
              if (
                ['normal', 'hover', 'pressed', 'disabled'].indexOf(face) < 0
                || !layout.textures
                || !layout.textures[node.backgrounds[face]]
              )
                throw new Error('Missing background texture metadata');
            }
        }

        var scrollIds = {};

        for (var s = 0; s < layout.nodes.length; s++) {
          var spec = layout.nodes[s],
            scroll = spec.scroll;

          if (spec.kind === 'scroll') {
            if (
              spec.region
              || !scroll
              || !integer(scroll.id)
              || !scroll.id
              || scrollIds[scroll.id]
              || !Array.isArray(scroll.viewport)
              || scroll.viewport.length !== 4
              || scroll.viewport.some(function (n) {
                return typeof n !== 'number' || !isFinite(n);
              })
              || !(scroll.viewport[2] >= 11)
              || !(scroll.viewport[3] > 0)
              || typeof scroll.extent !== 'number'
              || !isFinite(scroll.extent)
              || scroll.extent < 0
            )
              throw new Error('Invalid Scroll viewport');
            scrollIds[scroll.id] = true;
          }

          if (spec.region && (!integer(spec.region) || !scrollIds[spec.region]))
            throw new Error('Invalid Scroll ownership');
        }

        cached[asset] = layout;
      } catch (error) {
        if (active && active.asset === asset) fail(error);
      }

      requestRefresh();
    };

    xhr.onerror = xhr.ontimeout = function () {
      loading[asset] = false;
      if (active && active.asset === asset) fail('Layout loading failed');
    };

    xhr.send();
  }

  function readFrame(carrier) {
    var raw = carrier.textContent.trim().slice('CORE_ORE_STATE:'.length),
      state = JSON.parse(raw);

    if (state.schema !== 'core-ore-frame/1') return state;
    if (
      !integer(state.session)
      || !integer(state.revision)
      || !integer(state.parts)
      || state.parts < 1
      || state.parts > 64
      || !/^[A-Za-z0-9_-]+$/.test(state.screen)
      || state.asset !== '/hbui/core-ore/' + state.screen + '.json'
    )
      throw new Error('Invalid state frame');
    if (frameHeader === raw && frameState) return frameState;
    conceal(carrier, state.title, state.session);
    var chunks = [];

    for (var i = 0; i < state.parts; i++) {
      var prefix = 'CORE_ORE_PART:' + state.session + ':' + state.revision + ':' + i + '|',
        part = findText(prefix);

      if (!part) {
        if (!frameWait || frameWait.raw !== raw) frameWait = { raw: raw, time: Date.now() };

        if (Date.now() - frameWait.time >= 5000) {
          active = { session: state.session, values: [] };
          fail('State frame loading timed out');
        } else {
          if (lostAt === null) lostAt = Date.now();
          debug.status = 'assembling screen';
          updateControls();
        }

        return null;
      }

      var text = part.textContent.replace(/^\s+/, '');

      if (text.length > 5000) throw new Error('Oversized state part');
      chunks.push(text.slice(prefix.length));
    }

    var joined = chunks.join('');

    if (joined.indexOf('CORE_ORE_STATE:') !== 0) throw new Error('Invalid state parts');
    var complete = JSON.parse(joined.slice('CORE_ORE_STATE:'.length));

    if (
      complete.schema !== 'core-ore-state/1'
      || complete.session !== state.session
      || complete.revision !== state.revision
      || complete.screen !== state.screen
      || complete.asset !== state.asset
      || complete.transport !== state.transport
    )
      throw new Error('State frame identity mismatch');
    frameHeader = raw;
    frameState = complete;
    frameWait = null;
    debug.frameParts = state.parts;

    return complete;
  }

  function scan() {
    debug.scans++;

    try {
      var root = document.getElementById('root');
      var carrier
        = carrierHint
          && root
          && root.contains(carrierHint)
          && (carrierHint.textContent || '').trim().indexOf('CORE_ORE_STATE:') === 0
          ? carrierHint
          : findText('CORE_ORE_STATE:');

      carrierHint = carrier;

      if (!carrier) {
        if (!active) return;

        if (
          !dismissing
          && failedSession !== active.session
          && ((pending && !pending.ready) || (hidden && root && root.contains(hidden)))
        ) {
          if (lostAt === null) lostAt = Date.now();

          if (Date.now() - lostAt < 250) {
            debug.status = 'switching screen';
            updateControls();

            return;
          }
        }

        teardown();

        return;
      }

      var state = readFrame(carrier);

      if (!state) return;
      if (
        state.schema !== 'core-ore-state/1'
        || !/^[A-Za-z0-9_-]+$/.test(state.screen)
        || state.asset !== '/hbui/core-ore/' + state.screen + '.json'
        || !integer(state.session)
        || !integer(state.revision)
        || !integer(state.ack)
        || (state.transport !== undefined && !integer(state.transport))
        || !Array.isArray(state.values)
        || state.values.length > 16384
      )
        return;

      if (!active || active.session !== state.session || active.screen !== state.screen) {
        var continuing
          = active
            && ready
            && state.transport !== undefined
            && active.transport === state.transport
            && hidden
            && hidden.contains(carrier);

        if (continuing && pending && !pending.ready) debug.lastAckMs = Date.now() - pending.time;
        if (hidden && !hidden.contains(carrier)) restore();
        active = state;
        pending = null;
        ready = !!continuing;
        failedSession = null;
        dismissing = false;
        localValues = {};
        dirty = {};
        queuedValues = {};
        queuedAt = {};
        queuedAction = null;
        inputSequence = 0;
        closePopup();
        debug.pending = null;
        debug.error = null;
        debug.closeRequested = false;
        debug.closeError = null;
        debug.status = continuing ? 'active' : 'loading';
        lastPaint = '';
      }

      if (state.revision < active.revision) return;
      active = state;
      lostAt = null;
      debug.session = state.session;
      debug.transport = state.transport;
      debug.screen = state.screen;
      debug.revision = state.revision;
      debug.ack = state.ack;
      if (failedSession === state.session) return;
      var layout = cached[state.asset];
      var concealed = conceal(carrier, state.title || (layout && layout.title));

      if (!layout) {
        load(state);

        return;
      }

      if (layout.screen !== state.screen) return fail('Layout identity mismatch');
      if (!concealed) return fail('Could not identify an exclusive native form container');

      if (pending && state.ack > pending.ack) {
        if (pending.ready) ready = true;
        debug.lastAckMs = Date.now() - pending.time;

        if (pending.kind === 'field') {
          if (!Object.prototype.hasOwnProperty.call(queuedValues, pending.fieldId))
            delete dirty[pending.fieldId];
        } else if (!pending.ready) {
          dirty = {};
          localValues = {};
        }

        pending = null;
        debug.pending = null;
        debug.status = 'active';
        debug.inputError = state.error || null;
      }

      if (pending && Date.now() - pending.time > 5000)
        return fail(
          (pending.ready ? 'Readiness' : 'Action')
          + ' acknowledgement timed out; target '
          + pending.target
          + '; ack '
          + pending.ack
          + ' -> '
          + active.ack
          + '; revision '
          + pending.revision
          + ' -> '
          + active.revision
          + '; no retry sent',
        );
      paint(layout);
      if (!ready && !pending) dispatch('ready', true);
      else flushFieldChanges();
    } catch (error) {
      fail(error);
    }
  }

  function integer(value) {
    return (
      typeof value === 'number'
      && isFinite(value)
      && value >= 0
      && value <= 9007199254740991
      && Math.floor(value) === value
    );
  }

  function observeRoot() {
    var root = document.getElementById('root');

    if (!window.MutationObserver || (observer && root === observedRoot)) return;
    if (observer) observer.disconnect();
    observer = new window.MutationObserver(requestRefresh);
    observer.observe(root || document.body, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    observedRoot = root;
    debug.notifications = true;
  }

  function refresh() {
    scheduled = false;
    observeRoot();
    scan();
    showStatus();
  }

  document.addEventListener('keydown', onKey, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener(
    'mousemove',
    function (event) {
      if (
        fieldDrag
        && active
        && ready
        && (!pending || pending.kind === 'field')
        && isFinite(Number(event.clientX))
      ) {
        editField(fieldDrag, pointerNumber(fieldDrag, event));
        event.preventDefault();

        return;
      }

      if (!scrollDrag || !active || !ready || failedSession === active.session) return;
      var region = scrollDrag.region,
        scale = debug.scale || 1;
      var travel = region.spec.scroll.viewport[3] * scale - region.thumbHeight;

      if (typeof event.clientY === 'number')
        setScroll(
          region,
          scrollDrag.offset
          + ((event.clientY - scrollDrag.y) / Math.max(1, travel))
          * Math.max(0, region.spec.scroll.extent - region.spec.scroll.viewport[3]),
        );
      event.preventDefault();
    },
    true,
  );
  document.addEventListener(
    'mouseup',
    function () {
      scrollDrag = null;
      var released = fieldDrag;

      fieldDrag = null;

      if (released) {
        renderField(released);
        flushFieldChanges(true);
      }

      for (var i = 0; i < controls.length; i++) {
        controls[i].pressed = false;
        styleControl(controls[i]);
      }
    },
    true,
  );
  document.addEventListener(
    'mousedown',
    function (event) {
      if (popup && !popup.contains(event.target)) {
        var dropdown = fieldControls[focused];

        if (!dropdown || !dropdown.node.contains(event.target)) closePopup();
      }
    },
    true,
  );
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('resize', requestRefresh);
  window.addEventListener('blur', function () {
    heldKey = null;
    fieldDrag = null;
    scrollDrag = null;
    closePopup();
    flushFieldChanges(true);
    for (var i = 0; i < controls.length; i++) controls[i].pressed = false;
    updateControls();
  });
  window.setInterval(refresh, 100);
  refresh();
}
