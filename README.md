# TriggerSeq

A performance-oriented sequencer that is triggered by incoming MIDI notes.

![How it looks](images/device.gif)

- Incoming notes trigger a sequence
- Pitch can be absolute or relative
- Scale awareness optional
- Velocity can be absolute or relative
- Duration is absolute
- Notes are played in a bucket brigade -- as soon as a note duration expires, the next step in the sequence will be triggered
- Mute per step (rest)
- Switch to choke or play through if a MIDI note arrives before the sequence is done playing
- Time can be notes or ms
- Control over swing

## Installation

[Download the newest .amxd file from the latest release](https://github.com/zsteinkamp/m4l-TriggerSeq/releases) or clone this repository, and drag the `Project/TriggerSeq.amxd` device into a track in Ableton Live.

## Changelog

- 2025-03-20 [v1](https://github.com/zsteinkamp/m4l-TriggerSeq/releases/download/v1/TriggerSeq-v1.amxd) - Initial Release.

## TODOs

- ...
