inlets = 1
outlets = 1
autowatch = 1

const INLET_MSGS = 0
const OUTLET_MSGS = 0

setinletassist(INLET_MSGS, 'int for note number; setNoteArr [array]')
setoutletassist(OUTLET_MSGS, 'quantized note number')

const config = {
  outputLogs: true,
}

import { logFactory } from './utils'
const log = logFactory(config)

const state = {
  noteArr: [] as number[],
}

function msg_int(noteNum: number) {
  var i = 12
  for (var i = 0; i < 12; i++) {
    const tryNote = noteNum - i
    if (state.noteArr.indexOf(tryNote) > -1) {
      //post('QUANTIZE: ' + noteNum + ' => ' + tryNote + '\n');
      outlet(OUTLET_MSGS, tryNote)
      return
    }
  }
}

function setNoteArr() {
  const notes = arrayfromargs(arguments)
  state.noteArr = notes.map(parseInt)
}

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
