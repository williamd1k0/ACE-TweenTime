var tpl_timeline = require('./templates/timeline.tpl.html');
import Timeline from './graph/Timeline';
import PropertiesEditor from './editor/PropertiesEditor';
import EditorMenu from './editor/EditorMenu';
import EditorControls from './editor/EditorControls';
import SelectionManager from './editor/SelectionManager';
import Exporter from './editor/Exporter';
import UndoManager from './editor/UndoManager';
let Signals = require('js-signals');

class Editor {
  constructor(tweenTime, options = {}) {
    this.tweenTime = tweenTime;
    this.options = options;
    this.timer = this.tweenTime.timer;
    this.lastTime = -1;
    this.curveEditEnabled = false;

    this.onKeyAdded = this.onKeyAdded.bind(this);
    this.onKeyRemoved = this.onKeyRemoved.bind(this);

    this.forceItemsRender = this.forceItemsRender.bind(this);

    this.splitClip = this.splitClip.bind(this);
    this.deleteClip = this.deleteClip.bind(this);

    var el = options.el || $('body');
    this.el = el;
    this.$timeline = $(tpl_timeline());
    el.append(this.$timeline);
    el.addClass('has-editor');

    this.selectionManager = new SelectionManager(this.tweenTime);
    this.exporter = new Exporter(this);
    this.timeline = new Timeline(this, options);

    this.propertiesEditor = new PropertiesEditor(this, this.selectionManager);
    this.propertiesEditor.keyAdded.add(this.onKeyAdded);
    this.propertiesEditor.keyRemoved.add(this.onKeyRemoved);

    this.menu = new EditorMenu(this.tweenTime, this.$timeline, this);
    if (this.options.onMenuCreated !== undefined) {
      this.options.onMenuCreated(this.$timeline.find('.timeline__menu'), this);
    }

    this.controls = new EditorControls(this.tweenTime, this.$timeline);
    this.undoManager = new UndoManager(this);

    // Public events.
    this.onSelect = new Signals.Signal();
    this.onClearTimeline = new Signals.Signal();
    this.onCloseGaps = new Signals.Signal();
    this.onSplitClip = new Signals.Signal();
    this.onDeleteClip = new Signals.Signal();
    this.onClipUpdate = new Signals.Signal();

    var self = this;
    this.selectionManager.onSelect.add(function(selection, addToSelection) {
      // Propagate the event.
      self.onSelect.dispatch(selection, addToSelection);
    });

    // Will help resize the canvas to correct size (minus sidebar and timeline)
    window.editorEnabled = true;
    window.dispatchEvent(new Event('resize'));
    window.requestAnimationFrame(() => this.update());

    this.enableCutKeypress = true;
    this.enableDeleteKeypress = true;

    $(document).keypress((e) => {
      if (this.enableCutKeypress)
      {
        if (e.charCode === 99 || e.charCode === 67) {
          // split clip when pressing c or C
          this.splitClip();
        }
      }
    });

    $(document).keyup((e) => {
      if (this.enableDeleteKeypress)
      {
        var keyCode = e.keyCode || e.which; 
        if(keyCode == 46) {
          // delete clip when pressing del
          this.deleteClip();
        }
      }
    });
  }

  splitClip() {
    let selection = this.selectionManager.getSelection();
    let time = this.timer.getCurrentTime();

    let splitData = {
      "selection": selection,
      "time": time
    };

    this.onSplitClip.dispatch(splitData);
  }

  deleteClip() {
    let selection = this.selectionManager.getSelection();

    this.onDeleteClip.dispatch(selection);
  }

  forceItemsRender() {
    this.timeline._isDirty = true;
  }

  select(item, addToSelection = false) {
    this.selectionManager.select(item, addToSelection);
  }

  getSelection() {
    return this.selectionManager.getSelection();
  }

  addSelectionListener(callback) {
    this.onSelect.add(callback);
  }

  removeSelectionListener(callback) {
    this.onSelect.remove(callback);
  }

  addClearTimelineListener(callback) {
    this.onClearTimeline.add(callback);
  }

  removeClearTimelineListener(callback) {
    this.onClearTimeline.remove(callback);
  }

  addCloseGapsListener(callback) {
    this.onCloseGaps.add(callback);
  }

  removeCloseGapsListener(callback) {
    this.onCloseGaps.remove(callback);
  }  

  onKeyAdded() {
    this.undoManager.addState();
    this.render(false, false, true);
  }

  onKeyRemoved(item) {
    this.selectionManager.removeItem(item._id);
    this.undoManager.addState();
    if (this.selectionManager.selection.length) {
      this.selectionManager.triggerSelect();
    }
    this.render(false, false, true);
  }

  render(time = false, time_changed = false, force = false) {
    let time2 = time;
    if (time2 === false) {
      time2 = this.timer.time[0];
    }
    if (force) {
      this.timeline._isDirty = true;
    }
    this.timeline.render(time2, time_changed);
    this.controls.render(time2, time_changed);
    this.propertiesEditor.render(time2, time_changed);
  }

  update() {
    var time = this.timer.time[0];
    var time_changed = this.lastTime === time ? false : true;

    this.render(time, time_changed);
    this.lastTime = this.timer.time[0];
    window.requestAnimationFrame(() => this.update());
  }
}

module.exports = Editor;
