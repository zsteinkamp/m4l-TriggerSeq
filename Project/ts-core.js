"use strict";
inlets = 1;
outlets = 1;
autowatch = 1;
var config = {
    outputLogs: true,
};
var utils_1 = require("./utils");
var log = (0, utils_1.logFactory)(config);
var NUM_STEPS = 16;
var PITCH_MODE_ABSOLUTE = 1;
var PITCH_MODE_RELATIVE = 0;
var VELOCITY_MODE_ABSOLUTE = 1;
var VELOCITY_MODE_RELATIVE = 0;
var state = {
    choke: 0,
    pitchMode: 0,
    velocityMode: 0,
    patternLen: 16,
    swing: 0.5,
    stepLen: 0.5,
    scaleAware: 1,
    rootNote: 0,
    scaleIntervals: [0, 2, 4, 5, 7, 9, 11],
    scaleNotes: [],
    bPatcherProperties: [],
};
function updateScales() {
    state.scaleNotes = [];
    var root_note = state.rootNote - 12;
    var note = root_note;
    // fill scaleMeta.notes with valid note numbers
    while (note <= 127) {
        for (var i = 0; i < state.scaleIntervals.length; i++) {
            var interval = state.scaleIntervals[i];
            note = root_note + interval;
            if (note >= 0 && note <= 127) {
                state.scaleNotes.push(note);
            }
        }
        root_note += 12;
        note = root_note;
    }
    //post('SCALE ' + JSON.stringify(scaleMeta.notes) + '\n')
}
function quantizeNote(noteNum) {
    if (!state.scaleAware) {
        return noteNum;
    }
    var i = 12;
    for (var i = 0; i < 12; i++) {
        var tryNote = noteNum - i;
        if (state.scaleNotes.indexOf(tryNote) > -1) {
            //post('QUANTIZE: ' + noteNum + ' => ' + tryNote + '\n');
            return tryNote;
        }
    }
}
function noteDelta(baseNote, offset) {
    if (!state.scaleAware) {
        return Math.max(0, Math.min(127, baseNote + offset));
    }
    baseNote = quantizeNote(baseNote);
    var baseNoteIdx = state.scaleNotes.indexOf(baseNote);
    if (baseNoteIdx === -1) {
        // should not happen
        log('Error: baseNoteIdx not found for ' + baseNote);
        return baseNote;
    }
    return Math.max(0, Math.min(127, state.scaleNotes[baseNoteIdx + offset]));
}
function scaleIntervals() {
    var intervals = arrayfromargs(arguments);
    for (var i = 0; i < arguments.length; i++) {
        intervals.push(+arguments[i]);
    }
    state.scaleIntervals = intervals;
    //post('INTS ' + state.scaleIntervals.join(',') + '\n')
    updateScales();
}
function rootNote(val) {
    state.rootNote = +val;
    updateScales();
}
function scaleAware(val) {
    state.scaleAware = +val === 1 ? 1 : 0;
    updateScales();
}
function bPatcherProperty(instance, property, value) {
    var getBPatcherPropertyObj = function () {
        return {
            delay: 0,
            pitch: 0,
            velocity: 0,
            duration: 0,
            rest: 0,
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
}
function sendDurations() {
    var totalSteps = 0;
    for (var i = 1; i <= NUM_STEPS; i++) {
        if (!state.bPatcherProperties[i]) {
            continue;
        }
        if (!state.bPatcherProperties[i]['rest']) {
            outlet(0, [i, 'delay', totalSteps * state.stepLen]);
            outlet(0, [
                i,
                'duration',
                state.bPatcherProperties[i]['duration'] * state.stepLen - 5,
            ]);
        }
        totalSteps += state.bPatcherProperties[i]['duration'];
    }
}
function setSwing(swingVal) {
    state.swing = +swingVal;
    sendDurations();
}
function setStepLen(len) {
    state.stepLen = +len;
    sendDurations();
}
function setChoke(val) {
    state.choke = +val === 1 ? 1 : 0;
}
function setPatternLen(val) {
    state.patternLen = +val;
}
function setPitchMode(mode) {
    state.pitchMode = +mode === 1 ? 1 : 0;
}
function setVelocityMode(mode) {
    state.velocityMode = +mode === 1 ? 1 : 0;
}
function noteOn(inPitch, inVelocity) {
    if (+inVelocity === 0) {
        return;
    }
    if (state.choke) {
        for (var i = 1; i <= NUM_STEPS; i++) {
            outlet(0, [i, 'stop']);
        }
    }
    for (var i = 1; i <= state.patternLen; i++) {
        var pitch = inPitch;
        var velocity = inVelocity;
        if (state.pitchMode === PITCH_MODE_ABSOLUTE) {
            pitch = state.bPatcherProperties[i]['pitch'];
        }
        else {
            pitch = noteDelta(pitch, state.bPatcherProperties[i]['pitch']);
        }
        if (state.velocityMode === VELOCITY_MODE_RELATIVE) {
            velocity = Math.max(0, Math.min(127, velocity + state.bPatcherProperties[i]['velocity']));
        }
        else {
            velocity = state.bPatcherProperties[i]['velocity'];
        }
        if (state.scaleAware) {
            pitch = quantizeNote(pitch);
        }
        outlet(0, [i, 'velocity', velocity]);
        outlet(0, [i, 'pitch', pitch]);
    }
}
post('Reloaded ts-core\n');
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
