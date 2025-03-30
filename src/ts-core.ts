inlets = 1
outlets = 2
autowatch = 1

const OUTLET_MSGS = 0
const OUTLET_DICT = 1

const config = {
  outputLogs: true,
}

import { logFactory } from './utils'
const log = logFactory(config)

const NUM_STEPS = 16

type BPatcherPropertyObj = {
  delay: number
  duration: number
  tie: number
}

type StateType = {
  noteLen: number
  swing: number
  stepLen: number
  scaleAware: 0 | 1
  rootNote: number
  scaleIntervals: number[]
  scaleNotes: number[]
  bPatcherProperties: BPatcherPropertyObj[]
  bPatcherUpdateDebounce: Task
  scaleUpdateDebounce: Task
}
const state: StateType = {
  noteLen: 1,
  swing: 0.5,
  stepLen: 0.5,
  scaleAware: 1,
  rootNote: 0, // default C
  scaleIntervals: [0, 2, 4, 5, 7, 9, 11], // default major
  scaleNotes: [],
  bPatcherProperties: [],
  bPatcherUpdateDebounce: null,
  scaleUpdateDebounce: null,
}

function updateScales() {
  //log('UPDATE_SCALES' + JSON.stringify(state.scaleIntervals))
  state.scaleNotes = []

  let root_note = state.rootNote - 12
  let note = root_note

  if (!state.scaleAware) {
    for (let i = 0; i < 128; i++) {
      state.scaleNotes.push(i)
    }
  } else {
    // fill scaleMeta.notes with valid note numbers
    while (note <= 127) {
      for (let i = 0; i < state.scaleIntervals.length; i++) {
        const interval = state.scaleIntervals[i]
        note = root_note + interval
        if (note >= 0 && note <= 127) {
          state.scaleNotes.push(note)
          //log('PUSH NOTE ' + JSON.stringify({ note, root_note, interval }))
        }
      }
      root_note += 12
      note = root_note
    }
  }

  outlet(OUTLET_DICT, 'clear')
  let lastFound = 0 as number
  for (let i = 0; i < 128; i++) {
    if (state.scaleNotes.indexOf(i) > -1) {
      lastFound = i
    }
    outlet(OUTLET_DICT, ['append', i.toString(), lastFound])
  }
}

function scaleIntervals() {
  const intervals = []
  for (let i = 0; i < arguments.length; i++) {
    intervals.push(+arguments[i])
  }
  if (JSON.stringify(intervals) == JSON.stringify(state.scaleIntervals)) {
    return
  }
  state.scaleIntervals = intervals
  //log('INTS ' + state.scaleIntervals.join(','))
  debounceScaleUpdate()
}
function rootNote(val: number) {
  const newVal = +val
  if (state.rootNote == newVal) {
    return
  }
  state.rootNote = +val
  debounceScaleUpdate()
}
function scaleAware(val: number) {
  const newVal = +val === 1 ? 1 : 0
  if (state.scaleAware == newVal) {
    return
  }
  state.scaleAware = +val === 1 ? 1 : 0

  debounceScaleUpdate()
}

function debounceScaleUpdate() {
  if (state.scaleUpdateDebounce) {
    state.scaleUpdateDebounce.cancel()
  }
  if (!state.scaleUpdateDebounce) {
    state.scaleUpdateDebounce = new Task(updateScales)
  }
  state.scaleUpdateDebounce.schedule(20)
}

function debounceDurationUpdate() {
  if (state.bPatcherUpdateDebounce) {
    state.bPatcherUpdateDebounce.cancel()
  }
  if (!state.bPatcherUpdateDebounce) {
    state.bPatcherUpdateDebounce = new Task(sendDurations)
  }
  state.bPatcherUpdateDebounce.schedule(20)
}

function bPatcherProperty(instance: number, property: string, value: number) {
  if (!state.bPatcherProperties[instance]) {
    state.bPatcherProperties[instance] = {
      delay: 0,
      duration: 0,
      tie: 0,
    }
  }
  if (
    state.bPatcherProperties[instance][property as keyof BPatcherPropertyObj] ==
    value
  ) {
    return
  }
  state.bPatcherProperties[instance][property as keyof BPatcherPropertyObj] =
    value
  //log(
  //  'bpatcherProperty ' +
  //    instance +
  //    typeof instance +
  //    ' ' +
  //    JSON.stringify(state.bPatcherProperties[instance])
  //)
  debounceDurationUpdate()
}

function sendDurations() {
  let totalSteps = 0
  //log('SEND DURATIONS')
  for (let i = 1; i <= NUM_STEPS; i++) {
    const prop = state.bPatcherProperties[i]
    if (!prop) {
      continue
    }
    const swingAdj =
      ((totalSteps % 2 === 0 ? +state.swing : -state.swing) / 2) * state.stepLen
    const slotLen = prop['duration'] * state.stepLen + swingAdj
    outlet(OUTLET_MSGS, [i, 'delay', slotLen])
    outlet(OUTLET_MSGS, [
      i,
      'duration',
      // If tie, then overlap to next slot by 10ms.
      // Otherwise not tie, shorten the note a tiny bit to prevent overlap
      // phasing.
      prop['tie'] ? slotLen + 10 : slotLen * state.noteLen - 5,
    ])
    totalSteps += prop['duration']
  }
}

function setNoteLen(len: number) {
  const newVal = +len / 100.0
  if (state.noteLen == newVal) {
    return
  }
  state.noteLen = +len / 100.0
  debounceDurationUpdate()
}
function setSwing(swingVal: number) {
  const newVal = +swingVal
  if (state.swing == newVal) {
    return
  }
  state.swing = +swingVal
  debounceDurationUpdate()
}

function setStepLen(len: number) {
  const newVal = +len
  if (state.stepLen == newVal) {
    return
  }
  state.stepLen = +len
  debounceDurationUpdate()
}

post('Reloaded ts-core\n')

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
