inlets = 1
outlets = 1
autowatch = 1

const config = {
  outputLogs: true,
}

import { logFactory } from './utils'
const log = logFactory(config)

const NUM_STEPS = 16
const PITCH_MODE_ABSOLUTE = 1
const PITCH_MODE_RELATIVE = 0
const VELOCITY_MODE_ABSOLUTE = 1
const VELOCITY_MODE_RELATIVE = 0

type BPatcherPropertyObj = {
  delay: number
  pitch: number
  velocity: number
  duration: number
  rest: number
}

type StateType = {
  choke: 0 | 1
  pitchMode: number
  velocityMode: number
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
  pitchMode: 0,
  velocityMode: 0,
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
  state.scaleNotes = []

  let root_note = state.rootNote - 12
  let note = root_note

  // fill scaleMeta.notes with valid note numbers
  while (note <= 127) {
    for (let i = 0; i < state.scaleIntervals.length; i++) {
      const interval = state.scaleIntervals[i]
      note = root_note + interval
      if (note >= 0 && note <= 127) {
        state.scaleNotes.push(note)
      }
    }
    root_note += 12
    note = root_note
  }
  //post('SCALE ' + JSON.stringify(scaleMeta.notes) + '\n')
}

function quantizeNote(noteNum: number) {
  if (!state.scaleAware) {
    return noteNum
  }
  var i = 12
  for (var i = 0; i < 12; i++) {
    const tryNote = noteNum - i
    if (state.scaleNotes.indexOf(tryNote) > -1) {
      //post('QUANTIZE: ' + noteNum + ' => ' + tryNote + '\n');
      return tryNote
    }
  }
}

function noteDelta(baseNote: number, offset: number) {
  if (!state.scaleAware) {
    return Math.max(0, Math.min(127, baseNote + offset))
  }
  baseNote = quantizeNote(baseNote)
  const baseNoteIdx = state.scaleNotes.indexOf(baseNote)
  if (baseNoteIdx === -1) {
    // should not happen
    log('Error: baseNoteIdx not found for ' + baseNote)
    return baseNote
  }
  return Math.max(0, Math.min(127, state.scaleNotes[baseNoteIdx + offset]))
}

function scaleIntervals() {
  const intervals = arrayfromargs(arguments)
  for (let i = 0; i < arguments.length; i++) {
    intervals.push(+arguments[i])
  }
  state.scaleIntervals = intervals
  //post('INTS ' + state.scaleIntervals.join(',') + '\n')
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
    if (!state.bPatcherProperties[i]) {
      continue
    }
    if (!state.bPatcherProperties[i]['rest']) {
      outlet(0, [i, 'delay', state.stepLen])
      outlet(0, [
        i,
        'duration',
        // shorten the note a tiny bit to prevent overlaps
        state.bPatcherProperties[i]['duration'] * state.stepLen - 5,
      ])
    }
    totalSteps += state.bPatcherProperties[i]['duration']
  }
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
function setPitchMode(mode: number) {
  state.pitchMode = +mode === 1 ? 1 : 0
}
function setVelocityMode(mode: number) {
  state.velocityMode = +mode === 1 ? 1 : 0
}

function noteOn(inPitch: number, inVelocity: number) {
  if (+inVelocity === 0) {
    return
  }
  if (state.choke) {
    for (let i = 1; i <= NUM_STEPS; i++) {
      outlet(0, [i, 'stop'])
    }
  }
  for (let i = 1; i <= state.patternLen; i++) {
    let pitch = inPitch
    let velocity = inVelocity
    if (state.pitchMode === PITCH_MODE_ABSOLUTE) {
      pitch = state.bPatcherProperties[i]['pitch']
    } else {
      pitch = noteDelta(pitch, state.bPatcherProperties[i]['pitch'])
    }
    if (state.velocityMode === VELOCITY_MODE_RELATIVE) {
      velocity = Math.max(
        0,
        Math.min(127, velocity + state.bPatcherProperties[i]['velocity'])
      )
    } else {
      velocity = state.bPatcherProperties[i]['velocity']
    }
    if (state.scaleAware) {
      pitch = quantizeNote(pitch)
    }
    outlet(0, [i, 'velocity', velocity])
    outlet(0, [i, 'pitch', pitch])
  }
  // play the first step
  outlet(0, [1, 'play'])
}

post('Reloaded ts-core\n')

// NOTE: This section must appear in any .ts file that is directuly used by a
// [js] or [jsui] object so that tsc generates valid JS for Max.
const module = {}
export = {}
