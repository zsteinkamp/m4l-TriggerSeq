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
  pitch: number
  velocity: number
  duration: number
  rest: number
}

type StateType = {
  choke: 0 | 1
  noteLen: number
  patternLen: number
  swing: number
  stepLen: number
  scaleAware: 0 | 1
  rootNote: number
  scaleIntervals: number[]
  scaleNotes: number[]
  bPatcherProperties: BPatcherPropertyObj[]
  bPatcherUpdateDebounce: Task
}
const state: StateType = {
  choke: 0,
  noteLen: 1,
  patternLen: 16,
  swing: 0.5,
  stepLen: 0.5,
  scaleAware: 1,
  rootNote: 0, // default C
  scaleIntervals: [0, 2, 4, 5, 7, 9, 11], // default major
  scaleNotes: [],
  bPatcherProperties: [],
  bPatcherUpdateDebounce: null,
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
  state.scaleIntervals = intervals
  //log('INTS ' + state.scaleIntervals.join(','))
  updateScales()
}
function rootNote(val: number) {
  state.rootNote = +val
  updateScales()
}
function scaleAware(val: number) {
  state.scaleAware = +val === 1 ? 1 : 0

  updateScales()
}

function debounceUpdate() {
  if (state.bPatcherUpdateDebounce) {
    state.bPatcherUpdateDebounce.cancel()
  }
  state.bPatcherUpdateDebounce = new Task(sendDurations)
  state.bPatcherUpdateDebounce.schedule(50)
}

function bPatcherProperty(instance: number, property: string, value: number) {
  const getBPatcherPropertyObj = (): BPatcherPropertyObj => {
    return {
      delay: 0,
      pitch: 0,
      velocity: 0,
      duration: 0,
      rest: 0,
    }
  }

  if (!state.bPatcherProperties[instance]) {
    state.bPatcherProperties[instance] = getBPatcherPropertyObj()
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
  debounceUpdate()
}

function sendDurations() {
  let totalSteps = 0
  for (let i = 1; i <= NUM_STEPS; i++) {
    const prop = state.bPatcherProperties[i]
    const swingAdj =
      ((totalSteps % 2 === 0 ? +state.swing : -state.swing) / 2) * state.stepLen
    const slotLen = prop['duration'] * state.stepLen + swingAdj
    if (!prop) {
      continue
    }
    outlet(OUTLET_MSGS, [i, 'delay', slotLen])
    outlet(OUTLET_MSGS, [
      i,
      'duration',
      // shorten the note a tiny bit to prevent overlaps
      slotLen * state.noteLen - 5,
    ])
    totalSteps += prop['duration']
  }
}

function setNoteLen(len: number) {
  state.noteLen = +len / 100.0
  sendDurations()
}
function setSwing(swingVal: number) {
  state.swing = +swingVal
  sendDurations()
}

function setStepLen(len: number) {
  state.stepLen = +len
  sendDurations()
}
function setChoke(val: number) {
  state.choke = +val === 1 ? 1 : 0
}
function setPatternLen(val: number) {
  state.patternLen = +val
}

post('Reloaded ts-core\n')

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
