# TriggerSeq

A performance-oriented sequencer that is triggered by incoming MIDI notes.

* Incoming notes trigger a sequence
* Pitch can be absolute or relative
* Scale awareness optional
* Velocity can be absolute or relative
* Duration is absolute
* Notes are played in a bucket brigade -- as soon as a note duration expires, the next step in the sequence will be triggered
* Mute per step (rest)
* Switch to choke or play through if a MIDI note arrives before the sequence is done playing
* Time can be notes or ms
* Control over swing

## TODOs

- ...
