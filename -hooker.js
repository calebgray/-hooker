'use strict';

const $hook_prefix = '_';
const $hook_key = $hook_prefix+'id';

let $hook_id = 0;
Object.defineProperty(Function.prototype, $hook_key, {
  get: function() {
    Object.defineProperty(this, $hook_key, { value: $hook_id++, writable: false });
    return this[$hook_key];
  }
});

const $hook_ = {};
function $hook(context, id, hook) {
  switch (arguments.length) {
    case 1:
      id = context.id;
    case 2:
      if (!$hook_[id]) return;
      for (const hook of Object.values($hook_[id].hooks)) {
        for (const trigger of Object.values($hook_[id].triggers)) {
          hook.call(trigger, context);
        }
      }
      return;
    default:
      if (!$hook_[id]) {
        $hook_[id] = {
          triggers: { [context[$hook_key]]: context },
          hooks: { [hook[$hook_key]]: hook },
        };
      } else {
        $hook_[id].triggers[context[$hook_key]] = context;
        $hook_[id].hooks[hook[$hook_key]] = hook;
      }
      for (const hook of Object.values($hook_[id].hooks)) {
        hook.call(context);
      }
  }
}

function $unhook(context, hook, id) {
  switch (arguments.length) {
    case 2:
      id = context.id;
    case 3:
      delete $hook_[id].hooks[hook[$hook_key]];
      return;
    default:
      delete $hook_[context.id];
  }
}

function $hook_once(context, id, hook) {
  const unhook = function(trigger) {
    $unhook(this, unhook);
    hook.call(this, trigger);
  };
  $hook(context, id, unhook);
}

function setEscapedHtml(trigger) {
  if (!trigger) return;
  this.innerHTML = (typeof trigger === typeof '' ? trigger : trigger.value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function setEscapedUri(trigger) {
  if (!trigger) return;
  this.innerHTML = encodeURI(typeof trigger === typeof '' ? trigger : trigger.value);
}

function selectInner(target) {
  if (document.selection) {
    document.body.createTextRange().moveToElementText(target).select();
  } else if (window.getSelection) {
    const range = document.createRange();
    range.selectNode(target);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  }
}

function renderTemplate(templateHtml, v, trigger) {
  if (!trigger) return;
  v[trigger.id] = trigger.value || trigger.dataset.value;
  this.innerHTML = eval('`'+templateHtml.replace(/`/g, "\\`")+'`');
}

const $hook_template_variable = /(\$)\({\.(.*?)}\)/g;
function compileTemplate(trigger, formats) {
  const templateSource = trigger.parentNode.parentNode;
  trigger.parentNode.remove();

  if (!templateSource) return;
  const templateRaw = templateSource.innerHTML;
  if (!templateRaw) return;

  const variables = {};
  let templateHtml = '';

  const templateParts = templateRaw.split($hook_template_variable);
  let partType = templateParts[0] === '$' && templateParts.length > 0 ? 0 : 2;
  for (let templatePart of templateParts) {
    switch (partType) {
      case 0:
        partType = 1;
        continue;
      case 1:
        partType = 2;
        variables[templatePart] = !formats ? templatePart : formats.hasOwnProperty(templatePart) ? formats[templatePart].replace('{0}', templatePart) : formats.hasOwnProperty('_') ? formats._.replace('{0}', templatePart) : formats.replace('{0}', templatePart);
        templateHtml += '${v.'+templatePart+'}';
        continue;
      case 2:
        partType = 0;
        templateHtml += templatePart;
    }
  }

  renderTemplate.call(templateSource, templateHtml, variables, templateSource);
  for (const variable of Object.keys(variables)) {
    $hook(templateSource, variable, renderTemplate.bind(templateSource, templateHtml, variables));
  }
}