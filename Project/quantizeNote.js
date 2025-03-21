"use strict";
inlets = 1;
outlets = 1;
autowatch = 1;
var INLET_MSGS = 0;
var OUTLET_MSGS = 0;
setinletassist(INLET_MSGS, 'int for note number; setNoteArr [array]');
setoutletassist(OUTLET_MSGS, 'quantized note number');
var config = {
    outputLogs: true,
};
var utils_1 = require("./utils");
var log = (0, utils_1.logFactory)(config);
var state = {
    noteArr: [],
};
function msg_int(noteNum) {
    var i = 12;
    for (var i = 0; i < 12; i++) {
        var tryNote = noteNum - i;
        if (state.noteArr.indexOf(tryNote) > -1) {
            //post('QUANTIZE: ' + noteNum + ' => ' + tryNote + '\n');
            outlet(OUTLET_MSGS, tryNote);
            return;
        }
    }
}
function setNoteArr() {
    var notes = arrayfromargs(arguments);
    state.noteArr = notes.map(parseInt);
}
// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
var module = {};
module.exports = {};
