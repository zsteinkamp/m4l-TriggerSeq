"use strict";
inlets = 1;
outlets = 2;
autowatch = 1;
var OUTLET_MSGS = 0;
var OUTLET_DICT = 1;
var config = {
    outputLogs: true,
};
var utils_1 = require("./utils");
var log = (0, utils_1.logFactory)(config);
var NUM_STEPS = 16;
var state = {
    choke: 0,
    noteLen: 1,
    patternLen: 16,
    swing: 0.5,
    stepLen: 0.5,
    scaleAware: 1,
    rootNote: 0,
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
    scaleNotes: [],
    bPatcherProperties: [],
    bPatcherUpdateDebounce: null,
    scaleUpdateDebounce: null,
};
function updateScales() {
    //log('UPDATE_SCALES' + JSON.stringify(state.scaleIntervals))
    state.scaleNotes = [];
    var root_note = state.rootNote - 12;
    var note = root_note;
    if (!state.scaleAware) {
        for (var i = 0; i < 128; i++) {
            state.scaleNotes.push(i);
        }
    }
    else {
        // fill scaleMeta.notes with valid note numbers
        while (note <= 127) {
            for (var i = 0; i < state.scaleIntervals.length; i++) {
                var interval = state.scaleIntervals[i];
                note = root_note + interval;
                if (note >= 0 && note <= 127) {
                    state.scaleNotes.push(note);
                    //log('PUSH NOTE ' + JSON.stringify({ note, root_note, interval }))
                }
            }
            root_note += 12;
            note = root_note;
        }
    }
    outlet(OUTLET_DICT, 'clear');
    var lastFound = 0;
    for (var i = 0; i < 128; i++) {
        if (state.scaleNotes.indexOf(i) > -1) {
            lastFound = i;
        }
        outlet(OUTLET_DICT, ['append', i.toString(), lastFound]);
    }
}
function scaleIntervals() {
    var intervals = [];
    for (var i = 0; i < arguments.length; i++) {
        intervals.push(+arguments[i]);
    }
    state.scaleIntervals = intervals;
    //log('INTS ' + state.scaleIntervals.join(','))
    debounceScaleUpdate();
}
function rootNote(val) {
    state.rootNote = +val;
    debounceScaleUpdate();
}
function scaleAware(val) {
    state.scaleAware = +val === 1 ? 1 : 0;
    debounceScaleUpdate();
}
function debounceScaleUpdate() {
    if (state.scaleUpdateDebounce) {
        state.scaleUpdateDebounce.cancel();
    }
    state.scaleUpdateDebounce = new Task(updateScales);
    state.scaleUpdateDebounce.schedule(50);
}
function debounceDurationUpdate() {
    if (state.bPatcherUpdateDebounce) {
        state.bPatcherUpdateDebounce.cancel();
    }
    state.bPatcherUpdateDebounce = new Task(sendDurations);
    state.bPatcherUpdateDebounce.schedule(50);
}
function bPatcherProperty(instance, property, value) {
    var getBPatcherPropertyObj = function () {
        return {
            delay: 0,
            pitch: 0,
            velocity: 0,
            duration: 0,
        };
    };
    if (!state.bPatcherProperties[instance]) {
        state.bPatcherProperties[instance] = getBPatcherPropertyObj();
    }
    state.bPatcherProperties[instance][property] =
        value;
    //log(
    //  'bpatcherProperty ' +
    //    instance +
    //    typeof instance +
    //    ' ' +
    //    JSON.stringify(state.bPatcherProperties[instance])
    //)
    debounceDurationUpdate();
}
function sendDurations() {
    var totalSteps = 0;
    for (var i = 1; i <= NUM_STEPS; i++) {
        var prop = state.bPatcherProperties[i];
        if (!prop) {
            continue;
        }
        var swingAdj = ((totalSteps % 2 === 0 ? +state.swing : -state.swing) / 2) * state.stepLen;
        var slotLen = prop['duration'] * state.stepLen + swingAdj;
        outlet(OUTLET_MSGS, [i, 'delay', slotLen]);
        outlet(OUTLET_MSGS, [
            i,
            'duration',
            // shorten the note a tiny bit to prevent overlaps
            slotLen * state.noteLen - 5,
        ]);
        totalSteps += prop['duration'];
    }
}
function setNoteLen(len) {
    state.noteLen = +len / 100.0;
    debounceDurationUpdate();
}
function setSwing(swingVal) {
    state.swing = +swingVal;
    debounceDurationUpdate();
}
function setStepLen(len) {
    state.stepLen = +len;
    debounceDurationUpdate();
}
function setChoke(val) {
    state.choke = +val === 1 ? 1 : 0;
}
function setPatternLen(val) {
    state.patternLen = +val;
}
post('Reloaded ts-core\n');
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
